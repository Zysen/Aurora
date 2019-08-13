goog.provide('aurora.string');

/**
 @export
 */
aurora.string = {};
/**
 * @suppress {checkTypes} because of redefinition
 * @param {string} prefix
 * @return {boolean}
 */
String.prototype.startsWith = function(prefix) {
    return this.indexOf(prefix) === 0;
};
/**
 * @param {string} it
 * @return {boolean}
 */
String.prototype.contains = function(it) { return this.indexOf(it) != -1; };
/**
 * @suppress {checkTypes} because of redefinition
 * @param {string} suffix
 * @return {boolean}
 */
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};
/**
 * @param {string} find
 * @param {string} replace
 * @return {string}
 */
String.prototype.replaceAll = function(find, replace) {
    var str = this;
    return str.replace(new RegExp(find.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replace);
};
/**
 * @return {string}
 */
String.prototype.toProperCase = function() {
    return this.replace(/\w\S*/g, function(txt) {return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

/**
 * @suppress {checkTypes} because of redefinition
 * @return {string}
 */
String.prototype.trim = String.prototype.trim || function() {
    return this.replace(/^\s+|\s+$/, '');
};
/**
 * @return {string}
 */
String.prototype.trimFullStops = function() {
    return this.replace(/^\.+|\.+$/, '');
};
/**
 * @return {string}
 */
String.prototype.replaceNewLine = function() {
    return this.replace(/(\r\n|\r|\n)/g, '<br />');
};
/**
 * @return {string}
 */
String.prototype.replaceBreaks = function() {
    return this.replace(/<br \/>|<br\/>/g, '\n');
};
/**
 * String Trim to length or first Stop(.)
 * @param {number} nLen
 * @return {string}
 */
String.prototype.short = function(nLen) {
    var nFSPos = this.indexOf('.');
    return (this.length > nLen) ? ((nFSPos > -1) && (nFSPos < nLen + 1) && (nFSPos > 3)) ? this.split('.')[0].trim() + '' : this.substring(0, nLen).trim() + '' : (this + '');
};
/**
 * @return {string}
 */
String.prototype.ucFirst = function() {
    return this.substring(0, 1).toUpperCase() + this.substring(1).toLowerCase();
};
/**
 * Encode for URL transport
 * @return {string}
 */
String.prototype.encode = function() {
    return (this.length > 0) ? encodeURIComponent(this + '') : '';
};
/**
 * @return {string}
 */
String.prototype.replaceQuotes = function() {
    return this.replace(/"/g, '\\\"');
};
/**
 * HTML remove tags prototype
 * @return {string}
 */
String.prototype.stripTags = function() {
    return this.replace(/<\S[^>]*>/g, '');
};
/**
 * @return {number}
 */
String.prototype.tidyNumeric = function() {
    return Math.abs(this.replace(/[^0-9.]/ig, '').trimFullStops());
};
/**
 * @param {number} n
 * @return {string}
 */

String.prototype.left = function(n) {
    return this.substr(0, n);
};
/**
 * @param {number} n
 * @return {string}
 */
String.prototype.right = function(n) {
    return this.substr((this.length - n), this.length);
};

// Pads a string with zeros on the left.
/**
 * @param {number} new_length
 * @param {string} character
 * @return {string}
 */
String.prototype.padLeft = function(new_length, character) {
    if (character == undefined) {
        character = ' ';
    }
    var str = this.valueOf();
    while (str.length < new_length) {
        str = character + str;
    }
    return str;
};
/**
 * @param {number} new_length
 * @param {string} character
 * @return {string}
 */
String.prototype.padRight = function(new_length, character) {
    if (character == undefined) {
        character = ' ';
    }
    var str = this.valueOf();
    while (str.length < new_length) {
        str = str + character;
    }
    return str;
};

/**
 * @return {string}
 */
String.prototype.makeCSSSafe = function() {
    return this.replace(/[^a-z0-9]/g, function(s) {
        var c = s.charCodeAt(0);
        if (c == 32) {
            return '-';
        }
        if (c >= 65 && c <= 90) {
            return '_' + s.toLowerCase();
        }
        return '__' + ('000' + c.toString(16)).slice(-4);
    });
};
/**
 * @return {string}
 */
String.prototype.makeDomIdSafe = function() {
    return this.replace(/^[^a-z0-9]+|[^\w:.-]+/gi, '').toLowerCase().replaceAll('=', '');
};

/**
 * removes any punctuation from string
 * @return {string}
 */
String.prototype.clearPunc = function() {
    return this.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()]/g, '').replace(/\s{2,}/g, ' ');
};

/**
 * @return {!Array<number>}
 */
String.prototype.toByteArray = function() {
    var bytes = [];
    for (var i = 0; i < this.length; i++) {
        var char = this.charCodeAt(i);
        bytes.push(char >>> 8);
        bytes.push(char & 0xFF);
    }
    return bytes;
};

/**
 * @param {!Array<number>} bytes
 * @return {string}
 */
String.fromByteArray = function(bytes) {
    var str = '';
    for (var i = 0; i < bytes.length; i += 2) {
        var char = bytes[i] << 8;
        if (bytes[i + 1])
            char |= bytes[i + 1];
        str += String.fromCharCode(char);
    }
    return str;
};
