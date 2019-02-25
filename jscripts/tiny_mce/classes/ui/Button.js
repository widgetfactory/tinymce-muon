/**
 * Button.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

(function (tinymce) {
	var DOM = tinymce.DOM;

	/**
	 * This class is used to create a UI button. A button is basically a link
	 * that is styled to look like a button or icon.
	 *
	 * @class tinymce.ui.Button
	 * @extends tinymce.ui.Control
	 */
	tinymce.create('tinymce.ui.Button:tinymce.ui.Control', {
		/**
		 * Constructs a new button control instance.
		 *
		 * @constructor
		 * @method Button
		 * @param {String} id Control id for the button.
		 * @param {Object} settings Optional name/value settings object.
		 * @param {Editor} editor Optional the editor instance this button is for.
		 */
		Button: function (id, settings, editor) {
			this.parent(id, settings, editor);
			this.classPrefix = 'mceButton';
		},

		/**
		 * Renders the button as a HTML string. This method is much faster than using the DOM and when
		 * creating a whole toolbar with buttons it does make a lot of difference.
		 *
		 * @method renderHTML
		 * @return {String} HTML for the button control element.
		 */
		renderHTML: function () {
			var prefix = this.classPrefix,
				settings = this.settings,
				html, label;

			label = DOM.encode(settings.label || '');

			html = '<button type="button" role="presentation" id="' + this.id + '" class="' + prefix + ' ' + prefix + 'Enabled ' + settings['class'] + (label ? ' ' + prefix + 'Labeled' : '') + '" onmousedown="return false;" onclick="return false;" title="' + DOM.encode(settings.title) + '">';

			if (settings.image && !(this.editor && this.editor.forcedHighContrastMode)) {
                html += '<span class="mceIcon ' + settings['class'] + '"><img class="mceIcon" src="' + settings.image + '" alt="' + DOM.encode(settings.title) + '" /></span>';
                html += (label ? '<span class="' + prefix + 'Label">' + label + '</span>' : '');
			} else {
				html += '<span class="mceIcon ' + settings['class'] + '"></span>' + (label ? '<span class="' + prefix + 'Label">' + label + '</span>' : '');
			}

			html += '</button>';

			return html;
		},

		/**
		 * Post render handler. This function will be called after the UI has been
		 * rendered so that events can be added.
		 *
		 * @method postRender
		 */
		postRender: function () {
			var self = this,
				settings = this.settings,
				imgBookmark;

			// In IE a large image that occupies the entire editor area will be deselected when a button is clicked, so
			// need to keep the selection in case the selection is lost
			if (tinymce.isIE && this.editor) {
				tinymce.dom.Event.add(this.id, 'mousedown', function () {
					var nodeName = self.editor.selection.getNode().nodeName;
					imgBookmark = nodeName === 'IMG' ? self.editor.selection.getBookmark() : null;
				});
			}

			tinymce.dom.Event.add(this.id, 'click', function (e) {
				if (!self.isDisabled()) {
					// restore the selection in case the selection is lost in IE
					if (tinymce.isIE && self.editor && imgBookmark !== null) {
						self.editor.selection.moveToBookmark(imgBookmark);
					}
					return settings.onclick.call(settings.scope, e);
				}
			});

			tinymce.dom.Event.add(this.id, 'keydown', function (e) {
				if (!self.isDisabled() && e.keyCode == tinymce.VK.SPACEBAR) {
					tinymce.dom.Event.cancel(e);
					return settings.onclick.call(settings.scope, e);
				}
			});
		}
	});
})(tinymce);