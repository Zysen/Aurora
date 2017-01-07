var HTTP = (function(httpPublic){
	httpPublic.writeError = function(code, response, headers){
		response.writeHead(code, headers);
		if(code===404){
			response.write(fs.readFileSync(__dirname + "/themes/"+config.theme+"/404.html", 'utf8'), 'utf8');
		}
		else{
			LOG.create("An unknown error has occured with code "+code);
			response.write("An unknown error has occured", 'utf8');
		}
        response.end();  
	};
	httpPublic.writeNotModified = function(response) {
		response.writeHead(304);
		response.end();
	};
	httpPublic.request = function(method, path, address, port, postData, domainSocket, requestComplete, errorCB, closeCB){
    	var domainSocket = domainSocket || false;
    	try{
			var post_data = qs.stringify(postData);
			// An object of options to indicate where to post to
			var post_options = {
				path: path,
			    method: method,
			    headers: {
			    	'Content-Type' : 'application/x-www-form-urlencoded',
			        'Content-Length' : post_data.length
			    }
			};
			if(domainSocket){
				post_options.socketPath = address;
			}
			else{
				post_options.host = address;
			}
			if(port){
				post_options.port = port;
			}
			  // Set up the request
			  var post_req = http.request(post_options, function(res) {
				  var data = "";
				  res.setEncoding('utf8');
			      res.on('data', function (chunk) {
			    	  data+=chunk;
						
			      });
			      res.on('close', function (data) {
			    	  if(closeCB!==undefined){
			    		  closeCB(data);
			    	  }
			      });
			      res.on('error', function (data) {
			    	  if(errorCB!==undefined){
			    		  errorCB(data);
			    	  }
			      });
			      res.on('end', function () {
			    	  requestComplete(data);
			      });
			  });
			  
			  post_req.on('error', function(data){
				  if(errorCB!==undefined){
		    		  errorCB(data);
		    	  }
			  });
			  // post the data
			  post_req.write(post_data);
			  post_req.end();
		}
		catch(e){console.log("HTTP Request Exception");console.log(e);}
    };
    httpPublic.sendFileDownload = function(path, request, response, headers, filename){
    	if(filename===undefined){
			var splitPath = path.split("/");
			filename = splitPath[splitPath.length-1];
		}
		headers.set('Content-Disposition', 'attachment;filename='+filename);
		httpPublic.sendFile(path, request, response, headers);
    };
	httpPublic.sendFile = function(path, request, response, headers){
		request.on('error', function(err) {
        	HTTP.writeError(500, response);
        });
	    fs.exists(path, function(exists){
	        if(exists){
	            fs.stat(path, function(err, stats){
	            	if (err) {
						response.writeHead(500);
						response.end();
					}
					else{         
		               /*
						var reqETag = request.headers['if-none-match'];
		                
		                 if((reqDate!==undefined && new Date(reqDate).getTime()>=new Date(stats.mtime).getTime()) || (reqETag!=undefined && crypto.createHash('md5').update(data).digest('hex')===reqETag)){
		                	httpPublic.writeNotModified(response);
		                }
		                */
						var reqDate = request.headers['if-modified-since'];
						if(reqDate!==undefined && new Date(reqDate).getTime()>=new Date(stats.mtime).getTime()){
		                	httpPublic.writeNotModified(response);
		                }
		                else{
		                	headers.set('Content-Length',stats.size);
		                    headers.set('Content-Type',mime.lookup(path));
		                    headers.set('Accept-Ranges',"bytes");
		                    //headers.set('ETag',crypto.createHash('md5').update(data).digest('hex')); 
		                    headers.set('Last-Modified',stats.mtime);
		                    response.writeHead(200, headers.toClient());
		                    var readStream = fs.createReadStream(path);
		                    readStream.pipe(response);
		                    readStream.on('error', function(err) {
		                    	HTTP.writeError(500, response);
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
		                    		response.end();
		                    	}
							});
		                }
					}
					exists = null;
					err = null;
					stats = null;
					path=null;
					request = null;
					response = null;
	            });            
	        }
	        else{
	            console.log("File Does not Exist "+path);
	            HTTP.writeError(404, response);
	        }
	    });
	};
	httpPublic.redirect = function(response, url){
	    response.writeHead(302, {'Location': url});
        response.end();
	};
	httpPublic.readDirectory = function(response, url){
	    response.writeHead(200);        
        var listingHtml = "<html><head><style type=\"text/css\" media=\"all\">@import \"/style.css\";</style> </head><body><h1>"+url+"</h1>";
        var files = fs.readdirSync(url.substring(1));
        for(var index in files){
            var fileStat = fs.statSync(__dirname + url+"/"+files[index]);
            if(fileStat.isDirectory()){
                listingHtml += "<div class=\"directoryEntry\"><a href=\""+url+"/"+files[index]+"\" class=\"directory_file\"><img src=\"/resources/images/fileicons/directory.png\" class=\"directory_icon\" />"+files[index]+"</a></div>";
            }
        }
        for(var index in files){
            var fileStat = fs.statSync(__dirname + url+"/"+files[index]);
            if(fileStat.isFile()){
                var filenameSplit = files[index].split(".");
                var extension = filenameSplit[filenameSplit.length-1];
                var icon = fs.existsSync("resources/images/fileicons/"+extension+".png")?"/resources/images/fileicons/"+extension+".png":"/resources/images/fileicons/blank.png";           
                listingHtml += "<div class=\"directoryEntry\"><a href=\""+url+"/"+files[index]+"\" class=\"directory_file\"><img src=\""+icon+"\" class=\"directory_icon\" />"+files[index]+"</a></div>";
            }
        }
        listingHtml+="</body></html>";
        response.write(listingHtml, 'utf8');
        response.end();
	};
	httpPublic.getPost = function(request, callback){
		var contentType = request.headers["content-type"] || "";
		if (request.method == 'POST') {
            var body = '';
            request.on('data', function (data) {
                body += data;
            });
            request.on('end', function () {
            	try{
	            	switch(contentType){
	            		case "application/json":
	            			callback(JSON.parse(body), body);
	            		break;
	            		default:
	            			callback(qs.parse(body), body);
	            		break;
	            	}
            	}
            	catch(e){
            		console.log("Aurora HTTP cannot parse request of type ",contentType, e);
            		callback(null, body);
            	}
            	
            	
            	
            });  
        }
	},
	httpPublic.startHTTPServerE = function(port, receiver){
        var httpServer = http.createServer(function(request, response){
        	receiver.sendEvent({request: request, response: response});
        });
        var sockets = {}, nextSocketId = 0;
        httpServer.on('connection', function (socket) {
        	var socketId = nextSocketId++;
        	sockets[socketId] = socket;
        	socket.on('close', function () {
        		delete sockets[socketId];
        	});
        });
        httpServer.shutdown = function(){
        	for(var index in sockets){sockets[index].destroy();}
        };
        httpServer.sockets = sockets;
        httpServer.listen(port); 
        return httpServer;
	};
	
	httpPublic.startHTTPSServerE = function(port, receiver, options){
		console.log("startHTTPSServerE", __dirname+'/data/privatekey.pem', __dirname+'/data/certificate.pem');
		
		var defaultOptions = {};
		if(fs.existsSync(__dirname+'/data/privatekey.pem')){defaultOptions.key = fs.readFileSync(__dirname+'/data/privatekey.pem');}
		if(fs.existsSync(__dirname+'/data/certificate.pem')){defaultOptions.cert = fs.readFileSync(__dirname+'/data/certificate.pem');}
		if(fs.existsSync(__dirname+'/data/sslaurthority')){defaultOptions.ca = fs.readFileSync(__dirname+'/data/sslaurthority');}
		options = options || defaultOptions;
        var httpsServer = https.createServer(options, function(request, response){
            receiver.sendEvent({request: request, response: response});
        });
        var sockets = {}, nextSocketId = 0;
        httpsServer.on('connection', function (socket) {
        	var socketId = nextSocketId++;
        	sockets[socketId] = socket;
        	socket.on('close', function () {
        		delete sockets[socketId];
        	});
        });
        httpsServer.shutdown = function(){
        	for(var index in sockets){
        		sockets[index].destroy();
        	}
        };
        httpsServer.listen(port);
        httpsServer.sockets = sockets;
        return httpsServer;        
    };
	httpPublic.createWebSocket = function(httpServer, receiver){
        var webSocket = new WebSocketServer({
            httpServer: httpServer,
            autoAcceptConnections: false
        });
        
        webSocket.on('error', function(error) {               
            receiver.sendEvent(SIGNALS.newError("Websocket Error: "+error));
        });
        
        webSocket.on('request', function(request){
            receiver.sendEvent(request);
        });
        return webSocket;
    };
	return httpPublic;
})(HTTP || {});