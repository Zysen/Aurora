goog.provide('aurora.template');
goog.require('aurora.http');
goog.require('config');

/**
 * returns a function that will write a template out to an http request
 * @param {string} location
 * @param {Object} parameters
 * @param {boolean} cache
 * @param {number=} opt_responseCode http response
 * @param {function(!aurora.http.RequestState):Object<string,string>=} opt_headers extra http headers
 * @return {function(!aurora.http.RequestState)}
 */
aurora.template.provide = function(location, parameters, cache, opt_responseCode, opt_headers) {
    var fs = require('fs');
    var mime = require('mime');
    return function(state) {
        var theme = aurora.http.theme;
        var process = function(err, data, stats) {
            var response = state.response;
            var request = state.request;
            // todo maybe use a stream this could block
            if (err) {
                response.writeHead(404);
                response.end(theme.error404HTML);
            }
            else {
                var headers = state.responseHeaders;
                for (var param in parameters) {
                    data = data.replace(new RegExp('\\{' + param + '\\}', 'g'), function () {return parameters[param];});
                }
                var reqDate = request.headers['if-modified-since'];
                if (reqDate !== undefined && new Date(reqDate).getUTCSeconds() === new Date(stats.mtime).getUTCSeconds()) {
                    response.writeHead(304, headers.toClient());
                    response.end();
                }
                else {
                    headers.set('Content-Length', data.length);
                    headers.set('Content-Type', mime.getType(location));
                    headers.set('Accept-Ranges', 'bytes');
                    headers.set('Cache-Control', 'no-cache, must-revalidate');
                    headers.set('Last-Modified', stats.mtime.toGMTString());
                    if (opt_headers) {
                        var extraHeaders = opt_headers(request);
                        for (var k in extraHeaders) {
                            if (extraHeaders.hasOwnProperty(k)) {
                                headers.set(k, extraHeaders[k]);
                            }
                        }
                    }
                    response.writeHead(opt_responseCode === undefined ? 200 : opt_responseCode,
                                       headers.toClient());
                    response.write(data);
                    response.end();
                }

            }
        };
        fs.stat(location, function(err, stats) {
            if (err) {
                process(err, null, null);
            }
            else {
                fs.readFile(location, 'utf8', function(err, data) {process(err, data, stats);});
            }
        });
        return true;
    };
};
