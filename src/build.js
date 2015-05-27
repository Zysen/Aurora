var fs = require("fs");
var jsmin = require('jsmin2');
var jslint = require('node-jslint').JSLINT;
var path = require("path");
console.log(process.argv.length);
console.log(process.argv);
for ( var index in process.argv) {
	console.log(process.argv[index]);
}
var config = JSON.parse(fs.readFileSync((process.argv.length > 2 && fs.existsSync(process.argv[2])) ? process.argv[2] : __dirname + "/../config.json"));
var theme = config.theme;
var exec = require('exec');

var ignorePlugins = ["skeleton", "git", "ckeditor", "webrtc", "cavalierJS", "zysen_dayz", "jqueryui", "jqueryui-modules","tables2", "tables", "layer2.isp", "canvasjs", "stats", "csr", "csr.top_menu", "csr.revert_timer", "debug", "npid", "requirejs", "webrtc2", "npid", "mysql", "traffic" ]; // "csr",

var ARRAYS = (function(arrays) {
	arrays.arrayCut = function(array, index) {
		array.splice(index, 1);
	};
	arrays.max = function(array) {
		return Math.max.apply(Math, array);
	};
	arrays.min = function(array) {
		return Math.min.apply(Math, array);
	};
	arrays.arrayContains = function(array, search, strictType) {
		return arrays.arrayIndexOf(array, search, strictType) > -1;
	};
	arrays.contains = arrays.arrayContains;
	arrays.arrayIndexOf = function(arr, needle, strictType) {
		for (var i = 0; i < arr.length; i++) {

			if (strictType === false) {
				if (arr[i] == needle) {
					return i;
				}
			} else {
				if (arr[i] === needle) {
					return i;
				}
			}

		}
		return -1;
	};
	arrays.remove = function(arr, val, useStrict) {
		var pos = arrays.arrayIndexOf(arr, val, useStrict == undefined ? true : useStrict);
		if (pos >= 0) {
			arr.splice(pos, 1);
		}
	};
	return arrays;
})(ARRAYS || {});

String.prototype.endsWith = function(suffix) {
	return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

var concatenate = function() {
	var concatenated = "";
	for ( var index in arguments) {
		var fileArray = arguments[index];
		for ( var index in fileArray) {
			concatenated += fs.readFileSync(fileArray[index]) + "\n\n";
		}
	}
	return concatenated;
};

var lintCheck = function(code, filename, options) {
	var name = filename.replace(".js", "").replace("../", "");

	if (!fs.existsSync("build_output")) {
		fs.mkdirSync("build_output");
	}
	if (!fs.existsSync("build_output/" + name)) {
		fs.mkdirSync("build_output/" + name);
	}

	var validLintCheck = jslint(code, options);
	if (!validLintCheck) {
		console.log("Failed Lint Checking");
		var results = jslint.data();
		fs.writeFileSync("build_output/" + name + "/jsmin_error.html", jslint.error_report(results));
		return false;
	}
	fs.writeFileSync("build_output/" + name + "/jsmin_out.html", jslint.report(results));
	return true;
};

var minify = function(code, filename) {
	var minified = jsmin(code);
	var codeMap = minified.codeMap;
	fs.writeFileSync(filename, minified.code);
};

var generateJSDocs = function(file, cb) {
	var name = file.replace(".js", "").replace("../", "");

	console.log("\nGenerating docs for " + name);

	if (!fs.existsSync("build_output")) {
		fs.mkdirSync("build_output");
	}
	if (!fs.existsSync("build_output/" + name)) {
		fs.mkdirSync("build_output/" + name);
	}
	if (!fs.existsSync("build_output/" + name + "/docs")) {
		fs.mkdirSync("build_output/" + name + "/docs");
	}

	exec([ 'node', '../node_modules/jsdoc2/app/run.js', '-a', "-d=build_output/" + name + "/docs", file ], function(err, out, code) {
		if (err)
			throw err;
		// process.stdout.write(out);
		var out2 = out;
		// process.exit(code);
		cb();
	});
};

var writeFile = function(code, filename) {
	fs.writeFileSync(filename, code);
};

var updateVersion = function() {
	fs.writeFileSync("shared/aurora_version.js", "AURORA.VERSION = '" + (new Date().getTime()) + "';\n");
};

var complete = false;
function wait() {
	process.stdout.write(".");
	setTimeout(function() {
		if (!complete) {
			wait();
		}
	}, 1000);
}

var sharedBuildFiles = [];

var clientBuildFiles = [
// "client/closure-base.js",
"server/goog.js", "shared/number.js", "shared/enums.js", "shared/aurora_version.js", "shared/log.js", "shared/date.js", "shared/math.js", "shared/function.js", "shared/object.js", "shared/ARRAYS.js", "shared/string.js", "shared/flapjax.closure.js", "shared/signals.js",
        "shared/crypto.js", "plugins/jquery/jquery-2.0.3.min.js", "plugins/jquery/jquery-flapjax.js", "shared/aurora.flapjax.js", "client/dom.js", "client/binary.client.js", "client/aurora.js",

        "plugins/tables/tables.js", "plugins/tables/tables.shared.js", "plugins/tables/tables.client.js", "plugins/tables/tables.validators.js", "client/widget.renderers.js", "client/authentication.client.js"
// "plugins/stats/stats.client.widgets.js",
// "plugins/debug/debug.client.widgets.js",
// "plugins/aurora.administration/aurora.administration.client.js",
// "plugins/aurora.administration/aurora.administration.client.widgets.js",
// "plugins/treeview/treeview.client.js",
// "plugins/treeview/treeview.client.js",
// "plugins/checklist/checklist.client.js",
// "plugins/checklist/checklist.client.widgets.js"
];

var clientCSSFiles = [ "../themes/" + theme + "/style.css",
// "plugins/stats/stats.css",
"plugins/tables/tables.css" ];

var serverBuildFiles = [ "server/file.js", "server/goog.js", "shared/enums.js", "shared/number.js", "shared/log.js", "shared/signals.js", "shared/math.js", "shared/object.js", "shared/arrays.js", "shared/string.js", "shared/date.js",
        "shared/crypto.js", "shared/aurora_version.js", "server/aurora.settings.server.js", "shared/flapjax.closure.js", "shared/aurora.flapjax.js", "plugins/tables/tables.shared.js", "server/http.library.js",
        "server/binary.server.js", "server/server.js", "server/authentication.server.js"
// "plugins/stats/stats.server.js",
// "plugins/debug/debug.server.js",
// "plugins/aurora.administration/aurora.administration.server.js",
// "plugins/checklist/checklist.server.js"
];



var target = (process.argv.length >= 3) ? process.argv[2] : "debug";

if(target=="libs"){
	var libs = concatenate(["server/goog.js", "shared/number.js", "shared/date.js", "shared/math.js", "shared/function.js", "shared/object.js", "shared/ARRAYS.js", "shared/string.js", "shared/flapjax.closure.js", "shared/signals.js", "shared/crypto.js","shared/aurora.flapjax.js"]);
	fs.writeFileSync("aurora.libs.js", libs);
	process.exit();
}


var plugins = [];
updateVersion();

var pluginAllocatorCount = 1;
var pluginAllocation = {};

// Include plugins
fs.readdir("plugins", function(err, files) {
	if (err) {
		throw err;
	}
	plugins = files;
	var widgetCode = [];
	for ( var index in files) {
		var plugin = files[index];
		if (ARRAYS.contains(ignorePlugins, plugin)) {
			continue;
		}
		pluginAllocation[plugin] = pluginAllocatorCount++;
		var pluginDir = fs.readdirSync("plugins/" + plugin + "/");
		for ( var fileIndex in pluginDir) {
			var fullPath = "plugins/" + plugin + "/" + pluginDir[fileIndex];
			if (fullPath.endsWith("build.js")) {
				require(__dirname + "/" + fullPath);
			}
		}
		for ( var fileIndex in pluginDir) {
			var fullPath = "plugins/" + plugin + "/" + pluginDir[fileIndex];
			if (fullPath.endsWith(".server.js")) {
				serverBuildFiles.push(fullPath);
			} else if (fullPath.endsWith(".client.widgets.js")) {
				widgetCode.push(fullPath);
			} else if (fullPath.endsWith(".client.js")) {
				clientBuildFiles.push(fullPath);
			} else if (fullPath.endsWith(".shared.js")) {
				sharedBuildFiles.push(fullPath);
			} else if (fullPath.endsWith(".style.css")) {
				clientCSSFiles.push(fullPath);
			}
		}
	}

	fs.readdir("../themes/" + theme + "/", function(err, themeDir) {
		if (err) {
			throw err;
		}

		// Scan the theme directory for javascript
		for ( var index in themeDir) {
			if (themeDir[index].endsWith(".client.js")) {
				clientBuildFiles.push("../themes/" + theme + "/" + themeDir[index]);
			} else if (themeDir[index].endsWith(".server.js")) {
				serverBuildFiles.push("../themes/" + theme + "/" + themeDir[index]);
			} else if (themeDir[index].endsWith(".shared.js")) {
				clientBuildFiles.push("../themes/" + theme + "/" + themeDir[index]);
				serverBuildFiles.push("../themes/" + theme + "/" + themeDir[index]);
			}
		}
		
		var pluginAllocatorCode = "var AURORA = (function(aurora){aurora.plugins="+JSON.stringify(pluginAllocation)+";return aurora;}(AURORA || {}));\n\n";
		clientBuildFiles = clientBuildFiles.concat(widgetCode);

		console.log("Target: " + target);

		// Build client.js
		var clientFile = "client.js";
		var concatenated = pluginAllocatorCode+concatenate(sharedBuildFiles, clientBuildFiles);
		if (target !== "fast") {
			var lintPassed = lintCheck(concatenated, clientFile, {
			    white : true,
			    sloppy : true,
			    debug : true,
			    browser : true
			});
		}
		minify(concatenated, "../client.min.js");
		writeFile(concatenated, clientFile);
		writeFile(concatenated, "../" + clientFile);

		// Build CSS
		writeFile(concatenate(clientCSSFiles), "../style.css");

		// Build server.js
		var serverFile = "../server.js";
		var concatenated = pluginAllocatorCode+concatenate(sharedBuildFiles, serverBuildFiles);
		if (target !== "fast") {
			var lintPassed = lintCheck(concatenated, serverFile, {
			    white : true,
			    sloppy : true,
			    debug : true,
			    node : true
			});
		}

		concatenated += "\nAURORA.pluginsLoadedE.sendEvent(true);\n";
		writeFile(concatenated, serverFile);

		if (target === "all") {
			generateJSDocs(clientFile, function() {
				generateJSDocs(serverFile, function() {
					generateJSDocs(serverDataFile, function() {
						complete = true;
					});
				});
			});
			wait();
		}
	});

});
