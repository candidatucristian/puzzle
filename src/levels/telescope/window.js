import { drawWindowFrame, SKETCH as SK } from "./windowFrame.js";

/** The close-up: the very same arched window from the room sketch, shutters
 *  and all, scaled right up as though you'd stepped into the eyepiece and up
 *  to the glass. Painted in two passes — a backdrop behind the sky, the
 *  ground and frame in front — so the scene's stars sit behind the window. */
export function drawWindow(scene, W, H) {
  const rnd = scene._rng(4471);

  const wl = W * 0.19;
  const wr = W * 0.81;
  const archCX = W * 0.5;
  const archCY = H * 0.26;
  const archRX = (wr - wl) / 2;
  const archRY = H * 0.17;
  const sillY = H * 0.86;
  const horizonY = H * 0.695;
  const railTop = H * 0.735;
  const railBot = H * 0.815;

  const geo = {
    wl, wr, archCX, archCY, archRX, archRY, sillY, horizonY,
    // the straight-sided part of the opening, above the treeline: where the
    // Braille cells may sit without the arch ever cropping one
    content: { x0: wl + W * 0.03, x1: wr - W * 0.03, y0: archCY, y1: horizonY },
  };

  // ── behind the sky ──
  const backdrop = scene.add.graphics();
  backdrop.fillStyle(0x08090d, 1).fillRect(0, 0, W, H);
  backdrop.fillStyle(0x0b0f16, 1);
  backdrop.fillRect(wl, archCY, wr - wl, sillY - archCY);
  backdrop.fillEllipse(archCX, archCY, archRX * 2, archRY * 2);

  // ── in front of the sky ──
  const frame = scene.add.graphics();

  // distant treeline and the ground it stands on
  frame.fillStyle(0x070a0f, 1);
  const tree = [{ x: wl, y: sillY }, { x: wl, y: horizonY }];
  for (let x = wl; x <= wr; x += W * 0.016) {
    tree.push({ x, y: horizonY - (0.35 + rnd() * 0.65) * H * 0.04 });
  }
  tree.push({ x: wr, y: horizonY }, { x: wr, y: sillY });
  frame.fillPoints(tree, true);

  // the veranda: floorboards, then the rail between you and the garden
  frame.fillStyle(0x0b0d11, 1);
  frame.fillRect(wl, railBot, wr - wl, sillY - railBot);
  for (let i = 1; i < 4; i++) {
    const y = railBot + ((sillY - railBot) * i) / 4;
    scene._pencilSeg(frame, rnd, wl, y, wr, y, 1.2, SK, 0.12, 1.2);
  }
  scene._pencilSeg(frame, rnd, wl, railTop, wr, railTop, 2.4, SK, 0.38, 1.4);
  scene._pencilSeg(frame, rnd, wl, railTop + 7, wr, railTop + 7, 1.2, SK, 0.2, 1.2);
  scene._pencilSeg(frame, rnd, wl, railBot, wr, railBot, 2, SK, 0.32, 1.4);
  for (let x = wl + W * 0.035; x < wr; x += W * 0.045) {
    scene._pencilSeg(frame, rnd, x, railTop + 6, x, railBot, 1.4, SK, 0.24, 1.2);
  }

  // ── the wall around the opening, then the window itself ──
  frame.fillStyle(0x0a0c10, 1);
  frame.fillRect(0, 0, wl, H);
  frame.fillRect(wr, 0, W - wr, H);
  frame.fillRect(0, sillY, W, H - sillY);
  // above the arch, filled as a band with the arch bitten out of it
  frame.fillRect(wl, 0, wr - wl, archCY - archRY);
  for (let x = wl; x < wr; x += 2) {
    const t = (x + 1 - archCX) / archRX;
    const dy = Math.abs(t) >= 1 ? 0 : archRY * Math.sqrt(1 - t * t);
    frame.fillRect(x, archCY - archRY, 2, archRY - dy + 1);
  }

  drawWindowFrame(scene, frame, rnd, {
    wl, wr, archCX, archCY, archRX, archRY, sillY,
    sillL: wl - W * 0.0775,
    sillR: wr + W * 0.0775,
    shutterOutL: wl - W * 0.175,
    shutterOutR: wr + W * 0.175,
    shutterTopIn: archCY - H * 0.165,
    shutterTopOut: H * 0.03,
    shutterBotOut: sillY + H * 0.075,
    k: 1.9,
  });

  return { geo, backdrop, frame };
}
