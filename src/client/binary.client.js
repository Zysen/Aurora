var BINARY = (function(binary){
	
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
		return String.fromCharCode.apply(null, new Uint8Array(ab));
	}; 
	
	binary.arrayBufferToObject = function(ab){
		return JSON.parse(binary.arrayBufferToString(ab));
	}; 
	
	
	return binary;
}(BINARY || {}));
