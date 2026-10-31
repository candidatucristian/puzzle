"""The Captain's Cabin: an original miniature study inside an old glass bottle.

Real Cycles glass, wood, brass, cotton paper and cork. The small changing
needle region is rendered THROUGH the same bottle, not pasted on top of it.
blender -b -P art/blender/captains_bottle.py -- --width 2560 --samples 256 --pack
"""
import bpy,bmesh,math,random,json,sys
from pathlib import Path
from mathutils import Vector,Matrix
from bpy_extras.object_utils import world_to_camera_view
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from kit import arg,fresh,link,box,bevel,lathe,cylinder,sphere,plain,aged_metal,lamp,cycles
from hall_common import scan
ROOT=HERE.parents[1]
OUT=ROOT/'.artifacts/captains-bottle';OUT.mkdir(parents=True,exist_ok=True)
WIDTH=int(arg('--width','2560'));HEIGHT=round(WIDTH/1.6)
SAMPLES=int(arg('--samples','256'));PREVIEW='--preview' in sys.argv
RNG=random.Random(19610303)
scene=fresh();scene.name='The Captain’s Cabin | hand-built study in a bottle | Cycles'
scene['no_ai_generated_images']=True
scene['provenance']='Original miniature geometry; existing Poly Haven CC0 material scans; original chart and compass artwork.'

def slab(name,bounds,mat,r=.0008):
    o=box(name,*bounds,mat)
    if r:bevel(o,r,3)
    return o

def mesh(name,verts,faces,mat,smooth=False):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
    o=link(bpy.data.objects.new(name,data));data.materials.append(mat)
    for p in data.polygons:p.use_smooth=smooth
    return o

def wire(name,coords,r,mat,closed=False):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=r;data.bevel_resolution=3;data.use_fill_caps=True
    sp=data.splines.new('POLY');sp.points.add(len(coords)-1);sp.use_cyclic_u=closed
    for p,co in zip(sp.points,coords):p.co=(*co,1)
    o=link(bpy.data.objects.new(name,data));data.materials.append(mat);return o

def rod(name,a,b,r,mat):
    o=cylinder(name,0,0,0,(Vector(b)-Vector(a)).length,r,mat,verts=24)
    o.location=a;o.rotation_euler=(Vector(b)-Vector(a)).to_track_quat('Z','Y').to_euler();return o

def ring(name,at,r,thick,mat,rotation=(0,0,0)):
    o=lathe(name,[(r+thick*math.cos(i*math.tau/16),thick*math.sin(i*math.tau/16)) for i in range(17)],mat,at=at,steps=96)
    o.rotation_euler=rotation;return o

def scanned(name,id,size,tint,bright=.75,rough=(.48,.72),bump=.22):
    mat=scan(name,id,size=size,tint=tint,bright=bright,sat=.62,rough=rough,bump=bump,coat=0,vary=.06)
    for n in mat.node_tree.nodes:
        if n.type=='AMBIENT_OCCLUSION':n.inputs['Distance'].default_value=.008
        if n.type=='BUMP':n.inputs['Distance'].default_value=.00009
    return mat

def metal(name,colour,patina):
    mat=aged_metal(name,colour,patina,rough=(.32,.58),scale=480,tarnish=.42)
    for n in mat.node_tree.nodes:
        if n.type=='BUMP':n.inputs['Distance'].default_value=.000012
        if n.type=='AMBIENT_OCCLUSION':n.inputs['Distance'].default_value=.003
    return mat

def organic(name,lo,hi,scale,relief,rough):
    mat=plain(name,lo,rough);n=mat.node_tree.nodes;l=mat.node_tree.links.new;b=n['Principled BSDF']
    tc=n.new('ShaderNodeTexCoord');noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=scale;noise.inputs['Detail'].default_value=5
    l(tc.outputs['Object'],noise.inputs[0]);r=n.new('ShaderNodeValToRGB');r.color_ramp.elements[0].color=(*lo,1);r.color_ramp.elements[1].color=(*hi,1)
    l(noise.outputs['Fac'],r.inputs[0]);l(r.outputs[0],b.inputs['Base Color'])
    bp=n.new('ShaderNodeBump');bp.inputs['Strength'].default_value=.20;bp.inputs['Distance'].default_value=relief
    l(noise.outputs['Fac'],bp.inputs['Height']);l(bp.outputs[0],b.inputs['Normal']);return mat

def print_material(name,file,colour=(.65,.58,.44),rough=.92):
    mat=organic(name,tuple(v*.81 for v in colour),colour,1800,.000018,rough)
    n=mat.node_tree.nodes;l=mat.node_tree.links.new;b=n['Principled BSDF'];tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(OUT/file));tex.interpolation='Linear'
    l(tex.outputs['Color'],b.inputs['Base Color']);b.inputs['Specular IOR Level'].default_value=.20
    return mat

def card(name,corners,mat):
    o=mesh(name,corners,[(0,1,2,3)],mat)
    uv=o.data.uv_layers.new(name='Printed face')
    for p in o.data.polygons:
        for li,co in zip(p.loop_indices,[(0,0),(1,0),(1,1),(0,1)]):uv.data[li].uv=co
    return o

def group(name,at=(0,0,0)):
    o=link(bpy.data.objects.new(name,None));o.location=at;return o

def parent_new(before,parent):
    for o in list(scene.objects):
        if o not in before and o!=parent and o.parent is None:o.parent=parent

SERIF=bpy.data.fonts.load('C:/Windows/Fonts/georgia.ttf')
def text(name,body,at,size,mat,rotation=(math.pi/2,0,0)):
    d=bpy.data.curves.new(name,'FONT');d.body=body;d.font=SERIF;d.size=size;d.align_x='CENTER';d.align_y='CENTER';d.extrude=.000025
    o=link(bpy.data.objects.new(name,d));o.location=at;o.rotation_euler=rotation;d.materials.append(mat);return o

WALNUT=scanned('Cabin | hand-rubbed old walnut','rosewood_veneer1',.075,(.63,.43,.28),.66,(.39,.64))
OAK=scanned('Desk | worn quarter-sawn oak','dark_wood',.45,(.73,.57,.39),.72,(.48,.70),.30)
TEAK=scanned('Miniature | individually laid teak boards','wood_floor_worn',.16,(.72,.56,.36),.80,(.54,.75))
LEATHER=scanned('Captain | rubbed oxblood leather','brown_leather',.04,(.46,.15,.10),.64,(.60,.82))
BRASS=metal('Compass | softly rubbed aged brass',(.55,.39,.18),(.10,.073,.036))
DARK_BRASS=metal('Fittings | oxidised brass recesses',(.24,.19,.09),(.055,.048,.025))
IRON=metal('Needle | blued tempered steel',(.055,.085,.105),(.014,.021,.029))
RED=organic('Needle | old vermilion enamel',(.19,.017,.010),(.37,.046,.025),2200,.000008,.49)
IVORY=organic('Paper | cotton rag, quiet fine fibres',(.53,.46,.32),(.76,.69,.53),2400,.000015,.93)
INK=plain('Marks | faded iron-gall ink',(.045,.031,.017),.94)
CORK=organic('Bottle | naturally pitted old cork',(.12,.069,.027),(.40,.27,.11),420,.00034,.89)
ROPE=organic('Cord | old natural linen',(.31,.25,.15),(.52,.43,.27),2300,.000025,.94)
NAVY=organic('Books | faded blue cloth',(.018,.041,.050),(.061,.093,.10),3000,.000015,.91)
WAX=organic('Seal | dark red old wax',(.09,.009,.005),(.23,.025,.013),1200,.000015,.50)
MAP=print_material('Map | printed original captain’s chart','chart.png')
DIAL=print_material('Compass | original ruled ivory card','dial.png',(.76,.71,.58))

def bottle_glass():
    mat=plain('Bottle | thick, faint green hand-blown glass',(.93,.98,.96),rough=.045,transmission=1,ior=1.475)
    n=mat.node_tree.nodes;l=mat.node_tree.links.new;b=n['Principled BSDF'];out=n.get('Material Output')
    tc=n.new('ShaderNodeTexCoord');nz=n.new('ShaderNodeTexNoise');nz.inputs['Scale'].default_value=1250;nz.inputs['Detail'].default_value=3
    l(tc.outputs['Object'],nz.inputs[0]);bp=n.new('ShaderNodeBump');bp.inputs['Distance'].default_value=.000008;bp.inputs['Strength'].default_value=.10
    l(nz.outputs['Fac'],bp.inputs['Height']);l(bp.outputs[0],b.inputs['Normal'])
    # Transparent shadow rays prevent the decorative shell from making the
    # entire miniature black when refractive caustics are disabled.
    lp=n.new('ShaderNodeLightPath');tr=n.new('ShaderNodeBsdfTransparent');tr.inputs[0].default_value=(.92,.97,.94,1)
    mix=n.new('ShaderNodeMixShader');l(lp.outputs['Is Shadow Ray'],mix.inputs[0]);l(b.outputs[0],mix.inputs[1]);l(tr.outputs[0],mix.inputs[2]);l(mix.outputs[0],out.inputs['Surface'])
    return mat
GLASS=bottle_glass()

# The photographic eye, looking slightly down at a large antique display bottle.
cd=bpy.data.cameras.new('Eye | macro lens at the manor writing desk');cd.lens=42;cd.sensor_width=36;cd.sensor_fit='HORIZONTAL';cd.clip_start=.01;cd.clip_end=40
cam=link(bpy.data.objects.new('Eye',cd));cam.location=(.065,-1.08,.49)
cam.rotation_euler=(Vector((.015,0,.16))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
cd.dof.use_dof=True;cd.dof.focus_distance=(cam.location-Vector((-.045,-.005,.19))).length;cd.dof.aperture_fstop=11

# Outside the bottle: a real table, cradle joinery, rubbed cork and loose cord.
for j in range(5):
    y=-.48+j*.26
    slab('Desk | separate oak board',(-1.4,1.4,y,y+.258,-.045,-.012),OAK,.002)
for x in (-.23,.13):
    slab('Cradle | solid walnut foot',(x-.035,x+.035,-.112,.112,-.012,.006),WALNUT,.003)
    verts=[];segments=64
    for xx in (x-.025,x+.025):
        for radius in (.141,.164):
            for i in range(segments+1):
                a=-.76+i*1.52/segments;verts.append((xx,radius*math.sin(a),.156-radius*math.cos(a)))
    faces=[];N=segments+1
    for i in range(segments):
        faces.extend([(i,i+1,2*N+i+1,2*N+i),(N+i,N+i+1,3*N+i+1,3*N+i),
                      (i,i+1,N+i+1,N+i),(2*N+i,2*N+i+1,3*N+i+1,3*N+i)])
    faces.extend([(0,N,3*N,2*N),(segments,N+segments,3*N+segments,2*N+segments)])
    saddle=mesh('Cradle | concave carved walnut saddle',verts,faces,WALNUT,True);bevel(saddle,.001,3)
    for side in (-1,1):
        rod('Cradle | fitted brass retaining pin',(x-.026,side*.085,.024),(x+.026,side*.085,.024),.0017,DARK_BRASS)

profile=[(0,-.344),(.090,-.344),(.116,-.336),(.132,-.318),(.139,-.293),(.140,-.265),(.140,.105),(.134,.151),(.114,.192),(.075,.231),(.044,.263),(.035,.291),(.034,.354),(.039,.361),(.040,.371),(.037,.383),(.028,.386),(.027,.374),(.028,.366),(.029,.293),(.039,.266),(.070,.236),(.108,.195),(.128,.153),(.134,.105),(.134,-.265),(.133,-.290),(.125,-.310),(.109,-.326),(.085,-.332),(0,-.332)]
bottle=lathe('Bottle | continuous thick-walled blown glass',profile,GLASS,steps=192)
bottle.rotation_euler.y=math.pi/2;bottle.location=(0,0,.156)
for v in bottle.data.vertices:
    a=math.atan2(v.co.y,v.co.x);r=math.hypot(v.co.x,v.co.y)
    if r>.045:
        k=1+.0011*math.sin(3*a+v.co.z*21)+.00045*math.sin(11*a-v.co.z*39);v.co.x*=k;v.co.y*=k
for x,r in ((.363,.038),(.375,.038)):
    ring('Bottle | softly rolled old glass lip',(x,0,.156),r,.002,GLASS,(0,math.pi/2,0))
cork=lathe('Cork | slightly compressed old stopper',[(0,0),(.026,0),(.028,.010),(.029,.042),(.028,.047),(0,.047)],CORK,steps=96)
cork.rotation_euler.y=math.pi/2;cork.location=(.367,0,.156)
for j in range(45):
    a=RNG.random()*math.tau;x=RNG.uniform(.385,.412);r=.0289
    sphere('Cork | tiny dark natural pore',(x,math.cos(a)*r,.156+math.sin(a)*r),RNG.uniform(.0003,.0008),INK,squash=(1,.45,.65))
for j in range(4):
    x=.348+j*.0014
    ring('Bottle | linen cord round the neck',(x,0,.156),.036,.00055,ROPE,(0,math.pi/2,0))
wire('Bottle | loosely tied linen tail',[(.352,-.033,.145),(.355,-.046,.120),(.370,-.049,.099),(.382,-.044,.087)],.0007,ROPE)
# Tiny trapped bubbles remain in the glass wall, away from the clue faces.
for j in range(14):
    x=RNG.uniform(-.29,.17);a=RNG.choice([-.55,.38,2.35])+RNG.uniform(-.12,.12)
    y=.137*math.sin(a);z=.156+.137*math.cos(a)
    o=sphere('Bottle | small trapped glassmaking bubble',(x,y,z),RNG.uniform(.0005,.0012),GLASS,squash=(1.7,.5,.7))

# The interior is a miniature room, with a cutaway front, not a ship or sea.
for y in (-.034,.034):slab('Cabin | bearer resting inside the bottle',(-.274,.105,y-.004,y+.004,.0272,.059),WALNUT,.001)
for i in range(17):
    x=-.285+i*.025
    slab('Cabin | individual teak floorboard',(x,x+.0244,-.086,.085,.059,.065),TEAK,.0004)
    for y in (-.070,.066):
        cylinder('Cabin | tiny dark floorboard nail',x+.004,y,.065,.0652,.00035,IRON,verts=12)
for i in range(21):
    x=-.286+i*.020
    slab('Cabin | vertical walnut lining',(x,x+.0195,.080,.087,.065,.251),WALNUT,.0005)
for z in (.076,.158,.245):slab('Cabin | raised panel moulding',(-.289,.138,.076,.088,z,z+.004),WALNUT,.0005)
for x in (-.289,-.105,.136):
    slab('Cabin | pegged oak upright',(x-.004,x+.004,.071,.091,.064,.257),TEAK,.0009)
    for z in (.090,.225):cylinder('Cabin | wooden dowel end',x,.069,z,z+.001,.0009,WALNUT,verts=16)
for x in (-.275,.132):
    wire('Cabin | bent timber roof rib',[(x,.128*math.sin(a),.156+.128*math.cos(a)) for a in [-.55+i*1.80/64 for i in range(65)]],.004,WALNUT)
slab('Cabin | small ceiling beam',(-.286,.139,.045,.061,.260,.267),WALNUT,.001)

# Fitted cupboard and the captain's old cloth and leather books.
slab('Cupboard | back',(-.273,-.190,.057,.077,.068,.210),WALNUT)
for z in (.071,.116,.160,.207):slab('Cupboard | shelf',(-.277,-.188,.026,.080,z,z+.004),WALNUT)
for x in (-.275,-.192):slab('Cupboard | side',(x,x+.004,.026,.080,.069,.211),WALNUT)
for row,z in enumerate((.076,.121,.165)):
    for i in range(6):
        x=-.266+i*.0112;h=RNG.uniform(.026,.036);m=LEATHER if (i+row)%3 else NAVY
        slab('Books | worn individual bound volume',(x,x+.008,.032,.065,z,z+h),m,.0004)
        for dz in (.005,h-.005):slab('Books | subtle gilt spine band',(x,x+.008,.0313,.032,z+dz,z+dz+.0005),DARK_BRASS,.0001)

# A genuine miniature chart desk with dovetailed drawers and turned legs.
TX,TY,TZ=-.066,-.010,.112
slab('Desk | single walnut writing top',(TX-.128,TX+.128,TY-.066,TY+.061,TZ-.007,TZ),WALNUT,.002)
for x in (TX-.105,TX+.105):
    for y in (TY-.048,TY+.043):
        lathe('Desk | individually turned leg',[(.004,0),(.004,.004),(.003,.010),(.003,.033),(.005,.038),(.005,.044)],WALNUT,at=(x,y,.065),steps=32)
slab('Desk | small drawer front',(TX-.113,TX+.113,TY-.065,TY-.061,TZ-.025,TZ-.008),WALNUT,.0007)
for x in (TX-.057,TX+.057):
    sphere('Desk | brass drawer pull',(x,TY-.067,TZ-.016),.0018,BRASS,squash=(1,.6,1))
    ring('Desk | hanging miniature pull ring',(x,TY-.068,TZ-.019),.003,.0005,BRASS,(math.pi/2,0,0))

# The sealed map, wholly inside the glass, remains the player's clue target.
MX,MY=-.108,-.044
envelope_corners=[(MX-.042,MY-.023,TZ+.001),(MX+.042,MY-.023,TZ+.001),(MX+.042,MY+.023,TZ+.001),(MX-.042,MY+.023,TZ+.001)]
env=mesh('Map | folded rag-paper envelope',envelope_corners,[(0,1,2,3)],IVORY)
s=env.modifiers.new('Real folded paper thickness','SOLIDIFY');s.thickness=.0007;bevel(env,.00045,3)
mesh('Map | triangular folded flap',[(MX-.041,MY+.022,TZ+.002),(MX,MY-.010,TZ+.0025),(MX+.041,MY+.022,TZ+.002)],[(0,1,2)],IVORY)
for side in (-1,1):wire('Map | folded side seam',[(MX+side*.041,MY-.021,TZ+.002),(MX,MY+.006,TZ+.0022)],.00012,DARK_BRASS)
seal=sphere('Map | wax seal',(MX,MY-.006,TZ+.0032),.0053,WAX,squash=(1,.92,.22))
text('Map | tiny pressed seal initial','A',(MX,MY-.006,TZ+.0045),.005,DARK_BRASS,rotation=(0,0,0))
rod('Desk | quill shaft',(TX+.048,TY-.038,TZ+.002),(TX+.106,TY+.004,TZ+.003),.0007,IVORY)
for i in range(18):
    x=TX+.052+i*.0022;y=TY-.035+i*.0016
    wire('Desk | fine quill vane',[(x,y,TZ+.003),(x-.003,y+.007,TZ+.004)],.00015,IVORY)
lathe('Desk | little stoppered inkpot',[(0,0),(.007,0),(.008,.004),(.006,.010),(.003,.012),(.003,.016),(0,.016)],DARK_BRASS,at=(TX+.098,TY+.032,TZ),steps=48)

# The compass is a real frontal instrument. Its changing needle is included
# in the cropped Cycles renders, so glass, contact shadow and refraction agree.
CC=Vector((-.042,-.006,.198));R=.046
before=set(scene.objects);compass=group('Compass | complete gimballed brass instrument',CC)
compass.rotation_euler=cam.rotation_euler
lathe('Compass | deep aged-brass bowl',[(0,-.010),(.042,-.010),(.049,-.006),(.051,0),(.050,.004),(.046,.006),(.045,.004),(0,.004)],BRASS,steps=160)
for radius,thick,z in ((.050,.0015,.003),(.0465,.0007,.006),(.053,.0012,-.002)):
    ring('Compass | individually machined circular bead',(0,0,z),radius,thick,BRASS)
disc=mesh('Compass | fine original printed scale',[(0,0,.0042)]+[(R*math.cos(i*math.tau/160),R*math.sin(i*math.tau/160),.0042) for i in range(160)],[(0,i+1,(i+1)%160+1) for i in range(160)],DIAL)
uv=disc.data.uv_layers.new(name='Circular printed scale')
for p in disc.data.polygons:
    for li in p.loop_indices:
        co=disc.data.vertices[disc.data.loops[li].vertex_index].co;uv.data[li].uv=(.5+co.x/(2*R),.5+co.y/(2*R))
# A circular mask hides the square printing at the rim, with real depth.
lathe('Compass | inner annular lip',[(R,0),(.050,0),(.050,.003),(R,.003),(R,0)],BRASS,at=(0,0,.0045),steps=160)
for side in (-1,1):
    rod('Compass | horizontal gimbal pivot',(side*.050,0,-.002),(side*.058,0,-.002),.0018,BRASS)
    slab('Compass | small pivot block',(side*.057-.003,side*.057+.003,-.006,.006,-.004,.001),DARK_BRASS,.0006)
    sphere('Compass | pivot screw',(side*.061,0,-.001),.002,BRASS)
parent_new(before,compass)
before=set(scene.objects);needle=group('Compass | moving needle');needle.parent=compass;needle.location=(0,0,.0064)
def blade(name,points,mat):
    o=mesh(name,[(x,y,z) for z in (0,.00045) for x,y in points],[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],mat)
    bevel(o,.00012,2);return o
blade('Needle | vermilion north blade',[(-.0034,0),(0,R*.86),(.0034,0)],RED)
blade('Needle | blued steel south blade',[(.0034,0),(0,-R*.75),(-.0034,0)],IRON)
lathe('Needle | turned brass centre cap',[(0,0),(.0034,0),(.0036,.001),(.003,.0018),(0,.002)],BRASS,steps=64)
parent_new(before,needle)
needle_objects=list(needle.children_recursive)
rod('Compass | stand stem',(-.042,.020,TZ),(-.042,.020,.144),.003,BRASS)
lathe('Compass | turned stand foot',[(0,0),(.014,0),(.015,.002),(.011,.004),(.004,.007),(0,.007)],BRASS,at=(-.042,.020,TZ),steps=64)
wire('Compass | upper brass suspension',[(CC.x,.015,.251),(CC.x,.015,.265)],.0011,DARK_BRASS)

# A small hanging oil lantern. Broad warm light lives inside the model.
LX,LY,LZ=.094,.026,.209
lathe('Lantern | pierced brass base',[(0,0),(.013,0),(.015,.002),(.014,.005),(.010,.007),(0,.007)],BRASS,at=(LX,LY,LZ-.035),steps=64)
lathe('Lantern | brass hood',[(0,0),(.009,0),(.015,.005),(.014,.009),(.008,.011),(.004,.015),(0,.016)],BRASS,at=(LX,LY,LZ+.002),steps=64)
for a in (0,math.pi/2,math.pi,math.pi*1.5):
    x=LX+.010*math.cos(a);y=LY+.010*math.sin(a)
    rod('Lantern | protective brass cage',(x,y,LZ-.028),(x,y,LZ+.006),.0008,BRASS)
lantern_glass=lathe('Lantern | slightly smoked glass chimney',[(.009,0),(.011,.006),(.010,.025),(.008,.030),(.007,.030),(.009,.025),(.010,.006),(.008,0)],GLASS,at=(LX,LY,LZ-.029),steps=64)
FIRE=plain('Flame | warm wick light',(.96,.53,.13),rough=.65,emit=(1,.45,.10),strength=4)
flame=sphere('Lantern | small actual luminous flame',(LX,LY,LZ-.015),.0038,FIRE,squash=(.43,.43,1.75))
wire('Lantern | hanging loop',[(LX+.009*math.cos(a),LY,LZ+.022+.009*math.sin(a)) for a in [i*math.tau/64 for i in range(65)]],.0007,BRASS)
rod('Lantern | short brass hanger',(LX,LY,LZ+.031),(LX,LY,.268),.0007,DARK_BRASS)
lamp('Lantern | warm light within the bottle','POINT',(LX,LY,LZ-.014),energy=.10,colour=(1,.63,.28),size=.008)

# Other genuinely modeled miniature belongings establish the diorama scale.
GX,GY,GZ=.112,-.035,.113
lathe('Globe | turned pedestal',[(0,0),(.018,0),(.019,.003),(.010,.007),(.004,.013),(.004,.025),(0,.025)],WALNUT,at=(GX,GY,.065),steps=64)
GLOBE=organic('Globe | faded blue-green enamel',(.075,.13,.14),(.17,.23,.22),1700,.00001,.74)
sphere('Globe | little painted terrestrial globe',(GX,GY,GZ),.024,GLOBE)
for a in range(-60,61,30):
    aa=math.radians(a);rr=.0241*math.cos(aa);z=GZ+.0241*math.sin(aa)
    ring('Globe | fine latitude line',(GX,GY,z),rr,.00016,DARK_BRASS)
ring('Globe | heavy meridian cradle',(GX,GY,GZ),.027,.001,BRASS,(math.pi/2,0,.25))
CX,CY=.089,.048
for x in (CX-.014,CX+.014):
    for y in (CY-.013,CY+.013):
        rod('Chair | slender walnut leg',(x,y,.065),(x,y,.095),.0018,WALNUT)
slab('Chair | upholstered blue seat',(CX-.019,CX+.019,CY-.017,CY+.017,.095,.100),NAVY,.002)
for x in (CX-.017,CX+.017):rod('Chair | carved back upright',(x,CY+.015,.095),(x,CY+.017,.160),.0018,WALNUT)
slab('Chair | small curved back panel',(CX-.017,CX+.017,CY+.014,CY+.019,.127,.157),WALNUT,.002)
for x in (CX-.020,CX+.020):
    rod('Chair | little arm support',(x,CY-.010,.098),(x,CY-.010,.119),.0012,BRASS)
    rod('Chair | rubbed walnut armrest',(x,CY-.014,.121),(x,CY+.015,.121),.002,WALNUT)
for j in range(4):
    r=.014-j*.0014;z=.068+j*.0015
    wire('Cabin | coiled linen rope',[(.088+r*math.cos(i*math.tau/80),-.068+r*math.sin(i*math.tau/80),z) for i in range(81)],.001,ROPE)
# A small wall clock, not a window onto an external sea.
before=set(scene.objects);clock=group('Cabin | brass wall clock',(.102,.071,.208));clock.rotation_euler=(math.pi/2,0,0)
lathe('Clock | raised circular brass frame',[(0,0),(.017,0),(.018,.002),(.017,.005),(.014,.006),(0,.006)],BRASS,steps=80)
cylinder('Clock | ivory face',0,0,.006,.0062,.0136,IVORY,verts=64)
rod('Clock | minute hand',(0,0,.0067),(.001,.010,.0067),.0003,INK)
rod('Clock | hour hand',(0,0,.0069),(-.006,-.003,.0069),.0004,INK)
parent_new(before,clock)

# Warm lamp from outside the picture, cool broad window and subtle reflected
# light. Large sources make glass highlights soft instead of mirror-like.
key_light=lamp('Studio | warm desk lamp','AREA',(-.42,-.20,.72),aim=(0,0,.10),energy=5.5,colour=(1,.77,.51),size=.36,size_y=.48)
key_light.visible_glossy=False;key_light.data.specular_factor=0
window_light=lamp('Studio | cool tall window reflection','AREA',(.26,.20,.64),aim=(0,0,.16),energy=5.0,colour=(.65,.79,1),size=.085,size_y=.40)
fill_light=lamp('Studio | dim long front fill','AREA',(-.08,-.75,.38),aim=(0,0,.14),energy=1.6,colour=(.91,.91,.84),size=.65,size_y=.22)
fill_light.visible_glossy=False;fill_light.data.specular_factor=0
for light in (key_light,window_light,fill_light):
    light.visible_camera=False;light.visible_transmission=False
world=bpy.data.worlds.new('The manor | night');world.use_nodes=True;scene.world=world
world.node_tree.nodes['Background'].inputs[0].default_value=(.065,.081,.10,1);world.node_tree.nodes['Background'].inputs[1].default_value=.20

cycles(scene,SAMPLES,WIDTH,HEIGHT,exposure=.12,glare=False)
if '--cpu' in sys.argv:scene.cycles.device='CPU'
scene.cycles.max_bounces=14;scene.cycles.transmission_bounces=10;scene.cycles.glossy_bounces=6
scene.cycles.adaptive_threshold=.009;scene.render.use_persistent_data=True
scene.render.image_settings.color_mode='RGB';scene.render.image_settings.color_depth='8'
scene.cycles.seed=33031961

def project(co):
    p=world_to_camera_view(scene,cam,Vector(co));return [round(p.x*WIDTH,3),round((1-p.y)*HEIGHT,3)]
bpy.context.view_layer.update()
centre=project(compass.matrix_world@Vector((0,0,.006)))
edge=project(compass.matrix_world@Vector((R,0,.006)))
radius=math.dist(centre,edge)
tile=math.ceil((radius*2.75+12)/2)*2
left=round(centre[0]-tile/2);top=round(centre[1]-tile/2)
layout={'version':1,'width':WIDTH,'height':HEIGHT,'compass':{'centre':centre,'radius':round(radius,3)},
        'map':{'quad':[project(p) for p in envelope_corners]},'lantern':{'flame':project((LX,LY,LZ-.015))},
        'needle':{'count':72,'step':5,'columns':9,'tile':tile,'crop':[left,top,tile,tile]}}
(OUT/'nativeBottle.json').write_text(json.dumps(layout,indent=1)+'\n',encoding='utf-8')
if '--pack' in sys.argv:bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'captains-bottle.blend'),compress=True)

scene.render.filepath=str(OUT/'room.png');bpy.ops.render.render(write_still=True)
if PREVIEW:
    print('CAPTAIN_BOTTLE_PREVIEW',OUT,flush=True);sys.exit(0)

# Each needle pose is a small, opaque crop of the REAL full scene. It includes
# precisely the same surrounding glass refraction as the base photograph.
scene.render.use_border=True;scene.render.use_crop_to_border=True
scene.render.border_min_x=left/WIDTH;scene.render.border_max_x=(left+tile)/WIDTH
scene.render.border_min_y=1-(top+tile)/HEIGHT;scene.render.border_max_y=1-top/HEIGHT
scene.cycles.samples=96;scene.cycles.adaptive_threshold=.012
for index in range(72):
    needle.rotation_euler.z=-math.radians(index*5)
    scene.render.filepath=str(OUT/f'needle-{index:03d}.png');bpy.ops.render.render(write_still=True)
    print('CAPTAIN_BOTTLE_NEEDLE',index,flush=True)

# A separate native, tactile chart for inspection. Same paper and artwork;
# all text and bearings are baked into real lit paper, never an answer word.
scene.render.use_border=False;scene.render.use_crop_to_border=False
for o in list(scene.objects):
    if o.type not in ('CAMERA','LIGHT'):o.hide_render=True
for o in list(scene.objects):
    if o.type=='LIGHT':o.hide_render=True
PW,PH=.28,.175
paper_card=card('Inspection | original cotton-paper chart',[(-PW/2,-PH/2,0),(PW/2,-PH/2,0),(PW/2,PH/2,0),(-PW/2,PH/2,0)],MAP)
sub=paper_card.modifiers.new('Soft paper tessellation','SUBSURF');sub.subdivision_type='SIMPLE';sub.levels=sub.render_levels=5
bpy.context.view_layer.objects.active=paper_card;bpy.ops.object.modifier_apply(modifier=sub.name)
for v in paper_card.data.vertices:
    x,y=v.co.x,v.co.y;edge=(abs(x)/(PW/2))**10+(abs(y)/(PH/2))**10
    v.co.z=.0003*math.sin(x*190+y*90)*min(1,edge)+.00018*math.cos(x*320-y*70)
solid=paper_card.modifiers.new('Real cotton rag thickness','SOLIDIFY');solid.thickness=.00025
cam.location=(0,0,.5);cam.rotation_euler=(0,0,0);cd.type='ORTHO';cd.ortho_scale=PW*1.08;cd.dof.use_dof=False
lamp('Inspection | broad soft warm light','AREA',(-.16,-.10,.32),aim=(0,0,0),energy=2.4,colour=(1,.89,.70),size=.25)
scene.render.resolution_x=2560;scene.render.resolution_y=1600;scene.cycles.samples=192
scene.render.film_transparent=False;scene.render.filepath=str(OUT/'map.png');bpy.ops.render.render(write_still=True)
print('CAPTAIN_BOTTLE_COMPLETE',OUT,flush=True)
