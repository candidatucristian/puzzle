"""The house's coffer and trefoil key, modeled in metres with real wall thickness.

The public coffer(c) adapter accepts the room builders' centimetre dimensions.
There are no emissive materials, painted highlights or clearcoat in this model.
"""
import bpy, bmesh, math
from mathutils import Vector
from kit import link, box, bevel, sphere, cylinder, lathe, plain, aged_metal, boolean_cut

_MATERIALS = None

def materials():
    global _MATERIALS
    if _MATERIALS and _MATERIALS['gold'].name in bpy.data.materials: return _MATERIALS
    gold = aged_metal('Coffer | rubbed gold over brass', (.78,.51,.16), (.13,.085,.032), rough=(.30,.49), scale=230, tarnish=.34)
    n=gold.node_tree.nodes; lk=gold.node_tree.links.new; bs=n['Principled BSDF']
    bs.inputs['Coat Weight'].default_value=0
    # Fine directional tool marks, below the visible repoussé and worn edges.
    tc=n.new('ShaderNodeTexCoord'); mp=n.new('ShaderNodeVectorMath'); mp.operation='MULTIPLY'; mp.inputs[1].default_value=(1,38,3)
    lk(tc.outputs['Object'],mp.inputs[0]); scratch=n.new('ShaderNodeTexNoise'); scratch.inputs['Scale'].default_value=1800; scratch.inputs['Detail'].default_value=2
    lk(mp.outputs[0],scratch.inputs['Vector']); bump=n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.11; bump.inputs['Distance'].default_value=.000028
    if bs.inputs['Normal'].is_linked: lk(bs.inputs['Normal'].links[0].from_socket,bump.inputs['Normal'])
    lk(scratch.outputs['Fac'],bump.inputs['Height']); lk(bump.outputs[0],bs.inputs['Normal'])
    bronze=aged_metal('Coffer | recessed antique bronze',(.26,.16,.061),(.042,.031,.018),rough=(.40,.63),scale=190,tarnish=.55)
    edge=aged_metal('Coffer | handled gilt edges',(.73,.48,.15),(.20,.12,.035),rough=(.28,.43),scale=420,tarnish=.18)
    velvet=plain('Coffer | deep oxblood velvet',(.052,.005,.008),rough=.97,sheen=.5)
    vn=velvet.node_tree.nodes; vl=velvet.node_tree.links.new; noise=vn.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=2100
    vb=vn.new('ShaderNodeBump'); vb.inputs['Strength'].default_value=.24; vb.inputs['Distance'].default_value=.00010
    vl(noise.outputs['Fac'],vb.inputs['Height']); vl(vb.outputs[0],vn['Principled BSDF'].inputs['Normal'])
    wood=plain('Coffer | dark walnut lining',(.045,.020,.009),rough=.69)
    _MATERIALS={'gold':gold,'bronze':bronze,'edge':edge,'velvet':velvet,'wood':wood,'dark':plain('Coffer | lock interior',(.008,.006,.004),rough=.9)}
    return _MATERIALS

def block(name,lo,hi,mat,r=.0005):
    o=box(name,lo[0],hi[0],lo[1],hi[1],lo[2],hi[2],mat)
    if r: bevel(o,r,3)
    return o

def curve(name,points,r,mat,cyclic=False):
    cu=bpy.data.curves.new(name,'CURVE'); cu.dimensions='3D'; cu.bevel_depth=r; cu.bevel_resolution=3; cu.resolution_u=8
    sp=cu.splines.new('BEZIER'); sp.bezier_points.add(len(points)-1); sp.use_cyclic_u=cyclic
    for p,co in zip(sp.bezier_points,points): p.co=co; p.handle_left_type=p.handle_right_type='AUTO'
    o=link(bpy.data.objects.new(name,cu)); o.data.materials.append(mat); return o

def coffer(c):
    m=materials(); g,e,b,v=m['gold'],m['edge'],m['bronze'],m['velvet']
    x0,x1,d0,d1,z0,z1,h=[c[k]/100 for k in ('x0','x1','d0','d1','y0','y1','lid')]
    w=x1-x0; depth=d1-d0; r=depth/2; cx=(x0+x1)/2; t=min(w*.012,.0026)
    body=[]; lid=[]
    def keep(o): body.append(o); return o
    # Four walls and an actual hollow well; the old solid block is gone.
    keep(block('Coffer | bottom',(x0,d0,z0+.007),(x1,d1,z0+.012),g,.001))
    for lo,hi in (((x0,d0,z0+.009),(x1,d0+t,z1)),((x0,d1-t,z0+.009),(x1,d1,z1)),
                  ((x0,d0,z0+.009),(x0+t,d1,z1)),((x1-t,d0,z0+.009),(x1,d1,z1))): keep(block('Coffer | thick shell',lo,hi,g,.0007))
    keep(block('Coffer | fitted velvet floor',(x0+t*2,d0+t*2,z0+.012),(x1-t*2,d1-t*2,z0+.014),v,.0005))
    for lo,hi in (((x0+t,d0+t,z0+.014),(x1-t,d0+t*1.5,z1-.004)),((x0+t,d1-t*1.5,z0+.014),(x1-t,d1-t,z1-.004)),
                  ((x0+t,d0+t,z0+.014),(x0+t*1.5,d1-t,z1-.004)),((x1-t*1.5,d0+t,z0+.014),(x1-t,d1-t,z1-.004))): keep(block('Coffer | velvet wall',lo,hi,v,.0002))
    # Base and lip mouldings, true rounded cast sections rather than flat bands.
    for zz,rr,mat in ((z0+.009,.0015,b),(z0+.015,.0010,e),(z1-.005,.0011,b),(z1-.001,.0012,e)):
        keep(curve('Coffer | cast perimeter',[(x0,d0,zz),(x1,d0,zz),(x1,d1,zz),(x0,d1,zz)],rr,mat,True))
    for x in (x0+.009,x1-.009):
        for d in (d0+.009,d1-.009):
            keep(sphere('Coffer | ball foot',(x,d,z0+.004),.004,g,squash=(1,1,.82)))
            keep(block('Coffer | foot collar',(x-.005,d-.005,z0+.006),(x+.005,d+.005,z0+.009),b,.001))
    # Framed front and side fields, with real beading and low floral relief.
    for x in (x0+.006,x1-.006):
        keep(block('Coffer | corner armour',(x-.003,d0-.001,z0+.015),(x+.003,d0+.002,z1-.004),e,.0008))
    fy=d0-.00065
    def front_flourish(px,pz,span):
        for side in (-1,1):
            pts=[]
            for k in range(12):
                a=k/11*math.pi*1.55; reach=span*(1-k/17)
                pts.append((px+side*math.sin(a)*reach,fy-.0007,pz+math.cos(a)*reach*.70))
            keep(curve('Coffer | engraved acanthus scroll',pts,.00040,b))
            for j in range(3):
                a=.7+j*.7; sx=px+side*math.sin(a)*span*.8; sz=pz+math.cos(a)*span*.6
                keep(curve('Coffer | repoussé leaf',[(sx,fy-.0008,sz),(sx+side*span*.20,fy-.0014,sz+span*.12),(sx+side*span*.22,fy-.0005,sz+span*.26)],.00065,e))
    for px in (cx-w*.27,cx+w*.27):
        bw=w*.34; bh=(z1-z0)*.60; mz=(z0+z1)*.5+.004
        keep(block('Coffer | recessed front field',(px-bw/2,d0-.0005,mz-bh/2),(px+bw/2,d0+.0002,mz+bh/2),b,.001))
        keep(curve('Coffer | raised field border',[(px-bw/2,fy-.0005,mz-bh/2),(px+bw/2,fy-.0005,mz-bh/2),(px+bw/2,fy-.0005,mz+bh/2),(px-bw/2,fy-.0005,mz+bh/2)],.00075,e,True))
        front_flourish(px,mz,bw*.29)
        for k in range(17):
            xx=px-bw/2+k*bw/16
            for zz in (mz-bh/2,mz+bh/2): keep(sphere('Coffer | tiny beading',(xx,fy-.0009,zz),.00065,e,squash=(1,.65,1)))
    # A working escutcheon with a pierced keyhole and four fixed rivets.
    lock=keep(block('Coffer | lock escutcheon',(cx-.013,d0-.0035,z1-.033),(cx+.013,d0-.0007,z1-.003),e,.002))
    hole=cylinder('keyhole cutter',0,0,-.012,.012,.0023,g,verts=32); hole.rotation_euler=(math.pi/2,0,0); hole.location=(cx,d0-.002,z1-.016)
    boolean_cut(lock,hole)
    boolean_cut(lock,block('keyhole ward cutter',(cx-.0013,d0-.012,z1-.025),(cx+.0013,d0+.008,z1-.016),g,0))
    keep(block('Coffer | lock darkness',(cx-.004,d0-.0006,z1-.027),(cx+.004,d0+.0001,z1-.012),m['dark'],0))
    for x in (cx-.009,cx+.009):
        for z in (z1-.028,z1-.007): keep(sphere('Coffer | peened lock rivet',(x,d0-.0039,z),.00105,g,squash=(1,.45,1)))
    # Side drop handles, with a mounting plate and a genuine open loop.
    for side,x in ((-1,x0),(1,x1)):
        dc=(d0+d1)/2; zc=(z0+z1)/2+.008
        keep(block('Coffer | handle plate',(x-.001,dc-.009,zc-.007),(x+.001,dc+.009,zc+.007),b,.001))
        keep(curve('Coffer | articulated ring',[(x+side*.003,dc+math.cos(a)*.015,zc-.009+math.sin(a)*.011) for a in [math.tau*k/16 for k in range(16)]],.0013,e,True))
    hinge=link(bpy.data.objects.new('Coffer | lid hinge',None)); hinge.location=(cx,d1,z1)
    def on_lid(o): o.parent=hinge; lid.append(o); return o
    # Two curved surfaces and their closing edges give the lid real thickness.
    count=64; verts=[]
    for inner in (False,True):
        for x in (-w/2,w/2):
            for k in range(count+1):
                a=math.pi*k/count; verts.append((x, -r-(r-(t if inner else 0))*math.cos(a), (h-(t if inner else 0))*math.sin(a)-(t*.2 if inner else 0)))
    stride=count+1; faces=[]
    for j in (0,2):
        for k in range(count): faces.append((j*stride+k,j*stride+k+1,(j+1)*stride+k+1,(j+1)*stride+k))
    for j in (0,1):
        for k in range(count): faces.append((j*stride+k,j*stride+k+1,(j+2)*stride+k+1,(j+2)*stride+k))
    for k in (0,count): faces.append((k,stride+k,3*stride+k,2*stride+k))
    mesh=bpy.data.meshes.new('hollow barrel lid'); mesh.from_pydata(verts,[],faces); mesh.update()
    shell=link(bpy.data.objects.new('Coffer | hollow curved lid',mesh)); shell.data.materials.append(g)
    for p in mesh.polygons: p.use_smooth=True
    on_lid(shell); bevel(shell,.00045,2)
    for side in (-1,1):
        capverts=[]
        for xx in (side*w/2,side*(w/2-t)):
            capverts.extend((xx,-r-r*math.cos(math.pi*k/count),h*math.sin(math.pi*k/count)) for k in range(count+1))
        capfaces=[tuple(range(count+1)),tuple(reversed(range(count+1,2*(count+1))))]
        capfaces.extend((k,k+1,count+2+k,count+1+k) for k in range(count))
        capfaces.append((count,0,count+1,2*count+1))
        cm=bpy.data.meshes.new('cast lid end'); cm.from_pydata(capverts,[],capfaces); cm.update()
        co=link(bpy.data.objects.new('Coffer | solid lid end',cm)); co.data.materials.append(g); on_lid(co); bevel(co,.0004,2)
    # Velvet follows the actual underside, not a flat red rectangle.
    vv=[]
    for x in (-w/2+t*2,w/2-t*2):
        for k in range(1,count):
            a=math.pi*k/count; vv.append((x,-r-(r-t*1.2)*math.cos(a),(h-t*1.2)*math.sin(a)-t*.25))
    ff=[(k,k+1,count-1+k+1,count-1+k) for k in range(count-2)]
    vm=bpy.data.meshes.new('curved velvet'); vm.from_pydata(vv,[],ff); vm.update(); vo=link(bpy.data.objects.new('Coffer | lid velvet',vm)); vo.data.materials.append(v); on_lid(vo)
    for x in (-w/2+.001,w/2-.001,-w*.31,w*.31):
        on_lid(curve('Coffer | cast lid rib',[(x,-r-(r+.0008)*math.cos(math.pi*k/48),(h+.0008)*math.sin(math.pi*k/48)) for k in range(49)],.00125,e))
        for k in range(3,46,6):
            a=math.pi*k/48; on_lid(sphere('Coffer | lid rivet',(x,-r-(r+.0013)*math.cos(a),(h+.0013)*math.sin(a)),.00095,g))
    for zz,dd in ((0,-2*r),(0,0)):
        on_lid(curve('Coffer | rolled lid lip',[(-w/2,dd,zz),(w/2,dd,zz)],.00125,e))
    for x in (-w*.31,w*.31):
        for i in range(5):
            ln=.012/5; o=cylinder('Coffer | hinge knuckle',0,0,-ln*.45,ln*.45,.0023,e,verts=24)
            o.rotation_euler=(0,math.pi/2,0)
            if i%2: o.location=(x-.006+(i+.5)*ln,0,0); on_lid(o)
            else: o.location=(cx+x-.006+(i+.5)*ln,d1,z1); keep(o)
    hasp=on_lid(block('Coffer | hinged hasp',(-.0045,-2*r-.0028,-.016),(.0045,-2*r-.001,.004),g,.0008))
    # A low sunburst on the crown, cast and worn with the rest of the metal.
    for k in range(16):
        a=math.tau*k/16
        on_lid(curve('Coffer | crown chasing',[(math.cos(a)*.006,-r+math.sin(a)*.006,h+.0005),(math.cos(a)*.020,-r+math.sin(a)*.016,h-.001)],.00045,b))
    hinge['coffer_native']=True
    return body,hinge,lid

def key_model():
    m=materials(); g=m['edge']; before=set(bpy.data.objects)
    cylinder('Key | shank',0,0,.006,.075,.00185,g,verts=40)
    for z,rad in ((.010,.0025),(.058,.0024),(.069,.0038),(.073,.0032)):
        lathe('Key | turned collar',[(0,0),(rad,0),(rad,.0015),(rad*.8,.0025),(0,.0025)],g,at=(0,0,z),steps=40)
    for x,z,r in ((0,.092,.0078),(-.008,.080,.0072),(.008,.080,.0072)):
        curve('Key | trefoil bow',[(x+math.cos(a)*r,0,z+math.sin(a)*r) for a in [math.tau*k/32 for k in range(32)]],.00125,g,True)
    sphere('Key | bow boss',(0,0,.081),.003,g,squash=(1,.5,1))
    for z,height,x1 in ((.011,.006,.012),(.023,.004,.012)):
        block('Key | cut ward',(.001,-.0014,z),(x1,.0014,z+height),g,.00038)
    block('Key | outer bit',(.009,-.0014,.014),(.012,.0014,.026),g,.00038)
    root=link(bpy.data.objects.new('Key | complete trefoil',None))
    for o in set(bpy.data.objects)-before-{root}: o.parent=root
    return root
