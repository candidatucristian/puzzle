import { enterFullscreen, exitFullscreen, fullscreenElement, unlockOrientation, isIOS } from './mobile.js';

export function mountFullscreenControl(scope, button) {
  const offered = Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const label = button.querySelector('[data-fullscreen-label]') || button;
  const toast = document.getElementById('ui-toast');
  let pending = false, toastTimer;
  function sync() {
    const active = Boolean(fullscreenElement());
    label.textContent = active ? 'Exit full screen' : 'Full screen';
    button.setAttribute('aria-label', label.textContent);
    button.setAttribute('aria-pressed', String(active));
    button.disabled = !offered || pending;
    button.title = !offered
      ? (isIOS() ? 'Safari on iPhone has no full screen: add the game to the Home Screen instead' : 'Full screen is unavailable in this browser')
      : active ? 'Exit full screen (Esc)' : 'Enter full screen';
  }

  // Activating this control with the keyboard must not start the game.
  scope.on(button, 'keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
  });
  scope.on(button, 'click', async () => {
    if (pending) return;
    pending = true; sync();
    let failed;
    if (fullscreenElement()) {
      await exitFullscreen();
      failed = Boolean(fullscreenElement());
      if (!failed) unlockOrientation();
    } else failed = !(await enterFullscreen());
    pending = false;
    sync();
    if (failed) {
      const message = 'Full screen could not be changed. Try again.';
      button.title = message;
      if (toast) {
        scope.cancel(toastTimer);
        toast.textContent = message; toast.hidden = false;
        toastTimer = scope.later(() => { if (toast.textContent === message) toast.hidden = true; }, 5000);
      }
    }
  });
  scope.on(document, 'fullscreenchange', () => { if (!fullscreenElement()) unlockOrientation(); sync(); });
  scope.on(document, 'webkitfullscreenchange', sync);
  sync();
}
