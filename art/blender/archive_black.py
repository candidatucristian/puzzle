"""Black calfskin and oxidised paper for Settings, Notebook and Case file.
Original 3D Cycles assets; one persistent studio, no post-render recolouring.
"""
import bpy, os, sys, math
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import archive_tools as a
from kit import *
from hall_common import scan, ROOT

OUT=os.path.join(ROOT,'.artifacts/archive-black-v2'); os.makedirs(OUT,exist_ok=True)
SCALE=float(arg('--scale','2')); SAMPLES=int(arg('--samples','384'))
TARGET=arg('--target','all'); K=a.K
SCENE=None; MATS=None; KEEP=[]

def aged_paper(name,colour):
    m=plain(name,colour,rough=.94,spec=.18)
    n=m.node_tree.nodes; L=m.node_tree.links.new; b=n['Principled BSDF']
    tc=n.new('ShaderNodeTexCoord'); sep=n.new('ShaderNodeSeparateXYZ'); L(tc.outputs['Generated'],sep.inputs[0])
    def op(kind,v,w):
        o=n.new('ShaderNodeMath'); o.operation=kind
        for i,value in enumerate((v,w)):
            if hasattr(value,'node'): L(value,o.inputs[i])
            else: o.inputs[i].default_value=value
        return o.outputs[0]
    def noise(scale,detail=3):
        o=n.new('ShaderNodeTexNoise'); o.inputs['Scale'].default_value=scale; o.inputs['Detail'].default_value=detail
        L(tc.outputs['Object'],o.inputs[0]); return o.outputs['Fac']
    ex=op('MINIMUM',sep.outputs['X'],op('SUBTRACT',1,sep.outputs['X']))
    ey=op('MINIMUM',sep.outputs['Y'],op('SUBTRACT',1,sep.outputs['Y']))
    edge=op('MAXIMUM',op('SUBTRACT',1,op('MULTIPLY',op('MINIMUM',ex,ey),9)),0)
    cloud=noise(19,4)
    ramp=n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color=(*[c*.79 for c in colour],1)
    ramp.color_ramp.elements[1].color=(*colour,1); L(cloud,ramp.inputs[0])
    edge_mix=n.new('ShaderNodeMixRGB'); edge_mix.blend_type='MULTIPLY'; edge_mix.inputs[2].default_value=(.43,.34,.20,1)
    L(op('MULTIPLY',edge,op('ADD',.24,op('MULTIPLY',noise(85),.6))),edge_mix.inputs[0]); L(ramp.outputs[0],edge_mix.inputs[1])
    fox=n.new('ShaderNodeMixRGB'); fox.blend_type='MULTIPLY'; fox.inputs[2].default_value=(.43,.28,.12,1)
    marks=op('MULTIPLY',op('GREATER_THAN',noise(620,2),.72),op('ADD',.1,op('MULTIPLY',edge,.65)))
    L(marks,fox.inputs[0]); L(edge_mix.outputs[0],fox.inputs[1]); L(fox.outputs[0],b.inputs['Base Color'])
    bump=n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.32; bump.inputs['Distance'].default_value=.000045
    L(noise(12500),bump.inputs['Height']); L(bump.outputs[0],b.inputs['Normal'])
    return m

def materials():
    leather=scan('Black worn calfskin, neutral carbon dye','brown_leather',size=.18,sat=0,tint=(.052,.052,.049),bright=.65,rough=(.68,.88),bump=.39,coat=0)
    return dict(leather=leather,oxblood=leather,
      paper=aged_paper('Oxidised laid paper, sixty years old',(.55,.425,.255)),
      index=aged_paper('Darkened archive stock',(.48,.355,.20)),
      edge=aged_paper('Exposed signature edges',(.32,.235,.13)),
      thread=plain('Old charcoal linen sewing',(.047,.042,.034),rough=.98),
      steel=aged_metal('Tarnished nickel, no polish',(.26,.275,.26),(.065,.061,.05),rough=(.48,.69),scale=180,tarnish=.35),
      brass=aged_metal('Blackened corner shoes',(.18,.165,.12),(.035,.033,.028),rough=(.53,.75),scale=180,tarnish=.5),
      dark=plain('Black oxidised recess',(.014,.013,.011),rough=.8,metal=.6),
      ribbon=scan('Faded charcoal woven bookmark','crepe_satin',size=.12,sat=0,tint=(.04,.04,.035),bright=.5,rough=(.83,.98),bump=.3,coat=0),
      scuff=plain('Worn raised grain',(.046,.044,.038),rough=.96))

def studio(w,h):
    global SCENE,MATS,KEEP
    if SCENE is None:
        SCENE=fresh(); MATS=materials()
        world=bpy.data.worlds.new('Dim neutral room'); SCENE.world=world; world.use_nodes=True
        world.node_tree.nodes['Background'].inputs['Color'].default_value=(.22,.23,.24,1)
        world.node_tree.nodes['Background'].inputs['Strength'].default_value=.25
        lamp('Broad overcast window','AREA',(-.18,.15,.7),aim=(.3,-.2,0),energy=26,colour=(1,.97,.90),size=.7,size_y=.85)
        lamp('Soft neutral room return','AREA',(.8,-.45,.6),aim=(.3,-.2,0),energy=13,colour=(.91,.94,1),size=.8)
        lamp('Narrow edge reflection','AREA',(.3,.25,.45),aim=(.3,-.2,0),energy=6,colour=(1,.96,.87),size=.5,size_y=.15)
        cd=bpy.data.cameras.new('Registered archive camera'); cd.type='ORTHO'; cd.sensor_fit='HORIZONTAL'
        cam=link(bpy.data.objects.new('Registered archive camera',cd)); SCENE.camera=cam
        cycles(SCENE,SAMPLES,1000,1000,exposure=-.5,transparent=True,glare=False)
        SCENE.cycles.adaptive_threshold=.008; SCENE.render.use_persistent_data=True
        KEEP=list(bpy.data.objects)
    else:
        for obj in list(bpy.data.objects):
            if obj not in KEEP: bpy.data.objects.remove(obj,do_unlink=True)
    cam=SCENE.camera; cam.location=(w*K/2,-h*K/2,1.5); cam.rotation_euler=(0,0,0); cam.data.ortho_scale=w*K
    SCENE.render.resolution_x=round(w*SCALE); SCENE.render.resolution_y=round(h*SCALE)
    return SCENE,MATS

def scuffs(x0,x1,y0,y1,z,mat):
    # Fine geometry on the exposed binding: subdued, irregular abrasion.
    import random
    rng=random.Random(round(x1+y1))
    for i in range(78):
        side=rng.randrange(4)
        if side<2:
            x=(x0+3 if side==0 else x1-3)+rng.uniform(-1,1); y=rng.uniform(y0+9,y1-9)
            pts=[(x,y,z),(x+rng.uniform(-.6,.6),y+rng.uniform(1,4),z+.1)]
        else:
            x=rng.uniform(x0+9,x1-9); y=(y0+3 if side==2 else y1-3)+rng.uniform(-1,1)
            pts=[(x,y,z),(x+rng.uniform(1,4),y+rng.uniform(-.6,.6),z+.1)]
        a.cord('Binding edge abrasion',pts,.11,mat)

def save_render(s,name):
    # Added before the photograph, so wear receives the studio's actual light.
    for obj in list(bpy.data.objects):
        if obj.type=='MESH' and obj.name.startswith(('Leather wrapped cover','Full grain leather','Closed notebook front','Archive folder upper')):
            pts=[obj.matrix_world@Vector(v) for v in obj.bound_box]
            scuffs(min(v.x for v in pts)/K,max(v.x for v in pts)/K,-max(v.y for v in pts)/K,-min(v.y for v in pts)/K,max(v.z for v in pts)/K+.12,MATS['scuff'])
    bpy.ops.file.pack_all(); bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,name+'.blend'))
    render(s,os.path.join(OUT,name+'.png'))

def notebook():
    s,m=studio(560,1000)
    a.block('Full grain leather back cover',8,552,8,982,0,9,m['leather'],8)
    a.stitches(10,550,10,980,9.3,m['thread'])
    a.block('Rounded sewn spine',14,58,16,974,8,15,m['leather'],9)
    for i in range(27):
        a.leaf('Aged sewn signature',57+i*.11,519-i*.29,49+i*.18,944-i*.25,10+i*.32,m['edge'] if i%4==0 else m['paper'],curl=2,seed=i)
    a.leaf('Foxed writing leaf',65,509,54,935,20,m['paper'],curl=15,seed=6)
    for y in (145,320,495,670,845): a.cord('Sewn binding station',[(47,y-7,16),(57,y-6,20),(63,y,20.5),(57,y+6,20),(47,y+7,16)],.65,m['thread'])
    a.cord('Worn headband',[(56,y,19) for y in range(55,937,3)],1.25,m['thread'])
    a.block('Charcoal woven marker',466,480,904,988,11,11.5,m['ribbon'],.5)
    save_render(s,'notebook')

def settings():
    s,m=studio(960,860)
    a.block('Full grain leather settings folio',8,952,8,846,0,9,m['leather'],8)
    a.stitches(10,950,10,844,9.3,m['thread'])
    # A black spine and navigation margin surround a real stack of old leaves.
    for i in range(13):
        a.leaf('Settings backing leaf',205+i*.2,923-i*.34,116+i*.15,816-i*.25,10+i*.5,m['edge'] if i%3==0 else m['paper'],curl=2,seed=i)
    a.leaf('Aged preferences leaf',211,915,123,807,18,m['paper'],curl=13,seed=8)
    for y in (220,480,730): a.cord('Settings spine stitch',[(195,y-7,13),(206,y-6,17),(210,y,19),(206,y+6,17),(195,y+7,13)],.65,m['thread'])
    scuffs(8,952,8,846,9.2,m['scuff']); save_render(s,'settings')

# Reuse construction, not old photographs. All four objects share one new
# black leather material and the same physically aged paper shader.
a.studio=studio; a.save_render=save_render; a.portrait=lambda *args:None
if TARGET in ('all','casefile'): a.casefile()
if TARGET in ('all','notebook'): notebook()
if TARGET in ('all','settings'): settings()
if TARGET in ('all','icons'): a.icons()
print('BLACK_ARCHIVE_DONE',TARGET)
