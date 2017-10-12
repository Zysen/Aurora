var AURORA = (function(aurora){
	
	aurora.uncaughtExceptionCallbacks = [];		//Any uncaught exception, can be trapped with these callbacks
	aurora.exitCallbacks = [];			//Callbacks that occur during graceful shutdown.
    var onReadyCallbacks = [];
    aurora.onReady = function(cb){
        onReadyCallbacks.push(cb);
    };
    aurora.ready = function(){
        for(var index in onReadyCallbacks){
            setTimeout(onReadyCallbacks[index], 1);
        }
    };
	aurora.addUncaughtExceptionCallback = function(cb){aurora.uncaughtExceptionCallbacks.push(cb);};
	aurora.addExitCallback = function(cb){aurora.exitCallbacks.push(cb);};
	return aurora;
}(AURORA || {}));