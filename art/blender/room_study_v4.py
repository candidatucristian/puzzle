# Room I, the study — Ivy's room — built in three dimensions and rendered with
# Cycles: seen from low by the door, straight across the room to the back
# wall, the way one sees it sitting down in it.
#
# Sage walls over dark oak panelling, a high cornice. On the back wall, left,
# the white stone fireplace, the fire laid and cold, two lit candles on
# the mantel and the brass cipher wheel on its walnut plaque over it; in the
# middle the tall round-headed window, rain on the night beyond it, grey-green
# curtains, pots on its sill (one with something just come up in it); right,
# the tall bookcase, its ladder leaning on it. In the middle of the room, on a
# green rug, the writing desk, facing us: the brass lamp unlit under its
# white glass, two candles, letters and an open notebook, the small gilt
# chest; the chair behind it. Close at hand, left, the old leather armchair;
# right, on a round table, the glass case of earth, roots against its glass,
# the green specimen book beside it. Old rugs on the boards.
#
# The plate, the chest apart, and where everything fell in the picture
# (house/rooms/Study.json), as the other rooms are; study_dark_publish.mjs
# publishes the room with its lamp off and candles lit as version 6.
# Lighting never follows puzzle progress.
#
#   blender -b --factory-startup -P art/blender/room_study_v4.py -- [--samples 512] [--width 2560] [--only plates,chest]

import bpy, bmesh, math, os, sys, random, json
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *
from specimen_book import build_specimen_book

OUT = os.path.join(ROOT, ".artifacts/room-study-candlelight")
os.makedirs(OUT, exist_ok=True)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")       # room_boards.mjs
SAMPLES = int(arg("--samples", "512"))
WIDTH = int(arg("--width", "2560"))
ONLY = set(arg("--only", "plates,chest").split(","))
STILL = arg("--still", "")
RNG = random.Random(1888)

# ── the room, and where we sit in it ───────────────────────────────────────
X0, X1, D1, TOP = -300, 262, 520, 330         # its walls (the door's wall at d 0), its ceiling
EYE = (float(arg("--ex", "25")), float(arg("--ey", "138")), float(arg("--ed", "-30")))
LOOK = (float(arg("--lx", "25")), EYE[1] + float(arg("--tilt", "-40")), D1)
scene, HEIGHT = stage(WIDTH, eye=EYE, look=LOOK, lens=float(arg("--lens", "22")), lift=float(arg("--lift", "0.03")))
WIN = dict(x=0, hw=46, sill=96, top=292)      # the window in the back wall
SPRING = WIN["top"] - WIN["hw"]
FIRE = dict(x=-178, w=150, out=30)            # the chimney breast, left on the back wall
DESK = dict(x=-4, d=352, turn=math.radians(1.5), w=150, deep=70, h=77)
CASE_TABLE = dict(x=104, d=232, r=46, h=70)   # the round table at hand, right
CASE = dict(w=56, deep=36, h=40, roof=13)

# ── materials ──────────────────────────────────────────────────────────────
OAK = scan("oak", "dark_wood", size=1.0, tint=(0.6, 0.45, 0.32), bright=0.42, rough=(0.4, 0.62), bump=0.3, coat=0.12, upright=True)
OAK_X = scan("oak across", "dark_wood", size=1.0, tint=(0.6, 0.45, 0.32), bright=0.4, rough=(0.4, 0.62), bump=0.3, coat=0.12)
WALNUT = scan("walnut", "rosewood_veneer1", size=0.6, tint=(0.66, 0.46, 0.33), bright=0.56, sat=0.85, rough=(0.2, 0.4), bump=0.2, coat=0.4)
BOARDS = scan("floor boards", "wood_floor_worn", size=2.0, tint=(0.62, 0.5, 0.38), bright=0.46, sat=0.6, rough=(0.42, 0.64), bump=0.35, coat=0.1)
PLASTER = scan("ceiling", "plastered_wall_04", size=2.0, tint=(0.52, 0.5, 0.44), bright=0.55, sat=0.2, rough=(0.8, 0.95), bump=0.25)
SAGE = scan("sage walls", "plastered_wall_04", size=2.4, tint=(0.36, 0.44, 0.36), bright=0.6, sat=0.32, rough=(0.78, 0.92), bump=0.16)
LEATHER = scan("desk leather", "brown_leather", size=0.5, tint=(0.3, 0.42, 0.26), bright=0.55, rough=(0.35, 0.6), bump=0.4)
CHAIR_LEATHER = scan("armchair leather", "brown_leather", size=0.6, tint=(0.62, 0.36, 0.2), bright=0.62, sat=0.9, rough=(0.38, 0.62), bump=0.6)
BRASS = aged_metal("brass", (0.55, 0.39, 0.17), (0.08, 0.055, 0.025), rough=(0.22, 0.5), scale=30, tarnish=0.5)
IRON = plain("iron", (0.02, 0.02, 0.02), rough=0.45, metal=0.8)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
WINDOW_GLASS = plain("window glass", (0.9, 0.93, 0.95), rough=0.03, transmission=1.0, ior=1.12)
WAX = bpy.data.materials.new("wax"); WAX.use_nodes = True
_w = WAX.node_tree.nodes["Principled BSDF"]; _w.inputs["Base Color"].default_value = (0.86, 0.79, 0.64, 1); _w.inputs["Subsurface Weight"].default_value = 0.6; _w.inputs["Subsurface Radius"].default_value = (0.02, 0.012, 0.006); _w.inputs["Roughness"].default_value = 0.42
WICK = plain("wick", (0.01, 0.01, 0.01), rough=0.9)
TERRACOTTA = plain("terracotta", (0.42, 0.18, 0.09), rough=0.85)
PAGES = plain("pages", (0.3, 0.26, 0.19), rough=0.9)
STONE = scan("white stone", "marble_01", size=0.9, tint=(0.8, 0.77, 0.7), bright=0.62, sat=0.12, rough=(0.55, 0.78), bump=0.12, coat=0.0)
BRICK = scan("fire brick", "white_sandstone_bricks_03", size=0.7, tint=(0.36, 0.2, 0.13), bright=0.4, sat=0.7, rough=(0.8, 0.95), bump=0.6)
SOOT = plain("soot", (0.012, 0.01, 0.009), rough=0.95)
CAST = aged_metal("cast iron", (0.035, 0.033, 0.03), (0.02, 0.016, 0.012), rough=(0.4, 0.75), scale=40, tarnish=0.3)
FRAME = scan("window | oiled oak", "dark_wood", size=0.65, tint=(0.62, 0.42, 0.26), bright=0.5, sat=0.65, rough=(0.38, 0.58), bump=0.28, coat=0.1, upright=True)
FRAME_X = scan("window | oak rails and sill", "dark_wood", size=0.65, tint=(0.62, 0.42, 0.26), bright=0.5, sat=0.65, rough=(0.38, 0.58), bump=0.28, coat=0.1)
CURTAIN = scan("grey-green velvet", "velour_velvet", size=0.5, tint=(0.24, 0.3, 0.27), bright=0.42, sat=0.5, rough=(0.6, 0.85), bump=0.3)
CURTAIN.node_tree.nodes["Principled BSDF"].inputs["Sheen Weight"].default_value = 0.4
CIPHER = picture("cipher face", os.path.join(DRAWN, "cipher.png"), rough=0.3, coat=0.2, bump=0.4)
CIPHER.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 0.85
PRINT = picture("botanical print", os.path.join(DRAWN, "study-print.png"), rough=0.9)
spine_mat = bound(picture("spines", os.path.join(DRAWN, "spines.png"), rough=0.5, coat=0.15, bump=0.3))
COVERS = cover_materials()
PERSIAN = rug_material("old persian rug", os.path.join(ASSETS, "textures", "persian_rug.jpg"), value=0.52)
GREEN_RUG = scan("green woven rug", "fabric_leather_02", size=0.3, tint=(0.18, 0.3, 0.22), bright=0.4, sat=0.6, rough=(0.85, 1.0), bump=0.3)
LAYOUT = Layout("Study")

# ── the shell ──────────────────────────────────────────────────────────────
DADO = 96
box_cm("floor", X0 - 30, X1 + 30, -6, 0, -160, D1 + 30, BOARDS)
box_cm("ceiling", X0 - 30, X1 + 30, TOP, TOP + 10, -160, D1 + 30, PLASTER)
for (x0, x1) in ((X0 - 25, X0), (X1, X1 + 25)):
    box_cm("wall", x0, x1, 0, TOP, -160, D1 + 30, SAGE)
box_cm("door wall", X0 - 25, X1 + 25, 0, TOP, -170, -150, SAGE)
back = box_cm("back wall", X0 - 25, X1 + 25, 0, TOP, D1, D1 + 30, SAGE)
wx0, wx1 = WIN["x"] - WIN["hw"], WIN["x"] + WIN["hw"]
boolean_cut(back, box("cut", M(wx0), M(wx1), M(D1 - 10), M(D1 + 50), M(WIN["sill"]), M(SPRING), IRON))
arch_cut = cylinder("cut", 0, 0, -0.5, 0.5, M(WIN["hw"]), IRON, verts=64); arch_cut.rotation_euler = (math.pi / 2, 0, 0); arch_cut.location = P(WIN["x"], SPRING, D1 + 15)
boolean_cut(back, arch_cut)
def dado_x(a, b, at, facing):
    """oak panelling along a wall running across (at d = `at`, its face toward
    -`facing`·d): boards, panels, a rail, a skirting; and the cornice"""
    def piece(p0, p1, y0, y1, proud, mat, r=0.0):
        q0, q1 = sorted((at, at - facing * proud))
        box_cm("panelling", p0, p1, y0, y1, q0, q1, mat, r)
    piece(a, b, 0, DADO, 2.0, OAK)
    n = max(1, round((b - a) / 52))
    for k in range(n):
        p0 = a + k * (b - a) / n + 6; p1 = a + (k + 1) * (b - a) / n - 6
        piece(p0, p1, 18, DADO - 14, 3.2, OAK, 1.2)
    piece(a, b, DADO - 3, DADO + 4, 4.5, OAK_X, 1.0)
    piece(a, b, 0, 16, 3.5, OAK_X, 0.6)
    piece(a, b, TOP - 16, TOP, 10, OAK_X, 2.0)
def dado_d(a, b, at, facing):
    """the same along a side wall (at x = `at`, its face toward +`facing`·x)"""
    def piece(p0, p1, y0, y1, proud, mat, r=0.0):
        q0, q1 = sorted((at, at + facing * proud))
        box_cm("panelling", q0, q1, y0, y1, p0, p1, mat, r)
    piece(a, b, 0, DADO, 2.0, OAK)
    n = max(1, round((b - a) / 52))
    for k in range(n):
        p0 = a + k * (b - a) / n + 6; p1 = a + (k + 1) * (b - a) / n - 6
        piece(p0, p1, 18, DADO - 14, 3.2, OAK, 1.2)
    piece(a, b, DADO - 3, DADO + 4, 4.5, OAK_X, 1.0)
    piece(a, b, 0, 16, 3.5, OAK_X, 0.6)
    piece(a, b, TOP - 16, TOP, 10, OAK_X, 2.0)
BREAST0, BREAST1 = FIRE["x"] - FIRE["w"] / 2 - 12, FIRE["x"] + FIRE["w"] / 2 + 12
BF = D1 - FIRE["out"]                           # the chimney breast's face
dado_x(X0, BREAST0, D1, 1)
dado_x(BREAST1, wx0 - 12, D1, 1)
dado_x(wx1 + 12, X1, D1, 1)
box_cm("breast cornice", BREAST0 - 2, BREAST1 + 2, TOP - 16, TOP, BF - 10, BF, OAK_X, 2.0)
dado_d(-150, D1, X0, 1)
dado_d(-150, D1, X1, -1)

# ── the window: tall, round-headed, its two leaves shut on the rain ────────
REVEAL = 30
box_cm("reveal", wx0 - 3, wx0, WIN["sill"], SPRING, D1, D1 + REVEAL, FRAME)
box_cm("reveal", wx1, wx1 + 3, WIN["sill"], SPRING, D1, D1 + REVEAL, FRAME)
box_cm("sill", wx0 - 12, wx1 + 12, WIN["sill"] - 4, WIN["sill"], D1 - 16, D1 + REVEAL - 6, FRAME_X, 1.0)
for x0, x1 in ((wx0 - 10, wx0 - 1), (wx1 + 1, wx1 + 10)):
    box_cm("architrave", x0, x1, WIN["sill"] - 4, SPRING, D1 - 4.5, D1, FRAME, 0.6)
verts, faces = [], []
for i in range(65):
    a = math.pi * i / 64
    for radius, depth in ((WIN["hw"] + 10, D1 - 4.5), (WIN["hw"] + 1, D1 - 4.5), (WIN["hw"] + 1, D1 + REVEAL)):
        verts.append(tuple(P(WIN["x"] + math.cos(a) * radius, SPRING + math.sin(a) * radius, depth)))
for i in range(64):
    j = i * 3
    faces.extend(((j, j + 3, j + 4, j + 1), (j + 1, j + 4, j + 5, j + 2)))
arch_mesh = bpy.data.meshes.new("arch lining"); arch_mesh.from_pydata(verts, [], faces); arch_mesh.update()
arch_obj = arch(link(bpy.data.objects.new("arch lining", arch_mesh))); arch_obj.data.materials.append(FRAME_X)
arch_obj.modifiers.new("solid", "SOLIDIFY").thickness = M(1.2)
GD = D1 + REVEAL - 10
def leaf(x0, x1):
    y0, y1 = WIN["sill"] + 1, SPRING - 1.5
    def part(xa, xb, ya, yb, da, db, mat, r=0.0):
        o = box_cm("leaf", xa, xb, ya, yb, da, db, mat, r); return o
    part(x0, x0 + 5, y0, y1, GD - 2.5, GD + 2.5, FRAME, 0.5); part(x1 - 5, x1, y0, y1, GD - 2.5, GD + 2.5, FRAME, 0.5)
    part(x0, x1, y0, y0 + 8, GD - 2.5, GD + 2.5, FRAME_X, 0.5); part(x0, x1, y1 - 5, y1, GD - 2.5, GD + 2.5, FRAME_X, 0.5)
    xm = (x0 + x1) / 2
    part(xm - 1.2, xm + 1.2, y0 + 8, y1 - 5, GD - 1.6, GD + 1.6, FRAME, 0.3)
    for k in (1, 2, 3):
        y = y0 + 8 + k * (y1 - 5 - y0 - 8) / 4
        part(x0 + 5, x1 - 5, y - 1.2, y + 1.2, GD - 1.6, GD + 1.6, FRAME_X, 0.3)
    part(x0 + 4, x1 - 4, y0 + 7, y1 - 4, GD - 0.3, GD + 0.3, WINDOW_GLASS)
leaf(wx0, WIN["x"]); leaf(WIN["x"], wx1)
box_cm("transom", wx0, wx1, SPRING - 1.5, SPRING + 2.5, GD - 3, GD + 3, FRAME_X, 0.4)
me = bpy.data.meshes.new("fanlight"); bm = bmesh.new(); n = 48
r_out, r_in = WIN["hw"], WIN["hw"] - 5
outer = [bm.verts.new(tuple(P(WIN["x"] + math.cos(math.pi * i / n) * r_out, SPRING + math.sin(math.pi * i / n) * r_out, GD - 2.5))) for i in range(n + 1)]
inner = [bm.verts.new(tuple(P(WIN["x"] + math.cos(math.pi * i / n) * r_in, SPRING + math.sin(math.pi * i / n) * r_in, GD - 2.5))) for i in range(n + 1)]
for i in range(n): bm.faces.new((outer[i], outer[i + 1], inner[i + 1], inner[i]))
bm.to_mesh(me); bm.free()
fan = arch(link(bpy.data.objects.new("fanlight", me))); fan.data.materials.append(FRAME)
fan.modifiers.new("thick", "SOLIDIFY").thickness = M(5)
for k in range(1, 5):
    a = math.pi * k / 5
    arch(rod("fan bar", P(WIN["x"], SPRING, GD), P(WIN["x"] + math.cos(a) * r_in, SPRING + math.sin(a) * r_in, GD), M(1.1), FRAME, verts=8))
gl = bpy.data.meshes.new("fan glass"); bm = bmesh.new()
vs = [bm.verts.new(tuple(P(WIN["x"], SPRING, GD)))] + [bm.verts.new(tuple(P(WIN["x"] + math.cos(math.pi * i / n) * r_in, SPRING + math.sin(math.pi * i / n) * r_in, GD))) for i in range(n + 1)]
for i in range(1, n + 1): bm.faces.new((vs[0], vs[i], vs[i + 1]))
bm.to_mesh(gl); bm.free()
arch(link(bpy.data.objects.new("fan glass", gl))).data.materials.append(WINDOW_GLASS)
curtain(RNG, wx0 - 62, wx0 - 6, D1 - 7, TOP - 22, CURTAIN)
curtain(RNG, wx1 + 6, wx1 + 62, D1 - 7, TOP - 22, CURTAIN)
curtain_pole(wx0 - 70, wx1 + 70, TOP - 18, D1 - 9, BRASS)
# the garden beyond, at night, in the rain
MOON_AT = P(-900, 900, 3600)
garden(MOON_AT, [("island_tree_01", -260, 1500, 9.0, 0.3), ("island_tree_02", 240, 2100, 11.0, 1.4), ("tree_small_02", 60, 1150, 4.5, 2.2),
                  ("shrub_02", 140, 860, 1.4, 0.6), ("shrub_02", -150, 900, 1.6, 2.0)],
       (-800, 1600, D1 + 30, 3200, -40), P(800, 700, 4400))
# on the sill: the pot with something just come up in it; a fern; two books
pot_x, pot_d = WIN["x"] - 26, D1 + 4
SPROUT = plain("seedling", (0.14, 0.34, 0.06), rough=0.5)
lathe("pot", [(0, 0), (0.042, 0), (0.044, 0.004), (0.056, 0.09), (0.061, 0.095), (0.061, 0.11), (0.056, 0.11), (0.054, 0.1), (0, 0.1)], TERRACOTTA, at=tuple(P(pot_x, WIN["sill"], pot_d)), steps=40)
cylinder("earth", M(pot_x), M(pot_d), M(WIN["sill"] + 9), M(WIN["sill"] + 9.4), M(5.3), plain("pot earth", (0.05, 0.035, 0.02), rough=1.0))
for lean, a in ((0.15, 0.4), (-0.12, 2.6)):
    tube("shoot", [(0, 0), (lean * 0.02, 0.04), (lean * 0.05, 0.075)], 0.0012, SPROUT, at=tuple(P(pot_x, WIN["sill"] + 9.4, pot_d)), rot=a)
for a in (0.3, 0.3 + math.pi):
    lf = leaf_blade("leaf", tuple(P(pot_x + math.cos(a) * 1.3, WIN["sill"] + 16.8, pot_d + math.sin(a) * 1.3)), M(1.4), SPROUT, squash=(1.0, 0.55, 0.12))
    lf.rotation_euler = (0.2, 0.3, a)
import_model("fern_02", height=M(30), at=tuple(P(WIN["x"] + 4, WIN["sill"], D1 + 6)), rot=1.2)
for k in range(2):
    o = book(RNG, WIN["x"] + 30, D1 + 2, WIN["sill"] + k * 3.2, 3.0, 22, 16, spine_mat, COVERS, PAGES, side=-1)
    o.rotation_euler = (math.pi / 2, 0, 0.1 + k * 0.08); o.location = P(WIN["x"] + 30, WIN["sill"] + 1.6 + k * 3.2, D1 + 6)

# ── the fireplace on the back wall: white stone, the fire laid and cold ────
fx, fw = FIRE["x"], FIRE["w"]
breast = box_cm("chimney breast", BREAST0, BREAST1, 0, TOP, BF, D1 + 1, SAGE)
ox0, ox1, oy1 = fx - 34, fx + 34, 78            # the fire's opening
boolean_cut(breast, box("cut", M(ox0), M(ox1), M(BF - 10), M(D1 - 8), M(-1), M(oy1), IRON))
box_cm("fire back", ox0, ox1, 0, oy1, D1 - 12, D1 - 8, BRICK)
for x0, x1 in ((ox0, ox0 + 2.5), (ox1 - 2.5, ox1)):
    box_cm("fire cheek", x0, x1, 0, oy1, BF, D1 - 8, BRICK)
box_cm("fire throat", ox0, ox1, oy1 - 3, oy1, BF, D1 - 8, SOOT)
box_cm("fire floor", ox0, ox1, 0, 1.5, BF, D1 - 8, SOOT)
# the surround: jambs, frieze, the mantel shelf, the hearth before it
for x0, x1 in ((fx - fw / 2, ox0 - 2), (ox1 + 2, fx + fw / 2)):
    box_cm("jamb", x0, x1, 0, 112, BF - 6, BF, STONE, 0.6)
    box_cm("plinth block", x0 - 1.5, x1 + 1.5, 0, 14, BF - 7.5, BF, STONE, 0.6)
    box_cm("corbel", x0 + 2, x1 - 2, 104, 120, BF - 8, BF, STONE, 0.8)
box_cm("frieze", fx - fw / 2, fx + fw / 2, oy1 + 2, 120, BF - 5, BF, STONE, 0.6)
for x0, x1 in ((ox0 - 2, ox0), (ox1, ox1 + 2)):
    box_cm("register", x0, x1, 0, oy1 + 2, BF - 2, BF, CAST, 0.3)
box_cm("register", ox0 - 2, ox1 + 2, oy1, oy1 + 2, BF - 2, BF, CAST, 0.3)
MANTEL_Y = 125
box_cm("mantel", fx - fw / 2 - 8, fx + fw / 2 + 8, 120, MANTEL_Y, BF - 18, BF, STONE, 1.2)
box_cm("hearth", fx - fw / 2 - 6, fx + fw / 2 + 6, 0, 2.5, BF - 48, BF, STONE, 0.8)
rod("fender", P(fx - fw / 2 + 4, 8, BF - 42), P(fx + fw / 2 - 4, 8, BF - 42), M(0.9), BRASS, verts=16)
for x in (fx - fw / 2 + 4, fx + fw / 2 - 4):
    rod("fender", P(x, 8, BF - 42), P(x, 8, BF - 2), M(0.9), BRASS, verts=16)
    sphere("fender knob", tuple(P(x, 8, BF - 42)), M(1.7), BRASS)
# the grate: an iron basket, two logs laid and cold, grey ash under them
gd = (BF + D1 - 8) / 2
for k in range(5):
    rod("grate bar", P(fx - 26, 12 + k * 4.5, gd - 8), P(fx + 26, 12 + k * 4.5, gd - 8), M(0.6), CAST, verts=8)
for x in (fx - 26, fx + 26):
    rod("grate leg", P(x, 0, gd - 8), P(x, 30, gd - 8), M(0.9), CAST, verts=8)
box_cm("grate floor", fx - 26, fx + 26, 11, 12, gd - 8, gd + 8, CAST)
BARK = scan("bark", "jolcham_oak_bark_01", size=0.3, tint=(0.5, 0.4, 0.32), bright=0.35, rough=(0.7, 0.95), bump=0.8)
ASH = plain("ash", (0.18, 0.17, 0.16), rough=1.0)
for (y, a, ln) in ((18, 0.1, 44), (23, -0.18, 40)):
    log = cylinder("log", 0, 0, -M(ln / 2), M(ln / 2), M(5.0), BARK, verts=20)
    log.rotation_euler = (0, math.pi / 2, a); log.location = P(fx, y, gd)
box_cm("ash", fx - 24, fx + 24, 12, 13.2, gd - 7, gd + 7, ASH)
# on the mantel: two brass candlesticks, candles lit; a little jar, a box
def candlestick(x, y, d, h=24, candle=16):
    lathe("candlestick", [(0, 0), (0.055, 0), (0.058, 0.006), (0.05, 0.014), (0.016, 0.03), (0.012, 0.06), (0.02, 0.07), (0.011, 0.08),
                          (0.011, M(h) - 0.03), (0.02, M(h) - 0.018), (0.026, M(h) - 0.01), (0.016, M(h)), (0, M(h))], BRASS, at=tuple(P(x, y, d)), steps=40)
    cylinder("candle", M(x), M(d), M(y + h - 1), M(y + h + candle), M(1.05), WAX, verts=32)
    for j in range(3):
        a = 0.4 + j * 1.9; L_ = 2 + j * 1.1
        sphere("drip", tuple(P(x + math.cos(a) * 1.05, y + h + candle - L_ / 2, d + math.sin(a) * 1.05)), M(0.3), WAX, squash=(1, 1, L_ / 0.6))
    cylinder("wick", M(x), M(d), M(y + h + candle - 0.2), M(y + h + candle + 0.9), M(0.07), WICK, verts=6)
    return P(x, y + h + candle + 0.9, d)
FLAMES = {}
FLAMES["mantel left"] = candlestick(fx - fw / 2 + 4, MANTEL_Y, BF - 9)
FLAMES["mantel right"] = candlestick(fx + fw / 2 - 4, MANTEL_Y, BF - 9)
lathe("jar", [(0, 0), (0.035, 0), (0.042, 0.03), (0.04, 0.07), (0.028, 0.085), (0.03, 0.095), (0, 0.095)], plain("glazed jar", (0.2, 0.25, 0.22), rough=0.3), at=tuple(P(fx - 30, MANTEL_Y, BF - 8)), steps=32)
box_cm("trinket box", fx + 20, fx + 34, MANTEL_Y, MANTEL_Y + 6, BF - 12, BF - 5, WALNUT, 0.5)
# over it, the cipher wheel on its walnut plaque
WHEEL = dict(x=fx, y=196, r=22, plaque=28)
wh = WHEEL
box_cm("plaque", wh["x"] - wh["plaque"], wh["x"] + wh["plaque"], wh["y"] - wh["plaque"], wh["y"] + wh["plaque"], BF - 3, BF, WALNUT, 1.2)
box_cm("plaque bead", wh["x"] - wh["plaque"] + 3, wh["x"] + wh["plaque"] - 3, wh["y"] - wh["plaque"] + 3, wh["y"] + wh["plaque"] - 3, BF - 3.6, BF - 3, WALNUT, 0.8)
disc = lathe("cipher wheel", [(0, 0), (M(wh["r"]), 0), (M(wh["r"]) + 0.004, 0.006), (M(wh["r"]), 0.012), (0, 0.012)], BRASS, steps=96)
disc.rotation_euler = (math.pi / 2, 0, 0); disc.location = P(wh["x"], wh["y"], BF - 3.6)
face = bpy.data.meshes.new("cipher face"); bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); n = 96
c0 = bm.verts.new(tuple(P(wh["x"], wh["y"], BF - 4.85)))
ring = [bm.verts.new(tuple(P(wh["x"] + math.cos(2 * math.pi * k / n) * (wh["r"] - 0.3), wh["y"] + math.sin(2 * math.pi * k / n) * (wh["r"] - 0.3), BF - 4.85))) for k in range(n)]
for k in range(n):
    f = bm.faces.new((c0, ring[(k + 1) % n], ring[k]))
    for lp in f.loops:
        co = lp.vert.co
        lp[uvl].uv = (0.5 + (co.x - M(wh["x"])) / M(2 * wh["r"]) * 0.98, 0.5 + (co.z - M(wh["y"])) / M(2 * wh["r"]) * 0.98)
bm.to_mesh(face); bm.free()
arch(link(bpy.data.objects.new("cipher face", face))).data.materials.append(CIPHER)
# a log basket beside the hearth
bucket = import_model("wooden_bucket_01", height=M(40), at=tuple(P(BREAST1 + 22, 0, D1 - 30)), rot=0.4)
for k, (dx, a) in enumerate(((-4, 0.2), (3, -0.3), (0, 0.05))):
    lg = cylinder("basket log", 0, 0, -M(22), M(22), M(4.2), BARK, verts=16)
    lg.rotation_euler = (math.pi / 2 - 0.25, 0, a); lg.location = P(BREAST1 + 22 + dx, 36 + k * 2, D1 - 30 + k * 2)
# a pressed fern, framed, on the left wall
for (d0, d1) in ((420, 470),):
    y0, y1 = 140, 140 + (d1 - d0) * 1.36
    for (a, b, c, e) in ((d0 - 3, d1 + 3, y0 - 3, y0), (d0 - 3, d1 + 3, y1, y1 + 3), (d0 - 3, d0, y0, y1), (d1, d1 + 3, y0, y1)):
        box_cm("frame", X0, X0 + 2.5, c, e, a, b, OAK_X if e - c < 10 else OAK, 0.4)
    arch(card("pressed fern", [P(X0 + 1, y0, d0), P(X0 + 1, y0, d1), P(X0 + 1, y1, d1), P(X0 + 1, y1, d0)], PRINT, uv=(0.05, 0.08, 0.38, 0.92)))

# ── the bookcase on the right of the back wall, its ladder ─────────────────
BC = dict(x0=96, x1=X1 - 2, deep=42, top=TOP - 26)
def tall_bookcase():
    bookcase(RNG, 0, 1, 0, BC["x1"] - BC["x0"], BC["top"], OAK, OAK_X, spine_mat, COVERS, PAGES, depth=BC["deep"],
             levels=(10, 50, 92, 132, 172, 212, 252, BC["top"] - 4), bays=3, glass=GLASS)
# (built against a wall at x 0 along d, then turned to stand along the back wall, its books toward the room)
assembled("tall bookcase", tall_bookcase, at=(BC["x1"], 0, D1), turn=math.pi / 2)
def ladder():
    for e in (-1, 1):
        box_cm("ladder rail", e * 22 - 2, e * 22 + 2, 0, 270, -2, 2, OAK, 0.6)
    for k in range(10):
        y = 22 + k * 26
        box_cm("rung", -22, 22, y, y + 3, -1.5, 1.5, OAK, 0.5)
# and along the right-hand wall, more of them, coming toward us
bookcase(RNG, X1, 1, 250, D1 - BC["deep"] - 2, BC["top"], OAK, OAK_X, spine_mat, COVERS, PAGES, depth=36,
         levels=(10, 50, 92, 132, 172, 212, 252, BC["top"] - 4), bays=3, glass=GLASS)
lad = assembled("ladder", ladder, at=(BC["x0"] + 70, 0, D1 - BC["deep"] - 54))
lad.rotation_euler = (math.radians(-11), 0, 0)

# ── the writing desk, facing us, its lamp, candles, letters, the chest ─────
DK = DESK
def writing_desk():
    w, dp, h = DK["w"], DK["deep"], DK["h"]
    # (its drawers toward us: a desk faced from the room)
    pedestal_desk(dict(x0=-w / 2, x1=w / 2, d0=-dp / 2, d1=dp / 2, h=h), WALNUT, LEATHER, BRASS)
desk_root = assembled("writing desk", writing_desk, at=(DK["x"], 0, DK["d"]), turn=DK["turn"])
at_desk = framed((DK["x"], 0, DK["d"]), DK["turn"])
h = DK["h"]
# the lamp: a brass column, a white glass dome over the bulb
LAMP = dict(x=46, d=12)
lb = at_desk(LAMP["x"], h, LAMP["d"])
lathe("lamp foot", [(0, 0), (0.075, 0), (0.078, 0.008), (0.06, 0.02), (0.02, 0.03), (0.014, 0.05), (0, 0.05)], BRASS, at=tuple(lb), steps=48)
lathe("lamp column", [(0, 0.04), (0.012, 0.04), (0.01, 0.28), (0.016, 0.3), (0.014, 0.33), (0, 0.33)], BRASS, at=tuple(lb), steps=32)
OPAL = shade_material("white glass shade", (0.9, 0.86, 0.78), glow=(1.0, 0.82, 0.55), strength=0, through=0.25)
lathe("lamp shade", [(0.03, 0.31), (0.06, 0.325), (0.105, 0.36), (0.13, 0.4), (0.125, 0.405), (0.1, 0.37), (0.055, 0.335), (0.028, 0.32)], OPAL, at=tuple(lb), steps=64)
lathe("lamp gallery", [(0.028, 0.305), (0.034, 0.305), (0.034, 0.322), (0.028, 0.322)], BRASS, at=tuple(lb), steps=32)
LAMP_AT = lb + Vector((0, 0, 0.36))
# two candles, at the desk's left
FLAMES["desk left"] = candlestick(*(lambda v: (v.x * 100, h, v.y * 100))(at_desk(-58, h, 8)), h=20, candle=14)
FLAMES["desk right"] = candlestick(*(lambda v: (v.x * 100, h, v.y * 100))(at_desk(-46, h, 16)), h=16, candle=12)
# letters, an open notebook, the inkwell and the pen
LETTERS = paper("letters", (0.68, 0.62, 0.5), 0.3)
for (x, d, a) in ((-24, -8, 0.12), (-10, -2, -0.08), (4, -14, 0.3)):
    s_ = card("letter", [P(-10.5, 0, -14.8), P(10.5, 0, -14.8), P(10.5, 0, 14.8), P(-10.5, 0, 14.8)], LETTERS)
    s_.location = at_desk(x, h + 0.15 + abs(a) * 0.3, d); s_.rotation_euler = (0, 0, DK["turn"] + a)
for side in (-1, 1):
    pg = card("notebook page", [P(0, 0, -11), P(side * 15, 0, -11), P(side * 15, 0, 11), P(0, 0, 11)], LETTERS)
    pg.location = at_desk(18, h + 1.2, -6); pg.rotation_euler = (0, side * 0.06, DK["turn"] + 0.2)
cover = card("notebook cover", [P(-16, 0, -12), P(16, 0, -12), P(16, 0, 12), P(-16, 0, 12)], plain("notebook cloth", (0.12, 0.08, 0.05), rough=0.8))
cover.location = at_desk(18, h + 0.6, -6); cover.rotation_euler = (0, 0, DK["turn"] + 0.2)
lathe("inkwell", [(0, 0), (0.03, 0), (0.032, 0.035), (0.012, 0.045), (0.012, 0.055), (0, 0.055)], GLASS, at=tuple(at_desk(-30, h, 22)), steps=24)
lathe("ink", [(0, 0.002), (0.028, 0.002), (0.028, 0.02), (0, 0.02)], plain("ink", (0.01, 0.01, 0.02), rough=0.1), at=tuple(at_desk(-30, h, 22)), steps=24)
tube("pen", [(0, 0), (0.17, 0.004)], 0.004, plain("pen", (0.02, 0.02, 0.02), rough=0.3), at=tuple(at_desk(-14, h + 0.5, 20)), rot=0.6)
for k in range(3):
    o = book(RNG, 0, 0, 0, 4.0, 22, 16, spine_mat, COVERS, PAGES, side=-1)
    o.rotation_euler = (math.pi / 2, 0, DK["turn"] + 0.05 * k); o.location = at_desk(60, h + 2 + k * 4.1, -14)
# the gilt chest, at the desk's right, toward us
CHEST_LOCAL = dict(x0=20, x1=41, d0=-26, d1=-11, y0=h + 1, y1=h + 11.5, lid=7.7)
def the_chest():
    global chest_body, chest_hinge, lid_parts
    chest_body, chest_hinge, lid_parts = chest(CHEST_LOCAL)
assembled("chest", the_chest, at=(DK["x"], 0, DK["d"]), turn=DK["turn"])
CHEST_PARTS = chest_body + lid_parts
# the chair behind it, drawn up to it
chair = import_model("dining_chair_02", height=M(96), at=tuple(P(DK["x"] - 10, 0, DK["d"] + 58)), rot=math.pi + 0.15)
darken_model(chair, (0.62, 0.55, 0.48))
rug(DK["x"] - 150, DK["x"] + 150, DK["d"] - 110, DK["d"] + 120, GREEN_RUG)

# ── close at hand: the leather armchair, left; the glass case, right ───────
arm = import_model("ArmChair_01", height=M(100), at=tuple(P(-196, 0, 318)), rot=math.radians(float(arg("--arm", "44"))))
# (an old club chair: all of it in worn brown leather)
for name in arm["meshes"]:
    o = bpy.data.objects[name]
    for slot in o.material_slots: slot.material = CHAIR_LEATHER
for rx0, rx1, rd0, rd1 in ((-290, -40, 110, 330), (10, 250, 100, 300)):
    rug(rx0, rx1, rd0, rd1, PERSIAN).location.z += M(0.25)   # (over the green rug where they meet)
CT = CASE_TABLE
def case_table():
    h_, r = M(CT["h"]), M(CT["r"])
    lathe("table top", [(0, h_ - 0.03), (r, h_ - 0.03), (r + 0.006, h_ - 0.018), (r, h_), (0, h_)], WALNUT, steps=64)
    lathe("table column", [(0, 0), (0.05, 0.08), (0.04, 0.16), (0.045, 0.3), (0.035, 0.45), (0.05, 0.55), (0.04, h_ - 0.03), (0, h_ - 0.03)], WALNUT, steps=32)
    for k in range(3):
        tube("table foot", [(0.03, 0.12), (0.16, 0.06), (0.26, 0.015)], 0.018, WALNUT, rot=k * math.tau / 3 + 0.3)
assembled("case table", case_table, at=(CT["x"], 0, CT["d"]))
ty = CT["h"]
# the glass case: a brass frame round glass, earth halfway up it, a seedling,
# its roots against the front glass (toward us)
cx0, cx1 = CT["x"] - CASE["w"] / 2 - 6, CT["x"] + CASE["w"] / 2 - 6
cd0, cd1 = CT["d"] - CASE["deep"] / 2, CT["d"] + CASE["deep"] / 2
cy0, cy1, soil = ty, ty + CASE["h"], ty + 18
box_cm("case base", cx0 - 1.5, cx1 + 1.5, cy0, cy0 + 3, cd0 - 1.5, cd1 + 1.5, WALNUT, 0.5)
for x in (cx0, cx1):
    for d in (cd0, cd1): box_cm("case post", x - 0.7, x + 0.7, cy0 + 3, cy1, d - 0.7, d + 0.7, BRASS, 0.2)
for d in (cd0, cd1): box_cm("case rail", cx0, cx1, cy1 - 1.2, cy1, d - 0.7, d + 0.7, BRASS, 0.2)
for x in (cx0, cx1): box_cm("case rail", x - 0.7, x + 0.7, cy1 - 1.2, cy1, cd0, cd1, BRASS, 0.2)
me = bpy.data.meshes.new("case roof"); bm = bmesh.new()
a0, a1, a2, a3 = (bm.verts.new(tuple(P(x, cy1, d))) for x, d in ((cx0, cd0), (cx1, cd0), (cx1, cd1), (cx0, cd1)))
RZ = CASE["roof"]
r0, r1 = bm.verts.new(tuple(P(cx0, cy1 + RZ, (cd0 + cd1) / 2))), bm.verts.new(tuple(P(cx1, cy1 + RZ, (cd0 + cd1) / 2)))
bm.faces.new((a0, a1, r1, r0)); bm.faces.new((a3, r0, r1, a2)); bm.faces.new((a0, r0, a3)); bm.faces.new((a1, a2, r1))
bm.to_mesh(me); bm.free()
arch(link(bpy.data.objects.new("case roof", me))).data.materials.append(GLASS)
rod("ridge", P(cx0, cy1 + RZ, (cd0 + cd1) / 2), P(cx1, cy1 + RZ, (cd0 + cd1) / 2), M(0.5), BRASS, verts=8)
for x in (cx0, cx1):
    rod("gable", P(x, cy1, cd0), P(x, cy1 + RZ, (cd0 + cd1) / 2), M(0.45), BRASS, verts=8)
    rod("gable", P(x, cy1, cd1), P(x, cy1 + RZ, (cd0 + cd1) / 2), M(0.45), BRASS, verts=8)
box_cm("case glass", cx0, cx1, cy0 + 3, cy1 - 0.4, cd0 - 0.2, cd0 + 0.2, GLASS)
box_cm("case glass", cx0, cx1, cy0 + 3, cy1 - 0.4, cd1 - 0.2, cd1 + 0.2, GLASS)
box_cm("case glass", cx0 - 0.2, cx0 + 0.2, cy0 + 3, cy1 - 0.4, cd0, cd1, GLASS)
box_cm("case glass", cx1 - 0.2, cx1 + 0.2, cy0 + 3, cy1 - 0.4, cd0, cd1, GLASS)
def earth_material():
    """potting earth: dark crumbs of every brown, a grit of sand"""
    m = bpy.data.materials.new("earth"); m.use_nodes = True
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    crumbs = N.new("ShaderNodeTexVoronoi"); crumbs.inputs["Scale"].default_value = 420; crumbs.inputs["Randomness"].default_value = 1.0
    damp = N.new("ShaderNodeTexNoise"); damp.inputs["Scale"].default_value = 25; damp.inputs["Detail"].default_value = 6
    for t in (crumbs, damp): Lk(tc.outputs["Object"], t.inputs["Vector"])
    shade = N.new("ShaderNodeValToRGB"); r = shade.color_ramp
    r.elements[0].color = (0.012, 0.006, 0.0025, 1); r.elements[1].position = 0.8; r.elements[1].color = (0.075, 0.04, 0.016, 1)
    e = r.elements.new(0.985); e.color = (0.16, 0.12, 0.08, 1)
    hs = N.new("ShaderNodeSeparateColor"); Lk(crumbs.outputs["Color"], hs.inputs["Color"]); Lk(hs.outputs["Red"], shade.inputs["Fac"])
    wet = N.new("ShaderNodeMix"); wet.data_type = "RGBA"; wet.blend_type = "MULTIPLY"
    dr = N.new("ShaderNodeMapRange"); dr.inputs["To Min"].default_value = 0.0; dr.inputs["To Max"].default_value = 0.6
    Lk(damp.outputs["Fac"], dr.inputs["Value"]); Lk(dr.outputs["Result"], wet.inputs["Factor"]); Lk(shade.outputs["Color"], wet.inputs[6]); wet.inputs[7].default_value = (0.5, 0.42, 0.36, 1)
    Lk(wet.outputs[2], b.inputs["Base Color"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 1.0; bump.inputs["Distance"].default_value = 0.0015
    Lk(crumbs.outputs["Distance"], bump.inputs["Height"]); Lk(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.9; b.inputs["Specular IOR Level"].default_value = 0.3
    return m
EARTH = earth_material()
earth = box_cm("earth", cx0 + 0.3, cx1 - 0.3, cy0 + 3, soil, cd0 + 1.0, cd1 - 0.4, EARTH, keep=False)
sub = earth.modifiers.new("fine", "SUBSURF"); sub.subdivision_type = "SIMPLE"; sub.levels = sub.render_levels = 5
crumb = bpy.data.textures.new("crumb", "CLOUDS"); crumb.noise_scale = 0.012; crumb.noise_depth = 3
dsp = earth.modifiers.new("crumble", "DISPLACE"); dsp.texture = crumb; dsp.strength = M(0.35); dsp.mid_level = 0.5; dsp.texture_coords = "GLOBAL"
ROOT_MAT = plain("root", (0.34, 0.25, 0.15), rough=0.5, sheen=0.3)
ROOT_MAT.node_tree.nodes["Principled BSDF"].inputs["Subsurface Weight"].default_value = 0.4
HAIR = plain("root hair", (0.38, 0.3, 0.2), rough=0.7, sheen=0.5)
ROOT_RNG = random.Random(7)
def root_curve(points, r0, r1, mat):
    cu = bpy.data.curves.new("root", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = M(r0); cu.bevel_resolution = 2; cu.use_fill_caps = True
    sp_ = cu.splines.new("BEZIER"); sp_.bezier_points.add(len(points) - 1)
    for k, (bp_, v) in enumerate(zip(sp_.bezier_points, points)):
        bp_.co = v; bp_.handle_left_type = bp_.handle_right_type = "AUTO"; bp_.radius = 1 - (1 - r1 / r0) * k / (len(points) - 1)
    o = link(bpy.data.objects.new("root", cu)); o.data.materials.append(mat)
    return o
def roots(x, y, depth, spread, level, r):
    """a root that forks in two, and each in two again — pressed against the
    glass, wandering a little, finer at every fork, with hairs"""
    if level > 5 or depth < 0.9: return
    for side in (-1, 1):
        sp = spread * ROOT_RNG.uniform(0.75, 1.2); dp = depth * ROOT_RNG.uniform(0.85, 1.15)
        ex, ey = x + side * sp, y - dp
        mx = x + side * sp * ROOT_RNG.uniform(0.25, 0.55)
        g = cd0 + 0.6 + ROOT_RNG.uniform(-0.05, 0.1)
        wob = [P(x + (ex - x) * t + ROOT_RNG.uniform(-0.35, 0.35) * (0 < t < 1), y + (ey - y) * t, g) for t in (0, 0.3, 0.62, 1)]
        wob[1] = P(mx + ROOT_RNG.uniform(-0.4, 0.4), y - dp * 0.3, g)
        root_curve(wob, r, r * 0.72, ROOT_MAT)
        for _ in range(3 if level >= 3 else 1):
            t = ROOT_RNG.uniform(0.2, 0.9); hx, hy = x + (ex - x) * t, y + (ey - y) * t
            a = ROOT_RNG.uniform(-2.6, -0.5); ln = ROOT_RNG.uniform(0.5, 1.2)
            root_curve([P(hx, hy, g), P(hx + math.cos(a) * ln, hy + math.sin(a) * ln, g)], r * 0.35, r * 0.2, HAIR)
        roots(ex, ey, depth * 0.7, spread * 0.58, level + 1, max(0.04, r * 0.7))
sx_, sd_ = (cx0 + cx1) / 2, (cd0 + cd1) / 2
root_curve([P(sx_, soil + 0.5, cd0 + 0.6), P(sx_ + 0.3, soil - 1.5, cd0 + 0.6), P(sx_, soil - 3, cd0 + 0.6)], 0.26, 0.2, ROOT_MAT)
roots(sx_, soil - 3, 3.8, 6.0, 1, 0.18)
SEEDLING = plain("seedling green", (0.11, 0.26, 0.05), rough=0.4, sheen=0.3)
_sb = SEEDLING.node_tree.nodes["Principled BSDF"]; _sb.inputs["Subsurface Weight"].default_value = 0.5; _sb.inputs["Subsurface Radius"].default_value = (0.004, 0.008, 0.002)
tube("stem", [(0, 0), (0.004, 0.05), (0.002, 0.1), (0.0, 0.13)], 0.003, SEEDLING, at=tuple(P(sx_, soil, sd_)))
for a in (0.1, 0.1 + math.pi):
    lf = leaf_blade("seed leaf", tuple(P(sx_ + math.cos(a) * 3.3, soil + 12.6, sd_ + math.sin(a) * 3.3)), M(3.4), SEEDLING, squash=(1.0, 0.48, 0.1))
    lf.rotation_euler = (0, 0.3 * (1 if a < 1 else -1), a)
for a in (1.6, 1.6 + math.pi):
    lf = leaf_blade("true leaf", tuple(P(sx_ + math.cos(a) * 2.2, soil + 14.2, sd_ + math.sin(a) * 2.2)), M(2.4), SEEDLING, squash=(1.0, 0.42, 0.1))
    lf.rotation_euler = (0.35, 0, a)
# the green specimen book beside it, as the close-up has it
BOOK_SCALE = (cx1 - cx0) / 94
SPECIMEN_BOOK = build_specimen_book(at=(M((cx0 + cx1) / 2), M(cd0) + .025 * BOOK_SCALE, M(ty) - .803 * BOOK_SCALE), scale=BOOK_SCALE)
for part in SPECIMEN_BOOK.children: arch(part)

# ── light: candlelight and moonlight; the desk lamp stays off ────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
lamp("the moon", "SUN", tuple(P(-400, 1900, 2800)), aim=tuple(P(0, 0, 300)), energy=float(arg("--moon", "0.8")), colour=(0.55, 0.68, 1.0), angle=math.radians(2))
sky_l = lamp("sky through the window", "AREA", tuple(P(WIN["x"], 200, D1 + 14)), aim=tuple(P(WIN["x"], 60, 300)), energy=float(arg("--sky", "40")), colour=(0.5, 0.62, 0.95), size=0.9, size_y=1.9)
sky_l.visible_camera = False; sky_l.visible_transmission = False; sky_l.visible_glossy = False
for name, at in FLAMES.items():
    lamp(f"candle {name}", "POINT", tuple(at + Vector((0, 0, 0.02))), energy=float(arg("--candle", "6")), colour=(1.0, 0.55, 0.22), size=0.012)
fill_l = lamp("fill", "AREA", tuple(P(0, 250, 60)), aim=tuple(P(0, 100, D1)), energy=float(arg("--fill", "45")), colour=(0.8, 0.85, 1.0), size=2.6)
fill_l.visible_camera = False; fill_l.visible_glossy = False
eye_fill(float(arg("--eyefill", "14")))
clear_glass()
air = room_haze(X0, X1, 0, D1, TOP, 0)

# ── what the game is told ──────────────────────────────────────────────────
LAYOUT.thing("binarytree", "Look into the glass case", corners(cx0 - 1.5, cx1 + 1.5, cy0, cy1 + RZ, cd0 - 1.5, cd1 + 1.5))
LAYOUT.thing("plantpot", "Look out at the garden", [P(wx0, WIN["sill"], GD), P(wx1, WIN["sill"], GD), P(wx1, SPRING, GD), P(wx0, SPRING, GD)] +
             [P(WIN["x"] + math.cos(math.pi * i / 8) * WIN["hw"], SPRING + math.sin(math.pi * i / 8) * WIN["hw"], GD) for i in range(9)])
LAYOUT.thing("cryptex", "Look at the cipher wheel", corners(wh["x"] - wh["plaque"], wh["x"] + wh["plaque"], wh["y"] - wh["plaque"], wh["y"] + wh["plaque"], BF - 4, BF))
LAYOUT.chest(CHEST_LOCAL, at=(DK["x"], 0, DK["d"]), turn=DK["turn"])
for name, at in FLAMES.items():
    key = "candle" if name == "desk left" else name.replace(" ", "-")
    LAYOUT.flame(key, at)
    LAYOUT.glow(key, at + Vector((0, 0, 0.02)), 40 if name.startswith("desk") else 30)
for x0_, x1_ in ((wx0, WIN["x"]), (WIN["x"], wx1)):
    LAYOUT.pane([P(x0_ + 4, WIN["sill"] + 8, GD), P(x1_ - 4, WIN["sill"] + 8, GD), P(x1_ - 4, SPRING - 5.5, GD), P(x0_ + 4, SPRING - 5.5, GD)])
LAYOUT.pane([P(WIN["x"] + math.cos(math.pi * i / 24) * r_in, SPRING + math.sin(math.pi * i / 24) * r_in, GD) for i in range(25)])
# (dust, in the candlelight and moonlight over the desk)
LAYOUT.dust([P(DK["x"] - 60, 90, DK["d"]), P(DK["x"] + 60, 200, DK["d"])])
with open(os.path.join(OUT, "Study.json"), "w", encoding="utf-8") as metadata:
    json.dump(LAYOUT.data, metadata, indent=2)

# ── the passes ─────────────────────────────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "2.0")))
scene.render.use_persistent_data = True
finish(scene, SAMPLES, keep_gloss=("white glass shade", "glass", "window glass", "glazed jar"))
if STILL:
    render(scene, os.path.join(OUT, "still.png"))
else:
    # Keep the shared plate name; it does not represent a puzzle or light state.
    plates = {"lights-1": (lambda: None, lambda: None)} if "plates" in ONLY else {}
    passes(scene, OUT, set(plates), air, apart={"chest": CHEST_PARTS}, variants=plates)
    if "chest" in ONLY:
        air.hide_render = True
        chest_sprites(scene, OUT, LAYOUT.data["chest"]["box"], chest_body, chest_hinge, lid_parts)
print("ROOM_DONE")
