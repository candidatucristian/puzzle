# Room VIII, the chemist's weighing room, built in three dimensions and
# rendered with Cycles, seen from its door down its length.
#
# A narrow room tiled white to the dado, plaster above, a floor of black and
# white squares. Down the middle, standing free, his island bench: oak
# cupboards under a black slate top, gas taps along its spine, and on it his
# apothecary's balance on its mahogany plinth — the beam leaning, a phial on
# its left pan, the weighing he never finished — its box of weights open,
# four phials in a row, a green enamel lamp hung low over it from the ceiling.
# To the left, standing out in the room on its frame and turned to us, a
# blackboard with his three reactions on it in chalk too small to read from
# here, a brass lamp clamped to its top. At the far end the window, and under
# it the sink counter: a fireclay sink, a brass swan-neck tap, white tiles
# behind, and on the slate two plain bottles and a volumetric flask, a small
# lamp on the wall beside them. A cabinet of glass and bottles on the right.
#
# Each light burns until its puzzle is solved: the green lamp (the balance —
# whose beam, once it is solved, hangs level and empty), the board's lamp (the
# reactions), the lamp by the sink (the bottles). A plate for each way they can
# stand (lights-<balance><equations><measures>), and where it all fell in the
# picture (src/levels/house/rooms/Room8.json). No chest is kept here.
#
# Run with `--view measures` it renders To the Line's own close-up instead
# (measures_level_passes.py): the sink counter seen at the bottles' height.
#
#   blender -b --factory-startup -P art/blender/room_weighing.py -- [--samples 256] [--width 2560] [--only plates]

import bpy, bmesh, math, os, sys, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *

OUT = os.path.join(ROOT, ".artifacts/room-weighing")
os.makedirs(OUT, exist_ok=True)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")
SAMPLES = int(arg("--samples", "700"))
WIDTH = int(arg("--width", "2560"))
ONLY = set(arg("--only", "plates").split(","))
RNG = random.Random(1869)

# ── the room, and where we stand in it ─────────────────────────────────────
X0, X1, D1, TOP = -160, 160, 700, 300
EYE = (float(arg("--ex", "-52")), float(arg("--ey", "160")), float(arg("--ed", "18")))
LOOK = (float(arg("--lx", "30")), float(arg("--ly", "118")), float(arg("--ld", "700")))
VIEW = arg("--view", "")                          # "measures": To the Line's own close-up (levels/measures)
if VIEW == "measures":
    # (at the counter, the eye a little above the bottles' shoulders, looking
    # down 8° at their row; the window's lower panes over them)
    OUT = os.path.join(ROOT, ".artifacts/measures-level"); os.makedirs(OUT, exist_ok=True)
    EYE = (float(arg("--ex", "-28")), float(arg("--ey", "122.5")), float(arg("--ed", "570")))
    LOOK = (EYE[0], EYE[1] - (676 - EYE[2]) * math.tan(math.radians(8)), 676)
scene, HEIGHT = stage(WIDTH, eye=EYE, look=LOOK, lens=float(arg("--lens", "26.3" if VIEW == "measures" else "22")))
WIN = dict(x=20, hw=58, sill=124, top=262)
ISLAND = dict(x0=-38, x1=58, d0=300, d1=470, h=92)
BOARD = dict(at=(-96, 0, 520), turn=math.radians(34), w=126, h=92, y0=96)
COUNTER = dict(x0=X0 + 30, x1=X1, d0=D1 - 64, h=90)
DADO = 120

# ── materials ──────────────────────────────────────────────────────────────
TILES = scan("white tiles", "long_white_tiles", size=0.9, tint=(0.95, 0.95, 0.92), bright=0.85, sat=0.4, rough=(0.08, 0.3), bump=0.4, coat=0.3)
PLASTER = scan("lime plaster", "white_plaster_rough_01", size=2.4, tint=(0.95, 0.92, 0.85), bright=1.1, sat=0.35, rough=(0.8, 0.95), bump=0.4)
CHEQUER = scan("chequered floor", "checkered_pavement_tiles", size=1.6, tint=(0.95, 0.93, 0.9), bright=0.8, sat=0.4, rough=(0.25, 0.6), bump=0.4, coat=0.15)
OAK = scan("oak", "dark_wood", size=1.0, tint=(0.82, 0.62, 0.44), bright=0.5, rough=(0.3, 0.55), bump=0.3, coat=0.35, upright=True)
OAK_X = scan("oak across", "dark_wood", size=1.0, tint=(0.82, 0.62, 0.44), bright=0.48, rough=(0.3, 0.55), bump=0.3, coat=0.35)
MAHOGANY = scan("mahogany", "rosewood_veneer1", size=0.6, tint=(0.75, 0.45, 0.32), bright=0.48, sat=0.9, rough=(0.15, 0.35), bump=0.2, coat=0.6, upright=True)
SLATE = scan("slate", "castle_wall_slates", size=1.2, tint=(0.3, 0.32, 0.34), bright=0.32, sat=0.3, rough=(0.25, 0.5), bump=0.2, coat=0.2)
BRASS = aged_metal("brass", (0.6, 0.43, 0.19), (0.08, 0.06, 0.03), rough=(0.18, 0.42), scale=30, tarnish=0.45)
IRON = plain("iron", (0.025, 0.025, 0.027), rough=0.5, metal=0.8)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
FIRECLAY = plain("fireclay", (0.78, 0.76, 0.7), rough=0.18, coat=0.6)
FRAME = plain("window paint", (0.86, 0.85, 0.8), rough=0.5)
ENAMEL = plain("green enamel", (0.03, 0.16, 0.07), rough=0.25, coat=0.8)
ENAMEL_IN = plain("enamel inside", (0.9, 0.9, 0.86), rough=0.3, emit=(1.0, 0.85, 0.6), strength=0.6)
LAYOUT = Layout("Room8")
# the board's slate and his chalk (weighing_board.mjs)
BOARD_MAT = picture("blackboard", os.path.join(DRAWN, "weighing-board.png"), rough=0.9, bump=0.15)

# ── the shell: tiles to the dado, plaster over, chequered floor ────────────
box_cm("floor", X0 - 20, X1 + 20, -6, 0, -40, D1 + 20, CHEQUER)
box_cm("ceiling", X0 - 20, X1 + 20, TOP, TOP + 10, -40, D1 + 20, PLASTER)
for (x0, x1) in ((X0 - 25, X0), (X1, X1 + 25)):
    box_cm("wall", x0, x1, 0, TOP, -40, D1 + 20, PLASTER)
box_cm("door wall", X0 - 25, X1 + 25, 0, TOP, -65, -40, PLASTER)
back = box_cm("back wall", X0 - 25, X1 + 25, 0, TOP, D1, D1 + 30, PLASTER)
wx0, wx1 = WIN["x"] - WIN["hw"], WIN["x"] + WIN["hw"]
boolean_cut(back, box("cut", M(wx0), M(wx1), M(D1 - 10), M(D1 + 50), M(WIN["sill"]), M(WIN["top"]), IRON))
box_cm("tiles", X0, X0 + 0.6, 0, DADO, -40, D1, TILES)
box_cm("tiles", X1 - 0.6, X1, 0, DADO, -40, D1, TILES)
box_cm("tiles", X0, X1, 0, WIN["sill"] - 4, D1 - 0.6, D1, TILES)
for (x0, x1) in ((X0, X0 + 2.2), (X1 - 2.2, X1)):
    box_cm("tile cap", x0, x1, DADO, DADO + 3, -40, D1, plain("tile cap", (0.2, 0.32, 0.26), rough=0.2, coat=0.6), 0.6)
box_cm("tile cap", X0, X1, WIN["sill"] - 4, WIN["sill"] - 1, D1 - 2.2, D1, plain("tile cap back", (0.2, 0.32, 0.26), rough=0.2, coat=0.6), 0.6)
box_cm("cornice", X0, X0 + 8, TOP - 12, TOP, -40, D1, PLASTER, 1.5)
box_cm("cornice", X1 - 8, X1, TOP - 12, TOP, -40, D1, PLASTER, 1.5)

# ── the window at the far end, the counter and sink under it ──────────────
REVEAL = 26
box_cm("reveal", wx0 - 3, wx0, WIN["sill"], WIN["top"], D1, D1 + REVEAL, PLASTER)
box_cm("reveal", wx1, wx1 + 3, WIN["sill"], WIN["top"], D1, D1 + REVEAL, PLASTER)
box_cm("reveal head", wx0 - 3, wx1 + 3, WIN["top"], WIN["top"] + 3, D1, D1 + REVEAL, PLASTER)
box_cm("sill", wx0 - 8, wx1 + 8, WIN["sill"] - 4, WIN["sill"], D1 - 8, D1 + REVEAL - 6, SLATE, 0.8)
mid = (WIN["sill"] + WIN["top"]) / 2
SASHES = []
for (y0, y1, dd) in ((WIN["sill"] + 1, mid + 2, D1 + REVEAL - 8), (mid - 2, WIN["top"] - 1, D1 + REVEAL - 13)):
    box_cm("sash", wx0 + 1, wx0 + 6, y0, y1, dd - 2.5, dd + 2.5, FRAME, 0.5); box_cm("sash", wx1 - 6, wx1 - 1, y0, y1, dd - 2.5, dd + 2.5, FRAME, 0.5)
    box_cm("sash", wx0 + 1, wx1 - 1, y0, y0 + 6, dd - 2.5, dd + 2.5, FRAME, 0.5); box_cm("sash", wx0 + 1, wx1 - 1, y1 - 6, y1, dd - 2.5, dd + 2.5, FRAME, 0.5)
    box_cm("glazing bar", WIN["x"] - 1.1, WIN["x"] + 1.1, y0 + 6, y1 - 6, dd - 1.5, dd + 1.5, FRAME, 0.3)
    box_cm("glass", wx0 + 5, wx1 - 5, y0 + 5, y1 - 5, dd - 0.3, dd + 0.3, GLASS)
    SASHES.append([P(x, y, dd) for x, y in ((wx0 + 5, y0 + 5), (wx1 - 5, y0 + 5), (wx1 - 5, y1 - 5), (wx0 + 5, y1 - 5))])
MOON_AT = P(500, 900, 3600)
garden(MOON_AT, [("island_tree_01", -900, 1900, 10.0, 0.3), ("island_tree_02", 1100, 2600, 12.0, 1.4), ("tree_small_02", 240, 1300, 5.0, 2.2)],
       (-2500, 2500, D1 + 40, 3300, -40), P(200, 800, 4200), sky_size=45)
ct = COUNTER
counter_body = box_cm("counter", ct["x0"] + 2, ct["x1"] - 2, 8, ct["h"] - 4, ct["d0"] + 3, D1, OAK)
box_cm("counter plinth", ct["x0"] + 4, ct["x1"] - 2, 0, 8, ct["d0"] + 6, D1, plain("plinth", (0.02, 0.015, 0.01), rough=0.8))
n_ = 4; cw = (ct["x1"] - ct["x0"] - 12) / n_
for i in range(n_):
    a = ct["x0"] + 6 + i * cw
    box_cm("cupboard door", a, a + cw - 3, 12, 78, ct["d0"] + 2, ct["d0"] + 3, OAK, 0.5)
    box_cm("door panel", a + 4, a + cw - 7, 18, 72, ct["d0"] + 1.4, ct["d0"] + 2, OAK, 0.8)
    lathe("knob", [(0, 0), (0.008, 0), (0.011, 0.01), (0.007, 0.015), (0, 0.016)], BRASS, at=tuple(P(a + (5 if i % 2 else cw - 8), 62, ct["d0"] + 1.4)), steps=16).rotation_euler = (math.pi / 2, 0, 0)
top = box_cm("counter slate", ct["x0"], ct["x1"], ct["h"] - 4, ct["h"], ct["d0"], D1, honed_slate("honed slate"), 0.5)
SINK = dict(x0=ct["x0"] + 30, x1=ct["x0"] + 74, d0=ct["d0"] + 6, d1=D1 - 8)
boolean_cut(top, box("cut", M(SINK["x0"]), M(SINK["x1"]), M(SINK["d0"]), M(SINK["d1"]), M(ct["h"] - 10), M(ct["h"] + 5), IRON))
boolean_cut(counter_body, box("cut", M(SINK["x0"] - 0.5), M(SINK["x1"] + 0.5), M(SINK["d0"] - 0.5), M(SINK["d1"] + 0.5), M(ct["h"] - 26), M(ct["h"]), IRON))   # (the sink let down into the cupboard)
sink = box_cm("sink", SINK["x0"], SINK["x1"], ct["h"] - 24, ct["h"] + 0.6, SINK["d0"], SINK["d1"], FIRECLAY, 1.2)
boolean_cut(sink, box("cut", M(SINK["x0"] + 3.5), M(SINK["x1"] - 3.5), M(SINK["d0"] + 3.5), M(SINK["d1"] - 3.5), M(ct["h"] - 20), M(ct["h"] + 5), IRON))
tx = (SINK["x0"] + SINK["x1"]) / 2
TAP = tube("swan neck", [(0, 0), (0, 0.28), (0.04, 0.35), (0.12, 0.35), (0.16, 0.28)], 0.009, BRASS, at=tuple(P(tx, ct["h"], D1 - 4)), rot=-math.pi / 2)
SPOUT = P(tx, ct["h"] + 28, D1 - 20)              # (its mouth, over the middle of the sink)
TAP_PARTS = [TAP]
for e in (-1, 1):
    TAP_PARTS.append(lathe("tap handle", [(0, 0), (0.012, 0), (0.012, 0.03), (0.02, 0.035), (0, 0.04)], BRASS, at=tuple(P(tx + e * 12, ct["h"], D1 - 6)), steps=16))
# the two bottles and the flask on the slate, beside the sink, in a row — as
# To the Line has them (its bottles are drawn live in three dimensions, to the
# same measure: levels/measures/stage3d.js)
ROW = D1 - 24                                     # (the row they stand in)
def bottle_profile(R, body, neckR, neckH):
    """a plain bottle's outside (m), from its foot on the axis to its lip"""
    sh = R * 0.75; top = body + neckH
    return [(0, 0), (R * 0.9, 0), (R * 0.98, 0.002), (R, 0.008), (R, body - sh), (R * 0.93, body - sh * 0.35), (neckR * 1.5, body - 0.004),
            (neckR * 1.08, body + 0.002), (neckR, body + 0.008), (neckR, top - 0.004), (neckR * 1.14, top - 0.002), (neckR * 1.14, top)]
VESSELS, BOTTLE_PARTS = [], []
for (vx, cap, R, body, neckR, neckH) in ((-38, 500, 0.047, 0.172, 0.0198, 0.028), (-18, 300, 0.0387, 0.138, 0.017, 0.0245)):
    o, _ = vessel(f"bottle {cap}", bottle_profile(R, body, neckR, neckH), GLASS, tuple(P(vx, ct["h"], ROW)), floor=0.008, steps=64)
    BOTTLE_PARTS.append(o); VESSELS.append((vx, (body + neckH) * 100, R * 100))
# the volumetric flask: a round bulb on a flat foot, a long neck, one ring
# round it; its measure etched on the bulb (measures_marks.mjs)
fx = 6
FL = dict(r=0.0547, base=0.02, neck=0.0151, neckH=0.134, ring=0.018)
FL["c"] = math.sqrt(FL["r"] ** 2 - FL["base"] ** 2)          # (the bulb's middle, over the foot)
FL["shoulder"] = FL["c"] + math.sqrt(FL["r"] ** 2 - FL["neck"] ** 2)
FL["top"] = FL["shoulder"] + FL["neckH"]
a0, a1 = math.atan2(-FL["c"], FL["base"]), math.atan2(FL["shoulder"] - FL["c"], FL["neck"])
FLASK_PROF = [(0, 0), (FL["base"], 0)] + [(FL["r"] * math.cos(a0 + (a1 - a0) * k / 40), FL["c"] + FL["r"] * math.sin(a0 + (a1 - a0) * k / 40)) for k in range(1, 40)] \
    + [(FL["neck"], FL["shoulder"]), (FL["neck"], FL["top"] - 0.003), (FL["neck"] * 1.12, FL["top"])]
FLASK_AT = P(fx, ct["h"], ROW)
FLASK, FLASK_IN = vessel("volumetric flask", FLASK_PROF, GLASS, tuple(FLASK_AT), t=0.0016, steps=96)
ETCH = plain("etching", (0.92, 0.94, 0.94), rough=0.65)
FL["ring_z"] = FL["shoulder"] + FL["ring"]
ring = lathe("flask ring", [(FL["neck"] + 0.00012, FL["ring_z"] - 0.0004), (FL["neck"] + 0.00012, FL["ring_z"] + 0.0004)], ETCH, at=tuple(FLASK_AT), steps=96)
def etched_patch(name, image, centre, radius, facing, width, lat0, lat1):
    """an image etched round a sphere's front: `width` (rad) of longitude about
    the direction `facing` (rad, from the room's -d), from latitude lat0 to lat1"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L_ = m.node_tree.links.new; out_ = N["Material Output"]; b_ = N["Principled BSDF"]
    t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(image, check_existing=True); t.interpolation = "Cubic"
    L_(t.outputs["Color"], b_.inputs["Base Color"]); b_.inputs["Roughness"].default_value = 0.65
    tr = N.new("ShaderNodeBsdfTransparent"); mx = N.new("ShaderNodeMixShader")
    L_(t.outputs["Alpha"], mx.inputs["Fac"]); L_(tr.outputs["BSDF"], mx.inputs[1]); L_(b_.outputs["BSDF"], mx.inputs[2]); L_(mx.outputs["Shader"], out_.inputs["Surface"])
    m["clear"] = True
    me = bpy.data.meshes.new(name); bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    rows, cols = 16, 32; grid = []
    for j in range(rows + 1):
        lat = lat0 + (lat1 - lat0) * j / rows; row = []
        for k in range(cols + 1):
            lon = facing - width / 2 + width * k / cols
            row.append((bm.verts.new(Vector(centre) + radius * Vector((math.cos(lat) * math.sin(lon), -math.cos(lat) * math.cos(lon), math.sin(lat)))), k / cols, j / rows))
        grid.append(row)
    for j in range(rows):
        for k in range(cols):
            q = [grid[j][k], grid[j][k + 1], grid[j + 1][k + 1], grid[j + 1][k]]
            fc = bm.faces.new([v for v, _, _ in q])
            for lp, (_, u, v) in zip(fc.loops, q): lp[uv].uv = (u, v)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    return o
_face = math.atan2(M(EYE[0] - fx), -M(EYE[2] - ROW))          # (turned to the eye)
etch = etched_patch("flask etching", os.path.join(DRAWN, "measures-flask.png"), FLASK_AT + Vector((0, 0, FL["c"])), FL["r"] + 0.00025, _face, 1.04, math.radians(-38), math.radians(-6))
FLASK_PARTS = [FLASK, ring, etch]
# beside them, what a chemist's sink has: a mortar and its pestle, two brown
# reagent bottles stoppered against the tiles, a glass rod laid down
PORCELAIN = plain("porcelain", (0.86, 0.85, 0.8), rough=0.35)
lathe("mortar", [(0, 0), (0.03, 0), (0.042, 0.008), (0.05, 0.03), (0.052, 0.05), (0.047, 0.052), (0.044, 0.03), (0.032, 0.014), (0, 0.012)], PORCELAIN, at=tuple(P(34, ct["h"], ROW - 8)), steps=48)
rod("pestle", P(30, ct["h"] + 2.0, ROW - 9), P(41, ct["h"] + 11, ROW - 5), M(0.9), PORCELAIN, verts=16)
sphere("pestle head", tuple(P(30, ct["h"] + 2.0, ROW - 9)), M(1.4), PORCELAIN)
AMBER = plain("amber glass", (0.35, 0.16, 0.05), rough=0.04, transmission=1.0, ior=1.5)
for (bx, br, bh) in ((46, 2.6, 13), (54, 2.2, 11)):
    prof = [(0, 0), (M(br), 0), (M(br), M(bh * 0.72)), (M(br * 0.5), M(bh * 0.86)), (M(br * 0.42), M(bh * 0.86)), (M(br * 0.42), M(bh))]
    _, inside = vessel("reagent bottle", prof, AMBER, tuple(P(bx, ct["h"], D1 - 7)), t=0.002, steps=48)
    fill("reagent", inside, M(bh * 0.45), plain("reagent", (0.3, 0.12, 0.04), rough=0.05, transmission=0.6, ior=1.34), tuple(P(bx, ct["h"], D1 - 7)), meniscus=False)
    lathe("ground stopper", [(0, 0), (M(br * 0.38), 0), (M(br * 0.42), M(1.6)), (M(br * 0.7), M(1.8)), (M(br * 0.7), M(2.4)), (0, M(2.6))], AMBER, at=tuple(P(bx, ct["h"] + bh - 1.4, D1 - 7)), steps=32)
rod("glass rod", P(17, ct["h"] + 0.35, ROW - 14), P(33, ct["h"] + 0.35, ROW - 19), M(0.35), GLASS, verts=12)
# the lamp on the wall beside them
WALL_BULB = plain("wall lamp glass", (1, 0.92, 0.78), emit=(1.0, 0.8, 0.52), strength=7)
wlx, wly = 132, 196
box_cm("lamp backplate", wlx - 5, wlx + 5, wly - 8, wly + 8, D1 - 1.5, D1, BRASS, 0.5)
tube("lamp arm", [(0, 0), (0.05, 0.03), (0.1, 0.02)], 0.005, BRASS, at=tuple(P(wlx, wly, D1 - 1)), rot=-math.pi / 2)
lathe("lamp shade", [(0, 0), (0.02, 0), (0.06, 0.06), (0.058, 0.064), (0.018, 0.006), (0, 0.006)], plain("opal glass", (0.85, 0.82, 0.75), rough=0.3, transmission=0.4), at=tuple(P(wlx, wly - 6, D1 - 11)), steps=32).rotation_euler = (math.pi, 0, 0)
sphere("wall lamp bulb", tuple(P(wlx, wly - 3, D1 - 11)), M(2.0), WALL_BULB)
wall_l = lamp("lamp by the sink", "POINT", tuple(P(wlx, wly - 4, D1 - 11)), energy=float(arg("--walllamp", "10")), colour=(1.0, 0.75, 0.45), size=0.02)

# ── down the middle: the island bench, the balance, the hanging lamp ──────
ib = ISLAND
box_cm("island", ib["x0"] + 3, ib["x1"] - 3, 8, ib["h"] - 4, ib["d0"] + 3, ib["d1"] - 3, OAK)
box_cm("island plinth", ib["x0"] + 5, ib["x1"] - 5, 0, 8, ib["d0"] + 5, ib["d1"] - 5, plain("plinth", (0.02, 0.015, 0.01), rough=0.8))
for side, x in ((-1, ib["x0"] + 3), (1, ib["x1"] - 3)):
    for k in range(3):
        d0 = ib["d0"] + 8 + k * (ib["d1"] - ib["d0"] - 16) / 3
        d1 = d0 + (ib["d1"] - ib["d0"] - 16) / 3 - 3
        xa, xb = sorted((x, x + side * 1.0))
        box_cm("island door", xa, xb, 12, 80, d0, d1, OAK, 0.5)
        lathe("knob", [(0, 0), (0.008, 0), (0.011, 0.01), (0.007, 0.015), (0, 0.016)], BRASS, at=tuple(P(x + side * 1.0, 66, d1 - 5)), steps=16).rotation_euler = (0, side * math.pi / 2, 0)
box_cm("island end", ib["x0"] + 6, ib["x1"] - 6, 12, 80, ib["d0"] + 2, ib["d0"] + 3, OAK, 0.6)
box_cm("island slate", ib["x0"], ib["x1"], ib["h"] - 4, ib["h"], ib["d0"], ib["d1"], SLATE, 0.6)
spine_x = (ib["x0"] + ib["x1"]) / 2
rod("gas pipe", P(spine_x, ib["h"] + 6, ib["d0"] + 40), P(spine_x, ib["h"] + 6, ib["d1"] - 10), M(1.0), BRASS, verts=12)
for d in (ib["d0"] + 60, ib["d0"] + 100, ib["d0"] + 140):
    cylinder("gas cock", M(spine_x), M(d), M(ib["h"]), M(ib["h"] + 6), M(1.2), BRASS, verts=12)
    rod("gas nozzle", P(spine_x, ib["h"] + 6, d), P(spine_x + 6, ib["h"] + 4, d), M(0.45), BRASS, verts=8)
BAL = dict(x=-8, d=ib["d0"] + 34)                # the balance, at the island's near end
LEAN = math.radians(7)
def balance():
    """an apothecary's balance on its mahogany plinth: a brass pillar, the
    beam on its knife-edge, two pans hung on chains"""
    box_cm("plinth", -15, 15, 0, 4, -7, 7, MAHOGANY, 0.6, keep=False)
    box_cm("plinth top", -14, 14, 4, 4.8, -6, 6, MAHOGANY, 0.4, keep=False)
    cylinder("pillar", 0, 0, M(4.8), M(36), M(0.8), BRASS, verts=16)
    sphere("finial", (0, 0, M(37.2)), M(1.1), BRASS)
    beam = bpy.data.objects.new("beam", None); link(beam); beam.location = P(0, 36, 0)
    parts = [rod("beam arm", P(-17, 0, 0), P(17, 0, 0), M(0.5), BRASS, verts=10), sphere("pivot", (0, 0, 0), M(1.4), BRASS, squash=(1, 0.6, 1))]
    for o in parts: o.parent = beam
    pans = []
    for e in (-1, 1):
        hang = bpy.data.objects.new("hanger", None); link(hang); hang.parent = beam; hang.location = P(e * 17, 0, 0)
        for k in range(3):
            a = k / 3 * math.tau + 0.3
            ch = rod("chain", (0, 0, 0), P(math.cos(a) * 5.5, -16, math.sin(a) * 5.5), M(0.07), BRASS, verts=4); ch.parent = hang
        pan = lathe("pan", [(0, 0), (0.06, 0.006), (0.065, 0.014), (0, 0.01)], BRASS, at=tuple(P(0, -16.6, 0)), steps=32); pan.parent = hang
        pans.append(hang)
    # the phial left on the left pan
    ph = lathe("phial on the pan", [(0, 0), (0.011, 0), (0.011, 0.04), (0.007, 0.048), (0.007, 0.052), (0, 0.052)], GLASS, at=tuple(P(0, -15.6, 0)), steps=20); ph.parent = pans[0]
    lq = cylinder("phial liquid", 0, 0, M(-15.4), M(-13.2), M(1.0), plain("blue liquid", (0.08, 0.25, 0.7), rough=0.05, transmission=0.6, ior=1.34), verts=16); lq.parent = pans[0]
    return beam, pans, ph, lq
BALANCE_PARTS = {}
def build_balance():
    BALANCE_PARTS["beam"], BALANCE_PARTS["pans"], BALANCE_PARTS["phial"], BALANCE_PARTS["liquid"] = balance()
assembled("balance", build_balance, at=(BAL["x"], ib["h"], BAL["d"]), turn=math.radians(-14))
def lean(on):
    """unsolved, the beam leans with the phial's weight; solved, it hangs level, the pan empty"""
    beam, pans = BALANCE_PARTS["beam"], BALANCE_PARTS["pans"]
    a = LEAN if on else 0.0
    beam.rotation_euler = (0, a, 0)
    for p in pans: p.rotation_euler = (0, -a, 0)
    for o in (BALANCE_PARTS["phial"], BALANCE_PARTS["liquid"]): o.hide_render = not on
lean(True)
# the box of weights, open; four phials in a row
def weights():
    box_cm("weights box", -9, 9, 0, 4, -6, 6, MAHOGANY, 0.5, keep=False)
    box_cm("weights velvet", -8.4, 8.4, 3.6, 4.05, -5.4, 5.4, plain("box velvet", (0.3, 0.03, 0.05), rough=0.9, sheen=0.6), keep=False)
    lid = box_cm("weights lid", -9, 9, 0, 0.8, 0, 12, MAHOGANY, 0.4, keep=False); lid.location = P(0, 4, 6); lid.rotation_euler = (math.radians(-105), 0, 0)
    for k, (x, r, h) in enumerate(((-6, 1.3, 3.2), (-3, 1.1, 2.7), (0, 0.9, 2.2), (2.6, 0.8, 1.9), (5, 0.6, 1.5), (7, 0.5, 1.2))):
        lathe("weight", [(0, 0), (M(r), 0), (M(r), M(h * 0.7)), (M(r * 0.4), M(h * 0.8)), (M(r * 0.45), M(h)), (0, M(h))], BRASS, at=tuple(P(x, 2.0, -1)), steps=20)
assembled("box of weights", weights, at=(BAL["x"] + 28, ib["h"], BAL["d"] + 6), turn=math.radians(-20))
PHIAL_LIQUIDS = [(0.08, 0.25, 0.7), (0.6, 0.62, 0.66), (0.85, 0.7, 0.08), (0.86, 0.84, 0.78)]
for i, c in enumerate(PHIAL_LIQUIDS):
    px, pd = BAL["x"] + 18 + i * 5, BAL["d"] + 22
    hh = 5.5 + (i % 2) * 1.0 + (1.6 if i == 3 else 0)
    lathe("phial", [(0, 0), (0.011, 0), (0.011, M(hh)), (0.007, M(hh + 0.6)), (0.007, M(hh + 1.0)), (0, M(hh + 1.0))], GLASS, at=tuple(P(px, ib["h"], pd)), steps=20)
    cylinder("phial liquid", M(px), M(pd), M(ib["h"] + 0.2), M(ib["h"] + hh * 0.5), M(1.0), plain(f"liquid {i}", c, rough=0.05, transmission=0.5, ior=1.34), verts=16)
    cylinder("cork", M(px), M(pd), M(ib["h"] + hh + 0.6), M(ib["h"] + hh + 1.8), M(0.75), plain("cork", (0.32, 0.2, 0.1), rough=0.9), verts=12)
# a notebook open, a pencil
nb_ = paper("weighing book", (0.66, 0.6, 0.48), 0.3)
card("weighing book", [P(-18, ib["h"] + 0.7, ib["d0"] + 80), P(14, ib["h"] + 0.7, ib["d0"] + 76), P(16, ib["h"] + 0.7, ib["d0"] + 100), P(-16, ib["h"] + 0.7, ib["d0"] + 104)], nb_)
tube("pencil", [(0, 0), (0.15, 0.003)], 0.0035, plain("pencil", (0.55, 0.38, 0.12), rough=0.5), at=tuple(P(-6, ib["h"] + 1.1, ib["d0"] + 92)), rot=0.3)
# the green enamel lamp hung low over the bench
hl_x, hl_d, hl_y = BAL["x"] + 10, BAL["d"] + 18, 172
rod("lamp flex", P(hl_x, TOP, hl_d), P(hl_x, hl_y + 14, hl_d), M(0.35), plain("flex", (0.05, 0.04, 0.03), rough=0.8), verts=8)
lathe("ceiling cup", [(0, 0), (0.05, 0), (0.04, -0.02), (0, -0.025)], BRASS, at=tuple(P(hl_x, TOP, hl_d)), steps=24)
lathe("lamp holder", [(0, 0), (0.018, 0), (0.018, 0.05), (0, 0.05)], BRASS, at=tuple(P(hl_x, hl_y + 8, hl_d)), steps=24)
shade = lathe("green shade", [(0.016, 0.1), (0.05, 0.085), (0.13, 0.02), (0.14, 0.0)], ENAMEL, at=tuple(P(hl_x, hl_y, hl_d)), steps=48)
shade.modifiers.new("thick", "SOLIDIFY").thickness = M(0.4)
lathe("green shade inside", [(0.017, 0.098), (0.05, 0.083), (0.13, 0.018), (0.138, 0.002)], ENAMEL_IN, at=tuple(P(hl_x, hl_y - 0.3, hl_d)), steps=48)
BULB = plain("hung bulb", (1, 0.93, 0.8), emit=(1.0, 0.82, 0.55), strength=12)
sphere("hung bulb", tuple(P(hl_x, hl_y + 3, hl_d)), M(2.6), BULB, squash=(1, 1, 1.3))
hang_l = lamp("green lamp", "SPOT", tuple(P(hl_x, hl_y + 3, hl_d)), aim=tuple(P(hl_x, 0, hl_d)), energy=float(arg("--green", "55")), colour=(1.0, 0.8, 0.52), size=0.03, spot=math.radians(120))
import_model("wooden_stool_01", height=M(64), at=tuple(P(ib["x0"] - 26, 0, ib["d0"] + 70)), rot=0.6)

# ── the blackboard on its frame, turned to us, a lamp clamped to it ────────
B = BOARD
def blackboard():
    w, h, y0 = B["w"], B["h"], B["y0"]
    for e in (-1, 1):
        box_cm("frame post", e * (w / 2 + 6) - 2.5, e * (w / 2 + 6) + 2.5, 0, y0 + h + 30, -2.5, 2.5, OAK, 0.6, keep=False)
        box_cm("frame foot", e * (w / 2 + 6) - 3, e * (w / 2 + 6) + 3, 0, 5, -30, 30, OAK, 0.8, keep=False)
        for dd in (-26, 26):
            lathe("castor", [(0, 0), (0.025, 0), (0.025, 0.02), (0, 0.02)], IRON, at=tuple(P(e * (w / 2 + 6), 0, dd)), steps=12)
    box_cm("frame head", -w / 2 - 8, w / 2 + 8, y0 + h + 26, y0 + h + 31, -2.5, 2.5, OAK, 0.6, keep=False)
    box_cm("board", -w / 2, w / 2, y0, y0 + h, -1.6, 1.6, OAK_X, 0.6, keep=False)
    me = bpy.data.meshes.new("slate face"); bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
    f = bm.faces.new([bm.verts.new(tuple(P(x, y, -1.7))) for x, y in ((-w / 2 + 3, y0 + 3), (w / 2 - 3, y0 + 3), (w / 2 - 3, y0 + h - 3), (-w / 2 + 3, y0 + h - 3))])
    for lp, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): lp[uvl].uv = uv
    bm.to_mesh(me); bm.free()
    face = link(bpy.data.objects.new("slate face", me)); face.data.materials.append(BOARD_MAT)
    box_cm("chalk tray", -w / 2 + 4, w / 2 - 4, y0 - 2, y0, -6, -1.6, OAK_X, 0.4, keep=False)
    for k, x in enumerate((-30, -22, 14)):
        rod("chalk", P(x, y0 + 0.6, -4), P(x + (5 if k != 1 else 3), y0 + 0.6, -3.6), M(0.45), plain("chalk", (0.86, 0.85, 0.8), rough=0.95), verts=8)
    # the brass lamp clamped to the head of the frame, bent down at the board
    box_cm("clamp", -4, 4, y0 + h + 24, y0 + h + 33, -4.5, 4.5, BRASS, 0.5, keep=False)
    tube("lamp arm", [(0, 0), (0.0, 0.08), (-0.1, 0.12)], 0.006, BRASS, at=tuple(P(0, y0 + h + 32, -3)), rot=math.pi / 2)
    hood = lathe("board lamp", [(0, 0), (0.025, 0), (0.06, 0.07), (0.058, 0.074), (0.022, 0.006), (0, 0.006)], BRASS, at=tuple(P(0, y0 + h + 40, -14)), steps=32)
    hood.rotation_euler = (math.radians(140), 0, 0)
assembled("blackboard", blackboard, at=B["at"], turn=B["turn"])
BF = framed(B["at"], B["turn"])
BOARD_BULB_AT = BF(0, B["y0"] + B["h"] + 37, -16)
board_l = lamp("board lamp", "SPOT", tuple(BOARD_BULB_AT), aim=tuple(BF(0, B["y0"] + B["h"] * 0.4, -2)), energy=float(arg("--boardlamp", "22")), colour=(1.0, 0.78, 0.5), size=0.02, spot=math.radians(95))
BOARD_GLOW = plain("board lamp bulb", (1, 0.93, 0.8), emit=(1.0, 0.82, 0.55), strength=10)
sphere("board lamp bulb", tuple(BOARD_BULB_AT), M(1.6), BOARD_GLOW)

# ── on the right: a cabinet of glass and bottles ──────────────────────────
CAB = dict(d0=360, d1=520, depth=40, h=220)
def cabinet():
    """built as if against a back wall at d 0, running along x"""
    L_ = CAB["d1"] - CAB["d0"]; dp = CAB["depth"]
    box_cm("cabinet carcass", 0, L_, 0, CAB["h"], -dp, 0, MAHOGANY, 0.8, keep=False)
    # (its inside painted pale, as such cabinets were: the bottles stand against it)
    box_cm("cabinet inside", 2, L_ - 2, 86, CAB["h"] - 4, -2, -1.2, plain("cabinet paint", (0.62, 0.62, 0.56), rough=0.8), keep=False)
    for k, y in enumerate((96, 136, 176)):
        box_cm("cabinet shelf", 3, L_ - 3, y - 1.5, y, -dp + 2, -1, plain("shelf glass", (0.85, 0.9, 0.88), rough=0.05, transmission=0.9), keep=False)
        x = 8
        while x < L_ - 10:
            kind = RNG.random(); r = RNG.uniform(2.4, 4.6); hh = RNG.uniform(10, 22)
            col = RNG.choice(((0.3, 0.12, 0.04), (0.04, 0.12, 0.05), (0.02, 0.04, 0.12), (0.7, 0.7, 0.68)))
            mat = plain(f"bottle glass {k}-{x:.0f}", col, rough=0.04, transmission=0.85, ior=1.5)
            if kind < 0.6:
                lathe("bottle", [(0, 0), (M(r), 0), (M(r), M(hh * 0.75)), (M(r * 0.4), M(hh * 0.88)), (M(r * 0.35), M(hh)), (0, M(hh))], mat, at=tuple(P(x, y, -dp / 2)), steps=24)
                box_cm("label", x - r * 0.7, x + r * 0.7, y + hh * 0.25, y + hh * 0.5, -dp / 2 - r - 0.05, -dp / 2 - r + 0.05, plain(f"label {k}-{x:.0f}", (0.74, 0.69, 0.56), rough=0.85), keep=False)
            else:
                lathe("jar", [(0, 0), (M(r + 1), 0), (M(r + 1), M(hh * 0.8)), (M(r + 0.5), M(hh * 0.85)), (0, M(hh * 0.85))], mat, at=tuple(P(x, y, -dp / 2)), steps=24)
            x += 2 * r + RNG.uniform(1.5, 4)
    box_cm("cabinet base", 0, L_, 0, 84, -dp - 1, -dp, MAHOGANY, 0.5, keep=False)
    for k in range(2):
        a = 3 + k * (L_ - 6) / 2
        for (c0, c1) in ((a, a + 4), (a + (L_ - 6) / 2 - 4, a + (L_ - 6) / 2)):
            box_cm("door stile", c0, c1, 88, CAB["h"] - 6, -dp - 1.5, -dp, MAHOGANY, 0.4, keep=False)
        box_cm("door rail", a, a + (L_ - 6) / 2, 88, 92, -dp - 1.5, -dp, MAHOGANY, 0.4, keep=False)
        box_cm("door rail", a, a + (L_ - 6) / 2, CAB["h"] - 10, CAB["h"] - 6, -dp - 1.5, -dp, MAHOGANY, 0.4, keep=False)
        box_cm("door glass", a + 4, a + (L_ - 6) / 2 - 4, 92, CAB["h"] - 10, -dp - 1.0, -dp - 0.8, GLASS, keep=False)
    box_cm("cabinet cornice", -3, L_ + 3, CAB["h"], CAB["h"] + 8, -dp - 4, 0, MAHOGANY, 1.0, keep=False)
# (stood against the right-hand wall, its glass toward the room)
assembled("cabinet", cabinet, at=(X1, 0, CAB["d1"]), turn=-math.pi / 2)

# ── light ──────────────────────────────────────────────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
lamp("the moon", "SUN", tuple(P(500, 2600, 2900)), aim=tuple(P(20, 0, 380)), energy=float(arg("--moon", "2.6")), colour=(0.55, 0.68, 1.0), angle=math.radians(1.5))
sky_l = lamp("sky through the window", "AREA", tuple(P(WIN["x"], 190, D1 + 14)), aim=tuple(P(WIN["x"], 60, 400)), energy=float(arg("--sky", "20")), colour=(0.5, 0.62, 0.95), size=1.2, size_y=1.4)
sky_l.visible_camera = False; sky_l.visible_transmission = False; sky_l.visible_glossy = False
fill_l = lamp("fill", "AREA", tuple(P(0, 230, 20)), aim=tuple(P(0, 80, D1)), energy=float(arg("--fill", "42")), colour=(0.8, 0.85, 1.0), size=1.6)
fill_l.visible_camera = False; fill_l.visible_glossy = False
eye_fill(float(arg("--eyefill", "83")), ahead=220)                # (the halls' fill: nothing the eye sees falls to black)
for (at_, aim) in ((P(-60, 220, 300), P(X0, 140, 340)), (P(60, 220, 420), P(X1, 140, 440)), (P(0, 220, 560), P(0, 140, D1))):
    wash = lamp("on the walls", "AREA", tuple(at_), aim=tuple(aim), energy=float(arg("--wash", "14")), colour=(0.82, 0.86, 1.0), size=1.0)
    wash.visible_camera = False; wash.visible_glossy = False
# (one light: the green lamp hung over the bench; the board's lamp and the
# lamp by the sink are out)
ONE = Light("balance", [hang_l], [BULB, ENAMEL_IN]); OUT_LIGHTS = [Light("equations", [board_l], [BOARD_GLOW]), Light("measures", [wall_l], [WALL_BULB])]
clear_glass()
air = room_haze(X0, X1, -30, D1, TOP, float(arg("--haze", "0")))

# ── what the game is told ──────────────────────────────────────────────────
BAF = framed((BAL["x"], ib["h"], BAL["d"]), math.radians(-14))
LAYOUT.thing("balance", "Look at the balance", [BAF(x, y, d) for x in (-24, 24) for y in (0, 40) for d in (-10, 10)])
LAYOUT.thing("equations", "Look at the blackboard", [BF(x, y, -1.7) for x in (-B["w"] / 2, B["w"] / 2) for y in (B["y0"], B["y0"] + B["h"])])
vx0, vx1 = VESSELS[0][0] - 7, fx + 8
LAYOUT.thing("measures", "Look at the bottles by the sink", corners(vx0, vx1, ct["h"], ct["h"] + 28, D1 - 32, D1 - 18))
LAYOUT.glow("balance", P(hl_x, hl_y - 6, hl_d), 70)
LAYOUT.glow("equations", BOARD_BULB_AT, 120)
LAYOUT.glow("measures", P(wlx, wly - 4, D1 - 11), 60)
for pane in SASHES: LAYOUT.pane(pane)
LAYOUT.dust([P(wx0, WIN["top"], D1), P(wx1, WIN["sill"], D1), P(-40, 0, 420), P(80, 0, 560)])
if not VIEW: LAYOUT.write()

# ── the passes ─────────────────────────────────────────────────────────────
if VIEW == "measures":
    import measures_level_passes
    measures_level_passes.run(globals())
    raise SystemExit
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "-0.55")))
scene.cycles.volume_bounces = 1
GLOSSY = ("blackboard", "white tiles", "tile cap", "tile cap back", "fireclay", "green enamel", "enamel inside", "hung bulb", "wall lamp glass", "board lamp bulb")                # (what keeps its shine: glazes, screens, lamp glass)
finish(scene, SAMPLES, keep_gloss=GLOSSY)
plates = one_light(ONE, OUT_LIGHTS) if "plates" in ONLY else {}
passes(scene, OUT, set(plates), air, variants=plates)
print("ROOM_DONE")
