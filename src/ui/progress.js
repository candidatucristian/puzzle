import { RoomPreviewStore } from "../core/RoomPreviewStore.js";
import { toRoman } from "./transitions.js";
import { paintKey } from "../shared/keyArt.js";
import { waxSeal } from "./seal.js";

// each seal sits a little askew, never twice the same way
const tilt = (n) => `${((n * 37) % 23) - 11}deg`;

export function mountProgress(scope, { game, levels, storage, i18n = null }) {
  const grid = document.getElementById("levels-grid");
  const previews = new RoomPreviewStore(storage, levels.definitions);
  const tiles = [];
  let captureTimer,
    captureGeneration = 0,
    shown = false;
  // what was already sealed when last drawn: only a new seal is pressed
  const sealedRooms = new Set();
  grid.replaceChildren();
  grid.setAttribute("role", "list");
  levels.definitions.forEach((level, index) => {
    // a line of the index, not a control: it says what is here and whether
    // it is solved; the way to a puzzle is the thing itself, in its room
    const tile = document.createElement("div");
    tile.setAttribute("role", "listitem");
    tile.dataset.levelId = level.id;
    const preview = document.createElement("img");
    preview.className = "level-preview";
    preview.alt = "";
    preview.hidden = true;
    const number = document.createElement("span");
    number.className = "level-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const caption = document.createElement("span");
    caption.className = "level-caption";
    const name = document.createElement("span");
    name.className = "level-name";
    const status = document.createElement("span");
    status.className = "level-status";
    caption.append(name, status);
    const check = document.createElement("span");
    check.className = "level-check";
    check.setAttribute("aria-hidden", "true");
    check.append(waxSeal(index + 1));
    check.style.setProperty("--tilt", tilt(index + 1));
    tile.append(preview, number, caption, check);
    grid.append(tile);
    tiles.push({ tile, preview, check, number, name, status, sealed: false });
  });

  function render() {
    const near = levels.nearby;
    const placeData =
      i18n && levels.place ? i18n.getPlace(levels.place.key) : null;
    const currentPlaceName = placeData?.name ?? near.name;
    const currentFloorName = placeData?.floor ?? levels.floor;
    const currentStory = placeData?.story?.length
      ? placeData.story
      : near.story;

    const lockedText = i18n ? i18n.t("common.locked") : "Locked";
    const solvedText = i18n ? i18n.t("common.solved") : "Solved";
    const currentText = i18n
      ? i18n.t("common.exploring")
      : "Currently exploring";
    const notSolvedText = i18n ? i18n.t("common.notSolved") : "Not solved yet";

    // the puzzles are numbered as they stand in the place, from 01
    const order = levels.definitions
      .map((_, index) => index)
      .filter((index) => near.indexes.includes(index));
    levels.definitions.forEach((level, index) => {
      const item = tiles[index],
        { tile, preview, check, number, name, status } = item;
      const place = order.indexOf(index) + 1;
      if (place) number.textContent = String(place).padStart(2, "0");
      const allowed = levels.canAccess(index),
        solved = levels.isCompleted(index),
        current = !levels.place && index === levels.currentIndex;
      tile.hidden = !near.indexes.includes(index);
      tile.className = `level-btn ${allowed ? (current ? "current" : "unlocked") : "locked"}`;
      tile.classList.toggle("solved", solved);
      // solved just now: the seal is pressed on
      if (solved && !item.sealed && shown) press(tile);
      item.sealed = solved;
      name.textContent = allowed ? level.name : lockedText;
      status.textContent = !allowed
        ? lockedText
        : solved
          ? solvedText
          : current
            ? currentText
            : notSolvedText;
      tile.setAttribute(
        "aria-label",
        `Puzzle ${place || index + 1}: ${allowed ? level.name : lockedText}${solved ? ` — ${solvedText.toLowerCase()}` : ""}${current ? ` — ${currentText.toLowerCase()}` : ""}`,
      );
      if (current) tile.setAttribute("aria-current", "step");
      else tile.removeAttribute("aria-current");
      tile.title = allowed
        ? `${level.name}${solved ? ` · ${solvedText}` : ""}`
        : i18n
          ? i18n.t("sidebar.roomLocked")
          : "Solve the previous room to unlock";
      check.hidden = !solved;
      const source = allowed && previews.get(level.id);
      if (source && preview.getAttribute("src") !== source)
        preview.src = source;
      preview.hidden = !source;
      tile.classList.toggle("has-preview", Boolean(source));
    });
    const done = levels.completedCount;
    // where the place has doors rather than puzzles, the index lists the
    // rooms behind them, each ticked once everything in it is solved
    for (const old of grid.querySelectorAll(".room-row")) old.remove();
    levels.rooms.forEach((room, n) => {
      const row = document.createElement("div");
      row.className = `level-btn room-row ${room.locked ? "locked" : "unlocked"}${room.solved ? " solved" : ""}`;
      row.setAttribute("role", "listitem");
      row.setAttribute(
        "aria-label",
        `${room.name}${room.locked ? ` — ${lockedText.toLowerCase()}` : room.solved ? ` — ${solvedText.toLowerCase()}` : ""}`,
      );
      const number = document.createElement("span");
      number.className = "level-number";
      number.textContent = String(n + 1).padStart(2, "0");
      const caption = document.createElement("span");
      caption.className = "level-caption";
      const name = document.createElement("span");
      name.className = "level-name";
      name.textContent = room.name;
      const status = document.createElement("span");
      status.className = "level-status";
      status.textContent = room.locked
        ? lockedText
        : room.solved
          ? solvedText
          : notSolvedText;
      caption.append(name, status);
      const check = document.createElement("span");
      check.className = "level-check";
      check.setAttribute("aria-hidden", "true");
      check.hidden = !room.solved;
      check.append(waxSeal(n + 31));
      check.style.setProperty("--tilt", tilt(n + 31));
      row.append(number, caption, check);
      grid.append(row);
      if (room.solved && shown && !sealedRooms.has(room.name)) press(row);
      if (room.solved) sealedRooms.add(room.name);
    });
    // under the list, the few lines of story for where the player is
    const story = document.getElementById("index-story");
    story.replaceChildren(
      ...currentStory.map((line) =>
        Object.assign(document.createElement("p"), { textContent: line }),
      ),
    );
    // a finished room says so, in place of its story
    story.hidden = currentStory.length === 0 || near.completed;
    document.getElementById("index-notes").hidden = story.hidden;
    const finished = document.getElementById("index-done");
    if (near.completed && finished.hidden && shown) press(finished);
    finished.hidden = !near.completed;
    // under the story, the keys found so far, each with the door it is for
    const ring = document.getElementById("index-keys");
    const held = levels.keys;
    if (ring.dataset.held !== held.map((item) => item.key).join()) {
      ring.dataset.held = held.map((item) => item.key).join();
      ring.replaceChildren(
        ...held.map((item) => {
          const figure = document.createElement("figure");
          const caption = document.createElement("figcaption");
          const keyLabel = i18n ? i18n.t("sidebar.keyFound") : "Key found";
          const keyUnlocks = i18n
            ? i18n.t("sidebar.keyUnlocks", { door: toRoman(item.door) })
            : `This key unlocks door ${toRoman(item.door)}`;
          caption.append(
            Object.assign(document.createElement("span"), {
              className: "key-label",
              textContent: keyLabel,
            }),
            keyUnlocks,
          );
          const picture = paintKey();
          picture.setAttribute("role", "img");
          picture.setAttribute(
            "aria-label",
            `The key to door ${toRoman(item.door)}`,
          );
          figure.append(caption, picture);
          return figure;
        }),
      );
    }
    ring.hidden = held.length === 0;
    // outside: how far into the house the player has got, if anywhere
    const far = document.getElementById("outside-progress");
    if (far) {
      const lines = [];
      if (done) {
        const puzzleText = i18n
          ? i18n.t("sidebar.puzzlesSolved", {
              count: done,
              word:
                done === 1
                  ? i18n.t("sidebar.puzzleWordSingular")
                  : i18n.t("sidebar.puzzleWordPlural"),
            })
          : `${done} ${done === 1 ? "puzzle" : "puzzles"} solved`;
        lines.push([puzzleText, true]);
      }
      if (held.length) {
        const keyText = i18n
          ? i18n.t("sidebar.keysPocket", {
              count: held.length,
              word:
                held.length === 1
                  ? i18n.t("sidebar.keyWordSingular")
                  : i18n.t("sidebar.keyWordPlural"),
            })
          : `${held.length} ${held.length === 1 ? "key" : "keys"} in your pocket`;
        lines.push([keyText, false]);
      }
      far.replaceChildren(
        ...lines.map(([words, sealed]) => {
          const line = document.createElement("p");
          if (sealed) {
            const mark = document.createElement("span");
            mark.className = "outside-seal";
            mark.append(waxSeal(3));
            line.append(mark);
          }
          line.append(words);
          return line;
        }),
      );
      far.hidden = lines.length === 0;
    }
    const here = near.indexes.filter((index) =>
      levels.isCompleted(index),
    ).length;
    // a count only where there is something to count
    document.getElementById("progress-count").hidden =
      near.indexes.length === 0;
    document.getElementById("room-progress").hidden = near.indexes.length === 0;
    document.getElementById("progress-count").textContent =
      `${here} / ${near.indexes.length} ${solvedText.toLowerCase()}`;
    // where you are, at the head of the side panel, as a film's lower third:
    // the floor's numeral in a fine square, a hairline, the place's name over
    // its floor's; a light passing once over it as it comes
    const floor = document.getElementById("header-floor");
    const storey = `Floor ${String(levels.storey).padStart(2, "0")}`;
    if (
      floor.dataset.shown !==
      `${currentPlaceName} ${storey} ${currentFloorName}`
    ) {
      floor.dataset.shown = `${currentPlaceName} ${storey} ${currentFloorName}`;
      const el = (tag, className, textContent = "") =>
        Object.assign(document.createElement(tag), { className, textContent });
      const below = /basement|cellar/i.test(currentFloorName);
      const words = el("span", "floor-words");
      words.append(el("span", "floor-name", currentPlaceName));
      // the floor's name under it — but not in its own hall, named for it
      if (
        !currentPlaceName
          .toLowerCase()
          .includes(String(currentFloorName).toLowerCase())
      )
        words.append(el("span", "floor-where", currentFloorName));
      floor.replaceChildren(
        el("span", "floor-numeral", below ? "B" : toRoman(levels.storey)),
        el("span", "floor-rule"),
        words,
      );
      floor.classList.remove("is-arriving");
      void floor.offsetWidth; // so the arrival plays again
      floor.classList.add("is-arriving");
    }
    floor.setAttribute(
      "aria-label",
      `${currentPlaceName}, ${storey}, ${currentFloorName}`,
    );
    // the way back: out of a puzzle to where it was found, out of a room to the hall
    const leave = document.getElementById("btn-leave"),
      back = levels.back;
    // from the hall, back is outside
    leave.hidden = !back && !levels.place;
    const leaveWord = leave.querySelector(".leave-word");
    if (leaveWord) {
      const lineSvg = leaveWord.querySelector(".leave-line");
      leaveWord.textContent = i18n ? i18n.t("common.back") : "Back";
      if (lineSvg) leaveWord.append(lineSvg);
    }
    // it says only "Back"; where it leads is in its tooltip
    if (!back) {
      leave.setAttribute("aria-label", "Back outside");
      leave.dataset.tip = "Back outside (Esc)";
    }
    if (back) {
      const backPlace = i18n ? i18n.getPlace(back.key) : null;
      const backName = backPlace?.name ?? back.name;
      leave.setAttribute(
        "aria-label",
        `Back to ${backName.replace(/^The /, "the ")}`,
      );
      leave.dataset.tip = `${leave.getAttribute("aria-label")} (Esc)`;
    }
    const meter = document.getElementById("room-progress");
    meter.max = near.indexes.length;
    meter.value = here;
    const save = document.getElementById("save-status");
    save.textContent = levels.saved
      ? "Saved on this device"
      : "Progress kept for this session only";
    save.dataset.state = levels.saved ? "saved" : "temporary";
    save.title = levels.saved
      ? "Progress is saved in this browser. Clearing site data removes it."
      : "Browser storage is unavailable. Progress may be lost when this page closes.";
    shown = true;
  }

  function press(node) {
    node.classList.remove("sealing");
    void node.offsetWidth;
    node.classList.add("sealing");
    scope.later(() => node.classList.remove("sealing"), 1400);
  }
  // the seal of a finished room, under its list
  const mark = document.querySelector("#index-done .done-mark");
  if (mark) {
    mark.replaceChildren(waxSeal(7));
    mark.style.setProperty("--tilt", "-8deg");
  }

  function scheduleCapture() {
    scope.cancel(captureTimer);
    const generation = ++captureGeneration;
    const index = levels.currentIndex,
      level = levels.definitions[index];
    if (!levels.canAccess(index) || previews.get(level.id)) return;
    let tries = 0;
    function capture() {
      if (scope.closed || generation !== captureGeneration) return;
      const scene = levels.activeScene;
      if (!scene || scene.scene.key !== level.key) {
        if (++tries < 12) captureTimer = scope.later(capture, 500);
        return;
      }
      const save = (image) => {
        if (
          scope.closed ||
          generation !== captureGeneration ||
          !(
            image instanceof HTMLImageElement ||
            image instanceof HTMLCanvasElement
          )
        )
          return;
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 160;
          canvas.height = 104;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          if (previews.set(level.id, canvas.toDataURL("image/webp", 0.65)))
            render();
        } catch {
          /* Optional previews must never interrupt play or saving. */
        }
      };
      if (scene.previewSource) save(scene.previewSource);
      else game.renderer.snapshot(save);
    }
    captureTimer = scope.later(capture, 1800);
  }
  // the floor's name stands over the middle of the picture, not of the window
  scope.add(
    levels.subscribe(() => {
      render();
      scheduleCapture();
    }),
  );
  if (i18n)
    scope.add(
      i18n.subscribe(() => {
        sealedRooms.clear();
        render();
      }),
    );
  scope.add(() => {
    captureGeneration++;
  });
  render();
  return {
    render,
    reset() {
      previews.reset();
      captureGeneration++;
      scope.cancel(captureTimer);
      render();
    },
  };
}
