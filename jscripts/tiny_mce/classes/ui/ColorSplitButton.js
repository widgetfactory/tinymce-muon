/**
 * ColorSplitButton.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

(function (tinymce) {
	var DOM = tinymce.DOM,
		Event = tinymce.dom.Event,
		is = tinymce.is,
		each = tinymce.each;

	/**
	 * This class is used to create UI color split button. A color split button will present show a small color picker
	 * when you press the open menu.
	 *
	 * @class tinymce.ui.ColorSplitButton
	 * @extends tinymce.ui.SplitButton
	 */
	tinymce.create('tinymce.ui.ColorSplitButton:tinymce.ui.SplitButton', {
		/**
		 * Constructs a new color split button control instance.
		 *
		 * @constructor
		 * @method ColorSplitButton
		 * @param {String} id Control id for the color split button.
		 * @param {Object} s Optional name/value settings object.
		 * @param {Editor} editor The editor instance this button is for.
		 */
		ColorSplitButton: function (id, settings, editor) {
			this.parent(id, settings, editor);

			/**
			 * Settings object.
			 *
			 * @property settings
			 * @type Object
			 */
			this.settings = tinymce.extend({
				colors: '000000,993300,333300,003300,003366,000080,333399,333333,800000,FF6600,808000,008000,008080,0000FF,666699,808080,FF0000,FF9900,99CC00,339966,33CCCC,3366FF,800080,999999,FF00FF,FFCC00,FFFF00,00FF00,00FFFF,00CCFF,993366,FFFFFF,FF99CC,FFCC99,FFFF99,CCFFCC,CCFFFF,99CCFF,CC99FF',
				grid_width: 8,
				default_color: '#888888'
			}, settings || {});

			/**
			 * Fires when the menu is shown.
			 *
			 * @event onShowMenu
			 */
			this.onShowMenu = new tinymce.util.Dispatcher(this);

			/**
			 * Fires when the menu is hidden.
			 *
			 * @event onHideMenu
			 */
			this.onHideMenu = new tinymce.util.Dispatcher(this);

			/**
			 * Current color value.
			 *
			 * @property value
			 * @type String
			 */
			this.value = settings.default_color;
		},

		/**
		 * Shows the color menu. The color menu is a layer places under the button
		 * and displays a table of colors for the user to pick from.
		 *
		 * @method showMenu
		 */
		showMenu: function () {
			var self = this,
				elm, pos;

			if (this.isDisabled()) {
				return;
			}

			if (!this.isMenuRendered) {
				this.renderMenu();
				this.isMenuRendered = true;
			}

			if (this.isMenuVisible) {
				return this.hideMenu();
			}

			elm = DOM.get(this.id);

			DOM.show(this.id + '_menu');
			DOM.addClass(elm, 'mceSplitButtonSelected');
			pos = DOM.getPos(elm);

			DOM.setStyles(this.id + '_menu', {
				left: pos.x,
				top: pos.y + elm.firstChild.clientHeight,
				zIndex: 200000
			});

			elm = 0;

			Event.add(DOM.doc, 'mousedown', this.hideMenu, this);
			this.onShowMenu.dispatch(this);

			if (this._focused) {
				this._keyHandler = Event.add(this.id + '_menu', 'keydown', function (e) {
					if (e.keyCode == 27) {
						this.hideMenu();
					}
				});

				DOM.select('a', this.id + '_menu')[0].focus(); // Select first link
			}

			this.keyboardNav = new tinymce.ui.KeyboardNavigation({
				root: this.id + '_menu',
				items: DOM.select('a', this.id + '_menu'),
				onCancel: function () {
					self.hideMenu();
					self.focus();
				}
			});

			this.keyboardNav.focus();
			this.isMenuVisible = 1;
		},

		/**
		 * Hides the color menu. The optional event parameter is used to check where the event occurred so it
		 * doesn't close them menu if it was a event inside the menu.
		 *
		 * @method hideMenu
		 * @param {Event} e Optional event object.
		 */
		hideMenu: function (e) {
			var self = this;

			if (this.isMenuVisible) {
				// Prevent double toogles by canceling the mouse click event to the button
				if (e && e.type == "mousedown") {
					var parent = DOM.getParent(e.target, function (elm) {
						return elm.id === self.id + '_open';
					});

					if (parent) {
						return;
					}
				}

				if (!e || !DOM.getParent(e.target, '.mceSplitButtonMenu')) {
					DOM.removeClass(this.id, 'mceSplitButtonSelected');
					Event.remove(DOM.doc, 'mousedown', this.hideMenu, this);
					Event.remove(this.id + '_menu', 'keydown', this._keyHandler);
					DOM.hide(this.id + '_menu');
				}

				this.isMenuVisible = 0;
				this.onHideMenu.dispatch();
				this.keyboardNav.destroy();
			}
		},

		/**
		 * Renders the menu to the DOM.
		 *
		 * @method renderMenu
		 */
		renderMenu: function () {
			var self = this,
				menu, i = 0,
				settings = this.settings,
				node, tb, tr, list, context;

			if (settings.menu_class.indexOf('defaultSkin') === -1) {
				settings.menu_class = 'defaultSkin ' + settings.menu_class;
			}

			list = DOM.add(settings.menu_container, 'div', {
				role: 'listbox',
				id: this.id + '_menu',
				'class': settings.menu_class + ' ' + settings['class'],
				style: 'position:absolute;left:0;top:-1000px;'
			});

			menu = DOM.add(list, 'div', {
				'class': settings['class'] + ' mceSplitButtonMenu'
			});

			DOM.add(menu, 'span', {
				'class': 'mceMenuLine'
			});

			node = DOM.add(menu, 'table', {
				role: 'presentation',
				'class': 'mceColorSplitMenu'
			});
			tb = DOM.add(node, 'tbody');

			// Generate color grid
			i = 0;
			each(is(settings.colors, 'array') ? settings.colors : settings.colors.split(','), function (color) {
				color = color.replace(/^#/, '');

				if (!i--) {
					tr = DOM.add(tb, 'tr');
					i = settings.grid_width - 1;
				}

				node = DOM.add(tr, 'td');

				var args = {
					href: 'javascript:;',
					style: {
						backgroundColor: '#' + color
					},
					'title': self.editor.getLang('colors.' + color, '#' + color),
					'data-mce-color': '#' + color
				};

				// adding a proper ARIA role = button causes JAWS to read things incorrectly on IE.
				args.role = 'option';

				node = DOM.add(node, 'a', args);

				if (self.editor.forcedHighContrastMode) {
					node = DOM.add(node, 'canvas', {
						width: 16,
						height: 16,
						'aria-hidden': 'true'
					});
					if (node.getContext && (context = node.getContext("2d"))) {
						context.fillStyle = '#' + color;
						context.fillRect(0, 0, 16, 16);
					} else {
						// No point leaving a canvas element around if it'settings not supported for drawing on anyway.
						DOM.remove(node);
					}
				}
			});

			node = DOM.add(tr, 'td', {
				'class': 'mceRemoveColor'
			});

			node = DOM.add(node, 'a', {
				href: 'javascript:;',
				'title': this.editor.getLang('advanced.no_color', 'No Colour'),
				'data-mce-color': '',
				role: 'option'
			});

			if (settings.more_colors_func) {
				node = DOM.add(tb, 'tr');
				node = DOM.add(node, 'td', {
					colspan: settings.grid_width,
					'class': 'mceMoreColors'
				});

				node = DOM.add(node, 'a', {
					role: 'option',
					id: this.id + '_more',
					href: 'javascript:;',
					onclick: 'return false;',
					'class': 'mceMoreColors'
				}, settings.more_colors_title);

				Event.add(node, 'click', function (e) {
					settings.more_colors_func.call(settings.more_colors_scope || self);
					return Event.cancel(e); // Cancel to fix onbeforeunload problem
				});
			}

			DOM.addClass(menu, 'mceColorSplitMenu');

			// Prevent IE from scrolling and hindering click to occur #4019
			Event.add(this.id + '_menu', 'mousedown', function (e) {
				return Event.cancel(e);
			});

			Event.add(this.id + '_menu', 'click', function (e) {
				var elm = DOM.getParent(e.target, 'a', tb);

				var color = elm.getAttribute('data-mce-color');

				if (elm && elm.nodeName.toLowerCase() == 'a' && typeof color !== "undefined") {
					self.setColor(color);
				}

				return false; // Prevent IE auto save warning
			});

			return list;
		},

		/**
		 * Sets the current color for the control and hides the menu if it should be visible.
		 *
		 * @method setColor
		 * @param {String} color Color code value in hex for example: #FF00FF
		 */
		setColor: function (color) {
			this.displayColor(color);
			this.hideMenu();
			this.settings.onselect(color);
		},

		/**
		 * Change the currently selected color for the control.
		 *
		 * @method displayColor
		 * @param {String} c Color code value in hex for example: #FF00FF
		 */
		displayColor: function (color) {
			DOM.setStyle(this.id + '_preview', 'backgroundColor', color);

			this.value = color;
		},

		/**
		 * Post render event. This will be executed after the control has been rendered and can be used to
		 * set states, add events to the control etc. It's recommended for subclasses of the control to call this method by using this.parent().
		 *
		 * @method postRender
		 */
		postRender: function () {
			this.parent();

			DOM.add(this.id + '_action', 'div', {
				id: this.id + '_preview',
				'class': 'mceColorPreview'
			});

			DOM.setStyle(this.id + '_preview', 'backgroundColor', this.value);
		},

		/**
		 * Destroys the control. This means it will be removed from the DOM and any
		 * events tied to it will also be removed.
		 *
		 * @method destroy
		 */
		destroy: function () {
			self.parent();

			Event.clear(this.id + '_menu');
			Event.clear(this.id + '_more');
			DOM.remove(this.id + '_menu');

			if (this.keyboardNav) {
				this.keyboardNav.destroy();
			}
		}
	});
})(tinymce);