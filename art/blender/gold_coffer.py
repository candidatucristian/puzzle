# A photographic inspection of the new coffer and a neutral native key image.
import bpy, os, sys, math, json
from mathutils import Vector
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import ROOT, scan
from gold_coffer_model import coffer, key_model

OUT=os.path.join(ROOT,'.artifacts/gold-coffer-v2'); os.makedirs(OUT,exist_ok=True)
scene=fresh(); WIDTH=int(arg('--width','2000')); SAMPLES=int(arg('--samples','384'))
PREVIEW=arg('--preview','')
body,hinge,lid=coffer(dict(x0=-15,x1=15,d0=-10,d1=10,y0=0,y1=13,lid=7.2))
key=key_model(); key.location=(0,-.16,.003); key.rotation_euler=(math.pi/2,0,.12)
wood=scan('walnut display surface','dark_wood',size=.55,tint=(.52,.39,.28),bright=.6,rough=(.55,.77),bump=.24,coat=0)
table=box('walnut surface',-3,3,-3,3,-.025,-.001,wood)
world=bpy.data.worlds.new('soft photographic room'); scene.world=world; world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.11,.13,.17,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.22
lamp('broad window','AREA',(-.4,-.45,.65),aim=(0,0,.08),energy=24,colour=(1,.9,.76),size=.65,size_y=.8)
lamp('soft blue bounce','AREA',(.50,.15,.40),aim=(0,0,.12),energy=12,colour=(.72,.82,1),size=.55)
lamp('long window reflection','AREA',(-.3,.38,.5),aim=(0,0,.10),energy=16,colour=(1,.94,.83),size=.50,size_y=.10)
cd=bpy.data.cameras.new('coffer portrait'); cd.type='ORTHO'; cd.ortho_scale=.58
cam=link(bpy.data.objects.new('coffer portrait',cd)); cam.location=(.39,-.60,.36)
cam.rotation_euler=(Vector((0,0,.10))-cam.location).to_track_quat('-Z','Y').to_euler(); scene.camera=cam
cycles(scene,SAMPLES,WIDTH,round(WIDTH*.75),exposure=-.4,glare=False)
scene.render.use_persistent_data=True; scene.cycles.adaptive_threshold=.008
if PREVIEW: scene.cycles.adaptive_min_samples=16
else:
    bpy.ops.file.pack_all(); bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'gold-coffer.blend'))
for name,angle in (('closed',0),('open',-1.9)):
    hinge.rotation_euler.x=angle
    render(scene,os.path.join(OUT,('preview-' if PREVIEW else 'hero-')+name+'.png'))
if not PREVIEW:
    # A single registered camera for fallback room artwork, with real alpha.
    key.hide_render=True; table.hide_render=True; scene.render.film_transparent=True; scene.render.image_settings.color_mode='RGBA'
    cd.ortho_scale=.48; cam.location=(.34,-.64,.34)
    cam.rotation_euler=(Vector((0,0,.14))-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.resolution_x=960; scene.render.resolution_y=1120
    for name,angle in (('closed',0),('open',-1.9)):
        hinge.rotation_euler.x=angle; render(scene,os.path.join(OUT,'fallback-'+name+'.png'))
    for o in body+lid: o.hide_render=True
    key.hide_render=False; key.location=(0,0,0); key.rotation_euler=(0,0,0)
    cam.location=(.08,-.55,.12); cam.rotation_euler=(Vector((0,0,.052))-cam.location).to_track_quat('-Z','Y').to_euler()
    cd.sensor_fit='VERTICAL'; cd.ortho_scale=.122
    scene.render.resolution_x=432; scene.render.resolution_y=990
    render(scene,os.path.join(OUT,'key-neutral.png'))
print('GOLD_COFFER_DONE')
