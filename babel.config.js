module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // zod v4 ships `export * as ns from`, which Metro's preset doesn't transform.
  plugins: ['@babel/plugin-transform-export-namespace-from'],
};
