import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { installSceneAssetLoading, optionalSceneAsset } from '../../src/core/sceneAssetLoading.js';
import { beginAssetGroup, registerSceneImage, retireAssetGroup, trimSceneImages } from '../../src/core/sceneAssetCache.js';
import { LevelManager } from '../../src/core/LevelManager.js';
import { ProgressStore } from '../../src/core/ProgressStore.js';

function fixture({optional=false,asyncCreate=null}={}) {
  const images=new Map(), calls=[], events=new EventEmitter();
  const screen={begin(){calls.push('begin');},progress(){},retrying(){calls.push('retrying');},
    cancel(){calls.push('cancel');},ready(){calls.push('ready');},fail(_scene,retry){calls.push('failed');this.retry=retry;}};
  const textures={exists:key=>images.has(key),get:key=>({getSourceImage:()=>images.get(key)}),remove:key=>images.delete(key)};
  const loader=new EventEmitter();
  loader.prefix='';loader.isLoading=()=>true;
  loader.image=config=>{calls.push({retry:config});loader.emit('addfile',config.key,'image',loader,{key:config.key,type:'image'});};
  const scene={
    game:{services:{sceneLoading:screen}},sys:{settings:{key:'Study',data:{from:'Hall'}}},
    textures,input:{enabled:true,keyboard:{enabled:true}},load:loader,events,
    scene:{restart(data){calls.push({restart:data});}},
    preload(){
      loader.emit('addfile','Study_render_lights-1_v12','image',loader,{key:'Study_render_lights-1_v12',type:'image'});
      if(optional){optionalSceneAsset(this,'Study_render_drawer-0_v12');
        loader.emit('addfile','Study_render_drawer-0_v12','image',loader,{key:'Study_render_drawer-0_v12',type:'image'});}
    },
    create(){calls.push('create');return asyncCreate;}, update(){calls.push('update');},
  };
  installSceneAssetLoading(scene);
  return {scene,images,calls,screen,loader};
}

test('a missing room image never creates an interactive black scene; Retry restores keyboard input',t=>{
  t.mock.method(console,'warn',()=>{});
  const f=fixture();f.scene.preload();f.scene.create();f.scene.update();
  assert.ok(f.calls.includes('failed'));
  assert.ok(!f.calls.includes('create'));
  assert.ok(!f.calls.includes('update'));
  assert.equal(f.scene.input.keyboard.enabled,false);
  f.screen.retry();
  assert.deepEqual(f.calls.at(-1),{restart:{from:'Hall'}});
  f.scene.events.emit('shutdown');
  f.scene.preload();
  f.images.set('Study_render_lights-1_v12',{width:1280,height:720});
  f.scene.create();f.scene.update();
  assert.equal(f.scene.input.keyboard.enabled,true);
  assert.ok(f.calls.includes('create'));
  assert.ok(f.calls.includes('ready'));
  assert.ok(f.calls.includes('update'));
});

test('an unavailable secondary frame does not suppress the room background',()=>{
  const f=fixture({optional:true});f.scene.preload();
  f.images.set('Study_render_lights-1_v12',{width:1280,height:720});
  f.scene.create();
  assert.ok(f.calls.includes('create'));
  assert.ok(!f.calls.includes('failed'));
});

test('transient image failures queue bounded retries using the same subdirectory URL',t=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'document',{value:{baseURI:'https://example.invalid/puzzle/'},configurable:true});
  t.after(()=>{if(descriptor)Object.defineProperty(globalThis,'document',descriptor);else delete globalThis.document;});
  const f=fixture();f.scene.preload();
  const failed={key:'Study_render_lights-1_v12',type:'image',src:'assets/images/Room1/plate.webp'};
  f.loader.emit('loaderror',failed);f.loader.emit('loaderror',failed);f.loader.emit('loaderror',failed);
  const retried=f.calls.filter(call=>call.retry);
  assert.equal(retried.length,2);
  assert.equal(retried[0].retry.url,'https://example.invalid/puzzle/assets/images/Room1/plate.webp');
  f.scene.events.emit('shutdown');
  f.loader.emit('loaderror',failed);
  assert.equal(f.calls.filter(call=>call.retry).length,2);
});

test('a font-delayed scene that has been left cannot mark a later load ready',async()=>{
  let resolve;
  const pending=new Promise(done=>{resolve=done;});
  const f=fixture({asyncCreate:pending});f.scene.preload();
  f.images.set('Study_render_lights-1_v12',{width:1280,height:720});
  f.scene.create();
  assert.ok(!f.calls.includes('ready'));
  f.scene.events.emit('shutdown');
  resolve();await pending;await Promise.resolve();
  assert.ok(!f.calls.includes('ready'));
});

test('image cache retires old room textures while preserving active room textures',()=>{
  const images=new Map(),removed=[];
  const textures={exists:key=>images.has(key),get:key=>({getSourceImage:()=>images.get(key)}),
    remove:key=>{removed.push(key);images.delete(key);}};
  const game={};
  const old={game,textures,sys:{settings:{key:'Study'}}},current={game,textures,sys:{settings:{key:'Room2'}}};
  images.set('Study_render_lights-1_v12',{width:4096,height:4096});
  images.set('Room2_render_lights-1_v11',{width:4096,height:4096});
  beginAssetGroup(old);registerSceneImage(old,'Study_render_lights-1_v12');retireAssetGroup(old);
  beginAssetGroup(current);registerSceneImage(current,'Room2_render_lights-1_v11');
  trimSceneImages(current);
  assert.deepEqual(removed,['Study_render_lights-1_v12']);
  assert.equal(images.has('Room2_render_lights-1_v11'),true);
});

test('leaving an in-flight preload stops it before the destination scene starts',()=>{
  const definitions=[{id:'binarytree',key:'BinaryTree',code:'CABBAGE'}];
  const places=[{key:'Study',holds:['binarytree']},{key:'Room2',holds:[]}];
  const levels=new LevelManager(definitions,new ProgressStore(null,definitions),places);
  const calls=[];
  levels.attach({scene:{keys:{Study:{load:{isLoading:()=>true}}},isActive:()=>false,
    stop:key=>calls.push(['stop',key]),start:key=>calls.push(['start',key])}});
  levels.enterPlace('Room2');
  assert.deepEqual(calls,[['stop','Study'],['start','Room2']]);
});

test('loader timeouts enter the failure path and leaving aborts unfinished downloads',()=>{
  const f=fixture();f.scene.preload();let errors=0,aborted=0,completed=0;
  const file={key:'Study_render_lights-1_v12',type:'image',
    xhrSettings:{timeout:0},
    load(){this.xhrLoader={readyState:1,abort(){aborted++;}};},
    onError(){errors++;},onProcessComplete(){completed++;}};
  f.loader.emit('addfile',file.key,file.type,f.loader,file);file.load();
  assert.equal(file.xhrSettings.timeout,120000);
  file.xhrLoader.ontimeout();assert.equal(errors,1);
  f.scene.events.emit('shutdown');
  assert.equal(aborted,1);
  assert.equal(file.xhrLoader.ontimeout,null);
  file.onProcessComplete();assert.equal(completed,0);
});

