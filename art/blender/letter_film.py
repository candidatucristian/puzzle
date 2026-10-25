# A letter found in the house, opened on the desk (ui/letterArrival.js). Seen
# from straight above an old walnut desk, its dark leather writing-bed tooled
# in gilt, an inkwell and a pen at its edge, a lamp burning off to the left:
# the envelope lies there, its back to us, the red wax on the flap. The flap
# lifts and the wax breaks across; the letter, folded in three, is drawn up
# out of it and laid down in the lamplight, and opens out fold by fold, the
# envelope pushed aside. The game plays it as a film, and lays the letter's
# words over the paper in its last frame — so the paper is left blank here,
# and where it lies in that frame is written down (letterFilm.json). Played
# backward from its end, it is the letter folding up again to be filed.
#
# Writes the frames (frame-0001.png …), the side panel's envelope alone
# (envelope.png), and letterFilm.json; letter_film_publish.mjs makes the films.
#
#   blender -b --factory-startup -P art/blender/letter_film.py -- [--samples 192] [--width 1920] [--frames 1-150] [--still 100] [--only frames,icon]

import bpy, math, os, sys, json
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import ROOT, scan
from letter_common import aged_paper, piece, rounded, sealing_wax, wax_seal

OUT = os.path.abspath(arg("--output", os.path.join(ROOT, ".artifacts/letter-film")))
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "192"))
WIDTH = int(arg("--width", "1920"))
HEIGHT = round(WIDTH * 9 / 16)
FPS = 30
FIRST, LAST = (int(v) for v in arg("--frames", "1-156").split("-"))
STILL = arg("--still", "")
ONLY = set(arg("--only", "frames,icon").split(","))
D = math.radians

scene = fresh()
scene.render.fps = FPS
scene.frame_start, scene.frame_end = FIRST, LAST

# ── the desk ────────────────────────────────────────────────────────────────
LEATHER_TOP = 0.004
desk = box("desk", -9, 9, -6, 6, -0.12, 0.0, scan("desk walnut", "dark_wood", size=2.6, tint=(0.66, 0.45, 0.29), bright=0.62,
                                                 rough=(0.42, 0.66), bump=0.3, coat=0.0, vary=0.0))
# the writing bed: dark green leather let into the walnut, the letter's ground
BX0, BX1, BY0, BY1 = -2.6, 2.6, -2.05, 2.45
bed = box("writing bed", BX0, BX1, BY0, BY1, 0.0, LEATHER_TOP, scan("writing leather", "brown_leather", size=1.1, tint=(0.13, 0.27, 0.14),
                                                                bright=0.85, sat=1.0, rough=(0.3, 0.55), bump=0.55))
bevel(bed, 0.002, 2)
GILT = aged_metal("tooled gilt", (0.62, 0.46, 0.2), (0.12, 0.08, 0.03), rough=(0.3, 0.5), scale=60, tarnish=0.5)
for inset in (0.08, 0.13):
    x0, x1, y0, y1 = BX0 + inset, BX1 - inset, BY0 + inset, BY1 - inset
    for (a, b_, c, d_) in ((x0, x1, y0, y0 + 0.012), (x0, x1, y1 - 0.012, y1), (x0, x0 + 0.012, y0, y1), (x1 - 0.012, x1, y0, y1)):
        box("gilt line", a, b_, c, d_, LEATHER_TOP - 0.0006, LEATHER_TOP + 0.0002, GILT)
# the inkwell, and the pen laid down by it
GLASS = plain("inkwell glass", (0.9, 0.92, 0.9), rough=0.05, transmission=1.0, ior=1.5)
INK = plain("ink", (0.01, 0.012, 0.02), rough=0.1)
BRASS = aged_metal("brass", (0.5, 0.36, 0.16), (0.07, 0.05, 0.025), rough=(0.28, 0.56), scale=40, tarnish=0.6)
ix, iy = 3.05, 1.55
well = box("inkwell", ix - 0.32, ix + 0.32, iy - 0.32, iy + 0.32, LEATHER_TOP, LEATHER_TOP + 0.42, GLASS); bevel(well, 0.06, 4)
box("ink", ix - 0.26, ix + 0.26, iy - 0.26, iy + 0.26, LEATHER_TOP + 0.04, LEATHER_TOP + 0.22, INK)
cylinder("inkwell neck", ix, iy, LEATHER_TOP + 0.42, LEATHER_TOP + 0.5, 0.12, BRASS, verts=48)
cylinder("inkwell lid", ix, iy, LEATHER_TOP + 0.5, LEATHER_TOP + 0.56, 0.16, BRASS, verts=48)
pen = cylinder("pen holder", 0, 0, -0.95, 0.95, 0.035, plain("ebonised wood", (0.03, 0.022, 0.018), rough=0.4), verts=24)
pen.rotation_euler = (D(90), 0, D(22)); pen.location = (2.25, -0.35, LEATHER_TOP + 0.036)
nib = cylinder("nib", 0, 0, 0.95, 1.18, 0.03, plain("steel nib", (0.5, 0.5, 0.52), rough=0.25, metal=1.0), verts=16, r2=0.002)
nib.rotation_euler = pen.rotation_euler; nib.location = pen.location

# ── the envelope (a long one, as letters folded in three go in) ────────────
EW, EH = 2.3, 1.18
X, Y = EW / 2, EH / 2
TIP = -0.1                            # where the flap's point comes down to
T = 0.006                             # the envelope's paper, a little proud
ENV = [aged_paper(f"envelope {i}", tone=tone, half=(X, Y), seed=i * 3.1)
       for i, tone in enumerate(((0.74, 0.6, 0.4), (0.71, 0.575, 0.38), (0.75, 0.615, 0.415), (0.73, 0.595, 0.395)))]
ENVELOPE = bpy.data.objects.new("envelope", None); link(ENVELOPE)
def held(o, parent):
    o.parent = parent; o.matrix_parent_inverse = parent.matrix_world.inverted(); return o
Z0 = LEATHER_TOP                      # the envelope's back lies on the leather
body = held(piece("envelope body", rounded([(-X, -Y), (X, -Y), (X, Y), (-X, Y)], 0.025), Z0, T, ENV[0]), ENVELOPE)
ZS = Z0 + 0.018                       # (room inside it for the folded letter)
held(piece("side flap", rounded([(-X, -Y + 0.01), (-0.08, -0.03), (-X, Y - 0.01)], 0.05), ZS, T, ENV[1]), ENVELOPE)
held(piece("side flap", rounded([(X, -Y + 0.01), (X, Y - 0.01), (0.08, -0.03)], 0.05), ZS, T, ENV[1]), ENVELOPE)
held(piece("bottom flap", rounded([(-X + 0.005, -Y + 0.005), (X - 0.005, -Y + 0.005), (0.2, 0.05), (-0.2, 0.05)], 0.08), ZS + T, T, ENV[2]), ENVELOPE)
ZF = ZS + 2 * T                       # the flap, hinged along the top edge
flap = held(piece("top flap", rounded([(-X + 0.004, Y - 0.004), (0.0, TIP), (X - 0.004, Y - 0.004)], 0.1), ZF, T, ENV[3], origin=(0, Y, ZF)), ENVELOPE)
# the wax over the flap's point, to break across it as the flap lifts
WAX = sealing_wax()
below, above = wax_seal(WAX, 0.19, ZF + T, split=0.0)
for half in (below, above): half.location = (0, TIP + 0.012, 0)
held(below, ENVELOPE); bpy.context.view_layer.update(); held(above, flap)

# ── the letter, folded in three ────────────────────────────────────────────
LW, LH = 2.15, 3.05
P3 = LH / 3
t = 0.003                             # the letter's own paper, thin
LETTER = bpy.data.objects.new("letter", None); link(LETTER)
middle = held(piece("letter middle", rounded([(-LW / 2, -P3 / 2), (LW / 2, -P3 / 2), (LW / 2, P3 / 2), (-LW / 2, P3 / 2)], 0.008), 0, t,
                    aged_paper("letter middle", half=(LW / 2, LH), seed=7.7, folds=(P3 / 2, -P3 / 2))), LETTER)
# (each outer third hinged at its fold, lying under its hinge so that, folded
# over, it lies on what it folds onto)
low = held(piece("letter foot", rounded([(-LW / 2, -P3 / 2 - P3), (LW / 2, -P3 / 2 - P3), (LW / 2, -P3 / 2), (-LW / 2, -P3 / 2)], 0.008), 0, t,
                 aged_paper("letter foot", half=(LW / 2, P3), seed=8.3, folds=(0.0,)), origin=(0, -P3 / 2, t)), LETTER)
high = held(piece("letter head", rounded([(-LW / 2, P3 / 2), (LW / 2, P3 / 2), (LW / 2, P3 / 2 + P3), (-LW / 2, P3 / 2 + P3)], 0.008), t, t,
                  aged_paper("letter head", half=(LW / 2, P3), seed=9.1, folds=(0.0,)), origin=(0, P3 / 2, 2 * t)), LETTER)

# ── the light: the desk lamp off to the left, the night at the window right ─
world = bpy.data.worlds.new("study"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.006, 0.006, 0.008, 1)
# (near and small: a warm pool of light on the bed, the corners falling away into the dark)
lamp("the desk lamp", "AREA", (-3.4, 2.4, 3.6), aim=(0.4, 0.2, 0), energy=float(arg("--lamp", "560")), colour=(1.0, 0.68, 0.38), size=0.9)
lamp("the window", "AREA", (6.5, -4.0, 7.0), aim=(0, 0, 0), energy=float(arg("--window", "160")), colour=(0.6, 0.7, 1.0), size=5.0)
lamp("the room", "AREA", (0, -1, 12), aim=(0, 0, 0), energy=float(arg("--room", "70")), colour=(0.95, 0.9, 0.85), size=8.0)

# ── the eye, straight down ─────────────────────────────────────────────────
cd = bpy.data.cameras.new("eye"); cd.lens = 50; cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36
cd.clip_start = 0.1; cd.clip_end = 40
cam = link(bpy.data.objects.new("eye", cd)); scene.camera = cam
cam.rotation_euler = (0, 0, 0)
cd.dof.use_dof = True; cd.dof.aperture_fstop = float(arg("--fstop", "6.0"))
# the letter, all opened, the height of the picture less a margin
END_AT = Vector((0.15, 0.35))
END_H = LH / 0.8 * 16 / 9 / 0.72     # (36 mm across a 50 mm lens: the picture is 0.72 of the height across)
START_H = 4.7 / 0.72

# ── the movement, frame by frame at 30 a second ────────────────────────────
def key(o, frame, **values):
    for name, value in values.items():
        setattr(o, name, value); o.keyframe_insert(name, frame=frame)
CRACK, OPEN0, OPEN1 = 20, 24, 46
SLIDE0, SLIDE1 = 56, 80               # drawn out along the desk, under the raised flap
AWAY0, AWAY1 = 78, 100                # the envelope pushed aside, once the letter is clear of it
LIFT, LAID = 90, 104                  # the letter lifted, carried, and laid down
HEAD0, HEAD1 = 104, 126
FOOT0, FOOT1 = 114, 136
REST0, REST1 = 134, 146
# the eye: still on the envelope, drawing back as the letter opens out
key(cam, 1, location=Vector((0.0, -0.05, START_H)))
key(cam, 50, location=Vector((0.0, -0.02, START_H - 0.2)))
key(cam, 148, location=Vector((END_AT.x, END_AT.y, END_H)))
key(cam, LAST, location=Vector((END_AT.x, END_AT.y, END_H)))
for f, h in ((1, START_H), (50, START_H - 0.2), (148, END_H), (LAST, END_H)):
    cd.dof.focus_distance = h - 0.01; cd.dof.keyframe_insert("focus_distance", frame=f)
# the flap: a catch as the wax gives, then up, to stand leaning back as an opened flap does
key(flap, 1, rotation_euler=(0, 0, 0)); key(flap, CRACK - 2, rotation_euler=(0, 0, 0))
key(flap, CRACK + 1, rotation_euler=(D(-7), 0, 0)); key(flap, OPEN0, rotation_euler=(D(-4), 0, 0))
key(flap, OPEN1, rotation_euler=(D(-117), 0, 0)); key(flap, OPEN1 + 4, rotation_euler=(D(-107), 0, 0)); key(flap, OPEN1 + 9, rotation_euler=(D(-111), 0, 0))
# the letter: drawn up out of it, carried over, laid down, opened out
IN = Vector((0, -0.02, Z0 + T)); OUT_ = Vector((0.04, 1.5, Z0 + T + 0.002)); UP = Vector((0.1, 1.15, 0.32))
END = Vector((END_AT.x, END_AT.y, 0.05)); DOWN = Vector((END_AT.x, END_AT.y, LEATHER_TOP + 0.0005))
key(LETTER, 1, location=IN, rotation_euler=(0, 0, 0)); key(LETTER, SLIDE0, location=IN, rotation_euler=(0, 0, 0))
key(LETTER, SLIDE1, location=OUT_, rotation_euler=(0, 0, D(2)))
key(LETTER, LIFT, location=UP, rotation_euler=(0, 0, D(1)))
key(LETTER, LAID, location=END, rotation_euler=(0, 0, D(-1.5)))
key(LETTER, REST0, location=END, rotation_euler=(0, 0, D(-1.5)))
key(LETTER, REST1, location=DOWN, rotation_euler=(0, 0, D(-1.5)))
key(high, 1, rotation_euler=(D(180), 0, 0)); key(high, HEAD0, rotation_euler=(D(180), 0, 0))
key(high, HEAD1 - 6, rotation_euler=(D(8), 0, 0)); key(high, HEAD1, rotation_euler=(D(3), 0, 0)); key(high, REST1, rotation_euler=(0, 0, 0))
key(low, 1, rotation_euler=(D(-180), 0, 0)); key(low, FOOT0, rotation_euler=(D(-180), 0, 0))
key(low, FOOT1 - 6, rotation_euler=(D(-8), 0, 0)); key(low, FOOT1, rotation_euler=(D(-3), 0, 0)); key(low, REST1, rotation_euler=(0, 0, 0))
# the envelope, pushed aside to the corner of the bed
key(ENVELOPE, 1, location=Vector((0, 0, 0)), rotation_euler=(0, 0, 0)); key(ENVELOPE, AWAY0, location=Vector((0, 0, 0)), rotation_euler=(0, 0, 0))
key(ENVELOPE, AWAY1, location=Vector((-2.65, -1.62, 0)), rotation_euler=(0, 0, D(-11)))
# every move eased, nothing mechanical
for o in (cam, flap, LETTER, high, low, ENVELOPE):
    for fc in o.animation_data.action.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "BEZIER"; kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"
for fc in cd.animation_data.action.fcurves:
    for kp in fc.keyframe_points: kp.interpolation = "BEZIER"

# ── where things fall in the picture ───────────────────────────────────────
from bpy_extras.object_utils import world_to_camera_view
def seen(points, frame):
    scene.frame_set(frame); bpy.context.view_layer.update()
    return [(round(v.x, 5), round(1 - v.y, 5)) for v in (world_to_camera_view(scene, cam, p) for p in points)]
def corners_of(o, xs, ys, z):
    return [o.matrix_world @ Vector((x, y, z)) for x, y in ((xs[0], ys[1]), (xs[1], ys[1]), (xs[1], ys[0]), (xs[0], ys[0]))]
scene.frame_set(LAST); bpy.context.view_layer.update()
paper = seen(corners_of(LETTER, (-LW / 2, LW / 2), (-LH / 2, LH / 2), t), LAST)        # top left, top right, bottom right, bottom left
scene.frame_set(1); bpy.context.view_layer.update()
env = seen(corners_of(ENVELOPE, (-X, X), (-Y, Y), Z0), 1)
cue = lambda f: round((f - FIRST) / FPS, 3)
json.dump({
    "fps": FPS, "frames": LAST - FIRST + 1, "width": WIDTH, "height": HEIGHT,
    # (the paper all opened in the last frame, and the envelope in the first, as fractions of the picture)
    "paper": paper, "envelope": env,
    # (how much of the side panel's picture of it is the envelope, across and down: the rest is room for its shadow)
    "icon": [round(EW / (EW + 0.6), 4), round(EH / (EH + 0.6), 4)],
    "cues": {"crack": cue(CRACK), "open": cue(OPEN0 + 2), "slide": cue(SLIDE0 + 2), "unfold": cue(HEAD0 + 2), "unfold2": cue(FOOT0 + 2), "settle": cue(REST1 - 4)},
    # (played backward from the end, to file it: from the last frame back to the letter still in the envelope)
    "fold": {"from": LAST, "to": SLIDE0, "step": 2, "cues": {"fold": FOOT1, "fold2": HEAD1, "slide": SLIDE1}},
}, open(os.path.join(OUT, "letterFilm.json"), "w"), indent=2)

# ── render ──────────────────────────────────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "0.3")), glare=False)
c = scene.cycles
c.adaptive_threshold = 0.01; c.adaptive_min_samples = 48; c.sample_clamp_indirect = 6.0
c.denoising_input_passes = "RGB_ALBEDO_NORMAL"; c.denoising_prefilter = "ACCURATE"
scene.render.use_motion_blur = True; scene.render.motion_blur_shutter = 0.5
scene.render.image_settings.file_format = "PNG"; scene.render.image_settings.color_mode = "RGB"
# (no scene kept between frames: a jump between them once left the letter stale, black)
scene.render.use_persistent_data = False

if STILL:
    for frame in (int(v) for v in STILL.split(",")):
        scene.frame_set(frame)
        render(scene, os.path.join(OUT, f"still-{frame:03d}.png"))
elif "frames" in ONLY:
    scene.render.filepath = os.path.join(OUT, "frame-")
    scene.render.use_overwrite = False; scene.render.use_placeholder = True
    bpy.ops.render.render(animation=True)
    print("RENDERED", FIRST, LAST)

# ── the envelope alone, for the side panel: seen straight down, its shadow under it ─
if "icon" in ONLY and not STILL:
    scene.frame_set(1)
    keep = set(ENVELOPE.children_recursive)
    for o in bpy.data.objects:
        if o.type == "MESH": o.hide_render = o not in keep
    table = box("table", -4, 4, -4, 4, -0.24, -0.2, plain("table", (0.2, 0.2, 0.2))); table.is_shadow_catcher = True
    icd = bpy.data.cameras.new("icon"); icd.type = "ORTHO"
    icam = link(bpy.data.objects.new("icon", icd)); icam.location = (0, 0, 6); scene.camera = icam
    M = 0.3
    icd.ortho_scale = EW + 2 * M
    scene.render.resolution_x = 760; scene.render.resolution_y = round(760 * (EH + 2 * M) / (EW + 2 * M))
    scene.render.use_motion_blur = False
    scene.render.film_transparent = True; scene.render.image_settings.color_mode = "RGBA"
    scene.cycles.samples = 256
    render(scene, os.path.join(OUT, "envelope.png"))
