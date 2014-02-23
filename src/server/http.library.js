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
	httpPublic.sendFile = function(path, response){
		response['Content-Type'] = mime.lookup(path);
		if(fs.existsSync(path)){        
			response.writeHead(200, response);
            response.write(fs.readFileSync(path), 'utf8');
        }
        else{
        	public.writeError(404, response);
        }
        response.end();
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
        listingHtml+="</body></html>"
        response.write(listingHtml, 'utf8');
        response.end();
	};
	
	return httpPublic;
})(HTTP || {});