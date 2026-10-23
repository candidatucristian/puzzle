"""Twelve real Pelargonium leaf meshes from the user's CC0 botanical scan.

Retains the original three-dimensional scan topology, folds, UVs, leaf
textures, roughness and normal maps. The five growing shoots and individual
petioles are modeled around those leaves. No unrelated decorative plants.
"""
import bpy,bmesh,math,sys
import numpy as np
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from kit import link,plain

ASSET=Path('C:/Users/crist/Tools/render/assets/models/potted_plant_01')
SEGMENTS=[((0,0),(1,-9),(-1,-18),1.0,.65),
          ((-1,-18),(-3,-26),(2,-34),.65,.42),
          ((-1,-18),(14,-19),(24,-28),.48,.22),
          ((2,-34),(-17,-34),(-29,-52),.44,.20),
          ((2,-34),(27,-41),(31,-68),.46,.22)]
DEFS=[[(0,.96,-48,1)],[(1,.82,35,1)],[(2,.4,45,1),(2,.96,65,1)],
      [(3,.2,-35,1),(3,.58,-55,1),(3,.98,-85,1)],
      [(4,.22,70,1),(4,.48,-40,1),(4,.63,65,1),(4,.82,-42,1),(4,.99,20,1)]]

def point(seg,t):
    a,b,c,_,_=seg;m=1-t
    return m*m*a[0]+2*m*t*b[0]+t*t*c[0],m*m*a[1]+2*m*t*b[1]+t*t*c[1]

def texture(nodes,kind):
    n=nodes.new('ShaderNodeTexImage')
    n.image=bpy.data.images.load(str(ASSET/'textures'/f'potted_plant_01_leaves_{kind}_2k.jpg'),check_existing=True)
    n.image.colorspace_settings.name='sRGB' if kind=='diff' else 'Non-Color'
    return n

def leaf_material():
    m=plain('Pelargonium | photographed living leaf',(.14,.22,.075),.59,spec=.32,sheen=.13)
    n,l=m.node_tree.nodes,m.node_tree.links;p=n.get('Principled BSDF')
    diff=texture(n,'diff');normal=texture(n,'nor_gl');rough=texture(n,'rough')
    hsv=n.new('ShaderNodeHueSaturation');hsv.inputs['Saturation'].default_value=.85;hsv.inputs['Value'].default_value=.75
    l.new(diff.outputs['Color'],hsv.inputs['Color']);l.new(hsv.outputs['Color'],p.inputs['Base Color'])
    nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.45
    l.new(normal.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],p.inputs['Normal'])
    remap=n.new('ShaderNodeMapRange');remap.inputs['To Min'].default_value=.44;remap.inputs['To Max'].default_value=.70
    l.new(rough.outputs['Color'],remap.inputs[0]);l.new(remap.outputs[0],p.inputs['Roughness'])
    bw=n.new('ShaderNodeRGBToBW');l.new(diff.outputs['Color'],bw.inputs[0])
    alpha=n.new('ShaderNodeMapRange');alpha.clamp=True;alpha.inputs['From Min'].default_value=.015;alpha.inputs['From Max'].default_value=.038
    l.new(bw.outputs[0],alpha.inputs[0]);l.new(alpha.outputs[0],p.inputs['Alpha'])
    p.inputs['Subsurface Weight'].default_value=.055;p.inputs['Subsurface Radius'].default_value=(.012,.023,.006)
    return m

def stem_material(index):
    m=plain(f'Pelargonium | young shoot {index}',(.095,.15,.047),.56,spec=.3)
    n,l=m.node_tree.nodes,m.node_tree.links;p=n.get('Principled BSDF')
    noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=360;noise.inputs['Detail'].default_value=4
    ramp=n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color=(.07,.085,.022,1) if index else (.10,.064,.026,1)
    ramp.color_ramp.elements[1].color=(.19,.25,.078,1) if index else (.19,.135,.062,1)
    l.new(noise.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs[0],p.inputs['Base Color'])
    bump=n.new('ShaderNodeBump');bump.inputs['Distance'].default_value=.00011;bump.inputs['Strength'].default_value=.22
    l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
    p.inputs['Subsurface Weight'].default_value=.04
    return m

def scanned_leaves():
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ASSET/'potted_plant_01.gltf'))
    added=[o for o in bpy.data.objects if o not in before]
    obj=next(o for o in added if o.name.startswith('potted_plant_01_leaves'))
    bpy.context.view_layer.update()
    bm=bmesh.new();bm.from_mesh(obj.data)
    for v in bm.verts:v.co=obj.matrix_world@v.co
    bmesh.ops.remove_doubles(bm,verts=bm.verts[:],dist=.00001)
    layer=bm.loops.layers.uv.active;remaining=set(bm.faces);models=[]
    while remaining:
        todo=[remaining.pop()];group=[]
        while todo:
            f=todo.pop();group.append(f)
            for v in f.verts:
                for other in v.link_faces:
                    if other in remaining:remaining.remove(other);todo.append(other)
        if len(group)<600:continue
        verts=list({v for f in group for v in f.verts});indices={v:i for i,v in enumerate(verts)}
        uvs=[lp[layer].uv.copy() for f in group for lp in f.loops]
        coords=[lp.vert.co.copy() for f in group for lp in f.loops]
        # Other connected components in the scan include long original
        # stalks. Only these two complete leaf blades belong in the puzzle.
        u0,u1=min(u.x for u in uvs),max(u.x for u in uvs)
        v0,v1=min(u.y for u in uvs),max(u.y for u in uvs)
        if u1<.47 and v0>.57 and v1>.98:kind=0
        elif u0>.50 and u1<.84 and v0>.68 and v1>.98:kind=1
        else:continue
        base=np.array((350/1600,1-443/1600)) if kind==0 else np.array((1085/1600,1-331/1600))
        tip=np.array((350/1600,1-24/1600)) if kind==0 else np.array((1085/1600,1-20/1600))
        A=np.array([[u.x,u.y,1] for u in uvs]);C=np.array([tuple(c) for c in coords])
        fit=np.linalg.lstsq(A,C,rcond=None)[0]
        anchor=np.r_[base,1]@fit;end=np.r_[tip,1]@fit
        long=end-anchor;length=float(np.linalg.norm(long));long/=length
        side=fit[0]-np.dot(fit[0],long)*long;side/=np.linalg.norm(side)
        normal=np.cross(side,long);normal/=np.linalg.norm(normal)
        local=[]
        for v in verts:
            delta=np.array(tuple(v.co))-anchor
            local.append((float(delta@side/length),float(delta@long/length),float(delta@normal/length)))
        models.append({'verts':local,'faces':[[indices[v] for v in f.verts] for f in group],
                       'uvs':[tuple(u) for u in uvs],'kind':kind,'source_face':min(f.index for f in group)})
    bm.free()
    for obj in added:bpy.data.objects.remove(obj,do_unlink=True)
    models.sort(key=lambda m:m['source_face'])
    assert len(models)>=12,'The original photographed leaf geometry must be present'
    return models

def append_tube(verts,faces,path,r0,r1,ring=10):
    start=len(verts);N=len(path)-1
    for j,co in enumerate(path):
        tangent=(path[min(N,j+1)]-path[max(0,j-1)]).normalized()
        u=tangent.cross(Vector((0,1,0))).normalized();v=tangent.cross(u).normalized()
        r=r0+(r1-r0)*j/N
        verts.extend(tuple(co+r*(math.cos(k*math.tau/ring)*u+math.sin(k*math.tau/ring)*v)) for k in range(ring))
    for j in range(N):
        for k in range(ring):
            a=start+j*ring+k;b=start+j*ring+(k+1)%ring;faces.append((a,b,b+ring,a+ring))

def build_plant(scene,world,project):
    models=scanned_leaves();leafmat=leaf_material();stem_mats=[stem_material(i) for i in range(5)]
    stems=[];leaves=[];meta=[]
    for i,seg in enumerate(SEGMENTS):
        verts=[];faces=[];path=[]
        for j in range(81):
            x,y=point(seg,j/80);co=world(-28+x,-17.3+y)
            co.y+=.012*math.sin(j/80*math.pi)*math.sin(i+1)
            path.append(co)
        append_tube(verts,faces,path,seg[3]/200,seg[4]/200,16)
        mesh=bpy.data.meshes.new('Physical curved Pelargonium shoot');mesh.from_pydata(verts,[],faces);mesh.update()
        for f in mesh.polygons:f.use_smooth=True
        ob=link(bpy.data.objects.new(f'Plant | branch {i+1}',mesh));ob.data.materials.append(stem_mats[i]);stems.append(ob)
    variants=[0,4,9,15,20,25,30,35,40,45,50,55]
    sizes=[7.8,7.9,7.4,7.6,7.3,7.1,6.9,6.2,6.0,6.2,5.9,5.9]
    rolls=[-18,25,-22,19,28,-20,18,-24,22,-17,27,-15]
    pitches=[28,-22,42,19,-32,38,24,-24,39,30,-32,22]
    for step,group in enumerate(DEFS):
        for si,(segment,t,angle,scale) in enumerate(group):
            idx=len(leaves);model=models[variants[idx]%len(models)];length=sizes[idx];petiole=3.5 if idx<7 else 3.0
            x,y=point(SEGMENTS[segment],t);a=math.radians(angle);roll=math.radians(rolls[idx]);pitch=math.radians(pitches[idx])
            verts=[];faces=[tuple(f) for f in model['faces']]
            for u,s,depth in model['verts']:
                longitudinal=s*math.cos(pitch)-depth*math.sin(pitch)
                depth=s*math.sin(pitch)+depth*math.cos(pitch)
                side=(u*math.cos(roll)+depth*math.sin(roll))*length
                along=longitudinal*length+petiole
                co=world(-28+x+along*math.sin(a)+side*math.cos(a),-17.3+y-along*math.cos(a)+side*math.sin(a))
                co.y+=(-u*math.sin(roll)+depth*math.cos(roll))*length/100
                verts.append(tuple(co))
            blade_faces=len(faces);path=[]
            for j in range(21):
                s=j/20;co=world(-28+x+petiole*s*math.sin(a),-17.3+y-petiole*s*math.cos(a))
                co.y-=.006*math.sin(s*math.pi);path.append(co)
            append_tube(verts,faces,path,.0018 if idx<7 else .0014,.0012)
            mesh=bpy.data.meshes.new('Original scanned Pelargonium leaf and physical petiole');mesh.from_pydata(verts,[],faces);mesh.update()
            uv=mesh.uv_layers.new(name='Original photographic scan UVs');cursor=0
            for f in mesh.polygons:
                f.use_smooth=True;f.material_index=0 if f.index<blade_faces else 1
                for k in f.loop_indices:
                    if f.index<blade_faces:uv.data[k].uv=model['uvs'][cursor];cursor+=1
            ob=link(bpy.data.objects.new(f'Plant | leaf {idx+1:02}',mesh));ob.data.materials.append(leafmat);ob.data.materials.append(stem_mats[segment])
            ob['source']='CC0 potted_plant_01: original photographed leaf mesh, normals and roughness'
            ob['source_leaf']=variants[idx]%len(models);ob['step']=step
            leaves.append(ob);meta.append({'step':step,'position':[x,y],'angle':angle,'anchor':project(world(-28+x,-17.3+y))})
    return stems,leaves,meta

def gameplay_data():
    return {'skeleton':[{'from':dict(zip(('x','y'),a)),'cp':dict(zip(('x','y'),b)),
            'to':dict(zip(('x','y'),c)),'w0':w0,'w1':w1} for a,b,c,w0,w1 in SEGMENTS],
            'leafDefinitions':[[{'seg':i,'t':t,'angle':a,'scale':s} for i,t,a,s in group] for group in DEFS]}
