import Phaser from 'phaser';
import BootScene from './BootScene.js';

export function gameConfig(services, definitions) {
  return {
    type: Phaser.AUTO, backgroundColor: '#0a0a10', parent: 'game-container',
    dom: { createContainer: true },
    scale: { mode: Phaser.Scale.NONE, parent: 'game-container', width: '100%', height: '100%' },
    scene: [BootScene, ...definitions.map(level => level.scene)],
    callbacks: { preBoot(game) { game.services = services; services.levels.attach(game); services.audio.attach(game); } },
  };
}
