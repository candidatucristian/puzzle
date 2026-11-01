// Visual contact sheets of the real menu markup/CSS, without starting a game,
// touching saved progress, running assertions, or launching a test runner.
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { readFile, mkdir } from 'node:fs/promises';
const out = '.artifacts/archive-black-v2';
await mkdir(out, { recursive: true });
const styles = ['index', 'casefile-materials', 'notebook-materials', 'archive-tools-native', 'archive-black'];
const html = (await readFile('index.html', 'utf8'))
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<link\b[^>]*https:\/\/fonts\.[^>]*>/gi, '')
  .replace('</head>', styles.map(name => `<link rel="stylesheet" href="/src/ui/styles/${name}.css">`).join('') + '</head>');
const server = await createServer({ configFile: false, root: process.cwd(), server: { host: '127.0.0.1', port: 0 }, logLevel: 'error',
  plugins: [{ name: 'archive-contact-sheet', configureServer(dev) {
    dev.middlewares.use((req, res, next) => {
      if (req.url !== '/__archive_review') return next();
      res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html);
    });
  } }],
});
await server.listen();
let browser, context;
try {
  browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__archive_review`);
  await page.evaluate(async () => {
    const keep = ['.icon-library', '.app-header', '#casefile-modal', '#notebook-modal'].map(s => document.querySelector(s));
    document.body.replaceChildren(...keep.filter(Boolean));
    document.body.style.background = '#211e19';
    document.documentElement.dataset.reducedMotion = 'true';
    const { LETTERS } = await import('/src/shared/story.js');
    const { renderLetter } = await import('/src/ui/letterPage.js');
    const letter = LETTERS[0];
    renderLetter(document.getElementById('casefile-reader'), letter, { paper: false, seal: false });
    document.getElementById('casefile-document-title').textContent = letter.title;
    document.getElementById('casefile-document-origin').textContent = 'Found ' + letter.found;
    document.getElementById('casefile-document-number').textContent = '01 / 05';
    document.getElementById('casefile-letter-list').innerHTML = LETTERS.map((v,i) => `<li><button class="dossier-slip${i === 0 ? ' is-current' : ''}"><span class="slip-no">0${i+1}</span><span class="slip-title">${v.title}</span></button></li>`).join('');
    document.getElementById('casefile-letter-count').textContent = '5 of 5 filed';
    document.getElementById('casefile-modal').classList.remove('hidden');
    document.getElementById('notebook-title').textContent = 'Room I · The Study';
    document.getElementById('notebook-text').value = 'The clock has stopped.\nLook at the books beside the window.';
    document.getElementById('notebook-folders').innerHTML = '<li class="shelf-folder"><button class="folder-tab"><span class="folder-name">Observations</span><span class="folder-count">2</span></button></li>';
    document.getElementById('notebook-save-folder').textContent = 'Observations';
    const canvas = document.getElementById('notebook-sketch'); canvas.width=640; canvas.height=300;
    const g=canvas.getContext('2d'); g.strokeStyle='#514532'; g.lineWidth=1.5;
    g.beginPath(); g.ellipse(320,145,82,82,0,0,Math.PI*2); g.moveTo(320,145); g.lineTo(320,92); g.moveTo(320,145); g.lineTo(359,170); g.stroke();
    for(let n=0;n<12;n++) { const a=n*Math.PI/6; g.beginPath(); g.moveTo(320+Math.sin(a)*69,145-Math.cos(a)*69); g.lineTo(320+Math.sin(a)*75,145-Math.cos(a)*75); g.stroke(); }
    await document.fonts.ready;
    await Promise.all([...document.styleSheets].flatMap(sheet => {
      try { return [...sheet.cssRules].flatMap(rule => [...(rule.cssText || '').matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m => m[1])); } catch { return []; }
    }).filter(url => url.includes('ArchiveTools')).map(url => new Promise(resolve => { const img = new Image(); img.onload = img.onerror = resolve; img.src = url; })));
  });
  await page.screenshot({ path: `${out}/casefile-interface.png` });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: `${out}/casefile-interface-compact.png` });
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.evaluate(() => { document.getElementById('casefile-modal').classList.add('hidden'); document.getElementById('notebook-modal').classList.remove('hidden'); });
  await page.locator('#notebook-modal').screenshot({ path: `${out}/notebook-interface.png` });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => { const c=document.querySelector('.notebook-content'); c.scrollTop=c.scrollHeight; });
  await page.locator('#notebook-modal').screenshot({ path: `${out}/notebook-interface-bottom.png` });
  console.log('Saved four visual interface captures. No assertions or game storage changes.');
} finally {
  await context?.close(); await browser?.close(); await server.close();
}
