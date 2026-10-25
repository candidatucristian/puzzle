# The key going into a door of the botany hall and turning in its lock: the
# first time a door is opened with the key a room's chest gave up. A close
# shot, as near as the hand that holds it. The lock stile of one of the hall's
# walnut doors (hall_ground.py: the same walnut, the same aged brass, its
# knob above), the jamb and the architrave beside it; the escutcheon with its
# keyhole cut through, and in the hole the warm light of the room behind. The
# gilt key (shared/keyArt.js: a trefoil bow, a collar, a long shank, two wards
# cut in its bit) comes in from the hand, finds the hole, goes in with a catch
# on the wards, and turns a quarter round, hard, until the bolt goes back.
#
# Rendered as frames, then made a film (key_unlock_film.py); the game plays it
# over the hall (levels/hall/keyInsert.js), its sounds timed by the cues this
# writes beside it (levels/hall/keyUnlock.json).
#
#   blender -b --factory-startup -P art/blender/key_unlock.py -- [--samples 320] [--width 1920] [--frames 1-96] [--still 60]

import bpy, bmesh, math, os, sys, json
from mathutils import Vector, Euler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import ROOT, scan, slab

OUT = os.path.abspath(arg("--output", os.path.join(ROOT, ".artifacts/key-unlock")))
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "320"))
WIDTH = int(arg("--width", "1920"))
HEIGHT = round(WIDTH * 9 / 16)
FPS = 30
FIRST, LAST = (int(v) for v in arg("--frames", "1-96").split("-"))
STILL = arg("--still", "")

scene = fresh()

# ── the hall's materials, fine enough to be looked at from a hand's length ─
WALNUT = scan("walnut door", "rosewood_veneer1", size=0.55, tint=(0.68, 0.5, 0.38), bright=0.48, sat=0.82,
              rough=(0.48, 0.74), bump=0.38, coat=0.0, vary=0.08, dirt=0.24, grime=0.14, edges=0.03)
WALNUT_X = scan("walnut door across", "rosewood_veneer1", size=0.55, tint=(0.68, 0.5, 0.38), bright=0.46, sat=0.82,
                rough=(0.48, 0.74), bump=0.38, coat=0.0, upright=True, vary=0.08, dirt=0.24, grime=0.14, edges=0.03)
OAK = scan("architrave", "dark_wood", size=0.45, tint=(0.76, 0.58, 0.42), bright=0.46,
           rough=(0.52, 0.78), bump=0.42, coat=0.0, upright=True, vary=0.08, dirt=0.22, grime=0.14, edges=0.025)
BRASS = aged_metal("brass", (0.5, 0.36, 0.16), (0.07, 0.05, 0.025), rough=(0.28, 0.56), scale=90, tarnish=0.62)
# the key: the same gilt brass, but carried and handled, so brighter
GILT = aged_metal("key gilt", (0.66, 0.5, 0.22), (0.1, 0.07, 0.03), rough=(0.2, 0.4), scale=260, tarnish=0.32)
DARK = plain("inside the lock", (0.012, 0.01, 0.008), rough=0.7)
THROUGH = plain("the room through the keyhole", (0, 0, 0), emit=(1.0, 0.62, 0.3), strength=2.4)

# ── the door: the lock stile, the panel beside it, the lock rail above ─────
# The keyhole is the origin; the door's face is y = 0, its wood behind (+y),
# the hall in front (−y); x across, z up. (In the hall the lock is 0.915 m up
# and 6.5 cm in from the door's closing edge.)
EDGE = 0.065                     # the door's closing edge
STILE0 = EDGE - 0.11             # where the stile meets the panel
RAIL0 = 0.072                    # the foot of the lock rail
stile = slab(STILE0, EDGE, 0, 0.045, -0.6, 0.6, WALNUT, 0.002)
slab(-0.6, STILE0, 0, 0.045, RAIL0, RAIL0 + 0.11, WALNUT_X, 0.002)                 # the lock rail
slab(-0.6, STILE0 - 0.016, 0.016, 0.045, -0.6, RAIL0 - 0.016, WALNUT, 0.012)        # the panel, sunk
for (a, b, c, d_) in ((STILE0 - 0.016, STILE0, -0.6, RAIL0), (-0.6, STILE0, RAIL0 - 0.016, RAIL0)):
    slab(a, b, 0.004, 0.045, c, d_, WALNUT, 0.003)                                   # its moulding
# the jamb lining in the gap, the architrave proud of the wall beyond it
slab(EDGE + 0.003, EDGE + 0.005, -0.07, 0.045, -0.6, 0.6, OAK, 0)
slab(EDGE + 0.003, EDGE + 0.133, -0.104, -0.07, -0.6, 0.6, OAK, 0.008)
slab(EDGE + 0.031, EDGE + 0.105, -0.118, -0.104, -0.6, 0.6, OAK, 0.005)
slab(EDGE + 0.133, EDGE + 0.6, -0.08, -0.07, -0.6, 0.6, plain("plaster", (0.36, 0.34, 0.3), rough=0.9), 0)

# the knob above, its rose and shank (hall_ground.py: 1.02 m up)
KZ = 0.105
k = cylinder("rose", 0, 0, -0.005, 0.005, 0.032, BRASS, verts=64); k.rotation_euler = (math.pi / 2, 0, 0); k.location = (0, -0.002, KZ); bevel(k, 0.002, 2)
k = cylinder("shank", 0, 0, -0.02, 0.02, 0.008, BRASS, verts=48); k.rotation_euler = (math.pi / 2, 0, 0); k.location = (0, -0.025, KZ)
sphere("knob", (0, -0.075, KZ), 0.028, BRASS)
# (the knob stands above the shot: its shadow, a dark blot across the door, is left out)
for o in [o for o in bpy.data.objects if o.name.split(".")[0] in ("rose", "shank", "knob")]: o.visible_shadow = False

# ── the escutcheon: a brass plate, round at either end, the keyhole through
HOLE_R, HOLE_Z = 0.0042, 0.006          # the round of the keyhole, and how far up it is
SLOT_W, SLOT_Z = 0.0036, -0.0125        # the slot under it, how wide, how far down
def stadium(name, w, h, y0, y1, mat, r_edge=0.0012):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    pts, n = [], 24
    for end, cz in ((1, h / 2 - w / 2), (-1, -(h / 2 - w / 2))):
        for i in range(n + 1):
            a = math.pi * i / n
            pts.append((math.cos(a) * w / 2 * end, cz + math.sin(a) * w / 2 * end))
    face = bm.faces.new([bm.verts.new((x, y0, z)) for x, z in pts])
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    bmesh.ops.translate(bm, verts=[v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)], vec=(0, y1 - y0, 0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    bevel(o, r_edge, 3)
    return o
plate = stadium("escutcheon", 0.032, 0.074, -0.003, 0.0, BRASS)
def keyhole_cutter(name, y0, y1, grow=0.0):
    """the shape of the keyhole, as a prism from y0 to y1"""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    r = HOLE_R + grow; n = 40
    # round at the top, opening into the slot below; the slot widening a little to its foot
    half = SLOT_W / 2 + grow
    start = math.asin(min(0.99, half / r))
    pts = [(math.sin(start + (2 * math.pi - 2 * start) * i / n) * r, HOLE_Z - math.cos(start + (2 * math.pi - 2 * start) * i / n) * r) for i in range(n + 1)]
    pts += [(-(half + 0.0003), SLOT_Z - grow), (half + 0.0003, SLOT_Z - grow)]
    face = bm.faces.new([bm.verts.new((x, y0, z)) for x, z in pts])
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    bmesh.ops.translate(bm, verts=[v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)], vec=(0, y1 - y0, 0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    return link(bpy.data.objects.new(name, me))
boolean_cut(plate, keyhole_cutter("cut", -0.01, 0.01))
# the hole on through the stile, and the lock's dark case where the bit turns
boolean_cut(stile, keyhole_cutter("cut", -0.01, 0.006, grow=0.0004))
case_cut = cylinder("case cut", 0, 0, -0.016, 0.016, 0.0125, DARK, verts=48)
case_cut.rotation_euler = (math.pi / 2, 0, 0); case_cut.location = (0, 0.022, 0)
boolean_cut(stile, case_cut)
case = cylinder("lock case", 0, 0, -0.016, 0.016, 0.0125, DARK, verts=48, open_ends=True)
case.rotation_euler = (math.pi / 2, 0, 0); case.location = (0, 0.022, 0)
box("lock back", -0.02, 0.02, 0.0375, 0.039, -0.02, 0.02, DARK)
# the room's light, coming through the lock from the far side
glow = box("the room beyond", -0.006, 0.006, 0.036, 0.0372, -0.013, 0.01, THROUGH)
glow.visible_shadow = False
for (x, z) in ((0, 0.027), (0, -0.027)):
    s = cylinder("screw", x, -0.0034, 0, 0.0012, 0.0016, BRASS, verts=24)
    s.rotation_euler = (math.pi / 2, 0, 0); s.location = (x, -0.003, z)
    slot = box("screw slot", -0.0016, 0.0016, -0.0047, -0.0038, -0.00022, 0.00022, DARK)
    slot.location = (x, 0, z); slot.rotation_euler = (0, 0.6 + x, 0)

# ── the key ─────────────────────────────────────────────────────────────────
# Built about its own shank, the shank along +y into the door, its bit
# hanging down (−z) as the keyhole's slot does, its bow in the same plane.
# `a` is along the shank: the tip at +0.026, the collar at −0.016 — so, all
# the way in, a centimetre of shank stands out of the plate.
KEY = bpy.data.objects.new("key", None); link(KEY)
def part(o):
    o.parent = KEY; return o
def along(o):
    """a thing turned about its upright z, laid along the shank (+y)"""
    o.rotation_euler = (-math.pi / 2, 0, 0); return o
SHANK_R = 0.0021
part(along(lathe("shank", [(0, -0.019), (SHANK_R, -0.019), (SHANK_R, 0.0245), (SHANK_R * 0.7, 0.026), (0, 0.026)], GILT, steps=40)))
part(along(lathe("collar", [(0, -0.0165), (0.0032, -0.0165), (0.0036, -0.0155), (0.0036, -0.0125), (0.0031, -0.0115), (0, -0.0115)], GILT, steps=40)))
part(along(lathe("neck", [(0, -0.0215), (0.0024, -0.0215), (0.0029, -0.019), (0.0022, -0.0175), (0, -0.0175)], GILT, steps=40)))
def ring(name, a, z, r=0.0049, t=0.00145):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = t; cu.bevel_resolution = 6
    sp = cu.splines.new("NURBS"); sp.points.add(7); sp.use_cyclic_u = True; sp.order_u = 3
    for i, p in enumerate(sp.points):
        ang = math.tau * i / 8
        p.co = (0, a + math.cos(ang) * r * 1.08, z + math.sin(ang) * r * 1.08, 1)
    o = link(bpy.data.objects.new(name, cu)); o.data.materials.append(GILT)
    return part(o)
# the trefoil: two rings either side, one beyond, a boss where they meet
ring("bow ring", -0.0275, 0.0064); ring("bow ring", -0.0275, -0.0064); ring("bow ring", -0.0355, 0.0)
part(sphere("boss", (0, -0.0262, 0), 0.0026, GILT, squash=(0.7, 1, 1)))
# the bit: a plate under the shank's end, two wards cut up into it from below
bit = box("bit", -0.0011, 0.0011, 0.0085, 0.0225, -0.0088, 0.0, GILT)
for (a0, a1, depth) in ((0.0112, 0.0132, 0.0032), (0.0168, 0.0186, 0.0048)):
    boolean_cut(bit, box("ward", -0.003, 0.003, a0, a1, -0.0095, -0.0088 + depth, GILT))
bevel(bit, 0.0003, 2); part(bit)

# ── the light: the hall at night, here ──────────────────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.002, 0.003, 0.006, 1)
# the sconce's candle, up the wall to the left: warm, low, from above
lamp("the sconce", "AREA", (-0.55, -0.45, 0.6), aim=(0, 0, 0), energy=float(arg("--candle", "9")), colour=(1.0, 0.6, 0.3), size=0.12)
# the moon down the lantern, cool, from high over the hall
lamp("the moon", "AREA", (0.35, -0.9, 1.4), aim=(0, 0, 0), energy=float(arg("--moon", "16")), colour=(0.55, 0.68, 1.0), size=0.9)
# the hall's own fill, soft, from behind the eye
fill = lamp("fill", "AREA", (-0.25, -0.75, 0.05), aim=(0, 0, 0), energy=float(arg("--fill", "1.6")), colour=(0.8, 0.85, 1.0), size=0.8)
fill.visible_camera = False; fill.visible_glossy = False
# a glint off the far side, to draw the key's edges as it turns
lamp("glint", "AREA", (0.3, -0.25, 0.32), aim=(0, -0.03, 0), energy=float(arg("--glint", "1.2")), colour=(1.0, 0.8, 0.55), size=0.05)

# ── the eye: as near as a hand, a little to the left and under the lock ───
cd = bpy.data.cameras.new("eye"); cd.lens = 70; cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36
cd.clip_start = 0.01; cd.clip_end = 10
cam = link(bpy.data.objects.new("eye", cd)); scene.camera = cam
FOCUS = bpy.data.objects.new("focus", None); link(FOCUS); FOCUS.location = (0, -0.006, 0)
cd.dof.use_dof = True; cd.dof.focus_object = FOCUS; cd.dof.aperture_fstop = float(arg("--fstop", "4.0"))
def eye_at(distance, azimuth, elevation):
    az, el = math.radians(azimuth), math.radians(elevation)
    return Vector((-math.sin(az) * math.cos(el) * distance, -math.cos(az) * math.cos(el) * distance, math.sin(el) * distance))
LOOK = Vector((0.004, 0, 0.002))
def aim(o, at):
    o.rotation_euler = (at - o.location).to_track_quat("-Z", "Y").to_euler()

# ── the movement ────────────────────────────────────────────────────────────
scene.render.fps = FPS
scene.frame_start, scene.frame_end = FIRST, LAST
# the eye drifts in a little over the whole shot, as a held look does
for f, d in ((1, 0.43), (96, 0.395)):
    cam.location = eye_at(d, 34, -9); aim(cam, LOOK)
    cam.keyframe_insert("location", frame=f); cam.keyframe_insert("rotation_euler", frame=f)
CLACK = 71                       # the frame the bolt goes back

# The key, by key frames: where its shank's mouth is (the origin, when it is
# all the way in), and how it is turned (x: up and down, z: side to side,
# y: the turn in the lock). Times are frames at 30 a second.
D = math.radians
KEYS = [
    # in from the hand, below and to the left, tilted as it is held
    (1,  (-0.085, -0.15, -0.075), (D(-24), D(-28), D(-36))),
    (16, (-0.022, -0.072, -0.012), (D(-8), D(-6), D(-14))),
    # finding the hole: lined up, a few millimetres off it
    (27, (-0.0015, -0.03, 0.0008), (D(-1.5), D(-1), D(-2.5))),
    (31, (0.0, -0.026, 0.0), (0, 0, 0)),
    # in: a catch on the wards half way, a little work, and on home
    (37, (0.0, -0.0135, 0.0), (0, D(1.5), 0)),
    (40, (0.0, -0.0125, 0.0), (0, D(-2.5), 0)),
    (42, (0.0, -0.012, 0.0), (0, D(1.0), 0)),
    (47, (0.0, 0.0, 0.0), (0, 0, 0)),
    (52, (0.0, 0.0, 0.0), (0, 0, 0)),
    # the turn: taken up, the levers' weight felt, and over to the bolt
    (56, (0.0, 0.0, 0.0), (0, D(14), 0)),
    (62, (0.0, 0.0, 0.0), (0, D(38), 0)),
    (65, (0.0, 0.0, 0.0), (0, D(44), 0)),
    (CLACK, (0.0, 0.0, 0.0), (0, D(92), 0)),
    (CLACK + 3, (0.0, 0.0, 0.0), (0, D(89), 0)),
    (96, (0.0, 0.0, 0.0), (0, D(90), 0)),
]
KEY.rotation_mode = "XYZ"
for f, at, rot in KEYS:
    KEY.location = at; KEY.rotation_euler = rot
    KEY.keyframe_insert("location", frame=f); KEY.keyframe_insert("rotation_euler", frame=f)
# held, not flown: every move eased, the hand's own slight unsteadiness over it
for fc in KEY.animation_data.action.fcurves:
    for kp in fc.keyframe_points:
        kp.interpolation = "BEZIER"; kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"
    if fc.data_path == "location" and fc.array_index != 1:
        n = fc.modifiers.new("NOISE"); n.scale = 9; n.strength = 0.0009; n.phase = 3 + fc.array_index * 7
        n.use_restricted_range = True; n.frame_start, n.frame_end = 1, 33; n.blend_in, n.blend_out = 2, 6
# the clack: the eye given a knock
for fc in cam.animation_data.action.fcurves:
    for kp in fc.keyframe_points: kp.interpolation = "BEZIER"
z = cam.animation_data.action.fcurves.find("location", index=2)
for f, dz in ((CLACK - 1, 0.0), (CLACK, -0.0009), (CLACK + 1, 0.0005), (CLACK + 3, -0.0002), (CLACK + 5, 0.0)):
    base = z.evaluate(f)
    z.keyframe_points.insert(f, base + dz).interpolation = "BEZIER"

# ── render ──────────────────────────────────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "0.75")))
c = scene.cycles
c.adaptive_threshold = 0.008; c.adaptive_min_samples = 64; c.sample_clamp_indirect = 4.0
c.denoising_input_passes = "RGB_ALBEDO_NORMAL"; c.denoising_prefilter = "ACCURATE"
scene.render.use_motion_blur = True; scene.render.motion_blur_shutter = 0.5
scene.render.image_settings.file_format = "PNG"; scene.render.image_settings.color_mode = "RGB"
scene.render.use_persistent_data = True
# (frames already rendered are kept: a stopped render takes up where it left off)
scene.render.use_overwrite = False; scene.render.use_placeholder = True

json.dump({"fps": FPS, "frames": LAST - FIRST + 1,
           # (seconds into the film: the key meets the hole, catches on the wards, turns home)
           "cues": {"enter": round((31 - FIRST) / FPS, 3), "catch": round((38 - FIRST) / FPS, 3), "turn": round((53 - FIRST) / FPS, 3), "clack": round((CLACK - FIRST) / FPS, 3)}},
          open(os.path.join(OUT, "cues.json"), "w"), indent=2)

if STILL:
    scene.frame_set(int(STILL))
    render(scene, os.path.join(OUT, f"still-{int(STILL):03d}.png"))
else:
    scene.render.filepath = os.path.join(OUT, "frame-")
    bpy.ops.render.render(animation=True)
    print("RENDERED", FIRST, LAST)
