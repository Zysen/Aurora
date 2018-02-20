(function(){
	var WebSocketServer = require('websocket').server;
	var fs = require("fs");
	var crypto = require("crypto");
	
	var httpServersE = HTTP.getServersE();
	
	var types = {
		BINARY: 0,
		STRING: 1,
		OBJECT: 2
	};
	
	var COMMANDS = {
		REGISTER: 0,
		UNREGISTER: 1,
	};
	
	function convertData(data){
		if(typeof(data)==="string"){
			return {type: types.STRING, data: new Buffer(data)};
		}
		else if(typeof(data)==="object"){
			if(Buffer.isBuffer(data)){
					return {type: types.BINARY, data: data};
			}
			return {type: types.OBJECT, data: new Buffer(JSON.stringify(data))};
		}
		else{
			console.error("convertData Unknown type "+typeof(data));
		}
	}
	
	var channels = {};
	var channelsByClientId = {};	
	function onMessage(connection, message) {
		if (message.type === 'utf8') {
			try{
				var m = JSON.parse(message.utf8Data);
				switch(m.command){
					case COMMANDS.REGISTER:
						var channelKey = m.pluginId+"_"+m.channelId;
						channels[channelKey].register(connection.id, connection);
						if(channelsByClientId[connection.id]===undefined){
							channelsByClientId[connection.id] = {};
						}
						channelsByClientId[connection.id][channelKey] = channels[channelKey];
					break;
					case COMMANDS.UNREGISTER:
						channels[m.pluginId+"_"+m.channelId].unregister(connection.id);
					break;
					default:
						console.log("Unknown Command", m.command, m);
					break;
				}
			}
			catch(e){console.log(e);}
		}
		else if(message.type === 'binary'){
			var pluginId = message.binaryData.readUInt16LE(0);
			var channelId = message.binaryData.readUInt16LE(2);
			var type = message.binaryData.readUInt16LE(4);
			var payload = message.binaryData.slice(6);
			
			if(type===types.STRING){
				payload = payload.toString();
			}
			else if(type===types.OBJECT){
				payload = JSON.parse(payload.toString());
			}
			else if(type!==types.binary){
				console.error("Websocket Unknown Type "+type);
				return;
			}
			//console.log("WS ", pluginId, channelId, type, payload);
			channels[pluginId+"_"+channelId].receive({clientId: connection.id, data: payload});
		}
	}

	function getUniqueClientId(clients, doneCb){
		var id = crypto.randomBytes(8).toString("hex");
		if(clients[id]===undefined){
			clients[id] = {};
			doneCb(id);
		}
		else{
			setTimeout(function(){
				getUniqueClientId(clients, doneCb);
			},1);
		}
	}
	
	function onClose(connection, closeReason, description) {
		console.log("Websocket Connection Closed.", connection.id);
		if(channelsByClientId[connection.id]){
			for(var key in channelsByClientId[connection.id]){
				channelsByClientId[connection.id][key].unregister(connection.id);
			}
			delete channelsByClientId[connection.id];
		}
	}
	
	
	function Channel(pluginId, channelId, messageCb) {
		var clientRegistration = {};
		var callbacks = [messageCb];
		
		var channelHeader = new Buffer(4);
		channelHeader.writeUInt16LE(pluginId, 0);
		channelHeader.writeUInt16LE(channelId, 2);
		
		this.register = function(clientId, connection){
			clientRegistration[clientId] = connection;
		};
		this.unregister = function(clientId){
			delete clientRegistration[clientId];
		};
		this.addCallback = function(messageCb2){
			callbacks.push(messageCb2);
		};
		this.receive = function(message){
			callbacks.forEach(function(cb){
				 cb(message);
			});
		}
		this.getRegistration = function(){
			return clientRegistration;
		}
		this.getId = function(){
			return pluginId+"_"+channelId;
		};
		this.send = function(message, clientId){
			var message = convertData(message)
			var typeBuffer = new Buffer(2);
			typeBuffer.writeUInt16LE(message.type, 0);
			message = Buffer.concat([channelHeader, typeBuffer, new Buffer(message.data)]);
			if(clientId!==undefined){
				var connection = clientId;
				if(typeof(clientId)==="string"){
					connection = clientRegistration[clientId];
				}
				connection.send(message);
			}
			else{
				for(var clientId in clientRegistration){
					var connection = clientRegistration[clientId];
					connection.send(message);
				}
			}
		};
	}
	
	WEBSOCKET.getChannel = function(pluginName, channelId, messageCallback){
		var pluginId = WEBSOCKET.plugins.indexOf(pluginName);
		if(pluginId<0){
			console.error("WEBSOCKET.getChannel no plugin called "+pluginName);
			return;
		}
		var channelIdStr = pluginId+"_"+channelId;
		if(channels[channelIdStr]===undefined){
			channels[channelIdStr] = new Channel(pluginId, channelId, messageCallback);
		}
		else{
			channels[channelIdStr].addCallback(messageCallback);
		}
		return channels[channelIdStr];
	};
	

	
	
	
	
	var lastSockets = {};
	httpServersE.on("update", function(servers){
		for(var portStr in lastSockets){
			lastSockets[portStr].shutDown();
		}
		for(var portStr in servers){
			var server = servers[portStr].server;
			var serverConfig = servers[portStr].config;
			if(serverConfig.websocket===true){
				console.log("Starting Websocket Server attached to "+serverConfig.protocol+" port "+serverConfig.port);
				var wsServer = new WebSocketServer({
					httpServer: server
				});
				wsServer.clients = {};
				wsServer.on('request', function(request) {
					var connection = request.accept(null, request.origin);
					getUniqueClientId(wsServer.clients, function(socketId){
						connection.id = socketId;
						wsServer.clients[socketId] = connection;					
						console.log("Websocket Client Connected",connection.id);
						connection.on('message', function(data){
							onMessage(connection, data);
						});
						connection.on('close', function(closeReason, description){
							onClose(connection, closeReason, description);
							delete wsServer.clients[socketId];
						});
					});
				});	
				lastSockets[portStr] = wsServer;	
			}
		}
	});
}());

/*
	var DATA_TYPE = {
		BINARY: 0,
		STRING: 1,
		OBJECT: 2
	};
	
	var COMMANDS = {
		REGISTER: 0,
		DEREGISTER: 1,
		DEREGISTER_ALL: 2,
		UPLOAD_PREP:3,
		UPLOAD_UPLOADING: 4,
		UPLOAD_COMPLETE: 5,
		ERROR: 3
	};
	function onMessage(connection, message) {
		console.log("Websocket message", connection.id);
		if (message.type === 'utf8') {
			try{
				var m = JSON.parse(message.utf8Data);
				switch(m.command){
					case UPLOAD_STATE.PREP:
						fs.writeFile("uploadTemp", "", function(err, data){
							connection.sendUTF(JSON.stringify({command: UPLOAD_STATE.PREP} ));
						});
					break;
					case UPLOAD_STATE.COMPLETE:
						console.log("File Upload Complete.");
					break;
					default:
						console.log("Unknown Command", m.command, m);
					break;
				}
			}
			catch(e){console.log(e);}
		}
		else if(message.type === 'binary'){
			fs.appendFile("uploadTemp", message.binaryData, function(err, data){
				connection.sendUTF(JSON.stringify({state: UPLOAD_STATE.UPLOADING} ));
			});
		}
	}

*/