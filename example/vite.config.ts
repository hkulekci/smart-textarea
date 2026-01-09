import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/smart-textarea/',
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      'smart-textarea': path.resolve(__dirname, '../src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
  },
});
