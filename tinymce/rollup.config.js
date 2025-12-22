/* eslint-disable */
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';

export default [
  {
    input: 'index.js',

    external: ['wfe'],

    output: {
      format: 'iife',
      file: "tinymce.dev.js",
      globals: {
        wfe: 'wfe'
      },
      banner: '/* eslint-disable */'
    },

    plugins: [
      replace({
        'tinymce$1': 'tinymce'
      }),
      resolve(),
      commonjs()
    ]
  }


];