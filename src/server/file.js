var FILE = (function(file){
	/*
	MKPath: https://github.com/jrajav/mkpath
	Copyright (C) 2012 Jonathan Rajavuori
	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
	*/
	
	var fs = require('fs');
	var path = require('path');

	file.mkpath = function mkpath(dirpath, mode, callback) {
	    dirpath = path.resolve(dirpath);

	    if (typeof mode === 'function' || typeof mode === 'undefined') {
	        callback = mode;
	        mode = 0777 & (~process.umask());
	    }

	    if (!callback) {
	        callback = function () {};
	    }

	    fs.stat(dirpath, function (err, stats) {
	        if (err) {
	            if (err.code === 'ENOENT') {
	                mkpath(path.dirname(dirpath), mode, function (err) {
	                    if (err) {
	                        callback(err);
	                    } else {
	                        fs.mkdir(dirpath, mode, callback);
	                    }
	                });
	            } else {
	                callback(err);
	            }
	        } else if (stats.isDirectory()) {
	            callback(null);
	        } else {
	            callback(new Error(dirpath + ' exists and is not a directory'));
	        }
	    });
	};

	file.mkpathSync = function mkpathsync(dirpath, mode) {
	    dirpath = path.resolve(dirpath);

	    if (typeof mode === 'undefined') {
	        mode = 0777 & (~process.umask());
	    }

	    try {
	        if (!fs.statSync(dirpath).isDirectory()) {
	            throw new Error(dirpath + ' exists and is not a directory');
	        }
	    } catch (err) {
	        if (err.code === 'ENOENT') {
	            mkpathsync(path.dirname(dirpath), mode);
	            fs.mkdirSync(dirpath, mode);
	        } else {
	            throw err;
	        }
	    }
	};
	
	return file;
}(FILE || {}));
