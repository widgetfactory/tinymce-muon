/**
 * Copyright (c) Moxiecode Systems AB. All rights reserved.
 * Copyright (c) 1999–2015 Ephox Corp. All rights reserved.
 * Copyright (c) 2009–2025 Ryan Demmer. All rights reserved.
 * @note    Forked or includes code from TinyMCE 3.x/4.x/5.x (originally under LGPL 2.1) and relicensed under GPL v2+ per LGPL 2.1 § 3.
 *
 * Licensed under the GNU General Public License version 2 or later (GPL v2+):
 * https://www.gnu.org/licenses/gpl-2.0.html
 */

/**
 * Utility class for working with delayed actions like setTimeout.
 *
 * @class tinymce.util.Delay
 */
(function (tinymce) {
	var requestAnimationFramePromise;

	function requestAnimationFrame(callback, element) {
		var i, requestAnimationFrameFunc = window.requestAnimationFrame,
			vendors = ['ms', 'moz', 'webkit'];

		function featurefill(callback) {
			window.setTimeout(callback, 0);
		}

		for (i = 0; i < vendors.length && !requestAnimationFrameFunc; i++) {
			requestAnimationFrameFunc = window[vendors[i] + 'RequestAnimationFrame'];
		}

		if (!requestAnimationFrameFunc) {
			requestAnimationFrameFunc = featurefill;
		}

		requestAnimationFrameFunc(callback, element);
	}

	function wrappedSetTimeout(callback, time) {
		if (typeof time != 'number') {
			time = 0;
		}

		return setTimeout(callback, time);
	}

	function wrappedSetInterval(callback, time) {
		if (typeof time != 'number') {
			time = 1; // IE 8 needs it to be > 0
		}

		return setInterval(callback, time);
	}

	function wrappedClearTimeout(id) {
		return clearTimeout(id);
	}

	function wrappedClearInterval(id) {
		return clearInterval(id);
	}

	function debounce(callback, time) {
		var timer, func;

		func = function () {
			var args = arguments;

			clearTimeout(timer);

			timer = wrappedSetTimeout(function () {
				callback.apply(this, args);
			}, time);
		};

		func.stop = function () {
			clearTimeout(timer);
		};

		return func;
	}

	tinymce.util.Delay = {
		/**
		 * Requests an animation frame and fallbacks to a timeout on older browsers.
		 *
		 * @method requestAnimationFrame
		 * @param {function} callback Callback to execute when a new frame is available.
		 * @param {DOMElement} element Optional element to scope it to.
		 */
		requestAnimationFrame: function (callback, element) {
			if (requestAnimationFramePromise) {
				requestAnimationFramePromise.then(callback);
				return;
			}

			requestAnimationFramePromise = new Promise(function (resolve) {
				if (!element) {
					element = document.body;
				}

				requestAnimationFrame(resolve, element);
			}).then(callback);
		},

		/**
		 * Sets a timer in ms and executes the specified callback when the timer runs out.
		 *
		 * @method setTimeout
		 * @param {function} callback Callback to execute when timer runs out.
		 * @param {Number} time Optional time to wait before the callback is executed, defaults to 0.
		 * @return {Number} Timeout id number.
		 */
		setTimeout: wrappedSetTimeout,

		/**
		 * Sets an interval timer in ms and executes the specified callback at every interval of that time.
		 *
		 * @method setInterval
		 * @param {function} callback Callback to execute when interval time runs out.
		 * @param {Number} time Optional time to wait before the callback is executed, defaults to 0.
		 * @return {Number} Timeout id number.
		 */
		setInterval: wrappedSetInterval,

		/**
		 * Sets an editor timeout it's similar to setTimeout except that it checks if the editor instance is
		 * still alive when the callback gets executed.
		 *
		 * @method setEditorTimeout
		 * @param {tinymce.Editor} editor Editor instance to check the removed state on.
		 * @param {function} callback Callback to execute when timer runs out.
		 * @param {Number} time Optional time to wait before the callback is executed, defaults to 0.
		 * @return {Number} Timeout id number.
		 */
		setEditorTimeout: function (editor, callback, time) {
			return wrappedSetTimeout(function () {
				if (!editor.removed) {
					callback();
				}
			}, time);
		},

		/**
		 * Sets an interval timer it's similar to setInterval except that it checks if the editor instance is
		 * still alive when the callback gets executed.
		 *
		 * @method setEditorInterval
		 * @param {function} callback Callback to execute when interval time runs out.
		 * @param {Number} time Optional time to wait before the callback is executed, defaults to 0.
		 * @return {Number} Timeout id number.
		 */
		setEditorInterval: function (editor, callback, time) {
			var timer;

			timer = wrappedSetInterval(function () {
				if (!editor.removed) {
					callback();
				} else {
					clearInterval(timer);
				}
			}, time);

			return timer;
		},

		/**
		 * Creates debounced callback function that only gets executed once within the specified time.
		 *
		 * @method debounce
		 * @param {function} callback Callback to execute when timer finishes.
		 * @param {Number} time Optional time to wait before the callback is executed, defaults to 0.
		 * @return {Function} debounced function callback.
		 */
		debounce: debounce,

		// Throttle needs to be debounce due to backwards compatibility.
		throttle: debounce,

		/**
		 * Clears an interval timer so it won't execute.
		 *
		 * @method clearInterval
		 * @param {Number} Interval timer id number.
		 */
		clearInterval: wrappedClearInterval,

		/**
		 * Clears an timeout timer so it won't execute.
		 *
		 * @method clearTimeout
		 * @param {Number} Timeout timer id number.
		 */
		clearTimeout: wrappedClearTimeout
	};
})(tinymce);