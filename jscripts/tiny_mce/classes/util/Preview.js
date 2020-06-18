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

    var rgba = {}, luma = {}, white = 'rgb(255, 255, 255)';

    function getRGBA(val) {
        if (!rgba[val]) {
            var r = 0, b = 0, g = 0, a = 1, values, match

            if (val.indexOf('#') !== -1) {
                val = val.substr(1);

                // fff -> ffffff
                if (val.length === 3) {
                    val += val;
                }

                values = parseInt(val, 16);

                r = (values >> 16) & 0xFF;
                g = (values >> 8) & 0xFF;
                b = (values >> 0) & 0xFF;
                a = (values >> 24) & 0xFF;
            } else {
                // remove spaces
                val = val.replace(/\s/g, '');

                if (match = /^(?:rgb|rgba)\(([^\)]*)\)$/.exec(val)) {
                    values = match[1].split(',').map(function (x, i) {
                        return parseFloat(x);
                    });
                }

                if (values) {
                    r = values[0];
                    g = values[1];
                    b = values[2];

                    if (values.length === 4) {
                        a = values[3] || 1;
                    }
                }
            }

            rgba[val] = { r: r, g: g, b: b, a: a };
        }

        return rgba[val];
    }
    // https://github.com/bgrins/TinyColor/blob/master/tinycolor.js#L75
    function getLuminance(val) {
        if (!luma[val]) {
            var col = getRGBA(val);

            // opacity is set
            /*if (col.a < 1 && color2) {
                var col2 = getRGBA(color2);

                col = {
                    r: ((col2.r - col.r) * col.a) + col.r,
                    g: ((col2.g - col.g) * col.a) + col.g,
                    b: ((col2.b - col.b) * col.a) + col.b
                };
            }*/

            var RsRGB, GsRGB, BsRGB, R, G, B;

            RsRGB = col.r/255;
            GsRGB = col.g/255;
            BsRGB = col.b/255;

            if (RsRGB <= 0.03928) {R = RsRGB / 12.92;} else {R = Math.pow(((RsRGB + 0.055) / 1.055), 2.4);}
            if (GsRGB <= 0.03928) {G = GsRGB / 12.92;} else {G = Math.pow(((GsRGB + 0.055) / 1.055), 2.4);}
            if (BsRGB <= 0.03928) {B = BsRGB / 12.92;} else {B = Math.pow(((BsRGB + 0.055) / 1.055), 2.4);}

            luma[val] = (0.2126 * R) + (0.7152 * G) + (0.0722 * B);

            //luma[val] = 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b; // per ITU-R BT.709
        }

        return luma[val];
    }

    // https://github.com/bgrins/TinyColor/blob/master/tinycolor.js#L726
    function isReadable(color1, color2) {
        var l1 = getLuminance(color1);
        var l2 = getLuminance(color2);

        var lvl = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

        return lvl >= 2;
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
            previewStyles = 'font-family font-size font-weight text-decoration text-transform background-color color';
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

        // get body background color and element background color
        var bodybg = dom.getStyle(ed.getBody(), 'background-color', true), elmbg = dom.getStyle(previewElm, 'background-color', true);

        var styles = previewStyles.split(' ');

        for (var i = 0, len = styles.length; i < len; i++) {
            var name = styles[i], value = dom.getStyle(previewElm, name, true);

            // skip if already added
            if (name == 'background-color' && previewCss[name]) {
                continue;
            }

            // If text color is white and the background color is white or transparent, override with default color
            if (name == 'color') {
                // default to white if transparent
                if (/transparent|rgba\s*\([^)]+,\s*0\)/.test(elmbg)) {
                    elmbg = white;
                }

                // if background color produces unreadable text, try body background color
                if (!isReadable(value, elmbg)) {
                    // use body background color
                    if (isReadable(value, bodybg)) {
                        previewCss['background-color'] = bodybg;
                    } else {
                        value = 'inherit';
                    }
                }
            }

            // set to default if value is 0
            if (name == 'font-size' && parseInt(value) === 0) {
                value = 'inherit';
            }

            previewCss[name] = value;
        }

        dom.remove(previewElm);

        return dom.serializeStyle(previewCss);
    };
})();