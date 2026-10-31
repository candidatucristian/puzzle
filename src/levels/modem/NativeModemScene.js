import Phaser from 'phaser';
import BasePuzzleScene from '../../core/BasePuzzleScene.js';
import { fitRender } from '../../shared/renderFit.js';
import { MODEM_WORD, planTransmission } from './puzzle.js';
import native from './nativeModem.json';

const names = ['room', ...Array.from({ length: native.leds.length }, (_, i) => `led-${i}`)];
const key = (name) => `md_native_v${native.version}_${name}`;

// All room surfaces, optical lenses and changing LED light come from Cycles.
// The existing transmission still schedules five counters and seven ASCII bits.
export default class NativeModemScene extends BasePuzzleScene {
  constructor() { super({ key: 'Modem' }); }
  init(data) { this.skipFadeIn = data?.skipFade ?? true; }

  preload() {
    if (!this.cache.audio.exists('hardware')) this.load.audio('hardware', 'assets/sounds/Modem/hardwaresound.mp3');
    for (const name of names) if (!this.textures.exists(key(name))) {
      this.load.image(key(name), `assets/images/Modem/native-v${native.version}/${name}.${name === 'room' ? 'webp' : 'png'}`);
    }
  }

  create() {
    this.beginScene();
    this.ANSWER = MODEM_WORD;
    this.isSolved = false;
    this._timerEvents = [];
    this._ledStates = native.leds.map(() => 'off');
    this.cameras.main.setBackgroundColor('#050706');
    this._build(this.cameras.main.width, this.cameras.main.height);
    this._startAnimation();
    this._startHardwareHum();
    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });
    if (!this.skipFadeIn && !this.reducedMotion) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    const { x, y, s, at } = fitRender(W, H, native);
    this.add.image(x, y, key('room')).setOrigin(0).setScale(s).setDepth(0);
    this._leds = native.leds.map((led, i) => this.add.image(
      x + led.crop.x * s, y + led.crop.y * s, key(`led-${i}`),
    ).setOrigin(0).setScale(s).setBlendMode(Phaser.BlendModes.ADD).setDepth(1)
      .setAlpha(this._ledStates[i] === led.colour ? 1 : 0));
    const centre = at(native.lamp.centre), radius = native.lamp.radius * s;
    this._motes = Array.from({ length: 12 }, () => {
      const m = {
        img: this.add.circle(0, 0, Math.max(.45, .55 * s), 0xe0c89b).setDepth(3).setAlpha(0),
        cx: centre.x, cy: centre.y, radius,
      };
      this._respawnMote(m, Math.random());
      return m;
    });
    this._built = true;
  }

  _respawnMote(m, age = 0) {
    const angle = Math.random() * Math.PI * 2, distance = Math.sqrt(Math.random()) * m.radius;
    m.x = m.cx + Math.cos(angle) * distance;
    m.y = m.cy + Math.sin(angle) * distance * .65;
    m.vx = (Math.random() - .5) * .003;
    m.vy = (Math.random() - .35) * .003;
    m.ttl = 7000 + Math.random() * 8000; m.age = age * m.ttl;
    m.phase = Math.random() * 10; m.peak = .07 + Math.random() * .09;
  }

  update(time, delta) {
    if (!this._built) return;
    for (const m of this._motes) m.img.setVisible(this.ambientMotion);
    if (!this.ambientMotion) return;
    const t = time / 1000, dt = Math.min(delta || 16, 100);
    for (const m of this._motes) {
      m.age += dt;
      if (m.age >= m.ttl) this._respawnMote(m);
      m.x += (m.vx + Math.sin(t * .6 + m.phase) * .002) * dt;
      m.y += (m.vy + Math.cos(t * .45 + m.phase) * .0015) * dt;
      m.img.setPosition(m.x, m.y).setAlpha(m.peak * Math.sin(Math.PI * m.age / m.ttl));
    }
  }

  _setLed(index, state) {
    if (!native.leds[index]) return;
    this._ledStates[index] = state;
    this._leds?.[index]?.setAlpha(state === native.leds[index].colour ? 1 : 0);
  }

  _cancelAnimation() {
    for (const event of this._timerEvents) event.remove(false);
    this._timerEvents = [];
  }

  _startAnimation() {
    this._cancelAnimation();
    for (let i = 0; i < native.leds.length; i++) this._setLed(i, 'off');
    const transmission = planTransmission();
    this._timerEvents = transmission.events.map(({ at, led, state }) =>
      this.time.delayedCall(at, () => this._setLed(led, state)));
    this._timerEvents.push(this.time.delayedCall(transmission.duration, () => this._startAnimation()));
  }

  _startHardwareHum() {
    if (!this.cache.audio.exists('hardware')) return;
    this._hwSound = this.services.audio.addSceneSound(this, 'hardware', { loop: true, gain: .35 });
    this._hwSound?.play();
  }

  replay() { this._startAnimation(); }

  _teardown() {
    this._built = false;
    for (const object of this.children.list.slice()) object.destroy();
    this._leds = null; this._motes = [];
  }

  shutdown() {
    this._built = false;
    this._cancelAnimation();
    this._hwSound?.stop(); this._hwSound?.destroy(); this._hwSound = null;
    this._leds = null; this._motes = [];
    for (const name of names) if (this.textures.exists(key(name))) this.textures.remove(key(name));
  }
}
