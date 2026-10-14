import { CURSORS, cursorFor } from './cursors.js';
import { PLACES } from './house.js';
/** Share interaction labels and cursor feedback without drawing over puzzle
 * objects. Existing hit areas and handlers remain owned by each scene. */
export function attachSceneFeedback(scene) {
  let target = null;
  const emit = detail => scene.game.events.emit('puzzle:interaction', detail);
  function clear() { target = null; emit({ label: '' }); }
  function labelFor(object) {
    return object.getData?.('interactionLabel') || (object.input?.draggable ? 'Drag to move' : 'Click to interact');
  }
  // what the pointer finds: for a zone drawn over the whole picture with a
  // shape for its hit area (a door, a thing in a room), the shape's own extent
  function extent(object) {
    const pts = object.input?.hitArea?.points;
    if (!pts?.length) return object.getBounds?.();
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  }
  function eligible(object) {
    if (!object?.input?.enabled || object.getData?.('interactionLabel') === false) return false;
    const b = extent(object);
    return b && b.width > 0 && b.height > 0 && !(b.width > scene.scale.width * .85 && b.height > scene.scale.height * .8);
  }
  function over(pointer, object) {
    if (!eligible(object)) return;
    target = object;
    if (!object.input.cursor) object.input.cursor = object.input.draggable ? 'grab' : 'pointer';
    // a plain pointer says more when the thing says what it is for
    // the ways through are only in the house's own places; in a puzzle, the hand
    const inHouse = PLACES.some(place => place.key === scene.scene.key);
    const said = ['pointer', 'not-allowed', 'grab'].includes(object.input.cursor)
      ? (inHouse ? cursorFor(labelFor(object), object.getData?.('side')) : CURSORS.hand) : null;
    scene.game.canvas.style.cursor = said || object.input.cursor;
    emit({ label: labelFor(object) });
  }
  function out(pointer, object) { if (object === target) clear(); }
  function down(pointer, object) {
    if (!eligible(object)) return;
    target = object;
    emit({ label: labelFor(object), pressed: true, x: pointer.x, y: pointer.y });
  }
  scene.input.on('gameobjectover', over);
  scene.input.on('gameobjectout', out);
  scene.input.on('gameobjectdown', down);
  scene.input.on('dragstart', clear);
  scene.input.on('gameout', clear);
  return () => {
    clear();
    scene.input.off('gameobjectover', over);
    scene.input.off('gameobjectout', out);
    scene.input.off('gameobjectdown', down);
    scene.input.off('dragstart', clear);
    scene.input.off('gameout', clear);
    scene.game.canvas.style.cursor = '';
  };
}
