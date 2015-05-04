var MOD_UPLOAD = (function(mod_upload){
	var multiparty = require("multiparty");
	var SlowStream = require("slow-stream");
    var rules = {};
    var maxUploadWriteInterval = 50;	//This value will throttle the upload speed, to reduce memory usage and increase GC events.
    
    HTTP.addPreRequestCallback(function(requestData){
    	var request = requestData.request;
    	var response = requestData.response;
        if(requestData.url.pathname.startsWith("/cgi-bin/upload.cgi") && request.method === 'POST'){
            var request =requestData.request;
            console.log("Uploading File");
            try{
                var form = new multiparty.Form();
                response.writeHead(200, {'content-type': 'text/plain'});
                
                
                form.on('part', function(part) {
			    if (part.filename == null) {
			      part.resume();
			    } else {
			      var name = part.filename;
			      var stream = fs.createWriteStream("/tmp/"+part.filename);
			      part.on('end', function(err) {
			        LOG.create("File upload complete");
			      });
			      // Pipe the part parsing stream to the file writing stream.
			      part.pipe(new SlowStream({ maxWriteInterval: maxUploadWriteInterval })).pipe(stream);	
			    }
			  });
			
			  // End the request when something goes wrong.
			  form.on('error', function(err) {
			    LOG.create("File upload error,", err);
			    response.end("{}");
			  });
			  
			  form.on('aborted', function(err) {
			    LOG.create("File upload aborted,", err);
			    response.end("{}");
			  });
			
			  // Send success code if file was successfully uploaded.
			  form.on('close', function() {
			  	 LOG.create("File upload parse complete");
			    response.end("{}");
			  });

			  form.parse(request);                
            }
            catch(e){
                console.log("An error occured during file upload");
                console.log(e);
                response.end("{}");
            }
            return false;
        }

        
        
    });
    return mod_upload;
}(MOD_UPLOAD || {}));
