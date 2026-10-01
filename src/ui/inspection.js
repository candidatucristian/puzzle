/** Magnify the whole stage, including DOM objects, without resizing Phaser or
 * forwarding inspection gestures to the puzzle underneath. */
export function mountInspection(scope, { levels, canOpen }) {
  const viewport = document.getElementById('game-viewport');
  const stage = document.getElementById('game-container');
  const toggle = document.getElementById('btn-inspect');
  const glass = document.getElementById('inspection-glass');
  const tools = document.getElementById('inspection-tools');
  const amount = document.getElementById('inspection-zoom');
  let active = false, zoom = 2, x = .5, y = .5, drag = null;
  let scene, inputEnabled, keyboardEnabled;
  const clamp = n => Math.max(0, Math.min(1, n));

  function render() {
    const dx = -viewport.clientWidth * (zoom - 1) * x;
    const dy = -viewport.clientHeight * (zoom - 1) * y;
    stage.style.transform = active ? `translate(${dx}px, ${dy}px) scale(${zoom})` : '';
    amount.textContent = `${zoom.toFixed(1)}×`;
    document.getElementById('inspect-out').disabled = zoom <= 1.5;
    document.getElementById('inspect-in').disabled = zoom >= 3;
  }

  function close(restoreFocus = false) {
    if (!active) return;
    active = false;
    if (drag && glass.hasPointerCapture(drag.id)) glass.releasePointerCapture(drag.id);
    drag = null;
    glass.classList.remove('dragging');
    viewport.classList.remove('is-inspecting');
    glass.hidden = true; tools.hidden = true;
    stage.inert = false;
    if (scene?.input) scene.input.enabled = inputEnabled;
    if (scene?.input?.keyboard) scene.input.keyboard.enabled = keyboardEnabled;
    scene = null;
    toggle.setAttribute('aria-pressed', 'false');
    render();
    if (restoreFocus) toggle.focus();
  }

  scope.on(toggle, 'click', () => {
    if (active) { close(true); return; }
    if (!canOpen() || !levels.activeScene) return;
    active = true; x = .5; y = .5; zoom = 2;
    scene = levels.activeScene; inputEnabled = scene.input.enabled;
    keyboardEnabled = scene.input.keyboard?.enabled;
    scene.input.enabled = false;
    if (scene.input.keyboard) scene.input.keyboard.enabled = false;
    stage.inert = true;
    viewport.classList.add('is-inspecting');
    glass.hidden = false; tools.hidden = false;
    toggle.setAttribute('aria-pressed', 'true');
    render(); glass.focus();
  });
  scope.on(document.getElementById('inspect-close'), 'click', () => close(true));
  function changeZoom(delta) { zoom = Math.max(1.5, Math.min(3, zoom + delta)); render(); }
  scope.on(document.getElementById('inspect-in'), 'click', () => changeZoom(.5));
  scope.on(document.getElementById('inspect-out'), 'click', () => changeZoom(-.5));
  scope.on(glass, 'pointerdown', e => {
    if (e.button !== 0) return;
    drag = { px: e.clientX, py: e.clientY, x, y, id: e.pointerId };
    glass.setPointerCapture(e.pointerId);
    glass.classList.add('dragging');
  });
  scope.on(glass, 'pointermove', e => {
    if (!drag) return;
    x = clamp(drag.x - (e.clientX - drag.px) / (viewport.clientWidth * (zoom - 1)));
    y = clamp(drag.y - (e.clientY - drag.py) / (viewport.clientHeight * (zoom - 1)));
    render();
  });
  function endDrag() { drag = null; glass.classList.remove('dragging'); }
  scope.on(glass, 'pointerup', endDrag);
  scope.on(glass, 'pointercancel', endDrag);
  scope.on(glass, 'lostpointercapture', endDrag);
  scope.on(glass, 'wheel', e => { e.preventDefault(); changeZoom(e.deltaY < 0 ? .5 : -.5); }, { passive: false });
  scope.on(document, 'keydown', e => {
    if (!active) return;
    if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
    if (e.target !== glass) return;
    const keys = { ArrowLeft: [-.08, 0], ArrowRight: [.08, 0], ArrowUp: [0, -.08], ArrowDown: [0, .08] };
    if (keys[e.key]) { e.preventDefault(); x = clamp(x + keys[e.key][0]); y = clamp(y + keys[e.key][1]); render(); }
    if (['+', '=', '-'].includes(e.key)) { e.preventDefault(); changeZoom(e.key === '-' ? -.5 : .5); }
  });
  scope.on(window, 'resize', render);
  scope.add(levels.subscribe(() => close()));
  scope.add(() => close());
  return { close, get active() { return active; } };
}
