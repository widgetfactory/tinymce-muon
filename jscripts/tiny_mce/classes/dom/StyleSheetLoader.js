/**
 * StyleSheetLoader.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

/*eslint no-console:1 */

(function (tinymce) {
	/**
	 * This class handles asynchronous/synchronous loading of stylesheet files it will execute callbacks when various items gets loaded. This class is useful to load external stylesheet files.
	 *
	 * @class tinymce.dom.StyleSheetLoader
	 * @example
	 * // Load a stylesheet from a specific URL using the global stylesheet loader
	 * tinymce.StyleSheetLoader.load('somestylesheet.js');
	 *
	 * // Load a stylesheet using a unique instance of the stylesheet loader
	 * var StyleSheetLoader = new tinymce.dom.StyleSheetLoader();
	 *
	 * StyleSheetLoader.load('somestylesheet.js');
	 *
	 * // Load multiple stylesheets
	 * var StyleSheetLoader = new tinymce.dom.StyleSheetLoader();
	 *
	 * StyleSheetLoader.add('somestylesheet1.js');
	 * StyleSheetLoader.add('somestylesheet2.js');
	 * StyleSheetLoader.add('somestylesheet3.js');
	 *
	 * StyleSheetLoader.loadQueue(function() {
	 *    alert('All stylesheets are now loaded.');
	 * });
	 */
	tinymce.dom.StyleSheetLoader = function (document) {
		var QUEUED = 0,
			LOADING = 1,
			LOADED = 2,
			states = {},
			queue = [],
			stylesheetLoadedCallbacks = {},
			queueLoadedCallbacks = [],
			loading = 0,
			undef,
			maxLoadTime = 5000;

		/**
		 * Loads a specific stylesheet directly without adding it to the load queue.
		 *
		 * @method load
		 * @param {String} url Absolute URL to stylesheet to add.
		 * @param {function} callback Optional callback function to execute ones this stylesheet gets loaded.
		 * @param {Object} scope Optional scope to execute callback in.
		 */
		function loadStylesheet(url, callback) {
			var dom = tinymce.DOM,
				elm, id, startTime, complete;

			// Execute callback when stylesheet is loaded
			function done() {
				if (complete) {
					return;
				}

				complete = true;
				
				if (elm) {
					elm.onreadystatechange = elm.onload = elm = null;
				}

				callback();
			}

			function error() {				
				// Report the error so it's easier for people to spot loading errors
				if (typeof (console) !== "undefined" && console.log) {
					console.log("Failed to load: " + url);
				}

				// We can't mark it as done if there is a load error since
				// A) We don't want to produce 404 errors on the server and
				// B) the onerror event won't fire on all browsers.
				done();
			}

			// Calls the waitCallback until the test returns true or the timeout occurs
			function wait(testCallback, waitCallback) {
				if (!testCallback()) {
					// Wait for timeout
					if ((new Date().getTime()) - startTime < maxLoadTime) {
						setTimeout(waitCallback);
					} else {
						error();
					}
				}
			}

			function waitForLoaded() {
				wait(function () {
					var styleSheets = document.styleSheets,
						styleSheet, i = styleSheets.length,
						owner;

					while (i--) {
						styleSheet = styleSheets[i];

						owner = styleSheet.ownerNode ? styleSheet.ownerNode : styleSheet.owningElement;
						if (owner && owner.id === elm.id) {
							done();
							return true;
						}
					}
				}, waitForLoaded);
			}

			id = dom.uniqueId();

			// Create new link element
			elm = document.createElement('link');
			elm.rel = 'stylesheet';
			elm.type = 'text/css';
			elm.href = tinymce._addVer(url);
			elm.async = false;
			elm.defer = false;

			startTime = new Date().getTime();

			// prevent cloudflare rocket-loader caching
			elm.setAttribute('data-cfasync', false);
			elm.id = id;

			// Add onload listener
			elm.onload = waitForLoaded;

			// Add onerror event will get fired on some browsers but not all of them
			elm.onerror = error;

			elm.onreadystatechange = function () {
				var state = elm.readyState;

				// Loaded state is passed on IE 6 however there
				// are known issues with this method but we can't use
				// XHR in a cross domain loading
				if (state == 'complete' || state == 'loaded') {
					waitForLoaded();
				}
			};

			// Add stylesheet to document
			(document.getElementsByTagName('head')[0] || document.body).appendChild(elm);
		}

		/**
		 * Returns true/false if a stylesheet has been loaded or not.
		 *
		 * @method isDone
		 * @param {String} url URL to check for.
		 * @return [Boolean} true/false if the URL is loaded.
		 */
		this.isDone = function (url) {
			return states[url] == LOADED;
		};

		/**
		 * Marks a specific stylesheet to be loaded. This can be useful if a stylesheet got loaded outside
		 * the stylesheet loader or to skip it from loading some stylesheet.
		 *
		 * @method markDone
		 * @param {string} u Absolute URL to the stylesheet to mark as loaded.
		 */
		this.markDone = function (url) {
			states[url] = LOADED;
		};

		/**
		 * Adds a specific stylesheet to the load queue of the stylesheet loader.
		 *
		 * @method add
		 * @param {String} url Absolute URL to stylesheet to add.
		 * @param {function} callback Optional callback function to execute ones this stylesheet gets loaded.
		 * @param {Object} scope Optional scope to execute callback in.
		 */
		this.add = this.load = function (url, callback, scope) {
			var state = states[url];

			// Add url to load queue
			if (state == undef) {
				queue.push(url);
				states[url] = QUEUED;
			}

			if (callback) {
				// Store away callback for later execution
				if (!stylesheetLoadedCallbacks[url]) {
					stylesheetLoadedCallbacks[url] = [];
				}

				stylesheetLoadedCallbacks[url].push({
					func: callback,
					scope: scope || this
				});
			}
		};

		/**
		 * Starts the loading of the queue.
		 *
		 * @method loadQueue
		 * @param {function} callback Optional callback to execute when all queued items are loaded.
		 * @param {Object} scope Optional scope to execute the callback in.
		 */
		this.loadQueue = function (callback, scope) {
			this.loadStylesheets(queue, callback, scope);
		};

		/**
		 * Loads the specified queue of files and executes the callback ones they are loaded.
		 * This method is generally not used outside this class but it might be useful in some scenarios.
		 *
		 * @method loadStylesheets
		 * @param {Array} stylesheets Array of queue items to load.
		 * @param {function} callback Optional callback to execute ones all items are loaded.
		 * @param {Object} scope Optional scope to execute callback in.
		 */
		this.loadStylesheets = function (stylesheets, callback, scope) {
			var loadStylesheets;

			function execstylesheetLoadedCallbacks(url) {
				// Execute URL callback functions
				tinymce.each(stylesheetLoadedCallbacks[url], function (callback) {
					callback.func.call(callback.scope);
				});

				stylesheetLoadedCallbacks[url] = undef;
			}

			queueLoadedCallbacks.push({
				func: callback,
				scope: scope || this
			});

			loadStylesheets = function () {
				var loadingstylesheets = tinymce.grep(stylesheets);

				// Current stylesheets has been handled
				stylesheets.length = 0;

				// Load stylesheets that needs to be loaded
				tinymce.each(loadingstylesheets, function (url) {
					// stylesheet is already loaded then execute stylesheet callbacks directly
					if (states[url] == LOADED) {
						execstylesheetLoadedCallbacks(url);
						return;
					}

					// Is stylesheet not loading then start loading it
					if (states[url] != LOADING) {
						states[url] = LOADING;
						loading++;

						loadStylesheet(url, function () {
							states[url] = LOADED;
							loading--;

							execstylesheetLoadedCallbacks(url);

							// Load more stylesheets if they where added by the recently loaded stylesheet
							loadStylesheets();
						});
					}
				});

				// No stylesheets are currently loading then execute all pending queue loaded callbacks
				if (!loading) {
					tinymce.each(queueLoadedCallbacks, function (callback) {
						callback.func.call(callback.scope);
					});

					queueLoadedCallbacks.length = 0;
				}
			};

			loadStylesheets();
		};

		this.loadStylesheet = loadStylesheet;
	};

	// Global stylesheet loader
	tinymce.StyleSheetLoader = new tinymce.dom.StyleSheetLoader();
})(tinymce);