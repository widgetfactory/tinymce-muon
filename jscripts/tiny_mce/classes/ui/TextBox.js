/**
 * TextBox.js
 */

(function (tinymce) {
	var DOM = tinymce.DOM,
		Event = tinymce.dom.Event,
		each = tinymce.each,
		Dispatcher = tinymce.util.Dispatcher,
		undef;

	/**
	 * This class is used to create text / input boxes.
	 *
	 * @class tinymce.ui.TextBox
	 * @extends tinymce.ui.Control
	 * @example
	 */
	tinymce.create('tinymce.ui.TextBox:tinymce.ui.Control', {
		/**
		 * Constructs a new textbox control instance.
		 *
		 * @constructor
		 * @method TextBox
		 * @param {String} id Control id for the list box.
		 * @param {Object} s Optional name/value settings object.
		 * @param {Editor} ed Optional the editor instance this button is for.
		 */
		TextBox: function (id, s, ed) {

			this.parent(id, s, ed);

			// store value
			this._value = '';

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

			this.classPrefix = 'mceTextBox';
		},

		/**
		 * Sets / gets the input value.
		 *
		 * @method select
		 * @param {String/function} value Value to set for the textbox.
		 */
		value: function (value) {
			var self = this;

			if (value == undef) {
				return DOM.get(self.id).value;
			}

			this._value = value;

			DOM.get(self.id).value = value;
		},

		/**
		 * Renders the text box as a HTML string. This method is much faster than using the DOM and when
		 * creating a whole toolbar with buttons it does make a lot of difference.
		 *
		 * @method renderHTML
		 * @return {String} HTML for the text control element.
		 */
		renderHTML: function () {
			var html = '',
				prefix = this.classPrefix, s = this.settings;

			var type = s.subtype ? s.subtype : 'text';

			if (s.label) {
				html += '<label for="' + this.id + '">' + s.label + '</label>';
			}

			html += '<div class="mceFormControl">';

			if (s.multiline) {
				html += '<textarea id="' + this.id + '" class="' + prefix + ' ' + s['class'] + '" title="' + DOM.encode(s.title) + '">' + DOM.encode(this._value);
			} else {
				html += '<input type="' + type + '" id="' + this.id + '" value="' + this._value + '" class="' + prefix + ' ' + s['class'] + '" title="' + DOM.encode(s.title) + '"';
			}

			if (s.attributes) {
				each(s.attributes, function(val, key) {
					html += ' ' + key + '="' + val + '"';
				});
			}

			if (s.multiline) {
				html += '</textarea>';
			} else {
				html += ' />';
			}

			html += '</div>';

			return html;
		},

		value: function(val) {
			if (!arguments.length) {
				return DOM.getValue(this.id);
			}

			DOM.setValue(this.id, val);
		},

		/**
		 * Post render event. This will be executed after the control has been rendered and can be used to
		 * set states, add events to the control etc. It's recommended for subclasses of the control to call this method by using this.parent().
		 *
		 * @method postRender
		 */
		postRender: function () {
			var self = this, s = this.settings;

			Event.add(this.id, 'change', function(e) {
				self.onChange.dispatch(this, DOM.get(self.id));
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

			Event.clear(this.id);
		}
	});
})(tinymce);