goog.provide('aurora.download');


/**
 * downloads a file to the local machen
 *
 * @param {string} path
 * @param {function()=} opt_done
 */
aurora.download.downloadFile = function(path, opt_done) {

    var frame = goog.dom.createDom(goog.dom.TagName.IFRAME);
    frame.style.display = 'none';
    frame.src = path;
    frame.onload = function() {
        setTimeout(function() {
            if (frame) {
                document.body.removeChild(/** @type {!HTMLIFrameElement} */(frame));
            }
            frame = undefined;
        },1);
    };

    if (frame) {
        document.body.appendChild(/** @type {!HTMLIFrameElement} */(frame));
        frame.click();
    }
    // onload doesn't fire on all browsers so simply fake
    if (opt_done) {
        setTimeout(function() {
            if (opt_done) {
                opt_done();
            }
        }, 2000);
    }
};

