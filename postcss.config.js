/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: [require('autoprefixer'), require('@tailwindcss/postcss'), require('postcss-minify')],
};

module.exports = config;
