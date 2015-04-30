var HTTP = (function(httpPublic){
	httpPublic.writeError = function(code, response){
		response.writeHead(code, response);
		if(code===404){
			response.write("These are not the droids your looking for...", 'utf8');
		}
		else{
			LOG.create("An unknown error has occured with code "+code);
			response.write("An unknown error has occured", 'utf8');
		}
        response.end();  
	};
	httpPublic.writeNotModified = function(response) {
		response.writeHead(304, response);
		response.end();
	};
	httpPublic.request = function(method, path, address, port, postData, domainSocket, requestComplete){
    	var domainSocket = domainSocket || false;
    	try{
			var post_data = qs.stringify(postData);
			  
			// An object of options to indicate where to post to
			var post_options = {
				path: path,
			    method: method,
			    headers: {
			    	'Content-Type': 'application/x-www-form-urlencoded',
			        'Content-Length': post_data.length
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
			  var post_req = httplib.request(post_options, function(res) {
			      var data = "";
				  res.setEncoding('utf8');
			      res.on('data', function (chunk) {
			          data+=chunk;
			      });
			      res.on('end', function () {
			    	  requestComplete(data);
			      });
			  });
		
			  // post the data
			  post_req.write(post_data);
			  post_req.end();
		}
		catch(e){console.log("ISS Authentication Exception");console.log(e);}
    };
	httpPublic.sendFile = function(path, request, response, headers){
	    fs.exists(path, function(exists){
	        if(exists){
	            fs.stat(path, function(err, stats){
	            	err = null;
	                fs.readFile(path, function(err, data){ 
						if (err) {
							response.writeHead(500);
							response.end();
						}
						else{         
			                var reqETag = request.headers['if-none-match'];
			                var reqDate = request.headers['if-modified-since'];
			                if((reqDate!==undefined && new Date(reqDate).getTime()>=new Date(stats.mtime).getTime()) || (reqETag!=undefined && crypto.createHash('md5').update(data).digest('hex')===reqETag)){
			                	httpPublic.writeNotModified(response);
			                }
			                else{
			                    headers['Content-Type'] = mime.lookup(path);
			                    headers['Accept-Ranges'] = "bytes";
			                    headers['ETag'] = crypto.createHash('md5').update(data).digest('hex'); 
			                    headers['Last-Modified'] = stats.mtime;
			                    response.writeHead(200, headers);
			                    fs.createReadStream(path).pipe(response);
			                }
						}
						data = null;
						exists = null;
						err = null;
						stats = null;
						data = null;
						path=null;
						request = null;
						response = null;
			
					});
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
	    response.writeHead(200, response);        
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
	httpPublic.startHTTPServerE = function(port, receiver){
        var httpServer = http.createServer(function(request, response){
            receiver.sendEvent({request: request, response: response});
        });
        httpServer.listen(port);  
        return httpServer;
	};
	
	httpPublic.startHTTPSServerE = function(port, receiver){
        var httpsServer = https.createServer({
            key: fs.readFileSync('./data/privatekey.pem'),
            cert: fs.readFileSync('./data/certificate.pem')
        }, function(request, response){
            receiver.sendEvent({request: request, response: response});
        });
        httpsServer.listen(port);  
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