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

# ── what the user asked away (2026-11-03) ─────────────────────────────────
def gone(obj):
    for o in [obj, *obj.children_recursive]: bpy.data.objects.remove(o, do_unlink=True)
# the brass pot the palm's own pot stood in: a smaller pot showing in the big one
pot = bpy.data.objects.get('brass pot')
if pot: gone(pot)
# the chair at the reading table's left, by the armchair (the armchair stays,
# and so do the table's far chair and the clerk's at his desk)
for root in [o for o in scene.objects if o.parent is None and o.name.split('.')[0] == 'dining_chair_02']:
    where = rc.P(-92, 0, 500)
    if abs(root.location.x - where.x) < .25 and abs(root.location.y - where.y) < .25:
        print('CHAIR REMOVED at', tuple(round(v, 2) for v in root.location)); gone(root)
# the botanical print by the LED clock, smaller about its own middle, clear of
# the clock: frame and print alike
print_card = bpy.data.objects.get('print')
def world_centre(o):
    return sum((o.matrix_world @ Vector(c) for c in o.bound_box), Vector()) / 8
if print_card:
    centre = world_centre(print_card)
    framing = [print_card] + [o for o in scene.objects if o.type == 'MESH' and o.name.split('.')[0] == 'frame' and (world_centre(o) - centre).length < .7]
    k = float(arg('--print', '.74'))
    # (each one's own points moved in toward the print's middle, across the
    #  wall and up it, not into it: nothing reparented, nothing else moved)
    for o in framing:
        mw, inv = o.matrix_world.copy(), o.matrix_world.inverted()
        for v in o.data.vertices:
            w = mw @ v.co
            v.co = inv @ Vector((centre.x + (w.x - centre.x) * k, w.y, centre.z + (w.z - centre.z) * k))
        o.data.update()
    bpy.context.view_layer.update()
    print('PRINT SCALED', k, [o.name for o in framing])
# the rain on the glass: not over the curtains standing in front of it, nor
# over the palm (layout written again below, with the curtains cut out too)
bpy.context.view_layer.update()
curtains = [o for o in scene.objects if o.type == 'MESH' and o.name.split('.')[0] == 'curtain']
plant = bpy.data.objects.get('potted_plant_02')
cuts = [rc.outline(rc.object_corners(o)) for o in curtains]
if plant and plant.get('meshes'):
    cuts.append(rc.outline([pt for o in meshes_of(plant) for pt in rc.object_corners(o)]))
layout['rainCutouts'] = cuts
print('RAIN CUTOUTS', len(cuts))
with open(os.path.join(OUT, 'room.json'), 'w', encoding='utf-8') as f: json.dump(layout, f, indent=2)

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
