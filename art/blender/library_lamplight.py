# Lamplight in the Library: original 3D scenery and physically pulled books.
# The five titles and numbered bookmarks come from bookshelf/puzzle.js via
# library_lamplight_publish.mjs --prepare. No generated photographic assets.
#
# blender -b --factory-startup -P art/blender/library_lamplight.py -- --width 2560 --samples 384
import bpy, bmesh, math, os, sys, json, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import curtain, curtain_pole, shade_material, pleated_shade, rug_material, rug

OUT = os.path.join(ROOT, '.artifacts/library-lamplight')
os.makedirs(OUT, exist_ok=True)
WIDTH = int(arg('--width', '2560'))
SAMPLES = int(arg('--samples', '384'))
PREVIEW = arg('--preview', '')
ONLY = set(arg('--only', 'plate,books').split(','))
RNG = random.Random(5103)
with open(os.path.join(OUT, 'books.json'), encoding='utf-8') as f:
    BOOKS = json.load(f)
scene, HEIGHT = stage(WIDTH, eye=(0, 119, -30), look=(0, 119, 350), lens=28)

# Scanned wood and cloth, with subdued worn surfaces and no clearcoat.
WOOD = scan('mahogany stiles', 'dark_wood', size=.8, tint=(.60,.40,.29), bright=.64, sat=.65, rough=(.46,.68), bump=.27, coat=0, upright=True)
RAILS = scan('mahogany rails', 'dark_wood', size=.8, tint=(.60,.40,.29), bright=.60, sat=.65, rough=(.46,.68), bump=.27, coat=0)
BACK = scan('bookcase back', 'rosewood_veneer1', size=.7, tint=(.42,.32,.24), bright=.48, sat=.6, rough=(.55,.76), bump=.20)
FLOOR = scan('worn oak boards', 'wood_floor_worn', size=2, tint=(.66,.52,.37), bright=.5, sat=.6, rough=(.56,.78), bump=.32)
WALL = scan('faded olive plaster', 'plastered_wall_04', size=1.8, tint=(.28,.34,.27), bright=.58, sat=.25, rough=(.82,.96), bump=.24)
BRASS = aged_metal('tarnished brass', (.43,.29,.11), (.065,.047,.025), rough=(.36,.6), scale=45, tarnish=.6)
PAGES = paper('old page edges', (.54,.47,.35), foxing=.38)
SLIP = paper('ivory bookmark paper', (.76,.68,.51), foxing=.12)
INK = plain('bookmark ink', (.035,.022,.013), rough=.94)
GOLD = aged_metal('worn gilt tooling', (.61,.43,.17), (.18,.11,.04), rough=(.44,.66), tarnish=.28)
GLASS = plain('window glass', (.93,.96,1), rough=.055, transmission=1, ior=1.46)
VELVET = scan('curtain velvet', 'velour_velvet', size=.5, tint=(.22,.26,.19), bright=.45, sat=.4, rough=(.82,.96), bump=.22)
CERAMIC = plain('ivory porcelain', (.67,.60,.47), rough=.37)
TEA = plain('black tea', (.040,.016,.005), rough=.19)
COVERS = [scan(f'aged binding {i}', 'fabric_leather_02', size=.17, tint=c, bright=.72, sat=.1, rough=(.54,.8), bump=.4, vary=.15)
          for i,c in enumerate(((.37,.10,.09),(.12,.22,.29),(.16,.26,.16),(.38,.25,.12),(.24,.14,.26),(.27,.22,.16),(.09,.10,.09)))]

def line(name, pts, radius, mat):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions='3D'; cu.bevel_depth=radius; cu.bevel_resolution=3
    sp=cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts)-1)
    for p,co in zip(sp.bezier_points,pts): p.co=co; p.handle_left_type=p.handle_right_type='AUTO'
    o=link(bpy.data.objects.new(name,cu)); o.data.materials.append(mat)
    return o

FONT = bpy.data.fonts.load('C:/Windows/Fonts/georgia.ttf')
def lettering(name, text, at, size, mat, vertical=False):
    cu=bpy.data.curves.new(name,'FONT'); cu.body=text; cu.font=FONT; cu.align_x='CENTER'; cu.align_y='CENTER'
    cu.size=M(size); cu.extrude=.00014; cu.bevel_depth=.000025; cu.bevel_resolution=1
    o=link(bpy.data.objects.new(name,cu)); o.data.materials.append(mat); o.location=P(*at)
    o.rotation_euler=(math.pi/2, math.pi/2 if vertical else 0, 0)
    return o

# Room shell, real oak panelling, an opening in the wall and a wool rug.
for i in range(-9,10):
    box_cm('floor plank', i*27, i*27+26.85, -2,0, -60,395, FLOOR, .08)
wall=box_cm('olive wall',-245,245,0,285,379,392,WALL)
for x in range(-250,250,52):
    box_cm('dado panel',x+3,x+48,12,77,373,378,BACK,.4)
    for a in (x,x+49): box_cm('dado stile',a,a+3,6,88,370,378,WOOD,.3)
for y,h in ((4,7),(83,5),(90,2.5)):
    box_cm('dado rail',-250,250,y,y+h,369,379,RAILS,.45)
box_cm('side wall',224,238,0,285,-60,392,WALL)
box_cm('ceiling cornice',-245,245,277,285,367,395,RAILS,.7)
RUG = rug_material('faded Persian wool', os.path.join(ROOT,'.artifacts/rooms/library-rug.png'), tint=(.68,.64,.56), sat=.55,value=.45)
rug(-190,195,50,355,RUG)

# A narrow sash window and a moon above the garden; every visible part is 3D.
WX0,WX1,WS,WT=-190,-134,69,195
boolean_cut(wall,box_cm('window opening',WX0,WX1,WS,WT,365,400,WOOD,keep=False))
for x in (WX0-4,WX1): box_cm('window architrave',x,x+4,WS-5,WT+5,367,385,WOOD,.5)
for y in (WS-4,WT): box_cm('window rail',WX0-4,WX1+4,y,y+4,367,385,RAILS,.5)
box_cm('deep window sill',WX0-8,WX1+8,WS-6,WS-2,359,389,RAILS,.6)
for x in (WX0+1,(WX0+WX1)/2-1,WX1-3): box_cm('glazing bar',x,x+2,WS,WT,375,380,WOOD,.15)
for y in (111,153): box_cm('glazing bar',WX0,WX1,y,y+2,375,380,RAILS,.15)
box_cm('glass',WX0,WX1,WS,WT,381,381.2,GLASS)
SKY=plain('night sky',(.008,.015,.034),rough=1,emit=(.012,.024,.055),strength=.7)
box_cm('night beyond the window',-215,-110,30,240,430,431,SKY)
MOON=plain('moon',(.65,.72,.87),rough=1,emit=(.6,.7,1),strength=1.4)
sphere('moon',tuple(P(-153,170,427)),M(7),MOON)
TREE=plain('garden branches',(.008,.013,.011),rough=1)
for x in (-181,-164,-137):
    line('bare branch',[P(x,70,407),P(x+4,105,408),P(x-6,139,409),P(x-4,163,410)],.012,TREE)
    for h,side in ((91,-1),(115,1),(133,-1)):
        line('branch',[P(x,h,408),P(x+side*15,h+20,409),P(x+side*25,h+27,410)],.005,TREE)
for i in range(90):
    x=RNG.uniform(WX0+3,WX1-3); z=RNG.uniform(WS+3,WT-3)
    sphere('rain bead',tuple(P(x,z,380.7)),RNG.uniform(.0008,.002),GLASS,squash=(.7,.3,1.7))
curtain(RNG,-229,-197,364,235,VELVET,folds=4,deep=3)
curtain_pole(-235,-124,237,365,BRASS)

# The bookcase has four rows, two bays, moulded rails and a deep top ledge.
CF,CB=330,371
box_cm('cabinet back',-114,114,12,207,368,372,BACK,.4)
for x in (-116,110): box_cm('fluted side stile',x,x+6,10,208,CF-2,CB,WOOD,.7)
box_cm('centre stile',-2.3,2.3,16,205,CF-1,CB,WOOD,.45)
for y in (22,68,112,156,201):
    box_cm('shelf',-111,111,y,y+3,CF,CB,RAILS,.35)
    box_cm('rounded shelf nosing',-112,112,y-.3,y+2.8,CF-1.5,CF+1.3,RAILS,.5)
for y,w,deep,h in ((5,119,3,10),(15,117,1.5,7),(204,120,4,4),(208,122,6,3),(211,120,4,2)):
    box_cm('moulded cornice or plinth',-w,w,y,y+h,CF-deep,CB+1,RAILS,.5)
for x in (-112,112):
    for dx in (-1.4,0,1.4):
        line('fluted stile', [P(x+dx,29,CF-2.15),P(x+dx,193,CF-2.15)], .0019, BACK)

def make_book(name,x,front,z,w,h,depth,colour,title='',mark=None):
    before=set(bpy.data.objects)
    box_cm(name+' pages',-w/2+.3,w/2-.3,.35,h-.35,.8,depth-.35,PAGES,.12,keep=False)
    for side in (-1,1):
        a=side*w/2
        box_cm(name+' board',a-.16,a+.16,0,h,0,depth,colour,.12,keep=False)
    box_cm(name+' rounded spine',-w/2,w/2,0,h,-.6,.9,colour,.34,keep=False)
    for zz in (1.7,3.0,h-3,h-1.7):
        box_cm(name+' gilt rule',-w*.42,w*.42,zz,zz+.07,-.69,-.61,GOLD,.01,keep=False)
    if title: lettering(name+' title',title,(0,h*.52,-.74),3.25 if mark else 1.5,GOLD,vertical=True)
    if mark is not None:
        box_cm(name+' paper bookmark',-2.3,2.3,h-1.2,h+7.0,2.2,2.27,SLIP,.025,keep=False)
        lettering(name+' bookmark number',str(mark),(0,h+3.9,2.16),4.15,INK)
    root=link(bpy.data.objects.new(name,None)); root.location=P(x,z,front)
    for o in set(bpy.data.objects)-before-{root}:
        if not o.parent: o.parent=root
    root['title']=title; root['bookmark']=mark if mark is not None else 0
    return root

SPECIAL_X=(-87,-49,-14,39,83)
special=[]
for i,(x,clue) in enumerate(zip(SPECIAL_X,BOOKS)):
    root=make_book('cipher book '+str(i),x,CF-8,71,9.4,31.5,27,COVERS[i],clue['title'],clue['mark'])
    special.append(root)
TITLES=('BOTANY','ESSAYS','ATLAS','POEMS','HISTORY','NATURE','VERSES','TRAVELS')
for row,(bottom,top) in enumerate(((25,68),(71,112),(115,156),(159,201))):
    for a,b in ((-108,-4.5),(4.5,108)):
        x=a
        while x<b-3:
            w=RNG.uniform(3.2,6.3)
            if row==1 and any(x < sx+6.1 and x+w>sx-6.1 for sx in SPECIAL_X):
                x+=w; continue
            if x+w>b: break
            h=RNG.uniform(25,top-bottom-2)
            root=make_book('shelf volume',x+w/2,CF+RNG.uniform(1,5),bottom,w,h,RNG.uniform(23,30),RNG.choice(COVERS),RNG.choice(TITLES))
            x+=w+RNG.uniform(.1,.6)

# Round table, aged brass lamp with a pleated linen shade, tea and two books.
TX,TD,TH=158,310,75
lathe('side table',[(0,0),(.065,0),(.09,.025),(.04,.09),(.035,.51),(.06,.62),(.24,.70),(.29,.72),(.29,.75),(0,.75)],RAILS,at=tuple(P(TX,0,TD)))
for side in (-1,1):
    line('table foot',[P(TX,20,TD),P(TX+side*15,7,TD),P(TX+side*25,2,TD)],.023,WOOD)
LB=P(TX-6,TH,TD)
lathe('lamp turned brass',[(0,0),(.073,0),(.078,.012),(.055,.025),(.027,.045),(.036,.10),(.055,.15),(.035,.21),(.012,.24),(.012,.31),(0,.31)],BRASS,at=tuple(LB))
SHADE=shade_material('worn linen shade',(.67,.56,.38),glow=(1,.72,.37),strength=.10,through=.17)
pleated_shade(TX-6,TD,TH+31,TH+53,18,10,SHADE,pleats=32,depth=.025)
for z,r in ((TH+31,18),(TH+53,10)):
    line('shade piping',[P(TX-6+math.cos(a)*r,z,TD+math.sin(a)*r) for a in [math.tau*k/64 for k in range(65)]],.0018,BRASS)
lamp('table lamp practical','POINT',tuple(P(TX-6,TH+36,TD)),energy=22,colour=(1,.68,.36),size=.045)
cylinder('lamp neck',M(TX-6),M(TD),M(TH+29),M(TH+54.5),M(.55),BRASS,verts=20)
sphere('lamp finial',tuple(P(TX-6,TH+55,TD)),M(1),BRASS)
CX,CD=TX+14,TD-7
lathe('teacup',[(0,0),(.022,0),(.024,.006),(.024,.01),(.033,.027),(.042,.063),(.043,.07),(.040,.071),(.038,.064),(.028,.025),(0,.014)],CERAMIC,at=tuple(P(CX,TH,CD)))
lathe('saucer',[(0,0),(.035,0),(.060,.005),(.067,.012),(.067,.016),(.058,.012),(.030,.007),(0,.007)],CERAMIC,at=tuple(P(CX,TH-.2,CD)))
line('cup handle',[P(CX+3.7,TH+5.9,CD),P(CX+6.4,TH+5.1,CD),P(CX+6.2,TH+2.5,CD),P(CX+2.8,TH+2,CD)],.004,CERAMIC)
cylinder('tea',M(CX),M(CD),M(TH+5.75),M(TH+5.8),M(3.6),TEA,verts=64)
for i in range(2):
    o=make_book('table book',0,0,0,4,24,16,COVERS[5+i])
    o.rotation_euler=(0,math.pi/2,.08*(-1 if i else 1)); o.location=P(TX-24,TH+2+i*4.5,TD-13)

# A modeled sleeping tabby with striped fur, soft ears, eyelids and whiskers.
FUR=plain('tabby coat',(.21,.13,.072),rough=.97)
N=FUR.node_tree.nodes; LK=FUR.node_tree.links.new; bs=N['Principled BSDF']
tc=N.new('ShaderNodeTexCoord'); wave=N.new('ShaderNodeTexWave'); wave.wave_type='BANDS'; wave.bands_direction='X'
wave.inputs['Scale'].default_value=4.5; wave.inputs['Distortion'].default_value=2.8; wave.inputs['Detail Scale'].default_value=1.8
LK(tc.outputs['Generated'],wave.inputs['Vector'])
ramp=N.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position=.38; ramp.color_ramp.elements[0].color=(.045,.032,.022,1)
ramp.color_ramp.elements[1].position=.65; ramp.color_ramp.elements[1].color=(.14,.10,.064,1)
LK(wave.outputs['Color'],ramp.inputs[0]); LK(ramp.outputs[0],bs.inputs['Base Color'])
noise=N.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=190
LK(tc.outputs['Generated'],noise.inputs[0]); bump=N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.38; bump.inputs['Distance'].default_value=.001
LK(noise.outputs['Fac'],bump.inputs['Height']); LK(bump.outputs[0],bs.inputs['Normal']); bs.inputs['Sheen Weight'].default_value=.3
CREAM=plain('tabby muzzle',(.23,.19,.14),rough=.98)
DARK=plain('eyelids',(.018,.012,.009),rough=1)
PINK=plain('ear and nose',(.21,.105,.09),rough=.88)
HAIR=plain('individual fur',(.14,.10,.058),rough=1)

def fur_part(name,at,axes,count,mat=FUR):
    sphere(name,at,1,mat,squash=axes)
    cu=bpy.data.curves.new(name+' short fur','CURVE'); cu.dimensions='3D'; cu.bevel_depth=.000075; cu.bevel_resolution=0; cu.resolution_u=1
    for i in range(count):
        z=RNG.uniform(-1,1); a=RNG.random()*math.tau; rr=math.sqrt(1-z*z)
        v=Vector((rr*math.cos(a),rr*math.sin(a),z)); p=Vector(at)+Vector([v[k]*axes[k] for k in range(3)])
        normal=Vector([v[k]/axes[k] for k in range(3)]).normalized()
        tangent=Vector((.7,.4,-.15)); tangent-=normal*tangent.dot(normal)
        hair=cu.splines.new('POLY'); hair.points.add(2); length=RNG.uniform(.0018,.004)
        for j,pt in enumerate(hair.points):
            co=p+normal*length*j/2+tangent*length*(j/2)**2; pt.co=(*co,1); pt.radius=1-j*.45
    o=link(bpy.data.objects.new(name+' short fur',cu)); o.data.materials.append(HAIR)

fur_part('curled sleeping torso',tuple(P(59,220,351)),(.28,.145,.086),4200)
fur_part('folded hindquarters',tuple(P(77,218,350)),(.16,.15,.08),1500)
fur_part('sleeping head',tuple(P(33,222,338)),(.105,.09,.075),1800)
for x in (28,38): fur_part('tucked paw',tuple(P(x,215,331)),(.034,.048,.018),400)
for x in (27.5,38.5):
    verts=[tuple(P(x-3.5,225,337)),tuple(P(x+3,225,337)),tuple(P(x+1,233,340)),tuple(P(x,226,343))]
    me=bpy.data.meshes.new('soft ear'); me.from_pydata(verts,[],[(0,1,2),(0,2,3),(1,3,2),(0,3,1)]); me.update()
    o=link(bpy.data.objects.new('soft ear',me)); o.data.materials.append(FUR); bevel(o,.006,3)
    card('inner ear',[P(x-1.6,226,336.8),P(x+1.2,226,336.8),P(x+1,231,338),P(x+.2,230,337.7)],PINK)
for x in (29.5,36):
    line('closed eyelid',[P(x-2.0,222.8,328.4),P(x,221.7,327.8),P(x+2,222.4,328.5)],.00115,DARK)
for x in (31,35): sphere('muzzle',tuple(P(x,219.4,328)),M(1.8),CREAM,squash=(1,.5,.65))
sphere('nose',tuple(P(33,220.1,326.4)),M(.9),PINK,squash=(1,.5,.7))
for side in (-1,1):
    for i in range(3):
        line('whisker',[P(33+side*2,219,327),P(33+side*6,219.5+i*.4,326),P(33+side*10,220+i,326.5)],.00014,CREAM)
line('curled striped tail',[P(82,219,349),P(93,216,340),P(88,214,332),P(69,214,329),P(52,214,331)],.027,FUR)

# Lighting stays the same before and after puzzle completion.
world=bpy.data.worlds.new('library night'); scene.world=world; world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.008,.012,.02,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.25
moon_fill=lamp('moon through glass','AREA',tuple(P(-163,178,398)),aim=tuple(P(-15,60,280)),energy=38,colour=(.48,.62,1),size=.55,size_y=1.1)
moon_fill.visible_camera=False; moon_fill.visible_transmission=False; moon_fill.visible_glossy=False
lamp('bounced lamplight','AREA',tuple(P(142,159,250)),aim=tuple(P(-20,125,350)),energy=22,colour=(1,.75,.46),size=1.2)
lamp('soft room fill','AREA',tuple(P(-10,240,130)),aim=tuple(P(0,110,350)),energy=32,colour=(.70,.77,1),size=3.0)
cycles(scene,SAMPLES,WIDTH,HEIGHT,exposure=1.1)
finish(scene,SAMPLES,keep_gloss=('window glass','black tea','ivory porcelain'))
scene.render.use_persistent_data=True
if PREVIEW: scene.cycles.adaptive_min_samples=16; scene.cycles.adaptive_threshold=.025

# Native coordinates for every clue, and room patches for real pull poses.
POSES=9; PULL=17
layout={'version':1,'width':1880,'height':1000,'safe':[395,90,1085,830], 'poses':POSES,'books':[],
        'lamp':list(project(P(TX-6,TH+36,TD))), 'cup':list(project(P(CX,TH+7,CD)))}
for i,root in enumerate(special):
    x=SPECIAL_X[i]; z=71; front=CF-8; w=9.4; h=31.5
    quad=[list(project(P(x+xx,z+zz,front-.8))) for xx,zz in ((-w/2,0),(w/2,0),(w/2,h+7.2),(-w/2,h+7.2))]
    points=[P(x+xx,z+zz,front+dd-pull) for xx in (-w/2,w/2) for zz in (0,h+7.2) for dd in (-1,28) for pull in (0,PULL)]
    crop=box_of(points,pad=16)
    layout['books'].append({'index':i,**BOOKS[i],'quad':quad,'crop':crop})
with open(os.path.join(OUT,'library.json'),'w',encoding='utf-8') as f: json.dump(layout,f,indent=2)
if not PREVIEW:
    bpy.ops.file.pack_all(); bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'library-lamplight.blend'))
if 'plate' in ONLY: render(scene,os.path.join(OUT,'preview.png' if PREVIEW else 'plate.png'))
if 'books' in ONLY and not PREVIEW:
    for book,root in zip(layout['books'],special):
        home=root.location.y
        frames={}
        for pose in range(POSES):
            def set_pose(pose=pose, root=root, home=home): root.location.y=home-M(PULL)*pose/(POSES-1)
            frames[f"book-{book['index']}-{pose}"]=set_pose
        crop_frames(scene,OUT,book['crop'],frames.items())
        root.location.y=home
print('LIBRARY_LAMPLIGHT_DONE')
