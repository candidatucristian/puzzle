import './ui/styles/index.css';
import './levels/cryptex/scene.css';
import { createLoadingScreen } from './ui/loading.js';

const loading = createLoadingScreen();
export const ready = import('./main.js').then(app => {
  app.start(loading);
  return app;
}).catch(error => { loading.fail(error); return null; });
