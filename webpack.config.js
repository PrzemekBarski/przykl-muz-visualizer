const path = require("path");

module.exports = {
  entry: [
    path.resolve(__dirname, "src/index.js")
  ],
  output: {
    path: path.resolve(__dirname, "dist"),
    publicPath: "/dist",
    filename: "bundle.js"
  },
  devServer: {
    static: "."
  }
}
