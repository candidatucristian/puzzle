"""Physical joinery and objects for Room II's restrained library renovation."""
import bpy, math, random, os
from kit import *
from room_common import *


def curve(name, points, radius, material):
    data = bpy.data.curves.new(name, 'CURVE'); data.dimensions = '3D'
    data.bevel_depth = M(radius); data.bevel_resolution = 3
    spline = data.splines.new('BEZIER'); spline.bezier_points.add(len(points)-1)
    for point, co in zip(spline.bezier_points, points):
        point.co = P(*co); point.handle_left_type = point.handle_right_type = 'AUTO'
    obj = link(bpy.data.objects.new(name, data)); obj.data.materials.append(material)
    return obj


def text(name, body, at, size, material, vertical=False):
    data = bpy.data.curves.new(name, 'FONT'); data.body = body
    data.font = bpy.data.fonts.get('Georgia') or bpy.data.fonts.load('C:/Windows/Fonts/georgia.ttf')
    data.align_x = 'CENTER'; data.align_y = 'CENTER'; data.size = M(size)
    data.extrude = .00007
    obj = link(bpy.data.objects.new(name, data)); obj.data.materials.append(material)
    obj.location = P(*at); obj.rotation_euler = (math.pi/2, math.pi/2 if vertical else 0, 0)
    return obj


def volume(name, x, y, d, w, h, depth, material, pages, gilt, title='', mark=None):
    before = set(bpy.data.objects)
    box_cm(name+' page block', -w/2+.24, w/2-.24, .23, h-.23, .65, depth-.2, pages, .09)
    for side in (-1, 1):
        box_cm(name+' binding board',side*w/2-.15,side*w/2+.15,0,h,0,depth,material,.14)
    box_cm(name+' rounded spine',-w/2,w/2,0,h,-.45,.8,material,.3)
    for z in (1.6, 3.0, h-3, h-1.6):
        box_cm(name+' gilt tooling',-w*.42,w*.42,z,z+.065,-.51,-.45,gilt)
    if title: text(name+' title',title,(0,h*.52,-.54),1.5 if mark is None else 2.3,gilt,True)
    if mark is not None:
        slip = paper('numbered cotton bookmark',(.69,.61,.44),.08)
        ink = plain('bookmark ink',(.025,.017,.01),rough=1)
        box_cm(name+' bookmark',-1.4,1.4,h-1,h+5.2,1.6,1.67,slip)
        text(name+' number',str(mark),(0,h+2.8,1.55),2.7,ink)
    root = link(bpy.data.objects.new(name, None)); root.location = P(x,y,d)
    for obj in set(bpy.data.objects)-before-{root}:
        if obj.parent is None: obj.parent = root
    return root


def library_case(x0, x1, back, wood, rails, pages, brass, covers, clues):
    """Four deliberate book rows above panelled cupboards; no random props."""
    rng = random.Random(220326); face = back-34
    box_cm('cabinet back',x0,x1,5,255,back-2,back,wood,.3)
    for x in (x0,x1-6,(x0+x1)/2-2.5):
        width = 5 if x==(x0+x1)/2-2.5 else 6
        box_cm('cabinet stile',x,x+width,7,254,face-1,back,wood,.55)
        for off in (1.5,3.5):
            rod('stile flute',P(x+off,64,face-1.1),P(x+off,241,face-1.1),M(.13),rails)
    for z in (7,54,103,151,199,248):
        box_cm('shelf',x0+5,x1-5,z,z+2.8,face,back,rails,.3)
        box_cm('rounded shelf lip',x0+4,x1-4,z-.4,z+2.5,face-1.2,face+1.6,rails,.45)
    for z,w,h,proud in ((0,1,7,2),(7,0,5,1),(251,3,3,3),(254,5,3,5),(257,3,2,3)):
        box_cm('cabinet crown or plinth',x0-w,x1+w,z,z+h,face-proud,back+1,rails,.45)
    mid=(x0+x1)/2
    for a,b in ((x0+7,mid-4),(mid+4,x1-7)):
        box_cm('cupboard door',a,b,13,51,face-1,face+1.4,wood,.4)
        box_cm('raised cupboard panel',a+6,b-6,19,45,face-1.8,face-.9,wood,.65)
        pullx=b-4 if a<mid else a+4
        sphere('cupboard knob',tuple(P(pullx,33,face-2.6)),M(.9),brass)
    gold=aged_metal('subdued book tooling',(.40,.28,.11),(.10,.065,.025),rough=(.52,.7),tarnish=.45)
    titles=('BOTANY','ESSAYS','HISTORY','POEMS','NATURE','TRAVELS','LETTERS','ATLAS')
    special=[x0+22,x0+60,x0+97,x0+148,x0+188]
    for i,(x,clue) in enumerate(zip(special,clues)):
        volume('marked volume '+str(i),x,106,face-5,7.2,34,26,covers[i],pages,gold,clue['title'],clue['mark'])
    for row,(bottom,top) in enumerate(((57,103),(106,151),(154,199),(202,248))):
        for a,b in ((x0+7,mid-4),(mid+4,x1-7)):
            x=a+1
            while x<b-4:
                w=rng.uniform(3.6,6)
                # Intentional air at each bay end and between small groups.
                if row!=1 and rng.random()<.09: x+=rng.uniform(8,15); continue
                if row==1 and any(x<s+5 and x+w>s-5 for s in special): x+=w; continue
                if x+w>b-1: break
                volume('bound library volume',x+w/2,bottom,face+rng.uniform(.8,4),w,rng.uniform(27,top-bottom-3),rng.uniform(22,28),rng.choice(covers),pages,gold,rng.choice(titles))
                x+=w+rng.uniform(.2,.7)
    return (x0,x1,54,249,face-6,back)


def banker_lamp(x, y, d, brass):
    lathe('lamp weighted foot',[(0,0),(.085,0),(.088,.008),(.076,.02),(.04,.03),(.016,.045),(.012,.35),(0,.35)],brass,at=tuple(P(x,y,d)),steps=64)
    for side in (-1,1):
        curve('lamp shade support',[(x,y+31,d),(x+side*10,y+35,d),(x+side*13,y+42,d)],.45,brass)
    glass = plain('opaque green opal shade',(.009,.055,.027),rough=.32,emit=(.018,.10,.045),strength=.14,spec=.32)
    inner = plain('ivory opal interior',(.66,.63,.48),rough=.48)
    verts=[]; faces=[]; segments=64
    for sx in (-14,14):
        for i in range(segments+1):
            t=math.pi*i/segments
            verts.append(tuple(P(x+sx,y+40+6.8*math.sin(t),d+6.8*math.cos(t))))
    for i in range(segments): faces.append((i,i+1,i+segments+2,i+segments+1))
    mesh=bpy.data.meshes.new('opal shade'); mesh.from_pydata(verts,[],faces); mesh.update()
    obj=link(bpy.data.objects.new('open bottom glass shade',mesh)); obj.data.materials.append(glass); obj.data.materials.append(inner)
    for p in mesh.polygons: p.use_smooth=True
    thick=obj.modifiers.new('actual opal glass thickness','SOLIDIFY'); thick.thickness=.0025; thick.material_offset=1
    bevel(obj,.0013,3)
    for sx in (-14,14):
        curve('shade brass rim',[(x+sx,y+40+6.8*math.sin(math.pi*i/32),d+6.8*math.cos(math.pi*i/32)) for i in range(33)],.16,brass)
    # One local practical; the shade itself controls the light's escape.
    lamp('banker practical only','POINT',tuple(P(x,y+39,d)),energy=float(arg('--practical','12')),colour=(1,.74,.46),size=.035)
    bulb=plain('lamp bulb',(.8,.65,.4),rough=.6,emit=(1,.7,.38),strength=1.5)
    rod('frosted tubular bulb',P(x-8,y+39,d),P(x+8,y+39,d),.009,bulb,verts=24)
    curve('lamp pull chain',[(x+12,y+40,d-2),(x+12,y+31,d-2),(x+12.2,y+26,d-2)],.055,brass)
    sphere('chain end',tuple(P(x+12.2,y+26,d-2)),M(.5),brass)


def router(x,y,d):
    black=plain('router aged charcoal ABS',(.022,.026,.027),rough=.62,spec=.28)
    rubber=plain('router rubber feet',(.008,.009,.009),rough=.94)
    box_cm('router moulded lower shell',x,x+35,y+.5,y+6.5,d,d+23,black,.65)
    box_cm('router lid seam',x+.3,x+34.7,y+6.5,y+6.8,d+.3,d+22.7,rubber,.3)
    box_cm('router upper shell',x+.2,x+34.8,y+6.8,y+7.5,d+.2,d+22.8,black,.65)
    for xx in (x+3,x+32):
        for dd in (d+3,d+20): cylinder('rubber foot',M(xx),M(dd),M(y),M(y+.6),M(.8),rubber,verts=16)
    for i in range(16):
        box_cm('router ventilation slot',x+4+i*1.65,x+4.55+i*1.65,y+7.49,y+7.54,d+8,d+16,rubber,.15)
    for xx in (x+4,x+31):
        cylinder('antenna joint',M(xx),M(d+21),M(y+7),M(y+9),M(.9),black,verts=24)
        cylinder('antenna',M(xx),M(d+21),M(y+9),M(y+25),M(.48),black,verts=24)
    off=plain('unlit indicator lens',(.014,.04,.025),rough=.45)
    lit=plain('small power indicator',(.025,.13,.055),rough=.48,emit=(.07,.35,.12),strength=.65)
    points=[]
    for i in range(13):
        pos=(x+4+i*2.1,y+2.8,d-.05)
        sphere('recessed indicator',tuple(P(*pos)),M(.19),lit if i==0 else off,squash=(1,.3,1))
        if i in (8,9): points.append(P(*pos))
    label=plain('router grey silkscreen',(.22,.23,.20),rough=.9)
    text('router maker','W. LEIBNIZ',(x+17.5,y+4.7,d-.08),.65,label)
    curve('router power cable',[(x+4,y+3,d+23),(x-6,y+.2,d+28),(x-23,y+.2,d+36),(x-24,y-3,d+38),(x-24,1,d+43)],.22,rubber)
    return (x-2,x+37,y,y+26,d-1,d+24),points


def clocks(x, d, h, wood, brass):
    """Same clock faces as the puzzle, with low display luminance."""
    from room_furnish import pedestal_desk
    leather=scan('clock desk leather','brown_leather',size=.6,tint=(.24,.29,.21),bright=.52,rough=(.65,.86),bump=.25)
    pedestal_desk(dict(x0=x-69,x1=x+69,d0=d-29,d1=d+29,h=h),wood,leather,brass)
    black=plain('clock aged case',(.018,.021,.021),rough=.57)
    dark=plain('display bezel',(.008,.01,.009),rough=.48)
    drawn=os.path.join(ROOT,'.artifacts/rooms')
    def face(i,x0,x1,y0,y1,depth):
        mat=picture('clock face '+str(i),os.path.join(drawn,f'clock-{i}-dim.png'),rough=.55)
        n=mat.node_tree.nodes; lit=n.new('ShaderNodeTexImage'); lit.image=bpy.data.images.load(os.path.join(drawn,f'clock-{i}-lit.png'),check_existing=True)
        mat.node_tree.links.new(lit.outputs['Color'],n['Principled BSDF'].inputs['Emission Color'])
        n['Principled BSDF'].inputs['Emission Strength'].default_value=.28 if i!=3 else .0
        return card('clock display '+str(i),[P(x0,y0,depth),P(x1,y0,depth),P(x1,y1,depth),P(x0,y1,depth)],mat)
    # Alarm, radio and travel clock remain a small coherent collection.
    ax=x-40
    box_cm('alarm case',ax-7,ax+7,h,h+11,d-7,d+1,black,.9)
    box_cm('alarm snooze',ax-4,ax+4,h+11,h+12,d-5,d-1,black,.3)
    face(2,ax-5.4,ax+5.4,h+3,h+8,d-7.05)
    rx=x-5
    box_cm('clock radio',rx-15,rx+15,h,h+12,d-5,d+8,black,.6)
    for xx in (rx-15,rx+14): box_cm('radio walnut cheek',xx,xx+1,h,h+12,d-5.3,d+8.3,wood,.25)
    face(1,rx-12,rx+1,h+3,h+8,d-5.1)
    for j in range(9): box_cm('radio grille',rx+3,rx+12,h+2+j*.85,h+2.2+j*.85,d-5.1,d-5,dark)
    for xx in (rx-10,rx-6): sphere('radio knob',tuple(P(xx,h+1.6,d-5.1)),M(.65),brass,squash=(1,.4,1))
    tx=x+35
    box_cm('folding clock base',tx-6,tx+6,h,h+1.2,d-5,d+5,leather,.4)
    box_cm('folding clock back',tx-6,tx+6,h,h+11,d+2,d+3,leather,.55)
    box_cm('travel clock bezel',tx-5,tx+5,h+1.6,h+10.5,d+1,d+2,brass,.35)
    face(3,tx-4,tx+4,h+3,h+9,d+.95)
    # Wall clock, restrained red segments behind a physical rounded bezel.
    box_cm('wall clock housing',x-35,x+35,155,186,d+47,d+54,black,1.8)
    box_cm('wall clock inset',x-32,x+32,158,183,d+46.8,d+47.1,dark,.7)
    face(0,x-27,x+27,162,179,d+46.7)
    curve('clock cable',[(x+23,155,d+53),(x+24,120,d+54),(x+25,74,d+54)],.18,black)
    return (x-71,x+71,h-4,188,d-30,d+55)
