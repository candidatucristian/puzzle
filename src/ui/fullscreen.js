export function mountFullscreenControl(scope, button) {
  function sync() {
    const active = Boolean(document.fullscreenElement);
    button.textContent = active ? 'Exit Full Screen' : 'Full Screen';
    button.setAttribute('aria-pressed', String(active));
    button.disabled = !document.fullscreenEnabled;
    button.title = button.disabled ? 'Full screen is unavailable in this browser' :
      active ? 'Exit full screen (Esc)' : 'Enter full screen';
  }

  // Activating this control with the keyboard must not start the game.
  scope.on(button, 'keydown', event => event.stopPropagation());
  scope.on(button, 'click', async () => {
    button.disabled = true;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
      sync();
    } catch {
      sync();
      button.title = 'Full screen could not be changed. Try again.';
    }
  });
  scope.on(document, 'fullscreenchange', sync);
  sync();
}
