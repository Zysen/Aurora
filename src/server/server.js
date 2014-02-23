    var qs = require('querystring');
var crypto = require('crypto');

                                                     
const https = require('https'),
http = require('http'),
fs = require('fs'),
path = require('path'),
util = require('util'),               
mime = require('mime'),
WebSocketServer = require('websocket').server,
cp = require('child_process');         
var SID_STRING = 'sesh';
var TIMEOUT = 3*60*1000;

var config = JSON.parse(fs.readFileSync("config.json"));

var DATA = {};

var themeHtml = fs.readFileSync(__dirname + "/themes/"+config.theme+"/index.html", 'utf8');
var dataThread = cp.fork(__dirname + '/DataThread.js');

var blockedUrls = ["/src", "/server.js", "/DataThread.js", "/data", "/node_modules"];

var dataThreadE = F.receiverE();
var sessionsTableB = dataThreadE.filterE(function(data){
    return data.key==="AURORA_ACTIVE_USERS" && data.data!=undefined;
}).mapE(function(data){
    return data.data;
}).startsWith(SIGNALS.NOT_READY);

var handleRequest = function(request, response){
	var responseHead =  {'Content-Type': 'text/html; charset=utf-8'}; 
    //Force SSL
	if (config.forceSSL==true && request.client.encrypted===undefined) {
	    var port = config.sslPort===443?"":":"+config.sslPort;
        HTTP.redirect(response, 'https://' + request.headers.host.replace(":"+config.httpPort, port) + request.url);
        return;
    }
    //Process Cookies
	var cookies = {};
	request.headers.cookie && request.headers.cookie.split(';').forEach(function( cookie ) {
		var parts = cookie.split('=');
		cookies[parts[0].trim()] = (parts[1] || '').trim();
	});
	if(cookies["sesh"]==undefined){    //TODO: Handle the case where the server reboots but a client still has an active auth token in session
		var tokenPair = AUTHENTICATION.createNewTokenSeriesPair(sessionsTableB.valueNow(), 10);
		cookies["sesh"] = tokenPair.token+"-"+tokenPair.seriesId;
		responseHead['Set-Cookie']="sesh"+'='+cookies["sesh"]+'; Path=/;';
		dataThread.send({command: AURORA.COMMANDS.UPDATE_TOKEN, token: tokenPair.token, seriesId:tokenPair.seriesId});
		//LOG.create("Creating token "+cookies["sesh"]);
	}
	var authToken = cookies["sesh"];
	//TODO: Perform user lookup from sessionsTable and auth token

	var url = (request.url=="/")?"/"+config.defaultPage:request.url.replaceAll("../", "");
    //request.client.encrypted==undefined
    if(url==="/favicon.ico"){
        HTTP.sendFile(__dirname + "/themes/"+config.theme+"/favicon.ico", response);
    }
    else if(url.indexOf("/request/getPage/")!==-1){
        HTTP.sendFile(__dirname + "/resources/pages/"+url.replace("/request/getPage/", "")+".html", response)
    }
    else if (fs.existsSync(__dirname + url)) {			//Check this against a list of allwoed URLS    	
    	for(var index in blockedUrls){
    	    if(url.replaceAll("../", "").startsWith(blockedUrls[index])){
    	        HTTP.writeError(404, response);
    	        return;
    	    }
    	}
    	var fileStat = fs.statSync(__dirname + url);
    	if(fileStat.isFile()){
    	   HTTP.sendFile(__dirname + url, response);
    	}
    	else if(config.directoryBrowsing && fileStat.isDirectory()){
    	    console.log(url);
    	    HTTP.readDirectory(response, url);
    	}
    	else{
    	    HTTP.writeError(404, response);
    	}
    }
    else if (fs.existsSync(__dirname + "/resources/pages"+url+".html")) { 
        response.writeHead(200, responseHead);
        response.write(themeHtml.replace("{CONTENT}", fs.readFileSync(__dirname + "/resources/pages"+url+".html")).replace("{HEAD}", ''), 'utf8');
        response.end();                                                                                                                                                                     
    } 
    else{
        LOG.create("Cannot find requested file "+url);
        HTTP.writeError(404, response);
    }
};




var connections = {};

var connectionsChanged = function(){
    var clientIds = [];
    for(var clientId in connections){
        clientIds.push({clientId:clientId, token:connections[clientId].token, seriesId:connections[clientId].seriesId});
    }
    dataThread.send({data: {command: AURORA.COMMANDS.UPDATE_DATA,data: clientIds, key: "AURORA_CONNECTIONS"}});  
};

//Messages from Data Thread

dataThread.on('message', function(data){dataThreadE.sendEvent(data);});
dataThreadE.mapE(function(data){
    for(var index in data.clientIds){
        var clientId = data.clientIds[index];
        if(connections[clientId]===undefined){
            LOG.create("Connection has disappeared, unable to send data");
            //LOG.create(data);
            dataThread.send({data: {command: AURORA.COMMANDS.DEREGISTER_DATA}, clientId: clientId});
            OBJECT.delete(connections, clientId);
            continue;
        }
        try{
            if(data.command===AURORA.COMMANDS.UPDATE_DATA){
                if (data.type === 'utf8'){
                    connections[clientId].connection.sendUTF(JSON.stringify({command: AURORA.COMMANDS.UPDATE_DATA, key: data.key, data: data.data, type: data.type}));
                }
                else if (data.type === 'binary'){
                    connections[clientId].connection.sendBytes({command: AURORA.COMMANDS.UPDATE_DATA, key: data.key, data: data.data, type: data.type});
                }
            }
            else if(data.command===AURORA.COMMANDS.AUTHENTICATE){
                connections[clientId].connection.sendUTF(JSON.stringify({command: AURORA.COMMANDS.AUTHENTICATE, data: data.data, type: 'utf8'}));
            }
            else{
                LOG.create("Server doesnt know how to handle packet");
               LOG.create(data);
            }
        }
        catch(e){
            LOG.create(AURORA.ERRORS.WEBSOCKET_SEND(e));
            dataThread.send({data: {command: AURORA.COMMANDS.DEREGISTER_DATA}, clientId: clientId});
        }
    }
});



    


//Websocket Handling
var handleSocketRequest = function(request){
	var connection = request.accept('aurora_channel', request.origin);   
    var id = request.key;
    LOG.create("Connection: "+id);
    var token = undefined;
    var seriesId = undefined;
    for(var index in request.cookies){
        if(request.cookies[index].name==="sesh"){
            var sesh = request.cookies[index].value.split("-");
            token = sesh[0];
            seriesId = sesh[1];
            break;
        }
    }
    connections[id] = {id:id,connection:connection,token:token, seriesId:seriesId};
    connection.on('error', function(error){
        LOG.create("Connection Error");
        LOG.create(error);
    });
    //Send Version String
    LOG.create("Sending version string to client "+AURORA.VERSION);
    connections[id].connection.sendUTF(JSON.stringify({command: AURORA.COMMANDS.VERSION, data: AURORA.VERSION}));
    connection.on('message', function(message){
        
        //Handle each command specifically. Only pass specific commands through to the data thread. This should help keep unwanted requests to a minimum.
        if(message.type=="utf8"){
        	try{
        		var data = JSON.parse(message.utf8Data);
        		if(data.command===AURORA.COMMANDS.UPDATE_DATA || data.command===AURORA.COMMANDS.REGISTER_DATA || data.command===AURORA.COMMANDS.DEREGISTER_DATA || data.command===AURORA.COMMANDS.AUTHENTICATE || data.command===AURORA.COMMANDS.UNAUTHENTICATE){
        			dataThread.send({data: data, clientId: id, token:token, seriesId:seriesId});
        		}
        		else if(data.command===AURORA.COMMANDS.REQUEST_PAGE){
		        	var pagePath = __dirname+"/resources/pages/"+data.data.replaceAll("../", "").replaceAll("./", "")+".html";
		        	if(fs.existsSync(pagePath)){
		        		connections[id].connection.sendUTF(JSON.stringify({command: AURORA.RESPONSES.PAGE, data: fs.readFileSync(pagePath, "utf8"), type: AURORA.DATATYPE.UTF8, clientIds: [id]}));
        			}
        			else{
        				LOG.create("Cannot find file requested via websocket "+pagePath);
        			}
        		}
        	}
        	catch(e){
        		LOG.create(AURORA.ERRORS.WEBSOCKET_RECEIVE(e));
        	}           
        }  
    });
    connection.on('close', function(reasonCode, description) {
        OBJECT.delete(connections, id); 
        dataThread.send({data: {command: AURORA.COMMANDS.DEREGISTER_DATA}, clientId: id});
        connectionsChanged();
    });
    connectionsChanged();
};



var httpServer = http.createServer(handleRequest);
httpServer.listen(config.httpPort);
if(config.forceSSL!==true){
    var webSocket = new WebSocketServer({
        httpServer: httpServer,
        autoAcceptConnections: false
    });
    
    webSocket.on('error', function(error) {    
        LOG.create("Websocket Error");
        LOG.create(error);    
    });
    
    webSocket.on('request', handleSocketRequest);
}
if(fs.existsSync("./data/privatekey.pem") && fs.existsSync("./data/certificate.pem")){
    LOG.create("Starting HTTPS Server on port "+config.sslPort);
    var httpsServer = https.createServer({
        key: fs.readFileSync('./data/privatekey.pem'),
        cert: fs.readFileSync('./data/certificate.pem')
    }, handleRequest); 
    httpsServer.listen(config.sslPort);
    
    var secureWebSocket = new WebSocketServer({
        httpServer: httpsServer,
        autoAcceptConnections: false
    });
    
    secureWebSocket.on('error', function(error) {    
        LOG.create("Websocket Error");
        LOG.create(error);    
    });
    
    secureWebSocket.on('request', handleSocketRequest);
}

LOG.create("Aurora version "+AURORA.VERSION);
LOG.create('Server started');