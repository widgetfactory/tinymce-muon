/**
 * SplitButton.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

(function (tinymce) {
	var DOM = tinymce.DOM,
		Event = tinymce.dom.Event;

	/**
	 * This class is used to create a split button. A button with a menu attached to it.
	 *
	 * @class tinymce.ui.SplitButton
	 * @extends tinymce.ui.Button
	 * @example
	 * // Creates a new plugin class and a custom split button
	 * tinymce.create('tinymce.plugins.ExamplePlugin', {
	 *     createControl: function(n, cm) {
	 *         switch (n) {
	 *             case 'mysplitbutton':
	 *                 var c = cm.createSplitButton('mysplitbutton', {
	 *                     title : 'My split button',
	 *                     image : 'some.gif',
	 *                     onclick : function() {
	 *                         alert('Button was clicked.');
	 *                     }
	 *                 });
	 *
	 *                 c.onRenderMenu.add(function(c, m) {
	 *                     m.add({title : 'Some title', 'class' : 'mceMenuItemTitle'}).setDisabled(1);
	 *
	 *                     m.add({title : 'Some item 1', onclick : function() {
	 *                         alert('Some item 1 was clicked.');
	 *                     }});
	 *
	 *                     m.add({title : 'Some item 2', onclick : function() {
	 *                         alert('Some item 2 was clicked.');
	 *                     }});
	 *                 });
	 *
	 *               // Return the new splitbutton instance
	 *               return c;
	 *         }
	 *
	 *         return null;
	 *     }
	 * });
	 */
	tinymce.create('tinymce.ui.SplitButton:tinymce.ui.MenuButton', {
		/**
		 * Constructs a new split button control instance.
		 *
		 * @constructor
		 * @method SplitButton
		 * @param {String} id Control id for the split button.
		 * @param {Object} s Optional name/value settings object.
		 * @param {Editor} ed Optional the editor instance this button is for.
		 */
		SplitButton: function (id, settings, editor) {
			this.parent(id, settings, editor);
			this.classPrefix = 'mceSplitButton';
		},

		/**
		 * Renders the split button as a HTML string. This method is much faster than using the DOM and when
		 * creating a whole toolbar with buttons it does make a lot of difference.
		 *
		 * @method renderHTML
		 * @return {String} HTML for the split button control element.
		 */
		renderHTML: function () {
			var html = '',
				settings = this.settings,
				heading;

			if (settings.image) {
				heading = DOM.createHTML('img ', {
					src: settings.image,
					role: 'presentation',
					'class': 'mceAction ' + settings['class']
				});
			} else {
				heading = DOM.createHTML('span', {
					'class': 'mceAction ' + settings['class']
				}, '');
			}

			heading += DOM.createHTML('span', {
				'class': 'mceVoiceLabel mceIconOnly',
				id: this.id + '_voice',
				style: 'display:none;'
			}, settings.title);

			html += '<div class="mceText">' + DOM.createHTML('a', {
				role: 'button',
				id: this.id + '_action',
				tabindex: '-1',
				href: 'javascript:;',
				'class': settings['class'],
				onclick: "return false;",
				onmousedown: 'return false;',
				title: settings.title
			}, heading) + '</div>';

			heading = DOM.createHTML('span', {
				'class': 'mceOpen ' + settings['class']
			}, '<span style="display:none;" class="mceIconOnly" aria-hidden="true">\u25BC</span>');

			html += '<div class="mceOpen">' + DOM.createHTML('a', {
				role: 'button',
				id: this.id + '_open',
				tabindex: '-1',
				href: 'javascript:;',
				'class': settings['class'],
				onclick: "return false;",
				onmousedown: 'return false;',
				title: settings.title
			}, heading) + '</div>';

			//html += '</tr></tbody>';
			html = DOM.createHTML('div', {
				role: 'presentation',
				'class': 'mceSplitButton mceSplitButtonEnabled ' + settings['class'],
				title: settings.title
			}, html);

			return DOM.createHTML('div', {
				id: this.id,
				role: 'button',
				tabindex: '0',
				'aria-labelledby': this.id + '_voice',
				'aria-haspopup': 'true'
			}, html);
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
				activate;

			if (this.settings.onclick) {
				activate = function (evt) {
					if (!self.isDisabled()) {
						settings.onclick(self.value);
						Event.cancel(evt);
					}
				};

				Event.add(this.id + '_action', 'click', activate);
				Event.add(this.id, ['click', 'keydown'], function (evt) {
					var DOM_VK_DOWN = 40;

					if ((evt.keyCode === 32 || evt.keyCode === 13 || evt.keyCode === 14) && !evt.altKey && !evt.ctrlKey && !evt.metaKey) {
						activate();
						Event.cancel(evt);
					} else if (evt.type === 'click' || evt.keyCode === DOM_VK_DOWN) {
						self.showMenu();
						Event.cancel(evt);
					}
				});
			}

			Event.add(this.id + '_open', 'click', function (evt) {
				self.showMenu();
				Event.cancel(evt);
			});

			Event.add([this.id, this.id + '_open'], 'focus', function () {
				self._focused = 1;
			});

			Event.add([this.id, this.id + '_open'], 'blur', function () {
				self._focused = 0;
			});
		},

		destroy: function () {
			this.parent();

			Event.clear(this.id + '_action');
			Event.clear(this.id + '_open');
			Event.clear(this.id);
		}
	});
})(tinymce);