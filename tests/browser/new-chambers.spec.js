import { test, expect } from '@playwright/test';
import { evaluateApp, openHints } from './app.js';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';
import { PLOTTER_BLOCKS, formatPath } from '../../src/levels/plotter/puzzle.js';
import { FRAGMENT_TEXT } from '../../src/levels/genome/puzzle.js';

async function open(page, all = false) {
  await page.addInitScript(index => {
    if (!localStorage.getItem('puzzleProgress')) {
      localStorage.setItem('puzzleProgressSchema', '2');
      localStorage.setItem('puzzleUnlockedLevel', String(index));
    }
    localStorage.setItem('hasPlayedBefore', 'true');
  }, all ? LEVEL_METADATA.length - 1 : LEVEL_METADATA.findIndex(level => level.id === 'plotter'));
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui }) => ui.showGame());
}

async function navigate(page, key) {
  await evaluateApp(page, ({ ui, services }, key) => ui.navigate(services.levels.definitions.findIndex(level => level.key === key), { quick: true }), key);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe(key);
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
}

test('PING and CAGE unlock the next rooms; Genome requests a reference and SPACE unlocks The Curtain', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await open(page); await navigate(page, 'Plotter');
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._codeTexts.map(t => t.text.replace(/\s/g, ''))))
    .toEqual(PLOTTER_BLOCKS.map(points => formatPath(points).replace(/\s/g, '')));
  await page.locator('#level-code').fill('ping'); await page.locator('#btn-submit').click();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Kinetic');
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._forms.map(form => form.points.length))).toEqual([3, 0, 7, 5]);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._clue.text)).toContain('CURVE COUNTS AS ONE');
  await page.locator('#level-code').fill('cage'); await page.locator('#btn-submit').click();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Genome');
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._fragmentText.text)).toBe(FRAGMENT_TEXT);
  await openHints(page);
  await expect(page.locator('#info-requires')).toContainText('Reference may help');
  await expect(page.locator('#hint-list')).toContainText('BUILDING BLOCKS OF LIFE');
  await page.keyboard.press('Escape');
  await page.locator('#level-code').fill('space'); await page.locator('#btn-submit').click();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Curtain');
  await expect(page.locator('#completion-screen')).toBeHidden();
  await page.reload();
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  expect(await evaluateApp(page, ({ services }) => services.levels.completedCount)).toBe(30);
  expect(errors).toEqual([]);
});

test('all new scenes preserve their phase on resize and retain clues with motion disabled', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await open(page, true);
  for (const [i, key] of ['Plotter', 'Kinetic', 'Genome'].entries()) {
    await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'system', ambientEffects: true }));
    await navigate(page, key);
    const before = await evaluateApp(page, ({ services }) => services.levels.activeScene._elapsed);
    await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._elapsed)).toBeGreaterThan(before + 100);
    const width = await evaluateApp(page, ({ services }) => {
      const scene = services.levels.activeScene;
      scene.sys.sceneUpdate = () => {};
      scene._elapsed = 9000; scene._render();
      return scene._L.width;
    });
    await page.setViewportSize(i % 2 ? { width: 1440, height: 1000 } : { width: 980, height: 720 });
    await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._L.width)).not.toBe(width);
    expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._elapsed)).toBe(9000);
    await expect(page.locator('#btn-inspect, #inspection-tools')).toHaveCount(0);
    await evaluateApp(page, ({ services }) => {
      services.preferences.set({ motion: 'reduced', ambientEffects: false });
      const scene = services.levels.activeScene; scene.sys.sceneUpdate = scene.update;
    });
    await page.waitForTimeout(150);
    expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._elapsed)).toBe(9000);
    const visible = await evaluateApp(page, ({ services }) => {
      const scene = services.levels.activeScene;
      const clues = scene._codeTexts ?? (scene._fragmentText ? [scene._fragmentText] : [scene._clue]);
      return clues.every(text => text.visible && text.alpha > 0.5 && text.text.length > 0);
    });
    expect(visible).toBe(true);
    await navigate(page, key);
    expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._elapsed)).toBe(0);
  }
  expect(errors).toEqual([]);
});
