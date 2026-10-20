import { polygon } from "../../shared/paint.js";

const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const scale = (a, s) => a.map(v => v * s);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const unit = a => scale(a, 1 / Math.max(1e-8, Math.hypot(...a)));

// The lower end of the spiral visible through the Physics hall's floor.
// Coordinates use the hall camera, with positive Y pointing down.
export function buildSpiralStaircase(L, span) {
  const focal = L.H * 0.9, wall = L.wall / focal;
  const floor = L.floor / focal, head = (span.head ?? L.doorTop) / focal;
  const cx = wall + 0.63, cz = span.z1 + 0.5;
  const radius = 0.52, core = 0.045, rise = 0.076, count = 25;
  const start = -2.8, step = 0.38, railHeight = 0.42;
  const at = (angle, y, r = radius) => [cx + r * Math.cos(angle), y, cz + r * Math.sin(angle)];
  const vertices = [], faces = [];
  const face = (points, normal, material = 0, ao = 1, uv) => {
    const normals = Array.isArray(normal[0]) ? normal : points.map(() => normal);
    const coords = uv || points.map(p => [p[0] / 0.55, p[2] / 0.55]);
    for (const i of [0, 1, 2, 0, 2, 3]) vertices.push(...points[i], ...normals[i], ...coords[i], material, ao);
    faces.push({ points, normal: normals[0], material, ao });
  };
  const box = (x0, x1, z0, z1, y0, y1, material = 1) => {
    const p = (x, y, z) => [x, y, z];
    face([p(x0,y0,z0),p(x1,y0,z0),p(x1,y0,z1),p(x0,y0,z1)], [0,-1,0], material);
    face([p(x0,y1,z0),p(x0,y1,z1),p(x1,y1,z1),p(x1,y1,z0)], [0,1,0], material, 0.6);
    face([p(x0,y0,z0),p(x0,y0,z1),p(x0,y1,z1),p(x0,y1,z0)], [-1,0,0], material, 0.8);
    face([p(x1,y0,z1),p(x1,y0,z0),p(x1,y1,z0),p(x1,y1,z1)], [1,0,0], material, 0.8);
    face([p(x1,y0,z0),p(x0,y0,z0),p(x0,y1,z0),p(x1,y1,z0)], [0,0,-1], material, 0.85,
      [[x1,y0],[x0,y0],[x0,y1],[x1,y1]]);
    face([p(x0,y0,z1),p(x1,y0,z1),p(x1,y1,z1),p(x0,y1,z1)], [0,0,1], material, 0.85,
      [[x0,y0],[x1,y0],[x1,y1],[x0,y1]]);
  };
  const tube = (a, b, r, material = 2, sides = 16) => {
    const axis = unit(sub(b, a));
    const u = unit(cross(axis, Math.abs(axis[1]) > 0.9 ? [1,0,0] : [0,1,0])), v = cross(axis, u);
    const normal = angle => add(scale(u, Math.cos(angle)), scale(v, Math.sin(angle)));
    const edge = (p, angle) => add(p, scale(normal(angle), r));
    for (let i = 0; i < sides; i++) {
      const p = i / sides * Math.PI * 2, q = (i + 1) / sides * Math.PI * 2;
      face([edge(a,p),edge(b,p),edge(b,q),edge(a,q)], [normal(p),normal(p),normal(q),normal(q)], material, 0.9,
        [[p*r,a[1]/0.55],[p*r,b[1]/0.55],[q*r,b[1]/0.55],[q*r,a[1]/0.55]]);
      face([a,edge(a,q),edge(a,p),a], scale(axis,-1), material, 0.8);
      face([b,edge(b,p),edge(b,q),b], axis, material, 0.8);
    }
  };
  const top = floor - count * rise;
  // The open threshold meets the hall floor; the shaft continues upstairs.
  box(wall-0.018, cx+radius+0.1, span.z0, cz+radius+0.15, floor, floor+0.035, 0);
  box(wall, cx+radius+0.18, cz+radius+0.12, cz+radius+0.18, top-0.5, floor+0.1);
  box(cx+radius+0.12, cx+radius+0.18, span.z0, cz+radius+0.18, top-0.5, floor+0.1);
  for (let i = 0; i < count; i++) {
    const a0 = start + i * step, y = floor - (i + 1) * rise, thick = 0.026;
    // Each stone tread is an annular wedge, including its solid underside.
    for (let j = 0; j < 6; j++) {
      const a = a0 + step * j / 6, b = a0 + step * (j + 1) / 6;
      face([at(a,y,core),at(a,y),at(b,y),at(b,y,core)], [0,-1,0]);
      face([at(a,y+thick,core),at(b,y+thick,core),at(b,y+thick),at(a,y+thick)], [0,1,0], 0, 0.55);
      const n = angle => [Math.cos(angle),0,Math.sin(angle)];
      face([at(a,y),at(a,y+thick),at(b,y+thick),at(b,y)], [n(a),n(a),n(b),n(b)], 0, 0.85,
        [[a*radius,y],[a*radius,y+thick],[b*radius,y+thick],[b*radius,y]]);
    }
    for (const a of [a0,a0+step]) {
      const sign = a === a0 ? -1 : 1;
      face([at(a,y,core),at(a,y),at(a,y+thick),at(a,y+thick,core)],
        [-Math.sin(a)*sign,0,Math.cos(a)*sign], 0, 0.8,
        [[core,y],[radius,y],[radius,y+thick],[core,y+thick]]);
    }
    // Turned oak balusters follow the same helix as the continuous handrail.
    const angle = a0 + step * 0.5, railR = radius - 0.025;
    const profile = [[0,0.011],[0.08,0.011],[0.16,0.006],[0.36,0.012],[0.44,0.008],[0.8,0.006],[0.92,0.01],[1,0.01]];
    for (let j = 1; j < profile.length; j++) {
      const [t0,r0] = profile[j-1], [t1,r1] = profile[j];
      tube(at(angle,y-railHeight*t0,railR),at(angle,y-railHeight*t1,railR),(r0+r1)/2);
    }
  }
  // One uninterrupted central post passes through every tread.
  tube([cx,floor+0.01,cz],[cx,top-railHeight,cz],core,2,32);
  const rail = t => at(start + t * step, floor - (t + 0.5) * rise - railHeight, radius - 0.025);
  for (let i = 0; i < count * 8; i++) tube(rail(i/8),rail((i+1)/8),0.018,2,12);
  for (const t of [0,count]) {
    const a = start + t * step, y = floor - (t + 0.5) * rise;
    tube(at(a,y,radius-0.025),at(a,y-railHeight-0.035,radius-0.025),0.025,2,24);
  }
  // Recessed plaster jambs keep the stairwell behind the existing opening.
  box(wall,wall+0.14,span.z0,span.z0+0.035,head,floor);
  box(wall,wall+0.08,span.z1-0.025,span.z1,head,floor);
  box(wall,wall+0.14,span.z0,span.z1,head-0.02,head+0.035);
  return {
    vertices: new Float32Array(vertices), faces,
    light: [cx-0.12,head-0.15,cz-0.18], target: [cx,floor-0.6,cz],
    entrance: [wall-0.2,floor-0.44,span.z0-0.22],
  };
}

// The same spiral remains visible on devices without a WebGL2 context.
export function paintSpiralFallback(ctx, L, mesh) {
  const focal = L.H * 0.9;
  const project = p => ({ x: L.vp.x + focal*p[0]/p[2], y: L.vp.y + focal*p[1]/p[2] });
  const depth = f => f.points.reduce((sum,p) => sum+p[2]/4,0);
  const colours = [[110,105,96],[65,69,72],[72,47,29]];
  for (const f of [...mesh.faces].sort((a,b) => depth(b)-depth(a))) {
    const midpoint = f.points[0], light = unit(sub(mesh.light,midpoint));
    const diffuse = Math.max(0,f.normal.reduce((sum,v,i) => sum+v*light[i],0));
    const brightness = (0.35+diffuse*0.65)*f.ao;
    ctx.fillStyle = `rgb(${colours[f.material].map(v => Math.round(v*brightness)).join(',')})`;
    polygon(ctx,f.points.map(project)); ctx.fill();
  }
}
