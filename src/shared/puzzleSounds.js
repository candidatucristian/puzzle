/** Short synthesized effects routed through the scene master and SFX channel. */
export function playPaperTick(scene, vol) {
  try {
    const ac = scene.sound.context;
    if (!ac || (scene.services.audio.state && scene.services.audio.state.muted)) return;
    const t = ac.currentTime;
    const dur = 0.05;
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 1.6;
    const g = ac.createGain();
    g.gain.value = (scene.services.audio.state ? scene.services.audio.state.sfxVol : 0.8) * vol;
    src.connect(bp);
    bp.connect(g);
    g.connect(scene.sound.destination);
    src.start(t);
    src.stop(t + dur);
  } catch (e) {}
}

export function playPuzzleChime(scene) {
  try {
    const ac = scene.sound.context;
    if (!ac || (scene.services.audio.state && scene.services.audio.state.muted)) return;
    const t = ac.currentTime;
    const master = ac.createGain();
    master.gain.value = (scene.services.audio.state ? scene.services.audio.state.sfxVol : 0.8) * 0.35;
    master.connect(scene.sound.destination);
    const partials = [
      [523.3, 0.9, 2.0],
      [659.3, 0.6, 1.8],
      [784.0, 0.45, 1.6],
    ];
    let delay = 0;
    for (const [f, amp, dur] of partials) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t + delay);
      g.gain.linearRampToValueAtTime(amp, t + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
      o.connect(g);
      g.connect(master);
      o.start(t + delay);
      o.stop(t + delay + dur + 0.1);
      delay += 0.09;
    }
  } catch (e) {}
}
