/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */


var Entities = tinymce.html.Entities;

var isPlainText = function (text) {
    // so basically any tag that is not one of the "p, div, br", or is one of them, but is followed
    // by some additional characters qualifies the text as not a plain text (having some HTML tags)
    return !/<(?:(?!\/?(?:\w+))[^>]*|(?:\w+)\s+\w[^>]+)>/.test(text);
};

var toBRs = function (text) {
    return text.replace(/\r?\n/g, '<br>');
};

var openContainer = function (rootTag, rootAttrs) {
    var key, attrs = [];
    var tag = '<' + rootTag;

    if (typeof rootAttrs === 'object') {
        for (key in rootAttrs) {
            if (Object.prototype.hasOwnProperty.call(rootAttrs, key)) {
                attrs.push(key + '="' + Entities.encodeAllRaw(rootAttrs[key]) + '"');
            }
        }

        if (attrs.length) {
            tag += ' ' + attrs.join(' ');
        }
    }
    return tag + '>';
};

var toBlockElements = function (text, rootTag, rootAttrs) {
    var pieces = text.split(/\r?\n/);
    var i = 0,
        len = pieces.length;
    var stack = [];
    var blocks = [];
    var tagOpen = openContainer(rootTag, rootAttrs);
    var tagClose = '</' + rootTag + '>';
    var isLast, newlineFollows, isSingleNewline;

    // if single-line text then nothing to do
    if (pieces.length === 1) {
        return text;
    }

    for (; i < len; i++) {
        isLast = i === len - 1;
        newlineFollows = !isLast && !pieces[i + 1];
        isSingleNewline = !pieces[i] && !stack.length;

        stack.push(pieces[i] ? pieces[i] : '&nbsp;');

        if (isLast || newlineFollows || isSingleNewline) {
            blocks.push(stack.join('<br>'));
            stack = [];
        }

        if (newlineFollows) {
            i++; // extra progress for extra newline
        }
    }

    return blocks.length === 1 ? blocks[0] : tagOpen + blocks.join(tagClose + tagOpen) + tagClose;
};

var convert = function (text, rootTag, rootAttrs) {    
    return rootTag ? toBlockElements(text, rootTag, rootAttrs) : toBRs(text);
};

export {
    isPlainText,
    convert,
    toBRs,
    toBlockElements
};