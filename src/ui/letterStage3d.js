import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import animation from './letterAnimation.json';

const base=`${import.meta.env.BASE_URL}assets/images/CaseFile/letter/`;
let prepared=null;
export function prepareLetterModel() {
  prepared??=fetch(base+animation.model).then(r=>r.ok?r.arrayBuffer():null).catch(()=>null)
    .then(bytes=>{if(!bytes)prepared=null;return bytes;});
  return prepared;
}

export async function createLetterStage(canvas) {
  const bytes=await prepareLetterModel();
  if(!bytes)return null;
  const gltf=await new GLTFLoader().parseAsync(bytes.slice(0),base);
  return new LetterStage(canvas,gltf);
}

class LetterStage {
  constructor(canvas,gltf) {
    this.canvas=canvas;
    this.scene=gltf.scene;
    this.camera=gltf.cameras[0];
    this.baseFov=this.camera.fov;
    this.envelope=this.scene.getObjectByName('envelope');
    this.letter=this.scene.getObjectByName('letter');
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    const r=this.renderer;
    r.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
    r.setClearColor(0x080604,1);r.outputColorSpace=THREE.SRGBColorSpace;
    r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=.98;
    r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFShadowMap;
    const pmrem=new THREE.PMREMGenerator(r),room=new RoomEnvironment();
    this.environment=pmrem.fromScene(room,.04).texture;
    room.dispose();pmrem.dispose();
    this.scene.environment=this.environment;this.scene.environmentIntensity=.28;
    this.scene.add(new THREE.HemisphereLight(0xc8c7bc,0x2e2116,.45));
    const warm=new THREE.DirectionalLight(0xffd4a0,2.6);warm.position.set(-3.4,3.6,-2.4);
    warm.castShadow=true;warm.shadow.mapSize.set(2048,2048);warm.shadow.radius=4;
    Object.assign(warm.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:24});
    warm.shadow.bias=-.00025;warm.shadow.normalBias=.008;
    this.scene.add(warm,warm.target);
    const moon=new THREE.DirectionalLight(0xa5c1ec,.55);moon.position.set(6.5,7,4);this.scene.add(moon);
    this.scene.traverse(o=>{
      if(!o.isMesh)return;
      o.castShadow=!['desk','writing_bed'].includes(o.name);o.receiveShadow=true;
      for(const m of [].concat(o.material)) {
        m.side=THREE.DoubleSide;m.shadowSide=THREE.FrontSide;
        const paper=m.name.startsWith('letter')||m.name.startsWith('envelope');
        if(m.normalScale)m.normalScale.setScalar(paper ? .28 : .55);
        for(const key of ['map','normalMap','roughnessMap'])if(m[key])m[key].anisotropy=8;
      }
    });
    this.mixer=new THREE.AnimationMixer(this.scene);
    this.actions=gltf.animations.map(clip=>{
      const a=this.mixer.clipAction(clip);a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;return a;
    });
    this.time=0;this.width=1;this.height=1;
  }

  fit(width,height) {
    this.width=width;this.height=height;
    this.renderer.setSize(width,height,false);
    this.pose(this.time);
  }

  pose(time) {
    this.time=Math.max(0,Math.min(animation.duration,time));
    for(const a of this.actions)a.reset().play();
    this.mixer.setTime(this.time);
    const aspect=this.width/this.height,progress=this.time/animation.duration;
    // The envelope and open page keep their full width on narrow screens.
    const expansion=THREE.MathUtils.lerp(Math.max(1,.99/aspect),Math.max(1,.66/aspect),progress);
    this.camera.aspect=aspect;
    this.camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(this.baseFov/2))*expansion));
    this.camera.updateProjectionMatrix();this.scene.updateMatrixWorld(true);
    this.renderer.render(this.scene,this.camera);
    this.canvas.dataset.frame=String(Math.round(this.time*animation.fps));
  }

  project(points) {
    return points.map(p=>{
      const q=p.project(this.camera);return {x:(q.x+1)*this.width/2,y:(1-q.y)*this.height/2};
    });
  }

  envelopeBounds() {
    const box=new THREE.Box3().setFromObject(this.envelope),points=[];
    for(let i=0;i<8;i++)points.push(new THREE.Vector3(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z));
    const p=this.project(points),xs=p.map(q=>q.x),ys=p.map(q=>q.y);
    return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
  }

  paperBounds() {
    const [w,h]=animation.letterSize;
    const p=this.project([[-w/2,0,-h/2],[w/2,0,-h/2],[w/2,0,h/2],[-w/2,0,h/2]]
      .map(p=>this.letter.localToWorld(new THREE.Vector3(...p))));
    return {x:p.reduce((s,q)=>s+q.x,0)/4,y:p.reduce((s,q)=>s+q.y,0)/4,
      w:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),h:Math.hypot(p[3].x-p[0].x,p[3].y-p[0].y),
      angle:THREE.MathUtils.radToDeg(Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x))};
  }

  dispose() {
    this.mixer.stopAllAction();this.mixer.uncacheRoot(this.scene);
    const geometries=new Set(),materials=new Set(),textures=new Set();
    this.scene.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of [].concat(o.material)){
      materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);
    }}});
    const images=new Set([...textures].map(t=>t.image));
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();
    for(const image of images)image?.close?.();
    this.environment.dispose();this.renderer.dispose();this.renderer.forceContextLoss();
  }
}
