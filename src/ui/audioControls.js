export function mountAudioControls(audio, scope) {
  const byId = id => document.getElementById(id);
  const music = byId('music-slider'), sfx = byId('sfx-slider'), master = byId('vol-slider-ui');
  const mute = byId('btn-mute'), icon = byId('vol-icon-ui');
  function volumeLabel(slider, value, outputId) {
    const label = `${Math.round(value * 100)}%`;
    slider.setAttribute('aria-valuetext', label);
    const output = byId(outputId);
    if (output) output.textContent = label;
  }
  function sync() {
    const state = audio.state;
    music.value = state.musicVol; sfx.value = state.sfxVol;
    master.value = state.muted ? 0 : state.masterVol;
    const label = mute.querySelector('[data-audio-label]') || mute;
    label.textContent = state.muted ? 'Unmute all' : 'Mute all';
    mute.dataset.muted = String(state.muted);
    mute.setAttribute('aria-pressed', String(state.muted));
    icon.dataset.muted = String(state.muted || state.masterVol === 0);
    icon.setAttribute('aria-pressed', String(state.muted));
    icon.setAttribute('aria-label', state.muted ? 'Unmute all audio' : 'Mute all audio');
    volumeLabel(music, state.musicVol, 'music-value');
    volumeLabel(sfx, state.sfxVol, 'sfx-value');
    volumeLabel(master, Number(master.value), 'master-value');
  }
  scope.on(music, 'input', e => { audio.setMusicVolume(e.target.value); sync(); });
  scope.on(sfx, 'input', e => { audio.setSfxVolume(e.target.value); sync(); });
  scope.on(master, 'input', e => { audio.setMasterVolume(e.target.value); sync(); });
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
  sync();
}
