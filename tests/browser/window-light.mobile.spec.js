import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp } from './app.js';
import { CURTAIN_ALIGNMENT, CURTAIN_TRAVEL } from '../../src/levels/curtain/puzzle.js';
import { VENETIAN_ALIGNMENT } from '../../src/levels/venetian/puzzle.js';

test('the curtain and blind accept touch drags in the small native-app layout', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.Capacitor = { isNativePlatform: () => true };
    localStorage.setItem('hasPlayedBefore', 'true');
    localStorage.setItem('puzzleProgressSchema', '2'); localStorage.setItem('puzzleUnlockedLevel', '32');
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced', ambientEffects: false }));
  });
  await page.setViewportSize({ width: 568, height: 320 });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui }) => ui.showGame());
  const cdp = await page.context().newCDPSession(page);
  mkdirSync('.artifacts/after', { recursive: true });
  for (const [key, value] of [['Curtain', CURTAIN_ALIGNMENT], ['Venetian', VENETIAN_ALIGNMENT]]) {
    await evaluateApp(page, ({ ui, services }, key) => ui.navigate(services.levels.definitions.findIndex(level => level.key === key), { quick: true }), key);
    await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
    const point = await evaluateApp(page, ({ services }, { key, value, travel }) => {
      const scene = services.levels.activeScene, L = scene._L;
      const box = scene.game.canvas.getBoundingClientRect(), sx = box.width / L.width, sy = box.height / L.height;
      if (key === 'Curtain') {
        const b = scene._dragZone.getBounds(), x = (Math.max(0, b.x) + Math.min(L.width, b.right)) / 2;
        return { x: box.x + x * sx, y: box.y + (L.window.y + L.window.h * 0.7) * sy,
          dx: (value - scene.position) * L.window.w * travel * sx, dy: 0 };
      }
      return { x: box.x + scene._pull.x * sx, y: box.y + scene._pull.y * sy, dx: 0, dy: (value - scene.tilt) * L.pullTravel * sy };
    }, { key, value, travel: CURTAIN_TRAVEL });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y, id: 1 }] });
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x + point.dx * i / 12, y: point.y + point.dy * i / 12, id: 1 }] });
      await page.waitForTimeout(20);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.position ?? services.levels.activeScene.tilt)).toBeCloseTo(value, 2);
    await page.screenshot({ path: `.artifacts/after/phone-${key}-aligned.png` });
    await expect(page.locator('#btn-inspect, #inspection-tools')).toHaveCount(0);
  }
  await cdp.detach();
  expect(errors).toEqual([]);
});
