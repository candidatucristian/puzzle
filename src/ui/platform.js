/** Where the game is being played. In a browser it is a game for computers:
 *  a phone or a tablet is shown a page saying so, and the game itself is
 *  never loaded there. Inside a store app — a native shell such as
 *  Capacitor, which sets `window.Capacitor` — the same phone runs the game,
 *  in the compact layout of ui/mobile.js. */

/** Whether the page is running inside the store app's native shell. */
function isNativeApp(win = globalThis) {
  return Boolean(win.Capacitor?.isNativePlatform?.());
}

/** A phone or a tablet, as well as a browser can tell: its user agent says
 *  so (an iPad asking for the desktop site still gives itself away by its
 *  touch points), or the device has a finger and nothing finer — no mouse,
 *  no trackpad, no pen, nothing that can hover. A laptop with a touch screen
 *  still has its trackpad, and counts as a computer. */
export function isHandheld({ userAgent = "", maxTouchPoints = 0, media = () => false }) {
  if (/Android|iPhone|iPad|iPod|Mobi|Silk|Kindle|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) return true;
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return true;
  return media("(pointer: coarse)") && !media("(any-pointer: fine)") && !media("(any-hover: hover)");
}

/** True when this browser is to be shown the desktop-only page. */
export function desktopOnly(win = globalThis) {
  if (isNativeApp(win)) return false;
  return isHandheld({
    userAgent: win.navigator?.userAgent,
    maxTouchPoints: win.navigator?.maxTouchPoints || 0,
    media: (query) => Boolean(win.matchMedia?.(query).matches),
  });
}

/** Shows the desktop-only page in place of the game. */
export function showDesktopOnly(doc = document) {
  doc.getElementById("loading-screen")?.remove();
  doc.documentElement.dataset.desktopOnly = "true";
  doc.getElementById("desktop-only")?.removeAttribute("hidden");
}
