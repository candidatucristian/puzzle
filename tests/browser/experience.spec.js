import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp } from './app.js';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';

async function open(page, { unlocked = false, start = true } = {}) {
  await page.addInitScript(unlockedLevel => {
    if (!localStorage.getItem('puzzleComfort')) localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced' }));
    if (unlockedLevel > 0 && !localStorage.getItem('puzzleProgress')) {
      localStorage.setItem('puzzleProgressSchema', '2');
      localStorage.setItem('puzzleUnlockedLevel', String(unlockedLevel));
    }
    localStorage.setItem('hasPlayedBefore', 'true');
  }, typeof unlocked === 'number' ? unlocked : unlocked ? 17 : 0);
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  if (start) await page.locator('#btn-continue').click();
}
async function navigate(page, key) {
  await evaluateApp(page, ({ ui, services }, key) => ui.navigate(services.levels.definitions.findIndex(level => level.key === key), { quick: true }), key);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe(key);
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
}
async function screenshot(page, name) {
  mkdirSync('.artifacts/after', { recursive: true });
  await page.screenshot({ path: `.artifacts/after/UX-${name}.png` });
}

test('the title page uses the same cratered moon texture as the garden', async ({ page }) => {
  await open(page, { start: false, unlocked: true });
  const moon = page.locator('#start-moon');
  await expect(moon).toBeVisible();
  const titleMoon = await moon.evaluate(canvas => ({
    width: canvas.width,
    height: canvas.height,
    centerAlpha: canvas.getContext('2d').getImageData(256, 256, 1, 1).data[3],
    cornerAlpha: canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3],
  }));
  expect(titleMoon.width).toBe(512);
  expect(titleMoon.height).toBe(512);
  expect(titleMoon.centerAlpha).toBeGreaterThan(0);
  expect(titleMoon.cornerAlpha).toBe(0);
  await navigate(page, 'PlantPot');
  const sameMoon = await evaluateApp(page, ({ game }) => {
    const canvas = game.textures.get('tele_moon').getSourceImage();
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return {
      width: canvas.width,
      height: canvas.height,
      centerAlpha: pixels[(256 * canvas.width + 256) * 4 + 3],
      cornerAlpha: pixels[3],
    };
  });
  expect(sameMoon).toEqual({
    width: titleMoon.width,
    height: titleMoon.height,
    centerAlpha: titleMoon.centerAlpha,
    cornerAlpha: titleMoon.cornerAlpha,
  });
});

test('the display font preview loads DM Serif Display and keeps the title compact and upright', async ({ page }) => {
  await open(page, { start: false });
  const fonts = await page.evaluate(async () => {
    await document.fonts.load('400 48px "DM Serif Display"', 'The Descipher');
    return {
      loaded: document.fonts.check('400 48px "DM Serif Display"', 'The Descipher'),
      title: getComputedStyle(document.querySelector('#start-title h1')).fontFamily,
      titleSize: getComputedStyle(document.querySelector('#start-title h1')).fontSize,
      text: document.querySelector('#start-title h1').innerText.replace(/\s+/g, ' ').trim(),
    };
  });
  expect(fonts.loaded).toBe(true);
  expect(fonts.title).toContain('DM Serif Display');
  expect(Number.parseFloat(fonts.titleSize)).toBeLessThanOrEqual(74);
  expect(fonts.text).toBe('The Descipher');
  await expect(page.locator('.app-signature')).toHaveCount(0);
  const headerPositions = await page.evaluate(() => ({
    actions: document.querySelector('.header-actions').getBoundingClientRect().left,
    navigation: document.querySelector('.room-navigation').getBoundingClientRect().left,
  }));
  expect(headerPositions.actions).toBeLessThan(headerPositions.navigation);
});

test('hints reveal individually, remember each room, and reset with the game', async ({ page }) => {
  await open(page, { unlocked: true }); await navigate(page, 'Cryptex');
  await expect(page.locator('#current-level-number')).toHaveText('ROOM 04');
  await expect(page.locator('#current-level-summary')).toHaveText(LEVEL_METADATA[3].summary);
  await expect(page.locator('#current-hint-count')).toHaveText('0 of 3 hints revealed');
  await page.locator('#btn-info').click();
  await expect(page.locator('#hint-list li')).toHaveCount(1);
  await expect(page.locator('#hint-list')).not.toContainText('three breaths');
  await page.locator('#btn-next-hint').click();
  await expect(page.locator('#hint-list li')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(page.locator('#current-hint-count')).toHaveText('2 of 3 hints revealed');
  await page.locator('#btn-info').click();
  await expect(page.locator('#hint-list li')).toHaveCount(2);
  await page.locator('#btn-next-hint').click();
  await expect(page.locator('#btn-next-hint')).toBeDisabled();
  await expect(page.locator('#hint-list li')).toHaveCount(3);
  await screenshot(page, 'hints');
  await page.keyboard.press('Escape');
  await navigate(page, 'Wires'); await page.locator('#btn-info').click();
  await expect(page.locator('#hint-list li')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await page.locator('#btn-continue').click(); await navigate(page, 'Cryptex');
  await page.locator('#btn-info').click();
  await expect(page.locator('#hint-list li')).toHaveCount(3);
  await page.keyboard.press('Escape'); await page.locator('#btn-options').click();
  await page.locator('#btn-new').click(); await page.locator('#btn-new').click();
  await expect(page.locator('#progress-count')).toHaveText(`0 / ${LEVEL_METADATA.length} solved`);
  await expect(page.locator('#current-level-number')).toHaveText('ROOM 01');
  await expect(page.locator('#current-level-state')).toHaveCount(0);
  await expect(page.locator('#current-hint-count')).toHaveText('0 of 3 hints revealed');
  expect(await evaluateApp(page, ({ services }) => services.hints.count('cryptex'))).toBe(0);
  expect(await evaluateApp(page, ({ services }) => services.preferences.reducedMotion)).toBe(true);
});

test('progress, solved rooms, thumbnails and Continue survive reload', async ({ page }) => {
  await open(page);
  await expect(page.locator('#current-level-state')).toHaveCount(0);
  await expect(page.locator('.level-btn').nth(1)).toBeDisabled();
  await page.locator('#level-code').fill('CABBAGE'); await page.locator('#btn-submit').click();
  await expect(page.locator('#progress-count')).toHaveText(`1 / ${LEVEL_METADATA.length} solved`);
  await expect(page.locator('.level-btn.solved')).toHaveCount(1);
  await expect(page.locator('.level-btn').nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('.level-btn').nth(1).locator('img')).toBeVisible({ timeout: 12000 });
  await expect(page.locator('#save-status')).toHaveText('Saved on this device');
  await screenshot(page, 'progress');
  await page.reload();
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await expect(page.locator('#btn-continue')).toHaveText('Continue · Level 2');
  await expect(page.locator('#start-progress')).toContainText(`1 of ${LEVEL_METADATA.length} rooms solved`);
  await screenshot(page, 'continue');
  await page.locator('#btn-continue').click();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('PlantPot');
  await expect(page.locator('.level-btn').nth(1).locator('img')).toBeVisible();
  await page.locator('.level-btn').first().click();
  await expect(page.locator('#current-level-state')).toHaveCount(0);
});

test('header arrows navigate unlocked rooms and the footer shows only the room number', async ({ page }) => {
  await open(page, { unlocked: 1 });
  await expect(page.locator('.room-title-line')).toHaveText('ROOM 02');
  await expect(page.locator('#current-level-state')).toHaveCount(0);
  await expect(page.locator('#sidebar h2')).toHaveCount(0);
  await expect(page.locator('#header-room')).toHaveAttribute('aria-label', 'Current level: The Moonlit Garden, level II');
  await expect(page.locator('#header-room-name')).toHaveText('The Moonlit Garden');
  await expect(page.locator('#header-progress')).toHaveText('II');
  expect(await page.locator('#header-progress').evaluate(el => getComputedStyle(el).fontFamily))
    .toBe(await page.locator('#header-room').evaluate(el => getComputedStyle(el).fontFamily));
  expect(await page.locator('#header-progress').evaluate(el => getComputedStyle(el).fontSize))
    .toBe(await page.locator('#header-room').evaluate(el => getComputedStyle(el).fontSize));
  expect(await page.locator('#current-level-number').evaluate(el => getComputedStyle(el).fontVariantNumeric))
    .toContain('lining-nums');
  await expect(page.locator('#room-previous')).toBeEnabled();
  await expect(page.locator('#room-next')).toBeDisabled();
  await page.locator('#room-previous').click();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.currentIndex)).toBe(0);
  await expect(page.locator('.room-title-line')).toHaveText('ROOM 01');
  await expect(page.locator('#header-room')).toHaveAttribute('aria-label', 'Current level: The Old Tree, level I');
  await expect(page.locator('#header-room-name')).toHaveText('The Old Tree');
  await expect(page.locator('#header-progress')).toHaveText('I');
  await expect(page.locator('#room-previous')).toBeDisabled();
  await page.locator('#room-next').click();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.currentIndex)).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.locator('#current-level-number').evaluate(el => getComputedStyle(el).fontSize)).toBe('20px');
});

test('level 2 gives the draggable bucket a subtle sparkle cue', async ({ page }) => {
  await open(page, { unlocked: true });
  await navigate(page, 'PlantPot');
  await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'system' }));
  await evaluateApp(page, ({ services }) => {
    const scene = services.levels.activeScene;
    scene.input.emit('gameobjectover', { x: scene.bucket.x, y: scene.bucket.y }, scene.bucket);
  });
  await expect(page.locator('#interaction-cue')).toHaveText('Drag to move');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.children.list
    .filter(object => object.type === 'Graphics' && object.depth === 10000).length)).toBe(0);
  const glints = () => evaluateApp(page, ({ services }) => {
    const scene = services.levels.activeScene;
    return {
      anchors: scene.bucketGlints.list.slice(0, 4).map(glint => ({ visible: glint.visible, alpha: glint.alpha })),
      particles: scene._bucketSparklePool.map(particle => ({
        visible: particle.image.visible,
        y: particle.image.y,
        age: particle.age,
      })),
    };
  });
  await expect.poll(async () => (await glints()).anchors.filter(glint => glint.visible)).toHaveLength(4);
  await expect.poll(async () => Math.max(...(await glints()).anchors.map(glint => glint.alpha))).toBeGreaterThan(0.4);
  await expect.poll(async () => (await glints()).particles.filter(particle => particle.visible).length).toBeGreaterThan(0);
  await screenshot(page, 'level-2-bucket-sparkle');
  const risingParticle = await evaluateApp(page, ({ services }) => {
    const scene = services.levels.activeScene;
    scene._bucketSparkleTimer = 10000;
    scene._spawnBucketSparkle();
    return scene._bucketSparklePool.findIndex(particle => particle.image.visible);
  });
  const initialY = await evaluateApp(page, ({ services }, index) =>
    services.levels.activeScene._bucketSparklePool[index].image.y, risingParticle);
  await evaluateApp(page, ({ services }) => services.levels.activeScene._updateBucketSparkles(180));
  const risingY = await evaluateApp(page, ({ services }, index) =>
    services.levels.activeScene._bucketSparklePool[index].image.y, risingParticle);
  expect(risingY).toBeLessThan(initialY);
  await evaluateApp(page, ({ services }) => services.levels.activeScene._updateBucketSparkles(1000));
  expect(await evaluateApp(page, ({ services }, index) => services.levels.activeScene._bucketSparklePool[index].image.visible, risingParticle)).toBe(false);
});

for (const [key, expected] of [
  ['Sequence', 6], ['Curtain', 1], ['Venetian', 1],
  ['Bookshelf', 5], ['Chemistry', 5], ['Billiards', 6],
  ['Cryptex', 2], ['MobilePhone', 1], ['Lightswitch', 1],
  ['Telescope', 1], ['Overtime', 1], ['Compass', 1],
]) {
  test(`${key} puzzle items receive sparkle cues`, async ({ page }) => {
    await open(page, { unlocked: 33 });
    await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'system' }));
    await navigate(page, key);
    await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene.children.list
      .filter(object => object.getData?.('movableSparkles')).length)).toBe(expected);
    if (key === 'Sequence') await screenshot(page, 'sequence-draggable-sparkles');
  });
}

for (const key of ['Chessboard', 'TV', 'Modem', 'Wires', 'Station', 'Pi', 'Crossing', 'Flags', 'TapCode', 'Rally', 'Fireworks']) {
  test(`${key} has no sparkle cues`, async ({ page }) => {
    await open(page, { unlocked: 33 });
    await navigate(page, key);
    await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene.children.list
      .filter(object => object.getData?.('movableSparkles')).length)).toBe(0);
  });
}

test('inspection magnifies Phaser and DOM together and does not operate the puzzle', async ({ page }) => {
  await open(page, { unlocked: true }); await navigate(page, 'Cryptex');
  const candle = page.locator('.candle-action');
  await candle.hover();
  await expect(page.locator('#interaction-cue')).toHaveText('Put out the candle');
  const initial = await candle.boundingBox();
  await page.locator('#btn-inspect').click();
  await expect(page.locator('#inspection-tools')).toBeVisible();
  expect((await candle.boundingBox()).width).toBeCloseTo(initial.width * 2, 1);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.input.enabled)).toBe(false);
  await page.locator('#inspection-glass').click({ position: { x: 300, y: 200 } });
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('+');
  await expect(page.locator('#inspection-zoom')).toHaveText('2.5×');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.candle.clicks)).toBe(0);
  await screenshot(page, 'inspect');
  await page.keyboard.press('Escape');
  await expect(page.locator('#btn-inspect')).toBeFocused();
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.input.enabled)).toBe(true);
  await candle.click();
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.candle.clicks)).toBe(1);
  await page.locator('#btn-inspect').click();
  await page.locator('#btn-options').click();
  await expect(page.locator('#inspection-tools')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.locator('#btn-inspect').click(); await navigate(page, 'TV');
  await expect(page.locator('#inspection-tools')).toBeHidden();
  // the set tunes itself every four seconds; the readings below must not straddle a tick
  await evaluateApp(page, ({ services }) => services.levels.activeScene._autoTimer.remove(false));
  const channel = await evaluateApp(page, ({ services }) => services.levels.activeScene._channel);
  await page.locator('#btn-inspect').click(); await page.keyboard.press('ArrowRight');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._channel)).toBe(channel);
  await page.keyboard.press('Escape');
  await page.locator('.da-btn[data-dir="1"]').focus(); await page.keyboard.press('Enter');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._channel)).toBe((channel + 1) % 4);
});

test('comfort controls apply immediately, persist, and follow device preferences', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await open(page, { unlocked: true }); await navigate(page, 'Cryptex');
  await page.locator('#btn-options').click();
  await page.locator('#grain-slider').fill('0');
  await page.locator('#reading-size').selectOption('1.3');
  await page.locator('#reading-size').focus(); await page.keyboard.press('Tab');
  await expect(page.locator('#motion-setting')).toBeFocused();
  await page.locator('#ambient-effects').uncheck();
  await expect(page.locator('#film-grain')).toHaveCSS('opacity', '0');
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator('#btn-close-options')).toBeInViewport();
  await page.locator('#btn-howto').click();
  await expect(page.locator('#options-modal')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('#btn-howto')).toBeFocused();
  await expect(page.locator('#reading-size')).toHaveValue('1.3');
  await screenshot(page, 'comfort');
  await page.locator('#btn-close-options').click();
  await page.waitForTimeout(500); // the responsive scene rebuild uses a 350 ms debounce
  await page.locator('#btn-info').click();
  await page.locator('#btn-next-hint').click(); await page.locator('#btn-next-hint').click();
  await expect(page.locator('#btn-close-info')).toBeInViewport();
  const panel = await page.locator('#info-modal .modal-content').boundingBox();
  expect(panel.y).toBeGreaterThanOrEqual(30);
  expect(panel.y + panel.height).toBeLessThanOrEqual(738);
  await screenshot(page, 'hints-large');
  await page.keyboard.press('Escape');
  const frame = await evaluateApp(page, ({ services }) => services.levels.activeScene.candle._frame);
  await page.waitForTimeout(300);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.candle._frame)).toBe(frame);
  await page.reload(); await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await page.locator('#btn-continue').click(); await page.locator('#btn-options').click();
  await expect(page.locator('#grain-slider')).toHaveValue('0');
  await expect(page.locator('#reading-size')).toHaveValue('1.3');
  await expect(page.locator('#ambient-effects')).not.toBeChecked();
  await page.locator('#motion-setting').selectOption('system');
  await page.locator('#ambient-effects').check();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'false');
  expect(errors).toEqual([]);
});

test('reduced effects retain Morse, router signals and race progression', async ({ page }) => {
  await open(page, { unlocked: true }); await navigate(page, 'Lightswitch');
  await evaluateApp(page, ({ services }) => { services.levels.activeScene.time.timeScale = 10; });
  await page.locator('#blk-switch').focus(); await page.keyboard.press('Enter');
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._letterIdx)).toBe(1);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._busy)).toBe(false);
  await navigate(page, 'Modem');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._timerEvents.length)).toBeGreaterThan(0);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._leds.slice(5, 7).some(led => led.core.alpha > 0))).toBe(true);
  await navigate(page, 'Rally');
  await evaluateApp(page, ({ services }) => {
    services.levels.activeScene.time.timeScale = 20;
    services.levels.activeScene.tweens.timeScale = 20;
  });
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._finished), { timeout: 25000 }).toBe(true);
});

test('unavailable storage reports session-only progress while still allowing play', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); }; });
  await page.goto('/'); await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui, services }) => { services.preferences.set({ motion: 'reduced' }); ui.showGame(); ui.navigate(0); });
  await expect(page.locator('#save-status')).toHaveText('Progress kept for this session only');
  await page.locator('#level-code').fill('CABBAGE'); await page.locator('#btn-submit').click();
  await expect(page.locator('#progress-count')).toHaveText(`1 / ${LEVEL_METADATA.length} solved`);
});

test('decorative loops pause and resume with comfort settings in every affected room', async ({ page }) => {
  await open(page, { unlocked: true });
  for (const key of ['PlantPot', 'Pi', 'MobilePhone', 'Rally']) {
    await navigate(page, key);
    await evaluateApp(page, ({ services }, key) => {
      const scene = services.levels.activeScene;
      if (key === 'MobilePhone') scene.showAnswerButton();
      if (key === 'Rally') scene._showPodium();
    }, key);
    const loops = () => evaluateApp(page, ({ services }) => {
      const tweens = services.levels.activeScene.tweens.getTweens().filter(tween =>
        tween.data.some(data => data.repeat === -1));
      return { count: tweens.length, running: tweens.filter(tween => !tween.paused).length };
    });
    await expect.poll(async () => (await loops()).count).toBeGreaterThan(0);
    expect((await loops()).running, `${key}: reduced motion`).toBe(0);
    await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'system', ambientEffects: true }));
    await expect.poll(async () => (await loops()).running).toBeGreaterThan(0);
    await evaluateApp(page, ({ services }) => services.preferences.set({ ambientEffects: false }));
    expect((await loops()).running, `${key}: ambient effects disabled`).toBe(0);
    await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'reduced', ambientEffects: true }));
  }
});

test('a refused fullscreen request leaves actionable feedback and allows retry', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: true });
    Element.prototype.requestFullscreen = async () => { throw new Error('Request refused'); };
  });
  await open(page, { start: false });
  await page.locator('#btn-fullscreen').click();
  await expect(page.locator('#btn-fullscreen')).toBeEnabled();
  await expect(page.locator('#btn-fullscreen')).toHaveAttribute('title', 'Full screen could not be changed. Try again.');
  await expect(page.locator('#start-screen')).toBeVisible();
});
