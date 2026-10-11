import { DESK_ART, PHONE_ART, phonePoint, prepareDeskArt } from "./art.js";

/** Every prop is drawn by code, then cached separately for inexpensive resizing. */
export default class DeskView {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
  }

  build(W, H, layout) {
    this.destroy();
    prepareDeskArt(this.scene);
    const add = (object) => {
      this.objects.push(object);
      return object;
    };

    const scale = Math.max(W / DESK_ART.width, H / DESK_ART.height);
    add(this.scene.add.image(W / 2, H / 2, DESK_ART.key)
      .setScale(scale).setDepth(-10));

    // Prop sizes follow the handset so a short viewport keeps their proportions.
    const sideWidth = W / 2 - 170 * layout.s;
    const propScale = Math.min(layout.s, (sideWidth - 24) / 300);
    this.mug = null;
    if (propScale > 0.16) {
      const left = sideWidth * 0.5;
      const right = W - left;
      const cupY = H * 0.31;
      add(this.scene.add.image(left - 32 * propScale, cupY + 115 * propScale, "mp_coffee_ring_code")
        .setScale(propScale).setDepth(-9));
      add(this.scene.add.image(left, cupY, "mp_cup_code")
        .setOrigin(196 / 340, 146 / 312).setScale(propScale).setDepth(-8));
      this.mug = { cx: left, cy: cupY + 2 * propScale, r: 96 * propScale };

      const note = add(this.scene.add.container(right, H * 0.33)
        .setAngle(5).setScale(propScale).setDepth(-8));
      note.add(this.scene.add.image(0, 0, "mp_note_code"));
      note.add(this.scene.add.text(0, -5, "don't answer\nif you don't\nknow who's\ncalling.", {
        fontFamily: '"Special Elite", monospace', fontSize: "26px",
        lineSpacing: 9, color: "#493425",
      }).setOrigin(0.5));

      add(this.scene.add.image(right, H * 0.75, "mp_pen_code")
        .setScale(propScale).setAngle(-34).setDepth(-8));
    }
    this.rippleGfx = add(this.scene.add.graphics().setDepth(-7));
    const screen = phonePoint(PHONE_ART.screen.x, PHONE_ART.screen.y);
    this.screenGlow = add(this.scene.add.image(
      layout.x + screen.x * layout.s,
      layout.y + screen.y * layout.s,
      "mp_lcd_glow_code",
    ).setDisplaySize(370 * layout.s, 255 * layout.s).setDepth(-6));

    const vignette = add(this.scene.add.graphics().setDepth(15));
    const edge = Math.min(W, H) * 0.22;
    vignette.fillGradientStyle(0x080706, 0x080706, 0x080706, 0x080706, 0.32, 0.32, 0, 0);
    vignette.fillRect(0, 0, W, edge);
    vignette.fillGradientStyle(0x080706, 0x080706, 0x080706, 0x080706, 0, 0, 0.4, 0.4);
    vignette.fillRect(0, H - edge, W, edge);
    vignette.fillGradientStyle(0x080706, 0x080706, 0x080706, 0x080706, 0.25, 0, 0.25, 0);
    vignette.fillRect(0, 0, edge, H);
    vignette.fillGradientStyle(0x080706, 0x080706, 0x080706, 0x080706, 0, 0.25, 0, 0.25);
    vignette.fillRect(W - edge, 0, edge, H);
  }

  destroy() {
    for (const object of this.objects) object.destroy();
    this.objects = [];
    this.mug = this.rippleGfx = this.screenGlow = null;
  }
}
