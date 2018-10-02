goog.provide('aurora.binary');

/**
 * @const
 * @final
 */
aurora.binary.hexChar = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];

/**
 * @param {number} b
 * @return {!string}
 */
aurora.binary.byteToHex = function(b) {
    var hexChar = aurora.binary.hexChar;
    return hexChar[(b >> 4) & 0x0f] + hexChar[b & 0x0f];
};

/**
 * @param {!Array<number>} b
 * @return {!string}
 */
aurora.binary.byteArrayToHexString = function(b) {
    var str = '';
    for (var index = 0; index < b.length; index++) {
        str += aurora.binary.byteToHex(b[index]);
    }
    return str;
};

/**
 * @param {string} str
 * @return {!Array<number>}
 */
aurora.binary.hexStringToByteArray = function(str) {
    var b = [];

    for (var i = 0; i < str.length; i += 2) {
        var part = str.substr(i, 2);
        b.push(parseInt(part, 16));
    }
    return b;
};
/**
 * @const
 */
aurora.binary.littleEndian = true;
/**
 * @param {Array<number>|number} data
 * @return {ArrayBuffer}
 */
aurora.binary.toFloat64ArrayBuffer = function(data) {
    if (typeof(data) === 'number') {
        data = [data];
    }
    var ab = new ArrayBuffer(data.length * 8);
    var dv = new DataView(ab);
    for (var index = 0; index < data.length; index++) {
        dv.setFloat64(index * 8, data[index], aurora.binary.littleEndian);
    }
    return ab;
};

/**
 * @param {Array<number>|number} data
 * @return {ArrayBuffer}
 */
aurora.binary.toUInt32ArrayBuffer = function(data) {
    if (typeof(data) === 'number') {
        data = [data];
    }
    var ab = new ArrayBuffer(data.length * 4);
    var dv = new DataView(ab);
    for (var index = 0; index < data.length; index++) {
        dv.setUint32(index * 4, data[index], aurora.binary.littleEndian);
    }
    return ab;
};

/**
 * @param {!Array<number>|!number} data
 * @return {ArrayBuffer}
 */
aurora.binary.toUInt16ArrayBuffer = function(data) {
    if (typeof(data) === 'number') {
        data = [data];
    }
    var ab = new ArrayBuffer(data.length * 2);
    var dv = new DataView(ab);
    for (var index = 0; index < data.length; index++) {
        dv.setUint16(index * 2, data[index], aurora.binary.littleEndian);
    }
    return ab;
};
/**
 * @param {string} str
 * @return {ArrayBuffer}
 */
aurora.binary.stringToUInt8ArrayBuffer = function(str) {
    var buf = new ArrayBuffer(str.length);
    var bufView = new Uint8Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
};
/**
 * @param {Array<number>|number} data
 * @return {ArrayBuffer}
 */
aurora.binary.toUInt8ArrayBuffer = function(data) {
    if (typeof(data) === 'number') {
        data = [data];
    }
    var ab = new ArrayBuffer(data.length);
    var dv = new DataView(ab);
    for (var index = 0; index < data.length; index++) {
        dv.setUint8(index, data[index]);
    }
    return ab;
};

/**
 * @param {ArrayBuffer} ab
 * @return {string}
 */
aurora.binary.arrayBufferToString = function(ab) {
    // MODIFIED TO REDUCE CALL STACK SIZE
    // .apply(, <array>) would expand to >= 65536 arguments which is the limit for WebKit
    // c.f. https://bugs.webkit.org/show_bug.cgi?id=80797
    var result = '';
    var source = new Uint8Array(ab);
    for (var i = 0; i < source.length; i++) {
        result += String.fromCharCode(source[i]);
    }
    return result;
};

/**
 * @param {ArrayBuffer} ab
 * @return {?}
 */
aurora.binary.arrayBufferToObject = function(ab) {
    return JSON.parse(aurora.binary.arrayBufferToString(ab));
};
