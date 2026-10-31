"""The router room: original geometry and physically lit Cycles artwork.

No generated images. Existing photographed CC0 surface scans and plant meshes
are reused. The twelve LEDs are geometry, with separate Cycles light states.
blender -b -P art/blender/modem_room.py -- --width 2880 --samples 256 --pack
node art/blender/modem_room_publish.mjs
"""
import bpy, bmesh, math, random, sys, json
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from kit import arg, fresh, link, box, bevel, cylinder, sphere, lathe, plain, aged_metal, lamp, cycles, import_model, clone, paper
from hall_common import scan, clear_glass

ROOT=HERE.parents[1]
OUT=Path(arg('--out',str(ROOT/'.artifacts/modem-native'))).resolve()
OUT.mkdir(parents=True,exist_ok=True)
W=int(arg('--width','2880'));H=round(W*1000/1880)
SAMPLES=int(arg('--samples','256'))
PREVIEW='--preview' in sys.argv
RNG=random.Random(20011013)
scene=fresh();scene.name='Signal Intercepted | the library router'
scene['provenance']='Original Blender desk, lamp, router and twelve LED lenses; existing Poly Haven CC0 photographed material scans, books and plants.'
scene['no_ai_generated_images']=True
scene['puzzle']='Five counters followed by seven ASCII bits. Original planTransmission() controls timing.'

def slab(name,x0,x1,y0,y1,z0,z1,mat,r=.001):
    ob=box(name,x0,x1,y0,y1,z0,z1,mat)
    if r:bevel(ob,r,3)
    return ob

def mesh(name,verts,faces,mat,smooth=False):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
    ob=link(bpy.data.objects.new(name,data));data.materials.append(mat)
    for p in data.polygons:p.use_smooth=smooth
    return ob

def rod(name,a,b,r,mat,r2=None):
    a,b=Vector(a),Vector(b)
    ob=cylinder(name,0,0,0,(b-a).length,r,mat,verts=32,r2=r2)
    ob.location=a;ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return ob

def cable(name,coords,r,mat):
    cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=4;cu.resolution_u=32;cu.use_fill_caps=True
    sp=cu.splines.new('BEZIER');sp.bezier_points.add(len(coords)-1)
    for bp,co in zip(sp.bezier_points,coords):bp.co=co;bp.handle_left_type=bp.handle_right_type='AUTO'
    ob=link(bpy.data.objects.new(name,cu));cu.materials.append(mat);return ob

FONT=bpy.data.fonts.load('C:/Windows/Fonts/georgia.ttf')
SANS=bpy.data.fonts.load('C:/Windows/Fonts/arial.ttf')
def text(name,body,at,size,mat,font=FONT,align='CENTER',rotation=(math.pi/2,0,0)):
    cu=bpy.data.curves.new(name,'FONT');cu.body=body;cu.font=font;cu.size=size;cu.align_x=align;cu.align_y='CENTER';cu.resolution_u=12
    ob=link(bpy.data.objects.new(name,cu));cu.materials.append(mat);ob.location=at;ob.rotation_euler=rotation;return ob

WOOD=scan('Desk | rubbed dark walnut','dark_wood',.65,tint=(.75,.52,.31),bright=.68,sat=.5,rough=(.36,.57),bump=.23,coat=.16)
VERTICAL=scan('Cabinet | vertical walnut grain','dark_wood',.65,tint=(.70,.49,.31),bright=.60,sat=.5,rough=(.32,.58),bump=.25,coat=.15,upright=True)
WALL=scan('Wall | deep petrol lime plaster','plastered_wall_04',1.4,tint=(.24,.44,.43),bright=.72,sat=.20,rough=(.82,.96),bump=.25)
BRASS=aged_metal('Lamp | rubbed brass with old patina',(.53,.36,.14),(.055,.043,.022),rough=(.23,.48),scale=85,tarnish=.49)
BRONZE=aged_metal('Handles | old brown bronze',(.28,.18,.075),(.045,.034,.021),rough=(.36,.60),scale=80,tarnish=.64)
IRON=plain('Screws | dark steel',(.025,.026,.027),rough=.37,metal=.74)
RUBBER=plain('Cable and feet | aged black rubber',(.009,.010,.011),rough=.68)
PAGES=paper('Books | unbleached paper',(.54,.46,.31),.13)
INK=plain('Lettering | aged ivory screen print',(.57,.53,.42),rough=.72)
BLACK=plain('Router | fine stippled graphite ABS',(.040,.042,.040),rough=.38,coat=.12)
bs=BLACK.node_tree.nodes['Principled BSDF'];n=BLACK.node_tree.nodes;l=BLACK.node_tree.links.new
tc=n.new('ShaderNodeTexCoord');noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=2300;noise.inputs['Detail'].default_value=2;l(tc.outputs['Object'],noise.inputs['Vector'])
bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.16;bump.inputs['Distance'].default_value=.000045;l(noise.outputs['Fac'],bump.inputs['Height']);l(bump.outputs['Normal'],bs.inputs['Normal'])
rough=n.new('ShaderNodeMapRange');rough.inputs['To Min'].default_value=.31;rough.inputs['To Max'].default_value=.43;l(noise.outputs['Fac'],rough.inputs['Value']);l(rough.outputs[0],bs.inputs['Roughness'])
FACE=plain('Router | inset satin face panel',(.016,.019,.018),rough=.31,coat=.22)
LENS=plain('LED | smoked unlit optical lens',(.010,.026,.019),rough=.19,coat=.72)

# The same intimate composition as the former room image, now in real space.
slab('Room | plaster wall',-2,2,.70,.78,0,2.7,WALL,.0)
slab('Room | oak skirting',-2,2,.66,.70,0,.13,VERTICAL,.003)
slab('Room | low walnut panelling',-2,2,.665,.70,.13,.77,VERTICAL,.002)
for x in [i*.33 for i in range(-6,7)]:slab('Room | panel stile',x-.013,x+.013,.648,.667,.13,.77,VERTICAL,.002)

DESK=.755
slab('Desk | solid walnut top',-.96,.96,-.59,.53,DESK-.044,DESK,WOOD,.009)
slab('Desk | shaped bullnose edge',-.97,.97,-.606,-.578,DESK-.052,DESK-.014,WOOD,.007)
slab('Desk | apron',-.91,.91,-.568,-.530,DESK-.18,DESK-.050,VERTICAL,.003)
for x in (-.70,0,.70):
    lo,hi=x-.205,x+.205
    slab('Desk | recessed drawer',lo,hi,-.580,-.559,DESK-.172,DESK-.064,VERTICAL,.003)
    slab('Desk | raised drawer field',lo+.020,hi-.020,-.584,-.580,DESK-.151,DESK-.084,WOOD,.003)
    for xx in (x-.035,x+.035):sphere('Desk | bronze handle escutcheon',(xx,-.593,DESK-.118),.008,BRONZE,squash=(1,.3,1))
    cable('Desk | hanging drawer pull',[(x-.035,-.597,DESK-.118),(x-.027,-.610,DESK-.143),(x+.027,-.610,DESK-.143),(x+.035,-.597,DESK-.118)],.0035,BRONZE)

# A wall cabinet and individually bound books, kept behind the lamp.
for x in (-.96,-.38):slab('Library | carved upright',x-.023,x+.023,.43,.67,.76,1.86,VERTICAL,.004)
slab('Library | recessed back',-.96,-.38,.658,.672,.76,1.86,VERTICAL,.002)
for z in (.81,1.16,1.52,1.86):
    slab('Library | shelf',-.98,-.36,.405,.67,z-.024,z,WOOD,.003)
    slab('Library | shelf moulding',-.99,-.35,.395,.422,z-.026,z-.008,WOOD,.004)
COVERS=[scan('Binding | worn leather '+str(i),'fabric_leather_02',.18,tint=c,bright=.46,sat=.10,rough=(.49,.75),bump=.25) for i,c in enumerate([(.34,.16,.085),(.12,.20,.12),(.22,.12,.09),(.25,.22,.13),(.10,.13,.16)])]
for shelf,z in enumerate((.81,1.16,1.52)):
    if shelf==0:
        import_model('book_encyclopedia_set_01',width=.50,at=(-.67,.535,z),rot=0)
        continue
    x=-.92
    for i in range(11):
        width=RNG.uniform(.024,.045);height=RNG.uniform(.19,.29);depth=RNG.uniform(.13,.18)
        if x+width>-.40:break
        mat=COVERS[(i+shelf)%len(COVERS)];yy=.425
        slab('Book | individual paper block',x+.002,x+width-.002,yy+.007,yy+depth-.007,z+.005,z+height-.003,PAGES,.0005)
        for xx in (x,x+width-.002):slab('Book | leather board',xx,xx+.002,yy,yy+depth,z+.002,z+height,mat,.0006)
        slab('Book | rounded bound spine',x,x+width,yy-.003,yy+.007,z+.001,z+height,mat,.002)
        for zz in (z+.023,z+.045,z+height-.027):
            slab('Book | raised gilt rib',x+.002,x+width-.002,yy-.004,yy-.003,zz,zz+.0018,BRASS,.0003)
        text('Book | spine title',['BOTANICA','ESSAYS','NOTES','LETTERS','FLORA'][i%5],(x+width/2,yy-.0045,z+height*.63),.007,INK,rotation=(math.pi/2,0,math.pi/2))
        x+=width+RNG.uniform(.003,.008)

# Pressed fern silhouettes are actual small leaf meshes in a framed specimen.
PAPER=paper('Herbarium | old ivory mounting paper',(.53,.47,.34),.12)
FRAME=scan('Herbarium | walnut frame','dark_wood',.3,tint=(.40,.27,.15),bright=.52,sat=.4,rough=(.32,.57),bump=.22)
px,pz=.34,1.39;pw,ph=.60,.32
slab('Herbarium | mounting board',px-pw/2,px+pw/2,.648,.662,pz-ph/2,pz+ph/2,PAPER,.001)
for xx in (px-pw/2-.012,px+pw/2+.012):slab('Herbarium | frame upright',xx-.013,xx+.013,.617,.675,pz-ph/2-.026,pz+ph/2+.026,FRAME,.003)
for zz in (pz-ph/2-.012,pz+ph/2+.012):slab('Herbarium | frame rail',px-pw/2-.024,px+pw/2+.024,.617,.675,zz-.013,zz+.013,FRAME,.003)
LEAF=plain('Herbarium | dry pressed fern',(.075,.10,.035),rough=.93)
for off,lean,height in ((-.19,-.03,.23),(-.03,.018,.25),(.15,.015,.22)):
    x=px+off;zz=pz-ph/2+.034
    rod('Herbarium | fern rachis',(x,.643,zz),(x+lean,.643,zz+height),.00065,LEAF)
    for j in range(12):
        t=.14+j*.066;length=.047*(1-t)*math.sin(t*math.pi)**.4
        for side in (-1,1):
            centre=Vector((x+lean*t,.641,zz+height*t));tip=centre+Vector((side*length,0,.014))
            mid=(centre+tip)/2
            mesh('Herbarium | individual pressed pinna',[centre,mid+Vector((0,0,.006)),tip,mid-Vector((0,0,.005))],[(0,1,2,3)],LEAF)
text('Herbarium | specimen caption','POLYPODIUM    /    HERBARIUM',(px,.642,pz-ph/2+.014),.007,INK)

# Two restrained scanned plants, with no decorative material images invented.
import_model('potted_plant_02',height=.34,at=(.78,.46,DESK),rot=.3)
import_model('fern_02',height=.23,at=(-.41,.55,1.52),rot=-.5)
POT=scan('Fern | aged clay pot','old_sandstone_02',.14,tint=(.38,.22,.13),bright=.62,sat=.45,rough=(.7,.9),bump=.32)
lathe('Fern | turned clay pot',[(0,0),(.037,0),(.046,.072),(.051,.077),(.051,.087),(.044,.087),(.040,.075)],POT,at=(-.41,.55,1.52),steps=48)

# A real banker's lamp: green glass, a cream inner surface and open underside.
lx,ly=-.50,.13
lathe('Lamp | weighted turned brass foot',[(0,0),(.081,0),(.086,.006),(.084,.014),(.073,.022),(.060,.026),(.033,.035),(.025,.049),(.013,.060),(.010,.070),(.010,.39),(0,.39)],BRASS,at=(lx,ly,DESK),steps=96)
for zz,rr in ((DESK+.077,.015),(DESK+.35,.013),(DESK+.375,.016)):
    cylinder('Lamp | turned stem collar',lx,ly,zz,zz+.009,rr,BRASS,verts=48)
rod('Lamp | polished upper support',(lx,ly,DESK+.375),(lx,ly+.025,DESK+.49),.008,BRASS)
rod('Lamp | shade pivot bar',(lx-.185,ly+.025,DESK+.49),(lx+.185,ly+.025,DESK+.49),.007,BRASS)
GREEN=plain('Lamp | deep handblown green glass',(.009,.075,.026),rough=.16,coat=.8,transmission=.12,ior=1.48)
CREAM=plain('Lamp | warm cream inner glass',(.62,.56,.40),rough=.34)
shade_z=DESK+.432
vv=[];ff=[];NX,NA=64,64
for j in range(NX+1):
    u=j/NX;xx=lx+(u-.5)*.35;end=math.sqrt(max(.05,1-((u-.5)*2)**12))
    for i in range(NA+1):
        a=i*math.pi/NA;vv.append((xx,ly+.098*math.cos(a)*end,shade_z+.078*math.sin(a)*end))
for j in range(NX):
    for i in range(NA):a=j*(NA+1)+i;ff.append((a,a+1,a+NA+2,a+NA+1))
shade=mesh('Lamp | continuous open green glass shade',vv,ff,GREEN,True);shade.data.materials.append(CREAM)
solid=shade.modifiers.new('Real glass thickness and cream interior','SOLIDIFY');solid.thickness=.0025;solid.material_offset=1;solid.use_even_offset=True
for side in (-1,1):
    sphere('Lamp | brass shade adjuster',(lx+side*.179,ly+.018,shade_z+.033),.012,BRASS,squash=(.7,1,1))
    rod('Lamp | rolled lower lip',(lx-.174,ly+side*.098,shade_z),(lx+.174,ly+side*.098,shade_z),.0018,BRASS)
BULB=plain('Lamp | warm glowing tube',(.7,.49,.24),emit=(1,.69,.34),strength=3,rough=.28)
rod('Lamp | actual tubular bulb',(lx-.075,ly,shade_z+.013),(lx+.075,ly,shade_z+.013),.008,BULB)
lamp('Lamp | warm pool on walnut','AREA',(lx,ly,shade_z-.006),aim=(lx+.10,ly-.10,DESK),energy=11,colour=(1,.77,.48),size=.19,size_y=.055)
lamp('Lamp | tiny reflected light inside green shade','POINT',(lx,ly,shade_z+.032),energy=.35,colour=(1,.79,.57),size=.018)
chain=[(lx+.145,ly-.065,shade_z-.005-i*.0045) for i in range(21)]
for pt in chain:sphere('Lamp | individual pull-chain bead',pt,.0016,BRASS)
sphere('Lamp | pull-chain weight',(lx+.145,ly-.065,shade_z-.104),.0042,BRASS,squash=(1,1,1.3))

# A shut ledger, pen and one old book give scale without crowding the clues.
LEATHER=scan('Ledger | worn forest-green binding','fabric_leather_02',.24,tint=(.16,.23,.14),bright=.54,sat=.15,rough=(.43,.69),bump=.30)
bx,by=-.49,-.33
slab('Ledger | page block',bx-.112,bx+.112,by-.075,by+.075,DESK+.004,DESK+.022,PAGES,.002)
for zz in (DESK+.001,DESK+.023):slab('Ledger | leather cover',bx-.119,bx+.119,by-.082,by+.082,zz,zz+.003,LEATHER,.002)
text('Ledger | small gilt title','FIELD NOTES',(bx,by,DESK+.0265),.011,BRASS,rotation=(0,0,0))
rod('Pen | black lacquer barrel',(bx+.052,by-.036,DESK+.032),(bx+.18,by-.021,DESK+.032),.0033,FACE)
rod('Pen | brass nib',(bx+.18,by-.021,DESK+.032),(bx+.191,by-.020,DESK+.032),.0033,BRASS,r2=.0003)

# Rounded graphite enclosure, a separate front panel and genuinely open vents.
rx,ry=.12,.035
x0,x1=rx-.205,rx+.205;y0,y1=ry-.105,ry+.105;z0,z1=DESK+.007,DESK+.077
slab('Router | rounded lower enclosure',x0,x1,y0,y1,z0,z0+.047,BLACK,.005)
slab('Router | continuous front fascia',x0+.003,x1-.003,y0-.001,y0+.008,z0+.005,z1-.008,FACE,.0025)
# Top cover is an actual frame surrounding an inset louvred recess.
slab('Router | top front lip',x0,x1,y0,y0+.068,z1-.020,z1,BLACK,.004)
slab('Router | top rear lip',x0,x1,y1-.027,y1,z1-.020,z1,BLACK,.004)
for xx in (x0,x1-.024):slab('Router | top side lip',xx,xx+.024,y0+.061,y1-.022,z1-.020,z1,BLACK,.003)
slab('Router | dark interior under vents',x0+.021,x1-.021,y0+.062,y1-.020,z1-.023,z1-.020,FACE,.001)
for i in range(40):
    xx=x0+.024+i*(.362/40)
    slab('Router | separate moulded vent rib',xx,xx+.0042,y0+.065,y1-.024,z1-.009,z1-.001,BLACK,.001)
for xx in (x0+.035,x1-.035):
    for yy in (y0+.028,y1-.030):
        cylinder('Router | rubber isolating foot',xx,yy,DESK,DESK+.010,.009,RUBBER,verts=32)
        if yy>ry:
            cylinder('Router | rear screw head',xx,yy,z1,z1+.0004,.002,IRON,verts=24)
            slab('Router | screw slot',xx-.0013,xx+.0013,yy-.0003,yy+.0003,z1+.0004,z1+.0005,FACE,.0001)
for side in (-1,1):
    xx=rx+side*.155;yy=y1-.014
    rod('Router | antenna hinge',(xx,yy,z1-.018),(xx,yy,z1+.013),.007,BLACK)
    rod('Router | tapered aerial',(xx,yy,z1+.007),(xx+side*.012,yy+.012,z1+.175),.0052,BLACK,r2=.0037)
    sphere('Router | rounded aerial tip',(xx+side*.012,yy+.012,z1+.175),.0037,BLACK)
# No unused thirteenth lens: five counters, a gap, exactly seven data lights.
leds=[]
xs=[rx-.160+i*.023 for i in range(5)]+[rx-.022+i*.023 for i in range(7)]
for i,xx in enumerate(xs):
    zz=z0+.034
    slab('LED %02d | recessed black bezel'%i,xx-.0058,xx+.0058,y0-.0025,y0-.0008,zz-.0041,zz+.0041,RUBBER,.0017)
    lens_mat=LENS.copy();lens_mat.name='LED %02d | independently driven optical lens'%i
    ob=slab('LED %02d | real translucent diffuser'%i,xx-.0037,xx+.0037,y0-.0031,y0-.0026,zz-.0022,zz+.0022,lens_mat,.0012)
    light=lamp('LED %02d | local reflected light'%i,'POINT',(xx,y0-.007,zz),energy=0,colour=(1,1,1),size=.002)
    leds.append({'material':lens_mat,'light':light,'centre':(xx,y0-.0032,zz),'colour':'red' if i<5 else 'green'})
text('Router | original maker clue','W. LEIBNIZ',(rx,y0-.002,z0+.012),.0095,INK,font=SANS)

# Power and network leads have plugs and natural curves across the desk.
slab('Router | power connector',rx+.165,rx+.181,y1-.003,y1+.014,z0+.020,z0+.033,FACE,.001)
cable('Router | rubber power lead',[(rx+.173,y1+.010,z0+.027),(.44,.25,DESK+.008),(.67,.39,DESK+.005),(.71,.60,.85),(.71,.637,.91)],.0025,RUBBER)
slab('Room | period dark wall outlet',.672,.748,.640,.664,.87,.955,FACE,.004)
slab('Room | moulded power plug',.696,.724,.617,.644,.892,.926,RUBBER,.002)
cable('Router | loose network lead',[(rx-.08,y1,z0+.028),(rx-.08,y1+.037,DESK+.014),(.05,.30,DESK+.004),(.38,.40,DESK+.004),(.63,.31,DESK+.004),(.70,.17,DESK+.004)],.0022,RUBBER)

world=bpy.data.worlds.new('Room | faint photographed night bounce');world.use_nodes=True;scene.world=world
n=world.node_tree.nodes;l=world.node_tree.links.new;env=n.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load('C:/Users/crist/Tools/render/assets/hdri/moonlit_golf.hdr')
l(env.outputs[0],n['Background'].inputs['Color']);n['Background'].inputs['Strength'].default_value=.08
lamp('Room | cool light reflected from unseen window','AREA',(.85,-.35,1.75),aim=(0,.2,.93),energy=5.0,colour=(.58,.73,1),size=1.3)
lamp('Room | restrained warm bounce behind camera','AREA',(-.2,-1.25,1.55),aim=(0,.2,1.0),energy=7.5,colour=(1,.82,.63),size=1.5)

cam_data=bpy.data.cameras.new('Camera | observer at the desk');cam_data.lens=42;cam_data.sensor_width=36;cam_data.sensor_fit='HORIZONTAL';cam_data.clip_end=30
cam=link(bpy.data.objects.new('Camera',cam_data));cam.location=(0,-1.80,1.11);cam.rotation_euler=(Vector((.015,.15,1.025))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
cycles(scene,SAMPLES,W,H,exposure=.15,glare=False)
scene.cycles.max_bounces=10;scene.cycles.adaptive_threshold=.006;scene.cycles.seed=1121961
scene.render.use_persistent_data=True;scene.render.image_settings.color_depth='16'
if '--cpu' in sys.argv:scene.cycles.device='CPU'
cam_data.dof.use_dof=True;cam_data.dof.focus_distance=(Vector((rx,y0,z0+.035))-cam.location).length;cam_data.dof.aperture_fstop=7.1;cam_data.dof.aperture_blades=8
clear_glass();bpy.context.view_layer.update()
def project(co):
    p=world_to_camera_view(scene,cam,Vector(co));return [round(p.x*W,4),round((1-p.y)*H,4)]
metadata={'version':1,'width':W,'height':H,'leds':[{'centre':project(e['centre']),'colour':e['colour']} for e in leds],
          'lamp':{'centre':project((lx,ly,shade_z-.04)),'radius':H*.12}}
points=[project((x,y0,z)) for x in (x0-.03,x1+.03) for z in (z0-.03,z1+.05)]
metadata['safe']=[min(p[0] for p in points),min(p[1] for p in points),max(p[0] for p in points)-min(p[0] for p in points),max(p[1] for p in points)-min(p[1] for p in points)]
if '--pack' in sys.argv:bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'router-room.blend'),compress=True)

def render(name):
    scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True);print('MODEM_RENDERED',name,flush=True)
render('room')
if PREVIEW:
    # A lit preview makes the optical scale and table reflections reviewable.
    for i in (0,5,8,11):
        e=leds[i];colour=(1,.025,.006) if i<5 else (.025,1,.14)
        b=e['material'].node_tree.nodes['Principled BSDF'];b.inputs['Emission Color'].default_value=(*colour,1);b.inputs['Emission Strength'].default_value=3.5
        e['light'].data.color=colour;e['light'].data.energy=.003
    render('lit-preview')
else:
    # Crop each light's optical/reflected contribution; all states use the
    # same seed, camera and sample budget as the base, avoiding noisy deltas.
    scene.render.use_border=True;scene.render.use_crop_to_border=True
    for i,e in enumerate(leds):
        colour=(1,.025,.006) if i<5 else (.025,1,.14)
        b=e['material'].node_tree.nodes['Principled BSDF'];b.inputs['Emission Color'].default_value=(*colour,1);b.inputs['Emission Strength'].default_value=3.5
        e['light'].data.color=colour;e['light'].data.energy=.003
        cx,cy=e['centre2d']=metadata['leds'][i]['centre'];hw=W*.013;above=H*.027;below=H*.12
        xa,xb=max(0,math.floor(cx-hw)),min(W,math.ceil(cx+hw));ya,yb=max(0,math.floor(cy-above)),min(H,math.ceil(cy+below))
        scene.render.border_min_x=(xa+.25)/W;scene.render.border_max_x=min(1,(xb+.25)/W)
        scene.render.border_min_y=(H-yb+.25)/H;scene.render.border_max_y=min(1,(H-ya+.25)/H)
        metadata['leds'][i]['crop']={'x':xa,'y':ya,'width':xb-xa,'height':yb-ya}
        render('led-%02d'%i)
        b.inputs['Emission Strength'].default_value=0;e['light'].data.energy=0
    scene.render.use_border=False;scene.render.use_crop_to_border=False
(OUT/'nativeModem.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
print('MODEM_DONE',flush=True)
