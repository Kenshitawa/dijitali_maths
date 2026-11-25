import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

process.env.NODE_ENV = 'production';

const reactPlugin = react();
const babelPlugin = reactPlugin[0];
const originalConfig = babelPlugin.config;
babelPlugin.config = (userConfig, env) => {
  const result = typeof originalConfig === 'function' ? originalConfig(userConfig, env) : originalConfig;
  if (result?.oxc?.jsx) {
    result.oxc.jsx.development = false;
  }
  if (result?.esbuild?.jsxOptions) {
    result.esbuild.jsxOptions.development = false;
  }
  return result;
};

export default defineConfig({
  mode: 'production',
  publicDir: false,
  plugins: reactPlugin,
  esbuild: {
    jsx: 'automatic',
    jsxDev: false,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: { '@': root },
  },
  build: {
    outDir: path.join(root, 'public', 'admin'),
    emptyOutDir: false,
    lib: {
      entry: path.join(root, 'admin-ui', 'main.jsx'),
      formats: ['es'],
      fileName: () => 'admin-ui.js',
      cssFileName: 'admin-ui',
    },
    rollupOptions: {
      output: {
        assetFileNames: 'admin-ui.[ext]',
      },
    },
  },
});
