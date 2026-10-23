# The first-floor hall of Ashcombe Manor, the chemist's, built in three
# dimensions and rendered with Cycles through the very camera the game draws
# its halls with (hall_common.py; levels/hall/hall.js layoutHall, `upper`).
#
# The same passage as the floor below, gone to the laboratory and left: white
# glazed tiles to the dado under a green band, old lime plaster above, a
# boarded ceiling, a floor of buff and black tiles; copper gas pipes along
# both walls under the ceiling. Four doors painted bottle green, frosted glass
# in their upper halves, their numerals gilt (VII, VIII on the left; IX, X on
# the right). Nearest on the right the way to the spiral stair going up to
# the floor above, the moon coming down it. Between the doors drawers and
# cabinets of the trade with their glass on them: a still, a balance, reagent
# bottles, shelves, a bookcase; at the end a blackboard with the chemist's
# working on it, over a long bench of apparatus, a roof light over that.
# One candle still burning in its sconce on the left. Hanging from the
# ceiling on a twisted flex, a bare bulb, wired across the ceiling and down
# the right-hand wall to a knife switch: the puzzle. This renders the hall
# with the bulb dark (`plate`) and lit (`lit`), and the switch's blades apart.
#
#   blender -b --factory-startup -P art/blender/hall_chem.py -- [--samples 384] [--width 2560] [--only plate,lit,doors,front,switch]

import bpy, bmesh, math, os, sys, random, json
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import *

OUT = os.path.abspath(arg("--output", os.path.join(ROOT, ".artifacts/hall-chem")))
os.makedirs(OUT, exist_ok=True)
DRAWN = os.path.join(ROOT, ".artifacts/chem")      # chem_boards.mjs
SAMPLES = int(arg("--samples", "384"))
WIDTH = int(arg("--width", "2560"))
ONLY = set(arg("--only", "plate,lit,doors,front,switch").split(","))
RNG = random.Random(1907)

# ── this floor's places in hall.js ─────────────────────────────────────────
DOORS = {-1: [1.25, 2.75], 1: [2.5, 3.6]}
NUMERALS = {-1: ["VII", "VIII"], 1: ["IX", "X"]}
SCONCES = {-1: [2.42, 3.95], 1: [3.15, 4.3]}
STAIR_Y0, STAIR_Y1, STAIR_H = 1.46 * D0, 1.91 * D0, 0.76 * HR * K   # the way up, in the right wall
SWITCH = Vector((WALL, 2.05 * D0, EYE - 0.06 * HR * K))              # the bulb's switch
ROSE = Vector((0, 1.9 * D0, CEIL))
BULB = Vector((0, 1.9 * D0, EYE + 0.3 * HR * K))
EYE_AT = Vector((0, 0, EYE))

scene, HEIGHT = stage(WIDTH)

# ── materials ──────────────────────────────────────────────────────────────
OAK = scan("oak", "dark_wood", size=1.2, tint=(0.78, 0.6, 0.44), bright=0.48, rough=(0.48, 0.76), bump=0.38, coat=0.0, upright=True, dirt=0.2, grime=0.12)
OAK_X = scan("oak across", "dark_wood", size=1.2, tint=(0.78, 0.6, 0.44), bright=0.46, rough=(0.48, 0.76), bump=0.38, coat=0.0, dirt=0.2, grime=0.12)
FLOOR = scan("tiled floor", "checkered_pavement_tiles", size=3.0, tint=(0.98, 0.91, 0.8), bright=0.58, rough=(0.46, 0.78), bump=0.52, coat=0.0, dirt=0.22, grime=0.14)
TILES = scan("white tiles", "long_white_tiles", size=1.75, tint=(0.95, 0.96, 0.92), bright=0.78, sat=0.6, rough=(0.14, 0.36), bump=0.5, coat=0.35, rot=(math.pi / 2, 0, 0), dirt=0.18, grime=0.12)
TILES_END = scan("white tiles, end", "long_white_tiles", size=1.75, tint=(0.95, 0.96, 0.92), bright=0.78, sat=0.6, rough=(0.14, 0.36), bump=0.5, coat=0.35, rot=(0, math.pi / 2, 0), dirt=0.18, grime=0.12)
PLASTER = scan("lime plaster", "white_plaster_rough_01", size=2.5, tint=(0.94, 0.95, 0.91), bright=0.76, sat=0.45, rough=(0.8, 0.95), bump=0.55, dirt=0.22, stains=0.15, grime=0.12)
CEILING = scan("ceiling boards", "dark_wooden_planks", size=2.2, tint=(0.8, 0.7, 0.6), bright=0.5, rough=(0.55, 0.85), bump=0.45, dirt=0.22)
SLATE = scan("slate", "slate_driveway", size=1.0, bright=0.32, sat=0.3, rough=(0.48, 0.72), bump=0.38, coat=0.0, dirt=0.2)
GREEN_GLAZE = plain("green glaze", (0.025, 0.075, 0.05), rough=0.12, coat=0.8)
BLACK_GLAZE = plain("black glaze", (0.012, 0.012, 0.012), rough=0.15, coat=0.8)
BRASS = aged_metal("brass", (0.52, 0.37, 0.17), (0.07, 0.05, 0.025), rough=(0.25, 0.55), scale=30, tarnish=0.65)
COPPER = aged_metal("copper", (0.58, 0.29, 0.15), (0.05, 0.08, 0.06), rough=(0.25, 0.55), scale=14, tarnish=0.7)
STAIR_IRON = aged_metal("painted iron", (0.16, 0.16, 0.15), (0.05, 0.035, 0.025), rough=(0.4, 0.7), scale=16, tarnish=0.5)
CAST_IRON = aged_metal("cast iron", (0.07, 0.07, 0.07), (0.035, 0.022, 0.015), rough=(0.45, 0.8), scale=20, tarnish=0.6)
IRON = plain("iron", (0.02, 0.02, 0.02), rough=0.45, metal=0.8)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
FROSTED = plain("frosted glass", (0.86, 0.9, 0.88), rough=0.32, transmission=1.0, ior=1.5)
AMBER = plain("amber glass", (0.62, 0.3, 0.07), rough=0.04, transmission=1.0, ior=1.5)
COBALT = plain("cobalt glass", (0.12, 0.22, 0.62), rough=0.04, transmission=1.0, ior=1.5)
BOTTLE_GREEN = plain("green glass", (0.3, 0.5, 0.32), rough=0.04, transmission=1.0, ior=1.5)
BAKELITE = plain("bakelite", (0.035, 0.018, 0.01), rough=0.25, coat=0.5)
PORCELAIN = plain("porcelain", (0.8, 0.79, 0.74), rough=0.15, coat=0.6)
WAX = bpy.data.materials.new("wax"); WAX.use_nodes = True
_w = WAX.node_tree.nodes["Principled BSDF"]; _w.inputs["Base Color"].default_value = (0.38, 0.31, 0.21, 1); _w.inputs["Subsurface Weight"].default_value = 0.22; _w.inputs["Subsurface Radius"].default_value = (0.012, 0.007, 0.003); _w.inputs["Roughness"].default_value = 0.52
WICK = plain("wick", (0.01, 0.01, 0.01), rough=0.9)
FLAME = plain("candle flame", (1.0, 0.62, 0.22), emit=(1.0, 0.56, 0.18), strength=14.0)
CHALK = plain("chalk", (0.85, 0.85, 0.82), rough=0.95)
FELT = plain("felt", (0.05, 0.045, 0.04), rough=1.0, sheen=0.6)
CORK = plain("cork", (0.32, 0.2, 0.1), rough=0.9)
WICKER = plain("wicker", (0.22, 0.13, 0.06), rough=0.85)
SOOT = plain("soot", (0.01, 0.009, 0.008), rough=1.0)
def liquid(name, colour):
    return plain(name, colour, rough=0.02, transmission=1.0, ior=1.34)
LIQUIDS = [liquid("blue vitriol", (0.12, 0.35, 0.75)), liquid("tincture", (0.7, 0.42, 0.06)), liquid("green salts", (0.2, 0.5, 0.2)),
           liquid("water", (0.92, 0.95, 0.96)), liquid("permanganate", (0.35, 0.02, 0.28)), liquid("cochineal", (0.6, 0.05, 0.05))]

def paint(name, colour, under=(0.06, 0.035, 0.02)):
    """paint on wood, worn through to the wood at every edge and chipped
    across its face, gone dull with grime in the corners"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    bev = N.new("ShaderNodeBevel"); bev.inputs["Radius"].default_value = 0.008
    geo = N.new("ShaderNodeNewGeometry")
    dot = N.new("ShaderNodeVectorMath"); dot.operation = "DOT_PRODUCT"
    Lk(bev.outputs["Normal"], dot.inputs[0]); Lk(geo.outputs["Normal"], dot.inputs[1])
    edge = N.new("ShaderNodeMapRange"); edge.inputs["From Min"].default_value = 0.985; edge.inputs["From Max"].default_value = 0.9
    Lk(dot.outputs["Value"], edge.inputs["Value"])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 24; nz.inputs["Detail"].default_value = 10; nz.inputs["Roughness"].default_value = 0.7
    Lk(tc.outputs["Object"], nz.inputs["Vector"])
    rub = N.new("ShaderNodeMath"); rub.operation = "MULTIPLY"; Lk(edge.outputs["Result"], rub.inputs[0])
    rn = N.new("ShaderNodeMapRange"); rn.inputs["From Min"].default_value = 0.4; rn.inputs["From Max"].default_value = 0.6
    Lk(nz.outputs["Fac"], rn.inputs["Value"]); Lk(rn.outputs["Result"], rub.inputs[1])
    chip = N.new("ShaderNodeMapRange"); chip.inputs["From Min"].default_value = 0.66; chip.inputs["From Max"].default_value = 0.7
    Lk(nz.outputs["Fac"], chip.inputs["Value"])
    worn = N.new("ShaderNodeMath"); worn.operation = "MAXIMUM"; Lk(rub.outputs["Value"], worn.inputs[0]); Lk(chip.outputs["Result"], worn.inputs[1])
    var = N.new("ShaderNodeTexNoise"); var.inputs["Scale"].default_value = 3; Lk(tc.outputs["Object"], var.inputs["Vector"])
    shade = N.new("ShaderNodeValToRGB"); shade.color_ramp.elements[0].color = (colour[0] * 0.7, colour[1] * 0.7, colour[2] * 0.7, 1); shade.color_ramp.elements[1].color = (*colour, 1)
    Lk(var.outputs["Fac"], shade.inputs["Fac"])
    mx = N.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.inputs[7].default_value = (*under, 1)
    Lk(worn.outputs["Value"], mx.inputs["Factor"]); Lk(shade.outputs["Color"], mx.inputs[6])
    ao = N.new("ShaderNodeAmbientOcclusion"); ao.inputs["Distance"].default_value = 0.15
    ar = N.new("ShaderNodeValToRGB"); ar.color_ramp.elements[0].color = (0.4, 0.38, 0.35, 1); Lk(ao.outputs["AO"], ar.inputs["Fac"])
    am = N.new("ShaderNodeMix"); am.data_type = "RGBA"; am.blend_type = "MULTIPLY"; am.inputs["Factor"].default_value = 1
    Lk(mx.outputs[2], am.inputs[6]); Lk(ar.outputs["Color"], am.inputs[7]); Lk(am.outputs[2], b.inputs["Base Color"])
    rr = N.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.36; rr.inputs["To Max"].default_value = 0.62
    Lk(worn.outputs["Value"], rr.inputs["Value"]); Lk(rr.outputs["Result"], b.inputs["Roughness"])
    return m
PAINT = paint("bottle green paint", (0.03, 0.075, 0.05))
CREAM = paint("cream paint", (0.5, 0.47, 0.38))

def picture(name, path, rough=0.85, coat=0.0):
    """an image printed on a card (by its UVs)"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; b = N["Principled BSDF"]
    ti = N.new("ShaderNodeTexImage"); ti.image = bpy.data.images.load(path, check_existing=True)
    m.node_tree.links.new(ti.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough; b.inputs["Coat Weight"].default_value = coat
    return m
BOARD = picture("blackboard", os.path.join(DRAWN, "blackboard.png"), rough=0.9)
ELEMENTS = picture("table of the elements", os.path.join(DRAWN, "elements.png"))
APPARATUS = picture("chart of apparatus", os.path.join(DRAWN, "apparatus.png"))
GAUGE = picture("gauge dial", os.path.join(DRAWN, "gauge.png"), rough=0.3, coat=0.4)
LABELS = picture("labels", os.path.join(DRAWN, "labels.png"), rough=0.8)

# ── shapes this floor needs ────────────────────────────────────────────────
def card(name, corners, mat, uv=(0, 0, 1, 1)):
    """a flat quad, lower left first as one facing it sees it, an image on it"""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); layer = bm.loops.layers.uv.new()
    f = bm.faces.new([bm.verts.new(c) for c in corners])
    u0, v0, u1, v1 = uv
    for lp, (u, v) in zip(f.loops, ((u0, v0), (u1, v0), (u1, v1), (u0, v1))): lp[layer].uv = (u, v)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    return o
def on_wall(side, y0, y1, z0, z1, off):
    """a rectangle on a side wall, `off` out from it, lower left first as one
    in the hall sees it"""
    x = side * (WALL - off)
    if side < 0: return [(x, y0, z0), (x, y1, z0), (x, y1, z1), (x, y0, z1)]
    return [(x, y1, z0), (x, y0, z0), (x, y0, z1), (x, y1, z1)]
def wire(name, pts, r, mat):
    """a rod or a cable through `pts`, in three dimensions"""
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = r; cu.bevel_resolution = 3; cu.use_fill_caps = True
    sp = cu.splines.new("POLY"); sp.points.add(len(pts) - 1)
    for p, v in zip(sp.points, pts): p.co = (v[0], v[1], v[2], 1)
    o = link(bpy.data.objects.new(name, cu)); o.data.materials.append(mat)
    return o
def flex(name, path, mat, r=0.0028, apart=0.0032, pitch=0.035):
    """two cotton-covered cords twisted together along `path`"""
    path = [Vector(p) for p in path]; samples = []; run = 0.0
    for i, (a, b) in enumerate(zip(path, path[1:])):
        d = b - a; n = max(2, int(d.length / 0.006)); u = d.normalized()
        p = u.orthogonal().normalized(); q = u.cross(p)
        for k in range(n + (1 if i == len(path) - 2 else 0)):
            samples.append((a + d * (k / n), run + d.length * k / n, p, q))
        run += d.length
    for twist in (0, math.pi):
        wire(name, [at_ + (p * math.cos(s_ / pitch * math.tau + twist) + q * math.sin(s_ / pitch * math.tau + twist)) * apart * 0.5 for at_, s_, p, q in samples], r, mat)
def knob(name, at, r, length, mat, turn=(math.pi / 2, 0, 0)):
    """a short cylinder, turned to stand out of a face"""
    o = cylinder(name, 0, 0, -length / 2, length / 2, r, mat, verts=16); o.rotation_euler = turn; o.location = at
    return o
def rod(name, a, b, r, mat, verts=16):
    """a cylinder from `a` to `b`"""
    a, b = Vector(a), Vector(b); L_ = (b - a).length
    o = cylinder(name, 0, 0, 0, L_, r, mat, verts=verts); o.location = a
    o.rotation_euler = (b - a).to_track_quat("Z", "Y").to_euler()
    return o
def wedge(name, centre, z0, z1, ri, ro, a0, a1, mat, n=8):
    """a stair's tread: a sector of a ring, `z0`–`z1` thick"""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    arc = lambda r: [(centre.x + math.cos(a0 + (a1 - a0) * i / n) * r, centre.y + math.sin(a0 + (a1 - a0) * i / n) * r) for i in range(n + 1)]
    ring = arc(ri) + list(reversed(arc(ro)))
    bottom = [bm.verts.new((x, y, z0)) for x, y in ring]; top = [bm.verts.new((x, y, z1)) for x, y in ring]
    bm.faces.new(list(reversed(bottom))); bm.faces.new(top)
    for i in range(len(ring)):
        j = (i + 1) % len(ring); bm.faces.new((bottom[i], bottom[j], top[j], top[i]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    return o

def radius_at(outer, z):
    for (r0, z0), (r1, z1) in zip(outer, outer[1:]):
        if z0 <= z <= z1 and z1 > z0: return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    return outer[-1][0]
def vessel(name, outer, glass, at, liquid=None, level=0.0, t=0.0016, steps=40):
    """a vessel of glass turned from its outside [(radius, height)], foot to
    lip, hollow, its walls `t` thick; a liquid in it to `level`"""
    inner = [(max(r - t, 0.0008), max(z, t)) for r, z in reversed(outer)]
    o = lathe(name, [(0, 0)] + outer + inner + [(0, t)], glass, at=at, steps=steps)
    if liquid and level > t * 2:
        rim = lambda z: max(radius_at(outer, z) - t - 0.0004, 0.0006)
        pts = [(rim(z), z) for r, z in outer if t * 1.5 < z < level]
        wet = lathe(name + " liquid", [(0, t * 1.5), (rim(t * 1.5), t * 1.5)] + pts + [(rim(level), level), (0, level)], liquid, steps=steps)
        wet.parent = o
    return o
def label(at, r, z0, z1, facing, cell, span=1.6):
    """a paper label round a bottle, facing `facing` (an angle), one of the
    eight in labels.png"""
    me = bpy.data.meshes.new("label"); bm = bmesh.new(); layer = bm.loops.layers.uv.new()
    n = 10; u0, v0 = (cell % 4) / 4, 1 - (cell // 4 + 1) / 2
    cols = []
    for i in range(n + 1):
        a = facing - span / 2 + span * i / n
        cols.append((bm.verts.new((at[0] + math.cos(a) * r, at[1] + math.sin(a) * r, at[2] + z0)), bm.verts.new((at[0] + math.cos(a) * r, at[1] + math.sin(a) * r, at[2] + z1))))
    for i in range(n):
        f = bm.faces.new((cols[i][0], cols[i + 1][0], cols[i + 1][1], cols[i][1]))
        for lp, (u, v) in zip(f.loops, ((i / n, 0), ((i + 1) / n, 0), ((i + 1) / n, 1), (i / n, 1))): lp[layer].uv = (u0 + u / 4, v0 + v / 2)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("label", me)); o.data.materials.append(LABELS)
    for p in o.data.polygons: p.use_smooth = True
    return o
def toward_eye(x, y, jitter=0.35):
    return math.atan2(EYE_AT.y - y, EYE_AT.x - x) + RNG.uniform(-jitter, jitter)

# the glass of the trade, each from its outside's profile
def bottle(x, y, z, k=1.0, glass=None, cell=None, fill=None, wide=False):
    """a reagent bottle, stoppered, its label towards the room"""
    glass = glass or RNG.choice((AMBER, AMBER, BOTTLE_GREEN, COBALT, GLASS))
    if wide: outer = [(0.04, 0), (0.042, 0.005), (0.042, 0.1), (0.036, 0.11), (0.03, 0.113), (0.03, 0.125)]
    else: outer = [(0.032, 0), (0.034, 0.004), (0.034, 0.09), (0.03, 0.105), (0.018, 0.118), (0.012, 0.124), (0.012, 0.14), (0.014, 0.142)]
    outer = [(r * k, h * k) for r, h in outer]
    vessel("bottle", outer, glass, (x, y, z), liquid=fill or RNG.choice(LIQUIDS), level=outer[-1][1] * RNG.uniform(0.25, 0.75))
    top = outer[-1][1]
    if wide: cylinder("cork", x, y, z + top - 0.012 * k, z + top + 0.006 * k, 0.029 * k, CORK, verts=24)
    else: lathe("stopper", [(0, 0), (0.011 * k, 0), (0.011 * k, 0.012 * k), (0.016 * k, 0.016 * k), (0.016 * k, 0.024 * k), (0, 0.03 * k)], glass, at=(x, y, z + top - 0.012 * k), steps=24)
    if cell is not None: label((x, y, z), outer[2][0] + 0.0006, 0.03 * k, 0.07 * k, toward_eye(x, y), cell)
def flask(x, y, z, R=0.06, fill=None, level=0.5):
    """a round-bottomed flask, stood on its flattened foot"""
    outer = [(0.3 * R, 0)] + [(R * math.sin(math.radians(t)), R * (1 - math.cos(math.radians(t)))) for t in range(25, 170, 12)]
    neck = outer[-1][1]
    outer += [(0.2 * R, neck + 0.01), (0.2 * R, neck + 1.6 * R), (0.24 * R, neck + 1.62 * R)]
    vessel("flask", outer, GLASS, (x, y, z), liquid=fill or RNG.choice(LIQUIDS), level=2 * R * level)
    return z + neck + 1.62 * R
def conical(x, y, z, k=1.0, fill=None):
    outer = [(r * k, h * k) for r, h in [(0.045, 0), (0.048, 0.004), (0.048, 0.008), (0.016, 0.11), (0.016, 0.15), (0.019, 0.152)]]
    vessel("conical flask", outer, GLASS, (x, y, z), liquid=fill or RNG.choice(LIQUIDS), level=0.05 * k)
def beaker(x, y, z, k=1.0, fill=None):
    outer = [(r * k, h * k) for r, h in [(0.035, 0), (0.037, 0.003), (0.037, 0.09), (0.039, 0.093)]]
    vessel("beaker", outer, GLASS, (x, y, z), liquid=fill or RNG.choice(LIQUIDS), level=RNG.uniform(0.02, 0.06) * k)
def test_tube(x, y, z, fill=None, lie=None):
    outer = [(0.0025, 0), (0.0065, 0.0025), (0.0085, 0.009), (0.0085, 0.15), (0.0095, 0.152)]
    o = vessel("test tube", outer, GLASS, (x, y, z), liquid=fill or RNG.choice(LIQUIDS), level=RNG.uniform(0.03, 0.09), t=0.0009, steps=24)
    return o

# ── the floor ──────────────────────────────────────────────────────────────
arch(box("floor", -WALL - 0.3, WALL + 0.3, Y0 - 1, END + 0.3, -0.05, 0, FLOOR))

# ── the side walls: plaster over white tiles, a green band, black skirting ─
DADO = 1.15
ARCHI = 0.1          # an architrave's width
def openings(side):
    """where a side wall is open: its doors; on the right the way to the stair"""
    ops = [(zd * D0, zd * D0 + DOOR_LEN, DOOR_H) for zd in DOORS[side]]
    if side > 0: ops.append((STAIR_Y0, STAIR_Y1, STAIR_H))
    return sorted(ops)
def along(side, a, b, z0, z1, proud, mat, r=0.0):
    X = side * WALL; xa, xb = sorted((X, X - side * proud))
    return slab(xa, xb, a, b, z0, z1, mat, r)
def side_wall(side):
    X = side * WALL; xa, xb = sorted((X, X + side * 0.25))
    w = arch(box("wall", xa, xb, Y0 - 1, END + 0.3, 0, CEIL, PLASTER))
    for y0, y1, h in openings(side):
        boolean_cut(w, box("cut", xa - 0.1, xb + 0.1, y0, y1, -0.1, h, IRON))
    spans, y = [], Y0 - 1
    for y0, y1, h in openings(side):
        spans.append((y, y0 - ARCHI)); y = y1 + ARCHI
    spans.append((y, END))
    for a, b in spans:
        along(side, a, b, 0.15, DADO, 0.012, TILES)
        along(side, a, b, 0, 0.15, 0.018, BLACK_GLAZE, 0.006)
        along(side, a, b, DADO, DADO + 0.06, 0.024, GREEN_GLAZE, 0.012)
    along(side, Y0 - 1, END, 2.55, 2.6, 0.028, PAINT, 0.008)               # picture rail
    along(side, Y0 - 1, END, CEIL - 0.12, CEIL, 0.07, PLASTER, 0.02)       # cornice
    along(side, Y0 - 1, END, CEIL - 0.17, CEIL - 0.12, 0.035, PLASTER, 0.01)
    # the architraves round the openings, and their linings
    for y0, y1, h in openings(side):
        for (a, b, c, d_) in ((y0 - ARCHI, y0, 0, h + ARCHI), (y1, y1 + ARCHI, 0, h + ARCHI), (y0 - ARCHI, y1 + ARCHI, h, h + ARCHI)):
            along(side, a, b, c, d_, 0.03, PAINT, 0.01)
            along(side, a + 0.025, b - 0.025, c + (0.025 if c == h else 0), d_ - 0.025, 0.042, PAINT, 0.008)
        ya, yb = sorted((X, X + side * 0.25))
        slab(ya, yb, y0 - 0.003, y0, 0, h, PAINT, 0); slab(ya, yb, y1, y1 + 0.003, 0, h, PAINT, 0); slab(ya, yb, y0, y1, h, h + 0.003, PAINT, 0)
for side in (-1, 1): side_wall(side)

# ── the doors: bottle green, frosted glass above, panels below ─────────────
GILT = aged_metal("gilt", (0.62, 0.46, 0.2), (0.12, 0.08, 0.03), rough=(0.2, 0.45), scale=40, tarnish=0.4)
ROOM = plain("room behind", (0.05, 0.05, 0.05), rough=0.9)
def lab_door(side, zd, numeral):
    y0, y1 = zd * D0, zd * D0 + DOOR_LEN
    X = side * WALL; face = X + side * 0.07; H_ = DOOR_H; ym = (y0 + y1) / 2
    def piece(a, b, c, d_, depth0, depth1, mat, r=0.004):
        xa, xb = sorted((face - side * depth0, face - side * depth1))
        return slab(xa, xb, a, b, c, d_, mat, r)
    S, BR, LR0, LR1, TR = 0.11, 0.22, 0.96, 1.1, 0.17
    for a, b in ((y0, y0 + S), (y1 - S, y1)): piece(a, b, 0, H_, 0, 0.045, PAINT)                 # stiles
    for c, d_ in ((0, BR), (LR0, LR1), (H_ - TR, H_)): piece(y0 + S, y1 - S, c, d_, 0, 0.045, PAINT)  # rails
    piece(ym - 0.045, ym + 0.045, BR, LR0, 0, 0.045, PAINT)                                       # muntin
    piece(ym - 0.018, ym + 0.018, LR1, H_ - TR, 0.006, 0.04, PAINT, 0.003)                         # glazing bar
    # the panels below, fielded
    for a, b in ((y0 + S, ym - 0.045), (ym + 0.045, y1 - S)):
        piece(a, b, BR, LR0, 0.01, 0.03, PAINT, 0)
        piece(a + 0.04, b - 0.04, BR + 0.04, LR0 - 0.04, 0.006, 0.036, PAINT, 0.016)
        for (c0, c1, d0, d1) in ((a, b, BR, BR + 0.014), (a, b, LR0 - 0.014, LR0), (a, a + 0.014, BR, LR0), (b - 0.014, b, BR, LR0)):
            piece(c0, c1, d0, d1, 0.012, 0.04, PAINT, 0.003)
    # the glass above, frosted, in its beads
    for a, b in ((y0 + S, ym - 0.018), (ym + 0.018, y1 - S)):
        piece(a, b, LR1, H_ - TR, 0.019, 0.024, FROSTED, 0)
        for (c0, c1, d0, d1) in ((a, b, LR1, LR1 + 0.014), (a, b, H_ - TR - 0.014, H_ - TR), (a, a + 0.014, LR1, H_ - TR), (b - 0.014, b, LR1, H_ - TR)):
            piece(c0, c1, d0, d1, 0.024, 0.038, PAINT, 0.003)
    # the numeral, gilt, on the top rail
    t = bpy.data.curves.new("numeral", "FONT"); t.body = numeral
    try: t.font = bpy.data.fonts.load("C:/Windows/Fonts/georgiab.ttf")
    except Exception: pass
    t.size = 0.1; t.align_x = "CENTER"; t.align_y = "CENTER"; t.extrude = 0.003
    num = arch(link(bpy.data.objects.new("numeral", t))); num.data.materials.append(GILT)
    num.rotation_euler = (math.pi / 2, 0, -side * math.pi / 2); num.location = (face - side * 0.047, ym, H_ - TR / 2)
    # the knob, its rose, the keyhole's escutcheon (all part of the door: they swing with it)
    ky = y1 - 0.065
    arch(sphere("knob", (face - side * 0.075, ky, 1.02), 0.028, BRASS))
    k1 = cylinder("rose", 0, 0, -0.005, 0.005, 0.032, BRASS); k1.rotation_euler = (0, math.pi / 2, 0); k1.location = (face - side * 0.05, ky, 1.02)
    k2 = cylinder("shank", 0, 0, -0.02, 0.02, 0.008, BRASS); k2.rotation_euler = (0, math.pi / 2, 0); k2.location = (face - side * 0.06, ky, 1.02)
    es = slab(*sorted((face - side * 0.045, face - side * 0.05)), ky - 0.016, ky + 0.016, 0.88, 0.95, BRASS, 0.004)
    arch(k1); arch(k2)
    # the room behind, dark; the moon in its window, seen through the glass
    rx0, rx1 = sorted((X + side * 0.25, X + side * 3.0))
    m = 0.22
    for (a, b, c, d_, e, f) in ((rx0, rx1, y0 - m, y1 + m, -0.02, 0), (rx0, rx1, y0 - m, y1 + m, 2.8, 2.82),
                                (rx0, rx1, y0 - m - 0.02, y0 - m, 0, 2.8), (rx0, rx1, y1 + m, y1 + m + 0.02, 0, 2.8)):
        arch(box("room", a, b, c, d_, e, f, ROOM))
    far = X + side * 3.0
    arch(box("room", *sorted((far, far + side * 0.02)), y0 - m, y1 + m, 0, 2.8, ROOM))
    lamp("moon in the room", "AREA", (X + side * 2.4, ym + 0.3, 2.2), aim=(X + side * 0.3, ym, 1.4), energy=float(arg("--rooms", "6")), colour=(0.55, 0.68, 1.0), size=0.8)
for side in (-1, 1):
    for i, zd in enumerate(DOORS[side]):
        lab_door(side, zd, NUMERALS[side][i])

# ── the ceiling: boards, beams across, a roof light toward the end ─────────
LY0, LY1, LX = 7.5, 8.7, 0.85
ceil = arch(box("ceiling", -WALL - 0.3, WALL + 0.3, Y0 - 1, END + 0.3, CEIL, CEIL + 0.15, CEILING))
boolean_cut(ceil, box("cut", -LX, LX, LY0, LY1, CEIL - 0.1, CEIL + 0.5, IRON))
for y in (2.4, 5.1, 6.4):
    slab(-WALL, WALL, y, y + 0.16, CEIL - 0.2, CEIL, OAK_X, 0.01)
# the roof light's well, its frame and glazing bars, the night over it
for (a, b, c, d_) in ((-LX - 0.05, LX + 0.05, LY0 - 0.05, LY0), (-LX - 0.05, LX + 0.05, LY1, LY1 + 0.05), (-LX - 0.05, -LX, LY0, LY1), (LX, LX + 0.05, LY0, LY1)):
    slab(a, b, c, d_, CEIL - 0.04, CEIL + 0.7, PLASTER, 0.01)
for k in range(5):
    x = -LX + k * (2 * LX) / 4
    arch(box("glazing bar", x - 0.012, x + 0.012, LY0, LY1, CEIL + 0.62, CEIL + 0.66, IRON))
DUSTY = plain("dusty glass", (0.8, 0.82, 0.8), rough=0.18, transmission=1.0, ior=1.5)
arch(box("roof glass", -LX, LX, LY0, LY1, CEIL + 0.655, CEIL + 0.66, DUSTY))
sky = bpy.data.materials.new("night sky"); sky.use_nodes = True
sn = sky.node_tree.nodes; sn.remove(sn["Principled BSDF"]); em = sn.new("ShaderNodeEmission")
em.inputs["Color"].default_value = (0.02, 0.04, 0.1, 1); em.inputs["Strength"].default_value = 1.0
sky.node_tree.links.new(em.outputs["Emission"], sn["Material Output"].inputs["Surface"])
arch(box("night", -2, 2, LY0 - 2, LY1 + 2, CEIL + 4.0, CEIL + 4.1, sky)).visible_shadow = False   # (seen, not in the moon's way)

# ── the end wall: plaster, the tiles, the blackboard ───────────────────────
arch(box("end wall", -WALL - 0.3, WALL + 0.3, END, END + 0.3, 0, CEIL, PLASTER))
slab(-WALL, WALL, END - 0.012, END, 0.15, DADO, TILES_END, 0)
slab(-WALL, WALL, END - 0.018, END, 0, 0.15, BLACK_GLAZE, 0.006)
slab(-WALL, WALL, END - 0.024, END, DADO, DADO + 0.06, GREEN_GLAZE, 0.012)
slab(-WALL, WALL, END - 0.028, END, 2.55, 2.6, PAINT, 0.008)
slab(-WALL, WALL, END - 0.07, END, CEIL - 0.12, CEIL, PLASTER, 0.02)
BX0, BX1, BZ0, BZ1 = -0.6 * WALL, 0.6 * WALL, EYE - 0.19 * HR * K, EYE + 0.56 * HR * K
FW = 0.07
for (a, b, c, d_) in ((BX0 - FW, BX1 + FW, BZ0 - FW, BZ0), (BX0 - FW, BX1 + FW, BZ1, BZ1 + FW), (BX0 - FW, BX0, BZ0, BZ1), (BX1, BX1 + FW, BZ0, BZ1)):
    slab(a, b, END - 0.05, END, c, d_, OAK_X if d_ - c < 0.2 else OAK, 0.012)
arch(card("blackboard", [(BX0, END - 0.03, BZ0), (BX1, END - 0.03, BZ0), (BX1, END - 0.03, BZ1), (BX0, END - 0.03, BZ1)], BOARD))
# the tray at its foot: the chalk, a stub, the duster
slab(BX0 - FW - 0.03, BX1 + FW + 0.03, END - 0.11, END - 0.03, BZ0 - FW - 0.02, BZ0 - FW + 0.005, OAK_X, 0.006)
for (x, L_) in ((-1.2, 0.08), (-1.08, 0.05), (-0.9, 0.025)):
    rod("chalk", (x, END - 0.07, BZ0 - FW + 0.012), (x + L_, END - 0.075, BZ0 - FW + 0.012), 0.006, CHALK)
slab(0.7, 0.86, END - 0.1, END - 0.05, BZ0 - FW + 0.005, BZ0 - FW + 0.03, OAK, 0.006, keep=False)
slab(0.7, 0.86, END - 0.1, END - 0.05, BZ0 - FW + 0.005, BZ0 - FW + 0.012, FELT, 0.003, keep=False)

# ── the spiral stair, beyond the opening in the right wall ─────────────────
SC = Vector((WALL + 1.3, (STAIR_Y0 + STAIR_Y1) / 2 + 0.1, 0))
SWX0, SWX1, SWY0, SWY1 = WALL + 0.25, WALL + 2.5, SC.y - 1.0, SC.y + 1.0
for (a, b, c, d_, e, f) in ((SWX0, SWX1, SWY0, SWY1, -0.05, 0), (SWX1, SWX1 + 0.2, SWY0, SWY1, 0, 7.5),
                            (SWX0, SWX1 + 0.2, SWY0 - 0.2, SWY0, 0, 7.5), (SWX0, SWX1 + 0.2, SWY1, SWY1 + 0.2, 0, 7.5), (SWX0, SWX1 + 0.2, SWY0 - 0.2, SWY1 + 0.2, 7.5, 7.6)):
    arch(box("stairwell", a, b, c, d_, e, f, FLOOR if f <= 0 else PLASTER))
# its window, tall in the far wall, the moon in it
win = [o for o in ARCH if o.name.startswith("stairwell")][1]
WZ0, WZ1 = 0.9, 4.6
boolean_cut(win, box("cut", SWX1 - 0.1, SWX1 + 0.4, SC.y - 0.45, SC.y + 0.45, WZ0, WZ1, IRON))
for k in range(3):
    arch(box("window bar", SWX1 + 0.08, SWX1 + 0.11, SC.y - 0.45 + k * 0.45 - 0.012, SC.y - 0.45 + k * 0.45 + 0.012, WZ0, WZ1, IRON))
for k in range(1, 6):
    arch(box("window bar", SWX1 + 0.08, SWX1 + 0.11, SC.y - 0.45, SC.y + 0.45, WZ0 + k * (WZ1 - WZ0) / 6 - 0.01, WZ0 + k * (WZ1 - WZ0) / 6 + 0.01, IRON))
arch(box("sill", SWX1 - 0.12, SWX1 + 0.1, SC.y - 0.5, SC.y + 0.5, WZ0 - 0.04, WZ0, PLASTER))
arch(box("window glass", SWX1 + 0.09, SWX1 + 0.095, SC.y - 0.45, SC.y + 0.45, WZ0, WZ1, DUSTY))
arch(box("night", SWX1 + 3, SWX1 + 3.1, SC.y - 4, SC.y + 4, 0, 10, sky)).visible_shadow = False
arch(cylinder("newel", SC.x, SC.y, 0, 7.4, 0.055, STAIR_IRON, verts=24))
STEP_A, RISE_S = math.radians(20), 0.19
for k in range(34):
    a = math.pi - k * STEP_A; z = RISE_S * (k + 1)
    t = arch(wedge("tread", SC, z - 0.03, z, 0.05, 0.95, a - STEP_A * 0.62, a + STEP_A * 0.62, STAIR_IRON)); bevel(t, 0.004, 1)
    arch(cylinder("collar", SC.x, SC.y, z - 0.06, z, 0.07, STAIR_IRON, verts=24))
    for f in (0.0, 0.5):
        b = a + STEP_A * (f - 0.25)
        arch(cylinder("baluster", SC.x + math.cos(b) * 0.9, SC.y + math.sin(b) * 0.9, z, z + 0.88, 0.008, STAIR_IRON, verts=8))
rail = [(SC.x + math.cos(math.pi - s * STEP_A / 4) * 0.9, SC.y + math.sin(math.pi - s * STEP_A / 4) * 0.9, RISE_S * (s / 4 + 1) + 0.88) for s in range(0, 34 * 4)]
arch(wire("handrail", rail, 0.018, OAK))

# ── the bulb's switch, on the right wall: a knife switch on a slate panel ──
# A double-pole knife switch of the kind a laboratory wired its own lights
# with: an oak board, a slate panel on it, a porcelain base on that; two
# copper blades hinged at its foot that go up into spring jaws at its head,
# an ebonite handle across them; soot over the jaws, where it has arced. The
# blades are the game's: rendered apart, at every angle they swing through.
SY, SZ = SWITCH.y, SWITCH.z
KS = 1.3                                              # a main switch, a little over the common size
FACE = WALL - 0.054 * KS                              # the porcelain's face, 12 mm proud of the slate
XH, ZH, ZJ = FACE - 0.03 * KS, SZ - 0.075 * KS, SZ + 0.085 * KS   # the hinges' axis; the jaws
BLADE_L = ZJ - ZH + 0.014 * KS
OPEN = math.radians(72)                               # how far the blades fall open, at rest
POLES = (SY - 0.03 * KS, SY + 0.03 * KS)
EBONITE = plain("ebonite", (0.012, 0.01, 0.009), rough=0.3, coat=0.4)
BLADE_COPPER = aged_metal("blade copper", (0.78, 0.42, 0.24), (0.16, 0.07, 0.04), rough=(0.18, 0.4), scale=40, tarnish=0.35)
BOARD_Z0, BOARD_Z1 = SZ - 0.175 * KS, SZ + 0.225 * KS
BW = 0.125 * KS                                       # half the board's width
SLATE_X = WALL - 0.022 * KS                           # the slate's back, on the board
slab(*sorted((WALL, SLATE_X)), SY - BW, SY + BW, BOARD_Z0, BOARD_Z1, OAK, 0.006)
slab(*sorted((SLATE_X, SLATE_X - 0.02 * KS)), SY - BW + 0.025, SY + BW - 0.025, BOARD_Z0 + 0.025, BOARD_Z1 - 0.025, SLATE, 0.004)
for (dy, dz) in ((-1, BOARD_Z0 + 0.05), (1, BOARD_Z0 + 0.05), (-1, BOARD_Z1 - 0.05), (1, BOARD_Z1 - 0.05)):
    s = cylinder("screw", 0, 0, 0, 0.005, 0.008, BRASS, verts=16); s.rotation_euler = (0, -math.pi / 2, 0); s.location = (SLATE_X - 0.02 * KS, SY + dy * (BW - 0.05), dz); arch(s)
slab(*sorted((SLATE_X - 0.02 * KS, FACE)), SY - 0.055 * KS, SY + 0.055 * KS, ZH - 0.045 * KS, ZJ + 0.045 * KS, PORCELAIN, 0.005)
for y in POLES:
    # the hinge's two cheeks; the jaw's two springs
    for (z0, z1, x1) in ((ZH - 0.012 * KS, ZH + 0.012 * KS, XH - 0.008 * KS), (ZJ - 0.022 * KS, ZJ + 0.022 * KS, XH - 0.012 * KS)):
        for dy in (-0.0095 * KS, 0.0055 * KS):
            slab(*sorted((FACE, x1)), y + dy, y + dy + 0.004 * KS, z0, z1, COPPER, 0.001)
    pin = cylinder("pin", 0, 0, -0.014 * KS, 0.014 * KS, 0.0028 * KS, BRASS, verts=12); pin.rotation_euler = (math.pi / 2, 0, 0); pin.location = (XH, y, ZH); arch(pin)
    for z in (ZH - 0.032 * KS, ZJ + 0.032 * KS):
        t = cylinder("terminal", 0, 0, 0, 0.012 * KS, 0.007 * KS, BRASS, verts=6); t.rotation_euler = (0, -math.pi / 2, 0); t.location = (FACE, y, z); arch(t)
# soot on the slate over the jaws
def smudge(name, density=0.85):
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.008, 0.007, 0.006, 1); b.inputs["Roughness"].default_value = 1.0
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.inputs["Location"].default_value = (-1, -1, 0); mp.inputs["Scale"].default_value = (2, 2, 1)
    gr = N.new("ShaderNodeTexGradient"); gr.gradient_type = "SPHERICAL"
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 9
    mul = N.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = density
    mx = N.new("ShaderNodeMath"); mx.operation = "MULTIPLY"
    Lk(tc.outputs["UV"], mp.inputs["Vector"]); Lk(mp.outputs["Vector"], gr.inputs["Vector"]); Lk(tc.outputs["UV"], nz.inputs["Vector"])
    Lk(gr.outputs["Fac"], mx.inputs[0]); Lk(nz.outputs["Fac"], mx.inputs[1]); Lk(mx.outputs["Value"], mul.inputs[0]); Lk(mul.outputs["Value"], b.inputs["Alpha"])
    return m
arch(card("soot", on_wall(1, SY - 0.07 * KS, SY + 0.07 * KS, ZJ - 0.01, ZJ + 0.11 * KS, WALL - SLATE_X + 0.0205 * KS), smudge("soot on slate")))
# the blades, the handle across them: hung on the hinges, to be swung
hinge = bpy.data.objects.new("hinge", None); link(hinge); hinge.location = (XH, SY, ZH)
BLADES = []
def on_hinge(o):
    o.parent = hinge; BLADES.append(o); return o
for y in POLES:
    b_ = box("blade", -0.006 * KS, 0.006 * KS, y - SY - 0.002 * KS, y - SY + 0.002 * KS, -0.008 * KS, BLADE_L, BLADE_COPPER); bevel(b_, 0.0012, 1); on_hinge(b_)
bar = on_hinge(box("crossbar", -0.008 * KS, 0.008 * KS, -0.05 * KS, 0.05 * KS, BLADE_L - 0.058 * KS, BLADE_L - 0.04 * KS, EBONITE)); bevel(bar, 0.003, 2)
grip = on_hinge(lathe("handle", [(r * KS, h * KS) for r, h in [(0, 0), (0.006, 0), (0.006, 0.022), (0.01, 0.028), (0.0135, 0.045), (0.0125, 0.066), (0.008, 0.073), (0, 0.075)]], EBONITE, steps=32))
grip.rotation_euler = (0, -math.pi / 2, 0); grip.location = (-0.008 * KS, 0, BLADE_L - 0.049 * KS)
hinge.rotation_euler = (0, -OPEN, 0)
# the wires: from the top terminals over the panel's head, up the wall; one
# across the ceiling to the bulb, the other into the cornice to the main
FLEX = plain("cotton flex", (0.06, 0.04, 0.025), rough=0.85, sheen=0.3)
for k, y in enumerate(POLES):
    wire("lead", [(FACE + 0.002, y, ZJ + 0.032 * KS), (SLATE_X - 0.024 * KS, y, BOARD_Z1 - 0.04), (WALL - 0.03, SY + (0.07 if k else -0.07), BOARD_Z1 + 0.005), (WALL - 0.012, SY + (0.07 if k else -0.07), BOARD_Z1 + 0.03)], 0.0028, FLEX)
up = [(WALL - 0.012, SY + 0.07, BOARD_Z1 + 0.03), (WALL - 0.012, SY + 0.07, CEIL - 0.015)]
across = [(WALL - 0.015, SY + 0.07, CEIL - 0.015), (ROSE.x + 0.04, ROSE.y + 0.02, CEIL - 0.015)]
main = [(WALL - 0.012, SY - 0.07, BOARD_Z1 + 0.03), (WALL - 0.012, SY - 0.07, CEIL - 0.17)]
flex("flex", up, FLEX); flex("flex", across, FLEX); flex("flex", main, FLEX)
for p in [Vector(up[0]).lerp(Vector(up[1]), k / 4) for k in (1, 2, 3)] + [Vector(main[0]).lerp(Vector(main[1]), k / 4) for k in (1, 2, 3)] + [Vector(across[0]).lerp(Vector(across[1]), k / 5) for k in (1, 2, 3, 4)]:
    sphere("cleat", tuple(p), 0.012, PORCELAIN, squash=(1, 1, 0.7))

# ── the bulb, on its flex from a rose ──────────────────────────────────────
arch(lathe("rose", [(0, 0), (0.055, 0), (0.055, -0.012), (0.04, -0.03), (0.012, -0.034), (0, -0.034)], BAKELITE, at=tuple(ROSE)))
G = 0.1                                     # the globe's radius: a big globe lamp
NECK = BULB.z + G + 0.02                    # where the glass leaves the holder
HOLDER_TOP = NECK + 0.085
flex("flex", [(0, ROSE.y, CEIL - 0.03), (0, ROSE.y, HOLDER_TOP)], FLEX)
arch(lathe("holder", [(0, 0), (0.016, 0), (0.02, 0.01), (0.02, 0.05), (0.014, 0.065), (0.006, 0.07), (0, 0.07)], BAKELITE, at=(0, ROSE.y, HOLDER_TOP - 0.07)))
arch(cylinder("collar", 0, ROSE.y, HOLDER_TOP - 0.085, HOLDER_TOP - 0.068, 0.0165, BRASS, verts=32))
bulb_glass = plain("bulb glass", (0.97, 0.97, 0.96), rough=0.0, transmission=1.0, ior=1.5)
globe = [(G * math.sin(math.radians(t)), -(0.02 + G - G * math.cos(math.radians(t)))) for t in range(180, 0, -8)] + [(0.013, 0.0)]
arch(lathe("bulb", globe + [(max(r - 0.0008, 0.0), z + 0.0008) for r, z in reversed(globe)], bulb_glass, at=(0, ROSE.y, NECK)))
FILAMENT = plain("filament", (0.02, 0.015, 0.01), rough=0.6, emit=(1.0, 0.5, 0.16), strength=0.0)
fz = BULB.z
for e in (-1, 1): arch(rod("lead", (e * 0.004, ROSE.y, NECK - 0.005), (e * 0.022, ROSE.y, fz - 0.005), 0.0006, IRON))
loop = [(math.cos(a) * 0.022, ROSE.y + math.sin(a) * 0.022 * 0.3, fz - 0.005 + 0.018 * abs(math.sin(a * 2.5))) for a in [math.pi * i / 24 for i in range(25)]]
arch(wire("filament", loop, 0.0006, FILAMENT))
arch(rod("stem", (0, ROSE.y, NECK - 0.005), (0, ROSE.y, fz + 0.012), 0.004, GLASS))
bulb_light = lamp("the bulb", "POINT", tuple(BULB), energy=0, colour=(1.0, 0.62, 0.3), size=0.02)
def bulb_on():
    FILAMENT.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = float(arg("--glow", "400"))
    bulb_light.data.energy = float(arg("--bulb", "90"))
def bulb_off():
    FILAMENT.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 0.0
    bulb_light.data.energy = 0

# ── the copper gas main along both walls, a gauge on its feed ──────────────
for side in (-1, 1):
    for (h, r) in ((CEIL - 0.24, 0.016), (CEIL - 0.32, 0.009)):
        x = side * (WALL - 0.05)
        arch(rod("gas main", (x, Y0 - 1, h), (x, END, h), r, COPPER, verts=20))
        y = Y0 - 0.6
        while y < END:
            arch(box("clip", *sorted((side * WALL, side * (WALL - 0.05 - r))), y - 0.012, y + 0.012, h - r - 0.004, h + r + 0.004, CAST_IRON))
            y += 0.95
GX, GY, GZ = -WALL + 0.07, 5.0, 2.45
arch(rod("feed", (GX + 0.0, GY, CEIL - 0.24), (GX, GY, GZ + 0.09), 0.008, COPPER))
arch(lathe("bezel", [(0, 0), (0.08, 0), (0.08, 0.03), (0.07, 0.035), (0, 0.035)], BRASS, at=(-WALL + 0.02, GY, GZ)))
bezel = ARCH[-1]; bezel.rotation_euler = (0, math.pi / 2, 0)
arch(card("gauge", on_wall(-1, GY - 0.068, GY + 0.068, GZ - 0.068, GZ + 0.068, 0.057), GAUGE))
arch(card("gauge glass", on_wall(-1, GY - 0.07, GY + 0.07, GZ - 0.07, GZ + 0.07, 0.06), GLASS))

# ── the charts ─────────────────────────────────────────────────────────────
TY0, TY1, TZ0, TZ1 = 3.62, 4.57, 2.06, 2.725
# The 28 mm picture rail runs behind this chart. Stand the whole frame and
# its backing clear of it, so the rail cannot cut across the printed sheet.
CHART_OFFSET = 0.03
slab(-WALL + CHART_OFFSET, -WALL + CHART_OFFSET + 0.01,
     TY0 - 0.04, TY1 + 0.04, TZ0 - 0.04, TZ1 + 0.04, OAK, 0.003)
for (a, b, c, d_) in ((TY0 - 0.04, TY1 + 0.04, TZ0 - 0.04, TZ0), (TY0 - 0.04, TY1 + 0.04, TZ1, TZ1 + 0.04), (TY0 - 0.04, TY0, TZ0, TZ1), (TY1, TY1 + 0.04, TZ0, TZ1)):
    frame = along(-1, a, b, c, d_, 0.03, OAK if d_ - c > 0.1 else OAK_X, 0.006)
    frame.location.x += CHART_OFFSET
arch(card("table of the elements", on_wall(-1, TY0, TY1, TZ0, TZ1, CHART_OFFSET + 0.012), ELEMENTS))
arch(card("its glass", on_wall(-1, TY0, TY1, TZ0, TZ1, CHART_OFFSET + 0.02), GLASS))
AY0, AY1, AZ0, AZ1 = 6.4, 6.95, 1.48, 2.23
sheet = arch(card("chart of apparatus", on_wall(1, AY0, AY1, AZ0, AZ1, 0.006), APPARATUS))
for (y, z) in ((AY0 + 0.02, AZ1 - 0.02), (AY1 - 0.02, AZ1 - 0.02), (AY0 + 0.02, AZ0 + 0.02), (AY1 - 0.02, AZ0 + 0.02)):
    arch(sphere("pin", (WALL - 0.009, y, z), 0.006, BRASS, squash=(0.5, 1, 1)))

# ── the sconces: one candle still burning, the others burnt out ────────────
CANDLES = []
for side in (-1, 1):
    for i, zs in enumerate(SCONCES[side]):
        tip = sconce_tip(side, zs); lit = side < 0 and i == 0
        candle_sconce(side, tip, BRASS, WAX, WICK, candle=0.2 if lit else RNG.choice((0.03, 0.0)), lit=lit)
        if lit:
            sfl = arch(lathe("sconce flame", [(0, 0), (0.005, 0.007), (0.0068, 0.018), (0.0035, 0.03), (0, 0.042)],
                             FLAME, at=(tip.x, tip.y, tip.z - 0.004), steps=14))
            sfl.visible_shadow = False
            CANDLES.append(tip)

# ── furniture: the trade's drawers and cabinets, their glass on them ───────
def surfaces(x, y, top, bottom=0.2):
    """the heights things could stand at, under (x, y), from `top` down"""
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get(); found, z = [], top
    while z > bottom:
        hit, loc, nrm, _, _, _ = scene.ray_cast(deps, Vector((x, y, z)), Vector((0, 0, -1)))
        if not hit: break
        if nrm.z > 0.7: found.append(loc.z)
        z = loc.z - 0.008
    return found
# left, between doors VII and VIII: an apothecary's chest of drawers, a still
# on it under the burning candle, a shelf of reagents over it
CHEST_Y = 4.45
drw = import_model("vintage_wooden_drawer_01", width=1.4, at=(-WALL + 0.38, CHEST_Y, 0), rot=math.pi / 2)
darken_model(drw, (0.42, 0.32, 0.24), rough_floor=0.58)
ctop = surfaces(-WALL + 0.38, CHEST_Y, 2.0)[0]
def still(x, y, z):
    """a distillation set up and left: a stand, a flask over a spirit lamp,
    the condenser sloping down to a receiving flask"""
    slab(x - 0.07, x + 0.07, y - 0.12, y + 0.12, z, z + 0.012, CAST_IRON, 0.003, keep=False)
    cylinder("stand", x - 0.04, y - 0.08, z, z + 0.62, 0.006, CAST_IRON, verts=12)
    # the lamp, the ring and gauze, the flask on it
    vessel("spirit lamp", [(0.04, 0), (0.045, 0.01), (0.045, 0.035), (0.035, 0.055), (0.012, 0.065), (0.012, 0.075)], GLASS, (x, y, z + 0.012), liquid=LIQUIDS[3], level=0.03)
    cylinder("wick holder", x, y, z + 0.085, z + 0.1, 0.008, BRASS, verts=16)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.06, minor_radius=0.004, location=(x, y, z + 0.2)); r = bpy.context.active_object; r.data.materials.append(CAST_IRON)
    rod("ring arm", (x - 0.04, y - 0.08, z + 0.2), (x - 0.02, y - 0.04, z + 0.2), 0.004, CAST_IRON)
    neck = flask(x, y, z + 0.204, 0.06, fill=LIQUIDS[4], level=0.45)
    cylinder("cork", x, y, neck - 0.01, neck + 0.008, 0.013, CORK, verts=16)
    # the condenser: glass in a glass jacket, a clamp holding it, down to the receiver
    a, b = Vector((x, y + 0.01, neck + 0.004)), Vector((x, y + 0.42, z + 0.2))
    rod("delivery", a, a + Vector((0, 0.02, 0.03)), 0.004, GLASS)
    rod("condenser", a + Vector((0, 0.02, 0.03)), b, 0.0045, GLASS)
    mid0, mid1 = a.lerp(b, 0.3) + Vector((0, 0, 0.02)), a.lerp(b, 0.85) + Vector((0, 0, 0.005))
    rod("jacket", mid0, mid1, 0.014, GLASS, verts=24)
    rod("clamp", (x - 0.04, y - 0.08, (mid0.z + mid1.z) / 2), (mid0 + mid1) / 2, 0.004, CAST_IRON)
    conical(b.x, b.y + 0.02, z, 1.1, fill=LIQUIDS[4])
still(-WALL + 0.42, CHEST_Y - 0.35, ctop)
for k in range(3):
    bottle(-WALL + 0.25 + RNG.uniform(-0.04, 0.04), CHEST_Y + 0.25 + k * 0.11, ctop, RNG.uniform(0.9, 1.25), cell=RNG.randrange(8), wide=k == 1)
import_model("vintage_microscope", height=0.32, at=(-WALL + 0.4, CHEST_Y + 0.5, ctop), rot=math.pi / 2 + 0.4)
SHELF_Y0, SHELF_Y1, SHELF_Z = 3.72, 4.55, 1.5
along(-1, SHELF_Y0, SHELF_Y1, SHELF_Z - 0.025, SHELF_Z, 0.2, OAK_X, 0.006)
for y in (SHELF_Y0 + 0.08, SHELF_Y1 - 0.08):
    tube("bracket", [(0.0, -0.18), (0.0, 0.0), (0.17, 0.0)], 0.006, CAST_IRON, at=(-WALL, y, SHELF_Z - 0.03))
y = SHELF_Y0 + 0.06
while y < SHELF_Y1 - 0.06:
    k = RNG.uniform(0.9, 1.35); bottle(-WALL + 0.1, y, SHELF_Z, k, cell=RNG.randrange(8), wide=RNG.random() < 0.3); y += 0.075 * k + RNG.uniform(0.0, 0.02)
# left, past door VIII: a glazed cabinet of reagents
CAB_Y = 7.35
import_model("vintage_cabinet_01", width=1.42, at=(-WALL + 0.26, CAB_Y, 0), rot=math.pi / 2)
for z in surfaces(-WALL + 0.12, CAB_Y - 0.2, 1.6):
    if 0.75 < z < 1.5:
        y = CAB_Y - 0.62
        while y < CAB_Y + 0.62:
            k = RNG.uniform(0.75, 1.05); bottle(-WALL + 0.12 + RNG.uniform(-0.02, 0.03), y, z, k, cell=RNG.randrange(8) if RNG.random() < 0.6 else None); y += 0.08 * k + RNG.uniform(0, 0.04)
# a sand bucket, and a carboy in its wicker, by the end wall
import_model("wooden_bucket_01", height=0.48, at=(-WALL + 0.3, 8.55, 0), rot=0.7)
cylinder("sand", -WALL + 0.3, 8.55, 0.24, 0.28, 0.15, plain("sand", (0.35, 0.3, 0.2), rough=1.0))
cx, cy = -WALL + 0.38, 9.0
vessel("carboy", [(0.12, 0), (0.17, 0.03), (0.18, 0.2), (0.16, 0.33), (0.06, 0.4), (0.035, 0.42), (0.035, 0.47), (0.04, 0.48)], BOTTLE_GREEN, (cx, cy, 0), liquid=LIQUIDS[3], level=0.26, t=0.003)
cylinder("wicker", cx, cy, 0, 0.26, 0.19, WICKER, verts=40, open_ends=True)
# right, between the stair and door IX, under the switch: a painted cupboard, a balance on it
CUP_Y = 4.36
import_model("painted_wooden_cabinet", width=0.84, at=(WALL - 0.24, CUP_Y, 0), rot=-math.pi / 2)
btop = surfaces(WALL - 0.22, CUP_Y, 2.0)[0]
def balance(x, y, z):
    """a chemist's balance: a base on brass feet, a pillar, the beam, the pans hung from it"""
    slab(x - 0.08, x + 0.08, y - 0.16, y + 0.16, z, z + 0.03, OAK_X, 0.005, keep=False)
    for (dx, dy) in ((-0.06, -0.14), (0.06, -0.14), (-0.06, 0.14), (0.06, 0.14)):
        cylinder("foot", x + dx, y + dy, z - 0.004, z, 0.008, BRASS, verts=12)
    cylinder("pillar", x, y, z + 0.03, z + 0.3, 0.008, BRASS, verts=16)
    slab(x - 0.006, x + 0.006, y - 0.15, y + 0.15, z + 0.295, z + 0.305, BRASS, 0.002, keep=False)
    rod("pointer", (x - 0.01, y, z + 0.3), (x - 0.01, y + 0.01, z + 0.12), 0.0015, BRASS)
    for e in (-1, 1):
        py = y + e * 0.145; pan = z + 0.07
        lathe("pan", [(0, 0), (0.05, 0.004), (0.055, 0.016), (0.05, 0.016), (0.045, 0.006), (0, 0.003)], BRASS, at=(x, py, pan))
        for a in (0.3, 2.4, 4.5):
            rod("hanger", (x, py, z + 0.295), (x + math.cos(a) * 0.045, py + math.sin(a) * 0.045, pan + 0.016), 0.0006, BRASS)
balance(WALL - 0.24, CUP_Y - 0.05, btop)
slab(WALL - 0.4, WALL - 0.3, CUP_Y + 0.22, CUP_Y + 0.34, btop, btop + 0.05, OAK_X, 0.004, keep=False)
for i in range(4): cylinder("weight", WALL - 0.37 + (i % 2) * 0.035, CUP_Y + 0.25 + (i // 2) * 0.05, btop + 0.05, btop + 0.065 + i * 0.006, 0.008 + i * 0.002, BRASS, verts=16)
# right, between doors IX and X: a worn bookcase, books and bottles in it
BOOK_Y = 6.52
import_model("wooden_bookshelf_worn", width=0.86, at=(WALL - 0.19, BOOK_Y, 0), rot=-math.pi / 2)
for n, z in enumerate(surfaces(WALL - 0.19, BOOK_Y, 1.4, 0.05)):
    if n % 2 == 0:
        import_model("book_encyclopedia_set_01", width=0.4 + RNG.uniform(-0.04, 0.04), at=(WALL - 0.2, BOOK_Y - 0.08 + RNG.uniform(-0.04, 0.04), z), rot=-math.pi / 2)
    else:
        y = BOOK_Y - 0.3
        while y < BOOK_Y + 0.3:
            k = RNG.uniform(0.8, 1.1); bottle(WALL - 0.2, y, z, k, cell=RNG.randrange(8) if RNG.random() < 0.7 else None, wide=RNG.random() < 0.4); y += 0.08 * k + RNG.uniform(0, 0.03)
# right, past door X: a crate of glass in straw; a stool
import_model("wooden_crate_01", width=0.82, at=(WALL - 0.24, 8.78, 0), rot=-math.pi / 2)
import_model("wooden_stool_01", height=0.6, at=(1.7, 8.2, 0), rot=0.4)

# ── the bench at the end, under the blackboard ─────────────────────────────
BY0, BY1, BZ = END - 0.62, END - 0.02, 0.9
for x0, x1 in ((-1.75, -0.6), (-0.58, 0.58), (0.6, 1.75)):
    slab(x0, x1, BY0 + 0.04, BY1, 0.08, BZ - 0.03, OAK, 0.006, keep=False)              # its carcass, bay by bay
    for k, (a, b) in enumerate(((x0 + 0.04, (x0 + x1) / 2 - 0.01), ((x0 + x1) / 2 + 0.01, x1 - 0.04))):
        slab(a, b, BY0 + 0.02, BY0 + 0.04, 0.12, 0.62, OAK, 0.01, keep=False)          # cupboard doors
        knob("knob", ((b - 0.03) if k == 0 else (a + 0.03), BY0 + 0.012, 0.52), 0.012, 0.016, BRASS)
        slab(a, b, BY0 + 0.02, BY0 + 0.04, 0.66, BZ - 0.06, OAK_X, 0.008, keep=False)  # drawers
        knob("pull", ((a + b) / 2, BY0 + 0.012, BZ - 0.15), 0.012, 0.016, BRASS)
slab(-1.76, 1.76, BY0 + 0.07, BY1, 0, 0.08, BLACK_GLAZE, 0.004, keep=False)               # plinth
slab(-1.8, 1.8, BY0 - 0.02, BY1, BZ - 0.03, BZ + 0.012, SLATE, 0.006, keep=False)          # the slate top
z = BZ + 0.012
# what is on it, left to right
still(-1.35, END - 0.32, z)
for k, x in enumerate((-0.95, -0.85, -0.76)): bottle(x, END - 0.12 - k * 0.05, z, RNG.uniform(1.0, 1.4), cell=RNG.randrange(8))
import_model("mantel_clock_01", width=0.32, at=(-0.45, END - 0.1, z), rot=0.15)
# a rack of test tubes
rx, ry = -0.05, END - 0.3
for dx in (-0.12, 0.12): slab(rx + dx - 0.008, rx + dx + 0.008, ry - 0.03, ry + 0.03, z, z + 0.12, OAK, 0.002, keep=False)
for hz in (0.06, 0.11): slab(rx - 0.12, rx + 0.12, ry - 0.025, ry + 0.025, z + hz, z + hz + 0.012, OAK_X, 0.002, keep=False)
for i in range(6): test_tube(rx - 0.1 + i * 0.04, ry, z + 0.012, fill=LIQUIDS[i % len(LIQUIDS)])
tt = test_tube(0, 0, 0, fill=LIQUIDS[0]); tt.rotation_euler = (math.pi / 2 - 0.03, 0, 0.9); tt.location = (rx + 0.2, ry - 0.12, z + 0.009)
import_model("magnifying_glass_01", height=0.27, at=(0.3, END - 0.4, z + 0.014), rot=1.1, tilt=(math.pi / 2, 0.0))
import_model("book_encyclopedia_set_01", width=0.3, at=(0.62, END - 0.13, z), rot=0.0)
for x, k in ((0.95, 1.0), (1.08, 0.8)): conical(x, END - 0.3, z, k)
beaker(1.2, END - 0.18, z, 1.2); beaker(1.32, END - 0.32, z, 0.9)
lathe("mortar", [(0, 0), (0.05, 0), (0.065, 0.03), (0.07, 0.06), (0.062, 0.062), (0.055, 0.035), (0, 0.018)], PORCELAIN, at=(1.5, END - 0.2, z))
rod("pestle", (1.49, END - 0.2, z + 0.03), (1.43, END - 0.26, z + 0.16), 0.01, PORCELAIN)
for k, x in enumerate((1.55, 1.64)): bottle(x, END - 0.1, z, 1.3, cell=(k + 3) % 8, wide=True)
import_model("vintage_oil_lamp", height=0.5, at=(1.66, END - 0.38, z), rot=0.3)
import_model("wooden_stool_01", height=0.6, at=(0.45, END - 0.95, 0), rot=1.2)
# papers dropped on the floor
PAPER = paper("dropped paper", (0.62, 0.58, 0.48), 0.4)
for (x, y, a) in ((-1.6, 5.2, 0.4), (-1.3, 5.6, 2.1), (0.4, 7.8, 1.0), (1.1, 8.4, 2.6)):
    s_ = card("paper", [(-0.105, -0.15, 0), (0.105, -0.15, 0), (0.105, 0.15, 0), (-0.105, 0.15, 0)], PAPER)
    s_.location = (x, y, 0.002); s_.rotation_euler = (RNG.uniform(-0.03, 0.03), RNG.uniform(-0.03, 0.03), a)

# ── light ──────────────────────────────────────────────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
# the moon through the roof light, down onto the bench and the board
lamp("moon through the roof", "SUN", (0.4, 6.0, 9.0), aim=(0, 9.0, 1.2), energy=float(arg("--roofmoon", "3")), colour=(0.55, 0.68, 1.0), angle=math.radians(2))
# the moon down the stairwell, out through its opening
lamp("moon in the stairwell", "AREA", (SWX1 + 1.8, SC.y - 0.3, 3.4), aim=(SC.x - 0.6, SC.y + 0.2, 0.2), energy=float(arg("--stairmoon", "1600")), colour=(0.55, 0.68, 1.0), size=0.9)
lamp("moon down the stair", "AREA", (SC.x, SC.y, 6.5), aim=(SC.x - 0.3, SC.y, 0.0), energy=float(arg("--stairfill", "260")), colour=(0.55, 0.68, 1.0), size=1.2)
for tip in CANDLES:
    lamp("candle", "POINT", tuple(tip + Vector((0, 0, 0.02))), energy=float(arg("--candle", "9")), colour=(1.0, 0.55, 0.22), size=0.012)
lamp("fill", "AREA", (0, 0.6, 2.6), aim=(0, END, 1.0), energy=float(arg("--fill", "60")), colour=(0.8, 0.85, 1.0), size=2.5)
clear_glass()
air = haze(float(arg("--haze", "0.02")))

# ── the passes ─────────────────────────────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "1.5")))
scene.cycles.volume_bounces = 1
scene.render.use_persistent_data = True
finish_hall(scene, SAMPLES, keep_gloss=(
    "white tiles", "white tiles, end", "green glaze", "black glaze",
    "bakelite", "porcelain", "ebonite", "gauge dial",
    "glass", "bulb glass", "frosted glass", "amber glass", "cobalt glass",
    "green glass", "dusty glass", "blue vitriol", "tincture", "green salts",
    "water", "permanganate", "cochineal",
))
passes(scene, OUT, ONLY, air, apart={"blades": BLADES}, variants={"lit": (bulb_on, bulb_off)})

# ── the switch's blades, at every angle they swing through ─────────────────
# Rendered in a box round the switch only, everything else held out (hiding
# them where it stands in front, as the jaws do, and leaving the hall's own
# picture to show through everywhere else): frames
# from open to shut, and shut once more with the bulb alight. With where the
# game is to lay them, in the reference picture's pixels.
FRAMES = 13
if "switch" in ONLY:
    from bpy_extras.object_utils import world_to_camera_view
    W_, H_ = scene.render.resolution_x, scene.render.resolution_y
    def seen(points):
        uv = [world_to_camera_view(scene, scene.camera, Vector(p)) for p in points]
        return min(c.x for c in uv), max(c.x for c in uv), min(c.y for c in uv), max(c.y for c in uv)
    swept = [(x, y, z) for x in (WALL, XH - BLADE_L - 0.1 * KS) for y in (SY - BW - 0.03, SY + BW + 0.03) for z in (BOARD_Z0 - 0.06, BOARD_Z1 + 0.06)]
    u0, u1, v0, v1 = seen(swept)
    px0, px1, py0, py1 = math.floor(u0 * W_), math.ceil(u1 * W_), math.floor(v0 * H_), math.ceil(v1 * H_)
    r = scene.render
    r.use_border = True; r.use_crop_to_border = True
    r.border_min_x, r.border_max_x, r.border_min_y, r.border_max_y = px0 / W_, px1 / W_, py0 / H_, py1 / H_
    r.film_transparent = True; r.image_settings.color_mode = "RGBA"
    for o in bpy.data.objects:
        o.is_holdout = o.type in ("MESH", "CURVE", "FONT") and o not in BLADES
    air.hide_render = True
    for o in BLADES: o.hide_render = False
    for i in range(FRAMES):
        hinge.rotation_euler = (0, -OPEN * (1 - i / (FRAMES - 1)), 0)
        render(scene, os.path.join(OUT, f"switch-{i:02d}.png"))
    bulb_on(); render(scene, os.path.join(OUT, "switch-lit.png")); bulb_off()
    ref = lambda u, v: [round(u * WR, 2), round((1 - v) * HR, 2)]
    b0, b1, c0, c1 = seen([(x, y, z) for x in (WALL, XH - 0.06 * KS) for y in (SY - BW, SY + BW) for z in (BOARD_Z0, BOARD_Z1)])
    jaws = world_to_camera_view(scene, scene.camera, Vector((XH, SY, ZJ)))
    with open(os.path.join(OUT, "switch.json"), "w") as f:
        json.dump({
            "frames": FRAMES,
            "box": [round(px0 / W_ * WR, 2), round((H_ - py1) / H_ * HR, 2), round((px1 - px0) / W_ * WR, 2), round((py1 - py0) / H_ * HR, 2)],
            "hit": [*ref(b0, c1), round((b1 - b0) * WR, 2), round((c1 - c0) * HR, 2)],
            "contact": ref(jaws.x, jaws.y),
        }, f)
print("HALL_DONE")
