goog.provide('aurora.auth.SessionTable');

/**
 * @typedef {{validate:function(string, Object,Object, function(string)), unregister:function(string), getCredentials:?function(aurora.http.RequestState,function (?{response:function(?, aurora.http.RequestState, function(?))}))}}
 */
aurora.auth.AuthenticatorType;

/**
 * @interface
 */
aurora.auth.Authenticator = function () {};
/**
 * @param {string} token
 * @param {Object} cred
 * @param {Object} data
 * @param {function(?string)} cb param is error
 */
aurora.auth.Authenticator.prototype.validate = function(token, cred, data, cb) {};

/**
 * @param {string} token
 */
aurora.auth.Authenticator.prototype.unregister = function(token) {};

/**
 * @param {!aurora.http.RequestState} state
 * @param {function(?{response:function(?, aurora.http.RequestState, function(?))})} callback
 */
aurora.auth.Authenticator.prototype.getCredentials = function(state, callback) {};

/**
 * @interface
*/

aurora.auth.SessionTable = function() {};


/**
 * @typedef {?}
 */
aurora.auth.SessionTable.ClientEntry;

/**
 * @typedef {{clients:Object<string,aurora.auth.SessionTable.ClientEntry>, token:string, constToken:string, seriesId:string,
 *   locked:boolean, lockTimeout:number, lockTime:?number,
 *   expiry:?number, expireWithClients: boolean, timeout:?number,data:Object}}
 */
aurora.auth.SessionTable.Entry;


/**
 * prints the session table to console
 */
aurora.auth.SessionTable.prototype.print = function() {};




/**
 * @param {string} clientId
 * @param {function(string)}  cb
 */
aurora.auth.SessionTable.prototype.getClientToken = function(clientId, cb) {};


/**
 * gets a constant token from token that is in the cookie
 *
 * @param {string} token
 * @param {function(?string)}  cb
 */
aurora.auth.SessionTable.prototype.getToken = function(token, cb) {};


/**
 * @param {string} clientId
 */
aurora.auth.SessionTable.prototype.unregisterClientToken = function(clientId) {};

/**
 * @param {?} request
 * @param {string} clientId
 * @param {?} connection
 * @param {function (boolean)} cb
 */
aurora.auth.SessionTable.prototype.registerClientToken = function(request, clientId, connection, cb) {};


/**
 * @param {string|undefined} seriesId
 * @param {function(boolean)=} opt_cb true if any removed
 */

aurora.auth.SessionTable.prototype.removeSeriesId = function(seriesId, opt_cb) {};

/**
 * @param {string} token
 * @param {string} seriesId
 * @param {string} constToken
 * @param {?number} timeout
 * @param {Object} data
 * @param {function(?,?aurora.auth.SessionTable.Entry)} callback
 * @param {boolean=} opt_locked default false
 */
aurora.auth.SessionTable.prototype.createSession = function(token, seriesId, constToken, timeout, data, callback, opt_locked) {};


/**
 * @param {string|undefined} clientId
 * @return {boolean}
 */
aurora.auth.SessionTable.prototype.validClient = function(clientId) {};

/**
 * @param {string|undefined} token
 * @param {function()=} opt_cb called when finished
 */
aurora.auth.SessionTable.prototype.remove = function(token, opt_cb) {};

/**
 * @param {string|undefined} token an internal token
 * @param {function()=} opt_cb called when finished
 */
aurora.auth.SessionTable.prototype.removeInternal = function(token, opt_cb) {};

/**
 * removes all the sessions
 */
aurora.auth.SessionTable.prototype.removeAll = function() {};

/**
 * for a session set should it expire if it has open clients
 *
 * @param {string|undefined} token
 * @param {boolean} val if true the session will expire even if it has clients
 */

aurora.auth.SessionTable.prototype.setExpireWithClients = function(token, val) {};


/**
 * @param {string|undefined} token
 * @param {boolean} val if true the session will expire even if it has clients
 */

aurora.auth.SessionTable.prototype.setAllowLock = function(token, val) {};

/**
 * @param {string|undefined} token
 * @param {function(boolean)} cb
 */
aurora.auth.SessionTable.prototype.getExpireWithClients = function(token, cb) {};


/**
 * @param {string|undefined} token
 * @param {function(boolean)} cb
 */
aurora.auth.SessionTable.prototype.getAllowLock = function(token, cb) {};

/**
 * @return {boolean}
 */
aurora.auth.SessionTable.prototype.isMaster =  function() {};
/**
 * @param {string} token
 */
aurora.auth.SessionTable.prototype.unlock = function(token) {};

/**
 * locks a particular session
 * @param {string} token
 */
aurora.auth.SessionTable.prototype.lock = function(token) {};


/**
 * gets a list of user tokens
 * @param {number} userid
 * @return {Promise<Array<string>>} list of internal tokens 
 */
aurora.auth.SessionTable.prototype.getUserTokens = async function(userid) {};


/**
 * 0 means session never locks
 * @param {number} val
 */
aurora.auth.SessionTable.prototype.setDefaultLockTimeout = function(val) {};

/**
 * @param {boolean} val
 */
aurora.auth.SessionTable.prototype.setSessionExpiresWithClient = function(val) {};

/**
 * the function will be called with token and true if locked
 * @param {function(string,boolean)} callback
 */
aurora.auth.SessionTable.prototype.addLockHandler = function(callback) {};


/**
 * @param {string|undefined} token
 * @param {function((undefined|aurora.auth.SessionTable.Entry))} cb not optional always last parameter
 */
aurora.auth.SessionTable.prototype.findSessionExternal = function(token, cb) {};


/**
 * @param {string|undefined} token this is an internal token passed in by cookie
 * @param {string|undefined|function((undefined|aurora.auth.SessionTable.Entry))} seriesIdOrCb
 * @param {(function((undefined|aurora.auth.SessionTable.Entry)))=} opt_cb not optional always last parameter
 */
aurora.auth.SessionTable.prototype.findSession = function(token, seriesIdOrCb, opt_cb) {};

/**
 * @param {string} token this is an internal token passed in by cookie
 * @param {string} seriesId
 * @param {string} ip
 * @param {(function((undefined|aurora.auth.SessionTable.Entry)))=} cb
 */
aurora.auth.SessionTable.prototype.loginFindSession = function(token, seriesId, ip, cb) {};

/**
 * updates the sessions and it expires later
 * @param {string|undefined} token
 */

aurora.auth.SessionTable.prototype.touch = function(token) {};

/**
 * synchronize session for fall over
 * @param {string} token
 */
aurora.auth.SessionTable.prototype.syncSession = function(token) {};


/**
 * @param {function (string)} cb
 */
aurora.auth.SessionTable.prototype.createUniqueId = function (cb) {};
