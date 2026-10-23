# Room XIII, under the roof: the workshop, built in three dimensions and
# rendered with Cycles, seen from beside the bench across to the hearth.
#
# The last room in the house, as far as the plans go. Bare boards, the roof on
# its rafters. Close at hand the heavy bench standing out from the wall, its
# vice, a plane and its shavings, chisels laid out, a mallet, a lantern
# burning; saws and squares hung on a board behind it. In the far gable a
# fireplace of rough stone — the fire cold, but the hearth swept, a brush and
# shovel by it — a chair drawn up to it, and beside it a small sash window, the
# rain on it.
#
# One plate (lights-1) and where it all fell in the picture
# (src/levels/house/rooms/Room13.json).
#
#   blender -b --factory-startup -P art/blender/room_workshop.py -- [--samples 700] [--width 2560]

import bpy, bmesh, math, os, sys, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *
from room_attic import *

OUT = os.path.join(ROOT, ".artifacts/room-workshop")
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "700"))
WIDTH = int(arg("--width", "2560"))
RNG = random.Random(1913)

X0, X1, D1, EAVES, RIDGE = -240, 240, 600, 110, 350
EYE = (float(arg("--ex", "175")), float(arg("--ey", "160")), float(arg("--ed", "60")))
LOOK = (float(arg("--lx", "-60")), float(arg("--ly", "112")), float(arg("--ld", "600")))
scene, HEIGHT = stage(WIDTH, eye=EYE, look=LOOK, lens=float(arg("--lens", "22")))
WIN = dict(x=80, hw=40, sill=112, top=214)
FIRE = dict(x0=-160, x1=-40, out=36)              # the stone breast in the far gable
BENCH = dict(x0=96, x1=212, d0=150, d1=350, h=86)

BOARDS = scan("bare boards", "dark_wooden_planks", size=1.4, tint=(0.75, 0.62, 0.5), bright=0.5, rough=(0.55, 0.85), bump=0.6, upright=True)
FLOOR = scan("wide boards", "wood_floor_worn", size=2.6, tint=(0.72, 0.6, 0.48), bright=0.45, rough=(0.5, 0.85), bump=0.6)
ROOF = scan("roof boards", "dark_wooden_planks", size=1.6, tint=(0.62, 0.52, 0.44), bright=0.38, rough=(0.6, 0.9), bump=0.6)
RAFTER = scan("rafter", "dark_wood", size=1.4, tint=(0.62, 0.48, 0.36), bright=0.4, rough=(0.55, 0.85), bump=0.7)
STONE = scan("rough stone", "mossy_stone_wall", size=1.2, tint=(0.62, 0.6, 0.56), bright=0.55, sat=0.2, rough=(0.7, 0.95), bump=0.9)
HEARTH_STONE = scan("hearth stone", "old_sandstone_02", size=0.8, tint=(0.75, 0.7, 0.62), bright=0.5, sat=0.5, rough=(0.6, 0.9), bump=0.5)
OAK = scan("oak", "dark_wood", size=1.0, tint=(0.82, 0.62, 0.44), bright=0.5, rough=(0.4, 0.7), bump=0.4, upright=True)
BEECH = scan("bench beech", "wood_floor_worn", size=1.0, tint=(0.9, 0.74, 0.56), bright=0.6, rough=(0.5, 0.8), bump=0.5)
IRON = aged_metal("iron", (0.05, 0.05, 0.05), (0.05, 0.03, 0.02), rough=(0.4, 0.75), scale=18, tarnish=0.55)
STEEL = aged_metal("steel", (0.32, 0.32, 0.33), (0.1, 0.06, 0.03), rough=(0.3, 0.6), scale=30, tarnish=0.45)
BRASS = aged_metal("brass", (0.58, 0.41, 0.18), (0.08, 0.06, 0.03), rough=(0.25, 0.5), scale=30, tarnish=0.6)
TIN = aged_metal("lantern tin", (0.06, 0.12, 0.08), (0.03, 0.04, 0.03), rough=(0.35, 0.6), scale=20, tarnish=0.5)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
FRAME = plain("window paint", (0.78, 0.77, 0.72), rough=0.55)
LAYOUT = Layout("Room13")

far = attic_shell(X0, X1, D1, EAVES, RIDGE, FLOOR, BOARDS, ROOF, RAFTER)
SASHES = sash_window_back(far, WIN["x"], WIN["hw"], WIN["sill"], WIN["top"], D1, 25, FRAME, GLASS, BOARDS, OAK, bars=(0.5,))
garden(P(-400, 900, 3800), [("island_tree_01", -700, 2000, 13.0, 0.3), ("island_tree_02", 1000, 2700, 15.0, 1.4), ("tree_small_02", 300, 1500, 9.0, 2.2)],
       (-2500, 2500, D1 + 40, 3300, -900), P(0, 600, 4200), sky_size=45)

# ── the fireplace of rough stone in the far gable, swept, cold ────────────
f = FIRE; FD = D1 - f["out"]
breast = box_cm("chimney breast", f["x0"], f["x1"], 0, RIDGE + 40, FD, D1 + 1, STONE)
fb = dict(x0=f["x0"] + 26, x1=f["x1"] - 26, y1=74)
boolean_cut(breast, box("cut", M(fb["x0"]), M(fb["x1"]), M(FD - 10), M(D1 - 8), M(-1), M(fb["y1"]), IRON))
SOOT = plain("soot", (0.015, 0.012, 0.01), rough=0.95)
box_cm("fire back", fb["x0"], fb["x1"], 0, fb["y1"], D1 - 12, D1 - 8, SOOT)
for (a, b) in ((fb["x0"], fb["x0"] + 3), (fb["x1"] - 3, fb["x1"])): box_cm("fire cheek", a, b, 0, fb["y1"], FD, D1 - 8, SOOT)
box_cm("fire throat", fb["x0"], fb["x1"], fb["y1"] - 3, fb["y1"], FD, D1 - 8, SOOT)
box_cm("lintel", fb["x0"] - 10, fb["x1"] + 10, fb["y1"], fb["y1"] + 20, FD - 4, FD + 10, scan("lintel oak", "dark_wood", size=0.8, tint=(0.55, 0.42, 0.32), bright=0.4, rough=(0.6, 0.9), bump=0.6), 1.5)
box_cm("mantel", f["x0"] - 4, f["x1"] + 4, 112, 117, FD - 18, FD, OAK, 1.0)
box_cm("hearth", f["x0"] - 10, f["x1"] + 10, 0, 3, FD - 52, FD, HEARTH_STONE, 0.8)
gd = D1 - 22
for k in range(4): rod("fire dog bar", P(fb["x0"] + 16, 14 + k * 4, gd - 6), P(fb["x1"] - 16, 14 + k * 4, gd - 6), M(0.6), IRON, verts=8)
for x in (fb["x0"] + 16, fb["x1"] - 16):
    rod("fire dog", P(x, 0, gd - 16), P(x, 26, gd - 6), M(1.2), IRON, verts=10)
    sphere("fire dog knob", tuple(P(x, 27, gd - 6)), M(2.0), BRASS)
# a hearth brush and a shovel, and on the mantel an oil can, a tin box
rod("brush handle", P(f["x1"] + 14, 3, FD - 30), P(f["x1"] + 10, 62, FD - 8), M(1.0), OAK, verts=10)
lathe("brush head", [(0, 0), (0.05, 0), (0.045, 0.1), (0.02, 0.12), (0, 0.12)], plain("bristle", (0.12, 0.1, 0.08), rough=0.95), at=tuple(P(f["x1"] + 14, 3, FD - 30)), steps=20).scale = (1.0, 0.45, 1.0)
rod("shovel handle", P(f["x1"] + 22, 3, FD - 24), P(f["x1"] + 20, 60, FD - 6), M(0.7), IRON, verts=8)
box_cm("shovel blade", f["x1"] + 16, f["x1"] + 28, 0.5, 2, FD - 36, FD - 22, IRON, 0.3)
lathe("oil can", [(0, 0), (0.05, 0), (0.05, 0.06), (0.02, 0.09), (0.008, 0.16), (0, 0.16)], STEEL, at=tuple(P(f["x0"] + 18, 117, FD - 9)), steps=24)
box_cm("tin box", f["x1"] - 34, f["x1"] - 14, 117, 125, FD - 14, FD - 4, plain("tin box", (0.22, 0.08, 0.06), rough=0.45, metal=0.6), 0.6)
import_model("gallinera_chair", height=M(100), at=tuple(P(-60, 0, FD - 110)), rot=math.pi - 0.6)
rug(-180, 20, FD - 180, FD - 40, rug_material("rug", f"{ASSETS}/textures/persian_rug.jpg", tint=(0.8, 0.55, 0.42), sat=0.7, value=0.36))

# ── the bench close at hand, its tools, the lantern ───────────────────────
b = BENCH
for x in (b["x0"] + 6, b["x1"] - 6):
    for d in (b["d0"] + 6, b["d1"] - 6): box_cm("bench leg", x - 5, x + 5, 0, b["h"] - 8, d - 5, d + 5, BEECH, 0.8)
for x in (b["x0"] + 6, b["x1"] - 6): box_cm("bench rail", x - 3, x + 3, 16, 24, b["d0"] + 6, b["d1"] - 6, BEECH, 0.5)
box_cm("bench shelf", b["x0"] + 4, b["x1"] - 4, 22, 25, b["d0"] + 8, b["d1"] - 8, BEECH, 0.5)
box_cm("bench top", b["x0"], b["x1"], b["h"] - 8, b["h"], b["d0"], b["d1"], BEECH, 1.0)
box_cm("tool well", b["x0"] + 70, b["x1"] - 4, b["h"] - 3, b["h"] - 2.5, b["d0"] + 10, b["d1"] - 10, BEECH, 0.2)
# the vice at its near end: a thick jaw, its wooden screw and handle
box_cm("vice jaw", b["x0"] + 20, b["x0"] + 58, b["h"] - 22, b["h"], b["d0"] - 8, b["d0"] - 1, BEECH, 1.0)
rod("vice screw", P(b["x0"] + 39, b["h"] - 11, b["d0"] - 22), P(b["x0"] + 39, b["h"] - 11, b["d0"] + 6), M(2.4), OAK, verts=24)
rod("vice handle", P(b["x0"] + 22, b["h"] - 11, b["d0"] - 20), P(b["x0"] + 56, b["h"] - 11, b["d0"] - 20), M(1.1), OAK, verts=12)
for e in (-1, 1): sphere("handle knob", tuple(P(b["x0"] + 39 + e * 17, b["h"] - 11, b["d0"] - 20)), M(1.8), OAK)
# a plane and its shavings; chisels laid out; a mallet; a square
def plane():
    box_cm("plane body", -12, 12, 0, 7, -3.5, 3.5, scan("plane beech", "dark_wood", size=0.4, tint=(0.8, 0.6, 0.4), bright=0.6, rough=(0.4, 0.7)), 1.0, keep=False)
    box_cm("plane iron", -1, 1, 4, 11, -3, 3, STEEL, 0.2, keep=False)
    tube("plane tote", [(0.04, 0.07), (0.06, 0.11), (0.09, 0.1), (0.1, 0.07)], 0.012, scan("tote", "dark_wood", size=0.3, bright=0.5), at=tuple(P(0, 0, 0)), rot=0.0)
assembled("plane", plane, at=(150, b["h"], 230), turn=math.radians(70))
SHAVING = scan("shaving", "wood_floor_worn", size=0.2, tint=(0.95, 0.82, 0.62), bright=0.85, rough=(0.6, 0.85), bump=0.2)
for k in range(26):
    on_bench = k < 12
    c = P(RNG.uniform(120, 190), b["h"] + 0.4, RNG.uniform(200, 300)) if on_bench else P(RNG.uniform(80, 230), 0.4, RNG.uniform(130, 380))
    # (a curl of wood: a thin ribbon wound a turn and a half, tighter as it goes)
    r = RNG.uniform(1.4, 3.0); turns = RNG.uniform(1.1, 1.8); n = 18
    cu = bpy.data.curves.new("shaving", "CURVE"); cu.dimensions = "3D"; cu.extrude = M(RNG.uniform(0.6, 1.1)); cu.bevel_depth = 0.0
    spl = cu.splines.new("POLY"); spl.points.add(n - 1)
    for i, pt in enumerate(spl.points):
        t = i / (n - 1); a_ = t * turns * math.tau; rr = r * (1 - 0.55 * t)
        pt.co = (M(math.cos(a_) * rr), M(t * 1.2), M(math.sin(a_) * rr + r), 1)
    sh = link(bpy.data.objects.new("shaving", cu)); sh.data.materials.append(SHAVING)
    sh.location = c; sh.rotation_euler = (RNG.uniform(-0.4, 0.4), RNG.uniform(-0.4, 0.4), RNG.uniform(0, math.tau))
for k in range(4):
    x = 106 + k * 7
    rod("chisel blade", P(x, b["h"] + 0.8, 330), P(x, b["h"] + 0.8, 314 - k * 2), M(0.7), STEEL, verts=8)
    rod("chisel handle", P(x, b["h"] + 1.2, 314 - k * 2), P(x, b["h"] + 1.2, 300 - k * 2), M(1.3), scan(f"chisel handle {k}", "dark_wood", size=0.2, bright=0.6, rough=(0.4, 0.7)), verts=12)
cylinder("mallet head", 0, 0, -M(7), M(7), M(4), BEECH, verts=20).location = P(182, b["h"] + 4, 170)
bpy.data.objects["mallet head"].rotation_euler = (math.pi / 2, 0, 0.3)
rod("mallet handle", P(182, b["h"] + 3, 170), P(196, b["h"] + 3, 200), M(1.1), OAK, verts=10)
lantern_l, FLAME, LANTERN_AT = oil_lantern(110, b["h"], 330, TIN, plain("lantern glass", (0.95, 0.9, 0.85), rough=0.03, transmission=1.0, ior=1.5), energy=float(arg("--lantern", "15")))
# the board behind it, hung with saws and squares
box_cm("tool board", X1 - 4, X1, 40, EAVES, b["d0"], b["d1"], BOARDS)
for k, (d, l) in enumerate(((180, 60), (240, 50), (300, 42))):
    box_cm("saw blade", X1 - 5.5, X1 - 5, EAVES - 14 - l, EAVES - 14, d, d + l * 0.32, STEEL, 0.2)
    box_cm("saw handle", X1 - 7, X1 - 4, EAVES - 24, EAVES - 10, d - 2, d + 12, scan(f"saw handle {k}", "dark_wood", size=0.3, bright=0.55), 1.2)
    cylinder("peg", M(X1 - 6), M(d + 4), M(EAVES - 12), M(EAVES - 10), M(0.6), OAK, verts=8).rotation_euler = (0, math.pi / 2, 0)
box_cm("square stock", X1 - 6, X1 - 4, 60, 66, 330, 345, OAK, 0.4)
box_cm("square blade", X1 - 5.4, X1 - 5, 60, 90, 342, 345, STEEL, 0.1)
import_model("wooden_stool_01", height=M(62), at=tuple(P(80, 0, 250)), rot=0.4)

# ── light ──────────────────────────────────────────────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
lamp("the moon", "SUN", tuple(P(500, 1900, 3200)), aim=tuple(P(60, 0, 420)), energy=float(arg("--moon", "2.2")), colour=(0.55, 0.68, 1.0), angle=math.radians(1.5))
sky_l = lamp("sky through the window", "AREA", tuple(P(WIN["x"], 165, D1 + 30)), aim=tuple(P(WIN["x"], 50, 350)), energy=float(arg("--sky", "10")), colour=(0.5, 0.62, 0.95), size=0.7, size_y=0.9)
sky_l.visible_camera = False; sky_l.visible_transmission = False; sky_l.visible_glossy = False
fill_l = lamp("fill", "AREA", tuple(P(200, 200, 20)), aim=tuple(P(-60, 60, D1)), energy=float(arg("--fill", "20")), colour=(0.8, 0.85, 1.0), size=1.4)
fill_l.visible_camera = False; fill_l.visible_glossy = False
eye_fill(float(arg("--eyefill", "8")))                # (the halls' fill: nothing the eye sees falls to black)
for (at_, aim) in ((P(-60, 220, 380), P(-100, 120, D1)), (P(0, 220, 250), P(0, 300, 250))):
    wash = lamp("on the walls", "AREA", tuple(at_), aim=tuple(aim), energy=float(arg("--wash", "10")), colour=(0.82, 0.86, 1.0), size=1.0)
    wash.visible_camera = False; wash.visible_glossy = False
LIGHTS = [Light("lantern", [lantern_l], [FLAME])]
clear_glass()
air = room_haze(X0, X1, -30, D1, RIDGE, float(arg("--haze", "0")))

for pane in SASHES: LAYOUT.pane(pane)
LAYOUT.glow("lantern", LANTERN_AT, 80)
LAYOUT.dust([P(WIN["x"] - WIN["hw"], WIN["top"], D1), P(WIN["x"] + WIN["hw"], WIN["sill"], D1), P(-10, 0, 400), P(120, 0, 540)])
LAYOUT.write()

cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "2.8")))
scene.cycles.volume_bounces = 1
GLOSSY = ()                # (what keeps its shine: nothing here)
finish(scene, SAMPLES, keep_gloss=GLOSSY)
plates = one_light(LIGHTS[0])
passes(scene, OUT, set(plates), air, variants=plates)
print("ROOM_DONE")
