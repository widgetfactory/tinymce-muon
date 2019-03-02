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
	var is = tinymce.is,
		DOM = tinymce.DOM,
		each = tinymce.each,
		Event = tinymce.dom.Event,
		Element = tinymce.dom.Element,
		undef;

	// http://stackoverflow.com/a/6969486
	function escapeRegExChars(str) {
		return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
	}

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

			if (is(s.icons) && !s.icons) {
				s['class'] += ' mceNoIcons';
			}

			this.parent(id, s);
			this.onShowMenu = new tinymce.util.Dispatcher(this);
			this.onHideMenu = new tinymce.util.Dispatcher(this);
			this.classPrefix = 'mceMenu';
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
				tb = DOM.get('menu_' + self.id + '_tbl'),
				co = DOM.get('menu_' + self.id + '_co'),
				tw, th;

			tw = s.max_width ? Math.min(co.offsetWidth, s.max_width) : co.offsetWidth;
			th = s.max_height ? Math.min(co.offsetHeight, s.max_height) : co.offsetHeight;

			if (!DOM.boxModel) {
				self.element.setStyles({
					width: tw + 2,
					height: th + 2
				});
			} else {
				self.element.setStyles({
					width: tw,
					height: th
				});
			}

			if (s.max_width) {
				DOM.setStyle(co, 'width', tw);
			}

			if (s.max_height) {
				DOM.setStyle(co, 'height', th);

				if (tb.clientHeight < s.max_height) {
					DOM.setStyle(co, 'overflow', 'hidden');
				}
			}
		},

		scrollTo: function (el) {
			var p = el.parentNode;
			p.scrollTop = el.offsetTop;
		},

		/**
		 * Displays the menu at the specified cordinate.
		 *
		 * @method showMenu
		 * @param {Number} x Horizontal position of the menu.
		 * @param {Number} y Vertical position of the menu.
		 * @param {Numner} px Optional parent X position used when menus are cascading.
		 */
		showMenu: function (x, y, px) {
			var self = this,
				s = self.settings,
				co, vp = DOM.getViewPort(),
				w, h, mx, my, ot = 0,
				dm, cp = self.classPrefix;

			self.collapse(1);

			if (self.isMenuVisible) {
				return;
			}

			if (!self.rendered) {
				co = DOM.add(self.settings.container, self.renderNode());

				each(self.items, function (o) {
					o.postRender();
				});

				self.element = new Element('menu_' + self.id, {
					blocker: 1,
					container: s.container
				});
			} else {
				co = DOM.get('menu_' + self.id);
			}

			DOM.show(co);
			self.update();

			x += s.offset_x || 0;
			y += s.offset_y || 0;
			vp.w -= 4;
			vp.h -= 4;

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
					y = Math.max(0, (my - s.vp_offset_y) - h);
				}
			}

			DOM.setStyles(co, {
				left: x,
				top: y
			});
			
			self.element.update();

			self.isMenuVisible = 1;
			self.mouseClickFunc = Event.add(co, 'click', function (e) {
				var m, n;

				n = e.target;

				// cancel on input click
				if (n.nodeName === "INPUT") {
					return;
				}

				if (n && (n = DOM.getParent(n, 'div.mceMenuItem')) && !DOM.hasClass(n, cp + 'ItemSub')) {
					m = self.items[n.id];

					self.selected = n;

					if (m.isDisabled()) {
						return;
					}

					dm = self;

					while (dm) {
						if (dm.hideMenu) {
							dm.hideMenu();
						}

						dm = dm.settings.parent;
					}

					if (m.settings.onclick) {
						m.settings.onclick(e);
					}

					return false; // Cancel to fix onbeforeunload problem
				}
			});

			self.mouseOverFunc = Event.add(co, 'mouseover', function (e) {
				var m, r, n;

				n = e.target;

				if (n && (n = DOM.getParent(n, 'div.mceMenuItem'))) {
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

			Event.add(co, 'keydown', self._keyHandler, self);

			self.onShowMenu.dispatch(self);

			// scroll to selected item
			each(self.items, function (o) {
				if (o.selected) {
					var el = DOM.get(o.id);

					if (el) {
						self.selected = el;
					}

					return false;
				}
			});

			if (self.selected) {
				self.scrollTo(self.selected);
			} else {
				// reset scroll position
				DOM.get('menu_' + self.id + '_tbl').scrollTop = 0;
			}

			if (s.keyboard_focus) {
				self._setupKeyboardNav();
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

			if (self.keyboardNav) {
				self.keyboardNav.destroy();
			}
			Event.remove(co, 'mouseover', self.mouseOverFunc);
			Event.remove(co, 'click', self.mouseClickFunc);
			Event.remove(co, 'keydown', self._keyHandler);
			DOM.hide(co);
			self.isMenuVisible = 0;

			if (!c) {
				self.collapse(1);
			}

			if (self.element) {
				self.element.hide();
			}

			e = DOM.get(self.id);

			if (e) {
				DOM.removeClass(e.firstChild, self.classPrefix + 'ItemActive');
			}

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

			if (self.isRendered && (co = DOM.get('menu_' + self.id))) {
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
			Event.remove(co, 'keydown', self._keyHandler);

			if (self.element) {
				self.element.remove();
			}

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
				s = self.settings,
				n, co, w;

			if (s['class'].indexOf('defaultSkin') === -1) {
				s['class'] = 'defaultSkin ' + s['class'];
			}

			w = DOM.create('div', {
				role: 'listbox',
				id: 'menu_' + self.id,
				'class': s['class'],
				'style': 'position:absolute;left:0;top:0;z-index:200000;outline:0'
			});

			if (self.settings.parent) {
				DOM.setAttrib(w, 'aria-parent', 'menu_' + self.settings.parent.id);
			}

			co = DOM.add(w, 'div', {
				role: 'presentation',
				id: 'menu_' + self.id + '_co',
				'class': self.classPrefix + (s['class'] ? ' ' + s['class'] : '')
			});
			self.element = new Element('menu_' + self.id, {
				blocker: 1,
				container: s.container
			});

			if (s.menu_line) {
				DOM.add(co, 'div', {
					'class': self.classPrefix + 'Line'
				});
			}

			if (s.filter) {
				var filter = DOM.add(co, 'div', {
					'class': self.classPrefix + 'Filter'
				}, '<input type="text" />');

				self.onHideMenu.add(function () {
					filter.firstChild.value = "";

					each(self.items, function (o, id) {
						DOM.removeClass(id, 'mceMenuItemHidden');
					});
				});
			}

			n = DOM.add(co, 'div', {
				role: 'presentation',
				id: 'menu_' + self.id + '_tbl',
				'class': self.classPrefix + 'Items'
			});

			each(self.items, function (o) {
				self._add(n, o);
			});

			self.rendered = true;

			return w;
		},

		// Internal functions
		_setupKeyboardNav: function () {
			var contextMenu, menuItems, self = this;
			contextMenu = DOM.get('menu_' + self.id);
			menuItems = DOM.select('a[role=option]', 'menu_' + self.id);
			menuItems.splice(0, 0, contextMenu);
			self.keyboardNav = new tinymce.ui.KeyboardNavigation({
				root: 'menu_' + self.id,
				items: menuItems,
				onCancel: function () {
					self.hideMenu();
				},
				enableUpDown: true
			});
			contextMenu.focus();
		},

		_filter: function (evt) {
			var self = this,
				n = evt.target;

			var matcher = new RegExp('^' + escapeRegExChars(n.value), "i");

			each(self.items, function (o, id) {
				var s = o.settings,
					state;

				if (!n.value || s.value === undef) {
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
		},

		_keyHandler: function (evt) {
			var self = this;

			var specialKeyCodeMap = {
				9: 'tab',
				17: 'ctrl',
				18: 'alt',
				27: 'esc',
				32: 'space',
				37: 'left',
				39: 'right',
				13: 'enter',
				91: 'cmd'
			};

			if (evt.target && evt.target.nodeName === "INPUT") {
				setTimeout(function () {
					if (!specialKeyCodeMap[evt.keyCode]) {
						self._filter(evt);
					}

					if (evt.keyCode === 13 && evt.target.value) {
						if (self.settings.onselect) {
							self.settings.onselect(evt.target.value);
						}
					}
				}, 0);
			}

			switch (evt.keyCode) {
				case 37: // Left
					if (self.settings.parent) {
						self.hideMenu();
						self.settings.parent.focus();
						Event.cancel(evt);
					}
					break;
				case 39: // Right
					if (self.mouseOverFunc) {
						self.mouseOverFunc(evt);
					}
					break;
			}
		},

		_add: function (tb, o) {
			var n, s = o.settings,
				a, ro, it, cp = this.classPrefix,
				ic;

			if (s.separator) {
				ro = DOM.add(tb, 'div', {
					'class': cp + 'ItemSeparator'
				});

				n = ro.previousSibling;

				if (n) {
					DOM.addClass(n, 'mceLast');
				}

				return;
			}

			n = it = DOM.add(tb, 'div', {
				id: o.id,
				'class': cp + 'Item ' + cp + 'ItemEnabled'
			});

			if (s.html) {
				n = DOM.add(n, 'div', {
					'class': 'mceMenuHtml'
				}, s.html);
			} else {
				n = a = DOM.add(n, 'a', {
					id: o.id + '_aria',
					role: s.titleItem ? 'presentation' : 'option',
					href: 'javascript:;',
					onclick: "return false;",
					onmousedown: 'return false;'
				});

				ic = DOM.add(n, 'span', {
					'class': 'mceIcon' + (s.icon ? ' mce_' + s.icon : '')
				});

				if (s.icon_src) {
					DOM.add(ic, 'img', {
						src: s.icon_src
					});
				}

				n = DOM.add(n, s.element || 'span', {
					'class': 'mceText',
					title: o.settings.title
				}, o.settings.title);

				if (s.parent) {
					DOM.setAttrib(a, 'aria-haspopup', 'true');
					DOM.setAttrib(a, 'aria-owns', 'menu_' + o.id);
				}
			}

			DOM.addClass(it, s['class']);

			if (o.settings.style) {
				if (typeof o.settings.style == "function") {
					o.settings.style = o.settings.style();
				}

				DOM.setAttrib(n, 'style', o.settings.style);
			}

			if (o.onmouseover) {
				Event.add(n, 'mouseover', o.onmouseover);
			}

			if (tb.childNodes.length == 1) {
				DOM.addClass(it, 'mceFirst');
			}

			n = it.previousSibling;

			if (n && DOM.hasClass(n, cp + 'ItemSeparator')) {
				DOM.addClass(ro, 'mceFirst');
			}

			if (o.collapse) {
				DOM.addClass(it, cp + 'ItemSub');
			}

			if (n) {
				DOM.removeClass(n, 'mceLast');
			}

			DOM.addClass(it, 'mceLast');
		}
	});
})(tinymce);