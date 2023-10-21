/**
 * EditorFocus.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2017 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license - Inactive
 * Licence: GNU/LGPL 2.1 or later - http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * Contributing: http://www.tinymce.com/contributing - Inactive
 */


(function (tinymce) {

  var getContentEditableHost = function (editor, node) {
    return editor.dom.getParent(node, function (node) {
      return editor.dom.getContentEditable(node) === "true";
    });
  };

  var normalizeSelection = function (editor) {
    editor.selection.normalize();
  };

  var focusBody = function (body) {
    if (body.setActive) {
      // IE 11 sometimes throws "Invalid function" then fallback to focus
      // setActive is better since it doesn't scroll to the element being focused
      try {
        body.setActive();
      } catch (ex) {
        body.focus();
      }
    } else {
      body.focus();
    }
  };
  /*eslint no-unused-vars:0*/
  var focusEditor = function (editor) {
    var controlElm, contentEditableHost, rng, doc = editor.getDoc(),
      body = editor.getBody(),
      contentEditable = editor.settings.content_editable,
      selection = editor.selection;

    // Get selected control element
    rng = selection.getRng();

    if (rng.item) {
      controlElm = rng.item(0);
    }

    // Move focus to contentEditable=true child if needed
    contentEditableHost = getContentEditableHost(editor, selection.getNode());

    if (editor.dom.contains(body, contentEditableHost)) {
      focusBody(contentEditableHost);
      normalizeSelection(editor, rng);
      activateEditor(editor);
      return;
    }

    // Focus the window iframe
    if (!contentEditable) {
      // WebKit needs this call to fire focusin event properly see #5948
      editor.getWin().focus();
    }

    // Focus the body as well since it's contentEditable
    if (tinymce.isGecko || contentEditable) {
      // Restore previous selection before focus to prevent Chrome from
      // jumping to the top of the document in long inline editors
      if (contentEditable && document.activeElement !== body) {
        editor.selection.setRng(editor.lastRng);
      }

      focusBody(body);
      normalizeSelection(editor, rng);
    }

    // Restore selected control element
    // This is needed when for example an image is selected within a
    // layer a call to focus will then remove the control selection
    // This appears to cause an issue with Chrome etc. with image selection in a contenteditable=false parent
    /*if (controlElm && controlElm.ownerDocument == doc) {
      rng = doc.body.createControlRange();
      rng.addElement(controlElm);
      rng.select();
    }*/
  };

  var activateEditor = function (editor) {
    tinymce.setActive(editor);
  };

  var focus = function (editor, skipFocus) {
    if (editor.removed) {
      return;
    }

    skipFocus ? activateEditor(editor) : focusEditor(editor);
  };

  tinymce.EditorFocus = {
    focus: focus
  };

})(tinymce);