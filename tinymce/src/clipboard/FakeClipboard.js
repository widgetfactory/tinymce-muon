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

import * as InternalHtml from './InternalHtml.js';

const internalHtmlMimeType = InternalHtml.internalHtmlMime();

var clipboardData = {
    'text/html': '',
    'text/plain': ''
};

clipboardData[internalHtmlMimeType] = '';

function hasData() {
    return !!clipboardData['text/html'] || !!clipboardData['text/plain'] || !!clipboardData[internalHtmlMimeType];
}

function getData(mimetype) {
    if (mimetype) {
        return clipboardData[mimetype] || '';
    }
    
    return clipboardData;
}

function setData(mimetype, content) {
    clipboardData[mimetype] = content;
}

function clearData() {
    clipboardData = {
        'text/html': '',
        'text/plain': ''
    };

    clipboardData[internalHtmlMimeType] = '';
}

export {
    hasData,
    getData,
    setData,
    clearData
};