# The Night Circuit (levels/rally): the finish of a night stage, built in
# three dimensions and rendered with Cycles through the exact eye the game's
# track has (track.js, stage.js layoutStage — exported by rally_export.mjs):
# a floodlit gravel oval cut into a pine forest, the chequered line across
# it, the timing hut with its window lit, the red flying-finish board, the
# photocells either side, the tape the crowd stands behind, hay bales along
# our side; four masts of floodlights, a tent with a string of bulbs across
# the oval, two vans; the moon over the trees.
#
# Rendered (stage.json's picture, 1880 × 1000, here at 2560 wide):
#   lit.png         the stage with its floodlights on
#   dark.png        the same, the floodlights out: the moon, the hut's
#                   window and the tent's bulbs
#   front-lit.png, front-dark.png   what stands between us and the cars (the
#                   bales, the near photocell), alone
#   people/…        each spectator, as they stand and with their arms up, and
#                   the marshal and his flag arm, alone, where they stand
#                   (people.json: where each falls, its feet, its shoulder)
#
#   node art/blender/rally_export.mjs
#   blender -b --factory-startup -P art/blender/rally_stage.py -- [--samples 256] [--only plates,front,people] [--preview 1]
#   node art/blender/rally_publish.mjs

import bpy, bmesh, math, sys, os, json, random
from mathutils import Vector, Matrix, Quaternion
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import ROOT, scan
import dawn_folk as folk

IN = os.path.join(ROOT, ".artifacts/rally")
OUT = IN
PEOPLE_OUT = os.path.join(IN, "people"); os.makedirs(PEOPLE_OUT, exist_ok=True)
S = json.load(open(os.path.join(IN, "stage.json")))
PREVIEW = arg("--preview", "") == "1"
SAMPLES = int(arg("--samples", "48" if PREVIEW else "256"))
WIDTH = int(arg("--width", "1280" if PREVIEW else "2560"))
RW, RH = S["ref"]["W"], S["ref"]["H"]
HEIGHT = round(WIDTH * RH / RW)
ONLY = set(arg("--only", "plates,front,people").split(","))
RNG = random.Random(1987)
T = S["track"]
U = 1.0 / S["m"]                                   # metres to one of the track's units
def W(wx, h, wz): return Vector((wx * U, wz * U, h * U))   # the track's world (units) in Blender's (metres)
def Wm(wx, hm, wz): return Vector((wx * U, wz * U, hm))    # (the same, its height in metres)

scene = fresh()
# ── the eye: the track's one projection ────────────────────────────────────
cd = bpy.data.cameras.new("eye"); cd.lens = 36; cd.sensor_width = 36; cd.sensor_fit = "HORIZONTAL"
cd.shift_y = (S["horizonY"] / RH - 0.5) * RH / RW; cd.clip_start = 0.5; cd.clip_end = 6000
cam = link(bpy.data.objects.new("eye", cd)); cam.location = (0, 0, S["camH"] * U); cam.rotation_euler = (math.pi / 2, 0, 0)
scene.camera = cam
scene.render.resolution_x, scene.render.resolution_y = WIDTH, HEIGHT
bpy.context.view_layer.update()
from bpy_extras.object_utils import world_to_camera_view
def to_ref(p):
    v = world_to_camera_view(scene, cam, Vector(p)); return [round(v.x * RW, 2), round((1 - v.y) * RH, 2)]

# ── materials ──────────────────────────────────────────────────────────────
GRAVEL = scan("stage gravel", "gravel_road", size=2.2, tint=(0.78, 0.7, 0.6), bright=0.7, sat=0.5, rough=(0.6, 0.9), bump=0.9)
GRASS = scan("stage grass", "grass_ground", size=3.0, tint=(0.55, 0.62, 0.42), bright=0.42, sat=0.6, rough=(0.7, 0.95), bump=0.6)
MUD = scan("verge mud", "leaf_scattered_gravel", size=2.0, tint=(0.6, 0.52, 0.42), bright=0.45, sat=0.5, rough=(0.6, 0.9), bump=0.7)
STEEL = aged_metal("mast steel", (0.32, 0.33, 0.34), (0.08, 0.07, 0.06), rough=(0.4, 0.7), scale=8, tarnish=0.5)
HOUSING = plain("lamp housing", (0.04, 0.04, 0.045), rough=0.45, metal=0.6)
LAMP_ON = plain("floodlight glass", (1.0, 0.95, 0.85), emit=(1.0, 0.86, 0.66), strength=float(arg("--lampglow", "60")))
HUT_WALL = scan("hut boards", "distressed_painted_planks", size=1.2, tint=(0.82, 0.8, 0.74), bright=0.62, sat=0.25, rough=(0.6, 0.9), bump=0.5, upright=True)
ROOF_FELT = plain("roof felt", (0.03, 0.03, 0.032), rough=0.85)
WINDOW = plain("hut window", (1.0, 0.8, 0.55), emit=(1.0, 0.72, 0.42), strength=float(arg("--window", "9")))
WOOD = scan("posts", "dark_wood", size=0.6, tint=(0.6, 0.5, 0.4), bright=0.5, rough=(0.6, 0.85), bump=0.4)
RED_BOARD = plain("finish board red", (0.55, 0.03, 0.025), rough=0.5)
WHITE_PAINT = plain("white paint", (0.82, 0.8, 0.74), rough=0.55)
BLACK_PAINT = plain("black paint", (0.02, 0.02, 0.022), rough=0.6)
CELL_RED = plain("photocell eye", (0.8, 0.02, 0.02), emit=(1.0, 0.05, 0.02), strength=8)
STRAW = bpy.data.materials.new("straw"); STRAW.use_nodes = True
_sn = STRAW.node_tree.nodes; _sl = STRAW.node_tree.links.new; _sb = _sn["Principled BSDF"]
_stc = _sn.new("ShaderNodeTexCoord"); _smp = _sn.new("ShaderNodeMapping"); _smp.inputs["Scale"].default_value = (2, 40, 2)
_sl(_stc.outputs["Object"], _smp.inputs["Vector"])
_snz = _sn.new("ShaderNodeTexNoise"); _snz.inputs["Scale"].default_value = 30; _snz.inputs["Detail"].default_value = 8; _sl(_smp.outputs["Vector"], _snz.inputs["Vector"])
_sr = _sn.new("ShaderNodeValToRGB"); _sr.color_ramp.elements[0].color = (0.28, 0.2, 0.08, 1); _sr.color_ramp.elements[1].color = (0.72, 0.58, 0.3, 1)
_sl(_snz.outputs["Fac"], _sr.inputs["Fac"]); _sl(_sr.outputs["Color"], _sb.inputs["Base Color"]); _sb.inputs["Roughness"].default_value = 0.9
_sbp = _sn.new("ShaderNodeBump"); _sbp.inputs["Strength"].default_value = 0.8; _sl(_snz.outputs["Fac"], _sbp.inputs["Height"]); _sl(_sbp.outputs["Normal"], _sb.inputs["Normal"])
TWINE = plain("twine", (0.35, 0.28, 0.16), rough=0.9)
TAPE = bpy.data.materials.new("barrier tape"); TAPE.use_nodes = True
_tn = TAPE.node_tree.nodes; _tl = TAPE.node_tree.links.new; _tb = _tn["Principled BSDF"]
_ttc = _tn.new("ShaderNodeTexCoord"); _tw = _tn.new("ShaderNodeTexWave"); _tw.bands_direction = "X"; _tw.wave_profile = "SAW"; _tw.inputs["Scale"].default_value = 12
_tl(_ttc.outputs["UV"], _tw.inputs["Vector"])
_tc = _tn.new("ShaderNodeMath"); _tc.operation = "GREATER_THAN"; _tc.inputs[1].default_value = 0.5; _tl(_tw.outputs["Fac"], _tc.inputs[0])
_tm = _tn.new("ShaderNodeMix"); _tm.data_type = "RGBA"; _tm.inputs[6].default_value = (0.75, 0.03, 0.02, 1); _tm.inputs[7].default_value = (0.85, 0.84, 0.8, 1)
_tl(_tc.outputs[0], _tm.inputs["Factor"]); _tl(_tm.outputs[2], _tb.inputs["Base Color"]); _tb.inputs["Roughness"].default_value = 0.35

# ── the ground: the field, the oval of gravel, the line ───────────────────
field = box("field", -3000, 3000, -50, 3000, -0.6, -0.04, GRASS)
def ring(name, inner, outer, z, mat, n=720):
    bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    A, ZC, RZ = T["A"], T["ZC"], T["RZ"]
    rows = []
    for k in range(n):
        th = k / n * math.tau
        cx, cz = A * math.cos(th), ZC + RZ * math.sin(th)
        nx, nz = math.cos(th) / A, math.sin(th) / RZ; l = math.hypot(nx, nz); nx, nz = nx / l, nz / l
        rows.append((bm.verts.new(tuple(W(cx + inner * nx, 0, cz + inner * nz) + Vector((0, 0, z)))),
                     bm.verts.new(tuple(W(cx + outer * nx, 0, cz + outer * nz) + Vector((0, 0, z))))))
    for k in range(n):
        a, b = rows[k], rows[(k + 1) % n]
        f = bm.faces.new((a[0], b[0], b[1], a[1]))
    bm.normal_update()
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); me.materials.append(mat)
    return o
TW = T["TW"]
ring("verge", -TW - 0.08, TW + 0.08, 0.0, MUD)
ring("gravel", -TW, TW, 0.02, GRAVEL)
# (the chequered line across the track where it runs closest to us)
CHEQ = []
fz0, fz1 = T["ZC"] - T["RZ"] - TW, T["ZC"] - T["RZ"] + TW
j = 0; zz = fz0
while zz < fz1 - 1e-6:
    z2 = min(fz1, zz + 0.8 / U)
    for i, (xa, xb) in enumerate(((-0.8, 0.0), (0.0, 0.8))):
        o = box("chequer", xa, xb, zz * U, z2 * U, 0.025, 0.032, WHITE_PAINT if (i + j) % 2 else BLACK_PAINT)
    zz = z2; j += 1
# (wheel ruts worn darker along the racing line, a few puddles)
PUDDLE = plain("puddle", (0.02, 0.022, 0.025), rough=0.04, coat=0.6)
for (ux, uz, r) in ((-1.4, 6.5, 2.4), (1.9, 6.7, 1.6), (-3.6, 7.6, 2.0)):
    pd = cylinder("puddle", ux * U, uz * U, 0.026, 0.03, r, PUDDLE, verts=24); pd.scale = (1.6, 0.7, 1)

# ── the forest round it ────────────────────────────────────────────────────
TREES = [import_model(n, height=1.0, at=(0, -2000, -100)) for n in ("pine_tree_01", "fir_tree_01")]
def tree_at(x, y, h, rot):
    src = RNG.choice(TREES)
    clone(src, (x, y, 0), rot=rot, k=h)
for zr, n, spread in ((S["forestZ"][0], 70, 1.0), (S["forestZ"][1], 80, 1.6), (S["forestZ"][2], 90, 2.8)):
    for k in range(n):
        x = RNG.uniform(-40, 40) * spread
        z = zr + RNG.uniform(-1.5, 2.5) * spread
        tree_at(x * U, z * U, RNG.uniform(16, 27) * (1 + 0.15 * spread), RNG.uniform(0, math.tau))
for k in range(26):                                          # (a few nearer, either side, out of the way)
    side = RNG.choice((-1, 1)); x = side * RNG.uniform(9, 22); z = RNG.uniform(10, 18)
    tree_at(x * U, z * U, RNG.uniform(14, 22), RNG.uniform(0, math.tau))

# ── the masts and their floodlights ───────────────────────────────────────
SPOTS = []
for m_ in S["masts"]:
    base = W(m_["x"], 0, m_["z"]); top = base.z + m_["h"] * U
    cylinder("mast", base.x, base.y, 0, top, 0.22 if m_["big"] else 0.18, STEEL, verts=16, r2=0.14)
    aim = W(m_["aim"][0], 0, m_["aim"][1]); d = (aim - Vector((base.x, base.y, top))).normalized()
    cols, rows_ = (3, 2) if m_["big"] else (2, 2)
    frame_ = box("lamp frame", -cols * 0.45, cols * 0.45, -0.06, 0.06, -rows_ * 0.36, rows_ * 0.36, STEEL)
    frame_.location = (base.x, base.y, top + 0.5); frame_.rotation_euler = d.to_track_quat("Y", "Z").to_euler()
    for i in range(cols):
        for j in range(rows_):
            ox, oz = (i - (cols - 1) / 2) * 0.88, (j - (rows_ - 1) / 2) * 0.7
            h_ = box("lamp", -0.36, 0.36, -0.3, 0.05, -0.28, 0.28, HOUSING); h_.parent = frame_; h_.location = (ox, 0.25, oz)
            g_ = box("lamp glass", -0.32, 0.32, 0.05, 0.07, -0.24, 0.24, LAMP_ON); g_.parent = frame_; g_.location = (ox, 0.25, oz)
    # (a ladder of rungs up it)
    for k in range(int(top / 0.6)):
        cylinder("rung", base.x + 0.28, base.y, k * 0.6, k * 0.6 + 0.03, 0.02, STEEL, verts=6)
LAMPS = []
for l in S["lamps"]:
    at = W(l["x"], l["h"], l["z"]); d = Vector((l["ax"], l["az"], l["ay"])).normalized()
    sp = lamp("floodlight", "SPOT", tuple(at), energy=l["I"] * float(arg("--flood", "4500")), colour=(1.0, 0.84, 0.64), size=1.2,
              spot=math.radians(min(170, 2 * l["outer"])))
    sp.data.spot_blend = max(0.05, min(1.0, (l["outer"] - l["inner"]) / l["outer"]))
    sp.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    LAMPS.append(sp)

# ── the finish control: the hut, the board, the photocells ────────────────
hut = S["hut"]
hx0, hx1, hz0, hz1, hh = hut["x"] - hut["w"] / 2, hut["x"] + hut["w"] / 2, hut["z"] - hut["d"] / 2, hut["z"] + hut["d"] / 2, hut["h"]
box("hut", hx0 * U, hx1 * U, hz0 * U, hz1 * U, 0, hh * U, HUT_WALL)
rf = box("hut roof", hx0 * U - 0.25, hx1 * U + 0.25, hz0 * U - 0.3, hz1 * U + 0.2, hh * U, hh * U + 0.12, ROOF_FELT); rf.rotation_euler = (math.radians(-5), 0, 0)
box("hut window", (hut["x"] - 0.04) * U - 0.55, (hut["x"] - 0.04) * U + 0.55, hz0 * U - 0.03, hz0 * U, 1.05, 1.85, WINDOW)
for (a, b_, c, e) in (((hut["x"] - 0.04) * U - 0.6, (hut["x"] - 0.04) * U + 0.6, 0.98, 1.05), ((hut["x"] - 0.04) * U - 0.6, (hut["x"] - 0.04) * U + 0.6, 1.85, 1.92)):
    box("window frame", a, b_, hz0 * U - 0.06, hz0 * U, c, e, WOOD)
box("hut door", hx1 * U - 0.02, hx1 * U + 0.03, hz0 * U + 0.3, hz0 * U + 1.15, 0, 2.0, WOOD)
hut_l = lamp("hut window light", "AREA", tuple(W(hut["x"] - 0.04, 0, hz0) + Vector((0, -0.6, 1.4))), energy=40, colour=(1.0, 0.7, 0.4), size=1.0)
hut_l.rotation_euler = (math.radians(90), 0, 0)
sg = S["sign"]; sb = W(sg["x"], 0, sg["z"])
cylinder("sign post", sb.x, sb.y, 0, 2.5, 0.05, BLACK_PAINT, verts=10)
box("sign board", sb.x - 0.55, sb.x + 0.55, sb.y - 0.03, sb.y, 2.3, 3.4, WHITE_PAINT)
box("sign red", sb.x - 0.5, sb.x + 0.5, sb.y - 0.05, sb.y - 0.03, 2.35, 3.35, RED_BOARD)
for i in range(4):
    for j in range(3):
        box("sign chequer", sb.x - 0.25 + i * 0.13, sb.x - 0.12 + i * 0.13, sb.y - 0.06, sb.y - 0.05, 2.62 + j * 0.13, 2.75 + j * 0.13, WHITE_PAINT if (i + j) % 2 else BLACK_PAINT)
cylinder("sign flag pole", sb.x - 0.27, sb.y - 0.06, 2.5, 3.2, 0.012, WHITE_PAINT, verts=6)
FRONT = []
def photocell(c, near):
    at = W(c["x"], 0, c["z"]); parts = []
    for k in range(3):
        a = k * math.tau / 3
        leg = cylinder("tripod leg", 0, 0, 0, 1.05, 0.015, BLACK_PAINT, verts=6)
        leg.location = (at.x + math.cos(a) * 0.25, at.y + math.sin(a) * 0.25, 0); leg.rotation_euler = (math.sin(a) * 0.24, -math.cos(a) * 0.24, 0)
        parts.append(leg)
    parts.append(box("photocell", at.x - 0.12, at.x + 0.12, at.y - 0.08, at.y + 0.08, 1.0, 1.2, plain("cell case", (0.6, 0.55, 0.12), rough=0.4)))
    parts.append(sphere("photocell eye", (at.x, at.y + (0.09 if near else -0.09), 1.1), 0.035, CELL_RED))
    return parts
photocell(S["cellFar"], False)
FRONT += photocell(S["cellNear"], True)

# ── the tape the crowd stands behind ──────────────────────────────────────
for run in S["tapeRuns"]:
    pts = [W(p["x"], 0, p["z"]) for p in run]
    for p in pts:
        stake = box("tape stake", p.x - 0.03, p.x + 0.03, p.y - 0.03, p.y + 0.03, 0, 1.1, WOOD)
    for a, b_ in zip(pts, pts[1:]):
        for hgt in (1.0,):
            d = b_ - a; n_ = 10
            bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); row = []
            for k in range(n_ + 1):
                t = k / n_; p = a + d * t; z = hgt - 0.08 * 4 * t * (1 - t)
                row.append((bm.verts.new((p.x, p.y, z + 0.035)), bm.verts.new((p.x, p.y, z - 0.035)), t))
            for k in range(n_):
                f = bm.faces.new((row[k][0], row[k + 1][0], row[k + 1][1], row[k][1]))
                for lp, (uu, vv) in zip(f.loops, ((row[k][2], 1), (row[k + 1][2], 1), (row[k + 1][2], 0), (row[k][2], 0))): lp[uvl].uv = (uu * d.length / 0.5 * 0.05, vv)
            me = bpy.data.meshes.new("tape"); bm.to_mesh(me); bm.free()
            link(bpy.data.objects.new("tape", me)).data.materials.append(TAPE)

# ── the bales along our side ──────────────────────────────────────────────
for b in S["bales"]:
    at = W(b["x"], 0, b["z"]); ang = math.atan2(b["tz"], b["tx"])
    rr = random.Random(b["seed"])
    o = box("bale", -0.55, 0.55, -0.24, 0.24, 0, 0.42, STRAW); bevel(o, 0.06, 2)
    o.location = at; o.rotation_euler = (rr.uniform(-0.03, 0.03), rr.uniform(-0.03, 0.03), ang + rr.uniform(-0.08, 0.08))
    FRONT.append(o)
    for s_ in (-0.25, 0.25):
        tw = box("twine", s_ - 0.01, s_ + 0.01, -0.245, 0.245, -0.002, 0.425, TWINE); tw.parent = o; FRONT.append(tw)

# ── across the oval: the tent and its bulbs, the vans ─────────────────────
tn = W(S["tent"]["x"], 0, S["tent"]["z"])
CANVAS = plain("tent canvas", (0.75, 0.74, 0.7), rough=0.8, transmission=0.0)
for (sx, sy) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
    cylinder("tent pole", tn.x + sx * 2.0, tn.y + sy * 2.0, 0, 2.3, 0.03, STEEL, verts=6)
me = bpy.data.meshes.new("tent roof"); bm = bmesh.new()
vs = [bm.verts.new((tn.x + sx * 2.1, tn.y + sy * 2.1, 2.3)) for (sx, sy) in ((-1, -1), (1, -1), (1, 1), (-1, 1))]; apex = bm.verts.new((tn.x, tn.y, 3.4))
for k in range(4): bm.faces.new((vs[k], vs[(k + 1) % 4], apex))
bm.to_mesh(me); bm.free(); link(bpy.data.objects.new("tent roof", me)).data.materials.append(CANVAS)
box("tent back", tn.x - 2.0, tn.x + 2.0, tn.y + 1.98, tn.y + 2.02, 0, 2.3, CANVAS)
BULB = plain("festoon bulb", (1.0, 0.86, 0.6), emit=(1.0, 0.8, 0.5), strength=float(arg("--bulbs", "40")))
for i in range(9):
    u = i / 8; x = tn.x - 4.2 + 8.4 * u; z = 2.45 - 0.25 * math.sin(math.pi * ((u * 4) % 1))
    sphere("bulb", (x, tn.y - 2.3, z), 0.06, BULB)
fest_l = lamp("festoon glow", "POINT", (tn.x, tn.y - 2.0, 2.3), energy=150, colour=(1.0, 0.75, 0.45), size=1.5)
VAN = [plain("van white", (0.6, 0.6, 0.58), rough=0.4, coat=0.3), plain("van blue", (0.04, 0.08, 0.2), rough=0.4, coat=0.3)]
for k, v in enumerate(S["vans"]):
    at = W(v["x"], 0, v["z"])
    body = box("van", at.x - 2.6, at.x + 2.6, at.y - 1.0, at.y + 1.0, 0.35, 2.4, VAN[k % 2]); bevel(body, 0.12, 3)
    box("van glass", at.x + 1.6, at.x + 2.62, at.y - 0.98, at.y + 0.98, 1.4, 2.1, plain("van glass", (0.02, 0.025, 0.03), rough=0.05))
    for wx_ in (-1.7, 1.6):
        for wz_ in (-1.0, 1.0):
            t_ = cylinder("van wheel", 0, 0, -0.12, 0.12, 0.36, plain("tyre", (0.02, 0.02, 0.02), rough=0.8), verts=16)
            t_.rotation_euler = (math.pi / 2, 0, 0); t_.location = (at.x + wx_, at.y + wz_, 0.36)

# ── the sky: night, its stars, the moon upper left ────────────────────────
world = bpy.data.worlds.new("night"); scene.world = world; world.use_nodes = True
WN = world.node_tree.nodes; WL = world.node_tree.links.new
wc = WN.new("ShaderNodeTexCoord"); ws = WN.new("ShaderNodeSeparateXYZ"); WL(wc.outputs["Generated"], ws.inputs[0])
grad = WN.new("ShaderNodeValToRGB"); g = grad.color_ramp
g.elements[0].position = 0.0; g.elements[0].color = (0.035, 0.03, 0.03, 1)
g.elements[1].position = 0.35; g.elements[1].color = (0.0025, 0.0035, 0.009, 1)
e_ = g.elements.new(0.02); e_.color = (0.03, 0.03, 0.04, 1)
WL(ws.outputs["Z"], grad.inputs["Fac"])
stars = WN.new("ShaderNodeTexVoronoi"); stars.inputs["Scale"].default_value = 420; WL(wc.outputs["Generated"], stars.inputs["Vector"])
sk = WN.new("ShaderNodeMapRange"); sk.inputs["From Min"].default_value = 0.0; sk.inputs["From Max"].default_value = 0.035
sk.inputs["To Min"].default_value = 1.0; sk.inputs["To Max"].default_value = 0.0; WL(stars.outputs["Distance"], sk.inputs["Value"])
few = WN.new("ShaderNodeMath"); few.operation = "GREATER_THAN"; few.inputs[1].default_value = 0.8; WL(stars.outputs["Color"], few.inputs[0])
up = WN.new("ShaderNodeMath"); up.operation = "GREATER_THAN"; up.inputs[1].default_value = 0.08; WL(ws.outputs["Z"], up.inputs[0])
st1 = WN.new("ShaderNodeMath"); st1.operation = "MULTIPLY"; WL(sk.outputs["Result"], st1.inputs[0]); WL(few.outputs[0], st1.inputs[1])
st2 = WN.new("ShaderNodeMath"); st2.operation = "MULTIPLY"; WL(st1.outputs[0], st2.inputs[0]); WL(up.outputs[0], st2.inputs[1])
st3 = WN.new("ShaderNodeMath"); st3.operation = "MULTIPLY"; st3.inputs[1].default_value = 0.35; WL(st2.outputs[0], st3.inputs[0])
add = WN.new("ShaderNodeMix"); add.data_type = "RGBA"; add.blend_type = "ADD"; add.inputs["Factor"].default_value = 1.0
WL(grad.outputs["Color"], add.inputs[6]); WL(st3.outputs[0], add.inputs[7])
WL(add.outputs[2], WN["Background"].inputs["Color"])
mp = (S["moon"]["x"] - RW / 2) / RW, (S["horizonY"] - S["moon"]["y"]) / RW
moon_dir = Vector((mp[0], 1.0, mp[1])).normalized()
moon_r = S["moon"]["r"] / RW * 5000
MOON = plain("moon", (0.85, 0.88, 0.95), emit=(0.85, 0.9, 1.0), strength=2.2)
mo = cylinder("moon", 0, 0, -1, 1, moon_r, MOON, verts=48); mo.location = cam.location + moon_dir * 5000
mo.rotation_euler = (-moon_dir).to_track_quat("Z", "Y").to_euler()
moonlight = lamp("moonlight", "SUN", (0, 0, 0), energy=float(arg("--moonlight", "0.35")), colour=(0.55, 0.66, 1.0), angle=math.radians(1))
moonlight.rotation_euler = (-moon_dir + Vector((0, 0, -0.6))).normalized().to_track_quat("-Z", "Y").to_euler()

# ── the air: a little haze over the stage, for the floodlights' beams ─────
haze = box("haze", -900, 900, -5, 900, 0.0, 120, None); haze.data.materials.clear()
hm = bpy.data.materials.new("haze"); hm.use_nodes = True; HN = hm.node_tree.nodes; HN.remove(HN["Principled BSDF"])
hv = HN.new("ShaderNodeVolumePrincipled"); hv.inputs["Color"].default_value = (0.8, 0.78, 0.75, 1); hv.inputs["Density"].default_value = float(arg("--haze", "0.0003"))
hm.node_tree.links.new(hv.outputs["Volume"], HN["Material Output"].inputs["Volume"]); haze.data.materials.append(hm)

# ── the people (rally_people.py builds them; placed here to be lit as they stand) ──
CROWD, MARSHAL = [], None
if "people" in ONLY:
    import rally_people as people
    CROWD, MARSHAL = people.build(S, W, Wm, RNG)

# ── render ─────────────────────────────────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "0.0")), glare=True)
scene.cycles.volume_step_rate = 2.0; scene.cycles.volume_bounces = 1
scene.cycles.adaptive_threshold = 0.01
scene.view_settings.look = "AgX - Medium High Contrast"
def lights(on):
    for sp in LAMPS: sp.hide_render = not on
    LAMP_ON.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = float(arg("--lampglow", "60")) if on else 0.0
    haze.hide_render = not on
def show(objs, yes):
    for o in objs:
        o.hide_render = not yes
        for ch in o.children_recursive: ch.hide_render = not yes
people_objs = [o for p in CROWD for o in (p["still"] + p["cheer"])] + ([o for o in MARSHAL["body"] + [x for f in MARSHAL["arms"] for x in f]] if MARSHAL else [])
show(people_objs, False)
if "plates" in ONLY:
    for state in ("lit", "dark"):
        lights(state == "lit")
        render(scene, os.path.join(OUT, ("preview-" if PREVIEW else "") + f"{state}.png"))
if "front" in ONLY:
    scene.render.film_transparent = True; scene.render.image_settings.color_mode = "RGBA"
    every = [o for o in bpy.data.objects if o.type in ("MESH", "CURVE", "FONT") and o not in FRONT and o.name not in ("haze",)]
    for o in every: o.is_holdout = True
    for state in ("lit", "dark"):
        lights(state == "lit"); haze.hide_render = True
        render(scene, os.path.join(OUT, f"front-{state}.png"))
    for o in every: o.is_holdout = False
    scene.render.film_transparent = False; scene.render.image_settings.color_mode = "RGB"
if "people" in ONLY and CROWD:
    people.render_all(scene, CROWD, MARSHAL, show, lights, haze, to_ref, PEOPLE_OUT, WIDTH, HEIGHT)
print("RALLY_STAGE_DONE")
