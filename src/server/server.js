const https = require('https'),
http = require('http'),
httpLib = http;
fs = require('fs');

var configLog = LOG.createModule("CONFIG");

var configPath = (process.argv.length>2)?process.argv[2]:__dirname+"/config.json";



var configChangedE = FILE.watchE(configPath).delayE(1000);
//fs.unwatchFile(configPath)
var config = JSON.parse(fs.readFileSync(configPath, 'utf8').replaceAll("\r", "").replaceAll("\n", ""));
var configE = F.mergeE(F.oneE(), configChangedE).mapE(function(){
	try{
		return fs.readFileSync(configPath, 'utf8').replaceAll("\r", "").replaceAll("\n", "");
	}
	catch(e){configLog.error("Config Error");configLog.error(e);}
}).filterUndefinedE().filterRepeatsE().mapE(function(configStr){
	try{
		config = JSON.parse(configStr);
		return config;
	}
	catch(e){configLog.error("Config Parse Error");configLog.error(e);}
});
if(config.path!==undefined){
	configLog.info("Changing to "+config.path);
    process.chdir(config.path);
}

const path = require('path'),
util = require('util'),
mime = require('mime'),
lib_url = require('url'),
qs = require('querystring'),
crypto = require('crypto');  

WebSocketServer = require('websocket').server;

var DATA = {};
var AUTHENTICATION = {};
var faviconExists = false;
var themeHTML = "ERROR";
var theme404 = "404";

var HTTP = (function(http, dataManager, authentication){
    http.SID_STRING = 'sesh';
    
    var TIMEOUT = 3*60*1000;
    F.mergeE(F.oneE(), configE).mapE(function(){
        try{themeHtml = fs.readFileSync(__dirname + "/themes/"+config.theme+"/index.html", 'utf8');}catch(e){log.error(e);}
        try{theme404 = fs.readFileSync(__dirname + "/themes/"+config.theme+"/404.html", 'utf8');}catch(e){log.error(e);}
        try{faviconExists = fs.existsSync(__dirname + "/themes/"+config.theme+"/favicon.ico");}catch(e){log.error(e);}
    });
    
    var httpReqE = F.receiverE();
    http.ipSwapCommitE = F.receiverE();
    var websocketRequestE = F.receiverE();   
    
    //This code provides the ability for an external module to intercept an http request.
    var preRequestCallbacksE = F.receiverE();
    var preRequestCallbacksB = preRequestCallbacksE.collectE({callbacks: []}, function(callback, state){state.callbacks.push(callback);return state;}).startsWith(SIGNALS.NOT_READY);
    http.addPreRequestCallback = function(cb){preRequestCallbacksE.sendEvent(cb);};
    
    var midRequestCallbacksE = F.receiverE();
    var midRequestCallbacksB = midRequestCallbacksE.collectE({callbacks: []}, function(callback, state){state.callbacks.push(callback);return state;}).startsWith(SIGNALS.NOT_READY);
    http.addMidRequestCallback = function(cb){midRequestCallbacksE.sendEvent(cb);};    

    var configureHttp = function(config){
    	if(config.httpPort===undefined){
    		log.info("HTTP Not configured");
    		return;
    	}
    	log.info("Configuring new http server");
    	http.httpServer = HTTP.startHTTPServerE(config.httpPort, httpReqE);
    	if(config.forceSSL!==true){
    		http.websocketServer = HTTP.createWebSocket(http.httpServer, websocketRequestE);
    	}
    };
    var configureHttps = function(config){
    	if(config.sslPort===undefined){
    		log.info("SSL has not been configured");
			return;
		}
		var pemPath = config.sslPemfile!==undefined&&fs.existsSync(config.sslPemfile)?config.sslPemfile:__dirname+"/data/server.crt";
		var privKeyPath = config.sslPrivkey!==undefined&&fs.existsSync(config.sslPrivkey)?config.sslPrivkey:__dirname+"/data/server.key";
		var caPath = config.caFile!==undefined&&fs.existsSync(config.caFile)?config.caFile:__dirname+"/data/rootCA.pem";
		if(fs.existsSync(pemPath) && fs.existsSync(privKeyPath)){
	        log.info("Starting HTTPS Server on port "+config.sslPort);   

	        var options = {
	            key: fs.readFileSync(privKeyPath),
	            cert: fs.readFileSync(pemPath)
	        };
	        
	        if(fs.existsSync(caPath)){
	            options.ca = fs.readFileSync(caPath);
	        }
	        
	        //TODO Handle the config option sslUseSslv3
	        if(config.sslCipherList!==undefined){
	        	options.ciphers = config.sslCipherList;
	        }
	        
	        http.httpsServer = HTTP.startHTTPSServerE(config.sslPort, httpReqE, options);
	        http.secureWebsocket = HTTP.createWebSocket(http.httpsServer, websocketRequestE);
	    }
		else{
			log.error("SSL has been configured but the certificate and key cannot be found at "+pemPath+" "+privKeyPath);
		}
    };
    
    configE.mapE(function(config){
    	configLog.info("Loading Config");

    	if(http.websocketServer!==undefined){http.websocketServer.shutDown();}	
    	if(http.httpServer!==undefined){
    		log.info("Closing existing http server");
	    	http.httpServer.close(function(){http.httpServer = undefined; configureHttp(config);});
    		http.httpServer.shutdown();
    		
    	}
    	else{configureHttp(config);}
    	if(http.secureWebsocketServer!==undefined){http.secureWebsocketServer.shutDown();}
    	if(http.httpsServer!==undefined){
    		log.info("Closing existing https server");
    		http.httpsServer.close(function(){http.httpsServer = undefined; configureHttps(config);});
    		http.httpsServer.shutdown();
    		
    	}
    	else{configureHttps(config);}
    });
    
    log.info('Server started');

    var responseHeadersDef = (function(){
    	var headers = {"Server":["CTR Portal"], "Date":[(new Date()).toGMTString()]};
    	return {
    		set:function(name, value){
    			if(headers[name]!==undefined){
    				headers[name].push(value);
    			}
    			else{
    				headers[name] = [value];
    			}
    		},
    		get:function(name){
    			if(headers[name]!==undefined){
    				if(headers[name].length===1){
    					return headers[name][0];
    				}
    				else{
    					return headers[name];
    				}
    			}
    		},
    		toClient: function(){
    			var newHeaders = [];
    			for(var name in headers){
    				for(var index in headers[name]){
    					newHeaders.push([name, headers[name][index]]);
    				}
    			}
    			return newHeaders;
    		}
    	};
    });
    http.generateToken = function () {
        return {token: crypto.randomBytes(10).toString("hex"), seriesId: crypto.randomBytes(10).toString("hex")};    	
    }
    http.httpPreRequestE = httpReqE.mapE(function(arg){
    	var responseHeaders = responseHeadersDef();
    	var request = arg.request;
        var response = arg.response;
        
        request.ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress;
        
        request.url = lib_url.parse(request.url);
        
        if (config.forceSSL===true && request.client.encrypted===undefined) {
            var port = config.sslPort===443?"":":"+config.sslPort;
            HTTP.redirect(response, 'https://' + request.headers.host.replace(":"+config.httpPort, port) + request.url.path);
            return; // go no further
        }
        
		try{
			request.query = request.url.query===undefined?{}:qs.parse(request.url.query);
       	}
       	catch(e){
       		log.error("HTTP Query Error, unable to parse using qs. "+e, request.url.query, arg.user.ip, arg.user.userAgent);
       	}
        

        if (request.url.path === "/ipchange" && request.method === 'POST') {
            var body = "";
            request.on('data', function (data) {
                body+=data;
            });


            request.on('end', function () {
                var data = qs.parse(body);
                var protocol = request.client.encrypted ? "https://" : "http//";
                if (data.url !== undefined && data.cookie !== undefined) {
//                    log.info("redirecting to", data.url, data.cookie, arg.user.ip, arg.user.userAgent);
                    var newCookies = data.cookie.split(";");
                    var sess;
                    for (var i =0 ; i < newCookies.length; i++) {
                        var cookie = newCookies[i].trim();
                        if (cookie.startsWith('sesh=')) {
                            sess = cookie.split('=')[1];
                        }
                        responseHeaders.set('Set-Cookie',cookie+'; Path=/;');
                    }
                    responseHeaders.set('Location' , data.url);
	            response.writeHead(307, responseHeaders.toClient());
                    response.end();

                    if (data.committing ==='true' && sess) {
                        var split = sess.split("-");
                        if (split.length === 2) {
                            http.ipSwapCommitE.sendEvent({token: split[0], series: split[1], data: data});
                        }
                    }

                }
                else {
                    HTTP.redirect(response, '/');
                }
                // use post['blah'], etc.
            });
            return;
        }            
        
        //Build list of cookies
        var cookies = {};
        if(cookies.sesh!==undefined){
        	var sp = cookies.sesh.split("-");
            if(sp.length===2){
        	    arg.user = authentication.getUser(sp[0], request);
                console.log("user =", arg.user);
            }
        }
        
        
        request.headers.cookie && request.headers.cookie.split(';').forEach(function( cookie ) {
            var parts = cookie.split('=');
            cookies[parts[0].trim()] = (parts[1] || '').trim();
        });

        var userId = undefined;
        var groupId = undefined;
        var newTokenPair = undefined;
        //Create session token
        if(cookies[http.SID_STRING]===undefined || (!cookies[http.SID_STRING].contains("-"))){    //TODO: Handle the case where the server reboots but a client still has an active auth token in session
            //var tokenPair = AUTHENTICATION.createNewTokenSeriesPair(AUTHENTICATION.sessionTableB.valueNow(), 10);
           log.debug("Creating new token");
            newTokenPair = http.generateToken();
            cookies[http.SID_STRING] = newTokenPair.token+"-"+newTokenPair.seriesId;
            responseHeaders.set('Set-Cookie',http.SID_STRING+'='+cookies[http.SID_STRING]+'; Path=/;');
            //log.info("2 Setting token to "+cookies[http.SID_STRING]);
        }
        else{
            var row = TABLES.UTIL.findRow(authentication.sessionTableB.valueNow(), cookies[http.SID_STRING].split("-")[0]);
            if(row!==false){
                userId = row.userId;
                groupId = row.groupId;
            }
            else{
            	log.debug("Token exists but cant find you in database "+cookies[http.SID_STRING], request.ip, request.headers["user-agent"]);           //, arg.user.ip, arg.user.userAgent
            	//responseHeaders.set('Set-Cookie',http.SID_STRING+'=deleted;Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT');

                newTokenPair = http.generateToken();
                cookies[http.SID_STRING] = newTokenPair.token+"-"+newTokenPair.seriesId;
                responseHeaders.set('Set-Cookie',http.SID_STRING+'='+cookies[http.SID_STRING]+'; Path=/;');

            	//Recreate a new token
            	//newTokenPair = {token: crypto.randomBytes(10).toString("hex"), seriesId: crypto.randomBytes(10).toString("hex")};
                //cookies[http.SID_STRING] = newTokenPair.token+"-"+newTokenPair.seriesId;
                //responseHeaders.set('Set-Cookie',http.SID_STRING+'='+cookies[http.SID_STRING]+'; Path=/;');
                //log.info("1 Setting token to "+cookies[http.SID_STRING]);
            }
        }
        //log.info("Client: "+groupId+" "+cookies[http.SID_STRING]+" "+request.url.pathname);
        request.url.pathname = (request.url.pathname==="/")?"/"+config.defaultPage:request.url.pathname.replaceAll("../", "");
        var ret = {host: request.headers.host, url:request.url, encrypted: request.client.encrypted, cookies: cookies, userId: userId, groupId: groupId, request: request, response: response, newTokenPair:newTokenPair, responseHeaders:responseHeaders, user:arg.user};
        if(cookies.sesh!==undefined){
        	var sp = cookies.sesh.split("-");
        	if(sp.length===2){
            	ret.token = sp[0];
            	ret.seriesId = sp[1];
            }
        }
        request.identityString = (ret.userAgent || "") + " " + ret.ip;
        return ret;
    }).filterUndefinedE();
    
    http.newTokenE = http.httpPreRequestE.filterE(function(req){
        return req.newTokenPair!==undefined;
    }).mapE(function(req){
        var ret = req.newTokenPair;
        ret.connection = req.connection;
        return ret;
    });


    http.httpMidRequestE = http.httpPreRequestE.mapE(function(state){

        var preReqCallBacks = preRequestCallbacksB.valueNow();
        if(preReqCallBacks!==SIGNALS.NOT_READY){
            for(var index in preReqCallBacks.callbacks){
                var val = preReqCallBacks.callbacks[index](state);
                if(val===false){
                    return undefined;
                }
                else if(val!==undefined){
                    return val;
                }   
            }
        }
        
        return state;
    }).filterUndefinedE();
    
    http.httpRequestE = http.httpMidRequestE.mapE(function(state){

        var midReqCallBacks = midRequestCallbacksB.valueNow();
        if(midReqCallBacks!==SIGNALS.NOT_READY){
            for(var index in midReqCallBacks.callbacks){
                var val = midReqCallBacks.callbacks[index](state);
                if(val===false){
                    return undefined;
                }
                else if(val!==undefined){
                    return val;
                }   
            }
        }
        
        return state;
    }).filterUndefinedE();
    http.keepAliveE = http.httpRequestE.filterE(function (state) {
        return state !== undefined && state.token !== undefined, state.seriesId != undefined;
    });


    
    http.httpRequestE.mapE(function(requestData){
        var request = requestData.request;
        var response = requestData.response;
        var responseHeaders = requestData.responseHeaders;
        var blockedUrls = ["/src", "/server.js", "/data", "/node_modules"];
        
        try {
            //Force SSL
            if (requestData.url === undefined) {
                console.log("REQUEST", requestData);
            }
            if(requestData.url.pathname==="/LICENSE.txt"){		//This is needed for the sourcemap
        	HTTP.sendFile(__dirname + "/LICENSE.txt", request, response, responseHeaders);
            }
            else if(requestData.url.pathname==="/LICENSE"){		//This is needed for the sourcemap
        	response.writeHead(200, responseHeaders.toClient());
                response.write(themeHtml.replace("{CONTENT}", (fs.readFileSync(__dirname + "/LICENSE.txt")+"").replaceAll("\n", '<br />\n')).replace("{HEAD}", ''), 'utf8');
                response.end();
            }
            else if(requestData.url.pathname==="/client.min.js"){		//This is needed for the sourcemap
        	HTTP.sendFile(__dirname + "/client.min.js", request, response, responseHeaders);
            }
            else if(faviconExists && requestData.url.pathname==="/favicon.ico"){
        	HTTP.sendFile(__dirname + "/themes/"+config.theme+"/favicon.ico", request, response, responseHeaders);
            }
            else if(requestData.url.pathname.indexOf("/request/getPage/")!==-1){
                HTTP.sendFile(__dirname + "/resources/pages/"+requestData.url.pathname.replace("/request/getPage/", "")+".html", request, response, responseHeaders);
            }
            else if (fs.existsSync(__dirname + "/resources/pages"+requestData.url.pathname+".html")) { 
                response.writeHead(200, responseHeaders.toClient());
                response.write(themeHtml.replace("{CONTENT}", fs.readFileSync(__dirname + "/resources/pages"+requestData.url.pathname+".html")).replace("{HEAD}", ''), 'utf8');
                response.end();                                                                                                                                                                     
            }
            else if (fs.existsSync(__dirname + requestData.url.pathname)) { 
                for(var index in blockedUrls){
                    if(requestData.url.pathname.replaceAll("../", "").startsWith(blockedUrls[index])){
                        HTTP.writeError(404, response);
                        return;
                    }
                }
                
                var fileStat = fs.statSync(__dirname + requestData.url.pathname);
                if(fileStat.isFile()){
                    HTTP.sendFile(__dirname + requestData.url.pathname, request, response, responseHeaders);
                }
                else if(config.directoryBrowsing && fileStat.isDirectory()){
                    HTTP.readDirectory(response, requestData.url.pathname);
                }
                else{
            	    response.writeHead(404, responseHeaders.toClient());
                    response.write(themeHtml.replace("{CONTENT}", theme404).replace("{HEAD}", ''), 'utf8');
                    response.end();
                }
            }
            else{
                log.debug(requestData.url.pathname);
                log.debug("Cannot find requested file "+requestData.url.pathname, requestData.ip, request.headers["user-agent"]);
                response.writeHead(404, responseHeaders.toClient());
                response.write(themeHtml.replace("{CONTENT}", theme404).replace("{HEAD}", ''), 'utf8');
                response.end();
            }
        }
        catch (e) {}
    });
    
    var getTokenFromWS = function(request){
        for(var index in request.cookies){
            if(request.cookies[index].name==="sesh"){
                var sesh = request.cookies[index].value.split("-");
                return {token: sesh[0], seriesId:sesh[1]};
            }
        } 
        return false;   
    };

    //Websocket Handling
    http.wsConnectionOpenE = websocketRequestE.mapE(function(request){
        var connection = request.accept('aurora_channel', request.origin);
        var clientId = request.key;
        connection.clientId = clientId;
        var token = undefined;
        var seriesId = undefined;
        var tokenPair = getTokenFromWS(request);
        if(tokenPair!==false){
            token = tokenPair.token;
            seriesId = tokenPair.seriesId;
        }
        return {connection: connection, token:token, seriesId:seriesId, clientId:clientId, user: authentication.getUser(token, request.httpRequest), httpRequest:request.httpRequest};
    });
    
    http.wsConnectionOpenE.mapE(function(packet){  //Sideeffects and updaters go here.
        packet.connection.sendUTF(JSON.stringify({command: AURORA.COMMANDS.VERSION, data: AURORA.VERSION}));
    });
    
    var wsEventE = F.receiverE();
    
    http.wsStringUpdateE = wsEventE.filterE(function(e){
        return !Buffer.isBuffer(e.data);
    	//return e.type!==undefined && e.type!=="binary";
    }).mapE(function(e){
        // shallow clone
        var clone = goog.object.clone(e);
        clone.data = OBJECT.clone(e.data);
        return clone;
    });

    http.wsBinaryUpdateE = wsEventE.filterE(function(e){
    	return Buffer.isBuffer(e.data);
    	//return e.type!==undefined && e.type==="binary";
    }).mapE(function(e){
        return {type: e.type, data:new Buffer(e.data), clientId: e.clientId, connection:e.connection, token:e.token, user:e.user, httpRequest:e.httpRequest};
    });

    http.wsConnectionOpenE.mapE(function(packet){
        packet.connection.on('error', function(error){
            wsEventE.sendEvent(SIGNALS.newError("Websocket Connection Error: "+error));
        });
        packet.connection.on('message', function(message){
        	if(message.type==="binary"){
        		wsEventE.sendEvent({type: message.type, data: message.binaryData, clientId:packet.clientId, connection:packet.connection, token:packet.token, user: packet.user, httpRequest:packet.httpRequest});
        	}
        	else{
            	wsEventE.sendEvent({type:message.type, message: message, clientId:packet.clientId, connection:packet.connection, token:packet.token, user: packet.user, httpRequest: packet.httpRequest});
           }
        });
        packet.connection.on('close', function(reasonCode, description) {
            //OBJECT.delete(connections, id); 
            //dataThread.send({data: {command: AURORA.COMMANDS.DEREGISTER_DATA}, clientId: id});
            //Inform the session  manager to drop the connection
           // dataThread.send({command: AURORA.COMMANDS.AUTH.DROP_CONNECTION, data: id}); 
            if(packet.user!==undefined){
                log.debug("Connection Close Request: "+packet.clientId, packet.user.ip, packet.user.userAgent);
            }
            else{
                log.debug("Connection Close Request: "+packet.clientId);
            }
            wsEventE.sendEvent({close:true, clientId:packet.clientId, token: (packet.user!==undefined)?packet.user.token:undefined, user: packet.user});
        });
    });
    
    http.wsConnectionCloseE = http.wsStringUpdateE.filterE(function(eventData){return eventData.close!==undefined;});
    var wsConnectionErrorE = http.wsStringUpdateE.filterE(function(eventData){return !good(eventData);});
    
    
    
    //Replace this wsMessage thing with a channel for reqeuesting pages and authenticating.
    
    var wsMessageE = http.wsStringUpdateE.filterE(function(eventData){return eventData.message!==undefined;}).mapE(function(packet){
    // LOG.create("wsMessageE: Token Is "+packet.token);
       //log.debug(Object.keys(packet.connex));
        if(packet.message.type=="utf8"){
            try{
                var parsedData = JSON.parse(packet.message.utf8Data);
                packet.data = parsedData.message;
                packet.token = parsedData.token;
                OBJECT.remove(packet, "message");
                return packet;
            }
            catch(e){
                log.error(AURORA.ERRORS.WEBSOCKET_RECEIVE(e), packet.user.ip, packet.user.userAgent);
            }           
        }  
    }).filterUndefinedE();

    http.userAuthenticationE = wsMessageE.filterE(function(packet){return packet.data.command===AURORA.COMMANDS.AUTHENTICATE || packet.data.command===AURORA.COMMANDS.UNAUTHENTICATE;}).mapE(function(packet){
        return packet;
    });

    http.requestPageE = wsMessageE.filterE(function(packet){;return packet.data.command===AURORA.COMMANDS.REQUEST_PAGE;});
    http.requestPageE.mapE(function(packet){
        var pagePath = __dirname+"/resources/pages/"+packet.data.data.replaceAll("../", "").replaceAll("./", "")+".html";
        log.debug("Requesting "+pagePath);
        if(fs.exists(pagePath, function(exists){
        	packet.connection.sendUTF(JSON.stringify({command: AURORA.RESPONSES.PAGE, data: exists?fs.readFileSync(pagePath, "utf8"):theme404}));
        }));
    });
    return http;
}(HTTP || {}, DATA, AUTHENTICATION));

var DATA = (function(dataManager, aurora, http, binary, authentication){
	//Handle client Data Channel signals.
	var receiveE = function(pluginKey, pluginId, channelId){
		return http.wsBinaryUpdateE.filterE(function(packet){
			if(Buffer.isBuffer(packet.data) && packet.data.length>=4){
			    return packet.data.readUInt16LE(0)===pluginId && packet.data.readUInt16LE(2) === channelId;
			}
		    console.error("Websocket Binary Message bad length", packet.data.length, Buffer.isBuffer(packet.data), packet.data);
			return false;
		}).mapE(function(packet){
                    packet = goog.object.clone(packet);
			packet.data = packet.data.slice(4);
			return packet;
		});
	};
    
	dataManager.connectionsB = F.mergeE(http.wsConnectionCloseE, http.wsConnectionOpenE).collectE({}, function(packet, connections){
        if(packet.close!==undefined && connections[packet.clientId]!==undefined){
            OBJECT.remove(connections, packet.clientId);
        }
        else{

            connections[packet.clientId] = packet.connection;
            connections[packet.clientId].token = packet.token;
            
        }
        return connections;
    }).startsWith(SIGNALS.NOT_READY);
    
    var dataSourceRegisterE = F.receiverE();
    var dataSourcesE = dataSourceRegisterE.collectE({}, function(update, dataSources){
        dataSources[update.key] = update;
        return dataSources;
    });
    var dataSourcesB = dataSourcesE.startsWith(SIGNALS.NOT_READY);
    dataManager.dataSourcesB = dataSourcesB;
    var dataRegR = F.receiverE(); 
    dataManager.registrationRequestE = dataRegR; 
    dataManager.dataRegE = F.mergeE(dataRegR, http.wsConnectionCloseE).collectE({}, function(websocketPacket, dataReg){  
        var clientId = websocketPacket.clientId; 
        if(websocketPacket.close!==undefined){
            for(var key in dataReg){
                ARRAYS.remove(dataReg[key], clientId, true);
                if(dataReg[key]&&dataReg[key].length==0){
                    OBJECT.remove(dataReg, key);
                }
            }         
        }
        else if(websocketPacket.data.command!==undefined && websocketPacket.data.key!==undefined){
            var command = websocketPacket.data.command;
            var key = websocketPacket.data.key;
            var registered = dataReg[key]!=undefined && ARRAYS.arrayContains(dataReg[key],clientId);

            if(command == AURORA.COMMANDS.REGISTER_DATA){
                var dataSources = dataSourcesB.valueNow();	//Send the current value back to the user upon registration
               
                var handleAuthentication = dataSources[key]!==undefined&&dataSources[key].handleAuthentication!==undefined?dataSources[key].handleAuthentication:true;
                if(handleAuthentication && !AUTHENTICATION.clientCanRead(clientId, websocketPacket.data.pluginId, websocketPacket.data.channelId)){
                    AUTHENTICATION.log.warn("User has requested "+key+" but they dont have access.", websocketPacket.user.ip, websocketPacket.user.userAgent);
                    return dataReg;
                }
                
				if(dataSources[key]!==undefined && dataSources[key].channel!==undefined && dataSources[key].behaviour!==undefined){
					dataSources[key].channel.send(Buffer.concat([new Buffer([1]), new Buffer(JSON.stringify(dataSources[key].behaviour.valueNow()))]), websocketPacket.connection);	
				}
                if(dataSourcesB.valueNow()[key]!==undefined){
	                if(dataReg[key]==undefined){
	                    dataReg[key] = [];
	                }
	                if(!ARRAYS.arrayContains(dataReg[key], clientId)){
	                    dataReg[key].push(clientId);
	                }
                }
                else{
                    log.debug("registerClientRequest: Cant find key!!!"+key, websocketPacket.user.ip, websocketPacket.user.userAgent);
                }
            }
            else if(command === AURORA.COMMANDS.DEREGISTER_DATA){
                if(dataReg[key]){
                    ARRAYS.remove(dataReg[key], clientId, true);
                }
                if(dataReg[key]&&dataReg[key].length==0){
                    OBJECT.remove(dataReg, key);
                }
            }
        }
        return dataReg;
    });
    dataManager.dataRegB = dataManager.dataRegE.startsWith(SIGNALS.NOT_READY);

    //Determine who to send this data to.
    dataManager.sendData = function(key, value, type){
    	var DATA_REG = dataManager.dataRegB.valueNow();    
        if(DATA_REG[key]){
            var connections = dataManager.connectionsB.valueNow();
            for(var index in DATA_REG[key]){
            	var found = false;
                var clientId = DATA_REG[key][index];
                if(connections[clientId]!=undefined){                    
                    if(type==="binary"){
                        connections[clientId].sendBytes(value);
                    }
                    else{
                       connections[clientId].sendUTF(JSON.stringify({command: aurora.COMMANDS.UPDATE_DATA, key: key, data: value}));
                    }
                }
                else{
                	log.debug("No parties interested in "+key);
                }
            }
        }
    };
/*
    //Catch object updates and send them to the client
    dataSourceRegisterE.mapE(function(packet){
        var data = packet.data;
        var key = packet.key;
        var type = packet.type;
         var DATA=dataSourcesB.valueNow();
        if(data instanceof F.EventStream){
            data.mapE(function(value){
                dataManager.sendData(key, value, type);
            });
        }
        else if(data instanceof F.Behavior){
            F.liftB(function(key, value, type){
                dataManager.sendData(key, value, type);
            }, F.constantB(key), data, F.constantB(type));
            dataManager.sendData(key, DATA[key].valueNow(), type);
        }
    });
*/
    dataManager.setValue = function(key, value){ 
        var DATA=dataSourcesB.valueNow();
        if(DATA[key]==undefined){
            log.debug("setValue: Unable to find "+key+" you have not added this to the register. Without registration security cannot be applied.");
            return;
        }
        if(DATA[key].sendEvent!=undefined){
            DATA[key].sendEvent(value);
        }
        else{
            log.debug("Attempt to set "+key+" no sendEvent function");
        }
    };

    //Easy registration methods
    F.EventStream.prototype.sendToClients = function(key, channelId, description){
    	var pluginId = typeof(key)==="number"?key:aurora.plugins[key];
		var newKey = (key + "_" + (channelId===undefined?"":channelId));
		
    	var channelE = dataManager.getChannelE(key, channelId, description);
    	this.mapE(function(data){
    		channelE.send(data);
    	});
    	dataSourceRegisterE.sendEvent({key:newKey, pluginId:pluginId, channelId:channelId, description: description || "", channel: channelE});
    	return channelE;
    };
    F.Behavior.prototype.sendToClients = function(key, channelId, description){
    	var channelE = dataManager.getChannelE(key, channelId, description);
    	
    	var pluginId = typeof(key)==="number"?key:aurora.plugins[key];
		var newKey = (key + "_" + (channelId===undefined?"":channelId));
    	
    	var objectBI = F.liftBI(function(packet){
    		var data = packet;
    		//log.info("PACKET", typeof(packet));
    		if(typeof(data)==="object" || typeof(data)==="number"){
    			data = JSON.stringify(data);
    		}
    		if(typeof(data)==="string"){
    			data = new Buffer(data);
    		}
    		if(Buffer.isBuffer(data)){
    			channelE.send(Buffer.concat([new Buffer([1]), data]));
    		}
    		else{
    			AUTHENTICATION.warn("Object "+newKey+" Has an unknown type of "+typeof(data));
    		}
			return packet;
		},function(packet){
			return [packet];
		}, this);
		
		dataSourceRegisterE.sendEvent({key:newKey, pluginId:pluginId, channelId:channelId, description: description || "", behaviour: objectBI, channel: channelE});

		channelE.mapE(function(packet){
			try{
				packet.data = JSON.parse(packet.data.toString());
				if(TABLES.UTIL.isTable(packet.data)){
					channelE.send(Buffer.concat([new Buffer([1]), new Buffer(JSON.stringify(packet.data))]), packet.clientId);
					var applyId = packet.data.tableMetaData.applyId;
					OBJECT.remove(packet.data.tableMetaData, "applyId");
				}
				objectBI.sendEvent(packet.data);
			}
			catch(e){
				log.error("Error during data transport.", LOG.ERROR, "DATA TRANSPORT", packet.data, e, packet.user.ip, packet.user.userAgent);
			}
		});
		return objectBI;
    };    
    
    //Authentication and Data Tables
    var dataRegTableE = dataManager.dataRegE.mapE(function(dataReg){
       var userSourcesData = [];
       var clients = {};
       var count = 0;
       for(var objectKey in dataReg){
           userSourcesData.push({index: ++count, key: objectKey, users: dataReg[objectKey]}); 
           for(var index in dataReg[objectKey]){
               var clientId = dataReg[objectKey][index];
               if(clients[clientId]==undefined){
                   clients[clientId] = [];
               }
               clients[clientId].push(objectKey);
           }
       }
       
       var clientsMapData = [];
       var count = 0;
       for(var clientId in clients){
           clientsMapData.push({index: ++count, clientId: clientId, dataSources: clients[clientId]});
       }
       return {sourcesAdminTable: TABLES.parseTable("dataSourcesAdmin", "index", userSourcesData, {
             index:{name: "Index", type: "number"},
             key:{name: "Key", type: "string"},
             users:{name:"users", type:"list"}
        }), usersDataSources: TABLES.parseTable("usersDataSources", "index", clientsMapData, {
             index:{name: "Index", type: "number"},
             clientId:{name: "Client", type: "string"},
             dataSources:{name:"Data Sources", type:"list"}
        })};
    });
    
    dataManager.getChannelE = function(pluginKey, channelId, tagName, handleAuthentication){
        handleAuthentication = handleAuthentication===undefined?true:handleAuthentication;
		var pluginId = typeof(pluginKey)==="number"?pluginKey:aurora.plugins[pluginKey];
		var newKey = (pluginKey + "_" + (channelId===undefined?"":channelId));
		dataSourceRegisterE.sendEvent({key:newKey, pluginId:pluginId, channelId:channelId, description: (tagName || ""), handleAuthentication:handleAuthentication});
		var channelE = receiveE(newKey, pluginId, channelId===undefined?1:channelId).filterE(function(packet){
		 	//Filter messages from users who dont have write permission
		 	if(handleAuthentication===false){
		 	    return true;
		 	}
		 	var auth =authentication.clientCanWrite(packet.clientId, pluginId, channelId);
		 	if(!auth){
		 		LOG.warn("User "+packet.clientId+" attempted to set "+newKey+" but does not have permission. "+pluginId+" "+channelId); //, packet.user.ip, packet.user.userAgent
		 	}
		 	return auth;
		 }).mapE(function(e){       //DO NOT REMOVE, this is because other code paths modify data. Because we are not cloning at each node.
            return {type: e.type, data:e.data, clientId: e.clientId, connection:e.connection, token:e.token, user:e.user, httpRequest:e.httpRequest};
         });
		 
		 channelE.toClientE = F.receiverE();
		 
		channelE.send = function(data, connection, filter){
                    var myFilter = filter || function (con) {
                        if (connection === undefined) {
                            return true;
                        }
		     	if(typeof(connection)==="object" && connection.sendBytes!==undefined){
                            return connection === con;
                        }
                        if(typeof(connection)==="string") {
                            return con === dataManager.connectionsB.valueNow()[connection];
                        }
                        return true;
                    };
                            
                        

		    channelE.toClientE.sendEvent(data);
		    //Check for permissions when connection IS specified, also i think its actually clientId
		    //log.info("ChannelE Send ", arguments.callee.caller.toString(), data.toString());
		    //log.info(pluginKey+" "+pluginId+" "+channelId);
		    if((!Buffer.isBuffer(data)) && (typeof(data)==="object" || typeof(data)==="number")){
			data = JSON.stringify(data);
		    }
		    if(typeof(data)==="string"){
			data = new Buffer(data);
		    }
		    if(Buffer.isBuffer(data)){
			var channelProtocolBuf = new Buffer(4);
			channelProtocolBuf.writeUInt16LE(pluginId, 0);
			channelProtocolBuf.writeUInt16LE(channelId, 2);
			 	
			var buf = Buffer.concat([channelProtocolBuf, data]);
                        var candidateConnections = dataManager.connectionsB.valueNow();

                        
                        if (connection!==undefined) {
                            if (typeof(connection)==="string") {
                                candidateConnections = [candidateConnections[connection]];
                            }
                            else if (typeof(connection)==="object") {
                                candidateConnections = [connection];
                                
                            }
                        }

                        if (filter || connection !== undefined) {
                            for (var k in candidateConnections) {
                                var con = candidateConnections[k];
                                if (con && myFilter(con, con.token)) {
		     		    if(handleAuthentication===false || 
                                       authentication.clientCanRead(con.clientId, pluginId,channelId)){                                       

                                        con.sendBytes(buf);
		     		    }
		     		    else{ 
		     			AUTHENTICATION.log.warn("User attempted to read "+newKey+" but does not have permission.");
		     		    }
                                    
                                }
                            }
                        }
                        else {
                            dataManager.sendData(newKey, buf, "binary");
                        }


		    }
		    else{
			LOG.error("Channel does not know how to send data of type "+typeof(data), LOG.ERROR, "DATA CHANNELS");
		    }
		};

	return channelE;
    };

    dataManager.getObjectChannelE = function(pluginKey, channelId, description, handleAuthentication){
    	var channelE = dataManager.getChannelE(pluginKey, channelId, description, handleAuthentication);
    	var modChannelE = channelE.mapE(function(packet){
    	    try{
    	        packet.data = JSON.parse(packet.data.toString());
    	    }
    	    catch(e){
    	        if(packet.user!==undefined){
    	            log.error("commandChannel error",pluginKey, channelId,description, e, packet.user.ip, packet.user.userAgent);
    	        }
    	        else{
    	            log.error("commandChannel error",pluginKey, channelId,description, e);
    	        }
    	        packet.data = e;
    	    }        
    	    return packet;
    	});
    	modChannelE.send = function(obj, connection, filter){
    	    try{
    	        channelE.send(new Buffer(JSON.stringify(obj)), connection, filter);
    	    }
    	    catch(e){
    	        log.error("commandChannel send error", pluginKey, channelId,description, e);
    	        channelE.send(new Buffer(JSON.stringify(e)), connection);
    	    }
    	};
        modChannelE.filterKeyValueE = function (k, v) {
            return modChannelE.filterE(function (pkt) { return pkt.data[k] === v; });
        };
    	return modChannelE;
    };

	dataManager.getCommandChannelE = function(pluginKey, channelId, description){
		//log.info("getCommandChannelE "+pluginKey+" "+channelId+" "+description);
		var channelE = dataManager.getChannelE(pluginKey, channelId, description);
		var commandPacketE = channelE.mapE(function(packet){
			if(packet.length===0){
				log.error("Error, commandChannel received packet with no command (length 0) ", packet.user.ip, packet.user.userAgent);
			}
			packet.command = packet.data[0];
			if(packet.data.length>1){
				packet.data = packet.data.slice(1);
			}
			return packet;
		});
		commandPacketE.send = function(command, data, connection){
			// log.info("CommandChannelE Send ", arguments.callee.caller.toString(), data.toString());
		 //	log.info("commandCHannel send "+pluginKey+" "+channelId);
			 if((!Buffer.isBuffer(data)) && typeof(data)==="object"){
			 	data = JSON.stringify(data);
			 }
			 if(typeof(data)==="string"){
			 	data = new Buffer(data);
			 }
			var commandBuffer = new Buffer(1);
			commandBuffer.writeUInt8(command, 0);
			channelE.send(Buffer.concat([commandBuffer, data]), connection);
		};
		commandPacketE.filterCommandsE = function(command){
			return commandPacketE.filterE(function(packet){return packet.command===command;});
		};
		return commandPacketE;
	};
	
	dataSourcesE.mapE(function(dataSources){
        var newData = [];
        for(var key in dataSources){
            newData.push({key: dataSources[key].key, pluginId: dataSources[key].pluginId, channelId: dataSources[key].channelId, description: dataSources[key].description});
        }
        return TABLES.parseTable("dataSources", "key", newData, {key: {name: "Key", type: "string"}, pluginId:{name: "Plugin", type: "int"}, channelId:{name: "Channel", type: "int"}, description:{name: "Description", type: "string"}});
    }).startsWith(SIGNALS.NOT_READY).sendToClients(aurora.CHANNEL_ID, aurora.CHANNELS.DATA_SOURCES, "Data Sources");
	
	var dataRegChannelE = dataManager.getCommandChannelE(aurora.CHANNEL_ID, aurora.CHANNELS.DATA_REG, "Channel Registration");
	dataRegChannelE.mapE(function(packet){
        try {
            packet.data         = JSON.parse(packet.data.toString());
            packet.data.command = packet.command;
            dataRegR.sendEvent(packet);
        }
        catch (e) {
            if(packet.user!==undefined){
                log.error("commandChannel error", e + "", JSON.stringify(packet.data), "command", packet.command, Object.keys(packet), packet.data, packet.user.ip, packet.user.userAgent);
            }
            else{
                log.error("commandChannel error", e + "", JSON.stringify(packet.data), "command", packet.command, Object.keys(packet), packet.data);
            }
        }
	});
	
	dataManager.clientDataSourceUsageTableB = dataRegTableE.mapE(function(tables){return tables.usersDataSources;}).startsWith(SIGNALS.NOT_READY);
    dataManager.dataSourceUserUsageTableB = dataRegTableE.mapE(function(tables){return tables.sourcesAdminTable;}).startsWith(SIGNALS.NOT_READY);
    dataManager.dataSourceUserUsageTableB.sendToClients(aurora.CHANNEL_ID, aurora.CHANNELS.DATA_SOURCES_ADMIN, "Data Sources Admin");
    
		
    return dataManager;
})(DATA || {}, AURORA, HTTP, BINARY, AUTHENTICATION);

var STORAGE = (function(storage, aurora){
	var updateTable = function(objectName, primaryKey, columns, inputE, data, writeTableCB){
		var pushBackE = F.receiverE();
        var initialTable = TABLES.parseTable(objectName, primaryKey, data, columns);
        var tableUpdateE = F.mergeE(pushBackE, inputE).collectE(initialTable, function(update, table){
            if(!TABLES.UTIL.isTable(update)){
                update = (update instanceof Array)?update:[update];
                for(var index in update){
                    if(update[index].command==="add"){
                        TABLES.UTIL.addRow(table, update[index].data.rowPk, update[index].data.row);
                    }
                    else if(update[index].command==="remove"){
                        TABLES.UTIL.removeRow(table, update[index].data.rowPk);
                    }
                    else if(update[index].command==="exec"){  //Run a callback over each row, update or remove row.
                        var removeSet = [];
                        for(var rowIndex in table.data){
                            var row = update[index].callback(table.data[rowIndex]);
                            if(row===undefined){
                                removeSet.push(table.data[rowIndex][table.tableMetaData.primaryKey]);
                            }
                            else{
                                TABLES.UTIL.updateRow(table, table.data[rowIndex][table.tableMetaData.primaryKey], row);
                            }
                        }
                        for(var index in removeSet){
                            TABLES.UTIL.removeRow(table, removeSet[index]);
                        }
                    }
                }
                writeTableCB(objectName, primaryKey, columns, table.data);
                return table;
            }
            else{
            	writeTableCB(objectName, primaryKey, columns, update.data);
            }
            return update;
        });
        
        var tableBI = F.liftBI(function(table){
            return table;
        }, function(newData){
            var existingTable = TABLES.UTIL.isTable(newData)?newData:tableBI.valueNow();
            var maxId = 0;
            for(var index in existingTable.data){
                var rowPk = TABLES.UTIL.findRowPk(existingTable, index);
                if(typeof(rowPk)=="string" && (rowPk+"").contains("temp")){}
                else{
                    maxId = Math.max(maxId, typeof(rowPk)!="string"?rowPk:parseInt(rowPk));
                }
            }
            var rows = [];
            var newRows = [];
            for(var index in newData.data){
                var rowPk = TABLES.UTIL.findRowPk(newData, index);
                if(newData.rowMetaData[rowPk] && newData.rowMetaData[rowPk]["deleted"]){
                    continue;
                }
                if(typeof(rowPk)=="string" && (rowPk+"").contains("temp")){
                    newData.data[index][newData.tableMetaData.primaryKey] = ++maxId;
                }
                rows.push(newData.data[index]); 
            }
            
            var newTable = TABLES.parseTable(objectName, primaryKey, rows, columns);
            newTable.tableMetaData.applyId = newData.tableMetaData.applyId;

            pushBackE.sendEvent(newTable);
            return [newTable];
        }, tableUpdateE.startsWith(initialTable));
        return tableBI;
	};

    storage.createJSONTableBI = function(objectName, primaryKey, columns, inputE, opt_readOnly){
        var path = __dirname+"/data/"+objectName+".json";
        inputE = inputE || F.zeroE();
        if(!fs.existsSync(path)){
            fs.writeFileSync(path, "[]", 'utf8');
        }
        var resB = updateTable(objectName, primaryKey, columns, inputE, JSON.parse(fs.readFileSync(path, 'utf8')), function(objectName, primaryKey, columns, data){
    	    fs.writeFileSync(__dirname+"/data/"+objectName+".json", JSON.stringify(data), 'utf8');
    	});
        if (opt_readOnly) {
            resB = F.liftB(function (v) {return v}, resB);
        }
        return resB;
    };
   
    storage.createTableBI = function(objectName, primaryKey, columns, inputE, opt_readOnly){
        if(aurora.SETTINGS.STORAGE_ENGINE===aurora.STORAGE_ENGINES.JSON){
            return storage.createJSONTableBI(objectName, primaryKey, columns, inputE, opt_readOnly);
        }
    };
    
    return storage;
})(STORAGE || {}, AURORA);

var AURORA = (function(aurora, http){
    aurora.configPath = configPath;
	aurora.config = config;
	aurora.configE = configE;
    aurora.logLevelB = configE.propertyE('logLevel').filterRepeatsE().startsWith(null);
    var path = require('path');
    var logPath =  (process.argv.length>2)? path.dirname(process.argv[2]) + "/log_config.json" : __dirname+"/log_config.json";
    aurora.logPath = logPath;
    aurora.devModeHook = aurora.devModeHook || function () {
        return false;
    };

    aurora.isDevMode = function () {
        return aurora.configB.valueNow().devMode || aurora.devModeHook();
    }; 
    
    aurora.logB = F.mergeE(F.oneE(), FILE.watchE(logPath).delayE(1000)).startsWith(SIGNALS.NOT_READY)
        .liftB(function (v) {
            try {
                return JSON.parse(fs.readFileSync(logPath, 'utf8'));
            }
            catch (e) {
                return {};
            } 
        }).filterRepeatsB();


	aurora.configB = configE.startsWith(SIGNALS.NOT_READY);
	return aurora;
}(AURORA || {}, HTTP));

function get_lines(filename, lineFrom, lineTo, callback) {
    var lines = fs.readFileSync(filename, 'utf8').split("\n");
	callback(lines.slice(Math.max(0, lineFrom), lineTo));
}

process.on('uncaughtException', function (err) {
	console.error("Aurora Error Handler");
	
	for(var index in AURORA.uncaughtExceptionCallbacks){
		AURORA.uncaughtExceptionCallbacks[index]();
	}
	//TODO: Move this to a uncaughtExceptionCallback and put it in log.js
	var strStack = (err.stack+"");
	var linePosStart = strStack.indexOf("server.js:")+10;
	var line = parseInt(strStack.substring(linePosStart, strStack.indexOf(":", linePosStart+1)));
	try{
		get_lines(__dirname+"/server.js", line-10, line+10, function(lines){
			lines.splice(10, 0, "------------------------------------------------------------");
			lines.splice(9, 0, "------------------------------------------------------------");
			
			var errorText = err+" \n"+err.stack+"\n-----------------------------------------------------------------------------------------\n"+lines.join("\n")+"\n\n";
			console.error(errorText);
			fs.writeFile(__dirname+"/aurora-crash.log", errorText, function(){
				fs.exists("/var/log/", function(exists){
					if(exists){
						fs.writeFile("/var/log/aurora-crash.log", errorText, function(){
							process.exit();
						});
					}
				});
			});
		});
	}
	catch(e){
		console.error(err);
		console.error(err.stack);
		console.error("Unable to write to log... shutdown");
		process.exit();
	}
});

process.on('exit', function (){

});
  
process.on( 'SIGINT', function() {
	log.warn( "\nAurora Shutdown" );
	for(var index in AURORA.exitCallbacks){
		AURORA.exitCallbacks[index]();
	}
	process.exit();
});


