// One half-second pencil sound per press, triggered by its first actual stroke.
const DURATION_SECONDS = .5;
const FADE_SECONDS = .012;

export function mountDrawingSound(scope, { game, audio }) {
  const url = `${import.meta.env.BASE_URL}assets/sounds/drawingsound-500ms.wav`;
  const voices = new Set();
  let buffer = null, preparation = null, request = null, disposed = false;
  let press = 0, held = false, used = false, lastMovement = 0, pendingPress = null;
  const level = () => {
    const state = audio?.state;
    return state?.muted || state?.masterVol === 0 ? 0 : (state?.sfxVol ?? .8) * .08;
  };
  function release(item) {
    if (item.closed) return;
    item.closed = true; item.source.disconnect(); item.gain.disconnect(); voices.delete(item);
  }
  function volume(item) {
    if (item.closed || item.stopping) return;
    const now = item.context.currentTime;
    if (now >= item.ends) return;
    const ramp = Math.min(now + .006, item.ends), fade = Math.max(ramp, item.ends - FADE_SECONDS);
    item.gain.gain.cancelScheduledValues(now);
    item.gain.gain.setValueAtTime(item.gain.gain.value, now);
    item.gain.gain.linearRampToValueAtTime(level(), ramp);
    item.gain.gain.setValueAtTime(level(), fade);
    item.gain.gain.linearRampToValueAtTime(0, item.ends);
  }
  function silence(immediate) {
    for (const item of [...voices]) {
      if (item.closed || (!immediate && item.stopping)) continue;
      item.stopping = true;
      const now = item.context.currentTime, end = now + (immediate ? 0 : FADE_SECONDS);
      item.gain.gain.cancelScheduledValues(now);
      item.gain.gain.setValueAtTime(item.gain.gain.value, now);
      item.gain.gain.linearRampToValueAtTime(0, end);
      item.source.stop(end);
      if (immediate) release(item);
    }
  }
  function end() { held = false; used = true; press++; }
  function stop(immediate = false) { end(); silence(immediate); }
  function play(ticket) {
    const context = game?.sound?.context, destination = game?.sound?.destination;
    if (disposed || scope.closed || !held || used || ticket !== press || !buffer || !level() || !lastMovement ||
        performance.now() - lastMovement > 65 || !context || context.state !== 'running' || !destination) return;
    const source = context.createBufferSource(), gain = context.createGain();
    const start = context.currentTime, duration = Math.min(DURATION_SECONDS, buffer.duration);
    source.buffer = buffer; source.loop = false; gain.gain.value = 0;
    source.connect(gain).connect(destination);
    const item = { source, gain, context, ends: start + duration, closed: false, stopping: false };
    voices.add(item); source.onended = () => release(item);
    volume(item);
    // Web Audio ends this burst at exactly 500 ms; movement cannot extend it.
    source.start(start, 0, duration);
    used = true;
  }
  function prepare() {
    if (disposed || scope.closed || !game?.sound?.context) return Promise.resolve(null);
    if (buffer) return Promise.resolve(buffer);
    if (!preparation) {
      request = new AbortController();
      preparation = fetch(url, { signal: request.signal }).then(response => {
        if (!response.ok) throw new Error('Drawing recording unavailable');
        return response.arrayBuffer();
      }).then(bytes => game.sound.context.decodeAudioData(bytes)).then(decoded => {
        if (disposed || scope.closed) return null;
        buffer = decoded; return buffer;
      }).catch(() => { preparation = null; return null; });
    }
    return preparation;
  }
  function begin() {
    if (disposed || scope.closed) return;
    silence(false); const ticket = ++press;
    held = true; used = false; lastMovement = 0; pendingPress = null;
    const context = game?.sound?.context;
    if (context?.state === 'suspended' && level()) void context.resume().then(() => play(ticket)).catch(() => {});
    void prepare();
  }
  function move() {
    if (disposed || scope.closed || !held) return;
    lastMovement = performance.now();
    if (used) return;
    const ticket = press;
    if (buffer) play(ticket);
    else if (pendingPress !== ticket) { pendingPress = ticket; void prepare().then(() => play(ticket)); }
  }
  if (audio) scope.add(audio.subscribe(() => { for (const item of voices) volume(item); }));
  scope.add(() => { disposed = true; request?.abort(); stop(true); buffer = null; });
  return { prepare, begin, move, end, stop };
}
