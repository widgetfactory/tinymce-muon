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
			
			c = ' mceToolBarItem';
			
			if (co.Button) {
				c += 'Button';
			} else if (co.SplitButton) {
				c += 'SplitButton';
			} else if (co.ListBox) {
				c += 'ListBox';
			}

			
			// Add toolbar start after list box and before the next button
			// This is to fix the o2k7 editor skins
			if (nx && nx.ListBox && (co.Button || co.SplitButton)) {
				c += ' mceToolBarItemEnd';
			}
			
			// Add toolbar end before list box and after the previous button
			// This is to fix the o2k7 editor skins
			if (pr && pr.ListBox && (co.Button || co.SplitButton)) {
				c += ' mceToolBarItemStart';
			}

			// Render control HTML
			h += '<div class="mceToolBarItem' + c + '">' + co.renderHTML() + '</div>';
			
			c = '';
		}

		return dom.createHTML('div', {id : t.id, 'class' : 'mceToolbarRow' + (s['class'] ? ' ' + s['class'] : ''), role: 'toolbar', tabindex: '-1'}, h);
	}
});
})(tinymce);