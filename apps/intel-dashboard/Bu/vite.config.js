import { defineConfig } from 'vite';

export default defineConfig({
  base: '/WatchLockAI/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});
