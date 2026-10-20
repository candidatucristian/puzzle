import { CASE_REPORT, letterById } from "../shared/story.js";
import { renderLetter } from "./letterPage.js";
import { glint } from "./startFilm.js";
import { taskCard } from "./tasks.js";
import { mountWindowRain } from "./windowRain.js";

const DESK_IMAGE = `${import.meta.env.BASE_URL}assets/images/Prologue/inspector-desk-film-match-v2.png`;
const DESK_WIDTH = 1672,
  DESK_HEIGHT = 941;
// Out of the film, into the game: the desk fills the screen, the matte gone,
// framed as the film's last shot comes to rest (no closer: the film is
// drawing back, and the game must not then move in). The opening film's
// last move (introVideo.js) ends on exactly this.
export const DESK_CAMERA = Object.freeze({ zoom: 1, origin: "50% 50%" });
let deskImage;

// Decode the desk while the opening film plays, before the fade reveals it.
export function preloadPrologueDesk() {
  if (!deskImage) {
    const image = new Image();
    image.decoding = "async";
    deskImage = new Promise((resolve) => {
      image.onload = () =>
        image
          .decode()
          .catch(() => {})
          .then(() => resolve(image));
      image.onerror = () => resolve(null);
    });
    image.src = DESK_IMAGE;
  }
  return deskImage;
}

export function playPrologue(scope, options) {
  void preloadPrologueDesk();
  return playDesk(scope, options);
}

// The film's framing continues on his desk, the night the letter comes. Two
// things on it, opened in turn: the letter first — why tonight — and then,
// as it asks, the Ashcombe file — the report the case was closed on, and the
// question he pencilled under it. Both are live text, on the same paper used
// throughout the case file. In the lower matte, tonight's task — one at a time:
// the next shows only once the last is ticked in the pencil; with both done,
// bottom right, the way to the house.
function playDesk(
  scope,
  {
    onDone,
    reducedMotion = false,
    sounds = null,
    revealImmediately = false,
    deferInteraction = false,
  } = {},
) {
  const root = document.createElement("div");
  root.id = "prologue";
  root.setAttribute("role", "dialog");
  root.setAttribute(
    "aria-label",
    "The Ashcombe file, on Inspector Wren's desk",
  );
  root.dataset.phase = deferInteraction ? "opening" : "ready";
  root.inert = deferInteraction;
  if (reducedMotion) root.classList.add("is-still");

  const camera = document.createElement("div");
  camera.className = "prologue-camera";
  Object.assign(camera.style, {
    transform: `scale(${DESK_CAMERA.zoom})`,
    transformOrigin: DESK_CAMERA.origin,
  });
  const photograph = document.createElement("img");
  photograph.className = "prologue-photo";
  photograph.alt = "";
  photograph.decoding = "async";
  const deskWidth = DESK_WIDTH,
    deskHeight = DESK_HEIGHT;
  camera.append(photograph);

  const rain = mountWindowRain(scope, {
    host: camera, image: preloadPrologueDesk(),
    imageWidth: deskWidth, imageHeight: deskHeight, reducedMotion,
  });

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
  // no "Open the file" over it until it is its turn
  dossier.disabled = true;

  const nameplate = document.createElement("div");
  nameplate.className = "prologue-desk-nameplate";
  nameplate.setAttribute("role", "img");
  nameplate.setAttribute("aria-label", "Inspector Arthur Wren");
  // The physical plaque and folder label are in the photograph, with the
  // same light and perspective as the film. No bright plates are laid over it.
  camera.append(dossier, nameplate, envelope);
  // what is to be opened now is drawn round in the game's thin pencil, on its
  // own shape in the photograph: the letter first, then the file
  camera.append(outlines());
  // the glint the house's door has, on whichever is to be opened now: the
  // letter first, then — once it is put down — the file
  const sparkle = (thing, step) => {
    const canvas = document.createElement("canvas");
    canvas.className = "prologue-glint";
    canvas.setAttribute("aria-hidden", "true");
    thing.append(canvas);
    glint(
      scope,
      thing,
      () => reducedMotion,
      () => !root.isConnected || root.dataset.step !== step,
      canvas,
      { scale: 2, sparks: 6 },
    );
  };

  // tonight's tasks (tasks.js), in a side panel on the right that fades in
  // once the film has handed over: one at a time, each struck through and
  // ticked when done, and the next coming in under it
  const tasks = taskCard(
    [
      ["letter", "Read the letter"],
      ["file", "Open the case file", { later: true }],
      ["house", "Go to Ashcombe Manor", { later: true }],
    ],
    { sounds },
  );
  tasks.node.setAttribute("aria-live", "polite");

  // with both done: the way on, drawn as the way back is, its arrow turned
  const onward = document.createElement("button");
  onward.type = "button";
  onward.className = "prologue-onward";
  onward.hidden = true;
  onward.innerHTML = `<span class="onward-word">Ashcombe Manor<svg class="onward-line" viewBox="0 0 64 5" preserveAspectRatio="none" aria-hidden="true">
      ${["ink-dark", "ink-white", "ink-over"].map((c) => `<path class="${c}" d="M1.5 3.4C14 2.2 30 4 46 2.6C52 2.1 57 2.9 62.5 2.5" />`).join("")}
    </svg></span><svg class="onward-icon" viewBox="0 0 44 22" aria-hidden="true"><g class="onward-arrow">
      ${["ink-dark", "ink-white", "ink-over"].map((c) => `<path class="${c}" d="M3 18.5C5.5 8.2 16.5 3.6 26 4.6C32.4 5.3 36.8 8.6 39.6 13.2" /><path class="${c}" d="M40.6 6.4L39.7 13.4L33 12.1" />`).join("")}
    </g></svg>`;

  const panel = document.createElement("aside");
  panel.className = "prologue-panel";
  panel.setAttribute("aria-label", "Tonight");
  const head = document.createElement("header");
  head.className = "prologue-panel-head";
  // headed as the game's own index heads a floor: its mark in a box, a rule, the name
  head.innerHTML = `<span class="pf-numeral">P</span><span class="pf-rule"></span><span class="pf-words"><span class="pf-name">Inspector Wren's Study</span><span class="pf-where">Prologue · Exeter, 2001</span></span>`;
  const label = document.createElement("p");
  label.className = "prologue-panel-label";
  label.textContent = "Tonight";
  panel.append(head, label, tasks.node, onward);
  root.append(camera, panel);
  const reading = readingStage(scope, root);
  root.dataset.step = "letter";
  sparkle(envelope, "letter");

  if (revealImmediately) root.classList.add("is-shown");
  document.body.append(root);
  // while the desk is up, the header stands over it with only what the opening needs
  document.body.classList.add("prologue-on");
  scope.add(() => {
    root.remove();
    document.body.classList.remove("prologue-on");
  });
  if (!revealImmediately)
    requestAnimationFrame(() => root.classList.add("is-shown"));
  // The film's frozen frame dissolves into this game background, fully
  // decoded before the covering film starts to disappear.
  const ready = preloadPrologueDesk().then(async (image) => {
    if (!image || !root.isConnected) return;
    photograph.src = image.src;
    await photograph.decode().catch(() => {});
  });

  const placeSceneDetails = () => {
    const width = camera.clientWidth,
      height = camera.clientHeight;
    const cover = Math.max(width / deskWidth, height / deskHeight);
    const offsetX = (width - deskWidth * cover) / 2;
    const offsetY = (height - deskHeight * cover) / 2;
    const scaleX = (deskWidth / DESK_WIDTH) * cover,
      scaleY = (deskHeight / DESK_HEIGHT) * cover;
    const place = (node, x, y, w, h) =>
      Object.assign(node.style, {
        left: `${offsetX + x * scaleX}px`,
        top: `${offsetY + y * scaleY}px`,
        width: `${w * scaleX}px`,
        height: `${h * scaleY}px`,
      });
    // Follow the real objects even when the frame is cropped for a narrow
    // or unusually wide screen. The photograph and button share one camera.
    place(dossier, 0, 534, 810, 270);
    place(envelope, 726, 700, 422, 112);
    place(nameplate, 894, 552, 286, 132);
    rain.resize(width, height);
  };
  placeSceneDetails();
  scope.on(window, "resize", placeSceneDetails);

  // the letter, then the file it sends him to — each ticked once it is put
  // down — then the house
  const openLetter = () => {
    if (root.dataset.step !== "letter" || reading.open) return;
    envelope.disabled = true;
    envelope.removeAttribute("title");
    delete envelope.dataset.tip;
    reading.show(letterById("invitation"), {}, "Put it down", () => {
      reading.hide();
      root.dataset.step = "file";
      tasks.tick("letter");
      // a moment after the tick, the next task
      scope.later(() => tasks.show("file"), reducedMotion ? 0 : 700);
      dossier.disabled = false;
      dossier.dataset.tip = "Open the file";
      sparkle(dossier, "file");
      dossier.focus({ preventScroll: true });
    });
  };
  const openFile = () => {
    if (root.dataset.step !== "file" || reading.open) return;
    root.dataset.step = "read";
    dossier.disabled = true;
    delete dossier.dataset.tip;
    reading.show(CASE_REPORT, { seal: false }, "Put it down", () => {
      reading.hide();
      root.dataset.step = "done";
      tasks.tick("file");
      // the last task, and the way on, a moment after the second tick
      scope.later(
        () => {
          tasks.show("house");
          onward.hidden = false;
          requestAnimationFrame(() => onward.classList.add("is-in"));
          onward.focus({ preventScroll: true });
        },
        reducedMotion ? 0 : 650,
      );
    });
  };
  const leave = () => {
    if (root.dataset.step !== "done") return;
    root.dataset.step = "gone";
    tasks.tick("house");
    // the desk stays until what comes next has covered it: `onDone` is given
    // the way to take it down, and calls it once the screen has gone black —
    // so the house is never glimpsed between the two
    const dismiss = () => {
      document.body.classList.remove("prologue-on");
      root.remove();
    };
    if (onDone) {
      onDone(dismiss);
      return;
    }
    root.classList.add("is-leaving");
    scope.later(dismiss, reducedMotion ? 20 : 950);
  };
  scope.on(envelope, "click", openLetter);
  scope.on(dossier, "click", openFile);
  scope.on(onward, "click", leave);
  scope.on(window, "keydown", (event) => {
    if (
      root.inert ||
      reading.open ||
      !root.isConnected ||
      !["Enter", " "].includes(event.key)
    )
      return;
    if (
      event.target instanceof HTMLButtonElement &&
      root.contains(event.target)
    )
      return;
    event.preventDefault();
    if (root.dataset.step === "letter") openLetter();
    else if (root.dataset.step === "file") openFile();
    else if (root.dataset.step === "done") leave();
  });
  return ready.then(() => () => {
    if (scope.closed || !root.isConnected) return;
    root.dataset.phase = "ready";
    root.inert = false;
  });
}

// The letter and the file as they lie in the photograph (its own pixels,
// 1672 x 941), each drawn round a little outside its edges by hand — a line
// that wavers slightly and does not quite close, in the three passes of the
// game's pencil. Laid over the photograph exactly as it is shown (`slice`
// is the photograph's cover); a line shows only on the step it belongs to.
const OUTLINES = {
  letter: [
    [790, 697],
    [1145, 710],
    [1157, 814],
    [719, 796],
  ],
  file: [
    [0, 616],
    [410, 531],
    [806, 596],
    [812, 612],
    [558, 788],
    [438, 766],
    [242, 738],
    [0, 700],
  ],
};
function outlines() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "prologue-outlines");
  svg.setAttribute("viewBox", `0 0 ${DESK_WIDTH} ${DESK_HEIGHT}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
  svg.setAttribute("aria-hidden", "true");
  // a hand's line round the points: each side bowed a touch, the end run
  // a little past the start
  const hand = (points, seed) => {
    let wobble = seed;
    const jitter = () => {
      wobble = (wobble * 9301 + 49297) % 233280;
      return (wobble / 233280 - 0.5) * 5;
    };
    const loop = [...points, points[0], points[1]];
    let d = `M${loop[0][0] + jitter()} ${loop[0][1] + jitter()}`;
    for (let i = 1; i < loop.length; i++) {
      const [x0, y0] = loop[i - 1],
        [x1, y1] = loop[i];
      const last = i === loop.length - 1;
      const [ex, ey] = last
        ? [x0 + (x1 - x0) * 0.12, y0 + (y1 - y0) * 0.12]
        : [x1, y1];
      d += ` Q${(x0 + ex) / 2 + jitter()} ${(y0 + ey) / 2 + jitter()} ${ex + jitter() * 0.4} ${ey + jitter() * 0.4}`;
    }
    return d;
  };
  svg.innerHTML = Object.entries(OUTLINES)
    .map(
      ([step, points], i) =>
        `<g class="prologue-outline" data-for="${step}">${["ink-dark", "ink-white", "ink-over"].map((c) => `<path class="${c}" pathLength="1" d="${hand(points, 7 + i * 13)}" />`).join("")}</g>`,
    )
    .join("");
  return svg;
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

  let open = false,
    then = null;
  // each button acts once: a second press, or Esc after it, does nothing
  const act = () => {
    const after = then;
    if (!open || !after) return;
    then = null;
    after();
  };
  const show = (doc, options, label, after) => {
    open = true;
    then = after;
    renderLetter(sheet, doc, options);
    go.textContent = label;
    reading.hidden = false;
    sheet.scrollTop = 0;
    reading.scrollTop = 0;
    requestAnimationFrame(() => {
      reading.classList.add("is-shown");
      // too long for the screen: it scrolls, and its foot fades to say so
      sheet.classList.toggle(
        "is-long",
        sheet.scrollHeight > sheet.clientHeight + 2,
      );
    });
    go.focus({ preventScroll: true });
  };
  const hide = () => {
    open = false;
    then = null;
    reading.classList.remove("is-shown");
    scope.later(() => {
      if (!open) reading.hidden = true;
    }, 500);
  };
  scope.on(go, "click", act);
  scope.on(window, "keydown", (event) => {
    if (open && event.key === "Escape") {
      event.preventDefault();
      act();
    }
  });
  return {
    show,
    hide,
    get open() {
      return open;
    },
  };
}
