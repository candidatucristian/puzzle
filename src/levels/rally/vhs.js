import Phaser from "phaser";
import { makeCanvas, addCanvasTexture, releaseTextures, lcg } from "../../shared/paint.js";

/** The stage as it was taped off the television: an old VHS recording played
 *  back. Over the picture (under the set's frame, when it is on one): the
 *  scanlines, the blacks gone milky and blue, a grain that never sits still,
 *  the head-switching noise ragged along the bottom edge, and now and then
 *  a band of tracking noise rolling down through it. In its corner the
 *  player's PLAY, in the blocky white of a recorder's screen, its colours
 *  slipped apart as they always were — and across the top, the broadcaster's
 *  caption for the race.
 *
 *  The caption holds no figure: the cars' numbers are the only ones there. */

const SCAN = "ry_vhs_scan";
const NOISE = "ry_vhs_noise";
const DEPTH = 900; // over the whole stage and its podium, under the set
const OSD_FONT = '"IBM Plex Mono", "Courier New", monospace';
const CAPTION_FONT = '"IBM Plex Sans", Arial, sans-serif';

export const RACE_CAPTION = Object.freeze({
  title: "THE GRAND NIGHT RALLY",
  line: "FINAL STAGE  ·  THE CHAMPIONSHIP IS DECIDED TONIGHT",
});

export function addVhs(scene, W, H) {
  const t = scene.textures;
  if (!t.exists(SCAN)) addCanvasTexture(t, SCAN, scanTile());
  if (!t.exists(NOISE)) addCanvasTexture(t, NOISE, noiseTile());
  const add = scene.add;
  const objs = [];
  const keep = (o) => (objs.push(o), o);

  // the blacks lifted, cold: tape never held a real black
  keep(add.rectangle(0, 0, W, H, 0x1c1a34, 0.5).setOrigin(0).setDepth(DEPTH).setBlendMode(Phaser.BlendModes.SCREEN));
  // a colour slightly gone: warm in the lights, the rest a little faded
  keep(add.rectangle(0, 0, W, H, 0xfff0e0, 1).setOrigin(0).setDepth(DEPTH + 0.1).setBlendMode(Phaser.BlendModes.MULTIPLY));
  const scan = keep(add.tileSprite(0, 0, W, H, SCAN).setOrigin(0).setDepth(DEPTH + 0.2));
  const grain = keep(add.tileSprite(0, 0, W, H, NOISE).setOrigin(0).setDepth(DEPTH + 0.3).setAlpha(0.07).setBlendMode(Phaser.BlendModes.ADD));
  // the bottom edge, where the heads switch: torn, always moving
  const bandH = Math.max(6, H * 0.022);
  const head = keep(add.tileSprite(0, H - bandH, W, bandH, NOISE).setOrigin(0).setDepth(DEPTH + 0.4).setAlpha(0.42).setBlendMode(Phaser.BlendModes.ADD));
  keep(add.rectangle(0, H - bandH, W, bandH, 0x000000, 0.35).setOrigin(0).setDepth(DEPTH + 0.35));
  // the tracking band, rolling down now and then
  const trackH = Math.max(10, H * 0.05);
  const track = keep(add.tileSprite(0, -trackH, W, trackH, NOISE).setOrigin(0).setDepth(DEPTH + 0.4).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD));

  // ── the recorder's PLAY, its colours slipped apart ──
  const os = Math.max(16, Math.round(H * 0.042));
  const ox = W * 0.055, oy = H * 0.07;
  const osd = (dx, color, alpha) =>
    keep(add.text(ox + dx, oy, "PLAY ▶", { fontFamily: OSD_FONT, fontStyle: "bold", fontSize: os + "px", color })
      .setDepth(DEPTH + 1).setAlpha(alpha).setShadow(0, 0, "rgba(255,255,255,0.35)", os * 0.3, false, true));
  const ghosts = [osd(-2, "#ff3050", 0.55), osd(2, "#30e0ff", 0.55)];
  ghosts.forEach((g) => g.setBlendMode(Phaser.BlendModes.ADD));
  const play = osd(0, "#f4f4f0", 0.95);
  const sp = keep(add.text(ox, oy + os * 1.25, "SP", { fontFamily: OSD_FONT, fontStyle: "bold", fontSize: Math.round(os * 0.7) + "px", color: "#f4f4f0" })
    .setDepth(DEPTH + 1).setAlpha(0.85));

  // ── the broadcaster's caption, across the top right ──
  const cs = Math.max(13, Math.round(H * 0.03));
  const right = W * 0.95, top = H * 0.065;
  const title = add.text(0, 0, RACE_CAPTION.title, { fontFamily: CAPTION_FONT, fontStyle: "bold", fontSize: Math.round(cs * 1.25) + "px", color: "#ffffff" }).setOrigin(1, 0);
  const line = add.text(0, 0, RACE_CAPTION.line, { fontFamily: CAPTION_FONT, fontStyle: "bold", fontSize: Math.round(cs * 0.62) + "px", color: "#ffd84a" }).setOrigin(1, 0);
  line.setLetterSpacing?.(1);
  const live = add.text(0, 0, "LIVE", { fontFamily: CAPTION_FONT, fontStyle: "bold", fontSize: Math.round(cs * 0.62) + "px", color: "#ffffff" }).setOrigin(0.5);
  const pad = cs * 0.5;
  const boxW = Math.max(title.width, line.width) + pad * 2.4;
  const boxH = title.height + line.height + pad * 1.4;
  const bx = right - boxW, by = top;
  const box = add.graphics();
  box.fillStyle(0x0a1640, 0.78).fillRect(bx, by, boxW, boxH);
  box.fillStyle(0xd8a020, 1).fillRect(bx, by + boxH - Math.max(2, cs * 0.12), boxW, Math.max(2, cs * 0.12));
  const tagW = live.width + pad * 1.2, tagH = live.height + pad * 0.3;
  box.fillStyle(0xc81e1e, 1).fillRect(bx, by - tagH, tagW, tagH);
  live.setPosition(bx + tagW / 2, by - tagH / 2);
  title.setPosition(right - pad * 1.2, by + pad * 0.6);
  line.setPosition(right - pad * 1.2, by + pad * 0.7 + title.height);
  const caption = keep(add.container(0, 0, [box, title, line, live]).setDepth(DEPTH + 0.9).setAlpha(0.92));

  const rnd = lcg(4013);
  let nextRoll = 3500 + rnd() * 6000;
  let roll = null;
  return {
    caption,
    update(time) {
      // the grain and the torn edge never sit still
      grain.setTilePosition((rnd() * 256) | 0, (rnd() * 256) | 0);
      head.setTilePosition((rnd() * 256) | 0, (rnd() * 256) | 0);
      head.x = (rnd() - 0.3) * W * 0.012;
      scan.setTilePosition(0, (time / 90) % 3);
      // the OSD trembles a pixel; its colours wander
      const j = rnd() < 0.08 ? (rnd() - 0.5) * 3 : 0;
      play.x = ox + j;
      sp.x = ox + j;
      ghosts[0].x = ox - 2 - rnd() * 1.5 + j;
      ghosts[1].x = ox + 2 + rnd() * 1.5 + j;
      // now and then a band of tracking noise rolls down through it
      if (!roll && time > nextRoll) roll = { from: time, ms: 2600 + rnd() * 1800 };
      if (roll) {
        const u = (time - roll.from) / roll.ms;
        if (u >= 1) {
          roll = null;
          track.setAlpha(0);
          nextRoll = time + 7000 + rnd() * 9000;
        } else {
          track.y = -trackH + u * (H + trackH);
          track.setAlpha(0.22 * Math.sin(Math.PI * u));
          track.setTilePosition((rnd() * 256) | 0, (rnd() * 256) | 0);
        }
      }
    },
    destroy() {
      for (const o of objs) o.destroy();
      objs.length = 0;
    },
  };
}

export function releaseVhsArt(textures) {
  releaseTextures(textures, [SCAN, NOISE]);
}

// a dark line every third row
function scanTile() {
  const c = makeCanvas(4, 3);
  const g = c.getContext("2d");
  g.fillStyle = "rgba(0,0,0,0.26)";
  g.fillRect(0, 2, 4, 1);
  g.fillStyle = "rgba(0,0,0,0.08)";
  g.fillRect(0, 0, 4, 1);
  return c;
}

// tape noise: streaks drawn out along the lines, as tape drops out
function noiseTile() {
  const S = 256;
  const c = makeCanvas(S, S);
  const g = c.getContext("2d");
  g.fillStyle = "#000";
  g.fillRect(0, 0, S, S);
  const rnd = lcg(90917);
  for (let i = 0; i < 2600; i++) {
    const v = (120 + rnd() * 135) | 0;
    g.fillStyle = `rgba(${v},${v},${v},${(0.2 + rnd() * 0.6).toFixed(2)})`;
    g.fillRect((rnd() * S) | 0, (rnd() * S) | 0, 1 + ((rnd() * rnd() * 22) | 0), 1);
  }
  return c;
}
