var qs = require('querystring');
var crypto = require('crypto');                                
const https = require('https'),
http = require('http'),
fs = require('fs'),
path = require('path'),
util = require('util'),               
mime = require('mime'),
WebSocketServer = require('websocket').server;
//require('buffertools').extend();




var HTTP = (function(http){
    http.SID_STRING = 'sesh';
    var TIMEOUT = 3*60*1000;
    
    var config = JSON.parse(fs.readFileSync("config.json"));
    var themeHtml = fs.readFileSync(__dirname + "/themes/"+config.theme+"/index.html", 'utf8');
    
    var httpReqE = F.receiverE();
    var websocketRequestE = F.receiverE();
    
    var httpServer = HTTP.startHTTPServerE(config.httpPort, httpReqE);
    if(config.forceSSL!==true){
        var webSocket = HTTP.createWebSocket(httpServer, websocketRequestE);
    }
    if(fs.existsSync("./data/privatekey.pem") && fs.existsSync("./data/certificate.pem")){
        LOG.create("Starting HTTPS Server on port "+config.sslPort);    
        var httpsServer = HTTP.startHTTPSServerE(config.sslPort, httpReqE);
        var secureWebsocket = HTTP.createWebSocket(httpsServer, websocketRequestE);
        
    }
    
    LOG.create("Aurora version "+AURORA.VERSION);
    LOG.create('Server started');
    
    http.httpRequestE = httpReqE.mapE(function(arg){
        var request = arg.request;
        var response = arg.response;

        //Build list of cookies
        var cookies = {};
        request.headers.cookie && request.headers.cookie.split(';').forEach(function( cookie ) {
            var parts = cookie.split('=');
            cookies[parts[0].trim()] = (parts[1] || '').trim();
        });

        var newTokenPair = undefined;
        //Create session token
        if(cookies[http.SID_STRING]===undefined){    //TODO: Handle the case where the server reboots but a client still has an active auth token in session
            //var tokenPair = AUTHENTICATION.createNewTokenSeriesPair(AUTHENTICATION.sessionTableB.valueNow(), 10);
            newTokenPair = {token: crypto.randomBytes(10).toString("hex"), seriesId: crypto.randomBytes(10).toString("hex")};
            cookies[http.SID_STRING] = newTokenPair.token+"-"+newTokenPair.seriesId;
            response.setHeader('Set-Cookie',http.SID_STRING+'='+cookies[http.SID_STRING]+'; Path=/;');     
        }
        
        //TODO: get current user here. Pass down with state.
        
        //Get requested url
        var url = (request.url==="/")?"/"+config.defaultPage:request.url.replaceAll("../", "");
        
        return {host: request.headers.host, url:url, encrypted: request.client.encrypted, cookies: cookies, response: response, newTokenPair:newTokenPair};
    });
    
    http.newTokenE = http.httpRequestE.filterE(function(req){
        return req.newTokenPair!==undefined;
    }).mapE(function(req){
        var ret = req.newTokenPair;
        ret.connection = req.connection;
        return ret;
    });
    
    http.httpRequestE.mapE(function(requestData){
        var response = requestData.response;
        
        var blockedUrls = ["/src", "/server.js", "/data", "/node_modules"];
        var responseHead =  {'Content-Type': 'text/html; charset=utf-8'}; 
        //Force SSL
        if (config.forceSSL===true && requestData.encrypted===undefined) {
            var port = config.sslPort===443?"":":"+config.sslPort;
            HTTP.redirect(response, 'https://' + requestData.host.replace(":"+config.httpPort, port) + requestData.url);
        }
        else if(requestData.url==="/favicon.ico"){
            HTTP.sendFile(__dirname + "/themes/"+config.theme+"/favicon.ico", response);
        }
        else if(requestData.url.indexOf("/request/getPage/")!==-1){
            HTTP.sendFile(__dirname + "/resources/pages/"+requestData.url.replace("/request/getPage/", "")+".html", response);
        }
        else if (fs.existsSync(__dirname + requestData.url)) { 
            for(var index in blockedUrls){
                if(requestData.url.replaceAll("../", "").startsWith(blockedUrls[index])){
                    HTTP.writeError(404, response);
                    return;
                }
            }
            var fileStat = fs.statSync(__dirname + requestData.url);
            if(fileStat.isFile()){
               HTTP.sendFile(__dirname + requestData.url, response);
            }
            else if(config.directoryBrowsing && fileStat.isDirectory()){
                console.log(requestData.url);
                HTTP.readDirectory(response, requestData.url);
            }
            else{
                HTTP.writeError(404, response);
            }
        }
        else if (fs.existsSync(__dirname + "/resources/pages"+requestData.url+".html")) { 
            response.writeHead(200, responseHead);
            response.write(themeHtml.replace("{CONTENT}", fs.readFileSync(__dirname + "/resources/pages"+requestData.url+".html")).replace("{HEAD}", ''), 'utf8');
            response.end();                                                                                                                                                                     
        } 
        else{
            LOG.create("Cannot find requested file "+requestData.url);
            HTTP.writeError(404, response);
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
    
    http.wsConnectionOpenE.mapE(function(packet){
        
        packet.connection.on('error', function(error){
            http.wsEventE.sendEvent(SIGNALS.newError("Websocket Connection Error: "+error));
        });
        packet.connection.on('message', function(message){
            http.wsEventE.sendEvent({message: message, clientId:packet.clientId, connection:packet.connection});
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
    
    
    var dataUpdateRequestE = wsMessageE.filterE(function(packet){return packet.data.command===AURORA.COMMANDS.UPDATE_DATA;});
    dataUpdateRequestE.mapE(function(packet){
        dataManager.setValue(packet.data.key, packet.data.data);
    });
    
    http.dataRegistrationE = wsMessageE.filterE(function(packet){return packet.data.command===AURORA.COMMANDS.REGISTER_DATA || packet.data.command===AURORA.COMMANDS.DEREGISTER_DATA;}).mapE(function(packet){
        return packet;
    });
    
    http.userAuthenticationE = wsMessageE.filterE(function(packet){return packet.data.command===AURORA.COMMANDS.AUTHENTICATE || packet.data.command===AURORA.COMMANDS.UNAUTHENTICATE;}).mapE(function(packet){
        return packet;
    });
    
    http.requestPageE = wsMessageE.filterE(function(packet){;return packet.data.command===AURORA.COMMANDS.REQUEST_PAGE;});
    http.requestPageE.mapE(function(packet){
        var pagePath = __dirname+"/resources/pages/"+packet.data.data.replaceAll("../", "").replaceAll("./", "")+".html";
        LOG.create("Requesting "+pagePath);
        if(fs.existsSync(pagePath)){
            packet.connection.sendUTF(JSON.stringify({command: AURORA.RESPONSES.PAGE, data: fs.readFileSync(pagePath, "utf8")}));
        }
        else{
            LOG.create("Cannot find file requested via websocket "+pagePath);
        }
    });
    return http;
}(HTTP || {}));








var DATA = (function(dataManager, aurora, http){
    
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
        dataSources[update.key] = update.data;
        return dataSources;
    });
    var dataSourcesB = dataSourcesE.startsWith(SIGNALS.NOT_READY);
        
    dataManager.dataRegE = F.mergeE(http.wsConnectionCloseE, http.dataRegistrationE).collectE({}, function(websocketPacket, dataReg){  
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
                if(!AUTHENTICATION.clientCanRead(clientId, key)){
                    return dataReg;
                }
                if(dataReg[key]==undefined){
                    dataReg[key] = [];
                }
                if(!ARRAYS.arrayContains(dataReg[key], clientId)){
                    dataReg[key].push(clientId);
                }
                var DATA = dataSourcesB.valueNow();
                if(DATA[key]!==undefined){
                    if(DATA[key].valueNow!==undefined){
                        websocketPacket.connection.sendUTF(JSON.stringify({command: aurora.COMMANDS.UPDATE_DATA, key: key, data: DATA[key].valueNow()}));
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
        //LOG.create("Data Reg Updated "+clientId);
        //LOG.create(dataReg);
        return dataReg;
    });
    dataManager.dataRegB = dataManager.dataRegE.startsWith(SIGNALS.NOT_READY);






    
    //Determin who to send this data to.
    dataManager.sendData = function(key, value, type){
        var DATA_REG = dataManager.dataRegB.valueNow();        
        if(DATA_REG[key]){
            var connections = dataManager.connectionsB.valueNow();
            for(var index in DATA_REG[key]){
               // LOG.create("Sending "+JSON.stringify(value).length+" bytes to "+DATA_REG[key]);
                var clientId = DATA_REG[key][index];
                if(connections[clientId]!=undefined){
                    if(type==="binary"){
                        var byteUpdateCommand = ('"'+AURORA.COMMANDS.UPDATE_DATA+'","'+key+'"').toByteArray();
                        //byteUpdateCommand.push(2);
                        var command = byteUpdateCommand.concat(value);
                        //command.push(34);
                        //command.push(125);
                        connections[clientId].sendBytes(new Buffer(command));
                    }
                    else{
                       connections[clientId].sendUTF(JSON.stringify({command: aurora.COMMANDS.UPDATE_DATA, key: key, data: value}));
                    }
                }
            }
        }
    };
    
    
    
    

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

    dataManager.register = function(key, data, type){  
        LOG.create("Registering data source "+key);
        dataSourceRegisterE.sendEvent({key:key, data:data, type:type});
    };

    dataManager.setValue = function(key, value){ 
        var DATA=dataSourcesB.valueNow();
        if(DATA[key]==undefined){
            LOG.create("setValue: Unable to find "+key);
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
    F.EventStream.prototype.sendToClients = function(key, type){
        dataManager.register(key, this, (type===undefined)?AURORA.DATATYPE.UTF8:type);
        return this;
    };
    F.Behavior.prototype.sendToClients = F.EventStream.prototype.sendToClients;

    
    
    
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

    dataManager.clientDataSourceUsageTableB = dataRegTableE.mapE(function(tables){return tables.usersDataSources;}).startsWith(SIGNALS.NOT_READY);
    dataManager.dataSourceUserUsageTableB = dataRegTableE.mapE(function(tables){return tables.sourcesAdminTable;}).startsWith(SIGNALS.NOT_READY);
    dataManager.dataSourceUserUsageTableB.sendToClients("AURORA_DATASOURCESADMIN", AURORA.DATATYPE.UTF8);
    
    dataSourceRegisterE.mapE(function(dataSources){
        var newData = [];
        var count = 0;
        for(var key in dataSources){
            newData.push({index: ++count, key: key});
        }
        return TABLES.parseTable("dataSources", "key", newData, {index: {name: "Index", type: "number"}, key:{name: "Key", type: "string"}});
    }).startsWith(SIGNALS.NOT_READY).sendToClients("AURORA_DATASOURCES", AURORA.DATATYPE.UTF8);
    return dataManager;
})(DATA || {}, AURORA, HTTP);





var STORAGE = (function(storage, aurora){
    
    storage.createJSONTableBI = function(objectName, primaryKey, columns, inputE){
        var path = "data/"+objectName+".json";
        inputE = inputE || F.zeroE();
        if(!fs.existsSync(path)){
            fs.writeFileSync(path, "[]", 'utf8');
        }
        
        var pushBackE = F.receiverE();
        var initialTable = TABLES.parseTable(objectName, primaryKey, JSON.parse(fs.readFileSync(path, 'utf8')), columns);
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
                fs.writeFileSync(path, JSON.stringify(table.data), 'utf8');
                return table;
            }
            fs.writeFileSync(path, JSON.stringify(update.data), 'utf8');
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
    
    
    storage.createTableBI = function(objectName, primaryKey, columns, inputE){
        if(aurora.SETTINGS.STORAGE_ENGINE===aurora.STORAGE_ENGINES.JSON){
            return storage.createJSONTableBI(objectName, primaryKey, columns, inputE);
        }
    };
    
    return storage;
})(STORAGE || {}, AURORA);
