const webpack = require('webpack');

module.exports = function override(config) {
  // Add buffer fallback
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "zlib": require.resolve("browserify-zlib"),
    "url": require.resolve("url"),
    "buffer": require.resolve("buffer"),
    "process": require.resolve("process/browser"),
    "assert": require.resolve("assert"),
    "util": require.resolve("util")
  };

  // Add plugins
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"]
    })
  );

  // Add resolve extensions
  config.resolve.extensions = [...config.resolve.extensions, ".ts", ".js"];

  // Add module rules
  config.module.rules.push({
    test: /\.m?js/,
    resolve: {
      fullySpecified: false
    }
  });

  return config;
};
