import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel, uiScale } from "../../shared/levelLabel.js";

import { kineticPose, kineticLayout, readKinetic } from "./puzzle.js";
import { paintRoom, releaseRoomArt } from "./room.js";
import { paintMobileAssets, releaseMobileArt } from "./mobile.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "KINETIC"  ·  code: CAGE  ·  count the unbroken curves
//
// A study of boundaries in a deep night nursery. A baby's crib sits in
// silhouette against a gothic window. Moonlight pours through, catching the
// brass and wood of a kinetic mobile hanging from the ceiling.
//
// The mobile physically sways in the night draft using Forward Kinematics,
// its shapes gently twisting on their strings. The puzzle remains: count the
// unbroken rims from top to bottom.
// ─────────────────────────────────────────────────────────────────────────────

export default class KineticScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Kinetic" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();

    this._elapsed = 0;
    this._build(this.cameras.main.width, this.cameras.main.height);

    this._resize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._resize);

    if (!this.skipFadeIn) this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  // ── what the level means (read by the tests) ───────────────────────────────

  static code() {
    return readKinetic();
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    // 1. Math layout
    this._L = kineticLayout(W, H);
    const k = uiScale(W, H);

    // 2. Paint Procedural Assets (Room & Mobile)
    const room = paintRoom(this.textures, W, H);
    const mobile = paintMobileAssets(this.textures, this._L.size);
    const R_KEYS = room.keys;
    const M_KEYS = mobile.keys;

    // 3. Construct the Room Diorama (Back to Front)
    this.add.image(0, 0, R_KEYS.sky).setOrigin(0).setDepth(-30);

    const stars = this.add
      .image(0, 0, R_KEYS.stars)
      .setOrigin(0)
      .setDepth(-29)
      .setBlendMode("ADD");
    // Twinkle the stars smoothly
    this.ambientTween({
      targets: stars,
      alpha: { from: 0.4, to: 1 },
      duration: 3500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.add.image(0, 0, R_KEYS.wall).setOrigin(0).setDepth(-20);
    this.add
      .image(0, 0, R_KEYS.rays)
      .setOrigin(0)
      .setDepth(-10)
      .setBlendMode("ADD");
    this.add.image(0, 0, R_KEYS.crib).setOrigin(0).setDepth(20);

    // 4. Construct the Mobile (Dynamic)
    this._mobileShadows = this.add.graphics().setDepth(-5);
    this._mobileStrings = this.add.graphics().setDepth(5);

    this._forms = [];
    const pose = kineticPose(0, this._L.x, this._L.y);

    // Create the Sprites for the hanging forms
    for (const fDef of pose.forms) {
      const key = M_KEYS[fDef.kind];
      const img = this.add.image(0, 0, key).setDepth(10);
      const rivet = this.add.image(0, 0, mobile.rivetKey).setDepth(11);

      this._forms.push({ img, rivet, id: fDef.id });
    }

    // 5. Clue & UI
    const labelH = Math.max(30, H * 0.085);
    const labelW = Math.min(W * 0.69, 395 * k);
    const lx = Math.min(W * 0.05, 36);
    const ly = H - labelH - 8 * k;

    // Subtle dark translucent plaque for the clue
    const plaque = this.add.graphics().setDepth(30);
    plaque.fillStyle(0x0a0710, 0.75);
    plaque.fillRoundedRect(lx, ly, labelW, labelH, 4 * k);
    plaque.lineStyle(1, 0x3a3b58, 0.4);
    plaque.strokeRoundedRect(lx, ly, labelW, labelH, 4 * k);

    this.add
      .text(lx + 10 * k, ly + 6 * k, "ONE UNBROKEN CURVE COUNTS AS ONE", {
        fontFamily: '"Courier New", monospace',
        fontSize: Math.min(12, labelW / 21, labelH * 0.34) + "px",
        color: "#a9b4c2", // Silver moonlight text
        letterSpacing: 1.5,
      })
      .setResolution(2)
      .setDepth(31);

    this.add
      .text(
        lx + 10 * k,
        ly + labelH * 0.52,
        "A study of boundaries. Read from above.",
        {
          fontFamily: "Georgia, serif",
          fontSize: Math.min(12, labelW / 22, labelH * 0.3) + "px",
          color: "#686a8a",
          fontStyle: "italic",
        },
      )
      .setResolution(2)
      .setDepth(31);

    this.levelText = drawLevelLabel(this, W, H, { color: "#8a8eaf" });
    this.levelText.setDepth(31);

    // Initial render
    this._renderDynamicMobile();
  }

  // ── update loop ────────────────────────────────────────────────────────────

  update(_time, delta) {
    if (!this._L) return;
    // Advance the physics simulation if not paused
    if (this.ambientMotion) {
      this._elapsed += Math.min(delta || 16, 50);
    }
    this._renderDynamicMobile();
  }

  _renderDynamicMobile() {
    // 1. Get the current physics state of the tree
    // Roots start at top center
    const pose = kineticPose(this._elapsed, this._L.x, this._L.y);
    const S = this._L.size;
    const k = uiScale(this._W, this._H);

    const strings = this._mobileStrings;
    const shadows = this._mobileShadows;

    strings.clear();
    shadows.clear();

    // 2. Draw Strings & Rods
    // Rods (Wooden / Brass bars)
    strings.lineStyle(Math.max(2, k * 2.5), 0x1a161e, 1);
    for (const r of pose.rods) {
      strings.lineBetween(r.x1, r.y1, r.x2, r.y2);
      // Center pivot ring
      strings.strokeCircle(r.cx, r.cy, 3 * k);

      // Draw soft ambient shadows for the rods against the window haze
      shadows.lineStyle(Math.max(4, k * 4), 0x000000, 0.4);
      shadows.lineBetween(r.x1 + 4, r.y1 + 10, r.x2 + 4, r.y2 + 10);
    }

    // Strings (Thin threads)
    strings.lineStyle(Math.max(0.8, k), 0x3a3245, 0.6);
    for (const s of pose.strings) {
      strings.lineBetween(s.x1, s.y1, s.x2, s.y2);
    }

    // 3. Update the Forms (Sprites)
    for (const fDef of pose.forms) {
      // Find the corresponding sprite object
      const formObj = this._forms.find((f) => f.id === fDef.id);
      if (!formObj) continue;

      const { img, rivet } = formObj;
      const rPx = fDef.radius * S;

      img.setPosition(fDef.x, fDef.y);
      // The FK angle translates to 2D rotation
      img.setRotation(fDef.angle + Math.PI / 2);

      // The yaw creates a fake 3D spinning effect by scaling X
      // We keep a minimum scale to never let it go completely invisible (edge-on)
      const fake3D = Math.max(0.2, Math.abs(Math.cos(fDef.yaw)));
      img.setScale(fake3D, 1);

      // The rivet attaches at the top vertex, which rotates with the body
      // We calculate its position based on the sprite's rotation
      const attachRadius = rPx * 0.85;
      const rx = fDef.x - Math.sin(img.rotation) * attachRadius;
      const ry = fDef.y - Math.cos(img.rotation) * attachRadius;

      rivet.setPosition(rx, ry);

      // Form shadows
      shadows.fillStyle(0x000000, 0.3);
      shadows.fillCircle(fDef.x + 8 * fake3D, fDef.y + 15, rPx * 0.9 * fake3D);
    }
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const child of this.children.list.slice()) child.destroy();

    releaseRoomArt(this.textures);
    releaseMobileArt(this.textures);

    this._L = null;
    this._forms = [];
    this._mobileStrings = null;
    this._mobileShadows = null;
  }

  shutdown() {
    this._teardown();
  }
}
