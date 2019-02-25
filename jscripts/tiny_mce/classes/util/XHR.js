/**
 * XHR.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

/**
 * This class enables you to send XMLHTTPRequests cross browser.
 * @class tinymce.util.XHR
 * @static
 * @example
 * // Sends a low level Ajax request
 * tinymce.util.XHR.send({
 *    url : 'someurl',
 *    success : function(text) {
 *       console.debug(text);
 *    }
 * });
 */
tinymce.create('static tinymce.util.XHR', {
    /**
     * Sends a XMLHTTPRequest.
     * Consult the Wiki for details on what settings this method takes.
     *
     * @method send
     * @param {Object} o Object will target URL, callbacks and other info needed to make the request.
     */
    send: function (o) {
        var xhr, c = 0;

        function ready() {
            if (!o.async || xhr.readyState == 4 || c++ > 10000) {
                if (o.success && c < 10000 && xhr.status == 200) {
                    o.success.call(o.success_scope, '' + xhr.responseText, xhr, o);
                } else if (o.error) {
                    o.error.call(o.error_scope, c > 10000 ? 'TIMED_OUT' : 'GENERAL', xhr, o);
                }
                xhr = null;
            } else {
                window.setTimeout(ready, 10);
            }
        }

        // Default settings
        o.scope = o.scope || this;
        o.success_scope = o.success_scope || o.scope;
        o.error_scope = o.error_scope || o.scope;
        o.async = o.async === false ? false : true;
        o.data = o.data || '';

        xhr = new XMLHttpRequest();

        if (xhr) {
            if (xhr.overrideMimeType) {
                xhr.overrideMimeType(o.content_type);
            }

            xhr.open(o.type || (o.data ? 'POST' : 'GET'), o.url, o.async);

            if (o.content_type) {
                xhr.setRequestHeader('Content-Type', o.content_type);
            }

            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

            xhr.send(o.data);

            // Syncronous request
            if (!o.async) {
                return ready();
            }

            // Wait for response, onReadyStateChange can not be used since it leaks memory in IE
            window.setTimeout(ready, 10);
        }
    }
});