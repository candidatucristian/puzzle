# Room II, the library — where the house kept its books and its accounts —
# built in three dimensions and rendered with Cycles, seen from its door down
# the length of the room.
#
# A long room panelled in walnut under a coffered ceiling, a herringbone
# parquet. Down the left-hand wall the bookcases, floor to cornice, and in
# front of them a leather armchair turned to the room, a standard lamp behind
# it, a little table at its elbow. In the right-hand wall two tall sash
# windows between red velvet curtains, the moon in one of them, its light
# lying in long panes across the floor and over the table. Down the middle a
# long reading table on turned legs, standing free: at its near end an old
# router under a green-shaded banker's lamp, a ledger, the gilt chest; two
# chairs pulled out from it. At the far end the clerk's desk, turned to the
# room: an alarm clock, a clock radio, a folding travel clock and a
# calculator on it under a small lamp, and a red LED clock on the wall over
# it — every one of them stopped, their faces the puzzle's own
# (clock_faces.mjs). Beside it the end wall is books, a ladder against them,
# and on one shelf five books stand a little out, a paper slip in each.
#
# Each puzzle has its own light, which burns until it is solved: the standard
# lamp (the books), the green lamp and the router's light (the router), the
# clerk's lamp and every clock's face (the clocks). A plate for each way they
# can stand (lights-<shelf><desk><clock>), the chest apart, and where it all
# fell in the picture (src/levels/house/rooms/Room2.json).
#
#   blender -b --factory-startup -P art/blender/room_library.py -- [--samples 256] [--width 2560] [--only plates,chest]

import bpy, bmesh, math, os, sys, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *

OUT = os.path.join(ROOT, ".artifacts/room-library")
os.makedirs(OUT, exist_ok=True)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")        # room_boards.mjs, clock_faces.mjs
SAMPLES = int(arg("--samples", "256"))
WIDTH = int(arg("--width", "2560"))
ONLY = set(arg("--only", "plates,chest").split(","))
RNG = random.Random(1961)

# ── the room, and where we stand in it ─────────────────────────────────────
X0, X1, D1, TOP = -250, 250, 820, 340
EYE = (float(arg("--ex", "-30")), float(arg("--ey", "150")), float(arg("--ed", "30")))
LOOK = (float(arg("--lx", "25")), float(arg("--ly", "142")), float(arg("--ld", "820")))
scene, HEIGHT = stage(WIDTH, eye=EYE, look=LOOK, lens=float(arg("--lens", "24")), lift=float(arg("--lift", "-0.05")))
WINDOWS = (470, 680)                             # the sashes in the right-hand wall (their middles, along d)
WIN = dict(hw=52, sill=80, top=284)
TABLE = dict(x0=-55, x1=55, d0=250, d1=530, h=77)
CLERK = dict(at=(-125, 0, 690), turn=math.radians(10), w=128, deep=60, h=76)
STAND = dict(x=-218, d=548, shade=150)
CASE_X = (-12, X1 - 2)                           # the bookcase across the end wall

# ── materials ──────────────────────────────────────────────────────────────
WALNUT = scan("walnut", "rosewood_veneer1", size=0.7, tint=(0.62, 0.42, 0.3), bright=0.48, sat=0.9, rough=(0.2, 0.4), bump=0.2, coat=0.5, upright=True)
WALNUT_X = scan("walnut across", "rosewood_veneer1", size=0.7, tint=(0.62, 0.42, 0.3), bright=0.46, sat=0.9, rough=(0.2, 0.4), bump=0.2, coat=0.5)
DESK_WOOD = scan("mahogany", "dark_wood", size=1.0, tint=(0.85, 0.55, 0.38), bright=0.55, rough=(0.22, 0.45), bump=0.25, coat=0.5, upright=True)
OAK = scan("oak", "dark_wood", size=1.0, tint=(0.82, 0.62, 0.44), bright=0.55, rough=(0.3, 0.55), bump=0.3, coat=0.35, upright=True)
OAK_X = scan("oak across", "dark_wood", size=1.0, tint=(0.82, 0.62, 0.44), bright=0.52, rough=(0.3, 0.55), bump=0.3, coat=0.35)
LEATHER = scan("desk leather", "brown_leather", size=0.5, tint=(0.35, 0.45, 0.28), bright=0.5, rough=(0.35, 0.6), bump=0.4)
BRASS = aged_metal("brass", (0.55, 0.39, 0.17), (0.08, 0.055, 0.025), rough=(0.22, 0.5), scale=30, tarnish=0.55)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
BLACK = plain("black plastic", (0.015, 0.015, 0.017), rough=0.35, coat=0.3)
ALU = aged_metal("aluminium", (0.6, 0.62, 0.64), (0.3, 0.3, 0.3), rough=(0.3, 0.5), scale=20, tarnish=0.2)
PAGES = plain("pages", (0.3, 0.26, 0.19), rough=0.9)
FRAME = plain("window paint", (0.05, 0.04, 0.035), rough=0.45)
PLASTER = scan("ceiling", "plastered_wall_04", size=2.0, tint=(0.75, 0.68, 0.58), bright=0.55, sat=0.3, rough=(0.8, 0.95), bump=0.5)
RED_VELVET = scan("red velvet", "velour_velvet", size=0.5, tint=(0.62, 0.2, 0.18), bright=0.36, sat=1.0, rough=(0.82, 0.95), bump=0.15)
RED_VELVET.node_tree.nodes["Principled BSDF"].inputs["Sheen Weight"].default_value = 0.2
RED_VELVET.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.2
PRINT = picture("botanical print", os.path.join(DRAWN, "study-print.png"), rough=0.9)
spine_mat = picture("spines", os.path.join(DRAWN, "spines.png"), rough=0.5, coat=0.15, bump=0.3)
COVERS = cover_materials()
LAYOUT = Layout("Room2")

# ── the shell: walnut panelling, a coffered ceiling, a herringbone floor ───
def parquet(x0, x1, d0, d1, L=35.0, W=7.0):
    """blocks of oak laid in herringbone, their grain along their length,
    each a little lighter or darker than the next"""
    me = bpy.data.meshes.new("parquet"); bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    k = round(L / W); c, s = math.cos(math.pi / 4), math.sin(math.pi / 4)
    world = lambda u, v: (x0 + (x1 - x0) / 2 + (u * c - v * s) * W, d0 + (u * s + v * c) * W)
    span = int((max(x1 - x0, d1 - d0) / W) * 1.6) + k
    gap = 0.12 / W
    for i in range(-span, span):
        for j in range(-span // k - 2, span // k + 2):
            ox, oy = i + j * k, i - j * k
            for (ax, ay, bx, by, along) in ((ox, oy, ox + k, oy + 1, True), (ox, oy + 1, ox + 1, oy + 1 + k, False)):
                pts = [world(ax + gap, ay + gap), world(bx - gap, ay + gap), world(bx - gap, by - gap), world(ax + gap, by - gap)]
                mx, md = sum(p[0] for p in pts) / 4, sum(p[1] for p in pts) / 4
                if not (x0 - 10 < mx < x1 + 10 and d0 - 10 < md < d1 + 10): continue
                f = bm.faces.new([bm.verts.new(tuple(P(px, 0.0, pd))) for px, pd in pts])
                ou, ov = RNG.uniform(0, 3), RNG.uniform(0, 3)
                for lp, (cu, cv) in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
                    lu, lv = (cu * L, cv * W) if along else (cv * L, cu * W)
                    lp[uv].uv = (ou + M(lu), ov + M(lv))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("parquet", me))
    m = scan("parquet", "dark_wood", size=1.0, tint=(0.85, 0.6, 0.4), bright=0.55, rough=(0.2, 0.45), bump=0.3, coat=0.45, uvs=True)
    N = m.node_tree.nodes; geo = N.new("ShaderNodeNewGeometry"); hs = next(n for n in N if n.type == "HUE_SAT")
    vr = N.new("ShaderNodeMapRange"); vr.inputs["To Min"].default_value = 0.42; vr.inputs["To Max"].default_value = 0.7
    m.node_tree.links.new(geo.outputs["Random Per Island"], vr.inputs["Value"]); m.node_tree.links.new(vr.outputs["Result"], hs.inputs["Value"])
    o.data.materials.append(m)
    return arch(o)
parquet(X0, X1, -20, D1)
box_cm("subfloor", X0 - 20, X1 + 20, -6, -0.05, -40, D1 + 20, plain("joints", (0.01, 0.007, 0.005), rough=1))
box_cm("ceiling", X0 - 20, X1 + 20, TOP, TOP + 10, -40, D1 + 20, PLASTER)
for d in range(110, D1, 95):
    box_cm("coffer beam", X0, X1, TOP - 20, TOP, d - 7, d + 7, WALNUT_X, 1.0)
for x in (-125, 0, 125):
    box_cm("coffer beam", x - 7, x + 7, TOP - 20, TOP, -40, D1, WALNUT_X, 1.0)
box_cm("wall", X0 - 25, X0, 0, TOP, -40, D1 + 20, WALNUT)
right = box_cm("wall", X1, X1 + 25, 0, TOP, -40, D1 + 20, WALNUT)
box_cm("door wall", X0 - 25, X1 + 25, 0, TOP, -65, -40, WALNUT)
box_cm("end wall", X0 - 25, X1 + 25, 0, TOP, D1, D1 + 25, WALNUT)
for c in WINDOWS:
    boolean_cut(right, box("cut", M(X1 - 10), M(X1 + 50), M(c - WIN["hw"]), M(c + WIN["hw"]), M(WIN["sill"]), M(WIN["top"]), FRAME))
def panels(along_x, at, facing, a, b, keep_out=()):
    """raised panels on a wall (at x or d = `at`, its face toward `facing`)
    between a and b along it: a dado row, a tall row over it, a frieze, the
    rails and stiles round them"""
    def on(p0, p1, y0, y1, proud, mat, r=0.0):
        q0, q1 = sorted((at, at + facing * proud))
        if along_x: box_cm("panelling", p0, p1, y0, y1, q0, q1, mat, r)
        else: box_cm("panelling", q0, q1, y0, y1, p0, p1, mat, r)
    on(a, b, 0, 16, 3.0, WALNUT_X, 0.6)
    on(a, b, 88, 96, 3.5, WALNUT_X, 1.0)
    on(a, b, 296, 304, 3.0, WALNUT_X, 0.8)
    on(a, b, TOP - 18, TOP, 7.0, WALNUT_X, 1.5)
    n = max(1, round((b - a) / 62))
    for k in range(n):
        p0 = a + k * (b - a) / n + 6; p1 = a + (k + 1) * (b - a) / n - 6
        if any(lo - 4 < (p0 + p1) / 2 < hi + 4 for lo, hi in keep_out): continue
        for (y0, y1) in ((24, 82), (104, 288), (310, TOP - 24)):
            on(p0, p1, y0, y1, 1.2, WALNUT, 0.4)
            on(p0 + 5, p1 - 5, y0 + 5, y1 - 5, 2.2, WALNUT, 1.6)
panels(False, X1, -1, -40, D1, keep_out=tuple((c - WIN["hw"] - 10, c + WIN["hw"] + 10) for c in WINDOWS))
panels(True, D1, -1, X0, CASE_X[0])
panels(False, X0, 1, -40, 110)

# ── the windows: tall sashes in the right-hand wall, red velvet ────────────
REVEAL = 26
def sash_window():
    """a sash window as if in a back wall at d 0, its middle at x 0: the
    reveals, the sill, the two sashes (the upper one outside the lower), the
    curtains either side"""
    hw, sill, top = WIN["hw"], WIN["sill"], WIN["top"]
    box_cm("reveal", -hw - 3, -hw, sill, top, 0, REVEAL, WALNUT)
    box_cm("reveal", hw, hw + 3, sill, top, 0, REVEAL, WALNUT)
    box_cm("reveal head", -hw - 3, hw + 3, top, top + 3, 0, REVEAL, WALNUT)
    box_cm("sill", -hw - 10, hw + 10, sill - 4, sill, -10, REVEAL - 6, WALNUT_X, 1.0)
    box_cm("apron", -hw - 6, hw + 6, sill - 16, sill - 4, -2.5, 0, WALNUT_X, 0.6)
    mid = (sill + top) / 2
    for (y0, y1, dd) in ((sill + 1, mid + 2, REVEAL - 8), (mid - 2, top - 1, REVEAL - 13)):
        box_cm("sash", -hw + 1, -hw + 6, y0, y1, dd - 2.5, dd + 2.5, FRAME, 0.5); box_cm("sash", hw - 6, hw - 1, y0, y1, dd - 2.5, dd + 2.5, FRAME, 0.5)
        box_cm("sash", -hw + 1, hw - 1, y0, y0 + 6, dd - 2.5, dd + 2.5, FRAME, 0.5); box_cm("sash", -hw + 1, hw - 1, y1 - 6, y1, dd - 2.5, dd + 2.5, FRAME, 0.5)
        box_cm("glazing bar", -1.1, 1.1, y0 + 6, y1 - 6, dd - 1.5, dd + 1.5, FRAME, 0.3)
        box_cm("glazing bar", -hw + 6, hw - 6, (y0 + y1) / 2 - 1.1, (y0 + y1) / 2 + 1.1, dd - 1.5, dd + 1.5, FRAME, 0.3)
        box_cm("glass", -hw + 5, hw - 5, y0 + 5, y1 - 5, dd - 0.3, dd + 0.3, GLASS)
    curtain(RNG, -hw - 64, -hw - 2, -8, 312, RED_VELVET, folds=4, deep=9)
    curtain(RNG, hw + 2, hw + 64, -8, 312, RED_VELVET, folds=4, deep=9)
    box_cm("pelmet", -hw - 74, hw + 74, 312, 330, -16, 0, WALNUT_X, 1.2)
SASHES = []                                     # the glass panes, in each window's frame
for c in WINDOWS:
    # (built as if in a back wall, turned to stand in the right-hand one: its
    # outside toward +x)
    assembled("sash window", sash_window, at=(X1, 0, c), turn=-math.pi / 2)
    f = framed((X1, 0, c), -math.pi / 2)
    mid = (WIN["sill"] + WIN["top"]) / 2
    for (y0, y1, dd) in ((WIN["sill"] + 6, mid - 3, REVEAL - 8), (mid + 3, WIN["top"] - 6, REVEAL - 13)):
        SASHES.append([f(x, y, dd) for x, y in ((-WIN["hw"] + 5, y0), (WIN["hw"] - 5, y0), (WIN["hw"] - 5, y1), (-WIN["hw"] + 5, y1))])
# the garden beyond (the moon high over it, out of sight)
MOON_AT = P(2500, 3000, 1550)
garden(MOON_AT, [("island_tree_01", 1000, 1150, 10.0, 0.3), ("island_tree_02", 1500, 2300, 12.0, 1.4), ("tree_small_02", 700, 1250, 5.0, 2.2),
                  ("shrub_02", 420, 420, 1.5, 0.6), ("shrub_02", 460, 900, 1.7, 2.0), ("island_tree_01", 2200, 2800, 11.0, 2.9)],
       (X1 + 30, 3500, -1500, 4000, -40), P(2118, 700, 3406), sky_size=50)

# ── down the left-hand wall: the bookcases ─────────────────────────────────
bookcase(RNG, X0, -1, 120, D1 - 2, TOP - 20, OAK, OAK_X, spine_mat, COVERS, PAGES, depth=34,
         levels=(9, 48, 87, 126, 165, 204, 243, 282, TOP - 20), bays=7, glass=GLASS)
# across the end wall, books again; five of them standing out on the shelf at the eye
MARKED_ROW = 4
def end_bookcase():
    bookcase(RNG, 0, -1, 0, CASE_X[1] - CASE_X[0], TOP - 20, OAK, OAK_X, spine_mat, COVERS, PAGES, depth=34,
             levels=(9, 48, 87, 126, 165, 204, 243, 282, TOP - 20), bays=4, glass=GLASS,
             marked=lambda r, n: r == MARKED_ROW and 20 <= n < 30 and n % 2 == 0)
assembled("end bookcase", end_bookcase, at=(CASE_X[0], 0, D1), turn=-math.pi / 2)
def ladder():
    for e in (-1, 1):
        box_cm("ladder rail", e * 22 - 2, e * 22 + 2, 0, 300, -2, 2, OAK, 0.6)
    for k in range(11):
        y = 22 + k * 26
        box_cm("rung", -22, 22, y, y + 3, -1.5, 1.5, OAK, 0.5)
lad = assembled("ladder", ladder, at=(185, 0, D1 - 34 - 76))
lad.rotation_euler = (math.radians(-14), 0, math.radians(-4))
rod("ladder rail", P(CASE_X[0], 318, D1 - 36), P(CASE_X[1], 318, D1 - 36), M(1.2), BRASS, verts=16)

# ── the reading nook: an armchair, the standard lamp, a little table ──────
darken_model(import_model("ArmChair_01", height=M(98), at=tuple(P(-172, 0, 468)), rot=float(arg("--armchair", "0.7"))), (0.3, 0.17, 0.1))
sx, sd = STAND["x"], STAND["d"]
lathe("standard lamp", [(0, 0), (0.15, 0), (0.15, 0.02), (0.06, 0.05), (0.02, 0.1), (0.014, 0.2), (0.014, M(STAND["shade"] - 5)), (0.02, M(STAND["shade"] - 3)), (0.008, M(STAND["shade"] + 8)), (0, M(STAND["shade"] + 8))], BRASS, at=tuple(P(sx, 0, sd)), steps=40)
STAND_SHADE = shade_material("standard lamp shade", (0.72, 0.58, 0.38), glow=(1.0, 0.6, 0.28), strength=0.5, through=0.05)
pleated_shade(sx, sd, STAND["shade"] - 2, STAND["shade"] + 26, 24, 15, STAND_SHADE)
stand_l = lamp("standard lamp bulb", "POINT", tuple(P(sx, STAND["shade"] + 12, sd)), energy=float(arg("--stand", "70")), colour=(1.0, 0.68, 0.36), size=0.03)
darken_model(import_model("side_table_01", height=M(58), at=tuple(P(-200, 0, 392)), rot=0.4), (0.34, 0.22, 0.15))
o = book(RNG, 0, 0, 0, 3.0, 23, 16, spine_mat, COVERS, PAGES); o.rotation_euler = (math.pi / 2, 0, 0.3); o.location = P(-200, 59.6, 392)

# ── down the middle: the reading table, the router, the green lamp ────────
T = TABLE
turned_table(T, DESK_WOOD)
box_cm("stretcher", -2, 2, 12, 16, T["d0"] + 6, T["d1"] - 6, DESK_WOOD, 0.4)
th = T["h"]
gx, gd = 30, 296
lathe("banker's lamp", [(0, 0), (0.065, 0), (0.065, 0.015), (0.03, 0.025), (0.012, 0.03), (0.009, 0.34), (0, 0.34)], BRASS, at=tuple(P(gx, th, gd)), steps=32)
tube("shade arm", [(0, 0.3), (0.0, 0.36), (0.05, 0.38)], 0.005, BRASS, at=tuple(P(gx, th, gd)), rot=-math.pi / 2)
GREEN_GLASS = bpy.data.materials.new("green glass shade"); GREEN_GLASS.use_nodes = True
_g = GREEN_GLASS.node_tree.nodes["Principled BSDF"]; _g.inputs["Base Color"].default_value = (0.008, 0.09, 0.03, 1); _g.inputs["Roughness"].default_value = 0.08; _g.inputs["Coat Weight"].default_value = 1.0
_g.inputs["Emission Color"].default_value = (0.05, 0.7, 0.2, 1); _g.inputs["Emission Strength"].default_value = 0.22
sh = cylinder("green shade", 0, 0, M(-13), M(13), M(6.5), GREEN_GLASS, verts=48)
sh.rotation_euler = (0, math.pi / 2, 0); sh.location = P(gx, th + 38, gd - 6)
boolean_cut(sh, box("cut", M(gx - 20), M(gx + 20), M(gd - 20), M(gd + 8), M(th + 30), M(th + 38), GLASS))
so = sh.modifiers.new("thick", "SOLIDIFY"); so.thickness = M(0.35)
desk_l = lamp("green lamp", "POINT", tuple(P(gx, th + 36.5, gd - 10)), energy=float(arg("--green", "14")), colour=(1.0, 0.8, 0.52), size=0.012)
# the router, toward us: a black box, a row of little lights along its front, two aerials
R = dict(x0=-26, x1=8, d0=276, d1=298, y0=th, y1=th + 7.5)
box_cm("router", R["x0"], R["x1"], R["y0"] + 0.6, R["y1"], R["d0"], R["d1"], BLACK, 0.8)
for e in (0.12, 0.88):
    for dd in (R["d0"] + 3, R["d1"] - 3): cylinder("foot", M(R["x0"] + (R["x1"] - R["x0"]) * e), M(dd), M(R["y0"]), M(R["y0"] + 0.6), M(0.8), BLACK, verts=12)
LED_ON = plain("led lit", (0.05, 0.3, 0.1), emit=(0.25, 1.0, 0.45), strength=25)
LED_OFF = plain("led", (0.02, 0.06, 0.03), rough=0.2, coat=0.8)
led_at = lambda i: P(R["x0"] + (R["x1"] - R["x0"]) * (0.14 + i * 0.06), R["y0"] + 2.6, R["d0"] - 0.05)
for i in range(13):
    sphere("led", tuple(led_at(i)), M(0.35), LED_ON if i == 0 else LED_OFF, squash=(1, 0.5, 1))
for e in (0.15, 0.85):
    cylinder("aerial", M(R["x0"] + (R["x1"] - R["x0"]) * e), M(R["d1"] - 2), M(R["y1"]), M(R["y1"] + 16), M(0.5), BLACK, verts=12)
cu = bpy.data.curves.new("router lead", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = M(0.25); spl = cu.splines.new("BEZIER"); spl.bezier_points.add(3)
for bp_, v in zip(spl.bezier_points, (P(R["x0"] + 3, R["y0"] + 3, R["d1"]), P(R["x0"] - 6, th + 0.4, R["d1"] + 14), P(T["x0"] - 1, th - 6, R["d1"] + 30), P(T["x0"] - 8, 0.4, R["d1"] + 60))):
    bp_.co = v; bp_.handle_left_type = bp_.handle_right_type = "AUTO"
link(bpy.data.objects.new("router lead", cu)).data.materials.append(BLACK)
# a ledger open on the table, a pen across it; books in a pile further down
LEDGER = paper("ledger", (0.66, 0.6, 0.48), 0.3)
lg = card("ledger", [P(-21, 0, -14), P(21, 0, -14), P(21, 0, 14), P(-21, 0, 14)], LEDGER); lg.location = P(8, th + 0.65, 392); lg.rotation_euler = (0, 0, 0.12)
bd = box_cm("ledger boards", -22, 22, 0, 0.6, -15, 15, scan("ledger cloth", "brown_leather", size=0.3, tint=(0.4, 0.15, 0.1), bright=0.4), 0.3, keep=False); bd.location = P(8, th, 392); bd.rotation_euler = (0, 0, 0.12)
tube("pen", [(0, 0), (0.15, 0.003)], 0.004, plain("pen", (0.02, 0.02, 0.02), rough=0.3), at=tuple(P(0, th + 0.9, 398)), rot=0.7)
for k in range(5):
    o = book(RNG, 0, 0, 0, 3.4, 26 - k * 1.2, 18 - k * 0.5, spine_mat, COVERS, PAGES)
    o.rotation_euler = (math.pi / 2, 0, RNG.uniform(-0.25, 0.25) + 1.57); o.location = P(-28, th + 1.7 + k * 3.4, 486)
import_model("round_spectacles", width=M(13), at=tuple(P(24, th + 0.4, 430)), rot=2.1)
# the chairs pulled out from it
import_model("dining_chair_02", height=M(97), at=tuple(P(96, 0, 548)), rot=-math.pi / 2 - 0.35)
import_model("dining_chair_02", height=M(97), at=tuple(P(-92, 0, 500)), rot=math.pi / 2 + 0.2)
# the chest, beyond the ledger
CHEST = dict(x0=-38, x1=-17, d0=340, d1=355, y0=th + 1, y1=th + 11.5, lid=7.7)
chest_body, chest_hinge, lid_parts = chest(CHEST)
CHEST_PARTS = chest_body + lid_parts
rug(-150, 150, 210, 590, rug_material("rug", os.path.join(DRAWN, "library-rug.png"), sat=1.0, value=0.5))

# ── at the far end: the clerk's desk, its lamp and its clocks ─────────────
CK = CLERK
FACES = []
def display(i, corners_, strength=6.0, lcd=False):
    """a clock's face: its unlit bars always there, its lit ones glowing
    while the clocks have their light"""
    m = bpy.data.materials.new(f"clock face {i}"); m.use_nodes = True
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    dim = N.new("ShaderNodeTexImage"); dim.image = bpy.data.images.load(os.path.join(DRAWN, f"clock-{i}-dim.png"), check_existing=True)
    lit = N.new("ShaderNodeTexImage"); lit.image = bpy.data.images.load(os.path.join(DRAWN, f"clock-{i}-lit.png"), check_existing=True)
    if lcd: b.inputs["Base Color"].default_value = (0.09, 0.1, 0.085, 1)
    else: Lk(dim.outputs["Color"], b.inputs["Base Color"])
    Lk(lit.outputs["Color"], b.inputs["Emission Color"]); b.inputs["Emission Strength"].default_value = strength
    b.inputs["Roughness"].default_value = 0.15 if not lcd else 0.5; b.inputs["Coat Weight"].default_value = 0.6 if not lcd else 0.0
    FACES.append(m)
    return card(f"face {i}", corners_, m)
def front(x0, x1, y0, y1, d):
    return [P(x0, y0, d), P(x1, y0, d), P(x1, y1, d), P(x0, y1, d)]
TIN = plain("black tin", (0.02, 0.022, 0.025), rough=0.4, metal=0.6)
OFFICE_BULB = plain("office bulb", (1, 0.9, 0.7), emit=(1.0, 0.8, 0.5), strength=12)
CASE_LEATHER = scan("case leather", "brown_leather", size=0.3, tint=(0.6, 0.3, 0.2), bright=0.45, rough=(0.35, 0.6), bump=0.5)
def clerks_desk():
    w, dp, h = CK["w"], CK["deep"], CK["h"]
    x0, d0 = -w / 2, -dp / 2
    pedestal_desk(dict(x0=x0, x1=w / 2, d0=d0, d1=dp / 2, h=h), DESK_WOOD, LEATHER, BRASS)
    at = lambda fx, dd=2.0: (x0 + w * fx, dd)
    # the lamp: a small brass one with a black tin shade, bent over the desk
    lx, ld = x0 + 14, 8
    lathe("lamp foot", [(0, 0), (0.07, 0), (0.07, 0.012), (0.02, 0.025), (0, 0.025)], BRASS, at=tuple(P(lx, h, ld)), steps=32)
    tube("lamp arm", [(0, 0.02), (-0.02, 0.14), (0.06, 0.23)], 0.006, BRASS, at=tuple(P(lx, h, ld)), rot=0.0)
    shade_o = lathe("tin shade", [(0, 0), (0.025, 0), (0.07, 0.07), (0.072, 0.075), (0.068, 0.075), (0.022, 0.006), (0, 0.006)], TIN, at=tuple(P(lx + 8, h + 25.5, ld)), steps=40)
    shade_o.rotation_euler = (0, math.radians(200), 0)
    sphere("bulb", tuple(P(lx + 9.5, h + 21, ld)), M(2.4), OFFICE_BULB)
    # the alarm clock: a black cube with an amber face and a bar on top to stop it
    ax, ad = at(0.36)
    box_cm("alarm clock", ax - 6.5, ax + 6.5, h, h + 10, ad - 4, ad + 4, BLACK, 1.2)
    box_cm("snooze bar", ax - 4.4, ax + 4.4, h + 10, h + 11.3, ad - 2, ad + 2, plain("grey", (0.12, 0.13, 0.15), rough=0.4), 0.4)
    box_cm("alarm window", ax - 5.4, ax + 5.4, h + 2.8, h + 8.4, ad - 4.15, ad - 4.0, plain("smoked glass", (0.01, 0.006, 0.004), rough=0.08, coat=1.0))
    display(2, front(ax - 4.6, ax + 4.6, h + 3.7, h + 7.5, ad - 4.2), strength=5)
    # the clock radio: a long set with walnut cheeks, a green display, a speaker grille
    rx, rd = at(0.62, 6)
    box_cm("radio", rx - 13.5, rx + 13.5, h, h + 10.5, rd - 6, rd + 6, BLACK, 0.8)
    for e in (-1, 1): box_cm("radio cheek", rx + e * 13.5 - (1 if e > 0 else 0), rx + e * 13.5 + (0 if e > 0 else 1), h, h + 10.5, rd - 6.2, rd + 6.2, WALNUT, 0.5)
    box_cm("radio window", rx - 11.4, rx + 1, h + 2.1, h + 7.5, rd - 6.15, rd - 6.0, plain("radio glass", (0.004, 0.01, 0.006), rough=0.08, coat=1.0))
    display(1, front(rx - 10.4, rx, h + 2.9, h + 6.7, rd - 6.2), strength=5)
    for k in range(6): box_cm("grille", rx + 2.4, rx + 11.4, h + 2.3 + k * 1.1, h + 2.6 + k * 1.1, rd - 6.2, rd - 6.0, plain("grille", (0.25, 0.26, 0.28), rough=0.5, metal=0.6))
    for k in (-8.6, -5.8): lathe("knob", [(0, 0), (0.007, 0), (0.007, 0.008), (0, 0.009)], plain("knob", (0.3, 0.31, 0.33), rough=0.3, metal=0.7), at=tuple(P(rx + k, h + 1.9, rd - 6.1)), steps=16).rotation_euler = (math.pi / 2, 0, 0)
    # the travel clock: a little folding one standing open in its leather case
    tx, td = at(0.86)
    box_cm("travel case", tx - 5.2, tx + 5.2, h, h + 1.4, td - 3, td + 4, CASE_LEATHER, 0.5)
    lid = box_cm("travel lid", -5.2, 5.2, 0, 9, -0.7, 0.7, CASE_LEATHER, 0.5, keep=False); lid.location = P(tx, h + 1, td + 2); lid.rotation_euler = (-0.25, 0, 0)
    box_cm("travel bezel", tx - 4.4, tx + 4.4, h + 1.6, h + 9.4, td + 0.8, td + 1.6, BRASS, 0.4)
    display(3, front(tx - 3.9, tx + 3.0, h + 3.2, h + 7.6, td + 0.75), strength=1.4, lcd=True)
    # the calculator, lying flat toward us
    cx0, cx1, cd0, cd1 = x0 + w * 0.44, x0 + w * 0.62, d0 + 7, d0 + 22
    box_cm("calculator", cx0, cx1, h, h + 1.4, cd0, cd1, plain("calculator", (0.06, 0.065, 0.075), rough=0.4), 0.4)
    box_cm("calculator window", cx0 + 1.5, cx1 - 1.5, h + 1.4, h + 1.5, cd1 - 4, cd1 - 1, plain("calc lcd", (0.25, 0.28, 0.22), rough=0.3))
    for r in range(4):
        for c in range(4):
            x = cx0 + 1.5 + c * (cx1 - cx0 - 3) / 4; dd = cd0 + 1.2 + r * 2.4
            box_cm("key", x + 0.3, x + (cx1 - cx0 - 3) / 4 - 0.3, h + 1.4, h + 1.9, dd, dd + 1.8, plain(f"key {c == 3}", (0.35, 0.16, 0.08) if c == 3 else (0.02, 0.02, 0.025), rough=0.4), 0.2)
assembled("clerk's desk", clerks_desk, at=CK["at"], turn=CK["turn"])
CF = framed(CK["at"], CK["turn"])
OFFICE_BULB_AT = CF(-CK["w"] / 2 + 23.5, CK["h"] + 21, 8)
office_l = lamp("office lamp", "SPOT", tuple(OFFICE_BULB_AT), aim=tuple(CF(-CK["w"] / 2 + 48, CK["h"], 0)), energy=float(arg("--office", "35")), colour=(1.0, 0.7, 0.4), size=0.02, spot=math.radians(110))
import_model("dining_chair_02", height=M(97), at=tuple(P(-48, 0, 636)), rot=math.pi + 1.1)
# the LED clock on the end wall over it, its lead down the wall
LED_CLOCK = dict(x=CK["at"][0] + 4, y0=168, y1=190, w=54)
ck = LED_CLOCK
box_cm("wall clock", ck["x"] - ck["w"] / 2, ck["x"] + ck["w"] / 2, ck["y0"], ck["y1"], D1 - 4, D1, ALU, 1.0)
box_cm("wall clock glass", ck["x"] - ck["w"] / 2 + 2, ck["x"] + ck["w"] / 2 - 2, ck["y0"] + 2, ck["y1"] - 2, D1 - 4.15, D1 - 4.0, plain("red filter", (0.02, 0.004, 0.003), rough=0.06, coat=1.0))
w_, h_ = ck["w"], ck["y1"] - ck["y0"]
display(0, front(ck["x"] - w_ * 0.38, ck["x"] + w_ * 0.38, ck["y0"] + h_ * 0.22, ck["y0"] + h_ * 0.78, D1 - 4.2), strength=7)
cu = bpy.data.curves.new("lead", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = M(0.25); spl = cu.splines.new("BEZIER"); spl.bezier_points.add(2)
for bp_, v in zip(spl.bezier_points, (P(ck["x"] + 18, ck["y0"], D1 - 1), P(ck["x"] + 20, ck["y0"] - 60, D1 - 4.2), P(ck["x"] + 16, 14, D1 - 4.2))): bp_.co = v; bp_.handle_left_type = bp_.handle_right_type = "AUTO"
arch(link(bpy.data.objects.new("lead", cu))).data.materials.append(BLACK)
# a print framed on the end wall's panels, by the clock
px0, px1, py0, py1 = X0 + 30, X0 + 92, 140, 140 + 62 * 1.35
for (a, b, c, e) in ((px0 - 4, px1 + 4, py0 - 4, py0), (px0 - 4, px1 + 4, py1, py1 + 4), (px0 - 4, px0, py0, py1), (px1, px1 + 4, py0, py1)):
    box_cm("frame", a, b, c, e, D1 - 6, D1 - 3, WALNUT_X, 0.6)
arch(card("print", front(px0, px1, py0, py1, D1 - 4.2), PRINT))
# a palm in a brass pot between the windows
lathe("brass pot", [(0, 0), (0.13, 0), (0.17, 0.2), (0.18, 0.22), (0, 0.21)], BRASS, at=tuple(P(X1 - 34, 0, (WINDOWS[0] + WINDOWS[1]) / 2)), steps=40)
import_model("potted_plant_02", height=M(130), at=tuple(P(X1 - 34, 4, (WINDOWS[0] + WINDOWS[1]) / 2)), rot=2.0)

# ── light ──────────────────────────────────────────────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
# (the moon high over the garden on the right, its light falling in across the room)
MOON_FROM, MOON_TO = P(2500, 3000, 1550), P(0, 0, 350)
lamp("the moon", "SUN", tuple(MOON_FROM), aim=tuple(MOON_TO), energy=float(arg("--moon", "3.0")), colour=(0.55, 0.68, 1.0), angle=math.radians(1.5))
for c in WINDOWS:
    sky_l = lamp("sky through the window", "AREA", tuple(P(X1 + 14, 190, c)), aim=tuple(P(0, 60, c - 40)), energy=float(arg("--sky", "18")), colour=(0.5, 0.62, 0.95), size=1.8, size_y=1.0)
    sky_l.visible_camera = False; sky_l.visible_transmission = False; sky_l.visible_glossy = False
fill_l = lamp("fill", "AREA", tuple(P(0, 260, 40)), aim=tuple(P(0, 90, D1)), energy=float(arg("--fill", "60")), colour=(0.95, 0.88, 0.85), size=2.4)
fill_l.visible_camera = False; fill_l.visible_glossy = False
for d in (300, 640):
    l_ = lamp("bookcase glow", "AREA", tuple(P(X0 + 110, TOP - 40, d)), aim=tuple(P(X0, 120, d)), energy=float(arg("--shelf", "22")), colour=(1.0, 0.72, 0.45), size=0.4, size_y=2.4)
    l_.visible_camera = False; l_.visible_glossy = False
end_l = lamp("end wall glow", "AREA", tuple(P(110, TOP - 40, D1 - 160)), aim=tuple(P(110, 110, D1)), energy=float(arg("--end", "26")), colour=(1.0, 0.72, 0.45), size=2.4, size_y=0.4)
end_l.visible_camera = False; end_l.visible_glossy = False
LIGHTS = [Light("shelf", [stand_l], [STAND_SHADE]), Light("desk", [desk_l], [GREEN_GLASS, LED_ON]), Light("clock", [office_l], [OFFICE_BULB] + FACES)]
clear_glass()
air = room_haze(X0, X1, 0, D1, TOP, float(arg("--haze", "0.014")))

# ── what the game is told ──────────────────────────────────────────────────
EB = framed((CASE_X[0], 0, D1), -math.pi / 2)
# (the end bookcase's books: in its own frame x 0 is the end wall, d runs across)
LAYOUT.thing("bookshelf", "Look at the bookshelves", [EB(x, y, d) for x in (0, 36) for y in (87, 204) for d in (0.0, CASE_X[1] - CASE_X[0])])
LAYOUT.thing("modem", "Look at the router", corners(R["x0"] - 2, R["x1"] + 2, R["y0"], R["y1"] + 17, R["d0"], R["d1"]))
LAYOUT.thing("overtime", "Look at the clocks", [CF(x, y, d) for x in (-CK["w"] / 2, CK["w"] / 2) for y in (CK["h"] - 4, CK["h"] + 14) for d in (-CK["deep"] / 2, 12)] +
             [P(x, y, D1 - 4) for x in (ck["x"] - ck["w"] / 2 - 2, ck["x"] + ck["w"] / 2 + 2) for y in (ck["y0"] - 2, ck["y1"] + 2)])
LAYOUT.chest(CHEST)
LAYOUT.glow("stand", P(sx, STAND["shade"] + 12, sd), 150)
LAYOUT.glow("desk", P(gx, th + 22, gd), 90)
LAYOUT.glow("office", OFFICE_BULB_AT, 90)
LAYOUT.point("led-0", led_at(8))
LAYOUT.point("led-1", led_at(9))
LAYOUT.point("colon", P(ck["x"], (ck["y0"] + ck["y1"]) / 2, D1 - 4.3))
for pane in SASHES: LAYOUT.pane(pane)
# (the moonbeams: from the windows across the floor)
LAYOUT.dust([P(X1, WIN["top"], WINDOWS[0] - WIN["hw"]), P(X1, WIN["sill"], WINDOWS[1] + WIN["hw"]), P(13, 0, WINDOWS[0] - WIN["hw"] - 114), P(183, 0, WINDOWS[1])])
LAYOUT.write()

if arg("--top", "") == "1":
    # (a debugging view from overhead, the ceiling away)
    for o in bpy.data.objects:
        if o.name.startswith(("ceiling", "coffer")): o.hide_render = True
    cam = scene.camera; cam.data.type = "ORTHO"; cam.data.ortho_scale = 11; cam.data.shift_y = 0
    cam.location = P(0, 1500, 420); cam.rotation_euler = (0, 0, 0)
# ── the passes ─────────────────────────────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "1.4")))
scene.cycles.volume_bounces = 1
plates = {k: v for k, v in light_states(LIGHTS).items() if "plates" in ONLY or k in ONLY}
passes(scene, OUT, set(plates), air, apart={"chest": CHEST_PARTS}, variants=plates)
if "chest" in ONLY:
    air.hide_render = True
    chest_sprites(scene, OUT, LAYOUT.data["chest"]["box"], chest_body, chest_hinge, lid_parts)
print("ROOM_DONE")
