/**
 * Originally part of TinyMCE 4.x
 * Copyright (c) 1999-2015 Ephox Corp. All rights reserved
 * Licensed under LGPL-2.1-or-later (see LICENSE.TXT in the original project)
 *
 * This version:
 * Copyright (c) 2025 Ryan Demmer
 * Relicensed under GPL-2.0-or-later as permitted by Section 3 of the LGPL.
 *
 * See LICENSE for GPL terms.
 */

var internalMimeType = 'x-tinymce/html';
var internalMark = '<!-- ' + internalMimeType + ' -->';

var mark = function (html) {
  return internalMark + html;
};

var unmark = function (html) {
  return html.replace(internalMark, '');
};

var isMarked = function (html) {
  return html.indexOf(internalMark) !== -1;
};

var internalHtmlMime = function () {
  return internalMimeType;
};

export {
  mark,
  unmark,
  isMarked,
  internalHtmlMime
};