import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp } from './app.js';

async function enterPuzzle(page, id) {
  await evaluateApp(page, ({ services }, id) => {
    const levels = services.levels;
    levels.discover(levels.indexOf(id));
    levels.navigate(levels.indexOf(id));
  }, id);
  await expect.poll(() => evaluateApp(page, ({ services }) =>
    services.levels.activeScene?._L != null)).toBe(true);
}

async function exitPoint(page) {
  const point = await evaluateApp(page, ({ services }) => {
    const scene = services.levels.activeScene;
    const zone = scene.children.getByName('basement-exit');
    return { x: zone.x, y: zone.y, W: scene.scale.width, H: scene.scale.height };
  });
  const canvas = await page.locator('#game-container canvas').boundingBox();
  return { x: canvas.x + point.x / point.W * canvas.width, y: canvas.y + point.y / point.H * canvas.height };
}

for (const compact of [false, true]) {
  test.describe(compact ? 'compact, reduced motion' : 'desktop, normal motion', () => {
    test.use({ viewport: compact ? { width: 863, height: 360 } : { width: 1440, height: 1000 } });

    test('the ladder arrow and Back both return to Room V, including after resize and re-entry', async ({ page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(reduced => {
        localStorage.setItem('caseFile:letters', JSON.stringify(['invitation']));
        localStorage.setItem('puzzleComfort', JSON.stringify({ motion: reduced ? 'reduced' : 'system' }));
      }, compact);
      await page.goto('/');
      await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
      await evaluateApp(page, ({ ui, services }) => {
        ui.showGame();
        services.levels.enterPlace('Room5');
      });
      await enterPuzzle(page, 'tapcode');
      await expect(page.locator('#btn-leave')).toBeVisible();
      mkdirSync('.artifacts/basement-tree-review', { recursive: true });
      const label = compact ? 'compact' : 'desktop';
      await page.locator('#game-viewport').screenshot({ path: `.artifacts/basement-tree-review/basement-${label}.png` });
      const p = await exitPoint(page);
      await page.mouse.click(p.x, p.y);
      await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.place?.key)).toBe('Room5');
      await expect.poll(() => evaluateApp(page, ({ services }) =>
        services.levels.activeScene?.children.getByName('basement-exit') ?? null)).toBeNull();
      await page.waitForTimeout(600);
      await page.locator('#game-viewport').screenshot({ path: `.artifacts/basement-tree-review/room5-${label}.png` });

      await enterPuzzle(page, 'tapcode');
      const oldWidth = await evaluateApp(page, ({ services }) => services.levels.activeScene._L.W);
      await page.setViewportSize(compact ? { width: 932, height: 430 } : { width: 1100, height: 780 });
      await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._L.W)).not.toBe(oldWidth);
      const resized = await exitPoint(page);
      await page.mouse.click(resized.x, resized.y);
      await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.place?.key)).toBe('Room5');

      await enterPuzzle(page, 'tapcode');
      await page.locator('#btn-leave').click();
      await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.place?.key)).toBe('Room5');
      expect(await evaluateApp(page, ({ services }) => services.levels.isCompleted(services.levels.indexOf('tapcode')))).toBe(false);

      await enterPuzzle(page, 'pi');
      // The visual edit must leave all nine rows and every lit clue intact.
      const lamps = await evaluateApp(page, ({ services }) => {
        const s = services.levels.activeScene;
        return s._L.rows.map(row => s.children.list.filter(o =>
          o.texture?.key === s._keys.lamp && row.some(p => p.x === o.x && p.y === o.y)).length);
      });
      expect(lamps).toEqual([3, 1, 4, 1, 5, 9, 2, 6, 5]);
      await page.locator('#game-viewport').screenshot({ path: `.artifacts/basement-tree-review/tree-${label}.png` });
      expect(errors).toEqual([]);
    });
  });
}
