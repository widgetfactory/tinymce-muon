/**
 * JSONP.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

tinymce.create('static tinymce.util.JSONP', {
    callbacks: {},
    count: 0,

    send: function (o) {
        var self = this,
            dom = tinymce.DOM,
            count = o.count !== undefined ? o.count : this.count,
            id = 'tinymce_jsonp_' + count;

        this.callbacks[count] = function (json) {
            dom.remove(id);
            delete self.callbacks[count];
            o.callback(json);
        };

        dom.add(dom.doc.body, 'script', {
            id: id,
            src: o.url,
            type: 'text/javascript'
        });

        this.count++;
    }
});