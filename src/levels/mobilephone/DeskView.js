import { DESK_ART, PHONE_ART, phonePoint, preparePhoneLighting } from "./art.js";

/** Photographic desk plate with live paper lettering, coffee and LCD light. */
export default class DeskView {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
  }

  build(W, H, layout) {
    this.destroy();
    const add = (object) => {
      this.objects.push(object);
      return object;
    };
    preparePhoneLighting(this.scene);

    // Crop without distorting the cup. Wide screens retain the upper third
    // containing the note and coffee instead of showing empty wood.
    const scale = Math.max(W / DESK_ART.width, H / DESK_ART.height);
    const left = (W - DESK_ART.width * scale) / 2;
    const top = (H - DESK_ART.height * scale) * 0.31;
    add(this.scene.add.image(left, top, DESK_ART.key)
      .setOrigin(0).setScale(scale).setDepth(-10));

    const note = DESK_ART.note;
    add(this.scene.add.text(left + note.x * scale, top + note.y * scale,
      "don't answer\nif you don't\nknow who's\ncalling.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "26px",
        lineSpacing: 9,
        color: "#493425",
      }).setOrigin(0.5).setAngle(note.angle).setScale(scale).setDepth(-8));

    const coffee = DESK_ART.coffee;
    this.mug = {
      cx: left + coffee.x * scale,
      cy: top + coffee.y * scale,
      r: coffee.radius * scale,
    };
    this.rippleGfx = add(this.scene.add.graphics().setDepth(-7));

    const screen = phonePoint(PHONE_ART.screen.x, PHONE_ART.screen.y);
    this.screenGlow = add(this.scene.add.image(
      layout.x + screen.x * layout.s,
      layout.y + screen.y * layout.s,
      "mp_lcd_glow",
    ).setDisplaySize(370 * layout.s, 255 * layout.s).setDepth(-6));

    const vignette = add(this.scene.add.graphics().setDepth(15));
    const edge = Math.min(W, H) * 0.18;
    vignette.fillGradientStyle(0x080706, 0x080706, 0x080706, 0x080706, 0.25, 0.25, 0, 0);
    vignette.fillRect(0, 0, W, edge);
    vignette.fillGradientStyle(0x080706, 0x080706, 0x080706, 0x080706, 0, 0, 0.38, 0.38);
    vignette.fillRect(0, H - edge, W, edge);
  }

  destroy() {
    for (const object of this.objects) object.destroy();
    this.objects = [];
    this.mug = this.rippleGfx = this.screenGlow = null;
  }
}
