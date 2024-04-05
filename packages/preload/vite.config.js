import { chrome } from '../../.electron-vendors.cache.json';
import { join, resolve } from 'path';
import { builtinModules } from 'module';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import tsConfigPaths from 'rollup-plugin-tsconfig-paths';

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
      '/@main/': resolve(PACKAGE_ROOT, '../main/src') + '/',
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
        'fdc3-1.2/index': '/src/fdc3-1.2/index.ts',
        'fdc3-2.0/index': '/src/fdc3-2.0/index.ts',
        'connectifi/index': '/src/connectifi/index.ts',
        'system/index': '/src/system/index.ts',
        'systemView/index': '/src/systemView/index.ts',
      },
    },
    emptyOutDir: true,
    brotliSize: false,
    plugins: [nodeResolve({ extensions: ['.tsx', '.ts'] }), tsConfigPaths()],
  },
};

export default config;
