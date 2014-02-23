//goog.provide('SIGNALS');
var SIGNALS = (function(signals) {
	signals.NOT_READY = {};
	signals.SESSION_EXPIRED = {};
	signals.NOT_LICENSED = {};
	signals.ERROR = (function(message, errorNum){this.message = message; this.errorNum = errorNum;});
	signals.PERMISSION_ERROR = {};
	signals.APPLY_STATES = {ERROR: 0, SUCCESS: 1, APPLYING: 2};
	signals.newError = function(message, errorNum){
		return new signals.ERROR(message, errorNum);
	};
	signals.isError = function(signal){
		return signal instanceof signals.ERROR;
	}
	signals.OPERATIONS = {GET: 0, SET: 1};

	signals.isSetErrored = function(){
		var args = Array.prototype.slice.call(arguments);
	    for(var index in args){
	        if(args[index] instanceof signals.ERROR && args[index].operation === OPERATIONS.SET){
	        	return true;
	        }
	    }
	    return false;
	};

	return signals;
})(SIGNALS || {});


var AURORA = (function(aurora, signals){
	if(aurora.ERRORS==undefined){
		aurora.ERRORS = {};
	}
	aurora.ERRORS.UNKNOWN_COMMAND = function(e){return signals.newError("Unknown command. "+e, 1);};
	aurora.ERRORS.DATA_UPDATE_PARSE = function(e){return signals.newError("Unable to parse JSON from data thread. "+e, 2);};
	aurora.ERRORS.WEBSOCKET_SEND = function(e){return signals.newError("Unable to send data to websocket client. "+e, 3);};
	aurora.ERRORS.WEBSOCKET_RECEIVE = function(e){return signals.newError("Unable to parse data received from web socket. "+e, 4);};
	return aurora;
})(AURORA || {}, SIGNALS);
