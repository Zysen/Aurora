var BINARY = (function(binary){
	var hexChar = ["0", "1", "2", "3", "4", "5", "6", "7","8", "9", "A", "B", "C", "D", "E", "F"];
	binary.byteToHex = function(b) {
	  return hexChar[(b >> 4) & 0x0f] + hexChar[b & 0x0f];
	};

	binary.byteArrayToHexString = function(b){
		var str = "";
		for(var index in b){
			str+=binary.byteToHex(b[index]);
		}
		return str;
	};
	
	binary.hexStringToByteArray = function (str) {
		var b = [];
		
		for (var i = 0; i < str.length; i+=2) {
			var part = str.substr(i,2);
			b.push(parseInt(part,16));
		}
		return b;
	}

	binary.littleEndian = true;
	binary.toFloat64ArrayBuffer = function(data){
		if(typeof(data) === 'number'){
			data = [data];
		}
		var ab = new ArrayBuffer(data.length*8);
		var dv = new DataView(ab);
		for(var index in data){
			dv.setFloat64(index*8, data[index], binary.littleEndian);
		}
		return ab;
	};
	
	binary.toUInt32ArrayBuffer = function(data){
		if(typeof(data) === 'number'){
			data = [data];
		}
		var ab = new ArrayBuffer(data.length*4);
		var dv = new DataView(ab);
		for(var index in data){
			dv.setUint32(index*4, data[index], binary.littleEndian);
		}
		return ab;
	};
	
	binary.toUInt16ArrayBuffer = function(data){
		if(typeof(data) === 'number'){
			data = [data];
		}
		var ab = new ArrayBuffer(data.length*2);
		var dv = new DataView(ab);
		for(var index in data){
			dv.setUint16(index*2, data[index], binary.littleEndian);
		}
		return ab;
	};
	
    binary.stringToUInt8ArrayBuffer = function (str) {
        var buf = new ArrayBuffer(str.length); 
        var bufView = new Uint8Array(buf);
        for (var i=0, strLen=str.length; i<strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    };

	binary.toUInt8ArrayBuffer = function(data){
		if(typeof(data) === 'number'){
			data = [data];
		}
		var ab = new ArrayBuffer(data.length);
		var dv = new DataView(ab);
		for(var index in data){
			dv.setUint8(index, data[index], binary.littleEndian);
		}
		return ab;
	};
	
	binary.arrayBufferToString = function(ab){
		// MODIFIED TO REDUCE CALL STACK SIZE
		// .apply(, <array>) would expand to >= 65536 arguments which is the limit for WebKit
		// c.f. https://bugs.webkit.org/show_bug.cgi?id=80797
		var result = "";
		var source = new Uint8Array(ab);
		for (var i = 0; i < source.length; i++) {
			result += String.fromCharCode(source[i]);
		}
		return result;
	};
	
	binary.arrayBufferToObject = function(ab){
		try {
			return JSON.parse(binary.arrayBufferToString(ab));
		} catch (err) {
			console.error("Unable to JSON parse buffer! Have you mixed up getObjectChannelE/requestObjectB?");
		}
	};
	
	return binary;
}(BINARY || {}));
