/**
 * Container.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license - Inactive
 * Licence: GNU/LGPL 2.1 or later - http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html
 * Contributing: http://www.tinymce.com/contributing - Inactive
 */

/**
 * This class is the base class for all container controls like toolbars. This class should not
 * be instantiated directly other container controls should inherit from this one.
 *
 * @class tinymce.ui.Container
 * @extends tinymce.ui.Control
 */

tinymce.create('tinymce.ui.Container:tinymce.ui.Control', {
	/**
	 * Base contrustor a new container control instance.
	 *
	 * @constructor
	 * @method Container
	 * @param {String} id Control id to use for the container.
	 * @param {Object} settings Optional name/value settings object.
	 */
	Container: function (id, settings, editor) {
		var self = this;

		settings = settings || {};

		this._super(id, settings, editor);

		/**
		 * Array of controls added to the container.
		 *
		 * @property controls
		 * @type Array
		 */
		this.controls = [];

		this.lookup = {};

		if (settings.controls) {
			tinymce.each(settings.controls, function (ctrl) {
				self.add(ctrl);
			});
		}
	},

	/**
	 * Adds a control to the collection of controls for the container.
	 *
	 * @method add
	 * @param {tinymce.ui.Control} c Control instance to add to the container.
	 * @return {tinymce.ui.Control} Same control instance that got passed in.
	 */
	add: function (ctrl) {
		this.lookup[ctrl.id] = ctrl;
		this.controls.push(ctrl);

		ctrl.parent(this);

		return ctrl;
	},

	destroy: function () {
		var i;

		this._super();

		for (i = 0; i < this.controls.length; i++) {
			this.controls[i].destroy();
		}

		delete this.lookup[this.id];
	},

	/**
	 * Returns a control by id from the containers collection.
	 *
	 * @method get
	 * @param {String} id Id for the control to retrive.
	 * @return {tinymce.ui.Control} Control instance by the specified name or undefined if it wasn't found.
	 */
	get: function (id) {
		return this.lookup[id];
	}
});