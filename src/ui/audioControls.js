export function mountAudioControls(audio, scope) {
  const byId = id => document.getElementById(id);
  const music = byId('music-slider'), sfx = byId('sfx-slider'), master = byId('vol-slider-ui');
  const mute = byId('btn-mute'), icon = byId('vol-icon-ui');
  function sync() {
    const state = audio.state;
    music.value = state.musicVol; sfx.value = state.sfxVol;
    master.value = state.muted ? 0 : state.masterVol;
    mute.innerHTML = state.muted ? '<span class="btn-emoji">🔇</span> UNMUTE' : '<span class="btn-emoji">🔊</span> MUTE';
    mute.setAttribute('aria-pressed', String(state.muted));
    icon.textContent = state.muted || state.masterVol === 0 ? '🔇' : state.masterVol < .5 ? '🔉' : '🔊';
    icon.setAttribute('aria-label', state.muted ? 'Unmute all audio' : 'Mute all audio');
  }
  scope.on(music, 'input', e => { audio.setMusicVolume(e.target.value); sync(); });
  scope.on(sfx, 'input', e => { audio.setSfxVolume(e.target.value); sync(); });
  scope.on(master, 'input', e => { audio.setMasterVolume(e.target.value); sync(); });
  const toggle = () => { audio.toggleMute(); sync(); };
  scope.on(mute, 'click', toggle); scope.on(icon, 'click', toggle);
  icon.setAttribute('role', 'button'); icon.tabIndex = 0;
  scope.on(icon, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); icon.click(); } });
  const click = e => {
    if (e.target.closest('#game-container')) return;
    if (e.target.closest('#btn-options, #options-modal, #btn-submit')) audio.playUIClick();
    else audio.playClick();
  };
  scope.on(document.body, 'mousedown', click);
  scope.on(document.body, 'click', e => { if (e.detail === 0) click(e); });
  sync();
}
