import { enterFullscreen, exitFullscreen, fullscreenElement, unlockOrientation, isIOS } from './mobile.js';

export function mountFullscreenControl(scope, button) {
  const offered = Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  function sync() {
    const active = Boolean(fullscreenElement());
    button.textContent = active ? 'Exit Full Screen' : 'Full Screen';
    button.setAttribute('aria-pressed', String(active));
    button.disabled = !offered;
    button.title = !offered
      ? (isIOS() ? 'Safari on iPhone has no full screen: add the game to the Home Screen instead' : 'Full screen is unavailable in this browser')
      : active ? 'Exit full screen (Esc)' : 'Enter full screen';
  }

  // Activating this control with the keyboard must not start the game.
  scope.on(button, 'keydown', event => event.stopPropagation());
  scope.on(button, 'click', async () => {
    button.disabled = true;
    if (fullscreenElement()) { exitFullscreen(); unlockOrientation(); }
    else if (!(await enterFullscreen())) button.title = 'Full screen could not be changed. Try again.';
    sync();
  });
  scope.on(document, 'fullscreenchange', () => { if (!fullscreenElement()) unlockOrientation(); sync(); });
  scope.on(document, 'webkitfullscreenchange', sync);
  sync();
}
