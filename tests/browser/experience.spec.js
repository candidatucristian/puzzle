import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp, openHints } from './app.js';
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
  if (start) await evaluateApp(page, ({ ui }) => ui.showGame());
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
  // the title's moon is the film's now; its canvas still carries the texture
  const moon = page.locator('#start-moon');
  await expect(moon).toHaveCount(1);
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
  const title = await page.evaluate(() => {
    const el = document.querySelector('#start-legend .legend-title');
    return {
      title: getComputedStyle(el).fontFamily,
      titleSize: getComputedStyle(el).fontSize,
      text: el.innerText.replace(/\s+/g, ' ').trim(),
    };
  });
  expect(Number.parseFloat(title.titleSize)).toBeLessThanOrEqual(74);
  expect(title.text).toBe('Ashcombe Manor');
  await expect(page.locator('.app-signature')).toHaveCount(0);
  const headerPositions = await page.evaluate(() => ({
    actions: document.querySelector('.header-actions').getBoundingClientRect().left,
    floor: document.querySelector('#header-floor').getBoundingClientRect().left,
  }));
  expect(headerPositions.actions).toBeGreaterThan(headerPositions.floor);
});

test('hints reveal individually, remember each room, and reset with the game', async ({ page }) => {
  await open(page, { unlocked: true }); await navigate(page, 'Cryptex');
  await openHints(page);
  await expect(page.locator('#brief-level-name')).toHaveText(LEVEL_METADATA[3].name);
  await expect(page.locator('#hint-count')).toHaveText('1 of 2 hints revealed');
  await expect(page.locator('#hint-list li')).toHaveCount(1);
  await expect(page.locator('#hint-list')).not.toContainText('three breaths');
  await page.locator('#btn-next-hint').click();
  await expect(page.locator('#hint-list li')).toHaveCount(2);
  await expect(page.locator('#btn-next-hint')).toBeDisabled();
  await expect(page.locator('#hint-count')).toHaveText('2 of 2 hints revealed');
  await page.keyboard.press('Escape');
  await openHints(page);
  await expect(page.locator('#hint-list li')).toHaveCount(2);
  await screenshot(page, 'hints');
  await page.keyboard.press('Escape');
  await navigate(page, 'Wires'); await openHints(page);
  await expect(page.locator('#hint-list li')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui }) => ui.showGame()); await navigate(page, 'Cryptex');
  await openHints(page);
  await expect(page.locator('#hint-list li')).toHaveCount(2);
  await page.keyboard.press('Escape'); await page.locator('#btn-options').click();
  await page.locator('#btn-new').click(); await page.locator('#btn-new').click();
  await expect(page.locator('#progress-count')).toHaveText('0 / 3 solved');
  expect(await evaluateApp(page, ({ services }) => services.hints.count('cryptex'))).toBe(0);
  expect(await evaluateApp(page, ({ services }) => services.preferences.reducedMotion)).toBe(true);
});

test('progress, solved rooms, thumbnails and Continue survive reload', async ({ page }) => {
  await open(page);
  await expect(page.locator('#current-level-state')).toHaveCount(0);
  await expect(page.locator('.level-btn').nth(1)).toHaveAttribute('aria-disabled', 'true');
  await page.locator('#level-code').fill('CABBAGE'); await page.locator('#btn-submit').click();
  await expect(page.locator('#progress-count')).toHaveText('1 / 3 solved');
  await expect(page.locator('.level-btn.solved')).toHaveCount(1);
  await expect(page.locator('.level-btn').nth(1)).toHaveClass(/unlocked/);
  await expect(page.locator('#save-status')).toHaveText('Saved on this device');
  await screenshot(page, 'progress');
  const preview = page.locator('.level-btn').first().locator('img');
  const savedPreview = await preview.getAttribute('src').catch(() => null);
  await page.reload();
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui }) => ui.showGame());
  await expect(page.locator('#progress-count')).toHaveText('1 / 3 solved');
  await expect(page.locator('.level-btn.solved')).toHaveCount(1);
  if (savedPreview) {
    await expect(page.locator('.level-btn').first().locator('img')).toHaveAttribute('src', savedPreview);
  }
  await page.locator('.level-btn').first().click();
  await expect(page.locator('#current-level-state')).toHaveCount(0);
});

test('the header shows the current floor through rooms and puzzles without level navigation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page, { unlocked: true });
  const floor = page.locator('#header-floor');
  await expect(floor).toContainText('Basement');
  await expect(floor).toHaveAttribute('aria-label', /Basement/);
  await expect(page.locator('#room-previous, #room-next, #header-room-name, #header-progress')).toHaveCount(0);
  await navigate(page, 'PlantPot');
  await expect(floor).toContainText('The Botany');
  for (const [place, label] of [['Hall', 'The Botany'], ['Upper', 'The Chemistry'], ['Top', 'The Physics'], ['TopHall', 'The Physics']]) {
    expect(await evaluateApp(page, ({ services }, place) => services.levels.enterPlace(place), place)).toBe(true);
    await expect(floor).toContainText(label);
  }
  await navigate(page, 'Telescope');
  await expect(floor).toContainText('The Physics');
  await page.locator('#btn-leave').click();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.place?.key)).toBe('Top');
  await expect(floor).toContainText('The Physics');
  await navigate(page, 'TapCode');
  await expect(floor).toContainText('Basement');
  await expect(floor).toHaveAttribute('aria-label', /Basement/);
  await screenshot(page, 'floor-basement');
  await page.locator('#btn-leave').click();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.place?.key)).toBe('Room5');
  await expect(floor).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(floor).toBeInViewport();
  expect(await floor.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await screenshot(page, 'floor-compact');
  expect(errors).toEqual([]);
});

test('level 2 gives the draggable bucket a subtle sparkle cue', async ({ page }) => {
  await open(page, { unlocked: true });
  await navigate(page, 'PlantPot');
  await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'system' }));
  await evaluateApp(page, ({ services }) => {
    const scene = services.levels.activeScene;
    scene.input.emit('gameobjectover', { x: scene.bucket.x, y: scene.bucket.y }, scene.bucket);
  });
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
  ['Bookshelf', 5], ['Chemistry', 1], ['Billiards', 6],
  ['Cryptex', 4], ['MobilePhone', 1], ['Lightswitch', 1],
  ['Overtime', 1], ['Compass', 1], ['Pi', 1],
]) {
  test(`${key} puzzle items receive sparkle cues`, async ({ page }) => {
    await open(page, { unlocked: LEVEL_METADATA.length - 1 });
    await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'system' }));
    await navigate(page, key);
    await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene.children.list
      .filter(object => object.getData?.('movableSparkles')).length)).toBe(expected);
    if (key === 'Sequence') await screenshot(page, 'sequence-draggable-sparkles');
  });
}

for (const key of ['Chessboard', 'TV', 'Modem', 'Wires', 'Station', 'Telescope', 'Flags', 'TapCode', 'Rally', 'Fireworks']) {
  test(`${key} has no sparkle cues`, async ({ page }) => {
    await open(page, { unlocked: LEVEL_METADATA.length - 1 });
    await navigate(page, key);
    await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene.children.list
      .filter(object => object.getData?.('movableSparkles')).length)).toBe(0);
  });
}

test('inspection zoom controls are removed and the puzzle remains interactive', async ({ page }) => {
  await open(page, { unlocked: LEVEL_METADATA.length - 1 }); await navigate(page, 'Cryptex');
  const candle = page.locator('.candle-action').first();
  await expect(candle).toBeVisible();
  await candle.hover();
  await expect(page.locator('#btn-inspect, #inspection-glass, #inspection-tools')).toHaveCount(0);
  await candle.click();
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.candle.clicks)).toBe(1);
  await page.locator('#btn-options').click();
  await page.keyboard.press('Escape');
  await navigate(page, 'TV');
  // the set tunes itself every four seconds; the readings below must not straddle a tick
  await evaluateApp(page, ({ services }) => services.levels.activeScene._autoTimer.remove(false));
  const channel = await evaluateApp(page, ({ services }) => services.levels.activeScene._channel);
  await page.locator('.da-btn[data-dir="1"]').focus(); await page.keyboard.press('Enter');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._channel)).toBe((channel + 1) % 4);
});

test('comfort controls apply immediately, persist, and follow device preferences', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    if (!localStorage.getItem('puzzleComfort')) localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'system' }));
  });
  await open(page, { unlocked: true }); await navigate(page, 'Cryptex');
  await page.locator('#btn-options').click();
  await page.locator('#reading-size button[data-scale="1.3"]').click();
  await expect(page.locator('#reading-size button[data-scale="1.3"]')).toHaveAttribute('aria-checked', 'true');
  await page.locator('#st-tab-video').click();
  await page.locator('#grain-slider').fill('0');
  await page.locator('#ambient-effects').uncheck();
  await expect(page.locator('#film-grain')).toHaveCSS('opacity', '0');
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator('#btn-close-options')).toBeInViewport();
  await page.locator('#st-tab-options').click();
  await page.locator('#btn-howto').click();
  await expect(page.locator('#options-modal')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('#btn-howto')).toBeFocused();
  await screenshot(page, 'comfort');
  await page.locator('#btn-close-options').click();
  await page.waitForTimeout(500); // the responsive scene rebuild uses a 350 ms debounce
  await openHints(page);
  await page.locator('#btn-next-hint').click();
  await expect(page.locator('#right-sidebar [data-close-drawer]')).toBeInViewport();
  await screenshot(page, 'hints-large');
  await page.keyboard.press('Escape');
  const frame = await evaluateApp(page, ({ services }) => services.levels.activeScene.candle._frame);
  await page.waitForTimeout(300);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.candle._frame)).toBe(frame);
  await page.reload(); await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui }) => ui.showGame()); await page.locator('#btn-options').click();
  await expect(page.locator('#reading-size button[data-scale="1.3"]')).toHaveAttribute('aria-checked', 'true');
  await page.locator('#st-tab-video').click();
  await expect(page.locator('#grain-slider')).toHaveValue('0');
  await expect(page.locator('#ambient-effects')).not.toBeChecked();
  await page.locator('#ambient-effects').check();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'false');
  expect(errors).toEqual([]);
});

test('reduced effects retain Morse, router signals and race progression', async ({ page }) => {
  await open(page, { unlocked: LEVEL_METADATA.length - 1 }); await navigate(page, 'Lightswitch');
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
  await expect(page.locator('#progress-count')).toHaveText('1 / 3 solved');
});

test('decorative loops pause and resume with comfort settings in every affected room', async ({ page }) => {
  await open(page, { unlocked: LEVEL_METADATA.length - 1 });
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
