import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// The website, ashcombemanor.com: one page, the manor at night as the game's
// start screen has it (it borrows the game's own modules for it, from src/).
// npm run dev:site to see it, npm run build:site → site-dist/, which is what
// Cloudflare Pages is given.
const here = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  root: here,
  base: '/',
  publicDir: 'public',
  build: { outDir: fileURLToPath(new URL('../site-dist', import.meta.url)), emptyOutDir: true },
  server: { port: 5174, strictPort: true, fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
  preview: { port: 4174, strictPort: true },
});
