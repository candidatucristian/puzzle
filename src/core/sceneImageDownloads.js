// Compressed files survive GPU-texture eviction. This is a session cache, not a
// second decoded-image cache: a 400 KB WebP stays 400 KB, rather than ~27 MB.
const caches = new WeakMap();
const BUDGET = 32 * 1024 * 1024;

function absolute(url) {
  if (typeof document === 'undefined' || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url, document.baseURI);
    return /^https?:$/.test(parsed.protocol) && parsed.origin === new URL(document.baseURI).origin ? parsed.href : null;
  } catch { return null; }
}

function downloads(game) {
  if (caches.has(game)) return caches.get(game);
  const blobs = new Map(), pending = new Map();
  let bytes = 0, queue = [], disposed = false;
  const forget = url => {
    const old = blobs.get(url);
    if (old) { bytes -= old.size; blobs.delete(url); }
  };
  const get = url => {
    const blob = blobs.get(url);
    if (blob) { blobs.delete(url); blobs.set(url, blob); }
    return blob;
  };
  const put = (url, blob) => {
    if (disposed || !url || !(blob instanceof Blob) || !blob.size || blob.size > BUDGET) return;
    forget(url);
    while (bytes + blob.size > BUDGET) forget(blobs.keys().next().value);
    blobs.set(url, blob); bytes += blob.size;
  };
  const pump = () => {
    while (!disposed && queue.length && pending.size < 2) {
      const url = queue.shift();
      if (blobs.has(url)) continue;
      if (pending.has(url)) {
        // A -> B -> A may select A while its previous abort is still settling.
        if (pending.get(url).controller.signal.aborted) { queue.push(url); break; }
        continue;
      }
      const controller = new AbortController();
      const task = { controller, promise: null, foreground: false, timer: setTimeout(() => controller.abort(), 15000) };
      // Only the selected door is warmed. No GPU allocation, decoding, or
      // whole-floor downloads compete with the room the player is looking at.
      task.promise = fetch(url, { signal: controller.signal, priority: 'low', credentials: 'same-origin' })
        .then(response => response.ok && response.headers.get('content-type')?.startsWith('image/') ? response.blob() : null)
        .then(blob => {
          if (controller.signal.aborted) return null;
          put(url, blob); return blob;
        })
        .catch(() => null)
        .finally(() => { clearTimeout(task.timer); pending.delete(url); pump(); });
      pending.set(url, task);
    }
  };
  const keep = urls => {
    const wanted = new Set(urls);
    for (const [url, task] of pending) if (!wanted.has(url)) task.controller.abort();
  };
  const cache = {
    get, put, forget,
    pending: url => {
      const task = pending.get(url);
      if (!task || task.controller.signal.aborted) return null;
      // Once the player enters, this is a required request. Don't discard a
      // nearly downloaded image just because its speculative deadline elapsed.
      if (!task.foreground) {
        task.foreground = true;
        clearTimeout(task.timer);
        task.timer = setTimeout(() => task.controller.abort(), 120000);
      }
      return task.promise;
    },
    warm(urls) { keep(urls); queue = [...new Set(urls)]; pump(); },
    focus(urls) { queue = []; keep(urls); },
    dispose() {
      disposed = true; queue = []; keep([]); blobs.clear(); bytes = 0;
    },
  };
  game.events?.once('destroy', cache.dispose);
  caches.set(game, cache);
  return cache;
}

/** Called on a deliberate door opening, never on every room or mouse hover. */
export function warmSceneImages(scene, assets) {
  const urls = assets.filter(asset => !scene.textures.exists(asset.key)).map(asset => absolute(asset.url)).filter(Boolean);
  downloads(scene.game).warm(urls);
}

/** Foreground loading wins over any previously selected doorway. */
export function focusSceneImages(scene, files) {
  downloads(scene.game).focus([...files].map(file => file._sceneImageURL).filter(Boolean));
}

/** Keep Phaser's normal decoding, progress, timeout and error handling. */
export function cacheSceneImageDownload(scene, file, current) {
  if (!['image', 'spritesheet'].includes(file.type) || file.useImageElementLoad || typeof file.load !== 'function') return;
  const raw = file.url;
  const resolved = typeof raw === 'string' && /^(?:blob:|data:|capacitor:\/\/|https?:\/\/|\/\/)/.test(raw) ? raw : (scene.load.baseURL || '') + (raw || '');
  const url = raw && absolute(resolved);
  if (!url) return;
  file._sceneImageURL = url;
  const cache = downloads(scene.game), load = file.load;
  let localURL = null;
  const release = () => {
    if (localURL) URL.revokeObjectURL(localURL);
    localURL = null;
    file.url = raw;
  };
  file._releaseSceneImageURL = release;
  const start = blob => {
    if (!current() || !file.loader?.scene) return;
    if (blob) { localURL = URL.createObjectURL(blob); file.url = localURL; }
    load.call(file);
  };
  file.load = function() {
    const blob = cache.get(url), pending = !blob && cache.pending(url);
    if (pending) pending.then(start);
    else start(blob);
  };
  for (const method of ['onProcessComplete', 'onProcessError', 'onError']) {
    const original = file[method];
    if (typeof original !== 'function') continue;
    file[method] = function(...args) {
      if (current()) {
        if (method === 'onProcessComplete') cache.put(url, this.xhrLoader?.response);
        else cache.forget(url);
      }
      release();
      return original.apply(this, args);
    };
  }
}
