const path = require('path');

module.exports = {
  target: 'node',
  entry: './index.js',
  optimization: {
    minimize: true,
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
