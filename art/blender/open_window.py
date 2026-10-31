"""The Open Window: an original Blender night sky, Moon and observatory.

Moon colour/elevation: NASA SVS/LRO CGI Moon Kit. Surface and tree scans:
the existing Poly Haven CC0 library. No generated bitmap images.
blender -b -P art/blender/open_window.py -- --width 2880 --samples 256 --pack
node art/blender/open_window_publish.mjs
"""
import bpy,bmesh,math,random,json,sys
from pathlib import Path
from mathutils import Vector,Matrix
from bpy_extras.object_utils import world_to_camera_view
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from kit import arg,fresh,link,box,bevel,plain,aged_metal,cylinder,sphere,lathe,lamp,cycles,import_model,clone
from hall_common import scan,clear_glass
ROOT=HERE.parents[1];OUT=Path(arg('--out',str(ROOT/'.artifacts/open-window'))).resolve();OUT.mkdir(parents=True,exist_ok=True)
W=int(arg('--width','2880'));H=round(W*1000/1880);SAMPLES=int(arg('--samples','256'));PREVIEW='--preview' in sys.argv
DATA=json.loads((ROOT/'src/levels/telescope/puzzle.json').read_text(encoding='utf-8'))
RNG=random.Random(55312861)
scene=fresh();scene.name='The Open Window | Orion Ashcombe observatory'
scene['provenance']='Original Blender architecture and sky geometry; NASA SVS/LRO lunar colour and elevation; Poly Haven CC0 photographed surfaces, night illumination and trees.'
scene['no_ai_generated_images']=True

def slab(name,x0,x1,y0,y1,z0,z1,mat,r=.003):
    ob=box(name,x0,x1,y0,y1,z0,z1,mat)
    if r:bevel(ob,r,3)
    return ob

def mesh(name,verts,faces,mat,smooth=False):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
    ob=link(bpy.data.objects.new(name,data));data.materials.append(mat)
    for p in data.polygons:p.use_smooth=smooth
    return ob

def wire(name,points,r,mat):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=r;data.bevel_resolution=4;data.use_fill_caps=True
    sp=data.splines.new('POLY');sp.points.add(len(points)-1)
    for p,co in zip(sp.points,points):p.co=(*co,1)
    ob=link(bpy.data.objects.new(name,data));data.materials.append(mat);return ob

def rod(name,a,b,r,mat,r2=None):
    a,b=Vector(a),Vector(b);ob=cylinder(name,0,0,0,(b-a).length,r,mat,verts=32,r2=r2)
    ob.location=a;ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return ob

OAK=scan('Window | weathered English oak','dark_wood',.65,tint=(.67,.48,.29),bright=.63,sat=.48,rough=(.37,.64),bump=.34,coat=.10,upright=True)
RAIL=scan('Window | oak sill across grain','dark_wood',.65,tint=(.67,.48,.29),bright=.63,sat=.48,rough=(.37,.64),bump=.34,coat=.10)
WALL=scan('Observatory | worn sage lime plaster','plastered_wall_04',2.2,tint=(.23,.29,.23),bright=.49,sat=.18,rough=(.83,.96),bump=.26)
STONE=scan('Exterior | dark weathered stone','old_sandstone_02',1.8,tint=(.43,.46,.45),bright=.41,sat=.18,rough=(.57,.84),bump=.45)
BRASS=aged_metal('Hardware | old rubbed brass',(.43,.29,.12),(.063,.052,.028),rough=(.30,.57),scale=58,tarnish=.58)
IRON=aged_metal('Balcony | hand-forged black iron',(.045,.048,.047),(.023,.020,.016),rough=(.41,.70),tarnish=.65)
CLOTH=scan('Curtains | dark grey-green linen velvet','velour_velvet',.45,tint=(.22,.28,.24),bright=.54,sat=.25,rough=(.72,.92),bump=.20)
CLOTH.node_tree.nodes['Principled BSDF'].inputs['Sheen Weight'].default_value=.28
GLASS=plain('Casements | clear old glass',(.96,.98,.97),rough=.025,transmission=1,ior=1.48)
GROUND=scan('Valley | photographed earth and grass','grass_ground',35,tint=(.42,.50,.37),bright=.45,sat=.34,rough=(.77,.96),bump=.5)

# The broad round-headed bay follows the physics hall's actual proportions.
HW,SILL,TOP=1.345,1.04,2.44
RISE=HW*.495;SPRING=TOP-RISE
slab('Room | left wall',-4,-HW-.045,-.08,.35,-.2,3.8,WALL)
slab('Room | right wall',HW+.045,4,-.08,.35,-.2,3.8,WALL)
slab('Room | wall below opening',-HW-.05,HW+.05,-.08,.35,-.2,SILL-.03,WALL)
vs=[];fs=[]
for i in range(97):
    x=-HW+2*HW*i/96;z=SPRING+RISE*math.sqrt(max(0,1-(x/HW)**2))
    vs.extend([(x,-.08,z),(x,-.08,3.8),(x,.35,z),(x,.35,3.8)])
for i in range(96):
    a=4*i;fs.extend([(a,a+4,a+5,a+1),(a+2,a+3,a+7,a+6),(a,a+2,a+6,a+4)])
mesh('Room | real deep arched plaster reveal',vs,fs,WALL)
for side in (-1,1):
    x=side*HW
    slab('Window | solid oak jamb',x-.034,x+.034,-.112,.30,SILL,SPRING+.015,OAK,.005)
    slab('Window | stepped inner rebate',x-.017,x+.017,-.128,-.105,SILL+.025,SPRING,RAIL,.002)
    for z in (SILL+.29,SPRING-.10):
        slab('Window | solid brass hinge leaf',x-.023,x+.023,-.145,-.130,z-.033,z+.033,BRASS,.001)
        rod('Window | actual hinge pin',(x,-.149,z-.035),(x,-.149,z+.035),.0033,BRASS)
arch=[(HW*math.cos(math.pi-i*math.pi/128),-.10,SPRING+RISE*math.sin(math.pi-i*math.pi/128)) for i in range(129)]
wire('Window | continuous bent oak arch',arch,.035,OAK)
wire('Window | narrow aged brass inner bead',[(x*.973,y-.022,SPRING+(z-SPRING)*.965) for x,y,z in arch],.0048,BRASS)
slab('Window | deep rounded oak sill',-HW-.15,HW+.15,-.31,.39,SILL-.065,SILL,RAIL,.012)
slab('Window | projecting bullnose',-HW-.17,HW+.17,-.34,-.28,SILL-.075,SILL-.027,RAIL,.009)
slab('Window | panelled sill apron',-HW-.05,HW+.05,-.16,-.09,SILL-.20,SILL-.075,OAK,.005)

# Open side casements reveal real depth at the jambs. Their leaves stay at
# the edges, leaving all five signal groups in uninterrupted open sky.
for side in (-1,1):
    root=link(bpy.data.objects.new('Window | open casement leaf',None));root.location=(side*HW,.10,0);root.rotation_euler.z=side*math.radians(112)
    width=.50;lo,hi=(0,width) if side<0 else (-width,0)
    parts=[]
    for x in (lo,hi):parts.append(slab('Casement | oiled oak stile',x-.017,x+.017,-.017,.017,SILL+.02,SPRING,OAK))
    for z in (SILL+.035,SPRING-.016):parts.append(slab('Casement | oak rail',lo,hi,-.017,.017,z-.017,z+.017,RAIL))
    parts.append(slab('Casement | thin genuine glazing',lo+.02,hi-.02,-.001,.001,SILL+.06,SPRING-.04,GLASS,.0002))
    for ob in parts:ob.parent=root

# Tied-back cloth is a continuous, finely folded surface with hem thickness.
for side in (-1,1):
    vv=[];ff=[]
    for j in range(61):
        t=j/60;z=TOP+.05-(TOP-SILL+.03)*t
        width=.25-.12*math.exp(-((t-.62)/.16)**2)+.035*math.sin(t*math.pi)
        centre=side*(HW+.15-.04*math.sin(t*math.pi))
        for i in range(33):
            u=i/32
            x=centre+side*(u-.5)*width
            y=-.205+.025*math.sin(u*math.pi*10+.22*t)+.012*math.cos(u*math.pi*6)*math.sin(t*math.pi)
            vv.append((x,y,z+.004*math.sin(u*11)*t*t))
    for j in range(60):
        for i in range(32):a=j*33+i;ff.append((a,a+1,a+34,a+33))
    ob=mesh('Curtain | individually folded tied-back cloth',vv,ff,CLOTH,True)
    solid=ob.modifiers.new('Actual sewn cloth thickness','SOLIDIFY');solid.thickness=.0011
    tiez=TOP+.05-(TOP-SILL+.03)*.62
    wire('Curtain | aged brass tie-back',[(side*(HW+.12)+.078*math.cos(a),-.235+.025*math.sin(a),tiez+.014*math.sin(a)) for a in [k*math.tau/48 for k in range(49)]],.005,BRASS)

# The terrace rail is outside the opening, below every clue constellation.
slab('Exterior | stone balcony floor',-3,3,.35,2.4,-.12,-.02,STONE,.008)
for z in (.23,1.015):rod('Balcony | horizontal iron rail',(-2.7,1.05,z),(2.7,1.05,z),.013 if z<1 else .022,IRON)
for i in range(25):
    x=-2.65+i*5.3/24
    rod('Balcony | separate forged baluster',(x,1.05,.04),(x,1.05,1.015),.0085,IRON)
    sphere('Balcony | hand-forged collar',(x,1.05,.73),.014,IRON,squash=(1,1,1.6))

# The moonlit valley is actual relief and scanned foliage, not a backdrop.
def ground_height(x,y):
    return -48+17*math.sin(x*.012+y*.006)+9*math.sin(y*.019)+22*min(1,max(0,(y-350)/1000))
vv=[];ff=[];NX,NY=100,100
for j in range(NY+1):
    y=110+j*15
    for i in range(NX+1):
        x=-800+i*16;vv.append((x,y,ground_height(x,y)))
for j in range(NY):
    for i in range(NX):a=j*(NX+1)+i;ff.append((a,a+1,a+NX+2,a+NX+1))
mesh('Landscape | undulating wooded valley',vv,ff,GROUND,True)
FAR=plain('Landscape | distant blue-grey ridges',(.025,.043,.061),rough=.95)
for row in range(3):
    y=1700+row*600;vs=[(-3500,y,-500),(3500,y,-500)]
    vs += [(x,y,20+row*12+24*math.sin(x*.0033+row)+12*math.sin(x*.008+row*.7)) for x in range(3500,-3501,-40)]
    mesh('Landscape | overlapping distant ridge',vs,[tuple(range(len(vs)))],FAR)
prototypes=[]
for index,model in enumerate(['fir_tree_01','tree_small_02','island_tree_01']):
    x,y=[(-70,260),(110,390),(-190,570)][index]
    root=import_model(model,height=13+index*3,at=(x,y,ground_height(x,y)),rot=index*.8);root.name='Woodland | original scanned '+model
    prototypes.append(root)
for i in range(75):
    x=RNG.uniform(-560,560);y=RNG.uniform(180,1450)
    clone(prototypes[i%3],(x,y,ground_height(x,y)),rot=RNG.uniform(0,math.tau),k=RNG.uniform(.75,1.65))
for row in range(8):
    for col in range(55):
        y=160+row*115+RNG.uniform(-28,28)
        x=-480+col*18+RNG.uniform(-11,11)
        clone(prototypes[(col+row)%3],(x,y,ground_height(x,y)),rot=RNG.uniform(0,math.tau),k=RNG.uniform(.72,1.45))

# A restrained clear-sky gradient is visible to the eye; the existing real
# photographed night HDR illuminates timber, stone and cloth naturally.
world=bpy.data.worlds.new('Night | clear astronomical sky');world.use_nodes=True;scene.world=world
n=world.node_tree.nodes;l=world.node_tree.links.new;n.clear()
out=n.new('ShaderNodeOutputWorld');env=n.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load('C:/Users/crist/Tools/render/assets/hdri/moonlit_golf.hdr')
ambient=n.new('ShaderNodeBackground');ambient.inputs['Strength'].default_value=.15;l(env.outputs[0],ambient.inputs[0])
tc=n.new('ShaderNodeTexCoord');sep=n.new('ShaderNodeSeparateXYZ');l(tc.outputs['Normal'],sep.inputs[0])
ab=n.new('ShaderNodeMath');ab.operation='ABSOLUTE';l(sep.outputs['Z'],ab.inputs[0])
ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.02;ramp.color_ramp.elements[0].color=(.010,.017,.029,1)
ramp.color_ramp.elements[1].position=.50;ramp.color_ramp.elements[1].color=(.0013,.0027,.006,1);l(ab.outputs[0],ramp.inputs[0])
sky=n.new('ShaderNodeBackground');sky.inputs['Strength'].default_value=.65;l(ramp.outputs[0],sky.inputs[0])
path=n.new('ShaderNodeLightPath');rays=n.new('ShaderNodeMath');rays.operation='MAXIMUM';l(path.outputs['Is Camera Ray'],rays.inputs[0]);l(path.outputs['Is Transmission Ray'],rays.inputs[1])
mix=n.new('ShaderNodeMixShader');l(rays.outputs[0],mix.inputs[0]);l(ambient.outputs[0],mix.inputs[1]);l(sky.outputs[0],mix.inputs[2]);l(mix.outputs[0],out.inputs[0])
lamp('Moonlight | soft silver night on the valley','SUN',(300,-500,700),aim=(0,600,0),energy=.32,colour=(.65,.76,.96),angle=math.radians(.7))
lamp('Room | warm practical outside the view','AREA',(-1.7,-1.8,2.3),aim=(0,.0,1.7),energy=13,colour=(1,.72,.44),size=1.2)
lamp('Window | cool bounce on the inner reveal','AREA',(.8,1.0,2.8),aim=(0,-.10,1.45),energy=10,colour=(.56,.70,1),size=2)
lamp('Arch | restrained warm reflected interior light','AREA',(0,-1.2,1.75),aim=(0,.10,2.30),energy=7,colour=(1,.77,.53),size=1.6)

camera=bpy.data.cameras.new('Camera | near the open observatory window');camera.lens=27;camera.sensor_width=36;camera.sensor_fit='HORIZONTAL';camera.clip_end=30000
cam=link(bpy.data.objects.new('Camera',camera));cam.location=(0,-2.35,1.30);cam.rotation_euler=(Vector((0,0,1.74))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
scene.render.resolution_x=W;scene.render.resolution_y=H;bpy.context.view_layer.update()
def project(co):
    p=world_to_camera_view(scene,cam,Vector(co));return [round(p.x*W,4),round((1-p.y)*H,4)]
def at_pixel(px,py,distance):
    focal=W*camera.lens/camera.sensor_width
    ray=Vector(((px-W/2)/focal,(H/2-py)/focal,-1)).normalized()
    return cam.location+(cam.matrix_world.to_3x3()@ray)*distance

# Every signal star is a real emissive point in the sky. Its camera-space
# placement is shared with the subtle existing constellation hover guide.
dx,dy=H*.052,H*.049
cells=[];signals=[];decor=[]
for i,letter in enumerate(DATA['letters']):
    cx=W*(.23+i*.135);slot=DATA['rowOrder'][i];cy=H*(.27+(slot+.5)*.32/5)
    cell={'letter':letter['letter'],'dots':letter['dots'],'cx':cx,'cy':cy,'box':{'x0':cx-dx/2-H*.023,'x1':cx+dx/2+H*.023,'y0':cy-dy-H*.023,'y1':cy+dy+H*.023}}
    cells.append(cell)
    for dot in letter['dots']:
        col,row=DATA['positions'][str(dot)];signals.append((cx+col*dx/2,cy+row*dy))

def star(name,px,py,pixels,strength,tint):
    d=12000;at=at_pixel(px,py,d);radius=pixels*d/(W*camera.lens/camera.sensor_width)
    material=plain(name+' | stellar emission',tint,rough=1,emit=tint,strength=strength)
    ob=sphere(name,at,radius,material)
    ob.visible_shadow=False;ob.visible_diffuse=False;ob.visible_glossy=False
    return ob,material

for i,(px,py) in enumerate(signals):star('Signal | exact Braille point '+str(i),px,py,1.25,7.0,(.86,.93,1))
for i in range(165):
    for attempt in range(100):
        px=RNG.uniform(W*.105,W*.895);py=RNG.uniform(H*.10,H*.72)
        near=any(c['box']['x0']-12<px<c['box']['x1']+12 and c['box']['y0']-12<py<c['box']['y1']+12 for c in cells)
        near_moon=math.hypot(px-W*.69,py-H*.27)<H*.055
        if not near and not near_moon:break
    else:continue
    tint=RNG.choice([(.78,.88,1),(1,.91,.75),(.95,.97,1)])
    ob,mat=star('Sky | irregular distant star '+str(i),px,py,RNG.uniform(.25,.72),RNG.uniform(1.0,4.5),tint)
    decor.append((mat,RNG.uniform(.24,.48)))

# The Moon is a true textured and relieved sphere. Its near-side texture
# and terrain relief come from NASA's LRO colour and laser-altimetry maps.
colour=bpy.data.images.load(str(HERE/'open_window_assets/lroc_color_2k.jpg'))
height=bpy.data.images.load(str(HERE/'open_window_assets/ldem_3_8bit.jpg'));height.colorspace_settings.name='Non-Color'
moon_at=at_pixel(W*.69,H*.27,6500);moon_r=26*W/2880*6500/(W*camera.lens/camera.sensor_width)
mat=bpy.data.materials.new('Moon | NASA SVS LRO surface and relief');mat.use_nodes=True
n=mat.node_tree.nodes;l=mat.node_tree.links.new;n.clear();out=n.new('ShaderNodeOutputMaterial');tex=n.new('ShaderNodeTexImage');tex.image=colour
elev=n.new('ShaderNodeTexImage');elev.image=height;bp=n.new('ShaderNodeBump');bp.inputs['Strength'].default_value=.23;bp.inputs['Distance'].default_value=moon_r*.003;l(elev.outputs['Color'],bp.inputs['Height'])
view=(cam.location-moon_at).normalized();solar=(view+Vector((.30,0,.12))).normalized()
dot=n.new('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT';l(bp.outputs['Normal'],dot.inputs[0]);dot.inputs[1].default_value=solar
clamp=n.new('ShaderNodeMath');clamp.operation='MAXIMUM';clamp.inputs[1].default_value=.018;l(dot.outputs['Value'],clamp.inputs[0])
mul=n.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1;l(tex.outputs['Color'],mul.inputs[1]);l(clamp.outputs[0],mul.inputs[2])
em=n.new('ShaderNodeEmission');em.inputs[1].default_value=1.1;l(mul.outputs[0],em.inputs[0]);l(em.outputs[0],out.inputs[0])
vs=[];fs=[];uvs=[];NX,NY=192,96
for j in range(NY+1):
    lat=-math.pi/2+math.pi*j/NY
    for i in range(NX+1):
        lon=-math.pi+math.tau*i/NX
        vs.append((moon_r*math.cos(lat)*math.cos(lon),moon_r*math.cos(lat)*math.sin(lon),moon_r*math.sin(lat)))
for j in range(NY):
    for i in range(NX):
        a=j*(NX+1)+i;fs.append((a,a+1,a+NX+2,a+NX+1));uvs.extend([(i/NX,j/NY),((i+1)/NX,j/NY),((i+1)/NX,(j+1)/NY),(i/NX,(j+1)/NY)])
moon=mesh('Moon | actual spherical lunar surface',vs,fs,mat,True);uv=moon.data.uv_layers.new(name='NASA longitude latitude')
for loop,co in zip(uv.data,uvs):loop.uv=co
relief=bpy.data.textures.new('Moon | NASA laser-altimetry elevation','IMAGE');relief.image=height
displace=moon.modifiers.new('Actual lunar terrain relief','DISPLACE');displace.texture=relief;displace.texture_coords='UV';displace.uv_layer=uv.name;displace.strength=moon_r*.006;displace.mid_level=.5
north=(Vector((0,0,1))-view*view.z).normalized();east=north.cross(view).normalized()
moon.rotation_euler=Matrix((view,east,north)).transposed().to_euler();moon.location=moon_at;moon.visible_shadow=False

# The approach uses a real brass refractor and timber tripod in the same room.
scope=[]
before=set(scene.objects)
BRONZE=aged_metal('Telescope | rubbed optical brass',(.50,.35,.16),(.08,.06,.03),rough=(.25,.48),tarnish=.42)
centre=Vector((.35,-.74,1.35));axis=Vector((.10,.88,.46)).normalized()
rod('Telescope | long optical tube',centre-axis*.40,centre+axis*.48,.046,BRONZE)
for t in (-.39,-.19,.25,.47):
    rod('Telescope | turned lens collar',centre+axis*(t-.012),centre+axis*(t+.012),.052,BRASS)
rod('Telescope | eyepiece',centre-axis*.52,centre-axis*.39,.019,IRON)
lens=plain('Telescope | dark coated objective',(.018,.035,.044),rough=.10,metal=.28,coat=.40)
rod('Telescope | optical objective',centre+axis*.482,centre+axis*.484,.042,lens)
rod('Telescope | sturdy altitude bracket',(.35,-.74,1.10),centre,.028,BRASS)
for angle in (0,math.tau/3,math.tau*2/3):
    foot=(.35+.43*math.cos(angle),-.74+.43*math.sin(angle),.025)
    rod('Telescope | solid oak tripod leg',(.35,-.74,1.14),foot,.022,OAK,r2=.033)
    sphere('Telescope | iron tripod shoe',foot,.031,IRON,squash=(1,1,.7))
scope=[ob for ob in scene.objects if ob not in before]
for ob in scope:ob.hide_render=True

clear_glass();cycles(scene,SAMPLES,W,H,exposure=.45,glare=False)
scene.cycles.adaptive_threshold=.008;scene.cycles.max_bounces=10;scene.render.use_persistent_data=True
scene.render.image_settings.color_depth='16'
if '--cpu' in sys.argv:scene.cycles.device='CPU'
scene.use_nodes=True;n=scene.node_tree.nodes;l=scene.node_tree.links.new;n.clear()
rl=n.new('CompositorNodeRLayers');glow=n.new('CompositorNodeGlare');glow.glare_type='FOG_GLOW';glow.threshold=.8;glow.size=6;glow.mix=-.94
out=n.new('CompositorNodeComposite');l(rl.outputs['Image'],glow.inputs['Image']);l(glow.outputs['Image'],out.inputs[0])
metadata={'version':1,'width':W,'height':H,'word':DATA['word'],'dx':dx,'dy':dy,'cells':cells,'moon':{'centre':project(moon_at),'radius':26*W/2880}}
metadata['opening']=[project((-HW,.36,SILL)),project((-HW,.36,SPRING))]+[project((HW*math.cos(math.pi-i*math.pi/96),.36,SPRING+RISE*math.sin(math.pi-i*math.pi/96))) for i in range(97)]+[project((HW,.36,SILL))]
if '--pack' in sys.argv:bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'open-window.blend'),compress=True)
def render(name):
    scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True);print('OPEN_WINDOW_RENDERED',name,flush=True)
render('window')
if PREVIEW:
    (OUT/'nativeWindow.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8');sys.exit(0)
for material,factor in decor:
    b=material.node_tree.nodes['Principled BSDF'];b.inputs['Emission Strength'].default_value*=factor
render('quiet')
for ob in scope:ob.hide_render=False
cam.location=(0,-4.8,1.45);cam.rotation_euler=(Vector((0,.10,1.40))-cam.location).to_track_quat('-Z','Y').to_euler();camera.lens=30
bpy.context.view_layer.update()
points=[project(ob.matrix_world@Vector(co)) for ob in scope if ob.type in ('MESH','CURVE') for co in ob.bound_box]
metadata['scopeBounds']={'x':min(p[0] for p in points),'y':min(p[1] for p in points),'width':max(p[0] for p in points)-min(p[0] for p in points),'height':max(p[1] for p in points)-min(p[1] for p in points)}
slab('Room | oak floor visible in approach',-4,4,-5,.35,-.07,-.01,RAIL,.001)
render('approach')
(OUT/'nativeWindow.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
print('OPEN_WINDOW_DONE',flush=True)
