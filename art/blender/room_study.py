# Room I, the study — Ivy's room — built in three dimensions and rendered with
# Cycles, seen from the corner by the door, across the room to the window.
#
# Green damask over an oak dado, oak boards and a worn rug, a plaster ceiling.
# Close at hand, a round lamp table: a brass lamp under a pleated shade, and a
# glass case of earth with a seedling in it, its roots branching down against
# the glass. Further in, free in the floor and at an angle to the walls, a
# writing desk with a candle burning in a brass chamberstick, a microscope,
# letters, the gilt chest; a green armchair pushed back from it. In the back
# wall a tall round-headed casement, its right leaf swung wide on the wet
# garden and the moon, a terracotta pot on the sill with something just come
# up in it. Books from floor to cornice along the rest of the back wall, a
# ladder against them; on the right-hand wall the brass cipher wheel on its
# walnut plaque, pressed plants framed, a fern on a stand.
#
# The lamp burns until the case is solved, the candle until the wheel is: a
# plate for each way they can stand (lights-<lamp><candle>), the chest apart,
# and where it all fell in the picture (src/levels/house/rooms/Study.json).
#
#   blender -b --factory-startup -P art/blender/room_study.py -- [--samples 256] [--width 2560] [--only plates,chest]

import bpy, bmesh, math, os, sys, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *

OUT = os.path.join(ROOT, ".artifacts/room-study")
os.makedirs(OUT, exist_ok=True)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")       # room_boards.mjs
SAMPLES = int(arg("--samples", "700"))
WIDTH = int(arg("--width", "2560"))
ONLY = set(arg("--only", "plates,chest").split(","))
RNG = random.Random(1888)

# ── the room, and where we stand in it ─────────────────────────────────────
X0, X1, D1, TOP = -240, 240, 560, 300          # its walls (the door's wall at d 0), its ceiling
EYE = (float(arg("--ex", "-200")), float(arg("--ey", "160")), float(arg("--ed", "10")))
LOOK = (float(arg("--lx", "100")), EYE[1], float(arg("--ld", "460")))
scene, HEIGHT = stage(WIDTH, eye=EYE, look=LOOK, lens=float(arg("--lens", "24")), lift=float(arg("--lift", "-0.1")))
WIN = dict(x=118, hw=50, sill=92, top=286)      # the window in the back wall
SPRING = WIN["top"] - WIN["hw"]
LAMP_TABLE = dict(x=-112, d=262, r=42, h=70)
DESK = dict(x=58, d=388, turn=math.radians(14), w=128, deep=68, h=76)
HEARTH = dict(d0=250, d1=420, out=32)           # the chimney breast on the right-hand wall
WHEEL = dict(d=335, y=190, r=21, plaque=27)    # over the mantel

# ── materials ──────────────────────────────────────────────────────────────
OAK = scan("oak", "dark_wood", size=1.0, tint=(0.82, 0.62, 0.44), bright=0.55, rough=(0.3, 0.55), bump=0.3, coat=0.35, upright=True)
OAK_X = scan("oak across", "dark_wood", size=1.0, tint=(0.82, 0.62, 0.44), bright=0.52, rough=(0.3, 0.55), bump=0.3, coat=0.35)
WALNUT = scan("walnut", "rosewood_veneer1", size=0.6, tint=(0.7, 0.52, 0.4), bright=0.62, sat=0.9, rough=(0.16, 0.34), bump=0.2, coat=0.55)
BOARDS = scan("floor boards", "wood_floor_worn", size=2.0, tint=(0.72, 0.56, 0.42), bright=0.52, rough=(0.22, 0.5), bump=0.5, coat=0.4)
PLASTER = scan("ceiling", "plastered_wall_04", size=2.0, tint=(0.82, 0.8, 0.72), bright=0.7, sat=0.3, rough=(0.8, 0.95), bump=0.5)
LEATHER = scan("desk leather", "brown_leather", size=0.5, tint=(0.4, 0.5, 0.3), bright=0.55, rough=(0.35, 0.6), bump=0.4)
BRASS = aged_metal("brass", (0.55, 0.39, 0.17), (0.08, 0.055, 0.025), rough=(0.22, 0.5), scale=30, tarnish=0.55)
IRON = plain("iron", (0.02, 0.02, 0.02), rough=0.45, metal=0.8)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
WAX = bpy.data.materials.new("wax"); WAX.use_nodes = True
_w = WAX.node_tree.nodes["Principled BSDF"]; _w.inputs["Base Color"].default_value = (0.82, 0.74, 0.58, 1); _w.inputs["Subsurface Weight"].default_value = 0.6; _w.inputs["Subsurface Radius"].default_value = (0.02, 0.012, 0.006); _w.inputs["Roughness"].default_value = 0.42
WICK = plain("wick", (0.01, 0.01, 0.01), rough=0.9)
TERRACOTTA = plain("terracotta", (0.42, 0.18, 0.09), rough=0.85)
PAGES = plain("pages", (0.3, 0.26, 0.19), rough=0.9)
FRAME = plain("window paint", (0.04, 0.035, 0.03), rough=0.45)
def wallpaper():
    m = bpy.data.materials.new("green damask"); m.use_nodes = True
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / 0.55,) * 3
    Lk(tc.outputs["Object"], mp.inputs["Vector"])
    ti = N.new("ShaderNodeTexImage"); ti.image = bpy.data.images.load(os.path.join(DRAWN, "study-paper.png"), check_existing=True)
    ti.projection = "BOX"; ti.projection_blend = 0.1; Lk(mp.outputs["Vector"], ti.inputs["Vector"])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1.6; nz.inputs["Detail"].default_value = 6; Lk(tc.outputs["Object"], nz.inputs["Vector"])
    fade = N.new("ShaderNodeMix"); fade.data_type = "RGBA"; fade.blend_type = "MULTIPLY"
    fr = N.new("ShaderNodeMapRange"); fr.inputs["To Min"].default_value = 0.0; fr.inputs["To Max"].default_value = 0.35
    Lk(nz.outputs["Fac"], fr.inputs["Value"]); Lk(fr.outputs["Result"], fade.inputs["Factor"]); Lk(ti.outputs["Color"], fade.inputs[6]); fade.inputs[7].default_value = (0.75, 0.8, 0.7, 1)
    ao = N.new("ShaderNodeAmbientOcclusion"); ao.inputs["Distance"].default_value = 0.3
    ar = N.new("ShaderNodeValToRGB"); ar.color_ramp.elements[0].color = (0.45, 0.43, 0.4, 1); Lk(ao.outputs["AO"], ar.inputs["Fac"])
    am = N.new("ShaderNodeMix"); am.data_type = "RGBA"; am.blend_type = "MULTIPLY"; am.inputs["Factor"].default_value = 1
    Lk(fade.outputs[2], am.inputs[6]); Lk(ar.outputs["Color"], am.inputs[7]); Lk(am.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.55; b.inputs["Sheen Weight"].default_value = 0.5; b.inputs["Sheen Roughness"].default_value = 0.3
    bw = N.new("ShaderNodeRGBToBW"); bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.15; bp.inputs["Distance"].default_value = 0.001
    Lk(ti.outputs["Color"], bw.inputs["Color"]); Lk(bw.outputs["Val"], bp.inputs["Height"]); Lk(bp.outputs["Normal"], b.inputs["Normal"])
    return m
PAPER = wallpaper()
CIPHER = picture("cipher face", os.path.join(DRAWN, "cipher.png"), rough=0.3, coat=0.2, bump=0.4)
CIPHER.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 0.85
PRINT = picture("botanical print", os.path.join(DRAWN, "study-print.png"), rough=0.9)
spine_mat = bound(picture("spines", os.path.join(DRAWN, "spines.png"), rough=0.5, coat=0.15, bump=0.3))
COVERS = cover_materials()
VELVET = scan("velvet", "velour_velvet", size=0.5, tint=(0.1, 0.42, 0.22), bright=0.3, sat=1.0, rough=(0.6, 0.85), bump=0.3)
VELVET.node_tree.nodes["Principled BSDF"].inputs["Sheen Weight"].default_value = 0.35
LAYOUT = Layout("Study")

# ── the shell ──────────────────────────────────────────────────────────────
DADO = 92
box_cm("floor", X0 - 30, X1 + 30, -6, 0, -60, D1 + 30, BOARDS)
box_cm("ceiling", X0 - 30, X1 + 30, TOP, TOP + 10, -60, D1 + 30, PLASTER)
for (x0, x1) in ((X0 - 25, X0), (X1, X1 + 25)):
    box_cm("wall", x0, x1, 0, TOP, -60, D1 + 30, PAPER)
box_cm("door wall", X0 - 25, X1 + 25, 0, TOP, -80, -60, PAPER)
back = box_cm("back wall", X0 - 25, X1 + 25, 0, TOP, D1, D1 + 30, PAPER)
wx0, wx1 = WIN["x"] - WIN["hw"], WIN["x"] + WIN["hw"]
boolean_cut(back, box("cut", M(wx0), M(wx1), M(D1 - 10), M(D1 + 50), M(WIN["sill"]), M(SPRING), IRON))
arch_cut = cylinder("cut", 0, 0, -0.5, 0.5, M(WIN["hw"]), IRON, verts=64); arch_cut.rotation_euler = (math.pi / 2, 0, 0); arch_cut.location = P(WIN["x"], SPRING, D1 + 15)
boolean_cut(back, arch_cut)
def dado(a, b, along_x, at, facing):
    """an oak dado along a wall: boards, panels, a rail, a skirting; and the
    cornice at the ceiling"""
    def piece(p0, p1, y0, y1, proud, mat, r=0.0):
        q0, q1 = sorted((at, at + facing * proud))
        if along_x: box_cm("dado", p0, p1, y0, y1, q0, q1, mat, r)
        else: box_cm("dado", q0, q1, y0, y1, p0, p1, mat, r)
    piece(a, b, 0, DADO, 2.0, OAK)
    n = max(1, round((b - a) / 56))
    for k in range(n):
        p0 = a + k * (b - a) / n + 6; p1 = a + (k + 1) * (b - a) / n - 6
        piece(p0, p1, 18, DADO - 14, 3.2, OAK, 1.2)
    piece(a, b, DADO - 3, DADO + 4, 4.5, OAK_X, 1.0)
    piece(a, b, 0, 16, 3.5, OAK_X, 0.6)
    piece(a, b, TOP - 14, TOP, 9, PLASTER, 2.0)
dado(-60, D1, False, X1, -1)
dado(-60, D1, False, X0, 1)
dado(wx1 + 14, X1, True, D1, -1)

# ── the window: a round-headed casement, its right leaf swung wide ─────────
REVEAL = 30
box_cm("reveal", wx0 - 3, wx0, WIN["sill"], SPRING, D1, D1 + REVEAL, PLASTER)
box_cm("reveal", wx1, wx1 + 3, WIN["sill"], SPRING, D1, D1 + REVEAL, PLASTER)
box_cm("sill", wx0 - 10, wx1 + 10, WIN["sill"] - 4, WIN["sill"], D1 - 14, D1 + REVEAL - 6, OAK_X, 1.0)
box_cm("window back", wx0 - 14, wx1 + 14, 0, WIN["sill"] - 4, D1 - 2, D1, OAK)
GD = D1 + REVEAL - 10
def leaf(x0, x1, hinge_x, angle):
    y0, y1 = WIN["sill"] + 1, SPRING - 1.5
    root = bpy.data.objects.new("leaf", None); link(root); root.location = P(hinge_x, 0, GD)
    def rel(xa, xb, ya, yb, da, db, mat, r=0.0):
        o = box("leaf part", M(xa - hinge_x), M(xb - hinge_x), M(da - GD), M(db - GD), M(ya), M(yb), mat)
        if r: bevel(o, M(r), 1)
        o.parent = root; arch(o); return o
    rel(x0, x0 + 5, y0, y1, GD - 2.5, GD + 2.5, FRAME, 0.5); rel(x1 - 5, x1, y0, y1, GD - 2.5, GD + 2.5, FRAME, 0.5)
    rel(x0, x1, y0, y0 + 8, GD - 2.5, GD + 2.5, FRAME, 0.5); rel(x0, x1, y1 - 5, y1, GD - 2.5, GD + 2.5, FRAME, 0.5)
    xm = (x0 + x1) / 2
    rel(xm - 1.2, xm + 1.2, y0 + 8, y1 - 5, GD - 1.6, GD + 1.6, FRAME, 0.3)
    for k in (1, 2):
        y = y0 + 8 + k * (y1 - 5 - y0 - 8) / 3
        rel(x0 + 5, x1 - 5, y - 1.2, y + 1.2, GD - 1.6, GD + 1.6, FRAME, 0.3)
    rel(x0 + 4, x1 - 4, y0 + 7, y1 - 4, GD - 0.3, GD + 0.3, GLASS)
    root.rotation_euler = (0, 0, angle)
    return root
OPEN = math.radians(float(arg("--open", "62")))
left_leaf = leaf(wx0, WIN["x"], wx0, 0.0)
right_leaf = leaf(WIN["x"], wx1, wx1, OPEN)
box_cm("transom", wx0, wx1, SPRING - 1.5, SPRING + 2.5, GD - 3, GD + 3, FRAME, 0.4)
me = bpy.data.meshes.new("fanlight"); bm = bmesh.new(); n = 48
r_out, r_in = WIN["hw"], WIN["hw"] - 5
outer = [bm.verts.new(tuple(P(WIN["x"] + math.cos(math.pi * i / n) * r_out, SPRING + math.sin(math.pi * i / n) * r_out, GD - 2.5))) for i in range(n + 1)]
inner = [bm.verts.new(tuple(P(WIN["x"] + math.cos(math.pi * i / n) * r_in, SPRING + math.sin(math.pi * i / n) * r_in, GD - 2.5))) for i in range(n + 1)]
for i in range(n): bm.faces.new((outer[i], outer[i + 1], inner[i + 1], inner[i]))
bm.to_mesh(me); bm.free()
fan = arch(link(bpy.data.objects.new("fanlight", me))); fan.data.materials.append(FRAME)
so = fan.modifiers.new("thick", "SOLIDIFY"); so.thickness = M(5); so.offset = -1
for k in range(1, 4):
    a = math.pi * k / 4
    arch(rod("fan bar", P(WIN["x"], SPRING, GD), P(WIN["x"] + math.cos(a) * r_in, SPRING + math.sin(a) * r_in, GD), M(1.1), FRAME, verts=8))
gl = bpy.data.meshes.new("fan glass"); bm = bmesh.new()
vs = [bm.verts.new(tuple(P(WIN["x"], SPRING, GD)))] + [bm.verts.new(tuple(P(WIN["x"] + math.cos(math.pi * i / n) * r_in, SPRING + math.sin(math.pi * i / n) * r_in, GD))) for i in range(n + 1)]
for i in range(1, n + 1): bm.faces.new((vs[0], vs[i], vs[i + 1]))
bm.to_mesh(gl); bm.free()
arch(link(bpy.data.objects.new("fan glass", gl))).data.materials.append(GLASS)
curtain(RNG, wx0 - 58, wx0 - 4, D1 - 7, 300, VELVET)
curtain(RNG, wx1 + 4, wx1 + 58, D1 - 7, 300, VELVET)
curtain_pole(wx0 - 66, wx1 + 66, 296, D1 - 9, BRASS)
# the garden beyond, the moon low over it — seen through the open leaf
MOON_AT = P(1822, 725, 3400)
garden(MOON_AT, [("island_tree_01", -160, 1500, 9.0, 0.3), ("island_tree_02", 150, 2100, 11.0, 1.4), ("tree_small_02", 40, 1150, 4.5, 2.2),
                  ("island_tree_01", 1900, 2600, 10.0, 2.9), ("shrub_02", 120, 860, 1.4, 0.6), ("shrub_02", 330, 900, 1.6, 2.0)],
       (-800, 1600, D1 + 30, 3200, -40), P(800, 700, 4400))
# on the sill: a terracotta pot, something just come up in it
pot_x, pot_d = WIN["x"] - 22, D1 + 6
SPROUT = plain("seedling", (0.14, 0.34, 0.06), rough=0.5)
lathe("pot", [(0, 0), (0.042, 0), (0.044, 0.004), (0.056, 0.09), (0.061, 0.095), (0.061, 0.11), (0.056, 0.11), (0.054, 0.1), (0, 0.1)], TERRACOTTA, at=tuple(P(pot_x, WIN["sill"], pot_d)), steps=40)
cylinder("earth", M(pot_x), M(pot_d), M(WIN["sill"] + 9), M(WIN["sill"] + 9.4), M(5.3), plain("pot earth", (0.05, 0.035, 0.02), rough=1.0))
for lean, a in ((0.15, 0.4), (-0.12, 2.6)):
    tube("shoot", [(0, 0), (lean * 0.02, 0.04), (lean * 0.05, 0.075)], 0.0012, SPROUT, at=tuple(P(pot_x, WIN["sill"] + 9.4, pot_d)), rot=a)
for a in (0.3, 0.3 + math.pi):
    lf = leaf_blade("leaf", tuple(P(pot_x + math.cos(a) * 1.3, WIN["sill"] + 16.8, pot_d + math.sin(a) * 1.3)), M(1.4), SPROUT, squash=(1.0, 0.55, 0.12))
    lf.rotation_euler = (0.2, 0.3, a)

# ── books from floor to cornice along the back wall, a ladder ──────────────
SHELF_RUN = wx0 - 14 - X0 - 4
def back_bookcase():
    bookcase(RNG, 0, -1, 0, SHELF_RUN, TOP - 14, OAK, OAK_X, spine_mat, COVERS, PAGES, depth=36,
             levels=(9, 46, 83, 120, 157, 194, 231, 268), bays=5, glass=GLASS)
# (built against a wall at x 0 running along d, then turned to stand along the
# back wall with its books toward the room)
assembled("back bookcase", back_bookcase, at=(X0 + 2, 0, D1), turn=-math.pi / 2)
def ladder():
    for e in (-1, 1):
        box_cm("ladder rail", e * 22 - 2, e * 22 + 2, 0, 250, -2, 2, OAK, 0.6)
    for k in range(9):
        y = 22 + k * 26
        box_cm("rung", -22, 22, y, y + 3, -1.5, 1.5, OAK, 0.5)
lad = assembled("ladder", ladder, at=(-92, 0, D1 - 98))
lad.rotation_euler = (math.radians(-14), 0, math.radians(6))

# ── close at hand: the lamp table, the lamp, the glass case of earth ──────
LT = LAMP_TABLE
def lamp_table():
    h, r = M(LT["h"]), M(LT["r"])
    lathe("table top", [(0, h - 0.03), (r, h - 0.03), (r + 0.006, h - 0.018), (r, h), (0, h)], WALNUT, steps=64)
    lathe("table column", [(0, 0), (0.05, 0.08), (0.04, 0.16), (0.045, 0.3), (0.035, 0.45), (0.05, 0.55), (0.04, h - 0.03), (0, h - 0.03)], WALNUT, steps=32)
    for k in range(3):
        tube("table foot", [(0.03, 0.12), (0.16, 0.06), (0.26, 0.015)], 0.018, WALNUT, rot=k * math.tau / 3 + 0.3)
assembled("lamp table", lamp_table, at=(LT["x"], 0, LT["d"]))
ty = LT["h"]
# the lamp, to the right of the case
lx, ld = LT["x"] + 25, LT["d"] - 6
lathe("lamp", [(0, 0), (0.075, 0), (0.078, 0.01), (0.06, 0.025), (0.03, 0.04), (0.02, 0.1), (0.032, 0.14), (0.016, 0.17), (0.014, 0.25), (0.02, 0.27), (0.012, 0.29), (0, 0.29)], BRASS, at=tuple(P(lx, ty, ld)), steps=40)
SHADE = shade_material("lamp shade", (0.5, 0.41, 0.27), glow=(1.0, 0.6, 0.28), strength=float(arg("--shade", "0.5")), through=float(arg("--through", "0.04")))
pleated_shade(lx, ld, ty + 24, ty + 46, 16.5, 8.5, SHADE)
lamp_l = lamp("lamp bulb", "POINT", tuple(P(lx, ty + 33, ld)), energy=float(arg("--lamp", "32")), colour=(1.0, 0.68, 0.36), size=0.03)
# the glass case: a brass frame round glass, earth halfway up it, a seedling,
# its roots against the front glass
cx0, cx1, cd0, cd1 = LT["x"] - 30, LT["x"] + 4, LT["d"] - 24, LT["d"] - 2
cy0, cy1, soil = ty, ty + 36, ty + 17
box_cm("case base", cx0 - 1.5, cx1 + 1.5, cy0, cy0 + 3, cd0 - 1.5, cd1 + 1.5, WALNUT, 0.5)
for x in (cx0, cx1):
    for d in (cd0, cd1): box_cm("case post", x - 0.7, x + 0.7, cy0 + 3, cy1, d - 0.7, d + 0.7, BRASS, 0.2)
for d in (cd0, cd1): box_cm("case rail", cx0, cx1, cy1 - 1.2, cy1, d - 0.7, d + 0.7, BRASS, 0.2)
for x in (cx0, cx1): box_cm("case rail", x - 0.7, x + 0.7, cy1 - 1.2, cy1, cd0, cd1, BRASS, 0.2)
# (a little ridged roof of glass, as such cases have)
me = bpy.data.meshes.new("case roof"); bm = bmesh.new()
a0, a1, a2, a3 = (bm.verts.new(tuple(P(x, cy1, d))) for x, d in ((cx0, cd0), (cx1, cd0), (cx1, cd1), (cx0, cd1)))
r0, r1 = bm.verts.new(tuple(P(cx0, cy1 + 9, (cd0 + cd1) / 2))), bm.verts.new(tuple(P(cx1, cy1 + 9, (cd0 + cd1) / 2)))
bm.faces.new((a0, a1, r1, r0)); bm.faces.new((a3, r0, r1, a2)); bm.faces.new((a0, r0, a3)); bm.faces.new((a1, a2, r1))
bm.to_mesh(me); bm.free()
arch(link(bpy.data.objects.new("case roof", me))).data.materials.append(GLASS)
rod("ridge", P(cx0, cy1 + 9, (cd0 + cd1) / 2), P(cx1, cy1 + 9, (cd0 + cd1) / 2), M(0.5), BRASS, verts=8)
for (x, y) in ((cx0, cy1), (cx1, cy1)):
    rod("gable", P(x, y, cd0), P(x, y + 9, (cd0 + cd1) / 2), M(0.45), BRASS, verts=8)
    rod("gable", P(x, y, cd1), P(x, y + 9, (cd0 + cd1) / 2), M(0.45), BRASS, verts=8)
box_cm("case glass", cx0, cx1, cy0 + 3, cy1 - 0.4, cd0 - 0.2, cd0 + 0.2, GLASS)
box_cm("case glass", cx0, cx1, cy0 + 3, cy1 - 0.4, cd1 - 0.2, cd1 + 0.2, GLASS)
box_cm("case glass", cx0 - 0.2, cx0 + 0.2, cy0 + 3, cy1 - 0.4, cd0, cd1, GLASS)
box_cm("case glass", cx1 - 0.2, cx1 + 0.2, cy0 + 3, cy1 - 0.4, cd0, cd1, GLASS)
def earth_material():
    """potting earth: dark crumbs of every brown, a grit of sand, flecks of grit"""
    m = bpy.data.materials.new("earth"); m.use_nodes = True
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    crumbs = N.new("ShaderNodeTexVoronoi"); crumbs.inputs["Scale"].default_value = 420; crumbs.inputs["Randomness"].default_value = 1.0
    fine = N.new("ShaderNodeTexVoronoi"); fine.inputs["Scale"].default_value = 1500
    damp = N.new("ShaderNodeTexNoise"); damp.inputs["Scale"].default_value = 25; damp.inputs["Detail"].default_value = 6
    for t in (crumbs, fine, damp): Lk(tc.outputs["Object"], t.inputs["Vector"])
    shade = N.new("ShaderNodeValToRGB"); r = shade.color_ramp
    r.elements[0].color = (0.012, 0.006, 0.0025, 1); r.elements[1].position = 0.8; r.elements[1].color = (0.075, 0.04, 0.016, 1)
    e = r.elements.new(0.985); e.color = (0.16, 0.12, 0.08, 1)
    hs = N.new("ShaderNodeSeparateColor"); Lk(crumbs.outputs["Color"], hs.inputs["Color"]); Lk(hs.outputs["Red"], shade.inputs["Fac"])
    wet = N.new("ShaderNodeMix"); wet.data_type = "RGBA"; wet.blend_type = "MULTIPLY"
    dr = N.new("ShaderNodeMapRange"); dr.inputs["To Min"].default_value = 0.0; dr.inputs["To Max"].default_value = 0.6
    Lk(damp.outputs["Fac"], dr.inputs["Value"]); Lk(dr.outputs["Result"], wet.inputs["Factor"]); Lk(shade.outputs["Color"], wet.inputs[6]); wet.inputs[7].default_value = (0.5, 0.42, 0.36, 1)
    Lk(wet.outputs[2], b.inputs["Base Color"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 1.0; bump.inputs["Distance"].default_value = 0.0015
    add = N.new("ShaderNodeMath"); add.operation = "ADD"
    Lk(crumbs.outputs["Distance"], add.inputs[0]); add.inputs[1].default_value = 0.0; Lk(add.outputs["Value"], bump.inputs["Height"])
    Lk(bump.outputs["Normal"], b.inputs["Normal"]); b.inputs["Roughness"].default_value = 0.9; b.inputs["Specular IOR Level"].default_value = 0.3
    return m
EARTH = earth_material()
earth = box_cm("earth", cx0 + 0.3, cx1 - 0.3, cy0 + 3, soil, cd0 + 1.0, cd1 - 0.4, EARTH, keep=False)
# (its top crumbled, uneven)
sub = earth.modifiers.new("fine", "SUBSURF"); sub.subdivision_type = "SIMPLE"; sub.levels = sub.render_levels = 5
crumb = bpy.data.textures.new("crumb", "CLOUDS"); crumb.noise_scale = 0.012; crumb.noise_depth = 3
dsp = earth.modifiers.new("crumble", "DISPLACE"); dsp.texture = crumb; dsp.strength = M(0.35); dsp.mid_level = 0.5; dsp.texture_coords = "GLOBAL"
ROOT_MAT = plain("root", (0.3, 0.22, 0.13), rough=0.5, sheen=0.3)
ROOT_MAT.node_tree.nodes["Principled BSDF"].inputs["Subsurface Weight"].default_value = 0.4
HAIR = plain("root hair", (0.34, 0.27, 0.18), rough=0.7, sheen=0.5)
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
        mx, my = x + side * sp * ROOT_RNG.uniform(0.25, 0.55), y - dp * 0.5
        g = cd0 + 0.6 + ROOT_RNG.uniform(-0.05, 0.1)
        wob = [P(x + (ex - x) * t + ROOT_RNG.uniform(-0.35, 0.35) * (0 < t < 1), y + (ey - y) * t, g) for t in (0, 0.3, 0.62, 1)]
        wob[1] = P(mx + ROOT_RNG.uniform(-0.4, 0.4), y - dp * 0.3, g)
        root_curve(wob, r, r * 0.72, ROOT_MAT)
        for _ in range(3 if level >= 3 else 1):
            t = ROOT_RNG.uniform(0.2, 0.9); hx, hy = x + (ex - x) * t, y + (ey - y) * t
            a = ROOT_RNG.uniform(-2.6, -0.5) if side > 0 else ROOT_RNG.uniform(-2.6, -0.5) + math.pi * 0.0
            ln = ROOT_RNG.uniform(0.5, 1.2)
            root_curve([P(hx, hy, g), P(hx + math.cos(a) * ln, hy + math.sin(a) * ln, g)], r * 0.35, r * 0.2, HAIR)
        roots(ex, ey, depth * 0.7, spread * 0.58, level + 1, max(0.04, r * 0.7))
sx_, sd_ = (cx0 + cx1) / 2, (cd0 + cd1) / 2
root_curve([P(sx_, soil + 0.5, cd0 + 0.6), P(sx_ + 0.3, soil - 1.5, cd0 + 0.6), P(sx_, soil - 3, cd0 + 0.6)], 0.24, 0.19, ROOT_MAT)
roots(sx_, soil - 3, 3.6, 5.2, 1, 0.17)
SEEDLING = plain("seedling green", (0.11, 0.24, 0.05), rough=0.4, sheen=0.3)
_sb = SEEDLING.node_tree.nodes["Principled BSDF"]; _sb.inputs["Subsurface Weight"].default_value = 0.5; _sb.inputs["Subsurface Radius"].default_value = (0.004, 0.008, 0.002)
tube("stem", [(0, 0), (0.004, 0.05), (0.002, 0.1), (0.0, 0.13)], 0.003, SEEDLING, at=tuple(P(sx_, soil, sd_)))
for a in (0.1, 0.1 + math.pi):
    lf = leaf_blade("seed leaf", tuple(P(sx_ + math.cos(a) * 3.3, soil + 12.6, sd_ + math.sin(a) * 3.3)), M(3.4), SEEDLING, squash=(1.0, 0.48, 0.1))
    lf.rotation_euler = (0, 0.3 * (1 if a < 1 else -1), a)
for a in (1.6, 1.6 + math.pi):
    lf = leaf_blade("true leaf", tuple(P(sx_ + math.cos(a) * 2.2, soil + 14.2, sd_ + math.sin(a) * 2.2)), M(2.4), SEEDLING, squash=(1.0, 0.42, 0.1))
    lf.rotation_euler = (0.35, 0, a)
# a book lying open at the back of the table, a magnifying glass
o = book(RNG, 0, 0, 0, 3.2, 22, 16, spine_mat, COVERS, PAGES); o.rotation_euler = (math.pi / 2, 0, 0.6); o.location = P(LT["x"] + 8, ty + 1.6, LT["d"] + 22)
import_model("magnifying_glass_01", height=M(27), at=tuple(P(LT["x"] - 22, ty + 1.4, LT["d"] + 16)), rot=2.4, tilt=(math.pi / 2, 0.0))

# ── further in: the writing desk, the candle, the chest ───────────────────
DK = DESK
CANDLE_LOCAL = (DK["w"] / 2 - 16, DK["deep"] / 2 - 18)
def writing_desk():
    w, dp, h = DK["w"], DK["deep"], DK["h"]
    pedestal_desk(dict(x0=-w / 2, x1=w / 2, d0=-dp / 2, d1=dp / 2, h=h), WALNUT, LEATHER, BRASS)
    cx, cd = CANDLE_LOCAL
    lathe("chamberstick", [(0, 0), (0.065, 0), (0.068, 0.006), (0.064, 0.012), (0.02, 0.014), (0.016, 0.03), (0.022, 0.05), (0.018, 0.052), (0, 0.05)], BRASS, at=tuple(P(cx, h, cd)), steps=48)
    tube("finger ring", [(0.06, 0.008), (0.085, 0.02), (0.075, 0.04), (0.062, 0.03)], 0.003, BRASS, at=tuple(P(cx, h, cd)), rot=-0.6)
    cylinder("candle", M(cx), M(cd), M(h + 5), M(h + 24), M(1.1), WAX, verts=32)
    for j in range(3):
        a = 0.4 + j * 1.9; L_ = 2 + j * 1.1
        sphere("drip", tuple(P(cx + math.cos(a) * 1.1, h + 24 - L_ / 2, cd + math.sin(a) * 1.1)), M(0.3), WAX, squash=(1, 1, L_ / 0.6))
    cylinder("wick", M(cx), M(cd), M(h + 23.8), M(h + 24.9), M(0.07), WICK, verts=6)
    letters = paper("letters", (0.64, 0.58, 0.46), 0.3)
    for (x, d, a) in ((-8, -6, 0.08), (-3, -3, -0.14)):
        s_ = card("letter", [P(-10.5, 0, -14.8), P(10.5, 0, -14.8), P(10.5, 0, 14.8), P(-10.5, 0, 14.8)], letters)
        s_.location = P(x, h + 0.15, d); s_.rotation_euler = (0, 0, a)
    lathe("inkwell", [(0, 0), (0.035, 0), (0.035, 0.035), (0.018, 0.045), (0.012, 0.05), (0, 0.05)], GLASS, at=tuple(P(20, h, 16)), steps=32)
    cylinder("ink", M(20), M(16), M(h + 0.2), M(h + 2.5), M(3.2), plain("ink", (0.005, 0.005, 0.01), rough=0.1))
    tube("pen", [(0, 0), (0.17, 0.004)], 0.004, plain("pen", (0.02, 0.02, 0.02), rough=0.3), at=tuple(P(10, h + 0.5, 4)), rot=0.5)
    import_model("round_spectacles", width=M(13), at=tuple(P(6, h + 0.4, -14)), rot=0.3)
    import_model("vintage_microscope", height=M(30), at=tuple(P(-14, h, 14)), rot=2.6)
desk_root = assembled("writing desk", writing_desk, at=(DK["x"], 0, DK["d"]), turn=DK["turn"])
bpy.context.view_layer.update()
CANDLE_AT = desk_root.matrix_world @ P(CANDLE_LOCAL[0], DK["h"] + 24.9, CANDLE_LOCAL[1])
candle_l = lamp("candle", "POINT", tuple(CANDLE_AT + Vector((0, 0, 0.02))), energy=float(arg("--candle", "6")), colour=(1.0, 0.55, 0.22), size=0.012)
CHEST = dict(x0=26, x1=47, d0=-8, d1=7, y0=DK["h"] + 1, y1=DK["h"] + 11.5, lid=7.7)
def the_chest():
    global chest_body, chest_hinge, lid_parts
    chest_body, chest_hinge, lid_parts = chest(CHEST)
assembled("chest", the_chest, at=(DK["x"], 0, DK["d"]), turn=DK["turn"])
CHEST_PARTS = chest_body + lid_parts
import_model("GreenChair_01", height=M(104), at=tuple(P(112, 0, 298)), rot=math.pi + float(arg("--chair", "0.75")))

# ── the right-hand wall: the chimney breast, the hearth, the cipher wheel ──
hb = HEARTH
WX = X1 - hb["out"]                              # the breast's face
MARBLE = scan("marble", "marble_01", size=0.8, tint=(0.86, 0.82, 0.74), bright=0.62, sat=0.5, rough=(0.12, 0.3), bump=0.1, coat=0.4)
SOOT = plain("soot", (0.012, 0.01, 0.009), rough=0.95)
CAST = aged_metal("cast iron", (0.035, 0.033, 0.03), (0.02, 0.016, 0.012), rough=(0.4, 0.75), scale=40, tarnish=0.3)
breast = box_cm("chimney breast", WX, X1 + 1, 0, TOP, hb["d0"], hb["d1"], PAPER)
fb = dict(d0=304, d1=366, y1=82)                 # the fire's opening
boolean_cut(breast, box("cut", M(WX - 10), M(X1 - 8), M(fb["d0"]), M(fb["d1"]), M(-1), M(fb["y1"]), IRON))
# (its lining, black with soot; a cast-iron register round the opening)
box_cm("fire back", X1 - 12, X1 - 8, 0, fb["y1"], fb["d0"], fb["d1"], SOOT)
for d0, d1 in ((fb["d0"], fb["d0"] + 3), (fb["d1"] - 3, fb["d1"])):
    box_cm("fire cheek", WX, X1 - 8, 0, fb["y1"], d0, d1, SOOT)
box_cm("fire throat", WX, X1 - 8, fb["y1"] - 3, fb["y1"], fb["d0"], fb["d1"], SOOT)
for d0, d1 in ((fb["d0"] - 9, fb["d0"]), (fb["d1"], fb["d1"] + 9)):
    box_cm("register", WX - 1.5, WX, 0, fb["y1"] + 9, d0, d1, CAST, 0.4)
box_cm("register", WX - 1.5, WX, fb["y1"], fb["y1"] + 9, fb["d0"] - 9, fb["d1"] + 9, CAST, 0.4)
# the marble surround: jambs, a frieze, the mantel shelf
for d0, d1 in ((fb["d0"] - 33, fb["d0"] - 9), (fb["d1"] + 9, fb["d1"] + 33)):
    box_cm("jamb", WX - 5, WX, 0, 104, d0, d1, MARBLE, 0.6)
    box_cm("jamb foot", WX - 6.5, WX, 0, 12, d0 - 1.5, d1 + 1.5, MARBLE, 0.6)
    box_cm("corbel", WX - 7, WX, 104, 118, d0 + 2, d1 - 2, MARBLE, 0.8)
box_cm("frieze", WX - 4, WX, fb["y1"] + 9, 118, fb["d0"] - 9, fb["d1"] + 9, MARBLE, 0.6)
box_cm("mantel", WX - 13, WX, 118, 123, fb["d0"] - 42, fb["d1"] + 42, MARBLE, 1.2)
box_cm("mantel nosing", WX - 14, WX, 120, 122, fb["d0"] - 43, fb["d1"] + 43, MARBLE, 0.8)
# the breast's own skirting and cornice
box_cm("skirting", WX - 3.5, WX, 0, 16, hb["d0"] - 3.5, hb["d1"] + 3.5, OAK_X, 0.6)
for d0, d1 in ((hb["d0"] - 3.5, hb["d0"]), (hb["d1"], hb["d1"] + 3.5)):
    box_cm("skirting", WX, X1, 0, 16, d0, d1, OAK_X, 0.6)
box_cm("breast cornice", WX - 9, X1, TOP - 14, TOP, hb["d0"] - 9, hb["d1"] + 9, PLASTER, 2.0)
# the hearth stone, a brass fender
box_cm("hearth", WX - 52, WX, 0, 2.5, fb["d0"] - 48, fb["d1"] + 48, MARBLE, 0.8)
FD = (WX - 46, fb["d0"] - 40, fb["d1"] + 40)
rod("fender", P(FD[0], 9, FD[1]), P(FD[0], 9, FD[2]), M(1.0), BRASS, verts=16)
for d in (FD[1], FD[2]):
    rod("fender", P(FD[0], 9, d), P(WX - 2, 9, d), M(1.0), BRASS, verts=16)
    sphere("fender knob", tuple(P(FD[0], 9, d)), M(1.8), BRASS)
box_cm("fender plinth", FD[0] - 1, FD[0] + 1, 2.5, 6, FD[1], FD[2], BRASS, 0.3)
for k in range(9):
    d = FD[1] + (FD[2] - FD[1]) * (k + 0.5) / 9
    rod("fender rail", P(FD[0], 6, d), P(FD[0], 8.4, d), M(0.35), BRASS, verts=8)
# the grate: an iron basket, two logs burnt low over embers
gx, gd = X1 - 22, (fb["d0"] + fb["d1"]) / 2
for k in range(5):
    y = 12 + k * 4.5
    rod("grate bar", P(gx - 9, y, gd - 22), P(gx - 9, y, gd + 22), M(0.6), CAST, verts=8)
for d in (gd - 22, gd + 22):
    rod("grate leg", P(gx - 9, 0, d), P(gx - 9, 32, d), M(0.9), CAST, verts=8)
    rod("grate side", P(gx - 9, 12, d), P(gx + 8, 12, d), M(0.7), CAST, verts=8)
box_cm("grate floor", gx - 9, gx + 8, 11, 12, gd - 22, gd + 22, CAST)
EMBER = bpy.data.materials.new("embers"); EMBER.use_nodes = True
_n = EMBER.node_tree.nodes; _l = EMBER.node_tree.links.new; _b = _n["Principled BSDF"]
_tc = _n.new("ShaderNodeTexCoord"); _vz = _n.new("ShaderNodeTexVoronoi"); _vz.inputs["Scale"].default_value = 90
_ramp = _n.new("ShaderNodeValToRGB"); _ramp.color_ramp.elements[0].position = 0.15; _ramp.color_ramp.elements[0].color = (1, 1, 1, 1); _ramp.color_ramp.elements[1].position = 0.5; _ramp.color_ramp.elements[1].color = (0, 0, 0, 1)
_l(_tc.outputs["Object"], _vz.inputs["Vector"]); _l(_vz.outputs["Distance"], _ramp.inputs["Fac"])
_mul = _n.new("ShaderNodeMath"); _mul.operation = "MULTIPLY"; _mul.inputs[1].default_value = float(arg("--embers", "4.0"))
_l(_ramp.outputs["Color"], _mul.inputs[0]); _l(_mul.outputs["Value"], _b.inputs["Emission Strength"])
_b.inputs["Emission Color"].default_value = (1.0, 0.28, 0.04, 1); _b.inputs["Base Color"].default_value = (0.02, 0.015, 0.012, 1); _b.inputs["Roughness"].default_value = 0.9
for k in range(14):
    sphere("ember", tuple(P(gx - 4 + RNG.uniform(-4, 9), 13 + RNG.uniform(0, 3), gd + RNG.uniform(-18, 18))), M(RNG.uniform(1.6, 3.2)), EMBER, squash=(1, 1, 0.6))
BARK = scan("bark", "jolcham_oak_bark_01", size=0.3, tint=(0.5, 0.4, 0.32), bright=0.35, rough=(0.7, 0.95), bump=0.8)
CHAR = plain("char", (0.015, 0.012, 0.01), rough=0.9)
for (y, a, ln) in ((19, 0.15, 40), (24, -0.25, 36)):
    log = cylinder("log", 0, 0, -M(ln / 2), M(ln / 2), M(5.5), BARK, verts=20)
    log.rotation_euler = (math.pi / 2, 0, a); log.location = P(gx - 2, y, gd)
    for e in (-1, 1):
        sphere("charred end", tuple(P(gx - 2 + e * math.sin(a) * ln / 2, y, gd + e * math.cos(a) * ln / 2)), M(5.4), CHAR, squash=(1, 1, 1))
fire_l = lamp("embers", "POINT", tuple(P(gx - 8, 18, gd)), energy=float(arg("--fire", "6")), colour=(1.0, 0.36, 0.1), size=0.12)
# on the mantel: a clock, a pair of candlesticks (cold), a small plant
import_model("mantel_clock_01", height=M(27), at=tuple(P(WX - 7, 123, (fb["d0"] + fb["d1"]) / 2)), rot=-math.pi / 2)
import_model("brass_candleholders", height=M(24), at=tuple(P(WX - 7, 123, fb["d0"] - 30)), rot=-math.pi / 2)
import_model("potted_plant_04", height=M(26), at=tuple(P(WX - 7, 123, fb["d1"] + 30)), rot=0.4)
# over it, the cipher wheel on its walnut plaque
wh = WHEEL
box_cm("plaque", WX - 3, WX, wh["y"] - wh["plaque"], wh["y"] + wh["plaque"], wh["d"] - wh["plaque"], wh["d"] + wh["plaque"], WALNUT, 1.2)
box_cm("plaque bead", WX - 3.6, WX - 3, wh["y"] - wh["plaque"] + 3, wh["y"] + wh["plaque"] - 3, wh["d"] - wh["plaque"] + 3, wh["d"] + wh["plaque"] - 3, WALNUT, 0.8)
disc = lathe("cipher wheel", [(0, 0), (M(wh["r"]), 0), (M(wh["r"]) + 0.004, 0.006), (M(wh["r"]), 0.012), (0, 0.012)], BRASS, steps=96)
disc.rotation_euler = (0, -math.pi / 2, 0); disc.location = P(WX - 3.6, wh["y"], wh["d"])
face = bpy.data.meshes.new("cipher face"); bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); n = 96
c0 = bm.verts.new(tuple(P(WX - 4.85, wh["y"], wh["d"])))
ring = [bm.verts.new(tuple(P(WX - 4.85, wh["y"] + math.sin(2 * math.pi * k / n) * (wh["r"] - 0.3), wh["d"] - math.cos(2 * math.pi * k / n) * (wh["r"] - 0.3)))) for k in range(n)]
for k in range(n):
    f = bm.faces.new((c0, ring[k], ring[(k + 1) % n]))
    for lp in f.loops:
        co = lp.vert.co
        # (as one facing the wall sees it: further along d is to the left)
        lp[uvl].uv = (0.5 + (M(wh["d"]) - co.y) / M(2 * wh["r"]) * 0.98, 0.5 + (co.z - M(wh["y"])) / M(2 * wh["r"]) * 0.98)
bm.to_mesh(face); bm.free()
arch(link(bpy.data.objects.new("cipher face", face))).data.materials.append(CIPHER)
# pressed plants, framed, on the wall beyond the breast
for k, (d0, d1) in enumerate(((440, 482), (494, 536))):
    y0, y1 = 136, 136 + (d1 - d0) * 1.35
    for (a, b, c, e) in ((d0 - 3, d1 + 3, y0 - 3, y0), (d0 - 3, d1 + 3, y1, y1 + 3), (d0 - 3, d0, y0, y1), (d1, d1 + 3, y0, y1)):
        box_cm("frame", X1 - 2.5, X1, c, e, a, b, OAK_X if e - c < 10 else OAK, 0.4)
    arch(card("pressed plant", [P(X1 - 1, y0, d1), P(X1 - 1, y0, d0), P(X1 - 1, y1, d0), P(X1 - 1, y1, d1)], PRINT, uv=((0.05, 0.08, 0.38, 0.92), (0.62, 0.08, 0.95, 0.92))[k]))
# a picture, gilt-framed, on the wall nearer the door
darken_model(import_model("fancy_picture_frame_01", height=M(60), at=tuple(P(X1 - 3, 136, 212)), rot=-math.pi / 2), (0.42, 0.38, 0.32))
# a philodendron in a big pot by the end of the bookcase
import_model("potted_plant_02", height=M(118), at=tuple(P(wx0 - 30, 0, D1 - 52)), rot=0.6)
# the rug under it all
rug(-170, 170, 240, 500, rug_material("rug", f"{ASSETS}/textures/persian_rug.jpg", tint=(1.0, 0.5, 0.36), sat=1.1, value=0.42))

# ── light ──────────────────────────────────────────────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
# (the moon high over the garden, its light falling in steeply through the window)
lamp("the moon", "SUN", tuple(P(400, 1900, 2800)), aim=tuple(P(60, 0, 300)), energy=float(arg("--moon", "1.6")), colour=(0.55, 0.68, 1.0), angle=math.radians(1.5))
sky_l = lamp("sky through the window", "AREA", tuple(P(WIN["x"], 190, D1 + 14)), aim=tuple(P(WIN["x"] - 30, 60, 320)), energy=float(arg("--sky", "30")), colour=(0.5, 0.62, 0.95), size=1.0, size_y=1.8)
sky_l.visible_camera = False; sky_l.visible_transmission = False; sky_l.visible_glossy = False
fill_l = lamp("fill", "AREA", tuple(P(-150, 250, 40)), aim=tuple(P(80, 90, 420)), energy=float(arg("--fill", "55")), colour=(0.8, 0.85, 1.0), size=2.2)
fill_l.visible_camera = False; fill_l.visible_glossy = False
eye_fill(float(arg("--eyefill", "16")))                # (the halls' fill: nothing the eye sees falls to black)
shelf_l = lamp("bookcase glow", "AREA", tuple(P(-90, 280, D1 - 90)), aim=tuple(P(-90, 110, D1)), energy=float(arg("--shelf", "26")), colour=(1.0, 0.72, 0.45), size=2.2, size_y=0.3)
shelf_l.visible_camera = False; shelf_l.visible_glossy = False
side_l = lamp("fill on the right", "AREA", tuple(P(60, 250, 40)), aim=tuple(P(240, 150, 220)), energy=float(arg("--side", "18")), colour=(0.82, 0.86, 1.0), size=1.6)
side_l.visible_camera = False; side_l.visible_glossy = False
# (one light: the candle on the desk; the lamp is out, the fire dead)
ONE = Light("candle", [candle_l]); OUT_LIGHTS = [Light("lamp", [lamp_l], [SHADE]), Light("fire", [fire_l])]
_mul.inputs[1].default_value = 0.0                # (the fire in the grate dead too: only cold ash)
clear_glass()
air = room_haze(X0, X1, 0, D1, TOP, float(arg("--haze", "0")))

# ── what the game is told ──────────────────────────────────────────────────
LAYOUT.thing("binarytree", "Look into the glass case", corners(cx0 - 1.5, cx1 + 1.5, cy0, cy1 + 9, cd0 - 1.5, cd1 + 1.5))
LAYOUT.thing("plantpot", "Look out at the garden", [P(wx0, WIN["sill"], GD), P(wx1, WIN["sill"], GD), P(wx1, SPRING, GD), P(wx0, SPRING, GD)] +
             [P(WIN["x"] + math.cos(math.pi * i / 8) * WIN["hw"], SPRING + math.sin(math.pi * i / 8) * WIN["hw"], GD) for i in range(9)])
LAYOUT.thing("cryptex", "Look at the cipher wheel", corners(WX - 4, WX, wh["y"] - wh["plaque"], wh["y"] + wh["plaque"], wh["d"] - wh["plaque"], wh["d"] + wh["plaque"]))
LAYOUT.chest(CHEST, at=(DK["x"], 0, DK["d"]), turn=DK["turn"])
LAYOUT.glow("lamp", P(lx, ty + 34, ld), 150)
LAYOUT.flame("candle", CANDLE_AT)
LAYOUT.glow("candle", CANDLE_AT + Vector((0, 0, 0.02)), 46)
bpy.context.view_layer.update()
for leaf_root, x0_, x1_, hinge in ((left_leaf, wx0, WIN["x"], wx0), (right_leaf, WIN["x"], wx1, wx1)):
    mw = leaf_root.matrix_world
    LAYOUT.pane([mw @ P(x - hinge, y, 0) for x, y in ((x0_ + 4, WIN["sill"] + 8), (x1_ - 4, WIN["sill"] + 8), (x1_ - 4, SPRING - 5.5), (x0_ + 4, SPRING - 5.5))])
LAYOUT.pane([P(WIN["x"] + math.cos(math.pi * i / 24) * r_in, SPRING + math.sin(math.pi * i / 24) * r_in, GD) for i in range(25)])
# (the moonbeam: from the window's opening down to where it lies on the floor)
LAYOUT.dust([P(wx0, WIN["sill"], GD), P(wx1, SPRING + WIN["hw"], GD), P(51, 0, 459), P(117, 0, 204)])
LAYOUT.write()

# ── the passes ─────────────────────────────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "1.8")))
scene.cycles.volume_bounces = 1
GLOSSY = ()                # (what keeps its shine: glazes, screens, lamp glass)
finish(scene, SAMPLES, keep_gloss=GLOSSY)
plates = one_light(ONE, OUT_LIGHTS) if "plates" in ONLY else {}
passes(scene, OUT, set(plates), air, apart={"chest": CHEST_PARTS}, variants=plates)
if "chest" in ONLY:
    air.hide_render = True
    chest_sprites(scene, OUT, LAYOUT.data["chest"]["box"], chest_body, chest_hinge, lid_parts)
print("ROOM_DONE")
