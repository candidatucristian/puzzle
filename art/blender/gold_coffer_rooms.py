# Render the same coffer in each room's actual light, with real contact shadows.
# No local spotlight, additive glow, exposure boost or painted highlights.
import bpy, os, sys, math, json, runpy
from mathutils import Vector
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from kit import *
import room_common as rc
from gold_coffer_model import coffer, key_model

ROOM=arg('--room','Study'); WIDTH=int(arg('--width','6144')); SAMPLES=int(arg('--samples','320'))
BUILDERS={'Study':'room_study_v4.py','Room2':'room_library.py','Room3':'room_cabin.py','Room4':'room_counting.py','Room5':'room_drawing.py'}
OUT=os.path.join(rc.ROOT,'.artifacts/gold-coffer-v2',ROOM); os.makedirs(OUT,exist_ok=True)
with open(os.path.join(rc.ROOT,'src/levels/house/rooms',ROOM+'.json'),encoding='utf-8') as f: ORIGINAL=json.load(f)
rc.chest=coffer
# Rendering this prop must not overwrite a room's puzzle or window geometry.
rc.Layout.write=lambda self: None

def native_chest(scene,out,box_,body,hinge,lid_parts,**kwargs):
    scope=sys._getframe(1).f_globals
    if 'ONE' in scope: rc.one_light(scope['ONE'],scope.get('OUT_LIGHTS',[]))
    # Keep exactly the camera and registered crop that the room uses.
    crop=ORIGINAL['chest']['box']; r=scene.render; k=WIDTH/1880
    r.resolution_x=WIDTH; r.resolution_y=round(WIDTH*1000/1880); r.resolution_percentage=100
    r.use_border=True; r.use_crop_to_border=True
    bx,by,bw,bh=crop; r.border_min_x=bx/1880; r.border_max_x=(bx+bw)/1880
    r.border_min_y=1-(by+bh)/1000; r.border_max_y=1-by/1000
    r.film_transparent=True; r.image_settings.color_mode='RGBA'; scene.use_nodes=False
    scene.render.use_persistent_data=True; scene.cycles.samples=SAMPLES
    scene.cycles.adaptive_threshold=.008; scene.cycles.sample_clamp_direct=0
    mine={o.name for o in body+lid_parts}
    for o in bpy.data.objects:
        if o.type in ('MESH','CURVE','FONT'):
            o.is_holdout=False
            if o.name in mine: o.hide_render=False; o.visible_camera=True
            else: o.visible_camera=False
        if o.type=='LIGHT' and o.data.type=='AREA': o.visible_camera=False
    bpy.context.view_layer.update()
    corners=[o.matrix_world@Vector(p) for o in body for p in o.bound_box]
    lo=Vector([min(p[i] for p in corners) for i in range(3)]); hi=Vector([max(p[i] for p in corners) for i in range(3)])
    centre=(lo+hi)/2; z=lo.z-.0002
    # Sample the real tabletop under the feet for the shadow receiver's material.
    hit,loc,norm,index,obj,matrix=scene.ray_cast(bpy.context.evaluated_depsgraph_get(),Vector((centre.x,centre.y,z-.0004)),Vector((0,0,-1)),distance=.15)
    receiver=rc.card('Coffer | contact shadow',[(lo.x-.028,lo.y-.028,z),(hi.x+.028,lo.y-.028,z),(hi.x+.028,hi.y+.028,z),(lo.x-.028,hi.y+.028,z)],
                     obj.data.materials[obj.data.polygons[index].material_index] if hit and len(obj.data.materials) else plain('shadow receiver',(.15,.10,.055),rough=.7))
    receiver.is_shadow_catcher=True
    for pose in range(13):
        hinge.rotation_euler.x=-1.9*pose/12
        render(scene,os.path.join(OUT,f'pose-{pose:02d}.png'))
    # The matching key is photographed in the same room, without a new light.
    receiver.hide_render=True
    for o in body+lid_parts: o.visible_camera=False
    key=key_model(); key.location=(centre.x,centre.y,hi.z+.055)
    oldcam=scene.camera; eye=oldcam.matrix_world.translation.copy()
    toward=(eye-key.location); key.rotation_euler.z=math.atan2(toward.x,-toward.y)
    cd=oldcam.data.copy(); cd.type='ORTHO'; cd.sensor_fit='VERTICAL'; cd.shift_x=0; cd.shift_y=0; cd.ortho_scale=.122
    cam=link(bpy.data.objects.new('Coffer | key portrait camera',cd)); target=key.location+Vector((0,0,.051))
    cam.location=target+(eye-centre).normalized()*.65; cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler(); scene.camera=cam
    r.use_border=False; r.use_crop_to_border=False; r.resolution_x=432; r.resolution_y=990
    render(scene,os.path.join(OUT,'key.png'))
    with open(os.path.join(OUT,'coffer.json'),'w',encoding='utf-8') as f:
        json.dump({'room':ROOM,'crop':crop,'poses':13},f,indent=2)
    print('NATIVE_COFFER_DONE',ROOM)

rc.chest_sprites=native_chest
sys.argv=[sys.argv[0],'--','--only','chest','--width',str(WIDTH),'--samples',str(SAMPLES)]
runpy.run_path(os.path.join(os.path.dirname(__file__),BUILDERS[ROOM]),run_name='__main__')
