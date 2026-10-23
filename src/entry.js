import './ui/styles/index.css';
import './ui/styles/casefile-materials.css';
import './ui/styles/notebook-materials.css';
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

// A trial of the house drawn (?sketch) or rendered (?render) instead of
// photographed: straight into Room VI, the room tried so far
// (levels/room6/), once the game has loaded — even if its door is still
// locked in this browser.
const trial = new URLSearchParams(location.search);
if (!handheld && (trial.has('sketch') || trial.has('render'))) {
  ready.then(app => {
    if (!app) return;
    const go = () => {
      if (document.getElementById('loading-screen') || !app.ui || !app.services) { setTimeout(go, 300); return; }
      app.ui.showGame();
      if (app.services.levels.enterPlace('Room6')) return;
      for (const scene of app.game.scene.getScenes(true)) scene.scene.stop();
      app.game.scene.start('Room6');
    };
    go();
  });
}

function startGame() {
  const loading = createLoadingScreen();
  return import('./main.js').then(app => {
    app.start(loading);
    return app;
  }).catch(error => { loading.fail(error); return null; });
}

