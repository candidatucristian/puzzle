import { beginAssetGroup, registerSceneImage, retireAssetGroup, trimSceneImages } from './sceneAssetCache.js';
import { cacheSceneImageDownload, focusSceneImages } from './sceneImageDownloads.js';
import { holdsPuzzles, prefetchPlacePuzzles } from './puzzlePrefetch.js';

// Physics scenes retain their existing lifecycle. This review covers the first two floors.
const SCENES = new Set(['Boot','Hall','Upper','Study','Room2','Room3','Room4','Room5','Room6','Room7','Room8','Room9',
  'BinaryTree','PlantPot','Cryptex','Cot','Overtime','Modem','Compass','Chessboard','MobilePhone',
  'Sequence','Wires','Station','TapCode','Pi','Rally','Flags','Herbarium','Bookshelf',
  'Lightswitch','Chemistry','Molecules','Phials','Balance','Equations','Measures']);
const IMAGE = new Set(['image','spritesheet']);
const RETRIES = 2;

export function optionalSceneAsset(scene,key) {
  scene._optionalLoadKeys ??= new Set();
  scene._optionalLoadKeys.add(key);
}

function session(scene) {
  const loader=scene.load, services=scene.game.services, boot=scene.sys.settings.key==='Boot';
  const screen=boot?null:services.sceneLoading;
  const records=new Map(), attempts=new Map(), pendingFiles=new Set();
  let closed=false, cancelled=false;
  scene._optionalLoadKeys=new Set();
  scene._assetsReady=false;
  if(scene._assetInputBlocked) {
    if(scene.input)scene.input.enabled=true;
    if(scene.input?.keyboard)scene.input.keyboard.enabled=true;
    scene._assetInputBlocked=false;
  }
  beginAssetGroup(scene);
  screen?.begin(scene);
  const identify=file=>file.type+':'+file.key;
  const added=(_key,_type,_loader,file)=>{
    if(!file)return;
    records.set(identify(file),{key:file.key,type:file.type});
    pendingFiles.add(file);
    // File.xhrSettings defaults to zero and overrides the Loader's global timeout.
    if(file.xhrSettings&&!file.xhrSettings.timeout)file.xhrSettings.timeout=loader.xhr?.timeout||120000;
    // Phaser 3.60 sets xhr.timeout but does not handle the timeout event.
    // Route it through its normal failure path so a stalled request can finish/retry.
    if(typeof file.load==='function') {
      const start=file.load;
      file.load=function(...args) {
        const result=start.apply(this,args);
        if(this.xhrLoader)this.xhrLoader.ontimeout=()=>{if(!cancelled)this.onError();};
        return result;
      };
    }
    cacheSceneImageDownload(scene,file,()=>!cancelled);
    // Image/audio decoding can finish after Loader.reset when a scene is left.
    for(const method of ['onProcessComplete','onProcessError']) {
      const original=file[method];
      if(typeof original==='function')file[method]=function(...args) {
        if(cancelled){this.data=null;return;}
        return original.apply(this,args);
      };
    }
    if(IMAGE.has(file.type))registerSceneImage(scene,file.key);
  };
  const progress=value=>screen?.progress(scene,value);
  const failed=file=>{
    if(closed||!loader.isLoading()||!['image','spritesheet','audio'].includes(file.type))return;
    const id=identify(file), count=attempts.get(id)??0;
    if(count>=RETRIES)return;
    attempts.set(id,count+1);
    // src is the resolved original request, preserving subdirectory hosting.
    const url=new URL(file._sceneImageURL||file.src||file.url,document.baseURI).href;
    const prefix=loader.prefix||'';
    const key=prefix&&file.key.startsWith(prefix)?file.key.slice(prefix.length):file.key;
    const config={key,url,xhrSettings:{timeout:120000}};
    if(file.type==='spritesheet')config.frameConfig=file.config;
    loader[file.type](config);
    screen?.retrying(scene);
  };
  const clean=()=>{
    if(closed)return; closed=true;
    loader.off('addfile',added); loader.off('progress',progress); loader.off('loaderror',failed);
  };
  loader.on('addfile',added); loader.on('progress',progress); loader.on('loaderror',failed);
  const cancel=()=>{
    if(cancelled)return;
    cancelled=true;
    scene.events.off('shutdown',cancel); scene.events.off('destroy',cancel);
    clean(); scene._assetsReady=false;
    for(const file of pendingFiles) {
      file._releaseSceneImageURL?.();
      const xhr=file.xhrLoader;
      if(xhr) {
        xhr.onload=xhr.onerror=xhr.onprogress=xhr.ontimeout=xhr.onabort=null;
        if(xhr.readyState!==4)xhr.abort();
      }
    }
    pendingFiles.clear();
    screen?.cancel(scene); retireAssetGroup(scene);
  };
  const blockInput=()=>{
    scene._assetInputBlocked=true;
    if(scene.input)scene.input.enabled=false;
    if(scene.input?.keyboard)scene.input.keyboard.enabled=false;
  };
  scene.events.once('shutdown',cancel);
  scene.events.once('destroy',cancel);
  return {
    queued() { focusSceneImages(scene,pendingFiles); },
    finish() {
      clean();
      pendingFiles.clear();
      const missing=[...records.values()].filter(record=>
        (IMAGE.has(record.type)&&!scene.textures.exists(record.key)&&!scene._optionalLoadKeys.has(record.key))
        ||(boot&&record.type==='audio'&&!scene.cache.audio.exists(record.key)));
      if(!missing.length)return true;
      blockInput();
      screen?.fail(scene,()=>scene.scene.restart(scene.sys.settings.data));
      if(boot)services.loading.fail(new Error('Startup audio unavailable after retries.'));
      console.warn('Scene assets unavailable:',scene.sys.settings.key,missing.map(record=>record.key));
      return false;
    },
    ready() {
      if(cancelled)return;
      scene._assetsReady=true;
      trimSceneImages(scene);
      screen?.ready(scene);
      // in a room: its puzzles go on downloading, quietly (core/puzzlePrefetch.js)
      const key=scene.sys.settings.key;
      if(holdsPuzzles(key))prefetchPlacePuzzles(scene,key);
    },
    creationError(error) {
      if(cancelled)return;
      blockInput();
      screen?.fail(scene,()=>scene.scene.restart(scene.sys.settings.data));
      if(boot)services.loading.fail(error);
      console.error('Scene could not be prepared:',scene.sys.settings.key,error);
    },
  };
}

/** Interpose before subclass creation so failed loads cannot produce an interactive black room. */
export function installSceneAssetLoading(scene) {
  if(!SCENES.has(scene.sys.settings.key))return;
  const preload=scene.preload, create=scene.create, update=scene.update;
  let loading=null;
  scene.preload=function(...args) {
    loading=session(this);
    preload?.apply(this,args);
    loading.queued();
  };
  scene.create=function(...args) {
    const request=loading;
    if(request&&!request.finish())return;
    try {
      const result=create?.apply(this,args);
      if(result&&typeof result.then==='function')result.then(()=>request?.ready(),error=>request?.creationError(error));
      else request?.ready();
    } catch(error) { request?.creationError(error); }
  };
  if(update)scene.update=function(...args) { if(this._assetsReady)return update.apply(this,args); };
}

