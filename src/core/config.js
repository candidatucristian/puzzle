import Phaser from 'phaser';
import BootScene from './BootScene.js';
import HallScene, { UpperHallScene, TopWingScene } from '../levels/hall/HallScene.js';
import TopScene from '../levels/top/TopScene.js';
import StudyScene from '../levels/study/StudyScene.js';
import Room2Scene from '../levels/room2/Room2Scene.js';
import Room3Scene from '../levels/room3/Room3Scene.js';
import Room4Scene from '../levels/room4/Room4Scene.js';
import Room5Scene from '../levels/room5/Room5Scene.js';
import Room6Scene from '../levels/room6/Room6Scene.js';
import Room7Scene from '../levels/room7/Room7Scene.js';
import Room8Scene from '../levels/room8/Room8Scene.js';
import Room11Scene from '../levels/room11/Room11Scene.js';
import { EMPTY_ROOMS } from '../levels/house/emptyRooms.js';

// The web demo's build (vite build --mode demo) plays only the hall and Rooms
// I to III; the rooms past them and the puzzles in them (levels/registry.js)
// are left out of it, and their doors stay locked. Since 2026-11-13 its gate
// opens and the Chemistry and Physics halls can be walked into, all shut.
const DEMO_BUILD = typeof __DEMO_BUILD__ !== "undefined" && __DEMO_BUILD__;
// (since 2026-11-13 the demo goes up to the Chemistry and Physics halls, all
// shut inside: their scenes ship; the top floor's passage beyond stays out)
const UPSTAIRS = DEMO_BUILD ? [UpperHallScene, TopScene] : [UpperHallScene, TopScene, TopWingScene];
const LATER_ROOMS = DEMO_BUILD ? [] : [Room4Scene, Room5Scene, Room6Scene, Room7Scene, Room8Scene, Room11Scene, ...EMPTY_ROOMS];

export function gameConfig(services, definitions) {
  return {
    type: Phaser.AUTO, backgroundColor: '#0a0a10', transparent: true, parent: 'game-container',
    dom: { createContainer: true },
    loader: { maxParallelDownloads: 4, timeout: 120000 },
    scale: { mode: Phaser.Scale.NONE, parent: 'game-container', width: '100%', height: '100%' },
    scene: [BootScene, HallScene, ...UPSTAIRS, StudyScene, Room2Scene, Room3Scene, ...LATER_ROOMS, ...definitions.map(level => level.scene).filter(Boolean)],
    callbacks: { preBoot(game) { game.services = services; services.levels.attach(game); services.audio.attach(game); } },
  };
}
