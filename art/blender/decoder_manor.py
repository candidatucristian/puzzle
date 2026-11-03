"""Manor edition: Cycles cutouts, candle light, and a native envelope flight model.

Asset production only. No browser automation or app checks.
"""
import bpy, math, os, sys, runpy, json
from mathutils import Vector
HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.abspath(os.path.join(HERE,'../..'))
OUT=os.path.join(ROOT,'.artifacts/decoder-manor-v3')
os.makedirs(OUT,exist_ok=True)
# Reuse the authored folio, without rendering the earlier studio composition.
sys.argv=[sys.argv[0],'--','--only','none','--out',OUT,'--samples','256']
sys.path.insert(0,HERE)
model=runpy.run_path(os.path.join(HERE,'decoder_reward.py'))
from kit import *
from desk_kit import sheet
scene=model['scene']; camera=model['camera']; cover=model['cover']
camera_data=camera.data
for obj in list(scene.objects):
    if obj.type=='LIGHT': bpy.data.objects.remove(obj,do_unlink=True)
model['desk'].hide_render=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.009,.011,.018,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.04
# Warm light rakes across the tooling; a weak, large cool reflection keeps the
# opposite edge readable. No illuminated desktop or photographic backdrop.
lamp('shielded candle light','AREA',(-.28,-.09,.38),aim=(.01,0,0),energy=7.0,colour=(1,.68,.36),size=.13,size_y=.20)
lamp('dim window reflection','AREA',(.30,.14,.58),aim=(0,0,0),energy=2.0,colour=(.62,.72,.91),size=.48)
scene.view_settings.exposure=-.7
scene.render.film_transparent=True; scene.render.image_settings.color_mode='RGBA'
scene.cycles.samples=256; scene.cycles.adaptive_threshold=.008
# Darker, warm black leather with its scanned grain and actual tool marks.
leather=model['LEATHER']
for node in leather.node_tree.nodes:
    if node.type=='HUE_SAT': node.inputs['Value'].default_value=.37
model['LINEN'].diffuse_color=(.06,.045,.03,1)
camera.location=(-.167,-.34,.95)
camera.rotation_euler=(Vector((-.167,0,.005))-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.ortho_scale=.98; cover.rotation_euler.y=-math.radians(166)
scene.render.resolution_x=2400;scene.render.resolution_y=1500
render(scene,os.path.join(OUT,'folio-open.png'))

cover.rotation_euler.y=0
camera.location=(.025,-.30,.95)
camera.rotation_euler=(Vector((.025,0,.01))-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.ortho_scale=.49
scene.render.resolution_x=1800;scene.render.resolution_y=1320
render(scene,os.path.join(OUT,'folio-closed.png'))

# The UI diploma is the real paper in the same directional light. A neutral
# print stock from the earlier physical render is retained by the publisher.
paper_parts=model['paper_parts']
saved={obj:obj.hide_render for obj in scene.objects if obj.type in ('MESH','CURVE','FONT')}
for obj in saved: obj.hide_render=obj not in paper_parts
camera.location=(model['PX'],0,1);camera.rotation_euler=(0,0,0);camera_data.ortho_scale=model['PW']
scene.render.resolution_x=3200;scene.render.resolution_y=2263
render(scene,os.path.join(OUT,'diploma-stock.png'))
for obj in saved:obj.hide_render=True
# A separate portrait leaf, sized for the educational notes, with real fibre,
# slight curling and contact between its backing leaves.
paper=model['PAPER'];portrait=[]
for i in range(3):
    portrait.append(sheet('field notes backing',.254558-i*.0005,.36-i*.0005,paper,at=(0,0,.002+i*.0005),nx=24,ny=32,thick=.0003))
portrait.append(sheet('field notes cotton leaf',.254558,.36,paper,at=(0,0,.004),nx=48,ny=64,lift=model['lift'],thick=.00035))
camera.location=(0,0,1);camera_data.ortho_scale=.258
scene.render.resolution_x=1600;scene.render.resolution_y=2263
render(scene,os.path.join(OUT,'notes-stock.png'))
for obj in portrait:obj.hide_render=True
for obj,hidden in saved.items():obj.hide_render=hidden
cover.rotation_euler.y=-math.radians(166)
camera.location=(-.167,-.34,.95);camera.rotation_euler=(Vector((-.167,0,.005))-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.ortho_scale=.98
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'decoder-manor.blend'))

# Isolate the real, Cycles-baked envelope already authored for the hall letters.
# Its mesh stays three-dimensional in the flight, with continuous rotations.
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.render.fps=30
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/assets/images/CaseFile/letter/letter-animation-v2.glb'))
scene.frame_set(17);bpy.context.view_layer.update()
envelope=bpy.data.objects['envelope'];parts=[envelope,*envelope.children_recursive]
for obj in parts:obj.animation_data_clear()
matrix=envelope.matrix_world.copy();envelope.parent=None;envelope.matrix_world=matrix
for obj in scene.objects:obj.select_set(False)
for obj in parts:obj.select_set(True)
bpy.context.view_layer.objects.active=envelope
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'reward-envelope.glb'),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False)
for obj in list(scene.objects):
    if obj not in parts:bpy.data.objects.remove(obj,do_unlink=True)
world=bpy.data.worlds.new('unlit manor');world.use_nodes=True;scene.world=world
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.04
lamp('envelope candle light','AREA',(-2,-1.5,3.0),aim=(0,0,0),energy=75,colour=(1,.72,.44),size=1.2)
lamp('envelope edge reflection','AREA',(2,1,3.4),aim=(0,0,0),energy=25,colour=(.63,.73,.90),size=2)
cam_data=bpy.data.cameras.new('envelope eye');cam_data.type='ORTHO';cam_data.ortho_scale=2.9
cam=link(bpy.data.objects.new('envelope eye',cam_data));cam.location=(0,-1.1,4)
cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
cycles(scene,256,1000,650,exposure=-.4,glare=False,transparent=True)
render(scene,os.path.join(OUT,'reward-envelope.png'))
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'reward-envelope.blend'))
print('DECODER_MANOR_ASSETS_DONE',flush=True)
