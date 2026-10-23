# The rooms under the roof (XII, XIII): what their shell is built of. In the
# room's centimetres (room_common.py): the floor of wide boards, knee walls of
# bare boards up to the eaves, the roof pitched over on its rafters, and the
# two gable ends — the far one with a window let into it.

import bpy, bmesh, math
from mathutils import Vector
from kit import *
from room_common import *
from room_furnish import *

def gable(name, x0, x1, eaves, ridge, d0, d1, mat):
    """a gable end: the wall's five-sided face, from the floor to the eaves
    either side and up to the ridge, `d0`–`d1` thick"""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    xm = (x0 + x1) / 2
    outline = [(x0, 0), (x1, 0), (x1, eaves), (xm, ridge), (x0, eaves)]
    front = [bm.verts.new(tuple(P(x, y, d0))) for x, y in outline]
    back = [bm.verts.new(tuple(P(x, y, d1))) for x, y in outline]
    bm.faces.new(front); bm.faces.new(list(reversed(back)))
    for i in range(5):
        j = (i + 1) % 5; bm.faces.new((front[i], front[j], back[j], back[i]))
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    return arch(o)

def attic_shell(x0, x1, d1, eaves, ridge, floor_mat, board_mat, roof_mat, rafter_mat, d0=-40):
    """the attic, the near gable (behind us) and the far one returned to cut a window in"""
    box_cm("floor", x0 - 20, x1 + 20, -6, 0, d0, d1 + 20, floor_mat)
    for (a, b) in ((x0 - 20, x0), (x1, x1 + 20)):
        box_cm("knee wall", a, b, 0, eaves + 8, d0, d1 + 20, board_mat)
    pitched_roof(x0, x1, d0, d1, eaves, ridge, roof_mat, rafter_mat)
    gable("near gable", x0 - 20, x1 + 20, eaves, ridge + 20, d0 - 25, d0, board_mat)
    far = gable("far gable", x0 - 20, x1 + 20, eaves, ridge + 20, d1, d1 + 25, board_mat)
    # (the knee walls' posts, standing under the rafters' feet)
    for d in range(int(d0) + 20, int(d1), 60):
        for x in (x0, x1):
            xa, xb = sorted((x, x + (8 if x == x0 else -8)))
            box_cm("knee post", xa, xb, 0, eaves, d - 5, d + 5, rafter_mat, 0.8)
    return far

def leaded_window_in(wall, x, hw, sill, top, d1, depth, frame, lead, glass):
    """a small leaded window let into a wall at d `d1`, `depth` thick; returns
    its pane (Blender points) for the rain"""
    x0, x1 = x - hw, x + hw
    boolean_cut(wall, box("cut", M(x0), M(x1), M(d1 - 10), M(d1 + depth + 20), M(sill), M(top), frame))
    gd = d1 + depth - 8
    casement = box_cm("casement", x0, x1, sill, top, gd - 2.5, gd + 2.5, frame, 0.4)
    boolean_cut(casement, box("cut", M(x0 + 4), M(x1 - 4), M(gd - 5), M(gd + 5), M(sill + 4), M(top - 4), frame))
    box_cm("leaded glass", x0 + 4, x1 - 4, sill + 4, top - 4, gd - 0.2, gd + 0.2, glass)
    box_cm("sill", x0 - 4, x1 + 4, sill - 4, sill, d1 - 6, d1 + depth - 4, frame, 0.6)
    for k in range(-12, 13):
        for e in (-1, 1):
            a_ = (x + k * 8 - 60 * e, sill - 40); b_ = (x + k * 8 + 60 * e, top + 40)
            t0, t1 = 0.0, 1.0
            for p, q in ((-(b_[0] - a_[0]), a_[0] - (x0 + 4)), (b_[0] - a_[0], (x1 - 4) - a_[0]), (-(b_[1] - a_[1]), a_[1] - (sill + 4)), (b_[1] - a_[1], (top - 4) - a_[1])):
                if p == 0: continue
                r = q / p
                if p < 0: t0 = max(t0, r)
                else: t1 = min(t1, r)
            if t0 < t1:
                arch(rod("came", P(a_[0] + (b_[0] - a_[0]) * t0, a_[1] + (b_[1] - a_[1]) * t0, gd - 0.3), P(a_[0] + (b_[0] - a_[0]) * t1, a_[1] + (b_[1] - a_[1]) * t1, gd - 0.3), M(0.35), lead, verts=6))
    return [P(px, py, gd) for px, py in ((x0 + 4, sill + 4), (x1 - 4, sill + 4), (x1 - 4, top - 4), (x0 + 4, top - 4))]

def steamer_trunk(name, w, dp, h, at, turn, canvas, leather, brass, lid=None):
    """an old trunk: canvas over boards, wooden slats, leather straps, brass
    corners and lock; `lid` open by so many radians"""
    def build():
        box_cm("trunk", -w / 2, w / 2, 3, h * 0.72, -dp / 2, dp / 2, canvas, 0.8, keep=False)
        hinge = bpy.data.objects.new("trunk lid", None); link(hinge); hinge.location = P(0, h * 0.72, dp / 2)
        lidbox = box_cm("trunk lid", -w / 2, w / 2, 0, h * 0.28, -dp, 0, canvas, 0.8, keep=False); lidbox.parent = hinge
        for x in (-w / 2 + 6, w / 2 - 6):
            box_cm("slat", x - 2.5, x + 2.5, 3, h * 0.72, -dp / 2 - 0.6, dp / 2 + 0.6, scan(f"{name} slat", "dark_wood", size=0.6, bright=0.45, rough=(0.5, 0.8)), 0.3, keep=False)
            box_cm("strap", x + 8 - 2, x + 8 + 2, 3, h * 0.72, -dp / 2 - 0.4, dp / 2 + 0.4, leather, 0.2, keep=False)
            s = box_cm("strap on the lid", x + 8 - 2, x + 8 + 2, 0, h * 0.28 + 0.3, -dp - 0.4, 0.3, leather, 0.2, keep=False); s.parent = hinge
        for x in (-w / 2, w / 2):
            for z in (3, h * 0.72 - 5):
                for d in (-dp / 2, dp / 2):
                    box_cm("brass corner", x - 2, x + 2, z, z + 5, d - 2, d + 2, brass, 0.5, keep=False)
        box_cm("lock", -4, 4, h * 0.6, h * 0.72, -dp / 2 - 0.8, -dp / 2, brass, 0.4, keep=False)
        for e in (-1, 1): box_cm("handle", e * w / 2 - (0 if e < 0 else 1.5), e * w / 2 + (1.5 if e < 0 else 0), h * 0.45, h * 0.5, -6, 6, leather, 0.3, keep=False)
        if lid: hinge.rotation_euler = (-lid, 0, 0)
    root = assembled(name, build, at=at, turn=turn)
    return root
