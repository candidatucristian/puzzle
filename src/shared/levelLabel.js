/** How much a room's fixed-pixel lettering shrinks on a small canvas:
 *  1 on a desktop, down to a little over half on a phone. (No room writes
 *  its number on the picture any more; what is left here is only this.) */
export function uiScale(W, H) {
  return Math.max(0.55, Math.min(1, Math.min(W / 1000, H / 720)));
}
