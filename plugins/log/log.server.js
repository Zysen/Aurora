goog.provide('aurora.log');

goog.require('config');
/**
 * @constructor
 * @param {string} module
 */
aurora.log.Log = function(module) {
    this.module_ = module;
    aurora.log.usedModules[module] = this;
};

/**
 * @private
 * @param {?} dst
 * @param {string} level
 * @param {Array|Arguments} args
 * @param {string=} opt_colour
 */
aurora.log.Log.prototype.processLogEntry_ = function(dst, level, args, opt_colour) {
    var moment = require('moment');
    var log = aurora.log;
    var syslog = log.syslog;
    var minLevel = log.level;
    var hasOverride = false;
    var levelNum = log.enum[level];
    if (log.logLevels_ && log.logLevels_[this.module_]) {
        var override = log.logLevels_[this.module_];
        if (typeof(override) === 'string') {
            if (log.enum.hasOwnProperty(override)) {
                minLevel = log.enum[override];
                hasOverride = levelNum <= minLevel;
            }


        }
        else {
            minLevel = override;
            hasOverride = levelNum <= minLevel;
        }
    }
    var functionTest = dst || console.log;
    var colour = opt_colour || '\x1b[37m';

    args = Array.prototype.slice.call(args);
    if (levelNum <= minLevel) {
    if (log.syslog !== undefined) {
        var syslogEntry = this.module_.padRight(9, ' ');
        for (var index = 0; index < args.length; index++) {
        if (typeof(args[index]) === 'object') {
            try {
            args[index] = JSON.stringify(args[index]);
            }
            catch (e) {
            console.log('LOGGING CLASS', e);
            }
        }
        syslogEntry += ' ' + args[index];
        }
        //syslogEntry+="\t"+moment().format('YYYY MMM DD hh:mm:ss.sss');
        if (levelNum <= log.level || hasOverride) {
            syslog.log(levelNum, syslogEntry);        //level.padRight(9, " ")+" "+
        }
        //2016 Aug 20 13:19:04.552 auth.info MyDevice sshd[1606]:  Received disconnect from 10.16.1.145: 11: disconnected by user
    }

    ///    colour
    args.unshift(this.module_);

    var levelString = '\x1b[0m' + colour + '%s \x1b[0m' + colour;

    //Reset formatting codes
    args.unshift(level.padRight(9, ' '));
    var colourString = '';
    colourString = '' + levelString;
    for (var index = 0; index < args.length; index++) {
        colourString += '%s ';
    }
    colourString += '\x1b[0m';
        args.unshift(new Date().toLocaleString());
        args.unshift(colourString);        //"\x1b[0m %s \x1b[0m"+
        functionTest.apply(console, args);

    }
};

/**
 * @param {...?} var_args
 */
aurora.log.Log.prototype.debug = function(var_args) {
    this.processLogEntry_(console.log, 'DEBUG', arguments);
};


/**
 * @param {...?} var_args
 */
aurora.log.Log.prototype.info = function(var_args) {
    this.processLogEntry_(console.log, 'INFO', arguments, '\x1b[32m');
};


/**
 * @param {...?} var_args
 */
aurora.log.Log.prototype.notice = function(var_args) {
    this.processLogEntry_(console.log, 'NOTICE', arguments, '\x1b[36m');
};


/**
 * @param {...?} var_args
 */
aurora.log.Log.prototype.warn = function(var_args) {
    this.processLogEntry_(console.log, 'WARN', arguments, '\x1b[33m');
};


/**
 * @param {...?} var_args
 */
aurora.log.Log.prototype.warning = function(var_args) {
    this.processLogEntry_(console.log, 'WARN', arguments, '\x1b[33m');
};


/**
 * @param {...?} var_args
 */
aurora.log.Log.prototype.err = function(var_args) {
    this.processLogEntry_(console.log, 'ERROR', arguments, '\x1b[31m');
};
/**
 * @param {...?} var_args
 */
aurora.log.Log.prototype.error = function(var_args) {
    this.processLogEntry_(console.log, 'ERROR', arguments, '\x1b[31m');
};

/**
 * @param {...?} var_args
 */
aurora.log.Log.prototype.critical = function(var_args) {
    this.processLogEntry_(console.log, 'CRITICAL', arguments, '\x1b[31m');
};
/**
 * @param {...?} var_args
 */
aurora.log.Log.prototype.alert = function(var_args) {
    this.processLogEntry_(console.log, 'ALERT', arguments, '\x1b[1m\x1b[31m');
};
/**
 * @param {...?} var_args
 */
aurora.log.Log.prototype.emergency = function(var_args) {
    this.processLogEntry_(console.log, 'EMERGENCY', arguments, '\x1b[1m\x1b[31m');
};

/**
 * @type {Object<string,!aurora.log.Log>}
 */
aurora.log.usedModules = {};

/**
 * per module log level override
 * @private
 * @type {Object<string,number>}
 */
aurora.log.logLevels_ = {};

/**
 * for every module get the log level that is currently set
 * level can be null for default
 * @return {!Array<{name:string,level:?number}>}
 */
aurora.log.getLevels = function() {
    var res = [];
    for (var name in aurora.log.usedModules) {
        var level = aurora.log.logLevels_[name];
        res.push({'name': name, 'level': level === undefined ? null : level});
    }
    res.sort(function(x, y) {return x.name.localeCompare(y.name);});
    return res;
};

/**
 * @param {string} moduleName
 * @return {!aurora.log.Log}
 */
aurora.log.createModule = function(moduleName) {
    return aurora.log.usedModules[moduleName] || new aurora.log.Log(moduleName);
};

/**
 * WARNING!!! These logging levels match SYSLOG. It is preferable not to change them.
 * @enum
 */
aurora.log.enum = {'DEBUG': 7, 'INFO': 6, 'NOTICE': 5, 'WARN': 4, 'ERROR': 3, 'CRITICAL': 2, 'ALERT': 1, 'EMERGENCY': 0};

/**
 * @type {number}
 */
aurora.log.level = aurora.log.enum['INFO'];

/**
 * @final
 */
aurora.log.syslog = (function() {
    var syslog = require('modern-syslog');
    syslog.open(config.logName || 'gui', syslog['LOG_PID']);
    return syslog;
})();

/**
 * forces update of logs from file
 */
aurora.log.refresh = function() {
    var fs = require('fs');
    var path = aurora.log.getLogPath();
    if (path) {
        try {
            var newLevels = {};
            var str = fs.readFileSync(path).toString();
            var parsed = JSON.parse(str);
            for (var k in parsed) {
                var val = parsed[k];
                newLevels[k] = typeof(val) === 'string' ? aurora.log.enum[val] : val;
            }
            aurora.log.logLevels_ = newLevels;
        }
        catch (e) {
            aurora.log.logLevels_ = {};
        }
    }
    else {
        aurora.log.logLevels_ = {};
    }

};
/**
 * @return {?string}
 */
aurora.log.getLogPath = function() {
    if (config && config['config']) {
        return config['config']['logOverride'] === true ? 'log.config' : config['config']['logOverride'];
    }
    return null;
};

(function() {
    var fs = require('fs');
    var path = require('path');
    var curWatch = null;
    var listener = aurora.log.refresh;

    var updateLogLevels = function() {
        try {
            var path = aurora.log.getLogPath();
            if (curWatch !== path) {
                if (curWatch) {
                    fs.unwatchFile(curWatch, listener);
                }
                curWatch = path;

                if (path) {

                    fs.watchFile(curWatch, listener);
                }
            }
            listener();

        }
        catch (e) {
            console.error(e);
        }
    };

    config.configE.on('config/logOverride', function(e, p) {
        updateLogLevels();
    });

    updateLogLevels();
})();
