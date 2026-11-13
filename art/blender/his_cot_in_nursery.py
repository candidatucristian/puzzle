"""His Cot, in Room II's nursery (2026-11-05).

The cot's puzzle came to Room II for the demo, and Room II became the baby's
nursery (room_nursery.py). Its close-up is taken in that room: the nursery is
built, nothing rendered, and the puzzle's own camera is set up exactly where
his_cot.py has it relative to the cot. So the cot, its sheet and every
belonging fall on the same pixels as before (nativeCot.json stays true), and
what is seen behind them is the nursery: the sash window, its linen curtains,
the night outside. The felt mobile the room hangs over the cot is left out of
this picture: in the close-up the puzzle's own sewn mobile is live
(cot/mobile3d.js), hung from the same curved arm.

  blender -b --factory-startup -P art/blender/his_cot_in_nursery.py -- [--width 2560] [--samples 384] [--preview]
  node art/blender/his_cot_publish.mjs --source .artifacts/his-cot-nursery --version 5
"""
import bpy, os, sys, math, json, runpy
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
import room_common as rc

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = arg('--out', os.path.join(rc.ROOT, '.artifacts/his-cot-nursery'))
os.makedirs(OUT, exist_ok=True)
WIDTH = int(arg('--width', '2560')); HEIGHT = round(WIDTH / 1.6)
SAMPLES = int(arg('--samples', '384'))
PREVIEW = '--preview' in sys.argv

# ── the nursery, nothing rendered ─────────────────────────────────────────
mine = list(ARGS)
ARGS[:] = ['--only', 'none', '--out', os.path.join(OUT, 'room'), '--width', '1600', '--samples', str(SAMPLES)]
try:
    nursery = runpy.run_path(os.path.join(HERE, 'room_nursery.py'), run_name='__main__')
finally:
    ARGS[:] = mine
scene = nursery['scene']
cot = bpy.data.objects['His Cot (from Room VI)']
parts = [o for o in cot.children_recursive]
for o in scene.objects:
    if o.name.startswith('Nursery mobile |'): o.hide_render = True
# (nor the gilt chest on the drawers behind: the game lays it over the room,
#  shut or open, and a picture of it here could disagree)
for o in nursery['CHEST_PARTS']: o.hide_render = True
bpy.context.view_layer.update()

# ── the puzzle's camera, where his_cot.py stands it to the cot ────────────
FOV = 38; PITCH = math.radians(27.66); BED = .62
CAM_Y = -1.2225; CAM_Z = BED + .7565
cd = bpy.data.cameras.new('His Cot | 38 degree close lens, in the nursery')
cd.lens = (1000 / 2 / math.tan(math.radians(FOV / 2))) / 1600 * 36; cd.sensor_width = 36; cd.sensor_fit = 'HORIZONTAL'
cd.clip_start = .05; cd.clip_end = 40
cam = bpy.data.objects.new('His Cot | camera', cd); scene.collection.objects.link(cam)
cam.location = cot.matrix_world @ Vector((0, CAM_Y, CAM_Z)); cam.rotation_euler = (math.pi / 2 - PITCH, 0, 0)
scene.camera = cam
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = WIDTH, HEIGHT, 100
rc.SCENE = scene
bpy.context.view_layer.update()

# (a photographer's room to stand in: whatever stands between the eye and
#  the cot, out of this picture only)
eye = cam.matrix_world.translation
for o in list(scene.objects):
    if o.type != 'MESH' or o in parts or o.hide_render: continue
    c = sum((o.matrix_world @ Vector(k) for k in o.bound_box), Vector()) / 8
    if (c - eye).length < .7 and c.y < cot.matrix_world.translation.y - .45:
        o.hide_render = True; print('OUT OF THE WAY', o.name, flush=True)

# ── the light on the sheet: the night light's, warm, from the chest of
#    drawers on the right, given back broad off the ceiling; the moon from the
#    window behind the cot ─────────────────────────────────────────────────
def near(name, at, aim, energy, colour, size, size_y=None):
    o = lamp(name, 'AREA', tuple(cot.matrix_world @ Vector(at)), aim=tuple(cot.matrix_world @ Vector(aim)), energy=energy, colour=colour, size=size, size_y=size_y)
    o.visible_camera = False; o.visible_glossy = False
    return o
near("His Cot | the night light's light on the sheet", (.85, -1.05, 1.62), (0, 0, .6), float(arg('--warm', '18')), (1.0, .74, .46), .55)
near('His Cot | moonlight from the window behind', (.1, 1.3, 1.52), (0, 0, .64), float(arg('--moon', '6')), (.52, .67, 1.0), 1.0, .7)
near('His Cot | dim bounce behind the eye', (-.05, -1.1, 1.85), (0, .1, .68), 2.5, (.86, .84, .8), 1.3)
scene.view_settings.exposure = float(arg('--exposure', '-0.2'))
scene.cycles.samples = min(SAMPLES, 96) if PREVIEW else SAMPLES
scene.render.film_transparent = False
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'; scene.render.image_settings.color_depth = '8'

# ── what the game is told: the same layout as before (the camera and the cot
#    stand to each other as they did), checked against the old projections ─
from bpy_extras.object_utils import world_to_camera_view
def project(p):
    v = world_to_camera_view(scene, cam, cot.matrix_world @ Vector(p)); return [round(v.x * WIDTH, 4), round((1 - v.y) * HEIGHT, 4)]
old = json.load(open(os.path.join(rc.ROOT, 'src/levels/cot/nativeCot.json'), encoding='utf-8'))
DEPTH = old['sheetDepth']
check = {'back': project((0, DEPTH / 2, BED)), 'front': project((0, -DEPTH / 2, BED))}
print('SHEET', check, 'WAS', old['sheet'], flush=True)
layout = dict(old); layout['setting'] = "Room II, the nursery, before its window"
with open(os.path.join(OUT, 'nativeCot.json'), 'w', encoding='utf-8') as f: json.dump(layout, f, indent=1)

scene.render.filepath = os.path.join(OUT, 'preview.png' if PREVIEW else 'room.png')
bpy.ops.render.render(write_still=True)
if not PREVIEW:
    # the lowered front rail alone, so the live clues pass behind it
    front = [o for o in parts if o.name.startswith('Front |')]
    scene.render.film_transparent = True
    for o in scene.objects:
        if o.type not in ('CAMERA', 'LIGHT') and o not in front: o.visible_camera = False
    scene.render.filepath = os.path.join(OUT, 'front.png')
    bpy.ops.render.render(write_still=True)
print('HIS_COT_IN_NURSERY_DONE', flush=True)
