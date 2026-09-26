/** The arched window with its two open shutters, in pencil. Shared by the
 *  room sketch and by the close-up you get after climbing to the telescope,
 *  so both really are the same window — the close-up just passes a bigger
 *  geometry and a matching stroke scale. */
export const SKETCH = 0xd8d2c4;

export function drawWindowFrame(scene, g, rnd, o) {
  const {
    wl, wr, archCX, archCY, archRX, archRY, sillY,
    sillL, sillR, shutterOutL, shutterOutR,
    shutterTopIn, shutterTopOut, shutterBotOut,
    k = 1, // stroke / offset scale, so an enlarged window keeps its weight
  } = o;
  const SK = SKETCH;

  // arch + jambs, doubled pencil strokes
  scene._pencilArc(g, rnd, archCX, archCY, archRX, archRY, Math.PI, Math.PI * 2, 2 * k, SK, 0.55);
  scene._pencilArc(
    g, rnd, archCX, archCY, archRX + 7 * k, archRY + 7 * k,
    Math.PI, Math.PI * 2, 1.2 * k, SK, 0.3,
  );
  scene._pencilSeg(g, rnd, wl, archCY, wl, sillY, 2 * k, SK, 0.55, 1.6);
  scene._pencilSeg(g, rnd, wr, archCY, wr, sillY, 2 * k, SK, 0.55, 1.6);
  scene._pencilSeg(g, rnd, wl - 7 * k, archCY, wl - 7 * k, sillY, 1.2 * k, SK, 0.3, 1.6);
  scene._pencilSeg(g, rnd, wr + 7 * k, archCY, wr + 7 * k, sillY, 1.2 * k, SK, 0.3, 1.6);

  // sill
  scene._pencilSeg(g, rnd, sillL, sillY, sillR, sillY, 2.2 * k, SK, 0.55, 1.6);
  scene._pencilSeg(
    g, rnd, sillL + 4 * k, sillY + 9 * k, sillR - 4 * k, sillY + 9 * k,
    1.4 * k, SK, 0.35, 1.6,
  );

  // opened shutters, one each side, with two panes
  const shutter = (xIn, xOut, topIn, topOut) => {
    scene._pencilSeg(g, rnd, xIn, topIn, xOut, topOut, 1.6 * k, SK, 0.45, 1.4);
    scene._pencilSeg(g, rnd, xOut, topOut, xOut, shutterBotOut, 1.6 * k, SK, 0.45, 1.4);
    scene._pencilSeg(g, rnd, xOut, shutterBotOut, xIn, sillY, 1.6 * k, SK, 0.45, 1.4);
    const midT = (topIn + topOut) / 2 + 6 * k;
    const midB = (sillY + shutterBotOut) / 2;
    scene._pencilSeg(g, rnd, (xIn + xOut) / 2, midT, (xIn + xOut) / 2, midB, 1 * k, SK, 0.3, 1.2);
    scene._pencilSeg(
      g, rnd, xIn, (topIn + sillY) / 2, xOut, (topOut + shutterBotOut) / 2,
      1 * k, SK, 0.3, 1.2,
    );
  };
  shutter(wl - 8 * k, shutterOutL, shutterTopIn, shutterTopOut);
  shutter(wr + 8 * k, shutterOutR, shutterTopIn, shutterTopOut);
}
