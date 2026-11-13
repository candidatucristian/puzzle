import { test, expect, boot, stand, sceneIs, clickThing, canvasPoint, resizeScene, evaluateApp } from './helpers.js';

async function puzzle(page, home, id) {
  await boot(page, { keys: ['Room2', 'Room3'] }); await stand(page, home); await clickThing(page, id);
}
const read = (page, fn, arg) => evaluateApp(page, ({ services }, { source, arg }) =>
  new Function('s', 'arg', `return (${source})(s,arg)`)(services.levels.activeScene, arg), { source: fn.toString(), arg });
async function clickAt(page, p) { const at = await canvasPoint(page, p); await page.mouse.click(at.x, at.y); }

test('new game goes through film, desk tasks, manor story and the front door into the hall', async ({ page }) => {
  test.setTimeout(100000);
  await boot(page, { fresh: true });
  await page.locator('#start-menu [data-menu="new"]').click();
  await expect(page.locator('#intro-video')).toHaveAttribute('data-phase', 'titles');
  await page.locator('.intro-card.is-title .intro-page-play').click();
  await page.locator('.intro-card.is-story .intro-page-play').click();
  await expect(page.locator('.intro-video-skip')).toBeVisible();
  await page.locator('.intro-video-skip').click();
  await expect(page.locator('#intro-video')).toHaveCount(0, { timeout: 20000 });
  await expect(page.locator('#prologue')).toHaveAttribute('data-phase', 'ready');
  await page.getByRole('button', { name: 'Open the letter', exact: true }).click();
  await expect(page.locator('.prologue-reading.is-shown')).toBeVisible();
  await page.locator('.prologue-go').click();
  await page.getByRole('button', { name: 'Open the Ashcombe file', exact: true }).click();
  await page.locator('.prologue-go').click();
  await page.locator('.prologue-onward').click();
  await expect(page.locator('#prologue')).toHaveCount(0, { timeout: 15000 });
  await page.locator('.manor-story .intro-video-skip').click();
  await expect(page.locator('#start-screen')).not.toHaveClass(/is-telling/);
  await page.locator('#start-door').click(); await sceneIs(page, 'Hall');
  expect(await evaluateApp(page, ({ services }) => services.levels.rooms.filter(r => r.open).map(r => r.key))).toEqual(['Study']);
});

test('Moonlit Garden: five real bucket drags grow 1, 1, 2, 3, 5 leaves and survive resize', async ({ page }) => {
  test.setTimeout(90000); await puzzle(page, 'Study', 'plantpot');
  await expect.poll(() => read(page, s => s._built)).toBe(true);
  let leaves = 0;
  for (const [index, count] of [1, 1, 2, 3, 5].entries()) {
    const points = await read(page, s => {
      const b = s.bench, p = s._pourPoint();
      return [{ x: b.x + s.bucket.x * b.scaleX, y: b.y + s.bucket.y * b.scaleY },
        { x: b.x + p.x * b.scaleX, y: b.y + p.y * b.scaleY }];
    });
    const a = await canvasPoint(page, points[0]), b = await canvasPoint(page, points[1]);
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 12 }); await page.mouse.up();
    await expect.poll(() => read(page, s => s.currentStep)).toBe(index + 1);
    await expect.poll(() => read(page, s => s.isAnimating), { timeout: 12000 }).toBe(false);
    expect(await read(page, s => s.leaves.length)).toBe(leaves += count);
  }
  await resizeScene(page, { width: 1280, height: 720 });
  expect(await read(page, s => s.leaves.length)).toBe(12);
  await page.locator('#btn-replay').click(); await sceneIs(page, 'PlantPot');
  await expect.poll(() => read(page, s => s._built)).toBe(true);
  expect(await read(page, s => s.currentStep)).toBe(0);
});

test('Candlelight: extinguish all candles, rotate the wheel and close the letter with Escape', async ({ page }) => {
  await puzzle(page, 'Study', 'cryptex');
  for (let i = 0; i < 3; i++) await page.locator('.candle-action').nth(i).click();
  await expect.poll(() => read(page, s => s._lettersShown)).toBe(true);
  const centre = await read(page, s => ({ x: s._wheel.cx, y: s._wheel.cy }));
  const at = await canvasPoint(page, centre); await page.mouse.move(at.x, at.y); await page.mouse.wheel(0, 120);
  await expect.poll(() => read(page, s => Math.abs(s._wheelAngle))).toBeGreaterThan(1);
  await clickAt(page, await read(page, s => s._envelope));
  await expect.poll(() => read(page, s => s._overlayOpen)).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => read(page, s => s._overlayOpen)).toBe(false);
  await sceneIs(page, 'Cryptex');
  await resizeScene(page, { width: 1280, height: 720 });
  await expect.poll(() => read(page, s => s.candle.allOut)).toBe(true);
});

test('His Cot: every clue responds to real clicks, drags persist on resize and replay clears them', async ({ page }) => {
  await puzzle(page, 'Room2', 'cot');
  await expect.poll(() => read(page, s => Boolean(s._toys))).toBe(true);
  for (const [id, event] of [['musicbox', 'dance'], ['oscar', 'glint'], ['book', 'open'], ['chaplin', 'hat'], ['hotel', 'bell']]) {
    const point = await read(page, (s, id) => { const b = s._toys[id].zone.getBounds(); return { x: b.centerX, y: b.centerY }; }, id);
    await clickAt(page, point);
    await expect.poll(() => read(page, (s, event) => Boolean(s._state[event]), event)).toBe(true);
  }
  const point = await read(page, s => { const b = s._toys.hotel.zone.getBounds(); return { x: b.centerX, y: b.centerY }; });
  const at = await canvasPoint(page, point);
  await page.mouse.move(at.x, at.y); await page.mouse.down();
  await page.mouse.move(at.x + 16, at.y + 9, { steps: 6 }); await page.mouse.up();
  await expect.poll(() => read(page, s => Boolean(s._positions.hotel))).toBe(true);
  const moved = await read(page, s => s._positions);
  await resizeScene(page, { width: 1280, height: 720 });
  expect(await read(page, s => s._positions)).toEqual(moved);
  await page.locator('#btn-replay').click(); await sceneIs(page, 'Cot');
  expect(await read(page, s => s._positions)).toEqual({});
});

test('After Hours: all calculator keys add the four clocks, survive resize, and reset on replay', async ({ page }) => {
  await puzzle(page, 'Room2', 'overtime');
  for (const key of '2203+1411+1147+2344=') await clickAt(page, await read(page, (s, key) => s.keyCenter(key), key));
  await expect.poll(() => read(page, s => s.calc.display)).toBe('7105');
  await resizeScene(page, { width: 1280, height: 720 });
  expect(await read(page, s => s.calc.display)).toBe('7105');
  await page.locator('#btn-replay').click(); await sceneIs(page, 'Overtime');
  expect(await read(page, s => s.calc.display)).toBe('0');
});

test('router signals continue with motion and ambient effects disabled, including after resize', async ({ page }) => {
  await puzzle(page, 'Room2', 'modem');
  await expect.poll(() => read(page, s => s._leds.some(l => l.alpha > 0)), { intervals: [100] }).toBe(true);
  await resizeScene(page, { width: 1280, height: 720 });
  await expect.poll(() => read(page, s => s._leds.some(l => l.alpha > 0)), { intervals: [100] }).toBe(true);
  await page.locator('#btn-replay').click(); await sceneIs(page, 'Modem');
  await expect.poll(() => read(page, s => s._leds.some(l => l.alpha > 0)), { intervals: [100] }).toBe(true);
});

test('captain map closes with Escape while keeping the compass puzzle open', async ({ page }) => {
  await puzzle(page, 'Room3', 'compass');
  await clickAt(page, await read(page, s => ({ x: s._L.map.x, y: s._L.map.y })));
  await expect.poll(() => read(page, s => s._mapOpen)).toBe(true);
  await page.keyboard.press('Escape');
  await sceneIs(page, 'Compass');
  expect(await read(page, s => s._mapOpen)).toBe(false);
});

test('the phone keypad decodes GEORGE, survives resize and clears on replay', async ({ page }) => {
  await puzzle(page, 'Room3', 'mobilephone');
  const press = async key => {
    const centres = await read(page, s => {
      const out = {};
      for (const item of s.keypadContainer.list) {
        const label = item.list?.find(c => c.type === 'Text');
        if (label) out[label.text] = item.getWorldTransformMatrix().transformPoint(0, 0);
      }
      out.ANSWER = s.navContainer.getWorldTransformMatrix().transformPoint(0, 0); return out;
    });
    const at = await canvasPoint(page, centres[key]);
    await page.mouse.click(at.x, at.y, { delay: 50 });
  };
  await press('2'); await expect.poll(() => read(page, s => s.phoneInput.text)).toBe('A');
  await resizeScene(page, { width: 1280, height: 720 });
  expect(await read(page, s => s.screenInput.text)).toBe('A');
  await press('#');
  for (const key of '433666777433') await press(key);
  await expect.poll(() => read(page, s => s.menuText.text)).toBe('ANSWER');
  await press('ANSWER');
  await expect.poll(() => read(page, s => s.callerNumber.text)).toBe('GEORGE');
  await page.locator('#btn-replay').click(); await sceneIs(page, 'MobilePhone');
  expect(await read(page, s => s.screenInput.text)).toBe('');
});
