# Room IX, off the chemist's hall — an empty room — built in three dimensions
# and rendered with Cycles, seen from its door.
#
# Nothing in it. Limewashed plaster over boarded panelling, stone flags with
# the dust of years on them, deepest along the walls; a bare sash window, no
# curtain, the moon coming through it and lying across the floor in the shape
# of its panes. In the right-hand wall a plain stone fireplace, the fire laid
# in its grate — paper, kindling crossed over it, two logs — and never lit; a
# coal scuttle beside it. A broom left leaning in the corner.
#
# One plate (lights-1: only the moon) and where it all fell in the picture
# (src/levels/house/rooms/Room9.json).
#
#   blender -b --factory-startup -P art/blender/room_nine.py -- [--samples 700] [--width 2560]

import bpy, bmesh, math, os, sys, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *

OUT = os.path.join(ROOT, ".artifacts/room-nine")
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "700"))
WIDTH = int(arg("--width", "2560"))
RNG = random.Random(1909)

X0, X1, D1, TOP = -230, 230, 540, 290
EYE = (float(arg("--ex", "50")), float(arg("--ey", "150")), float(arg("--ed", "20")))
LOOK = (float(arg("--lx", "40")), float(arg("--ly", "108")), float(arg("--ld", "540")))
scene, HEIGHT = stage(WIDTH, eye=EYE, look=LOOK, lens=float(arg("--lens", "28")))
WIN = dict(x=-70, hw=60, sill=96, top=250)
HEARTH = dict(d0=250, d1=390, out=28)

PLASTER = scan("limewash", "white_plaster_rough_01", size=2.4, tint=(0.92, 0.9, 0.84), bright=1.0, sat=0.3, rough=(0.8, 0.95), bump=0.5)
CEILING = scan("ceiling", "plastered_wall_04", size=2.0, tint=(0.85, 0.83, 0.78), bright=0.75, sat=0.3, rough=(0.8, 0.95), bump=0.5)
BOARDS = scan("panelling", "distressed_painted_planks", size=1.2, tint=(0.62, 0.66, 0.6), bright=0.55, sat=0.5, rough=(0.5, 0.85), bump=0.5, upright=True)
STONE = scan("fireplace stone", "old_sandstone_02", size=0.9, tint=(0.8, 0.74, 0.66), bright=0.6, sat=0.6, rough=(0.7, 0.95), bump=0.8)
IRON = aged_metal("iron", (0.05, 0.05, 0.05), (0.04, 0.025, 0.018), rough=(0.45, 0.8), scale=18, tarnish=0.5)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
FRAME = plain("window paint", (0.8, 0.79, 0.74), rough=0.55)
def flags():
    """stone flags, and the dust of years on them: thickest along the walls"""
    m = scan("dusty flags", "worn_tile_floor", size=1.4, tint=(0.86, 0.82, 0.76), bright=0.42, sat=0.5, rough=(0.5, 0.85), bump=0.6)
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    base = b.inputs["Base Color"].links[0].from_socket
    tc = N.new("ShaderNodeTexCoord"); nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1.6; nz.inputs["Detail"].default_value = 8
    Lk(tc.outputs["Object"], nz.inputs["Vector"])
    sep = N.new("ShaderNodeSeparateXYZ"); Lk(tc.outputs["Object"], sep.inputs["Vector"])
    # (how near a wall: the floor's own x, d against the room's)
    edge = N.new("ShaderNodeMath"); edge.operation = "ABSOLUTE"; Lk(sep.outputs["X"], edge.inputs[0])
    ex = N.new("ShaderNodeMapRange"); ex.inputs["From Min"].default_value = M(X1 - 90); ex.inputs["From Max"].default_value = M(X1); Lk(edge.outputs[0], ex.inputs["Value"])
    ed = N.new("ShaderNodeMapRange"); ed.inputs["From Min"].default_value = M(D1 - 120); ed.inputs["From Max"].default_value = M(D1); Lk(sep.outputs["Y"], ed.inputs["Value"])
    wall = N.new("ShaderNodeMath"); wall.operation = "MAXIMUM"; Lk(ex.outputs["Result"], wall.inputs[0]); Lk(ed.outputs["Result"], wall.inputs[1])
    nr = N.new("ShaderNodeMapRange"); nr.inputs["From Min"].default_value = 0.35; nr.inputs["From Max"].default_value = 0.75; nr.inputs["To Min"].default_value = 0.15; nr.inputs["To Max"].default_value = 0.55
    Lk(nz.outputs["Fac"], nr.inputs["Value"])
    amount = N.new("ShaderNodeMath"); amount.operation = "MAXIMUM"; amount.use_clamp = True; Lk(nr.outputs["Result"], amount.inputs[0]); Lk(wall.outputs[0], amount.inputs[1])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; Lk(amount.outputs[0], mix.inputs["Factor"]); Lk(base, mix.inputs[6]); mix.inputs[7].default_value = (0.2, 0.19, 0.17, 1)
    Lk(mix.outputs[2], b.inputs["Base Color"])
    return m
FLOOR = flags()
LAYOUT = Layout("Room9")

# ── the shell ──────────────────────────────────────────────────────────────
box_cm("floor", X0 - 20, X1 + 20, -6, 0, -40, D1 + 20, FLOOR)
box_cm("ceiling", X0 - 20, X1 + 20, TOP, TOP + 10, -40, D1 + 20, CEILING)
for (x0, x1) in ((X0 - 25, X0), (X1, X1 + 25)):
    box_cm("wall", x0, x1, 0, TOP, -40, D1 + 20, PLASTER)
box_cm("door wall", X0 - 25, X1 + 25, 0, TOP, -65, -40, PLASTER)
back = box_cm("back wall", X0 - 25, X1 + 25, 0, TOP, D1, D1 + 30, PLASTER)
DADO = 92
def panelling(along_x, at, facing, a, b, skip=()):
    def piece(p0, p1, y0, y1, proud, mat, r=0.0):
        q0, q1 = sorted((at, at + facing * proud))
        if along_x: box_cm("panelling", p0, p1, y0, y1, q0, q1, mat, r)
        else: box_cm("panelling", q0, q1, y0, y1, p0, p1, mat, r)
    spans = [(a, b)]
    for lo, hi in skip:
        spans = [s for (p, q) in spans for s in ((p, lo), (hi, q)) if s[1] - s[0] > 1]
    for (p, q) in spans:
        piece(p, q, 0, DADO, 1.5, BOARDS)
        piece(p, q, DADO - 3, DADO + 4, 4.0, BOARDS, 1.0)
        piece(p, q, 0, 14, 3.0, BOARDS, 0.6)
    piece(a, b, TOP - 12, TOP, 8, CEILING, 2.0)
panelling(False, X0, 1, -40, D1)
panelling(False, X1, -1, -40, D1, skip=((HEARTH["d0"], HEARTH["d1"]),))
panelling(True, D1, -1, X0, X1)
SASHES = sash_window_back(back, WIN["x"], WIN["hw"], WIN["sill"], WIN["top"], D1, 26, FRAME, GLASS, PLASTER, BOARDS, bars=(1 / 3, 2 / 3))
garden(P(-900, 700, 3600), [("island_tree_01", -1100, 2000, 11.0, 0.3), ("island_tree_02", 800, 2700, 12.0, 1.4), ("tree_small_02", -200, 1300, 5.0, 2.2)],
       (-2500, 2500, D1 + 40, 3300, -40), P(-500, 800, 4200), sky_size=45)

# ── the fireplace in the right-hand wall, the fire laid in it ─────────────
hb = HEARTH; WX = X1 - hb["out"]
breast = box_cm("chimney breast", WX, X1 + 1, 0, TOP, hb["d0"], hb["d1"], PLASTER)
fb = dict(d0=290, d1=350, y1=78)
boolean_cut(breast, box("cut", M(WX - 10), M(X1 - 8), M(fb["d0"]), M(fb["d1"]), M(-1), M(fb["y1"]), IRON))
SOOT = plain("soot", (0.015, 0.012, 0.01), rough=0.95)
box_cm("fire back", X1 - 12, X1 - 8, 0, fb["y1"], fb["d0"], fb["d1"], SOOT)
for d0, d1 in ((fb["d0"], fb["d0"] + 3), (fb["d1"] - 3, fb["d1"])): box_cm("fire cheek", WX, X1 - 8, 0, fb["y1"], d0, d1, SOOT)
box_cm("fire throat", WX, X1 - 8, fb["y1"] - 3, fb["y1"], fb["d0"], fb["d1"], SOOT)
for d0, d1 in ((fb["d0"] - 22, fb["d0"]), (fb["d1"], fb["d1"] + 22)):
    box_cm("jamb stone", WX - 6, WX, 0, 96, d0, d1, STONE, 0.8)
box_cm("lintel stone", WX - 7, WX, fb["y1"], 104, fb["d0"] - 24, fb["d1"] + 24, STONE, 0.8)
box_cm("mantel shelf", WX - 14, WX, 104, 110, fb["d0"] - 30, fb["d1"] + 30, STONE, 1.0)
box_cm("hearth stone", WX - 46, WX, 0, 2.5, fb["d0"] - 30, fb["d1"] + 30, STONE, 0.8)
gx, gd = X1 - 22, (fb["d0"] + fb["d1"]) / 2
for k in range(5):
    rod("grate bar", P(gx - 9, 12 + k * 4.5, gd - 22), P(gx - 9, 12 + k * 4.5, gd + 22), M(0.6), IRON, verts=8)
for d in (gd - 22, gd + 22):
    rod("grate leg", P(gx - 9, 0, d), P(gx - 9, 32, d), M(0.9), IRON, verts=8)
    rod("grate side", P(gx - 9, 12, d), P(gx + 8, 12, d), M(0.7), IRON, verts=8)
box_cm("grate floor", gx - 9, gx + 8, 11, 12, gd - 22, gd + 22, IRON)
# the fire laid: twists of paper, kindling crossed over them, two logs
PAPER_W = paper("newspaper", (0.62, 0.6, 0.54), 0.2)
CRUMPLE = bpy.data.textures.new("crumple", "VORONOI"); CRUMPLE.noise_scale = 0.012
for k in range(6):
    p = sphere("twist of paper", (0, 0, 0), M(3.2), PAPER_W, squash=(1.2, 0.9, 0.7)); p.location = P(gx + RNG.uniform(-6, 6), 15.5, gd + RNG.uniform(-15, 15))
    dp = p.modifiers.new("crumple", "DISPLACE"); dp.texture = CRUMPLE; dp.strength = M(1.2)
KINDLING = scan("kindling", "jolcham_oak_bark_01", size=0.2, tint=(0.75, 0.62, 0.5), bright=0.5, rough=(0.7, 0.95), bump=0.5)
for k in range(9):
    a = RNG.uniform(-0.5, 0.5) + (k % 2) * math.pi / 2.4
    c = P(gx + RNG.uniform(-4, 4), 19 + k * 0.6, gd + RNG.uniform(-8, 8))
    rod("kindling", c - Vector((math.cos(a) * 0.14, math.sin(a) * 0.14, 0.01)), c + Vector((math.cos(a) * 0.14, math.sin(a) * 0.14, 0.01)), M(0.9), KINDLING, verts=6)
BARK = scan("bark", "jolcham_oak_bark_01", size=0.3, tint=(0.5, 0.4, 0.32), bright=0.4, rough=(0.7, 0.95), bump=0.8)
for (y, a) in ((26, 0.12), (31, -0.2)):
    lg = cylinder("log", 0, 0, -M(19), M(19), M(5.0), BARK, verts=20); lg.rotation_euler = (math.pi / 2, 0, a); lg.location = P(gx - 2, y, gd)
lathe("coal scuttle", [(0, 0), (0.13, 0), (0.15, 0.2), (0.16, 0.3), (0, 0.29)], IRON, at=tuple(P(WX - 28, 0, fb["d1"] + 46)), steps=32)
# a broom left in the corner by the window
bx, bd = X0 + 14, D1 - 14
rod("broom handle", P(bx, 2, bd), P(bx - 6, 130, bd + 4), M(1.3), scan("broom wood", "dark_wood", size=0.4, bright=0.6, rough=(0.4, 0.7)), verts=12)
lathe("broom head", [(0, 0), (0.06, 0), (0.05, 0.16), (0.02, 0.2), (0, 0.2)], plain("bristle", (0.32, 0.24, 0.12), rough=0.95), at=tuple(P(bx + 1, 0, bd - 1)), steps=24).scale = (1.0, 0.5, 1.0)

# ── light: only the moon ───────────────────────────────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
lamp("the moon", "SUN", tuple(P(-900, 1500, 2400)), aim=tuple(P(-30, 0, 280)), energy=float(arg("--moon", "4.0")), colour=(0.55, 0.68, 1.0), angle=math.radians(1.2))
sky_l = lamp("sky through the window", "AREA", tuple(P(WIN["x"], 180, D1 + 14)), aim=tuple(P(WIN["x"] + 20, 40, 300)), energy=float(arg("--sky", "30")), colour=(0.5, 0.62, 0.95), size=1.3, size_y=1.6)
sky_l.visible_camera = False; sky_l.visible_transmission = False; sky_l.visible_glossy = False
fill_l = lamp("fill", "AREA", tuple(P(60, 220, 0)), aim=tuple(P(0, 80, D1)), energy=float(arg("--fill", "10")), colour=(0.8, 0.85, 1.0), size=1.6)
fill_l.visible_camera = False; fill_l.visible_glossy = False
eye_fill(float(arg("--eyefill", "16")))                # (the halls' fill: nothing the eye sees falls to black)
LIGHTS = [Light("moon", [])]
clear_glass()
air = room_haze(X0, X1, -30, D1, TOP, float(arg("--haze", "0")))

# ── what the game is told ──────────────────────────────────────────────────
for pane in SASHES: LAYOUT.pane(pane)
LAYOUT.dust([P(WIN["x"] - WIN["hw"], WIN["top"], D1), P(WIN["x"] + WIN["hw"], WIN["sill"], D1), P(-40, 0, 230), P(60, 0, 420)])
LAYOUT.write()

cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "1.8")))
scene.cycles.volume_bounces = 1
GLOSSY = ()                # (what keeps its shine: nothing here)
finish(scene, SAMPLES, keep_gloss=GLOSSY)
plates = one_light(LIGHTS[0])
passes(scene, OUT, set(plates), air, variants=plates)
print("ROOM_DONE")
