import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { evaluateApp } from './app.js';

async function open(page, { returning = false, reduced = false } = {}) {
  await page.addInitScript(({ returning, reduced }) => {
    if (returning) localStorage.setItem('caseFile:letters', JSON.stringify(['invitation']));
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: reduced ? 'reduced' : 'system' }));
  }, { returning, reduced });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
}

async function playFilm(page) {
  const film = page.locator('#intro-video video');
  await expect(page.locator('#intro-video')).toBeVisible();
  await expect.poll(async () => {
    const next = page.getByRole('button', { name: /Next/, exact: false });
    if (await next.isVisible()) {
      await next.click().catch(() => {});
    }
    const begin = page.getByRole('button', { name: /Begin/, exact: false });
    if (await begin.isVisible()) {
      await begin.click().catch(() => {});
    }
    return page.locator('#intro-video').getAttribute('data-phase');
  }, { timeout: 15000 }).toMatch(/ready|playing/);

  if (await page.locator('#intro-video-play').isVisible()) await page.locator('#intro-video-play').click();
  await expect.poll(() => film.evaluate(v => !v.paused && v.currentTime > 0 && v.videoWidth > 0)).toBe(true);
  return film;
}

async function newGame(page) {
  await page.locator('#btn-options').click();
  await page.getByRole('tab', { name: 'Options', exact: true }).click();
  await page.locator('#btn-new').click();
  await page.locator('#btn-new').click();
}

test('the concise opening stays readable and leads through the film into the interactive desk', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await open(page);
  mkdirSync('.artifacts/intro-copy-review', { recursive: true });
  await expect(page.locator('#intro-video')).toHaveAttribute('data-phase', 'titles');
  await expect(page.locator('.intro-card.is-title')).toBeVisible();
  await expect(page.locator('.intro-card-title')).toContainText('The Ashcombe Case');
  await page.locator('.intro-page-play').click();
  await expect(page.locator('.intro-card.is-story')).toBeVisible();
  await expect(page.locator('.intro-card.is-story')).toContainText('For twenty-two years, Inspector Arthur Wren');
  for (const [label, width, height] of [['desktop', 1440, 1000], ['landscape', 863, 360]]) {
    await page.setViewportSize({ width, height });
    const box = await page.locator('.intro-card.is-story').boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    await expect(page.getByRole('button', { name: /Begin/, exact: false })).toBeVisible();
    await page.screenshot({ path: `.artifacts/intro-copy-review/note-${label}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const film = await playFilm(page);
  await expect(page.getByRole('button', { name: 'SKIP INTRO', exact: true })).toBeVisible();
  const metadata = await film.evaluate(v => ({ src: v.currentSrc, duration: v.duration, width: v.videoWidth, height: v.videoHeight }));
  expect(metadata.src).toContain('/assets/video/IntroVideo.mp4');
  expect(metadata.duration).toBeGreaterThan(75);
  expect(metadata.width).toBeGreaterThan(0);
  const bars = await page.locator('#intro-video').evaluate(el => ({
    top: parseFloat(getComputedStyle(el, '::before').height) / el.clientHeight,
    bottom: parseFloat(getComputedStyle(el, '::after').height) / el.clientHeight,
    filter: getComputedStyle(el.querySelector('video')).filter,
  }));
  expect(bars.top).toBeCloseTo(0.10);
  expect(bars.bottom).toBeCloseTo(0.10);
  expect(bars.filter).toContain('brightness(0.58)');
  await expect(page.locator('#cold-open')).toHaveCount(0);
  writeFileSync('.artifacts/intro-copy-review/film-metadata.json', JSON.stringify(metadata, null, 2));
  // Every passage is readable as a complete thought, with an empty beat between them.
  for (const [time, text] of [[3, 'That night'], [12, 'Twenty-two years'], [23, 'only a small boy'], [33, 'first man at the door'],
    [42, 'read the file'], [49, 'table had been laid for four'], [58, 'father died with the answer'], [66, 'written to him']]) {
    await film.evaluate((v, time) => { v.currentTime = time; }, time);
    const aside = page.locator('.intro-aside:not(.is-out)');
    await expect(aside).toHaveCount(1);
    await expect(aside).toContainText(text);
    await expect(aside).toHaveCSS('opacity', '1');
    const box = await aside.boundingBox();
    expect(box.y).toBeGreaterThan(0);
    expect(box.x + box.width).toBeLessThan(page.viewportSize().width);
    if (time === 12 || time === 49) await page.screenshot({ path: `.artifacts/intro-copy-review/film-${time}.png` });
  }
  await film.evaluate(v => { v.currentTime = 72; });
  await expect(page.locator('.intro-aside')).toHaveCount(0);
  // The current film settles at 74.9 s, then the camera moves into the game.
  await film.evaluate(v => { v.currentTime = 74.6; });
  await expect(page.locator('.intro-video-desk')).toBeVisible();
  await expect(page.locator('#prologue')).toHaveCount(1);
  await expect(page.locator('#prologue')).toHaveAttribute('data-phase', 'opening');
  await expect(page.locator('#prologue')).toHaveJSProperty('inert', true);
  await expect(page.locator('.prologue-tasks')).toHaveCSS('opacity', '0');
  await expect(page.locator('.prologue-photo')).toHaveJSProperty('complete', true);
  const deskSource = await page.locator('.intro-video-desk img').evaluate(img => img.currentSrc);
  expect(deskSource).toContain('/assets/images/Prologue/inspector-desk-film-match-v2.webp');
  await page.screenshot({ path: '.artifacts/intro-copy-review/transition.png' });
  await expect(page.locator('#intro-video')).toHaveCount(0);
  await expect(page.locator('#prologue')).toBeVisible();
  await expect(page.locator('#prologue')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('#prologue')).toHaveJSProperty('inert', false);
  expect(await page.locator('.prologue-photo').evaluate(img => img.currentSrc)).toBe(deskSource);
  await expect(page.locator('#prologue')).toHaveAttribute('data-step', 'letter');
  const framing = await page.locator('.prologue-camera').boundingBox();
  expect(framing.y).toBeLessThanOrEqual(0);
  expect(framing.height).toBeGreaterThanOrEqual(page.viewportSize().height);
  await expect(page.locator('#prologue [data-task="letter"]')).toBeVisible();
  for (const [label, width, height] of [['wide', 1920, 1080], ['compact', 1280, 800]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `.artifacts/intro-copy-review/desk-${label}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: '.artifacts/intro-copy-review/desk.png' });
  await page.getByRole('button', { name: 'Open the letter', exact: true }).click();
  await expect(page.locator('.prologue-reading.is-shown')).toBeVisible();
  await expect(page.locator('.prologue-reading')).toContainText("locked every door of Ashcombe House");
  await expect(page.locator('.prologue-reading')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: '.artifacts/intro-copy-review/invitation.png' });
  await page.locator('.prologue-go').click();
  await expect(page.locator('#prologue')).toHaveAttribute('data-step', 'file');
  await expect(page.locator('#prologue [data-task="file"]')).toBeVisible();
  await page.getByRole('button', { name: 'Open the Ashcombe file', exact: true }).click();
  await expect(page.locator('.prologue-reading.is-shown')).toBeVisible();
  await expect(page.locator('.prologue-reading')).toContainText('Four places laid. Three Ashcombes.');
  await page.locator('.prologue-go').click();
  await expect(page.locator('#prologue')).toHaveAttribute('data-step', 'done');
  await expect(page.locator('.prologue-onward')).toBeVisible();
  expect(errors).toEqual([]);
});

test('new game starts the film again and replaces a previous opening cleanly', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await open(page, { returning: true, reduced: true });
  await expect(page.locator('#intro-video')).toHaveCount(0);
  await evaluateApp(page, ({ ui, services }) => { ui.showGame(); services.levels.enterHall(); });
  await newGame(page);
  const film = await playFilm(page);
  await expect.poll(() => film.evaluate(v => !v.paused && v.currentTime > 0)).toBe(true);
  await expect(page.locator('#intro-video')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('#intro-video')).toHaveCount(0);
  await expect(page.locator('#prologue')).toHaveCount(1);
  // Reset while still at the desk: the previous desk and media must disappear.
  await newGame(page);
  await expect(page.locator('#prologue')).toHaveCount(0);
  await expect(page.locator('#intro-video')).toHaveCount(1);
  await playFilm(page);
  await expect.poll(() => film.evaluate(v => !v.paused && v.currentTime > 0)).toBe(true);
  await newGame(page);
  await expect(page.locator('#intro-video')).toHaveCount(1);
  await playFilm(page);
  await expect.poll(() => film.evaluate(v => !v.paused && v.currentTime > 0)).toBe(true);
  await page.locator('.intro-video-skip').click();
  await expect(page.locator('#intro-video')).toHaveCount(0);
  await expect(page.locator('#prologue')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('film volume follows the game and the background sound returns after the film', async ({ page }) => {
  await open(page, { reduced: true });
  const film = await playFilm(page);
  await evaluateApp(page, ({ services }) => services.audio.setMasterVolume(0.35));
  await expect(film).toHaveJSProperty('volume', 0.35);
  expect(await evaluateApp(page, ({ game }) => game.sound.volume)).toBe(0);
  await evaluateApp(page, ({ services }) => services.audio.toggleMute());
  await expect(film).toHaveJSProperty('muted', true);
  await evaluateApp(page, ({ services }) => services.audio.toggleMute());
  await expect(film).toHaveJSProperty('muted', false);
  await page.locator('.intro-video-skip').click();
  await expect(page.locator('#intro-video')).toHaveCount(0);
  expect(await evaluateApp(page, ({ game }) => game.sound.volume)).toBeCloseTo(0.35);
});

test('an unavailable film still leads to the desk without restoring the old animation', async ({ page }) => {
  await page.route('**/assets/video/IntroVideo.mp4', route => route.abort());
  await open(page, { reduced: true });
  await expect(page.locator('#prologue')).toBeVisible();
  await expect(page.locator('#intro-video')).toHaveCount(0);
  await expect(page.locator('#cold-open')).toHaveCount(0);
});
