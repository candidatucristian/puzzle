import { drawWindowFrame } from "./windowFrame.js";

/** Static room artwork: the child-at-a-telescope sketch, drawn in pencil.
 *  Returns the window opening's geometry in the sketch container's local
 *  coordinates. */
export function drawRoom(scene, sk, W, H) {
    const SK = 0xd8d2c4;
    const g = scene.add.graphics();
    sk.add(g);
    // container is centred — draw in local coords
    const X = (f) => W * f - W / 2;
    const Y = (f) => H * f - H / 2;
    const rnd = scene._rng(7317);

    // paper: the dark room
    g.fillGradientStyle(0x0e1014, 0x101318, 0x07080b, 0x090a0d, 1);
    g.fillRect(-W / 2, -H / 2, W, H);

    // ── the arched window ──
    const wl = X(0.34);
    const wr = X(0.66);
    const archCX = X(0.5);
    const archCY = Y(0.33);
    const archRX = W * 0.16;
    const archRY = H * 0.15;
    const sillY = Y(0.62);

    // the sky, seen through the opening
    g.fillStyle(0x0b0f16, 1);
    g.fillRect(wl, archCY, wr - wl, sillY - archCY);
    g.fillEllipse(archCX, archCY, archRX * 2, archRY * 2);

    // stars — kept inside the opening
    const rndS = scene._rng(4194);
    for (let i = 0; i < 34; i++) {
      const x = wl + rndS() * (wr - wl);
      const y = Y(0.19) + rndS() * (sillY - Y(0.19));
      const inArch =
        y >= archCY ||
        Math.pow((x - archCX) / archRX, 2) +
          Math.pow((y - archCY) / archRY, 2) <=
          0.94;
      if (!inArch) continue;
      g.fillStyle(0xffffff, 0.25 + rndS() * 0.6);
      g.fillCircle(x, y, 0.6 + rndS() * 1.2);
    }
    // a few 4-point sparkles, like the drawing's bright stars
    for (const [fx, fy, s] of [
      [0.44, 0.26, 5],
      [0.58, 0.33, 6],
      [0.51, 0.45, 4],
      [0.63, 0.52, 5],
    ]) {
      const x = X(fx);
      const y = Y(fy);
      g.lineStyle(1, 0xffffff, 0.8);
      g.lineBetween(x - s, y, x + s, y);
      g.lineBetween(x, y - s, x, y + s);
    }

    // window frame: arch + jambs + sill + open shutters (shared with the
    // close-up view, so both are literally the same window)
    drawWindowFrame(scene, g, rnd, {
      wl, wr, archCX, archCY, archRX, archRY, sillY,
      sillL: X(0.3), sillR: X(0.7),
      shutterOutL: X(0.245), shutterOutR: X(0.755),
      shutterTopIn: Y(0.245), shutterTopOut: Y(0.185),
      shutterBotOut: Y(0.665),
    });

    // ── the telescope, aimed out the window ──
    const eye = { x: X(0.472), y: Y(0.505) }; // eyepiece end
    const obj = { x: X(0.615), y: Y(0.345) }; // objective end
    const tdx = obj.x - eye.x;
    const tdy = obj.y - eye.y;
    const tlen = Math.hypot(tdx, tdy);
    const nx = -tdy / tlen;
    const ny = tdx / tlen;
    const tw = W * 0.011; // half-width of the tube
    g.fillStyle(0x171a20, 0.95);
    g.fillPoints(
      [
        { x: eye.x + nx * tw, y: eye.y + ny * tw },
        { x: obj.x + nx * tw * 1.25, y: obj.y + ny * tw * 1.25 },
        { x: obj.x - nx * tw * 1.25, y: obj.y - ny * tw * 1.25 },
        { x: eye.x - nx * tw, y: eye.y - ny * tw },
      ],
      true,
    );
    scene._pencilSeg(
      g,
      rnd,
      eye.x + nx * tw,
      eye.y + ny * tw,
      obj.x + nx * tw * 1.25,
      obj.y + ny * tw * 1.25,
      1.6,
      SK,
      0.6,
      1.2,
    );
    scene._pencilSeg(
      g,
      rnd,
      eye.x - nx * tw,
      eye.y - ny * tw,
      obj.x - nx * tw * 1.25,
      obj.y - ny * tw * 1.25,
      1.6,
      SK,
      0.6,
      1.2,
    );
    // objective ring + eyepiece stub
    scene._pencilSeg(
      g,
      rnd,
      obj.x + nx * tw * 1.35,
      obj.y + ny * tw * 1.35,
      obj.x - nx * tw * 1.35,
      obj.y - ny * tw * 1.35,
      2,
      SK,
      0.65,
      0.8,
    );
    const eb = { x: eye.x - tdx * 0.06, y: eye.y - tdy * 0.06 };
    scene._pencilSeg(
      g,
      rnd,
      eye.x + nx * tw * 0.6,
      eye.y + ny * tw * 0.6,
      eb.x + nx * tw * 0.6,
      eb.y + ny * tw * 0.6,
      1.4,
      SK,
      0.55,
      0.6,
    );
    scene._pencilSeg(
      g,
      rnd,
      eye.x - nx * tw * 0.6,
      eye.y - ny * tw * 0.6,
      eb.x - nx * tw * 0.6,
      eb.y - ny * tw * 0.6,
      1.4,
      SK,
      0.55,
      0.6,
    );
    scene._pencilSeg(
      g,
      rnd,
      eb.x + nx * tw * 0.6,
      eb.y + ny * tw * 0.6,
      eb.x - nx * tw * 0.6,
      eb.y - ny * tw * 0.6,
      1.4,
      SK,
      0.55,
      0.6,
    );
    // a band on the tube
    const bm = { x: eye.x + tdx * 0.55, y: eye.y + tdy * 0.55 };
    scene._pencilSeg(
      g,
      rnd,
      bm.x + nx * tw * 1.1,
      bm.y + ny * tw * 1.1,
      bm.x - nx * tw * 1.1,
      bm.y - ny * tw * 1.1,
      1.2,
      SK,
      0.4,
      0.6,
    );

    // tripod under the tube's balance point
    const hub = { x: X(0.535), y: Y(0.575) };
    scene._pencilSeg(g, rnd, bm.x, bm.y, hub.x, hub.y, 1.4, SK, 0.5, 1);
    scene._pencilCircle(g, rnd, hub.x, hub.y, 4, 1.2, SK, 0.5);
    scene._pencilSeg(
      g,
      rnd,
      hub.x,
      hub.y,
      X(0.465),
      Y(0.875),
      1.6,
      SK,
      0.55,
      1.6,
    );
    scene._pencilSeg(
      g,
      rnd,
      hub.x,
      hub.y,
      X(0.605),
      Y(0.875),
      1.6,
      SK,
      0.55,
      1.6,
    );
    scene._pencilSeg(
      g,
      rnd,
      hub.x,
      hub.y,
      X(0.545),
      Y(0.895),
      1.6,
      SK,
      0.55,
      1.6,
    );
    // leg spreader
    scene._pencilSeg(
      g,
      rnd,
      X(0.497),
      Y(0.73),
      X(0.573),
      Y(0.73),
      1,
      SK,
      0.3,
      1,
    );

    // ── the sill props: lantern and a potted plant ──
    const lx = X(0.6);
    const ly = sillY - 4;
    scene._pencilSeg(g, rnd, lx - 7, ly, lx + 7, ly, 1.2, SK, 0.5, 0.6);
    scene._pencilSeg(
      g,
      rnd,
      lx - 7,
      ly - H * 0.045,
      lx + 7,
      ly - H * 0.045,
      1.2,
      SK,
      0.5,
      0.6,
    );
    scene._pencilSeg(
      g,
      rnd,
      lx - 7,
      ly,
      lx - 7,
      ly - H * 0.045,
      1.2,
      SK,
      0.5,
      0.6,
    );
    scene._pencilSeg(
      g,
      rnd,
      lx + 7,
      ly,
      lx + 7,
      ly - H * 0.045,
      1.2,
      SK,
      0.5,
      0.6,
    );
    scene._pencilArc(
      g,
      rnd,
      lx,
      ly - H * 0.045,
      7,
      6,
      Math.PI,
      Math.PI * 2,
      1.1,
      SK,
      0.45,
    );
    g.fillStyle(0xe8dcc0, 0.55);
    g.fillCircle(lx, ly - H * 0.022, 2.4);
    g.fillStyle(0xe8dcc0, 0.07);
    g.fillCircle(lx, ly - H * 0.022, 10);
    // plant
    const px = X(0.645);
    const py = sillY - 2;
    scene._pencilSeg(
      g,
      rnd,
      px - 8,
      py - H * 0.03,
      px + 8,
      py - H * 0.03,
      1.2,
      SK,
      0.5,
      0.6,
    );
    scene._pencilSeg(
      g,
      rnd,
      px - 8,
      py - H * 0.03,
      px - 5,
      py,
      1.2,
      SK,
      0.5,
      0.6,
    );
    scene._pencilSeg(
      g,
      rnd,
      px + 8,
      py - H * 0.03,
      px + 5,
      py,
      1.2,
      SK,
      0.5,
      0.6,
    );
    scene._pencilSeg(g, rnd, px - 5, py, px + 5, py, 1.2, SK, 0.5, 0.6);
    for (const [dx, dy] of [
      [-7, -22],
      [0, -26],
      [7, -21],
      [-3, -24],
      [4, -25],
    ]) {
      scene._pencilSeg(
        g,
        rnd,
        px,
        py - H * 0.03,
        px + dx,
        py - H * 0.03 + dy,
        1.1,
        SK,
        0.45,
        1.2,
      );
    }

    // ── left wall: two shelves with books, a small plant on top ──
    for (const [fy, n] of [
      [0.26, 6],
      [0.38, 5],
    ]) {
      const sy = Y(fy);
      scene._pencilSeg(g, rnd, X(0.075), sy, X(0.205), sy, 1.6, SK, 0.4, 1.4);
      scene._pencilSeg(
        g,
        rnd,
        X(0.08),
        sy + 4,
        X(0.09),
        sy + 12,
        1,
        SK,
        0.25,
        0.6,
      );
      scene._pencilSeg(
        g,
        rnd,
        X(0.19),
        sy + 4,
        X(0.2),
        sy + 12,
        1,
        SK,
        0.25,
        0.6,
      );
      const rndB = scene._rng(600 + n * 37);
      for (let i = 0; i < n; i++) {
        const bx = X(0.09) + i * (W * 0.016) + rndB() * 4;
        const bh = H * (0.028 + rndB() * 0.016);
        scene._pencilSeg(g, rnd, bx, sy, bx, sy - bh, 1.3, SK, 0.35, 0.8);
      }
    }
    for (const [dx, dy] of [
      [-6, -16],
      [0, -19],
      [6, -15],
    ]) {
      scene._pencilSeg(
        g,
        rnd,
        X(0.115),
        Y(0.26) - H * 0.02,
        X(0.115) + dx,
        Y(0.26) - H * 0.02 + dy,
        1,
        SK,
        0.3,
        1,
      );
    }
    scene._pencilSeg(
      g,
      rnd,
      X(0.108),
      Y(0.26),
      X(0.122),
      Y(0.26),
      1.1,
      SK,
      0.35,
      0.5,
    );
    scene._pencilSeg(
      g,
      rnd,
      X(0.108),
      Y(0.26),
      X(0.111),
      Y(0.24),
      1.1,
      SK,
      0.35,
      0.5,
    );
    scene._pencilSeg(
      g,
      rnd,
      X(0.122),
      Y(0.26),
      X(0.119),
      Y(0.24),
      1.1,
      SK,
      0.35,
      0.5,
    );

    // ── right wall: pinned papers, a desk and chair ──
    for (const [fx, fy, tilt] of [
      [0.83, 0.27, 2],
      [0.885, 0.33, -3],
    ]) {
      const pxr = X(fx);
      const pyr = Y(fy);
      const pw = W * 0.032;
      const ph = H * 0.055;
      scene._pencilSeg(
        g,
        rnd,
        pxr,
        pyr + tilt,
        pxr + pw,
        pyr - tilt,
        1.2,
        SK,
        0.35,
        1,
      );
      scene._pencilSeg(
        g,
        rnd,
        pxr + pw,
        pyr - tilt,
        pxr + pw,
        pyr + ph - tilt,
        1.2,
        SK,
        0.35,
        1,
      );
      scene._pencilSeg(
        g,
        rnd,
        pxr + pw,
        pyr + ph - tilt,
        pxr,
        pyr + ph + tilt,
        1.2,
        SK,
        0.35,
        1,
      );
      scene._pencilSeg(
        g,
        rnd,
        pxr,
        pyr + ph + tilt,
        pxr,
        pyr + tilt,
        1.2,
        SK,
        0.35,
        1,
      );
      g.fillStyle(SK, 0.45);
      g.fillCircle(pxr + pw / 2, pyr - tilt / 2, 1.4);
    }
    // desk
    scene._pencilSeg(
      g,
      rnd,
      X(0.79),
      Y(0.585),
      X(0.955),
      Y(0.585),
      1.8,
      SK,
      0.45,
      1.4,
    );
    scene._pencilSeg(
      g,
      rnd,
      X(0.8),
      Y(0.585),
      X(0.8),
      Y(0.72),
      1.3,
      SK,
      0.35,
      1,
    );
    scene._pencilSeg(
      g,
      rnd,
      X(0.945),
      Y(0.585),
      X(0.945),
      Y(0.72),
      1.3,
      SK,
      0.35,
      1,
    );
    // books on the desk
    scene._pencilSeg(
      g,
      rnd,
      X(0.815),
      Y(0.575),
      X(0.86),
      Y(0.575),
      1.3,
      SK,
      0.35,
      0.6,
    );
    scene._pencilSeg(
      g,
      rnd,
      X(0.818),
      Y(0.565),
      X(0.855),
      Y(0.565),
      1.2,
      SK,
      0.3,
      0.6,
    );
    // chair
    scene._pencilCircle(g, rnd, X(0.885), Y(0.635), H * 0.02, 1.3, SK, 0.35);
    scene._pencilSeg(
      g,
      rnd,
      X(0.885),
      Y(0.655),
      X(0.885),
      Y(0.73),
      1.2,
      SK,
      0.3,
      0.8,
    );
    scene._pencilSeg(
      g,
      rnd,
      X(0.862),
      Y(0.75),
      X(0.908),
      Y(0.73),
      1.2,
      SK,
      0.3,
      0.8,
    );

    // ── floor: skirting line and a fringed rug under the scene ──
    scene._pencilSeg(
      g,
      rnd,
      -W / 2,
      Y(0.745),
      W / 2,
      Y(0.74),
      1.2,
      SK,
      0.18,
      2.4,
    );
    scene._pencilSeg(g, rnd, X(0.33), Y(0.8), X(0.71), Y(0.8), 1.4, SK, 0.35, 2);
    scene._pencilSeg(
      g,
      rnd,
      X(0.71),
      Y(0.8),
      X(0.75),
      Y(0.915),
      1.4,
      SK,
      0.35,
      2,
    );
    scene._pencilSeg(
      g,
      rnd,
      X(0.75),
      Y(0.915),
      X(0.29),
      Y(0.915),
      1.4,
      SK,
      0.35,
      2,
    );
    scene._pencilSeg(
      g,
      rnd,
      X(0.29),
      Y(0.915),
      X(0.33),
      Y(0.8),
      1.4,
      SK,
      0.35,
      2,
    );
    scene._pencilSeg(
      g,
      rnd,
      X(0.345),
      Y(0.825),
      X(0.695),
      Y(0.825),
      1,
      SK,
      0.2,
      1.6,
    );
    scene._pencilSeg(
      g,
      rnd,
      X(0.315),
      Y(0.89),
      X(0.725),
      Y(0.89),
      1,
      SK,
      0.2,
      1.6,
    );
    // fringes
    for (let i = 0; i < 9; i++) {
      const fx1 = X(0.3 + i * 0.05);
      scene._pencilSeg(
        g,
        rnd,
        fx1,
        Y(0.918),
        fx1 - 2,
        Y(0.932),
        1,
        SK,
        0.25,
        0.4,
      );
    }

  return { wl, wr, archCY, sillY };
  }
