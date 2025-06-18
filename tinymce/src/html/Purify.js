/*!
 * DOMPurify v3.x (c) Cure53 — licensed under MPL-2.0 (compatible with our GPL 2+).
 * See https://github.com/cure53/DOMPurify/blob/main/LICENSE
 */

import DOMPurify from "dompurify";

tinymce.html.Purifier = function (settings, schema) {
    var each = tinymce.each;

    var config = {
        IN_PLACE: true,
        RETURN_DOM: true,
        FORCE_BODY: true,
        ALLOW_UNKNOWN_PROTOCOLS: !!settings.allow_script_urls,
        ALLOWED_TAGS: ['#comment', '#cdata-section', 'body'],
        ALLOWED_ATTR: []
    };

    var attrNames = {};

    // Dynamically allow tags and attributes from schema
    each(schema.elements, function (element, name) {
        config.ALLOWED_TAGS.push(name);

        each(element.attributes, function (attr, attrName) {
            attrNames[attrName] = true;
        });

        // allow script tags via FORCE_BODY
        if (name === 'script' || name == 'style') {
            config.FORCE_BODY = true;
        }
    });

    each(attrNames, function (val, name) {
        config.ALLOWED_ATTR.push(name);
    });

    this.purify = function (html) {
        if (settings.verify_html === false) {
            return html;
        }

        var purifier = DOMPurify();
        purifier.removeAllHooks();

        // Remove elements not allowed by schema
        purifier.addHook('uponSanitizeElement', function (node, data) {
            if (data.tagName === 'body' || node.nodeType !== 1) {
                return;
            }

            if (schema.isValid(data.tagName)) {
                return;
            }

            node.parentNode && node.parentNode.removeChild(node);
        });

        // Attribute-level sanitization
        purifier.addHook('uponSanitizeAttribute', function (node, data) {
            var attrName = data.attrName;

            // Allow all data-*, aria-*, uk-*, etc.
            if (/-/.test(attrName)) {
                data.keepAttr = true;
                return;
            }

            // Allow on* if permitted in settings
            if (settings.allow_event_attributes && /^on[a-z]+/i.test(attrName)) {
                data.keepAttr = true;
                return;
            }

            if (!schema.isValid(node.nodeName.toLowerCase(), attrName)) {
                node.removeAttribute(attrName);
            }
        });

        return purifier.sanitize(html, config);
    };
};
