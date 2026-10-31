# Room V, the drawing room, built in three dimensions and rendered with Cycles,
# seen from the corner by the door across to its hearth.
#
# Deep red damask over a dark walnut dado, a herringbone parquet, a plaster
# ceiling with a brass chandelier hung from its rose. In the left-hand wall the
# hearth, a fire burnt down to its embers in the grate, a gilt glass over the
# mantel. Before it a trap stands open in the floor, its door thrown back on
# the boards, the head of an iron ladder coming up out of the dark, a candle
# left burning beside it. In the far corner, between the hearth and the tall
# sash window, the Christmas tree in its tub: glass balls, a brass star, and
# along each of its nine tiers a string of small lamps — just so many alight on
# each as the puzzle has them (3 1 4 1 5 9 2 6 5, from the top). Two armchairs
# drawn up to the fire, a little table between them and the gilt chest on it.
# On the far wall a flat television left on, its glass full of snow.
#
# Each puzzle has its light, which burns until it is solved: the candle by the
# trap (the cellar), the tree's lamps (the tree), the television (the
# television). A plate for each way they can stand (lights-<trap><tree><tv>),
# the chest apart, and where it all fell in the picture
# (src/levels/house/rooms/Room5.json). The fire stays in.
#
#   blender -b --factory-startup -P art/blender/room_drawing.py -- [--samples 256] [--width 2560] [--only plates,chest]

import bpy, bmesh, math, os, sys, random
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *

OUT = os.path.join(ROOT, ".artifacts/room-drawing")
os.makedirs(OUT, exist_ok=True)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")
SAMPLES = int(arg("--samples", "700"))
WIDTH = int(arg("--width", "2560"))
ONLY = set(arg("--only", "plates,chest").split(","))
RNG = random.Random(1225)

# ── the room, and where we stand in it ─────────────────────────────────────
X0, X1, D1, TOP = -260, 260, 600, 320
EYE = (float(arg("--ex", "190")), float(arg("--ey", "158")), float(arg("--ed", "40")))
LOOK = (float(arg("--lx", "-120")), float(arg("--ly", "105")), float(arg("--ld", "480")))
VIEW = arg("--view", "")                          # "tree": The Lit Tree's own close-up (levels/pi)
if VIEW == "tree":
    OUT = os.path.join(ROOT, ".artifacts/tree-level"); os.makedirs(OUT, exist_ok=True)
    EYE = (float(arg("--ex", "-74")), float(arg("--ey", "122")), float(arg("--ed", "150")))
    LOOK = (float(arg("--lx", "-66")), float(arg("--ly", "92")), float(arg("--ld", "560")))
scene, HEIGHT = stage(WIDTH, eye=EYE, look=LOOK, lens=float(arg("--lens", "26" if VIEW == "tree" else "24")))
HEARTH = dict(d0=220, d1=380, out=32)            # the chimney breast in the left-hand wall
WIN = dict(x=-20, hw=66, sill=90, top=282)       # the tall sash in the back wall
TRAP = dict(x0=-160, x1=-88, d0=286, d1=358)     # the hole in the floor, before the hearth
TREE = dict(x=-172, d=528, foot=34, tall=188)    # its tub's middle; where the boughs start; the tip
TV = dict(x0=132, x1=238, y0=112, y1=172)        # on the back wall
ALIGHT = [3, 1, 4, 1, 5, 9, 2, 6, 5]             # lamps alight along each tier, top to bottom (the puzzle's)
HOLDERS = [4, 4, 6, 6, 8, 11, 10, 11, 12]        # and how many each string has

# ── materials ──────────────────────────────────────────────────────────────
WALNUT = scan("walnut", "rosewood_veneer1", size=0.7, tint=(0.58, 0.38, 0.28), bright=0.46, sat=0.9, rough=(0.2, 0.4), bump=0.2, coat=0.5, upright=True)
WALNUT_X = scan("walnut across", "rosewood_veneer1", size=0.7, tint=(0.58, 0.38, 0.28), bright=0.44, sat=0.9, rough=(0.2, 0.4), bump=0.2, coat=0.5)
PLASTER = scan("ceiling", "plastered_wall_04", size=2.0, tint=(0.86, 0.82, 0.74), bright=0.75, sat=0.3, rough=(0.8, 0.95), bump=0.5)
BRASS = aged_metal("brass", (0.58, 0.41, 0.18), (0.08, 0.06, 0.03), rough=(0.2, 0.46), scale=30, tarnish=0.45)
GILT = aged_metal("gilt", (0.72, 0.53, 0.22), (0.14, 0.09, 0.04), rough=(0.2, 0.45), scale=50, tarnish=0.45)
IRON = plain("iron", (0.025, 0.025, 0.027), rough=0.5, metal=0.8)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
if VIEW == "tree": GLASS.node_tree.nodes["Principled BSDF"].inputs["IOR"].default_value = 1.03   # (close to, the night seen through it clear)
FRAME = plain("window paint", (0.86, 0.84, 0.78), rough=0.5)
WAX = bpy.data.materials.new("wax"); WAX.use_nodes = True
_w = WAX.node_tree.nodes["Principled BSDF"]; _w.inputs["Base Color"].default_value = (0.82, 0.74, 0.58, 1); _w.inputs["Subsurface Weight"].default_value = 0.6; _w.inputs["Subsurface Radius"].default_value = (0.02, 0.012, 0.006); _w.inputs["Roughness"].default_value = 0.42
WICK = plain("wick", (0.01, 0.01, 0.01), rough=0.9)
VELVET = scan("curtain velvet", "velour_velvet", size=0.5, tint=(0.72, 0.5, 0.18), bright=0.34, sat=1.0, rough=(0.75, 0.92), bump=0.2)
VELVET.node_tree.nodes["Principled BSDF"].inputs["Sheen Weight"].default_value = 0.3
def damask():
    """deep red damask: the study's paper, its green turned to wine"""
    m = bpy.data.materials.new("red damask"); m.use_nodes = True
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / 0.55,) * 3
    Lk(tc.outputs["Object"], mp.inputs["Vector"])
    ti = N.new("ShaderNodeTexImage"); ti.image = bpy.data.images.load(os.path.join(DRAWN, "study-paper.png"), check_existing=True)
    ti.projection = "BOX"; ti.projection_blend = 0.1; Lk(mp.outputs["Vector"], ti.inputs["Vector"])
    hs = N.new("ShaderNodeHueSaturation"); hs.inputs["Hue"].default_value = 0.16; hs.inputs["Saturation"].default_value = 1.15; hs.inputs["Value"].default_value = 0.95
    Lk(ti.outputs["Color"], hs.inputs["Color"])
    ao = N.new("ShaderNodeAmbientOcclusion"); ao.inputs["Distance"].default_value = 0.3
    ar = N.new("ShaderNodeValToRGB"); ar.color_ramp.elements[0].color = (0.45, 0.43, 0.4, 1); Lk(ao.outputs["AO"], ar.inputs["Fac"])
    am = N.new("ShaderNodeMix"); am.data_type = "RGBA"; am.blend_type = "MULTIPLY"; am.inputs["Factor"].default_value = 1
    Lk(hs.outputs["Color"], am.inputs[6]); Lk(ar.outputs["Color"], am.inputs[7]); Lk(am.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.55; b.inputs["Sheen Weight"].default_value = 0.5; b.inputs["Sheen Roughness"].default_value = 0.3
    bw = N.new("ShaderNodeRGBToBW"); bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.15; bp.inputs["Distance"].default_value = 0.001
    Lk(ti.outputs["Color"], bw.inputs["Color"]); Lk(bw.outputs["Val"], bp.inputs["Height"]); Lk(bp.outputs["Normal"], b.inputs["Normal"])
    return m
PAPER = damask()
LAYOUT = Layout("Room5")

# ── the shell: a herringbone floor, red paper over walnut, the ceiling ─────
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
                # (none where the trap is cut)
                if TRAP["x0"] - 3 < mx < TRAP["x1"] + 3 and TRAP["d0"] - 3 < md < TRAP["d1"] + 3: continue
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
parquet(X0, X1, -30, D1)
# (under the parquet a subfloor, with the trap cut through it)
sub = box_cm("subfloor", X0 - 20, X1 + 20, -6, -0.05, -50, D1 + 20, plain("joists", (0.01, 0.007, 0.005), rough=1))
boolean_cut(sub, box("cut", M(TRAP["x0"]), M(TRAP["x1"]), M(TRAP["d0"]), M(TRAP["d1"]), M(-20), M(5), IRON))
box_cm("ceiling", X0 - 20, X1 + 20, TOP, TOP + 10, -50, D1 + 20, PLASTER)
box_cm("wall", X1, X1 + 25, 0, TOP, -50, D1 + 20, PAPER)
box_cm("wall", X0 - 25, X0, 0, TOP, -50, D1 + 20, PAPER)
box_cm("door wall", X0 - 25, X1 + 25, 0, TOP, -75, -50, PAPER)
back = box_cm("back wall", X0 - 25, X1 + 25, 0, TOP, D1, D1 + 30, PAPER)
wx0, wx1 = WIN["x"] - WIN["hw"], WIN["x"] + WIN["hw"]
boolean_cut(back, box("cut", M(wx0), M(wx1), M(D1 - 10), M(D1 + 50), M(WIN["sill"]), M(WIN["top"]), IRON))
DADO = 96
def dado(a, b, along_x, at, facing, skip=()):
    """walnut boarding to the dado, a rail, a skirting; a plaster cornice"""
    def piece(p0, p1, y0, y1, proud, mat, r=0.0):
        q0, q1 = sorted((at, at + facing * proud))
        if along_x: box_cm("dado", p0, p1, y0, y1, q0, q1, mat, r)
        else: box_cm("dado", q0, q1, y0, y1, p0, p1, mat, r)
    spans = [(a, b)]
    for lo, hi in skip:
        spans = [s for (p, q) in spans for s in ((p, lo), (hi, q)) if s[1] - s[0] > 1]
    for (p, q) in spans:
        piece(p, q, 0, DADO, 2.0, WALNUT)
        n = max(1, round((q - p) / 54))
        for k in range(n):
            p0 = p + k * (q - p) / n + 6; p1 = p + (k + 1) * (q - p) / n - 6
            piece(p0, p1, 18, DADO - 14, 3.2, WALNUT, 1.2)
        piece(p, q, DADO - 3, DADO + 4, 4.5, WALNUT_X, 1.0)
        piece(p, q, 0, 16, 3.5, WALNUT_X, 0.6)
    piece(a, b, TOP - 16, TOP, 10, PLASTER, 2.0)
dado(-50, D1, False, X1, -1)
dado(-50, D1, False, X0, 1, skip=((HEARTH["d0"], HEARTH["d1"]),))
dado(X0, X1, True, D1, -1, skip=((wx0 - 4, wx1 + 4),))

# ── the hearth in the left-hand wall: the embers, a gilt glass over it ─────
hb = HEARTH
WX = X0 + hb["out"]                              # the breast's face
MARBLE = scan("black marble", "marble_01", size=0.8, tint=(0.3, 0.3, 0.32), bright=0.35, sat=0.4, rough=(0.08, 0.25), bump=0.1, coat=0.6)
SOOT = plain("soot", (0.012, 0.01, 0.009), rough=0.95)
CAST = aged_metal("cast iron", (0.035, 0.033, 0.03), (0.02, 0.016, 0.012), rough=(0.4, 0.75), scale=40, tarnish=0.3)
breast = box_cm("chimney breast", X0 - 1, WX, 0, TOP, hb["d0"], hb["d1"], PAPER)
fb = dict(d0=270, d1=330, y1=80)
boolean_cut(breast, box("cut", M(X0 + 8), M(WX + 10), M(fb["d0"]), M(fb["d1"]), M(-1), M(fb["y1"]), IRON))
box_cm("fire back", X0 + 8, X0 + 12, 0, fb["y1"], fb["d0"], fb["d1"], SOOT)
for d0, d1 in ((fb["d0"], fb["d0"] + 3), (fb["d1"] - 3, fb["d1"])):
    box_cm("fire cheek", X0 + 8, WX, 0, fb["y1"], d0, d1, SOOT)
box_cm("fire throat", X0 + 8, WX, fb["y1"] - 3, fb["y1"], fb["d0"], fb["d1"], SOOT)
for d0, d1 in ((fb["d0"] - 9, fb["d0"]), (fb["d1"], fb["d1"] + 9)):
    box_cm("register", WX, WX + 1.5, 0, fb["y1"] + 9, d0, d1, CAST, 0.4)
box_cm("register", WX, WX + 1.5, fb["y1"], fb["y1"] + 9, fb["d0"] - 9, fb["d1"] + 9, CAST, 0.4)
for d0, d1 in ((fb["d0"] - 34, fb["d0"] - 9), (fb["d1"] + 9, fb["d1"] + 34)):
    box_cm("jamb", WX, WX + 6, 0, 108, d0, d1, MARBLE, 0.6)
    box_cm("jamb foot", WX, WX + 7.5, 0, 12, d0 - 1.5, d1 + 1.5, MARBLE, 0.6)
    box_cm("corbel", WX, WX + 8, 108, 122, d0 + 2, d1 - 2, MARBLE, 0.8)
box_cm("frieze", WX, WX + 5, fb["y1"] + 9, 122, fb["d0"] - 9, fb["d1"] + 9, MARBLE, 0.6)
box_cm("mantel", WX, WX + 15, 122, 128, fb["d0"] - 44, fb["d1"] + 44, MARBLE, 1.2)
box_cm("skirting", WX, WX + 3.5, 0, 16, hb["d0"] - 3.5, hb["d1"] + 3.5, WALNUT_X, 0.6)
for d0, d1 in ((hb["d0"] - 3.5, hb["d0"]), (hb["d1"], hb["d1"] + 3.5)):
    box_cm("skirting", X0, WX, 0, 16, d0, d1, WALNUT_X, 0.6)
box_cm("hearth stone", WX, WX + 56, 0, 2.5, fb["d0"] - 50, fb["d1"] + 50, MARBLE, 0.8)
# the grate, the embers
gx_, gd_ = X0 + 22, (fb["d0"] + fb["d1"]) / 2
for k in range(5):
    y = 12 + k * 4.5
    rod("grate bar", P(gx_ + 9, y, gd_ - 22), P(gx_ + 9, y, gd_ + 22), M(0.6), CAST, verts=8)
for d in (gd_ - 22, gd_ + 22):
    rod("grate leg", P(gx_ + 9, 0, d), P(gx_ + 9, 32, d), M(0.9), CAST, verts=8)
    rod("grate side", P(gx_ + 9, 12, d), P(gx_ - 8, 12, d), M(0.7), CAST, verts=8)
box_cm("grate floor", gx_ - 8, gx_ + 9, 11, 12, gd_ - 22, gd_ + 22, CAST)
EMBER = bpy.data.materials.new("embers"); EMBER.use_nodes = True
_n = EMBER.node_tree.nodes; _l = EMBER.node_tree.links.new; _b = _n["Principled BSDF"]
_tc = _n.new("ShaderNodeTexCoord"); _vz = _n.new("ShaderNodeTexVoronoi"); _vz.inputs["Scale"].default_value = 90
_ramp = _n.new("ShaderNodeValToRGB"); _ramp.color_ramp.elements[0].position = 0.15; _ramp.color_ramp.elements[0].color = (1, 1, 1, 1); _ramp.color_ramp.elements[1].position = 0.5; _ramp.color_ramp.elements[1].color = (0, 0, 0, 1)
_l(_tc.outputs["Object"], _vz.inputs["Vector"]); _l(_vz.outputs["Distance"], _ramp.inputs["Fac"])
_mul = _n.new("ShaderNodeMath"); _mul.operation = "MULTIPLY"; _mul.inputs[1].default_value = float(arg("--embers", "5.0"))
_l(_ramp.outputs["Color"], _mul.inputs[0]); _l(_mul.outputs["Value"], _b.inputs["Emission Strength"])
_b.inputs["Emission Color"].default_value = (1.0, 0.28, 0.04, 1); _b.inputs["Base Color"].default_value = (0.02, 0.015, 0.012, 1); _b.inputs["Roughness"].default_value = 0.9
for k in range(16):
    sphere("ember", tuple(P(gx_ + 4 + RNG.uniform(-9, 4), 13 + RNG.uniform(0, 3), gd_ + RNG.uniform(-18, 18))), M(RNG.uniform(1.6, 3.2)), EMBER, squash=(1, 1, 0.6))
fire_l = lamp("embers", "POINT", tuple(P(gx_ + 8, 18, gd_)), energy=float(arg("--fire", "8")), colour=(1.0, 0.36, 0.1), size=0.12)
# brass fire irons standing by it; a brass fender
for k, d in enumerate((fb["d1"] + 40, fb["d1"] + 44)):
    rod("fire iron", P(WX + 8 + k * 2, 2.5, d), P(WX + 6 + k * 3, 70, d + 2), M(0.6), BRASS, verts=10)
    sphere("fire iron knob", tuple(P(WX + 6 + k * 3, 71, d + 2)), M(1.4), BRASS)
FD = (WX + 50, fb["d0"] - 44, fb["d1"] + 44)
rod("fender", P(FD[0], 9, FD[1]), P(FD[0], 9, FD[2]), M(1.0), BRASS, verts=16)
for d in (FD[1], FD[2]):
    rod("fender", P(FD[0], 9, d), P(WX + 2, 9, d), M(1.0), BRASS, verts=16)
    sphere("fender knob", tuple(P(FD[0], 9, d)), M(1.8), BRASS)
box_cm("fender plinth", FD[0] - 1, FD[0] + 1, 2.5, 6, FD[1], FD[2], BRASS, 0.3)
# on the mantel a clock and candlesticks (cold); over it a gilt glass
import_model("mantel_clock_01", height=M(30), at=tuple(P(WX + 8, 128, (fb["d0"] + fb["d1"]) / 2)), rot=math.pi / 2)
import_model("brass_candleholders", height=M(26), at=tuple(P(WX + 8, 128, fb["d0"] - 30)), rot=math.pi / 2)
import_model("brass_candleholders", height=M(26), at=tuple(P(WX + 8, 128, fb["d1"] + 30)), rot=math.pi / 2)
MIRROR = plain("looking glass", (0.9, 0.9, 0.88), rough=0.03, metal=1.0)
md0, md1, my0, my1 = fb["d0"] - 34, fb["d1"] + 34, 146, 262
for (a, b, c, e) in ((md0 - 7, md1 + 7, my0 - 7, my0), (md0 - 7, md1 + 7, my1, my1 + 9), (md0 - 7, md0, my0, my1), (md1, md1 + 7, my0, my1)):
    box_cm("glass frame", WX, WX + 6, c, e, a, b, GILT, 1.5)
box_cm("glass", WX, WX + 1.2, my0, my1, md0, md1, MIRROR)

# ── the back wall: the tall sash, its curtains; the television ─────────────
REVEAL = 26
box_cm("reveal", wx0 - 3, wx0, WIN["sill"], WIN["top"], D1, D1 + REVEAL, PLASTER)
box_cm("reveal", wx1, wx1 + 3, WIN["sill"], WIN["top"], D1, D1 + REVEAL, PLASTER)
box_cm("reveal head", wx0 - 3, wx1 + 3, WIN["top"], WIN["top"] + 3, D1, D1 + REVEAL, PLASTER)
box_cm("sill", wx0 - 10, wx1 + 10, WIN["sill"] - 4, WIN["sill"], D1 - 10, D1 + REVEAL - 6, WALNUT_X, 1.0)
mid = (WIN["sill"] + WIN["top"]) / 2
SASHES = []
for (y0, y1, dd) in ((WIN["sill"] + 1, mid + 2, D1 + REVEAL - 8), (mid - 2, WIN["top"] - 1, D1 + REVEAL - 13)):
    box_cm("sash", wx0 + 1, wx0 + 6, y0, y1, dd - 2.5, dd + 2.5, FRAME, 0.5); box_cm("sash", wx1 - 6, wx1 - 1, y0, y1, dd - 2.5, dd + 2.5, FRAME, 0.5)
    box_cm("sash", wx0 + 1, wx1 - 1, y0, y0 + 6, dd - 2.5, dd + 2.5, FRAME, 0.5); box_cm("sash", wx0 + 1, wx1 - 1, y1 - 6, y1, dd - 2.5, dd + 2.5, FRAME, 0.5)
    for fx in (1 / 3, 2 / 3):
        x = wx0 + (wx1 - wx0) * fx
        box_cm("glazing bar", x - 1.1, x + 1.1, y0 + 6, y1 - 6, dd - 1.5, dd + 1.5, FRAME, 0.3)
    box_cm("glazing bar", wx0 + 6, wx1 - 6, (y0 + y1) / 2 - 1.1, (y0 + y1) / 2 + 1.1, dd - 1.5, dd + 1.5, FRAME, 0.3)
    box_cm("glass", wx0 + 5, wx1 - 5, y0 + 5, y1 - 5, dd - 0.3, dd + 0.3, GLASS)
    SASHES.append([P(x, y, dd) for x, y in ((wx0 + 5, y0 + 5), (wx1 - 5, y0 + 5), (wx1 - 5, y1 - 5), (wx0 + 5, y1 - 5))])
curtain(RNG, wx0 - 66, wx0 - 2, D1 - 8, 300, VELVET, folds=4, deep=9)
curtain(RNG, wx1 + 2, wx1 + 66, D1 - 8, 300, VELVET, folds=4, deep=9)
box_cm("pelmet", wx0 - 76, wx1 + 76, 298, 314, D1 - 16, D1, GILT, 1.5)
MOON_AT = P(-1070, 430, 3400)
if VIEW == "tree":
    # (seen through the window's upper sash, a little right of its middle)
    _e = P(*EYE); _a = P(WIN["x"] + float(arg("--moonx", "-38")), float(arg("--moony", "236")), D1 + 20)
    MOON_AT = _e + (_a - _e) * ((34 - _e.y) / (_a.y - _e.y))
garden(MOON_AT, [("island_tree_01", -1300, 2200, 11.0, 0.3), ("island_tree_02", 900, 2600, 12.0, 1.4), ("tree_small_02", -600, 1400, 5.0, 2.2),
                  ("shrub_02", -200, 900, 1.5, 0.6), ("shrub_02", 260, 950, 1.7, 2.0)],
       (-2500, 2500, D1 + 40, 3300, -40), P(-900, 800, 4200), sky_size=45)
# the television, flat on the wall, left on: its glass full of snow
BEZEL = plain("bezel", (0.012, 0.012, 0.014), rough=0.3, coat=0.4)
SNOW = bpy.data.materials.new("snow"); SNOW.use_nodes = True
_sn = SNOW.node_tree.nodes; _sl = SNOW.node_tree.links.new; _sb = _sn["Principled BSDF"]
_stc = _sn.new("ShaderNodeTexCoord"); _snz = _sn.new("ShaderNodeTexWhiteNoise")
_smp = _sn.new("ShaderNodeMapping"); _smp.inputs["Scale"].default_value = (900, 900, 900)
_sl(_stc.outputs["Object"], _smp.inputs["Vector"]); _sl(_smp.outputs["Vector"], _snz.inputs["Vector"])
_sr = _sn.new("ShaderNodeValToRGB"); _sr.color_ramp.elements[0].color = (0.05, 0.05, 0.06, 1); _sr.color_ramp.elements[1].color = (0.85, 0.9, 1.0, 1)
_sl(_snz.outputs["Value"], _sr.inputs["Fac"]); _sl(_sr.outputs["Color"], _sb.inputs["Emission Color"])
_sb.inputs["Base Color"].default_value = (0.01, 0.01, 0.012, 1); _sb.inputs["Roughness"].default_value = 0.08; _sb.inputs["Coat Weight"].default_value = 0.8
_sb.inputs["Emission Strength"].default_value = float(arg("--snow", "0.03"))
tv = TV
box_cm("television", tv["x0"], tv["x1"], tv["y0"], tv["y1"], D1 - 4, D1 - 1.5, BEZEL, 0.4)
GLASS_D = D1 - 4.05
_screen = box_cm("screen", tv["x0"] + 1.6, tv["x1"] - 1.6, tv["y0"] + 1.6, tv["y1"] - 1.6, GLASS_D - 0.05, GLASS_D, SNOW)
if VIEW == "tree": _screen.visible_glossy = False          # (its snow not seen again in the window's glass)
box_cm("bracket", (tv["x0"] + tv["x1"]) / 2 - 12, (tv["x0"] + tv["x1"]) / 2 + 12, tv["y0"] + 14, tv["y1"] - 14, D1 - 1.5, D1, IRON)
TV_LAMP = plain("standby lamp", (0.3, 0.02, 0.01), emit=(1.0, 0.05, 0.02), strength=6)
sphere("standby lamp", tuple(P(tv["x1"] - 3, tv["y0"] + 0.9, D1 - 4.1)), M(0.3), TV_LAMP)
cu = bpy.data.curves.new("lead", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = M(0.3); spl = cu.splines.new("BEZIER"); spl.bezier_points.add(2)
for bp_, v in zip(spl.bezier_points, (P(tv["x1"] - 16, tv["y0"], D1 - 1.5), P(tv["x1"] - 12, tv["y0"] - 40, D1 - 0.8), P(tv["x1"] - 10, 16, D1 - 0.8))): bp_.co = v; bp_.handle_left_type = bp_.handle_right_type = "AUTO"
arch(link(bpy.data.objects.new("lead", cu))).data.materials.append(BEZEL)
# (the glass's own snow is the set's light on the room)

# ── the trap in the floor, its door thrown back, the ladder, the candle ────
tp = TRAP
CURB = scan("curb oak", "dark_wood", size=0.8, tint=(0.7, 0.5, 0.34), bright=0.45, rough=(0.3, 0.6), bump=0.4, coat=0.2)
for (a, b, c, e) in ((tp["x0"] - 5, tp["x1"] + 5, tp["d0"] - 5, tp["d0"]), (tp["x0"] - 5, tp["x1"] + 5, tp["d1"], tp["d1"] + 5), (tp["x0"] - 5, tp["x0"], tp["d0"], tp["d1"]), (tp["x1"], tp["x1"] + 5, tp["d0"], tp["d1"])):
    box_cm("curb", a, b, -3, 0.6, c, e, CURB, 0.4)
SHAFT = plain("the dark below", (0.004, 0.004, 0.004), rough=1.0)
for (a, b, c, e) in ((tp["x0"] - 1, tp["x1"] + 1, tp["d0"] - 1, tp["d0"]), (tp["x0"] - 1, tp["x1"] + 1, tp["d1"], tp["d1"] + 1), (tp["x0"] - 1, tp["x0"], tp["d0"], tp["d1"]), (tp["x1"], tp["x1"] + 1, tp["d0"], tp["d1"])):
    box_cm("shaft", a, b, -260, -3, c, e, SHAFT)
box_cm("cellar floor", tp["x0"] - 40, tp["x1"] + 40, -264, -260, tp["d0"] - 40, tp["d1"] + 40, SHAFT)
# the door, thrown back flat on the boards toward us, hinged at the hole's near edge
w = tp["d1"] - tp["d0"]
ld0, ld1 = tp["d0"] - 6 - w, tp["d0"] - 6
for i in range(5):
    a = tp["x0"] + (tp["x1"] - tp["x0"]) * i / 5
    box_cm("trap plank", a + 0.15, a + (tp["x1"] - tp["x0"]) / 5 - 0.15, 0, 3, ld0, ld1, CURB, 0.3)
for x in (tp["x0"] + 12, tp["x1"] - 12):
    box_cm("strap", x - 3, x + 3, 3, 3.4, ld0 + 1, ld1 - 1, IRON, 0.2)
    for i in range(5):
        sphere("nail", tuple(P(x, 3.5, ld0 + w * (i + 0.5) / 5)), M(0.5), IRON, squash=(1, 1, 0.5))
bpy.ops.mesh.primitive_torus_add(major_radius=M(4), minor_radius=M(0.5), location=tuple(P((tp["x0"] + tp["x1"]) / 2, 3.6, ld0 + 9)))
bpy.context.active_object.data.materials.append(IRON)
for x in (tp["x0"] + 6, tp["x1"] - 6):
    box_cm("hinge", x - 2.5, x + 2.5, 0.2, 1.4, ld1 - 6, tp["d0"] + 1, IRON, 0.2)
# the ladder, its rails coming up out of the dark and bent over into hoops
lad_d = tp["d1"] - 10
for e in (-1, 1):
    x = (tp["x0"] + tp["x1"]) / 2 + e * 20
    tube("ladder rail", [(0, -2.4), (0, 0.42), (0.06, 0.62), (0.16, 0.6), (0.2, 0.42), (0.2, 0.2)], 0.012, IRON, at=tuple(P(x, 0, lad_d)), rot=-math.pi / 2)
for k in range(9):
    y = 20 - k * 28
    rod("rung", P((tp["x0"] + tp["x1"]) / 2 - 20, y, lad_d), P((tp["x0"] + tp["x1"]) / 2 + 20, y, lad_d), M(0.9), IRON, verts=10)
# the candle on the boards beside it, in a brass chamberstick
cx, cd = tp["x1"] + 12, tp["d0"] - 4
lathe("chamberstick", [(0, 0), (0.065, 0), (0.068, 0.006), (0.064, 0.012), (0.02, 0.014), (0.016, 0.03), (0.022, 0.05), (0.018, 0.052), (0, 0.05)], BRASS, at=tuple(P(cx, 0, cd)), steps=48)
tube("finger ring", [(0.06, 0.008), (0.085, 0.02), (0.075, 0.04), (0.062, 0.03)], 0.003, BRASS, at=tuple(P(cx, 0, cd)), rot=2.4)
CANDLE_TOP = 18.0
cylinder("candle", M(cx), M(cd), M(5), M(CANDLE_TOP), M(1.1), WAX, verts=32)
for j in range(3):
    a = 0.4 + j * 1.9; L_ = 2 + j * 1.1
    sphere("drip", tuple(P(cx + math.cos(a) * 1.1, CANDLE_TOP - L_ / 2, cd + math.sin(a) * 1.1)), M(0.3), WAX, squash=(1, 1, L_ / 0.6))
cylinder("wick", M(cx), M(cd), M(CANDLE_TOP - 0.2), M(CANDLE_TOP + 0.9), M(0.07), WICK, verts=6)
CANDLE_AT = P(cx, CANDLE_TOP + 0.9, cd)
candle_l = lamp("candle", "POINT", tuple(CANDLE_AT + Vector((0, 0, 0.02))), energy=float(arg("--candle", "7")), colour=(1.0, 0.55, 0.22), size=0.012)

# ── the Christmas tree in the far corner ───────────────────────────────────
# A fir of the nursery's growing: a straight trunk; whorls of branches, each a
# little shorter than the one under it, drooping and turned up at the tip,
# twigs off them either side; and needles on every one of them (hair).
T = TREE
import_model("wooden_bucket_01", height=M(T["foot"] + 2), at=tuple(P(T["x"], 0, T["d"])), rot=0.4)
cylinder("earth in the tub", M(T["x"]), M(T["d"]), M(T["foot"] - 4), M(T["foot"] - 3), M(18), plain("tub earth", (0.04, 0.028, 0.018), rough=1.0), verts=32)
Y0, YT = T["foot"] + 6, T["tall"]                 # the lowest whorl; the leader's tip
BARK_T = scan("fir bark", "jolcham_oak_bark_01", size=0.15, tint=(0.5, 0.4, 0.32), bright=0.35, rough=(0.7, 0.95), bump=0.6)
cylinder("trunk", M(T["x"]), M(T["d"]), M(T["foot"] - 10), M(YT), M(3.0), BARK_T, verts=16, r2=M(0.4))
def length_at(y):
    """how far a branch reaches at height y"""
    return 5 + 60 * max(0.0, (YT - y) / (YT - Y0)) ** 0.92
TWIG = plain("fir twig", (0.07, 0.05, 0.03), rough=0.8)
NEEDLES = bpy.data.materials.new("fir needles"); NEEDLES.use_nodes = True
_nb = NEEDLES.node_tree.nodes["Principled BSDF"]
_ni = NEEDLES.node_tree.nodes.new("ShaderNodeHairInfo"); _nr = NEEDLES.node_tree.nodes.new("ShaderNodeValToRGB")
_nr.color_ramp.elements[0].color = (0.012, 0.035, 0.014, 1); _nr.color_ramp.elements[1].color = (0.04, 0.09, 0.03, 1)
NEEDLES.node_tree.links.new(_ni.outputs["Random"], _nr.inputs["Fac"]); NEEDLES.node_tree.links.new(_nr.outputs["Color"], _nb.inputs["Base Color"])
_nb.inputs["Roughness"].default_value = 0.42; _nb.inputs["Specular IOR Level"].default_value = 0.6
me = bpy.data.meshes.new("boughs"); bm = bmesh.new()
def ribbon(points, width):
    """a narrow flat strip along `points` (Blender points), for needles to grow on"""
    prev = None
    for k, p in enumerate(points):
        t = (points[min(k + 1, len(points) - 1)] - points[max(k - 1, 0)]).normalized()
        side = t.cross(Vector((0, 0, 1))).normalized() * (width / 2 * (1 - 0.6 * k / (len(points) - 1)))
        a, b = bm.verts.new(p - side), bm.verts.new(p + side)
        if prev: bm.faces.new((prev[0], prev[1], b, a))
        prev = (a, b)
BRANCH_TIPS = []                                  # (height, azimuth, reach) of every branch
y = Y0; whorl = 0
while y < YT - 8:
    n = 8 if y < YT - 40 else 6
    for j in range(n):
        az = j / n * math.tau + RNG.uniform(-0.25, 0.25) + whorl * 0.4
        Lb = length_at(y) * RNG.uniform(0.88, 1.08)
        droop = 0.16 + 0.14 * (1 - (y - Y0) / (YT - Y0))
        pts = []
        for s in range(7):
            t = s / 6
            r = 3 + Lb * t
            h = y - math.sin(droop) * Lb * t + 4 * t ** 3   # (down, and up again at the tip)
            pts.append(P(T["x"] + math.cos(az) * r, h, T["d"] + math.sin(az) * r))
        ribbon(pts, M(3.2))
        # its twigs, either side, shorter toward the tip
        for s in (2, 3, 4, 5):
            base = pts[s]; t = s / 6
            for e in (-1, 1):
                ta = az + e * 0.75
                tl = Lb * 0.34 * (1 - t * 0.7)
                tip = base + Vector((math.cos(ta) * M(tl), math.sin(ta) * M(tl), -M(tl * 0.12)))
                ribbon([base, base.lerp(tip, 0.5) + Vector((0, 0, M(0.6))), tip], M(2.0))
        BRANCH_TIPS.append((y, az, Lb))
    y += 8.2 + RNG.uniform(-0.8, 0.8); whorl += 1
# (the leader: the tip of the tree, straight up)
ribbon([P(T["x"], YT - 12, T["d"]), P(T["x"], YT - 6, T["d"]), P(T["x"], YT, T["d"])], M(2.0))
bm.to_mesh(me); bm.free()
boughs = link(bpy.data.objects.new("boughs", me)); boughs.data.materials.append(TWIG); boughs.data.materials.append(NEEDLES)
ps = boughs.modifiers.new("needles", "PARTICLE_SYSTEM").particle_system.settings
ps.type = "HAIR"; ps.count = int(arg("--needles", "70000")); ps.hair_length = 0.022; ps.emit_from = "FACE"; ps.use_even_distribution = True
# (with advanced hair a needle's length is its starting velocity: about 2 cm, splayed every way)
ps.use_advanced_hair = True; ps.normal_factor = 0.012; ps.factor_random = 0.016; ps.tangent_factor = 0.0
ps.child_type = "SIMPLE"; ps.rendered_child_count = int(arg("--needle-children", "4")); ps.child_length = 0.9; ps.child_radius = 0.008
ps.material_slot = "fir needles"
ps.radius_scale = 0.0012; ps.root_radius = 1.0; ps.tip_radius = 0.25; ps.use_close_tip = True
def reach(y, az):
    """how far out the boughs come at height y, toward azimuth az"""
    return length_at(y) * 0.95
FRONT = math.atan2(EYE[2] - T["d"], EYE[0] - T["x"])    # toward us (in Blender's x, y: the room's x, d)
TOP_Y = YT
tiers = len(ALIGHT)
BULB_LIT = plain("lamp alight", (1.0, 0.85, 0.6), emit=(1.0, 0.72, 0.38), strength=float(arg("--bulbs", "28")))
BULB_DARK = plain("lamp dark", (0.12, 0.1, 0.07), rough=0.15, coat=0.8)
WIRE = plain("lamp wire", (0.01, 0.025, 0.012), rough=0.5)
LAMPS = []                                       # (where, alight?) for every holder
for i in range(tiers):
    y = (YT - 22) - (YT - 22 - (Y0 + 10)) * i / (tiers - 1)
    n, k = HOLDERS[i], ALIGHT[i]
    spread = 1.2 if i > 1 else 0.9               # (the front of the tree, as far round as is seen)
    lit = set(round((j + 0.5) * n / k - 0.5) for j in range(k))
    string = []
    for j in range(n):
        e = 2 * (j + 0.5) / n - 1
        az = FRONT + spread * e
        r = reach(y, az) * (1.02 if VIEW == "tree" else 0.9)   # (close to, every lamp out where it is seen)
        p = P(T["x"] + math.cos(az) * r, y - (1 - e * e) * 3.0 - 2.0, T["d"] + math.sin(az) * r)
        string.append(p); LAMPS.append((p, j in lit))
    cu = bpy.data.curves.new("lamp string", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = M(0.12); spl = cu.splines.new("BEZIER"); spl.bezier_points.add(len(string) - 1)
    for bp_, v in zip(spl.bezier_points, string): bp_.co = v; bp_.handle_left_type = bp_.handle_right_type = "AUTO"
    link(bpy.data.objects.new("lamp string", cu)).data.materials.append(WIRE)
for (p, on) in LAMPS:
    leaf_blade("lamp", p + Vector((0, 0, M(0.6))), M(0.75), BULB_LIT if on else BULB_DARK, squash=(1, 1, 1.6))
    cylinder("lamp holder", 0, 0, 0, M(0.9), M(0.5), WIRE, verts=8).location = p - Vector((0, 0, M(0.4)))
# glass balls hung from the tips of branches toward us
BALLS = [plain(f"glass ball {k}", c, rough=0.05, metal=0.9, coat=1.0) for k, c in enumerate(((0.5, 0.03, 0.03), (0.75, 0.55, 0.2), (0.6, 0.62, 0.66), (0.05, 0.18, 0.4)))]
front_tips = [b for b in BRANCH_TIPS if abs((b[1] - FRONT + math.pi) % math.tau - math.pi) < 1.2 and b[0] < YT - 30]
for (y, az, Lb) in RNG.sample(front_tips, min(16, len(front_tips))):
    rr = RNG.uniform(2.6, 3.6)
    r = 3 + Lb * 0.78
    hy = y - math.sin(0.2) * Lb * 0.78 - 1.5
    top = P(T["x"] + math.cos(az) * r, hy, T["d"] + math.sin(az) * r)
    p = top - Vector((0, 0, M(rr + 2.5)))
    sphere("glass ball", tuple(p), M(rr), RNG.choice(BALLS))
    cylinder("ball cap", M(p.x * 100), M(p.y * 100), M(p.z * 100 + rr - 0.3), M(p.z * 100 + rr + 0.6), M(0.6), BRASS, verts=10)
    rod("ball thread", p + Vector((0, 0, M(rr + 0.6))), top, M(0.05), BRASS, verts=4)
# the brass star on its top, turned to us
me = bpy.data.meshes.new("star"); bm = bmesh.new()
pts_ = [(math.cos(math.pi / 2 + k * math.pi / 5) * (8 if k % 2 == 0 else 3.4), math.sin(math.pi / 2 + k * math.pi / 5) * (8 if k % 2 == 0 else 3.4)) for k in range(10)]
bm.faces.new([bm.verts.new((M(x), 0, M(y))) for x, y in pts_]); bm.to_mesh(me); bm.free()
star = link(bpy.data.objects.new("star", me)); star.data.materials.append(GILT)
star.modifiers.new("thick", "SOLIDIFY").thickness = M(1.0); bevel(star, M(0.3), 1)
star.location = P(T["x"], TOP_Y + 7, T["d"]); star.rotation_euler = (0, 0, FRONT - math.pi / 2)
tree_l = lamp("tree lamps", "POINT", tuple(P(T["x"] + math.cos(FRONT) * 30, 110, T["d"] + math.sin(FRONT) * 30)), energy=float(arg("--tree", "14")), colour=(1.0, 0.7, 0.38), size=0.5)
# parcels under it
PAPERS = [plain(f"parcel paper {k}", c, rough=0.45, sheen=0.2) for k, c in enumerate(((0.35, 0.03, 0.03), (0.03, 0.18, 0.06), (0.04, 0.08, 0.3), (0.55, 0.45, 0.25)))]
RIBBON = plain("ribbon", (0.7, 0.55, 0.2), rough=0.3, metal=0.5)
for k, (dx, dd, w_, d_, h_, turn) in enumerate(((52, -30, 26, 20, 14, 0.4), (68, 4, 18, 18, 22, -0.3), (40, -52, 30, 22, 10, 1.1), (80, -26, 16, 14, 12, 0.8))):
    def parcel(w_=w_, d_=d_, h_=h_, k=k):
        box_cm("parcel", -w_ / 2, w_ / 2, 0, h_, -d_ / 2, d_ / 2, PAPERS[k % 4], 0.4, keep=False)
        box_cm("ribbon", -w_ / 2 - 0.1, w_ / 2 + 0.1, 0, h_ + 0.1, -1, 1, RIBBON, keep=False)
        box_cm("ribbon", -1, 1, 0, h_ + 0.1, -d_ / 2 - 0.1, d_ / 2 + 0.1, RIBBON, keep=False)
    ca, sa = math.cos(FRONT), math.sin(FRONT)
    _root = assembled("parcel", parcel, at=(T["x"] + dx * ca - dd * sa, 0, T["d"] + dx * sa + dd * ca), turn=turn)
    if k == 1: GIFT = dict(root=_root, at=(T["x"] + dx * ca - dd * sa, T["d"] + dx * sa + dd * ca), turn=turn, w=w_, d=d_, h=h_, paper=PAPERS[k % 4])
# (in The Lit Tree the tall green one opens: its lid off and laid by, and out of
# it a rule, a protractor and a pair of compasses)
OPEN, TOYS = [], []
if VIEW == "tree":
    from drawing_instruments import rule, protractor, compasses
    gw, gd_, gh = GIFT["w"], GIFT["d"], GIFT["h"]
    def opened():
        box_cm("parcel", -gw / 2, gw / 2, 0, 0.4, -gd_ / 2, gd_ / 2, GIFT["paper"], keep=False)
        for (a, b_, c, e) in ((-gw / 2, gw / 2, -gd_ / 2, -gd_ / 2 + 0.4), (-gw / 2, gw / 2, gd_ / 2 - 0.4, gd_ / 2), (-gw / 2, -gw / 2 + 0.4, -gd_ / 2, gd_ / 2), (gw / 2 - 0.4, gw / 2, -gd_ / 2, gd_ / 2)):
            box_cm("parcel", a, b_, 0, gh - 1.2, c, e, GIFT["paper"], 0.1, keep=False)
        box_cm("tissue", -gw / 2 + 0.5, gw / 2 - 0.5, gh - 3.5, gh - 3.2, -gd_ / 2 + 0.5, gd_ / 2 - 0.5, plain("tissue", (0.75, 0.72, 0.66), rough=0.8), 0.2, keep=False)
    _o = assembled("parcel open", opened, at=(GIFT["at"][0], 0, GIFT["at"][1]), turn=GIFT["turn"])
    def lid():
        box_cm("parcel lid", -gw / 2 - 0.4, gw / 2 + 0.4, 0, 1.2, -gd_ / 2 - 0.4, gd_ / 2 + 0.4, GIFT["paper"], 0.2, keep=False)
        box_cm("ribbon", -gw / 2 - 0.5, gw / 2 + 0.5, 0, 1.3, -1, 1, RIBBON, keep=False)
        box_cm("ribbon", -1, 1, 0, 1.3, -gd_ / 2 - 0.5, gd_ / 2 + 0.5, RIBBON, keep=False)
    ca, sa = math.cos(FRONT), math.sin(FRONT)
    near = lambda f_, s_: (GIFT["at"][0] + f_ * ca - s_ * sa, GIFT["at"][1] + f_ * sa + s_ * ca)
    _l = assembled("parcel lid", lid, at=(near(4, 30)[0], 0, near(4, 30)[1]), turn=GIFT["turn"] + 0.5)
    OPEN = [_o, _l]
    BOXWOOD_RULE = scan("boxwood rule", "dark_wood", size=0.3, tint=(1.0, 0.82, 0.55), bright=1.0, sat=0.5, rough=(0.4, 0.55), bump=0.2)
    STEEL = plain("steel", (0.55, 0.56, 0.58), rough=0.28, metal=1.0)
    for (fn, (f_, s_), turn_) in ((lambda: rule(BOXWOOD_RULE), (16, 54), 0.35), (lambda: protractor(BRASS), (-6, 70), -0.3), (lambda: compasses(STEEL, BRASS), (28, 33), 1.1)):
        x_, d_ = near(f_, s_)
        TOYS.append(assembled("instrument", fn, at=(x_, 0.05, d_), turn=FRONT + turn_))

# ── by the fire: two armchairs, a little table, the chest ─────────────────
import_model("GreenChair_01", height=M(104), at=tuple(P(52, 0, 470)), rot=float(arg("--chair1", "-1.95")))
darken_model(import_model("ArmChair_01", height=M(98), at=tuple(P(-74, 0, 446)), rot=float(arg("--chair2", "-1.05"))), (0.45, 0.16, 0.12))
st_root = import_model("side_table_01", height=M(56), at=tuple(P(-26, 0, 470)), rot=0.3)
darken_model(st_root, (0.34, 0.22, 0.15))
SIDE_TOP = model_top(st_root)
CHEST = dict(x0=-37, x1=-16, d0=462, d1=477, y0=SIDE_TOP + 0.6, y1=SIDE_TOP + 11.1, lid=7.7)
chest_body, chest_hinge, lid_parts = chest(CHEST)
CHEST_PARTS = chest_body + lid_parts
if VIEW == "tree":
    for root_ in [o for o in bpy.data.objects if o.name.split(".")[0] in ("GreenChair_01", "ArmChair_01", "side_table_01")]:
        for o in [root_] + list(root_.children_recursive): o.hide_render = True
    for o in CHEST_PARTS: o.hide_render = True
    for o in [o for o in bpy.data.objects if o.name.startswith("ladder rail")]: o.hide_render = True
rug(-150, 140, 140, 480, rug_material("rug", f"{ASSETS}/textures/persian_rug.jpg", tint=(0.55, 0.62, 1.0), sat=0.95, value=0.4))

# ── the chandelier, cold, from the ceiling's rose ─────────────────────────
ch_x, ch_d, ch_y = 0, 340, 236
lathe("ceiling rose", [(0, 0), (0.22, 0), (0.2, -0.02), (0.12, -0.04), (0.05, -0.05), (0, -0.05)], PLASTER, at=tuple(P(ch_x, TOP, ch_d)), steps=48)
for k in range(int((TOP - 5 - (ch_y + 40)) / 3.4)):
    y = ch_y + 40 + k * 3.4
    bpy.ops.mesh.primitive_torus_add(major_radius=M(1.1), minor_radius=M(0.25), location=tuple(P(ch_x, y + 1.7, ch_d)), rotation=(math.pi / 2, 0, k * math.pi / 2))
    bpy.context.active_object.data.materials.append(BRASS)
lathe("chandelier", [(0, 0), (0.035, 0.01), (0.07, 0.06), (0.05, 0.12), (0.02, 0.16), (0.03, 0.22), (0.015, 0.3), (0.02, 0.38), (0, 0.4)], BRASS, at=tuple(P(ch_x, ch_y, ch_d)), steps=40)
for k in range(6):
    a = k / 6 * math.tau
    tube("chandelier arm", [(0.03, 0.08), (0.2, 0.02), (0.36, 0.08), (0.4, 0.16)], 0.007, BRASS, at=tuple(P(ch_x, ch_y, ch_d)), rot=a)
    ex, ed = ch_x + math.cos(a) * 40, ch_d + math.sin(a) * 40
    lathe("candle cup", [(0, 0), (0.035, 0.01), (0.04, 0.02), (0.015, 0.025), (0, 0.025)], BRASS, at=tuple(P(ex, ch_y + 16, ed)), steps=24)
    cylinder("cold candle", M(ex), M(ed), M(ch_y + 18.5), M(ch_y + 30), M(1.0), WAX, verts=20)

# ── light ──────────────────────────────────────────────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
lamp("the moon", "SUN", tuple(P(-300, 2600, 2600)), aim=tuple(P(-20, 0, 300)), energy=float(arg("--moon", "2.4")), colour=(0.55, 0.68, 1.0), angle=math.radians(1.5))
sky_l = lamp("sky through the window", "AREA", tuple(P(WIN["x"], 190, D1 + 14)), aim=tuple(P(WIN["x"], 60, 320)), energy=float(arg("--sky", "26")), colour=(0.5, 0.62, 0.95), size=1.4, size_y=1.9)
sky_l.visible_camera = False; sky_l.visible_transmission = False; sky_l.visible_glossy = False
fill_l = lamp("fill", "AREA", tuple(P(150, 220, 20)), aim=tuple(P(-120, 80, 420)), energy=float(arg("--fill", "50")), colour=(0.8, 0.85, 1.0), size=1.8)
fill_l.visible_camera = False; fill_l.visible_glossy = False
eye_fill(float(arg("--eyefill", "19")))                # (the halls' fill: nothing the eye sees falls to black)
for (at, aim) in ((P(-80, 210, 330), P(X0, 150, 330)), (P(-40, 210, 440), P(-40, 150, D1))):
    wash = lamp("on the walls", "AREA", tuple(at), aim=tuple(aim), energy=float(arg("--wash", "18")), colour=(0.82, 0.86, 1.0), size=1.0)
    wash.visible_camera = False; wash.visible_glossy = False
# (one light: the tree's lamps — just so many alight on each tier as the
# puzzle has them; the candle by the trap is out, the fire dead; the
# television's snow stays on)
ONE = Light("tree", [tree_l], [BULB_LIT]); OUT_LIGHTS = [Light("trap", [candle_l]), Light("fire", [fire_l])]
_mul.inputs[1].default_value = 0.0
clear_glass()
air = room_haze(X0, X1, -40, D1, TOP, float(arg("--haze", "0")))

# ── what the game is told ──────────────────────────────────────────────────
LAYOUT.thing("tapcode", "Climb down the ladder", corners(tp["x0"] - 5, tp["x1"] + 5, 0, 66, ld0, tp["d1"] + 5))
LAYOUT.thing("pi", "Look at the tree", [P(T["x"] + math.cos(a) * reach(y, a), y, T["d"] + math.sin(a) * reach(y, a)) for y in (T["foot"] + 10, T["foot"] + 60, T["foot"] + 110) for a in (FRONT - 1.4, FRONT, FRONT + 1.4)] +
             [P(T["x"], TOP_Y + 14, T["d"]), P(T["x"] - 30, 0, T["d"]), P(T["x"] + 30, 0, T["d"]), P(T["x"], 0, T["d"] - 30)])
LAYOUT.thing("rally", "Watch the television", [P(tv["x0"], tv["y0"], D1 - 4), P(tv["x1"], tv["y0"], D1 - 4), P(tv["x1"], tv["y1"], D1 - 4), P(tv["x0"], tv["y1"], D1 - 4)])
LAYOUT.chest(CHEST)
LAYOUT.glow("trap", CANDLE_AT, 70)
LAYOUT.flame("candle", CANDLE_AT)
LAYOUT.glow("tree", P(T["x"] + math.cos(FRONT) * 20, 100, T["d"] + math.sin(FRONT) * 20), 120)
LAYOUT.glow("tv", P((tv["x0"] + tv["x1"]) / 2, (tv["y0"] + tv["y1"]) / 2, D1 - 10), 120)
LAYOUT.glow("embers", P(gx_ + 6, 20, gd_), 46)
LAYOUT.quad("tv", [P(tv["x0"] + 1.6, tv["y1"] - 1.6, GLASS_D), P(tv["x1"] - 1.6, tv["y1"] - 1.6, GLASS_D), P(tv["x1"] - 1.6, tv["y0"] + 1.6, GLASS_D), P(tv["x0"] + 1.6, tv["y0"] + 1.6, GLASS_D)])
for pane in SASHES: LAYOUT.pane(pane)
LAYOUT.dust([P(wx0, WIN["top"], D1), P(wx1, WIN["sill"], D1), P(wx0 + 10, 0, 345), P(wx1, 0, 520)])
if not VIEW: LAYOUT.write()

# ── the passes ─────────────────────────────────────────────────────────────
if VIEW == "tree":
    import tree_level_passes
    tree_level_passes.run(globals())
    raise SystemExit
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "1.6")))
scene.cycles.volume_bounces = 1
GLOSSY = ("snow", "standby lamp", "lamp alight", "lamp dark")                # (what keeps its shine: glazes, screens, lamp glass)
finish(scene, SAMPLES, keep_gloss=GLOSSY)
plates = one_light(ONE, OUT_LIGHTS) if "plates" in ONLY else {}
passes(scene, OUT, set(plates), air, apart={"chest": CHEST_PARTS}, variants=plates)
if "chest" in ONLY:
    air.hide_render = True
    chest_sprites(scene, OUT, LAYOUT.data["chest"]["box"], chest_body, chest_hinge, lid_parts)
print("ROOM_DONE")
