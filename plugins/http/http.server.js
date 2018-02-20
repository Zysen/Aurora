var HTTP = (function(){
	const http = require("http");
	const https = require("https");
	const mime = require("mime");
	const fs = require("fs");
	const path = require("path");
	const qs = require("querystring");
	const EventEmitter = require('events').EventEmitter;
		
	var theme = {template: undefined, error403HTML:undefined, error404HTML:undefined, error500HTML:undefined};
	var serversUpdatedE = new EventEmitter();
		
	function getPost(request, callback){
		if (request.method == 'POST') {
            var body = '';
            request.on('data', function (data) {
                body += data;
            });
            request.on('end', function () {
            	callback(qs.parse(body));
            });  
        }
    };
	
	function startServer (type, port, callback, opt_options) {
		var running = true;
		var httpServer = (opt_options && type===https) ? type.createServer(opt_options, callback) : type.createServer(callback);

		var serverSockets = {}, nextSocketId = 0;
		httpServer.on('connection', function (socket) {
			var socketId = nextSocketId++;
			serverSockets[socketId] = socket;
			socket.on('close', function () {
				delete serverSockets[socketId];
			});
		});
		httpServer.shutdown = function(doneCb){
			console.log("HTTP Server Shutdown "+port, nextSocketId);
			httpServer.close(function(){
				for(var index in serverSockets){serverSockets[index].destroy();}
				running = false;
				doneCb();
			});
		};
		httpServer.listen(port); 
		return httpServer;        
	};
	
	var responseHeadersDef = (function(){
    	var headers = {"Server":[config.http.serverDescription || "AuroraHTTP"], "Date":[(new Date()).toGMTString()]};
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
				Object.keys(headers).forEach(function(name){
					headers[name].forEach(function(v){
						newHeaders.push([name, v]);
					});
				});
    			return newHeaders;
    		}
    	};
    });
	
	function sendFile(path, request, response, headers){
		request.on('error', function(err) {
			response.writeHead(500, headers.toClient());
			response.end(theme.error500HTML);
		});
		fs.exists(path, function(exists){
			if(exists){
				fs.stat(path, function(err, stats){
					if (err) {
						response.writeHead(500);
						response.end(theme.error500HTML);
					}
					else if(stats.isDirectory()){
						response.writeHead(404);
						response.end(theme.error404HTML);
					}
					else{         
						var reqDate = request.headers['if-modified-since'];
						if(reqDate!==undefined && new Date(reqDate).getUTCSeconds()===new Date(stats.mtime).getUTCSeconds()){
							response.writeHead(304, headers.toClient());
							response.end();
						}
						else{
							headers.set('Content-Length',stats.size);
							headers.set('Content-Type',mime.getType(path));
							headers.set('Accept-Ranges',"bytes");
							headers.set('Last-Modified',stats.mtime.toGMTString());
							response.writeHead(200, headers.toClient());
							
							var readStream = fs.createReadStream(path);
							readStream.pipe(response);
							readStream.on('error', function(err) {
								if(response!==null){
									response.writeHead(500, headers.toClient());
									response.end(theme.error500HTML);
								}
							});
							readStream.on('end', function(err) {
								if(response!==null){
									response.end();
								}
							});
							request.on('close', function() {
								readStream.unpipe(response);
								readStream.destroy();
								if(response!==null){
									response.end();
								}
							});
							request.on('aborted', function() {
								readStream.unpipe(response);
								readStream.destroy();
								if(response!==null){
									try{
										response.end();
									}
									catch(e){
										log.error("Assertion error during http abort.", e);
									}
								}
							});
						}
					}
					exists = null;
					err = null;
					stats = null;
					path=null;
					request = null;
				});            
			}
			else{
				console.log("File Does not Exist "+path);
				response.writeHead(404, headers.toClient());
				response.end(theme.error404HTML);
			}
		});
	};

	var resourcesBasePath = [__dirname, "resources"].join(path.sep)+path.sep;
	var publicBasePath = [__dirname, "resources", "public"].join(path.sep)+path.sep;
	var themeDir = [__dirname, "resources", "themes", config.http.theme].join(path.sep)+path.sep;
	
	function httpRequestHandler(request, response){
		try{
			var responseHeaders = responseHeadersDef();
			var cookies = {};
			request.headers.cookie && request.headers.cookie.split(';').forEach(function( cookie ) {
				var parts = cookie.split('=');
				cookies[parts[0].trim()] = (parts[1] || '').trim();
			});
			var url = path.normalize(decodeURIComponent(request.url));
			switch(url){
				case "\\LICENSE":
					url = url+".txt";
				case "\\LICENSE.txt":
				case "\\client.js":
				case "\\client.min.js":
					return sendFile(__dirname+path.sep+url, request, response, responseHeaders);
				case "\\":
				case "/":
					url+=(config.http.defaultPage || "home");
				default:
					fs.access(publicBasePath+url+".html", fs.constants.R_OK, function(err){
						if(err===null){
							fs.readFile(publicBasePath+url+".html", function(err, pageData){
								if(err){
									console.error(err);
									response.writeHead(500, responseHeaders.toClient());
									response.end(theme.error500HTML);
									return;
								}
								response.writeHead(200, responseHeaders.toClient());
								response.end(theme.template.replace("{BODY}", pageData.toString()));
							});
							return;
						}
						fs.access(publicBasePath+url, fs.constants.R_OK, function(err){
							if(err && err.code==="ENOENT"){
								response.writeHead(404);
								response.end(theme.error404HTML);
							}
							else if(err){
								response.writeHead(500);
								response.end(theme.error500HTML);
								console.log("REQUEST Error "+request.method+" "+url+" "+request.connection.remoteAddress);
							}
							else{
								sendFile(publicBasePath+url, request, response, responseHeaders);
							}
						});
					});
				break;
			}
		}
		catch(e){
			response.writeHead(500);
			response.end(theme.error500HTML);
			console.log("REQUEST Error "+request.method+" "+url+" "+request.connection.remoteAddress);
		}
	}
	
	function shutdownAllServers(servers, done){
		if(servers.length>0){
			servers.pop().server.shutdown(function(){
				shutdownAllServers(servers, done);
			});
		}
		else{
			done();
		}
	}
	
	function loadTheme(doneCb){
		fs.readFile(themeDir+"template.html", function(err, template){
			theme.template = template.toString();
			fs.readFile(themeDir+"http403.html", function(err, template){
				theme.error403HTML = theme.template.replace("{BODY}",template.toString());
				fs.readFile(themeDir+"http404.html", function(err, template){
					theme.error404HTML = theme.template.replace("{BODY}",template.toString());
					fs.readFile(themeDir+"http500.html", function(err, template){
						theme.error500HTML = theme.template.replace("{BODY}",template.toString());
						fs.readFile([__dirname, "style.css"].join(path.sep), function(err, pluginStyle){
							fs.readFile(themeDir+"style.css", function(err, themeStyle){
								fs.writeFile([__dirname, "resources", "public", "style.css"].join(path.sep), pluginStyle+"\n"+themeStyle, function(err){
									if(doneCb!==undefined && typeof(doneCb)==="function"){
										doneCb();
									}
								});
							});
						});
					});
				});
			});
		});
	}
	
	var httpServers = {};
	function loadServers(){
		shutdownAllServers(Object.values(httpServers), function(){
			httpServers = {};
			var servers = config.http.servers;
			servers.forEach(function(serverConfig){
				if(serverConfig.port!==undefined){
					console.log("Starting "+serverConfig.protocol+" Server on port "+serverConfig.port);
					if(serverConfig.protocol==="https"){
						var keyPath = "resources/"+(serverConfig.key||"defaultKey.pem");
						var certPath = "resources/"+(serverConfig.cert||"defaultCert.pem");
						fs.readFile(keyPath, function(err, keyFile){
							serverConfig.key = keyFile;
							fs.readFile(certPath, function(err, certFile){
								serverConfig.cert = certFile;
								httpServers[serverConfig.port+""] = {server: startServer(https, serverConfig.port, httpRequestHandler, serverConfig), config: serverConfig};
								serversUpdatedE.emit(serverConfig.port+"", httpServers[serverConfig.port+""]);
							});
						});
					}
					else if(serverConfig.protocol==="http"){
						httpServers[serverConfig.port+""] = {server: startServer(http, serverConfig.port, httpRequestHandler, serverConfig), config: serverConfig};
						serversUpdatedE.emit(serverConfig.port+"", httpServers[serverConfig.port+""]);
					}
					else{
						console.error("HTTP Server config entry contains an unsupported protocol.", serverConfig);
					}
				}
				else{
					console.error("HTTP Server config entry does not specify a port.",serverConfig);
				}
			});
			serversUpdatedE.emit("update", httpServers);
		});
	}	
	
	config.configE.on("http/theme", loadTheme);
	config.configE.on("http/servers", loadServers);
	loadTheme(function(){
		loadServers();
	});

	return {
		getPost:getPost,
		getServers: function(){
			return httpServers;
		},
		getServersE: function(){
			return serversUpdatedE;
		}
	};
}());
