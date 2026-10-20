import { canvasTexture, radial } from "./materials.js";
import { paintProjectedMaterial } from "../house/drawingRoomMaterials.js";

const HANDSET = "mp_handset_photograph_v1";
export const DESK_PHOTOGRAPH = "mp_frontal_desk_photograph_v2";
export const PHONE_CRADLE = "mp_charging_cradle_photograph_v1";
const DESK_SURFACE = "mp_frontal_desk_with_note_v2";
const capKey = frame => `mp_photographic_cap_${frame}_v1`;

export function loadPhonePhotography(scene) {
  for (const [key, url] of [
    [HANDSET, "assets/images/MobilePhone/handset-photographic-v1.png"],
    [DESK_PHOTOGRAPH, "assets/images/MobilePhone/frontal-desk-photographic-v2.png"],
    [PHONE_CRADLE, "assets/images/MobilePhone/charging-cradle-photographic-v1.png"],
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
  // Each physical rubber key is lifted from its own place in the photograph.
  // The exact live labels and hit areas stay attached to the moving cap.
  for (const cap of caps) {
    canvasTexture(scene, capKey(cap.frame), cap.w, cap.h, ctx => {
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
  canvasTexture(scene, DESK_SURFACE, image.width, image.height, ctx => {
    ctx.drawImage(image, 0, 0);
    // Print the original message onto the actual foreshortened paper surface.
    const note = document.createElement("canvas");
    note.width = 600; note.height = 210;
    const text = note.getContext("2d");
    text.fillStyle = "#493425"; text.textAlign = "center"; text.textBaseline = "middle";
    text.font = '42px "Special Elite", "Courier New", monospace';
    ["don't answer if", "you don't know", "who's calling."].forEach((line, i) => text.fillText(line, 300, 41 + i * 62));
    const corners = [{ x: 1188, y: 611 }, { x: 1435, y: 624 }, { x: 1440, y: 688 }, { x: 1167, y: 674 }];
    const [a, b, c, d] = corners;
    paintProjectedMaterial(ctx, note, (u, v) => ({
      x: a.x * (1 - u) * (1 - v) + b.x * u * (1 - v) + c.x * u * v + d.x * (1 - u) * v,
      y: a.y * (1 - u) * (1 - v) + b.y * u * (1 - v) + c.y * u * v + d.y * (1 - u) * v,
    }), 0.92, 8, 4);
  });
  const scale = Math.max(W / image.width, H / image.height);
  const left = (W - image.width * scale) / 2, top = (H - image.height * scale) / 2;
  add(scene.add.image(W / 2, H / 2, DESK_SURFACE).setScale(scale).setDepth(-10));
  return { cx: left + 173 * scale, cy: top + 551 * scale, rx: 70 * scale, ry: 10 * scale };
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
