/**
 * JSONP.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license - Inactive
 * Licence: GNU/LGPL 2.1 or later - http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * Contributing: http://www.tinymce.com/contributing - Inactive
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