# Room X, off the chemist's hall, built in three dimensions and rendered with
# Cycles — seen the other way about: from its far end, back at its own door.
#
# Nothing in here at all. Plaster walls, bare boards, a leaded window in the
# right-hand wall with the moon through it. The door stands open on the hall,
# its light lying in across the floor; and round the door frame rows of nail
# holes, and paler stripes in the paint where boards were nailed across it
# once. The boards themselves lean against the wall beside it, their nails
# bent where they were wrenched out; a crowbar on the floor, a few nails.
#
# One plate (lights-1) and where it all fell in the picture
# (src/levels/house/rooms/Room10.json).
#
#   blender -b --factory-startup -P art/blender/room_ten.py -- [--samples 700] [--width 2560]

import bpy, bmesh, math, os, sys, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *

OUT = os.path.join(ROOT, ".artifacts/room-ten")
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "700"))
WIDTH = int(arg("--width", "2560"))
RNG = random.Random(1910)

X0, X1, D1, TOP = -220, 220, 520, 285
EYE = (float(arg("--ex", "-75")), float(arg("--ey", "150")), float(arg("--ed", "350")))
LOOK = (float(arg("--lx", "50")), float(arg("--ly", "112")), float(arg("--ld", "0")))
scene, HEIGHT = stage(WIDTH, eye=EYE, look=LOOK, lens=float(arg("--lens", "24")))
DOOR = dict(x0=-30, x1=60, h=212)                 # the doorway in the wall at d 0
WIN = dict(d=190, hw=44, sill=110, top=236)      # the leaded window in the right-hand wall

PLASTER = scan("plaster", "white_plaster_rough_01", size=2.4, tint=(0.9, 0.86, 0.78), bright=0.95, sat=0.35, rough=(0.8, 0.95), bump=0.5)
CEILING = scan("ceiling", "plastered_wall_04", size=2.0, tint=(0.85, 0.83, 0.78), bright=0.72, sat=0.3, rough=(0.8, 0.95), bump=0.5)
BOARDS = scan("bare boards", "wood_floor_worn", size=2.2, tint=(0.72, 0.6, 0.48), bright=0.45, rough=(0.5, 0.85), bump=0.6)
PAINT = scan("door paint", "distressed_painted_planks", size=1.0, tint=(0.36, 0.42, 0.36), bright=0.55, sat=0.6, rough=(0.5, 0.85), bump=0.5, upright=True)
PAINT_PALE = scan("paint where boards were", "distressed_painted_planks", size=1.0, tint=(0.62, 0.7, 0.62), bright=0.95, sat=0.45, rough=(0.45, 0.75), bump=0.3, upright=True)
PLANK = scan("old plank", "dark_wooden_planks", size=1.4, tint=(0.75, 0.62, 0.5), bright=0.55, rough=(0.6, 0.9), bump=0.6)
IRON = aged_metal("iron", (0.05, 0.05, 0.05), (0.04, 0.025, 0.018), rough=(0.45, 0.8), scale=18, tarnish=0.55)
NAIL = aged_metal("nail", (0.12, 0.11, 0.1), (0.08, 0.04, 0.02), rough=(0.5, 0.8), scale=40, tarnish=0.7)
HOLE = plain("nail hole", (0.01, 0.008, 0.006), rough=0.9)
LEADED = plain("old glass", (0.75, 0.85, 0.72), rough=0.12, transmission=1.0, ior=1.5)
LEAD = plain("lead", (0.06, 0.065, 0.07), rough=0.5, metal=0.7)
LAYOUT = Layout("Room10")

# ── the shell; the doorway in the near wall, the window in the right ──────
box_cm("floor", X0 - 20, X1 + 20, -6, 0, -10, D1 + 20, BOARDS)
box_cm("ceiling", X0 - 20, X1 + 20, TOP, TOP + 10, -10, D1 + 20, CEILING)
box_cm("wall", X0 - 25, X0, 0, TOP, -10, D1 + 20, PLASTER)
right = box_cm("wall", X1, X1 + 25, 0, TOP, -10, D1 + 20, PLASTER)
box_cm("far wall", X0 - 25, X1 + 25, 0, TOP, D1, D1 + 25, PLASTER)
door_wall = box_cm("door wall", X0 - 25, X1 + 25, 0, TOP, -22, 0, PLASTER)
boolean_cut(door_wall, box("cut", M(DOOR["x0"]), M(DOOR["x1"]), M(-40), M(10), M(-1), M(DOOR["h"]), IRON))
for (x0, x1, d0, d1, along_x) in ((X0, X1, 0, 2.5, True), (X0, X0 + 2.5, 0, D1, False), (X1 - 2.5, X1, 0, D1, False), (X0, X1, D1 - 2.5, D1, True)):
    if along_x and d0 == 0:
        for (a, b) in ((X0, DOOR["x0"] - 9), (DOOR["x1"] + 9, X1)): box_cm("skirting", a, b, 0, 15, d0, d1, PAINT, 0.5)
    else:
        box_cm("skirting", x0, x1, 0, 15, d0, d1, PAINT, 0.5)
box_cm("picture rail", X0, X1, 228, 232, 0, 2, PAINT, 0.4)
# the architrave round the doorway, the door standing open
AW = 9
for (a, b) in ((DOOR["x0"] - AW, DOOR["x0"]), (DOOR["x1"], DOOR["x1"] + AW)):
    box_cm("architrave", a, b, 0, DOOR["h"] + AW, 0, 2.2, PAINT, 0.6)
box_cm("architrave head", DOOR["x0"] - AW, DOOR["x1"] + AW, DOOR["h"], DOOR["h"] + AW, 0, 2.2, PAINT, 0.6)
for (a, b) in ((DOOR["x0"] - 1, DOOR["x0"]), (DOOR["x1"], DOOR["x1"] + 1)):
    box_cm("door lining", a, b, 0, DOOR["h"], -22, 0, PAINT)
box_cm("door lining head", DOOR["x0"], DOOR["x1"], DOOR["h"] - 1, DOOR["h"], -22, 0, PAINT)
def door():
    w = DOOR["x1"] - DOOR["x0"] - 1
    box_cm("door", 0, w, 0, DOOR["h"] - 1, -2.2, 2.2, PAINT, 0.4, keep=False)
    for (y0, y1) in ((14, 90), (104, DOOR["h"] - 16)):
        for (x0, x1) in ((8, w / 2 - 4), (w / 2 + 4, w - 8)):
            box_cm("door panel", x0, x1, y0, y1, -2.6, -2.2, PAINT, 1.0, keep=False)
    lathe("door knob", [(0, 0), (0.025, 0), (0.028, 0.02), (0.012, 0.035), (0, 0.04)], aged_metal("brass knob", (0.55, 0.39, 0.17), (0.08, 0.055, 0.025), rough=(0.25, 0.5)), at=tuple(P(w - 7, 98, -2.2)), steps=24).rotation_euler = (-math.pi / 2, 0, 0)
# (hinged on its left, swung back into the room)
assembled("door", door, at=(DOOR["x0"] + 0.5, 0, 0), turn=math.radians(104))
# the nail holes round the frame, and the paler stripes where the boards lay
for y in (38, 96, 154):
    box_cm("pale stripe", DOOR["x0"] - AW, DOOR["x0"], y, y + 18, 2.2, 2.4, PAINT_PALE, 0.2)
    box_cm("pale stripe", DOOR["x1"], DOOR["x1"] + AW, y, y + 18, 2.2, 2.4, PAINT_PALE, 0.2)
    for x in (DOOR["x0"] - AW / 2, DOOR["x1"] + AW / 2):
        for k in (5, 13):
            hole = sphere("nail hole", (0, 0, 0), M(0.55), HOLE, squash=(1, 0.25, 1)); hole.location = P(x + RNG.uniform(-1.5, 1.5), y + k, 2.42)
    for x in (DOOR["x0"] - AW - 12, DOOR["x1"] + AW + 12):
        for k in (6, 12):
            h_ = sphere("nail hole in plaster", (0, 0, 0), M(0.6), HOLE, squash=(1, 0.3, 1)); h_.location = P(x + RNG.uniform(-3, 3), y + k, 0.1)
            # (the plaster crumbled round it where the nail was wrenched out)
            ch_ = sphere("crumbled plaster", (0, 0, 0), M(1.6), plain("bare plaster", (0.62, 0.58, 0.5), rough=0.95), squash=(1, 0.15, 1)); ch_.location = h_.location + Vector((0, M(0.05), 0))
# the boards, leaning against the wall to the left of the door, their nails bent
for k in range(4):
    def plank(k=k):
        L_ = 120 + k * 6
        box_cm("plank", -L_ / 2, L_ / 2, -9, 9, -1.2, 1.2, PLANK, 0.3, keep=False)
        for e in (-1, 1):
            for j in (-4, 4):
                rod("bent nail", P(e * (L_ / 2 - 8), j, 1.2), P(e * (L_ / 2 - 8) + 0.8, j + 1.2, 5.5), M(0.22), NAIL, verts=6)
    o = assembled("plank", plank, at=(X0 + 40 + k * 7, 0, 10 + k * 4), turn=0.0)
    o.rotation_euler = (0, math.radians(76 - k * 5), math.radians(-4 + k * 5))
    o.location = P(X0 + 34 + k * 26, 60, 12 + k * 5)
# the crowbar on the floor, a few nails
cb = rod("crowbar", P(-80, 1.2, 120), P(-10, 1.2, 150), M(1.2), IRON, verts=10)
tube("crowbar claw", [(0, 0), (0.04, 0.005), (0.07, 0.03)], 0.012, IRON, at=tuple(P(-10, 1.2, 150)), rot=math.atan2(30, 70))
for k in range(7):
    a = RNG.uniform(0, math.tau); c = P(RNG.uniform(-40, 60), 0.3, RNG.uniform(40, 110))
    rod("nail", c, c + Vector((math.cos(a) * 0.065, math.sin(a) * 0.065, 0.002)), M(0.18), NAIL, verts=6)

# ── the leaded window in the right-hand wall ──────────────────────────────
wd0, wd1 = WIN["d"] - WIN["hw"], WIN["d"] + WIN["hw"]
boolean_cut(right, box("cut", M(X1 - 10), M(X1 + 60), M(wd0), M(wd1), M(WIN["sill"]), M(WIN["top"]), IRON))
box_cm("reveal", X1, X1 + 26, WIN["sill"], WIN["top"], wd0 - 1, wd0, PLASTER)
box_cm("reveal", X1, X1 + 26, WIN["sill"], WIN["top"], wd1, wd1 + 1, PLASTER)
box_cm("reveal head", X1, X1 + 26, WIN["top"], WIN["top"] + 1, wd0, wd1, PLASTER)
box_cm("sill", X1 - 6, X1 + 24, WIN["sill"] - 5, WIN["sill"], wd0 - 4, wd1 + 4, scan("sill stone", "worn_tile_floor", size=0.6, bright=0.55, rough=(0.5, 0.85)), 1.0)
GX = X1 + 16
casement = box_cm("casement", GX - 2.5, GX + 2.5, WIN["sill"], WIN["top"], wd0, wd1, scan("window oak", "dark_wood", size=1.0, bright=0.45, rough=(0.4, 0.7)), 0.4)
boolean_cut(casement, box("cut", M(GX - 5), M(GX + 5), M(wd0 + 4), M(wd1 - 4), M(WIN["sill"] + 4), M(WIN["top"] - 4), IRON))
box_cm("leaded glass", GX - 0.2, GX + 0.2, WIN["sill"] + 4, WIN["top"] - 4, wd0 + 4, wd1 - 4, LEADED)
for k in range(-12, 13):
    for e in (-1, 1):
        a_ = (WIN["d"] + k * 9 - 70 * e, WIN["sill"] - 30); b_ = (WIN["d"] + k * 9 + 70 * e, WIN["top"] + 30)
        # (each came clipped to the glass)
        t0, t1 = 0.0, 1.0
        for p, q in ((-(b_[0] - a_[0]), a_[0] - (wd0 + 4)), (b_[0] - a_[0], (wd1 - 4) - a_[0]), (-(b_[1] - a_[1]), a_[1] - (WIN["sill"] + 4)), (b_[1] - a_[1], (WIN["top"] - 4) - a_[1])):
            if p == 0: continue
            r = q / p
            if p < 0: t0 = max(t0, r)
            else: t1 = min(t1, r)
        if t0 < t1:
            arch(rod("came", P(GX - 0.3, a_[1] + (b_[1] - a_[1]) * t0, a_[0] + (b_[0] - a_[0]) * t0), P(GX - 0.3, a_[1] + (b_[1] - a_[1]) * t1, a_[0] + (b_[0] - a_[0]) * t1), M(0.35), LEAD, verts=6))
lamp_garden = garden(P(3200, 500, 900), [("island_tree_01", 1400, -900, 10.0, 0.3), ("island_tree_02", 2200, 1700, 12.0, 1.4), ("tree_small_02", 800, -700, 5.0, 2.2)],
                     (X1 + 40, 3500, -1500, 2500, -40), P(2600, 700, 300), sky_size=45)

# ── beyond the door: the hall, its light ───────────────────────────────────
HALL_FLOOR = scan("hall floor", "checkered_pavement_tiles", size=1.6, tint=(0.95, 0.9, 0.82), bright=0.6, rough=(0.3, 0.7), bump=0.4)
HALL_WALL = scan("hall wall", "white_plaster_rough_01", size=2.4, tint=(0.75, 0.82, 0.72), bright=0.8, sat=0.4, rough=(0.8, 0.95), bump=0.4)
box_cm("hall floor", -320, 320, -6, 0, -260, -22, HALL_FLOOR)
box_cm("hall far wall", -320, 320, 0, 320, -280, -260, HALL_WALL)
box_cm("hall ceiling", -320, 320, 300, 310, -260, -22, CEILING)
box_cm("hall dado", -320, 320, 0, 100, -262, -258, PAINT)
hall_l = lamp("the hall's light", "AREA", tuple(P(15, 250, -140)), aim=tuple(P(15, 0, -60)), energy=float(arg("--hall", "160")), colour=(1.0, 0.66, 0.36), size=1.4, size_y=1.0)
hall_l.visible_camera = False

# ── light ──────────────────────────────────────────────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
lamp("the moon", "SUN", tuple(P(2600, 1700, 700)), aim=tuple(P(0, 0, 260)), energy=float(arg("--moon", "3.2")), colour=(0.55, 0.68, 1.0), angle=math.radians(1.2))
sky_l = lamp("sky through the window", "AREA", tuple(P(X1 + 20, 175, WIN["d"])), aim=tuple(P(0, 40, WIN["d"] - 40)), energy=float(arg("--sky", "14")), colour=(0.5, 0.62, 0.95), size=0.9, size_y=1.3)
sky_l.visible_camera = False; sky_l.visible_transmission = False; sky_l.visible_glossy = False
fill_l = lamp("fill", "AREA", tuple(P(-60, 220, 470)), aim=tuple(P(20, 90, 0)), energy=float(arg("--fill", "12")), colour=(0.8, 0.85, 1.0), size=1.6)
fill_l.visible_camera = False; fill_l.visible_glossy = False
eye_fill(float(arg("--eyefill", "17")))                # (the halls' fill: nothing the eye sees falls to black)
LIGHTS = [Light("lit", [])]
clear_glass()
air = room_haze(X0, X1, -5, D1, TOP, float(arg("--haze", "0")))

# ── what the game is told ──────────────────────────────────────────────────
LAYOUT.pane([P(GX, y, d) for d, y in ((wd1 - 4, WIN["sill"] + 4), (wd0 + 4, WIN["sill"] + 4), (wd0 + 4, WIN["top"] - 4), (wd1 - 4, WIN["top"] - 4))])
LAYOUT.glow("door", P((DOOR["x0"] + DOOR["x1"]) / 2, 110, -30), 160)
LAYOUT.dust([P(X1, WIN["top"], wd0), P(X1, WIN["sill"], wd1), P(-140, 0, WIN["d"] - 40), P(60, 0, WIN["d"] + 60)])
LAYOUT.write()

cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "1.7")))
scene.cycles.volume_bounces = 1
GLOSSY = ()                # (what keeps its shine: nothing here)
finish(scene, SAMPLES, keep_gloss=GLOSSY)
plates = one_light(LIGHTS[0])
passes(scene, OUT, set(plates), air, variants=plates)
print("ROOM_DONE")
