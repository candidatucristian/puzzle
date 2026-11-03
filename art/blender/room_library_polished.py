"""Room II, polished: room_library_restored.py's room exactly as it is (its
camera, its furniture, every puzzle where it was, its matte worn surfaces),
taken further. The green lamp lit properly; the books bound and gilt, each
its own; the leather and the brass given their grain and their wear. Nothing
moved, nothing taken out; the camera untouched, so every coordinate the game
keeps (house/rooms/Room2.json) still falls where it did.

  blender -b --factory-startup -P art/blender/room_library_polished.py -- [--only preview|plate,coffer|inspect] [--width 3200] [--samples 512]
"""
import bpy, os, sys, math, json, runpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
import room_common as rc
from library_coffer_pass import render_coffer

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = arg('--out', os.path.join(rc.ROOT, '.artifacts/room-library-polished'))
WIDTH = int(arg('--width', '3200')); SAMPLES = int(arg('--samples', '512'))
ONLY = set(arg('--only', 'plate,coffer').split(','))
os.makedirs(OUT, exist_ok=True)

# the restored room, built and laid out, nothing rendered
mine = list(ARGS)
ARGS[:] = ['--only', 'layout', '--out', OUT, '--width', str(WIDTH), '--samples', str(SAMPLES)]
try:
    restored = runpy.run_path(os.path.join(HERE, 'room_library_restored.py'), run_name='__main__')
finally:
    ARGS[:] = mine
scene = restored['scene']; original = restored['original']

if 'inspect' in ONLY:
    from collections import Counter
    users = Counter()
    for obj in scene.objects:
        if obj.type in ('MESH', 'CURVE') and not obj.hide_render:
            for slot in obj.material_slots:
                if slot.material: users[slot.material.name] += 1
    print('MATERIALS', len(users))
    for name, n in users.most_common(80): print(f'  {n:5d}  {name}')
    for obj in scene.objects:
        if obj.type == 'LIGHT': print('LIGHT', obj.name, obj.data.type, round(obj.data.energy, 2), tuple(round(c, 2) for c in obj.data.color), tuple(round(v, 2) for v in obj.location))
    names = Counter(obj.name.split('.')[0] for obj in scene.objects)
    print('OBJECTS', len(scene.objects)); print('  ', names.most_common(40))
    print('EXPOSURE', scene.view_settings.exposure, scene.view_settings.view_transform, scene.view_settings.look)
    print('CAMERA', scene.camera.name, scene.camera.location, scene.render.resolution_x, scene.render.resolution_y)
    sys.exit(0)

# ── the light ─────────────────────────────────────────────────────────────
# The green lamp lit as a lamp is, its bulb a little thing under the shade,
# its glass glowing; what it throws on the table and the ceiling given back
# to the room, broad and warm, so the shelves and the panelling are seen
# (one light, and its own bounce: never a hot spot); the moon at the windows
# as it was.
lamp_light = bpy.data.objects['green lamp']
lamp_light.data.energy = float(arg('--lamp', '70')); lamp_light.data.shadow_soft_size = .045
lamp_light.data.color = (1.0, .78, .5)
shade = bpy.data.materials.get('green glass shade')
if shade:
    b = next(n for n in shade.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Emission Strength'].default_value = float(arg('--shade', '.9'))
# (its own stem and arm left out of its bulb's light: ten centimetres off,
#  they would burn white as if they were the lamp)
own = bpy.data.collections.new('not lit by its own bulb')
for name in ("banker's lamp", 'shade arm'):
    part = bpy.data.objects.get(name)
    if part: own.objects.link(part)
lamp_light.light_linking.receiver_collection = own
for entry in own.collection_objects: entry.light_linking.link_state = 'EXCLUDE'
BOUNCE = float(arg('--bounce', '60'))
bounce = lamp('lamp light off the ceiling', 'AREA', (0.15, 4.6, 2.95), aim=(0.15, 4.6, 0), energy=BOUNCE, colour=(1.0, .8, .58), size=2.4, size_y=5.2)
bounce.visible_camera = False; bounce.visible_glossy = False
scene.view_settings.exposure = float(arg('--exposure', '1.7'))

# ── the books: their spines' edges rounded a little, so each catches the light
for obj in scene.objects:
    if obj.type == 'MESH' and obj.name.split('.')[0] == 'book' and not obj.modifiers:
        bv = obj.modifiers.new('worn edges', 'BEVEL'); bv.width = .0016; bv.segments = 2; bv.limit_method = 'ANGLE'

layout = original['LAYOUT'].data
body, hinge, lid = original['chest_body'], original['chest_hinge'], original['lid_parts']
if 'preview' in ONLY:
    render(scene, os.path.join(OUT, arg('--name', 'preview') + '.png'))
# the room without its chest (the game lays the chest over it), and the
# chest's thirteen poses in the same light
if 'plate' in ONLY:
    for obj in body + lid: obj.hide_render = True
    render(scene, os.path.join(OUT, 'lights-1.png'))
    for obj in body + lid: obj.hide_render = False
if 'coffer' in ONLY:
    original['air'].hide_render = True
    render_coffer(scene, OUT, layout['chest']['box'], body, hinge, lid, WIDTH, SAMPLES)
print('ROOM_LIBRARY_POLISHED_DONE', flush=True)
