/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

/**
 * This module handles caret containers. A caret container is a node that
 * holds the caret for positional purposes.
 *
 * @private
 * @class tinymce.caret.CaretContainer
 */
(function (tinymce) {
  var NodeType = tinymce.dom.NodeType, Zwsp = tinymce.text.Zwsp;

  var isElement = NodeType.isElement,
    isText = NodeType.isText;

  function isCaretContainerBlock(node) {
    if (isText(node)) {
      node = node.parentNode;
    }

    return isElement(node) && node.hasAttribute('data-mce-caret');
  }

  function isCaretContainerInline(node) {
    return isText(node) && Zwsp.isZwsp(node.data);
  }

  function isCaretContainer(node) {
    return isCaretContainerBlock(node) || isCaretContainerInline(node);
  }

  var hasContent = function (node) {
    return node.firstChild !== node.lastChild || !NodeType.isBr(node.firstChild);
  };

  function insertInline(node, before) {
    var doc, sibling, textNode, parentNode;

    doc = node.ownerDocument;
    textNode = doc.createTextNode(Zwsp.ZWSP);
    parentNode = node.parentNode;

    if (!before) {
      sibling = node.nextSibling;
      if (isText(sibling)) {
        if (isCaretContainer(sibling)) {
          return sibling;
        }

        if (startsWithCaretContainer(sibling)) {
          sibling.splitText(1);
          return sibling;
        }
      }

      if (node.nextSibling) {
        parentNode.insertBefore(textNode, node.nextSibling);
      } else {
        parentNode.appendChild(textNode);
      }
    } else {
      sibling = node.previousSibling;
      if (isText(sibling)) {
        if (isCaretContainer(sibling)) {
          return sibling;
        }

        if (endsWithCaretContainer(sibling)) {
          return sibling.splitText(sibling.data.length - 1);
        }
      }

      parentNode.insertBefore(textNode, node);
    }

    return textNode;
  }

  function createBogusBr() {
    var br = document.createElement('br');
    br.setAttribute('data-mce-bogus', '1');
    return br;
  }

  function insertBlock(blockName, node, before) {
    var doc, blockNode, parentNode;

    doc = node.ownerDocument;
    blockNode = doc.createElement(blockName);
    blockNode.setAttribute('data-mce-caret', before ? 'before' : 'after');
    blockNode.setAttribute('data-mce-bogus', 'all');
    blockNode.appendChild(createBogusBr());
    parentNode = node.parentNode;

    if (!before) {
      if (node.nextSibling) {
        parentNode.insertBefore(blockNode, node.nextSibling);
      } else {
        parentNode.appendChild(blockNode);
      }
    } else {
      parentNode.insertBefore(blockNode, node);
    }

    return blockNode;
  }

  function startsWithCaretContainer(node) {
    return isText(node) && node.data[0] == Zwsp.ZWSP;
  }

  function endsWithCaretContainer(node) {
    return isText(node) && node.data[node.data.length - 1] == Zwsp.ZWSP;
  }

  function trimBogusBr(elm) {
    var brs = elm.getElementsByTagName('br');
    var lastBr = brs[brs.length - 1];
    if (NodeType.isBogus(lastBr)) {
      lastBr.parentNode.removeChild(lastBr);
    }
  }

  function showCaretContainerBlock(caretContainer) {
    if (caretContainer && caretContainer.hasAttribute('data-mce-caret')) {
      trimBogusBr(caretContainer);
      caretContainer.removeAttribute('data-mce-caret');
      caretContainer.removeAttribute('data-mce-bogus');
      caretContainer.removeAttribute('style');
      caretContainer.removeAttribute('_moz_abspos');
      return caretContainer;
    }

    return null;
  }

  tinymce.caret.CaretContainer = {
    isCaretContainer: isCaretContainer,
    isCaretContainerBlock: isCaretContainerBlock,
    isCaretContainerInline: isCaretContainerInline,
    showCaretContainerBlock: showCaretContainerBlock,
    insertInline: insertInline,
    insertBlock: insertBlock,
    hasContent: hasContent,
    startsWithCaretContainer: startsWithCaretContainer,
    endsWithCaretContainer: endsWithCaretContainer
  };

})(tinymce);