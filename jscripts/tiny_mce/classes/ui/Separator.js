/**
 * Separator.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license - Inactive
 * Licence: GNU/LGPL 2.1 or later - http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * Contributing: http://www.tinymce.com/contributing - Inactive
 */

/**
 * This class is used to create vertical separator between other controls.
 *
 * @class tinymce.ui.Separator
 * @extends tinymce.ui.Control
 */
tinymce.create('tinymce.ui.Separator:tinymce.ui.Control', {
  /**
     * Separator constructor.
     *
     * @constructor
     * @method Separator
     * @param {String} id Control id to use for the Separator.
     * @param {Object} s Optional name/value settings object.
     */
  Separator: function (id, s) {
    this._super(id, s);
    this.classPrefix = 'mceSeparator';
    this.setDisabled(true);
  },

  /**
     * Renders the separator as a HTML string. This method is much faster than using the DOM and when
     * creating a whole toolbar with buttons it does make a lot of difference.
     *
     * @method renderHTML
     * @return {String} HTML for the separator control element.
     */
  renderHTML: function () {
    return tinymce.DOM.createHTML('span', {
      'class': this.classPrefix,
      role: 'separator',
      'aria-orientation': 'vertical',
      tabindex: '-1'
    }, '');
  }
});