import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

const production = process.env.NODE_ENV === 'production';
const dev = process.env.NODE_ENV === 'development';

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife',
    name: 'app',
    sourcemap: production,
    plugins: production ? [terser()] : [],
  },
  plugins: dev ? [
    serve({ contentBase: ['src', '.'], port: 3000, open: true }),
    livereload(['src', 'dist']),
  ] : [],
  treeshake: false,
  onwarn(warning, warn) {
    // suppress warnings about browser globals (p5, ml5, moLib, DOM ids)
    if (warning.code === 'THIS_IS_UNDEFINED') return;
    warn(warning);
  },
};
