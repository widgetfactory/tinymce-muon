/**
 * Zwsp.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2017 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license - Inactive
 * Licence: GNU/LGPL 2.1 or later - http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * Contributing: http://www.tinymce.com/contributing - Inactive
 */

/**
 * Utility functions for working with zero width space
 * characters used as character containers etc.
 *
 * @private
 * @class tinymce.text.Zwsp
 * @example
 * var isZwsp = Zwsp.isZwsp('\uFEFF');
 * var abc = Zwsp.trim('a\uFEFFc');
 */
(function (tinymce) {
  // This is technically not a ZWSP but a ZWNBSP or a BYTE ORDER MARK it used to be a ZWSP
  var ZWSP = '\uFEFF';

  var isZwsp = function (chr) {
    return chr === ZWSP;
  };

  var trim = function (text) {
    return text.replace(new RegExp(ZWSP, 'g'), '');
  };

  tinymce.text.Zwsp = {
    isZwsp: isZwsp,
    ZWSP: ZWSP,
    trim: trim
  };
})(tinymce);