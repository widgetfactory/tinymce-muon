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