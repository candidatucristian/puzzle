import {Scope} from '../shared/Scope.js';
import {renderLetter} from './letterPage.js';
import animation from './letterAnimation.json';

// Actual Blender meshes, hinge keyframes and camera movement, played live.
// The readable words remain DOM text on the physical paper, in every language.
const BASE=import.meta.env.BASE_URL;
export const letterArt=name=>`${BASE}assets/images/CaseFile/letter/${name}.webp`;
let modulePromise=null;
const stageModule=()=>modulePromise??=import('./letterStage3d.js');
export function prepareLetterAnimation() {
  void stageModule().then(m=>m.prepareLetterModel()).catch(()=>{});
}
const el=(tag,className,text)=>{
  const node=document.createElement(tag);node.className=className;
  if(text)node.textContent=text;return node;
};

/** Resolves only when filed ("read") or dismissed unopened ("later"). */
export function playArrival(scope,{letter,sounds,target,origin=null,reducedMotion=false,i18n=null}) {
  if(scope.closed)return Promise.resolve('later');
  const still=reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const text=(key,fallback)=>i18n?i18n.t(key):fallback;
  return new Promise(resolve=>{
    const life=new Scope(),moves=new Set(),previousFocus=document.activeElement;
    const waiting=origin?.closest('.waiting-letter')??null;
    const root=el('div','arrival');root.tabIndex=-1;
    root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
    root.setAttribute('aria-label',`${text('casefile.letterFound','A letter found')}: ${letter.title}`);
    const veil=el('div','arrival-veil'),stage=el('div','arrival-stage');
    const canvas=el('canvas','arrival-model');canvas.setAttribute('aria-hidden','true');stage.append(canvas);
    const env=el('button','env');env.type='button';env.disabled=true;
    env.setAttribute('aria-label',text('casefile.openLetter','Open the letter'));
    const caption=el('div','arrival-caption');
    caption.append(el('p','arrival-eyebrow',text('casefile.letterFound','A letter found')),el('p','arrival-title',letter.title));
    const hint=el('p','arrival-hint',text('casefile.openLetter','Open the letter'));
    const sheet=el('div','letter-sheet'),page=el('div','arrival-page');
    page.tabIndex=0;page.setAttribute('aria-label',letter.title);sheet.append(page);
    const file=el('button','arrival-file',text('casefile.fileLetter','File it in the case file'));
    file.type='button';file.disabled=true;
    root.append(veil,stage,env,caption,hint,sheet,file);document.body.append(root);
    let state='',native=null,plain=false,typist=null,recording=null,completeMotion=null;
    const alive=()=>!life.closed;
    const stateTo=value=>{state=value;root.dataset.state=value;};
    const move=(node,frames,options)=>{
      if(still||!alive()){Object.assign(node.style,frames.at(-1));return Promise.resolve();}
      const a=node.animate(frames,{fill:'forwards',...options});moves.add(a);
      return a.finished.catch(()=>{});
    };
    const show=(node,ms=300)=>move(node,[{opacity:0},{opacity:1}],{duration:ms,easing:'ease-out'});
    const hide=(node,ms=300)=>move(node,[{opacity:getComputedStyle(node).opacity},{opacity:0}],{duration:ms,easing:'ease-in'});

    const fit=()=>{
      if(native){
        native.fit(innerWidth,innerHeight);
        const e=native.envelopeBounds(),p=native.paperBounds();
        Object.assign(env.style,{left:`${e.x}px`,top:`${e.y}px`,width:`${e.w}px`,height:`${e.h}px`});
        Object.assign(sheet.style,{left:`${p.x-p.w/2}px`,top:`${p.y-p.h/2}px`,width:`${p.w}px`,height:`${p.h}px`,
          padding:`${p.w*.09}px ${p.w*.085}px ${p.w*.07}px`,transform:`rotate(${p.angle}deg)`,
          fontSize:`${Math.max(13,Math.min(18,p.w/34))}px`});
      }else{
        const w=Math.min(560,innerWidth*.88),h=innerHeight*.78;
        Object.assign(sheet.style,{left:`${(innerWidth-w)/2}px`,top:`${(innerHeight-h)/2-12}px`,width:`${w}px`,height:`${h}px`,
          padding:'0',transform:'none',fontSize:`${Math.max(13,Math.min(18,w/34))}px`});
      }
    };
    life.on(window,'resize',fit);
    const finish=how=>{
      if(!alive())return;
      stateTo('gone');typist?.stop();recording?.stop();completeMotion?.();
      for(const a of moves)a.cancel();
      life.dispose();native?.dispose();native=null;root.remove();
      waiting?.classList.remove('is-in-flight');scope.cleanups.delete(parentCleanup);
      const focus=how==='read'&&target?.isConnected?target:previousFocus?.isConnected?previousFocus:target;
      focus?.focus?.({preventScroll:true});resolve(how);
    };
    const parentCleanup=scope.add(()=>finish('later'));

    // Advancing the real Blender clip, including a reverse path when filed.
    const pose=(from,to,milliseconds,onFrame=null)=>new Promise(done=>{
      let raf=null,ended=false;
      const complete=()=>{
        if(ended)return;ended=true;
        if(raf!==null)cancelAnimationFrame(raf);
        if(alive()){native?.pose(to);root.dataset.progress=String(to/animation.duration);}
        if(completeMotion===complete)completeMotion=null;
        life.cleanups.delete(cancel);done();
      };
      const cancel=()=>{if(raf!==null)cancelAnimationFrame(raf);ended=true;done();};
      life.add(cancel);completeMotion=complete;
      if(still){complete();return;}
      const start=performance.now();
      const tick=now=>{
        if(!alive()||ended)return;
        const k=Math.min(1,(now-start)/milliseconds),time=from+(to-from)*k;
        native.pose(time);root.dataset.progress=String(time/animation.duration);onFrame?.(time);
        if(k===1)complete();else raf=requestAnimationFrame(tick);
      };
      raf=requestAnimationFrame(tick);
    });

    const read=()=>{
      stateTo('reading');env.hidden=true;fit();
      const article=renderLetter(page,letter,{paper:plain,seal:false,materials:plain?null:undefined});
      sheet.style.opacity='1';caption.style.opacity='0';
      if(!still){
        article.classList.add('is-writing');typist=sounds?.typing?.()??null;
        life.later(()=>article.classList.remove('is-writing'),2100);
      }
      file.disabled=false;void show(file,300);page.focus({preventScroll:true});
    };
    const open=async()=>{
      if(!alive()||state!=='waiting')return;
      stateTo('opening');env.disabled=true;root.focus({preventScroll:true});
      void hide(hint,180);void hide(caption,500);
      recording=sounds?.letterOpen?.()??null;
      const cues=Object.entries(animation.cues).sort((a,b)=>a[1]-b[1]);
      await pose(animation.arrival,animation.duration,(animation.duration-animation.arrival)*1000,time=>{
        while(cues.length&&cues[0][1]<=time){
          const name=cues.shift()[0];
          if(recording?.present)continue;
          if(name==='crack')sounds?.crack?.();else if(name==='open')sounds?.open?.();
          else if(name==='slide')sounds?.page?.(true);else if(name.startsWith('unfold'))sounds?.unfold?.();
        }
      });
      if(alive())read();
    };
    const fileIt=async()=>{
      if(!alive()||state!=='reading')return;
      stateTo('filing');file.disabled=true;typist?.stop();recording?.stop();root.focus({preventScroll:true});
      void hide(file,180);await hide(sheet,200);if(!alive())return;
      if(native)await pose(animation.duration,0,1900);
      if(!alive())return;
      sounds?.file?.();await Promise.all([hide(stage,300),hide(veil,420)]);finish('read');
    };
    const putAway=async()=>{
      if(!alive()||!['waiting','arriving'].includes(state))return;
      stateTo('filing');completeMotion?.();
      await Promise.all([hide(stage,300),hide(caption,200),hide(hint,160),hide(veil,350)]);finish('later');
    };
    life.on(env,'click',()=>void open());life.on(file,'click',()=>void fileIt());
    life.on(root,'keydown',event=>{
      event.stopPropagation();
      if(event.key==='Escape'){
        event.preventDefault();
        if(state==='reading')void fileIt();
        else if(state==='waiting'||state==='arriving')void putAway();
        else if(state==='opening')completeMotion?.();
      }else if(event.key==='Tab'){
        event.preventDefault();
        if(state==='reading')(document.activeElement===page?file:page).focus({preventScroll:true});
        else if(state==='waiting')env.focus({preventScroll:true});
      }
    });
    stateTo('preparing');root.focus({preventScroll:true});
    void(async()=>{
      try{const m=await stageModule();native=await m.createLetterStage(canvas);}catch{native=null;}
      if(!alive()){native?.dispose();native=null;return;}
      if(!native){
        plain=true;root.classList.add('is-plain');stage.hidden=true;env.hidden=true;hint.hidden=true;
        fit();await show(veil,200);if(alive())read();return;
      }
      stateTo('arriving');fit();waiting?.classList.add('is-in-flight');sounds?.whoosh?.();
      await Promise.all([show(veil,350),show(stage,400),show(caption,450),pose(0,animation.arrival,650)]);
      if(!alive()||state!=='arriving')return;
      sounds?.land?.();stateTo('waiting');fit();env.disabled=false;
      if(origin)void open();else{void show(hint,250);env.focus({preventScroll:true});}
    })();
  });
}
