"""The physics hall, rebuilt as a real late nineteenth-century observatory.

Metres, real joinery, an optical brass refractor and a working armillary.
The overscan camera shares rotunda.js's focal length and eye position, so
the plate and the animated instrument fit every supported viewport without
stretching. Run with --width 1600 --samples 64 --only plate for a preview.
"""
import os
import math
import json
import random
import sys
import bpy
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import (arg, fresh, link, plain, aged_metal, box, bevel, cylinder,
                 sphere, lathe, lamp, cycles, render, boolean_cut, to_picture,
                 import_model, wear)
from hall_common import scan, clear_glass
from botany_staircase import mesh, block, bar, arch_volume

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OUT = os.path.abspath(arg('--output', ROOT + '/.artifacts/physics-hall-review/render'))
WIDTH = int(arg('--width', '3840'))
SAMPLES = int(arg('--samples', '384'))
ONLY = arg('--only', 'plate,motion').split(',')
REF_W, REF_H, FOCAL = 2800, 1600, 1020
R, YC, WALL = 3.8, 3.3, 3.3
rnd = random.Random(57)
os.makedirs(OUT, exist_ok=True)
scene = fresh()


def on(deg, height, radius=R):
    a = math.radians(deg)
    return Vector((radius * math.sin(a), YC + radius * math.cos(a), height))


def ring(name, centre, radius, material, axis='Z', thick=.006, start=0, stop=math.tau):
    points = []
    for i in range(129):
        a = start + (stop - start) * i / 128
        p = ((radius * math.cos(a), radius * math.sin(a), 0) if axis == 'Z' else
             (radius * math.cos(a), 0, radius * math.sin(a)) if axis == 'Y' else
             (0, radius * math.cos(a), radius * math.sin(a)))
        points.append(Vector(centre) + Vector(p))
    return bar(name, points, thick, material, keep=False)


def segment(name, a, b, radius, material, r2=None):
    a, b = Vector(a), Vector(b)
    obj = cylinder(name, 0, 0, 0, (b-a).length, radius, material, 48, r2)
    obj.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    obj.location = a
    return obj


def wall_piece(name, deg, x0, x1, depth0, depth1, z0, z1, material, radial=R, edge=.004):
    obj = block(name, x0, x1, depth0, depth1, z0, z1, material, keep=False, edge=edge)
    obj.rotation_euler.z = -math.radians(deg)
    obj.location = on(deg, 0, radial)
    return obj


def localpoint(deg, x, depth, z, radial=R):
    return on(deg, 0, radial) + Matrix.Rotation(-math.radians(deg), 3, 'Z') @ Vector((x, depth, z))


def mould(name, radius, height, thick, material):
    return ring(name, (0, YC, height), radius, material, thick=thick)


oak = scan('waxed, time-darkened walnut', 'dark_wood', .85, bright=.67, sat=.72,
           rough=(.36, .62), bump=.38, coat=.12, upright=True, vary=.1)
panel = scan('quarter-sawn oak panels', 'rosewood_veneer1', .72, bright=.5, sat=.6,
             rough=(.42, .68), bump=.32, upright=True, vary=.12)
stone = scan('smoked, worn limestone', 'old_sandstone_02', .7,
             tint=(.5,.49,.46), bright=.55, sat=.18, rough=(.65,.87), bump=.55)
wallmat = scan('dark mineral plaster', 'plastered_wall_04', 1.65,
               tint=(.18,.23,.23), bright=.65, sat=.1, rough=(.72,.94), bump=.35)
dome_mat = scan('aged midnight blue dome', 'worn_plaster_wall', 2.4,
                tint=(.11,.17,.28), bright=.74, sat=.15, rough=(.72,.93), bump=.24)
brass = aged_metal('aged instrument brass', (.43,.29,.12), (.085,.073,.043),
                   rough=(.26,.48), tarnish=.46, hammer=.04)
bronze = aged_metal('old cast bronze', (.22,.14,.065), (.032,.043,.037),
                    rough=(.4,.67), tarnish=.62)
iron = aged_metal('blackened iron', (.045,.048,.05), (.015,.017,.018),
                  rough=(.42,.69), tarnish=.5)
dark = plain('deep crevices', (.009,.007,.005), .91)
glass = plain('closed, slightly imperfect window glass', (.93,.96,.98), .018,
              transmission=1, ior=1.46)
wax = plain('beeswax', (.48,.34,.17), .56, transmission=.05)
flame = plain('candle flame', (1,.55,.2), .5, emit=(1,.36,.08), strength=12)
velvet = scan('old ink-blue linen', 'velour_velvet', .65, tint=(.15,.22,.3),
              bright=.62, sat=.2, rough=(.85,.98), bump=.18)
nodes=wallmat.node_tree.nodes;links=wallmat.node_tree.links.new
bsdf=nodes['Principled BSDF'];coordinates=nodes.new('ShaderNodeTexCoord')
aged=wear(nodes,links,bsdf.inputs['Base Color'].links[0].from_socket,coordinates,
          stains=.2,grime=.13,streaks=.15)
links(aged,bsdf.inputs['Base Color'])

# A continuous, thick cylinder. Only the window and the two actual openings
# cut it; there are no holes disguised with black painted shapes.
wall = cylinder('solid rotunda masonry', 0, YC, -.12, WALL+.06, R+.22, wallmat, 256)
boolean_cut(wall, cylinder('room void', 0, YC, -.2, WALL+.2, R, dark, 256))
door_deg, door_half = 32, R*math.sin(math.radians(7))
door_radial = R*math.cos(math.radians(7))
pass_deg, pass_half = -68, R*math.sin(math.radians(8))
pass_radial = R*math.cos(math.radians(8))
for deg, half, radial, height in [(door_deg,door_half,door_radial,2.14),
                                  (pass_deg,pass_half,pass_radial,2.15)]:
    cut = wall_piece('full-depth opening cutter', deg, -half, half, -.18, .75,
                     -.16, height, dark, radial, edge=0)
    boolean_cut(wall, cut)

half_window = 3.8*math.sin(math.radians(20))/(YC+3.8*math.cos(math.radians(20)))*7.1
window_sill = 1.04
window_top = window_sill + half_window*1.04
window_rise = half_window*.495
window_spring = window_top-window_rise
cut = arch_volume('window opening', half_window, window_spring, window_rise, 6.45, 7.6, dark)
# arch_volume starts below floor; the window's bottom is raised to its sill.
for v in cut.data.vertices:
    if v.co.z < 0: v.co.z = window_sill
boolean_cut(wall, cut)
bevel(wall, .006, 2)

# Individual dado panels and their joinery follow the circular wall. Rails
# stop at real openings; grain, bevels and inset panels catch the candlelight.
for i in range(60):
    deg = -180 + (i+.5)*6
    if abs(deg-door_deg)<9 or abs(deg-pass_deg)<10: continue
    half = R*math.sin(math.radians(3))-.003
    for z0,z1,depth in [(0,.12,.045),(.13,.18,.055),(.96,1.02,.05),(1.03,1.08,.07)]:
        wall_piece('continuous curved dado rail',deg,-half,half,-depth,.008,z0,z1,oak)
    wall_piece('recessed walnut panel',deg,-half+.012,half-.012,-.018,.012,.18,.96,panel)
    for x in [-half+.007,half-.007]:
        wall_piece('panel stile',deg,x-.012,x+.012,-.038,.006,.15,1.03,oak)
    # Fine inner beading on each panel, in real relief.
    for z in [.235,.9]:
        wall_piece('panel bead',deg,-half+.03,half-.03,-.028,-.016,z,z+.009,oak,edge=.002)

for radius,z,thick in [(R-.055,3.19,.035),(R-.08,3.24,.045),
                       (R-.09,3.30,.032),(R-.04,3.35,.035)]:
    mould('layered cornice',radius,z,thick,oak)
mould('fine brass cornice string',R-.13,3.255,.004,bronze)

# Segmented oblate dome, smooth plaster with structural timber ribs.
verts, faces = [], []
NA, NL = 192, 48
for j in range(NL+1):
    lift = (math.pi/2-.001)*j/NL
    for i in range(NA):
        a = math.tau*i/NA
        verts.append((R*math.cos(lift)*math.sin(a), YC+R*math.cos(lift)*math.cos(a),
                      WALL+2*math.sin(lift)))
for j in range(NL):
    for i in range(NA):
        k=j*NA+i; n=j*NA+(i+1)%NA
        faces.append((k,n,n+NA,k+NA))
dome=mesh('masonry observatory dome',verts,faces,dome_mat,keep=False)
for p in dome.data.polygons: p.use_smooth=True
for deg in range(-180,180,30):
    a=math.radians(deg)
    points=[((R-.035)*math.cos(t)*math.sin(a),YC+(R-.035)*math.cos(t)*math.cos(a),
             WALL+1.96*math.sin(t)) for t in [i*math.pi/2/72 for i in range(73)]]
    bar('bent laminated oak dome rib',points,.032,oak,keep=False)
    for zlift in [0.18,.62,1.04]:
        t=zlift
        sphere('bronze rib bolt',((R-.075)*math.cos(t)*math.sin(a),
               YC+(R-.075)*math.cos(t)*math.cos(a),WALL+1.94*math.sin(t)),.012,bronze)
for lift in [.3,.63,1.02]:
    mould('recessed celestial latitude', (R-.035)*math.cos(lift),
           WALL+1.96*math.sin(lift),.0025,bronze)
for i in range(130):
    a=rnd.uniform(0,math.tau); t=rnd.uniform(.13,1.38)
    c=Vector(((R-.025)*math.cos(t)*math.sin(a),YC+(R-.025)*math.cos(t)*math.cos(a),
              WALL+1.965*math.sin(t)))
    sphere('inlaid brass star',c,rnd.uniform(.005,.011),brass)

# Parquet is geometry, including end grain, bevelled edges and dark joints.
floor_base=cylinder('subfloor',0,YC,-.2,-.026,R+.03,dark,192)
boolean_cut(floor_base,cylinder('open spiral well',2.55,3.8,-.3,.1,.85,dark,96))
floors=[scan('oak parquet variation '+str(i),'wood_floor_worn',.6,
             bright=.49+i*.035,sat=.62,rough=(.4,.66),bump=.38,coat=.08,
             rot=(0,0,math.pi/4 if i%2 else -math.pi/4)) for i in range(6)]
for col in range(-11,11):
    x0=col*.39; x1=x0+.39; slope=1 if col%2==0 else -1
    for row in range(-40,45):
        y0=YC+row*.098
        points=[(x0+.002,y0+slope*.002),(x1-.002,y0+slope*.388),
                (x1-.002,y0+slope*.388+.094),(x0+.002,y0+slope*.002+.094)]
        cx=sum(p[0] for p in points)/4; cy=sum(p[1] for p in points)/4
        if cx*cx+(cy-YC)**2>(R+.08)**2 or (cx-2.55)**2+(cy-3.8)**2<1.02**2: continue
        v=[(x,y,z) for z in [-.024,0] for x,y in points]
        mesh('individual chevron parquet board',v,[(0,3,2,1),(4,5,6,7),
             (0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],rnd.choice(floors),keep=False,edge=.0015)

# Window: solid glass, slim timber glazing bars, deep stone sill and real
# cloth folds. The exterior moon is a shaded sphere, not a glowing lamp card.
frame_curve=[(-half_window,7.085,window_sill),(-half_window,7.085,window_spring)]
frame_curve += [(half_window*math.cos(math.pi-i*math.pi/96),7.085,
                 window_spring+window_rise*math.sin(math.pi-i*math.pi/96)) for i in range(97)]
frame_curve += [(half_window,7.085,window_sill)]
bar('arched walnut window frame',frame_curve,.043,oak,keep=False)
bar('inner window brass bead',[(x*.966,y-.018,z+.013) for x,y,z in frame_curve],.007,bronze,keep=False)
pane=arch_volume('4 mm closed window glass',half_window-.045,window_spring,
                  window_rise-.045,7.112,7.116,glass)
for v in pane.data.vertices:
    if v.co.z<0: v.co.z=window_sill+.025
block('sanded limestone window sill',-half_window-.12,half_window+.12,6.9,7.25,
       window_sill-.085,window_sill,stone,keep=False,edge=.018)
for x in [-half_window*.5,0,half_window*.5]:
    top=window_spring+window_rise*math.sqrt(max(0,1-(x/half_window)**2))
    block('vertical glazing bar',x-.012,x+.012,7.075,7.105,window_sill,top-.025,oak,keep=False,edge=.003)
block('horizontal glazing bar',-half_window,half_window,7.075,7.105,window_spring-.012,
       window_spring+.012,oak,keep=False,edge=.003)
for side in [-1,1]:
    vv=[]; ff=[]
    for row in range(25):
        t=row/24
        width=.23+.18*abs(2*t-1)
        for col in range(25):
            q=col/24
            x=side*(half_window-.015-width*q)
            top=window_spring+window_rise*math.sqrt(max(0,1-(x/half_window)**2))-.015
            z=top*(1-t)+(window_sill+.015)*t
            vv.append((x,6.98-.032*math.cos(q*math.tau*5),z))
    for row in range(24):
        for col in range(24):
            k=row*25+col;ff.append((k,k+1,k+26,k+25))
    cloth=mesh('tied-back folded linen curtain',vv,ff,velvet,keep=False)
    solid=cloth.modifiers.new('stitched cloth thickness','SOLIDIFY');solid.thickness=.0015
    bar('curtain brass tie',[(side*(half_window-.07+.07*math.cos(a)),6.92,
        window_sill+.45+.02*math.sin(a)) for a in [i*math.pi/32 for i in range(33)]],.008,bronze,keep=False)

sky=plain('night sky',(.004,.008,.018),1,emit=(.009,.016,.034),strength=.5)
sn=sky.node_tree.nodes;sl=sky.node_tree.links
cloud=sn.new('ShaderNodeTexNoise');cloud.inputs['Scale'].default_value=.28;cloud.inputs['Detail'].default_value=5;cloud.inputs['Roughness'].default_value=.7
coordinates=sn.new('ShaderNodeTexCoord');mapping=sn.new('ShaderNodeMapping');mapping.inputs['Scale'].default_value=(.7,1,2.4)
sl.new(coordinates.outputs['Object'],mapping.inputs['Vector']);sl.new(mapping.outputs['Vector'],cloud.inputs['Vector'])
cr=sn.new('ShaderNodeValToRGB');cr.color_ramp.elements[0].position=.32;cr.color_ramp.elements[1].position=.72
cr.color_ramp.elements[0].color=(.006,.012,.026,1);cr.color_ramp.elements[1].color=(.022,.032,.052,1)
sl.new(cloud.outputs['Fac'],cr.inputs['Fac']);sl.new(cr.outputs['Color'],sn['Principled BSDF'].inputs['Emission Color'])
block('night beyond the window',-40,40,30,30.1,-5,35,sky,keep=False,edge=0)
moonmat=plain('weathered lunar surface',(.46,.48,.48),.95,emit=(.3,.33,.37),strength=.5)
mn=moonmat.node_tree.nodes; ml=moonmat.node_tree.links
noise=mn.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=17;noise.inputs['Detail'].default_value=6
ramp=mn.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.09,.11,.13,1);ramp.color_ramp.elements[1].color=(.62,.64,.65,1)
ml.new(noise.outputs['Fac'],ramp.inputs['Fac']);ml.new(ramp.outputs['Color'],mn['Principled BSDF'].inputs['Base Color'])
ml.new(ramp.outputs['Color'],mn['Principled BSDF'].inputs['Emission Color'])
moon=sphere('the moon over the valley',(2.8,29,4.3),.42,moonmat)
# Silhouetted distant hills, outside the glazing rather than on it.
hillmat=plain('distant wooded ridge',(.004,.009,.012),1)
points=[(-30,28,-3),(30,28,-3)]
points += [(x,28,.22+.12*math.sin(x*.48)+.07*math.sin(x*1.3)) for x in range(30,-31,-1)]
mesh('distant ridge',points,[tuple(range(len(points)))],hillmat,keep=False)

# A heavy walnut six-panel door, exact to XI's original hit polygon.
wall_piece('door XI recessed solid leaf',door_deg,-door_half+.016,door_half-.016,.028,.08,
           .018,2.125,oak,door_radial)
for x in [-door_half-.055,door_half+.055]:
    wall_piece('carved door jamb',door_deg,x-.06,x+.06,-.075,.1,0,2.26,oak,door_radial,edge=.009)
    wall_piece('door jamb bronze string',door_deg,x-.036,x-.031,-.083,-.075,.16,2.16,bronze,door_radial,edge=.001)
wall_piece('door pediment',door_deg,-door_half-.15,door_half+.15,-.09,.1,2.14,2.28,oak,door_radial,edge=.009)
for x in [-.225,.225]:
    for z0,z1 in [(.16,.57),(.69,1.35),(1.47,1.96)]:
        wall_piece('raised walnut door panel',door_deg,x-.167,x+.167,.008,.029,z0,z1,panel,door_radial)
        for z in [z0-.012,z1+.007]:
            wall_piece('door panel field moulding',door_deg,x-.184,x+.184,-.008,.01,z,z+.014,oak,door_radial)
        for xx in [x-.183,x+.17]:
            wall_piece('door panel stile bead',door_deg,xx,xx+.014,-.008,.01,z0,z1,oak,door_radial)
for z in [.28,1.05,1.87]:
    segment('forged barrel hinge',localpoint(door_deg,-door_half+.012,-.006,z,door_radial),
            localpoint(door_deg,-door_half+.012,-.006,z+.09,door_radial),.013,bronze)
wall_piece('lock escutcheon',door_deg,.284,.34,-.018,.004,.87,1.08,bronze,door_radial)
handle=localpoint(door_deg,.31,-.066,1.01,door_radial)
sphere('turned brass door knob',handle,.027,brass)
bar('door knob spindle',[handle,localpoint(door_deg,.31,.005,1.01,door_radial)],.01,bronze,keep=False)
wall_piece('numeral bronze plaque',door_deg,-.095,.095,-.018,.005,2.045,2.125,bronze,door_radial)
text=bpy.data.curves.new('XI engraved numeral','FONT');text.body='XI';text.align_x='CENTER';text.size=.067;text.extrude=.0006
obj=link(bpy.data.objects.new('XI',text));obj.data.materials.append(brass)
obj.rotation_euler=(math.pi/2,0,-math.radians(door_deg));obj.location=localpoint(door_deg,0,-.02,2.064,door_radial)

# Left-hand gallery opening, with masonry reveals and timber lintel. The
# corridor bends away behind it and stays readable in the same low light.
for x in [-pass_half-.075,pass_half+.075]:
    wall_piece('passage stone jamb',pass_deg,x-.075,x+.075,-.055,.35,0,2.28,stone,pass_radial,edge=.014)
    for z in [.32,.7,1.08,1.46,1.84]:
        wall_piece('passage stone joint',pass_deg,x-.077,x+.077,-.057,.352,z,z+.008,dark,pass_radial,edge=.001)
wall_piece('gallery lintel',pass_deg,-pass_half-.17,pass_half+.17,-.075,.38,2.15,2.32,stone,pass_radial,edge=.015)
for side in [-1,1]:
    wall_piece('gallery passage wall',pass_deg,side*(pass_half+.07)-.07,side*(pass_half+.07)+.07,
               .25,3.1,0,2.5,wallmat,pass_radial)
    wall_piece('gallery passage dado',pass_deg,side*(pass_half+.025)-.035,side*(pass_half+.025)+.035,
               .3,3.1,0,1.02,oak,pass_radial)
wall_piece('gallery shadow end wall',pass_deg,-pass_half-.1,pass_half+.1,3,3.1,0,2.55,wallmat,pass_radial)
wall_piece('gallery floor',pass_deg,-pass_half,pass_half,0,3.1,-.03,0,floors[2],pass_radial)
wall_piece('gallery ceiling',pass_deg,-pass_half,pass_half,.18,3.1,2.42,2.5,oak,pass_radial)
lamp('gallery candle bounce','POINT',localpoint(pass_deg,-.2,2,1.75,pass_radial),energy=4,
     colour=(1,.55,.22),size=.18)

# Real descending spiral staircase and forged balustrade. An annular stone
# collar masks the parquet's trimmed ends around the open well.
def annulus(name,cx,cy,inner,outer,z0,z1,mat,start=0,stop=math.tau,steps=96):
    vv=[]
    for z in [z0,z1]:
        for r in [inner,outer]:
            vv += [(cx+r*math.cos(start+(stop-start)*i/steps),cy+r*math.sin(start+(stop-start)*i/steps),z) for i in range(steps+1)]
    n=steps+1;ff=[]
    for i in range(steps):
        ff += [(i,i+1,n+i+1,n+i),(2*n+i,3*n+i,3*n+i+1,2*n+i+1),
               (i,2*n+i,2*n+i+1,i+1),(n+i,n+i+1,3*n+i+1,3*n+i)]
    ff += [(0,n,3*n,2*n),(steps,2*n-1,4*n-1,3*n-1)]
    return mesh(name,vv,ff,mat,keep=False,edge=.004)
annulus('worn stone stairwell collar',2.55,3.8,.85,1.12,-.04,.018,stone)
cylinder('spiral stair iron centre post',2.55,3.8,-3.75,.76,.075,iron,64)
for i in range(22):
    a=math.radians(145+i*24); b=a+math.radians(25)
    annulus('descending solid oak spiral tread',2.55,3.8,.09,.83,-.175*i-.095,-.175*i-.025,oak,a,b,12)
    p=(2.55+.8*math.cos(a),3.8+.8*math.sin(a))
    if i<12:
        segment('stair handrail baluster',(p[0],p[1],-.175*i),(p[0],p[1],.84-.175*i),.012,iron)
bar('descending curved oak handrail',[(2.55+.81*math.cos(math.radians(145+i*2)),
    3.8+.81*math.sin(math.radians(145+i*2)),.86-.175*(i/12)) for i in range(145)],.035,oak,keep=False)
for deg in range(-140,150,20):
    p=(2.55+.96*math.cos(math.radians(deg)),3.8+.96*math.sin(math.radians(deg)))
    segment('well rim forged iron baluster',(p[0],p[1],.02),(p[0],p[1],.91),.015,iron)
    for z in [.18,.72]: cylinder('bronze baluster collar',p[0],p[1],z,z+.032,.022,bronze)
    sphere('handrail rivet',(p[0],p[1],.915),.021,bronze)
ring('well rim oval oak handrail',(2.55,3.8,.94),.96,oak,thick=.036,
     start=math.radians(-140),stop=math.radians(145))
for deg in [-140,145]:
    p=(2.55+.96*math.cos(math.radians(deg)),3.8+.96*math.sin(math.radians(deg)))
    lathe('turned walnut newel',[(.065,0),(.065,.1),(.04,.17),(.035,.72),(.055,.82),(.055,.96)],oak,at=(*p,0))
    sphere('bronze newel finial',(*p,1.015),.068,bronze)

# The refractor: timber tripod, metal shoes and braces, equatorial mount,
# collimating rings, objective lens, focusing rack and knurled knobs.
before_scope=set(bpy.data.objects)
scope=Vector((.34,5.92,0)); mount=scope+Vector((0,0,1.12))
for angle in [10,130,250]:
    a=math.radians(angle); foot=scope+Vector((.4*math.cos(a),.4*math.sin(a),.035))
    top=scope+Vector((.09*math.cos(a),.09*math.sin(a),1.1))
    for side in [-1,1]:
        offset=Vector((.02*side*math.sin(a),-.02*side*math.cos(a),0))
        segment('split mahogany tripod leg',foot+offset,top+offset,.018,oak,.026)
    segment('tripod metal shoe',foot-Vector((0,0,.025)),foot+Vector((0,0,.085)),.028,bronze)
    bar('tripod spreader',[scope+Vector((0,0,.4)),scope+Vector((.24*math.cos(a),.24*math.sin(a),.41))],.009,iron,keep=False)
lathe('telescope mount base',[(.07,1.06),(.09,1.08),(.09,1.12),(.065,1.14),(.055,1.22)],bronze,at=scope)
axis=Vector((-.3,.57,.76)).normalized()
rear=scope+Vector((.12,-.17,1.07)); front=rear+axis*1.0
segment('brass telescope optical tube',rear,front,.069,brass)
for t in [.14,.38,.71,.94]:
    p=rear+axis*t
    segment('machined brass tube ring',p-axis*.012,p+axis*.012,.077,bronze)
segment('objective shade barrel',front-axis*.05,front+axis*.11,.087,bronze,.091)
lensmat=plain('blue coated objective lens',(.05,.11,.15),.05,metal=.25,transmission=.6)
segment('objective lens glass',front+axis*.107,front+axis*.111,.079,lensmat)
segment('focuser sliding tube',rear-axis*.19,rear,.027,bronze)
segment('eyepiece',rear-axis*.255,rear-axis*.17,.037,iron)
segment('equatorial polar axis',mount+Vector((0,-.065,-.05)),mount+Vector((0,.055,.15)),.043,bronze)
segment('declination axle',mount-Vector((.16,0,0)),mount+Vector((.16,0,0)),.022,brass)
segment('equatorial counterweight rod',mount,mount-Vector((.28,0,.18)),.012,bronze)
segment('counterweight',mount-Vector((.23,0,.15)),mount-Vector((.29,0,.19)),.06,iron)
for x in [-.15,.15]:
    sphere('knurled slow-motion control',mount+Vector((x,-.08,.055)),.023,bronze)
bar('telescope rack and pinion', [rear+Vector((.04,-.025,0)),rear-axis*.16+Vector((.04,-.025,0))],.006,bronze,keep=False)
scope_objects=[o for o in bpy.data.objects if o not in before_scope]

# The armillary stands on a turned walnut pedestal. Its globe is a native
# animated pass; all rings, engraving ticks and the earth are real meshes.
arm=on(-51,0,R-.26)
lathe('armillary pedestal',[(.17,0),(.17,.045),(.14,.075),(.11,.11),(.09,.18),
      (.06,.42),(.07,.51),(.115,.56),(.15,.6),(.15,.625)],oak,at=arm)
lathe('armillary bronze saddle',[(.1,.625),(.1,.64),(.045,.67),(.022,.72),(.04,.75)],bronze,at=arm)
centre=arm+Vector((0,0,.806)); before=set(bpy.data.objects)
ring('armillary horizon',centre,.225,brass,thick=.009)
ring('armillary meridian',centre,.211,bronze,axis='Y',thick=.008)
segment('north south spindle',centre-Vector((0,0,.245)),centre+Vector((0,0,.245)),.007,bronze)
for side in [-1,1]: sphere('armillary spindle finial',centre+Vector((0,0,side*.252)),.014,brass)
for i in range(72):
    a=math.tau*i/72
    bar('engraved horizon graduation',[centre+Vector((.216*math.cos(a),.216*math.sin(a),.008)),
        centre+Vector(((.23 if i%6==0 else .225)*math.cos(a),(.23 if i%6==0 else .225)*math.sin(a),.008))],.0012,dark,keep=False)
static_globe=[o for o in bpy.data.objects if o not in before]
before=set(bpy.data.objects)
inner=ring('rotating equator',centre,.18,brass,thick=.007)
ring('rotating meridian',centre,.181,brass,axis='X',thick=.006)
ecliptic=ring('inclined ecliptic',centre,.195,bronze,thick=.008)
# rotate ring geometry about the globe's centre rather than about the origin
for sp in ecliptic.data.splines:
    for p in sp.points:
        v=Vector(p.co[:3])-centre; v=Matrix.Rotation(.41,3,'Y')@v+centre; p.co=(*v,1)
earthmat=plain('old ivory terrestrial globe',(.22,.24,.19),.65)
sphere('small terrestrial globe',centre,.043,earthmat)
rotating=[o for o in bpy.data.objects if o not in before]
rotor=link(bpy.data.objects.new('armillary rotating assembly',None));rotor.location=centre
for obj in rotating:
    obj.parent=rotor;obj.matrix_parent_inverse=Matrix.Translation(centre).inverted()
globe=static_globe+rotating

# A restrained collection of period apparatus against the side walls.
# Imported museum objects are CC0 scans; the furniture is fitted to the room.
console_deg=-35
wall_piece('physics instrument console top',console_deg,-.44,.44,-.42,-.02,.73,.785,oak,R-.08,edge=.012)
for x in [-.35,.35]:
    for d in [-.34,-.08]:
        lathe('console turned leg',[(.025,0),(.025,.1),(.017,.2),(.021,.67),(.032,.73)],oak,
              at=localpoint(console_deg,x,d,0,R-.08))
try:
    import_model('vintage_microscope',height=.38,at=localpoint(console_deg,.12,-.24,.785,R-.08),rot=.35)
    import_model('book_encyclopedia_set_01',height=.24,at=localpoint(console_deg,-.24,-.18,.785,R-.08),rot=-.55)
except Exception as error:
    print('Optional scanned apparatus unavailable:',error)

# Framed optics folio: yellowed paper, fine line engraving and a glazed
# walnut frame. A period teaching plate gives the wall a human scale.
folio_deg=-44
paper=plain('aged rag paper',(.39,.32,.21),.86)
pn=paper.node_tree.nodes;pl=paper.node_tree.links
foxing=pn.new('ShaderNodeTexNoise');foxing.inputs['Scale'].default_value=22;foxing.inputs['Detail'].default_value=3
pr=pn.new('ShaderNodeValToRGB');pr.color_ramp.elements[0].color=(.27,.20,.12,1);pr.color_ramp.elements[1].color=(.48,.40,.27,1)
pl.new(foxing.outputs['Fac'],pr.inputs['Fac']);pl.new(pr.outputs['Color'],pn['Principled BSDF'].inputs['Base Color'])
ink=plain('faded engraving ink',(.025,.021,.016),.9)
wall_piece('optics folio backing',folio_deg,-.385,.385,-.035,.025,1.49,2.55,oak,R-.055)
wall_piece('optics folio rag paper',folio_deg,-.338,.338,-.041,-.036,1.54,2.50,paper,R-.055,edge=.001)
for x in [-.36,.36]:
    wall_piece('folio frame upright',folio_deg,x-.028,x+.028,-.075,-.028,1.49,2.55,oak,R-.055)
for z in [1.515,2.525]:
    wall_piece('folio frame crosspiece',folio_deg,-.385,.385,-.075,-.028,z-.025,z+.025,oak,R-.055)
def label(body,x,z,size=.025):
    data=bpy.data.curves.new('engraved optics lettering','FONT');data.body=body;data.size=size;data.align_x='CENTER'
    obj=link(bpy.data.objects.new('optics folio lettering',data));obj.data.materials.append(ink)
    obj.rotation_euler=(math.pi/2,0,-math.radians(folio_deg))
    obj.location=localpoint(folio_deg,x,-.044,z,R-.055)
label('PRINCIPLES OF OPTICS',0,2.40,.037)
label('LIGHT  -  REFRACTION  -  FOCUS',0,2.34,.018)
for zc in [2.16,1.84]:
    # A convex lens with parallel rays converging to its principal focus.
    for side in [-1,1]:
        bar('engraved convex lens',[localpoint(folio_deg,side*.022*math.sin(math.pi*i/32),-.044,
            zc-.13+.26*i/32,R-.055) for i in range(33)],.0014,ink,keep=False)
    bar('optical axis',[localpoint(folio_deg,-.28,-.044,zc,R-.055),localpoint(folio_deg,.28,-.044,zc,R-.055)],.0007,ink,keep=False)
    for h in [-.085,0,.085]:
        bar('engraved light ray',[localpoint(folio_deg,-.275,-.044,zc+h,R-.055),
            localpoint(folio_deg,0,-.044,zc+h,R-.055),localpoint(folio_deg,.21,-.044,zc,R-.055)],.001,ink,keep=False)
label('I. PARALLEL RAYS',0,1.97,.021)
label('II. THE PRINCIPAL FOCUS',0,1.65,.021)
# A physical pendulum demonstration beside XI, fixed out of its doorway.
pend_deg=62
wall_piece('pendulum demonstration backboard',pend_deg,-.12,.12,-.04,.0,.8,2.04,oak)
wall_piece('pendulum pivot bracket',pend_deg,-.08,.08,-.13,-.02,1.98,2.025,bronze)
bar('pendulum steel wire',[localpoint(pend_deg,0,-.11,1.98),localpoint(pend_deg,.018,-.11,.99)],.0025,iron,keep=False)
sphere('brass pendulum bob',localpoint(pend_deg,.018,-.11,.99),.055,brass)

# Both sconces have sockets, wall plates, brackets and small wax candles.
for deg in [-23,42.5]:
    p=on(deg,0,R-.14)
    wall_piece('bronze sconce backplate',deg,-.075,.075,-.02,.012,1.63,1.96,bronze)
    bar('curved forged sconce arm',[on(deg,1.69,R-.02),on(deg,1.66,R-.15),on(deg,1.85,R-.14)],.014,bronze,keep=False)
    lathe('candle cup and drip pan',[(.023,1.83),(.024,1.87),(.06,1.89),(.06,1.9),(.026,1.91)],bronze,at=(p.x,p.y,0))
    cylinder('beeswax candle',p.x,p.y,1.9,2.145,.019,wax)
    sphere('small candle flame',(p.x,p.y,2.17),.012,flame,squash=(.65,.65,1.9))
    lamp('warm candle, chemistry reference','POINT',(p.x,p.y,2.17),energy=9,colour=(1,.55,.22),size=.045)

# Match the chemistry hall's cool fill, warm flames and exposure; moonlight
# is soft and directional, with no bright emissive rectangle in the glass.
world=bpy.data.worlds.new('night');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.04,.055,.085,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.12;scene.world=world
lamp('cool room fill, chemistry reference','AREA',(0,1.8,3.05),aim=(0,5.1,1.1),energy=60,colour=(.8,.85,1),size=3.4)
moonlight=lamp('moon window soft light','AREA',(-.25,7.5,3.5),aim=(-.9,2.4,.1),energy=120,colour=(.55,.68,1),size=1.3,size_y=.9)
moonlight.visible_camera=False;moonlight.visible_glossy=False;moonlight.visible_transmission=False
lamp('very low camera fill','AREA',(0,.1,2.0),aim=(0,5.5,1.5),energy=14,colour=(.8,.85,1),size=4)
for light in [o for o in bpy.data.objects if o.type=='LIGHT' and o.data.type=='AREA']:
    light.visible_camera=False;light.visible_glossy=False;light.visible_transmission=False
air=box('subtle suspended dust',-3.65,3.65,.2,7.0,.03,3.15,dark)
volume=bpy.data.materials.new('observatory air');volume.use_nodes=True;N=volume.node_tree.nodes
N.remove(N['Principled BSDF']);v=N.new('ShaderNodeVolumePrincipled');v.inputs['Density'].default_value=.008;v.inputs['Anisotropy'].default_value=.35
volume.node_tree.links.new(v.outputs['Volume'],N['Material Output'].inputs['Volume']);air.data.materials.clear();air.data.materials.append(volume)
air.visible_shadow=False
clear_glass()

camera_data=bpy.data.cameras.new('rotunda responsive camera')
camera_data.lens=FOCAL/REF_W*36;camera_data.sensor_width=36;camera_data.sensor_fit='HORIZONTAL'
camera_data.shift_y=-(REF_H/2-760)/REF_W;camera_data.clip_start=.04;camera_data.clip_end=90
camera=link(bpy.data.objects.new('rotunda responsive camera',camera_data));camera.location=(0,0,1.5);camera.rotation_euler=(math.pi/2,0,0);scene.camera=camera
cycles(scene,SAMPLES,WIDTH,round(WIDTH*REF_H/REF_W),exposure=1.5)
scene.render.use_persistent_data=True
scene.render.image_settings.color_depth='8'
scene.cycles.transparent_max_bounces=12
bpy.context.view_layer.update()
metadata={'reference':{'width':REF_W,'height':REF_H,'focal':FOCAL,'cx':1400,'cy':760},
          'door':[to_picture(scene,camera,localpoint(door_deg,x,0,z,door_radial),(REF_W,REF_H)) for x,z in [(-door_half,2.14),(door_half,2.14),(door_half,0),(-door_half,0)]],
          'telescope':to_picture(scene,camera,scope,(REF_W,REF_H))}
scope_points=[to_picture(scene,camera,obj.matrix_world@Vector(corner),(REF_W,REF_H))
              for obj in scope_objects for corner in obj.bound_box]
sx0=min(p[0] for p in scope_points)-10;sy0=min(p[1] for p in scope_points)-10
metadata['telescopeBox']={'x':sx0,'y':sy0,'width':max(p[0] for p in scope_points)+10-sx0,
                         'height':max(p[1] for p in scope_points)+10-sy0}
blend=arg('--blend',OUT+'/source.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend)

if 'plate' in ONLY:
    for obj in globe: obj.visible_camera=False
    render(scene,OUT+'/plate.png')
    for obj in globe: obj.visible_camera=True

if 'motion' in ONLY:
    from bpy_extras.object_utils import world_to_camera_view
    resolution=(scene.render.resolution_x,scene.render.resolution_y)
    pts=[to_picture(scene,camera,centre+Vector((x,y,z)),resolution)
         for x in [-.28,.28] for y in [-.28,.28] for z in [-.28,.28]]
    x0=math.floor(min(p[0] for p in pts))-8;x1=math.ceil(max(p[0] for p in pts))+8
    y0=math.floor(min(p[1] for p in pts))-8;y1=math.ceil(max(p[1] for p in pts))+8
    scene.render.use_border=True;scene.render.use_crop_to_border=True
    scene.render.border_min_x=x0/resolution[0];scene.render.border_max_x=x1/resolution[0]
    scene.render.border_min_y=1-y1/resolution[1];scene.render.border_max_y=1-y0/resolution[1]
    scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA'
    fixed=[o for o in bpy.data.objects if o.type in ['MESH','CURVE','FONT'] and o not in globe]
    for obj in fixed: obj.is_holdout=True
    air.hide_render=True
    scene.cycles.samples=min(SAMPLES,192)
    metadata['armillary']={'frames':64,'columns':8,'period':48000,
        'box':{'x':x0/resolution[0]*REF_W,'y':y0/resolution[1]*REF_H,
               'width':(x1-x0)/resolution[0]*REF_W,'height':(y1-y0)/resolution[1]*REF_H}}
    os.makedirs(OUT+'/motion',exist_ok=True)
    for frame in range(64):
        rotor.rotation_euler.z=math.tau*frame/64
        render(scene,OUT+f'/motion/{frame:02d}.png')

with open(OUT+'/render.json','w',encoding='utf8') as handle:
    json.dump(metadata,handle,indent=2)
print('PHYSICS_HALL_COMPLETE',OUT)
