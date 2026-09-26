import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    // Phaser is intentionally a separate cached vendor chunk.
    rollupOptions: { output: { manualChunks: id => id.includes('/node_modules/phaser/') ? 'phaser' : undefined } },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
