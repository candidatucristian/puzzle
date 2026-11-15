// Makes a web build's sounds and pictures smaller, in the build only: the
// project's own files (public/assets) stay as the Blender scripts and the
// recordings made them. Called by demo-build.mjs and full-build.mjs once the
// build is written (2026-11-14: a puzzle waited on its download over the net).
//
//   sounds (.mp3): all of them, re-encoded at 112 kbps for music (longer than
//     20 s) and 96 kbps for the short ones; kept only if a tenth smaller.
//   pictures (.webp): only where it cannot be seen — re-encoded at quality 82
//     (or else 90), and kept only if it stays within 42 dB PSNR of the picture
//     it replaces and is at least 15% smaller. Lossless pictures (VP8L, such
//     as Room VI's exact depth map), data maps (depth, mask, normal, height),
//     animations, the films and the fonts are left as they are.
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync, unlinkSync, renameSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";

const require = createRequire(import.meta.url);
const FFMPEG_LOCAL = "C:/Users/crist/Tools/ffmpeg-dl/ffmpeg-master-latest-win64-gpl/bin";
const tool = (name) => existsSync(`${FFMPEG_LOCAL}/${name}.exe`) ? `${FFMPEG_LOCAL}/${name}.exe` : name;
const DATA_MAP = /depth|mask|normal|height|[-_]orm\b|lut/i;
const MIN_DB = 42;

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
const mb = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`;

function psnr(a, b) {
  let se = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; se += d * d; }
  const mse = se / a.length;
  return mse === 0 ? 99 : 10 * Math.log10((255 * 255) / mse);
}

// a lossless WebP holds a VP8L chunk (on its own, or inside VP8X)
const lossless = (buffer) => buffer.subarray(0, 4096).includes(Buffer.from("VP8L"));

async function picture(sharp, file) {
  const original = readFileSync(file);
  if (lossless(original) || DATA_MAP.test(basename(file))) return 0;
  const meta = await sharp(original).metadata();
  if ((meta.pages ?? 1) > 1) return 0;
  const reference = await sharp(original).ensureAlpha().raw().toBuffer();
  for (const quality of [82, 90]) {
    const smaller = await sharp(original).webp({ quality, alphaQuality: 90, effort: 6, smartSubsample: true }).toBuffer();
    if (smaller.length > original.length * 0.85) continue;
    const decoded = await sharp(smaller).ensureAlpha().raw().toBuffer();
    if (decoded.length !== reference.length || psnr(reference, decoded) < MIN_DB) continue;
    writeFileSync(file, smaller);
    return original.length - smaller.length;
  }
  return 0;
}

function sound(file) {
  const before = statSync(file).size;
  let seconds = 0;
  try {
    seconds = Number(execFileSync(tool("ffprobe"), ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }).trim()) || 0;
  } catch { return 0; }
  const out = join(tmpdir(), `compress-${process.pid}-${basename(file)}`);
  try {
    execFileSync(tool("ffmpeg"), ["-y", "-hide_banner", "-loglevel", "error", "-i", file, "-map_metadata", "-1", "-vn",
      "-c:a", "libmp3lame", "-b:a", seconds > 20 ? "112k" : "96k", out], { stdio: "ignore" });
  } catch { if (existsSync(out)) unlinkSync(out); return 0; }
  const after = statSync(out).size;
  if (after > before * 0.9) { unlinkSync(out); return 0; }
  unlinkSync(file);
  renameSync(out, file);
  return before - after;
}

/** Compresses `outDir`'s sounds and pictures in place; says what it saved. */
export async function compressBuild(outDir, label) {
  const assets = join(outDir, "assets");
  if (!existsSync(assets)) return;
  const sharp = require("sharp");
  const files = walk(assets);
  let soundSaved = 0, sounds = 0, pictureSaved = 0, pictures = 0;
  for (const file of files.filter((f) => extname(f).toLowerCase() === ".mp3")) {
    const saved = sound(file);
    if (saved) { soundSaved += saved; sounds++; }
  }
  const webps = files.filter((f) => extname(f).toLowerCase() === ".webp");
  // a few at a time: each holds two decoded pictures
  for (let i = 0; i < webps.length; i += 4) {
    const saved = await Promise.all(webps.slice(i, i + 4).map((f) => picture(sharp, f).catch(() => 0)));
    for (const s of saved) if (s) { pictureSaved += s; pictures++; }
  }
  console.log(`[${label}] compressed ${sounds} sounds (−${mb(soundSaved)}) and ${pictures} of ${webps.length} pictures (−${mb(pictureSaved)})`);
}
