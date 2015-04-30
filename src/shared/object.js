var OBJECT = (function(obj){
	
	Function.prototype.clone = function() {
	    var that = this;
	    var temp = function temporary() { return that.apply(this, arguments); };
	    for(var key in this) {
	        if (this.hasOwnProperty(key)) {
	            temp[key] = this[key];
	        }
	    }
	    return temp;
	};
	
	obj.clone = function(source){
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
	
	/*
	function objectEquals(x, y)
	{
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
	        return false;
	    }

	    if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
	        return false;
	    }

	    if (x.constructor !== y.constructor) {
	        return false;
	    }

	    if (x.prototype !== y.prototype) {
	        return false;
	    }
		
		// Quick property check y subset of x
		var p;
		for (p in y) {
	        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
	            return false;
	        }
	        else if (typeof y[p] !== typeof x[p]) {
	            return false;
	        }
	    }
		
		// Full check
		for (p in x) {
	        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
	            return false;
	        }
	        else if (typeof y[p] !== typeof x[p]) {
	            return false;
	        }

	        switch (typeof (x[p])) {
	            case 'object':
	            case 'function':
	                if (!objectEquals(x[p], y[p])) {
	                    return false;
	                }
	                break;
	            default:
	                if (x[p] !== y[p]) {
	                    return false;
	                }
	                break;
	        }
	    }

	    return true;
	}
*/
	
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
		console.log();
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
	
	
	return obj;
})(OBJECT || {});

