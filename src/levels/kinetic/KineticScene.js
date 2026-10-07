import BasePuzzleScene from '../../core/BasePuzzleScene.js';
import { drawLevelLabel, uiScale } from '../../shared/levelLabel.js';
import { lcg } from '../../shared/paint.js';
import { kineticRig, kineticLayout, polygonVertices, nurseryBreeze, readKinetic } from './puzzle.js';
import { paintRoom, releaseRoomArt } from './room.js';
import { paintMobileAssets, releaseMobileArt } from './mobile.js';

/** Kinetic — a sleeping nursery, a draft through the casement and four
 * wooden shapes. The clue remains 3, 1, 7, 5, read from the ceiling down. */
export default class KineticScene extends BasePuzzleScene {
  constructor() { super({ key: 'Kinetic' }); }

  init(data) { this.skipFadeIn = data?.skipFade ?? true; }

  create() {
    this.beginScene();
    this._elapsed = 0;
    this._build(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => { this._teardown(); this._build(width, height); });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  static code() { return readKinetic(); }

  _build(W, H) {
    this._L = kineticLayout(W, H);
    const room = paintRoom(this.textures, W, H), mobile = paintMobileAssets(this.textures, this._L.size);
    this._roomArt = room;
    this.add.image(0, 0, room.keys.room).setOrigin(0).setDepth(0);
    this._stars = this.add.graphics().setDepth(1);
    this.add.image(0, 0, room.keys.rays).setOrigin(0).setDepth(2);
    this.add.image(0, 0, room.keys.back).setOrigin(0).setDepth(3);
    const baby = room.baby;
    this._baby = this.add.image(baby.x, baby.y, room.keys.baby).setOrigin(0).setScale(baby.scale).setRotation(baby.rotation).setDepth(4);
    this._blanket = this.add.image(baby.x, baby.y, room.keys.blanket).setOrigin(0).setScale(baby.scale).setRotation(baby.rotation).setDepth(5);
    this.add.image(0, 0, room.keys.front).setOrigin(0).setDepth(6);
    // the wooden crescent moon the mobile hangs from
    this._hub = this.add.image(this._L.x, this._L.y - this._L.size * 0.015, room.keys.hub)
      .setDisplaySize(this._L.size * 0.11, this._L.size * 0.11).setDepth(9.5);
    const curtain = room.curtain;
    this._curtain = this.add.image(curtain.x, curtain.y, room.keys.curtain).setOrigin(0.5, 0).setDepth(2.5).setAlpha(0.72);
    this._mobileStrings = this.add.graphics().setDepth(9);
    this._forms = kineticRig(this._elapsed).forms.map(form => {
      const size = mobile.displaySizes[form.kind];
      const img = this.add.image(0, 0, mobile.keys[form.kind]).setDepth(10).setDisplaySize(size.width, size.height);
      return { id: form.id, img, size, points: polygonVertices(form.sides, form.radius) };
    });
    const rnd = lcg(29811);
    this._motes = Array.from({ length: 24 }, () => ({ x: rnd(), y: rnd(), phase: rnd() * Math.PI * 2, speed: 0.5 + rnd() * 0.5 }));
    this._dust = this.add.graphics().setDepth(12);
    this.add.image(0, 0, room.keys.shade).setOrigin(0).setDepth(20);
    this._drawClue(W, H);
    this.levelText = drawLevelLabel(this, W, H, { color: '#afa0bc' }).setDepth(31);
    this._render();
  }

  _drawClue(W, H) {
    const k = uiScale(W, H), x = Math.min(30, W * 0.033), font = Math.max(9, Math.min(11, W / 55));
    const y = H - Math.max(43, 52 * k);
    const width = Math.min(W * 0.74, 368), height = Math.max(33, 39 * k);
    const label = this.add.graphics().setDepth(30);
    label.fillStyle(0x1a0e2e, 0.8); label.fillRoundedRect(x - 8, y - 7, width, height, 3);
    label.lineStyle(0.8, 0xb49ad8, 0.35); label.lineBetween(x - 8, y - 8, x + width - 8, y - 8);
    this._clue = this.add.text(x, y, 'ONE UNBROKEN CURVE COUNTS AS ONE', {
      fontFamily: '"Courier New", monospace', fontSize: font + 'px', color: '#d8c8f0',
    }).setResolution(2).setDepth(31);
    this.add.text(x, y + font + 5, 'From the highest, down to the lowest.', {
      fontFamily: 'Georgia, serif', fontSize: Math.max(9, font) + 'px', fontStyle: 'italic', color: '#a894c8',
    }).setResolution(2).setDepth(31);
  }

  update(_time, delta) {
    if (this._L && this._lastEffects !== this.ambientEffects) this._renderAtmosphere();
    if (!this._L || !this.ambientMotion) return;
    this._elapsed += Math.min(delta || 16, 50);
    this._render();
  }

  _render() {
    if (!this._L) return;
    const { size: S, x: X, y: Y } = this._L;
    const rig = kineticRig(this._elapsed), g = this._mobileStrings, k = Math.max(0.65, S / 520);
    const px = x => X + x * S, py = y => Y + y * S;
    g.clear();
    // A fine cord continues up into the ceiling, with a small bronze eye.
    g.lineStyle(Math.max(0.8, k * 0.9), 0xd8c8ec, 0.55); g.lineBetween(X, 0, X, Y);
    for (const rod of rig.rods) {
      g.lineStyle(3.6 * k, 0x3a2650, 0.9); g.lineBetween(px(rod.x1), py(rod.y1) + k, px(rod.x2), py(rod.y2) + k);
      g.lineStyle(2.2 * k, 0xd8b88a, 1); g.lineBetween(px(rod.x1), py(rod.y1), px(rod.x2), py(rod.y2));
      g.lineStyle(0.8 * k, 0xfff0d0, 0.7); g.lineBetween(px(rod.x1), py(rod.y1) - 0.6 * k, px(rod.x2), py(rod.y2) - 0.6 * k);
      g.fillStyle(0xe8c46a, 1); g.fillCircle(px(rod.x1), py(rod.y1), 2 * k); g.fillCircle(px(rod.x2), py(rod.y2), 2 * k);
      g.fillCircle(px(rod.cx), py(rod.cy), 1.8 * k);
    }
    g.lineStyle(Math.max(0.7, 0.8 * k), 0xe6dcf4, 0.6);
    for (const string of rig.strings) g.lineBetween(px(string.x1), py(string.y1), px(string.x2), py(string.y2));
    for (const form of rig.forms) {
      const obj = this._forms.find(item => item.id === form.id);
      obj.img.setPosition(px(form.x), py(form.y)).setRotation(form.rotation);
      obj.img.setDisplaySize(obj.size.width * Math.cos(form.yaw), obj.size.height);
    }
    const breeze = nurseryBreeze(this._elapsed), baby = this._roomArt.baby;
    this._curtain.setRotation(-0.012 + breeze * 0.017).setScale(1 + breeze * 0.022, 1);
    // Subpixel breathing stays contained inside the near rail.
    const breath = Math.sin(this._elapsed * Math.PI * 2 / 4700);
    this._blanket.setScale(baby.scale, baby.scale * (1 + breath * 0.006));
    this._blanket.setY(baby.y - breath * baby.scale * 0.20);
    this._renderAtmosphere();
  }

  _renderAtmosphere() {
    this._lastEffects = this.ambientEffects;
    const { width: W, height: H } = this._L, w = this._roomArt.layout.win;
    this._stars.clear(); this._dust.clear();
    if (!this.ambientEffects) return;
    for (const star of this._roomArt.stars) {
      const alpha = 0.15 + (1 + Math.sin(this._elapsed * 0.0006 + star.phase)) * 0.16;
      this._stars.fillStyle(0xc6badc, alpha); this._stars.fillCircle(star.x, star.y, 0.7);
    }
    for (const mote of this._motes) {
      const progress = (mote.y + this._elapsed * mote.speed * 0.000008) % 1;
      const x = w.x + w.w * mote.x - progress * W * 0.39 + Math.sin(this._elapsed * 0.00035 + mote.phase) * 5;
      const y = w.y + w.h * 0.45 + progress * H * 0.56;
      const alpha = Math.sin(progress * Math.PI) * 0.15;
      this._dust.fillStyle(0xc1afd4, alpha); this._dust.fillCircle(x, y, 0.5 + mote.speed * 0.45);
    }
  }

  _teardown() {
    this.tweens.killAll(); this.time.removeAllEvents();
    for (const child of this.children.list.slice()) child.destroy();
    releaseRoomArt(this.textures); releaseMobileArt(this.textures);
    this._L = null; this._roomArt = null; this._forms = [];
    this._baby = this._blanket = this._curtain = this._mobileStrings = this._stars = this._dust = this._hub = null;
  }

  shutdown() { this._teardown(); }
}
