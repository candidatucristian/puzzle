"""Bound diploma close-up and flight-sized textures for the manor edition."""
import bpy, os, sys, json
from mathutils import Vector
HERE=os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0,HERE)
from kit import render, cycles
ROOT=os.path.abspath(os.path.join(HERE,'../..'))
OUT=os.path.join(ROOT,'.artifacts/decoder-manor-v3')
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'decoder-manor.blend'))
scene=bpy.context.scene
for obj in bpy.data.objects['folio cover hinge'].children_recursive:obj.hide_render=True
camera=scene.camera
camera.location=(.025,0,1);camera.rotation_euler=(0,0,0);camera.data.ortho_scale=.43
cycles(scene,256,3500,2600,exposure=-.7,glare=False,transparent=True)
render(scene,os.path.join(OUT,'diploma-display.png'))
from bpy_extras.object_utils import world_to_camera_view
def project(x,y):
    p=world_to_camera_view(scene,camera,Vector((.025+x,y,.0061)))
    return [round(p.x*3500,5),round((1-p.y)*2600,5)]
data={'version':3,'diplomaFrame':{'width':3500,'height':2600,'paperQuad':[project(x,y) for x,y in ((-.18,.127279),(.18,.127279),(.18,-.127279),(-.18,-.127279))]}}
with open(os.path.join(OUT,'manorArt.json'),'w',encoding='utf-8') as file:json.dump(data,file,indent=2)

# The flight is 176 CSS pixels wide. These are the same authored/baked surfaces
# at a suitable resolution, so no 10 MB print-resolution textures are loaded.
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'reward-envelope.blend'))
for image in bpy.data.images:
    if image.type!='IMAGE' or image.size[0]<=0 or max(image.size)<=512:continue
    scale=512/max(image.size);image.scale(max(1,round(image.size[0]*scale)),max(1,round(image.size[1]*scale)))
    image.pack()
envelope=bpy.data.objects['envelope']
for obj in bpy.context.scene.objects:obj.select_set(False)
for obj in [envelope,*envelope.children_recursive]:obj.select_set(True)
bpy.context.view_layer.objects.active=envelope
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'reward-envelope.glb'),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False)
print('MANOR_DETAILS_EXPORTED',flush=True)
