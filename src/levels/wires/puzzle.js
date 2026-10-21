// The original clue: five wires, bottom to top, and six perched birds.
export const WIRE_NOTES = Object.freeze(["D", "F", "A", "C", "E"]);
export const WIRE_BIRDS = Object.freeze([
  {note:"F",pos:1,x:.12}, {note:"A",pos:2,x:.23}, {note:"C",pos:3,x:.34},
  {note:"A",pos:2,x:.68}, {note:"D",pos:0,x:.79}, {note:"E",pos:4,x:.9},
].map(Object.freeze));
export const WIRES_WORD = WIRE_BIRDS.map(b=>WIRE_NOTES[b.pos]).join("");

// Reference-image coordinates. All views share this composition, including
// the small picture on the room's wall. Each foot is anchored ON its wire.
export const PICTURE = Object.freeze({width:1536,height:878,fieldHeight:1024,poleX:1536*.52});
export function wireY(w,x) {
  const {width:W,fieldHeight:H,poleX}=PICTURE;
  const centre=(.16+(4-w)*.025)*H;
  const left=x<=poleX,edge=((left ? .1 : .13)+(4-w)*.05)*H;
  const t=left?x/poleX:(W-x)/(W-poleX);
  return edge+(centre-edge)*t+Math.sin(Math.PI*t)*3;
}
