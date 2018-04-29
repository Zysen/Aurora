goog.provide("aurora.websocket");

goog.require("aurora.websocket.constants");
goog.require("aurora.websocket.enums");

function convertData(data){
	if(typeof(data)==="string"){
		return {type: aurora.websocket.enums.types.STRING, data: data};
	}
	else if(typeof(data)==="object"){
		if(data instanceof ArrayBuffer || data instanceof Blob){
				return {type: aurora.websocket.enums.types.BINARY, data: data};
		}
		return {type: aurora.websocket.enums.types.OBJECT, data: JSON.stringify(data)};
	}
	else{
		console.error("convertData Unknown type "+typeof(data));
	}
}

function arrayBufferToString(ab){
	return String.fromCharCode.apply(null, new Uint8Array(ab));
}; 

function toUInt16ArrayBuffer(data, littleEndian){
	littleEndian = littleEndian || true;
	if(typeof(data) === 'number'){
		data = [data];
	}
	var ab = new ArrayBuffer(data.length*2);
	var dv = new DataView(ab);
	for(var index in data){
		dv.setUint16(index*2, data[index], littleEndian);
	}
	return ab;
};

var channels = {};
var onReadyCallbacks = [];

/*
	@public
*/
aurora.websocket.onReady = function(cb){
	onReadyCallbacks.push(cb);
};

var connection;
window.addEventListener("load",function(){
	window.WebSocket = window.WebSocket || window.MozWebSocket;
	connection = new WebSocket((location.protocol==="https:"?"wss":"ws")+"://"+window.location.hostname+":"+window.location.port+"/websocket");
	connection.onopen = function () {
		console.log("WS connection established");
		onReadyCallbacks.forEach(function(cb){
			cb();
		});
	};
	connection.onerror = function (error) {
		console.log("WS ERROR");
	};
	connection.onmessage = function (packet) {
		if(packet.data instanceof Blob){
			var reader = new FileReader();
			reader.onload = function() {
				var data = reader.result;
				var header = new Uint16Array(reader.result.slice(0,6));
				var pluginId = header[0];
				var channelId = header[1];
				var type = header[2];
				var channel = channels[pluginId+"_"+channelId];
				if(type===aurora.websocket.enums.types.STRING){
					channel.receive({data: arrayBufferToString(reader.result.slice(6))});
				}
				else if(type===aurora.websocket.enums.types.OBJECT){
					channel.receive({data: JSON.parse(arrayBufferToString(reader.result.slice(6)))});
				}
				else if(type===aurora.websocket.enums.types.BINARY){
					channel.receive({data: reader.result.slice(0,6)});
				}
				else{
					console.error("Websocket Receive: Unknown Type", type);
				}
			};
			reader.readAsArrayBuffer(packet.data);
		}
		else{
			try {
				var m = JSON.parse(packet.data);
				console.log("Internal Channel Message", m);
			} catch (e) {
				console.log("This doesn't look like valid JSON: ",packet.data, e);
				return;
			}
		}
		
	};
}, false);

/**
 * @constructor
 */
function Channel(pluginId, channelId, messageCb) {
	var callbacks = [messageCb];
	connection.send(JSON.stringify({"command": aurora.websocket.enums.COMMANDS.REGISTER, "pluginId": pluginId, "channelId":channelId}));
	this.send = function(sendBuffer){
		var data = convertData(sendBuffer);
		connection.send(new Blob([toUInt16ArrayBuffer([pluginId, channelId, data.type], true), data.data]));
	};
	this.destroy = function(){
		connection.send(JSON.stringify({command: aurora.websocket.enums.COMMANDS.UNREGISTER, pluginId: pluginId, channelId:channelId}));
	}
	this.addCallback = function(cb){
		callbacks.push(cb);
	}
	this.receive = function(data){
		callbacks.forEach(function(cb){
			cb(data);
		});
	}
}

aurora.websocket.getChannel = function(pluginName, channelId, messageCallback){
	var pluginId = aurora.websocket.constants.plugins.indexOf(pluginName);
	if(pluginId<0){
		console.error("websocket.getChannel no plugin called "+pluginName);
		return;
	}
	if(channels[pluginId+"_"+channelId]===undefined){
		channels[pluginId+"_"+channelId] = new Channel(pluginId, channelId, messageCallback)
	}
	else{
		channels[pluginId+"_"+channelId].addCallback(messageCallback);
	}
	return new Channel(pluginId, channelId, messageCallback);
};