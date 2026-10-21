import { soft } from "../../shared/paint.js";
import "./nurseryPortrait.css";

export const NURSERY_PORTRAIT = {
  key: "room6_botanical_family_portrait_night_v5",
  url: "assets/images/Room6/botanical-family-portrait-night-v5.webp",
};

const CROP = { x: 25, y: 47, width: 974, height: 1440 };
const FRAME = { x: 886, y: 194, width: 142, height: 142 * CROP.height / CROP.width };

export function nurseryPortraitBounds(L) {
  return { x: FRAME.x * L.W / 1659, y: FRAME.y * L.H / 948,
    width: FRAME.width * L.W / 1659, height: FRAME.height * L.H / 948 };
}

function drawPortrait(ctx, photo, x, y, width, height) {
  const sx = photo.width / 1024, sy = photo.height / 1536;
  ctx.drawImage(photo, CROP.x*sx, CROP.y*sy, CROP.width*sx, CROP.height*sy, x, y, width, height);
}

// Its full portrait frame and the wall's clickable area share one placement.
export function paintNurseryPortrait(ctx, L, scene) {
  if (!scene.textures.exists(NURSERY_PORTRAIT.key)) return;
  const photo = scene.textures.get(NURSERY_PORTRAIT.key).getSourceImage();
  const { x, y, width, height } = nurseryPortraitBounds(L);
  ctx.save();
  soft(ctx, x + width / 2 + 3, y + height / 2 + 4,
    width * .56, height * .57, "0,0,0", .5);
  ctx.filter = "brightness(.56) saturate(.98)";
  drawPortrait(ctx, photo, x, y, width, height);
  ctx.restore();
}

// A native modal keeps focus and pointer input off the house while the
// photograph is being examined. It belongs to this visit to Room VI.
export function createNurseryPortraitViewer(scene) {
  const dialog = document.createElement("dialog");
  dialog.className = "nursery-portrait-viewer";
  dialog.setAttribute("aria-label", "Ivy and Rose Ashcombe · 1959");
  const canvas = document.createElement("canvas");
  canvas.className = "nursery-portrait-image";
  canvas.width = CROP.width; canvas.height = CROP.height;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Ivy and Rose Ashcombe, 1959");
  const photo = scene.textures.get(NURSERY_PORTRAIT.key).getSourceImage();
  drawPortrait(canvas.getContext("2d"), photo, 0, 0, canvas.width, canvas.height);
  const button = document.createElement("button");
  button.type = "button"; button.className = "nursery-portrait-close"; button.textContent = "×";
  const localize = () => button.setAttribute("aria-label", scene.services.i18n?.t("common.close") || "Close");
  localize();
  const offLocale = scene.services.i18n?.subscribe(localize);
  dialog.append(canvas, button); document.body.append(dialog);
  let inputBefore = true, holdingInput = false, opener = null;
  function restore(focus = true) {
    if (!holdingInput) return;
    holdingInput = false; scene.input.enabled = inputBefore;
    if (focus && opener?.isConnected) opener.focus({ preventScroll: true });
  }
  function close(focus = true) {
    if (dialog.open) dialog.close();
    restore(focus);
  }
  button.addEventListener("click", () => close());
  dialog.addEventListener("click", event => {
    event.stopPropagation();
    if (event.target === dialog) close();
  });
  dialog.addEventListener("keydown", event => {
    event.stopPropagation();
    if (event.key === "Escape") { event.preventDefault(); close(); }
  });
  dialog.addEventListener("cancel", event => { event.preventDefault(); close(); });
  dialog.addEventListener("close", () => { if (!dialog.open) restore(); });
  return {
    get isOpen() { return dialog.open; },
    open() {
      if (dialog.open) return;
      opener = document.activeElement;
      inputBefore = scene.input.enabled; holdingInput = true; scene.input.enabled = false;
      scene.game.canvas.style.cursor = "";
      scene.game.events.emit("puzzle:interaction", { label: "" });
      dialog.showModal(); button.focus();
      if (!scene.reducedMotion) canvas.animate([{ opacity: .45 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
    },
    dispose() { close(false); offLocale?.(); dialog.remove(); },
  };
}
