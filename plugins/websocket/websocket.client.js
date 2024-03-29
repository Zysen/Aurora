goog.provide('aurora.websocket');

goog.require('aurora.websocket.constants');
goog.require('aurora.websocket.enums');

/**
 * @enum {number}
 */
aurora.websocket.CON_STATUS = {
    DISCONNECTED: 0, CONNECTED: 1, ERRORED: 2
};

/**
 * @param {?} data
 * @return {?}
 */
function convertData(data) {
    if (typeof(data) === 'string') {
        return {type: aurora.websocket.enums.types.STRING, data: data};
    }
    else if (typeof(data) === 'object') {
        if (data instanceof ArrayBuffer || data instanceof Blob) {
            return {type: aurora.websocket.enums.types.BINARY, data: data};
        }
        return {type: aurora.websocket.enums.types.OBJECT, data: JSON.stringify(data)};
    }
    else {
        console.error('convertData Unknown type ' + typeof(data));
    }
}
/**
 * @param {!Uint8Array} array
 * @return {string}
 */
function Utf8ArrayToStr(array) {
    var out, i, len, c;
    var char2, char3;

    out = '';
    len = array.length;
    i = 0;
    while (i < len) {
        c = array[i++];
        switch (c >> 4)
        {
        case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
            // 0xxxxxxx
            out += String.fromCharCode(c);
            break;
        case 12: case 13:
                    // 110x xxxx   10xx xxxx
            char2 = array[i++];
            out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
            break;
        case 14:
            // 1110 xxxx  10xx xxxx  10xx xxxx
            char2 = array[i++];
            char3 = array[i++];
            out += String.fromCharCode(((c & 0x0F) << 12) |
                                       ((char2 & 0x3F) << 6) |
                                       ((char3 & 0x3F) << 0));
            break;
        }
    }

    return out;
}

/**
 * @param {?} ab
 * @return {string}
 */
function arrayBufferToString(ab) {
    if (window.TextDecoder) {
        return new TextDecoder('utf-8').decode(new Uint8Array(ab));
    }
    else {
        return Utf8ArrayToStr(new Uint8Array(ab));
    }
}
/**
 * @param {Array} data
 * @param {boolean} littleEndian
 * @return {!ArrayBuffer}
 */
function toUInt16ArrayBuffer(data, littleEndian) {
    littleEndian = littleEndian || true;
    if (typeof(data) === 'number') {
        data = [data];
    }
    var ab = new ArrayBuffer(data.length * 2);
    var dv = new DataView(ab);
    for (var index = 0; index < data.length; index++) {
        dv.setUint16(index * 2, data[index], littleEndian);
    }
    return ab;
}

/**
 * @private
 */
aurora.websocket.channels_ = {};
/**
 * @private
 */
aurora.websocket.onReadyCallbacks_ = [];

/**
 * @private
 */
aurora.websocket.statusCallbacks_ = [];

/**
 * @private
 * at the moment this can only be NO_SESSION
 */
aurora.websocket.errorCallbacks_ = [];

/**
 * @private
 */
aurora.websocket.status_ = aurora.websocket.CON_STATUS.DISCONNECTED;

/**
 * @private
 */
aurora.websocket.pending_ = [];
/**
 * @type {WebSocket}
 */
var connection;

/**
 * @param {function(aurora.websocket.CON_STATUS)} cb
 */
aurora.websocket.onStatusChanged = function(cb) {
    aurora.websocket.statusCallbacks_.push(cb);
    if (connection && connection.ready) {
        cb(aurora.websocket.status_);
    }
};

/**
 * @param {function({error:aurora.websocket.error})} cb
 */
aurora.websocket.onError = function(cb) {
    aurora.websocket.errorCallbacks_.push(cb);
};
/**
 * @param {function()} cb
 */
aurora.websocket.onReady = function(cb) {
    aurora.websocket.onReadyCallbacks_.push(cb);
    if (connection && connection.ready) {
        cb();
    }
};

/**
 * close and open again
 */
aurora.websocket.reconnect = function() {
    if (connection) {
        connection.close();
        connection = null;
        aurora.websocket.connect();
    }
};

/**
 * gets the document again to referesh the cookies
 * @param {function()} reloadFunc
 */
aurora.websocket.getCookiesAndReload = function(reloadFunc) {
    let sender = new goog.net.XhrIo();
    sender.setResponseType(goog.net.XhrIo.ResponseType.TEXT);
    sender.listen(goog.net.EventType.COMPLETE, function(e) {
        if (sender.isSuccess()) {
            reloadFunc();
        }
        else {
            setTimeout(function() {
                aurora.websocket.getCookiesAndReload(reloadFunc);
            }, 4000);
        }
    });
    sender.send('/');
};

/**
 * connect to server websocket
 */
aurora.websocket.connect = function() {
    if (connection) {
        return;
    }
    // Edge gets all confused if port is blank
    var port = window.location.port === '' ? '' : ':' + window.location.port;

    var conurl = (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + window.location.hostname + port + '/websocket';
    connection = new WebSocket(conurl);
    connection.ready = false;
    connection.onopen = function() {
        console.log('WS connection established');
        connection.ready = true;
        // other onready callback may add to array while we are doing these callbacks
        aurora.websocket.onReadyCallbacks_.slice(0).forEach(function(cb) {
            cb();
        });
        aurora.websocket.status_ = aurora.websocket.CON_STATUS.CONNECTED;
        aurora.websocket.statusCallbacks_.slice(0).forEach(function(cb) {
            cb(aurora.websocket.status_);
        });
        var pending = aurora.websocket.pending_;
        while (pending.length > 0) {
            pending.shift()();
        }
    };
    connection.onerror = function(error) {
        aurora.websocket.status_ = aurora.websocket.CON_STATUS.ERRORED;
        console.log('errored ws', error);
        aurora.websocket.statusCallbacks_.slice(0).forEach(function(cb) {
            cb(aurora.websocket.status_);
        });
    };
    let reconnectTimeout = null;
    connection.onclose = function(evt) {
        aurora.websocket.status_ = aurora.websocket.CON_STATUS.DISCONNECTED;
        if (connection) {
            connection.close();
        }
        connection = null;
        console.error('closing web socket');
        if (evt.code !== 1000) {
            // if 1000 is a normal closure basically we are changing pages
            // in firefox don't send events because it behaves differently on
            // firefox than chrome don't send message websocket should never close
            // under normal circumstances

            aurora.websocket.statusCallbacks_.slice(0).forEach(function(cb) {
                cb(aurora.websocket.status_);
            });
        }

        if (reconnectTimeout) {
            return;
        }
        reconnectTimeout = setTimeout(function () {
            reconnectTimeout = null;
            if (!connection) {
                aurora.websocket.connect();
            }
        }, 1000);
    };

    var websocketPluginId = aurora.websocket.constants.plugins.indexOf('websocket');
    // reader may load out of order we need to make sure that doesn't
    var pendingReader = [];
    var count = 0;
    var prev = -1;

    var schedule = function(doit) {
        var cb = function() {
            pendingReader.shift();
            if (pendingReader.length > 0) {
                pendingReader[0](cb);
            }
        };
        var safe = function() {
            try {
                doit(cb);
            }
            catch (e) {
                cb();
            }
        };
        pendingReader.push(safe);
        if (pendingReader.length === 1) {
            pendingReader[0](cb);
        }

    };
    connection.onmessage = function(packet) {
        if (packet.data instanceof Blob) {
            var myCount = count++;

            schedule(function(done) {
                var reader = new FileReader();
                reader.onload = function() {
                    var data = reader.result;
                    var header = new Uint16Array(reader.result.slice(0, 6));
                    var pluginId = header[0];
                    var channelId = header[1];
                    var type = header[2];
                    var channel = aurora.websocket.channels_[pluginId + '_' + channelId];
                    var decodedData = null;
                    if (myCount < prev) {
                        console.log('out of order recieved', pluginId, prev, myCount);
                    }
                    prev = myCount;
                    if (type === aurora.websocket.enums.types.STRING) {
                        decodedData = arrayBufferToString(reader.result.slice(6));
                    }
                    else if (type === aurora.websocket.enums.types.OBJECT) {
                        decodedData = JSON.parse(arrayBufferToString(reader.result.slice(6)));
                    }
                    else if (type === aurora.websocket.enums.types.BINARY) {
                        decodedData = reader.result.slice(6);
                    }
                    else {
                        console.error('Websocket Receive: Unknown Type', type);
                        done();
                        return;
                    }
                    if (channel) {
                        channel.receive({data: decodedData});
                    }
                    else if (pluginId === websocketPluginId) {
                        console.log('recived webSocket error', aurora.websocket.errorCallbacks_);
                        aurora.websocket.errorCallbacks_.slice(0).forEach(function(cb) {
                            cb(decodedData);
                        });
                    }
                    done();

                };
                reader.readAsArrayBuffer(packet.data);
            });

        }
        else {
            schedule(function(done) {
                try {
                    var m = JSON.parse(packet.data);
                    console.log('Internal Channel Message', m);
                } catch (e) {
                    console.log("This doesn't look like valid JSON: ", packet.data, e);
                }
                done();
            });
        }
    };
};

window.addEventListener('load', function() {
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    aurora.websocket.connect();
}, false);

/**
 * @constructor
 * @param {number} pluginId
 * @param {number} channelId
 * @param {function({data:?})} messageCb
 */
function Channel(pluginId, channelId, messageCb) {
    var callbacks = [messageCb];
    var onConnectCallbacks = [];
    var onConnectCallbacksCalled = false;
    aurora.websocket.onReady(function() {
        if (connection) {
            connection.send(JSON.stringify({'command': aurora.websocket.enums.COMMANDS.REGISTER, 'pluginId': pluginId, 'channelId': channelId}));
            if (onConnectCallbacks.length > 0) {
                setTimeout(function() {
                    onConnectCallbacksCalled = true;
                    onConnectCallbacks.forEach(function(cb) {
                        try {
                            cb();
                        }
                        catch (e) {
                            console.error(e);
                        }
                    });
                },1);
            }
        }
    });

    this.addOnConnectCallback = function(cb) {
        onConnectCallbacks.push(cb);
        if (onConnectCallbacksCalled) {
            cb();
        }
    };
    const maxSize = 60000;
    this.send = function(sendBuffer) {
        var data = convertData(sendBuffer);
        var doIt = function() {
            if (connection) {
                /**
                 * according to the documentation and it works you can send a blob but the
                 * compiler is complaining
                 */
                // split it up if it gets too big the connection will close

                connection.send('data-start');
                let toSend = /** @type {?} */ (new Blob([toUInt16ArrayBuffer([pluginId, channelId, data.type], true), data.data]));
                for (let start = 0; start < toSend.size; start += maxSize) {
                    
                    connection.send(toSend.slice(start, start + maxSize));
                }
                connection.send('data-end');
            }
        };
        if (connection && connection.ready) {
            doIt();
        }
        else {
            aurora.websocket.pending_.push(doIt);
        }


    };
    this.destroy = function() {
        if (connection) {
            connection.send(JSON.stringify({command: aurora.websocket.enums.COMMANDS.UNREGISTER, pluginId: pluginId, channelId: channelId}));
        }
    };
    this.addCallback = function(cb) {
        callbacks.push(cb);
    };
    this.receive = function(data) {
        callbacks.forEach(function(cb) {
            cb(data);
        });
    };
}

/**
 * @param {string} pluginName
 * @param {number} channelId
 * @param {function(?)} messageCallback
 * @param {function()=} opt_onConnectCb
 * @return {?Channel}
 */
aurora.websocket.getChannel = function(pluginName, channelId, messageCallback, opt_onConnectCb) {
    var pluginId = aurora.websocket.constants.plugins.indexOf(pluginName);
    if (pluginId < 0) {
        console.error('websocket.getChannel no plugin called ' + pluginName);
        return null;
    }
    // I think this will get confusing especially if on widget sends a destroy
    // or gets a message for another widget
    var channel = aurora.websocket.channels_[pluginId + '_' + channelId];
    if (channel === undefined) {
        channel = new Channel(pluginId, channelId, messageCallback);
        aurora.websocket.channels_[pluginId + '_' + channelId] = channel;
    }
    else {
        channel.addCallback(messageCallback);
    }
    if (opt_onConnectCb) {
        channel.addOnConnectCallback(opt_onConnectCb);
    }

    return channel;
};

/**
 * @param {string} pluginName
 * @param {number} channelId
 * @param {function(?)} messageCallback
 * @return {?Channel}
 */

aurora.websocket.getObjectChannel = function(pluginName, channelId, messageCallback) {
    return aurora.websocket.getChannel(pluginName, channelId, function(v) {
        messageCallback(v.data);
    });
};
