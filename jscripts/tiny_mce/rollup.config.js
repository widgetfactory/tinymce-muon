import replace from '@rollup/plugin-replace';

export default [
  {
    input: "index.js",

    external: ['wfe'],

    output: {
      format: 'iife',
      file: "tiny_mce_dev.js",
      globals: {
        wfe: 'wfe'
      },
      banner: '/* eslint disable */'
      //intro: 'var tinymce = {};',
      //outro: 'window.tinymce = tinymce;'
      
      //footer: '})();'
    },

    plugins: [
      //uglify({mangle: false})
      replace({
        'tinymce$1': 'tinymce'
      })
    ]
  }
];
