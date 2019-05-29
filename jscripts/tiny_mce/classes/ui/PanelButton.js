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
                p1, p2, e = DOM.get(self.id),
                m;

            if (self.isDisabled())
                return;

            this.storeSelection();

            if (!self.isPanelRendered) {
                self.renderPanel();
            }

            if (self.isPanelVisible)
                return self.hidePanel();

            DOM.show(self.id + '_Panel');

            if (s.url) {
                var iframe = DOM.get(self.id + '_iframe');
                iframe.src = s.url;
            }

            p2 = DOM.getPos(e);
            DOM.setStyles(self.id + '_Panel', {
                left: p2.x,
                top: p2.y + e.clientHeight + 5,
                zIndex: 200000
            });
            e = 0;

            if (this.isActive()) {
                DOM.addClass(self.id + '_Panel', this.classPrefix + 'PanelActive');
            } else {
                DOM.removeClass(self.id + '_Panel', this.classPrefix + 'PanelActive');
            }

            Event.add(ed.getDoc(), 'mousedown', self.hidePanel, t);

            Event.add(DOM.doc, 'mousedown', function (e) {
                var n = e.target;

                while (n) {
                    if (n == DOM.getRoot() || !n.nodeType || n.nodeType === 9) {
                        break;
                    }

                    if (n == DOM.get(self.id + '_Panel')) {
                        return;
                    }

                    n = n.parentNode;
                }

                self.hidePanel();
            });

            self.onShowPanel.dispatch(self);

            if (self._focused) {
                self._keyHandler = Event.add(self.id + '_Panel', 'keydown', function (e) {
                    if (e.keyCode == 27)
                        self.hidePanel();
                });
            }

            self.isPanelVisible = 1;
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
         * Renders the menu to the DOM.
         *
         * @method renderMenu
         */
        renderPanel: function () {
            var self = this,
                m, s = this.settings,
                w, v, ed = this.editor;

            s['class'] += ' defaultSkin';

            if (ed.getParam('skin') !== "default") {
                s['class'] += ' ' + ed.getParam('skin') + 'Skin';
            }

            if (v = ed.getParam('skin_variant')) {
                s['class'] += ' ' + ed.getParam('skin') + 'Skin' + v.substring(0, 1).toUpperCase() + v.substring(1);
            }

            s['class'] += ed.settings.directionality == "rtl" ? ' mceRtl' : '';

            w = DOM.add(s.Panel_container, 'div', {
                role: 'presentation',
                id: self.id + '_Panel',
                'class': s['class'],
                style: 'position:absolute;left:0;top:-1000px;'
            });

            w = DOM.add(w, 'div', {
                'class': this.classPrefix + 'Panel'
            });

            m = DOM.add(w, 'div', {
                'class': this.classPrefix + 'PanelContent'
            });

            if (s.width) {
                DOM.setStyle(w, 'width', s.width);
            }

            if (tinymce.is(s.content, 'string')) {
                DOM.setHTML(m, s.content);
            } else {
                DOM.add(m, s.content);
            }

            if (s.url) {
                DOM.add(m, 'iframe', {
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

            m = DOM.add(w, 'div', {
                'class': this.classPrefix + 'PanelButtons'
            });

            each(s.buttons, function (o) {
                var btn = DOM.add(m, 'button', {
                    'type': 'button',
                    'class': 'mcePanelButton',
                    'id': self.id + '_button_' + o.id
                }, o.title || '');

                if (o.click) {
                    Event.add(btn, 'click', function (e) {
                        e.preventDefault();

                        self.restoreSelection();

                        var s = o.click.call(o.scope || t, e);

                        if (s) {
                            self.hidePanel();
                        }
                    });
                }
            });

            if (!s.url) {
                self.isPanelRendered = true;
                self.onRenderPanel.dispatch(self);
            }

            return w;
        },
        setButtonDisabled: function (button, state) {
            var id = this.id + '_button_' + button;

            if (state) {
                DOM.addClass(id, 'disabled');
            } else {
                DOM.removeClass(id, 'disabled');
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
            }))
                return;

            if (!e || !DOM.getParent(e.target, '.mcePanel')) {
                self.setState('Selected', 0);
                Event.remove(DOM.doc, 'mousedown', self.hidePanel, t);

                DOM.hide(self.id + '_Panel');
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
                s = self.settings,
                bm, ed = this.editor;

            Event.add(self.id, 'click', function () {
                if (!self.isDisabled()) {

                    if (s.onclick)
                        s.onclick(self.value);

                    self.showPanel();
                }
            });
        },
        destroy: function () {
            this.parent();

            Event.clear(this.id + '_Panel');
            DOM.remove(this.id + '_Panel');
        }
    });
})(tinymce);