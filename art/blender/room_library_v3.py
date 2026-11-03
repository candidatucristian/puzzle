"""Room II: a spacious, physically lit library. Blender 4.5 / Cycles only.

Preview: blender -b -t 6 -P art/blender/room_library_v3.py -- --width 1440 --samples 64 --only preview
Final:   blender -b -t 6 -P art/blender/room_library_v3.py -- --width 2880 --samples 512 --only plate,coffer
No published interaction geometry is changed until the publisher runs.
"""
import bpy, math, os, sys, json, random
from mathutils import Vector
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import curtain, curtain_pole, rug, rug_material
from library_details import curve, library_case, banker_lamp, router, clocks, volume
from hall_common import darken_model as matte_model

OUT=arg('--out',os.path.join(ROOT,'.artifacts/room-library-v3'))
os.makedirs(OUT,exist_ok=True)
WIDTH=int(arg('--width','2880')); SAMPLES=int(arg('--samples','512'))
ONLY=set(arg('--only','plate,coffer').split(',')); RNG=random.Random(220326)
scene,HEIGHT=stage(WIDTH,eye=(-16,151,-125),look=(8,145,600),lens=28,lift=-.025)
X0,X1,BACK,TOP=-315,315,650,335

WOOD=scan('aged walnut joinery','dark_wood',size=.85,tint=(.53,.40,.30),bright=.65,sat=.55,rough=(.51,.73),bump=.25,upright=True,vary=.06)
RAILS=scan('walnut cross grain','dark_wood',size=.85,tint=(.53,.40,.30),bright=.65,sat=.55,rough=(.51,.73),bump=.25,vary=.06)
DESK=scan('desk quarter sawn oak','dark_wood',size=1.3,tint=(.63,.49,.35),bright=.72,sat=.55,rough=(.48,.68),bump=.21,vary=.04)
WALL=scan('mineral olive plaster','plastered_wall_04',size=2.0,tint=(.33,.39,.32),bright=.69,sat=.15,rough=(.86,.98),bump=.22)
CEILING=scan('limewash ceiling','plastered_wall_04',size=2.4,tint=(.70,.68,.58),bright=.72,sat=.05,rough=(.88,.99),bump=.15)
FLOOR=scan('worn oak floorboards','wood_floor_worn',size=1.8,tint=(.67,.53,.38),bright=.63,sat=.5,rough=(.56,.79),bump=.24,vary=.13)
BRASS=aged_metal('unlacquered library brass',(.44,.31,.14),(.075,.053,.027),rough=(.40,.65),scale=95,tarnish=.48)
GAP=plain('joinery shadow',(.012,.01,.007),rough=1)
PAGES=paper('aged rag paper page edges',(.53,.46,.34),.3)
COVERS=[scan('muted calf binding '+str(i),'fabric_leather_02',size=.2,tint=c,bright=.7,sat=.12,rough=(.57,.83),bump=.28)
        for i,c in enumerate(((.31,.12,.09),(.14,.22,.18),(.13,.17,.24),(.35,.25,.13),(.23,.15,.19),(.24,.22,.16)))]
VELVET=scan('heavy olive wool curtains','velour_velvet',size=.55,tint=(.20,.25,.20),bright=.55,sat=.25,rough=(.85,.97),bump=.18)
GLASS=plain('old clear window glass',(.95,.97,1),rough=.065,transmission=1,ior=1.46)

# Full-thickness architecture. Board joints are real gaps, not drawn lines.
box_cm('subfloor',X0-20,X1+20,-6,-.2,-170,BACK+20,GAP)
for i in range(27):
    xx=X0+i*24
    start=-170-(i%3)*93
    for j in range(5):
        d0=max(-170,start+j*238); d1=min(BACK+10,start+(j+1)*238)
        if d1>d0:
            box_cm('individual oak floorboard',xx,xx+23.85,-2,0,d0+.10,d1-.10,FLOOR,.09)
            # Recessed dark iron pin heads at each board end.
            for dd in (d0+3,d1-3):
                for x in (xx+3,xx+20): cylinder('floor pin',M(x),M(dd),-.0004,.0001,.00065,GAP,verts=8)
box_cm('rear plaster wall',X0-15,X1+15,0,TOP,BACK,BACK+20,WALL)
box_cm('left plaster wall',X0-20,X0,0,TOP,-170,BACK+20,WALL)
right=box_cm('right plaster wall',X1,X1+20,0,TOP,-170,BACK+20,WALL)
box_cm('plaster ceiling',X0-15,X1+15,TOP,TOP+15,-170,BACK+15,CEILING)

def wainscot(backwall,at,lo,hi):
    def part(name,a,b,z0,z1,depth,mat):
        return box_cm(name,a,b,z0,z1,at-depth,at,mat,.25) if backwall else box_cm(name,at,at+depth,z0,z1,a,b,mat,.25)
    part('dado back',lo,hi,0,91,1.2,WOOD)
    for z,h,proud in ((0,11,4),(11,2,3),(82,6,3),(88,3,4),(91,1.2,4.5)):
        part('dado moulding',lo,hi,z,z+h,proud,RAILS)
    n=round((hi-lo)/61)
    for i in range(n):
        a=lo+i*(hi-lo)/n; b=lo+(i+1)*(hi-lo)/n
        part('dado stile',a,a+4,12,83,2.8,WOOD)
        part('raised walnut panel',a+10,b-6,20,75,2.0,WOOD)
wainscot(True,BACK,X0,X1)
wainscot(False,X0,-160,BACK)
# The right-hand dado stops at the window reveal.
for a,b in ((-160,259),(501,BACK)):
    root=assembled('right dado',lambda a=a,b=b:wainscot(False,0,a,b),at=(X1,0,0))
    root.scale.x=-1
for z,deep,h in ((TOP-15,7,4),(TOP-11,5,5),(TOP-6,3,6)):
    box_cm('rear cornice',X0,X1,z,z+h,BACK-deep,BACK,RAILS,.55)
    for x,sign in ((X0,1),(X1,-1)):
        box_cm('side cornice',*sorted((x,x+deep*sign)),z,z+h,-160,BACK,RAILS,.55)
# Restrained ceiling perimeter; an unbroken plaster centre leaves visual air.
for x in (-285,285): box_cm('ceiling border',x-4,x+4,TOP-3,TOP,-140,BACK-25,WOOD,.45)

# One generous sash window; its opening is real, so its light has an origin.
WS,WT,W0,W1=68,285,260,500
boolean_cut(right,box_cm('window opening',X1-4,X1+26,WS,WT,W0,W1,WOOD,keep=False))
def window():
    for a,b in ((-124,-117),(117,124)):
        box_cm('window casing',a,b,WS-8,WT+9,-10,20,WOOD,.65)
    for z in (WS-7,WT): box_cm('window casing rail',-124,124,z,z+7,-10,20,RAILS,.6)
    box_cm('deep window sill',-131,131,WS-8,WS-4,-22,23,RAILS,.65)
    for x in (-116,-1.1,113.8): box_cm('sash upright',x,x+2.2,WS+2,WT-2,11,16,WOOD,.17)
    for z in (WS+2,174,WT-4): box_cm('sash rail',-116,116,z,z+2.5,10,16,RAILS,.18)
    for a,b in ((-113,-2.2),(2.2,113)):
        for low,high in ((WS+5,173),(178,WT-5)):
            card('window glass',[P(a,low,17),P(b,low,17),P(b,high,17),P(a,high,17)],GLASS)
    for x in (-42,42):
        box_cm('sash latch',x-1.8,x+1.8,175,177,9,10.2,BRASS,.3)
    curtain(RNG,-169,-128,-12,308,VELVET,bottom=2,folds=5,deep=4)
    curtain(RNG,128,169,-12,308,VELVET,bottom=2,folds=5,deep=4)
    curtain_pole(-176,176,311,-10,BRASS)
assembled('single wide sash window',window,at=(X1,0,(W0+W1)/2),turn=-math.pi/2)
WF=framed((X1,0,(W0+W1)/2),-math.pi/2)

# Real silhouette branches and a distant muted night sky; no glowing moon disc.
SKY=plain('night garden sky',(.014,.023,.035),rough=1,emit=(.014,.023,.035),strength=.6)
box_cm('distant night',X1+2500,X1+2502,-80,2100,-2000,6500,SKY)
TREE=plain('garden tree bark',(.014,.018,.013),rough=.94)
for x,d,z in ((X1+140,300,360),(X1+220,650,410),(X1+290,100,460)):
    curve('garden trunk',[(x,0,d),(x-6,z*.5,d+5),(x+3,z,d-12)],4,TREE)
    for k in range(8):
        h=z*(.35+k*.07); sign=-1 if k%2 else 1
        curve('winter branches',[(x,h,d),(x+sign*30,h+20,d+sign*38),(x+sign*58,h+45,d+sign*75)],1.25,TREE)
# Photographic CC0 tree geometry gives the distant garden a real canopy.
# These stand beyond the window's sightline, away from the moon-light path.
for model,x,d,height,turn in (('island_tree_01',900,1550,950,.8),('island_tree_02',1350,2300,1250,2.1)):
    tree=import_model(model,height=M(height),at=tuple(P(x,0,d)),rot=turn)
    matte_model(tree,(.64,.68,.65),rough_floor=.72)

# One fitted bookcase, centrally framed, with five physical numbered books.
with open(os.path.join(OUT,'books.json'),encoding='utf-8') as f: clues=json.load(f)
case_bounds=library_case(-62,166,BACK-5,WOOD,RAILS,PAGES,BRASS,COVERS,clues)
# The clock desk is its own readable station on the left, with no second lamp.
clock_bounds=clocks(-205,BACK-61,76,DESK,BRASS)

# A compact writing table on the right. The centre of the room stays open.
T=dict(x0=65,x1=224,d0=290,d1=401,h=77)
box_cm('writing table top',63,226,74,77,288,403,DESK,.6)
for a,b in ((67,72),(217,222)):
    box_cm('table side apron',a,b,63,74,293,398,DESK,.35)
for a,b in ((292,297),(394,399)):
    box_cm('table end apron',69,220,63,74,a,b,DESK,.35)
for xx in (73,216):
    for dd in (298,393):
        lathe('substantial turned walnut leg',[(0,0),(.028,0),(.032,.025),(.024,.06),(.022,.12),(.026,.44),(.035,.49),(.025,.54),(.035,.58),(.035,.65),(0,.65)],WOOD,at=tuple(P(xx,0,dd)),steps=48)
        box_cm('mortised leg head',xx-3.5,xx+3.5,63,74,dd-3.5,dd+3.5,WOOD,.3)
# The top has a restrained crossband, a leather inset and actual seams.
for a,b in ((66,70),(219,223)):
    box_cm('tabletop crossband',a,b,77.01,77.05,292,400,RAILS,.12)
for a,b in ((292,296),(396,400)):
    box_cm('tabletop end band',70,219,77.01,77.05,a,b,RAILS,.12)
PAD=scan('worn green writing leather','brown_leather',size=.55,tint=(.20,.25,.17),bright=.55,sat=.2,rough=(.65,.86),bump=.20)
box_cm('inset writing leather',91,174,77.02,77.08,352,392,PAD,.35)
for xx in (93,172):
    rod('blind tooled leather border',P(xx,77.1,354),P(xx,77.1,390),M(.05),GAP,verts=8)
for dd in (354,390):
    rod('blind tooled leather border',P(93,77.1,dd),P(172,77.1,dd),M(.05),GAP,verts=8)
for xx in (72,217):
    for dd in (297,394):
        box_cm('leg corner block',xx-4,xx+4,62,71,dd-4,dd+4,WOOD,.4)
# Fine recessed border and physical drawer fronts.
for z,h in ((63,1),(74,1)):
    box_cm('table apron moulding',67,222,z,z+h,292,293,RAILS,.2)
for xx in (81,160):
    box_cm('writing table drawer',xx,xx+62,64.7,73.3,289.8,291.8,DESK,.3)
    rod('drawer escutcheon',P(xx+31,68.7,289.4),P(xx+31,68.7,289.7),M(1.3),BRASS,verts=24)
    curve('drawer drop handle',[(xx+28,69,289.1),(xx+28,66.8,288.3),(xx+34,66.8,288.3),(xx+34,69,289.1)],.18,BRASS)
banker_lamp(200,77,377,BRASS)
curve('lamp cloth covered cable',[(200,77.3,380),(214,77.2,392),(227,76,393),(228,1,399),(314,1,405),(314,19,405)],.19,GAP)
box_cm('aged wall socket',312.8,314.8,16,23,402,408,plain('aged bakelite socket',(.035,.029,.022),rough=.7),.4)
router_bounds,leds=router(85,77,311)
CHEST=dict(x0=162,x1=189,d0=310,d1=329,y0=77.03,y1=90.5,lid=9.7)
body,hinge,lid=chest(CHEST)
# Just one closed ledger and a pen at the far end; no piles in the foreground.
GILT=aged_metal('ledger tooling',(.31,.22,.10),(.08,.05,.02),rough=(.5,.7))
ledger=volume('desk ledger',0,0,0,4,30,22,COVERS[1],PAGES,GILT)
ledger.location=P(112,77.2,368); ledger.rotation_euler=(0,math.pi/2,.12)
curve('fountain pen',[(144,77.5,374),(159,77.5,377)],.38,plain('black ebonite pen',(.012,.015,.013),rough=.49))
rod('pen nib',P(159,77.5,377),P(160.5,77.5,377.3),M(.19),BRASS,verts=12)
import_model('dining_chair_02',height=M(96),at=tuple(P(145,0,449)),rot=math.pi+.08)

# A single quiet reading chair on the left. No wall of books in the foreground.
chair=import_model('ArmChair_01',height=M(100),at=tuple(P(-221,0,320)),rot=.35)
darken_model(chair,(.62,.52,.41))
matte_model(chair,(.95,.94,.91),rough_floor=.63)
RUG=rug_material('faded olive wool carpet',os.path.join(ROOT,'.artifacts/rooms/library-rug.png'),tint=(.65,.62,.49),sat=.45,value=.52)
rug(-152,198,172,568,RUG)

# Illumination: one practical plus the single window. No hidden interior fills,
# shelf lights, colored glows, bloom, camera-facing lights or ambient overlays.
world=bpy.data.worlds.new('unlit exterior environment'); world.use_nodes=True; scene.world=world
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.025,.033,.045,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.10
lamp('moon beyond sash','SUN',tuple(P(1800,1700,600)),aim=tuple(P(-260,0,220)),energy=float(arg('--moon','.45')),colour=(.68,.77,.9),angle=math.radians(5))
sky=lamp('night sky at single window','AREA',tuple(P(X1+35,194,380)),aim=tuple(P(0,194,380)),energy=float(arg('--sky','240')),colour=(.68,.77,.9),size=2.1,size_y=2.2)
sky.visible_camera=False; sky.visible_transmission=False; sky.visible_glossy=False
# Thin flat window panes transmit direct illumination without requiring a
# separate interior fill or unstable refractive shadow-caustic sampling.
clear_glass()
cycles(scene,SAMPLES,WIDTH,HEIGHT,exposure=float(arg('--exposure','1.35')),glare=False)
scene.view_settings.look='AgX - Medium High Contrast'
scene.cycles.max_bounces=12; scene.cycles.diffuse_bounces=6; scene.cycles.glossy_bounces=5; scene.cycles.transmission_bounces=8
scene.cycles.adaptive_threshold=.008; scene.cycles.adaptive_min_samples=min(64,SAMPLES)
scene.cycles.sample_clamp_indirect=5; scene.render.use_persistent_data=True
# Clamp all imported nonmetal surfaces to an appropriately worn roughness.
for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    for node in mat.node_tree.nodes:
        if node.type!='BSDF_PRINCIPLED': continue
        if node.inputs['Metallic'].default_value>.5 or node.inputs['Transmission Weight'].default_value>.5: continue
        node.inputs['Coat Weight'].default_value=0
        rough=node.inputs['Roughness']
        if rough.is_linked:
            source=rough.links[0].from_socket; floor=mat.node_tree.nodes.new('ShaderNodeMath'); floor.operation='MAXIMUM'; floor.inputs[1].default_value=.46
            mat.node_tree.links.new(source,floor.inputs[0]); mat.node_tree.links.new(floor.outputs[0],rough)
        else: rough.default_value=max(rough.default_value,.46)
bpy.context.view_layer.update()
layout=Layout('Room2')
layout.thing('bookshelf','Look at the bookshelves',corners(*case_bounds))
layout.thing('modem','Look at the router',corners(*router_bounds))
layout.thing('overtime','Look at the clocks',corners(*clock_bounds))
layout.chest(CHEST)
for i,p in enumerate(leds): layout.point('led-'+str(i),p)
for a,b in ((-113,-2.2),(2.2,113)):
    for low,high in ((WS+5,173),(178,WT-5)):
        layout.pane([WF(a,low,17),WF(b,low,17),WF(b,high,17),WF(a,high,17)])
with open(os.path.join(OUT,'room.json'),'w',encoding='utf-8') as f: json.dump(layout.data,f,indent=2)
scene['room_design']='Room II / 2026 renovation: one lamp and one window'
scene['coffer_crop']=layout.data['chest']['box']

if 'preview' in ONLY or 'plate' in ONLY:
    for obj in body+lid: obj.hide_render='plate' in ONLY
    render(scene,os.path.join(OUT,'preview.png' if 'preview' in ONLY else 'lights-1.png'))
    for obj in body+lid: obj.hide_render=False

if 'coffer' in ONLY:
    # Retain the same camera rays while rendering an oversampled prop crop.
    from library_coffer_pass import render_coffer
    render_coffer(scene,OUT,layout.data['chest']['box'],body,hinge,lid,WIDTH,SAMPLES)

if 'preview' not in ONLY:
    # Save the complete editable room with the main camera and the shut coffer.
    scene.render.resolution_x=WIDTH; scene.render.resolution_y=HEIGHT
    scene.render.film_transparent=False; scene.render.image_settings.color_mode='RGB'
    hinge.rotation_euler.x=0
    for obj in body+lid: obj.hide_render=False; obj.visible_camera=True
    if arg('--pack','1')=='1': bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'room-library-v3.blend'))
print('ROOM_LIBRARY_V3_DONE',flush=True)
