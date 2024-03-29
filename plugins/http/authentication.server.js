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
            me.log_.error('Cannot create configured session table using memory one instead');
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

    aurora.http.addPreRequestCallback(/.*/, async function(state) {   //Enforce login page when not authenticated.
        var request = state.request;
        var response = state.response;
        if (state.url.pathname === '/logout') {
            let sesh = decodeURIComponent(state.cookies['sesh'] || '').split('-');
            let token = sesh.length == 2 ? sesh[0] : undefined;
            let seriesId = sesh.length == 2 ? sesh[1] : undefined;

            if (seriesId) {
                me.log_.info("logging out");
                let session = await me.sessions_.findSession(token, seriesId);
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
                return false;
            }
            // logout
        }

        
        //first extract the token and series id
        var sesh = decodeURIComponent(state.cookies['sesh'] || '').split('-');

        let token = sesh.length == 2 ? sesh[0] : undefined;
        let seriesId = sesh.length == 2 ? sesh[1] : undefined;

        
        let loginIfNeeded = async function (session, recent) {
            if (session) {
                // if our user is null and we are trying to login, we should login so don't accept the login
                if (!(session.data && session.data.userid === null && state.url.pathname === me.loginPath_)) {
                    
                    if (session.seriesId !== seriesId || token !== session.token) {

                        
                        // the session table updated the token, this can happen for persistant logins
                        // as security feature, each time you login it gets updated
                        // recent logins shouldn't need to resend cookies, we don't want to send it to someone else
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
                    state.userid = session.data && session.data.userid ? session.data.userid : null;
                    me.sessions_.touch(session.constToken);
                    return undefined;
                }

            }
            // do this after we get the session because the callback may use it
            if (me.allowedUrls_[state.url.pathname]) {
                return undefined;
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
                        return undefined;
                    }
                }
            }
            if (seriesId) {
                let session = await me.sessions_.findSession(token, seriesId);
                    // possible attack
                if (session) {
                    me.sessions_.removeSeriesId(seriesId, function () {
                        me.sessions_.remove(token);
                    });
                }
                else {
                    me.sessions_.remove(token);
                }
            }
            else {
                me.sessions_.removeInternal(token);
            }
            return await me.getCredentials(state, me.makeDoLogin_(state));
        };

        
        if (seriesId && token) {
            let session = await me.sessions_.loginFindSession(token, seriesId, request.connection.remoteAddress, loginIfNeeded);
            return await loginIfNeeded(session);
        }
        else {
            return await loginIfNeeded(undefined);
        }
    });
};

/**
 * @param {number} token
 * @param {!aurora.db.Reader} reader
 * @param {number} userid
 * @param {string} password
 * @param {function(?,Array)} callback
 */
aurora.auth.Auth.prototype.changePassword = function (token, reader, userid, password, callback) {

    let userT = aurora.db.schema.tables.base.user;
    let query = new recoil.db.Query();
	let userQuery = query.eq(userT.cols.id, query.val(userid));
    let me = this;
    const logoutOtherSessions = async  () => {
        let tokens = await this.sessions_.getUserTokens(userid).catch((e) => {
           me.log_.error("failed to get user tokens for " + userid);
        });
        tokens.forEach((tk) => {
            if (tk != token) {
                me.logout(tk);
                me.forceLogout(tk);
            }
        });
    };
    // changing the users password resets the lock count
    reader.updateOneLevel(
		{}, userT, {'lockcount': 0, 'password': password},
		userQuery, function(err) {
			if (err) {
				callback('Unable to  update password', []);
			}
			else {
				callback(null, []);
                logoutOtherSessions().catch((e) => me.log_.warn('Error logging out sessons', e));
                
			}
		});
};

/**
 * @return {number}
 */
aurora.auth.Auth.prototype.persistMs = function () {
    return ((config['authentication'] || {})['persistantTimeoutMins'] || 525600) * 60 * 1000;
};

/**
 * @param {boolean=} opt_remember
 * @return {string}
 */
aurora.auth.Auth.prototype.makeCookieSuffix = function (opt_remember) {
    let d = new Date();
    let ms = this.persistMs();
    d.setTime(d.getTime() + ms); // in milliseconds
    if (opt_remember) {
        return '; Path=/; SameSite=Strict; HttpOnly; Max-age=' + Math.ceil(ms/1000) + '; Expires='+d.toGMTString()+';';
    }
    else {
        return '; Path=/; SameSite=Strict; HttpOnly;';
    }
};
/**
 * @private
 * @param {aurora.http.RequestState} state
 * @return {function({response:function(?, aurora.http.RequestState): Promise<?>})} returns function that writes the cretails rsponse
 */
 
aurora.auth.Auth.prototype.makeDoLogin_ = function(state) {
    let me = this;
    return async function(credentials) {
        if (!me.sessions_.isMaster()) {
            return await credentials.response({message: 'cannot log into slave server'}, state);
        }

        console.log("logging in with token, todo test", credentials.token);

        // if credentials already have a token that means want to login from a different ip but keep the session
        if (credentials.token) {
            let tokenInfo = credentials.token;
            state.responseHeaders.set('Set-Cookie', [
                'sesh=' + encodeURIComponent(tokenInfo.token + '-' + tokenInfo.seriesId) + me.makeCookieSuffix(credentials.remember)]);
            
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
                return await credentials.response({message: 'no token given'}, state);
            }
            // if the autologin is blocked autologin will just look like the login failed but all it will do is extend block
            else if (!this.blockAutoLogin_) {
                let session = await me.sessions_.findSession(credentials.token.token, credentials.token.seriesId);
                
                if (session) {
                    return await credentials.response(null, state);
                }
                else {
                    blockAutoLogin();
                    me.loginPageCb_(state);
                    return false;
                }
            }
            else {
                blockAutoLogin();
                me.loginPageCb_(state);
                return false;
            }
        }
        else {
            // proper login we will generate a token and login
            let tokenInfo = await me.generateToken();
            
            state.responseHeaders.set('Set-Cookie', [
                'sesh=' + encodeURIComponent(tokenInfo.token + '-' + tokenInfo.seriesId) + me.makeCookieSuffix(credentials.remember)]);
            return await me.login(tokenInfo.uniq, tokenInfo.token, tokenInfo.seriesId, credentials.remember, credentials, state);
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
 * @param {function (?):Promise<boolean>} loginCallback first arg credentials, second donecb
 * @return {Promise<boolean|undefined>}
 */
aurora.auth.Auth.prototype.getCredentials = async function(state, loginCallback) {
    // no authenticators so we can't login
    let me = this;
    let pos = 0;
    if (me.authenticators_.length === 0) {
        me.log_.warn("No Authenticators added to system will not be able to log in");
    }
    try {
        for (let i = 0; i < this.authenticators_.length; i++) {
            let auth = me.authenticators_[i];
            if (auth.getCredentials) {
                let credentials = await auth.getCredentials(state);
                if (credentials) {
                    // do the login
                    return await loginCallback(credentials);
                }
            }
        }
    }
    catch (e) {
        this.log_.error('error authenticating', e);
    }
    this.loginPageCb_(state);
    return false;
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
 * @return {Promise<boolean>}
 **/
aurora.auth.Auth.prototype.login = async function(uniqueId, token, seriesId, rememberMe, credentials, state) {
    
    // check to see if the token exists if not
    var res = {token: token, seriesId: seriesId};
    var row = undefined;
    var data = {};
    var todo = {};
    var me = this;
    let constToken = uniqueId;

    for (let i = 0; i < me.authenticators_.length; i++) {
        var auth = me.authenticators_[i];
        let message = await auth.validate(constToken, credentials, data);
        
        if (message) {
            // the authentication failed unregister all the successful authentications;
            for (var j = i - 1; j >= 0; j--) {
                await me.authenticators_[j].unregister(constToken);
            }
            return await credentials.response(message, state, data);
        }
    }
    try {
        await me.sessions_.createSession(
            token, seriesId, constToken, rememberMe ? null : me.activeSessionExpiry_, data);
    }
    catch (err) {
        return await credentials.response(err, state, data);
    }

    return await credentials.response(null, state, data);


};

/**
 * @param {string} token
 * @return {!Promise<?Object>}
 */
aurora.auth.Auth.prototype.getSessionData = async function(token) {
    let session = await this.sessions_.findSessionExternal(token);
    return session ?session.data : null;
};

/**
 * @param {string} token
 * @param {Object} data
 * @return {Promise}
 */
aurora.auth.Auth.prototype.setSessionData = async function(token, data) {
    var session = await this.sessions_.findSessionExternal(token);
    if (session) {
        session.data = data;
        await this.sessions_.syncSession(token);
    }
};


/**
 * @param {string} token this is an internal token
 * @return {Promise}
 */
aurora.auth.Auth.prototype.logout = async function(token) {
    let session = await this.sessions_.findSession(token);
    if (session) {
        for (var j = this.authenticators_.length - 1; j >= 0; j--) {
            await this.authenticators_[j].unregister(session.constToken);
        }

    }
};


/**
 * @param {string} token this is an external token;
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
 * @return {Promise<boolean>}
 */
aurora.auth.Auth.prototype.registerClientToken = async function(request, clientId, connection) {
    return await this.sessions_.registerClientToken(request, clientId, connection);

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
 * @return {!Promise<boolean>}
 */
aurora.auth.Auth.prototype.getExpireWithClients = async function(token) {
    return await this.sessions_.getExpireWithClients(token);
};


/**
 * @param {string} token constant token
 * @return {!Promise<boolean>}
 */
aurora.auth.Auth.prototype.getAllowLock = async function(token) {
    return await this.sessions_.getAllowLock(token);
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
    let res = this.crypto_.randomBytes(10).toString('hex');
    return res;
};
/**
 * @return {Promise<{token:string, seriesId:string, uniq: string}>}
 */
aurora.auth.Auth.prototype.generateToken = async function() {
    let me = this;
    // generate a unique key somehow
    let uniq = await this.sessions_.createUniqueId();
    return {token: me.crypto_.randomBytes(10).toString('hex') + uniq, seriesId:me.generateSeriesId(), uniq: uniq};
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
