"""Room VI realism pass, entirely in Blender/Cycles, using the user's scene.

The original .blend is read-only. All outputs go to the supplied workspace
paths. Existing scans are CC0 Poly Haven assets already installed locally.
No image-generation service or generated room image is loaded by this file.
"""

import argparse
import json
import math
import os
from pathlib import Path
import random
import sys

import bpy
import bmesh
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view


def options():
    p = argparse.ArgumentParser()
    p.add_argument("--base", default="C:/Users/crist/Tools/render/room6.blend")
    p.add_argument("--assets", default="C:/Users/crist/Tools/render/assets")
    p.add_argument("--out", required=True)
    p.add_argument("--blend")
    p.add_argument("--samples", type=int, default=256)
    p.add_argument("--width", type=int, default=2560)
    p.add_argument("--pack", action="store_true")
    p.add_argument("--exposure", type=float, default=.0)
    return p.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])


ARGS = options()
sys.path.insert(0,str(Path(__file__).resolve().parent))
ASSETS = Path(ARGS.assets)
RNG = random.Random(6606)
bpy.ops.wm.open_mainfile(filepath=os.path.abspath(ARGS.base))
SCENE = bpy.context.scene
SCENE.name = "Room VI — Ashcombe nursery — Cycles realism"
SCENE["created_with"] = "Blender 4.5 LTS / Cycles, modeled geometry and scanned PBR materials"
SCENE["no_ai_generation"] = True
SCENE["existing_game_art"] = "The previously approved Ivy and Rose portrait is retained as framed artwork; no new image generation."


def link(obj):
    SCENE.collection.objects.link(obj)
    return obj


def erase(prefixes):
    names=set()
    for obj in bpy.data.objects:
        if any(obj.name == prefix or obj.name.startswith(prefix + ".") or obj.name.startswith(prefix + "_") for prefix in prefixes):
            names.add(obj.name)
            names.update(child.name for child in obj.children_recursive)
    for name in sorted(names):
        obj=bpy.data.objects.get(name)
        if obj:
            bpy.data.objects.remove(obj,do_unlink=True)


def bevel(obj, width=.004, segments=3):
    mod = obj.modifiers.new("Soft worn joinery edges", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    return obj


def box(name, bounds, material, rounding=0):
    x0, x1, y0, y1, z0, z1 = bounds
    center = Vector(((x0+x1)/2, (y0+y1)/2, (z0+z1)/2))
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for vert in bm.verts:
        vert.co = Vector((vert.co.x*(x1-x0), vert.co.y*(y1-y0), vert.co.z*(z1-z0)))
    bm.to_mesh(mesh)
    bm.free()
    obj = link(bpy.data.objects.new(name, mesh))
    obj.location = center
    obj.data.materials.append(material)
    if rounding:
        bevel(obj, rounding)
    return obj


def cylinder(name, start, end, radius, material, vertices=24, radius_end=None):
    start, end = Vector(start), Vector(end)
    vector = end-start
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=vertices,
                         radius1=radius, radius2=radius if radius_end is None else radius_end,
                         depth=vector.length)
    bm.to_mesh(mesh)
    bm.free()
    obj = link(bpy.data.objects.new(name, mesh))
    obj.location = (start+end)/2
    obj.rotation_euler = vector.to_track_quat("Z", "Y").to_euler()
    obj.data.materials.append(material)
    for face in obj.data.polygons:
        face.use_smooth = len(face.vertices) == 4
    return obj


def path_curve(name, points, radius, material):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = radius
    data.bevel_resolution = 4
    sp = data.splines.new("POLY")
    sp.points.add(len(points)-1)
    for p, xyz in zip(sp.points, points):
        p.co = (*xyz, 1)
    obj = link(bpy.data.objects.new(name, data))
    obj.data.materials.append(material)
    return obj


def plain(name, color, roughness=.5, metallic=0, transmission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Transmission Weight"].default_value = transmission
    shader.inputs["IOR"].default_value = 1.46
    return mat


def texture_file(asset, kind):
    for folder in ("textures4k", "textures"):
        for ext in ("jpg", "png"):
            path = ASSETS/folder/asset/(kind+"."+ext)
            if path.exists():
                return str(path)
    return None


def scanned(name, asset, scale=1, tint=(1,1,1), brightness=1,
            rough=(.35,.65), coat=0, saturation=.75, uv=False, rotate=(0,0,0), bump=.0007):
    """Physical size mapping and photographic color/roughness, no baked AO.

    Height maps drive a true bump node instead of tangent normal maps on
    meshes without UVs. Planks have explicit longitudinal UV coordinates.
    """
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = nodes.get("Principled BSDF")
    shader.inputs["Coat Weight"].default_value = coat
    shader.inputs["Coat Roughness"].default_value = .3
    shader.inputs["Specular IOR Level"].default_value = .46
    coords = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1/scale,)*3
    mapping.inputs["Rotation"].default_value = rotate
    links.new(coords.outputs["UV" if uv else "Object"], mapping.inputs["Vector"])

    def image(kind, color=False):
        path = texture_file(asset, kind)
        if not path:
            return None
        node = nodes.new("ShaderNodeTexImage")
        node.label = asset+" — "+kind+" — scanned from life"
        node.image = bpy.data.images.load(path, check_existing=True)
        node.image.colorspace_settings.name = "sRGB" if color else "Non-Color"
        node.projection = "FLAT" if uv else "BOX"
        if not uv:
            node.projection_blend = .2
        links.new(mapping.outputs["Vector"], node.inputs["Vector"])
        return node

    diffuse = image("Diffuse", True)
    if diffuse:
        hsv = nodes.new("ShaderNodeHueSaturation")
        hsv.inputs["Saturation"].default_value = saturation
        hsv.inputs["Value"].default_value = brightness
        links.new(diffuse.outputs["Color"], hsv.inputs["Color"])
        multiply = nodes.new("ShaderNodeMixRGB")
        multiply.blend_type = "MULTIPLY"
        multiply.inputs[0].default_value = 1
        multiply.inputs[2].default_value = (*tint,1)
        links.new(hsv.outputs["Color"], multiply.inputs[1])
        # Subtle board-to-board tonal variation, rather than identical repeats.
        info = nodes.new("ShaderNodeObjectInfo")
        variation = nodes.new("ShaderNodeMapRange")
        variation.inputs["To Min"].default_value = .88
        variation.inputs["To Max"].default_value = 1.06
        links.new(info.outputs["Random"], variation.inputs["Value"])
        varied = nodes.new("ShaderNodeMixRGB")
        varied.blend_type = "MULTIPLY"
        varied.inputs[0].default_value = 1
        links.new(multiply.outputs[0], varied.inputs[1])
        links.new(variation.outputs["Result"], varied.inputs[2])
        links.new(varied.outputs[0], shader.inputs["Base Color"])
    rough_map = image("Rough")
    if rough_map:
        remap = nodes.new("ShaderNodeMapRange")
        remap.inputs["To Min"].default_value = rough[0]
        remap.inputs["To Max"].default_value = rough[1]
        links.new(rough_map.outputs["Color"], remap.inputs["Value"])
        links.new(remap.outputs["Result"], shader.inputs["Roughness"])
    else:
        shader.inputs["Roughness"].default_value = sum(rough)/2
    normal=image("nor_gl") if uv else None
    previous_normal=None
    if normal:
        normal_map=nodes.new("ShaderNodeNormalMap")
        normal_map.inputs["Strength"].default_value=.7
        links.new(normal.outputs["Color"],normal_map.inputs["Color"])
        previous_normal=normal_map.outputs["Normal"]
    height = image("Displacement") or rough_map
    if height:
        relief = nodes.new("ShaderNodeBump")
        relief.inputs["Strength"].default_value = .42
        relief.inputs["Distance"].default_value = bump
        links.new(height.outputs["Color"], relief.inputs["Height"])
        if previous_normal:
            links.new(previous_normal,relief.inputs["Normal"])
        links.new(relief.outputs["Normal"], shader.inputs["Normal"])
    return mat


def replace_material(old_name, new_mat):
    old = bpy.data.materials.get(old_name)
    if old:
        old.user_remap(new_mat)


# Restore the restrained composition of the original nursery. All three
# puzzle areas and the family frame remain; the extra foreground chair,
# unrelated mirror, giant plant and sconces were trial additions.
erase(["Rockingchair_01", "potted_plant_02", "side_table_01", "vintage_oil_lamp",
       "book_encyclopedia_set_01", "mirror_frame", "mirror_glass", "picture_rail",
       "sconce_plate", "sconce_arm", "sconce_cup", "sconce_bulb", "sconce_shade",
       "air", "floor", "rug", "tread", "baluster", "handrail", "stair_post", "stair_foot"])
for obj in list(bpy.data.objects):
    if obj.type == "LIGHT":
        bpy.data.objects.remove(obj, do_unlink=True)

plaster = scanned("VI | aged olive lime plaster", "plastered_wall_04", scale=2.0,
                  tint=(.32,.39,.275), brightness=.9, rough=(.77,.95), saturation=.2, bump=.002,uv=True)
# Quiet limewash variation at architectural scale, rather than peeling paint.
pn,pl=plaster.node_tree.nodes,plaster.node_tree.links
ps=pn.get("Principled BSDF")
prior=ps.inputs["Base Color"].links[0].from_socket
noise=pn.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value=1.5
noise.inputs["Detail"].default_value=3
noise.inputs["Roughness"].default_value=.7
coords=pn.new("ShaderNodeTexCoord")
pl.new(coords.outputs["Object"],noise.inputs["Vector"])
tone=pn.new("ShaderNodeValToRGB")
tone.color_ramp.elements[0].color=(.55,.59,.51,1)
tone.color_ramp.elements[1].color=(1,.98,.9,1)
pl.new(noise.outputs["Fac"],tone.inputs["Fac"])
mix=pn.new("ShaderNodeMixRGB")
mix.blend_type="MULTIPLY"
mix.inputs[0].default_value=1
pl.new(prior,mix.inputs[1])
pl.new(tone.outputs["Color"],mix.inputs[2])
pl.new(mix.outputs[0],ps.inputs["Base Color"])
# A second photographed lime surface adds modest age variation, while
# retaining the original green plaster instead of obvious peeling patches.
worn_path=texture_file("worn_plaster_wall","Diffuse")
if worn_path:
    worn=pn.new("ShaderNodeTexImage")
    worn.image=bpy.data.images.load(worn_path,check_existing=True)
    mapping=pn.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value=(.5,.5,.5)
    pl.new(coords.outputs["UV"],mapping.inputs["Vector"])
    pl.new(mapping.outputs["Vector"],worn.inputs["Vector"])
    wear=pn.new("ShaderNodeMixRGB")
    wear.blend_type="MULTIPLY"
    wear.inputs[0].default_value=.23
    pl.new(mix.outputs[0],wear.inputs[1])
    pl.new(worn.outputs["Color"],wear.inputs[2])
    pl.new(wear.outputs[0],ps.inputs["Base Color"])
panel = scanned("VI | waxed dark walnut panels", "dark_wood", scale=1.1,
                tint=(.78,.73,.65), brightness=.63, rough=(.34,.57), coat=.14,
                rotate=(0,math.pi/2,0), bump=.0005)
trim = scanned("VI | hand rubbed walnut mouldings", "dark_wood", scale=.9,
               brightness=.5, rough=(.28,.48), coat=.16, bump=.00035)
cabinet = scanned("VI | figured mahogany joinery", "rosewood_veneer1", scale=1.35,
                  tint=(.82,.76,.68), brightness=.46, rough=(.28,.52), coat=.2,
                  saturation=.52, uv=True, bump=.0003)
beam = scanned("VI | coffered oak ceiling", "dark_wood", scale=1.65,
               brightness=.41, rough=(.4,.66), coat=.08, bump=.0005)
floor_mat = scanned("VI | oak boards with worn wax", "wood_floor_worn", uv=True,
                    tint=(.82,.78,.67), brightness=.6, rough=(.32,.58), coat=.15,
                    saturation=.65, bump=.0006)
tread_mat = scanned("VI | solid oak stair treads", "dark_wood", uv=True,
                    brightness=.73, rough=(.32,.55), coat=.14, saturation=.72, bump=.00055)
iron = plain("VI | blackened cast iron", (.026,.029,.03), .37, .84)
brass = plain("VI | aged warm brass", (.33,.23,.105), .34, .86)
stone = scanned("VI | painted window reveal", "plastered_wall_04", scale=.7,
                tint=(.26,.29,.28), brightness=.7, rough=(.66,.87), saturation=.1, bump=.00065)
velvet = scanned("VI | dark green velvet backing", "velour_velvet", scale=.75,
                 tint=(.11,.29,.18), brightness=.6, rough=(.76,.94), saturation=.35, bump=.0002)
velvet.node_tree.nodes.get("Principled BSDF").inputs["Sheen Weight"].default_value = .35

for old, new in [("plaster",plaster),("panel",panel),("moulding",trim),("cabinet",cabinet),
                 ("beam",beam),("iron",iron),("brass",brass),("gilt",brass),
                 ("window_frame",trim),("velvet",velvet)]:
    replace_material(old,new)
# Tangent-space scanned normals need real UV coordinates, including the
# geometry created by the arched window's Boolean opening.
for obj in bpy.data.objects:
    if obj.type!="MESH" or plaster not in list(obj.data.materials):
        continue
    uv=obj.data.uv_layers.active or obj.data.uv_layers.new(name="Architectural plaster UV")
    for face in obj.data.polygons:
        axis=max(range(3),key=lambda k:abs(face.normal[k]))
        for index in face.loop_indices:
            co=obj.matrix_world@obj.data.vertices[obj.data.loops[index].vertex_index].co
            uv.data[index].uv=(co.y,co.z) if axis==0 else ((co.x,co.z) if axis==1 else (co.x,co.y))
for name in ["casing_left","casing_right","casing_arch","sill","apron"]:
    obj = bpy.data.objects.get(name)
    if obj:
        obj.data.materials.clear()
        obj.data.materials.append(stone)

# The bench in the original sits lower; its book's real top surface must
# coincide with the established herbarium click polygon.
for name in ["ClassicConsole_01","planter_pot_clay","fern_02","herbarium","herbarium_pages"]:
    obj=bpy.data.objects.get(name)
    if obj:
        obj.location.z-=.12
erase(["fern_02"])
from room_vi_botany import fern, garden
fern_object=fern(SCENE)

# Imported scans already have their real texture variation. Undo the old
# blanket dust/roughness clamp without touching the scanned source maps.
for mat in bpy.data.materials:
    if not mat.use_nodes or mat.name.startswith("VI |"):
        continue
    for shader in list(mat.node_tree.nodes):
        if shader.type != "BSDF_PRINCIPLED":
            continue
        r = shader.inputs["Roughness"]
        if r.is_linked:
            last = r.links[0].from_node
            if last.type == "MATH" and last.operation == "MAXIMUM" and last.inputs[0].is_linked:
                mat.node_tree.links.new(last.inputs[0].links[0].from_socket,r)
        elif mat.name not in {"linen","plush","blanket","pages","cloth"}:
            r.default_value = min(r.default_value,.58)
        shader.inputs["Specular IOR Level"].default_value = .42

# Individual oak boards have true joins, rounded edges and longitudinal UVs.
for row in range(38):
    x0 = -3.38 + row*.18
    x1 = min(x0+.1792,3.38)
    if x1 <= x0:
        continue
    y = -.6 - RNG.uniform(.1,1.8)
    while y < 7.52:
        length = RNG.uniform(1.25,2.25)
        end = min(y+length,7.52)
        start = max(y,-.6)
        if end > start:
            board = box("VI floor | board",(x0,x1,start,end-.0008,-.027,0),floor_mat,.0008)
            uv = board.data.uv_layers.new(name="Longitudinal grain")
            offset_u = RNG.random()*4
            band=RNG.choice([.045,.15,.26,.37,.47,.59,.70,.80,.91])
            for face in board.data.polygons:
                for index in face.loop_indices:
                    vertex = board.data.vertices[board.data.loops[index].vertex_index].co
                    world = vertex+board.location
                    uv.data[index].uv = ((world.y-start)/2.1+offset_u,band+((world.x-x0)/(x1-x0)-.5)*.07)
        y += length

# A modeled low-pile carpet with a public-domain antique textile photograph
# as albedo. Real thickness, weave relief and shading are rendered here.
from room_vi_rug import make_rug
make_rug(SCENE,ASSETS)

# Structurally connected spiral: each tread has an iron collar and bracket;
# all baluster tops lie on the SAME analytical helix as the oak handrail.
SX,SY,RADIUS,HEIGHT = 2.13,5.73,.9,4.0
N,ANGLE = 18,math.radians(26)
RISE = HEIGHT/(N+1)
START = math.radians(-35)
GUARD = .91
cylinder("VI stair | main post",(SX,SY,0),(SX,SY,HEIGHT+.98),.066,iron,48)
cylinder("VI stair | floor flange",(SX,SY,0),(SX,SY,.035),.155,iron,48)
for k in range(4):
    a = k*math.tau/4+math.pi/4
    x,y = SX+.12*math.cos(a),SY+.12*math.sin(a)
    cylinder("VI stair | floor bolt",(x,y,.034),(x,y,.047),.012,iron,6)

def polar(radius,angle,z):
    return (SX+radius*math.sin(angle),SY-radius*math.cos(angle),z)

for i in range(N):
    z = (i+1)*RISE
    a = START+i*ANGLE
    a0,a1 = a-ANGLE*.49,a+ANGLE*.49
    points = [polar(.083,a0,z)]
    points += [polar(RADIUS,a0+(a1-a0)*k/20,z) for k in range(21)]
    points += [polar(.083,a1,z)]
    mesh = bpy.data.meshes.new("Solid 42 mm oak tread")
    verts = [(x,y,level) for level in [z-.042,z] for x,y,_ in points]
    count = len(points)
    faces = [tuple(reversed(range(count))),tuple(range(count,2*count))]
    faces += [(k,(k+1)%count,(k+1)%count+count,k+count) for k in range(count)]
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    tread = link(bpy.data.objects.new("VI stair | tread %02d"%(i+1),mesh))
    tread.data.materials.append(tread_mat)
    bevel(tread,.0035,3)
    uv = mesh.uv_layers.new(name="Oak grain")
    for face in mesh.polygons:
        for index in face.loop_indices:
            v = mesh.vertices[mesh.loops[index].vertex_index].co
            dx,dy=v.x-SX,v.y-SY
            uv.data[index].uv = (dx*math.cos(a)+dy*math.sin(a)+i*.31,
                                (-dx*math.sin(a)+dy*math.cos(a))*.8+i*.17)
    cylinder("VI stair | post collar",(SX,SY,z-.16),(SX,SY,z-.043),.083,iron,40)
    cylinder("VI stair | tread support",polar(.08,a,z-.12),polar(.69,a,z-.045),.018,iron,12)
    cylinder("VI stair | radial tread plate",polar(.08,a,z-.052),polar(.79,a,z-.052),.022,iron,12)
    for fraction in [-.32,.32]:
        theta=a+fraction*ANGLE
        rail_z=RISE+((theta-START)/ANGLE)*RISE+GUARD
        foot=polar(RADIUS-.055,theta,z+.003)
        top=polar(RADIUS-.055,theta,rail_z-.012)
        cylinder("VI stair | baluster",foot,top,.008,iron,16)
        cylinder("VI stair | baluster shoe",foot,(foot[0],foot[1],foot[2]+.055),.015,iron,16)
        for offset in [.27,.55]:
            cylinder("VI stair | cast baluster collar",(foot[0],foot[1],z+offset),(foot[0],foot[1],z+offset+.022),.0115,iron,16)

rail_points=[]
for k in range(481):
    phase=-.32+(N-1+.64)*k/480
    theta=START+phase*ANGLE
    rail_points.append(polar(RADIUS-.055,theta,RISE+phase*RISE+GUARD))
path_curve("VI stair | continuous walnut handrail",rail_points,.029,cabinet)

# The ceiling beams must not cross through the stair opening.
bpy.context.view_layer.update()
for obj in list(bpy.data.objects):
    if not (obj.name.startswith("beam_x") or obj.name.startswith("beam_y")):
        continue
    corners=[obj.matrix_world@Vector(c) for c in obj.bound_box]
    if max(p.x for p in corners)<SX-1.04 or min(p.x for p in corners)>SX+1.04:
        continue
    if max(p.y for p in corners)<SY-1.04 or min(p.y for p in corners)>SY+1.04:
        continue
    cutter=cylinder("Temporary stairwell cutter",(SX,SY,3.4),(SX,SY,4.5),1.04,iron,72)
    modifier=obj.modifiers.new("Real stairwell clearance","BOOLEAN")
    modifier.operation="DIFFERENCE"
    modifier.solver="EXACT"
    modifier.object=cutter
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
path_curve("VI stair | oak well trim",
           [polar(1.044,k*math.tau/192,3.985) for k in range(193)],.024,trim)
# Small landing at the final ascent, supported on real framing.
last=START+(N-.5)*ANGLE
landing=box("VI stair | upper landing",(SX-.48,SX+.48,SY+.15,SY+1.02,3.95,4.02),tread_mat,.006)
cylinder("VI cabinet | brass suspension rod",(-2.793,4.56,2.444),(-2.793,6.10,2.444),.0065,brass,24)

# Small moulded rebates inside the coffers distinguish a paneled ceiling
# from a flat grid of rectangular beams.
for ix in range(7):
    for iy in range(8):
        x0=-3.38+ix*6.76/7+.115
        x1=-3.38+(ix+1)*6.76/7-.115
        y0=-.6+iy*8.12/8+.105
        y1=-.6+(iy+1)*8.12/8-.105
        if x1>SX-1.1 and x0<SX+1.1 and y1>SY-1.1 and y0<SY+1.1:
            continue
        for bounds in [(x0,x1,y0,y0+.025,3.945,3.978),(x0,x1,y1-.025,y1,3.945,3.978),
                       (x0,x0+.025,y0,y1,3.945,3.978),(x1-.025,x1,y0,y1,3.945,3.978)]:
            box("VI ceiling | molded coffer bead",bounds,trim,.005)

# Fine window beadwork and less opaque glass. Scene geometry beyond the
# window provides depth instead of a blank grey environment rectangle.
glass=bpy.data.materials.get("glass")
if glass:
    glass.node_tree.nodes.get("Principled BSDF").inputs["Roughness"].default_value=.012
case_glass=bpy.data.materials.get("case_glass")
if case_glass:
    shader=case_glass.node_tree.nodes.get("Principled BSDF")
    shader.inputs["IOR"].default_value=1.45
    shader.inputs["Roughness"].default_value=.025
garden(SCENE)
sky=bpy.data.materials.new("VI | actual blue night sky behind the garden")
sky.use_nodes=True
sky.node_tree.nodes.clear()
emission=sky.node_tree.nodes.new("ShaderNodeEmission")
emission.inputs["Color"].default_value=(.018,.047,.105,1)
emission.inputs["Strength"].default_value=.8
output=sky.node_tree.nodes.new("ShaderNodeOutputMaterial")
sky.node_tree.links.new(emission.outputs[0],output.inputs["Surface"])
box("VI garden | distant sky",(-20,20,15,15.01,-3,18),sky)

# A quieter linen mattress and a rumpled cover, not rectangular hard blocks.
# Keep the existing family photograph in the actual Blender frame, lit by
# the same room lights. The interactive close-up still uses the same asset.
portrait_path=Path(__file__).resolve().parents[2]/"public/assets/images/Room6/botanical-family-portrait-night-v5.webp"
portrait=bpy.data.objects.get("portrait_canvas")
if portrait and portrait_path.exists():
    mat=plain("VI | existing family portrait on photographic paper",(.5,.5,.5),.58)
    nodes,links=mat.node_tree.nodes,mat.node_tree.links
    image=nodes.new("ShaderNodeTexImage")
    image.image=bpy.data.images.load(str(portrait_path),check_existing=True)
    links.new(image.outputs["Color"],nodes.get("Principled BSDF").inputs["Base Color"])
    portrait.data.materials.clear()
    portrait.data.materials.append(mat)
    uv=portrait.data.uv_layers.active or portrait.data.uv_layers.new(name="Photographic print coordinates")
    for face in portrait.data.polygons:
        for index in face.loop_indices:
            co=portrait.matrix_world@portrait.data.vertices[portrait.data.loops[index].vertex_index].co
            u=(co.x-.247)/.826
            v=(co.z-1.967)/1.288
            uv.data[index].uv=((95+u*835)/1024,1-(1406-v*1283)/1536)
    for obj in bpy.data.objects:
        if obj.name.startswith("portrait_frame"):
            obj.data.materials.clear()
            obj.data.materials.append(trim)
from room_vi_nursery import detail_nursery
detail_nursery(SCENE,erase,box,cylinder,path_curve,plain,cabinet,brass)
# Upright veneer grain, also on the new turned cot joinery. Projected world
# coordinates avoid the sideways repeating knots of the earlier trial.
for obj in bpy.data.objects:
    if obj.type!="MESH" or cabinet not in list(obj.data.materials):
        continue
    uv=obj.data.uv_layers.active or obj.data.uv_layers.new(name="Upright mahogany grain")
    for face in obj.data.polygons:
        axis=max(range(3),key=lambda k:abs(face.normal[k]))
        for index in face.loop_indices:
            co=obj.matrix_world@obj.data.vertices[obj.data.loops[index].vertex_index].co
            uv.data[index].uv=(co.y,co.z) if axis==0 else ((co.x,co.z) if axis==1 else (co.x,co.y))
# Cloth-bound boards overhang the page block, making the herbarium read as
# a closed green book instead of a pale block seen from the doorway.
bookcloth=plain("VI | herbarium faded green bookcloth",(.035,.067,.033),.87)
box("VI herbarium | top cloth board",(-1.145,-.495,7.102,7.367,.73,.739),bookcloth,.003)
box("VI herbarium | lower cloth board",(-1.145,-.495,7.102,7.367,.675,.685),bookcloth,.003)
for key in ["cot_blanket","cot_pillow"]:
    obj=bpy.data.objects.get(key)
    if not obj:
        continue
    subdiv=obj.modifiers.new("Soft cloth surface","SUBSURF")
    subdiv.subdivision_type="SIMPLE"
    subdiv.levels=3
    subdiv.render_levels=4
    tex=bpy.data.textures.new(key+" physical folds",type="CLOUDS")
    tex.noise_scale=.085
    tex.noise_depth=2
    fold=obj.modifiers.new("Subtle irregular linen folds","DISPLACE")
    fold.texture=tex
    fold.strength=.009 if key=="cot_blanket" else .005
    fold.texture_coords="GLOBAL"
    for face in obj.data.polygons:
        face.use_smooth=True

# Replace theatrical warm room fill and fog with cool window illumination,
# restrained warm cabinet light and bounced light from the stairwell.
def area(name,at,aim,power,color,size,size_y=None):
    data=bpy.data.lights.new(name,"AREA")
    data.energy=power
    data.color=color
    data.shape="RECTANGLE" if size_y else "DISK"
    data.size=size
    if size_y:
        data.size_y=size_y
    obj=link(bpy.data.objects.new(name,data))
    obj.location=at
    obj.rotation_euler=(Vector(aim)-Vector(at)).to_track_quat("-Z","Y").to_euler()
    obj.visible_camera=False
    obj.visible_transmission=False
    obj.visible_glossy=False
    return obj

area("VI light | cool window",(-1.244,7.28,2.6),(-.6,3.6,.2),95,(.52,.67,1),.95,2.0)
area("VI light | distant neutral bounce",(-1.4,.4,2.7),(-.1,7.3,1.4),90,(.95,.91,.84),3.8)
area("VI light | soft reflected wall light",(0,5.1,2.8),(0,7.52,2.45),42,(.85,.89,.81),2.8,1.8)
area("VI light | cabinet picture light",(-3.0,5.33,2.46),(-3.0,5.33,1.15),9,(1,.78,.5),.18,1.4)
area("VI light | upper landing",(SX,SY,4.55),(SX,SY,1.2),95,(1,.83,.62),1.15)
area("VI light | cabinet reflected warmth",(-2.3,3.7,1.4),(-3.2,5.3,1.25),4,(1,.76,.5),.9)

world=SCENE.world
nodes=world.node_tree.nodes
links=world.node_tree.links
for node in nodes:
    if node.type=="BACKGROUND":
        node.inputs["Strength"].default_value=.18
        if node.inputs["Color"].is_linked and node.name!="Background":
            for conn in list(node.inputs["Color"].links):
                links.remove(conn)
            node.inputs["Color"].default_value=(.014,.029,.06,1)
            node.inputs["Strength"].default_value=.65

# Crisp clue areas, no artificial DOF or fog glow. Sampling is deterministic.
SCENE.camera.data.dof.use_dof=False
SCENE.render.engine="CYCLES"
prefs=bpy.context.preferences.addons["cycles"].preferences
use_gpu=False
for backend in ["OPTIX","CUDA"]:
    try:
        prefs.compute_device_type=backend
        prefs.get_devices()
        if any(d.type==backend for d in prefs.devices):
            for d in prefs.devices:
                d.use=d.type==backend
            use_gpu=True
            break
    except Exception:
        pass
SCENE.cycles.device="GPU" if use_gpu else "CPU"
SCENE.cycles.samples=ARGS.samples
SCENE.cycles.seed=6606
SCENE.cycles.use_denoising=True
SCENE.cycles.adaptive_threshold=.012 if ARGS.samples>=256 else .035
SCENE.cycles.max_bounces=10
SCENE.cycles.transmission_bounces=8
SCENE.cycles.volume_bounces=0
SCENE.render.resolution_x=ARGS.width
SCENE.render.resolution_y=round(ARGS.width*948/1659)
SCENE.render.resolution_percentage=100
SCENE.render.image_settings.file_format="PNG"
SCENE.render.image_settings.color_mode="RGB"
SCENE.render.filepath=os.path.abspath(ARGS.out)
SCENE.view_settings.view_transform="AgX"
SCENE.view_settings.look="AgX - Medium High Contrast"
SCENE.view_settings.exposure=ARGS.exposure
SCENE.use_nodes=True
nodes=SCENE.node_tree.nodes
nodes.clear()
render=nodes.new("CompositorNodeRLayers")
output=nodes.new("CompositorNodeComposite")
SCENE.node_tree.links.new(render.outputs["Image"],output.inputs["Image"])

# Export the real projected landmarks for interactive overlays/hit areas.
def project(xyz):
    p=world_to_camera_view(SCENE,SCENE.camera,Vector(xyz))
    return [round(p.x*1659,3),round((1-p.y)*948,3)]

landmarks={
    "source":"Blender / Cycles", "logicalSize":[1659,948],
    "cabinetRod":[project((-2.793,4.56,2.444)),project((-2.793,6.10,2.444))],
    "cabinetFace":[project((-2.775,y,z)) for y,z in [(4.5,2.74),(6.16,2.74),(6.16,.11),(4.5,.11)]],
    "portraitOuter":[project((x,7.49,z)) for x,z in [(.177,3.325),(1.143,3.325),(1.143,1.897),(.177,1.897)]],
    "herbarium":[project((x,y,.73)) for x,y in [(-1.14,7.12),(-.5,7.12),(-.5,7.36),(-1.14,7.36)]],
    "cot":[project((x,y,z)) for x,y,z in [(-.16,6.75,1.17),(1.35,6.75,1.17),(1.35,6.75,0),(-.16,6.75,0)]],
    "camera":{"lens":SCENE.camera.data.lens,"location":list(SCENE.camera.location)},
    "geometryObjects":len(SCENE.objects), "device":SCENE.cycles.device,
}
Path(ARGS.out).resolve().parent.mkdir(parents=True,exist_ok=True)
Path(ARGS.out).with_suffix(".landmarks.json").write_text(json.dumps(landmarks,indent=2),encoding="utf-8")
if ARGS.blend:
    Path(ARGS.blend).resolve().parent.mkdir(parents=True,exist_ok=True)
    bpy.context.preferences.filepaths.save_version=0
    if ARGS.pack:
        bpy.ops.outliner.orphans_purge(do_recursive=True)
        bpy.ops.file.pack_all()
    # Open in the rendered composition when the user opens the editable file.
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=="VIEW_3D":
                area.spaces.active.region_3d.view_perspective="CAMERA"
                area.spaces.active.shading.type="MATERIAL"
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(ARGS.blend),check_existing=False,compress=True)
print("ROOM_VI_RENDER",json.dumps({"out":SCENE.render.filepath,"device":SCENE.cycles.device,"objects":len(SCENE.objects)}),flush=True)
bpy.ops.render.render(write_still=True)
print("ROOM_VI_DONE",SCENE.render.filepath,flush=True)
