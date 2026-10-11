import { RoomPreviewStore } from '../core/RoomPreviewStore.js';
import { toRoman } from './transitions.js';
import { paintKey } from '../shared/keyArt.js';

export function mountProgress(scope, { game, levels, storage, navigate, canNavigate }) {
  const grid = document.getElementById('levels-grid');
  const previous = document.getElementById('room-previous');
  const next = document.getElementById('room-next');
  const previews = new RoomPreviewStore(storage, levels.definitions);
  const tiles = [];
  let captureTimer, captureGeneration = 0;
  grid.replaceChildren();
  grid.setAttribute('role', 'list');
  scope.on(previous, 'click', () => {
    if (canNavigate() && levels.currentIndex > 0) navigate(levels.currentIndex - 1);
  });
  scope.on(next, 'click', () => {
    if (canNavigate() && levels.currentIndex < levels.unlockedIndex) navigate(levels.currentIndex + 1);
  });
  levels.definitions.forEach((level, index) => {
    // a line of the index, not a control: it says what is here and whether
    // it is solved; the way to a puzzle is the thing itself, in its room
    const tile = document.createElement('div');
    tile.setAttribute('role', 'listitem'); tile.dataset.levelId = level.id;
    const preview = document.createElement('img');
    preview.className = 'level-preview'; preview.alt = ''; preview.hidden = true;
    const number = document.createElement('span'); number.className = 'level-number'; number.textContent = String(index + 1).padStart(2, '0');
    const caption = document.createElement('span'); caption.className = 'level-caption';
    const name = document.createElement('span'); name.className = 'level-name';
    const status = document.createElement('span'); status.className = 'level-status';
    caption.append(name, status);
    const check = document.createElement('span'); check.className = 'level-check'; check.textContent = '✓'; check.setAttribute('aria-hidden', 'true');
    tile.append(preview, number, caption, check); grid.append(tile);
    tiles.push({ tile, preview, check, name, status });
  });

  function render() {
    const near = levels.nearby;
    levels.definitions.forEach((level, index) => {
      const { tile, preview, check, name, status } = tiles[index];
      const allowed = levels.canAccess(index), solved = levels.isCompleted(index), current = !levels.place && index === levels.currentIndex;
      tile.hidden = !near.indexes.includes(index);
      tile.className = `level-btn ${allowed ? current ? 'current' : 'unlocked' : 'locked'}`;
      tile.classList.toggle('solved', solved);
      name.textContent = allowed ? level.name : 'Locked';
      status.textContent = !allowed ? 'Locked' : solved ? 'Solved' : current ? 'Currently exploring' : 'Not solved yet';
      tile.setAttribute('aria-label', `Level ${index + 1}: ${allowed ? level.name : 'Locked'}${solved ? ' — solved' : ''}${current ? ' — current' : ''}`);
      if (current) tile.setAttribute('aria-current', 'step'); else tile.removeAttribute('aria-current');
      tile.title = allowed ? `${level.name}${solved ? ' · Solved' : ''}` : 'Solve the previous room to unlock';
      check.hidden = !solved;
      const source = allowed && previews.get(level.id);
      if (source && preview.getAttribute('src') !== source) preview.src = source;
      preview.hidden = !source; tile.classList.toggle('has-preview', Boolean(source));
    });
    const done = levels.completedCount;
    // where the place has doors rather than puzzles, the index lists the
    // rooms behind them, each ticked once everything in it is solved
    for (const old of grid.querySelectorAll('.room-row')) old.remove();
    levels.rooms.forEach((room, n) => {
      const row = document.createElement('div');
      row.className = `level-btn room-row ${room.locked ? 'locked' : 'unlocked'}${room.solved ? ' solved' : ''}`;
      row.setAttribute('role', 'listitem');
      row.setAttribute('aria-label', `${room.name}${room.locked ? ' — locked' : room.solved ? ' — solved' : ''}`);
      const number = document.createElement('span'); number.className = 'level-number'; number.textContent = String(n + 1).padStart(2, '0');
      const caption = document.createElement('span'); caption.className = 'level-caption';
      const name = document.createElement('span'); name.className = 'level-name'; name.textContent = room.name;
      const status = document.createElement('span'); status.className = 'level-status'; status.textContent = room.locked ? 'Locked' : room.solved ? 'Solved' : 'Not solved yet';
      caption.append(name, status);
      const check = document.createElement('span'); check.className = 'level-check'; check.textContent = '✓';
      check.setAttribute('aria-hidden', 'true'); check.hidden = !room.solved;
      row.append(number, caption, check); grid.append(row);
    });
    // under the list, the few lines of story for where the player is
    const story = document.getElementById('index-story');
    story.replaceChildren(...near.story.map(line => Object.assign(document.createElement('p'), { textContent: line })));
    // a finished room says so, in place of its story
    story.hidden = near.story.length === 0 || near.completed;
    document.getElementById('index-done').hidden = !near.completed;
    // under the story, the keys found so far, each with the door it is for
    const ring = document.getElementById('index-keys');
    const held = levels.keys;
    if (ring.dataset.held !== held.map(item => item.key).join()) {
      ring.dataset.held = held.map(item => item.key).join();
      ring.replaceChildren(...held.map(item => {
        const figure = document.createElement('figure');
        const caption = document.createElement('figcaption');
        caption.append(Object.assign(document.createElement('span'), { className: 'key-label', textContent: 'Key found' }),
          `This key unlocks door ${toRoman(item.door)}`);
        const picture = paintKey();
        picture.setAttribute('role', 'img'); picture.setAttribute('aria-label', `The key to door ${toRoman(item.door)}`);
        figure.append(caption, picture);
        return figure;
      }));
    }
    ring.hidden = held.length === 0;
    const here = near.indexes.filter(index => levels.isCompleted(index)).length;
    // a count only where there is something to count
    document.getElementById('progress-count').hidden = near.indexes.length === 0;
    document.getElementById('room-progress').hidden = near.indexes.length === 0;
    document.getElementById('index-heading').textContent = near.name;
    document.getElementById('progress-count').textContent = `${here} / ${near.indexes.length} solved`;
    const currentLevel = levels.definitions[levels.currentIndex];
    const romanLevel = toRoman(levels.currentIndex + 1);
    // in the house, the header names the place stood in, not a puzzle
    document.getElementById('header-room-name').textContent = levels.place ? levels.place.name : currentLevel.name;
    document.getElementById('header-progress').textContent = levels.place ? '' : romanLevel;
    // the way back: out of a puzzle to where it was found, out of a room to the hall
    const leave = document.getElementById('btn-leave'), back = levels.back;
    // from the hall, back is outside
    leave.hidden = !back && !levels.place;
    if (!back) { leave.setAttribute('aria-label', 'Back outside'); leave.title = 'Back outside'; }
    if (back) {
      leave.setAttribute('aria-label', `Back to ${back.name.replace(/^The /, 'the ')}`);
      leave.title = leave.getAttribute('aria-label');
    }
    document.getElementById('header-room').setAttribute('aria-label', `Current level: ${currentLevel.name}, level ${romanLevel}`);
    previous.disabled = levels.currentIndex <= 0;
    next.disabled = levels.currentIndex >= levels.unlockedIndex;
    next.setAttribute('aria-label', `Next room${next.disabled ? ' (locked)' : ''}`);
    next.title = next.disabled ? 'Solve this room to unlock the next one' : 'Next room';
    previous.setAttribute('aria-label', `Previous room${previous.disabled ? ' (first room)' : ''}`);
    const meter = document.getElementById('room-progress'); meter.max = near.indexes.length; meter.value = here;
    const save = document.getElementById('save-status');
    save.textContent = levels.saved ? 'Saved on this device' : 'Progress kept for this session only';
    save.dataset.state = levels.saved ? 'saved' : 'temporary';
    save.title = levels.saved ? 'Progress is saved in this browser. Clearing site data removes it.' : 'Browser storage is unavailable. Progress may be lost when this page closes.';
    const returning = storage.getItem('hasPlayedBefore') === 'true' || done > 0;
    // someone coming back is taken on to the room they had got to
    const room = levels.resumeRoom;
    document.getElementById('btn-continue').textContent = returning && room ? `Continue to Room ${room.number}` : 'Get inside';
    // the title says nothing of how much is solved
    document.getElementById('start-progress').hidden = true;
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
