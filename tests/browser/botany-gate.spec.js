import { test, expect } from '@playwright/test';
import { evaluateApp } from './app.js';

const gateKey = 'hall_botany_gate_motion_v2';

async function hall(page, reduced = false) {
  await page.addInitScript(() => {
    localStorage.setItem('caseFile:letters', JSON.stringify(['invitation']));
    localStorage.setItem('story:seen', JSON.stringify(['chapter:1', 'chapter:2', 'chapter:3']));
  });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui, services }, reduced) => {
    ui.showGame();
    services.preferences.set({ ambientEffects: false, motion: reduced ? 'reduced' : 'system' });
    services.levels.enterHall();
  }, reduced);
  await waitForPlace(page, 'Hall');
}

async function waitForPlace(page, place) {
  await expect.poll(() => evaluateApp(page, ({ services }, place) => {
    const s = services.levels.activeScene;
    return s?.scene.key === place && Boolean(s._L) && !s.cameras.main.fadeEffect.isRunning;
  }, place), { timeout: 15000 }).toBe(true);
}

async function activateGate(page) {
  const point = await evaluateApp(page, ({ game, services }) => {
    const L = services.levels.activeScene._L, g = L.gate, r = game.canvas.getBoundingClientRect();
    return { x: r.x + (g.x + g.width / 2) * r.width / L.W, y: r.y + (g.y + g.height / 2) * r.height / L.H };
  });
  await page.mouse.click(point.x, point.y);
}

async function stairsReady(page) {
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene.children.list.some(
    o => o.getData?.('interactionLabel') === 'Go up the stairs' && o.input?.enabled,
  ))).toBe(true);
}

test('the forged gates open through rendered hinge poses, lead upstairs and remain open after return and resize', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await hall(page);
  await evaluateApp(page, ({ game, services }, key) => {
    const s = services.levels.activeScene;
    const image = s.children.list.find(o => o.texture?.key === key);
    if (!image) throw new Error('The rendered gates are missing');
    const frames = [];
    game.registry.set('gatePoses', frames);
    const sample = () => { if (image.frame) frames.push(image.frame.name); };
    s.events.on('postupdate', sample);
    s.events.once('shutdown', () => s.events.off('postupdate', sample));
  }, gateKey);
  await activateGate(page);
  await stairsReady(page);
  const poses = await evaluateApp(page, ({ game }) => [...new Set(game.registry.get('gatePoses'))]);
  expect(poses.length).toBeGreaterThan(10);
  expect(poses).toContain(0);
  expect(poses).toContain(48);
  await activateGate(page);
  await waitForPlace(page, 'Upper');
  expect(await evaluateApp(page, ({ services }, key) => services.levels.activeScene.children.list.filter(o => o.texture?.key === key).length, gateKey)).toBe(0);
  await page.locator('#btn-leave').click();
  await waitForPlace(page, 'Hall');
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect.poll(() => evaluateApp(page, ({ services }, key) => {
    const images = services.levels.activeScene.children.list.filter(o => o.texture?.key === key);
    return images.length === 1 && images[0].frame.name === 48;
  }, gateKey)).toBe(true);
  await stairsReady(page);
  expect(errors).toEqual([]);
});

test('unavailable animation leaves a usable iron gate and stairway with reduced motion', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/hall-gate-motion-v2.webp', route => route.abort());
  await hall(page, true);
  expect(await evaluateApp(page, ({ services }, key) => services.levels.activeScene.children.list.filter(o => o.texture?.key === key).length, gateKey)).toBe(0);
  await activateGate(page);
  await stairsReady(page);
  await activateGate(page);
  await waitForPlace(page, 'Upper');
  expect(errors).toEqual([]);
});
