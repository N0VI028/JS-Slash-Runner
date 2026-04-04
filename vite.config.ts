import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import unpluginAutoImport from 'unplugin-auto-import/vite';
import { VueUseComponentsResolver, VueUseDirectiveResolver } from 'unplugin-vue-components/resolvers';
import unpluginVueComponents from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import pluginExternal from 'vite-plugin-external';

const externals = {
  jquery: '$',
  hljs: 'hljs',
  lodash: '_',
  showdown: 'showdown',
  toastr: 'toastr',
  '@popperjs/core': 'Popper',
} as const;

// Browser loads from: /scripts/extensions/third-party/<name>/dist/index.js
// Need 5x ../ to reach ST public root. The original calculation uses __dirname depth
// which only works when the project sits inside ST's public/ tree (or by CI coincidence).
// ST_IMPORT_DEPTH env var lets out-of-tree builds override the depth (default: auto-detect).
const relative_sillytavern_path = process.env.ST_IMPORT_DEPTH
  ? '../'.repeat(Number(process.env.ST_IMPORT_DEPTH)).slice(0, -1)
  : path.relative(
    path.join(__dirname, 'dist'),
    __dirname.substring(0, __dirname.lastIndexOf('public') + 6),
  );

const relative_lib_path = path.relative(path.join(__dirname, 'dist'), path.join(__dirname, 'lib'));

export default defineConfig(({ mode }) => ({
  plugins: [
    vue({
      features: {
        optionsAPI: false,
        prodDevtools: true,
        prodHydrationMismatchDetails: false,
      },
      template: {
        compilerOptions: {
          isCustomElement: tag => tag === 'toolcool-color-picker',
        },
      },
    }),
    unpluginAutoImport({
      dts: true,
      dtsMode: 'overwrite',
      imports: [
        'vue',
        'pinia',
        '@vueuse/core',
        { from: '@sillytavern/scripts/i18n', imports: ['t'] },
        { from: 'klona', imports: ['klona'] },
        { from: 'vue-final-modal', imports: ['useModal'] },
        { from: 'zod', imports: ['z'] },
      ],
      dirs: [{ glob: 'src/panel/composable', types: true }],
    }),
    unpluginVueComponents({
      dts: true,
      syncMode: 'overwrite',
      globs: ['src/panel/component/*.vue'],
      resolvers: [VueUseComponentsResolver(), VueUseDirectiveResolver()],
    }),
    {
      name: 'sillytavern_resolver',
      enforce: 'pre',
      resolveId(id) {
        if (id.startsWith('@sillytavern/')) {
          return {
            id: path.join(relative_sillytavern_path, id.replace('@sillytavern/', '')).replaceAll('\\', '/') + '.js',
            external: true,
          };
        }
      },
    },
    {
      name: 'jsoneditor_resolver',
      enforce: 'pre',
      resolveId(id) {
        if (id === 'vanilla-jsoneditor') {
          return {
            id: path.join(relative_lib_path, 'jsoneditor.js').replaceAll('\\', '/'),
            external: true,
          };
        }
      },
    },
    pluginExternal({
      externals: libname => {
        if (libname in externals) {
          return externals[libname as keyof typeof externals];
        }
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  build: {
    rollupOptions: {
      input: 'src/index.ts',
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].[hash].chunk.js',
        assetFileNames: '[name].[ext]',
        preserveModules: false,
      },
    },

    outDir: 'dist',
    emptyOutDir: false,

    sourcemap: mode === 'production' ? true : 'inline',

    minify: mode === 'production' ? 'terser' : false,
    terserOptions:
      mode === 'production'
        ? {
            format: { quote_style: 1 },
            mangle: { reserved: ['_', 'toastr', 'YAML', '$', 'z'] },
          }
        : {
            format: { beautify: true, indent_level: 2 },
            compress: false,
            mangle: false,
          },

    target: 'esnext',
  },
}));
