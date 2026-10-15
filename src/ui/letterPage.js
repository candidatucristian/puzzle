import { letterSheet } from "../shared/envelope.js";

// A letter laid out to be read: on the house's own letter paper (the ROTOR
// letter, shared/envelope.js), painted behind the words to the size they
// need. The case file, the prologue and a letter's arrival all read it so.

/** Lays a letter out on its paper in `host`: its dateline, its words, its
 *  signature, on a sheet the size the words need. */
export function renderLetter(host, letter, { note = "" } = {}) {
  host.replaceChildren();
  const page = document.createElement("article");
  page.className = "letter-page";
  const paper = document.createElement("canvas");
  paper.className = "letter-paper";
  paper.setAttribute("aria-hidden", "true");
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
  page.append(paper, words);
  host.append(page);
  // the paper, painted to fit once the words have taken their room
  requestAnimationFrame(() => {
    const w = Math.round(page.clientWidth), h = Math.round(page.clientHeight);
    if (!w || !h) return;
    const sheet = letterSheet(w, h), m = (sheet.width - w) / 2;
    paper.width = sheet.width; paper.height = sheet.height;
    paper.getContext("2d").drawImage(sheet, 0, 0);
    paper.style.left = paper.style.top = `${-m}px`;
    paper.style.width = `${sheet.width}px`; paper.style.height = `${sheet.height}px`;
  });
  return page;
}
