/**
 * Quirks.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

/**
 * This file includes fixes for various browser quirks it's made to make it easy to add/remove browser specific fixes.
 */
tinymce.util.Quirks = function (editor) {
	var VK = tinymce.VK,
		BACKSPACE = VK.BACKSPACE,
		DELETE = VK.DELETE,
		dom = editor.dom,
		selection = editor.selection,
		settings = editor.settings,
		parser = editor.parser,
		serializer = editor.serializer,
		each = tinymce.each,
		RangeUtils = tinymce.dom.RangeUtils,
		TreeWalker = tinymce.dom.TreeWalker;
	/**
	 * Executes a command with a specific state this can be to enable/disable browser editing features.
	 */
	function setEditorCommandState(cmd, state) {
		try {
			editor.getDoc().execCommand(cmd, false, state);
		} catch (ex) {
			// Ignore
		}
	}

	/**
	 * Returns current IE document mode.
	 */
	function getDocumentMode() {
		var documentMode = editor.getDoc().documentMode;

		return documentMode ? documentMode : 6;
	};

	/**
	 * Returns true/false if the event is prevented or not.
	 *
	 * @param {Event} e Event object.
	 * @return {Boolean} true/false if the event is prevented or not.
	 */
	function isDefaultPrevented(e) {
		return e.isDefaultPrevented();
	};

	/**
	 * Fixes a WebKit bug when deleting contents using backspace or delete key.
	 * WebKit will produce a span element if you delete across two block elements.
	 *
	 * Example:
	 * <h1>a</h1><p>|b</p>
	 *
	 * Will produce this on backspace:
	 * <h1>a<span style="<all runtime styles>">b</span></p>
	 *
	 * This fixes the backspace to produce:
	 * <h1>a|b</p>
	 *
	 * See bug: https://bugs.webkit.org/show_bug.cgi?id=45784
	 *
	 * This fixes the following delete scenarios:
	 *  1. Delete by pressing backspace key.
	 *  2. Delete by pressing delete key.
	 *  3. Delete by pressing backspace key with ctrl/cmd (Word delete).
	 *  4. Delete by pressing delete key with ctrl/cmd (Word delete).
	 *  5. Delete by drag/dropping contents inside the editor.
	 *  6. Delete by using Cut Ctrl+X/Cmd+X.
	 *  7. Delete by selecting contents and writing a character.
	 *
	 * This code is a ugly hack since writing full custom delete logic for just this bug
	 * fix seemed like a huge task. I hope we can remove this before the year 2030.
	 */
	function cleanupStylesWhenDeleting() {
		var doc = editor.getDoc(),
			dom = editor.dom,
			selection = editor.selection;
		var MutationObserver = window.MutationObserver, dragStartRng;

		function isTrailingBr(node) {
			var blockElements = dom.schema.getBlockElements(),
				rootNode = editor.getBody();

			if (node.nodeName != 'BR') {
				return false;
			}

			for (; node != rootNode && !blockElements[node.nodeName]; node = node.parentNode) {
				if (node.nextSibling) {
					return false;
				}
			}

			return true;
		}

		function isSiblingsIgnoreWhiteSpace(node1, node2) {
			var node;

			for (node = node1.nextSibling; node && node != node2; node = node.nextSibling) {
				if (node.nodeType == 3 && $.trim(node.data).length === 0) {
					continue;
				}

				if (node !== node2) {
					return false;
				}
			}

			return node === node2;
		}

		function findCaretNode(node, forward, startNode) {
			var walker, current, nonEmptyElements;

			// Protect against the possibility we are asked to find a caret node relative
			// to a node that is no longer in the DOM tree. In this case attempting to
			// select on any match leads to a scenario where selection is completely removed
			// from the editor. This scenario is met in real world at a minimum on
			// WebKit browsers when selecting all and Cmd-X cutting to delete content.
			if (!dom.isChildOf(node, editor.getBody())) {
				return;
			}

			nonEmptyElements = dom.schema.getNonEmptyElements();

			walker = new TreeWalker(startNode || node, node);

			while ((current = walker[forward ? 'next' : 'prev']())) {
				if (nonEmptyElements[current.nodeName] && !isTrailingBr(current)) {
					return current;
				}

				if (current.nodeType == 3 && current.data.length > 0) {
					return current;
				}
			}
		}

		function deleteRangeBetweenTextBlocks(rng) {
			var startBlock, endBlock, caretNodeBefore, caretNodeAfter, textBlockElements;

			if (rng.collapsed) {
				return;
			}

			startBlock = dom.getParent(RangeUtils.getNode(rng.startContainer, rng.startOffset), dom.isBlock);
			endBlock = dom.getParent(RangeUtils.getNode(rng.endContainer, rng.endOffset), dom.isBlock);
			textBlockElements = editor.schema.getTextBlockElements();

			if (startBlock == endBlock) {
				return;
			}

			if (!textBlockElements[startBlock.nodeName] || !textBlockElements[endBlock.nodeName]) {
				return;
			}

			if (dom.getContentEditable(startBlock) === "false" || dom.getContentEditable(endBlock) === "false") {
				return;
			}

			rng.deleteContents();

			caretNodeBefore = findCaretNode(startBlock, false);
			caretNodeAfter = findCaretNode(endBlock, true);

			if (dom.isEmpty(startBlock)) {
				dom.remove(startBlock);
			}

			if (dom.isEmpty(endBlock)) {
				dom.remove(endBlock);
			}

			// backspace from the beginning of one block element into the previous block element...
			if (caretNodeBefore && caretNodeAfter) {
				if (!dom.isEmpty(endBlock)) {
					tinymce.each(endBlock.childNodes, function (node) {
						if (node) {
							startBlock.appendChild(node);
						}
					});
				}
	
				dom.remove(endBlock);
			}

			if (caretNodeBefore) {
				if (caretNodeBefore.nodeType == 1) {
					if (caretNodeBefore.nodeName == "BR") {
						rng.setStartBefore(caretNodeBefore);
						rng.setEndBefore(caretNodeBefore);
					} else {
						rng.setStartAfter(caretNodeBefore);
						rng.setEndAfter(caretNodeBefore);
					}
				} else {
					rng.setStart(caretNodeBefore, caretNodeBefore.data.length);
					rng.setEnd(caretNodeBefore, caretNodeBefore.data.length);
				}
			} else if (caretNodeAfter) {
				if (caretNodeAfter.nodeType == 1) {
					rng.setStartBefore(caretNodeAfter);
					rng.setEndBefore(caretNodeAfter);
				} else {
					rng.setStart(caretNodeAfter, 0);
					rng.setEnd(caretNodeAfter, 0);
				}
			}

			selection.setRng(rng);

			return true;
		}

		function expandBetweenBlocks(rng, isForward) {
			var caretNode, targetCaretNode, textBlock, targetTextBlock, container, offset;

			if (!rng.collapsed) {
				return rng;
			}

			container = rng.startContainer;
			offset = rng.startOffset;

			if (container.nodeType == 3) {
				if (isForward) {
					if (offset < container.data.length) {
						return rng;
					}
				} else {
					if (offset > 0) {
						return rng;
					}
				}
			}

			caretNode = RangeUtils.getNode(container, offset);
			textBlock = dom.getParent(caretNode, dom.isBlock);
			targetCaretNode = findCaretNode(editor.getBody(), isForward, caretNode);
			targetTextBlock = dom.getParent(targetCaretNode, dom.isBlock);
			var isAfter = container.nodeType === 1 && offset > container.childNodes.length - 1;

			if (!caretNode || !targetCaretNode) {
				return rng;
			}

			if (targetTextBlock && textBlock != targetTextBlock) {
				if (!isForward) {
					if (!isSiblingsIgnoreWhiteSpace(targetTextBlock, textBlock)) {
						return rng;
					}

					if (targetCaretNode.nodeType == 1) {
						if (targetCaretNode.nodeName == "BR") {
							rng.setStartBefore(targetCaretNode);
						} else {
							rng.setStartAfter(targetCaretNode);
						}
					} else {
						rng.setStart(targetCaretNode, targetCaretNode.data.length);
					}

					if (caretNode.nodeType == 1) {
						if (isAfter) {
							rng.setEndAfter(caretNode);
						} else {
							rng.setEndBefore(caretNode);
						}
					} else {
						rng.setEndBefore(caretNode);
					}
				} else {
					if (!isSiblingsIgnoreWhiteSpace(textBlock, targetTextBlock)) {
						return rng;
					}

					if (caretNode.nodeType == 1) {
						if (caretNode.nodeName == "BR") {
							rng.setStartBefore(caretNode);
						} else {
							rng.setStartAfter(caretNode);
						}
					} else {
						rng.setStart(caretNode, caretNode.data.length);
					}

					if (targetCaretNode.nodeType == 1) {
						rng.setEnd(targetCaretNode, 0);
					} else {
						rng.setEndBefore(targetCaretNode);
					}
				}
			}

			return rng;
		}

		function handleTextBlockMergeDelete(isForward) {
			var rng = selection.getRng();

			rng = expandBetweenBlocks(rng, isForward);

			if (deleteRangeBetweenTextBlocks(rng)) {
				return true;
			}
		}

		/**
		 * This retains the formatting if the last character is to be deleted.
		 *
		 * Backspace on this: <p><b><i>a|</i></b></p> would become <p>|</p> in WebKit.
		 * With this patch: <p><b><i>|<br></i></b></p>
		 */
		function handleLastBlockCharacterDelete(isForward, rng) {
			var path, blockElm, newBlockElm, clonedBlockElm, sibling,
				container, offset, br, currentFormatNodes;

			function cloneTextBlockWithFormats(blockElm, node) {
				currentFormatNodes = dom.getParents(node, function(n) {
					return !!editor.schema.getTextInlineElements()[n.nodeName];
				});

				newBlockElm = blockElm.cloneNode(false);

				currentFormatNodes = tinymce.map(currentFormatNodes, function (formatNode) {
					formatNode = formatNode.cloneNode(false);

					if (newBlockElm.hasChildNodes()) {
						formatNode.appendChild(newBlockElm.firstChild);
						newBlockElm.appendChild(formatNode);
					} else {
						newBlockElm.appendChild(formatNode);
					}

					newBlockElm.appendChild(formatNode);

					return formatNode;
				});

				if (currentFormatNodes.length) {
					br = dom.create('br');
					currentFormatNodes[0].appendChild(br);
					dom.replace(newBlockElm, blockElm);

					rng.setStartBefore(br);
					rng.setEndBefore(br);
					editor.selection.setRng(rng);

					return br;
				}

				return null;
			}

			function isTextBlock(node) {
				return node && editor.schema.getTextBlockElements()[node.tagName];
			}

			function NodePathCreate(rootNode, targetNode, normalized) {
				var path = [];
		
				for (; targetNode && targetNode != rootNode; targetNode = targetNode.parentNode) {
					path.push(tinymce.DOM.nodeIndex(targetNode, normalized));
				}
		
				return path;
			}
		
			function NodePathResolve(rootNode, path) {
				var i, node, children;
		
				for (node = rootNode, i = path.length - 1; i >= 0; i--) {
					children = node.childNodes;
		
					if (path[i] > children.length - 1) {
						return null;
					}
		
					node = children[path[i]];
				}
		
				return node;
			}

			if (!rng.collapsed) {
				return;
			}

			container = rng.startContainer;
			offset = rng.startOffset;
			blockElm = dom.getParent(container, dom.isBlock);
			if (!isTextBlock(blockElm)) {
				return;
			}

			if (container.nodeType == 1) {
				container = container.childNodes[offset];
				if (container && container.tagName != 'BR') {
					return;
				}

				if (isForward) {
					sibling = blockElm.nextSibling;
				} else {
					sibling = blockElm.previousSibling;
				}

				if (dom.isEmpty(blockElm) && isTextBlock(sibling) && dom.isEmpty(sibling)) {
					if (cloneTextBlockWithFormats(blockElm, container)) {
						dom.remove(sibling);
						return true;
					}
				}
			} else if (container.nodeType == 3) {
				path = NodePathCreate(blockElm, container);
				clonedBlockElm = blockElm.cloneNode(true);
				container = NodePathResolve(clonedBlockElm, path);

				if (isForward) {
					if (offset >= container.data.length) {
						return;
					}

					container.deleteData(offset, 1);
				} else {
					if (offset <= 0) {
						return;
					}

					container.deleteData(offset - 1, 1);
				}

				if (dom.isEmpty(clonedBlockElm)) {
					return cloneTextBlockWithFormats(blockElm, container);
				}
			}
		}

		function customDelete(isForward) {
			var mutationObserver, rng, caretElement;

			if (handleTextBlockMergeDelete(isForward)) {
				return;
			}

			tinymce.each(editor.getBody().getElementsByTagName('*'), function (elm) {
				// Mark existing spans
				if (elm.tagName == 'SPAN') {
					elm.setAttribute('mce-data-marked', 1);
				}

				// Make sure all elements has a data-mce-style attribute
				if (!elm.hasAttribute('data-mce-style') && elm.hasAttribute('style')) {
					editor.dom.setAttrib(elm, 'style', editor.dom.getAttrib(elm, 'style'));
				}
			});

			// Observe added nodes and style attribute changes
			mutationObserver = new MutationObserver(function () {});
			mutationObserver.observe(editor.getDoc(), {
				childList: true,
				attributes: true,
				subtree: true,
				attributeFilter: ['style']
			});

			editor.getDoc().execCommand(isForward ? 'ForwardDelete' : 'Delete', false, null);

			rng = editor.selection.getRng();
			caretElement = rng.startContainer.parentNode;

			tinymce.each(mutationObserver.takeRecords(), function (record) {
				if (!dom.isChildOf(record.target, editor.getBody())) {
					return;
				}

				// Restore style attribute to previous value
				if (record.attributeName == "style") {
					var oldValue = record.target.getAttribute('data-mce-style');

					if (oldValue) {
						record.target.setAttribute("style", oldValue);
					} else {
						record.target.removeAttribute("style");
					}
				}

				// Remove all spans that aren't marked and retain selection
				tinymce.each(record.addedNodes, function (node) {
					if (node.nodeName == "SPAN" && !node.getAttribute('mce-data-marked')) {
						var offset, container;

						if (node == caretElement) {
							offset = rng.startOffset;
							container = node.firstChild;
						}

						dom.remove(node, true);

						if (container) {
							rng.setStart(container, offset);
							rng.setEnd(container, offset);
							editor.selection.setRng(rng);
						}
					}
				});
			});

			mutationObserver.disconnect();

			// Remove any left over marks
			tinymce.each(editor.dom.select('span[mce-data-marked]'), function (span) {
				span.removeAttribute('mce-data-marked');
			});
		}

		function transactCustomDelete(isForward) {
			editor.undoManager.transact(function () {
				customDelete(isForward);
			});
		}

		editor.onKeyDown.add(function (editor, e) {
			var isForward = e.keyCode == DELETE,
				isMetaOrCtrl = e.ctrlKey || e.metaKey;

			if (!isDefaultPrevented(e) && (isForward || e.keyCode == BACKSPACE)) {
				var rng = editor.selection.getRng(),
					container = rng.startContainer,
					offset = rng.startOffset;

				if (editor.settings.forced_root_block === false) {
					return;
				}

				// Shift+Delete is cut
				if (isForward && e.shiftKey) {
					return;
				}

				if (handleLastBlockCharacterDelete(isForward, rng)) {
					e.preventDefault();
					return;
				}

				// Ignore non meta delete in the where there is text before/after the caret
				if (!isMetaOrCtrl && rng.collapsed && container.nodeType == 3) {
					if (isForward ? offset < container.data.length : offset > 0) {
						return;
					}
				}

				e.preventDefault();

				if (isMetaOrCtrl) {
					editor.selection.getSel().modify("extend", isForward ? "forward" : "backward", e.metaKey ? "lineboundary" : "word");
				}

				customDelete(isForward);
			}
		});

		// Handle case where text is deleted by typing over
		editor.onKeyPress.add(function (editor, e) {
			if (!isDefaultPrevented(e) && !selection.isCollapsed() && e.charCode > 31 && !VK.metaKeyPressed(e)) {
				var rng, currentFormatNodes, fragmentNode, blockParent, caretNode, charText;

				if (editor.settings.forced_root_block === false) {
					return;
				}

				rng = editor.selection.getRng();
				charText = String.fromCharCode(e.charCode);
				e.preventDefault();

				// Keep track of current format nodes
				currentFormatNodes = dom.getParents(rng.startContainer, function(node) {
					return !!editor.schema.getTextInlineElements()[node.nodeName];
				});

				customDelete(true);

				// Check if the browser removed them
				currentFormatNodes = currentFormatNodes.filter(function (idx, node) {
					return !editor.getBody().contains(node);
				});

				// Then re-add them
				if (currentFormatNodes.length) {
					fragmentNode = dom.createFragment();

					currentFormatNodes.each(function (idx, formatNode) {
						formatNode = formatNode.cloneNode(false);

						if (fragmentNode.hasChildNodes()) {
							formatNode.appendChild(fragmentNode.firstChild);
							fragmentNode.appendChild(formatNode);
						} else {
							caretNode = formatNode;
							fragmentNode.appendChild(formatNode);
						}

						fragmentNode.appendChild(formatNode);
					});

					caretNode.appendChild(editor.getDoc().createTextNode(charText));

					// Prevent edge case where older WebKit would add an extra BR element
					blockParent = dom.getParent(rng.startContainer, dom.isBlock);
					if (dom.isEmpty(blockParent)) {
						dom.empty(blockParent);
						dom.add(blockParent, fragmentNode);
					} else {
						rng.insertNode(fragmentNode);
					}

					rng.setStart(caretNode.firstChild, 1);
					rng.setEnd(caretNode.firstChild, 1);
					editor.selection.setRng(rng);
				} else {
					editor.selection.setContent(charText);
				}
			}
		});

		editor.addCommand('Delete', function () {
			customDelete();
		});

		editor.addCommand('ForwardDelete', function () {
			customDelete(true);
		});

		editor.onDragStart.add(function (editor, e) {
			dragStartRng = selection.getRng();
			setMceInternalContent(e);
		});

		editor.onDrop.add(function (editor, e) {
			if (!isDefaultPrevented(e)) {
				var internalContent = getMceInternalContent(e);

				if (internalContent) {
					e.preventDefault();

					// Safari has a weird issue where drag/dropping images sometimes
					// produces a green plus icon. When this happens the caretRangeFromPoint
					// will return "null" even though the x, y coordinate is correct.
					// But if we detach the insert from the drop event we will get a proper range
					Delay.setEditorTimeout(editor, function () {
						var pointRng = RangeUtils.getCaretRangeFromPoint(e.x, e.y, doc);

						if (dragStartRng) {
							selection.setRng(dragStartRng);
							dragStartRng = null;
							transactCustomDelete();
						}

						selection.setRng(pointRng);
						insertClipboardContents(internalContent.html);
					});
				}
			}
		});
	}

	/**
	 * Makes sure that the editor body becomes empty when backspace or delete is pressed in empty editors.
	 *
	 * For example:
	 * <p><b>|</b></p>
	 *
	 * Or:
	 * <h1>|</h1>
	 *
	 * Or:
	 * [<h1></h1>]
	 */
	function emptyEditorWhenDeleting() {
		function serializeRng(rng) {
			var body = dom.create("body");
			var contents = rng.cloneContents();
			body.appendChild(contents);
			return selection.serializer.serialize(body, {
				format: 'html'
			});
		}

		function allContentsSelected(rng) {
			var selection = serializeRng(rng);

			var allRng = dom.createRng();
			allRng.selectNode(editor.getBody());

			var allSelection = serializeRng(allRng);
			return selection === allSelection;
		}

		editor.onKeyDown.add(function (editor, e) {
			var keyCode = e.keyCode,
				isCollapsed;

			// Empty the editor if it's needed for example backspace at <p><b>|</b></p>
			if (!isDefaultPrevented(e) && (keyCode == DELETE || keyCode == BACKSPACE)) {
				isCollapsed = editor.selection.isCollapsed();

				// Selection is collapsed but the editor isn't empty
				if (isCollapsed && !dom.isEmpty(editor.getBody())) {
					return;
				}

				// IE deletes all contents correctly when everything is selected
				if (tinymce.isIE && !isCollapsed) {
					return;
				}

				// Selection isn't collapsed but not all the contents is selected
				if (!isCollapsed && !allContentsSelected(editor.selection.getRng())) {
					return;
				}

				// Manually empty the editor
				editor.setContent('');
				editor.selection.setCursorLocation(editor.getBody(), 0);
				editor.nodeChanged();
			}
		});
	};

	/**
	 * WebKit doesn't select all the nodes in the body when you press Ctrl+A.
	 * This selects the whole body so that backspace/delete logic will delete everything
	 */
	function selectAll() {
		editor.onKeyDown.add(function (editor, e) {
			if (!isDefaultPrevented(e) && e.keyCode == 65 && VK.metaKeyPressed(e)) {
				e.preventDefault();
				editor.execCommand('SelectAll');
			}
		});
	};

	/**
	 * WebKit has a weird issue where it some times fails to properly convert keypresses to input method keystrokes. The IME on Mac doesn't
	 * initialize when it doesn't fire a proper focus event.
	 *
	 * This seems to happen when the user manages to click the documentElement element then the window doesn't get proper focus until
	 * you enter a character into the editor.
	 *
	 * It also happens when the first focus in made to the body.
	 *
	 * See: https://bugs.webkit.org/show_bug.cgi?id=83566
	 */
	function inputMethodFocus() {
		if (!editor.settings.content_editable) {
			// Case 1 IME doesn't initialize if you focus the document
			dom.bind(editor.getDoc(), 'focusin', function (e) {
				selection.setRng(selection.getRng());
			});

			// Case 2 IME doesn't initialize if you click the documentElement it also doesn't properly fire the focusin event
			dom.bind(editor.getDoc(), 'mousedown', function (e) {
				if (e.target == editor.getDoc().documentElement) {
					editor.getWin().focus();
					selection.setRng(selection.getRng());
				}
			});
		}
	};

	/**
	 * Backspacing in FireFox/IE from a paragraph into a horizontal rule results in a floating text node because the
	 * browser just deletes the paragraph - the browser fails to merge the text node with a horizontal rule so it is
	 * left there. TinyMCE sees a floating text node and wraps it in a paragraph on the key up event (ForceBlocks.js
	 * addRootBlocks), meaning the action does nothing. With this code, FireFox/IE matche the behaviour of other
	 * browsers
	 */
	function removeHrOnBackspace() {
		editor.onKeyDown.add(function (editor, e) {
			if (!isDefaultPrevented(e) && e.keyCode === BACKSPACE) {
				if (selection.isCollapsed() && selection.getRng(true).startOffset === 0) {
					var node = selection.getNode();
					var previousSibling = node.previousSibling;

					if (previousSibling && previousSibling.nodeName && previousSibling.nodeName.toLowerCase() === "hr") {
						dom.remove(previousSibling);
						tinymce.dom.Event.cancel(e);
					}
				}
			}
		})
	}

	/**
	 * Firefox 3.x has an issue where the body element won't get proper focus if you click out
	 * side it's rectangle.
	 */
	function focusBody() {
		// Fix for a focus bug in FF 3.x where the body element
		// wouldn't get proper focus if the user clicked on the HTML element
		if (!Range.prototype.getClientRects) { // Detect getClientRects got introduced in FF 4
			editor.onMouseDown.add(function (editor, e) {
				if (!isDefaultPrevented(e) && e.target.nodeName === "HTML") {
					var body = editor.getBody();

					// Blur the body it's focused but not correctly focused
					body.blur();

					// Refocus the body after a little while
					setTimeout(function () {
						body.focus();
					}, 0);
				}
			});
		}
	};

	/**
	 * WebKit has a bug where it isn't possible to select image, hr or anchor elements
	 * by clicking on them so we need to fake that.
	 */
	function selectControlElements() {
		editor.onClick.add(function (editor, e) {
			var target = e.target;

			// Workaround for bug, http://bugs.webkit.org/show_bug.cgi?id=12250
			// WebKit can't even do simple things like selecting an image
			// Needs tobe the setBaseAndExtend or it will fail to select floated images
			if (/^(IMG|HR)$/.test(target.nodeName)) {
				//selection.getSel().setBaseAndExtent(e, 0, e, 1);
				e.preventDefault();
				editor.selection.select(target);
			}

			if (e.nodeName == 'A' && dom.hasClass(e, 'mce-item-anchor')) {
				selection.select(target);
			}

			editor.nodeChanged();
		});
	};

	/**
	 * Fixes a Gecko bug where the style attribute gets added to the wrong element when deleting between two block elements.
	 *
	 * Fixes do backspace/delete on this:
	 * <p>bla[ck</p><p style="color:red">r]ed</p>
	 *
	 * Would become:
	 * <p>bla|ed</p>
	 *
	 * Instead of:
	 * <p style="color:red">bla|ed</p>
	 */
	function removeStylesWhenDeletingAccrossBlockElements() {
		function getAttributeApplyFunction() {
			var template = dom.getAttribs(selection.getStart().cloneNode(false));

			return function () {
				var target = selection.getStart();

				if (target !== editor.getBody()) {
					dom.setAttrib(target, "style", null);

					each(template, function (attr) {
						target.setAttributeNode(attr.cloneNode(true));
					});
				}
			};
		}

		function isSelectionAcrossElements() {
			return !selection.isCollapsed() && dom.getParent(selection.getStart(), dom.isBlock) != dom.getParent(selection.getEnd(), dom.isBlock);
		}

		function blockEvent(editor, e) {
			e.preventDefault();
			return false;
		}

		editor.onKeyPress.add(function (editor, e) {
			var applyAttributes;

			if (!isDefaultPrevented(e) && (e.keyCode == 8 || e.keyCode == 46) && isSelectionAcrossElements()) {
				applyAttributes = getAttributeApplyFunction();
				editor.getDoc().execCommand('delete', false, null);
				applyAttributes();
				e.preventDefault();
				return false;
			}
		});

		dom.bind(editor.getDoc(), 'cut', function (e) {
			var applyAttributes;

			if (!isDefaultPrevented(e) && isSelectionAcrossElements()) {
				applyAttributes = getAttributeApplyFunction();
				editor.onKeyUp.addToTop(blockEvent);

				setTimeout(function () {
					applyAttributes();
					editor.onKeyUp.remove(blockEvent);
				}, 0);
			}
		});
	}

	/**
	 * Fire a nodeChanged when the selection is changed on WebKit this fixes selection issues on iOS5. It only fires the nodeChange
	 * event every 50ms since it would other wise update the UI when you type and it hogs the CPU.
	 */
	function selectionChangeNodeChanged() {
		var lastRng, selectionTimer;

		dom.bind(editor.getDoc(), 'selectionchange', function () {
			if (selectionTimer) {
				clearTimeout(selectionTimer);
				selectionTimer = 0;
			}

			selectionTimer = window.setTimeout(function () {
				var rng = selection.getRng();

				// Compare the ranges to see if it was a real change or not
				if (!lastRng || !tinymce.dom.RangeUtils.compareRanges(rng, lastRng)) {
					editor.nodeChanged();
					lastRng = rng;
				}
			}, 50);
		});
	}

	/**
	 * Screen readers on IE needs to have the role application set on the body.
	 */
	function ensureBodyHasRoleApplication() {
		document.body.setAttribute("role", "application");
	}

	/**
	 * Backspacing into a table behaves differently depending upon browser type.
	 * Therefore, disable Backspace when cursor immediately follows a table.
	 */
	function disableBackspaceIntoATable() {
		editor.onKeyDown.add(function (editor, e) {
			if (!isDefaultPrevented(e) && e.keyCode === BACKSPACE) {
				if (selection.isCollapsed() && selection.getRng(true).startOffset === 0) {
					var previousSibling = selection.getNode().previousSibling;
					if (previousSibling && previousSibling.nodeName && previousSibling.nodeName.toLowerCase() === "table") {
						return tinymce.dom.Event.cancel(e);
					}
				}
			}
		})
	}

	/**
	 * Old IE versions can't properly render BR elements in PRE tags white in contentEditable mode. So this logic adds a \n before the BR so that it will get rendered.
	 */
	function addNewLinesBeforeBrInPre() {
		// IE8+ rendering mode does the right thing with BR in PRE
		if (getDocumentMode() > 7) {
			return;
		}

		// Enable display: none in area and add a specific class that hides all BR elements in PRE to
		// avoid the caret from getting stuck at the BR elements while pressing the right arrow key
		setEditorCommandState('RespectVisibilityInDesign', true);
		editor.contentStyles.push('.mceHideBrInPre pre br {display: none}');
		dom.addClass(editor.getBody(), 'mceHideBrInPre');

		// Adds a \n before all BR elements in PRE to get them visual
		parser.addNodeFilter('pre', function (nodes, name) {
			var i = nodes.length,
				brNodes, j, brElm, sibling;

			while (i--) {
				brNodes = nodes[i].getAll('br');
				j = brNodes.length;
				while (j--) {
					brElm = brNodes[j];

					// Add \n before BR in PRE elements on older IE:s so the new lines get rendered
					sibling = brElm.prev;
					if (sibling && sibling.type === 3 && sibling.value.charAt(sibling.value - 1) != '\n') {
						sibling.value += '\n';
					} else {
						brElm.parent.insert(new tinymce.html.Node('#text', 3), brElm, true).value = '\n';
					}
				}
			}
		});

		// Removes any \n before BR elements in PRE since other browsers and in contentEditable=false mode they will be visible
		serializer.addNodeFilter('pre', function (nodes, name) {
			var i = nodes.length,
				brNodes, j, brElm, sibling;

			while (i--) {
				brNodes = nodes[i].getAll('br');
				j = brNodes.length;
				while (j--) {
					brElm = brNodes[j];
					sibling = brElm.prev;
					if (sibling && sibling.type == 3) {
						sibling.value = sibling.value.replace(/\r?\n$/, '');
					}
				}
			}
		});
	}

	/**
	 * Moves style width/height to attribute width/height when the user resizes an image on IE.
	 */
	function removePreSerializedStylesWhenSelectingControls() {
		dom.bind(editor.getBody(), 'mouseup', function (e) {
			var value, node = selection.getNode();

			// Moved styles to attributes on IMG eements
			if (node.nodeName == 'IMG') {
				// Convert style width to width attribute
				if (value = dom.getStyle(node, 'width')) {
					dom.setAttrib(node, 'width', value.replace(/[^0-9%]+/g, ''));
					dom.setStyle(node, 'width', '');
				}

				// Convert style height to height attribute
				if (value = dom.getStyle(node, 'height')) {
					dom.setAttrib(node, 'height', value.replace(/[^0-9%]+/g, ''));
					dom.setStyle(node, 'height', '');
				}
			}
		});
	}

	/**
	 * Backspace or delete on WebKit will combine all visual styles in a span if the last character is deleted.
	 *
	 * For example backspace on:
	 * <p><b>x|</b></p>
	 *
	 * Will produce:
	 * <p><span style="font-weight: bold">|<br></span></p>
	 *
	 * When it should produce:
	 * <p><b>|<br></b></p>
	 *
	 * See: https://bugs.webkit.org/show_bug.cgi?id=81656
	 */
	function keepInlineElementOnDeleteBackspace() {
		editor.onKeyDown.add(function (editor, e) {
			var isDelete, rng, container, offset, brElm, sibling, collapsed;

			isDelete = e.keyCode == DELETE;
			if (!isDefaultPrevented(e) && (isDelete || e.keyCode == BACKSPACE) && !VK.modifierPressed(e)) {
				rng = selection.getRng();
				container = rng.startContainer;
				offset = rng.startOffset;
				collapsed = rng.collapsed;

				// Override delete if the start container is a text node and is at the beginning of text or
				// just before/after the last character to be deleted in collapsed mode
				if (container.nodeType == 3 && container.nodeValue.length > 0 && ((offset === 0 && !collapsed) || (collapsed && offset === (isDelete ? 0 : 1)))) {
					// Edge case when deleting <p><b><img> |x</b></p>
					sibling = container.previousSibling;
					if (sibling && sibling.nodeName == "IMG") {
						return;
					}

					nonEmptyElements = editor.schema.getNonEmptyElements();

					// Prevent default logic since it's broken
					e.preventDefault();

					// Insert a BR before the text node this will prevent the containing element from being deleted/converted
					brElm = dom.create('br', {
						id: '__tmp'
					});
					container.parentNode.insertBefore(brElm, container);

					// Do the browser delete
					editor.getDoc().execCommand(isDelete ? 'ForwardDelete' : 'Delete', false, null);

					// Check if the previous sibling is empty after deleting for example: <p><b></b>|</p>
					container = selection.getRng().startContainer;
					sibling = container.previousSibling;
					if (sibling && sibling.nodeType == 1 && !dom.isBlock(sibling) && dom.isEmpty(sibling) && !nonEmptyElements[sibling.nodeName.toLowerCase()]) {
						dom.remove(sibling);
					}

					// Remove the temp element we inserted
					dom.remove('__tmp');
				}
			}
		});
	}

	/**
	 * Removes a blockquote when backspace is pressed at the beginning of it.
	 *
	 * For example:
	 * <blockquote><p>|x</p></blockquote>
	 *
	 * Becomes:
	 * <p>|x</p>
	 */
	function removeBlockQuoteOnBackSpace() {
		// Add block quote deletion handler
		editor.onKeyDown.add(function (editor, e) {
			var rng, container, offset, root, parent;

			if (isDefaultPrevented(e) || e.keyCode != VK.BACKSPACE) {
				return;
			}

			rng = selection.getRng();
			container = rng.startContainer;
			offset = rng.startOffset;
			root = dom.getRoot();
			parent = container;

			if (!rng.collapsed || offset !== 0) {
				return;
			}

			while (parent && parent.parentNode && parent.parentNode.firstChild == parent && parent.parentNode != root) {
				parent = parent.parentNode;
			}

			// Is the cursor at the beginning of a blockquote?
			if (parent.tagName === 'BLOCKQUOTE') {
				// Remove the blockquote
				editor.formatter.toggle('blockquote', null, parent);

				// Move the caret to the beginning of container
				rng = dom.createRng();
				rng.setStart(container, 0);
				rng.setEnd(container, 0);
				selection.setRng(rng);
			}
		});
	};

	/**
	 * Sets various Gecko editing options on mouse down and before a execCommand to disable inline table editing that is broken etc.
	 */
	function setGeckoEditingOptions() {
		function setOpts() {
			editor._refreshContentEditable();

			setEditorCommandState("StyleWithCSS", false);
			setEditorCommandState("enableInlineTableEditing", false);

			if (!settings.object_resizing) {
				setEditorCommandState("enableObjectResizing", false);
			}
		};

		if (!settings.readonly) {
			editor.onBeforeExecCommand.add(setOpts);
			editor.onMouseDown.add(setOpts);
		}
	};

	/**
	 * Fixes a gecko link bug, when a link is placed at the end of block elements there is
	 * no way to move the caret behind the link. This fix adds a bogus br element after the link.
	 *
	 * For example this:
	 * <p><b><a href="#">x</a></b></p>
	 *
	 * Becomes this:
	 * <p><b><a href="#">x</a></b><br></p>
	 */
	function addBrAfterLastLinks() {
		function fixLinks(editor, o) {
			each(dom.select('a'), function (node) {
				var parentNode = node.parentNode,
					root = dom.getRoot();

				if (parentNode.lastChild === node) {
					while (parentNode && !dom.isBlock(parentNode)) {
						if (parentNode.parentNode.lastChild !== parentNode || parentNode === root) {
							return;
						}

						parentNode = parentNode.parentNode;
					}

					dom.add(parentNode, 'br', {
						'data-mce-bogus': 1
					});
				}
			});
		};

		editor.onExecCommand.add(function (editor, cmd) {
			if (cmd === 'mceInsertLink') {
				fixLinks(editor);
			}
		});

		editor.onSetContent.add(selection.onSetContent.add(fixLinks));
	};

	/**
	 * WebKit will produce DIV elements here and there by default. But since TinyMCE uses paragraphs by
	 * default we want to change that behavior.
	 */
	function setDefaultBlockType() {
		if (settings.forced_root_block) {
			editor.onInit.add(function () {
				setEditorCommandState('DefaultParagraphSeparator', settings.forced_root_block);
			});
		}
	}

	/**
	 * Removes ghost selections from images/tables on Gecko.
	 */
	function removeGhostSelection() {
		function repaint(sender, args) {
			if (!sender || !args.initial) {
				editor.execCommand('mceRepaint');
			}
		};

		editor.onUndo.add(repaint);
		editor.onRedo.add(repaint);
		editor.onSetContent.add(repaint);
	};

	/**
	 * Deletes the selected image on IE instead of navigating to previous page.
	 */
	function deleteControlItemOnBackSpace() {
		editor.onKeyDown.add(function (editor, e) {
			var rng;

			if (!isDefaultPrevented(e) && e.keyCode == BACKSPACE) {
				rng = editor.getDoc().selection.createRange();
				if (rng && rng.item) {
					e.preventDefault();
					editor.undoManager.beforeChange();
					dom.remove(rng.item(0));
					editor.undoManager.add();
				}
			}
		});
	};

	/**
	 * IE10 doesn't properly render block elements with the right height until you add contents to them.
	 * This fixes that by adding a padding-right to all empty text block elements.
	 * See: https://connect.microsoft.com/IE/feedback/details/743881
	 */
	function renderEmptyBlocksFix() {
		var emptyBlocksCSS;

		// IE10+
		if (getDocumentMode() >= 10) {
			emptyBlocksCSS = '';
			each('p div h1 h2 h3 h4 h5 h6'.split(' '), function (name, i) {
				emptyBlocksCSS += (i > 0 ? ',' : '') + name + ':empty';
			});

			editor.contentStyles.push(emptyBlocksCSS + '{padding-right: 1px !important}');
		}
	};

	/**
	 * Fakes image/table resizing on WebKit/Opera.
	 */
	function fakeImageResize() {
		var dom = editor.dom,
			each = tinymce.each;
		var selectedElm, selectedElmGhost, resizeHelper, resizeHandles, selectedHandle;
		var startX, startY, selectedElmX, selectedElmY, startW, startH, ratio, resizeStarted;
		var width, height;
		var editableDoc = editor.getDoc(),
			rootDocument = document;
		var abs = Math.abs,
			round = Math.round,
			rootElement = editor.getBody();
		var startScrollWidth, startScrollHeight;

		editor.onObjectResized = new tinymce.util.Dispatcher();
		editor.onObjectResizeStart = new tinymce.util.Dispatcher();

		if (!settings.object_resizing || settings.webkit_fake_resize === false) {
			return;
		}

		// Details about each resize handle how to scale etc
		resizeHandles = {
			// Name: x multiplier, y multiplier, delta size x, delta size y
			/*n: [0.5, 0, 0, -1],
			e: [1, 0.5, 1, 0],
			s: [0.5, 1, 0, 1],
			w: [0, 0.5, -1, 0],*/
			nw: [0, 0, -1, -1],
			ne: [1, 0, 1, -1],
			se: [1, 1, 1, 1],
			sw: [0, 1, -1, 1]
		};

		// Add CSS for resize handles, cloned element and selected
		var rootClass = '.mceContentBody';
		editor.contentStyles.push(rootClass + ' div.mce-resizehandle {' +
			'position: absolute;' +
			'border: 1px solid black;' +
			'box-sizing: content-box;' +
			'background: #FFF;' +
			'width: 7px;' +
			'height: 7px;' +
			'z-index: 10000' +
			'}' +
			rootClass + ' .mce-resizehandle:hover {' +
			'background: #000' +
			'}' +
			rootClass + ' img[data-mce-selected],' + rootClass + ' hr[data-mce-selected] {' +
			'outline: 1px solid black;' +
			'resize: none' + // Have been talks about implementing this in browsers
			'}' +
			rootClass + ' .mce-clonedresizable {' +
			'position: absolute;' +
			(tinymce.isGecko ? '' : 'outline: 1px dashed black;') + // Gecko produces trails while resizing
			'opacity: .5;' +
			'filter: alpha(opacity=50);' +
			'z-index: 10000' +
			'}' +
			rootClass + ' .mce-resize-helper {' +
			'background: #555;' +
			'background: rgba(0,0,0,0.75);' +
			'border-radius: 3px;' +
			'border: 1px;' +
			'color: white;' +
			'display: none;' +
			'font-family: sans-serif;' +
			'font-size: 12px;' +
			'white-space: nowrap;' +
			'line-height: 14px;' +
			'margin: 5px 10px;' +
			'padding: 5px;' +
			'position: absolute;' +
			'z-index: 10001' +
			'}');

		var isImage = function (elm) {
			return elm && (elm.nodeName === 'IMG' || editor.dom.is(elm, 'figure[data-mce-image]'));
		};

		var getResizeTarget = function (elm) {
			return editor.dom.is(elm, 'figure[data-mce-image]') ? elm.querySelector('img') : elm;
		};

		var isResizable = function (elm) {
			var selector = editor.settings.object_resizing;

			if (selector === false || tinymce.isIOS) {
				return false;
			}
			if (typeof selector !== 'string') {
				selector = 'table,img,figure[data-mce-image],div';
			}

			if (elm.getAttribute('data-mce-resize') === 'false') {
				return false;
			}

			if (elm === editor.getBody()) {
				return false;
			}

			return editor.dom.is(elm, selector);
		};

		var resizeGhostElement = function (e) {
			var deltaX, deltaY, proportional;
			var resizeHelperX, resizeHelperY;
			// Calc new width/height
			deltaX = e.screenX - startX;
			deltaY = e.screenY - startY;
			// Calc new size
			width = deltaX * selectedHandle[2] + startW;
			height = deltaY * selectedHandle[3] + startH;
			// Never scale down lower than 5 pixels
			width = width < 5 ? 5 : width;
			height = height < 5 ? 5 : height;

			if (isImage(selectedElm) && editor.settings.resize_img_proportional !== false) {
				proportional = !VK.modifierPressed(e);
			} else {
				proportional = VK.modifierPressed(e) || (isImage(selectedElm) && selectedHandle[2] * selectedHandle[3] !== 0);
			}
			// Constrain proportions
			if (proportional) {
				if (abs(deltaX) > abs(deltaY)) {
					height = round(width * ratio);
					width = round(height / ratio);
				} else {
					width = round(height / ratio);
					height = round(width * ratio);
				}
			}
			// Update ghost size
			dom.setStyles(getResizeTarget(selectedElmGhost), {
				width: width,
				height: height
			});
			// Update resize helper position
			resizeHelperX = selectedHandle.startPos.x + deltaX;
			resizeHelperY = selectedHandle.startPos.y + deltaY;
			resizeHelperX = resizeHelperX > 0 ? resizeHelperX : 0;
			resizeHelperY = resizeHelperY > 0 ? resizeHelperY : 0;
			dom.setStyles(resizeHelper, {
				left: resizeHelperX,
				top: resizeHelperY,
				display: 'block'
			});
			resizeHelper.innerHTML = width + ' &times; ' + height;
			// Update ghost X position if needed
			if (selectedHandle[2] < 0 && selectedElmGhost.clientWidth <= width) {
				dom.setStyle(selectedElmGhost, 'left', selectedElmX + (startW - width));
			}
			// Update ghost Y position if needed
			if (selectedHandle[3] < 0 && selectedElmGhost.clientHeight <= height) {
				dom.setStyle(selectedElmGhost, 'top', selectedElmY + (startH - height));
			}
			// Calculate how must overflow we got
			deltaX = rootElement.scrollWidth - startScrollWidth;
			deltaY = rootElement.scrollHeight - startScrollHeight;
			// Re-position the resize helper based on the overflow
			if (deltaX + deltaY !== 0) {
				dom.setStyles(resizeHelper, {
					left: resizeHelperX - deltaX,
					top: resizeHelperY - deltaY
				});
			}
			if (!resizeStarted) {
				editor.onObjectResizeStart.dispatch(editor, selectedElm, startW, startH);
				resizeStarted = true;
			}
		};

		var endGhostResize = function () {
			resizeStarted = false;
			var setSizeProp = function (name, value) {
				if (value) {
					// Resize by using style or attribute
					/*if (selectedElm.style[name] || !editor.schema.isValid(selectedElm.nodeName.toLowerCase(), name)) {
						dom.setStyle(getResizeTarget(selectedElm), name, value);
					}
					else {
						dom.setAttrib(getResizeTarget(selectedElm), name, value);
					}*/
					dom.setAttrib(getResizeTarget(selectedElm), name, value);
				}
			};
			// Set width/height properties
			setSizeProp('width', width);
			setSizeProp('height', height);
			dom.unbind(editableDoc, 'mousemove', resizeGhostElement);
			dom.unbind(editableDoc, 'mouseup', endGhostResize);
			if (rootDocument !== editableDoc) {
				dom.unbind(rootDocument, 'mousemove', resizeGhostElement);
				dom.unbind(rootDocument, 'mouseup', endGhostResize);
			}
			// Remove ghost/helper and update resize handle positions
			dom.remove(selectedElmGhost);
			dom.remove(resizeHelper);
			showResizeRect(selectedElm);
			// dispatch event
			editor.onObjectResized.dispatch(editor, selectedElm, width, height);

			dom.setAttrib(selectedElm, 'style', dom.getAttrib(selectedElm, 'style'));
			editor.nodeChanged();
		};

		var showResizeRect = function (targetElm) {
			var position, targetWidth, targetHeight, rect;
			hideResizeRect();
			unbindResizeHandleEvents();

			// Get position and size of target
			position = dom.getPos(targetElm, rootElement);
			selectedElmX = position.x;
			selectedElmY = position.y;
			rect = targetElm.getBoundingClientRect(); // Fix for Gecko offsetHeight for table with caption
			targetWidth = rect.width || (rect.right - rect.left);
			targetHeight = rect.height || (rect.bottom - rect.top);

			// Reset width/height if user selects a new image/table
			if (selectedElm !== targetElm) {
				selectedElm = targetElm;
				width = height = 0;
			}

			if (isResizable(targetElm)) {
				each(resizeHandles, function (handle, name) {
					var handleElm;
					var startDrag = function (e) {
						startX = e.screenX;
						startY = e.screenY;
						startW = getResizeTarget(selectedElm).clientWidth;
						startH = getResizeTarget(selectedElm).clientHeight;
						ratio = startH / startW;
						selectedHandle = handle;
						handle.startPos = {
							x: targetWidth * handle[0] + selectedElmX,
							y: targetHeight * handle[1] + selectedElmY
						};
						startScrollWidth = rootElement.scrollWidth;
						startScrollHeight = rootElement.scrollHeight;
						selectedElmGhost = selectedElm.cloneNode(true);
						dom.addClass(selectedElmGhost, 'mce-clonedresizable');
						dom.setAttrib(selectedElmGhost, 'data-mce-bogus', 'all');
						selectedElmGhost.contentEditable = false; // Hides IE move layer cursor
						selectedElmGhost.unSelectabe = true;
						dom.setStyles(selectedElmGhost, {
							left: selectedElmX,
							top: selectedElmY,
							margin: 0,
							width: targetWidth,
							height: targetHeight
						});
						selectedElmGhost.removeAttribute('data-mce-selected');
						rootElement.appendChild(selectedElmGhost);
						dom.bind(editableDoc, 'mousemove', resizeGhostElement);
						dom.bind(editableDoc, 'mouseup', endGhostResize);
						if (rootDocument !== editableDoc) {
							dom.bind(rootDocument, 'mousemove', resizeGhostElement);
							dom.bind(rootDocument, 'mouseup', endGhostResize);
						}
						resizeHelper = dom.add(rootElement, 'div', {
							'class': 'mce-resize-helper',
							'data-mce-bogus': 'all'
						}, startW + ' &times; ' + startH);
					};
					// Get existing or render resize handle
					handleElm = dom.get('mceResizeHandle' + name);
					if (handleElm) {
						dom.remove(handleElm);
					}
					handleElm = dom.add(rootElement, 'div', {
						'id': 'mceResizeHandle' + name,
						'data-mce-bogus': 'all',
						'class': 'mce-resizehandle mce-resizehandle-' + name,
						'unselectable': true,
						'style': 'cursor:' + name + '-resize; margin:0; padding:0; user-select: none; -ms-user-select: none;'
					});
					// Hides IE move layer cursor
					// If we set it on Chrome we get this wounderful bug: #6725
					// Edge doesn't have this issue however setting contenteditable will move the selection to that element on Edge 17 see #TINY-1679
					if (tinymce.isIE11) {
						handleElm.contentEditable = false;
					}
					dom.bind(handleElm, 'mousedown', function (e) {
						e.stopImmediatePropagation();
						e.preventDefault();
						startDrag(e);
					});
					handle.elm = handleElm;
					// Position element
					dom.setStyles(handleElm, {
						left: (targetWidth * handle[0] + selectedElmX) - (handleElm.offsetWidth / 2),
						top: (targetHeight * handle[1] + selectedElmY) - (handleElm.offsetHeight / 2)
					});
				});
			} else {
				hideResizeRect();
			}
			selectedElm.setAttribute('data-mce-selected', '1');
		};
		var hideResizeRect = function () {
			var name, handleElm;
			unbindResizeHandleEvents();
			if (selectedElm) {
				selectedElm.removeAttribute('data-mce-selected');
			}
			for (name in resizeHandles) {
				handleElm = dom.get('mceResizeHandle' + name);
				if (handleElm) {
					dom.unbind(handleElm);
					dom.remove(handleElm);
				}
			}
		};
		var updateResizeRect = function (e) {
			var startElm, controlElm;
			var isChildOrEqual = function (node, parent) {
				if (node) {
					do {
						if (node === parent) {
							return true;
						}
					} while ((node = node.parentNode));
				}
			};
			// Ignore all events while resizing or if the editor instance was removed
			if (resizeStarted || editor.removed) {
				return;
			}
			// Remove data-mce-selected from all elements since they might have been copied using Ctrl+c/v
			each(dom.select('img[data-mce-selected],hr[data-mce-selected]'), function (img) {
				img.removeAttribute('data-mce-selected');
			});
			controlElm = e.type === 'mousedown' ? e.target : selection.getNode();
			controlElm = dom.closest(controlElm, 'table,img,figure[data-mce-image],hr')[0];

			if (isChildOrEqual(controlElm, rootElement)) {
				disableGeckoResize();
				startElm = selection.getStart(true);
				if (isChildOrEqual(startElm, controlElm) && isChildOrEqual(selection.getEnd(true), controlElm)) {
					showResizeRect(controlElm);
					return;
				}
			}

			hideResizeRect();
		};

		var unbindResizeHandleEvents = function () {
			for (var name in resizeHandles) {
				var handle = resizeHandles[name];
				if (handle.elm) {
					dom.unbind(handle.elm);
					delete handle.elm;
				}
			}
		};

		var disableGeckoResize = function () {
			try {
				// Disable object resizing on Gecko
				editor.getDoc().execCommand('enableObjectResizing', false, false);
			} catch (ex) {
				// Ignore
			}
		};

		// Show/hide resize rect when image is selected
		editor.onNodeChange.add(updateResizeRect);

		// Remove resize rect when getting content from the editor
		editor.onBeforeGetContent.add(hideResizeRect);

		// Fixes WebKit quirk where it returns IMG on getNode if caret is after last image in container
		dom.bind(editableDoc, 'selectionchange', updateResizeRect);

		// Remove the internal attribute when serializing the DOM
		editor.serializer.addAttributeFilter('data-mce-selected', function (nodes, name) {
			var i = nodes.length;

			while (i--) {
				nodes[i].attr(name, null);
			}
		});

		disableGeckoResize();
	}

	/**
	 * Old IE versions can't retain contents within noscript elements so this logic will store the contents
	 * as a attribute and the insert that value as it's raw text when the DOM is serialized.
	 */
	function keepNoScriptContents() {
		if (getDocumentMode() < 9) {
			parser.addNodeFilter('noscript', function (nodes) {
				var i = nodes.length,
					node, textNode;

				while (i--) {
					node = nodes[i];
					textNode = node.firstChild;

					if (textNode) {
						node.attr('data-mce-innertext', textNode.value);
					}
				}
			});

			serializer.addNodeFilter('noscript', function (nodes) {
				var i = nodes.length,
					node, textNode, value;

				while (i--) {
					node = nodes[i];
					textNode = nodes[i].firstChild;

					if (textNode) {
						textNode.value = tinymce.html.Entities.decode(textNode.value);
					} else {
						// Old IE can't retain noscript value so an attribute is used to store it
						value = node.attributes.map['data-mce-innertext'];
						if (value) {
							node.attr('data-mce-innertext', null);
							textNode = new tinymce.html.Node('#text', 3);
							textNode.value = value;
							textNode.raw = true;
							node.append(textNode);
						}
					}
				}
			});
		}
	}

	/**
	 * IE 11 has an annoying issue where you can't move focus into the editor
	 * by clicking on the white area HTML element. We used to be able to to fix this with
	 * the fixCaretSelectionOfDocumentElementOnIe fix. But since M$ removed the selection
	 * object it's not possible anymore. So we need to hack in a ungly CSS to force the
	 * body to be at least 150px. If the user clicks the HTML element out side this 150px region
	 * we simply move the focus into the first paragraph. Not ideal since you loose the
	 * positioning of the caret but goot enough for most cases.
	 */
	function bodyHeight() {
		editor.contentStyles.push('body {min-height: 100px}');
		editor.onClick.add(function (ed, e) {
			if (e.target.nodeName == 'HTML') {
				editor.execCommand('SelectAll');
				editor.selection.collapse(true);
				editor.nodeChanged();
			}
		});
	}

	/**
	 * Fixes control selection bug #6613 in IE 11 by an ugly hack. IE 11 has a bug where it will return the parent
	 * element container of an image if you select it as the last child in for
	 * example this HTML: <p>a<img src="b"></p>
	 */
	function fixControlSelection() {
		editor.onInit.add(function () {
			var selectedRng;

			editor.getBody().addEventListener('mscontrolselect', function (e) {
				setTimeout(function () {
					if (editor.selection.getNode() != e.target) {
						selectedRng = editor.selection.getRng();
						selection.fakeRng = editor.dom.createRng();
						selection.fakeRng.setStartBefore(e.target);
						selection.fakeRng.setEndAfter(e.target);
					}
				}, 0);

				//e.preventDefault();
				// This moves the selection from being a control selection to a text like selection like in WebKit #6753
				// TODO: Fix this the day IE works like other browsers without this nasty native ugly control selections.
				if (e.target.tagName == 'IMG') {
					e.preventDefault();
					window.setTimeout(function () {
						editor.selection.select(e.target);
					}, 0);
				}


			}, false);

			editor.getDoc().addEventListener('selectionchange', function (e) {
				if (selectedRng && !tinymce.dom.RangeUtils.compareRanges(editor.selection.getRng(), selectedRng)) {
					selection.fakeRng = selectedRng = null;
				}
			}, false);
		});

		if (tinymce.isIE12) {
			editor.onClick.add(function (editor, e) {
				e = e.target;

				if (/^(IMG|HR|TABLE)$/.test(e.nodeName)) {
					selection.select(e);
				}

				if (e.nodeName == 'A' && dom.hasClass(e, 'mce-item-anchor')) {
					selection.select(e);
				}

				editor.nodeChanged();
			});
		}
	}

	/**
	 * IE 11 has a fantastic bug where it will produce two trailing BR elements to iframe bodies when
	 * the iframe is hidden by display: none on a parent container. The DOM is actually out of sync
	 * with innerHTML in this case. It's like IE adds shadow DOM BR elements that appears on innerHTML
	 * but not as the lastChild of the body. However is we add a BR element to the body then remove it
	 * it doesn't seem to add these BR elements makes sence right?!
	 *
	 * Example of what happens: <body>text</body> becomes <body>text<br><br></body>
	 */
	function doubleTrailingBrElements() {
		function fn() {
			var br = editor.dom.create('br');
			editor.getBody().appendChild(br);
			br.parentNode.removeChild(br);
		}

		editor.onBeforeGetContent.add(fn);
	}

	function imageFloatLinkBug() {
		editor.onBeforeExecCommand.add(function (ed, cmd, ui, v, o) {
			// remove img styles
			if (cmd == 'mceInsertLink') {
				var se = ed.selection,
					n = se.getNode();

				// store class and style
				if (n && n.nodeName == 'IMG') {
					ed.dom.setAttrib(n, 'data-mce-style', n.style.cssText);
					n.style.cssText = null;
				}
			}
		});

		editor.onExecCommand.add(function (ed, cmd, ui, v, o) {
			// restore img styles
			if (cmd == 'mceInsertLink') {
				var se = ed.selection,
					n = se.getNode();

				tinymce.each(ed.dom.select('img[data-mce-style]', n), function (el) {
					if (el.parentNode.nodeName == 'A' && !el.style.cssText) {
						el.style.cssText = ed.dom.getAttrib(el, 'data-mce-style');
					}
				});
			}
		});
	}

	// All browsers
	disableBackspaceIntoATable();
	removeBlockQuoteOnBackSpace();
	emptyEditorWhenDeleting();

	// WebKit
	if (tinymce.isWebKit) {
		keepInlineElementOnDeleteBackspace();
		cleanupStylesWhenDeleting();
		inputMethodFocus();
		selectControlElements();
		setDefaultBlockType();
		imageFloatLinkBug();

		// iOS
		if (tinymce.isIDevice) {
			selectionChangeNodeChanged();
		} else {
			selectAll();
		}
	}

	// IE
	if (tinymce.isIE && !tinymce.isIE11) {
		removeHrOnBackspace();
		ensureBodyHasRoleApplication();
		addNewLinesBeforeBrInPre();
		removePreSerializedStylesWhenSelectingControls();
		deleteControlItemOnBackSpace();
		renderEmptyBlocksFix();
		keepNoScriptContents();
	}

	// IE 11+
	if (tinymce.isIE11) {
		bodyHeight();
		//doubleTrailingBrElements();
		fixControlSelection();
	}

	// IE 12 / Edge
	if (tinymce.isIE12) {
		fixControlSelection();
	}

	// Gecko
	if (tinymce.isGecko && !tinymce.isIE11) {
		removeHrOnBackspace();
		focusBody();
		removeStylesWhenDeletingAccrossBlockElements();
		setGeckoEditingOptions();
		addBrAfterLastLinks();
		removeGhostSelection();
	}

	fakeImageResize();
};