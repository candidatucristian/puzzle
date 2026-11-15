# Silas's desk (2026-11-05): one set, seen three ways. Room II became the
# baby's nursery (room_nursery.py), and its corner keeps the desk two puzzles
# are found on, so the room and both close-ups show the same things:
#
#   room_nursery.py         the whole room, the desk in its far left corner
#   overtime_office.py      After Hours: the desk from its chair
#   modem_room.py           Room Beneath the Desk: the router (built here,
#                           stood on the toy chest by room_nursery.py)
#
# Run by room_nursery.py (runpy), into the scene it is building. Everything
# here is built in the desk's own frame — the centimetres the office close-up
# was drawn in: x across, y up from the floor, d away from the eye in the
# chair; the wall at d = WALL_D — and the nursery stands the whole of it in
# its corner (one translation, nothing turned). What the close-ups need back
# (every clock face and its colon, the calculator's keys and display, the
# coffee, the lamp, the router's lenses) is left in this module's namespace.
#
# The desk is After Hours' (overtime_office.py until 2026-11-05: the walnut
# desk, its green leather, the green banker's lamp, the four clocks, the
# calculator built key by key from the level's KEYPAD, the mug, the sprig of
# periwinkle, the ruled pad), made to stand in a room — 180 cm long, on two
# pedestals of drawers. The router is Room Beneath the Desk's (modem_room.py's
# graphite router, its five counter lenses and seven data lenses), a fifth
# smaller. It is built here with Silas's other things but no longer stands on
# the desk: room_nursery.py puts it on the toy chest by the right wall, apart
# from the desk and its clocks (since 2026-11-06, the user asked; it stood on
# the desk until then, by the lamp and then at the left end), and runs its
# leads there.

import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *

DRAWN = os.path.join(ROOT, ".artifacts/rooms")        # room_boards.mjs, clock_faces.mjs
scene = bpy.context.scene
_before_materials = set(bpy.data.materials)
_before_objects = set(bpy.data.objects)

# ── the desk's frame (cm) ──────────────────────────────────────────────────
DESK_Y, WALL_D, DESK_FRONT = 76, 125, 20
DX0, DX1 = -90, 90                                    # the desk's ends
BACK = WALL_D - 3.6                                   # clear of the panelling behind it

# ── materials ──────────────────────────────────────────────────────────────
WALNUT = scan("desk walnut", "rosewood_veneer1", size=0.9, tint=(0.55, 0.38, 0.27), bright=0.42, sat=0.8, rough=(0.3, 0.55), bump=0.25, coat=0.15, upright=True)
WALNUT_X = scan("desk walnut across", "rosewood_veneer1", size=0.9, tint=(0.55, 0.38, 0.27), bright=0.4, sat=0.8, rough=(0.3, 0.55), bump=0.25, coat=0.15)
DESK_WOOD = scan("desk mahogany", "dark_wood", size=1.1, tint=(0.66, 0.46, 0.34), bright=0.4, sat=0.7, rough=(0.38, 0.6), bump=0.3, coat=0.08, edges=0.35, dust=0.15)
DESK_WOOD_UP = scan("desk mahogany upright", "dark_wood", size=1.1, tint=(0.66, 0.46, 0.34), bright=0.4, sat=0.7, rough=(0.38, 0.6), bump=0.3, coat=0.08, edges=0.35, dust=0.15, upright=True)
DESK_LEATHER = scan("desk leather", "brown_leather", size=0.45, tint=(0.13, 0.24, 0.15), bright=0.3, sat=1.0, rough=(0.5, 0.75), bump=0.45, stains=0.25)
BRASS = aged_metal("desk brass", (0.55, 0.39, 0.17), (0.08, 0.055, 0.025), rough=(0.22, 0.5), scale=40, tarnish=0.5)
BLACK = plain("desk black plastic", (0.015, 0.015, 0.017), rough=0.35, coat=0.2)
# (the wall clock's case brushed aluminium, its bezel bright chrome)
CLOCK_CASE = plain("clock case", (0.5, 0.51, 0.53), rough=0.38, metal=0.9)
CLOCK_BEZEL = plain("clock bezel", (0.72, 0.72, 0.74), rough=0.22, metal=1.0)
GLASS = plain("desk glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
CERAMIC = plain("ceramic", (0.28, 0.26, 0.22), rough=0.3, coat=0.08)
# (a stoneware glaze, darkening where the mug stands on the desk and toward
#  its foot, as a real one does in the shadow it makes on what it stands on)
def _sat_low(m):
    nt = m.node_tree; N = nt.nodes; b = N["Principled BSDF"]
    ao = N.new("ShaderNodeAmbientOcclusion"); ao.inputs["Distance"].default_value = 0.035; ao.inputs["Color"].default_value = (*b.inputs["Base Color"].default_value[:3], 1)
    ramp = N.new("ShaderNodeMapRange"); ramp.inputs["To Min"].default_value = 0.35
    nt.links.new(ao.outputs["AO"], ramp.inputs["Value"])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs["Factor"].default_value = 1.0
    mix.inputs[6].default_value = b.inputs["Base Color"].default_value
    c = N.new("ShaderNodeCombineXYZ"); [nt.links.new(ramp.outputs["Result"], c.inputs[i]) for i in range(3)]
    nt.links.new(c.outputs["Vector"], mix.inputs[7]); nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    return m
_sat_low(CERAMIC)
FOOT = plain("unglazed foot", (0.16, 0.13, 0.1), rough=0.85)
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
PRINT = picture("botanical print", os.path.join(DRAWN, "study-print.png"), rough=0.9)

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
COLONS = []                                    # each face's card, its clock, and the corners of the colon on it
def face_card(i, corners_):
    """a face laid on its card, lower left first; where its colon is on it
    (in clock_faces.mjs's picture: across 0.47–0.55, up 0.24–0.76)"""
    o = card(f"face {i}", corners_, FACES[i][1])
    bl, br, tr, tl = [Vector(c) for c in corners_]
    at = lambda u, v: bl + (br - bl) * u + (tl - bl) * v
    COLONS.append((o, i, [at(0.45, 0.2), at(0.575, 0.2), at(0.575, 0.8), at(0.45, 0.8)]))
    return o
def colons_lit(on):
    """every face with its colon on, or off (the room shows them on)"""
    for o, i, _ in COLONS: o.data.materials[0] = FACES[i][1 if on else 0]
def front(x0, x1, y0, y1, d):
    return [P(x0, y0, d), P(x1, y0, d), P(x1, y1, d), P(x0, y1, d)]

# ── the desk: a top with its leather let in, on two pedestals of drawers ───
box_cm("desk top", DX0, DX1, DESK_Y - 3.5, DESK_Y, DESK_FRONT, BACK, DESK_WOOD, 0.8)
box_cm("desk apron", DX0 + 40, DX1 - 40, DESK_Y - 13, DESK_Y - 3.5, DESK_FRONT + 1, DESK_FRONT + 3, DESK_WOOD, 0.6)
box_cm("knee drawer", DX0 + 46, DX1 - 46, DESK_Y - 12, DESK_Y - 4.5, DESK_FRONT + 0.4, DESK_FRONT + 1.2, DESK_WOOD_UP, 0.5)
for e in (-1, 1):
    k0, k1 = (DX0 + 1, DX0 + 40) if e < 0 else (DX1 - 40, DX1 - 1)
    box_cm("desk pedestal", k0, k1, 6, DESK_Y - 3.5, DESK_FRONT + 2, BACK - 1, DESK_WOOD_UP, 0.6)
    box_cm("pedestal plinth", k0 + 1, k1 - 1, 0, 6, DESK_FRONT + 3, BACK - 2, DESK_WOOD, 0.4)
    for y0, y1 in ((9, 31), (33, 51), (53, 70)):
        box_cm("drawer front", k0 + 2, k1 - 2, y0, y1, DESK_FRONT + 1.2, DESK_FRONT + 2, DESK_WOOD_UP, 0.5)
        lathe("drawer pull", [(0, 0), (0.009, 0), (0.011, 0.008), (0.006, 0.014), (0, 0.016)], BRASS, at=tuple(P((k0 + k1) / 2, (y0 + y1) / 2, DESK_FRONT + 1.2)), steps=20).rotation_euler = (math.pi / 2, 0, 0)
# (the writing leather let into the top, flush with it, a gilt line tooled round it)
LX0, LX1, LD0, LD1 = -78, 78, DESK_FRONT + 6, WALL_D - 22
box_cm("desk leather", LX0, LX1, DESK_Y - 0.5, DESK_Y + 0.02, LD0, LD1, DESK_LEATHER, 0.1)
TOOLED = aged_metal("tooled gilt", (0.5, 0.36, 0.14), (0.12, 0.08, 0.03), rough=(0.35, 0.6), scale=80, tarnish=0.7)
for (a, b_, c, e) in ((LX0 + 1.6, LX1 - 1.6, LD0 + 1.6, LD0 + 1.85), (LX0 + 1.6, LX1 - 1.6, LD1 - 1.85, LD1 - 1.6), (LX0 + 1.6, LX0 + 1.85, LD0 + 1.6, LD1 - 1.6), (LX1 - 1.85, LX1 - 1.6, LD0 + 1.6, LD1 - 1.6)):
    box_cm("tooled line", a, b_, DESK_Y + 0.02, DESK_Y + 0.03, c, e, TOOLED)

# ── on the wall: the LED clock, its lead down over the dado to the desk ────
ck = dict(x=-46, y0=131, y1=142, w=24, deep=6)
kx0, kx1, ky0, ky1, KF = ck["x"] - ck["w"] / 2, ck["x"] + ck["w"] / 2, ck["y0"], ck["y1"], WALL_D - ck["deep"]
box_cm("wall clock", kx0, kx1, ky0, ky1, KF + 0.8, WALL_D, CLOCK_CASE, 1.6)
for (a, b_, c, e) in ((kx0, kx1, ky0, ky0 + 1.6), (kx0, kx1, ky1 - 1.6, ky1), (kx0, kx0 + 1.6, ky0, ky1), (kx1 - 1.6, kx1, ky0, ky1)):
    box_cm("clock bezel", a, b_, c, e, KF, KF + 1.3, CLOCK_BEZEL, 0.45)
box_cm("clock glass", kx0 + 1.6, kx1 - 1.6, ky0 + 1.6, ky1 - 1.6, KF + 0.6, KF + 0.9, plain("red filter", (0.03, 0.004, 0.003), rough=0.06, coat=1.0))
kyc = (ky0 + ky1) / 2
face_card(0, front(ck["x"] - 8, ck["x"] + 8, kyc - 3, kyc + 3, KF + 0.55))
COLON_0 = P(ck["x"], kyc, KF + 0.5)
for bx in (kx1 - 7, kx1 - 4):
    box_cm("clock button", bx - 1.1, bx + 1.1, ky1 - 0.3, ky1 + 0.6, KF + 1.8, KF + 4, plain("clock button", (0.1, 0.1, 0.11), rough=0.4), 0.25)
cu = bpy.data.curves.new("lead", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = M(0.22); cu.bevel_resolution = 3
spl = cu.splines.new("BEZIER"); spl.bezier_points.add(4)
_lead_pts = (
    P(kx1 - 3.0, ky0 + 0.5, WALL_D - 1.4),
    P(kx1 - 2.0, 117.0, WALL_D - 0.8),
    P(kx1 - 0.8, 102.5, WALL_D - 1.2),
    P(kx1 + 0.4, 98.0, WALL_D - 5.0),
    P(kx1 + 1.8, DESK_Y, WALL_D - 4.8),
)
for bp_, v in zip(spl.bezier_points, _lead_pts):
    bp_.co = v; bp_.handle_left_type = bp_.handle_right_type = "AUTO"
link(bpy.data.objects.new("lead", cu)).data.materials.append(BLACK)
bpy.context.view_layer.update()
for i_, bp_ in enumerate(spl.bezier_points):
    max_y = M(WALL_D - 0.6) if i_ <= 2 else M(WALL_D - 4.8)
    bp_.handle_left_type = bp_.handle_right_type = "FREE"
    bp_.co.y = min(bp_.co.y, max_y)
    bp_.handle_left.y = min(bp_.handle_left.y, max_y)
    bp_.handle_right.y = min(bp_.handle_right.y, max_y if i_ != 2 else M(WALL_D - 2.0))
CLOCK_GLOWS = [lamp("clock glow", "AREA", tuple(P(ck["x"], kyc, KF - 1.5)), aim=tuple(P(ck["x"], kyc - 12, KF - 40)), energy=0.6, colour=(1.0, 0.06, 0.03), size=0.16, size_y=0.05)]
CLOCK_GLOWS[-1].visible_camera = False; CLOCK_GLOWS[-1].visible_glossy = False

# ── a botanical print of hers, behind glass, in a walnut frame ─────────────
mx0, mx1, my0, my1, FR = -19, 19, 112.5, 145.5, 4
for (a, b_, c, e) in ((mx0 - FR, mx1 + FR, my0 - FR, my0), (mx0 - FR, mx1 + FR, my1, my1 + FR), (mx0 - FR, mx0, my0, my1), (mx1, mx1 + FR, my0, my1)):
    box_cm("print frame", a, b_, c, e, WALL_D - 3.6, WALL_D, WALNUT_X if e - c < FR + 1 else WALNUT, 1.2)
for (a, b_, c, e) in ((mx0 - 0.6, mx1 + 0.6, my0 - 0.6, my0), (mx0 - 0.6, mx1 + 0.6, my1, my1 + 0.6), (mx0 - 0.6, mx0, my0, my1), (mx1, mx1 + 0.6, my0, my1)):
    box_cm("print slip", a, b_, c, e, WALL_D - 3.9, WALL_D - 2, BRASS, 0.2)
MOUNT = paper("print mount", (0.5, 0.47, 0.4), 0.15)
card("print mount", front(mx0, mx1, my0, my1, WALL_D - 2.5), MOUNT)
ph = (mx1 - mx0 - 6) * 860 / 1200; pyc = (my0 + my1) / 2
card("botanical print", front(mx0 + 3, mx1 - 3, pyc - ph / 2, pyc + ph / 2, WALL_D - 2.55), PRINT)
box_cm("print glass", mx0, mx1, my0, my1, WALL_D - 3.0, WALL_D - 2.9, plain("print glass", (0.95, 0.97, 0.96), rough=0.05, transmission=1.0, ior=1.5))

# ── the shelf on two brackets, the clock radio on it ───────────────────────
sx, sy = 46, 122
box_cm("shelf", sx - 22, sx + 22, sy - 2.5, sy, WALL_D - 16, WALL_D, WALNUT_X, 0.5)
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
CLOCK_GLOWS.append(lamp("clock glow", "POINT", tuple(P(rx - 5.5, sy + 5, rd - 9)), energy=0.15, colour=(0.3, 1.0, 0.5), size=0.03)); CLOCK_GLOWS[-1].visible_glossy = False

# ── on the desk: the green banker's lamp ───────────────────────────────────
gx, gd = 22, 100
lathe("lamp foot", [(0, 0), (0.08, 0), (0.081, 0.01), (0.075, 0.018), (0.035, 0.03), (0.016, 0.04), (0.01, 0.05), (0.01, 0.3), (0, 0.3)], BRASS, at=tuple(P(gx, DESK_Y, gd)), steps=48)
tube("lamp arm", [(0, 0.29), (0.005, 0.4), (0.03, 0.455), (0.06, 0.462)], 0.0055, BRASS, at=tuple(P(gx, DESK_Y, gd)), rot=-math.pi / 2)
GREEN_GLASS = bpy.data.materials.new("green glass shade"); GREEN_GLASS.use_nodes = True
_g = GREEN_GLASS.node_tree.nodes["Principled BSDF"]; _g.inputs["Base Color"].default_value = (0.002, 0.03, 0.01, 1); _g.inputs["Roughness"].default_value = 0.08; _g.inputs["Coat Weight"].default_value = 1.0; _g.inputs["Coat Roughness"].default_value = 0.04
_g.inputs["Emission Color"].default_value = (0.05, 0.7, 0.2, 1); _g.inputs["Emission Strength"].default_value = 0.04
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
#  and nowhere else)
_sc = bpy.data.collections.new("shade only"); _sc.objects.link(SHADE)
SHINE = lamp("shade shine", "AREA", tuple(P(gx - 60, SHADE_Y + 70, SHADE_D - 70)), aim=tuple(P(gx, SHADE_Y, SHADE_D)), energy=40, colour=(1.0, 0.9, 0.78), size=0.5, size_y=0.12)
SHINE.visible_camera = False; SHINE.visible_diffuse = False
SHINE.light_linking.receiver_collection = _sc
for e in (-1, 1):
    lathe("shade cap", [(0, 0), (0.012, 0), (0.012, 0.004), (0, 0.006)], BRASS, at=tuple(P(gx + e * 14.2, SHADE_Y + 0.6, SHADE_D)), steps=20).rotation_euler = (0, e * math.pi / 2, 0)
OFFICE_BULB = plain("office bulb", (1, 0.9, 0.7), emit=(1.0, 0.8, 0.5), strength=8)
bulb = cylinder("bulb", 0, 0, M(-9), M(9), M(1.3), OFFICE_BULB, verts=24)
bulb.rotation_euler = (0, math.pi / 2, 0); bulb.location = P(gx, SHADE_Y + 1.5, SHADE_D)
LAMP_AT = P(gx, SHADE_Y + 0.5, SHADE_D - 1.5)
LAMP = lamp("the lamp", "AREA", tuple(LAMP_AT), aim=tuple(LAMP_AT - Vector((0, 0, 1))), energy=4, colour=(1.0, 0.8, 0.58), size=0.22, size_y=0.09)
rod("pull chain", P(gx + 9, SHADE_Y - 1, SHADE_D - 3), P(gx + 9, SHADE_Y - 10, SHADE_D - 3), M(0.1), BRASS, verts=6)
sphere("pull", tuple(P(gx + 9, SHADE_Y - 10.6, SHADE_D - 3)), M(0.5), BRASS)

# the mug of coffee
mgx, mgd = 38, 86
lathe("mug", [(0, 0), (0.039, 0), (0.041, 0.004), (0.042, 0.094), (0.0405, 0.097), (0.038, 0.094), (0.037, 0.012), (0, 0.012)], CERAMIC, at=tuple(P(mgx, DESK_Y, mgd)), steps=48)
cf_ = cylinder("coffee", 0, 0, M(7.6), M(7.8), M(3.75), COFFEE, verts=48); cf_.location = P(mgx, DESK_Y, mgd)
tube("mug handle", [(0.0, 0.078), (0.028, 0.074), (0.032, 0.04), (0.0, 0.026)], 0.0058, CERAMIC, at=tuple(P(mgx + 3.9, DESK_Y, mgd)), rot=math.radians(-20))
lathe("mug foot", [(0.0365, 0.0), (0.0392, 0.0), (0.0399, 0.0026), (0.0368, 0.0026)], FOOT, at=tuple(P(mgx, DESK_Y - 0.01, mgd)), steps=48)
MUG_TOP = P(mgx, DESK_Y + 9.8, mgd)

# a glass with a sprig of periwinkle in it
vx, vd = 46, 110
lathe("bud vase", [(0, 0), (0.026, 0), (0.029, 0.025), (0.017, 0.09), (0.012, 0.12), (0.015, 0.13), (0, 0.13)], GLASS, at=tuple(P(vx, DESK_Y, vd)), steps=32)
import_model("periwinkle_plant", height=M(17), at=tuple(P(vx, DESK_Y + 10, vd)), rot=0.6, only="periwinkle_plant_01_LOD0")

# the alarm clock: black, its amber face behind smoked glass
ax, ad, at_ = -40, 104, math.radians(16)
assembled("alarm clock", lambda: (
    box_cm("alarm case", -6.8, 6.8, 0, 10, -4, 4, BLACK, 1.2, keep=False),
    box_cm("snooze bar", -4.4, 4.4, 10, 11.3, -2, 2, plain("grey", (0.12, 0.13, 0.15), rough=0.4), 0.4, keep=False),
    box_cm("alarm window", -5.6, 5.6, 2.6, 8.4, -4.15, -4.0, plain("smoked glass", (0.01, 0.006, 0.004), rough=0.08, coat=1.0), keep=False),
), at=(ax, DESK_Y, ad), turn=at_)
AF = framed((ax, DESK_Y, ad), at_)
face_card(2, [AF(-4.8, 3.5, -4.2), AF(4.8, 3.5, -4.2), AF(4.8, 7.4, -4.2), AF(-4.8, 7.4, -4.2)])
CLOCK_GLOWS.append(lamp("clock glow", "POINT", tuple(AF(0, 5.5, -7)), energy=0.2, colour=(1.0, 0.5, 0.1), size=0.03)); CLOCK_GLOWS[-1].visible_glossy = False

# the travel clock, standing open in its leather case
tx, td, tt = -20, 86, math.radians(13)
assembled("travel clock", lambda: (
    box_cm("travel case", -5.4, 5.4, 0, 1.4, -3.2, 4, CASE_LEATHER, 0.5, keep=False),
    box_cm("travel back", -5.4, 5.4, 1.2, 10, 2.8, 4.2, CASE_LEATHER, 0.5, keep=False),
    box_cm("travel bezel", -4.6, 4.6, 1.8, 9.4, 1.9, 2.9, BRASS, 0.4, keep=False),
), at=(tx, DESK_Y, td), turn=tt)
TF = framed((tx, DESK_Y, td), tt)
face_card(3, [TF(-3.9, 3.9, 1.85), TF(3.9, 3.9, 1.85), TF(3.9, 6.8, 1.85), TF(-3.9, 6.8, 1.85)])

# ── the calculator ─────────────────────────────────────────────────────────
# Built in its own frame: x across it, d along it from its near edge, y up;
# its top slopes up from the keys to the display. Its keys as the puzzle has
# them (Overtime.js KEYPAD): column, row, how many of each they span.
KEYPAD = [("7", 0, 0, 1, 1), ("8", 1, 0, 1, 1), ("9", 2, 0, 1, 1), ("C", 3, 0, 1, 1),
          ("4", 0, 1, 1, 1), ("5", 1, 1, 1, 1), ("6", 2, 1, 1, 1), ("+", 3, 1, 1, 2),
          ("1", 0, 2, 1, 1), ("2", 1, 2, 1, 1), ("3", 2, 2, 1, 1),
          ("0", 0, 3, 2, 1), ("00", 2, 3, 1, 1), ("=", 3, 3, 1, 1)]
CW, CL, HF, HB = 17.0, 22.0, 1.3, 3.8           # its width, its length, its height at the near edge and the far
CX, CD, YAW = 0.0, 64.0, math.radians(-6)
TILT = math.atan2(HB - HF, CL)
CF = framed((CX, DESK_Y, CD), YAW)
def slope(d):
    return HF + (HB - HF) * d / CL
def on_top(x, d, lift=0.0):
    """a place on the calculator's sloping top (its own cm), `lift` above it"""
    return CF(x, slope(d) + lift, d)
CALC_BODY = plain("calculator body", (0.045, 0.047, 0.052), rough=0.42, coat=0.15)
PANEL = plain("calculator panel", (0.42, 0.42, 0.43), rough=0.38, metal=0.85)
# (matte keys, dark, their figures large and white: read from the chair)
KEY_DARK = plain("key", (0.03, 0.031, 0.035), rough=0.55)
KEY_RED = plain("key red", (0.36, 0.04, 0.03), rough=0.55)
KEY_GREY = plain("key grey", (0.11, 0.112, 0.12), rough=0.55)
LABEL = plain("key label", (0.92, 0.92, 0.88), rough=0.6)
LCD_GLASS = plain("lcd glass", (0.56, 0.61, 0.5), rough=0.35)
calc_root = bpy.data.objects.new("calculator", None); link(calc_root)
calc_root.location = P(CX, DESK_Y, CD); calc_root.rotation_euler = (0, 0, YAW)
def held(o):
    o.parent = calc_root; return o
def wedge(name, x0, x1, d0, d1, lift, thick, mat, r=0.2, sloped=True):
    """a piece lying on the sloping top, `lift` over it, `thick` deep — or,
    `sloped` False, a block from the desk up whose top is the slope itself
    (in the calculator's own frame: about the origin, its root stands it)"""
    me_ = bpy.data.meshes.new(name); bm_ = bmesh.new()
    cs = [(x0, d0), (x1, d0), (x1, d1), (x0, d1)]
    lo = [bm_.verts.new(Vector((x / 100, d / 100, (slope(d) + lift if sloped else 0) / 100))) for x, d in cs]
    hi = [bm_.verts.new(Vector((x / 100, d / 100, (slope(d) + lift + (thick if sloped else 0)) / 100))) for x, d in cs]
    for f_ in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
        bm_.faces.new([(lo + hi)[i] for i in f_])
    bmesh.ops.recalc_face_normals(bm_, faces=bm_.faces); bm_.to_mesh(me_); bm_.free()
    o = held(link(bpy.data.objects.new(name, me_))); o.data.materials.append(mat)
    if r: bevel(o, M(r), 3)
    return o
wedge("calculator body", -CW / 2, CW / 2, 0, CL, 0, 0, CALC_BODY, 0.6, sloped=False)
LCD = dict(u0=1.2, u1=CW - 1.2, d0=CL - 7.6, d1=CL - 2.8)
wedge("calculator panel", 0.5 - CW / 2, CW / 2 - 0.5, LCD["d0"] - 1.2, CL - 0.5, 0.0, 0.25, PANEL, 0.25)
wedge("display bezel", LCD["u0"] - 0.4 - CW / 2, LCD["u1"] + 0.4 - CW / 2, LCD["d0"] - 0.4, LCD["d1"] + 0.4, 0.25, 0.05, plain("display bezel", (0.02, 0.02, 0.022), rough=0.4), 0)
wedge("display glass", LCD["u0"] - CW / 2, LCD["u1"] - CW / 2, LCD["d0"], LCD["d1"], 0.3, 0.04, LCD_GLASS, 0)
wedge("solar cells", 1.5, CW / 2 - 1.6, CL - 2.3, CL - 1.0, 0.25, 0.05, plain("solar cell", (0.05, 0.03, 0.045), rough=0.15, coat=0.8), 0)
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
    t = bpy.data.curves.new(f"label {key}", "FONT"); t.body = key; t.size = M(1.85 if len(key) == 1 else 1.4); t.extrude = M(0.02)
    if KEY_FONT: t.font = KEY_FONT
    t.align_x = "CENTER"; t.align_y = "CENTER"
    lab = held(link(bpy.data.objects.new(f"label {key}", t))); lab.data.materials.append(LABEL)
    mx_, md_ = (x0 + x1) / 2, (d0 + d1) / 2
    lab.location = Vector((mx_ / 100, md_ / 100, (slope(md_) + CAP_H + 0.015) / 100))
    lab.rotation_euler = (TILT, 0, 0)

# the pad of paper beside it, the pencil across it
assembled("notepad", lambda: (
    box_cm("pad backing", -8.2, 8.2, 0, 0.45, -12.2, 12.2, plain("card", (0.3, 0.26, 0.2), rough=0.8), 0.15, keep=False),
    card("notepad", [Vector((-0.08, -0.12, 0.005)), Vector((0.08, -0.12, 0.005)), Vector((0.08, 0.12, 0.005)), Vector((-0.08, 0.12, 0.005))], PAPER),
), at=(26, DESK_Y, 78), turn=math.radians(-12))
PENCIL = plain("pencil yellow", (0.6, 0.4, 0.06), rough=0.4)
pc = cylinder("pencil", 0, 0, -M(8.5), M(8.5), M(0.36), PENCIL, verts=6)
pc.rotation_euler = (0, math.pi / 2, math.radians(24)); pc.location = P(27, DESK_Y + 0.86, 74)
for name_, z0_, z1_, r_, mat_, v_, r2_ in (("pencil tip", 8.5, 10.3, 0.36, plain("cedar", (0.6, 0.45, 0.3), rough=0.6), 6, 0.0003),
                                           ("pencil end", -9.4, -8.5, 0.37, plain("ferrule", (0.5, 0.45, 0.3), rough=0.3, metal=0.8), 12, None)):
    o = cylinder(name_, 0, 0, M(z0_), M(z1_), M(r_), mat_, verts=v_, r2=r2_)
    o.rotation_euler = pc.rotation_euler; o.location = pc.location

# (the clocks' own light: soft, from where the room's dim light comes, on
#  their cases, glass and screens alone — so they read as clocks, not as
#  figures hanging in the dark)
CLOCK_PARTS = ("wall clock", "clock bezel", "clock glass", "clock button", "lead", "radio", "radio cheek", "radio window", "grille", "knob",
               "alarm", "snooze", "travel", "face ")
_clocks = bpy.data.collections.new("the clocks")
for o in scene.objects:
    if o in _before_objects or o.type not in ("MESH", "CURVE"): continue
    if o.name.split(".")[0].startswith(CLOCK_PARTS): _clocks.objects.link(o)
CLOCK_LIGHT = lamp("on the clocks", "AREA", tuple(P(-10, 175, 25)), aim=tuple(P(0, 120, WALL_D)), energy=9, colour=(1.0, 0.86, 0.7), size=1.2)
CLOCK_LIGHT.visible_camera = False; CLOCK_LIGHT.light_linking.receiver_collection = _clocks

# ── the router (room_nursery.py stands it on the toy chest) ───────────────
# modem_room.py's (built there in metres about its own foot), here a fifth
# smaller, left at the frame's origin for the room to place. Twelve lenses:
# five counters, a gap, seven data lights; each its own material and its own
# small light, so each can be lit alone (modem_room.py renders them one by one).
RB = plain("Router | fine stippled graphite ABS", (.040, .042, .040), rough=.38, coat=.12)
_bs = RB.node_tree.nodes["Principled BSDF"]; _n = RB.node_tree.nodes; _l = RB.node_tree.links.new
_tc = _n.new("ShaderNodeTexCoord"); _noise = _n.new("ShaderNodeTexNoise"); _noise.inputs["Scale"].default_value = 2300; _noise.inputs["Detail"].default_value = 2; _l(_tc.outputs["Object"], _noise.inputs["Vector"])
_bump = _n.new("ShaderNodeBump"); _bump.inputs["Strength"].default_value = .16; _bump.inputs["Distance"].default_value = .000045; _l(_noise.outputs["Fac"], _bump.inputs["Height"]); _l(_bump.outputs["Normal"], _bs.inputs["Normal"])
_rough = _n.new("ShaderNodeMapRange"); _rough.inputs["To Min"].default_value = .31; _rough.inputs["To Max"].default_value = .43; _l(_noise.outputs["Fac"], _rough.inputs["Value"]); _l(_rough.outputs[0], _bs.inputs["Roughness"])
RFACE = plain("Router | inset satin face panel", (.016, .019, .018), rough=.31, coat=.22)
RLENS = plain("LED | smoked green optical lens, unlit", (.040, .085, .058), rough=.30, coat=.22)
RUBBER = plain("Cable and feet | aged black rubber", (.009, .010, .011), rough=.68)
IRON = plain("Screws | dark steel", (.025, .026, .027), rough=.37, metal=.74)
INK = plain("Lettering | aged ivory screen print", (.57, .53, .42), rough=.72)
SANS = bpy.data.fonts.load("C:/Windows/Fonts/arial.ttf", check_existing=True)
LED_GREEN = (.035, 1, .16)
ROUTER_SCALE = 0.8
_router_before = set(bpy.data.objects)
def _slab(name, x0, x1, y0, y1, z0, z1, mat, r=.001):
    ob = box(name, x0, x1, y0, y1, z0, z1, mat)
    if r: bevel(ob, r, 3)
    return ob
def _rod(name, a, b, r, mat, r2=None):
    a, b = Vector(a), Vector(b)
    ob = cylinder(name, 0, 0, 0, (b - a).length, r, mat, verts=32, r2=r2)
    ob.location = a; ob.rotation_euler = (b - a).to_track_quat("Z", "Y").to_euler()
    return ob
def _cable(name, coords, r, mat):
    cu_ = bpy.data.curves.new(name, "CURVE"); cu_.dimensions = "3D"; cu_.bevel_depth = r; cu_.bevel_resolution = 4; cu_.resolution_u = 32; cu_.use_fill_caps = True
    sp = cu_.splines.new("BEZIER"); sp.bezier_points.add(len(coords) - 1)
    for bp, co in zip(sp.bezier_points, coords): bp.co = co; bp.handle_left_type = bp.handle_right_type = "AUTO"
    ob = link(bpy.data.objects.new(name, cu_)); cu_.materials.append(mat); return ob
# (in its own metres, its foot's middle at the origin, its front toward -y)
x0, x1 = -.205, .205; y0, y1 = -.105, .105; z0, z1 = .007, .077
_slab("Router | rounded lower enclosure", x0, x1, y0, y1, z0, z0 + .047, RB, .005)
_slab("Router | continuous front fascia", x0 + .003, x1 - .003, y0 - .001, y0 + .008, z0 + .005, z1 - .008, RFACE, .0025)
_slab("Router | top front lip", x0, x1, y0, y0 + .068, z1 - .020, z1, RB, .004)
_slab("Router | top rear lip", x0, x1, y1 - .027, y1, z1 - .020, z1, RB, .004)
for xx in (x0, x1 - .024): _slab("Router | top side lip", xx, xx + .024, y0 + .061, y1 - .022, z1 - .020, z1, RB, .003)
_slab("Router | dark interior under vents", x0 + .021, x1 - .021, y0 + .062, y1 - .020, z1 - .023, z1 - .020, RFACE, .001)
for i in range(40):
    xx = x0 + .024 + i * (.362 / 40)
    _slab("Router | separate moulded vent rib", xx, xx + .0042, y0 + .065, y1 - .024, z1 - .009, z1 - .001, RB, .001)
for xx in (x0 + .035, x1 - .035):
    for yy in (y0 + .028, y1 - .030):
        cylinder("Router | rubber isolating foot", xx, yy, 0, .010, .009, RUBBER, verts=32)
        if yy > 0:
            cylinder("Router | rear screw head", xx, yy, z1, z1 + .0004, .002, IRON, verts=24)
            _slab("Router | screw slot", xx - .0013, xx + .0013, yy - .0003, yy + .0003, z1 + .0004, z1 + .0005, RFACE, .0001)
for side in (-1, 1):
    xx = side * .155; yy = y1 - .014
    _rod("Router | antenna hinge", (xx, yy, z1 - .018), (xx, yy, z1 + .013), .007, RB)
    _rod("Router | tapered aerial", (xx, yy, z1 + .007), (xx + side * .012, yy + .012, z1 + .175), .0052, RB, r2=.0037)
    sphere("Router | rounded aerial tip", (xx + side * .012, yy + .012, z1 + .175), .0037, RB)
LEDS = []
xs = [-.160 + i * .023 for i in range(5)] + [-.022 + i * .023 for i in range(7)]
for i, xx in enumerate(xs):
    zz = z0 + .034
    _slab("LED %02d | recessed black bezel" % i, xx - .0058, xx + .0058, y0 - .0025, y0 - .0008, zz - .0041, zz + .0041, RUBBER, .0017)
    lens_mat = RLENS.copy(); lens_mat.name = "LED %02d | independently driven optical lens" % i
    lens = _slab("LED %02d | real translucent diffuser" % i, xx - .0037, xx + .0037, y0 - .0031, y0 - .0026, zz - .0022, zz + .0022, lens_mat, .0012)
    light = lamp("LED %02d | local reflected light" % i, "POINT", (xx, y0 - .007, zz), energy=0, colour=(1, 1, 1), size=.002)
    LEDS.append({"material": lens_mat, "light": light, "lens": lens, "colour": "green"})
_t = bpy.data.curves.new("Router | original maker clue", "FONT"); _t.body = "W. LEIBNIZ"; _t.font = SANS; _t.size = .0095; _t.align_x = "CENTER"; _t.align_y = "CENTER"; _t.resolution_u = 12
_to = link(bpy.data.objects.new("Router | original maker clue", _t)); _t.materials.append(INK); _to.location = (0, y0 - .002, z0 + .012); _to.rotation_euler = (math.pi / 2, 0, 0)
_slab("Router | power connector", .165, .181, y1 - .003, y1 + .014, z0 + .020, z0 + .033, RFACE, .001)
ROUTER = bpy.data.objects.new("Router (Room Beneath the Desk)", None); link(ROUTER)
for o in [o for o in bpy.data.objects if o not in _router_before and o.parent is None and o is not ROUTER]: o.parent = ROUTER
ROUTER.scale = (ROUTER_SCALE,) * 3
# where its leads go in (in its own metres), and a lead for the room to run
# from them once it has stood the router where it goes
ROUTER_PLUGS = {"power": Vector((.173, y1 + .010, z0 + .027)), "network": Vector((-.08, y1, z0 + .028))}
def router_lead(name, coords, r):
    return _cable(name, coords, r * ROUTER_SCALE, RUBBER)
def led_centre(i):
    """the middle of a lens's face, where it stands"""
    e = LEDS[i]["lens"]; bpy.context.view_layer.update()
    return sum((e.matrix_world @ Vector(c) for c in e.bound_box), Vector()) / 8
def led_on(i, on, strength=1.1, light=.0016):
    e = LEDS[i]; b = e["material"].node_tree.nodes["Principled BSDF"]
    b.inputs["Emission Color"].default_value = (*LED_GREEN, 1); b.inputs["Emission Strength"].default_value = strength if on else 0
    e["light"].data.color = LED_GREEN; e["light"].data.energy = light * ROUTER_SCALE ** 2 if on else 0

# ── what the room and the close-ups look up ────────────────────────────────
OVERTIME_NAMES = ("wall clock", "clock bezel", "clock glass", "radio", "radio cheek", "alarm case", "snooze bar", "travel case", "travel back", "travel bezel", "face 0", "face 1", "face 2", "face 3")
MATERIALS = [m for m in bpy.data.materials if m not in _before_materials]
KEEP_GLOSS = tuple(m.name for m in MATERIALS if m.name.split(".")[0] in (
    "green glass shade", "desk glass", "print glass", "clock bezel", "clock case", "red filter", "radio glass", "smoked glass",
    "lcd glass", "ceramic", "coffee", "key", "key red", "key grey", "calculator panel", "solar cell") or m.name.startswith(("clock face", "LED ")))
LIGHTS = [LAMP, SHINE, CLOCK_LIGHT, *CLOCK_GLOWS]
print("SILAS DESK BUILT:", len(COLONS), "faces,", len(KEY_CAPS), "keys,", len(LEDS), "lenses", flush=True)
