module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'chai', 'sinon'],
    browsers : ["Firefox"],

    files: [
      'dist/stellar-sdk.js',
      'test/test-helper.js',
      'test/unit/**/*.js'
    ],

    preprocessors: {
      'test/**/*.js': ['webpack']
    },

    webpack: {
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {loader: 'babel-loader', options: {presets: ['env']}}
          }
        ]
      }
    },

    webpackMiddleware: {
      noInfo: true
    },

    singleRun: true,

    reporters: ['dots']
  });
};
