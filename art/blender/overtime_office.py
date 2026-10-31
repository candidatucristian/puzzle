# After Hours (levels/overtime): the clerk's desk at the far end of the
# library, close to, from his chair late at night — built in three dimensions
# and rendered with Cycles. Walnut panelling; on it the red LED clock in its
# black case, a botanical print of hers behind glass, and on a little shelf
# the clock radio. On the desk the green banker's lamp, alight, the only
# light; a mug of coffee, a glass with a sprig of periwinkle; the alarm clock
# and the folding travel clock; and on the desk's green leather, in the
# lamp's light, the desk calculator,
# its keys as the puzzle has them (Overtime.js KEYPAD), its display blank —
# the game writes on it — and a pad of paper, a pencil across it.
#
# The clocks are the library's own (room_library.py), their faces the
# puzzle's times (clock_faces.mjs, from OVERTIME_CLOCKS). Every colon goes on
# and off in the game: the plate is rendered with them off, again with them
# on, and overtime_publish.mjs cuts each lit colon out of the second. Where
# everything the game keeps alive fell in the picture — every key's cap, the
# calculator's display, the colons, the coffee — is written down beside them
# (officeRender.json).
#
# The eye sits level, a little over the lamp's shade, the picture shifted down
# (verticals upright); the reference picture is 1880 × 1000 and the game
# covers its screen with it, so what matters keeps to the middle three
# quarters of its width.
#
#   blender -b --factory-startup -P art/blender/overtime_office.py -- [--samples 384] [--width 2560] [--still 1|lit]

import bpy, bmesh, math, os, sys, json
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *

OUT = os.path.join(ROOT, ".artifacts/overtime-office")
os.makedirs(OUT, exist_ok=True)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")        # room_boards.mjs, clock_faces.mjs
SAMPLES = int(arg("--samples", "384"))
WIDTH = int(arg("--width", "2560"))
STILL = arg("--still", "")
RNG = __import__("random").Random(2203)

# ── where we sit (cm: x across, y up from the floor, d away from the eye) ──
DESK_Y, WALL_D, DESK_FRONT = 76, 125, 20
EYE_Y = float(arg("--ey", "116"))
scene, HEIGHT = stage(WIDTH, eye=(0, EYE_Y, 0), look=(0, EYE_Y, WALL_D), lens=float(arg("--lens", "20")), lift=float(arg("--lift", "-0.1")))

# ── materials ──────────────────────────────────────────────────────────────
WALNUT = scan("walnut panelling", "rosewood_veneer1", size=0.9, tint=(0.55, 0.38, 0.27), bright=0.42, sat=0.8, rough=(0.3, 0.55), bump=0.25, coat=0.15, upright=True)
WALNUT_X = scan("walnut rails", "rosewood_veneer1", size=0.9, tint=(0.55, 0.38, 0.27), bright=0.4, sat=0.8, rough=(0.3, 0.55), bump=0.25, coat=0.15)
DESK_WOOD = scan("desk mahogany", "dark_wood", size=1.1, tint=(0.66, 0.46, 0.34), bright=0.4, sat=0.7, rough=(0.38, 0.6), bump=0.3, coat=0.08, edges=0.35, dust=0.15)
DESK_LEATHER = scan("desk leather", "brown_leather", size=0.45, tint=(0.13, 0.24, 0.15), bright=0.3, sat=1.0, rough=(0.5, 0.75), bump=0.45, stains=0.25)
BRASS = aged_metal("brass", (0.55, 0.39, 0.17), (0.08, 0.055, 0.025), rough=(0.22, 0.5), scale=40, tarnish=0.5)
BLACK = plain("black plastic", (0.015, 0.015, 0.017), rough=0.35, coat=0.2)
CLOCK_CASE = plain("clock case", (0.02, 0.02, 0.022), rough=0.32, coat=0.25)
CLOCK_BEZEL = plain("clock bezel", (0.012, 0.012, 0.014), rough=0.16, coat=0.7)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
CERAMIC = plain("ceramic", (0.5, 0.45, 0.36), rough=0.32, coat=0.2)
COFFEE = plain("coffee", (0.03, 0.015, 0.008), rough=0.08, coat=0.6)
CASE_LEATHER = scan("case leather", "brown_leather", size=0.3, tint=(0.6, 0.3, 0.2), bright=0.45, rough=(0.35, 0.6), bump=0.5)
def ruled(w=512, h=768, lines=26):
    """a ruled pad's page: faint blue lines, a red margin, as a picture"""
    import numpy as np
    img = bpy.data.images.new("ruled page", w, h, alpha=False)
    px = np.ones((h, w, 4), dtype=np.float32)
    for k in range(1, lines):
        y = int(h * (1 - (k + 1.5) / (lines + 2)))
        px[y:y + 2, :, :3] *= np.array([0.72, 0.8, 0.92], dtype=np.float32)
    px[:, int(w * 0.14):int(w * 0.14) + 2, :3] *= np.array([0.92, 0.66, 0.64], dtype=np.float32)
    img.pixels.foreach_set(px.ravel()); img.pack()
    return img
PAPER = paper("notepad", (0.5, 0.48, 0.41), 0.18)
_pn = PAPER.node_tree.nodes; _rt = _pn.new("ShaderNodeTexImage"); _rt.image = ruled()
_pm = _pn.new("ShaderNodeMix"); _pm.data_type = "RGBA"; _pm.blend_type = "MULTIPLY"; _pm.inputs["Factor"].default_value = 1.0
_pb = _pn["Principled BSDF"].inputs["Base Color"]; PAPER.node_tree.links.new(_pb.links[0].from_socket, _pm.inputs[6]); PAPER.node_tree.links.new(_rt.outputs["Color"], _pm.inputs[7]); PAPER.node_tree.links.new(_pm.outputs[2], _pb)
WALL_BEHIND = scan("wall behind", "plastered_wall_04", size=2.0, tint=(0.36, 0.32, 0.26), bright=0.45, sat=0.3, rough=(0.8, 0.95), bump=0.2)
PRINT = picture("botanical print", os.path.join(DRAWN, "study-print.png"), rough=0.9)
SPINES = bound(picture("spines", os.path.join(DRAWN, "spines.png"), rough=0.5, coat=0.15, bump=0.3))
COVERS = cover_materials()
PAGES = plain("pages", (0.3, 0.26, 0.19), rough=0.9)

# ── the clocks' faces ──────────────────────────────────────────────────────
def face_material(i, colon, strength):
    """a clock's face, the puzzle's time on it, its colon on or off: an LED's
    unlit bars always there, its lit ones glowing; an LCD's dark figures on
    its grey-green, lit a little from behind"""
    m = bpy.data.materials.new(f"clock face {i}{' colon' if colon else ''}"); m.use_nodes = True
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    lit = N.new("ShaderNodeTexImage"); lit.image = bpy.data.images.load(os.path.join(DRAWN, f"clock-{i}-lit-{'colon' if colon else 'nocolon'}.png"), check_existing=True)
    if i == 3:
        Lk(lit.outputs["Color"], b.inputs["Base Color"]); Lk(lit.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Roughness"].default_value = 0.5
    else:
        dim = N.new("ShaderNodeTexImage"); dim.image = bpy.data.images.load(os.path.join(DRAWN, f"clock-{i}-dim.png"), check_existing=True)
        Lk(dim.outputs["Color"], b.inputs["Base Color"]); Lk(lit.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Roughness"].default_value = 0.15; b.inputs["Coat Weight"].default_value = 0.6
    b.inputs["Emission Strength"].default_value = strength
    return m
STRENGTH = {0: 7.0, 1: 5.0, 2: 5.0, 3: 0.35}
FACES = {i: (face_material(i, False, STRENGTH[i]), face_material(i, True, STRENGTH[i])) for i in range(4)}
GLOSSY_FACES = tuple(m.name for pair in FACES.values() for m in pair)
COLONS = []                                    # each face's card, and the corners of the colon on it
def face_card(i, corners_):
    """a face laid on its card, lower left first; where its colon is on it
    (in clock_faces.mjs's picture: across 0.47–0.55, up 0.24–0.76)"""
    o = card(f"face {i}", corners_, FACES[i][0])
    bl, br, tr, tl = [Vector(c) for c in corners_]
    at = lambda u, v: bl + (br - bl) * u + (tl - bl) * v
    COLONS.append((o, i, [at(0.45, 0.2), at(0.575, 0.2), at(0.575, 0.8), at(0.45, 0.8)]))
    return o
def front(x0, x1, y0, y1, d):
    return [P(x0, y0, d), P(x1, y0, d), P(x1, y1, d), P(x0, y1, d)]

# ── the wall before us: walnut panels, a dado rail ─────────────────────────
W0, W1, TOP = -170, 170, 260
box_cm("wall", W0, W1, 0, TOP, WALL_D, WALL_D + 20, WALNUT)
def panels(y0, y1, n):
    for k in range(n):
        x0 = W0 + k * (W1 - W0) / n + 7; x1 = W0 + (k + 1) * (W1 - W0) / n - 7
        box_cm("panel field", x0 + 2, x1 - 2, y0 + 7, y1 - 7, WALL_D - 1.0, WALL_D, WALNUT, 0.6)
        for (a, b_, c, e) in ((x0, x1, y0 + 5, y0 + 7), (x0, x1, y1 - 7, y1 - 5), (x0, x0 + 2, y0 + 5, y1 - 5), (x1 - 2, x1, y0 + 5, y1 - 5)):
            box_cm("panel moulding", a, b_, c, e, WALL_D - 2.0, WALL_D, WALNUT_X if e - c < 5 else WALNUT, 0.6)
panels(DESK_Y - 30, 98, 7)
panels(104, 250, 7)
box_cm("dado rail", W0, W1, 98, 104, WALL_D - 3, WALL_D, WALNUT_X, 1.0)
box_cm("cornice", W0, W1, 250, 262, WALL_D - 6, WALL_D, WALNUT_X, 1.5)

# ── the desk ───────────────────────────────────────────────────────────────
box_cm("desk top", -190, 190, DESK_Y - 3.5, DESK_Y, DESK_FRONT, WALL_D - 0.5, DESK_WOOD, 0.8)
box_cm("desk apron", -190, 190, DESK_Y - 13, DESK_Y - 3.5, DESK_FRONT + 1, DESK_FRONT + 3, DESK_WOOD, 0.6)
# (the writing leather let into the top, flush with it, a gilt line tooled round it)
LX0, LX1, LD0, LD1 = -78, 78, DESK_FRONT + 6, WALL_D - 22
box_cm("desk leather", LX0, LX1, DESK_Y - 0.5, DESK_Y + 0.02, LD0, LD1, DESK_LEATHER, 0.1)
TOOLED = aged_metal("tooled gilt", (0.5, 0.36, 0.14), (0.12, 0.08, 0.03), rough=(0.35, 0.6), scale=80, tarnish=0.7)
for (a, b_, c, e) in ((LX0 + 1.6, LX1 - 1.6, LD0 + 1.6, LD0 + 1.85), (LX0 + 1.6, LX1 - 1.6, LD1 - 1.85, LD1 - 1.6), (LX0 + 1.6, LX0 + 1.85, LD0 + 1.6, LD1 - 1.6), (LX1 - 1.85, LX1 - 1.6, LD0 + 1.6, LD1 - 1.6)):
    box_cm("tooled line", a, b_, DESK_Y + 0.02, DESK_Y + 0.03, c, e, TOOLED)
box_cm("floor", -300, 300, -2, 0, -250, WALL_D, plain("floor", (0.05, 0.035, 0.025), rough=0.6))

# ── on the wall: the LED clock, as in the library, its lead down the wall ──
ck = dict(x=-46, y0=131, y1=142, w=24, deep=6)
kx0, kx1, ky0, ky1, KF = ck["x"] - ck["w"] / 2, ck["x"] + ck["w"] / 2, ck["y0"], ck["y1"], WALL_D - ck["deep"]
box_cm("wall clock", kx0, kx1, ky0, ky1, KF + 0.8, WALL_D, CLOCK_CASE, 1.6)
for (a, b_, c, e) in ((kx0, kx1, ky0, ky0 + 1.6), (kx0, kx1, ky1 - 1.6, ky1), (kx0, kx0 + 1.6, ky0, ky1), (kx1 - 1.6, kx1, ky0, ky1)):
    box_cm("clock bezel", a, b_, c, e, KF, KF + 1.3, CLOCK_BEZEL, 0.45)
box_cm("clock glass", kx0 + 1.6, kx1 - 1.6, ky0 + 1.6, ky1 - 1.6, KF + 0.6, KF + 0.9, plain("red filter", (0.03, 0.004, 0.003), rough=0.06, coat=1.0))
kyc = (ky0 + ky1) / 2
face_card(0, front(ck["x"] - 8, ck["x"] + 8, kyc - 3, kyc + 3, KF + 0.55))
for bx in (kx1 - 7, kx1 - 4):
    box_cm("clock button", bx - 1.1, bx + 1.1, ky1 - 0.3, ky1 + 0.6, KF + 1.8, KF + 4, plain("clock button", (0.1, 0.1, 0.11), rough=0.4), 0.25)
cu = bpy.data.curves.new("lead", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = M(0.22); cu.bevel_resolution = 3
spl = cu.splines.new("BEZIER"); spl.bezier_points.add(2)
for bp_, v in zip(spl.bezier_points, (P(kx1 - 3, ky0 + 0.5, WALL_D - 1.2), P(kx1 - 1, ky0 - 24, WALL_D - 0.6), P(kx1 + 2, DESK_Y, WALL_D - 0.6))):
    bp_.co = v; bp_.handle_left_type = bp_.handle_right_type = "AUTO"
link(bpy.data.objects.new("lead", cu)).data.materials.append(BLACK)
glow_ = lamp("clock glow", "AREA", tuple(P(ck["x"], kyc, KF - 1.5)), aim=tuple(P(ck["x"], kyc - 12, KF - 40)), energy=float(arg("--clockglow", "0.25")), colour=(1.0, 0.06, 0.03), size=0.16, size_y=0.05)
glow_.visible_camera = False; glow_.visible_glossy = False

# ── a botanical print of hers, behind glass, in a walnut frame ─────────────
mx0, mx1, my0, my1, FR = -19, 19, 112.5, 145.5, 4
for (a, b_, c, e) in ((mx0 - FR, mx1 + FR, my0 - FR, my0), (mx0 - FR, mx1 + FR, my1, my1 + FR), (mx0 - FR, mx0, my0, my1), (mx1, mx1 + FR, my0, my1)):
    box_cm("print frame", a, b_, c, e, WALL_D - 3.6, WALL_D, WALNUT_X if e - c < FR + 1 else WALNUT, 1.2)
for (a, b_, c, e) in ((mx0 - 0.6, mx1 + 0.6, my0 - 0.6, my0), (mx0 - 0.6, mx1 + 0.6, my1, my1 + 0.6), (mx0 - 0.6, mx0, my0, my1), (mx1, mx1 + 0.6, my0, my1)):
    box_cm("print slip", a, b_, c, e, WALL_D - 3.9, WALL_D - 2, BRASS, 0.2)
MOUNT = paper("print mount", (0.5, 0.47, 0.4), 0.15)
card("print mount", front(mx0, mx1, my0, my1, WALL_D - 2.5), MOUNT)
# (the print: 1200 × 860, in its mount)
ph = (mx1 - mx0 - 6) * 860 / 1200; pyc = (my0 + my1) / 2
card("botanical print", front(mx0 + 3, mx1 - 3, pyc - ph / 2, pyc + ph / 2, WALL_D - 2.55), PRINT)
box_cm("print glass", mx0, mx1, my0, my1, WALL_D - 3.0, WALL_D - 2.9, plain("print glass", (0.95, 0.97, 0.96), rough=0.05, transmission=1.0, ior=1.5))

# ── the shelf on two brackets, the clock radio on it ───────────────────────
sx, sy = 46, 122
box_cm("shelf", sx - 22, sx + 22, sy - 2.5, sy, WALL_D - 16, WALL_D, WALNUT_X, 0.5)
# (a bracket in profile: out from the wall under the shelf, its front cut in a quarter round)
PROFILE = [(0, 0), (13, 0)] + [(13 - 12 * math.sin(a), -12 + 12 * math.cos(a)) for a in (k * math.pi / 16 for k in range(1, 9))] + [(0, -12)]
for bx in (sx - 15, sx + 15):
    bk = bpy.data.meshes.new("bracket"); bm = bmesh.new()
    lo = [bm.verts.new(P(bx - 1.2, sy - 2.5 + py, WALL_D - px)) for px, py in PROFILE]
    hi = [bm.verts.new(P(bx + 1.2, sy - 2.5 + py, WALL_D - px)) for px, py in PROFILE]
    n_ = len(PROFILE)
    bm.faces.new(lo[::-1]); bm.faces.new(hi)
    for k in range(n_): bm.faces.new([lo[k], lo[(k + 1) % n_], hi[(k + 1) % n_], hi[k]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(bk); bm.free()
    o = link(bpy.data.objects.new("bracket", bk)); o.data.materials.append(WALNUT); bevel(o, M(0.3), 2)
rx, rd = sx, WALL_D - 9
box_cm("radio", rx - 14, rx + 14, sy, sy + 10.5, rd - 6, rd + 5, BLACK, 0.8)
for e in (-1, 1): box_cm("radio cheek", rx + e * 14 - (1.1 if e > 0 else 0), rx + e * 14 + (0 if e > 0 else 1.1), sy, sy + 10.5, rd - 6.2, rd + 5.2, WALNUT, 0.5)
box_cm("radio window", rx - 12, rx + 1, sy + 2.1, sy + 8.0, rd - 6.15, rd - 6.0, plain("radio glass", (0.004, 0.01, 0.006), rough=0.08, coat=1.0))
face_card(1, front(rx - 11.2, rx + 0.2, sy + 2.9, sy + 7.2, rd - 6.2))
for k in range(6): box_cm("grille", rx + 2.6, rx + 12, sy + 2.3 + k * 1.1, sy + 2.62 + k * 1.1, rd - 6.2, rd - 6.0, plain("grille", (0.25, 0.26, 0.28), rough=0.5, metal=0.6))
KNOB = plain("knob", (0.3, 0.31, 0.33), rough=0.3, metal=0.7)
for k in (-9, -6): lathe("knob", [(0, 0), (0.007, 0), (0.007, 0.008), (0, 0.009)], KNOB, at=tuple(P(rx + k, sy + 1.2, rd - 6.1)), steps=16).rotation_euler = (math.pi / 2, 0, 0)
glow_ = lamp("clock glow", "POINT", tuple(P(rx - 5.5, sy + 5, rd - 9)), energy=0.06, colour=(0.3, 1.0, 0.5), size=0.03); glow_.visible_glossy = False

# ── on the desk: the green banker's lamp, the only light ───────────────────
gx, gd = 22, 100
lathe("lamp foot", [(0, 0), (0.08, 0), (0.081, 0.01), (0.075, 0.018), (0.035, 0.03), (0.016, 0.04), (0.01, 0.05), (0.01, 0.3), (0, 0.3)], BRASS, at=tuple(P(gx, DESK_Y, gd)), steps=48)
tube("lamp arm", [(0, 0.29), (0.005, 0.4), (0.03, 0.455), (0.06, 0.462)], 0.0055, BRASS, at=tuple(P(gx, DESK_Y, gd)), rot=-math.pi / 2)
GREEN_GLASS = bpy.data.materials.new("green glass shade"); GREEN_GLASS.use_nodes = True
_g = GREEN_GLASS.node_tree.nodes["Principled BSDF"]; _g.inputs["Base Color"].default_value = (0.002, 0.03, 0.01, 1); _g.inputs["Roughness"].default_value = 0.08; _g.inputs["Coat Weight"].default_value = 1.0; _g.inputs["Coat Roughness"].default_value = 0.04
_g.inputs["Emission Color"].default_value = (0.05, 0.7, 0.2, 1); _g.inputs["Emission Strength"].default_value = float(arg("--shadeglow", "0.04"))
SHADE_Y, SHADE_D = DESK_Y + 39.5, gd - 6
def shade(name, r, half, over=0.12, n=40):
    """the shade: a tube lying across, a little more than its upper half,
    closed at its ends; green glass outside, white within"""
    me_ = bpy.data.meshes.new(name); bm_ = bmesh.new()
    arc = [(-over + (math.pi + 2 * over) * k / n) for k in range(n + 1)]
    ends = []
    for x in (-half, half):
        ends.append([bm_.verts.new(P(gx + x, SHADE_Y + r * math.sin(a), SHADE_D + r * math.cos(a))) for a in arc])
    for k in range(n): bm_.faces.new([ends[0][k], ends[0][k + 1], ends[1][k + 1], ends[1][k]])
    bm_.faces.new(ends[0]); bm_.faces.new(ends[1][::-1])
    bmesh.ops.recalc_face_normals(bm_, faces=bm_.faces); bm_.to_mesh(me_); bm_.free()
    o = link(bpy.data.objects.new(name, me_))
    o.data.materials.append(GREEN_GLASS); o.data.materials.append(plain("shade lining", (0.75, 0.72, 0.62), rough=0.5))
    for p in o.data.polygons: p.use_smooth = True
    th = o.modifiers.new("thick", "SOLIDIFY"); th.thickness = M(0.35); th.material_offset = 1; th.use_even_offset = True
    return o
SHADE = shade("green shade", 6.8, 14)
# (what the shade's glass shines with: a soft light up to the left, seen in it
# and nowhere else)
_sc = bpy.data.collections.new("shade only"); _sc.objects.link(SHADE)
shine = lamp("shade shine", "AREA", tuple(P(gx - 60, SHADE_Y + 70, SHADE_D - 70)), aim=tuple(P(gx, SHADE_Y, SHADE_D)), energy=float(arg("--shine", "40")), colour=(1.0, 0.9, 0.78), size=0.5, size_y=0.12)
shine.visible_camera = False; shine.visible_diffuse = False
shine.light_linking.receiver_collection = _sc
for e in (-1, 1):
    lathe("shade cap", [(0, 0), (0.012, 0), (0.012, 0.004), (0, 0.006)], BRASS, at=tuple(P(gx + e * 14.2, SHADE_Y + 0.6, SHADE_D)), steps=20).rotation_euler = (0, e * math.pi / 2, 0)
OFFICE_BULB = plain("office bulb", (1, 0.9, 0.7), emit=(1.0, 0.8, 0.5), strength=8)
bulb = cylinder("bulb", 0, 0, M(-9), M(9), M(1.3), OFFICE_BULB, verts=24)
bulb.rotation_euler = (0, math.pi / 2, 0); bulb.location = P(gx, SHADE_Y + 1.5, SHADE_D)
LAMP_AT = P(gx, SHADE_Y + 0.5, SHADE_D - 1.5)
lamp_l = lamp("the lamp", "AREA", tuple(LAMP_AT), aim=tuple(LAMP_AT - Vector((0, 0, 1))), energy=float(arg("--lamp", "11")), colour=(1.0, 0.8, 0.58), size=0.22, size_y=0.05)
rod("pull chain", P(gx + 9, SHADE_Y - 1, SHADE_D - 3), P(gx + 9, SHADE_Y - 10, SHADE_D - 3), M(0.1), BRASS, verts=6)
sphere("pull", tuple(P(gx + 9, SHADE_Y - 10.6, SHADE_D - 3)), M(0.5), BRASS)

# the mug of coffee
mgx, mgd = 38, 86
lathe("mug", [(0, 0), (0.039, 0), (0.041, 0.004), (0.042, 0.094), (0.0405, 0.097), (0.038, 0.094), (0.037, 0.012), (0, 0.012)], CERAMIC, at=tuple(P(mgx, DESK_Y, mgd)), steps=48)
cylinder("coffee", M(mgx), M(mgd), M(DESK_Y + 7.6), M(DESK_Y + 7.8), M(3.75), COFFEE, verts=48)
tube("mug handle", [(0.0, 0.078), (0.028, 0.074), (0.032, 0.04), (0.0, 0.026)], 0.0058, CERAMIC, at=tuple(P(mgx + 3.9, DESK_Y, mgd)), rot=math.radians(-20))
MUG_TOP = P(mgx, DESK_Y + 9.8, mgd)

# a glass with a sprig of periwinkle in it
vx, vd = 54, 104
lathe("bud vase", [(0, 0), (0.026, 0), (0.029, 0.025), (0.017, 0.09), (0.012, 0.12), (0.015, 0.13), (0, 0.13)], GLASS, at=tuple(P(vx, DESK_Y, vd)), steps=32)
import_model("periwinkle_plant", height=M(17), at=tuple(P(vx, DESK_Y + 10, vd)), rot=0.6, only="periwinkle_plant_01_LOD0")

# the alarm clock, the library's: black, its amber face behind smoked glass
ax, ad, at_ = -44, 104, math.radians(16)
assembled("alarm clock", lambda: (
    box_cm("alarm case", -6.8, 6.8, 0, 10, -4, 4, BLACK, 1.2, keep=False),
    box_cm("snooze bar", -4.4, 4.4, 10, 11.3, -2, 2, plain("grey", (0.12, 0.13, 0.15), rough=0.4), 0.4, keep=False),
    box_cm("alarm window", -5.6, 5.6, 2.6, 8.4, -4.15, -4.0, plain("smoked glass", (0.01, 0.006, 0.004), rough=0.08, coat=1.0), keep=False),
), at=(ax, DESK_Y, ad), turn=at_)
AF = framed((ax, DESK_Y, ad), at_)
face_card(2, [AF(-4.8, 3.5, -4.2), AF(4.8, 3.5, -4.2), AF(4.8, 7.4, -4.2), AF(-4.8, 7.4, -4.2)])
glow_ = lamp("clock glow", "POINT", tuple(AF(0, 5.5, -7)), energy=0.08, colour=(1.0, 0.5, 0.1), size=0.03); glow_.visible_glossy = False

# the travel clock, standing open in its leather case
tx, td, tt = -20, 86, math.radians(13)
assembled("travel clock", lambda: (
    box_cm("travel case", -5.4, 5.4, 0, 1.4, -3.2, 4, CASE_LEATHER, 0.5, keep=False),
    box_cm("travel back", -5.4, 5.4, 1.2, 10, 2.8, 4.2, CASE_LEATHER, 0.5, keep=False),
    box_cm("travel bezel", -4.6, 4.6, 1.8, 9.4, 1.9, 2.9, BRASS, 0.4, keep=False),
), at=(tx, DESK_Y, td), turn=tt)
TF = framed((tx, DESK_Y, td), tt)
face_card(3, [TF(-3.9, 3.9, 1.85), TF(3.9, 3.9, 1.85), TF(3.9, 6.8, 1.85), TF(-3.9, 6.8, 1.85)])

# ── the calculator, in the lamp's light ────────────────────────────────────
# Built in its own frame: x across it, d along it from its near edge, y up;
# its top slopes up from the keys to the display. Its keys as the puzzle has
# them (Overtime.js KEYPAD): column, row, how many of each they span.
KEYPAD = [("7", 0, 0, 1, 1), ("8", 1, 0, 1, 1), ("9", 2, 0, 1, 1), ("C", 3, 0, 1, 1),
          ("4", 0, 1, 1, 1), ("5", 1, 1, 1, 1), ("6", 2, 1, 1, 1), ("+", 3, 1, 1, 2),
          ("1", 0, 2, 1, 1), ("2", 1, 2, 1, 1), ("3", 2, 2, 1, 1),
          ("0", 0, 3, 2, 1), ("00", 2, 3, 1, 1), ("=", 3, 3, 1, 1)]
CW, CL, HF, HB = 17.0, 22.0, 1.3, 3.8           # its width, its length, its height at the near edge and the far
CX, CD, YAW = float(arg("--cx", "0")), float(arg("--cd", "64")), math.radians(float(arg("--yaw", "-6")))
TILT = math.atan2(HB - HF, CL)
CF = framed((CX, DESK_Y, CD), YAW)
def slope(d):
    return HF + (HB - HF) * d / CL
def on_top(x, d, lift=0.0):
    """a place on the calculator's sloping top (its own cm), `lift` above it"""
    return CF(x, slope(d) + lift, d)
CALC_BODY = plain("calculator body", (0.045, 0.047, 0.052), rough=0.42, coat=0.15)
PANEL = plain("calculator panel", (0.42, 0.42, 0.43), rough=0.38, metal=0.85)
KEY_DARK = plain("key", (0.06, 0.062, 0.068), rough=0.34, coat=0.3)
KEY_RED = plain("key red", (0.4, 0.055, 0.04), rough=0.34, coat=0.3)
KEY_GREY = plain("key grey", (0.24, 0.245, 0.26), rough=0.34, coat=0.3)
LABEL = plain("key label", (0.82, 0.82, 0.78), rough=0.5)
LABEL_DARK = plain("key label dark", (0.03, 0.03, 0.035), rough=0.5)
LCD_GLASS = plain("lcd glass", (0.4, 0.44, 0.36), rough=0.3, coat=0.3)
calc_root = bpy.data.objects.new("calculator", None); link(calc_root)
calc_root.location = P(CX, DESK_Y, CD); calc_root.rotation_euler = (0, 0, YAW)
def held(o):
    o.parent = calc_root; return o
def wedge(name, x0, x1, d0, d1, lift, thick, mat, r=0.2, sloped=True):
    """a piece lying on the sloping top, `lift` over it, `thick` deep — or,
    `sloped` False, a block from the desk up whose top is the slope itself"""
    me_ = bpy.data.meshes.new(name); bm_ = bmesh.new()
    cs = [(x0, d0), (x1, d0), (x1, d1), (x0, d1)]
    lo = [bm_.verts.new(P(x, slope(d) + lift if sloped else 0, d)) for x, d in cs]
    hi = [bm_.verts.new(P(x, slope(d) + lift + (thick if sloped else 0), d)) for x, d in cs]
    for f_ in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
        bm_.faces.new([(lo + hi)[i] for i in f_])
    bmesh.ops.recalc_face_normals(bm_, faces=bm_.faces); bm_.to_mesh(me_); bm_.free()
    o = held(link(bpy.data.objects.new(name, me_))); o.data.materials.append(mat)
    if r: bevel(o, M(r), 3)
    return o
wedge("calculator body", -CW / 2, CW / 2, 0, CL, 0, 0, CALC_BODY, 0.6, sloped=False)
# the panel round the display: brushed metal, the display in its black
# bezel under the window, a strip of solar cells
LCD = dict(u0=1.6, u1=CW - 1.6, d0=CL - 6.4, d1=CL - 2.9)
wedge("calculator panel", 0.5 - CW / 2, CW / 2 - 0.5, LCD["d0"] - 1.2, CL - 0.5, 0.0, 0.25, PANEL, 0.25)
wedge("display bezel", LCD["u0"] - 0.4 - CW / 2, LCD["u1"] + 0.4 - CW / 2, LCD["d0"] - 0.4, LCD["d1"] + 0.4, 0.25, 0.05, plain("display bezel", (0.02, 0.02, 0.022), rough=0.4), 0)
wedge("display glass", LCD["u0"] - CW / 2, LCD["u1"] - CW / 2, LCD["d0"], LCD["d1"], 0.3, 0.04, LCD_GLASS, 0)
wedge("solar cells", 1.5, CW / 2 - 1.6, CL - 2.3, CL - 1.0, 0.25, 0.05, plain("solar cell", (0.05, 0.03, 0.045), rough=0.15, coat=0.8), 0)
# the keys: a grid of caps on the slope, the + tall, the 0 wide
KG = dict(x0=-CW / 2 + 1.3, x1=CW / 2 - 1.3, d0=1.3, d1=LCD["d0"] - 2.0, gap=0.6)
cw_ = (KG["x1"] - KG["x0"] - 3 * KG["gap"]) / 4
cd_ = (KG["d1"] - KG["d0"] - 3 * KG["gap"]) / 4
CAP_H = 0.7
KEY_CAPS = {}
try: KEY_FONT = bpy.data.fonts.load("C:/Windows/Fonts/arialbd.ttf")
except Exception: KEY_FONT = None
for key, c, r, cs, rs in KEYPAD:
    x0 = KG["x0"] + c * (cw_ + KG["gap"]); x1 = x0 + cs * cw_ + (cs - 1) * KG["gap"]
    # (rows run from the far end, 7 8 9 C, to the near, 0 00 =)
    d1 = KG["d1"] - r * (cd_ + KG["gap"]); d0 = d1 - rs * cd_ - (rs - 1) * KG["gap"]
    grey = key in ("+", "=")
    wedge(f"key {key}", x0, x1, d0, d1, 0.0, CAP_H, KEY_RED if key == "C" else KEY_GREY if grey else KEY_DARK, 0.24)
    KEY_CAPS[key] = (x0, x1, d0, d1)
    # its figure, printed on the cap
    t = bpy.data.curves.new(f"label {key}", "FONT"); t.body = key; t.size = M(1.0 if len(key) == 1 else 0.8)
    if KEY_FONT: t.font = KEY_FONT
    t.align_x = "CENTER"; t.align_y = "CENTER"
    lab = held(link(bpy.data.objects.new(f"label {key}", t))); lab.data.materials.append(LABEL_DARK if grey else LABEL)
    mx_, md_ = (x0 + x1) / 2, (d0 + d1) / 2
    lab.location = P(mx_, slope(md_) + CAP_H + 0.015, md_)
    lab.rotation_euler = (TILT, 0, 0)

# the pad of paper beside it, the pencil across it
assembled("notepad", lambda: (
    box_cm("pad backing", -8.2, 8.2, 0, 0.45, -12.2, 12.2, plain("card", (0.3, 0.26, 0.2), rough=0.8), 0.15, keep=False),
    card("notepad", [P(-8, 0.5, -12), P(8, 0.5, -12), P(8, 0.5, 12), P(-8, 0.5, 12)], PAPER),
), at=(26, DESK_Y, 78), turn=math.radians(-12))
PENCIL = plain("pencil yellow", (0.6, 0.4, 0.06), rough=0.4)
pc = cylinder("pencil", 0, 0, -M(8.5), M(8.5), M(0.36), PENCIL, verts=6)
pc.rotation_euler = (0, math.pi / 2, math.radians(24)); pc.location = P(27, DESK_Y + 0.86, 74)
for name_, z0_, z1_, r_, mat_, v_, r2_ in (("pencil tip", 8.5, 10.3, 0.36, plain("cedar", (0.6, 0.45, 0.3), rough=0.6), 6, 0.0003),
                                           ("pencil end", -9.4, -8.5, 0.37, plain("ferrule", (0.5, 0.45, 0.3), rough=0.3, metal=0.8), 12, None)):
    o = cylinder(name_, 0, 0, M(z0_), M(z1_), M(r_), mat_, verts=v_, r2=r2_)
    o.rotation_euler = pc.rotation_euler; o.location = pc.location

# ── the room behind us, dim (what the glass and the brass catch of it) ─────
box_cm("wall behind", -250, 250, 0, TOP, -190, -170, WALL_BEHIND)
def books_behind():
    bookcase(RNG, 0, 1, 0, 122, 232, WALNUT, WALNUT_X, SPINES, COVERS, PAGES, depth=32, levels=(10, 52, 94, 136, 178, 220, 228), bays=2)
assembled("bookcase behind", books_behind, at=(-130, 0, -170), turn=-math.pi / 2)
for (a, b_, c, e) in ((4, 42, 116, 120), (4, 42, 176, 180), (4, 8, 116, 180), (38, 42, 116, 180)):
    box_cm("print frame", a, b_, c, e, -170, -167.5, WALNUT_X, 0.4)
card("print behind", [P(38, 120, -168.6), P(8, 120, -168.6), P(8, 176, -168.6), P(38, 176, -168.6)], PRINT)

# ── light: the lamp; a little of the night on the walls ────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.002, 0.0025, 0.004, 1)
fill_l = lamp("fill", "AREA", tuple(P(0, 205, 10)), aim=tuple(P(0, 105, WALL_D)), energy=float(arg("--fill", "6")), colour=(0.8, 0.85, 1.0), size=1.6)
fill_l.visible_camera = False; fill_l.visible_glossy = False
back_l = lamp("on the walls", "AREA", tuple(P(0, 230, -40)), aim=tuple(P(-30, 150, -170)), energy=float(arg("--behind", "14")), colour=(0.8, 0.85, 1.0), size=1.6)
back_l.visible_camera = False; back_l.visible_glossy = False
clear_glass()

# ── where everything the game keeps alive fell in the picture ──────────────
bpy.context.view_layer.update()
keys = {}
for key, *_ in KEYPAD:
    x0, x1, d0, d1 = KEY_CAPS[key]; i_ = 0.2
    # (near left, near right, far right, far left: as one looking down on it sees them, lower left first)
    q = [on_top(x, d, CAP_H) for x, d in ((x0 + i_, d0 + i_), (x1 - i_, d0 + i_), (x1 - i_, d1 - i_), (x0 + i_, d1 - i_))]
    keys[key] = {"quad": [list(project(p)) for p in q], "center": list(project(on_top((x0 + x1) / 2, (d0 + d1) / 2, CAP_H)))}
# the display's figures: a band inside its glass, lower left first, and its
# size in cm along the glass (v up, toward the far end)
BAND = dict(u0=LCD["u0"] + 0.6 - CW / 2, u1=LCD["u1"] - 0.6 - CW / 2, d0=LCD["d0"] + 0.5, d1=LCD["d1"] - 0.5)
band = [on_top(BAND["u0"], BAND["d0"], 0.34), on_top(BAND["u1"], BAND["d0"], 0.34), on_top(BAND["u1"], BAND["d1"], 0.34), on_top(BAND["u0"], BAND["d1"], 0.34)]
colons = []
for o, i, cs in COLONS:
    ps = [project(c) for c in cs]
    x0_, y0_ = math.floor(min(p[0] for p in ps)) - 2, math.floor(min(p[1] for p in ps)) - 2
    colons.append({"clock": i, "box": [x0_, y0_, math.ceil(max(p[0] for p in ps)) + 2 - x0_, math.ceil(max(p[1] for p in ps)) + 2 - y0_]})
# (what must stay on screen: the four clocks and the calculator)
SAFE = [c for o, _, _ in COLONS for c in object_corners(o)] + [CF(x, y, d) for x in (-CW / 2, CW / 2) for d in (0, CL) for y in (0, slope(d))]
data = {
    "version": 1, "width": RW, "height": RH, "safe": box_of(SAFE, pad=16),
    "keys": keys,
    "lcd": {"corners": [list(project(p)) for p in band], "w": round(BAND["u1"] - BAND["u0"], 3), "h": round((BAND["d1"] - BAND["d0"]) / math.cos(TILT), 3)},
    "colons": colons,
    "steam": [*project(MUG_TOP), scale_at(MUG_TOP)],
}
with open(os.path.join(OUT, "officeRender.json"), "w") as f: json.dump(data, f, indent=1)
if arg("--probe", ""):
    for pair in arg("--probe", "").split(";"):
        probe(*map(float, pair.split(",")))
    for o in bpy.data.objects:
        if o.name.startswith("green shade") or o.name.startswith("desk leather"): print("SLOTS", o.name, [m.name for m in o.data.materials])
    raise SystemExit

# ── render: the colons out, then lit ───────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "0.35")))
finish(scene, SAMPLES, keep_gloss=("green glass shade", "glass", "print glass", "clock bezel", "clock case", "red filter", "radio glass", "smoked glass",
                                   "lcd glass", "ceramic", "coffee", "key", "key red", "key grey", "calculator panel", "solar cell") + GLOSSY_FACES)
def colons_lit(on):
    for o, i, _ in COLONS: o.data.materials[0] = FACES[i][1 if on else 0]
if STILL:
    colons_lit(STILL == "lit"); render(scene, os.path.join(OUT, "still.png"))
else:
    colons_lit(False); render(scene, os.path.join(OUT, "plate.png"))
    colons_lit(True); render(scene, os.path.join(OUT, "lit.png"))
print("OFFICE_DONE")
