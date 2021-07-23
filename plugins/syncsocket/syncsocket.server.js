/**
 * a server side method of providing communication 1 or more servers
 */
goog.provide('aurora.sync.Channel');
goog.provide('aurora.sync.Socket');

goog.require('aurora.log');
goog.require('aurora.websocket.constants');
goog.require('config');

/**
 * @constructor
 * @param {function(string)} clientRegistered called when a new client connects so sync data can be sent
 * @param {function(number, number, ?)} message called when client recieves message
 */
aurora.sync.Socket = function(clientRegistered, message) {
    this.address_ = null;
    this.port_ = null;
    this.server_ = null;
    this.clients = {};
    this.clientRegistered_ = clientRegistered;
    this.message_ = message;
    this.log_ = aurora.log.createModule('SYNC-SOCKET');
};

/**
 * if both args are null the socket is not active
 * connects/reconnects the socket, if address is null then this is a server socket
 * else it is a client socket
 * @param {?string} address
 * @param {?number} port
 */
aurora.sync.Socket.prototype.reconnect = function(address, port) {
    let net = require('net');
    let me = this;
    let safeClose = function(v) {
        if (v) {
            if (v.close) {
                v.close();
            }
            if (v.end) {
                v.end();
            }
        }
        return null;
    };
    if (address === undefined) {
        address = null;
    }
    if (port === undefined) {
        port = null;
    }
    if (this.address_ === address && this.port_ === port) {
        // nothing has changed just mark all clients as connected
        // I think xxxx
        return;
    }

    this.safeSetTimeout_();
    this.server_ = safeClose(this.server_);
    this.client_ = safeClose(this.client_);
    this.clients = {};
    this.maxClient_ = 0;
    this.address_ = address;
    this.port_ = port;
    this.lastError_ = null;
    if (address === null && port !== null) {
        this.log_.info('High Availablity master');
        this.setupServerConnection_();
    }
    else if (address !== null && port !== null) {
        this.log_.info('High Avialablity slave');
        this.setupClientConnection_();
    }
};

/**
 * @private
 */

aurora.sync.Socket.prototype.setupClientConnection_ = function() {
    let me = this;
    let net = require('net');
    let log = this.log_;
    if (this.address_ === null || this.port_ === null) {
        return;
    }
    me.client_ = net.createConnection(/** @type {number}*/ (this.port_), /** @type {string}*/ (this.address_));
    me.client_.on('error', function(e) {
        me.client_.destroy();
        if (me.lastError_ !== e.code) {
            me.lastError_ = e.code;
            log.error('socket errored ', e.code, 'will attempt to reconnect');
        }

        me.safeSetTimeout_(me.setupClientConnection_.bind(me));
    });
    me.client_.on('close', function(e) {
        me.safeSetTimeout_(me.setupClientConnection_.bind(me));
    });
    let curMessage = {
        buffer: new global.Buffer(0),
    };
    me.client_.on('data', function(inBuffer) {
        let fullBuffer = global.Buffer.concat([curMessage.buffer, inBuffer]);
        while (true) {
            if (fullBuffer.length < 8) {
                // not enougth for the header so nothing to do
                curMessage.buffer = fullBuffer;
                return;
            }

            let pluginId = fullBuffer.readUInt16LE(0);
            let channelId = fullBuffer.readUInt16LE(2);
            let len = fullBuffer.readUInt32LE(4);
            if (fullBuffer.length < len + 8) {
                // not enough for the string wail
                curMessage.buffer = fullBuffer;
                return;
            }

            try {
                log.debug('recieved',
                          aurora.websocket.constants.plugins[pluginId],
                          channelId, fullBuffer.subarray(8, 8 + len).toString());
                let obj = JSON.parse(fullBuffer.subarray(8, 8 + len).toString());
                try {
                    me.message_(pluginId, channelId, obj);
                }
                catch (e) {
                    console.error('failed to process', fullBuffer.toString(), e);
                }
            }
            catch (e) {
                console.error('failed to parse buffer', len, fullBuffer.toString(), e);
            }
            fullBuffer = fullBuffer.subarray(8 + len);
        }
    });
};

/**
 * @enum {number}
 */
aurora.sync.Mode = {
  MASTER: 1,
  SLAVE: 2,
  NONE: 3, // if neither is configured
};

/**
 * @private
 */
aurora.sync.Socket.prototype.setupServerConnection_ = function() {
    let net = require('net');
    let me = this;
    let log = this.log_;
    this.safeSetTimeout_();
    me.maxClient_ = 0;
    me.clients = {};

    if (this.address_ !== null || this.port_ === null) {
        return;
    }
    me.server_ = net.createServer(function(socket) {
        me.lastError_ = null;
        let cid = '' + (me.maxClient_++);
        socket.cid = cid;
        log.info('client ' + cid + ' connected');
        me.clients[cid] = socket;
        socket.on('error', function(e) {

            me.log_.debug('error on client ' + cid, e);
            delete me.clients[cid];
            socket.destroy();
        });
        socket.on('close', function() {
            log.info('client ' + cid + 'closed');
            delete me.clients[cid];
        });
        me.clientRegistered_(cid);
    });
    me.server_.on('error', function(e) {
        if (me.lastError_ !== e.code) {
            me.lastError_ = e.code;
            log.error('server socket error', e.code);
        }
        me.clients = {};
        me.safeSetTimeout_(me.setupServerConnection_.bind(me));
    });

    me.server_.on('closed', function() {
        log.error('server socket closed');
        me.clients = {};
        me.safeSetTimeout_(me.setupServerConnection_.bind(me));
    });

    me.server_.listen(me.port_);
};

/**
 * @private
 * @param {function()=} opt_cb
 */
aurora.sync.Socket.prototype.safeSetTimeout_ = function(opt_cb) {
    if (this.reconnect_) {
        clearTimeout(this.reconnect_);
        this.reconnect_ = null;
    }
    if (opt_cb) {
        this.reconnect_ = setTimeout(opt_cb, 1000);
    }
};

/**
 * @typedef {{clients:Object<string,{socket:?}>}}
 */
aurora.sync.ServerInfo;

/**
 * @constructor
 * @param {number} pluginId
 * @param {number} channelId
 * @param {function(aurora.sync.Mode)} modeSwitch called when this is switched to a master/slave
 * @param {function(string)} clientRegistered called when a new client connects so sync data can be sent
 * @param {function(?)} message client recieves some data
 *
 */
aurora.sync.Channel = function(pluginId, channelId, modeSwitch, clientRegistered, message) {
    this.pluginId_ = pluginId;
    this.channelId_ = channelId;
    this.log_ = aurora.log.createModule('SYNC-CHANNEL');
    // both server an client can be false since may not be configured yet
    /**
     * @private
     * @type {?aurora.sync.ServerInfo}
     */
    this.server_ = null;
    this.client = null;
    this.modeSwitch_ = modeSwitch;
    this.message_ = message;
    this.clientRegistered_ = clientRegistered;

};

/**
 * @param {?} val must be json serializable
 * @param {string=} opt_clientId
 */
aurora.sync.Channel.prototype.write = function(val, opt_clientId) {
    // only the server can write
    let toWrite = null; // delay this if no client to wrote then we save
    if (this.server_) {
        var channelHeader = new global.Buffer(8);
        channelHeader.writeUInt16LE(this.pluginId_, 0);
        channelHeader.writeUInt16LE(this.channelId_, 2);

        // write the data to all the clients
        if (opt_clientId != undefined) {
            let client = this.server_.clients[opt_clientId];
            if (client) {
                toWrite = JSON.stringify(val);
                channelHeader.writeUInt32LE(global.Buffer.byteLength(toWrite), 4);
                client.write(channelHeader);
                client.write(toWrite);
            }
        }
        else {
            for (let clientId in this.server_.clients) {

                let client = this.server_.clients[clientId];
                if (client) {
                    if (toWrite === null) {
                        toWrite = JSON.stringify(val);
                    }
                    channelHeader.writeUInt32LE(toWrite.length, 4);
                    client.write(channelHeader);
                    client.write(toWrite);
                }
            }
        }
    }
    if (toWrite !== null) {
        this.log_.debug('send',
                        aurora.websocket.constants.plugins[this.pluginId_],
                        this.channelId_, toWrite);
    }

};


/**
 * @param {!aurora.sync.ServerInfo} server
 * @private
 */
aurora.sync.Channel.prototype.makeServer_ = function(server) {
    this.server_ = server;
    this.client_ = null;
    this.modeSwitch_(aurora.sync.Mode.MASTER);
};

/**
 * @private
 */
aurora.sync.Channel.prototype.makeClient_ = function() {
    this.server_ = null;
    this.client_ = null;
    this.modeSwitch_(aurora.sync.Mode.SLAVE);
};

/**
 */
aurora.sync.instance = (function() {
    let log = aurora.log.createModule('SYNC-CHANNEL');

    let configs = {};

    let created = false;
    let forEachChannel = function(conf, cb) {
        let c = configs[conf];
        if (c) {
            for (let p in c.plugins) {
                let plugin = c.plugins[p];
                for (let c in plugin) {
                    cb(plugin[c]);
                }
            }
        }
    };


    return {
        /***
         * @param {string} syncConfig
         * @param {string} plugin
         * @param {number} channelId
         * @param {?} thisArg
         * @param {function(aurora.sync.Mode)} modeSwitch called when this is switched to a master/slave
         * @param {function(string)} clientRegistered called when a new client connects so sync data can be sent
         * @param {function(?)} message client recieves some data
         * @return {!aurora.sync.Channel}
         */
        createChannel: function(syncConfig, plugin, channelId, thisArg, modeSwitch, clientRegistered, message) {
            let pluginId = aurora.websocket.constants.pluginIndex[plugin];

            let myClientRegistered = function(cid) {
                forEachChannel(syncConfig, function(c) {
                    c.clientRegistered_(cid);
                });
            };
            let myMessage = function(pluginId, channelId, message) {
                let c = configs[syncConfig];
                if (c) {
                    let channel = (c.plugins[pluginId] || {})[channelId];
                    if (channel) {
                        channel.message_(message);
                    }
                }
            };

            let handleConfig = function(diff) {
                let oldV = diff.oldValue;
                let newV = diff.newValue;
                let curConfig = configs[syncConfig];

                let wasServer = !!(oldV && !oldV['address']);
                let isServer = !!(newV && !newV['address']);

                let wasClient = !!(oldV && oldV['address']);
                let isClient = !!(newV && newV['address']);

                if (newV) {
                    curConfig.socket.reconnect(newV['address'], newV['port']);
                }
                else {
                    curConfig.socket.reconnect(null, null);
                }
                if (wasServer !== isServer && isServer) {
                    forEachChannel(syncConfig, function(c) {
                        c.makeServer_(curConfig.socket);
                    });
                }
                if (isClient && wasClient !== isClient) {
                    forEachChannel(syncConfig, function(c) {
                        c.makeClient_();
                    });
                }

            };
            if (!configs[syncConfig]) {
                configs[syncConfig] = {socket: new aurora.sync.Socket(myClientRegistered, myMessage), plugins: {}};

                created = true;
                config.configE.on('config' + '/' + syncConfig, handleConfig);

            }
            else {
                if (
                    configs[syncConfig].plugins[pluginId] &&
                        configs[syncConfig].plugins[pluginId][channelId]) {
                    log.error('channel created more than once (' + plugin + ',' + channelId + ')');
                }
            }

            configs[syncConfig].plugins[pluginId] = configs[syncConfig].plugins[pluginId] || {};
            configs[syncConfig].plugins[pluginId][channelId] = configs[syncConfig].plugins[pluginId][channelId]
                || new aurora.sync.Channel(pluginId, channelId, modeSwitch.bind(thisArg), clientRegistered.bind(thisArg), message.bind(thisArg));

            if (created) {
                handleConfig({newValue: config['config'] ? config['config'][syncConfig] : undefined});
            }
            else {
                // clients may have already connected before the channel was registered call
                let clients = configs[syncConfig].socket.clients;
                for (let cid in clients) {
                    // do this later to prevent callbacks while initializing
                    setTimeout(function() {
                        clientRegistered.call(thisArg, cid);
                    },1);
                }
            }
            return configs[syncConfig].plugins[pluginId][channelId];
        }
    };

})();
