//import eslintWebpackPlugin from 'eslint-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import TerserPlugin from 'terser-webpack-plugin';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import webpack from 'webpack';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sillytavern_path = __dirname.substring(0, __dirname.lastIndexOf('public') + 6);
const bundled_script_path = path.dirname(
  path.join(__dirname, JSON.parse(fs.readFileSync('./manifest.json', 'utf8')).js),
);
const relative_sillytavern_path = path.relative(bundled_script_path, sillytavern_path);

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
      chunkLoading: 'import',
      clean: true,
      library: {
        type: 'module',
      },
    },
    // plugins: [new eslintWebpackPlugin({ extensions: ['ts', 'js', 'tsx', '.jsx'] })],
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
    externalsType: 'var',
    externals: [
      ({ context, request }, callback) => {
        if (!context || !request) {
          return callback();
        }
        let script_path = path.join(context, request);
        const dir_basename = path.basename(__dirname);
        if (/^@sillytavern/.test(request)) {
          let script = `${relative_sillytavern_path}\\${request.replace('@sillytavern/', '')}`.replace(/\\/g, '/');
          return callback(null, 'module ' + (path.extname(script) === '.js' ? script : `${script}.js`));
        }
        if (!script_path.includes(dir_basename)) {
          let is_js = path.extname(script_path) === '.js';
          if (!is_js) {
            is_js = fs.existsSync(`${script_path}.js`);
            script_path = is_js ? `${script_path}.js` : script_path;
          }
          if (is_js) {
            const script = (relative_sillytavern_path + script_path.replace(sillytavern_path, '')).replace(/\\/g, '/');
            return callback(null, 'module ' + script);
          }
        }
        callback();
      },
      {
        hljs: 'hljs',
        lodash: '_',
        toastr: 'toastr',
      },
      /^hljs$/i,
      /^(jquery|\$)$/i,
      /^jqueryui$/i,
      /^_$/i,
      /^toastr$/i,
    ],
  };
};

export default config;
