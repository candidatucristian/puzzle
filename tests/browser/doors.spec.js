import { test, expect } from '@playwright/test';
import { evaluateApp } from './app.js';

async function hall(page, reduced = false) {
  await page.goto('/');
  await page.locator('#loading-screen').waitFor({ state: 'detached', timeout: 30000 });
  await evaluateApp(page, ({ ui, services }) => {
    ui.showGame();
    services.preferences.set({ ambientEffects: false });
    services.levels.enterHall();
  });
  await expect.poll(() => evaluateApp(page, ({ services }) => {
    const scene = services.levels.activeScene;
    return scene?.scene.key === 'Hall' && !scene.cameras.main.fadeEffect.isRunning;
  })).toBe(true);
  if (reduced) await evaluateApp(page, ({ services }) => services.preferences.set({ motion: 'reduced' }));
}

async function clickDoor(page, index) {
  const at = await evaluateApp(page, ({ game, services }, index) => {
    const scene = services.levels.activeScene, d = scene._L.doors[index];
    const rect = game.canvas.getBoundingClientRect();
    const point = d.quad.reduce((p, q) => ({ x: p.x + q.x / 4, y: p.y + q.y / 4 }), { x: 0, y: 0 });
    return { x: rect.x + point.x * rect.width / game.canvas.width, y: rect.y + point.y * rect.height / game.canvas.height };
  }, index);
  await page.mouse.click(at.x, at.y);
}

for (const [index, target] of ['Study', 'Room2', 'Room3', 'Room4', 'Room5', 'Room6'].entries()) {
  test(`door ${index + 1} opens on one click, enters ${target} on the next, and releases its texture`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await hall(page);
    await evaluateApp(page, ({ game, services }) => {
      const scene = services.levels.activeScene;
      const audit = { requests: 0, poses: [], draws: [], deltas: [], textures: [] };
      game.registry.set('doorAudit', audit);
      game.events.on('house:go', () => audit.requests++);
      const sample = (_time, delta) => {
        if (!scene._doorArt) return;
        if (!audit.wrapped) {
          audit.wrapped = true;
          const draw = scene._doorArt.draw;
          scene._doorArt.draw = (angle, handle) => {
            const start = performance.now();
            const result = draw(angle, handle);
            audit.draws.push(performance.now() - start);
            if (result.visible > 0 && result.visible < 1) audit.poses.push(result.quad[1].x);
            return result;
          };
        }
        audit.deltas.push(delta);
        audit.textures.push(game.textures.getTextureKeys().filter(key => key.startsWith('hl_swing')).length);
      };
      scene.events.on('update', sample);
      scene.events.once('shutdown', () => scene.events.off('update', sample));
    });
    await clickDoor(page, index);
    await expect.poll(() => evaluateApp(page, ({ services }) => Boolean(services.levels.activeScene?._doorOpening))).toBe(true);
    // Opening it again while it opens neither restarts it nor goes through.
    await evaluateApp(page, ({ services }, index) => {
      const scene = services.levels.activeScene;
      scene._open(scene._L.doors[index], services.levels.rooms[index]);
    }, index);
    await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?._doorOpening?.elapsed ?? 0), { intervals: [20] }).toBeGreaterThan(1600);
    expect(await evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Hall');
    expect(await evaluateApp(page, ({ game }) => game.registry.get('doorAudit').requests)).toBe(0);
    await clickDoor(page, index);
    await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key), { timeout: 7000 }).toBe(target);
    const audit = await evaluateApp(page, ({ game }) => ({
      ...game.registry.get('doorAudit'),
      remaining: game.textures.getTextureKeys().filter(key => key.startsWith('hl_swing')),
    }));
    expect(audit.requests).toBe(1);
    expect(new Set(audit.poses).size).toBeGreaterThan(14);
    expect(new Set(audit.textures)).toEqual(new Set([1]));
    expect(audit.remaining).toEqual([]);
    expect(errors).toEqual([]);
    console.log(`Door ${index + 1}: ${audit.poses.length} visible poses; max draw ${Math.max(...audit.draws).toFixed(1)} ms`);
  });
}

for (const elapsed of [300, 1050]) {
  test(`resizing ${elapsed} ms into opening keeps the door open, and the next click makes one walk`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await hall(page);
    await evaluateApp(page, ({ game }) => {
      game.registry.set('doorRequests', 0);
      game.events.on('house:go', () => game.registry.inc('doorRequests', 1));
    });
    await clickDoor(page, 1);
    await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?._doorOpening?.elapsed ?? 0), { intervals: [20] }).toBeGreaterThan(elapsed);
    await page.setViewportSize({ width: 1320, height: 920 });
    // still in the hall, the door standing open, until it is clicked again
    await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?._doorOpening?.elapsed ?? 0), { intervals: [20] }).toBeGreaterThan(1600);
    expect(await evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Hall');
    expect(await evaluateApp(page, ({ game }) => game.registry.get('doorRequests'))).toBe(0);
    await clickDoor(page, 1);
    await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key), { timeout: 7000 }).toBe('Room2');
    expect(await evaluateApp(page, ({ game }) => game.registry.get('doorRequests'))).toBe(1);
    expect(await evaluateApp(page, ({ game }) => game.textures.exists('hl_swing'))).toBe(false);
    expect(errors).toEqual([]);
  });
}

test('reduced motion plays the latch and enters without allocating an animated door', async ({ page }) => {
  await hall(page, true);
  await evaluateApp(page, ({ game, services }) => {
    const play = services.audio.playSfx.bind(services.audio);
    services.audio.playSfx = (key, ...args) => {
      if (key === 'doorhandle') game.registry.set('doorLatchPlayed', true);
      return play(key, ...args);
    };
  });
  await clickDoor(page, 0);
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Study');
  expect(await evaluateApp(page, ({ game }) => game.registry.get('doorLatchPlayed'))).toBe(true);
  expect(await evaluateApp(page, ({ game }) => game.textures.exists('hl_swing'))).toBe(false);
});

test('leaving during the latch cancels the pending door movement', async ({ page }) => {
  await hall(page);
  await clickDoor(page, 0);
  await expect.poll(() => evaluateApp(page, ({ services }) => Boolean(services.levels.activeScene?._doorOpening))).toBe(true);
  await evaluateApp(page, ({ services }) => services.levels.enterPlace('Room3'));
  await page.waitForTimeout(2000);
  expect(await evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Room3');
  expect(await evaluateApp(page, ({ game }) => game.textures.exists('hl_swing'))).toBe(false);
});

test('coming back out of a room, the hall never shows past its own edges', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await hall(page);
  // in through door I (at the side of the hall), and straight back out
  await evaluateApp(page, ({ services }) => services.levels.enterPlace('Study'));
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.scene.key)).toBe('Study');
  await evaluateApp(page, ({ game, services }) => {
    const seen = [];
    game.registry.set('hallViews', seen);
    const watch = () => {
      const scene = game.scene.getScene('Hall');
      if (!scene?.sys.isActive()) return;
      const cam = scene.cameras.main, v = cam.worldView;
      seen.push({ x0: v.x, y0: v.y, x1: v.x + v.width, y1: v.y + v.height, W: cam.width, H: cam.height, zoom: cam.zoom });
    };
    game.events.on('postrender', watch);
    services.levels.enterPlace('Hall', { place: 'Study' });
  });
  await page.waitForTimeout(450);
  await page.screenshot({ path: '.artifacts/previews/hall-zoom-out.png' });
  await expect.poll(() => evaluateApp(page, ({ services }) => services.levels.activeScene?.input.enabled), { timeout: 6000 }).toBe(true);
  const seen = await evaluateApp(page, ({ game }) => game.registry.get('hallViews'));
  const zoomed = seen.filter(v => v.zoom > 1.01);
  expect(zoomed.length).toBeGreaterThan(10);
  // nothing outside the picture: the view always inside the hall's own width and height
  const outside = seen.filter(v => v.x0 < -0.5 || v.y0 < -0.5 || v.x1 > v.W + 0.5 || v.y1 > v.H + 0.5);
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});
