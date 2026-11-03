import { BOOK_TITLE, getBookCopy } from './copy.js';
import { escapeHTML, renderChapter } from './render.js';
import { earnedDate, getRewardCopy } from './rewardCopy.js';
import { mountDiploma, rewardAsset } from './diploma.js';
import { makeDiplomaPDF } from './diplomaPdf.js';
import { mountRewardDelivery, prepareRewardDelivery } from './delivery.js';
import './diploma.css';
import './document.css';
import './reader.css';

export function mountDecoderBook(scope, { game, achievements, levels, storage, dialogs, i18n, preferences, sounds, isBusy, visitLevel }) {
  if (!achievements) return;
  let language = i18n?.language ?? 'en';
  let tab = 'diploma', downloading = false, activeDiploma, pendingAward, announcing = false, delivering = null;
  const seenKey = 'decoderBook:seen';
  let seen;
  try { const saved = JSON.parse(storage.getItem(seenKey)); seen = new Set(Array.isArray(saved) ? saved : []); }
  catch { seen = new Set(); }
  const downloads = new Set(), e = escapeHTML;
  const button = document.createElement('button');
  button.id = 'btn-decoder-book'; button.type = 'button';
  button.className = 'header-button decoder-book-button';
  button.innerHTML = `<img class="decoder-header-icon" src="${rewardAsset('folio-closed.webp')}" alt="" draggable="false"><span class="decoder-button-label"></span><small class="decoder-count" aria-hidden="true" hidden>1</small>`;
  document.getElementById('btn-casefile')?.after(button);

  const modal = document.createElement('div');
  modal.id = 'decoder-book-modal'; modal.className = 'decoder-modal hidden';
  modal.innerHTML = `<div class="decoder-library">
    <header class="decoder-header"><div><p class="decoder-overline" data-db-collection></p><h2>${BOOK_TITLE}</h2></div>
      <button type="button" id="decoder-book-close" class="decoder-close">×</button>
    </header>
    <div class="decoder-body"><aside class="decoder-sidebar">
      <img class="decoder-bound-volume" src="${rewardAsset('folio-closed.webp')}" alt="" draggable="false">
      <div class="decoder-chapter-heading"><p class="decoder-overline" data-db-chapter></p><h3 data-db-chapter-name></h3><p class="decoder-award" data-db-award-name></p></div>
      <nav class="decoder-tabs" aria-label="Decoder's Book"><button type="button" data-db-tab="diploma" aria-controls="decoder-book-reader"></button><button type="button" data-db-tab="notes" aria-controls="decoder-book-reader"></button></nav>
      <p class="decoder-overline decoder-pages-heading" data-db-pages-heading></p><nav class="decoder-page-nav" data-db-pages></nav><button type="button" class="decoder-replay" data-db-replay></button>
    </aside><section class="decoder-reading"><div class="decoder-toolbar"><p class="decoder-overline" data-db-view></p><div class="decoder-downloads"><button type="button" data-db-download="diploma"></button><button type="button" data-db-download="chapter"></button></div></div>
      <p class="decoder-error" role="alert" data-db-error></p><div class="decoder-reader" id="decoder-book-reader" tabindex="0"></div>
    </section></div>
  </div>`;
  document.body.append(modal);
  const $ = selector => modal.querySelector(selector), reader = $('.decoder-reader');
  modal.style.setProperty('--decoder-notes-stock', `url("${rewardAsset('notes-stock.webp')}")`);
  const status = document.createElement('p'); status.className = 'decoder-sr'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); document.body.append(status);
  function badge(pop = false) {
    const r = getRewardCopy(language), unread = achievements.entries.filter(entry => !seen.has(entry.id) && entry.id !== delivering).length;
    button.querySelector('.decoder-button-label').textContent = r.achievements;
    const mark = button.querySelector('.decoder-count'); mark.textContent = String(unread); mark.hidden = !unread;
    button.title = `${r.achievements} · ${BOOK_TITLE}${unread ? ` · ${r.unread}: ${unread}` : ''}`;
    button.setAttribute('aria-label', button.title); button.classList.toggle('has-news', unread > 0);
    if (pop && !preferences?.reducedMotion) {
      button.animate([{ transform: 'none' }, { transform: 'translateY(-2px)', offset: .45 }, { transform: 'none' }], { duration: 360, easing: 'ease-out' });
      mark.animate([{ transform: 'scale(.35)' }, { transform: 'scale(1.14)', offset: .65 }, { transform: 'scale(1)' }], { duration: 340, easing: 'ease-out' });
    }
  }
  const delivery = mountRewardDelivery(scope, { target: button, preferences, sounds,
    isObscured: () => dialogs.isOpen || isBusy() || document.body.classList.contains('outside'), onLand: () => {
    delivering = null; badge(true); status.textContent = `${getRewardCopy(language).earned} ${getBookCopy(language).award}.`;
  } });
  const prepare = () => {
    if (preferences?.reducedMotion) return Promise.resolve();
    return prepareRewardDelivery();
  };

  function updatePersonalisation(entry) {
    activeDiploma?.update(entry, language);
    const name = $('[data-db-recipient]'); if (name) name.textContent = entry.recipientName || getRewardCopy(language).placeholder;
    const input = $('#decoder-library-name');
    if (input && document.activeElement !== input) input.value = entry.recipientName || achievements.playerName || '';
  }

  function render() {
    const c = getBookCopy(language), r = getRewardCopy(language), entry = achievements.get('fibonacci');
    activeDiploma?.dispose(); activeDiploma = null;
    modal.lang = language;
    badge();
    $('[data-db-collection]').textContent = r.collection;
    $('#decoder-book-close').setAttribute('aria-label', r.close);
    $('[data-db-chapter]').textContent = c.ui.chapter;
    $('[data-db-chapter-name]').textContent = entry ? 'Fibonacci' : c.level;
    $('[data-db-award-name]').textContent = entry ? c.award : c.ui.locked;
    const replay = $('[data-db-replay]'); replay.textContent = r.replay; replay.hidden = !entry;
    $('.decoder-toolbar').hidden = !entry; $('.decoder-tabs').hidden = !entry;
    $('[data-db-view]').textContent = tab === 'diploma' ? r.certificate : r.chapter;
    $('[data-db-pages-heading]').textContent = r.index;
    $('[data-db-pages-heading]').hidden = !entry || tab !== 'notes';
    for (const item of modal.querySelectorAll('[data-db-tab]')) {
      item.innerHTML = `<span aria-hidden="true">${item.dataset.dbTab === 'diploma' ? '01' : '02'}</span>${e(item.dataset.dbTab === 'diploma' ? r.diploma : r.chapter)}`;
      item.setAttribute('aria-pressed', String(item.dataset.dbTab === tab));
    }
    $('[data-db-download="diploma"]').textContent = r.downloadDiploma;
    $('[data-db-download="chapter"]').textContent = r.downloadChapter;
    for (const item of modal.querySelectorAll('[data-db-download]')) item.disabled = !entry || downloading;
    $('[data-db-error]').textContent = '';
    $('[data-db-pages]').innerHTML = entry && tab === 'notes' ? c.ui.pageNames.map((name, i) => `<button type="button" data-db-scroll="${i}"><span>${String(i + 1).padStart(2, '0')}</span>${e(name)}</button>`).join('') : '';
    if (!entry) {
      const accessible = levels.canAccess(levels.indexOf('plantpot'));
      reader.innerHTML = `<section class="decoder-locked"><img class="decoder-locked-folio" src="${rewardAsset('folio-closed.webp')}" alt="" draggable="false"><p class="decoder-overline">${e(c.ui.chapter)} · 01</p><h3>${e(c.ui.locked)}</h3><p>${e(c.ui.lockedBody)}</p><p class="decoder-locked-replay">${e(c.ui.replay)}</p>${accessible ? `<button type="button" data-db-visit>${e(c.ui.lockedAction)}</button>` : `<p class="decoder-locked-replay">${e(c.ui.inaccessible)}</p>`}</section>`;
    } else if (tab === 'notes') {
      reader.innerHTML = renderChapter(language);
    } else {
      reader.innerHTML = `<div class="decoder-diploma-view"><div class="decoder-diploma-display"></div><div class="decoder-record"><div class="decoder-record-details"><p class="decoder-overline">${e(r.unlocked)}</p><p class="decoder-record-name" data-db-recipient></p><p>${e(r.issued)} ${e(earnedDate(entry, language))}</p><span>${e(entry.certificateId)}</span></div><form class="decoder-name-form"><label for="decoder-library-name">${e(r.recipient)}</label><div class="decoder-name-fields"><input id="decoder-library-name" type="text" maxlength="64" autocomplete="nickname" spellcheck="false" placeholder="${e(r.placeholder)}"><button type="submit">${e(r.save)}</button></div><p class="decoder-name-help">${e(r.identityHelp)}</p><p class="decoder-form-status" role="status"></p></form></div><p class="decoder-colophon">${e(r.note)}</p></div>`;
      activeDiploma = mountDiploma($('.decoder-diploma-display'), entry, language);
      updatePersonalisation(entry);
    }
    reader.scrollTop = 0;
  }

  function open(trigger = button) {
    if (isBusy()) return;
    pendingAward = null; delivering = null; delivery.cancel();
    for (const entry of achievements.entries) seen.add(entry.id);
    storage.setItem(seenKey, JSON.stringify([...seen]));
    render(); sounds?.open?.(); dialogs.open(modal.id, trigger);
    if (!preferences?.reducedMotion) reader.animate([{ opacity: .2, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
  }

  async function announce() {
    if (announcing || !pendingAward || scope.closed) return;
    if (isBusy() || dialogs.isOpen || document.hidden || document.body.classList.contains('outside')) {
      scope.later(announce, 300); return;
    }
    announcing = true;
    try {
      try { await prepare(); } catch { /* The collection remains usable if artwork cannot load. */ }
      if (scope.closed || !pendingAward) return;
      if (isBusy() || dialogs.isOpen || document.hidden) { scope.later(announce, 300); return; }
      const entry = achievements.get(pendingAward); pendingAward = null;
      if (entry) {
        const box = game?.canvas?.getBoundingClientRect();
        const origin = box ? { x: box.left + box.width * .59, y: box.top + box.height * .58 } : null;
        await delivery.play(entry, language, origin);
        if (!scope.closed) { delivering = null; badge(); }
      }
    } finally { announcing = false; }
  }

  function saveName() {
    const input = $('#decoder-library-name'); if (!input) return null;
    const saved = achievements.personalise('fibonacci', input.value);
    $('.decoder-form-status').textContent = getRewardCopy(language)[saved ? 'saved' : 'nameRequired'];
    input.setAttribute('aria-invalid', String(!saved));
    if (saved) input.value = saved.recipientName; else input.focus();
    return saved;
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob); downloads.add(url);
    const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove();
    scope.later(() => { URL.revokeObjectURL(url); downloads.delete(url); }, 30000);
  }

  async function download(kind) {
    if (downloading) return;
    let entry = achievements.get('fibonacci'); if (!entry) return;
    if (kind === 'diploma') {
      if (!entry.recipientName && tab !== 'diploma') { tab = 'diploma'; render(); }
      if ($('#decoder-library-name')) {
        entry = saveName();
        if (!entry) return;
      }
    }
    const downloadLanguage = language;
    downloading = true; $('[data-db-error]').textContent = '';
    modal.querySelectorAll('[data-db-download]').forEach(item => { item.disabled = true; });
    try {
      if (kind === 'diploma') {
        const blob = await makeDiplomaPDF(entry, downloadLanguage);
        if (!scope.closed) saveBlob(blob, `Decoder's Book - Fibonacci - ${entry.certificateId}.pdf`);
      } else {
        const response = await fetch(`${import.meta.env.BASE_URL}assets/books/decoders-book-fibonacci-${downloadLanguage}.pdf`);
        if (!response.ok) throw new Error('Chapter unavailable');
        const blob = await response.blob();
        if (!scope.closed) saveBlob(blob, `Decoder's Book - Fibonacci - ${downloadLanguage}.pdf`);
      }
    } catch {
      if (!scope.closed) $('[data-db-error]').textContent = getRewardCopy(language).error;
    } finally {
      downloading = false;
      if (!scope.closed) modal.querySelectorAll('[data-db-download]').forEach(item => { item.disabled = false; });
    }
  }

  scope.on(button, 'click', () => {
    if (modal.classList.contains('hidden')) open(button); else dialogs.close();
  });
  scope.on($('#decoder-book-close'), 'click', () => dialogs.close());
  scope.on(modal, 'submit', event => { if (event.target.matches('.decoder-name-form')) { event.preventDefault(); saveName(); } });
  scope.on(modal, 'click', event => {
    if (event.target === modal) dialogs.close();
    const tabButton = event.target.closest('[data-db-tab]');
    if (tabButton && tab !== tabButton.dataset.dbTab) { tab = tabButton.dataset.dbTab; sounds?.page(true); render(); }
    const pageButton = event.target.closest('[data-db-scroll]');
    if (pageButton) {
      const page = reader.querySelector(`[data-db-page="${pageButton.dataset.dbScroll}"]`);
      if (page) reader.scrollTo({ top: reader.scrollTop + page.getBoundingClientRect().top - reader.getBoundingClientRect().top - parseFloat(getComputedStyle(reader).paddingTop), behavior: 'instant' });
    }
    if (event.target.closest('[data-db-visit]')) {
      dialogs.close(); const index = levels.indexOf('plantpot');
      if (levels.canAccess(index)) visitLevel(index);
    }
    if (event.target.closest('[data-db-replay]')) {
      const entry = achievements.get('fibonacci');
      if (entry) {
        seen.delete(entry.id); storage.setItem(seenKey, JSON.stringify([...seen]));
        delivering = entry.id; badge(); dialogs.close(); void delivery.play(entry, language);
      }
    }
    const downloadButton = event.target.closest('[data-db-download]');
    if (downloadButton) void download(downloadButton.dataset.dbDownload);
  });
  scope.on($('.decoder-tabs'), 'keydown', event => {
    const tabs = [...modal.querySelectorAll('[data-db-tab]')], index = tabs.indexOf(event.target);
    if (index < 0) return;
    const next = event.key === 'ArrowDown' ? tabs[(index + 1) % tabs.length] : event.key === 'ArrowUp' ? tabs[(index + tabs.length - 1) % tabs.length] : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : null;
    if (!next) return; event.preventDefault(); next.click(); next.focus();
  });
  scope.add(achievements.subscribe(entry => {
    if (entry.change === 'personalised') updatePersonalisation(entry);
    else { delivering = entry.id; pendingAward = entry.id; render(); scope.later(announce, 850); }
  }));
  const prepareInGarden = () => {
    if (levels.definitions[levels.currentIndex]?.id === 'plantpot') void prepare().catch(() => {});
  };
  scope.add(levels.subscribe(prepareInGarden)); prepareInGarden();
  if (i18n) scope.add(i18n.subscribe(() => {
    language = i18n.language; render();
  }));
  scope.add(() => { activeDiploma?.dispose(); for (const url of downloads) URL.revokeObjectURL(url); modal.remove(); button.remove(); status.remove(); });
  render();
}
