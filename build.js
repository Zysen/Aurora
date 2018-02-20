var fs = require("fs");
const childProcess = require('child_process');

function copyDirectorySync(src, dest){
	if(!fs.existsSync(src)){return false;}
	if(!fs.existsSync(dest)){fs.mkdirSync(dest);}
	fs.readdirSync(src).forEach(function(filename){
		var stat = fs.statSync(src+"/"+filename);
		if(stat.isFile()){
			fs.copyFileSync(src+"/"+filename, dest+"/"+filename);
		}
		else if(stat.isDirectory()){
			copyDirectorySync(src+"/"+filename, dest+"/"+filename);
		}
	});
}
var frameworkConfigString = fs.readFileSync(__dirname+"/build_config.json");
try{var config = JSON.parse(frameworkConfigString);}
catch(e){
	console.log(e);
	process.exit();
}
var startTime = new Date().getTime();
console.log("Starting Aurora Builder");

var dependencyTree = {};
var buildScriptCalls = {};
config.plugins.forEach(function(pluginDir){
	fs.readdirSync(pluginDir).forEach(function(pluginName){
		if(pluginName.endsWith("disabled")){return;}
		try{var pluginConfigStr = fs.readFileSync(pluginDir+"/"+pluginName+"/build_config.json").toString();}catch(e){var pluginConfigStr = "{}";}
		try{var pluginConfig = JSON.parse(pluginConfigStr);}catch(e){var pluginConfig = {};}
		dependencyTree[pluginName] = [];
		if(pluginConfig.dependencies){
			pluginConfig.dependencies.forEach(function(dependency){
				dependencyTree[pluginName].push(dependency);
			});
		}
		if(buildScriptCalls[pluginName]===undefined){buildScriptCalls[pluginName] = {name: pluginName,scripts:[]};}
		fs.readdirSync(pluginDir+"/"+pluginName).forEach(function(pluginFileName){
			if(pluginFileName.endsWith("build.js")){
				buildScriptCalls[pluginName].scripts.push(function(doneCb){
					console.log("Building "+pluginName);
					var child = childProcess.fork(pluginDir+"/"+pluginName+"/"+pluginFileName, [pluginConfigStr, __dirname], {silent:true}).on('exit', function (code) {
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
processQueue(orderedScripts, function(){
	config.output = config.output || "output";
	if(!fs.existsSync(config.output)){
		fs.mkdirSync(config.output);
	}
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
					fs.readdirSync(pluginDir+"/"+pluginName).forEach(function(pluginFileName){
						var stat = fs.statSync(pluginDir+"/"+pluginName+"/"+pluginFileName);
						copyDirectorySync(pluginDir+"/"+pluginName+"/resources", config.output+"/resources");
						if(stat.isFile()){
							if(pluginFileName==="config.json"){
								pluginConfigs[pluginName] = JSON.parse(fs.readFileSync(pluginDir+"/"+pluginName+"/"+pluginFileName).toString());
							}
							var match = pluginFileName.match(searchExpStr);
							if(match!==null){
								buildTargets[target.filename].sources.push(pluginDir+"/"+pluginName+"/"+pluginFileName);
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
	Object.values(buildTargets).forEach(function(target){
		if(target.compiled===true){
			/*
				angularPass	false	Generate $inject properties for AngularJS for functions annotated with @ngInject
				applyInputSourceMaps	true	Compose input source maps into output source map
				assumeFunctionWrapper	false	Enable additional optimizations based on the assumption that the output will be wrapped with a function wrapper. This flag is used to indicate that "global" declarations will not actually be global but instead isolated to the compilation unit. This enables additional optimizations.
				checksOnly	false	Don't generate output. Run checks, but no optimization passes.
				compilationLevel	SIMPLE	Specifies the compilation level to use.
				Options: WHITESPACE_ONLY, SIMPLE, ADVANCED
				dartPass	false	
				defines	null	Overrides the value of variables annotated with @define, an object mapping names to primitive types
				env	BROWSER	Determines the set of builtin externs to load.
				Options: BROWSER, CUSTOM
				exportLocalPropertyDefinitions	false	
				generateExports	false	Generates export code for those marked with @export.
				languaqgeIn	ES6	Sets what language spec that input sources conform to.
				languageOut	ES5	Sets what language spec the output should conform to.
				newTypeInf	false	Checks for type errors using the new type inference algorithm.
				outputWrapper	null	Interpolate output into this string, replacing the token %output%
				polymerVersion	null	Specify the Polymer version pass to use.
				preserveTypeAnnotations	false	
				processCommonJsModules	false	Process CommonJS modules to a concatenable form, i.e., support require statements.
				renamePrefixNamespace		Specifies the name of an object that will be used to store all non-extern globals.
				rewritePolyfills	true	Rewrite ES6 library calls to use polyfills provided by the compiler's runtime.
				useTypesForOptimization	false	Enable or disable the optimizations based on available type information. Inaccurate type annotations may result in incorrect results.
				warningLevel	DEFAULT	Specifies the warning level to use.
				Options: QUIET, DEFAULT, VERBOSE
				jsCode	[]	Specifies the source code to compile.
				externs	[]	Additional externs to use for this compile.
				createSourceMap	false	Generates a source map mapping the generated source file back to its original sources.
			*/
			const compile = require('google-closure-compiler-js').compile;
			target.compilationLevel = target.compilationLevel || "SIMPLE";
			const flags = {
				jsCode: target.sources.map(function(p){
					return {src: fs.readFileSync(p).toString()};
				}),
				compilationLevel: target.compilationLevel,
				languageIn		  :	 "ECMASCRIPT6",
				languageOut		  : "ECMASCRIPT6",
				warningLevel	  : "QUIET"					//QUIET, DEFAULT, VERBOSE
			};
			if(target.browser){
				flags.env = "BROWSER";
			}
			if(target.sourceMap){
				flags.createSourceMap = true;
			}
			
			console.log("Compiling "+target.filename);
			const out = compile(flags);
			if(out.warnings.length>0){
				console.warn("Warnings");
				out.warnings.forEach(function(w){
					console.warn(w);
				});
			}
			if(out.errors.length>0){
				console.error("Errors");
				out.errors.forEach(function(w){
					console.log(w);
				});
				process.exit();
			}
			else{
				console.log("Compilation Successful");
				fs.writeFileSync(config.output + "/" + target.filename, out.compiledCode);
			}
		}
		else{
			fs.writeFileSync(config.output+"/"+target.filename, "");
			target.sources.forEach(function(sourceFile){
				fs.appendFileSync(config.output+"/"+target.filename, fs.readFileSync(sourceFile));
				fs.appendFileSync(config.output+"/"+target.filename, "\n");
			});
		}
	});
	console.log("Build took "+(new Date().getTime()-startTime)+"ms");
});