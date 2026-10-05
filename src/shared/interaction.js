/** Share interaction labels and cursor feedback without drawing over puzzle
 * objects. Existing hit areas and handlers remain owned by each scene. */
export function attachSceneFeedback(scene) {
  let target = null;
  const emit = detail => scene.game.events.emit('puzzle:interaction', detail);
  function clear() { target = null; emit({ label: '' }); }
  function labelFor(object) {
    return object.getData?.('interactionLabel') || (object.input?.draggable ? 'Drag to move' : 'Click to interact');
  }
  function eligible(object) {
    if (!object?.input?.enabled || object.getData?.('interactionLabel') === false) return false;
    const b = object.getBounds?.();
    return b && b.width > 0 && b.height > 0 && !(b.width > scene.scale.width * .85 && b.height > scene.scale.height * .8);
  }
  function over(pointer, object) {
    if (!eligible(object)) return;
    target = object;
    if (!object.input.cursor) object.input.cursor = object.input.draggable ? 'grab' : 'pointer';
    scene.game.canvas.style.cursor = object.input.cursor;
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
