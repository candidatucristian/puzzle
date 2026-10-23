"""The Top Passage: a real timber attic with native, hinged XII/XIII doors.

The overscan camera follows Physics. Door quads, keyholes and lamp flames
are exported from the model; each opening pose is a cropped Cycles render.
"""
import os
import sys
import math
import json
import random
import bpy
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import (arg, fresh, link, plain, aged_metal, box, bevel, cylinder,
                 sphere, lamp, cycles, render, to_picture, import_model, wear)
from hall_common import scan, clear_glass
from botany_staircase import mesh, block, bar

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
OUT=os.path.abspath(arg('--output',ROOT+'/.artifacts/top-passage-review/render'))
WIDTH=int(arg('--width','3840'));SAMPLES=int(arg('--samples','384'))
ONLY=arg('--only','plate,motion').split(',')
RW,RH,F=2800,1600,1020
HALF,END,EAVES,RIDGE=1.6,14,2.35,3.85
Y0,DOOR_W,DOOR_H=3.2,.96,2.22
FRAMES,LATCH=41,7
rnd=random.Random(163)
os.makedirs(OUT,exist_ok=True)
scene=fresh()

def segment(name,a,b,r,mat):
    a,b=Vector(a),Vector(b)
    obj=cylinder(name,0,0,0,(b-a).length,r,mat,48)
    obj.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();obj.location=a
    return obj

def timber(name,a,b,width,depth,mat):
    a,b=Vector(a),Vector(b)
    obj=block(name,-width/2,width/2,-depth/2,depth/2,0,(b-a).length,mat,keep=False,edge=.009)
    obj.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();obj.location=a
    return obj

def parent_at(obj,parent,at):
    obj.parent=parent;obj.matrix_parent_inverse=Matrix.Translation(at).inverted()

def text(body,at,size,mat,side=0):
    data=bpy.data.curves.new(body,'FONT');data.body=body;data.size=size
    data.align_x='CENTER';data.extrude=.0007
    obj=link(bpy.data.objects.new(body,data));obj.data.materials.append(mat)
    obj.location=at;obj.rotation_euler=(math.pi/2,0,-side*math.pi/2)
    return obj

wood=scan('aged attic oak','dark_wooden_planks',1.0,bright=.55,sat=.62,rough=(.5,.78),bump=.48,upright=True,vary=.13)
beam=scan('hand-hewn oak beams','dark_wood',.85,bright=.46,sat=.7,rough=(.46,.74),bump=.5,upright=True,vary=.12)
doorwood=scan('waxed old door oak','rosewood_veneer1',.7,bright=.52,sat=.65,rough=(.4,.65),bump=.38,upright=True,vary=.1)
floor=scan('worn attic boards','wood_floor_worn',.9,bright=.48,sat=.65,rough=(.43,.76),bump=.45,vary=.13)
stone=scan('smoked limestone footing','old_sandstone_02',.7,tint=(.5,.49,.46),bright=.55,sat=.15,rough=(.65,.87),bump=.55)
plaster=scan('old mineral plaster','plastered_wall_04',1.5,tint=(.23,.25,.24),bright=.6,sat=.15,rough=(.7,.92),bump=.45)
iron=aged_metal('forged iron with brown patina',(.065,.061,.052),(.018,.022,.02),rough=(.38,.65),tarnish=.54,hammer=.13)
brass=aged_metal('worn bronze hardware',(.35,.23,.105),(.065,.07,.04),rough=(.3,.55),tarnish=.45)
dark=plain('dark joints',(.008,.007,.006),.93)
glass=plain('clear closed window glass',(.94,.96,.98),.018,transmission=1,ior=1.46)
wax=plain('old beeswax',(.5,.36,.19),.55)
flame=plain('small candle flame',(1,.5,.16),emit=(1,.36,.08),strength=12)
linen=scan('dusty unbleached linen','crepe_satin',.8,tint=(.49,.44,.35),bright=.63,sat=.1,rough=(.87,.98),bump=.18)
for material in [wood,beam,doorwood]:
    nodes=material.node_tree.nodes;links=material.node_tree.links.new
    bsdf=nodes['Principled BSDF'];coordinates=nodes.new('ShaderNodeTexCoord')
    aged=wear(nodes,links,bsdf.inputs['Base Color'].links[0].from_socket,coordinates,
              stains=.18,grime=.12,dust=.025,edges=.035)
    links(aged,bsdf.inputs['Base Color'])

# Thick wall boards and stone plinth, with actual openings through both.
for side in [-1,1]:
    for y in [i*.18 for i in range(80)]:
        y1=min(END+.15,y+.176)
        if y1<=y:continue
        in_door=y<Y0+DOOR_W+.02 and y1>Y0-.02
        x0,x1=sorted([side*HALF,side*(HALF+.1)])
        block('vertical oak wall plank',x0,x1,y,y1,DOOR_H+.045 if in_door else .35,EAVES+.08,wood,keep=False,edge=.003)
        if not in_door:
            block('stone footing block',x0-.015,x1+.015,y,y1,-.05,.36,stone,keep=False,edge=.006)
    for start,stop in [(.3,Y0-.02),(Y0+DOOR_W+.02,END+.1)]:
        x=side*(HALF-.025)
        block('oak skirting rail',x-.03,x+.03,start,stop,.32,.4,beam,keep=False)
        block('dado string',x-.015,x+.015,start,stop,.92,.945,beam,keep=False,edge=.003)
    block('eaves plate',side*HALF-.1,side*HALF+.1,.2,END+.15,EAVES-.035,EAVES+.15,beam,keep=False,edge=.01)

block('subfloor',-HALF-.1,HALF+.1,.15,END+.25,-.16,-.035,dark,keep=False)
for column in range(18):
    x=-HALF+column*(2*HALF/18)
    for row in range(8):
        y=.2+row*1.9+(column%3)*.53
        start=max(.2,y-1.9 if row==0 else y);stop=min(END+.12,y+1.895)
        if stop<=start:continue
        block('individual tongue-and-groove floorboard',x+.002,x+2*HALF/18-.002,start,stop,-.035,rnd.uniform(-.001,.0015),floor,keep=False,edge=.0018)
        for yy in [start+.035,stop-.035]:
            for xx in [x+.025,x+2*HALF/18-.025]:
                cylinder('recessed square-cut floor nail',xx,yy,-.0005,.0008,.0022,iron,8)

# Each roof board is a solid wedge following the pitch, supported on trusses.
for side in [-1,1]:
    for i in range(13):
        a=i/13;b=(i+1)/13-.002
        xa=side*HALF*(1-a);xb=side*HALF*(1-b)
        za=EAVES+(RIDGE-EAVES)*a;zb=EAVES+(RIDGE-EAVES)*b
        for y in [.2,3.7,7.2,10.7]:
            vv=[(xa,y,za),(xb,y,zb),(xb,y+3.496,zb),(xa,y+3.496,za)]
            vv += [(x,yy,z+.045) for x,yy,z in vv]
            mesh('solid pitched roof boarding',vv,[(0,3,2,1),(4,5,6,7),(0,1,5,4),
                 (1,2,6,5),(2,3,7,6),(3,0,4,7)],wood,keep=False,edge=.0025)
for y in [1.4,4.8,7.25,9.7,12.15]:
    timber('pegged truss tie',(-HALF,y,EAVES+.02),(HALF,y,EAVES+.02),.17,.18,beam)
    timber('king post',(0,y,EAVES+.02),(0,y,RIDGE-.035),.12,.14,beam)
    for side in [-1,1]:
        timber('principal roof rafter',(side*HALF,y,EAVES+.02),(0,y,RIDGE+.025),.17,.18,beam)
        timber('wall post',(side*(HALF-.045),y,.36),(side*(HALF-.045),y,EAVES+.03),.14,.16,beam)
        timber('curved truss knee brace',(side*(HALF-.05),y,EAVES-.58),
               (side*(HALF-.56),y,EAVES+.02),.09,.12,beam)
        for z in [EAVES-.5,EAVES-.05,EAVES+.04]:
            segment('oak drawbore peg',(side*(HALF-.05),y-.1,z),
                    (side*(HALF-.05),y+.1,z),.012,doorwood)
        block('forged tie strap',side*.4-.035,side*.4+.035,y-.105,y-.095,EAVES-.08,EAVES+.12,iron,keep=False,edge=.002)

# Back gable and a six-pane window with deep reveals and 4 mm glass.
for x0,x1,z0,z1 in [(-HALF,-.54,0,EAVES),(.54,HALF,0,EAVES),(-.54,.54,0,1.0),(-.54,.54,2.3,EAVES)]:
    block('back gable boarding',x0,x1,END,END+.12,z0,z1,wood,keep=False)
mesh('gable triangle',[(-HALF,END,EAVES),(HALF,END,EAVES),(0,END,RIDGE)],[(0,1,2)],wood,keep=False)
for x in [-.56,.56]:block('window side casing',x-.045,x+.045,END-.065,END+.14,.96,2.36,beam,keep=False)
for z in [.98,2.32]:block('window sill and head',-.61,.61,END-.08,END+.16,z-.035,z+.035,beam,keep=False)
for x in [-.52,0,.52]:block('window mullion',x-.013,x+.013,END+.005,END+.045,1.02,2.285,beam,keep=False,edge=.002)
for z in [1.02,1.44,1.86,2.285]:block('window transom',-.53,.53,END+.005,END+.045,z-.012,z+.012,beam,keep=False,edge=.002)
block('4 mm closed window glazing',-.525,.525,END+.055,END+.059,1.02,2.285,glass,keep=False,edge=.0003)

sky=plain('overcast night sky',(.008,.016,.032),1,emit=(.014,.023,.042),strength=.55)
N=sky.node_tree.nodes;L=sky.node_tree.links
cloud=N.new('ShaderNodeTexNoise');cloud.inputs['Scale'].default_value=.5;cloud.inputs['Detail'].default_value=5
r=N.new('ShaderNodeValToRGB');r.color_ramp.elements[0].color=(.008,.015,.03,1);r.color_ramp.elements[1].color=(.03,.043,.065,1)
L.new(cloud.outputs['Fac'],r.inputs['Fac']);L.new(r.outputs['Color'],N['Principled BSDF'].inputs['Emission Color'])
block('night beyond the gable',-14,14,22,22.1,-1,14,sky,keep=False,edge=0)
for i in range(7):
    x=rnd.uniform(-1.7,1.7);base=Vector((x,19.5,-.3));tip=base+Vector((rnd.uniform(-.2,.2),0,rnd.uniform(2.3,3.4)))
    segment('bare tree beyond the glass',base,tip,.022,iron)
    for j in range(6):
        p=base.lerp(tip,.35+j*.095)
        bar('winter tree branch',[p,p+Vector(((-1 if j%2 else 1)*rnd.uniform(.15,.55),0,.38))],.008,iron,keep=False)

doors=[]
for side,number in [(-1,12),(1,13)]:
    # Doorway joinery stays fixed; no generic painted face is applied later.
    for y in [Y0-.055,Y0+DOOR_W+.055]:
        block('deep oak door jamb',side*HALF-.075,side*HALF+.13,y-.055,y+.055,0,DOOR_H+.12,beam,keep=False,edge=.01)
    block('oak door lintel',side*HALF-.09,side*HALF+.14,Y0-.13,Y0+DOOR_W+.13,DOOR_H,DOOR_H+.15,beam,keep=False,edge=.01)
    block('stone door threshold',side*HALF-.13,side*HALF+.25,Y0-.04,Y0+DOOR_W+.04,-.035,.014,stone,keep=False,edge=.01)
    before=set(bpy.data.objects);hinge_at=Vector((side*HALF,Y0,0))
    hinge=link(bpy.data.objects.new('hinged door '+str(number),None));hinge.location=hinge_at
    for j in range(7):
        y=Y0+.013+j*(DOOR_W-.026)/7
        block('solid oak door plank',side*HALF-.028,side*HALF+.028,y,y+(DOOR_W-.026)/7-.003,.025,DOOR_H-.02,doorwood,keep=False,edge=.003)
    for z in [.23,1.13,1.94]:
        block('hand forged door strap',side*(HALF-.042)-.006,side*(HALF-.042)+.006,Y0+.02,Y0+DOOR_W*.63,z,z+.045,iron,keep=False,edge=.003)
        for y in [Y0+.07,Y0+.28,Y0+.53]:
            sphere('hammered hinge rivet',(side*(HALF-.052),y,z+.023),.009,brass)
        segment('working hinge barrel',(side*HALF,Y0+.012,z-.014),(side*HALF,Y0+.012,z+.08),.016,iron)
    face=side*(HALF-.049);handle_at=Vector((face,Y0+DOOR_W*.85,1.045))
    block('iron lock escutcheon',face-.006,face+.006,handle_at.y-.045,handle_at.y+.045,.88,1.14,iron,keep=False,edge=.005)
    keyhole=Vector((face-side*.008,handle_at.y,.943))
    sphere('dark keyhole',keyhole,.012,dark,squash=(.18,1,.8))
    handle=link(bpy.data.objects.new('latch rotor '+str(number),None));handle.location=handle_at
    lever=bar('curved iron latch lever',[handle_at+Vector((-side*.035,0,0)),handle_at+Vector((-side*.04,-.13,-.003)),
        handle_at+Vector((-side*.04,-.145,.012))],.011,brass,keep=False)
    parent_at(lever,handle,handle_at)
    sphere('latch spindle',handle_at+Vector((-side*.016,0,0)),.019,iron,squash=(.6,1,1))
    # A small cast number plate follows the leaf, including its thickness.
    block('door number plate',face-.004,face+.004,Y0+.28,Y0+.68,1.91,2.08,iron,keep=False,edge=.004)
    text('XII' if number==12 else 'XIII',(face-side*.007,Y0+DOOR_W*.5,1.955),.092,brass,side)
    for obj in [o for o in bpy.data.objects if o not in before and o!=hinge]:
        if obj.parent is None:parent_at(obj,hinge,hinge_at)
    doors.append({'number':number,'side':side,'hinge':hinge,'handle':handle,'keyhole':keyhole})
    # A small real anteroom is revealed by the opening leaf.
    xa,xb=sorted([side*(HALF+.13),side*4.5])
    block('anteroom floor',xa,xb,Y0-.16,Y0+DOOR_W+.3,-.06,-.005,floor,keep=False)
    for y in [Y0-.18,Y0+DOOR_W+.22]:
        block('anteroom plaster wall',xa,xb,y,y+.08,0,2.55,plaster,keep=False)
        block('anteroom oak dado',xa,xb,y-.015,y+.015,0,.85,beam,keep=False)
    block('anteroom far wall',side*4.45-.05,side*4.45+.05,Y0-.18,Y0+DOOR_W+.3,0,2.55,plaster,keep=False)
    block('anteroom ceiling',xa,xb,Y0-.18,Y0+DOOR_W+.3,2.5,2.58,beam,keep=False)
    lamp('anteroom candle','POINT',(side*3.2,Y0+.7,1.65),energy=4,colour=(1,.55,.22),size=.12)

lamps=[]
for side in [-1,1]:
    p=Vector((side*(HALF-.16),Y0-.28,2.04))
    xwall=side*(HALF-.025)
    block('lantern backplate',xwall-.015,xwall+.015,p.y-.065,p.y+.065,1.86,2.19,iron,keep=False)
    bar('forged lantern bracket',[(xwall,p.y,2.13),(p.x,p.y,2.20),(p.x,p.y,2.17)],.012,iron,keep=False)
    for z in [1.87,2.14]:block('lantern frame rail',p.x-.075,p.x+.075,p.y-.07,p.y+.07,z,z+.016,iron,keep=False,edge=.004)
    for dx in [-.067,.067]:
        for dy in [-.062,.062]:segment('lantern corner bar',(p.x+dx,p.y+dy,1.88),(p.x+dx,p.y+dy,2.15),.006,iron)
    for axis in [0,1]:
        for sign in [-1,1]:
            if axis==0:block('lantern closed glass',p.x+sign*.065-.001,p.x+sign*.065+.001,p.y-.057,p.y+.057,1.9,2.13,glass,keep=False,edge=0)
            else:block('lantern closed glass',p.x-.059,p.x+.059,p.y+sign*.061-.001,p.y+sign*.061+.001,1.9,2.13,glass,keep=False,edge=0)
    cylinder('lantern candle',p.x,p.y,1.9,2.02,.018,wax)
    sphere('lantern flame',p,.011,flame,squash=(.65,.65,1.7))
    lamp('warm lantern, chemistry reference','POINT',p,energy=9,colour=(1,.55,.22),size=.035)
    lamps.append({'side':side,'at':p})

# Stored belongings sit clear of the door leaves and the central walking line.
def trunk(x,y,w=.65,h=.45):
    for j in range(5):
        block('trunk side board',x-w/2,x+w/2,y-.23,y+.23,j*h/5,j*h/5+h/5-.003,wood,keep=False,edge=.003)
    block('trunk lid',x-w/2-.014,x+w/2+.014,y-.245,y+.245,h,h+.04,beam,keep=False,edge=.015)
    for xx in [x-w*.33,x+w*.33]:
        block('trunk iron lid band',xx-.015,xx+.015,y-.25,y+.25,h+.035,h+.045,iron,keep=False,edge=.002)
        for yy in [y-.235,y+.235]:block('trunk iron strap',xx-.015,xx+.015,yy-.008,yy+.008,.035,h+.03,iron,keep=False,edge=.002)
    block('trunk latch',x-.035,x+.035,y-.25,y-.235,h-.1,h+.015,brass,keep=False,edge=.003)
trunk(-1.15,6.05,.65,.55);trunk(1.1,7.0,.7,.48);trunk(-1.06,11.9,.72,.4)
try:
    import_model('wooden_crate_01',width=.56,at=(-1.13,8.0,.0),rot=.13)
    import_model('wooden_stool_01',height=.52,at=(1.15,10.4,0),rot=.35)
    import_model('dining_chair_02',height=.94,at=(-1.13,10.0,0),rot=-.35)
except Exception as error:print('Optional stored model unavailable:',error)
for x,y in [(-1.13,6.2),(1.15,8.6)]:
    # Empty frames, leaning naturally rather than painted onto the backdrop.
    a=Vector((x,y,.5));b=Vector((x*.98,y+.1,1.25))
    for off in [-.23,.23]:timber('stored picture frame upright',a+Vector((off,0,0)),b+Vector((off,0,0)),.035,.04,beam)
    timber('stored picture frame sill',a+Vector((-.26,0,0)),a+Vector((.26,0,0)),.035,.04,beam)
    timber('stored picture frame head',b+Vector((-.26,0,0)),b+Vector((.26,0,0)),.035,.04,beam)
# A settled linen dust sheet, irregular hem and folds over the right trunk.
vv=[];ff=[]
for j in range(27):
    y=6.68+j*.025
    for i in range(35):
        x=.65+i*.027
        over=max(0,abs(x-1.1)-.35)
        z=.535-min(.48,over*3.5)+.012*math.sin(i*.65+j*.12)
        vv.append((x,y,z))
for j in range(26):
    for i in range(34):k=j*35+i;ff.append((k,k+1,k+36,k+35))
sheet=mesh('folded linen dust cover',vv,ff,linen,keep=False)
solid=sheet.modifiers.new('woven cloth thickness','SOLIDIFY');solid.thickness=.001

world=bpy.data.worlds.new('night');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.006,.009,.018,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.2;scene.world=world
fill=lamp('cool chemistry fill','AREA',(0,2.7,3.55),aim=(0,6.2,1),energy=60,colour=(.8,.85,1),size=1.0)
fill.visible_camera=False;fill.visible_transmission=False
camera_fill=lamp('low invisible camera fill','AREA',(0,.3,2.0),aim=(0,7,1.3),energy=12,colour=(.8,.85,1),size=2.6)
window_fill=lamp('soft moon through gable','AREA',(0,END+.35,2.15),aim=(-.3,5.5,.2),energy=85,colour=(.55,.68,1),size=.9,size_y=1.15)
for source in [camera_fill,window_fill]:
    source.visible_camera=False;source.visible_glossy=False;source.visible_transmission=False
lamp('moon through the small window','SUN',(2,20,7),aim=(-.5,0,-1),energy=.7,colour=(.55,.68,1),angle=math.radians(4))
clear_glass()
air=box('subtle attic air',-1.52,1.52,.3,END-.12,.02,EAVES-.12,dark)
volume=bpy.data.materials.new('attic air');volume.use_nodes=True;N=volume.node_tree.nodes
N.remove(N['Principled BSDF']);v=N.new('ShaderNodeVolumePrincipled');v.inputs['Density'].default_value=.006;v.inputs['Anisotropy'].default_value=.35
volume.node_tree.links.new(v.outputs['Volume'],N['Material Output'].inputs['Volume']);air.data.materials.clear();air.data.materials.append(volume);air.visible_shadow=False

cd=bpy.data.cameras.new('responsive passage camera');cd.lens=F/RW*36;cd.sensor_width=36;cd.sensor_fit='HORIZONTAL'
cd.shift_y=-(RH/2-760)/RW;cd.clip_start=.04;cd.clip_end=60
camera=link(bpy.data.objects.new('responsive passage camera',cd));camera.location=(0,0,1.55);camera.rotation_euler=(math.pi/2,0,0);scene.camera=camera
cycles(scene,SAMPLES,WIDTH,round(WIDTH*RH/RW),exposure=1.5)
scene.render.use_persistent_data=True
bpy.context.view_layer.update()
project=lambda point:to_picture(scene,camera,point,(RW,RH))
metadata={'reference':{'width':RW,'height':RH,'focal':F,'cx':1400,'cy':760},'doors':[],'lamps':[]}
for d in doors:
    side=d['side']
    quad=[project((side*HALF,y,z)) for y,z in [(Y0,DOOR_H),(Y0+DOOR_W,DOOR_H),(Y0+DOOR_W,0),(Y0,0)]]
    x0=min(p[0] for p in quad)-20;x1=max(p[0] for p in quad)+20
    y0=min(p[1] for p in quad)-18;y1=min(RH,max(p[1] for p in quad)+30)
    metadata['doors'].append({'number':d['number'],'side':side,'quad':quad,'keyhole':project(d['keyhole']),
        'sill':project((side*(HALF-.06),Y0+DOOR_W/2,0)),
        'box':{'x':x0,'y':y0,'width':x1-x0,'height':y1-y0},'frames':FRAMES,'latchFrames':LATCH,'columns':8})
for p in lamps:metadata['lamps'].append({'side':p['side'],'flame':project(p['at'])})
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/source.blend')
if 'plate' in ONLY:render(scene,OUT+'/plate.png')
if 'motion' in ONLY:
    r=scene.render;r.use_border=True;r.use_crop_to_border=True
    scene.cycles.samples=min(SAMPLES,192)
    for d,m in zip(doors,metadata['doors']):
        scale=WIDTH/RW;bx=m['box']
        x0=math.floor(bx['x']*scale);x1=math.ceil((bx['x']+bx['width'])*scale)
        y0=math.floor(bx['y']/RH*r.resolution_y);y1=math.ceil((bx['y']+bx['height'])/RH*r.resolution_y)
        r.border_min_x=x0/WIDTH;r.border_max_x=x1/WIDTH
        r.border_min_y=1-y1/r.resolution_y;r.border_max_y=1-y0/r.resolution_y
        m['box']={'x':x0/WIDTH*RW,'y':y0/r.resolution_y*RH,'width':(x1-x0)/WIDTH*RW,'height':(y1-y0)/r.resolution_y*RH}
        folder=OUT+'/'+str(d['number']);os.makedirs(folder,exist_ok=True)
        for frame in range(FRAMES+LATCH):
            d['hinge'].rotation_euler.z=-d['side']*math.radians(78)*min(frame,FRAMES-1)/(FRAMES-1) if frame<FRAMES else 0
            d['handle'].rotation_euler.x=(frame-FRAMES+1)/LATCH*.42 if frame>=FRAMES else .42*max(0,1-frame/12)
            if frame==0:d['handle'].rotation_euler.x=0
            render(scene,folder+f'/{frame:02d}.png')
        d['hinge'].rotation_euler.z=0;d['handle'].rotation_euler.x=0
with open(OUT+'/render.json','w',encoding='utf8') as f:json.dump(metadata,f,indent=2)
print('TOP_PASSAGE_COMPLETE',OUT)
