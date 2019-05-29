/**
 * MenuButton.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

(function (tinymce) {
	var DOM = tinymce.DOM,
		Event = tinymce.dom.Event;

	/**
	 * This class is used to create a UI button. A button is basically a link
	 * that is styled to look like a button or icon.
	 *
	 * @class tinymce.ui.MenuButton
	 * @extends tinymce.ui.Control
	 * @example
	 * // Creates a new plugin class and a custom menu button
	 * tinymce.create('tinymce.plugins.ExamplePlugin', {
	 *     createControl: function(n, cm) {
	 *         switch (n) {
	 *             case 'mymenubutton':
	 *                 var c = cm.createSplitButton('mysplitbutton', {
	 *                     title : 'My menu button',
	 *                     image : 'some.gif'
	 *                 });
	 *
	 *                 c.onRenderMenu.add(function(c, m) {
	 *                     m.add({title : 'Some title', 'class' : 'mceMenuItemTitle'}).setDisabled(1);
	 *
	 *                     m.add({title : 'Some item 1', onclick : function() {
	 *                         alert('Some item 1 was clicked.');
	 *                     }});
	 *
	 *                     m.add({title : 'Some item 2', onclick : function() {
	 *                         alert('Some item 2 was clicked.');
	 *                     }});
	 *               });
	 *
	 *               // Return the new menubutton instance
	 *               return c;
	 *         }
	 *
	 *         return null;
	 *     }
	 * });
	 */
	tinymce.create('tinymce.ui.MenuButton:tinymce.ui.Button', {
		/**
		 * Constructs a new split button control instance.
		 *
		 * @constructor
		 * @method MenuButton
		 * @param {String} id Control id for the split button.
		 * @param {Object} s Optional name/value settings object.
		 * @param {Editor} ed Optional the editor instance this button is for.
		 */
		MenuButton: function (id, s, ed) {
			this.parent(id, s, ed);

			/**
			 * Fires when the menu is rendered.
			 *
			 * @event onRenderMenu
			 */
			this.onRenderMenu = new tinymce.util.Dispatcher(this);

			s.menu_container = s.menu_container || DOM.doc.body;
		},

		/**
		 * Shows the menu.
		 *
		 * @method showMenu
		 */
		showMenu: function () {
			var self = this,
				pos, e = DOM.get(self.id),
				m;

			if (self.isDisabled()) {
				return;
			}

			if (!self.isMenuRendered) {
				self.renderMenu();
				self.isMenuRendered = true;
			}

			if (self.isMenuVisible) {
				return self.hideMenu();
			}

			pos = DOM.getPos(e);

			m = self.menu;
			m.settings.offset_x = pos.x;
			m.settings.offset_y = pos.y;
			m.settings.vp_offset_x = pos.x;
			m.settings.vp_offset_y = pos.y;
			m.settings.keyboard_focus = self._focused;
			m.showMenu(0, e.firstChild.clientHeight);

			Event.add(DOM.doc, 'mousedown', self.hideMenu, self);
			self.setState('Selected', 1);

			self.isMenuVisible = 1;
		},

		/**
		 * Renders the menu to the DOM.
		 *
		 * @method renderMenu
		 */
		renderMenu: function () {
			var self = this,
				m;

			m = self.settings.control_manager.createDropMenu(self.id + '_menu', {
				menu_line: 1,
				'class': this.classPrefix + 'Menu',
				icons: self.settings.icons
			});

			m.onHideMenu.add(function () {
				self.hideMenu();
				self.focus();
			});

			self.onRenderMenu.dispatch(self, m);
			self.menu = m;
		},

		/**
		 * Hides the menu. The optional event parameter is used to check where the event occurred so it
		 * doesn'self close them menu if it was a event inside the menu.
		 *
		 * @method hideMenu
		 * @param {Event} e Optional event object.
		 */
		hideMenu: function (e) {
			var self = this;

			// Prevent double toogles by canceling the mouse click event to the button
			if (e && e.type == "mousedown" && DOM.getParent(e.target, function (e) {
					return e.id === self.id || e.id === self.id + '_open';
				})) {
				return;
			}

			if (!e || !DOM.getParent(e.target, '.mceMenu')) {
				self.setState('Selected', 0);
				Event.remove(DOM.doc, 'mousedown', self.hideMenu, self);
				if (self.menu) {
					self.menu.hideMenu();
				}
			}

			self.isMenuVisible = 0;
		},

		/**
		 * Post render handler. This function will be called after the UI has been
		 * rendered so that events can be added.
		 *
		 * @method postRender
		 */
		postRender: function () {
			var self = this,
				s = self.settings;

			Event.add(self.id, 'click', function () {
				if (!self.isDisabled()) {
					if (s.onclick) {
						s.onclick(self.value);
					}

					self.showMenu();
				}
			});
		}
	});
})(tinymce);