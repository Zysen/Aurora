goog.provide('aurora.auth.Auth');
goog.provide('aurora.auth.instance');

goog.require('config');
goog.require('recoil.util.object');
goog.require('recoil.util.Sequence');
goog.require('aurora.http');

/**
 * @constructor
 * @param {aurora.auth.Auth} auth
 */
aurora.auth.SessionTable = function (auth) {
    this.auth_ = auth;
    var compareSession = function (x, y) {
        return recoil.util.object.compare([x.token, x.seriesId], [y.token, y.seriesId]);
    };
    var compareExpiry = function (x, y) {
        if (x.expiry === null && y.expiry === null) {
            return compareSession(x, y);
        }
        if (x.expiry === null) {
            return 1;
        }
        if (y.expiry === null) {
            return -1;
        }
        var res = x.expiry - y.expiry;

        if (res === 0) {
            return compareSession(x, y);
        }
        return res;
    };
    
    this.expiry_ = new goog.structs.AvlTree(compareExpiry);
    this.table_ = {};

};

/**
 * @typedef {?}
 */
aurora.auth.SessionTable.ClientEntry;

/**
 * @typedef {{clients:Object<string,aurora.auth.SessionTable.ClientEntry>, seriesId:!string, expiry:?number, timeout:?number}}
 */
aurora.auth.SessionTable.Entry;
/**
 * @param {string|undefined} token
 * @param {string=} opt_seriesId
 * @return {undefined|aurora.auth.SessionTable.Entry}
 */
aurora.auth.SessionTable.prototype.findSessions = function (token, opt_seriesId) {
    var v = this.table_[token];

    if (v === undefined || (opt_seriesId !== undefined && v.seriesId !== opt_seriesId)) {
        return undefined;
    }
    return v;
};
/**
 * @param {string|undefined} seriesId
 * @return {boolean} true if any removed
 */

aurora.auth.SessionTable.prototype.removeSeriesId = function (seriesId) {
    var toRemove = [];
    for (var k in this.table_) {
        if (this.table_[k].seriesId === seriesId) {
            toRemove.push(k);
        }
    }
    var me = this;
    toRemove.forEach(function(t) {
        me.auth_.logout(t);
    });
    this.updateExpire_();
    return toRemove.length > 0;
};
/**
 * @param {string} token
 * @param {string} seriesId
 * @param {?number} timeout
 * @param {Object} data
 */
aurora.auth.SessionTable.prototype.createSession = function (token, seriesId, constToken, timeout, data) {
    var exp = timeout === null ? null : new Date().getTime() + timeout;
    var session = {expiry: exp, token: token, constToken: token, seriesId: seriesId, data: data, timeout: timeout}; 
    this.expiry_.add(session);
    this.table_[token] = session;
    this.updateExpire_();
};
/**
 * @param {string} token
 * @param {string} seriesId
 * @param {string} clientId
 * @return {boolean} 
 */
aurora.auth.SessionTable.prototype.addConnection = function (token, seriesId, clientId) {
    var s = this.findSessions(token, seriesId);
    if (s) {
        s.clients[clientId] =  {}; // todo
        return true;
    }
    return false;
};

/**
 * @param {string|undefined} token
 */
aurora.auth.SessionTable.prototype.remove = function (token) {
    if (this.table_[token]) {
        this.auth_.logout(token);
        this.updateExpire_();
    }
};

/**
 * @param {string|undefined} token
 * @param {string|undefined} seriesId
 * @param {string} clientId
 * @return {{connection:?}|undefined}
 */
aurora.auth.SessionTable.prototype.findSession = function (token, seriesId, clientId) {
    var sessions = this.findSessions(token, seriesId);
    if (sessions) {
        return sessions.clients[clientId];
    }
    return undefined;
};
/**
 * @private
 * updates the sessions and it expires later
 * @param {string|undefined} token
 */

aurora.auth.SessionTable.prototype.touch_ = function (token) {
    var sessions = this.findSessions(token);
    if (sessions && sessions.expiry !== null) {
        this.expiry_.remove(sessions);
        sessions.expiry = new Date().getTime() + sessions.timeout;
        this.expiry_.add(sessions);
    }
    
};

/**
 * @private 
 * expires all sessions past there expiry time
 */
aurora.auth.SessionTable.prototype.expire = function () {
    var now = new Date().getTime();
    var toRemove = [];
    this.expiry_.inOrderTraverse(function (s) {
        if (s.expiry_ <= now) {
            toRemove.push(s.token);
            return false;
        }
        return true;
    });
    var me = this;
    toRemove.forEach(function(t) {
        me.auth_.logout(t);
    });

    this.updateExpire_();
};

/**
 * @private
 * set the callback to check the next expiry time
 */
aurora.auth.SessionTable.prototype.updateExpire_ = function () {
    var now = new Date().getTime();
    var toRemove = [];
    var me = this;
    if (me.nextExpire_) {
        clearTimeout(me.nextExpire_);
        this.nextExpire_ = null;
    }

    this.expiry_.inOrderTraverse(function (s) {
        if (s.expiry !== null) {
            me.nextExpire_ = setTimeout(function () {
                me.expire();
            }, Math.max(0, s.expiry - new Date().getTime()));
        }
        return true;
    });
};
/**
 * @typedef {{validate:function(string, Object,Object, function(string)), unregister:function(string), getCredentials:?function(aurora.http.RequestState,function (?)):?}}
 */
aurora.auth.Authenticator;

/**
 * @export
 * @constructor
 */
aurora.auth.Auth = function () {
    this.sessions_ = new aurora.auth.SessionTable(this);
    this.crypto_ = require('crypto');
    this.nextToken_ = new recoil.util.Sequence();
    /**
     * @param {aurora.http.RequestState} state
     */
    this.loginPageCb_ = function (state) {
        state.response.writeHead(403, state.responseHeaders.toClient());
        state.response.write("<html><head><title>Access Denied</title></head><body>Access Denied Please log in</body></html>");
        state.response.end(); 
    };

    /**
     * @type {!Array<!aurora.auth.Authenticator>}
     */
    this.authenticators_ = [];
    this.allowedUrls_ = {"/client.js":true, "client.libs.js":true, 'client.min.js.map': true, 'client.min.js':true};
    this.allowedPrefixes_ = [/^public\//];
    this.activeSessionExpiry_ = 120000;//30000;  //120000===2 minutes         //3600000 === An hour   //How long an http session lasts

    var me = this;
    aurora.http.addPreRequestCallback(/.*/, function(state){	//Enforce login page when not authenticated.
        var request = state.request;
        var response = state.response;
        if(me.allowedUrls_[state.url.pathname]){return undefined;}
        for(var index = 0; index < me.allowedPrefixes_.length; index++){
            if(me.allowedPrefixes_[index].test(state.url.pathname)) {
                return undefined;
            }
        }
        //first extract the token and series id
        var sesh = decodeURIComponent(state.cookies['sesh']).split('-');
        
        var token = sesh.length == 2 ? sesh[0] : undefined;
        var seriesId = sesh.length == 2 ? sesh[1] : undefined;
        var session = seriesId ? me.sessions_.findSessions(token, seriesId) : undefined;
        if (session) {
            me.sessions_.touch_(token);
            return undefined;
        }

        session = seriesId ? me.sessions_.findSessions(token, seriesId) : undefined;
        if (session) {
            // possible attack
            me.sessions_.removeSeriesId(seriesId);
        }

        session = me.sessions_.findSessions(token);
        if (session) {
            me.sessions_.remove(token);
        }
        var doLogin = function (credentials) {
            var tokenInfo = me.generateToken();
            // update  cookies so that the have the new token
            state.responseHeaders.set('Set-Cookie',[
                "sesh="+ encodeURIComponent(tokenInfo.token + '-' + tokenInfo.seriesId) +'; Path=/;']);
            me.login(tokenInfo.token, tokenInfo.seriesId, credentials.remember, state.clientId, credentials, state);
        };
        var credentials = me.getCredentials(state, doLogin);
        if (credentials !== null) {
            if (credentials) {
                doLogin(credentials);
                return credentials.result;
            }
            return false;
            
        }
        me.loginPageCb_(state);
        return false;
    });
};

/**
 * @param {!aurora.auth.Authenticator} auth
 */
aurora.auth.Auth.prototype.addAuthenticator = function (auth) {
    this.authenticators_.push(auth);
};
/**
 * @param {aurora.http.RequestState} state
 * @param {function (?)} cb
 */
aurora.auth.Auth.prototype.getCredentials = function (state, cb) {
    if (this.authenticators_.length === 0) {
        return {remember: false, result: undefined, response: function () {}};
    }
    
    for (var i = 0; i < this.authenticators_.length; i++) {
        var auth = this.authenticators_[i];
        if (auth.getCredentials) {
            var cred = auth.getCredentials(state, cb);
            if (cred !== null) {
                return cred;
            }
        };
    };
    
    return null;
};

/**
 * add urls that are always allowed
 * @param {string|RegExp} pattern if pattern is string then it is a prefix otherwize it must match the expression
 *
 */
aurora.auth.Auth.prototype.addAllowedExp = function (pattern) {
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }
    if (typeof(pattern) === 'string') {
        this.allowedPrefixes_.push(new RegExp('^' + escapeRegExp(pattern)));
    }
    else {
        this.allowedPrefixes_.push(pattern);
    }
};
/**
 * @param {function(aurora.http.RequestState)} cb
 */
aurora.auth.Auth.prototype.setLoginPage = function (cb) {
    this.loginPageCb_ = cb;
};

aurora.auth.Auth.prototype.x = 1;
/**
 * @param {string} token
 * @param {string} seriesId
 * @param {boolean} rememberMe
 * @param {string} clientId
 * @param {Object} credentials
 * @param {aurora.http.RequestState} state
 **/
aurora.auth.Auth.prototype.login = function (token, seriesId, rememberMe, clientId, credentials, state) {

    // check to see if the token exists if not
    var res = {token : token, seriesId : seriesId};
    var row = undefined;
    var data = {};
    var todo = {};
    var me = this;
    var constToken = this.nextToken_.next();
    var doAuth = function (i) {
        if (i >= me.authenticators_.length) {
            me.sessions_.createSession(token, seriesId, constToken, rememberMe ? null:  me.activeSessionExpiry_, data);
            credentials.response(null, state);
            return;
        }
        var auth = me.authenticators_[i];
        
        auth.validate(constToken, credentials, data, function (message) {
            if (message) {
                // the authentication failed unregister all the successful authentications;
                for (var j = i - 1; j >= 0; j--) {
                    me.authenticators_[j].unregister(token);
                }
                credentials.response(message, state);
            } else {
                doAuth(i + 1);
            }
            
        });
    };

    doAuth(0);
                
};

aurora.auth.Auth.prototype.logout = function (token) {
    var session = this.sessions_.findSessions(token);
    if (session) {
        for (var j = this.authenticators_.length - 1; j >= 0; j--) {
            this.authenticators_[j].unregister(token);
        }
        this.sessions_.remove(token);
        var allClients = function (token) {
            return function (con, curToken) {return curToken === token;};
        };
//        this.serverLogoutChannelE_.send("logout", undefined ,allClients(token));
    }
};


aurora.auth.Auth.prototype.openConnection = function (token, seriesId, clientId, connection) {
    var session = this.sessions_.findSessions(token, seriesId);
    if (session) {
        if (!this.sessions_.addConnection(token, seriesId, clientId)) {
            if(seriesId!==undefined){   //Invalid token, possible token theft.
                if(this.sessions_.removeSeriesId(seriesId)){ 
                    //     LOG.create("Token Theft Assumed!!!, Deleting all tokens that relate to this seriesId");
                }
                else{
//                    connection.sendUTF(JSON.stringify({command: AURORA.COMMANDS.AUTH.TOKEN_INVALID}));   //Legitimate Old Token Attempt
                }
            }
            else{
                //   LOG.create("TODO: Connection open case 3");
            }
        }
    }
};

aurora.auth.Auth.prototype.closeConnection = function (token, seriesId) {

};

aurora.auth.Auth.prototype.keepAlive = function (token, seriesId) {
    this.sessions_.touch_(token);
};

/**
 * @return {{token:string, seriesId:string}}
 */
aurora.auth.Auth.prototype.generateToken = function () {
    return {token: this.crypto_.randomBytes(10).toString("hex"), seriesId: this.crypto_.randomBytes(10).toString("hex")};    
};

/**
 * @final
 * @type {!aurora.auth.Auth}
 */
aurora.auth.instance = new aurora.auth.Auth();
