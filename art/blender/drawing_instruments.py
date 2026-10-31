# What is in the parcel under the tree (The Lit Tree, levels/pi): a boxwood
# rule, a brass protractor and a pair of compasses — each built about its own
# middle, lying flat (x along it, y up, d across, in the room's cm).

import bpy, bmesh, math
import numpy as np
from mathutils import Vector
from kit import *
from room_common import P, M, box_cm

def ticks_image(name, w, h, marks, ink=(0.08, 0.06, 0.04)):
    """a strip of graduations as a picture: `marks` (u 0–1 along it, length
    0–1 across it), drawn from its lower edge"""
    img = bpy.data.images.new(name, w, h, alpha=False)
    px = np.ones((h, w, 4), dtype=np.float32)
    for (u, ln) in marks:
        x = int(u * (w - 3)) + 1
        px[: max(1, int(ln * h)), x:x + 2, :3] = ink
    img.pixels.foreach_set(px.ravel()); img.pack()
    return img

def rule(boxwood):
    """a 30 cm boxwood rule, its inches and centimetres cut and inked"""
    L, W, T = 31.0, 3.2, 0.32
    o = box_cm("rule", -L / 2, L / 2, 0, T, -W / 2, W / 2, boxwood, 0.08, keep=False)
    marks = [(k / 300, 0.55 if k % 10 == 0 else 0.35 if k % 5 == 0 else 0.2) for k in range(301)]
    img = ticks_image("rule ticks", 2048, 64, marks)
    m = bpy.data.materials.new("rule face"); m.use_nodes = True
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    t = N.new("ShaderNodeTexImage"); t.image = img
    mul = N.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
    mul.inputs[6].default_value = (0.62, 0.47, 0.27, 1); Lk(t.outputs["Color"], mul.inputs[7]); Lk(mul.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.5
    face = card_flat("rule face", -L / 2 + 0.5, L / 2 - 0.5, T + 0.005, -W / 2 + 0.05, -W / 2 + 1.1, m)
    return [o, face]

def card_flat(name, x0, x1, y, d0, d1, mat):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    f = bm.faces.new([bm.verts.new(P(x, y, d)) for x, d in ((x0, d0), (x1, d0), (x1, d1), (x0, d1))])
    for lp, c in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): lp[uv].uv = c
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    return o

def protractor(brass):
    """a brass protractor: a half disc with a half-round hole, degrees cut
    round its edge"""
    R, r, T = 7.5, 3.4, 0.18
    me = bpy.data.meshes.new("protractor"); bm = bmesh.new()
    n = 48
    outer = [bm.verts.new(P(math.cos(math.pi * k / n) * R, 0, math.sin(math.pi * k / n) * R)) for k in range(n + 1)]
    inner = [bm.verts.new(P(math.cos(math.pi * k / n) * r, 0, math.sin(math.pi * k / n) * r)) for k in range(n + 1)]
    for k in range(n): bm.faces.new((outer[k], outer[k + 1], inner[k + 1], inner[k]))
    base_l = [bm.verts.new(P(-R, 0, -0.6)), bm.verts.new(P(R, 0, -0.6))]
    bm.faces.new((base_l[0], base_l[1], outer[0], inner[0], inner[-1], outer[-1]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("protractor", me)); o.data.materials.append(brass)
    sol = o.modifiers.new("thick", "SOLIDIFY"); sol.thickness = M(T); sol.offset = 1.0; bevel(o, M(0.04), 1)   # (up from the boards it lies on)
    ticks = []
    for k in range(0, 181, 5):
        a = math.radians(k); ln = 0.9 if k % 10 == 0 else 0.5
        t = box_cm("degree", -0.03, 0.03, T + 0.005, T + 0.02, 0, ln, plain("engraving", (0.05, 0.035, 0.02), rough=0.6), keep=False)
        t.location = P(math.cos(a) * (R - ln - 0.15), 0, math.sin(a) * (R - ln - 0.15)); t.rotation_euler = (0, 0, a - math.pi / 2)
        t.location.z = M(T + 0.005); ticks.append(t)
    return [o] + ticks

def compasses(steel, brass):
    """a pair of compasses lying open: two steel legs from a brass head, a
    point on one, a pencil lead held in the other"""
    parts = []
    head = Vector(P(0, 0.6, 0))
    for (ang, tip) in ((-0.22, "point"), (0.22, "lead")):
        end = head + Vector(P(math.sin(ang) * 11 + 0, 0, -math.cos(ang) * 11)) - Vector(P(0, 0.6, 0)) + Vector(P(0, 0.25, 0))
        leg = cylinder("compass leg", 0, 0, 0, M(11), M(0.22), steel, verts=10, r2=M(0.16))
        leg.location = head; leg.rotation_euler = (end - head).to_track_quat("Z", "Y").to_euler(); parts.append(leg)
        cap = cylinder("compass tip", 0, 0, 0, M(0.9), M(0.16), steel if tip == "point" else plain("lead", (0.04, 0.04, 0.045), rough=0.4), verts=8, r2=M(0.01))
        cap.location = end; cap.rotation_euler = (end - head).to_track_quat("Z", "Y").to_euler(); parts.append(cap)
    hd = cylinder("compass head", 0, 0, M(-0.5), M(0.5), M(0.75), brass, verts=24); hd.location = head; hd.rotation_euler = (math.pi / 2, 0, 0); parts.append(hd)
    grip = cylinder("compass grip", 0, 0, 0, M(1.6), M(0.22), brass, verts=12); grip.location = head; grip.rotation_euler = (0, -math.pi / 2, 0); parts.append(grip)
    return parts
