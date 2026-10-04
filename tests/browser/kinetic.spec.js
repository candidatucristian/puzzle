import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp } from './app.js';

test('the nursery keeps the mobile above the baby, freezes gently and releases its paintings', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('hasPlayedBefore', 'true');
    localStorage.setItem('puzzleProgressSchema', '2');
    localStorage.setItem('puzzleUnlockedLevel', '32');
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced', ambientEffects: false }));
  });
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui }) => ui.showGame());
  const navigate = async key => {
    await evaluateApp(page, ({ services, ui }, key) => ui.navigate(services.levels.definitions.findIndex(level => level.key === key), { quick: true }), key);
    await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe(key);
    await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  };
  await navigate('Kinetic');
  const nurseryTextures = () => evaluateApp(page, ({ game }) => game.textures.getTextureKeys().filter(key => key.startsWith('ki_')).sort());
  const initialTextures = await nurseryTextures();
  expect(initialTextures.length).toBeGreaterThan(8);
  for (const size of [{ width: 1440, height: 1000 }, { width: 980, height: 720 }]) {
    await page.setViewportSize(size);
    await expect.poll(() => evaluateApp(page, ({ services }) => {
      const scene = services.levels.activeScene;
      const container = document.getElementById('game-container').getBoundingClientRect();
      return scene._L.width === Math.round(container.width) && scene._L.height === Math.round(container.height);
    })).toBe(true);
    await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene.levelText.alpha)).toBe(1);
    const bounds = await evaluateApp(page, ({ services }) => {
      const scene = services.levels.activeScene;
      return {
        forms: scene._forms.map(form => {
          const b = form.img.getBounds();
          return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
        }),
        baby: scene._roomArt.baby.head, width: scene._L.width, height: scene._L.height,
      };
    });
    for (const [i, b] of bounds.forms.entries()) {
      expect(b.x).toBeGreaterThan(0); expect(b.right).toBeLessThan(bounds.width);
      expect(b.y).toBeGreaterThan(0); expect(b.bottom).toBeLessThan(bounds.baby.y);
      expect(b.width).toBeGreaterThan(12); expect(b.height).toBeGreaterThan(12);
      if (i) expect(b.y).toBeGreaterThan(bounds.forms[i - 1].bottom);
    }
    expect(await nurseryTextures()).toEqual(initialTextures);
    mkdirSync('.artifacts/after', { recursive: true });
    await page.locator('#game-container').screenshot({ path: '.artifacts/after/Kinetic-nursery-' + size.width + '.png' });
  }
  await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'system', ambientEffects: true }));
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._elapsed)).toBeGreaterThan(100);
  await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'reduced', ambientEffects: false }));
  const frozen = await evaluateApp(page, ({ services }) => {
    const s = services.levels.activeScene;
    return [s._elapsed, s._curtain.rotation, s._blanket.scaleY, ...s._forms.flatMap(f => [f.img.x, f.img.y])];
  });
  await page.waitForTimeout(200);
  expect(await evaluateApp(page, ({ services }) => {
    const s = services.levels.activeScene;
    return [s._elapsed, s._curtain.rotation, s._blanket.scaleY, ...s._forms.flatMap(f => [f.img.x, f.img.y])];
  })).toEqual(frozen);
  for (let visit = 0; visit < 3; visit++) {
    await navigate('Genome'); expect(await nurseryTextures()).toEqual([]);
    await navigate('Kinetic'); expect(await nurseryTextures()).toEqual(initialTextures);
  }
  expect(errors).toEqual([]);
});
