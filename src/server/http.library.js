var HTTP = (function(httpPublic){
    var log = LOG.createModule("HTTP");
    var onFinished = require('on-finished');
    var destroy = require('destroy');
    httpPublic.writeError = function(code, response, headers){
	response.writeHead(code, headers);
	if(code===404){
	    response.write(fs.readFileSync(__dirname + "/themes/"+config.theme+"/404.html", 'utf8'), 'utf8');
	}
	else{
	    log.error("An unknown error has occured with code "+code);
	    response.write("An unknown error has occured "+code, 'utf8');
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
	catch(e){log.error("HTTP Request Exception");log.error(e);}
    };

    /*
     Download function that takes a regular expression URL path. It assumes the regexp path
     contains at least 1 group, the first of which is the filename to serve.
     */
    httpPublic.sendFileDownloadRegExp = function (regExpStr, fsDir) {
	HTTP.addMidRequestCallback(function (requestData) {
	    var regExpObj = new RegExp(regExpStr);
	    regExpResults = regExpObj.exec(requestData.request.url.pathname);
	    if (regExpResults) {
		var fileName = regExpResults[1];  // always assume the filename is the 1st matching group
		var filePath = fsDir + fileName;
		HTTP.sendFileDownload(filePath, requestData.request, requestData.response, requestData.responseHeaders);
		return false
	    }
	});
    };

    httpPublic.sendFileDownloadToURL = function(url, filePath, filenameOverride){
    	HTTP.addMidRequestCallback(function(requestData){
	    if(requestData.request.url.pathname===url){
		HTTP.sendFileDownload(filePath, requestData.request, requestData.response, requestData.responseHeaders, filenameOverride);
		return false;
	    }
	});	
    };
    httpPublic.sendDataAsyncDownload = function(request, response, headers, filename) {
        headers.set('Content-Disposition', 'attachment;filename='+filename);
	request.on('error', function(err) {
            done = true;
            HTTP.writeError(500, response);
        });

	headers.set('Content-Type',mime.getType(filename));
	headers.set('Accept-Ranges',"bytes");
	//headers.set('ETag',crypto.createHash('md5').update(data).digest('hex')); 

        var gotData = false;
        var done = false;
        return {
            dataCB : function (data) {
                if (done) {
                    return;
                }
                if (!gotData) {
	            response.writeHead(200, headers.toClient());
                }
                gotData = true;
	        response.write(data);
            },
            endCB: function (error) {
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

    httpPublic.sendFileDownload = function(path, request, response, headers, filename){
    	if(filename===undefined){
	    var splitPath = path.split("/");
	    filename = splitPath[splitPath.length-1];
	}
	headers.set('Content-Disposition', 'attachment;filename='+filename);
	httpPublic.sendFile(path, request, response, headers);
    };
    httpPublic.sendFile = function(path, request, response, headers, cb){
	request.on('error', function(err) {
            HTTP.writeError(500, response);
        });

        var sendFileInternal = function (path, gz) {
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
		    if(reqDate!==undefined && new Date(reqDate).getTime()===new Date(stats.mtime).getTime()){
                        
                        
		        httpPublic.writeNotModified(response);
		    }
		    else{
		        headers.set('Content-Length',stats.size);
                        if (gz) {
		            headers.set('Content-Type',mime.getType(gz));
                            headers.set('Content-Encoding', 'gzip');
                        }
                        else {
		            headers.set('Content-Type',mime.getType(path));
                        }
		        headers.set('Accept-Ranges',"bytes");
                        // headers.set('Expires',"-1");
                        // headers.set("Cache-Control", "must-revalidate");
                        headers.set("Cache-Control", "no-cache");
		        //headers.set('ETag',crypto.createHash('md5').update(data).digest('hex'));
		        headers.set('Last-Modified',stats.mtime);
		        response.writeHead(200, headers.toClient());
		        var readStream = fs.createReadStream(path);
		        readStream.pipe(response);
		        readStream.on('error', function(err) {
		            if(response!==null){
		                HTTP.writeError(500, response);
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
			onFinished(response, function (err) {
			    destroy(readStream);
			});
		    }
		}
		err = null;
		stats = null;
		path=null;
                gz = null;
		request = null;
		//response = null;
	    });
        };
            
	fs.exists(path, function(exists){
	    if(exists){
                sendFileInternal(path, false);
	    }
	    else{
                fs.exists(path + '.gz', function (exists) {
                    if (exists) {
                        sendFileInternal(path + '.gz', path);
                        
                    }
                    else {
                        log.warn("File Does not Exist "+path);
	                HTTP.writeError(404, response);
                    }
                });
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
    
    var startServer = function (type, port, receiver, opt_options) {
        var running = true;
        var callback = function(request, response){
            if (running) {
                receiver.sendEvent({request: request, response: response});
            }
            else {
                console.log("got message when not running");
            }
        };
        var httpServer = opt_options ? type.createServer(opt_options, callback) : type.createServer(callback);

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
            running = false;
        };
        httpServer.sockets = sockets;
        httpServer.listen(port); 
        return httpServer;        
    };


    httpPublic.startHTTPServerE = function(port, receiver){
        return startServer(http, port, receiver);

    };
    
    httpPublic.startHTTPSServerE = function(port, receiver, options){
        return startServer(https, port, receiver, options);
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
