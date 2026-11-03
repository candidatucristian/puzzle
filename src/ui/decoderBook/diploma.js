import { escapeHTML } from './render.js';
import { getBookCopy } from './copy.js';
import { earnedDate, getRewardCopy } from './rewardCopy.js';
import manorArt from './manorArt.json';

export const DIPLOMA_WIDTH = 760;
export const DIPLOMA_HEIGHT = 538;
export const rewardAsset = file => `${import.meta.env.BASE_URL}assets/images/DecoderBook/v3/${file}`;

export function recipientFontSize(name) {
  const context = document.createElement('canvas').getContext('2d');
  context.font = '37px "Cormorant Garamond",Georgia,serif';
  return Math.min(37, 37 * 610 / Math.max(1, context.measureText(name).width));
}

export function diplomaText(entry, language) {
  const c = getRewardCopy(language), book = getBookCopy(language);
  return {
    brand: "Decoder's Book", archive: c.archive, certificate: c.certificate,
    title: 'Fibonacci', award: book.award, presented: c.presented,
    name: entry.recipientName || c.placeholder, recognition: c.recognition,
    qualities: c.qualities, issued: c.issued, date: earnedDate(entry, language),
    reference: c.reference, serial: entry.certificateId,
  };
}

export function diplomaInk(entry, language) {
  const t = diplomaText(entry, language), e = escapeHTML;
  const size = recipientFontSize(t.name);
  return `<div class="decoder-ink" lang="${e(language)}">
    <p class="di-brand">${e(t.brand)}</p><p class="di-archive">${e(t.archive)}</p>
    <p class="di-certificate">${e(t.certificate)}</p><h3 class="di-title">${t.title}</h3>
    <p class="di-award">${e(t.award)}</p><p class="di-presented">${e(t.presented)}</p>
    <p class="di-name${entry.recipientName ? '' : ' di-placeholder'}" style="font-size:${size}px">${e(t.name)}</p>
    <p class="di-recognition">${e(t.recognition)}</p><p class="di-qualities">${e(t.qualities)}</p>
    <div class="di-date"><span>${e(t.issued)}</span><strong>${e(t.date)}</strong></div>
    <div class="di-reference"><span>${e(t.reference)}</span><strong>${e(t.serial)}</strong></div>
  </div>`;
}

/** The logical ink sheet stays aligned with the photographed A4 stock on resize. */
export function mountDiploma(container, entry, language) {
  let alive = true, current = entry, locale = language;
  container.classList.add('decoder-diploma');
  const frame = manorArt.diplomaFrame;
  container.style.aspectRatio = `${frame.width} / ${frame.height}`;
  container.innerHTML = `<img class="decoder-stock" src="${rewardAsset('diploma-display.webp')}" alt="" draggable="false"><div class="decoder-ink-mount"></div>`;
  const mount = container.querySelector('.decoder-ink-mount');
  const resize = () => {
    const scale = container.clientWidth / frame.width, [p0, p1, , p3] = frame.paperQuad;
    mount.style.transform = `matrix(${(p1[0] - p0[0]) * scale / DIPLOMA_WIDTH},${(p1[1] - p0[1]) * scale / DIPLOMA_WIDTH},${(p3[0] - p0[0]) * scale / DIPLOMA_HEIGHT},${(p3[1] - p0[1]) * scale / DIPLOMA_HEIGHT},${p0[0] * scale},${p0[1] * scale})`;
  };
  const observer = new ResizeObserver(resize); observer.observe(container);
  const update = (next, nextLanguage) => { current = next; locale = nextLanguage; mount.innerHTML = diplomaInk(next, nextLanguage); resize(); };
  update(entry, language);
  void document.fonts.ready.then(() => { if (alive) update(current, locale); });
  return { update, dispose: () => { alive = false; observer.disconnect(); } };
}
