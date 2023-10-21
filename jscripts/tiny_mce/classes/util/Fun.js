/**
 * Fun.js
 *
 * Released under LGPL License.
 * Copyright (c) 1999-2015 Ephox Corp. All rights reserved
 *
 * License: http://www.tinymce.com/license - Inactive
 * Licence: GNU/LGPL 2.1 or later - http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * Contributing: http://www.tinymce.com/contributing - Inactive
 */

/**
 * Functional utility class.
 *
 * @private
 * @class tinymce.util.Fun
 */
(function (tinymce) {
  var slice = [].slice;

  function constant(value) {
    return function () {
      return value;
    };
  }

  function negate(predicate) {
    return function (x) {
      return !predicate(x);
    };
  }

  function compose(f, g) {
    return function (x) {
      return f(g(x));
    };
  }

  function or() {
    var args = slice.call(arguments);

    return function (x) {
      for (var i = 0; i < args.length; i++) {
        if (args[i](x)) {
          return true;
        }
      }

      return false;
    };
  }

  function and() {
    var args = slice.call(arguments);

    return function (x) {
      for (var i = 0; i < args.length; i++) {
        if (!args[i](x)) {
          return false;
        }
      }

      return true;
    };
  }

  var curry = function (fn) {
    var args = slice.call(arguments);

    if (args.length - 1 >= fn.length) {
      return fn.apply(this, args.slice(1));
    }

    return function () {
      var tempArgs = args.concat([].slice.call(arguments));
      return curry.apply(this, tempArgs);
    };
  };

  function noop() { }

  tinymce.util.Fun = {
    constant: constant,
    negate: negate,
    and: and,
    or: or,
    curry: curry,
    compose: compose,
    noop: noop
  };
})(tinymce);