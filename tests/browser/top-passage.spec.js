import { test, expect } from '@playwright/test';
import { evaluateApp } from './app.js';

async function settled(page, key) {
  await expect.poll(() => evaluateApp(page, ({ services }, key) => {
    const scene = services.levels.activeScene;
    return scene?.scene.key === key && !scene.cameras.main.fadeEffect.isRunning && scene.input.enabled;
  }, key), { timeout: 20000 }).toBe(true);
}

async function passage(page, reduced = false) {
  await page.addInitScript(() => {
    localStorage.setItem('caseFile:letters', JSON.stringify(['invitation']));
    localStorage.setItem('story:seen', JSON.stringify(['chapter:1', 'chapter:2', 'chapter:3']));
  });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui, services }, reduced) => {
    ui.showGame();
    services.preferences.set({ ambientEffects: false, motion: reduced ? 'reduced' : 'system' });
    services.levels.enterPlace('TopHall');
  }, reduced);
  await settled(page, 'TopHall');
}

async function clickDoor(page, number) {
  const p = await evaluateApp(page, ({ game, services }, number) => {
    const L = services.levels.activeScene._L, d = L.doors.find(d => d.number === number);
    const c = game.canvas.getBoundingClientRect();
    const centre = d.quad.reduce((p, q) => ({ x: p.x + q.x / 4, y: p.y + q.y / 4 }), { x: 0, y: 0 });
    return { x: c.x + centre.x * c.width / L.W, y: c.y + centre.y * c.height / L.H };
  }, number);
  await page.mouse.click(p.x, p.y);
}

// A door's first click opens it; it stands open, the passage staying put,
// until the next click goes through.
async function openDoor(page, number) {
  await clickDoor(page, number);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?._doorOpening?.elapsed ?? 0), { intervals: [20] }).toBeGreaterThan(1600);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('TopHall');
}

test('the native XII and XIII doors play rendered latch and hinge poses and return to the passage', async ({ page }) => {
  test.setTimeout(60000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await passage(page);
  expect(await evaluateApp(page, ({ services }) => Boolean(services.levels.activeScene._L.passageRender))).toBe(true);
  for (const number of [12, 13]) {
    await evaluateApp(page, ({ game, services }) => {
      const s = services.levels.activeScene, frames = [];
      game.registry.set('passageFrames', frames);
      const sample = () => {
        const image = s._doorArt?.parts[0];
        if (image) frames.push(image.frame.name);
      };
      s.events.on('postupdate', sample);
      s.events.once('shutdown', () => s.events.off('postupdate', sample));
    });
    await openDoor(page, number);
    await clickDoor(page, number);
    await settled(page, `Room${number}`);
    const frames = await evaluateApp(page, ({ game }) => [...new Set(game.registry.get('passageFrames'))]);
    expect(frames.length).toBeGreaterThan(6);
    expect(frames.some(frame => frame >= 41)).toBe(true);
    expect(frames.some(frame => frame > 0 && frame < 41)).toBe(true);
    expect(await evaluateApp(page, ({ game }) => game.textures.exists('hw_hall'))).toBe(false);
    await page.locator('#btn-leave').click();
    await settled(page, 'TopHall');
  }
  expect(errors).toEqual([]);
});

test('resizing a native opening keeps it open, and the next click makes one navigation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await passage(page);
  await evaluateApp(page, ({ game }) => {
    game.registry.set('passageRequests', 0);
    game.events.on('house:go', () => game.registry.inc('passageRequests', 1));
  });
  await clickDoor(page, 12);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?._doorOpening?.elapsed ?? 0), { intervals: [20] }).toBeGreaterThan(350);
  await page.setViewportSize({ width: 1320, height: 920 });
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?._doorOpening?.elapsed ?? 0), { intervals: [20] }).toBeGreaterThan(1600);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('TopHall');
  expect(await evaluateApp(page, ({ game }) => game.registry.get('passageRequests'))).toBe(0);
  await clickDoor(page, 12);
  await settled(page, 'Room12');
  expect(await evaluateApp(page, ({ game }) => game.registry.get('passageRequests'))).toBe(1);
  await page.locator('#btn-leave').click();
  await settled(page, 'TopHall');
  expect(await evaluateApp(page, ({ game }) => game.textures.getTextureKeys().filter(k => /^passage_door_\d+_native_v1$/.test(k)).length)).toBe(2);
  await page.locator('#btn-leave').click();
  await settled(page, 'Top');
  expect(await evaluateApp(page, ({ game }) => game.textures.exists('hw_hall'))).toBe(false);
  expect(errors).toEqual([]);
});

test('reduced motion enters through the native doorway without an animated leaf', async ({ page }) => {
  await passage(page, true);
  expect(await evaluateApp(page, ({ services }) => Boolean(services.levels.activeScene._L.passageRender))).toBe(true);
  await clickDoor(page, 13);
  await settled(page, 'Room13');
  expect(await evaluateApp(page, ({ game }) => game.scene.getScene('TopHall')._doorArt)).toBeNull();
});

test('a missing native door sheet falls back to a usable passage', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/passage-door-13-native-v1.webp', route => route.abort());
  await passage(page, true);
  expect(await evaluateApp(page, ({ services }) => Boolean(services.levels.activeScene._L.passageRender))).toBe(false);
  await clickDoor(page, 13);
  await settled(page, 'Room13');
  expect(errors).toEqual([]);
});
