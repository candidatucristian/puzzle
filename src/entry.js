import './ui/styles/index.css';
import './ui/styles/casefile-materials.css';
import './ui/styles/letter-arrival.css';
import './ui/styles/desktopOnly.css';
import './levels/cryptex/scene.css';
import { createLoadingScreen } from './ui/loading.js';
import { desktopOnly, showDesktopOnly } from './ui/platform.js';

const handheld = desktopOnly();

if (handheld) {
  showDesktopOnly();
}

// Do not even import Phaser's game entry on a phone or tablet. The device
// check is independent of viewport size and orientation.
export const ready = handheld ? Promise.resolve(null) : startGame();
ready.then(app => { if (app && typeof window !== 'undefined') window.__descipher = app; });

function startGame() {
  const loading = createLoadingScreen();
  return import('./main.js').then(app => {
    app.start(loading);
    return app;
  }).catch(error => { loading.fail(error); return null; });
}

