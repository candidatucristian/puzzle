# Room VII, the laboratory — Silas's — built in three dimensions and rendered
# with Cycles, seen across his bench.
#
# Stone walls, dark boards underfoot, beams overhead. In the middle of the
# room, standing free, his bench as he left it: an oil lamp burning at its left
# end, a retort on its stand and a rack of test tubes at the back, five
# graduated bottles of coloured liquid in a row across it — fluorine, oxygen,
# carbon, uranium, sulfur, as the puzzle has them — a flask on a tripod over a
# Bunsen burner at its right end, the magnifying glass on a green cloth at the
# front; a stool. On the back wall the faded periodic table over a shelf of
# jars; the window, the moon, and under it the counter of sinks, a little
# walnut rack of phials at its end — yellow, empty, blue — a tag tied to it.
# Down the left-hand wall his bookcase, his notebook among the books (it is
# drawn a little way out of its shelf before it is opened: six frames, apart);
# a cabinet of glassware on the right.
#
# The lamp and the burner burn until the bottles are solved: a plate for each
# (lights-<on>), the notebook's frames for each, and where it all fell in the
# picture (src/levels/house/rooms/Room7.json). No chest is kept here.
#
#   blender -b --factory-startup -P art/blender/room_lab.py -- [--samples 700] [--width 2560] [--only plates,notebook]

import bpy, bmesh, math, os, sys, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *

OUT = os.path.join(ROOT, ".artifacts/room-lab")
os.makedirs(OUT, exist_ok=True)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")       # lab_boards.mjs, room_boards.mjs
SAMPLES = int(arg("--samples", "700"))
WIDTH = int(arg("--width", "2560"))
ONLY = set(arg("--only", "plates,notebook").split(","))
RNG = random.Random(1871)

# ── the room, and where we stand in it ─────────────────────────────────────
X0, X1, D1, TOP = -250, 250, 620, 300
EYE = (float(arg("--ex", "-128")), float(arg("--ey", "152")), float(arg("--ed", "70")))
LOOK = (float(arg("--lx", "70")), float(arg("--ly", "108")), float(arg("--ld", "540")))
scene, HEIGHT = stage(WIDTH, eye=EYE, look=LOOK, lens=float(arg("--lens", "24")))
WIN = dict(x=132, hw=62, sill=126, top=258)
BENCH = dict(x0=-118, x1=128, d0=296, d1=376, h=92)
SINKS = dict(x0=40, x1=X1, d0=D1 - 62, h=90)
BOOKCASE = dict(d0=380, d1=600, top=236)
NOTE = dict(row=2, d=470, w=4.2, h=25, depth=20, pull=4.0)   # his notebook: its shelf (from the top), where along it
CABINET = dict(d0=250, d1=420, depth=42, h=210)
# the bottles' shapes and liquids, as the puzzle has them: fluorine, oxygen,
# carbon, uranium, sulfur — (shape, height, width (cm), liquid, how full)
BOTTLES = [
    ("conical", 22, 13, (214, 230, 120), 0.55),
    ("round", 25, 12, (140, 196, 250), 0.4),
    ("jar", 18, 12, (34, 32, 36), 0.45),
    ("tall", 32, 7, (120, 255, 110), 0.7),
    ("beaker", 17, 11, (250, 214, 40), 0.62),
]
FRAMES = 6

# ── materials ──────────────────────────────────────────────────────────────
STONE = scan("stone walls", "sandstone_blocks_08", size=1.6, tint=(0.82, 0.74, 0.64), bright=0.55, sat=0.6, rough=(0.7, 0.95), bump=0.8)
PLANKS = scan("floor planks", "dark_wooden_planks", size=2.2, tint=(0.8, 0.68, 0.55), bright=0.6, rough=(0.4, 0.7), bump=0.5)
PLASTER = scan("ceiling", "plastered_wall_04", size=2.0, tint=(0.8, 0.78, 0.72), bright=0.7, sat=0.3, rough=(0.8, 0.95), bump=0.5)
BEAM = scan("beam", "dark_wood", size=1.4, tint=(0.6, 0.45, 0.35), bright=0.35, rough=(0.5, 0.8), bump=0.6)
OAK = scan("oak", "dark_wood", size=1.0, tint=(0.82, 0.62, 0.44), bright=0.5, rough=(0.3, 0.55), bump=0.3, coat=0.2, upright=True)
OAK_X = scan("oak across", "dark_wood", size=1.0, tint=(0.82, 0.62, 0.44), bright=0.48, rough=(0.3, 0.55), bump=0.3, coat=0.2)
WALNUT = scan("walnut", "rosewood_veneer1", size=0.5, tint=(0.6, 0.4, 0.3), bright=0.5, sat=0.9, rough=(0.2, 0.4), bump=0.2, coat=0.3)
SLATE = scan("slate", "castle_wall_slates", size=1.2, tint=(0.3, 0.32, 0.34), bright=0.32, sat=0.3, rough=(0.25, 0.5), bump=0.2)
TILES = scan("white tiles", "long_white_tiles", size=0.9, tint=(0.95, 0.95, 0.92), bright=0.85, sat=0.4, rough=(0.08, 0.3), bump=0.4, coat=0.3)
BRASS = aged_metal("brass", (0.6, 0.43, 0.19), (0.08, 0.06, 0.03), rough=(0.18, 0.42), scale=30, tarnish=0.5)
IRON = aged_metal("iron", (0.05, 0.05, 0.05), (0.04, 0.025, 0.018), rough=(0.45, 0.8), scale=18, tarnish=0.5)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
FIRECLAY = plain("fireclay", (0.78, 0.76, 0.7), rough=0.18, coat=0.6)
FRAME = plain("window paint", (0.8, 0.79, 0.74), rough=0.5)
CLOTH = scan("green cloth", "velour_velvet", size=0.3, tint=(0.1, 0.36, 0.16), bright=0.35, sat=1.0, rough=(0.75, 0.95), bump=0.3)
PERIODIC = picture("periodic table", os.path.join(DRAWN, "lab-periodic.png"), rough=0.9)
TAG = picture("phials' tag", os.path.join(DRAWN, "lab-tag.png"), rough=0.9)
spine_mat = bound(picture("spines", os.path.join(DRAWN, "spines.png"), rough=0.5, coat=0.15, bump=0.3))
COVERS = cover_materials()
PAGES = plain("pages", (0.3, 0.26, 0.19), rough=0.9)
def liquid(name, rgb, glow=0.0):
    m = plain(name, tuple(c / 255 for c in rgb), rough=0.04, transmission=0.65, ior=1.34)
    if glow:
        b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Emission Color"].default_value = (*[c / 255 for c in rgb], 1); b.inputs["Emission Strength"].default_value = glow
    return m
LAYOUT = Layout("Room7")

# ── the shell: stone, boards, beams ───────────────────────────────────────
box_cm("floor", X0 - 20, X1 + 20, -6, 0, -40, D1 + 20, PLANKS)
box_cm("ceiling", X0 - 20, X1 + 20, TOP, TOP + 10, -40, D1 + 20, PLASTER)
for d in range(60, D1, 80):
    box_cm("beam", X0, X1, TOP - 26, TOP, d - 11, d + 11, BEAM, 1.5)
for (x0, x1) in ((X0 - 25, X0), (X1, X1 + 25)):
    box_cm("wall", x0, x1, 0, TOP, -40, D1 + 20, STONE)
box_cm("door wall", X0 - 25, X1 + 25, 0, TOP, -65, -40, STONE)
back = box_cm("back wall", X0 - 25, X1 + 25, 0, TOP, D1, D1 + 35, STONE)
wx0, wx1 = WIN["x"] - WIN["hw"], WIN["x"] + WIN["hw"]
boolean_cut(back, box("cut", M(wx0), M(wx1), M(D1 - 10), M(D1 + 50), M(WIN["sill"]), M(WIN["top"]), IRON))

# ── the window, the counter of sinks under it, the phials' rack ───────────
REVEAL = 30
box_cm("reveal", wx0 - 3, wx0, WIN["sill"], WIN["top"], D1, D1 + REVEAL, PLASTER)
box_cm("reveal", wx1, wx1 + 3, WIN["sill"], WIN["top"], D1, D1 + REVEAL, PLASTER)
box_cm("reveal head", wx0 - 3, wx1 + 3, WIN["top"], WIN["top"] + 3, D1, D1 + REVEAL, PLASTER)
box_cm("sill", wx0 - 8, wx1 + 8, WIN["sill"] - 4, WIN["sill"], D1 - 6, D1 + REVEAL - 6, SLATE, 0.8)
mid = (WIN["sill"] + WIN["top"]) / 2
SASHES = []
for (y0, y1, dd) in ((WIN["sill"] + 1, mid + 2, D1 + REVEAL - 8), (mid - 2, WIN["top"] - 1, D1 + REVEAL - 13)):
    box_cm("sash", wx0 + 1, wx0 + 6, y0, y1, dd - 2.5, dd + 2.5, FRAME, 0.5); box_cm("sash", wx1 - 6, wx1 - 1, y0, y1, dd - 2.5, dd + 2.5, FRAME, 0.5)
    box_cm("sash", wx0 + 1, wx1 - 1, y0, y0 + 6, dd - 2.5, dd + 2.5, FRAME, 0.5); box_cm("sash", wx0 + 1, wx1 - 1, y1 - 6, y1, dd - 2.5, dd + 2.5, FRAME, 0.5)
    for fx in (1 / 3, 2 / 3):
        x = wx0 + (wx1 - wx0) * fx
        box_cm("glazing bar", x - 1.1, x + 1.1, y0 + 6, y1 - 6, dd - 1.5, dd + 1.5, FRAME, 0.3)
    box_cm("glass", wx0 + 5, wx1 - 5, y0 + 5, y1 - 5, dd - 0.3, dd + 0.3, GLASS)
    SASHES.append([P(x, y, dd) for x, y in ((wx0 + 5, y0 + 5), (wx1 - 5, y0 + 5), (wx1 - 5, y1 - 5), (wx0 + 5, y1 - 5))])
MOON_AT = P(900, 950, 3400)
garden(MOON_AT, [("island_tree_01", -500, 1800, 10.0, 0.3), ("island_tree_02", 1300, 2600, 12.0, 1.4), ("tree_small_02", 420, 1250, 5.0, 2.2)],
       (-2500, 2500, D1 + 45, 3300, -40), P(600, 800, 4200), sky_size=45)
sk = SINKS
box_cm("tiles", sk["x0"], sk["x1"], sk["h"], WIN["sill"] - 4, D1 - 0.6, D1, TILES)
box_cm("counter", sk["x0"] + 2, sk["x1"], 8, sk["h"] - 4, sk["d0"] + 3, D1, OAK)
box_cm("counter plinth", sk["x0"] + 4, sk["x1"], 0, 8, sk["d0"] + 6, D1, plain("plinth", (0.02, 0.015, 0.01), rough=0.8))
n_ = 4; cw_ = (sk["x1"] - sk["x0"] - 12) / n_
for i in range(n_):
    a = sk["x0"] + 6 + i * cw_
    box_cm("cupboard door", a, a + cw_ - 3, 12, 78, sk["d0"] + 2, sk["d0"] + 3, OAK, 0.5)
    box_cm("door panel", a + 4, a + cw_ - 7, 18, 72, sk["d0"] + 1.4, sk["d0"] + 2, OAK, 0.8)
top_ = box_cm("counter slate", sk["x0"], sk["x1"], sk["h"] - 4, sk["h"], sk["d0"], D1, SLATE, 0.5)
for (sx0, sx1) in ((sk["x0"] + 22, sk["x0"] + 78), (sk["x0"] + 92, sk["x0"] + 148)):
    boolean_cut(top_, box("cut", M(sx0), M(sx1), M(sk["d0"] + 6), M(D1 - 8), M(sk["h"] - 10), M(sk["h"] + 5), IRON))
    s_ = box_cm("sink", sx0, sx1, sk["h"] - 24, sk["h"] + 0.6, sk["d0"] + 6, D1 - 8, FIRECLAY, 1.2)
    boolean_cut(s_, box("cut", M(sx0 + 3.5), M(sx1 - 3.5), M(sk["d0"] + 9.5), M(D1 - 11.5), M(sk["h"] - 20), M(sk["h"] + 5), IRON))
    tx = (sx0 + sx1) / 2
    tube("swan neck", [(0, 0), (0, 0.2), (0.04, 0.27), (0.12, 0.27), (0.16, 0.2)], 0.009, BRASS, at=tuple(P(tx, sk["h"], D1 - 4)), rot=-math.pi / 2)
# the phials' rack at the counter's end: walnut, three tubes, a tag on its post
rx, rd = sk["x1"] - 22, sk["d0"] + 22
def rack():
    box_cm("rack base", -9, 9, 0, 1.6, -3.5, 3.5, WALNUT, 0.4, keep=False)
    box_cm("rack board", -9, 9, 7, 8.4, -3.5, 3.5, WALNUT, 0.4, keep=False)
    for e in (-1, 1): box_cm("rack post", e * 8 - 0.8, e * 8 + 0.8, 1.6, 12, -0.8, 0.8, WALNUT, 0.3, keep=False)
    for k, colour in enumerate(((0.85, 0.72, 0.05), None, (0.08, 0.22, 0.75))):
        x = -5 + k * 5
        lathe("tube", [(0, 0), (0.008, 0), (0.008, 0.14), (0.0095, 0.145), (0, 0.145)], GLASS, at=tuple(P(x, 1.6, 0)), steps=20)
        if colour:
            cylinder("phial liquid", M(x), 0, M(2.0), M(9.5), M(0.72), plain(f"phial {k}", colour, rough=0.05, transmission=0.55, ior=1.34), verts=16)
            cylinder("phial cork", M(x), 0, M(14.2), M(16), M(0.85), plain("cork", (0.32, 0.2, 0.1), rough=0.9), verts=12)
    tag = card("tag", [P(9.2, 7.5, -2.2), P(9.2, 7.5, 2.2), P(9.2, 9.7, 2.2), P(9.2, 9.7, -2.2)], TAG)
    tag.rotation_euler = (0, 0, 0)
    rod("tag string", P(8.6, 11, 0), P(9.2, 9.6, 0), M(0.05), plain("string", (0.6, 0.55, 0.42), rough=0.9), verts=4)
assembled("phials' rack", rack, at=(rx, sk["h"], rd), turn=math.radians(-20))
RF = framed((rx, sk["h"], rd), math.radians(-20))

# ── on the back wall: the periodic table, the shelf of jars ───────────────
pt = dict(x0=-190, x1=-50, y0=152, y1=152 + 140 * 1600 / 2400)
arch(card("periodic table", [P(pt["x0"], pt["y0"], D1 - 0.8), P(pt["x1"], pt["y0"], D1 - 0.8), P(pt["x1"], pt["y1"], D1 - 0.8), P(pt["x0"], pt["y1"], D1 - 0.8)], PERIODIC))
for (x, y) in ((pt["x0"] + 2, pt["y1"] - 2), (pt["x1"] - 2, pt["y1"] - 2), (pt["x0"] + 2, pt["y0"] + 2), (pt["x1"] - 2, pt["y0"] + 2)):
    arch(sphere("drawing pin", tuple(P(x, y, D1 - 1.1)), M(0.6), BRASS, squash=(1, 0.5, 1)))
box_cm("jar shelf", -210, -30, 128, 131, D1 - 22, D1, OAK_X, 0.5)
for x in (-200, -40):
    box_cm("shelf bracket", x - 1, x + 1, 112, 128, D1 - 16, D1, IRON)
x = -204
while x < -38:
    r = RNG.uniform(3.5, 5.8); hh = RNG.uniform(11, 19)
    col = RNG.choice(((0.4, 0.22, 0.06), (0.05, 0.14, 0.06), (0.03, 0.05, 0.16), (0.7, 0.68, 0.6)))
    lathe("apothecary jar", [(0, 0), (M(r), 0), (M(r), M(hh * 0.82)), (M(r * 0.7), M(hh * 0.9)), (M(r * 0.7), M(hh)), (0, M(hh))], plain(f"jar glass {x:.0f}", col, rough=0.05, transmission=0.8, ior=1.5), at=tuple(P(x + r, 131, D1 - 11)), steps=24)
    lathe("jar stopper", [(0, 0), (M(r * 0.55), 0), (M(r * 0.6), M(1.5)), (0, M(3))], plain("stopper glass", (0.8, 0.8, 0.78), rough=0.1, transmission=0.7), at=tuple(P(x + r, 131 + hh, D1 - 11)), steps=16)
    box_cm("jar label", x + r * 0.35, x + r * 1.65, 131 + hh * 0.3, 131 + hh * 0.55, D1 - 11 - r - 0.05, D1 - 11 - r + 0.05, plain(f"jar label {x:.0f}", (0.75, 0.7, 0.56), rough=0.85))
    x += 2 * r + RNG.uniform(1, 3)

# ── down the left-hand wall: his bookcase, his notebook among the books ────
bc = BOOKCASE
LEVELS = (9, 54, 99, 144, 189, bc["top"])
bookcase(RNG, X0, -1, bc["d0"], bc["d1"], bc["top"], OAK, OAK_X, spine_mat, COVERS, PAGES, depth=34, levels=LEVELS, bays=3, glass=GLASS, gaps=False)
rows = len(LEVELS) - 1
NOTE_Y = LEVELS[rows - 1 - NOTE["row"]]          # the shelf it stands on (row 0 the top)
nd0, nd1 = NOTE["d"] - NOTE["w"] / 2, NOTE["d"] + NOTE["w"] / 2
bpy.context.view_layer.update()
for o in [o for o in bpy.data.objects if o.name == "book" or o.name.startswith("book.")]:
    c = o.matrix_world.translation * 100
    if abs(c.y - NOTE["d"]) < NOTE["w"] / 2 + 3.2 and NOTE_Y < c.z < NOTE_Y + 40 and c.x < X0 + 40:
        bpy.data.objects.remove(o, do_unlink=True)
NOTEBOOK = bpy.data.objects.new("his notebook", None); link(NOTEBOOK)
NB_CLOTH = scan("notebook cloth", "fabric_leather_02", size=0.2, tint=(0.16, 0.3, 0.2), bright=0.5, sat=0.0, rough=(0.5, 0.8), bump=0.5)
nb_body = box_cm("notebook", X0 + 1.6, X0 + 1.6 + NOTE["depth"], NOTE_Y, NOTE_Y + NOTE["h"], nd0, nd1, NB_CLOTH, 0.4, keep=False)
nb_pages = box_cm("notebook pages", X0 + 2.4, X0 + 1.6 + NOTE["depth"] - 0.8, NOTE_Y + 0.4, NOTE_Y + NOTE["h"] - 0.4, nd0 + 0.4, nd1 - 0.4, plain("notebook leaves", (0.62, 0.56, 0.44), rough=0.9), keep=False)
nb_label = box_cm("notebook label", X0 + 1.6 + NOTE["depth"], X0 + 1.7 + NOTE["depth"], NOTE_Y + NOTE["h"] * 0.6, NOTE_Y + NOTE["h"] * 0.75, nd0 + 0.6, nd1 - 0.6, plain("notebook label", (0.72, 0.66, 0.5), rough=0.85), keep=False)
for o in (nb_body, nb_pages, nb_label): o.parent = NOTEBOOK
def pull_notebook(cm):
    NOTEBOOK.location = P(cm, 0, 0)

# ── on the right: the cabinet of glassware ────────────────────────────────
CB = CABINET
def cabinet():
    """built as if against a back wall at d 0, running along x"""
    L_ = CB["d1"] - CB["d0"]; dp = CB["depth"]
    box_cm("cabinet carcass", 0, L_, 0, CB["h"], -dp, 0, WALNUT, 0.8, keep=False)
    box_cm("cabinet inside", 2, L_ - 2, 86, CB["h"] - 4, -2, -1.2, plain("cabinet paint", (0.62, 0.62, 0.56), rough=0.8), keep=False)
    for k, y in enumerate((96, 134, 172)):
        box_cm("cabinet shelf", 3, L_ - 3, y - 1.5, y, -dp + 2, -1, plain("shelf glass", (0.85, 0.9, 0.88), rough=0.05, transmission=0.9), keep=False)
        x = 8
        while x < L_ - 10:
            r = RNG.uniform(2.4, 5.0); hh = RNG.uniform(9, 24)
            kind = RNG.random()
            if kind < 0.45:
                lathe("flask", [(0, 0), (M(r * 1.3), 0), (M(r * 1.35), M(hh * 0.2)), (M(r * 0.45), M(hh * 0.7)), (M(r * 0.4), M(hh)), (0, M(hh))], GLASS, at=tuple(P(x + r, y, -dp / 2)), steps=24)
            elif kind < 0.8:
                lathe("beaker", [(0, 0), (M(r), 0), (M(r), M(hh * 0.7)), (M(r * 1.06), M(hh * 0.72)), (0, M(hh * 0.72))], GLASS, at=tuple(P(x + r, y, -dp / 2)), steps=24)
            else:
                lathe("bottle", [(0, 0), (M(r), 0), (M(r), M(hh * 0.75)), (M(r * 0.4), M(hh * 0.88)), (M(r * 0.35), M(hh)), (0, M(hh))], plain(f"cabinet bottle {k}-{x:.0f}", (0.3, 0.16, 0.05), rough=0.05, transmission=0.8), at=tuple(P(x + r, y, -dp / 2)), steps=24)
            x += 2 * r + RNG.uniform(1.5, 4)
    box_cm("cabinet base", 0, L_, 0, 84, -dp - 1, -dp, WALNUT, 0.5, keep=False)
    for k in range(2):
        a = 3 + k * (L_ - 6) / 2; b_ = a + (L_ - 6) / 2
        for (c0, c1) in ((a, a + 4), (b_ - 4, b_)):
            box_cm("door stile", c0, c1, 88, CB["h"] - 6, -dp - 1.5, -dp, WALNUT, 0.4, keep=False)
        box_cm("door rail", a, b_, 88, 92, -dp - 1.5, -dp, WALNUT, 0.4, keep=False)
        box_cm("door rail", a, b_, CB["h"] - 10, CB["h"] - 6, -dp - 1.5, -dp, WALNUT, 0.4, keep=False)
        box_cm("door glass", a + 4, b_ - 4, 92, CB["h"] - 10, -dp - 1.0, -dp - 0.8, GLASS, keep=False)
    box_cm("cabinet cornice", -3, L_ + 3, CB["h"], CB["h"] + 8, -dp - 4, 0, WALNUT, 1.0, keep=False)
assembled("cabinet", cabinet, at=(X1, 0, CB["d1"]), turn=-math.pi / 2)

# ── in the middle: his bench as he left it ────────────────────────────────
b = BENCH
box_cm("bench", b["x0"] + 3, b["x1"] - 3, 8, b["h"] - 5, b["d0"] + 3, b["d1"] - 3, OAK)
box_cm("bench plinth", b["x0"] + 5, b["x1"] - 5, 0, 8, b["d0"] + 5, b["d1"] - 5, plain("plinth", (0.02, 0.015, 0.01), rough=0.8))
for k in range(4):
    a = b["x0"] + 6 + k * (b["x1"] - b["x0"] - 12) / 4
    w_ = (b["x1"] - b["x0"] - 12) / 4 - 3
    box_cm("bench door", a, a + w_, 12, 64, b["d0"] + 2, b["d0"] + 3, OAK, 0.5)
    box_cm("bench drawer", a, a + w_, 67, b["h"] - 8, b["d0"] + 2, b["d0"] + 3, OAK, 0.5)
    lathe("knob", [(0, 0), (0.008, 0), (0.011, 0.01), (0.007, 0.015), (0, 0.016)], BRASS, at=tuple(P(a + w_ / 2, 79, b["d0"] + 2)), steps=16).rotation_euler = (math.pi / 2, 0, 0)
box_cm("bench top", b["x0"], b["x1"], b["h"] - 5, b["h"], b["d0"], b["d1"], SLATE, 0.6)
h = b["h"]
# the oil lamp at the left end: a brass font, its glass chimney
lx, ld = b["x0"] + 16, b["d0"] + 46
lathe("lamp font", [(0, 0), (0.06, 0), (0.06, 0.01), (0.03, 0.03), (0.05, 0.08), (0.055, 0.12), (0.03, 0.15), (0.02, 0.16), (0, 0.16)], BRASS, at=tuple(P(lx, h, ld)), steps=40)
lathe("lamp chimney", [(0.02, 0), (0.022, 0.02), (0.035, 0.07), (0.022, 0.12), (0.018, 0.25), (0, 0.25)], plain("chimney glass", (0.95, 0.95, 0.92), rough=0.03, transmission=1.0, ior=1.5), at=tuple(P(lx, h + 16, ld)), steps=40)
LAMP_FLAME = plain("lamp flame", (1, 0.7, 0.3), emit=(1.0, 0.62, 0.26), strength=40)
sphere("lamp flame", tuple(P(lx, h + 20, ld)), M(0.9), LAMP_FLAME, squash=(0.8, 0.8, 1.8))
lamp_l = lamp("oil lamp", "POINT", tuple(P(lx, h + 21, ld)), energy=float(arg("--lamp", "22")), colour=(1.0, 0.62, 0.3), size=0.02)
# the retort on its stand, a rack of test tubes, at the back
rtx, rtd = b["x0"] + 54, b["d1"] - 16
cylinder("stand rod", M(rtx - 8), M(rtd), M(h), M(h + 48), M(0.6), IRON, verts=12)
box_cm("stand foot", rtx - 16, rtx + 2, h, h + 1.5, rtd - 6, rtd + 6, IRON, 0.4)
rod("clamp arm", P(rtx - 8, h + 30, rtd), P(rtx, h + 30, rtd), M(0.5), IRON, verts=8)
sphere("retort bulb", tuple(P(rtx, h + 30, rtd)), M(7), GLASS)
cone = cylinder("retort neck", 0, 0, 0, M(30), M(2.2), GLASS, verts=24, r2=M(0.6)); cone.location = P(rtx + 4, h + 34, rtd); cone.rotation_euler = (0, math.radians(104), 0)
cylinder("retort liquid", M(rtx), M(rtd), M(h + 23.5), M(h + 27), M(5.2), liquid("retort liquid", (120, 60, 30)), verts=24)
def tube_rack():
    box_cm("tube rack", -14, 14, 0, 1.6, -4, 4, OAK_X, 0.4, keep=False)
    box_cm("tube rack board", -14, 14, 7, 8.4, -4, 4, OAK_X, 0.4, keep=False)
    for e in (-1, 1): box_cm("rack end", e * 13.5 - 0.8, e * 13.5 + 0.8, 0, 10, -4, 4, OAK_X, 0.3, keep=False)
    for k in range(6):
        x = -10.5 + k * 4.2
        lathe("test tube", [(0, 0), (0.008, 0), (0.008, 0.15), (0.0095, 0.155), (0, 0.155)], GLASS, at=tuple(P(x, 1.6, 0)), steps=16)
        if k % 2 == 0:
            cylinder("tube liquid", M(x), 0, M(2.0), M(2.0 + RNG.uniform(3, 8)), M(0.72), liquid(f"tube {k}", RNG.choice(((200, 90, 40), (90, 160, 220), (160, 210, 90)))), verts=12)
assembled("test tube rack", tube_rack, at=(b["x0"] + 92, h, b["d1"] - 14), turn=0.05)
# the five bottles across the bench, left to right as the puzzle has them
BOTTLE_AT = []
for i, (shape, bh, bw, rgb, full) in enumerate(BOTTLES):
    x = b["x0"] + 112 + i * 21; d = b["d0"] + 34
    r = bw / 2
    if shape == "conical": prof = [(0, 0), (M(r), 0), (M(r), M(1.5)), (M(r * 0.3), M(bh * 0.8)), (M(r * 0.3), M(bh)), (0, M(bh))]
    elif shape == "round": prof = [(0, 0), (M(r * 0.5), 0)] + [(M(r * math.sin(math.pi * t / 8) * 0.98 + 0.001), M(r * (1 - math.cos(math.pi * t / 8)))) for t in range(1, 8)] + [(M(r * 0.28), M(bh * 0.75)), (M(r * 0.28), M(bh)), (0, M(bh))]
    elif shape == "jar": prof = [(0, 0), (M(r), 0), (M(r), M(bh * 0.85)), (M(r * 0.8), M(bh * 0.92)), (M(r * 0.8), M(bh)), (0, M(bh))]
    elif shape == "tall": prof = [(0, 0), (M(r * 1.6), 0), (M(r * 1.6), M(1.2)), (M(r), M(1.4)), (M(r), M(bh)), (M(r * 1.2), M(bh + 0.5)), (0, M(bh + 0.3))]
    else: prof = [(0, 0), (M(r), 0), (M(r), M(bh)), (M(r * 1.1), M(bh + 0.4)), (0, M(bh + 0.2))]
    lathe(f"bottle {i}", prof, GLASS, at=tuple(P(x, h, d)), steps=48)
    # (its liquid: filled to `full`, inside the glass)
    level = M(bh * full)
    def radius_at(z):
        """the glass's inside at height z: its profile, a little within"""
        for (r0, z0), (r1, z1) in zip(prof[1:], prof[2:]):
            if z0 <= z <= z1 and z1 > z0: return max(0.0005, r0 + (r1 - r0) * (z - z0) / (z1 - z0) - 0.003)
        return max(0.0005, prof[1][0] - 0.003)
    inner = [(0, M(0.3))] + [(radius_at(M(0.3) + (level - M(0.3)) * k / 10), M(0.3) + (level - M(0.3)) * k / 10) for k in range(11)] + [(0, level)]
    lathe(f"liquid {i}", inner, liquid(f"liquid {i}", rgb, glow=0.35 if i == 3 else 0.0), at=tuple(P(x, h, d)), steps=48)
    # a fine printed scale up its front
    for k in range(9):
        y = h + bh * (0.15 + k * 0.08)
        rr = r if shape in ("jar", "beaker") else (r if shape == "tall" else r * 0.6)
        box_cm("graduation", x - (1.2 if k % 2 == 0 else 0.6), x + (1.2 if k % 2 == 0 else 0.6), y, y + 0.12, d - rr - 0.08, d - rr - 0.02, plain("scale print", (0.85, 0.85, 0.82), rough=0.6))
    BOTTLE_AT.append((x, d, bh, r))
# the flask on its tripod over the Bunsen burner, at the right end
fx, fd = b["x1"] - 22, b["d0"] + 46
for k in range(3):
    a = k / 3 * math.tau + 0.4
    rod("tripod leg", P(fx + math.cos(a) * 9, h, fd + math.sin(a) * 9), P(fx + math.cos(a) * 6, h + 20, fd + math.sin(a) * 6), M(0.45), IRON, verts=8)
bpy.ops.mesh.primitive_torus_add(major_radius=M(6.2), minor_radius=M(0.45), location=tuple(P(fx, h + 20, fd)))
bpy.context.active_object.data.materials.append(IRON)
box_cm("gauze", fx - 6.5, fx + 6.5, h + 20.3, h + 20.5, fd - 6.5, fd + 6.5, plain("gauze", (0.2, 0.2, 0.2), rough=0.6, metal=0.6))
lathe("flask", [(0, 0), (0.05, 0), (0.06, 0.02), (0.062, 0.05), (0.04, 0.085), (0.014, 0.1), (0.013, 0.16), (0.016, 0.165), (0, 0.165)], GLASS, at=tuple(P(fx, h + 20.5, fd)), steps=48)
lathe("flask liquid", [(0, M(0.3)), (0.047, M(0.5)), (0.055, M(2.0)), (0.05, M(4.5)), (0, M(4.5))], liquid("boiling liquid", (200, 120, 60)), at=tuple(P(fx, h + 20.5, fd)), steps=40)
lathe("burner", [(0, 0), (0.035, 0), (0.035, 0.01), (0.012, 0.018), (0.008, 0.02), (0.008, 0.12), (0.01, 0.125), (0, 0.125)], BRASS, at=tuple(P(fx, h, fd)), steps=32)
BURNER = plain("burner flame", (0.2, 0.35, 1.0), emit=(0.25, 0.45, 1.0), strength=18, transmission=0.6)
lathe("burner flame", [(0.0, 0), (0.006, 0), (0.009, 0.02), (0.006, 0.045), (0.0, 0.06)], BURNER, at=tuple(P(fx, h + 12.5, fd)), steps=20)
burner_l = lamp("burner", "POINT", tuple(P(fx, h + 15, fd)), energy=float(arg("--burner", "5")), colour=(0.45, 0.6, 1.0), size=0.01)
rod("gas hose", P(fx + 1, h + 1, fd), P(b["x1"] - 2, h + 1, fd + 10), M(0.5), plain("rubber", (0.3, 0.08, 0.04), rough=0.6), verts=10)
# the magnifying glass on its green cloth at the front
card("green cloth", [P(b["x0"] + 154, h + 0.05, b["d0"] + 6), P(b["x0"] + 186, h + 0.05, b["d0"] + 4), P(b["x0"] + 188, h + 0.05, b["d0"] + 22), P(b["x0"] + 156, h + 0.05, b["d0"] + 24)], CLOTH)
import_model("magnifying_glass_01", height=M(26), at=tuple(P(b["x0"] + 171, h + 1.3, b["d0"] + 14)), rot=0.4, tilt=(math.pi / 2, 0.0))
import_model("wooden_stool_01", height=M(66), at=tuple(P(b["x0"] + 70, 0, b["d0"] - 34)), rot=0.4)

# ── light ──────────────────────────────────────────────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
lamp("the moon", "SUN", tuple(P(700, 2600, 2900)), aim=tuple(P(100, 0, 360)), energy=float(arg("--moon", "2.6")), colour=(0.55, 0.68, 1.0), angle=math.radians(1.5))
sky_l = lamp("sky through the window", "AREA", tuple(P(WIN["x"], 190, D1 + 16)), aim=tuple(P(WIN["x"] - 30, 60, 380)), energy=float(arg("--sky", "22")), colour=(0.5, 0.62, 0.95), size=1.3, size_y=1.3)
sky_l.visible_camera = False; sky_l.visible_transmission = False; sky_l.visible_glossy = False
fill_l = lamp("fill", "AREA", tuple(P(-160, 220, 40)), aim=tuple(P(60, 80, D1)), energy=float(arg("--fill", "48")), colour=(0.8, 0.85, 1.0), size=1.6)
fill_l.visible_camera = False; fill_l.visible_glossy = False
eye_fill(float(arg("--eyefill", "51")))                # (the halls' fill: nothing the eye sees falls to black)
for (at_, aim) in ((P(-120, 220, 440), P(X0, 130, 490)), (P(60, 220, 480), P(-80, 150, D1)), (P(120, 220, 300), P(X1, 140, 330))):
    wash = lamp("on the walls", "AREA", tuple(at_), aim=tuple(aim), energy=float(arg("--wash", "14")), colour=(0.82, 0.86, 1.0), size=1.0)
    wash.visible_camera = False; wash.visible_glossy = False
# (one light: the oil lamp; the burner is out)
ONE = Light("lamp", [lamp_l], [LAMP_FLAME]); OUT_LIGHTS = [Light("burner", [burner_l], [BURNER])]
BURNER.node_tree.nodes["Principled BSDF"].inputs["Transmission Weight"].default_value = 1.0
clear_glass()
air = room_haze(X0, X1, -30, D1, TOP, float(arg("--haze", "0")))

# ── what the game is told ──────────────────────────────────────────────────
bx0 = BOTTLE_AT[0][0] - BOTTLE_AT[0][3] - 3; bx1 = BOTTLE_AT[-1][0] + BOTTLE_AT[-1][3] + 3
LAYOUT.thing("chemistry", "Look at the bottles", corners(bx0, bx1, h, h + 36, b["d0"] + 24, b["d0"] + 44))
NOTE_PTS = lambda out: corners(X0 + 1.6 + out, X0 + 1.6 + NOTE["depth"] + out, NOTE_Y, NOTE_Y + NOTE["h"], nd0, nd1)
LAYOUT.thing("molecules", "Take out his notebook", corners(X0 + 1.6, X0 + 1.6 + NOTE["depth"] + 4, NOTE_Y - 3, NOTE_Y + NOTE["h"] + 4, nd0 - 4, nd1 + 4))
LAYOUT.thing("phials", "Look at the phials", [RF(x, y, d) for x in (-11, 11) for y in (0, 17) for d in (-5, 5)])
LAYOUT.glow("lamp", P(lx, h + 22, ld), 110)
LAYOUT.glow("burner", P(fx, h + 14, fd), 60)
u = BOTTLE_AT[3]
LAYOUT.glow("uranium", P(u[0], h + 10, u[1]), 22)
NOTEBOOK_BOX = box_of(NOTE_PTS(0) + NOTE_PTS(NOTE["pull"] + 0.5), pad=6)
LAYOUT.data["extra"]["notebook"] = NOTEBOOK_BOX
for pane in SASHES: LAYOUT.pane(pane)
LAYOUT.dust([P(wx0, WIN["top"], D1), P(wx1, WIN["sill"], D1), P(0, 0, 420), P(140, 0, 560)])
LAYOUT.write()

# ── the passes ─────────────────────────────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "0.15")))
scene.cycles.volume_bounces = 1
GLOSSY = ("white tiles", "fireclay", "burner flame", "lamp flame", "liquid 3")
finish(scene, SAMPLES, keep_gloss=GLOSSY)
plates = one_light(ONE, OUT_LIGHTS) if "plates" in ONLY else {}
passes(scene, OUT, set(plates), air, variants=plates)
if "notebook" in ONLY:
    # his notebook drawn out of its shelf, frame by frame
    one_light(ONE, OUT_LIGHTS)
    crop_frames(scene, OUT, NOTEBOOK_BOX, [(f"notebook-{i}", (lambda i=i: pull_notebook(NOTE["pull"] * (i + 1) / FRAMES))) for i in range(FRAMES)])
    pull_notebook(0)
print("ROOM_DONE")
