var AURORA = AURORA || {};

var LOG = (function(log, aurora) {
    var usedModules = {};
    var isServer = (typeof module != 'undefined') && module.exports!=undefined && process!=undefined;	//If Node
	log.enum = {DEBUG:7, INFO: 6, NOTICE: 5, WARN: 4, ERROR: 3, CRITICAL: 2, ALERT: 1, EMERGENCY: 0};			//WARNING!!! These logging levels match SYSLOG. It is preferable not to change them.
	log.enumIndex = [];
	for(var key in log.enum){
		log.enumIndex[log.enum[key]] = key;
	}
	
	log.level = log.enum.INFO;						//Default level
	
	var syslog = undefined;
	if(isServer){
		aurora.onReady(function(){
			try{
				syslog = require('modern-syslog');
				syslog.open(config.logName||"gui");
				aurora.addUncaughtExceptionCallback(function(){
					syslog.close();
				});
				
				aurora.logLevelB.liftB(function(logLevel){
                                    if (logLevel !== null) {
					log.level = logLevel;
                                    }
				});
			        aurora.logB.liftB(
                                    function (v) {
                                        log.overrides = v;
                                    });
			}
			catch(e){syslog = undefined;console.log("ERROR", "Cannot load modern-syslog module", e);};
		});
	}

	var modules = {};
	
	var defaultLog = function() {
	  process.stdout.write(util.format.apply(this, arguments) + '\n');
	};
	
	var processLogEntry = function(functionTest, moduleName, level, args, colour){
	    var minLevel = log.level;
            var hasOverride = false;
            if (log.overrides && log.overrides[moduleName]) {
                var override = log.overrides[moduleName];
                if (typeof(override) === 'string') {
                   if (log.enum.hasOwnProperty(override)) {
                       minLevel = log.enum[override];
                       hasOverride = true;
                   }
                      
                        
                }
                else {
                    minLevel = override;
                    hasOverride = true;
                }
            }
	    functionTest = functionTest || console.log;
	    colour = colour || "\x1b[37m";
		
	    args = Array.prototype.slice.call(args);
	    var levelNum = log.enum[level];
	    if(levelNum<=minLevel){
		if(isServer && syslog!==undefined){
		    var syslogEntry = moduleName.padRight(9, " ");
		    for(var index in args){
			if(typeof(args[index])==="object" && isServer){
			    try{
				args[index] = JSON.stringify(args[index]);
			    }
			    catch(e){
				console.log("LOGGING CLASS", e);
			    }
			}
			syslogEntry+=" "+args[index];
		    }
		    //syslogEntry+="\t"+moment().format('YYYY MMM DD hh:mm:ss.sss');
                    if (levelNum < log.enum.INFO || hasOverride) {
			syslog.log(levelNum, syslogEntry);		//level.padRight(9, " ")+" "+
                    }
		    //2016 Aug 20 13:19:04.552 auth.info MyDevice sshd[1606]:  Received disconnect from 10.16.1.145: 11: disconnected by user
		}
		
		///	colour
		args.unshift(moduleName);
		
		var levelString = "\x1b[0m"+colour+"%s \x1b[0m"+colour;
		
		//Reset formatting codes
		args.unshift(level.padRight(9, " "));
		
		var colourString = "";
		if(isServer){
		    colourString = ""+levelString;
		    for(var index in args){
			colourString+="%s ";	
		    }
		    colourString+="\x1b[0m";
		}
		args.unshift((typeof(moment)==="undefined")?new Date():moment().format('YYYY MMM DD hh:mm:ss.sss'));
		args.unshift(colourString);		//"\x1b[0m %s \x1b[0m"+
		functionTest.apply(console, args);
	    }
	};

	log.createModule = function(moduleName){
            usedModules[moduleName] = true;
		var factory = {};
		factory.debug = function(){
			processLogEntry(console.debug, moduleName, "DEBUG", arguments);
		};
		
		factory.info = function(){
			processLogEntry(console.info, moduleName, "INFO", arguments, "\x1b[32m");
		};
		
		factory.notice = function(){
			processLogEntry(console.info, moduleName, "NOTICE", arguments, "\x1b[36m");
		};
		
		factory.warn = function(){
			processLogEntry(console.warn, moduleName, "WARN", arguments, "\x1b[33m");
		};
		factory.warning = log.warn;
		
		factory.error = function(){
			processLogEntry(console.error, moduleName, "ERROR", arguments, "\x1b[31m");
		};
		factory.err = log.error;
		
		factory.critical = function(){
			processLogEntry(console.error, moduleName, "CRITICAL", arguments, "\x1b[31m");
		};
		
		factory.alert = function(){
			processLogEntry(console.error, moduleName, "ALERT", arguments, "\x1b[1m\x1b[31m");
		};
		
		factory.emergency = function(){
			processLogEntry(console.error, moduleName, "EMERGENCY", minLevel, arguments, "\x1b[1m\x1b[31m");
		};
		
		modules[moduleName] = factory;
		
		return factory;
	};
	
	var systemLog = log.createModule("SYSTEM", log.level);
	for(var index in systemLog){
		log[index] = systemLog[index];
	}
	
	//Legacy Adapters
	log.log  = function(data, severity, module, errorObject){
		var module = (modules[module]!==undefined)?modules[module]:log.createModule(module);
		module.debug(data, errorObject);
	};
	log.create = systemLog.debug;
	log.alert = systemLog.alert;
	
	log.toConsole = function(severity, module, data){
	var module = (modules[module]!==undefined)?modules[module]:log.createModule(module);
		module.debug(data);
	};
    log.usedModules = function () {
        var used = [];

        for (var k in usedModules) {
            var level = null;
            if (log.overrides && log.overrides[k]) {
                level = log.overrides[k];
                if (typeof(level) === 'string') {
                   if (log.enum.hasOwnProperty(level)) {
                       level = log.enum[level];
                   }
                    else {
                        level = null;
                    }
                }
            }
            used.push({name: k, level: level});
        }
        used.sort(function (x, y) {return x.name.localeCompare(y.name);});
        return used;
    };
	return log;
}(LOG || {}, AURORA));
var log = LOG;
