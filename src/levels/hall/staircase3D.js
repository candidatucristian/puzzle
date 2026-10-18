import { polygon } from "../../shared/paint.js";

// A real mesh behind the hall's right-hand opening. The photograph used for
// the old insert is deliberately absent: textures contain material grain only.
const VS = `#version 300 es
precision highp float;
precision highp int;
layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec2 uv;
layout(location=3) in float material;
layout(location=4) in float occlusion;
uniform vec4 projection;
uniform vec3 lightPosition;
uniform mat3 lightBasis;
uniform bool shadowPass;
out vec3 worldPosition;
out vec3 worldNormal;
out vec2 texcoord;
out vec3 shadowPosition;
out float ao;
flat out int mat;
void main() {
  worldPosition=position; worldNormal=normal; texcoord=uv;
  ao=occlusion; mat=int(material+0.5);
  vec3 light=lightBasis*(position-lightPosition);
  shadowPosition=vec3(light.xy/2.4, light.z/7.0*2.0-1.0);
  gl_Position=shadowPass ? vec4(shadowPosition,1.0) :
    vec4(projection.xy*position.xy+projection.zw*position.z,
      1.008032*position.z-0.120482, position.z);
}`;

const FS = `#version 300 es
precision highp float;
precision highp int;
in vec3 worldPosition;
in vec3 worldNormal;
in vec2 texcoord;
in vec3 shadowPosition;
in float ao;
flat in int mat;
uniform sampler2D wood;
uniform sampler2D plaster;
uniform sampler2D greenPaint;
uniform sampler2D shadowMap;
uniform vec3 lightPosition;
uniform vec3 entranceLight;
out vec4 color;
float shadow(vec3 n,vec3 l) {
  vec3 q=shadowPosition*0.5+0.5;
  if(any(lessThan(q,vec3(0.0)))||any(greaterThan(q,vec3(1.0)))) return 1.0;
  float bias=max(0.0008,0.0022*(1.0-max(0.0,dot(n,l))));
  float visible=0.0;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++) {
    float depth=texture(shadowMap,q.xy+vec2(float(x),float(y))/1024.0).r;
    visible+=q.z-bias<=depth ? 1.0:0.0;
  }
  return visible/9.0;
}
void main() {
  vec2 woodUv=abs(worldNormal.y)>0.5 ? texcoord:texcoord.yx;
  vec3 texel=mat==0 ? texture(wood,woodUv).rgb :
    mat==1 ? texture(plaster,texcoord).rgb : texture(greenPaint,texcoord).rgb;
  vec3 base=pow(texel,vec3(2.2));
  if(mat==1) base*=0.5;
  vec3 n=normalize(worldNormal);
  vec3 toLight=lightPosition-worldPosition;
  float distance2=dot(toLight,toLight);
  vec3 l=normalize(toLight), v=normalize(-worldPosition);
  float visibility=shadow(n,l);
  float diffuse=max(0.0,dot(n,l));
  float direct=0.85/(1.0+distance2*0.7);
  vec3 toEntrance=entranceLight-worldPosition;
  float bounce=max(0.0,dot(n,normalize(toEntrance)))*0.2/
    (1.0+dot(toEntrance,toEntrance)*1.6);
  vec3 illumination=vec3(0.065,0.073,0.085)*ao+
    vec3(0.65,0.74,0.86)*diffuse*direct*visibility+
    vec3(0.9,0.65,0.38)*bounce*ao;
  float specular=pow(max(0.0,dot(n,normalize(l+v))),mat==0 ? 48.0:12.0);
  float roughness=mat==0 ? 0.035:0.003;
  vec3 result=base*illumination+vec3(0.58,0.65,0.72)*specular*roughness*visibility;
  // Recesses stay cool and dark; no emissive edges or luminous white risers.
  result=mix(result,vec3(0.003,0.004,0.006),clamp((worldPosition.z-2.5)*0.045,0.0,0.16));
  color=vec4(pow(result,vec3(1.0/2.2)),1.0);
}`;

const DEPTH_FS = `#version 300 es
precision highp float;
void main() {}`;

const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const scale = (a, s) => a.map(v => v * s);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const unit = a => scale(a, 1 / Math.max(1e-8, Math.hypot(...a)));

function staircaseMesh(L, span) {
  // One unit is about two metres. The same focal length also converts the
  // hall's pixel-based X/Y coordinates to the camera's metric coordinates.
  const focal = L.H * 0.9, wall = L.wall / focal;
  const floor = L.floor / focal, head = L.doorTop / focal;
  const direction = unit([0.55, 0, 0.835]);
  const across = [direction[2], 0, -direction[0]];
  const origin = [wall + 0.32, floor, span.z1 - 0.15];
  const point = (s, u, y) => [origin[0]+direction[0]*s+across[0]*u, y, origin[2]+direction[2]*s+across[2]*u];
  const vertices = [];
  const face = (a,b,c,d,n,material=0,ao=1,uv=[1,1],offset=[0,0]) => {
    const corners=[a,b,c,d], coords=[[0,0],[uv[0],0],[uv[0],uv[1]],[0,uv[1]]];
    for(const i of [0,1,2,0,2,3]) vertices.push(...corners[i],...n,coords[i][0]+offset[0],coords[i][1]+offset[1],material,ao);
  };
  const box = (s0,s1,u0,u1,y0,y1,material=0,ao=1,seed=0) => {
    const p=(s,u,y)=>point(s,u,y), ds=(s1-s0)/0.55, dw=(u1-u0)/0.55, dy=(y1-y0)/0.55;
    const offset=[seed*0.217,seed*0.139];
    face(p(s0,u0,y0),p(s1,u0,y0),p(s1,u1,y0),p(s0,u1,y0),[0,-1,0],material,ao,[ds,dw],offset);
    face(p(s0,u0,y1),p(s0,u1,y1),p(s1,u1,y1),p(s1,u0,y1),[0,1,0],material,ao*0.6,[dw,ds],offset);
    face(p(s0,u0,y0),p(s0,u1,y0),p(s0,u1,y1),p(s0,u0,y1),scale(direction,-1),material,ao*0.88,[dw,dy],offset);
    face(p(s1,u1,y0),p(s1,u0,y0),p(s1,u0,y1),p(s1,u1,y1),direction,material,ao,[dw,dy],offset);
    face(p(s1,u0,y0),p(s0,u0,y0),p(s0,u0,y1),p(s1,u0,y1),scale(across,-1),material,ao,[ds,dy],offset);
    face(p(s0,u1,y0),p(s1,u1,y0),p(s1,u1,y1),p(s0,u1,y1),across,material,ao,[ds,dy],offset);
  };
  const worldBox = (x0,x1,z0,z1,y0,y1,material=0,ao=1) => {
    const p=(x,z,y)=>[x,y,z];
    face(p(x0,z0,y0),p(x1,z0,y0),p(x1,z1,y0),p(x0,z1,y0),[0,-1,0],material,ao);
    face(p(x0,z0,y1),p(x0,z1,y1),p(x1,z1,y1),p(x1,z0,y1),[0,1,0],material,ao*0.6);
    face(p(x0,z0,y0),p(x0,z1,y0),p(x0,z1,y1),p(x0,z0,y1),[-1,0,0],material,ao);
    face(p(x1,z1,y0),p(x1,z0,y0),p(x1,z0,y1),p(x1,z1,y1),[1,0,0],material,ao);
    face(p(x1,z0,y0),p(x0,z0,y0),p(x0,z0,y1),p(x1,z0,y1),[0,0,-1],material,ao);
    face(p(x0,z1,y0),p(x1,z1,y0),p(x1,z1,y1),p(x0,z1,y1),[0,0,1],material,ao);
  };
  const tube = (a,b,radius,material=0) => {
    const axis=unit(sub(b,a));
    const u=unit(cross(axis,Math.abs(axis[1])>0.9 ? [1,0,0]:[0,1,0])), v=cross(axis,u);
    const edge=(t,angle)=>add(add(a,scale(sub(b,a),t)),scale(add(scale(u,Math.cos(angle)),scale(v,Math.sin(angle))),radius));
    for(let i=0;i<16;i++) {
      const p=i/16*Math.PI*2, q=(i+1)/16*Math.PI*2;
      const n=add(scale(u,Math.cos((p+q)/2)),scale(v,Math.sin((p+q)/2)));
      face(edge(0,p),edge(1,p),edge(1,q),edge(0,q),n,material,0.92,[Math.hypot(...sub(b,a))/0.5,0.04]);
    }
  };
  const turnedPost = (s,u,foot,height,newel=false) => {
    const profile=newel ? [[0,.028],[.07,.028],[.09,.035],[.13,.035],[.15,.025],[.76,.025],[.8,.035],[.86,.035],[.88,.025],[.93,.035],[.97,.034],[1,0]] :
      [[0,.012],[.09,.012],[.13,.009],[.25,.007],[.32,.014],[.4,.009],[.72,.006],[.83,.01],[.94,.009],[1,.009]];
    const p=(t,r,a)=>add(point(s,u,foot-height*t),[Math.cos(a)*r,0,Math.sin(a)*r]);
    for(let j=1;j<profile.length;j++) for(let i=0;i<16;i++) {
      const [t0,r0]=profile[j-1], [t1,r1]=profile[j], a=i/16*Math.PI*2, b=(i+1)/16*Math.PI*2;
      const n=unit([Math.cos((a+b)/2),(r1-r0)/(height*(t1-t0)),Math.sin((a+b)/2)]);
      face(p(t0,r0,a),p(t1,r1,a),p(t1,r1,b),p(t0,r0,b),n,0,0.9,[(t1-t0)*height/.5,.03],[t0*height/.5,i*.03]);
    }
  };

  const run=0.145, rise=0.072, count=14, width=0.5, thick=0.024;
  const railU=-width/2+0.022;
  const top=floor-count*rise, length=count*run;
  const railAt=s=>floor-0.44-count*rise*(s+0.065)/(length+0.065);
  // A substantial landing and threshold connect the first riser to the floor.
  worldBox(wall-0.018,wall+0.66,span.z0,span.z1+0.26,floor,floor+0.035,0,0.82);
  box(-0.22,0,-width/2,width/2,floor,floor+0.035,0,0.9);
  for(let i=0;i<count;i++) {
    const s=i*run, y=floor-(i+1)*rise;
    box(s+0.005,s+run+0.03,-width/2,width/2,y,y+thick,0,1,i);
    box(s+0.007,s+0.029,-width/2+0.004,width/2-0.004,y+thick,floor-i*rise+0.003,0,0.67,i+3);
    // Rounded solid-wood nosings, with a real underside casting a shadow on
    // the recessed riser below; no painted highlight line on the step edge.
    for(let j=0;j<10;j++) {
      const a=-Math.PI/2+j*Math.PI/10,b=a+Math.PI/10,r=thick/2;
      const edge=(u,t)=>point(s+0.005-r*Math.cos(t),u,y+r+r*Math.sin(t));
      const n=add(scale(direction,-Math.cos((a+b)/2)),[0,Math.sin((a+b)/2),0]);
      face(edge(-width/2,a),edge(width/2,a),edge(width/2,b),edge(-width/2,b),n,0,0.95,[width/.55,.025],[i*.19,i*.13]);
    }
    const balusterS=s+run*.6, balusterY=floor-(i+1)*rise;
    turnedPost(balusterS,railU,balusterY,balusterY-railAt(balusterS)-0.008);
  }
  // Continuous inclined stringers support the tread ends. Baluster feet sit
  // inside the timber tread, rather than hanging beside or beneath it.
  for(const u of [-width/2,width/2]) {
    const a=u-0.016,b=u+0.016, y0=floor+0.025,y1=top+0.025, depth=0.13;
    const p=(s,w,y)=>point(s,w,y);
    face(p(0,a,y0),p(length,a,y1),p(length,a,y1+depth),p(0,a,y0+depth),scale(across,-1),0,.82,[length/.55,depth/.55]);
    face(p(length,b,y1),p(0,b,y0),p(0,b,y0+depth),p(length,b,y1+depth),across,0,.82,[length/.55,depth/.55]);
    face(p(0,a,y0),p(0,b,y0),p(length,b,y1),p(length,a,y1),unit([-direction[0]*rise/run,-1,-direction[2]*rise/run]),0,.7,[.06,length/.55]);
    face(p(0,a,y0+depth),p(length,a,y1+depth),p(length,b,y1+depth),p(0,b,y0+depth),unit([direction[0]*rise/run,1,direction[2]*rise/run]),0,.5,[length/.55,.06]);
  }
  box(length,length+0.58,-width/2,width/2,top,top+0.04,0,0.86,17);
  turnedPost(-0.065,railU,floor,0.48,true);
  turnedPost(length,railU,top,0.48,true);
  tube(point(-0.065,railU,floor-0.44),point(length,railU,top-0.44),0.022);
  // The opposite wall, ceiling and upper landing are inside the stairwell,
  // rather than pasted into the hall's wall plane.
  box(-0.3,length+0.65,width/2+0.035,width/2+0.095,top-1.0,floor+0.1,1,0.85);
  const wallU=width/2+0.026;
  face(point(-0.3,wallU,floor-0.45),point(length+0.65,wallU,top-0.45),
    point(length+0.65,wallU,floor+0.08),point(-0.3,wallU,floor+0.08),
    scale(across,-1),2,0.8,[5,2]);
  box(length+0.58,length+0.66,-width/2-0.1,width/2+0.1,top-1.0,top+0.08,1,0.72);
  box(-0.3,length+0.65,-width/2-0.1,width/2+0.1,top-1.0,top-0.96,1,0.7);
  // Thick plaster reveals cast real shadows across the entrance and threshold.
  worldBox(wall,wall+0.16,span.z0,span.z0+0.045,head,floor,1,0.75);
  worldBox(wall,wall+0.08,span.z1-0.025,span.z1,head,floor,1,0.8);
  worldBox(wall,wall+0.18,span.z0,span.z1,head-0.02,head+0.035,1,0.72);
  return { vertices:new Float32Array(vertices), light:point(length*.72,0,top-0.55), target:point(length*.5,0,floor-rise*7), entrance:[wall-0.2,floor-0.32,span.z0-0.25] };
}

function program(gl,fragment) {
  const shaders=[];
  let result=null;
  try {
    for(const [type,source] of [[gl.VERTEX_SHADER,VS],[gl.FRAGMENT_SHADER,fragment]]) {
      const shader=gl.createShader(type); shaders.push(shader);
      gl.shaderSource(shader,source); gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    }
    result=gl.createProgram();
    shaders.forEach(shader=>gl.attachShader(result,shader)); gl.linkProgram(result);
    if(!gl.getProgramParameter(result,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result));
    return result;
  } catch(error) {
    if(result) gl.deleteProgram(result);
    throw error;
  } finally { shaders.forEach(shader=>gl.deleteShader(shader)); }
}

function renderStaircase(canvas,L,span,bounds) {
  const gl=canvas.getContext("webgl2",{alpha:false,antialias:true,preserveDrawingBuffer:true});
  if(!gl) return false;
  const resources=[];
  const track=(type,value)=>{ resources.push([type,value]); return value; };
  try {
    const mesh=staircaseMesh(L,span), lit=track("Program",program(gl,FS)), depth=track("Program",program(gl,DEPTH_FS));
    const vao=track("VertexArray",gl.createVertexArray()), buffer=track("Buffer",gl.createBuffer());
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);
    for(const [location,size,offset] of [[0,3,0],[1,3,3],[2,2,6],[3,1,8],[4,1,9]]) {
      gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location,size,gl.FLOAT,false,40,offset*4);
    }
    const forward=unit(sub(mesh.target,mesh.light)), right=unit(cross(forward,[0,-1,0])), up=cross(right,forward);
    const basis=new Float32Array([right[0],up[0],forward[0],right[1],up[1],forward[1],right[2],up[2],forward[2]]);
    const focal=L.H*.9;
    const uniforms=(p,isShadow)=>{
      gl.useProgram(p);
      gl.uniform4f(gl.getUniformLocation(p,"projection"),2*focal/bounds.width,-2*focal/bounds.height,2*(L.vp.x-bounds.x)/bounds.width-1,1-2*(L.vp.y-bounds.y)/bounds.height);
      gl.uniform3fv(gl.getUniformLocation(p,"lightPosition"),mesh.light);
      gl.uniformMatrix3fv(gl.getUniformLocation(p,"lightBasis"),false,basis);
      gl.uniform1i(gl.getUniformLocation(p,"shadowPass"),isShadow?1:0);
    };
    const shadowTexture=track("Texture",gl.createTexture());
    gl.bindTexture(gl.TEXTURE_2D,shadowTexture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,1024,1024,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const target=track("Framebuffer",gl.createFramebuffer());
    gl.bindFramebuffer(gl.FRAMEBUFFER,target);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTexture,0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE) return false;
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.clearDepth(1);
    gl.viewport(0,0,1024,1024); gl.clear(gl.DEPTH_BUFFER_BIT);
    uniforms(depth,true); gl.drawArrays(gl.TRIANGLES,0,mesh.vertices.length/10);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(0.012,0.016,0.023,1); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    uniforms(lit,false);
    const m=L.chemicalMaterials;
    for(const [slot,name,image] of [[0,"wood",m.oak],[1,"plaster",m.stairPlaster],[2,"greenPaint",m.paint]]) {
      gl.activeTexture(gl.TEXTURE0+slot);
      const texture=track("Texture",gl.createTexture()); gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.uniform1i(gl.getUniformLocation(lit,name),slot);
    }
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D,shadowTexture);
    gl.uniform1i(gl.getUniformLocation(lit,"shadowMap"),3);
    gl.uniform3fv(gl.getUniformLocation(lit,"entranceLight"),mesh.entrance);
    gl.drawArrays(gl.TRIANGLES,0,mesh.vertices.length/10);
    return true;
  } catch {
    // The hall's material-based renderer also supports devices without WebGL2.
    return false;
  } finally {
    for(const [type,value] of resources.reverse()) gl[`delete${type}`](value);
  }
}

export function paintChemistryStairs3D(ctx,L,span) {
  if(!L.chemicalMaterials) return false;
  const { P,wall,floor,doorTop }=L;
  const aperture=[P(wall,doorTop,span.z0),P(wall,doorTop,span.z1),P(wall,floor,span.z1),P(wall,floor,span.z0)];
  const bounds={
    x:Math.max(0,Math.floor(Math.min(...aperture.map(p=>p.x)))),
    y:Math.max(0,Math.floor(Math.min(...aperture.map(p=>p.y)))),
  };
  bounds.width=Math.ceil(Math.min(L.W,Math.max(...aperture.map(p=>p.x))))-bounds.x;
  bounds.height=Math.ceil(Math.min(L.H,Math.max(...aperture.map(p=>p.y))))-bounds.y;
  if(bounds.width<1||bounds.height<1) return false;
  const canvas=document.createElement("canvas"), resolution=Math.min(2,1600/bounds.height,1000/bounds.width);
  canvas.width=Math.ceil(bounds.width*resolution); canvas.height=Math.ceil(bounds.height*resolution);
  try {
    if(!renderStaircase(canvas,L,span,bounds)) return false;
    ctx.save(); polygon(ctx,aperture); ctx.clip();
    ctx.drawImage(canvas,bounds.x,bounds.y,bounds.width,bounds.height);
    ctx.restore();
    return true;
  } finally {
    // Keep only the hall's cached canvas, not a second renderer/context.
    canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
