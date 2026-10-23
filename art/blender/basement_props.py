"""The cellar's physical contents: cooperage, charts, bottles and a candle.

Everything is modelled here except the stool, a cached Poly Haven CC0 scan.
Coordinates are metres, Z upright. No lights, scene reset or render on import.
"""
import math
import random
import bpy
from mathutils import Vector, Matrix
from kit import (link, plain, cylinder, lathe, sphere, import_model, bevel)
from hall_common import scan
from botany_staircase import mesh, block, bar


def _rod(name, a, b, radius, material, radius2=None, vertices=24):
    a, b = Vector(a), Vector(b)
    obj = cylinder(name, 0, 0, 0, (b-a).length, radius, material,
                   vertices, radius2)
    obj.location = a
    obj.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    return obj


def _ring(name, at, radius, height, width, material):
    return lathe(name, [(radius, -height/2), (radius+width, -height/2),
                       (radius+width, height/2), (radius, height/2),
                       (radius, -height/2)], material, at=at, steps=96)


def _nail(name, point, material, radius=.004):
    obj = cylinder(name, 0, 0, 0, .002, radius, material, 12)
    obj.rotation_euler.x = math.pi / 2
    obj.location = point
    bevel(obj, .0007, 2)
    return obj


def _coopered(name, x, y, height, radius, wood, iron, dark, rnd,
               count=22, open_top=False):
    """Separate curved oak staves, rebated lid and four forged flat hoops."""
    def rr(t):
        return radius * (.84 + .16 * math.sin(math.pi*t))
    thickness = .021
    for stave in range(count):
        a0 = math.tau * stave / count + .0038
        a1 = math.tau * (stave+1) / count - .0038
        vertices = []
        for inner in (False, True):
            for row in range(11):
                t = row / 10
                r = rr(t) - (thickness if inner else 0)
                for col in range(4):
                    a = a0 + (a1-a0)*col/3
                    vertices.append((x+r*math.cos(a), y+r*math.sin(a), t*height+.008))
        faces = []
        n = 44
        for layer in (0, n):
            for row in range(10):
                for col in range(3):
                    p = layer + row*4 + col
                    faces.append((p,p+1,p+5,p+4))
        for row in range(10):
            p=row*4
            faces.extend([(p,p+4,p+4+n,p+n),
                          (p+3,p+3+n,p+7+n,p+7)])
        for col in range(3):
            faces.extend([(col,col+n,col+1+n,col+1),
                          (40+col,41+col,41+col+n,40+col+n)])
        mesh(f'{name} | oak stave {stave+1:02d}', vertices, faces,
             wood, keep=False, edge=.0012)
    # The lid is really separate boards inside the upper stave rebate.
    if not open_top:
        R = radius*.81
        for i in range(6):
            x0=-R+i*2*R/6+.001
            x1=-R+(i+1)*2*R/6-.001
            # Slice the round lid into boards; arc ends follow the croze.
            outline=[]
            for j in range(9):
                xx=x0+(x1-x0)*j/8
                outline.append((x+xx,y-math.sqrt(max(0,R*R-xx*xx))))
            for j in range(9):
                xx=x1-(x1-x0)*j/8
                outline.append((x+xx,y+math.sqrt(max(0,R*R-xx*xx))))
            vs=[(a,b,z) for z in (height-.026,height-.008) for a,b in outline]
            n=len(outline)
            fs=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
            fs.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
            mesh(f'{name} | rebated lid board',vs,fs,wood,keep=False,edge=.0015)
    else:
        cylinder(f'{name} | dark inner bottom',x,y,.018,.035,radius*.79,dark,64)
    for t in (.07,.26,.75,.94):
        z=t*height+.008
        _ring(f'{name} | forged hoop', (x,y,z), rr(t)+.001, .034 if height>.5 else .025,
              .005, iron)
        # The hoop's lap and rivets sit on the camera-facing side.
        for zz in (z-.009,z+.009):
            _nail(f'{name} | hoop rivet',(x+.025,y-rr(t)-.006,zz),iron,.0033)
    # A few split ends in front staves, small enough to read as wear.
    for _ in range(5):
        a=rnd.uniform(math.pi*1.16,math.pi*1.84)
        t=rnd.choice((.03,.84)); end=min(.99,t+rnd.uniform(.035,.11))
        points=[]
        for j in range(5):
            u=t+(end-t)*j/4; ang=a+math.sin(j*1.7)*.002
            points.append((x+(rr(u)+.0008)*math.cos(ang),
                           y+(rr(u)+.0008)*math.sin(ang),u*height+.008))
        bar(f'{name} | fine stave split',points,.0006,dark,keep=False)


def _crate(materials, rnd, glass, straw):
    x,y=-1.58,4.12
    wood,iron=materials['oak'],materials['iron']
    # Four square corner posts carry slatted walls and an open top.
    for dx in (-.302,.302):
        for dy in (-.211,.211):
            block('bottle crate | corner post',x+dx-.018,x+dx+.018,
                  y+dy-.018,y+dy+.018,.015,.405,wood,keep=False,edge=.003)
    for i in range(5):
        block('bottle crate | bottom board',x-.315+i*.126,x-.315+(i+1)*.126-.004,
              y-.23,y+.23,.018,.042,wood,keep=False,edge=.002)
    for z in (.075,.18,.285,.38):
        for dy in (-.228,.228):
            block('bottle crate | side slat',x-.324,x+.324,y+dy-.011,y+dy+.011,
                  z-.034,z+.034,wood,keep=False,edge=.003)
            for xx in (x-.297,x+.297):
                _nail('bottle crate | clinched nail',(xx,y+dy-.012,z),iron,.0037)
        for dx in (-.315,.315):
            block('bottle crate | end slat',x+dx-.011,x+dx+.011,y-.21,y+.21,
                  z-.034,z+.034,wood,keep=False,edge=.003)
    # Hollow bottles with closed bases and a thick glass lip.
    for row in range(2):
        for col in range(3):
            bx=x-.19+col*.18+rnd.uniform(-.012,.012)
            by=y-.095+row*.19+rnd.uniform(-.012,.012)
            h=rnd.uniform(.43,.52)
            profile=[(0,0),(.036,0),(.044,.012),(.044,h*.64),
                     (.040,h*.71),(.020,h*.80),(.015,h*.84),
                     (.015,h-.022),(.018,h-.018),(.018,h),(.012,h),
                     (.012,h-.019),(.011,h*.84),(.016,h*.79),
                     (.036,h*.69),(.040,h*.63),(.040,.008),(0,.008)]
            lathe('bottle crate | empty green wine bottle',profile,glass,
                  at=(bx,by,.042),steps=48)
    for i in range(42):
        sx=x+rnd.uniform(-.29,.29);sy=y+rnd.uniform(-.19,.19)
        length=rnd.uniform(.07,.18);a=rnd.uniform(0,math.tau)
        z=rnd.uniform(.09,.18)
        bar('bottle crate | dry packing straw',[(sx,sy,z),
             (sx+math.cos(a)*length*.5,sy+math.sin(a)*length*.5,z+.012),
             (sx+math.cos(a)*length,sy+math.sin(a)*length,z-.006)],
             .0008,straw,keep=False)


def _scroll(name, at, length, radius, tilt, paper, thread, ink, rnd):
    """A rolled sheet, including its exposed spiral end and thin paper edge."""
    before=set(bpy.data.objects)
    turns=math.tau*2.15
    ns=112
    vertices=[]
    for row in range(7):
        z=length*row/6
        for i in range(ns+1):
            a=turns*i/ns
            r=radius*(.42+.58*i/ns)
            zz=z+.002*math.sin(a*3.2)*(row/6)
            vertices.append((r*math.cos(a),r*math.sin(a),zz))
    faces=[]
    for j in range(6):
        for i in range(ns):
            p=j*(ns+1)+i
            faces.append((p,p+1,p+ns+2,p+ns+1))
    obj=mesh(name+' | spiral paper',vertices,faces,paper,keep=False)
    solid=obj.modifiers.new('actual paper thickness','SOLIDIFY');solid.thickness=.00045
    for p in obj.data.polygons:p.use_smooth=True
    # The binding follows the outside of the rolled sheet.
    points=[((radius+.0015)*math.cos(math.tau*i/64),
             (radius+.0015)*math.sin(math.tau*i/64),length*.43) for i in range(65)]
    bar(name+' | binding cord',points,.0012,thread,keep=False)
    bar(name+' | loose cord ends',[(radius+.003,0,length*.43),
        (radius+.015,.008,length*.39),(radius+.008,.014,length*.33)],.0008,thread,keep=False)
    # Faint cartographic lines on the final outside turn, still geometry.
    for j in range(3):
        z=length*(.56+j*.095)
        points=[]
        for i in range(24):
            a=turns-2.2+i/23*1.9
            r=radius*(.42+.58*a/turns)+.0007
            points.append((r*math.cos(a),r*math.sin(a),z+.008*math.sin(i*.47+j)))
        bar(name+' | old chart ink',points,.00035,ink,keep=False)
    root=link(bpy.data.objects.new(name,None))
    for o in set(bpy.data.objects)-before:
        if o is not root and o.parent is None:o.parent=root
    root.location=at;root.rotation_euler=tilt
    return root


def _rack(materials):
    wood,iron=materials['oak'],materials['iron']
    x,y=2.38,4.4
    width=.86; grid=.86; bottom=.07; thick=.024
    lo=x-width/2
    # Exactly six rails each way; twenty-five clear openings. No backing.
    for i in range(6):
        xx=lo+i*width/5
        block(f'bottle rack | vertical rail {i+1}',xx-thick/2,xx+thick/2,
              y-.08,y+.08,bottom,bottom+grid,wood,keep=False,edge=.0022)
        z=bottom+i*grid/5
        block(f'bottle rack | horizontal rail {i+1}',lo-thick/2,lo+width+thick/2,
              y-.082,y+.078,z-thick/2,z+thick/2,wood,keep=False,edge=.0022)
    for side in (-1,1):
        xx=x+side*(width/2+.025)
        block('bottle rack | heavy side stile',xx-.022,xx+.022,y-.095,y+.095,
              .012,.964,wood,keep=False,edge=.004)
        block('bottle rack | foot',xx-.043,xx+.043,y-.14,y+.12,.008,.047,
              wood,keep=False,edge=.003)
        for z in (.084,.91):
            _nail('bottle rack | iron pin',(xx,y-.097,z),iron,.004)
    block('bottle rack | top cap',lo-.053,lo+width+.053,y-.10,y+.10,.94,.974,
          wood,keep=False,edge=.003)
    for i in range(6):
        for j in range(6):
            _nail('bottle rack | pegged crossing',
                  (lo+i*width/5,y-.084,bottom+j*grid/5),iron,.0023)
    return {'columns':5,'rows':5,'bounds':(lo-.053,lo+width+.053,.008,.974)}


def _candle(materials):
    x,y=1.68,4.05
    # The photographed mesh is a real CC0 object, with its UV texture maps.
    import_model('wooden_stool_01',height=.54,at=(x,y,0),rot=.26)
    brass,wax,dark=materials['brass'],materials['wax'],materials['dark']
    lathe('candle | brass drip dish',[(0,.543),(.067,.543),(.091,.552),
        (.096,.565),(.094,.574),(.089,.574),(.086,.565),(.062,.551),(0,.551)],
        brass,at=(x,y,0),steps=96)
    lathe('candle | short brass socket',[(.024,.549),(.026,.552),(.026,.577),
        (.023,.581),(.020,.578),(.020,.554),(.024,.549)],brass,at=(x,y,0))
    candle=lathe('candle | worn beeswax body',[(0,.565),(.023,.565),
        (.023,.74),(.021,.763),(.017,.772),(.011,.763),(.006,.755),(0,.756)],
        wax,at=(x,y,0),steps=64)
    for a,z,width in [(1.0,.65,.004),(2.8,.69,.003),(4.2,.615,.005),(5.2,.70,.004)]:
        px=x+.023*math.cos(a);py=y+.023*math.sin(a)
        bar('candle | cooled wax drip',[(px,py,.751),(px+.001,py,.73),
            (px,py,z+.012),(px,py,z)],width,wax,keep=False)
        sphere('candle | wax bead',(px,py,z),width,wax,squash=(1,1,1.5))
    for i in range(3):
        a=math.tau*i/3
        sphere('candle | wax on dish',(x+.037*math.cos(a),y+.037*math.sin(a),.555),
               .014,wax,squash=(1,.8,.16))
    bar('candle | charred wick',[(x,y,.757),(x+.002,y,.776),(x,y,.79)],
        .0012,dark,keep=False)
    return (x,y,.79)


def _tools(materials):
    wood,iron=materials['oak'],materials['iron']
    # A worn joiner's mallet on its side; its handle is properly socketed.
    start=Vector((2.27,3.09,.065));end=Vector((2.53,3.27,.07))
    _rod('carving tools | mallet handle',start,end,.017,wood,radius2=.023)
    head=block('carving tools | worn mallet head',-.09,.09,-.048,.048,-.048,.048,
               wood,keep=False,edge=.011)
    head.location=end
    head.rotation_euler.z=math.atan2(.16,-.11)
    a=Vector((2.03,3.24,.022));b=Vector((2.28,3.32,.024))
    _rod('carving tools | chisel shank',a,b,.008,iron,vertices=8)
    n=(a-b).normalized();p=a+n*.055
    mesh('carving tools | sharpened chisel edge',
        [tuple(a+Vector((-.012,0,-.004))),tuple(a+Vector((.012,0,-.004))),
         tuple(a+Vector((.012,0,.004))),tuple(a+Vector((-.012,0,.004))),
         tuple(p+Vector((-.018,0,-.002))),tuple(p+Vector((.018,0,-.002)))],
        [(0,1,2,3),(0,4,5,1),(3,2,5,4),(0,3,4),(1,5,2)],iron,keep=False,edge=.0008)


def build_props(materials):
    """Populate the room and return the actual wick and exact rack facts."""
    before=set(bpy.data.objects)
    rnd=random.Random(59136)
    wood=scan('cellar props | long-grain coopered oak','dark_wood',.43,
              tint=(.66,.61,.50),bright=.84,sat=.18,rough=(.65,.9),bump=.42,
              upright=True,vary=.22,dirt=.16,grime=.22)
    glass=plain('cellar props | old bottle green glass',(.10,.22,.075),.075,
                transmission=.95,ior=1.47)
    straw=plain('cellar props | dry packing straw',(.20,.145,.064),.9)
    thread=plain('cellar props | stained linen binding',(.19,.15,.09),.95)
    ink=plain('cellar props | faded chart ink',(.07,.061,.041),.95)
    _coopered('left cask',-3.18,4.25,.88,.24,wood,materials['iron'],materials['dark'],rnd)
    _coopered('small cask',-2.72,4.40,.74,.215,wood,materials['iron'],materials['dark'],rnd)
    _crate(materials,rnd,glass,straw)
    _coopered('chart tub',-.90,4.17,.40,.205,wood,materials['iron'],materials['dark'],rnd,
              count=18,open_top=True)
    for i in range(7):
        a=math.tau*i/7;r=.105 if i else .015
        x=-.9+r*math.cos(a);y=4.17+r*math.sin(a)
        length=rnd.uniform(.51,.76)
        _scroll(f'rolled chart {i+1}',(x,y,.16),length,rnd.uniform(.024,.039),
                (rnd.uniform(-.18,.18),rnd.uniform(-.20,.20),rnd.uniform(0,math.tau)),
                materials['paper'],thread,ink,rnd)
    _scroll('fallen chart',(-1.14,3.74,.047),.42,.036,(0,math.pi/2,.13),
            materials['paper'],thread,ink,rnd)
    rack=_rack(materials)
    for obj in bpy.data.objects:
        if obj not in before and obj.name.startswith('bottle rack |'):
            obj.location.x-=.075
    candle=_candle(materials)
    _tools(materials)
    # The grain follows the long axis of every rail and crate board.
    across=materials['oak'].copy();across.name='cellar props | grain along horizontal rails'
    for node in across.node_tree.nodes:
        if node.type=='MAPPING':node.inputs['Rotation'].default_value=(0,0,0)
    for obj in bpy.data.objects:
        if obj not in before and obj.type=='MESH' and any(part in obj.name for part in (
            'crate | side slat','crate | end slat','crate | bottom board',
            'rack | horizontal','rack | top cap')):
            obj.data.materials.clear();obj.data.materials.append(across)
    for obj in bpy.data.objects:
        if obj not in before and obj.parent is None:
            obj.location.z-=.014
    candle=(candle[0],candle[1],candle[2]-.014)
    return {'candle':candle,'rack':rack,
            'objects':[o.name for o in bpy.data.objects if o not in before]}
