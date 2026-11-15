/** Loading feedback for scene assets, separate from the initial startup screen.
 *  The card shows only when a scene takes a while (SHOW_AFTER): a quick load,
 *  its pictures already at hand, is the plain dark of the way between rooms,
 *  not a flash of "Loading" (2026-11-13). A failure shows at once. */
const SHOW_AFTER=450;
export function createSceneLoading({i18n}) {
  const root=document.createElement('div');
  root.id='scene-loading'; root.className='scene-loading'; root.hidden=true;
  root.innerHTML='<div class="scene-loading-card"><span class="scene-loading-mark" aria-hidden="true"></span><h2></h2><p role="status" aria-live="polite"></p><progress max="1" value="0" aria-hidden="true"></progress><button type="button" hidden></button></div>';
  document.getElementById('game-container').append(root);
  const title=root.querySelector('h2'), status=root.querySelector('p'), bar=root.querySelector('progress'), retry=root.querySelector('button');
  let owner=null, message='loading', action=null, slow=0, showing=0, disposed=false;
  const say=key=>i18n.t('assetLoading.'+key);
  function render() {
    title.textContent=say('title'); status.textContent=say(message); retry.textContent=say('retry');
    root.setAttribute('aria-label',say('title'));
  }
  const stop=()=>{clearTimeout(slow);slow=0;clearTimeout(showing);showing=0;};
  const hide=scene=>{
    if(owner!==scene)return;
    stop(); owner=null;action=null;root.hidden=true;root.dataset.failed='false';
  };
  const click=()=>{if(action){retry.disabled=true;action();}};
  retry.addEventListener('click',click);
  const unsubscribe=i18n.subscribe(render);
  render();
  return {
    get busy(){return Boolean(owner);},
    begin(scene) {
      if(disposed)return;
      stop();owner=scene;action=null;message='loading';
      root.dataset.failed='false';retry.hidden=true;retry.disabled=false;bar.value=0;
      showing=setTimeout(()=>{showing=0;if(owner===scene)root.hidden=false;},SHOW_AFTER);
      slow=setTimeout(()=>{if(owner===scene&&message!=='failed'){message='slow';render();}},12000);
      render();
    },
    progress(scene,value){if(owner===scene)bar.value=Math.max(bar.value,Math.min(.98,value));},
    retrying(scene){if(owner===scene){message='retrying';root.hidden=false;render();}},
    fail(scene,onRetry) {
      if(disposed)return;
      stop();owner=scene;action=onRetry;message='failed';root.hidden=false;
      root.dataset.failed='true';retry.hidden=false;retry.disabled=false;render();
    },
    ready:hide,cancel:hide,
    dispose(){disposed=true;stop();owner=null;unsubscribe();retry.removeEventListener('click',click);root.remove();},
  };
}

