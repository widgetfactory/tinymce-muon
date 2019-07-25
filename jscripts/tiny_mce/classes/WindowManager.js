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

            this.zIndex = 300002;
            this.count = 0;
            this.windows = {};
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
                id, opt = '',
                ed = self.editor,
                dw = 0,
                dh = 0,
                vp, po, mdf, clf, rsf, we, w, url;

            f = f || {};
            p = p || {};

            // Only store selection if the type is a normal window
            if (!f.type) {
                self.bookmark = ed.selection.getBookmark(1);
            }

            id = DOM.uniqueId("mce_window_"); // Use a prefix so this can't conflict with other ids

            vp = DOM.getViewPort();

            f.width = parseInt(f.width || 0);
            f.height = parseInt(f.height || 0) + (tinymce.isIE ? 8 : 0);

            f.popup_css = false;

            p.mce_window_id = id;

            self.features = f;
            self.params = p;

            self.onOpen.dispatch(self, f, p);

            // modal html
            var html = '' + 
            '<div class="mceModalBody" id="' + id + '">' +
            '   <div class="mceModalContainer">' +
            '       <div class="mceModalHeader" id="' + id + '_header">' +
            '           <button class="mceModalClose" type="button"></button>' +
            '           <h3 class="mceModalTitle" id="' + id + '_title">' + (f.title || "") + '</h3>' +
            '       </div>' +
            '       <div class="mceModalContent" id="' + id + '_content"></div>' +
            '   </div>' +
            '</div>';

            // find modal
            var modal = DOM.select('.mceModal');

            // create modal
            if (!modal.length) {
                modal = DOM.add(DOM.doc.body, 'div', { 'class': 'mceModal', role: 'dialog' }, '');

                if (f.overlay !== false) {
                    DOM.add(modal, 'div', { 'class': 'mceModalOverlay' });
                }
            }

            DOM.add(modal, 'div', { 'class': 'mceModalFrame', id: id + '_frame' }, html);

            if (!f.fixed) {
                DOM.addClass(DOM.select('.mceModalHeader', modal), 'mceModalMove');
            } else {
                DOM.addClass(modal, 'mceModalFixed');

                Event.add(id, 'blur', function() {
                    self.close(null, id);
                });
            }

            url = f.url || f.file;

            if (url) {
                url = tinymce._addVer(url);
                
                // add loader
                DOM.addClass(id, 'mceLoading');

                var iframe = DOM.add(id + '_content', 'iframe', { id: id + '_ifr', src: 'javascript:""', frameBorder: 0 });
                DOM.setAttrib(iframe, 'src', url);

                Event.add(iframe, 'load', function () {
                    DOM.removeClass(id, 'mceLoading');
                });
            } else {
                if (f.type) {
                    DOM.addClass(id, 'mceModal' + ucfirst(f.type));
                }

                f.buttons = f.buttons || [{
                    id: 'cancel',
                    title: self.editor.getLang('cancel', 'Cancel'),
                    onclick: function (e) {
                        Event.cancel(e);
                        self.close();
                    }
                }];

                if (f.buttons.length) {
                    // add footer
                    DOM.add(DOM.select('.mceModalContainer', id), 'div', { 'class': 'mceModalFooter', id: id + '_footer' });

                    // add buttons
                    each(f.buttons, function (button) {
                        var btn = DOM.add(id + '_footer', 'button', {
                            id: id + '_' +  button.id,
                            'class': 'mceButton',
                            type: 'button'
                        }, button.title || 'Ok');

                        each(tinymce.explode(button.classes), function(cls) {
                            DOM.addClass(btn, 'mceButton' + ucfirst(cls));
                        });

                        if (button.onclick) {
                            Event.add(btn, 'click', button.onclick);
                        }
                    });
                }

                if (typeof f.content === "string") {
                    DOM.setHTML(id + '_content', '<div>' + f.content.replace('\n', '<br />') + '</div>');
                } else {
                    DOM.add(id + '_content', f.content);
                }

                // Close on escape
                Event.add(id, 'keyup', function (evt) {
                    if (evt.keyCode === 27) {
                        self.close(false);
                        return Event.cancel(evt);
                    }
                });

                Event.add(id, 'keydown', function (evt) {
                    var tabIndex = 0;
                    
                    if (evt.keyCode === 9) {
                        Event.cancel(evt);

                        var nodes = DOM.select('input, button, select, textarea', DOM.get(id));

                        nodes = tinymce.grep(nodes, function(node) {
                            return node.getAttribute('tabindex') >= 0;
                        });
                        
                        tinymce.each(nodes, function(node, i) {
                            if (DOM.hasClass(node, 'mceFocus')) {
                                tabIndex = i;
                            }
                        });

                        // must be >= 0
                        tabIndex = Math.max(tabIndex, 0);

                        // reverse on SHIFT+TAB
                        if (evt.shiftKey) {
                            tabIndex--;
                        } else {
                            tabIndex++;
                        }

                        // must be >= 0
                        tabIndex = Math.max(tabIndex, 0);

                        // if greater than the last item, then go back to 0
                        if (tabIndex === nodes.length) {
                            tabIndex = 0;
                        }

                        DOM.removeClass(nodes, 'mceFocus');

                        // focus the nth item
                        if (nodes[tabIndex]) {
                            nodes[tabIndex].focus();
                            DOM.addClass(nodes[tabIndex], 'mceFocus');
                        }
                    }
                });
            }

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
                var n = e.target,
                    w, vp;

                w = self.windows[id];
                self.focus(id);

                if (DOM.is(n, 'button.mceModalClose')) {
                    self.close(null, id);
                    return Event.cancel(e);
                }

                if (f.fixed) {
                    return;
                }
                
                if (DOM.hasClass(n, 'mceModalMove') || DOM.hasClass(n.parentNode, 'mceModalMove')) {
                    return self._startDrag(id, e, 'Move');
                }
            });

            // Add window
            w = self.windows[id] = {
                id: id,
                features: f,
                moveTo: function(x, y) {
                    return self.moveTo(id, x, y);
                },
                close: function() {
                    return self.close(null, id);
                }
            };

            DOM.setAttrib(id, 'aria-hidden', 'false');

            // position modal
            self.position(id);

            // focus
            self.focus(id);

            self.count++;

            return w;
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

            // Probably not inline
            if (!self.windows[id]) {
                return;
            }

            self.count--;

            if (self.count === 0) {
                DOM.remove(DOM.select('.mceModal'));
                DOM.setAttrib(DOM.doc.body, 'aria-hidden', 'false');
                self.editor.focus();
            }

            if (w = self.windows[id]) {
                self.onClose.dispatch(self);

                Event.clear(id);
                Event.clear(id + '_ifr');

                DOM.setAttrib(id + '_ifr', 'src', 'javascript:""'); // Prevent leak

                // remove frame
                DOM.remove(id + '_frame');
                DOM.remove(id);

                delete self.windows[id];
            }
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

        setTitle: function (w, ti) {
            var e;

            w = this._findId(w);

            if (e = DOM.get(w + '_title')) {
                if (!e.innerHTML) {
                    e.innerHTML = DOM.encode(ti);
                }
            }
        },

        /**
         * Creates a confirm dialog. Please don't use the blocking behavior of this
         * native version use the callback method instead then it can be extended.
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
            var self = this,
                w;

            w = self.open({
                title: '',
                type: 'confirm',
                buttons: [
                    {
                        title: self.editor.getLang('yes', 'Yes'),
                        id: 'ok',
                        classes: 'primary',
                        onclick: function (s) {
                            if (cb) {
                                cb.call(s || self, s);
                            }
                            self.close(null, w.id);
                        }
                    },
                    {
                        title: self.editor.getLang('no', 'No'),
                        id: 'cancel',
                        onclick: function () {
                            self.close(null, w.id);
                        }
                    }
                ],
                content: DOM.encode(self.editor.getLang(txt, txt))
            });
        },

        /**
         * Creates a alert dialog. Please don't use the blocking behavior of this
         * native version use the callback method instead then it can be extended.
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
            var self = this,
                w;

            w = self.open({
                title: '',
                type: 'alert',
                buttons: [
                    {
                        title: self.editor.getLang('ok', 'Ok'),
                        id: 'ok',
                        classes: 'primary',
                        onclick: function (s) {
                            if (cb) {
                                cb.call(s || self, s);
                            }
                            self.close(null, w.id);
                        }
                    },
                    {
                        title: self.editor.getLang('cancel', 'Cancel'),
                        id: 'cancel',
                        onclick: function () {
                            self.close(null, w.id);
                        }
                    }
                ],
                content: DOM.encode(self.editor.getLang(txt, txt))
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
            var w = this.windows[id];
        },

        moveTo: function(id, x, y) {
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
            var self = this, w;

            if (w = self.windows[id]) {
                w.zIndex = this.zIndex++;
                DOM.setStyle(id, 'zIndex', w.zIndex);

                DOM.removeClass(self.lastId, 'mceFocus');
                DOM.addClass(id + '_frame', 'mceFocus');

                self.lastId = id + '_frame';

                DOM.get(id).focus();

                if (DOM.get(id + '_ifr')) {
                    DOM.get(id + '_ifr').focus();
                } else {
                    var nodes = DOM.select('input, select, button, textarea', DOM.get(id));

                    nodes = tinymce.grep(nodes, function(node) {
                        return node.getAttribute('tabindex') >= 0;
                    });

                    if (nodes.length) {
                        nodes[0].focus();
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
                return Event.cancel(se);
            }

            updateWithTouchData(se);

            p = DOM.getRect(id);
            vp = DOM.getViewPort();

            //DOM.setStyles(id, { 'left': p.x - vp.x, 'top': p.y - vp.y });

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

            return Event.cancel(se);
        },

        // Find front most window
        _frontWindow: function () {
            var fw, ix = 0;
            // Find front most window and focus that
            each(this.windows, function (w) {
                if (w.zIndex > ix) {
                    fw = w;
                    ix = w.zIndex;
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