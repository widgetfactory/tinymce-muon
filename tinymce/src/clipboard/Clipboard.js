/**
 * @package   	JCE
 * @copyright 	Copyright (c) 2009-2022 Ryan Demmer. All rights reserved.
 * @copyright   Copyright (c) 1999-2017 Ephox Corp. All rights reserved
 * @license   	GNU/LGPL 2.1 or later - http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * JCE is free software. This version may have been modified pursuant
 * to the GNU General Public License, and as distributed it includes or
 * is derivative of works licensed under the GNU General Public License or
 * other free or open source software licenses.
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
