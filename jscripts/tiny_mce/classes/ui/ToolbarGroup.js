/**
 * ToolbarGroup.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

(function (tinymce) {
	// Shorten class names
	var dom = tinymce.DOM,
		each = tinymce.each,
		Event = tinymce.dom.Event;
	/**
	 * This class is used to group a set of toolbars together and control the keyboard navigation and focus.
	 *
	 * @class tinymce.ui.ToolbarGroup
	 * @extends tinymce.ui.Container
	 */
	tinymce.create('tinymce.ui.ToolbarGroup:tinymce.ui.Container', {
		/**
		 * Renders the toolbar group as a HTML string.
		 *
		 * @method renderHTML
		 * @return {String} HTML for the toolbar control.
		 */
		renderHTML: function () {
			var html = [],
				controls = this.controls,
				each = tinymce.each;

				each(controls, function (toolbar) {
					html.push(toolbar.renderHTML());
				});

				var group = dom.create('div', {
					id: this.id,
					role: 'group',
					class : this.settings.class ? (this.classPrefix + this.settings.class) : ''
				}, html.join(''));

			return dom.getOuterHTML(group);
		},

		focus: function () {
			dom.get(this.id).focus();
		},

		postRender: function () {
			var editor = this.editor,
				settings = this.settings,
				id = this.id,
				items = [];

			each(this.controls, function (toolbar) {
				each(toolbar.controls, function (control) {
					if (control.id) {
						items.push(control);
					}
				});
			});

			this.keyNav = new tinymce.ui.KeyboardNavigation({
				root: id,
				items: items,
				onCancel: function () {
					//Move focus if webkit so that navigation back will read the item.
					if (tinymce.isWebKit) {
						dom.get(editor.id + "_ifr").focus();
					}
					editor.focus();
				},
				excludeFromTabOrder: !settings.tab_focus_toolbar
			});
		},

		destroy: function () {
			this.parent();
			this.keyNav.destroy();
			Event.clear(this.id);
		}
	});
})(tinymce);