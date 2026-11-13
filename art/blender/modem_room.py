"""Room Beneath the Desk's router, in Room II's nursery (since 2026-11-05).

The router is silas_desk.py's: modem_room.py's graphite router (until
2026-11-05 a stand-alone set with a teal wall). Since 2026-11-06 it stands
apart from Silas's desk, on the toy chest by the nursery's right wall
(room_nursery.py puts it there; it stood on the desk until then). The nursery
is built (room_nursery.py, nothing rendered) and the eye set low before the
toy chest, a little to the router's left: the walnut panelling of the right
wall at its right, the picture books behind it, the rocking chair and the
painted chest of drawers beyond, the night light's warmth given back from
the room.
Its five counter lenses and seven data lenses are each lit alone in turn (a crop round each, its light on the
desk with it); modem_room_publish.mjs keeps only what each adds.

  blender -b --factory-startup -P art/blender/modem_room.py -- [--width 2880] [--samples 256] [--preview]
  node art/blender/modem_room_publish.mjs .artifacts/modem-native 6
"""
import bpy, math, os, sys, json, runpy
from pathlib import Path
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from kit import *
import room_common as rc
from room_common import P

ROOT = HERE.parents[1]
OUT = Path(arg('--out', str(ROOT / '.artifacts/modem-native'))).resolve(); OUT.mkdir(parents=True, exist_ok=True)
W = int(arg('--width', '2880')); H = round(W * 1000 / 1880)
SAMPLES = int(arg('--samples', '256'))
PREVIEW = '--preview' in sys.argv
EXPOSURE = float(arg('--exposure', '1.2'))

# ── the nursery, Silas's desk in its corner, nothing rendered ──────────────
mine = list(ARGS)
ARGS[:] = ['--only', 'none', '--out', str(OUT / 'room'), '--width', '1600', '--samples', str(SAMPLES),
           '--desk-lamp', arg('--lamp', '4'), '--desk-clocks', arg('--clocks', '4')]
try:
    nursery = runpy.run_path(str(HERE / 'room_nursery.py'), run_name='__main__')
finally:
    ARGS[:] = mine
scene = nursery['scene']; S = nursery['DESK_SET']
for o in nursery['CHEST_PARTS']: o.hide_render = True
ROUTER = S['ROUTER']; LEDS = S['LEDS']
bpy.context.view_layer.update()

# ── the eye: before the toy chest, a little to the router's left and above
#    it (in the router's own frame, cm: a along its face to its right, up
#    from the lid, out before its face; the nursery's cm are P's) ─────────
RX, RY, RD = nursery['ROUTER_AT']; TURN = ROUTER.rotation_euler.z
def R_(a, up, out):
    c, s = math.cos(TURN), math.sin(TURN)
    return P(RX + a * c + out * s, RY + up, RD + a * s - out * c)
EYE = R_(float(arg('--ex', '-14')), float(arg('--ey', '30')), float(arg('--eo', '140')))
LOOK = R_(float(arg('--lx', '-4')), float(arg('--ly', '14')), 0)
cd = bpy.data.cameras.new('Router | the eye before the desk'); cd.lens = float(arg('--lens', '50')); cd.sensor_width = 36; cd.sensor_fit = 'HORIZONTAL'; cd.clip_start = .05; cd.clip_end = 30
cam = link(bpy.data.objects.new('Router | camera', cd)); cam.location = EYE
cam.rotation_euler = (LOOK - EYE).to_track_quat('-Z', 'Y').to_euler(); scene.camera = cam
rc.SCENE = scene
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = W, H, 100
scene.render.image_settings.color_depth = '16'
scene.view_settings.exposure = EXPOSURE
scene.cycles.samples = SAMPLES; scene.cycles.seed = 1121961
bpy.context.view_layer.update()
cd.dof.use_dof = True; cd.dof.focus_distance = (S['led_centre'](5) - cam.location).length; cd.dof.aperture_fstop = 7.1; cd.dof.aperture_blades = 8
# (the lenses were made for the old set's darker exposure, at their full
#  size: kept as soft as the user asked for them, 2026-11-04)
# (the night light stands two metres behind the router and lights its face
#  little: what it and the green lamp give back off the ceiling and the walls,
#  broad and warm, from up before it at the room's side, unseen and in no
#  reflection)
warm = lamp("Router | the room's light given back, before the toy chest", "AREA", tuple(R_(-60, 120, 120)), aim=tuple(R_(0, 4, 0)),
            energy=float(arg('--warm', '11')), colour=(1.0, .8, .6), size=1.4, size_y=1.0)
warm.visible_camera = False; warm.visible_glossy = False
K = 2 ** (.15 - EXPOSURE)
LED_STRENGTH, LED_LIGHT = 1.1 * K, .0016 * K
for pair in S['FACES'].values():
    for m in pair: m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value *= 2 ** (.35 - EXPOSURE)
for g in S['CLOCK_GLOWS']: g.data.energy *= 2 ** (.35 - EXPOSURE)

def project(co):
    p = world_to_camera_view(scene, cam, Vector(co)); return [round(p.x * W, 4), round((1 - p.y) * H, 4)]
# (the motes drift in the night light's light, which comes from behind the
#  router: they keep to the air over its left end, before the books)
lamp_at = R_(-18, 26, -10)
metadata = {'version': 1, 'width': W, 'height': H, 'leds': [{'centre': project(S['led_centre'](i)), 'colour': e['colour']} for i, e in enumerate(LEDS)],
            'lamp': {'centre': project(lamp_at), 'radius': H * .12}}
corners_ = [project(o.matrix_world @ Vector(c)) for o in ROUTER.children_recursive if o.type == 'MESH' for c in o.bound_box]
pad = W * .012
x0_, y0_ = min(p[0] for p in corners_) - pad, min(p[1] for p in corners_) - pad
metadata['safe'] = [x0_, y0_, max(p[0] for p in corners_) + pad - x0_, max(p[1] for p in corners_) + pad - y0_]

def render_as(name):
    scene.render.filepath = str(OUT / (name + '.png')); bpy.ops.render.render(write_still=True); print('MODEM_RENDERED', name, flush=True)
render_as('room')
if PREVIEW:
    # a lit preview: the lenses' size and their light on the desk, to look at
    for i in (0, 5, 8, 11): S['led_on'](i, True, LED_STRENGTH, LED_LIGHT)
    render_as('lit-preview')
else:
    # each lens's light alone, in a crop round it (with what it throws on the
    # desk below); every state the same seed, camera and samples as the plate
    scene.render.use_border = True; scene.render.use_crop_to_border = True
    for i, e in enumerate(LEDS):
        S['led_on'](i, True, LED_STRENGTH, LED_LIGHT)
        cx, cy = metadata['leds'][i]['centre']; hw = W * .013; above = H * .027; below = H * .12
        xa, xb = max(0, math.floor(cx - hw)), min(W, math.ceil(cx + hw)); ya, yb = max(0, math.floor(cy - above)), min(H, math.ceil(cy + below))
        scene.render.border_min_x = (xa + .25) / W; scene.render.border_max_x = min(1, (xb + .25) / W)
        scene.render.border_min_y = (H - yb + .25) / H; scene.render.border_max_y = min(1, (H - ya + .25) / H)
        metadata['leds'][i]['crop'] = {'x': xa, 'y': ya, 'width': xb - xa, 'height': yb - ya}
        render_as('led-%02d' % i)
        S['led_on'](i, False)
    scene.render.use_border = False; scene.render.use_crop_to_border = False
(OUT / 'nativeModem.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
print('MODEM_DONE', flush=True)
