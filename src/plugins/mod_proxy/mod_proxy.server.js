var MOD_PROXY = (function(mod_proxy) {
	var rules = {};
	HTTP.addMidRequestCallback(function(requestData) {
		var request = requestData.request;
		var response = requestData.response;
		for ( var pattern in rules) {
			var proxyOptions = rules[pattern];
			//var host = proxyOptions.host;
			//var rewrite = proxyOptions.rewrite;
			var matches = requestData.url.pathname.match(pattern);
			if (matches !== null && matches.length > 0) {
				LOG.create("Proxying Request " + requestData.url.pathname);
				if(proxyOptions.rewrite!==undefined){
					rewrite = proxyOptions.rewrite.replaceAll("$1", matches[1]);
	                requestData.url.pathname = rewrite;
	                requestData.url.path = rewrite;
	                requestData.url.href = rewrite;
				}
				
				var options = requestData.url;
				OBJECT.remove(options, "host");
				options.headers = request.headers;
				options.method = request.method;
				options.agent = false;
				OBJECT.extend(options, proxyOptions);
				options.headers.connection = "close";
				
				try{
				
					var proxyRequest = http.request(options, function(serverResponse) {
						response.writeHeader(serverResponse.statusCode, serverResponse.headers);
						serverResponse.on('error', function(e){serverResponse.unpipe(response);});
						serverResponse.pipe(response);
					});
	
					proxyRequest.on('error', function(e) {
						proxyRequest.abort();
						console.log("Proxy Error");
						console.log(e);
						request.unpipe(proxyRequest);
						options = null;
						proxyRequest = null;
						HTTP.writeError(500, response);
					});
	
					request.on('aborted', function() {
						proxyRequest.abort();
						request.unpipe(proxyRequest);
					});
					
					request.on('error', function(e) {
						console.log("requestError");
						request.unpipe(proxyRequest);
						HTTP.writeError(500, response);
						proxyRequest = null;
					});
	
					request.pipe(proxyRequest);
				}
				catch(e){
					console.log("Proxy Caught Error");
					console.log(e);
				}
				return false;
			}
		}
	});
	
	mod_proxy.addRule = function(expression, options) {
		rules[expression] = options;
	};

	mod_proxy.addRules = function(ruleset) {
		OBJECT.extend(rules, ruleset);
	};
	return mod_proxy;
}(MOD_PROXY || {}));
