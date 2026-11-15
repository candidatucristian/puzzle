# Room II as the baby's nursery (2026-11-05). The cot's puzzle came here for
# the demo, but standing at the far end of the library behind its reading
# table the cot could hardly be seen; the user asked for the room to become a
# baby's room. (Silas's last entry in the house accounts, "one basket", reads
# now as a baby's basket.)
#
# A smaller room, seen close: the cot in the middle of it on a soft rug, near
# enough to see into, a mobile over it; a rocking horse at its left; at its
# right the rocking chair and, by the right wall, the toy chest, the router on
# it (Room Beneath the Desk's, apart from the desk since 2026-11-06). On the back
# wall the sash window, linen curtains, the moon over the garden; at the right
# a painted chest of drawers with its night light, the gilt chest on it, two
# nursery prints over it; in the far left corner Silas's desk (silas_desk.py:
# the very set After Hours and the router's close-ups are taken in —
# overtime_office.py and modem_room.py build this room and look at it from
# the chair and from before the router): the walnut desk with the green
# banker's lamp, the four clocks, the calculator, the LED clock, the botanical print and the radio's shelf on the
# wall over it; a low bookcase of encyclopaedias before it. Duck-egg plaster
# over walnut panelling, oak boards. Night: the night light and the green
# lamp, their light given back off the ceiling; the moon at the window.
#
#   blender -b --factory-startup -P art/blender/room_nursery.py -- [--only preview|plate,coffer|none] [--width 3200] [--samples 512]
#   node art/blender/room_library_v3_publish.mjs --source .artifacts/room-nursery --version 11 --coffer-version 11

import bpy, bmesh, math, os, sys, random, json, runpy
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *
from library_coffer_pass import render_coffer

OUT = arg('--out', os.path.join(ROOT, ".artifacts/room-nursery"))
os.makedirs(OUT, exist_ok=True)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")
SAMPLES = int(arg("--samples", "512"))
WIDTH = int(arg("--width", "3200"))
ONLY = set(arg("--only", "plate,coffer").split(","))
RNG = random.Random(1961)

# ── the room, and where we stand in it ─────────────────────────────────────
X0, X1, D1, TOP = -270, 270, 500, 310
EYE = (float(arg("--ex", "0")), float(arg("--ey", "134")), float(arg("--ed", "-40")))
LOOK = (float(arg("--lx", "0")), EYE[1] + float(arg("--tilt", "-70")), D1)
scene, HEIGHT = stage(WIDTH, eye=EYE, look=LOOK, lens=float(arg("--lens", "24")), lift=float(arg("--lift", "0")))
WIN = dict(x=34, hw=56, sill=88, top=262)
DRESSER = dict(x0=126, x1=238, d0=D1 - 48, d1=D1 - 2, h=90)
COT = dict(x=float(arg("--cot-x", "25")), d=float(arg("--cot-d", "270")))

# ── materials: matte and worn, as every room since the library ────────────
WALNUT = scan("walnut", "rosewood_veneer1", size=0.7, tint=(0.62, 0.42, 0.3), bright=0.5, sat=0.85, rough=(0.46, 0.66), bump=0.2, coat=0.0, upright=True)
WALNUT_X = scan("walnut across", "rosewood_veneer1", size=0.7, tint=(0.62, 0.42, 0.3), bright=0.48, sat=0.85, rough=(0.46, 0.66), bump=0.2, coat=0.0)
BRASS = aged_metal("brass", (0.55, 0.39, 0.17), (0.08, 0.055, 0.025), rough=(0.3, 0.55), scale=30, tarnish=0.55)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
PAGES = plain("pages", (0.3, 0.26, 0.19), rough=0.9)
PLASTER = scan("nursery ceiling", "plastered_wall_04", size=2.0, tint=(0.8, 0.76, 0.68), bright=0.6, sat=0.2, rough=(0.85, 0.97), bump=0.3)
DUCK_EGG = scan("duck-egg plaster", "plastered_wall_04", size=2.2, tint=(0.5, 0.64, 0.62), bright=0.62, sat=0.3, rough=(0.84, 0.97), bump=0.16)
BOARDS = scan("oak boards", "wood_floor_worn", size=2.0, tint=(0.8, 0.64, 0.47), bright=0.64, sat=0.55, rough=(0.5, 0.72), bump=0.35, coat=0.0)
FRAME = scan("window | painted sash", "distressed_painted_planks", size=0.6, tint=(0.8, 0.78, 0.72), bright=0.7, sat=0.3, rough=(0.5, 0.7), bump=0.2)
CREAM_PAINT = scan("cream painted chest of drawers", "distressed_painted_planks", size=0.7, tint=(0.86, 0.8, 0.68), bright=0.72, sat=0.35, rough=(0.5, 0.72), bump=0.25)
BLUE_PAINT = scan("dusty blue painted toy chest", "distressed_painted_planks", size=0.7, tint=(0.52, 0.64, 0.7), bright=0.62, sat=0.45, rough=(0.5, 0.72), bump=0.25)
MOON_PRINT = picture("nursery moon print", os.path.join(DRAWN, "nursery-moon.png"), rough=0.9)
BALLOON_PRINT = picture("nursery balloon print", os.path.join(DRAWN, "nursery-balloon.png"), rough=0.9)
MOUNT_WHITE = paper("white mount", (0.8, 0.77, 0.69), 0.08)
spine_mat = bound(picture("spines", os.path.join(DRAWN, "spines.png"), rough=0.5, coat=0.1, bump=0.3))
COVERS = cover_materials()
def wool(name, colour, scale=0.12):
    m = scan(name, "quatrefoil_jacquard_fabric", size=scale, tint=colour, bright=0.55, sat=0.3, rough=(0.92, 1.0), bump=0.8)
    m.node_tree.nodes["Principled BSDF"].inputs["Sheen Weight"].default_value = 0.15
    return m
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
    grey = N.new("ShaderNodeCombineColor")
    for i in range(3): Lk(tone.outputs["Result"], grey.inputs[i])
    Lk(grey.outputs[0], mix.inputs[7]); Lk(mix.outputs[2], b.inputs["Base Color"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25; bump.inputs["Distance"].default_value = 0.0004
    Lk(weave.outputs["Fac"], bump.inputs["Height"]); Lk(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.94; b.inputs["Sheen Weight"].default_value = 0.08; b.inputs["Sheen Tint"].default_value = (*colour, 1)
    tr = N.new("ShaderNodeBsdfTranslucent"); Lk(mix.outputs[2], tr.inputs["Color"])
    mx = N.new("ShaderNodeMixShader"); mx.inputs["Fac"].default_value = 0.08
    Lk(b.outputs["BSDF"], mx.inputs[1]); Lk(tr.outputs["BSDF"], mx.inputs[2]); Lk(mx.outputs["Shader"], N["Material Output"].inputs["Surface"])
    return m
CURTAIN = linen("pale linen curtains", (0.3, 0.3, 0.26))
RUG_WOOL = wool("soft rug wool", (0.8, 0.71, 0.58), 0.18)
RUG_BORDER = wool("rug border wool", (0.66, 0.48, 0.44), 0.18)
THROW = wool("knitted throw", (0.6, 0.53, 0.42), 0.14)
LAYOUT = Layout("Room2")

# ── the shell ──────────────────────────────────────────────────────────────
box_cm("floor", X0 - 30, X1 + 30, -6, 0, -160, D1 + 30, BOARDS)
box_cm("ceiling", X0 - 30, X1 + 30, TOP, TOP + 10, -160, D1 + 30, PLASTER)
for (x0, x1) in ((X0 - 25, X0), (X1, X1 + 25)):
    box_cm("wall", x0, x1, 0, TOP, -160, D1 + 30, DUCK_EGG)
box_cm("door wall", X0 - 25, X1 + 25, 0, TOP, -170, -150, DUCK_EGG)
back = box_cm("back wall", X0 - 25, X1 + 25, 0, TOP, D1, D1 + 30, DUCK_EGG)
DADO = 96
def dado_x(a, b, at, facing):
    def piece(p0, p1, y0, y1, proud, mat, r=0.0):
        q0, q1 = sorted((at, at - facing * proud)); box_cm("panelling", p0, p1, y0, y1, q0, q1, mat, r)
    piece(a, b, 0, DADO, 2.0, WALNUT)
    n = max(1, round((b - a) / 52))
    for k in range(n):
        p0 = a + k * (b - a) / n + 6; p1 = a + (k + 1) * (b - a) / n - 6
        piece(p0, p1, 18, DADO - 14, 3.2, WALNUT, 1.2)
    piece(a, b, DADO - 3, DADO + 4, 4.5, WALNUT_X, 1.0)
    piece(a, b, 0, 16, 3.5, WALNUT_X, 0.6)
    piece(a, b, TOP - 14, TOP, 9, WALNUT_X, 2.0)
def dado_d(a, b, at, facing):
    def piece(p0, p1, y0, y1, proud, mat, r=0.0):
        q0, q1 = sorted((at, at + facing * proud)); box_cm("panelling", q0, q1, y0, y1, p0, p1, mat, r)
    piece(a, b, 0, DADO, 2.0, WALNUT)
    n = max(1, round((b - a) / 52))
    for k in range(n):
        p0 = a + k * (b - a) / n + 6; p1 = a + (k + 1) * (b - a) / n - 6
        piece(p0, p1, 18, DADO - 14, 3.2, WALNUT, 1.2)
    piece(a, b, DADO - 3, DADO + 4, 4.5, WALNUT_X, 1.0)
    piece(a, b, 0, 16, 3.5, WALNUT_X, 0.6)
    piece(a, b, TOP - 14, TOP, 9, WALNUT_X, 2.0)
wx0, wx1 = WIN["x"] - WIN["hw"], WIN["x"] + WIN["hw"]
dado_x(X0, wx0 - 10, D1, 1); dado_x(wx1 + 10, X1, D1, 1)
dado_d(-150, D1, X0, 1); dado_d(-150, D1, X1, -1)

# ── the window: a sash in the back wall, linen curtains, the garden beyond ─
PANES = sash_window_back(back, WIN["x"], WIN["hw"], WIN["sill"], WIN["top"], D1, 26, FRAME, GLASS, DUCK_EGG, WALNUT_X, bars=(0.5,))
CURTAINS = [curtain(RNG, wx0 - 31, wx0 - 2, D1 - 7.5, TOP - 20, CURTAIN, folds=4, deep=5.5),
            curtain(RNG, wx1 + 2, wx1 + 31, D1 - 7.5, TOP - 20, CURTAIN, folds=4, deep=5.5)]
curtain_pole(wx0 - 35, wx1 + 35, TOP - 16, D1 - 10, BRASS)
MOON_AT = P(-700, 1100, 3600)
garden(MOON_AT, [("island_tree_01", -320, 1500, 9.0, 0.3), ("island_tree_02", 300, 2100, 11.0, 1.4), ("tree_small_02", 80, 1150, 4.5, 2.2),
                  ("shrub_02", 170, 860, 1.4, 0.6), ("shrub_02", -120, 900, 1.6, 2.0)],
       (-800, 1600, D1 + 30, 3200, -40), P(700, 700, 4400))

# ── Silas's corner: his desk, the very set After Hours and Room Beneath the
#    Desk are seen in (silas_desk.py, built in its own frame — the office
#    close-up's centimetres, the wall 125 cm before its chair — and stood here
#    whole in the far left corner, nothing turned) ──────────────────────────
def front(x0, x1, y0, y1, d):
    return [P(x0, y0, d), P(x1, y0, d), P(x1, y1, d), P(x0, y1, d)]
DESK_AT = P(float(arg("--desk-x", "-160")), 0, D1 - 125)
_before = set(bpy.data.objects)
DESK_SET = runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), "silas_desk.py"))
desk_root = bpy.data.objects.new("Silas's desk (silas_desk.py)", None); link(desk_root)
for o in [o for o in bpy.data.objects if o not in _before and o.parent is None and o is not desk_root]: o.parent = desk_root
desk_root.location = DESK_AT
bpy.context.view_layer.update()
DESK_SET["colons_lit"](True)
DESK_SET["LAMP"].data.energy = float(arg("--desk-lamp", "4"))
DESK_SET["CLOCK_LIGHT"].data.energy = float(arg("--desk-clocks", "4"))
GREEN_AT = DESK_AT + DESK_SET["LAMP_AT"]
def framed_plate(x0_, y0_, w, hgt, plate, name, d=D1, mount=5.0, rail=3.0, deep=3.0):
    """a print in a white mount and a walnut moulding, on the back wall"""
    W_, H_ = w + 2 * mount, hgt + 2 * mount
    for (a, b, c, e) in ((-rail, W_ + rail, -rail, 0), (-rail, W_ + rail, H_, H_ + rail), (-rail, 0, 0, H_), (W_, W_ + rail, 0, H_)):
        box_cm(name + " frame", x0_ + a, x0_ + b, y0_ + c, y0_ + e, d - deep, d, WALNUT_X, 0.5)
    card(name + " mount", front(x0_, x0_ + W_, y0_, y0_ + H_, d - 0.4), MOUNT_WHITE)
    arch(card(name, front(x0_ + mount, x0_ + mount + w, y0_ + mount, y0_ + mount + hgt, d - 0.6), plate))
    box_cm(name + " glass", x0_, x0_ + W_, y0_, y0_ + H_, d - deep + 0.4, d - deep + 0.6, GLASS)
# a low bookcase of encyclopaedias against the left wall, before the desk
bookcase(RNG, X0, -1, 250, 370, 118, WALNUT, WALNUT_X, spine_mat, COVERS, PAGES, depth=32,
         levels=(8, 44, 82, 118), bays=2, glass=GLASS)

# ── the baby's things ───────────────────────────────────────────────────────
# the chest of drawers, painted, at the right of the window; its night light
DR = DRESSER
box_cm("drawers carcass", DR["x0"], DR["x1"], 8, DR["h"] - 3, DR["d0"], DR["d1"], CREAM_PAINT, 0.8)
box_cm("drawers top", DR["x0"] - 2, DR["x1"] + 2, DR["h"] - 3, DR["h"], DR["d0"] - 2, DR["d1"], CREAM_PAINT, 0.6)
box_cm("drawers plinth", DR["x0"] + 1, DR["x1"] - 1, 0, 8, DR["d0"] + 2, DR["d1"], WALNUT_X, 0.4)
for k, (y0, y1) in enumerate(((12, 34), (37, 59), (62, 84))):
    box_cm("drawer front", DR["x0"] + 3, DR["x1"] - 3, y0, y1, DR["d0"] - 1.2, DR["d0"], CREAM_PAINT, 0.6)
    for fx in (0.3, 0.7):
        x = DR["x0"] + (DR["x1"] - DR["x0"]) * fx
        lathe("drawer knob", [(0, 0), (0.012, 0), (0.014, 0.012), (0.008, 0.02), (0, 0.022)], BRASS, at=tuple(P(x, (y0 + y1) / 2, DR["d0"] - 1.2)), steps=24).rotation_euler = (math.pi / 2, 0, 0)
NL = (DR["x0"] + 26, DR["h"], DR["d0"] + 22)
lathe("night light base", [(0, 0), (0.06, 0), (0.062, 0.01), (0.05, 0.03), (0.035, 0.09), (0.04, 0.14), (0.018, 0.17), (0.008, 0.2), (0, 0.2)], plain("glazed base", (0.62, 0.66, 0.68), rough=0.35), at=tuple(P(*NL)), steps=48)
SHADE = shade_material("night light shade", (0.86, 0.76, 0.6), glow=(1.0, 0.74, 0.46), strength=float(arg("--shade", "0.6")), through=0.3)
pleated_shade(NL[0], NL[2], NL[1] + 18, NL[1] + 34, 15, 9, SHADE, pleats=28, depth=0.02)
NIGHT_AT = P(NL[0], NL[1] + 24, NL[2])
# the gilt chest on the top of the drawers, between the night light and the
# window (well inside the picture: the game crops its sides on narrower screens)
CHEST = dict(x0=DR["x0"] + 36, x1=DR["x0"] + 57, d0=DR["d0"] + 8, d1=DR["d0"] + 23, y0=DR["h"], y1=DR["h"] + 10.5, lid=7.7)
framed_plate(DR["x0"] + 6, 128, 38, 38 * 1200 / 900, MOON_PRINT, "moon print")
framed_plate(DR["x0"] + 60, 140, 34, 34 * 1200 / 900, BALLOON_PRINT, "balloon print")

# the cot: the puzzle's own (his_cot.py's his-cot.blend), its legs to the floor
cot_blend = os.path.join(ROOT, ".artifacts/his-cot-native/his-cot.blend")
left_behind = ("Wall |", "Window |", "Curtain |", "Botanical |", "Bedside |", "Lamp |", "Camera |", "Nursery |")
with bpy.data.libraries.load(cot_blend, link=False) as (src, dst):
    dst.objects = [n for n in src.objects if not n.startswith(left_behind)]
cot_root = bpy.data.objects.new("His Cot (from Room VI)", None); scene.collection.objects.link(cot_root)
COT_PARTS = []
for o in dst.objects:
    if o is None or o.type in ("CAMERA", "LIGHT"): continue
    scene.collection.objects.link(o); COT_PARTS.append(o)
    if o.parent is None: o.parent = cot_root
COT_WOOD = bpy.data.materials.get("Cot | dark mahogany, open grain and rubbed shellac")
for x in (-.648, .648):
    for y in (-.405, .405):
        foot = (.922 if y > 0 else .88) - .696
        leg = lathe("Cot | turned leg to the floor", [(0, 0), (.024, 0), (.026, .02), (.02, .05), (.021, foot - .03), (.028, foot - .01), (.029, foot + .01), (0, foot + .01)], COT_WOOD, at=(x, y, 0), steps=48)
        leg.parent = cot_root; COT_PARTS.append(leg)
# the lowered drop side's bottom rail: its seventeen spindles hang below the
# mattress, and without the rail that holds them they read, from the room, as
# so many legs under the middle of the cot (2026-11-06). Below the close-up's
# frame, so the puzzle's picture is as it was.
drop_rail = box("Front | the lowered side's bottom rail", -.652, .652, -.433, -.395, .163, .207, COT_WOOD)
bevel(drop_rail, .004, 3); drop_rail.parent = cot_root; COT_PARTS.append(drop_rail)
# the little rocking horse's head was carved looking back at its own saddle
# (his_cot.py set the head, its ears, eyes and bridle behind the neck's top and
# the mane before it): mirrored across the neck here, so it looks the way it
# rocks, its mane down the back of its neck (2026-11-06). The rocking horse by
# the cot is this one made large.
bpy.context.view_layer.update()
def _middle(o): return sum((o.matrix_world @ Vector(k) for k in o.bound_box), Vector()) / 8
_body = next((o for o in COT_PARTS if o.name.startswith("Horse | carved beech body")), None)
_head = next((o for o in COT_PARTS if o.name.startswith("Horse | carved head")), None)
if _body and _head:
    hb = _middle(_body) - Vector((0, 0, .075))                     # his_cot.py's (x, y, z) for the horse
    neck = hb + Vector((.026, 0, .077)); across = Vector((.05, 0, -.011)).normalized()
    if _middle(_head).x < hb.x + .037:                             # still looking back
        mirror = Matrix.Identity(4)
        for i in range(3):
            for j in range(3): mirror[i][j] -= 2 * across[i] * across[j]
        mirror = Matrix.Translation(neck) @ mirror @ Matrix.Translation(-neck)
        for o in COT_PARTS:
            if o.name.startswith(("Horse | carved head", "Horse | carved ear", "Horse | tiny black eye", "Horse | leather bridle", "Horse | flax mane")):
                o.matrix_world = mirror @ o.matrix_world
        print("HORSE HEAD TURNED ROUND", flush=True)
cot_root.location = P(COT["x"], 0, COT["d"])
# a mobile over it, hung from its arm (in the room only: in the cot's close-up
# the puzzle's own mobile is live)
FELT = {"cream": wool("mobile felt cream", (0.78, 0.72, 0.6), 0.05), "blue": wool("mobile felt blue", (0.5, 0.66, 0.74), 0.05), "ochre": wool("mobile felt ochre", (0.86, 0.66, 0.3), 0.05)}
def cot_point(x, y, z): return cot_root.matrix_world @ Vector((x, y, z))
bpy.context.view_layer.update()
hoop_c = cot_point(0, .03, 1.09)
bpy.ops.mesh.primitive_torus_add(major_radius=.14, minor_radius=.0045, location=tuple(hoop_c))
hoop = bpy.context.object; hoop.name = "Nursery mobile | hoop"; hoop.data.materials.append(COT_WOOD)
anchor = cot_point(0, .03, 1.16)
for a in (0, 2.094, 4.189):
    rod("Nursery mobile | thread", anchor, hoop_c + Vector((math.cos(a) * .14, math.sin(a) * .14, 0)), .0006, FELT["cream"], verts=6)
def felt_star(at, r, mat):
    pts = [(math.cos(j * math.pi / 5 - math.pi / 2) * (r if j % 2 == 0 else r * .45), math.sin(j * math.pi / 5 - math.pi / 2) * (r if j % 2 == 0 else r * .45)) for j in range(10)]
    me = bpy.data.meshes.new("Nursery mobile | felt star"); bm = bmesh.new()
    vs = [bm.verts.new((x, 0, z)) for x, z in pts]; bm.faces.new(vs); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("Nursery mobile | felt star", me)); o.data.materials.append(mat)
    o.modifiers.new("felt", "SOLIDIFY").thickness = .006; o.location = at; return o
for k, (a, drop, kind) in enumerate(((.3, .07, "star"), (1.9, .1, "moon"), (3.4, .065, "cloud"), (4.9, .09, "star"))):
    top_ = hoop_c + Vector((math.cos(a) * .14, math.sin(a) * .14, 0)); at_ = top_ - Vector((0, 0, drop))
    rod("Nursery mobile | thread", top_, at_ + Vector((0, 0, .03)), .0005, FELT["cream"], verts=6)
    if kind == "star": felt_star(at_, .042, FELT["ochre" if k == 0 else "cream"])
    elif kind == "moon":
        m1 = sphere("Nursery mobile | felt moon", tuple(at_), .042, FELT["cream"], squash=(1, .2, 1))
    else:
        for dx, rr in ((-.03, .024), (0, .032), (.03, .023)): sphere("Nursery mobile | felt cloud", tuple(at_ + Vector((dx, 0, 0))), rr, FELT["blue"], squash=(1, .35, .8))
# the soft rug under it
rug_disc = cylinder("soft rug", M(COT["x"]), M(COT["d"]), 0, M(1.4), M(150), RUG_WOOL, verts=96)
rug_ring = cylinder("soft rug border", M(COT["x"]), M(COT["d"]), 0, M(1.2), M(156), RUG_BORDER, verts=96)
# the rocking chair in the far corner at its right, turned to it
rocker = import_model("Rockingchair_01", height=M(104), at=tuple(P(float(arg("--rocker-x", "208")), 1.4, float(arg("--rocker-d", "398")))), rot=float(arg("--rocker", "-0.8")))
# a rocking horse at its right: the cot's little horse, made large (beech, the
# saddle, the flax mane), stood on the boards
horse = [o for o in COT_PARTS if o.name.startswith("Horse |")]
if horse:
    bpy.context.view_layer.update()
    worlds = [(o, o.matrix_world.copy()) for o in horse]
    pts = [mw @ Vector(k) for o, mw in worlds if o.type in ("MESH", "CURVE") for k in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
    foot = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    k = float(arg("--horse", "0.62")) / max(hi.z - lo.z, .01)
    place = Matrix.Translation(P(float(arg("--horse-x", "-140")), 0, float(arg("--horse-d", "300")))) @ Matrix.Rotation(float(arg("--horse-turn", "0.35")), 4, "Z") @ Matrix.Scale(k, 4) @ Matrix.Translation(-foot)
    for o, mw in worlds:
        c = o.copy(); c.data = o.data.copy() if o.data else None; scene.collection.objects.link(c)
        c.parent = None; c.matrix_world = place @ mw
        c.name = "Rocking horse | " + o.name.split("|", 1)[1].strip()
    print("ROCKING HORSE", len(worlds), "parts, x", round(k, 2), flush=True)
# the toy chest against the right wall, picture books on it (at the front of
# its lid since the router came to its back), a duck by it
TC = dict(x0=X1 - 52, x1=X1 - 6, d0=272, d1=340, h=48)
box_cm("toy chest", TC["x0"], TC["x1"], 4, TC["h"] - 4, TC["d0"], TC["d1"], BLUE_PAINT, 1.2)
box_cm("toy chest lid", TC["x0"] - 1.5, TC["x1"] + 1, TC["h"] - 4, TC["h"], TC["d0"] - 1.5, TC["d1"] + 1.5, BLUE_PAINT, 1.0)
for dd in (TC["d0"] + 8, TC["d1"] - 8):
    box_cm("toy chest foot", TC["x0"] + 2, TC["x0"] + 7, 0, 4, dd - 3, dd + 3, WALNUT_X, 0.4)
import_model("rubber_duck_toy", height=M(11), at=tuple(P(TC["x0"] - 16, 0, TC["d0"] - 4)), rot=2.6)
for k in range(3):
    o = book(RNG, 0, 0, 0, 3.2, 22 - k, 16, spine_mat, COVERS, PAGES)
    o.rotation_euler = (math.pi / 2, 0, 0.1 + k * 0.05); o.location = P(TC["x0"] + 22, TC["h"] + 1.6 + k * 3.2, TC["d0"] + 18)
# the router (Room Beneath the Desk's: silas_desk.py builds it with Silas's
# other things), since 2026-11-06 here and not on the desk, so that the two
# puzzles stand apart (the user asked): at the back of the toy chest's lid by
# its left edge — the chest stands at the picture's right edge, and that
# corner is the furthest into it — turned to face the room; its leads from
# its back to the wall and down between the chest and the panelling
ROUTER = DESK_SET["ROUTER"]; ROUTER.parent = None
ROUTER_AT = (TC["x0"] + 16.5, TC["h"], TC["d1"] - 17.5)          # its foot's middle
ROUTER.location = P(*ROUTER_AT); ROUTER.rotation_euler = (0, 0, math.radians(float(arg("--router-turn", "-50"))))
bpy.context.view_layer.update()
_rw = ROUTER.matrix_world; _plug = DESK_SET["ROUTER_PLUGS"]; _lid = TC["h"]
DESK_SET["router_lead"]("Router | rubber power lead", [_rw @ _plug["power"], P(X1 - 12, _lid + 0.6, TC["d1"] - 21),
    P(X1 - 6, _lid + 0.3, TC["d1"] - 20), P(X1 - 4, _lid - 5, TC["d1"] - 19), P(X1 - 4, 8, TC["d1"] - 17)], .0025)
DESK_SET["router_lead"]("Router | loose network lead", [_rw @ _plug["network"], _rw @ (_plug["network"] + Vector((0, .03, -.022))),
    P(X1 - 15, _lid + 0.4, TC["d1"] - 6), P(X1 - 6, _lid + 0.4, TC["d1"] - 7), P(X1 - 4.4, _lid - 6, TC["d1"] - 7), P(X1 - 4.4, 6, TC["d1"] - 8)], .0022)
chest_body, chest_hinge, lid_parts = chest(CHEST)
CHEST_PARTS = chest_body + lid_parts

# ── light: the night light and the green lamp, their light given back off the
#    ceiling, warm and broad; the moon and the sky at the window ─────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
lamp("the moon", "SUN", tuple(P(-400, 1900, 2800)), aim=tuple(P(0, 0, 300)), energy=float(arg("--moon", "0.9")), colour=(0.55, 0.68, 1.0), angle=math.radians(2))
sky_l = lamp("sky through the window", "AREA", tuple(P(WIN["x"], 180, D1 + 14)), aim=tuple(P(WIN["x"], 60, 250)), energy=float(arg("--sky", "32")), colour=(0.5, 0.62, 0.95), size=1.0, size_y=1.6)
sky_l.visible_camera = False; sky_l.visible_transmission = False; sky_l.visible_glossy = False
night_l = lamp("night light", "POINT", tuple(NIGHT_AT), energy=float(arg("--night", "22")), colour=(1.0, 0.74, 0.46), size=0.03)
bounce_l = lamp("lamp light off the ceiling", "AREA", tuple(P(0, TOP - 4, 300)), aim=tuple(P(0, 0, 300)), energy=float(arg("--bounce", "70")), colour=(1.0, 0.8, 0.6), size=3.2, size_y=3.4)
bounce_l.visible_camera = False; bounce_l.visible_glossy = False
fill_l = lamp("fill", "AREA", tuple(P(0, 250, 40)), aim=tuple(P(0, 100, D1)), energy=float(arg("--fill", "12")), colour=(0.8, 0.85, 1.0), size=2.6)
fill_l.visible_camera = False; fill_l.visible_glossy = False
eye_fill(float(arg("--eyefill", "5")))
clear_glass()
air = room_haze(X0, X1, 0, D1, TOP, 0); air.hide_render = True

# ── what the game is told ──────────────────────────────────────────────────
bpy.context.view_layer.update()
cot_corners = [cot_point(x, y, z) for x in (-.68, .68) for y in (-.45, .44) for z in (0, .96)]
LAYOUT.thing("cot", "Look at the cot", cot_corners)
ROUTER_PARTS = [o for o in DESK_SET["ROUTER"].children_recursive if o.type == "MESH"]
LAYOUT.thing("modem", "Look at the router", [p for o in ROUTER_PARTS for p in object_corners(o)])
clock_parts = [o for o in bpy.data.objects if o.name.split(".")[0] in DESK_SET["OVERTIME_NAMES"] and o.type == "MESH"]
LAYOUT.thing("overtime", "Look at the clocks", [p for o in clock_parts for p in object_corners(o)])
LAYOUT.chest(CHEST)
LAYOUT.glow("desk", GREEN_AT, 70)
LAYOUT.glow("night", NIGHT_AT, 60)
LAYOUT.point("led-0", DESK_SET["led_centre"](8))
LAYOUT.point("led-1", DESK_SET["led_centre"](9))
LAYOUT.point("colon", DESK_AT + DESK_SET["COLON_0"])
for pane in PANES: LAYOUT.pane(pane)
LAYOUT.dust([P(COT["x"] - 80, 60, COT["d"] - 40), P(COT["x"] + 80, 200, COT["d"] + 60)])
layout = LAYOUT.data
layout["interactionContours"] = {
    "cot": [outline(cot_corners)],
    "modem": [outline([p for o in ROUTER_PARTS for p in object_corners(o)])],
    "overtime": [outline(object_corners(o)) for o in clock_parts],
}
layout["rainCutouts"] = [outline(object_corners(c)) for c in CURTAINS if c]
with open(os.path.join(OUT, "room.json"), "w", encoding="utf-8") as f: json.dump(layout, f, indent=2)
print("NURSERY LAYOUT", [t["level"] for t in layout["things"]], flush=True)

# ── the passes ─────────────────────────────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "1.6")), glare=False)
scene.render.use_persistent_data = True
from ground_floor_light import soften_lamp_metal
soften_lamp_metal(scene)
finish(scene, SAMPLES, keep_gloss=("glass", "window glass") + DESK_SET["KEEP_GLOSS"])
if "preview" in ONLY:
    render(scene, os.path.join(OUT, arg("--name", "preview") + ".png"))
if "plate" in ONLY:
    for o in CHEST_PARTS: o.hide_render = True
    render(scene, os.path.join(OUT, "lights-1.png"))
    for o in CHEST_PARTS: o.hide_render = False
if "coffer" in ONLY:
    render_coffer(scene, OUT, layout["chest"]["box"], chest_body, chest_hinge, lid_parts, WIDTH, SAMPLES)
print("ROOM_NURSERY_DONE", flush=True)
