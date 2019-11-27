/**
 * DropMenu.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

(function (tinymce) {
	var DOM = tinymce.DOM,
		each = tinymce.each,
		Event = tinymce.dom.Event,
		undef;

	// http://stackoverflow.com/a/6969486
	function escapeRegExChars(str) {
		return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
	}

	function nodeIndex(nodes, node) {
		for (var i = 0; i < nodes.length; i++) {
			if (nodes[i] === node) {
				return i;
			}
		}

		return -1;
	}

	var specialKeyCodeMap = {
		9: 'tab',
		17: 'ctrl',
		18: 'alt',
		27: 'esc',
		//32: 'space',
		37: 'left',
		39: 'right',
		13: 'enter',
		91: 'cmd',
		38: 'up',
		40: 'down'
	};

	/**
	 * This class is used to create drop menus, a drop menu can be a
	 * context menu, or a menu for a list box or a menu bar.
	 *
	 * @class tinymce.ui.DropMenu
	 * @extends tinymce.ui.Menu
	 * @example
	 * // Adds a menu to the currently active editor instance
	 * var dm = tinyMCE.activeEditor.controlManager.createDropMenu('somemenu');
	 *
	 * // Add some menu items
	 * dm.add({title : 'Menu 1', onclick : function() {
	 *     alert('Item 1 was clicked.');
	 * }});
	 *
	 * dm.add({title : 'Menu 2', onclick : function() {
	 *     alert('Item 2 was clicked.');
	 * }});
	 *
	 * // Adds a submenu
	 * var sub1 = dm.addMenu({title : 'Menu 3'});
	 * sub1.add({title : 'Menu 1.1', onclick : function() {
	 *     alert('Item 1.1 was clicked.');
	 * }});
	 *
	 * // Adds a horizontal separator
	 * sub1.addSeparator();
	 *
	 * sub1.add({title : 'Menu 1.2', onclick : function() {
	 *     alert('Item 1.2 was clicked.');
	 * }});
	 *
	 * // Adds a submenu to the submenu
	 * var sub2 = sub1.addMenu({title : 'Menu 1.3'});
	 *
	 * // Adds items to the sub sub menu
	 * sub2.add({title : 'Menu 1.3.1', onclick : function() {
	 *     alert('Item 1.3.1 was clicked.');
	 * }});
	 *
	 * sub2.add({title : 'Menu 1.3.2', onclick : function() {
	 *     alert('Item 1.3.2 was clicked.');
	 * }});
	 *
	 * dm.add({title : 'Menu 4', onclick : function() {
	 *     alert('Item 3 was clicked.');
	 * }});
	 *
	 * // Display the menu at position 100, 100
	 * dm.showMenu(100, 100);
	 */
	tinymce.create('tinymce.ui.DropMenu:tinymce.ui.Menu', {
		/**
		 * Constructs a new drop menu control instance.
		 *
		 * @constructor
		 * @method DropMenu
		 * @param {String} id Button control id for the button.
		 * @param {Object} s Optional name/value settings object.
		 */
		DropMenu: function (id, s) {
			s = s || {};
			s.container = s.container || DOM.doc.body;
			s.offset_x = s.offset_x || 0;
			s.offset_y = s.offset_y || 0;
			s.vp_offset_x = s.vp_offset_x || 0;
			s.vp_offset_y = s.vp_offset_y || 0;

			this.parent(id, s);
			this.onShowMenu = new tinymce.util.Dispatcher(this);
			this.onHideMenu = new tinymce.util.Dispatcher(this);
			this.classPrefix = 'mceMenu';

			// array of selected elements
			this.selected = [];
		},

		/**
		 * Created a new sub menu for the drop menu control.
		 *
		 * @method createMenu
		 * @param {Object} s Optional name/value settings object.
		 * @return {tinymce.ui.DropMenu} New drop menu instance.
		 */
		createMenu: function (s) {
			var self = this,
				cs = self.settings,
				m;

			s.container = s.container || cs.container;
			s.parent = self;
			s.constrain = s.constrain || cs.constrain;
			s['class'] = s['class'] || cs['class'];
			s.vp_offset_x = s.vp_offset_x || cs.vp_offset_x;
			s.vp_offset_y = s.vp_offset_y || cs.vp_offset_y;
			s.keyboard_focus = cs.keyboard_focus;
			m = new tinymce.ui.DropMenu(s.id || DOM.uniqueId(), s);

			m.onAddItem.add(self.onAddItem.dispatch, self.onAddItem);

			return m;
		},

		focus: function () {
			var self = this;
			if (self.keyboardNav) {
				self.keyboardNav.focus();
			}
		},

		/**
		 * Repaints the menu after new items have been added dynamically.
		 *
		 * @method update
		 */
		update: function () {
			var self = this,
				s = self.settings,
				m = DOM.get('menu_' + self.id);

			if (s.max_width) {
				DOM.setStyle(m, 'width', s.max_width);
			}

			if (s.max_height) {
				DOM.setStyle(m, 'height', s.max_height);
			}
		},

		scrollTo: function (el) {
			var p = el.parentNode;
			p.scrollTop = el.offsetTop;
		},

		selectItem: function (e, node) {
			var self = this, dm, item = self.items[node.id];

			if (!item) {
				return;
			}

			if (item.isDisabled()) {
				return;
			}

			var idx = tinymce.inArray(self.selected, node);

			if (idx >= 0) {
				self.selected.splice(idx, 1);
				item.setSelected(0);
			} else {
				self.selected.push(node);
				item.setSelected(1);
			}

			// trigger click event
			if (item.settings.onclick) {
				item.settings.onclick(e);
			}

			// update tags
			if (self.settings.filter) {
				// clear input
				self.clearFilterInput(true);

				// add tags
				tinymce.each(self.selected, function (el) {
					var item = self.items[el.id];

					if (item) {
						self.addFilterTag(item);
					}
				});

				return;
			}

			dm = self;

			while (dm) {
				if (dm.hideMenu) {
					dm.hideMenu();
				}

				dm = dm.settings.parent;
			}
		},

		findItem: function (val) {
			var self = this, found;

			each(self.items, function (item) {
				if (item.settings.title === val) {
					found = item;

					// break
					return false;
				}
			});

			return found;
		},

		clearFilterInput: function (removetags) {
			var self = this, input = DOM.select('input', 'menu_filter_input_' + self.id)[0];

			// find and clear input element
			input.value = '';
			input.focus();

			self.clearFilteredItems();

			if (removetags) {
				DOM.remove(DOM.select('button', 'menu_filter_' + self.id));
			}
		},

		removeFilterTag: function (tag, item) {
			var self = this;

			DOM.remove(tag);

			if (!item) {
				item = self.findItem(tag.value);
			}

			if (item) {
				var node = DOM.get(item.id);
				self.selectItem({}, node);
			}
		},

		addFilterTag: function (item) {
			var self = this, value = item.settings.title;

			var filter = DOM.get('menu_filter_' + self.id), btn = DOM.create('button', { 'class': 'mceButton', 'value': value }, '<label>' + value + '</label>');
			DOM.insertBefore(btn, filter.lastChild);

			Event.add(btn, 'click', function (evt) {
				evt.preventDefault();

				if (evt.target.nodeName === 'LABEL') {
					return;
				}

				self.removeFilterTag(btn);
			});
		},

		/**
		 * Displays the menu at the specified cordinate.
		 *
		 * @method showMenu
		 * @param {Number} x Horizontal position of the menu.
		 * @param {Number} y Vertical position of the menu.
		 * @param {Numner} px Optional parent X position used when menus are cascading.
		 */
		showMenu: function (x, y, px, py) {
			var self = this,
				s = self.settings,
				co, vp = DOM.getViewPort(),
				w, h, mx, my, ot = 0, cp = self.classPrefix;

			self.collapse(1);

			if (self.isMenuVisible) {
				return;
			}

			if (!self.rendered) {
				co = DOM.add(self.settings.container, self.renderNode());

				each(self.items, function (o) {
					o.postRender();
				});
			} else {
				co = DOM.get('menu_' + self.id);
			}

			DOM.show(co);
			self.update();

			x += s.offset_x || 0;
			y += s.offset_y || 0;

			// Move inside viewport if not submenu
			if (s.constrain) {
				w = co.clientWidth - ot;
				h = co.clientHeight - ot;
				mx = vp.x + vp.w;
				my = vp.y + vp.h;

				if ((x + s.vp_offset_x + w) > mx) {
					x = px ? px - w : Math.max(0, (mx - s.vp_offset_x) - w);
				}

				if ((y + s.vp_offset_y + h) > my) {
					y = py ? py - h - 8 : Math.max(0, (my - s.vp_offset_y) - h);
				}
			}

			DOM.setStyles(co, {
				left: x,
				top: y
			});

			self.isMenuVisible = 1;

			self.mouseClickFunc = Event.add(co, 'click', function (e) {
				var m, n;

				n = e.target;

				// cancel on input click
				if (n.nodeName === "INPUT") {
					return;
				}

				if (n && (n = DOM.getParent(n, '.mceMenuItem')) && !DOM.hasClass(n, cp + 'ItemSub')) {
					self.selectItem(e, n);

					return false; // Cancel to fix onbeforeunload problem
				}
			});

			self.mouseOverFunc = Event.add(co, 'mouseover', function (e) {
				var m, r, n;

				n = e.target;

				if (n && (n = DOM.getParent(n, '.mceMenuItem'))) {
					m = self.items[n.id];

					if (self.hasMenus()) {
						if (self.lastMenu) {
							self.lastMenu.collapse(1);
						}

						if (m.isDisabled()) {
							return;
						}

						if (n && DOM.hasClass(n, cp + 'ItemSub')) {
							r = DOM.getRect(n);
							m.showMenu((r.x + r.w - ot), r.y - ot, r.x);
							self.lastMenu = m;
							DOM.addClass(DOM.get(m.id).firstChild, cp + 'ItemActive');
						}
					}

					if (m.settings.onmouseover) {
						m.settings.onmouseover(e);
					}
				}
			});

			Event.add(co, 'keydown', self._keyDownHandler, self);

			if (s.filter) {
				Event.add(co, 'keyup', self._keyUpHandler, self);
			}

			self.onShowMenu.dispatch(self);

			// scroll to selected item
			each(self.items, function (o) {
				if (o.selected) {
					if (self.settings.filter) {
						self.addFilterTag(o);
					}

					var el = DOM.get(o.id);

					if (el) {
						if (tinymce.inArray(self.selected, el) === -1) {
							self.selected.push(el);
						}
					}
				}
			});

			if (self.selected.length) {
				self.scrollTo(self.selected[0]);
			} else {
				// reset scroll position
				DOM.get('menu_' + self.id + '_items').scrollTop = 0;
			}

			if (s.keyboard_focus) {
				self._setupKeyboardNav();
			}

			if (s.filter) {
				// focus input
				var input = DOM.select('input', 'menu_filter_input_' + self.id);

				if (input) {
					input[0].focus();
				}
			}
		},

		/**
		 * Hides the displayed menu.
		 *
		 * @method hideMenu
		 */
		hideMenu: function (c) {
			var self = this,
				co = DOM.get('menu_' + self.id),
				e;

			if (!self.isMenuVisible) {
				return;
			}

			// reset filter
			if (self.settings.filter) {
				self.clearFilterInput(true);
			}

			// destroy keyboard nav
			if (self.keyboardNav) {
				self.keyboardNav.destroy();
			}

			Event.remove(co, 'click', self.mouseClickFunc);
			Event.remove(co, 'keydown', self._keyDownHandler);
			Event.remove(co, 'keyup', self._keyUpHandler);

			DOM.hide(co);

			self.isMenuVisible = 0;

			if (!c) {
				self.collapse(1);
			}

			if (co) {
				DOM.hide(co);
			}

			e = DOM.get(self.id);

			if (e) {
				DOM.removeClass(e.firstChild, self.classPrefix + 'ItemActive');
			}

			// trigger event
			self.onHideMenu.dispatch(self);
		},

		/**
		 * Adds a new menu, menu item or sub classes of them to the drop menu.
		 *
		 * @method add
		 * @param {tinymce.ui.Control} o Menu or menu item to add to the drop menu.
		 * @return {tinymce.ui.Control} Same as the input control, the menu or menu item.
		 */
		add: function (o) {
			var self = this,
				co;

			o = self.parent(o);

			if (self.isRendered && (co = DOM.get('menu_' + self.id + '_items'))) {
				self._add(co, o);
			}

			return o;
		},

		/**
		 * Collapses the menu, this will hide the menu and all menu items.
		 *
		 * @method collapse
		 * @param {Boolean} d Optional deep state. If this is set to true all children will be collapsed as well.
		 */
		collapse: function (d) {
			this.parent(d);
			this.hideMenu(1);
		},

		/**
		 * Removes a specific sub menu or menu item from the drop menu.
		 *
		 * @method remove
		 * @param {tinymce.ui.Control} o Menu item or menu to remove from drop menu.
		 * @return {tinymce.ui.Control} Control instance or null if it wasn't found.
		 */
		remove: function (o) {
			DOM.remove(o.id);
			this.destroy();

			return this.parent(o);
		},

		/**
		 * Destroys the menu. This will remove the menu from the DOM and any events added to it etc.
		 *
		 * @method destroy
		 */
		destroy: function () {
			var self = this,
				co = DOM.get('menu_' + self.id);

			if (self.keyboardNav) {
				self.keyboardNav.destroy();
			}

			Event.remove(co, 'mouseover', self.mouseOverFunc);
			Event.remove(DOM.select('a', co), 'focus', self.mouseOverFunc);
			Event.remove(co, 'click', self.mouseClickFunc);
			Event.remove(co, 'keyup', self._keyUpHandler);
			Event.remove(co, 'keydown', self._keyDownHandler);

			DOM.remove(co);
		},

		/**
		 * Renders the specified menu node to the dom.
		 *
		 * @method renderNode
		 * @return {Element} Container element for the drop menu.
		 */
		renderNode: function () {
			var self = this,
				s = self.settings, menu, items;

			menu = DOM.create('div', {
				role: 'menu',
				id: 'menu_' + self.id,
				'class': s['class'] + ' ' + self.classPrefix
			});

			if (self.settings.parent) {
				DOM.setAttrib(menu, 'aria-parent', 'menu_' + self.settings.parent.id);
			}

			// create autocomplete filter
			if (s.filter) {
				var filter = DOM.add(menu, 'div', {
					id: 'menu_filter_' + self.id,
					'class': self.classPrefix + 'Filter'
				}, '');

				var filterInput = DOM.add(filter, 'div', {
					id: 'menu_filter_input_' + self.id,
					'class': self.classPrefix + 'FilterInput'
				}, '<input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="..." />')

				self.onHideMenu.add(function () {
					filterInput.firstChild.value = "";
				});
			}

			items = DOM.add(menu, 'div', {
				role: 'presentation',
				id: 'menu_' + self.id + '_items',
				'class': self.classPrefix + 'Items'
			});

			each(self.items, function (o) {
				self._add(items, o);
			});

			self.rendered = true;

			return menu;
		},

		// Internal functions
		_setupKeyboardNav: function () {
			var contextMenu, menuItems, self = this;
			contextMenu = DOM.get('menu_' + self.id);

			menuItems = DOM.select('div[role="option"]', 'menu_' + self.id);
			menuItems.splice(0, 0, contextMenu);

			self.keyboardNav = new tinymce.ui.KeyboardNavigation({
				root: 'menu_' + self.id,
				items: menuItems,
				onCancel: function () {
					self.hideMenu();
				},
				onAction: function (e, id) {
					// process filter value
					if (menuItems.length > 1) {
						if (e.target && e.target.nodeName === "INPUT") {
							var item = self.findItem(e.target.value);

							if (item) {
								id = item.id;
							}

							// clear input
							e.target.value = '';
						}

						var n = DOM.get(id);

						if (n) {
							self.selectItem(e, n);
						}

					} else {
						if (self.settings.onselect) {
							self.settings.onselect(e.target);
						}

						self.hideMenu();
					}
				},
				enableUpDown: true
			});

			contextMenu.focus();
		},

		_updateKeyboardNav: function () {
			// update keyboard nav with new list
			var items = DOM.select('div[role="option"]:not(.mceMenuItemHidden)', 'menu_' + this.id);
			this.keyboardNav.update(items);
		},

		clearFilteredItems: function () {
			each(this.items, function (o, id) {
				DOM.removeClass(id, 'mceMenuItemHidden');
			});

			if (this.keyboardNav) {
				this._updateKeyboardNav();
			}
		},

		filterItems: function (value) {
			var self = this;

			if (value === '') {
				self.clearFilteredItems();
				return;
			}

			var matcher = new RegExp('^' + escapeRegExChars(value), "i");

			each(self.items, function (o, id) {
				var s = o.settings,
					state;

				if (!value || value === undef) {
					state = true;
				} else {
					state = matcher.test(s.title);
				}

				if (state) {
					DOM.removeClass(id, 'mceMenuItemHidden');
				} else {
					DOM.addClass(id, 'mceMenuItemHidden');
				}
			});

			this._updateKeyboardNav();
		},

		_keyDownHandler: function (evt) {
			var self = this;

			// backspace
			if (evt.keyCode === 8) {
				if (evt.target && evt.target.nodeName === "INPUT") {
					var input = evt.target;

					// keep normal behaviour while input has a value
					if (input.value) {
						return;
					}

					var tags = DOM.select('button', 'menu_filter_' + self.id);

					if (tags.length) {
						var tag = tags.pop(), val = DOM.getValue(tag);

						// remove tag
						self.removeFilterTag(tag);

						evt.preventDefault();

						// update value with tag value and focus
						input.value = val;
						input.focus();
					}
				}
			}

			var tabIndex = 0;

			if (evt.keyCode === 9) {
				var nodes = DOM.select('input, button, select, textarea', DOM.get('menu_' + self.id));

				nodes = tinymce.grep(nodes, function (node) {
					return !node.disabled && !DOM.isHidden(node) && node.getAttribute('tabindex') >= 0;
				});

				if (!nodes.length) {
					return;
				}

				DOM.setAttrib(nodes, 'tabindex', 0);

				if (evt.shiftKey) {
					nodes.reverse();
				}

				var endIndex = Math.max(0, nodes.length - 1), tabIndex = nodeIndex(nodes, evt.target);

				tabIndex++;

				tabIndex = Math.max(tabIndex, 0);

				if (tabIndex > endIndex) {
					tabIndex = 0;
				}

				nodes[tabIndex].focus();
				DOM.setAttrib(nodes[tabIndex], 'tabindex', 1);

				evt.preventDefault();
				evt.stopImmediatePropagation();
			}
		},

		_keyUpHandler: function (evt) {
			var self = this;

			if (evt.target && evt.target.nodeName === "INPUT") {
				var input = evt.target;

				setTimeout(function () {
					if (evt.keyCode === 32) {
						var item = self.findItem(input.value);

						if (item) {
							var node = DOM.get(item.id);

							if (node) {
								self.selectItem(evt, node);
							}
						}

						// clear input
						input.value = '';
					}

					if (!specialKeyCodeMap[evt.keyCode]) {
						self.filterItems(input.value);
					}
				}, 0);
			}
		},

		_add: function (menu, o) {
			var s = o.settings,
				cp = this.classPrefix,
				icon;

			if (s.separator) {
				DOM.add(menu, 'div', {
					id: o.id,
					'class': cp + 'Item ' + cp + 'ItemSeparator'
				});

				return;
			}

			var item = DOM.add(menu, 'div', {
				id: o.id,
				'class': cp + 'Item ' + cp + 'ItemEnabled'
			});

			if (s.html) {
				DOM.addClass(item, 'mceMenuHtml');
				DOM.setHTML(item, s.html);
			} else {
				DOM.setAttrib(item, 'role', 'option');

				if (s.icon || s.icon_src) {
					icon = DOM.add(item, 'span', {
						'class': 'mceIcon' + (s.icon ? ' mce_' + s.icon : '')
					});

					if (s.icon_src) {
						DOM.add(icon, 'img', {
							src: s.icon_src
						});
					}
				}

				var txt = DOM.add(item, s.element || 'span', {
					'class': 'mceText',
					title: o.settings.title
				}, o.settings.title);

				if (o.settings.style) {
					if (typeof o.settings.style == "function") {
						o.settings.style = o.settings.style();
					}

					DOM.setAttrib(txt, 'style', o.settings.style);
				}

				if (s.parent) {
					DOM.setAttrib(txt, 'aria-haspopup', 'true');
					DOM.setAttrib(txt, 'aria-owns', 'menu_' + o.id);
				}
			}

			DOM.addClass(item, s['class']);

			if (o.onmouseover) {
				Event.add(item, 'mouseover', o.onmouseover);
			}

			if (o.collapse) {
				DOM.addClass(item, cp + 'ItemSub');
			}
		}
	});
})(tinymce);