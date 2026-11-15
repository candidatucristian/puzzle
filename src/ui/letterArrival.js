import {Scope} from '../shared/Scope.js';
import {renderLetter} from './letterPage.js';
import {showConsoleNote} from './consoleNote.js';
import {fileButton} from './fileButton.js';
import held from './letterHeld.json';
import './styles/letter-arrival.css';

// A found letter, held up before his eyes (since 2026-11-12): no envelope, no
// hands, the sheet alone, old and dark — Ivy's page torn from her garden book,
// Silas's from his laboratory note book, the back of Orion's star chart, the
// house's note paper for the last. Rendered in Blender (art/blender/
// letter_held.py) on nothing: a film of the sheet being lifted into view, and
// the still it comes to rest in (the film's last frame). Behind it lies the
// game itself — the hall, the sidebars, the console — just as it was, out of
// focus and darker, so that nothing seems to zoom in or out as the letter
// comes and goes; the sheet is held over the play area. Then the words come
// up on it: live DOM text laid on the picture, in every language, where
// letterHeld.json says the paper has room for them. With the motion reduced,
// or a browser that cannot show a film with an alpha channel, the still
// alone comes up.
const BASE=import.meta.env.BASE_URL;
const pageOf=id=>held[id]?id:'last';
const stillOf=id=>`${BASE}assets/images/CaseFile/letter/held/${pageOf(id)}.webp`;
const filmOf=id=>`${BASE}assets/video/letters/${pageOf(id)}-lifted.webm`;
/** The little picture of a letter waiting in the side panel. */
export const letterPageIcon=id=>`${BASE}assets/images/CaseFile/letter/held/${pageOf(id)}-icon.webp`;
// (VP9 with an alpha channel: Chromium-based browsers show it; elsewhere the still)
const filmable=()=>/Chrom(e|ium)\/|Edg\//.test(navigator.userAgent)
  && !!document.createElement('video').canPlayType('video/webm; codecs="vp9"');
const stills=new Map(),films=new Map();
const picture=src=>new Promise((resolve,reject)=>{
  const image=new Image();image.decoding='async';
  image.onload=()=>image.decode().catch(()=>{}).then(()=>resolve(image));
  image.onerror=()=>reject(new Error(`${src} unavailable`));image.src=src;
});
function prepareFilm(key) {
  if(!filmable())return Promise.resolve(null);
  if(!films.has(key))films.set(key,fetch(filmOf(key)).then(r=>r.ok?r.blob():Promise.reject(new Error('no film')))
    .then(blob=>URL.createObjectURL(blob)).catch(()=>{films.delete(key);return null;}));
  return films.get(key);
}
/** Fetches and decodes a letter's still (null if it cannot be had), and fetches its film. */
export function prepareLetterPage(id) {
  const key=pageOf(id);
  if(!stills.has(key))stills.set(key,picture(stillOf(key)).catch(()=>{stills.delete(key);return null;}));
  void prepareFilm(key);
  return stills.get(key);
}
const el=(tag,className,text)=>{
  const node=document.createElement(tag);node.className=className;
  if(text)node.textContent=text;return node;
};
const percent=v=>`${(v*100).toFixed(3)}%`;

/** Resolves when filed ("read") or put away before it was read ("later"). */
export function playArrival(scope,{letter,page=null,sounds,target,origin=null,reducedMotion=false,i18n=null}) {
  if(scope.closed)return Promise.resolve('later');
  const still=reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const text=(key,fallback)=>i18n?i18n.t(key):fallback;
  const id=pageOf(page??letter.id),spec=held[id];
  return new Promise(resolve=>{
    const life=new Scope(),moves=new Set(),previousFocus=document.activeElement;
    const waiting=origin?.closest('.waiting-letter')??null;
    const root=el('div','arrival');root.tabIndex=-1;root.dataset.page=id;
    root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
    root.setAttribute('aria-label',`${text('casefile.letterFound','A letter found')}: ${letter.title}`);
    // over the play area: the film, the still over it, the words on the sheet
    const view=el('div','arrival-view'),scene=el('div','arrival-scene');
    const film=el('video','arrival-film');
    film.muted=true;film.playsInline=true;film.preload='auto';film.disablePictureInPicture=true;film.setAttribute('aria-hidden','true');
    const plate=el('img','arrival-still');plate.alt='';plate.draggable=false;plate.setAttribute('aria-hidden','true');
    const [sx0,sy0,sx1,sy1]=spec.sheet,[tx0,ty0,tx1,ty1]=spec.text;
    const plainPaper=el('div','arrival-plain');
    Object.assign(plainPaper.style,{left:percent(sx0),top:percent(sy0),width:percent(sx1-sx0),height:percent(sy1-sy0)});
    const sheet=el('div','letter-sheet'),body=el('div','arrival-page');
    Object.assign(sheet.style,{left:percent(tx0),top:percent(ty0),width:percent(tx1-tx0),height:percent(ty1-ty0)});
    body.tabIndex=0;body.setAttribute('aria-label',letter.title);sheet.append(body);
    scene.append(film,plate,plainPaper,sheet);
    const caption=el('div','arrival-caption');
    caption.append(el('p','arrival-eyebrow',text('casefile.letterFound','A letter found')),el('p','arrival-title',letter.title));
    const file=el('button','arrival-file');file.type='button';file.disabled=true;
    fileButton(file,text('casefile.fileLetter','File it in the case file'));
    view.append(scene,caption,file);root.append(view);document.body.append(root);
    let state='',typist=null,settle=null;
    const alive=()=>!life.closed;
    const stateTo=value=>{state=value;root.dataset.state=value;};
    const move=(node,frames,options)=>{
      if(still||!alive()){Object.assign(node.style,frames.at(-1));return Promise.resolve();}
      const a=node.animate(frames,{fill:'forwards',...options});moves.add(a);
      return a.finished.catch(()=>{});
    };
    const show=(node,ms=300)=>move(node,[{opacity:0},{opacity:1}],{duration:ms,easing:'ease-out'});
    const hide=(node,ms=300)=>move(node,[{opacity:getComputedStyle(node).opacity},{opacity:0}],{duration:ms,easing:'ease-in'});
    // the game behind it out of focus and darker while it is read
    const dim=on=>document.body.classList.toggle('letter-open',on);

    // over the play area, where the hall is; the sheet as large as it allows
    // with room for the title above and the button below
    const fit=()=>{
      const area=document.getElementById('game-viewport')?.getBoundingClientRect();
      const r=area&&area.width>200&&area.height>200?area:{left:0,top:0,width:innerWidth,height:innerHeight};
      Object.assign(view.style,{left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`});
      const [W,H]=spec.frame;
      const scale=Math.min(r.height*.74/(H*(sy1-sy0)),r.width*.9/(W*(sx1-sx0)));
      const w=W*scale,h=H*scale,cx=r.width/2,cy=r.height*.5;
      Object.assign(scene.style,{width:`${w}px`,height:`${h}px`,
        left:`${cx-(sx0+sx1)/2*w}px`,top:`${cy-(sy0+sy1)/2*h}px`});
      sheet.style.fontSize=`${Math.max(12,Math.min(19,w*(tx1-tx0)/30))}px`;
    };
    life.on(window,'resize',fit);
    const resize=new ResizeObserver(()=>{if(alive())fit();});
    resize.observe(root);life.add(()=>resize.disconnect());
    const finish=how=>{
      if(!alive())return;
      stateTo('gone');typist?.stop();film.pause();film.removeAttribute('src');dim(false);
      for(const a of moves)a.cancel();
      life.dispose();root.remove();
      waiting?.classList.remove('is-in-flight');scope.cleanups.delete(parentCleanup);
      const focus=how==='read'&&target?.isConnected?target:previousFocus?.isConnected?previousFocus:target;
      focus?.focus?.({preventScroll:true});resolve(how);
    };
    const parentCleanup=scope.add(()=>finish('later'));

    const read=()=>{
      if(!alive())return;
      stateTo('reading');settle=null;
      // (Arthur's pencilled note is not on the sheet: it comes up in the
      // console once the letter is filed)
      const article=renderLetter(body,letter,{paper:false,seal:false,margin:false});
      sheet.style.opacity='1';void hide(caption,600);
      if(!still){
        article.classList.add('is-writing');typist=sounds?.writing?.()??null;
        life.later(()=>article.classList.remove('is-writing'),2100);
      }
      file.disabled=false;void show(file,300);body.focus({preventScroll:true});
    };
    // The film: the sheet lifted up into view over the dimmed game; at its
    // end the still (the same picture, cleaner) takes over.
    const arriveFilm=async url=>{
      film.src=url;
      try{await film.play();}catch{film.removeAttribute('src');return false;}
      if(!alive())return true;
      stateTo('arriving');fit();dim(true);waiting?.classList.add('is-in-flight');
      sounds?.page?.(true);
      scene.style.opacity='1';void show(caption,600);
      await new Promise(done=>{
        settle=()=>{film.pause();done();};
        film.addEventListener('ended',done,{once:true});film.addEventListener('error',done,{once:true});
        life.add(done);
      });
      if(!alive()||state!=='arriving')return true;
      for(const a of moves)a.finish();
      plate.style.opacity='1';
      requestAnimationFrame(()=>{film.style.visibility='hidden';film.pause();});
      read();
      return true;
    };
    // Without the film: the still comes up from below by itself.
    const arriveStill=async()=>{
      stateTo('arriving');fit();dim(true);waiting?.classList.add('is-in-flight');film.hidden=true;
      plate.style.opacity='1';
      if(!still)sounds?.page?.(true);
      const shown=Promise.all([
        move(scene,[{opacity:0,transform:'translateY(9%)'},{opacity:1,transform:'none'}],{duration:700,easing:'cubic-bezier(.2,.7,.25,1)'}),
        show(caption,600),
      ]);
      settle=()=>{for(const a of moves)a.finish();};
      await shown;
      if(alive()&&state==='arriving')read();
    };
    // Filed: the sheet goes, the game comes back into focus, and the case
    // file's button takes the letter with a brief glint.
    const fileIt=async()=>{
      if(!alive()||state!=='reading')return;
      stateTo('filing');file.disabled=true;typist?.stop();root.focus({preventScroll:true});
      void hide(file,180);dim(false);
      await move(view,[{opacity:1,transform:'none'},{opacity:0,transform:'translateY(3%)'}],{duration:520,easing:'ease-in'});
      if(!alive())return;
      if(target?.isConnected){
        target.classList.remove('is-receiving');void target.offsetWidth;target.classList.add('is-receiving');
        setTimeout(()=>target.classList.remove('is-receiving'),900);
      }
      sounds?.file?.();finish('read');
      // what he makes of it, across the console for a moment
      if(letter.margin)showConsoleNote(letter.margin,{signature:text('casefile.marginSign','— A. W.'),reducedMotion:still});
    };
    life.on(file,'click',()=>void fileIt());
    life.on(root,'keydown',event=>{
      event.stopPropagation();
      if(event.key==='Escape'){
        event.preventDefault();
        if(state==='reading')void fileIt();
        else if(state==='arriving')settle?.();
      }else if(event.key==='Tab'){
        event.preventDefault();
        if(state==='reading')(document.activeElement===body?file:body).focus({preventScroll:true});
      }
    });
    stateTo('preparing');root.focus({preventScroll:true});
    void sounds?.prepareWriting?.();
    void(async()=>{
      const [image,url]=await Promise.all([prepareLetterPage(id),still?null:prepareFilm(id)]);
      if(!alive())return;
      if(image)plate.src=image.src;
      else root.classList.add('is-plain');
      if(image&&url&&await arriveFilm(url))return;
      if(alive())await arriveStill();
    })();
  });
}
