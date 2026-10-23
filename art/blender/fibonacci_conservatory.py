"""Room I: the old conservatory's potting station. Blender/Cycles only.

Uses the same scanned-material, real joinery and physically lit approach as
hall_chem.py. Only one botanical specimen: the interactive Pelargonium.
No scattered garden assets, foliage cards, grass or decorative plants.
"""
import bpy,bmesh,math,json,random,sys
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from kit import arg,fresh,link,box,bevel,cylinder,sphere,lathe,plain,aged_metal,import_model,meshes_of,lamp,cycles
from hall_common import scan,clear_glass
from fibonacci_geranium import build_plant,gameplay_data

OUT=Path(arg('--out',str(HERE.parents[1]/'.artifacts/fibonacci-conservatory')));OUT.mkdir(parents=True,exist_ok=True)
W=int(arg('--width','1600'));H=round(W/1.6);SAMPLES=int(arg('--samples','96'))
MODE=arg('--mode','preview');RNG=random.Random(11235813)
scene=fresh();scene.name='Room I | the old conservatory | Cycles'
scene['no_ai_generation']=True;scene['art_version']=3
scene['provenance']='Original Blender architecture and apparatus, Poly Haven CC0 photographed scans. No AI generated images.'
camera=bpy.data.cameras.new('Conservatory | 85 mm photographic lens');camera.lens=85;camera.sensor_fit='HORIZONTAL';camera.sensor_width=36
cam=link(bpy.data.objects.new('Camera',camera));cam.location=(0,-3.8,1.80)
cam.rotation_euler=(Vector((0,2,1.30))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
scene.render.resolution_x=W;scene.render.resolution_y=H;bpy.context.view_layer.update()

def project(co):
    p=world_to_camera_view(scene,cam,Vector(co));return [p.x*W,(1-p.y)*H]

BENCH=project((0,2,.82));CM=project((.01,2,.82))[0]-BENCH[0]
def world(x,y):
    px,py=BENCH[0]+x*CM,BENCH[1]+y*CM
    local=Vector(((px/W-.5)*camera.sensor_width/camera.lens,(.5-py/H)*camera.sensor_width/camera.lens*H/W,-1))
    ray=cam.matrix_world.to_3x3()@local
    return cam.location+ray*((2-cam.location.y)/ray.y)

def slab(name,x0,x1,y0,y1,z0,z1,mat,r=.003):
    return bevel(box(name,x0,x1,y0,y1,z0,z1,mat),r,3) if r else box(name,x0,x1,y0,y1,z0,z1,mat)

def wire(name,points,radius,mat):
    cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=radius;cu.bevel_resolution=3;cu.use_fill_caps=True
    sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
    for p,co in zip(sp.points,points):p.co=(*co,1)
    ob=link(bpy.data.objects.new(name,cu));ob.data.materials.append(mat);return ob

def rod(name,a,b,r,mat):
    a,b=Vector(a),Vector(b);ob=cylinder(name,0,0,0,(b-a).length,r,mat,verts=24)
    ob.location=a;ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return ob

# The same physically scaled photographed finishes used in the chemist's
# hall: aged plaster, painted joinery, brass, stone and gently polished wood.
plaster=scan('Conservatory | old lime plaster','white_plaster_rough_01',size=2.5,tint=(.84,.83,.76),bright=.68,sat=.35,rough=(.82,.95),bump=.45)
floor=scan('Conservatory | old buff and black tiles','checkered_pavement_tiles',size=3,tint=(.85,.80,.68),bright=.55,sat=.65,rough=(.32,.68),bump=.45,coat=.12)
wood=scan('Conservatory | old oiled oak','dark_wood',size=1.2,tint=(.73,.57,.38),bright=.56,rough=(.32,.64),bump=.32,coat=.12)
stone=scan('Conservatory | worn limestone sill','old_sandstone_02',size=1.8,bright=.69,sat=.25,rough=(.67,.9),bump=.4)
green=plain('Conservatory | old bottle green paint',(.025,.057,.041),.43,coat=.17,spec=.35)
gn,gl=green.node_tree.nodes,green.node_tree.links;gp=gn.get('Principled BSDF')
noise=gn.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=95;noise.inputs['Detail'].default_value=5
bump=gn.new('ShaderNodeBump');bump.inputs['Distance'].default_value=.00018;bump.inputs['Strength'].default_value=.27
gl.new(noise.outputs['Fac'],bump.inputs['Height']);gl.new(bump.outputs[0],gp.inputs['Normal'])
# The chemist's hall uses the same edge-wear principle: paint rubbed back to
# old timber at corners, with fine chips and darker dirt in the joinery.
tc=gn.new('ShaderNodeTexCoord');geo=gn.new('ShaderNodeNewGeometry')
bn=gn.new('ShaderNodeBevel');bn.inputs['Radius'].default_value=.004
dot=gn.new('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT'
gl.new(bn.outputs['Normal'],dot.inputs[0]);gl.new(geo.outputs['Normal'],dot.inputs[1])
edge=gn.new('ShaderNodeMapRange');edge.inputs['From Min'].default_value=.985;edge.inputs['From Max'].default_value=.90
gl.new(dot.outputs['Value'],edge.inputs[0])
chip=gn.new('ShaderNodeTexNoise');chip.inputs['Scale'].default_value=32;chip.inputs['Detail'].default_value=7
gl.new(tc.outputs['Object'],chip.inputs['Vector'])
mul=gn.new('ShaderNodeMath');mul.operation='MULTIPLY';gl.new(edge.outputs[0],mul.inputs[0]);gl.new(chip.outputs['Fac'],mul.inputs[1])
mix=gn.new('ShaderNodeMixRGB');mix.inputs[1].default_value=(.025,.057,.041,1);mix.inputs[2].default_value=(.13,.075,.029,1)
gl.new(mul.outputs[0],mix.inputs[0])
ao=gn.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=.12
ramp=gn.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.4,.38,.34,1);gl.new(ao.outputs['AO'],ramp.inputs[0])
age=gn.new('ShaderNodeMixRGB');age.blend_type='MULTIPLY';age.inputs[0].default_value=1
gl.new(mix.outputs[0],age.inputs[1]);gl.new(ramp.outputs[0],age.inputs[2]);gl.new(age.outputs[0],gp.inputs['Base Color'])
brass=aged_metal('Conservatory | old brass',(.48,.32,.12),(.07,.055,.027),rough=(.26,.52),scale=30,tarnish=.65)
iron=aged_metal('Conservatory | blackened iron',(.075,.078,.07),(.025,.019,.014),rough=(.45,.65),scale=22,tarnish=.5)

slab('Architecture | tiled floor',-3,3,-5,4,-.10,0,floor,0)
slab('Architecture | rear wall below window',-3,3,3.12,3.36,0,1.03,plaster,0)
slab('Architecture | rear wall above window',-3,3,3.12,3.36,2.48,3.4,plaster,0)
slab('Architecture | rear left pier',-3,-1.18,3.12,3.36,1.03,2.48,plaster,0)
slab('Architecture | rear right pier',1.18,3,3.12,3.36,1.03,2.48,plaster,0)
for side in [-1,1]:
    slab('Architecture | return wall',side*2.22-.1,side*2.22+.1,-5,3.36,0,3.4,plaster,0)
    slab('Joinery | return dado',side*2.10-.035,side*2.10+.035,-5,3.12,.05,1.02,green)
    slab('Joinery | return dado cap',side*2.08-.055,side*2.08+.055,-5,3.12,.99,1.045,green)
slab('Architecture | complete room front wall',-2.2,2.2,-5.1,-4.95,0,3.4,plaster,0)
ceiling=scan('Conservatory | timber ceiling','dark_wooden_planks',size=2.2,tint=(.62,.52,.38),bright=.44,rough=(.55,.8),bump=.3)
slab('Architecture | complete room ceiling',-2.2,2.2,-5,3.35,3.25,3.4,ceiling,0)
slab('Joinery | rear dado backing',-2.13,2.13,3.055,3.12,.045,1.02,green)
for i in range(12):
    x=-2.13+i*.355
    slab('Joinery | recessed wall panel',x+.045,x+.31,3.035,3.055,.20,.84,green,.002)
    for edge in [x+.025,x+.33]:slab('Joinery | panel stile',edge,edge+.018,3.015,3.055,.10,.96,green,.003)
slab('Joinery | dado rail',-2.16,2.16,2.99,3.15,.98,1.045,green)
slab('Stone | deep window sill',-1.25,1.25,2.91,3.43,1.045,1.105,stone,.008)

# Deep timber casements with actual glazed panes, putty beads, hinges and
# a brass catch. Night is seen through the glass; rain lies on its outside.
for x in [-1.18,0,1.18]:slab('Window | structural timber stile',x-.036,x+.036,3.07,3.21,1.10,2.48,green)
for z in [1.115,1.78,2.46]:slab('Window | timber rail',-1.18,1.18,3.08,3.20,z-.026,z+.026,green)
glass=plain('Window | aged hand made glass',(.84,.91,.93),.12,transmission=1,ior=1.47,spec=.5)
nn,ll=glass.node_tree.nodes,glass.node_tree.links
ng=nn.new('ShaderNodeTexNoise');ng.inputs['Scale'].default_value=33;ng.inputs['Detail'].default_value=2
bp=nn.new('ShaderNodeBump');bp.inputs['Distance'].default_value=.00065;bp.inputs['Strength'].default_value=.28
ll.new(ng.outputs['Fac'],bp.inputs['Height']);ll.new(bp.outputs[0],nn.get('Principled BSDF').inputs['Normal'])
for col in range(4):
    x0=-1.14+col*.57;x1=x0+.55
    if col in [1,3]:slab('Window | narrow glazing bar',x0-.012,x0+.012,3.10,3.16,1.14,2.43,green,.002)
    for z0,z1 in [(1.15,1.75),(1.81,2.425)]:
        slab('Window | real glass pane',x0+.01,x1,3.15,3.153,z0,z1,glass,.001)
        for x in [x0+.007,x1]:slab('Window | glazing putty',x-.004,x+.004,3.126,3.15,z0,z1,green,.001)
for side in [-1,1]:
    for z in [1.36,2.18]:
        x=side*1.135
        slab('Window | hinge leaf',x-.021,x+.021,3.047,3.075,z-.043,z+.043,brass,.002)
        cylinder('Window | hinge pin',x,3.045,z-.05,z+.05,.006,brass,verts=24)
    x=side*.045
    slab('Window | catch backplate',x-.018,x+.018,3.035,3.07,1.725,1.805,brass,.004)
    rod('Window | brass casement latch',(x,3.02,1.765),(x+side*.067,3.012,1.795),.006,brass)
rain=plain('Window | rain water',(.86,.92,.96),.025,transmission=1,ior=1.333)
for i in range(170):
    x=RNG.uniform(-1.11,1.11);z=RNG.uniform(1.17,2.42);r=RNG.uniform(.0007,.0026)
    if abs(x)<.055 or abs(z-1.78)<.045:continue
    sphere('Window | small rain bead',(x,3.155,z),r,rain,squash=(1,.48,1.2+RNG.random()))
for i in range(11):
    x=RNG.uniform(-1.1,1.1);z=RNG.uniform(1.25,2.35);length=RNG.uniform(.035,.13)
    wire('Window | gravity rain trail',[(x+.001*math.sin(j*.4+i),3.156,z-j/16*length) for j in range(17)],.0005,rain)

# A genuine scanned worktable supplies natural edge wear, timber grain and
# real construction. Its top is 82 cm high; no drawn or tiled wood boards.
table=import_model('WoodenTable_01',height=.82,at=(0,2,0),rot=0)
bpy.context.view_layer.update()
pts=[o.matrix_world@Vector(v) for o in meshes_of(table) for v in o.bound_box]
table.scale.x*=2.10/(max(v.x for v in pts)-min(v.x for v in pts))
bpy.context.view_layer.update();pts=[o.matrix_world@Vector(v) for o in meshes_of(table) for v in o.bound_box]
table.location.x-=(min(v.x for v in pts)+max(v.x for v in pts))/2
for ob in meshes_of(table):
    ob.name='Workbench | original scanned oak table'
    for mat in ob.data.materials:
        if not mat or not mat.use_nodes:continue
        for p in mat.node_tree.nodes:
            if p.type=='BSDF_PRINCIPLED':
                p.inputs['Specular IOR Level'].default_value=.28;p.inputs['Coat Weight'].default_value=.04
                rough=p.inputs['Roughness']
                if rough.is_linked:
                    src=rough.links[0].from_socket
                    remap=mat.node_tree.nodes.new('ShaderNodeMapRange');remap.inputs['To Min'].default_value=.36;remap.inputs['To Max'].default_value=.64
                    mat.node_tree.links.new(src,remap.inputs[0]);mat.node_tree.links.new(remap.outputs[0],rough)
                else:rough.default_value=.48

# Purposeful storage against the return wall. No specimens, weeds or plants
# are scattered through the environment.
cabinet=import_model('vintage_cabinet_01',height=1.10,at=(-1.67,2.85,0),rot=.06)

P=world(-28,0);pot=import_model('planter_pot_clay',height=.205,at=tuple(P),rot=.25)
SOIL=world(-28,-17.3)
soil=plain('Pot | real moist compost',(.036,.022,.011),.96)
sn,sl=soil.node_tree.nodes,soil.node_tree.links
n=sn.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=220;n.inputs['Detail'].default_value=5
b=sn.new('ShaderNodeBump');b.inputs['Strength'].default_value=.5;b.inputs['Distance'].default_value=.0014
sl.new(n.outputs['Fac'],b.inputs['Height']);sl.new(b.outputs[0],sn.get('Principled BSDF').inputs['Normal'])
cylinder('Pot | compost surface',SOIL.x,SOIL.y,SOIL.z-.013,SOIL.z-.006,.081,soil,verts=64)
grit=[plain('Pot | bark chips',(.045,.023,.010),.94),plain('Pot | compost mineral grains',(.19,.17,.12),.9)]
for i in range(95):
    a=RNG.random()*math.tau;r=math.sqrt(RNG.random())*.078
    sphere('Pot | actual compost grain',(SOIL.x+r*math.cos(a),SOIL.y+r*math.sin(a),SOIL.z-.005),RNG.uniform(.001,.0026),grit[i%2],squash=(1.5,.7,.6))

# Period oil lamp: metal burner and glass chimney, warm illumination matched
# to its actual position. No drawn yellow glass or added sparkling sprites.
lamp_at=world(-58,-.7);oil=import_model('vintage_oil_lamp',height=.36,at=tuple(lamp_at),rot=.2)
FLAME=lamp_at+Vector((0,0,.215))
chimney=plain('Oil lamp | clear original glass chimney',(.94,.97,.98),.055,transmission=1,ior=1.47)
for ob in meshes_of(oil):
    original_name=ob.name
    if 'glass' in original_name:
        ob.data.materials.clear();ob.data.materials.append(chimney)
    if 'flame' in original_name:
        old=ob.data.materials[0]
        photo=next((node.image for node in old.node_tree.nodes if node.type=='TEX_IMAGE'),None)
        fm=bpy.data.materials.new('Oil lamp | original photographed flame');fm.use_nodes=True
        nn,ll=fm.node_tree.nodes,fm.node_tree.links;nn.clear()
        tex=nn.new('ShaderNodeTexImage');tex.image=photo
        bw=nn.new('ShaderNodeRGBToBW');ll.new(tex.outputs['Color'],bw.inputs[0])
        alpha=nn.new('ShaderNodeMapRange');alpha.inputs['From Min'].default_value=.012;alpha.inputs['From Max'].default_value=.045
        ll.new(bw.outputs[0],alpha.inputs[0])
        tr=nn.new('ShaderNodeBsdfTransparent');em=nn.new('ShaderNodeEmission');em.inputs['Strength'].default_value=3.2
        ll.new(tex.outputs['Color'],em.inputs['Color'])
        mix=nn.new('ShaderNodeMixShader');ll.new(alpha.outputs[0],mix.inputs[0]);ll.new(tr.outputs[0],mix.inputs[1]);ll.new(em.outputs[0],mix.inputs[2])
        out=nn.new('ShaderNodeOutputMaterial');ll.new(mix.outputs[0],out.inputs['Surface'])
        ob.data.materials.clear();ob.data.materials.append(fm)
    ob.name='Oil lamp | '+original_name
    for mat in ob.data.materials:
        if not mat or not mat.use_nodes:continue
        if 'glass' in mat.name.lower():
            for p in mat.node_tree.nodes:
                if p.type=='BSDF_PRINCIPLED':
                    p.inputs['Transmission Weight'].default_value=1;p.inputs['Roughness'].default_value=.065
lamp('Oil lamp | warm flame','POINT',tuple(FLAME),energy=5.5,colour=(1,.65,.33),size=.022)
lamp('Oil lamp | reflected warm fill','AREA',(-.9,1.1,1.6),aim=(-.35,2,1.2),energy=12,colour=(1,.76,.48),size=.8)

# A folded cloth, the trowel it rests on and a ball of garden twine.
linen=plain('Tools | old linen cloth',(.34,.31,.23),.9,sheen=.16)
nn,ll=linen.node_tree.nodes,linen.node_tree.links
nv=nn.new('ShaderNodeTexNoise');nv.inputs['Scale'].default_value=850;nv.inputs['Detail'].default_value=2
bn=nn.new('ShaderNodeBump');bn.inputs['Distance'].default_value=.00018;bn.inputs['Strength'].default_value=.3
ll.new(nv.outputs['Fac'],bn.inputs['Height']);ll.new(bn.outputs[0],nn.get('Principled BSDF').inputs['Normal'])
verts=[];faces=[]
for j in range(13):
    for i in range(17):verts.append((.64+i/16*.25,1.83+j/12*.26,.825+.003*math.sin(i*.6)+.004*math.sin(j*.7)))
for j in range(12):
    for i in range(16):
        a=j*17+i;faces.append((a,a+1,a+18,a+17))
me=bpy.data.meshes.new('Folded linen surface');me.from_pydata(verts,[],faces);me.update()
cloth=link(bpy.data.objects.new('Tools | folded potting cloth',me));cloth.data.materials.append(linen)
mod=cloth.modifiers.new('Cloth fold thickness','SOLIDIFY');mod.thickness=.002
steel=aged_metal('Tools | trowel steel',(.34,.37,.35),(.10,.085,.06),rough=(.32,.62),scale=45,tarnish=.45)
handle=plain('Tools | worn beech handle',(.19,.105,.047),.53)
rod('Tools | trowel wooden handle',(.73,1.85,.843),(.79,1.98,.843),.012,handle)
rod('Tools | trowel tang',(.79,1.98,.843),(.82,2.045,.835),.0038,steel)
verts=[(.80,2.02,.836),(.844,2.018,.836),(.87,2.095,.828),(.851,2.143,.829),(.824,2.12,.831),(.808,2.075,.835)]
me=bpy.data.meshes.new('Pressed steel trowel blade');me.from_pydata(verts,[],[(0,1,2,3,4,5)]);me.update()
ob=link(bpy.data.objects.new('Tools | real steel trowel blade',me));ob.data.materials.append(steel)
mod=ob.modifiers.new('Pressed steel thickness','SOLIDIFY');mod.thickness=.0012
twine=plain('Tools | garden jute twine',(.24,.19,.105),.9)
sphere('Tools | ball of jute twine',(.85,2.30,.856),.036,twine,squash=(1,1,.9))
for i in range(27):
    a=i*.31
    wire('Tools | wound jute strands',[(.85+.035*math.cos(t)*math.cos(a),2.30+.035*math.cos(t)*math.sin(a),.856+.031*math.sin(t)) for t in [j*math.tau/80 for j in range(81)]],.00065,twine)

# Galvanized pail: proper wall thickness, rolled beads, rivets, wooden bail
# grip and a physically refracting water surface at six actual heights.
before=set(scene.objects);B=world(36,0);bh=.265
zinc=aged_metal('Bucket | fine galvanized zinc',(.43,.47,.46),(.20,.21,.18),rough=(.36,.58),scale=380,tarnish=.16,hammer=.025)
inner=plain('Bucket | inner zinc',(.29,.32,.31),.38,metal=1)
profile=[(.102,0),(.104,.004),(.107,.009),(.132,bh-.006),(.133,bh),(.129,bh+.002),(.127,bh-.003),(.102,.012),(.001,.012)]
body=lathe('Bucket | galvanized wall and bottom',profile,zinc,at=tuple(B),steps=128);body.data.materials.append(inner)
for f in body.data.polygons:
    if f.normal.dot(f.center-Vector((0,0,f.center.z)))<0:f.material_index=1
for z,r in [(bh,.131),(.038,.108),(.19,.125)]:wire('Bucket | rolled steel bead',[(B.x+r*math.cos(j*math.tau/128),B.y+r*math.sin(j*math.tau/128),B.z+z) for j in range(129)],.002,zinc)
for side in [-1,1]:
    sphere('Bucket | handle lug',(B.x+side*.13,B.y,B.z+bh-.015),.009,zinc,squash=(.6,.9,1.4))
    sphere('Bucket | real rivet',(B.x+side*.135,B.y-.002,B.z+bh-.021),.003,inner)
wire('Bucket | wire bail',[(B.x+.131*math.cos(math.pi-j*math.pi/80),B.y+.012,B.z+bh-.014+.14*math.sin(math.pi-j*math.pi/80)) for j in range(81)],.0023,zinc)
grip=lathe('Bucket | wooden bail grip',[(.007,-.037),(.01,-.03),(.012,-.017),(.012,.017),(.01,.03),(.007,.037)],handle,steps=48)
grip.rotation_euler.y=math.pi/2;grip.location=(B.x,B.y+.012,B.z+bh+.125)
water=plain('Bucket | actual clear water',(.75,.86,.90),.028,transmission=1,ior=1.333)
wn,wl=water.node_tree.nodes,water.node_tree.links;noise=wn.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=210
bump=wn.new('ShaderNodeBump');bump.inputs['Distance'].default_value=.00018;bump.inputs['Strength'].default_value=.15
wl.new(noise.outputs['Fac'],bump.inputs['Height']);wl.new(bump.outputs[0],wn.get('Principled BSDF').inputs['Normal'])
water_ob=cylinder('Bucket | real water level',B.x,B.y,B.z+.23,B.z+.232,.125,water,verts=128)
bucket=list(set(scene.objects)-before)

stems,leaves,leaf_meta=build_plant(scene,world,project)
clear_glass()
key=lamp('Window | moonlit key','AREA',(-.75,3.65,2.45),aim=(-.25,2,1.05),energy=105,colour=(.64,.76,1),size=1.05,size_y=1.35)
fill=lamp('Window | right reflected fill','AREA',(1.1,3.6,2.15),aim=(.15,2,1.15),energy=28,colour=(.62,.76,1),size=.65,size_y=1.1)
for light in [key,fill]:
    light.visible_camera=False;light.visible_glossy=False;light.visible_transmission=False
lamp('Room | very soft reflected light','AREA',(.2,-.8,2.4),aim=(0,2,1.2),energy=22,colour=(.76,.83,.95),size=2.0)
lamp('Room | cool light reflected from plaster','AREA',(1.9,-.4,2.15),aim=(-1.1,1.4,1.2),energy=26,colour=(.66,.77,.96),size=1.3,size_y=1.7)
for light in scene.objects:
    if light.type=='LIGHT' and light.data.type=='AREA':
        light.visible_camera=False;light.visible_glossy=False;light.visible_transmission=False
strip=lamp('Room | narrow side window reflection','AREA',(-1.65,.5,2.0),aim=(-.1,2,1.3),energy=3.5,colour=(.67,.78,1),size=.085,size_y=1.15)
strip.visible_camera=False;strip.visible_transmission=False
world_mat=bpy.data.worlds.new('Night beyond the conservatory');world_mat.use_nodes=True;scene.world=world_mat
nn,ll=world_mat.node_tree.nodes,world_mat.node_tree.links
env=nn.new('ShaderNodeTexEnvironment')
env.image=bpy.data.images.load('C:/Users/crist/Tools/render/assets/hdri/approaching_storm.hdr',check_existing=True)
hsv=nn.new('ShaderNodeHueSaturation');hsv.inputs['Saturation'].default_value=.25
ll.new(env.outputs['Color'],hsv.inputs['Color'])
tint=nn.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=(.23,.37,.61,1)
ll.new(hsv.outputs['Color'],tint.inputs[1]);ll.new(tint.outputs[0],nn.get('Background').inputs['Color'])
nn.get('Background').inputs['Strength'].default_value=.16

META={'source':'Blender / Cycles','size':[W,H],'bench':BENCH,'cm':CM,'flame':project(FLAME),
      'plantBox':[-58,-110,116,114],'leafNodes':leaf_meta,'bucketAnchor':project(world(36,-12.5)),
      'noAiGeneration':True,'artVersion':3,'botanicalVersion':3,'backgroundFile':'conservatory-v3.webp',
      'bucketVersion':'v3','conservatory':True,**gameplay_data()}
lip=project(B+Vector((-.132,0,bh)));META['bucketLipOffset']=[(lip[i]-META['bucketAnchor'][i])/CM for i in range(2)]
scene['game_landmarks']=json.dumps(META)
(OUT/'scene.json').write_text(json.dumps(META,indent=2),encoding='utf8')
cycles(scene,SAMPLES,W,H,exposure=.35,glare=False)
if '--gpu' not in sys.argv:scene.cycles.device='CPU'
scene.cycles.transparent_max_bounces=24;scene.cycles.adaptive_threshold=.012;scene.render.use_persistent_data=True
scene.render.image_settings.color_mode='RGBA'
focus=link(bpy.data.objects.new('Focus | the botanical specimen',None));focus.location=world(-23,-45)
camera.dof.use_dof=True;camera.dof.focus_object=focus;camera.dof.aperture_fstop=8
if '--save' in sys.argv:
    bpy.context.preferences.filepaths.save_version=0
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
    bpy.ops.outliner.orphans_purge(do_recursive=True);bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'fibonacci.blend'),compress=True)

def render(name,transparent=False,subjects=None):
    scene.render.filepath=str(OUT/(name+'.png'));scene.render.film_transparent=transparent
    scene.render.use_border=bool(subjects)
    if subjects:
        bpy.context.view_layer.update()
        pts=[project(o.matrix_world@Vector(v)) for o in subjects for v in o.bound_box]
        scene.render.use_crop_to_border=False
        scene.render.border_min_x=max(0,(min(p[0] for p in pts)-8)/W);scene.render.border_max_x=min(1,(max(p[0] for p in pts)+8)/W)
        scene.render.border_min_y=max(0,1-(max(p[1] for p in pts)+8)/H);scene.render.border_max_y=min(1,1-(min(p[1] for p in pts)-8)/H)
    print('CONSERVATORY_RENDER',name,flush=True);bpy.ops.render.render(write_still=True)

if MODE=='preview':render('preview')
elif MODE in {'layers','plant'}:
    for ob in stems+leaves+bucket:ob.hide_render=True
    if MODE=='layers':render('background')
    # Preserve the real contact shadow on this actual scanned tabletop.
    # Camera-invisible metal still casts shadows and is seen by other rays.
    if MODE=='layers':
        for ob in bucket:ob.hide_render=False;ob.visible_camera=False
        render('bucket-shadow-plate')
        for ob in bucket:ob.hide_render=True;ob.visible_camera=True
    for ob in scene.objects:
        if ob.type not in {'LIGHT','CAMERA','EMPTY'}:ob.visible_camera=False
    for ob in stems+leaves+bucket:ob.hide_render=True;ob.visible_camera=True
    camera.dof.use_dof=False;scene.cycles.samples=min(SAMPLES,192)
    for ob in stems:ob.hide_render=False
    render('stems',True,stems)
    for ob in stems:ob.hide_render=True
    for i,ob in enumerate(leaves):
        ob.hide_render=False;render(f'leaf-{i:02}',True,[ob]);ob.hide_render=True
    if MODE=='layers':
        for ob in bucket:ob.hide_render=False
        for i in range(6):
            water_ob.location.z=max(.013,.232*(1-i/5))-.232
            render(f'bucket-{i}',True,bucket)
    scene.render.use_border=False
    from fibonacci_occlusion import render_stem_occlusion
    render_stem_occlusion(scene,OUT)
else:raise ValueError('Choose preview or layers')
print('CONSERVATORY_DONE',flush=True)
