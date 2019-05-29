/**
 * Toolbar.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

(function (tinymce) {
	// Shorten class names
	var dom = tinymce.DOM;
	/**
	 * This class is used to create toolbars a toolbar is a container for other controls like buttons etc.
	 *
	 * @class tinymce.ui.Toolbar
	 * @extends tinymce.ui.Container
	 */
	tinymce.create('tinymce.ui.Toolbar:tinymce.ui.Container', {
		/**
		 * Renders the toolbar as a HTML string. This method is much faster than using the DOM and when
		 * creating a whole toolbar with buttons it does make a lot of difference.
		 *
		 * @method renderHTML
		 * @return {String} HTML for the toolbar control.
		 */
		renderHTML: function () {
			var html = '',
				cls = '',
				settings = this.settings,
				i, ctrl, prev, next;

			var controls = this.controls;

			for (i = 0; i < controls.length; i++) {
				// Get current control, prev control, next control and if the control is a list box or not
				ctrl = controls[i];
				prev = controls[i - 1];
				next = controls[i + 1];

				cls = 'mceToolbarItem';

				if (ctrl.Button) {
					cls += ' mceToolbarItemButton';
				} else if (ctrl.SplitButton) {
					cls += ' mceToolbarItemSplitButton';
				} else if (ctrl.ListBox) {
					cls += ' mceToolbarItemListBox';
				} else if (ctrl.TextBox) {
					cls += ' mceToolbarItemTextBox';
				}

				// Add toolbar start after list box and before the next button
				// This is to fix the o2k7 editor skins
				if (next && next.ListBox && (ctrl.Button || ctrl.SplitButton)) {
					cls += ' mceToolbarItemEnd';
				}

				// Add toolbar end before list box and after the previous button
				// This is to fix the o2k7 editor skins
				if (prev && prev.ListBox && (ctrl.Button || ctrl.SplitButton)) {
					cls += ' mceToolbarItemStart';
				}

				// Render control HTML
				html += '<div class="' + cls + '">' + ctrl.renderHTML() + '</div>';

				cls = '';
			}

			return dom.createHTML('div', {
				id: this.id,
				'class': 'mceToolbarRow' + (settings['class'] ? ' ' + settings['class'] : ''),
				role: 'toolbar',
				tabindex: '-1'
			}, html);
		}
	});
})(tinymce);