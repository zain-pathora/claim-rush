import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: { input: { story: resolve(__dirname, 'index.html'), rush: resolve(__dirname, 'rush.html') } },
  },
  server: { port: 5173 },
});
