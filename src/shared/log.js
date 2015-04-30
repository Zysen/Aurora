//goog['provide']('LOG');
var LOG = (function(log, aurora) {
	log.INFO=0;
	log.NOTICE=0;
	log.WARNING=0;
	log.ERROR=0;
	log.create = function(message){
	    try{
    		if(message!==undefined && TABLES.UTIL.isTable(message)){
    		    TABLES.UTIL.printTable(message);
    		}
    		else{
    			console.log(message);
    		}
	   }
	   catch(e){console.log("Log Exception"); console.log(e); console.log(arguments.callee.caller);}
    	
		/*
		var type = typeof(message);
		if(type==="object" || message instanceof Array){
			var entry = type==="object"?"{":"[";
			for(var index in message){
				entry+=index+": "+log.create(message[index])+",\n";
			}
			entry += type==="object"?"}":"]";
		}
		else if(type==="string"||type==="number"){
			return message;
		}
		*/
	};
	return log;
})(LOG || {}, AURORA);
