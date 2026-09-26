import { Scope } from '../shared/Scope.js';

export function createLoadingScreen() {
  const scope = new Scope(), screen = document.getElementById('loading-screen');
  const fill = document.getElementById('loading-fill'), label = document.getElementById('loading-label');
  const percent = document.getElementById('loading-pct');
  let current = 0, target = 6, text = 'sharpening the pencils', done = false, failed = false;
  const paint = () => {
    current += (target - current) * .09;
    fill.style.width = current + '%'; percent.textContent = Math.round(current) + '%';
    label.childNodes[0].nodeValue = text + '\u00a0';
    scope.later(paint, 80);
  };
  paint();
  const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'RETRY';
  retry.className = 'menu-btn'; retry.hidden = true; screen.querySelector('.loading-card').append(retry);
  scope.on(retry, 'click', () => location.reload());
  const api = {
    progress(value) { if (!failed && !done) { target = 68 + value * 28; text = 'tuning the instruments'; } },
    ready() {
      if (done || failed) return;
      done = true; target = 100; text = 'ready';
      scope.later(() => { screen.classList.add('fade-out'); scope.later(() => { screen.remove(); scope.dispose(); }, 750); }, 500);
    },
    fail(error) {
      if (done || failed) return;
      failed = true; console.error('The Descipher could not start:', error);
      text = 'Unable to load the game. Please try again.'; retry.hidden = false;
      label.setAttribute('role', 'alert');
    },
    dispose() { scope.dispose(); },
  };
  scope.later(() => { if (!done) api.fail(new Error('Startup timed out')); }, 45000);
  return api;
}
