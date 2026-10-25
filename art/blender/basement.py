"""Room V's cellar: real masonry, joinery, engraved cipher and wet flagstones.

All geometry is authored in metres. The camera exports the actual positions
of the wick, pipe joint, puddle and hatch for the game's live effects.
No generated room photographs or image planes are used.
"""
import os
import sys
import math
import json
import random
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import arg, fresh, link, plain, aged_metal, box, bevel, cylinder, sphere, lamp, cycles, render, boolean_cut, to_picture
from hall_common import scan
from botany_staircase import mesh, block, bar
from basement_props import build_props

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OUT = os.path.abspath(arg('--output', ROOT + '/.artifacts/basement-native/render'))
WIDTH = int(arg('--width', '3200'))
SAMPLES = int(arg('--samples', '384'))
RW, RH = 1880, 1074
RNG = random.Random(51061)
PAIRS = [[1, 5], [4, 4], [1, 3], [1, 1], [4, 1], [1, 5]]
os.makedirs(OUT, exist_ok=True)
scene = fresh()
scene.name = 'Room V — cellar — native Cycles scene'


def rod(name, a, b, radius, material, vertices=32):
    a, b = Vector(a), Vector(b)
    obj = cylinder(name, 0, 0, 0, (b - a).length, radius, material, vertices)
    obj.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    obj.location = a
    return obj


def circ(name, centre, radius, material, axis='Z', thick=.005):
    points = []
    for i in range(65):
        a = math.tau * i / 64
        offset = (radius * math.cos(a), radius * math.sin(a), 0) if axis == 'Z' else (radius * math.cos(a), 0, radius * math.sin(a))
        points.append(Vector(centre) + Vector(offset))
    return bar(name, points, thick, material, keep=False)


def stone_uv(obj, plane='XZ', variant=0):
    """Map a continuous scanned stone face, excluding the scan's mortar.

    The modeled joints are the only joints in the room. Each mesh receives
    its own aligned UVs, including a modest offset inside the same stone.
    """
    axes = (0,2) if plane == 'XZ' else (0,1)
    lo = [min(v.co[a] for v in obj.data.vertices) for a in axes]
    hi = [max(v.co[a] for v in obj.data.vertices) for a in axes]
    uv = obj.data.uv_layers.new(name='continuous scanned stone face')
    du = (variant % 4) * .018
    vbase = [.655,.855,.455,.255,.055][variant % 5]
    span_u = min(.47, .115 * (hi[0]-lo[0])/max(.001,hi[1]-lo[1]))
    for poly in obj.data.polygons:
        for index in poly.loop_indices:
            p = obj.data.vertices[obj.data.loops[index].vertex_index].co
            u = (p[axes[0]]-lo[0])/max(.001,hi[0]-lo[0])
            v = (p[axes[1]]-lo[1])/max(.001,hi[1]-lo[1])
            if variant % 2:u=1-u
            uv.data[index].uv = (.35+du+span_u*u, vbase+.115*v)
    return obj


oak = scan('cellar | worn oak grain', 'dark_wood', .48, bright=.85, sat=.18,tint=(.66,.61,.50),
           rough=(.57, .84), bump=.55, upright=True, vary=.13, grime=.16)
beamwood = scan('cellar | end-grained, smoke-dark oak', 'dark_wood', .6,
               bright=.7, sat=.18,tint=(.62,.56,.44),rough=(.72, .92), bump=.45, vary=.12)
stone = scan('cellar | rubbed inscription limestone', 'old_sandstone_02', 1,
             tint=(.74, .71, .63), bright=.9, sat=.18, rough=(.7, .91), bump=.4, uvs=True)
mortar = scan('cellar | coarse lime mortar', 'worn_plaster_wall', .85,
              tint=(.55, .51, .42), bright=.8, sat=.15, rough=(.87, .97), bump=.65)
flag = scan('cellar | damp stone flags', 'old_sandstone_02', 1,
            tint=(.46, .50, .49), bright=.65, sat=.04, rough=(.28, .59), bump=.48,
            vary=.2, grime=.14, uvs=True)
iron = aged_metal('cellar | pitted forged iron', (.16, .16, .145), (.11, .057, .028),
                   rough=(.34, .66), scale=45, tarnish=.62, hammer=.16)
brass = aged_metal('cellar | worn candle brass', (.43, .28, .10), (.07, .06, .035),
                    rough=(.3, .58), tarnish=.56)
dark = plain('cellar | dark recesses', (.012, .010, .008), .96)
paper = scan('cellar | old rag paper', 'plastered_wall_04', .5,
             tint=(.66, .55, .36), bright=.85, sat=.1, rough=(.82, .94), bump=.15)
wax = plain('cellar | ivory beeswax', (.59, .49, .32), .53)
wax.node_tree.nodes['Principled BSDF'].inputs['Subsurface Weight'].default_value = .18
rust = aged_metal('cellar | dark rust on pipe unions', (.09, .055, .032), (.12, .05, .02),
                   rough=(.53, .85), scale=60, tarnish=.74)


def brick_material(index):
    mat = scan(f'cellar | fired clay {index}', 'old_sandstone_02', 1,
               tint=(.55 + .055 * index, .31 + .025 * index, .19 + .021 * index),
               bright=.8, sat=.2, rough=(.72, .94), bump=.72, vary=.13, uvs=True)
    n, links = mat.node_tree.nodes, mat.node_tree.links.new
    bsdf = n['Principled BSDF']
    # World height and slow noise give a continuous rising damp line, rather
    # than a repeated painted band on each individual brick.
    geom = n.new('ShaderNodeNewGeometry')
    sep = n.new('ShaderNodeSeparateXYZ'); links(geom.outputs['Position'], sep.inputs[0])
    noise = n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 4.2
    links(geom.outputs['Position'], noise.inputs['Vector'])
    mul = n.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = .36
    links(noise.outputs['Fac'], mul.inputs[0])
    add = n.new('ShaderNodeMath'); add.operation = 'ADD'; links(sep.outputs['Z'], add.inputs[0]); links(mul.outputs[0], add.inputs[1])
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = .12; ramp.color_ramp.elements[0].color = (.25, .29, .22, 1)
    ramp.color_ramp.elements[1].position = .94; ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    links(add.outputs[0], ramp.inputs[0])
    mix = n.new('ShaderNodeMixRGB'); mix.blend_type = 'MULTIPLY'; mix.inputs[0].default_value = 1
    links(bsdf.inputs['Base Color'].links[0].from_socket, mix.inputs[1]); links(ramp.outputs[0], mix.inputs[2]); links(mix.outputs[0], bsdf.inputs['Base Color'])
    # Sparse lime salts have migrated out of the old mortar onto the clay.
    salts=n.new('ShaderNodeTexNoise');salts.inputs['Scale'].default_value=8.5;salts.inputs['Detail'].default_value=5
    links(geom.outputs['Position'],salts.inputs['Vector'])
    saltmask=n.new('ShaderNodeValToRGB');saltmask.color_ramp.elements[0].position=.57
    saltmask.color_ramp.elements[0].color=(0,0,0,1);saltmask.color_ramp.elements[1].position=.76
    saltmask.color_ramp.elements[1].color=(.40,.40,.40,1);links(salts.outputs['Fac'],saltmask.inputs[0])
    bloom=n.new('ShaderNodeMixRGB');bloom.inputs[2].default_value=(.32,.30,.25,1)
    links(saltmask.outputs[0],bloom.inputs[0]);links(mix.outputs[0],bloom.inputs[1]);links(bloom.outputs[0],bsdf.inputs['Base Color'])
    return mat


bricks = [brick_material(i) for i in range(5)]
# Closed wall cores and actual bed joints, with imperfect solid clay bricks.
block('rear lime mortar wall', -3.65, 3.65, 4.754, 5.05, -.12, 3.1, mortar, keep=False)
block('left return masonry', -3.75, -3.48, -1.5, 4.9, -.1, 3.1, mortar, keep=False)
block('right return masonry', 3.48, 3.75, -1.5, 4.9, -.1, 3.1, mortar, keep=False)
for row in range(32):
    z0 = row * .092 + .006
    start = -3.7 - (row % 2) * .132
    for column in range(29):
        x0 = start + column * .264 + .005
        x1 = x0 + .251 + RNG.uniform(-.006, .006)
        if x1 < -3.52 or x0 > 3.52:
            continue
        x0, x1 = max(-3.52, x0), min(3.52, x1)
        if x1 - x0 < .018:
            continue
        front = 4.735 + RNG.uniform(-.012, .011)
        z1 = z0 + .079 + RNG.uniform(-.003, .003)
        outline=[(x0,z0),(x1,z0),(x1,z1),(x0,z1)]
        if RNG.random()<.19 and x1-x0>.1:
            chip=RNG.uniform(.009,.024)
            outline=[(x0,z0),(x1,z0),(x1,z1-chip*.7),(x1-chip,z1),(x0,z1)]
        count=len(outline)
        verts = [(x + RNG.uniform(-.003, .003), y, z + RNG.uniform(-.002, .002))
                 for y in [front, 4.84] for x, z in outline]
        faces=[tuple(range(count)),tuple(range(count*2-1,count-1,-1))]
        faces += [(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
        obj = mesh('handmade brick, irregular face', verts,faces,
                   RNG.choice(bricks), keep=False, edge=.0035)
        stone_uv(obj,variant=row+column)

# A worn stone floor with real open joints and small lipping between flags.
block('flagstone bedding', -3.7, 3.7, -1.5, 4.85, -.13, -.026, mortar, keep=False)
for row in range(10):
    y0 = -1.3 + row * .63
    for col in range(11):
        x0 = -4.0 + col * .76 + (.38 if row % 2 else 0)
        top = RNG.uniform(-.009, -.003)
        x1, y1 = x0 + .744, y0 + .612
        verts = [(x+RNG.uniform(-.006,.006),y+RNG.uniform(-.005,.005),z)
                 for z in [-.085, top] for x,y in [(x0,y0),(x1,y0),(x1,y1),(x0,y1)]]
        tile=mesh('individual, worn stone flag',verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],flag,keep=False,edge=.008)
        stone_uv(tile,'XY',row+col)

# The ceiling has an actual opening all the way through to the room above.
ceiling = block('overhead oak boards', -3.7, 3.7, -1.5, 4.88, 2.91, 3.00, beamwood, keep=False)
boolean_cut(ceiling, box('open hatch cutter', -2.70, -1.80, 3.60, 4.73, 2.8, 3.2, dark))
for x in [-3.45,-2.78,-1.72,-.96,-.18,.60,1.38,2.16,2.94]:
    block('heavy supporting oak ceiling joist', x-.07,x+.07,-1.4,4.9,2.73,2.92,beamwood,keep=False,edge=.009)
for x0,x1 in [(-3.55,-2.75),(-1.75,3.55)]:
    block('rear timber wall plate',x0,x1,4.51,4.79,2.68,2.88,beamwood,keep=False,edge=.009)
for x in [-2.70,-1.80]:
    block('hatch trimmed structural side',x-.045,x+.045,3.58,4.79,2.75,3.1,oak,keep=False,edge=.007)
block('hatch front trimmer',-2.75,-1.75,3.55,3.65,2.75,3.1,oak,keep=False,edge=.007)
block('hatch lining above ceiling',-2.8,-2.7,3.6,4.8,3,4.3,mortar,keep=False)
block('hatch lining above ceiling',-1.8,-1.7,3.6,4.8,3,4.3,mortar,keep=False)
block('room above rear wall',-2.8,-1.7,4.78,4.95,2.96,4.3,mortar,keep=False)

# A complete iron ladder: both stringers enter the opening, rungs reach
# both rails, and stand-off brackets are fixed into the masonry.
for x in [-2.47,-2.03]:
    rail = bar('forged ladder stringer',[(x,4.02,.02),(x,4.54,2.92),(x,4.54,3.48)],.021,iron,keep=False)
    for z in [.30,1.35,2.40]:
        y = 4.02+.52*z/2.92
        rod('ladder masonry stand-off',(x,y,z),(x,4.735,z),.015,iron)
        block('ladder anchor plate',x-.055,x+.055,4.70,4.735,z-.062,z+.062,iron,keep=False,edge=.004)
        for zz in [z-.036,z+.036]:
            rod('ladder anchor bolt',(x,4.69,zz),(x,4.725,zz),.012,iron,6)
for i in range(12):
    z = .14 + i*.272
    y = 4.02+.52*min(z,2.92)/2.92
    rod('worn iron ladder rung',(-2.48,y,z),(-2.02,y,z),.017,iron)

# An old iron service main with swept elbow, actual unions and wall clips.
pipe_y, pipe_z = 4.53, 2.49
elbow = [(-.38,pipe_y,.08),(-.38,pipe_y,2.32)]
elbow += [(-.21-.17*math.cos(i*math.pi/2/20),pipe_y,2.32+.17*math.sin(i*math.pi/2/20)) for i in range(21)]
elbow += [(3.65,pipe_y,pipe_z)]
bar('continuous cast-iron service pipe',elbow,.050,iron,keep=False)
for x in [.10,1.24,2.58]:
    rod('cast iron sleeve union',(x-.055,pipe_y,pipe_z),(x+.055,pipe_y,pipe_z),.066,rust)
    for xx in [x-.05,x+.05]:
        rod('union raised edge',(xx-.006,pipe_y,pipe_z),(xx+.006,pipe_y,pipe_z),.071,iron)
for x in [.62,1.98,3.21]:
    block('pipe clip wall plate',x-.045,x+.045,4.70,4.735,pipe_z-.11,pipe_z+.11,iron,keep=False)
    rod('pipe stand-off',(x,pipe_y,pipe_z),(x,4.74,pipe_z),.015,iron)
    for z in [pipe_z-.079,pipe_z+.079]:
        rod('pipe anchor screw',(x,4.685,z),(x,4.715,z),.011,iron,6)
    # Ring in YZ plane, wrapped around the pipe rather than crossing it.
    pts=[(x,pipe_y+.061*math.cos(i*math.tau/64),pipe_z+.061*math.sin(i*math.tau/64)) for i in range(65)]
    bar('service pipe strap',pts,.008,iron,keep=False)
for z in [.14,1.16,2.12]:
    cylinder('vertical pipe sleeve',-.38,pipe_y,z-.04,z+.04,.065,rust)
rod('valve spindle',(-.38,pipe_y,1.18),(-.38,pipe_y-.16,1.18),.017,brass)
circ('valve handwheel',(-.38,pipe_y-.17,1.18),.104,rust,axis='Y',thick=.012)
for a in [0,math.tau/3,2*math.tau/3]:
    rod('valve handwheel spoke',(-.38,pipe_y-.17,1.18),(-.38+.101*math.cos(a),pipe_y-.17,1.18+.101*math.sin(a)),.008,rust)

# The six cipher rows are real V-cut incisions. The dark narrow bottoms
# make them readable without substituting flat painted marks.
slab_x, slab_y = .79, 4.625
sx0,sx1,sz0,sz1 = .40,1.18,.91,2.10
slab = block('limestone tablet inset into brick',sx0,sx1,slab_y,4.81,sz0,sz1,stone,keep=False,edge=.012)
stone_uv(slab)
bpy.context.view_layer.objects.active = slab
for mod in list(slab.modifiers):
    bpy.ops.object.modifier_apply(modifier=mod.name)
for x,z,r in [(sx0-.012,sz1-.034,.028),(sx1+.013,sz0+.04,.029),
              (sx0-.01,1.46,.018),(.94,sz1+.014,.023),(.61,sz0-.012,.022)]:
    boolean_cut(slab,sphere('broken limestone arris cutter',(x,slab_y-.003,z),r,dark,squash=(1,.8,1)))
mark_centres=[]
for row,(left,right) in enumerate(PAIRS):
    z = 1.97-row*.18
    gap, between = .057,.155
    total=(left-1)*gap+between+(right-1)*gap
    x=slab_x-total/2
    centres=[]
    for count in [left,right]:
        for k in range(count):
            lean=RNG.uniform(-.009,.009)
            z0,z1=z-.058+RNG.uniform(-.003,.003),z+.058+RNG.uniform(-.003,.003)
            w=.008
            cut=mesh('V-shaped hand-cut tally cutter',[(x-w,slab_y-.012,z0),(x+w,slab_y-.012,z0),(x,slab_y+.020,z0),
                (x+lean-w,slab_y-.012,z1),(x+lean+w,slab_y-.012,z1),(x+lean,slab_y+.020,z1)],
                [(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],dark,keep=False)
            boolean_cut(slab,cut)
            bar('dust in the bottom of a carved tally',[(x,slab_y+.017,z0+.006),(x+lean,slab_y+.017,z1-.006)],.0023,dark,keep=False)
            centres.append([x,z]);x+=gap
        x+=between-gap
    mark_centres.append(centres)

# Carved Z sits after the fifth position of the rack's bottom row.
z_tile=block('rubbed limestone face for the last alphabet letter',2.96,3.19,4.69,4.83,.07,.30,stone,keep=False,edge=.006)
stone_uv(z_tile)
bpy.context.view_layer.objects.active=z_tile
for mod in list(z_tile.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
z_path=[(2.995,4.691,.275),(3.155,4.691,.275),(2.995,4.691,.105),(3.155,4.691,.105)]
for a,b in zip(z_path,z_path[1:]):
    cutter=bar('incised Z cutter',[a,b],.010,dark,keep=False)
    bpy.context.view_layer.objects.active=cutter;cutter.select_set(True)
    bpy.ops.object.convert(target='MESH');cutter=bpy.context.object
    boolean_cut(z_tile,cutter)
    aa=(a[0],4.695,a[2]);bb=(b[0],4.695,b[2])
    bar('Z groove shadow',[aa,bb],.003,dark,keep=False)

props = build_props(dict(oak=oak,iron=iron,brass=brass,paper=paper,wax=wax,dark=dark))
wick=Vector(props['candle'])

# Thin uneven puddle: a horizontal reflective surface with rippled normals.
water=plain('cellar | shallow standing water',(.035,.043,.039),.105,transmission=.68,ior=1.333,coat=.35)
n=water.node_tree.nodes;lk=water.node_tree.links.new
noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=110;noise.inputs['Detail'].default_value=2
bp=n.new('ShaderNodeBump');bp.inputs['Strength'].default_value=.12;bp.inputs['Distance'].default_value=.0015
lk(noise.outputs['Fac'],bp.inputs['Height']);lk(bp.outputs['Normal'],n['Principled BSDF'].inputs['Normal'])
verts=[(.10,4.33,.002)]
for i in range(96):
    a=math.tau*i/96;r=1+.10*math.sin(a*7)+.06*math.sin(a*13)
    verts.append((.10+.63*r*math.cos(a),4.33+.32*r*math.sin(a),.002))
mesh('irregular shallow puddle below the leaking union',verts,[(0,1+i,1+(i+1)%96) for i in range(96)],water,keep=False)
for i in range(55):
    x=RNG.uniform(-3.4,3.4);y=RNG.uniform(3.5,4.66)
    if abs(x-.1)<.7:continue
    sphere('small fallen lime and mortar chips',(x,y,.006),RNG.uniform(.006,.016),mortar,squash=(1,.75,.35))

# Soft cool light entering the open hatch, warm local candle light, and a
# faint bounced fill keep deep detail legible without whitening the cellar.
world=bpy.data.worlds.new('cellar darkness');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.008,.012,.019,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.32;scene.world=world
lamp('light from the room above','AREA',(-2.25,4.07,3.65),aim=(-2.15,4.25,.15),energy=float(arg('--hatch','105')),colour=(.62,.74,1),size=.66,size_y=.82)
lamp('candle illuminating the tablet','POINT',tuple(wick+Vector((0,0,.025))),energy=float(arg('--candle','7')),colour=(1,.55,.22),size=.018)
lamp('faint returned light from foreground stone','AREA',(.2,.6,2.25),aim=(.3,4.8,1.10),energy=float(arg('--fill','60')),colour=(.72,.79,.9),size=4)
for obj in bpy.data.objects:
    if obj.type=='LIGHT':
        obj.visible_glossy=True;obj.visible_camera=False;obj.visible_transmission=False

cd=bpy.data.cameras.new('cellar 32 mm camera');cd.sensor_fit='HORIZONTAL';cd.sensor_width=36;cd.lens=32
cd.clip_start=.05;cd.clip_end=45
cam=link(bpy.data.objects.new('cellar 32 mm camera',cd));cam.location=(0,-2.2,1.65)
cam.rotation_euler=(Vector((0,4.8,1.25))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
cycles(scene,SAMPLES,WIDTH,round(WIDTH*RH/RW),exposure=float(arg('--exposure','1.5')),glare=False)
scene.cycles.adaptive_threshold=.01;scene.cycles.max_bounces=12
scene.cycles.transparent_max_bounces=12;scene.render.use_persistent_data=True
bpy.context.view_layer.update()
project=lambda p:to_picture(scene,cam,p,(RW,RH))
flame_px=abs(project(wick+Vector((0,0,.057)))[1]-project(wick)[1])
slabpoints=[project((x,slab_y,z)) for x in [sx0,sx1] for z in [sz0,sz1]]
pwick=project(wick);drip0=project((.10,pipe_y,pipe_z-.068));drip1=project((.10,pipe_y,.004))
exit_point=project((-2.25,4.49,2.75))
metadata={'width':RW,'height':RH,'candle':{'x':pwick[0],'y':pwick[1],'s':round(flame_px/22,4)},
 'drip':{'x':drip0[0],'y0':drip0[1],'y1':drip1[1]},'exit':{'x':exit_point[0],'y':exit_point[1]},
 'floorY':project((0,4.72,0))[1],'ceilY':project((0,4.72,2.78))[1],
 'slab':{'x0':min(p[0] for p in slabpoints),'y0':min(p[1] for p in slabpoints),
         'w':max(p[0] for p in slabpoints)-min(p[0] for p in slabpoints),'h':max(p[1] for p in slabpoints)-min(p[1] for p in slabpoints)},
 'rack':{'columns':5,'rows':5},'cluePairs':PAIRS,
 'source':'art/blender/basement.py','engravedMarks':sum(sum(p) for p in PAIRS)}
rp=[project((x,y,z)) for x in [1.822,2.788] for y in [4.26,4.52] for z in [-.006,.96]]
metadata['rack']['box']={'x':min(p[0] for p in rp),'y':min(p[1] for p in rp),
                       'width':max(p[0] for p in rp)-min(p[0] for p in rp),
                       'height':max(p[1] for p in rp)-min(p[1] for p in rp)}
metadata['rack']['z']=project((3.075,4.69,.19))
assert metadata['engravedMarks']==31
with open(OUT+'/render.json','w',encoding='utf8') as handle:json.dump(metadata,handle,indent=2)
print('BASEMENT_LANDMARKS',json.dumps(metadata),flush=True)
if '--pack' in sys.argv:bpy.ops.file.pack_all()
blend=arg('--blend',OUT+'/source.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend)
if '--no-render' not in sys.argv:render(scene,OUT+'/plate.png')
print('BASEMENT_COMPLETE',OUT,flush=True)
