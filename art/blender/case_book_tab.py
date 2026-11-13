# An index tab of the case book (src/ui/caseBook.js): a tab of old card glued
# to a page and standing out past the book's edge, one for each room in it and
# one for the letters — rendered alone, straight down, with the same light as
# the book (case_book.py), its own shadow under it on nothing (alpha). The
# game lays one on the book's edge for each, and types its number on it.
#
# Two of it: manila card, gone brown at its edges and grey where thumbs took
# it; and the same in faded red card, for the part of the book that is open.
#
#   blender -b --factory-startup -P art/blender/case_book_tab.py -- [--samples 512]
#   node art/blender/case_book_publish.mjs

import bpy, bmesh, math, os, sys, json
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import ROOT
from case_book_paper import old_paper

OUT = arg("--out", os.path.join(ROOT, ".artifacts/case-book"))
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "512"))
PX = 160.0                                         # pixels a centimetre
TAB_W, TAB_H, ROUND = 2.1, 1.9, 0.38               # what stands out past the page, cm; its corners' round
W, H = int((TAB_W + 1.3) * PX), int((TAB_H + 1.2) * PX)
X0 = -0.35                                         # the picture's left edge, cm: the tab's root just in from it

def cm(x, y, z=0.0): return Vector((x / 100, y / 100, z / 100))

def tab_mesh(name, mat):
    """the tab: a card from where it goes in between the pages (x 0) out to
    its rounded end, drooping a little as it leaves the book, its end lifted
    a hair where it has been taken between finger and thumb"""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    cols, rows = 60, 40
    grid = []
    for i in range(cols + 1):
        x = -0.4 + (TAB_W + 0.4) * i / cols
        row = []
        for j in range(rows + 1):
            y = -TAB_H / 2 + TAB_H * j / rows
            # (the rounded corners: the outline pulled in near the end)
            over = x - (TAB_W - ROUND)
            if over > 0:
                lim = math.sqrt(max(0.0, ROUND ** 2 - over ** 2))
                edge = TAB_H / 2 - ROUND + lim
                y = max(-edge, min(edge, y))
            z = 0.9 - 0.06 * max(0.0, x) ** 1.6 + 0.05 * max(0.0, x / TAB_W) ** 4 * (1 - abs(y) / TAB_H)
            row.append(bm.verts.new(cm(x, y, z)))
        grid.append(row)
    for i in range(cols):
        for j in range(rows):
            a, b_, c_, d_ = grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]
            if len({a.co.to_tuple(5), b_.co.to_tuple(5), c_.co.to_tuple(5), d_.co.to_tuple(5)}) < 3: continue
            try: f = bm.faces.new((a, b_, c_, d_))
            except ValueError: continue
            for lp in f.loops:
                lp[uv].uv = ((lp.vert.co.x * 100 + 0.4) / (TAB_W + 0.4), (lp.vert.co.y * 100 + TAB_H / 2) / TAB_H)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    so = o.modifiers.new("card", "SOLIDIFY"); so.thickness = 0.0004; so.offset = -1
    for p in o.data.polygons: p.use_smooth = True
    return o

def card(name, tint):
    m = old_paper(name, browned=1.6, tone=1.0)
    b = m.node_tree.nodes["Principled BSDF"]
    base = b.inputs["Base Color"].links[0].from_socket
    mix = m.node_tree.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs["Factor"].default_value = 1
    mix.inputs[7].default_value = (*tint, 1)
    m.node_tree.links.new(base, mix.inputs[6]); m.node_tree.links.new(mix.outputs[2], b.inputs["Base Color"])
    return m

results = {}
for key, tint in (("tab", (0.9, 0.8, 0.6)), ("tab-here", (0.6, 0.27, 0.22))):
    scene = fresh()
    cd = bpy.data.cameras.new("eye"); cd.type = "ORTHO"; cd.ortho_scale = W / PX / 100; cd.sensor_fit = "HORIZONTAL"
    cam = link(bpy.data.objects.new("eye", cd)); scene.camera = cam
    cam.location = ((X0 + W / PX / 2) / 100, 0.0, 1.0)
    tab_mesh("index tab", card("index tab card", tint))
    gp = box("ground", -0.5, 0.5, -0.5, 0.5, -0.002, 0.0, plain("ground", (0.5, 0.5, 0.5), rough=0.9)); gp.is_shadow_catcher = True
    world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.012, 0.011, 0.01, 1)
    # (the book's light, as it falls where the tabs stand: its right edge)
    lamp("the lamp", "AREA", tuple(cm(-118 - 23, 44, 68)), aim=tuple(cm(6 - 23, -4, 0)), energy=70, colour=(1.0, 0.82, 0.6), size=0.6, size_y=0.45)
    fill = lamp("the room", "AREA", tuple(cm(90 - 23, -40, 110)), aim=tuple(cm(-23, 0, 0)), energy=9, colour=(0.9, 0.9, 0.88), size=1.4); fill.visible_glossy = False
    top = lamp("over it", "AREA", tuple(cm(-10 - 23, 10, 150)), aim=tuple(cm(-23, 0, 0)), energy=6, colour=(1.0, 0.9, 0.76), size=1.2); top.visible_glossy = False
    cycles(scene, SAMPLES, W, H, exposure=-0.1, glare=False, transparent=True)
    c = scene.cycles; c.denoiser = "OPENIMAGEDENOISE"; c.denoising_input_passes = "RGB_ALBEDO_NORMAL"; c.denoising_prefilter = "ACCURATE"
    render(scene, os.path.join(OUT, f"{key}.png"))
    results[key] = f"{key}.png"

# where, in the tab's picture, its root is (the page's edge) and its middle
data = {"px": PX, "width": W, "height": H, "root": round(-X0 * PX, 1), "reach": round(TAB_W * PX, 1), "tabHeight": round(TAB_H * PX, 1)}
with open(os.path.join(OUT, "caseBookTab.json"), "w") as fh: json.dump(data, fh, indent=1)
print("CASE_BOOK_TAB_DONE", json.dumps(data), flush=True)
