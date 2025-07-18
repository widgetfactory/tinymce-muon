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
  var Dispatcher = tinymce.util.Dispatcher;

  /**
	 * This class handles the undo/redo history levels for the editor. Since the build in undo/redo has major drawbacks a custom one was needed.
	 *
	 * @class tinymce.UndoManager
	 */
  tinymce.UndoManager = function (editor) {
    var um, index = 0,
      data = [],
      beforeBookmark, onBeforeAdd, onAdd, onUndo, onRedo;

    function getContent() {
      // Remove whitespace before/after and remove pure bogus nodes
      return tinymce.trim(editor.getContent({
        format: 'raw',
        no_events: 1,
        undo: true
      }));
    }

    function addNonTypingUndoLevel() {
      um.typing = false;
      um.add();
    }

    // Create event instances
    onBeforeAdd = new Dispatcher(um);
    onAdd = new Dispatcher(um);
    onUndo = new Dispatcher(um);
    onRedo = new Dispatcher(um);

    // Pass though onAdd event from um to Editor as onChange
    onAdd.add(function (undoman, level) {
      if (undoman.hasUndo()) {
        return editor.onChange.dispatch(editor, level, undoman);
      }
    });

    // Pass though onUndo event from um to Editor
    onUndo.add(function (undoman, level) {
      return editor.onUndo.dispatch(editor, level, undoman);
    });

    // Pass though onRedo event from um to Editor
    onRedo.add(function (undoman, level) {
      return editor.onRedo.dispatch(editor, level, undoman);
    });

    // Add initial undo level when the editor is initialized
    editor.onInit.add(function () {
      um.add();
    });

    // Get position before an execCommand is processed
    editor.onBeforeExecCommand.add(function (ed, cmd, ui, val, args) {
      if (cmd != 'Undo' && cmd != 'Redo' && cmd != 'mceRepaint' && (!args || !args.skip_undo)) {
        um.beforeChange();
      }
    });

    // Add undo level after an execCommand call was made
    editor.onExecCommand.add(function (ed, cmd, ui, val, args) {
      if (cmd != 'Undo' && cmd != 'Redo' && cmd != 'mceRepaint' && (!args || !args.skip_undo)) {
        um.add();
      }
    });

    // Add undo level on save contents, drag end and blur/focusout
    editor.onSaveContent.add(addNonTypingUndoLevel);
    editor.dom.bind(editor.dom.getRoot(), 'dragend', addNonTypingUndoLevel);
    editor.dom.bind(editor.getBody(), 'focusout', function () {
      if (!editor.removed && um.typing) {
        addNonTypingUndoLevel();
      }
    });

    editor.onKeyUp.add(function (editor, e) {
      var keyCode = e.keyCode;

      // If key is prevented then don't add undo level
      // This would happen on keyboard shortcuts for example
      if (e.isDefaultPrevented()) {
        return;
      }

      if ((keyCode >= 33 && keyCode <= 36) || (keyCode >= 37 && keyCode <= 40) || keyCode == 45 || keyCode == 13 || e.ctrlKey) {
        addNonTypingUndoLevel();
      }
    });

    editor.onKeyDown.add(function (editor, e) {
      var keyCode = e.keyCode;

      // If key is prevented then don't add undo level
      // This would happen on keyboard shortcuts for example
      if (e.isDefaultPrevented()) {
        return;
      }

      // Is caracter positon keys left,right,up,down,home,end,pgdown,pgup,enter
      if ((keyCode >= 33 && keyCode <= 36) || (keyCode >= 37 && keyCode <= 40) || keyCode == 45) {
        if (um.typing) {
          addNonTypingUndoLevel();
        }

        return;
      }

      // If key isn't Ctrl+Alt/AltGr
      var modKey = (e.ctrlKey && !e.altKey) || e.metaKey;
      if ((keyCode < 16 || keyCode > 20) && keyCode !== 224 && keyCode !== 91 && !um.typing && !modKey) {
        um.beforeChange();
        um.typing = true;
        um.add();
      }
    });

    editor.onMouseDown.add(function () {
      if (um.typing) {
        addNonTypingUndoLevel();
      }
    });

    // Add keyboard shortcuts for undo/redo keys
    editor.addShortcut('meta+z', '', 'Undo');
    editor.addShortcut('meta+y,meta+shift+z', '', 'Redo');

    um = {
      // Explose for debugging reasons
      data: data,

      /**
			 * State if the user is currently typing or not. This will add a typing operation into one undo
			 * level instead of one new level for each keystroke.
			 *
			 * @field {Boolean} typing
			 */
      typing: false,

      /**
			 * This event will fire before a new undo level is added to the undo manager
			 *
			 * @event onBeforeAdd
			 * @param {tinymce.um} sender um instance that is going to add the new level
			 * @param {Object} level The new level object containing a bookmark and contents
			 */
      onBeforeAdd: onBeforeAdd,

      /**
			 * This event will fire each time a new undo level is added to the undo manager.
			 *
			 * @event onAdd
			 * @param {tinymce.um} sender um instance that got the new level.
			 * @param {Object} level The new level object containing a bookmark and contents.
			 */
      onAdd: onAdd,

      /**
			 * This event will fire when the user make an undo of a change.
			 *
			 * @event onUndo
			 * @param {tinymce.um} sender um instance that got the new level.
			 * @param {Object} level The old level object containing a bookmark and contents.
			 */
      onUndo: onUndo,

      /**
			 * This event will fire when the user make an redo of a change.
			 *
			 * @event onRedo
			 * @param {tinymce.um} sender um instance that got the new level.
			 * @param {Object} level The old level object containing a bookmark and contents.
			 */
      onRedo: onRedo,

      /**
			 * Stores away a bookmark to be used when performing an undo action so that the selection is before
			 * the change has been made.
			 *
			 * @method beforeChange
			 */
      beforeChange: function () {
        beforeBookmark = editor.selection.getBookmark(2, true);
      },

      /**
			 * Adds a new undo level/snapshot to the undo list.
			 *
			 * @method add
			 * @param {Object} l Optional undo level object to add.
			 * @return {Object} Undo level that got added or null it a level wasn't needed.
			 */
      add: function (level) {
        var i, settings = editor.settings,
          lastLevel;

        level = level || {};
        level.content = getContent();

        um.onBeforeAdd.dispatch(um, level);

        // Add undo level if needed
        lastLevel = data[index];

        if (lastLevel && lastLevel.content == level.content) {          
          return null;
        }

        // Set before bookmark on previous level
        if (data[index]) {
          data[index].beforeBookmark = beforeBookmark;
        }

        // Time to compress
        if (settings.custom_undo_redo_levels) {
          if (data.length > settings.custom_undo_redo_levels) {

            for (i = 0; i < data.length - 1; i++) {
              data[i] = data[i + 1];
            }

            data.length--;
            index = data.length;
          }
        }

        // Get a non intrusive normalized bookmark
        level.bookmark = editor.selection.getBookmark(2, true);

        // Crop array if needed
        if (index < data.length - 1) {
          data.length = index + 1;
        }

        data.push(level);
        index = data.length - 1;

        um.onAdd.dispatch(um, level);
        editor.isNotDirty = 0;

        return level;
      },

      /**
			 * Undoes the last action.
			 *
			 * @method undo
			 * @return {Object} Undo level or null if no undo was performed.
			 */
      undo: function () {
        var level;

        if (um.typing) {
          um.add();
          um.typing = false;
        }

        if (index > 0) {
          level = data[--index];

          editor.setContent(level.content, {
            format: 'raw',
            undo: true
          });

          editor.selection.moveToBookmark(level.beforeBookmark);

          um.onUndo.dispatch(um, level);
        }

        return level;
      },

      /**
			 * Redoes the last action.
			 *
			 * @method redo
			 * @return {Object} Redo level or null if no redo was performed.
			 */
      redo: function () {
        var level;

        if (index < data.length - 1) {
          level = data[++index];

          editor.setContent(level.content, {
            format: 'raw',
            undo: true
          });

          editor.selection.moveToBookmark(level.bookmark);

          um.onRedo.dispatch(um, level);
        }

        return level;
      },

      /**
			 * Removes all undo levels.
			 *
			 * @method clear
			 */
      clear: function () {
        data = [];
        index = 0;
        um.typing = false;
      },

      /**
			 * Returns true/false if the undo manager has any undo levels.
			 *
			 * @method hasUndo
			 * @return {Boolean} true/false if the undo manager has any undo levels.
			 */
      hasUndo: function () {
        return index > 0 || this.typing;
      },

      /**
			 * Returns true/false if the undo manager has any redo levels.
			 *
			 * @method hasRedo
			 * @return {Boolean} true/false if the undo manager has any redo levels.
			 */
      hasRedo: function () {
        return index < data.length - 1 && !this.typing;
      }
    };

    return um;
  };
})(tinymce);