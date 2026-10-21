// Laboratory diagrams: open graphite atom outlines, clipped single bonds,
// dashed hidden edges and a faint construction drawing. No model photos.
const INK = "#3b342b";

export function drawMoleculeSketch(g, molecule, cx, cy, size) {
  const { nodes, edges, caption } = geometry(molecule, size);
  g.save(); g.translate(cx, cy);
  // A light ruled centre line belongs to the notebook, rather than a shadow
  // cast by a three-dimensional object sitting on top of its paper.
  g.save(); g.strokeStyle="rgba(62,55,44,.14)"; g.lineWidth=size*.004;
  g.setLineDash([size*.027,size*.035]);
  g.beginPath(); g.moveTo(-size*1.3,0); g.lineTo(size*1.3,0); g.stroke();
  g.restore();
  for(const [a,b,hidden=false] of edges) drawBond(g,nodes[a],nodes[b],size,hidden);
  nodes.forEach((p,i)=>drawAtom(g,p,size,i));
  g.restore();
  return caption;
}

function geometry(m, s) {
  if(m.shape==="crown") {
    const nodes=Array.from({length:8},(_,i)=>{
      const a=i/8*Math.PI*2;
      return {x:Math.cos(a)*s,y:Math.sin(a)*s*.46+(i%2?-1:1)*s*.2,r:s*.12};
    });
    return {nodes,edges:nodes.map((_,i)=>[i,(i+1)%8,nodes[i].y<-.1*s&&nodes[(i+1)%8].y<-.1*s]),
      caption:"Eight-membered ring"};
  }
  if(m.shape==="pair") {
    const r=s*(m.symbol==="H"?.255:.405), d=r*1.53;
    return {nodes:[{x:-d,y:0,r},{x:d,y:0,r}],edges:[[0,1]],caption:"Diatomic molecule"};
  }
  return {
    nodes:[{x:-s*.9,y:s*.5,r:s*.15},{x:s*.9,y:s*.5,r:s*.15},
      {x:s*.14,y:s*.025,r:s*.15},{x:-s*.035,y:-s*.92,r:s*.15}],
    edges:[[0,2,true],[1,2,true],[2,3,true],[0,1],[0,3],[1,3]],
    caption:"Tetrahedral arrangement",
  };
}

function drawBond(g,a,b,s,hidden) {
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d;
  const start={x:a.x+ux*a.r*1.08,y:a.y+uy*a.r*1.08};
  const end={x:b.x-ux*b.r*1.08,y:b.y-uy*b.r*1.08};
  g.save();
  g.lineCap="round"; g.lineWidth=s*.011; g.strokeStyle=INK; g.globalAlpha=hidden?.5:.86;
  if(hidden)g.setLineDash([s*.035,s*.034]);
  g.beginPath(); g.moveTo(start.x,start.y);
  g.quadraticCurveTo((start.x+end.x)/2-uy*s*.002,(start.y+end.y)/2+ux*s*.002,end.x,end.y);g.stroke();
  // The much lighter second pass is the trace of the pencil, not a second
  // chemical bond. Keep it attached to the same single line.
  g.globalAlpha=hidden?.1:.18;g.lineWidth=s*.004;
  g.beginPath();g.moveTo(start.x+.5,start.y-.5);g.lineTo(end.x+.5,end.y-.5);g.stroke();
  g.restore();
}

function drawAtom(g,p,s,index) {
  g.save();g.strokeStyle=INK;g.lineWidth=s*.009;g.globalAlpha=.85;
  g.beginPath();
  for(let i=0;i<=54;i++) {
    const a=i/54*Math.PI*2;
    const r=p.r*(1+Math.sin(a*3+index)*.012+Math.cos(a*5-index)*.007);
    const x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;
    if(i)g.lineTo(x,y);else g.moveTo(x,y);
  }
  g.closePath();g.stroke();
  // A few light graphite strokes suggest the rounded outline in the study,
  // without glossy shading, coloured spheres or a cast object shadow.
  g.save();g.clip();g.globalAlpha=.12;g.lineWidth=s*.0035;
  for(let i=0;i<4;i++) {
    const y=p.y+p.r*(.5+i*.14);
    g.beginPath();g.moveTo(p.x-p.r,y);g.lineTo(p.x+p.r*.25,y-p.r*.45);g.stroke();
  }
  g.restore();g.restore();
}
