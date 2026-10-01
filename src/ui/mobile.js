/** The phone and tablet layout: the two sidebars become drawers behind a
 *  compact top bar, the top bar and the console can each be slid away on a
 *  handle (or all at once, with the full-screen button), the start screen
 *  and the intro speak of tapping rather than keys, and a portrait phone is
 *  asked to turn. Nothing here changes the puzzles; the rooms get a smaller
 *  (or, with the bars away, a larger) canvas and keep working. */

const COMPACT = '(max-width: 1100px), (max-height: 560px)';
const PULL = 18; // how far a finger must drag a handle before it counts as a pull

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
  // the two bars that slide away: each with its handle and the edge it
  // slides toward (-1 up, +1 down)
  const bars = {
    top: { el: document.getElementById('compact-bar'), handle: document.getElementById('handle-top'), edge: -1, label: 'top bar' },
    bottom: { el: document.getElementById('input-area'), handle: document.getElementById('handle-bottom'), edge: 1, label: 'console' },
  };
  const collapsed = { top: false, bottom: false };
  let open = null, toastTimer;
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
    for (const [name, { panel, button }] of Object.entries(drawers)) {
      const shown = compact.matches && open === name;
      panel.classList.toggle('drawer-open', shown);
      button.setAttribute('aria-expanded', String(shown));
    }
    scrim.hidden = !(compact.matches && open);
    root.classList.toggle('has-open-drawer', Boolean(compact.matches && open));
    for (const [name, bar] of Object.entries(bars)) {
      const away = compact.matches && collapsed[name];
      root.classList.toggle(`ui-${name}-collapsed`, away);
      bar.handle.setAttribute('aria-expanded', String(!away));
      bar.handle.setAttribute('aria-label', `${away ? 'Show' : 'Hide'} the ${bar.label}`);
    }
    // the console's height, for the handle that rides on its edge
    root.style.setProperty('--console-h', `${bars.bottom.el.offsetHeight}px`);
  }
  function close() { if (!open) return; open = null; render(); onDrawer?.(null); }
  function toggle(name) {
    if (!compact.matches) return;
    if (open === name) { close(); return; }
    if (!canOpenDrawer()) return;
    open = name; render(); onDrawer?.(name);
    drawers[name].panel.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  }

  // ── the bars ──────────────────────────────────────────────────────────────
  function setBar(name, away) {
    if (collapsed[name] === away) return;
    collapsed[name] = away;
    if (away) {
      if (name === 'top') close();
      // the console takes the code box with it; the keyboard goes too
      if (name === 'bottom' && bars.bottom.el.contains(document.activeElement)) document.activeElement.blur();
    }
    render(); onBars?.({ ...collapsed });
  }
  const barsAway = () => collapsed.top && collapsed.bottom;

  // the full-screen button: the whole interface slides away, and the
  // browser is asked for full screen where it offers it. Safari on iPhone
  // offers none, so there the way to lose the browser's own bars is the
  // home-screen icon, and the toast says so.
  async function immersive() {
    if (barsAway()) { restore(); return; }
    setBar('top', true); setBar('bottom', true);
    const went = await enterFullscreen();
    if (went || isStandalone()) say('Pull a handle at the top or the bottom edge to bring the bars back');
    else if (isIOS()) say('Safari on iPhone has no full screen. To play without the browser bars, tap Share, then "Add to Home Screen", and open the game from that icon.', 7000);
    else say('This browser offers no full screen. Pull a handle at the top or the bottom edge to bring the bars back.', 4000);
  }
  function restore() {
    setBar('top', false); setBar('bottom', false);
    exitFullscreen();
    unlockOrientation();
  }

  // a handle: a tap toggles its bar; a pull toward the edge hides it, a
  // pull away from the edge shows it
  function mountHandle(name) {
    const { handle, edge } = bars[name];
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
      setBar(name, Math.sign(dy) === edge);
    });
    const release = e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved) setBar(name, !collapsed[name]);
      drag = null;
    };
    scope.on(handle, 'pointerup', release);
    scope.on(handle, 'pointercancel', e => { if (drag && e.pointerId === drag.id) drag = null; });
    scope.on(handle, 'keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBar(name, !collapsed[name]); }
    });
  }

  for (const [name, { button }] of Object.entries(drawers)) scope.on(button, 'click', () => toggle(name));
  for (const name of Object.keys(bars)) mountHandle(name);
  scope.on(document.getElementById('compact-fullscreen'), 'click', immersive);
  scope.on(scrim, 'click', close);
  scope.on(document, 'keydown', e => { if (e.key === 'Escape' && open) { e.preventDefault(); close(); } });
  // leaving full screen by the system's own gesture brings the bars back
  const left = () => { if (!fullscreenElement() && barsAway()) { setBar('top', false); setBar('bottom', false); } };
  scope.on(document, 'fullscreenchange', left);
  scope.on(document, 'webkitfullscreenchange', left);
  scope.on(compact, 'change', render);
  scope.on(window, 'resize', render);
  render();
  return {
    close, toggle, setBar, immersive, restore,
    get open() { return open; },
    get compact() { return compact.matches; },
    get collapsed() { return { ...collapsed }; },
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
