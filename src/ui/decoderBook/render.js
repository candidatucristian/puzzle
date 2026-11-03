import { BOOK_TITLE, BOOK_SOURCES, getBookCopy } from './copy.js';

export const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

function spiralSVG(label, cover = false) {
  const squares = [[0,0,1],[1,0,1],[0,-2,2],[-3,-2,3],[-3,1,5],[2,-2,8]];
  return `<svg class="db-spiral ${cover ? 'db-spiral-cover' : ''}" viewBox="-3.3 -2.3 13.6 8.6" role="img" aria-label="${escapeHTML(label)}">
    ${squares.map(([x,y,size], index) => `<rect x="${x}" y="${y}" width="${size}" height="${size}" class="db-square db-square-${index}"/>${cover ? '' : `<text x="${x + size * .52}" y="${y + size * .63}" font-size="${Math.max(.27, size * .2)}">${size}</text>`}`).join('')}
    <path d="M 0 0 A 1 1 0 0 0 1 1 A 1 1 0 0 0 2 0 A 2 2 0 0 0 0 -2 A 3 3 0 0 0 -3 1 A 5 5 0 0 0 2 6 A 8 8 0 0 0 10 -2"/>
  </svg>`;
}

function reference(index) {
  return `<a class="db-reference" href="${BOOK_SOURCES[index - 1].url}" target="_blank" rel="noopener noreferrer">[${index}]</a>`;
}

export function renderChapter(language = 'en') {
  const c = getBookCopy(language), e = escapeHTML;
  const footer = n => `<footer class="db-page-footer"><span>${BOOK_TITLE} · Fibonacci</span><span>01 / ${String(n).padStart(2,'0')}</span></footer>`;
  const header = (eyebrow, title) => `<header class="db-section-header"><p class="db-eyebrow">${e(eyebrow)}</p><h2>${e(title)}</h2></header>`;
  const leaves = [1,1,2,3,5], totals = [1,2,4,7,12];
  return `<article class="db-document" lang="${e(language)}">
    <section class="db-page db-certificate" data-db-page="0" aria-label="${e(c.ui.pageNames[0])}">
      <div class="db-cover-heading"><p class="db-eyebrow">ASHCOMBE MANOR · ${e(c.ui.chapter)}</p><h2 class="db-book-name">${BOOK_TITLE}</h2><p class="db-cover-subtitle">${e(c.cover.eyebrow)}</p></div>
      <div class="db-cover-centre"><div class="db-edition">01</div><p class="db-award-name">${e(c.award)}</p><h3 class="db-fibonacci-title">Fibonacci</h3><p class="db-cover-theme">${e(c.cover.subtitle)}</p>
      ${spiralSVG(c.visual.diagram, true)}
      <p class="db-certificate-statement">${e(c.cover.statement)}</p>
      <div class="db-skills">${c.cover.skills.map(skill => `<span>${e(skill)}</span>`).join('<i aria-hidden="true">·</i>')}</div></div>
      <div class="db-certificate-record"><div><span>${e(c.cover.puzzle)}</span><strong>${e(c.level)}</strong></div><div><span>${e(c.cover.answer)}</span><strong>FIBO / FIBONACCI</strong></div></div>
      <p class="db-cover-note">${e(c.cover.note)}</p>${footer(1)}
    </section>
    <section class="db-page" data-db-page="1" aria-label="${e(c.ui.pageNames[1])}">
      ${header(c.solve.eyebrow, c.solve.title)}
      <p class="db-intro">${e(c.solve.intro)}</p>
      <div class="db-observed-sequence" aria-label="1, 1, 2, 3, 5">${leaves.map((n,i) => `<div><span>${String(i+1).padStart(2,'0')}</span><strong>${n}</strong></div>`).join('')}</div>
      <table class="db-count-table"><thead><tr>${c.solve.headers.map(text => `<th scope="col">${e(text)}</th>`).join('')}</tr></thead><tbody>${leaves.map((n,i) => `<tr><th scope="row">${i+1}</th><td>${n}</td><td>${totals[i]}</td></tr>`).join('')}</tbody></table>
      <ol class="db-solve-steps">${c.solve.steps.map(([title,body],i) => `<li><span class="db-step-number">${String(i+1).padStart(2,'0')}</span><div><h3>${e(title)}</h3><p>${e(body)}</p></div></li>`).join('')}</ol>
      <aside class="db-note"><h3>${e(c.solve.distinction)}</h3><p>${e(c.solve.distinctionText)}</p></aside>
      <p class="db-takeaway">${e(c.solve.takeaway)}</p>${footer(2)}
    </section>
    <section class="db-page" data-db-page="2" aria-label="${e(c.ui.pageNames[2])}">
      ${header(c.math.eyebrow, c.math.title)}
      <p class="db-intro">${e(c.math.rule)}</p>
      <div class="db-equation" aria-label="F n equals F n minus one plus F n minus two">Fₙ = Fₙ₋₁ + Fₙ₋₂</div>
      <p>${e(c.math.definition)} ${reference(2)}</p>
      <p class="db-small-label">${e(c.math.first)}</p><p class="db-number-line">0 · 1 · 1 · 2 · 3 · 5 · 8 · 13 · 21 · 34 · 55</p>
      <div class="db-additions"><span>1 + 1 = <b>2</b></span><span>1 + 2 = <b>3</b></span><span>2 + 3 = <b>5</b></span><span>3 + 5 = <b>8</b></span></div>
      <div class="db-two-columns"><div><h3>${e(c.math.historyTitle)}</h3><p>${e(c.math.history)} ${reference(1)} ${reference(2)}</p></div><div><h3>${e(c.math.calculateTitle)}</h3><p>${e(c.math.calculate)}</p><pre>${e(c.math.code.join('\n'))}</pre><p class="db-caption">${e(c.math.codeNote)}</p></div></div>
      <aside class="db-note"><p>${e(c.math.reason)}</p></aside>${footer(3)}
    </section>
    <section class="db-page db-visual-page" data-db-page="3" aria-label="${e(c.ui.pageNames[3])}">
      ${header(c.visual.eyebrow, c.visual.title)}
      <figure class="db-pattern">${spiralSVG(c.visual.diagram)}<figcaption>${e(c.visual.diagram)}</figcaption></figure>
      <p class="db-caption">${e(c.visual.spiral)} ${reference(3)}</p>
      <div class="db-two-columns"><div><h3>${e(c.visual.ratioTitle)}</h3><p>${e(c.visual.ratio)} ${reference(2)}</p><p class="db-ratios">5/3 → 8/5 → 13/8 → 21/13</p></div><div><h3>${e(c.visual.natureTitle)}</h3><p>${e(c.visual.nature)}</p></div></div>
      <section class="db-practice"><h3>${e(c.visual.practiceTitle)}</h3>${c.visual.practice.map(([question,answer]) => `<p><strong>${e(question)}</strong><br>${e(answer)}</p>`).join('')}</section>
      <div class="db-sources"><h3>${e(c.visual.sources)}</h3><ol>${BOOK_SOURCES.map(source => `<li><a href="${source.url}" target="_blank" rel="noopener noreferrer">${e(source.title)}</a></li>`).join('')}</ol></div>${footer(4)}
    </section>
  </article>`;
}
