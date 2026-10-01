/** Resize rendering independently of each scene's puzzle state. */
export function observeViewport(game, scope, { defer = () => false } = {}) {
  let timer, pending = null;
  const container = document.getElementById('game-container');
  function apply() {
    if (!pending) return;
    const { width, height } = pending;
    pending = null;
    if (width === game.scale.width && height === game.scale.height) return;
    game.scale.resize(width, height);
    game.canvas.style.width = width + 'px'; game.canvas.style.height = height + 'px';
    for (const scene of game.scene.getScenes(true)) scene.events.emit('canvas_resized', { width, height });
  }
  const observer = new ResizeObserver(entries => {
    const { width, height } = entries.at(-1).contentRect;
    scope.cancel(timer);
    if (width <= 0 || height <= 0) return;
    pending = { width: Math.round(width), height: Math.round(height) };
    // While the on-screen keyboard is up the room is only clipped, not
    // repainted; the pending size is applied once the keyboard goes.
    if (defer()) return;
    timer = scope.later(apply, 350);
  });
  observer.observe(container); scope.add(() => observer.disconnect());
  scope.on(document, 'focusout', () => { if (pending && !defer()) { scope.cancel(timer); timer = scope.later(apply, 350); } });
}
