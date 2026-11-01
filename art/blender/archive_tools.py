"""Original, metre-scale Cycles models for the C and N tools only.

Each UI plate is photographed as one assembled object; the dossier is then
sliced at its two hinge boundaries, never assembled from unrelated photos.
Run with --target casefile|notebook|icons|all --samples 384 --scale 2.
"""
import bpy, math, os, sys, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import scan, ROOT

OUT=os.path.join(ROOT,'.artifacts/archive-tools-v1'); os.makedirs(OUT,exist_ok=True)
SAMPLES=int(arg('--samples','384')); SCALE=float(arg('--scale','2'))
TARGET=arg('--target','all'); K=.00045
random.seed(61013)

def block(name,x0,x1,y0,y1,z0,z1,mat,r=0):
    o=box(name,x0*K,x1*K,-y1*K,-y0*K,z0*K,z1*K,mat)
    if r: bevel(o,r*K,4)
    return o

def cord(name,points,r,mat):
    cu=bpy.data.curves.new(name,'CURVE'); cu.dimensions='3D'
    cu.bevel_depth=r*K; cu.bevel_resolution=3; cu.resolution_u=8
    sp=cu.splines.new('POLY'); sp.points.add(len(points)-1)
    for p,v in zip(sp.points,points): p.co=(v[0]*K,-v[1]*K,v[2]*K,1)
    o=link(bpy.data.objects.new(name,cu)); cu.materials.append(mat); return o

def paper(name,base):
    m=plain(name,base,rough=.89,spec=.23); n=m.node_tree.nodes; L=m.node_tree.links.new; b=n['Principled BSDF']
    tc=n.new('ShaderNodeTexCoord')
    noise=n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=1800; noise.inputs['Detail'].default_value=3
    L(tc.outputs['Object'],noise.inputs['Vector'])
    ramp=n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color=(*[v*.87 for v in base],1); ramp.color_ramp.elements[1].color=(*base,1)
    L(noise.outputs['Fac'],ramp.inputs[0])
    # Oxidation is concentrated in the exposed margin; the writing area stays
    # clear. Low-frequency fibre density varies independently of micro bump.
    sep=n.new('ShaderNodeSeparateXYZ'); L(tc.outputs['Generated'],sep.inputs[0])
    def op(kind,a,v):
        node=n.new('ShaderNodeMath'); node.operation=kind
        if hasattr(a,'node'): L(a,node.inputs[0])
        else: node.inputs[0].default_value=a
        if hasattr(v,'node'): L(v,node.inputs[1])
        else: node.inputs[1].default_value=v
        return node.outputs[0]
    ex=op('MINIMUM',sep.outputs['X'],op('SUBTRACT',1,sep.outputs['X']))
    ey=op('MINIMUM',sep.outputs['Y'],op('SUBTRACT',1,sep.outputs['Y']))
    edge=op('SUBTRACT',1,op('MULTIPLY',op('MINIMUM',ex,ey),45))
    edge=op('MAXIMUM',edge,0)
    slow=n.new('ShaderNodeTexNoise'); slow.inputs['Scale'].default_value=110; slow.inputs['Detail'].default_value=4
    L(tc.outputs['Object'],slow.inputs[0])
    mix=n.new('ShaderNodeMixRGB'); mix.blend_type='MULTIPLY'; mix.inputs[2].default_value=(.63,.49,.32,1)
    L(op('MULTIPLY',edge,op('MULTIPLY',slow.outputs['Fac'],.30)),mix.inputs[0]); L(ramp.outputs[0],mix.inputs[1])
    L(mix.outputs[0],b.inputs['Base Color'])
    micro=n.new('ShaderNodeTexNoise'); micro.inputs['Scale'].default_value=18000; micro.inputs['Roughness'].default_value=.8
    L(tc.outputs['Object'],micro.inputs[0]); bump=n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.22; bump.inputs['Distance'].default_value=.000026
    L(micro.outputs['Fac'],bump.inputs['Height']); L(bump.outputs[0],b.inputs['Normal'])
    return m

def materials():
    return dict(
      leather=scan('Hand rubbed chestnut calfskin','brown_leather',size=.24,tint=(.48,.32,.23),bright=.85,rough=(.57,.8),bump=.32,coat=0),
      oxblood=scan('Notebook oxblood calfskin','brown_leather',size=.24,tint=(.42,.12,.12),bright=.8,rough=(.54,.78),bump=.28,coat=0),
      paper=paper('Warm ivory cotton rag',(.74,.683,.55)),
      index=paper('Buff archive index stock',(.61,.51,.35)),
      edge=paper('Unbleached cut paper edges',(.53,.455,.33)),
      thread=plain('Waxed linen thread',(.34,.25,.14),rough=.92),
      steel=aged_metal('Brushed nickel mechanism',(.48,.52,.55),(.16,.145,.12),rough=(.29,.47),scale=180,tarnish=.17),
      dark=plain('Dark oxidised recess',(.026,.021,.018),rough=.68,metal=.72),
      brass=aged_metal('Worn brass corner protectors',(.46,.30,.105),(.16,.105,.04),rough=(.38,.58),scale=160,tarnish=.24),
      ribbon=scan('Woven burgundy ribbon','crepe_satin',size=.12,tint=(.25,.035,.035),bright=.5,rough=(.72,.9),bump=.22,coat=0))

def studio(w,h):
    s=fresh(); m=materials()
    world=bpy.data.worlds.new('Quiet neutral studio bounce'); s.world=world; world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.28,.31,.36,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.35
    lamp('Large soft north window','AREA',(-.2,.2,.65),aim=(w*K/2,-h*K/2,0),energy=32,colour=(1,.94,.84),size=.65,size_y=.8)
    lamp('Diffuse room return','AREA',(.8,-.45,.65),aim=(w*K/2,-h*K/2,0),energy=19,colour=(.82,.89,1),size=.8)
    lamp('Long reflected window','AREA',(.25,.25,.45),aim=(w*K/2,-h*K/2,0),energy=8,colour=(1,.96,.9),size=.5,size_y=.15)
    cd=bpy.data.cameras.new('Registered document camera'); cd.type='ORTHO'; cd.sensor_fit='HORIZONTAL'; cd.ortho_scale=w*K
    cam=link(bpy.data.objects.new('Registered document camera',cd)); cam.location=(w*K/2,-h*K/2,1.5); cam.rotation_euler=(0,0,0); s.camera=cam
    cycles(s,SAMPLES,round(w*SCALE),round(h*SCALE),exposure=-.35,transparent=True,glare=False)
    s.view_settings.look='AgX - Medium High Contrast'; s.cycles.adaptive_threshold=.008
    s.render.use_persistent_data=True
    return s,m

def stitches(x0,x1,y0,y1,z,m):
    # Every stitch is a short thread which sits above the leather, not a decal.
    for y in range(round(y0+8),round(y1-7),10):
        for x in (x0+8,x1-8): cord('Saddle stitch',[(x,y,z),(x+.35,y+3,z+.45),(x,y+6,z)],.48,m)
    for x in range(round(x0+12),round(x1-10),10):
        for y in (y0+8,y1-8): cord('Saddle stitch',[(x,y,z),(x+3,y+.35,z+.45),(x+6,y,z)],.48,m)

def leaf(name,x0,x1,y0,y1,z,mat,curl=4,seed=0,holes=()):
    # A shallow compound curvature with lifted corners and uneven cut edges.
    nx,ny=36,54; verts=[]; faces=[]
    for j in range(ny+1):
        v=j/ny
        for i in range(nx+1):
            u=i/nx
            x=x0+(x1-x0)*u; y=y0+(y1-y0)*v
            edge=abs(2*u-1)**12
            x+=.34*math.sin(v*83+seed)*edge
            y+=.22*math.sin(u*95+seed)*abs(2*v-1)**18
            lift=curl*(u**14*(1-v)**18+.45*(1-u)**18*v**18)
            zz=z+lift+.23*math.sin(u*9+v*5+seed)*edge
            zz+=.65*math.sin(v*27+u*9+seed)*(abs(2*u-1)**16)
            verts.append((x*K,-y*K,zz*K))
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i; faces.append((a,a+nx+1,a+nx+2,a+1))
    me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update()
    o=link(bpy.data.objects.new(name,me)); me.materials.append(mat)
    for p in me.polygons: p.use_smooth=True
    sol=o.modifiers.new('Real paper thickness','SOLIDIFY'); sol.thickness=.23*K
    if holes:
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=sol.name)
        for hx,hy in holes:
            c=cylinder('Round punched paper',hx*K,-hy*K,(z-4)*K,(z+8)*K,4.8*K,mat,verts=32)
            boolean_cut(o,c)
    return o

def corner(x,y,sx,sy,z,mat):
    # Folded brass corner shoes: thin, worn, with recessed pin heads.
    block('Corner shoe horizontal',min(x,x+sx*29),max(x,x+sx*29),min(y,y+sy*5),max(y,y+sy*5),z,z+1.4,mat,1)
    block('Corner shoe vertical',min(x,x+sx*5),max(x,x+sx*5),min(y,y+sy*29),max(y,y+sy*29),z,z+1.4,mat,1)

def save_render(s,name):
    bpy.ops.file.pack_all(); bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,name+'.blend'))
    render(s,os.path.join(OUT,name+'.png'))

def portrait(s,name,w,h):
    if SCALE < 2: return
    wood=scan('Oiled walnut photographic desk','dark_wood',size=.65,tint=(.48,.36,.25),bright=.65,rough=(.61,.8),bump=.25,coat=0)
    block('Walnut desk',-2500,3500,-2500,3500,-45,-1,wood)
    centre=Vector((w*K/2,-h*K/2,0))
    s.camera.location=centre+Vector((.17,-.32,.9))
    s.camera.rotation_euler=(centre-s.camera.location).to_track_quat('-Z','Y').to_euler()
    s.camera.data.ortho_scale=max(w*K*1.55,h*K*1.8)
    s.render.resolution_x=2000; s.render.resolution_y=1500
    s.render.film_transparent=False; s.render.image_settings.color_mode='RGB'
    render(s,os.path.join(OUT,name+'-portrait.png'))

def casefile():
    s,m=studio(1480,920)
    block('Flexible leather hinge',325,428,12,907,0,4,m['leather'],4)
    for a,b in ((8,350),(402,1472)):
        block('Leather wrapped cover board',a,b,8,911,0,7,m['leather'],7)
        stitches(a,b,8,911,7.3,m['thread'])
        for x,sx in ((a+1,1),(b-1,-1)):
            for y,sy in ((10,1),(909,-1)): corner(x,y,sx,sy,7.4,m['brass'])
    # Individual backing leaves, with small placement variation and real thickness.
    yy=(220,690)
    for i in range(11):
        leaf('Archive backing sheet left',30-i*.16,337-i*.28,30+i*.16,884-i*.32,8+i*.55,m['edge'] if i%3==0 else m['index'],curl=2,seed=i,holes=[(331,y) for y in yy])
        leaf('Archive backing sheet right',416+i*.22,1452-i*.3,30+i*.18,884-i*.32,8+i*.55,m['edge'] if i%3==0 else m['paper'],curl=2,seed=i,holes=[(422,y) for y in yy])
    leaf('Punched index leaf',30,337,30,881,15,m['index'],curl=7,holes=[(331,y) for y in yy])
    leaf('Punched correspondence leaf',416,1450,30,881,15,m['paper'],curl=11,holes=[(422,y) for y in yy])
    block('Pressed steel mounting rail',361,391,81,837,6,12,m['steel'],8)
    block('Split down the steel rail',375.3,376.7,105,809,12,12.7,m['dark'],.4)
    for y in (100,818):
        cylinder('Slotted fixing screw',376*K,-y*K,12*K,14*K,4*K,m['steel'],48)
        block('Screwdriver slot',373.4,378.6,y-.5,y+.5,14,14.15,m['dark'],.25)
    for y in yy:
        # Elliptical nickel hoops pass through true holes in the upper leaf.
        # Their back sections return below the top sheets.
        pts=[]
        for i in range(193):
            t=2*math.pi*i/192
            # The flattened return rests on the rail above the cover;
            # it must never travel through the cover or desk beneath it.
            pts.append((376.5+45.5*math.cos(t),y+12*math.sin(t),15+(29 if t<=math.pi else 5)*math.sin(t)))
        cord('Solid nickel split ring',pts,2.35,m['steel'])
        block('Ring release foot',368,385,y-9,y+9,12,17,m['steel'],3)
    block('Release paddle',365,388,842,868,7,12,m['steel'],4)
    for y in range(849,863,4): cord('Pressed grip ridge',[(369,y,12.3),(384,y,12.3)],.6,m['dark'])
    save_render(s,'casefile')
    portrait(s,'casefile',1480,920)

def notebook():
    s,m=studio(560,1000)
    block('Full grain leather back cover',8,552,8,982,0,9,m['oxblood'],9)
    stitches(10,550,10,980,9.3,m['thread'])
    block('Rounded sewn spine',14,55,16,974,8,15,m['oxblood'],10)
    for i in range(27):
        leaf('Sewn signature page',49+i*.11,537-i*.29,30+i*.18,957-i*.25,10+i*.32,m['edge'] if i%4==0 else m['paper'],curl=1.2,seed=i)
    leaf('Cotton writing leaf',56,527,35,948,20,m['paper'],curl=10,seed=6)
    # Thread visible between gathered signatures; five true sewn stations.
    for y in (145,320,495,670,845):
        cord('Binding thread loop',[(43,y-7,16),(52,y-6,20),(55,y,20.5),(52,y+6,20),(43,y+7,16)],.7,m['thread'])
    cord('Woven headband',[(48,y,19) for y in range(39,950,3)],1.45,m['thread'])
    for y in range(45,949,8): cord('Headband cross stitches',[(46,y,19),(50,y+3,19.8)],.5,m['oxblood'])
    # A real woven bookmark emerges below the paper stack, away from writing.
    block('Ribbon bookmark',473,486,914,989,11,11.5,m['ribbon'],.6)
    save_render(s,'notebook')
    portrait(s,'notebook',560,1000)

def icons():
    for name in ('notebook-icon','casefile-icon'):
        s,m=studio(560,560)
        if name.startswith('notebook'):
            block('Closed notebook back',125,416,65,481,0,9,m['oxblood'],8)
            for i in range(24): block('Cut signature',136,405,76,468,10+i*.9,10.5+i*.9,m['edge'] if i%4==0 else m['paper'],1.6)
            block('Closed notebook front',124,416,65,481,33,42,m['oxblood'],8)
            block('Book spine',119,147,65,481,0,42,m['oxblood'],9)
            stitches(128,412,69,477,42.2,m['thread'])
            for y in (127,177,367,417): block('Raised binding rib',118,145,y,y+8,40,44,m['oxblood'],3)
            for x,sx in ((410,-1),):
                for y,sy in ((69,1),(477,-1)): corner(x,y,sx,sy,42.4,m['brass'])
            block('Ribbon tail',353,367,467,503,3,4,m['ribbon'])
        else:
            block('Archive folder lower board',91,455,96,447,0,7,m['leather'],7)
            for i in range(13): block('Filed document',104,442,107,435,8+i*.65,8.4+i*.65,m['paper'],1)
            block('Archive folder upper board',91,455,96,447,17,23,m['leather'],7)
            block('Index tab',332,436,79,112,17,23,m['leather'],5)
            stitches(95,451,100,443,23.3,m['thread'])
            block('Inset ivory archive label',180,367,164,258,23.2,24,m['index'],2)
            for y in (190,206,235): cord('Faded typewriter rules',[(198,y,24.1),(346,y,24.1)],.38,m['thread'])
            for y in (290,351): cylinder('Brass string button',275*K,-y*K,24*K,27*K,11*K,m['brass'],48)
            cord('Waxed archive closure',[(273,290,29),(282,308,28),(268,347,29),(278,357,29),(282,349,29),(275,327,28),(263,292,29)],1,m['thread'])
        # Shared natural three-quarter projection at icon scale.
        target=Vector((280*K,-280*K,16*K)); s.camera.location=(.35,-.46,.75)
        s.camera.rotation_euler=(target-s.camera.location).to_track_quat('-Z','Y').to_euler()
        s.camera.data.ortho_scale=.275
        save_render(s,name)

if __name__ == '__main__':
    if TARGET in ('all','casefile'): casefile()
    if TARGET in ('all','notebook'): notebook()
    if TARGET in ('all','icons'): icons()
    print('ARCHIVE_TOOLS_DONE',TARGET)
