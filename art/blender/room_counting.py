# Room IV, the counting room, built in three dimensions and rendered with
# Cycles, seen from the step inside its door, from above, as a clerk coming
# down into it would see it.
#
# Plaster walls, stone flags underfoot, heavy beams overhead. In the middle of
# the floor, standing free and turned a little, the counting table: a green-
# shaded lamp, a ledger open, brass scales, the gilt chest. Down the left-hand
# wall a long cork board in an oak frame, six index cards pinned along it,
# each with its number in ink — the sequence puzzle's own (counting_boards.mjs)
# — a brass picture light over it; in the far corner an iron stove, its fire
# still in, its pipe going up and into the wall. On the back wall a painting in
# a dull gilt frame — a farmhouse at dawn, six birds on five wires, just where
# the wires puzzle has them — under a light of its own; a small leaded window
# set high and deep, the moon's light coming down from it; under the window a
# chest of three drawers, a candle on it, its top drawer full of old railway
# tickets — it slides out (ten frames, apart); a tall case of registers.
#
# Each puzzle's light burns until it is solved: the board's light and the
# table's lamp (the cards), the painting's light (the painting), the candle
# (the drawer — which, once its puzzle is done, stands pulled out). A plate
# for each way they can stand (lights-<cards><painting><drawer>); the chest
# and the drawer's frames apart; where it all fell in the picture
# (src/levels/house/rooms/Room4.json). The stove stays in.
#
#   blender -b --factory-startup -P art/blender/room_counting.py -- [--samples 256] [--width 2560] [--only plates,chest,drawer]

import bpy, bmesh, math, os, sys, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *

OUT = os.path.join(ROOT, ".artifacts/room-counting")
os.makedirs(OUT, exist_ok=True)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")
SAMPLES = int(arg("--samples", "700"))
WIDTH = int(arg("--width", "2560"))
ONLY = set(arg("--only", "plates,chest,drawer").split(","))
RNG = random.Random(1913)

# ── the room, and where we stand in it ─────────────────────────────────────
X0, X1, D1, TOP = -240, 240, 540, 300
EYE = (float(arg("--ex", "160")), float(arg("--ey", "205")), float(arg("--ed", "30")))
LOOK = (float(arg("--lx", "-70")), float(arg("--ly", "75")), float(arg("--ld", "440")))
scene, HEIGHT = stage(WIDTH, eye=EYE, look=LOOK, lens=float(arg("--lens", "22")))
WIN = dict(x=112, hw=26, top=264, sill=186)
TABLE = dict(at=(-78, 0, 246), turn=math.radians(18), w=150, deep=80, h=78)
BOARD = dict(d0=246, d1=410, y0=118, y1=176)     # on the left-hand wall
PAINT = dict(x0=-112, x1=12, y0=118)              # on the back wall
PAINT["y1"] = PAINT["y0"] + (PAINT["x1"] - PAINT["x0"] - 10) * 9 / 16 + 10
CAB = dict(x0=80, x1=144, d0=496, d1=540, h=88)   # the chest of drawers, under the window
DRAWER = dict(x0=CAB["x0"] + 3, x1=CAB["x1"] - 3, y0=CAB["h"] - 26, y1=CAB["h"] - 6, pull=16)
CAB_CANDLE = dict(x=CAB["x0"] + 12, y=CAB["h"], d=518)
SHELF = dict(x0=160, x1=222, d0=508, d1=540, h=190)
STOVE = dict(x=-190, d=486)
FRAMES = 10

# ── materials ──────────────────────────────────────────────────────────────
PLASTER = scan("lime plaster", "white_plaster_rough_01", size=2.4, tint=(0.95, 0.88, 0.76), bright=1.1, sat=0.45, rough=(0.8, 0.95), bump=0.5)
FLAGS = scan("stone flags", "worn_tile_floor", size=1.4, tint=(0.9, 0.86, 0.8), bright=0.55, sat=0.5, rough=(0.35, 0.75), bump=0.6, coat=0.1)
OAK = scan("oak", "dark_wood", size=1.0, tint=(0.82, 0.62, 0.44), bright=0.5, rough=(0.3, 0.55), bump=0.3, coat=0.35, upright=True)
OAK_X = scan("oak across", "dark_wood", size=1.0, tint=(0.82, 0.62, 0.44), bright=0.48, rough=(0.3, 0.55), bump=0.3, coat=0.35)
BEAM = scan("beam", "dark_wood", size=1.4, tint=(0.6, 0.45, 0.35), bright=0.35, rough=(0.5, 0.8), bump=0.6)
MAHOGANY = scan("mahogany", "rosewood_veneer1", size=0.7, tint=(0.75, 0.48, 0.34), bright=0.5, sat=0.9, rough=(0.18, 0.38), bump=0.2, coat=0.55, upright=True)
LEATHER = scan("desk leather", "brown_leather", size=0.5, tint=(0.35, 0.45, 0.28), bright=0.5, rough=(0.35, 0.6), bump=0.4)
BRASS = aged_metal("brass", (0.58, 0.41, 0.18), (0.08, 0.06, 0.03), rough=(0.2, 0.48), scale=30, tarnish=0.5)
GILT = aged_metal("frame gilt", (0.6, 0.45, 0.2), (0.12, 0.08, 0.035), rough=(0.25, 0.55), scale=50, tarnish=0.6)
IRON = aged_metal("cast iron", (0.06, 0.06, 0.06), (0.04, 0.025, 0.018), rough=(0.45, 0.8), scale=18, tarnish=0.55)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
LEADED = plain("old glass", (0.75, 0.85, 0.72), rough=0.12, transmission=1.0, ior=1.5)
LEAD = plain("lead", (0.06, 0.065, 0.07), rough=0.5, metal=0.7)
WAX = bpy.data.materials.new("wax"); WAX.use_nodes = True
_w = WAX.node_tree.nodes["Principled BSDF"]; _w.inputs["Base Color"].default_value = (0.82, 0.74, 0.58, 1); _w.inputs["Subsurface Weight"].default_value = 0.6; _w.inputs["Subsurface Radius"].default_value = (0.02, 0.012, 0.006); _w.inputs["Roughness"].default_value = 0.42
WICK = plain("wick", (0.01, 0.01, 0.01), rough=0.9)
CARDS = picture("index cards", os.path.join(DRAWN, "cards.png"), rough=0.85)
PAINTING = picture("the painting", os.path.join(DRAWN, "painting.png"), rough=0.55, coat=0.35, bump=0.15)
def cork():
    m = bpy.data.materials.new("cork"); m.use_nodes = True
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); vz = N.new("ShaderNodeTexVoronoi"); vz.inputs["Scale"].default_value = 420
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 160; nz.inputs["Detail"].default_value = 6
    Lk(tc.outputs["Object"], vz.inputs["Vector"]); Lk(tc.outputs["Object"], nz.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (0.12, 0.065, 0.03, 1); ramp.color_ramp.elements[1].color = (0.4, 0.25, 0.13, 1)
    Lk(nz.outputs["Fac"], ramp.inputs["Fac"]); Lk(ramp.outputs["Color"], b.inputs["Base Color"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.7; bp.inputs["Distance"].default_value = 0.001; Lk(vz.outputs["Distance"], bp.inputs["Height"]); Lk(bp.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.95
    return m
CORK = cork()
LAYOUT = Layout("Room4")

# ── the shell: plaster, flags, beams ──────────────────────────────────────
box_cm("floor", X0 - 20, X1 + 20, -6, 0, -40, D1 + 20, FLAGS)
box_cm("ceiling", X0 - 20, X1 + 20, TOP, TOP + 10, -40, D1 + 20, PLASTER)
for d in range(40, D1, 72):
    box_cm("beam", X0, X1, TOP - 24, TOP, d - 10, d + 10, BEAM, 1.5)
box_cm("wall plate", X0, X1, TOP - 16, TOP, D1 - 14, D1, BEAM, 1.5)
box_cm("wall plate", X0, X0 + 14, TOP - 16, TOP, -40, D1, BEAM, 1.5)
for (x0, x1) in ((X0 - 25, X0), (X1, X1 + 25)):
    box_cm("wall", x0, x1, 0, TOP, -40, D1 + 20, PLASTER)
box_cm("skirting", X0, X0 + 2.5, 0, 14, -40, D1, OAK_X, 0.5)
box_cm("skirting", X1 - 2.5, X1, 0, 14, -40, D1, OAK_X, 0.5)
box_cm("door wall", X0 - 25, X1 + 25, 0, TOP, -65, -40, PLASTER)
back = box_cm("back wall", X0 - 25, X1 + 25, 0, TOP, D1, D1 + 30, PLASTER)
wx0, wx1 = WIN["x"] - WIN["hw"], WIN["x"] + WIN["hw"]
boolean_cut(back, box("cut", M(wx0), M(wx1), M(D1 - 10), M(D1 + 60), M(WIN["sill"]), M(WIN["top"]), IRON))
box_cm("skirting", X0, X1, 0, 14, D1 - 2.5, D1, OAK_X, 0.5)

# ── the window: small, leaded, set high and deep ──────────────────────────
for (a, b, c, e) in ((wx0 - 1, wx0, WIN["sill"], WIN["top"]), (wx1, wx1 + 1, WIN["sill"], WIN["top"])):
    box_cm("reveal", a, b, c, e, D1, D1 + 30, PLASTER)
box_cm("reveal head", wx0, wx1, WIN["top"], WIN["top"] + 1, D1, D1 + 30, PLASTER)
box_cm("sill", wx0 - 4, wx1 + 4, WIN["sill"] - 5, WIN["sill"], D1 - 6, D1 + 29, scan("sill stone", "worn_tile_floor", size=0.6, bright=0.6, rough=(0.4, 0.8)), 1.0)
GD = D1 + 22
casement = box_cm("casement", wx0, wx1, WIN["sill"], WIN["top"], GD - 2.5, GD + 2.5, OAK, 0.4)
boolean_cut(casement, box("cut", M(wx0 + 4), M(wx1 - 4), M(GD - 5), M(GD + 5), M(WIN["sill"] + 4), M(WIN["top"] - 4), IRON))
box_cm("leaded glass", wx0 + 4, wx1 - 4, WIN["sill"] + 4, WIN["top"] - 4, GD - 0.2, GD + 0.2, LEADED)
def lead_line(p0, p1):
    """a lead came across the glass, clipped to the opening"""
    (x0_, y0_), (x1_, y1_) = p0, p1
    xa, xb, ya, yb = wx0 + 4, wx1 - 4, WIN["sill"] + 4, WIN["top"] - 4
    t0, t1 = 0.0, 1.0
    for p, q in ((-(x1_ - x0_), x0_ - xa), (x1_ - x0_, xb - x0_), (-(y1_ - y0_), y0_ - ya), (y1_ - y0_, yb - y0_)):
        if p == 0:
            if q < 0: return
            continue
        r = q / p
        if p < 0: t0 = max(t0, r)
        else: t1 = min(t1, r)
    if t0 >= t1: return
    arch(rod("came", P(x0_ + (x1_ - x0_) * t0, y0_ + (y1_ - y0_) * t0, GD - 0.3), P(x0_ + (x1_ - x0_) * t1, y0_ + (y1_ - y0_) * t1, GD - 0.3), M(0.35), LEAD, verts=6))
for k in range(-14, 15):
    base = WIN["x"] + k * 8.0
    lead_line((base - 60, WIN["sill"] - 40), (base + 60, WIN["top"] + 60))
    lead_line((base + 60, WIN["sill"] - 40), (base - 60, WIN["top"] + 60))
MOON_AT = P(900, 2400, 2600)                     # (high, out of sight: only its light comes in)
garden(MOON_AT, [("island_tree_01", -300, 1500, 10.0, 0.3), ("island_tree_02", 700, 1900, 12.0, 1.4), ("tree_small_02", 300, 1100, 5.0, 2.2)],
       (-1500, 1500, D1 + 50, 3200, -40), P(300, 800, 3800), sky_size=45)

# ── down the left-hand wall: the board, its light; the stove in the corner ─
bd = BOARD
for (a, b, c, e) in ((bd["d0"], bd["d1"], bd["y0"], bd["y0"] + 4), (bd["d0"], bd["d1"], bd["y1"] - 4, bd["y1"]), (bd["d0"], bd["d0"] + 4, bd["y0"], bd["y1"]), (bd["d1"] - 4, bd["d1"], bd["y0"], bd["y1"])):
    box_cm("board frame", X0, X0 + 3.5, c, e, a, b, OAK_X if e - c < 10 else OAK, 0.6)
box_cm("cork", X0, X0 + 2, bd["y0"] + 4, bd["y1"] - 4, bd["d0"] + 4, bd["d1"] - 4, CORK)
cw, ch = 15, 24
gap = (bd["d1"] - bd["d0"] - 16) / 6
PIN = plain("pin head", (0.45, 0.05, 0.04), rough=0.3, coat=0.6)
for c in range(6):
    # (the first card nearest the door: left to right, as one facing the wall reads them)
    # (facing the left-hand wall, further along d is to the right)
    dc = bd["d0"] + 8 + gap * (c + 0.5); y = (bd["y0"] + bd["y1"]) / 2
    dd, dy, tilt = RNG.uniform(-1, 1), RNG.uniform(-1.2, 1.2), RNG.uniform(-0.06, 0.06)
    rot = lambda p: (dc + dd + p[0] * math.cos(tilt) - p[1] * math.sin(tilt), y + dy + p[0] * math.sin(tilt) + p[1] * math.cos(tilt))
    corners_ = [(-cw / 2, -ch / 2), (cw / 2, -ch / 2), (cw / 2, ch / 2), (-cw / 2, ch / 2)]
    arch(card("index card", [P(X0 + 2.15, rot(p)[1], rot(p)[0]) for p in corners_], CARDS, uv=(c / 6, 0, (c + 1) / 6, 1)))
    hd_, hy_ = rot((0, ch / 2 - 2))
    arch(sphere("pin", tuple(P(X0 + 2.6, hy_, hd_)), M(0.55), PIN, squash=(0.6, 1, 1)))
bm_ = (bd["d0"] + bd["d1"]) / 2
for e in (-1, 1):
    tube("light arm", [(0, 0), (0.0, 0.05), (0.08, 0.09)], 0.005, BRASS, at=tuple(P(X0, bd["y1"] + 2, bm_ + e * 30)), rot=0.0)
hood = cylinder("board light", 0, 0, M(-40), M(40), M(3.2), BRASS, verts=32); hood.rotation_euler = (math.pi / 2, 0, 0); hood.location = P(X0 + 9, bd["y1"] + 10, bm_)
BOARD_BULB = plain("board light bulb", (1, 0.9, 0.7), emit=(1.0, 0.82, 0.55), strength=8)
box_cm("board light tube", X0 + 8, X0 + 10, bd["y1"] + 7, bd["y1"] + 7.6, bm_ - 36, bm_ + 36, BOARD_BULB)
board_l = lamp("board light", "AREA", tuple(P(X0 + 9, bd["y1"] + 6, bm_)), aim=tuple(P(X0 + 1, bd["y0"], bm_)), energy=float(arg("--boardlight", "16")), colour=(1.0, 0.75, 0.45), size=0.05, size_y=0.75)
board_l.visible_camera = False
# a bench under it, registers stacked on it
box_cm("bench", X0 + 2, X0 + 40, 44, 48, bd["d0"] + 6, bd["d1"] - 6, OAK_X, 0.8)
for d in (bd["d0"] + 12, bd["d1"] - 12):
    box_cm("bench end", X0 + 4, X0 + 38, 0, 44, d - 2, d + 2, OAK, 0.5)
spines = bound(picture("register spines", os.path.join(DRAWN, "spines.png"), rough=0.5, coat=0.15, bump=0.3))
PAGES = plain("pages", (0.3, 0.26, 0.19), rough=0.9)
COVERS = cover_materials()
for k in range(5):
    o = book(RNG, 0, 0, 0, 5.5, 38 - k, 28, spines, COVERS, PAGES)
    o.rotation_euler = (math.pi / 2, 0, RNG.uniform(-0.15, 0.15)); o.location = P(X0 + 20, 48 + 2.8 + k * 5.6, bd["d0"] + 46)
# the stove, its fire in, its pipe up and into the back wall; logs in a basket
st = STOVE
box_cm("hearth", st["x"] - 44, st["x"] + 44, 0, 4, st["d"] - 44, D1, scan("hearth stone", "worn_tile_floor", size=0.8, bright=0.5, rough=(0.4, 0.8)), 0.8)
sx0, sx1, sd0, sd1 = st["x"] - 30, st["x"] + 30, st["d"] - 24, st["d"] + 20
for (x, d) in ((sx0 + 4, sd0 + 4), (sx1 - 4, sd0 + 4), (sx0 + 4, sd1 - 4), (sx1 - 4, sd1 - 4)):
    tube("stove leg", [(0.0, 0.04), (0.02, 0.1), (0.0, 0.18)], 0.018, IRON, at=tuple(P(x, 0, d)), rot=math.atan2(d - st["d"], x - st["x"]))
box_cm("stove", sx0, sx1, 18, 78, sd0, sd1, IRON, 1.2)
box_cm("stove top", sx0 - 3, sx1 + 3, 78, 82, sd0 - 3, sd1 + 3, IRON, 0.8)
box_cm("stove fender", sx0 - 2, sx1 + 2, 18, 22, sd0 - 2, sd1 + 2, IRON, 0.6)
box_cm("stove door", st["x"] - 21, st["x"] + 21, 28, 68, sd0 - 1.6, sd0, IRON, 0.6)
FIRE = plain("embers", (0.3, 0.05, 0.01), emit=(1.0, 0.32, 0.06), strength=14)
box_cm("mica", st["x"] - 15, st["x"] + 15, 36, 60, sd0 - 1.8, sd0 - 1.6, plain("mica", (0.6, 0.4, 0.2), rough=0.25, transmission=0.85, ior=1.3))
box_cm("fire", st["x"] - 16, st["x"] + 16, 22, 44, sd0 + 2, sd0 + 18, FIRE)
for k in range(5):
    cylinder("log in fire", M(st["x"] - 14 + k * 7), M(sd0 + 10), M(40), M(44), M(1.8), plain("charred log", (0.02, 0.012, 0.008), rough=0.9))
lathe("door knob", [(0, 0), (0.01, 0), (0.014, 0.012), (0, 0.02)], BRASS, at=tuple(P(st["x"] + 17, 48, sd0 - 1.6)), steps=16).rotation_euler = (math.pi / 2, 0, 0)
cylinder("flue", M(st["x"]), M(st["d"] - 2), M(82), M(240), M(7.5), IRON, verts=32)
sphere("flue elbow", tuple(P(st["x"], 240, st["d"] - 2)), M(7.6), IRON)
fl = cylinder("flue", 0, 0, 0, M(D1 - st["d"] + 4), M(7.5), IRON, verts=32); fl.rotation_euler = (-math.pi / 2, 0, 0); fl.location = P(st["x"], 240, st["d"] - 2)
box_cm("flue collar", st["x"] - 11, st["x"] + 11, 229, 251, D1 - 3, D1, IRON, 0.5)
lathe("kettle", [(0, 0), (0.1, 0), (0.12, 0.04), (0.11, 0.1), (0.06, 0.15), (0.03, 0.16), (0, 0.17)], aged_metal("kettle copper", (0.5, 0.26, 0.14), (0.1, 0.06, 0.04), rough=(0.3, 0.6), scale=20, tarnish=0.6), at=tuple(P(st["x"] + 10, 82, st["d"] - 4)), steps=40)
stove_l = lamp("stove fire", "POINT", tuple(P(st["x"], 40, sd0 - 6)), energy=float(arg("--stove", "18")), colour=(1.0, 0.42, 0.12), size=0.15)
BARK = scan("bark", "jolcham_oak_bark_01", size=0.3, bright=0.45, rough=(0.7, 1.0), bump=0.8)
bx_, bd_ = st["x"] + 54, st["d"] - 50
cylinder("basket", M(bx_), M(bd_), 0, M(30), M(22), plain("wicker", (0.22, 0.13, 0.06), rough=0.85), verts=40, open_ends=True).modifiers.new("thick", "SOLIDIFY").thickness = M(1.2)
for k in range(9):
    a = RNG.uniform(0, math.tau); r = RNG.uniform(0, 12)
    lg = cylinder("log", 0, 0, -M(22), M(22), M(RNG.uniform(3.5, 5.5)), BARK, verts=16)
    lg.rotation_euler = (math.pi / 2 + RNG.uniform(-0.3, 0.3), 0, RNG.uniform(0, math.pi)); lg.location = P(bx_ + math.cos(a) * r, 12 + k * 3.2, bd_ + math.sin(a) * r)

# ── the back wall: the painting, its light; the chest of drawers; registers ─
pt = PAINT
def on_back(x0, x1, y0, y1, d):
    return [P(x0, y0, d), P(x1, y0, d), P(x1, y1, d), P(x0, y1, d)]
for (a, b, c, e) in ((pt["x0"], pt["x1"], pt["y0"], pt["y0"] + 5), (pt["x0"], pt["x1"], pt["y1"] - 5, pt["y1"]), (pt["x0"], pt["x0"] + 5, pt["y0"], pt["y1"]), (pt["x1"] - 5, pt["x1"], pt["y0"], pt["y1"])):
    box_cm("gilt frame", a, b, c, e, D1 - 4.5, D1, GILT, 1.2)
arch(card("painting", on_back(pt["x0"] + 5, pt["x1"] - 5, pt["y0"] + 5, pt["y1"] - 5, D1 - 2.0), PAINTING))
pm = (pt["x0"] + pt["x1"]) / 2
tube("painting light arm", [(0, 0), (0.06, 0.04), (0.1, 0.035)], 0.004, BRASS, at=tuple(P(pm, pt["y1"] + 10, D1)), rot=-math.pi / 2)
hood2 = cylinder("painting light", 0, 0, M(-30), M(30), M(2.8), BRASS, verts=24); hood2.rotation_euler = (0, math.pi / 2, 0); hood2.location = P(pm, pt["y1"] + 11, D1 - 10)
PAINT_BULB = plain("painting light bulb", (1, 0.9, 0.7), emit=(1.0, 0.82, 0.55), strength=8)
box_cm("painting light tube", pm - 26, pm + 26, pt["y1"] + 8, pt["y1"] + 8.6, D1 - 10, D1 - 9, PAINT_BULB)
paint_l = lamp("painting light", "AREA", tuple(P(pm, pt["y1"] + 7, D1 - 9)), aim=tuple(P(pm, pt["y0"], D1)), energy=float(arg("--paintlight", "12")), colour=(1.0, 0.75, 0.45), size=0.58, size_y=0.05)
paint_l.visible_camera = False
# the chest of drawers under the window, its candle, its top drawer
cb = CAB
box_cm("cabinet", cb["x0"], cb["x1"], 4, cb["h"] - 2, cb["d0"], cb["d1"], MAHOGANY, 0.6)
box_cm("cabinet top", cb["x0"] - 2, cb["x1"] + 2, cb["h"] - 2, cb["h"], cb["d0"] - 2, cb["d1"], MAHOGANY, 0.6)
box_cm("cabinet plinth", cb["x0"] - 1, cb["x1"] + 1, 0, 4, cb["d0"] - 1, cb["d1"], MAHOGANY, 0.4)
for (y0, y1) in ((10, 34), (36, 60)):
    box_cm("drawer front", cb["x0"] + 3, cb["x1"] - 3, y0, y1, cb["d0"] - 1.2, cb["d0"], MAHOGANY, 0.5)
    for k in (0.24, 0.76):
        lathe("knob", [(0, 0), (0.009, 0), (0.012, 0.01), (0.008, 0.016), (0, 0.017)], BRASS, at=tuple(P(cb["x0"] + (cb["x1"] - cb["x0"]) * k, (y0 + y1) / 2, cb["d0"] - 1.2)), steps=16).rotation_euler = (math.pi / 2, 0, 0)
dr = DRAWER
drawer = bpy.data.objects.new("top drawer", None); link(drawer)
def part(o):
    o.parent = drawer; return o
part(box_cm("drawer front", dr["x0"], dr["x1"], dr["y0"], dr["y1"], cb["d0"] - 1.2, cb["d0"], MAHOGANY, 0.5, keep=False))
part(box_cm("drawer bottom", dr["x0"] + 1, dr["x1"] - 1, dr["y0"] + 1, dr["y0"] + 1.8, cb["d0"], cb["d1"] - 2, OAK_X, keep=False))
for x in (dr["x0"] + 1, dr["x1"] - 2.2):
    part(box_cm("drawer side", x, x + 1.2, dr["y0"] + 1, dr["y1"] - 2, cb["d0"], cb["d1"] - 2, OAK, keep=False))
part(box_cm("drawer back", dr["x0"] + 1, dr["x1"] - 1, dr["y0"] + 1, dr["y1"] - 3, cb["d1"] - 3.2, cb["d1"] - 2, OAK, keep=False))
for k in (0.24, 0.76):
    kn = lathe("knob", [(0, 0), (0.009, 0), (0.012, 0.01), (0.008, 0.016), (0, 0.017)], BRASS, at=tuple(P(cb["x0"] + (cb["x1"] - cb["x0"]) * k, (dr["y0"] + dr["y1"]) / 2, cb["d0"] - 1.2)), steps=16)
    kn.rotation_euler = (math.pi / 2, 0, 0); part(kn)
TICKETS = [plain(f"ticket {i}", c, rough=0.8) for i, c in enumerate([(0.62, 0.6, 0.48), (0.28, 0.45, 0.3), (0.62, 0.42, 0.4), (0.55, 0.5, 0.3)])]
for row in range(6):
    d = cb["d0"] + 3 + row * 6
    x = dr["x0"] + 3
    while x < dr["x1"] - 4:
        # (each ticket stood on its edge, leaning a little: turned about its own middle)
        t = part(box_cm("ticket", -0.04, 0.04, 0, 3.0, -2.85, 2.85, RNG.choice(TICKETS), keep=False))
        t.location = P(x, dr["y0"] + 1.8, d + 2.85); t.rotation_euler = (0, RNG.uniform(-0.25, 0.25), 0)
        x += RNG.uniform(0.25, 0.6)
def pull(cm):
    drawer.location = P(0, 0, -cm)
pull(0)
cx, cd, cy = CAB_CANDLE["x"], CAB_CANDLE["d"], CAB_CANDLE["y"]
lathe("candlestick", [(0, 0), (0.045, 0), (0.047, 0.006), (0.02, 0.012), (0.012, 0.05), (0.018, 0.06), (0.012, 0.065), (0.014, 0.075), (0, 0.075)], BRASS, at=tuple(P(cx, cy, cd)), steps=40)
CANDLE_TOP = cy + 19.5
cylinder("candle", M(cx), M(cd), M(cy + 7), M(CANDLE_TOP), M(1.0), WAX, verts=32)
cylinder("wick", M(cx), M(cd), M(CANDLE_TOP - 0.2), M(CANDLE_TOP + 0.8), M(0.07), WICK, verts=6)
CANDLE_FLAME = plain("candle flame", (1, 0.7, 0.3), emit=(1.0, 0.62, 0.25), strength=30)
sphere("flame", tuple(P(cx, CANDLE_TOP + 1.6, cd)), M(0.45), CANDLE_FLAME, squash=(0.6, 0.6, 2.0))
candle_l = lamp("candle", "POINT", tuple(P(cx, CANDLE_TOP + 2, cd)), energy=float(arg("--candle", "6")), colour=(1.0, 0.55, 0.22), size=0.012)
# the registers, in their tall case against the back wall
sf = SHELF
box_cm("register case", sf["x0"], sf["x1"], 0, sf["h"], sf["d1"] - 2, sf["d1"], OAK)
for x in (sf["x0"], sf["x1"] - 2):
    box_cm("register case side", x, x + 2, 0, sf["h"], sf["d0"], sf["d1"], OAK, 0.4)
box_cm("register case top", sf["x0"] - 2, sf["x1"] + 2, sf["h"], sf["h"] + 4, sf["d0"] - 2, sf["d1"], OAK_X, 0.6)
def register(x0, y, w, h, depth):
    """a register standing on a shelf of the case, its spine to the room"""
    me = bpy.data.meshes.new("register"); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    uv = bm.loops.layers.uv.new(); cell = RNG.randrange(32); u0, v0 = (cell % 8) / 8, 1 - (cell // 8 + 1) / 4
    for v in bm.verts: v.co = Vector((v.co.x * M(w), v.co.y * M(depth), v.co.z * M(h)))
    for f in bm.faces:
        n = f.normal
        if n.y < -0.9:
            f.material_index = 1
            for lp in f.loops: lp[uv].uv = (u0 + (0.5 + lp.vert.co.x / M(w)) / 8, v0 + (0.5 + lp.vert.co.z / M(h)) / 4)
        elif abs(n.z) > 0.9: f.material_index = 2
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("register", me))
    o.data.materials.append(RNG.choice(COVERS)); o.data.materials.append(spines); o.data.materials.append(PAGES)
    o.location = P(x0 + w / 2, y + h / 2, sf["d1"] - 2 - depth / 2)
    return o
for y in (6, 52, 98, 144):
    box_cm("register shelf", sf["x0"] + 2, sf["x1"] - 2, y - 2, y, sf["d0"], sf["d1"], OAK_X, 0.4)
    x = sf["x0"] + 3
    while x < sf["x1"] - 8:
        w = RNG.uniform(4.5, 7.5); register(x, y, w, RNG.uniform(33, 40), 26); x += w + RNG.uniform(0.1, 0.4)

# ── in the middle: the counting table, the lamp, the ledger, the scales ───
TB = TABLE
GL = (-TB["w"] / 2 + 18, 18)                      # the green lamp, in the table's frame
GREEN_GLASS = bpy.data.materials.new("green glass shade"); GREEN_GLASS.use_nodes = True
_g = GREEN_GLASS.node_tree.nodes["Principled BSDF"]; _g.inputs["Base Color"].default_value = (0.008, 0.09, 0.03, 1); _g.inputs["Roughness"].default_value = 0.08; _g.inputs["Coat Weight"].default_value = 1.0
_g.inputs["Emission Color"].default_value = (0.05, 0.7, 0.2, 1); _g.inputs["Emission Strength"].default_value = 0.22
def counting_table():
    w, dp, h = TB["w"], TB["deep"], TB["h"]
    pedestal_desk(dict(x0=-w / 2, x1=w / 2, d0=-dp / 2, d1=dp / 2, h=h), MAHOGANY, LEATHER, BRASS)
    gx, gd = GL
    lathe("banker's lamp", [(0, 0), (0.065, 0), (0.065, 0.015), (0.03, 0.025), (0.012, 0.03), (0.009, 0.34), (0, 0.34)], BRASS, at=tuple(P(gx, h, gd)), steps=32)
    tube("shade arm", [(0, 0.3), (0.0, 0.36), (0.05, 0.38)], 0.005, BRASS, at=tuple(P(gx, h, gd)), rot=-math.pi / 2)
    sh = cylinder("green shade", 0, 0, M(-13), M(13), M(6.5), GREEN_GLASS, verts=48)
    sh.rotation_euler = (0, math.pi / 2, 0); sh.location = P(gx + 8, h + 38, gd - 6)
    boolean_cut(sh, box("cut", M(gx - 12), M(gx + 28), M(gd - 20), M(gd + 8), M(h + 30), M(h + 38), GLASS))
    sh.modifiers.new("thick", "SOLIDIFY").thickness = M(0.35)
    # a ledger open, a pen; an inkwell; brass scales and their weights
    page = paper("ledger", (0.66, 0.6, 0.48), 0.3)
    card("open ledger", [P(-14, h + 0.65, -22), P(30, h + 0.65, -22), P(30, h + 0.65, 6), P(-14, h + 0.65, 6)], page)
    box_cm("ledger boards", -15, 31, h, h + 0.6, -23, 7, scan("ledger cloth", "brown_leather", size=0.3, tint=(0.25, 0.3, 0.45), bright=0.4), 0.3, keep=False)
    tube("pen", [(0, 0), (0.15, 0.003)], 0.004, plain("pen", (0.02, 0.02, 0.02), rough=0.3), at=tuple(P(2, h + 1.0, -8)), rot=0.4)
    lathe("inkwell", [(0, 0), (0.035, 0), (0.035, 0.035), (0.018, 0.045), (0.012, 0.05), (0, 0.05)], GLASS, at=tuple(P(38, h, 14)), steps=32)
    cylinder("ink", M(38), M(14), M(h + 0.2), M(h + 2.5), M(3.2), plain("ink", (0.005, 0.005, 0.01), rough=0.1))
    sx, sd = -24, 22
    box_cm("scales base", sx - 12, sx + 12, h, h + 2.5, sd - 6, sd + 6, MAHOGANY, 0.6, keep=False)
    cylinder("scales pillar", M(sx), M(sd), M(h + 2.5), M(h + 30), M(0.7), BRASS, verts=16)
    rod("scales beam", P(sx - 13, h + 29, sd), P(sx + 13, h + 29, sd), M(0.45), BRASS, verts=10)
    for e in (-1, 1):
        for k in range(3):
            a = k / 3 * math.tau
            rod("pan chain", P(sx + e * 13, h + 29, sd), P(sx + e * 13 + math.cos(a) * 5.5, h + 11, sd + math.sin(a) * 5.5), M(0.08), BRASS, verts=4)
        lathe("pan", [(0, 0), (0.06, 0.004), (0.065, 0.012), (0, 0.008)], BRASS, at=tuple(P(sx + e * 13, h + 10.5, sd)), steps=32)
    for wx, ww in ((-6, 1.6), (-3, 1.2), (-0.6, 0.9)):
        cylinder("weight", M(sx + 16 + wx), M(sd - 10), M(h), M(h + ww * 2.2), M(ww), BRASS, verts=20)
assembled("counting table", counting_table, at=TB["at"], turn=TB["turn"])
TF = framed(TB["at"], TB["turn"])
desk_l = lamp("green lamp", "POINT", tuple(TF(GL[0] + 8, TB["h"] + 36.5, GL[1] - 9)), energy=float(arg("--green", "14")), colour=(1.0, 0.8, 0.52), size=0.012)
CHEST = dict(x0=36, x1=57, d0=-26, d1=-11, y0=TB["h"] + 1, y1=TB["h"] + 11.5, lid=7.7)
def the_chest():
    global chest_body, chest_hinge, lid_parts
    chest_body, chest_hinge, lid_parts = chest(CHEST)
assembled("chest", the_chest, at=TB["at"], turn=TB["turn"])
CHEST_PARTS = chest_body + lid_parts
import_model("dining_chair_02", height=M(97), at=tuple(TF(-30, 0, -TB["deep"] / 2 - 40)), rot=TB["turn"] + math.pi + 0.5)
rug(-200, 40, 130, 380, rug_material("rug", f"{ASSETS}/textures/persian_rug.jpg", tint=(1.0, 0.55, 0.42), sat=1.0, value=0.4))

# ── light ──────────────────────────────────────────────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
# (the moon high over the garden, its light coming down steeply through the high window)
lamp("the moon", "SUN", tuple(P(300, 2000, 2700)), aim=tuple(P(90, 0, 330)), energy=float(arg("--moon", "3.5")), colour=(0.55, 0.68, 1.0), angle=math.radians(1.5))
sky_l = lamp("sky through the window", "AREA", tuple(P(WIN["x"], 225, D1 + 30)), aim=tuple(P(40, 20, 400)), energy=float(arg("--sky", "12")), colour=(0.5, 0.62, 0.95), size=0.5, size_y=0.7)
sky_l.visible_camera = False; sky_l.visible_transmission = False; sky_l.visible_glossy = False
fill_l = lamp("fill", "AREA", tuple(P(120, 240, 20)), aim=tuple(P(-60, 60, D1)), energy=float(arg("--fill", "38")), colour=(0.8, 0.85, 1.0), size=2.2)
fill_l.visible_camera = False; fill_l.visible_glossy = False
eye_fill(float(arg("--eyefill", "65")))                # (the halls' fill: nothing the eye sees falls to black)
for (at, aim) in ((P(-20, 200, 360), P(-20, 140, D1)), (P(-100, 200, 330), P(X0, 130, 350)), (P(150, 200, 380), P(150, 130, D1))):
    wash = lamp("on the walls", "AREA", tuple(at), aim=tuple(aim), energy=float(arg("--wash", "15")), colour=(0.82, 0.86, 1.0), size=1.0)
    wash.visible_camera = False; wash.visible_glossy = False
# (one light: the green lamp on the counting table; the picture lights and
# the candle are out, the stove cold)
ONE = Light("lamp", [desk_l], [GREEN_GLASS])
OUT_LIGHTS = [Light("board", [board_l], [BOARD_BULB]), Light("painting", [paint_l], [PAINT_BULB]), Light("candle", [candle_l], [CANDLE_FLAME]), Light("stove", [stove_l], [FIRE])]
FIRE.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.02, 0.018, 0.016, 1)
clear_glass()
air = room_haze(X0, X1, -30, D1, TOP, float(arg("--haze", "0")))

# ── what the game is told ──────────────────────────────────────────────────
LAYOUT.thing("sequence", "Look at the cards", corners(X0, X0 + 4, bd["y0"], bd["y1"], bd["d0"], bd["d1"]))
LAYOUT.thing("wires", "Look at the painting", corners(pt["x0"], pt["x1"], pt["y0"], pt["y1"], D1 - 5, D1))
pull_out = [(x, y, d) for x in (dr["x0"], dr["x1"]) for y in (dr["y0"], dr["y1"] + 4) for d in (cb["d0"] - DRAWER["pull"], cb["d0"])]
shut = [(x, y, cb["d0"] - 1.2) for x in (dr["x0"], dr["x1"]) for y in (dr["y0"], dr["y1"])]
LAYOUT.thing("station", "Look in the drawer", pull_out, first=("Open the drawer", shut))
LAYOUT.chest(CHEST, at=TB["at"], turn=TB["turn"])
LAYOUT.glow("desk", TF(GL[0] + 8, TB["h"] + 22, GL[1] - 6), 90)
LAYOUT.glow("picture", P(X0 + 9, bd["y1"] + 8, bm_), 46)
LAYOUT.glow("stove", P(st["x"], 42, sd0 - 22), 46)
LAYOUT.glow("painting", P(pm, pt["y1"] + 8, D1 - 7), 40)
LAYOUT.glow("candle", P(cx, CANDLE_TOP + 1, cd), 70)
DRAWER_BOX = box_of([(x, y, d) for x in (dr["x0"], dr["x1"]) for y in (dr["y0"], dr["y1"]) for d in (cb["d0"] - DRAWER["pull"], cb["d0"])])
LAYOUT.data["extra"]["drawer"] = DRAWER_BOX
LAYOUT.pane([P(x, y, GD) for x, y in ((wx0 + 4, WIN["sill"] + 4), (wx1 - 4, WIN["sill"] + 4), (wx1 - 4, WIN["top"] - 4), (wx0 + 4, WIN["top"] - 4))])
# (the moonbeam: from the window down to the floor before the drawers)
LAYOUT.dust([P(wx0, WIN["top"], D1), P(wx1, WIN["sill"], D1), P(60, 0, 220), P(120, 0, 330)])
LAYOUT.write()
if arg("--probe", "") == "1":
    bpy.context.view_layer.update()
    lo, hi = P(-246, 100, 445), P(-200, 200, 535)
    for o in bpy.data.objects:
        if o.type != "MESH": continue
        bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
        mn = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb))); mx = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
        if all(mn[i] <= hi[i] and mx[i] >= lo[i] for i in range(3)): print("PROBE", o.name, [round(v, 2) for v in mn], [round(v, 2) for v in mx], o.active_material.name if o.active_material else None)
    raise SystemExit

# ── the passes ─────────────────────────────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "-0.2")))
scene.cycles.volume_bounces = 1
GLOSSY = ("green glass shade",)                # (what keeps its shine: glazes, screens, lamp glass)
finish(scene, SAMPLES, keep_gloss=GLOSSY)
plates = one_light(ONE, OUT_LIGHTS) if "plates" in ONLY else {}
passes(scene, OUT, set(plates), air, apart={"chest": CHEST_PARTS}, variants=plates)
if "chest" in ONLY:
    air.hide_render = True
    chest_sprites(scene, OUT, LAYOUT.data["chest"]["box"], chest_body, chest_hinge, lid_parts)
    air.hide_render = False
if "drawer" in ONLY:
    # the top drawer coming out, frame by frame, the room round it as it is
    crop_frames(scene, OUT, DRAWER_BOX, [(f"drawer-{i}", (lambda i=i: pull(DRAWER["pull"] * (i + 1) / FRAMES))) for i in range(FRAMES)])
    pull(0)
print("ROOM_DONE")
