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
      intro: 'var tinymce = {};',
      outro: 'window.tinymce = tinymce;'
      //banner: '(function(){',
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
