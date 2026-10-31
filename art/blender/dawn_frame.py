# Before Sunrise (levels/wires), close to: the picture on Room IV's back wall
# — the dawn over the country (dawn_country.py's render) in its old gilt frame
# on the lime plaster, the brass picture light over it alight, as the room has
# them (room_counting.py) — seen standing in front of it.
#
# Rendered: the plate; and what must stay on screen (dawnFrame.json: the
# picture).
#
#   blender -b --factory-startup -P art/blender/dawn_frame.py -- [--samples 512] [--width 2560]

import bpy, bmesh, math, os, sys, json
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *

OUT = os.path.join(ROOT, ".artifacts/dawn-frame")
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "512"))
WIDTH = int(arg("--width", "2560"))
PICTURE = os.path.join(ROOT, ".artifacts/dawn-country/picture.png")

# ── the wall, and the picture on it (cm: x across, y up, d away; the wall at d = 0)
PW, PH = 114.0, 114.0 * 9 / 16                    # the picture, as the room hangs it
FR = 9.0                                          # the moulding's width
CY = 150.0                                        # the picture's middle, up the wall
EYE = (0.0, CY + float(arg("--ey", "8")), -float(arg("--dist", "232")))
scene, HEIGHT = stage(WIDTH, eye=EYE, look=(0.0, CY + 6, 0.0), lens=float(arg("--lens", "50")))

PLASTER = scan("lime plaster", "white_plaster_rough_01", size=1.6, tint=(0.95, 0.88, 0.76), bright=0.8, sat=0.45, rough=(0.8, 0.95), bump=0.6)
GILT = aged_metal("frame gilt", (0.66, 0.5, 0.24), (0.16, 0.07, 0.035), rough=(0.25, 0.5), scale=60, tarnish=0.55)
BRASS = aged_metal("brass", (0.58, 0.41, 0.18), (0.08, 0.06, 0.03), rough=(0.22, 0.5), scale=30, tarnish=0.5)
box_cm("wall", -200, 200, 0, 320, 0, 20, PLASTER)

def canvas_print(path):
    """the picture: the render printed on fine canvas, under a thin varnish"""
    m = bpy.data.materials.new("the picture"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(path, check_existing=True); t.interpolation = "Cubic"
    L(t.outputs["Color"], b.inputs["Base Color"])
    tc = N.new("ShaderNodeTexCoord"); w = N.new("ShaderNodeTexWave"); w.wave_type = "BANDS"; w.inputs["Scale"].default_value = 900
    L(tc.outputs["UV"], w.inputs["Vector"])
    w2 = N.new("ShaderNodeTexWave"); w2.wave_type = "BANDS"; w2.bands_direction = "Y"; w2.inputs["Scale"].default_value = 520
    L(tc.outputs["UV"], w2.inputs["Vector"])
    add = N.new("ShaderNodeMath"); add.operation = "ADD"; L(w.outputs["Fac"], add.inputs[0]); L(w2.outputs["Fac"], add.inputs[1])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.08; bp.inputs["Distance"].default_value = 0.0002
    L(add.outputs["Value"], bp.inputs["Height"]); L(bp.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.6; b.inputs["Coat Weight"].default_value = 0.15; b.inputs["Coat Roughness"].default_value = 0.35
    return m
x0, x1, y0, y1 = -PW / 2, PW / 2, CY - PH / 2, CY + PH / 2
card("picture", [P(x0, y0, -2.2), P(x1, y0, -2.2), P(x1, y1, -2.2), P(x0, y1, -2.2)], canvas_print(PICTURE))

def moulding(x0, x1, y0, y1, profile, mat):
    """a frame swept round the picture's edge: `profile` (in, out) cm — in from
    the outside edge, out from the wall — mitred at its four corners"""
    me = bpy.data.meshes.new("frame"); bm = bmesh.new()
    corners_ = [(x0 - FR, y0 - FR, 1, 1), (x1 + FR, y0 - FR, -1, 1), (x1 + FR, y1 + FR, -1, -1), (x0 - FR, y1 + FR, 1, -1)]
    rings = [[bm.verts.new(P(cx + sx * u, cy + sy * u, -o)) for (u, o) in profile] for (cx, cy, sx, sy) in corners_]
    for k in range(4):
        a, b = rings[k], rings[(k + 1) % 4]
        for i in range(len(profile) - 1):
            bm.faces.new((a[i], b[i], b[i + 1], a[i + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("frame", me)); o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    return o
# (an old gilt moulding: a bead at the outside, a hollow, a raised band of
# leaves worn smooth, a step down to a sight edge)
PROFILE = [(0.0, 0.0), (0.0, 3.2), (0.4, 4.6), (1.2, 5.4), (2.0, 5.2), (2.6, 4.3), (3.6, 3.8), (4.6, 4.2), (5.4, 5.0), (6.2, 5.3),
           (7.0, 4.6), (7.6, 3.6), (8.2, 3.3), (8.8, 2.9), (FR, 2.4), (FR, 2.2)]
moulding(x0, x1, y0, y1, PROFILE, GILT)

# the picture light over it: a brass hood on an arm from the wall
LY = y1 + FR + 9
tube("light arm", [(0, 0), (0.06, 0.04), (0.11, 0.035)], 0.004, BRASS, at=tuple(P(0, LY - 4, 0)), rot=-math.pi / 2)
hood = cylinder("picture light", 0, 0, M(-34), M(34), M(3.0), BRASS, verts=32)
hood.rotation_euler = (0, math.pi / 2, 0); hood.location = P(0, LY + 0.5, -11)
boolean_cut(hood, box("cut", M(-40), M(40), M(-13), M(-9), M(LY - 4), M(LY + 0.3), BRASS))
hood.modifiers.new("thick", "SOLIDIFY").thickness = M(0.25)
BULB = plain("picture light tube", (1, 0.9, 0.7), emit=(1.0, 0.82, 0.55), strength=8)
box_cm("picture light tube", -30, 30, LY - 0.6, LY, -11.5, -10.5, BULB)
light = lamp("picture light", "AREA", tuple(P(0, LY + 2, -26)), aim=tuple(P(0, CY - 8, -1)), energy=float(arg("--light", "16")), colour=(1.0, 0.8, 0.55), size=0.62, size_y=0.08)
light.visible_camera = False

# the room's own dark round it: the green lamp far off, the moon's grey
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.005, 0.01, 1)
fill = lamp("fill", "AREA", tuple(P(60, 170, -240)), aim=tuple(P(0, CY, 0)), energy=float(arg("--fill", "30")), colour=(0.8, 0.85, 1.0), size=1.8)
fill.visible_camera = False; fill.visible_glossy = False
desk = lamp("the green lamp", "POINT", tuple(P(-180, 115, -260)), energy=float(arg("--desk", "30")), colour=(1.0, 0.8, 0.52), size=0.05)

bpy.context.view_layer.update()
pic = [P(x, y, -2.2) for x in (x0, x1) for y in (y0, y1)]
layout = {"version": 1, "width": RW, "height": RH, "safe": box_of(pic, pad=6), "picture": [list(project(p)) for p in (P(x0, y1, -2.2), P(x1, y1, -2.2), P(x1, y0, -2.2), P(x0, y0, -2.2))]}
with open(os.path.join(OUT, "dawnFrame.json"), "w") as fh: json.dump(layout, fh, indent=1)

cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "0.2")), glare=False)
finish(scene, SAMPLES, keep_gloss=("the picture",))
render(scene, os.path.join(OUT, "plate.png"))
print("FRAME_DONE", layout["safe"])
