import './ui/styles/index.css';
import './ui/styles/casefile-materials.css';
import './ui/styles/letter-arrival.css';
import './levels/cryptex/scene.css';
import { createLoadingScreen } from './ui/loading.js';

// The game is responsive in mobile browsers as well as inside the native app.
const loading = createLoadingScreen();
export const ready = import('./main.js').then(app => {
  app.start(loading);
  return app;
}).catch(error => { loading.fail(error); return null; });
