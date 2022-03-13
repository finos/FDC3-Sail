/* eslint-env node */

import { chrome } from '../../.electron-vendors.cache.json';
import { join, resolve } from 'path';
import { builtinModules } from 'module';
import react from '@vitejs/plugin-react';

const PACKAGE_ROOT = __dirname;

/**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
const config = {
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  resolve: {
    alias: {
      '/@/': join(PACKAGE_ROOT, 'src') + '/'
    },
  },
  plugins: [react()],
  base: '',
  server: {
    fs: {
      strict: true,
    },
  },
  build: {
    sourcemap: true,
    target: `chrome${chrome}`,
    outDir: 'dist',
    assetsDir: '.',
    rollupOptions: {
      external: [...builtinModules.flatMap((p) => [p, `node:${p}`])],
      input:{
        'index':'index.html',
        'defaultView/index':'./defaultView/index.html',
        'channelPicker/index':resolve(__dirname, 'channelPicker/index.html'),
        'intentResolver/index':'./intentResolver/index.html',
        'searchResults/index':'./searchResults/index.html'
      },
     
    },
    emptyOutDir: true,
    brotliSize: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
};

export default config;
