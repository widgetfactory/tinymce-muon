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

      s["class"] = 'mceUrlBox';

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
        html += '<button class="mceButton mceButtonPicker" id="' + this.id + '_picker" title="' + DOM.encode(s.picker_label || '') + '"><span role="presentation" class="mceIcon mce_' + icon + '"></span></button>';
      }

      if (s.upload) {
        var accept = tinymce.map(s.upload_accept || [], function (val) {
          if (val.indexOf('/') == -1 && val.charAt(0) != '.') {
            val = '.' + val;
          }

          return val;
        });

        html += '<a class="mceButton mceButtonUpload" role="button" aria-label="' + DOM.encode(s.upload_label || '') + '"><span role="presentation" class="mceIcon mce_upload"></span><span role="presentation" class="mceIcon mce_spinner"></span><input id="' + this.id + '_upload" type="file" aria-hidden="true" title="' + DOM.encode(s.upload_label || '') + '" accept="' + accept.join(',') + '" /></a>';
      }

      return html;
    },

    /**
		 * Sets the loading state for the control. This will add an aria-busy property to the
		 * element that contains the control and set the disable state.
		 *
		 * @method setLoading
		 * @param {Boolean} state Boolean state if the control should be set loading or not.
		 */
		 setLoading: function (state) {
      this.setAriaProperty('busy', state);
      this.setDisabled(state);
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
      DOM.get(this.id + '_upload').disabled = state;
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

      if (s.upload) {
        DOM.addClass(this.id, 'mceUrlBoxUpload');

        Event.add(this.id + '_upload', 'change', function (e) {
          if (this.files && this.files.length) {
            s.upload.call(self, e, this.files[0]);
          }

          Event.cancel(e);
        });

        DOM.bind(this.id, 'drag dragstart dragend dragover dragenter dragleave', function (e) {
          Event.cancel(e);
        });

        DOM.bind(this.id, 'dragover dragenter', function (e) {
          DOM.addClass(this.id, 'mceUrlBoxUploadHover');
        });

        DOM.bind(this.id, 'dragleave', function (e) {
          DOM.removeClass(this.id, 'mceUrlBoxUploadHover');
        });

        DOM.bind(this.id, 'drop', function (e) {
          var dataTransfer = e.dataTransfer;

          // Add dropped files
          if (dataTransfer && dataTransfer.files && dataTransfer.files.length) {
            var file = dataTransfer.files[0];

            if (file) {
              s.upload.call(self, e, file);
            }
          }

          Event.cancel(e);
        });
      }
    }
  });
})(tinymce);