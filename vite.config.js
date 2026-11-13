import { defineConfig } from 'vite';
import { demoBuild } from './scripts/demo-build.mjs';
import { fullBuild } from './scripts/full-build.mjs';
import { todoNotes } from './scripts/todo-notes.mjs';

// `--mode demo` builds the web demo into dist-demo/ (scripts/demo-build.mjs):
// the hall and Rooms I to III, nothing of the rest of the house.
// `--mode full` builds the whole game for the web into dist-full/
// (scripts/full-build.mjs): every room, every door open, the web film.
// todoNotes() keeps the to-do page's notes in todo/notes.json (dev server only).
export default defineConfig(({ mode }) => {
  const demo = mode === 'demo', full = mode === 'full';
  return {
    base: './',
    define: { __DEMO_BUILD__: JSON.stringify(demo), __FULL_BUILD__: JSON.stringify(full) },
    plugins: [todoNotes(), ...(demo ? [demoBuild()] : []), ...(full ? [fullBuild()] : [])],
    build: {
      outDir: demo ? 'dist-demo' : full ? 'dist-full' : 'dist',
      // Phaser is intentionally a separate cached vendor chunk.
      rollupOptions: { output: { manualChunks: id => id.includes('/node_modules/phaser/') ? 'phaser' : undefined } },
    },
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
  };
});
