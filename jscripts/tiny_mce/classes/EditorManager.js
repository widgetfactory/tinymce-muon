/**
 * EditorManager.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

(function (tinymce) {
	/**
	 * @class tinymce
	 */

	// Shorten names
	var each = tinymce.each,
		extend = tinymce.extend,
		DOM = tinymce.DOM,
		Event = tinymce.dom.Event,
		explode = tinymce.explode,
		Dispatcher = tinymce.util.Dispatcher,
		undef, instanceCounter = 0;

	// Setup some URLs where the editor API is located and where the document is
	tinymce.documentBaseURL = window.location.href.replace(/[\?#].*$/, '').replace(/[\/\\][^\/]+$/, '');
	if (!/[\/\\]$/.test(tinymce.documentBaseURL)) {
		tinymce.documentBaseURL += '/';
	}

	tinymce.baseURL = new tinymce.util.URI(tinymce.documentBaseURL).toAbsolute(tinymce.baseURL);

	/**
	 * Absolute baseURI for the installation path of TinyMCE.
	 *
	 * @property baseURI
	 * @type tinymce.util.URI
	 */
	tinymce.baseURI = new tinymce.util.URI(tinymce.baseURL);

	// Add before unload listener
	// This was required since IE was leaking memory if you added and removed beforeunload listeners
	// with attachEvent/detatchEvent so this only adds one listener and instances can the attach to the onBeforeUnload event
	tinymce.onBeforeUnload = new Dispatcher(tinymce);

	// Must be on window or IE will leak if the editor is placed in frame or iframe
	Event.add(window, 'beforeunload', function (e) {
		tinymce.onBeforeUnload.dispatch(tinymce, e);
	});

	function removeEditorFromList(targetEditor) {
		var EditorManager = tinymce.EditorManager, editors = EditorManager.editors, oldEditors = editors;

		editors = tinymce.grep(editors, function (editor) {
			return targetEditor !== editor;
		});

		// Select another editor since the active one was removed
		if (EditorManager.activeEditor === targetEditor) {
			EditorManager.activeEditor = editors.length > 0 ? editors[0] : null;
		}

		// Clear focusedEditor if necessary, so that we don't try to blur the destroyed editor
		if (EditorManager.focusedEditor === targetEditor) {
			EditorManager.focusedEditor = null;
		}

		return oldEditors.length !== editors.length;
	}

	function purgeDestroyedEditor(editor) {
		// User has manually destroyed the editor lets clean up the mess
		if (editor && editor.initialized && !(editor.getContainer() || editor.getBody()).parentNode) {
			removeEditorFromList(editor);
			editor.remove();
			editor = null;
		}

		return editor;
	}

	/**
	 * Fires when a new editor instance is added to the tinymce collection.
	 *
	 * @event onAddEditor
	 * @param {tinymce} sender TinyMCE root class/namespace.
	 * @param {tinymce.Editor} editor Editor instance.
	 * @example
	 * tinyMCE.execCommand("mceAddControl", false, "some_textarea");
	 * tinyMCE.onAddEditor.add(function(mgr,ed) {
	 *     console.debug('A new editor is available' + ed.id);
	 * });
	 */
	tinymce.onAddEditor = new Dispatcher(tinymce);

	/**
	 * Fires when an editor instance is removed from the tinymce collection.
	 *
	 * @event onRemoveEditor
	 * @param {tinymce} sender TinyMCE root class/namespace.
	 * @param {tinymce.Editor} editor Editor instance.
	 */
	tinymce.onRemoveEditor = new Dispatcher(tinymce);

	tinymce.EditorManager = extend(tinymce, {
		/**
		 * Collection of editor instances.
		 *
		 * @property editors
		 * @type Object
		 * @example
		 * for (edId in tinyMCE.editors)
		 *     tinyMCE.editors[edId].save();
		 */
		editors: [],

		/**
		 * Collection of language pack data.
		 *
		 * @property i18n
		 * @type Object
		 */
		i18n: {},

		/**
		 * Currently active editor instance.
		 *
		 * @property activeEditor
		 * @type tinymce.Editor
		 * @example
		 * tinyMCE.activeEditor.selection.getContent();
		 * tinymce.EditorManager.activeEditor.selection.getContent();
		 */
		activeEditor: null,

		/**
		 * Initializes a set of editors. This method will create a bunch of editors based in the input.
		 *
		 * @method init
		 * @param {Object} s Settings object to be passed to each editor instance.
		 * @example
		 * // Initializes a editor using the longer method
		 * tinymce.EditorManager.init({
		 *    some_settings : 'some value'
		 * });
		 *
		 * // Initializes a editor instance using the shorter version
		 * tinyMCE.init({
		 *    some_settings : 'some value'
		 * });
		 */
		init: function (settings) {
			var self = this,
				result;

			function createId(elm) {
				var id = elm.id;

				// Use element id, or unique name or generate a unique id
				if (!id) {
					id = elm.name;

					if (id && !DOM.get(id)) {
						id = elm.name;
					} else {
						// Generate unique name
						id = DOM.uniqueId();
					}

					elm.setAttribute('id', id);
				}

				return id;
			}

			function execCallback(name) {
				var callback = settings[name];

				if (!callback) {
					return;
				}

				return callback.apply(self, Array.prototype.slice.call(arguments, 2));
			}

			function hasClass(elm, className) {
				return className.constructor === RegExp ? className.test(elm.className) : DOM.hasClass(elm, className);
			}

			function findTargets(settings) {
				var l, targets = [];

				if (settings.types) {
					each(settings.types, function (type) {
						targets = targets.concat(DOM.select(type.selector));
					});

					return targets;
				} else if (settings.selector) {
					return DOM.select(settings.selector);
				} else if (settings.target) {
					return [settings.target];
				}

				// Fallback to old setting
				switch (settings.mode) {
					case "exact":
						l = settings.elements || '';

						if (l.length > 0) {
							each(explode(l), function (id) {
								var elm;

								if ((elm = DOM.get(id))) {
									targets.push(elm);
								} else {
									each(document.forms, function (f) {
										each(f.elements, function (e) {
											if (e.name === id) {
												id = 'mce_editor_' + instanceCounter++;
												DOM.setAttrib(e, 'id', id);
												targets.push(e);
											}
										});
									});
								}
							});
						}
						break;

					case "textareas":
					case "specific_textareas":
						each(DOM.select('textarea'), function (elm) {
							if (settings.editor_deselector && hasClass(elm, settings.editor_deselector)) {
								return;
							}

							if (!settings.editor_selector || hasClass(elm, settings.editor_selector)) {
								targets.push(elm);
							}
						});
						break;
				}

				return targets;
			}

			var provideResults = function (editors) {
				result = editors;
			};

			function initEditors() {
				var initCount = 0,
					editors = [],
					targets;

				function createEditor(id, settings, targetElm) {
					var editor = new tinymce.Editor(id, settings, self);

					editors.push(editor);

					editor.onInit.add(function () {
						if (++initCount === targets.length) {
							provideResults(editors);
						}
					});

					editor.targetElm = editor.targetElm || targetElm;
					editor.render();
				}

				DOM.unbind(window, 'ready', initEditors);
				execCallback('onpageload');

				targets = DOM.unique(findTargets(settings));

				each(targets, function (elm) {
					purgeDestroyedEditor(self.get(elm.id));
				});

				targets = tinymce.grep(targets, function (elm) {
					return !self.get(elm.id);
				});

				if (targets.length === 0) {
					provideResults([]);
				} else {
					each(targets, function (elm) {
						createEditor(createId(elm), settings, elm);
					});
				}
			}

			self.settings = settings;
			DOM.bind(window, 'ready', initEditors);
		},

		/**
		 * Returns a editor instance by id.
		 *
		 * @method get
		 * @param {String/Number} id Editor instance id or index to return.
		 * @return {tinymce.Editor} Editor instance to return.
		 * @example
		 * // Adds an onclick event to an editor by id (shorter version)
		 * tinyMCE.get('mytextbox').onClick.add(function(ed, e) {
		 *    ed.windowManager.alert('Hello world!');
		 * });
		 *
		 * // Adds an onclick event to an editor by id (longer version)
		 * tinymce.EditorManager.get('mytextbox').onClick.add(function(ed, e) {
		 *    ed.windowManager.alert('Hello world!');
		 * });
		 */
		get: function (id) {
			if (id === undef) {
				return this.editors;
			}

			if (!this.editors.hasOwnProperty(id)) {
				return undef;
			}

			return this.editors[id];
		},

		/**
		 * Returns a editor instance by id. This method was added for compatibility with the 2.x branch.
		 *
		 * @method getInstanceById
		 * @param {String} id Editor instance id to return.
		 * @return {tinymce.Editor} Editor instance to return.
		 * @deprecated Use get method instead.
		 * @see #get
		 */
		getInstanceById: function (id) {
			return this.get(id);
		},

		/**
		 * Adds an editor instance to the editor collection. This will also set it as the active editor.
		 *
		 * @method add
		 * @param {tinymce.Editor} editor Editor instance to add to the collection.
		 * @return {tinymce.Editor} The same instance that got passed in.
		 */
		add: function (editor) {
			var self = this,
				editors = self.editors;

			// Add named and index editor instance
			editors[editor.id] = editor;
			editors.push(editor);

			self.setActive(editor);
			self.onAddEditor.dispatch(self, editor);

			return editor;
		},

		/**
		 * Removes a editor instance from the collection.
		 *
		 * @method remove
		 * @param {tinymce.Editor} e Editor instance to remove.
		 * @return {tinymce.Editor} The editor that got passed in will be return if it was found otherwise null.
		 */
		remove: function (editor) {
			var i, editors = this.editors;

			// no value given
			if (!editor) {
				return null;
			}

			// Not in the collection
			if (!editors[editor.id]) {
				return null;
			}

			delete editors[editor.id];

			for (i = 0; i < editors.length; i++) {
				if (editors[i] == editor) {
					editors.splice(i, 1);
					break;
				}
			}

			// Select another editor since the active one was removed
			if (this.activeEditor == editor) {
				this.setActive(editors[0]);
			}

			editor.destroy();
			this.onRemoveEditor.dispatch(this, editor);

			return editor;
		},

		/**
		 * Executes a specific command on the currently active editor.
		 *
		 * @method execCommand
		 * @param {String} c Command to perform for example Bold.
		 * @param {Boolean} u Optional boolean state if a UI should be presented for the command or not.
		 * @param {String} v Optional value parameter like for example an URL to a link.
		 * @return {Boolean} true/false if the command was executed or not.
		 */
		execCommand: function (c, u, v) {
			var ed = this.get(v),
				win;

			// Manager commands
			switch (c) {
				case "mceFocus":
					ed.focus();
					return true;

				case "mceAddEditor":
				case "mceAddControl":
					if (!this.get(v)) {
						new tinymce.Editor(v, this.settings).render();
					}

					return true;

				case "mceAddFrameControl":
					win = v.window;

					// Add tinyMCE global instance and tinymce namespace to specified window
					win.tinyMCE = tinyMCE;
					win.tinymce = tinymce;

					tinymce.DOM.doc = win.document;
					tinymce.DOM.win = win;

					ed = new tinymce.Editor(v.element_id, v);
					ed.render();

					v.page_window = null;

					return true;

				case "mceRemoveEditor":
				case "mceRemoveControl":
					if (ed) {
						ed.remove();
					}
					return true;

				case 'mceToggleEditor':
					if (!ed) {
						this.execCommand('mceAddControl', 0, v);
						return true;
					}

					if (ed.isHidden()) {
						ed.show();
					} else {
						ed.hide();
					}

					return true;
			}

			// Run command on active editor
			if (this.activeEditor) {
				return this.activeEditor.execCommand(c, u, v);
			}

			return false;
		},

		/**
		 * Executes a command on a specific editor by id. This method was added for compatibility with the 2.x branch.
		 *
		 * @deprecated Use the execCommand method of a editor instance instead.
		 * @method execInstanceCommand
		 * @param {String} id Editor id to perform the command on.
		 * @param {String} c Command to perform for example Bold.
		 * @param {Boolean} u Optional boolean state if a UI should be presented for the command or not.
		 * @param {String} v Optional value parameter like for example an URL to a link.
		 * @return {Boolean} true/false if the command was executed or not.
		 */
		execInstanceCommand: function (id, c, u, v) {
			var ed = this.get(id);

			if (ed) {
				return ed.execCommand(c, u, v);
			}

			return false;
		},

		/**
		 * Calls the save method on all editor instances in the collection. This can be useful when a form is to be submitted.
		 *
		 * @method triggerSave
		 * @example
		 * // Saves all contents
		 * tinyMCE.triggerSave();
		 */
		triggerSave: function () {
			each(this.editors, function (e) {
				e.save();
			});
		},

		/**
		 * Adds a language pack, this gets called by the loaded language files like en.js.
		 *
		 * @method addI18n
		 * @param {String} p Prefix for the language items. For example en.myplugin
		 * @param {Object} o Name/Value collection with items to add to the language group.
		 */
		addI18n: function (p, o) {
			var i18n = this.i18n;

			if (!tinymce.is(p, 'string')) {
				each(p, function (o, lc) {
					each(o, function (o, g) {
						each(o, function (o, k) {
							if (g === 'common') {
								i18n[lc + '.' + k] = o;
							} else {
								i18n[lc + '.' + g + '.' + k] = o;
							}
						});
					});
				});
			} else {
				each(o, function (o, k) {
					i18n[p + '.' + k] = o;
				});
			}
		},

		// Private methods

		setActive: function (editor) {
			this.selectedInstance = this.activeEditor = editor;
		}
	});

	tinymce.FocusManager = new tinymce.dom.FocusManager(tinymce.EditorManager);

})(tinymce);

/**
 * Alternative name for tinymce added for 2.x compatibility.
 *
 * @member
 * @property tinyMCE
 * @type tinymce
 * @example
 * // To initialize editor instances
 * tinyMCE.init({
 *    ...
 * });
 */

/**
 * Alternative name for tinymce added for compatibility.
 *
 * @member tinymce
 * @property EditorManager
 * @type tinymce
 * @example
 * // To initialize editor instances
 * tinymce.EditorManager.get('editor');
 */