import Phaser from 'phaser';
import { SafeStorage } from './core/SafeStorage.js';
import { ProgressStore } from './core/ProgressStore.js';
import { AudioManager } from './core/AudioManager.js';
import { LevelManager } from './core/LevelManager.js';
import { LEVEL_DEFINITIONS } from './levels/registry.js';
import { gameConfig } from './core/config.js';
import { mountUI } from './ui/controls.js';

export let game, ui, services;
export function start(loading) {
  if (game) return game;
  const storage = new SafeStorage();
  const progress = new ProgressStore(storage, LEVEL_DEFINITIONS);
  const audio = new AudioManager(storage);
  const levels = new LevelManager(LEVEL_DEFINITIONS, progress);
  services = { storage, progress, audio, levels, loading };
  game = new Phaser.Game(gameConfig(services, LEVEL_DEFINITIONS));
  ui = mountUI(game, services);
  return game;
}
export function dispose() {
  ui?.dispose(); game?.destroy(true); services?.audio.destroy(); services?.loading.dispose();
  game = null; ui = null; services = null;
}
if (import.meta.hot) import.meta.hot.dispose(dispose);
