import Phaser from 'phaser';
import BootScene from './BootScene.js';
import HallScene, { UpperHallScene } from '../levels/hall/HallScene.js';
import StudyScene from '../levels/study/StudyScene.js';
import Room2Scene from '../levels/room2/Room2Scene.js';
import Room3Scene from '../levels/room3/Room3Scene.js';
import Room4Scene from '../levels/room4/Room4Scene.js';
import { Room5Scene, Room6Scene } from '../levels/house/emptyRooms.js';

export function gameConfig(services, definitions) {
  return {
    type: Phaser.AUTO, backgroundColor: '#0a0a10', parent: 'game-container',
    dom: { createContainer: true },
    scale: { mode: Phaser.Scale.NONE, parent: 'game-container', width: '100%', height: '100%' },
    scene: [BootScene, HallScene, UpperHallScene, StudyScene, Room2Scene, Room3Scene, Room4Scene, Room5Scene, Room6Scene, ...definitions.map(level => level.scene)],
    callbacks: { preBoot(game) { game.services = services; services.levels.attach(game); services.audio.attach(game); } },
  };
}
