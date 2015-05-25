//goog['provide']('LOG');
var LOG = (function(log, aurora) {
	// Constants
	// =========
	
	// Debug flag
	log.DEBUG_MODE = false; // Should default to false. Don't commit change.
	
	// Severity levels
	log.DEBUG = 1;
	log.INFO = 2;
	log.NOTICE = log.INFO;
	log.WARNING = 4;
	log.ERROR = 6;
	log.CRITICAL = 8;
	
	// Flags
	// =====
	/** Determines what gets output to console and log file */
	log.PRODUCTION_VERBOSITY = log.INFO;	// Should default to log.INFO. Don't commit change.
	
	/** Determines what gets output to console while debugging */
	log.DEBUG_VERBOSITY = log.DEBUG;	// Should default to log.DEBUG. Don't commit change.
	log.DEBUG_MODULE = undefined;	// Should default to undefined. Don't commit change.
	
	/** Firefox and Chrome log objects that can be inspected in the console. 
	 * IE doesn't support inspection in the console, it just outputs [object Object].
	 * To get around that set DEBUG_OBJECTS_AS_STRING to true.
	 */
	log.DEBUG_OBJECTS_AS_STRING = false; // Should default to false. Don't commit change.
	
	// Functions
	// =========
		
	/**
	 * Main log function. LOG.log() or shortcut log();
	 * @param data message or object to log
	 * @param severity (optional) the severity of the entry. Defaults to LOG.WARNING.
	 * @param module (optional) key to filter entries. Use LOG.DEBUG_MODULE to filter.
	 * @param errorObject (optional) caught error object, useful for stack traces.
	 */
	log.log = function(data, severity, module, errorObject){
		// Default severity
		severity = severity || LOG.INFO;
		
		// Output to console 
		// If debug mode, check against debug verbosity and debug module. If not debug mode just check verbosity 
		if((LOG.DEBUG_MODE && severity >= LOG.DEBUG_VERBOSITY && (LOG.DEBUG_MODULE === undefined || LOG.DEBUG_MODULE === module))
		|| (!LOG.DEBUG_MODE && severity >= LOG.PRODUCTION_VERBOSITY)){
			
			if (LOG.DEBUG_OBJECTS_AS_STRING && typeof (data) == 'object')
				LOG.toConsole(severity, module ? '(' + module + ')': '', objectToString(data));
			else
				LOG.toConsole(severity, module ? '(' + module + ')': '', data);
			
		}
		
		// Output to file
//		if(severity >= LOG.PRODUCTION_VERBOSITY){
//			// TODO: Create some sort of rolling buffer of log messages stored in local storage.
//		}
		
		// Print stack trace for ERROR and higher
		if(severity >= LOG.ERROR){
			if((typeof printStackTrace !== 'undefined') && (typeof printStackTrace.implementation !== 'undefined')){
				var options = {guess: true};
				if(errorObject){
					options.e = errorObject;
				}
				var trace = printStackTrace(options);
				console.log('TRACE', trace);
			}else if(typeof console.trace !== 'undefined'){
				console.trace('');
			}
		}
	};
	
	log.create = function(message){
		if(message!==undefined && TABLES.UTIL.isTable !==undefined && TABLES.UTIL.isTable(message)){
			TABLES.UTIL.printTable(message);
		}else{
			LOG.log(message);
		}
	};
	
	log.alert = function(data){
		if (typeof (data) == 'object')
			alert(objectToString(data));
		else if (typeof (data) == 'string')
			alert(data);
	};
	
	log.severityToString = function(severity){
		switch(severity){
		case LOG.DEBUG:
			return 'DEBUG';
		case LOG.INFO:
			return 'INFO';
		case LOG.WARNING:
			return 'WARNING';
		case LOG.ERROR:
			return 'ERROR';
		case LOG.CRITICAL:
			return 'CRITICAL';
		}
		
		return 'Unknown Severity'; 
	};
	
	log.toConsole = function(severity, module, data){
		var logged = false;
		switch(severity){
		case LOG.DEBUG:
			if(typeof console.debug === "function"){
				console.debug(LOG.severityToString(severity), module, data);
				logged = true;
			}
			break;
		case LOG.INFO:
			if(typeof console.info === "function"){
				console.info(LOG.severityToString(severity), module, data);
				logged = true;
			}
			break;
		case LOG.WARNING:
			if(typeof console.warn === "function"){
				console.warn(LOG.severityToString(severity), module, data);
				logged = true;
			}
			break;
		case LOG.ERROR:
			if(typeof console.error === "function"){
				console.error(LOG.severityToString(severity), module, data);
				logged = true;
			}
			break;
		case LOG.CRITICAL:
			if(typeof console.error === "function"){
				console.error(LOG.severityToString(severity), module, data);
				logged = true;
			}
			break;
		}
		
		if(!logged){
			console.log(LOG.severityToString(severity), module, data);
		}
	};
	
	log.show = function(){
		// TODO: Display log history.
	};
	
	return log;
})(LOG || {}, AURORA);
