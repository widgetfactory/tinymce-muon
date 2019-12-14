/**
 * @package   	JCE
 * @copyright 	Copyright (c) 2009-2019 Ryan Demmer. All rights reserved.
 * @license   	GNU/GPL 2 or later - http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
 * JCE is free software. This version may have been modified pursuant
 * to the GNU General Public License, and as distributed it includes or
 * is derivative of works licensed under the GNU General Public License or
 * other free or open source software licenses.
 */
(function () {
    var each = tinymce.each;

    function luminance(hex) {
        hex = hex.substr(1);

        var rgb = parseInt(hex, 16);

        var r = (rgb >> 16) & 0xFF;  // extract red
        var g = (rgb >> 8) & 0xFF;  // extract green
        var b = (rgb >> 0) & 0xFF;  // extract blue

        return 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
    }

    tinymce.util.PreviewCss = function (ed, fmt) {
        var name, previewElm, dom = ed.dom,
            previewCss = {};

        var previewStyles = ed.settings.preview_styles;

        // No preview forced
        if (previewStyles === false) {
            return '';
        }

        // Default preview
        if (!previewStyles) {
            previewStyles = 'font-family font-size font-weight text-decoration text-transform color background-color';
        }

        // Removes any variables since these can't be previewed
        function removeVars(val) {
            if (val && typeof (val) === "string") {
                val = val.replace(/%(\w+)/g, '');
            }

            return val;
        }

        // Create block/inline element to use for preview
        name = fmt.block || fmt.inline || 'span';
        previewElm = dom.create(name);

        // Add format styles to preview element
        each(fmt.styles, function (value, name) {
            value = removeVars(value);

            if (value) {
                dom.setStyle(previewElm, name, value);
            }
        });

        // Add attributes to preview element
        each(fmt.attributes, function (value, name) {
            value = removeVars(value);

            if (value) {
                dom.setAttrib(previewElm, name, value);
            }
        });

        // Add classes to preview element
        each(fmt.classes, function (value) {
            value = removeVars(value);

            dom.addClass(previewElm, value);
        });

        // Add the previewElm outside the visual area
        dom.setStyles(previewElm, {
            position: 'absolute',
            left: -0xFFFF
        });

        ed.getBody().appendChild(previewElm);

        // Get parent container font size so we can compute px values out of em/% for older IE:s
        var parentFontSize = dom.getStyle(ed.getBody(), 'fontSize', true);
        var parentFontSize = /px$/.test(parentFontSize) ? parseInt(parentFontSize, 10) : 0;

        var bodyColor = dom.getStyle(ed.getBody(), 'background-color', true), bodyLuma = luminance(dom.toHex(bodyColor));

        each(previewStyles.split(' '), function (name) {
            var value = dom.getStyle(previewElm, name, true);

            // If text color is white and the background color is white or transparent, override with default color
            if (name == 'color') {
                // get background color and luminance of style
                var bgcolor = dom.getStyle(previewElm, 'background-color', true), bgluma = luminance(dom.toHex(bgcolor));

                var luma = luminance(dom.toHex(value));

                // a light color...
                if (luma > 200) {
                    // background is too light, check body background color
                    if (bgluma > 239 || /transparent|rgba\s*\([^)]+,\s*0\)/.test(bgcolor)) {
                        // body background color is dark, so use it
                        if (bodyLuma < 128) {
                            previewCss['background-color'] = bodyColor;
                        } else {
                            value = 'inherit';
                        }
                    }
                }

                // a dark color and background is too dark, reset
                if (luma < 128 && bgluma < 128) {
                    previewCss['background-color'] = 'inherit';
                }
            }
            // skip if already added
            if (name == 'background-color' && previewCss[name]) {
                return true;
            }

            if (name == 'font-size' && parseInt(value) === 0) {
                value = 'inherit';
            }

            previewCss[name] = value;
        });

        dom.remove(previewElm);

        return dom.serializeStyle(previewCss);
    };
})();