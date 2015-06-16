console.log('Building Aurora');
console.log('Using NodeJS ' + process.version);
var jsmin = require('jsmin2');
var jslint = require('node-jslint').JSLINT;
var path = require("path");
var fs = require("fs");
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
console.log("Target: " + target);

var config = JSON.parse(fs.readFileSync((process.argv.length > 2 && fs.existsSync(process.argv[2])) ? process.argv[2] : __dirname + "/../config.json"));
var theme = config.theme;
var exec = require('exec');


config.generateDocumentation = config.generateDocumentation || true;
var ignorePlugins = [];

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

var concatenate = function() {
	var concatenated = "";
	for ( var index in arguments) {
		var fileArray = arguments[index];
		for ( var index in fileArray) {
			concatenated += fs.readFileSync(fileArray[index]) + "\n\n";
		}
	}
	return concatenated;
};

var lintCheck = function(code, filename, options) {
	var name = filename.replace(".js", "").replace("../", "");

	if (!fs.existsSync("build_output")) {
		fs.mkdirSync("build_output");
	}
	if (!fs.existsSync("build_output/" + name)) {
		fs.mkdirSync("build_output/" + name);
	}

	var validLintCheck = jslint(code, options);
	if (!validLintCheck) {
		var results = jslint.data();
		fs.writeFileSync("build_output/" + name + "/jsmin_error.html", jslint.error_report(results));
		return false;
	}
	fs.writeFileSync("build_output/" + name + "/jsmin_out.html", jslint.report(results));
	return true;
};

var minify = function() {
	ClosureCompiler.compile(
	    ['../client.js'],
	    {
	    	jscomp_off			:			"internetExplorerChecks",
	    	language_in			:			"ECMASCRIPT5",
	    	js					:			"../client.js",
	        js_output_file		: 			"../client.min.js",
	        output_wrapper		: 			"//# sourceMappingURL=/client.js.map\n%output%",
	        compilation_level	: 			"SIMPLE_OPTIMIZATIONS",// SIMPLE_OPTIMIZATIONS | ADVANCED_OPTIMIZATIONS | WHITESPACE_ONLY
	        source_map_format	: 			"V3",
	        create_source_map	: 			"../client.js.map",
	        source_map_location_mapping	: 	"none|../client.js.map"
	        //Formatting			: 			"PRETTY_PRINT",// Capitalization does not matter      
	        //externs: ["externs/file3.js", "externs/contrib/"], // If you specify a directory here, all files inside are used 
	    },
	    function(error, result) {
	        if (result) {
	           // console.log(result);
	            console.log("Javascript Compilation Success");
	            fs.writeFileSync("../client.min.js", result);
	            // Display error (warnings from stderr) 
	        } else {
	        	console.log("ClosureCompiler", error);
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

var sharedBuildFiles = [];

var clientBuildFiles = [
"server/goog.js", "shared/number.js", "shared/enums.js", "shared/aurora_version.js", "shared/log.js", "shared/date.js", "shared/math.js", "shared/function.js", "shared/object.js", "shared/array.js", "shared/string.js", "shared/flapjax.closure.js", "shared/signals.js",
        "shared/crypto.js", "shared/aurora.flapjax.js", "client/dom.js", "client/binary.client.js", "client/aurora.js",
         "client/widget.renderers.js", "client/authentication.client.js"
];

var clientCSSFiles = [ "../themes/" + theme + "/style.css",
// "plugins/stats/stats.css",
"plugins/tables/tables.css" ];

var serverBuildFiles = [ "server/file.js", "server/goog.js", "shared/enums.js", "shared/number.js", "shared/log.js", "shared/signals.js", "shared/math.js", "shared/object.js", "shared/array.js", "shared/string.js", "shared/date.js",
        "shared/crypto.js", "shared/aurora_version.js", "server/aurora.settings.server.js", "shared/flapjax.closure.js", "shared/aurora.flapjax.js", "plugins/tables/tables.shared.js", "server/http.library.js",
        "server/binary.server.js", "server/server.js", "server/authentication.server.js"
];



var target = (process.argv.length >= 3) ? process.argv[2] : "debug";

if(target=="libs"){
	var libs = concatenate(["server/goog.js", "shared/number.js", "shared/date.js", "shared/math.js", "shared/function.js", "shared/object.js", "shared/array.js", "shared/string.js", "shared/flapjax.closure.js", "shared/signals.js", "shared/crypto.js","shared/aurora.flapjax.js"]);
	fs.writeFileSync("aurora.libs.js", libs);
	process.exit();
}
/*
var clientBuildFiles = ["server/goog.js", "shared/number.js", "shared/enums.js", "shared/aurora_version.js", "shared/log.js", "shared/date.js", "shared/math.js", "shared/function.js", "shared/object.js", "shared/array.js", "shared/string.js", "shared/flapjax.closure.js", "shared/signals.js", "shared/crypto.js", "shared/aurora.flapjax.js", "client/dom.js", "client/aurora.js", "plugins/tables/tables.shared.js", "plugins/tables/tables.client.js", "plugins/tables/tables.validators.js", "client/authentication.client.js", "client/widget.renderers.js"];
var clientCSSFiles = ["../themes/" + theme + "/style.css", "plugins/tables/tables.css"]; 
var serverBuildFiles = ["server/file.js", "server/goog.js", "shared/enums.js", "shared/number.js", "shared/log.js", "shared/signals.js", "shared/math.js", "shared/object.js", "shared/array.js", "shared/string.js", "shared/date.js", "shared/crypto.js", "shared/aurora_version.js", "server/aurora.settings.server.js", "shared/flapjax.closure.js", "shared/aurora.flapjax.js", "plugins/tables/tables.shared.js", "server/http.library.js", "server/server.js", "server/authentication.server.js"];
*/
var clientLibraries = [];
var serverLibraries = [];
var licenses = [];
var plugins = [];

fs.writeFileSync("shared/aurora_version.js", "AURORA.VERSION = '" + (new Date().getTime()) + "';\n");

var pluginAllocatorCount = 1;
var pluginAllocation = {"aurora":0};
var pluginAllocationReverse = {"0": "aurora"};

// Include plugins
fs.readdir("plugins", function(err, files) {
	if (err) {
		throw err;
	}
	files = files.sort(function(a, b) {return a < b ? -1 : 1;});
	plugins = files;
	var filesStr = "";
	var widgetCode = [];
	for ( var index in files) {
		var plugin = files[index];
		if (ARRAYS.contains(ignorePlugins, plugin)) {
			continue;
		}
		var cleanPluginName = plugin.makeDomIdSafe();
		pluginAllocationReverse[pluginAllocatorCount+""] = cleanPluginName;
		pluginAllocation[cleanPluginName] = pluginAllocatorCount++;
		
		var pluginDir = fs.readdirSync("plugins/" + plugin + "/");
		filesStr+=cleanPluginName+", ";
		for ( var fileIndex in pluginDir) {
			var fullPath = "plugins/" + plugin + "/" + pluginDir[fileIndex];
			if (fullPath.endsWith("build.js")) {
				require(__dirname + "/" + fullPath);
				console.log("Plugin build script complete");
			}
		}
		pluginDir = fs.readdirSync("plugins/" + plugin + "/");		//New files might have been created by the build script.
		pluginDir = pluginDir.sort(function(a, b) {return a < b ? -1 : 1;});
		for ( var fileIndex in pluginDir) {
			var fullPath = "plugins/" + plugin + "/" + pluginDir[fileIndex];
			if (fullPath.endsWith(".server.js")) {
				serverBuildFiles.push(fullPath);
			} else if (fullPath.endsWith(".client.widgets.js")) {
				widgetCode.push(fullPath);
			} else if (fullPath.endsWith(".client.js")) {
				clientBuildFiles.push(fullPath);
			} else if (fullPath.endsWith(".shared.js")) {
				sharedBuildFiles.push(fullPath);
			} else if (fullPath.endsWith(".css")) {
				clientCSSFiles.push(fullPath);
			} else if (fullPath.endsWith(".server.lib.js") || fullPath.endsWith(".server.min.js")) {
				serverLibraries.push(fullPath);
			} else if (fullPath.endsWith(".client.lib.js") || fullPath.endsWith(".client.min.js")) {
				clientLibraries.push(fullPath);
			} else if (fullPath.endsWith(".shared.lib.js") || fullPath.endsWith(".shared.min.js")) {
				serverLibraries.push(fullPath);
				clientLibraries.push(fullPath);
			}
			else if (fullPath.toUpperCase().endsWith("LICENSE") || fullPath.toUpperCase().endsWith("LICENSE.TXT")) {
				licenses.push(fullPath);
			}
		}
	}
	if(target==="debug"){
		console.log("Including plugins ", filesStr);
	}
	

	fs.readdir("../themes/" + theme + "/", function(err, themeDir) {
		if (err) {
			throw err;
		}

		// Scan the theme directory for javascript
		for ( var index in themeDir) {
			if (themeDir[index].endsWith(".client.js")) {
				clientBuildFiles.push("../themes/" + theme + "/" + themeDir[index]);
			} else if (themeDir[index].endsWith(".server.js")) {
				serverBuildFiles.push("../themes/" + theme + "/" + themeDir[index]);
			} else if (themeDir[index].endsWith(".shared.js")) {
				clientBuildFiles.push("../themes/" + theme + "/" + themeDir[index]);
				serverBuildFiles.push("../themes/" + theme + "/" + themeDir[index]);
			}
		}
		
		var pluginAllocatorCode = "var AURORA = (function(aurora){aurora.plugins="+JSON.stringify(pluginAllocation)+";aurora.pluginsById = "+JSON.stringify(pluginAllocationReverse)+";return aurora;}(AURORA || {}));\n\n";
		clientBuildFiles = clientBuildFiles.concat(widgetCode);

		// Build client.js
		var clientFile = "client.js";
		var concatenated = pluginAllocatorCode+concatenate(sharedBuildFiles, clientBuildFiles);
		if (target !== "fast") {
			var lintPassed = lintCheck(concatenated, clientFile, {
			    white : true,
			    sloppy : true,
			    debug : true,
			    browser : true
			});
			console.log("Client Lint Check: "+(lintPassed?"PASSED":"FAILED"));
		}
		
		var compile = ((config.compile!==undefined && isModuleAvailableSync("closurecompiler"))?config.compile:false);
		
		//writeFile(concatenated, clientFile);
		writeFile(concatenated, "../" + clientFile);
		if(compile){
			minify();
		}
		// Build CSS
		writeFile(concatenate(clientCSSFiles), "../style.css");
		
		writeFile(concatenate(clientLibraries), "../client.libs.js");
		
		// Build server.js
		var serverFile = "../server.js";
		var concatenated = pluginAllocatorCode+concatenate(sharedBuildFiles, serverBuildFiles);
		if (target !== "fast") {
			var lintPassed = lintCheck(concatenated, serverFile, {
			    white : true,
			    sloppy : true,
			    debug : true,
			    node : true
			});
			console.log("Server Lint Check: "+(lintPassed?"PASSED":"FAILED"));
		}

		concatenated += "\nAURORA.pluginsLoadedE.sendEvent(true);\n";
		writeFile(concatenated, serverFile);
		writeFile(concatenate(licenses), "../LICENSE.txt");

		if (isModuleAvailableSync("jsdoc2") && target === "all" && config.generateDocumentation) {
			generateJSDocs("../" + clientFile, function() {
				generateJSDocs(serverFile, function() {
					complete = true;
				});
			});
			wait();
		}
	});

});
