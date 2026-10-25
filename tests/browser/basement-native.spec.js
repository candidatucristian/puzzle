import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp } from './app.js';
import { letterFromTapPair } from '../../src/levels/tapcode/puzzle.js';

async function enterCellar(page) {
  await page.addInitScript(() => {
    localStorage.setItem('caseFile:letters', JSON.stringify(['invitation']));
    localStorage.setItem('story:seen', JSON.stringify(['chapter:1', 'chapter:2', 'chapter:3']));
  });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui, services }) => {
    ui.showGame();
    services.levels.enterPlace('Room5');
    const index = services.levels.indexOf('tapcode');
    services.levels.discover(index);
    services.levels.navigate(index);
  });
  await expect.poll(() => evaluateApp(page, ({ services }) => {
    const scene = services.levels.activeScene;
    return scene?.scene.key === 'TapCode' && Boolean(scene._L) && !scene.cameras.main.fadeEffect.isRunning;
  })).toBe(true);
}

test('the Blender basement loads without AI images and keeps its engraved puzzle readable after resizing', async ({ page }) => {
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.url().includes('/assets/images/TapCode/')) requests.push(new URL(request.url()).pathname.split('/').pop());
  });
  await enterCellar(page);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._L.nativeRender)).toBe(true);
  const native = await evaluateApp(page, ({ services }) => services.levels.activeScene._L.native);
  expect(native.rack).toMatchObject({ columns: 5, rows: 5 });
  expect(native.cluePairs.map(([row, column]) => letterFromTapPair(row, column)).join('')).toBe('ESCAPE');
  mkdirSync('.artifacts/basement-native-review', { recursive: true });
  for (const [label, width, height] of [['desktop', 1440, 1000], ['wide', 1920, 1080], ['compact', 863, 360]]) {
    if (label === 'compact') await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'reduced' }));
    const oldWidth = await evaluateApp(page, ({ services }) => services.levels.activeScene._L.W);
    const changed = page.viewportSize().width !== width;
    await page.setViewportSize({ width, height });
    if (changed) await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._L.W)).not.toBe(oldWidth);
    const scene = await evaluateApp(page, ({ services, game }) => {
      const s = services.levels.activeScene, L = s._L, exit = s.children.getByName('basement-exit');
      const n = L.native, rack = n.rack.box;
      const canvas = game.canvas.getBoundingClientRect(), back = document.getElementById('btn-leave').getBoundingClientRect();
      return { W: L.W, H: L.H, slab: L.slab, native: L.nativeRender, exit: { x: exit.x, y: exit.y },
        rack: { x: n.x + rack.x * n.scale, y: n.y + rack.y * n.scale,
          w: rack.width * n.scale, h: rack.height * n.scale },
        z: { x: n.x + (n.rack.z[0] - 24) * n.scale, y: n.y + (n.rack.z[1] - 24) * n.scale,
          w: 48 * n.scale, h: 48 * n.scale },
        back: { x: (back.x - canvas.x) * L.W / canvas.width, y: (back.y - canvas.y) * L.H / canvas.height,
          w: back.width * L.W / canvas.width, h: back.height * L.H / canvas.height } };
    });
    expect(scene.native).toBe(true);
    expect(scene.slab.x0).toBeGreaterThanOrEqual(0);
    expect(scene.slab.y0).toBeGreaterThanOrEqual(0);
    expect(scene.slab.x0 + scene.slab.w).toBeLessThanOrEqual(scene.W);
    expect(scene.slab.y0 + scene.slab.h).toBeLessThanOrEqual(scene.H);
    expect(scene.exit.x).toBeGreaterThanOrEqual(32);
    expect(scene.exit.y).toBeGreaterThanOrEqual(32);
    expect(scene.exit.x).toBeLessThanOrEqual(scene.W - 32);
    expect(scene.exit.y).toBeLessThanOrEqual(scene.H - 32);
    for (const clue of [scene.rack, scene.z]) {
      expect(clue.x).toBeGreaterThanOrEqual(0);
      expect(clue.y).toBeGreaterThanOrEqual(0);
      expect(clue.x + clue.w).toBeLessThanOrEqual(scene.W);
      expect(clue.y + clue.h).toBeLessThanOrEqual(scene.H);
    }
    const { z, back } = scene;
    expect(z.x < back.x + back.w && z.x + z.w > back.x &&
      z.y < back.y + back.h && z.y + z.h > back.y).toBe(false);
    await page.locator('#game-viewport').screenshot({ path: `.artifacts/basement-native-review/${label}.png` });
  }
  await page.locator('#btn-leave').click();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.place?.key)).toBe('Room5');
  await expect(page.locator('#btn-leave')).not.toHaveClass(/basement-compact-back/);
  expect([...new Set(requests)]).toEqual(['cellar-native-v1.webp']);
  expect(errors).toEqual([]);
});

test('a missing Blender plate falls back to the drawn basement and its ladder still returns to Room V', async ({ page }) => {
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.url().includes('/assets/images/TapCode/')) requests.push(new URL(request.url()).pathname.split('/').pop());
  });
  await page.route('**/cellar-native-v1.webp', route => route.abort());
  await enterCellar(page);
  expect(await evaluateApp(page, ({ services }) => Boolean(services.levels.activeScene._L.nativeRender))).toBe(false);
  const point = await evaluateApp(page, ({ services, game }) => {
    const s = services.levels.activeScene, zone = s.children.getByName('basement-exit');
    const box = game.canvas.getBoundingClientRect();
    return { x: box.x + zone.x / s._L.W * box.width, y: box.y + zone.y / s._L.H * box.height };
  });
  await page.mouse.click(point.x, point.y);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.place?.key)).toBe('Room5');
  expect([...new Set(requests)]).toEqual(['cellar-native-v1.webp']);
  expect(errors).toEqual([]);
});
