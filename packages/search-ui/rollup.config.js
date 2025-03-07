import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import { readFileSync } from 'fs';

// Get package.json
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

export default {
  input: 'src/search.js',
  output: [
    {
      file: pkg.main,
      format: 'umd',
      name: 'GhostMeilisearchSearch',
      sourcemap: true
    },
    {
      file: 'dist/search.min.js',
      format: 'umd',
      name: 'GhostMeilisearchSearch',
      plugins: [terser()],
      sourcemap: true
    }
  ],
  onwarn(warning, warn) {
    // Suppress circular dependency warnings from meilisearch
    if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message.includes('meilisearch')) {
      return;
    }
    warn(warning);
  },
  plugins: [
    resolve({
      browser: true
    }),
    commonjs(),
    postcss({
      extract: 'styles.css',
      minimize: true
    })
  ]
};
