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
        Event = tinymce.dom.Event,
        each = tinymce.each;

    tinymce.create('tinymce.ui.PanelButton:tinymce.ui.Button', {
        /**
         * Constructs a new split button control instance.
         *
         * @constructor
         * @method MenuButton
         * @param {String} id Control id for the split button.
         * @param {Object} s Optional name/value settings object.
         * @param {Editor} ed Optional the editor instance this button is for.
         */
        PanelButton: function (id, s, ed) {
            this.parent(id, s, ed);

            this.settings = s = tinymce.extend({
                content: '',
                buttons: []
            }, this.settings);

            this.editor = ed;

            this.classPrefix = 'mcePanelButton';

            /**
             * Fires when the menu is rendered.
             *
             * @event onRenderMenu
             */
            this.onRenderPanel = new tinymce.util.Dispatcher(this);

            this.onShowPanel = new tinymce.util.Dispatcher(this);

            this.onHidePanel = new tinymce.util.Dispatcher(this);
        },
        /**
         * Shows the menu.
         *
         * @method showMenu
         */
        showPanel: function () {
            var self = this,
                ed = this.editor,
                s = this.settings,
                pos, e = DOM.get(self.id), ot = 0, vp = DOM.getViewPort(), x, y, mx;

            if (self.isDisabled()) {
                return;
            }

            this.storeSelection();

            if (!self.isPanelRendered) {
                self.renderPanel();
            }

            if (self.isPanelVisible) {
                return self.hidePanel();
            }

            var panel = DOM.get(self.id + '_panel');

            DOM.show(panel);

            if (s.url) {
                var iframe = DOM.get(self.id + '_iframe');
                iframe.src = s.url;
            }

            pos = DOM.getPos(e);

            x = pos.x;
            y = pos.y;

            // Move inside viewport
            w = panel.clientWidth - ot;
            mx = vp.x + vp.w;

            if ((x + w) > mx) {
                x = Math.max(0, mx - w);
            }

            DOM.setStyles(self.id + '_panel', {
                left: x,
                top: y + e.clientHeight + 5,
                zIndex: 200000
            });

            e = 0;

            if (this.isActive()) {
                DOM.addClass(self.id + '_panel', 'mcePanelButtonActive');
            } else {
                DOM.removeClass(self.id + '_panel', 'mcePanelButtonActive');
            }

            //Event.add(ed.getDoc(), 'mousedown', self.hidePanel, self);

            Event.add(DOM.doc, 'mousedown', function (e) {
                var n = e.target;

                while (n) {
                    if (n == DOM.getRoot() || !n.nodeType || n.nodeType === 9) {
                        break;
                    }

                    if (n == DOM.get(self.id + '_panel')) {
                        return;
                    }

                    n = n.parentNode;
                }

                self.hidePanel();
            });

            self.onShowPanel.dispatch(self);

            if (self._focused) {
                self._keyHandler = Event.add(self.id + '_panel', 'keydown', function (e) {
                    if (e.keyCode == 27) {
                        self.hidePanel();
                    }
                });
            }

            self.isPanelVisible = 1;

            self.setState('Selected', 1);
        },

        storeSelection: function () {
            // Store bookmark
            if (tinymce.isIE) {
                this.editor.focus();
                this.bookmark = this.editor.selection.getBookmark(1);
            }
        },
        restoreSelection: function () {
            if (this.bookmark) {
                this.editor.selection.moveToBookmark(this.bookmark);
                this.editor.focus();
            }

            this.bookmark = 0;
        },

        /**
		 * Renders the split button as a HTML string. This method is much faster than using the DOM and when
		 * creating a whole toolbar with buttons it does make a lot of difference.
		 *
		 * @method renderHTML
		 * @return {String} HTML for the split button control element.
		 */
        renderHTML: function () {
            var h = '',
                self = this,
                s = self.settings,
                h1;

            if (!s.onclick) {
                return this.parent();
            }

            if (s.image) {
                h1 = DOM.createHTML('img ', {
                    src: s.image,
                    role: 'presentation',
                    'class': 'mceAction ' + s['class']
                });
            } else {
                h1 = DOM.createHTML('span', {
                    'class': 'mceAction ' + s['class']
                }, '');
            }

            h1 += DOM.createHTML('span', {
                'class': 'mceVoiceLabel mceIconOnly',
                id: self.id + '_voice',
                style: 'display:none;'
            }, s.title);

            h += '<div class="mceText">' + DOM.createHTML('button', {
                role: 'button',
                id: self.id + '_action',
                tabindex: '-1',
                'class': s['class'],
                title: s.title
            }, h1) + '</div>';

            h1 = DOM.createHTML('span', {
                'class': 'mceOpen ' + s['class']
            }, '<span style="display:none;" class="mceIconOnly" aria-hidden="true">\u25BC</span>');

            h += '<div class="mceOpen">' + DOM.createHTML('button', {
                role: 'button',
                id: self.id + '_open',
                tabindex: '-1',
                'class': s['class'],
                title: s.title
            }, h1) + '</div>';

            h = DOM.createHTML('div', {
                role: 'presentation',
                'class': 'mceSplitButton ' + s['class'],
                title: s.title
            }, h);

            return DOM.createHTML('div', {
                id: self.id,
                role: 'button',
                tabindex: '0',
                'aria-labelledby': self.id + '_voice',
                'aria-haspopup': 'true'
            }, h);
        },

        /**
         * Renders the menu to the DOM.
         *
         * @method renderMenu
         */
        renderPanel: function () {
            var self = this, s = this.settings;
            
            var panel = DOM.add(DOM.doc.body, 'div', {
                role: 'presentation',
                id: self.id + '_panel',
                'class': s.panelClass || 'defaultSkin',
                style: 'position:absolute;left:0;top:-1000px;'
            });

            panel = DOM.add(panel, 'div', {'class' : 'mcePanel'});

            var content = DOM.add(panel, 'div', {
                'class': 'mcePanelContent'
            });

            if (s.width) {
                DOM.setStyle(panel, 'width', s.width);
            }

            var html = [];

            if (s.html) {
                // html string, eg: '<div></div>';
                if (typeof s.html === 'string') {
                    html.push(s.html);
                    // html node
                } else {
                    html.push(DOM.createHTML(s.html));
                }
            }

            if (s.controls) {
                each(s.controls, function (ctrl) {
                    html.push(ctrl.renderHTML());
                });
            }

            DOM.setHTML(content, html.join(''));

            if (s.url) {
                DOM.add(panelContent, 'iframe', {
                    'id': self.id + '_iframe',
                    'src': s.url,
                    style: {
                        'border': 0,
                        'width': '100%',
                        'height': '100%'
                    },
                    onload: function () {
                        self.isPanelRendered = true;
                        self.onRenderPanel.dispatch(self);
                    }
                });
            }

            if (s.buttons.length) {
                var footer = DOM.add(panel, 'div', {
                    'class': 'mcePanelFooter'
                });

                each(s.buttons, function (o) {
                    var btn = DOM.add(footer, 'button', {
                        'type': 'button',
                        'class': 'mceButton',
                        'id': self.id + '_button_' + o.id
                    }, o.title || '');

                    if (o.classes) {
                        DOM.addClass(btn, o.classes);
                    }

                    if (o.onclick) {
                        Event.add(btn, 'click', function (e) {
                            e.preventDefault();

                            self.restoreSelection();

                            var s = o.onclick.call(o.scope || self, e);

                            if (s) {
                                self.hidePanel();
                            }
                        });
                    }
                });
            }

            var navItems = tinymce.grep(DOM.select('input, select, button, textarea', panel), function(elm) {
                return elm.getAttribute('tabindex') >= 0 && elm.className.indexOf('Disabled') === -1;
            });

            //var btn = DOM.get(self.id + '_open') || DOM.get(self.id);

            // add toolbar button
            //navItems.unshift(btn);

            if (navItems.length) {
                Event.add(panel, 'keydown', function(e) {
                    if (e.keyCode === 9) {
                        if (e.target === navItems[navItems.length - 1]) {                        
                            e.preventDefault();
                            navItems[0].focus();
                        }
                    }
                });
            }

            if (!s.url) {
                self.isPanelRendered = true;
                self.onRenderPanel.dispatch(self);
            }

            return panel;
        },

        setButtonDisabled: function (button, state) {
            var id = this.id + '_button_' + button;

            if (state) {
                DOM.addClass(id, 'mceButtonDisabled');
            } else {
                DOM.removeClass(id, 'mceButtonDisabled');
            }
        },
        setButtonLabel: function (button, label) {
            DOM.setHTML(this.id + '_button_' + button, label);
        },

        /**
         * Hides the menu. The optional event parameter is used to check where the event occured so it
         * doesn't close them menu if it was a event inside the menu.
         *
         * @method hideMenu
         * @param {Event} e Optional event object.
         */
        hidePanel: function (e) {
            var self = this;

            // Prevent double toogles by canceling the mouse click event to the button
            if (e && e.type == "mousedown" && DOM.getParent(e.target, function (e) {
                return e.id === self.id || e.id === self.id + '_open';
            })) {
                return;
            }

            if (!e || !DOM.getParent(e.target, '.mcePanel')) {
                self.setState('Selected', 0);
                Event.remove(DOM.doc, 'mousedown', self.hidePanel, self);
                DOM.hide(self.id + '_panel');
            }

            self.isPanelVisible = 0;

            self.onHidePanel.dispatch(self);
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

            // primary function is to display panel
            if (!s.onclick) {
                DOM.addClass(self.id, 'mceButton');

                Event.add(self.id, 'click', function (evt) {
                    if (!self.isDisabled()) {

                        if (s.onclick) {
                            s.onclick(self.value);
                        }

                        self.showPanel();
                    }

                    Event.cancel(evt);
                });

                return;
            }

            DOM.addClass(self.id, 'mceSplitButton');

            if (s.onclick) {
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
            }

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
        },
        destroy: function () {
            this.parent();

            Event.clear(this.id + '_panel');
            DOM.remove(this.id + '_panel');
        }
    });
})(tinymce);