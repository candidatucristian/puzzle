"""Original Room II, with the newer worn materials and restrained lighting.

The entire camera, architecture, furniture and puzzle geometry come from
room_library.py. This wrapper changes only material slots and illumination.
Publication is separate; previews never write into the game's room JSON.
"""
import bpy, os, sys, math, json, runpy
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from kit import *
import room_common as rc
from room_common import P, scan, clear_glass
from library_coffer_pass import render_coffer

OUT=arg('--out',os.path.join(rc.ROOT,'.artifacts/room-library-restored'))
WIDTH=int(arg('--width','3200')); SAMPLES=int(arg('--samples','512'))
ONLY=set(arg('--only','plate,coffer').split(','))
EXPOSURE=float(arg('--exposure','1.7'))
SKY=float(arg('--sky','150')); MOON=float(arg('--moon','1.0'))
PRACTICAL=float(arg('--practical','5.8'))
os.makedirs(OUT,exist_ok=True)

# Build precisely the previous room, without rendering or publishing it.
write_layout,render_passes=rc.Layout.write,rc.passes
rc.Layout.write=lambda self: None
rc.passes=lambda *args,**kwargs: None
ARGS[:]=['--only','none','--out',OUT,'--width',str(WIDTH),'--samples',str(SAMPLES)]
try:
    original=runpy.run_path(os.path.join(os.path.dirname(__file__),'room_library.py'),run_name='__main__')
finally:
    rc.Layout.write=write_layout; rc.passes=render_passes
scene=original['scene']; HEIGHT=original['HEIGHT']

# Reuse the material response of the renovation, on the original shapes.
wood=scan('restored aged walnut','dark_wood',size=.85,tint=(.53,.40,.30),bright=.65,sat=.55,rough=(.51,.73),bump=.25,upright=True,vary=.06)
rails=scan('restored walnut cross grain','dark_wood',size=.85,tint=(.53,.40,.30),bright=.65,sat=.55,rough=(.51,.73),bump=.25,vary=.06)
desk=scan('restored desk oak','dark_wood',size=1.3,tint=(.63,.49,.35),bright=.72,sat=.55,rough=(.48,.68),bump=.21,vary=.04)
oak=scan('restored bookcase oak','dark_wood',size=.85,tint=(.53,.40,.30),bright=.65,sat=.55,rough=(.51,.73),bump=.25,upright=True,vary=.06)
oak_x=scan('restored bookcase rails','dark_wood',size=.85,tint=(.53,.40,.30),bright=.65,sat=.55,rough=(.51,.73),bump=.25,vary=.06)
floor=scan('restored worn herringbone oak','wood_floor_worn',size=1.8,tint=(.67,.53,.38),bright=.63,sat=.5,rough=(.56,.79),bump=.24,uvs=True)
n=floor.node_tree.nodes; lk=floor.node_tree.links.new
geo=n.new('ShaderNodeNewGeometry'); hue=next(node for node in n if node.type=='HUE_SAT')
variation=n.new('ShaderNodeMapRange'); variation.inputs['To Min'].default_value=.53; variation.inputs['To Max'].default_value=.70
lk(geo.outputs['Random Per Island'],variation.inputs['Value']); lk(variation.outputs['Result'],hue.inputs['Value'])
leather=scan('restored green desk leather','brown_leather',size=.55,tint=(.20,.25,.17),bright=.55,sat=.2,rough=(.65,.86),bump=.20)
brass=aged_metal('restored unlacquered brass',(.44,.31,.14),(.075,.053,.027),rough=(.40,.65),scale=95,tarnish=.48)
velvet=scan('restored burgundy velvet','velour_velvet',size=.55,tint=(.44,.12,.10),bright=.50,sat=.6,rough=(.85,.97),bump=.18)
ceiling=scan('restored warm ceiling plaster','plastered_wall_04',size=2.4,tint=(.45,.40,.31),bright=.55,sat=.05,rough=(.88,.99),bump=.15)
pages=paper('restored rag paper edges',(.53,.46,.34),.3)
replacements={original[name]:mat for name,mat in (
    ('WALNUT',wood),('WALNUT_X',rails),('DESK_WOOD',desk),('OAK',oak),('OAK_X',oak_x),
    ('LEATHER',leather),('BRASS',brass),('RED_VELVET',velvet),('PLASTER',ceiling),('PAGES',pages))}
replacements[bpy.data.materials['parquet']]=floor
colours=((.31,.12,.09),(.14,.22,.18),(.13,.17,.24),(.35,.25,.13),(.23,.15,.19),(.24,.22,.16))
for i,(old,colour) in enumerate(zip(original['COVERS'],colours)):
    replacements[old]=scan('restored calf binding '+str(i),'fabric_leather_02',size=.2,tint=colour,bright=.7,sat=.12,rough=(.57,.83),bump=.28)
for obj in scene.objects:
    if not hasattr(obj.data,'materials'): continue
    for slot in obj.material_slots:
        if slot.material in replacements: slot.material=replacements[slot.material]
        elif slot.material and slot.material.name.startswith('brass | brushed lamp metal'): slot.material=brass

# All walls remain the original full-height wood panelling. The original
# coffered ceiling, herringbone parquet, red curtains and furnishings stay.
for material in bpy.data.materials:
    if not material.use_nodes: continue
    for node in material.node_tree.nodes:
        if node.type!='BSDF_PRINCIPLED': continue
        if node.inputs['Transmission Weight'].default_value>.5:
            node.inputs['Roughness'].default_value=.065
            node.inputs['IOR'].default_value=1.46
            continue
        node.inputs['Coat Weight'].default_value=0
        if node.inputs['Metallic'].default_value>.5: continue
        rough=node.inputs['Roughness']
        if rough.is_linked:
            maximum=material.node_tree.nodes.new('ShaderNodeMath'); maximum.operation='MAXIMUM'; maximum.inputs[1].default_value=.46
            material.node_tree.links.new(rough.links[0].from_socket,maximum.inputs[0]); material.node_tree.links.new(maximum.outputs[0],rough)
        else: rough.default_value=max(rough.default_value,.46)
        if material.name.startswith('clock face'):
            node.inputs['Emission Strength'].default_value=.38 if material.name!='clock face 3' else .0
        if material.name=='led lit': node.inputs['Emission Strength'].default_value=.8
        if material.name=='green glass shade':
            node.inputs['Base Color'].default_value=(.009,.055,.027,1)
            node.inputs['Emission Color'].default_value=(.018,.10,.045,1)
            node.inputs['Emission Strength'].default_value=.14

# One working lamp and the two existing windows, without shelf spotlights,
# frontal fills, coloured wall washes, glow overlays or a second desk lamp.
for obj in scene.objects:
    if obj.type!='LIGHT': continue
    name=obj.name.split('.')[0]
    if name=='green lamp': obj.data.energy=PRACTICAL
    elif name=='the moon':
        obj.data.energy=MOON; obj.data.color=(.68,.77,.9); obj.data.angle=math.radians(3)
    elif name=='sky through the window':
        d=obj.location.y*100
        obj.location=P(original['X1']+35,190,d)
        obj.rotation_euler=(P(0,190,d)-obj.location).to_track_quat('-Z','Y').to_euler()
        obj.data.energy=SKY; obj.data.color=(.68,.77,.9)
        obj.data.size=1.05; obj.data.size_y=1.8
        obj.visible_camera=False; obj.visible_transmission=False; obj.visible_glossy=False
    else: obj.data.energy=0
clear_glass()
scene.view_settings.exposure=EXPOSURE; scene.use_nodes=False
scene.cycles.samples=SAMPLES; scene.cycles.max_bounces=12; scene.cycles.diffuse_bounces=6
scene.cycles.glossy_bounces=5; scene.cycles.transmission_bounces=8
scene.cycles.adaptive_threshold=.008; scene.cycles.adaptive_min_samples=min(64,SAMPLES)
scene.render.use_persistent_data=True
layout=original['LAYOUT'].data
# Compact interaction cues follow the physical objects rather than the much
# larger click zones, which include empty space around aerials and clocks.
def contour(names):
    objects=[bpy.data.objects.get(name) for name in names]
    return rc.outline([point for obj in objects if obj is not None for point in rc.object_corners(obj)])
bookcase=bpy.data.objects.get('end bookcase')
books=[obj for obj in scene.objects if obj.parent==bookcase and obj.name.split('.')[0]=='book']
slips=[obj for obj in scene.objects if obj.parent==bookcase and obj.name.split('.')[0]=='slip']
book_bounds={obj:rc.object_corners(obj) for obj in books}
marked=[]
for slip in slips:
    points=[slip.matrix_local@Vector(point) for point in slip.bound_box]
    centre=sum(points,Vector())/len(points)
    def distance(book):
        corners=[book.matrix_local@Vector(point) for point in book.bound_box]
        # Each slip is centred on its own book's width and extends from
        # 1 cm below its top to 4.5 cm above it. Match in the cabinet frame.
        return (book.location.y-centre.y)**2+4*(max(point.z for point in corners)-(centre.z-.0175))**2
    if books:
        book=min(books,key=distance)
        if book not in marked: marked.append(book)
layout['interactionContours']={
    'bookshelf':[rc.outline(book_bounds[book]) for book in marked],
    'modem':[contour(['router'])]+[rc.outline(rc.object_corners(obj)) for obj in scene.objects if obj.name.split('.')[0]=='aerial'],
    'overtime':[contour(names) for names in (['wall clock'],['alarm clock'],['radio'],['travel case','travel lid','travel bezel'])],
}
# The existing foreground plant occludes the far window. Rain belongs on
# its glass, so export the same camera's foliage coverage for the live mask.
plant=bpy.data.objects.get('potted_plant_02')
if plant and plant.get('meshes'):
    layout['rainCutouts']=[rc.outline([point for obj in meshes_of(plant) for point in rc.object_corners(obj)])]
with open(os.path.join(OUT,'room.json'),'w',encoding='utf-8') as f: json.dump(layout,f,indent=2)
body,hinge,lid=original['chest_body'],original['chest_hinge'],original['lid_parts']
scene['room_design']='Original Room II composition; restored full-height walnut walls; worn materials'
if 'preview' in ONLY or 'plate' in ONLY:
    for obj in body+lid: obj.hide_render='plate' in ONLY
    render(scene,os.path.join(OUT,'preview.png' if 'preview' in ONLY else 'lights-1.png'))
    for obj in body+lid: obj.hide_render=False
if 'coffer' in ONLY:
    original['air'].hide_render=True
    render_coffer(scene,OUT,layout['chest']['box'],body,hinge,lid,WIDTH,SAMPLES)
if 'preview' not in ONLY and 'layout' not in ONLY:
    scene.render.resolution_x=WIDTH; scene.render.resolution_y=HEIGHT
    scene.render.film_transparent=False; scene.render.image_settings.color_mode='RGB'
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'room-library-restored.blend'))
print('ROOM_LIBRARY_RESTORED_DONE',flush=True)
