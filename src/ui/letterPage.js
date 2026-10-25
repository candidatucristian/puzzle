import { letterSheet, paintSeal } from "../shared/envelope.js";
import { loadDocumentArt, paintDocumentSeal } from "./documentArt.js";

// Live words on a physical sheet. The paper stays inside the article's box;
// its soft shadow is visual only and must not create a second scroll axis.

/** Lays a letter out on its paper in `host`: its dateline, its words, its
 *  signature, on a sheet the size the words need — sealed in wax, unless it
 *  is a document that never was (`seal: false`). Filed letters can share the
 *  dossier's sheet with `paper: false`, without loading or painting another. */
export function renderLetter(host, letter, { note = "", seal: sealed = true, paper: textured = true, materials } = {}) {
  host.replaceChildren();
  const page = document.createElement("article");
  page.className = "letter-page";
  const paper = document.createElement("canvas");
  paper.className = "letter-paper";
  paper.setAttribute("aria-hidden", "true");
  const wax = document.createElement("canvas");
  wax.className = "letter-wax";
  wax.width = wax.height = 160;
  wax.setAttribute("aria-hidden", "true");
  const words = document.createElement("div");
  words.className = "letter-words";
  const add = (tag, cls, text) => {
    if (!text) return;
    const el = document.createElement(tag);
    el.className = cls; el.textContent = text;
    words.append(el);
  };
  add("p", "letter-note", note);
  add("p", "letter-dateline", letter.dateline);
  add("p", "letter-salutation", letter.salutation);
  for (const para of letter.body) add("p", "letter-para", para);
  add("p", "letter-signature", letter.signature);
  add("p", "letter-ps", letter.postscript);
  // and under it, in pencil, in his own hand: what Arthur makes of it
  add("p", "letter-margin", letter.margin);
  if (textured) page.append(paper);
  page.append(words);
  if (sealed) page.append(wax);
  host.append(page);
  if (!textured && !sealed) { page.dataset.material = "filed"; return page; }
  // the paper, painted to fit once the words have taken their room
  const paint = (art = null) => {
    if (!page.isConnected) return;
    const w = Math.round(page.clientWidth), h = Math.round(page.clientHeight);
    if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (textured) {
      paper.width = Math.round(w * dpr); paper.height = Math.round(h * dpr);
      const surface = paper.getContext("2d");
      if (art?.paper) {
        surface.drawImage(art.paper, 0, 0, paper.width, paper.height);
      } else {
        const sheet = letterSheet(w, h, { noSeal: true }), margin = (sheet.width - w) / 2;
        surface.drawImage(sheet, margin, margin, w, h, 0, 0, paper.width, paper.height);
      }
    }
    if (sealed) {
      const g = wax.getContext("2d"), seal = { x: 80, y: 80, rx: 65, ry: 65 };
      g.clearRect(0, 0, 160, 160);
      if (!paintDocumentSeal(g, seal)) paintSeal(g, seal, { wax: "#a4251b", shine: true });
    }
    page.dataset.material = art?.paper && (!sealed || art?.wax) ? "ready" : "fallback";
  };
  requestAnimationFrame(() => paint(materials));
  if (materials === undefined) loadDocumentArt().then(art => requestAnimationFrame(() => paint(art)));
  return page;
}
