import { Scope } from '../shared/Scope.js';
import { sketchLayer, houseByProgress } from './introSketches.js';

// While the game loads, the house is drawn in the white pencil, line by line
// as far as the loading has got; when it is ready, its moon and its three
// lights come up, and the screen goes.

export function createLoadingScreen(i18n = null) {
  const scope = new Scope(), screen = document.getElementById('loading-screen');
  const fill = document.getElementById('loading-fill'), label = document.getElementById('loading-label');
  const percent = document.getElementById('loading-pct');
  const status = document.getElementById('loading-status');
  const t = key => i18n ? i18n.t(`loading.${key}`) : { loading: 'Loading', slow: 'Loading is taking longer than usual. You can keep waiting or retry.', ready: 'Ready', retry: 'RETRY', failed: 'Unable to load the game. Please try again.' }[key];
  const card = screen.querySelector('.loading-card');
  const sketch = sketchLayer(card);
  card.prepend(sketch);
  const house = houseByProgress(sketch);
  let current = 0, target = 6, message = 'loading', done = false, failed = false, lit = false;
  const paint = () => {
    current += (target - current) * .09;
    fill.style.width = current + '%'; percent.textContent = Math.round(current) + '%';
    house.set(current / 100);
    // drawn to the end: the lights come up, and a moment later it is gone
    if (done && !lit && current > 99.4) {
      lit = true; house.set(1); house.light();
      scope.later(() => { screen.classList.add('fade-out'); scope.later(() => { screen.remove(); scope.dispose(); }, 750); }, 1100);
    }
    if (status) status.textContent = t(message);
    else label.childNodes[0].nodeValue = t(message) + '\u00a0';
    scope.later(paint, 80);
  };
  paint();
  const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = t('retry');
  retry.className = 'menu-btn'; retry.hidden = true; screen.querySelector('.loading-card').append(retry);
  scope.on(retry, 'click', () => location.reload());
  const api = {
    progress(value) { if (!failed && !done) { target = 68 + value * 28; message = 'loading'; } },
    ready() {
      if (done || failed) return;
      done = true; target = 100; message = 'ready'; retry.hidden = true;
    },
    fail(error) {
      if (done || failed) return;
      failed = true; console.error('Ashcombe Manor could not start:', error);
      message = 'failed'; retry.hidden = false;
      label.setAttribute('role', 'alert');
    },
    dispose() { scope.dispose(); },
  };
  scope.later(() => { if (!done && !failed) { message = 'slow'; retry.hidden = false; } }, 45000);
  return api;
}
