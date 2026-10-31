import { canvasTexture, radial } from "./materials.js";

const HANDSET = "mp_handset_photograph_v1";
export const DESK_PHOTOGRAPH = "mp_frontal_desk_photograph_v2";
export const PHONE_CRADLE = "mp_charging_cradle_photograph_v1";
const capKey = frame => `mp_photographic_cap_${frame}_v1`;

export function loadPhonePhotography(scene) {
  for (const [key, url] of [
    [HANDSET, "assets/images/MobilePhone/handset-photographic-v1.webp"],
    [DESK_PHOTOGRAPH, "assets/images/MobilePhone/frontal-desk-photographic-v2.webp"],
    [PHONE_CRADLE, "assets/images/MobilePhone/charging-cradle-photographic-v1.webp"],
  ]) if (!scene.textures.exists(key)) scene.load.image(key, url);
}

export function photographicCapTexture(scene, frame) {
  const key = capKey(frame);
  return scene.textures.exists(key) ? key : null;
}

export function preparePhotographicHandset(scene, art) {
  if (!scene.textures.exists(HANDSET)) return false;
  const image = scene.textures.get(HANDSET).getSourceImage();
  const photograph = document.createElement("canvas");
  photograph.width = art.width; photograph.height = art.height;
  photograph.getContext("2d").drawImage(image, 0, 0, art.width, art.height);
  const caps = [];
  for (const [row, y] of art.keys.y.entries()) for (const [column, x] of art.keys.x.entries()) {
    caps.push({ frame: `number-${row * 3 + column}`, x, y, w: art.keys.width, h: art.keys.height });
  }
  art.softKeys.x.forEach((x, i) => caps.push({ frame: `soft-${i}`, x, y: art.softKeys.y, w: art.softKeys.width, h: art.softKeys.height }));
  caps.push({ frame: "rocker", x: art.rocker.x, y: art.rocker.y, w: art.rocker.width, h: art.rocker.height });
  // Each physical rubber key is lifted from its own rounded-pill recess in the 3D render.
  // The exact live labels and hit areas stay attached to the moving cap.
  for (const cap of caps) {
    canvasTexture(scene, capKey(cap.frame), cap.w, cap.h, ctx => {
      ctx.beginPath();
      ctx.roundRect(2, 2, cap.w - 4, cap.h - 4, cap.h * (cap.frame === "rocker" ? 0.46 : 0.3));
      ctx.clip();
      ctx.drawImage(photograph, cap.x - cap.w / 2, cap.y - cap.h / 2, cap.w, cap.h, 0, 0, cap.w, cap.h);
    });
  }
  canvasTexture(scene, art.key, art.width, art.height, ctx => {
    ctx.drawImage(photograph, 0, 0);
    // Dark recesses prevent a second stationary key showing through a press.
    ctx.fillStyle = "#090c09";
    for (const cap of caps) {
      ctx.beginPath();
      ctx.roundRect(cap.x - cap.w / 2 + 2, cap.y - cap.h / 2 + 2, cap.w - 4, cap.h - 4, cap.h * (cap.frame === "rocker" ? 0.46 : 0.3));
      ctx.fill();
    }
  });
  canvasTexture(scene, "mp_contact_shadow_code", 424, 846, ctx => {
    ctx.filter = "blur(10px)";
    ctx.drawImage(photograph, 34, 35, art.width * art.scale, art.height * art.scale);
    ctx.filter = "none";
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(0, 0, 424, 846);
    ctx.globalCompositeOperation = "source-over";
  });
  canvasTexture(scene, "mp_lcd_glow_code", 256, 256, ctx => {
    ctx.fillStyle = radial(ctx, 128, 128, 10, 128, [
      [0, "rgba(166,191,99,0.2)"], [0.45, "rgba(144,171,87,0.07)"], [1, "rgba(144,171,87,0)"],
    ]);
    ctx.fillRect(0, 0, 256, 256);
  });
  return true;
}

export function addPhotographicDesk(scene, W, H, add) {
  const image = scene.textures.get(DESK_PHOTOGRAPH).getSourceImage();
  const scale = Math.max(W / image.width, H / image.height);
  const left = (W - image.width * scale) / 2, top = (H - image.height * scale) / 2;
  add(scene.add.image(W / 2, H / 2, DESK_PHOTOGRAPH).setScale(scale).setDepth(-10));
  return { cx: left + 342.9 * scale, cy: top + 655.1 * scale, rx: 49.4 * scale, ry: 18.0 * scale };
}

export function addPhotographicCradle(scene, layout, add) {
  if (!scene.textures.exists(PHONE_CRADLE)) return;
  const image = scene.textures.get(PHONE_CRADLE).getSourceImage();
  const split = Math.round(image.height * 0.535);
  const width = 550 * layout.s, height = width * image.height / image.width;
  const x = layout.x, y = layout.y + 370 * layout.s - (split / image.height - 0.5) * height;
  // Both halves stay on the desk while only the handset vibrates in its socket.
  // The retaining lip must occlude the phone's heel, below the final key row.
  canvasTexture(scene, "mp_cradle_contact_shadow_v1", 600, 80, ctx => {
    ctx.translate(300, 40); ctx.scale(285, 27);
    ctx.fillStyle = radial(ctx, 0, 0, 0, 1, [[0, "rgba(0,0,0,0.7)"], [0.55, "rgba(0,0,0,0.32)"], [1, "rgba(0,0,0,0)"]]);
    ctx.fillRect(-1, -1, 2, 2);
  });
  add(scene.add.image(x + 9 * layout.s, layout.y + 461 * layout.s, "mp_cradle_contact_shadow_v1")
    .setScale(layout.s).setDepth(-5));
  add(scene.add.image(x, y, PHONE_CRADLE).setDisplaySize(width, height)
    .setCrop(0, 0, image.width, split).setDepth(-4));
  add(scene.add.image(x, y, PHONE_CRADLE).setDisplaySize(width, height)
    .setCrop(0, split, image.width, image.height - split).setDepth(1));
}
