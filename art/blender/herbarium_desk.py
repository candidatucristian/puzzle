# Ivy's Herbarium (levels/herbarium): her album of pressed plants lying open
# on the walnut console table under the window in Room VI, looked straight
# down on — built in three dimensions and rendered with Cycles.
#
# The album: boards in faded green book-cloth, sewn — its thread seen in the
# gutter — the block of pages thick on either side, as an album of mounted
# plants is, the two top sheets of heavy cotton paper gone to cream, a little
# foxed, browned at their edges, bowing down into the spine. The sheets are
# bare here: each page, with its plants, is rendered apart
# (herbarium_pages.py) and laid on them by the game. Round it on the walnut:
# her pencil, brass tweezers, a roll of gummed paper strip, a leaf of ivy and
# a rose's petal fallen out of it. The moon from the window beyond the table's
# far edge; the room's lamp, warm, from the left.
#
# The book is laid out to the picture the game turns its leaves in (book.js
# ALBUM: the book's own 1536 × 1024 px, the spine at 768): every centimetre of
# it is 24 px there. The render is the table round it, 2400 × 1600, the
# book's picture at (432, 288) in it; where its top sheets lie is written
# beside it (herbariumDesk.json).
#
#   blender -b --factory-startup -P art/blender/herbarium_desk.py -- [--samples 512]

import bpy, bmesh, math, os, sys, json
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import ROOT, scan

OUT = os.path.join(ROOT, ".artifacts/herbarium-desk")
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "512"))
PX = 24.0                                         # pixels a centimetre, at the pages
W, H = 2400, 1600                                 # the render
BOOK = (1536, 1024)                               # the book's own picture
OFF = ((W - BOOK[0]) / 2, (H - BOOK[1]) / 2)      # where it lies in the render
Z_PAGE = 2.7                                      # the top sheets' height over the table, cm
def at(px, py, z=0.0):
    """a place, from the book's own picture (px from its top left), in metres"""
    return Vector(((px - 768) / PX / 100, (512 - py) / PX / 100, z / 100))

scene = fresh()
cd = bpy.data.cameras.new("eye"); cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36; cd.lens = 200
D = (W / PX) * cd.lens / 36 / 100                 # (metres from the pages: W px across them)
cam = link(bpy.data.objects.new("eye", cd)); cam.location = (0, 0, D + Z_PAGE / 100); scene.camera = cam
cd.clip_end = D + 2
scene.render.resolution_x, scene.render.resolution_y = W, H

# ── materials ──────────────────────────────────────────────────────────────
TABLE = scan("console walnut", "dark_wood", size=1.1, tint=(0.66, 0.46, 0.34), bright=0.46, sat=0.8, rough=(0.4, 0.62), bump=0.4, coat=0.05, edges=0.2, stains=0.15, rot=(0, 0, math.pi / 2))
def cloth():
    """book-cloth: a close weave, a faded sage green, rubbed pale at the corners"""
    m = bpy.data.materials.new("book cloth"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    w1 = N.new("ShaderNodeTexWave"); w1.inputs["Scale"].default_value = 900; w1.wave_profile = "SIN"
    w2 = N.new("ShaderNodeTexWave"); w2.inputs["Scale"].default_value = 900; w2.bands_direction = "Y"; w2.wave_profile = "SIN"
    for w in (w1, w2): L(tc.outputs["Object"], w.inputs["Vector"])
    weave = N.new("ShaderNodeMath"); weave.operation = "ADD"; L(w1.outputs["Fac"], weave.inputs[0]); L(w2.outputs["Fac"], weave.inputs[1])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 30; nz.inputs["Detail"].default_value = 8; L(tc.outputs["Object"], nz.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (0.024, 0.048, 0.03, 1); ramp.color_ramp.elements[1].color = (0.07, 0.11, 0.07, 1)
    L(nz.outputs["Fac"], ramp.inputs["Fac"])
    wear_ = N.new("ShaderNodeAmbientOcclusion"); wear_.inside = True; wear_.inputs["Distance"].default_value = 0.0015
    wr = N.new("ShaderNodeMapRange"); wr.inputs["From Min"].default_value = 0.85; wr.inputs["From Max"].default_value = 0.4; wr.inputs["To Max"].default_value = 0.5
    L(wear_.outputs["AO"], wr.inputs["Value"])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs[7].default_value = (0.3, 0.29, 0.2, 1)
    L(wr.outputs["Result"], mix.inputs["Factor"]); L(ramp.outputs["Color"], mix.inputs[6]); L(mix.outputs[2], b.inputs["Base Color"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.35; bp.inputs["Distance"].default_value = 0.0002
    L(weave.outputs["Value"], bp.inputs["Height"]); L(bp.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.85; b.inputs["Sheen Weight"].default_value = 0.3
    return m
CLOTH = cloth()
def cotton(name, tone=1.0):
    """heavy cotton paper gone to cream, foxed a little, browned at its edges"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 9; nz.inputs["Detail"].default_value = 9; L(tc.outputs["Object"], nz.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.66 * tone, 0.56 * tone, 0.38 * tone, 1); ramp.color_ramp.elements[1].color = (0.82 * tone, 0.73 * tone, 0.53 * tone, 1)
    ramp.color_ramp.elements[0].position = 0.3; L(nz.outputs["Fac"], ramp.inputs["Fac"])
    out = ramp.outputs["Color"]
    sep = N.new("ShaderNodeSeparateXYZ"); L(tc.outputs["UV"], sep.inputs["Vector"])
    def edge(sock):
        a = N.new("ShaderNodeMath"); a.operation = "PINGPONG"; a.inputs[1].default_value = 0.5; L(sock, a.inputs[0])
        return a.outputs["Value"]
    mn = N.new("ShaderNodeMath"); mn.operation = "MINIMUM"; L(edge(sep.outputs["X"]), mn.inputs[0]); L(edge(sep.outputs["Y"]), mn.inputs[1])
    er = N.new("ShaderNodeMapRange"); er.inputs["From Min"].default_value = 0.0; er.inputs["From Max"].default_value = 0.06
    er.inputs["To Min"].default_value = 0.72; er.inputs["To Max"].default_value = 1.0; L(mn.outputs["Value"], er.inputs["Value"])
    brown = N.new("ShaderNodeMix"); brown.data_type = "RGBA"; brown.blend_type = "MULTIPLY"; brown.inputs["Factor"].default_value = 1.0
    L(out, brown.inputs[6]); L(er.outputs["Result"], brown.inputs[7]); out = brown.outputs[2]
    vz = N.new("ShaderNodeTexVoronoi"); vz.inputs["Scale"].default_value = 45; vz.feature = "F1"; L(tc.outputs["Object"], vz.inputs["Vector"])
    fx = N.new("ShaderNodeMapRange"); fx.inputs["From Min"].default_value = 0.0; fx.inputs["From Max"].default_value = 0.06
    fx.inputs["To Min"].default_value = 0.32; fx.inputs["To Max"].default_value = 0.0; L(vz.outputs["Distance"], fx.inputs["Value"])
    fox = N.new("ShaderNodeMix"); fox.data_type = "RGBA"; fox.inputs[7].default_value = (0.42, 0.28, 0.14, 1)
    L(fx.outputs["Result"], fox.inputs["Factor"]); L(out, fox.inputs[6]); out = fox.outputs[2]
    L(out, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.9; b.inputs["Specular IOR Level"].default_value = 0.2
    pb = N.new("ShaderNodeBump"); pb.inputs["Strength"].default_value = 0.18; pb.inputs["Distance"].default_value = 0.0002
    fz = N.new("ShaderNodeTexNoise"); fz.inputs["Scale"].default_value = 500; fz.inputs["Detail"].default_value = 6; L(tc.outputs["Object"], fz.inputs["Vector"]); L(fz.outputs["Fac"], pb.inputs["Height"]); L(pb.outputs["Normal"], b.inputs["Normal"])
    return m
TOP_PAPER = cotton("top sheet")
UNDER_PAPER = cotton("pages under", 0.93)
PAGE_EDGES = plain("page edges", (0.52, 0.46, 0.34), rough=0.9)

# ── the table ──────────────────────────────────────────────────────────────
box("table", -0.75, 0.75, -0.55, 0.55, -0.05, 0.0, TABLE)

# ── the album ──────────────────────────────────────────────────────────────
def slab(name, x0, x1, y0, y1, z0, z1, mat, r=0.0):
    """a block in the book's picture's px (x across, y down) and cm up"""
    a, b_ = at(x0, y1, z0), at(x1, y0, z1)
    o = box(name, a.x, b_.x, a.y, b_.y, a.z, b_.z, mat)
    if r: bevel(o, r / 100, 2)
    return o
slab("board", 80, 764, 30, 960, 0, 0.35, CLOTH, 0.12)
slab("board", 772, 1456, 30, 960, 0, 0.35, CLOTH, 0.12)
slab("spine", 752, 784, 24, 966, 0, 0.22, CLOTH, 0.06)
def sheet(name, x_spine, x_out, y0, y1, z, mat, bow=0.5, n=56):
    """a sheet from the spine out, its edge in at y0…y1 (px), lying at z cm,
    bowing down `bow` cm into the spine"""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    cols = []
    for i in range(n + 1):
        t = i / n; x = x_spine + (x_out - x_spine) * t
        dz = -bow * math.exp(-abs(x - x_spine) / PX / 1.4)
        cols.append([bm.verts.new(at(x, y, z + dz)) for y in (y0, y1)])
    for i in range(n):
        a, b_ = cols[i], cols[i + 1]
        f = bm.faces.new((a[0], b_[0], b_[1], a[1]) if x_out > x_spine else (a[1], b_[1], b_[0], a[0]))
        for lp in f.loops:
            px_, py_ = lp.vert.co.x * 100 * PX + 768, 512 - lp.vert.co.y * 100 * PX
            lp[uv].uv = (abs(px_ - x_spine) / abs(x_out - x_spine), 1 - (py_ - y0) / (y1 - y0))
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    return o
SHEETS = {"left": (765, 128), "right": (771, 1408)}
TOP_Y = (64, 924)
for side, (xs, xo) in SHEETS.items():
    s = 1 if xo > xs else -1
    # the block of pages under the top sheet, thick with what is mounted in
    # it: its edges seen, fanned and a little uneven
    bx0, bx1 = (xo + s * 30, xs) if s < 0 else (xs, xo + s * 30)
    slab("page block", bx0, bx1, 46, 942, 0.35, 1.9, PAGE_EDGES, 0.1)
    for k in range(8):
        f = (k + 1) / 9
        sheet("page", xs, xo + s * (30 * (1 - f) + (k % 3) * 2), TOP_Y[0] - 16 * (1 - f) + (k % 2) * 3, TOP_Y[1] + 18 * (1 - f) - (k % 3) * 2,
              1.9 + 0.09 * k, UNDER_PAPER, bow=0.45)
    sheet("top sheet", xs, xo, TOP_Y[0], TOP_Y[1], Z_PAGE, TOP_PAPER, bow=0.5)
# (the thread it is sewn with, seen in the gutter between the top sheets)
THREAD = plain("linen thread", (0.34, 0.3, 0.22), rough=0.8)
for k in range(7):
    y = 100 + k * 128
    st = cylinder("stitch", 0, 0, -0.007, 0.007, 0.00045, THREAD, verts=8)
    st.rotation_euler = (math.pi / 2, 0, 0); st.location = at(768, y, Z_PAGE - 0.56)

# ── round it: her pencil, tweezers, the gummed strip, what fell out ────────
pc = cylinder("pencil", 0, 0, -0.085, 0.085, 0.0036, plain("pencil", (0.18, 0.3, 0.2), rough=0.45), verts=6)
pc.rotation_euler = (0, math.pi / 2, math.radians(-12)); pc.location = (*at(1300, 1050).xy, 0.0036)
tip = cylinder("pencil tip", 0, 0, 0.085, 0.101, 0.0034, plain("cedar", (0.62, 0.48, 0.32), rough=0.7), verts=12, r2=0.0004)
tip.rotation_euler = pc.rotation_euler; tip.location = pc.location
BRASS = aged_metal("brass", (0.58, 0.41, 0.18), (0.08, 0.06, 0.03), rough=(0.25, 0.5), scale=40, tarnish=0.5)
tw = at(-170, 760)
for e in (-1, 1):
    arm = box("tweezer arm", -0.0018, 0.0018, 0, 0.12, 0, 0.0012, BRASS)
    arm.location = (tw.x + e * 0.003, tw.y, 0.0006); arm.rotation_euler = (0, 0, math.radians(18 + e * 2.2))
lathe("gummed strip", [(0.018, 0), (0.03, 0), (0.03, 0.022), (0.018, 0.022)], plain("gummed paper", (0.72, 0.62, 0.42), rough=0.55), at=tuple(at(-120, 180)), steps=48)
cylinder("spool", *at(-120, 180).xy, 0.0, 0.021, 0.018, plain("spool card", (0.32, 0.22, 0.12), rough=0.8), verts=40)
# (what has fallen out of it: a leaf of ivy, a rose's petal)
import herbarium_plants as plants
MATS = plants.materials()
fallen = plants.Page((1560, 700, 1760, 900), at, PX, 0.0, 0.0, 768, seed=3)
plants.palmate(fallen, (3.0, 3.0), 35, 2.3, MATS["ivy"], 0.02)
plants.stem(fallen, [(1.6, 4.4), (2.4, 3.6)], 0.05, 0.04, MATS["twig"], 0.02)
petal = plants.Page((-180, 380, -60, 500), at, PX, 0.0, 0.0, 768, seed=4)
plants.blade(petal, (1.0, 3.6), 70, 2.6, plants.obovate(2.4), MATS["rose petal"], 0.01, bend=0.4)

# ── the moon from the window beyond the table; the lamp, warm, from the left
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.004, 0.006, 1)
lamp("the lamp", "AREA", tuple(at(-700, 300, 60)), aim=tuple(at(700, 540, 0)), energy=float(arg("--lamp", "16")), colour=(1.0, 0.78, 0.54), size=0.4)
moon = lamp("the window", "AREA", tuple(at(768, -900, 70)), aim=tuple(at(768, 400, 0)), energy=float(arg("--moon", "9")), colour=(0.62, 0.72, 1.0), size=1.2)
moon.visible_glossy = False
fill = lamp("fill", "AREA", tuple(at(900, 600, 140)), aim=tuple(at(768, 512, 0)), energy=float(arg("--fill", "6")), colour=(0.85, 0.85, 0.95), size=1.4)
fill.visible_glossy = False

# ── where the top sheets lie, in the book's own picture ────────────────────
data = {"version": 1, "width": W, "height": H, "book": {"x": OFF[0], "y": OFF[1], "w": BOOK[0], "h": BOOK[1]},
        "sheets": {side: [[xs, TOP_Y[0]], [xo, TOP_Y[0]], [xo, TOP_Y[1]], [xs, TOP_Y[1]]] for side, (xs, xo) in SHEETS.items()}}
with open(os.path.join(OUT, "herbariumDesk.json"), "w") as fh: json.dump(data, fh, indent=1)

cycles(scene, SAMPLES, W, H, exposure=float(arg("--exposure", "-0.35")), glare=False)
scene.cycles.adaptive_threshold = 0.008
if arg("--desk", "1") == "1": render(scene, os.path.join(OUT, "desk.png"))

# ── her five pages: each built on its own top sheet, rendered close, taken away
SCALE = float(arg("--scale", "2.25"))                # (the pages finer than the desk round them)
wanted = [int(k) for k in arg("--pages", "0,1,2,3,4").split(",") if k != ""]
if wanted:
    r = scene.render; r.resolution_x, r.resolution_y = int(W * SCALE), int(H * SCALE)
    r.use_border = True; r.use_crop_to_border = True
    for i in wanted:
        side = "left" if i % 2 == 0 else "right"; xs, xo = SHEETS[side]
        x0, x1 = min(xs, xo), max(xs, xo)
        page = plants.Page((x0, TOP_Y[0], x1, TOP_Y[1]), at, PX, Z_PAGE, 0.5, xs, seed=1958 + i)
        plants.build(page, i, MATS)
        r.border_min_x, r.border_max_x = (OFF[0] + x0) / W, (OFF[0] + x1) / W
        r.border_min_y, r.border_max_y = 1 - (OFF[1] + TOP_Y[1]) / H, 1 - (OFF[1] + TOP_Y[0]) / H
        render(scene, os.path.join(OUT, f"page-{i}.png"))
        page.clear()
print("HERBARIUM_DESK_DONE")
