import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { chime, noiseBurst } from "../../shared/paint.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { KEYS, layoutCot, paintCot, releaseCot, loadCotArt } from "./nativeArt.js";
import { TOYS } from "./puzzle.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "HIS COT"  ·  code: TORCH  ·  the boy's cot, in Room VI
//
// An original Blender/Cycles nursery, with fifteen modeled belongings on
// woven cotton. The five clues and sewn mobile are live three.js meshes,
// using the render's exact physical camera and native material scans:
//
//   a music box, a couple dancing the tango on it      Tango
//   a little gold Oscar on its base                     Oscar
//   the book of Romeo and Juliet                        Romeo
//   a figure of Charlie Chaplin                         Charlie
//   a toy hotel                                         Hotel   →   TORCH
//
// Each can be taken up and carried a little way, never far; touched, the box
// plays its tango while its dancers turn and its key unwinds, the gold man
// catches the light, the book opens, Chaplin raises his bowler, the hotel's
// bell rings and its windows light. Nothing on screen says what they are for.
// ─────────────────────────────────────────────────────────────────────────────

const TUNE_S=5.9, MOBILE_SPEED=.14;
// the music box's own tune, recorded (assets/sounds/HisCot/musicbox.mp3): it
// plays when the box is touched, and stops when it is set down after being
// carried; louder than the other sounds, being a quiet recording; played from
// its first note (the recording opens on two thirds of a second of silence)
const MUSIC_BOX={key:"cot_musicbox",url:"assets/sounds/HisCot/musicbox.mp3",boost:1.7,start:.64};
// how far a thing in the cot can be shifted from where it was put down —
// across the cot, and back or forward — and how high it is held up off the
// sheet while carried, or as the hand comes over it (in metres)
const REACH={a:.06,b:.1}, HELD=.05, HOVER=.005;
// the dancers' turn while the tune plays, and the music box's key: turning as
// it plays, and fast while the box is held up (radians a second)
const DANCE_SPEED=1.8, KEY_PLAYING=2.6, KEY_HELD=7;
// the picture the five are drawn on, three-dimensionally, every frame they move
const STAGE="cot_stage";
const TUNE = [
  [659.26, 0, 0.375], [698.46, 0.375, 0.125], [659.26, 0.5, 0.25], [622.25, 0.75, 0.25],
  [659.26, 1, 0.5], [523.25, 1.5, 0.25], [440, 1.75, 0.25],
  [493.88, 2, 0.375], [523.25, 2.375, 0.125], [493.88, 2.5, 0.25], [466.16, 2.75, 0.25],
  [493.88, 3, 0.5], [415.3, 3.5, 0.25], [329.63, 3.75, 0.25],
  [440, 4, 0.375], [493.88, 4.375, 0.125], [523.25, 4.5, 0.25], [587.33, 4.75, 0.25],
  [659.26, 5, 0.25], [880, 5.25, 0.6],
  [220, 0, 0.5, 0.5], [164.81, 0.75, 0.25, 0.5], [220, 1, 0.5, 0.5], [164.81, 1.75, 0.25, 0.5],
  [164.81, 2, 0.5, 0.5], [123.47, 2.75, 0.25, 0.5], [164.81, 3, 0.5, 0.5], [207.65, 3.75, 0.25, 0.5],
  [220, 4, 0.5, 0.5], [164.81, 4.75, 0.25, 0.5], [220, 5.25, 0.6, 0.5],
];
const ease=k=>k<.5?2*k*k:1-(-2*k+2)**2/2;

export default class CotScene extends BasePuzzleScene {
  constructor() { super({key:"Cot"}); }
  init(data) { this.skipFadeIn=data?.skipFade??true; }
  preload() {
    loadCotArt(this);
    if(!this.cache.audio.exists(MUSIC_BOX.key))this.load.audio(MUSIC_BOX.key,MUSIC_BOX.url);
  }
  create() {
    this.beginScene();
    const canvas = this.game.canvas;
    canvas.dataset.sceneColour = "natural";
    this._sceneCleanups.add(() => { delete canvas.dataset.sceneColour; });
    this._voices=[]; this._now=0; this._positions={}; this._dragging=null;
    this._state={dance:null,glint:null,open:null,hat:null,bell:null,turn:0};
    this._keySpin={angle:0,speed:0,click:0};
    this.input.dragDistanceThreshold=8;
    // the five, in three dimensions: three.js comes with this level alone
    import("./stage3d.js").then(({CotStage})=>{
      if(!this.sys.isActive())return;
      this._stage=new CotStage(TOYS.map(t=>t.id),{
        atlas:this.textures.get(KEYS.materials).getSourceImage(),
      });
      this._sceneCleanups.add(()=>{this._stage?.dispose();this._stage=null;});
      this._build(this.cameras.main.width,this.cameras.main.height);
      this.listenToResize(({width,height})=>{this._teardown();this._build(width,height);});
    });
    if(!this.skipFadeIn)this.cameras.main.fadeIn(600,0,0,0);
  }

  _build(W,H) {
    const L=this._L=layoutCot(W,H,this), stage=this._stage;
    paintCot(this,L);
    // the five: drawn by the stage in the mattress's own perspective, onto a
    // picture laid over the photograph (under the mobile, the night and the rail)
    stage.fit(W,H,L);
    if(this.textures.exists(STAGE))this.textures.remove(STAGE);
    this._stageTexture=this.textures.addImage(STAGE,stage.canvas);
    this.add.image(0,0,STAGE).setOrigin(0).setDisplaySize(W,H).setDepth(3);
    this._toys={};
    for(const definition of L.toys) {
      // where it was put down (`home`), and where it is now: a hand can shift
      // it a little, never far (REACH), so the five keep their order
      const saved=this._positions[definition.id]??{a:definition.a,b:definition.b};
      const t={id:definition.id,home:{a:definition.a,b:definition.b},a:saved.a,b:saved.b,goal:{...saved},
        lift:0,vlift:0,tilt:0,vtilt:0,vx:0,hover:false,dragging:false,moved:false};
      // what the hand finds it by: the box it takes up on the screen, kept to it as it moves
      const zone=t.zone=this.add.zone(0,0,8,8).setOrigin(0).setDepth(6)
        .setName(`cot-${t.id}`).setData("interactionLabel",definition.label).setInteractive({cursor:"grab"});
      this.input.setDraggable(zone);
      zone.on("pointerover",()=>{t.hover=true;});
      zone.on("pointerout",()=>{t.hover=false;});
      zone.on("pointerdown",()=>{t.moved=false;});
      zone.on("pointerup",()=>{if(!t.moved)this._touch(t.id);});
      zone.on("dragstart",pointer=>{
        t.dragging=true;this._dragging=t.id;
        t.grab={at:stage.plane(pointer.x,pointer.y),a:t.a,b:t.b};
        // taken up off the sheet: a soft sound of cloth
        noiseBurst(this,{dur:.16,freq:1400,q:.6,gain:.08,env:x=>Math.sin(Math.PI*x)});
      });
      zone.on("drag",pointer=>{
        t.moved=true;
        const p=stage.plane(pointer.x,pointer.y);
        if(p&&t.grab.at)t.goal=this._within(t,{a:t.grab.a+p.a-t.grab.at.a,b:t.grab.b+p.b-t.grab.at.b});
      });
      zone.on("dragend",()=>{
        t.dragging=false;this._dragging=null;
        if(t.moved)this._positions[t.id]={...t.goal};
        // the music box set down: its tune stops
        if(t.moved&&t.id==="musicbox")this._stopBox();
      });
      this._toys[t.id]=t;
    }
    // the five glint, as the things that answer a hand do everywhere in the
    // house — the rest of his belongings do not (they are in the photograph)
    this._sparkles=Object.values(this._toys).map(t=>attachMovableSparkles(this,t.zone,{padding:3,enabled:()=>!t.dragging}));
    this._built=true;this._dirty=true;this._pose();
  }

  _touch(id) {
    const s=this._state, now=this._now;
    if(id==="musicbox") {
      if(s.dance?.playing)return; // it plays its tune through
      s.dance={from:now,angle:s.dance?.angle??0,playing:true};
      if(!this._playBox())this._tune();
    } else if(id==="oscar") {
      s.glint={from:now};chime(this,[[1567.98,.05],[2349.32,.03],[3135.96,.015]],.9);
    } else if(id==="book") {
      if(s.open)return;
      s.open={from:now};
      noiseBurst(this,{dur:.32,freq:2600,q:.8,gain:.2,env:x=>Math.sin(Math.PI*x)**1.4});
    } else if(id==="chaplin") {
      if(!s.hat)s.hat={from:now};
    } else if(id==="hotel") {
      s.bell={from:now};chime(this,[[2349.3,.11],[4698.6,.03],[3520,.025]],1.4);
    }
    this._dirty=true;
  }

  // the recorded tune, from its start; false if there is none to play
  _playBox() {
    const audio=this.services.audio;
    this._box??=audio.addSceneSound(this,MUSIC_BOX.key,{channel:"sfx",gain:1});
    if(!this._box)return false;
    this.tweens.killTweensOf(this._box);
    this._box.stop();
    this._box.play({seek:MUSIC_BOX.start});
    this.refreshSfxVolume();
    this._box.once("complete",()=>{if(this._state.dance)this._state.dance.playing=false;});
    return true;
  }

  // set down: the tune fades in a breath and stops, the dancers slow and stand
  _stopBox() {
    const s=this._state;
    if(s.dance)s.dance.playing=false;
    for(const o of this._voices){try{o.stop();}catch{/* already stopped */}}
    this._voices=[];
    const box=this._box;
    if(!box?.isPlaying)return;
    this.tweens.add({targets:box,volume:0,duration:280,onComplete:()=>box.stop()});
  }

  // the audio manager's call when the effects' volume changes: the music box
  // kept at its own boost over it
  refreshSfxVolume() {
    const st=this.services?.audio?.state;
    if(this._box?.isPlaying&&st)this._box.setVolume(st.sfxVol*MUSIC_BOX.boost);
  }

  _tune() {
    const ac = this.sound?.context, st = this.services?.audio?.state;
    if (!ac || st?.muted) return;
    const vol = (st ? st.sfxVol : 0.8) * 0.11, t0 = ac.currentTime + 0.05;
    try {
      for (const [f, at, len, k = 1] of TUNE) {
        const ring = Math.max(0.7, len * 2.4);
        for (const [mult, part] of [[1, 1], [2.01, 0.32], [4.2, 0.07]]) {
          const o = ac.createOscillator(), g = ac.createGain();
          o.type = "sine"; o.frequency.value = f * mult;
          g.gain.setValueAtTime(0.0001, t0 + at);
          g.gain.exponentialRampToValueAtTime(vol * k * part, t0 + at + 0.006);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + ring / mult ** 0.3);
          o.connect(g); g.connect(this.sound.destination);
          o.start(t0 + at); o.stop(t0 + at + ring + 0.05);
          this._voices.push(o);
          o.onended = () => { const i = this._voices.indexOf(o); if (i >= 0) this._voices.splice(i, 1); };
        }
      }
    } catch {
      // no music, then
    }
  }

  update(_,delta) {
    if(!this._built)return;
    const dt=Math.min(delta||16,50)/1000,s=this._state;
    this._now+=dt;
    if(s.dance) {
      const t=this._now-s.dance.from;
      // turning while it plays (the recorded tune, or the drawn one for TUNE_S),
      // then slowing round to face the room again
      if(s.dance.playing&&!this._box&&t>TUNE_S)s.dance.playing=false;
      if(s.dance.playing)s.dance.angle+=dt*DANCE_SPEED;
      else {
        s.dance.rest??=Math.ceil(s.dance.angle/(Math.PI*2))*Math.PI*2;
        s.dance.angle+=(s.dance.rest-s.dance.angle)*(1-Math.exp(-dt*2.5));
        if(Math.abs(s.dance.rest-s.dance.angle)<.03)s.dance=null;
      }
    }
    if(this.ambientMotion&&!this.reducedMotion)s.turn+=dt*MOBILE_SPEED;
    // the key: turning while the box plays, fast while it is held up; let be,
    // it comes to rest flat
    const ks=this._keySpin, boxHeld=this._toys.musicbox?.dragging;
    const want=this.reducedMotion?0:(boxHeld?KEY_HELD:0)+(s.dance?.playing?KEY_PLAYING:0);
    ks.speed+=(want-ks.speed)*(1-Math.exp(-dt*3));
    let turning=want>0||ks.speed>.3;
    if(turning) {
      ks.angle+=ks.speed*dt;
      // a soft tick of its ratchet each half turn, while it is wound in the hand
      if(boxHeld&&Math.floor(ks.angle/Math.PI)!==ks.click)noiseBurst(this,{dur:.025,type:"highpass",freq:3200,q:1,gain:.07,env:x=>(1-x)**4});
      ks.click=Math.floor(ks.angle/Math.PI);
    } else {
      const rest=Math.round(ks.angle/Math.PI)*Math.PI;
      turning=Math.abs(rest-ks.angle)>.002;
      ks.angle+=(rest-ks.angle)*(1-Math.exp(-dt*6));
    }
    const carrying=this._carry(dt);
    // where the eye is: the mobile, hanging in the air nearer it, sways the
    // other way as it moves, as near things do against far ones
    const p=this.input.activePointer, L=this._L, look=this._look??={x:0,y:0};
    const k=1-Math.exp(-dt*4), lx=this.reducedMotion?0:Math.max(-1,Math.min(1,(p.x-L.W/2)/(L.W/2))), ly=this.reducedMotion?0:Math.max(-1,Math.min(1,(p.y-L.H/2)/(L.H/2)));
    look.x+=(lx-look.x)*k;look.y+=(ly-look.y)*k;
    if(carrying||turning||s.dance||s.glint||s.open||s.hat||s.bell)this._dirty=true;
    this._pose();
  }

  // a thing kept within reach of where it was put down
  _within(t,p) {
    const da=(p.a-t.home.a)/REACH.a, db=(p.b-t.home.b)/REACH.b, d=Math.hypot(da,db), k=d>1?1/d:1;
    return {a:t.home.a+da*k*REACH.a,b:t.home.b+db*k*REACH.b};
  }

  // each thing: following the hand when carried, held up off the sheet and
  // leaning back against the way it is carried; let go, it drops, bounces once
  // on the mattress and settles. Whether anything is still moving.
  _carry(dt) {
    const still=this.reducedMotion;
    let moving=false;
    for(const t of Object.values(this._toys)) {
      const a0=t.a, follow=1-Math.exp(-dt*(t.dragging?24:14));
      t.a+=(t.goal.a-t.a)*follow;t.b+=(t.goal.b-t.b)*follow;
      t.vx+=((t.a-a0)*1.2/Math.max(dt,1e-3)-t.vx)*Math.min(1,dt*12);
      const held=t.dragging?HELD:t.hover?HOVER:0;
      if(still){t.lift=held;t.tilt=0;}
      else {
        const wasUp=t.lift;
        t.vlift+=(170*(held-t.lift)-(t.dragging?22:7.5)*t.vlift)*dt;t.lift+=t.vlift*dt;
        // the soft knock of it on the mattress, as it comes down
        if(!t.dragging&&wasUp>.002&&t.lift<=.0004&&t.vlift<-.08){
          noiseBurst(this,{dur:.12,type:"lowpass",freq:240,q:.7,gain:Math.min(.4,-t.vlift),env:x=>(1-x)**3});
        }
        // carried to the right, its top lags to the left
        const lean=t.dragging?Math.max(-.22,Math.min(.22,t.vx*1.4)):0;
        t.vtilt+=(140*(lean-t.tilt)-9*t.vtilt)*dt;t.tilt+=t.vtilt*dt;
      }
      if(Math.abs(t.goal.a-t.a)+Math.abs(t.goal.b-t.b)>1e-4||Math.abs(held-t.lift)>1e-4||Math.abs(t.vlift)>1e-3
        ||Math.abs(t.tilt)>1e-4||Math.abs(t.vtilt)>1e-3)moving=true;
    }
    return moving;
  }

  _pose() {
    if(!this._built)return;
    const s=this._state,L=this._L,u=L.u,now=this._now,still=this.reducedMotion,stage=this._stage;
    const phase=(event,length)=>event?Math.min(1,(now-event.from)/length):1;
    const look=this._look??{x:0,y:0};
    if(stage.poseMobile(s.turn,now,!still&&this.ambientMotion,look))this._dirty=true;
    if(this._dirty) {
      for(const t of Object.values(this._toys)) stage.place(t.id,{a:t.a,b:t.b,lift:Math.max(0,t.lift),tilt:t.tilt});
      const parts=id=>stage.toys[id].parts;
      // the dancers turning on their stage, the key on its shaft
      parts("musicbox").dancers.rotation.y=still||!s.dance?0:s.dance.angle;
      parts("musicbox").key.rotation.x=this._keySpin.angle;
      // the book: its cover lifted on its spine, held open a moment, let fall
      const o=phase(s.open,2.6);if(o>=1)s.open=null;
      const open=!s.open?0:still?1:o<.2?ease(o/.2):o<.8?1:1-ease((o-.8)/.2);
      parts("book").cover.rotation.z=open*2.15;
      // Chaplin's bowler, raised and put back
      const h=phase(s.hat,1.1);if(h>=1)s.hat=null;
      const raise=s.hat&&!still?Math.sin(Math.PI*Math.min(1,h*1.25)):0, hat=parts("chaplin").hat;
      hat.position.set(raise*.004,.118+raise*.015,-.001);hat.rotation.z=raise*.35;
      // the hotel: its windows lit up bright as its bell rings, the bell swinging
      const b=phase(s.bell,1.8);if(b>=1)s.bell=null;
      const pulse=s.bell?Math.min(1,b*10)*(1-b)**1.3:0;
      for(const m of parts("hotel").lights)m.emissiveIntensity=.55+pulse*2.4;
      parts("hotel").bell.rotation.z=s.bell&&!still?Math.sin(now*30)*(1-b)*.5:0;
      // the gold man's glint, carried down him
      const g=phase(s.glint,.9);if(g>=1)s.glint=null;
      const os=stage.toys.oscar.holder.position;
      stage.glint.position.set(os.x+.03,os.y+.17-.12*g,os.z+.05);
      stage.glint.intensity=s.glint?Math.sin(Math.PI*g)*3:0;
      stage.render();
      this._stageTexture.source[0].update();
      // what the hand finds each by, kept to where it now is
      for(const t of Object.values(this._toys)) {
        const r=stage.bounds(t.id), pad=4*u;
        t.zone.setPosition(r.x-pad,r.y-pad).setSize(r.w+pad*2,r.h+pad*2).setDepth(t.dragging?8:6+t.b*.1);
        t.zone.input.hitArea.setTo(0,0,r.w+pad*2,r.h+pad*2);
      }
      this._dirty=false;
    }
  }

  _teardown() {
    this._built=false;this._dragging=null;
    for(const off of this._sparkles??[])off();
    this._sparkles=[];
    this.tweens.killAll();
    for(const object of this.children.list.slice())object.destroy();
    if(this.textures.exists(STAGE))this.textures.remove(STAGE);
    releaseCot(this.textures);
  }
  shutdown() {
    this._built=false;this.tweens.killAll();
    for(const o of this._voices??[]){try{o.stop();}catch{/* already stopped */}}
    this._voices=[];
    // the tune stops with the room
    try{this._box?.stop();}catch{/* already gone */}
    this._box=null;
    if(this.textures.exists(STAGE))this.textures.remove(STAGE);
    releaseCot(this.textures);
  }
}
