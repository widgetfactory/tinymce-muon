/**
 * Selection.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

(function (tinymce) {
	// Shorten names
	var is = tinymce.is,
		isIE = tinymce.isIE,
		each = tinymce.each,
		TreeWalker = tinymce.dom.TreeWalker;

	/**
	 * This class handles text and control selection it's an crossbrowser utility class.
	 * Consult the TinyMCE Wiki API for more details and examples on how to use this class.
	 *
	 * @class tinymce.dom.Selection
	 * @example
	 * // Getting the currently selected node for the active editor
	 * alert(tinymce.activeEditor.selection.getNode().nodeName);
	 */
	tinymce.create('tinymce.dom.Selection', {
		/**
		 * Constructs a new selection instance.
		 *
		 * @constructor
		 * @method Selection
		 * @param {tinymce.dom.DOMUtils} dom DOMUtils object reference.
		 * @param {Window} win Window to bind the selection object to.
		 * @param {tinymce.dom.Serializer} serializer DOM serialization class to use for getContent.
		 */
		Selection: function (dom, win, serializer, editor) {
			var self = this;

			self.dom = dom;
			self.win = win;
			self.serializer = serializer;
			self.editor = editor;

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
				'onGetContent'
			], function (e) {
				self[e] = new tinymce.util.Dispatcher(self);
			});

			if (tinymce.isIE && !tinymce.isIE11 && dom.boxModel) {
				this._fixIESelection();
			}

			// Prevent leaks
			tinymce.addUnload(self.destroy, self);
		},

		/**
		 * Move the selection cursor range to the specified node and offset.
		 * @param node Node to put the cursor in.
		 * @param offset Offset from the start of the node to put the cursor at.
		 */
		setCursorLocation: function (node, offset) {
			var self = this;
			var r = self.dom.createRng();
			r.setStart(node, offset);
			r.setEnd(node, offset);
			self.setRng(r);
			self.collapse(false);
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

			var tableCells = dom.select('td.mceSelected, th.mceSelected', node);

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
		 * @param {Object} s Optional settings class with for example output format text or html.
		 * @return {String} Selected contents in for example HTML format.
		 * @example
		 * // Alerts the currently selected contents
		 * alert(tinyMCE.activeEditor.selection.getContent());
		 *
		 * // Alerts the currently selected contents as plain text
		 * alert(tinyMCE.activeEditor.selection.getContent({format : 'text'}));
		 */
		getContent: function (s) {
			var self = this,
				r = self.getRng(),
				e = self.dom.create("body"),
				se = self.getSel(),
				wb, wa, frag;

			s = s || {};
			wb = wa = '';
			s.get = true;
			s.format = s.format || 'html';
			s.forced_root_block = '';
			self.onBeforeGetContent.dispatch(self, s);

			if (s.format == 'text') {
				return self.isCollapsed() ? '' : (r.text || (se.toString ? se.toString() : ''));
			}

			if (r.cloneContents) {
				frag = r.cloneContents();

				if (frag) {

					// internal content selection for cut/copy
					if (s.contextual) {
						frag = self.getContextualFragment(r, frag);
					}

					e.appendChild(frag);
				}
			} else if (is(r.item) || is(r.htmlText)) {
				// IE will produce invalid markup if elements are present that
				// it doesn't understand like custom elements or HTML5 elements.
				// Adding a BR in front of the contents and then remoiving it seems to fix it though.
				e.innerHTML = '<br>' + (r.item ? r.item(0).outerHTML : r.htmlText);
				e.removeChild(e.firstChild);
			} else {
				e.innerHTML = r.toString();
			}

			// Keep whitespace before and after
			if (/^\s/.test(e.innerHTML)) {
				wb = ' ';
			}

			if (/\s+$/.test(e.innerHTML)) {
				wa = ' ';
			}

			s.getInner = true;

			s.content = self.isCollapsed() ? '' : wb + self.serializer.serialize(e, s) + wa;

			self.onGetContent.dispatch(self, s);

			return s.content;
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
		 * tinyMCE.activeEditor.selection.setContent('<strong>Some contents</strong>');
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
			content = args.content = content;

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
		 * @return {Element} Start element of selection range.
		 */
		getStart: function () {
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

				while (node = node.parentNode) {
					if (node == startElement) {
						startElement = parentElement;
						break;
					}
				}

				return startElement;
			} else {
				startElement = rng.startContainer;

				if (startElement.nodeType == 1 && startElement.hasChildNodes()) {
					startElement = startElement.childNodes[Math.min(startElement.childNodes.length - 1, rng.startOffset)];
				}

				if (startElement && startElement.nodeType == 3) {
					return startElement.parentNode;
				}

				return startElement;
			}
		},

		/**
		 * Returns the end element of a selection range. If the end is in a text
		 * node the parent element will be returned.
		 *
		 * @method getEnd
		 * @return {Element} End element of selection range.
		 */
		getEnd: function () {
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
			} else {
				endElement = rng.endContainer;
				endOffset = rng.endOffset;

				if (endElement.nodeType == 1 && endElement.hasChildNodes()) {
					endElement = endElement.childNodes[endOffset > 0 ? endOffset - 1 : endOffset];
				}

				if (endElement && endElement.nodeType == 3) {
					return endElement.parentNode;
				}

				return endElement;
			}
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
		 * var bm = tinyMCE.activeEditor.selection.getBookmark();
		 *
		 * tinyMCE.activeEditor.setContent(tinyMCE.activeEditor.getContent() + 'Some new content');
		 *
		 * // Restore the selection bookmark
		 * tinyMCE.activeEditor.selection.moveToBookmark(bm);
		 */
		getBookmark: function (type, normalized) {
			var self = this,
				dom = self.dom,
				rng, rng2, id, collapsed, name, element, chr = '\uFEFF',
				styles;

			function findIndex(name, element) {
				var index = 0;

				each(dom.select(name), function (node, i) {
					if (node == element) {
						index = i;
					}
				});

				return index;
			}

			function normalizeTableCellSelection(rng) {
				function moveEndPoint(start) {
					var container, offset, childNodes, prefix = start ? 'start' : 'end';

					container = rng[prefix + 'Container'];
					offset = rng[prefix + 'Offset'];

					if (container.nodeType == 1 && container.nodeName == "TR") {
						childNodes = container.childNodes;
						container = childNodes[Math.min(start ? offset : offset - 1, childNodes.length - 1)];
						if (container) {
							offset = start ? 0 : container.childNodes.length;
							rng['set' + (start ? 'Start' : 'End')](container, offset);
						}
					}
				}

				moveEndPoint(true);
				moveEndPoint();

				return rng;
			}

			function getLocation() {
				var rng = self.getRng(true),
					root = dom.getRoot(),
					bookmark = {};

				function getPoint(rng, start) {
					var container = rng[start ? 'startContainer' : 'endContainer'],
						offset = rng[start ? 'startOffset' : 'endOffset'],
						point = [],
						node, childNodes, after = 0;

					if (container.nodeType == 3) {
						if (normalized) {
							for (node = container.previousSibling; node && node.nodeType == 3; node = node.previousSibling) {
								offset += node.nodeValue.length;
							}
						}

						point.push(offset);
					} else {
						childNodes = container.childNodes;

						if (offset >= childNodes.length && childNodes.length) {
							after = 1;
							offset = Math.max(0, childNodes.length - 1);
						}

						point.push(self.dom.nodeIndex(childNodes[offset], normalized) + after);
					}

					for (; container && container != root; container = container.parentNode) {
						point.push(self.dom.nodeIndex(container, normalized));
					}

					return point;
				}

				bookmark.start = getPoint(rng, true);

				if (!self.isCollapsed()) {
					bookmark.end = getPoint(rng);
				}

				return bookmark;
			}

			if (type == 2) {
				return getLocation();
			}

			// Handle simple range
			if (type) {
				rng = self.getRng();

				if (rng.setStart) {
					rng = {
						startContainer: rng.startContainer,
						startOffset: rng.startOffset,
						endContainer: rng.endContainer,
						endOffset: rng.endOffset
					};
				}

				return {
					rng: rng
				};
			}

			rng = self.getRng();
			id = dom.uniqueId();
			collapsed = tinyMCE.activeEditor.selection.isCollapsed();
			styles = 'overflow:hidden;line-height:0px';

			// Explorer method
			if (rng.duplicate || rng.item) {
				// Text selection
				if (!rng.item) {
					rng2 = rng.duplicate();

					try {
						// Insert start marker
						rng.collapse();
						rng.pasteHTML('<span data-mce-type="bookmark" id="' + id + '_start" style="' + styles + '">' + chr + '</span>');

						// Insert end marker
						if (!collapsed) {
							rng2.collapse(false);

							// Detect the empty space after block elements in IE and move the end back one character <p></p>] becomes <p>]</p>
							rng.moveToElementText(rng2.parentElement());
							if (rng.compareEndPoints('StartToEnd', rng2) === 0) {
								rng2.move('character', -1);
							}

							rng2.pasteHTML('<span data-mce-type="bookmark" id="' + id + '_end" style="' + styles + '">' + chr + '</span>');
						}
					} catch (ex) {
						// IE might throw unspecified error so lets ignore it
						return null;
					}
				} else {
					// Control selection
					element = rng.item(0);
					name = element.nodeName;

					return {
						name: name,
						index: findIndex(name, element)
					};
				}
			} else {
				element = self.getNode();
				name = element.nodeName;
				if (name == 'IMG') {
					return {
						name: name,
						index: findIndex(name, element)
					};
				}

				// W3C method
				rng2 = normalizeTableCellSelection(rng.cloneRange());

				// Insert end marker
				if (!collapsed) {
					rng2.collapse(false);
					rng2.insertNode(dom.create('span', {
						'data-mce-type': "bookmark",
						id: id + '_end',
						style: styles
					}, chr));
				}

				rng = normalizeTableCellSelection(rng);
				rng.collapse(true);
				rng.insertNode(dom.create('span', {
					'data-mce-type': "bookmark",
					id: id + '_start',
					style: styles
				}, chr));
			}

			self.moveToBookmark({
				id: id,
				keep: 1
			});

			return {
				id: id
			};
		},

		/**
		 * Restores the selection to the specified bookmark.
		 *
		 * @method moveToBookmark
		 * @param {Object} bookmark Bookmark to restore selection from.
		 * @return {Boolean} true/false if it was successful or not.
		 * @example
		 * // Stores a bookmark of the current selection
		 * var bm = tinyMCE.activeEditor.selection.getBookmark();
		 *
		 * tinyMCE.activeEditor.setContent(tinyMCE.activeEditor.getContent() + 'Some new content');
		 *
		 * // Restore the selection bookmark
		 * tinyMCE.activeEditor.selection.moveToBookmark(bm);
		 */
		moveToBookmark: function (bookmark) {
			var self = this,
				dom = self.dom,
				rng, rng2, root, startContainer, endContainer, startOffset, endOffset;

			function setEndPoint(start) {
				var point = bookmark[start ? 'start' : 'end'],
					i, node, offset, children;

				if (point) {
					offset = point[0];

					// Find container node
					for (node = root, i = point.length - 1; i >= 1; i--) {
						children = node.childNodes;

						if (point[i] > children.length - 1) {
							return;
						}

						node = children[point[i]];
					}

					// Move text offset to best suitable location
					if (node.nodeType === 3) {
						offset = Math.min(point[0], node.nodeValue.length);
					}

					// Move element offset to best suitable location
					if (node.nodeType === 1) {
						offset = Math.min(point[0], node.childNodes.length);
					}

					// Set offset within container node
					if (start) {
						rng.setStart(node, offset);
					} else {
						rng.setEnd(node, offset);
					}
				}

				return true;
			}

			function restoreEndPoint(suffix) {
				var marker = dom.get(bookmark.id + '_' + suffix),
					node, idx, next, prev, keep = bookmark.keep;

				if (marker) {
					node = marker.parentNode;

					if (suffix == 'start') {
						if (!keep) {
							idx = dom.nodeIndex(marker);
						} else {
							node = marker.firstChild;
							idx = 1;
						}

						startContainer = endContainer = node;
						startOffset = endOffset = idx;
					} else {
						if (!keep) {
							idx = dom.nodeIndex(marker);
						} else {
							node = marker.firstChild;
							idx = 1;
						}

						endContainer = node;
						endOffset = idx;
					}

					if (!keep) {
						prev = marker.previousSibling;
						next = marker.nextSibling;

						// Remove all marker text nodes
						each(tinymce.grep(marker.childNodes), function (node) {
							if (node.nodeType == 3) {
								node.nodeValue = node.nodeValue.replace(/\uFEFF/g, '');
							}
						});

						// Remove marker but keep children if for example contents where inserted into the marker
						// Also remove duplicated instances of the marker for example by a split operation or by WebKit auto split on paste feature
						while (marker = dom.get(bookmark.id + '_' + suffix)) {
							dom.remove(marker, 1);
						}

						// If siblings are text nodes then merge them unless it's Opera since it some how removes the node
						// and we are sniffing since adding a lot of detection code for a browser with 3% of the market isn't worth the effort. Sorry, Opera but it's just a fact
						if (prev && next && prev.nodeType == next.nodeType && prev.nodeType == 3 && !tinymce.isOpera) {
							idx = prev.nodeValue.length;
							prev.appendData(next.nodeValue);
							dom.remove(next);

							if (suffix == 'start') {
								startContainer = endContainer = prev;
								startOffset = endOffset = idx;
							} else {
								endContainer = prev;
								endOffset = idx;
							}
						}
					}
				}
			}

			function addBogus(node) {
				// Adds a bogus BR element for empty block elements
				if (dom.isBlock(node) && !node.innerHTML && !isIE) {
					node.innerHTML = '<br data-mce-bogus="1" />';
				}

				return node;
			}

			if (bookmark) {
				if (bookmark.start) {
					rng = dom.createRng();
					root = dom.getRoot();

					if (setEndPoint(true) && setEndPoint()) {
						self.setRng(rng);
					}
				} else if (bookmark.id) {
					// Restore start/end points
					restoreEndPoint('start');
					restoreEndPoint('end');

					if (startContainer) {
						rng = dom.createRng();
						rng.setStart(addBogus(startContainer), startOffset);
						rng.setEnd(addBogus(endContainer), endOffset);
						self.setRng(rng);
					}
				} else if (bookmark.name) {
					self.select(dom.select(bookmark.name)[bookmark.index]);
				} else if (bookmark.rng) {
					rng = bookmark.rng;

					if (rng.startContainer) {
						rng2 = self.dom.createRng();

						try {
							rng2.setStart(rng.startContainer, rng.startOffset);
							rng2.setEnd(rng.endContainer, rng.endOffset);
						} catch (e) {
							// Might fail with index error
						}

						rng = rng2;
					}

					self.setRng(rng);
				}
			}
		},

		/**
		 * Selects the specified element. This will place the start and end of the selection range around the element.
		 *
		 * @method select
		 * @param {Element} node HMTL DOM element to select.
		 * @param {Boolean} content Optional bool state if the contents should be selected or not on non IE browser.
		 * @return {Element} Selected element the same element as the one that got passed in.
		 * @example
		 * // Select the first paragraph in the active editor
		 * tinyMCE.activeEditor.selection.select(tinyMCE.activeEditor.dom.select('p')[0]);
		 */
		select: function (node, content) {
			var self = this,
				dom = self.dom,
				rng = dom.createRng(),
				idx;

			function setPoint(node, start) {
				var walker = new TreeWalker(node, node);

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

					// BR element
					if (node.nodeName == 'BR') {
						if (start) {
							rng.setStartBefore(node);
						} else {
							rng.setEndBefore(node);
						}

						return;
					}
				} while (node = (start ? walker.next() : walker.prev()));
			}

			if (node) {
				idx = dom.nodeIndex(node);
				rng.setStart(node.parentNode, idx);
				rng.setEnd(node.parentNode, idx + 1);

				// Find first/last text node or BR element
				if (content) {
					setPoint(node, 1);
					setPoint(node);
				}

				self.setRng(rng);
			}

			return node;
		},

		/**
		 * Returns true/false if the selection range is collapsed or not. Collapsed means if it's a caret or a larger selection.
		 *
		 * @method isCollapsed
		 * @return {Boolean} true/false state if the selection range is collapsed or not. Collapsed means if it's a caret or a larger selection.
		 */
		isCollapsed: function () {
			var self = this,
				r = self.getRng(),
				s = self.getSel();

			if (!r || r.item) {
				return false;
			}

			if (r.compareEndPoints) {
				return r.compareEndPoints('StartToEnd', r) === 0;
			}

			return !s || r.collapsed;
		},

		/**
		 * Collapse the selection to start or end of range.
		 *
		 * @method collapse
		 * @param {Boolean} to_start Optional boolean state if to collapse to end or not. Defaults to start.
		 */
		collapse: function (to_start) {
			var self = this,
				rng = self.getRng(),
				node;

			// Control range on IE
			if (rng.item) {
				node = rng.item(0);
				rng = self.win.document.body.createTextRange();
				rng.moveToElementText(node);
			}

			rng.collapse(!!to_start);
			self.setRng(rng);
		},

		/**
		 * Returns the browsers internal selection object.
		 *
		 * @method getSel
		 * @return {Selection} Internal browser selection object.
		 */
		getSel: function () {
			var w = this.win;

			return w.getSelection ? w.getSelection() : w.document.selection;
		},

		/**
		 * Returns the browsers internal range object.
		 *
		 * @method getRng
		 * @return {Range} Internal browser range object.
		 * @see http://www.quirksmode.org/dom/range_intro.html
		 * @see http://www.dotvoid.com/2001/03/using-the-range-object-in-mozilla/
		 */
		getRng: function () {
			var self = this,
				selection, rng, elm, doc = self.win.document;

			// Workaround for IE 11 not being able to select images properly see #6613 see quirk fix
			if (self.fakeRng) {
				return self.fakeRng;
			}

			try {
				if (selection = self.getSel()) {
					rng = selection.rangeCount > 0 ? selection.getRangeAt(0) : (selection.createRange ? selection.createRange() : doc.createRange());
				}
			} catch (ex) {
				// IE throws unspecified error here if TinyMCE is placed in a frame/iframe
			}

			// No range found then create an empty one
			// This can occur when the editor is placed in a hidden container element on Gecko
			// Or on IE when there was an exception
			if (!rng) {
				rng = doc.createRange();
			}

			// If range is at start of document then move it to start of body
			if (rng.setStart && rng.startContainer.nodeType === 9 && rng.collapsed) {
				elm = self.dom.getRoot();
				rng.setStart(elm, 0);
				rng.setEnd(elm, 0);
			}

			if (self.selectedRange && self.explicitRange) {
				if (rng.compareBoundaryPoints(rng.START_TO_START, self.selectedRange) === 0 && rng.compareBoundaryPoints(rng.END_TO_END, self.selectedRange) === 0) {
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
		 * @param {Range} r Range to select.
		 */
		setRng: function (r, forward) {
			var s, self = this;

			if (!r) {
				return;
			}

			// Is IE specific range
			if (r.select) {
				try {
					r.select();
				} catch (ex) {
					// Needed for some odd IE bug #1843306
				}

				return;
			}

			s = self.getSel();

			if (s) {
				self.explicitRange = r;

				try {
					s.removeAllRanges();
					s.addRange(r);
				} catch (ex) {
					// IE might throw errors here if the editor is within a hidden container and selection is changed
				}

				// Forward is set to false and we have an extend function
				if (forward === false && s.extend) {
					s.collapse(r.endContainer, r.endOffset);
					s.extend(r.startContainer, r.startOffset);
				}

				// adding range isn't always successful so we need to check range count otherwise an exception can occur
				self.selectedRange = s.rangeCount > 0 ? s.getRangeAt(0) : null;
			}
		},

		/**
		 * Sets the current selection to the specified DOM element.
		 *
		 * @method setNode
		 * @param {Element} n Element to set as the contents of the selection.
		 * @return {Element} Returns the element that got passed in.
		 * @example
		 * // Inserts a DOM node at current selection/caret location
		 * tinyMCE.activeEditor.selection.setNode(tinyMCE.activeEditor.dom.create('img', {src : 'some.gif', title : 'some title'}));
		 */
		setNode: function (n) {
			var self = this;

			self.setContent(self.dom.getOuterHTML(n));

			return n;
		},

		/**
		 * Returns the currently selected element or the common ancestor element for both start and end of the selection.
		 *
		 * @method getNode
		 * @return {Element} Currently selected element or common ancestor element.
		 * @example
		 * // Alerts the currently selected elements node name
		 * alert(tinyMCE.activeEditor.selection.getNode().nodeName);
		 */
		getNode: function () {
			var self = this,
				rng = self.getRng(),
				elm, start = rng.startContainer,
				end = rng.endContainer;

			function skipEmptyTextNodes(n, forwards) {
				var orig = n;
				while (n && n.nodeType === 3 && n.length === 0) {
					n = forwards ? n.nextSibling : n.previousSibling;
				}
				return n || orig;
			}

			// Range maybe lost after the editor is made visible again
			if (!rng) {
				return self.dom.getRoot();
			}

			if (rng.setStart) {
				elm = rng.commonAncestorContainer;

				// Handle selection a image or other control like element such as anchors
				if (!rng.collapsed) {
					if (rng.startContainer == rng.endContainer) {
						if (rng.endOffset - rng.startOffset < 2) {
							if (rng.startContainer.hasChildNodes()) {
								elm = rng.startContainer.childNodes[rng.startOffset];
							}
						}
					}

					// If the anchor node is a element instead of a text node then return this element
					//if (tinymce.isWebKit && sel.anchorNode && sel.anchorNode.nodeType == 1)
					//	return sel.anchorNode.childNodes[sel.anchorOffset];

					// Handle cases where the selection is immediately wrapped around a node and return that node instead of it's parent.
					// This happens when you double click an underlined word in FireFox.
					if (start.nodeType === 3 && end.nodeType === 3) {
						if (start.length === rng.startOffset) {
							start = skipEmptyTextNodes(start.nextSibling, true);
						} else {
							start = start.parentNode;
						}
						if (rng.endOffset === 0) {
							end = skipEmptyTextNodes(end.previousSibling, false);
						} else {
							end = end.parentNode;
						}

						if (start && start === end) {
							return start;
						}
					}
				}

				if (elm && elm.nodeType == 3) {
					return elm.parentNode;
				}

				return elm;
			}

			return rng.item ? rng.item(0) : rng.parentElement();
		},

		getSelectedBlocks: function (st, en) {
			var self = this,
				dom = self.dom,
				sb, eb, n, bl = [];

			sb = dom.getParent(st || self.getStart(), dom.isBlock);
			eb = dom.getParent(en || self.getEnd(), dom.isBlock);

			if (sb) {
				bl.push(sb);
			}

			if (sb && eb && sb != eb) {
				n = sb;

				var walker = new TreeWalker(sb, dom.getRoot());
				while ((n = walker.next()) && n != eb) {
					if (dom.isBlock(n)) {
						bl.push(n);
					}
				}
			}

			if (eb && sb != eb) {
				bl.push(eb);
			}

			return bl;
		},

		isForward: function () {
			var dom = this.dom,
				sel = this.getSel(),
				anchorRange, focusRange;

			// No support for selection direction then always return true
			if (!sel || sel.anchorNode == null || sel.focusNode == null) {
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
				rng, normalized, collapsed;

			function normalizeEndPoint(start) {
				var container, offset, walker, dom = self.dom,
					body = dom.getRoot(),
					node, nonEmptyElementsMap;

				function hasBrBeforeAfter(node, left) {
					var walker = new TreeWalker(node, dom.getParent(node.parentNode, dom.isBlock) || body);

					while (node = walker[left ? 'prev' : 'next']()) {
						if (node.nodeName === "BR") {
							return true;
						}
					}
				}

				// Walks the dom left/right to find a suitable text node to move the endpoint into
				// It will only walk within the current parent block or body and will stop if it hits a block or a BR/IMG
				function findTextNodeRelative(left, startNode) {
					var walker, lastInlineElement;

					startNode = startNode || container;
					walker = new TreeWalker(startNode, dom.getParent(startNode.parentNode, dom.isBlock) || body);

					// Walk left until we hit a text node we can move to or a block/br/img
					while (node = walker[left ? 'prev' : 'next']()) {
						// Found text node that has a length
						if (node.nodeType === 3 && node.nodeValue.length > 0) {
							container = node;
							offset = left ? node.nodeValue.length : 0;
							normalized = true;
							return;
						}

						// Break if we find a block or a BR/IMG/INPUT etc
						if (dom.isBlock(node) || nonEmptyElementsMap[node.nodeName.toLowerCase()]) {
							return;
						}

						lastInlineElement = node;
					}

					// Only fetch the last inline element when in caret mode for now
					if (collapsed && lastInlineElement) {
						container = lastInlineElement;
						normalized = true;
						offset = 0;
					}
				}

				container = rng[(start ? 'start' : 'end') + 'Container'];
				offset = rng[(start ? 'start' : 'end') + 'Offset'];
				nonEmptyElementsMap = dom.schema.getNonEmptyElements();

				// If the container is a document move it to the body element
				if (container.nodeType === 9) {
					container = dom.getRoot();
					offset = 0;
				}

				// If the container is body try move it into the closest text node or position
				if (container === body) {
					// If start is before/after a image, table etc
					if (start) {
						node = container.childNodes[offset > 0 ? offset - 1 : 0];
						if (node) {
							if (nonEmptyElementsMap[node.nodeName] || node.nodeName == "TABLE") {
								return;
							}
						}
					}

					// Resolve the index
					if (container.hasChildNodes()) {
						container = container.childNodes[Math.min(!start && offset > 0 ? offset - 1 : offset, container.childNodes.length - 1)];
						offset = 0;

						// Don't walk into elements that doesn't have any child nodes like a IMG
						if (container.hasChildNodes() && !/TABLE/.test(container.nodeName)) {
							// Walk the DOM to find a text node to place the caret at or a BR
							node = container;
							walker = new TreeWalker(container, body);

							do {
								// Found a text node use that position
								if (node.nodeType === 3 && node.nodeValue.length > 0) {
									offset = start ? 0 : node.nodeValue.length;
									container = node;
									normalized = true;
									break;
								}

								// Found a BR/IMG element that we can place the caret before
								if (nonEmptyElementsMap[node.nodeName.toLowerCase()]) {
									offset = dom.nodeIndex(node);
									container = node.parentNode;

									// Put caret after image when moving the end point
									if (node.nodeName == "IMG" && !start) {
										offset++;
									}

									normalized = true;
									break;
								}
							} while (node = (start ? walker.next() : walker.prev()));
						}
					}
				}

				// Lean the caret to the left if possible
				if (collapsed) {
					// So this: <b>x</b><i>|x</i>
					// Becomes: <b>x|</b><i>x</i>
					// Seems that only gecko has issues with this
					if (container.nodeType === 3 && offset === 0) {
						findTextNodeRelative(true);
					}

					// Lean left into empty inline elements when the caret is before a BR
					// So this: <i><b></b><i>|<br></i>
					// Becomes: <i><b>|</b><i><br></i>
					// Seems that only gecko has issues with this
					if (container.nodeType === 1) {
						node = container.childNodes[offset];
						if (node && node.nodeName === 'BR' && !hasBrBeforeAfter(node) && !hasBrBeforeAfter(node, true)) {
							findTextNodeRelative(true, container.childNodes[offset]);
						}
					}
				}

				// Lean the start of the selection right if possible
				// So this: x[<b>x]</b>
				// Becomes: x<b>[x]</b>
				if (start && !collapsed && container.nodeType === 3 && offset === container.nodeValue.length) {
					findTextNodeRelative(false);
				}

				// Set endpoint if it was normalized
				if (normalized) {
					rng['set' + (start ? 'Start' : 'End')](container, offset);
				}
			}

			// Normalize only on non IE browsers for now
			if (tinymce.isIE) {
				return;
			}

			rng = self.getRng();
			collapsed = rng.collapsed;

			// Normalize the end points
			normalizeEndPoint(true);

			if (!collapsed) {
				normalizeEndPoint();
			}

			// Set the selection if it was normalized
			if (normalized) {
				// If it was collapsed then make sure it still is
				if (collapsed) {
					rng.collapse(true);
				}

				//console.log(self.dom.dumpRng(rng));
				self.setRng(rng, self.isForward());
			}
		},

		/**
		 * Executes callback of the current selection matches the specified selector or not and passes the state and args to the callback.
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

		scrollIntoView: function (elm) {
			var y, viewPort, self = this,
				dom = self.dom;

			viewPort = dom.getViewPort(self.editor.getWin());
			y = dom.getPos(elm).y;
			if (y < viewPort.y || y + 25 > viewPort.y + viewPort.h) {
				self.editor.getWin().scrollTo(0, y < viewPort.y ? y : y - viewPort.h + 25);
			}
		},

		placeCaretAt: function (clientX, clientY) {
			this.setRng(tinymce.dom.RangeUtils.getCaretRangeFromPoint(clientX, clientY, this.editor.getDoc()));
		},

		destroy: function (manual) {
			var self = this;

			self.win = null;

			// Manual destroy then remove unload handler
			if (!manual) {
				tinymce.removeUnload(self.destroy);
			}
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
	});
})(tinymce);