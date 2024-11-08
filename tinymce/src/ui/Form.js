/**
 * Form.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license - Inactive
 * Licence: GNU/LGPL 2.1 or later - http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * Contributing: http://www.tinymce.com/contributing - Inactive
 */
(function (tinymce) {
  // Shorten class names
  var dom = tinymce.DOM;
  /**
   * This class is used to create layouts. A layout is a container for other controls like buttons etc.
   *
   * @class tinymce.ui.Form
   * @extends tinymce.ui.Container
   */
  tinymce.create('tinymce.ui.Form:tinymce.ui.Container', {

    /**
       * Renders the toolbar as a HTML string. This method is much faster than using the DOM and when
       * creating a whole toolbar with buttons it does make a lot of difference.
       *
       * @method renderHTML
       * @return {String} HTML for the toolbar control.
       */
    renderHTML: function () {
      var html = '',
        settings = this.settings,
        i;

      for (i = 0; i < this.controls.length; i++) {
        var ctrl = this.controls[i], s = ctrl.settings;

        if (s.subtype && s.subtype == 'hidden') {
          html += ctrl.renderHTML();
          continue;
        }

        html += '<div class="mceFormRow">';

        if (s.label) {
          html += '<label for="' + ctrl.id + '">' + s.label + '</label>';
        }

        html += '	<div class="mceFormControl">';
        html += ctrl.renderHTML();
        html += '	</div>';
        html += '</div>';
      }

      return dom.createHTML('div', {
        id: this.id,
        'class': 'mceForm' + (settings['class'] ? ' ' + settings['class'] : ''),
        role: 'group'
      }, html);
    },

    submit: function () {
      var i, data = {};

      for (i = 0; i < this.controls.length; i++) {
        var ctrl = this.controls[i];

        if (typeof ctrl.value === 'function') {
          data[ctrl.name] = ctrl.value();
        }
      }

      return data;
    },

    update: function (data) {
      var i;

      for (i = 0; i < this.controls.length; i++) {
        var ctrl = this.controls[i];

        if (data[ctrl.name]) {
          if (typeof ctrl.value === 'function') {
            ctrl.value(data[ctrl.name]);
          }
        }
      }
    },

    empty: function () {
      var i;

      for (i = 0; i < this.controls.length; i++) {
        this.controls[i].remove();
      }

      this.controls = [];
      this.lookup = {};
    },

    add: function (ctrl) {
      if (!this.get(ctrl.id)) {
        return this._super(ctrl);
      }

      return false;
    },

    postRender: function () {
      var i;
  
      this._super();
  
      for (i = 0; i < this.controls.length; i++) {
        this.controls[i].postRender();
      }
    }
  });
})(tinymce);