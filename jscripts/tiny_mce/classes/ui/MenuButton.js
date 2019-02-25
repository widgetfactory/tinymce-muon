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
		MenuButton: function (id, settings, editor) {
			this.parent(id, settings, editor);

			/**
			 * Fires when the menu is rendered.
			 *
			 * @event onRenderMenu
			 */
			this.onRenderMenu = new tinymce.util.Dispatcher(this);

			settings.menu_container = settings.menu_container || DOM.doc.body;
		},

		/**
		 * Shows the menu.
		 *
		 * @method showMenu
		 */
		showMenu: function () {
			var pos, elm = DOM.get(this.id),
				menu;

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

			pos = DOM.getPos(elm);

			menu = this.menu;
			menu.settings.offset_x = pos.x;
			menu.settings.offset_y = pos.y;
			menu.settings.vp_offset_x = pos.x;
			menu.settings.vp_offset_y = pos.y;
			menu.settings.keyboard_focus = this._focused;
			menu.showMenu(0, elm.firstChild.clientHeight);

			Event.add(DOM.doc, 'mousedown', this.hideMenu, this);
			this.setState('Selected', 1);

			this.isMenuVisible = 1;
		},

		/**
		 * Renders the menu to the DOM.
		 *
		 * @method renderMenu
		 */
		renderMenu: function () {
			var menu;

			menu = this.settings.control_manager.createDropMenu(this.id + '_menu', {
				menu_line: 1,
				'class': this.classPrefix + 'Menu',
				icons: this.settings.icons
			});

			menu.onHideMenu.add(function () {
				this.hideMenu();
				this.focus();
			});

			this.onRenderMenu.dispatch(this, menu);
			this.menu = menu;
		},

		/**
		 * Hides the menu. The optional event parameter is used to check where the event occurred so it
		 * doesn't close them menu if it was a event inside the menu.
		 *
		 * @method hideMenu
		 * @param {Event} e Optional event object.
		 */
		hideMenu: function (e) {
			var self = this;

			// Prevent double toogles by canceling the mouse click event to the button
			var parent = DOM.getParent(e.target, function (e) {
				return e.id === self.id || e.id === self.id + '_open';
			});

			if (e && e.type == "mousedown" && parent) {
				return;
			}

			if (!e || !DOM.getParent(e.target, '.mceMenu')) {
				this.setState('Selected', 0);

				Event.remove(DOM.doc, 'mousedown', this.hideMenu, this);

				if (this.menu) {
					this.menu.hideMenu();
				}
			}

			this.isMenuVisible = 0;
		},

		/**
		 * Post render handler. This function will be called after the UI has been
		 * rendered so that events can be added.
		 *
		 * @method postRender
		 */
		postRender: function () {
			var self = this,
				settings = this.settings;

			Event.add(this.id, 'click', function () {
				if (!this.isDisabled()) {
					if (settings.onclick) {
						settings.onclick(self.value);
					}

					self.showMenu();
				}
			});
		}
	});
})(tinymce);