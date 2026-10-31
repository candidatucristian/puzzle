"""His Cot / Room VI 03: original, editable nursery in Blender/Cycles.

The five clue toys remain live meshes in the game. Everything they rest on
is modeled here at the same scale and through the same camera. No generated
photographs or cutout toy atlases are used by this level.

blender -b -P art/blender/his_cot.py -- --width 2560 --samples 384 --pack
node art/blender/his_cot_publish.mjs
"""
import bpy, bmesh, math, random, json, sys
from pathlib import Path
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from kit import arg,fresh,link,box,bevel,lathe,cylinder,sphere,plain,aged_metal,lamp,cycles
from hall_common import scan

ROOT=HERE.parents[1]
OUT=Path(arg('--out',str(ROOT/'.artifacts/his-cot-native'))).resolve()
OUT.mkdir(parents=True,exist_ok=True)
WIDTH=int(arg('--width','2560'));HEIGHT=round(WIDTH/1.6)
SAMPLES=int(arg('--samples','384'))
RNG=random.Random(19610603)
scene=fresh()
scene.name='His Cot | Ashcombe nursery | physical materials and original geometry'
scene['provenance']='Original meshes and procedural textiles; existing Poly Haven CC0 wood, plaster and fabric scans.'
scene['no_ai_generated_images']=True

def slab(name,bounds,mat,r=.002):
    ob=box(name,*bounds,mat)
    if r:bevel(ob,r,3)
    return ob

def mesh(name,verts,faces,mat,smooth=True):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
    ob=link(bpy.data.objects.new(name,data));data.materials.append(mat)
    for p in data.polygons:p.use_smooth=smooth
    return ob

def wire(name,coords,r,mat,cyclic=False):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=r;data.bevel_resolution=2;data.use_fill_caps=True
    sp=data.splines.new('POLY');sp.points.add(len(coords)-1);sp.use_cyclic_u=cyclic
    for p,co in zip(sp.points,coords):p.co=(*co,1)
    ob=link(bpy.data.objects.new(name,data));data.materials.append(mat);return ob

def rotate_about(ob,centre,angle):
    centre=Vector(centre);rotation=Matrix.Rotation(angle,3,'Y')
    for v in ob.data.vertices:v.co=centre+rotation@(v.co-centre)

def rod(name,a,b,r,mat):
    ob=cylinder(name,0,0,0,(Vector(b)-Vector(a)).length,r,mat,verts=24)
    ob.location=a;ob.rotation_euler=(Vector(b)-Vector(a)).to_track_quat('Z','Y').to_euler();return ob

def ring(name,at,r,t,mat,rot=(0,0,0)):
    ob=lathe(name,[(r+t*math.cos(i*math.tau/16),t*math.sin(i*math.tau/16)) for i in range(17)],mat,at=at,steps=64)
    ob.rotation_euler=rot;return ob

def textile(name,colour,scale=750,rough=.87):
    mat=plain(name,colour,rough);n=mat.node_tree.nodes;l=mat.node_tree.links.new;b=n['Principled BSDF']
    b.inputs['Sheen Weight'].default_value=.28
    tc=n.new('ShaderNodeTexCoord')
    waves=[]
    for direction in ('X','Y'):
        w=n.new('ShaderNodeTexWave');w.wave_type='BANDS';w.bands_direction=direction;w.inputs['Scale'].default_value=scale
        w.inputs['Distortion'].default_value=.8;w.inputs['Detail Scale'].default_value=3;l(tc.outputs['Object'],w.inputs['Vector']);waves.append(w)
    mul=n.new('ShaderNodeMath');mul.operation='MULTIPLY'
    for i,w in enumerate(waves):l(w.outputs['Color'],mul.inputs[i])
    nz=n.new('ShaderNodeTexNoise');nz.inputs['Scale'].default_value=95;nz.inputs['Detail'].default_value=4;l(tc.outputs['Object'],nz.inputs['Vector'])
    ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(*[v*.48 for v in colour],1);ramp.color_ramp.elements[1].color=(*colour,1)
    l(nz.outputs['Fac'],ramp.inputs[0]);l(ramp.outputs[0],b.inputs['Base Color'])
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.55;bump.inputs['Distance'].default_value=.00075
    l(mul.outputs[0],bump.inputs['Height']);l(bump.outputs[0],b.inputs['Normal']);return mat

def worn_paint(name,colour):
    mat=plain(name,colour,.55,coat=.10);n=mat.node_tree.nodes;l=mat.node_tree.links.new;b=n['Principled BSDF']
    tc=n.new('ShaderNodeTexCoord');nz=n.new('ShaderNodeTexNoise');nz.inputs['Scale'].default_value=145;nz.inputs['Detail'].default_value=5
    l(tc.outputs['Object'],nz.inputs['Vector']);r=n.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].position=.25;r.color_ramp.elements[0].color=(.18,.09,.035,1)
    r.color_ramp.elements[1].position=.38;r.color_ramp.elements[1].color=(*colour,1)
    l(nz.outputs['Fac'],r.inputs[0]);l(r.outputs[0],b.inputs['Base Color'])
    bp=n.new('ShaderNodeBump');bp.inputs['Distance'].default_value=.00012;bp.inputs['Strength'].default_value=.18
    l(nz.outputs['Fac'],bp.inputs['Height']);l(bp.outputs[0],b.inputs['Normal']);return mat

WOOD=scan('Cot | dark mahogany, open grain and rubbed shellac','rosewood_veneer1',.24,tint=(.45,.30,.23),sat=.58,bright=.52,rough=(.32,.54),bump=.45,coat=.12)
OAK=scan('Toys | worn pale beech','dark_wood',.26,tint=(1,.79,.49),bright=1.8,sat=.55,rough=(.42,.67),bump=.18,coat=.09)
WALL=scan('Wall | old deep petrol lime plaster','plastered_wall_04',.65,tint=(.13,.26,.24),bright=.40,sat=.15,rough=(.86,.98),bump=.85)
BRASS=aged_metal('Fittings | tarnished brass',(.50,.34,.13),(.09,.061,.027),rough=(.29,.57),tarnish=.48)
IRON=aged_metal('Engine | old blue-black tin',(.055,.10,.115),(.028,.025,.020),rough=(.30,.53),tarnish=.45)
BLACK=plain('Toys | black glass eyes and old rubber',(.011,.009,.007),.30)
IVORY=textile('Linen | unbleached woven cotton',(.64,.57,.43),660)
THREAD=textile('Stitches | old cream cotton',(.70,.63,.48),900)
WOOL=textile('Wool | oatmeal knit',(.42,.35,.25),900,.96)
BLUE=textile('Wool | soft dusty blue',(.13,.22,.25),850,.94)
TEDDY=textile('Bear | honey mohair pile',(.32,.18,.071),700,.94)
EAR=textile('Bear | faded paw pads',(.16,.095,.044),800,.97)
ELEPHANT=textile('Elephant | warm grey linen',(.30,.30,.27),740)
RED=worn_paint('Toys | oxblood red enamel',(.28,.039,.026))
TEAL=worn_paint('Toys | faded teal enamel',(.037,.15,.16))
CREAM=worn_paint('Toys | rubbed warm cream paint',(.66,.53,.32))
YELLOW=worn_paint('Toys | faded ochre paint',(.57,.33,.065))
LEATHER=scan('Ball | creased old leather','brown_leather',.14,tint=(.62,.27,.18),bright=.8,rough=(.53,.80),bump=.27)

FOV=38;PITCH=math.radians(27.66);DEPTH=.729;BED=.62
CAM_Y=-1.2225;CAM_Z=BED+.7565
data=bpy.data.cameras.new('Nursery | 38 degree close photographic lens')
data.lens=(1000/2/math.tan(math.radians(FOV/2)))/1600*36;data.sensor_width=36;data.sensor_fit='HORIZONTAL'
cam=link(bpy.data.objects.new('Nursery | camera',data));cam.location=(0,CAM_Y,CAM_Z);cam.rotation_euler=(math.pi/2-PITCH,0,0);scene.camera=cam

# A real wall, leaded window, soft botanical curtain and bedside lamp.
slab('Wall | uneven lime plaster',(-2,2,.62,.70,-.2,2.7),WALL,.0)
slab('Wall | low mahogany dado',(-2,2,.58,.62,.0,.37),WOOD)
for z in (.36,.385):slab('Wall | dado bead',(-2,2,.567,.61,z,z+.012),WOOD,.004)
# An original pressed botanical study in a worn oval brass frame.
fx,fz=.48,1.00
VELLUM=plain('Botanical | aged cotton-paper mount',(.36,.31,.22),.95)
DRY=plain('Botanical | dried sage leaves',(.085,.11,.045),.94)
for r,t,yy in ((.075,.005,.586),(.068,.002,.577),(.081,.0025,.590)):
    ob=ring('Botanical | moulded oval brass frame',(fx,yy,fz),r,t,BRASS,(math.pi/2,0,0));ob.scale.x=.72
verts=[(fx,.599,fz)]+[(fx+.051*math.cos(i*math.tau/96),.599,fz+.071*math.sin(i*math.tau/96)) for i in range(96)]
mesh('Botanical | oval paper mount',verts,[(0,i+1,(i+1)%96+1) for i in range(96)],VELLUM,False)
wire('Botanical | pressed stem',[(fx-.014,.593,fz-.064),(fx-.005,.593,fz),(fx+.014,.593,fz+.056)],.0009,DRY)
for i in range(7):
    z=fz-.045+i*.014;x=fx-.014+(z-fz+.064)*.23;side=1 if i%2 else -1
    centre=(x+side*.011,.591,z+.007)
    leaf=sphere('Botanical | pressed leaf',centre,.013,DRY,squash=(.9,.08,.42));rotate_about(leaf,centre,side*-.50)
for i in range(5):
    a=i*math.tau/5
    petal=sphere('Botanical | dry faded rose petal',(fx+.014+math.cos(a)*.010,.591,fz+.055+math.sin(a)*.010),.010,EAR,squash=(.8,.08,1))
# Hairline cracks follow the wall rather than floating over the room.
CRACK=plain('Wall | dust in fine plaster cracks',(.020,.033,.029),.98)
for x,z in ((-.40,1.19),(.71,1.28),(-.13,1.12)):
    points=[]
    for i in range(24):points.append((x+.010*math.sin(i*.63)+.002*i,.619,z+i*.005))
    wire('Wall | old hairline lime-plaster crack',points,.00035,CRACK)
slab('Window | deep left timber reveal',(-1.22,-.82,.0,.64,.55,2.15),WOOD)
GLASS=plain('Window | blue night glass',(.036,.067,.105),.17,emit=(.10,.19,.30),strength=.32)
slab('Window | moonlit panes',(-1.19,-.83,.01,.03,.64,2.10),GLASS,.001)
for z in (.67,1.14,1.62,2.1):slab('Window | horizontal lead',(-1.2,-.82,-.005,.012,z,z+.008),BLACK,.001)
for x in (-1.18,-1.0,-.84):slab('Window | vertical lead',(x,x+.009,-.005,.012,.65,2.1),BLACK,.001)
CURTAIN=textile('Curtain | faded ivory botanical linen',(.47,.49,.43),550)
verts=[];faces=[]
for j in range(90):
    t=j/89
    for i in range(30):
        u=i/29;x=-.91+u*.28+.016*math.sin(t*5+u*8)
        y=-.015+.038*math.sin(u*math.tau*4+.1*math.sin(t*4));z=.30+t*1.72
        verts.append((x,y,z))
for j in range(89):
    for i in range(29):
        k=j*30+i;faces.append((k,k+1,k+31,k+30))
mesh('Curtain | hanging folds, irregular linen hem',verts,faces,CURTAIN)
# Botanical embroidery: tiny alternating leaves lie on the fabric folds.
for j in range(11):
    for i in range(3):
        x=-.88+i*.082;z=.43+j*.14
        for side in (-1,1):
            # The embroidered motif sits on the curtain, following its folds.
            u=(x+side*.011+.91)/.28;t=(z-.30)/1.72
            yy=-.015+.038*math.sin(u*math.tau*4+.1*math.sin(t*4))-.0004
            centre=(x+side*.011,yy,z+side*.009)
            leaf=sphere('Curtain | woven leaf motif',centre,.010,TEAL,squash=(.38,.025,1))
            rotate_about(leaf,centre,side*.42)

LX,LY=.91,.37
slab('Bedside | mahogany table',(.78,1.22,.18,.64,.40,.44),WOOD,.008)
lathe('Lamp | turned brass base',[(0,0),(.095,0),(.096,.012),(.080,.023),(.031,.035),(.018,.06),(.012,.28),(.035,.30),(0,.30)],BRASS,at=(LX,LY,.44),steps=80)
SHADE=textile('Lamp | warm pleated silk',(.59,.44,.25),720,.86)
sb=SHADE.node_tree.nodes['Principled BSDF'];sb.inputs['Emission Color'].default_value=(.85,.41,.11,1);sb.inputs['Emission Strength'].default_value=.20
verts=[];faces=[]
for j in range(3):
    z=.74+j*.115;r=.16-j*.036
    for i in range(192):
        a=math.tau*i/192;rr=r*(1+(.027 if i%2 else -.027));verts.append((LX+rr*math.cos(a),LY+rr*math.sin(a),z))
for j in range(2):
    for i in range(192):
        k=j*192+i;faces.append((k,j*192+(i+1)%192,(j+1)*192+(i+1)%192,k+192))
mesh('Lamp | 96 individual shade pleats',verts,faces,SHADE,False)
for z,r in ((.741,.16),(.969,.088)):ring('Lamp | stitched shade binding',(LX,LY,z),r,.003,IVORY)
lamp('Lamp | tungsten under silk','POINT',(LX,LY,.82),energy=5.0,colour=(1,.63,.28),size=.065)
lamp('Lamp | soft warm light on the sheet','AREA',(.82,.12,1.50),aim=(0,0,.60),energy=16,colour=(1,.72,.44),size=.46)
lamp('Window | broad cool moonlight','AREA',(-1.02,-.12,1.42),aim=(0,0,.64),energy=13,colour=(.51,.67,1),size=.70,size_y=1.1)
lamp('Camera | dim bounced nursery light','AREA',(-.05,-1.1,1.85),aim=(0,.1,.68),energy=2.5,colour=(.78,.83,1),size=1.3)
world=bpy.data.worlds.new('Nursery | quiet night');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.075,.10,.15,1);world.node_tree.nodes['Background'].inputs[1].default_value=.08;scene.world=world

# Turned solid mahogany, rounded shoulders, wooden dowels and actual screws.
post=[(0,0),(.029,0),(.029,.04),(.022,.055),(.022,.18),(.030,.20),(.030,.22),(.021,.24),(.021,.55),(.032,.565),(.032,.59),(.022,.61),(.019,.63),(.032,.65),(.034,.666),(.026,.685),(0,.696)]
for x in (-.648,.648):
    for y in (-.405,.405):
        top=.922 if y>0 else .88
        ob=lathe('Cot | lathe-turned mahogany corner',post,WOOD,at=(x,y,top-.696),steps=80)
        if y>0:
            sphere('Cot | polished ball finial',(x,y,top+.016),.031,WOOD)
for z,h in ((.325,.045),(.832,.060)):
    slab('Cot | back mortised solid rail',(-.65,.65,.38,.428,z,z+h),WOOD,.008)
    for dz in (.006,h-.012):slab('Cot | narrow raised rail moulding',(-.63,.63,.374,.381,z+dz,z+dz+.006),WOOD,.002)
spindle=[(.010,0),(.010,.025),(.014,.035),(.014,.046),(.008,.060),(.008,.15),(.012,.185),(.013,.22),(.009,.25),(.008,.34),(.014,.352),(.014,.363),(.010,.38),(.010,.55)]
for i in range(15):lathe('Cot | individually turned back spindle',[(r,h*.85) for r,h in spindle],WOOD,at=(-.588+i*.084,.405,.366),steps=40)
for x in (-.648,.648):
    for z in (.34,.832):
        slab('Cot | side rail',(x-.025,x+.025,-.405,.405,z,z+.042),WOOD,.008)
    for i in range(9):lathe('Cot | turned side spindle',[(r,h*.83) for r,h in spindle],WOOD,at=(x,-.35+i*.0875,.38),steps=32)
    for y in (-.35,.35):
        screw=cylinder('Cot | slotted brass screw',0,0,0,.0018,.005,BRASS,verts=32)
        screw.location=(x+(.026 if x>0 else -.026),y,.892);screw.rotation_euler.y=math.pi/2
        rod('Cot | screw slot',(x+(.0275 if x>0 else -.0275),y-.003,.892),(x+(.0275 if x>0 else -.0275),y+.003,.892),.00055,BLACK)
slab('Mattress | bound, rounded ticking body',(-.61,.61,-.378,.378,.545,.617),IVORY,.025)

# The woven cotton sheet has its own real edge, shallow wrinkles and sewn
# piping. The middle stays flat so the live clue shadows meet the surface.
def sheet_z(x,y):
    edge=(abs(x)/.61)**7+(abs(y)/.378)**8
    fine=.0009*math.sin(x*52+y*23)+.0006*math.cos(x*81-y*39)
    folds=.0035*math.sin(x*39+y*25)*min(1,edge)+.0023*math.cos(x*65-y*17)*min(1,edge)
    gathers=.006*math.exp(-((y-.32)/.04)**2)*math.sin(x*40)+.006*math.exp(-((abs(x)-.57)/.045)**2)*math.sin(y*52)
    tucked=-.010*min(1,.5*((abs(x)/.61)**20+(abs(y)/.378)**20))
    return BED+fine+folds+gathers+tucked

SHEET=textile('Sheet | ivory cotton with fine warp and weft',(.69,.64,.52),1050)
# Repeating tiny moon and star print is an original native bitmap, not AI.
print_path=OUT/'sheet-print.png'
if print_path.exists():
    n=SHEET.node_tree.nodes;l=SHEET.node_tree.links.new;b=n['Principled BSDF'];tc=n.new('ShaderNodeTexCoord');mp=n.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value=(2.1,2.1,2.1);l(tc.outputs['Object'],mp.inputs[0]);im=n.new('ShaderNodeTexImage');im.image=bpy.data.images.load(str(print_path));im.projection='BOX';im.projection_blend=.1
    l(mp.outputs[0],im.inputs[0])
    nz=n.new('ShaderNodeTexNoise');nz.inputs['Scale'].default_value=85;nz.inputs['Detail'].default_value=5;l(tc.outputs['Object'],nz.inputs['Vector'])
    r=n.new('ShaderNodeValToRGB');r.color_ramp.elements[0].color=(.64,.60,.53,1);r.color_ramp.elements[1].color=(1,.98,.91,1);l(nz.outputs['Fac'],r.inputs[0])
    mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.48
    l(im.outputs['Color'],mix.inputs[1]);l(r.outputs[0],mix.inputs[2]);l(mix.outputs[0],b.inputs['Base Color'])
    b.inputs['Roughness'].default_value=.96;b.inputs['Specular IOR Level'].default_value=.19
verts=[];faces=[];NX=150;NY=100
for j in range(NY+1):
    y=-.378+j/NY*.756
    for i in range(NX+1):
        x=-.610+i/NX*1.220;verts.append((x,y,sheet_z(x,y)))
for j in range(NY):
    for i in range(NX):
        k=j*(NX+1)+i;faces.append((k,k+1,k+NX+2,k+NX+1))
mesh('Sheet | tensioned woven cotton with gentle edge wrinkles',verts,faces,SHEET)
edge=[]
for j in range(240):
    a=math.tau*j/240;x=.607*math.copysign(abs(math.cos(a))**.17,math.cos(a));y=.375*math.copysign(abs(math.sin(a))**.17,math.sin(a));edge.append((x,y,.602))
wire('Mattress | continuous sewn edge piping',edge,.0018,THREAD,True)

def at(a,b,dz=0):return ((a-.5)*1.2,(.5-b)*DEPTH,BED+dz)

def puff(name,pos,size,mat,seam=True):
    # A sewn cushion: rounded in plan, convex at its centre, pinched at its
    # stitched edge. Top and underside are one closed subdivided mesh.
    w,d,h=size;verts=[];faces=[];N=40
    for side in (-1,1):
        for j in range(N+1):
            v=-1+2*j/N
            for i in range(N+1):
                u=-1+2*i/N
                x=u*w/2*(1-.055*abs(v)**12);y=v*d/2*(1-.055*abs(u)**12)
                z=side*h/2*(.12+.88*max(0,(1-u*u)*(1-v*v))**.6)
                z+=.0013*math.sin(u*32+v*11)*(abs(u)**9+abs(v)**9)
                verts.append((pos[0]+x,pos[1]+y,pos[2]+h/2+z))
    M=(N+1)**2
    for side in range(2):
        for j in range(N):
            for i in range(N):
                k=side*M+j*(N+1)+i;faces.append((k,k+1,k+N+2,k+N+1))
    perimeter=list(range(N+1))+[j*(N+1)+N for j in range(1,N+1)]+[N*(N+1)+i for i in range(N-1,-1,-1)]+[j*(N+1) for j in range(N-1,0,-1)]
    for a,b in zip(perimeter,perimeter[1:]+perimeter[:1]):faces.append((a,b,b+M,a+M))
    ob=mesh(name,verts,faces,mat)
    if seam:wire(name+' | stitched piping',[(verts[k][0],verts[k][1],pos[2]+h/2) for k in perimeter],.0008,THREAD,True)
    return ob

def fuzz(name,parts,mat,count=2300,length=.0025):
    # Individual slightly curved mohair fibres are geometry, and stay visible
    # in silhouette rather than relying only on a noisy colour texture.
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=.00018;data.bevel_resolution=0
    for _ in range(count):
        centre,scale=RNG.choice(parts);v=Vector((RNG.uniform(-1,1),RNG.uniform(-1,1),RNG.uniform(-1,1)))
        if v.length<.01:continue
        v.normalize();p=Vector(centre)+Vector((v.x*scale[0],v.y*scale[1],v.z*scale[2]));normal=Vector((v.x/scale[0],v.y/scale[1],v.z/scale[2])).normalized()
        le=length*RNG.uniform(.45,1.3);sp=data.splines.new('POLY');sp.points.add(2)
        for i,point in enumerate(sp.points):
            t=i/2;q=p+normal*le*t+Vector((math.sin(i+v.x)*le*.2,math.cos(i+v.y)*le*.2,0))*t
            point.co=(*q,1);point.radius=1-t*.7
    ob=link(bpy.data.objects.new(name,data));data.materials.append(mat)

def stuffed(kind,a,b,mat):
    pos=Vector(at(a,b));parts=[]
    def part(name,off,scale,material=mat):
        centre=pos+Vector(off);sphere(kind+' | '+name,centre,1,material,squash=scale);parts.append((centre,scale));return centre
    rabbit=kind=='Rabbit';elephant=kind=='Elephant'
    part('stuffed body',(0,0,.050),(.036,.025,.047))
    head=part('head',(0,-.005,.103 if rabbit else .105),(.031,.025,.030))
    for s in (-1,1):
        part('sewn foot',(s*.027,-.020,.016),(.019,.028,.016));part('floppy arm',(s*.039,-.001,.052),(.013,.014,.033))
        if rabbit:
            part('long knitted ear',(s*.016,.001,.151),(.011,.008,.043));part('ear lining',(s*.016,-.007,.153),(.005,.0017,.028),IVORY)
        elif elephant:part('padded linen ear',(s*.035,.0,.105),(.025,.007,.031))
        else:part('round mohair ear',(s*.029,.001,.129),(.014,.010,.016))
        sphere(kind+' | glass bead eye',head+Vector((s*.010,-.024,.005)),.0021,BLACK)
        if not elephant:
            part('worn paw pad',(s*.027,-.043,.017),(.010,.002,.010),EAR if not rabbit else IVORY)
    if elephant:
        points=[head+Vector((0,-.024,-.003-i*.008)) for i in range(7)]
        points[-1]+=Vector((.008,-.008,.003));wire(kind+' | curved sewn trunk',points,.009,mat)
    else:
        part('stitched muzzle',(0,-.028,.096 if not rabbit else .096),(.015,.008,.011),IVORY if rabbit else EAR)
        sphere(kind+' | embroidered nose',pos+Vector((0,-.036,.100)),.0033,BLACK,squash=(1,.5,.65))
        wire(kind+' | mouth stitch',[pos+Vector((-.006,-.035,.090)),pos+Vector((0,-.037,.087)),pos+Vector((.006,-.035,.090))],.0006,BLACK)
    fuzz(kind+' | individual soft pile',parts,mat,14000 if not elephant else 4500,.0018 if elephant else .0037)
    wire(kind+' | centre sewn seam',[pos+Vector((0,-.025,.017+i*.007)) for i in range(10)],.00045,THREAD)

puff('Pillow | softly filled antique linen',at(.18,.04),(.235,.136,.046),IVORY)
stuffed('Bear',.57,.06,TEDDY)
stuffed('Rabbit',.06,.89,WOOL)
stuffed('Elephant',.025,.58,ELEPHANT)

# Hand-knitted bootees, with actual stitches across their turned cuffs.
for s in (-1,1):
    x,y,z=at(.42,.08);x+=s*.020;y+=s*.009
    sphere('Bootee | soft rounded knitted foot',(x,y-.012,z+.017),1,BLUE,squash=(.018,.032,.017))
    lathe('Bootee | hollow knitted cuff',[(.013,0),(.014,.033),(.010,.035),(.010,.028)],BLUE,at=(x,y+.006,z+.015),steps=48)
    for j in range(16):
        a=j*math.tau/16
        wire('Bootee | ribbed cuff loop',[(x+(.014+math.sin(t*math.pi)*.0015)*math.cos(a),y+.006+(.014+math.sin(t*math.pi)*.0015)*math.sin(a),z+.024+t*.027) for t in [k/10 for k in range(11)]],.0008,BLUE)
    wire('Bootee | cotton tie',[(x-.014,y-.013,z+.030),(x+.014,y-.014,z+.030)],.00065,THREAD)

# A thick folded blanket with rows of visible interlocking yarn loops.
bx,by,bz=at(.74,.87)
for j in range(3):puff('Blanket | folded wool layer',(bx,by,bz+j*.008),(.177,.12,.012),WOOL)
for j in range(25):
    for i in range(29):
        x=bx-.081+i*.0056;y=by-.053+j*.0044
        u=(x-bx)/(.177/2);v=(y-by)/(.12/2)
        zz=bz+.022+.006*(.12+.88*max(0,(1-u*u)*(1-v*v))**.6)
        wire('Blanket | knitted face stitch',[(x-.0018,y,zz),(x,y+.0025,zz+.0007),(x+.0018,y,zz),(x,y-.0015,zz+.0005)],.00043,THREAD)

# Toys are original small constructions: real axle holes, rolled metal,
# turned beech wheels, separate screws, and subtly chipped painted edges.
def wheel(name,x,y,z,r,mat=OAK):
    ob=lathe(name,[(0,0),(r*.75,0),(r,.002),(r,.009),(r*.8,.012),(0,.012)],mat,steps=48)
    ob.location=(x,y,z);ob.rotation_euler.x=math.pi/2
    rod(name+' | axle pin',(x,y-.014,z),(x,y+.004,z),.0023,BRASS)

dx,dy,dz=at(.34,.60)
slab('Duck | rolling beech platform',(dx-.048,dx+.048,dy-.024,dy+.024,dz+.012,dz+.025),OAK,.004)
sphere('Duck | worn carved body',(dx,dy,dz+.052),1,YELLOW,squash=(.042,.021,.030))
sphere('Duck | carved head',(dx+.030,dy,dz+.090),.020,YELLOW)
sphere('Duck | flat red bill',(dx+.052,dy-.003,dz+.085),1,RED,squash=(.018,.012,.004))
sphere('Duck | painted eye',(dx+.037,dy-.018,dz+.094),.002,BLACK)
for x in (dx-.027,dx+.028):
    for y in (dy-.026,dy+.037):wheel('Duck | red wooden wheel',x,y,dz+.016,.017,RED)
wire('Duck | loose pull string',[(dx+.046,dy,dz+.018),(dx+.063,dy-.012,BED+.002),(dx+.087,dy-.011,BED+.002),(dx+.092,dy-.026,BED+.002)],.0008,THREAD)

def vehicle(name,a,b,fire=False):
    x,y,z=at(a,b);L=.14 if fire else .15
    slab(name+' | chassis',(x-L/2,x+L/2,y-.026,y+.026,z+.020,z+.033),RED if fire else IRON,.003)
    if fire:
        slab(name+' | red cab',(x+.025,x+.066,y-.026,y+.026,z+.034,z+.075),RED,.005)
        slab(name+' | dark windscreen',(x+.025,x+.061,y-.027,y-.026,z+.052,z+.069),BLACK,.001)
        for yy in (y-.019,y+.019):rod(name+' | brass ladder rail',(x-.065,yy,z+.076),(x+.020,yy,z+.076),.0023,OAK)
        for i in range(8):rod(name+' | separate ladder rung',(x-.06+i*.010,y-.020,z+.076),(x-.06+i*.010,y+.020,z+.076),.0017,OAK)
    else:
        rod(name+' | rolled tin boiler',(x-.050,y,z+.061),(x+.035,y,z+.061),.025,IRON)
        for xx in (x-.037,x+.018):ring(name+' | brass boiler band',(xx,y,z+.061),.0255,.0014,BRASS,(0,math.pi/2,0))
        slab(name+' | engine cab',(x+.030,x+.068,y-.028,y+.028,z+.033,z+.099),TEAL,.003)
        slab(name+' | open cab window',(x+.037,x+.060,y-.029,y-.028,z+.063,z+.087),BLACK,.001)
        slab(name+' | curved tin roof',(x+.024,x+.074,y-.033,y+.033,z+.098,z+.103),IRON,.003)
        lathe(name+' | flared chimney',[(.006,0),(.006,.025),(.010,.030),(.010,.035)],BRASS,at=(x-.033,y,z+.080))
    for xx in (x-.047,x+.045):
        for yy in (y-.032,y+.043):wheel(name+' | spoked beech wheel',xx,yy,z+.025,.024,RED if not fire else OAK)
    for i in range(4):sphere(name+' | tiny brass rivet',(x-.052+i*.030,y-.029,z+.033),.0013,BRASS)
vehicle('Locomotive',.20,.80)
vehicle('Fire engine',.25,.95,True)

# Stacking rings are turned individually, with a bare peg through the holes.
x,y,z=at(.80,.04)
lathe('Rings | round wooden base',[(0,0),(.041,0),(.041,.011),(0,.011)],OAK,at=(x,y,z))
cylinder('Rings | central wooden peg',x,y,z+.009,z+.128,.0055,OAK)
for i,mat in enumerate((TEAL,YELLOW,CREAM,RED,BLUE)):
    r=.034-i*.0048;ring('Rings | separate rounded ring',(x,y,z+.021+i*.019),r-.007,.008,mat)
sphere('Rings | rounded peg tip',(x,y,z+.128),.006,OAK)

x,y,z=at(.06,.07)
font=bpy.data.fonts.load('C:/Windows/Fonts/georgiab.ttf')
for i,(off,letter,mat) in enumerate([((-.015,0,0),'A',TEAL),((.023,.008,0),'B',RED),((-.002,.002,.036),'C',YELLOW)]):
    xx,yy,zz=x+off[0],y+off[1],z+off[2]
    slab('Blocks | rounded beech cube',(xx-.018,xx+.018,yy-.018,yy+.018,zz,zz+.036),OAK,.002)
    slab('Blocks | painted inset',(xx-.014,xx+.014,yy-.0188,yy-.018,zz+.004,zz+.032),mat,.001)
    d=bpy.data.curves.new('Block letter','FONT');d.body=letter;d.font=font;d.size=.024;d.align_x='CENTER';d.align_y='CENTER';d.extrude=.0001
    ob=link(bpy.data.objects.new('Blocks | embossed '+letter,d));ob.location=(xx,yy-.0192,zz+.018);ob.rotation_euler.x=math.pi/2;d.materials.append(CREAM)

x,y,z=at(.34,.87)
rod('Rattle | smooth beech handle',(x-.024,y-.034,z+.005),(x+.009,y+.015,z+.014),.006,OAK)
ring('Rattle | turned beech hoop',(x+.016,y+.028,z+.020),.024,.005,OAK,(math.radians(20),0,0))
for i,mat in enumerate((RED,TEAL,CREAM)):
    a=i*math.tau/3;sphere('Rattle | loose coloured bead',(x+.016+math.cos(a)*.012,y+.028+math.sin(a)*.012,z+.020),.007,mat)

x,y,z=at(.49,.91)
lathe('Top | painted turned body',[(0,0),(.006,.006),(.028,.018),(.035,.030),(.033,.038),(.025,.043),(0,.044)],TEAL,at=(x,y,z+.002),steps=96)
for h,r in ((.019,.028),(.030,.035),(.038,.033)):ring('Top | fine ivory painted stripe',(x,y,z+h+.002),r,.0009,CREAM)
lathe('Top | beech spindle',[(0,0),(.004,0),(.004,.034),(.007,.039),(.006,.046),(0,.046)],OAK,at=(x,y,z+.038))

x,y,z=at(.69,.73)
sphere('Ball | hand-stitched leather',(x,y,z+.042),.042,LEATHER)
for j in range(6):
    az=j*math.tau/6
    points=[]
    for k in range(51):
        t=math.pi*k/50;points.append((x+.0423*math.sin(t)*math.cos(az),y+.0423*math.sin(t)*math.sin(az),z+.042+.0423*math.cos(t)))
    wire('Ball | six recessed panel seams',points,.0005,EAR)
    for k in range(2,49,2):
        t=math.pi*k/50;p=Vector(points[k]);side=Vector((-math.sin(az),math.cos(az),0))*.0012
        wire('Ball | paired cotton panel stitch',[p-side,p+side],.00023,THREAD)

# A carved rocking horse: its silhouette is a closed solid, with turned
# saddle, leather bridle, flax mane, and two curved wooden rockers.
x,y,z=at(.92,.85)
sphere('Horse | carved beech body',(x,y,z+.075),1,CREAM,squash=(.042,.016,.025))
for side in (-1,1):
    for xx in (x-.025,x+.029):rod('Horse | slender carved leg',(xx,y+side*.010,z+.072),(xx+(.006 if xx>x else -.007),y+side*.016,z+.020),.0055,CREAM)
    wire('Horse | bentwood rocker',[(x-.067+i*.134/48,y+side*.025,z+.010+.009*((i-24)/24)**2) for i in range(49)],.0045,WOOD)
rod('Horse | arched neck',(x+.026,y,z+.077),(x+.037,y,z+.127),.012,CREAM)
sphere('Horse | carved head',(x+.028,y,z+.132),1,CREAM,squash=(.025,.010,.013))
for side in (-1,1):
    sphere('Horse | carved ear',(x+.040,y+side*.007,z+.145),1,CREAM,squash=(.004,.003,.010))
    sphere('Horse | tiny black eye',(x+.026,y+side*.010,z+.136),.0017,BLACK)
    wire('Horse | leather bridle',[(x+.010,y+side*.011,z+.128),(x+.031,y+side*.012,z+.121),(x+.039,y+side*.011,z+.137)],.0008,LEATHER)
sphere('Horse | oxblood saddle',(x-.007,y,z+.098),1,RED,squash=(.020,.018,.006))
for i in range(14):
    wire('Horse | flax tail strand',[(x-.040,y+(i-7)*.0008,z+.079),(x-.060,y+(i-7)*.001,z+.066),(x-.063,y+(i-7)*.001,z+.041)],.0005,WOOL)
for i in range(20):
    wire('Horse | flax mane',[(x+.039,y,z+.126-i*.0018),(x+.047,y-.001,z+.126-i*.0018),(x+.046,y-.007,z+.120-i*.0018)],.0006,WOOL)

# A gracefully bent mobile arm. The hoop, five sewn shapes, and all their
# suspension threads are actual live 3D meshes, attached to this endpoint.
wire('Mobile | curved mahogany arm',[(-.65+.65*t,.405-.375*t,.94+.22*math.sin(t*math.pi/2)) for t in [i/64 for i in range(65)]],.008,WOOD)
slab('Mobile | brass mounting clamp',(-.672,-.624,.378,.432,.914,.972),BRASS,.004)
for z in (.928,.957):rod('Mobile | clamp screw',(-.672,.375,z),(-.623,.375,z),.0028,BRASS)

# Foreground geometry is rendered separately so the live clues pass behind
# the solid front rail instead of being cropped by a rectangular mask.
before=set(bpy.data.objects)
slab('Front | lowered mahogany rail',(-.66,.66,-.438,-.389,.535,.611),WOOD,.010)
for z in (.542,.597):slab('Front | raised moulding',(-.645,.645,-.443,-.436,z,z+.007),WOOD,.002)
for i in range(17):lathe('Front | turned lower spindle',[(r,h*.6) for r,h in spindle],WOOD,at=(-.62+i*.0775,-.414,.20),steps=32)
front=[o for o in bpy.data.objects if o not in before]

cycles(scene,SAMPLES,WIDTH,HEIGHT,transparent=False,exposure=.10,glare=False)
if '--cpu' in sys.argv:scene.cycles.device='CPU'
scene.cycles.adaptive_threshold=.008
scene.cycles.use_denoising=True
scene.render.use_persistent_data=True
scene.view_settings.look='AgX - Medium High Contrast'
scene.render.image_settings.color_depth='8'
scene.render.image_settings.color_mode='RGBA'

def project(p):
    v=world_to_camera_view(scene,cam,Vector(p));return [round(v.x*WIDTH,4),round((1-v.y)*HEIGHT,4)]

bpy.context.view_layer.update()
layout={'version':1,'width':WIDTH,'height':HEIGHT,'sheetWidth':1.2,'sheetDepth':DEPTH,'fov':FOV,
        'camera':{'height':CAM_Z-BED,'distance':-CAM_Y,'pitch':PITCH},
        'sheet':{'back':project((0,DEPTH/2,BED)),'front':project((0,-DEPTH/2,BED))},
        'frontTop':project((0,-.438,.611))[1],
        'mobile':{'anchor':[0,.54,-.03],'centre':[0,.43,-.03],'radius':.14},
        'belongings':[]}
for id,a,b in [('pillow',.18,.04),('bootees',.42,.08),('teddy',.57,.06),('rabbit',.06,.89),('rattle',.34,.87),('blanket',.74,.87),('duck',.34,.60),('train',.20,.80),('rockingHorse',.92,.85),('blocks',.06,.07),('ball',.69,.73),('rings',.80,.04),('top',.49,.91),('firetruck',.25,.95),('elephant',.025,.58)]:
    layout['belongings'].append({'id':id,'a':a,'b':b,'foot':project(at(a,b))})
(OUT/'nativeCot.json').write_text(json.dumps(layout,indent=1)+'\n',encoding='utf-8')
if '--pack' in sys.argv:bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'his-cot.blend'))
scene.render.filepath=str(OUT/'room.png');bpy.ops.render.render(write_still=True)
if '--preview' not in sys.argv:
    # Camera-ray visibility keeps indirect light and reflections intact.
    scene.render.film_transparent=True
    for ob in scene.objects:
        if ob.type not in ('CAMERA','LIGHT') and ob not in front:ob.visible_camera=False
    scene.render.filepath=str(OUT/'front.png');bpy.ops.render.render(write_still=True)
print('HIS COT COMPLETE',OUT)
