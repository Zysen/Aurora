goog.provide('aurora.startup');


/**
 * tasks can be registerd on the inital startup call, and callbacks
 * can be added once all tasks are started
 *
 * @constructor
 * @private
 */
aurora.startup.Context_ = function() {
    this.neededTask_ = {};
    this.readyCallbacks_ = [];
    this.canStart_ = false;
    this.started_ = false;
    let me = this;
    // do this once all the base tasks have a chance to register
    setTimeout(function () {
        me.canStart_ = true;
        me.startIfNeeded_();
    }, 1);
};

/**
 * @private
 */
aurora.startup.Context_.prototype.startIfNeeded_ = function() {
    if (!this.canStart_) {
        return;
    }
    let hasTasks = false;
    for (var k in this.neededTask_) {
        hasTasks = true;
    }
    if (!hasTasks) {
        this.readyCallbacks_.forEach(function(cb) {cb();});
        this.readyCallbacks_ = [];
        this.started_ = true;
    }
    
};
/**
 * @final
 */
aurora.startup.instance = new aurora.startup.Context_();

/**
 * @param {string} name
 */
aurora.startup.taskStarted = function (name) {
    aurora.startup.instance.neededTask_[name] = true;

};

/**
 * @param {string} name
 */
aurora.startup.taskEnded = function (name) {
    delete aurora.startup.instance.neededTask_[name];
    aurora.startup.instance.startIfNeeded_();
};

/**
 * add a callback to be called once all the tasks are don
 * @param {function()} cb
 */
aurora.startup.doOnceStarted = function (cb) {
    aurora.startup.instance.readyCallbacks_.push(cb);
    aurora.startup.instance.startIfNeeded_();
    
};

/**
 * add a callback to be called once all the tasks are don
 * @param {function()} cb
 */
aurora.startup.doWhenStarted = function (cb) {
    if (aurora.startup.instance.started_) {
        cb();
    }
    else {
        aurora.startup.instance.readyCallbacks_.push(cb);
    }
};
