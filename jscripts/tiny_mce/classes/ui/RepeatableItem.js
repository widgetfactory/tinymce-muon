/**
 * Form.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */
(function (tinymce) {
  // Shorten class names
  var DOM = tinymce.DOM, count = 0;
  /**
   * This class is used to create layouts. A layout is a container for other controls like buttons etc.
   *
   * @class tinymce.ui.Repeatable
   * @extends tinymce.ui.Container
   */
  tinymce.create('tinymce.ui.RepeatableItem:tinymce.ui.Container', {

    RepeatableItem: function (id, settings) {            
      this._super(id, settings);

      // add integer increment
      var id = settings.controls[0].id + '_' + (count++);

      delete this.lookup[id];

      this.controls[0].id = id;
    },

    /**
       * Renders the toolbar as a HTML string. This method is much faster than using the DOM and when
       * creating a whole toolbar with buttons it does make a lot of difference.
       *
       * @method renderHTML
       * @return {String} HTML for the toolbar control.
       */
    renderHTML: function () {
      var html = '';

      html += this.controls[0].renderHTML();
      html += '<button class="mceButton"><span role="presentation" class="mceIcon mce_plus"></span><span role="presentation" class="mceIcon mce_trash"></span></button>';

      return DOM.createHTML('div', {
        id: this.id,
        class: 'mceRepeatableItem mceForm mceFormRow'
      }, html);
    },

    value: function (value) {
      if (arguments.length) {

        if (Array.isArray(value)) {
          value = value.shift();
        }

        this.controls[0].value(value);

        return this;
      }

      return this.controls[0].value();
    }
  });
})(tinymce);