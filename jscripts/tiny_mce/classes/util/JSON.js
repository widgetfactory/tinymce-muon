/**
 * JSON.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

(function () {
    /**
     * JSON parser and serializer class wrapper for native JSON
     *
     * @class tinymce.util.JSON
     * @static
     * @example
     * // JSON parse a string into an object
     * var obj = tinymce.util.JSON.parse(somestring);
     *
     * // JSON serialize a object into an string
     * var str = tinymce.util.JSON.serialize(obj);
     */
    tinymce.util.JSON = {
        /**
         * Serializes the specified object as a JSON string.
         *
         * @method serialize
         * @param {Object} obj Object to serialize as a JSON string.
         * @param {String} quote Optional quote string defaults to ".
         * @return {string} JSON string serialized from input.
         */
        serialize: function (obj) {
            try {
                return JSON.stringify(obj);
            } catch (ex) {
                // Ignore
            }
        },

        /**
         * Unserializes/parses the specified JSON string into a object.
         *
         * @method parse
         * @param {string} str JSON String to parse into a JavaScript object.
         * @return {Object} Object from input JSON string or undefined if it failed.
         */
        parse: function (str) {
                try {
                    return JSON.parse(str);
                } catch (ex) {
                    // Ignore
                }
            }
            /**#@-*/
    };
})();