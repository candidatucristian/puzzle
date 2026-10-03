import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp } from './app.js';

// Runs under the "phone" project only: an emulated Pixel 7 held sideways,
// with touch, a coarse pointer and an 863×360 viewport.

// In a phone's browser the game is not loaded at all (see the last test):
// these checks run the compact layout as the store app will, inside a
// native shell that says so through window.Capacitor (ui/platform.js).
async function open(page, { unlocked = true } = {}) {
  await page.addInitScript(unlocked => {
    window.Capacitor = { isNativePlatform: () => true };
    if (!localStorage.getItem('puzzleComfort')) localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced' }));
    if (unlocked && !localStorage.getItem('puzzleProgress')) {
      localStorage.setItem('puzzleProgressSchema', '2');
      localStorage.setItem('puzzleUnlockedLevel', '17');
    }
    localStorage.setItem('hasPlayedBefore', 'true');
  }, unlocked);
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
}
async function navigate(page, key) {
  await evaluateApp(page, ({ ui, services }, key) => ui.navigate(services.levels.definitions.findIndex(level => level.key === key), { quick: true }), key);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe(key);
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
}
async function sceneState(page, expression) {
  return evaluateApp(page, ({ services }, expression) => new Function('scene', 'services', `return (${expression})`)(services.levels.activeScene, services), expression);
}
async function screenshot(page, name) {
  mkdirSync('.artifacts/after', { recursive: true });
  await page.screenshot({ path: `.artifacts/after/phone-${name}.png` });
}

async function resizePhone(page, width, height) {
  await page.setViewportSize({ width, height });
  await expect.poll(() => sceneState(page, 'scene.scale.width')).toBe(width);
  await expect.poll(async () => {
    const canvas = await page.locator('#game-container > canvas').boundingBox();
    const room = await page.locator('#game-viewport').boundingBox();
    return Math.abs(canvas.height - room.height);
  }).toBeLessThan(1);
}

test('in the app a phone gets the compact bar, a tap to begin, and the room filling the screen', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await open(page, { unlocked: false });
  await expect(page.locator('#rotate-prompt')).toBeHidden();
  await expect(page.locator('#compact-bar')).toBeVisible();
  await expect(page.locator('#compact-bar h1')).toHaveCount(0);
  await expect(page.locator('#start-prompt')).toHaveText('Tap to begin');
  await expect(page.locator('html')).toHaveAttribute('data-compact', 'true');
  await page.locator('#btn-continue').tap();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('BinaryTree');
  const canvas = await page.locator('#game-container > canvas').boundingBox();
  const viewport = page.viewportSize();
  expect(canvas.width).toBeGreaterThan(viewport.width * 0.95);
  expect(canvas.height).toBeGreaterThan(viewport.height * 0.6);
  // the console sits on one row at the bottom, inside the screen
  const submit = await page.locator('#btn-submit').boundingBox();
  const hint = await page.locator('#btn-info').boundingBox();
  const volume = await page.locator('#vol-icon-ui').boundingBox();
  expect(Math.abs(submit.y - hint.y)).toBeLessThan(12);
  expect(Math.abs(submit.y - volume.y)).toBeLessThan(16);
  expect(hint.x + hint.width).toBeLessThanOrEqual(viewport.width);
  await screenshot(page, 'room');
  expect(errors).toEqual([]);
});

test('the menu and the levels panel slide in as drawers and close again', async ({ page }) => {
  await open(page);
  await page.locator('#btn-continue').tap();
  await expect(page.locator('#sidebar')).not.toBeInViewport();
  await page.locator('#compact-menu').tap();
  await expect(page.locator('#sidebar')).toBeInViewport();
  await expect(page.locator('#btn-howto')).toBeVisible();
  await screenshot(page, 'menu');
  await page.locator('#drawer-scrim').tap({ position: { x: page.viewportSize().width - 30, y: 200 } });
  await expect(page.locator('#sidebar')).not.toBeInViewport();
  await page.locator('#compact-levels').tap();
  await expect(page.locator('#right-sidebar')).toBeInViewport();
  await screenshot(page, 'levels');
  // choosing a room closes the drawer and opens the room
  await page.locator('.level-btn').nth(9).tap();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Telescope');
  await expect(page.locator('#right-sidebar')).not.toBeInViewport();
  // a dialog from the drawer: open, readable, closable
  await page.locator('#compact-menu').tap(); await page.locator('#btn-howto').tap();
  await expect(page.locator('#howto-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('.howto-touch').first()).toBeVisible();
  await expect(page.locator('#btn-close-howto')).toBeInViewport();
  await page.locator('#btn-close-howto').tap();
  await expect(page.locator('#howto-modal')).toHaveClass(/hidden/);
  await expect(page.locator('#sidebar')).not.toBeInViewport();
});

test('taps operate the rooms: the code box, the telescope, a board row and the TV knob', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await page.locator('#btn-continue').tap();
  await navigate(page, 'BinaryTree');
  // the code box takes the on-screen keyboard's text and EXECUTE accepts it
  await page.locator('#level-code').tap(); await page.keyboard.type('cabbage');
  await page.locator('#btn-submit').tap();
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('PlantPot');
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  await navigate(page, 'Telescope');
  // a tap on the telescope goes to the glass
  const box = await page.locator('#game-container > canvas').boundingBox();
  await page.touchscreen.tap(box.x + box.width * 0.54, box.y + box.height * 0.43);
  await expect.poll(() => sceneState(page, 'scene.phase')).toBe(2);
  await screenshot(page, 'telescope');
  // a tap on a departures row reaches the row
  await navigate(page, 'Station');
  await evaluateApp(page, ({ services }) => { services.levels.activeScene._respinRow = row => { services.levels.activeScene._tappedRow = row; }; });
  const row = JSON.parse(await sceneState(page, 'JSON.stringify({x: scene._cells[2][0].txt.x, y: scene._cells[2][0].txt.y})'));
  await page.touchscreen.tap(box.x + row.x, box.y + row.y);
  await expect.poll(() => sceneState(page, 'scene._tappedRow')).toBe(2);
  // the TV's knob turns under a finger (the auto-tuning is stopped first)
  await navigate(page, 'TV');
  await evaluateApp(page, ({ services }) => services.levels.activeScene._autoTimer.remove(false));
  const channel = await sceneState(page, 'scene._channel');
  await page.locator('.da-btn[data-dir="1"]').tap();
  expect(await sceneState(page, 'scene._channel')).toBe((channel + 1) % 4);
  await screenshot(page, 'tv');
  expect(errors).toEqual([]);
});

test('the full-screen button slides the top bar away, the console stays, and the handle brings the bar back', async ({ page }) => {
  await open(page);
  await page.locator('#btn-continue').tap();
  await navigate(page, 'Telescope');
  const canvas = page.locator('#game-container > canvas');
  const before = await canvas.boundingBox();
  const consoleBox = await page.locator('#input-area').boundingBox();
  // one button: the top bar goes, the room grows into its place, the code box stays put
  await page.locator('#compact-fullscreen').tap();
  await expect(page.locator('html')).toHaveClass(/ui-top-collapsed/);
  await expect(page.locator('#ui-toast')).toBeVisible();
  await expect(page.locator('#compact-levels')).not.toBeInViewport();
  await expect(page.locator('#btn-submit')).toBeInViewport();
  await expect.poll(async () => (await canvas.boundingBox()).height, { timeout: 5000 }).toBeGreaterThan(before.height + 30);
  expect((await page.locator('#input-area').boundingBox()).height).toBeCloseTo(consoleBox.height, 0);
  expect(await sceneState(page, "scene.events.listenerCount('canvas_resized')")).toBe(1);
  await screenshot(page, 'immersive');
  // the handle stays at the top edge
  const pill = await page.locator('#handle-top').boundingBox();
  expect(pill.y).toBeLessThan(4);
  // a pull down on the handle brings the top bar back; a pull up hides it again
  const top = page.locator('#handle-top');
  let box = await top.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2, box.y + 60, { steps: 6 }); await page.mouse.up();
  await expect(page.locator('html')).not.toHaveClass(/ui-top-collapsed/);
  await expect(page.locator('#compact-levels')).toBeInViewport();
  box = await top.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2, box.y - 60, { steps: 6 }); await page.mouse.up();
  await expect(page.locator('html')).toHaveClass(/ui-top-collapsed/);
  await page.locator('#handle-top').tap();
  await expect(page.locator('html')).not.toHaveClass(/ui-top-collapsed/);
  await expect.poll(async () => (await canvas.boundingBox()).height, { timeout: 5000 }).toBeLessThan(before.height + 2);
});

test('a portrait phone is asked to turn, and the rooms survive the turn', async ({ page }) => {
  await open(page);
  await page.locator('#btn-continue').tap();
  await navigate(page, 'Wires');
  // the first tap asked for full screen; a full-screen window cannot be resized
  await page.evaluate(() => document.fullscreenElement && document.exitFullscreen());
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  await page.setViewportSize({ width: 412, height: 915 });
  await expect(page.locator('#rotate-prompt')).toBeVisible();
  await screenshot(page, 'portrait');
  await page.setViewportSize({ width: 915, height: 412 });
  await expect(page.locator('#rotate-prompt')).toBeHidden();
  await page.waitForTimeout(600); // the responsive scene rebuild uses a 350 ms debounce
  expect(await sceneState(page, 'scene._built')).toBe(true);
  expect(await sceneState(page, "scene.events.listenerCount('canvas_resized')")).toBe(1);
});

test('phone hints remain readable and scroll to the last hint with badges and large text', async ({ page }) => {
  await open(page); await navigate(page, 'Modem');
  for (const [width, height] of [[863, 360], [667, 375], [568, 320]]) {
    await resizePhone(page, width, height);
    await evaluateApp(page, ({ services }) => services.preferences.set({ textScale: 1.3 }));
    await page.locator('#btn-info').tap();
    await expect(page.locator('#handle-top')).toBeHidden();
    const list = page.locator('#hint-list');
    expect(await list.evaluate(el => el.clientHeight)).toBeGreaterThan(65);
    while (await page.locator('#btn-next-hint').isEnabled()) await page.locator('#btn-next-hint').tap();
    await expect(list.locator('li')).toHaveCount(3);
    await list.evaluate(el => { el.scrollTop = el.scrollHeight; });
    const last = await list.locator('li p').last().boundingBox();
    const area = await list.boundingBox();
    expect(last.y + last.height).toBeLessThanOrEqual(area.y + area.height + 1);
    await expect(page.locator('#btn-close-info')).toBeInViewport({ ratio: 1 });
    await screenshot(page, `hint-fixed-${width}`);
    await page.locator('#btn-close-info').tap();
  }
});

test('the Sequence clue fits small phones, clears Inspect, and cards still drag by touch', async ({ page }) => {
  await open(page); await navigate(page, 'Sequence');
  for (const [width, height] of [[863, 360], [667, 375], [568, 320]]) {
    await resizePhone(page, width, height);
    const canvas = await page.locator('#game-container > canvas').boundingBox();
    const inspect = await page.locator('#btn-inspect').boundingBox();
    const texts = await evaluateApp(page, ({ services }) => services.levels.activeScene.children.list
      .filter(o => o.text === '25 → 55' || o.text === 'how many, then what')
      .map(o => o.getBounds()));
    expect(texts).toHaveLength(2);
    for (const text of texts) {
      expect(text.x).toBeGreaterThanOrEqual(0);
      expect(text.y).toBeGreaterThanOrEqual(0);
      expect(text.x + text.width).toBeLessThanOrEqual(canvas.width);
      expect(text.y + text.height).toBeLessThanOrEqual(canvas.height);
      const overlaps = canvas.x + text.x < inspect.x + inspect.width && canvas.x + text.x + text.width > inspect.x
        && canvas.y + text.y < inspect.y + inspect.height && canvas.y + text.y + text.height > inspect.y;
      expect(overlaps).toBe(false);
    }
    await screenshot(page, `sequence-fixed-${width}`);
  }
  const slots = await sceneState(page, 'scene._slots');
  const before = await sceneState(page, 'scene._order');
  const canvas = await page.locator('#game-container > canvas').boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const from = { x: canvas.x + slots[0].x, y: canvas.y + slots[0].y };
  const to = { x: canvas.x + slots[1].x, y: canvas.y + slots[1].y };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...from, id: 1 }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * i / 8, y: from.y, id: 1 }] });
    await page.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => sceneState(page, 'scene._order')).toEqual([before[1], before[0], ...before.slice(2)]);
  await cdp.detach();
});

test('a touch opens usable calculator keys and keeps the result through close, resize and replay', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await page.locator('#btn-continue').tap();
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
  await navigate(page, 'Overtime');
  const dialog = page.getByRole('dialog', { name: 'Calculator', exact: true });
  const useCalculator = async () => {
    const target = await sceneState(page, '({ x: scene._calculatorTarget.x, y: scene._calculatorTarget.y })');
    const canvas = await page.locator('#game-container > canvas').boundingBox();
    await page.touchscreen.tap(canvas.x + target.x, canvas.y + target.y);
    await expect(dialog).toBeVisible();
  };
  await useCalculator();
  await expect(dialog.locator('output')).toHaveText('0');
  for (const key of '2203+1411+1147+2344=') await dialog.getByRole('button', { name: key, exact: true }).tap();
  await expect(dialog.locator('output')).toHaveText('7105');
  await page.evaluate(() => document.fullscreenElement && document.exitFullscreen());
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  await resizePhone(page, 568, 320);
  await expect(dialog.locator('output')).toHaveText('7105');
  for (const button of await dialog.locator('.calculator-keypad button').all()) {
    const box = await button.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await expect(button).toBeInViewport({ ratio: 1 });
  }
  await screenshot(page, 'calculator-fixed');
  await dialog.getByRole('button', { name: 'Back to room' }).tap();
  await expect(dialog).toBeHidden();
  expect(await sceneState(page, 'scene.calc.display')).toBe('7105');
  await useCalculator();
  await expect(dialog.locator('output')).toHaveText('7105');
  await dialog.getByRole('button', { name: 'C', exact: true }).tap();
  await dialog.getByRole('button', { name: '9', exact: true }).tap();
  await page.keyboard.press('Escape');
  expect(await sceneState(page, 'scene.calc.display')).toBe('9');
  await navigate(page, 'Overtime');
  await expect(page.locator('.calculator-detail')).toHaveCount(1);
  await useCalculator();
  await expect(dialog.locator('output')).toHaveText('0');
  await navigate(page, 'Pi');
  await expect(page.locator('.calculator-detail')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the moon clue stays after a tap and resize, toggles off, and resets on replay', async ({ page }) => {
  await open(page); await navigate(page, 'Pi');
  const tapMoon = async () => {
    const moon = await sceneState(page, '({ x: scene._moonHitArea.x, y: scene._moonHitArea.y })');
    const canvas = await page.locator('#game-container > canvas').boundingBox();
    await page.touchscreen.tap(canvas.x + moon.x, canvas.y + moon.y);
  };
  await tapMoon();
  await expect.poll(() => sceneState(page, 'scene._secantGraphics.visible')).toBe(true);
  await expect.poll(() => sceneState(page, 'scene._secantTween?.isPlaying() ?? false')).toBe(false);
  expect(await sceneState(page, 'scene._secantGraphics.visible')).toBe(true);
  await resizePhone(page, 667, 375);
  await expect.poll(() => sceneState(page, 'scene._secantTween?.isPlaying() ?? false')).toBe(false);
  expect(await sceneState(page, 'scene._secantGraphics.visible')).toBe(true);
  await screenshot(page, 'moon-fixed');
  await tapMoon();
  expect(await sceneState(page, 'scene._secantGraphics.visible')).toBe(false);
  await tapMoon();
  await navigate(page, 'Pi');
  expect(await sceneState(page, 'scene._secantGraphics.visible')).toBe(false);
});

test('Ripples and Vertex keep their clues in view on small phones and support touch Inspect', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('puzzleProgressSchema', '2');
    localStorage.setItem('puzzleUnlockedLevel', '26');
  });
  await open(page, { unlocked: false });
  for (const key of ['Ripples', 'Vertex']) {
    await navigate(page, key);
    for (const [width, height] of [[863, 360], [568, 320]]) {
      await resizePhone(page, width, height);
      await expect.poll(() => sceneState(page, 'scene._L.height === scene.cameras.main.height')).toBe(true);
      const fits = await evaluateApp(page, ({ services }) => {
        const scene = services.levels.activeScene, L = scene._L;
        const points = scene._letters?.map(entry => entry.text) ?? scene._points;
        return points.every(p => p.x > 8 && p.x < L.width - 8 && p.y > 8 && p.y < L.height - 8);
      });
      expect(fits).toBe(true);
      await screenshot(page, `${key}-${width}`);
    }
    await page.locator('#btn-inspect').tap();
    await expect(page.locator('#inspection-tools')).toBeVisible();
    await page.locator('#inspection-glass').tap({ position: { x: 260, y: 90 } });
    await page.locator('#inspect-in').tap();
    expect(await page.locator('#game-container').evaluate(el => el.style.transform)).toContain('scale(2.5)');
    await screenshot(page, `${key}-inspect`);
    await page.locator('#inspect-close').tap();
    await expect(page.locator('#inspection-tools')).toBeHidden();
  }
  expect(errors).toEqual([]);
});

test('Plotter, Kinetic and Genome keep readable clues inside a small phone and magnify by touch', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('puzzleProgressSchema', '2');
    localStorage.setItem('puzzleUnlockedLevel', '29');
  });
  await open(page, { unlocked: false });
  for (const key of ['Plotter', 'Kinetic', 'Genome']) {
    await navigate(page, key);
    for (const [width, height] of [[863, 360], [568, 320]]) {
      await resizePhone(page, width, height);
      await expect.poll(() => sceneState(page, 'scene._L.height === scene.cameras.main.height')).toBe(true);
      const fits = await evaluateApp(page, ({ services }) => {
        const scene = services.levels.activeScene, L = scene._L;
        const clues = [...(scene._codeTexts ?? []), ...(scene._fragmentText ? [scene._fragmentText] : []), scene._clue];
        return clues.flatMap(text => {
          const b = text.getBounds();
          const font = Number.parseFloat(text.style.fontSize);
          const fits = b.x >= 0 && b.y >= 0 && b.right <= L.width && b.bottom <= L.height && font >= 9;
          return fits ? [] : [{ text: text.text, font, x: b.x, y: b.y, right: b.right, bottom: b.bottom, screen: L }];
        });
      });
      expect(fits).toEqual([]);
      await screenshot(page, `${key}-${width}`);
    }
    await page.locator('#btn-inspect').tap();
    await expect(page.locator('#inspection-tools')).toBeVisible();
    await page.locator('#inspect-in').tap();
    expect(await page.locator('#game-container').evaluate(el => el.style.transform)).toContain('scale(2.5)');
    await screenshot(page, `${key}-inspect`);
    await page.locator('#inspect-close').tap();
  }
  expect(errors).toEqual([]);
});

test('a phone browser is shown the desktop-only page, and the game is never loaded', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#desktop-only')).toBeVisible();
  await expect(page.locator('#desktop-only')).toContainText('PLEASE RETURN ON A DESKTOP');
  await expect(page.locator('#loading-screen')).toHaveCount(0);
  await expect(page.locator('#start-screen')).toBeHidden();
  await expect(page.locator('#game-container canvas')).toHaveCount(0);
  expect(await page.evaluate(async () => {
    const entry = [...document.querySelectorAll('script[type="module"][src]')].find(script => new URL(script.src).pathname === '/src/entry.js');
    return (await import(entry.src)).ready;
  })).toBeNull();
  expect(errors).toEqual([]);
});
