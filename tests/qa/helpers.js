import { test as base, expect } from '@playwright/test';
import { evaluateApp } from '../browser/app.js';

export { expect, evaluateApp };
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const errors = [], failedAssets = [], consoleMessages = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (['error', 'warning'].includes(message.type()) && consoleMessages.length < 100)
        consoleMessages.push(`${message.type()}: ${message.text()}`);
    });
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.origin === new URL(testInfo.project.use.baseURL).origin && url.pathname.includes('/assets/') && response.status() >= 400)
        failedAssets.push(`${response.status()} ${url.pathname}`);
    });
    await use(page);
    if (testInfo.status !== testInfo.expectedStatus) {
      const state = await evaluateApp(page, ({ game, services, ui }) => ({
        busy: ui.busy, place: services.levels.place?.key, current: services.levels.currentIndex,
        scenes: game.scene.scenes.filter(s => s.sys.settings.status > 1).map(s => ({
          key: s.scene.key, status: s.sys.settings.status, children: s.children?.length,
          loader: s.load && { state: s.load.state, progress: s.load.progress,
            list: [...s.load.list.entries].map(f => ({ key: f.key, state: f.state, url: f.url })),
            inflight: [...s.load.inflight.entries].map(f => ({ key: f.key, state: f.state, url: f.url })) },
        })),
      })).catch(error => ({ diagnosticError: error.message }));
      await testInfo.attach('failure-state', { body: JSON.stringify(state, null, 2), contentType: 'application/json' });
    }
    await testInfo.attach('runtime-audit', { body: JSON.stringify({ errors, failedAssets, consoleMessages }, null, 2), contentType: 'application/json' });
    expect(errors, 'Uncaught runtime errors').toEqual([]);
    expect(failedAssets, 'Missing local assets').toEqual([]);
  },
});

export async function boot(page, { fresh = false, keys = [], completed = [], visited = [], motion = 'reduced', language = 'en' } = {}) {
  await page.addInitScript(({ fresh, keys, completed, visited, motion, language }) => {
    if (sessionStorage.getItem('qa:seeded')) return;
    sessionStorage.setItem('qa:seeded', '1');
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion, ambientEffects: false }));
    localStorage.setItem('puzzleLanguage', language);
    if (fresh) return;
    localStorage.setItem('caseFile:letters', JSON.stringify(['invitation']));
    localStorage.setItem('house:entered', 'true');
    localStorage.setItem('hasPlayedBefore', 'true');
    localStorage.setItem('story:seen', JSON.stringify(['chapter:1']));
    localStorage.setItem('puzzleProgress', JSON.stringify({ version: 3, completedLevelIds: completed,
      unlockedLevelIds: ['binarytree', ...completed], lastPlayedLevelId: 'binarytree', keys, usedKeys: [], visitedPlaces: visited }));
  }, { fresh, keys, completed, visited, motion, language });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await expect.poll(() => evaluateApp(page, app => Boolean(app.ui && app.services))).toBe(true);
}

export async function stand(page, place = 'Study') {
  expect(await evaluateApp(page, ({ ui, services }, place) => {
    ui.showGame(); return services.levels.enterPlace(place);
  }, place)).toBe(true);
  await sceneIs(page, place);
}

export async function sceneIs(page, key) {
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key), { timeout: 15000 }).toBe(key);
  await expect.poll(() => evaluateApp(page, ({ ui, services }) => Boolean(!ui.busy && services.levels.activeScene?.children?.length)), { timeout: 15000 }).toBe(true);
}

export async function canvasPoint(page, position) {
  return evaluateApp(page, ({ game }, p) => {
    const b = game.canvas.getBoundingClientRect();
    return { x: b.x + p.x * b.width / game.canvas.width, y: b.y + p.y * b.height / game.canvas.height };
  }, position);
}

export async function resizeScene(page, viewport) {
  await page.setViewportSize(viewport);
  const size = await page.locator('#game-container').evaluate(el => ({ width: Math.round(el.clientWidth), height: Math.round(el.clientHeight) }));
  await expect.poll(() => evaluateApp(page, ({ services }) => {
    const camera = services.levels.activeScene?.cameras.main;
    return camera && { width: camera.width, height: camera.height };
  })).toEqual(size);
}

export async function clickThing(page, id) {
  const shape = await evaluateApp(page, ({ services }, id) => {
    const s = services.levels.activeScene, thing = s._L.things.find(t => t.level === id);
    if (!thing) throw new Error(`No hotspot for ${id}`);
    const q = thing.first && !s._opened.has(id) ? thing.first.quad : thing.quad;
    return { x: q.reduce((v, p) => v + p.x, 0) / q.length, y: q.reduce((v, p) => v + p.y, 0) / q.length,
      first: Boolean(thing.first && !s._opened.has(id)) };
  }, id);
  const p = await canvasPoint(page, shape);
  await page.mouse.click(p.x, p.y);
  if (shape.first) {
    await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene.children.list.some(o => o.getData?.('opening')))).toBe(false);
    return clickThing(page, id);
  }
  const key = await evaluateApp(page, ({ services }, id) => services.levels.definitions.find(d => d.id === id).key, id);
  await sceneIs(page, key);
}

export async function answer(page, code, home) {
  await page.locator('#level-code').fill(code);
  await page.locator('#btn-submit').click();
  await sceneIs(page, home);
}

export async function takeKey(page, room) {
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.children.list.some(o => o.input?.enabled && o.getData?.('interactionLabel') === 'Take the key')), { timeout: 15000 }).toBe(true);
  const p = await evaluateApp(page, ({ services }) => {
    const o = services.levels.activeScene.children.list.find(o => o.input?.enabled && o.getData?.('interactionLabel') === 'Take the key');
    return { x: o.x, y: o.y };
  });
  const c = await canvasPoint(page, p); await page.mouse.click(c.x, c.y);
  await expect.poll(() => evaluateApp(page, ({ services }, room) => services.levels.hasKey(room), room)).toBe(true);
}

export async function enterDoor(page, target) {
  const point = await evaluateApp(page, ({ services }, target) => {
    const s = services.levels.activeScene, index = services.levels.rooms.findIndex(r => r.key === target);
    const q = s._L.doors[index].quad;
    return { x: q.reduce((v, p) => v + p.x, 0) / q.length, y: q.reduce((v, p) => v + p.y, 0) / q.length };
  }, target);
  const at = await canvasPoint(page, point); await page.mouse.click(at.x, at.y);
  const motion = await evaluateApp(page, ({ services }) => services.preferences.reducedMotion);
  if (!motion) {
    await expect.poll(() => evaluateApp(page, ({ services }) => Boolean(!services.levels.activeScene?._keyRun && services.levels.activeScene?._doorOpening)), { timeout: 20000 }).toBe(true);
    await page.mouse.click(at.x, at.y);
  }
  await sceneIs(page, target);
}
