var OBJECT = (function(obj){
	obj.clone = function(source){
		if(source instanceof Array) {
	        var copy = [];
	        for (var i = 0; i < source.length; i++) {
	            copy[i] = obj.clone(source[i]);
	        }
	        return copy;
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
	
	
	return obj;
})(OBJECT || {});
