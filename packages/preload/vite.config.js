import { chrome } from '../../.electron-vendors.cache.json';
import { join } from 'path';
import { builtinModules } from 'module';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const PACKAGE_ROOT = __dirname;

/**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
const config = {
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  envDir: process.cwd(),
  resolve: {
    alias: {
      '/@/': join(PACKAGE_ROOT, 'src') + '/',
    },
  },
  build: {
    sourcemap: 'inline',
    target: `chrome${chrome}`,
    outDir: 'dist',
    assetsDir: '.',
    minify: process.env.MODE !== 'development',
    lib: {
      entry: 'src/index.ts',
      formats: ['cjs'],
    },
    rollupOptions: {
      external: [
        'electron',
        ...builtinModules.flatMap((p) => [p, `node:${p}`]),
      ],
      output: {
        entryFileNames: '[name].cjs',
      },
      input: {
        'frame/index': '/src/frame/index.ts',
        'channelPicker/index': '/src/channelPicker/index.ts',
        'view/index': '/src/view/index.ts',
        'homeView/index': '/src/homeView/index.ts',
        'intentResolver/index': '/src/intentResolver/index.ts',
        'searchResults/index': '/src/searchResults/index.ts',
      },
    },
    emptyOutDir: true,
    brotliSize: false,
    plugins: [nodeResolve()],
  },
};

export default config;
