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
    this.camera=this.scene.getObjectByProperty('isCamera',true)??gltf.cameras[0];
    this.baseFov=this.camera.fov;
    this.envelope=this.scene.getObjectByName('envelope');
    this.letter=this.scene.getObjectByName('letter');
    const envelopeTrack=gltf.animations.flatMap(clip=>clip.tracks).find(track=>track.name===`${this.envelope.name}.position`);
    this.envelopeEnd=new THREE.Vector3();
    if(envelopeTrack)this.envelopeEnd.fromArray(envelopeTrack.values,envelopeTrack.values.length-3);
    this.envelopeRest=new THREE.Vector3(-2.3,0,.3);
    this.restRotation=new THREE.Quaternion();
    this.frameBox=new THREE.Box3();this.framePoint=new THREE.Vector3();
    this.envelopeLayout=new THREE.Group();
    this.envelope.parent.add(this.envelopeLayout);this.envelopeLayout.add(this.envelope);
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
    this.width=Math.max(1,width);this.height=Math.max(1,height);
    const ratio=Math.min(2,window.devicePixelRatio||1);
    if(this.renderer.getPixelRatio()!==ratio)this.renderer.setPixelRatio(ratio);
    // CSS owns the full dialog surface; only resize the drawing buffer here.
    this.renderer.setSize(this.width,this.height,false);
    this.pose(this.time);
  }

  pose(time) {
    this.time=Math.max(0,Math.min(animation.duration,time));
    for(const a of this.actions)a.reset().play();
    this.mixer.setTime(this.time);
    // Keep the spent envelope on the desk beside the sheet. The exported
    // push-aside path ended outside the camera and left a clipped corner.
    const travel=this.envelopeEnd.lengthSq();
    if(travel){
      const aside=THREE.MathUtils.clamp(this.envelope.position.dot(this.envelopeEnd)/travel,0,1);
      // Offset a separate parent: changing a mixer-bound transform would
      // accumulate corrections whenever the same frame is rendered again.
      this.envelopeLayout.quaternion.copy(this.envelope.quaternion).invert().slerp(this.restRotation,1-aside);
      const animated=this.framePoint.copy(this.envelope.position).applyQuaternion(this.envelopeLayout.quaternion);
      this.envelopeLayout.position.copy(this.envelopeRest).multiplyScalar(aside).sub(animated);
    }
    const aspect=this.width/this.height,progress=this.time/animation.duration;
    // The envelope and open page keep their full width on narrow screens.
    const expansion=THREE.MathUtils.lerp(Math.max(1,.99/aspect),Math.max(1,.66/aspect),progress);
    this.camera.aspect=aspect;
    this.camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(this.baseFov/2))*expansion));
    this.camera.clearViewOffset();this.scene.updateMatrixWorld(true);
    this.camera.updateWorldMatrix(true,false);
    if(this.time>=animation.arrival)this.frameSubjects();
    this.camera.updateProjectionMatrix();
    this.renderer.setRenderTarget(null);this.renderer.setScissorTest(false);
    this.renderer.setViewport(0,0,this.width,this.height);
    this.renderer.render(this.scene,this.camera);
    this.canvas.dataset.frame=String(Math.round(this.time*animation.fps));
  }

  // Frame the moving meshes, including the raised flap, rather than only
  // the closed envelope's original rectangle. Shift the lens only as far
  // as needed; widen it only when the subjects cannot fit at the authored FOV.
  frameSubjects() {
    let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
    for(const subject of [this.envelope,this.letter]){
      const box=this.frameBox.setFromObject(subject);
      for(let i=0;i<8;i++){
        const p=this.framePoint.set(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z)
          .applyMatrix4(this.camera.matrixWorldInverse);
        const depth=Math.max(.01,-p.z),x=p.x/depth,y=p.y/depth;
        left=Math.min(left,x);right=Math.max(right,x);bottom=Math.min(bottom,y);top=Math.max(top,y);
      }
    }
    const padding=Math.min(32,this.width*.04,this.height*.04);
    const safeX=1-2*padding/this.width,safeY=1-2*padding/this.height,aspect=this.width/this.height;
    const tangent=Math.max(Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2)),
      (right-left)/(2*aspect*safeX),(top-bottom)/(2*safeY));
    const halfX=tangent*aspect,halfY=tangent;
    const centreX=THREE.MathUtils.clamp(0,right-halfX*safeX,left+halfX*safeX);
    const centreY=THREE.MathUtils.clamp(0,top-halfY*safeY,bottom+halfY*safeY);
    this.camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(tangent));
    this.camera.setViewOffset(this.width,this.height,
      centreX*this.width/(2*halfX),-centreY*this.height/(2*halfY),this.width,this.height);
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
