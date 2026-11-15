/** A letter opened in a puzzle: the same for every one of them, never another
 *  (asked for on 2026-11-13). Its picture is a render of the sheet alone
 *  (art/blender/puzzle_letter.py: one sheet of old rag paper folded in three
 *  and opened out, its own soft shadow under it; only the words differ). It
 *  comes up out of its envelope to be read, the room going dark behind it,
 *  and goes back the same way: only its place, size and opacity change. A
 *  click anywhere, or the scene's Escape, puts it down.
 *
 *    const letter = paperLetter(scene, { texture, width, height, from, onOpen, onClosed });
 *    letter.open(); letter.close(); letter.isOpen;
 *
 *  `from` is the envelope it comes out of: { x, y, width } on the canvas.
 *  `onOpen` runs as it starts to come up, `onClosed` once it is put away. */
export function paperLetter(scene, { texture, width: W, height: H, from, onOpen = null, onClosed = null }) {
  const container = scene.add.container(0, 0).setDepth(60).setVisible(false);
  const backdrop = scene.add.rectangle(0, 0, W, H, 0x030304, 1).setOrigin(0).setInteractive();
  const image = scene.add.image(W / 2, H / 2 - 8, texture);
  const source = scene.textures.get(texture).getSourceImage();
  const fit = Math.min(W * .9 / source.width, (H - 40) * .96 / source.height);
  const caption = scene.localizedText(W / 2, H - 15, 'gameplay.putDown', {
    fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: "italic", fontSize: "13px", color: "#d0c7b6",
  }).setOrigin(.5, 1);
  container.add([backdrop, image, caption]);
  // (the sheet fills about 0.79 of its picture's width)
  const poses = {
    read: { x: W / 2, y: (H - 40) / 2 + 6, scale: fit, angle: 0, alpha: 1 },
    away: { x: from.x, y: from.y, scale: Math.max(.04, from.width * .62 / (source.width * .79)), angle: -5, alpha: 0 },
  };
  let open = false, closing = false;

  const to = (pose, dim, duration, ease, done) => {
    scene.tweens.killTweensOf([image, caption, backdrop]);
    scene.tweens.add({ targets: image, ...poses[pose], duration, ease, onComplete: done });
    scene.tweens.add({ targets: backdrop, alpha: dim, duration: duration * .85, ease: "Sine.easeInOut" });
    scene.tweens.add({ targets: caption, alpha: pose === "read" ? 1 : 0, duration: pose === "read" ? 260 : 120, delay: pose === "read" ? duration * .7 : 0 });
  };

  const letter = {
    get isOpen() { return open; },
    open() {
      if (open) return;
      open = true;
      image.setPosition(poses.away.x, poses.away.y).setScale(poses.away.scale).setAngle(poses.away.angle).setAlpha(0);
      caption.setAlpha(0); backdrop.setAlpha(0);
      container.setVisible(true).setAlpha(1);
      scene.services.audio.playClick(scene);
      onOpen?.();
      to("read", .84, scene.reducedMotion ? 1 : 560, "Cubic.easeOut");
    },
    close() {
      if (!open || closing) return;
      closing = true;
      to("away", 0, scene.reducedMotion ? 1 : 380, "Cubic.easeIn", () => {
        closing = false;
        open = false;
        container.setVisible(false);
        onClosed?.();
      });
    },
  };
  backdrop.on("pointerdown", () => letter.close());
  return letter;
}
