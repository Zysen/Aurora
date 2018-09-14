goog.provide("aurora.websocket");
goog.provide("aurora.websocket.Server");

goog.require("aurora.http");
goog.require("aurora.websocket.enums");
goog.require("aurora.websocket.constants");
goog.require('aurora.auth.Auth');

/**
 * This could possibly be deprecated. Its not used right now.
 * @typedef {{pluginId:number,channelId:number,command:number}}
 */
aurora.websocket.ChannelControlMessage;

/**
 * @typedef {{type:string,utf8Data:string}|{type:string,binData:string}}
 */
aurora.websocket.MessageType;

aurora.websocket.crypto = require("crypto");
aurora.websocket.WebSocketServer = require('websocket')['server'];
 
/**
 * @export
 * @constructor
 */
aurora.websocket.Server = function(){
	var serverInstance = this;
	aurora.http.serversUpdatedE.on("update", function(servers){
		for(var portStr in serverInstance.lastSockets){
			serverInstance.lastSockets[portStr].close();
		}
		for(var portStr in servers){
			var server = servers[portStr];
			if(server.config['websocket']===true){
				console.log("Starting Websocket Server attached to "+server.config.protocol+" port "+server.config.port);
				var wsServer = new aurora.websocket.WebSocketServer({
					'httpServer': server.server
				});
				wsServer.clients = {};
				wsServer.on('request', function(request) {
					var connection = request['accept'](null, request['origin']);
					serverInstance.getUniqueClientId(wsServer.clients, function(socketId){
					    connection.id = socketId;
					    wsServer.clients[socketId] = connection;
                                            if (aurora.auth.instance.registerClientToken(request, socketId, connection)) {
					        connection.on('message', function(data){
						    serverInstance.onMessage(connection, data);
					        });
					        connection.on('close', function(closeReason, description){
						    serverInstance.onClose(connection, closeReason, description);
                                                    aurora.auth.instance.unregisterClientToken(socketId);
						    delete wsServer.clients[socketId];
					        });
                                            }
                                            else {
                                                serverInstance.onClose(connection, "INVALIDTOKEN", "invalid token");
						delete wsServer.clients[socketId];
                                            }
					});
				});	
				serverInstance.lastSockets[portStr] = wsServer;	
			}
		}
	});
};

/**
 *	@constructor
 *	@private
 *	@dict
*/
aurora.websocket.Server.prototype.channels = function() {};

/**
 *	@constructor
 *	@private
 *	@dict
*/
aurora.websocket.Server.prototype.channelsByClientId = function() {};

/**
 *	@constructor
 *	@private
 *	@dict
*/
aurora.websocket.Server.prototype.lastSockets = function() {};

aurora.websocket.Server.prototype.onM = function(){};

/**
 * @param {*} connection 
 * @param {aurora.websocket.MessageType} message 
 */
aurora.websocket.Server.prototype.onMessage = function(connection, message) {
	if (message['type'] === 'utf8') {
		try{
			var m = (JSON.parse(message['utf8Data']));
			switch(m['command']){
			case aurora.websocket.enums.COMMANDS.REGISTER:
			    var channelKey = m['pluginId']+"_"+m['channelId'];
                            if (!this.channels[channelKey]) {
                                break; // invalid channel ignore
                            }
                            
			    this.channels[channelKey].register(connection.id, connection);
			    if(this.channelsByClientId[connection.id]===undefined){
				this.channelsByClientId[connection.id] = {};
			    }
			    this.channelsByClientId[connection.id][channelKey] = this.channels[channelKey];
			    break;
			case aurora.websocket.enums.COMMANDS.UNREGISTER:
			    this.channels[m['pluginId']+"_"+m['channelId']].unregister(connection.id);
			    break;
			default:
			    console.log("Unknown Command", m['command'], m);
			    break;
			}
		}
		catch(e){console.log(e);}
	}
	else if(message['type'] === 'binary'){
		var pluginId = message['binaryData'].readUInt16LE(0);
		var channelId = message['binaryData'].readUInt16LE(2);
		var type = message['binaryData'].readUInt16LE(4);
		var payload = message['binaryData'].slice(6);
		
		if(type===aurora.websocket.enums.types.STRING){
			payload = payload.toString();
		}
		else if(type===aurora.websocket.enums.types.OBJECT){
		    payload = JSON.parse(payload.toString());
		}
	    else if(type!==aurora.websocket.enums.types.BINARY){
		console.error("Websocket Unknown Type "+type);
		return;
	    }
	    //console.log("WS ", pluginId, channelId, type, payload);
            var token = aurora.auth.instance.getClientToken(connection.id);
	    this.channels[pluginId+"_"+channelId].receive({token: token, clientId: connection.id, connection: connection, data: payload});
	}
}

/**
 * @private
 * @param {?} clients
 * @param {function(string)} doneCb
 */
aurora.websocket.Server.prototype.getUniqueClientId = function(clients, doneCb){
	var id = aurora.websocket.crypto.randomBytes(8).toString("hex");
	if(clients[id]===undefined){
		clients[id] = {};
		doneCb.apply(this, [id]);
	}
	else{
		setTimeout(function(){
			this.getUniqueClientId(clients, doneCb);
		},1);
	}
}

/**
* @private
* @param {?} connection 
* @param {string} closeReason 
* @param {string} description 
*/
aurora.websocket.Server.prototype.onClose = function(connection, closeReason, description) {
	console.log("Websocket Connection Closed.", connection.id, Object.keys(this));
	if(this.channelsByClientId[connection.id]){
		for(var key in this.channelsByClientId[connection.id]){
			this.channelsByClientId[connection.id][key].unregister(connection.id);
		}
		delete this.channelsByClientId[connection.id];
	}
}

/**
* @private
* @param {string|buffer.Buffer|Object} data 
*/
aurora.websocket.Server.prototype.convertData = function(data){
	if(typeof(data)==="string"){
		return {type: aurora.websocket.enums.types.STRING, data: new global.Buffer(data)};
	}
	else if(typeof(data)==="object"){
		if(global.Buffer.isBuffer(data)){
				return {type: aurora.websocket.enums.types.BINARY, data: data};
		}
		return {type: aurora.websocket.enums.types.OBJECT, data: new global.Buffer(JSON.stringify(data))};
	}
	else{
		console.error("convertData Unknown type "+typeof(data));
	}
}

/**
 * A helper function for getting a channel using the plugin name rather than id.
 * @public
 * @param {string} pluginName The name of the plugin that creates the channel.
 * @param {number} channelId The id of the channel. This is managed by the plugin.
 * @param {function(!aurora.websocket.ChannelMessage)} messageCallback
 * @param {function(string,string)=} opt_clientCloseCallback passes the token and client id closed
 * @return {aurora.websocket.Channel|undefined}
 */
aurora.websocket.Server.prototype.getChannel = function(pluginName, channelId, messageCallback, opt_clientCloseCallback){
	var pluginId = aurora.websocket.constants.plugins.indexOf(pluginName);
	if(pluginId<0){
		console.error("websocket.getChannel no plugin called "+pluginName);
		//TODO throw new exceptionm here instead 
		return null;
	}
	var channelIdStr = pluginId+"_"+channelId;
	if(this.channels[channelIdStr]===undefined){
	    this.channels[channelIdStr] = new aurora.websocket.Channel(pluginId, channelId, messageCallback, opt_clientCloseCallback);
	}
	else{
		this.channels[channelIdStr].addCallback(messageCallback);
	}
	return this.channels[channelIdStr];
};

aurora.websocket.Server.instance = new aurora.websocket.Server();

/**
 * @typedef {{token:string,clientId:string, data: ?, connection:?}}
 * 
 */
aurora.websocket.ChannelMessage;
/**
 * A channel provides client and server bidirectional communication.
 * It manages file transfers, serialization and peer groups.
 * @constructor
 * @param {number} pluginId The id of the plugin that creates the channel.
 * @param {number} channelId The id of the channel. This is managed by the plugin.
 * @param {function(!aurora.websocket.ChannelMessage)} messageCb
 * @param {function(string, string)=} opt_clientCloseCallback passes the token and client id closed
 */
aurora.websocket.Channel = function(pluginId, channelId, messageCb, opt_clientCloseCallback) {
    var clientRegistration = {};
    var callbacks = [messageCb];
    
    var channelHeader = new global.Buffer(4);
    channelHeader.writeUInt16LE(pluginId, 0);
    channelHeader.writeUInt16LE(channelId, 2);
    this.register = function(clientId, connection){
	clientRegistration[clientId] = connection;
    };
    this.unregister = function(clientId){
        var token =  aurora.auth.instance.getClientToken(clientId);
	delete clientRegistration[clientId];
        if (opt_clientCloseCallback) {
            opt_clientCloseCallback(token, clientId);
        }
    };
    this.addCallback = function(messageCb2){
	callbacks.push(messageCb2);
    };
    this.receive = function(message){
	callbacks.forEach(function(cb){
	    cb(message);
	});
    };
    this.getRegistration = function(){
	return clientRegistration;
    };
    this.getId = function(){
	return pluginId+"_"+channelId;
    };
	
	/**
	 * This function sends a message.
	 * @public
	 * @param {string|buffer.Buffer|Object} message Message payload
	 * @param {string=} clientId If specified the message will only be sent to this client.
         * @param {function(?, string):boolean=} filter
	 */
    this.send = function(message, clientId, filter){
	message = aurora.websocket.Server.instance.convertData(message);
	var typeBuffer = new global.Buffer(2);
	typeBuffer.writeUInt16LE(message.type, 0);
	message = global.Buffer.concat([channelHeader, typeBuffer, new global.Buffer(message.data)]);
	if(clientId!==undefined){
	    var connection = clientId;
	    if(typeof(clientId)==="string"){
		connection = clientRegistration[clientId];
	    }
	    connection.send(message);
	}
	else{
	    for(var clientId2 in clientRegistration){
		var connection = clientRegistration[clientId2];
                if (!filter || filter(connection, aurora.auth.instance.getClientToken(clientId2))) {
		    connection.send(message);
                }
	    }
	}
    };
};

/**
 * A helper function for getting a channel using the plugin name rather than id.
 * @param {string} pluginName The name of the plugin that creates the channel.
 * @param {number} channelId The id of the channel. This is managed by the plugin.
 * @param {function(!aurora.websocket.ChannelMessage)} messageCallback
 * @param {function(string, string)=} opt_clientCloseCallback passes the token and client id closed
 * @return {aurora.websocket.Channel|undefined}
 */
aurora.websocket.getChannel = function(pluginName, channelId, messageCallback, opt_clientCloseCallback){
    return aurora.websocket.Server.instance.getChannel(pluginName, channelId, messageCallback, opt_clientCloseCallback);
};


