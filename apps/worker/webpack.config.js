const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  externals: [
    nodeExternals({
      allowlist: [/^@aj-mock-hub\//],
      modulesDir: join(__dirname, '../../node_modules'),
    }),
  ],
  output: {
    path: join(__dirname, '../../dist/apps/worker'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      externalDependencies: 'none',
      mergeExternals: true,
      generatePackageJson: true,
      sourceMap: true,
    }),
  ],
};
