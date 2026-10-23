"""Render interactive parts from the finished, packed Fibonacci .blend."""
import bpy
import json
from pathlib import Path
import sys
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from kit import arg,cycles

OUT=Path(arg('--out',str(HERE.parents[1]/'.artifacts/fibonacci-garden'))).resolve()
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=arg('--scene',str(HERE/'fibonacci.blend')))
scene=bpy.context.scene
data=json.loads(scene['game_landmarks'])
width=int(arg('--width','2560'));height=round(width/1.6);factor=width/data['size'][0]
data['size']=[width,height]
for key in ['bench','flame','bucketAnchor']:data[key]=[v*factor for v in data[key]]
for leaf in data['leafNodes']:leaf['anchor']=[v*factor for v in leaf['anchor']]
if data.get('window'):
    data['window']['size']=[width,height]
    data['window']['borders']=[round(v*factor) for v in data['window']['borders']]
data['cm']*=factor
body=next(o for o in scene.objects if o.name.startswith('Bucket | galvanized wall'))
lip=world_to_camera_view(scene,scene.camera,body.location+Vector((-.132,0,.265)))
data['bucketLipOffset']=[(lip.x*width-data['bucketAnchor'][0])/data['cm'],((1-lip.y)*height-data['bucketAnchor'][1])/data['cm']]
scene['game_landmarks']=json.dumps(data)
(OUT/'scene.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
if '--metadata-only' in sys.argv:
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)
    print('FIBONACCI_LANDMARKS_UPDATED',flush=True)
    raise SystemExit(0)
samples=int(arg('--samples','384'))
cycles(scene,samples,width,height,exposure=scene.view_settings.exposure,glare=False)
bucket_only='--buckets-only' in sys.argv
if '--cpu' in sys.argv:scene.cycles.device='CPU'
scene.cycles.transparent_max_bounces=16
scene.render.use_persistent_data=True
scene.render.image_settings.color_mode='RGBA'
scene.render.image_settings.color_depth='8'
bpy.context.preferences.filepaths.save_version=0
if not bucket_only:bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)
stems=sorted((o for o in scene.objects if o.name.startswith('Plant | branch')),key=lambda o:o.name)
leaves=sorted((o for o in scene.objects if o.name.startswith('Plant | leaf')),key=lambda o:o.name)
bucket=[o for o in scene.objects if o.name.startswith('Bucket |')]
assert len(stems)==5 and len(leaves)==12 and len(bucket)>5
water=next(o for o in bucket if 'real water' in o.name)
window=[o for o in scene.objects if o.name.startswith('Foreground window | ')]

def render(name,transparent=False):
    scene.render.film_transparent=transparent
    scene.render.filepath=str(OUT/(name+'.png'))
    print('FIBONACCI_LAYER',name,flush=True)
    bpy.ops.render.render(write_still=True)

if not bucket_only:
    render('hero')
    for obj in window:obj.hide_render=True
    for obj in stems+leaves+bucket:obj.hide_render=True
    render('background')
    if data.get('contactShadow') or data.get('conservatory'):
        for obj in bucket:obj.hide_render=False;obj.visible_camera=False
        render('bucket-shadow-plate')
        for obj in bucket:obj.hide_render=True;obj.visible_camera=True
for obj in window:obj.hide_render=True
# The scenery stays visible to reflected and bounced rays. Removing it from
# the scene makes zinc look black and changes the plant's natural fill light.
for obj in scene.objects:
    if obj.type not in {'LIGHT','CAMERA','EMPTY'}:
        obj.hide_render=False
        obj.visible_camera=False
for obj in stems+leaves+bucket:
    obj.hide_render=True
    obj.visible_camera=True
scene.camera.data.dof.use_dof=False
scene.cycles.samples=min(samples,256)
if not bucket_only:
    for obj in stems:obj.hide_render=False
    render('stems',True)
    for obj in stems:obj.hide_render=True
    for i,obj in enumerate(leaves):
        obj.hide_render=False
        render(f'leaf-{i:02}',True)
        obj.hide_render=True
else:
    # Render only the region containing the pail, preserving full-frame
    # coordinates and transparent padding for the normal publishing step.
    scene.render.use_border=True
    scene.render.use_crop_to_border=False
    projected=[world_to_camera_view(scene,scene.camera,o.matrix_world@Vector(v)) for o in bucket for v in o.bound_box]
    scene.render.border_min_x=max(0,min(p.x for p in projected)-8/width)
    scene.render.border_max_x=min(1,max(p.x for p in projected)+8/width)
    scene.render.border_min_y=max(0,min(p.y for p in projected)-8/height)
    scene.render.border_max_y=min(1,max(p.y for p in projected)+8/height)
for obj in bucket:obj.hide_render=False
for i in range(6):
    water.location.z=max(.013,.232*(1-i/5))-.232
    render('bucket-'+str(i),True)
if not bucket_only:
    scene.render.use_border=False
    if window:
        from fibonacci_window import render_window
        render_window(scene,OUT,width,min(samples,192))
    from fibonacci_occlusion import render_stem_occlusion
    render_stem_occlusion(scene,OUT)
print('FIBONACCI_LAYERS_DONE',flush=True)
