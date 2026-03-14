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
  // Shorten class names
  var dom = tinymce.DOM,
    Event = tinymce.dom.Event;

  /**
   * This class is used to create layouts. A layout is a container for other controls like buttons etc.
   *
   * @class tinymce.ui.TabPanel
   * @extends tinymce.ui.Container
   */
  tinymce.create('tinymce.ui.TabPanel:tinymce.ui.Container', {
    /**
     * Base contrustor a new container control instance.
     *
     * @constructor
     * @method Container
     * @param {String} id Control id to use for the container.
     * @param {Object} settings Optional name/value settings object.
     */
    TabPanel: function (id, settings, editor) {
      settings = settings || {};

      this._super(id, settings, editor);

      /**
       * Array of items added to the tab panel.
       *
       * @property items
       * @type Array
       */
      this.items = [];
    },
    /**
       * Renders the tab panel as a HTML string.
       *
       * @method renderHTML
       * @return {String} HTML for the tab panel control.
       */
    renderHTML: function () {
      var self = this, html = '';

      if (this.items.length > 1) {
        html += '<ul class="mceTabs" role="tablist">';

        for (var i = 0; i < this.items.length; i++) {
          var tab = this.items[i];
          html += '<li id="' + self.id + '_tab_' + i + '" role="tab" aria-selected="' + (i === 0 ? 'true' : 'false') + '" aria-controls="' + self.id + '_panel_' + i + '">' + tab.title + '</li>';
        }

        html += '</ul>';
      }

      html += '<div class="mceTabPanels">';

      for (var i = 0; i < this.items.length; i++) {
        var tab = this.items[i], items = tab.items || [];

        html += '<div id="' + self.id + '_panel_' + i + '" class="mceTab" role="tabpanel"' + (i === 0 ? '' : ' style="display:none"') + '>';

        for (var x = 0; x < items.length; x++) {
          html += items[x].renderHTML();
        }

        html += '</div>';
      }

      html += '</div>';

      return dom.createHTML('div', {
        id: this.id,
        'class': 'mceTabPanel' + (this.settings['class'] ? ' ' + this.settings['class'] : '')
      }, html);
    },

    _activateTab: function (index) {
      var i, tabEl, panelEl;

      for (i = 0; i < this.items.length; i++) {
        tabEl = dom.get(this.id + '_tab_' + i);
        panelEl = dom.get(this.id + '_panel_' + i);

        if (!panelEl) {
          continue;
        }

        if (i === index) {
          dom.addClass(tabEl, 'mceActive');
          dom.setAttrib(tabEl, 'aria-selected', 'true');
          panelEl.style.display = '';
        } else {
          dom.removeClass(tabEl, 'mceActive');
          dom.setAttrib(tabEl, 'aria-selected', 'false');
          panelEl.style.display = 'none';
        }
      }
    },

    add: function (item) {
      this.items.push(item);
    },

    submit: function () {
      var data = {};

      for (var i = 0; i < this.items.length; i++) {
        var tab = this.items[i], items = tab.items || [];

        for (var x = 0; x < items.length; x++) {
          var values = items[x].submit();

          for (var key in values) {
            // eslint-disable-next-line no-prototype-builtins
            if (values.hasOwnProperty(key)) {
              data[key] = values[key];
            }
          }
        }
      }

      return data;
    },

    update: function (data) {
      for (var i = 0; i < this.items.length; i++) {
        var tab = this.items[i], items = tab.items || [];

        for (var x = 0; x < items.length; x++) {
          items[x].update(data);
        }
      }
    },

    postRender: function () {
      var self = this, i;

      this._super();

      for (i = 0; i < this.items.length; i++) {
        var tab = this.items[i], items = tab.items || [];

        for (var x = 0; x < items.length; x++) {
          items[x].postRender();
        }
      }

      this._activateTab(0);

      for (i = 0; i < this.items.length; i++) {
        (function (index) {
          Event.add(self.id + '_tab_' + index, 'click', function (e) {
            Event.cancel(e);
            self._activateTab(index);
          });
        })(i);
      }
    }
  });
})(tinymce);