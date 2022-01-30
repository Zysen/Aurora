const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process = require('child_process');
const exec = require('child_process').exec;
var JAVA = null;

if (process.env.JAVA_HOME) {

	var opts = [path.join('jdk','bin','java'), path.join('jre','bin','java'),'java'];
	for (var i = 0; i < opts.length; i++) {
		var opt = opts[i];
        JAVA = path.join(process.env.JAVA_HOME,opt);
        if (fs.existsSync(JAVA)) {
        	break;
		}
	}


}
else {
	JAVA = 'java'
}



var buildConfigStr = path.resolve((process.argv.length>=3)?process.argv[2]:__dirname+path.sep+"build_config.json");
var debug = false;
var test = false;
var build = null;
if (process.argv.length >= 4) {
    let type = process.argv[3];
    debug = type.startsWith('debug-') || type == 'debug';
    test = type.startsWith('test-') || type == 'test';

    if (type !== 'debug') {
        if (debug) {
            build = type.substring(6);
        }
        else if (type !== 'debug'){
            if (test) {
                build = type.substring(5);
            }
            else {
                build = type;
            }
        }
    }
    console.log("BUILD Type", build);
};
process.title = "aurora_build";


var regEscape = function (c) {
    if (['.','(',')','*','?','[', ']', '\\'].indexOf(c) !== -1) {
        return '\\' + c;
    }
    return c;
};

var postProcess = function(config, doneCB){
	if (config.post_process) {
		exec(config.post_process.command, function (err, stdout, stderr) {

			console.log(stdout);
			console.error(stderr);
			if (err) {
				console.error("failed to execute", config.post_process.command);
				process.exit(-1);
			}
			doneCB(null);
		//console.log("Build took "+(new Date().getTime()-startTime)+"ms");
		});
	}
	else{
		doneCB(null);
	}
};

var parseGlob = function (part) {
    var escape = false;
    var isGlob = false;
    var regExp = "^(";
    var prevC = null;
    var isRec = false;
    for (var i = 0; i < part.length; i++) {
        var ch = part[i];
        if (!escape) {
            if (ch === '*' && prevC === '*') {
                prevC = null;
                isRec = true;
            }
            else if (ch === '*' || ch === '?') {
                prevC = ch;
                isGlob = true;
                regExp += '.';
                
                if (ch === '*') {
                    regExp += '*';
                }
                
            }
            else {
                escape = part[i] === '\\';
                if (!escape) {
                    regExp += regEscape(part[i]);
                }
                prevC = ch;
            }
            
        }
        else {
            prevC = null;
            escape = false;
            regExp += regEscape(part[i]);
            
        }
    }
    regExp += ')$';
    var e = new RegExp(regExp);
    return {glob: isGlob, isRec: isRec, pat: function (v) {return e.test(v);}, exp: regExp};
};

var isGlob = function (part) {
    return parseGlob(part).glob;
};


var forEachSearchExp = function (pluginName, exp, cb) {
    let debug =  (pluginName == 'aurora_sql');
    if (exp instanceof Array) {
        for (let i = 0; i < exp.length; i++) {
            let item = exp[i];
            if (typeof(item) === 'string') {
                cb(item);
            }
            else if (item.plugin && parseGlob(item.plugin).pat(pluginName)) {
                forEachSearchExp(pluginName, item.search, cb);
                break;
            }
        }
    }
    else if (typeof(exp) === 'string') {
        cb(exp);
    }
    
};
var scanGlobRec = function (parts, split, cb) {
    if (split >= parts.length) {
        cb(parts.join(path.sep));
        return;
    }

    var base = parts.slice(0,split).join(path.sep);
    var gInfo = parseGlob(parts[split]);
    
    
    fs.readdirSync(base).forEach(function(filename){
        var subFile = path.join(base,filename);
	var stat = fs.statSync(subFile);
        var match = gInfo.pat(filename);
        var last = split + 1 === parts.length;

	if(stat.isFile()){
            if (match && last) {
                cb(subFile);
            }
	}
	else if(stat.isDirectory()){
            if (match && last) {
                cb(subFile);
            }
            else if (gInfo.isRec) {
                var pre = parts.slice(0,split);
                pre.push(filename);
                
                scanGlobRec(pre.concat(parts.slice(split)), split + 1, cb);
            }
	}
        
    });

};

var scanGlob = function (file, cb) {
    var f = path.normalize(file);
    var parts = f.split(path.sep);
    var firstGlob = 0;
    
    for (var i = 0; i < parts.length; i++) {
        if (isGlob(parts[i])) {
            break;
        }
        
        firstGlob++;
    }
    scanGlobRec(parts, firstGlob, cb);
    
};

if(Object.values===undefined){
	Object.prototype.values = function(){
		var v = [];
		for(var index in this){
			if(this.hasOwnProperty(index)){
				v.push(this[index]);
			}
		}
		return v;
	}
}

String.prototype.replaceAll = function (find, replace) {
    var str = this;
    return str.replace(new RegExp(find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replace);
};


function scanExports(str, startPos){
	var pos = str.indexOf("@export", startPos);
	if(pos>=0){
		var endBlockPos = str.indexOf("*/", pos);
		var eqPos = str.indexOf("=", endBlockPos);
		var chunk = str.substring(endBlockPos, eqPos);
		var elPos = chunk.lastIndexOf("\n");
		var name = chunk.substring(elPos+1).replaceAll(" ", "").replaceAll("\t", "");
		if(name.length>200){
			eqPos = pos+10;
		}
		var next = scanExports(str, eqPos);
		if(next){
			return [name].concat(next);
		}
		return [name];
	}
}

function findExports(sources){
	return [].concat.apply([], sources.map(function(e){
		return scanExports(fs.readFileSync(e).toString(), 0);
	}).filter(function(v){return v!==undefined;}));
}

function createDir(p){
	if(!fs.existsSync(p)){
		fs.mkdirSync(p);
	}
}

function copyDirectorySync(src, dest){
	if(!fs.existsSync(src)){return false;}
	if(!fs.existsSync(dest)){fs.mkdirSync(dest);}
	fs.readdirSync(src).forEach(function(filename){
		var stat = fs.statSync(src+path.sep+filename);
		if(stat.isFile()){
			fs.copyFileSync(src+path.sep+filename, dest+path.sep+filename);
		}
		else if(stat.isDirectory()){
			copyDirectorySync(src+path.sep+filename, dest+path.sep+filename);
		}
	});
}
var frameworkConfigString = fs.readFileSync(buildConfigStr);
try{var config = JSON.parse(frameworkConfigString);}
catch(e){
	console.log(e);
	process.exit(1);
}
var startTime = new Date().getTime();
console.log("Starting Aurora Builder");

config.output = config.output || "output";
config.generated = config.generated || "generated";
createDir(config.output);
createDir(path.join(config.output,"resources"));
createDir(config.generated);

var dependencyTree = {};
var buildScriptCalls = {};
let allPlugins = [];

config.plugins.forEach(function(pluginDir){
    fs.readdirSync(pluginDir).forEach(function(pluginName){
	if(config.ignorePlugins && config.ignorePlugins instanceof Array && config.ignorePlugins.indexOf(pluginName)>=0){
	    return;
	}
	if(config.allowedPlugins && config.allowedPlugins instanceof Array && config.allowedPlugins.indexOf(pluginName)<0){
	    return;
	}
	if(pluginName.endsWith("disabled")){return;}
        allPlugins.push({path: path.join(pluginDir, pluginName), name: pluginName});
    });
    
});

let allTests = [];
let testStubs = [];
if (test) {
    let scanForTests = function (root) {
        fs.readdirSync(root).forEach(function(fname){
            let fullName = path.join(root, fname);
            try {
                var stat = fs.statSync(fullName);
                if (stat.isFile()) {
                    if (/\.test\.js$/.test(fname)) {
                        allTests.push(fullName);
                    }
                    if (/\.test\.stub\.js$/.test(fname)) {
                        testStubs.push(fullName);
                    }
                }
                else if (stat.isDirectory()) {
                    scanForTests(fullName);
                }
            }
            catch (e) {
            }
        });


    };
    
    allPlugins.forEach(function (p) {
        if ((config['ignore-tests'] || []).indexOf(p.path) === -1) {
            scanForTests(p.path);
        }
    });
}

let testImports = {};
function addTestImports(file) {
    let lines = fs.readFileSync(file).toString().split('\n');
    lines.forEach(function (line) {
        let reg1 = /=\s*require\s*\(\s*'(..\/)*output\/testable\.js'\s*\)\s*\.([^;]*)\s*;/;
        let reg2 = /=\s*require\s*\(\s*"(..\/)*output\/testable\.js"\s*\)\s*\.([^;]*)\s*;/;
        let match = line.match(reg1) || line.match(reg2);
        if (match) {
            testImports[match[2].trim()] = true;
        }
    });
}

allTests.forEach(function (testFile) {
    addTestImports(testFile);
    
});


function testBases () {
    let bases = {};
    for (let im in testImports) {
        bases[im.split('.')[0]] = true;
    }
    return bases;
};

console.log(testImports);


allPlugins.forEach(function(pluginInfo){
    let pluginName = pluginInfo.name;
    try{var pluginConfigStr = fs.readFileSync(path.join(pluginInfo.path,"build_config.json")).toString();}catch(e){var pluginConfigStr = "{}";}
    try{var pluginConfig = JSON.parse(pluginConfigStr);}catch(e){var pluginConfig = {};}
    dependencyTree[pluginName] = [];
    if(pluginConfig.dependencies){
	pluginConfig.dependencies.forEach(function(dependency){
	    dependencyTree[pluginName].push(dependency);
	});
    }
    if(buildScriptCalls[pluginName]===undefined){buildScriptCalls[pluginName] = {name: pluginName,scripts:[]};}
    let curPluginDir = pluginInfo.path;

    fs.readdirSync(curPluginDir).forEach(function(pluginFileName){
	if(pluginFileName.endsWith("build.js")){
	    buildScriptCalls[pluginName].scripts.push(function(doneCb){
		console.log("Building "+pluginName);
		var child = child_process.fork(
                    path.join(curPluginDir, pluginFileName),
                    [
                        pluginConfigStr,
                        __dirname,
                        path.resolve(path.join(process.cwd(), config.output)),
                        buildConfigStr,
                        process.cwd(),
                        path.resolve(path.join(process.cwd(), config.generated)),
                        JSON.stringify(allPlugins.map(function (v) {return v.path;}))
                                                      
                    ], {silent:true}).on('exit', function (code) {
			doneCb();
		    });
		child.stdout.on('data', function(d){
		    console.log(d.toString());
		});
		var errored = false;
		child.stderr.on('data', function(d){
		    errored = true;
		    console.log(d.toString());
		});
                child.on('exit', function (code) {
                    if (code) {
			console.log("Error while compiling "+pluginName+" plugin");
                        process.exit(code);
                    }
                });
	    });		
	}
    });
});

/*
	Order plugins based on dependencies
*/
var orderedScripts = [];
function findDepth(name, visitedNodes, depth){		//TODO: Add loop detection
	visitedNodes = visitedNodes || {};
	depth = depth || 0;
	if(dependencyTree[name] && dependencyTree[name].length===0){
		return depth;
	}
	else if(dependencyTree[name] && dependencyTree[name].length){
		var greatest = 0;
		visitedNodes[name] = {};
		dependencyTree[name].forEach(function(d){
			if(visitedNodes[d]===undefined){
				var curDepth = findDepth(d, visitedNodes, depth+1);
				if(curDepth>greatest){
					greatest = curDepth;
				}
			}
		});
		return greatest;
	}
	return depth;
}

var pluginDepth = {};
for(let pluginName in dependencyTree){
    if(pluginName.endsWith(".disabled")){continue;}
    pluginDepth[pluginName] = findDepth(pluginName);
}

Object.values(buildScriptCalls).sort(function(p1, p2){
	return pluginDepth[p2.name]-pluginDepth[p1.name];
}).forEach(function(plugin){
	orderedScripts = orderedScripts.concat(plugin.scripts);
});
/*
	Execute plugin build scripts sequentially and in order.
*/
function processQueue(queue, done){
    if(queue.length>0){
        queue.pop()(function(){
            processQueue(queue, done);
        });
    }
    else{done();}
}

function getExportedString(name, globalStr){
	var newStr = [];
	var sp = name.split(".");
	for(var index in sp){
		var line = [];
		for(var index2 in sp){
			line.push(sp[index2]);
			if(index===index2){
				break;
			}
		}
		newStr.push(globalStr+"['"+line.join("']['")+"']");
	}
    return 'goog.exportSymbol(' + JSON.stringify(name)+ ', ' + name + ')';
	
}

console.log("build =================== ", build);

processQueue(orderedScripts, function(){
	//Match build targets and output to output dir.
    var buildTargets = {};
    var shouldBuild = function (target) {
        return build === null || (target.types && target.types.indexOf(build) !== -1);
    };
    config.build_targets.forEach(function(target){
        if (shouldBuild(target)) {
	    buildTargets[target.filename] = target;
	    buildTargets[target.filename].sources = [];
        }
    });
    function doInclude(target, name) {
        var include = true;
        (target.exclude || []).forEach(function (ex) {
            if (parseGlob(ex).pat(name)) {
                include = false;
            }
        });
        return include;
    }
    var pluginConfigs = {};
    config.build_targets.forEach(function (target) {
        target.seenFiles = target.seenFiles || {};
        let seen = target.seenFiles;
        if (shouldBuild(target) && target.preSearch) {
            target.preSearch.forEach(function (search) {

                scanGlob(search, function (fname) {
                    let rfname = path.resolve(fname);
                    if (doInclude(target, fname) && !seen[rfname]) {
                        target.preSearch, buildTargets[target.filename].sources.push(fname);
                        seen[rfname] = true;
                    }
                });
            });
            
        }
    });


    config.plugins.forEach(function(pluginDir){
	fs.readdirSync(pluginDir).sort(function(a,b){
	    return pluginDepth[a]-pluginDepth[b];
	}).filter(function(pluginName){
	    return !pluginName.endsWith(".disabled");
	}).forEach(function(pluginName){
	    if(config.ignorePlugins && config.ignorePlugins instanceof Array && config.ignorePlugins.indexOf(pluginName)>=0){
		return;
	    }
	    if(config.allowedPlugins && config.allowedPlugins instanceof Array && config.allowedPlugins.indexOf(pluginName)<0){
		return;
	    }
	    
	    config.build_targets.forEach(function(target){
		if((target.searchExp instanceof Array)===false){
		    target.searchExp = [target.searchExp];
		}
                
                if (target.ignorePlugins && target.ignorePlugins.indexOf(pluginName) !== -1) {
                    return;
                }
                target.seenFiles = target.seenFiles || {};
                let scanPlugin = function (pluginDir, pluginName, seenFiles) {
                    return function(searchExpStr) {
		        fs.readdirSync(path.join(pluginDir,pluginName)).forEach(function(pluginFileName){
			    var stat = fs.statSync(path.join(pluginDir,pluginName,pluginFileName));
                            if (shouldBuild(target) || build==="resources") {
			        copyDirectorySync(pluginDir+path.sep+pluginName+"/resources", config.output+"/resources");
                            }
			    if(stat.isFile()){
			        if(pluginFileName==="config.json"){
				    pluginConfigs[pluginName] = JSON.parse(fs.readFileSync(pluginDir+path.sep+pluginName+path.sep+pluginFileName).toString());
			        }
			        if (!shouldBuild(target)) { 
				    return;
			        }
                                
                                
			        var match = pluginFileName.match(searchExpStr);
                                if (pluginName === '.') {
                                    console.log("scanning source", pluginFileName, searchExpStr, match);
                                }
			        if(match!==null){
                                    let fileName = path.resolve(path.join(pluginDir,pluginName, pluginFileName));
                                    if (!seenFiles[fileName]) {
                                        seenFiles[fileName] = true;
                                        let fname = pluginDir+'/'+pluginName+'/'+pluginFileName;
                                        if (doInclude(target, fname)) {
					    buildTargets[target.filename].sources.push(path.resolve(pluginDir+path.sep+pluginName+path.sep+pluginFileName));
                                        }
                                    }
			        }	
			    }
		        });
                    };
                };
                forEachSearchExp(pluginName, target.searchExp, scanPlugin(pluginDir, pluginName, target.seenFiles));
                if (fs.existsSync(path.join(config.generated, pluginDir, pluginName))) {
                    forEachSearchExp(pluginName, target.searchExp, scanPlugin(path.join(config.generated, pluginDir), pluginName, target.seenFiles));
                }
	    });
	});
    });
    let  configStat = null;
    try{
	configStat = fs.statSync("config.json");		//This will throw an exception if the config doesnt exist.
    }
    catch(e){}	//Do nothing intentionally.
    if (configStat) {
	var customConfig = JSON.parse(fs.readFileSync("config.json"));
	for(let pluginName in customConfig){
	    for(var key in customConfig[pluginName]){
                pluginConfigs[pluginName] = pluginConfigs[pluginName] || {};
		pluginConfigs[pluginName][key] = customConfig[pluginName][key];
	    }
	}	
    }
    if(Object.keys(pluginConfigs).length>0){
	fs.writeFileSync(config.output+"/config.json", JSON.stringify(pluginConfigs, null, "\t"));
    }
    var testGlob = function (p, expected) {
        var res = isGlob(p);
        
        if (res !== expected) {
            console.log("glob", p, "FAILED");
            throw "match glob failed";
        }
    };
    console.log(parseGlob("pcr"));
    testGlob("*", true);
    testGlob("fred*.js", true);
    testGlob("fred\\\\*.js", true);
    testGlob("fred\\*.js", false);
    testGlob("\\*", false);
    testGlob("**", true);

    var hasFileArgs = false;
    var scanAndAddFiles = function (argFile, baseDir, arg, rel) {
        return function (v) {
            scanGlob(path.join(baseDir,v), function (file) {
                hasFileArgs = true;
                if (rel) {
                    var bd = path.normalize(baseDir);
                    file = file.substring(bd.length);
                }
                fs.appendFileSync(argFile, arg + file + "\n");
            });
        };
    };

    processQueue(Object.values(buildTargets).map(function(target){
        var argsFile = config.output+"/compile." + target.filename + ".args";
        console.log("preparing", target.filename, target.compiled);
	return function(doneCb){
            console.log("building", target.filename, target.compiled);
	    if(target.compiled===true){
                fs.writeFileSync(argsFile, "");
		console.log("Compiling "+target.filename);
		target.sources = target.sources.map(function(p){
		    if(p.startsWith(process.cwd())){
			return p.substr(process.cwd()+1);
		    }
		    return p;
		});
		var entryFilePath = path.join(config.output,target.filename+"-aurora.entry.js");		//os.tmpdir()
		var entryPoints = findExports(target.sources);
		//console.log("Entry Points", entryPoints.join(" "));
		var entryStr = "goog.provide(\"entrypoints\");\r\n"+entryPoints.map(function(v){
		    return "goog.require(\""+v+"\");\n"+getExportedString(v, target.env==="BROWSER"?"window":"global") + ';';
		}).join("\n");
                if (test)
                {
                    let imports = [];
                    for (let im in testImports)
                    {
                        imports.push(im);
                    }

                    imports.sort();
                    
                    fs.writeFileSync(entryFilePath,'/**\n * @fileoverview automatically generated file for exports so unit test can work\n');
                    fs.appendFileSync(entryFilePath, ' * @suppress {lintChecks}\n */\n\n');
                    fs.appendFileSync(entryFilePath, 'goog.provide(\'entrypoints\');\n\n');
                    imports.forEach(function(imp) {
                        fs.appendFileSync(entryFilePath, 'goog.require(\'' + imp + '\');\n');
                    });
                    fs.appendFileSync(entryFilePath, '\n\n');

                    imports.forEach(function(imp) {
                        fs.appendFileSync(entryFilePath, 'goog.exportSymbol(\'' + imp + '\', + ' + imp + ');\n');
                    }); 
                    fs.appendFileSync(entryFilePath, 'module.exports = {\n');
                    let first = true;
                    for (let base in testBases()) {
                        if (!first) {
                            fs.appendFileSync(entryFilePath, ',\n');
                        }
                        fs.appendFileSync(entryFilePath, '    ' + base + ': ' + base);
                        first = false;
                    }
                    fs.appendFileSync(entryFilePath, '\n};\n');
   
                }
                else {
		    //console.log("Entry Points:\r\n", entryStr);
		    fs.writeFileSync(entryFilePath,'/**\n * @fileoverview automatically generated file for exports\n');
                    fs.appendFileSync(entryFilePath, ' * @suppress {lintChecks}\n */');
                    fs.appendFileSync(entryFilePath, entryStr);
                    (target.imports||[]).forEach(function(imp) {
                        fs.appendFileSync(entryFilePath, 'goog.require(\'' + imp + '\');\n');
                    });
                    if (target.exports) {
                        fs.appendFileSync(entryFilePath, 'module.exports = {\n');
                        let first = true;
                        for (let name in target.exports) {
                            if (!first) {
                                fs.appendFileSync(entryFilePath, ',\n');
                            }
                            fs.appendFileSync(entryFilePath, '    ' + name + ': ' + target.exports[name]);
                            first = false;
                        }
                        fs.appendFileSync(entryFilePath, '\n};\n');
                    }


                }
                
		if(target.sourcesFile){
		    config.plugins.forEach(function(pluginDir){
			fs.readdirSync(pluginDir).filter(function(pluginName){
			    return !pluginName.endsWith(".disabled");
			}).forEach(function(pluginName){
                            
			    var sourcesPath = path.resolve(pluginDir+path.sep+pluginName+path.sep+target.sourcesFile);
			    if(fs.existsSync(sourcesPath)){
					var customSources = JSON.parse(fs.readFileSync(sourcesPath));
					if(!(customSources instanceof Array)){
						throw "Invalid Custom Sources File "+sourcesPath;
					}
					customSources = customSources.map(function(source){
						if(source.charAt(0)==='!'){
							return "!"+pluginDir+path.sep+pluginName+path.sep+(source.substring(1));
						}
						return pluginDir+path.sep+pluginName+path.sep+source;
					});
					
				target.sources = target.sources.concat(customSources);
			    }
			});
		    });
                }


                var argsFileFlag = [];

                (target.externs || []).forEach(scanAndAddFiles(argsFile, __dirname + "/../", "--externs "));
                (target.no_warnings || []).forEach(scanAndAddFiles(argsFile, __dirname + "/../", "--hide_warnings_for=", true));
                
                if (target.nodejs === true) {
                    [
                        "/nodejs-externs/contrib/mime.js",
                        "/nodejs-externs/redundant/*.js",
                        "/nodejs-externs/*.js"].forEach(scanAndAddFiles(argsFile, __dirname , "--externs "));
                }                                

                var level = debug ? "WHITESPACE_ONLY" : (target.compilationLevel || "ADVANCED_OPTIMIZATIONS");
                if (hasFileArgs) {
                    argsFileFlag = ['--flagfile', argsFile];
                }
                console.log("level", level);
                let compileOut = test ? path.join(config.output,  'testable.js') : path.join(config.output,  target.filename);
		var buildCommandArray =  [JAVA+" -jar "+__dirname+"/closure-compiler-v20180716.jar",//closure-compiler-v20180204.jar",
                     "--env="+target.env+""].concat(
                             argsFileFlag, target.args || [],
                             ["--hide_warnings_for=closure/goog/base.js",
			      "--js='"+ entryFilePath +"'",
                              "--jscomp_error=lintChecks",
			      "--js='"+target.sources.join("' --js='")+"'",
			      "--dependency_mode=STRICT",
			      "--entry_point=entrypoints",
			      "--compilation_level="+level,
			      "--warning_level=VERBOSE",
			      "--jscomp_error=checkTypes",
			      "--js_output_file='"+compileOut+"'",
                              "--language_out=ECMASCRIPT_2018",
			      "--create_source_map='"+compileOut +".map'",
			      "--source_map_format=V3",
			      "--source_map_include_content=true"]);
			    //"--export_local_property_definitions"
				//,"--assume_function_wrapper"			//This allows extra optimizations if you can assume a function wrapper.
					//,"--generate_exports=true"
                if (target.defines) {
                    target.defines.forEach(function (def) {
                        buildCommandArray.push('-D');
                        buildCommandArray.push(def);
                    });          
                }
				if(debug){
					buildCommandArray.push("--debug");
                    buildCommandArray.push("--formatting=PRETTY_PRINT");
				}
		var customOutputWrapperPath = config.output+path.sep+"output_wrapper_custom.txt";
		if(target.sourceMapLocation){
					if(target.sourceMapLocation==="local"){
						fs.writeFileSync(customOutputWrapperPath, "//# sourceMappingURL="+target.filename+".map\n%output%");
						buildCommandArray.push("--output_wrapper_file=\""+customOutputWrapperPath+"\"");
					}
					else if(target.env==="BROWSER" && !debug){
						fs.writeFileSync(customOutputWrapperPath, "//# sourceMappingURL="+target.sourceMapLocation+"/"+target.filename+".map\n%output%");
						buildCommandArray.push("--output_wrapper_file=\""+customOutputWrapperPath+"\"");
					}				
				    else if(target.nodejs){
						fs.writeFileSync(customOutputWrapperPath, "//# sourceMappingURL="+target.sourceMapLocation+"/"+target.filename+".map\n(function(){require('source-map-support').install({environment:'node',retrieveSourceMap: function(source) {if(source.endsWith(\"server.min.js\")){return {url: \"server.min.js.map\",map: require('fs').readFileSync(source+'.map', 'utf8')};}return null;}});%output%}).call(this);");
						buildCommandArray.push("--output_wrapper_file=\""+customOutputWrapperPath+"\"");
				    }
		}
                else if (target.nodejs && debug) {
                    buildCommandArray.push("--assume_function_wrapper");
		    //fs.writeFileSync(customOutputWrapperPath, "(function() {%output%}).call(global);");
		//				buildCommandArray.push("--output_wrapper_file=\""+customOutputWrapperPath+"\"");
                }

                    

		var buildCommand = buildCommandArray.join(" ");
		console.log("\n"+buildCommand+"\n");
		var ex = child_process.exec(buildCommand, function(err, stdout, stderr){
		    if(err){
			console.log(stderr);
			process.exit(1);
			return;
		    }
		    console.log(stdout);
		    console.log(stderr);
                    
		    fs.unlink(entryFilePath, function(err){
			if(err){console.error(err);}
			fs.unlink(customOutputWrapperPath, function(err){
			    if(err){}
			    fs.unlink(argsFile, function(err){
				if(err){}
				postProcess(target, doneCb);
			    });
			});
		    });
		});
	    }
	    else{
		console.log("Concatenating "+target.filename);
		fs.writeFileSync(config.output+path.sep+target.filename, "");
                
		target.sources.forEach(function(sourceFile){
		    fs.appendFileSync(path.join(config.output,target.filename), fs.readFileSync(sourceFile));
		    fs.appendFileSync(path.join(config.output,target.filename), "\n");
		});
		doneCb();
	    }
	};
    }), function(){
		postProcess(config, function(){
			console.log("Build took "+(new Date().getTime()-startTime)+"ms");
		});
    });
});
