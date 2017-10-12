var OBJECT = (function(obj){
	
	obj.safeSet = function(){
		if(arguments.length<2){
			LOG.log("ERROR SafeSet: Wrong number of arguments "+arguments.length+" "+JSON.stringify(arguments), LOG.ERROR);
			return;
		}
		var ob = arguments[0];
		var path = "";
		if(ob!==undefined){
			for(var index in arguments){
				if(index==0){
					continue;
				}
				var nextEl = arguments[index];
				var lastProp = arguments.length-2==index;
				
				if(lastProp){
					ob[nextEl] = arguments[arguments.length-1];
					break;
				}
				else{
					if(typeof(nextEl)==="string"){
						if(ob[nextEl]!==undefined){
							path+=nextEl;
							ob = ob[nextEl];
						}
						else{
							LOG.log("ERROR SafeSet: PATH does not exist! "+path+" - "+nextEl, LOG.ERROR);
						}
					}
					else{
						LOG.log("ERROR SafeSet: Path argument is not string", LOG.ERROR);
					}
				}
			}
		}
		else{
			LOG.log("ERROR SafeSet: Base argument is undefined", LOG.ERROR);
		}
	};
	
	obj.safeGet = function(){
		if(arguments.length<1){
			LOG.log("ERROR safeGet: Wrong number of arguments "+arguments.length+" "+JSON.stringify(arguments), LOG.ERROR);
			return;
		}
		var ob = arguments[0];
		var path = "";
		if(ob!==undefined){
			for(var index in arguments){
				if(index==0){
					continue;
				}
				var nextEl = arguments[index];
				var lastProp = arguments.length-1==index;
				
				if(lastProp){
					return arguments[arguments.length-1];
				}
				else{
					if(typeof(nextEl)==="string"){
						if(ob[nextEl]!==undefined){
							path+=nextEl;
							ob = ob[nextEl];
						}
						else{
							LOG.log("ERROR safeGet: PATH does not exist! "+path+" - "+nextEl, LOG.ERROR);
						}
					}
					else{
						LOG.log("ERROR safeGet: Path argument is not string", LOG.ERROR);
					}
				}
			}
		}
		else{
			LOG.log("ERROR safeGet: Base argument is undefined", LOG.ERROR);
		}
	};
	
	obj.clone2 = function(source){
		if(source===undefined){
			return undefined;
		}
		if(source===null){
			return null;
		}
		if(source instanceof Array) {
	        var copy = [];
	        for (var i = 0; i < source.length; i++) {
	            copy[i] = obj.clone(source[i]);
	        }
	        return copy;
	    }
		else if(typeof(source) === 'function'){
	    	return source.clone();
	    }
	    else if (source instanceof Object || typeof(source)=="object") {
	       	var copy = {};
	        for (var attr in source) {
	            if (source.hasOwnProperty(attr)){copy[attr] = obj.clone(source[attr])};
	        }
	        return copy;
	    }else if(typeof(source) === 'string'){
	    	return source+"";
	    }else if(typeof(source) === 'number'){
	    	return source+0;
	    }else if(typeof(source) === 'boolean'){
	    	return source;
	    }
	    else if(typeof(source) === 'undefined'){
	    	return undefined;
	    }
	    else{
	    	LOG.create("Error during clone, unable to clone data with type "+typeof(source));
	    }
	};
	
	
	obj.clone = function(source){
		if(source===undefined){
			return undefined;
		}
		if(source===null){
			return null;
		}
		if(typeof(jQuery)==='undefined'){
			return obj.clone2(source);
		}
		if(source instanceof Array) {
	        var copy = [];
	        for (var i = 0; i < source.length; i++) {
	            copy[i] = clone(source[i]);
	        }
	        return copy;
	    }else if(typeof(source) === 'string'){
	    	return source;
	    }else if(typeof(source) === 'number'){
	    	return source;
	    }else if(typeof(source) === 'boolean'){
	    	return source;
	    }
	   
	   return jQuery.extend(true, {}, source);
	};
	
	obj.delete = function(parentObj, key){
		if(parentObj==undefined){
			LOG.create("Object Remove was passed an undefined object with key "+key);
			return;
		}
		if (isNaN(parseInt(key)) || !(parentObj instanceof Array)){	
			parentObj[key] = undefined;
			delete parentObj[key];
		}
		else{
			parentObj.splice(parseInt(key), 1);
		}
		return parentObj;
	};
	obj.remove = obj.delete;
	obj.extend = function(sourceObject){
	    if(sourceObject===undefined){
	        LOG.create("TypeError: OBJECT.extend sink object (first argument) is undefined. Using empty object.");
	        sourceObject = {};
	    }
	    Array.prototype.slice.call(arguments, 1).forEach(function(source) {
	        if (source) {
	            for (var prop in source) {
	                if (source[prop] && source[prop].constructor === sourceObject) {
	                    if (!sourceObject[prop] || sourceObject[prop].constructor === sourceObject) {
	                        sourceObject[prop] = sourceObject[prop] || {};
	                        obj.extend(sourceObject[prop], source[prop]);
	                    } else {
	                        sourceObject[prop] = source[prop];
	                    }
	                } else {
	                    sourceObject[prop] = source[prop];
	                }
	            }
	        }
	    });
	    return sourceObject;
	};
	
	obj.toString = function(sourceObject){
		return JSON.stringify(sourceObject);		
	};
	
	obj.equals = function(x, y, debug){
		debug = debug || false;
		// Check for NaN value
		if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
			return true;
		}

		// Compare primitives and functions.
		if (x === y) {
	        return true;
	    }
		
		// Check prototypes
	    if (!(x instanceof Object && y instanceof Object)) {
	    	if(debug){console.debug("!(x instanceof Object && y instanceof Object)");}
	        return false;
	    }

	    if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
	    	if(debug){console.debug("x.isPrototypeOf(y) || y.isPrototypeOf(x)");}
	        return false;
	    }

	    if (x.constructor !== y.constructor) {
	    	if(debug){console.debug("x.constructor !== y.constructor");}
	        return false;
	    }

	    if (x.prototype !== y.prototype) {
	    	if(debug){console.debug("x.prototype !== y.prototype");}
	        return false;
	    }

	    if (moment && moment.isMoment(x) && moment.isMoment(y)) {
	    	return x.valueOf() === y.valueOf() && x.utcOffset() === y.utcOffset();
		}
		// Quick property check y subset of x
		var p;
		for (p in y) {
	        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
	        	if(debug){console.debug(p, "y.hasOwnProperty(p)!==x.hasOwnProperty(p)");}
	            return false;
	        }
	        else if (typeof y[p] !== typeof x[p]) {
	        	if(debug){console.debug(p, "typeof y[p]!==typeof x[p]");}
	            return false;
	        }
	    }
		
		// Full check
		for (p in x) {
	        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
	        	if(debug){console.debug(p,"y.hasOwnProperty(p) !== x.hasOwnProperty(p)");}
	            return false;
	        }
	        else if (typeof y[p] !== typeof x[p]) {
	        	if(debug){console.debug(p, "typeof y[p] !== typeof x[p]");}
	            return false;
	        }

	        switch (typeof (x[p])) {
	            case 'object':
	            case 'function':
	                if (!OBJECT.equals(x[p], y[p], debug)) {
	                	if(debug){
	                		console.debug("OBJECT.equals fail", p, x[p], y[p]);
	                	}
	                    return false;
	                }
	                break;
	            default:
	                if (x[p] !== y[p]) {
	                	if(debug){console.debug("x[p] !== y[p]");}
	                    return false;
	                }
	                break;
	        }
	    }

	    return true;
	};

	
	/*
	obj.equals = function(ob1, ob2, debug){
		debug === undefined ? false : debug;
	    if(typeof(ob1)=='undefined'||typeof(ob2)=='undefined'){
	        return (typeof(ob1)=='undefined'&&typeof(ob2)=='undefined');
	    }
	
	
	  var p;
	  for(p in ob1) {
	      if(typeof(ob2)=='undefined'||typeof(ob2[p])=='undefined') {return false;}
	  }
	
	  for(p in ob1) {
	      if (ob1[p]) {
	          switch(typeof(ob1[p])) {
	              case 'object':
	                  if (!obj.equals(ob1[p], ob2[p])) {return false; } break;
	              case 'function':
	                  if (typeof(ob2)=='undefined' || typeof(ob2[p])=='undefined' ||
	                      (p != 'equals' && ob1[p].toString() != ob2[p].toString()))
	                      return false;
	                  break;
	              default:
	                  if (ob1[p] != ob2[p]) {
	                  	return false;
	                  }
	          }
	      } else {
	          if (ob2[p]){
	              return false;
	          }
	      }
	  }
	
	  for(p in ob2) {
	      if(typeof(ob1)=='undefined'||typeof(ob1[p])=='undefined') {
	      	return false;
	      	}
	  }
	  return true;
	};
	*/
	
	obj.sortKeys = function(ob){
		if(ob instanceof Array){
			console.log("Object Sort, argument is an array");
			return ob;
		}
		if(typeof(ob)!=="object"){
			console.log("Object Sort, argument is not an object");
			return ob;
		}
		var newOb = {};
		var orderedKeys = Object.keys(ob).sort();
		for(var index in orderedKeys){
			newOb = ob[orderedKeys[index]];
		}
		return newOb;
	};
	
	obj.asArray = function(ob, field){
		if(ob instanceof Array){
			console.log("Object Sort, argument is an array");
			return ob;
		}
		if(typeof(ob)!=="object"){
			console.log("Object Sort, argument is not an object");
			return ob;
		}
		var newOb = [];
		for(var index in ob){
			newOb.push(ob[index]);
		}
		return newOb;
	};
	

	/**
	 * Gets the key from an object, given a value.
	 */
	obj.findKeyByValue = function( obj, value ) {
		for( var prop in obj ) {
			if( obj.hasOwnProperty( prop ) ) {
				if( obj[ prop ] === value )
					return prop;
			}
		}
	};
	
	return obj;
})(OBJECT || {});

