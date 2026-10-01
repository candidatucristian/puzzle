/** The phone and tablet layout: the two sidebars become drawers behind a
 *  compact top bar, the start screen and the intro speak of tapping rather
 *  than keys, and a portrait phone is asked to turn. Nothing here changes
 *  the puzzles; the rooms get a smaller canvas and keep working. */

const COMPACT = '(max-width: 1100px), (max-height: 560px)';

export function isTouchDevice() {
  return matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

export function mountMobile(scope, { canOpenDrawer = () => true, onDrawer } = {}) {
  const root = document.documentElement;
  const compact = matchMedia(COMPACT);
  const scrim = document.getElementById('drawer-scrim');
  const drawers = {
    menu: { panel: document.getElementById('sidebar'), button: document.getElementById('compact-menu') },
    levels: { panel: document.getElementById('right-sidebar-wrapper'), button: document.getElementById('compact-levels') },
  };
  let open = null;
  const touch = isTouchDevice();
  root.dataset.touch = String(touch);

  // the words on the start screen and the intro: a phone has no keys
  if (touch) {
    document.getElementById('start-prompt').textContent = 'Tap to begin';
    document.getElementById('intro-skip').textContent = 'TAP TO SKIP';
    document.getElementById('inspect-close').textContent = 'Back to play';
  }

  function render() {
    root.dataset.compact = String(compact.matches);
    for (const [name, { panel, button }] of Object.entries(drawers)) {
      const shown = compact.matches && open === name;
      panel.classList.toggle('drawer-open', shown);
      button.setAttribute('aria-expanded', String(shown));
    }
    scrim.hidden = !(compact.matches && open);
    root.classList.toggle('has-open-drawer', Boolean(compact.matches && open));
  }
  function close() { if (!open) return; open = null; render(); onDrawer?.(null); }
  function toggle(name) {
    if (!compact.matches) return;
    if (open === name) { close(); return; }
    if (!canOpenDrawer()) return;
    open = name; render(); onDrawer?.(name);
    drawers[name].panel.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  }

  for (const [name, { button }] of Object.entries(drawers)) scope.on(button, 'click', () => toggle(name));
  scope.on(scrim, 'click', close);
  scope.on(document, 'keydown', e => { if (e.key === 'Escape' && open) { e.preventDefault(); close(); } });
  scope.on(compact, 'change', render);
  render();
  return { close, toggle, get open() { return open; }, get compact() { return compact.matches; } };
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
