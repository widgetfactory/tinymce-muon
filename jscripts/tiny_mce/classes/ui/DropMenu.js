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
		DropMenu: function (id, settings) {
			settings = settings || {};
			settings.container = settings.container || DOM.doc.body;
			settings.offset_x = settings.offset_x || 0;
			settings.offset_y = settings.offset_y || 0;
			settings.vp_offset_x = settings.vp_offset_x || 0;
			settings.vp_offset_y = settings.vp_offset_y || 0;

			if (is(settings.icons) && !settings.icons) {
				settings['class'] += ' mceNoIcons';
			}

			this.parent(id, settings);
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
		createMenu: function (settings) {
			var menu;

			settings = tinymce.extend(this.settings, settings || {});
			settings.parent = this;

			menu = new tinymce.ui.DropMenu(settings.id || DOM.uniqueId(), settings);

			menu.onAddItem.add(this.onAddItem.dispatch, this.onAddItem);

			return menu;
		},

		focus: function () {
			if (this.keyboardNav) {
				this.keyboardNav.focus();
			}
		},

		/**
		 * Repaints the menu after new items have been added dynamically.
		 *
		 * @method update
		 */
		update: function () {
			var settings = this.settings,
				tb = DOM.get('menu_' + this.id + '_tbl'),
				co = DOM.get('menu_' + this.id + '_co'),
				tw, th;

			tw = settings.max_width ? Math.min(co.offsetWidth, settings.max_width) : co.offsetWidth;
			th = settings.max_height ? Math.min(co.offsetHeight, settings.max_height) : co.offsetHeight;

			this.element.setStyles({
				width: tw + 2,
				height: th + 2
			});

			if (settings.max_width) {
				DOM.setStyle(co, 'width', tw);
			}

			if (settings.max_height) {
				DOM.setStyle(co, 'height', th);

				if (tb.clientHeight < settings.max_height) {
					DOM.setStyle(co, 'overflow', 'hidden');
				}
			}
		},

		scrollTo: function (el) {
			el.parentNode.scrollTop = el.offsetTop;
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
				settings = this.settings,
				co, vp = DOM.getViewPort(),
				w, h, mx, my, ot = 2,
				dm, prefix = this.classPrefix;

			this.collapse(1);

			if (this.isMenuVisible) {
				return;
			}

			if (!this.rendered) {
				co = DOM.add(this.settings.container, this.renderNode());

				each(this.items, function (item) {
					item.postRender();
				});

				this.element = new Element('menu_' + this.id, {
					blocker: 1,
					container: settings.container
				});
			} else {
				co = DOM.get('menu_' + this.id);
			}

			// Move layer out of sight
			DOM.setStyles(co, {
				left: -0xFFFF,
				top: -0xFFFF
			});

			DOM.show(co);
			this.update();

			x += settings.offset_x || 0;
			y += settings.offset_y || 0;
			vp.w -= 4;
			vp.h -= 4;

			// Move inside viewport if not submenu
			if (settings.constrain) {
				w = co.clientWidth - ot;
				h = co.clientHeight - ot;
				mx = vp.x + vp.w;
				my = vp.y + vp.h;

				if ((x + settings.vp_offset_x + w) > mx) {
					x = px ? px - w : Math.max(0, (mx - settings.vp_offset_x) - w);
				}

				if ((y + settings.vp_offset_y + h) > my) {
					y = Math.max(0, (my - settings.vp_offset_y) - h);
				}
			}

			DOM.setStyles(co, {
				left: x,
				top: y
			});

			this.element.update();

			this.isMenuVisible = 1;
			this.mouseClickFunc = Event.add(co, 'click', function (e) {
				var menu, node;

				node = e.target;

				// cancel on input click
				if (node.nodeName === "INPUT") {
					return;
				}

				if (node && (node = DOM.getParent(node, 'div.mceMenuItem')) && !DOM.hasClass(node, prefix + 'ItemSub')) {
					menu = self.items[node.id];

					self.selected = node;

					if (menu.isDisabled()) {
						return;
					}

					dm = self;

					while (dm) {
						if (dm.hideMenu) {
							dm.hideMenu();
						}

						dm = dm.settings.parent;
					}

					if (menu.settings.onclick) {
						menu.settings.onclick(e);
					}

					return false; // Cancel to fix onbeforeunload problem
				}
			});

			this.mouseOverFunc = Event.add(co, 'mouseover', function (e) {
				var menu, r, node;

				node = e.target;

				if (node && (node = DOM.getParent(node, 'div.mceMenuItem'))) {
					menu = self.items[node.id];

					if (self.hasMenus()) {
						if (self.lastMenu) {
							self.lastMenu.collapse(1);
						}

						if (menu.isDisabled()) {
							return;
						}

						if (node && DOM.hasClass(node, prefix + 'ItemSub')) {
							r = DOM.getRect(node);
							menu.showMenu((r.x + r.w - ot), r.y - ot, r.x);
							self.lastMenu = menu;
							DOM.addClass(DOM.get(menu.id).firstChild, prefix + 'ItemActive');
						}
					}

					if (menu.settings.onmouseover) {
						menu.settings.onmouseover(e);
					}
				}
			});

			Event.add(co, 'keydown', this._keyHandler, this);

			this.onShowMenu.dispatch(this);

			// scroll to selected item
			each(this.items, function (item) {
				if (item.selected) {
					var el = DOM.get(item.id);

					if (el) {
						self.selected = el;
					}

					return false;
				}
			});

			if (this.selected) {
				this.scrollTo(this.selected);
			} else {
				// reset scroll position
				DOM.get('menu_' + this.id + '_tbl').scrollTop = 0;
			}

			if (settings.keyboard_focus) {
				this._setupKeyboardNav();
			}
		},

		/**
		 * Hides the displayed menu.
		 *
		 * @method hideMenu
		 */
		hideMenu: function (collapse) {
			var co = DOM.get('menu_' + this.id),
				elm;

			if (!this.isMenuVisible) {
				return;
			}

			if (this.keyboardNav) {
				this.keyboardNav.destroy();
			}

			Event.remove(co, 'mouseover', this.mouseOverFunc);
			Event.remove(co, 'click', this.mouseClickFunc);
			Event.remove(co, 'keydown', this._keyHandler);
			DOM.hide(co);

			this.isMenuVisible = 0;

			if (!collapse) {
				this.collapse(1);
			}

			if (this.element) {
				this.element.hide();
			}

			elm = DOM.get(this.id);

			if (elm) {
				DOM.removeClass(elm.firstChild, this.classPrefix + 'ItemActive');
			}

			this.onHideMenu.dispatch(this);
		},

		/**
		 * Adds a new menu, menu item or sub classes of them to the drop menu.
		 *
		 * @method add
		 * @param {tinymce.ui.Control} o Menu or menu item to add to the drop menu.
		 * @return {tinymce.ui.Control} Same as the input control, the menu or menu item.
		 */
		add: function (menu) {
			var item;

			menu = this.parent(menu);

			if (this.isRendered && (item = DOM.get('menu_' + this.id))) {
				this._add(item, menu);
			}

			return menu;
		},

		/**
		 * Collapses the menu, this will hide the menu and all menu items.
		 *
		 * @method collapse
		 * @param {Boolean} state Optional deep state. If this is set to true all children will be collapsed as well.
		 */
		collapse: function (state) {
			this.parent(state);
			this.hideMenu(1);
		},

		/**
		 * Removes a specific sub menu or menu item from the drop menu.
		 *
		 * @method remove
		 * @param {tinymce.ui.Control} menu Menu item or menu to remove from drop menu.
		 * @return {tinymce.ui.Control} Control instance or null if it wasn't found.
		 */
		remove: function (menu) {
			DOM.remove(menu.id);
			this.destroy();

			return this.parent(menu);
		},

		/**
		 * Destroys the menu. This will remove the menu from the DOM and any events added to it etc.
		 *
		 * @method destroy
		 */
		destroy: function () {
			var menu = DOM.get('menu_' + this.id);

			if (this.keyboardNav) {
				this.keyboardNav.destroy();
			}

			Event.remove(menu, 'mouseover', this.mouseOverFunc);
			Event.remove(DOM.select('a', menu), 'focus', this.mouseOverFunc);
			Event.remove(menu, 'click', this.mouseClickFunc);
			Event.remove(menu, 'keydown', this._keyHandler);

			if (this.element) {
				this.element.remove();
			}

			DOM.remove(menu);
		},

		/**
		 * Renders the specified menu node to the dom.
		 *
		 * @method renderNode
		 * @return {Element} Container element for the drop menu.
		 */
		renderNode: function () {
			var self = this,
				settings = this.settings,
				node, item, menu;

			if (settings['class'].indexOf('defaultSkin') === -1) {
				settings['class'] = 'defaultSkin ' + settings['class'];
			}

			menu = DOM.create('div', {
				role: 'listbox',
				id: 'menu_' + this.id,
				'class': settings['class'],
				'style': 'position:absolute;left:0;top:0;z-index:200000;outline:0'
			});

			if (this.settings.parent) {
				DOM.setAttrib(menu, 'aria-parent', 'menu_' + this.settings.parent.id);
			}

			item = DOM.add(menu, 'div', {
				role: 'presentation',
				id: 'menu_' + this.id + '_co',
				'class': this.classPrefix + (settings['class'] ? ' ' + settings['class'] : '')
			});

			this.element = new Element('menu_' + this.id, {
				blocker: 1,
				container: settings.container
			});

			if (settings.menu_line) {
				DOM.add(item, 'div', {
					'class': this.classPrefix + 'Line'
				});
			}

			if (settings.filter) {
				var filter = DOM.add(item, 'div', {
					'class': this.classPrefix + 'Filter'
				}, '<input type="text" />');

				this.onHideMenu.add(function () {
					filter.firstChild.value = "";

					each(this.items, function (item, id) {
						DOM.removeClass(id, 'mceMenuItemHidden');
					});
				});
			}

			node = DOM.add(item, 'div', {
				role: 'presentation',
				id: 'menu_' + this.id + '_tbl',
				'class': this.classPrefix + 'Items'
			});

			each(this.items, function (o) {
				self._add(node, o);
			});

			this.rendered = true;

			return menu;
		},

		// Internal functions
		_setupKeyboardNav: function () {
			var self = this,
				contextMenu, menuItems;

			contextMenu = DOM.get('menu_' + this.id);
			menuItems = DOM.select('a[role=option]', 'menu_' + this.id);

			menuItems.splice(0, 0, contextMenu);

			this.keyboardNav = new tinymce.ui.KeyboardNavigation({
				root: 'menu_' + this.id,
				items: menuItems,
				onCancel: function () {
					self.hideMenu();
				},
				enableUpDown: true
			});

			contextMenu.focus();
		},

		_filter: function (evt) {
			var node = evt.target;

			var matcher = new RegExp('^' + escapeRegExChars(node.value), "i");

			each(this.items, function (item, id) {
				var settings = item.settings,
					state;

				if (!node.value || settings.value === undef) {
					state = true;
				} else {
					state = matcher.test(settings.title);
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
			var node, settings = o.settings,
				a, ro, it, prefix = this.classPrefix,
				ic;

			if (settings.separator) {
				ro = DOM.add(tb, 'div', {
					'class': prefix + 'ItemSeparator'
				});

				node = ro.previousSibling;

				if (node) {
					DOM.addClass(node, 'mceLast');
				}

				return;
			}

			node = it = DOM.add(tb, 'div', {
				id: o.id,
				'class': prefix + 'Item ' + prefix + 'ItemEnabled'
			});

			if (settings.html) {
				node = DOM.add(node, 'div', {
					'class': 'mceMenuHtml'
				}, settings.html);
			} else {
				node = a = DOM.add(node, 'a', {
					id: o.id + '_aria',
					role: settings.titleItem ? 'presentation' : 'option',
					href: 'javascript:;',
					onclick: "return false;",
					onmousedown: 'return false;'
				});

				ic = DOM.add(node, 'span', {
					'class': 'mceIcon' + (settings.icon ? ' mce_' + settings.icon : '')
				});

				if (settings.icon_src) {
					DOM.add(ic, 'img', {
						src: settings.icon_src
					});
				}

				node = DOM.add(node, settings.element || 'span', {
					'class': 'mceText',
					title: o.settings.title
				}, o.settings.title);

				if (settings.parent) {
					DOM.setAttrib(a, 'aria-haspopup', 'true');
					DOM.setAttrib(a, 'aria-owns', 'menu_' + o.id);
				}
			}

			DOM.addClass(it, settings['class']);

			if (o.settings.style) {
				if (typeof o.settings.style == "function") {
					o.settings.style = o.settings.style();
				}

				DOM.setAttrib(node, 'style', o.settings.style);
			}

			if (o.onmouseover) {
				Event.add(node, 'mouseover', o.onmouseover);
			}

			if (tb.childNodes.length == 1) {
				DOM.addClass(it, 'mceFirst');
			}

			node = it.previousSibling;

			if (node && DOM.hasClass(node, prefix + 'ItemSeparator')) {
				DOM.addClass(ro, 'mceFirst');
			}

			if (o.collapse) {
				DOM.addClass(it, prefix + 'ItemSub');
			}

			if (node) {
				DOM.removeClass(node, 'mceLast');
			}

			DOM.addClass(it, 'mceLast');
		}
	});
})(tinymce);