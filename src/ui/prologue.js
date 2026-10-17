import { CASE_REPORT, letterById } from "../shared/story.js";
import { renderLetter } from "./letterPage.js";
import { glint } from "./startFilm.js";
import { taskCard } from "./tasks.js";

const DESK_IMAGE = `${import.meta.env.BASE_URL}assets/images/Prologue/inspector-desk.png`;
const NAMEPLATE_IMAGE = `${import.meta.env.BASE_URL}assets/images/Prologue/inspector-nameplate-v2.png`;
const DESK_WIDTH = 1536, DESK_HEIGHT = 1024;
let deskImage;

// The cold open has ample time to decode its next, photographic scene.
export function preloadPrologueDesk() {
  if (!deskImage) {
    const image = new Image();
    image.decoding = "async";
    deskImage = new Promise(resolve => {
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
    });
    image.src = DESK_IMAGE;
  }
  return deskImage;
}

export function playPrologue(scope, options) {
  void preloadPrologueDesk();
  playDesk(scope, options);
}

// A moving, rain-swept frame: his desk, the night the letter comes. Two
// things on it, opened in turn: the letter first — why tonight — and then,
// as it asks, the Ashcombe file — the report the case was closed on, and the
// question he pencilled under it. Both are live text, on the same paper used
// throughout the case file. Bottom right, tonight's tasks — one at a time:
// the next shows only once the last is ticked in the pencil; with both done,
// bottom right, the way to the house.
function playDesk(scope, { onDone, reducedMotion = false, sounds = null } = {}) {
  const root = document.createElement("div");
  root.id = "prologue";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "The Ashcombe file, on Inspector Wren's desk");
  if (reducedMotion) root.classList.add("is-still");

  const camera = document.createElement("div");
  camera.className = "prologue-camera";
  const photograph = document.createElement("img");
  photograph.className = "prologue-photo";
  photograph.alt = "";
  photograph.decoding = "async";
  camera.append(photograph);

  const rain = document.createElement("canvas");
  rain.className = "prologue-rain";
  rain.setAttribute("aria-hidden", "true");
  camera.append(rain);

  const folder = document.createElement("div");
  folder.className = "prologue-folder-label";
  folder.textContent = "ASHCOMBE · 1961";
  folder.setAttribute("aria-hidden", "true");

  // the letter on the blotter, opened first; then the leather file beside it
  const envelope = document.createElement("button");
  envelope.type = "button";
  envelope.className = "prologue-envelope";
  envelope.setAttribute("aria-label", "Open the letter");
  envelope.title = "Open the letter";
  const dossier = document.createElement("button");
  dossier.type = "button";
  dossier.className = "prologue-envelope prologue-dossier";
  dossier.setAttribute("aria-label", "Open the Ashcombe file");
  dossier.title = "Open the file";
  dossier.disabled = true;

  const nameplate = document.createElement("div");
  nameplate.className = "prologue-desk-nameplate";
  nameplate.setAttribute("role", "img");
  nameplate.setAttribute("aria-label", "Inspector Arthur Wren");
  const nameplateImage = document.createElement("img");
  nameplateImage.className = "prologue-nameplate-image";
  nameplateImage.src = NAMEPLATE_IMAGE;
  nameplateImage.alt = "";
  nameplateImage.decoding = "async";
  nameplateImage.draggable = false;
  const inscription = document.createElement("span");
  inscription.className = "prologue-nameplate-inscription";
  inscription.textContent = "Inspector Arthur Wren";
  nameplate.append(nameplateImage, inscription);
  // The nameplate sits behind the photographed envelope; its transparent
  // lower edge is clipped to the envelope's real top edge in the photograph.
  camera.append(folder, dossier, nameplate, envelope);
  // the glint the house's door has, on whichever is to be opened now: the
  // letter first, then — once it is put down — the file
  const sparkle = (thing, step) => {
    const canvas = document.createElement("canvas");
    canvas.className = "prologue-glint";
    canvas.setAttribute("aria-hidden", "true");
    thing.append(canvas);
    glint(scope, thing, () => reducedMotion, () => !root.isConnected || root.dataset.step !== step, canvas, { scale: 2, sparks: 22 });
  };

  // tonight's tasks (tasks.js): the second not shown until the first is done
  const tasks = taskCard([
    ["letter", "Read the letter"],
    ["file", "Open the case file", { later: true }],
    ["house", "Go to Ashcombe Manor", { later: true }],
  ], { sounds });

  // with both done: the way on, drawn as the way back is, its arrow turned
  const onward = document.createElement("button");
  onward.type = "button";
  onward.className = "prologue-onward";
  onward.hidden = true;
  onward.innerHTML = `<span class="onward-word">Go to Ashcombe Manor<svg class="onward-line" viewBox="0 0 64 5" preserveAspectRatio="none" aria-hidden="true">
      ${["ink-dark", "ink-white", "ink-over"].map((c) => `<path class="${c}" d="M1.5 3.4C14 2.2 30 4 46 2.6C52 2.1 57 2.9 62.5 2.5" />`).join("")}
    </svg></span><svg class="onward-icon" viewBox="0 0 44 22" aria-hidden="true"><g class="onward-arrow">
      ${["ink-dark", "ink-white", "ink-over"].map((c) => `<path class="${c}" d="M3 18.5C5.5 8.2 16.5 3.6 26 4.6C32.4 5.3 36.8 8.6 39.6 13.2" /><path class="${c}" d="M40.6 6.4L39.7 13.4L33 12.1" />`).join("")}
    </g></svg>`;

  root.append(camera, tasks.node, onward);
  const reading = readingStage(scope, root);
  root.dataset.step = "letter";
  sparkle(envelope, "letter");

  document.body.append(root);
  // while the desk is up, the header stands over it with only what the opening needs
  document.body.classList.add("prologue-on");
  requestAnimationFrame(() => root.classList.add("is-shown"));
  void preloadPrologueDesk().then(image => {
    if (!image || !root.isConnected) return;
    photograph.src = image.src;
  });

  const placeSceneDetails = () => {
    const width = window.innerWidth, height = window.innerHeight;
    const cover = Math.max(width / DESK_WIDTH, height / DESK_HEIGHT);
    const offsetX = (width - DESK_WIDTH * cover) / 2;
    const offsetY = (height - DESK_HEIGHT * cover) / 2;
    const place = (node, x, y, w, h) => Object.assign(node.style, {
      left: `${offsetX + x * cover}px`, top: `${offsetY + y * cover}px`,
      width: `${w * cover}px`, height: `${h * cover}px`,
    });
    // Follow the real objects even when the frame is cropped for a narrow
    // or unusually wide screen. The photograph and button share one camera.
    place(dossier, 6, 512, 776, 286);
    place(envelope, 728, 649, 430, 150);
    place(folder, 315, 523, 225, 40);
    place(nameplate, 805, 543, 290, 144);
    resizeRain(rain, width, height);
  };
  placeSceneDetails();
  scope.on(window, "resize", placeSceneDetails);

  let lastFrame = 0, previous = performance.now();
  const drops = Array.from({ length: 90 }, () => ({
    x: .666 + Math.random() * .295, y: Math.random() * .40,
    speed: 22 + Math.random() * 76, length: 5 + Math.random() * 16,
    alpha: .08 + Math.random() * .18,
  }));
  const rainContext = rain.getContext("2d");
  let frame = 0;
  const animateRain = now => {
    if (!root.isConnected || reducedMotion) return;
    frame = requestAnimationFrame(animateRain);
    if (now - lastFrame < 32) return;
    const dt = Math.min(.045, (now - previous) / 1000);
    previous = lastFrame = now;
    rainContext.clearRect(0, 0, rain.width, rain.height);
    rainContext.save();
    rainContext.scale(rain.width / window.innerWidth, rain.height / window.innerHeight);
    const x0 = (window.innerWidth - DESK_WIDTH * Math.max(window.innerWidth / DESK_WIDTH, window.innerHeight / DESK_HEIGHT)) / 2;
    const y0 = (window.innerHeight - DESK_HEIGHT * Math.max(window.innerWidth / DESK_WIDTH, window.innerHeight / DESK_HEIGHT)) / 2;
    const cover = Math.max(window.innerWidth / DESK_WIDTH, window.innerHeight / DESK_HEIGHT);
    rainContext.beginPath();
    rainContext.roundRect(x0 + .674 * DESK_WIDTH * cover, y0 + 8 * cover,
      .296 * DESK_WIDTH * cover, .407 * DESK_HEIGHT * cover, 8 * cover);
    rainContext.clip();
    rainContext.lineCap = "round";
    for (const drop of drops) {
      drop.y += drop.speed * dt / (DESK_HEIGHT * cover);
      if (drop.y > .405) drop.y = .008;
      const x = x0 + drop.x * DESK_WIDTH * cover;
      const y = y0 + drop.y * DESK_HEIGHT * cover;
      rainContext.beginPath();
      rainContext.moveTo(x, y);
      rainContext.lineTo(x + .8 * cover, y + drop.length * cover);
      rainContext.strokeStyle = `rgba(207,222,238,${drop.alpha})`;
      rainContext.lineWidth = .75 * cover;
      rainContext.stroke();
    }
    rainContext.restore();
  };
  if (!reducedMotion) frame = requestAnimationFrame(animateRain);
  scope.add(() => cancelAnimationFrame(frame));

  // the letter, then the file it sends him to — each ticked once it is put
  // down — then the house
  const openLetter = () => {
    if (root.dataset.step !== "letter" || reading.open) return;
    envelope.disabled = true;
    reading.show(letterById("invitation"), {}, "Put it down", () => {
      reading.hide();
      root.dataset.step = "file";
      tasks.tick("letter");
      // a moment after the tick, the next task
      scope.later(() => tasks.show("file"), reducedMotion ? 0 : 700);
      dossier.disabled = false;
      sparkle(dossier, "file");
      dossier.focus({ preventScroll: true });
    });
  };
  const openFile = () => {
    if (root.dataset.step !== "file" || reading.open) return;
    root.dataset.step = "read";
    dossier.disabled = true;
    reading.show(CASE_REPORT, { seal: false }, "Put it down", () => {
      reading.hide();
      root.dataset.step = "done";
      tasks.tick("file");
      // the last task, and the way on, a moment after the second tick
      scope.later(() => {
        tasks.show("house");
        onward.hidden = false;
        requestAnimationFrame(() => onward.classList.add("is-in"));
        onward.focus({ preventScroll: true });
      }, reducedMotion ? 0 : 650);
    });
  };
  const leave = () => {
    if (root.dataset.step !== "done") return;
    root.dataset.step = "gone";
    tasks.tick("house");
    // the desk stays until what comes next has covered it: `onDone` is given
    // the way to take it down, and calls it once the screen has gone black —
    // so the house is never glimpsed between the two
    const dismiss = () => { document.body.classList.remove("prologue-on"); root.remove(); };
    if (onDone) { onDone(dismiss); return; }
    root.classList.add("is-leaving");
    scope.later(dismiss, reducedMotion ? 20 : 950);
  };
  scope.on(envelope, "click", openLetter);
  scope.on(dossier, "click", openFile);
  scope.on(onward, "click", leave);
  scope.on(window, "keydown", event => {
    if (reading.open || !root.isConnected || !["Enter", " "].includes(event.key)) return;
    if (event.target instanceof HTMLButtonElement && root.contains(event.target)) return;
    event.preventDefault();
    if (root.dataset.step === "letter") openLetter();
    else if (root.dataset.step === "file") openFile();
    else if (root.dataset.step === "done") leave();
  });
}

// Resize the transparent rain layer at screen resolution, then draw rain only
// over the actual window in the photograph.
function resizeRain(canvas, width, height) {
  const scale = Math.min(1.5, window.devicePixelRatio || 1);
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  Object.assign(canvas.style, { width: `${width}px`, height: `${height}px` });
  canvas.dataset.scale = String(scale);
}

// the sheet laid open over the desk, with its one button under it: a letter
// or a report, shown in turn, each with what its button does
function readingStage(scope, root) {
  const reading = document.createElement("div");
  reading.className = "prologue-reading";
  reading.hidden = true;
  const sheet = document.createElement("div");
  sheet.className = "prologue-sheet";
  const go = document.createElement("button");
  go.type = "button";
  go.className = "prologue-go";
  reading.append(sheet, go);
  root.append(reading);

  let open = false, then = null;
  // each button acts once: a second press, or Esc after it, does nothing
  const act = () => { const after = then; if (!open || !after) return; then = null; after(); };
  const show = (doc, options, label, after) => {
    open = true; then = after;
    renderLetter(sheet, doc, options);
    go.textContent = label;
    reading.hidden = false;
    sheet.scrollTop = 0; reading.scrollTop = 0;
    requestAnimationFrame(() => {
      reading.classList.add("is-shown");
      // too long for the screen: it scrolls, and its foot fades to say so
      sheet.classList.toggle("is-long", sheet.scrollHeight > sheet.clientHeight + 2);
    });
    go.focus({ preventScroll: true });
  };
  const hide = () => {
    open = false; then = null;
    reading.classList.remove("is-shown");
    scope.later(() => { if (!open) reading.hidden = true; }, 500);
  };
  scope.on(go, "click", act);
  scope.on(window, "keydown", event => {
    if (open && event.key === "Escape") { event.preventDefault(); act(); }
  });
  return { show, hide, get open() { return open; } };
}
