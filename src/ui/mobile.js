/** The phone and tablet layout: the two sidebars become drawers behind a
 *  compact top bar, the top bar can be slid away on a handle (or with the
 *  full-screen button, which also asks the browser for full screen), the
 *  console with the code box stays put, the start screen and the intro
 *  speak of tapping rather than keys, and a portrait phone is asked to
 *  turn. Nothing here changes the puzzles; the rooms get a smaller (or,
 *  with the bar away, a larger) canvas and keep working. */

const COMPACT = '(max-width: 900px), (max-height: 620px)';
const PULL = 18; // how far a finger must drag the handle before it counts as a pull

export function isTouchDevice() {
  return matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

export function mountMobile(scope, { canOpenDrawer = () => true, onDrawer, onBars } = {}) {
  const root = document.documentElement;
  const compact = matchMedia(COMPACT);
  const scrim = document.getElementById('drawer-scrim');
  const toast = document.getElementById('ui-toast');
  const drawers = {
    menu: { panel: document.getElementById('right-sidebar-wrapper'), button: document.getElementById('compact-menu') },
    levels: { panel: document.getElementById('sidebar'), button: document.getElementById('compact-levels') },
  };
  // the one bar that slides away, up, on its handle
  const handle = document.getElementById('handle-top');
  let open = null, topAway = false, toastTimer;
  const touch = isTouchDevice();
  root.dataset.touch = String(touch);
  const standalone = isStandalone();
  const fullscreenButton = document.getElementById('compact-fullscreen');
  if (isIOS() && !standalone) {
    fullscreenButton.title = 'Add Descipher to your Home Screen for full-screen play';
    fullscreenButton.setAttribute('aria-label', 'How to play full screen on iPhone');
  }

  // the words on the start screen and the intro: a phone has no keys
  if (touch) {
    document.getElementById('start-prompt').textContent = 'Tap to begin';
    document.getElementById('intro-skip').textContent = 'TAP TO SKIP';
    document.getElementById('inspect-close').textContent = 'Back to play';
  }

  function say(text, ms = 2600) {
    if (!toast) return;
    scope.cancel(toastTimer);
    toast.textContent = text; toast.hidden = false;
    toastTimer = scope.later(() => { toast.hidden = true; }, ms);
  }

  // ── the drawers ───────────────────────────────────────────────────────────
  function render() {
    root.dataset.compact = String(compact.matches);
    for (const [name, { panel, button }] of Object.entries(drawers)) {
      const shown = open === name;
      panel.classList.toggle('drawer-open', shown);
      panel.inert = !shown;
      button.setAttribute('aria-expanded', String(shown));
    }
    scrim.hidden = !open;
    root.classList.toggle('has-open-drawer', Boolean(open));
    const away = compact.matches && topAway;
    root.classList.toggle('ui-top-collapsed', away);
    handle.setAttribute('aria-expanded', String(!away));
    handle.setAttribute('aria-label', `${away ? 'Show' : 'Hide'} the top bar`);
  }
  function close() {
    if (!open) return;
    const trigger = drawers[open].button;
    open = null; render(); onDrawer?.(null);
    trigger.focus({ preventScroll: true });
  }
  function toggle(name) {
    if (open === name) { close(); return; }
    if (!canOpenDrawer()) return;
    open = name; render(); onDrawer?.(name);
    if (name === 'menu') document.getElementById('right-sidebar').scrollTop = 0;
    drawers[name].panel.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  }

  // ── the top bar ───────────────────────────────────────────────────────────
  function setTop(away) {
    if (topAway === away) return;
    topAway = away;
    if (away) close();
    render(); onBars?.({ top: away });
  }

  // iOS Safari does not expose an API for hiding its browser controls. Keep
  // the game controls available and explain how to launch the installed app.
  async function immersive() {
    if (isIOS() && !isStandalone()) {
      say('Safari on iPhone cannot hide its browser bars. For full-screen play, tap Share → Add to Home Screen → Add, then open Descipher from the new Home Screen icon.', 12000);
      return;
    }
    if (topAway) { restore(); return; }
    setTop(true);
    const went = await enterFullscreen();
    if (went || standalone) say('Pull the handle at the top edge to bring the bar back');
    else say('This browser offers no full screen. Pull the handle at the top edge to bring the bar back.', 4000);
  }
  function restore() {
    setTop(false);
    exitFullscreen();
    unlockOrientation();
  }

  // the handle: a tap toggles the bar; a pull up hides it, a pull down shows it
  let drag = null;
  scope.on(handle, 'pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    drag = { y: e.clientY, id: e.pointerId, moved: false };
    handle.setPointerCapture(e.pointerId);
  });
  scope.on(handle, 'pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y;
    if (Math.abs(dy) < PULL) return;
    drag.moved = true;
    setTop(dy < 0);
  });
  const release = e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved) setTop(!topAway);
    drag = null;
  };
  scope.on(handle, 'pointerup', release);
  scope.on(handle, 'pointercancel', e => { if (drag && e.pointerId === drag.id) drag = null; });
  scope.on(handle, 'keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTop(!topAway); }
  });

  for (const [name, { button }] of Object.entries(drawers)) scope.on(button, 'click', () => toggle(name));
  for (const button of document.querySelectorAll('[data-close-drawer]')) scope.on(button, 'click', close);
  scope.on(document.getElementById('compact-fullscreen'), 'click', immersive);
  scope.on(scrim, 'click', close);
  scope.on(document, 'keydown', e => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const nodes = [...drawers[open].panel.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')]
      .filter(node => !node.disabled && node.getClientRects().length);
    const index = nodes.indexOf(document.activeElement);
    if (!nodes.length) e.preventDefault();
    else if (e.shiftKey && index <= 0) { e.preventDefault(); nodes.at(-1).focus(); }
    else if (!e.shiftKey && (index < 0 || index === nodes.length - 1)) { e.preventDefault(); nodes[0].focus(); }
  });
  // Leaving full screen by the system's own gesture brings the header back.
  const left = () => { if (!fullscreenElement() && topAway) setTop(false); };
  scope.on(document, 'fullscreenchange', left);
  scope.on(document, 'webkitfullscreenchange', left);
  scope.on(compact, 'change', () => {
    if (!compact.matches) topAway = false;
    render();
  });
  scope.add(() => { for (const { panel } of Object.values(drawers)) panel.inert = false; });
  render();
  return {
    close, toggle, setTop, immersive, restore,
    get open() { return open; },
    get compact() { return compact.matches; },
    get topAway() { return topAway; },
  };
}

// ── full screen, wherever the browser keeps it ───────────────────────────────

export const isIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Opened from a home-screen icon: the browser's own bars are already gone. */
const isStandalone = () =>
  navigator.standalone === true || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;

export const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

/** Ask for full screen with whichever API the browser has, hiding its
 *  navigation where it lets us, and lock landscape once granted. Resolves
 *  true when the page is full screen afterwards. Must run from a user
 *  gesture; never throws. */
export async function enterFullscreen() {
  if (fullscreenElement()) return true;
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } catch { /* refused: not from a gesture, or not offered at all */ }
  const went = Boolean(fullscreenElement());
  if (went) await lockLandscape();
  return went;
}

export async function exitFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.webkitFullscreenElement) await document.webkitExitFullscreen?.();
  } catch { /* nothing to leave */ }
  return !fullscreenElement();
}

/** Full screen on a phone is a landscape affair: once the browser grants
 *  it, the orientation is locked where the API allows (Android), and the
 *  lock is released with full screen. Best effort, never an error. */
async function lockLandscape() {
  try { await screen.orientation?.lock?.('landscape'); } catch { /* iOS and desktops refuse; the rotate prompt covers portrait */ }
}
export function unlockOrientation() {
  try { screen.orientation?.unlock?.(); } catch { /* nothing was locked */ }
}
