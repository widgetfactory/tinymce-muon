/**
 * UrlBox.js
 */

(function (tinymce) {
	var DOM = tinymce.DOM, Event = tinymce.dom.Event;

	/**
	 * This class is used to create text / input boxes.
	 *
	 * @class tinymce.ui.TextBox
	 * @extends tinymce.ui.Control
	 * @example
	 */
	tinymce.create('tinymce.ui.UrlBox:tinymce.ui.TextBox', {
		/**
		 * Constructs a new textbox control instance.
		 *
		 * @constructor
		 * @method TextBox
		 * @param {String} id Control id for the list box.
		 * @param {Object} s Optional name/value settings object.
		 * @param {Editor} ed Optional the editor instance this button is for.
		 */
		UrlBox: function (id, s, ed) {
			s.multiline = false;

			s.onpick = s.onpick || function () { };

			s.class = 'mceUrlBox';

			this.parent(id, s, ed);
		},

		/**
		 * Renders the text box as a HTML string. This method is much faster than using the DOM and when
		 * creating a whole toolbar with buttons it does make a lot of difference.
		 *
		 * @method renderHTML
		 * @return {String} HTML for the text control element.
		 */
		renderHTML: function () {
			var html = this.parent(),
				s = this.settings;

			if (s.picker) {
				var icon = s.picker_icon || 'file';
				html += '<button class="mceButton mceButtonPicker" id="' + this.id + '_picker"><span role="presentation" class="mceIcon mce_' + icon + '"></span></button>';
			}

			return html;
		},

		/**
		 * Post render event. This will be executed after the control has been rendered and can be used to
		 * set states, add events to the control etc. It's recommended for subclasses of the control to call this method by using this.parent().
		 *
		 * @method postRender
		 */
		postRender: function () {
			var self = this, s = this.settings;

			this.parent();

			if (s.picker) {
				DOM.addClass(this.id, 'mceUrlBoxPicker');
				
				Event.add(this.id + '_picker', 'click', function (e) {
					Event.cancel(e);
					s.onpick.call(self);
				});
			}
		}
	});
})(tinymce);