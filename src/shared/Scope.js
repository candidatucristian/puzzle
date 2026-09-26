/** A small owner for application listeners and native timers. */
export class Scope {
  constructor() { this.cleanups = new Set(); this.timers = new Set(); this.closed = false; }
  add(cleanup) { this.cleanups.add(cleanup); return cleanup; }
  on(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    this.add(() => target.removeEventListener(event, handler, options));
    return handler;
  }
  later(handler, delay) {
    const id = setTimeout(() => { this.timers.delete(id); if (!this.closed) handler(); }, delay);
    this.timers.add(id); return id;
  }
  cancel(id) { clearTimeout(id); this.timers.delete(id); }
  dispose() {
    if (this.closed) return;
    this.closed = true;
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
    for (const cleanup of [...this.cleanups].reverse()) cleanup();
    this.cleanups.clear();
  }
}
