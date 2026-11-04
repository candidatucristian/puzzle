// Something locked in the game's picture — a coffer, a door, the gate —
// pointed at: the padlock pointer (shared/cursors.js, from the label
// 'Locked' and the not-allowed cursor) and, just under that padlock, the
// paper note the header's tools have (ui/tooltips.js), "Locked" in the
// player's language. The note goes along with the pointer while it moves
// over the locked thing.

// the padlock pointer: 32 px, its hot spot at (16, 18), its lock 7–25 across
// and 4–28 down — so it spans 9 px either side of the point and 10 px below
const LOCK = { left: 9, right: 9, top: 14, bottom: 10 };

export function lockedNote(scene, zone) {
  const words = () => scene.services?.i18n?.t?.('common.chestLocked') || 'Locked';
  // the padlock as it stands on the screen, for a pointer in the game
  const padlock = (pointer) => {
    const r = scene.game.canvas.getBoundingClientRect(), sx = r.width / scene.scale.width, sy = r.height / scene.scale.height;
    const x = r.left + pointer.x * sx, y = r.top + pointer.y * sy;
    return { left: x - LOCK.left, right: x + LOCK.right, top: y - LOCK.top, bottom: y + LOCK.bottom,
      width: LOCK.left + LOCK.right, height: LOCK.top + LOCK.bottom };
  };
  let note = null;
  const off = () => { note = null; window.dispatchEvent(new Event('tooltip:off')); };
  if (zone.input) zone.input.cursor = 'not-allowed';
  zone.setData('interactionLabel', 'Locked');
  zone.on('pointerover', (pointer) => {
    note = { text: words(), rect: padlock(pointer) };
    window.dispatchEvent(new CustomEvent('tooltip:at', { detail: note }));
  });
  zone.on('pointermove', (pointer) => {
    if (!note) return;
    note.rect = padlock(pointer);
    window.dispatchEvent(new CustomEvent('tooltip:move', { detail: note }));
  });
  zone.on('pointerout', off);
  zone.once('destroy', off);
  scene.events.once('shutdown', off);
  return zone;
}
