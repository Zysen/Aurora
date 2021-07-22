goog.provide('aurora.auth.Auth');
goog.provide('aurora.auth.instance');

goog.require('aurora.auth.MemorySessionTable');
//goog.require('aurora.auth.DbSessionTable'); // just so it compiles
goog.require('aurora.http');
goog.require('aurora.log');
goog.require('config');
goog.require('recoil.util.Sequence');

/**
 * @export
 * @constructor
 */
aurora.auth.Auth = function() {
    this.log_ = aurora.log.createModule('AUTH');
    /**
     * @type {aurora.auth.SessionTable}
     */
    this.sessions_ = null;
    this.delays_ = [];
    let me = this;
    setTimeout(function () {
        try {
            let factoryName = (config['authentication'] || {})['sessionTable'];
            
            if (factoryName) {
                let sessionFactory = /** @type {function(!aurora.auth.Auth):!aurora.auth.SessionTable} */ (eval(factoryName));
                me.sessions_ = sessionFactory(me);
            }
            else {
                me.sessions_ = new aurora.auth.MemorySessionTable(this);
            }
            me.delays_.forEach(function (d) {d();});
            me.delays_ = [];
        }
        catch (e) {
            this.log_.error('Cannot create configured session table using memory on instead');
        }
    }, 1);

    
    this.async_ = require('async');
    this.crypto_ = require('crypto');
    this.blockAutoLogin_ = null;
    this.loginPath_ = null;
    
    /**
     * @private
     * @param {aurora.http.RequestState} state
     */
    this.loginPageCb_ = function(state) {
        state.response.writeHead(403, state.responseHeaders.toClient());
        state.response.write('<html><head><title>Access Denied</title></head><body>Access Denied Please log in</body></html>');
        state.response.end();
    };

    /**
     * @private
     * @type {!Array<!aurora.auth.Authenticator|!aurora.auth.AuthenticatorType>}
     */
    this.authenticators_ = [];
    // note /client.min.js.map is very important here because firefox sends it without the cookies so forces a reloggin
    this.allowedUrls_ = {'/client.js': true, '/client.libs.js': true, '/client.min.js.map': true, '/client.min.js': true};
    this.allowedPrefixes_ = [/^public\//];
    this.disallowedPrefixes_ = [];
    this.activeSessionExpiry_ = 120000;//30000;  //120000===2 minutes         //3600000 === An hour   //How long an http session lasts

    aurora.http.addPreRequestCallback(/.*/, function(state, doneCallback) {   //Enforce login page when not authenticated.
        var request = state.request;
        var response = state.response;
        if (state.url.pathname === '/logout') {
            let sesh = decodeURIComponent(state.cookies['sesh'] || '').split('-');
            let token = sesh.length == 2 ? sesh[0] : undefined;
            let seriesId = sesh.length == 2 ? sesh[1] : undefined;

            if (seriesId) {
                me.log_.info("logging out");
                me.sessions_.findSession(token, seriesId, function (session) {
                    if (session) {
                        me.sessions_.remove(session.constToken, function () {
                            let logoutPage  = (config['authentication'] || {})['logoutURL'];

                            
                            var referer = logoutPage || state.request.headers['referer'];
                            me.log_.info("session removed");
                            if (referer) {
                                try {
                                    state.response.writeHead(302, {'Location': referer});
                                    state.response.end();
                                    return;
                                }
                                catch (e) {
                                    
                                }
                            }
                            me.log_.info("logging out redirecting to login page");
                            
                            me.loginPageCb_(state);

                        });
                    }
                    else {
                        me.loginPageCb_(state);
                    }
                });
                return false;
            }
            // logout
        }

        
        //first extract the token and series id
        var sesh = decodeURIComponent(state.cookies['sesh'] || '').split('-');

        let token = sesh.length == 2 ? sesh[0] : undefined;
        let seriesId = sesh.length == 2 ? sesh[1] : undefined;

        
        let loginIfNeeded = function (session) {
            if (session) {
                // if our user is null and we are trying to login, we should login so don't accept the login
                if (!(session.data && session.data.userid === null && state.url.pathname === me.loginPath_)) {
                    
                    if (session.seriesId !== seriesId || token !== session.token) {
                        // the session table updated the token, this can happen for persistant logins
                        // as security feature, each time you login it gets updated
                        state.responseHeaders.set('Set-Cookie', [
                            'sesh=' + encodeURIComponent(session.token + '-' + session.seriesId) + me.makeCookieSuffix() ]);
                        
                    }
                   
                    if (session.data && session.data.userid !== null && !state.cookies['userid']) {
                        let setCookies = state.responseHeaders.get('Set-Cookie');
                        if (!setCookies) {
                            state.responseHeaders.set('Set-Cookie', [
                                'username=' + encodeURIComponent(session.data.user) + '; Path=/; SameSite=Strict;',
                                'userid=' + encodeURIComponent(session.data.userid) + '; Path=/; SameSite=Strict;',
                                'permissions=' + encodeURIComponent(JSON.stringify(session.data.permissions || {})) + '; Path=/; SameSite=Strict;']);
                        }
                    }

                    state.token = session.constToken;
                    state.locked = session.locked;
                    me.sessions_.touch(session.constToken);
                    doneCallback(undefined);
                    return;
                }

            }
            
            // do this after we get the session because the callback may use it
            if (me.allowedUrls_[state.url.pathname]) {
                doneCallback(undefined);
                return;
            }
            
            let disallowed = false;
            for (let index = 0; index < me.disallowedPrefixes_.length; index++) {
                if (me.disallowedPrefixes_[index].test(state.url.pathname)) {
                    disallowed = true;
                    break;
                }
            }
            if (!disallowed) {
                for (let index = 0; index < me.allowedPrefixes_.length; index++) {
                    if (me.allowedPrefixes_[index].test(state.url.pathname)) {
                        doneCallback(undefined);
                        return;
                    }
                }
            }
            if (seriesId) {
                me.sessions_.findSession(token, seriesId, function (session) {
                    // possible attack
                    if (session) {
                        me.sessions_.removeSeriesId(seriesId, function () {
                            me.sessions_.removeInternal(token);
                        });
                    }
                    else {
                        me.sessions_.removeInternal(token);
                    }
                });
            }
            else {
                me.sessions_.removeInternal(token);
            }
            me.getCredentials(state, me.makeDoLogin_(state), doneCallback);
        };

        
        if (seriesId && token) {
            me.sessions_.loginFindSession(token, seriesId, loginIfNeeded);
        }
        else {
            loginIfNeeded(undefined);
        }
        return aurora.http.REQUEST_ASYNC;
    });
};

/**
 * @return {number}
 */
aurora.auth.Auth.prototype.persistMs = function () {
    return ((config['authentication'] || {})['persistantTimeoutMins'] || 525600) * 60 * 1000;
};

/**
 * @return {string}
 */
aurora.auth.Auth.prototype.makeCookieSuffix = function () {
    let d = new Date();
    let ms = this.persistMs();
    d.setTime(d.getTime() + ms); // in milliseconds
    return '; Path=/; SameSite=Strict; HttpOnly; Max-age=' + Math.ceil(ms/1000) + '; Expires='+d.toGMTString()+';';
};
/**
 * @private
 * @param {aurora.http.RequestState} state
 * @return {function({response:function(?, aurora.http.RequestState, function(?))},function(?))} first argument is the credentials that we have got, the second 
 */
 
aurora.auth.Auth.prototype.makeDoLogin_ = function(state) {
    let me = this;
    return function(credentials, doneCallback) {
        if (!me.sessions_.isMaster()) {
            credentials.response({message: 'cannot log into slave server'}, state, doneCallback);
            return;
        }

        console.log("logging in with token, todo test", credentials.token);

        // if credentials already have a token that means want to login from a different ip but keep the session
        if (credentials.token) {
            let tokenInfo = credentials.token;
            state.responseHeaders.set('Set-Cookie', [
                'sesh=' + encodeURIComponent(tokenInfo.token + '-' + tokenInfo.seriesId) + me.makeCookieSuffix()]);
            
            let blockAutoLogin = function () {
                // wait 5 minutes before we can do another password login
                if (me.blockAutoLogin_) {
                    clearTimeout(me.blockAutoLogin_);
                }
                me.blockAutoLogin_ = setTimeout(function() {
                    me.blockAutoLogin_ = null;
                }, 5 * 60000);
                
            };
            if (credentials.token.token === '') {
                credentials.response({message: 'no token given'}, state, doneCallback);
            }
            // if the autologin is blocked autologin will just look like the login failed but all it will do is extend block
            else if (!this.blockAutoLogin_) {
                me.sessions_.findSession(credentials.token.token, credentials.token.seriesId, function (session) {
                    if (session) {
                        credentials.response(null, state, doneCallback);
                    }
                    else {
                        blockAutoLogin();
                        me.loginPageCb_(state);
                        doneCallback(false);
                    }
                });
            }
            else {
                blockAutoLogin();
                me.loginPageCb_(state);
                doneCallback(false);
            }
        }
        else {
            // proper login we will generate a token and login
            me.generateToken(function (tokenInfo) {
                state.responseHeaders.set('Set-Cookie', [
                    'sesh=' + encodeURIComponent(tokenInfo.token + '-' + tokenInfo.seriesId) + me.makeCookieSuffix()]);
                me.login(tokenInfo.uniq, tokenInfo.token, tokenInfo.seriesId, credentials.remember, credentials, state, doneCallback);
            });
        }
    };
};
/**
 * @param {string} path
 */
aurora.auth.Auth.prototype.setLoginPath = function (path) {
    this.loginPath_  = path;
};
/**
 * @param {aurora.http.RequestState} state
 */
aurora.auth.Auth.prototype.loginPageCb = function(state) {
    this.loginPageCb_(state);
};
/**
 * @param {string} cookies
 * @return {?{token:string,seriesId:string}}
 */
aurora.auth.Auth.getSessionFromCookies = function(cookies) {
    if (!cookies) {
        return null;
    }

    var parts = cookies.split(';');
    for (var i = 0; i < parts.length; i++) {
        var cookie = parts[i].trim();
        if (cookie.startsWith('sesh=')) {
            var sessParts = cookie.split('=');
            if (sessParts.length > 1) {
                return aurora.auth.Auth.parseSessionToken(sessParts[1]);
            }
        }
    }
    return null;
};

/**
 * @param {string} token
 * @return {?{token:string,seriesId:string}}
 */
aurora.auth.Auth.parseSessionToken = function(token) {
    if (token) {
        var parts = token.split('-');
        if (parts.length === 2) {
            return {token: parts[0], seriesId: parts[1]};
        }
    }
    return null;
};

/**
 * @param {number} timeout
 */
aurora.auth.Auth.prototype.setSessionExpiryMs = function(timeout) {
    this.activeSessionExpiry_ = timeout;
};

/**
 * @param {boolean} val
 */
aurora.auth.Auth.prototype.setSessionExpiresWithClient = function(val) {
    this.sessions_.setSessionExpiresWithClient(val);
};

/**
 * @param {!aurora.auth.Authenticator|!aurora.auth.AuthenticatorType} auth
 */
aurora.auth.Auth.prototype.addAuthenticator = function(auth) {
    this.authenticators_.push(auth);
};
/**
 * allows athenticator to get credentals out of the http
 * request themselves this means it is total generic how the login is works
 * @param {aurora.http.RequestState} state
 * @param {function (?, ?)} loginCallback first arg credentials, second donecb
 * @param {function (?)} doneCb
 */
aurora.auth.Auth.prototype.getCredentials = function(state, loginCallback, doneCb) {
    // no authenticators so we can't login
    let me = this;
    let pos = 0;
    if (me.authenticators_.length === 0) {
        me.log_.warn("No Authenticators added to system will not be able to log in");
    }

    let authenticateNext = function (idx) {
        if (idx >= me.authenticators_.length) {
            // no authenticators accepted the request just show the login page
            me.loginPageCb_(state);
            // we don't want to continue
            doneCb(false);
            return;
        }
        let auth = me.authenticators_[idx];
        if (auth.getCredentials) {
            auth.getCredentials(state, function (credentials) {
                if (credentials) {
                    // do the login 
                    loginCallback(credentials, doneCb);
                    
                }
                else {
                    authenticateNext(idx + 1);
                }
            });
        }
        else {
            authenticateNext(idx + 1);
        }
    };
    authenticateNext(0);

};

/**
 * add urls that are always allowed
 * @param {string|RegExp} pattern if pattern is string then it is a prefix otherwize it must match the expression
 *
 */
aurora.auth.Auth.prototype.addAllowedExp = function(pattern) {
    if (typeof(pattern) === 'string') {
        this.allowedPrefixes_.push(new RegExp('^' + aurora.http.escapeRegExp(pattern)));
    }
    else {
        this.allowedPrefixes_.push(pattern);
    }
};

/**
 * disallows prefixes, without authentication
 * @param {string|RegExp} pattern if pattern is string then it is a prefix otherwize it must match the expression
 *
 */
aurora.auth.Auth.prototype.addDisallowedExp = function(pattern) {
    if (typeof(pattern) === 'string') {
        this.disallowedPrefixes_.push(new RegExp('^' + aurora.http.escapeRegExp(pattern)));
    }
    else {
        this.disallowedPrefixes_.push(pattern);
    }
};

/**
 * @param {function(aurora.http.RequestState)} cb
 */
aurora.auth.Auth.prototype.setLoginPage = function(cb) {
    this.loginPageCb_ = cb;
};

/**
 * @param {string} uniqueId
 * @param {string} token
 * @param {string} seriesId
 * @param {boolean} rememberMe
 * @param {Object} credentials
 * @param {aurora.http.RequestState} state
 * @param {function(?)} doneCallback
 **/
aurora.auth.Auth.prototype.login = function(uniqueId, token, seriesId, rememberMe, credentials, state, doneCallback) {

    // check to see if the token exists if not
    var res = {token: token, seriesId: seriesId};
    var row = undefined;
    var data = {};
    var todo = {};
    var me = this;
    let constToken = uniqueId;

    var doAuth = function(i) {
        
        if (i >= me.authenticators_.length) {
            me.sessions_.createSession(
                token, seriesId, constToken, rememberMe ? null : me.activeSessionExpiry_, data,
                function (err) {
                    credentials.response(err, state, data, doneCallback);
                }
            );
            return;
        }
        var auth = me.authenticators_[i];
        auth.validate(constToken, credentials, data, function(message) {
            if (message) {
                // the authentication failed unregister all the successful authentications;
                for (var j = i - 1; j >= 0; j--) {
                    me.authenticators_[j].unregister(constToken);
                }
                credentials.response(message, state, data, doneCallback);
            } else {
                doAuth(i + 1);
            }
        });
    };

    doAuth(0);

};

/**
 * @param {string} token
 * @param {function(?Object)} cb
 */
aurora.auth.Auth.prototype.getSessionData = function(token, cb) {
    var session = this.sessions_.findSessionExternal(token, function (session) {
        cb(session ?session.data : null);
    });
};

/**
 * @param {string} token
 * @param {Object} data
 */
aurora.auth.Auth.prototype.setSessionData = function(token, data) {
    var session = this.sessions_.findSessionExternal(token, function (session) {
        if (session) {
            session.data = data;
            this.sessions_.syncSession(token);
        }
    }.bind(this));
};
/**
 * @param {string} token this is an internal token
 */
aurora.auth.Auth.prototype.logout = function(token) {
    var session = this.sessions_.findSession(token, function (session) {
        if (session) {
            for (var j = this.authenticators_.length - 1; j >= 0; j--) {
                this.authenticators_[j].unregister(session.constToken);
            }
            var allClients = function(token) {
                return function(con, curToken) {return curToken === token;};
            };
            //        this.serverLogoutChannelE_.send("logout", undefined ,allClients(session.constToken));
        }
    }.bind(this));
};


/**
 * @param {string} token this is an external token (constToken);
 */
aurora.auth.Auth.prototype.forceLogout = function(token) {
    this.sessions_.remove(token);
};


/**
 * @param {string} clientId
 * @param {function(string)}  cb
 */
aurora.auth.Auth.prototype.getClientToken = function(clientId, cb) {
    this.sessions_.getClientToken(clientId, cb);
};


/**
 * gets a constant token from token that is in the cookie
 *
 * @param {string} token
 * @param {function(?string)}  cb
 */
aurora.auth.Auth.prototype.getToken = function(token, cb) {
    this.sessions_.getToken(token, cb);
};

/**
 * @param {?} request
 * @param {string} clientId
 * @param {?} connection
 * @param {function(boolean)} cb
 */
aurora.auth.Auth.prototype.registerClientToken = function(request, clientId, connection, cb) {
    this.sessions_.registerClientToken(request, clientId, connection, cb);

};

/**
 * @param {string|undefined} clientId
 * @return {boolean}
 */
aurora.auth.Auth.prototype.validClient = function(clientId) {
    return this.sessions_.validClient(clientId);
};
/**
 * @param {string} clientId
 */
aurora.auth.Auth.prototype.unregisterClientToken = function(clientId) {
    this.sessions_.unregisterClientToken(clientId);
};

/**
 * call this to extend the lifetime of aseesion
 * I am not sure this works yet it seems to me we should use an constant token
 * and we don't seem to use the series id but probably should
 * @param {string} token
 * @param {string=} opt_seriesId
 */
aurora.auth.Auth.prototype.keepAlive = function(token, opt_seriesId) 
{
    this.sessions_.touch(token);
};


/**
 * for a session set should it expire if it has open clients
 *
 * @param {string} token
 * @param {boolean} val if true the session will expire even if it has clients
 */

aurora.auth.Auth.prototype.setExpireWithClients = function(token, val) {
    this.sessions_.setExpireWithClients(token, val);
};



/**
 * @param {string} token
 * @param {boolean} val if true the session will expire even if it has clients
 */

aurora.auth.Auth.prototype.setAllowLock = function(token, val) {
    this.sessions_.setAllowLock(token, val);
};

/**
 * the function will be called with token and true if locked
 * @param {function(string,boolean)} callback
 */
aurora.auth.Auth.prototype.addLockHandler = function(callback) {
    if (this.sessions_) {
        this.sessions_.addLockHandler(callback);
    }
    else {
        this.delays_.push(function () { this.addLockHandler(callback);}.bind(this));
    }
                         
};

/**
 * @param {string} token
 * @param {function(boolean)} cb
 */
aurora.auth.Auth.prototype.getExpireWithClients = function(token, cb) {
    this.sessions_.getExpireWithClients(token, cb);
};


/**
 * @param {string} token constant token
 * @param {function(boolean)} cb
 */
aurora.auth.Auth.prototype.getAllowLock = function(token, cb) {
    this.sessions_.getAllowLock(token, cb);
};


/**
 * 0 means session never locks
 * @param {number} val
 */
aurora.auth.Auth.prototype.setDefaultLockTimeout = function(val) {
    this.sessions_.setDefaultLockTimeout(val);
};


/**
 * @param {string} token
 */
aurora.auth.Auth.prototype.unlock = function(token) {
    this.sessions_.unlock(token);
};

/**
 * really for debugging only so client can force a lock so I don't have to wait
 * @param {string} token
 */
aurora.auth.Auth.prototype.lock = function(token) {
    this.sessions_.lock(token);
};

/**
 * @return {string}
 */
aurora.auth.Auth.prototype.generateSeriesId = function() {
    return this.crypto_.randomBytes(10).toString('hex');
};
/**
 * @param {function ({token:string, seriesId:string, uniq: string})} cb
 */
aurora.auth.Auth.prototype.generateToken = function(cb) {
    let me = this;
    // generate a unique key somehow
    this.sessions_.createUniqueId(function (uniq) {
        cb({token: me.crypto_.randomBytes(10).toString('hex') + uniq, seriesId:me.generateSeriesId(), uniq: uniq});
    });
};

/**
 * @final
 * @type {!aurora.auth.Auth}
 */
aurora.auth.instance = new aurora.auth.Auth();

/**
 * @const
 * @type {!Object}
 */
aurora.auth.autoLogin = {};
