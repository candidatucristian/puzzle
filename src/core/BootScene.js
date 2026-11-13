import Phaser from 'phaser';
import { prepareLanguageFonts } from './languageFonts.js';
import { installSceneAssetLoading } from './sceneAssetLoading.js';

/** Only shared startup assets belong here; scenes preload their own assets. */
export default class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'Boot' }); installSceneAssetLoading(this); }
  preload() {
    const { audio, loading } = this.game.services;
    this.load.on('progress', value => loading.progress(value));
    audio.preload(this.load);
  }
  create() {
    const { audio, loading, i18n } = this.game.services;
    audio.enterScene(this);
    this.events.once('shutdown', () => audio.leaveScene(this));
    // Slow optional font downloads may finish later and trigger their own redraws.
    Promise.race([
      Promise.all([document.fonts?.ready || Promise.resolve(), prepareLanguageFonts(i18n?.language)]),
      new Promise(resolve => setTimeout(resolve, 2000)),
    ]).then(() => { if (this.sys?.isActive?.()) loading.ready(); });
  }
}
