"""Physical Decoder's Book folio, certificate stock and opening-cover passes.

Blender/Cycles asset production only. No browser automation or test commands.
"""
import bpy, bmesh, math, os, sys, json, random
from mathutils import Vector
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import scan, ROOT
from desk_kit import sheet, cloth, wire
from letter_common import aged_paper, sealing_wax, wax_seal

OUT=arg('--out',os.path.join(ROOT,'.artifacts/decoder-reward-v2'))
os.makedirs(OUT,exist_ok=True)
SAMPLES=int(arg('--samples','192')); FRAMES=int(arg('--frames','36'))
ONLY=set(arg('--only','stage,cover,stock').split(','))
scene=fresh(); RNG=random.Random(261102)
W,H=1600,1000

LEATHER=scan('folio full grain calf','brown_leather',size=.36,tint=(.16,.095,.055),bright=.55,sat=.35,rough=(.65,.86),bump=.27)
EDGE=plain('worn leather edges',(.047,.024,.011),rough=.82)
LINEN=cloth('antique linen lining',(.13,.105,.074),rough=.94,weave=2300)
THREAD=plain('waxed saddle thread',(.25,.17,.09),rough=.92)
GOLD=aged_metal('rubbed gilt tooling',(.48,.31,.12),(.14,.085,.03),rough=(.43,.67),scale=850,tarnish=.34)
INK=plain('blind embossed marks',(.28,.22,.13),rough=.91)
PAPER=aged_paper('laid cotton certificate',tone=(.82,.755,.61),half=(.18,.1273),seed=3.1)
PAPER.node_tree.nodes['Principled BSDF'].inputs['Coat Weight'].default_value=0
WOOD=scan('quiet walnut desk','dark_wood',size=.8,tint=(.40,.28,.18),bright=.43,sat=.4,rough=(.61,.85),bump=.19)
RIBBON=cloth('oxblood silk ribbon',(.14,.017,.014),rough=.72,weave=3100)
RIBBON.node_tree.nodes['Principled BSDF'].inputs['Sheen Weight'].default_value=.24

def block(name,x0,x1,y0,y1,z0,z1,material,r=.001):
    obj=box(name,x0,x1,y0,y1,z0,z1,material)
    if r: bevel(obj,r,3)
    return obj

def line(name,points,r,material,closed=False):
    data=bpy.data.curves.new(name,'CURVE'); data.dimensions='3D'; data.bevel_depth=r; data.bevel_resolution=2
    spline=data.splines.new('POLY'); spline.points.add(len(points)-1)
    for point,co in zip(spline.points,points): point.co=(*co,1)
    spline.use_cyclic_u=closed
    obj=link(bpy.data.objects.new(name,data)); obj.data.materials.append(material)
    return obj

FONT=bpy.data.fonts.load('C:/Windows/Fonts/georgia.ttf')
def lettering(name,body,x,y,z,size,material,reverse=False):
    data=bpy.data.curves.new(name,'FONT'); data.body=body; data.font=FONT; data.align_x='CENTER'; data.align_y='CENTER'
    data.size=size; data.extrude=.00002; data.bevel_depth=.000008; data.bevel_resolution=1
    obj=link(bpy.data.objects.new(name,data)); obj.location=(x,y,z); obj.data.materials.append(material)
    if reverse: obj.rotation_euler.y=math.pi
    return obj

def frame(name,x0,x1,y0,y1,z,r,material):
    return line(name,[(x0,y0,z),(x1,y0,z),(x1,y1,z),(x0,y1,z)],r,material,True)

def stitch_frame(x0,x1,y0,y1,z):
    for a,b in (((x0,y0),(x1,y0)),((x1,y0),(x1,y1)),((x1,y1),(x0,y1)),((x0,y1),(x0,y0))):
        start,end=Vector(a),Vector(b); length=(end-start).length; count=int(length/.004)
        for i in range(count):
            aa=start.lerp(end,(i+.2)/count); bb=start.lerp(end,(i+.63)/count)
            line('individual saddle stitch',[(aa.x,aa.y,z),(bb.x,bb.y,z)],.000095,THREAD)

desk=block('walnut desktop',-.95,.95,-.65,.65,-.031,-.006,WOOD,.005)
base=block('folio base board',-.174,.224,-.145,.145,-.004,.0005,LEATHER,.003)
block('folio base lining',-.167,.217,-.138,.138,.0005,.0011,LINEN,.002)
stitch_frame(-.165,.215,-.136,.136,.0013)
# The physical gutter and bound spine remain connected throughout the reveal.
block('rounded book spine',-.182,-.166,-.145,.145,-.002,.013,LEATHER,.003)
for yy in (-.112,-.055,.055,.112):
    block('spine raised band',-.184,-.165,yy-.003,yy+.003,.001,.014,EDGE,.001)

PW,PH,PX,PZ=.36,.254558,.025,.0058
paper_parts=[]
for i in range(4):
    obj=sheet('certificate backing leaf',PW-.001*i,PH-.0006*i,PAPER,at=(PX-.00013*i,.00012*i,.002+i*.00065),nx=16,ny=12,thick=.00028)
    paper_parts.append(obj)
def lift(u,v):
    return .00018*math.sin(u*math.tau)*math.sin(v*math.pi)+.00045*((abs(u-.5)*2)**8+(abs(v-.5)*2)**8)
paper=sheet('laid cotton diploma',PW,PH,PAPER,at=(PX,0,PZ),nx=64,ny=48,lift=lift,thick=.00038)
paper_parts.append(paper)
# A few visible fibres and the subtle deckle sit on the actual sheet.
for side in (-1,1):
    points=[(PX+side*PW/2+RNG.uniform(-.0002,.0002),-PH/2+PH*i/80,PZ+.00005) for i in range(81)]
    paper_parts.append(line('deckled paper edge',points,.00007,PAPER))
    for i in range(24):
        yy=RNG.uniform(-PH*.49,PH*.49)
        paper_parts.append(line('cotton edge fibre',[(PX+side*(PW/2-.0002),yy,PZ+.0001),(PX+side*(PW/2+.0003),yy+.0005,PZ+.0001)],.000018,PAPER))
for inset,r in ((.012,.000075),(.014,.000035)):
    paper_parts.append(frame('gilt engraved rule',PX-PW/2+inset,PX+PW/2-inset,-PH/2+inset,PH/2-inset,PZ+.00045,r,GOLD))
for sx in (-1,1):
    for sy in (-1,1):
        xx=PX+sx*(PW/2-.019); yy=sy*(PH/2-.019)
        for k in range(3):
            rad=.0035+k*.0013
            pts=[(xx+sx*math.cos(t)*rad,yy+sy*math.sin(t)*rad,PZ+.00045) for t in [math.pi/2*i/20 for i in range(21)]]
            paper_parts.append(line('engraved corner flourish',pts,.000055,GOLD))

seal_x,seal_y=PX+.135,-.087
for side in (-1,1):
    mesh=bpy.data.meshes.new('silk ribbon tail')
    vertices=[]
    for j in range(18):
        t=j/17
        centre_x=seal_x+side*.012*t; yy=seal_y-.041*t
        for xx in (-.006,.006): vertices.append((centre_x+xx,yy,PZ+.0007+.0007*math.sin(t*math.pi)))
    faces=[(j*2,j*2+1,j*2+3,j*2+2) for j in range(17)]
    mesh.from_pydata(vertices,[],faces); mesh.update()
    obj=link(bpy.data.objects.new('woven silk ribbon',mesh)); obj.data.materials.append(RIBBON)
    solid=obj.modifiers.new('ribbon thickness','SOLIDIFY'); solid.thickness=.00016
    for polygon in mesh.polygons: polygon.use_smooth=True
    paper_parts.append(obj)
wax=sealing_wax(); wax.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.64
wax.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.12,.009,.006,1)
wax.node_tree.nodes['Principled BSDF'].inputs['Subsurface Weight'].default_value=.025
wax.node_tree.nodes['Principled BSDF'].inputs['Coat Weight'].default_value=0
for obj in wax_seal(wax,.022,PZ+.001):
    obj.location.x+=seal_x; obj.location.y+=seal_y; paper_parts.append(obj)

# Build the real hinged board in its closed position, then parent it once.
before=set(scene.objects)
block('leather presentation cover',0,.394,-.145,.145,0,.004,LEATHER,.003)
block('cover worn edge',.002,.392,-.143,.143,-.0003,.0002,EDGE,.002)
block('inside linen panel',.008,.386,-.137,.137,-.0007,-.00035,LINEN,.0015)
stitch_frame(.010,.384,-.135,.135,.00415)
frame('cover blind tooling',.020,.374,-.125,.125,.00418,.00016,EDGE)
frame('cover fine gilt rule',.024,.370,-.121,.121,.0042,.00005,GOLD)
lettering('cover title',"DECODER'S\nBOOK",.197,.023,.0043,.024,GOLD)
lettering('cover collection','THE ASHCOMBE ARCHIVE',.197,-.065,.0043,.0065,GOLD)
lettering('inside bookplate','THE DECODER\u2019S ARCHIVE',.197,-.016,-.0009,.0075,GOLD,True)
lettering('inside monogram','D B',.197,.020,-.0009,.026,GOLD,True)
cover=link(bpy.data.objects.new('folio cover hinge',None)); cover.location=(-.176,0,.016)
cover_parts=[obj for obj in scene.objects if obj not in before and obj!=cover]
for obj in cover_parts:
    if obj.parent is None: obj.parent=cover

world=bpy.data.worlds.new('quiet warm studio'); world.use_nodes=True; scene.world=world
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.13,.115,.09,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.18
lamp('large warm key','AREA',(-.22,-.12,.72),aim=(.03,0,0),energy=24,colour=(1,.86,.67),size=.52,size_y=.38)
lamp('soft reflected daylight','AREA',(.40,.20,.48),aim=(0,0,0),energy=7,colour=(.80,.85,.91),size=.4)
camera_data=bpy.data.cameras.new('folio camera'); camera_data.type='ORTHO'; camera_data.sensor_fit='HORIZONTAL'; camera_data.ortho_scale=.98
camera=link(bpy.data.objects.new('folio camera',camera_data)); camera.location=(-.167,-.34,.95)
camera.rotation_euler=(Vector((-.167,0,.005))-camera.location).to_track_quat('-Z','Y').to_euler(); scene.camera=camera
cycles(scene,SAMPLES,W,H,exposure=.0,glare=False)
scene.cycles.adaptive_threshold=.009; scene.cycles.adaptive_min_samples=32
scene.cycles.sample_clamp_indirect=4; scene.render.use_persistent_data=True
scene.render.film_transparent=False
bpy.context.view_layer.update()
from bpy_extras.object_utils import world_to_camera_view
def project(point):
    p=world_to_camera_view(scene,camera,Vector(point)); return [round(p.x*W,4),round((1-p.y)*H,4)]
quad=[project((PX+xx,yy,PZ+.0003)) for xx,yy in ((-PW/2,PH/2),(PW/2,PH/2),(PW/2,-PH/2),(-PW/2,-PH/2))]
metadata={'version':2,'width':W,'height':H,'paperQuad':quad,'paperSize':[760,538],'frameCount':FRAMES,'frameWidth':1000,'frameHeight':625,'duration':1500}
with open(os.path.join(OUT,'art.json'),'w',encoding='utf-8') as file: json.dump(metadata,file,indent=2)

if 'stage' in ONLY:
    for obj in cover_parts: obj.hide_render=True
    render(scene,os.path.join(OUT,'stage.png'))
    for obj in cover_parts: obj.hide_render=False

if 'cover' in ONLY:
    r=scene.render; r.resolution_x=1000; r.resolution_y=625; r.film_transparent=True; r.image_settings.color_mode='RGBA'
    saved={obj:obj.hide_render for obj in scene.objects if obj.type in ('MESH','CURVE','FONT')}
    # The photographed base is already in the stage. Omit it from this pass;
    # camera-invisible geometry otherwise creates holdouts in the shadow catcher.
    for obj in saved: obj.hide_render=obj not in cover_parts and obj not in (paper,desk)
    paper.is_shadow_catcher=True
    desk.is_shadow_catcher=True
    scene.cycles.samples=max(96,SAMPLES//2)
    for frame in range(FRAMES):
        t=frame/(FRAMES-1); cover.rotation_euler.y=-math.radians(166)*(.5-.5*math.cos(math.pi*t))
        render(scene,os.path.join(OUT,f'cover-{frame:02d}.png'))
    paper.is_shadow_catcher=False; desk.is_shadow_catcher=False
    for obj,hidden in saved.items(): obj.hide_render=hidden
    r.film_transparent=False; r.image_settings.color_mode='RGB'

if 'stock' in ONLY:
    for obj in cover_parts: obj.hide_render=True
    saved={obj:obj.visible_camera for obj in scene.objects if obj.type in ('MESH','CURVE','FONT')}
    for obj in saved: obj.visible_camera=obj in paper_parts
    camera.location=(PX,0,1); camera.rotation_euler=(0,0,0); camera_data.ortho_scale=PW
    scene.render.resolution_x=3200; scene.render.resolution_y=2263
    scene.render.film_transparent=True; scene.render.image_settings.color_mode='RGBA'; scene.cycles.samples=SAMPLES
    render(scene,os.path.join(OUT,'diploma-stock.png'))
    for obj,visible in saved.items(): obj.visible_camera=visible
    for obj in cover_parts: obj.hide_render=False

camera.location=(-.167,-.34,.95); camera.rotation_euler=(Vector((-.167,0,.005))-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.ortho_scale=.98; cover.rotation_euler.y=-math.radians(166)
scene.render.resolution_x=W; scene.render.resolution_y=H; scene.render.film_transparent=False; scene.render.image_settings.color_mode='RGB'; scene.cycles.samples=SAMPLES
bpy.ops.file.pack_all(); bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'decoder-reward.blend'))
print('DECODER_REWARD_ASSETS_DONE',flush=True)
