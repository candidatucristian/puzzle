import Phaser from 'phaser';
import BasePuzzleScene from '../../core/BasePuzzleScene.js';
import {attachMovableSparkles} from '../../shared/movableSparkles.js';
import {COMPASS_BEARINGS} from './puzzle.js';
import {BOTTLE_KEYS as K,loadBottleCabin,layoutBottleCabin,bottleGlow} from './bottleCabin.js';

// A hand-built captain's study in an antique glass bottle. The complete
// photograph and all 72 changing compass poses are genuine Cycles renders,
// including the glass in front of the needle. No ship motion or painted room.
const SPIN=1400,SPIN_END=3200,HOLD=1400,ARRIVE=700,KICK=380;

export default class CompassScene extends BasePuzzleScene{
  constructor(){super({key:'Compass'});}
  init(data){this.skipFadeIn=data?.skipFade??true;}
  preload(){loadBottleCabin(this);}

  create(){
    this.beginScene();
    this.game.canvas.dataset.sceneColour='natural';
    this._sceneCleanups.add(()=>{delete this.game.canvas.dataset.sceneColour;});
    this._mapOpen=false;
    this._steps=program();
    this._needle={a:0,w:0,step:0,t:0,locked:false,shove:0};
    this._build(this.cameras.main.width,this.cameras.main.height);
    this.listenToResize(({width,height})=>{this._teardown();this._build(width,height);});
    if(!this.skipFadeIn)this.cameras.main.fadeIn(600,0,0,0);
  }

  _build(W,H){
    const L=this._L=layoutBottleCabin(W,H);
    this.add.image(L.x,L.y,K.room).setOrigin(0).setScale(L.s).setDepth(-10);
    this._needleImg=this.add.image(L.needle.x,L.needle.y,K.needle,0).setOrigin(0)
      .setDisplaySize(L.needle.size,L.needle.size).setDepth(-9);
    bottleGlow(this);
    this._lockGlow=this.add.image(L.compass.x,L.compass.y,K.glow).setDisplaySize(L.compass.r*.23,L.compass.r*.23)
      .setTint(0xffd09a).setBlendMode(Phaser.BlendModes.ADD).setDepth(-8).setAlpha(0);
    this._flameGlow=this.add.image(L.lantern.x,L.lantern.y,K.glow).setDisplaySize(29*L.u,33*L.u)
      .setTint(0xffbd79).setBlendMode(Phaser.BlendModes.ADD).setDepth(-8).setAlpha(.045);
    const c=L.compass;
    const glass=this.add.zone(c.x,c.y,c.r*2.25,c.r*2.25).setDepth(5)
      .setInteractive({hitArea:new Phaser.Geom.Circle(c.r*1.125,c.r*1.125,c.r*1.125),hitAreaCallback:Phaser.Geom.Circle.Contains,useHandCursor:true})
      .setData('interactionLabel','Tap the compass glass');
    glass.on('pointerdown',()=>this._tapGlass());
    const m=L.map,pad=Math.max(6,L.u*7);
    const map=this.add.zone(m.x,m.y,m.w+pad*2,m.h+pad*2).setDepth(5).setInteractive({useHandCursor:true})
      .setData('interactionLabel','Open the captain’s map');
    map.on('pointerdown',()=>this._letter.open());
    this._zones=[glass,map];
    this._sparkle=attachMovableSparkles(this,map,{padding:3,enabled:()=>!this._mapOpen&&!this.isSolved});
    this._buildMap(W,H);
    this._showNeedle();
  }

  _buildMap(W,H){
    const overlay=this.add.container(0,0).setDepth(60).setVisible(this._mapOpen);
    const dark=this.add.rectangle(0,0,W,H,0x040505,.87).setOrigin(0).setInteractive();
    const picture=this.add.image(W/2,H/2-7,K.map);
    const source=this.textures.get(K.map).getSourceImage();
    picture.setScale(Math.min(W*.95/source.width,H*.91/source.height));
    const caption=this.add.text(W/2,H-12,'click anywhere to put it down',{
      fontFamily:'Georgia, serif',fontStyle:'italic',fontSize:`${Math.max(11,Math.min(14,H/50))}px`,color:'#d2c1a1',
    }).setOrigin(.5,1);
    overlay.add([dark,picture,caption]);
    const scene=this;
    this._letter={container:overlay,get isOpen(){return scene._mapOpen;},
      open(){
        if(scene._mapOpen)return;
        scene._mapOpen=true;for(const z of scene._zones)z.disableInteractive();
        scene.services.audio.playClick(scene);overlay.setVisible(true).setAlpha(0);
        scene.tweens.add({targets:overlay,alpha:1,duration:scene.reducedMotion?0:220});
      },
      close(){
        if(!scene._mapOpen)return;
        scene._mapOpen=false;
        scene.tweens.add({targets:overlay,alpha:0,duration:scene.reducedMotion?0:180,onComplete:()=>{
          overlay.setVisible(false);for(const z of scene._zones)z.setInteractive();
        }});
      },
    };
    dark.on('pointerdown',()=>this._letter.close());
    if(this._mapOpen)for(const z of this._zones)z.disableInteractive();
  }

  update(time,delta){
    if(!this._L)return;
    this._dance(Math.min(delta||16,50)/1000);
    const moving=this.ambientMotion&&!this.reducedMotion;
    const flick=moving?(Math.sin(time*.009)*.5+Math.sin(time*.0137)*.5):0;
    this._flameGlow.setAlpha(.043+flick*.010);
  }

  _showNeedle(){
    if(!this._L)return;
    const {count,step}=this._L.needle;
    this._needleImg.setFrame(Math.round(this._needle.a/step)%count);
  }

  _dance(dt){
    const d=this._needle,step=this._steps[d.step],calm=this.reducedMotion;
    d.t+=dt*1000;
    if(step.spin){
      if(calm)d.w=360/(step.spin/1000);
      else{
        d.shove-=dt;
        if(d.shove<=0){d.w+=(Math.random()<.5?-1:1)*(300+Math.random()*700);d.shove=.12+Math.random()*.25;}
        d.w=Phaser.Math.Clamp(d.w*Math.exp(-.8*dt),-1100,1100);
      }
    }else{
      const error=wrap(d.a-step.to);
      d.w+=(-60*error-(calm?16:9)*d.w)*dt;
      if(!d.locked&&Math.abs(error)<1.5&&Math.abs(d.w)<12){d.locked=true;this._lock(step.to);}
    }
    d.a=((d.a+d.w*dt)%360+360)%360;
    this._showNeedle();
    if(d.t>=(step.spin||step.hold)){
      d.step=(d.step+1)%this._steps.length;d.t=0;d.locked=false;
      if(this._steps[d.step].kick&&!calm)d.w+=(Math.random()<.5?-1:1)*KICK;
    }
  }

  _lock(bearing){
    const c=this._L.compass,a=(bearing-90)*Math.PI/180;
    this.tweens.killTweensOf(this._lockGlow);
    this._lockGlow.setPosition(c.x+Math.cos(a)*c.r*.87,c.y+Math.sin(a)*c.r*.87).setAlpha(.22);
    this.tweens.add({targets:this._lockGlow,alpha:0,duration:1000,ease:'Quad.easeIn'});
    this._tick();
  }

  _tapGlass(){
    const d=this._needle;d.step=0;d.t=0;d.locked=false;d.w+=(Math.random()<.5?-1:1)*600;
    this._clink();
  }

  _ac(){
    const ac=this.sound?.context,state=this.services?.audio?.state;
    if(!ac||state?.muted)return null;
    return {ac,vol:state?.sfxVol??.8};
  }

  _tick(){
    const a=this._ac();if(!a)return;
    const {ac,vol}=a;
    const buffer=ac.createBuffer(1,Math.max(1,Math.floor(ac.sampleRate*.04)),ac.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*9);
    const source=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();
    source.buffer=buffer;filter.type='bandpass';filter.frequency.value=2600;filter.Q.value=3;gain.gain.value=vol*.09;
    source.connect(filter).connect(gain).connect(this.sound.destination);source.start();
  }

  _clink(){
    const a=this._ac();if(!a)return;
    const {ac,vol}=a,t=ac.currentTime;
    for(const [frequency,level] of [[2350,.045],[3720,.026]]){
      const oscillator=ac.createOscillator(),gain=ac.createGain();oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(level*vol,t);gain.gain.exponentialRampToValueAtTime(.0005,t+.25);
      oscillator.connect(gain).connect(this.sound.destination);oscillator.start(t);oscillator.stop(t+.3);
    }
  }

  _teardown(){
    this._sparkle?.();this._sparkle=null;
    this.tweens.killAll();
    for(const o of this.children.list.slice())o.destroy();
    this._L=null;this._letter=null;this._zones=[];
  }

  shutdown(){
    this._sparkle?.();this._sparkle=null;this.tweens.killAll();
    this._L=null;this._letter=null;this._zones=[];this._needle=null;
  }
}

function program(){
  const steps=[];
  for(const line of COMPASS_BEARINGS){
    steps.push({spin:SPIN});
    line.forEach((to,i)=>steps.push({to,hold:HOLD+(i?0:ARRIVE),kick:i>0&&line[i-1]===to}));
  }
  steps.push({spin:SPIN_END});return steps;
}
function wrap(degrees){return ((degrees+180)%360+360)%360-180;}
