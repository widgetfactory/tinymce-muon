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

/**
 * This module contains logic for handling caret candidates. A caret candidate is
 * for example text nodes, images, input elements, cE=false elements etc.
 *
 * @private
 * @class tinymce.caret.CaretCandidate
 */
(function (tinymce) {
  var NodeType = tinymce.dom.NodeType, CaretContainer = tinymce.caret.CaretContainer;
  var Arr = tinymce.util.Arr;

  var isContentEditableTrue = NodeType.isContentEditableTrue,
    isContentEditableFalse = NodeType.isContentEditableFalse,
    isBr = NodeType.isBr,
    isText = NodeType.isText,
    isInvalidTextElement = NodeType.matchNodeNames('script style textarea'),
    isAtomicInline = NodeType.matchNodeNames('img input textarea hr iframe video audio object'),
    isTable = NodeType.matchNodeNames('table'),
    isCaretContainer = CaretContainer.isCaretContainer;

  function isCaretCandidate(node) {
    if (isCaretContainer(node)) {
      return false;
    }

    if (isText(node)) {
      if (isInvalidTextElement(node.parentNode)) {
        return false;
      }

      return true;
    }

    return isAtomicInline(node) || isBr(node) || isTable(node) || isContentEditableFalse(node);
  }

  function isInEditable(node, rootNode) {
    for (node = node.parentNode; node && node != rootNode; node = node.parentNode) {
      if (isContentEditableFalse(node)) {
        return false;
      }

      if (isContentEditableTrue(node)) {
        return true;
      }
    }

    return true;
  }

  function isAtomicContentEditableFalse(node) {
    if (!isContentEditableFalse(node)) {
      return false;
    }

    return Arr.reduce(node.getElementsByTagName('*'), function (result, elm) {
      return result || isContentEditableTrue(elm);
    }, false) !== true;
  }

  function isAtomic(node) {
    return isAtomicInline(node) || isAtomicContentEditableFalse(node);
  }

  function isEditableCaretCandidate(node, rootNode) {
    return isCaretCandidate(node) && isInEditable(node, rootNode);
  }

  tinymce.caret.CaretCandidate = {
    isCaretCandidate: isCaretCandidate,
    isInEditable: isInEditable,
    isAtomic: isAtomic,
    isEditableCaretCandidate: isEditableCaretCandidate
  };
})(tinymce);