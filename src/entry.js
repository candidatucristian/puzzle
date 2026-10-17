import './ui/styles/index.css';
import './ui/styles/casefile-materials.css';
import './ui/styles/letter-arrival.css';
import './ui/styles/desktopOnly.css';
import './levels/cryptex/scene.css';
import { createLoadingScreen } from './ui/loading.js';
import { isHandheld } from './ui/platform.js';

const handheld = navigator.userAgentData?.mobile === true || isHandheld({
  userAgent: navigator.userAgent,
  maxTouchPoints: navigator.maxTouchPoints,
  media: query => window.matchMedia(query).matches,
});

if (handheld) {
  document.documentElement.dataset.desktopOnly = 'true';
  document.getElementById('desktop-only')?.removeAttribute('hidden');
}

// Do not even import Phaser's game entry on a phone or tablet. The device
// check is independent of viewport size and orientation.
export const ready = handheld ? Promise.resolve(null) : startGame();

function startGame() {
  const loading = createLoadingScreen();
  return import('./main.js').then(app => {
    app.start(loading);
    return app;
  }).catch(error => { loading.fail(error); return null; });
}
