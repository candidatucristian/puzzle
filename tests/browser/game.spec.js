import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { evaluateApp } from './app.js';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';

async function launch(page) {
  await page.addInitScript(lastIndex => {
    if (!localStorage.getItem('puzzleProgress')) {
      localStorage.setItem('puzzleProgressSchema', '2');
      localStorage.setItem('puzzleUnlockedLevel', String(lastIndex));
    }
    localStorage.setItem('hasPlayedBefore', 'true');
  }, LEVEL_METADATA.length - 1);
  await page.goto('/');
  await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  await evaluateApp(page, ({ ui }) => ui.showGame());
}
async function navigate(page, key) {
  const accepted = await evaluateApp(page, ({ ui, services }, key) => {
    return ui.navigate(services.levels.definitions.findIndex(level => level.key === key), { quick: true });
  }, key);
  expect(accepted).toBe(true);
  await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
}
async function sceneState(page, expression) {
  return evaluateApp(page, ({ services }, expression) => {
    return new Function('scene', 'services', `return (${expression})`)(services.levels.activeScene, services);
  }, expression);
}

test('the room index stays in the frame and narrows the game area', async ({ page }) => {
  await launch(page);
  const game = await page.locator('#game-viewport').boundingBox();
  const levels = await page.locator('#sidebar').boundingBox();
  await expect(page.locator('#sidebar')).toBeInViewport();
  expect(levels.x).toBeGreaterThan(game.x + game.width);
  expect(game.width).toBeLessThan(page.viewportSize().width - levels.width);
});

test('the selected room stays in place with a darker tile and no visible border', async ({ page }) => {
  await launch(page);
  const initialRects = await page.locator('.level-btn').evaluateAll(tiles => tiles.slice(0, 2).map(tile => {
    const tileRect = tile.getBoundingClientRect();
    const numberRect = tile.querySelector('.level-number').getBoundingClientRect();
    return { tileWidth: tileRect.width, numberWidth: numberRect.width };
  }));
  await navigate(page, 'PlantPot');
  const currentTile = page.locator('.level-btn[aria-current="step"]');
  await expect(currentTile).toContainText('The Moonlit Garden');
  const result = await currentTile.evaluate(element => {
    const tile = getComputedStyle(element);
    const number = getComputedStyle(element.querySelector('.level-number'));
    return {
      tileWidth: element.getBoundingClientRect().width,
      numberWidth: element.querySelector('.level-number').getBoundingClientRect().width,
      borderColor: tile.borderTopColor,
      shadow: tile.boxShadow,
      backgroundColor: tile.backgroundColor,
      numberFill: getComputedStyle(element.querySelector('.level-number'), '::before').content,
      numberColor: number.color,
      nameVisible: getComputedStyle(element.querySelector('.level-name')).visibility,
      previewVisible: getComputedStyle(element.querySelector('.level-preview')).visibility,
    };
  });
  expect(result.borderColor).toBe('rgb(69, 89, 103)');
  expect(result.shadow).toBe('none');
  expect(result.backgroundColor).toBe('rgb(11, 20, 29)');
  expect(result.numberFill).toBe('none');
  expect(result.numberColor).not.toBe('rgb(17, 24, 32)');
  expect(result.numberWidth).toBeCloseTo(initialRects[1].numberWidth, 0);
  expect(result.numberWidth / result.tileWidth).toBeCloseTo(initialRects[1].numberWidth / initialRects[1].tileWidth, 2);
  expect(result.nameVisible).toBe('visible');
  expect(result.previewVisible).toBe('visible');
});

test('test access reuses the entry module when its URL has a Vite timestamp', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/', async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace(
      /src="\/src\/entry\.js(?:\?[^"]*)?"/,
      'src="/src/entry.js?t=123456789"',
    );
    await route.fulfill({ response, body: html });
  });
  await launch(page);
  expect(await evaluateApp(page, ({ game }) => Boolean(game))).toBe(true);
  expect(await evaluateApp(page, ({ game }) => Boolean(game))).toBe(true);
  await expect(page.locator('#game-container > canvas')).toHaveCount(1);
  expect(errors).toEqual([]);
});

for (const level of LEVEL_METADATA) {
  test(`${level.key}: starts, redraws and replays without stale resources`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'warning' && message.text().includes('[AudioManager]')) errors.push(message.text()); });
    page.on('response', response => { if (response.url().includes('/assets/') && response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
    await launch(page); await navigate(page, level.key);
    expect(await sceneState(page, 'scene.scene.key')).toBe(level.key);
    expect(await sceneState(page, "scene.events.listenerCount('canvas_resized')")).toBe(1);
    mkdirSync('.artifacts/after', { recursive: true });
    await page.screenshot({ path: `.artifacts/after/${level.key}.png` });
    await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'reduced', ambientEffects: false }));
    await page.setViewportSize({ width: 1360, height: 900 });
    await page.waitForTimeout(500);
    await navigate(page, level.key);
    expect(await sceneState(page, "scene.events.listenerCount('canvas_resized')")).toBe(1);
    await navigate(page, level.key === 'BinaryTree' ? 'Sequence' : 'BinaryTree');
    expect(await page.locator('.scene-dom-overlay').count()).toBe(0);
    expect(errors).toEqual([]);
  });
}

test('master and channel settings reach real music and scene effects', async ({ page }) => {
  await launch(page); await navigate(page, 'Wires');
  await page.locator('#vol-slider-ui').fill('0.2');
  await expect.poll(() => sceneState(page, 'scene.sound.volume')).toBeCloseTo(.2);
  expect(await sceneState(page, 'services.audio.state.masterVol')).toBe(.2);
  await page.locator('#btn-options').click();
  await page.locator('#music-slider').fill('0.3');
  await expect.poll(() => sceneState(page, 'scene._music.volume')).toBeCloseTo(.21);
  await page.locator('#sfx-slider').fill('0');
  expect(await sceneState(page, 'services.audio.state.sfxVol')).toBe(0);
  await page.locator('#btn-close-options').click();
  await navigate(page, 'MobilePhone');
  await expect.poll(() => sceneState(page, 'scene.sound.volume')).toBeCloseTo(.2);
  // Phaser applies the configured gain when playback starts; a new idle
  // WebAudio sound still exposes its untouched GainNode's default value.
  await sceneState(page, 'scene.playKeySound()');
  await expect.poll(() => sceneState(page, 'scene.keySound.volume')).toBe(0);
  await page.locator('#vol-slider-ui').fill('0');
  await expect.poll(() => sceneState(page, 'scene.sound.mute')).toBe(true);
  await page.locator('#vol-icon-ui').click();
  await expect.poll(() => sceneState(page, 'scene.sound.volume')).toBeCloseTo(.2);
});

test('final answer, replay and navigation own exactly one completion callback', async ({ page }) => {
  const last = LEVEL_METADATA.at(-1); // whichever level closes the catalog
  await launch(page); await navigate(page, last.key);
  await page.locator('#level-code').fill(last.code.toLowerCase()); await page.locator('#btn-submit').click();
  await expect(page.locator('#completion-screen')).toBeVisible();
  await expect(page.locator('#completion-chambers')).toHaveText(`${LEVEL_METADATA.length} / ${LEVEL_METADATA.length}`);
  await page.locator('#btn-completion-close').click();
  await page.locator('#level-code').fill(last.code); await page.locator('#btn-submit').click();
  await page.locator('.level-btn').first().click();
  await page.waitForTimeout(800);
  await expect(page.locator('#completion-screen')).toBeHidden();
  await expect.poll(() => sceneState(page, 'scene.scene.key')).toBe('BinaryTree');
});

test('an inserted unsolved room prevents premature completion and completes the game when solved', async ({ page }) => {
  const missing = LEVEL_METADATA.find(level => level.key === 'Kinetic');
  const last = LEVEL_METADATA.at(-1);
  await page.addInitScript(({ ids, missing, last }) => {
    localStorage.setItem('puzzleProgress', JSON.stringify({
      version: 3, completedLevelIds: ids.filter(id => id !== missing), lastPlayedLevelId: last,
    }));
    localStorage.setItem('puzzleComfort', JSON.stringify({ motion: 'reduced' }));
  }, { ids: LEVEL_METADATA.map(level => level.id), missing: missing.id, last: last.id });
  await launch(page); await navigate(page, last.key);
  await page.locator('#level-code').fill(last.code); await page.locator('#btn-submit').click();
  await expect.poll(() => sceneState(page, 'scene.scene.key')).toBe(missing.key);
  await expect(page.locator('#completion-screen')).toBeHidden();
  await expect(page.locator('#progress-count')).toHaveText(`${LEVEL_METADATA.length - 1} / ${LEVEL_METADATA.length} solved`);
  await page.locator('#level-code').fill(missing.code); await page.locator('#btn-submit').click();
  await expect(page.locator('#completion-screen')).toBeVisible();
  await expect(page.locator('#completion-chambers')).toHaveText(`${LEVEL_METADATA.length} / ${LEVEL_METADATA.length}`);
});

test('Hints follow the catalog and dialogs support keyboard focus and Escape', async ({ page }) => {
  await launch(page); await navigate(page, 'Wires');
  await page.locator('#btn-info').click();
  await expect(page.locator('#info-requires')).toContainText('Reference may help');
  await page.keyboard.press('Escape');
  await expect(page.locator('#btn-info')).toBeFocused();
  await navigate(page, 'Cryptex'); await page.locator('#btn-info').click();
  await expect(page.locator('#info-requires')).toBeHidden();
  const overflow = await page.locator('#info-modal .modal-content').evaluate(el => {
    const style = getComputedStyle(el);
    // The decorative pencil outline intentionally extends beyond the card.
    return {
      x: /auto|scroll/.test(style.overflowX) && el.scrollWidth > el.clientWidth,
      y: /auto|scroll/.test(style.overflowY) && el.scrollHeight > el.clientHeight,
    };
  });
  expect(overflow).toEqual({ x: false, y: false });
  await expect(page.locator('#hint-list')).toBeInViewport();
  await expect(page.locator('#btn-close-info')).toBeInViewport();
});

test('candle stays extinguished through resize and resets on replay', async ({ page }) => {
  await launch(page); await navigate(page, 'Cryptex');
  const candle = page.locator('.candle-action');
  await sceneState(page, 'scene._openOverlay()');
  await candle.click();
  expect(await sceneState(page, 'scene.candle.clicks')).toBe(0);
  await sceneState(page, 'scene._closeOverlay()');
  await expect.poll(() => sceneState(page, 'scene._overlayOpen')).toBe(false);
  // the button comes back 820 ms after each breath on the game's clock; under
  // a loaded machine the frames that carry that clock can arrive slowly
  for (let i = 0; i < 3; i++) { await expect(candle).toBeEnabled({ timeout: 20000 }); await candle.click(); }
  expect(await sceneState(page, 'scene.candle.clicks')).toBe(3);
  await expect.poll(() => sceneState(page, 'scene._lettersShown')).toBe(true);
  await expect.poll(() => sceneState(page, 'scene.candle.lightState.level')).toBe(0);
  await page.waitForTimeout(1800);
  mkdirSync('.artifacts/after', { recursive: true });
  await page.screenshot({ path: '.artifacts/after/Cryptex-extinguished.png' });
  const angle = await sceneState(page, 'scene._wheelAngle');
  const wheel = await sceneState(page, 'scene._wheel');
  const canvas = await page.locator('#game-container > canvas').boundingBox();
  await page.mouse.move(canvas.x + wheel.cx, canvas.y + wheel.cy);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => sceneState(page, 'scene._wheelAngle')).not.toBe(angle);
  await page.setViewportSize({ width: 1360, height: 900 }); await page.waitForTimeout(500);
  expect(await sceneState(page, 'scene.candle.clicks')).toBe(3);
  await expect(page.locator('.candle-action')).toBeDisabled();
  await navigate(page, 'Cryptex'); expect(await sceneState(page, 'scene.candle.clicks')).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect.poll(() => sceneState(page, 'scene._W')).toBeGreaterThan(1100);
  await expect(page.locator('.candle-action')).toBeInViewport();
  await page.screenshot({ path: '.artifacts/after/Cryptex-wide.png' });
  await candle.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => sceneState(page, 'scene.candle.clicks')).toBe(1);
});

test('a missing optional Wires recording preserves the default background music', async ({ page }) => {
  await page.route('**/assets/sounds/Wires/music.mp3', route => route.fulfill({ status: 404, body: '' }));
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await launch(page); await navigate(page, 'Wires');
  expect(await sceneState(page, 'scene._music == null')).toBe(true);
  expect(await sceneState(page, '!!services.audio.state.bgmInstance')).toBe(true);
  expect(errors).toEqual([]);
});

test('Telescope remains interactive when either transition is interrupted by resize', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await launch(page); await navigate(page, 'Telescope');
  for (const delay of [100, 1100]) {
    await sceneState(page, 'scene._enterSky()');
    await page.waitForTimeout(delay);
    await page.setViewportSize({ width: 1370 + delay / 100, height: 910 });
    await expect.poll(() => sceneState(page, 'scene.phase')).toBe(2);
    await sceneState(page, 'scene._exitSky()');
    await page.setViewportSize({ width: 1360, height: 900 });
    await expect.poll(() => sceneState(page, 'scene.phase')).toBe(0);
  }
  await sceneState(page, 'scene._enterSky()');
  await expect.poll(() => sceneState(page, 'scene.phase')).toBe(2);
  expect(errors).toEqual([]);
});

test('Rally runs once, keeps its dark podium on resize, and starts fresh on replay', async ({ page }) => {
  // The six cars are painted frame by frame before the first one leaves; on
  // a slow machine (CI's two cores, software rendering) that alone can take
  // longer than the race, so the stage gets as long as it needs.
  test.setTimeout(150000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await launch(page); await navigate(page, 'Rally');
  await expect.poll(() => sceneState(page, '!scene._carJob'), { timeout: 90000 }).toBe(true);
  await expect.poll(() => sceneState(page, 'scene._finished && !!scene._podium?.active'), { timeout: 30000 }).toBe(true);
  const round = await sceneState(page, 'scene._round');
  await page.waitForTimeout(2500);
  expect(await sceneState(page, 'scene._round')).toBe(round);
  await page.setViewportSize({ width: 1360, height: 900 }); await page.waitForTimeout(600);
  expect(await sceneState(page, 'scene._finished && !!scene._podium?.active && scene._lights.every(light => light.alpha === 0)')).toBe(true);
  await navigate(page, 'Rally');
  expect(await sceneState(page, 'scene._finished')).toBe(false);
  expect(errors).toEqual([]);
});

test('Options controls and Execute use mouseclick, including keyboard activation', async ({ page }) => {
  await launch(page); await navigate(page, 'BinaryTree');
  await evaluateApp(page, ({ services }) => {
    const original = services.audio.playSfx.bind(services.audio);
    services.audio.testClicks = [];
    services.audio.playSfx = (key, ...args) => { services.audio.testClicks.push(key); return original(key, ...args); };
  });
  await page.locator('#btn-options').click();
  await page.locator('#btn-howto').click(); await page.locator('#btn-close-howto').click();
  await page.locator('#btn-close-options').click();
  await page.locator('#btn-submit').focus(); await page.keyboard.press('Enter');
  expect(await sceneState(page, 'services.audio.testClicks')).toEqual(['ui_click', 'ui_click', 'click', 'ui_click', 'ui_click']);
});

test('confirmed reset cancels pending navigation and preserves sound preferences', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await launch(page); await navigate(page, 'Rally');
  await page.locator('#vol-slider-ui').fill('0.4');
  await page.locator('.level-btn').nth(10).click();
  // Open via the keyboard while the transition veil covers the game.
  await page.locator('#btn-options').focus(); await page.keyboard.press('Enter');
  await page.locator('#btn-new').click(); await page.locator('#btn-new').click();
  await expect.poll(() => sceneState(page, 'scene?.scene.key'), { timeout: 12000 }).toBe('BinaryTree');
  await expect(page.locator('.level-btn.unlocked')).toHaveCount(0);
  expect(await sceneState(page, 'services.audio.state.masterVol')).toBe(.4);
  await page.reload(); await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
  expect(await sceneState(page, 'services.levels.unlockedIndex')).toBe(0);
  expect(await page.locator('#vol-slider-ui').inputValue()).toBe('0.4');
});

test('a missing startup asset shows an actionable loading error', async ({ page }) => {
  await page.route('**/assets/sounds/global/background.mp3', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/');
  await expect(page.locator('#loading-label')).toContainText('Unable to load the game');
  await expect(page.getByRole('button', { name: 'RETRY', exact: true })).toBeVisible();
  await expect(page.locator('#loading-screen')).toBeVisible();
});

for (const deniedStorage of [false, true]) {
  test(`a first visit can solve and unlock with ${deniedStorage ? 'unavailable' : 'persistent'} storage`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (deniedStorage) await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage denied', 'SecurityError'); } });
    });
    await page.goto('/');
    await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
    await page.keyboard.press('Enter');
    await expect.poll(() => evaluateApp(page, ({ ui }) => ui.busy)).toBe(false);
    await expect(page.locator('.level-btn').nth(1)).toHaveAttribute('aria-disabled', 'true');
    await page.locator('#level-code').fill('wrong'); await page.locator('#btn-submit').click();
    await expect(page.locator('#level-code')).toHaveClass(/error-flash/);
    await expect(page.locator('.level-btn').nth(1)).toHaveAttribute('aria-disabled', 'true');
    await page.locator('#level-code').fill(LEVEL_METADATA[0].code.toLowerCase()); await page.locator('#btn-submit').click();
    await expect(page.locator('.level-btn').nth(1)).toHaveAttribute('aria-current', 'step');
    expect(await sceneState(page, 'services.levels.canAccess(1)')).toBe(true);
    if (!deniedStorage) {
      await page.reload(); await expect(page.locator('#loading-screen')).toHaveCount(0, { timeout: 30000 });
      expect(await sceneState(page, 'services.levels.currentIndex')).toBe(1);
      expect(await sceneState(page, 'services.progress.state.completedLevelIds')).toEqual([LEVEL_METADATA[0].id]);
    }
    expect(errors).toEqual([]);
  });
}

test('TV channels and the resized DOM remain interactive', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await launch(page); await navigate(page, 'TV');
  const caption = page.locator('.tv__caption .st');
  await expect(caption).toContainText('COSMOS NET');
  await page.locator('.da-btn[data-dir="1"]').click();
  await expect(caption).toContainText('LAWCOURT');
  await page.keyboard.press('ArrowLeft'); await expect(caption).toContainText('COSMOS NET');
  await page.setViewportSize({ width: 1360, height: 900 }); await page.waitForTimeout(500);
  await page.locator('.da-btn[data-dir="1"]').click(); await expect(caption).toContainText('LAWCOURT');
  expect(errors).toEqual([]);
});

test('the moon still draws on mouse hover and clears when the pointer leaves', async ({ page }) => {
  await launch(page); await navigate(page, 'Pi');
  const moon = await sceneState(page, '({ x: scene._moonHitArea.x, y: scene._moonHitArea.y })');
  const canvas = await page.locator('#game-container > canvas').boundingBox();
  await page.mouse.move(canvas.x + moon.x, canvas.y + moon.y);
  await expect.poll(() => sceneState(page, 'scene._secantGraphics.visible')).toBe(true);
  await page.mouse.move(canvas.x + 10, canvas.y + canvas.height - 10);
  await expect.poll(() => sceneState(page, 'scene._secantGraphics.visible')).toBe(false);
});

test('Overtime: the calculator adds the wall clocks by real clicks, survives a resize, and starts fresh on replay', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await launch(page); await navigate(page, 'Overtime');
  // press a key like a player: a real mouse click at the key's place on the canvas
  const press = async key => {
    const centre = await sceneState(page, `scene.keyCenter(${JSON.stringify(key)})`);
    const canvas = await page.locator('#game-container canvas').boundingBox();
    await page.mouse.click(canvas.x + centre.x, canvas.y + centre.y);
  };
  const shown = () => sceneState(page, 'scene.calc.display');
  expect(await shown()).toBe('0');
  await press('2'); await press('2'); await press('0'); await press('3');
  await expect.poll(shown).toBe('2203');
  await press('+');
  for (const key of '1411') await press(key);
  await press('+');
  await expect.poll(shown).toBe('3614');
  for (const key of '1147') await press(key);
  await press('+');
  for (const key of '2344') await press(key);
  await press('=');
  await expect.poll(shown).toBe('7105');
  // a resize redraws everything from the same state (the rebuild follows the
  // 350 ms debounce, so wait for the new size, not for a fixed time)
  await page.setViewportSize({ width: 1360, height: 900 });
  await expect.poll(() => sceneState(page, 'scene.scale.width'), { timeout: 10000 }).toBeLessThan(1440);
  await expect.poll(() => sceneState(page, 'scene._W')).toBeLessThan(1440);
  expect(await shown()).toBe('7105');
  await press('C');
  await expect.poll(shown).toBe('0');
  // the answer the game accepts is what the display spells upside down
  const answer = await sceneState(page, 'services.levels.definitions.find(level => level.key === "Overtime").code');
  expect(answer).toBe('SOIL');
  // replay: a fresh calculator, nothing left over from before
  await press('9');
  await expect.poll(shown).toBe('9');
  await navigate(page, 'Overtime');
  expect(await shown()).toBe('0');
  expect(errors).toEqual([]);
});

test('MobilePhone input commits, survives resize, reveals the caller, and resets on replay', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await launch(page);
  await navigate(page, 'MobilePhone');
  // Two presses of one key must land within the 800 ms commit window, so the
  // key positions are read once per layout and each press is a single click.
  let centres = {}, canvas;
  const measure = async () => {
    centres = await evaluateApp(page, ({ services }) => {
      const scene = services.levels.activeScene;
      const out = {};
      for (const item of scene.keypadContainer.list) {
        const label = item.list?.find(child => child.type === 'Text');
        if (label) out[label.text] = item.getWorldTransformMatrix().transformPoint(0, 0);
      }
      out.ANSWER = scene.navContainer.getWorldTransformMatrix().transformPoint(0, 0);
      return out;
    });
    canvas = await page.locator('#game-container canvas').boundingBox();
  };
  const press = async key => {
    const centre = centres[key];
    await page.mouse.click(canvas.x + centre.x, canvas.y + centre.y);
  };
  await measure();
  await press('2');
  await expect.poll(() => sceneState(page, 'scene.phoneInput.text')).toBe('A');
  await press('2');
  expect(await sceneState(page, 'scene.screenInput.text')).toBe('AA');
  await page.setViewportSize({ width: 1360, height: 900 });
  const resizedRoom = await page.locator('#game-container').boundingBox();
  await expect.poll(() => sceneState(page, 'scene.scale.width')).toBe(Math.round(resizedRoom.width));
  await expect.poll(() => sceneState(page, 'scene.scale.height')).toBe(Math.round(resizedRoom.height));
  await expect.poll(() => sceneState(page, 'scene.keypadContainer?.active')).toBe(true);
  expect(await sceneState(page, 'scene.screenInput.text')).toBe('AA');
  await measure();
  await press('#'); await press('#');
  for (const key of '433666777433') await press(key);
  await expect.poll(() => sceneState(page, 'scene.menuText.text')).toBe('ANSWER');
  await press('ANSWER');
  expect(await sceneState(page, 'scene.callerNumber.text')).toBe('GEORGE');
  expect(await sceneState(page, 'scene.isSolved')).toBe(true);
  await navigate(page, 'MobilePhone');
  expect(await sceneState(page, 'scene.screenInput.text')).toBe('');
  expect(await sceneState(page, 'scene.isSolved')).toBe(false);
  await press('2');
  await navigate(page, 'BinaryTree');
  expect(errors).toEqual([]);
});

test('the development reference ledger derives every solution from the catalog', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tools/levels/');
  await expect(page.locator('.level-card')).toHaveCount(LEVEL_METADATA.length);
  await expect(page.locator('.code-value')).toHaveText(LEVEL_METADATA.map(level => level.code));
  await page.locator('#filter-input').fill('Rally');
  await expect(page.locator('.level-card:visible')).toHaveCount(1);
  await expect(page.locator('.level-card:visible')).toContainText('SILVER');
  expect(errors).toEqual([]);
});
