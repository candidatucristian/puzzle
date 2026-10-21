import { enterFullscreen, exitFullscreen, fullscreenElement, unlockOrientation, isIOS } from './mobile.js';

export function mountFullscreenControl(scope, button, i18n = null) {
  const offered = Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const label = button.querySelector('[data-fullscreen-label]') || button;
  const toast = document.getElementById('ui-toast');
  let pending = false, toastTimer;
  function sync() {
    const active = Boolean(fullscreenElement());
    const text = active
      ? (i18n ? i18n.t('header.exitFullscreen') : 'Exit full screen')
      : (i18n ? i18n.t('header.fullscreen') : 'Full screen');
    label.textContent = text;
    button.setAttribute('aria-label', text);
    button.setAttribute('aria-pressed', String(active));
    button.disabled = !offered || pending;
    button.title = !offered
      ? (isIOS() ? 'Safari on iPhone has no full screen: add the game to the Home Screen instead' : 'Full screen is unavailable in this browser')
      : active ? (i18n ? `${i18n.t('header.exitFullscreen')} (Esc)` : 'Exit full screen (Esc)') : text;
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
  if (i18n) scope.add(i18n.subscribe(sync));
  sync();
}
