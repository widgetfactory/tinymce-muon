/**
 * @package   	JCE
 * @copyright 	Copyright (c) 2009-2019 Ryan Demmer. All rights reserved.
 * @license   	GNU/GPL 2 or later - http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
 * JCE is free software. This version may have been modified pursuant
 * to the GNU General Public License, and as distributed it includes or
 * is derivative of works licensed under the GNU General Public License or
 * other free or open source software licenses.
 */
(function (tinymce) {
    var DOM = tinymce.DOM,
        Event = tinymce.dom.Event;

    tinymce.create('tinymce.ui.PanelSplitButton:tinymce.ui.PanelButton', {
        /**
         * Constructs a new split button control instance.
         *
         * @constructor
         * @method MenuButton
         * @param {String} id Control id for the split button.
         * @param {Object} s Optional name/value settings object.
         * @param {Editor} ed Optional the editor instance this button is for.
         */
        PanelSplitButton: function (id, s, ed) {
            this.parent(id, s, ed);
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
                self = this,
                s = self.settings;

            if (s.image) {
                icon = DOM.createHTML('img ', {
                    src: s.image,
                    role: 'presentation',
                    'class': 'mceAction ' + s['class']
                });
            } else {
                icon = DOM.createHTML('span', {
                    'class': 'mceAction ' + s['class'],
                    role: 'presentation'
                });
            }

            html += DOM.createHTML('button', {
                id: self.id + '_action',
                tabindex: '-1',
                'class': 'mceText ' + s['class'],
                title: s.title
            }, icon);

            html += DOM.createHTML('button', {
                id: self.id + '_open',
                tabindex: '-1',
                'class': 'mceOpen ' + s['class'],
                title: s.title
            });

            return DOM.createHTML('div', {
                id: self.id,
                role: 'button',
                tabindex: 0,
                'class': 'mceSplitButton ' + s['class'],
                title: s.title,
                'aria-label': s.title,
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
                s = self.settings;

            activate = function (evt) {
                if (!self.isDisabled()) {
                    s.onclick(self.value);
                    Event.cancel(evt);
                }
            };

            Event.add(self.id + '_action', 'click', activate);

            Event.add(self.id, ['click', 'keydown'], function (evt) {
                var DOM_VK_DOWN = 40;

                if ((evt.keyCode === 32 || evt.keyCode === 13 || evt.keyCode === 14) && !evt.altKey && !evt.ctrlKey && !evt.metaKey) {
                    activate();
                    Event.cancel(evt);
                } else if (evt.type === 'click' || evt.keyCode === DOM_VK_DOWN) {
                    self.showPanel();
                    Event.cancel(evt);
                }
            });

            Event.add(self.id + '_open', 'click', function (evt) {
                self.showPanel();
                Event.cancel(evt);
            });

            Event.add([self.id, self.id + '_open'], 'focus', function () {
                self._focused = 1;
            });

            Event.add([self.id, self.id + '_open'], 'blur', function () {
                self._focused = 0;
            });

            if (!self.panel) {
                self.panel = new tinymce.ui.Panel(self.id + '_panel', self.settings, self.editor);
            }

            self.panel.onRenderPanel.add(function () {
                self.onRenderPanel.dispatch(self);
                DOM.addClass(self.id + '_panel', 'mcePanelSplitButton');
            });
        }
    });
})(tinymce);