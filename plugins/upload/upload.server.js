goog.provide('aurora.Upload');
goog.provide('aurora.upload');

goog.require('aurora.http');
goog.require('aurora.log');
goog.require('config');

/**
 * @constructor
 */
aurora.Upload = function() {
};

/**
 * @param {string} urlPathPrefix
 * @param {string} fileDestination
 * @param {function(({start:boolean}|{error:?, data:?, url:string, token:string}))} cb
 * @param {{restrictedExtension:(string|undefined),
 *          allowOverwrite:(boolean|undefined),
 *          overrideFilename:(string|undefined),
 *          clearUploaded:(boolean|undefined),
 *          permission: ((function (?):boolean)|undefined),
 *          startEvent:(boolean|undefined)}=} opt_options
 */
aurora.Upload.prototype.handleUpload = function(urlPathPrefix, fileDestination, cb, opt_options) {
    var fs = require('fs');
    var path = require('path');
    var log = aurora.log.createModule('UPLOAD');
    var me = this;
    var opts = opt_options || {};

    aurora.http.addMidRequestCallback(
        new RegExp('^' + aurora.http.escapeRegExp(urlPathPrefix)) ,
        function(state) {
            if (opt_options && opt_options.permission) {
                if (!opt_options.permission(state)) {
                    return undefined;
                }
            }
            if (state.url.pathname.startsWith(urlPathPrefix) && state.request.method === 'POST') {
                if (opts.startEvent) {
                    cb({start: true});
                }
                try {
                    if (opts.clearUploaded && opts.restrictedExtension) {
                        fs.readdirSync(fileDestination).forEach(function(f) {
                            if (f.endsWith(opts.restrictedExtension || '')) {
                                fs.unlinkSync(fileDestination + f);
                            }
                        });
                    }
                }
                catch (e) {
                    log.error('error removing file', e);
                }
                return me.handleUpload_(state, fileDestination, opts.restrictedExtension || '', !!opts.allowOverwrite, opts.overrideFilename || '',
                    function(err, data) {
                        cb({error: err, data: data, url: (state.request.url || ''), token: state.token});
                    });
            }
            return undefined;
        });

};
/**
 * @private
 * @param {?} requestData
 * @param {string} destDir
 * @param {string} restrictedExtension
 * @param {boolean} allowOverwrite
 * @param {string} overrideFilename
 * @param {function(?,?)} cb
 * @return {undefined|boolean}
 */
aurora.Upload.prototype.handleUpload_ = function(requestData, destDir, restrictedExtension, allowOverwrite, overrideFilename, cb) {
    var multiparty = require('multiparty');
    var SlowStream = /** @type {?} */ (require('slow-stream'));
    var request = requestData.request;
    var response = requestData.response;
    var log = aurora.log.createModule('UPLOAD');
    var fs = require('fs');
    var path = require('path');

    var getFileNameParts = function(fname) {
        // remove milliseconds and 'Z' for UTC timezone
        var utcTimeStamp = new Date().toISOString().split('.')[0].replaceAll(':', '_');
        var dir = path.dirname(fname);
        var name = path.basename(fname);
        var fnameParts = name.split('.');
        return {
            timestamp: '_' + utcTimeStamp,
            prefix: path.join(dir, fnameParts.slice(0,-1).join('.')),
            suffix: fnameParts.length > 1 ? '.' + fnameParts[fnameParts.length - 1] : ''
        };
    };
   
    var verifyFilePath = function(fname, extension) {
        if (extension && !fname.endsWith(extension)) {
            console.log('invalid extension', extension, fname);
            throw new Error('invalid file extension!');
        }
        if (path.resolve(fname) !== fname) {
            console.log('resolve failed', path.resolve(fname), fname);
            throw new Error('invalid file path!');
        }
        console.log('path verified');
        return true;
    };

    var cbCalled = false;
    var singleCb = function (x, y){
        
        if(!cbCalled) {
            cb(x, y);
        }
        cbCalled = true;
    };
    
    if (request.method === 'POST') {
        log.info('Uploading File');
        var form = new multiparty.Form();
        var filename = undefined;
        form.on('part', function(part) {
            if (!part.filename) {
                // filename is not defined when this is a field and not a file
                // so ignore the field's content
                part.resume();
            } else {
                filename = part.filename;
                let fullPath = path.join(destDir, filename);
                // sanity check the filename hasn't been evily crafted to write elsewhere
                try {
                    verifyFilePath(fullPath, restrictedExtension);
                } catch (e) {
                    response.writeHead(400, {'content-type': 'text/plain'});
                    response.end(e.message);
                    log.warn('File upload part aborted');
                    singleCb(e, 'File upload aborted');
                    // don't really seem to have a nice way to abort the upload? so pipe to /dev/null
                    // e.g. https://github.com/andrewrk/node-multiparty/issues/27
                    return part.pipe(fs.createWriteStream('/dev/null'));
                }

                // override filename if specified (NOTE: this is done after we sanity-check the specified
                // file path and extension)
                if (overrideFilename) filename = overrideFilename;

                let fnameParts = getFileNameParts(fullPath);

                let makePath = function (prefix, count, suffix) {
                    if (count === -1) {
                        return prefix  + suffix;
                    }
                    else {
                        if (count === 0) {
                            return prefix + fnameParts.timestamp + suffix;
                        }
                        return prefix + fnameParts.timestamp + '('+ count + ')' + suffix;

                    }
                };
                let writeFile = function (prefix, count, suffix) {
                  
                    return function (exists) {
                        let fullPath = makePath(prefix, count, suffix);
                        if (!allowOverwrite && exists) {
                            fs.exists(makePath(prefix, count + 1, suffix), writeFile(prefix, count + 1, suffix));
                            return;
                        }
                        var stream = fs.createWriteStream(fullPath);

                        part.on('end', function(err) {
                            log.debug('Part upload complete');
                        });
                        var throttle = config['uploadThrottle'];
                        // Pipe the part parsing stream to the file writing stream.
                        if (throttle) {
                            part.pipe(new SlowStream({maxWriteInterval: config['uploadThrottle']})).pipe(stream);
                        }
                        else {
                            part.pipe(stream);
                        }
                    };
                };
                // check for duplicate file and adjust accordingly
                fs.exists(fullPath, writeFile(fnameParts.prefix,-1, fnameParts.suffix));

            }

            // handle a "part" error
            part.on('error', function(err) {
                log.debug('File upload part error,', err);
                response.writeHead(422, {'content-type': 'text/plain'});
                response.end('{}');
                singleCb(err || 'Upload Error', null);
            });
            return undefined;
        });

        // End the request when something goes wrong.
        form.on('error', function(err) {
            log.error('File upload error,', err);
            response.writeHead(422, {'content-type': 'text/plain'});
            response.end('{}');
            singleCb(err || 'Upload Error', null);
        });

        // NOTE: actually, in practice, we don't need to handle this (according to doc?)
        form.on('aborted', function(err) {
            log.warn('File upload aborted,', err);
            response.writeHead(422, {'content-type': 'text/plain'});
            response.end('{}');
            singleCb(err || 'aborted', 'File upload aborted,');
        });

        // Send success code if file was successfully uploaded.
        form.on('close', function() {
            log.info('File upload complete');
            response.writeHead(200, {'content-type': 'text/plain'});
            response.end('{}');
            singleCb(null, {filename: filename});
        });

        form.parse(request);

        return false;
    }
    return undefined;
};

/**
 * @final
 */
aurora.upload = new aurora.Upload();
