goog.provide('aurora.auth.MemorySessionTable');

goog.require('aurora.auth.SessionTable');
goog.require('aurora.log');
goog.require('aurora.sync.Channel');
goog.require('recoil.util.Sequence');
goog.require('recoil.util.object');

/**
 * @constructor
 * @param {aurora.auth.Auth} auth
 * @implements {aurora.auth.SessionTable}
 */
aurora.auth.MemorySessionTable = function(auth) {
    this.log_ = aurora.log.createModule('SESSION');
    this.nextToken_ = new recoil.util.Sequence();
    this.auth_ = auth;
    this.expireSessionsWithClients_ = false;
    this.defaultLockTimeout_ = 0;
    /**
     * @type {Array<function(string,boolean)>}
     */
    this.lockHandlers_ = [];
    var me = this;
    var compareSession = function(x, y) {
        return recoil.util.object.compare([x.token, x.seriesId], [y.token, y.seriesId]);
    };

    var hasClient = function(s) {
        for (var k in s.clients) {
            return true;
        }
        return false;
    };
    /**
     * @private
     * @param {!aurora.auth.SessionTable.Entry} s1
     * @param {!aurora.auth.SessionTable.Entry} s2
     * @return {number}
     */
    this.compareLockExpiry_ = function(s1, s2) {
        if (s1.locked == s2.locked) {
            return compareSession(s1, s2);
        }
        // locked items come last since they don't expire
        if (s1.locked || s2.locked) {
            return s1.locked ? 1 : -1;
        }

        // deal with never lock
        if (!s1.lockTime && !s2.lockTime) {
            return compareSession(s1, s2);
        }

        if (!s1.lockTime || !s2.lockTime) {
            return !s1.lockTime ? -1 : 1;
        }

        return s1.lockTime - s2.lockTime;
    };

    this.compareExpiry_ = function(x, y) {
        if (x.expiry === null && y.expiry === null) {
            return compareSession(x, y);
        }
        if (x.expiry === null) {
            return 1;
        }
        if (y.expiry === null) {
            return -1;
        }

        var xClients = x.expireWithClients ? false : hasClient(x);
        var yClients = y.expireWithClients ? false : hasClient(y);

        if (xClients != yClients) {
            if (xClients) {
                return 1;
            }
            return -1;
        }

        var res = x.expiry - y.expiry;

        if (res === 0) {
            return compareSession(x, y);
        }
        return res;
    };
    /**
     * @private
     * @type {goog.structs.AvlTree<!aurora.auth.SessionTable.Entry>}
     */
    this.expiry_ = new goog.structs.AvlTree(this.compareExpiry_);
    /**
     * @private
     * @type {goog.structs.AvlTree<!aurora.auth.SessionTable.Entry>}
     */
    this.lockExpiry_ = new goog.structs.AvlTree(this.compareLockExpiry_);
    this.table_ = {};
    this.clients_ = {};
    /**
     * @private
     * @type {!Object<string,string>}
     */
    this.internalTokens_ = {};
    this.isMaster_ = true;
    this.remoteSessions_ = {};

    this.sync_ = aurora.sync.instance.createChannel('sync', 'http', 0, this, function(mode) {
        let wasMaster = me.isMaster_;
        me.isMaster_ = mode !== aurora.sync.Mode.SLAVE;
        if (!wasMaster && me.isMaster_) {
            // change to master
            // this is not right things will may not fire correctly if we jsut
            me.removeAll();
            me.nextToken_.reset();

            for (let token in me.remoteSessions_) {
                let s = me.remoteSessions_[token];
                me.createSession(s['token'], s['seriesId'], s['constToken'], s['timeout'], s['data'], s['locked']);
                me.nextToken_.seen(s['constToken']);
                
            }
            me.remoteSessions_ = {};

        }


    }, function(cid) {
        let toSend = {};
        for (let token in me.table_) {
            toSend[token] = me.serializeSession_(me.table_[token]);
        }
        me.sync_.write({'action': 'register', 'sessions': toSend}, cid);
    }, function(m) {
        if (m) {
            let action = m['action'];
            if (action === 'register') {
                me.removeAll();
                me.remoteSessions_ = m['sessions'] || {};
            }
            else if (action === 'update') {
                let s = m['session'];
                let token = m['token'];
                if (s) {
                    me.remoteSessions_[token] = m['session'];
                }
                else {
                    delete me.remoteSessions_[token];
                }
            }
        }
    });

};


/**
 * prints the session table to console
 */
aurora.auth.MemorySessionTable.prototype.print = function() {
    console.log('Session table');
    for (var k in this.table_) {
        console.log(k + ' -> ', this.table_[k]);
    }
};


/**
 * @param {string} clientId
 * @param {function(string)}  cb
 */
aurora.auth.MemorySessionTable.prototype.getClientToken = function(clientId, cb) {
    cb((this.clients_[clientId] || {}).constToken);
};


/**
 * gets a constant token from token that is in the cookie
 *
 * @param {string} token
 * @param {function(?string)}  cb
 */
aurora.auth.MemorySessionTable.prototype.getToken = function(token, cb) {
    this.findSession(token, function (session) {
        if (session) {
            cb(session.constToken);
        }
        else {
            cb(null);
        }
    });
};

/**
 * @param {string} clientId
 */
aurora.auth.MemorySessionTable.prototype.unregisterClientToken = function(clientId) {
    var info = this.clients_[clientId];
    if (info) {
        delete this.clients_[clientId];
        this.findSession(info.token, function (session) {
            if (session) {
                this.updateSession_(session, function() {
                    delete session.clients[clientId];
                });
            }
            
        }.bind(this));
    }
};
/**
 * @param {?} request
 * @param {string} clientId
 * @param {?} connection
 * @param {function (boolean)} cb
 */
aurora.auth.MemorySessionTable.prototype.registerClientToken = function(request, clientId, connection, cb) {

    var cookies = {};

    (request['cookies'] || []).forEach(function(v) {
        cookies[v['name']] = v['value'];
    });
    var sesh = cookies['sesh'];
    if (sesh) {
        sesh = decodeURIComponent(sesh).split('-');
        if (sesh.length === 2) {
            var token = sesh[0];
            var seriesId = sesh[1];
            this.findSession(token, seriesId, function (session) {
                if (session) {
                    this.clients_[clientId] = {token: token, constToken: session.constToken};
                    this.updateSession_(session, function() {
                        session.clients[clientId] = {};
                    });
                    cb(true);
                    return;
                }
                else if (this.removeSeriesId(seriesId)) {
                    this.log_.warn('Token Theft Assumed!!!, Deleting all tokens that relate to this seriesId');
                }
                else {
                    console.log('can\'t find token', token, seriesId);
                    //                    connection.sendUTF(JSON.stringify({command: AURORA.COMMANDS.AUTH.TOKEN_INVALID}));   //Legitimate Old Token Attempt
                }
                cb(false);
            }.bind(this));
            return;
        }
    }
    cb(false);
};

/**
 * wrapper to ensure expiry is updated when session is updated
 * do not update expiry in the callback
 * @private
 * @param {!aurora.auth.SessionTable.Entry} session
 * @param {function()} cb
 */
aurora.auth.MemorySessionTable.prototype.updateSession_ = function(session, cb) {
    if (session.expiry !== null) {
        this.expiry_.remove(session);
    }

    this.lockExpiry_.remove(session);

    cb();

    if (!session.locked) {
        if (session.lockTimeout) {
            session.lockTime = process.hrtime()[0] * 1000 + session.lockTimeout;
        }
        else {
            session.lockTime = 0;
        }
    }
    this.lockExpiry_.add(session);

    if (session.expiry !== null) {
        session.expiry = process.hrtime()[0] * 1000 + session.timeout;
        this.expiry_.add(session);
    }
    this.updateExpire_();
    this.syncSession(session.token);
};

/**
 * @param {string|undefined} seriesId
 * @param {function(boolean)=} opt_cb true if any removed
 */

aurora.auth.MemorySessionTable.prototype.removeSeriesId = function(seriesId, opt_cb) {
    var toRemove = [];
    for (var k in this.table_) {
        if (this.table_[k].seriesId === seriesId) {
            toRemove.push(k);
        }
    }
    var me = this;
    toRemove.forEach(function(t) {
        me.remove_(t);
    });
    this.updateExpire_();
    if (opt_cb) {
        opt_cb(toRemove.length > 0);
    }
};
/**
 * @param {string} token
 * @param {string} seriesId
 * @param {string} constToken
 * @param {?number} timeout
 * @param {Object} data
 * @param {function(?,?aurora.auth.SessionTable.Entry)} callback
 * @param {boolean=} opt_locked default false
 */
aurora.auth.MemorySessionTable.prototype.createSession = function(token, seriesId, constToken, timeout, data, callback, opt_locked) {
    var exp = timeout === null ? null : (process.hrtime()[0] * 1000 + timeout);
    let lockTime = this.defaultLockTimeout_ ? process.hrtime()[0] * 1000 + this.defaultLockTimeout_ : 0;
    var session = {
        locked: !!opt_locked, lockTimeout: this.defaultLockTimeout_, lockTime: lockTime,
        expiry: exp, token: token, constToken: constToken, seriesId: seriesId,
        data: data, timeout: timeout, expireWithClients: this.expireSessionsWithClients_, clients: {}
    };
    this.expiry_.add(session);
    this.lockExpiry_.add(session);
    this.table_[token] = session;
    this.internalTokens_[constToken] = token;
    this.updateExpire_();
    this.syncSession(token);
    callback(null, session);
};


/**
 * loads the seesion into memory from a different internal source
 * @param {!aurora.auth.SessionTable.Entry} entry
 * @param {function(?)} callback
 */
aurora.auth.MemorySessionTable.prototype.loadEntry = function(entry, callback) {
    
    var exp = entry.timeout === null ? null : (process.hrtime()[0] * 1000 + entry.timeout);
    let lockTime = this.defaultLockTimeout_ ? process.hrtime()[0] * 1000 + this.defaultLockTimeout_ : 0;
    let constToken = entry.constToken;
    let token = entry.token;
    let seriesId = entry.seriesId;
    var session = {
        locked: false, lockTimeout: this.defaultLockTimeout_, lockTime: lockTime,
        expiry: exp, token: token, constToken: constToken, seriesId: seriesId,
        data: entry.data, timeout: entry.timeout, expireWithClients: this.expireSessionsWithClients_, clients: {}
    };
    this.expiry_.add(session);
    this.lockExpiry_.add(session);
    this.table_[token] = session;
    this.internalTokens_[constToken] = token;
    this.updateExpire_();
    this.syncSession(token);
    callback(null);
};

/**
 * @private
 * @param {aurora.auth.SessionTable.Entry} session
 * @return {Object}
 */
aurora.auth.MemorySessionTable.prototype.serializeSession_ = function(session) {
    return {
        'token': session.token,
        'seriesId': session.seriesId,
        'constToken': session.constToken,
        'timeout': session.timeout,
        'data': session.data,
        'locked': session.locked,
    };
};

/**
 * synchronize session for fall over
 * @param {string} token
 */
aurora.auth.MemorySessionTable.prototype.syncSession = function(token) {
    let session = this.table_[token];
    let ssession = null;
    if (session) {
        ssession = this.serializeSession_(session);
    }
    this.sync_.write({'action': 'update', 'token': token, 'session': ssession});
};

/**
 * @param {string|undefined} clientId
 * @return {boolean}
 */
aurora.auth.MemorySessionTable.prototype.validClient = function(clientId) {
    return this.clients_[clientId] !== undefined;
};

/**
 * @param {string|undefined} token
 * @param {function()=} opt_cb called when finished
 */
aurora.auth.MemorySessionTable.prototype.remove = function(token, opt_cb) {
    this.remove_(this.internalTokens_[token||'']);
    if (opt_cb) {
        opt_cb();
    }
};

/**
 * @param {string|undefined} token an internal token
 * @param {function()=} opt_cb called when finished
 */
aurora.auth.MemorySessionTable.prototype.removeInternal = function(token, opt_cb) {
    this.remove_(token);
    if (opt_cb) {
        opt_cb();
    }
};

/**
 * the string will be 16 chars long
 * @param {function (string)} cb
 */
aurora.auth.MemorySessionTable.prototype.createUniqueId = function (cb) {

    let l = this.nextToken_.nextLong();
    console.log("generate unique id", l.getHighBits(), l.getLowBits());
    let toHex = function (n) {
        let unpadded = '00000000' + (n & 0x0ffffffff).toString(16);
        return unpadded.substring(unpadded.length - 8);
    };
    cb(toHex(l.getHighBits()) + toHex(l.getLowBits()));
};
/**
 * @private
 * @param {string|undefined} token an internal token
 */
aurora.auth.MemorySessionTable.prototype.remove_ = function(token) {
    if (!token) {
        return;
    }
    var session = this.table_[token];
    if (session) {
        var me = this;
        this.auth_.logout(token);
        delete this.table_[token];
        delete this.internalTokens_[session.constToken];
        this.expiry_.remove(session);
        this.lockExpiry_.remove(session);
        this.lockHandlers_.forEach(function(h) {
            h(session.constToken, false);
        });
        for (var cid in session.clients) {
            delete me.clients_[cid];
        }
        this.updateExpire_();
        this.syncSession(token);
    }
};

/**
 * removes all the sessions
 */
aurora.auth.MemorySessionTable.prototype.removeAll = function() {
    let me = this;
    for (let token in this.table_) {
        var session = this.table_[token];
        if (session) {
            this.auth_.logout(token);
            delete this.table_[token];
            delete this.internalTokens_[session.constToken];
            this.expiry_.remove(session);
            this.lockExpiry_.remove(session);
            this.lockHandlers_.forEach(function(h) {
                h(session.constToken, false);
            });
        }
    }
    me.expiry_.clear();
    me.lockExpiry_.clear();
    me.clients_ = {};
    this.updateExpire_();

};

/**
 * @private
 * @param {string|undefined} token
 * @param {string|undefined} seriesId
 * @param {string} clientId
 * @param {function(({connection:?}|undefined))} cb
 */
aurora.auth.MemorySessionTable.prototype.findSession_ = function(token, seriesId, clientId, cb) {
    this.findSession(token, seriesId, function (session) {
        cb(session ? session.clients[clientId] : undefined);
    });

};


/**
 * for a session set should it expire if it has open clients
 *
 * @param {string|undefined} token
 * @param {boolean} val if true the session will expire even if it has clients
 */

aurora.auth.MemorySessionTable.prototype.setExpireWithClients = function(token, val) {
    this.findSessionExternal(token, function (session) {
        if (session && session.expireWithClients != val) {
            this.updateSession_(session, function() {session.expireWithClients = val;});
        }
    }.bind(this));
};


/**
 * @param {string|undefined} token
 * @param {boolean} val if true the session will expire even if it has clients
 */

aurora.auth.MemorySessionTable.prototype.setAllowLock = function(token, val) {
    let me = this;
    this.findSessionExternal(token, function (session) {
        if (session) {
            this.updateSession_(session, function() {
                if (!session.locked) {
                    session.lockTimeout = val ? me.defaultLockTimeout_ : 0;
                }
            });
        }
    });
};


/**
 * @param {string|undefined} token
 * @param {function(boolean)} cb
 */
aurora.auth.MemorySessionTable.prototype.getExpireWithClients = function(token, cb) {
    this.findSessionExternal(token, function (session) {
        cb(!!(session && session.expireWithClients));
    });
};


/**
 * @param {string|undefined} token
 * @param {function(boolean)} cb
 */
aurora.auth.MemorySessionTable.prototype.getAllowLock = function(token, cb) {
    let session = this.findSessionExternal(token, function (session) {
        cb(!!(session && !!session.lockTimeout));
    });
};

/**
 * updates the sessions and it expires later
 * @param {string|undefined} token
 * @param {function(?)=} opt_cb
 */

aurora.auth.MemorySessionTable.prototype.touch = function(token, opt_cb) {
    this.findSessionExternal(token, function (session) {
        if (session && session.expiry !== null) {
            this.updateSession_(session, function() {
                if (opt_cb) {
                    opt_cb(session);
                }

            });
        }
        
    }.bind(this));
};

/**
 * expires all sessions past there expiry time
 */
aurora.auth.MemorySessionTable.prototype.expire = function() {
    var now = process.hrtime()[0] * 1000;
    var me = this;
    var toRemove = [];
    this.expiry_.inOrderTraverse(function(s) {
        if (s.expiry <= now) {
            if (!s.expireWithClients) {
                for (var k in s.clients) {
                    return true;
                }
            }
            toRemove.push(s.token);
            return false;
        }
        return true;
    });
    toRemove.forEach(function(t) {
        me.remove_(t);
    });

    this.updateExpire_();
};

/**
 * @param {string} token
 */
aurora.auth.MemorySessionTable.prototype.unlock = function(token) {
    
    this.findSessionExternal(token, function (session) {
        if (session) {
            this.updateSession_(session, function() {
                session.locked = false;
            });
            this.lockHandlers_.forEach(function(h) {
                h(session.constToken, false);
            });
        }
    }.bind(this));
};

/**
 * locks a particular session
 * @param {string} token
 */
aurora.auth.MemorySessionTable.prototype.lock = function(token) {
    this.findSessionExternal(token, function (session) {
        if (session) {
            this.updateSession_(session, function() {
                session.locked = true;
            });
            this.lockHandlers_.forEach(function(h) {
                h(session.constToken, true);
            });
        }
    }.bind(this));
};


/**
 * @private
 * locks all sessions past there lock time
 */
aurora.auth.MemorySessionTable.prototype.lock_ = function() {
    var now = process.hrtime()[0] * 1000;
    var me = this;
    var toLock = [];
    this.lockExpiry_.inOrderTraverse(function(s) {
        if (!s.locked && s.lockTime && s.lockTime <= now) {
            toLock.push(s);
            return false;
        }
        return true;
    });
    toLock.forEach(function(s) {
        me.lockExpiry_.remove(s);
        s.locked = true;
        me.lockExpiry_.add(s);
    });
    toLock.forEach(function(s) {

        me.lockHandlers_.forEach(function(h) {
            h(s.constToken, true);
        });
    });

    this.updateExpire_();
};


/**
 * 0 means session never locks
 * @param {number} val
 */
aurora.auth.MemorySessionTable.prototype.setDefaultLockTimeout = function(val) {
    this.defaultLockTimeout_ = val;
};

/**
 * @param {boolean} val
 */
aurora.auth.MemorySessionTable.prototype.setSessionExpiresWithClient = function(val) {
    if (this.expireSessionsWithClients_ !== val) {
        var old = this.expiry_;
        var me = this;
        this.expireSessionsWithClients_ = val;
        this.expiry_ = new goog.structs.AvlTree(this.compareExpiry_);
        old.inOrderTraverse(function(v) {
            me.expiry_.add(v);
        });
        this.updateExpire_();
    }
};

/**
 * @private
 * set the callback to check the next expiry time
 */
aurora.auth.MemorySessionTable.prototype.updateLockExpire_ = function() {
    var now = process.hrtime()[0] * 1000;
    var toRemove = [];
    var me = this;
    if (me.nextLockExpire_) {
        clearTimeout(me.nextLockExpire_);
        this.nextLockExpire_ = null;
    }

    var curTime = process.hrtime()[0] * 1000;
    this.lockExpiry_.inOrderTraverse(function(s) {
        if (s.locked || !s.lockTime) {
            // this is locked, or doesn't timeout so everything after is irrelevant
            return true;
        }

        me.nextLockExpire_ = setTimeout(function() {
            me.nextLockExpire_ = null;
            me.lock_();
        }, Math.max(1, 1 + s.lockTime - curTime));
        return true;
    });

};

/**
 * @private
 * set the callback to check the next expiry time
 */
aurora.auth.MemorySessionTable.prototype.updateExpire_ = function() {
    this.updateLockExpire_();
    var now = process.hrtime()[0] * 1000;
    var toRemove = [];
    var me = this;
    if (me.nextExpire_) {
        clearTimeout(me.nextExpire_);
        this.nextExpire_ = null;
    }

    var curTime = process.hrtime()[0] * 1000;
    this.expiry_.inOrderTraverse(function(s) {

        if (s.expiry !== null) {
            if (!s.expireWithClients) {
                for (var k in s.clients) {
                    return true;
                }
            }
            me.nextExpire_ = setTimeout(function() {
                me.nextExpire_ = null;
                me.expire();
            }, Math.max(1, 1 + s.expiry - curTime));
        }
        return true;
    });

};


/**
 * @param {string|undefined} token
 * @param {function((undefined|aurora.auth.SessionTable.Entry))} cb not optional always last parameter
 */
aurora.auth.MemorySessionTable.prototype.findSessionExternal = function(token, cb) {
    this.findSession(this.internalTokens_[token||''], cb);
};

/**
 * @param {string|undefined} token an internal token
 * @param {string|undefined|function((undefined|aurora.auth.SessionTable.Entry))} seriesIdOrCb
 * @param {(function((undefined|aurora.auth.SessionTable.Entry)))=} opt_cb not optional always last parameter
 */
aurora.auth.MemorySessionTable.prototype.findSession = function(token, seriesIdOrCb, opt_cb) {
    let cb = /** @type {function((undefined|aurora.auth.SessionTable.Entry))} */ (opt_cb === undefined ? seriesIdOrCb: opt_cb);
    let opt_seriesId = opt_cb === undefined ? undefined : seriesIdOrCb;
    var v = this.table_[token];

    if (v === undefined || (opt_seriesId !== undefined && v.seriesId !== opt_seriesId)) {
        cb(undefined);
        return;
    }
    cb(v);
};

/**
 * @param {string} token this is an internal token passed in by cookie
 * @param {string} seriesId
 * @param {string} ip
 * @param {(function((undefined|aurora.auth.SessionTable.Entry)))=} cb
 */
aurora.auth.MemorySessionTable.prototype.loginFindSession = function(token, seriesId, ip, cb) {
    this.findSession(token, seriesId, cb);
};

/**
 * the function will be called with token and true if locked
 * @param {function(string,boolean)} callback
 */
aurora.auth.MemorySessionTable.prototype.addLockHandler = function(callback) {
    this.lockHandlers_.push(callback);
};


/**
 * @return {boolean}
 */
aurora.auth.MemorySessionTable.prototype.isMaster =  function() {
    return this.isMaster_;
};
