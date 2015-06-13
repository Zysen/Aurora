var BINARY = (function(binary){

	binary.bufferToObject = function(buf){
		console.log(buf);
		var str = buf.toString("utf8");
		console.log("|"+str+"|");
		return JSON.parse(str);
	};
	
	
	return binary;
}(BINARY || {}));
