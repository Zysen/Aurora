var ARRAYS = (function(arrays){
	arrays.arrayCut = function(array, index) {
	    array.splice(index,1); 
	};
	arrays.max = function( array ){
	    return Math.max.apply( Math, array );
	};
	arrays.min = function( array ){
	    return Math.min.apply( Math, array );
	};
	arrays.arrayContains = function(array, search, strictType){
	    return arrays.arrayIndexOf(array, search, strictType) > -1; 
	};
	arrays.contains = arrays.arrayContains;
	arrays.arrayIndexOf = function(arr, needle, strictType) {
	    if(arr!==undefined){
            for(var i = 0; i < arr.length; i++) {
            	
            	if(strictType === false){
            		if(arr[i] == needle) {
                        return i;
                    }
            	}else{
            		if(arr[i] === needle) {
                        return i;
                    }
            	}
                
        }
        }
        return -1;
    };
    arrays.indexOf = arrays.arrayIndexOf;
    arrays.reverseIndexOf = function(arr, needle, start) {
        start = start === undefined ? arr.length - 1: start;
        for(var i =  start ; i >= 0; i--) {
                if(arr[i] === needle) {
                    return i;
                }
            
        }
        return -1;
    };
    arrays.remove = function(arr, val, useStrict){
    	var pos = arrays.arrayIndexOf(arr, val, useStrict==undefined?true:useStrict);
    	if(pos>=0){
    		arr.splice(pos, 1);
    	}
    };
    
    
    Uint8Array.prototype.concat = function(){
        var length = this.length;
        var args = arguments;
        if(arguments.length===1 && (arguments[0] instanceof Array)){
            args = arguments[0];
        }
        for(var index in args){
            length+=args[index].length;
        }
        var newArray = new Uint8Array(length);
        //LOG.create("new Array length: "+length);
        newArray.set(this, 0);
        var offset = this.length;
        for(var index in args){
           // LOG.create(args[index]);
            newArray.set(args[index], offset);
            offset+=args[index].length;
        }
        //LOG.create(newArray);
        return newArray;
    }
	return arrays;
})(ARRAYS || {});


