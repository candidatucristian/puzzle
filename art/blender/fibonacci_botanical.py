"""Physical leaf outlines and curved laminae for the Fibonacci sapling.

Photographs are from the existing CC0 periwinkle scan. The photograph's
actual silhouette defines each mesh edge; no rectangular leaf cards or
black-background alpha cutouts are used. Each blade has its own camber,
twist, taper, midrib fold and scanned surface normals.
"""
import bpy
import math
import sys
import numpy as np
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from kit import link,plain

SEGMENTS=[((0,0),(2,-12),(-1.5,-23),1.6,1.05),((-1.5,-23),(-5,-34),(3,-43),1.05,.78),
          ((-1.5,-23),(12,-25),(26,-33),.78,.42),((3,-43),(-17,-46),(-36,-65),.72,.38),
          ((3,-43),(39,-52),(44,-90),.78,.42)]
DEFS=[[(0,.96,-48,.95)],[(1,.82,35,1)],[(2,.4,45,.9),(2,.96,65,.9)],
      [(3,.2,-35,.85),(3,.58,-55,.85),(3,.98,-85,.8)],
      [(4,.22,70,.76),(4,.4,-40,.76),(4,.58,65,.76),(4,.77,-42,.72),(4,.98,20,.68)]]

ATLAS=Path('C:/Users/crist/Tools/render/assets/models/periwinkle_plant/textures')
PROFILES=[
    ((497,1270,990,1563),(510,1545),(970,1290)),
    ((962,1260,1410,1563),(978,1545),(1388,1310)),
    ((930,95,1215,244),(939,138),(1200,183)),
    ((319,184,601,326),(329,239),(586,272)),
]


def image(kind):
    img=bpy.data.images.load(str(ATLAS/f'periwinkle_plant_{kind}_2k.jpg'),check_existing=True)
    img.colorspace_settings.name='sRGB' if kind=='diff' else 'Non-Color'
    return img


def scan_outlines():
    img=image('diff');w,h=img.size
    pixels=np.empty(w*h*4,dtype=np.float32);img.pixels.foreach_get(pixels)
    pixels=pixels.reshape(h,w,4)[::-1,:,:3]
    outlines=[]
    for rect,base,tip in PROFILES:
        x0,y0,x1,y1=[round(v*w/1600) for v in rect]
        rgb=pixels[y0:y1,x0:x1]
        mask=(rgb[:,:,1]>.018)&((rgb[:,:,0]+rgb[:,:,1])>.045)
        # Keep one connected photographed leaf, excluding neighbouring atlas
        # fragments and JPEG flecks, before measuring its true margin.
        sy,sx=np.unravel_index(np.argmax(rgb[:,:,1]*mask),mask.shape)
        seen=np.zeros(mask.shape,dtype=bool);seen[sy,sx]=True;todo=[(sx,sy)]
        while todo:
            x,y=todo.pop()
            for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
                a,b=x+dx,y+dy
                if 0<=a<mask.shape[1] and 0<=b<mask.shape[0] and mask[b,a] and not seen[b,a]:
                    seen[b,a]=True;todo.append((a,b))
        ys,xs=np.nonzero(seen)
        coords=np.column_stack(((xs+x0)*1600/w,(ys+y0)*1600/w))
        base=np.array(base,dtype=float);axis=np.array(tip,dtype=float)-base;axis/=np.linalg.norm(axis)
        side=np.array((-axis[1],axis[0]))
        longitudinal=(coords-base)@axis;across=(coords-base)@side
        low,high=float(longitudinal.min()),float(longitudinal.max())
        rows=[];N=64
        for j in range(N+1):
            t=low+(high-low)*j/N
            nearby=abs(longitudinal-t)<max(1.8,(high-low)/N*.55)
            a=across[nearby]
            if not len(a):a=across[np.argsort(abs(longitudinal-t))[:8]]
            rows.append((float(a.min())+.35,float(a.max())-.35))
        outlines.append({'base':base,'axis':axis,'side':side,'low':low,'length':high-low,'rows':rows})
    return outlines


def point(seg,t):
    a,b,c,_,_=seg;m=1-t
    return m*m*a[0]+2*m*t*b[0]+t*t*c[0],m*m*a[1]+2*m*t*b[1]+t*t*c[1]


def bark_material(index):
    mat=plain(f'Fibonacci v2 | living bark {index}',(.06,.095,.021),.48,coat=.08)
    n,l=mat.node_tree.nodes,mat.node_tree.links;p=n.get('Principled BSDF')
    tex=n.new('ShaderNodeTexImage');tex.image=image('diff')
    tc=n.new('ShaderNodeTexCoord');mp=n.new('ShaderNodeMapping')
    mp.inputs['Location'].default_value=(.02,.03,0);mp.inputs['Scale'].default_value=(.037,.9,1)
    l.new(tc.outputs['UV'],mp.inputs['Vector']);l.new(mp.outputs['Vector'],tex.inputs['Vector'])
    hsv=n.new('ShaderNodeHueSaturation');hsv.inputs['Saturation'].default_value=.45;hsv.inputs['Value'].default_value=.48
    l.new(tex.outputs['Color'],hsv.inputs['Color'])
    mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
    mix.inputs[2].default_value=(.52,.70,.33,1) if index else (.65,.55,.40,1)
    l.new(hsv.outputs['Color'],mix.inputs[1])
    living=n.new('ShaderNodeMixRGB');living.blend_type='MIX';living.inputs[0].default_value=.62 if index else .28
    living.inputs[2].default_value=(.048,.115,.023,1) if index else (.12,.073,.029,1)
    l.new(mix.outputs[0],living.inputs[1]);l.new(living.outputs[0],p.inputs['Base Color'])
    normal_tex=n.new('ShaderNodeTexImage');normal_tex.image=image('nor_gl');l.new(mp.outputs['Vector'],normal_tex.inputs['Vector'])
    scanned_normal=n.new('ShaderNodeNormalMap');scanned_normal.inputs['Strength'].default_value=.25
    l.new(normal_tex.outputs['Color'],scanned_normal.inputs['Color'])
    noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=520;noise.inputs['Detail'].default_value=3
    bump=n.new('ShaderNodeBump');bump.inputs['Distance'].default_value=.00013;bump.inputs['Strength'].default_value=.22
    l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(scanned_normal.outputs['Normal'],bump.inputs['Normal']);l.new(bump.outputs['Normal'],p.inputs['Normal'])
    return mat


def leaf_material(index):
    mat=plain(f'Fibonacci v2 | waxy green leaf {index:02}',(.025,.09,.012),.33,coat=.16,spec=.38)
    n,l=mat.node_tree.nodes,mat.node_tree.links;p=n.get('Principled BSDF')
    p.inputs['Coat Roughness'].default_value=.24
    p.inputs['Subsurface Weight'].default_value=.07
    p.inputs['Subsurface Radius'].default_value=(.035,.065,.018)
    tc=n.new('ShaderNodeTexImage');tc.image=image('diff')
    hsv=n.new('ShaderNodeHueSaturation');hsv.inputs['Saturation'].default_value=1.03
    hsv.inputs['Value'].default_value=.48+(index%4)*.025
    l.new(tc.outputs['Color'],hsv.inputs['Color'])
    tint=n.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1
    tint.inputs[2].default_value=(.66,.82,.51,1)
    l.new(hsv.outputs['Color'],tint.inputs[1]);l.new(tint.outputs[0],p.inputs['Base Color'])
    norm=n.new('ShaderNodeTexImage');norm.image=image('nor_gl')
    normal=n.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.32
    l.new(norm.outputs['Color'],normal.inputs['Color']);l.new(normal.outputs['Normal'],p.inputs['Normal'])
    arm=n.new('ShaderNodeTexImage');arm.image=image('arm')
    split=n.new('ShaderNodeSeparateColor');l.new(arm.outputs['Color'],split.inputs[0])
    rough=n.new('ShaderNodeMapRange');rough.inputs['To Min'].default_value=.26;rough.inputs['To Max'].default_value=.43
    l.new(split.outputs[1],rough.inputs['Value']);l.new(rough.outputs[0],p.inputs['Roughness'])
    return mat


def build_plant(scene,world,segments,defs,project):
    for obj in list(scene.objects):
        if obj.name.startswith('Plant |'):bpy.data.objects.remove(obj,do_unlink=True)
    outlines=scan_outlines();stems=[];leaves=[];meta=[]
    for i,seg in enumerate(segments):
        vertices=[];faces=[];N=96;R=16
        nodes=[d[1] for group in defs for d in group if d[0]==i]
        for j in range(N+1):
            t=j/N;x,y=point(seg,t);co=world(-28+x,-17.3+y)
            co.y+=.017*math.sin(t*math.pi)*(math.sin(i*1.7)+.3*math.sin(t*7))
            pa=world(-28+point(seg,max(0,t-.001))[0],-17.3+point(seg,max(0,t-.001))[1])
            pb=world(-28+point(seg,min(1,t+.001))[0],-17.3+point(seg,min(1,t+.001))[1])
            tangent=(pb-pa).normalized();u=tangent.cross(Vector((0,1,0))).normalized();v=tangent.cross(u).normalized()
            # Small swellings at real leaf nodes, taper and irregularity keep
            # young branches from resembling constant-width drawn lines.
            swell=1+sum(.12*math.exp(-((t-at)/.026)**2) for at in nodes)
            radius=(seg[3]*(1-t)+seg[4]*t)/200*swell*(1+.028*math.sin(t*21+i))
            for k in range(R):
                a=k*math.tau/R
                vertices.append(tuple(co+radius*(math.cos(a)*u+math.sin(a)*v)))
        for j in range(N):
            for k in range(R):
                a=j*R+k;b=j*R+(k+1)%R;faces.append((a,b,b+R,a+R))
        mesh=bpy.data.meshes.new('Living tapered shoot with leaf nodes');mesh.from_pydata(vertices,[],faces);mesh.update()
        uv=mesh.uv_layers.new(name='Longitudinal photographed bark')
        for f in mesh.polygons:
            f.use_smooth=True
            for k in f.loop_indices:
                vi=mesh.loops[k].vertex_index;uv.data[k].uv=(vi%R/R,vi//R/N)
        obj=link(bpy.data.objects.new(f'Plant | branch {i+1}',mesh));obj.data.materials.append(bark_material(i));stems.append(obj)
    choices=[0,1,3,2,1,0,3,2,0,1,3,0]
    lengths=[18.0,18.7,17.0,17.3,16.8,16.6,16.0,14.7,14.4,14.3,13.8,14.0]
    rolls=[-21,26,-29,18,24,-17,31,-24,28,16,-31,22]
    for step,group in enumerate(defs):
        for local,(segment,t,angle,_scale) in enumerate(group):
            idx=len(leaves);profile=outlines[choices[idx]];length=lengths[idx]
            x,y=point(segments[segment],t);a=math.radians(angle);roll=math.radians(rolls[idx])
            verts=[];uvs=[];faces=[];N=64;Q=14
            baseAcross=sum(profile['rows'][0])/2
            for j in range(N+1):
                s=j/N;lo,hi=profile['rows'][j]
                if hi<lo:lo=hi=(lo+hi)/2
                for k in range(Q+1):
                    q=k/Q*2-1;across=lo+(hi-lo)*k/Q
                    side=(across-baseAcross)/profile['length']*length
                    # Folded midrib, asymmetric camber, rolled sides and a
                    # drooping tip produce real changes in surface normals.
                    lateral=side*math.cos(roll)+.32*math.sin(s*math.pi)*math.sin(idx*1.9)
                    longitudinal=s*length-.30*s**3*math.cos(idx)
                    co=world(-28+x+longitudinal*math.sin(a)+lateral*math.cos(a),
                             -17.3+y-longitudinal*math.cos(a)+lateral*math.sin(a))
                    depth=(side/100*math.sin(roll)+.012*math.sin(s*math.pi)*abs(q)**1.5
                           -.0025*math.sin(s*math.pi)*math.exp(-abs(q)*5)
                           +.009*s**3*math.sin(idx*1.3+.4)
                           +.0016*math.sin(s*17+idx)*abs(q)**3)
                    co.y+=depth
                    verts.append(tuple(co))
                    photo=profile['base']+profile['axis']*(profile['low']+s*profile['length'])+profile['side']*across
                    uvs.append((float(photo[0]/1600),float(1-photo[1]/1600)))
            for j in range(N):
                for k in range(Q):
                    v=j*(Q+1)+k;faces.append((v,v+1,v+Q+2,v+Q+1))
            mesh=bpy.data.meshes.new('Photographed natural outline / curved living lamina');mesh.from_pydata(verts,[],faces);mesh.update()
            uv=mesh.uv_layers.new(name='Natural photographed leaf coordinates')
            for f in mesh.polygons:
                f.use_smooth=True
                for k in f.loop_indices:uv.data[k].uv=uvs[mesh.loops[k].vertex_index]
            obj=link(bpy.data.objects.new(f'Plant | leaf {idx+1:02}',mesh));obj.data.materials.append(leaf_material(idx))
            solid=obj.modifiers.new('Physical lamina thickness','SOLIDIFY');solid.thickness=.00018
            obj['photographic_variant']=choices[idx];obj['roll_degrees']=rolls[idx];obj['length_cm']=length
            obj['modeled_silhouette']=True;leaves.append(obj)
            meta.append({'step':step,'position':[x,y],'angle':angle,'anchor':project(world(-28+x,-17.3+y))})
    return stems,leaves,meta
