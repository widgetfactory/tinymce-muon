/**
 * TreeWalker.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

tinymce.dom.TreeWalker = function (startNode, rootNode) {
  var node = startNode;

  function findSibling(node, startName, siblingName, shallow) {
    var sibling, parent;

    if (node) {
      // Walk into nodes if it has a start
      if (!shallow && node[startName]) {
        return node[startName];
      }

      // Return the sibling if it has one
      if (node != rootNode) {
        sibling = node[siblingName];
        if (sibling) {
          return sibling;
        }

        // Walk up the parents to look for siblings
        for (parent = node.parentNode; parent && parent != rootNode; parent = parent.parentNode) {
          sibling = parent[siblingName];
          if (sibling) {
            return sibling;
          }
        }
      }
    }
  }

  function findPreviousNode(node, startName, siblingName, shallow) {
    var sibling, parent, child;

    if (node) {
      sibling = node[siblingName];
      if (rootNode && sibling === rootNode) {
        return;
      }

      if (sibling) {
        if (!shallow) {
          // Walk up the parents to look for siblings
          for (child = sibling[startName]; child; child = child[startName]) {
            if (!child[startName]) {
              return child;
            }
          }
        }

        return sibling;
      }

      parent = node.parentNode;
      if (parent && parent !== rootNode) {
        return parent;
      }
    }
  }

  /**
     * Returns the current node.
     *
     * @return {Node} Current node where the walker is.
     */
  this.current = function () {
    return node;
  };

  /**
     * Walks to the next node in tree.
     *
     * @return {Node} Current node where the walker is after moving to the next node.
     */
  this.next = function (shallow) {
    return (node = findSibling(node, 'firstChild', 'nextSibling', shallow));
  };

  /**
     * Walks to the previous node in tree.
     *
     * @return {Node} Current node where the walker is after moving to the previous node.
     */
  this.prev = function (shallow) {
    return (node = findSibling(node, 'lastChild', 'previousSibling', shallow));
  };

  this.prev2 = function (shallow) {
    node = findPreviousNode(node, 'lastChild', 'previousSibling', shallow);
    return node;
  };
};