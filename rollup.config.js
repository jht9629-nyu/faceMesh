import terser from '@rollup/plugin-terser';

const production = process.env.NODE_ENV === 'production';

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife',
    name: 'app',
    sourcemap: production,
    plugins: production ? [terser()] : [],
  },
  treeshake: false,
  onwarn(warning, warn) {
    // suppress warnings about browser globals (p5, ml5, moLib, DOM ids)
    if (warning.code === 'THIS_IS_UNDEFINED') return;
    warn(warning);
  },
};
