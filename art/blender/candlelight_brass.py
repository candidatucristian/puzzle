"""Candlelight and Brass: original Blender/Cycles apparatus and photographs.

Eight real candle-light combinations, a luminous brass rotor, rag-paper
letter and sixteen native flame frames. No generated bitmap assets.
blender -b -P art/blender/candlelight_brass.py -- --width 2560 --samples 256 --pack
node art/blender/candlelight_brass_publish.mjs
"""
import bpy, bmesh, math, random, json, re, sys
from pathlib import Path
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from kit import arg,fresh,link,box,bevel,lathe,cylinder,sphere,plain,aged_metal,lamp,cycles
from hall_common import scan

ROOT=HERE.parents[1]
OUT=Path(arg('--out',str(ROOT/'.artifacts/candlelight-brass'))).resolve();OUT.mkdir(parents=True,exist_ok=True)
WIDTH=int(arg('--width','2560'));HEIGHT=round(WIDTH*1000/1880)
SAMPLES=int(arg('--samples','256'));PREVIEW='--preview' in sys.argv
RNG=random.Random(196103)
source=(ROOT/'src/levels/cryptex/puzzle.js').read_text(encoding='utf-8')
ALPHA=re.search(r'CRYPTEX_ALPHA\s*=\s*"([A-Z]+)"',source).group(1)
CIPHER=json.loads(re.search(r'CRYPTEX_CIPHER\s*=\s*Object.freeze\((\[[^\]]+\])\)',source).group(1))
scene=fresh()
SERIF=bpy.data.fonts.load('C:/Windows/Fonts/georgiab.ttf')
HAND=bpy.data.fonts.load('C:/Windows/Fonts/georgiai.ttf')
TYPE=bpy.data.fonts.load('C:/Windows/Fonts/cour.ttf')

def slab(name,x0,x1,y0,y1,z0,z1,mat,r=.0015):
    ob=box(name,x0,x1,y0,y1,z0,z1,mat)
    if r:bevel(ob,r,3)
    return ob

def mesh(name,verts,faces,mat,smooth=False):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
    ob=link(bpy.data.objects.new(name,data));data.materials.append(mat)
    for p in data.polygons:p.use_smooth=smooth
    return ob

def wire(name,coords,r,mat,taper=1):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=r;data.bevel_resolution=3;data.use_fill_caps=True
    sp=data.splines.new('POLY');sp.points.add(len(coords)-1)
    for i,(p,co) in enumerate(zip(sp.points,coords)):p.co=(*co,1);p.radius=1+(taper-1)*i/max(1,len(coords)-1)
    ob=link(bpy.data.objects.new(name,data));data.materials.append(mat);return ob

def organic(name,lo,hi,scale,relief,rough=.8):
    mat=plain(name,lo,rough);n=mat.node_tree.nodes;l=mat.node_tree.links.new;b=n['Principled BSDF']
    tc=n.new('ShaderNodeTexCoord');nz=n.new('ShaderNodeTexNoise');nz.inputs['Scale'].default_value=scale;nz.inputs['Detail'].default_value=5
    l(tc.outputs['Object'],nz.inputs['Vector']);r=n.new('ShaderNodeValToRGB');r.color_ramp.elements[0].color=(*lo,1);r.color_ramp.elements[1].color=(*hi,1)
    l(nz.outputs['Fac'],r.inputs[0]);l(r.outputs[0],b.inputs['Base Color'])
    fine=n.new('ShaderNodeTexNoise');fine.inputs['Scale'].default_value=scale*9;l(tc.outputs['Object'],fine.inputs['Vector'])
    bp=n.new('ShaderNodeBump');bp.inputs['Strength'].default_value=.22;bp.inputs['Distance'].default_value=relief;l(fine.outputs['Fac'],bp.inputs['Height']);l(bp.outputs[0],b.inputs['Normal'])
    return mat

def writing(name,body,at,size,mat,font=SERIF,angle=0):
    data=bpy.data.curves.new(name,'FONT');data.body=body;data.font=font;data.size=size;data.align_x='CENTER';data.align_y='CENTER';data.extrude=.000025;data.resolution_u=12
    ob=link(bpy.data.objects.new(name,data));data.materials.append(mat);ob.location=at
    ob.rotation_euler=(Matrix.Rotation(angle,4,'Y')@Matrix.Rotation(math.pi/2,4,'X')).to_euler();ob.visible_shadow=False
    return ob

scene.name='Candlelight and Brass | native Ashcombe cipher apparatus'
scene['no_ai_generated_images']=True;scene['provenance']='Original Blender meshes, fonts and shaders; existing Poly Haven CC0 photographed wood and plaster scans.'
WALNUT=scan('Plaque | rubbed walnut veneer','rosewood_veneer1',.58,tint=(.70,.51,.33),bright=.62,sat=.60,rough=(.27,.53),bump=.28,coat=.16)
WOOD=scan('Ledge | old English oak','dark_wood',.85,tint=(.73,.55,.36),bright=.62,sat=.50,rough=(.35,.62),bump=.28,coat=.10)
PLASTER=scan('Wall | dark sage lime plaster','plastered_wall_04',1.6,tint=(.25,.32,.23),bright=.52,sat=.22,rough=(.84,.96),bump=.25)
BRASS=aged_metal('Wheel | hand-worn brass, fine scratches',(.50,.35,.14),(.075,.058,.027),rough=(.30,.55),scale=52,tarnish=.45)
RIM=aged_metal('Wheel | rubbed raised edges',(.59,.42,.19),(.11,.08,.035),rough=(.24,.44),scale=78,tarnish=.25)
BRONZE=aged_metal('Wheel | oxidised tool-cut recesses',(.14,.10,.045),(.045,.035,.02),rough=(.45,.70),scale=80,tarnish=.72)
INK=plain('Paper | iron-gall ink',(.025,.017,.009),rough=.94,spec=.12)
PAPER=organic('Paper | fibrous old cotton rag',(.43,.34,.21),(.74,.66,.49),110,.00012,.93)
RED=organic('Seal | old burgundy sealing wax',(.085,.009,.008),(.24,.034,.020),70,.00020,.42)
WAX=organic('Candles | ivory beeswax',(.56,.46,.29),(.81,.73,.54),120,.00010,.49)
wb=WAX.node_tree.nodes['Principled BSDF'];wb.inputs['Subsurface Weight'].default_value=.22;wb.inputs['Subsurface Radius'].default_value=(.008,.004,.0015)
POOL=plain('Candles | translucent melted wax',(.64,.51,.30),rough=.20,coat=.18)
CHAR=plain('Candles | braided carbon wick',(.010,.006,.003),rough=.93)
LUME=plain('Wheel | soft phosphorescent inlay',(.28,.37,.28),rough=.74,emit=(.35,.52,.39),strength=.65)

# An intimate view of the same square walnut-mounted brass wheel as Room I.
slab('Wall | solid plaster behind apparatus',-2,2,.205,.28,.1,2.6,PLASTER)
for j in range(4):
    y=-.65+j*.225
    slab('Ledge | individual oak board',-1.1,1.1,y,y+.222,.905,.94,WOOD,.0035)
slab('Ledge | rounded front moulding',-1.1,1.1,-.668,-.633,.854,.925,WALNUT,.006)
CX,CZ=-.22,1.54
slab('Plaque | solid walnut mount',CX-.28,CX+.28,.153,.203,CZ-.28,CZ+.28,WALNUT,.008)
for a,b,c,d in [(CX-.26,CX+.26,CZ-.26,CZ-.247),(CX-.26,CX+.26,CZ+.247,CZ+.26),(CX-.26,CX-.247,CZ-.247,CZ+.247),(CX+.247,CX+.26,CZ-.247,CZ+.247)]:
    slab('Plaque | fine separate raised moulding',a,b,.145,.155,c,d,WOOD,.002)

def turned(name,profile,at,mat):
    ob=lathe(name,profile,mat,steps=192);ob.rotation_euler=(math.pi/2,0,0);ob.location=at;return ob

turned('Outer | heavy fixed brass annulus',[(.165,0),(.220,0),(.224,.003),(.224,.009),(.220,.014),(.165,.014),(.164,.010),(.164,0)],(CX,.125,CZ),BRASS)
for r in (.173,.211,.222):
    turned('Outer | concentric machined bead',[(r-.0015,0),(r+.0015,0),(r+.0015,.0015),(r-.0015,.0015),(r-.0015,0)],(CX,.109,CZ),RIM)
rotor=[]
rotor.append(turned('Rotor | stepped solid brass disc',[(0,0),(.158,0),(.163,.003),(.163,.011),(.159,.015),(.150,.015),(.149,.013),(.075,.013),(.073,.015),(0,.015)],(CX,.126,CZ),BRASS))
for r in (.155,.149,.079):
    rotor.append(turned('Rotor | engraved concentric groove',[(r-.0006,0),(r+.0006,0),(r+.0006,.0005),(r-.0006,.0005),(r-.0006,0)],(CX,.110,CZ),BRONZE))
rotor.append(turned('Rotor | turned central thumb grip',[(0,0),(.029,0),(.034,.004),(.033,.012),(.027,.019),(.015,.023),(0,.023)],(CX,.109,CZ),RIM))
for i in range(96):
    a=math.tau*i/96
    ob=wire('Rotor | fine milled edge',[(CX+.161*math.cos(a),.116,CZ+.161*math.sin(a)),(CX+.161*math.cos(a),.121,CZ+.161*math.sin(a))],.00048,BRONZE)
    rotor.append(ob)
outer_letters=[];inner_letters=[]
for i,ch in enumerate(ALPHA):
    turn=math.tau*i/len(ALPHA);a=math.pi/2-turn
    outer_letters.append(writing('Outer | luminous '+ch,ch,(CX+.194*math.cos(a),.1097,CZ+.194*math.sin(a)),.029,LUME,angle=turn))
    ob=writing('Rotor | luminous '+ch,ch,(CX+.137*math.cos(a),.1104,CZ+.137*math.sin(a)),.0255,LUME,angle=turn)
    inner_letters.append(ob);rotor.append(ob)
    for radius,depth,name in [(.176,.109,'Outer'),(.119,.110,'Rotor')]:
        ob=wire(name+' | small index division',[(CX+radius*math.cos(a),depth,CZ+radius*math.sin(a)),(CX+(radius+.005)*math.cos(a),depth,CZ+(radius+.005)*math.sin(a))],.00035,BRONZE)
        if name=='Rotor':rotor.append(ob)
for x in (CX-.245,CX+.245):
    for z in (CZ-.245,CZ+.245):
        turned('Plaque | brass screw',[(0,0),(.004,0),(.004,.002),(0,.002)],(x,.142,z),RIM)
        wire('Plaque | dark screw slot',[(x-.0026,.1397,z),(x+.0026,.1397,z)],.00035,BRONZE)
mesh('Pointer | fixed triangular index',[(CX-.009,.105,CZ+.236),(CX+.009,.105,CZ+.236),(CX,.105,CZ+.224)],[(0,1,2)],BRONZE)

# A wax-sealed envelope rests on the same ledge, with real folded edges.
EX,EY=-.285,-.43
envverts=[(EX-.135,EY-.075,.944),(EX+.135,EY-.075,.944),(EX+.135,EY+.075,.944),(EX-.135,EY+.075,.944)]
envelope=mesh('Envelope | thick folded rag paper',envverts,[(0,1,2,3)],PAPER)
solid=envelope.modifiers.new('Actual folded envelope thickness','SOLIDIFY');solid.thickness=.0016
mesh('Envelope | triangular overlapping flap',[(EX-.134,EY+.073,.947),(EX+.134,EY+.073,.947),(EX,EY-.018,.949)],[(0,1,2)],PAPER)
for side in (-1,1):
    wire('Envelope | folded diagonal seam',[(EX+side*.134,EY-.074,.946),(EX,EY+.005,.946)],.00028,INK)
sphere('Seal | irregular burgundy wax',(EX,EY-.009,.950),.017,RED,squash=(1.05,.95,.14))
seal=writing('Seal | Ashcombe initial','A',(EX,EY-.009,.953),.017,BRONZE,font=SERIF)
seal.rotation_euler=(0,0,0)

# Three visibly different candles: modeled hollows, wax runs, melted pools,
# turned holders and braided black wicks. The moving fire is a native atlas.
candles=[];lights=[]
for i,(x,y,r,h) in enumerate([(.43,-.075,.019,.235),(.335,-.155,.0205,.159),(.535,-.235,.023,.092)]):
    foot=.94
    lathe('Candle | heavy turned brass holder',[(0,0),(.044,0),(.047,.006),(.044,.012),(.024,.017),(.021,.027),(.025,.032),(0,.032)],RIM,at=(x,y,foot),steps=64)
    z0=foot+.030
    body=lathe('Candle | hollow dripped beeswax',[(0,0),(r,0),(r*1.015,.006),(r,h-.006),(r*.92,h),(r*.71,h-.002),(r*.56,h-.009),(0,h-.010)],WAX,at=(x,y,z0),steps=96)
    for v in body.data.vertices:
        a=math.atan2(v.co.y,v.co.x)
        factor=1+.018*math.sin(a*7+v.co.z*64+i)+.010*math.sin(a*13+v.co.z*99)
        v.co.x*=factor;v.co.y*=factor
        if v.co.z>h-.012:v.co.z+=.0013*math.sin(a*5+i)
    cylinder('Candle | still melt pool',x,y,z0+h-.010,z0+h-.009,r*.55,POOL,verts=64)
    for j in range(8):
        a=j*math.tau/8+.31*i
        end=h*RNG.uniform(.15,.72)
        coords=[]
        for k in range(18):
            t=k/17;z=h-.003+(end-h+.003)*t
            aa=a+.022*math.sin(t*4+j)
            coords.append((x+(r+.0008)*math.cos(aa),y+(r+.0008)*math.sin(aa),z0+z))
        wire('Candle | rounded natural wax run',coords,RNG.uniform(.0010,.0018),WAX,taper=.48)
        sphere('Candle | cooled wax bead',coords[-1],.0018,WAX,squash=(.8,.8,1.25))
    wick=(x+.0005,y,z0+h-.003)
    wire('Candle | charred cotton wick',[(x,y,z0+h-.009),wick,(x+.0009,y,z0+h+.001)],.00065,CHAR)
    light=lamp(f'Candle | actual light {i}','POINT',(x,y,z0+h+.015),energy=2.4,colour=(1,.64,.32),size=.013)
    lights.append(light)
    candles.append({'wick3':wick,'radius':r*100,'height':(h+.03)*100})

world=bpy.data.worlds.new('Study | very subdued night fill');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.32,.46,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.035;scene.world=world
lamp('Night | restrained window bounce','AREA',(-.85,-.55,1.95),energy=4.0,colour=(.62,.73,.95),size=1.15,aim=(0,0,1.20))
lamp('Night | broad face reflection','AREA',(.10,-1.65,1.50),energy=.65,colour=(.74,.80,.91),size=1.65,aim=(CX,.1,CZ))
camera=bpy.data.cameras.new('Camera | 42 mm square-mounted cipher close-up');camera.lens=42;camera.sensor_width=36;camera.sensor_fit='HORIZONTAL'
cam=link(bpy.data.objects.new('Camera',camera));cam.location=(0,-2.35,1.30);cam.rotation_euler=(math.pi/2,0,0);scene.camera=cam
camera.dof.use_dof=False
cycles(scene,SAMPLES,WIDTH,HEIGHT,exposure=.25,glare=False)
scene.cycles.adaptive_threshold=.009;scene.cycles.max_bounces=12;scene.cycles.transmission_bounces=8
scene.render.use_persistent_data=True
scene.render.image_settings.color_depth='16'
if '--cpu' in sys.argv:scene.cycles.device='CPU'
bpy.context.view_layer.update()

def project(co):
    p=world_to_camera_view(scene,cam,Vector(co));return [round(p.x*WIDTH,4),round((1-p.y)*HEIGHT,4)]
centre=project((CX,.111,CZ));radius=abs(project((CX+.22,.111,CZ))[0]-centre[0])
disc_radius=abs(project((CX+.165,.111,CZ))[0]-centre[0])+2
crop=[math.floor(centre[0]-disc_radius),math.floor(centre[1]-disc_radius),math.ceil(disc_radius*2)+2,math.ceil(disc_radius*2)+2]
meta={'version':1,'width':WIDTH,'height':HEIGHT,'alphabet':ALPHA,'cipher':CIPHER,'wheel':{'centre':centre,'radius':radius,'discRadius':disc_radius,'crop':crop},'candles':[],'envelope':list(map(project,envverts))}
for candle in candles:
    wick=candle['wick3'];p=project(wick)
    scale=abs(project((wick[0]+.01,wick[1],wick[2]))[0]-p[0])
    meta['candles'].append({'wick':p,'scale':scale,'height':candle['height'],'radius':candle['radius']})
(OUT/'nativeCryptex.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
for ob in outer_letters+inner_letters:ob.hide_render=True
if '--pack' in sys.argv:
    bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'candlelight-brass.blend'),compress=True)

def render(name):
    scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
    print('BRASS_RENDERED',name,flush=True)

for mask in ([7] if PREVIEW else range(7,-1,-1)):
    for i,light in enumerate(lights):light.data.energy=2.4 if mask&(1<<i) else 0
    render('candles-'+str(mask))
if PREVIEW:sys.exit(0)
for ob in outer_letters:ob.hide_render=False
render('outer-lume')
for ob in inner_letters:ob.hide_render=False
visible=[ob for ob in bpy.data.objects if not ob.hide_render]
keep=set(rotor)|{cam}
for ob in visible:
    if ob.type in ('MESH','CURVE','FONT') and ob not in keep:ob.hide_render=True
scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA'
render('rotor')

# A dedicated photograph of the unfolded letter: curved paper, real creases
# and the unchanged encrypted text, all physically lit in Blender.
for ob in list(scene.objects):ob.hide_render=True
scene.render.film_transparent=False;scene.render.image_settings.color_mode='RGB'
desk=slab('Reading | walnut surface',-.6,.6,-.5,.5,-.024,0,WOOD,.003)
verts=[];faces=[]
for j in range(61):
    y=-.148+.296*j/60
    for i in range(49):
        x=-.108+.216*i/48
        z=.003+.0015*math.sin(x*21+y*18)+.001*math.sin(y*49)
        z+=.0018*math.exp(-((y+.045)/.003)**2)+.0015*math.exp(-((y-.050)/.003)**2)
        z+=.0016*(abs(x)/.108)**7*(abs(y)/.148)**6
        verts.append((x,y,z))
for j in range(60):
    for i in range(48):a=j*49+i;faces.append((a,a+1,a+50,a+49))
sheet=mesh('Reading | folded rag-paper sheet',verts,faces,PAPER,True)
sol=sheet.modifiers.new('Paper thickness','SOLIDIFY');sol.thickness=.00018
for y in (-.045,.05):wire('Reading | soft visible paper fold',[(-.105,y,.005),(.105,y,.005)],.00010,PAPER)
for body,y,size,font in [('13 October 1961',.115,.0075,HAND),(CIPHER[0],.028,.022,TYPE),(CIPHER[1],-.009,.022,TYPE),('— I. A.',-.112,.008,HAND)]:
    ob=writing('Reading | actual ink '+body,body,(0,y,.0065),size,INK,font);ob.rotation_euler=(0,0,0)
reading_light=lamp('Reading | warm broad candle bounce','AREA',(-.25,-.22,.43),energy=7,colour=(1,.77,.50),size=.42,aim=(0,0,0))
reading_fill=lamp('Reading | cool quiet fill','AREA',(.24,.20,.5),energy=2,colour=(.72,.80,.94),size=.5,aim=(0,0,0))
cam.hide_render=False;cam.location=(0,-.08,.64);cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();camera.lens=58
scene.render.resolution_x=1400;scene.render.resolution_y=1600;scene.cycles.samples=min(SAMPLES,128)
render('letter')

# Sixteen original flame meshes in one atlas, matching Candle.js's frame
# and wick coordinates exactly. No synthetic photo or Javascript painting.
for ob in list(scene.objects):ob.hide_render=True
flame_material=bpy.data.materials.new('Fire | soft luminous mantle');flame_material.use_nodes=True
n=flame_material.node_tree.nodes;l=flame_material.node_tree.links.new;n.clear()
out=n.new('ShaderNodeOutputMaterial');em=n.new('ShaderNodeEmission');em.inputs[1].default_value=2.5
tc=n.new('ShaderNodeTexCoord');sep=n.new('ShaderNodeSeparateXYZ');l(tc.outputs['Generated'],sep.inputs[0])
col=n.new('ShaderNodeValToRGB');col.color_ramp.elements[0].color=(.24,.37,1,1);col.color_ramp.elements[1].color=(1,.12,.008,1)
for pos,tone in [(.12,(1,.42,.045,1)),(.34,(1,.91,.52,1)),(.66,(1,.65,.15,1))]:col.color_ramp.elements.new(pos).color=tone
l(sep.outputs['Z'],col.inputs[0]);l(col.outputs[0],em.inputs[0]);l(em.outputs[0],out.inputs['Surface'])
for f in range(16):
    phase=f*math.tau/16;ox=(f%8)*.072+.036;oz=(1-f//8)*.160+.014
    vs=[];fs=[]
    for j in range(41):
        t=j/40;half=.017*max(.00001,math.sin(math.pi*t**.70))**.85*(1-.3*t)
        for k in range(24):
            a=math.tau*k/24
            vs.append((ox+half*math.cos(a)+.004*math.sin(phase)*t*t,half*.45*math.sin(a),oz+.124*t*(1+.04*math.sin(phase))))
    for j in range(40):
        for k in range(24):a=j*24+k;b=j*24+(k+1)%24;fs.append((a,b,b+24,a+24))
    mesh('Fire | native flame frame '+str(f),vs,fs,flame_material,True)
camera.type='ORTHO';camera.ortho_scale=.576;cam.hide_render=False;cam.location=(.288,-1,.160);cam.rotation_euler=(math.pi/2,0,0)
scene.render.resolution_x=576;scene.render.resolution_y=320;scene.render.film_transparent=True;scene.render.image_settings.color_mode='RGBA';scene.cycles.samples=32
render('flames')
print('CANDLELIGHT_BRASS_DONE',flush=True)
