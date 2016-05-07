/**
 * Toolbar.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

(function(tinymce) {
// Shorten class names
var dom = tinymce.DOM, each = tinymce.each;
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
	renderHTML : function() {
		var t = this, h = '', c, co, s = t.settings, i, pr, nx, cl;

		cl = t.controls;
		for (i=0; i<cl.length; i++) {
			// Get current control, prev control, next control and if the control is a list box or not
			co = cl[i];
			pr = cl[i - 1];
			nx = cl[i + 1];

			// Add toolbar start
			if (i === 0) {
				c = ' mceToolbarStart';

				if (co.Button) {
					c += ' mceToolbarStartButton';
				} else if (co.SplitButton) {
					c += ' mceToolbarStartSplitButton';
				} else if (co.ListBox) {
					c += ' mceToolbarStartListBox';
				}

				//h += dom.createHTML('div', {'class' : c}, '');
			}
			
			if (i === cl.length - 1) {
				c = ' mceToolbarEnd';

				if (co.Button) {
					c += ' mceToolbarEndButton';
				} else if (co.SplitButton) {
					c += ' mceToolbarEndSplitButton';
				} else if (co.ListBox) {
					c += ' mceToolbarEndListBox';
				}
			}

			// Add toolbar end before list box and after the previous button
			// This is to fix the o2k7 editor skins
			if (pr && co.ListBox) {
				if (pr.Button || pr.SplitButton) {
					h += dom.createHTML('div', {'class': 'mceToolbarEnd'}, '');
				}
			}

			// Render control HTML
			h += '<div class="mceToolBarItem' + c + '">' + co.renderHTML() + '</div>';
			
			c = '';

			// Add toolbar start after list box and before the next button
			// This is to fix the o2k7 editor skins
			if (nx && co.ListBox) {
				if (nx.Button || nx.SplitButton) {
					h += dom.createHTML('div', {'class': 'mceToolbarStart'}, '');
				}
			}
		}

		//h += dom.createHTML('div', {'class' : c}, '');

		return dom.createHTML('div', {id : t.id, 'class' : 'mceToolbarRow' + (s['class'] ? ' ' + s['class'] : ''), role: 'toolbar', tabindex: '-1'}, h);
	}
});
})(tinymce);