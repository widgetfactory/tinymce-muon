/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

(function (tinymce) {
  var Event = tinymce.dom.Event,
    each = tinymce.each;

  /**
	 * This class provides basic keyboard navigation using the arrow keys to children of a component.
	 * For example, this class handles moving between the buttons on the toolbars.
	 *
	 * @class tinymce.ui.KeyboardNavigation
	 */
  tinymce.create('tinymce.ui.KeyboardNavigation', {
    /**
		 * Create a new KeyboardNavigation instance to handle the focus for a specific element.
		 *
		 * @constructor
		 * @method KeyboardNavigation
		 * @param {Object} settings the settings object to define how keyboard navigation works.
		 * @param {DOMUtils} dom the DOMUtils instance to use.
		 *
		 * @setting {Element/String} root the root element or ID of the root element for the control.
		 * @setting {Array} items an array containing the items to move focus between. Every object in this array must have an id attribute which maps to the actual DOM element. If the actual elements are passed without an ID then one is automatically assigned.
		 * @setting {Function} onCancel the callback for when the user presses escape or otherwise indicates cancelling.
		 * @setting {Function} onAction (optional) the action handler to call when the user activates an item.
		 * @setting {Boolean} enableLeftRight (optional, default) when true, the up/down arrows move through items.
		 * @setting {Boolean} enableUpDown (optional) when true, the up/down arrows move through items.
		 * Note for both up/down and left/right explicitly set both enableLeftRight and enableUpDown to true.
		 */
    KeyboardNavigation: function (settings, dom) {
      var self = this, root = settings.root,
        items = settings.items,
        enableUpDown = settings.enableUpDown,
        enableLeftRight = settings.enableLeftRight || !settings.enableUpDown,
        excludeFromTabOrder = settings.excludeFromTabOrder,
        itemFocussed, itemBlurred, rootKeydown, rootFocussed, focussedId;

      dom = dom || tinymce.DOM;

      itemFocussed = function (evt) {
        focussedId = evt.target.id;
      };

      itemBlurred = function (evt) {
        dom.setAttrib(evt.target.id, 'tabindex', '-1');
      };

      rootFocussed = function () {
        var item = dom.get(focussedId);
        dom.setAttrib(item, 'tabindex', '0');
        item.focus();
      };

      this.focus = function () {
        dom.get(focussedId).focus();
      };

      this.update = function (value) {
        items = value;

        each(items, function (item, idx) {
          var tabindex, elm;

          if (!item.id) {
            item.id = dom.uniqueId('_mce_item_');
          }

          elm = dom.get(item.id);

          if (excludeFromTabOrder) {
            dom.bind(elm, 'blur', itemBlurred);
            tabindex = '-1';
          } else {
            tabindex = (idx === 0 ? '0' : '-1');
          }

          elm.setAttribute('tabindex', tabindex);
          dom.bind(elm, 'focus', itemFocussed);
        });
      };

      /**
			 * Destroys the KeyboardNavigation and unbinds any focus/blur event handles it might have added.
			 *
			 * @method destroy
			 */
      this.destroy = function () {
        each(items, function (item) {
          var elm = dom.get(item.id);

          dom.unbind(elm, 'focus', itemFocussed);
          dom.unbind(elm, 'blur', itemBlurred);
        });

        var rootElm = dom.get(root);
        dom.unbind(rootElm, 'focus', rootFocussed);
        dom.unbind(rootElm, 'keydown', rootKeydown);

        items = dom = root = this.focus = itemFocussed = itemBlurred = rootKeydown = rootFocussed = null;
        this.destroy = function () {};
      };

      this.moveFocus = function (dir, evt) {
        var idx = -1,
          newFocus;

        if (!focussedId) {
          return;
        }

        each(items, function (item, index) {
          if (item.id === focussedId) {
            idx = index;
            return false;
          }
        });

        idx += dir;

        if (idx < 0) {
          idx = items.length - 1;
        } else if (idx >= items.length) {
          idx = 0;
        }

        newFocus = items[idx];
        dom.setAttrib(focussedId, 'tabindex', '-1');
        dom.setAttrib(newFocus.id, 'tabindex', '0');
        dom.get(newFocus.id).focus();

        if (settings.actOnFocus) {
          settings.onAction(newFocus.id);
        }

        if (evt) {
          Event.cancel(evt);
        }
      };

      rootKeydown = function (evt) {
        var DOM_VK_LEFT = 37,
          DOM_VK_RIGHT = 39,
          DOM_VK_UP = 38,
          DOM_VK_DOWN = 40,
          DOM_VK_ESCAPE = 27,
          DOM_VK_ENTER = 14,
          DOM_VK_RETURN = 13,
          DOM_VK_SPACE = 32;

        switch (evt.keyCode) {
          case DOM_VK_LEFT:
            if (enableLeftRight) {
              self.moveFocus(-1);
              Event.cancel(evt);
            }
            break;

          case DOM_VK_RIGHT:
            if (enableLeftRight) {
              self.moveFocus(1);
              Event.cancel(evt);
            }
            break;

          case DOM_VK_UP:
            if (enableUpDown) {
              self.moveFocus(-1);
              Event.cancel(evt);
            }
            break;

          case DOM_VK_DOWN:
            if (enableUpDown) {
              self.moveFocus(1);
              Event.cancel(evt);
            }
            break;

          case DOM_VK_ESCAPE:
            if (settings.onCancel) {
              settings.onCancel();
              Event.cancel(evt);
            }
            break;

          case DOM_VK_ENTER:
          case DOM_VK_RETURN:
          case DOM_VK_SPACE:
            if (settings.onAction) {
              Event.cancel(evt);
              settings.onAction(evt, focussedId);
            }
            break;
        }
      };

      // Set up state and listeners for each item.
      this.update(items);

      // Setup initial state for root element.
      if (items[0]) {
        focussedId = items[0].id;
      }

      dom.setAttrib(root, 'tabindex', '-1');

      // Setup listeners for root element.
      var rootElm = dom.get(root);
      dom.bind(rootElm, 'focus', rootFocussed);
      dom.bind(rootElm, 'keydown', rootKeydown);
    }
  });
})(tinymce);