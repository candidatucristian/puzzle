import { test, expect } from '@playwright/test';
import { evaluateApp } from './app.js';
import { buildMorseSteps } from '../../src/levels/lightswitch/puzzle.js';
import { LEVEL_METADATA } from '../../src/levels/metadata.js';

async function upperHall(page, reduced = false) {
  await page.goto('/');
  await page.locator('#loading-screen').waitFor({ state: 'detached', timeout: 30000 });
  await evaluateApp(page, ({ ui, services }, reduced) => {
    ui.showGame();
    services.preferences.set({ ambientEffects: false, motion: reduced ? 'reduced' : 'system' });
    services.levels.enterPlace('Upper');
  }, reduced);
  await expect.poll(() => evaluateApp(page, ({ services }) => {
    const scene = services.levels.activeScene;
    return scene?.scene.key === 'Upper' && Boolean(scene._lever) && !scene.cameras.main.fadeEffect.isRunning;
  })).toBe(true);
}

async function pull(page) {
  const point = await evaluateApp(page, ({ game, services }) => {
    const s = services.levels.activeScene._L.switch, rect = game.canvas.getBoundingClientRect();
    return { x: rect.x + s.x * rect.width / game.canvas.width, y: rect.y + s.y * rect.height / game.canvas.height };
  });
  await page.mouse.click(point.x, point.y);
}

const state = (page) => evaluateApp(page, ({ services }) => {
  const scene = services.levels.activeScene;
  return {
    busy: scene._busy, letter: scene._letter, amount: scene._lever.amount,
    phase: scene._lever.phase, sparks: scene._lever.sparks.length, flash: scene._lever.flash.alpha,
  };
});

test('the iron lever pulls down, holds each Morse letter, sparks and springs back for every pull', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await upperHall(page);
  await evaluateApp(page, ({ game, services }) => {
    const scene = services.levels.activeScene;
    const audit = { lights: [], pulls: [], returns: [], bursts: 0, sounds: [] };
    game.registry.set('leverAudit', audit);
    const light = scene._lit.bind(scene);
    scene._lit = (on, level = 1) => { audit.lights.push({ on, level }); light(on, level); };
    const trip = scene._lever.trip.bind(scene._lever);
    scene._lever.trip = () => { audit.bursts++; trip(); };
    const sound = services.audio.playSfx.bind(services.audio);
    services.audio.playSfx = (key, ...args) => { audit.sounds.push(key); return sound(key, ...args); };
    const sample = () => {
      if (scene._lever.phase === 'pulling') audit.pulls.push(scene._lever.amount);
      if (scene._lever.phase === 'returning') audit.returns.push(scene._lever.amount);
    };
    scene.events.on('postupdate', sample);
    scene.events.once('shutdown', () => scene.events.off('postupdate', sample));
  });
  const word = LEVEL_METADATA.find(level => level.id === 'lightswitch').code;
  for (const [index, letter] of [...word].entries()) {
    await evaluateApp(page, ({ game }) => { game.registry.get('leverAudit').lights = []; });
    await pull(page);
    await expect.poll(async () => (await state(page)).phase, { intervals: [30] }).toBe('held');
    expect((await state(page)).amount).toBe(1);
    // Pulling again while the signal is running must not advance a letter.
    await pull(page);
    await expect.poll(async () => (await state(page)).busy, { timeout: 6000, intervals: [40] }).toBe(false);
    const final = await state(page);
    expect(final.letter).toBe((index + 1) % word.length);
    expect(final.phase).toBe('rest');
    expect(final.amount).toBe(0);
    expect(final.sparks).toBe(0);
    expect(final.flash).toBe(0);
    const lights = await evaluateApp(page, ({ game }) => game.registry.get('leverAudit').lights);
    expect(lights).toEqual([
      ...buildMorseSteps(letter).map(({ on }) => ({ on, level: 1 })),
      { on: false, level: 1 }, { on: true, level: 0.6 }, { on: false, level: 1 },
    ]);
  }
  const audit = await evaluateApp(page, ({ game }) => game.registry.get('leverAudit'));
  expect(audit.bursts).toBe(word.length);
  expect(audit.sounds.filter(key => key === 'switchsound')).toHaveLength(word.length);
  expect(audit.sounds.filter(key => key === 'sparkle')).toHaveLength(word.length);
  expect(new Set(audit.pulls).size).toBeGreaterThan(10);
  expect(new Set(audit.returns).size).toBeGreaterThan(15);
  expect(audit.returns.every(amount => amount >= 0 && amount <= 1)).toBe(true);
  expect(errors).toEqual([]);
});

test('resize and leaving mid-signal release the lever without stale callbacks or textures', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await upperHall(page);
  await pull(page);
  await expect.poll(async () => (await state(page)).busy, { timeout: 6000 }).toBe(false);
  expect((await state(page)).letter).toBe(1);
  await pull(page);
  await expect.poll(async () => (await state(page)).phase, { intervals: [30] }).toBe('held');
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect.poll(async () => (await state(page)).phase).toBe('rest');
  expect((await state(page)).letter).toBe(1);
  expect(await evaluateApp(page, ({ game }) => game.textures.getTextureKeys().filter(key => key.endsWith('_iron_lever')))).toEqual(['Upper_iron_lever']);
  await pull(page);
  await expect.poll(async () => (await state(page)).busy).toBe(true);
  await evaluateApp(page, ({ services }) => services.levels.enterHall());
  await page.waitForTimeout(3800);
  expect(await evaluateApp(page, ({ game }) => game.textures.getTextureKeys().filter(key => key.endsWith('_iron_lever')))).toEqual([]);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Hall');
  expect(errors).toEqual([]);
});

test('reduced motion keeps the Morse interaction and returns the lever without flying sparks', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await upperHall(page, true);
  await pull(page);
  await expect.poll(async () => (await state(page)).phase).toBe('held');
  expect((await state(page)).amount).toBe(1);
  await expect.poll(async () => (await state(page)).busy, { timeout: 6000 }).toBe(false);
  expect(await state(page)).toMatchObject({ letter: 1, phase: 'rest', amount: 0, sparks: 0, flash: 0 });
  expect(errors).toEqual([]);
});
