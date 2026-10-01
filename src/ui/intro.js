import { Scope } from '../shared/Scope.js';

const LINES = ['The room is quiet. Too quiet.', 'Each room opens with a single word.', 'Everything you need is already in front of you.'];
export function createIntro(preferences) {
  const scope = new Scope(), screen = document.getElementById('intro-screen');
  const line = document.getElementById('intro-line'), title = document.getElementById('intro-title');
  let active = false, skip = false, started = 0;
  const sleepers = new Set();
  const requestSkip = () => { if (active && Date.now() - started > 400) { skip = true; for (const wake of [...sleepers]) wake(); } };
  scope.on(window, 'keydown', requestSkip); scope.on(screen, 'click', requestSkip);
  const sleep = ms => new Promise(resolve => {
    if (skip || scope.closed) { resolve(); return; }
    const wake = () => { scope.cancel(timer); sleepers.delete(wake); resolve(); };
    const timer = scope.later(wake, ms); sleepers.add(wake);
  });
  return {
    get active() { return active; },
    async play(onDone) {
      if (active) return;
      if (preferences?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        screen.classList.add('hidden');
        onDone();
        return;
      }
      active = true; skip = false; started = Date.now();
      line.textContent = ''; line.classList.remove('show'); title.classList.remove('show');
      screen.classList.remove('fade-out', 'hidden');
      for (const text of LINES) {
        if (skip) break;
        line.textContent = text; line.classList.add('show'); await sleep(2700);
        line.classList.remove('show'); if (skip) break; await sleep(1000);
      }
      line.classList.remove('show');
      if (!skip) { await sleep(300); title.classList.add('show'); await sleep(3600); }
      if (scope.closed) return;
      screen.classList.add('fade-out'); onDone();
      scope.later(() => { screen.classList.add('hidden'); title.classList.remove('show'); active = false; }, 1000);
    },
    dispose() { skip = true; for (const wake of [...sleepers]) wake(); scope.dispose(); active = false; },
  };
}
