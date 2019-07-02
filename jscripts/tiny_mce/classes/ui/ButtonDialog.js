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
        Dispatcher = tinymce.util.Dispatcher;

    tinymce.create('tinymce.ui.ButtonDialog:tinymce.ui.PanelButton', {
        /**
         * Constructs a new split button control instance.
         *
         * @constructor
         * @method MenuButton
         * @param {String} id Control id for the split button.
         * @param {Object} s Optional name/value settings object.
         * @param {Editor} ed Optional the editor instance this button is for.
         */
        ButtonDialog: function (id, s, ed) {
            if (s.content) {
                s.html = s.content;
            }

            if (s.buttons) {
                tinymce.each(s.buttons, function (btn) {
                    btn.onclick = btn.click || function(){};
                });
            }

            this.onShowDialog = new Dispatcher(this);
            this.onHideDialog = new Dispatcher(this);
            
            this.parent(id, s, ed);
        },

        showDialog: function () {
            this.showPanel();
            this.onShowDialog.dispatch(this);
        },

        /**
         * Hides the menu. The optional event parameter is used to check where the event occured so it
         * doesn't close them menu if it was a event inside the menu.
         *
         * @method hideMenu
         * @param {Event} e Optional event object.
         */
        hideDialog: function (e) {
            this.hidePanel(e);
            this.onHideDialog.dispatch(this);
        }
    });
})(tinymce);