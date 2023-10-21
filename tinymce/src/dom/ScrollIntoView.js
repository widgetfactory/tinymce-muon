/**
 * ScrollIntoView.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2017 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license - Inactive
 * Licence: GNU/LGPL 2.1 or later - http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * Contributing: http://www.tinymce.com/contributing - Inactive
 */


(function (tinymce) {

  var NodeType = tinymce.dom.NodeType, Dispatcher = tinymce.util.Dispatcher;

  var getPos = function (elm) {
    var x = 0,
      y = 0;

    var offsetParent = elm;
    while (offsetParent && offsetParent.nodeType) {
      x += offsetParent.offsetLeft || 0;
      y += offsetParent.offsetTop || 0;
      offsetParent = offsetParent.offsetParent;
    }

    return {
      x: x,
      y: y
    };
  };

  var fireScrollIntoViewEvent = function (editor, elm, alignToTop) {
    var scrollEvent = {
      elm: elm,
      alignToTop: alignToTop,
      cancel: false
    };

    editor.onScrollIntoView.dispatch(editor, scrollEvent);

    return scrollEvent.cancel === true;
  };

  tinymce.dom.ScrollIntoView = function (editor, elm, alignToTop) {
    var y, viewPort, dom = editor.dom,
      root = dom.getRoot(),
      viewPortY, viewPortH, offsetY = 0;

    editor.onScrollIntoView = new Dispatcher();

    if (fireScrollIntoViewEvent(editor, elm, alignToTop)) {
      return;
    }

    if (!NodeType.isElement(elm)) {
      return;
    }

    if (alignToTop === false) {
      offsetY = elm.offsetHeight;
    }

    if (root.nodeName !== 'BODY') {
      var scrollContainer = editor.selection.getScrollContainer();
      if (scrollContainer) {
        y = getPos(elm).y - getPos(scrollContainer).y + offsetY;
        viewPortH = scrollContainer.clientHeight;
        viewPortY = scrollContainer.scrollTop;
        if (y < viewPortY || y + 25 > viewPortY + viewPortH) {
          scrollContainer.scrollTop = y < viewPortY ? y : y - viewPortH + 25;
        }

        return;
      }
    }

    viewPort = dom.getViewPort(editor.getWin());
    y = dom.getPos(elm).y + offsetY;
    viewPortY = viewPort.y;
    viewPortH = viewPort.h;
    if (y < viewPort.y || y + 25 > viewPortY + viewPortH) {
      editor.getWin().scrollTo(0, y < viewPortY ? y : y - viewPortH + 25);
    }
  };

})(tinymce);