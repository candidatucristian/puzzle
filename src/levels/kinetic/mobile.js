/**
 * mobile.js
 *
 * Procedural generation of the kinetic mobile's physical parts.
 * Paints the hanging shapes (Triangle, Circle, Heptagon, Pentagon) as
 * physical objects made of dark brass/polished wood, catching the moonlight.
 *
 * Instead of flat 2D shapes, these are rendered with fake 3D thickness,
 * inner shadows, and a sharp specular rim light on the moon-facing edges.
 */

import { KINETIC_FORMS, polygonVertices } from "./puzzle.js";

// The night-time material palette for the mobile shapes
// Dark base with silver/blue moonlight reflections
const MAT = {
  dark: "#141118",
  mid: "#2a2230",
  light: "#42374a",
  rim: "#a9b4c2", // Moonlight silver
  spec: "#e6edf5", // Direct moon glare
};

/**
 * Paints all the forms based on the layout size and registers them.
 * @param {Phaser.Textures.TextureManager} textures
 * @param {number} scaleRef - The master size scale from the layout
 */
export function paintMobileAssets(textures, scaleRef) {
  const keys = {};

  for (const form of KINETIC_FORMS) {
    // The radius in actual pixels
    const rPx = form.radius * scaleRef;
    const canvas = paintForm(form, rPx);

    if (textures.exists(form.id)) textures.remove(form.id);
    textures.addCanvas(form.id, canvas);
    keys[form.kind] = form.id;
  }

  // Also paint a tiny metallic rivet used to connect strings to rods/forms
  const rivetKey = "ki_rivet";
  if (textures.exists(rivetKey)) textures.remove(rivetKey);
  textures.addCanvas(rivetKey, paintRivet(scaleRef * 0.008));

  return { keys, rivetKey };
}

export function releaseMobileArt(textures) {
  for (const form of KINETIC_FORMS) {
    if (textures.exists(form.id)) textures.remove(form.id);
  }
  if (textures.exists("ki_rivet")) textures.remove("ki_rivet");
}

/**
 * Paints a single polygonal or circular form with fake 3D thickness and shading.
 */
function paintForm(form, r) {
  // Pad the canvas to accommodate the drop shadow and rim lights
  const pad = r * 0.4;
  const size = Math.ceil(r * 2 + pad * 2);
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");

  const cx = size / 2;
  const cy = size / 2;

  const isCircle = form.sides === 0;
  const pts = !isCircle ? polygonVertices(form.sides, r, -Math.PI / 2) : null;

  // 1. Drop Shadow (Soft, cast onto the ambient dust/fog)
  ctx.save();
  ctx.translate(cx, cy + r * 0.15);
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = r * 0.3;
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  drawShape(ctx, isCircle, pts, r);
  ctx.fill();
  ctx.restore();

  // 2. Extrusion / Thickness (The dark edge of the material)
  const thickness = Math.max(2, r * 0.04);
  ctx.save();
  ctx.translate(cx, cy + thickness);
  ctx.fillStyle = MAT.dark;
  drawShape(ctx, isCircle, pts, r);
  ctx.fill();
  ctx.restore();

  // 3. The Front Face (Gradient simulating curved/polished surface)
  ctx.save();
  ctx.translate(cx, cy);
  // Light comes from top-right (the moon)
  const faceGrad = ctx.createLinearGradient(
    -r * 0.3,
    -r * 0.5,
    r * 0.8,
    r * 0.8,
  );
  faceGrad.addColorStop(0, MAT.light);
  faceGrad.addColorStop(0.3, MAT.mid);
  faceGrad.addColorStop(1, MAT.dark);

  ctx.fillStyle = faceGrad;
  drawShape(ctx, isCircle, pts, r);
  ctx.fill();

  // 4. Inner Bevel / Moonlight Rim
  // Stroke the path with a bright silver gradient to simulate edge lighting
  const rimGrad = ctx.createLinearGradient(
    -r * 0.8,
    -r * 0.8,
    r * 0.2,
    r * 0.2,
  );
  rimGrad.addColorStop(0, MAT.spec);
  rimGrad.addColorStop(0.15, MAT.rim);
  rimGrad.addColorStop(0.5, "rgba(169, 180, 194, 0)"); // Fade to transparent in shadow

  ctx.strokeStyle = rimGrad;
  ctx.lineWidth = Math.max(1.5, r * 0.03);
  ctx.stroke();

  ctx.restore();

  // 5. Attachment hole (where the string ties in)
  // Usually near the top vertex (or top of circle)
  const topY = isCircle ? cy - r + r * 0.15 : cy + pts[0].y + r * 0.15;
  const topX = isCircle ? cx : cx + pts[0].x;

  ctx.fillStyle = "#050308";
  ctx.beginPath();
  ctx.arc(topX, topY, Math.max(1.5, r * 0.04), 0, Math.PI * 2);
  ctx.fill();
  // Highlight on the bottom lip of the hole
  ctx.strokeStyle = MAT.rim;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(topX, topY, Math.max(1.5, r * 0.04), 0, Math.PI);
  ctx.stroke();

  return c;
}

/**
 * Paints a tiny metallic rivet/joint for the mobile strings.
 */
function paintRivet(r) {
  const size = Math.ceil(r * 2 + 4);
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const cx = size / 2,
    cy = size / 2;

  const grad = ctx.createRadialGradient(
    cx - r * 0.3,
    cy - r * 0.3,
    0,
    cx,
    cy,
    r,
  );
  grad.addColorStop(0, MAT.spec);
  grad.addColorStop(0.4, MAT.rim);
  grad.addColorStop(1, MAT.dark);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function drawShape(ctx, isCircle, pts, r) {
  ctx.beginPath();
  if (isCircle) {
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  } else {
    pts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
  }
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  c.getContext("2d", { willReadFrequently: true });
  return c;
}
