//goog['provide']('F');
//goog['require']("LOG");
goog['require']("LOG");
goog['require']("F");
//goog['require']("SIGNALS");
  /**
 * @param {Function|F.Behavior} fn
 * @param {Function|F.Behavior} fu
 * @param {...F.Behavior} var_args
 * @returns !F.Behavior            
 */
F.liftBI = function (fn, functionUp) {
   // showObj(var_args);
    var args = Array.prototype.slice.call(arguments, 2);
  
    for(var index in args){
        if(args[index]===undefined){
            LOG.create("Error - liftBI was passed a behaviour that is undefined");
            throw "Error - liftBI was passed a behaviour that is undefined";
        }
    }
  
  //dependencies
  var constituentsE = F.map(function (b) { return b.changes(); }, F.filter(function (v) { return v instanceof F.Behavior; }, F.mkArray(arguments)));
  
  //calculate new vals
  var getCur = function (v) {
    return v instanceof F.Behavior ? v.last : v;
  };
  
  var getRes = function () {
    return getCur(fn).apply(null, F.map(getCur, args));
  };

  if(constituentsE.length === 1) {
    return new F.Behavior(constituentsE[0],getRes(),getRes, functionUp, args);
  }
    
  //gen/send vals @ appropriate time
  var prevStamp = -1;
  var mid = new F.EventStream(constituentsE, function (p) {
    if (p.stamp != prevStamp) {
      prevStamp = p.stamp;
      return p; 
    }
    else {
      return F.doNotPropagate;
    }
  });
  
  return new F.Behavior(mid,getRes(),getRes, functionUp, args);
};     



F.EventStream.prototype.filterUndefinedE = function(){
	return this.filterE(function(value){
		return this.value!=undefined;
	});
};

F.EventStream.prototype.workerE = function (filename) {
	var worker = new Worker(filename);

	var workerMessageE = flapjax.receiverE();
	worker.onmessage = function(e) {
		workerMessageE.sendEvent(e.data);
	};
	worker.onerror = function(e) {
		workerMessageE.sendEvent(SIGNALS.newError("Error in file: "+e.filename+"nline: "+e.lineno+"nDescription: "+e.message));
	};
	this.mapE(function(message){
		worker.postMessage(message);
	});
	return workerMessageE;
};

/**
 * Checks if the passed in arguments are not errored etc.
 * If no arguments are passed it checks the caller's arguments
 * @returns {Boolean}
 */
good = function(){	
	var args = Array.prototype.slice.call(arguments);
	if(args.length === 0){
		args = Array.prototype.slice.call(arguments.callee.caller.arguments);
	}
    for(var index in args){
    	var arg = args[index];
        if(args[index]===SIGNALS.NOT_READY || args[index] instanceof SIGNALS.ERROR || args[index]===SIGNALS.NOT_LICENSED || args[index]===SIGNALS.PERMISSION_ERROR || args[index]===SIGNALS.SESSION_EXPIRED){
            return false;
    	}
    }
    return true;
}

chooseSignal = function(){
	var args = Array.prototype.slice.call(arguments);
	if(args.length === 0){
		args = Array.prototype.slice.call(arguments.callee.caller.arguments);
	}
	var licensing = 0, permission=0, expired=0, ready=0;
	var error = undefined;
	for(var index in args){
        if(args[index] instanceof SIGNALS.ERROR){
        	error = args[index];

        }
        else if(args[index]==SIGNALS.NOT_LICENSED){
        	licensing++;
        }
        else if(args[index]==SIGNALS.PERMISSION_ERROR){
        	permission++;
        }
        else if(args[index]==SIGNALS.SESSION_EXPIRED){
        	expired++;
        }
        else if(args[index]==SIGNALS.NOT_READY){
        	ready++;
        }
    }
	if(error !== undefined){
		return error;
	}
	else if(permission>0){
    	return SIGNALS.PERMISSION_ERROR;
    }
    else if(licensing>0){
    	return SIGNALS.NOT_LICENSED;
    }
    else if(expired>0){
    	return SIGNALS.SESSION_EXPIRED;
    }
    else if(ready>0){
    	return SIGNALS.NOT_READY;
    }
}

/**
 * Event stream that collects up x amount of values.
 * @returns Event containing an array of values.
 */ 
F.EventStream.prototype.windowedQueueE = function(max_length){
	return this.collectE([], function(new_object, existing_array) { 
		var output = new Array();
		var length = (existing_array.length <= (max_length - 1)) ? existing_array.length : (max_length - 1);
		if(length > 0){
			for(var i=length; i > 0; i--){
				output[i] = existing_array[i-1];
			}
		}
		output[0] = new_object;
		return output; 
	});
};

/**
 * Behavior that checks less than x
 */
F.Behavior.prototype.ltB = function(val2){
	return this.liftB(function(value){
		if(!good()){return value;}
		return value<val2;
	});
};
/**
 * Behavior that checks less than or equal to x
 */
F.Behavior.prototype.lteB = function(val2){
	return this.liftB(function(value){
		if(!good()){return value;}
		return value<=val2;
	});
};

/**
 * Behavior that checks greater than than x
 */
F.Behavior.prototype.gtB = function(val2){
	return this.liftB(function(value){
		if(!good()){return value;}
		return value>val2;
	});
};

/**
 * EventStream that checks greater than than or equal to x
 */
F.Behavior.prototype.gteB = function(val2){
	return this.liftB(function(value){
		if(!good()){return value;}
		return value>=val2;
	});
};


/**
 * EventStream that checks less than x
 */
F.EventStream.prototype.ltE = function(val2){
	return this.mapE(function(value){
		return value<val2;
	});
};
/**
 * EventStream that checks less than or equal to x
 */
F.EventStream.prototype.lteE = function(val2){
	return this.mapE(function(value){
		return value<=val2;
	});
};

/**
 * EventStream that checks greater than than x
 */
F.EventStream.prototype.gtE = function(val2){
	return this.mapE(function(value){
		return value>val2;
	});
};

/**
 * EventStream that checks greater than than or equal to x
 */
F.EventStream.prototype.gteE = function(val2){
	return this.mapE(function(value){
		return value>=val2;
	});
};

/**
 * EventStream that checks object equality
 */
F.EventStream.prototype.equalsE = function(object2){
	return this.mapE(function(value){
		if(!good()){
			return value;
		}
		return OBJECT.equals(value,object2);
	});
};

/**
 * Behaviour that checks object equality
 */
F.Behavior.prototype.equalsB = function(object2){
	return this.liftB(function(value){
		if(!good()){
			return value;
		}
		return OBJECT.equals(value,object2);
	});
};

/**
 * EventStream that extracts an objects property
 */
F.EventStream.prototype.propertyE = function(propertyName){
	return this.filterE(function(value){
		return value[propertyName]!==undefined;
	}).mapE(function(value){
		return value[propertyName];
	});
};

/**
 * Behaviour that extracts an objects property
 */
F.Behavior.prototype.propertyB = function(propertyName){
	return this.liftB(function(value){
		if(!good(value)){
			return value;
		}

		if(value[propertyName]===undefined){
			console.log("Behaviour.propertyB error: No such property "+propertyName);
			console.log(value);
			console.log(propertyName);
			console.log(value[propertyName]);
			return SIGNALS.ERROR();
		}

		return value[propertyName];
	});
};


/**
 * Behaviour that contains the behavior's last value 
 */
F.Behavior.prototype.previousValueB = function(){
	var last = undefined;
	return this.liftB(function(value){
		
		var temp_in = OBJECT.clone(value);
		var temp_out = last;
		
		last = temp_in;
		return temp_out;
	});
};

/**
 * Filters out any error signals from data.
 * Initial value is SIGNALS.NOT_READY so downwards nodes still need to check for this initial SIGNALS.NOT_READY signal.
 * @returns
 */
F.Behavior.prototype.filterNotGoodB = function(){
	return F.mergeE(F.oneE(this.valueNow()), this.changes()).filterE(function(value){
		return good();
	}).startsWith(SIGNALS.NOT_READY);
};

/**
 * Filters out any error signals from data, except for errors that are from SET operations.
 * Initial value is SIGNALS.NOT_READY so downwards nodes still need to check for this initial SIGNALS.NOT_READY signal.
 * @returns
 */
F.Behavior.prototype.filterNotGoodExceptSetErrorsB = function(){
	return F.mergeE(F.oneE(this.valueNow()), this.changes()).filterE(function(value){
		return SIGNALS.isSetErrored(value) || good();
	}).startsWith(SIGNALS.NOT_READY);
};

F.EventStream.prototype.filterDomDescendantsE = function(){
	var searchStrings = arguments;
	var recursiveSearch = function(element){
		for(var index in searchStrings){
			if(element.id==searchStrings[index]){
				return false;
			}
		}
		if(element.parentNode==undefined){
			return true;
		}
		return recursiveSearch(element.parentNode);
	}
	return this.filterE(function(element){
		return recursiveSearch(element);
	});
};
F.EventStream.prototype.filterDomDescendantsWithClassE = function(){
	var searchStrings = arguments;
	var recursiveSearch = function(element){
		for(var index in searchStrings){
			if((" "+element.className+" ").contains(" "+searchStrings[index]+" ")){
				return false;
			}
		}
		if(element.parentNode==undefined){
			return true;
		}
		return recursiveSearch(element.parentNode);
	}
	return this.filterE(function(element){
		return recursiveSearch(element);
	});
};

F.EventStream.prototype.previousValueE = function(){
	var lastValue = undefined;
	return this.mapE(function(event) {
		var last = lastValue;
		lastValue = event;
		return last;
	});
};

F.EventStream.prototype.filterFalseE = function(){
	return this.filterE(function(value) {
		return value !== false;
	});
};

F.EventStream.prototype.filterTrueE = function(){
	return this.filterE(function(value) {
		return value !== true;
	});
};

F.EventStream.prototype.filterNotGoodE = function(){
	return this.filterE(function(value) {
		return good();
	});
};


F.EventStream.prototype.filterArrayE = function(){
    return this.filterE(function(event) {
        return !(event instanceof Array);
    });
};
F.EventStream.prototype.filterNotArrayE = function(){
    return this.filterE(function(event) {
        return (event instanceof Array);
    });
};


F.EventStream.prototype.filterCheckedTargetE = function(){
	return this.filterE(function(event) {
		return !event.target.checked;
	});
};
F.EventStream.prototype.filterUncheckedTargetE = function(){
	return this.filterE(function(event) {
		return event.target.checked;
	});
};
F.EventStream.prototype.filterTypeE = function(type){
	return this.filterE(function(value) {
		return typeof(value)!==type;
	});
};
F.EventStream.prototype.filterUndefinedE = function(){
	return this.filterE(function(value) {
		return value!=undefined;
	});
};

F.EventStream.prototype.targetIdE = function(){
	return this.mapE(function(event){
		return event.target.id;
	});
};

F.EventStream.prototype.strReplaceE = function(search, replace){
	return this.mapE(function(str){
		return str.replace(search, replace);
	});
};

F.EventStream.prototype.parseIntE = function(){
	return this.mapE(function(str){
		return parseInt(str);
	});
};
F.EventStream.prototype.addE = function(num2){
	return this.mapE(function(num1){
		return num1+num2;
	});
};
F.EventStream.prototype.subtractE = function(num2){
	return this.mapE(function(num1){
		return num1-num2;
	});
};
F.EventStream.prototype.multiplyE = function(num2){
	return this.mapE(function(num1){
		return num1*num2;
	});
};
F.EventStream.prototype.divideE = function(num2){
	return this.mapE(function(num1){
		return num1/num2;
	});
};

F.EventStream.prototype.parseJSONResponseE = function(){
	return this.mapE(function(response){
		return JSON.parse(response.message);
	});
};

F.EventStream.prototype.eventTargetE = function(){
	return this.mapE(function(event){
		return event.target;
	});
};

F.EventStream.prototype.columnIndexE = function(){
	return this.mapE(function(domElement){
		return jQuery(domElement).index();
	});
};

F.EventStream.prototype.gtFilterE = function(compareVal){
	return this.filterE(function(num){
		return num>compareVal;
	});
};
F.EventStream.prototype.ltFilterE = function(compareVal){
	return this.filterE(function(num){
		return num<compareVal;
	});
};

F.EventStream.prototype.trueE = function(str){
	return this.mapE(function(value){return true;});
};

F.EventStream.prototype.falseE = function(str){
	return this.mapE(function(value){return false;});
};

F.EventStream.prototype.printE = function(str){
	return this.mapE(function(value){
		LOG.create(str);
		LOG.create(value);
		return value;
	});
};
F.EventStream.prototype.print = F.EventStream.prototype.printE;



F.Behavior.prototype.filterUndefinedB = function(){	//This is bad
	return this.liftB(function(value) {
		if(value===undefined){
			return SIGNALS.NOT_READY;
		}
		return value;
	});
};

F.Behavior.prototype.printB = function(tag){
    return this.liftB(function(val){
    	LOG.create(tag);
        LOG.create(val);
        return val;
    });
};
F.Behavior.prototype.print = F.Behavior.prototype.printB;

F.EventStream.prototype.undefinedE = function(){
	return this.mapE(function(){return undefined});
};
F.Behavior.prototype.onceB = function(){
	return F.liftB(function(value){
		return value;
	}, this).changes().onceE();
};

F.EventStream.prototype.windowedQueueE = function(max_length){
	return this.collectE([], function(new_object, existing_array) {
		var output = new Array();
		var length = (existing_array.length <= (max_length - 1)) ? existing_array.length : (max_length - 1);
		if(length > 0){
			for(var i=length; i > 0; i--){
				output[i] = existing_array[i-1];
			}
		}
		output[0] = new_object;
		return output;
	});
}; 

F.Behavior.prototype.bufferOnBooleanB = function(booleanB){
	return F.liftB(function(packet, scrolling, state){
		if(!good()){
			return F.oneE(chooseSignal());
		}
		state.push(F.oneE(packet));
		if(scrolling){
			return F.zeroE();
		}
		var newSet = F.mergeE.apply(this, state);
		state.length = 0;
		state = [];
		
		return newSet;
	}, this, booleanB, F.constantB([])).changes().switchE().startsWith(SIGNALS.NOT_READY);
};

F.EventStream.prototype.bufferOnBooleanE = function(booleanB){
	var rec = F.receiverE();	
	F.mergeE(booleanB.changes().mapE(function(){}), this).collectE({buffer: []}, function(newVal, state){
		if(newVal!==undefined){
			state.buffer.push(newVal);
		}
		if(booleanB.valueNow()===true){
			for(var index in state.buffer){
				rec.sendEvent(state.buffer[index]);
			}
			return {buffer: []};
		}
		return state;
	});
	return rec;
};

F.Behavior.prototype.filterRepeatsB = function(){
	var initialValue = this.valueNow();
	var initialValueE = initialValue === SIGNALS.NOT_READY ? F.zeroE() : F.oneE(this.valueNow());
	var valueChangedE = this.changes();	
	return F.mergeE(initialValueE, valueChangedE).filterRepeatsE().startsWith(SIGNALS.NOT_READY);
};

F.EventStream.prototype.chunkedCollectE = function(){
    return this.collectE({str:""}, function(update, state){
        state.str+=update.data;
        if (update.end){                     
            try{
                return {str: "", object: JSON.parse(state.str)};
            }
            catch(e){
                LOG.create("Error, during chunked data rebuild " + state.str);
                LOG.create(e);
                return {str: ""};
            }
        }
        
        return {str: state.str};
    }).filterE(function(state){
        return state.object!=undefined;
    }).mapE(function(state){
        return state.object;
    });
};
F.EventStream.prototype.tagE = function(tag){
    return this.mapE(function(value){
        return {tag: tag, value:value};
    });
};

F.Behavior.prototype.domDisplayB = function(domTarget){
	this.liftB(function(display){
		domTarget.style.display = display?'':'none';
	});
};

F.EventStream.prototype.keysE = function(){
	this.mapE(function(o){
		return Object.keys(o);
	});
};

F.Behavior.prototype.keysB = function(){
	this.liftB(function(o){
		return Object.keys(o);
	});
};

F.EventStream.prototype.filterErrors = function(){
	return this.filterE(function(value){
		return !(value instanceof SIGNALS.ERROR);
	});
};

F.EventStream.prototype.toggleE = function(defaultValue){
	defaultValue = defaultValue || false;
	return this.collectE({value: defaultValue}, function(newVal, state){
		return {value: !state.value};
	}).mapE(function(state){
		return state.value;
	});
};


F.EventStream.prototype.filterChangesE = function(optStart) {
  var hadFirst = optStart === undefined ? false : true;
  var prev = optStart;

  return this.filterE(function (v) {
    if(typeof(v)=='object'){
        if(!OBJECT.equals(v, prev)){
            prev = OBJECT.clone(v);
            return false;
        }
    }
    else if (!hadFirst || prev !== v) {
      hadFirst = true;
      prev = v;
      return false;
    }
    return true;
  });
};
