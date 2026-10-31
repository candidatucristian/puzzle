import * as THREE from "three";

/** A sewn nursery mobile, in the same camera and light as the clue toys.
 * Every thread joins a real hoop point to a felt shape as the hoop turns. */
export function buildMobile(materials, spec) {
  const group = new THREE.Group();
  const wood = materials.wood;
  const thread = new THREE.MeshStandardMaterial({ color: 0xb9ab8b, roughness: .95 });
  const ivory = materials.surface("wool", { color: 0xded4bb, roughness: 1, bumpScale: .00035 });
  const ochre = materials.surface("wool", { color: 0xc3a05c, roughness: .97, bumpScale: .00032 });
  const seam = new THREE.LineBasicMaterial({ color: 0xb8a88a, transparent: true, opacity: .85 });
  const centre = new THREE.Vector3(...spec.centre), anchor = new THREE.Vector3(...spec.anchor), radius = spec.radius;
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(radius,.0032,12,128),wood);
  hoop.rotation.x=Math.PI/2;hoop.position.copy(centre);hoop.castShadow=true;group.add(hoop);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(radius-.005,.0015,8,128),wood);
  inner.rotation.x=Math.PI/2;inner.position.copy(centre);group.add(inner);
  const rod = (a,b,r,mat) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,6),mat);
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.scale.y=a.distanceTo(b);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());
    group.add(mesh);return mesh;
  };
  for (let i=0;i<3;i++) {
    const a=i*Math.PI*2/3;
    rod(anchor,new THREE.Vector3(centre.x+Math.cos(a)*radius,centre.y,centre.z+Math.sin(a)*radius),.00045,thread);
  }
  const shapes=[];
  for (const [i,kind] of ["star","cloud","moon","star","cloud"].entries()) {
    const shape=new THREE.Shape();
    if (kind==="star") {
      for (let k=0;k<10;k++) {
        const a=Math.PI/2+k*Math.PI/5,r=k%2?.010:.024;
        if(k)shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);else shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);
      }
      shape.closePath();
    } else if (kind==="cloud") {
      shape.moveTo(-.026,-.010);
      shape.bezierCurveTo(-.039,-.008,-.032,.010,-.021,.008);
      shape.bezierCurveTo(-.022,.028,.003,.029,.006,.016);
      shape.bezierCurveTo(.018,.025,.031,.013,.027,.005);
      shape.bezierCurveTo(.041,-.006,.024,-.015,.017,-.011);
      shape.lineTo(-.026,-.010);
    } else {
      shape.moveTo(.012,.025);
      shape.bezierCurveTo(-.026,.030,-.036,-.019,-.007,-.025);
      shape.bezierCurveTo(.003,-.028,.011,-.024,.016,-.020);
      shape.bezierCurveTo(-.008,-.021,-.013,.011,.012,.025);
    }
    const felt=new THREE.Group();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.0045,steps:1,bevelEnabled:true,bevelSize:.0018,bevelThickness:.002,bevelSegments:4,curveSegments:24});
    const body=new THREE.Mesh(geometry,kind==="star"?ochre:ivory);body.castShadow=true;body.receiveShadow=true;felt.add(body);
    const points=shape.getSpacedPoints(130), stitch=[];
    for(let j=0;j<points.length-1;j+=3)for(const k of [j,j+1])stitch.push(points[k].x*.91,points[k].y*.91,.007);
    const stitches=new THREE.BufferGeometry();stitches.setAttribute("position",new THREE.Float32BufferAttribute(stitch,3));
    felt.add(new THREE.LineSegments(stitches,seam));group.add(felt);
    const line=rod(new THREE.Vector3(0,0,0),new THREE.Vector3(0,.1,0),.00035,thread);
    shapes.push({felt,line,drop:[.11,.13,.10,.14,.12][i]});
  }
  const up=new THREE.Vector3(0,1,0), top=new THREE.Vector3(), bottom=new THREE.Vector3();
  // The broad window and silk lamp diffuse the high mobile's shadow away.
  // Keep the five low clue toys as the live shadow casters on the sheet.
  group.traverse(o=>{if(o.isMesh)o.castShadow=false;});
  return { group, pose(turn,now,moving,look) {
    hoop.rotation.z=moving?Math.sin(now*.48)*.008:0;
    for(const [i,{felt,line,drop}]of shapes.entries()) {
      const a=turn+i/shapes.length*Math.PI*2;
      top.set(centre.x+Math.sin(a)*radius,centre.y,centre.z+Math.cos(a)*radius);
      const sway=moving?Math.sin(now*.9+i*1.4)*.002:0;
      bottom.copy(top);bottom.y-=drop;bottom.x+=sway-look.x*.002;
      felt.position.copy(bottom);felt.rotation.set(0,Math.sin(a)*.25,moving?Math.sin(now*.9+i*1.4)*.035:0);
      const attachment=bottom.clone();attachment.y+=.022;
      line.position.copy(top).add(attachment).multiplyScalar(.5);
      line.scale.y=top.distanceTo(attachment);line.quaternion.setFromUnitVectors(up,top.clone().sub(attachment).normalize());
    }
  } };
}
