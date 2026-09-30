/** The moon, as it hangs over the valley through the telescope and over the
 *  garden: one cratered full moon with a soft halo, painted once and kept for
 *  the session under whatever key the scene asks for. */

// cratered moon with soft halo, painted once onto a canvas texture
export function makeMoonTexture(textures, key) {
  if (textures.exists(key)) return;
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d");
  const cx = S / 2,
    cy = S / 2,
    R = S * 0.36;

  // atmospheric halo
  const halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, S * 0.5);
  halo.addColorStop(0, "rgba(205,218,255,0.30)");
  halo.addColorStop(0.45, "rgba(205,218,255,0.09)");
  halo.addColorStop(1, "rgba(205,218,255,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, S, S);

  // disc, lit from the upper left
  const disc = ctx.createRadialGradient(
    cx - R * 0.35,
    cy - R * 0.4,
    R * 0.1,
    cx,
    cy,
    R,
  );
  disc.addColorStop(0, "#f7f4ea");
  disc.addColorStop(0.55, "#ddd8c9");
  disc.addColorStop(0.85, "#b9b3a4");
  disc.addColorStop(1, "#8e897c");
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // deterministic surface — same moon every night (warm the LCG up first,
  // otherwise the first draws cluster in one corner)
  let seed = 987611;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 8; i++) rnd();

  // maria: a few large, very soft dark plains
  for (let i = 0; i < 5; i++) {
    const mx = cx + (rnd() * 2 - 1) * R * 0.5;
    const my = cy + (rnd() * 2 - 1) * R * 0.5;
    const mr = R * (0.22 + rnd() * 0.2);
    const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
    mg.addColorStop(0, "rgba(104,101,94,0.26)");
    mg.addColorStop(0.7, "rgba(104,101,94,0.12)");
    mg.addColorStop(1, "rgba(104,101,94,0)");
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
  }

  // craters: mostly small and subtle, a couple of large ones; soft floors,
  // faint sunlit rim upper-left, faint inner shadow lower-right
  for (let i = 0; i < 30; i++) {
    const ang = rnd() * Math.PI * 2;
    const dist = Math.sqrt(rnd()) * R * 0.9;
    const px = cx + Math.cos(ang) * dist;
    const py = cy + Math.sin(ang) * dist;
    const cr =
      i < 4 ? R * (0.06 + rnd() * 0.04) : R * (0.015 + rnd() * 0.035);
    const fg = ctx.createRadialGradient(px, py, cr * 0.2, px, py, cr);
    fg.addColorStop(0, "rgba(96,92,84,0.20)");
    fg.addColorStop(0.8, "rgba(96,92,84,0.14)");
    fg.addColorStop(1, "rgba(96,92,84,0)");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(px, py, cr, 0, Math.PI * 2);
    ctx.fill();
    if (cr > R * 0.04) {
      ctx.lineWidth = Math.max(1, cr * 0.16);
      ctx.strokeStyle = "rgba(255,252,240,0.13)";
      ctx.beginPath();
      ctx.arc(px, py, cr * 0.85, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.strokeStyle = "rgba(60,58,52,0.15)";
      ctx.beginPath();
      ctx.arc(px, py, cr * 0.6, Math.PI * 0.05, Math.PI * 0.95);
      ctx.stroke();
    }
  }

  // terminator shading toward the lower right
  const sh = ctx.createRadialGradient(
    cx - R * 0.5,
    cy - R * 0.55,
    R * 0.2,
    cx,
    cy,
    R * 1.15,
  );
  sh.addColorStop(0, "rgba(0,0,10,0)");
  sh.addColorStop(0.75, "rgba(10,14,30,0.05)");
  sh.addColorStop(1, "rgba(10,14,30,0.45)");
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  textures.addCanvas(key, c);
}
