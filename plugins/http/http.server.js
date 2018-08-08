goog.provide("aurora.http");
goog.require("config");

/**
 * @typedef {{port:number,protocol:string,websocket:?boolean,key:?buffer.Buffer,cert:?buffer.Buffer}}
 */
aurora.http.ConfigServerType;
 
/**
 * @typedef {{servers:Array<aurora.http.ConfigServerType>,directoryBrowsing:boolean,defaultPage:string,sourceDirectory:string,serverDescription:string,theme:string}}
 */
aurora.http.ConfigType;

/**
 * @typedef {{server:?,config:aurora.http.ConfigServerType}}
 */
aurora.http.Server;

(function(){
	
	var types = aurora.websocket.enums.types;
	var COMMANDS = aurora.websocket.enums.COMMANDS;
	//TODO: Send an object that contains a binary field.
	
	const node_http = require("http");
	const node_https = require("https");
	const mime = require("mime");
	const fs = require("fs");
	const path = require("path");
	const qs = require("querystring");
	const EventEmitter = require('events').EventEmitter;
	
	aurora.http.serversUpdatedE = new EventEmitter();
		
	var theme = {};
		
	aurora.http.getPost = function(request, callback){
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
		var httpServer = (opt_options && type===node_https) ? type.createServer(opt_options, callback) : type.createServer(callback);
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
		var headers = {"Server":[config['http']['serverDescription'] || "AuroraHTTP"], "Date":[(new Date()).toGMTString()]};
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
							headers.set('Cache-Control',"no-cache, no-store, must-revalidate");
							//headers.set('Last-Modified',stats.mtime.toGMTString());
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
										console.error("Assertion error during http abort.", e);
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
	var themeDir = [__dirname, "resources", "themes", config['http']['theme']].join(path.sep)+path.sep;
	var sourceDir = path.resolve(__dirname+path.sep+config['http'].sourceDirectory);
	//Strict-Transport-Security: max-age=31536000 
	//config.strictTransportSecurity
	function httpRequestHandler(request, response){
		try{
			var responseHeaders = responseHeadersDef();
			var cookies = {};
			request.headers.cookie && request.headers.cookie.split(';').forEach(function( cookie ) {
				var parts = cookie.split('=');
				cookies[parts[0].trim()] = (parts[1] || '').trim();
			});

			var url = path.normalize(decodeURIComponent(request.url));
			//console.log("url", url);
			switch(url){
				case path.sep+"client.min.js":
					if(config['http']['sourceDirectory']!==undefined){
						responseHeaders.set("X-SourceMap", path.sep+"client.min.js.map");
					}
					return sendFile(__dirname+path.sep+url, request, response, responseHeaders);
				case path.sep+"LICENSE":
					url = url+".txt";
				case path.sep+"LICENSE.txt":
				case path.sep+"client.js":
				case path.sep+"client.libs.js":
				case path.sep+"client.min.js.map":
				case path.sep+"server.min.js.map":
					return sendFile(__dirname+path.sep+url, request, response, responseHeaders);
				case path.sep:
				case "/":
					url+=(config['http']['defaultPage'] || "home");
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
							if(err && err['code']==="ENOENT"){		
								
								if(config['http']['sourceDirectory']!==undefined){
									fs.access(path.resolve(sourceDir+url), fs.constants.R_OK, function(err){
										if(err && err.code==="ENOENT"){
											response.writeHead(404);
											response.end(theme.error404HTML);
										}
										else{
											sendFile(config['http']['sourceDirectory']+path.sep+url, request, response, responseHeaders);
										}
									});
									return;
								}
								
								response.writeHead(404);
								response.end(theme.error404HTML);
							}
							else if(err){
								response.writeHead(500);
								response.end(theme.error500HTML);
								console.log("REQUEST Error "+request.method+" "+request.url+" "+request.connection.remoteAddress);
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
			console.log(e);
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
			fs.readFile(themeDir+"http403.html", function(err, template403){
				theme.error403HTML = theme.template.replace("{BODY}",template403.toString());
				fs.readFile(themeDir+"http404.html", function(err, template404){
					theme.error404HTML = theme.template.replace("{BODY}",template404.toString());
					fs.readFile(themeDir+"http500.html", function(err, template500){
						theme.error500HTML = theme.template.replace("{BODY}",template500.toString());
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
			config['http']['servers'].forEach(function(serverConfig){
				if(serverConfig.port!==undefined){
					if(serverConfig.protocol==="https"){
						serverConfig['key'] = fs.readFileSync("resources/"+(serverConfig.key||"defaultKey.pem"));
						serverConfig['cert'] = fs.readFileSync("resources/"+(serverConfig.cert||"defaultCert.pem"));
						httpServers[serverConfig.port+""] = /** @type {aurora.http.ConfigServerType} */ ({server: startServer(node_https, serverConfig.port, httpRequestHandler, serverConfig), config: serverConfig});
						aurora.http.serversUpdatedE.emit(serverConfig.port+"", httpServers[serverConfig.port+""]);
					}
					else if(serverConfig.protocol==="http"){
						httpServers[serverConfig.port+""] = /** @type {aurora.http.ConfigServerType} */({server: startServer(node_http, serverConfig.port, httpRequestHandler, serverConfig), config: serverConfig});
						aurora.http.serversUpdatedE.emit(serverConfig.port+"", httpServers[serverConfig.port+""]);
					}
					else{
						console.error("HTTP Server config entry contains an unsupported protocol.", serverConfig);
					}
				}
				else{
					console.error("HTTP Server config entry does not specify a port.",serverConfig);
				}
			});
			aurora.http.serversUpdatedE.emit("update", httpServers);
		});
	}	
	process.chdir(__dirname);
	config.configE.on("http/theme", loadTheme);
	config.configE.on("http/servers", loadServers);
	loadTheme(function(){
		loadServers();
	});
}());