import { test, expect } from '@playwright/test';
import { evaluateApp } from './app.js';

// Room II's key in hand, never yet turned in its door.
async function hallWithKey(page, motion = 'system') {
  await page.addInitScript(() => {
    localStorage.setItem('caseFile:letters', JSON.stringify(['invitation']));
    localStorage.setItem('puzzleProgress', JSON.stringify({
      version: 3, completedLevelIds: ['binarytree', 'plantpot', 'cryptex'],
      unlockedLevelIds: ['binarytree', 'plantpot', 'cryptex', 'bookshelf'], lastPlayedLevelId: 'cryptex',
      keys: ['Room2'], usedKeys: [], visitedPlaces: ['Study'],
    }));
  });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui, services }, motion) => {
    ui.showGame();
    services.preferences.set({ ambientEffects: false, motion });
    services.levels.enterHall();
  }, motion);
  await expect.poll(() => evaluateApp(page, ({ services }) => {
    const scene = services.levels.activeScene;
    return scene?.scene.key === 'Hall' && !scene.cameras.main.fadeEffect.isRunning && scene.input.enabled;
  })).toBe(true);
  expect(await evaluateApp(page, ({ services }) => services.levels.rooms[1].withKey)).toBe(true);
}

async function clickDoor(page, index) {
  const at = await evaluateApp(page, ({ game, services }, index) => {
    const d = services.levels.activeScene._L.doors[index], rect = game.canvas.getBoundingClientRect();
    const p = d.quad.reduce((s, q) => ({ x: s.x + q.x / 4, y: s.y + q.y / 4 }), { x: 0, y: 0 });
    return { x: rect.x + p.x * rect.width / game.canvas.width, y: rect.y + p.y * rect.height / game.canvas.height };
  }, index);
  await page.mouse.click(at.x, at.y);
}

test('the first door opened with its key plays the key film, then stands open', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().includes('key-unlock') && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await hallWithKey(page);
  await clickDoor(page, 1);
  // the film comes up over the hall, and plays
  await expect(page.locator('#key-insert.is-on')).toHaveCount(1, { timeout: 6000 });
  await expect.poll(() => page.locator('#key-insert').evaluate(video => video.currentTime), { timeout: 6000 }).toBeGreaterThan(1.5);
  // seen: laid over the whole picture, stacked above the game's canvas
  expect(await page.evaluate(() => {
    const video = document.getElementById('key-insert'), view = document.getElementById('game-viewport').getBoundingClientRect();
    const r = video.getBoundingClientRect(), style = getComputedStyle(video);
    return { covers: Math.abs(r.x - view.x) < 2 && Math.abs(r.y - view.y) < 2 && Math.abs(r.width - view.width) < 2 && Math.abs(r.height - view.height) < 2,
      position: style.position, z: style.zIndex, opacity: style.opacity };
  })).toEqual({ covers: true, position: 'absolute', z: '1', opacity: '1' });
  // then goes, the key turned: the door stands open, waiting to be gone through
  await expect(page.locator('#key-insert')).toHaveCount(0, { timeout: 8000 });
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?._doorOpening?.number ?? null)).toBe(2);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Hall');
  expect(await evaluateApp(page, ({ services }) => services.levels.rooms[1].withKey)).toBe(false);
  expect(errors).toEqual([]);
});

test('with motion reduced the key turns without the film', async ({ page }) => {
  await hallWithKey(page, 'reduced');
  await clickDoor(page, 1);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key), { timeout: 6000 }).toBe('Room2');
  expect(await page.locator('#key-insert').count()).toBe(0);
});
