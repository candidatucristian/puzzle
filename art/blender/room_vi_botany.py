"""Actual leaf and branch meshes for the nursery and its night garden."""
import math
import random
import bpy
from mathutils import Vector


def mesh_object(scene,name,verts,faces,materials,indices=None):
    data=bpy.data.meshes.new(name)
    data.from_pydata(verts,[],faces)
    data.update()
    obj=bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    for mat in materials:
        obj.data.materials.append(mat)
    for i,face in enumerate(data.polygons):
        face.use_smooth=True
        if indices:
            face.material_index=indices[i]
    return obj


def leaves_material(name,color):
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    shader=mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value=(*color,1)
    shader.inputs["Roughness"].default_value=.48
    shader.inputs["Specular IOR Level"].default_value=.33
    shader.inputs["Subsurface Weight"].default_value=.045
    return mat


def fern(scene,base=(-1.72,7.28,.85)):
    rng=random.Random(6631)
    mats=[leaves_material("VI fern | leaf tone %d"%i,color) for i,color in enumerate([
        (.025,.085,.021),(.043,.115,.029),(.035,.097,.022),(.065,.15,.045)
    ])]
    verts,faces,indices=[],[],[]
    base=Vector(base)
    stems=[]
    for frond in range(15):
        angle=frond*math.tau/15+rng.uniform(-.17,.17)
        radial=Vector((math.cos(angle),math.sin(angle),0))
        side=Vector((-radial.y,radial.x,0))
        reach=rng.uniform(.29,.47)
        height=rng.uniform(.42,.69)
        def point(t):
            return base+radial*(reach*t)+Vector((0,0,height*math.sin(t*math.pi*.8)-.1*t))
        stems.append([point(k/32) for k in range(33)])
        for j in range(3,30):
            t=j/32
            mid=point(t)
            blade_length=.11*(math.sin(math.pi*t)**.75)*rng.uniform(.8,1.13)
            width=.012*(math.sin(math.pi*t)**.5)
            for sign in [-1,1]:
                tip_direction=(side*sign*.92+radial*.38+Vector((0,0,.13))).normalized()
                perp=tip_direction.cross(Vector((0,0,1))).normalized()
                offset=len(verts)
                for k in range(7):
                    s=k/6
                    spine=mid+tip_direction*(blade_length*s)+Vector((0,0,.009*math.sin(math.pi*s)))
                    w=width*math.sin(math.pi*s)*.5
                    verts.extend([tuple(spine-perp*w),tuple(spine+Vector((0,0,.003*math.sin(math.pi*s)))),tuple(spine+perp*w)])
                for k in range(6):
                    a=offset+k*3
                    faces.extend([(a,a+3,a+4,a+1),(a+1,a+4,a+5,a+2)])
                    indices.extend([rng.randrange(len(mats))]*2)
    obj=mesh_object(scene,"VI fern | individually curved leaflets",verts,faces,mats,indices)
    data=bpy.data.curves.new("Fern midribs","CURVE")
    data.dimensions="3D"
    data.bevel_depth=.0013
    data.bevel_resolution=1
    for path in stems:
        sp=data.splines.new("POLY")
        sp.points.add(len(path)-1)
        for p,co in zip(sp.points,path):
            p.co=(*co,1)
    stem=bpy.data.objects.new("VI fern | actual midribs",data)
    scene.collection.objects.link(stem)
    stem.data.materials.append(mats[1])
    return obj


def garden(scene):
    rng=random.Random(6680)
    mat=leaves_material("VI garden | distant broadleaf foliage",(.005,.012,.009))
    verts,faces=[],[]
    for tree in range(7):
        x=-3.6+tree*.68+rng.uniform(-.17,.17)
        y=11.0+rng.uniform(0,2.0)
        height=rng.uniform(3.0,4.35)
        for cluster in range(19):
            angle=cluster*2.39996
            z=height-.35-cluster*.10+rng.uniform(-.2,.2)
            spread=.18+(height-z)*.24
            center=Vector((x+math.cos(angle)*spread,y+math.sin(angle)*spread,z))
            radius=rng.uniform(.21,.39)
            for leaf in range(230):
                # Volumetric leaf clusters have irregular edges, with no
                # cone primitives or perfectly horizontal foliage tiers.
                p=Vector((rng.gauss(0,1),rng.gauss(0,1),rng.gauss(0,1)))
                p=p.normalized()*radius*(rng.random()**(1/3))
                p.z*=.85
                mid=center+p
                axis=Vector((rng.uniform(-1,1),rng.uniform(-1,1),rng.uniform(-.7,.7))).normalized()
                side=axis.cross(Vector((0,0,1))).normalized()
                length=rng.uniform(.025,.065)
                width=length*rng.uniform(.38,.6)
                offset=len(verts)
                verts.extend([tuple(mid-axis*length),tuple(mid+side*width),tuple(mid+axis*length),tuple(mid-side*width),tuple(mid+Vector((0,0,.008)))])
                faces.extend([(offset,offset+1,offset+4),(offset+1,offset+2,offset+4),(offset+2,offset+3,offset+4),(offset+3,offset,offset+4)])
    return mesh_object(scene,"VI garden | irregular branches of real leaf geometry",verts,faces,[mat])
