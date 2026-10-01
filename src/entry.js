import './ui/styles/index.css';
import './levels/cryptex/scene.css';
import { createLoadingScreen } from './ui/loading.js';
import { desktopOnly, showDesktopOnly } from './ui/platform.js';

// In a browser the game is for computers: a phone or a tablet gets the
// desktop-only page, and the game itself is never downloaded or started
// there (ui/platform.js). The store app runs it on phones.
const handheld = desktopOnly();
if (handheld) showDesktopOnly();
const loading = handheld ? null : createLoadingScreen();
export const ready = handheld
  ? Promise.resolve(null)
  : import('./main.js').then(app => {
    app.start(loading);
    return app;
  }).catch(error => { loading.fail(error); return null; });
