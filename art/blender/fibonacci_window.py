"""A modeled foreground window looking out onto the existing garden.

The transparent Cycles plate keeps the accepted garden renders unchanged.
An inset oak frame, deep sill, worn plaster reveals and old brass hinges
are actual geometry, with photographed wood and plaster materials.
"""
import bpy,json,sys
from pathlib import Path
from mathutils import Vector

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from kit import arg,link,bevel,aged_metal,lamp,cycles
from hall_common import scan

PREFIX='Foreground window | '
WINDOW={'file':'window-v1.webp','version':1,'size':[2560,1600],
        'borders':[218,120,218,192]}

def window_metadata(width,height):
    kx,ky=width/2560,height/1600
    return {**WINDOW,'size':[width,height],
            'borders':[round(218*kx),round(120*ky),round(218*kx),round(192*ky)]}

def build_window(scene):
    existing=[o for o in scene.objects if o.name.startswith(PREFIX)]
    if existing:return existing
    cam=scene.camera;ratio=scene.render.resolution_y/scene.render.resolution_x
    span=cam.data.sensor_width/cam.data.lens
    rotation=cam.matrix_world.to_3x3()
    def point(x,y,d):
        return cam.location+rotation@Vector(((x-.5)*span*d,(.5-y)*span*d*ratio,-d))
    def member(name,front,rear,d0,d1,mat,r=.0012):
        verts=[]
        for rect,d in [(front,d0),(rear,d1)]:
            l,t,rgt,b=rect
            verts.extend([point(l,t,d),point(rgt,t,d),point(rgt,b,d),point(l,b,d)])
        faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
        me=bpy.data.meshes.new(PREFIX+name);me.from_pydata(verts,[],faces);me.update()
        ob=link(bpy.data.objects.new(PREFIX+name,me));ob.data.materials.append(mat)
        if r:bevel(ob,r,3)
        return ob
    oak=scan(PREFIX+'worn dark oak','dark_wood',size=.32,tint=(.72,.52,.33),bright=.58,sat=.5,rough=(.40,.68),bump=.25,coat=.08,upright=True)
    sill=scan(PREFIX+'oiled oak sill','dark_wood',size=.45,tint=(.70,.53,.35),bright=.62,sat=.5,rough=(.38,.65),bump=.3,coat=.12)
    plaster=scan(PREFIX+'aged warm plaster','worn_plaster_wall',size=.75,tint=(.70,.67,.57),bright=.46,sat=.25,rough=(.78,.94),bump=.4)
    brass=aged_metal(PREFIX+'tarnished hinge brass',(.28,.21,.11),(.046,.038,.022),rough=(.30,.61),scale=42,tarnish=.7)
    # The reveal slopes away from the eye; its rear edge stands inside the
    # aperture. Real bevels catch the small amount of light from the room.
    member('left plaster reveal',(-.15,-.12,.015,1.10),(-.15,-.12,.029,1.10),1.58,2.24,plaster,.003)
    member('right plaster reveal',(.985,-.12,1.15,1.10),(.971,-.12,1.15,1.10),1.58,2.24,plaster,.003)
    member('top plaster reveal',(-.15,-.15,1.15,.007),(-.15,-.15,1.15,.023),1.58,2.24,plaster,.003)
    member('left oak jamb',(.011,-.10,.039,1.10),(.025,-.10,.063,1.10),1.78,2.30,oak)
    member('right oak jamb',(.961,-.10,.989,1.10),(.937,-.10,.975,1.10),1.78,2.30,oak)
    member('oak lintel',(.028,-.08,.972,.027),(.050,-.08,.950,.055),1.80,2.30,oak)
    # Narrow stepped stops make the inside edge read as actual joinery.
    member('left inset stop',(.059,.048,.068,.925),(.062,.049,.070,.925),2.25,2.32,oak,.0007)
    member('right inset stop',(.932,.048,.941,.925),(.930,.049,.938,.925),2.25,2.32,oak,.0007)
    member('top inset stop',(.061,.048,.939,.059),(.064,.051,.936,.062),2.25,2.32,oak,.0007)
    # Deep horizontal sill, rounded bullnose, and a recessed front apron.
    # The broad upper face and its lip are visible from the player's eye.
    member('deep oak sill',(-.09,.968,1.09,1.105),(.021,.902,.979,.963),1.59,2.34,sill,.003)
    member('rounded sill nose',(-.09,.966,1.09,.991),(-.08,.974,1.08,.997),1.57,1.64,sill,.0025)
    member('sill apron',(-.03,.993,1.03,1.14),(-.02,1.002,1.02,1.14),1.67,1.83,oak,.0017)
    member('outer sill stop',(.062,.902,.938,.918),(.065,.903,.935,.921),2.28,2.34,oak,.0008)
    # Small hinge leaves and actual round vertical pins at the opening.
    for side in [-1,1]:
        x=.063 if side<0 else .937
        for y in [.30,.70]:
            member('hinge leaf',(x-.004,y-.020,x+.004,y+.020),(x-.004,y-.020,x+.004,y+.020),2.245,2.255,brass,.0004)
            a,b=point(x+side*.002,y-.022,2.24),point(x+side*.002,y+.022,2.24)
            bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.0020,depth=(b-a).length,location=(a+b)/2)
            ob=bpy.context.object;ob.name=PREFIX+'hinge pin';ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();ob.data.materials.append(brass)
            bevel(ob,.00035,2)
    soft=lamp(PREFIX+'soft interior light','AREA',tuple(point(.50,-.50,.8)),aim=tuple(point(.45,.75,2.1)),energy=3.4,colour=(1,.79,.56),size=1.25)
    soft.visible_camera=False;soft.visible_glossy=False;soft.visible_transmission=False
    fill=lamp(PREFIX+'quiet interior bounce','AREA',tuple(point(-.1,.4,.9)),aim=tuple(point(.7,.6,2.15)),energy=.65,colour=(.77,.82,.90),size=.75)
    fill.visible_camera=False;fill.visible_glossy=False;fill.visible_transmission=False
    scene['viewpoint']='through an open manor window'
    return [o for o in scene.objects if o.name.startswith(PREFIX)]

def render_window(scene,out,width=2560,samples=192):
    frame=build_window(scene)
    for ob in scene.objects:
        if ob.type not in {'LIGHT','CAMERA','EMPTY'}:ob.hide_render=ob not in frame
        if ob in frame:ob.hide_render=False;ob.visible_camera=True
        if ob.type=='LIGHT' and ob not in frame:ob.visible_glossy=False
    scene.camera.data.dof.use_dof=False
    scene.render.use_border=False
    cycles(scene,samples,width,round(width/1.6),exposure=.35,glare=False,transparent=True)
    scene.cycles.device='CPU'
    scene.cycles.adaptive_threshold=.015
    scene.render.image_settings.color_mode='RGBA'
    scene.render.filepath=str(out/'window.png')
    bpy.ops.render.render(write_still=True)
    print('FIBONACCI_WINDOW_DONE',flush=True)

if __name__=='__main__':
    out=Path(arg('--out',str(HERE.parents[1]/'.artifacts/fibonacci-window'))).resolve();out.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(HERE/'fibonacci.blend'))
    scene=bpy.context.scene
    build_window(scene)
    meta=json.loads(scene['game_landmarks']);meta['window']=WINDOW
    scene['game_landmarks']=json.dumps(meta)
    if '--save' in sys.argv:
        bpy.context.preferences.filepaths.save_version=0
        bpy.ops.file.pack_all()
        bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'fibonacci.blend'),compress=True)
    width=int(arg('--width','2560'))
    (out/'window.json').write_text(json.dumps(window_metadata(width,round(width/1.6)),indent=2),encoding='utf8')
    render_window(scene,out,width,int(arg('--samples','192')))
