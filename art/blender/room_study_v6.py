# Room I, the study — Ivy's room — version 6 (2026-11-05), after the picture
# the user gave: sage walls over dark oak panelling; the white tiled fireplace
# with a pothos trailing off its mantel and two tall candlesticks; the tall
# round-headed window in cream linen curtains, pots of herbs on its sill; a
# fern framed on the left wall and a leafy branch right of the window; the
# walnut writing desk with a brass microscope, an open book and a brass
# banker's lamp, the chair behind it; the glass terrarium of ferns and moss
# on its round table; the tall bookcase of books, archive boxes and jars; the
# old leather armchair, a knitted throw over it; light oak boards and a large
# faded Persian rug. Everything the game points at stays where it was — the
# camera, the cipher wheel on its plaque over the mantel (the user: "rotorul
# să-l păstrezi în același loc"), the window, the glass case, the chest on the
# desk — so house/rooms/Study.json keeps its puzzles where they were.
#
# It is still night (the window gives on the Moonlit Garden): the room lit by
# the banker's lamp under its brass shade (its bulb never seen) and that light
# given back warm and broad off the ceiling; the moon at the window.
#
#   blender -b --factory-startup -P art/blender/room_study_v6.py -- [--samples 512] [--width 2560] [--only plates] [--still 1]

import bpy, bmesh, math, os, sys, random, json
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *
from specimen_book import build_specimen_book

OUT = arg('--out', os.path.join(ROOT, ".artifacts/room-study-v6"))
os.makedirs(OUT, exist_ok=True)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")       # room_boards.mjs
SAMPLES = int(arg("--samples", "512"))
WIDTH = int(arg("--width", "2560"))
ONLY = set(arg("--only", "plates").split(","))
STILL = arg("--still", "")
RNG = random.Random(1888)

# ── the room, and where we sit in it ───────────────────────────────────────
X0, X1, D1, TOP = -300, 262, 520, 330         # its walls (the door's wall at d 0), its ceiling
EYE = (float(arg("--ex", "25")), float(arg("--ey", "138")), float(arg("--ed", "-30")))
LOOK = (float(arg("--lx", "25")), EYE[1] + float(arg("--tilt", "-40")), D1)
scene, HEIGHT = stage(WIDTH, eye=EYE, look=LOOK, lens=float(arg("--lens", "22")), lift=float(arg("--lift", "0.03")))
WIN = dict(x=0, hw=46, sill=96, top=292)      # the window in the back wall
SPRING = WIN["top"] - WIN["hw"]
FIRE = dict(x=-178, w=150, out=30)            # the chimney breast, left on the back wall
DESK = dict(x=-4, d=352, turn=math.radians(1.5), w=150, deep=70, h=77)
CASE_TABLE = dict(x=104, d=232, r=46, h=70)   # the round table at hand, right
CASE = dict(w=56, deep=36, h=40, roof=13)

# ── materials ──────────────────────────────────────────────────────────────
OAK = scan("oak", "dark_wood", size=1.0, tint=(0.6, 0.45, 0.32), bright=0.42, rough=(0.4, 0.62), bump=0.3, coat=0.12, upright=True)
OAK_X = scan("oak across", "dark_wood", size=1.0, tint=(0.6, 0.45, 0.32), bright=0.4, rough=(0.4, 0.62), bump=0.3, coat=0.12)
WALNUT = scan("walnut", "rosewood_veneer1", size=0.6, tint=(0.66, 0.46, 0.33), bright=0.56, sat=0.85, rough=(0.2, 0.4), bump=0.2, coat=0.4)
BOARDS = scan("light oak boards", "wood_floor_worn", size=2.0, tint=(0.86, 0.7, 0.52), bright=0.74, sat=0.55, rough=(0.5, 0.7), bump=0.35, coat=0.0)
PLASTER = scan("ceiling", "plastered_wall_04", size=2.0, tint=(0.52, 0.5, 0.44), bright=0.55, sat=0.2, rough=(0.8, 0.95), bump=0.25)
SAGE = scan("sage walls", "plastered_wall_04", size=2.4, tint=(0.42, 0.5, 0.38), bright=0.66, sat=0.3, rough=(0.82, 0.95), bump=0.14)
LEATHER = scan("desk leather", "brown_leather", size=0.5, tint=(0.3, 0.42, 0.26), bright=0.55, rough=(0.35, 0.6), bump=0.4)
CHAIR_LEATHER = scan("armchair leather", "brown_leather", size=0.6, tint=(0.5, 0.31, 0.19), bright=0.5, sat=0.8, rough=(0.42, 0.66), bump=0.6)
BRASS = aged_metal("brass", (0.55, 0.39, 0.17), (0.08, 0.055, 0.025), rough=(0.22, 0.5), scale=30, tarnish=0.5)
IRON = plain("iron", (0.02, 0.02, 0.02), rough=0.45, metal=0.8)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
WINDOW_GLASS = plain("window glass", (0.9, 0.93, 0.95), rough=0.03, transmission=1.0, ior=1.03)
WAX = bpy.data.materials.new("wax"); WAX.use_nodes = True
_w = WAX.node_tree.nodes["Principled BSDF"]; _w.inputs["Base Color"].default_value = (0.86, 0.79, 0.64, 1); _w.inputs["Subsurface Weight"].default_value = 0.6; _w.inputs["Subsurface Radius"].default_value = (0.02, 0.012, 0.006); _w.inputs["Roughness"].default_value = 0.42
WICK = plain("wick", (0.01, 0.01, 0.01), rough=0.9)
TERRACOTTA = plain("terracotta", (0.42, 0.18, 0.09), rough=0.85)
PAGES = plain("pages", (0.3, 0.26, 0.19), rough=0.9)
STONE = scan("white stone", "marble_01", size=0.9, tint=(0.8, 0.77, 0.7), bright=0.62, sat=0.12, rough=(0.55, 0.78), bump=0.12, coat=0.0)
BRICK = scan("fire brick", "white_sandstone_bricks_03", size=0.7, tint=(0.36, 0.2, 0.13), bright=0.4, sat=0.7, rough=(0.8, 0.95), bump=0.6)
SOOT = plain("soot", (0.012, 0.01, 0.009), rough=0.95)
CAST = aged_metal("cast iron", (0.035, 0.033, 0.03), (0.02, 0.016, 0.012), rough=(0.4, 0.75), scale=40, tarnish=0.3)
FRAME = scan("window | oiled oak", "dark_wood", size=0.65, tint=(0.62, 0.42, 0.26), bright=0.5, sat=0.65, rough=(0.38, 0.58), bump=0.28, coat=0.1, upright=True)
FRAME_X = scan("window | oak rails and sill", "dark_wood", size=0.65, tint=(0.62, 0.42, 0.26), bright=0.5, sat=0.65, rough=(0.38, 0.58), bump=0.28, coat=0.1)
def linen(name, colour):
    """undyed linen: a slub weave, a little sheen, the light through it"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    weave = N.new("ShaderNodeTexWave"); weave.wave_type = "BANDS"; weave.bands_direction = "Z"; weave.inputs["Scale"].default_value = 900; weave.inputs["Distortion"].default_value = 3
    slub = N.new("ShaderNodeTexNoise"); slub.inputs["Scale"].default_value = 60; slub.inputs["Detail"].default_value = 4
    for t in (weave, slub): Lk(tc.outputs["Object"], t.inputs["Vector"])
    tone = N.new("ShaderNodeMapRange"); tone.inputs["To Min"].default_value = 0.88; tone.inputs["To Max"].default_value = 1.05
    Lk(slub.outputs["Fac"], tone.inputs["Value"])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs["Factor"].default_value = 1
    mix.inputs[6].default_value = (*colour, 1)
    grey = N.new("ShaderNodeCombineColor"); Lk(tone.outputs["Result"], grey.inputs[0]); Lk(tone.outputs["Result"], grey.inputs[1]); Lk(tone.outputs["Result"], grey.inputs[2])
    Lk(grey.outputs[0], mix.inputs[7]); Lk(mix.outputs[2], b.inputs["Base Color"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25; bump.inputs["Distance"].default_value = 0.0004
    Lk(weave.outputs["Fac"], bump.inputs["Height"]); Lk(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.94; b.inputs["Sheen Weight"].default_value = 0.08; b.inputs["Sheen Roughness"].default_value = 0.6
    b.inputs["Sheen Tint"].default_value = (*colour, 1)
    tr = N.new("ShaderNodeBsdfTranslucent"); Lk(mix.outputs[2], tr.inputs["Color"])
    mx = N.new("ShaderNodeMixShader"); mx.inputs["Fac"].default_value = 0.07
    Lk(b.outputs["BSDF"], mx.inputs[1]); Lk(tr.outputs["BSDF"], mx.inputs[2]); Lk(mx.outputs["Shader"], N["Material Output"].inputs["Surface"])
    return m
CURTAIN = linen("cream linen curtains", (0.34, 0.31, 0.24))
# the fireplace's surround: oiled oak, matte, the panelling's own colour (it was
# cream tiles and white stone until 2026-11-14 — "like a swimming pool")
SURROUND = scan("fireplace surround | oiled oak", "dark_wood", size=0.8, tint=(0.56, 0.4, 0.27), bright=0.44, sat=0.7, rough=(0.48, 0.68), bump=0.32, coat=0.0, upright=True)
SURROUND_X = scan("fireplace surround | oiled oak across", "dark_wood", size=0.8, tint=(0.56, 0.4, 0.27), bright=0.42, sat=0.7, rough=(0.48, 0.68), bump=0.32, coat=0.0)
HEARTH = scan("hearth | dark slate", "slate_driveway", size=0.9, tint=(0.34, 0.29, 0.24), bright=0.36, sat=0.45, rough=(0.72, 0.9), bump=0.4, coat=0.0)
THROW = scan("oatmeal knitted wool", "quatrefoil_jacquard_fabric", size=0.14, tint=(0.62, 0.55, 0.42), bright=0.42, sat=0.25, rough=(0.92, 1.0), bump=0.9)
THROW.node_tree.nodes["Principled BSDF"].inputs["Sheen Weight"].default_value = 0.12
THROW.node_tree.nodes["Principled BSDF"].inputs["Sheen Tint"].default_value = (0.62, 0.55, 0.42, 1)
CARDBOARD = scan("archive box board", "Cardboard003", size=0.4, tint=(0.82, 0.74, 0.58), bright=0.66, sat=0.4, rough=(0.8, 0.95), bump=0.2)
LABEL = paper("archive label", (0.78, 0.74, 0.64), 0.2)
CERAMIC = plain("white glazed pot", (0.8, 0.79, 0.74), rough=0.38)
FERN_PLATE = picture("fern plate", os.path.join(DRAWN, "study-fern.png"), rough=0.9)       # room_boards.mjs
LEAF_PLATE = picture("leaf plate", os.path.join(DRAWN, "study-leaf.png"), rough=0.9)
FRAME_DARK = scan("picture frame | dark walnut", "rosewood_veneer1", size=0.3, tint=(0.36, 0.25, 0.18), bright=0.5, sat=0.7, rough=(0.45, 0.62), bump=0.15)
MOUNT_WHITE = paper("white mount", (0.8, 0.77, 0.69), 0.08)
CIPHER = picture("cipher face", os.path.join(DRAWN, "cipher.png"), rough=0.3, coat=0.2, bump=0.4)
CIPHER.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 0.85
PRINT = picture("botanical print", os.path.join(DRAWN, "study-print.png"), rough=0.9)
ROSE = picture("rose plate", os.path.join(DRAWN, "study-flower.png"), rough=0.9)        # room_boards.mjs
spine_mat = bound(picture("spines", os.path.join(DRAWN, "spines.png"), rough=0.5, coat=0.15, bump=0.3))
COVERS = cover_materials()
# (the big rug of the picture: an old Persian, faded nearly to its ground — beige, grey, a little rose)
PERSIAN = rug_material("faded persian rug", os.path.join(ASSETS, "textures", "persian_rug.jpg"), value=1.0)
# (its navy and ivory faded to what the picture's rug is: sand, taupe, a
#  little rose — the pattern kept by its light and dark, re-dyed)
_rn = PERSIAN.node_tree.nodes; _rl = PERSIAN.node_tree.links.new
_hs = next(n_ for n_ in _rn if n_.type == "HUE_SAT")
_tn = next(n_ for n_ in _rn if n_.type == "MIX" and n_.blend_type == "MULTIPLY" and n_.inputs[6].is_linked and n_.inputs[6].links[0].from_node == _hs)
_bw = _rn.new("ShaderNodeRGBToBW"); _rl(_hs.outputs["Color"], _bw.inputs["Color"])
_rp = _rn.new("ShaderNodeValToRGB"); _rl(_bw.outputs["Val"], _rp.inputs["Fac"])
_rp.color_ramp.elements[0].position = 0.08; _rp.color_ramp.elements[0].color = (0.2, 0.13, 0.1, 1)
_rp.color_ramp.elements[1].position = 0.92; _rp.color_ramp.elements[1].color = (0.8, 0.7, 0.56, 1)
_mid = _rp.color_ramp.elements.new(0.45); _mid.color = (0.46, 0.33, 0.27, 1)
_rl(_rp.outputs["Color"], _tn.inputs[6])
# (2026-11-05: crisp at the foot of the picture — the user saw the rug there
#  as a blur: the scan doubled and sharpened (room_boards.mjs), sampled
#  cubic, and a fine pile of wool fibres laid over its bump)
for _t in [n_ for n_ in _rn if n_.type == "TEX_IMAGE" and n_.image and "persian_rug" in n_.image.filepath]:
    _t.image = bpy.data.images.load(os.path.join(DRAWN, "persian-rug-sharp.jpg"), check_existing=True); _t.interpolation = "Cubic"
_bp = next(n_ for n_ in _rn if n_.type == "BUMP")
_fib = _rn.new("ShaderNodeTexNoise"); _fib.inputs["Scale"].default_value = 2600; _fib.inputs["Detail"].default_value = 2; _fib.inputs["Roughness"].default_value = 0.7
_rl(_rn["Texture Coordinate"].outputs["UV"] if "Texture Coordinate" in _rn else next(n_ for n_ in _rn if n_.type == "TEX_COORD").outputs["UV"], _fib.inputs["Vector"])
_pile = _rn.new("ShaderNodeBump"); _pile.inputs["Strength"].default_value = 0.75; _pile.inputs["Distance"].default_value = 0.0009
_rl(_fib.outputs["Fac"], _pile.inputs["Height"]); _rl(_pile.outputs["Normal"], _bp.inputs["Normal"])
LAYOUT = Layout("Study")

# ── the shell ──────────────────────────────────────────────────────────────
DADO = 96
box_cm("floor", X0 - 30, X1 + 30, -6, 0, -160, D1 + 30, BOARDS)
box_cm("ceiling", X0 - 30, X1 + 30, TOP, TOP + 10, -160, D1 + 30, PLASTER)
for (x0, x1) in ((X0 - 25, X0), (X1, X1 + 25)):
    box_cm("wall", x0, x1, 0, TOP, -160, D1 + 30, SAGE)
box_cm("door wall", X0 - 25, X1 + 25, 0, TOP, -170, -150, SAGE)
back = box_cm("back wall", X0 - 25, X1 + 25, 0, TOP, D1, D1 + 30, SAGE)
wx0, wx1 = WIN["x"] - WIN["hw"], WIN["x"] + WIN["hw"]
boolean_cut(back, box("cut", M(wx0), M(wx1), M(D1 - 10), M(D1 + 50), M(WIN["sill"]), M(SPRING), IRON))
arch_cut = cylinder("cut", 0, 0, -0.5, 0.5, M(WIN["hw"]), IRON, verts=64); arch_cut.rotation_euler = (math.pi / 2, 0, 0); arch_cut.location = P(WIN["x"], SPRING, D1 + 15)
boolean_cut(back, arch_cut)
def dado_x(a, b, at, facing):
    """oak panelling along a wall running across (at d = `at`, its face toward
    -`facing`·d): boards, panels, a rail, a skirting; and the cornice"""
    def piece(p0, p1, y0, y1, proud, mat, r=0.0):
        q0, q1 = sorted((at, at - facing * proud))
        box_cm("panelling", p0, p1, y0, y1, q0, q1, mat, r)
    piece(a, b, 0, DADO, 2.0, OAK)
    n = max(1, round((b - a) / 52))
    for k in range(n):
        p0 = a + k * (b - a) / n + 6; p1 = a + (k + 1) * (b - a) / n - 6
        piece(p0, p1, 18, DADO - 14, 3.2, OAK, 1.2)
    piece(a, b, DADO - 3, DADO + 4, 4.5, OAK_X, 1.0)
    piece(a, b, 0, 16, 3.5, OAK_X, 0.6)
    piece(a, b, TOP - 16, TOP, 10, OAK_X, 2.0)
def dado_d(a, b, at, facing):
    """the same along a side wall (at x = `at`, its face toward +`facing`·x)"""
    def piece(p0, p1, y0, y1, proud, mat, r=0.0):
        q0, q1 = sorted((at, at + facing * proud))
        box_cm("panelling", q0, q1, y0, y1, p0, p1, mat, r)
    piece(a, b, 0, DADO, 2.0, OAK)
    n = max(1, round((b - a) / 52))
    for k in range(n):
        p0 = a + k * (b - a) / n + 6; p1 = a + (k + 1) * (b - a) / n - 6
        piece(p0, p1, 18, DADO - 14, 3.2, OAK, 1.2)
    piece(a, b, DADO - 3, DADO + 4, 4.5, OAK_X, 1.0)
    piece(a, b, 0, 16, 3.5, OAK_X, 0.6)
    piece(a, b, TOP - 16, TOP, 10, OAK_X, 2.0)
BREAST0, BREAST1 = FIRE["x"] - FIRE["w"] / 2 - 12, FIRE["x"] + FIRE["w"] / 2 + 12
BF = D1 - FIRE["out"]                           # the chimney breast's face
dado_x(X0, BREAST0, D1, 1)
dado_x(BREAST1, wx0 - 12, D1, 1)
dado_x(wx1 + 12, X1, D1, 1)
box_cm("breast cornice", BREAST0 - 2, BREAST1 + 2, TOP - 16, TOP, BF - 10, BF, OAK_X, 2.0)
dado_d(-150, D1, X0, 1)
dado_d(-150, D1, X1, -1)

# ── the window: tall, round-headed, its two leaves shut on the rain ────────
REVEAL = 30
box_cm("reveal", wx0 - 3, wx0, WIN["sill"], SPRING, D1, D1 + REVEAL, FRAME)
box_cm("reveal", wx1, wx1 + 3, WIN["sill"], SPRING, D1, D1 + REVEAL, FRAME)
box_cm("sill", wx0 - 6, wx1 + 6, WIN["sill"] - 4, WIN["sill"], D1 - 6, D1 + REVEAL - 6, FRAME_X, 1.0)
for x0, x1 in ((wx0 - 10, wx0 - 1), (wx1 + 1, wx1 + 10)):
    box_cm("architrave", x0, x1, WIN["sill"] - 4, SPRING, D1 - 4.5, D1, FRAME, 0.6)
verts, faces = [], []
for i in range(65):
    a = math.pi * i / 64
    for radius, depth in ((WIN["hw"] + 10, D1 - 4.5), (WIN["hw"] + 1, D1 - 4.5), (WIN["hw"] + 1, D1 + REVEAL)):
        verts.append(tuple(P(WIN["x"] + math.cos(a) * radius, SPRING + math.sin(a) * radius, depth)))
for i in range(64):
    j = i * 3
    faces.extend(((j, j + 3, j + 4, j + 1), (j + 1, j + 4, j + 5, j + 2)))
arch_mesh = bpy.data.meshes.new("arch lining"); arch_mesh.from_pydata(verts, [], faces); arch_mesh.update()
arch_obj = arch(link(bpy.data.objects.new("arch lining", arch_mesh))); arch_obj.data.materials.append(FRAME_X)
arch_obj.modifiers.new("solid", "SOLIDIFY").thickness = M(1.2)
GD = D1 + REVEAL - 10
def leaf(x0, x1):
    y0, y1 = WIN["sill"] + 1, SPRING - 1.5
    def part(xa, xb, ya, yb, da, db, mat, r=0.0):
        o = box_cm("leaf", xa, xb, ya, yb, da, db, mat, r); return o
    part(x0, x0 + 5, y0, y1, GD - 2.5, GD + 2.5, FRAME, 0.5); part(x1 - 5, x1, y0, y1, GD - 2.5, GD + 2.5, FRAME, 0.5)
    part(x0, x1, y0, y0 + 8, GD - 2.5, GD + 2.5, FRAME_X, 0.5); part(x0, x1, y1 - 5, y1, GD - 2.5, GD + 2.5, FRAME_X, 0.5)
    xm = (x0 + x1) / 2
    part(xm - 1.2, xm + 1.2, y0 + 8, y1 - 5, GD - 1.6, GD + 1.6, FRAME, 0.3)
    for k in (1, 2, 3):
        y = y0 + 8 + k * (y1 - 5 - y0 - 8) / 4
        part(x0 + 5, x1 - 5, y - 1.2, y + 1.2, GD - 1.6, GD + 1.6, FRAME_X, 0.3)
    part(x0 + 4, x1 - 4, y0 + 7, y1 - 4, GD - 0.3, GD + 0.3, WINDOW_GLASS)
leaf(wx0, WIN["x"]); leaf(WIN["x"], wx1)
box_cm("transom", wx0, wx1, SPRING - 1.5, SPRING + 2.5, GD - 3, GD + 3, FRAME_X, 0.4)
me = bpy.data.meshes.new("fanlight"); bm = bmesh.new(); n = 48
r_out, r_in = WIN["hw"], WIN["hw"] - 5
outer = [bm.verts.new(tuple(P(WIN["x"] + math.cos(math.pi * i / n) * r_out, SPRING + math.sin(math.pi * i / n) * r_out, GD - 2.5))) for i in range(n + 1)]
inner = [bm.verts.new(tuple(P(WIN["x"] + math.cos(math.pi * i / n) * r_in, SPRING + math.sin(math.pi * i / n) * r_in, GD - 2.5))) for i in range(n + 1)]
for i in range(n): bm.faces.new((outer[i], outer[i + 1], inner[i + 1], inner[i]))
bm.to_mesh(me); bm.free()
fan = arch(link(bpy.data.objects.new("fanlight", me))); fan.data.materials.append(FRAME)
fan.modifiers.new("thick", "SOLIDIFY").thickness = M(5)
for k in range(1, 5):
    a = math.pi * k / 5
    arch(rod("fan bar", P(WIN["x"], SPRING, GD), P(WIN["x"] + math.cos(a) * r_in, SPRING + math.sin(a) * r_in, GD), M(1.1), FRAME, verts=8))
gl = bpy.data.meshes.new("fan glass"); bm = bmesh.new()
vs = [bm.verts.new(tuple(P(WIN["x"], SPRING, GD)))] + [bm.verts.new(tuple(P(WIN["x"] + math.cos(math.pi * i / n) * r_in, SPRING + math.sin(math.pi * i / n) * r_in, GD))) for i in range(n + 1)]
for i in range(1, n + 1): bm.faces.new((vs[0], vs[i], vs[i + 1]))
bm.to_mesh(gl); bm.free()
arch(link(bpy.data.objects.new("fan glass", gl))).data.materials.append(WINDOW_GLASS)
curtain(RNG, wx0 - 40, wx0 - 2, D1 - 7.5, TOP - 22, CURTAIN, folds=4, deep=5.5)
curtain(RNG, wx1 + 2, wx1 + 40, D1 - 7.5, TOP - 22, CURTAIN, folds=4, deep=5.5)
curtain_pole(wx0 - 39, wx1 + 39, TOP - 18, D1 - 10.5, BRASS)
# the garden beyond, at night, in the rain
MOON_AT = P(-900, 900, 3600)
garden(MOON_AT, [("island_tree_01", -260, 1500, 9.0, 0.3), ("island_tree_02", 240, 2100, 11.0, 1.4), ("tree_small_02", 60, 1150, 4.5, 2.2),
                  ("shrub_02", 140, 860, 1.4, 0.6), ("shrub_02", -150, 900, 1.6, 2.0)],
       (-800, 1600, D1 + 30, 3200, -40), P(800, 700, 4400))
# on the sill: the pot with something just come up in it, and, as in the
# picture, three more: herbs in white glaze and in clay
pot_x, pot_d = WIN["x"] - 34, D1 + 4
SPROUT = plain("seedling", (0.14, 0.34, 0.06), rough=0.5)
lathe("pot", [(0, 0), (0.042, 0), (0.044, 0.004), (0.056, 0.09), (0.061, 0.095), (0.061, 0.11), (0.056, 0.11), (0.054, 0.1), (0, 0.1)], TERRACOTTA, at=tuple(P(pot_x, WIN["sill"], pot_d)), steps=40)
cylinder("earth", M(pot_x), M(pot_d), M(WIN["sill"] + 9), M(WIN["sill"] + 9.4), M(5.3), plain("pot earth", (0.05, 0.035, 0.02), rough=1.0))
for lean, a in ((0.15, 0.4), (-0.12, 2.6)):
    tube("shoot", [(0, 0), (lean * 0.02, 0.04), (lean * 0.05, 0.075)], 0.0012, SPROUT, at=tuple(P(pot_x, WIN["sill"] + 9.4, pot_d)), rot=a)
for a in (0.3, 0.3 + math.pi):
    lf = leaf_blade("leaf", tuple(P(pot_x + math.cos(a) * 1.3, WIN["sill"] + 16.8, pot_d + math.sin(a) * 1.3)), M(1.4), SPROUT, squash=(1.0, 0.55, 0.12))
    lf.rotation_euler = (0.2, 0.3, a)
def sill_pot(x, mat, r=6.0, h=10.0):
    """a plain pot, its rim rolled, earth in it"""
    k = M(r) / 0.06
    lathe("sill pot", [(0, 0), (0.044 * k, 0), (0.046 * k, 0.004), (0.058 * k, M(h) - 0.012), (0.062 * k, M(h) - 0.008), (0.062 * k, M(h)),
                       (0.057 * k, M(h)), (0.055 * k, M(h) - 0.01), (0, M(h) - 0.01)], mat, at=tuple(P(x, WIN["sill"], pot_d)), steps=48)
    cylinder("pot earth", M(x), M(pot_d), M(WIN["sill"] + h - 1.6), M(WIN["sill"] + h - 1.2), M(r - 0.7), plain("pot earth", (0.05, 0.035, 0.02), rough=1.0))
    return WIN["sill"] + h - 1.4
BASIL = plain("basil leaf", (0.08, 0.24, 0.05), rough=0.45, sheen=0.2)
_bb = BASIL.node_tree.nodes["Principled BSDF"]; _bb.inputs["Subsurface Weight"].default_value = 0.3; _bb.inputs["Subsurface Radius"].default_value = (0.003, 0.007, 0.002)
def basil(x, top, rng):
    """a pot of basil: a few stems, their leaves in pairs, the pairs turned
    each a quarter about the stem, cupped, smaller toward the tip"""
    for k in range(5):
        a0 = rng.uniform(0, math.tau); lean = rng.uniform(0.05, 0.25); ht = rng.uniform(9, 15)
        base = Vector((M(x) + math.cos(a0) * 0.012, pot_d / 100 + math.sin(a0) * 0.012, M(top)))
        tipv = base + Vector((math.cos(a0) * lean * M(ht), math.sin(a0) * lean * M(ht), M(ht)))
        cu = bpy.data.curves.new("basil stem", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.0014
        sp_ = cu.splines.new("POLY"); sp_.points.add(1); sp_.points[0].co = (*base, 1); sp_.points[1].co = (*tipv, 1)
        link(bpy.data.objects.new("basil stem", cu)).data.materials.append(SPROUT)
        for j in range(4):
            t = 0.35 + j * 0.2; at_ = base.lerp(tipv, t); size = M(3.2 - j * 0.55)
            for side in (0, math.pi):
                lf = leaf_blade("basil leaf", tuple(at_ + Vector((math.cos(a0 + j * 1.57 + side) * size * 0.7, math.sin(a0 + j * 1.57 + side) * size * 0.7, 0))), size, BASIL, squash=(1.0, 0.6, 0.14))
                lf.rotation_euler = (rng.uniform(-0.35, -0.1), 0, a0 + j * 1.57 + side)
top_ = sill_pot(WIN["x"] - 12, CERAMIC, 5.6, 11)
basil(WIN["x"] - 12, top_, random.Random(31))
import_model("potted_plant_04", height=M(17), at=tuple(P(WIN["x"] + 12, WIN["sill"], pot_d)), rot=2.1)
import_model("potted_plant_01", height=M(24), at=tuple(P(WIN["x"] + 34, WIN["sill"], pot_d)), rot=4.0)

# ── the fireplace on the back wall: oiled oak, the fire laid and cold ──────
fx, fw = FIRE["x"], FIRE["w"]
breast = box_cm("chimney breast", BREAST0, BREAST1, 0, TOP, BF, D1 + 1, SAGE)
ox0, ox1, oy1 = fx - 34, fx + 34, 78            # the fire's opening
boolean_cut(breast, box("cut", M(ox0), M(ox1), M(BF - 10), M(D1 - 8), M(-1), M(oy1), IRON))
box_cm("fire back", ox0, ox1, 0, oy1, D1 - 12, D1 - 8, BRICK)
for x0, x1 in ((ox0, ox0 + 2.5), (ox1 - 2.5, ox1)):
    box_cm("fire cheek", x0, x1, 0, oy1, BF, D1 - 8, BRICK)
box_cm("fire throat", ox0, ox1, oy1 - 3, oy1, BF, D1 - 8, SOOT)
box_cm("fire floor", ox0, ox1, 0, 1.5, BF, D1 - 8, SOOT)
# the surround: jambs, frieze, the mantel shelf, the hearth before it
for x0, x1 in ((fx - fw / 2, ox0 - 2), (ox1 + 2, fx + fw / 2)):
    box_cm("jamb", x0, x1, 0, 112, BF - 6, BF, SURROUND, 0.3)
    box_cm("plinth block", x0 - 1.5, x1 + 1.5, 0, 14, BF - 7.5, BF, SURROUND, 0.6)
    box_cm("corbel", x0 + 2, x1 - 2, 104, 120, BF - 8, BF, SURROUND_X, 0.8)
box_cm("frieze", fx - fw / 2, fx + fw / 2, oy1 + 2, 120, BF - 5, BF, SURROUND_X, 0.3)
for x0, x1 in ((ox0 - 2, ox0), (ox1, ox1 + 2)):
    box_cm("register", x0, x1, 0, oy1 + 2, BF - 2, BF, CAST, 0.3)
box_cm("register", ox0 - 2, ox1 + 2, oy1, oy1 + 2, BF - 2, BF, CAST, 0.3)
MANTEL_Y = 125
box_cm("mantel", fx - fw / 2 - 8, fx + fw / 2 + 8, 120, MANTEL_Y, BF - 18, BF, SURROUND_X, 1.2)
box_cm("hearth", fx - fw / 2 - 6, fx + fw / 2 + 6, 0, 2.5, BF - 48, BF, HEARTH, 0.8)
rod("fender", P(fx - fw / 2 + 4, 8, BF - 42), P(fx + fw / 2 - 4, 8, BF - 42), M(0.9), BRASS, verts=16)
for x in (fx - fw / 2 + 4, fx + fw / 2 - 4):
    rod("fender", P(x, 8, BF - 42), P(x, 8, BF - 2), M(0.9), BRASS, verts=16)
    sphere("fender knob", tuple(P(x, 8, BF - 42)), M(1.7), BRASS)
# the grate: an iron basket, two logs laid and cold, grey ash under them
gd = (BF + D1 - 8) / 2
for k in range(5):
    rod("grate bar", P(fx - 26, 12 + k * 4.5, gd - 8), P(fx + 26, 12 + k * 4.5, gd - 8), M(0.6), CAST, verts=8)
for x in (fx - 26, fx + 26):
    rod("grate leg", P(x, 0, gd - 8), P(x, 30, gd - 8), M(0.9), CAST, verts=8)
box_cm("grate floor", fx - 26, fx + 26, 11, 12, gd - 8, gd + 8, CAST)
BARK = scan("bark", "jolcham_oak_bark_01", size=0.3, tint=(0.5, 0.4, 0.32), bright=0.35, rough=(0.7, 0.95), bump=0.8)
ASH = plain("ash", (0.18, 0.17, 0.16), rough=1.0)
for (y, a, ln) in ((18, 0.1, 44), (23, -0.18, 40)):
    log = cylinder("log", 0, 0, -M(ln / 2), M(ln / 2), M(5.0), BARK, verts=20)
    log.rotation_euler = (0, math.pi / 2, a); log.location = P(fx, y, gd)
box_cm("ash", fx - 24, fx + 24, 12, 13.2, gd - 7, gd + 7, ASH)
# on the mantel: two brass candlesticks, candles lit; a little jar, a box
def candlestick(x, y, d, h=24, candle=16):
    lathe("candlestick", [(0, 0), (0.055, 0), (0.058, 0.006), (0.05, 0.014), (0.016, 0.03), (0.012, 0.06), (0.02, 0.07), (0.011, 0.08),
                          (0.011, M(h) - 0.03), (0.02, M(h) - 0.018), (0.026, M(h) - 0.01), (0.016, M(h)), (0, M(h))], BRASS, at=tuple(P(x, y, d)), steps=40)
    cylinder("candle", M(x), M(d), M(y + h - 1), M(y + h + candle), M(1.05), WAX, verts=32)
    for j in range(3):
        a = 0.4 + j * 1.9; L_ = 2 + j * 1.1
        sphere("drip", tuple(P(x + math.cos(a) * 1.05, y + h + candle - L_ / 2, d + math.sin(a) * 1.05)), M(0.3), WAX, squash=(1, 1, L_ / 0.6))
    cylinder("wick", M(x), M(d), M(y + h + candle - 0.2), M(y + h + candle + 0.9), M(0.07), WICK, verts=6)
    return P(x, y + h + candle + 0.9, d)
FLAMES = {}
# (not lit: the room is lit by the desk lamp)
candlestick(fx - fw / 2 + 22, MANTEL_Y, BF - 9, h=30, candle=20)
candlestick(fx + fw / 2 - 8, MANTEL_Y, BF - 9, h=30, candle=20)
# a pothos in a little white pot at the mantel's left end, its vines let down
# over the edge and the tiles, as in the picture
POTHOS = plain("pothos leaf", (0.09, 0.27, 0.06), rough=0.42, sheen=0.2)
_pb = POTHOS.node_tree.nodes["Principled BSDF"]; _pb.inputs["Subsurface Weight"].default_value = 0.35; _pb.inputs["Subsurface Radius"].default_value = (0.003, 0.008, 0.002)
VINE = plain("pothos vine", (0.16, 0.26, 0.08), rough=0.5)
def heart_leaf(at, size, facing, tilt, curl=0.18):
    """a pothos leaf: heart-shaped, pointed, folded a little along its midrib;
    its stalk end at `at` (Blender), pointing along `facing` (radians about
    the upright), drooping by `tilt`"""
    me = bpy.data.meshes.new("pothos leaf"); bm = bmesh.new(); n = 18
    rows = []
    for j in range(n + 1):
        t = j / n
        # half-width along the leaf: wide lobes near the stalk, a long point
        w = (math.sin(math.pi * min(1, t * 1.15)) ** 0.8) * (1 - t) ** 0.35 * 0.55 + (0.12 * (1 - t) if t < 0.15 else 0)
        row = []
        for i in (-2, -1, 0, 1, 2):
            u = i / 2
            x = u * w * size; y = t * size - (0.1 * size if t < 0.12 and abs(u) > 0.5 else 0)
            z = abs(u) * w * size * curl
            row.append(bm.verts.new((x, y, z)))
        rows.append(row)
    for j in range(n):
        for i in range(4): bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("pothos leaf", me)); o.data.materials.append(POTHOS)
    for p in o.data.polygons: p.use_smooth = True
    o.modifiers.new("leaf", "SOLIDIFY").thickness = 0.0006
    o.location = at; o.rotation_euler = (tilt, 0, facing)
    return o
PRNG = random.Random(4321)
px_, pd_ = fx - fw / 2 + 2, BF - 10
lathe("pothos pot", [(0, 0), (0.04, 0), (0.042, 0.004), (0.05, 0.075), (0.054, 0.08), (0, 0.08)], CERAMIC, at=tuple(P(px_, MANTEL_Y, pd_)), steps=40)
cylinder("pothos earth", M(px_), M(pd_), M(MANTEL_Y + 7.2), M(MANTEL_Y + 7.6), M(4.6), plain("pot earth", (0.05, 0.035, 0.02), rough=1.0))
for k in range(13):
    # each vine: up and out of the pot, over the mantel's front edge, down past the tiles
    ang = -1.25 + k * 0.16 + PRNG.uniform(-0.08, 0.08)
    drop = PRNG.uniform(30, 70) if k > 2 else PRNG.uniform(4, 12)
    out = PRNG.uniform(3, 8)
    p0 = P(px_, MANTEL_Y + 7.4, pd_)
    p1 = P(px_ + math.sin(ang) * out * 0.6, MANTEL_Y + 11, pd_ - math.cos(ang) * 4 - 2)
    p2 = P(px_ + math.sin(ang) * out, MANTEL_Y + 2, BF - 19.5)
    p3 = P(px_ + math.sin(ang) * out * 1.3 + PRNG.uniform(-4, 4), MANTEL_Y - drop * 0.5, BF - 20.5)
    p4 = P(px_ + math.sin(ang) * out * 1.2 + PRNG.uniform(-6, 6), MANTEL_Y - drop, BF - 19)
    cu = bpy.data.curves.new("pothos vine", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = M(0.22); cu.bevel_resolution = 3
    spl = cu.splines.new("BEZIER"); spl.bezier_points.add(4)
    for bp_, v in zip(spl.bezier_points, (p0, p1, p2, p3, p4)): bp_.co = v; bp_.handle_left_type = bp_.handle_right_type = "AUTO"
    vine = link(bpy.data.objects.new("pothos vine", cu)); vine.data.materials.append(VINE)
    # leaves along it, every few centimetres, alternating, smaller toward the tip
    pts_ = [p0.lerp(p1, t) for t in (0.5, 1.0)] + [p1.lerp(p2, t) for t in (0.34, 0.67, 1.0)] + [p2.lerp(p3, t) for t in (0.2, 0.4, 0.6, 0.8, 1.0)] + [p3.lerp(p4, t) for t in (0.2, 0.4, 0.6, 0.8, 1.0)]
    for j, at in enumerate(pts_):
        size = M(PRNG.uniform(3.6, 5.2) * (1 - j / len(pts_) * 0.35))
        hanging = at.z < M(MANTEL_Y + 1)
        heart_leaf(at, size, (ang * 0.3 + (1 if j % 2 else -1) * PRNG.uniform(0.3, 0.9) + math.pi) if hanging else PRNG.uniform(0, math.tau),
                   -PRNG.uniform(1.0, 1.45) if hanging else PRNG.uniform(0.25, 0.7))
lathe("jar", [(0, 0), (0.035, 0), (0.042, 0.03), (0.04, 0.07), (0.028, 0.085), (0.03, 0.095), (0, 0.095)], plain("glazed jar", (0.2, 0.25, 0.22), rough=0.3), at=tuple(P(fx - 30, MANTEL_Y, BF - 8)), steps=32)
box_cm("trinket box", fx + 20, fx + 34, MANTEL_Y, MANTEL_Y + 6, BF - 12, BF - 5, WALNUT, 0.5)
# over it, the cipher wheel on its walnut plaque
WHEEL = dict(x=fx, y=196, r=22, plaque=28)
wh = WHEEL
box_cm("plaque", wh["x"] - wh["plaque"], wh["x"] + wh["plaque"], wh["y"] - wh["plaque"], wh["y"] + wh["plaque"], BF - 3, BF, WALNUT, 1.2)
box_cm("plaque bead", wh["x"] - wh["plaque"] + 3, wh["x"] + wh["plaque"] - 3, wh["y"] - wh["plaque"] + 3, wh["y"] + wh["plaque"] - 3, BF - 3.6, BF - 3, WALNUT, 0.8)
disc = lathe("cipher wheel", [(0, 0), (M(wh["r"]), 0), (M(wh["r"]) + 0.004, 0.006), (M(wh["r"]), 0.012), (0, 0.012)], BRASS, steps=96)
disc.rotation_euler = (math.pi / 2, 0, 0); disc.location = P(wh["x"], wh["y"], BF - 3.6)
face = bpy.data.meshes.new("cipher face"); bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); n = 96
c0 = bm.verts.new(tuple(P(wh["x"], wh["y"], BF - 4.85)))
ring = [bm.verts.new(tuple(P(wh["x"] + math.cos(2 * math.pi * k / n) * (wh["r"] - 0.3), wh["y"] + math.sin(2 * math.pi * k / n) * (wh["r"] - 0.3), BF - 4.85))) for k in range(n)]
for k in range(n):
    f = bm.faces.new((c0, ring[(k + 1) % n], ring[k]))
    for lp in f.loops:
        co = lp.vert.co
        lp[uvl].uv = (0.5 + (co.x - M(wh["x"])) / M(2 * wh["r"]) * 0.98, 0.5 + (co.z - M(wh["y"])) / M(2 * wh["r"]) * 0.98)
bm.to_mesh(face); bm.free()
arch(link(bpy.data.objects.new("cipher face", face))).data.materials.append(BRASS)
# The inscription is hidden here, as in the candle puzzle's initial view.
hub = lathe('cipher spindle', [(0,0),(.028,0),(.029,.008),(.022,.026),(0,.029)], BRASS, steps=64)
hub.rotation_euler=(math.pi/2,0,0); hub.location=P(wh['x'],wh['y'],BF-4.9)
for radius in (wh['r']-1.2,wh['r']-3.2):
    bpy.ops.mesh.primitive_torus_add(major_radius=M(radius),minor_radius=M(.25),location=tuple(P(wh['x'],wh['y'],BF-4.92)),rotation=(math.pi/2,0,0))
    arch(bpy.context.object).data.materials.append(BRASS)
def framed_plate(corner, across, up, w, h, plate, mount=6.0, rail=3.2, deep=3.2, name="plate"):
    """a botanical plate as the picture has them: a dark walnut moulding, a
    white mount, the plate, glass over it; laid on a wall from `corner` (its
    lower left, Blender), `across`/`up` the wall's own directions, `out` off it"""
    out = across.cross(up).normalized()
    def at(x, y, z=0.0): return corner + across * M(x) + up * M(y) + out * M(z)
    W_, H_ = w + 2 * mount, h + 2 * mount
    for (a, b, c, e) in ((-rail, W_ + rail, -rail, 0), (-rail, W_ + rail, H_, H_ + rail), (-rail, 0, 0, H_), (W_, W_ + rail, 0, H_)):
        me = bpy.data.meshes.new(name + " frame"); bm_ = bmesh.new()
        vs_ = [bm_.verts.new(at(x, y, z)) for z in (0, deep) for (x, y) in ((a, c), (b, c), (b, e), (a, e))]
        for f_ in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)): bm_.faces.new([vs_[i] for i in f_])
        bm_.to_mesh(me); bm_.free()
        fr = arch(link(bpy.data.objects.new(name + " frame", me))); fr.data.materials.append(FRAME_DARK); bevel(fr, M(0.5), 2)
    card(name + " mount", [at(0, 0, 0.4), at(W_, 0, 0.4), at(W_, H_, 0.4), at(0, H_, 0.4)], MOUNT_WHITE)
    arch(card(name, [at(mount, mount, 0.6), at(mount + w, mount, 0.6), at(mount + w, mount + h, 0.6), at(mount, mount + h, 0.6)], plate))
    gl_ = card(name + " glass", [at(0, 0, deep - 0.6), at(W_, 0, deep - 0.6), at(W_, H_, deep - 0.6), at(0, H_, deep - 0.6)], GLASS)
    return gl_
# a pressed fern, framed, on the left wall (as the picture's: a single frond
# in a white mount, a dark moulding)
framed_plate(P(X0 + 0.3, 128, 420), Vector((0, 1, 0)), Vector((0, 0, 1)), 40, 40 * 1200 / 900, FERN_PLATE, name="fern plate")

# ── right of the window: the panelled wall, a rose framed on it; along the
#    right-hand wall, the bookcase ────────────────────────────────────────────
BC = dict(x0=96, x1=X1 - 2, deep=42, top=TOP - 26)
def bookcase_v6(rng, wall, side, d0, d1, top, levels, bays, depth=36):
    """the tall case of the picture: books, and among them cream archive
    boxes with paper labels, and glass jars of seed (row 0 the bottom shelf)"""
    X = wall; face = X - side * depth; xa, xb = sorted((X, face))
    box_cm("bookcase back", *sorted((X, X - side * 1.5)), 0, top, d0, d1, OAK)
    uprights = [d0 + (d1 - d0) * k / bays for k in range(bays + 1)]
    for d in uprights: box_cm("upright", xa, xb, 0, top, d - 1.6, d + 1.6, OAK, 0.4)
    box_cm("cornice", *sorted((X, face - side * 4)), top, top + 8, d0 - 4, d1 + 4, OAK_X, 1.0)
    box_cm("plinth", *sorted((X, face - side * 1)), 0, levels[0], d0, d1, OAK_X, 0.5)
    for y in levels[1:-1]: box_cm("shelf", xa, xb, y - 2.2, y, d0, d1, OAK_X, 0.4)
    PLAN = {(0, 0): "boxes", (1, 1): "boxes", (2, 0): "jars", (2, 2): "boxes", (3, 1): "boxes", (4, 0): "boxes", (4, 2): "jars", (5, 1): "boxes", (6, 0): "boxes", (6, 2): "boxes"}
    SEEDS = (plain("seeds", (0.2, 0.12, 0.05), rough=0.9), plain("dried pods", (0.42, 0.33, 0.18), rough=0.85), plain("pale seed", (0.6, 0.52, 0.36), rough=0.8))
    CORK = scan("cork", "dark_wood", size=0.1, tint=(0.62, 0.48, 0.32), bright=0.9, sat=0.5, rough=(0.8, 0.95), bump=0.4)
    HOLE = plain("finger hole", (0.02, 0.016, 0.012), rough=1.0)
    for i, y in enumerate(levels[:-1]):
        shelf_top = levels[i + 1] - 2.2
        for bi, (a, b) in enumerate(zip(uprights, uprights[1:])):
            kind = PLAN.get((i, bi), "books"); d = a + 2.2
            if kind == "boxes":
                for k in range(rng.choice((2, 3, 3))):
                    w = rng.uniform(10.5, 12.5); hb = min(shelf_top - y - 2.5, 31); back_ = X - side * 1.6; front_ = X - side * 32
                    box_cm("archive box", *sorted((back_, front_)), y, y + hb, d, d + w, CARDBOARD, 0.35)
                    fx_ = front_ - side * 0.06
                    card("archive label", [P(fx_, y + hb * 0.56, d + 1.8), P(fx_, y + hb * 0.56, d + w - 1.8), P(fx_, y + hb * 0.82, d + w - 1.8), P(fx_, y + hb * 0.82, d + 1.8)], LABEL)
                    card("finger hole", [P(fx_, y + hb * 0.16, d + w / 2 - 1.6), P(fx_, y + hb * 0.16, d + w / 2 + 1.6), P(fx_, y + hb * 0.24, d + w / 2 + 1.6), P(fx_, y + hb * 0.24, d + w / 2 - 1.6)], HOLE)
                    d += w + rng.uniform(0.2, 0.8)
            elif kind == "jars":
                for k in range(2):
                    jh = min(shelf_top - y - 4, rng.uniform(17, 22)) / 100; jr = rng.uniform(0.042, 0.05)
                    at_ = P(X - side * 17, y, d + 7)
                    lathe("jar", [(0, 0), (jr, 0), (jr + 0.002, 0.004), (jr + 0.002, jh - 0.03), (jr - 0.012, jh - 0.012), (jr - 0.012, jh), (0, jh)], GLASS, at=tuple(at_), steps=32)
                    cylinder("jar fill", at_.x, at_.y, at_.z + 0.003, at_.z + jh * rng.uniform(0.45, 0.75), jr - 0.003, rng.choice(SEEDS))
                    cylinder("cork", at_.x, at_.y, at_.z + jh - 0.004, at_.z + jh + 0.014, jr - 0.013, CORK)
                    d += 2 * jr * 100 + 4
            while d < b - 4:
                w = rng.uniform(2.2, 5.5); h = min(shelf_top - y - 1.5, rng.uniform(19, 31)); deep = rng.uniform(15, 24)
                lean = rng.choice((0, 0, 0, 0, rng.uniform(-0.12, 0.12)))
                book(rng, X - side * 1.6, d, y, w, h, deep, spine_mat, COVERS, PAGES, lean, side=side)
                d += w + rng.uniform(0.05, 0.5)
bookcase_v6(RNG, X1, 1, 250, D1 - BC["deep"] - 2, BC["top"], (10, 50, 92, 132, 172, 212, 252, BC["top"] - 4), 3)
def front(x0, x1, y0, y1, d):
    """a flat thing on the back wall, its corners lower left first as one facing it sees it"""
    return [P(x0, y0, d), P(x1, y0, d), P(x1, y1, d), P(x0, y1, d)]
# right of the window, a leafy branch, framed as the fern is (where the rose
# was: the user's picture has a leaf there)
RX, RW_ = (wx1 + 12 + X1 - 40) / 2, 40
framed_plate(P(RX - RW_ / 2 - 6, 126, D1 - 0.3), Vector((1, 0, 0)), Vector((0, 0, 1)), RW_, RW_ * 1200 / 900, LEAF_PLATE, name="leaf plate")

# ── the writing desk, facing us, its lamp, candles, letters, the chest ─────
DK = DESK
def writing_desk():
    w, dp, h = DK["w"], DK["deep"], DK["h"]
    # (its drawers toward us: a desk faced from the room)
    pedestal_desk(dict(x0=-w / 2, x1=w / 2, d0=-dp / 2, d1=dp / 2, h=h), WALNUT, LEATHER, BRASS)
desk_root = assembled("writing desk", writing_desk, at=(DK["x"], 0, DK["d"]), turn=DK["turn"])
at_desk = framed((DK["x"], 0, DK["d"]), DK["turn"])
h = DK["h"]
# the lamp of the picture: a brass student lamp, its shade a brass bell lined
# with white enamel, hung forward over the desk on a curved arm; its bulb in
# the shade, never seen from where we sit
LAMP = dict(x=54, d=16)
lb = at_desk(LAMP["x"], h, LAMP["d"])
lathe("lamp foot", [(0, 0), (0.07, 0), (0.073, 0.006), (0.066, 0.016), (0.03, 0.026), (0.016, 0.04), (0, 0.04)], BRASS, at=tuple(lb), steps=48)
lathe("lamp column", [(0, 0.03), (0.011, 0.03), (0.009, 0.3), (0.014, 0.31), (0.012, 0.33), (0, 0.33)], BRASS, at=tuple(lb), steps=32)
ARM_TURN = DK["turn"] + math.radians(200)          # (toward the desk's middle and toward us)
arm_ = tube("lamp arm", [(0, 0.32), (0.05, 0.36), (0.13, 0.37), (0.17, 0.35)], 0.006, BRASS, at=tuple(lb), rot=ARM_TURN)
head = lb + Vector((math.cos(ARM_TURN) * 0.17, math.sin(ARM_TURN) * 0.17, 0.35))
ENAMEL = plain("white enamel", (0.82, 0.8, 0.74), rough=0.35)
BELL = [(0.012, 0.0), (0.03, -0.012), (0.06, -0.045), (0.086, -0.088), (0.092, -0.097)]
tip_ = (math.radians(14) * math.sin(ARM_TURN), -math.radians(14) * math.cos(ARM_TURN), 0)
shade_ = lathe("lamp shade", BELL, BRASS, at=tuple(head), steps=64)
shade_.modifiers.new("brass sheet", "SOLIDIFY").thickness = 0.0016
lining_ = lathe("lamp lining", [(r_ * 0.96, z_ - 0.002) for r_, z_ in BELL], ENAMEL, at=tuple(head), steps=64)
for o_ in (shade_, lining_): o_.rotation_euler = tip_
sphere("lamp finial", tuple(head + Vector((0, 0, 0.012))), 0.012, BRASS)
LAMP_AT = head - Vector((0, 0, 0.03))
# the open book in the middle, its pages printed close; the microscope at
# the left; the books under the lamp, at the right
PRINTED = paper("printed page", (0.78, 0.73, 0.6), 0.18)
_pn = PRINTED.node_tree.nodes; _pl = PRINTED.node_tree.links.new; _pb_ = _pn["Principled BSDF"]
_tc = _pn.new("ShaderNodeTexCoord"); _lines = _pn.new("ShaderNodeTexWave"); _lines.wave_type = "BANDS"; _lines.bands_direction = "Y"
_lines.inputs["Scale"].default_value = 380; _lines.inputs["Distortion"].default_value = 0.0
_words = _pn.new("ShaderNodeTexNoise"); _words.inputs["Scale"].default_value = 900; _words.inputs["Detail"].default_value = 1
for t_ in (_lines, _words): _pl(_tc.outputs["UV"], t_.inputs["Vector"])
_ink = _pn.new("ShaderNodeMath"); _ink.operation = "MULTIPLY"
_band = _pn.new("ShaderNodeMath"); _band.operation = "GREATER_THAN"; _band.inputs[1].default_value = 0.72; _pl(_lines.outputs["Fac"], _band.inputs[0])
_wd = _pn.new("ShaderNodeMath"); _wd.operation = "GREATER_THAN"; _wd.inputs[1].default_value = 0.42; _pl(_words.outputs["Fac"], _wd.inputs[0])
_pl(_band.outputs[0], _ink.inputs[0]); _pl(_wd.outputs[0], _ink.inputs[1])
_mar = _pn.new("ShaderNodeMath"); _mar.operation = "MULTIPLY"
_sep = _pn.new("ShaderNodeSeparateXYZ"); _pl(_tc.outputs["UV"], _sep.inputs[0])
_in = _pn.new("ShaderNodeMapRange"); _in.inputs["From Min"].default_value = 0.12; _in.inputs["From Max"].default_value = 0.13; _pl(_sep.outputs["X"], _in.inputs["Value"])
_out = _pn.new("ShaderNodeMapRange"); _out.inputs["From Min"].default_value = 0.88; _out.inputs["From Max"].default_value = 0.87; _pl(_sep.outputs["X"], _out.inputs["Value"])
_m2 = _pn.new("ShaderNodeMath"); _m2.operation = "MULTIPLY"; _pl(_in.outputs["Result"], _m2.inputs[0]); _pl(_out.outputs["Result"], _m2.inputs[1])
_pl(_ink.outputs[0], _mar.inputs[0]); _pl(_m2.outputs[0], _mar.inputs[1])
_mixc = _pn.new("ShaderNodeMix"); _mixc.data_type = "RGBA"; _pl(_mar.outputs[0], _mixc.inputs["Factor"])
_pl(_pb_.inputs["Base Color"].links[0].from_socket, _mixc.inputs[6]) if _pb_.inputs["Base Color"].is_linked else None
if not _pb_.inputs["Base Color"].is_linked: _mixc.inputs[6].default_value = (0.78, 0.73, 0.6, 1)
_mixc.inputs[7].default_value = (0.12, 0.1, 0.08, 1); _pl(_mixc.outputs[2], _pb_.inputs["Base Color"])
BOOK_CLOTH = plain("book cloth", (0.16, 0.09, 0.05), rough=0.7)
def open_book(w=17.0, deep=24.0, thick=1.8):
    """an open book lying on the desk: its boards, two blocks of pages that
    rise from the gutter and fall away to the fore-edges, printed"""
    for side in (-1, 1):
        me = bpy.data.meshes.new("open pages"); bm_ = bmesh.new(); uv_ = bm_.loops.layers.uv.new(); n_ = 14
        top_, bot_ = [], []
        for i in range(n_ + 1):
            t = i / n_; x_ = side * (0.4 + t * w)
            z_ = thick * (0.55 + 0.45 * math.sin(math.pi * min(1, t * 1.1)) ** 0.6) + (1 - t) ** 6 * 1.2
            top_.append([bm_.verts.new(tuple(at_frame(x_, z_, dd))) for dd in (-deep / 2, deep / 2)])
            bot_.append([bm_.verts.new(tuple(at_frame(x_, 0.36, dd))) for dd in (-deep / 2, deep / 2)])
        for i in range(n_):
            f_ = bm_.faces.new((top_[i][0], top_[i + 1][0], top_[i + 1][1], top_[i][1]))
            for lp, (u, v) in zip(f_.loops, ((i / n_, 0), ((i + 1) / n_, 0), ((i + 1) / n_, 1), (i / n_, 1))): lp[uv_].uv = (u if side > 0 else 1 - u, v)
            bm_.faces.new((bot_[i][0], top_[i][0], top_[i + 1][0], bot_[i + 1][0]))
            bm_.faces.new((bot_[i][1], bot_[i + 1][1], top_[i + 1][1], top_[i][1]))
        bm_.faces.new((bot_[n_][0], top_[n_][0], top_[n_][1], bot_[n_][1]))
        bm_.to_mesh(me); bm_.free()
        pg_ = link(bpy.data.objects.new("open pages", me)); pg_.data.materials.append(PRINTED)
        for p_ in pg_.data.polygons: p_.use_smooth = True
        # its board under the pages, a little wider
        mb = bpy.data.meshes.new("open book board"); bb = bmesh.new()
        vs_ = [bb.verts.new(tuple(at_frame(x_, z_, dd))) for z_ in (0.0, 0.35) for (x_, dd) in ((0, -deep / 2 - 0.8), (side * (w + 1.2), -deep / 2 - 0.8), (side * (w + 1.2), deep / 2 + 0.8), (0, deep / 2 + 0.8))]
        for f_ in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)): bb.faces.new([vs_[i] for i in f_])
        bb.to_mesh(mb); bb.free()
        link(bpy.data.objects.new("open book board", mb)).data.materials.append(BOOK_CLOTH)
def at_frame(x_, z_, dd):
    return at_desk(BOOK_AT[0] + x_, h + z_, BOOK_AT[1] + dd)
BOOK_AT = (-10, -4)
open_book()
scope_ = import_model("vintage_microscope", height=M(36), at=tuple(at_desk(-50, h, 6)), rot=DK["turn"] + math.radians(float(arg("--scope", "250"))))
for k in range(3):
    o = book(RNG, 0, 0, 0, 4.0, 22, 16, spine_mat, COVERS, PAGES, side=-1)
    o.rotation_euler = (math.pi / 2, 0, DK["turn"] + 0.05 * k); o.location = at_desk(60, h + 2 + k * 4.1, -14)
# the gilt chest, at the desk's right, toward us
CHEST_LOCAL = dict(x0=20, x1=41, d0=-26, d1=-11, y0=h + 1, y1=h + 11.5, lid=7.7)
def the_chest():
    global chest_body, chest_hinge, lid_parts
    chest_body, chest_hinge, lid_parts = chest(CHEST_LOCAL)
assembled("chest", the_chest, at=(DK["x"], 0, DK["d"]), turn=DK["turn"])
CHEST_PARTS = chest_body + lid_parts
# the chair behind it, drawn up to it
chair = import_model("dining_chair_02", height=M(96), at=tuple(P(DK["x"] - 10, 0, DK["d"] + 58)), rot=math.pi + 0.15)
darken_model(chair, (0.62, 0.55, 0.48))
# one large old rug under the desk and out into the room, as in the picture
rug(-215, 190, 150, 478, PERSIAN)

# ── close at hand: the leather armchair, left; the glass case, right ───────
arm = import_model("ArmChair_01", height=M(100), at=tuple(P(-196, 0, 318)), rot=math.radians(float(arg("--arm", "44"))))
# (an old club chair: all of it in worn brown leather)
for name in arm["meshes"]:
    o = bpy.data.objects[name]
    for slot in o.material_slots: slot.material = CHAIR_LEATHER
# a knitted throw left over its back and its arm, as in the picture: a
# blanket let fall on the chair and settled there (Blender's cloth), then
# kept as it lay
def drape_throw():
    chair_meshes = [bpy.data.objects[n_] for n_ in arm["meshes"]]
    bpy.context.view_layer.update()
    pts = [o_.matrix_world @ v_.co for o_ in chair_meshes for v_ in o_.data.vertices]
    top = max(p_.z for p_ in pts)
    crest = [p_ for p_ in pts if p_.z > top - 0.05]
    cx_, cy_ = sum(p_.x for p_ in crest) / len(crest), sum(p_.y for p_ in crest) / len(crest)
    mid = sum(pts, Vector()) / len(pts)
    toward = Vector((mid.x - cx_, mid.y - cy_, 0)).normalized()        # (from the back toward the seat)
    along = Vector((-toward.y, toward.x, 0))                             # (along the back)
    if along.x < 0: along = -along                                       # (toward the room's middle: the chair's right as we see it)
    me = bpy.data.meshes.new("knitted throw"); bm_ = bmesh.new()
    nx_, ny_ = 40, 76; W_, L_ = 0.72, 1.45
    grid = [[bm_.verts.new(Vector((cx_, cy_, top + 0.05)) + along * ((i / nx_ - 0.5) * W_ + float(arg("--throw-along", "0.12"))) + toward * ((j / ny_ - 0.45) * L_)) for i in range(nx_ + 1)] for j in range(ny_ + 1)]
    for j in range(ny_):
        for i in range(nx_): bm_.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    uv_ = bm_.loops.layers.uv.new()
    bm_.to_mesh(me); bm_.free()
    th = link(bpy.data.objects.new("knitted throw", me))
    for o_ in chair_meshes:
        col = o_.modifiers.new("collide", "COLLISION"); o_.collision.thickness_outer = 0.006
    cl = th.modifiers.new("cloth", "CLOTH")
    cl.settings.quality = 8; cl.settings.mass = 0.4; cl.settings.tension_stiffness = 12; cl.settings.compression_stiffness = 12
    cl.settings.bending_stiffness = 0.6; cl.settings.air_damping = 1.5
    cl.collision_settings.distance_min = 0.006; cl.collision_settings.use_self_collision = False
    sc = bpy.context.scene
    sc.frame_start = 1; sc.frame_end = 90; cl.point_cache.frame_end = 90
    for f_ in range(1, 91): sc.frame_set(f_)
    bpy.context.view_layer.objects.active = th
    for o_ in bpy.context.selected_objects: o_.select_set(False)
    th.select_set(True)
    bpy.ops.object.convert(target="MESH")
    sc.frame_set(1)
    for o_ in chair_meshes:
        for m_ in [m_ for m_ in o_.modifiers if m_.type == "COLLISION"]: o_.modifiers.remove(m_)
    th = bpy.data.objects["knitted throw"]
    th.data.materials.append(THROW)
    for p_ in th.data.polygons: p_.use_smooth = True
    sol = th.modifiers.new("wool", "SOLIDIFY"); sol.thickness = 0.008; sol.offset = 1
    sub = th.modifiers.new("soft", "SUBSURF"); sub.levels = sub.render_levels = 1
    return th
if arg("--throw", "1") == "1": drape_throw()
CT = CASE_TABLE
def case_table():
    h_, r = M(CT["h"]), M(CT["r"])
    lathe("table top", [(0, h_ - 0.03), (r, h_ - 0.03), (r + 0.006, h_ - 0.018), (r, h_), (0, h_)], WALNUT, steps=64)
    lathe("table column", [(0, 0), (0.05, 0.08), (0.04, 0.16), (0.045, 0.3), (0.035, 0.45), (0.05, 0.55), (0.04, h_ - 0.03), (0, h_ - 0.03)], WALNUT, steps=32)
    for k in range(3):
        tube("table foot", [(0.03, 0.12), (0.16, 0.06), (0.26, 0.015)], 0.018, WALNUT, rot=k * math.tau / 3 + 0.3)
assembled("case table", case_table, at=(CT["x"], 0, CT["d"]))
ty = CT["h"]
# the glass case: a brass frame round glass, earth halfway up it, a seedling,
# its roots against the front glass (toward us)
cx0, cx1 = CT["x"] - CASE["w"] / 2 - 6, CT["x"] + CASE["w"] / 2 - 6
cd0, cd1 = CT["d"] - CASE["deep"] / 2, CT["d"] + CASE["deep"] / 2
cy0, cy1, soil = ty, ty + CASE["h"], ty + 18
box_cm("case base", cx0 - 1.5, cx1 + 1.5, cy0, cy0 + 3, cd0 - 1.5, cd1 + 1.5, WALNUT, 0.5)
for x in (cx0, cx1):
    for d in (cd0, cd1): box_cm("case post", x - 0.7, x + 0.7, cy0 + 3, cy1, d - 0.7, d + 0.7, BRASS, 0.2)
for d in (cd0, cd1): box_cm("case rail", cx0, cx1, cy1 - 1.2, cy1, d - 0.7, d + 0.7, BRASS, 0.2)
for x in (cx0, cx1): box_cm("case rail", x - 0.7, x + 0.7, cy1 - 1.2, cy1, cd0, cd1, BRASS, 0.2)
me = bpy.data.meshes.new("case roof"); bm = bmesh.new()
a0, a1, a2, a3 = (bm.verts.new(tuple(P(x, cy1, d))) for x, d in ((cx0, cd0), (cx1, cd0), (cx1, cd1), (cx0, cd1)))
RZ = CASE["roof"]
r0, r1 = bm.verts.new(tuple(P(cx0, cy1 + RZ, (cd0 + cd1) / 2))), bm.verts.new(tuple(P(cx1, cy1 + RZ, (cd0 + cd1) / 2)))
bm.faces.new((a0, a1, r1, r0)); bm.faces.new((a3, r0, r1, a2)); bm.faces.new((a0, r0, a3)); bm.faces.new((a1, a2, r1))
bm.to_mesh(me); bm.free()
arch(link(bpy.data.objects.new("case roof", me))).data.materials.append(GLASS)
rod("ridge", P(cx0, cy1 + RZ, (cd0 + cd1) / 2), P(cx1, cy1 + RZ, (cd0 + cd1) / 2), M(0.5), BRASS, verts=8)
for x in (cx0, cx1):
    rod("gable", P(x, cy1, cd0), P(x, cy1 + RZ, (cd0 + cd1) / 2), M(0.45), BRASS, verts=8)
    rod("gable", P(x, cy1, cd1), P(x, cy1 + RZ, (cd0 + cd1) / 2), M(0.45), BRASS, verts=8)
box_cm("case glass", cx0, cx1, cy0 + 3, cy1 - 0.4, cd0 - 0.2, cd0 + 0.2, GLASS)
box_cm("case glass", cx0, cx1, cy0 + 3, cy1 - 0.4, cd1 - 0.2, cd1 + 0.2, GLASS)
box_cm("case glass", cx0 - 0.2, cx0 + 0.2, cy0 + 3, cy1 - 0.4, cd0, cd1, GLASS)
box_cm("case glass", cx1 - 0.2, cx1 + 0.2, cy0 + 3, cy1 - 0.4, cd0, cd1, GLASS)
def earth_material():
    """potting earth: dark crumbs of every brown, a grit of sand"""
    m = bpy.data.materials.new("earth"); m.use_nodes = True
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    crumbs = N.new("ShaderNodeTexVoronoi"); crumbs.inputs["Scale"].default_value = 420; crumbs.inputs["Randomness"].default_value = 1.0
    damp = N.new("ShaderNodeTexNoise"); damp.inputs["Scale"].default_value = 25; damp.inputs["Detail"].default_value = 6
    for t in (crumbs, damp): Lk(tc.outputs["Object"], t.inputs["Vector"])
    shade = N.new("ShaderNodeValToRGB"); r = shade.color_ramp
    r.elements[0].color = (0.012, 0.006, 0.0025, 1); r.elements[1].position = 0.8; r.elements[1].color = (0.075, 0.04, 0.016, 1)
    e = r.elements.new(0.985); e.color = (0.16, 0.12, 0.08, 1)
    hs = N.new("ShaderNodeSeparateColor"); Lk(crumbs.outputs["Color"], hs.inputs["Color"]); Lk(hs.outputs["Red"], shade.inputs["Fac"])
    wet = N.new("ShaderNodeMix"); wet.data_type = "RGBA"; wet.blend_type = "MULTIPLY"
    dr = N.new("ShaderNodeMapRange"); dr.inputs["To Min"].default_value = 0.0; dr.inputs["To Max"].default_value = 0.6
    Lk(damp.outputs["Fac"], dr.inputs["Value"]); Lk(dr.outputs["Result"], wet.inputs["Factor"]); Lk(shade.outputs["Color"], wet.inputs[6]); wet.inputs[7].default_value = (0.5, 0.42, 0.36, 1)
    Lk(wet.outputs[2], b.inputs["Base Color"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 1.0; bump.inputs["Distance"].default_value = 0.0015
    Lk(crumbs.outputs["Distance"], bump.inputs["Height"]); Lk(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.9; b.inputs["Specular IOR Level"].default_value = 0.3
    return m
EARTH = earth_material()
earth = box_cm("earth", cx0 + 0.3, cx1 - 0.3, cy0 + 3, soil, cd0 + 1.0, cd1 - 0.4, EARTH, keep=False)
sub = earth.modifiers.new("fine", "SUBSURF"); sub.subdivision_type = "SIMPLE"; sub.levels = sub.render_levels = 5
crumb = bpy.data.textures.new("crumb", "CLOUDS"); crumb.noise_scale = 0.012; crumb.noise_depth = 3
dsp = earth.modifiers.new("crumble", "DISPLACE"); dsp.texture = crumb; dsp.strength = M(0.35); dsp.mid_level = 0.5; dsp.texture_coords = "GLOBAL"
ROOT_MAT = plain("root", (0.34, 0.25, 0.15), rough=0.5, sheen=0.3)
ROOT_MAT.node_tree.nodes["Principled BSDF"].inputs["Subsurface Weight"].default_value = 0.4
HAIR = plain("root hair", (0.38, 0.3, 0.2), rough=0.7, sheen=0.5)
ROOT_RNG = random.Random(7)
def root_curve(points, r0, r1, mat):
    cu = bpy.data.curves.new("root", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = M(r0); cu.bevel_resolution = 2; cu.use_fill_caps = True
    sp_ = cu.splines.new("BEZIER"); sp_.bezier_points.add(len(points) - 1)
    for k, (bp_, v) in enumerate(zip(sp_.bezier_points, points)):
        bp_.co = v; bp_.handle_left_type = bp_.handle_right_type = "AUTO"; bp_.radius = 1 - (1 - r1 / r0) * k / (len(points) - 1)
    o = link(bpy.data.objects.new("root", cu)); o.data.materials.append(mat)
    return o
def roots(x, y, depth, spread, level, r):
    """a root that forks in two, and each in two again — pressed against the
    glass, wandering a little, finer at every fork, with hairs"""
    if level > 5 or depth < 0.9: return
    for side in (-1, 1):
        sp = spread * ROOT_RNG.uniform(0.75, 1.2); dp = depth * ROOT_RNG.uniform(0.85, 1.15)
        ex, ey = x + side * sp, y - dp
        mx = x + side * sp * ROOT_RNG.uniform(0.25, 0.55)
        g = cd0 + 0.6 + ROOT_RNG.uniform(-0.05, 0.1)
        wob = [P(x + (ex - x) * t + ROOT_RNG.uniform(-0.35, 0.35) * (0 < t < 1), y + (ey - y) * t, g) for t in (0, 0.3, 0.62, 1)]
        wob[1] = P(mx + ROOT_RNG.uniform(-0.4, 0.4), y - dp * 0.3, g)
        root_curve(wob, r, r * 0.72, ROOT_MAT)
        for _ in range(3 if level >= 3 else 1):
            t = ROOT_RNG.uniform(0.2, 0.9); hx, hy = x + (ex - x) * t, y + (ey - y) * t
            a = ROOT_RNG.uniform(-2.6, -0.5); ln = ROOT_RNG.uniform(0.5, 1.2)
            root_curve([P(hx, hy, g), P(hx + math.cos(a) * ln, hy + math.sin(a) * ln, g)], r * 0.35, r * 0.2, HAIR)
        roots(ex, ey, depth * 0.7, spread * 0.58, level + 1, max(0.04, r * 0.7))
sx_, sd_ = (cx0 + cx1) / 2, (cd0 + cd1) / 2
# (its roots are not drawn here: from across the room they read as white
# scratches on the glass; they are seen in the case itself, The Old Tree)
SEEDLING = plain("seedling green", (0.11, 0.26, 0.05), rough=0.4, sheen=0.3)
_sb = SEEDLING.node_tree.nodes["Principled BSDF"]; _sb.inputs["Subsurface Weight"].default_value = 0.5; _sb.inputs["Subsurface Radius"].default_value = (0.004, 0.008, 0.002)
tube("stem", [(0, 0), (0.004, 0.05), (0.002, 0.1), (0.0, 0.13)], 0.003, SEEDLING, at=tuple(P(sx_, soil, sd_)))
for a in (0.1, 0.1 + math.pi):
    lf = leaf_blade("seed leaf", tuple(P(sx_ + math.cos(a) * 3.3, soil + 12.6, sd_ + math.sin(a) * 3.3)), M(3.4), SEEDLING, squash=(1.0, 0.48, 0.1))
    lf.rotation_euler = (0, 0.3 * (1 if a < 1 else -1), a)
for a in (1.6, 1.6 + math.pi):
    lf = leaf_blade("true leaf", tuple(P(sx_ + math.cos(a) * 2.2, soil + 14.2, sd_ + math.sin(a) * 2.2)), M(2.4), SEEDLING, squash=(1.0, 0.42, 0.1))
    lf.rotation_euler = (0.35, 0, a)
# about the seedling, as in the picture's terrarium: little ferns and moss on
# the earth (the seedling stays: its roots are The Old Tree)
def import_one(mid, index, height, at, rot):
    """one plant of a model that holds several: the index-th of its meshes
    (left to right as the model was made), stood at `at` as import_model stands one"""
    from mathutils import Matrix
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=f"{ASSETS}/models/{mid}/{mid}.gltf")
    objs = [o for o in bpy.data.objects if o not in before]
    bpy.context.view_layer.update()
    meshes = sorted([o for o in objs if o.type == "MESH"], key=lambda o: sum((o.matrix_world @ Vector(c) for c in o.bound_box), Vector()).x)
    keep = meshes[index % len(meshes)]
    for o in [o for o in objs if o.type == "MESH" and o is not keep]: bpy.data.objects.remove(o, do_unlink=True)
    objs = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new(mid, None); link(root)
    for o in objs:
        if o.parent is None: o.parent = root
    bpy.context.view_layer.update()
    pts = [keep.matrix_world @ Vector(c) for c in keep.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    s_ = height / (hi.z - lo.z)
    root.scale = (s_, s_, s_); root.rotation_euler = (0, 0, rot)
    c_ = (lo + hi) / 2
    root.location = Vector(at) - Matrix.Rotation(rot, 3, "Z") @ Vector((c_.x * s_, c_.y * s_, lo.z * s_))
    return root
import_one("fern_02", 0, M(14), tuple(P(cx0 + 10, soil, cd0 + 13)), 0.6)
import_one("fern_02", 1, M(12), tuple(P(cx1 - 10, soil, cd1 - 12)), 2.4)
import_one("fern_02", 2, M(10), tuple(P(cx1 - 15, soil, cd0 + 10)), 4.1)
for (mx_, md_, ms_) in ((cx0 + 18, cd1 - 8, 2.4), (sx_ + 6, sd_ + 4, 2.0), (cx1 - 20, sd_, 2.2), (cx0 + 6, sd_ - 6, 1.8)):
    import_model("moss_01", width=M(ms_ * 4.5), at=tuple(P(mx_, soil - 0.4, md_)), rot=mx_)
# the green specimen book beside it, as the close-up has it
BOOK_SCALE = (cx1 - cx0) / 94
SPECIMEN_BOOK = build_specimen_book(at=(M((cx0 + cx1) / 2), M(cd0) + .025 * BOOK_SCALE, M(ty) - .803 * BOOK_SCALE), scale=BOOK_SCALE)
for part in SPECIMEN_BOOK.children: arch(part)

# ── light: the desk lamp, under its dome; its light given back off the
#    ceiling, warm and broad; the moon and the sky at the window ─────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
lamp("the moon", "SUN", tuple(P(-400, 1900, 2800)), aim=tuple(P(0, 0, 300)), energy=float(arg("--moon", "0.8")), colour=(0.55, 0.68, 1.0), angle=math.radians(2))
sky_l = lamp("sky through the window", "AREA", tuple(P(WIN["x"], 200, D1 + 14)), aim=tuple(P(WIN["x"], 60, 300)), energy=float(arg("--sky", "40")), colour=(0.5, 0.62, 0.95), size=0.9, size_y=1.9)
sky_l.visible_camera = False; sky_l.visible_transmission = False; sky_l.visible_glossy = False
# the student lamp alight: its bulb in the bell, throwing its light down on the
# desk (a spot, wide and soft-edged), and a little of it on the enamel inside
bulb_l = lamp("desk lamp", "SPOT", tuple(LAMP_AT), energy=float(arg("--lamp", "55")), colour=(1.0, 0.8, 0.56), size=0.025)
bulb_l.data.spot_size = math.radians(118); bulb_l.data.spot_blend = 0.85
bulb_l.rotation_euler = tip_
bulb_l.visible_camera = False
glow_l = lamp("in the lamp's bell", "POINT", tuple(LAMP_AT + Vector((0, 0, 0.012))), energy=float(arg("--bell", "1.2")), colour=(1.0, 0.8, 0.56), size=0.01)
glow_l.visible_camera = False
bounce_l = lamp("lamp light off the ceiling", "AREA", tuple(P(DK["x"], TOP - 4, DK["d"] - 40)), aim=tuple(P(DK["x"], 0, DK["d"] - 40)),
                energy=float(arg("--bounce", "75")), colour=(1.0, 0.8, 0.6), size=3.2, size_y=3.6)
bounce_l.visible_camera = False; bounce_l.visible_glossy = False
fill_l = lamp("fill", "AREA", tuple(P(0, 250, 60)), aim=tuple(P(0, 100, D1)), energy=float(arg("--fill", "12")), colour=(0.8, 0.85, 1.0), size=2.6)
fill_l.visible_camera = False; fill_l.visible_glossy = False
eye_fill(float(arg("--eyefill", "5")))
clear_glass()
air = room_haze(X0, X1, 0, D1, TOP, 0)
air.hide_render = True          # (no haze: the room as crisp as the halls)

# ── what the game is told ──────────────────────────────────────────────────
LAYOUT.thing("binarytree", "Look into the glass case", corners(cx0 - 1.5, cx1 + 1.5, cy0, cy1 + RZ, cd0 - 1.5, cd1 + 1.5))
LAYOUT.thing("plantpot", "Look out at the garden", [P(wx0, WIN["sill"], GD), P(wx1, WIN["sill"], GD), P(wx1, SPRING, GD), P(wx0, SPRING, GD)] +
             [P(WIN["x"] + math.cos(math.pi * i / 8) * WIN["hw"], SPRING + math.sin(math.pi * i / 8) * WIN["hw"], GD) for i in range(9)])
LAYOUT.thing("cryptex", "Look at the cipher wheel", corners(wh["x"] - wh["plaque"], wh["x"] + wh["plaque"], wh["y"] - wh["plaque"], wh["y"] + wh["plaque"], BF - 4, BF))
LAYOUT.chest(CHEST_LOCAL, at=(DK["x"], 0, DK["d"]), turn=DK["turn"])
for name, at in FLAMES.items():
    key = "candle" if name == "desk left" else name.replace(" ", "-")
    LAYOUT.flame(key, at)
    LAYOUT.glow(key, at + Vector((0, 0, 0.02)), 40 if name.startswith("desk") else 30)
for x0_, x1_ in ((wx0, WIN["x"]), (WIN["x"], wx1)):
    LAYOUT.pane([P(x0_ + 4, WIN["sill"] + 8, GD), P(x1_ - 4, WIN["sill"] + 8, GD), P(x1_ - 4, SPRING - 5.5, GD), P(x0_ + 4, SPRING - 5.5, GD)])
LAYOUT.pane([P(WIN["x"] + math.cos(math.pi * i / 24) * r_in, SPRING + math.sin(math.pi * i / 24) * r_in, GD) for i in range(25)])
# (dust, in the lamplight and moonlight over the desk)
LAYOUT.dust([P(DK["x"] - 60, 90, DK["d"]), P(DK["x"] + 60, 200, DK["d"])])
with open(os.path.join(OUT, "Study.json"), "w", encoding="utf-8") as metadata:
    json.dump(LAYOUT.data, metadata, indent=2)

# ── the passes ─────────────────────────────────────────────────────────────
for material in bpy.data.materials:
    if not material.use_nodes: continue
    for node in material.node_tree.nodes:
        if node.type != 'BSDF_PRINCIPLED': continue
        if node.inputs['Transmission Weight'].default_value > .5 or node.inputs['Metallic'].default_value > .5: continue
        node.inputs['Coat Weight'].default_value = 0
        rough = node.inputs['Roughness']
        if rough.is_linked:
            floor = material.node_tree.nodes.new('ShaderNodeMath'); floor.operation = 'MAXIMUM'; floor.inputs[1].default_value = .46
            material.node_tree.links.new(rough.links[0].from_socket, floor.inputs[0]); material.node_tree.links.new(floor.outputs[0], rough)
        else: rough.default_value = max(rough.default_value, .46)
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "2.0")))
scene.render.use_persistent_data = True
finish(scene, SAMPLES, keep_gloss=("white glass shade", "glass", "window glass", "glazed jar"))
if STILL:
    render(scene, os.path.join(OUT, "still.png"))
else:
    # Keep the shared plate name; it does not represent a puzzle or light state.
    plates = {"lights-1": (lambda: None, lambda: None)} if "plates" in ONLY else {}
    passes(scene, OUT, set(plates), air, apart={"chest": CHEST_PARTS}, variants=plates)
    if "chest" in ONLY:
        air.hide_render = True
        chest_sprites(scene, OUT, LAYOUT.data["chest"]["box"], chest_body, chest_hinge, lid_parts)
print("ROOM_DONE")
