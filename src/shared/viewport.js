/** Resize rendering independently of each scene's puzzle state. */
export function observeViewport(game, scope) {
  let timer;
  const container = document.getElementById('game-container');
  const observer = new ResizeObserver(entries => {
    const { width, height } = entries.at(-1).contentRect;
    scope.cancel(timer);
    if (width <= 0 || height <= 0) return;
    timer = scope.later(() => {
      game.scale.resize(width, height);
      game.canvas.style.width = width + 'px'; game.canvas.style.height = height + 'px';
      for (const scene of game.scene.getScenes(true)) scene.events.emit('canvas_resized', { width, height });
    }, 350);
  });
  observer.observe(container); scope.add(() => observer.disconnect());
}
