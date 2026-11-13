# After Hours (levels/overtime): Silas's desk, close to, from his chair late
# at night — in Room II's nursery since 2026-11-05.
#
# The desk is silas_desk.py's set, the one the room shows in its far left
# corner: the walnut desk on its pedestals, its green leather, the green
# banker's lamp; on the wall over it (duck-egg plaster over the walnut dado)
# the red LED clock, a botanical print of hers behind glass, and on a little
# shelf the clock radio; on the desk a mug of coffee, a glass with a sprig of
# periwinkle, the alarm clock and the folding travel clock (the router went to
# the toy chest across the room on 2026-11-06), and on the leather, in the lamp's light, the desk
# calculator, its keys as the puzzle has them (Overtime.js KEYPAD), its
# display blank — the game writes on it — and a pad of paper, a pencil
# across it. The nursery is built (room_nursery.py, nothing rendered) and the
# eye set in the chair where it always was, in the desk's own frame, so this
# picture and the room's agree.
#
# Every colon goes on and off in the game: the plate is rendered with them
# off, again with them on, and overtime_publish.mjs cuts each lit colon out of
# the second. Where everything the game keeps alive fell in the picture —
# every key's cap, the calculator's display, the colons, the coffee — is
# written down beside them (officeRender.json).
#
# The eye sits level, a little over the lamp's shade, the picture shifted down
# (verticals upright); the reference picture is 1880 × 1000 and the game
# covers its screen with it, so what matters keeps to the middle three
# quarters of its width.
#
#   blender -b --factory-startup -P art/blender/overtime_office.py -- [--samples 384] [--width 2560] [--still 1|lit] [--exposure 1.2]
#   node art/blender/overtime_publish.mjs .artifacts/overtime-office 7

import bpy, math, os, sys, json, runpy
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
import room_common as rc
from room_common import P, RW, RH, project, scale_at, box_of, object_corners

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(arg('--out', os.path.join(rc.ROOT, ".artifacts/overtime-office")))
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "384"))
WIDTH = int(arg("--width", "2560"))
STILL = arg("--still", "")
EXPOSURE = float(arg("--exposure", "1.2"))

# ── the nursery, Silas's desk in its corner, nothing rendered ──────────────
mine = list(ARGS)
ARGS[:] = ['--only', 'none', '--out', os.path.join(OUT, 'room'), '--width', '1600', '--samples', str(SAMPLES),
           '--desk-lamp', arg('--lamp', '4'), '--desk-clocks', arg('--clocks', '4')]
try:
    nursery = runpy.run_path(os.path.join(HERE, 'room_nursery.py'), run_name='__main__')
finally:
    ARGS[:] = mine
scene = nursery['scene']; S = nursery['DESK_SET']; AT = nursery['DESK_AT']
for o in nursery['CHEST_PARTS']: o.hide_render = True
def W_(p):
    """a place in the desk's frame, where it stands in the room"""
    return AT + (p if isinstance(p, Vector) else P(*p))

# ── where we sit: in the chair, 125 cm from the wall ───────────────────────
EYE_Y = float(arg("--ey", "116"))
cd = bpy.data.cameras.new("After Hours | from the chair"); cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36
cd.lens = float(arg("--lens", "20")); cd.clip_start = 0.05; cd.clip_end = 80; cd.shift_y = float(arg("--lift", "-0.1"))
cam = link(bpy.data.objects.new("After Hours | eye", cd)); cam.location = W_((0, EYE_Y, 0))
cam.rotation_euler = (W_((0, EYE_Y, S["WALL_D"])) - W_((0, EYE_Y, 0))).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam; rc.SCENE = scene
HEIGHT = round(WIDTH * RH / RW)
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = WIDTH, HEIGHT, 100
# (the clocks' faces were made for the office's darker exposure: kept as
#  bright as they were)
k_ = 2 ** (0.35 - EXPOSURE)
for pair in S["FACES"].values():
    for m in pair:
        b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Emission Strength"].default_value *= k_
for g in S["CLOCK_GLOWS"]: g.data.energy *= k_

# ── where everything the game keeps alive fell in the picture ──────────────
bpy.context.view_layer.update()
keys = {}
for key, *_ in S["KEYPAD"]:
    x0, x1, d0, d1 = S["KEY_CAPS"][key]; i_ = 0.2
    # (near left, near right, far right, far left: as one looking down on it sees them, lower left first)
    q = [W_(S["on_top"](x, d, S["CAP_H"])) for x, d in ((x0 + i_, d0 + i_), (x1 - i_, d0 + i_), (x1 - i_, d1 - i_), (x0 + i_, d1 - i_))]
    keys[key] = {"quad": [list(project(p)) for p in q], "center": list(project(W_(S["on_top"]((x0 + x1) / 2, (d0 + d1) / 2, S["CAP_H"]))))}
# the display's figures: a band inside its glass, lower left first, and its
# size in cm along the glass (v up, toward the far end)
LCD, CW = S["LCD"], S["CW"]
BAND = dict(u0=LCD["u0"] + 0.6 - CW / 2, u1=LCD["u1"] - 0.6 - CW / 2, d0=LCD["d0"] + 0.5, d1=LCD["d1"] - 0.5)
band = [W_(S["on_top"](u, d, 0.34)) for u, d in ((BAND["u0"], BAND["d0"]), (BAND["u1"], BAND["d0"]), (BAND["u1"], BAND["d1"]), (BAND["u0"], BAND["d1"]))]
colons = []
for o, i, cs in S["COLONS"]:
    ps = [project(W_(c)) for c in cs]
    x0_, y0_ = math.floor(min(p[0] for p in ps)) - 2, math.floor(min(p[1] for p in ps)) - 2
    colons.append({"clock": i, "box": [x0_, y0_, math.ceil(max(p[0] for p in ps)) + 2 - x0_, math.ceil(max(p[1] for p in ps)) + 2 - y0_]})
# (what must stay on screen: the four clocks and the calculator)
CF, slope, CL = S["CF"], S["slope"], S["CL"]
SAFE = [c for o, _, _ in S["COLONS"] for c in object_corners(o)] + [W_(CF(x, y, d)) for x in (-CW / 2, CW / 2) for d in (0, CL) for y in (0, slope(d))]
data = {
    "version": 2, "width": RW, "height": RH, "safe": box_of(SAFE, pad=16),
    "keys": keys,
    "lcd": {"corners": [list(project(p)) for p in band], "w": round(BAND["u1"] - BAND["u0"], 3), "h": round((BAND["d1"] - BAND["d0"]) / math.cos(S["TILT"]), 3)},
    "colons": colons,
    "steam": [*project(W_(S["MUG_TOP"])), scale_at(W_(S["MUG_TOP"]))],
}
with open(os.path.join(OUT, "officeRender.json"), "w") as f: json.dump(data, f, indent=1)

# ── render: the colons out, then lit ───────────────────────────────────────
scene.view_settings.exposure = EXPOSURE
scene.cycles.samples = SAMPLES
if STILL:
    S["colons_lit"](STILL == "lit"); render(scene, os.path.join(OUT, "still.png"))
else:
    S["colons_lit"](False); render(scene, os.path.join(OUT, "plate.png"))
    S["colons_lit"](True); render(scene, os.path.join(OUT, "lit.png"))
print("OFFICE_DONE")
