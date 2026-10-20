import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { evaluateApp } from './app.js';

async function openStudy(page, { reduced = false, fallback = false } = {}) {
  await page.addInitScript(({ reduced, fallback }) => {
    localStorage.setItem('caseFile:letters', JSON.stringify(['invitation']));
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: reduced ? 'reduced' : 'system' }));
    if (fallback) {
      const context = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (this.classList.contains('prologue-rain') && type === 'webgl') return null;
        return context.call(this, type, ...args);
      };
    }
  }, { reduced, fallback });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  // Mount the real interactive study independently of the 75-second film.
  await page.evaluate(async reduced => {
    const [{ Scope }, { playPrologue }] = await Promise.all([
      import('/src/shared/Scope.js'), import('/src/ui/prologue.js'),
    ]);
    window.studyScope = new Scope();
    await playPrologue(window.studyScope, { reducedMotion: reduced, revealImmediately: true });
  }, reduced);
  await expect(page.locator('.prologue-photo')).toHaveJSProperty('complete', true);
  await expect(page.locator('.prologue-rain')).toHaveCount(1);
}

async function waterPixels(page) {
  return page.locator('.prologue-rain').evaluate(canvas => new Promise(resolve => requestAnimationFrame(() => {
    const gl = canvas.getContext('webgl');
    let pixels;
    if (gl) {
      pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    } else pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const at = (x, y) => {
      const px = Math.floor(x / 716 * canvas.width);
      const py = Math.floor(y / 502 * canvas.height);
      return pixels[((gl ? canvas.height - 1 - py : py) * canvas.width + px) * 4 + 3];
    };
    let wet = 0, hash = 0, alphaHash = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 12) wet++;
      hash = (Math.imul(hash, 31) + pixels[i] + pixels[i + 3]) | 0;
      alphaHash = (Math.imul(alphaHash, 31) + pixels[i + 3]) | 0;
    }
    const bars = [];
    // Both vertical bars, the crossbar, and the foreground books/ornament.
    for (let y = 10; y < 480; y += 4) bars.push(at(203, y), at(447, y));
    for (let x = 20; x < 690; x += 4) bars.push(at(x, 164));
    bars.push(at(35, 400), at(45, 465), at(688, 475), at(350, 499));
    resolve({ wet, hash, alphaHash, outside: Math.max(...bars), gpu: Boolean(gl), width: canvas.width, height: canvas.height });
  })));
}

test('rain refracts only the glass, keeps moving after resize and leaves the desk interactive', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openStudy(page);
  await expect.poll(async () => (await waterPixels(page)).wet).toBeGreaterThan(50);
  const first = await waterPixels(page);
  expect(first.gpu).toBe(true);
  expect(first.outside).toBe(0);
  mkdirSync('.artifacts/study-rain-review', { recursive: true });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '.artifacts/study-rain-review/desk.png' });
  await expect.poll(async () => (await waterPixels(page)).hash).not.toBe(first.hash);
  const intervals = await page.evaluate(() => new Promise(resolve => {
    const values = [];
    let last = performance.now();
    const sample = now => {
      values.push(now - last); last = now;
      if (values.length < 90) requestAnimationFrame(sample);
      else resolve(values.sort((a, b) => a - b));
    };
    requestAnimationFrame(sample);
  }));
  writeFileSync('.artifacts/study-rain-review/frame-timing.json', JSON.stringify({
    medianMs: intervals[45], p95Ms: intervals[85], maxMs: intervals[89],
  }, null, 2));
  for (const [name, width, height] of [['wide', 1920, 1080], ['compact', 1100, 720]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    expect((await waterPixels(page)).outside).toBe(0);
    await page.screenshot({ path: `.artifacts/study-rain-review/${name}.png` });
  }
  await page.getByRole('button', { name: 'Open the letter', exact: true }).click();
  await expect(page.locator('.prologue-reading')).toBeVisible();
  await page.locator('.prologue-go').click();
  await expect(page.locator('#prologue')).toHaveAttribute('data-step', 'file');
  await page.getByRole('button', { name: 'Open the Ashcombe file', exact: true }).click();
  await page.locator('.prologue-go').click();
  await expect(page.locator('.prologue-onward')).toBeVisible();
  await page.evaluate(() => window.studyScope.dispose());
  await expect(page.locator('#prologue, .prologue-rain')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('loss of the GPU uses photographic droplets and releases the rain on exit', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openStudy(page);
  await expect.poll(async () => (await waterPixels(page)).wet).toBeGreaterThan(50);
  await page.locator('.prologue-rain').evaluate(canvas => canvas.getContext('webgl').getExtension('WEBGL_lose_context').loseContext());
  await expect.poll(async () => (await waterPixels(page)).gpu).toBe(false);
  const first = await waterPixels(page);
  expect(first.outside).toBe(0);
  await expect.poll(async () => (await waterPixels(page)).hash).not.toBe(first.hash);
  await page.evaluate(() => window.studyScope.dispose());
  await expect(page.locator('.prologue-rain')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('without WebGL, reduced motion leaves still water and the photograph aligned', async ({ page }) => {
  await openStudy(page, { reduced: true, fallback: true });
  const first = await waterPixels(page);
  expect(first.gpu).toBe(false);
  expect(first.wet).toBeGreaterThan(20);
  await page.waitForTimeout(250);
  // Compare the water's positions, independent of canvas colour conversion.
  expect((await waterPixels(page)).alphaHash).toBe(first.alphaHash);
  await page.setViewportSize({ width: 1920, height: 1080 });
  expect((await waterPixels(page)).outside).toBe(0);
  await page.evaluate(() => window.studyScope.dispose());
  await expect(page.locator('.prologue-rain')).toHaveCount(0);
  // No interaction or scene change was necessary to render the static water.
  expect(await evaluateApp(page, ({ services }) => services.levels.completedCount)).toBe(0);
});
