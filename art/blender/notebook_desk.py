# Silas's Notebook (levels/molecules): his laboratory notebook lying open on
# his desk under the lamp, looked straight down on — built in three dimensions
# and rendered with Cycles.
#
# The notebook: boards in worn green book-cloth, the block of pages thick on
# either side and fanned a little at its edges, the two top sheets of squared
# paper aged cream, foxed, browned at their edges, bowing down into the spine.
# Round it on the walnut: an ink bottle, a round flask on its cork ring, a
# pencil, his spectacles.
#
# The book is laid out to the picture the game turns its leaves in (book.js
# NOTEBOOK: the book's own 1536 × 1024 px, the spine at 768): every centimetre
# of it is 40 px there. The render is the desk round it, 2400 × 1600, the
# book's picture at (432, 288) in it; where its top sheets lie (their
# outlines) is written beside it (notebookDesk.json).
#
#   blender -b --factory-startup -P art/blender/notebook_desk.py -- [--samples 512]

import bpy, bmesh, math, os, sys, json
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import ROOT, scan

OUT = os.path.join(ROOT, ".artifacts/notebook-desk")
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "512"))
PX = 40.0                                         # pixels a centimetre, at the pages
W, H = 2400, 1600                                 # the render
BOOK = (1536, 1024)                               # the book's own picture
OFF = ((W - BOOK[0]) / 2, (H - BOOK[1]) / 2)      # where it lies in the render
Z_PAGE = 1.55                                     # the top sheets' height over the desk, cm
def at(px, py, z=0.0):
    """a place, from the book's own picture (px from its top left), in metres"""
    return Vector(((px - 768) / PX / 100, (512 - py) / PX / 100, z / 100))

scene = fresh()
cd = bpy.data.cameras.new("eye"); cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36; cd.lens = 200
D = (W / PX) * cd.lens / 36 / 100                 # (metres from the pages: W px across them)
cam = link(bpy.data.objects.new("eye", cd)); cam.location = (0, 0, D + Z_PAGE / 100); scene.camera = cam
scene.render.resolution_x, scene.render.resolution_y = W, H

# ── materials ──────────────────────────────────────────────────────────────
DESK = scan("desk walnut", "dark_wood", size=0.9, tint=(0.62, 0.44, 0.33), bright=0.42, sat=0.8, rough=(0.38, 0.6), bump=0.4, coat=0.05, edges=0.2, stains=0.2, rot=(0, 0, math.pi / 2))
def cloth():
    """book-cloth: a close weave, dark green, rubbed pale at the corners"""
    m = bpy.data.materials.new("book cloth"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    w1 = N.new("ShaderNodeTexWave"); w1.inputs["Scale"].default_value = 1400; w1.wave_profile = "SIN"
    w2 = N.new("ShaderNodeTexWave"); w2.inputs["Scale"].default_value = 1400; w2.bands_direction = "Y"; w2.wave_profile = "SIN"
    for w in (w1, w2): L(tc.outputs["Object"], w.inputs["Vector"])
    weave = N.new("ShaderNodeMath"); weave.operation = "ADD"; L(w1.outputs["Fac"], weave.inputs[0]); L(w2.outputs["Fac"], weave.inputs[1])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 40; nz.inputs["Detail"].default_value = 8; L(tc.outputs["Object"], nz.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (0.012, 0.03, 0.02, 1); ramp.color_ramp.elements[1].color = (0.05, 0.09, 0.06, 1)
    L(nz.outputs["Fac"], ramp.inputs["Fac"])
    wear_ = N.new("ShaderNodeAmbientOcclusion"); wear_.inside = True; wear_.inputs["Distance"].default_value = 0.0012
    wr = N.new("ShaderNodeMapRange"); wr.inputs["From Min"].default_value = 0.85; wr.inputs["From Max"].default_value = 0.4; wr.inputs["To Max"].default_value = 0.45
    L(wear_.outputs["AO"], wr.inputs["Value"])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs[7].default_value = (0.32, 0.27, 0.18, 1)
    L(wr.outputs["Result"], mix.inputs["Factor"]); L(ramp.outputs["Color"], mix.inputs[6]); L(mix.outputs[2], b.inputs["Base Color"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.35; bp.inputs["Distance"].default_value = 0.0002
    L(weave.outputs["Value"], bp.inputs["Height"]); L(bp.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.85; b.inputs["Sheen Weight"].default_value = 0.3
    return m
CLOTH = cloth()
def sheet_paper(name, squared):
    """old paper: cream gone to tea at its edges, foxed; squared in faint
    blue every 5 mm on the top sheets"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 12; nz.inputs["Detail"].default_value = 9; L(tc.outputs["Object"], nz.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (0.56, 0.45, 0.3, 1); ramp.color_ramp.elements[1].color = (0.75, 0.66, 0.5, 1)
    ramp.color_ramp.elements[0].position = 0.3; L(nz.outputs["Fac"], ramp.inputs["Fac"])
    out = ramp.outputs["Color"]
    # (its edges browned: by its own UVs, in from every side)
    sep = N.new("ShaderNodeSeparateXYZ"); L(tc.outputs["UV"], sep.inputs["Vector"])
    def edge(sock):
        a = N.new("ShaderNodeMath"); a.operation = "PINGPONG"; a.inputs[1].default_value = 0.5; L(sock, a.inputs[0])
        return a.outputs["Value"]
    mn = N.new("ShaderNodeMath"); mn.operation = "MINIMUM"; L(edge(sep.outputs["X"]), mn.inputs[0]); L(edge(sep.outputs["Y"]), mn.inputs[1])
    er = N.new("ShaderNodeMapRange"); er.inputs["From Min"].default_value = 0.0; er.inputs["From Max"].default_value = 0.09
    er.inputs["To Min"].default_value = 0.62; er.inputs["To Max"].default_value = 1.0; L(mn.outputs["Value"], er.inputs["Value"])
    brown = N.new("ShaderNodeMix"); brown.data_type = "RGBA"; brown.blend_type = "MULTIPLY"; brown.inputs["Factor"].default_value = 1.0
    L(out, brown.inputs[6]); L(er.outputs["Result"], brown.inputs[7]); out = brown.outputs[2]
    vz = N.new("ShaderNodeTexVoronoi"); vz.inputs["Scale"].default_value = 70; vz.feature = "F1"; L(tc.outputs["Object"], vz.inputs["Vector"])
    fx = N.new("ShaderNodeMapRange"); fx.inputs["From Min"].default_value = 0.0; fx.inputs["From Max"].default_value = 0.09
    fx.inputs["To Min"].default_value = 0.5; fx.inputs["To Max"].default_value = 0.0; L(vz.outputs["Distance"], fx.inputs["Value"])
    fox = N.new("ShaderNodeMix"); fox.data_type = "RGBA"; fox.inputs[7].default_value = (0.36, 0.22, 0.1, 1)
    L(fx.outputs["Result"], fox.inputs["Factor"]); L(out, fox.inputs[6]); out = fox.outputs[2]
    if squared:
        sc = N.new("ShaderNodeMapping"); sc.inputs["Scale"].default_value = (200, 200, 200); L(tc.outputs["Object"], sc.inputs["Vector"])
        sx = N.new("ShaderNodeSeparateXYZ"); L(sc.outputs["Vector"], sx.inputs["Vector"])
        def line(sock):
            fr = N.new("ShaderNodeMath"); fr.operation = "FRACT"; L(sock, fr.inputs[0])
            ln = N.new("ShaderNodeMath"); ln.operation = "LESS_THAN"; ln.inputs[1].default_value = 0.08; L(fr.outputs["Value"], ln.inputs[0])
            return ln.outputs["Value"]
        mx = N.new("ShaderNodeMath"); mx.operation = "MAXIMUM"; L(line(sx.outputs["X"]), mx.inputs[0]); L(line(sx.outputs["Y"]), mx.inputs[1])
        k = N.new("ShaderNodeMath"); k.operation = "MULTIPLY"; k.inputs[1].default_value = 0.55; L(mx.outputs["Value"], k.inputs[0])
        grid = N.new("ShaderNodeMix"); grid.data_type = "RGBA"; grid.inputs[7].default_value = (0.3, 0.36, 0.46, 1)
        L(k.outputs["Value"], grid.inputs["Factor"]); L(out, grid.inputs[6]); out = grid.outputs[2]
    L(out, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.88; b.inputs["Specular IOR Level"].default_value = 0.25
    pb = N.new("ShaderNodeBump"); pb.inputs["Strength"].default_value = 0.1; pb.inputs["Distance"].default_value = 0.0001
    fz = N.new("ShaderNodeTexNoise"); fz.inputs["Scale"].default_value = 900; L(tc.outputs["Object"], fz.inputs["Vector"]); L(fz.outputs["Fac"], pb.inputs["Height"]); L(pb.outputs["Normal"], b.inputs["Normal"])
    return m
TOP_PAPER = sheet_paper("top sheet", True)
UNDER_PAPER = sheet_paper("pages under", False)
PAGE_EDGES = plain("page edges", (0.5, 0.42, 0.3), rough=0.9)

# ── the desk ───────────────────────────────────────────────────────────────
box("desk", -0.5, 0.5, -0.35, 0.35, -0.04, 0.0, DESK)

# ── the notebook ───────────────────────────────────────────────────────────
def slab(name, x0, x1, y0, y1, z0, z1, mat, r=0.0):
    """a block in the book's picture's px (x across, y down) and cm up"""
    a, b_ = at(x0, y1, z0), at(x1, y0, z1)
    o = box(name, a.x, b_.x, a.y, b_.y, a.z, b_.z, mat)
    if r: bevel(o, r / 100, 2)
    return o
slab("board", 72, 760, 32, 936, 0, 0.3, CLOTH, 0.1)
slab("board", 776, 1464, 32, 936, 0, 0.3, CLOTH, 0.1)
slab("spine", 752, 784, 26, 942, 0, 0.18, CLOTH, 0.05)
def sheet(name, x_spine, x_out, y0, y1, z, mat, bow=0.45, n=48):
    """a sheet from the spine out, its edge in at y0…y1 (px), lying at z cm,
    bowing down `bow` cm into the spine"""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    cols = []
    for i in range(n + 1):
        t = i / n; x = x_spine + (x_out - x_spine) * t
        dz = -bow * math.exp(-abs(x - x_spine) / PX / 0.9)
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
SHEETS = {"left": (764, 128), "right": (772, 1408)}
TOP_Y = (64, 900)
for side, (xs, xo) in SHEETS.items():
    s = 1 if xo > xs else -1
    # the block of pages under the top sheet: its edges seen, fanned a little
    bx0, bx1 = (xo + s * 24, xs) if s < 0 else (xs, xo + s * 24)
    slab("page block", bx0, bx1, 50, 918, 0.3, 1.05, PAGE_EDGES, 0.08)
    for k in range(6):
        f = (k + 1) / 7
        sheet("page", xs, xo + s * 24 * (1 - f), TOP_Y[0] - 14 * (1 - f), TOP_Y[1] + 18 * (1 - f), 1.05 + 0.07 * k, UNDER_PAPER, bow=0.38)
    sheet("top sheet", xs, xo, TOP_Y[0], TOP_Y[1], Z_PAGE, TOP_PAPER, bow=0.45)

# ── round it: ink, a flask, a pencil, his spectacles ───────────────────────
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.03, transmission=1.0, ior=1.45)
INK_GLASS = plain("ink bottle glass", (0.25, 0.3, 0.32), rough=0.06, transmission=1.0, ior=1.45)
INK = plain("ink", (0.004, 0.006, 0.012), rough=0.08)
ib = at(-150, 150)
# (a squat inkwell of dark glass, its brass lid thrown back)
BRASS = aged_metal("brass", (0.58, 0.41, 0.18), (0.08, 0.06, 0.03), rough=(0.25, 0.5), scale=40, tarnish=0.5)
lathe("inkwell", [(0, 0), (0.036, 0), (0.04, 0.008), (0.04, 0.03), (0.03, 0.042), (0.016, 0.046), (0.016, 0.052), (0, 0.052)], INK_GLASS, at=(ib.x, ib.y, 0), steps=48)
cylinder("ink", ib.x, ib.y, 0.004, 0.03, 0.033, INK, verts=40)
cylinder("inkwell collar", ib.x, ib.y, 0.046, 0.054, 0.018, BRASS, verts=32)
lid = cylinder("inkwell lid", 0, 0, 0, 0.004, 0.019, BRASS, verts=32); lid.location = (ib.x + 0.02, ib.y + 0.004, 0.056); lid.rotation_euler = (0, math.radians(-70), 0)
fk = at(1690, 190)
lathe("cork ring", [(0.03, 0), (0.042, 0), (0.044, 0.008), (0.03, 0.009)], scan("cork", "dirty_carpet", size=0.05, tint=(0.5, 0.33, 0.2), bright=0.6), at=(fk.x, fk.y, 0), steps=40)
lathe("round flask", [(0, 0.003), (0.03, 0.008), (0.048, 0.03), (0.05, 0.055), (0.044, 0.08), (0.03, 0.095), (0.012, 0.105), (0.011, 0.16), (0.013, 0.162), (0, 0.162)], GLASS, at=(fk.x, fk.y, 0.003), steps=48)
lathe("flask liquid", [(0, 0.006), (0.028, 0.01), (0.044, 0.03), (0.046, 0.045), (0, 0.045)], plain("green liquid", (0.25, 0.6, 0.35), rough=0.05, transmission=1.0, ior=1.33), at=(fk.x, fk.y, 0.003), steps=48)
pc = cylinder("pencil", 0, 0, -0.07, 0.07, 0.0036, plain("pencil", (0.62, 0.42, 0.08), rough=0.45), verts=6)
pc.rotation_euler = (0, math.pi / 2, math.radians(-16)); pc.location = (*at(1320, 1030).xy, 0.0036)
tip = cylinder("pencil tip", 0, 0, 0.07, 0.085, 0.0034, plain("cedar", (0.62, 0.48, 0.32), rough=0.7), verts=12, r2=0.0004)
tip.rotation_euler = pc.rotation_euler; tip.location = pc.location
if arg("--spectacles", "1") == "1":
    import_model("round_spectacles", width=0.13, at=tuple(at(-160, 860)), rot=0.5)

# ── the lamp's light, from up on the left; a little of the room's ──────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.004, 0.005, 1)
lamp("the lamp", "AREA", tuple(at(-500, -500, 55)), aim=tuple(at(700, 520, 0)), energy=float(arg("--lamp", "11")), colour=(1.0, 0.78, 0.52), size=0.35)
fill = lamp("fill", "AREA", tuple(at(900, 400, 120)), aim=tuple(at(768, 512, 0)), energy=float(arg("--fill", "10")), colour=(0.8, 0.85, 1.0), size=1.2)
fill.visible_glossy = False

# ── where the top sheets lie, in the book's own picture ────────────────────
data = {"version": 1, "width": W, "height": H, "book": {"x": OFF[0], "y": OFF[1], "w": BOOK[0], "h": BOOK[1]},
        "sheets": {side: [[xs, TOP_Y[0]], [xo, TOP_Y[0]], [xo, TOP_Y[1]], [xs, TOP_Y[1]]] for side, (xs, xo) in SHEETS.items()}}
with open(os.path.join(OUT, "notebookDesk.json"), "w") as fh: json.dump(data, fh, indent=1)

cycles(scene, SAMPLES, W, H, exposure=float(arg("--exposure", "-0.2")), glare=False)
scene.cycles.adaptive_threshold = 0.008
render(scene, os.path.join(OUT, "desk.png"))
print("NOTEBOOK_DONE")
