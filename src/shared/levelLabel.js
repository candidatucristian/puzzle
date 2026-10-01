/** The "Level N" label every room writes in its top right corner. It is
 *  sized for the screen it is on: full size on a desktop canvas, smaller on
 *  a phone, so it never covers the puzzle. */

const FONT = '"Special Elite", monospace';

/** How much the room's fixed-pixel lettering shrinks on a small canvas:
 *  1 on a desktop, down to a little over half on a phone. */
export function uiScale(W, H) {
  return Math.max(0.55, Math.min(1, Math.min(W / 1000, H / 720)));
}

export function drawLevelLabel(scene, W, H, opts = {}) {
  const k = uiScale(W, H);
  const index = scene.services.levels.definitions.findIndex(
    (l) => l.key === scene.scene.key,
  );
  const text = scene.add
    .text(W - Math.round(30 * k), Math.round((opts.y ?? 28) * k), "Level " + (index + 1), {
      fontFamily: opts.font || FONT,
      fontSize: Math.round(28 * k) + "px",
      color: opts.color || "#e8dcc0",
    })
    .setOrigin(1, 0)
    .setAlpha(0)
    .setDepth(20);
  if (opts.shadow) text.setShadow(0, 2, opts.shadow, 8, false, true);
  scene.tweens.add({ targets: text, alpha: 1, duration: 2000, ease: opts.ease });
  return text;
}
