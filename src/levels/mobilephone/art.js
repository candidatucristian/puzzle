// Source coordinates keep the live controls aligned with the photographed props.
export const DESK_ART = {
  key: "mp_walnut_desk",
  url: "assets/images/MobilePhone/walnut-desk.png",
  width: 1536,
  height: 1024,
  note: { x: 1305, y: 352, angle: 5 },
  coffee: { x: 246, y: 329, radius: 100 },
};

export const PHONE_ART = {
  key: "mp_handset",
  url: "assets/images/MobilePhone/handset.png",
  width: 857,
  height: 1835,
  scale: 800 / 1835,
  screen: { x: 429, y: 680, width: 450, height: 254 },
  softKeys: { x: [260, 603], y: 923, width: 156, height: 70 },
  rocker: { x: 429, y: 1047, width: 350, height: 138 },
  keys: { x: [252, 430, 607], y: [1191, 1311, 1430, 1550], width: 150, height: 90 },
};

export function phonePoint(x, y) {
  return {
    x: (x - PHONE_ART.width / 2) * PHONE_ART.scale,
    y: (y - PHONE_ART.height / 2) * PHONE_ART.scale,
  };
}

/** Small procedural lighting textures, cached through resizes and scene visits. */
export function preparePhoneLighting(scene) {
  if (!scene.textures.exists("mp_contact_shadow")) {
    const texture = scene.textures.createCanvas("mp_contact_shadow", 424, 846);
    const ctx = texture.context;
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetX = 13;
    ctx.shadowOffsetY = 17;
    ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
    ctx.beginPath();
    ctx.roundRect(91, 163, 248, 626, 48);
    ctx.fill();
    texture.refresh();
  }
  if (!scene.textures.exists("mp_lcd_glow")) {
    const texture = scene.textures.createCanvas("mp_lcd_glow", 256, 256);
    const ctx = texture.context;
    const glow = ctx.createRadialGradient(128, 128, 12, 128, 128, 128);
    glow.addColorStop(0, "rgba(166, 191, 99, 0.19)");
    glow.addColorStop(0.45, "rgba(144, 171, 87, 0.06)");
    glow.addColorStop(1, "rgba(144, 171, 87, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 256, 256);
    texture.refresh();
  }
}
