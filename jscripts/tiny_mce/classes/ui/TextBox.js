/**
 * TextBox.js
 */

(function (tinymce) {
  var DOM = tinymce.DOM,
    Event = tinymce.dom.Event,
    each = tinymce.each,
    Dispatcher = tinymce.util.Dispatcher;

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
		 * @param {String/function} val Value to set for the textbox.
		 */
    value: function (val) {
      if (!arguments.length) {
        return DOM.getValue(this.id);
      }

      DOM.setValue(this.id, val);
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

      if (s.multiline) {
        html += '<textarea id="' + this.id + '" class="' + prefix + ' ' + s['class'] + '" title="' + DOM.encode(s.title) + '" tabindex="0" autofocus>' + DOM.encode(this._value);
      } else {
        html += '<input type="' + type + '" id="' + this.id + '" value="' + this._value + '" class="' + prefix + ' ' + s['class'] + '" title="' + DOM.encode(s.title) + '" tabindex="0" autofocus';
      }

      if (s.attributes) {
        each(s.attributes, function (val, key) {
          html += ' ' + key + '="' + val + '"';
        });
      }

      if (s.multiline) {
        html += '</textarea>';
      } else {
        html += ' />';
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

      if (typeof s.value !== 'undefined') {
        this.value(s.value);
      }

      if (s.onchange && typeof s.onchange === 'function') {
        this.onChange.add(s.onchange);
      }

      Event.add(this.id, 'change', function () {
        self.onChange.dispatch(this, DOM.get(self.id));
      });

      this.onPostRender.dispatch(this, DOM.get(this.id));
    },

    /**
		 * Sets the disabled state for the control. This will add CSS classes to the
		 * element that contains the control. So that it can be disabled visually.
		 *
		 * @method setDisabled
		 * @param {Boolean} state Boolean state if the control should be disabled or not.
		 */
    setDisabled: function (state) {
      this.parent(state);
      DOM.get(this.id).disabled = state;
    },

    /**
		 * Destroys the TextBox i.e. clear memory and events.
		 *
		 * @method destroy
		 */
    destroy: function () {
      this.parent();

      Event.clear(this.id);
    }
  });
})(tinymce);