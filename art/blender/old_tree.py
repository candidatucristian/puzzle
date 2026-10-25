"""The Old Tree: an original, physically lit root-observation case.

Every clue is real geometry in the Cycles scene, including the fifteen
continuous root segments, eight paper tags and seven engraved route plates.
Only photographed CC0 surface scans are reused; no generated picture assets.

blender --background --factory-startup --python art/blender/old_tree.py -- --width 2880 --samples 384 --pack
node art/blender/old_tree_publish.mjs
"""
import bpy, math, random, sys, json, re
from pathlib import Path
from mathutils import Vector, noise
from bpy_extras.object_utils import world_to_camera_view

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from kit import arg, fresh, link, box, bevel, cylinder, sphere, lathe, plain, aged_metal, lamp, cycles
from hall_common import scan, clear_glass
from fibonacci_geranium import scanned_leaves, leaf_material

ROOT = HERE.parents[1]
ART_VERSION = 2
OUT = Path(arg('--out', str(ROOT / '.artifacts/old-tree-v2'))).resolve()
OUT.mkdir(parents=True, exist_ok=True)
WIDTH = int(arg('--width', '2880'))
HEIGHT = round(WIDTH * 0.625)
SAMPLES = int(arg('--samples', '384'))
RNG = random.Random(19611013)
SOURCE = (ROOT / 'src/levels/binarytree/puzzle.js').read_text(encoding='utf-8')
def clue_array(name):
    return json.loads(re.search(rf'{name}\s*=\s*Object\.freeze\((\[[^\]]+\])\)', SOURCE).group(1))
PATHS, LETTERS = clue_array('BINARY_PATHS'), clue_array('BINARY_LEAVES')

scene = fresh()
scene.name = 'The Old Tree | Ivy Ashcombe botanical root case'
scene['provenance'] = 'Original Blender case, roots and props; Poly Haven CC0 photographed surface scans and original scanned Pelargonium leaf meshes.'
scene['no_ai_generated_images'] = True
scene['puzzle_paths'] = ' '.join(PATHS)
scene['puzzle_leaves'] = ' '.join(LETTERS)

def slab(name, x0, x1, y0, y1, z0, z1, material, edge=.001):
    ob = box(name, x0, x1, y0, y1, z0, z1, material)
    if edge: bevel(ob, edge, 3)
    return ob

def mesh(name, verts, faces, material, smooth=False):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    ob = link(bpy.data.objects.new(name, data))
    data.materials.append(material)
    if smooth:
        for poly in data.polygons: poly.use_smooth = True
    return ob

def curve(name, coords, radius, material, taper=1.0):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 16
    data.bevel_depth = radius
    data.bevel_resolution = 4
    data.use_fill_caps = True
    sp = data.splines.new('POLY')
    sp.points.add(len(coords)-1)
    for i, (p, co) in enumerate(zip(sp.points, coords)):
        p.co = (*co, 1)
        p.radius = 1 + (taper-1)*i/max(1, len(coords)-1)
    ob = link(bpy.data.objects.new(name, data))
    data.materials.append(material)
    return ob

def rod(name, a, b, radius, material):
    a, b = Vector(a), Vector(b)
    ob = cylinder(name, 0, 0, 0, (b-a).length, radius, material, verts=20)
    ob.location = a
    ob.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    return ob

OAK = scan('Case | quarter-sawn English oak', 'dark_wood', size=.55,
           tint=(.76,.63,.45), bright=.77, sat=.45, rough=(.36,.61),
           bump=.30, coat=.12, upright=True, vary=.08)
OAK_X = scan('Case | oak rails across the grain', 'dark_wood', size=.55,
             tint=(.76,.63,.45), bright=.77, sat=.45, rough=(.36,.61), bump=.3, coat=.12)
TABLE = scan('Bench | rubbed walnut boards', 'rosewood_veneer1', size=.85,
             tint=(.77,.65,.49), bright=.65, sat=.45, rough=(.33,.60), bump=.28, coat=.16)
WALL = scan('Study | muted olive lime plaster', 'plastered_wall_04', size=1.8,
            tint=(.24,.29,.18), bright=.47, sat=.18, rough=(.83,.96), bump=.32)
PANEL = scan('Study | shaded oak panelling', 'dark_wood', size=.9,
             tint=(.44,.38,.28), bright=.42, sat=.3, rough=(.48,.72), bump=.27, upright=True)
BRASS = aged_metal('Case | dull oxidised brass', (.44,.30,.12), (.067,.055,.027),
                   rough=(.31,.57), scale=70, tarnish=.60)
PLATE_BRASS = aged_metal('Routes | hand-polished readable brass', (.62,.46,.23), (.14,.09,.035),
                         rough=(.36,.58), scale=80, tarnish=.32)
PLATE_BRASS.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = .68
BLACK = plain('Hardware | blackened slotted steel', (.025,.022,.017), rough=.54, metal=.72)
INK = plain('Labels | faded iron gall ink', (.025,.018,.010), rough=.92, spec=.12)
GLASS = plain('Case | thin clear old glass', (.95,.98,.96), rough=.025, transmission=1, ior=1.48)
PAPER = plain('Labels | fibrous warm rag paper', (.62,.53,.36), rough=.91, sheen=.1)
pb = PAPER.node_tree.nodes['Principled BSDF']
pn, pl = PAPER.node_tree.nodes, PAPER.node_tree.links.new
tex = pn.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = 1100
tex.inputs['Detail'].default_value = 3
bump = pn.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = .14
bump.inputs['Distance'].default_value = .00015
pl(tex.outputs['Fac'], bump.inputs['Height']); pl(bump.outputs['Normal'], pb.inputs['Normal'])
paper_col = pn.new('ShaderNodeValToRGB')
paper_col.color_ramp.elements[0].color = (.39,.30,.17,1)
paper_col.color_ramp.elements[1].color = (.72,.65,.48,1)
pl(tex.outputs['Fac'], paper_col.inputs[0]); pl(paper_col.outputs['Color'], pb.inputs['Base Color'])

def organic_material(name, colours, scale, relief, rough=.77, subsurface=0):
    material = plain(name, colours[0], rough=rough)
    n, l = material.node_tree.nodes, material.node_tree.links.new
    b = n['Principled BSDF']
    tc = n.new('ShaderNodeTexCoord')
    nz = n.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale
    nz.inputs['Detail'].default_value = 5; nz.inputs['Roughness'].default_value = .74
    l(tc.outputs['Object'], nz.inputs['Vector'])
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (*colours[0],1)
    ramp.color_ramp.elements[1].color = (*colours[1],1)
    l(nz.outputs['Fac'], ramp.inputs[0]); l(ramp.outputs[0], b.inputs['Base Color'])
    fine = n.new('ShaderNodeTexNoise'); fine.inputs['Scale'].default_value = scale*9
    fine.inputs['Detail'].default_value = 3; l(tc.outputs['Object'],fine.inputs['Vector'])
    bp = n.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .37
    bp.inputs['Distance'].default_value = relief
    l(fine.outputs['Fac'],bp.inputs['Height']); l(bp.outputs['Normal'],b.inputs['Normal'])
    b.inputs['Subsurface Weight'].default_value = subsurface
    b.inputs['Subsurface Radius'].default_value = (.002,.001,.0004)
    return material

EARTH = scan('Specimen | photographed damp loam and tiny mineral grains', 'gravel_road', size=.80,
             tint=(.48,.39,.29), bright=.23, sat=.35, rough=(.70,.91), bump=.72)
ROOTMAT = organic_material('Specimen | translucent ivory root tissue', ((.17,.105,.045),(.43,.30,.14)), 210, .00014, .61, .12)
ROOTHAIR = plain('Specimen | fine short root hairs', (.31,.23,.12), rough=.72)
STEM = organic_material('Plant | supple pale-green stem', ((.075,.14,.027),(.22,.31,.065)), 260, .00009, .50, .17)

# Real bench construction, with individual softened boards and open joints.
for i in range(4):
    y0 = -.36+i*.205
    slab('Bench | separate hand-planed walnut board', -.95,.95,y0,y0+.202,.765,.803,TABLE,.004)
slab('Bench | deep front apron',-.91,.91,-.348,-.318,.65,.766,TABLE,.003)
for x in (-.82,.82):
    for y in (-.25,.32): slab('Bench | square timber leg',x-.035,x+.035,y-.035,y+.035,.0,.77,TABLE,.004)

# The wall remains quiet and shaded, with no white paint or scene fog.
slab('Study | olive wall', -3,3,.83,.94,0,3.0,WALL,.001)
slab('Study | oak dado', -3,3,.78,.83,0,1.02,PANEL,.002)
slab('Study | rounded oak dado cap', -3,3,.75,.85,1.01,1.045,OAK_X,.006)
for x in [-2+i*.4 for i in range(11)]:
    slab('Study | panel stile',x-.012,x+.012,.756,.785,.16,1.0,PANEL,.002)

# Small closed reference book: naturally worn corners, no competing clues.
CLOTH = organic_material('Book | old moss-green linen', ((.035,.052,.023),(.10,.13,.065)), 900, .00013, .92)
PAGES = plain('Book | aged page block',(.37,.31,.21),rough=.94)
book = slab('Book | cut page edges', .53,.77,-.04,.25,.812,.851,PAGES,.003)
for z in (.805,.852): slab('Book | cloth covered board', .522,.778,-.047,.257,z,z+.006,CLOTH,.004)
slab('Book | closed cloth spine',.52,.533,-.047,.257,.808,.858,CLOTH,.006)
for z in [.818+i*.003 for i in range(10)]:
    curve('Book | individual page edge',[(.538,-.040,z),(.764,-.040,z+.0003)],.00014,INK)

# A shallow rhizobox, glazed above the damp root panel, with a ridged roof.
X0,X1 = -.47,.47
Y0,Y1 = -.025,.175
BOTTOM,TOP,SOIL = .839,1.570,1.355
slab('Case | solid moulded oak plinth',-.497,.497,-.055,.205,.805,.838,OAK_X,.006)
slab('Case | upper plinth moulding',-.484,.484,-.044,.194,.837,.852,OAK_X,.003)
slab('Case | broad front route rail',X0,X1,-.047,-.020,.850,.895,OAK_X,.003)
for x in (X0,X1):
    for y in (Y0,Y1):
        slab('Case | narrow oak corner post',x-.011,x+.011,y-.010,y+.010,.85,TOP,OAK,.002)
        slab('Case | brass corner shoe',x-.012,x+.012,y-.011,y+.011,.85,.884,BRASS,.001)
for y in (Y0,Y1):
    slab('Case | top oak rail',X0,X1,y-.011,y+.011,TOP-.017,TOP+.003,OAK_X,.002)
for x in (X0,X1):
    slab('Case | top side rail',x-.011,x+.011,Y0,Y1,TOP-.017,TOP+.003,OAK_X,.002)
slab('Case | rear clear glazing',X0+.012,X1-.012,Y1-.001,Y1+.001,.895,TOP-.018,GLASS,.0003)
for x in (X0+.004,X1-.004):
    slab('Case | side clear glazing',x-.0009,x+.0009,Y0+.012,Y1-.012,.895,TOP-.018,GLASS,.0002)

RIDGE = 1.680
for y in (Y0,Y1):
    roof = mesh('Case | thin sloping roof glass',[(X0,y,TOP),(X1,y,TOP),(X1,.075,RIDGE),(X0,.075,RIDGE)],[(0,1,2,3)],GLASS)
    mod=roof.modifiers.new('Actual 1.5 mm glass thickness','SOLIDIFY');mod.thickness=.0015
    rod('Case | brass roof bead', (X0,y,TOP),(X1,y,TOP),.0028,BRASS)
for x in (X0,X1):
    rod('Case | sloping gable bead',(x,Y0,TOP),(x,.075,RIDGE),.0026,BRASS)
    rod('Case | sloping gable bead',(x,.075,RIDGE),(x,Y1,TOP),.0026,BRASS)
    gable=mesh('Case | closed triangular end glazing',[(x,Y0,TOP),(x,Y1,TOP),(x,.075,RIDGE)],[(0,1,2)],GLASS)
    mod=gable.modifiers.new('Actual 1.5 mm end glass thickness','SOLIDIFY');mod.thickness=.0015
rod('Case | brass ridge cap',(X0-.006,.075,RIDGE),(X1+.006,.075,RIDGE),.0034,BRASS)

# The front soil surface is an actual displaced mesh. Every root is just in
# front of it, directly behind the glass, rather than painted over a plate.
verts,faces = [],[]
NX,NZ = 200,100
for j in range(NZ+1):
    z=.895+(SOIL-.895)*j/NZ
    for i in range(NX+1):
        x=-.454+.908*i/NX
        texture = noise.noise_vector(Vector((x*180,z*180,2.1)))
        rim = .0022*noise.noise(Vector((x*220,0,3.7))) if j==NZ else 0
        verts.append((x,.006+texture.x*.0013,z+rim))
for j in range(NZ):
    for i in range(NX):
        a=j*(NX+1)+i;faces.append((a,a+NX+1,a+NX+2,a+1))
mesh('Specimen | physically uneven loam face',verts,faces,EARTH,True)
slab('Specimen | soil volume',-.454,.454,.009,.157,.895,SOIL-.002,EARTH,.001)

# Tiny individually modeled grains are combined in one mesh, not tiled as
# large rocks. Their low contrast leaves the root paths easy to follow.
grainverts,grainfaces=[],[]
for i in range(2800):
    x,z=RNG.uniform(-.451,.451),RNG.uniform(.899,SOIL-.003)
    r=RNG.uniform(.00035,.0018)
    y=.0045
    base=len(grainverts)
    grainverts.extend([(x-r,y,z),(x+r,y,z),(x,y-r*.8,z),(x,y+r*.8,z),(x,y,z-r*.7),(x,y,z+r*.7)])
    grainfaces.extend(tuple(base+v for v in face) for face in [(0,2,4),(2,1,4),(1,3,4),(3,0,4),(2,0,5),(1,2,5),(3,1,5),(0,3,5)])
mesh('Specimen | thousands of small loam grains',grainverts,grainfaces,EARTH,True)
topverts,topfaces=[],[]
for j in range(18):
    y=.006+j*.0086
    for i in range(121):
        x=-.451+.902*i/120
        topverts.append((x,y,SOIL-.001+noise.noise(Vector((x*210,y*210,2)))*.0024))
for j in range(17):
    for i in range(120):
        a=j*121+i;topfaces.append((a,a+1,a+122,a+121))
mesh('Specimen | irregular top surface of trapped damp soil',topverts,topfaces,EARTH,True)

# Exact binary topology: one entrance, three successive forks, eight tips.
# The tiny, deterministic asymmetries never change left/right ordering.
levels = [
    [(0,-.001,1.295)],
    [(-.195,-.001,1.196),(.227,-.001,1.176)],
    [(-.316,-.001,1.066),(-.075,-.001,1.087),(.106,-.001,1.057),(.343,-.001,1.079)],
    [(x,-.001,.968+off) for x,off in zip([-.393,-.281,-.169,-.057,.057,.169,.281,.393],[.003,-.003,.001,-.004,.002,-.002,.003,-.001])],
]
segments=[((0,-.001,SOIL+.001),levels[0][0],0)]
for depth in range(3):
    for i,a in enumerate(levels[depth]):
        for child in (2*i,2*i+1):segments.append((a,levels[depth+1][child],depth+1))

for index,(aa,bb,depth) in enumerate(segments):
    a,b=Vector(aa),Vector(bb);coords=[]
    dx=b.x-a.x
    for j in range(49):
        t=j/48; eased=t*t*(3-2*t)
        x=a.x+dx*(.2*t+.8*eased)+math.sin(t*math.pi)*(math.sin(t*10+index)*.0031+math.sin(t*29+index)*.00032)
        y=-.0015+math.sin(t*math.pi)*math.sin(t*5+index)*.0005
        z=a.z+(b.z-a.z)*t
        coords.append((x,y,z))
    radius=[.0028,.00235,.0016,.00095][depth]
    root=curve(f'Root | continuous readable segment {index:02}',coords,radius,ROOTMAT,taper=.72 if depth<3 else .30)
    for j,p in enumerate(root.data.splines[0].points):
        p.radius *= 1+.055*math.sin(j*.55+index)+.023*math.sin(j*1.73)
    # Root hairs remain millimetres long, below the scale of a clue branch.
    for j in range(4,46,3):
        point=Vector(coords[j]);side=-1 if j%2 else 1
        end=point+Vector((side*RNG.uniform(.0006,.0019),-.0001,-RNG.uniform(.0003,.0012)))
        curve('Root | microscopic absorbent hair',[point,end],.000055,ROOTHAIR,taper=.12)

# The plant retains the actual scan topology, folds, original leaf UVs,
# photographed veins, normal maps and roughness. Only its shoot is authored.
curve('Plant | continuous living stem',[(0,.004,SOIL),(.002,.004,1.397),(-.009,.015,1.438),(-.005,.019,1.491)],.0028,STEM,taper=.52)

leaf_models=scanned_leaves()
scanned_leaf_material=leaf_material()
for i,(z,dx,dz,length,roll) in enumerate([
    (1.414,-1,-.14,.091,-.28),(1.425,1,.20,.087,.38),
    (1.460,-.78,.65,.073,.18),(1.481,1,.40,.067,-.37),
    (1.491,-.13,1,.047,.43),
]):
    stempoint=Vector((-.004,.012,z))
    forward=Vector((dx,.05,dz)).normalized()
    across=Vector((forward.z,0,-forward.x)).normalized()
    normal=across.cross(forward).normalized()
    side=across*math.cos(roll)+normal*math.sin(roll)
    normal=side.cross(forward).normalized()
    leafbase=stempoint+forward*.016
    curve('Plant | slender leaf petiole',[stempoint,leafbase],.00115,STEM,taper=.55)
    model=leaf_models[[0,4,9,15,20][i]%len(leaf_models)]
    verts=[tuple(leafbase+length*(side*u+forward*s+normal*depth)) for u,s,depth in model['verts']]
    ob=mesh(f'Plant | original photographed Pelargonium leaf {i+1}',verts,model['faces'],scanned_leaf_material,True)
    uv=ob.data.uv_layers.new(name='Original botanical scan UV')
    for loop,co in zip(uv.data,model['uvs']):loop.uv=co

# Fonts are actual installed typefaces embedded with the editable scene.
SERIF=bpy.data.fonts.load('C:/Windows/Fonts/georgiai.ttf')
MONO=bpy.data.fonts.load('C:/Windows/Fonts/courbd.ttf')

def text(name,body,at,size,font=SERIF,material=INK,depth=.00002):
    data=bpy.data.curves.new(name,'FONT');data.body=body;data.font=font
    data.size=size;data.align_x='CENTER';data.align_y='CENTER'
    data.resolution_u=16;data.extrude=depth
    ob=link(bpy.data.objects.new(name,data));data.materials.append(material)
    ob.location=at;ob.rotation_euler=(math.pi/2,0,0)
    return ob

def screw(x,y,z,r=.0022):
    ob=cylinder('Hardware | rounded slotted screw',0,0,0,.0013,r,BRASS,verts=24)
    ob.location=(x,y,z);ob.rotation_euler=(math.pi/2,0,0)
    curve('Hardware | dark cut screw slot',[(x-r*.67,y-.0014,z-.00015),(x+r*.67,y-.0014,z+.00015)],r*.12,BLACK)

# Tags are subtly bent meshes, with thread and a pierced attachment point.
for i,(tip,letter) in enumerate(zip(levels[-1],LETTERS)):
    x=tip[0];z=.925+(i%2)*.0008;w,h=.048,.036
    verts=[]
    for row in range(5):
        v=row/4
        for col in range(7):
            u=col/6
            verts.append((x+(u-.5)*w,-.0095-.0014*math.sin(u*math.pi)*math.sin(v*math.pi),z+(v-.5)*h))
    faces=[]
    for row in range(4):
        for col in range(6):
            a=row*7+col;faces.append((a,a+1,a+8,a+7))
    ob=mesh(f'Tag | physical paper specimen {letter} {i}',verts,faces,PAPER,True)
    mod=ob.modifiers.new('Actual rag-paper thickness','SOLIDIFY');mod.thickness=.00030
    text(f'Tag | ink letter {letter} {i}',letter,(x,-.0114,z-.001),.026)
    curve('Tag | fine specimen thread',[(x,tip[1]-.002,tip[2]),(x-.0008,-.008,z+h/2-.003)],.00022,ROOTHAIR)
    sphere('Tag | small pierced thread hole',(x,-.011,z+h/2-.003),.00065,INK,squash=(1,.3,1))

# Seven short routes are engraved into individual brass plates. The dark
# letter recess sits in the metal surface; it is never a screen text overlay.
PLATE_X=[]
for i,path in enumerate(PATHS):
    x=-.388+i*(.776/6);PLATE_X.append(x)
    plate=slab('Route | separate brass specimen plaque',x-.0545,x+.0545,-.0515,-.048,.851,.891,PLATE_BRASS,.0013)
    cutter=text('Route | letter engraving cutter',path,(x,-.0511,.8705),.035,MONO,INK,depth=.0007)
    bpy.context.view_layer.update()
    cutter_mesh=bpy.data.meshes.new_from_object(cutter.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    cut_ob=link(bpy.data.objects.new('Route | solid lettering cutter',cutter_mesh));cut_ob.matrix_world=cutter.matrix_world.copy()
    boolean=plate.modifiers.new('Actual recessed letter engraving','BOOLEAN');boolean.operation='DIFFERENCE'
    boolean.object=cut_ob;boolean.solver='EXACT'
    bpy.context.view_layer.objects.active=plate
    bpy.ops.object.modifier_apply(modifier=boolean.name)
    bpy.data.objects.remove(cutter,do_unlink=True);bpy.data.objects.remove(cut_ob,do_unlink=True)
    ink=text('Route | blackened engraved '+path,path,(x,-.052,.8705),.035,MONO,INK,depth=.00003)
    ink.visible_shadow=False
    for sx in (-.047,.047):screw(x+sx,-.0522,.8705,r=.0017)

# Two small hinges and fixings finish the case without crossing the clues.
for x in (-.35,.35):
    slab('Hardware | roof hinge leaf',x-.018,x+.018,Y1-.011,Y1+.007,1.543,1.568,BRASS,.0005)
    rod('Hardware | roof hinge pin',(x-.02,Y1+.007,1.569),(x+.02,Y1+.007,1.569),.0027,BRASS)
    for off in (-.011,.011):screw(x+off,Y0-.012,1.552,r=.0018)

# Fine glazing remains genuinely transparent over the entire specimen.
front=slab('Case | continuous 1.6 mm front pane',-.455,.455,-.0220,-.0204,.896,1.549,GLASS,.0002)
# Sparse droplets are confined to the upper corners, clear of all root paths.
for side in (-1,1):
    for i in range(15):
        x=side*RNG.uniform(.399,.447);z=RNG.uniform(1.40,1.54)
        sphere('Glass | tiny corner condensation bead',(x,-.0231,z),RNG.uniform(.00035,.0011),GLASS,squash=(1,.35,1.4))

# Restrained moonlight and a practical outside the photograph illuminate the
# specimen. No frontal strip light is reflected over the specimen tags.
world=bpy.data.worlds.new('Study | low blue night fill');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.29,.40,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.035;scene.world=world
lamp('Window | broad cool night light','AREA',(-1.22,-.15,2.02),energy=22,colour=(.66,.78,1.0),size=.85,aim=(0,.03,1.15))
lamp('Practical | warm lamplight outside frame','AREA',(-.79,-.65,1.47),energy=15,colour=(1.0,.70,.39),size=.36,aim=(0,.02,1.15))
lamp('Specimen | gentle neutral bounce','AREA',(1.30,-.25,1.59),energy=6,colour=(.93,.90,.79),size=.72,aim=(0,.01,1.19))
lamp('Roof | slim reflected window','AREA',(.83,.24,1.89),energy=4,colour=(.63,.76,1.0),size=.40,aim=(.3,0,1.38))

camera=bpy.data.cameras.new('Camera | 68 mm botanical specimen photograph')
camera.lens=68;camera.sensor_width=36;camera.sensor_fit='HORIZONTAL'
cam=link(bpy.data.objects.new('Camera',camera));cam.location=(.82,-3.55,1.80)
cam.rotation_euler=(Vector((0,.055,1.235))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.camera=cam
focus=link(bpy.data.objects.new('Focus | root tissue and physical labels',None));focus.location=(0,-.004,1.19)
camera.dof.use_dof=True;camera.dof.focus_object=focus;camera.dof.aperture_fstop=11
camera.clip_start=.03;camera.clip_end=25

clear_glass()
cycles(scene,SAMPLES,WIDTH,HEIGHT,exposure=-.10,glare=False)
scene.cycles.adaptive_threshold=.008
scene.cycles.max_bounces=14;scene.cycles.transmission_bounces=12
scene.render.image_settings.color_depth='16'
if '--cpu' in sys.argv:scene.cycles.device='CPU'
bpy.context.view_layer.update()

def project(co):
    p=world_to_camera_view(scene,cam,Vector(co))
    return [round(p.x*WIDTH,3),round((1-p.y)*HEIGHT,3)]

meta={
    'version':ART_VERSION,'width':WIDTH,'height':HEIGHT,
    'paths':PATHS,'letters':LETTERS,
    'tips':[project(tip) for tip in levels[-1]],
    'tagCentres':[project((tip[0],-.0114,.925+(i%2)*.0008)) for i,tip in enumerate(levels[-1])],
    'routeCentres':[project((x,-.052,.8705)) for x in PLATE_X],
    'specimenBounds':[project((-.50,-.055,1.70)),project((.50,-.055,.805))],
    'provenance':scene['provenance'],
}
corners=[project((x,y,z)) for x in (-.505,.505) for y in (-.06,.21) for z in (.80,1.69)]
left,top=min(p[0] for p in corners),min(p[1] for p in corners)
meta['safeBounds']={'x':left,'y':top,'width':max(p[0] for p in corners)-left,'height':max(p[1] for p in corners)-top}
(OUT/'old-tree.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
scene.render.filepath=str(OUT/'old-tree.png')
if '--pack' in sys.argv:
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'old-tree.blend'),compress=True)
bpy.ops.render.render(write_still=True)
print('OLD_TREE_RENDERED',scene.render.filepath,flush=True)
