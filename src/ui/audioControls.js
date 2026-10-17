// The sound, channel by channel: the overall volume in the header and in the
// settings (the same one), and in the settings each channel of its own —
// the music, the places' ambience, the effects, the interface's clicks — and
// the one switch that silences everything. Each slider shows how full it is
// along its track (`--fill`), and the settings dim them while muted.
export function mountAudioControls(audio, scope) {
  const byId = id => document.getElementById(id);
  const header = byId('vol-slider-ui'), mute = byId('btn-mute'), icon = byId('vol-icon-ui');
  const panel = byId('options-modal');
  const channels = [
    { slider: byId('master-slider'), out: byId('master-slider-value'), get: s => (s.muted ? 0 : s.masterVol), set: v => audio.setMasterVolume(v) },
    { slider: byId('music-slider'), out: byId('music-value'), get: s => s.musicVol, set: v => audio.setMusicVolume(v) },
    { slider: byId('ambience-slider'), out: byId('ambience-value'), get: s => s.ambienceVol, set: v => audio.setAmbienceVolume(v) },
    { slider: byId('sfx-slider'), out: byId('sfx-value'), get: s => s.sfxVol, set: v => audio.setSfxVolume(v) },
    { slider: byId('ui-slider'), out: byId('ui-value'), get: s => s.uiVol, set: v => audio.setUiVolume(v) },
  ].filter(channel => channel.slider);

  const show = (slider, value, out) => {
    const label = `${Math.round(value * 100)}%`;
    slider.value = value;
    slider.style.setProperty('--fill', `${value * 100}%`);
    slider.setAttribute('aria-valuetext', label);
    if (out) out.textContent = label;
  };
  function sync() {
    const state = audio.state;
    for (const { slider, out, get } of channels) show(slider, get(state), out);
    if (header) show(header, state.muted ? 0 : state.masterVol, byId('master-value'));
    const label = mute.querySelector('[data-audio-label]') || mute;
    label.textContent = state.muted ? 'Unmute all' : 'Mute all';
    mute.dataset.muted = String(state.muted);
    mute.setAttribute('aria-pressed', String(state.muted));
    panel?.classList.toggle('is-muted', state.muted);
    icon.dataset.muted = String(state.muted || state.masterVol === 0);
    icon.setAttribute('aria-pressed', String(state.muted));
    icon.setAttribute('aria-label', state.muted ? 'Unmute all audio' : 'Mute all audio');
  }
  for (const { slider, set } of channels) scope.on(slider, 'input', e => { set(e.target.value); sync(); });
  if (header) scope.on(header, 'input', e => { audio.setMasterVolume(e.target.value); sync(); });
  const toggle = () => { audio.toggleMute(); sync(); };
  scope.on(mute, 'click', toggle); scope.on(icon, 'click', toggle);
  if (icon.tagName !== 'BUTTON') {
    icon.setAttribute('role', 'button'); icon.tabIndex = 0;
    scope.on(icon, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); icon.click(); } });
  }
  const click = e => {
    if (e.target.closest('#game-container')) return;
    if (e.target.closest('#btn-options, #options-modal, #btn-submit')) audio.playUIClick();
    else audio.playClick();
  };
  scope.on(document.body, 'mousedown', click);
  scope.on(document.body, 'click', e => { if (e.detail === 0) click(e); });
  // changed from elsewhere (the cold open's own control): shown here too
  if (audio.subscribe) scope.add(audio.subscribe(sync));
  sync();
}
