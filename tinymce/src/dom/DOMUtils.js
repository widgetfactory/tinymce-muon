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
  // Shorten names
  var each = tinymce.each,
    is = tinymce.is,
    isWebKit = tinymce.isWebKit,
    isIE = tinymce.isIE,
    Entities = tinymce.html.Entities,
    simpleSelectorRe = /^([a-z0-9],?)+$/i,
    whiteSpaceRegExp = /^[ \t\r\n]*$/;

  function stringToArray(value) {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      return value.split(' ');
    }

    return [];
  }

  /**
   * Utility class for various DOM manipulation and retrival functions.
   *
   * @class tinymce.dom.DOMUtils
   * @example
   * // Add a class to an element by id in the page
   * tinymce.DOM.addClass('someid', 'someclass');
   *
   * // Add a class to an element by id inside the editor
   * tinymce.activeEditor.dom.addClass('someid', 'someclass');
   */
  /**
     * Constructs a new DOMUtils instance. Consult the Wiki for more details on settings etc for this class.
     *
     * @constructor
     * @method DOMUtils
     * @param {Document} d Document reference to bind the utility class to.
     * @param {settings} s Optional settings collection.
     */
  tinymce.dom.DOMUtils = function (d, s) {
    var self = this,
      blockElementsMap;

    self.doc = d;
    self.win = window;
    self.files = {};
    self.cssFlicker = false;
    self.counter = 0;
    self.stdMode = !tinymce.isIE || d.documentMode >= 8;
    self.boxModel = !tinymce.isIE || d.compatMode == "CSS1Compat" || self.stdMode;
    self.hasOuterHTML = "outerHTML" in d.createElement("a");

    self.settings = s = tinymce.extend({
      keep_values: false,
      hex_colors: 1
    }, s);

    self.schema = s.schema;
    self.styles = new tinymce.html.Styles({
      url_converter: s.url_converter,
      url_converter_scope: s.url_converter_scope
    }, s.schema);

    self.events = s.ownEvents ? new tinymce.dom.EventUtils(s.proxy) : tinymce.dom.Event;
    tinymce.addUnload(self.destroy, this);
    blockElementsMap = s.schema ? s.schema.getBlockElements() : {};

    /**
     * Returns true/false if the specified element is a block element or not.
     *
     * @method isBlock
     * @param {Node/String} node Element/Node to check.
     * @return {Boolean} True/False state if the node is a block element or not.
     */
    self.isBlock = function (node) {
      // Fix for #5446
      if (!node) {
        return false;
      }

      // This function is called in module pattern style since it might be executed with the wrong this scope
      var type = node.nodeType;

      // If it's a node then check the type and use the nodeName
      if (type) {
        return !!(type === 1 && blockElementsMap[node.nodeName]);
      }

      return !!blockElementsMap[node];
    };
  };

  tinymce.dom.DOMUtils.prototype = {

    doc: null,
    root: null,
    files: null,
    pixelStyles: /^(top|left|bottom|right|width|height|maxWidth|maxHeight|minWidth|minHeight|borderWidth)$/,
    props: {
      "for": "htmlFor",
      "class": "className",
      className: "className",
      checked: "checked",
      disabled: "disabled",
      maxlength: "maxLength",
      readonly: "readOnly",
      selected: "selected",
      value: "value",
      id: "id",
      name: "name",
      type: "type"
    },

    clone: function (node, deep) {
      var self = this,
        clone, doc;

      // TODO: Add feature detection here in the future
      if (!isIE || tinymce.isIE11 || node.nodeType !== 1 || deep) {
        return node.cloneNode(deep);
      }

      doc = self.doc;

      // Make a HTML5 safe shallow copy
      if (!deep) {
        clone = doc.createElement(node.nodeName);

        // Copy attribs
        each(self.getAttribs(node), function (attr) {
          self.setAttrib(clone, attr.nodeName, self.getAttrib(node, attr.nodeName));
        });

        return clone;
      }
      /*
            // Setup HTML5 patched document fragment
            if (!self.frag) {
              self.frag = doc.createDocumentFragment();
              self.fixDoc(self.frag);
            }

            // Make a deep copy by adding it to the document fragment then removing it this removed the :section
            clone = doc.createElement('div');
            self.frag.appendChild(clone);
            clone.innerHTML = node.outerHTML;
            self.frag.removeChild(clone);
      */
      return clone.firstChild;
    },

    /**
     * Returns the root node of the document this is normally the body but might be a DIV. Parents like getParent will not
     * go above the point of this root node.
     *
     * @method getRoot
     * @return {Element} Root element for the utility class.
     */
    getRoot: function () {
      var self = this,
        s = self.settings;

      return (s && self.get(s.root_element)) || self.doc.body;
    },

    /**
     * Returns the viewport of the window.
     *
     * @method getViewPort
     * @param {Window} w Optional window to get viewport of.
     * @return {Object} Viewport object with fields x, y, w and h.
     */
    getViewPort: function (w) {
      var d, b;

      w = !w ? this.win : w;
      d = w.document;
      b = this.boxModel ? d.documentElement : d.body;

      // Returns viewport size excluding scrollbars
      return {
        x: w.pageXOffset || b.scrollLeft,
        y: w.pageYOffset || b.scrollTop,
        w: w.innerWidth || b.clientWidth,
        h: w.innerHeight || b.clientHeight
      };
    },

    /**
     * Returns the rectangle for a specific element.
     *
     * @method getRect
     * @param {Element/String} e Element object or element ID to get rectange from.
     * @return {object} Rectange for specified element object with x, y, w, h fields.
     */
    getRect: function (e) {
      var p, self = this,
        sr;

      e = self.get(e);
      p = self.getPos(e);
      sr = self.getSize(e);

      return {
        x: p.x,
        y: p.y,
        w: sr.w,
        h: sr.h
      };
    },

    /**
     * Returns the size dimensions of the specified element.
     *
     * @method getSize
     * @param {Element/String} e Element object or element ID to get rectange from.
     * @return {object} Rectange for specified element object with w, h fields.
     */
    getSize: function (e) {
      var self = this,
        w, h;

      e = self.get(e);
      w = self.getStyle(e, 'width');
      h = self.getStyle(e, 'height');

      // Non pixel value, then force offset/clientWidth
      if (w.indexOf('px') === -1) {
        w = 0;
      }

      // Non pixel value, then force offset/clientWidth
      if (h.indexOf('px') === -1) {
        h = 0;
      }

      return {
        w: parseInt(w, 10) || e.offsetWidth || e.clientWidth,
        h: parseInt(h, 10) || e.offsetHeight || e.clientHeight
      };
    },

    /**
     * Returns a node by the specified selector function. This function will
     * loop through all parent nodes and call the specified function for each node.
     * If the function then returns true indicating that it has found what it was looking for, the loop execution will then end
     * and the node it found will be returned.
     *
     * @method getParent
     * @param {Node/String} n DOM node to search parents on or ID string.
     * @param {function} f Selection function to execute on each node or CSS pattern.
     * @param {Node} r Optional root element, never go below this point.
     * @return {Node} DOM Node or null if it wasn't found.
     */
    getParent: function (n, f, r) {
      return this.getParents(n, f, r, false);
    },

    /**
     * Returns a node list of all parents matching the specified selector function or pattern.
     * If the function then returns true indicating that it has found what it was looking for and that node will be collected.
     *
     * @method getParents
     * @param {Node/String} n DOM node to search parents on or ID string.
     * @param {function} f Selection function to execute on each node or CSS pattern.
     * @param {Node} r Optional root element, never go below this point.
     * @return {Array} Array of nodes or null if it wasn't found.
     */
    getParents: function (n, f, r, c) {
      var self = this,
        na, se = self.settings,
        o = [];

      n = self.get(n);
      c = c === undefined;

      if (se.strict_root) {
        r = r || self.getRoot();
      }

      // Wrap node name as func
      if (is(f, 'string')) {
        na = f;

        if (f === '*') {
          f = function (n) {
            return n.nodeType == 1;
          };
        } else {
          f = function (n) {
            return self.is(n, na);
          };
        }
      }

      while (n) {
        if (n == r || !n.nodeType || n.nodeType === 9) {
          break;
        }

        if (!f || f(n)) {
          if (c) {
            o.push(n);
          } else {
            return n;
          }
        }

        n = n.parentNode;
      }

      return c ? o : null;
    },

    /**
     * Returns the specified element by ID or the input element if it isn't a string.
     *
     * @method get
     * @param {String/Element} n Element id to look for or element to just pass though.
     * @return {Element} Element matching the specified id or null if it wasn't found.
     */
    get: function (e) {
      var n;

      if (e && this.doc && typeof (e) == 'string') {
        n = e;
        e = this.doc.getElementById(e);

        // IE and Opera returns meta elements when they match the specified input ID, but getElementsByName seems to do the trick
        if (e && e.id !== n) {
          return this.doc.getElementsByName(n)[1];
        }
      }

      return e;
    },

    /**
     * Returns the next node that matches selector or function
     *
     * @method getNext
     * @param {Node} node Node to find siblings from.
     * @param {String/function} selector Selector CSS expression or function.
     * @return {Node} Next node item matching the selector or null if it wasn't found.
     */
    getNext: function (node, selector) {
      return this._findSib(node, selector, 'nextSibling');
    },

    /**
     * Returns the previous node that matches selector or function
     *
     * @method getPrev
     * @param {Node} node Node to find siblings from.
     * @param {String/function} selector Selector CSS expression or function.
     * @return {Node} Previous node item matching the selector or null if it wasn't found.
     */
    getPrev: function (node, selector) {
      return this._findSib(node, selector, 'previousSibling');
    },

    // #ifndef jquery

    /**
     * Selects specific elements by a CSS level 3 pattern. For example "div#a1 p.test".
     * This function is optimized for the most common patterns needed in TinyMCE but it also performes good enough
     * on more complex patterns.
     *
     * @method select
     * @param {String} selector CSS level 1 pattern to select/find elements by.
     * @param {Object} scope Optional root element/scope element to search in.
     * @return {Array} Array with all matched elements.
     * @example
     * // Adds a class to all paragraphs in the currently active editor
     * tinymce.activeEditor.dom.addClass(tinymce.activeEditor.dom.select('p'), 'someclass');
     *
     * // Adds a class to all spans that has the test class in the currently active editor
     * tinymce.activeEditor.dom.addClass(tinymce.activeEditor.dom.select('span.test'), 'someclass');
     */
    select: function (selector, scope) {
      var self = this;

      /*eslint new-cap:0 */
      return tinymce.dom.Sizzle(selector, self.get(scope) || self.get(self.settings.root_element) || self.doc, []);
    },

    unique: function (arr) {
      return tinymce.dom.Sizzle.uniqueSort(arr);
    },

    /**
     * Returns true/false if the specified element matches the specified css pattern.
     *
     * @method is
     * @param {Node/NodeList} elm DOM node to match or an array of nodes to match.
     * @param {String} selector CSS pattern to match the element agains.
     */
    is: function (elm, selector) {
      var i;

      // If it isn't an array then try to do some simple selectors instead of Sizzle for to boost performance
      if (elm.length === undefined) {
        // Simple all selector
        if (selector === '*') {
          return elm.nodeType == 1;
        }

        // Simple selector just elements
        if (simpleSelectorRe.test(selector)) {
          selector = selector.toLowerCase().split(/,/);
          elm = elm.nodeName.toLowerCase();

          for (i = selector.length - 1; i >= 0; i--) {
            if (selector[i] == elm) {
              return true;
            }
          }

          return false;
        }
      }

      // Is non element
      if (elm.nodeType && elm.nodeType != 1) {
        return false;
      }

      var elms = elm.nodeType ? [elm] : elm;

      /*eslint new-cap:0 */
      return tinymce.dom.Sizzle(selector, elms[0].ownerDocument || elms[0], null, elms).length > 0;
    },

    closest: function (n, selector) {
      var self = this,
        result = [];

      while (n) {
        if (typeof selector === 'string' && self.is(n, selector)) {
          result.push(n);
          break;
        } else if (n === selector) {
          result.push(n);
          break;
        }

        n = n.parentNode;
      }

      return result;
    },

    contains: function (context, elm) {
      return tinymce.dom.Sizzle.contains(context, elm);
    },

    // #endif

    /**
     * Adds the specified element to another element or elements.
     *
     * @method add
     * @param {String/Element/Array} Element id string, DOM node element or array of id's or elements to add to.
     * @param {String/Element} n Name of new element to add or existing element to add.
     * @param {Object} a Optional object collection with arguments to add to the new element(s).
     * @param {String} h Optional inner HTML contents to add for each element.
     * @param {Boolean} c Optional internal state to indicate if it should create or add.
     * @return {Element/Array} Element that got created or array with elements if multiple elements where passed.
     * @example
     * // Adds a new paragraph to the end of the active editor
     * tinymce.activeEditor.dom.add(tinymce.activeEditor.getBody(), 'p', {title : 'my title'}, 'Some content');
     */
    add: function (p, n, a, h, c) {
      var self = this;

      return this.run(p, function (p) {
        var e;

        e = is(n, 'string') ? self.doc.createElement(n) : n;
        self.setAttribs(e, a);

        if (h) {
          if (h.nodeType) {
            e.appendChild(h);
          } else {
            self.setHTML(e, h);
          }
        }

        return !c ? p.appendChild(e) : e;
      });
    },

    /**
     * Creates a new element.
     *
     * @method create
     * @param {String} n Name of new element.
     * @param {Object} a Optional object name/value collection with element attributes.
     * @param {String} h Optional HTML string to set as inner HTML of the element.
     * @return {Element} HTML DOM node element that got created.
     * @example
     * // Adds an element where the caret/selection is in the active editor
     * var el = tinymce.activeEditor.dom.create('div', {id : 'test', 'class' : 'myclass'}, 'some content');
     * tinymce.activeEditor.selection.setNode(el);
     */
    create: function (n, a, h) {
      return this.add(this.doc.createElement(n), n, a, h, 1);
    },

    wrap: function (elements, wrapper, all) {
      var lastParent, newWrapper;

      wrapper = this.get(wrapper);

      return this.run(elements, function (elm) {
        if (!all || lastParent != elm.parentNode) {
          lastParent = elm.parentNode;
          newWrapper = wrapper.cloneNode(false);
          elm.parentNode.insertBefore(newWrapper, elm);
          newWrapper.appendChild(elm);
        } else {
          newWrapper.appendChild(elm);
        }
      });
    },

    /**
     * Create HTML string for element. The element will be closed unless an empty inner HTML string is passed.
     *
     * @method createHTML
     * @param {String} n Name of new element.
     * @param {Object} a Optional object name/value collection with element attributes.
     * @param {String} h Optional HTML string to set as inner HTML of the element.
     * @return {String} String with new HTML element like for example: <a href="#">test</a>.
     * @example
     * // Creates a html chunk and inserts it at the current selection/caret location
     * tinymce.activeEditor.selection.setContent(tinymce.activeEditor.dom.createHTML('a', {href : 'test.html'}, 'some line'));
     */
    createHTML: function (n, a, h) {
      var o = '',
        self = this,
        k;

      o += '<' + n;

      for (k in a) {
        // eslint-disable-next-line no-prototype-builtins
        if (a.hasOwnProperty(k) && a[k] != '') {
          o += ' ' + k + '="' + self.encode(a[k]) + '"';
        }
      }

      // A call to tinymce.is doesn't work for some odd reason on IE9 possible bug inside their JS runtime
      if (typeof (h) != "undefined") {
        return o + '>' + h + '</' + n + '>';
      }

      return o + ' />';
    },

    /**
     * Creates a document fragment out of the specified HTML string.
     *
     * @method createFragment
     * @param {String} html Html string to create fragment from.
     * @return {DocumentFragment} Document fragment node.
     */
    createFragment: function (html) {
      var frag, node, doc = this.doc,
        container;

      container = doc.createElement("div");
      frag = doc.createDocumentFragment();

      // Append the container to the fragment so as to remove it from
      // the current document context
      frag.appendChild(container);

      if (html) {
        container.innerHTML = html;
      }

      while ((node = container.firstChild)) {
        frag.appendChild(node);
      }

      // Remove the container now that all the children have been transferred
      frag.removeChild(container);

      return frag;
    },

    /**
     * Removes/deletes the specified element(s) from the DOM.
     *
     * @method remove
     * @param {String/Element/Array} node ID of element or DOM element object or array containing multiple elements/ids.
     * @param {Boolean} keep_children Optional state to keep children or not. If set to true all children will be placed at the location of the removed element.
     * @return {Element/Array} HTML DOM element that got removed or array of elements depending on input.
     * @example
     * // Removes all paragraphs in the active editor
     * tinymce.activeEditor.dom.remove(tinymce.activeEditor.dom.select('p'));
     *
     * // Removes a element by id in the document
     * tinymce.DOM.remove('mydiv');
     */
    remove: function (node, keep_children) {
      return this.run(node, function (node) {
        var child, parent = node.parentNode;

        if (!parent) {
          return null;
        }

        if (keep_children) {
          while ((child = node.firstChild)) {
            // IE 8 will crash if you don't remove completely empty text nodes
            if (!tinymce.isIE || child.nodeType !== 3 || child.nodeValue) {
              parent.insertBefore(child, node);
            } else {
              node.removeChild(child);
            }
          }
        }

        return parent.removeChild(node);
      });
    },

    /**
     * Empties all elements in set.
     *
     * @param {String/Element/Array} n HTML element/Element ID or Array of elements/ids to empty.
     * @method empty
     * @return {Boolean}
     */
    empty: function (node) {
      return this.run(node, function (node) {
        var n, i = node.length;

        while (i--) {
          n = node[i];
          while (n.firstChild) {
            n.removeChild(n.firstChild);
          }
        }

        return true;
      });
    },

    /**
     * Sets the CSS style value on a HTML element. The name can be a camelcase string
     * or the CSS style name like background-color.
     *
     * @method setStyle
     * @param {String/Element/Array} n HTML element/Element ID or Array of elements/ids to set CSS style value on.
     * @param {String} na Name of the style value to set.
     * @param {String} v Value to set on the style.
     * @example
     * // Sets a style value on all paragraphs in the currently active editor
     * tinymce.activeEditor.dom.setStyle(tinymce.activeEditor.dom.select('p'), 'background-color', 'red');
     *
     * // Sets a style value to an element by id in the current document
     * tinymce.DOM.setStyle('mydiv', 'background-color', 'red');
     */
    setStyle: function (n, na, v) {
      var self = this;

      return self.run(n, function (e) {
        var s;

        s = e.style;

        // Camelcase it, if needed
        na = na.replace(/-(\D)/g, function (a, b) {
          return b.toUpperCase();
        });

        // Default px suffix on these
        if (self.pixelStyles.test(na) && (tinymce.is(v, 'number') || /^[\-0-9\.]+$/.test(v))) {
          v += 'px';
        }

        if (na == 'float') {
          na = tinymce.isIE && tinymce.isIE < 12 ? 'styleFloat' : 'cssFloat';
        }

        s[na] = v || '';

        // Force update of the style data
        if (self.settings.update_styles) {
          v = self.serializeStyle(self.parseStyle(e.style.cssText), e.nodeName);
          self.setAttrib(e, 'data-mce-style', v);
        }
      });
    },

    /**
     * Returns the current style or runtime/computed value of a element.
     *
     * @method getStyle
     * @param {String/Element} n HTML element or element id string to get style from.
     * @param {String} na Style name to return.
     * @param {Boolean} c Computed style.
     * @return {String} Current style or computed style value of a element.
     */
    getStyle: function (n, na, c) {
      n = this.get(n);

      if (!n) {
        return;
      }

      // Gecko
      if (this.doc.defaultView && c) {
        // Remove camelcase
        na = na.replace(/[A-Z]/g, function (a) {
          return '-' + a;
        });

        try {
          return this.doc.defaultView.getComputedStyle(n, null).getPropertyValue(na);
        } catch (ex) {
          // Old safari might fail
          return null;
        }
      }

      // Camelcase it, if needed
      na = na.replace(/-(\D)/g, function (a, b) {
        return b.toUpperCase();
      });

      if (na == 'float') {
        na = 'cssFloat';
      }

      // IE & Opera
      if (n.currentStyle && c) {
        return n.currentStyle[na];
      }

      return n.style ? n.style[na] : undefined;
    },

    /**
     * Sets multiple styles on the specified element(s).
     *
     * @method setStyles
     * @param {Element/String/Array} e DOM element, element id string or array of elements/ids to set styles on.
     * @param {Object} o Name/Value collection of style items to add to the element(s).
     * @example
     * // Sets styles on all paragraphs in the currently active editor
     * tinymce.activeEditor.dom.setStyles(tinymce.activeEditor.dom.select('p'), {'background-color' : 'red', 'color' : 'green'});
     *
     * // Sets styles to an element by id in the current document
     * tinymce.DOM.setStyles('mydiv', {'background-color' : 'red', 'color' : 'green'});
     */
    setStyles: function (e, o) {
      var self = this,
        s = self.settings,
        ol, v;

      ol = s.update_styles;
      s.update_styles = 0;

      this.run(e, function (e) {
        each(o, function (v, n) {
          self.setStyle(e, n, v);
        });

        if (ol) {
          // Force update of the style data
          v = self.serializeStyle(self.parseStyle(e.style.cssText), e.nodeName);
          self.setAttrib(e, 'data-mce-style', v);
        }
      });

      s.update_styles = ol;
    },

    /**
     * Removes all attributes from an element or elements.
     *
     * @param {Element/String/Array} e DOM element, element id string or array of elements/ids to remove attributes from.
     */
    removeAllAttribs: function (e) {
      return this.run(e, function (e) {
        var i, attrs = e.attributes;
        for (i = attrs.length - 1; i >= 0; i--) {
          e.removeAttributeNode(attrs.item(i));
        }
      });
    },

    removeAttrib: function (e, n) {
      var self = this;

      // Whats the point
      if (!e || !n) {
        return;
      }

      // Strict XML mode
      if (self.settings.strict) {
        n = n.toLowerCase();
      }

      return this.run(e, function (e) {
        e.removeAttribute(n, 2);
      });
    },

    /**
     * Sets the specified attributes value of a element or elements.
     *
     * @method setAttrib
     * @param {Element/String/Array} e DOM element, element id string or array of elements/ids to set attribute on.
     * @param {String} n Name of attribute to set.
     * @param {String} v Value to set on the attribute of this value is falsy like null 0 or '' it will remove the attribute instead.
     * @example
     * // Sets an attribute to all paragraphs in the active editor
     * tinymce.activeEditor.dom.setAttrib(tinymce.activeEditor.dom.select('p'), 'class', 'myclass');
     *
     * // Sets an attribute to a specific element in the current page
     * tinymce.dom.setAttrib('mydiv', 'class', 'myclass');
     */
    setAttrib: function (e, n, v) {
      var self = this;

      // Whats the point
      if (!e || !n) {
        return;
      }

      // Strict XML mode
      if (self.settings.strict) {
        n = n.toLowerCase();
      }

      return this.run(e, function (e) {
        var s = self.settings;
        var originalValue = e.getAttribute(n);
        if (v !== null) {
          switch (n) {
            case "style":
              if (!is(v, 'string')) {
                each(v, function (v, n) {
                  self.setStyle(e, n, v);
                });

                return;
              }

              // No mce_style for elements with these since they might get resized by the user
              if (s.keep_values) {
                if (v && !self._isRes(v)) {
                  e.setAttribute('data-mce-style', v, 2);
                } else {
                  e.removeAttribute('data-mce-style', 2);
                }
              }

              e.style.cssText = v;
              break;

            case "class":
              e.className = v || ''; // Fix IE null bug
              break;

            case "src":
            case "href":
              if (s.keep_values) {
                if (s.url_converter) {
                  v = s.url_converter.call(s.url_converter_scope || self, v, n, e);
                }

                self.setAttrib(e, 'data-mce-' + n, v, 2);
              }

              break;

            case "shape":
              e.setAttribute('data-mce-style', v);
              break;
          }
        }
        if (is(v) && v !== null && v.length !== 0) {
          e.setAttribute(n, '' + v, 2);
        } else {
          e.removeAttribute(n, 2);
        }

        // fire onChangeAttrib event for attributes that have changed
        if (tinymce.activeEditor && originalValue != v) {
          var ed = tinymce.activeEditor;
          ed.onSetAttrib.dispatch(ed, e, n, v);
        }
      });
    },

    /**
     * Sets the specified attributes of a element or elements.
     *
     * @method setAttribs
     * @param {Element/String/Array} e DOM element, element id string or array of elements/ids to set attributes on.
     * @param {Object} o Name/Value collection of attribute items to add to the element(s).
     * @example
     * // Sets some attributes to all paragraphs in the active editor
     * tinymce.activeEditor.dom.setAttribs(tinymce.activeEditor.dom.select('p'), {'class' : 'myclass', title : 'some title'});
     *
     * // Sets some attributes to a specific element in the current page
     * tinymce.DOM.setAttribs('mydiv', {'class' : 'myclass', title : 'some title'});
     */
    setAttribs: function (e, o) {
      var self = this;

      return this.run(e, function (e) {
        each(o, function (v, n) {
          self.setAttrib(e, n, v);
        });
      });
    },

    /**
     * Returns the specified attribute by name.
     *
     * @method getAttrib
     * @param {String/Element} e Element string id or DOM element to get attribute from.
     * @param {String} n Name of attribute to get.
     * @param {String} dv Optional default value to return if the attribute didn't exist.
     * @return {String} Attribute value string, default value or null if the attribute wasn't found.
     */
    getAttrib: function (e, n, dv) {
      var v, self = this,
        undef;

      e = self.get(e);

      if (!e || e.nodeType !== 1) {
        return dv === undef ? false : dv;
      }

      if (!is(dv)) {
        dv = '';
      }
      // Try the mce variant for these
      if (/^(src|href|style|coords|shape)$/.test(n)) {
        v = e.getAttribute("data-mce-" + n);

        if (v) {
          return v;
        }
      }

      if (isIE && self.props[n]) {
        v = e[self.props[n]];
        v = v && v.nodeValue ? v.nodeValue : v;
      }

      if (!v) {
        v = e.getAttribute(n, 2);
      }

      // Check boolean attribs
      if (/^(checked|compact|declare|defer|disabled|ismap|multiple|nohref|noshade|nowrap|readonly|selected)$/.test(n)) {
        if (e[self.props[n]] === true && v === '') {
          return n;
        }

        return v ? n : '';
      }

      // Inner input elements will override attributes on form elements
      if (e.nodeName === "FORM" && e.getAttributeNode(n)) {
        return e.getAttributeNode(n).nodeValue;
      }

      if (n === 'style') {
        v = v || e.style.cssText;

        if (v) {
          v = self.serializeStyle(self.parseStyle(v), e.nodeName);

          if (self.settings.keep_values && !self._isRes(v)) {
            e.setAttribute('data-mce-style', v);
          }
        }
      }

      // Remove Apple and WebKit stuff
      if (isWebKit && n === "class" && v) {
        v = v.replace(/(apple|webkit)\-[a-z\-]+/gi, '');
      }

      // Handle IE issues
      if (isIE) {
        switch (n) {
          case 'rowspan':
          case 'colspan':
            // IE returns 1 as default value
            if (v === 1) {
              v = '';
            }

            break;

          case 'size':
            // IE returns +0 as default value for size
            if (v === '+0' || v === 20 || v === 0) {
              v = '';
            }

            break;

          case 'width':
          case 'height':
          case 'vspace':
          case 'checked':
          case 'disabled':
          case 'readonly':
            if (v === 0) {
              v = '';
            }

            break;

          case 'hspace':
            // IE returns -1 as default value
            if (v === -1) {
              v = '';
            }

            break;

          case 'maxlength':
          case 'tabindex':
            // IE returns default value
            if (v === 32768 || v === 2147483647 || v === '32768') {
              v = '';
            }

            break;

          case 'multiple':
          case 'compact':
          case 'noshade':
          case 'nowrap':
            if (v === 65535) {
              return n;
            }

            return dv;

          case 'shape':
            v = v.toLowerCase();
            break;

          default:
            // IE has odd anonymous function for event attributes
            if (n.indexOf('on') === 0 && v) {
              v = '' + v;
              v = v.replace(/^function\s+\w+\(\)\s+\{\s+(.*)\s+\}$/, '$1');
            }
        }
      }

      return (v !== undef && v !== null && v !== '') ? '' + v : dv;
    },

    setValue: function (n, value) {
      n = this.get(n);

      if (!n || n.nodeType !== 1) {
        return null;
      }

      if (n.nodeName === "SELECT") {
        each(this.select('option[value="' + value + '"]', n), function (elm) {
          elm.selected = true;
        });
      } else {
        n.value = value;
      }
    },

    getValue: function (n) {
      n = this.get(n);

      if (!n || n.nodeType !== 1) {
        return null;
      }

      if (n.nodeName === "SELECT") {
        if (n.options == null || n.selectedIndex === -1) {
          return "";
        }

        return n.options[n.selectedIndex].value;
      }

      return n.value;
    },

    /**
     * Returns the absolute x, y position of a node. The position will be returned in a object with x, y fields.
     *
     * @method getPos
     * @param {Element/String} n HTML element or element id to get x, y position from.
     * @param {Element} ro Optional root element to stop calculations at.
     * @return {object} Absolute position of the specified element object with x, y fields.
     */
    getPos: function (n, ro) {
      var self = this,
        x = 0,
        y = 0,
        e, d = self.doc,
        r, body = d.body;

      n = self.get(n);
      ro = ro || body;

      if (n) {

        // Use getBoundingClientRect if it exists since it's faster than looping offset nodes
        if (ro === body && n.getBoundingClientRect && self.getStyle(body, 'position') === 'static') {
          n = n.getBoundingClientRect();
          e = self.boxModel ? d.documentElement : d.body;

          // Add scroll offsets from documentElement or body since IE with the wrong box model will use d.body and so do WebKit
          // Also remove the body/documentelement clientTop/clientLeft on IE 6, 7 since they offset the position
          x = n.left + (d.documentElement.scrollLeft || d.body.scrollLeft) - e.clientTop;
          y = n.top + (d.documentElement.scrollTop || d.body.scrollTop) - e.clientLeft;

          return {
            x: x,
            y: y
          };
        }

        r = n;
        while (r && r != ro && r.nodeType) {
          x += r.offsetLeft || 0;
          y += r.offsetTop || 0;
          r = r.offsetParent;
        }

        r = n.parentNode;
        while (r && r != ro && r.nodeType) {
          x -= r.scrollLeft || 0;
          y -= r.scrollTop || 0;
          r = r.parentNode;
        }
      }

      return {
        x: x,
        y: y
      };
    },

    /**
     * Parses the specified style value into an object collection. This parser will also
     * merge and remove any redundant items that browsers might have added. It will also convert non hex
     * colors to hex values. Urls inside the styles will also be converted to absolute/relative based on settings.
     *
     * @method parseStyle
     * @param {String} st Style value to parse for example: border:1px solid red;.
     * @return {Object} Object representation of that style like {border : '1px solid red'}
     */
    parseStyle: function (st) {
      return this.styles.parse(st);
    },

    /**
     * Serializes the specified style object into a string.
     *
     * @method serializeStyle
     * @param {Object} o Object to serialize as string for example: {border : '1px solid red'}
     * @param {String} name Optional element name.
     * @return {String} String representation of the style object for example: border: 1px solid red.
     */
    serializeStyle: function (o, name) {
      return this.styles.serialize(o, name);
    },

    /**
     * Adds a style element at the top of the document with the specified cssText content.
     *
     * @method addStyle
     * @param {String} cssText CSS Text style to add to top of head of document.
     */
    addStyle: function (cssText) {
      var doc = this.doc,
        head, styleElm;

      // Create style element if needed
      styleElm = doc.getElementById('mceDefaultStyles');
      if (!styleElm) {
        styleElm = doc.createElement('style');

        styleElm.id = 'mceDefaultStyles';
        styleElm.type = 'text/css';

        head = doc.getElementsByTagName('head')[0];
        if (head.firstChild) {
          head.insertBefore(styleElm, head.firstChild);
        } else {
          head.appendChild(styleElm);
        }
      }

      // Append style data to old or new style element
      if (styleElm.styleSheet) {
        styleElm.styleSheet.cssText += cssText;
      } else {
        styleElm.appendChild(doc.createTextNode(cssText));
      }
    },

    /**
     * Imports/loads the specified CSS file into the document bound to the class.
     *
     * @method loadCSS
     * @param {String} u URL to CSS file to load.
     * @example
     * // Loads a CSS file dynamically into the current document
     * tinymce.DOM.loadCSS('somepath/some.css');
     *
     * // Loads a CSS file into the currently active editor instance
     * tinymce.activeEditor.dom.loadCSS('somepath/some.css');
     *
     * // Loads a CSS file into an editor instance by id
     * tinymce.get('someid').dom.loadCSS('somepath/some.css');
     *
     * // Loads multiple CSS files into the current document
     * tinymce.DOM.loadCSS('somepath/some.css,somepath/someother.css');
     */
    loadCSS: function (u) {
      var self = this,
        d = self.doc,
        head;

      if (!u) {
        u = '';
      }

      head = d.getElementsByTagName('head')[0];

      each(u.split(','), function (u) {
        var link;

        if (self.files[u]) {
          return;
        }

        self.files[u] = true;

        link = self.create('link', {
          rel: 'stylesheet',
          'data-cfasync': false,
          href: tinymce._addVer(u)
        });

        head.appendChild(link);
      });
    },

    /**
     * Adds a class to the specified element or elements.
     *
     * @method addClass
     * @param {String/Element/Array} Element ID string or DOM element or array with elements or IDs.
     * @param {String} c Class name to add to each element.
     * @return {String/Array} String with new class value or array with new class values for all elements.
     * @example
     * // Adds a class to all paragraphs in the active editor
     * tinymce.activeEditor.dom.addClass(tinymce.activeEditor.dom.select('p'), 'myclass');
     *
     * // Adds a class to a specific element in the current page
     * tinymce.DOM.addClass('mydiv', 'myclass');
     */
    addClass: function (e, c) {
      if (!c) {
        return '';
      }

      var values = stringToArray(c);

      return this.run(e, function (e) {
        each(values, function (cls) {
          // remove whitespace
          cls.trim();

          // skip empty value
          if (!cls) {
            return true;
          }

          e.classList.add(cls);
        });

        return e.className;
      });
    },

    /**
     * Removes a class from the specified element or elements.
     *
     * @method removeClass
     * @param {String/Element/Array} Element ID string or DOM element or array with elements or IDs.
     * @param {String} c Class name to remove to each element.
     * @return {String/Array} String with new class value or array with new class values for all elements.
     * @example
     * // Removes a class from all paragraphs in the active editor
     * tinymce.activeEditor.dom.removeClass(tinymce.activeEditor.dom.select('p'), 'myclass');
     *
     * // Removes a class from a specific element in the current page
     * tinymce.DOM.removeClass('mydiv', 'myclass');
     */
    removeClass: function (e, c) {
      var self = this;

      if (!c) {
        return '';
      }

      var values = stringToArray(c);

      return self.run(e, function (e) {
        each(values, function (cls) {
          // remove whitespace
          cls.trim();

          // skip empty value
          if (!cls) {
            return true;
          }

          e.classList.remove(cls);
        });

        // Empty class attr
        if (!e.className) {
          e.removeAttribute('class');
          e.removeAttribute('className');
        }

        return e.className;
      });
    },

    /**
     * Returns true if the specified element has the specified class.
     *
     * @method hasClass
     * @param {String/Element} n HTML element or element id string to check CSS class on.
     * @param {String} c CSS class to check for.
     * @return {Boolean} true/false if the specified element has the specified class.
     */
    hasClass: function (n, c) {
      n = this.get(n);

      if (!n || !c) {
        return false;
      }

      return n.classList && n.classList.contains(c);
    },

    /**
     * Adds or removes a class on a sepecified element
     *
     * @method toggleClass
     * @param {String/Element} n HTML element or element id string to check CSS class on.
     * @param {String} c CSS class to add or remove.
     * @return {String/Array} String with new class value or array with new class values for all elements.
     */
    toggleClass: function (n, c) {
      n = this.get(n);

      if (!n || !c) {
        return false;
      }

      if (this.hasClass(n, c)) {
        return this.removeClass(n, c);
      } else {
        return this.addClass(n, c);
      }
    },

    /**
     * Shows the specified element(s) by ID by setting the "display" style.
     *
     * @method show
     * @param {String/Element/Array} e ID of DOM element or DOM element or array with elements or IDs to show.
     */
    show: function (e) {
      return this.setStyle(e, 'display', 'block');
    },

    /**
     * Hides the specified element(s) by ID by setting the "display" style.
     *
     * @method hide
     * @param {String/Element/Array} e ID of DOM element or DOM element or array with elements or IDs to hide.
     * @example
     * // Hides a element by id in the document
     * tinymce.DOM.hide('myid');
     */
    hide: function (e) {
      return this.setStyle(e, 'display', 'none');
    },

    /**
     * Returns true/false if the element is hidden or not by checking the "display" style.
     *
     * @method isHidden
     * @param {String/Element} e Id or element to check display state on.
     * @return {Boolean} true/false if the element is hidden or not.
     */
    isHidden: function (e) {
      e = this.get(e);

      return !e || e.style.display == 'none' || this.getStyle(e, 'display') == 'none';
    },

    /**
     * Returns a unique id. This can be useful when generating elements on the fly.
     * This method will not check if the element allready exists.
     *
     * @method uniqueId
     * @param {String} p Optional prefix to add infront of all ids defaults to "mce_".
     * @return {String} Unique id.
     */
    uniqueId: function (p) {
      return (!p ? 'mce_' : p) + (this.counter++);
    },

    /**
     * Sets the specified HTML content inside the element or elements. The HTML will first be processed this means
     * URLs will get converted, hex color values fixed etc. Check processHTML for details.
     *
     * @method setHTML
     * @param {Element/String/Array} e DOM element, element id string or array of elements/ids to set HTML inside.
     * @param {String} h HTML content to set as inner HTML of the element.
     * @example
     * // Sets the inner HTML of all paragraphs in the active editor
     * tinymce.activeEditor.dom.setHTML(tinymce.activeEditor.dom.select('p'), 'some inner html');
     *
     * // Sets the inner HTML of a element by id in the document
     * tinymce.DOM.setHTML('mydiv', 'some inner html');
     */
    setHTML: function (element, html) {
      var self = this;

      return self.run(element, function (element) {
        if (isIE) {
          // Remove all child nodes, IE keeps empty text nodes in DOM
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }

          try {
            // IE will remove comments from the beginning
            // unless you padd the contents with something
            element.innerHTML = '<br />' + html;
            element.removeChild(element.firstChild);
          } catch (ex) {
            // IE sometimes produces an unknown runtime error on innerHTML if it's an block element within a block element for example a div inside a p
            // This seems to fix this problem

            // Create new div with HTML contents and a BR infront to keep comments
            var newElement = self.create('div');
            newElement.innerHTML = '<br />' + html;

            // Add all children from div to target
            each(tinymce.grep(newElement.childNodes), function (node, i) {
              // Skip br element
              if (i && element.canHaveHTML) {
                element.appendChild(node);
              }
            });
          }
        } else {
          element.innerHTML = html;
        }

        return html;
      });
    },

    /**
     * Returns the outer HTML of an element.
     *
     * @method getOuterHTML
     * @param {String/Element} elm Element ID or element object to get outer HTML from.
     * @return {String} Outer HTML string.
     * @example
     * tinymce.DOM.getOuterHTML(editorElement);
     * tinymce.activeEditor.getOuterHTML(tinymce.activeEditor.getBody());
     */
    getOuterHTML: function (elm) {
      var doc, self = this;

      elm = self.get(elm);

      if (!elm) {
        return null;
      }

      if (elm.nodeType === 1) {
        return elm.outerHTML;
      }

      doc = (elm.ownerDocument || self.doc).createElement("body");
      doc.appendChild(elm.cloneNode(true));

      return doc.innerHTML;
    },

    /**
     * Sets the specified outer HTML on a element or elements.
     *
     * @method setOuterHTML
     * @param {Element/String/Array} e DOM element, element id string or array of elements/ids to set outer HTML on.
     * @param {Object} h HTML code to set as outer value for the element.
     * @param {Document} d Optional document scope to use in this process defaults to the document of the DOM class.
     * @example
     * // Sets the outer HTML of all paragraphs in the active editor
     * tinymce.activeEditor.dom.setOuterHTML(tinymce.activeEditor.dom.select('p'), '<div>some html</div>');
     *
     * // Sets the outer HTML of a element by id in the document
     * tinymce.DOM.setOuterHTML('mydiv', '<div>some html</div>');
     */
    setOuterHTML: function (e, h, d) {
      var self = this;

      function setHTML(e, h, d) {
        var n, tp;

        tp = d.createElement("body");
        tp.innerHTML = h;

        n = tp.lastChild;
        while (n) {
          self.insertAfter(n.cloneNode(true), e);
          n = n.previousSibling;
        }

        self.remove(e);
      }

      return this.run(e, function (e) {
        e = self.get(e);

        // Only set HTML on elements
        if (e.nodeType == 1) {
          d = d || e.ownerDocument || self.doc;

          if (isIE) {
            try {
              // Try outerHTML for IE it sometimes produces an unknown runtime error
              if (isIE && e.nodeType == 1) {
                e.outerHTML = h;
              } else {
                setHTML(e, h, d);
              }
            } catch (ex) {
              // Fix for unknown runtime error
              setHTML(e, h, d);
            }
          } else {
            setHTML(e, h, d);
          }
        }
      });
    },

    /**
     * Entity decode a string, resolves any HTML entities like &aring;.
     *
     * @method decode
     * @param {String} s String to decode entities on.
     * @return {String} Entity decoded string.
     */
    decode: Entities.decode,

    /**
     * Entity encodes a string, encodes the most common entities <>"& into entities.
     *
     * @method encode
     * @param {String} text String to encode with entities.
     * @return {String} Entity encoded string.
     */
    encode: Entities.encodeAllRaw,

    /**
     * Inserts a element after the reference element.
     *
     * @method insertAfter
     * @param {Element} node Element to insert after the reference.
     * @param {Element/String/Array} reference_node Reference element, element id or array of elements to insert after.
     * @return {Element/Array} Element that got added or an array with elements.
     */
    insertAfter: function (node, reference_node) {
      reference_node = this.get(reference_node);

      return this.run(node, function (node) {
        var parent, nextSibling;

        parent = reference_node.parentNode;
        nextSibling = reference_node.nextSibling;

        if (nextSibling) {
          parent.insertBefore(node, nextSibling);
        } else {
          parent.appendChild(node);
        }

        return node;
      });
    },

    insertBefore: function (node, reference_node) {
      reference_node = this.get(reference_node);

      return this.run(node, function (node) {
        reference_node.parentNode.insertBefore(node, reference_node);
        return node;
      });
    },

    /**
     * Replaces the specified element or elements with the specified element, the new element will
     * be cloned if multiple inputs elements are passed.
     *
     * @method replace
     * @param {Element} n New element to replace old ones with.
     * @param {Element/String/Array} o Element DOM node, element id or array of elements or ids to replace.
     * @param {Boolean} k Optional keep children state, if set to true child nodes from the old object will be added to new ones.
     */
    replace: function (n, o, k) {
      var self = this;

      if (is(o, 'array')) {
        n = n.cloneNode(true);
      }

      return self.run(o, function (o) {
        if (k) {
          each(tinymce.grep(o.childNodes), function (c) {
            n.appendChild(c);
          });
        }

        return o.parentNode.replaceChild(n, o);
      });
    },

    /**
     * Renames the specified element to a new name and keep it's attributes and children.
     *
     * @method rename
     * @param {Element} elm Element to rename.
     * @param {String} name Name of the new element.
     * @return New element or the old element if it needed renaming.
     */
    rename: function (elm, name) {
      var self = this,
        newElm;

      if (elm.nodeName != name.toUpperCase()) {
        // Rename block element
        newElm = self.create(name);

        // Copy attribs to new block
        each(self.getAttribs(elm), function (attr_node) {
          self.setAttrib(newElm, attr_node.nodeName, self.getAttrib(elm, attr_node.nodeName));
        });

        // Replace block
        self.replace(newElm, elm, 1);
      }

      return newElm || elm;
    },

    /**
     * Find the common ancestor of two elements. This is a shorter method than using the DOM Range logic.
     *
     * @method findCommonAncestor
     * @param {Element} a Element to find common ancestor of.
     * @param {Element} b Element to find common ancestor of.
     * @return {Element} Common ancestor element of the two input elements.
     */
    findCommonAncestor: function (a, b) {
      var ps = a,
        pe;

      while (ps) {
        pe = b;

        while (pe && ps != pe) {
          pe = pe.parentNode;
        }

        if (ps == pe) {
          break;
        }

        ps = ps.parentNode;
      }

      if (!ps && a.ownerDocument) {
        return a.ownerDocument.documentElement;
      }

      return ps;
    },

    /**
     * Parses the specified RGB color value and returns a hex version of that color.
     *
     * @method toHex
     * @param {String} s RGB string value like rgb(1,2,3)
     * @return {String} Hex version of that RGB value like #FF00FF.
     */
    toHex: function (s) {
      //var c = /^\s*rgb\s*?\(\s*?([0-9]+)\s*?,\s*?([0-9]+)\s*?,\s*?([0-9]+)\s*?,\s*?([0-9\.]*)\s*?\)\s*$/i.exec(s);

      // clean up rgb string
      s = s.replace(/\s/g, '').replace(/(rgb|rgba)\(/i, '').replace(/\)/, '').replace(/\s/g, '');

      // split by comma seperator
      var c = s.split(',');

      function hex(s) {
        s = parseInt(s, 10).toString(16);

        return s.length > 1 ? s : '0' + s; // 0 -> 00
      }

      if (c.length >= 3) {
        s = '#' + hex(c[0]) + hex(c[1]) + hex(c[2]);

        return s;
      }

      return s;
    },

    /**
     * Returns a array of all single CSS classes in the document. A single CSS class is a simple
     * rule like ".class" complex ones like "div td.class" will not be added to output.
     *
     * @method getClasses
     * @return {Array} Array with class objects each object has a class field might be other fields in the future.
     */
    getClasses: function () {
      var self = this,
        cl = [],
        lo = {},
        f = self.settings.class_filter,
        ov;

      if (self.classes) {
        return self.classes;
      }

      function addClasses(s) {
        // IE style imports
        each(s.imports, function (r) {
          addClasses(r);
        });

        each(s.cssRules || s.rules, function (r) {
          // Real type or fake it on IE
          switch (r.type || 1) {
            // Rule
            case 1:
              if (r.selectorText) {
                each(r.selectorText.split(','), function (v) {
                  v = v.replace(/^\s*|\s*$|^\s\./g, "");

                  // Is internal or it doesn't contain a class
                  if (/\.mce/.test(v) || !/\.[\w\-]+$/.test(v)) {
                    return;
                  }

                  // Remove everything but class name
                  ov = v;
                  v = v.replace(/.*\.([a-z0-9_\-]+).*/i, '$1');

                  // Filter classes
                  if (f && !(v = f(v, ov))) {
                    return;
                  }

                  if (!lo[v]) {
                    cl.push({
                      'class': v
                    });
                    lo[v] = 1;
                  }
                });
              }
              break;

            // Import
            case 3:
              try {
                addClasses(r.styleSheet);
              } catch (ex) {
                // Ignore
              }

              break;
          }
        });
      }

      try {
        each(self.doc.styleSheets, addClasses);
      } catch (ex) {
        // Ignore
      }

      if (cl.length > 0) {
        self.classes = cl;
      }

      return cl;
    },

    /**
     * Executes the specified function on the element by id or dom element node or array of elements/id.
     *
     * @method run
     * @param {String/Element/Array} Element ID or DOM element object or array with ids or elements.
     * @param {function} f Function to execute for each item.
     * @param {Object} s Optional scope to execute the function in.
     * @return {Object/Array} Single object or array with objects depending on multiple input or not.
     */
    run: function (e, f, s) {
      var self = this,
        o;

      if (self.doc && typeof (e) === 'string') {
        e = self.get(e);
      }

      if (!e) {
        return false;
      }

      s = s || this;
      if (!e.nodeType && (e.length || e.length === 0)) {
        o = [];

        each(e, function (e, i) {
          if (e) {
            if (typeof (e) == 'string') {
              e = self.doc.getElementById(e);
            }

            o.push(f.call(s, e, i));
          }
        });

        return o;
      }

      return f.call(s, e);
    },

    /**
     * Returns an NodeList with attributes for the element.
     *
     * @method getAttribs
     * @param {HTMLElement/string} n Element node or string id to get attributes from.
     * @return {NodeList} NodeList with attributes.
     */
    getAttribs: function (n) {
      var o;

      n = this.get(n);

      if (!n) {
        return [];
      }

      if (isIE) {
        o = [];

        // Object will throw exception in IE
        if (n.nodeName == 'OBJECT') {
          return n.attributes;
        }

        // IE doesn't keep the selected attribute if you clone option elements
        if (n.nodeName === 'OPTION' && this.getAttrib(n, 'selected')) {
          o.push({
            specified: 1,
            nodeName: 'selected'
          });
        }

        // It's crazy that this is faster in IE but it's because it returns all attributes all the time
        n.cloneNode(false).outerHTML.replace(/<\/?[\w:\-]+ ?|=[\"][^\"]+\"|=\'[^\']+\'|=[\w\-]+|>/gi, '').replace(/[\w:\-]+/gi, function (a) {
          o.push({
            specified: 1,
            nodeName: a
          });
        });

        return o;
      }

      return n.attributes;
    },

    /**
     * Returns true/false if the specified node is to be considered empty or not.
     *
     * @example
     * tinymce.DOM.isEmpty(node, {img : true});
     * @method isEmpty
     * @param {Object} elements Optional name/value object with elements that are automatically treated as non empty elements.
     * @return {Boolean} true/false if the node is empty or not.
     */
    isEmpty: function (node, elements) {
      var self = this,
        i, attributes, type, whitespace, walker, name, brCount = 0;

      node = node.firstChild;

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
        walker = new tinymce.dom.TreeWalker(node, node.parentNode);
        elements = elements || (self.schema ? self.schema.getNonEmptyElements() : null);
        whitespace = self.schema ? self.schema.getWhiteSpaceElements() : {};

        do {
          type = node.nodeType;

          if (type === 1) {
            // Ignore bogus elements
            var bogusVal = node.getAttribute('data-mce-bogus');
            if (bogusVal) {
              node = walker.next(bogusVal === 'all');
              continue;
            }

            // Keep empty elements like <img />
            name = node.nodeName.toLowerCase();

            if (elements && elements[name]) {
              // Ignore single BR elements in blocks like <p><br /></p> or <p><span><br /></span></p>
              if (name === 'br') {
                brCount++;
                node = walker.next();
                continue;
              }

              return false;
            }

            // Keep elements with data-bookmark attributes or name attribute like <a name="1"></a>
            attributes = self.getAttribs(node);
            i = attributes.length;

            while (i--) {
              name = attributes[i].nodeName;

              if (isValidAttribute(name)) {
                return false;
              }
            }
          }

          // Keep comment nodes
          if (type == 8) {
            return false;
          }

          // Keep non whitespace text nodes
          if (type === 3 && !whiteSpaceRegExp.test(node.nodeValue)) {
            return false;
          }

          // Keep whitespace preserve elements
          if (type === 3 && node.parentNode && whitespace[node.parentNode.nodeName] && whiteSpaceRegExp.test(node.nodeValue)) {
            return false;
          }

          node = walker.next();
        } while (node);
      }

      return brCount <= 1;
    },

    /**
     * Destroys all internal references to the DOM to solve IE leak issues.
     *
     * @method destroy
     */
    destroy: function (s) {
      var self = this;

      self.win = self.doc = self.root = self.events = self.frag = null;

      // Manual destroy then remove unload handler
      if (!s) {
        tinymce.removeUnload(self.destroy);
      }
    },

    /**
     * Created a new DOM Range object. This will use the native DOM Range API
     *
     * @method createRng
     * @return {DOMRange} DOM Range object.
     * @example
     * var rng = tinymce.DOM.createRng();
     * alert(rng.startContainer + "," + rng.startOffset);
     */
    createRng: function () {
      return this.doc.createRange();
    },

    /**
     * Returns the index of the specified node within it's parent.
     *
     * @param {Node} node Node to look for.
     * @param {boolean} normalized Optional true/false state if the index is what it would be after a normalization.
     * @return {Number} Index of the specified node.
     */
    nodeIndex: function (node, normalized) {
      var idx = 0,
        lastNodeType, nodeType;

      if (node) {
        for (lastNodeType = node.nodeType, node = node.previousSibling; node; node = node.previousSibling) {
          nodeType = node.nodeType;

          // Normalize text nodes
          if (normalized && nodeType == 3) {
            if (nodeType == lastNodeType || !node.nodeValue.length) {
              continue;
            }
          }
          idx++;
          lastNodeType = nodeType;
        }
      }

      return idx;
    },

    /**
     * Splits an element into two new elements and places the specified split
     * element or element between the new ones. For example splitting the paragraph at the bold element in
     * this example <p>abc<b>abc</b>123</p> would produce <p>abc</p><b>abc</b><p>123</p>.
     *
     * @method split
     * @param {Element} pe Parent element to split.
     * @param {Element} e Element to split at.
     * @param {Element} re Optional replacement element to replace the split element by.
     * @return {Element} Returns the split element or the replacement element if that is specified.
     */
    split: function (pe, e, re) {
      var self = this,
        r = self.createRng(),
        bef, aft, pa;

      // W3C valid browsers tend to leave empty nodes to the left/right side of the contents, this makes sense
      // but we don't want that in our code since it serves no purpose for the end user
      // For example if this is chopped:
      //   <p>text 1<span><b>CHOP</b></span>text 2</p>
      // would produce:
      //   <p>text 1<span></span></p><b>CHOP</b><p><span></span>text 2</p>
      // this function will then trim of empty edges and produce:
      //   <p>text 1</p><b>CHOP</b><p>text 2</p>
      function trim(node) {
        var i, children = node.childNodes,
          type = node.nodeType;

        function surroundedBySpans(node) {
          var previousIsSpan = node.previousSibling && node.previousSibling.nodeName == 'SPAN';
          var nextIsSpan = node.nextSibling && node.nextSibling.nodeName == 'SPAN';
          return previousIsSpan && nextIsSpan;
        }

        if (type == 1 && node.getAttribute('data-mce-type') == 'bookmark') {
          return;
        }

        for (i = children.length - 1; i >= 0; i--) {
          trim(children[i]);
        }

        if (type != 9) {
          // Keep non whitespace text nodes
          if (type == 3 && node.nodeValue.length > 0) {
            // If parent element isn't a block or there isn't any useful contents for example "<p>   </p>"
            // Also keep text nodes with only spaces if surrounded by spans.
            // eg. "<p><span>a</span> <span>b</span></p>" should keep space between a and b
            var trimmedLength = tinymce.trim(node.nodeValue).length;
            if (!self.isBlock(node.parentNode) || trimmedLength > 0 || trimmedLength === 0 && surroundedBySpans(node)) {
              return;
            }
          } else if (type == 1) {
            // If the only child is a bookmark then move it up
            children = node.childNodes;
            if (children.length == 1 && children[0] && children[0].nodeType == 1 && children[0].getAttribute('data-mce-type') == 'bookmark') {
              node.parentNode.insertBefore(children[0], node);
            }

            // Keep non empty elements or img, hr etc
            if (children.length || /^(br|hr|input|img)$/i.test(node.nodeName)) {
              return;
            }
          }

          self.remove(node);
        }

        return node;
      }

      if (pe && e) {
        // Get before chunk
        r.setStart(pe.parentNode, self.nodeIndex(pe));
        r.setEnd(e.parentNode, self.nodeIndex(e));
        bef = r.extractContents();

        // Get after chunk
        r = self.createRng();
        r.setStart(e.parentNode, self.nodeIndex(e) + 1);
        r.setEnd(pe.parentNode, self.nodeIndex(pe) + 1);
        aft = r.extractContents();

        // Insert before chunk
        pa = pe.parentNode;
        pa.insertBefore(trim(bef), pe);

        // Insert middle chunk
        if (re) {
          pa.replaceChild(re, e);
        } else {
          pa.insertBefore(e, pe);
        }

        // Insert after chunk
        pa.insertBefore(trim(aft), pe);
        self.remove(pe);

        return re || e;
      }
    },

    /**
     * Adds an event handler to the specified object.
     *
     * @method bind
     * @param {Element/Document/Window/Array/String} o Object or element id string to add event handler to or an array of elements/ids/documents.
     * @param {String} n Name of event handler to add for example: click.
     * @param {function} f Function to execute when the event occurs.
     * @param {Object} s Optional scope to execute the function in.
     * @return {function} Function callback handler the same as the one passed in.
     */
    bind: function (target, name, func, scope) {
      return this.events.add(target, name, func, scope || this);
    },

    /**
     * Removes the specified event handler by name and function from a element or collection of elements.
     *
     * @method unbind
     * @param {String/Element/Array} o Element ID string or HTML element or an array of elements or ids to remove handler from.
     * @param {String} n Event handler name like for example: "click"
     * @param {function} f Function to remove.
     * @return {bool/Array} Bool state if true if the handler was removed or an array with states if multiple elements where passed in.
     */
    unbind: function (target, name, func) {
      return this.events.remove(target, name, func);
    },

    /**
     * Fires the specified event name with object on target.
     *
     * @method fire
     * @param {Node/Document/Window} target Target element or object to fire event on.
     * @param {String} name Name of the event to fire.
     * @param {Object} evt Event object to send.
     * @return {Event} Event object.
     */
    fire: function (target, name, evt) {
      return this.events.fire(target, name, evt);
    },

    // Returns the content editable state of a node
    getContentEditable: function (node) {
      var contentEditable;

      // Check type
      if (!node || node.nodeType != 1) {
        return null;
      }

      // Check for fake content editable
      contentEditable = node.getAttribute("data-mce-contenteditable");

      if (contentEditable && contentEditable !== "inherit") {
        return contentEditable;
      }

      // Check for real content editable
      return node.contentEditable !== "inherit" ? node.contentEditable : null;
    },

    getContentEditableParent: function (node) {
      var root = this.getRoot(),
        state = null;

      for (; node && node !== root; node = node.parentNode) {
        state = this.getContentEditable(node);

        if (state !== null) {
          break;
        }
      }

      return state;
    },

    isChildOf: function (node, parent) {
      while (node) {
        if (parent === node) {
          return true;
        }

        node = node.parentNode;
      }

      return false;
    },

    // #ifdef debug

    dumpRng: function (r) {
      return 'startContainer: ' + r.startContainer.nodeName + ', startOffset: ' + r.startOffset + ', endContainer: ' + r.endContainer.nodeName + ', endOffset: ' + r.endOffset;
    },

    // #endif

    _findSib: function (node, selector, name) {
      var self = this,
        f = selector;

      if (node) {
        // If expression make a function of it using is
        if (is(f, 'string')) {
          f = function (node) {
            return self.is(node, selector);
          };
        }

        // Loop all siblings
        for (node = node[name]; node; node = node[name]) {
          if (f(node)) {
            return node;
          }
        }
      }

      return null;
    },

    _isRes: function (c) {
      // Is live resizble element
      return /^(top|left|bottom|right|width|height)/i.test(c) || /;\s*(top|left|bottom|right|width|height)/i.test(c);
    }

    /*
    walk : function(n, f, s) {
      var d = this.doc, w;

      if (d.createTreeWalker) {
        w = d.createTreeWalker(n, NodeFilter.SHOW_TEXT, null, false);

        while ((n = w.nextNode()) != null)
          f.call(s || this, n);
      } else
        tinymce.walk(n, f, 'childNodes', s);
    }
    */
  };

  /**
   * Instance of DOMUtils for the current document.
   *
   * @property DOM
   * @member tinymce
   * @type tinymce.dom.DOMUtils
   * @example
   * // Example of how to add a class to some element by id
   * tinymce.DOM.addClass('someid', 'someclass');
   */
  tinymce.DOM = new tinymce.dom.DOMUtils(document, {
    process_html: 0
  });
})(tinymce);