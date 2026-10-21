import { createRainGlass } from "../shared/rainGlass.js";

// Water on the study's glass, measured in the desk photograph's coordinates.
// The bars, books and ornaments are occluders, not part of the wet surface.
const WINDOW = { x: 724, y: 0, w: 716, h: 502 };
const PANES = [
  [[738, 0], [915, 0], [915, 153], [738, 159]],
  [[939, 0], [1158, 0], [1158, 151], [939, 155]],
  [[1183, 0], [1429, 0], [1429, 146], [1183, 150]],
  [[738, 185], [915, 179], [915, 480], [795, 480], [789, 450],
    [779, 438], [779, 418], [760, 401], [755, 311], [738, 309]],
  [[939, 178], [1157, 175], [1157, 484], [939, 480]],
  [[1183, 174], [1427, 168], [1427, 316], [1391, 490], [1183, 485]],
].map(points => points.map(([x, y]) => [x - WINDOW.x, y - WINDOW.y]));
// the moon high on the left; the street lamp, warm, low on the right
const LIGHTS = [
  { dir: [-0.45, -0.65, 0.6], colour: [0.13, 0.17, 0.22] },
  { dir: [0.6, 0.3, 0.55], colour: [0.26, 0.19, 0.1] },
];

export function mountWindowRain(scope, { host, image, imageWidth, imageHeight, reducedMotion = false }) {
  let canvas = null, rain = null, frame = 0, previous = 0, disposed = false, size = null;
  const stop = () => { cancelAnimationFrame(frame); frame = 0; previous = 0; };
  const dispose = () => {
    if (disposed) return;
    disposed = true; stop(); rain?.dispose(); canvas?.remove();
  };
  scope.add(dispose);
  const resize = (width = host.clientWidth, height = host.clientHeight) => {
    size = [width, height];
    if (disposed || !canvas || !width || !height) return;
    const cover = Math.max(width / imageWidth, height / imageHeight);
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    Object.assign(canvas.style, {
      left: `${(width - imageWidth * cover) / 2 + WINDOW.x * cover}px`,
      top: `${(height - imageHeight * cover) / 2 + WINDOW.y * cover}px`,
      width: `${WINDOW.w * cover}px`, height: `${WINDOW.h * cover}px`,
    });
    rain.setSize(WINDOW.w * cover * dpr, WINDOW.h * cover * dpr);
  };
  const animate = now => {
    frame = 0;
    if (disposed || !canvas.isConnected) { dispose(); return; }
    const dt = previous ? Math.min(.05, (now - previous) / 1000) : 0;
    previous = now;
    rain.advance(dt); rain.draw();
    frame = requestAnimationFrame(animate);
  };
  const resume = () => {
    if (rain && !frame && !disposed && !reducedMotion && !document.hidden) frame = requestAnimationFrame(animate);
  };
  scope.on(document, "visibilitychange", () => document.hidden ? stop() : resume());
  image.then(photo => {
    if (!photo || disposed || scope.closed || !host.isConnected) return;
    // what is beyond the glass, at the photograph's own resolution
    const k = photo.naturalWidth / imageWidth;
    const source = document.createElement("canvas");
    source.width = Math.round(WINDOW.w * k); source.height = Math.round(WINDOW.h * k);
    source.getContext("2d").drawImage(photo,
      WINDOW.x / imageWidth * photo.naturalWidth, WINDOW.y / imageHeight * photo.naturalHeight,
      WINDOW.w / imageWidth * photo.naturalWidth, WINDOW.h / imageHeight * photo.naturalHeight,
      0, 0, source.width, source.height);
    rain = createRainGlass({
      width: WINDOW.w, height: WINDOW.h, pixels: 1.6, fieldScale: 1.6, source, panes: PANES,
      drop: 1, density: 1, fog: 0.6, reach: 26, lights: LIGHTS, seed: 4417,
    });
    canvas = rain.canvas;
    canvas.className = "prologue-rain";
    canvas.setAttribute("aria-hidden", "true");
    // just over the photograph, under everything else on the desk
    const photograph = host.querySelector(".prologue-photo");
    if (photograph) photograph.after(canvas); else host.append(canvas);
    if (rain.webgl) scope.on(canvas, "webglcontextlost", event => { event.preventDefault(); stop(); });
    if (size) resize(...size); else resize();
    resume();
  });
  return { resize };
}
