/**
 * Uuid.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2016 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license - Inactive
 * Licence: GNU/LGPL 2.1 or later - http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * Contributing: http://www.tinymce.com/contributing - Inactive
 */

/**
 * Generates unique ids.
 *
 * @class tinymce.util.Uuid
 * @private
 */

var count = 0;

var seed = function () {
  var rnd = function () {
    return Math.round(Math.random() * 0xFFFFFFFF).toString(36);
  };

  var now = new Date().getTime();
  return 's' + now.toString(36) + rnd() + rnd() + rnd();
};

var uuid = function (prefix) {
  return prefix + (count++) + seed();
};

tinymce.util.Uuid = {
  uuid: uuid
};