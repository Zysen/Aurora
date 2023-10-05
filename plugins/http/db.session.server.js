goog.provide('aurora.auth.DbSessionTable');

goog.require('aurora.auth.SessionTable');
goog.require('aurora.db.schema.tables.base.session');
goog.require('aurora.log');
goog.require('aurora.startup');
goog.require('config');
goog.require('recoil.util.Sequence');
goog.require('recoil.util.object');


/**
 * @constructor
 * @param {aurora.auth.Auth} auth
 * @param {!aurora.db.Reader} reader
 * @implements {aurora.auth.SessionTable}
 */
aurora.auth.DbSessionTable = function(auth, reader) {
    this.log_ = aurora.log.createModule('DBSESSION');
    this.memory_ = new aurora.auth.MemorySessionTable(auth);
    this.reader_ = reader;
    this.auth_ = auth;
    this.lastExpiry_ = new Date().getTime();
    this.recentUpdates_ = {};
    let sessionT = aurora.db.schema.tables.base.session;
    let query = new recoil.db.Query();
    let me = this;
    let started = false; 
    let doExpire = function () {
        me.lastExpiry_ = new Date().getTime();
        me.reader_.deleteObjects(
            {}, sessionT, query.lt(sessionT.cols.expiry, new Date().getTime() - me.getPersistantTimeout()), null,
            function (err) {
                if (err) {
                    me.log_.error(err);
                }
                setTimeout(doExpire, 300000);
            }
        );
        
    };
    aurora.startup.doOnceStarted(doExpire);
        
    
    console.log("TODO register when session gets removed memory so we can update our stuff");
};


/**
 * prints the session table to console
 */
aurora.auth.DbSessionTable.prototype.print = function() {
    this.memory_.print();
};


/**
 * the clients are in memory websocket that are open, as such they do not need to be
 * stored in the database
 * @param {string} clientId
 * @param {function(string)} cb
 */
aurora.auth.DbSessionTable.prototype.getClientToken = function(clientId, cb) {
    this.memory_.getClientToken(clientId, cb);
};


/**
 * gets a constant token from token that is in the cookie
 *
 * @param {string} token
 * @param {function(?string)}  cb
 */
aurora.auth.DbSessionTable.prototype.getToken = function(token, cb) {
    this.memory_.getToken(token, cb);
};

/**
 * @param {string} clientId
 */
aurora.auth.DbSessionTable.prototype.unregisterClientToken = function(clientId) {
    this.memory_.unregisterClientToken(clientId);
};
/**
 * @param {?} request
 * @param {string} clientId
 * @param {?} connection
 * @return {Promise<boolean>} cb
 */
aurora.auth.DbSessionTable.prototype.registerClientToken = async function(request, clientId, connection) {
    return await this.memory_.registerClientToken(request, clientId, connection);
};

/**
 * wrapper to ensure expiry is updated when session is updated
 * do not update expiry in the callback
 * @private
 * @param {!aurora.auth.SessionTable.Entry} session
 * @param {function()} cb 
 */
aurora.auth.DbSessionTable.prototype.updateSession_ = function(session, cb) {
    let sessionT = aurora.db.schema.tables.base.session;
    let query = new recoil.db.Query();
    let toUpdate = [];
    
    if (session.expiry !== null) {
        session.expiry = new Date().getTime() + session.timeout;
    }

    this.reader_.updateOneLevel({}, sessionT,toUpdate, query.eq(sessionT.cols.id, query.val(session.constToken)), function () {
        this.updateExpire_(cb);
    });

};

/**
 * @param {string|undefined} seriesId
 * @param {function(boolean)=} opt_cb true if any removed
 */

aurora.auth.DbSessionTable.prototype.removeSeriesId = function(seriesId, opt_cb) {
    let me = this;
    // remove from the database to
    this.memory_.removeSeriesId(seriesId, function (res) {
        let sessionT = aurora.db.schema.tables.base.session;
        let query = new recoil.db.Query();
        me.reader_.deleteObjects({}, sessionT, query.eq(sessionT.cols.seriesId, query.val(seriesId)), null, function (error, count) {
            if (opt_cb) {
                opt_cb(count > 0 || res);
            }
        });
    });
};
/**
 * @param {string} token
 * @param {string} seriesId
 * @param {string} constToken
 * @param {?number} timeout
 * @param {Object} data
 * @param {boolean=} opt_locked default false
 * @return {!Promise<!aurora.auth.SessionTable.Entry>}
 */
aurora.auth.DbSessionTable.prototype.createSession = async function(token, seriesId, constToken, timeout, data, opt_locked) {
    let me = this;
    let session = await this.memory_.createSession(token, seriesId, constToken, timeout, data);
    if (!data.remember) {
        return session;
    }
    let sessionT = aurora.db.schema.tables.base.session;
    let query = new recoil.db.Query();
    try {
        await me.reader_.insertAsync({}, sessionT, me.makeDbEntry(session, data.userid));
    }
    catch (err) {
        // if we got an error the session won't be persistant but still good
        if (err) {
            me.log_.error("failed to create persistant session", err);
        }
    }
    return session;
};

/**
 * synchronize session for fall over
 * @param {string} token
 */
aurora.auth.DbSessionTable.prototype.syncSession = function(token) {
    this.memory_.syncSession(token);
};

/**
 * @param {string|undefined} clientId
 * @return {boolean}
 */
aurora.auth.DbSessionTable.prototype.validClient = function(clientId) {
    return this.memory_.validClient(clientId);
};
/**
 * @param {string|undefined} token
 * @param {function()=} opt_cb called when finished
 */
aurora.auth.DbSessionTable.prototype.remove = function(token, opt_cb) {
    let me = this;
    let sessionT = aurora.db.schema.tables.base.session;
    let query = new recoil.db.Query();
    this.memory_.remove(token, async () => {
        
        let session = await me.findSessionById_(token);
        
        if (session) {
            try {
                await me.reader_.deleteObjectsAsync({}, sessionT, query.eq(sessionT.cols.id, session.constToken), null);
            }
            catch (err) {
                me.log_.error("remove session", err);
            }
            if (opt_cb) {
                opt_cb();
            }
        }
        else if (opt_cb) {
            opt_cb();
        }
    });
};

/**
 * removes all the sessions
 */
aurora.auth.DbSessionTable.prototype.removeAll = function() {
    this.memory_.removeAll();
    let me = this;
    let sessionT = aurora.db.schema.tables.base.session;
    let query = new recoil.db.Query();
    me.reader_.deleteObjects({}, sessionT, query.True(), null, function (err) {
        if (err) {
            me.log_.error("remove all session", err);
        }

    });

};

/**
 * for a session set should it expire if it has open clients
 *
 * @param {string|undefined} token
 * @param {boolean} val if true the session will expire even if it has clients
 */

aurora.auth.DbSessionTable.prototype.setExpireWithClients = function(token, val) {
    this.memory_.setExpireWithClients(token, val);
};


/**
 * @param {string|undefined} token
 * @param {boolean} val if true the session will expire even if it has clients
 */

aurora.auth.DbSessionTable.prototype.setAllowLock = function(token, val) {
    this.memory_.setAllowLock(token, val);
    // no point in allowing a lock if we have a persistant session
};


/**
 * @param {string|undefined} token
 * @return {!Promise<boolean>}
 */
aurora.auth.DbSessionTable.prototype.getExpireWithClients = async function(token) {
    return await this.memory_.getExpireWithClients(token);
};


/**
 * @param {string|undefined} token
 * @return {!Promise<boolean>}
 */
aurora.auth.DbSessionTable.prototype.getAllowLock = async function(token) {
    return await this.memory_.getAllowLock(token);
};

/**
 * updates the sessions and it expires later
 * @param {string|undefined} token
 */

aurora.auth.DbSessionTable.prototype.touch = function(token) {
    // no need to touch db items for now, items stored in database last for a long time
    // we will touch when login/logout
    let me = this;
    let sessionT = aurora.db.schema.tables.base.session;
    this.memory_.touch(token, function (session) {
        if (!session.dbTouch || me.lastExpiry_ > session.dbTouch) {
            session.dbTouch = new Date().getTime();
            let query = new recoil.db.Query();
            me.reader_.updateOneLevel(
                {}, sessionT, {expiry: new Date().getTime()},
                query.eq(sessionT.cols.id, query.val(token)), function () {
                });
        }
    });
};

/**
 * @param {string} token
 */
aurora.auth.DbSessionTable.prototype.unlock = function(token) {
    this.memory_.unlock(token);
};

/**
 * locks a particular session
 * @param {string} token
 */
aurora.auth.DbSessionTable.prototype.lock = function(token) {
    this.memory_.unlock(token);
};



/**
 * 0 means session never locks
 * @param {number} val
 */
aurora.auth.DbSessionTable.prototype.setDefaultLockTimeout = function(val) {
    this.memory_.setDefaultLockTimeout(val);
};

/**
 * @param {boolean} val
 */
aurora.auth.DbSessionTable.prototype.setSessionExpiresWithClient = function(val) {
    this.memory_.setSessionExpiresWithClient(val);
};

/**
 * @param {string|undefined} token
 * @return {Promise<undefined|aurora.auth.SessionTable.Entry>}
 */
aurora.auth.DbSessionTable.prototype.findSessionExternal = async function(token) {
    return await this.memory_.findSessionExternal(token);
};

/**
 * @param {Object} object
 * @return {undefined|aurora.auth.SessionTable.Entry}
 */
aurora.auth.DbSessionTable.prototype.makeEntry = function (object) {
    if (!object) {
        return undefined;
    }
    return {
        clients: {},
        token: object.token,
        constToken: object.id,
        seriesId: object.seriesId,
        locked: object.locked,
        lockTimeout: object.lockTimeout,
        lockTime: object.lockTime,
        expiry: object.expiry,
        expireWithClients: object.expireWithClients,
        timeout: object.timeout,
        data: object.data
    };
};

/**
 * gets a list of user tokens
 * @param {number} userid
 * @return {Promise<Array<string>>} list of internal tokens
 */
aurora.auth.DbSessionTable.prototype.getUserTokens =  async function  (userid) {
    let query = new recoil.db.Query();
    const sessionT = aurora.db.schema.tables.base.session;
    
    let sessions = await this.reader_.readObjectsAsync(
        {}, sessionT, query.eq(sessionT.cols.userId,userid), null);

    let resMap = {};
    let addToMap = function (v) {
        resMap[v] = true;
    };

    let memory = await this.memory_.getUserTokens();
    sessions.map(v=> v.id).forEach(addToMap);
    memory.forEach(addToMap);
    return Object.keys(resMap);


};

/**
 * defaults to 1 year
 * @return {number}
 */
aurora.auth.DbSessionTable.prototype.getPersistantTimeout = function () {
    return ((config['authentication'] || {})['persistantTimeoutMins'] || (60 * 24 * 365)) * (1000 * 60);
};
    
/**
 * @private
 * @param {!aurora.auth.SessionTable.Entry} entry
 * @param {number} userid
 * @return {!Object} object
 */
aurora.auth.DbSessionTable.prototype.makeDbEntry = function (entry, userid) {
    

    return {
        token: entry.token,
        id : entry.constToken,
        seriesId: entry.seriesId,
        userId: userid,
        expiry: new Date().getTime(),
        data: entry.data
    };

};


/**
 * @private
 * @param {string|undefined} token this is an internal token passed in by cookie
 * @return {Promise<undefined|aurora.auth.SessionTable.Entry>}
 */
aurora.auth.DbSessionTable.prototype.findSessionById_ = async function(token) {
    if (token == undefined) {
        return undefined;
    }
    let me = this;
    let sessionT = aurora.db.schema.tables.base.session;
    let query = new recoil.db.Query();

    try {
        let object = await me.reader_.readObjectByKeyAsync({}, sessionT, [{col: sessionT.cols.id, value: token}], null);
        if (object == undefined) {
            return undefined;
        }
        return me.makeEntry(object);
        
    }
    catch (e) {
        return undefined;
    }

};

/**
 * @param {string} token this is an internal token passed in by cookie
 * @param {string} seriesId
 * @param {string} ip
 * @return {!Promise<undefined|aurora.auth.SessionTable.Entry>}
 */
aurora.auth.DbSessionTable.prototype.loginFindSession = async function(token, seriesId, ip) {
    if (token == undefined) {
        return undefined;
    }
    let me = this;
    let sessionT = aurora.db.schema.tables.base.session;
    let query = new recoil.db.Query();

    let session = await this.memory_.findSession(token, seriesId);
    
    if (session) {
        // in memory we are all good
        return session;
    }
    try {
        let object = undefined;
        try {
        object = await me.reader_.readObjectByKeyAsync({}, sessionT, [{col: sessionT.cols.token, value: token}], null);

        }
        catch(e) {
            // we may not find the object so that is ok
        }
        
        if (object == undefined) {
            return undefined;
        }
        let old = ip + '-' + token + '-' + seriesId;
        if (me.recentUpdates_[old]) {
            let newSeriesId = me.recentUpdates_[old];
            return await me.memory_.loginFindSession(
                token, newSeriesId, ip);
        }
        if (object.seriesId !== seriesId) {
            // remove the series id this is invalid also remove all tokens that match this is a security violatin
            me.reader_.deleteObjectsAsync({}, sessionT, query.eq(sessionT.cols.token, query.val(token)), null).catch(() => {});
            return undefined;
        }
        
            
        object.seriesId = me.auth_.generateSeriesId();
        // allow the old token for 30 seconds
        me.recentUpdates_[old] = object.seriesId;
        setTimeout(function () {
            delete me.recentUpdates_[old];
        }, 30000);
        await me.reader_.updateOneLevelAsync(
            {}, sessionT, {seriesId: object.seriesId, expiry: new Date().getTime()},
            query.eq(sessionT.cols.id, query.val(object.id)));
        
        let entry = /** @type {!aurora.auth.SessionTable.Entry} */ (me.makeEntry(object));
        
        await me.memory_.loadEntry(entry);
        return entry;         
        // change the series id and add the new the memory table
    } catch (e) {
        this.log_.error("error finding session", e);
        return undefined;
    }
};

/**
 * @param {string|undefined} token this is an internal token passed in by cookie
 * @param {string=} opt_seriesId
 * @return {Promise<undefined|aurora.auth.SessionTable.Entry>}

 */
aurora.auth.DbSessionTable.prototype.findSession = async function(token, opt_seriesId) {
    return await this.memory_.findSession(token, opt_seriesId);
};

/**
 * the function will be called with token and true if locked
 * @param {function(string,boolean)} callback
 */
aurora.auth.DbSessionTable.prototype.addLockHandler = function(callback) {
    this.memory_.addLockHandler(callback);
};


/**
 * the string will be 16 chars long
 * @return {!Promise<string>}
 */
aurora.auth.DbSessionTable.prototype.createUniqueId = function () {
    return new Promise((resolve, reject) => {
        
        this.reader_.sequence('session_sequence', function (err, seq) {
            if (err) {
                reject(err);
            }
            else {
                resolve( seq + '' || '1');
            }
        });
    });
};

/**
 * @param {?} token an internal token
 * @param {function()=} opt_cb called when finished
 */
aurora.auth.DbSessionTable.prototype.removeInternal = function(token, opt_cb) {
    if (token == undefined) {
        if (opt_cb) {
            opt_cb();
        }
        return;
    }

    let sessionT = aurora.db.schema.tables.base.session;
    let query = new recoil.db.Query();
    
    this.memory_.removeInternal(token, () => {
        this.reader_.deleteObjects({}, sessionT, query.eq(sessionT.cols.id, token), null, (err) => {
            if (err) {
                this.log_.error("remove session", err);
            }
            if (opt_cb) {
                opt_cb();
            }
        });
    });
};


/**
 * @param {aurora.auth.Auth} auth
 * @return {!aurora.auth.SessionTable}
 */
aurora.auth.DbSessionTable.factory = function (auth) {
    let pool = aurora.db.Pool.getDefault();
    let reader = new aurora.db.sql.Reader(pool);
    return new aurora.auth.DbSessionTable(auth, reader);
};

/**
 * @return {boolean}
 */
aurora.auth.DbSessionTable.prototype.isMaster =  function() {
    return this.memory_.isMaster();

};
