# The ground-floor hall of Ashcombe Manor, built in three dimensions and
# rendered with Cycles, through the very camera the hall is drawn with
# (levels/hall/hall.js layoutHall): one-point perspective down its length,
# the eye 1.55 m up, a lens of 15.3 mm. Its places are hall.js's, turned to
# metres: a place X across and Y down at the picture, z far (1 at the picture)
# is at (X·K, z·D0, EYE − Y·K). So everything the game keeps alive over the
# picture — the doors that swing, the gate's leaves, the sconces' flames, the
# chandelier's candles, the clock's pendulum — falls where it is drawn.
#
# A hall 5.6 m across, 9.3 m long, 3.2 m high: oak boards with a strip of
# living lawn down the middle (it is the botanist's house), panelled oak to
# the dado, green silk above, a glazed lantern in the ceiling with the night
# in it; three six-panel walnut doors either side, their numerals gilt on
# their top rails; brass sconces between; a bronze chandelier; at the far end
# the stair going up through an arch, its iron gate (the leaves are rendered
# apart, for the game to swing), a long-case clock to the left of it (its
# pendulum apart), a coat stand to the right; ferns and pots, a little table,
# an umbrella stand, a trunk, hanging baskets, ivy, fallen leaves.
#
#   blender -b --factory-startup -P art/blender/hall_ground.py -- [--samples 384] [--width 3840] [--only plate,doors,front,gate,pendulum,gate-motion]

import bpy, bmesh, math, os, sys, random, json
from mathutils import Vector, Matrix, Quaternion
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import *
from botany_staircase import build_staircase, render_gate_motion

OUT = os.path.abspath(arg("--output", os.path.join(ROOT, ".artifacts/hall")))
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "384"))
WIDTH = int(arg("--width", "2560"))
ONLY = set(arg("--only", "plate,doors,front,gate,pendulum,gate-motion").split(","))
RNG = random.Random(1912)

# ── this floor's places in hall.js ─────────────────────────────────────────
DOORS = [1.32, 2.2, 3.1]
SCONCES = [2.01, 2.9]
OPEN = 0.5 * WALL; HEAD = EYE + 0.52 * HR * K
RUN, RISE = 0.16 * D0, 0.085 * HR * K
print("HALL", dict(K=K, D0=D0, EYE=EYE, WALL=WALL, CEIL=CEIL, END=END, DOOR=(DOOR_LEN, DOOR_H)))

scene, HEIGHT = stage(WIDTH)

# ── materials ──────────────────────────────────────────────────────────────
OAK = scan("panelling", "dark_wood", size=1.2, tint=(0.8, 0.62, 0.45), bright=0.52, rough=(0.3, 0.55), bump=0.3, coat=0.3, upright=True)
OAK_ACROSS = scan("panelling across", "dark_wood", size=1.2, tint=(0.8, 0.62, 0.45), bright=0.5, rough=(0.3, 0.55), bump=0.3, coat=0.3)
WALNUT = scan("walnut door", "rosewood_veneer1", size=0.75, tint=(0.7, 0.55, 0.45), bright=0.72, sat=0.9, rough=(0.16, 0.32), bump=0.25, coat=0.5)
WALNUT_X = scan("walnut door across", "rosewood_veneer1", size=0.75, tint=(0.7, 0.55, 0.45), bright=0.7, sat=0.9, rough=(0.16, 0.32), bump=0.25, coat=0.5, upright=True)
BOARDS = scan("floor boards", "wood_floor_worn", size=2.0, tint=(0.75, 0.6, 0.48), bright=0.5, rough=(0.25, 0.55), bump=0.5, coat=0.35)
PLASTER = scan("ceiling", "plastered_wall_04", size=2.0, tint=(0.82, 0.8, 0.72), bright=0.75, sat=0.3, rough=(0.8, 0.95), bump=0.6)
BRASS = aged_metal("brass", (0.52, 0.37, 0.17), (0.07, 0.05, 0.025), rough=(0.25, 0.55), scale=30, tarnish=0.6)
BRONZE = aged_metal("bronze", (0.32, 0.22, 0.12), (0.05, 0.035, 0.02), rough=(0.3, 0.6), scale=30, tarnish=0.7)
IRON = plain("wrought iron", (0.018, 0.017, 0.017), rough=0.45, metal=0.8)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
WAX = bpy.data.materials.new("wax"); WAX.use_nodes = True
_w = WAX.node_tree.nodes["Principled BSDF"]; _w.inputs["Base Color"].default_value = (0.8, 0.72, 0.56, 1); _w.inputs["Subsurface Weight"].default_value = 0.6; _w.inputs["Subsurface Radius"].default_value = (0.02, 0.012, 0.006); _w.inputs["Roughness"].default_value = 0.42
WICK = plain("wick", (0.01, 0.01, 0.01), rough=0.9)
RUNNER = scan("stair runner", "velour_velvet", size=0.4, tint=(0.35, 0.06, 0.05), bright=0.7, rough=(0.7, 0.95), bump=0.3)
SOIL = plain("soil", (0.04, 0.035, 0.018), rough=0.95)

def silk_paper():
    m = bpy.data.materials.new("green silk"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    wv = N.new("ShaderNodeTexWave"); wv.wave_type = "BANDS"; wv.bands_direction = "Z"; wv.inputs["Scale"].default_value = 60; wv.inputs["Distortion"].default_value = 3; wv.inputs["Detail"].default_value = 5
    L(tc.outputs["Object"], wv.inputs["Vector"])
    sl = N.new("ShaderNodeTexNoise"); sl.inputs["Scale"].default_value = 6; sl.inputs["Detail"].default_value = 8
    sm = N.new("ShaderNodeMapping"); sm.inputs["Scale"].default_value = (0.5, 0.5, 14); L(tc.outputs["Object"], sm.inputs["Vector"]); L(sm.outputs["Vector"], sl.inputs["Vector"])
    # a damask, faint: the pattern woven in the silk
    dm = N.new("ShaderNodeTexVoronoi"); dm.inputs["Scale"].default_value = 3.2; dm.feature = "SMOOTH_F1"
    L(tc.outputs["Object"], dm.inputs["Vector"])
    mx = N.new("ShaderNodeMath"); mx.operation = "MULTIPLY"; L(wv.outputs["Fac"], mx.inputs[0]); L(sl.outputs["Fac"], mx.inputs[1])
    mx2 = N.new("ShaderNodeMath"); mx2.operation = "MULTIPLY_ADD"; mx2.inputs[1].default_value = 0.35; L(dm.outputs["Distance"], mx2.inputs[0]); L(mx.outputs["Value"], mx2.inputs[2])
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (0.006, 0.04, 0.02, 1); ramp.color_ramp.elements[1].color = (0.04, 0.17, 0.085, 1)
    L(mx2.outputs["Value"], ramp.inputs["Fac"]); L(ramp.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.45; b.inputs["Sheen Weight"].default_value = 0.6; b.inputs["Sheen Roughness"].default_value = 0.35
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.4; bp.inputs["Distance"].default_value = 0.002; L(mx.outputs["Value"], bp.inputs["Height"]); L(bp.outputs["Normal"], b.inputs["Normal"])
    return m
SILK = silk_paper()

# what moves, rendered apart
GATE, PENDULUM = [], []

# ── the floor: oak boards, the lawn down the middle ────────────────────────
RUN_HALF = WALL * 0.34 * 0.86
def boards():
    x = -WALL
    while x < WALL - 0.01:
        bw = min(0.16, WALL - x)
        if not (-RUN_HALF - 0.05 < x + bw / 2 < RUN_HALF + 0.05):
            y = Y0 - RNG.uniform(0, 1.6)
            while y < END:
                L_ = RNG.uniform(1.4, 2.8)
                slab(x + 0.002, x + bw - 0.002, max(y, Y0) + 0.002, min(y + L_, END) - 0.002, -0.025 - RNG.uniform(0, 0.002), 0, BOARDS, 0.002)
                y += L_
        x += bw
    arch(box("subfloor", -WALL, WALL, Y0, END + 0.5, -0.06, -0.026, plain("gaps", (0.006, 0.005, 0.004), rough=1)))
    arch(box("soil", -RUN_HALF, RUN_HALF, Y0, END, -0.03, -0.01, SOIL))
    for xs in (-1, 1):
        slab(xs * RUN_HALF - 0.025, xs * RUN_HALF + 0.025, Y0, END, -0.03, 0.012, BRASS, 0.003)
boards()
GRASS = []
def lawn(x0, x1, y0, y1, density):
    if not GRASS:
        for n in ("large_a", "large_b", "mid_a", "mid_b", "mid_c", "small_a", "small_b"):
            GRASS.append(import_model("grass_medium_01", only=f"grass_medium_01_{n}_LOD0", at=(0, 0, -50)))
    for _ in range(int((x1 - x0) * (y1 - y0) * density)):
        twin = clone(RNG.choice(GRASS), (RNG.uniform(x0, x1), RNG.uniform(y0, y1), -0.012), RNG.uniform(0, math.tau), RNG.uniform(0.6, 1.0))
        ARCH.extend(meshes_of(twin))
lawn(-RUN_HALF + 0.03, RUN_HALF - 0.03, Y0, END - 0.05, 170)

# ── the walls: skirting, panelled dado, silk, picture rail, frieze, cornice
DADO, RAIL = 0.95, 2.62
def wall(side):
    X = side * WALL; inner = X; outer = X + side * 0.25
    xa, xb = sorted((inner, outer))
    w = arch(box("wall", xa, xb, Y0 - 1, END + 0.3, 0, CEIL, SILK))
    for zd in DOORS:
        y0, y1 = zd * D0, zd * D0 + DOOR_LEN
        c = box("cut", xa - 0.1, xb + 0.1, y0, y1, -0.1, DOOR_H, IRON)
        boolean_cut(w, c)
    # the panelling below, run by run between the doors
    spans, y = [], Y0 - 1
    for zd in DOORS:
        spans.append((y, zd * D0 - 0.13)); y = zd * D0 + DOOR_LEN + 0.13
    spans.append((y, END))
    face = inner - side * 0.0
    for a, b in spans:
        if b - a < 0.2: continue
        xa2, xb2 = sorted((face, face - side * 0.03))
        slab(xa2, xb2, a, b, 0, DADO, OAK, 0)
        n = max(1, int((b - a) / 0.62))
        for k in range(n):
            pa = a + k * (b - a) / n + 0.07; pb = a + (k + 1) * (b - a) / n - 0.07
            xa3, xb3 = sorted((face - side * 0.03, face - side * 0.05))
            slab(xa3, xb3, pa, pb, 0.24, DADO - 0.12, OAK, 0.012)
        xa4, xb4 = sorted((face, face - side * 0.06))
        slab(xa4, xb4, a, b, DADO - 0.02, DADO + 0.05, OAK_ACROSS, 0.01)      # dado rail
        slab(xa4, xb4, a, b, 0, 0.2, OAK_ACROSS, 0.008)                        # skirting
    xa5, xb5 = sorted((face, face - side * 0.04))
    slab(xa5, xb5, Y0 - 1, END, RAIL, RAIL + 0.05, OAK_ACROSS, 0.008)           # picture rail
    slab(xa5, xb5, Y0 - 1, END, RAIL + 0.05, CEIL, PLASTER, 0)                  # frieze
    xa6, xb6 = sorted((face, face - side * 0.12))
    slab(xa6, xb6, Y0 - 1, END, CEIL - 0.14, CEIL, PLASTER, 0.03)               # cornice
    xa7, xb7 = sorted((face, face - side * 0.07))
    slab(xa7, xb7, Y0 - 1, END, CEIL - 0.22, CEIL - 0.14, PLASTER, 0.02)
for side in (-1, 1): wall(side)

# ── the doors: walnut, six panels, the numeral gilt on the top rail ────────
GILT = aged_metal("gilt", (0.62, 0.46, 0.2), (0.12, 0.08, 0.03), rough=(0.2, 0.45), scale=40, tarnish=0.4)
ROMAN = ["I", "II", "III", "IV", "V", "VI"]
def door(side, zd, n):
    y0, y1 = zd * D0, zd * D0 + DOOR_LEN
    X = side * WALL
    face = X + side * 0.07             # the leaf stands back in its opening
    def piece(a, b, c, d_, depth0, depth1, mat, r=0.004):
        xa, xb = sorted((face - side * depth0, face - side * depth1))
        return slab(xa, xb, a, b, c, d_, mat, r)
    W_, H_ = y1 - y0, DOOR_H
    piece(y0, y1, 0, H_, 0, 0.045, WALNUT, 0)
    for ya, yb in ((y0, y0 + 0.11), ((y0 + y1) / 2 - 0.05, (y0 + y1) / 2 + 0.05), (y1 - 0.11, y1)):
        piece(ya, yb, 0, H_, 0, 0.012, WALNUT)
    rails = (0, 0.2, H_ * 0.47, H_ * 0.47 + 0.11, H_ * 0.73, H_ * 0.73 + 0.11, H_ - 0.2, H_)
    for za, zb in zip(rails[0::2], rails[1::2]):
        piece(y0 + 0.11, y1 - 0.11, za, zb, 0, 0.012, WALNUT_X)
    for za, zb in ((0.2, H_ * 0.47), (H_ * 0.47 + 0.11, H_ * 0.73), (H_ * 0.73 + 0.11, H_ - 0.2)):
        for ya, yb in ((y0 + 0.11, (y0 + y1) / 2 - 0.05), ((y0 + y1) / 2 + 0.05, y1 - 0.11)):
            f = piece(ya + 0.05, yb - 0.05, za + 0.05, zb - 0.05, 0.004, 0.018, WALNUT, 0.03)
            for (a, b, c, d_) in ((ya, yb, za, za + 0.014), (ya, yb, zb - 0.014, zb), (ya, ya + 0.014, za, zb), (yb - 0.014, yb, za, zb)):
                piece(a, b, c, d_, 0.008, 0.02, WALNUT, 0.004)
    # the numeral, gilt, on the top rail
    t = bpy.data.curves.new("numeral", "FONT"); t.body = ROMAN[n]
    try: t.font = bpy.data.fonts.load("C:/Windows/Fonts/georgiab.ttf")
    except Exception: pass
    t.size = 0.12; t.align_x = "CENTER"; t.align_y = "CENTER"; t.extrude = 0.004
    num = arch(link(bpy.data.objects.new("numeral", t))); num.data.materials.append(GILT)
    num.rotation_euler = (math.pi / 2, 0, -side * math.pi / 2); num.location = (face - side * 0.016, (y0 + y1) / 2, H_ - 0.1)
    # the knob, its rose, the keyhole's escutcheon
    # (part of the door: it swings with it)
    ky = y1 - 0.1
    arch(sphere("knob", (face - side * 0.07, ky, 1.0), 0.03, BRASS))
    k1 = cylinder("rose", 0, 0, -0.006, 0.006, 0.035, BRASS); k1.rotation_euler = (0, math.pi / 2, 0); k1.location = (face - side * 0.012, ky, 1.0)
    k2 = cylinder("shank", 0, 0, -0.025, 0.025, 0.009, BRASS); k2.rotation_euler = (0, math.pi / 2, 0); k2.location = (face - side * 0.04, ky, 1.0)
    for o in (k1, k2): arch(o)
    # the architrave round it, moulded
    for (a, b, c, d_) in ((y0 - 0.13, y0, 0, H_ + 0.13), (y1, y1 + 0.13, 0, H_ + 0.13), (y0 - 0.13, y1 + 0.13, H_, H_ + 0.13)):
        xa, xb = sorted((X, X - side * 0.035))
        slab(xa, xb, a, b, c, d_, OAK_ACROSS if c == H_ else OAK, 0.012)
        xa, xb = sorted((X - side * 0.035, X - side * 0.05))
        slab(xa, xb, a + 0.03, b - 0.03, c + (0.03 if c == H_ else 0), d_ - 0.03, OAK, 0.008)
    # the reveal, and light under the leaf: there is a room lit behind it
    xa, xb = sorted((X, face))
    slab(xa, xb, y0 - 0.002, y0, 0, H_, OAK, 0); slab(xa, xb, y1, y1 + 0.002, 0, H_, OAK, 0); slab(xa, xb, y0, y1, H_, H_ + 0.002, OAK, 0)
    glow = arch(box("under", face - side * 0.002, face + side * 0.01, y0 + 0.02, y1 - 0.02, 0.0, 0.006,
                    plain("lamplight", (1, 0.6, 0.3), emit=(1.0, 0.55, 0.22), strength=6)))
for side in (-1, 1):
    for i, zd in enumerate(DOORS):
        door(side, zd, i + (0 if side < 0 else 3))

# ── the ceiling, and the glazed lantern in it with the night above ─────────
SKY_X, SKY_Y0, SKY_Y1 = 1.35, 3.2, 7.4
ceil = arch(box("ceiling", -WALL - 0.3, WALL + 0.3, Y0 - 1, END + 0.3, CEIL, CEIL + 0.2, PLASTER))
boolean_cut(ceil, box("cut", -SKY_X, SKY_X, SKY_Y0, SKY_Y1, CEIL - 0.1, CEIL + 0.5, IRON))
for (a, b, c, d_) in ((-SKY_X - 0.12, SKY_X + 0.12, SKY_Y0 - 0.12, SKY_Y0), (-SKY_X - 0.12, SKY_X + 0.12, SKY_Y1, SKY_Y1 + 0.12),
                      (-SKY_X - 0.12, -SKY_X, SKY_Y0, SKY_Y1), (SKY_X, SKY_X + 0.12, SKY_Y0, SKY_Y1)):
    slab(a, b, c, d_, CEIL - 0.12, CEIL + 0.02, OAK_ACROSS, 0.02)
# the lantern's glazing bars, its glass, sloped up to a ridge
RIDGE = CEIL + 0.9
for k in range(9):
    y = SKY_Y0 + k * (SKY_Y1 - SKY_Y0) / 8
    for xs in (-1, 1):
        bar = tube("bar", [(xs * SKY_X, CEIL + 0.02), (0, RIDGE)], 0.018, IRON, at=(0, y, 0)); arch(bar)
arch(tube("ridge", [(SKY_Y0, RIDGE), (SKY_Y1, RIDGE)], 0.024, IRON, rot=math.pi / 2))
SKYLIGHT_GLASS = GLASS.copy(); SKYLIGHT_GLASS.name = "skylight glass"
SKYLIGHT_GLASS.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.045

def skylight_pane(name, corners):
    # A closed, thin sheet has two optical interfaces. A single face bends
    # the outside view as if the entire space above the roof were solid glass.
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bm.faces.new([bm.verts.new(v) for v in corners]); bm.to_mesh(me); bm.free()
    pane = arch(link(bpy.data.objects.new(name, me))); pane.data.materials.append(SKYLIGHT_GLASS)
    thickness = pane.modifiers.new("glass thickness", "SOLIDIFY")
    thickness.thickness = 0.004; thickness.offset = 0
    return pane

for xs in (-1, 1):
    corners = [(xs * SKY_X, SKY_Y0, CEIL + 0.02), (0, SKY_Y0, RIDGE), (0, SKY_Y1, RIDGE), (xs * SKY_X, SKY_Y1, CEIL + 0.02)]
    skylight_pane("sloping pane", list(reversed(corners)) if xs > 0 else corners)
    # A continuous glazing bar supports each slope between the transverse ribs.
    z = (CEIL + 0.02 + RIDGE) / 2
    arch(tube("glazing bar", [(SKY_Y0, z), (SKY_Y1, z)], 0.012, IRON, at=(xs * SKY_X / 2, 0, 0), rot=math.pi / 2))
# Close the triangular ends instead of leaving open gaps above the ceiling.
for y in (SKY_Y0, SKY_Y1):
    corners = [(-SKY_X, y, CEIL + 0.02), (SKY_X, y, CEIL + 0.02), (0, y, RIDGE)]
    skylight_pane("end pane", list(reversed(corners)) if y == SKY_Y1 else corners)
sky = bpy.data.materials.new("night sky"); sky.use_nodes = True
sn = sky.node_tree.nodes; sn.remove(sn["Principled BSDF"]); em = sn.new("ShaderNodeEmission")
nz = sn.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.8; nz.inputs["Detail"].default_value = 6
cr = sn.new("ShaderNodeValToRGB"); cr.color_ramp.elements[0].color = (0.004, 0.008, 0.025, 1); cr.color_ramp.elements[1].color = (0.03, 0.06, 0.16, 1)
sky.node_tree.links.new(nz.outputs["Fac"], cr.inputs["Fac"]); sky.node_tree.links.new(cr.outputs["Color"], em.inputs["Color"]); em.inputs["Strength"].default_value = 1.2
sky.node_tree.links.new(em.outputs["Emission"], sn["Material Output"].inputs["Surface"])
arch(box("night", -6, 6, 0, 14, CEIL + 3.0, CEIL + 3.1, sky))
# leaves on the glass, blown there and left
LEAF = bpy.data.materials.new("leaves on glass"); LEAF.use_nodes = True
LEAF.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.03, 0.025, 0.01, 1)
for _ in range(60):
    xs = RNG.choice((-1, 1)); t_ = RNG.uniform(0.1, 0.95); y = RNG.uniform(SKY_Y0, SKY_Y1)
    rise = RIDGE - CEIL - 0.02
    normal = Vector((xs * rise, 0, SKY_X)).normalized()
    p = Vector((xs * SKY_X * (1 - t_), y, CEIL + 0.02 + rise * t_)) + normal * 0.004
    # Rotate each leaf around its own centre, in the plane of the glass.
    leaf = cylinder("leaf", 0, 0, 0, 0.002, RNG.uniform(0.03, 0.06), LEAF, verts=7)
    leaf.location = p; leaf.scale = (1, 0.6, 1); leaf.rotation_mode = "QUATERNION"
    leaf.rotation_quaternion = normal.to_track_quat("Z", "Y") @ Quaternion((0, 0, 1), RNG.uniform(0, 3)); arch(leaf)

# ── the far end: the stair going up through an arch, its gate ──────────────
end = arch(box("end wall", -WALL - 0.3, WALL + 0.3, END, END + 0.3, 0, CEIL, SILK))
GATE += build_staircase(end, OPEN, HEAD, OAK, BRASS, GLASS)
for xs in (-1, 1):
    a, b = sorted((xs * WALL, xs * OPEN))
    slab(a, b, END - 0.03, END, 0, DADO, OAK, 0); slab(a, b, END - 0.06, END, DADO - 0.02, DADO + 0.05, OAK_ACROSS, 0.01)
    slab(a, b, END - 0.06, END, 0, 0.2, OAK_ACROSS, 0.008)
    slab(a, b, END - 0.04, END, RAIL, RAIL + 0.05, OAK_ACROSS, 0.008)
# The long-case clock, left of the new stone portal.
CLK_X, CLK_Y = -0.74 * WALL, 4.58 * D0
PIV = 262 * (HR / 700) * K; PLEN = 168 * (HR / 700) * K; BOB = 16 * (HR / 700) * K
CASE = scan("clock case", "rosewood_veneer1", size=0.5, tint=(0.7, 0.45, 0.3), bright=0.45, rough=(0.12, 0.3), bump=0.2, coat=0.6, upright=True)
cx0, cx1, cy0, cy1 = CLK_X - 0.27, CLK_X + 0.27, CLK_Y - 0.13, END - 0.01
slab(cx0 - 0.04, cx1 + 0.04, cy0 - 0.04, cy1, 0, 0.32, CASE, 0.01)                       # plinth
trunk = slab(cx0, cx1, cy0, cy1, 0.32, 1.58, CASE, 0)                                     # trunk
slab(cx0 - 0.03, cx1 + 0.03, cy0 - 0.03, cy1, 1.58, 1.66, CASE, 0.01)                     # waist moulding
slab(cx0 - 0.02, cx1 + 0.02, cy0 - 0.02, cy1, 1.66, 2.24, CASE, 0.01)                     # hood
slab(cx0 - 0.05, cx1 + 0.05, cy0 - 0.05, cy1, 2.24, 2.32, CASE, 0.015)                    # cornice
for xs in (-1, 0, 1): arch(lathe("clock finial", [(0, 0), (0.03, 0), (0.025, 0.05), (0.035, 0.09), (0, 0.16)], BRASS, at=(CLK_X + xs * 0.22, cy0 + 0.1, 2.32)))
# the trunk's window, through which the pendulum is seen: dark inside, glazed
boolean_cut(trunk, box("cut", CLK_X - 0.13, CLK_X + 0.13, cy0 - 0.05, CLK_Y + 0.06, PIV - PLEN - BOB - 0.06, PIV + 0.05, IRON))
arch(box("trunk inside", CLK_X - 0.14, CLK_X + 0.14, CLK_Y + 0.05, CLK_Y + 0.07, PIV - PLEN - BOB - 0.08, PIV + 0.06, plain("inside", (0.012, 0.008, 0.005), rough=0.8)))
clock_glass = arch(box("trunk glass", CLK_X - 0.13, CLK_X + 0.13, cy0 + 0.005, cy0 + 0.01, PIV - PLEN - BOB - 0.06, PIV + 0.05, GLASS))
# the dial, in the hood's glazed door
DIAL = os.path.join(ROOT, ".artifacts/hall/dial.png")
if os.path.exists(DIAL):
    dmat = bpy.data.materials.new("dial"); dmat.use_nodes = True
    dn = dmat.node_tree.nodes; ti = dn.new("ShaderNodeTexImage"); ti.image = bpy.data.images.load(DIAL)
    tco = dn.new("ShaderNodeTexCoord"); dmat.node_tree.links.new(tco.outputs["UV"], ti.inputs["Vector"])
    dmat.node_tree.links.new(ti.outputs["Color"], dn["Principled BSDF"].inputs["Base Color"]); dn["Principled BSDF"].inputs["Roughness"].default_value = 0.35
    me = bpy.data.meshes.new("dial"); bm = bmesh.new(); bm.loops.layers.uv.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5, calc_uvs=True)
    for v in bm.verts: v.co = Vector((v.co.x * 0.42, 0, v.co.y * 0.42))
    bm.to_mesh(me); bm.free()
    dial = arch(link(bpy.data.objects.new("dial", me))); dial.data.materials.append(dmat); dial.location = (CLK_X, cy0 - 0.025, 1.95)
    arch(box("hood glass", CLK_X - 0.23, CLK_X + 0.23, cy0 - 0.035, cy0 - 0.03, 1.72, 2.18, GLASS))
# the pendulum, apart: a rod from its pivot, the bob
PENDULUM.append(cylinder("pendulum rod", CLK_X, CLK_Y, PIV - PLEN, PIV, 0.004, BRASS, verts=8))
pb = cylinder("pendulum bob", 0, 0, -0.006, 0.006, BOB, BRASS, verts=32); pb.rotation_euler = (math.pi / 2, 0, 0); pb.location = (CLK_X, CLK_Y, PIV - PLEN)
bevel(pb, 0.004, 2); PENDULUM.append(pb)

# ── the chandelier: bronze, a turned stem, eight arms, candles out ─────────
HUB = at(0, -0.4 * HR, 1.9)
hk = HR / 700 / 1.9
hub_s = (VP[0], VP[1] + (-0.4 * HR) / 1.9)
WICKS = []
for i in range(8):
    a = (i / 8) * math.pi * 2 + 0.32
    sx = hub_s[0] + math.cos(a) * 132 * hk; sy = hub_s[1] + (math.sin(a) * 132 * 0.22 - 68) * hk
    WICKS.append(from_screen(sx * 1.0, sy, HUB.z + 68 * (HR / 700) * K))
# The chandelier hangs from a crossbeam spanning the opening, rather than
# from a ceiling rose floating in the middle of the skylight.
slab(-SKY_X - 0.04, SKY_X + 0.04, HUB.y - 0.06, HUB.y + 0.06, CEIL - 0.06, CEIL + 0.02, OAK_ACROSS, 0.012)
arch(lathe("rose", [(0, 0), (0.2, 0), (0.19, -0.03), (0.12, -0.06), (0.04, -0.08), (0, -0.08)], PLASTER, at=(0, HUB.y, CEIL - 0.06)))
for k in range(int((CEIL - 0.14 - (HUB.z + 0.3)) / 0.06)):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.022, minor_radius=0.005, location=(0, HUB.y, CEIL - 0.16 - k * 0.06), rotation=(math.pi / 2, 0, (k % 2) * math.pi / 2))
    c = bpy.context.active_object; c.data.materials.append(BRONZE); arch(c)
arch(lathe("stem", [(0, 0), (0.06, 0), (0.08, 0.05), (0.05, 0.12), (0.03, 0.2), (0.05, 0.26), (0.035, 0.32), (0.02, 0.4), (0.03, 0.45), (0, 0.48)], BRONZE, at=(0, HUB.y, HUB.z - 0.15)))
for w in WICKS:
    cup_top = w.z - 0.13
    d = Vector((w.x, w.y, 0)) - Vector((0, HUB.y, 0)); L_ = d.length; ang = math.atan2(d.y, d.x)
    a2 = tube("arm", [(0.02, 0.0), (L_ * 0.55, -0.08), (L_ * 0.95, -0.02), (L_, cup_top - HUB.z - 0.02)], 0.011, BRONZE, at=(0, HUB.y, HUB.z))
    a2.rotation_euler = (0, 0, ang); arch(a2)
    arch(lathe("cup", [(0, 0), (0.012, 0), (0.035, 0.012), (0.04, 0.02), (0.02, 0.03), (0.022, 0.06), (0, 0.06)], BRONZE, at=(w.x, w.y, cup_top - 0.04)))
    arch(cylinder("candle", w.x, w.y, cup_top + 0.01, w.z - 0.004, 0.012, WAX, verts=16))
    arch(cylinder("wick", w.x, w.y, w.z - 0.006, w.z + 0.008, 0.0012, WICK, verts=6))
    arch(sphere("drop", (w.x, w.y, cup_top - 0.1), 0.018, GLASS, squash=(1, 1, 1.8)))

# ── the sconces between the doors, their candles lit ───────────────────────
LIT = []
for side in (-1, 1):
    for zs in SCONCES:
        tip = sconce_tip(side, zs)
        candle_sconce(side, tip, BRASS, WAX, WICK)
        LIT.append(tip)
        # (they stand in front of the wall; furniture, for the door's pass)

# ── furniture, plants, the things a hall gathers ───────────────────────────
def plant_pot(x, y, w=0.36, h=0.32, plant=None, only=None, ph=0.7, rot=0.0, z=0.0):
    terr = bpy.data.materials.get("terracotta") or plain("terracotta", (0.45, 0.2, 0.1), rough=0.88)
    r0, r1 = w * 0.36, w / 2
    lathe("pot", [(0, 0), (r0, 0), (r0 * 1.02, 0.01), (r1 * 0.93, h * 0.82), (r1, h * 0.84), (r1 * 1.03, h * 0.9), (r1 * 1.02, h), (r1 * 0.9, h), (r1 * 0.88, h * 0.86), (0, h * 0.86)], terr, at=(x, y, z), steps=40)
    cylinder("soil", x, y, z + h * 0.8, z + h * 0.81, r1 * 0.88, SOIL)
    if plant: import_model(plant, height=ph, only=only, at=(x, y, z + h * 0.72), rot=rot)
# near the first doors: a philodendron in its clay pot, left; a fern on a stand, right
import_model("potted_plant_02", height=1.15, at=(-WALL + 0.45, 2.15, 0), rot=0.6)
stand_wood = OAK
lathe("plant stand", [(0, 0), (0.18, 0), (0.18, 0.03), (0.05, 0.06), (0.04, 0.6), (0.06, 0.64), (0.16, 0.66), (0.16, 0.7), (0, 0.7)], stand_wood, at=(WALL - 0.42, 2.2, 0))
plant_pot(WALL - 0.42, 2.2, 0.32, 0.26, "fern_02", "fern_02_b", 0.7, 1.1, z=0.7)
# between the first two doors, left: a little table, a fern on it
import_model("side_table_01", height=0.72, at=(-WALL + 0.32, (DOORS[0] * D0 + DOOR_LEN + DOORS[1] * D0) / 2 + 0.18, 0), rot=math.pi / 2)
plant_pot(-WALL + 0.3, (DOORS[0] * D0 + DOOR_LEN + DOORS[1] * D0) / 2 + 0.18, 0.24, 0.2, "fern_02", "fern_02_a", 0.42, 2.0, z=0.72)
# and right: a periwinkle in a stone urn on a plinth
urn_stone = PLASTER
ux, uy = WALL - 0.3, (DOORS[0] * D0 + DOOR_LEN + DOORS[1] * D0) / 2 + 0.18
slab(ux - 0.18, ux + 0.18, uy - 0.18, uy + 0.18, 0, 0.62, urn_stone, 0.01)
lathe("urn", [(0, 0), (0.12, 0), (0.12, 0.03), (0.06, 0.06), (0.05, 0.12), (0.16, 0.2), (0.19, 0.32), (0.17, 0.36), (0.19, 0.38), (0, 0.38)], urn_stone, at=(ux, uy, 0.62), steps=40)
for k in range(5):
    import_model("periwinkle_plant", height=0.32, only=["periwinkle_plant_01_LOD0", "periwinkle_plant_02_LOD0"][k % 2], at=(ux + math.cos(k * 1.3) * 0.06, uy + math.sin(k * 1.3) * 0.06, 0.95), rot=k * 1.2)
# between the last two doors: an umbrella stand, left; a trunk, right
mid2 = (DOORS[1] * D0 + DOOR_LEN + DOORS[2] * D0) / 2 + 0.15
lathe("umbrella stand", [(0, 0), (0.13, 0), (0.13, 0.02), (0.11, 0.05), (0.11, 0.55), (0.13, 0.58), (0.12, 0.6), (0.1, 0.6), (0, 0.05)], BRASS, at=(-WALL + 0.25, mid2, 0), steps=40)
for k, (dx, dy, lean) in enumerate(((0.03, 0.02, 0.12), (-0.04, -0.02, -0.08))):
    st = cylinder("cane", 0, 0, 0, 0.92, 0.011, plain("cane", (0.06, 0.03, 0.015), rough=0.4), verts=10)
    st.location = (-WALL + 0.25 + dx, mid2 + dy, 0.05); st.rotation_euler = (lean, 0.1, 0)
    tube("crook", [(0, 0.92), (0.05, 0.98), (0.09, 0.93)], 0.011, plain("cane", (0.06, 0.03, 0.015), rough=0.4), at=(-WALL + 0.25 + dx, mid2 + dy, 0.05)).rotation_euler = (lean, 0.1, 0)
leather = scan("trunk leather", "brown_leather", size=0.6, tint=(0.7, 0.45, 0.3), bright=0.6, rough=(0.4, 0.7), bump=0.5)
tx, ty = WALL - 0.32, mid2
slab(tx - 0.26, tx + 0.26, ty - 0.45, ty + 0.45, 0.0, 0.5, leather, 0.02)
for yy in (ty - 0.3, ty + 0.3):
    slab(tx - 0.27, tx + 0.27, yy - 0.025, yy + 0.025, 0.0, 0.51, plain("strap", (0.08, 0.04, 0.02), rough=0.6), 0.004)
for (cx, cy) in ((tx - 0.26, ty - 0.45), (tx - 0.26, ty + 0.45)):
    slab(cx - 0.012, cx + 0.04, cy - 0.04, cy + 0.04, 0.0, 0.5, BRASS, 0.004)
plant_pot(tx, ty + 0.1, 0.22, 0.18, "fern_02", "fern_02_c", 0.4, 0.4, z=0.5)
# right of the stair: a coat stand, a hat on it
csx, csy = OPEN + 0.62, END - 0.35
lathe("coat stand", [(0, 0), (0.2, 0), (0.2, 0.03), (0.05, 0.08), (0.03, 0.1), (0.022, 1.7), (0.035, 1.74), (0.02, 1.8), (0.03, 1.84), (0, 1.88)], OAK, at=(csx, csy, 0), steps=24)
for k in range(4):
    a = k * math.pi / 2 + 0.4
    tube("hook", [(0.0, 1.62), (0.11, 1.66), (0.14, 1.74)], 0.008, BRASS, at=(csx, csy, 0), rot=a)
felt = plain("felt hat", (0.03, 0.028, 0.026), rough=0.95, sheen=0.4)
lathe("hat", [(0, 0), (0.17, 0), (0.18, 0.012), (0.1, 0.02), (0.095, 0.12), (0.08, 0.14), (0, 0.14)], felt, at=(csx + 0.1, csy, 1.71), steps=40)
sc = tube("scarf", [(0.0, 1.66), (0.12, 1.5), (0.1, 1.15), (0.08, 0.95)], 0.035, plain("scarf", (0.2, 0.05, 0.04), rough=0.9, sheen=0.5), at=(csx, csy, 0), rot=-0.5)
# a watering can and pots by the stair, right
zinc = aged_metal("zinc", (0.5, 0.52, 0.53), (0.18, 0.19, 0.18), rough=(0.35, 0.65), scale=12, tarnish=0.5)
wx, wy = OPEN + 0.35, END - 0.95
lathe("can", [(0, 0), (0.13, 0), (0.135, 0.01), (0.13, 0.26), (0.115, 0.29), (0.09, 0.3), (0, 0.3)], zinc, at=(wx, wy, 0), steps=40)
tube("spout", [(0.13, 0.05), (0.24, 0.17), (0.31, 0.29)], 0.015, zinc, at=(wx, wy, 0), rot=math.pi * 0.8)
tube("handle", [(-0.1, 0.29), (-0.02, 0.42), (0.1, 0.4), (0.14, 0.26)], 0.01, zinc, at=(wx, wy, 0), rot=math.pi * 0.8)
plant_pot(wx + 0.3, wy + 0.2, 0.2, 0.17)
# hanging baskets from the ceiling, ferns spilling over
for (bx, by) in ((-1.95, 4.95), (1.95, 6.6)):
    wire = plain("basket wire", (0.03, 0.03, 0.03), rough=0.5, metal=0.8)
    bz = 2.35
    sphere("basket", (bx, by, bz), 0.22, plain("moss lining", (0.06, 0.07, 0.03), rough=1.0), squash=(1, 1, 0.7))
    for k in range(3):
        a = k * math.tau / 3 + 0.4
        foot = Vector((bx + math.cos(a) * 0.22, by + math.sin(a) * 0.22, bz + 0.1)); top = Vector((bx, by, CEIL - 0.05))
        c = cylinder("chain", 0, 0, 0, (top - foot).length, 0.003, wire, verts=6); c.location = foot; c.rotation_euler = (top - foot).to_track_quat("Z", "Y").to_euler()
    import_model("fern_02", height=0.5, only="fern_02_a", at=(bx, by, bz - 0.05), rot=bx)
# herbarium sheets, framed, above the sconces
def herbarium(side, y, z):
    frame_w = scan("frame", "dark_wood", size=0.3, bright=0.45, rough=(0.35, 0.6), bump=0.3, coat=0.3)
    sheet = paper("sheet", (0.72, 0.65, 0.5), 0.35)
    X = side * WALL - side * 0.02
    a, b = sorted((X, X - side * 0.03))
    w, h = 0.4, 0.56
    slab(a, b, y - w / 2 - 0.035, y + w / 2 + 0.035, z - 0.035, z + h + 0.035, frame_w, 0.008, keep=False)
    a, b = sorted((X - side * 0.031, X - side * 0.034))
    box("sheet", a, b, y - w / 2, y + w / 2, z, z + h, sheet)
    me = bpy.data.meshes.new("frond"); bm = bmesh.new()
    pressed = bpy.data.materials.get("pressed") or plain("pressed", (0.14, 0.13, 0.05), rough=0.8)
    for i in range(18):
        t = i / 18; cz = z + 0.06 + 0.45 * t; l = 0.17 * (1 - t) ** 0.8 + 0.01
        for s_ in (-1, 1):
            ang = s_ * (0.9 - 0.3 * t)
            pts = [(0, 0), (l * 0.5, l * 0.08), (l, 0), (l * 0.5, -l * 0.08)]
            vs = [bm.verts.new((X - side * 0.036, y + s_ * (px * math.cos(0.5) ), cz + px * math.sin(0.5) * 0.6 + py)) for px, py in pts]
            bm.faces.new(vs)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("frond", me)); o.data.materials.append(pressed)
for side in (-1, 1):
    for zs in SCONCES:
        herbarium(side, zs * D0, 2.3)
# ivy along the cornices: a stem laid along each, sagging between where it
# holds and broken off here and there, strands let down from it; on it ivy
# leaves, five-lobed and cupped, glossy, each its own green
ivy_mat = bpy.data.materials.new("ivy"); ivy_mat.use_nodes = True
_n = ivy_mat.node_tree.nodes; _l = ivy_mat.node_tree.links.new
_b = _n["Principled BSDF"]; _b.inputs["Roughness"].default_value = 0.34; _b.inputs["Coat Weight"].default_value = 0.25
_at = _n.new("ShaderNodeAttribute"); _at.attribute_name = "tint"
_ramp = _n.new("ShaderNodeValToRGB"); _r = _ramp.color_ramp
_r.elements[0].position = 0.0; _r.elements[0].color = (0.010, 0.030, 0.008, 1)
_r.elements[1].position = 1.0; _r.elements[1].color = (0.060, 0.095, 0.022, 1)
_mid = _r.elements.new(0.6); _mid.color = (0.022, 0.058, 0.014, 1)
_l(_at.outputs["Fac"], _ramp.inputs["Fac"])
# (mottled, paler along the veins)
_tc = _n.new("ShaderNodeTexCoord"); _nz = _n.new("ShaderNodeTexNoise"); _nz.inputs["Scale"].default_value = 160; _nz.inputs["Detail"].default_value = 4
_l(_tc.outputs["Object"], _nz.inputs["Vector"])
_mx = _n.new("ShaderNodeMix"); _mx.data_type = "RGBA"; _mx.blend_type = "MULTIPLY"; _mx.inputs["Factor"].default_value = 0.35
_l(_ramp.outputs["Color"], _mx.inputs["A"]); _l(_nz.outputs["Color"], _mx.inputs["B"])
_l(_mx.outputs["Result"], _b.inputs["Base Color"])
_tr = _n.new("ShaderNodeBsdfTranslucent"); _tr.inputs["Color"].default_value = (0.05, 0.13, 0.02, 1)
_ms = _n.new("ShaderNodeMixShader"); _ms.inputs["Fac"].default_value = 0.14
_out = _n["Material Output"]
_l(_b.outputs["BSDF"], _ms.inputs[1]); _l(_tr.outputs["BSDF"], _ms.inputs[2]); _l(_ms.outputs["Shader"], _out.inputs["Surface"])
IVY_STEM = plain("ivy stem", (0.035, 0.028, 0.016), rough=0.7)
LEAF = [(0, 0.04), (0.2, -0.02), (0.42, 0.12), (0.34, 0.3), (0.56, 0.5), (0.3, 0.6), (0.16, 0.8), (0, 1.0)]
LEAF = LEAF + [(-x, y) for x, y in reversed(LEAF[1:-1])]
def ivy_leaf(bm, tint, base, along, out, size):
    across = along.cross(out).normalized(); out = across.cross(along).normalized()
    # cupped: the midrib raised, the lobes' edges let back
    c = bm.verts.new(base + along * 0.45 * size + out * 0.07 * size)
    ring = [bm.verts.new(base + along * y * size + across * x * size - out * 0.1 * size * abs(x) / 0.56) for x, y in LEAF]
    t = RNG.random() ** 0.8
    for i in range(len(ring)):
        f = bm.faces.new((c, ring[i], ring[(i + 1) % len(ring)]))
        for lp in f.loops: lp[tint] = (t, t, t, 1)
def turned(v, a, b):
    return (Matrix.Rotation(a, 3, "Y") @ Matrix.Rotation(b, 3, "Z") @ v).normalized()
for side in (-1, 1):
    me = bpy.data.meshes.new("ivy"); bm = bmesh.new(); tint = bm.loops.layers.color.new("tint")
    stems = []
    face = side * (WALL - 0.125)
    y = Y0 - 0.7
    while y < END - 0.3:
        # a run of it, then a gap where it has been torn down
        run = RNG.uniform(0.9, 2.6); y1 = min(END - 0.15, y + run)
        holds = [y]
        while holds[-1] < y1: holds.append(min(y1, holds[-1] + RNG.uniform(0.35, 0.8)))
        path = []
        for a, b in zip(holds, holds[1:]):
            sag = RNG.uniform(0.03, 0.14)
            for k in range(int((b - a) / 0.025) + 1):
                t = k / max(1, int((b - a) / 0.025))
                path.append(Vector((face - side * RNG.uniform(0, 0.012), a + (b - a) * t, CEIL - 0.2 - sag * math.sin(math.pi * t))))
        stems.append(path)
        for i, p in enumerate(path):
            for _ in range(RNG.choice((1, 1, 2))):
                down = Vector((0, RNG.uniform(-0.6, 0.6), -1)).normalized()
                along = turned(down, RNG.uniform(-0.7, 0.7), 0)
                out = turned(Vector((-side, 0, 0.35)), RNG.uniform(-0.5, 0.5), RNG.uniform(-0.6, 0.6))
                ivy_leaf(bm, tint, p + along * RNG.uniform(0.01, 0.04) + Vector((-side * 0.01, 0, 0)), along, out, RNG.uniform(0.045, 0.085))
        # strands let down
        for h in holds[1:-1]:
            if RNG.random() > 0.55: continue
            drop = RNG.uniform(0.15, 0.55); n = int(drop / 0.03); sway = RNG.uniform(-0.12, 0.12)
            top = Vector((face, h, CEIL - 0.2))
            strand = [top + Vector((side * 0.06 * k / n, sway * (k / n) ** 2, -drop * k / n)) for k in range(n + 1)]
            stems.append(strand)
            for k, p in enumerate(strand[1:], 1):
                along = turned(Vector((0, RNG.uniform(-0.5, 0.5), -1)).normalized(), RNG.uniform(-0.6, 0.6), 0)
                out = turned(Vector((-side, 0, 0.25)), RNG.uniform(-0.5, 0.5), RNG.uniform(-0.5, 0.5))
                ivy_leaf(bm, tint, p + Vector((-side * 0.012, 0, 0)), along, out, RNG.uniform(0.035, 0.07) * (1 - 0.45 * k / n))
        y = y1 + RNG.uniform(0.3, 1.1)
    bm.to_mesh(me); bm.free()
    leaves = link(bpy.data.objects.new("ivy leaves", me)); leaves.data.materials.append(ivy_mat)
    cu = bpy.data.curves.new("ivy stems", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.004; cu.bevel_resolution = 1
    for path in stems:
        sp = cu.splines.new("POLY"); sp.points.add(len(path) - 1)
        for pt, v in zip(sp.points, path): pt.co = (*v, 1)
    st = link(bpy.data.objects.new("ivy stems", cu)); st.data.materials.append(IVY_STEM)
# leaves fallen on the boards, more toward the walls
FALLEN = plain("fallen", (0.1, 0.045, 0.015), rough=0.5)
me = bpy.data.meshes.new("fallen"); bm = bmesh.new()
for _ in range(260):
    x = RNG.choice((-1, 1)) * RNG.uniform(RUN_HALF + 0.05, WALL - 0.05); y = RNG.uniform(Y0, END - 0.1)
    if RNG.random() < 0.5 and abs(x) < WALL - 0.6: continue
    s_ = RNG.uniform(0.03, 0.06); a = RNG.uniform(0, math.tau)
    pts = [(math.cos(t) * s_, math.sin(t) * s_ * 0.38 * (1 - 0.3 * math.cos(t))) for t in [k * math.tau / 10 for k in range(10)]]
    vs = [bm.verts.new((x + px * math.cos(a) - py * math.sin(a), y + px * math.sin(a) + py * math.cos(a), 0.003 + RNG.uniform(0, 0.004))) for px, py in pts]
    bm.faces.new(vs)
bm.to_mesh(me); bm.free()
fl = link(bpy.data.objects.new("fallen leaves", me)); fl.data.materials.append(FALLEN)

# ── light ──────────────────────────────────────────────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
# the moon, down the stair from a window out of sight, and through the lantern
lamp("moon in the lantern", "SUN", (2, 6, 20), aim=(-0.5, 4.5, 0), energy=float(arg("--skymoon", "0.7")), colour=(0.55, 0.68, 1.0), angle=math.radians(3))
# the sconces' candles
for tip in LIT:
    lamp("candle", "POINT", tuple(tip + Vector((0, 0, 0.02))), energy=float(arg("--candle", "9")), colour=(1.0, 0.55, 0.22), size=0.012)
# a little warmth from the rooms behind the doors, and a faint fill
lamp("fill", "AREA", (0, 0.6, 2.6), aim=(0, END, 1.0), energy=float(arg("--fill", "60")), colour=(0.8, 0.85, 1.0), size=2.5)
clear_glass()
# a little haze, for the moon's light down the stair to be seen in
air = haze(float(arg("--haze", "0.008")))

# ── the passes ─────────────────────────────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "1.5")))
scene.cycles.volume_bounces = 1
scene.render.use_persistent_data = True
if arg("--blend", ""):
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(arg("--blend", "")))
moving = {"pendulum": PENDULUM}
if arg("--preview-gates", "0") != "1": moving["gate"] = GATE
passes(scene, OUT, ONLY, air, apart=moving, unseen={"pendulum": [clock_glass]})
if "gate-motion" in ONLY:
    render_gate_motion(scene, GATE, air, OUT, OPEN, HEAD)
print("HALL_DONE")
