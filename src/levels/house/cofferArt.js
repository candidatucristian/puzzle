import COFFER from './nativeCoffer.json';
import { WALK_MS } from '../../shared/house.js';
import { chime } from '../../shared/paint.js';
import { attachMovableSparkles } from '../../shared/movableSparkles.js';

const artVersion = room => COFFER.rooms[room]?.artVersion ?? COFFER.version;
export const cofferAtlasKey = room => `coffer_${room}_v${artVersion(room)}`;
export const cofferKeyArt = room => `coffer_${room}_key_v${artVersion(room)}`;

export function loadCofferArt(scene, room) {
  const spec = COFFER.rooms[room];
  if (!spec) return;
  for (const [key, name] of [[cofferAtlasKey(room), 'poses'], [cofferKeyArt(room), 'key']]) {
    if (!scene.textures.exists(key)) scene.load.image(key, `assets/images/Chest/native-v${artVersion(room)}/${room.toLowerCase()}-${name}.webp`);
  }
}

export function addCoffer(scene, room, chest, open) {
  const spec = COFFER.rooms[room], key = cofferAtlasKey(room);
  if (!spec || !scene.textures.exists(key)) return null;
  const texture = scene.textures.get(key);
  spec.frames.forEach((frame, i) => { if (!texture.has(i)) texture.add(i, 0, ...frame); });
  return scene.add.image(chest.box.x, chest.box.y, key, open ? COFFER.poses - 1 : 0)
    .setOrigin(0).setDisplaySize(chest.box.width, chest.box.height).setDepth(-6);
}

export function openCoffer(scene, image, fallback) {
  const duration = scene.reducedMotion ? 1 : 850;
  if (image.texture.key !== cofferAtlasKey(scene.place)) { image.setTexture(fallback); return 1; }
  const pose = { value: 0 };
  scene.tweens.add({ targets: pose, value: COFFER.poses - 1, duration, ease: 'Sine.easeInOut',
    onUpdate: () => image.setFrame(Math.round(pose.value)), onComplete: () => image.setFrame(COFFER.poses - 1) });
  return duration;
}

/** The coffer's light, shadow and materials are already in its room render. */
export function buildCoffer(scene, L, k) {
  const levels = scene.services.levels, c = L.chest;
  const waiting = levels.keyWaitingIn(scene.place);
  const taken = !waiting && L.things.every(thing => levels.isCompleted(levels.indexOf(thing.level)));
  scene._chest = addCoffer(scene, scene.place, c, taken) ?? scene.add.image(c.box.x, c.box.y, taken ? k.open : k.shut)
    .setOrigin(0).setDisplaySize(c.box.width, c.box.height).setDepth(-6);
  if (!taken && !waiting) {
    scene._lock = scene.add.zone(c.hit.x, c.hit.y, c.hit.width, c.hit.height).setOrigin(0)
      .setInteractive({ cursor: 'not-allowed' }).setData('interactionLabel', 'Locked').setDepth(5);
  }
  if (waiting) scene.time.delayedCall(WALK_MS + 150, () => scene._offerKey(waiting, k));
}

/** Open the real hinge, then raise the matching key without a light burst. */
export function offerCofferKey(scene, key, k) {
  const L = scene._L;
  if (!L || !scene._chest?.active) return;
  const levels = scene.services.levels, m = L.chest.mouth, u = L.u, still = scene.reducedMotion;
  const opening = openCoffer(scene, scene._chest, k.open);
  chime(scene, [[784, .04], [1175, .03], [1568, .02]], .8);
  scene.time.delayedCall(still ? 1 : opening * .72, () => {
    const h = 56 * u, ratio = 96 / 220, duration = still ? 1 : 700;
    const item = scene.add.image(m.x, m.y, k.key).setDepth(20).setAlpha(0)
      .setDisplaySize(h * ratio * .7, h * .7);
    scene.tweens.add({ targets: item, y: m.y - 80 * u, alpha: 1,
      displayWidth: h * ratio, displayHeight: h, duration, ease: 'Cubic.easeOut' });
    const sway = still ? null : scene.ambientTween({ targets: item, angle: { from: -3, to: 3 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene._sparkles.push(attachMovableSparkles(scene, item, { padding: 4 }));
    scene.time.delayedCall(duration, () => {
      item.setInteractive({ useHandCursor: true }).setData('interactionLabel', 'Take the key');
      item.once('pointerdown', () => {
        if (!levels.takeKey(key)) return;
        item.disableInteractive(); sway?.stop();
        scene.game.events.emit('puzzle:interaction', { label: '' });
        scene.game.canvas.style.cursor = '';
        chime(scene, [[1568, .03], [2093, .02]], .6);
        scene.tweens.add({ targets: item, x: L.W + 30 * u, y: L.H * .42, alpha: 0,
          duration: still ? 1 : 650, ease: 'Cubic.easeIn', onComplete: () => item.destroy() });
      });
    });
  });
}
