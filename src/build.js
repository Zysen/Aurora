console.log('Building Aurora '+__dirname);
console.log('Using NodeJS ' + process.version);

var wd = process.cwd();
process.chdir(__dirname);
process.on('exit', function (){
  process.chdir(wd);
});

var jsmin = require('jsmin2');
var jslint = require('node-jslint').JSLINT;
var path = require("path");
var fs = require("fs");
if (!fs.existsSync('../build')) {
   fs.mkdirSync('../build');
}

var ClosureCompiler = require("closurecompiler");

var isModuleAvailableSync = function(moduleName)
{
    var ret = false; // return value, boolean
    var dirSeparator = require("path").sep;
    module.paths.forEach(function(nodeModulesPath)
                         {
                             if(fs.existsSync(nodeModulesPath + dirSeparator + moduleName) === true)
                             {
                                 ret = true;
                                 return false; // break forEach
                             }
                         });
    return ret;
};

if(fs.existsSync===undefined){
    fs.existsSync = path.existsSync;
}

fs.writeFileSync(__dirname+"/shared/aurora_version.js", "AURORA.VERSION = '" + (new Date().getTime()) + "';\n");

var target = (process.argv.length > 3) ? process.argv[3] : "debug";
var units = (process.argv.length > 4) ? process.argv[4] : "all";
console.log("Target: " + target + " Modules: " + units );
var config = JSON.parse(fs.readFileSync((process.argv.length > 2 && fs.existsSync(process.argv[2])) ? process.argv[2] : __dirname + "/../config.json"));

var theme = config.theme;
var exec = require('exec');


var rmAll = function (path) {
    var files = fs.readdirSync(path, 'utf8');
//    console.log("files", files);
    files.forEach(function (file) {
        file = path + '/' + file;
        var stat = fs.lstatSync(file);
        if (stat.isSymbolicLink() || stat.isFile()) {
            fs.unlink(file);
        }
        else if (stat.isDirectory()) {
            rmAll(file);
            fs.rmdirSync(file);
        }
    });
};

if (fs.existsSync("build_output")) {
    rmAll("build_output");
}

config.generateDocumentation = config.generateDocumentation || true;
var ignorePlugins = ["skeleton"];
if(config.ignorePlugins!==undefined){
    ignorePlugins = ignorePlugins.concat(config.ignorePlugins);
}
var ARRAYS = (function(arrays) {
    arrays.arrayCut = function(array, index) {
	array.splice(index, 1);
    };
    arrays.max = function(array) {
	return Math.max.apply(Math, array);
    };
    arrays.min = function(array) {
	return Math.min.apply(Math, array);
    };
    arrays.arrayContains = function(array, search, strictType) {
	return arrays.arrayIndexOf(array, search, strictType) > -1;
    };
    arrays.contains = arrays.arrayContains;
    arrays.arrayIndexOf = function(arr, needle, strictType) {
	for (var i = 0; i < arr.length; i++) {
	    if (strictType === false) {
		if (arr[i] == needle) {
		    return i;
		}
	    } else {
		if (arr[i] === needle) {
		    return i;
		}
	    }

	}
	return -1;
    };
    arrays.remove = function(arr, val, useStrict) {
	var pos = arrays.arrayIndexOf(arr, val, useStrict == undefined ? true : useStrict);
	if (pos >= 0) {
	    arr.splice(pos, 1);
	}
    };
    return arrays;
})(ARRAYS || {});

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.replaceAll = function (find, replace) {
    var str = this;
    return str.replace(new RegExp(find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replace);
};

String.prototype.makeDomIdSafe = function() {
    return this.replace(/^[^a-z0-9]+|[^\w:.-]+/gi, "").replaceAll("=", "").replaceAll(".", "_").toLowerCase();//.toLowerCase().replaceAll("=", "");
};

/**
 * write out the goog.requires at the top of the file, this ensures they are ordered
 * and unique
 */
var writeRequires = function (file, requires) {
    var reqs = [];

    for (var k in requires) {
        reqs.push(k);
    }
    reqs.sort();
    reqs.forEach(function (r) {
        fs.appendFileSync(file, r + "\n");
    });
}; 
/**
 * this concatinates the array files to filename
 * 
 * but removes any requires lines from the begining, they will go at the
 * top of the file, once any duplicates are removed
 */
var appendFiles = function (fileName, requires, files) {
    var prefixes = ['goog.require('];

    files.forEach(function (fname) {
        var debug =  false && fname === 'plugins_old/wtm_syslog/wtm_syslog.client.js';
        //            var rl = readline.createInterface({
        //                input: fs.createReadStream(fname)
        //          });

        var data = fs.readFileSync(fname, 'utf8');
        // strip of blank or goog.require( at the begining
        
        var start = 0;
        var len = 0;
        var checkingRequires = true;
        while (checkingRequires) {
            var possible = true;
            var found = false;
            
            while (possible && start + len < data.length && !found) {
                len++;
                var part = data.substr(start, len).trim();
                possible = false;
                found = false;
                if (debug) {
                    console.log("part", part, start);
                }
                prefixes.forEach(function (prefix) {
                    possible = possible || prefix.indexOf(part) === 0;
                    found = found || prefix === part; 
                });
            } 
            
            if (found) {
                var pos = start + len;
                
                while ( pos < data.length && data.charAt(pos) !== '\n') {
                    pos++;
                }
                
                requires[data.substring(start, pos).trim()] = true;

                start = pos + 1;
                len = 0;
            }
            else { 
                checkingRequires = false;
            }
        }

        if (fileName) {
            fs.appendFileSync(fileName, "// source file: " + fname + '\n');
            fs.appendFileSync(fileName, data.substring(start));
            fs.appendFileSync(fileName, "\n");
        }
    });

};

var concatenate = function() {
    var concatenated = "";
    for ( var index in arguments) {
	if(!arguments.hasOwnProperty(index)){
	    continue;
	}
	var fileArray = arguments[index];
	for ( var index2 in fileArray) {
	    if(!fileArray.hasOwnProperty(index2)){
		continue;
	    }
	    concatenated += fs.readFileSync(fileArray[index2]) + "\n\n";
	}
    }
    return concatenated;
};

var lintCheck = function(filenames, options) {
    if (!fs.existsSync("build_output")) {
	fs.mkdirSync("build_output");
    }
    var validLintCheck = true;
    filenames.forEach(function (filename) {
        var name = filename.replace(".js", "").replace("../", "").replaceAll("/","_");
        if (!fs.existsSync("build_output/" + name)) {
	    fs.mkdirSync("build_output/" + name);
        }
        var code = fs.readFileSync(filename,'utf8');
        var valid = jslint(code, options);
	var results = jslint.data();
        if (!valid && false) {
	    fs.writeFileSync("build_output/" + name + "/jsmin_error.html", jslint.error_report(results));
            fs.writeFileSync("build_output/" + name + "/jsmin_out.html", jslint.report(results));
            validLintCheck = false;
        }

    });
    return validLintCheck;
};

var getAllJsFiles = function (dir, exclude, files) {
    getAllJsFilesRec(dir, dir, exclude, files);
};

var getAllJsFilesRec = function (topLevel, dir, exclude, files) {
    var dirRes = fs.readdirSync(dir);
    dirRes.forEach (function (f) {
        f = dir + '/' + f;
        if (exclude.indexOf(f.substring(topLevel.length + 1)) !== -1) {
            return;
        }
        var stat = fs.lstatSync(f);
        if (stat.isDirectory()) {
            getAllJsFilesRec(topLevel, f, exclude, files);
        }
        else if ((f.endsWith('.js') || f.endsWith('sauce_browsers.json')) && !f.endsWith('_test.js')) {
            files.push(f);
        }
    });
};

var compile = function(debug, type, output, extraFiles) {
    var files = extraFiles.concat([]);;
    var excludes = type === 'server' ? ['browser_capabilities.js','doc', 'scripts', 'protractor_spec.js', 'protractor.conf.js'] : [];
    
    var libraries = type==='server'?(config.serverLibraries||[]):(config.clientLibraries||[]);
    for(var index in libraries){
        var lib = libraries[index];
        getAllJsFiles(lib.path, lib.excludes||[], files);
    }

    files.push('../' + type + '.js');
    var options = {
	jscomp_off                : "internetExplorerChecks",
        only_closure_dependencies : true,
        closure_entry_point       : 'aurora.' + type,
	language_in		  : "ECMASCRIPT5",
	js_output_file		  : '../' + type + '.min.js'
        //	    source_map_format	: 			"V3",
	//externs: ["externs/file3.js", "externs/contrib/"], // If you specify a directory here, all files inside are used 
    };

    if ((debug || type == 'server')) {
        options.formatting = "PRETTY_PRINT";//,// Capitalization does not matter      
        options.compilation_level = 'WHITESPACE_ONLY';
    }
    else {
        // SIMPLE_OPTIMIZATIONS | ADVANCED_OPTIMIZATIONS | WHITESPACE_ONLY
        options.compilation_level = 'SIMPLE_OPTIMIZATIONS';
    }
    if (type == 'server') {
	options.language_in		  = "ECMASCRIPT6";
    }
    else if (!debug) {
	options.output_wrapper =  '//# sourceMappingURL=/' + type + '.js.map\n%output%';
        options.create_source_map = '../' + type + '.js.map';
    }
    ClosureCompiler.compile(
        files,options,
	function(error, result) {
	    if (result) {
	        // console.log(result);
	        console.log("Javascript Compilation Success (" + type + ")");
                if (type === 'server') {
                    result = result.replace('var goog = goog || {};','global.goog = global.goog || {};');
                    result = result.replace('goog.global = this;','goog.global = global;');
                    
                }
	        fs.writeFileSync(output, result);

	        // Display error (warnings from stderr) 
	    } else {
	        console.log("ClosureCompiler", error);
                process.exit(1);
	        // Display error... 
	    }
	}
    );
};

var generateJSDocs = function(file, cb) {
    var name = file.replace(".js", "").replace("../", "");

    console.log("\nGenerating docs for " + name);

    if (!fs.existsSync("build_output")) {
	fs.mkdirSync("build_output");
    }
    if (!fs.existsSync("build_output/" + name)) {
	fs.mkdirSync("build_output/" + name);
    }
    if (!fs.existsSync("build_output/" + name + "/docs")) {
	fs.mkdirSync("build_output/" + name + "/docs");
    }

    exec([ 'node', '../node_modules/jsdoc2/app/run.js', '-a', "-d=build_output/" + name + "/docs", file ], function(err, out, code) {
	if (err){
	    exec([ 'nodejs', '../node_modules/jsdoc2/app/run.js', '-a', "-d=build_output/" + name + "/docs", file ], function(err, out, code) {
		if (err){
		    throw err;
		}
		cb();
	    });
	}
	else{
	    cb();
	}
    });
};

var writeFile = function(code, filename) {
    fs.writeFileSync(filename, code);
};

var complete = false;
function wait() {
    process.stdout.write(".");
    setTimeout(function() {
	if (!complete) {
	    wait();
	}
    }, 1000);
}





if(target=="libs"){
    var libs = concatenate(["server/goog.js","shared/number.js", "shared/date.js", "shared/math.js", "shared/function.js", "shared/object.js", "shared/array.js", "shared/string.js", "shared/flapjax.closure.js", "shared/signals.js", "shared/crypto.js","shared/aurora.flapjax.js"]);
    fs.writeFileSync("aurora.libs.js", libs);
    process.exit();
}
/*
 var clientBuildFiles = ["server/goog.js", "shared/number.js", "shared/enums.js", "shared/aurora_version.js", "shared/log.js", "shared/date.js", "shared/math.js", "shared/function.js", "shared/object.js", "shared/array.js", "shared/string.js", "shared/flapjax.closure.js", "shared/signals.js", "shared/crypto.js", "shared/aurora.flapjax.js", "client/dom.js", "client/aurora.js", "plugins/tables/tables.shared.js", "plugins/tables/tables.client.js", "plugins/tables/tables.validators.js", "client/authentication.client.js", "client/widget.renderers.js"];
 var clientCSSFiles = ["../themes/" + theme + "/style.css", "plugins/tables/tables.css"]; 
 var serverBuildFiles = ["server/file.js", "server/goog.js", "shared/enums.js", "shared/number.js", "shared/log.js", "shared/signals.js", "shared/math.js", "shared/object.js", "shared/array.js", "shared/string.js", "shared/date.js", "shared/crypto.js", "shared/aurora_version.js", "server/aurora.settings.server.js", "shared/flapjax.closure.js", "shared/aurora.flapjax.js", "plugins/tables/tables.shared.js", "server/http.library.js", "server/server.js", "server/authentication.server.js"];
 */
//var 
fs.writeFileSync(__dirname+"/shared/aurora_version.js", "AURORA.VERSION = '" + (new Date().getTime()) + "';\n");

var oldGlobal = {
    pluginAllocatorCount : 1,
    pluginAllocation : {"aurora":0},
    pluginAllocationReverse : {"0": "aurora"},
    sharedBuildFiles : [],
    clientBuildFiles : [
        "shared/aurora.shared.js", "shared/number.js", "shared/enums.js",
        "shared/aurora_version.js", "shared/log.js", "shared/date.js",
        "shared/math.js", "shared/function.js", "shared/object.js",
        "shared/array.js", "shared/string.js", "shared/flapjax.closure.js", 
        "shared/signals.js", "shared/crypto.js", "shared/aurora.flapjax.js",
        "client/dom.js", "client/binary.client.js", "client/aurora.js",
        "client/widget.renderers.js", "client/authentication.client.js"],
    clientCSSFiles : [],
    serverBuildFiles : [
        "shared/aurora.shared.js","server/file.js", "shared/enums.js",
        "shared/number.js", "shared/log.js", "shared/signals.js",
        "shared/math.js", "shared/object.js", "shared/array.js",
        "shared/string.js", "shared/date.js", "shared/crypto.js",
        "shared/aurora_version.js", "server/aurora.settings.server.js", "shared/flapjax.closure.js",
        "shared/aurora.flapjax.js", "server/http.library.js", "server/binary.server.js",
        "server/server.js", "server/authentication.server.js" ],
    licenses : [],
    plugins : [],
    clientLibraries : [],
    serverLibraries : [],
    widgetCode : []
};

// Include plugins
var scanPlugins = function (dir ,params, whitelist) {
    var files = fs.readdirSync(dir);
    files = files.sort(function(a, b) {return a < b ? -1 : 1;});
    var filesStr = "";
    for ( var index in files) {
	if(!files.hasOwnProperty(index)){
	    continue;
	}
	var plugin = files[index];
    if(whitelist!==undefined && ARRAYS.contains(whitelist, plugin)===false){
        continue;
    }
	if(plugin.endsWith("disabled")){
	    continue;
	}
	if (ARRAYS.contains(ignorePlugins, plugin)) {
	    continue;
	}
	params.plugins.push(plugin);
	var cleanPluginName = plugin.makeDomIdSafe();
        if  (params.pluginAllocation[cleanPluginName]) {
            console.log("DUPLICATE plugin found", cleanPluginName);
        }
        else {
	    params.pluginAllocationReverse[params.pluginAllocatorCount+""] = cleanPluginName;
	    params.pluginAllocation[cleanPluginName] = params.pluginAllocatorCount++;
	}
	var pluginDir = fs.readdirSync(dir + "/" + plugin + "/");
	filesStr+=cleanPluginName+", ";
	for ( var fileIndex in pluginDir) {
	    if(!pluginDir.hasOwnProperty(fileIndex)){
		continue;
	    }
	    var fullPath = dir + "/" + plugin + "/" + pluginDir[fileIndex];
	    if (fullPath.endsWith("build.js")) {
		require(__dirname + "/" + fullPath);
	    }
	}
	pluginDir = fs.readdirSync(dir + "/" + plugin + "/");		//New files might have been created by the build script.
	pluginDir = pluginDir.sort(function(a, b) {return a < b ? -1 : 1;});
	for ( fileIndex in pluginDir) {
	    fullPath = dir + "/" + plugin + "/" + pluginDir[fileIndex];
	    if (fullPath.endsWith(".server.js")) {
		params.serverBuildFiles.push(fullPath);
	    } else if (fullPath.endsWith(".client.widgets.js")) {
		params.widgetCode.push(fullPath);
	    } else if (fullPath.endsWith(".client.js")) {
		params.clientBuildFiles.push(fullPath);
	    } else if (fullPath.endsWith(".shared.js")) {
		params.sharedBuildFiles.push(fullPath);
	    } else if (fullPath.endsWith(".css")) {
		params.clientCSSFiles.push(fullPath);
	    } else if (fullPath.endsWith(".server.lib.js") || fullPath.endsWith(".server.min.js")) {
		params.serverLibraries.push(fullPath);
	    } else if (fullPath.endsWith(".client.lib.js") || fullPath.endsWith(".client.min.js")) {
		params.clientLibraries.push(fullPath);
	    } else if (fullPath.endsWith(".shared.lib.js") || fullPath.endsWith(".shared.min.js")) {
		params.serverLibraries.push(fullPath);
		params.clientLibraries.push(fullPath);
	    }
	    else if (fullPath.toUpperCase().endsWith("LICENSE") || fullPath.toUpperCase().endsWith("LICENSE.TXT") || fullPath.toUpperCase().endsWith("LICENSE.MD")) {
		params.licenses.push(fullPath);
	    }
	}
    }

};

var scanModules = function (dir, params) {
    var files = fs.readdirSync(dir);
    
    for(var index in files){
	if(!files.hasOwnProperty(index)){
	    continue;
	}
	var path = dir + "/"+files[index];
	if(fs.existsSync(path+"/LICENSE")){
	    params.licenses.push(path+"/LICENSE");	
	}
	if(fs.existsSync(path+"/LICENSE.md")){
	    params.licenses.push(path+"/LICENSE.md");	
	}
	if(fs.existsSync(path+"/LICENSE.txt")){
	    params.licenses.push(path+"/LICENSE.txt");	
	}
	if(fs.existsSync(path+"/LICENSE.MIT")){
	    params.push(path+"/LICENSE.MIT");	
	}
	if(fs.existsSync(path+"/LICENSE-MIT")){
	    params.licenses.push(path+"/LICENSE-MIT");	
	}
	if(fs.existsSync(path+"/LICENSE-APACHE")){
	    params.licenses.push(path+"/LICENSE-APACHE");	
	}
	if(fs.existsSync(path+"/LICENSE.APACHE")){
	    params.licenses.push(path+"/LICENSE.APACHE");	
	}
    }
};

var scanThemes = function (dir, params) {
    
    var themeDir = fs.readdirSync(dir + "/" + theme + "/");
        
    // Scan the theme directory for javascript
    for ( var index in themeDir) {
	if(!themeDir.hasOwnProperty(index)){
	    continue;
	}
	if (themeDir[index].endsWith(".client.js")) {
	    params.clientBuildFiles.push(dir + "/" + theme + "/" + themeDir[index]);
	} else if (themeDir[index].endsWith(".server.js")) {
	    params.serverBuildFiles.push(dir + "/" + theme + "/" + themeDir[index]);
	} else if (themeDir[index].endsWith(".shared.js")) {
	    params.clientBuildFiles.push(dir + "/" + theme + "/" + themeDir[index]);
	    params.serverBuildFiles.push(dir + "/" + theme + "/" + themeDir[index]);
	}
    }
};


//scanPlugins("plugins_old", oldGlobal);
var globals = {
    pluginAllocatorCount : oldGlobal.pluginAllocatorCount,
    pluginAllocation : oldGlobal.pluginAllocation,
    pluginAllocationReverse : oldGlobal.pluginAllocationReverse,
    sharedBuildFiles : [],
    clientBuildFiles : [],
    clientCSSFiles : oldGlobal.clientCSSFiles,
    serverBuildFiles : [],
    licenses : oldGlobal.licenses,
    plugins : oldGlobal.plugins,
    clientLibraries : oldGlobal.clientLibraries,
    serverLibraries : oldGlobal.serverLibraries,
    widgetCode : []

};

var getProvidedWidgets = function (clientFiles) {
    // find the widgets in the client files
    var widgets = {};
    globals.clientBuildFiles.forEach(function (fname) {
        var data = fs.readFileSync(fname, 'utf8');
        // strip of blank or goog.require( at the begining

        var stream = {
            start : 0,
            next: data.indexOf('\n'),
            data: data
        };
        
        
        var scanFor = function (stream, search) {
            while (stream.next !== -1) {
                var line = stream.data.substring(stream.start, stream.next);
                var match = line.match(search);
                if (match) {
                    stream.start += match.index + match[0].length;
                    return match[0];
                }
                stream.start = stream.next + 1;
                stream.next = data.indexOf('\n', stream.start);
            }
            line = stream.data.substring(stream.start);
            match = line.match(search);
            if (match) {
                stream.start += match.index + match[0].length;
                return match[0];
            }
            return false;
            
        }; 
        
        while (scanFor(stream, '@export')) {
            if (scanFor(stream, '\\*/')) {
               
                var ident = scanFor(stream, /([a-zA-Z_$][a-zA-Z_0-9$]+)(.[a-zA-Z_$][a-zA-Z_0-9$]+)*/);
                widgets['goog.require(\'' + ident + '\');'] = true;
            }
        }

    });
    return widgets;
};

var scanCss = function (dir, list) {
    fs.readdirSync(dir, 'utf8')
        .forEach(function (file) {
            if (file.endsWith('.css') && file !== 'demo.css') {
                list.push(dir + '/' + file);
            }
        });
};

if(config.css && config.css instanceof Array && config.css.length>0){
    for(var index in config.css){
        scanCss(config.css[index], oldGlobal.clientCSSFiles);
    }
}

//oldGlobal.clientCSSFiles.push("client/aurora.style.css");
scanPlugins("plugins", oldGlobal);
scanPlugins("../node_modules", oldGlobal);
scanPlugins("../themes", oldGlobal, [theme]);
if(config.plugins && config.plugins instanceof Array && config.plugins.length>0){
    for(var index in config.plugins){
        scanPlugins(config.plugins[index], oldGlobal);
    }
}
globals.pluginAllocatorCount = oldGlobal.pluginAllocatorCount;
if(config.closure_plugins && config.closure_plugins instanceof Array && config.closure_plugins.length>0){
    for(var index in config.closure_plugins){
        scanPlugins(config.closure_plugins[index], globals);
    }
}

// do these last since we want to override existing values
var pluginAllocatorCode = "var AURORA = (function(aurora){aurora.plugins="+JSON.stringify(oldGlobal.pluginAllocation)+";aurora.pluginsById = "+JSON.stringify(oldGlobal.pluginAllocationReverse)+";return aurora;}(AURORA || {}));\n\n";
oldGlobal.clientBuildFiles = oldGlobal.clientBuildFiles.concat(oldGlobal.widgetCode);
if (units !== 'server') {
    // Build client.js
    var clientFile = "client.js";
    var clientPath = '../' + clientFile;
    var clientRequires = getProvidedWidgets(globals.clientBuildFiles);
    
    
    appendFiles(null, clientRequires, oldGlobal.sharedBuildFiles);
    appendFiles(null, clientRequires, oldGlobal.clientBuildFiles);
    fs.writeFileSync(clientPath,"goog.provide('aurora.client');\n");
    writeRequires(clientPath, clientRequires);
    fs.appendFileSync(clientPath,pluginAllocatorCode);
    appendFiles(clientPath, clientRequires, oldGlobal.sharedBuildFiles);
    appendFiles(clientPath, clientRequires, oldGlobal.clientBuildFiles);
    

    if (target !== "fast") {
	var lintPassed = lintCheck(oldGlobal.clientBuildFiles.concat(oldGlobal.sharedBuildFiles), {
	    white : true,
	    sloppy : true,
	    debug : true,
	    browser : true
	});
	console.log("Client Lint Check: "+(lintPassed?"PASSED":"FAILED"));
    }
	    
    var doCompile = ((config.compile!==undefined && isModuleAvailableSync("closurecompiler"))?config.compile:false);
    //writeFile(concatenated, clientFile);
    //	    writeFile(concatenated, "../" + clientFile);
    
    compile(!doCompile || target === 'debug', 'client', '../client.min.js', globals.clientBuildFiles.concat(globals.sharedBuildFiles));
}


// Build CSS
writeFile(concatenate(oldGlobal.clientCSSFiles), "../style.css");
writeFile(concatenate(oldGlobal.clientLibraries), "../client.libs.js");
	    
if (units !== 'client') {
    // Build server.js
    var serverFile = "../server.js";
    var serverRequires = {};
    appendFiles(null, serverRequires, oldGlobal.sharedBuildFiles);
    appendFiles(null, serverRequires, oldGlobal.serverBuildFiles);
    fs.writeFileSync(serverFile,"goog.provide('aurora.server');\n");
    
    writeRequires(serverFile, serverRequires);
    fs.appendFileSync(serverFile,pluginAllocatorCode);
    appendFiles(serverFile, serverRequires, oldGlobal.sharedBuildFiles);
    appendFiles(serverFile, serverRequires, oldGlobal.serverBuildFiles);
    
    if (target !== "fast") {
	var lintPassed = lintCheck(oldGlobal.sharedBuildFiles.concat(oldGlobal.serverBuildFiles), {
	    white : true,
	    sloppy : true,
	    debug : true,
	    node : true
	});
	console.log("Server Lint Check: "+(lintPassed?"PASSED":"FAILED"));
    }
	    
    fs.appendFileSync(serverFile,"\nAURORA.ready();\n");
    compile(false, 'server', '../server.js', globals.serverBuildFiles.concat(globals.sharedBuildFiles));
}
writeFile("", "../LICENSE.txt");
for(var index in oldGlobal.licenses){
    if(!oldGlobal.licenses.hasOwnProperty(index)){
	continue;
    }
    var sp = oldGlobal.licenses[index].replace("../", "").split("/");
		
    fs.appendFileSync("../LICENSE.txt", "\r\n-------------------------------------------\r\n"+sp[1]+"\r\n");
    fs.appendFileSync("../LICENSE.txt", fs.readFileSync(oldGlobal.licenses[index]));	
    fs.appendFileSync("../LICENSE.txt", "\r\n");
}
	    
if (isModuleAvailableSync("jsdoc2") && target === "all" && config.generateDocumentation) {
    generateJSDocs("../" + clientFile, function() {
	generateJSDocs(serverFile, function() {
	    complete = true;
	});
    });
    wait();
}

