var config = (function(){
	const fs = require("fs");
	const EventEmitter = require('events').EventEmitter;

	var configFilePath = __dirname+"/config.json";
	var pub = JSON.parse(fs.readFileSync(configFilePath).toString());
	pub.configE = new EventEmitter();
	var lastConfig = JSON.parse(fs.readFileSync(configFilePath).toString());
	
	fs.watchFile(configFilePath, {interval: 500}, function(curr, prev){
		fs.readFile(configFilePath, function(err, configFile){
			var newConfig = JSON.parse(configFile.toString());
			for(var index in newConfig){
				pub[index] = newConfig[index];
			}
			OBJECT.deepDiff(lastConfig, newConfig).forEach(function(diff){
				console.log("Config Change "+diff.path.join("/"));
				pub.configE.emit(diff.path.join("/"), diff, true);
			});
			lastConfig = newConfig;
		});
	});
	return pub;
}());