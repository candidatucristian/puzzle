# The Trophy Wall (levels/flags): the five medal ribbons, as silk — corded
# grosgrain in its country's colours (medal_ribbons.mjs), come over the
# shelf's front edge, hanging down soft and a little waved, gathered in at the
# foot into the medal's ring. Seen straight on, in the trophy wall's light
# (the lamp warm from the upper left, the window cold on the right), on
# nothing: the game hangs each from the shelf and the medal from it
# (flags/trophies.js), so it sways as one piece.
#
# Each is drawn in the box trophies.js gives its ribbon (in its units: 46
# across and its length, with 3 spare each side and 16 over the top, 3 below).
#
#   node art/blender/medal_ribbons.mjs
#   blender -b --factory-startup -P art/blender/medal_ribbons.py -- [--samples 192] [--px 8]
#   node art/blender/medals_publish.mjs

import bpy, bmesh, math, sys, os
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import ROOT

OUT = os.path.join(ROOT, ".artifacts/medals-real")
SAMPLES = int(arg("--samples", "192"))
PX = int(arg("--px", "8"))                      # pixels to one of trophies.js's units
LONG = {"DE": 150, "BR": 92, "IE": 104, "FI": 98, "NG": 92}   # (trophies.js lens)
W, OVER = 46, 14                               # the ribbon's width; how much of it lies over the shelf's edge
K = 0.001                                      # (a unit is a millimetre)

def ribbon(code, length):
    scene = fresh()
    total = length + OVER
    nu, nv = 24, int(total * 1.2)
    me = bpy.data.meshes.new(code); bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
    grid = []
    for j in range(nv + 1):
        v = total * j / nv                       # (down from its top edge)
        line = []
        for i in range(nu + 1):
            s = i / nu                           # (across, 0 at its left)
            # gathered in at its foot toward the ring, softly pleated there
            g = max(0.0, (v - (total - 34)) / 34)
            half = W / 2 * (1 - 0.16 * g * g)
            x = (s - 0.5) * 2 * half
            y = 0.0
            y += (1.7 * math.sin(2 * math.pi * (v / 46 + 0.15)) * (0.3 + 0.7 * (s - 0.5) * 2) + 0.6 * math.sin(2 * math.pi * (v / 19 + s * 0.4))) * min(1.0, max(0.0, (v - OVER) / 10))
            y += g * g * 2.2 * math.sin(s * math.pi * 3)
            z = -v
            if v < OVER:                         # (flat on the shelf's front, its top edge turned back over it)
                y = 0.55 * max(0.0, 2.2 - v) ** 2
            line.append(bm.verts.new((x * K, y * K, z * K)))
        grid.append(line)
    for j in range(nv):
        for i in range(nu):
            f = bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            for lp, (ii, jj) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                lp[uvl].uv = (ii / nu, 1 - jj / nv)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(code, me))
    for p in o.data.polygons: p.use_smooth = True
    sol = o.modifiers.new("silk", "SOLIDIFY"); sol.thickness = 0.4 * K; sol.offset = 1.0

    # the silk: its colours, the cords of the grosgrain across it, a sheen
    m = bpy.data.materials.new("silk " + code); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    im = N.new("ShaderNodeTexImage"); im.image = bpy.data.images.load(os.path.join(OUT, f"ribbon-{code}.png")); im.interpolation = "Cubic"
    L(tc.outputs["UV"], im.inputs["Vector"])
    cords = N.new("ShaderNodeTexWave"); cords.wave_type = "BANDS"; cords.bands_direction = "Z"; cords.inputs["Scale"].default_value = 1.0 / (0.55 * K) / (2 * math.pi) * math.pi
    cords.inputs["Distortion"].default_value = 0.6; cords.inputs["Detail"].default_value = 1.0
    L(tc.outputs["Object"], cords.inputs["Vector"])
    wear = N.new("ShaderNodeTexNoise"); wear.inputs["Scale"].default_value = 180; wear.inputs["Detail"].default_value = 6
    L(tc.outputs["Object"], wear.inputs["Vector"])
    wr = N.new("ShaderNodeMapRange"); wr.inputs["To Min"].default_value = 0.82; wr.inputs["To Max"].default_value = 1.0
    L(wear.outputs["Fac"], wr.inputs["Value"])
    mul = N.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
    L(im.outputs["Color"], mul.inputs[6]); L(wr.outputs["Result"], mul.inputs[7])
    dim = N.new("ShaderNodeHueSaturation"); dim.inputs["Value"].default_value = 0.8; dim.inputs["Saturation"].default_value = 1.1
    L(mul.outputs[2], dim.inputs["Color"]); L(dim.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.42; b.inputs["Specular IOR Level"].default_value = 0.45
    b.inputs["Sheen Weight"].default_value = 0.3; b.inputs["Sheen Roughness"].default_value = 0.35
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.35; bp.inputs["Distance"].default_value = 0.08 * K
    L(cords.outputs["Fac"], bp.inputs["Height"]); L(bp.outputs["Normal"], b.inputs["Normal"])
    o.data.materials.append(m)

    # the shelf's front it lies on (seen only in the shadow it takes)
    shelf = box("shelf front", -0.2, 0.2, 0.45 * K, 2.0 * K, -OVER * K, 0.004, plain("shelf", (0.05, 0.03, 0.02), rough=0.6))
    shelf.is_holdout = True

    world = bpy.data.worlds.new("room"); scene.world = world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.03, 0.022, 0.016, 1)
    lamp("lamp", "AREA", (-0.32, -0.2, 0.12), aim=(0, 0, -total * K / 2), energy=float(arg("--key", "2.6")), colour=(1.0, 0.78, 0.52), size=0.2)
    lamp("window", "AREA", (0.3, -0.15, -0.02), aim=(0, 0, -total * K / 2), energy=float(arg("--window", "1.6")), colour=(0.6, 0.72, 1.0), size=0.15, size_y=0.35)
    lamp("over", "AREA", (0, -0.4, 0.05), aim=(0, 0, -total * K / 2), energy=float(arg("--fill", "1.2")), colour=(1.0, 0.9, 0.8), size=0.5)

    # the camera straight on, framing trophies.js's ribbon box
    bw, top, bottom = W + 6, 16, length + 3          # (the box: 3 spare each side, 16 over its top, 3 below its foot)
    cd = bpy.data.cameras.new("eye"); cd.type = "ORTHO"; cd.sensor_fit = "HORIZONTAL"; cd.ortho_scale = bw * K
    cam = link(bpy.data.objects.new("eye", cd)); scene.camera = cam
    # (the box: from 2 over the ribbon's top edge to 3 under its foot)
    zc = ((top - OVER) - (bottom + OVER)) / 2 * K
    cam.location = (0, -1.0, zc); cam.rotation_euler = (math.pi / 2, 0, 0)
    w_px, h_px = bw * PX, (top + bottom) * PX
    cycles(scene, SAMPLES, w_px, h_px, exposure=float(arg("--exposure", "-0.2")), glare=False, transparent=True)
    scene.view_settings.look = "AgX - Medium High Contrast"
    render(scene, os.path.join(OUT, f"ribbon-{code}-render.png"))

for code, length in LONG.items():
    if arg("--only", "") and code != arg("--only", ""): continue
    ribbon(code, length)
print("RIBBONS_DONE")
