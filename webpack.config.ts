//import eslintWebpackPlugin from 'eslint-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'node:path';
import url from 'node:url';
import TerserPlugin from 'terser-webpack-plugin';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import webpack from 'webpack';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const relative_sillytavern_path = path.relative(
  path.join(__dirname, 'dist'),
  __dirname.substring(0, __dirname.lastIndexOf('public') + 6),
);

const config = (_env: any, argv: any): webpack.Configuration => {
  return {
    experiments: {
      outputModule: true,
    },
    devtool: argv.mode === 'production' ? 'source-map' : 'eval-source-map',
    entry: './src/index.ts',
    target: 'browserslist',
    output: {
      filename: 'index.js',
      path: path.join(__dirname, 'dist/'),
      chunkFilename: '[name].[contenthash].chunk.js',
      asyncChunks: true,
      clean: true,
      library: {
        type: 'module',
      },
    },
    plugins: [new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 })],
    resolve: {
      extensions: ['.ts', '.js', '.tsx', '.jsx'],
      plugins: [
        new TsconfigPathsPlugin({
          extensions: ['.ts', '.js', '.tsx', '.jsx'],
          baseUrl: './src/',
          configFile: path.join(__dirname, 'tsconfig.json'),
        }),
      ],
      alias: {},
    },
    module: {
      rules: [
        {
          oneOf: [
            {
              test: /\.tsx?$/,
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
              },
              resourceQuery: /raw/,
              type: 'asset/source',
            },
            {
              resourceQuery: /raw/,
              type: 'asset/source',
            },
            {
              test: /\.tsx?$/,
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
              },
              exclude: /node_modules/,
            },
            {
              test: /\.html?$/,
              use: 'html-loader',
              exclude: /node_modules/,
            },
            {
              test: /\.(sa|sc|c)ss$/,
              use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader', 'sass-loader'],
              exclude: /node_modules/,
            },
          ],
        },
      ],
    },
    optimization: {
      minimize: true,
      minimizer: [new TerserPlugin({ extractComments: false })],
      splitChunks: {
        chunks: 'async',
        minSize: 20000,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        cacheGroups: {
          vendor: {
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
          },
          default: {
            name: 'default',
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      },
    },
    externals: ({ context, request }, callback) => {
      if (!context || !request) {
        return callback();
      }
      if (/^@sillytavern/.test(request)) {
        const script = path.join(relative_sillytavern_path, request.replace('@sillytavern/', '')).replaceAll('\\', '/');
        return callback(null, 'module ' + (path.extname(script) === '.js' ? script : `${script}.js`));
      }
      const builtin = {
        jquery: '$',
        hljs: 'hljs',
        lodash: '_',
        toastr: 'toastr',
        '@popperjs/core': 'Popper',
      };
      if (request in builtin) {
        return callback(null, 'var ' + builtin[request as keyof typeof builtin]);
      }
      callback();
    },
  };
};

export default config;
