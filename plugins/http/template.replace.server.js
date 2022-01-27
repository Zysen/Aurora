goog.provide('aurora.template.helpers');

/**
 * @param {string} body
 * @param {Object<string,string>} params
 * @return {string}
 */
aurora.template.helpers.replace = function (body, params) {
    return body.replace(/{[A-Z]+}/g, function (param) {
        return params[param.substring(1, param.length -1)] || '';
    });
};