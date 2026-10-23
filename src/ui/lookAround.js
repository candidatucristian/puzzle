// Looking about: standing in one of the house's places, the eye follows the
// pointer a little way — the picture drifts slowly after it, a few pixels and
// late, as a head turns to look — which gives the painted rooms a little
// depth. The picture is held a touch larger meanwhile, so its edges never
// show. Never over a puzzle, where the picture keeps still; never with
// motion reduced or the room's own motion turned off; never in a room that
// asks to be held still (the canvas's data-look="still": a live room).
//
// The pointer is mapped onto the picture by where the canvas is on the page:
// while it drifts (and breathes) Phaser is told each frame where it now is,
// so a click lands where it looks as if it lands.

const REACH = { x: 18, y: 7 }; // the farthest it drifts, in pixels
const EASE = 2.4; // how slowly it follows: the time to cover most of the way, in seconds

export function mountLookAround(scope, game) {
  const root = document.documentElement;
  const canvas = () => game.canvas;
  const target = { x: 0, y: 0 }, at = { x: 0, y: 0 };
  let last = performance.now(), frame = 0;

  const still = () => root.dataset.reducedMotion === "true" || root.dataset.ambientMotion === "false";
  const looking = () => document.body.classList.contains("in-house") && !still() && canvas()?.dataset.look !== "still";

  scope.on(window, "pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const box = document.getElementById("game-viewport")?.getBoundingClientRect();
    if (!box?.width) return;
    // where on the picture the pointer is, from -1 to 1 either way; the eye turns towards it
    const nx = Math.max(-1, Math.min(1, ((e.clientX - box.left) / box.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - box.top) / box.height) * 2 - 1));
    target.x = -nx * REACH.x;
    target.y = -ny * REACH.y;
  });
  scope.on(document, "pointerleave", () => { target.x = target.y = 0; });

  function tick(now) {
    frame = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const c = canvas();
    if (!c) return;
    const on = looking();
    const goal = on ? target : { x: 0, y: 0 };
    const k = 1 - Math.exp((-dt * 3) / EASE);
    at.x += (goal.x - at.x) * k;
    at.y += (goal.y - at.y) * k;
    if (Math.abs(at.x) < 0.05 && Math.abs(at.y) < 0.05 && !on) { at.x = at.y = 0; }
    c.style.translate = at.x || at.y ? `${at.x.toFixed(2)}px ${at.y.toFixed(2)}px` : "";
    // where the picture is now, for the pointer
    const scale = game.scale;
    if (scale?.canvasBounds) {
      scale.updateBounds();
      const b = scale.canvasBounds;
      if (b.width && b.height) scale.displayScale.set(scale.baseSize.width / b.width, scale.baseSize.height / b.height);
    }
  }
  frame = requestAnimationFrame(tick);
  scope.add(() => { cancelAnimationFrame(frame); if (canvas()) canvas().style.translate = ""; });
}
