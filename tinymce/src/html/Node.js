/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */


(function (tinymce) {
  var whiteSpaceRegExp = /^[ \t\r\n]*$/,
    typeLookup = {
      '#text': 3,
      '#comment': 8,
      '#cdata': 4,
      '#pi': 7,
      '#doctype': 10,
      '#document-fragment': 11
    };

  function isNonEmptyElement(node) {
    var isNamedAnchor = node.name === 'a' && !node.attr('href') && (node.attr('id'));

    return (node.attr('name') || (node.attr('id') && !node.firstChild) || node.attr('data-mce-bookmark') || isNamedAnchor);
  }

  function isWhitespaceText(text) {
    // Check if the text is only whitespace
    return whiteSpaceRegExp.test(text);
  }

  function isEmptyTextNode(node) {
    var text = node.value || '';

    // Non whitespace content
    if (!isWhitespaceText(text)) {
      return false;
    }

    // Parent is not a span and only spaces or is a span but has styles
    var parentNode = node.parent;

    if (parentNode && (parentNode.name !== 'span' || parentNode.attr('style')) && /^[ ]+$/.test(text)) {
      return false;
    }

    return true;
  }

  // Walks the tree left/right
  function walk(node, root_node, prev) {
    var sibling, parent, startName = prev ? 'lastChild' : 'firstChild',
      siblingName = prev ? 'prev' : 'next';

    // Walk into nodes if it has a start
    if (node[startName]) {
      return node[startName];
    }

    // Return the sibling if it has one
    if (node !== root_node) {
      sibling = node[siblingName];

      if (sibling) {
        return sibling;
      }

      // Walk up the parents to look for siblings
      for (parent = node.parent; parent && parent !== root_node; parent = parent.parent) {
        sibling = parent[siblingName];

        if (sibling) {
          return sibling;
        }
      }
    }
  }

  /**
   * This class is a minimalistic implementation of a DOM like node used by the DomParser class.
   *
   * @example
   * var node = new tinymce.html.Node('strong', 1);
   * someRoot.append(node);
   *
   * @class tinymce.html.Node
   * @version 3.4
   */

  /**
   * Constructs a new Node instance.
   *
   * @constructor
   * @method Node
   * @param {String} name Name of the node type.
   * @param {Number} type Numeric type representing the node.
   */
  function Node(name, type) {
    this.name = name;
    this.type = type;

    if (type === 1) {
      this.attributes = [];
      this.attributes.map = {};
    }
  }

  tinymce.extend(Node.prototype, {
    /**
     * Replaces the current node with the specified one.
     *
     * @example
     * someNode.replace(someNewNode);
     *
     * @method replace
     * @param {tinymce.html.Node} node Node to replace the current node with.
     * @return {tinymce.html.Node} The old node that got replaced.
     */
    replace: function (node) {
      var self = this;

      if (node.parent) {
        node.remove();
      }

      self.insert(node, self);
      self.remove();

      return self;
    },

    /**
     * Gets/sets or removes an attribute by name.
     *
     * @example
     * someNode.attr("name", "value"); // Sets an attribute
     * console.log(someNode.attr("name")); // Gets an attribute
     * someNode.attr("name", null); // Removes an attribute
     *
     * @method attr
     * @param {String} name Attribute name to set or get.
     * @param {String} value Optional value to set.
     * @return {String/tinymce.html.Node} String or undefined on a get operation or the current node on a set operation.
     */
    attr: function (name, value) {
      var self = this,
        attrs, i, undef;

      if (typeof name !== "string") {
        for (i in name) {
          self.attr(i, name[i]);
        }

        return self;
      }

      if ((attrs = self.attributes)) {
        if (value !== undef) {
          // Remove attribute
          if (value === null) {
            if (name in attrs.map) {
              delete attrs.map[name];

              i = attrs.length;
              while (i--) {
                if (attrs[i].name === name) {
                  attrs = attrs.splice(i, 1);
                  return self;
                }
              }
            }

            return self;
          }

          // Set attribute
          if (name in attrs.map) {
            // stringify value
            value = '' + value;

            // Set attribute
            i = attrs.length;
            while (i--) {
              if (attrs[i].name === name) {
                attrs[i].value = value;
                break;
              }
            }
          } else {
            attrs.push({
              name: name,
              value: value
            });
          }

          attrs.map[name] = value;

          return self;
        } else {
          return attrs.map[name];
        }
      }
    },

    addClass: function (str) {
      var self = this;

      var cls = self.attr('class') || '';

      if (!str) {
        return cls;
      }

      if (str.indexOf(' ') !== -1) {

        tinymce.each(str.split(' '), function (val) {
          self.addClass(val);
        });

      } else {
        if (self.hasClass(str)) {
          return cls;
        }

        cls = tinymce.trim(cls + ' ' + str);

        self.attr('class', cls);

        return cls;
      }
    },

    hasClass: function (str) {
      var cls = this.attr('class') || '';
      return (' ' + cls + ' ').indexOf(' ' + str + ' ') !== -1;
    },

    removeClass: function (str) {
      var self = this, cls = self.attr('class') || '';

      if (!str) {
        return cls;
      }

      if (str.indexOf(' ') !== -1) {
        tinymce.each(str.split(' '), function (val) {
          self.removeClass(val);
        });
      } else {
        if (self.hasClass(str)) {
          cls = tinymce.trim((" " + cls + " ").replace(' ' + str + ' ', ' '));

          // remove the attribute if the value is empty
          if (!cls) {
            self.attr('class', null);
          } else {
            self.attr('class', cls);
          }
        }

        return cls;
      }
    },

    /**
     * Does a shallow clones the node into a new node. It will also exclude id attributes since
     * there should only be one id per document.
     *
     * @example
     * var clonedNode = node.clone();
     *
     * @method clone
     * @return {tinymce.html.Node} New copy of the original node.
     */
    clone: function (deep) {
      var self = this,
        clone = new Node(self.name, self.type),
        i, l, selfAttrs, selfAttr, cloneAttrs, node, next;

      // Clone element attributes
      if ((selfAttrs = self.attributes)) {
        cloneAttrs = [];
        cloneAttrs.map = {};

        for (i = 0, l = selfAttrs.length; i < l; i++) {
          selfAttr = selfAttrs[i];

          // Clone everything except id
          if (selfAttr.name !== 'id') {
            cloneAttrs[cloneAttrs.length] = {
              name: selfAttr.name,
              value: selfAttr.value
            };
            cloneAttrs.map[selfAttr.name] = selfAttr.value;
          }
        }

        clone.attributes = cloneAttrs;
      }

      clone.value = self.value;
      clone.shortEnded = self.shortEnded;

      if (deep) {
        // append all the children
        for (node = self.firstChild; node;) {
          next = node.next;
          clone.append(node);
          node = next;
        }
      }

      return clone;
    },

    /**
     * Wraps the node in in another node.
     *
     * @example
     * node.wrap(wrapperNode);
     *
     * @method wrap
     */
    wrap: function (wrapper) {
      var self = this;

      self.parent.insert(wrapper, self);
      wrapper.append(self);

      return self;
    },

    /**
     * Unwraps the node in other words it removes the node but keeps the children.
     *
     * @example
     * node.unwrap();
     *
     * @method unwrap
     */
    unwrap: function () {
      var self = this,
        node, next;

      for (node = self.firstChild; node;) {
        next = node.next;
        self.insert(node, self, true);
        node = next;
      }

      self.remove();
    },

    /**
     * Removes the node from it's parent.
     *
     * @example
     * node.remove();
     *
     * @method remove
     * @return {tinymce.html.Node} Current node that got removed.
     */
    remove: function () {
      var self = this,
        parent = self.parent,
        next = self.next,
        prev = self.prev;

      if (parent) {
        if (parent.firstChild === self) {
          parent.firstChild = next;

          if (next) {
            next.prev = null;
          }
        } else {
          prev.next = next;
        }

        if (parent.lastChild === self) {
          parent.lastChild = prev;

          if (prev) {
            prev.next = null;
          }
        } else {
          next.prev = prev;
        }

        self.parent = self.next = self.prev = null;
      }

      return self;
    },

    /**
     * Appends a new node as a child of the current node.
     *
     * @example
     * node.append(someNode);
     *
     * @method append
     * @param {tinymce.html.Node} node Node to append as a child of the current one.
     * @return {tinymce.html.Node} The node that got appended.
     */
    append: function (node) {
      var self = this,
        last;

      if (node.parent) {
        node.remove();
      }

      last = self.lastChild;
      if (last) {
        last.next = node;
        node.prev = last;
        self.lastChild = node;
      } else {
        self.lastChild = self.firstChild = node;
      }

      node.parent = self;

      return node;
    },

    /**
     * Inserts a node at a specific position as a child of the current node.
     *
     * @example
     * parentNode.insert(newChildNode, oldChildNode);
     *
     * @method insert
     * @param {tinymce.html.Node} node Node to insert as a child of the current node.
     * @param {tinymce.html.Node} ref_node Reference node to set node before/after.
     * @param {Boolean} before Optional state to insert the node before the reference node.
     * @return {tinymce.html.Node} The node that got inserted.
     */
    insert: function (node, ref_node, before) {
      var parent;

      if (node.parent) {
        node.remove();
      }

      parent = ref_node.parent || this;

      if (before) {
        if (ref_node === parent.firstChild) {
          parent.firstChild = node;
        } else {
          ref_node.prev.next = node;
        }

        node.prev = ref_node.prev;
        node.next = ref_node;
        ref_node.prev = node;
      } else {
        if (ref_node === parent.lastChild) {
          parent.lastChild = node;
        } else {
          ref_node.next.prev = node;
        }

        node.next = ref_node.next;
        node.prev = ref_node;
        ref_node.next = node;
      }

      node.parent = parent;

      return node;
    },

    /**
     * Get all children by name.
     *
     * @method getAll
     * @param {String} name Name of the child nodes to collect.
     * @return {Array} Array with child nodes matchin the specified name.
     */
    getAll: function (name) {
      var self = this,
        node, collection = [];

      for (node = self.firstChild; node; node = walk(node, self)) {
        if (node.name === name) {
          collection.push(node);
        }
      }

      return collection;
    },

    /**
     * Get all children of this node.
     *
     * @method children
     * @return {Array} Array containing child nodes.
   */
    children: function () {
      var self = this,
        node, collection = [];

      for (node = self.firstChild; node; node = node.next) {
        collection.push(node);
      }

      return collection;
    },

    /**
     * Removes all children of the current node.
     *
     * @method empty
     * @return {tinymce.html.Node} The current node that got cleared.
     */
    empty: function () {
      var self = this,
        nodes, i, node;

      // Remove all children
      if (self.firstChild) {
        nodes = [];

        // Collect the children
        for (node = self.firstChild; node; node = walk(node, self)) {
          nodes.push(node);
        }

        // Remove the children
        i = nodes.length;
        while (i--) {
          node = nodes[i];
          node.parent = node.firstChild = node.lastChild = node.next = node.prev = null;
        }
      }

      self.firstChild = self.lastChild = null;

      return self;
    },

    /**
     * Returns true/false if the node is to be considered empty or not.
     *
     * @example
     * node.isEmpty({img : true});
     * @method isEmpty
     * @param {Object} elements Name/value object with elements that are automatically treated as non empty elements.
     * @return {Boolean} true/false if the node is empty or not.
     */
    isEmpty: function (elements, whitespace) {
      var self = this,
        node = self.firstChild,
        i, name;

      if (isNonEmptyElement(self)) {
        return false;
      }

      function isValidAttribute(name) {
        // allow for anchors and html templating
        if (name == "name" || name == "id" || name == "class") {
          return true;
        }

        // allow some system and generic data- attributes
        if (name.indexOf('-') != -1) {
          if (name == 'data-mce-bookmark') {
            return true;
          }

          if (name.indexOf('data-mce-') != -1) {
            return false;
          }

          return true;
        }

        return false;
      }

      if (node) {
        do {
          if (node.type === 1) {
            // Ignore bogus elements
            if (node.attr('data-mce-bogus')) {
              continue;
            }

            // Keep empty elements like <img />
            if (elements[node.name]) {
              return false;
            }

            if (isNonEmptyElement(node)) {
              return false;
            }

            // Keep elements with data attributes or name attribute like <a name="1"></a>
            i = node.attributes.length;

            while (i--) {
              name = node.attributes[i].name;

              if (isValidAttribute(name)) {
                return false;
              }
            }

            // Keep elements with attributes
            /*if (node.attributes.length) {
              return false;
            }*/
          }

          // Keep comments
          if (node.type === 8) {
            return false;
          }

          // Keep non whitespace text nodes
          if (node.type === 3 && !isEmptyTextNode(node)) {
            return false;
          }

          // Keep whitespace preserve elements
          if (whitespace) {
            if (node.type === 3 && node.parent && whitespace[node.parent.name] && isWhitespaceText(node.value || '')) {
              return false;
            }
          }
          
        } while ((node = walk(node, self)));
      }

      return true;
    },

    /**
     * Walks to the next or previous node and returns that node or null if it wasn't found.
     *
     * @method walk
     * @param {Boolean} prev Optional previous node state defaults to false.
     * @return {tinymce.html.Node} Node that is next to or previous of the current node.
     */
    walk: function (prev) {
      return walk(this, null, prev);
    }
  });

  tinymce.extend(Node, {
    /**
     * Creates a node of a specific type.
     *
     * @static
     * @method create
     * @param {String} name Name of the node type to create for example "b" or "#text".
     * @param {Object} attrs Name/value collection of attributes that will be applied to elements.
     */
    create: function (name, attrs) {
      var node, attrName;

      // Create node
      node = new Node(name, typeLookup[name] || 1);

      // Add attributes if needed
      if (attrs) {
        for (attrName in attrs) {
          node.attr(attrName, attrs[attrName]);
        }

        return node;
      }
    }
  });

  tinymce.html.Node = Node;
})(tinymce);