const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process = require('child_process');

var buildConfigStr = path.resolve((process.argv.length>=3)?process.argv[2]:__dirname+path.sep+"build_config.json");
process.title = "aurora_build";

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
	process.exit();
}
var startTime = new Date().getTime();
console.log("Starting Aurora Builder");

config.output = config.output || "output";
createDir(config.output);
createDir(config.output+path.sep+"resources");
fs.copyFileSync(__dirname+path.sep+"output_wrapper.txt", config.output+path.sep+"output_wrapper.txt");

var dependencyTree = {};
var buildScriptCalls = {};
config.plugins.forEach(function(pluginDir){
	fs.readdirSync(pluginDir).forEach(function(pluginName){
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
					}).on('end', function(){
						if(errored){
							console.log("Error while compiling "+pluginName+" plugin");
							process.exit();
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
	return newStr.join(" = {};")+" = "+name+";";		//"/** @suppress{this} */"+
	
}

processQueue(orderedScripts, function(){
	//Match build targets and output to output dir.
	var buildTargets = {};
	config.build_targets.forEach(function(target){
		buildTargets[target.filename] = target;
		buildTargets[target.filename].sources = [];
	});
	
	var pluginConfigs = {};
	config.plugins.forEach(function(pluginDir){
		fs.readdirSync(pluginDir).sort(function(a,b){
			return pluginDepth[a]-pluginDepth[b];
		}).filter(function(pluginName){
			return !pluginName.endsWith(".disabled");
		}).forEach(function(pluginName){
			config.build_targets.forEach(function(target){
				if((target.searchExp instanceof Array)===false){
					target.searchExp = [target.searchExp];
				}
				target.searchExp.forEach(function(searchExpStr){
					fs.readdirSync(pluginDir+path.sep+pluginName).forEach(function(pluginFileName){
						var stat = fs.statSync(pluginDir+path.sep+pluginName+path.sep+pluginFileName);
						copyDirectorySync(pluginDir+path.sep+pluginName+"/resources", config.output+"/resources");
						if(stat.isFile()){
							if(pluginFileName==="config.json"){
								pluginConfigs[pluginName] = JSON.parse(fs.readFileSync(pluginDir+path.sep+pluginName+path.sep+pluginFileName).toString());
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

	var customConfig = JSON.parse(fs.readFileSync("config.json"));
	for(var pluginName in customConfig){
		for(var key in customConfig[pluginName]){
			pluginConfigs[pluginName][key] = customConfig[pluginName][key];
		}
	}	
	
	fs.writeFileSync(config.output+"/config.json", JSON.stringify(pluginConfigs, null, "\t"));
	processQueue(Object.values(buildTargets).map(function(target){
		return function(doneCb){
			if(target.compiled===true){
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
								target.sources = target.sources.concat(JSON.parse(fs.readFileSync(sourcesPath)));
							}
						});
					});
				}
				
				var nodeJsExterns = target.nodejs===true?" --externs "+__dirname+"/nodejs-externs/*.js --externs "+__dirname+"/nodejs-externs/redundant/*.js --externs "+__dirname+"/nodejs-externs/contrib/mime.js":"";
				var buildCommandArray = ["java -jar "+__dirname+"/closure-compiler-v20180716.jar",//closure-compiler-v20180204.jar",
					"--env="+target.env+""+nodeJsExterns,
					"--js='"+entryFilePath+"'",
					"--js='"+target.sources.join("' --js='")+"'",
					"--dependency_mode=STRICT",
					"--entry_point=entrypoints",
					"--compilation_level="+(target.compilationLevel || "ADVANCED_OPTIMIZATIONS"),
					"--warning_level=VERBOSE",
					"--jscomp_error=checkTypes",
					"--js_output_file='"+config.output + path.sep + target.filename+"'",
					"--create_source_map='"+config.output + path.sep + target.filename+".map'",
					"--source_map_format=V3",
					"--source_map_include_content=true",
					//"--export_local_property_definitions"
					//,"--assume_function_wrapper"			//This allows extra optimizations if you can assume a function wrapper.
					//,"--generate_exports=true"
				];
				
				if(target.env==="BROWSER"){
					buildCommandArray.push("--isolation_mode=IIFE");
				}
				
				if(target.nodejs){
					buildCommandArray.push("--output_wrapper_file="+__dirname+"/output_wrapper.txt");
				}
				
				var buildCommand = buildCommandArray.join(" ");
				
				//console.log("\n"+buildCommand+"\n");
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
						doneCb();
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
		}
	}), function(){
		console.log("Build took "+(new Date().getTime()-startTime)+"ms");
	});
});

//@export, @export {SomeType}
//When properties are marked with @export and the compiler is run with the --generate_exports flag, a corresponding goog.exportSymbol statement will be generated:
/** @export */
//foo.MyPublicClass.prototype.myPublicMethod = function() {
  // ...
//};
//goog.exportSymbol('foo.MyPublicClass.prototype.myPublicMethod',
//foo.MyPublicClass.prototype.myPublicMethod);
//You can write /** @export {SomeType} */ as a shorthand for /** @export @type {SomeType} */.
//Code that uses the @export annotation must either:
 //   include closure/base.js, or
   // define both goog.exportSymbol and goog.exportProperty with the same method signature in their own codebase.
