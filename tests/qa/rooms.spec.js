import { test, expect, boot, stand, sceneIs, clickThing, answer, takeKey, enterDoor, evaluateApp } from './helpers.js';

const rooms = [
  ['Study', [['binarytree', 'CABBAGE'], ['plantpot', 'FIBO'], ['cryptex', 'ROTOR']], 'Room2'],
  ['Room2', [['cot', 'TORCH'], ['overtime', 'SOIL'], ['modem', 'HTTPS']], 'Room3'],
  ['Room3', [['compass', 'LOST'], ['chessboard', 'HEADACHE'], ['mobilephone', 'GEORGE']], null],
];

test('demo starts with only Room I accessible and keeps the remaining doors and stairs locked', async ({ page }) => {
  await boot(page); await stand(page, 'Hall');
  expect(await evaluateApp(page, ({ services }) => services.levels.rooms.filter(r => r.open).map(r => r.key))).toEqual(['Study']);
  expect(await evaluateApp(page, ({ services }) => services.levels.stairsLocked)).toBe(true);
  expect(await evaluateApp(page, ({ services }) => services.levels.enterPlace('Room3'))).toBe(false);
});

test('a complete three-room run preserves answers and awards only the two demo keys', async ({ page }) => {
  test.setTimeout(180000);
  await boot(page); await stand(page, 'Hall'); await enterDoor(page, 'Study');
  for (const [place, puzzles, next] of rooms) {
    if (place !== 'Study') {
      await page.locator('#btn-leave').click(); await sceneIs(page, 'Hall'); await enterDoor(page, place);
    }
    await expect(page.locator('#progress-count')).toHaveText('0 / 3 solved');
    for (const [id, code] of puzzles) {
      await clickThing(page, id);
      await page.locator('#level-code').fill('WRONG'); await page.keyboard.press('Enter');
      await expect(page.locator('#level-code')).toHaveAttribute('aria-invalid', 'true');
      await answer(page, ` ${code.toLowerCase()} `, place);
      await expect(page.locator('#level-code')).toHaveValue('');
    }
    await expect(page.locator('#progress-count')).toHaveText('3 / 3 solved');
    await page.screenshot({ path: test.info().outputPath(`${place}-complete.png`) });
    if (next) await takeKey(page, next);
    else {
      expect(await evaluateApp(page, ({ services }) => services.levels.chestSealed('Room3'))).toBe(true);
      expect(await evaluateApp(page, ({ services }) => services.levels.keyWaitingIn('Room3'))).toBe(null);
      expect(await evaluateApp(page, ({ services }) => services.levels.enterPlace('Room4'))).toBe(false);
    }
  }
  expect(await evaluateApp(page, ({ services }) => services.levels.completedCount)).toBe(9);
  await page.reload(); await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  expect(await evaluateApp(page, ({ services }) => services.levels.completedCount)).toBe(9);
  expect(await evaluateApp(page, ({ services }) => services.levels.hasKey('Room2') && services.levels.hasKey('Room3') && !services.levels.hasKey('Room4'))).toBe(true);
});

for (const [place, puzzles] of rooms) {
  test(`${place}: real hotspots open all three puzzles and replay/resize/back stay interactive`, async ({ page }) => {
    test.setTimeout(150000);
    await boot(page, { keys: ['Room2', 'Room3'] }); await stand(page, place);
    for (const [id] of puzzles) {
      await clickThing(page, id);
      const key = await evaluateApp(page, ({ services }) => services.levels.activeScene.scene.key);
      await page.locator('#btn-hint').click();
      await expect(page.locator('#hint-list li')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await page.setViewportSize({ width: 1280, height: 720 });
      const hostWidth = await page.locator('#game-container').evaluate(el => Math.round(el.clientWidth));
      await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene.cameras.main.width)).toBe(hostWidth);
      await expect(page.locator('#game-container > canvas')).toBeVisible();
      await page.screenshot({ path: test.info().outputPath(`puzzle-${id}-1280.png`) });
      await page.locator('#btn-replay').click(); await sceneIs(page, key);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.locator('#btn-leave').click(); await sceneIs(page, place);
    }
  });
}
