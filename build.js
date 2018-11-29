const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process = require('child_process');
const exec = require('child_process').exec;
const JAVA_HOME = process.env.JAVA_HOME || '';

var JAVA = path.join(JAVA_HOME,'java');
var buildConfigStr = path.resolve((process.argv.length>=3)?process.argv[2]:__dirname+path.sep+"build_config.json");
var debug = false;
var build = null;
if (process.argv.length >= 4) {
    let type = process.argv[3];
    debug = type.startsWith('debug-') || type == 'debug';
    if (type !== 'debug' && debug) {
        build = type.substring(6);
    }
    else if (type !== 'debug'){
        build = type;
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
createDir(config.output);
createDir(config.output+path.sep+"resources");

var dependencyTree = {};
var buildScriptCalls = {};
config.plugins.forEach(function(pluginDir){
	fs.readdirSync(pluginDir).forEach(function(pluginName){
		if(config.ignorePlugins && config.ignorePlugins instanceof Array && config.ignorePlugins.indexOf(pluginName)>=0){
			return;
		}
		if(config.allowedPlugins && config.allowedPlugins instanceof Array && config.allowedPlugins.indexOf(pluginName)<0){
			return;
		}
			
		if(pluginName.endsWith("disabled")){return;}
		try{var pluginConfigStr = fs.readFileSync(pluginDir+path.sep+pluginName+"/build_config.json").toString();}catch(e){var pluginConfigStr = "{}";}
		try{var pluginConfig = JSON.parse(pluginConfigStr);}catch(e){var pluginConfig = {};}
		dependencyTree[pluginName] = [];
		if(pluginConfig.dependencies){
			pluginConfig.dependencies.forEach(function(dependency){
				dependencyTree[pluginName].push(dependency);
			});
		}
		if(buildScriptCalls[pluginName]===undefined){buildScriptCalls[pluginName] = {name: pluginName,scripts:[]};}
		fs.readdirSync(pluginDir+path.sep+pluginName).forEach(function(pluginFileName){
		    if(pluginFileName.endsWith("build.js")){
			buildScriptCalls[pluginName].scripts.push(function(doneCb){
			    console.log("Building "+pluginName);
			    var child = child_process.fork(pluginDir+path.sep+pluginName+path.sep+pluginFileName, [pluginConfigStr, __dirname, path.resolve(process.cwd()+path.sep+config.output), buildConfigStr], {silent:true}).on('exit', function (code) {
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
for(var pluginName in dependencyTree){
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
	if(queue.length>0){queue.pop()(function(){processQueue(queue, done);});}
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

    var pluginConfigs = {};
    config.build_targets.forEach(function (target) {
        if (shouldBuild(target) && target.preSearch) {
            target.preSearch.forEach(function (search) {
                scanGlob(search, function (fname) {
                    target.preSearch, buildTargets[target.filename].sources.push(fname);
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
				target.searchExp.forEach(function(searchExpStr){
					fs.readdirSync(pluginDir+path.sep+pluginName).forEach(function(pluginFileName){
					    var stat = fs.statSync(pluginDir+path.sep+pluginName+path.sep+pluginFileName);
                                            if (shouldBuild(target)) { 
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
							if(match!==null){
								buildTargets[target.filename].sources.push(path.resolve(pluginDir+path.sep+pluginName+path.sep+pluginFileName));
							}	
					    }
					});
				});
			});
		});
	});
	try{
		var configStat = fs.statSync("config.json");		//This will throw an exception if the config doesnt exist.
		var customConfig = JSON.parse(fs.readFileSync("config.json"));
		for(var pluginName in customConfig){
			for(var key in customConfig[pluginName]){
				pluginConfigs[pluginName][key] = customConfig[pluginName][key];
			}
		}	
	}
	catch(e){}	//Do nothing intentionally.
	
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
	return function(doneCb){
	    if(target.compiled===true){
                fs.writeFileSync(argsFile, "");
		console.log("Compiling "+target.filename);
		target.sources = target.sources.map(function(p){
		    if(p.startsWith(process.cwd())){
			return p.substr(process.cwd()+1);
		    }
		    return p;
		});
		
		var entryFilePath = config.output+path.sep+"aurora.entry.js";		//os.tmpdir()
		var entryPoints = findExports(target.sources);
		//console.log("Entry Points", entryPoints.join(" "));
		var entryStr = "goog.provide(\"entrypoints\");\r\n"+entryPoints.map(function(v){
		    return "goog.require(\""+v+"\");"+getExportedString(v, target.env==="BROWSER"?"window":"global");
		}).join("\r\n");
                
		//console.log("Entry Points:\r\n", entryStr);
		fs.writeFileSync(entryFilePath, entryStr);
		
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

		var buildCommandArray = 
                        [JAVA+" -jar "+__dirname+"/closure-compiler-v20180716.jar",//closure-compiler-v20180204.jar",
			 "--env="+target.env+""].concat(
                             argsFileFlag, target.args || [],
                             ["--hide_warnings_for=closure/goog/base.js",
			      "--js='"+entryFilePath+"'",
			      "--js='"+target.sources.join("' --js='")+"'",
			      "--dependency_mode=STRICT",
			      "--entry_point=entrypoints",
			      "--compilation_level="+level,
			      "--warning_level=VERBOSE",
			      "--jscomp_error=checkTypes",
			      "--js_output_file='"+config.output + path.sep + target.filename+"'",
			      "--create_source_map='"+config.output + path.sep + target.filename+".map'",
			      "--source_map_format=V3",
			      "--source_map_include_content=true"]);
			    //"--export_local_property_definitions"
				//,"--assume_function_wrapper"			//This allows extra optimizations if you can assume a function wrapper.
					//,"--generate_exports=true"

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
				fs.appendFileSync(config.output+path.sep+target.filename, fs.readFileSync(sourceFile));
				fs.appendFileSync(config.output+path.sep+target.filename, "\n");
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