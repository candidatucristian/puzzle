# Room XII, under the roof: the archive, built in three dimensions and rendered
# with Cycles, seen low, from under the eaves, down the length of the attic.
#
# Bare boards on the walls, wide boards underfoot, the roof pitched over on its
# rafters, the rain on it. Old charts and instrument cases kept under the
# eaves: charts rolled in a barrel and spread on a plan chest, a theodolite's
# box and a sextant's, trunks — one standing open — shelves of document boxes
# and ledgers standing out in the room, an oil lantern burning on a table
# under the small leaded window in the far gable.
#
# One plate (lights-1) and where it all fell in the picture
# (src/levels/house/rooms/Room12.json).
#
#   blender -b --factory-startup -P art/blender/room_archive.py -- [--samples 700] [--width 2560]

import bpy, bmesh, math, os, sys, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *
from room_attic import *

OUT = os.path.join(ROOT, ".artifacts/room-archive")
os.makedirs(OUT, exist_ok=True)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")
SAMPLES = int(arg("--samples", "700"))
WIDTH = int(arg("--width", "2560"))
RNG = random.Random(1912)

X0, X1, D1, EAVES, RIDGE = -240, 240, 720, 105, 345
EYE = (float(arg("--ex", "-120")), float(arg("--ey", "132")), float(arg("--ed", "40")))
LOOK = (float(arg("--lx", "20")), float(arg("--ly", "128")), float(arg("--ld", "720")))
scene, HEIGHT = stage(WIDTH, eye=EYE, look=LOOK, lens=float(arg("--lens", "22")))
WIN = dict(x=10, hw=38, sill=136, top=232)

BOARDS = scan("bare boards", "dark_wooden_planks", size=1.4, tint=(0.75, 0.62, 0.5), bright=0.5, rough=(0.55, 0.85), bump=0.6, upright=True)
FLOOR = scan("wide boards", "wood_floor_worn", size=2.6, tint=(0.7, 0.58, 0.46), bright=0.42, rough=(0.5, 0.85), bump=0.6)
ROOF = scan("roof boards", "dark_wooden_planks", size=1.6, tint=(0.62, 0.52, 0.44), bright=0.38, rough=(0.6, 0.9), bump=0.6)
RAFTER = scan("rafter", "dark_wood", size=1.4, tint=(0.62, 0.48, 0.36), bright=0.4, rough=(0.55, 0.85), bump=0.7)
OAK = scan("oak", "dark_wood", size=1.0, tint=(0.82, 0.62, 0.44), bright=0.5, rough=(0.35, 0.6), bump=0.3, upright=True)
PINE = scan("pine", "wood_floor_worn", size=0.8, tint=(0.85, 0.72, 0.55), bright=0.55, rough=(0.5, 0.8), bump=0.4)
CANVAS = scan("trunk canvas", "fabric_leather_02", size=0.4, tint=(0.36, 0.3, 0.22), bright=0.6, sat=0.0, rough=(0.6, 0.9), bump=0.5)
LEATHER = scan("strap leather", "brown_leather", size=0.3, tint=(0.45, 0.3, 0.2), bright=0.5, rough=(0.5, 0.8), bump=0.4)
BRASS = aged_metal("brass", (0.58, 0.41, 0.18), (0.08, 0.06, 0.03), rough=(0.25, 0.5), scale=30, tarnish=0.6)
TIN = aged_metal("lantern tin", (0.3, 0.06, 0.04), (0.08, 0.03, 0.02), rough=(0.35, 0.6), scale=20, tarnish=0.5)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
LEADED = plain("old glass", (0.75, 0.85, 0.72), rough=0.12, transmission=1.0, ior=1.2)
LEAD = plain("lead", (0.06, 0.065, 0.07), rough=0.5, metal=0.7)
CHART = picture("chart", os.path.join(DRAWN, "cabin-chart.png"), rough=0.9)
spine_mat = bound(picture("spines", os.path.join(DRAWN, "spines.png"), rough=0.5, coat=0.15, bump=0.3))
COVERS = cover_materials()
PAGES = plain("pages", (0.3, 0.26, 0.19), rough=0.9)
CARD = scan("archive card", "fabric_leather_02", size=0.5, tint=(0.32, 0.26, 0.18), bright=0.6, sat=0.0, rough=(0.7, 0.9), bump=0.2)
LAYOUT = Layout("Room12")

far = attic_shell(X0, X1, D1, EAVES, RIDGE, FLOOR, BOARDS, ROOF, RAFTER)
PANE = leaded_window_in(far, WIN["x"], WIN["hw"], WIN["sill"], WIN["top"], D1, 25, OAK, LEAD, LEADED)
# (the garden far below: from up here only the tops of its trees, and the sky)
garden(P(500, 900, 3800), [("island_tree_01", -800, 2000, 13.0, 0.3), ("island_tree_02", 900, 2700, 15.0, 1.4), ("tree_small_02", -300, 1500, 9.0, 2.2)],
       (-2500, 2500, D1 + 40, 3300, -900), P(200, 600, 4200), sky_size=45)

# ── the table under the window, the lantern burning on it ─────────────────
turned_table(dict(x0=-50, x1=60, d0=D1 - 90, d1=D1 - 36, h=76), OAK)
lantern_l, FLAME, LANTERN_AT = oil_lantern(28, 76, D1 - 62, TIN, plain("lantern glass", (0.95, 0.9, 0.85), rough=0.03, transmission=1.0, ior=1.5), energy=float(arg("--lantern", "16")))
for k in range(3):
    o = book(RNG, 0, 0, 0, 4.5, 30 - k * 2, 22, spine_mat, COVERS, PAGES); o.rotation_euler = (math.pi / 2, 0, 0.1 + k * 0.2); o.location = P(-22, 76 + 2.3 + k * 4.6, D1 - 64)

# ── the plan chest, a chart spread on it; charts rolled in a barrel ────────
def plan_chest():
    box_cm("plan chest", -60, 60, 0, 84, -40, 40, OAK, 0.8, keep=False)
    for k in range(6):
        y = 6 + k * 12.5
        box_cm("drawer", -57, 57, y, y + 11.5, -41, -40, OAK, 0.4, keep=False)
        for e in (-1, 1): box_cm("drawer pull", e * 30 - 4, e * 30 + 4, y + 5, y + 7, -42.2, -41, BRASS, 0.3, keep=False)
    box_cm("plan chest top", -62, 62, 84, 87, -42, 42, OAK, 0.8, keep=False)
    chart = card("chart spread", [P(-48, 87.2, -32), P(46, 87.2, -36), P(50, 87.2, 30), P(-44, 87.2, 34)], CHART)
    for (x, d) in ((-46, -30), (44, 26)):
        lathe("chart weight", [(0, 0), (0.025, 0), (0.025, 0.03), (0.01, 0.04), (0, 0.04)], BRASS, at=tuple(P(x, 87.2, d)), steps=16)
assembled("plan chest", plan_chest, at=(-150, 0, 420), turn=math.radians(78))
lathe("barrel", [(0, 0), (0.22, 0), (0.26, 0.3), (0.27, 0.42), (0.26, 0.54), (0.22, 0.84), (0.0, 0.84)], scan("barrel staves", "dark_wood", size=0.4, tint=(0.7, 0.55, 0.4), bright=0.5, rough=(0.5, 0.8)), at=tuple(P(150, 0, 520)), steps=40)
for z in (0.06, 0.42, 0.78):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.24 + 0.03 * (z == 0.42), minor_radius=0.008, location=tuple(P(150, z * 100, 520)))
    bpy.context.active_object.data.materials.append(aged_metal("hoop", (0.06, 0.06, 0.06), (0.06, 0.03, 0.02), rough=(0.5, 0.8)))
ROLLED = paper("rolled chart", (0.7, 0.64, 0.5), 0.5)
for k in range(7):
    a = RNG.uniform(0, math.tau); r = RNG.uniform(3, 14); t = RNG.uniform(-0.2, 0.2)
    c = P(150 + math.cos(a) * r, 0, 520 + math.sin(a) * r)
    cy = cylinder("rolled chart", 0, 0, 0, M(RNG.uniform(100, 130)), M(RNG.uniform(2.2, 3.6)), ROLLED, verts=20); cy.location = c + Vector((0, 0, M(4))); cy.rotation_euler = (t, RNG.uniform(-0.2, 0.2), 0)

# ── instrument cases, trunks ───────────────────────────────────────────────
MAHOG = scan("case mahogany", "rosewood_veneer1", size=0.4, tint=(0.62, 0.38, 0.26), bright=0.45, sat=0.9, rough=(0.3, 0.55), bump=0.2)
def case(name, w, dp, h, at, turn):
    def build():
        box_cm(name, -w / 2, w / 2, 0, h, -dp / 2, dp / 2, MAHOG, 0.8, keep=False)
        box_cm("case lid line", -w / 2 - 0.1, w / 2 + 0.1, h * 0.7, h * 0.7 + 0.4, -dp / 2 - 0.1, dp / 2 + 0.1, plain("seam", (0.03, 0.02, 0.015), rough=0.9), keep=False)
        for x in (-w / 2, w / 2):
            for y in (0, h - 3):
                for d in (-dp / 2, dp / 2): box_cm("brass corner", x - 1.5, x + 1.5, y, y + 3, d - 1.5, d + 1.5, BRASS, 0.4, keep=False)
        box_cm("case handle", -5, 5, h, h + 1.6, -1, 1, LEATHER, 0.5, keep=False)
        box_cm("case catch", -2, 2, h * 0.62, h * 0.78, -dp / 2 - 0.6, -dp / 2, BRASS, 0.3, keep=False)
    assembled(name, build, at=at, turn=turn)
case("theodolite case", 34, 30, 46, (170, 0, 330), math.radians(-20))
case("sextant case", 36, 32, 18, (165, 46, 334), math.radians(-12))
case("level case", 70, 20, 16, (-160, 0, 250), math.radians(80))
steamer_trunk("trunk", 92, 54, 62, (-150, 0, 610), math.radians(70), CANVAS, LEATHER, BRASS)
steamer_trunk("open trunk", 84, 50, 56, (130, 0, 230), math.radians(-28), CANVAS, LEATHER, BRASS, lid=1.9)
for k in range(5):
    o = book(RNG, 0, 0, 0, 5.5, 34, 26, spine_mat, COVERS, PAGES); o.rotation_euler = (math.pi / 2, 0, -0.5 + k * 0.08); o.location = P(132, 44 + 2.8 + k * 5.6, 228)

# ── shelves of boxes and ledgers, standing out in the room ─────────────────
def shelving():
    for x in (-62, 62):
        for d in (-18, 18): box_cm("shelf post", x - 2.5, x + 2.5, 0, 200, d - 2.5, d + 2.5, PINE, 0.5, keep=False)
    for y in (8, 52, 96, 140, 184):
        box_cm("shelf", -64, 64, y - 2.5, y, -20, 20, PINE, 0.4, keep=False)
        x = -58
        while x < 54:
            kind = RNG.random()
            if kind < 0.45:
                w = RNG.uniform(18, 28); hh = RNG.uniform(22, 32)
                box_cm("document box", x, x + w, y, y + hh, -16, 16, CARD, 0.6, keep=False)
                box_cm("box label", x + w * 0.25, x + w * 0.75, y + hh * 0.55, y + hh * 0.75, -16.1, -16, plain(f"label {x:.0f}{y}", (0.75, 0.7, 0.56), rough=0.85), keep=False)
                x += w + 1.5
            elif kind < 0.85:
                for k in range(RNG.randint(3, 6)):
                    w = RNG.uniform(4.5, 7)
                    if x + w > 58: break
                    o = book(RNG, 0, 0, 0, w, RNG.uniform(30, 38), 28, spine_mat, COVERS, PAGES); o.rotation_euler = (0, 0, -math.pi / 2); o.location = P(x + w / 2, y + o.dimensions.z * 50, 0)
                    x += w + 0.3
                x += 2
            else:
                x += RNG.uniform(10, 20)
assembled("shelving", shelving, at=(70, 0, 430), turn=math.radians(-90))

# ── light ──────────────────────────────────────────────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
lamp("the moon", "SUN", tuple(P(400, 2000, 3200)), aim=tuple(P(0, 0, 600)), energy=float(arg("--moon", "2.0")), colour=(0.55, 0.68, 1.0), angle=math.radians(1.5))
sky_l = lamp("sky through the window", "AREA", tuple(P(WIN["x"], 185, D1 + 30)), aim=tuple(P(WIN["x"], 60, 400)), energy=float(arg("--sky", "10")), colour=(0.5, 0.62, 0.95), size=0.7, size_y=0.9)
sky_l.visible_camera = False; sky_l.visible_transmission = False; sky_l.visible_glossy = False
fill_l = lamp("fill", "AREA", tuple(P(-100, 200, 30)), aim=tuple(P(40, 60, D1)), energy=float(arg("--fill", "20")), colour=(0.8, 0.85, 1.0), size=1.4)
fill_l.visible_camera = False; fill_l.visible_glossy = False
eye_fill(float(arg("--eyefill", "5")))                # (the halls' fill: nothing the eye sees falls to black)
for (at_, aim) in ((P(0, 220, 300), P(0, 300, 300)), (P(0, 200, 560), P(0, 120, D1))):
    wash = lamp("on the walls", "AREA", tuple(at_), aim=tuple(aim), energy=float(arg("--wash", "10")), colour=(0.82, 0.86, 1.0), size=1.0)
    wash.visible_camera = False; wash.visible_glossy = False
LIGHTS = [Light("lantern", [lantern_l], [FLAME])]
clear_glass()
air = room_haze(X0, X1, -30, D1, RIDGE, float(arg("--haze", "0")))

LAYOUT.pane(PANE)
LAYOUT.glow("lantern", LANTERN_AT, 80)
LAYOUT.dust([P(WIN["x"] - WIN["hw"], WIN["top"], D1), P(WIN["x"] + WIN["hw"], WIN["sill"], D1), P(-60, 0, 480), P(80, 0, 640)])
LAYOUT.write()

cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "3.45")))
scene.cycles.volume_bounces = 1
GLOSSY = ()                # (what keeps its shine: nothing here)
finish(scene, SAMPLES, keep_gloss=GLOSSY)
plates = one_light(LIGHTS[0])
passes(scene, OUT, set(plates), air, variants=plates)
print("ROOM_DONE")
