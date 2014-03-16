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
    arrays.remove = function(arr, val, useStrict){
    	var pos = arrays.arrayIndexOf(arr, val, useStrict==undefined?true:useStrict);
    	if(pos>=0){
    		arr.splice(pos, 1);
    	}
    };
	return arrays;
})(ARRAYS || {});


