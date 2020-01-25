/**
 * WindowManager.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

(function (tinymce) {
    var DOM = tinymce.DOM,
        Event = tinymce.dom.Event,
        each = tinymce.each,
        Dispatcher = tinymce.util.Dispatcher;

    function ucfirst(s) {
        return s.substring(0, 1).toUpperCase() + s.substring(1);
    }

    function updateWithTouchData(e) {
        var keys, i;

        if (e.changedTouches) {
            keys = "screenX screenY pageX pageY clientX clientY".split(' ');
            for (i = 0; i < keys.length; i++) {
                e[keys[i]] = e.changedTouches[0][keys[i]];
            }
        }
    }

    /**
     * This class handles the creation of native windows and dialogs. This class can be extended to provide for example inline dialogs.
     *
     * @class tinymce.WindowManager
     * @example
     * // Opens a new dialog with the file.htm file and the size 320x240
     * // It also adds a custom parameter this can be retrieved by using tinyMCEPopup.getWindowArg inside the dialog.
     * tinyMCE.activeEditor.windowManager.open({
     *    url : 'file.htm',
     *    width : 320,
     *    height : 240
     * }, {
     *    custom_param : 1
     * });
     * // Displays an alert box using the active editors window manager instance
     * tinyMCE.activeEditor.windowManager.alert('Hello world!');
     *
     * // Displays an confirm box and an alert message will be displayed depending on what you choose in the confirm
     * tinyMCE.activeEditor.windowManager.confirm("Do you want to do something", function(s) {
     *    if (s)
     *       tinyMCE.activeEditor.windowManager.alert("Ok");
     *    else
     *       tinyMCE.activeEditor.windowManager.alert("Cancel");
     * });
     */
    tinymce.create('tinymce.WindowManager', {
        /**
         * Constructs a new window manager instance.
         *
         * @constructor
         * @method WindowManager
         * @param {tinymce.Editor} ed Editor instance that the windows are bound to.
         */
        WindowManager: function (ed) {
            this.editor = ed;
            this.onOpen = new Dispatcher(this);
            this.onClose = new Dispatcher(this);
            this.params = {};
            this.features = {};

            this.zIndex = 700002;
            this.count = 0;
            this.windows = {};
        },

        /**
         * Creates a instance of a class. This method was needed since IE can't create instances
         * of classes from a parent window due to some reference problem. Any arguments passed after the class name
         * will be passed as arguments to the constructor.
         *
         * @method createInstance
         * @param {String} cl Class name to create an instance of.
         * @return {Object} Instance of the specified class.
         * @example
         * var uri = tinyMCEPopup.editor.windowManager.createInstance('tinymce.util.URI', 'http://www.somesite.com');
         * alert(uri.getURI());
         */
        createInstance: function (cl, a, b, c, d, e) {
            var fn = tinymce.resolve(cl);
            return new fn(a, b, c, d, e);
        },

        /**
         * Opens a new window.
         *
         * @method open
         * @param {Object} s Optional name/value settings collection contains things like width/height/url etc.
         * @option {String} title Window title.
         * @option {String} file URL of the file to open in the window.
         * @option {Number} width Width in pixels.
         * @option {Number} height Height in pixels.
         * @option {Boolean} resizable Specifies whether the popup window is resizable or not.
         * @option {Boolean} maximizable Specifies whether the popup window has a "maximize" button and can get maximized or not.
         * @option {Boolean} inline Specifies whether to display in-line (set to 1 or true for in-line display; requires inlinepopups plugin).
         * @option {String/Boolean} popup_css Optional CSS to use in the popup. Set to false to remove the default one.
         * @option {Boolean} translate_i18n Specifies whether translation should occur or not of i18 key strings. Default is true.
         * @option {String/bool} close_previous Specifies whether a previously opened popup window is to be closed or not (like when calling the file browser window over the advlink popup).
         * @option {String/bool} scrollbars Specifies whether the popup window can have scrollbars if required (i.e. content larger than the popup size specified).
         * @param {Object} p Optional parameters/arguments collection can be used by the dialogs to retrive custom parameters.
         * @option {String} plugin_url url to plugin if opening plugin window that calls tinyMCEPopup.requireLangPack() and needs access to the plugin language js files
         */
        open: function (f, p) {
            var self = this,
                id,
                ed = self.editor,
                dw = 0,
                dh = 0,
                win, url;

            f = f || {};
            p = p || {};

            // Only store selection if the type is a normal window
            if (!f.type) {
                self.bookmark = ed.selection.getBookmark(1);
            }

            id = DOM.uniqueId("mce_window_"); // Use a prefix so this can't conflict with other ids

            f.width = parseInt(f.width || 0);
            f.height = parseInt(f.height || 0);

            p.mce_window_id = id;

            self.features = f;
            self.params = p;

            self.onOpen.dispatch(self, f, p);

            // modal html
            var html = '' +
                '<div class="mceModalBody" id="' + id + '" dir="' + ed.settings.directionality + '">' +
                '   <div class="mceModalContainer">' +
                '       <div class="mceModalHeader" id="' + id + '_header">' +
                '           <h5 class="mceModalTitle" id="' + id + '_title">' + (f.title || "") + '</h5>' +
                '           <button class="mceModalClose" type="button" title="' + ed.getLang('common.close', 'Close') + '"></button>' +
                '       </div>' +
                '       <div class="mceModalContent" id="' + id + '_content"></div>' +
                '   </div>' +
                '</div>';

            // find modal
            var modal = DOM.select('.mceModal');

            // create modal
            if (!modal.length) {
                modal = DOM.add(DOM.doc.body, 'div', { 'class': ed.settings.skin_class + ' mceModal', role: 'dialog', 'aria-labelledby': id + '_title' }, '');

                if (f.overlay !== false) {
                    DOM.add(modal, 'div', { 'class': 'mceModalOverlay' });
                }
            }

            DOM.add(modal, 'div', { 'class': 'mceModalFrame', id: id + '_frame' }, html);

            if (!f.fixed) {
                DOM.addClass(DOM.select('.mceModalHeader', modal), 'mceModalMove');
            } else {
                DOM.addClass(modal, 'mceModalFixed');

                Event.add(id, 'blur', function () {
                    self.close(null, id);
                });
            }

            url = f.url || f.file;

            if (url) {
                if (f.addver !== false) {
                    url = tinymce._addVer(url);
                }

                // add loader
                DOM.addClass(id, 'mceLoading');

                DOM.addClass(id + '_content', 'mceModalContentIframe');

                var iframe = DOM.add(id + '_content', 'iframe', { id: id + '_ifr', src: 'javascript:""', frameBorder: 0, 'aria-label': 'Dialog Content Iframe' });
                DOM.setAttrib(iframe, 'src', url);

                Event.add(iframe, 'load', function () {
                    DOM.removeClass(id, 'mceLoading');
                });
            } else {
                if (f.type) {
                    DOM.addClass(id, 'mceModal' + ucfirst(f.type));
                }

                f.buttons = f.buttons || [
                    {
                        id: 'cancel',
                        title: self.editor.getLang('cancel', 'Cancel'),
                        onclick: function (e) {
                            Event.cancel(e);
                            self.close(null, id);
                        }
                    }
                ];

                if (f.buttons.length) {
                    // add footer
                    DOM.add(DOM.select('.mceModalContainer', id), 'div', { 'class': 'mceModalFooter', id: id + '_footer' });

                    // add buttons
                    each(f.buttons, function (button) {

                        // patch in close function for cancel button
                        if (button.id === 'cancel') {
                            button.onclick = function (e) {
                                self.close(null, id);
                            }
                        }

                        var attribs = {
                            id: id + '_' + button.id,
                            'class': 'mceButton',
                            type: 'button'
                        };

                        if (button.autofocus) {
                            attribs.autofocus = true;
                        }

                        button.title = button.title || 'OK';

                        var btn = DOM.add(id + '_footer', 'button', attribs, button.title);

                        if (button.icon) {
                            DOM.add(btn, 'span', { 'class': 'mceIcon mce_' + button.icon, 'role': 'presentation' });
                        }

                        each(tinymce.explode(button.classes), function (cls) {
                            DOM.addClass(btn, 'mceButton' + ucfirst(cls));
                        });

                        // process passed in onclick
                        if (button.onclick) {
                            Event.add(btn, 'click', function (e) {
                                Event.cancel(e);
                                button.onclick.call(self, e);
                            });
                        }

                        // a submit is simply an onclick with a built in close
                        if (button.onsubmit) {
                            Event.add(btn, 'click', function (e) {
                                Event.cancel(e);
                                button.onsubmit.call(self, e);

                                if (e.cancelSubmit) {
                                    return;
                                }

                                self.close(null, id);
                            });
                        }
                    });
                }

                if (f.content) {
                    // HTML string
                    if (typeof f.content === "string") {
                        DOM.setHTML(id + '_content', '<form>' + f.content.replace('\n', '') + '</form>');
                    }

                    // HTML node collection
                    if (f.content.nodeType) {
                        DOM.add(id + '_content', DOM.create('form', {}, f.content));
                    }
                }

                // controlManager UI items
                if (f.items) {
                    if (!tinymce.is(f.items, 'array')) {
                        f.items = [f.items];
                    }

                    each(f.items, function (ctrl) {
                        DOM.add(id + '_content', 'form', {}, ctrl.renderHTML());
                        ctrl.postRender();

                        // add onClose event to destroy controls
                        self.onClose.add(function () {
                            ctrl.destroy();
                        });
                    });
                }

                function nodeIndex(nodes, node) {
                    for (var i = 0; i < nodes.length; i++) {
                        if (nodes[i] === node) {
                            return i;
                        }
                    }

                    return -1;
                }

                // restrict tabbing to within the form elements of the dialog
                Event.add(id, 'keydown', function (e) {
                    var tabIndex = 0;

                    if (e.keyCode === 9) {
                        var nodes = DOM.select('input, button, select, textarea, .mceListBox', DOM.get(id));

                        nodes = tinymce.grep(nodes, function (node) {
                            return !node.disabled && !DOM.isHidden(node) && node.getAttribute('tabindex') >= 0;
                        });

                        if (!nodes.length) {
                            return;
                        }

                        DOM.setAttrib(nodes, 'tabindex', 0);

                        if (e.shiftKey) {
                            nodes.reverse();
                        }

                        var endIndex = Math.max(0, nodes.length - 1), tabIndex = nodeIndex(nodes, e.target);

                        tabIndex++;

                        tabIndex = Math.max(tabIndex, 0);

                        if (tabIndex > endIndex) {
                            tabIndex = 0;
                        }

                        nodes[tabIndex].focus();
                        DOM.setAttrib(nodes[tabIndex], 'tabindex', 1);

                        e.preventDefault();
                        e.stopImmediatePropagation();
                    }
                });
            }

            Event.add(id, 'keydown', function (evt) {
                // Close on escape
                if (evt.keyCode === 27) {
                    self.close(null, id);

                    evt.preventDefault();
                    evt.stopImmediatePropagation();

                    return;
                }

                // enter triggers focused button
                if (evt.keyCode === 13) {
                    if (evt.target) {
                        if (evt.target.nodeName === "TEXTAREA") {
                            return;
                        }
                        
                        if (evt.target.nodeName === "BUTTON") {
                            Event.fire(evt.target, 'click');
                        }
                    }

                    // or cancel
                    evt.preventDefault();
                    evt.stopImmediatePropagation();
                }
            });

            Event.add(DOM.select('button.mceModalClose', DOM.get(id)), 'click', function (evt) {
                self.close(null, id);

                evt.preventDefault();
                evt.stopImmediatePropagation();

                return;
            });

            // Measure borders
            if (!f.type) {
                dh += DOM.get(id + '_header').clientHeight;
            }

            // set size classes
            if (f.size) {
                DOM.addClass(id, f.size);
            } else {
                if (f.width) {
                    DOM.setStyle(id, 'width', f.width + dw);
                }

                if (f.height) {
                    DOM.setStyle(id, 'height', f.height + dh);
                }
            }

            if (!f.fixed) {
                Event.add(DOM.win, 'resize orientationchange', function () {
                    if (DOM.get(id)) {
                        self.position(id);
                    }
                });
            }

            // Register events
            Event.add(id, 'mousedown', function (e) {
                var n = e.target

                if (/(input|select|textarea|button|label)/i.test(n.nodeName)) {
                    return;
                }

                self.focus(id);

                // ignore if the target is the close button, as this has it's own onclick event
                if (DOM.hasClass(n, '.mceModalClose')) {
                    return;
                }

                if (f.fixed) {
                    return;
                }

                if (DOM.hasClass(n, 'mceModalMove') || DOM.hasClass(n.parentNode, 'mceModalMove')) {
                    return self._startDrag(id, e, 'Move');
                }
            });

            // Add window
            self.windows[id] = win = {
                id: id,
                features: f,
                elm: DOM.get(id),
                moveTo: function (x, y) {
                    return self.moveTo(id, x, y);
                },
                close: function () {
                    return self.close(null, id);
                },
                focus: function () {
                    return self.focus(id);
                }
            };

            if (f.open && typeof f.open === "function") {
                f.open.call(win || self, win);
            }

            DOM.setAttrib(id, 'aria-hidden', 'false');

            // position modal
            self.position(id);

            // focus modal
            self.focus(id);

            self.count++;
            
            return win;
        },

        /**
         * Closes the specified window. This will also dispatch out a onClose event.
         *
         * @method close
         * @param {Window} win Window object to close.
         * @param {String} id Id of window to close.
         */
        close: function (win, id) {
            var self = this, id;

            id = self._findId(id || win);

            win = self.windows[id] || self._frontWindow();

            // Probably not inline
            if (!win) {
                return false;
            }

            self.count--;

            // only 1 window open, so remove modal structure
            if (self.count === 0) {
                DOM.remove(DOM.select('.mceModal'));
                DOM.setAttrib(DOM.doc.body, 'aria-hidden', 'false');
                self.editor.focus();
            }

            self.onClose.dispatch(self);

            var f = win.features || {};

            if (f.close && typeof f.close === "function") {
                f.close.call(win || self, win);
            }

            Event.clear(id);
            Event.clear(id + '_ifr');
            DOM.setAttrib(id + '_ifr', 'src', 'javascript:""'); // Prevent leak

            // remove frame
            DOM.remove(id + '_frame');
            DOM.remove(id);

            delete this.windows[id];

            if (self.count > 0) {
                var fw = this._frontWindow();

                if (fw) {
                    fw.focus();
                }
            }

            return true;
        },

        setTitle: function (win, title) {
            var elm, id;

            id = this._findId(win);

            elm = DOM.get(id + '_title');

            if (elm && !elm.innerHTML) {
                elm.innerHTML = DOM.encode(title);
            }
        },

        /**
         * Creates a confirm dialog
         *
         * @method confirm
         * @param {String} t Title for the new confirm dialog.
         * @param {function} cb Callback function to be executed after the user has selected ok or cancel.
         * @param {Object} s Optional scope to execute the callback in.
         * @example
         * // Displays an confirm box and an alert message will be displayed depending on what you choose in the confirm
         * tinyMCE.activeEditor.windowManager.confirm("Do you want to do something", function(s) {
         *    if (s)
         *       tinyMCE.activeEditor.windowManager.alert("Ok");
         *    else
         *       tinyMCE.activeEditor.windowManager.alert("Cancel");
         * });
         */
        confirm: function (txt, cb, s) {
            var self = this;

            self.open({
                title: '',
                type: 'confirm',
                buttons: [
                    {
                        title: self.editor.getLang('no', 'No'),
                        id: 'cancel'
                    },
                    {
                        title: self.editor.getLang('yes', 'Yes'),
                        id: 'ok',
                        classes: 'primary',
                        autofocus: true,
                        onsubmit: function (s) {
                            if (cb) {
                                cb.call(s || self, s);
                            }
                        }
                    }
                ],
                content: '<p>' + DOM.encode(self.editor.getLang(txt, txt)) + '</p>'
            });
        },

        /**
         * Creates a alert dialog
         *
         * @method alert
         * @param {String} t Title for the new alert dialog.
         * @param {function} cb Callback function to be executed after the user has selected ok.
         * @param {Object} s Optional scope to execute the callback in.
         * @example
         * // Displays an alert box using the active editors window manager instance
         * tinyMCE.activeEditor.windowManager.alert('Hello world!');
         */
        alert: function (txt, cb, s) {
            var self = this;

            self.open({
                title: '',
                type: 'alert',
                buttons: [
                    {
                        title: self.editor.getLang('cancel', 'Cancel'),
                        id: 'cancel'
                    },
                    {
                        title: self.editor.getLang('ok', 'Ok'),
                        id: 'ok',
                        classes: 'primary',
                        autofocus: true,
                        onsubmit: function (s) {
                            if (cb) {
                                cb.call(s || self, s);
                            }
                        }
                    }
                ],
                content: '<p>' + DOM.encode(self.editor.getLang(txt, txt)) + '</p>'
            });
        },

        /**
         * Resizes the specified window or id.
         *
         * @param {Number} dw Delta width.
         * @param {Number} dh Delta height.
         * @param {window/id} win Window if the dialog isn't inline. Id if the dialog is inline.
         */
        resizeBy: function (dw, dh, id) {
        },

        moveTo: function (id, x, y) {
            DOM.setStyles(id, { 'left': x, 'top': y });
        },

        position: function (id) {
            var p = DOM.getRect(id),
                vp = DOM.getViewPort();

            var top = Math.round(Math.max(vp.y + 10, vp.y + (vp.h / 2.0) - (p.h / 2.0)));
            var left = Math.round(Math.max(vp.x + 10, vp.x + (vp.w / 2.0) - (p.w / 2.0)));

            DOM.setStyles(id, { 'left': left, 'top': top });
        },

        focus: function (id) {
            var win = this.windows[id];

            if (!win) {
                return;
            }

            win.zIndex = this.zIndex++;
            DOM.setStyle(id + '_frame', 'zIndex', win.zIndex);

            DOM.removeClass(this.lastId, 'mceFocus');
            DOM.addClass(id + '_frame', 'mceFocus');

            this.lastId = id + '_frame';

            DOM.get(id).focus();

            if (DOM.get(id + '_ifr')) {
                DOM.get(id + '_ifr').focus();
            } else {
                var nodes = DOM.select('input, select, button, textarea', DOM.get(id));

                nodes[0].focus();

                for (var i = 0; i < nodes.length; i++) {
                    var node = nodes[i];

                    if (node.getAttribute('tabindex') >= 0) {
                        if (node.getAttribute('autofocus')) {
                            node.focus();
                            break;
                        }
                    }
                }
            }
        },

        // Internal functions
        _startDrag: function (id, se, ac) {
            var self = this,
                mu, mm, d = DOM.doc,
                w = self.windows[id],
                sx, sy, cp;

            if (DOM.hasClass(id, 'dragging')) {
                end();
                return;
            }

            updateWithTouchData(se);

            p = DOM.getRect(id);
            vp = DOM.getViewPort();

            // Get positons and sizes
            cp = { x: 0, y: 0 };

            // Reduce viewport size to avoid scrollbars while dragging
            vp.w -= 2;
            vp.h -= 2;

            DOM.addClass(id, 'dragging');

            sx = se.screenX;
            sy = se.screenY;

            function end() {
                Event.remove(d, 'mouseup touchend', mu);
                Event.remove(d, 'mousemove touchmove', mm);

                DOM.removeClass(id, 'dragging');
            }

            // Handle mouse up
            mu = Event.add(d, 'mouseup touchend', function (e) {
                updateWithTouchData(e);

                end();

                return Event.cancel(e);
            });

            // Handle mouse move/drag
            mm = Event.add(d, 'mousemove touchmove', function (e) {
                var x, y, v;

                updateWithTouchData(e);

                x = e.screenX - sx; // - vp.x;
                y = e.screenY - sy; // - vp.y;

                dx = Math.max(p.x + x, 10);
                dy = Math.max(p.y + y, 10);

                DOM.setStyles(id, { 'left': dx, 'top': dy });

                return Event.cancel(e);
            });
        },

        // Find front most window
        _frontWindow: function () {
            var fw, ix = 0;

            /*for (var i = 0; i < this.windows.length; i++) {
                var win = this.windows[i];

                if (win.zIndex > ix) {
                    fw = win;
                    ix = win.zIndex;
                }
            }*/

            tinymce.each(this.windows, function (win) {
                if (win.zIndex > ix) {
                    fw = win;
                    ix = win.zIndex;
                }
            });

            return fw;
        },

        _findId: function (w) {
            var self = this;

            if (typeof (w) == 'string') {
                return w;
            }

            each(self.windows, function (wo) {
                var ifr = DOM.get(wo.id + '_ifr');

                if (ifr && w == ifr.contentWindow) {
                    w = wo.id;
                    return false;
                }
            });

            return w;
        }
    });
})(tinymce);