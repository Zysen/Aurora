goog.provide('aurora.http');
goog.require('aurora.websocket.enums');
goog.require('config');
goog.require('goog.structs.AvlTree');
goog.require('recoil.util.object');

/**
 * @typedef {{set:function(string,?),get:function(string),toClient:function():Array<string>}}
 */
aurora.http.ResponseHeaders;

/**
 * @typedef {{port:number,protocol:string,websocket:?boolean,key:?buffer.Buffer,cert:?buffer.Buffer}}
 */
aurora.http.ConfigServerType;
/**
 * @typedef {{responseHeaders:aurora.http.ResponseHeaders,request:http.IncomingMessage, response:http.ServerResponse,
 *          data:?, outUrl:string, cookies:Object<string,string>,url:(url.URL|undefined), token:?}}
 */
aurora.http.RequestState;

/**
 * @typedef {{servers:Array<aurora.http.ConfigServerType>,directoryBrowsing:boolean,defaultPage:string,sourceDirectory:string,serverDescription:string,theme:string}}
 */
aurora.http.ConfigType;

/**
 * @typedef {{server:?,config:aurora.http.ConfigServerType}}
 */
aurora.http.Server;

/**
 * @param {string} str
 * @return {string}
 */
aurora.http.escapeRegExp = function(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

(function() {

    var types = aurora.websocket.enums.types;
    var COMMANDS = aurora.websocket.enums.COMMANDS;
    //TODO: Send an object that contains a binary field.

    const node_http = require('http');
    const node_https = require('https');
    const mime = require('mime');
    const fs = require('fs');
    const path = require('path');
    const urlLib = require('url');
    const qs = require('querystring');
    const EventEmitter = require('events').EventEmitter;
    let themeGetter = function (req) {
        return config['http']['theme'];
    };
    
    aurora.http.serversUpdatedE = new EventEmitter();

    let makeThemePath = function (theme, fname) {
        return [__dirname, 'resources', 'htdocs', 'themes', theme, fname].join(path.sep);
    };

    /**
     * @param {!aurora.http.RequestState} state
     * @param {function(string)} cb
     **/
    aurora.http.loadTemplate = function (state, cb) {
        aurora.http.loadThemedFile('template.html', state, cb);
    };

    /**
     * @param {number} error
     * @param {!aurora.http.RequestState} state
     * @param {function(string)} cb
     **/
    aurora.http.loadError = function (error, state, cb) {
        aurora.http.loadTemplate(state, function (template) {
            aurora.http.loadThemedFile(
                'http' + error + '.html', state,
                function (errorTxt) {
                    cb(template.replace('{BODY}', errorTxt.toString()));
                });
        });
    };
    /**
     * @param {number} error
     * @param {!aurora.http.RequestState} state
     */
    aurora.http.writeError = function (error, state) {
        if (state.token === undefined) {
            aurora.auth.instance.loginPageCb(state);
            return;
        }
        state.response.writeHead(error, state.responseHeaders.toClient());
        aurora.http.loadError(error, state, function (txt) {
            state.response.end(txt);
        });
    };

    let loadFile = function (fname, cb) {
        fs.readFile(fname, function (error, data) {
            cb(error ? '' : data.toString());
        });
    };

    /**
     * @param {string} file
     * @param {!aurora.http.RequestState} state
     * @param {function(string, ?, ?)} cb
     **/
    aurora.http.statTheme = function (file, state, cb) {
        let theme = themeGetter(state);
        let fname = makeThemePath(theme, file);
        
        fs.stat(fname, function (err, stats) {
            let defTheme = config['http']['theme'];
            if (!err || defTheme === theme) {
                cb(fname, err, stats);
            }
            else {
                fname = makeThemePath(defTheme, file);
                fs.stat(fname, function (err, stats) {
                    cb(fname, err, stats);
                });
            }
        });
    };
    /**
     * @param {string} file
     * @param {!aurora.http.RequestState} state
     * @param {function(string)} cb
     **/
    aurora.http.loadThemedFile = function (file, state, cb) {
        let theme = themeGetter(state);
        let fname = makeThemePath(theme, file);
        // first check the current theme if it exists serve that
        fs.exists(fname, function (exists) {
            let defTheme = config['http']['theme'];
            if (exists || theme === defTheme) {
                loadFile(fname, cb);
            }
            else {
                loadFile(makeThemePath(defTheme, file), cb);
            }
        });
    };

    var callbacks = new goog.structs.AvlTree(recoil.util.object.compareKey);
    /**
     * @param {!aurora.http.RequestState} state
     **/
    aurora.http.notFound = function(state) {
        aurora.http.writeError(404, state);
    };
    aurora.http.getPost = function(request, callback) {
        if (request.method == 'POST') {
            var body = '';
            request.on('data', function(data) {
                body += data;
            });
            request.on('end', function() {
                callback(qs.parse(body));
            });
            return true;
        }
        return false;
    };

    /**
     * @param {function(aurora.http.RequestState):string} getter
     * 
     */
    aurora.http.setThemeGetter = function (getter) {
        themeGetter = getter;
    };

    /**
     *@return {string}
     */
    /**
     * @param {number} priority lower priority go first also if callback returns a non-false value
     * all other requests of the same priority are skipped
     * @param {RegExp|string} pattern
     * @param {function(aurora.http.RequestState):?} callback if this returns false then it will stop any more callbacks
     * @param {boolean} allowLocked (default false)
     */
    aurora.http.addRequestCallback = function(priority, pattern, callback, allowLocked) {
        var existing = callbacks.findFirst({key: priority});
        var pat = typeof (pattern) === 'string' ? new RegExp('^' + pattern) : pattern;
        var data = {pattern: pattern, callback: callback, allowLocked: allowLocked};
        if (existing) {
            existing.callbacks.push(data);
        }
        else {
            callbacks.add({key: priority, callbacks: [data]});
        }
    };
    /**
     * @param {RegExp|string} pattern
     * @param {function(aurora.http.RequestState):?} callback if this returns false then it will stop any more callbacks
     * @param {boolean=} opt_allowLocked default true, if true no lock check will be performed
     */
    aurora.http.addPreRequestCallback = function(pattern, callback, opt_allowLocked) {
        aurora.http.addRequestCallback(0, pattern, callback, opt_allowLocked == undefined ? true : false);
    };
    /**
     * @param {RegExp|string} pattern
     * @param {function(aurora.http.RequestState):?} callback if this returns false then it will stop any more callbacks
     * @param {boolean=} opt_allowLocked default false, if true no lock check will be performed
     */
    aurora.http.addMidRequestCallback = function(pattern, callback, opt_allowLocked) {
        aurora.http.addRequestCallback(5, pattern, callback, !!opt_allowLocked);
    };

    function startServer(type, port, callback, opt_options) {
        var running = true;
        var httpServer = (opt_options && type === node_https) ? type.createServer(opt_options, callback) : type.createServer(callback);
        var serverSockets = {}, nextSocketId = 0;
        httpServer.on('connection', function(socket) {
            var socketId = nextSocketId++;
            serverSockets[socketId] = socket;
            socket.on('close', function() {
                delete serverSockets[socketId];
            });
        });
        httpServer.shutdown = function(doneCb) {
            console.log('HTTP Server Shutdown ' + port, nextSocketId);
            httpServer.close(function() {
                for (var index in serverSockets) {serverSockets[index].destroy();}
                running = false;
                doneCb();
            });
        };
        httpServer.listen(port);
        return httpServer;
    }

    var responseHeadersDef = (function() {
        var headers = {'Server': [config['http']['serverDescription'] || 'AuroraHTTP'], 'Date': [(new Date()).toGMTString()]};
        return {
            set: function(name, value) {
                if (headers[name] !== undefined) {
                    headers[name].push(value);
                }
                else {
                    headers[name] = [value];
                }
            },
            get: function(name) {
                if (headers[name] !== undefined) {
                    if (headers[name].length === 1) {
                        return headers[name][0];
                    }
                    else {
                        return headers[name];
                    }
                }
                return undefined;
            },
            toClient: function() {
                var newHeaders = [];
                Object.keys(headers).forEach(function(name) {
                    headers[name].forEach(function(v) {
                        newHeaders.push([name, v]);
                    });
                });
                return newHeaders;
            }
        };
    });
    let themeAccess = function (state, dir, url, perm, cb) {
        let fname = path.resolve(path.join(dir, url));
        
        let parts = url ? url.split('/') : [];
        while(parts.length > 0 && (parts[0] === '' || parts[0] === '.')) {
            parts.shift();
        }
        let top = parts[0];
        if (top === 'themes') {
            // do not themes directly
            cb(fname, {code: 'ENOENT'});
        }
        else if (top === 'theme') {
            parts.shift();
            let theme = themeGetter(state);
            fname = path.resolve(path.join(dir, 'themes', theme, path.join.apply(null, parts)));
            fs.access(fname, perm, function (err) {
                if (err) {
                    let fname = path.resolve(path.join(dir, 'themes', config['http']['theme'], path.join.apply(null, parts)));
                    fs.access(fname, perm, function (err) {
                        cb(fname, err);
                    });
                    
                }
                else {
                    cb(fname, err);
                }
            });
            }
        else {
            
            
            fs.access(fname, perm, function (err) {
                cb(fname, err);
            });
        }
    };
    
    /**
     * sends a file to the client
     * this checks timestamps and sends not modified if already exits, it will also send the .gz
     * version if it exists if the opt_sendGz is set to true
     *
     * @param {string} path
     * @param {aurora.http.RequestState} state
     * @param {boolean=} opt_sendGz
     */
    function sendFile(path, state, opt_sendGz) {
        let response = state.response;
        let request = state.request;
        let headers = state.responseHeaders;
        var doSend = function(stats, path, decompress) {
            var reqDate = request.headers['if-modified-since'];
            if (reqDate !== undefined && new Date(reqDate).getUTCSeconds() === new Date(stats.mtime).getUTCSeconds()) {
                response.writeHead(304, headers.toClient());
                response.end();
            }
            else {
                headers.set('Content-Length', stats.size);
                if (decompress) {
                    headers.set('Content-Type', mime.getType(decompress));
                    headers.set('Content-Encoding', 'gzip');
                }
                else {
                    headers.set('Content-Type', mime.getType(path));
                }
                headers.set('Accept-Ranges', 'bytes');
                headers.set('Cache-Control', 'no-cache, must-revalidate');
                headers.set('Last-Modified', stats.mtime.toGMTString());
                response.writeHead(200, headers.toClient());

                var readStream = fs.createReadStream(path);
                readStream.pipe(/** @type {?} */(response));
                readStream.on('error', function(err) {
                    if (response !== null) {
                        aurora.http.writeError(500, state);
                    }
                });
                readStream.on('end', function(err) {
                    if (response) {
                        response.end();
                    }
                });
                request.on('close', function() {
                    readStream.unpipe(/** @type {?} */(response));
                    readStream.destroy();
                    if (response !== null) {
                        response.end();
                    }
                });
                request.on('aborted', function() {
                    readStream.unpipe(/** @type {?} */(response));
                    readStream.destroy();
                    if (response) {
                        try {
                            response.end();
                        }
                        catch (e) {
                            console.error('Assertion error during http abort.', e);
                        }
                    }
                });
            }
        };
        request.on('error', function(err) {
            aurora.http.writeError(500, state);
        });
        var checkAndSend = function(path, sendGz, decompress) {
            fs.stat(path, function(err, stats) {
                if (err) {
                    if (err.code == 'ENOENT') {
                        if (sendGz) {
                            checkAndSend(path + '.gz', false, path);
                            return;
                        }
                        else {
                            aurora.http.writeError(404, state);
                        }
                    }
                    else {
                        aurora.http.writeError(500, state);
                    }
                }
                else if (stats.isDirectory()) {
                    aurora.http.writeError(404, state);
                }
                else {
                    doSend(stats, path, decompress);
                }
                err = null;
                stats = null;
                request = null;
            });
        };
        checkAndSend(path, !path.endsWith('.gz') && opt_sendGz, null);
    }


    var resourcesBasePath = [__dirname, 'resources'].join(path.sep) + path.sep;
    var publicBasePath = [__dirname, 'resources', 'htdocs'].join(path.sep) + path.sep;
    aurora.http.BASE = publicBasePath;

    var sourceDir = path.resolve(__dirname + path.sep + config['http'].sourceDirectory);
    //Strict-Transport-Security: max-age=31536000
    //config.strictTransportSecurity
    var allRequests = [];
    aurora.http.printPending = function() {
        allRequests.forEach(function(s) {
            if (!s.response['finished'] || (s.response['socket'] && !s.response['socket']['destroyed'])) {
                console.log('pending', s.request.url);
            }
        });
    };

    function httpRequestHandler(request, response) {
        let cookies = {};
        let responseHeaders = responseHeadersDef();
        try {
            var newRequests = [];
            allRequests.forEach(function(s) {
                if (!s.response['finished']) {
                    newRequests.push(s);
                }

            });
            if (newRequests.length > 0) {
                console.log('pending requests', newRequests.length);
            }
            allRequests = newRequests;
            request.headers['cookie'] && request.headers['cookie'].split(';').forEach(function(cookie) {
                var parts = cookie.split('=');
                cookies[parts[0].trim()] = (parts[1] || '').trim();
            });


            let url = path.normalize(decodeURIComponent(request.url));
            let parsedUrl = urlLib.parse(url);
            var exit = false;
            let state = {request: request, cookies: cookies, responseHeaders: responseHeaders, response: response, url: parsedUrl, outUrl: url};
            //            allRequests.push(state);

            callbacks.inOrderTraverse(function(cb) {
                for (var i = 0; i < cb.callbacks.length; i++) {
                    var cur = cb.callbacks[i];
                    if (state.locked && !cb.allowLocked) {
                        continue;
                    }
                    if (cur.pattern.test(parsedUrl.pathname)) {
                        var res = cur.callback(state);
                        if (res === false) {
                            exit = true;
                            return true;
                        }
                    }
                }
                return false;
            });
            url = state.outUrl;
            if (exit) {
                return undefined;
            }
            switch (url) {
            case path.sep + 'client.min.js':
                if (config['http']['sourceDirectory'] !== undefined) {
                    responseHeaders.set('X-SourceMap', path.sep + 'client.min.js.map');
                }
                return sendFile(__dirname + path.sep + url, state, true);
            case '/favicon.ico':
                
                themeAccess(state, publicBasePath, '/theme/favicon.ico', fs.constants.R_OK, function(fsPath, err) {
                    if (err) {
                        aurora.http.writeError(404, state);
                    }
                    else {
                        sendFile(fsPath, state, true);
                    }
                });
                return;
            case path.sep + 'LICENSE':
                url = url + '.txt';
            case path.sep + 'LICENSE.txt':
            case path.sep + 'client.js':
            case path.sep + 'client.libs.js':                
            case path.sep + 'client.min.js.map':
            case path.sep + 'server.min.js.map':
                return sendFile(__dirname + path.sep + url, state, true);
            case path.sep:
            case '/':
                url += (config['http']['defaultPage'] || 'home');
            default:
                // check ith the url is in the theme directory if so then we need to them it
                themeAccess(state, publicBasePath, url + '.html', fs.constants.R_OK, function(fsPath, err) {
                    if (err === null) {
                        fs.readFile(fsPath, function(err, pageData) {
                            if (err) {
                                aurora.http.writeError(500, state);
                                return;
                            }
                            
                            response.writeHead(200, responseHeaders.toClient());
                            aurora.http.loadTemplate(state, function (template) {
                                response.end(template.replace('{BODY}', pageData.toString()));
                            });
                        });
                        return;
                    }
                    themeAccess(state, publicBasePath, url, fs.constants.R_OK, function(fsname, err) {
                        if (err && err['code'] === 'ENOENT') {

                            if (config['http']['sourceDirectory'] !== undefined) {
                                themeAccess(state, config['http']['sourceDirectory'], url, fs.constants.R_OK, function(fsname, err) {
                                    if (err && err.code === 'ENOENT') {
                                        aurora.http.writeError(404, state);
                                    }
                                    else {
                                        sendFile(fsname, state);
                                    }
                                });
                                return;
                            }

                            aurora.http.writeError(404, state);
                        }
                        else if (err) {
                            aurora.http.writeError(404, state);
                            console.log('REQUEST Error ' + request.method + ' ' + request.url + ' ' + request.connection.remoteAddress);
                        }
                        else {
                            sendFile(fsname, state);
                        }
                    });
                });
                break;
            }
        }
        catch (e) {
            aurora.http.writeError(500,/** {aurora.http.RequestState} */({request: request, cookies: cookies, responseHeaders: responseHeaders, response: response, url: undefined, outUrl: ''}));
            console.log('REQUEST Error ' + request.method + ' ' + request.url + ' ' + request.connection.remoteAddress);
            console.log(e);
        }
    }

    function shutdownAllServers(servers, done) {
        if (servers.length > 0) {
            servers.pop().server.shutdown(function() {
                shutdownAllServers(servers, done);
            });
        }
        else {
            done();
        }
    }


    var httpServers = {};
    function loadServers() {
        shutdownAllServers(Object.values(httpServers), function() {
            httpServers = {};
            config['http']['servers'].forEach(function(serverConfig) {
                if (serverConfig.port !== undefined) {
                    if (serverConfig.protocol === 'https') {
                        serverConfig['key'] = fs.readFileSync((serverConfig.key || 'resources/defaultKey.pem'));
                        serverConfig['cert'] = fs.readFileSync((serverConfig.cert || 'resources/defaultCert.pem'));
                        httpServers[serverConfig.port + ''] = /** @type {aurora.http.ConfigServerType} */ ({server: startServer(node_https, serverConfig.port, httpRequestHandler, serverConfig), config: serverConfig});
                        aurora.http.serversUpdatedE.emit(serverConfig.port + '', httpServers[serverConfig.port + '']);
                    }
                    else if (serverConfig.protocol === 'http') {
                        httpServers[serverConfig.port + ''] = /** @type {aurora.http.ConfigServerType} */({server: startServer(node_http, serverConfig.port, httpRequestHandler, serverConfig), config: serverConfig});
                        aurora.http.serversUpdatedE.emit(serverConfig.port + '', httpServers[serverConfig.port + '']);
                    }
                    else {
                        console.error('HTTP Server config entry contains an unsupported protocol.', serverConfig);
                    }
                }
                else {
                    console.error('HTTP Server config entry does not specify a port.', serverConfig);
                }
            });
            aurora.http.serversUpdatedE.emit('update', httpServers);
        });
    }

    /**
     * @param {string} filePath the location of the physical file
     * @param {aurora.http.RequestState} state
     * @param {string=} opt_filename
     */
    aurora.http.sendFileDownload = function(filePath, state, opt_filename) {
        if (opt_filename) {
            state.responseHeaders.set('Content-Disposition', 'attachment;filename=' + path.basename(opt_filename));
        }
        sendFile(filePath, state);
    };
    /**
     * @param {RegExp} url
     * @param {string} file
     * @param {function(function(string,string=),?=)|string} sendFileNameCB a callback or a string to get the filename, this may be nessary because you may want to
     * @param {boolean=} opt_allowLocked default false, if true no lock check will be performed
     * send the modified date or the current date as part of the filename
     */
    aurora.http.sendFileDownloadToURL = function(url, file, sendFileNameCB, opt_allowLocked) {
        var nameCallback = typeof(sendFileNameCB) === 'string' ?
                function(cb1) {
                    cb1(sendFileNameCB, undefined);
                } : sendFileNameCB;

        aurora.http.addMidRequestCallback(url, function(state) {
            nameCallback(function(name, filePath) {
                filePath = filePath || file;
                aurora.http.sendFileDownload(filePath, state, name);
            }, state);
            return false;
        }, opt_allowLocked);
    };

    /**
     * @param {aurora.http.RequestState} state
     * @param {string} filename
     * @return {{dataCB:function(?),endCB:function(?)}}
     *
     */
    aurora.http.sendDataAsyncDownload = function(state, filename) {
        let headers = state.responseHeaders;
        let request = state.request;
        let response = state.response;
        headers.set('Content-Disposition', 'attachment;filename=' + filename);
        request.on('error', function(err) {
            done = true;
            aurora.http.writeError(500, state);
        });

        headers.set('Content-Type', mime.getType(filename));
        headers.set('Accept-Ranges', 'bytes');
        //headers.set('ETag',crypto.createHash('md5').update(data).digest('hex'));

        var gotData = false;
        var done = false;
        return {
            dataCB: function(data) {
                if (done) {
                    return;
                }
                if (!gotData) {
                    response.writeHead(200, headers.toClient());
                }
                gotData = true;
                response.write(data);
            },
            endCB: function(error) {
                if (done) {
                    return;
                }

                done = true;
                if (!gotData && error) {
                    response.writeHead(500);
                }
                response.end();

            }
        };
    };
    process.chdir(__dirname);
    config.configE.on('http/servers', loadServers);
    setTimeout(loadServers, 1);

}());
