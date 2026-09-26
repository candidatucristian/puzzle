import Phaser from 'phaser';

/** Only shared startup assets belong here; scenes preload their own assets. */
export default class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'Boot' }); }
  preload() {
    const { audio, loading } = this.game.services;
    this._failed = false;
    this.load.on('progress', value => loading.progress(value));
    this.load.on('loaderror', file => { this._failed = true; loading.fail(new Error(`Missing startup asset: ${file.key}`)); });
    audio.preload(this.load);
  }
  create() {
    const { audio, loading } = this.game.services;
    audio.enterScene(this);
    this.events.once('shutdown', () => audio.leaveScene(this));
    if (!this._failed) (document.fonts?.ready || Promise.resolve()).then(() => loading.ready());
  }
}
