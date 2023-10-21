/**
 * Toolbar.js
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
	 * This class is used to create toolbars a toolbar is a container for other controls like buttons etc.
	 *
	 * @class tinymce.ui.Toolbar
	 * @extends tinymce.ui.Container
	 */
  tinymce.create('tinymce.ui.Toolbar:tinymce.ui.Container', {
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

      var controls = settings.controls || this.controls;

      for (i = 0; i < controls.length; i++) {
        html += controls[i].renderHTML();
      }

      this.controls = controls;

      return dom.createHTML('div', {
        id: this.id,
        'class': 'mceToolbarRow' + (settings['class'] ? ' ' + settings['class'] : ''),
        role: 'group'
      }, html);
    }
  });
})(tinymce);