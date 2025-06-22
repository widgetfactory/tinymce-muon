/*!
 * DOMPurify v3.x (c) Cure53 — licensed under MPL-2.0 (compatible with GPL-2+).
 * See https://github.com/cure53/DOMPurify/blob/main/LICENSE
 */

import DOMPurify from "dompurify";

/**
 * tinymce.html.Sanitizer
 *
 * A custom HTML sanitizer integrating DOMPurify and schema-based filtering.
 * Two modes:
 *  - Purify mode: hooks into DOMPurify for fast DOM transformations.
 *  - Manual mode: walks the tree with NodeIterator, pruning or unwrapping invalid nodes.
 *
 * @param {Object} settings Configuration options (verify_html, purify_html, allow_event_attributes, allow_script_urls, etc.).
 * @param {tinymce.html.Schema} schema HTML schema defining valid elements and attributes.
 */

(function (tinymce) {
    var each = tinymce.each;
    var isDomSafe = tinymce.util.URI.isDomSafe;
    var filteredUrlAttrs = tinymce.makeMap('src,href,data,background,formaction,poster,xlink:href');

    /**
     * Constructs a new Sanitizer instance.
     * @constructor
     * @param {Object} settings - Sanitizer settings.
     * @param {tinymce.html.Schema} schema - HTML schema for validation.
     */
    tinymce.html.Sanitizer = function (settings, schema) {
        var special = schema.getSpecialElements();

        var uid = 0;

        function isBooleanAttribute(name) {
            var boolAttrMap = schema.getBoolAttrs();
            return boolAttrMap[name] || boolAttrMap[name.toLowerCase()] || false;
        }

        /**
         * Validates and transforms a single DOM element according to schema rules and internal flags.
         *
         * @param {Node} node - The DOM node to process.
         * @returns {boolean|undefined}
         *   - `true` to continue traversal without removing this node.
         *   - `undefined` (or nothing) if the node was removed or replaced.
         *
         * Behavior:
         * 1. Non-element nodes (e.g. text, comments) and the `<body>` tag are left intact (`true` returned).
         * 2. Custom root (`data-mce-root`) and internal TinyMCE nodes (`data-mce-type`) are preserved.
         * 3. Bogus nodes (`data-mce-bogus`) are immediately removed via removeNode().
         * 4. If `settings.validate` is off, no further schema checks occur (`true` returned).
         * 5. The element’s schema rule is fetched. If none exists, the node is removed.
         * 6. Forced attributes (`attributesForced`) are applied (overwriting any existing).
         * 7. Default attributes (`attributesDefault`) are added if missing.
         * 8. If required attributes (`attributesRequired`) are not present, the node is unwrapped and removed.
         * 9. If `removeEmptyAttrs` is true and the element has no attributes, it is unwrapped and removed.
         * 10. If the schema specifies an `outputName` different from the current tag, the element is
         *    replaced with a new element of that name, preserving its children.
         * 11. Remaining attributes are filtered via filterAttributes().
         */
        function processNode(node) {
            if (node.nodeType !== 1) {
                return true;
            }

            var tag = node.tagName.toLowerCase();

            // skip body tag
            if (tag === 'body') {
                return true;
            }

            // keep custom root nodes
            if (node.hasAttribute('data-mce-root')) {
                return true;
            }

            // keep internal nodes
            if (node.hasAttribute('data-mce-type')) {
                return true;
            }

            // always remove bogus nodes
            if (node.hasAttribute('data-mce-bogus')) {
                removeNode(node);
                return;
            }

            // skip if we are not validating content
            if (!settings.validate) {
                return;
            }

            var rule = schema.getElementRule(tag);

            if (!rule) {
                // If no rule, remove the invalid node
                removeNode(node);
                return;
            }

            // Enforce forced attributes
            each(rule.attributesForced, function (attr) {
                node.setAttribute(
                    attr.name,
                    attr.value === '{$uid}' ? 'mce_' + uid++ : attr.value
                );
            });

            // Apply default attributes
            each(rule.attributesDefault, function (attr) {
                if (!node.hasAttribute(attr.name)) {
                    node.setAttribute(
                        attr.name,
                        attr.value === '{$uid}' ? 'mce_' + uid++ : attr.value
                    );
                }
            });

            // Unwrap and remove if required attributes are missing
            if (
                rule.attributesRequired &&
                !rule.attributesRequired.some(function (attr) {
                    return node.hasAttribute(attr.name);
                })
            ) {
                removeNode(node, true);
                return;
            }

            // Unwrap and remove if all attributes should be stripped and none remain
            if (rule.removeEmptyAttrs && node.attributes.length === 0) {
                removeNode(node, true);
                return;
            }

            // Rename element if schema defines a different outputName
            if (rule.outputName && rule.outputName !== tag) {
                var newNode = document.createElement(rule.outputName);
                while (node.firstChild) {
                    newNode.appendChild(node.firstChild);
                }
                node.parentNode.replaceChild(newNode, node);
                node = newNode;
            }

            // Finally, filter remaining attributes
            filterAttributes(node);
        }

        /**
         * Removes or unwraps a given DOM node based on its “special” status and bogus flag.
         *
         * @param {Node}  node   - The DOM node to remove or unwrap.
         * @param {boolean} unwrap - If true, children of the node are retained and inserted in its place; otherwise, the node is removed wholesale.
         *
         * Behavior:
         * 1. If the node has no parent, the function exits immediately.
         * 2. If the node’s tag name (lowercased) is in the `special` set, it will always be removed (unwrap forced off).
         * 3. If the node’s `data-mce-bogus` attribute is not exactly `"all"`, it is treated as bogus and forced to unwrap.
         * 4. When unwrapping:
         *    - A `DocumentFragment` is created.
         *    - All child nodes are moved into the fragment.
         *    - The fragment is inserted before the original node.
         *    - The original node is removed from its parent.
         * 5. Otherwise, the node is simply removed from its parent.
         */
        function removeNode(node, unwrap) {
            var parent = node.parentNode;
            if (!parent) {
                return; // No parent, nothing to do
            }

            // Special elements must be completely removed, never unwrapped
            if (special[node.tagName.toLowerCase()]) {
                unwrap = false;
            }

            // Bogus content should always be unwrapped so its children remain
            if (node.getAttribute('data-mce-bogus') != 'all') {
                unwrap = true;
            }

            if (unwrap) {
                var frag = document.createDocumentFragment();
                while (node.firstChild) {
                    frag.appendChild(node.firstChild);
                }
                parent.insertBefore(frag, node);
                parent.removeChild(node);
            } else {
                parent.removeChild(node);
            }
        }

        /**
         * Filters an element's attributes based on schema and settings.
         * @private
         * @param {Element} node - Element whose attributes to filter.
         */
        function filterAttributes(node) {
            var attrs = node.attributes, tag = node.tagName.toLowerCase();

            for (var i = attrs.length - 1; i >= 0; i--) {
                var name = attrs[i].name;
                var lower = name.toLowerCase();
                var value = attrs[i].value;

                // Preserve custom data-* or other dashed attributes including internal attributes eg: data-mce-type
                if (/-/.test(lower)) {
                    continue;
                }

                // Event handlers: only keep if allowed and defined in schema
                if (/^on[a-z]+/i.test(lower)) {
                    if (settings.allow_event_attributes && schema.isValid(tag, name)) {
                        continue;
                    }

                    node.removeAttribute(name);
                    continue;
                }

                // Disallow dangerous URLs
                if (filteredUrlAttrs[lower] && !isDomSafe(value, tag, settings)) {
                    node.removeAttribute(name);
                    continue;
                }

                // Remove attributes not in schema
                if (schema.isValid(tag, name) === false) {
                    node.removeAttribute(name);

                    continue;
                }

                if (isBooleanAttribute(name)) {
                    node.setAttribute(name, name);
                }
            }
        }

        /**
         * Creates DOMPurify configuration from settings and schema.
         * @private
         * @returns {Object} Configuration object.
         */
        function getPurifyConfig() {
            var config = {
                IN_PLACE: true,
                RETURN_DOM: true,
                FORCE_BODY: true,
                ALLOW_UNKNOWN_PROTOCOLS: !!settings.allow_script_urls,
                ALLOWED_TAGS: ['#comment', '#cdata-section', 'body'],
                ALLOWED_ATTR: []
            };

            // Allow any URI when allowing script urls
            if (settings.allow_script_urls) {
                config.ALLOWED_URI_REGEXP = /.*/;
                // Allow anything except javascript (or similar) URIs if all html data urls are allowed
            } else if (settings.allow_html_data_urls) {
                config.ALLOWED_URI_REGEXP = /^(?!(\w+script|mhtml):)/i;
            }

            var attrNames = {};

            each(schema.elements, function (element, name) {
                config.ALLOWED_TAGS.push(name);

                each(element.attributes, function (_, attrName) {
                    attrNames[attrName] = true;
                });

                if (name === 'script' || name === 'style') {
                    config.FORCE_BODY = true;
                }
            });

            each(attrNames, function (_, attrName) {
                config.ALLOWED_ATTR.push(attrName);
            });

            return config;
        }

        /**
         * Runs DOMPurify on the given HTML or element, using custom hooks.
         * @private
         * @param {String|Element} html - Input HTML to sanitize.
         * @returns {Element} Sanitized DOM fragment.
         */
        function purify(html) {
            var purifier = DOMPurify();
            purifier.removeAllHooks();

            purifier.addHook('uponSanitizeElement', function (node, data) {
                processNode(node);
            });

            purifier.addHook('uponSanitizeAttribute', function (node, data) {
                var attrName = data.attrName.toLowerCase(), tag = node.tagName.toLowerCase();

                if (/-/.test(attrName) || (settings.allow_event_attributes && /^on[a-z]+/i.test(attrName))) {
                    data.keepAttr = true;
                    return;
                }

                // We need to tell DOMPurify to forcibly keep the attribute if it's an SVG data URI and svg data URIs are allowed
                if (settings.allow_svg_data_urls && data.attrValue.startsWith('data:image/svg+xml')) {
                    data.forceKeepAttr = true;
                    return;
                }

                if (!schema.isValid(tag, attrName)) {
                    node.removeAttribute(data.attrName);
                }
            });

            return purifier.sanitize(html, getPurifyConfig());
        }

        /**
         * Sanitizes a DOM tree or HTML fragment.
         * @param {Element} body - Root element to sanitize.
         * @param {string}  mimeType - MIME type hint (unused).
         * @returns {Element} The sanitized root element.
         */
        this.sanitize = function (body, mimeType) {
            if (settings.verify_html === false) {
                return body;
            }

            if (settings.purify_html) {
                return purify(body);
            }

            var iterator = document.createNodeIterator(
                body,
                NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT
            );

            var node;

            while ((node = iterator.nextNode())) {
                if (node.nodeType === 1) {
                    processNode(node);
                }
            }
            return body;
        };
    };
})(tinymce);