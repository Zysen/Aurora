goog.provide('aurora.websocket');
goog.provide('aurora.websocket.Server');

goog.require('aurora.auth.Auth');
goog.require('aurora.http');
goog.require('aurora.log');
goog.require('aurora.websocket.constants');
goog.require('aurora.websocket.enums');

/**
 * This could possibly be deprecated. Its not used right now.
 * @typedef {{pluginId:number,channelId:number,command:number}}
 */
aurora.websocket.ChannelControlMessage;

/**
 * @typedef {{type:string,utf8Data:string}|{type:string,binData:string}}
 */
aurora.websocket.MessageType;

/**
 * @typedef {{lock:(undefined|function(string)), unlock:(undefined|function (string)),
 *           receive:(undefined|function(?):boolean), send:(undefined|function(?):boolean)}}
 */
aurora.websocket.LockHandler;

/**
 * @final
 */
aurora.websocket.crypto = require('crypto');
/**
 * @final
 */
aurora.websocket.WebSocketServer = require('websocket')['server'];

/**
 * @export
 * @constructor
 */
aurora.websocket.Server = function() {
    let log = aurora.log.createModule('WEBSOCKET');
    this.locked_ = {};
    let me = this;
    aurora.auth.instance.addLockHandler(function(token, locked) {
        if (locked) {
            me.locked_[token] = true;
        }
        else {
            delete me.locked_[token];
        }
        try {
            for (let id in me.channels_) {
                me.channels_[id].lock(token, locked);
            }
        } catch (e) {
            console.log(e);
        }

    });

    var serverInstance = this;
    aurora.http.serversUpdatedE.on('update', (servers) => {
        for (let portStr in serverInstance.lastSockets_) {
            serverInstance.lastSockets_[portStr]['shutDown']();
        }
        for (let portStr in servers) {
            var server = servers[portStr];
            if (server.config['websocket'] === true) {
                log.info('Starting Websocket Server attached to ' + server.config.protocol + ' port ' + server.config.port);
                var wsServer = new aurora.websocket.WebSocketServer({
                    'httpServer': server.server
                });
                wsServer.clients = {};
                wsServer.on('request', (request) => {
                    var connection = request['accept'](null, request['origin']);
                    serverInstance.getUniqueClientId_(wsServer.clients, (socketId) => {
                        connection.id = socketId;
                        wsServer.clients[socketId] = connection;
                        aurora.auth.instance.registerClientToken(request, socketId, connection).then((registered) => {
                            let curMessage = null;
                            if (registered) {
                                connection.on('message', (data) => {
                                    if (data.utf8Data == 'data-start') {
                                        curMessage = {};
                                    }
                                    else if (data.utf8Data == 'data-end') {

                                        if (curMessage) {
                                            serverInstance.onMessage(connection, curMessage);
                                        }
                                        curMessage = null;
                                    }
                                    else if (curMessage == null || (curMessage.type != undefined && curMessage.type != data.type)) {
                                        curMessage = null;
                                        serverInstance.onMessage(connection, data);

                                    }
                                    else if (data.type == 'binary' && data.binaryData) {
                                        if (curMessage.binaryData) {
                                            curMessage.binaryData = Buffer.concat([curMessage.binaryData, data.binaryData]);
                                        }
                                        else {
                                            curMessage.type = data.type;
                                            curMessage.binaryData = data.binaryData;
                                        }
                                    }
                                    else {
                                        curMessage = null;
                                        serverInstance.onMessage(connection, data);
                                    }
                                        
                                });
                                connection.on('close', (closeReason, description) => {
                                    curMessage = null;
                                    serverInstance.onClose_(connection, closeReason, description);
                                    aurora.auth.instance.unregisterClientToken(socketId);
                                    delete wsServer.clients[socketId];
                                });
                            }
                            else {
                                this.sendError_(connection, aurora.websocket.error.NO_SESSION);
                                serverInstance.onClose_(connection, 'INVALIDTOKEN', 'invalid token');
                                delete wsServer.clients[socketId];                                
                            }
                        });
                    });
                });
                serverInstance.lastSockets_[portStr] = wsServer;
                log.info('Listening on websocket', portStr);
            }
        }
    });
};


/**
 *    @constructor
 *    @private
 *    @dict
 */
aurora.websocket.Server.prototype.channels_ = function() {};

/**
 *    @constructor
 *    @private
 *    @dict
 */
aurora.websocket.Server.prototype.channelsByClientId_ = function() {};

/**
 *    @constructor
 *    @private
 *    @dict
 */
aurora.websocket.Server.prototype.lastSockets_ = function() {};

/**
 * @param {*} connection
 * @param {aurora.websocket.error} errorno
 */
aurora.websocket.Server.prototype.sendError_ = function(connection, errorno) {
    var header = new global.Buffer(6);
    var error = aurora.websocket.Server.instance.convertData_({'error': errorno});
    var pluginId = aurora.websocket.constants.plugins.indexOf('websocket');
    header.writeUInt16LE(pluginId, 0);
    header.writeUInt16LE(0, 2);
    header.writeUInt16LE(error.type, 4);
    connection.send(global.Buffer.concat([header, error.data]));
};
/**
 * @param {*} connection
 * @param {aurora.websocket.MessageType} message
 */
aurora.websocket.Server.prototype.onMessage = function(connection, message) {
    let log = aurora.log.createModule('WEBSOCKET');

    if (!aurora.auth.instance.validClient(connection.id)) {
        this.sendError_(connection, aurora.websocket.error.NO_SESSION);
        return;
    }
    // todo if the channel or plugin id don't exist we shouldn't die this is asecurity risk
    

    if (message['type'] === 'utf8') {
        try {
            var m = (JSON.parse(message['utf8Data']));
            switch (m['command']) {
            case aurora.websocket.enums.COMMANDS.REGISTER:
                var channelKey = m['pluginId'] + '_' + m['channelId'];
                if (!this.channels_[channelKey]) {
                    break; // invalid channel ignore
                }

                this.channels_[channelKey].register(connection.id, connection);
                if (this.channelsByClientId_[connection.id] === undefined) {
                    this.channelsByClientId_[connection.id] = {};
                }
                this.channelsByClientId_[connection.id][channelKey] = this.channels_[channelKey];
                break;
            case aurora.websocket.enums.COMMANDS.UNREGISTER:
                this.channels_[m['pluginId'] + '_' + m['channelId']].unregister(connection.id);
                break;
            default:
                // if command is undefined this it is just a ping request to see if the connection is alive
                if (m['command'] !== undefined) {
                    console.log('Unknown Command', m['command'], m);
                }
                break;
            }
        }
        catch (e) {console.log(e);}
    }
    else if (message['type'] === 'binary') {
        try {
            var pluginId = message['binaryData'].readUInt16LE(0);
            var channelId = message['binaryData'].readUInt16LE(2);
            var type = message['binaryData'].readUInt16LE(4);
            var payload = message['binaryData'].slice(6);

            if (type === aurora.websocket.enums.types.STRING) {
                payload = payload.toString();
            }
            else if (type === aurora.websocket.enums.types.OBJECT) {
                payload = JSON.parse(payload.toString());
            }
            else if (type !== aurora.websocket.enums.types.BINARY) {
                console.error('Websocket Unknown Type ' + type);
                return;
            }
            //console.log("WS ", pluginId, channelId, type, payload);
            aurora.auth.instance.getClientToken(connection.id, function (token) {
                let c = this.channels_[pluginId + '_' + channelId];
                if (c) {
                    c.receive({token: token, clientId: connection.id, connection: connection, data: payload});
                }
                else {
                    log.error('unable to find plugin channel', aurora.websocket.constants.plugins[pluginId], 'pluginid', pluginId, 'channelid', channelId);
                }
            }.bind(this));

        }
        catch (e) {
            console.log(e);
        }
    }
};

/**
 * @private
 * @param {?} clients
 * @param {function(string)} doneCb
 */
aurora.websocket.Server.prototype.getUniqueClientId_ = function(clients, doneCb) {
    var id = aurora.websocket.crypto.randomBytes(8).toString('hex');
    if (clients[id] === undefined) {
        clients[id] = {};
        doneCb.apply(this, [id]);
    }
    else {
        setTimeout(function() {
            this.getUniqueClientId_(clients, doneCb);
        },1);
    }
};

/**
 * @private
 * @param {?} connection
 * @param {string} closeReason
 * @param {string} description
 */
aurora.websocket.Server.prototype.onClose_ = function(connection, closeReason, description) {
    if (this.channelsByClientId_[connection.id]) {
        for (var key in this.channelsByClientId_[connection.id]) {
            this.channelsByClientId_[connection.id][key].unregister(connection.id);
        }
        delete this.channelsByClientId_[connection.id];
    }
};

/**
 * @private
 * @param {string|buffer.Buffer|Object} data
 * @return {?{type:aurora.websocket.enums.types,data:?}}
 */
aurora.websocket.Server.prototype.convertData_ = function(data) {
    if (typeof(data) === 'string') {
        return {type: aurora.websocket.enums.types.STRING, data: new global.Buffer(data)};
    }
    else if (typeof(data) === 'object') {
        if (global.Buffer.isBuffer(data)) {
            return {type: aurora.websocket.enums.types.BINARY, data: data};
        }
        return {type: aurora.websocket.enums.types.OBJECT, data: new global.Buffer(JSON.stringify(data))};
    }
    else {
        console.error('convertData Unknown type ' + typeof(data));
        return null;
    }
};

/**
 * A helper function for getting a channel using the plugin name rather than id.
 * @public
 * @param {string} pluginName The name of the plugin that creates the channel.
 * @param {number} channelId The id of the channel. This is managed by the plugin.
 * @param {function(!aurora.websocket.ChannelMessage)} messageCallback
 * @param {function(string,string)=} opt_clientCloseCallback passes the token and client id closed
 * @return {!aurora.websocket.Channel}
 */
aurora.websocket.Server.prototype.getChannel = function(pluginName, channelId, messageCallback, opt_clientCloseCallback) {
    var pluginId = aurora.websocket.constants.plugins.indexOf(pluginName);
    if (pluginId < 0) {
        throw 'websocket.getChannel no plugin called ' + pluginName;
    }
    var channelIdStr = pluginId + '_' + channelId;
    if (this.channels_[channelIdStr] === undefined) {
        this.channels_[channelIdStr] = new aurora.websocket.Channel(pluginId, channelId, messageCallback, opt_clientCloseCallback);
    }
    else {
        this.channels_[channelIdStr].addCallback(messageCallback);
        if (opt_clientCloseCallback) {
            this.channels_[channelIdStr].addCloseCallback(opt_clientCloseCallback);
        }
    }
    return this.channels_[channelIdStr];
};

/**
 * @final
 */
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
    var closeCallbacks = opt_clientCloseCallback ? [opt_clientCloseCallback] : [];
    
    var registerCallbacks = [];
    var locked = aurora.websocket.Server.instance.locked_;
    /**
     * @type {Array<!aurora.websocket.LockHandler>}
     */
    var lockHandlers = [];

    var channelHeader = new global.Buffer(4);
    channelHeader.writeUInt16LE(pluginId, 0);
    channelHeader.writeUInt16LE(channelId, 2);
    this.register = function(clientId, connection) {
        clientRegistration[clientId] = connection;
        registerCallbacks.forEach(function(cb) {
            aurora.auth.instance.getClientToken(connection.id, function (token) {
                cb(connection, token);
            });
        });
    };

    this.lock = function(token, locked) {
        lockHandlers.forEach(function(h) {
            if (locked) {
                if (h.lock) {
                    h.lock(token);
                }
            }
            else {
                if (h.unlock) {
                    h.unlock(token);
                }
            }
        });
    };
    this.addLockHandler = function(handler) {
        if (handler.send) {
            if (!(handler.send instanceof Function)) {
                console.error('adding invalid handler');
            }
        }
        lockHandlers.push(handler);
    };

    let isLocked = function(message, cb) {
        if (message && locked[message.token]) {
            let allow = false;
            for (let i = 0; i < lockHandlers.length; i++) {
                allow = allow || cb(lockHandlers[i], message);
            }
            return !allow;
        }
        return false;
    };

    let sendIfNotLocked = function(connection, message, sendMessage, test) {
        
        aurora.auth.instance.getClientToken(connection.id, function (token) {
            if (message && locked[token]) {
                let allow = false;
                for (let i = 0; i < lockHandlers.length; i++) {
                    allow = allow || test(lockHandlers[i], message);
                }
                if (allow) {
                    connection.send(sendMessage);
                }
            }
            connection.send(sendMessage);
        });

    };
    /**
     * @param {function(?)|function(?,?)} callback
     */
    this.onRegister = function(callback) {
        registerCallbacks.push(callback);
    };
    this.unregister = function(clientId) {
        delete clientRegistration[clientId];
        aurora.auth.instance.getClientToken(clientId, function (token) {
            closeCallbacks.forEach(function (cb) {cb(token, clientId);});
        });

    };
    this.addCallback = function(messageCb2) {
        callbacks.push(messageCb2);
    };
    this.addCloseCallback = function(messageCb2) {
        closeCallbacks.push(messageCb2);
    };


    this.receive = function(message) {
        if (isLocked(message, function(h, m) {return (!!h.receive && h.receive(m));})) {
            return;
        }
        callbacks.forEach(function(cb) {
            cb(message);
        });
    };
    this.getRegistration = function() {
        return clientRegistration;
    };
    this.getId = function() {
        return pluginId + '_' + channelId;
    };

    /**
     * This function sends a message.
     * @public
     * @param {string|buffer.Buffer|Object} message Message payload
     * @param {(string|?)=} clientId If specified the message will only be sent to this client.
     * @param {function(?, string):boolean=} filter
     */



    /**
     * This function sends a message.
     * @public
     * @param {number} type
     * @param {string|buffer.Buffer|Object} message Message payload
     * @param {?} origMessage
     * @param {(string|?)=} clientId If specified the message will only be sent to this client.
     * @param {function(?, string):boolean=} filter
     */
    var sendRaw = function(type, message, origMessage, clientId, filter) {

        var typeBuffer = new global.Buffer(2);
        typeBuffer.writeUInt16LE(type, 0);
        message = global.Buffer.concat([channelHeader, typeBuffer, message]);
        if (clientId !== undefined) {
            let connection = clientId;
            if (typeof(clientId) === 'string') {
                connection = clientRegistration[clientId];
            }
            if (connection) {
                // client my have been deregistered don't send to it if it has
                sendIfNotLocked(connection, origMessage, message, function(h, m) {return (!!h.send && h.send(m));});
               
            }
        }
        else {
            for (let clientId2 in clientRegistration) {
                let connection = clientRegistration[clientId2];

                let doit = function () {
                    sendIfNotLocked(connection, origMessage, message, function(h, m) {
                        return !!h.send && h.send(m);
                    });
                };
                if (!filter) {
                    doit();
                }
                else {
                    aurora.auth.instance.getClientToken(clientId2, function (token) {
                        if (filter(connection, token)) {
                            doit();
                        }
                    });
                }
            }
        }
    };
    /**
     * This function sends a message.
     * @public
     * @param {string|buffer.Buffer|Object} message Message payload
     * @param {(string|?)=} clientId If specified the message will only be sent to this client.
     * @param {function(?, string):boolean=} filter
     */
    this.send = function(message, clientId, filter) {
        message = aurora.websocket.Server.instance.convertData_(message);
        sendRaw(message.type, new global.Buffer(message.data), message, clientId, filter);
    };
    /**
     * This function sends a message.
     * @public
     * @param {string|buffer.Buffer|Object} message Message payload
     * @param {(string|?)=} clientId If specified the message will only be sent to this client.
     * @param {function(?, string):boolean=} filter
     */
    this.sendBinary = function(message, clientId, filter) {
        sendRaw(aurora.websocket.enums.types.BINARY, message, message, clientId, filter);
    };

};

/**
 * A helper function for getting a channel using the plugin name rather than id.
 * @param {string} pluginName The name of the plugin that creates the channel.
 * @param {number} channelId The id of the channel. This is managed by the plugin.
 * @param {function(!aurora.websocket.ChannelMessage)} messageCallback
 * @param {function(string, string)=} opt_clientCloseCallback passes the token and client id closed
 * @return {!aurora.websocket.Channel}
 */
aurora.websocket.getChannel = function(pluginName, channelId, messageCallback, opt_clientCloseCallback) {
    return aurora.websocket.Server.instance.getChannel(pluginName, channelId, messageCallback, opt_clientCloseCallback);
};


