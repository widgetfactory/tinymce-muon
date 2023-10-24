/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 * 
 * This is a modified version of the original TrimBody.ts file for es5 compatibility.
 * Source: https://github.com/tinymce/tinymce/blob/release/5.10/modules/tinymce/src/core/main/ts/dom/TrimBody.ts
 */

(function (tinymce) {    
    var ZWSP = '\uFEFF';

    function getTemporaryNodeSelector(tempAttrs) {
        return "" + (tempAttrs.length === 0 ? '' : tempAttrs.map(function (attr) {
            return "[" + attr + "]";
        }).join(',') + ",") + "[data-mce-bogus=\"all\"]";
    }

    function getTemporaryNodes(body, tempAttrs) {
        return body.querySelectorAll(getTemporaryNodeSelector(tempAttrs));
    }

    function createCommentWalker(body) {
        return document.createTreeWalker(body, NodeFilter.SHOW_COMMENT, null, false);
    }

    function hasComments(body) {
        return createCommentWalker(body).nextNode() !== null;
    }

    function hasTemporaryNodes(body, tempAttrs) {
        return body.querySelector(getTemporaryNodeSelector(tempAttrs)) !== null;
    }

    function trimTemporaryNodes(body, tempAttrs) {
        tinymce.each(getTemporaryNodes(body, tempAttrs), function (elm) {
            if (elm.getAttribute('data-mce-bogus') === 'all') {
                if (elm && elm.parentNode) {
                    elm.parentNode.removeChild(elm);
                }
            } else {
                tinymce.each(tempAttrs, function (attr) {
                    if (elm.hasAttribute(attr)) {
                        elm.removeAttribute(attr);
                    }
                });
            }
        });
    }

    function removeCommentsContainingZwsp(body) {
        var walker = createCommentWalker(body);
        var nextNode = walker.nextNode();
        while (nextNode !== null) {
            var comment = walker.currentNode;
            nextNode = walker.nextNode();
            if (typeof comment.nodeValue === 'string' && comment.nodeValue.indexOf(ZWSP) !== -1) {
                if (comment && comment.parentNode) {
                    comment.parentNode.removeChild(comment);
                }
            }
        }
    }

    function deepClone(body) {
        return body.cloneNode(true);
    }

    function trim(body, tempAttrs) {
        var trimmed = body;

        if (hasComments(body)) {
            trimmed = deepClone(body);
            removeCommentsContainingZwsp(trimmed);
            if (hasTemporaryNodes(trimmed, tempAttrs)) {
                trimTemporaryNodes(trimmed, tempAttrs);
            }
        } else if (hasTemporaryNodes(body, tempAttrs)) {
            trimmed = deepClone(body);
            trimTemporaryNodes(trimmed, tempAttrs);
        }

        return trimmed;
    }


    /**
     * Constucts a new DOM serializer class.
     *
     * @constructor
     * @method Serializer
     * @param {Object} settings Serializer settings object.
     * @param {tinymce.dom.DOMUtils} dom DOMUtils instance reference.
     * @param {tinymce.html.Schema} schema Optional schema reference.
     */
    tinymce.dom.TrimBody = {
        trim: trim,
        hasComments: hasComments,
        hasTemporaryNodes: hasTemporaryNodes,
        trimTemporaryNodes: trimTemporaryNodes,
        removeCommentsContainingZwsp: removeCommentsContainingZwsp
    };
})(tinymce);