import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { chime, noiseBurst } from "../../shared/paint.js";
import { KEYS, MOBILE, layoutCot, paintCot, releaseCot } from "./art.js";
import { cotPartPlace, loadCotPhotography } from "./photography.js";

const TUNE_S=5.9, MOBILE_SPEED=.14;
// the music box's own tune, recorded (assets/sounds/HisCot/musicbox.mp3): it
// plays when the box is touched, and stops when it is set down after being
// carried; louder than the other sounds, being a quiet recording
const MUSIC_BOX={key:"cot_musicbox",url:"assets/sounds/HisCot/musicbox.mp3",boost:1.7};
// how far a thing in the cot can be shifted from where it was put down —
// across the cot, and back or forward — and how high it is held up while it is
// carried (in the scene's units)
const REACH={a:.06,b:.1}, HELD=42;
// the dancers' turn while the tune plays, and the music box's key: turning as
// it plays, and fast while the box is held up (radians a second)
const DANCE_SPEED=1.8, KEY_PLAYING=2.6, KEY_HELD=7;
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

export default class CotScene extends BasePuzzleScene {
  constructor() { super({key:"Cot"}); }
  init(data) { this.skipFadeIn=data?.skipFade??true; }
  preload() {
    loadCotPhotography(this);
    if(!this.cache.audio.exists(MUSIC_BOX.key))this.load.audio(MUSIC_BOX.key,MUSIC_BOX.url);
  }
  create() {
    this.beginScene();
    const canvas = this.game.canvas;
    canvas.dataset.sceneColour = "natural";
    this._sceneCleanups.add(() => { delete canvas.dataset.sceneColour; });
    this._voices=[]; this._now=0; this._positions={}; this._dragging=null;
    this._state={dance:null,glint:null,lift:null,hat:null,bell:null,turn:0};
    this.input.dragDistanceThreshold=8;
    this._build(this.cameras.main.width,this.cameras.main.height);
    this.listenToResize(({width,height})=>{this._teardown();this._build(width,height);});
    if(!this.skipFadeIn)this.cameras.main.fadeIn(600,0,0,0);
  }

  _build(W,H) {
    const L=this._L=layoutCot(W,H,this);
    paintCot(this,L);
    this.add.image(0,0,KEYS.room).setOrigin(0).setDepth(-10);
    this._toys={};
    for(const definition of L.toys) {
      // where it was put down (`home`), and where it is now: a hand can shift
      // it a little, never far (REACH), so the five keep their order
      const saved=this._positions[definition.id]??{a:definition.a,b:definition.b};
      const t={...definition,home:{a:definition.a,b:definition.b},a:saved.a,b:saved.b,goal:{...saved},
        lift:0,vlift:0,tilt:0,vtilt:0,vx:0,hover:false,dragging:false,flat:definition.origin<.8};
      const at=L.at(t.a,t.b);t.x=at.x;t.y=at.y;
      const visual=this.add.image(0,0,KEYS.toy(t.id)).setOrigin(.5,t.origin).setDisplaySize(t.w,t.h);
      const img=this.add.container(t.x,t.y,[visual]).setSize(t.w,t.h).setDepth(2+t.b)
        .setName(`cot-${t.id}`).setData("interactionLabel",t.label)
        // (a container's hit area is measured from its top left corner, its
        // size centred on it: the thing's own extent, and a little above it)
        .setInteractive({hitArea:new Phaser.Geom.Rectangle(0,t.h*(.5-t.origin)-t.h*.12,t.w,t.h*1.16),
          hitAreaCallback:Phaser.Geom.Rectangle.Contains,cursor:"grab"});
      this.input.setDraggable(img);
      // under it, the dark where it touches the sheet; and the shadow it
      // casts, its own shape laid on the sheet away from the night-light
      t.shadow=this.add.image(t.x,t.y,KEYS.shadow).setTint(0x000000).setAlpha(.36)
        .setDisplaySize(t.w*.95,t.flat?t.h*.42:Math.max(7*L.u,t.h*.065)).setDepth(1);
      t.shadowScale={x:t.shadow.scaleX,y:t.shadow.scaleY};
      const source=this.textures.get(KEYS.toy(t.id)).getSourceImage(), cast=this.textures.get(KEYS.cast(t.id)).getSourceImage();
      const pad=(cast.width-source.width)/2;
      t.cast=this.add.image(t.x,t.y,KEYS.cast(t.id)).setDepth(1.1)
        .setOrigin((pad+source.width/2)/cast.width,(pad+source.height*t.origin)/cast.height)
        .setDisplaySize(t.w*cast.width/source.width,t.h*cast.height/source.height);
      t.castScale={x:t.cast.scaleX,y:t.cast.scaleY};
      t.img=img;t.visual=visual;this._toys[t.id]=t;
      img.on("pointerover",()=>{t.hover=true;});
      img.on("pointerout",()=>{t.hover=false;});
      img.on("pointerdown",()=>{t.moved=false;});
      img.on("pointerup",()=>{if(!t.moved)this._touch(t.id);});
      img.on("dragstart",pointer=>{
        t.dragging=true;this._dragging=t.id;
        t.grab={x:pointer.worldX,y:pointer.worldY,foot:L.at(t.a,t.b)};
        // taken up off the sheet: a soft sound of cloth
        noiseBurst(this,{dur:.16,freq:1400,q:.6,gain:.08,env:x=>Math.sin(Math.PI*x)});
      });
      img.on("drag",pointer=>{
        t.moved=true;
        const foot={x:t.grab.foot.x+pointer.worldX-t.grab.x,y:t.grab.foot.y+pointer.worldY-t.grab.y};
        t.goal=this._within(t,L.unproject(foot.x,foot.y));
      });
      img.on("dragend",()=>{
        t.dragging=false;this._dragging=null;
        if(t.moved)this._positions[t.id]={...t.goal};
        // the music box set down: its tune stops
        if(t.moved&&t.id==="musicbox")this._stopBox();
      });
    }
    const box=this._toys.musicbox;
    this._dancers=this._part(box,KEYS.dancers,-box.w*.028,-box.h*.37,box.h*.47,.5,.97);
    // and the same pair from the far side as the stage turns them away
    this._dancersBack=this._part(box,KEYS.dancers,-box.w*.028,-box.h*.37,box.h*.47,.5,.97).setFlipX(true).setAlpha(0);
    this._dancersScale=this._dancers.scaleX;
    // the winding key, in its place on the box's side, turning on its shaft
    const place=cotPartPlace(this,"key");
    if(place) {
      const kx=box.w/place.ow, ky=box.h/place.oh;
      this._key=this.add.image(-box.w/2+(place.x+place.w/2)*kx,-box.h*box.origin+(place.y+place.h/2)*ky,KEYS.windKey)
        .setDisplaySize(place.w*kx,place.h*ky);
      box.img.add(this._key);this._keyScaleY=this._key.scaleY;
    }
    const chap=this._toys.chaplin;
    this._hat=this._part(chap,KEYS.hat,0,-chap.h*.88,chap.w*.53/1.4,.5,.92);
    this._hatHome={x:this._hat.x,y:this._hat.y};
    const hotel=this._toys.hotel;
    this._windows=this.add.image(0,0,KEYS.windows).setOrigin(.5,hotel.origin).setDisplaySize(hotel.w,hotel.h)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    hotel.img.add(this._windows);
    this._glint=this.add.image(0,0,KEYS.glint).setTint(0xffe6a4).setDisplaySize(26*L.u,26*L.u)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this._toys.oscar.img.add(this._glint);
    this._threads=this.add.graphics().setDepth(4.4);
    this._hoop=this.add.image(L.mobile.x,L.mobile.y,KEYS.hoop).setDepth(4.45)
      .setDisplaySize(L.mobile.R*2,L.mobile.ry*2);
    this._felt=MOBILE.map((_,i)=>{
      const image=this.add.image(0,0,KEYS.mobile(i)).setDepth(4.5);
      const source=this.textures.get(KEYS.mobile(i)).getSourceImage();
      const h=L.mobile.size*(MOBILE[i]==="cloud"?.9:1.18);
      image.setDisplaySize(h*source.width/source.height,h);
      return {image,sx:image.scaleX,sy:image.scaleY,h};
    });
    this.add.image(0,0,KEYS.light).setOrigin(0).setDepth(9);
    this.add.image(0,0,KEYS.front).setOrigin(0).setDepth(10);
    this._built=true;this._pose();
  }

  _part(t,key,x,y,height,ox,oy) {
    const source=this.textures.get(key).getSourceImage();
    const part=this.add.image(x,y,key).setOrigin(ox,oy).setDisplaySize(height*source.width/source.height,height);
    t.img.add(part);return part;
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
      s.lift={from:now};
      noiseBurst(this,{dur:.32,freq:2600,q:.8,gain:.2,env:x=>Math.sin(Math.PI*x)**1.4});
    } else if(id==="chaplin") {
      if(!s.hat)s.hat={from:now};
    } else if(id==="hotel") {
      s.bell={from:now};chime(this,[[2349.3,.11],[4698.6,.03],[3520,.025]],1.4);
    }
  }

  // the recorded tune, from its start; false if there is none to play
  _playBox() {
    const audio=this.services.audio;
    this._box??=audio.addSceneSound(this,MUSIC_BOX.key,{channel:"sfx",gain:1});
    if(!this._box)return false;
    this.tweens.killTweensOf(this._box);
    this._box.stop();
    this._box.play();
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
        // the rest of the turn they were in, slowing, to stand facing the room
        s.dance.rest??=Math.ceil(s.dance.angle/(Math.PI*2))*Math.PI*2;
        s.dance.angle+=(s.dance.rest-s.dance.angle)*(1-Math.exp(-dt*2.5));
        if(Math.abs(s.dance.rest-s.dance.angle)<.03)s.dance=null;
      }
    }
    if(this.ambientMotion&&!this.reducedMotion)s.turn+=dt*MOBILE_SPEED;
    // the key: turning while the box plays, fast while it is held up; let be,
    // it comes to rest flat
    const ks=this._keySpin??={angle:0,speed:0,click:0}, boxHeld=this._toys.musicbox?.dragging;
    const want=this.reducedMotion?0:(boxHeld?KEY_HELD:0)+(s.dance?.playing?KEY_PLAYING:0);
    ks.speed+=(want-ks.speed)*(1-Math.exp(-dt*3));
    if(want>0||ks.speed>.3) {
      ks.angle+=ks.speed*dt;
      // a soft tick of its ratchet each half turn, while it is wound in the hand
      if(boxHeld&&Math.floor(ks.angle/Math.PI)!==ks.click)noiseBurst(this,{dur:.025,type:"highpass",freq:3200,q:1,gain:.07,env:x=>(1-x)**4});
      ks.click=Math.floor(ks.angle/Math.PI);
    } else ks.angle+=(Math.round(ks.angle/Math.PI)*Math.PI-ks.angle)*(1-Math.exp(-dt*6));
    this._carry(dt);
    // where the eye is: the mobile, hanging in the air nearer it, sways the
    // other way as it moves, as near things do against far ones
    const p=this.input.activePointer, L=this._L, look=this._look??={x:0,y:0};
    const k=1-Math.exp(-dt*4), lx=this.reducedMotion?0:Phaser.Math.Clamp((p.x-L.W/2)/(L.W/2),-1,1), ly=this.reducedMotion?0:Phaser.Math.Clamp((p.y-L.H/2)/(L.H/2),-1,1);
    look.x+=(lx-look.x)*k;look.y+=(ly-look.y)*k;
    this._pose();
  }

  // a thing kept within reach of where it was put down
  _within(t,p) {
    const da=(p.a-t.home.a)/REACH.a, db=(p.b-t.home.b)/REACH.b, d=Math.hypot(da,db), k=d>1?1/d:1;
    return {a:t.home.a+da*k*REACH.a,b:t.home.b+db*k*REACH.b};
  }

  // each thing: following the hand when carried, held up off the sheet and
  // leaning back against the way it is carried; let go, it drops, bounces once
  // on the mattress and settles
  _carry(dt) {
    const L=this._L,u=L.u,still=this.reducedMotion;
    for(const t of Object.values(this._toys)) {
      const x0=L.at(t.a,t.b).x, follow=1-Math.exp(-dt*(t.dragging?24:14));
      t.a+=(t.goal.a-t.a)*follow;t.b+=(t.goal.b-t.b)*follow;
      t.vx+=((L.at(t.a,t.b).x-x0)/Math.max(dt,1e-3)-t.vx)*Math.min(1,dt*12);
      const held=t.dragging?HELD*u:t.hover?3*u:0;
      if(still){t.lift=held;t.tilt=0;continue;}
      const wasUp=t.lift;
      t.vlift+=(170*(held-t.lift)-(t.dragging?22:7.5)*t.vlift)*dt;t.lift+=t.vlift*dt;
      // the soft knock of it on the mattress, as it comes down
      if(!t.dragging&&wasUp>1.5*u&&t.lift<=0.4*u&&t.vlift<-60*u){
        noiseBurst(this,{dur:.12,type:"lowpass",freq:240,q:.7,gain:Math.min(.4,-t.vlift/(900*u)),env:x=>(1-x)**3});
      }
      const lean=t.dragging?Phaser.Math.Clamp(-t.vx/(2600*u),-.16,.16):0;
      t.vtilt+=(140*(lean-t.tilt)-9*t.vtilt)*dt;t.tilt+=t.vtilt*dt;
    }
  }

  _pose() {
    if(!this._built)return;
    const s=this._state,L=this._L,u=L.u,now=this._now,still=this.reducedMotion;
    const phase=(event,length)=>event?Math.min(1,(now-event.from)/length):1;
    const lift=phase(s.lift,.36);if(lift>=1)s.lift=null;
    for(const t of Object.values(this._toys)) {
      const at=L.at(t.a,t.b);t.x=at.x;t.y=at.y;
      const hop=!still&&t.id==="book"&&s.lift?Math.sin(Math.PI*lift)*9*u:0;
      const up=Math.max(0,t.lift)+hop, held=Math.min(1,up/(HELD*u));
      // nearer the front, a little larger; held up, nearer the eye
      const scale=((.62+.36*t.b)/(.62+.36*t.home.b))**.8*(1+.07*held);
      t.img.setPosition(t.x,t.y-up).setScale(scale).setRotation(t.tilt).setDepth(t.dragging?7:2+t.b);
      // held up, its shadow spreads into a soft pool on the sheet under it
      const pool=t.flat?1+.35*held:1+2.4*held;
      t.shadow.setPosition(t.x+3*u,t.y+2*u).setScale(t.shadowScale.x*scale*(1+.12*held),t.shadowScale.y*scale*pool)
        .setAlpha(.4*(1-.15*held));
      // its cast shadow stays on the sheet: an upright thing's falls forward
      // and to the left of its foot; a flat thing's lies under it, and moves
      // off from it as it is lifted
      if(t.flat) t.cast.setPosition(t.x-(3*u+up*.8),t.y+2*u+up*.55).setScale(t.castScale.x*scale,t.castScale.y*scale)
        .setRotation(t.tilt*.6).setAlpha(.3*(1-.45*held));
      else t.cast.setPosition(t.x+1*u,t.y+1*u).setScale(t.castScale.x*scale*(1+.2*held),-t.castScale.y*scale*.22*(1+.2*held))
        .setRotation(.5).setAlpha(.17*(1-.5*held));
    }
    // the dancers turning on their stage: narrower seen from the side, their far
    // side coming round as their near side goes, a little in shadow side-on
    const turn=still||!s.dance?0:s.dance.angle, c=Math.cos(turn), side=Math.abs(c);
    const near=Phaser.Math.Clamp((c+.16)/.32,0,1), width=this._dancersScale*(.6+.4*side);
    const shade=v=>{const n=Math.round(v);return (n<<16)|(n<<8)|n;};
    this._dancers.setScale(width,this._dancers.scaleY).setAlpha(near).setTint(shade(196+59*side));
    this._dancersBack.setScale(width,this._dancersBack.scaleY).setAlpha(1-near).setTint(shade(170+55*side));
    if(this._key) {
      const k=Math.cos(this._keySpin?.angle??0);
      this._key.setScale(this._key.scaleX,this._keyScaleY*(Math.abs(k)<.04?Math.sign(k||1)*.04:k)).setTint(shade(150+105*Math.abs(k)));
    }
    const g=phase(s.glint,.9);if(g>=1)s.glint=null;
    const oscar=this._toys.oscar;
    this._glint.setPosition(-oscar.w*.1,-oscar.h*(.83-.58*g)).setAlpha(s.glint?Math.sin(Math.PI*g)*.9:0);
    const h=phase(s.hat,1.1);if(h>=1)s.hat=null;
    const raise=s.hat&&!still?Math.sin(Math.PI*Math.min(1,h*1.25)):0,chap=this._toys.chaplin;
    this._hat.setPosition(this._hatHome.x+raise*6*chap.px,this._hatHome.y-raise*17*chap.px).setRotation(-raise*.32);
    const b=phase(s.bell,1.8);if(b>=1)s.bell=null;
    this._windows.setAlpha(s.bell?Math.min(1,b*10)*(1-b)**1.3:.0);
    const look=this._look??{x:0,y:0}, mx=m0=>m0-look.x*12*u, my=m0=>m0-look.y*4*u;
    const m={...L.mobile,x:mx(L.mobile.x),y:my(L.mobile.y)}, th=this._threads.clear();
    const moving=!still&&this.ambientMotion, bank=moving?Math.sin(now*.48)*.009+look.x*.009:0;
    const orbit=a=>{
      const x=Math.sin(a)*m.R, y=Math.cos(a)*m.ry*.78;
      return {x:m.x+x*Math.cos(bank)-y*Math.sin(bank),y:m.y+x*Math.sin(bank)+y*Math.cos(bank)};
    };
    const thread=(x0,y0,x1,y1,alpha=.65)=>{
      th.lineStyle(Math.max(.9,1.5*u),0x211710,alpha*.6).lineBetween(x0+.5*u,y0,x1+.5*u,y1);
      th.lineStyle(Math.max(.55,.72*u),0xc7b79d,alpha).lineBetween(x0,y0,x1,y1);
    };
    this._hoop.setPosition(m.x,m.y).setRotation(bank);
    for(const a of [-Math.PI/2,Math.PI/6,Math.PI*5/6]) {
      const p=orbit(a); thread(L.mobile.x,L.H*.037,p.x,p.y,.7);
    }
    MOBILE.forEach((_,i)=>{
      const a=s.turn+i/MOBILE.length*Math.PI*2,c=Math.cos(a),p=orbit(a),felt=this._felt[i];
      const sway=moving?Math.sin(now*.9+i*1.4)*2.5*u:0;
      const x=p.x+sway,y=p.y+m.drop[i]+(moving?Math.sin(now*.8+i)*1.2*u:0);
      thread(p.x,p.y,x,y-felt.h*.45,.62);
      const depthScale=1+c*.035;
      felt.image.setPosition(x,y).setScale(felt.sx*depthScale,felt.sy*depthScale)
        .setRotation(moving?Math.sin(now*.9+i*1.4)*.045:0).setDepth(4.5+c*.02).setAlpha(.94+.06*c);
    });
  }

  _teardown() {
    this._built=false;this._dragging=null;
    this.tweens.killAll();
    for(const object of this.children.list.slice())object.destroy();
    releaseCot(this.textures);
  }
  shutdown() {
    this._built=false;this.tweens.killAll();
    for(const o of this._voices??[]){try{o.stop();}catch{/* already stopped */}}
    this._voices=[];
    // the tune stops with the room
    try{this._box?.stop();}catch{/* already gone */}
    this._box=null;releaseCot(this.textures);
  }
}
