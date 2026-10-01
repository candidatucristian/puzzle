/** A common, non-destructive focus frame for Phaser objects. Existing object
 * animation, hit areas and puzzle handlers remain owned by each scene. */
export function attachSceneFeedback(scene) {
  let target = null, frame = null, pressedUntil = 0;
  const emit = detail => scene.game.events.emit('puzzle:interaction', detail);
  function clear() { target = null; if (frame?.scene) frame.clear(); emit({ label: '' }); }
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
    target = object; pressedUntil = scene.time.now + 170;
    emit({ label: labelFor(object), pressed: true, x: pointer.x, y: pointer.y });
  }
  function draw() {
    if (!scene.input.enabled || !target?.scene || !target.visible || !target.input?.enabled) { if (target) clear(); return; }
    if (!frame?.scene) frame = scene.add.graphics().setDepth(10000);
    const b = target.getBounds();
    frame.clear();
    frame.lineStyle(1, 0xeae5d6, scene.time.now < pressedUntil ? .75 : .28);
    frame.strokeRoundedRect(b.x - 3, b.y - 3, b.width + 6, b.height + 6, 4);
  }
  scene.input.on('gameobjectover', over);
  scene.input.on('gameobjectout', out);
  scene.input.on('gameobjectdown', down);
  scene.input.on('dragstart', clear);
  scene.input.on('gameout', clear);
  scene.events.on('postupdate', draw);
  return () => {
    clear(); frame?.destroy();
    scene.input.off('gameobjectover', over);
    scene.input.off('gameobjectout', out);
    scene.input.off('gameobjectdown', down);
    scene.input.off('dragstart', clear);
    scene.input.off('gameout', clear);
    scene.events.off('postupdate', draw);
    scene.game.canvas.style.cursor = '';
  };
}
