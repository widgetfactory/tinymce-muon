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
    extend = tinymce.extend,
    TreeWalker = tinymce.dom.TreeWalker,
    BookmarkManager = tinymce.dom.BookmarkManager,
    ControlSelection = tinymce.dom.ControlSelection,
    RangeUtils = tinymce.dom.RangeUtils,
    CaretPosition = tinymce.caret.CaretPosition,
    Zwsp = tinymce.text.Zwsp,
    ScrollIntoView = tinymce.dom.ScrollIntoView,
    Env = tinymce.util.Env;


  function isRestricted(element) {
    return !!element && !Object.getPrototypeOf(element);
  }

  /**
   * This class handles text and control selection it's an crossbrowser utility class.
   * Consult the TinyMCE Wiki API for more details and examples on how to use this class.
   *
   * @class tinymce.dom.Selection
   * @example
   * // Getting the currently selected node for the active editor
   * alert(tinymce.activeEditor.selection.getNode().nodeName);
   */
  /**
     * Constructs a new selection instance.
     *
     * @constructor
     * @method Selection
     * @param {tinymce.dom.DOMUtils} dom DOMUtils object reference.
     * @param {Window} win Window to bind the selection object to.
     * @param {tinymce.dom.Serializer} serializer DOM serialization class to use for getContent.
     */
  tinymce.dom.Selection = function (dom, win, serializer, editor) {
    var self = this;

    self.dom = dom;
    self.win = win;
    self.serializer = serializer;
    self.editor = editor;

    self.bookmarkManager = new BookmarkManager(self);
    self.controlSelection = new ControlSelection(self, editor);

    // Add events
    each([
      /**
       * This event gets executed before contents is extracted from the selection.
       *
       * @event onBeforeSetContent
       * @param {tinymce.dom.Selection} selection Selection object that fired the event.
       * @param {Object} args Contains things like the contents that will be returned.
       */
      'onBeforeSetContent',

      /**
       * This event gets executed before contents is inserted into selection.
       *
       * @event onBeforeGetContent
       * @param {tinymce.dom.Selection} selection Selection object that fired the event.
       * @param {Object} args Contains things like the contents that will be inserted.
       */
      'onBeforeGetContent',

      /**
       * This event gets executed when contents is inserted into selection.
       *
       * @event onSetContent
       * @param {tinymce.dom.Selection} selection Selection object that fired the event.
       * @param {Object} args Contains things like the contents that will be inserted.
       */
      'onSetContent',

      /**
       * This event gets executed when contents is extracted from the selection.
       *
       * @event onGetContent
       * @param {tinymce.dom.Selection} selection Selection object that fired the event.
       * @param {Object} args Contains things like the contents that will be returned.
       */
      'onGetContent',

      /**
       * This event gets executed when a range is extracted from the selection.
       *
       * @event onSetSelectionRange
       * @param {tinymce.dom.Selection} selection Selection object that fired the event.
       * @param {Object} args Contains things like the contents that will be returned.
       */
      'onGetSelectionRange',

      /**
       * This event gets executed when a selection range is set.
       *
       * @event onSetSelectionRange
       * @param {tinymce.dom.Selection} selection Selection object that fired the event.
       * @param {Object} args Contains things like the contents that will be returned.
       */
      'onSetSelectionRange',

      /**
       * This event gets executed after a selection range is set.
       *
       * @event onAfterSetSelectionRange
       * @param {tinymce.dom.Selection} selection Selection object that fired the event.
       * @param {Object} args Contains things like the contents that will be returned.
       */
      'onAfterSetSelectionRange'
    ], function (e) {
      self[e] = new tinymce.util.Dispatcher(self);
    });

    // Add onBeforeSetContent with cleanup
    self.onBeforeSetContent.add(function (e, args) {
      if (args.format !== 'raw') {
        var node = new tinymce.html.DomParser(editor.settings, editor.schema).parse(args.content, extend(args, { isRootContent: true, forced_root_block: false }));
        args.content = new tinymce.html.Serializer({ validate: false }, editor.schema).serialize(node);
      }
    });

    // Prevent leaks
    tinymce.addUnload(self.destroy, self);
  };

  tinymce.dom.Selection.prototype = {

    /**
   * Move the selection cursor range to the specified node and offset.
   * If there is no node specified it will move it to the first suitable location within the body.
   *
   * @method setCursorLocation
   * @param {Node} node Optional node to put the cursor in.
   * @param {Number} offset Optional offset from the start of the node to put the cursor at.
   */
    setCursorLocation: function (node, offset) {
      var self = this,
        rng = self.dom.createRng();

      if (!node) {
        self._moveEndPoint(rng, self.editor.getBody(), true);
        self.setRng(rng);
      } else {
        rng.setStart(node, offset);
        rng.setEnd(node, offset);
        self.setRng(rng);
        self.collapse(false);
      }
    },

    getContextualFragment: function (rng, frag) {
      var self = this,
        ed = self.editor,
        dom = self.dom;

      function isBlock(elm) {
        return dom.isBlock(elm) && !/H[1-6]/.test(elm.nodeName);
      }

      var node = rng.commonAncestorContainer;

      // skip if the node is the editor body
      if (node === ed.getBody()) {
        return frag;
      }

      // Clone table cells parent
      var tableCells = dom.select('td[data-mce-selected], th[data-mce-selected], td.mceSelected, th.mceSelected', node);

      if (tableCells.length) {
        var table = dom.getParent(node, 'table');

        if (table) {
          var parent = dom.clone(table),
            row = dom.create('tr');

          each(tableCells, function (cell) {
            row.appendChild(dom.clone(cell, true));
          });

          parent.appendChild(row);

          return parent;
        }
      }

      if (rng.collapsed) {
        return frag;
      }

      // get all parents of the ancestor node, excluding the body
      var parents = dom.getParents(node, null, ed.getBody());

      // filter to get inline and heading elements
      var elms = tinymce.grep(parents, function (elm) {
        return elm.nodeType === 1 && !isBlock(elm);
      });

      // no elements selected, return range contents
      if (!elms.length) {
        return frag;
      }

      // create fragment to return
      var nodes = document.createDocumentFragment();

      // clone each parent node, adding fragment
      each(elms, function (elm) {
        var n = dom.clone(elm);

        n.appendChild(frag);

        nodes.appendChild(n);
      });

      return nodes;
    },

    /**
     * Returns the selected contents using the DOM serializer passed in to this class.
     *
     * @method getContent
     * @param {Object} args Optional settings class with for example output format text or html.
     * @return {String} Selected contents in for example HTML format.
     * @example
     * // Alerts the currently selected contents
     * alert(tinymce.activeEditor.selection.getContent());
     *
     * // Alerts the currently selected contents as plain text
     * alert(tinymce.activeEditor.selection.getContent({format: 'text'}));
     */
    getContent: function (args) {
      var self = this,
        rng = self.getRng(),
        tmpElm = self.dom.create("body");
      var se = self.getSel(),
        whiteSpaceBefore, whiteSpaceAfter, fragment;

      args = args || {};
      whiteSpaceBefore = whiteSpaceAfter = '';
      args.get = true;
      args.format = args.format || 'html';
      args.selection = true;

      self.onBeforeGetContent.dispatch(self, args);

      if (args.format === 'text') {
        return self.isCollapsed() ? '' : Zwsp.trim(rng.text || (se.toString ? se.toString() : ''));
      }

      if (rng.cloneContents) {
        fragment = rng.cloneContents();

        if (fragment) {

          // internal content selection for cut/copy
          if (args.contextual) {
            fragment = self.getContextualFragment(rng, fragment);
          }

          tmpElm.appendChild(fragment);
        }
      } else if (rng.item !== undefined || rng.htmlText !== undefined) {
        // IE will produce invalid markup if elements are present that
        // it doesn't understand like custom elements or HTML5 elements.
        // Adding a BR in front of the contents and then remoiving it seems to fix it though.
        tmpElm.innerHTML = '<br>' + (rng.item ? rng.item(0).outerHTML : rng.htmlText);
        tmpElm.removeChild(tmpElm.firstChild);
      } else {
        tmpElm.innerHTML = rng.toString();
      }

      // Keep whitespace before and after
      if (/^\s/.test(tmpElm.innerHTML)) {
        whiteSpaceBefore = ' ';
      }

      if (/\s+$/.test(tmpElm.innerHTML)) {
        whiteSpaceAfter = ' ';
      }

      args.getInner = true;

      args.content = self.isCollapsed() ? '' : whiteSpaceBefore + self.serializer.serialize(tmpElm, args) + whiteSpaceAfter;

      self.onGetContent.dispatch(self, args);

      return args.content;
    },

    /**
     * Sets the current selection to the specified content. If any contents is selected it will be replaced
     * with the contents passed in to this function. If there is no selection the contents will be inserted
     * where the caret is placed in the editor/page.
     *
     * @method setContent
     * @param {String} content HTML contents to set could also be other formats depending on settings.
     * @param {Object} args Optional settings object with for example data format.
     * @example
     * // Inserts some HTML contents at the current selection
     * tinymce.activeEditor.selection.setContent('<strong>Some contents</strong>');
     */
    setContent: function (content, args) {
      var self = this,
        rng = self.getRng(),
        caretNode, doc = self.win.document,
        frag, temp;

      args = args || {
        format: 'html'
      };
      args.set = true;
      args.selection = true;
      args.content = content;

      // Dispatch before set content event
      if (!args.no_events) {
        self.onBeforeSetContent.dispatch(self, args);
      }

      content = args.content;

      if (rng.insertNode) {
        // Make caret marker since insertNode places the caret in the beginning of text after insert
        content += '<span id="__caret">_</span>';

        // Delete and insert new node
        if (rng.startContainer == doc && rng.endContainer == doc) {
          // WebKit will fail if the body is empty since the range is then invalid and it can't insert contents
          doc.body.innerHTML = content;
        } else {
          rng.deleteContents();

          if (doc.body.childNodes.length === 0) {
            doc.body.innerHTML = content;
          } else {
            // createContextualFragment doesn't exists in IE 9 DOMRanges
            if (rng.createContextualFragment) {
              rng.insertNode(rng.createContextualFragment(content));
            } else {
              // Fake createContextualFragment call in IE 9
              frag = doc.createDocumentFragment();
              temp = doc.createElement('div');

              frag.appendChild(temp);
              temp.outerHTML = content;

              rng.insertNode(frag);
            }
          }
        }

        // Move to caret marker
        caretNode = self.dom.get('__caret');

        // Make sure we wrap it compleatly, Opera fails with a simple select call
        rng = doc.createRange();
        rng.setStartBefore(caretNode);
        rng.setEndBefore(caretNode);
        self.setRng(rng);

        // Remove the caret position
        self.dom.remove('__caret');

        try {
          self.setRng(rng);
        } catch (ex) {
          // Might fail on Opera for some odd reason
        }
      } else {
        if (rng.item) {
          // Delete content and get caret text selection
          doc.execCommand('Delete', false, null);
          rng = self.getRng();
        }

        // Explorer removes spaces from the beginning of pasted contents
        if (/^\s+/.test(content)) {
          rng.pasteHTML('<span id="__mce_tmp">_</span>' + content);
          self.dom.remove('__mce_tmp');
        } else {
          rng.pasteHTML(content);
        }
      }

      // Dispatch set content event
      if (!args.no_events) {
        self.onSetContent.dispatch(self, args);
      }
    },

    /**
     * Returns the start element of a selection range. If the start is in a text
     * node the parent element will be returned.
     *
     * @method getStart
     * @param {Boolean} real Optional state to get the real parent when the selection is collapsed not the closest element.
     * @return {Element} Start element of selection range.
     */
    getStart: function (real) {
      var self = this,
        rng = self.getRng(),
        startElement, parentElement, checkRng, node;

      if (rng.duplicate || rng.item) {
        // Control selection, return first item
        if (rng.item) {
          return rng.item(0);
        }

        // Get start element
        checkRng = rng.duplicate();
        checkRng.collapse(1);
        startElement = checkRng.parentElement();
        if (startElement.ownerDocument !== self.dom.doc) {
          startElement = self.dom.getRoot();
        }

        // Check if range parent is inside the start element, then return the inner parent element
        // This will fix issues when a single element is selected, IE would otherwise return the wrong start element
        parentElement = node = rng.parentElement();
        while ((node = node.parentNode)) {
          if (node == startElement) {
            startElement = parentElement;
            break;
          }
        }

        return startElement;
      }

      startElement = rng.startContainer;

      if (startElement.nodeType == 1 && startElement.hasChildNodes()) {
        if (!real || !rng.collapsed) {
          startElement = startElement.childNodes[Math.min(startElement.childNodes.length - 1, rng.startOffset)];
        }
      }

      if (startElement && startElement.nodeType == 3) {
        return startElement.parentNode;
      }

      return startElement;
    },

    /**
     * Returns the end element of a selection range. If the end is in a text
     * node the parent element will be returned.
     *
     * @method getEnd
     * @param {Boolean} real Optional state to get the real parent when the selection is collapsed not the closest element.
     * @return {Element} End element of selection range.
     */
    getEnd: function (real) {
      var self = this,
        rng = self.getRng(),
        endElement, endOffset;

      if (rng.duplicate || rng.item) {
        if (rng.item) {
          return rng.item(0);
        }

        rng = rng.duplicate();
        rng.collapse(0);
        endElement = rng.parentElement();
        if (endElement.ownerDocument !== self.dom.doc) {
          endElement = self.dom.getRoot();
        }

        if (endElement && endElement.nodeName == 'BODY') {
          return endElement.lastChild || endElement;
        }

        return endElement;
      }

      endElement = rng.endContainer;
      endOffset = rng.endOffset;

      if (endElement.nodeType == 1 && endElement.hasChildNodes()) {
        if (!real || !rng.collapsed) {
          endElement = endElement.childNodes[endOffset > 0 ? endOffset - 1 : endOffset];
        }
      }

      if (endElement && endElement.nodeType == 3) {
        return endElement.parentNode;
      }

      return endElement;
    },

    /**
     * Returns a bookmark location for the current selection. This bookmark object
     * can then be used to restore the selection after some content modification to the document.
     *
     * @method getBookmark
     * @param {Number} type Optional state if the bookmark should be simple or not. Default is complex.
     * @param {Boolean} normalized Optional state that enables you to get a position that it would be after normalization.
     * @return {Object} Bookmark object, use moveToBookmark with this object to restore the selection.
     * @example
     * // Stores a bookmark of the current selection
     * var bm = tinymce.activeEditor.selection.getBookmark();
     *
     * tinymce.activeEditor.setContent(tinymce.activeEditor.getContent() + 'Some new content');
     *
     * // Restore the selection bookmark
     * tinymce.activeEditor.selection.moveToBookmark(bm);
     */
    getBookmark: function (type, normalized) {
      return this.bookmarkManager.getBookmark(type, normalized);
    },

    /**
     * Restores the selection to the specified bookmark.
     *
     * @method moveToBookmark
     * @param {Object} bookmark Bookmark to restore selection from.
     * @return {Boolean} true/false if it was successful or not.
     * @example
     * // Stores a bookmark of the current selection
     * var bm = tinymce.activeEditor.selection.getBookmark();
     *
     * tinymce.activeEditor.setContent(tinymce.activeEditor.getContent() + 'Some new content');
     *
     * // Restore the selection bookmark
     * tinymce.activeEditor.selection.moveToBookmark(bm);
     */
    moveToBookmark: function (bookmark) {
      return this.bookmarkManager.moveToBookmark(bookmark);
    },

    /**
     * Selects the specified element. This will place the start and end of the selection range around the element.
     *
     * @method select
     * @param {Element} node HTML DOM element to select.
     * @param {Boolean} content Optional bool state if the contents should be selected or not on non IE browser.
     * @return {Element} Selected element the same element as the one that got passed in.
     * @example
     * // Select the first paragraph in the active editor
     * tinymce.activeEditor.selection.select(tinymce.activeEditor.dom.select('p')[0]);
     */
    select: function (node, content) {
      var self = this,
        dom = self.dom,
        rng = dom.createRng(),
        idx;

      // Clear stored range set by FocusManager
      self.lastFocusBookmark = null;

      if (node) {
        if (!content && self.controlSelection.controlSelect(node)) {
          return;
        }

        idx = dom.nodeIndex(node);
        rng.setStart(node.parentNode, idx);
        rng.setEnd(node.parentNode, idx + 1);

        // Find first/last text node or BR element
        if (content) {
          self._moveEndPoint(rng, node, true);
          self._moveEndPoint(rng, node);
        }

        self.setRng(rng);
      }

      return node;
    },

    /**
     * Returns true/false if the selection range is collapsed or not. Collapsed means if it's a caret or a larger selection.
     *
     * @method isCollapsed
     * @return {Boolean} true/false state if the selection range is collapsed or not.
     * Collapsed means if it's a caret or a larger selection.
     */
    isCollapsed: function () {
      var self = this,
        rng = self.getRng(),
        sel = self.getSel();

      if (!rng || rng.item) {
        return false;
      }

      if (rng.compareEndPoints) {
        return rng.compareEndPoints('StartToEnd', rng) === 0;
      }

      return !sel || rng.collapsed;
    },

    /**
     * Collapse the selection to start or end of range.
     *
     * @method collapse
     * @param {Boolean} toStart Optional boolean state if to collapse to end or not. Defaults to false.
     */
    collapse: function (toStart) {
      var self = this,
        rng = self.getRng(),
        node;

      // Control range on IE
      if (rng.item) {
        node = rng.item(0);
        rng = self.win.document.body.createTextRange();
        rng.moveToElementText(node);
      }

      rng.collapse(!!toStart);
      self.setRng(rng);
    },

    /**
     * Returns the browsers internal selection object.
     *
     * @method getSel
     * @return {Selection} Internal browser selection object.
     */
    getSel: function () {
      var win = this.win;

      return win.getSelection ? win.getSelection() : win.document.selection;
    },

    /**
     * Returns the browsers internal range object.
     *
     * @method getRng
     * @param {Boolean} w3c Forces a compatible W3C range on IE.
     * @return {Range} Internal browser range object.
     * @see http://www.quirksmode.org/dom/range_intro.html
     * @see http://www.dotvoid.com/2001/03/using-the-range-object-in-mozilla/
     */
    getRng: function (w3c) {
      var self = this,
        selection, rng, elm, doc, evt;

      function tryCompareBoundaryPoints(how, sourceRange, destinationRange) {
        try {
          return sourceRange.compareBoundaryPoints(how, destinationRange);
        } catch (ex) {
          // Gecko throws wrong document exception if the range points
          // to nodes that where removed from the dom #6690
          // Browsers should mutate existing DOMRange instances so that they always point
          // to something in the document this is not the case in Gecko works fine in IE/WebKit/Blink
          // For performance reasons just return -1
          return -1;
        }
      }

      if (!self.win) {
        return null;
      }

      doc = self.win.document;

      if (typeof doc === 'undefined' || doc === null) {
        return null;
      }

      // Use last rng passed from FocusManager if it's available this enables
      // calls to editor.selection.getStart() to work when caret focus is lost on IE
      if (!w3c && self.lastFocusBookmark) {
        var bookmark = self.lastFocusBookmark;

        // Convert bookmark to range IE 11 fix
        if (bookmark.startContainer) {
          rng = doc.createRange();
          rng.setStart(bookmark.startContainer, bookmark.startOffset);
          rng.setEnd(bookmark.endContainer, bookmark.endOffset);
        } else {
          rng = bookmark;
        }

        return rng;
      }

      try {
        if ((selection = self.getSel()) && !isRestricted(selection.anchorNode)) {
          if (selection.rangeCount > 0) {
            rng = selection.getRangeAt(0);
          } else {
            rng = selection.createRange ? selection.createRange() : doc.createRange();
          }
        }
      } catch (ex) {
        // IE throws unspecified error here if TinyMCE is placed in a frame/iframe
      }

      evt = { range: rng };

      self.onGetSelectionRange.dispatch(self, evt);

      if (evt.range !== rng) {
        return evt.range; // If the range was modified by the event handler
      }

      // No range found then create an empty one
      // This can occur when the editor is placed in a hidden container element on Gecko
      // Or on IE when there was an exception
      if (!rng) {
        rng = doc.createRange ? doc.createRange() : doc.body.createTextRange();
      }

      // If range is at start of document then move it to start of body
      if (rng.setStart && rng.startContainer.nodeType === 9 && rng.collapsed) {
        elm = self.dom.getRoot();
        rng.setStart(elm, 0);
        rng.setEnd(elm, 0);
      }

      if (self.selectedRange && self.explicitRange) {
        if (tryCompareBoundaryPoints(rng.START_TO_START, rng, self.selectedRange) === 0 &&
          tryCompareBoundaryPoints(rng.END_TO_END, rng, self.selectedRange) === 0) {
          // Safari, Opera and Chrome only ever select text which causes the range to change.
          // This lets us use the originally set range if the selection hasn't been changed by the user.
          rng = self.explicitRange;
        } else {
          self.selectedRange = null;
          self.explicitRange = null;
        }
      }

      return rng;
    },

    /**
     * Changes the selection to the specified DOM range.
     *
     * @method setRng
     * @param {Range} rng Range to select.
     * @param {Boolean} forward Optional boolean if the selection is forwards or backwards.
     */
    setRng: function (rng, forward) {
      var self = this,
        sel, node, evt;

      if (!rng) {
        return;
      }

      // Is IE specific range
      if (rng.select) {
        self.explicitRange = null;

        try {
          rng.select();
        } catch (ex) {
          // Needed for some odd IE bug #1843306
        }

        return;
      }

      sel = self.getSel();

      var evt = { range: rng };

      self.onSetSelectionRange.dispatch(self, evt);

      rng = evt.range;

      if (sel) {
        self.explicitRange = rng;

        try {
          sel.removeAllRanges();
          sel.addRange(rng);
        } catch (ex) {
          // IE might throw errors here if the editor is within a hidden container and selection is changed
        }

        // Forward is set to false and we have an extend function
        if (forward === false && sel.extend) {
          sel.collapse(rng.endContainer, rng.endOffset);
          sel.extend(rng.startContainer, rng.startOffset);
        }

        // adding range isn't always successful so we need to check range count otherwise an exception can occur
        self.selectedRange = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      }

      // WebKit egde case selecting images works better using setBaseAndExtent when the image is floated
      if (!rng.collapsed && rng.startContainer === rng.endContainer && sel.setBaseAndExtent) {
        if (rng.endOffset - rng.startOffset < 2) {
          if (rng.startContainer.hasChildNodes()) {
            node = rng.startContainer.childNodes[rng.startOffset];
            if (node && node.tagName === 'IMG') {
              sel.setBaseAndExtent(
                rng.startContainer,
                rng.startOffset,
                rng.endContainer,
                rng.endOffset
              );

              // Since the setBaseAndExtent is fixed in more recent Blink versions we
              // need to detect if it's doing the wrong thing and falling back to the
              // crazy incorrect behavior api call since that seems to be the only way
              // to get it to work on Safari WebKit as of 2017-02-23
              if (sel.anchorNode !== rng.startContainer || sel.focusNode !== rng.endContainer) {
                sel.setBaseAndExtent(node, 0, node, 1);
              }
            }
          }
        }
      }

      self.onAfterSetSelectionRange.dispatch(self, {
        range: rng
      });
    },

    /**
     * Sets the current selection to the specified DOM element.
     *
     * @method setNode
     * @param {Element} elm Element to set as the contents of the selection.
     * @return {Element} Returns the element that got passed in.
     * @example
     * // Inserts a DOM node at current selection/caret location
     * tinymce.activeEditor.selection.setNode(tinymce.activeEditor.dom.create('img', {src: 'some.gif', title: 'some title'}));
     */
    setNode: function (elm) {
      var self = this;

      self.setContent(self.dom.getOuterHTML(elm));

      return elm;
    },

    /**
     * Returns the currently selected element or the common ancestor element for both start and end of the selection.
     *
     * @method getNode
     * @return {Element} Currently selected element or common ancestor element.
     * @example
     * // Alerts the currently selected elements node name
     * alert(tinymce.activeEditor.selection.getNode().nodeName);
     */
    getNode: function () {
      var self = this,
        rng = self.getRng(),
        elm;
      var startContainer, endContainer, startOffset, endOffset, root = self.dom.getRoot();

      function skipEmptyTextNodes(node, forwards) {
        var orig = node;

        while (node && node.nodeType === 3 && node.length === 0) {
          node = forwards ? node.nextSibling : node.previousSibling;
        }

        return node || orig;
      }

      // Range maybe lost after the editor is made visible again
      if (!rng) {
        return root;
      }

      startContainer = rng.startContainer;
      endContainer = rng.endContainer;
      startOffset = rng.startOffset;
      endOffset = rng.endOffset;

      if (rng.setStart) {
        elm = rng.commonAncestorContainer;

        // Handle selection a image or other control like element such as anchors
        if (!rng.collapsed) {
          if (startContainer == endContainer) {
            if (endOffset - startOffset < 2) {
              if (startContainer.hasChildNodes()) {
                elm = startContainer.childNodes[startOffset];
              }
            }
          }

          // If the anchor node is a element instead of a text node then return this element
          //if (tinymce.isWebKit && sel.anchorNode && sel.anchorNode.nodeType == 1)
          // return sel.anchorNode.childNodes[sel.anchorOffset];

          // Handle cases where the selection is immediately wrapped around a node and return that node instead of it's parent.
          // This happens when you double click an underlined word in FireFox.
          if (startContainer.nodeType === 3 && endContainer.nodeType === 3) {
            if (startContainer.length === startOffset) {
              startContainer = skipEmptyTextNodes(startContainer.nextSibling, true);
            } else {
              startContainer = startContainer.parentNode;
            }

            if (endOffset === 0) {
              endContainer = skipEmptyTextNodes(endContainer.previousSibling, false);
            } else {
              endContainer = endContainer.parentNode;
            }

            if (startContainer && startContainer === endContainer) {
              return startContainer;
            }
          }
        }

        if (elm && elm.nodeType == 3) {
          return elm.parentNode;
        }

        return elm;
      }

      elm = rng.item ? rng.item(0) : rng.parentElement();

      return elm;
    },

    getSelectedBlocks: function (startElm, endElm) {
      var self = this,
        dom = self.dom,
        node, root, selectedBlocks = [];

      root = dom.getRoot();
      startElm = dom.getParent(startElm || self.getStart(), dom.isBlock);
      endElm = dom.getParent(endElm || self.getEnd(), dom.isBlock);

      if (startElm && startElm != root) {
        selectedBlocks.push(startElm);
      }

      if (startElm && endElm && startElm != endElm) {
        node = startElm;

        var walker = new TreeWalker(startElm, root);
        while ((node = walker.next()) && node != endElm) {
          if (dom.isBlock(node)) {
            selectedBlocks.push(node);
          }
        }
      }

      if (endElm && startElm != endElm && endElm != root) {
        selectedBlocks.push(endElm);
      }

      return selectedBlocks;
    },

    isForward: function () {
      var dom = this.dom,
        sel = this.getSel(),
        anchorRange, focusRange;

      // No support for selection direction then always return true
      if (!sel || !sel.anchorNode || !sel.focusNode) {
        return true;
      }

      anchorRange = dom.createRng();
      anchorRange.setStart(sel.anchorNode, sel.anchorOffset);
      anchorRange.collapse(true);

      focusRange = dom.createRng();
      focusRange.setStart(sel.focusNode, sel.focusOffset);
      focusRange.collapse(true);

      return anchorRange.compareBoundaryPoints(anchorRange.START_TO_START, focusRange) <= 0;
    },

    normalize: function () {
      var self = this,
        rng = self.getRng();

      if (Env.range && new RangeUtils(self.dom).normalize(rng)) {
        self.setRng(rng, self.isForward());
      }

      return rng;
    },

    /**
     * Executes callback when the current selection starts/stops matching the specified selector. The current
     * state will be passed to the callback as it's first argument.
     *
     * @method selectorChanged
     * @param {String} selector CSS selector to check for.
     * @param {function} callback Callback with state and args when the selector is matches or not.
     */
    selectorChanged: function (selector, callback) {
      var self = this,
        currentSelectors;

      if (!self.selectorChangedData) {
        self.selectorChangedData = {};
        currentSelectors = {};

        self.editor.onNodeChange.addToTop(function (ed, cm, node) {
          var dom = self.dom,
            parents = dom.getParents(node, null, dom.getRoot()),
            matchedSelectors = {};

          // Check for new matching selectors
          each(self.selectorChangedData, function (callbacks, selector) {
            each(parents, function (node) {
              if (dom.is(node, selector)) {
                if (!currentSelectors[selector]) {
                  // Execute callbacks
                  each(callbacks, function (callback) {
                    callback(true, {
                      node: node,
                      selector: selector,
                      parents: parents
                    });
                  });

                  currentSelectors[selector] = callbacks;
                }

                matchedSelectors[selector] = callbacks;
                return false;
              }
            });
          });

          // Check if current selectors still match
          each(currentSelectors, function (callbacks, selector) {
            if (!matchedSelectors[selector]) {
              delete currentSelectors[selector];

              each(callbacks, function (callback) {
                callback(false, {
                  node: node,
                  selector: selector,
                  parents: parents
                });
              });
            }
          });
        });
      }

      // Add selector listeners
      if (!self.selectorChangedData[selector]) {
        self.selectorChangedData[selector] = [];
      }

      self.selectorChangedData[selector].push(callback);

      return self;
    },

    getScrollContainer: function () {
      var scrollContainer, node = this.dom.getRoot();

      while (node && node.nodeName != 'BODY') {
        if (node.scrollHeight > node.clientHeight) {
          scrollContainer = node;
          break;
        }

        node = node.parentNode;
      }

      return scrollContainer;
    },

    scrollIntoView: function (elm, alignToTop) {
      ScrollIntoView(this.editor, elm, alignToTop);
    },

    placeCaretAt: function (clientX, clientY) {
      this.setRng(RangeUtils.getCaretRangeFromPoint(clientX, clientY, this.editor.getDoc()));
    },

    _moveEndPoint: function (rng, node, start) {
      var root = node,
        walker = new TreeWalker(node, root);
      var nonEmptyElementsMap = this.dom.schema.getNonEmptyElements();

      do {
        // Text node
        if (node.nodeType == 3 && tinymce.trim(node.nodeValue).length !== 0) {
          if (start) {
            rng.setStart(node, 0);
          } else {
            rng.setEnd(node, node.nodeValue.length);
          }

          return;
        }

        // BR/IMG/INPUT elements but not table cells
        if (nonEmptyElementsMap[node.nodeName] && !/^(TD|TH)$/.test(node.nodeName)) {
          if (start) {
            rng.setStartBefore(node);
          } else {
            if (node.nodeName == 'BR') {
              rng.setEndBefore(node);
            } else {
              rng.setEndAfter(node);
            }
          }

          return;
        }
      } while ((node = (start ? walker.next() : walker.prev())));

      // Failed to find any text node or other suitable location then move to the root of body
      if (root.nodeName == 'BODY') {
        if (start) {
          rng.setStart(root, 0);
        } else {
          rng.setEnd(root, root.childNodes.length);
        }
      }
    },

    getBoundingClientRect: function () {
      var rng = this.getRng();
      return rng.collapsed ? CaretPosition.fromRangeStart(rng).getClientRects()[0] : rng.getBoundingClientRect();
    },

    destroy: function () {
      this.win = null;
      this.controlSelection.destroy();
    },

    // IE has an issue where you can't select/move the caret by clicking outside the body if the document is in standards mode
    _fixIESelection: function () {
      var dom = this.dom,
        doc = dom.doc,
        body = doc.body,
        started, startRng, htmlElm;

      // Return range from point or null if it failed
      function rngFromPoint(x, y) {
        var rng = body.createTextRange();

        try {
          rng.moveToPoint(x, y);
        } catch (ex) {
          // IE sometimes throws and exception, so lets just ignore it
          rng = null;
        }

        return rng;
      }

      // Fires while the selection is changing
      function selectionChange(e) {
        var pointRng;

        // Check if the button is down or not
        if (e.button) {
          // Create range from mouse position
          pointRng = rngFromPoint(e.x, e.y);

          if (pointRng) {
            // Check if pointRange is before/after selection then change the endPoint
            if (pointRng.compareEndPoints('StartToStart', startRng) > 0) {
              pointRng.setEndPoint('StartToStart', startRng);
            } else {
              pointRng.setEndPoint('EndToEnd', startRng);
            }

            pointRng.select();
          }
        } else {
          endSelection();
        }
      }

      // Removes listeners
      function endSelection() {
        var rng = doc.selection.createRange();

        // If the range is collapsed then use the last start range
        if (startRng && !rng.item && rng.compareEndPoints('StartToEnd', rng) === 0) {
          startRng.select();
        }

        dom.unbind(doc, 'mouseup', endSelection);
        dom.unbind(doc, 'mousemove', selectionChange);
        startRng = started = 0;
      }

      // Make HTML element unselectable since we are going to handle selection by hand
      doc.documentElement.unselectable = true;

      // Detect when user selects outside BODY
      dom.bind(doc, ['mousedown', 'contextmenu'], function (e) {
        if (e.target.nodeName === 'HTML') {
          if (started) {
            endSelection();
          }

          // Detect vertical scrollbar, since IE will fire a mousedown on the scrollbar and have target set as HTML
          htmlElm = doc.documentElement;
          if (htmlElm.scrollHeight > htmlElm.clientHeight) {
            return;
          }

          started = 1;
          // Setup start position
          startRng = rngFromPoint(e.x, e.y);
          if (startRng) {
            // Listen for selection change events
            dom.bind(doc, 'mouseup', endSelection);
            dom.bind(doc, 'mousemove', selectionChange);

            dom.win.focus();
            startRng.select();
          }
        }
      });
    }
  };
})(tinymce);