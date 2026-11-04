# Render the same coffer in each room's actual light, with real contact shadows.
# No local spotlight, additive glow, exposure boost or painted highlights.
import bpy, os, sys, math, json, runpy
from mathutils import Vector, Matrix
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from kit import *
import room_common as rc
from gold_coffer_model import coffer, key_model

ROOM=arg('--room','Study'); WIDTH=int(arg('--width','6144')); SAMPLES=int(arg('--samples','320'))
# How much of the room's broad front fill (its "fill" and the "fill at the
# eye") the coffer's gold shows. Seen straight on (rooms I and II) the gold
# mirrors those great soft lights whole: the shut lid comes out flat and pale
# and reads as a box standing open. Less of them there, and its shape comes
# from the room's own lights — candles, window, lamps.
FILL=float(arg('--fill-k',{'Study':'0.3','Room2':'0.1'}.get(arg('--room','Study'),'1')))
BUILDERS={'Study':'room_study_v5.py','Room2':'room_library.py','Room3':'room_cabin.py','Room4':'room_counting.py','Room5':'room_drawing.py'}
OUT=os.path.join(rc.ROOT,'.artifacts/gold-coffer-v2',ROOM); os.makedirs(OUT,exist_ok=True)
with open(os.path.join(OUT,'render.pid'),'w') as f: f.write(str(os.getpid()))
with open(os.path.join(rc.ROOT,'src/levels/house/rooms',ROOM+'.json'),encoding='utf-8') as f: ORIGINAL=json.load(f)
rc.chest=coffer
# Rendering this prop must not overwrite a room's puzzle or window geometry.
rc.Layout.write=lambda self: None

def native_chest(scene,out,box_,body,hinge,lid_parts,**kwargs):
    scope=sys._getframe(1).f_globals
    if 'ONE' in scope: rc.one_light(scope['ONE'],scope.get('OUT_LIGHTS',[]))
    # Keep exactly the camera and registered crop that the room uses.
    crop=ORIGINAL['chest']['box']; r=scene.render; k=WIDTH/1880
    bx,by,bw,bh=crop; original_camera=scene.camera; original_data=original_camera.data
    # A calibrated camera crop avoids Cycles' full-frame shadow-catcher pass.
    # Its rays are exactly the original room camera's rays through this box.
    crop_data=original_data.copy(); crop_data.sensor_fit='HORIZONTAL'
    crop_data.sensor_width=original_data.sensor_width
    crop_data.lens=original_data.lens*1880/bw
    crop_data.shift_x=(original_data.shift_x+(bx+bw/2)/1880-.5)*1880/bw
    crop_data.shift_y=(original_data.shift_y+(.5-(by+bh/2)/1000)*1000/1880)*1880/bw
    crop_camera=link(bpy.data.objects.new('Coffer | calibrated crop camera',crop_data)); crop_camera.matrix_world=original_camera.matrix_world.copy(); scene.camera=crop_camera
    r.resolution_x=round(bw*k); r.resolution_y=round(bh*k); r.resolution_percentage=100
    r.use_border=False; r.use_crop_to_border=False
    print('COFFER_CROP',ROOM,crop,r.resolution_x,r.resolution_y,flush=True)
    r.film_transparent=True; r.image_settings.color_mode='RGBA'; scene.use_nodes=False
    scene.render.use_persistent_data=True; scene.cycles.samples=SAMPLES
    scene.cycles.adaptive_threshold=.008; scene.cycles.sample_clamp_direct=0
    mine={o.name for o in body+lid_parts}
    for o in bpy.data.objects:
        if o.type in ('MESH','CURVE','FONT'):
            o.is_holdout=False
            if o.name in mine: o.hide_render=False; o.visible_camera=True
            else: o.visible_camera=False
        if o.type=='LIGHT' and o.data.type=='AREA':
            o.visible_camera=False
            if o.name.split('.')[0] in ('fill','fill at the eye'): o.data.energy*=FILL
            # The room's existing broad bounce sources must reach a metal's
            # reflection. Hiding them makes gold black, then a kicker clips it.
            o.visible_glossy=True
    bpy.context.view_layer.update()
    corners=[o.matrix_world@Vector(p) for o in body for p in o.bound_box]
    lo=Vector([min(p[i] for p in corners) for i in range(3)]); hi=Vector([max(p[i] for p in corners) for i in range(3)])
    centre=(lo+hi)/2; z=lo.z-.0002
    # Sample the real tabletop under the feet for the shadow receiver's material.
    hit,loc,norm,index,obj,matrix=scene.ray_cast(bpy.context.evaluated_depsgraph_get(),Vector((centre.x,centre.y,z-.0004)),Vector((0,0,-1)),distance=.15)
    if hit and abs(loc.z-lo.z)<.035:
        # Older builders leave the coffer a centimetre above the desk.
        # Rest the new feet on the real surface instead of drawing a fake shadow.
        shift=loc.z-lo.z+.00012
        for o in body: o.location.z+=shift
        hinge.location.z+=shift
        lo.z+=shift; hi.z+=shift; centre.z+=shift; z=loc.z+.00006
        bpy.context.view_layer.update()
    slot=obj.data.polygons[index].material_index if hit and 0<=index<len(obj.data.polygons) else 0
    receiver_material=obj.data.materials[slot] if hit and len(obj.data.materials)>slot else plain('shadow receiver',(.15,.10,.055),rough=.7)
    receiver=rc.card('Coffer | contact shadow',[(lo.x-.028,lo.y-.028,z),(hi.x+.028,lo.y-.028,z),(hi.x+.028,hi.y+.028,z),(lo.x-.028,hi.y+.028,z)],receiver_material)
    receiver.is_shadow_catcher=True
    for pose in range(13):
        hinge.rotation_euler.x=-1.9*pose/12
        render(scene,os.path.join(OUT,f'pose-{pose:02d}.png'))
    # The matching key is photographed in the same room, without a new light.
    receiver.visible_camera=False
    for o in body+lid_parts: o.visible_camera=False
    key=key_model(); key.location=(centre.x,centre.y,hi.z+.055)
    oldcam=scene.camera; eye=oldcam.matrix_world.translation.copy()
    toward=(eye-key.location); key.rotation_euler.z=math.atan2(toward.x,-toward.y)
    cd=oldcam.data.copy(); cd.type='ORTHO'; cd.sensor_fit='VERTICAL'; cd.shift_x=0; cd.shift_y=0; cd.ortho_scale=.122
    cam=link(bpy.data.objects.new('Coffer | key portrait camera',cd)); target=key.location+Vector((0,0,.051))
    cam.location=target+(eye-centre).normalized()*.65; cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler(); scene.camera=cam
    orientation=cam.rotation_euler.to_matrix()@Matrix.Rotation(-math.pi/2,3,'X')
    key.rotation_euler=orientation.to_euler(); key.location=target-orientation@Vector((0,0,.051))
    r.use_border=False; r.use_crop_to_border=False; r.resolution_x=432; r.resolution_y=990
    render(scene,os.path.join(OUT,'key.png'))
    with open(os.path.join(OUT,'coffer.json'),'w',encoding='utf-8') as f:
        json.dump({'room':ROOM,'crop':crop,'poses':13},f,indent=2)
    print('NATIVE_COFFER_DONE',ROOM)

if __name__ == '__main__':
    rc.chest_sprites=native_chest
    ARGS[:]=['--only','chest','--width',str(WIDTH),'--samples',str(SAMPLES)]
    sys.argv=[sys.argv[0],'--',*ARGS]
    runpy.run_path(os.path.join(os.path.dirname(__file__),BUILDERS[ROOM]),run_name='__main__')
