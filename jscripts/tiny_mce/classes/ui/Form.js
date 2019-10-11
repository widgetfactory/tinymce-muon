/**
 * Form.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */
(function (tinymce) {
	// Shorten class names
	var dom = tinymce.DOM, each = tinymce.each;
	/**
	 * This class is used to create layouts. A layout is a container for other controls like buttons etc.
	 *
	 * @class tinymce.ui.Form
	 * @extends tinymce.ui.Container
	 */
	tinymce.create('tinymce.ui.Form:tinymce.ui.Container', {

		/**
			 * Renders the toolbar as a HTML string. This method is much faster than using the DOM and when
			 * creating a whole toolbar with buttons it does make a lot of difference.
			 *
			 * @method renderHTML
			 * @return {String} HTML for the toolbar control.
			 */
		renderHTML: function () {
			var html = '',
				settings = this.settings,
				i;

			var controls = settings.controls || this.controls;

			for (i = 0; i < controls.length; i++) {
				var ctrl = controls[i], s = ctrl.settings;

				html += '<div class="mceFormRow">';

				if (s.label) {
					html += '<label for="' + ctrl.id + '">' + s.label + '</label>';
				}

				html += '	<div class="mceFormControl">';
				html += controls[i].renderHTML();
				html += '	</div>';
				html += '</div>';

			}

			this.controls = controls;

			return dom.createHTML('div', {
				id: this.id,
				'class': 'mceForm ' + (settings['class'] ? ' ' + settings['class'] : ''),
				role: 'group'
			}, html);
		},

		submit: function () {
			var settings = this.settings,
				i, data = {};

			var controls = settings.controls || this.controls;

			for (i = 0; i < controls.length; i++) {
				var ctrl = controls[i];

				if (typeof ctrl.value === 'function') {
					data[ctrl.name] = ctrl.value();
				}
			}

			return data;
		},

		postRender: function () {
			var settings = this.settings,
				i;

			this.parent();

			var controls = settings.controls || this.controls;

			for (i = 0; i < controls.length; i++) {
				controls[i].postRender();
			}
		},

		destroy: function () {
			var settings = this.settings,
				i;

			this.parent();

			var controls = settings.controls || this.controls;

			for (i = 0; i < controls.length; i++) {
				controls[i].destroy();
			}
		}
	});
})(tinymce);