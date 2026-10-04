/** Detects touch-first devices for responsive browser and interaction tests. */
export function isHandheld({ userAgent = "", maxTouchPoints = 0, media = () => false }) {
  if (/Android|iPhone|iPad|iPod|Mobi|Silk|Kindle|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) return true;
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return true;
  return media("(pointer: coarse)") && !media("(any-pointer: fine)") && !media("(any-hover: hover)");
}
