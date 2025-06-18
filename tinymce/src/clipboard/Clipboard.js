/**
 * Originally part of TinyMCE 4.x
 * Copyright (c) 1999-2015 Ephox Corp. All rights reserved
 * Licensed under LGPL-2.1-or-later (see LICENSE.TXT in the original project)
 *
 * This version:
 * Copyright (c) 2025 Ryan Demmer
 * Relicensed under GPL-2.0-or-later as permitted by Section 3 of the LGPL.
 *
 * See LICENSE for GPL terms.
 */

import * as CutCopy from './CutCopy';
import * as Quirks from './Quirks';
import * as Process from './Process.js';
import * as DragDrop from './DragDrop';
import { PasteBin } from './PasteBin';
import * as Paste from './Paste.js';

var Dispatcher = tinymce.util.Dispatcher;

tinymce.Clipboard = function (editor) {
    var pasteBin = new PasteBin(editor);

    editor.onGetClipboardContent = new Dispatcher(this);
    editor.onPastePreProcess = new Dispatcher(this);
    editor.onPastePostProcess = new Dispatcher(this);
    editor.onPasteBeforeInsert = new Dispatcher(this);

    Quirks.setup(editor);

    Process.setup(editor);
  
    // IMPORTANT: The following event hooks need to be setup later so that other things
    // can hook in and prevent the event so core paste doesn't handle them.
    editor.onPreInit.add(function () {
      CutCopy.register(editor);
      DragDrop.setup(editor);
      Paste.setup(editor, pasteBin);
    });
};
