/** Scene-owned edge shading shared by the pencil scenes. */
export function drawVignette(scene, W, H) {
  const vg = scene.add.graphics().setDepth(30);
  const v = Math.min(W, H) * 0.2;
  vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0);
  vg.fillRect(0, 0, W, v);
  vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55);
  vg.fillRect(0, H - v, W, v);
  vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.45, 0, 0.45, 0);
  vg.fillRect(0, 0, v, H);
  vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.45, 0, 0.45);
  vg.fillRect(W - v, 0, v, H);
}
