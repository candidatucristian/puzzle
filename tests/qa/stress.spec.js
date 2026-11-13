import { test, expect, boot, stand, sceneIs, clickThing, canvasPoint, enterDoor, resizeScene, evaluateApp } from './helpers.js';

test('the room index remains readable at 720p with both keys and expanded notes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await boot(page, { keys: ['Room2', 'Room3'] }); await stand(page, 'Study');
  await expect(page.locator('#index-keys figure')).toHaveCount(2);
  await expect(page.locator('#index-notes')).toHaveAttribute('open', '');
  const rows = page.locator('#levels-grid .level-btn:not([hidden])');
  await expect(rows).toHaveCount(3);
  const clipping = await page.locator('#levels-grid').evaluate(grid => {
    const bounds = grid.getBoundingClientRect();
    return [...grid.querySelectorAll('.level-btn:not([hidden])')].map(row => {
      const box = row.getBoundingClientRect();
      return { name: row.querySelector('.level-name').textContent,
        readable: box.height >= 30 && box.top >= bounds.top && box.bottom <= bounds.bottom + 1 };
    });
  });
  expect(clipping.every(row => row.readable), JSON.stringify(clipping)).toBe(true);
  await expect.poll(() => page.locator('#sidebar').evaluate(panel => {
    return panel.scrollHeight <= panel.clientHeight || ['auto', 'scroll'].includes(getComputedStyle(panel).overflowY);
  })).toBe(true);
  await page.screenshot({ path: test.info().outputPath('room-index-720p.png') });
  await page.locator('#index-keys figure').last().scrollIntoViewIfNeeded();
  const keyFits = await page.locator('#index-keys figure').last().evaluate(key => {
    const box = key.getBoundingClientRect(), panel = document.getElementById('sidebar').getBoundingClientRect();
    return box.top >= panel.top && box.bottom <= panel.bottom + 1;
  });
  expect(keyFits).toBe(true);
});

test('chess pieces lift under a real press, settle on release, and restore the cursor after resize', async ({ page }) => {
  await boot(page, { keys: ['Room3'] }); await stand(page, 'Room3'); await clickThing(page, 'chessboard');
  const point = await evaluateApp(page, ({ services }) => {
    const z = services.levels.activeScene._pieces[0], q = z.input.hitArea.points;
    return { x: z.x + q.reduce((sum, p) => sum + p.x, 0) / q.length,
      y: z.y + q.reduce((sum, p) => sum + p.y, 0) / q.length };
  });
  const at = await canvasPoint(page, point);
  await page.mouse.move(at.x, at.y); await page.mouse.down();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._pieces.some(z => z._lifted))).toBe(true);
  await page.mouse.up();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene._pieces.some(z => z._lifted))).toBe(false);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene.input.manager.defaultCursor)).not.toContain('not-allowed');
  await resizeScene(page, { width: 1280, height: 720 });
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene._pieces.length)).toBe(8);
});

test('reset during the accepted-answer hold cannot return to the old room or restore its save', async ({ page }) => {
  await boot(page, { motion: 'system' }); await stand(page); await clickThing(page, 'binarytree');
  await page.locator('#level-code').fill('CABBAGE'); await page.locator('#btn-submit').click();
  await page.locator('#btn-options').click(); await page.locator('#st-tab-options').click();
  await page.locator('#btn-new').click(); await page.locator('#btn-new').click();
  await expect(page.locator('#start-screen')).toBeVisible();
  await page.waitForTimeout(2000);
  const progress = await evaluateApp(page, ({ services }) => services.progress.state);
  expect(progress.visitedPlaces).toEqual([]); expect(progress.completedLevelIds).toEqual([]);
  expect(progress.unlockedLevelIds).toEqual(['binarytree']);
});

test('resizing the case book during a page turn refits it once the leaf lands', async ({ page }) => {
  await boot(page, { motion: 'system', keys: ['Room2'], visited: ['Hall', 'Study', 'Room2'], completed: ['binarytree', 'plantpot', 'cryptex'] });
  await stand(page, 'Room2'); await page.locator('#btn-casefile').click();
  await expect(page.locator('.casebook-canvas')).toBeVisible();
  await page.locator('.casebook-mark').first().click();
  await page.waitForTimeout(1000);
  await page.keyboard.press('ArrowRight');
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect.poll(async () => {
    const b = await page.locator('.casebook-book').boundingBox();
    return b.y >= 0 && b.y + b.height <= 720 && b.x >= 0 && b.x + b.width <= 1280;
  }).toBe(true);
  await page.screenshot({ path: test.info().outputPath('casebook-1280.png') });
});

test('an animated hall door tolerates resize and enters its room once', async ({ page }) => {
  await boot(page, { motion: 'system' }); await stand(page, 'Hall');
  const point = await evaluateApp(page, ({ services }) => {
    const q = services.levels.activeScene._L.doors[0].quad;
    return { x: q.reduce((sum, p) => sum + p.x, 0) / q.length, y: q.reduce((sum, p) => sum + p.y, 0) / q.length };
  });
  const at = await canvasPoint(page, point); await page.mouse.click(at.x, at.y);
  await expect.poll(() => evaluateApp(page, ({ services }) => Boolean(services.levels.activeScene._doorOpening))).toBe(true);
  await resizeScene(page, { width: 1280, height: 720 });
  await enterDoor(page, 'Study');
  await sceneIs(page, 'Study');
  expect(await evaluateApp(page, ({ game }) => game.scene.getScenes(true).map(s => s.scene.key))).toEqual(['Study']);
});

test('failed fullscreen feedback permits a second request without entering the game', async ({ page }) => {
  await page.addInitScript(() => {
    let requests = 0;
    Element.prototype.requestFullscreen = function () {
      window.qaFullscreenRequests = ++requests;
      return Promise.reject(new DOMException('Denied for QA', 'NotAllowedError'));
    };
  });
  await boot(page, { fresh: true });
  await page.locator('#btn-fullscreen').click();
  await expect(page.locator('#ui-toast')).toBeVisible();
  await expect(page.locator('#btn-fullscreen')).toBeEnabled();
  await page.locator('#btn-fullscreen').click();
  expect(await page.evaluate(() => window.qaFullscreenRequests)).toBe(2);
  await expect(page.locator('#start-screen')).toBeVisible();
});
