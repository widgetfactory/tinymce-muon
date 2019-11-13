/**
 * ListBox.js
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
		each = tinymce.each,
		Dispatcher = tinymce.util.Dispatcher,
		undef;

	/**
	 * This class is used to create list boxes/select list. This one will generate
	 * a non native control. This one has the benefits of having visual items added.
	 *
	 * @class tinymce.ui.ListBox
	 * @extends tinymce.ui.Control
	 * @example
	 * // Creates a new plugin class and a custom listbox
	 * tinymce.create('tinymce.plugins.ExamplePlugin', {
	 *     createControl: function(n, cm) {
	 *         switch (n) {
	 *             case 'mylistbox':
	 *                 var mlb = cm.createListBox('mylistbox', {
	 *                      title : 'My list box',
	 *                      onselect : function(v) {
	 *                          tinyMCE.activeEditor.windowManager.alert('Value selected:' + v);
	 *                      }
	 *                 });
	 *
	 *                 // Add some values to the list box
	 *                 mlb.add('Some item 1', 'val1');
	 *                 mlb.add('some item 2', 'val2');
	 *                 mlb.add('some item 3', 'val3');
	 *
	 *                 // Return the new listbox instance
	 *                 return mlb;
	 *         }
	 *
	 *         return null;
	 *     }
	 * });
	 *
	 * // Register plugin with a short name
	 * tinymce.PluginManager.add('example', tinymce.plugins.ExamplePlugin);
	 *
	 * // Initialize TinyMCE with the new plugin and button
	 * tinyMCE.init({
	 *    ...
	 *    plugins : '-example', // - means TinyMCE will not try to load it
	 *    theme_advanced_buttons1 : 'mylistbox' // Add the new example listbox to the toolbar
	 * });
	 */

	var specialKeyCodeMap = {
		9: 'tab',
		17: 'ctrl',
		18: 'alt',
		27: 'esc',
		32: 'space',
		37: 'left',
		39: 'right',
		13: 'enter',
		91: 'cmd',
		38: 'up',
		40: 'down'
	};

	tinymce.create('tinymce.ui.ListBox:tinymce.ui.Control', {
		/**
		 * Constructs a new listbox control instance.
		 *
		 * @constructor
		 * @method ListBox
		 * @param {String} id Control id for the list box.
		 * @param {Object} s Optional name/value settings object.
		 * @param {Editor} ed Optional the editor instance this button is for.
		 */
		ListBox: function (id, s, ed) {
			var self = this;

			this.parent(id, s, ed);

			/**
			 * Array of ListBox items.
			 *
			 * @property items
			 * @type Array
			 */
			this.items = s.items || [];

			/**
			 * Fires when the selection has been changed.
			 *
			 * @event onChange
			 */
			this.onChange = new Dispatcher(this);

			/**
			 * Fires after the element has been rendered to DOM.
			 *
			 * @event onPostRender
			 */
			this.onPostRender = new Dispatcher(this);

			/**
			 * Fires when a new item is added.
			 *
			 * @event onAdd
			 */
			this.onAdd = new Dispatcher(this);

			/**
			 * Fires before the menu gets rendered.
			 *
			 * @event onBeforeRenderMenu
			 */
			this.onBeforeRenderMenu = new Dispatcher(this);

			/**
			 * Fires when the menu gets rendered.
			 *
			 * @event onRenderMenu
			 */
			this.onRenderMenu = new Dispatcher(this);

			this.classPrefix = 'mceListBox';
			this.marked = {};
		},

		/**
		 * Selects a item/option by value. This will both add a visual selection to the
		 * item and change the title of the control to the title of the option.
		 *
		 * @method select
		 * @param {String/function} value Value to look for inside the list box or a function selector.
		 */
		select: function (value) {
			var self = this,
				fv, fn;

			this.marked = {};

			if (value == undef) {
				return this.selectByIndex(-1);
			}

			// Is string or number make function selector
			if (value && typeof (value) == "function") {
				fn = value;
			} else {
				fn = function (val) {
					return val == value;
				};
			}

			// Do we need to do something?
			if (value != this.selectedValue) {
				// Find item
				each(this.items, function (item, i) {
					if (fn(item.value)) {
						fv = 1;
						self.selectByIndex(i);
						return false;
					}
				});

				if (!fv) {
					this.selectByIndex(-1);
				}
			}
		},

		value: function (val) {
			if (!arguments.length) {
				return this.selectedValue;
			}

			this.select(val);
		},

		/**
		 * Selects a item/option by index. This will both add a visual selection to the
		 * item and change the title of the control to the title of the option.
		 *
		 * @method selectByIndex
		 * @param {String} idx Index to select, pass -1 to select menu/title of select box.
		 */
		selectByIndex: function (idx) {
			var elm, item, label;

			this.marked = {};

			if (idx != this.selectedIndex) {
				elm = DOM.get(this.id + '_text');
				item = this.items[idx];

				if (item) {
					this.selectedValue = item.value;
					this.selectedIndex = idx;
					DOM.setHTML(elm, DOM.encode(item.title));
					DOM.removeClass(elm, 'mceTitle');
					DOM.setAttrib(this.id, 'aria-valuenow', item.title);
				} else {
					DOM.setHTML(elm, DOM.encode(this.settings.title));
					DOM.addClass(elm, 'mceTitle');
					this.selectedValue = this.selectedIndex = null;
					DOM.setAttrib(this.id, 'aria-valuenow', this.settings.title);
				}

				elm = 0;
			}
		},

		/**
		 * Marks a specific item by name. Marked values are optional items to mark as active.
		 *
		 * @param {String} value Value item to mark.
		 */
		mark: function (value) {
			this.marked[value] = true;
		},

		/**
		 * Adds a option item to the list box.
		 *
		 * @method add
		 * @param {String} name Title for the new option.
		 * @param {String} value Value for the new option.
		 * @param {Object} settings Optional object with settings like for example class.
		 */
		add: function (name, value, settings) {
			settings = settings || {};

			settings = tinymce.extend(settings, {
				title: name,
				value: value
			});

			this.items.push(settings);
			this.onAdd.dispatch(this, settings);
		},

		/**
		 * Returns the number of items inside the list box.
		 *
		 * @method getLength
		 * @param {Number} Number of items inside the list box.
		 */
		getLength: function () {
			return this.items.length;
		},

		/**
		 * Renders the list box as a HTML string. This method is much faster than using the DOM and when
		 * creating a whole toolbar with buttons it does make a lot of difference.
		 *
		 * @method renderHTML
		 * @return {String} HTML for the list box control element.
		 */
		renderHTML: function () {
			var html = '',
				prefix = this.classPrefix;

			if (this.settings.combobox) {
				html += DOM.createHTML('input', {
					type: 'text',
					id: this.id + '_input',
					tabindex: -1,
					autocomplete: 'off',
					spellcheck: false,
					autocapitalize: 'off',
					class: 'mceText'
				});
			} else {
				html += DOM.createHTML('button', {
					type: 'button',
					id: this.id + '_text',
					tabindex: -1,
					class: 'mceText'
				}, DOM.encode(this.settings.title));
			}

			html += DOM.createHTML('button', {
				type: 'button',
				id: this.id + '_open',
				tabindex: -1,
				class: 'mceOpen'
			});

			return DOM.createHTML('div', {
				id: this.id,
				role: 'listbox',
				tabindex: 0,
				'class': prefix + ' ' + this.settings['class'],
				title: this.settings.title,
				'aria-label': this.settings.title,
				'aria-haspopup': 'true',
				'aria-expanded': false
			}, html);
		},

		/**
		 * Displays the drop menu with all items.
		 *
		 * @method showMenu
		 */
		showMenu: function () {
			var self = this,
				pos, elm = DOM.get(this.id),
				menu;

			if (this.isDisabled()) {
				return;
			}

			/*if (this.menu && this.menu.isMenuVisible) {
				return this.hideMenu();
			}*/

			if (!this.isMenuRendered) {
				this.renderMenu();
				this.isMenuRendered = true;
			}

			if (this.items.length === 0) {
				return;
			}

			pos = DOM.getPos(elm);

			menu = this.menu;
			menu.settings.offset_x = pos.x;
			menu.settings.offset_y = pos.y;

			if (!this.settings.max_width) {
				menu.settings.max_width = elm.offsetWidth;
			}

			// Select in menu
			each(this.items, function (item) {
				if (menu.items[item.id]) {
					menu.items[item.id].setSelected(0);
				}
			});

			each(this.items, function (item) {
				if (menu.items[item.id] && self.marked[item.value]) {
					menu.items[item.id].setSelected(1);
				}

				if (item.value === self.selectedValue) {
					menu.items[item.id].setSelected(1);
				}
			});

			menu.showMenu(0, elm.clientHeight, 0, pos.y);

			Event.add(DOM.doc, 'mousedown', this.hideMenu, this);

			DOM.addClass(this.id, this.classPrefix + 'Selected');

			this.setAriaProperty('expanded', true);
		},

		/**
		 * Hides the drop menu.
		 *
		 * @method hideMenu
		 */
		hideMenu: function (e) {
			if (!this.menu) {
				return;
			}

			// Prevent double toogles by canceling the mouse click event to the button
			if (e && e.type == "mousedown" && (e.target.id == this.id + '_text' || e.target.id == this.id + '_open')) {
				return;
			}

			if (!e || !DOM.getParent(e.target, '.mceMenu')) {
				DOM.removeClass(this.id, this.classPrefix + 'Selected');
				Event.remove(DOM.doc, 'mousedown', this.hideMenu, this);
				this.menu.hideMenu();
			}

			this.setAriaProperty('expanded', false);
		},

		/**
		 * Renders the menu to the DOM.
		 *
		 * @method renderMenu
		 */
		renderMenu: function () {
			var self = this,
				menu;

			menu = this.settings.control_manager.createDropMenu(this.id + '_menu', {
				class: this.classPrefix + 'Menu',
				max_width: this.settings.max_width || 250,
				max_height: this.settings.max_height || '',
				filter: !!this.settings.filter,
				keyboard_focus: true,
				constrain: true,
				onselect: function (value) {
					if (self.settings.onselect(value) !== false) {
						self.select(value);
					}

					if (self.settings.combobox) {
						DOM.setValue(self.id + '_input', '');
					}
				}
			});

			menu.onHideMenu.add(function () {
				self.hideMenu();
				self.focus();
			});

			// fire onBeforeRenderMenu, which allows list items to be added before display
			this.onBeforeRenderMenu.dispatch(this, menu);

			each(this.items, function (item) {
				// No value then treat it as a title
				if (item.value === undef) {
					menu.add({
						title: item.title,
						role: "option",
						onclick: function () {
							if (self.settings.onselect('') !== false) {
								self.select('');
							} // Must be run after
						}
					});
				} else {
					item.id = DOM.uniqueId();
					item.role = "option";
					item.onclick = function () {
						if (self.settings.onselect(item.value) !== false) {
							self.select(item.value);
						} // Must be run after
					};

					menu.add(item);
				}
			});

			this.onRenderMenu.dispatch(this, menu);
			this.menu = menu;
		},

		/**
		 * Post render event. This will be executed after the control has been rendered and can be used to
		 * set states, add events to the control etc. It's recommended for subclasses of the control to call this method by using this.parent().
		 *
		 * @method postRender
		 */
		postRender: function () {
			var self = this;

			Event.add(this.id, 'click', function (evt) {
				if (evt.target.nodeName === "INPUT") {
					return;
				}

				self.showMenu(evt);
				Event.cancel(evt);
			});

			Event.add(this.id, 'keydown', function (evt) {
				if (evt.target.nodeName === "INPUT") {
					return;
				}

				if (evt.keyCode == 32) { // Space
					self.showMenu(evt);
					Event.cancel(evt);
				}
			});

			Event.add(this.id + '_input', 'keyup', function (evt) {

				if (!self.menu || !self.menu.isMenuVisible) {
					self.showMenu();
				}

				setTimeout(function () {
					var value = evt.target.value;

					evt.target.focus();

					if (!value) {
						Event.cancel(evt);
						self.hideMenu();
						return;
					}

					if (!specialKeyCodeMap[evt.keyCode]) {
						self.menu.filter(evt.target.value);
					}
				}, 0);
			});

			Event.add(this.id + '_input', 'keydown', function (evt) {
				switch (evt.keyCode) {
                    // enter
                    case 13:
                        Event.cancel(evt);

                        if (this.value === "") {
                            self.showMenu();
                        } else {
							self.settings.onselect(this.value);
							self.hideMenu();
							
							this.value = "";
                        }
                        break;
                    // down arrow
                    case 40:
					case 38:
						self.showMenu();
                        Event.cancel(evt);
                        break;
                    // backspace
                    case 8:
                        // keep normal behaviour while input has a value
                        if (this.value) {
                            return;
						}
						
						Event.cancel(evt);

                        /*var $tags = $('.uk-datalist-tag', container);

                        if ($tags.length) {
                            var val = $tags.last().val();

                            // remove tag
                            removeTag($tags.last());

                            e.preventDefault();

                            // update value with tag value and focus
                            $(this).val(val).focus();
                        }*/
                        break;
                }
			});

			Event.add(this.id, 'focus', function () {
				if (!this._focused) {

					this.keyDownHandler = Event.add(this.id, 'keydown', function (e) {
						if (e.keyCode == 40) {
							self.showMenu();
							Event.cancel(e);
						}
					});

					this.keyPressHandler = Event.add(this.id, 'keypress', function (e) {
						var value;
						if (e.keyCode == 13) {
							// Fake select on enter
							value = self.selectedValue;
							self.selectedValue = null; // Needs to be null to fake change
							Event.cancel(e);
							self.settings.onselect(value);
						}
					});
				}

				this._focused = 1;
			});

			Event.add(this.id, 'blur', function () {
				Event.remove(this.id, 'keydown', this.keyDownHandler);
				Event.remove(this.id, 'keypress', this.keyPressHandler);
				this._focused = 0;
			});

			this.onPostRender.dispatch(this, DOM.get(this.id));
		},

		/**
		 * Destroys the ListBox i.e. clear memory and events.
		 *
		 * @method destroy
		 */
		destroy: function () {
			this.parent();

			Event.clear(this.id + '_text');
			Event.clear(this.id + '_open');

			this.selectedValue = null;
			this.selectedIndex = null;
		}
	});
})(tinymce);