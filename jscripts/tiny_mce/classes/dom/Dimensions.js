/**
 * Dimensions.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2015 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license - Inactive
 * Licence: GNU/LGPL 2.1 or later - http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * Contributing: http://www.tinymce.com/contributing - Inactive
 */

/**
 * This module measures nodes and returns client rects. The client rects has an
 * extra node property.
 *
 * @private
 * @class tinymce.dom.Dimensions
 */
(function (tinymce) {
  var NodeType = tinymce.dom.NodeType,
    Arr = tinymce.util.Arr,
    ClientRect = tinymce.geom.ClientRect;

  function getClientRects(node) {
    function toArrayWithNode(clientRects) {
      return Arr.map(clientRects, function (clientRect) {
        clientRect = ClientRect.clone(clientRect);
        clientRect.node = node;

        return clientRect;
      });
    }

    if (Arr.isArray(node)) {
      return Arr.reduce(node, function (result, node) {
        return result.concat(getClientRects(node));
      }, []);
    }

    if (NodeType.isElement(node)) {
      return toArrayWithNode(node.getClientRects());
    }

    if (NodeType.isText(node)) {
      var rng = node.ownerDocument.createRange();

      rng.setStart(node, 0);
      rng.setEnd(node, node.data.length);

      return toArrayWithNode(rng.getClientRects());
    }
  }

  tinymce.dom.Dimensions = {
    /**
     * Returns the client rects for a specific node.
     *
     * @method getClientRects
     * @param {Array/DOMNode} node Node or array of nodes to get client rects on.
     * @param {Array} Array of client rects with a extra node property.
     */
    getClientRects: getClientRects
  };

})(tinymce);