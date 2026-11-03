// Field-notes PDF production. Run only when document regeneration is requested.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { BOOK_TITLE, BOOK_LANGUAGES, getBookCopy } from '../../src/ui/decoderBook/copy.js';
import { renderChapter, escapeHTML } from '../../src/ui/decoderBook/render.js';

const target = 'public/assets/books';
await mkdir(target, { recursive: true });
const [documentCSS, fontCSS] = await Promise.all([
  readFile('src/ui/decoderBook/document.css', 'utf8'), readFile('src/ui/styles/ui-fonts.css', 'utf8'),
]);
const fonts = fontCSS.replaceAll("url('/assets/", "url('../");
for (const language of BOOK_LANGUAGES) {
  const c = getBookCopy(language);
  await writeFile(`${target}/decoders-book-fibonacci-${language}.html`, `<!doctype html>
<html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHTML(BOOK_TITLE)} — Fibonacci</title><meta name="description" content="${escapeHTML(c.cover.statement)}"><style>${fonts}\nbody{margin:0;background:#d9d4c8;}\n${documentCSS}</style></head><body>${renderChapter(language)}</body></html>`);
}
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const context = await browser.newContext({ viewport: { width: 1000, height: 1200 } });
try {
  for (const language of BOOK_LANGUAGES) {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:5173/assets/books/decoders-book-fibonacci-${language}.html`);
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, tagged: true });
    await writeFile(`${target}/decoders-book-fibonacci-${language}.pdf`, pdf);
    console.log(`Saved ${target}/decoders-book-fibonacci-${language}.pdf`);
    await page.close();
  }
} finally { await context.close(); await browser.close(); }
