export default {
  input: 'src/main.js',
  output: {
    file: 'src/bundle.js',
    format: 'iife',
    name: 'app',
  },
  treeshake: false,
  onwarn(warning, warn) {
    // suppress warnings about browser globals (p5, ml5, moLib, DOM ids)
    if (warning.code === 'THIS_IS_UNDEFINED') return;
    warn(warning);
  },
};
