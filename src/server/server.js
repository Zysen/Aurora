console.log("Starting Aurora");

const https = require('https'),
http = require('http'),
httpLib = http;
fs = require('fs');

var configPath = (process.argv.length>2)?process.argv[2]:__dirname+"/config.json";
var configChangedE = FILE.watchE(configPath).delayE(1000);
//fs.unwatchFile(configPath)
var config = JSON.parse(fs.readFileSync(configPath, 'utf8').replaceAll("\r", "").replaceAll("\n", ""));
var configE = F.mergeE(F.oneE(), configChangedE).mapE(function(){
	try{
		return fs.readFileSync(configPath, 'utf8').replaceAll("\r", "").replaceAll("\n", "");
	}
	catch(e){console.log("Config Error");console.log(e);}
}).filterUndefinedE().filterRepeatsE().mapE(function(configStr){
	try{
		console.log("Loading Config");
		config = JSON.parse(configStr);
		return config;}
	catch(e){console.log("Config Parse Error");console.log(e);}
});
if(config.path!==undefined){
	console.log("Changing to "+config.path);
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

var HTTP = (function(http, dataManager, authentication){
    http.SID_STRING = 'sesh';
    var TIMEOUT = 3*60*1000;
    var themeHtml = fs.readFileSync(__dirname + "/themes/"+config.theme+"/index.html", 'utf8');
    var theme404 = fs.readFileSync(__dirname + "/themes/"+config.theme+"/404.html", 'utf8');
    var faviconExists = fs.existsSync(__dirname + "/themes/"+config.theme+"/favicon.ico");
    
    var httpReqE = F.receiverE();
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
    		console.log("HTTP Not configured");
    		return;
    	}
    	console.log("Configuring new http server");
    	http.httpServer = HTTP.startHTTPServerE(config.httpPort, httpReqE);
    	if(config.forceSSL!==true){
    		http.websocketServer = HTTP.createWebSocket(http.httpServer, websocketRequestE);
    	}
    };
    var configureHttps = function(config){
    	if(config.sslPort===undefined){
    		console.log("SSL has not been configured");
			return;
		}
		var pemPath = config.sslPemfile!==undefined&&fs.existsSync(config.sslPemfile)?config.sslPemfile:__dirname+"/data/privatekey.pem";
		var privKeyPath = config.sslPrivkey!==undefined&&fs.existsSync(config.sslPrivkey)?config.sslPrivkey:__dirname+"/data/certificate.pem";
		if(fs.existsSync(pemPath) && fs.existsSync(privKeyPath)){
	        LOG.create("Starting HTTPS Server on port "+config.sslPort);    
	        var options = {
	            key: fs.readFileSync(privKeyPath, 'utf8'),
	            cert: fs.readFileSync(pemPath, 'utf8')
	        };
	        //TODO Handle the config option sslUseSslv3
	        if(config.sslCipherList!==undefined){
	        	options.ciphers = config.sslCipherList;
	        }
	        http.httpsServer = HTTP.startHTTPSServerE(config.sslPort, httpReqE, options);
	        http.secureWebsocket = HTTP.createWebSocket(http.httpsServer, websocketRequestE);
	    }
		else{
			console.log("SSL has been configured but the certificate and key cannot be found at "+pemPath+" "+privKeyPath);
		}
    };
    configE.mapE(function(config){
    	console.log("New Config");
    	if(http.websocketServer!==undefined){http.websocketServer.shutDown();}	
    	if(http.httpServer!==undefined){
    		console.log("Closing existing http server");
    		http.httpServer.on('close', function(){http.httpServer = undefined; configureHttp(config);});
	    	http.httpServer.close();
    		http.httpServer.shutdown();
    		
    	}
    	else{configureHttp(config);}
    	if(http.secureWebsocketServer!==undefined){http.secureWebsocketServer.shutDown();}
    	if(http.httpsServer!==undefined){
    		console.log("Closing existing https server");
    		http.httpsServer.on('close', function(){http.httpsServer = undefined; configureHttps(config);});
    		http.httpsServer.close();
    		http.httpsServer.shutdown();
    		
    	}
    	else{configureHttps(config);}
    });
    
    LOG.create("Aurora version "+AURORA.VERSION);
    LOG.create('Server started');

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
    
    http.httpPreRequestE = httpReqE.mapE(function(arg){
    	var responseHeaders = responseHeadersDef();
    	var request = arg.request;
        var response = arg.response;
        
        request.url = lib_url.parse(request.url);
		try{
			request.query = request.url.query===undefined?{}:qs.parse(request.url.query);
       	}
       	catch(e){
       		console.log("HTTP Query Error, unable to parse using qs. "+e);
       	}
        //Build list of cookies
        var cookies = {};
        request.headers.cookie && request.headers.cookie.split(';').forEach(function( cookie ) {
            var parts = cookie.split('=');
            cookies[parts[0].trim()] = (parts[1] || '').trim();
        });
       // console.log("httpPreRequestE: "+cookies.sesh);
        var userId = undefined;
        var groupId = undefined;
        var newTokenPair = undefined;
        //Create session token
        if(cookies[http.SID_STRING]===undefined || (!cookies[http.SID_STRING].contains("-"))){    //TODO: Handle the case where the server reboots but a client still has an active auth token in session
            //var tokenPair = AUTHENTICATION.createNewTokenSeriesPair(AUTHENTICATION.sessionTableB.valueNow(), 10);
            LOG.create("Creating new token");
            newTokenPair = {token: crypto.randomBytes(10).toString("hex"), seriesId: crypto.randomBytes(10).toString("hex")};
            cookies[http.SID_STRING] = newTokenPair.token+"-"+newTokenPair.seriesId;
            responseHeaders.set('Set-Cookie',http.SID_STRING+'='+cookies[http.SID_STRING]+'; Path=/;');
            //console.log("2 Setting token to "+cookies[http.SID_STRING]);
        }
        else{
            var row = TABLES.UTIL.findRow(authentication.sessionTableB.valueNow(), cookies[http.SID_STRING].split("-")[0]);
            if(row!==false){
                userId = row.userId;
                groupId = row.groupId;
            }
            else{
            	console.log("Token exists but cant find you in database "+cookies[http.SID_STRING]);
            	responseHeaders.set('Set-Cookie',http.SID_STRING+'=;gambit=; Path=/;');
            	//Recreate a new token
            	//newTokenPair = {token: crypto.randomBytes(10).toString("hex"), seriesId: crypto.randomBytes(10).toString("hex")};
                //cookies[http.SID_STRING] = newTokenPair.token+"-"+newTokenPair.seriesId;
                //responseHeaders.set('Set-Cookie',http.SID_STRING+'='+cookies[http.SID_STRING]+'; Path=/;');
                //console.log("1 Setting token to "+cookies[http.SID_STRING]);
            }
        }
        //console.log("Client: "+groupId+" "+cookies[http.SID_STRING]+" "+request.url.pathname);
        request.url.pathname = (request.url.pathname==="/")?"/"+config.defaultPage:request.url.pathname.replaceAll("../", "");
        var ret = {host: request.headers.host, url:request.url, encrypted: request.client.encrypted, cookies: cookies, userId: userId, groupId: groupId, request: request, response: response, newTokenPair:newTokenPair, responseHeaders:responseHeaders};
        if(cookies.sesh!==undefined){
        	var sp = cookies.sesh.split("-");
        	ret.token = sp[0];
        	ret.seriesId = sp[1];
        }
        return ret;
    });
    
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
    
    http.httpRequestE.mapE(function(requestData){
        var request = requestData.request;
        var response = requestData.response;
        var responseHeaders = requestData.responseHeaders;
        var blockedUrls = ["/src", "/server.js", "/data", "/node_modules"];
        
        //Force SSL
        if (config.forceSSL===true && requestData.encrypted===undefined) {
            var port = config.sslPort===443?"":":"+config.sslPort;
            HTTP.redirect(response, 'https://' + requestData.host.replace(":"+config.httpPort, port) + requestData.url.path);
        }
        else if(requestData.url.pathname==="/client.min.js"){		//This is needed for the sourcemap
        	responseHeaders.set('X-SourceMap',"/client.js.map");
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
            LOG.create("Cannot find requested file "+requestData.url.pathname);
            response.writeHead(404, responseHeaders.toClient());
            response.write(themeHtml.replace("{CONTENT}", theme404).replace("{HEAD}", ''), 'utf8');
            response.end();
        }
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
        var token = undefined;
        var seriesId = undefined;
        var tokenPair = getTokenFromWS(request);
        if(tokenPair!==false){
            token = tokenPair.token;
            seriesId = tokenPair.seriesId;
        }
        return {connection: connection, token:token, seriesId:seriesId, clientId:clientId};
    });
    
    http.wsConnectionOpenE.mapE(function(packet){  //Sideeffects and updaters go here.
        packet.connection.sendUTF(JSON.stringify({command: AURORA.COMMANDS.VERSION, data: AURORA.VERSION}));
    });
    
    http.wsEventE = F.receiverE();
    http.wsBinaryUpdate = http.wsEventE.filterE(function(e){
    	return e.data!==undefined;
    });
    
    http.wsConnectionOpenE.mapE(function(packet){
        
        packet.connection.on('error', function(error){
            http.wsEventE.sendEvent(SIGNALS.newError("Websocket Connection Error: "+error));
        });
        packet.connection.on('message', function(message){
        	
        	if(message.type==="binary"){
        		http.wsEventE.sendEvent({data: message.binaryData, clientId:packet.clientId, connection:packet.connection});
        	}
        	else{
            	http.wsEventE.sendEvent({message: message, clientId:packet.clientId, connection:packet.connection});
           }
        });
        packet.connection.on('close', function(reasonCode, description) {
            //OBJECT.delete(connections, id); 
            //dataThread.send({data: {command: AURORA.COMMANDS.DEREGISTER_DATA}, clientId: id});
            //Inform the session  manager to drop the connection
           // dataThread.send({command: AURORA.COMMANDS.AUTH.DROP_CONNECTION, data: id}); 
            LOG.create("Connection Close Request: "+packet.clientId);
            http.wsEventE.sendEvent({close:true, clientId:packet.clientId});
        });
    });
    
    http.wsConnectionCloseE = http.wsEventE.filterE(function(eventData){return eventData.close!==undefined;});
    var wsConnectionErrorE = http.wsEventE.filterE(function(eventData){return !good(eventData);});
    
    
    
    //Replace this wsMessage thing with a channel for reqeuesting pages and authenticating.
    
    var wsMessageE = http.wsEventE.filterE(function(eventData){return eventData.message!==undefined;}).mapE(function(packet){
       // LOG.create("wsMessageE: Token Is "+packet.token);
        if(packet.message.type=="utf8"){
            try{
                var parsedData = JSON.parse(packet.message.utf8Data);
                packet.data = parsedData.message;
                packet.token = parsedData.token;
                OBJECT.remove(packet, "message");
                return packet;    
            }
            catch(e){
                LOG.create(AURORA.ERRORS.WEBSOCKET_RECEIVE(e));
            }           
        }  
    }).filterUndefinedE();

    http.userAuthenticationE = wsMessageE.filterE(function(packet){return packet.data.command===AURORA.COMMANDS.AUTHENTICATE || packet.data.command===AURORA.COMMANDS.UNAUTHENTICATE;}).mapE(function(packet){
        return packet;
    });
    
    http.requestPageE = wsMessageE.filterE(function(packet){;return packet.data.command===AURORA.COMMANDS.REQUEST_PAGE;});
    http.requestPageE.mapE(function(packet){
        var pagePath = __dirname+"/resources/pages/"+packet.data.data.replaceAll("../", "").replaceAll("./", "")+".html";
        LOG.create("Requesting "+pagePath);
        if(fs.exists(pagePath, function(exists){
        	packet.connection.sendUTF(JSON.stringify({command: AURORA.RESPONSES.PAGE, data: exists?fs.readFileSync(pagePath, "utf8"):theme404}));
        }));
    });
    return http;
}(HTTP || {}, DATA, AUTHENTICATION));

var DATA = (function(dataManager, aurora, http, binary, authentication){
	//Handle client Data Channel signals.
	var receiveE = function(pluginKey, pluginId, channelId){
		return http.wsBinaryUpdate.filterE(function(packet){
			if(Buffer.isBuffer(packet.data)){
				return packet.data.readUInt16LE(0)===pluginId && packet.data.readUInt16LE(2) === channelId;
			}
			return false;
		}).mapE(function(packet){
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
        }
        return connections;
    }).startsWith(SIGNALS.NOT_READY);
    
    var dataSourceRegisterE = F.receiverE();
    var dataSourcesE = dataSourceRegisterE.collectE({}, function(update, dataSources){
        dataSources[update.key] = update;
        return dataSources;
    });
    var dataSourcesB = dataSourcesE.startsWith(SIGNALS.NOT_READY);
    
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
                if(!AUTHENTICATION.clientCanRead(clientId, websocketPacket.data.pluginId, websocketPacket.data.channelId)){
                	LOG.log("User has requested "+key+" but they dont have access.",LOG.WARNING,"Authentication");
                    return dataReg;
                }
                var dataSources = dataSourcesB.valueNow();	//Send the current value back to the user upon registration

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
                    LOG.create("registerClientRequest: Cant find key!!!"+key);
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
                	console.log("No parties interested in "+key);
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
            LOG.create("setValue: Unable to find "+key+" you have not added this to the register. Without registration security cannot be applied.");
            return;
        }
        if(DATA[key].sendEvent!=undefined){
            DATA[key].sendEvent(value);
        }
        else{
            LOG.create("Attempt to set "+key+" no sendEvent function");
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
    		//console.log("PACKET", typeof(packet));
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
    			LOG.log("Object "+newKey+" Has an unknown type of "+typeof(data), LOG.WARNING, "AUTHENTICATION");
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
				LOG.log("Error during data transport.", LOG.ERROR, "DATA TRANSPORT");
				console.log(packet.data);
				console.log(e);
				
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
   
    dataManager.getChannelE = function(pluginKey, channelId, tagName){
		//console.log("getChannelE "+pluginKey+" "+channelId+" "+tagName);
		var pluginId = typeof(pluginKey)==="number"?pluginKey:aurora.plugins[pluginKey];
		var newKey = (pluginKey + "_" + (channelId===undefined?"":channelId));
		dataSourceRegisterE.sendEvent({key:newKey, pluginId:pluginId, channelId:channelId, description: (tagName || "")});
		
		var channelE = receiveE(newKey, pluginId, channelId===undefined?1:channelId).filterE(function(packet){
		 	//Filter messages from users who dont have write permission
		 	var auth =authentication.clientCanWrite(packet.clientId, pluginId, channelId);
		 	if(!auth){
		 		LOG.log("User "+packet.clientId+" attempted to set "+newKey+" but does not have permission. "+pluginId+" "+channelId, LOG.WARNING, "AUTHENTICATION");
		 	}
		 	return auth;
		 });
		 
		channelE.send = function(data, connection){
		 	//Check for permissions when connection IS specified, also i think its actually clientId
		 	//console.log("ChannelE Send ", arguments.callee.caller.toString(), data.toString());
		 	//console.log(pluginKey+" "+pluginId+" "+channelId);
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
		     	if(connection!==undefined){
		     		if(typeof(connection)==="string"){
		     			if(authentication.clientCanRead(connection, pluginId, channelId)){
		     				connection = dataManager.connectionsB.valueNow()[connection];
		     			}
		     			else{
		     				LOG.log("User attempted to read "+newKey+" but does not have permission.", LOG.WARNING, "AUTHENTICATION");
		     			}
		     		}
		     		if(connection!==undefined && typeof(connection)==="object" && connection.sendBytes!==undefined){
		     			connection.sendBytes(buf);
		     		}
		     	}
		    	else{
		    		 dataManager.sendData(newKey, buf, "binary");
		    	}
			 }
			 else{
			 	LOG.log("Channel does not know how to send data of type "+typeof(data), LOG.ERROR, "DATA CHANNELS");
			 }
		 };

		 return channelE;
	};
	
	dataManager.getCommandChannelE = function(pluginKey, channelId, description){
		//console.log("getCommandChannelE "+pluginKey+" "+channelId+" "+description);
		var channelE = dataManager.getChannelE(pluginKey, channelId, description);
		var commandPacketE = channelE.mapE(function(packet){
			if(packet.length===0){
				console.log("Error, commandChannel received packet with no command (length 0) ");
			}
			packet.command = packet.data[0];
			if(packet.data.length>1){
				packet.data = packet.data.slice(1);
			}
			return packet;
		});
		commandPacketE.send = function(command, data, connection){
			// console.log("CommandChannelE Send ", arguments.callee.caller.toString(), data.toString());
		 //	console.log("commandCHannel send "+pluginKey+" "+channelId);
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
		packet.data = JSON.parse(packet.data.toString());
		packet.data.command = packet.command;
		dataRegR.sendEvent(packet);
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

    storage.createJSONTableBI = function(objectName, primaryKey, columns, inputE){
        var path = __dirname+"/data/"+objectName+".json";
        inputE = inputE || F.zeroE();
        if(!fs.existsSync(path)){
            fs.writeFileSync(path, "[]", 'utf8');
        }
        return updateTable(objectName, primaryKey, columns, inputE, JSON.parse(fs.readFileSync(path, 'utf8')), function(objectName, primaryKey, columns, data){
    		fs.writeFileSync(__dirname+"/data/"+objectName+".json", JSON.stringify(data), 'utf8');
    	});
    };
   
    storage.createTableBI = function(objectName, primaryKey, columns, inputE){
        if(aurora.SETTINGS.STORAGE_ENGINE===aurora.STORAGE_ENGINES.JSON){
            return storage.createJSONTableBI(objectName, primaryKey, columns, inputE);
        }
    };
    
    return storage;
})(STORAGE || {}, AURORA);

var AURORA = (function(aurora, http){
	aurora.uncaughtExceptionCallbacks = [];		//Any uncaught exception, can be trapped with these callbacks
	aurora.exitCallbacks = [];			//Callbacks that occur during graceful shutdown.
	aurora.pluginsLoadedE = F.receiverE();

	aurora.addUncaughtExceptionCallback = function(cb){aurora.uncaughtExceptionCallbacks.push(cb);};
	aurora.addExitCallback = function(cb){aurora.exitCallbacks.push(cb);};
	aurora.config = config;
	return aurora;
}(AURORA || {}, HTTP));

function get_lines(filename, lineFrom, lineTo, callback) {
    var lines = fs.readFileSync(filename, 'utf8').split("\n");
	callback(lines.slice(Math.max(0, lineFrom), lineTo));
}

process.on('uncaughtException', function (err) {
	console.log("Aurora Error Handler");
	
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
			console.log(errorText);
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
		console.log(err);
		console.log(err.stack);
		console.log("Unable to write to log... shutdown");	
		process.exit();
	}
});

process.on('exit', function (){

});
  
process.on( 'SIGINT', function() {
	console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
	for(var index in AURORA.exitCallbacks){
		AURORA.exitCallbacks[index]();
	}
	process.exit();
});


