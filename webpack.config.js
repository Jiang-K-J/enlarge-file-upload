const path = require('path');

module.exports = {
  mode: 'production', 
  entry: './src/upload.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'upload.js',
    library: 'createUploader',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  }
};
