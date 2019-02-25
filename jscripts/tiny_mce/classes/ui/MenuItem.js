/**
 * MenuItem.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

(function (tinymce) {
	/**
	 * This class is base class for all menu item types like DropMenus items etc. This class should not
	 * be instantiated directly other menu items should inherit from this one.
	 *
	 * @class tinymce.ui.MenuItem
	 * @extends tinymce.ui.Control
	 */
	tinymce.create('tinymce.ui.MenuItem:tinymce.ui.Control', {
		/**
		 * Constructs a new button control instance.
		 *
		 * @constructor
		 * @method MenuItem
		 * @param {String} id Button control id for the button.
		 * @param {Object} s Optional name/value settings object.
		 */
		MenuItem: function (id, settings) {
			this.parent(id, settings);
			this.classPrefix = 'mceMenuItem';
		},

		/**
		 * Sets the selected state for the control. This will add CSS classes to the
		 * element that contains the control. So that it can be selected visually.
		 *
		 * @method setSelected
		 * @param {Boolean} state Boolean state if the control should be selected or not.
		 */
		setSelected: function (state) {
			this.setState('Selected', state);
			this.setAriaProperty('checked', !!state);
			this.selected = state;
		},

		/**
		 * Returns true/false if the control is selected or not.
		 *
		 * @method isSelected
		 * @return {Boolean} true/false if the control is selected or not.
		 */
		isSelected: function () {
			return this.selected;
		},

		/**
		 * Post render handler. This function will be called after the UI has been
		 * rendered so that events can be added.
		 *
		 * @method postRender
		 */
		postRender: function () {
			this.parent();

			// Set pending state
			if (tinymce.is(this.selected)) {
				this.setSelected(this.selected);
			}
		}
	});
})(tinymce);