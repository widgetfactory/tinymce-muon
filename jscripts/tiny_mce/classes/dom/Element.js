/**
 * Element.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

(function (tinymce) {
	/**
	 * Element class, this enables element blocking in IE. Element blocking is a method to block out select blockes that
	 * gets visible though DIVs on IE 6 it uses a iframe for this blocking. This class also shortens the length of some DOM API calls
	 * since it's bound to an element.
	 *
	 * @class tinymce.dom.Element
	 * @example
	 * // Creates an basic element for an existing element
	 * var elm = new tinymce.dom.Element('someid');
	 *
	 * elm.setStyle('background-color', 'red');
	 * elm.moveTo(10, 10);
	 */

	/**
	 * Constructs a new Element instance. Consult the Wiki for more details on this class.
	 *
	 * @constructor
	 * @method Element
	 * @param {String} id Element ID to bind/execute methods on.
	 * @param {Object} settings Optional settings name/value collection.
	 */
	tinymce.dom.Element = function (id, settings) {
		var self = this,
			dom;

		self.settings = settings = settings || {};
		self.id = id;
		self.dom = dom = settings.dom || tinymce.DOM;

		tinymce.each(
			('getPos,getRect,getParent,add,setStyle,getStyle,setStyles,' +
				'setAttrib,setAttribs,getAttrib,addClass,removeClass,' +
				'hasClass,getOuterHTML,setOuterHTML,remove,show,hide,' +
				'isHidden,setHTML,get').split(/,/),
			function (k) {
				self[k] = function () {
					var a = [id],
						i;

					for (i = 0; i < arguments.length; i++) {
						a.push(arguments[i]);
					}

					a = dom[k].apply(dom, a);

					return a;
				};
			}
		);

		tinymce.extend(self, {
			/**
			 * Adds a event handler to the element.
			 *
			 * @method on
			 * @param {String} n Event name like for example "click".
			 * @param {function} f Function to execute on the specified event.
			 * @param {Object} s Optional scope to execute function on.
			 * @return {function} Event handler function the same as the input function.
			 */
			on: function (n, f, s) {
				return tinymce.dom.Event.add(self.id, n, f, s);
			},

			/**
			 * Returns the absolute X, Y cordinate of the element.
			 *
			 * @method getXY
			 * @return {Object} Objext with x, y cordinate fields.
			 */
			getXY: function () {
				return {
					x: parseInt(self.getStyle('left')),
					y: parseInt(self.getStyle('top'))
				};
			},

			/**
			 * Returns the size of the element by a object with w and h fields.
			 *
			 * @method getSize
			 * @return {Object} Object with element size with a w and h field.
			 */
			getSize: function () {
				var n = dom.get(self.id);

				return {
					w: parseInt(self.getStyle('width') || n.clientWidth),
					h: parseInt(self.getStyle('height') || n.clientHeight)
				};
			},

			/**
			 * Moves the element to a specific absolute position.
			 *
			 * @method moveTo
			 * @param {Number} x X cordinate of element position.
			 * @param {Number} y Y cordinate of element position.
			 */
			moveTo: function (x, y) {
				self.setStyles({
					left: x,
					top: y
				});
			},

			/**
			 * Moves the element relative to the current position.
			 *
			 * @method moveBy
			 * @param {Number} x Relative X cordinate of element position.
			 * @param {Number} y Relative Y cordinate of element position.
			 */
			moveBy: function (x, y) {
				var p = self.getXY();

				self.moveTo(p.x + x, p.y + y);
			},

			/**
			 * Resizes the element to a specific size.
			 *
			 * @method resizeTo
			 * @param {Number} w New width of element.
			 * @param {Numner} h New height of element.
			 */
			resizeTo: function (w, h) {
				self.setStyles({
					width: w,
					height: h
				});
			},

			/**
			 * Resizes the element relative to the current sizeto a specific size.
			 *
			 * @method resizeBy
			 * @param {Number} w Relative width of element.
			 * @param {Numner} h Relative height of element.
			 */
			resizeBy: function (w, h) {
				var s = self.getSize();

				self.resizeTo(s.w + w, s.h + h);
			},

			/**
			 * Updates the element blocker in IE6 based on the style information of the element.
			 *
			 * @method update
			 * @param {String} k Optional function key. Used internally.
			 */
			update: function () {}
		});
	};
})(tinymce);