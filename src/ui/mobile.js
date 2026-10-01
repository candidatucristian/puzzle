/** The phone and tablet layout: the two sidebars become drawers behind a
 *  compact top bar, the top bar can be slid away on a handle (or with the
 *  full-screen button, which also asks the browser for full screen), the
 *  console with the code box stays put, the start screen and the intro
 *  speak of tapping rather than keys, and a portrait phone is asked to
 *  turn. Nothing here changes the puzzles; the rooms get a smaller (or,
 *  with the bar away, a larger) canvas and keep working. */

const COMPACT = '(max-width: 1100px), (max-height: 560px)';
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
    menu: { panel: document.getElementById('sidebar'), button: document.getElementById('compact-menu') },
    levels: { panel: document.getElementById('right-sidebar-wrapper'), button: document.getElementById('compact-levels') },
  };
  // the one bar that slides away, up, on its handle
  const handle = document.getElementById('handle-top');
  // the Inspect button: in the room's corner on a desk, where it would hide
  // the room's own words on a phone; so there it joins the console row
  const inspect = document.getElementById('btn-inspect');
  const inspectHome = { parent: inspect?.parentNode, next: inspect?.nextSibling };
  const consoleRow = document.getElementById('input-area');
  let open = null, topAway = false, toastTimer;
  const touch = isTouchDevice();
  root.dataset.touch = String(touch);

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
    if (inspect && consoleRow) {
      if (compact.matches && inspect.parentNode !== consoleRow) consoleRow.insertBefore(inspect, document.getElementById('btn-info'));
      else if (!compact.matches && inspect.parentNode === consoleRow) inspectHome.parent.insertBefore(inspect, inspectHome.next);
    }
    for (const [name, { panel, button }] of Object.entries(drawers)) {
      const shown = compact.matches && open === name;
      panel.classList.toggle('drawer-open', shown);
      button.setAttribute('aria-expanded', String(shown));
    }
    scrim.hidden = !(compact.matches && open);
    root.classList.toggle('has-open-drawer', Boolean(compact.matches && open));
    const away = compact.matches && topAway;
    root.classList.toggle('ui-top-collapsed', away);
    handle.setAttribute('aria-expanded', String(!away));
    handle.setAttribute('aria-label', `${away ? 'Show' : 'Hide'} the top bar`);
  }
  function close() { if (!open) return; open = null; render(); onDrawer?.(null); }
  function toggle(name) {
    if (!compact.matches) return;
    if (open === name) { close(); return; }
    if (!canOpenDrawer()) return;
    open = name; render(); onDrawer?.(name);
    drawers[name].panel.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  }

  // ── the top bar ───────────────────────────────────────────────────────────
  function setTop(away) {
    if (topAway === away) return;
    topAway = away;
    if (away) close();
    render(); onBars?.({ top: away });
  }

  // the full-screen button: the top bar slides away, and the browser is
  // asked for full screen where it offers it. Safari on iPhone offers none,
  // so there the way to lose the browser's own bars is the home-screen
  // icon, and the toast says so.
  async function immersive() {
    if (topAway) { restore(); return; }
    setTop(true);
    const went = await enterFullscreen();
    if (went || isStandalone()) say('Pull the handle at the top edge to bring the bar back');
    else if (isIOS()) say('Safari on iPhone has no full screen. To play without the browser bars, tap Share, then "Add to Home Screen", and open the game from that icon.', 7000);
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
  scope.on(document.getElementById('compact-fullscreen'), 'click', immersive);
  scope.on(scrim, 'click', close);
  scope.on(document, 'keydown', e => { if (e.key === 'Escape' && open) { e.preventDefault(); close(); } });
  // leaving full screen by the system's own gesture brings the bar back
  const left = () => { if (!fullscreenElement() && topAway) setTop(false); };
  scope.on(document, 'fullscreenchange', left);
  scope.on(document, 'webkitfullscreenchange', left);
  scope.on(compact, 'change', render);
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
export const isStandalone = () =>
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

export function exitFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (document.webkitFullscreenElement) document.webkitExitFullscreen?.();
  } catch { /* nothing to leave */ }
}

/** Full screen on a phone is a landscape affair: once the browser grants
 *  it, the orientation is locked where the API allows (Android), and the
 *  lock is released with full screen. Best effort, never an error. */
export async function lockLandscape() {
  try { await screen.orientation?.lock?.('landscape'); } catch { /* iOS and desktops refuse; the rotate prompt covers portrait */ }
}
export function unlockOrientation() {
  try { screen.orientation?.unlock?.(); } catch { /* nothing was locked */ }
}
