# Room III, the captain's room — where a man home from the sea kept what he
# brought back — built in three dimensions and rendered with Cycles, seen as
# one sitting down at its games table sees it.
#
# Fitted out like a cabin under a low deck of beams: the left-hand wall leans
# in as a ship's side does, planked and ribbed, two brass ports let into it on
# the wet garden and the moon; limewashed boards over navy match-boarding on
# the others, a deck of wide caulked planks underfoot. Close in front of us the
# games table, the chess game left on it just as the puzzle has it, a candle
# burning at its corner. Under the far port a round table and on it a ship in
# a bottle — a big one, a three-master under full sail on a painted sea, the
# bottle lying in its cradle — and over it, hung from a beam, a red storm
# lantern burning. On the right, standing out from the wall at an angle, the
# desk: an old brick of a mobile telephone on it, its little green screen
# alight, under a green-shaded lamp, and the gilt chest. A ship's wheel on the
# far wall, the sea chart framed beside it, a sea chest, a coil of rope, sacks
# of seed.
#
# Each puzzle has its own light, which burns until it is solved: the lantern
# (the bottle), the candle (the board), the green lamp and the telephone's
# screen (the telephone). A plate for each way they can stand
# (lights-<ship><chess><phone>), the chest apart, and where it all fell in the
# picture (src/levels/house/rooms/Room3.json).
#
#   blender -b --factory-startup -P art/blender/room_cabin.py -- [--samples 256] [--width 2560] [--only plates,chest]

import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *
import chess_set as chess

OUT = os.path.join(ROOT, ".artifacts/room-cabin")
os.makedirs(OUT, exist_ok=True)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")
SAMPLES = int(arg("--samples", "700"))
WIDTH = int(arg("--width", "2560"))
ONLY = set(arg("--only", "plates,chest").split(","))
RNG = random.Random(1849)

# ── the cabin, and where we sit in it ──────────────────────────────────────
X0, X1, D1, TOP = -220, 220, 520, 232          # (the ship's side leans in from X0 at the deck)
LEAN = math.radians(12)                          # how far the ship's side leans in
EYE = (float(arg("--ex", "62")), float(arg("--ey", "126")), float(arg("--ed", "22")))
LOOK = (float(arg("--lx", "-60")), float(arg("--ly", "108")), float(arg("--ld", "520")))
scene, HEIGHT = stage(WIDTH, eye=EYE, look=LOOK, lens=float(arg("--lens", "22")), lift=float(arg("--lift", "0.02")))
GAMES = dict(x=-8, d=196, s=70, h=70, turn=math.radians(6))
BOTTLE_TABLE = dict(x=-118, d=402, r=38, h=72)
DESK = dict(at=(128, 0, 392), turn=math.radians(-24), w=118, deep=58, h=76)
PORTS = (250, 418)                               # the ports in the ship's side (along d), 150 up
PORT_R, PORT_Y = 17, 150
DADO = 100
# the game on the board, as the puzzle leaves it (the chess level's
# CHESS_PIECES): file a–h, rank 1–8, white?, which piece
GAME = [(7, 0, True, "R"), (4, 1, True, "K"), (0, 2, True, "P"), (3, 3, False, "Q"), (0, 4, False, "K"), (2, 5, False, "N"), (7, 6, True, "B"), (4, 7, False, "B")]

# ── materials ──────────────────────────────────────────────────────────────
LIMEWASH = scan("limewashed boards", "distressed_painted_planks", size=1.6, tint=(1.0, 1.0, 0.98), bright=0.55, sat=0.25, rough=(0.6, 0.9), bump=0.5, rot=(math.pi / 2, 0, 0))
LIMEWASH_END = scan("limewashed boards, end", "distressed_painted_planks", size=1.6, tint=(1.0, 1.0, 0.98), bright=0.55, sat=0.25, rough=(0.6, 0.9), bump=0.5, rot=(0, math.pi / 2, 0))
HULL_PLANKS = scan("ship's side planking", "distressed_painted_planks", size=1.6, tint=(0.96, 0.94, 0.88), bright=0.5, sat=0.3, rough=(0.55, 0.85), bump=0.6, rot=(math.pi / 2, 0, 0))
NAVY = scan("navy match-boarding", "distressed_painted_planks", size=0.9, tint=(0.25, 0.4, 0.85), bright=0.28, sat=1.0, rough=(0.4, 0.7), bump=0.4)
OAK = scan("oak", "dark_wood", size=1.0, tint=(0.82, 0.62, 0.44), bright=0.5, rough=(0.3, 0.55), bump=0.3, coat=0.35, upright=True)
OAK_X = scan("oak across", "dark_wood", size=1.0, tint=(0.82, 0.62, 0.44), bright=0.48, rough=(0.3, 0.55), bump=0.3, coat=0.35)
MAHOGANY = scan("mahogany", "rosewood_veneer1", size=0.7, tint=(0.75, 0.48, 0.34), bright=0.5, sat=0.9, rough=(0.18, 0.38), bump=0.2, coat=0.55, upright=True)
DECK = scan("deck planks", "wood_floor_worn", size=2.6, tint=(0.75, 0.62, 0.48), bright=0.45, rough=(0.3, 0.6), bump=0.6, coat=0.25)
LEATHER = scan("desk leather", "brown_leather", size=0.5, tint=(0.35, 0.45, 0.28), bright=0.5, rough=(0.35, 0.6), bump=0.4)
BRASS = aged_metal("brass", (0.6, 0.42, 0.18), (0.08, 0.06, 0.03), rough=(0.2, 0.48), scale=30, tarnish=0.5)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
BOTTLE_GLASS = plain("bottle glass", (0.82, 0.92, 0.86), rough=0.01, transmission=1.0, ior=1.5)
IRON = plain("iron", (0.02, 0.02, 0.02), rough=0.45, metal=0.8)
WAX = bpy.data.materials.new("wax"); WAX.use_nodes = True
_w = WAX.node_tree.nodes["Principled BSDF"]; _w.inputs["Base Color"].default_value = (0.82, 0.74, 0.58, 1); _w.inputs["Subsurface Weight"].default_value = 0.6; _w.inputs["Subsurface Radius"].default_value = (0.02, 0.012, 0.006); _w.inputs["Roughness"].default_value = 0.42
WICK = plain("wick", (0.01, 0.01, 0.01), rough=0.9)
CHART_MAT = picture("sea chart", os.path.join(DRAWN, "cabin-chart.png"), rough=0.9)
ROPE = plain("rope", (0.32, 0.25, 0.15), rough=0.9, sheen=0.3)
LAYOUT = Layout("Room3")

# ── the shell: the ship's side, boards over match-boarding, beams, a deck ──
box_cm("deck", X0 - 40, X1 + 20, -6, 0, -40, D1 + 20, DECK)
for x in range(X0 - 30, X1, 24):
    box_cm("caulking", x - 0.25, x + 0.25, -0.05, 0.02, -40, D1, plain("caulk", (0.01, 0.008, 0.006), rough=0.9))
box_cm("deckhead", X0 - 40, X1 + 20, TOP, TOP + 10, -40, D1 + 20, scan("deckhead boards", "dark_wooden_planks", size=2.0, tint=(0.85, 0.8, 0.75), bright=0.5, rough=(0.5, 0.8), bump=0.4))
for d in range(20, D1, 56):
    box_cm("beam", X0 - 40, X1, TOP - 20, TOP, d - 9, d + 9, OAK_X, 1.2)
box_cm("carling", X0 - 40, X1, TOP - 14, TOP - 6, -40, D1, OAK_X, 0.8)
# the right-hand and far walls: limewashed boards over navy match-boarding
box_cm("wall", X1, X1 + 25, 0, TOP, -40, D1 + 20, LIMEWASH)
box_cm("door wall", X0 - 40, X1 + 25, 0, TOP, -60, -40, LIMEWASH)
box_cm("far wall", X0 - 40, X1 + 25, 0, TOP, D1, D1 + 25, LIMEWASH_END)
box_cm("match-boarding", X1 - 1.5, X1, 0, DADO, -40, D1, NAVY)
box_cm("dado rail", X1 - 4, X1, DADO - 2, DADO + 4, -40, D1, NAVY, 1.0)
box_cm("skirting", X1 - 4, X1, 0, 12, -40, D1, NAVY, 0.6)
box_cm("match-boarding", X0, X1, 0, DADO, D1 - 1.5, D1, NAVY)
box_cm("dado rail", X0, X1, DADO - 2, DADO + 4, D1 - 4, D1, NAVY, 1.0)
box_cm("skirting", X0, X1, 0, 12, D1 - 4, D1, NAVY, 0.6)
for k in range(int((X1 - X0) / 9)):
    x = X0 + k * 9
    box_cm("groove", x - 0.2, x + 0.2, 12, DADO - 2, D1 - 1.6, D1 - 1.4, plain("groove", (0.005, 0.008, 0.02), rough=0.8))
for k in range(int((D1 + 40) / 9)):
    d = -40 + k * 9
    box_cm("groove", X1 - 1.6, X1 - 1.4, 12, DADO - 2, d - 0.2, d + 0.2, plain("groove", (0.005, 0.008, 0.02), rough=0.8))
# the ship's side: planked, leaning in, its frames standing out from it every
# half metre, a shelf-clamp along under the beams; the ports through it
def on_side(u, y, d):
    """a place on the ship's side: `u` out from its face (into the room, cm),
    `y` up it as it leans, `d` along it"""
    return P(X0 + y * math.sin(LEAN) + u * math.cos(LEAN), y * math.cos(LEAN) - u * math.sin(LEAN), d)
side_root = bpy.data.objects.new("ship's side", None); link(side_root)
side_root.location = P(X0, 0, 0); side_root.rotation_euler = (0, LEAN, 0)
# (in its own frame: x out from the face into the room, z up the face, y along d)
def side_box(name, u0, u1, y0, y1, d0, d1, mat, r=0.0):
    o = box(name, M(u0), M(u1), M(d0), M(d1), M(y0), M(y1), mat)
    if r: bevel(o, M(r), 2)
    o.parent = side_root; arch(o); return o
H_SIDE = (TOP + 20) / math.cos(LEAN)
hull = side_box("ship's side", -22, 0, -10, H_SIDE, -40, D1 + 20, HULL_PLANKS)
bpy.context.view_layer.update()
for c in PORTS:
    cut = cylinder("cut", 0, 0, -0.5, 0.5, M(PORT_R), IRON, verts=64)
    cut.matrix_world = side_root.matrix_world @ Matrix.Translation((0, M(c), M(PORT_Y / math.cos(LEAN)))) @ Matrix.Rotation(math.pi / 2, 4, "Y")
    boolean_cut(hull, cut)
for d in range(20, D1, 56):
    if any(abs(d - c) < PORT_R + 14 for c in PORTS): continue
    side_box("frame", 0, 9, 0, H_SIDE - 22, d - 6, d + 6, OAK, 0.8)
side_box("shelf-clamp", 0, 7, (TOP - 26) / math.cos(LEAN), (TOP - 12) / math.cos(LEAN), -40, D1, OAK_X, 0.8)
side_box("waterway", 0, 10, 0, 14, -40, D1, OAK_X, 0.8)
# the ports: a brass ring bolted round glass, set square through the leaning side
PORT_GLASS = []
for c in PORTS:
    centre = on_side(0, PORT_Y / math.cos(LEAN), c)
    tilt = Matrix.Rotation(LEAN, 4, "Y") @ Matrix.Rotation(math.pi / 2, 4, "Y")
    ring = lathe("port ring", [(M(PORT_R - 1), 0), (M(PORT_R + 8), 0), (M(PORT_R + 9), 0.015), (M(PORT_R + 8), 0.03), (M(PORT_R + 2), 0.03), (M(PORT_R - 1), 0.02)], BRASS, steps=96)
    ring.matrix_world = Matrix.Translation(centre) @ tilt; arch(ring)
    for k in range(10):
        a = k / 10 * math.tau
        p = Matrix.Translation(centre) @ tilt @ Vector((M(math.cos(a) * (PORT_R + 5)), M(math.sin(a) * (PORT_R + 5)), 0.03))
        arch(sphere("bolt", tuple(p), M(0.9), BRASS, squash=(1, 1, 1)))
    sleeve = cylinder("port sleeve", 0, 0, -M(22), 0, M(PORT_R), plain("port sleeve", (0.03, 0.03, 0.035), rough=0.7, metal=0.3), verts=96, open_ends=True)
    sleeve.matrix_world = Matrix.Translation(centre) @ tilt; arch(sleeve)
    disc = cylinder("port glass", 0, 0, -0.003, 0.003, M(PORT_R - 0.5), BOTTLE_GLASS, verts=96)
    disc.matrix_world = Matrix.Translation(centre) @ tilt @ Matrix.Translation((0, 0, -M(14))); arch(disc)
    PORT_GLASS.append([Matrix.Translation(centre) @ tilt @ Vector((M(math.cos(i / 40 * math.tau) * (PORT_R - 0.5)), M(math.sin(i / 40 * math.tau) * (PORT_R - 0.5)), -M(14))) for i in range(40)])
MOON_AT = P(-1700, 330, 2600)                   # (low, in the far port)
garden(MOON_AT, [("island_tree_01", -900, 300, 10.0, 0.3), ("island_tree_02", -1500, 1400, 12.0, 1.4), ("tree_small_02", -700, 900, 5.0, 2.2),
                  ("shrub_02", -420, 200, 1.5, 0.6), ("shrub_02", -460, 650, 1.7, 2.0), ("island_tree_01", -2600, 3400, 11.0, 2.9)],
       (-4000, X0 - 30, -1500, 4000, -40), P(-2200, 700, 2200), sky_size=50)

# ── the far wall: the ship's wheel, the chart, a sea chest ─────────────────
wx, wy = -96, 140
bpy.ops.mesh.primitive_torus_add(major_radius=M(30), minor_radius=M(2.2), location=tuple(P(wx, wy, D1 - 6)), rotation=(math.pi / 2, 0, 0))
rim = bpy.context.active_object; rim.data.materials.append(OAK); arch(rim)
hub = lathe("hub", [(0, 0), (0.07, 0), (0.07, 0.06), (0, 0.06)], BRASS); hub.rotation_euler = (math.pi / 2, 0, 0); hub.location = P(wx, wy, D1 - 2)
for k in range(8):
    a = k / 8 * math.tau
    rod("spoke", P(wx, wy, D1 - 6), P(wx + math.cos(a) * 40, wy + math.sin(a) * 40, D1 - 6), M(1.0), OAK)
    rod("handle", P(wx + math.cos(a) * 32, wy + math.sin(a) * 32, D1 - 6), P(wx + math.cos(a) * 42, wy + math.sin(a) * 42, D1 - 6), M(1.4), OAK)
cx0, cx1, cy0, cy1 = 4, 128, 118, 118 + 124 * 0.68
for (a, b, y0, y1) in ((cx0 - 4, cx1 + 4, cy0 - 4, cy0), (cx0 - 4, cx1 + 4, cy1, cy1 + 4), (cx0 - 4, cx0, cy0, cy1), (cx1, cx1 + 4, cy0, cy1)):
    box_cm("chart frame", a, b, y0, y1, D1 - 3, D1, OAK_X if y1 - y0 < 10 else OAK, 0.5)
arch(card("chart", [P(cx0, cy0, D1 - 1.2), P(cx1, cy0, D1 - 1.2), P(cx1, cy1, D1 - 1.2), P(cx0, cy1, D1 - 1.2)], CHART_MAT))
arch(card("chart glass", [P(cx0, cy0, D1 - 2.4), P(cx1, cy0, D1 - 2.4), P(cx1, cy1, D1 - 2.4), P(cx0, cy1, D1 - 2.4)], GLASS))
tube("chart light arm", [(0, 0), (0.04, 0.06), (0.1, 0.05)], 0.004, BRASS, at=tuple(P((cx0 + cx1) / 2, cy1 + 8, D1)), rot=-math.pi / 2)
hood = cylinder("chart light", 0, 0, M(-24), M(24), M(2.8), BRASS, verts=24); hood.rotation_euler = (0, math.pi / 2, 0); hood.location = P((cx0 + cx1) / 2, cy1 + 13, D1 - 10)
chart_l = lamp("chart light", "AREA", tuple(P((cx0 + cx1) / 2, cy1 + 10, D1 - 11)), aim=tuple(P((cx0 + cx1) / 2, cy0 + 10, D1)), energy=float(arg("--chartlight", "8")), colour=(1.0, 0.72, 0.42), size=0.45, size_y=0.06)
chart_l.visible_camera = False
darken_model(import_model("wooden_crate_01", height=M(46), at=tuple(P(70, 0, D1 - 34)), rot=0.08), (0.55, 0.45, 0.38))
for k in range(6):
    bpy.ops.mesh.primitive_torus_add(major_radius=M(20 - k * 0.4), minor_radius=M(1.4), location=tuple(P(-30, 1.4 + k * 2.6, D1 - 40)))
    bpy.context.active_object.data.materials.append(ROPE)

# ── under the far port: the round table, the ship in her bottle ───────────
BT = BOTTLE_TABLE
lathe("round table top", [(0, M(BT["h"] - 3)), (M(BT["r"]), M(BT["h"] - 3)), (M(BT["r"] + 0.6), M(BT["h"] - 1.8)), (M(BT["r"]), M(BT["h"])), (0, M(BT["h"]))], OAK, at=tuple(P(BT["x"], 0, BT["d"])), steps=64)
lathe("round table column", [(0, 0), (0.06, 0.06), (0.045, 0.14), (0.05, 0.3), (0.04, 0.45), (0.055, 0.55), (0.045, M(BT["h"] - 3)), (0, M(BT["h"] - 3))], OAK, at=tuple(P(BT["x"], 0, BT["d"])), steps=32)
for k in range(3):
    tube("round table foot", [(0.03, 0.12), (0.17, 0.06), (0.28, 0.015)], 0.02, OAK, at=tuple(P(BT["x"], 0, BT["d"])), rot=k * math.tau / 3 + 0.5)
B = dict(body=58, neck=15, r=16)                 # the bottle: its body's length, its neck, its radius
BOTTLE_TURN = math.radians(float(arg("--bottle", "62")))
SEA = bpy.data.materials.new("putty sea"); SEA.use_nodes = True
_sn = SEA.node_tree.nodes; _sl = SEA.node_tree.links.new; _sb = _sn["Principled BSDF"]
_stc = _sn.new("ShaderNodeTexCoord"); _snz = _sn.new("ShaderNodeTexNoise"); _snz.inputs["Scale"].default_value = 40; _snz.inputs["Detail"].default_value = 6
_sr = _sn.new("ShaderNodeValToRGB"); _sr.color_ramp.elements[0].color = (0.01, 0.06, 0.08, 1); _sr.color_ramp.elements[1].position = 0.78; _sr.color_ramp.elements[1].color = (0.05, 0.22, 0.25, 1)
_foam = _sr.color_ramp.elements.new(0.86); _foam.color = (0.75, 0.78, 0.74, 1)
_sl(_stc.outputs["Object"], _snz.inputs["Vector"]); _sl(_snz.outputs["Fac"], _sr.inputs["Fac"]); _sl(_sr.outputs["Color"], _sb.inputs["Base Color"])
_sb.inputs["Roughness"].default_value = 0.3; _sb.inputs["Coat Weight"].default_value = 0.6
HULL = plain("hull", (0.02, 0.018, 0.016), rough=0.4, coat=0.4)
GOLDLINE = plain("gilt line", (0.6, 0.42, 0.15), rough=0.3, metal=0.8)
SAIL = plain("sail", (0.72, 0.66, 0.52), rough=0.85, sheen=0.3)
SPAR = plain("spar", (0.12, 0.07, 0.035), rough=0.6)
LINE = plain("rigging", (0.02, 0.018, 0.015), rough=0.7)
FLAG = plain("ensign", (0.4, 0.03, 0.03), rough=0.7)
def ship_in_bottle():
    """the bottle lying in its cradle along x, its middle at the origin, the
    table's top at y 0; the putty sea inside and the ship on it"""
    x0, x1, r, neck = -B["body"] / 2, B["body"] / 2, B["r"], B["neck"]
    yb = 5                                       # (the bottle's underside, on its cradle)
    ax = yb + r
    body_len = x1 - x0
    prof = [(0.0, 0.0), (M(r - 1.5), 0.0), (M(r), M(2)), (M(r), M(body_len - 6)), (M(r - 3), M(body_len - 1)), (M(7), M(body_len + 4)),
            (M(4.4), M(body_len + 8)), (M(4.2), M(body_len + neck - 1)), (M(5), M(body_len + neck))]
    inner = [(max(rr - M(0.6), 0.0005), max(z, M(0.6))) for rr, z in reversed(prof[1:])]
    bottle = lathe("bottle", prof + inner + [(0.0, M(0.6))], BOTTLE_GLASS, steps=72)
    bottle.rotation_euler = (0, math.pi / 2, 0); bottle.location = P(x0, ax, 0)
    cork = cylinder("cork", 0, 0, 0, M(4), M(4.1), plain("cork", (0.32, 0.2, 0.1), rough=0.9), verts=24, r2=M(4.6)); cork.rotation_euler = (0, math.pi / 2, 0); cork.location = P(x1 + neck - 1.5, ax, 0)
    sphere("wax seal", tuple(P(x1 + neck + 2.5, ax, 0)), M(4.8), plain("sealing wax", (0.32, 0.02, 0.02), rough=0.35), squash=(0.35, 1, 1))
    for x in (x0 + 10, x1 - 12):
        cradle = box_cm("cradle", x - 1.5, x + 1.5, 0, yb + 4, -11, 11, MAHOGANY, 0.5, keep=False)
        cyl = cylinder("cradle cut", 0, 0, -0.03, 0.03, M(r + 0.2), IRON, verts=48); cyl.rotation_euler = (0, math.pi / 2, 0); cyl.location = P(x, ax, 0)
        boolean_cut(cradle, cyl)
    box_cm("cradle base", x0 + 4, x1 - 6, 0, 1.5, -12, 12, MAHOGANY, 0.5, keep=False)
    me = bpy.data.meshes.new("sea"); bm = bmesh.new(); nx, nd = 60, 16
    sea_y = ax - 7
    grid = []
    for i in range(nx + 1):
        x = x0 + 2 + (body_len - 8) * i / nx; row = []
        for j in range(nd + 1):
            t = -1 + 2 * j / nd
            half = math.sqrt(max(0.0, (r - 1) ** 2 - (sea_y - ax) ** 2)) * 0.96
            y = sea_y + 1.2 * math.sin(x * 0.5 + j * 0.9) * (1 - abs(t)) + 0.6 * math.sin(x * 1.3)
            row.append(bm.verts.new(tuple(P(x, y, t * half))))
        grid.append(row)
    for i in range(nx):
        for j in range(nd): bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    bm.to_mesh(me); bm.free()
    sea = link(bpy.data.objects.new("sea", me)); sea.data.materials.append(SEA)
    for p in sea.data.polygons: p.use_smooth = True
    so = sea.modifiers.new("thick", "SOLIDIFY"); so.thickness = M(3); so.offset = 1
    # the ship: a black hull with a gold stripe, three masts under full sail, her jibs, her rigging
    s0, s1 = x0 + 9, x1 - 9
    hl = s1 - s0; hc = (s0 + s1) / 2
    me = bpy.data.meshes.new("hull"); bm = bmesh.new(); n = 24
    sections = []
    for i in range(n + 1):
        t = i / n
        beam = 3.6 * math.sin(math.pi * (0.06 + 0.9 * t)) ** 0.6 * (0.55 if t > 0.85 else 1.0)
        depth = 3.2 * (1 - 0.3 * t)
        x = s0 + hl * t
        sections.append([bm.verts.new(tuple(P(x, sea_y + 2.6 - depth * math.sin(a), beam * math.cos(a)))) for a in [math.pi * k / 8 for k in range(9)]])
    for i in range(n):
        for k in range(8): bm.faces.new((sections[i][k], sections[i + 1][k], sections[i + 1][k + 1], sections[i][k + 1]))
    bm.faces.new(sections[0]); bm.faces.new(list(reversed(sections[-1])))
    bm.to_mesh(me); bm.free()
    hull_ = link(bpy.data.objects.new("hull", me)); hull_.data.materials.append(HULL)
    for p in hull_.data.polygons: p.use_smooth = True
    box_cm("ship's deck", s0 + 1, s1 - 2, sea_y + 2.4, sea_y + 2.7, -3, 3, OAK_X, keep=False)
    box_cm("gilt stripe", s0 + 2, s1 - 3, sea_y + 1.6, sea_y + 2.0, -3.65, 3.65, GOLDLINE, keep=False)
    bow = P(s1, sea_y + 3, 0)
    bowsprit_end = P(s1 + 9, sea_y + 7, 0)
    rod("bowsprit", bow, bowsprit_end, M(0.35), SPAR)
    masts = [(hc + hl * 0.28, 16.5), (hc + hl * 0.02, 18.0), (hc - hl * 0.26, 15.0)]
    def sail(x, y0, y1, w0, w1, belly=1.2):
        me = bpy.data.meshes.new("sail"); bm = bmesh.new(); nu, nv = 8, 6
        vs = [[bm.verts.new(tuple(P(x + belly * math.sin(math.pi * u / nu) * math.sin(math.pi * v / nv), y0 + (y1 - y0) * v / nv, -(w0 + (w1 - w0) * v / nv) / 2 + (w0 + (w1 - w0) * v / nv) * u / nu))) for u in range(nu + 1)] for v in range(nv + 1)]
        for v in range(nv):
            for u in range(nu): bm.faces.new((vs[v][u], vs[v][u + 1], vs[v + 1][u + 1], vs[v + 1][u]))
        bm.to_mesh(me); bm.free()
        o = link(bpy.data.objects.new("sail", me)); o.data.materials.append(SAIL)
        for p in o.data.polygons: p.use_smooth = True
    for (mx, mh) in masts:
        rod("mast", P(mx, sea_y + 2.6, 0), P(mx, sea_y + 2.6 + mh, 0), M(0.32), SPAR)
        for (t0, t1, w0, w1) in ((0.18, 0.42, 9.5, 8.5), (0.46, 0.66, 8.0, 7.0), (0.7, 0.86, 6.5, 5.5), (0.88, 0.97, 4.6, 4.0)):
            y_low, y_high = sea_y + 2.6 + mh * t0, sea_y + 2.6 + mh * t1
            rod("yard", P(mx + 0.4, y_high, -w1 / 2 - 0.6), P(mx + 0.4, y_high, w1 / 2 + 0.6), M(0.15), SPAR, verts=6)
            sail(mx + 0.6, y_low, y_high, w0, w1, belly=1.0 + 0.6 * (1 - t0))
        for side in (-1, 1):
            for k in range(3):
                rod("shroud", P(mx, sea_y + 2.6 + mh * 0.9, 0), P(mx - 2 + k * 1.6, sea_y + 2.5, side * 3.4), M(0.04), LINE, verts=4)
    for (a, b) in ((masts[0], None), (masts[1], masts[0]), (masts[2], masts[1])):
        top = P(a[0], sea_y + 2.6 + a[1] * 0.95, 0)
        to = bowsprit_end if b is None else P(b[0], sea_y + 2.6 + b[1] * 0.5, 0)
        rod("stay", top, to, M(0.05), LINE, verts=4)
    for (hgt, back_) in ((0.8, 0.0), (0.6, 2.0)):
        me = bpy.data.meshes.new("jib"); bm = bmesh.new()
        p0 = Vector(bowsprit_end) - Vector((M(back_ * 2), 0, M(back_ * 0.6)))
        p1 = Vector(P(masts[0][0], sea_y + 2.6 + masts[0][1] * hgt, 0))
        p2 = Vector(P(s1 - 1 - back_, sea_y + 3.2, 0))
        bm.faces.new([bm.verts.new(tuple(v)) for v in (p0, p1, p2)]); bm.to_mesh(me); bm.free()
        link(bpy.data.objects.new("jib", me)).data.materials.append(SAIL)
    box_cm("ensign", masts[1][0] - 3.2, masts[1][0], sea_y + 2.6 + masts[1][1] - 1.6, sea_y + 2.6 + masts[1][1], -0.05, 0.05, FLAG, keep=False)
assembled("ship in her bottle", ship_in_bottle, at=(BT["x"] + 4, BT["h"], BT["d"]), turn=BOTTLE_TURN)
BF = framed((BT["x"] + 4, BT["h"], BT["d"]), BOTTLE_TURN)
# the storm lantern, hung from the beam over the table on a short chain: a
# red-painted tank and cap, a glass globe in its wire guard, its bail
RED_TIN = aged_metal("red tin", (0.38, 0.05, 0.03), (0.08, 0.03, 0.02), rough=(0.35, 0.6), scale=20, tarnish=0.45)
lx, ld, ly = BT["x"] - 22, 412, 150
lathe("lantern tank", [(0, 0), (0.065, 0), (0.07, 0.01), (0.07, 0.04), (0.045, 0.06), (0.03, 0.065), (0, 0.065)], RED_TIN, at=tuple(P(lx, ly, ld)), steps=40)
lathe("lantern globe", [(0.0, 0.0), (0.028, 0.0), (0.05, 0.03), (0.056, 0.07), (0.05, 0.11), (0.032, 0.135), (0.031, 0.14), (0.0, 0.14)], plain("lantern glass", (0.95, 0.9, 0.85), rough=0.03, transmission=1.0, ior=1.5), at=tuple(P(lx, ly + 6.5, ld)), steps=40)
lathe("lantern cap", [(0, 0), (0.042, 0), (0.05, 0.015), (0.035, 0.04), (0.02, 0.06), (0.025, 0.07), (0, 0.075)], RED_TIN, at=tuple(P(lx, ly + 20, ld)), steps=40)
for k in range(4):
    a = k / 4 * math.tau + 0.4
    rod("guard", P(lx + math.cos(a) * 5.8, ly + 6.5, ld + math.sin(a) * 5.8), P(lx + math.cos(a) * 4.0, ly + 20.5, ld + math.sin(a) * 4.0), M(0.25), RED_TIN, verts=6)
tube("bail", [(-0.045, 0.21), (-0.035, 0.31), (0.035, 0.31), (0.045, 0.21)], 0.002, IRON, at=tuple(P(lx, ly, ld)), rot=0.6)
for k in range(int((TOP - 20 - (ly + 31)) / 3.2)):
    y = ly + 31 + k * 3.2
    bpy.ops.mesh.primitive_torus_add(major_radius=M(1.0), minor_radius=M(0.22), location=tuple(P(lx, y + 1.6, ld)), rotation=(math.pi / 2, 0, k * math.pi / 2))
    bpy.context.active_object.data.materials.append(IRON)
FLAME_GLOW = plain("lantern flame", (1.0, 0.6, 0.2), emit=(1.0, 0.55, 0.18), strength=40)
sphere("lantern flame", tuple(P(lx, ly + 11.5, ld)), M(0.9), FLAME_GLOW, squash=(0.6, 0.6, 1.8))
lantern_l = lamp("lantern", "POINT", tuple(P(lx, ly + 12, ld)), energy=float(arg("--lantern", "16")), colour=(1.0, 0.5, 0.2), size=0.02)
# sacks of seed by the table
SACK = bpy.data.materials.new("sacking"); SACK.use_nodes = True
_kn = SACK.node_tree.nodes; _kl = SACK.node_tree.links.new; _kb = _kn["Principled BSDF"]
_ktc = _kn.new("ShaderNodeTexCoord"); _kw = _kn.new("ShaderNodeTexWave"); _kw.inputs["Scale"].default_value = 260; _kw.wave_type = "BANDS"
_kw2 = _kn.new("ShaderNodeTexWave"); _kw2.inputs["Scale"].default_value = 260; _kw2.bands_direction = "Y"
_kl(_ktc.outputs["Object"], _kw.inputs["Vector"]); _kl(_ktc.outputs["Object"], _kw2.inputs["Vector"])
_kmx = _kn.new("ShaderNodeMath"); _kmx.operation = "MULTIPLY"; _kl(_kw.outputs["Fac"], _kmx.inputs[0]); _kl(_kw2.outputs["Fac"], _kmx.inputs[1])
_knz = _kn.new("ShaderNodeTexNoise"); _knz.inputs["Scale"].default_value = 12; _kl(_ktc.outputs["Object"], _knz.inputs["Vector"])
_kr = _kn.new("ShaderNodeValToRGB"); _kr.color_ramp.elements[0].color = (0.07, 0.045, 0.022, 1); _kr.color_ramp.elements[1].color = (0.17, 0.11, 0.055, 1)
_kl(_knz.outputs["Fac"], _kr.inputs["Fac"]); _kl(_kr.outputs["Color"], _kb.inputs["Base Color"])
_kbp = _kn.new("ShaderNodeBump"); _kbp.inputs["Strength"].default_value = 0.6; _kbp.inputs["Distance"].default_value = 0.001; _kl(_kmx.outputs["Value"], _kbp.inputs["Height"]); _kl(_kbp.outputs["Normal"], _kb.inputs["Normal"])
_kb.inputs["Roughness"].default_value = 0.95; _kb.inputs["Specular IOR Level"].default_value = 0.15
FOLDS = bpy.data.textures.new("sack folds", "CLOUDS"); FOLDS.noise_scale = 0.06
for (sx, sd, sh, turn) in ((-176, 300, 48, 0.4), (-150, 268, 40, 2.1)):
    prof = [(0, 0), (0.15, 0), (0.18, 0.04), (0.19, 0.16), (0.18, 0.26), (0.13, 0.34), (0.05, 0.4), (0.035, 0.42), (0.06, 0.45), (0.08, 0.5), (0, 0.49)]
    o = lathe("sack", [(r * sh / 50, h * sh / 50) for r, h in prof], SACK, at=tuple(P(sx, 0, sd)), steps=48)
    o.rotation_euler = (0, 0, turn); o.scale = (1.0, 0.85, 1.0)
    sub = o.modifiers.new("smooth", "SUBSURF"); sub.levels = 2; sub.render_levels = 2
    dp = o.modifiers.new("folds", "DISPLACE"); dp.texture = FOLDS; dp.strength = 0.025; dp.mid_level = 0.5
    bpy.ops.mesh.primitive_torus_add(major_radius=M(4.2 * sh / 50), minor_radius=M(0.55), location=tuple(P(sx, sh * 0.83, sd)))
    bpy.context.active_object.data.materials.append(ROPE)

# ── close in front of us: the games table, the game on it, the candle ─────
G = GAMES
CANDLE = (G["s"] / 2 - 4.5, G["s"] / 2 - 4.5)        # (clear of the board's corner)
def games_table():
    s, h = G["s"], G["h"]
    box_cm("games top", -s / 2, s / 2, h - 4, h, -s / 2, s / 2, MAHOGANY, 0.8)
    box_cm("games apron", -s / 2 + 3, s / 2 - 3, h - 12, h - 4, -s / 2 + 3, s / 2 - 3, MAHOGANY, 0.4)
    lathe("pedestal", [(0, 0), (0.05, 0), (0.07, 0.06), (0.045, 0.12), (0.04, 0.3), (0.055, 0.4), (0.04, 0.5), (0.05, M(h - 12)), (0, M(h - 12))], MAHOGANY, steps=32)
    for k in range(4):
        tube("foot", [(0.03, 0.08), (0.14, 0.05), (0.24, 0.015)], 0.016, MAHOGANY, rot=k / 4 * math.tau + math.pi / 4)
    # the board and the game on it: the set the level has (chess_set.py)
    chess.board(h + chess.THICK)
    chess.game(GAME, h + chess.THICK)
    # the candle at the table's far right corner, in a brass stick, burnt half down
    cx, cd = CANDLE
    lathe("candlestick", [(0, 0), (0.045, 0), (0.047, 0.006), (0.02, 0.012), (0.012, 0.05), (0.018, 0.06), (0.012, 0.065), (0.014, 0.075), (0, 0.075)], BRASS, at=tuple(P(cx, h, cd)), steps=40)
    top = h + 13.0
    cylinder("candle", M(cx), M(cd), M(h + 7), M(top), M(1.0), WAX, verts=32)
    for k in range(2):
        a = 0.8 + k * 2.3; L_ = 2.5 + k
        sphere("drip", tuple(P(cx + math.cos(a), top - L_ / 2, cd + math.sin(a))), M(0.3), WAX, squash=(1, 1, L_ / 0.6))
    cylinder("wick", M(cx), M(cd), M(top - 0.2), M(top + 0.8), M(0.07), WICK, verts=6)
assembled("games table", games_table, at=(G["x"], 0, G["d"]), turn=G["turn"])
GF = framed((G["x"], 0, G["d"]), G["turn"])
CANDLE_AT = GF(CANDLE[0], G["h"] + 13.8, CANDLE[1])
candle_l = lamp("candle", "POINT", tuple(CANDLE_AT + Vector((0, 0, 0.02))), energy=float(arg("--candle", "6")), colour=(1.0, 0.55, 0.22), size=0.012)
import_model("gallinera_chair", height=M(103), at=tuple(P(-82, 0, 214)), rot=math.pi / 2 + 0.45)
rug(-150, 130, 110, 330, rug_material("rug", f"{ASSETS}/textures/persian_rug.jpg", tint=(0.35, 0.45, 0.9), sat=0.9, value=0.4))

# ── on the right: the desk, the green lamp, the telephone, the chest ───────
DK = DESK
PHONE = dict(x=-4, d=4, w=9.5, h=22)             # in the desk's frame, standing toward us
GREEN_GLASS = bpy.data.materials.new("green glass shade"); GREEN_GLASS.use_nodes = True
_g = GREEN_GLASS.node_tree.nodes["Principled BSDF"]; _g.inputs["Base Color"].default_value = (0.008, 0.09, 0.03, 1); _g.inputs["Roughness"].default_value = 0.08; _g.inputs["Coat Weight"].default_value = 1.0
_g.inputs["Emission Color"].default_value = (0.05, 0.7, 0.2, 1); _g.inputs["Emission Strength"].default_value = 0.22
PHONE_GREY = plain("phone body", (0.05, 0.052, 0.055), rough=0.45, coat=0.2)
SCREEN = plain("phone screen", (0.04, 0.08, 0.04), rough=0.2, coat=0.6, emit=(0.4, 1.0, 0.35), strength=4.0)
KEY = plain("phone key", (0.18, 0.19, 0.2), rough=0.4)
GL = (-DK["w"] / 2 + 15, 12)                     # the green lamp, in the desk's frame
def desk():
    w, dp, h = DK["w"], DK["deep"], DK["h"]
    pedestal_desk(dict(x0=-w / 2, x1=w / 2, d0=-dp / 2, d1=dp / 2, h=h), MAHOGANY, LEATHER, BRASS)
    gx, gd = GL
    lathe("banker's lamp", [(0, 0), (0.065, 0), (0.065, 0.015), (0.03, 0.025), (0.012, 0.03), (0.009, 0.34), (0, 0.34)], BRASS, at=tuple(P(gx, h, gd)), steps=32)
    tube("shade arm", [(0, 0.3), (0.0, 0.36), (0.05, 0.38)], 0.005, BRASS, at=tuple(P(gx, h, gd)), rot=-math.pi / 2)
    sh = cylinder("green shade", 0, 0, M(-13), M(13), M(6.5), GREEN_GLASS, verts=48)
    sh.rotation_euler = (0, math.pi / 2, 0); sh.location = P(gx + 8, h + 38, gd - 6)
    boolean_cut(sh, box("cut", M(gx - 12), M(gx + 28), M(gd - 20), M(gd + 8), M(h + 30), M(h + 38), GLASS))
    so = sh.modifiers.new("thick", "SOLIDIFY"); so.thickness = M(0.35)
    # the telephone: a brick of a thing, its keys, its little green screen, its aerial
    ph = PHONE; y = h
    box_cm("phone", ph["x"] - ph["w"] / 2, ph["x"] + ph["w"] / 2, y, y + ph["h"], ph["d"] - 2.2, ph["d"] + 2.2, PHONE_GREY, 0.9)
    box_cm("screen", ph["x"] - 3.2, ph["x"] + 3.2, y + 14.2, y + 18.4, ph["d"] - 2.3, ph["d"] - 2.2, SCREEN)
    for r in range(5):
        for c_ in range(3):
            box_cm("key", ph["x"] - 3.3 + c_ * 2.4, ph["x"] - 1.6 + c_ * 2.4, y + 2.4 + r * 2.2, y + 3.8 + r * 2.2, ph["d"] - 2.45, ph["d"] - 2.2, KEY, 0.2)
    box_cm("earpiece", ph["x"] - 1.6, ph["x"] + 1.6, y + 19.8, y + 20.6, ph["d"] - 2.35, ph["d"] - 2.2, plain("earpiece grille", (0.01, 0.01, 0.01), rough=0.5))
    cylinder("aerial", M(ph["x"] + 2.8), M(ph["d"]), M(y + ph["h"]), M(y + ph["h"] + 6), M(0.55), PHONE_GREY, verts=16)
    # (a little stand behind it, as such telephones had on a desk)
    box_cm("phone stand", ph["x"] - 4, ph["x"] + 4, y, y + 3, ph["d"] + 2.2, ph["d"] + 6, PHONE_GREY, 0.5)
    # a brass telescope lying across the desk's front, a pipe, a pair of dividers on a folded chart
    tele = cylinder("telescope", 0, 0, 0, M(46), M(2.3), BRASS, verts=32, r2=M(1.6)); tele.rotation_euler = (0, math.pi / 2, 0.1); tele.location = P(-w / 2 + 8, h + 2.4, -dp / 2 + 7)
    folded = paper("folded chart", (0.62, 0.55, 0.4), 0.4)
    card("folded chart", [P(18, h + 0.2, -10), P(46, h + 0.2, -12), P(48, h + 0.2, 8), P(20, h + 0.2, 10)], folded)
assembled("desk", desk, at=DK["at"], turn=DK["turn"])
DF = framed(DK["at"], DK["turn"])
CHEST = dict(x0=26, x1=47, d0=4, d1=19, y0=DK["h"] + 1, y1=DK["h"] + 11.5, lid=7.7)
def the_chest():
    global chest_body, chest_hinge, lid_parts
    chest_body, chest_hinge, lid_parts = chest(CHEST)
assembled("chest", the_chest, at=DK["at"], turn=DK["turn"])
CHEST_PARTS = chest_body + lid_parts
desk_l = lamp("green lamp", "POINT", tuple(DF(GL[0] + 8, DK["h"] + 36.5, GL[1] - 9)), energy=float(arg("--green", "14")), colour=(1.0, 0.8, 0.52), size=0.012)
import_model("dining_chair_02", height=M(97), at=tuple(DF(DK["w"] / 2 + 16, 0, -14)), rot=DK["turn"] - math.pi / 2 + 0.5)

# ── light ──────────────────────────────────────────────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
# (the moon over the garden beyond the ship's side, its light falling in through the ports)
lamp("the moon", "SUN", tuple(P(-2500, 1600, 1100)), aim=tuple(P(0, 0, 250)), energy=float(arg("--moon", "2.5")), colour=(0.55, 0.68, 1.0), angle=math.radians(1.5))
for c in PORTS:
    sky_l = lamp("sky through the port", "AREA", tuple(on_side(-20, PORT_Y / math.cos(LEAN), c)), aim=tuple(P(0, 60, c - 60)), energy=float(arg("--sky", "6")), colour=(0.5, 0.62, 0.95), size=0.4)
    sky_l.visible_camera = False; sky_l.visible_transmission = False; sky_l.visible_glossy = False
fill_l = lamp("fill", "AREA", tuple(P(40, 150, -20)), aim=tuple(P(-40, 70, D1)), energy=float(arg("--fill", "38")), colour=(0.8, 0.85, 1.0), size=1.6)
fill_l.visible_camera = False; fill_l.visible_glossy = False
eye_fill(float(arg("--eyefill", "19")))                # (the halls' fill: nothing the eye sees falls to black)
# (one light: the storm lantern; the candle and the green lamp are out — the
# telephone's screen stays alight)
ONE = Light("ship", [lantern_l], [FLAME_GLOW]); OUT_LIGHTS = [Light("chess", [candle_l]), Light("phone", [desk_l, chart_l], [GREEN_GLASS])]
clear_glass()
air = room_haze(X0, X1, -30, D1, TOP, float(arg("--haze", "0")))

# ── what the game is told ──────────────────────────────────────────────────
x0b, x1b = -B["body"] / 2, B["body"] / 2 + B["neck"] + 4
LAYOUT.thing("compass", "Look into the bottle", [BF(x, y, d) for x in (x0b - 2, x1b) for y in (0, 5 + 2 * B["r"] + 3) for d in (-B["r"], B["r"])])
hb = chess.OUTER - 1
LAYOUT.thing("chessboard", "Look at the chessboard", [GF(x, y, d) for x in (-hb - 1, hb + 1) for y in (G["h"] + 1.2, G["h"] + 11) for d in (-hb - 1, hb + 1)])
LAYOUT.thing("mobilephone", "Pick up the telephone", [DF(x, y, d) for x in (PHONE["x"] - PHONE["w"] / 2 - 2, PHONE["x"] + PHONE["w"] / 2 + 2) for y in (DK["h"], DK["h"] + PHONE["h"] + 5) for d in (PHONE["d"] - 3, PHONE["d"] + 3)])
LAYOUT.chest(CHEST, at=DK["at"], turn=DK["turn"])
LAYOUT.glow("lantern", P(lx, ly + 13, ld), 70)
LAYOUT.glow("flame", CANDLE_AT + Vector((0, 0, 0.02)), 44)
LAYOUT.flame("candle", CANDLE_AT)
LAYOUT.glow("desk", DF(GL[0] + 8, DK["h"] + 22, GL[1] - 6), 90)
LAYOUT.glow("screen", DF(PHONE["x"], DK["h"] + 16.3, PHONE["d"] - 2.3), 14)
for pane in PORT_GLASS: LAYOUT.pane(pane)
LAYOUT.dust([on_side(0, PORT_Y / math.cos(LEAN) + PORT_R, PORTS[0] - PORT_R), on_side(0, PORT_Y / math.cos(LEAN) - PORT_R, PORTS[1] + PORT_R), P(40, 0, 300), P(-60, 0, 520)])
LAYOUT.write()

# ── the passes ─────────────────────────────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "1.55")))
scene.cycles.volume_bounces = 1
GLOSSY = ("green glass shade", "phone screen", "putty sea", "hull", "gilt line")                # (what keeps its shine: glazes, screens, lamp glass)
finish(scene, SAMPLES, keep_gloss=GLOSSY)
plates = one_light(ONE, OUT_LIGHTS) if "plates" in ONLY else {}
passes(scene, OUT, set(plates), air, apart={"chest": CHEST_PARTS}, variants=plates)
if "chest" in ONLY:
    air.hide_render = True
    chest_sprites(scene, OUT, LAYOUT.data["chest"]["box"], chest_body, chest_hinge, lid_parts)
print("ROOM_DONE")
