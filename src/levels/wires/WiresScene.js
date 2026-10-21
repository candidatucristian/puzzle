import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import {addCanvasTexture} from "../../shared/paint.js";
import {loadWiresPhotography,layoutBirdPainting,paintBirdPainting} from "./photographicPainting.js";

// The original FACADE puzzle, now the framed picture in Room IV. The six
// birds and five wires are still composed from exact puzzle coordinates;
// the farmhouse, man, birds and moulding are photographic. A painting is
// still, including with ambient effects enabled. The harmonica is optional.
const PAINTING="wi_framed_painting";

export default class WiresScene extends BasePuzzleScene {
  constructor(){super({key:"Wires"});}
  init(data){this.skipFadeIn=data?.skipFade??true;}
  preload(){
    loadWiresPhotography(this);
    if(!this.cache.audio.exists("wires_music"))this.load.audio("wires_music","assets/sounds/Wires/music.mp3");
  }
  create(){
    this.beginScene();
    const canvas=this.game.canvas;
    canvas.dataset.sceneColour="natural";
    this._sceneCleanups.add(()=>{delete canvas.dataset.sceneColour;});
    this._music=this.services.audio.playLevelMusic(this,"wires_music",{gain:.7});
    this._build(this.scale.width,this.scale.height);
    this.listenToResize(({width,height})=>{this._teardown();this._build(width,height);});
    if(!this.skipFadeIn)this.cameras.main.fadeIn(600,0,0,0);
  }
  _build(W,H){
    this._W=W;this._H=H;
    this._L=layoutBirdPainting(W,H);
    this._art=paintBirdPainting(this.textures,this._L);
    this._birds=this._art.birds;
    addCanvasTexture(this.textures,PAINTING,this._art.canvas);
    this.add.image(0,0,PAINTING).setOrigin(0);
    this._built=true;
  }
  _teardown(){
    this._built=false;
    for(const child of this.children.list.slice())child.destroy();
    if(this.textures.exists(PAINTING))this.textures.remove(PAINTING);
  }
  shutdown(){
    this._built=false;this._music=null;this._birds=[];
    if(this.textures.exists(PAINTING))this.textures.remove(PAINTING);
  }
}
