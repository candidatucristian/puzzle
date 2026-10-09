import { RoomPreviewStore } from '../core/RoomPreviewStore.js';
import { toRoman } from './transitions.js';

export function mountProgress(scope, { game, levels, storage, navigate, canNavigate }) {
  const grid = document.getElementById('levels-grid');
  const previous = document.getElementById('room-previous');
  const next = document.getElementById('room-next');
  const previews = new RoomPreviewStore(storage, levels.definitions);
  const tiles = [];
  let captureTimer, captureGeneration = 0;
  grid.replaceChildren();
  scope.on(previous, 'click', () => {
    if (canNavigate() && levels.currentIndex > 0) navigate(levels.currentIndex - 1);
  });
  scope.on(next, 'click', () => {
    if (canNavigate() && levels.currentIndex < levels.unlockedIndex) navigate(levels.currentIndex + 1);
  });
  levels.definitions.forEach((level, index) => {
    const tile = document.createElement('button');
    tile.type = 'button'; tile.dataset.levelId = level.id;
    const preview = document.createElement('img');
    preview.className = 'level-preview'; preview.alt = ''; preview.hidden = true;
    const number = document.createElement('span'); number.className = 'level-number'; number.textContent = String(index + 1).padStart(2, '0');
    const caption = document.createElement('span'); caption.className = 'level-caption';
    const name = document.createElement('span'); name.className = 'level-name';
    const status = document.createElement('span'); status.className = 'level-status';
    caption.append(name, status);
    const check = document.createElement('span'); check.className = 'level-check'; check.textContent = '✓'; check.setAttribute('aria-hidden', 'true');
    tile.append(preview, number, caption, check); grid.append(tile);
    scope.on(tile, 'click', () => { if (canNavigate()) navigate(index); });
    tiles.push({ tile, preview, check, name, status });
  });

  function render() {
    levels.definitions.forEach((level, index) => {
      const { tile, preview, check, name, status } = tiles[index];
      const allowed = levels.canAccess(index), solved = levels.isCompleted(index), current = index === levels.currentIndex;
      tile.className = `level-btn ${allowed ? current ? 'current' : 'unlocked' : 'locked'}`;
      tile.classList.toggle('solved', solved);
      tile.disabled = !allowed;
      tile.setAttribute('aria-disabled', String(!allowed));
      name.textContent = allowed ? level.name : 'Locked';
      status.textContent = !allowed ? 'Locked' : current ? solved ? 'Revisiting · solved' : 'Currently exploring' : solved ? 'Solved · revisit' : 'Ready to explore';
      tile.setAttribute('aria-label', `Level ${index + 1}: ${allowed ? level.name : 'Locked'}${solved ? ' — solved' : ''}${current ? ' — current' : ''}`);
      if (current) tile.setAttribute('aria-current', 'step'); else tile.removeAttribute('aria-current');
      tile.title = allowed ? `${level.name}${solved ? ' · Solved' : ''}` : 'Solve the previous room to unlock';
      check.hidden = !solved;
      const source = allowed && previews.get(level.id);
      if (source && preview.getAttribute('src') !== source) preview.src = source;
      preview.hidden = !source; tile.classList.toggle('has-preview', Boolean(source));
    });
    const done = levels.completedCount, total = levels.definitions.length;
    document.getElementById('progress-count').textContent = `${done} / ${total} solved`;
    const currentLevel = levels.definitions[levels.currentIndex];
    const romanLevel = toRoman(levels.currentIndex + 1);
    document.getElementById('header-room-name').textContent = currentLevel.name;
    document.getElementById('header-progress').textContent = romanLevel;
    document.getElementById('header-room').setAttribute('aria-label', `Current level: ${currentLevel.name}, level ${romanLevel}`);
    previous.disabled = levels.currentIndex <= 0;
    next.disabled = levels.currentIndex >= levels.unlockedIndex;
    next.setAttribute('aria-label', `Next room${next.disabled ? ' (locked)' : ''}`);
    next.title = next.disabled ? 'Solve this room to unlock the next one' : 'Next room';
    previous.setAttribute('aria-label', `Previous room${previous.disabled ? ' (first room)' : ''}`);
    const meter = document.getElementById('room-progress'); meter.max = total; meter.value = done;
    const save = document.getElementById('save-status');
    save.textContent = levels.saved ? 'Saved on this device' : 'Progress kept for this session only';
    save.dataset.state = levels.saved ? 'saved' : 'temporary';
    save.title = levels.saved ? 'Progress is saved in this browser. Clearing site data removes it.' : 'Browser storage is unavailable. Progress may be lost when this page closes.';
    const returning = storage.getItem('hasPlayedBefore') === 'true' || done > 0;
    document.getElementById('btn-continue').textContent = returning ? `Continue · Level ${levels.currentIndex + 1}` : 'Begin exploration';
    document.getElementById('start-progress').textContent = returning ? `${done} of ${total} rooms solved · ${levels.definitions[levels.currentIndex].name}` : `${total} rooms`;
  }

  function scheduleCapture() {
    scope.cancel(captureTimer);
    const generation = ++captureGeneration;
    const index = levels.currentIndex, level = levels.definitions[index];
    if (!levels.canAccess(index) || previews.get(level.id)) return;
    let tries = 0;
    function capture() {
      if (scope.closed || generation !== captureGeneration) return;
      const scene = levels.activeScene;
      if (!scene || scene.scene.key !== level.key) {
        if (++tries < 12) captureTimer = scope.later(capture, 500);
        return;
      }
      const save = image => {
        if (scope.closed || generation !== captureGeneration || !(image instanceof HTMLImageElement || image instanceof HTMLCanvasElement)) return;
        try {
          const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 104;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          if (previews.set(level.id, canvas.toDataURL('image/webp', .65))) render();
        } catch { /* Optional previews must never interrupt play or saving. */ }
      };
      if (scene.previewSource) save(scene.previewSource);
      else game.renderer.snapshot(save);
    }
    captureTimer = scope.later(capture, 1800);
  }
  scope.add(levels.subscribe(() => { render(); scheduleCapture(); }));
  scope.add(() => { captureGeneration++; });
  render();
  return { render, reset() { previews.reset(); captureGeneration++; scope.cancel(captureTimer); render(); } };
}
