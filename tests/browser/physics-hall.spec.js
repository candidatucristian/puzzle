import { test, expect } from '@playwright/test';
import { evaluateApp } from './app.js';

const globeKey = 'physics_armillary_native_v2';

async function waitForPlace(page, key) {
  await expect.poll(() => evaluateApp(page, ({ services }, key) => {
    const scene = services.levels.activeScene;
    return scene?.scene.key === key && !scene.cameras.main.fadeEffect.isRunning && scene.input.enabled;
  }, key), { timeout: 20000 }).toBe(true);
}

async function enterHall(page) {
  await page.addInitScript(() => {
    localStorage.setItem('caseFile:letters', JSON.stringify(['invitation']));
    localStorage.setItem('story:seen', JSON.stringify(['chapter:1', 'chapter:2', 'chapter:3']));
  });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui, services }) => {
    ui.showGame();
    services.preferences.set({ ambientEffects: true, motion: 'system' });
    services.levels.enterPlace('Top');
  });
  await waitForPlace(page, 'Top');
}

async function clickHallObject(page, target) {
  const p = await evaluateApp(page, ({ services, game }, target) => {
    const L = services.levels.activeScene._L;
    const b = target === 'door' ? L.doors[0].box : target === 'passage' ? L.passage.box : L.thing.box;
    const canvas = game.canvas.getBoundingClientRect();
    return { x: canvas.x + (b.x + b.width / 2) / L.W * canvas.width,
      y: canvas.y + (b.y + b.height / 2) / L.H * canvas.height };
  }, target);
  await page.mouse.click(p.x, p.y);
}

test('the rendered observatory keeps XI, the telescope and the attic passage usable after resizing', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await enterHall(page);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._L.rendered)).toBe(true);
  for (const [target, destination, width, height] of [
    ['door', 'Room11', 1440, 1000], ['telescope', 'Telescope', 1920, 1080], ['passage', 'TopHall', 1280, 800],
  ]) {
    const previous = await evaluateApp(page, ({ services }) => services.levels.activeScene._L.W);
    const changing = page.viewportSize().width !== width;
    await page.setViewportSize({ width, height });
    if (changing) await expect.poll(() => evaluateApp(page, ({ services }) =>
      services.levels.activeScene._L.W)).not.toBe(previous);
    await clickHallObject(page, target);
    await waitForPlace(page, destination);
    await page.locator('#btn-leave').click();
    await waitForPlace(page, 'Top');
  }
  expect(errors).toEqual([]);
});

test('the brass armillary animates, preserves its phase on resize and respects reduced motion', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await enterHall(page);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._armillary.native)).toBe(true);
  const pose = () => evaluateApp(page, ({ services }) => {
    const a = services.levels.activeScene._armillary;
    return { phase: a.phase, frame: a.image.frame.name };
  });
  const initial = await pose();
  await expect.poll(async () => (await pose()).frame).not.toBe(initial.frame);
  await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'reduced' }));
  const stopped = await pose();
  const previous = await evaluateApp(page, ({ services }) => services.levels.activeScene._L.W);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._L.W)).not.toBe(previous);
  await expect.poll(async () => (await pose()).frame).toBe(stopped.frame);
  await page.waitForTimeout(400);
  expect((await pose()).phase).toBe(stopped.phase);
  expect(await evaluateApp(page, ({ services }, globeKey) =>
    services.levels.activeScene.children.list.filter(o => o.texture?.key === globeKey).length, globeKey)).toBe(1);
  await clickHallObject(page, 'door');
  await waitForPlace(page, 'Room11');
  expect(await evaluateApp(page, ({ game }) => ['tp_room', 'tp_glow', 'tp_armillary'].filter(key => game.textures.exists(key)))).toEqual([]);
  await page.locator('#btn-leave').click();
  await waitForPlace(page, 'Top');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._armillary.native)).toBe(true);
  expect(errors).toEqual([]);
});

test('missing native assets fall back to the usable observatory', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/observatory-native-v2.webp', route => route.abort());
  await page.route('**/armillary-native-v2.webp', route => route.abort());
  await enterHall(page);
  expect(await evaluateApp(page, ({ services }) => Boolean(services.levels.activeScene._L.rendered))).toBe(false);
  await clickHallObject(page, 'door');
  await waitForPlace(page, 'Room11');
  expect(errors).toEqual([]);
});
