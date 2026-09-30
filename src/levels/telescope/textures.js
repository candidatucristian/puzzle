/** Cached procedural sky textures; no puzzle or navigation state. */
// wispy night cloud: overlapping soft blobs on a transparent canvas.
// Every blob stays fully inside the canvas — a clipped blob would show
// as a hard straight edge drifting across the sky.
export function makeCloudTexture(textures, key, seedInit) {
  if (textures.exists(key)) return;
  const CW = 560,
    CH = 240;
  const c = document.createElement("canvas");
  c.width = CW;
  c.height = CH;
  const ctx = c.getContext("2d");
  let seed = seedInit * 1013904 + 12345;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 8; i++) rnd();
  for (let i = 0; i < 34; i++) {
    const t = rnd(); // position along the cloud
    const wave = Math.sin(t * Math.PI); // fat middle, thin fading ends
    const br = (16 + rnd() * 52) * (0.4 + wave * 0.6);
    let bx = CW * (0.5 + (t - 0.5) * 0.74);
    bx = Math.min(Math.max(bx, br + 2), CW - br - 2);
    const by =
      CH * 0.5 + (rnd() * 2 - 1) * Math.max(0, CH * 0.5 - br - 2) * 0.6;
    const a = (0.035 + rnd() * 0.045) * (0.3 + wave * 0.7);
    const gg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    gg.addColorStop(0, "rgba(196,209,238," + a.toFixed(3) + ")");
    gg.addColorStop(0.65, "rgba(196,209,238," + (a * 0.5).toFixed(3) + ")");
    gg.addColorStop(1, "rgba(196,209,238,0)");
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  textures.addCanvas(key, c);
}
