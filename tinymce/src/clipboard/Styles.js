/**
 * Copyright (c) 2025 Ryan Demmer
 * Licensed under the GNU General Public License v2.0 or later.
 *
 * See the LICENSE file for details.
 */

function convertToPixels(v) {
    // return pixel value
    if (v.indexOf('px') !== -1) {
        return v;
    }

    // retun integer 0 for 0 values, eg: 0cm, 0pt etc. 
    if (parseInt(v, 10) === 0) {
        return 0;
    }

    // convert pt to px
    if (v.indexOf('pt') !== -1) {
        // convert to integer
        v = parseInt(v, 10);
        // convert to pixel value (round up to 1)
        v = Math.ceil(v / 1.33333);
        // convert to absolute integer
        v = Math.abs(v);
    }

    if (v) {
        v += 'px';
    }

    return v;
}

var pixelStyles = [
    'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'
];

var styleProps = [
    'background', 'background-attachment', 'background-color', 'background-image', 'background-position', 'background-repeat',
    'border', 'border-bottom', 'border-bottom-color', 'border-bottom-style', 'border-bottom-width', 'border-color', 'border-left', 'border-left-color', 'border-left-style', 'border-left-width', 'border-right', 'border-right-color', 'border-right-style', 'border-right-width', 'border-style', 'border-top', 'border-top-color', 'border-top-style', 'border-top-width', 'border-width', 'outline', 'outline-color', 'outline-style', 'outline-width',
    'height', 'max-height', 'max-width', 'min-height', 'min-width', 'width',
    'font', 'font-family', 'font-size', 'font-style', 'font-variant', 'font-weight',
    'content', 'counter-increment', 'counter-reset', 'quotes',
    'list-style', 'list-style-image', 'list-style-position', 'list-style-type',
    'margin', 'margin-bottom', 'margin-left', 'margin-right', 'margin-top',
    'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top',
    'bottom', 'clear', 'clip', 'cursor', 'display', 'float', 'left', 'overflow', 'position', 'right', 'top', 'visibility', 'z-index',
    'orphans', 'page-break-after', 'page-break-before', 'page-break-inside', 'widows',
    'border-collapse', 'border-spacing', 'caption-side', 'empty-cells', 'table-layout',
    'color', 'direction', 'letter-spacing', 'line-height', 'text-align', 'text-decoration', 'text-indent', 'text-shadow', 'text-transform', 'unicode-bidi', 'vertical-align', 'white-space', 'word-spacing'
];

var borderStyles = [
    'border', 'border-width', 'border-style', 'border-color',
    'border-top', 'border-right', 'border-bottom', 'border-left',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style'
];

var backgroundStyles = {
    'background-image': 'none',
    'background-position': '0% 0%',
    'background-size': 'auto auto',
    'background-repeat': 'repeat',
    'background-origin': 'padding-box',
    'background-clip': 'border-box',
    'background-attachment': 'scroll',
    'background-color': 'transparent'
};

var fontStyles = [
    'font', 'font-family', 'font-size',
    'font-style', 'font-variant', 'font-weight'
];

var namedColors = {
    '#F0F8FF': 'AliceBlue',
    '#FAEBD7': 'AntiqueWhite',
    '#7FFFD4': 'Aquamarine',
    '#F0FFFF': 'Azure',
    '#F5F5DC': 'Beige',
    '#FFE4C4': 'Bisque',
    '#000000': 'Black',
    '#FFEBCD': 'BlanchedAlmond',
    '#0000FF': 'Blue',
    '#8A2BE2': 'BlueViolet',
    '#A52A2A': 'Brown',
    '#DEB887': 'BurlyWood',
    '#5F9EA0': 'CadetBlue',
    '#7FFF00': 'Chartreuse',
    '#D2691E': 'Chocolate',
    '#FF7F50': 'Coral',
    '#6495ED': 'CornflowerBlue',
    '#FFF8DC': 'Cornsilk',
    '#DC143C': 'Crimson',
    '#00008B': 'DarkBlue',
    '#008B8B': 'DarkCyan',
    '#B8860B': 'DarkGoldenRod',
    '#A9A9A9': 'DarkGray',
    '#006400': 'DarkGreen',
    '#BDB76B': 'DarkKhaki',
    '#8B008B': 'DarkMagenta',
    '#556B2F': 'DarkOliveGreen',
    '#FF8C00': 'Darkorange',
    '#9932CC': 'DarkOrchid',
    '#8B0000': 'DarkRed',
    '#E9967A': 'DarkSalmon',
    '#8FBC8F': 'DarkSeaGreen',
    '#483D8B': 'DarkSlateBlue',
    '#2F4F4F': 'DarkSlateGrey',
    '#00CED1': 'DarkTurquoise',
    '#9400D3': 'DarkViolet',
    '#FF1493': 'DeepPink',
    '#00BFFF': 'DeepSkyBlue',
    '#696969': 'DimGrey',
    '#1E90FF': 'DodgerBlue',
    '#B22222': 'FireBrick',
    '#FFFAF0': 'FloralWhite',
    '#228B22': 'ForestGreen',
    '#DCDCDC': 'Gainsboro',
    '#F8F8FF': 'GhostWhite',
    '#FFD700': 'Gold',
    '#DAA520': 'GoldenRod',
    '#808080': 'Grey',
    '#008000': 'Green',
    '#ADFF2F': 'GreenYellow',
    '#F0FFF0': 'HoneyDew',
    '#FF69B4': 'HotPink',
    '#CD5C5C': 'IndianRed',
    '#4B0082': 'Indigo',
    '#FFFFF0': 'Ivory',
    '#F0E68C': 'Khaki',
    '#E6E6FA': 'Lavender',
    '#FFF0F5': 'LavenderBlush',
    '#7CFC00': 'LawnGreen',
    '#FFFACD': 'LemonChiffon',
    '#ADD8E6': 'LightBlue',
    '#F08080': 'LightCoral',
    '#E0FFFF': 'LightCyan',
    '#FAFAD2': 'LightGoldenRodYellow',
    '#D3D3D3': 'LightGrey',
    '#90EE90': 'LightGreen',
    '#FFB6C1': 'LightPink',
    '#FFA07A': 'LightSalmon',
    '#20B2AA': 'LightSeaGreen',
    '#87CEFA': 'LightSkyBlue',
    '#778899': 'LightSlateGrey',
    '#B0C4DE': 'LightSteelBlue',
    '#FFFFE0': 'LightYellow',
    '#00FF00': 'Lime',
    '#32CD32': 'LimeGreen',
    '#FAF0E6': 'Linen',
    '#FF00FF': 'Magenta',
    '#800000': 'Maroon',
    '#66CDAA': 'MediumAquaMarine',
    '#0000CD': 'MediumBlue',
    '#BA55D3': 'MediumOrchid',
    '#9370D8': 'MediumPurple',
    '#3CB371': 'MediumSeaGreen',
    '#7B68EE': 'MediumSlateBlue',
    '#00FA9A': 'MediumSpringGreen',
    '#48D1CC': 'MediumTurquoise',
    '#C71585': 'MediumVioletRed',
    '#191970': 'MidnightBlue',
    '#F5FFFA': 'MintCream',
    '#FFE4E1': 'MistyRose',
    '#FFE4B5': 'Moccasin',
    '#FFDEAD': 'NavajoWhite',
    '#000080': 'Navy',
    '#FDF5E6': 'OldLace',
    '#808000': 'Olive',
    '#6B8E23': 'OliveDrab',
    '#FFA500': 'Orange',
    '#FF4500': 'OrangeRed',
    '#DA70D6': 'Orchid',
    '#EEE8AA': 'PaleGoldenRod',
    '#98FB98': 'PaleGreen',
    '#AFEEEE': 'PaleTurquoise',
    '#D87093': 'PaleVioletRed',
    '#FFEFD5': 'PapayaWhip',
    '#FFDAB9': 'PeachPuff',
    '#CD853F': 'Peru',
    '#FFC0CB': 'Pink',
    '#DDA0DD': 'Plum',
    '#B0E0E6': 'PowderBlue',
    '#800080': 'Purple',
    '#FF0000': 'Red',
    '#BC8F8F': 'RosyBrown',
    '#4169E1': 'RoyalBlue',
    '#8B4513': 'SaddleBrown',
    '#FA8072': 'Salmon',
    '#F4A460': 'SandyBrown',
    '#2E8B57': 'SeaGreen',
    '#FFF5EE': 'SeaShell',
    '#A0522D': 'Sienna',
    '#C0C0C0': 'Silver',
    '#87CEEB': 'SkyBlue',
    '#6A5ACD': 'SlateBlue',
    '#708090': 'SlateGrey',
    '#FFFAFA': 'Snow',
    '#00FF7F': 'SpringGreen',
    '#4682B4': 'SteelBlue',
    '#D2B48C': 'Tan',
    '#008080': 'Teal',
    '#D8BFD8': 'Thistle',
    '#FF6347': 'Tomato',
    '#40E0D0': 'Turquoise',
    '#EE82EE': 'Violet',
    '#F5DEB3': 'Wheat',
    '#FFFFFF': 'White',
    '#F5F5F5': 'WhiteSmoke',
    '#FFFF00': 'Yellow',
    '#9ACD32': 'YellowGreen'
};

function namedColorToHex(value) {
    tinymce.each(namedColors, function (name, hex) {
        if (value.toLowerCase() === name.toLowerCase()) {
            value = hex;
            return false;
        }
    });

    return value.toLowerCase();
}

export {
    convertToPixels,
    borderStyles,
    backgroundStyles,
    pixelStyles,
    styleProps,
    fontStyles,
    namedColorToHex
};