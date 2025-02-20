// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './src/main.ts',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            // 将 "slash-runner" 映射到相对的目录（根据实际目录结构调整）
            "slash-runner": path.resolve(__dirname, "../src/iframe_client"),
            "src/iframe_client": path.resolve(__dirname, "../src/iframe_client"),
        }
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    externals: [
        // 这里的函数将拦截所有请求，“slash-runner/”开头的模块都不会被打包
        function({ request }, callback) {
            // 如果请求以 "slash-runner/" 开头则当作外部依赖
            if (request && request.startsWith('slash-runner/')) {
                return callback(null, 'slashRunner');
            }
            // 如果请求以 "src/iframe_client/" 开头也当作外部依赖
            if (request && request.startsWith('src/iframe_client/')) {
                return callback(null, 'slashRunner');
            }
            callback();

        }
    ],
    plugins: [
    ],
    mode: 'production',
    devtool: 'source-map', // 添加这一行，启用 source map

};
