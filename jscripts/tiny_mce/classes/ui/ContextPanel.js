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

    function debounce(func, wait, immediate) {
        var timeout;
        return function () {
            var context = this,
                args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    tinymce.create('tinymce.ui.ContextPanel:tinymce.ui.Panel', {
        /**
         * Constructs a new panel container instance.
         *
         * @constructor
         * @method Panel
         * @param {String} id Control id for the panel.
         * @param {Object} s Optional name/value settings object.
         * @param {Editor} ed Optional the editor instance this button is for.
         */
        ContextPanel: function (id, s, ed) {
            this.parent(id, s, ed);

            this.settings = s = tinymce.extend({
                content: '',
                buttons: []
            }, this.settings);

            this.editor = ed;
        },

        renderPanel: function () {
            var self = this;

            this.parent();

            DOM.addClass(DOM.select('.mcePanel', DOM.get(this.id)), 'mceContextPanel');

            var scrollFunc = debounce(function () {
                if (self.isPanelVisible) {
                    self.positionPanel();
                }
            }, 60);

            self.scrollFunc = Event.add(this.editor.getWin(), 'scroll', scrollFunc);

            this.editor.onHide.add(function () {
                self.hidePanel();
            });
        },

        /**
         * Shows the panel.
         *
         * @method showPanel
         */
        showPanel: function (elm) {
            this.parent(elm);

            this.target = elm;

            this.positionPanel();
        },

        positionPanel: function () {
            var self = this, x, y;

            var panel = DOM.get(self.id);

            if (!panel) {
                return;
            }

            var elm = this.target;

            // get editor container position
            var offset = DOM.getRect(this.editor.getContentAreaContainer());

            DOM.removeClass(panel, 'mceArrowDown');

            // get position of the target element
            pos = DOM.getPos(elm);

            if (pos.y < 0) {
                self.hidePanel();
                return;
            }

            var win = this.editor.getWin();

            var sy = win.scrollY;
            var wh = sy + win.innerHeight;

            if (pos.y > wh - elm.clientHeight) {
                self.hidePanel();
                return;
            }

            DOM.show(panel);
            self.isPanelVisible = 1;

            x = pos.x + offset.x + elm.clientWidth / 2;
            y = pos.y + offset.y;

            w = panel.clientWidth;
            h = panel.clientHeight;

            // position to center of target
            x = x - w / 2;

            // add height of target and arrow
            y = y + elm.clientHeight + 10;

            if (y > offset.y + offset.h) {
                y -= (elm.clientHeight + panel.clientHeight + 10);

                DOM.addClass(panel, 'mceArrowDown');
            }

            DOM.setStyles(self.id, {
                left: x,
                top: y,
                zIndex: 200000
            });
        },

        destroy: function () {
            Event.remove(this.editor.getWin(), 'scroll', self.scrollFunc);
            this.parent();
        }
    });
})(tinymce);