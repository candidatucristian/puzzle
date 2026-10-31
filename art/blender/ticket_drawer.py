# The Ticket Drawer (levels/station), close to: Room IV's chest of drawers,
# its top drawer pulled out, looked down into by candlelight held over the
# left shoulder. The drawer is the room's own (room_counting.py: a mahogany
# front, two brass knobs, oak sides, back and bottom, 58 cm across and 20
# deep), pulled most of the way out of the chest; behind, under the chest's
# top, the drawer goes on into the dark.
#
# Its back two-thirds are what the room shows of it: old card tickets by the
# hundred, standing on their edges in rows between low oak dividers, leaning
# as they settled. In front of them, laid out in two rows on the drawer's
# bottom, the eight of the puzzle (src/levels/station/rows.js), each with its
# own face (ticket_faces.mjs): card a little curled, the type pressed into it,
# the stamp across its foot. Beside them what a clerk keeps in such a drawer:
# a tin ink pad open, the rubber stamp, a pencil worn short, an old rubber
# band, two pennies.
#
# Rendered: the plate; and where it all fell in the picture
# (ticketDrawer.json: what must stay on screen, the candle's light).
#
#   node art/blender/ticket_faces.mjs
#   blender -b --factory-startup -P art/blender/ticket_drawer.py -- [--samples 700] [--width 2560] [--preview 1]

import bpy, bmesh, math, os, sys, json, random
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *

OUT = os.path.join(ROOT, ".artifacts/ticket-drawer")
os.makedirs(OUT, exist_ok=True)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")
PREVIEW = arg("--preview", "") == "1"
SAMPLES = int(arg("--samples", "48" if PREVIEW else "700"))
WIDTH = int(arg("--width", "1280" if PREVIEW else "2560"))
RNG = random.Random(1961)
INFO = json.load(open(os.path.join(DRAWN, "tickets.json")))
TW, TH = INFO["mm"][0] / 10, INFO["mm"][1] / 10      # a ticket, cm (57 × 30 mm)
CARD = 0.065                                         # its thickness

# ── the drawer, in its own cm: x across, y up from the inside of its bottom,
# d away from the inside of its front; as room_counting.py has it ──────────
IN = dict(x0=-26.8, x1=26.8, d0=0.0, d1=40.8, top=16.2)
FRONT = dict(x0=-29, x1=29, y0=-1.8, y1=18.2, d0=-1.2, d1=0.0)
PULL = 27.0                                      # how far it is out of the chest
CHEST = dict(x0=-32, x1=32, d0=PULL, d1=PULL + 44, y0=-59.8, top=22.2)
TRAY = 18.5                                      # where the standing rows begin
ROW, DIV = 6.3, 0.6                              # each row of them, each divider

G = (-5.5, 0.0, 11.5)                            # the middle of the eight
# (from a little left of them: the drawer's left side comes into the picture,
# its front along the foot of it)
EYE = (float(arg("--ex", "-9.5")), float(arg("--ey", "52")), float(arg("--ed", "-4")))
LOOK = (EYE[0], 0.0, float(arg("--ld", str(G[2] + 1.2))))
scene, HEIGHT = stage(WIDTH, eye=EYE, look=LOOK, lens=float(arg("--lens", "48")))

# ── materials ──────────────────────────────────────────────────────────────
MAHOGANY = scan("mahogany", "rosewood_veneer1", size=0.5, tint=(0.75, 0.48, 0.34), bright=0.5, sat=0.9, rough=(0.3, 0.5), bump=0.2, coat=0.2, upright=True, edges=0.25)
MAHOGANY_X = scan("mahogany across", "rosewood_veneer1", size=0.5, tint=(0.75, 0.48, 0.34), bright=0.48, sat=0.9, rough=(0.3, 0.5), bump=0.2, coat=0.2, edges=0.25)
# (inside, the oak was never polished: dry, paler, dusty, marked)
OAK_SIDE = scan("drawer oak", "dark_wood", size=0.55, tint=(0.9, 0.75, 0.58), bright=0.74, sat=0.5, rough=(0.55, 0.8), bump=0.35, edges=0.3, dust=0.25)
OAK_BOTTOM = scan("drawer bottom", "dark_wood", size=0.55, tint=(0.9, 0.76, 0.6), bright=0.78, sat=0.42, rough=(0.6, 0.85), bump=0.3, stains=0.25, dust=0.3, rot=(0, 0, math.pi / 2))
OAK_DIV = scan("divider oak", "dark_wood", size=0.4, tint=(0.8, 0.64, 0.48), bright=0.55, sat=0.6, rough=(0.5, 0.75), bump=0.3, edges=0.35)
FLOOR = scan("stone flags", "worn_tile_floor", size=1.4, tint=(0.9, 0.86, 0.8), bright=0.6, sat=0.5, rough=(0.4, 0.8), bump=0.6)
PLASTER = scan("lime plaster", "white_plaster_rough_01", size=2.4, tint=(0.95, 0.88, 0.76), bright=0.7, sat=0.45, rough=(0.8, 0.95), bump=0.5)
BRASS = aged_metal("brass", (0.58, 0.41, 0.18), (0.08, 0.06, 0.03), rough=(0.28, 0.55), scale=30, tarnish=0.55)
BRONZE = aged_metal("penny bronze", (0.5, 0.27, 0.15), (0.12, 0.06, 0.035), rough=(0.35, 0.65), scale=60, tarnish=0.7)
TIN = aged_metal("japanned tin", (0.32, 0.3, 0.27), (0.025, 0.022, 0.02), rough=(0.3, 0.6), scale=40, tarnish=0.85)

def card_material(name, image, press=None, ink_rough=0.5):
    """card printed: the image by its UVs, a fibre in it, the type pressed in
    (and a little sheen on the ink) where `press` is dark"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    face = N.new("ShaderNodeTexImage"); face.image = bpy.data.images.load(image, check_existing=True); face.interpolation = "Cubic"
    L(tc.outputs["UV"], face.inputs["Vector"])
    # the fibre: fine and long one way, as card is made
    fm = N.new("ShaderNodeMapping"); fm.inputs["Scale"].default_value = (1.0, 3.5, 1.0)
    L(tc.outputs["Object"], fm.inputs["Vector"])
    fz = N.new("ShaderNodeTexNoise"); fz.inputs["Scale"].default_value = 900; fz.inputs["Detail"].default_value = 8; fz.inputs["Roughness"].default_value = 0.7
    L(fm.outputs["Vector"], fz.inputs["Vector"])
    fr = N.new("ShaderNodeMapRange"); fr.inputs["To Min"].default_value = 0.9; fr.inputs["To Max"].default_value = 1.04
    L(fz.outputs["Fac"], fr.inputs["Value"])
    mul = N.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
    L(face.outputs["Color"], mul.inputs[6]); L(fr.outputs["Result"], mul.inputs[7])
    L(mul.outputs[2], b.inputs["Base Color"])
    b.inputs["Specular IOR Level"].default_value = 0.32; b.inputs["Sheen Weight"].default_value = 0.15; b.inputs["Sheen Roughness"].default_value = 0.6
    fb = N.new("ShaderNodeBump"); fb.inputs["Strength"].default_value = 0.12; fb.inputs["Distance"].default_value = 0.00005
    L(fz.outputs["Fac"], fb.inputs["Height"])
    if press:
        pr = N.new("ShaderNodeTexImage"); pr.image = bpy.data.images.load(press, check_existing=True); pr.image.colorspace_settings.name = "Non-Color"
        L(tc.outputs["UV"], pr.inputs["Vector"])
        pb = N.new("ShaderNodeBump"); pb.inputs["Strength"].default_value = 0.55; pb.inputs["Distance"].default_value = 0.00012
        L(pr.outputs["Color"], pb.inputs["Height"]); L(fb.outputs["Normal"], pb.inputs["Normal"])
        L(pb.outputs["Normal"], b.inputs["Normal"])
        rr = N.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = ink_rough; rr.inputs["To Max"].default_value = 0.82
        L(pr.outputs["Color"], rr.inputs["Value"]); L(rr.outputs["Result"], b.inputs["Roughness"])
    else:
        L(fb.outputs["Normal"], b.inputs["Normal"]); b.inputs["Roughness"].default_value = 0.85
    return m
FACES = card_material("ticket faces", os.path.join(DRAWN, "tickets-faces.png"), os.path.join(DRAWN, "tickets-press.png"))
BACKS = card_material("ticket backs", os.path.join(DRAWN, "tickets-backs.png"))

# ── the chest it comes out of, the floor and the wall ──────────────────────
box_cm("floor", -200, 200, -66, -63.8, -150, CHEST["d1"] + 2, FLOOR)
box_cm("wall", -200, 200, -63.8, 140, CHEST["d1"], CHEST["d1"] + 20, PLASTER)
cx0, cx1, cd0, cd1 = CHEST["x0"], CHEST["x1"], CHEST["d0"], CHEST["d1"]
box_cm("chest top", cx0 - 2, cx1 + 2, CHEST["top"], CHEST["top"] + 2, cd0 - 2, cd1, MAHOGANY_X, 0.6)
box_cm("chest rail", cx0, cx1, FRONT["y1"] + 0.3, CHEST["top"], cd0, cd0 + 2, MAHOGANY_X, 0.2)
box_cm("chest below", cx0, cx1, CHEST["y0"], FRONT["y0"] - 0.3, cd0, cd1, MAHOGANY, 0.2)
for (a, b_) in ((cx0, FRONT["x0"] - 0.3), (FRONT["x1"] + 0.3, cx1)):
    box_cm("chest side", a, b_, FRONT["y0"] - 0.3, FRONT["y1"] + 0.3, cd0, cd1, MAHOGANY, 0.2)
box_cm("chest back", cx0, cx1, CHEST["y0"], CHEST["top"], cd1 - 1, cd1, OAK_SIDE)
# (its two lower drawers, shut, their knobs)
def knob(x, y, d):
    k = lathe("knob", [(0, 0), (0.009, 0), (0.012, 0.01), (0.008, 0.016), (0, 0.017)], BRASS, at=tuple(P(x, y, d)), steps=24)
    k.rotation_euler = (math.pi / 2, 0, 0); return k
for (y0, y1) in ((-53.8, -29.8), (-27.8, -3.8)):
    box_cm("drawer front", FRONT["x0"], FRONT["x1"], y0, y1, cd0 - 1.2, cd0, MAHOGANY, 0.5)
    for k in (0.24, 0.76): knob(FRONT["x0"] + (FRONT["x1"] - FRONT["x0"]) * k, (y0 + y1) / 2, cd0 - 1.2)

# ── the drawer ─────────────────────────────────────────────────────────────
f = FRONT
box_cm("drawer front", f["x0"], f["x1"], f["y0"], f["y1"], f["d0"], f["d1"], MAHOGANY, 0.45)
for k in (0.24, 0.76): knob(f["x0"] + (f["x1"] - f["x0"]) * k, (f["y0"] + f["y1"]) / 2, f["d0"])
box_cm("drawer bottom", IN["x0"] - 1.2, IN["x1"] + 1.2, -0.8, 0.0, 0.0, IN["d1"] + 1.2, OAK_BOTTOM)
for (a, b_) in ((IN["x0"] - 1.2, IN["x0"]), (IN["x1"], IN["x1"] + 1.2)):
    box_cm("drawer side", a, b_, -0.8, IN["top"], 0.0, IN["d1"] + 1.2, OAK_SIDE, 0.15)
box_cm("drawer back", IN["x0"], IN["x1"], -0.8, IN["top"] - 1.0, IN["d1"], IN["d1"] + 1.2, OAK_SIDE, 0.15)
# (the dovetails where the sides meet the front: pale end grain, seen from above)
for x in (IN["x0"] - 1.2, IN["x1"]):
    for k in range(4):
        box_cm("dovetail", x, x + 1.2, IN["top"] - 0.02, IN["top"] + 0.01, -0.05, 0.0, OAK_DIV)

# the dividers, and the rows of tickets standing between them
rows = []
d = TRAY
while d + DIV + ROW <= IN["d1"] + 0.01:
    box_cm("divider", IN["x0"], IN["x1"], 0.0, 2.2, d, d + DIV, OAK_DIV, 0.12)
    rows.append((d + DIV, d + DIV + ROW)); d += DIV + ROW
box_cm("divider", IN["x0"], IN["x1"], 0.0, 2.2, d, d + DIV, OAK_DIV, 0.12)

def standing():
    """every row full of tickets on their edges, leaning in runs as they
    settled; now and then one pushed down or left standing proud"""
    me = bpy.data.meshes.new("tickets standing"); bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
    def one(x, dmid, lean, turn, lift, cell):
        cu, cv = cell % 2, cell // 2
        u0, u1, v0, v1 = cu / 2, (cu + 1) / 2, 1 - (cv + 1) / 2, 1 - cv / 2
        R = Matrix.Rotation(turn, 3, "Z") @ Matrix.Rotation(lean, 3, "Y")
        at = P(x, lift, dmid)
        V = {(sx, sd, sy): bm.verts.new(at + R @ Vector((M(sx * CARD / 2), M(sd * TW / 2), M(sy * TH)))) for sx in (-1, 1) for sd in (-1, 1) for sy in (0, 1)}
        edge = [(u0 + 0.001, v0), (u0 + 0.004, v0), (u0 + 0.004, v1), (u0 + 0.001, v1)]
        flat = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
        for keys, uvs in (([(1, -1, 0), (1, 1, 0), (1, 1, 1), (1, -1, 1)], flat), ([(-1, 1, 0), (-1, -1, 0), (-1, -1, 1), (-1, 1, 1)], flat),
                          ([(-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)], edge), ([(-1, -1, 0), (-1, 1, 0), (1, 1, 0), (1, -1, 0)], edge),
                          ([(-1, -1, 0), (1, -1, 0), (1, -1, 1), (-1, -1, 1)], edge), ([(1, 1, 0), (-1, 1, 0), (-1, 1, 1), (1, 1, 1)], edge)):
            fc = bm.faces.new([V[k] for k in keys])
            for lp, uv in zip(fc.loops, uvs): lp[uvl].uv = uv
    for (r0, r1) in rows:
        dmid = (r0 + r1) / 2
        x, prev = IN["x0"] + 0.05, 0.0
        while x < IN["x1"] - 0.3:
            # a run of them leaning together (clear of the run before, or the side)
            lean = RNG.choice([0, 0, 0.02, -0.02, 0.06, -0.06, 0.15, -0.15, 0.28, -0.3])
            x += max(0.0, TH * (math.sin(prev) - math.sin(lean)))
            prev = lean
            for _ in range(RNG.randint(5, 45)):
                a = lean + RNG.gauss(0, 0.015)
                step = CARD / max(0.3, math.cos(a)) + RNG.uniform(0.0, 0.012)
                if x + step + abs(math.sin(a)) * TH > IN["x1"] - 0.05: x = IN["x1"]; break
                lift = RNG.uniform(-0.04, 0.02)
                if RNG.random() < 0.015: lift += RNG.uniform(0.3, 1.1)
                one(x + step / 2, dmid + RNG.gauss(0, 0.1), a, RNG.gauss(0, 0.012), lift, RNG.randrange(4))
                x += step
            x += RNG.uniform(0.0, 0.25) if lean else RNG.uniform(0.0, 0.05)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("tickets standing", me)); o.data.materials.append(BACKS)
    return o
standing()

# ── the eight, laid out in two rows in front of them ───────────────────────
def lying(i, cx, cd, turn, curl, twist, fold=None):
    """ticket i of the puzzle, face up at (cx, cd), turned `turn` about the
    upright: its length bowed up `curl` cm at the ends, `twist` across; and
    `fold` ((corner s, t), size cm, steepness): a corner dog-eared up"""
    c, r = INFO["tickets"][i]["cell"]; cols, nrows = INFO["cols"], INFO["rows"]
    u0, u1, v0, v1 = c / cols, (c + 1) / cols, 1 - (r + 1) / nrows, 1 - r / nrows
    nx, ny = 40, 20
    me = bpy.data.meshes.new(f"ticket {i}"); bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
    grid = []
    for j in range(ny + 1):
        line = []
        for k in range(nx + 1):
            s, t = k / nx, j / ny
            lift = curl * ((s - 0.5) * 2) ** 2 + twist * ((s - 0.5) * (t - 0.5) * 4 + 1)
            if fold:
                (fs, ft), size, steep = fold
                lift += max(0.0, size - abs(s - fs) * TW - abs(t - ft) * TH) * steep
            line.append((bm.verts.new((M((s - 0.5) * TW), M((t - 0.5) * TH), M(lift))), s, t))
        grid.append(line)
    for j in range(ny):
        for k in range(nx):
            q = [grid[j][k], grid[j][k + 1], grid[j + 1][k + 1], grid[j + 1][k]]
            fc = bm.faces.new([v for v, _, _ in q])
            for lp, (_, s, t) in zip(fc.loops, q): lp[uvl].uv = (u0 + s * (u1 - u0), v0 + t * (v1 - v0))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(f"ticket {i}", me)); o.data.materials.append(FACES)
    for p in o.data.polygons: p.use_smooth = True
    sol = o.modifiers.new("card", "SOLIDIFY"); sol.thickness = M(CARD); sol.offset = -1.0; sol.use_even_offset = True
    o.location = P(cx, CARD, cd); o.rotation_euler = (0, 0, turn)
    return o
PITCH_X, PITCH_D = TW + 0.6, TH + 1.0
FOLDS = {1: ((1, 0), 1.2, 0.55), 7: ((0, 1), 0.85, 0.45)}   # (two that were dog-eared in a pocket)
EIGHT = []
for i in range(len(INFO["tickets"])):
    col, row = i % 4, i // 4                     # the first four in the far row, as the board had them
    cx = G[0] + (col - 1.5) * PITCH_X + RNG.uniform(-0.25, 0.25)
    cd = G[2] + (0.5 - row) * PITCH_D + RNG.uniform(-0.2, 0.2)
    EIGHT.append(lying(i, cx, cd, math.radians(RNG.uniform(-2.5, 2.5)), RNG.uniform(0.03, 0.1), RNG.uniform(-0.02, 0.03), FOLDS.get(i)))

# ── what else is kept in the drawer ────────────────────────────────────────
# the ink pad: a black tin, the felt in it gone nearly black with ink; its lid
# pulled off and put down beside it, the bare tin inside it up
BARE = aged_metal("bare tin", (0.3, 0.3, 0.29), (0.07, 0.055, 0.04), rough=(0.38, 0.62), scale=50, tarnish=0.75)
PAD = dict(w=8.4, dp=5.4, h=1.15, t=0.06)
def ink_felt():
    """the pad's felt: a nap of fibres, soaked unevenly with blue-black ink,
    wetter (a little shine) where the stamp came down most"""
    m = bpy.data.materials.new("ink felt"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    blot = N.new("ShaderNodeTexNoise"); blot.inputs["Scale"].default_value = 28; blot.inputs["Detail"].default_value = 6; blot.inputs["Roughness"].default_value = 0.65
    L(tc.outputs["Object"], blot.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].position = 0.38; ramp.color_ramp.elements[1].position = 0.66
    ramp.color_ramp.elements[0].color = (0.006, 0.006, 0.014, 1); ramp.color_ramp.elements[1].color = (0.05, 0.045, 0.085, 1)
    L(blot.outputs["Fac"], ramp.inputs["Fac"])
    nap = N.new("ShaderNodeTexNoise"); nap.inputs["Scale"].default_value = 1400; nap.inputs["Detail"].default_value = 4
    L(tc.outputs["Object"], nap.inputs["Vector"])
    nr = N.new("ShaderNodeMapRange"); nr.inputs["To Min"].default_value = 0.7; nr.inputs["To Max"].default_value = 1.25; L(nap.outputs["Fac"], nr.inputs["Value"])
    mul = N.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
    L(ramp.outputs["Color"], mul.inputs[6]); L(nr.outputs["Result"], mul.inputs[7]); L(mul.outputs[2], b.inputs["Base Color"])
    rr = N.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.45; rr.inputs["To Max"].default_value = 0.9
    L(blot.outputs["Fac"], rr.inputs["Value"]); L(rr.outputs["Result"], b.inputs["Roughness"])
    b.inputs["Sheen Weight"].default_value = 0.6; b.inputs["Sheen Roughness"].default_value = 0.4; b.inputs["Sheen Tint"].default_value = (0.3, 0.3, 0.45, 1)
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.5; bp.inputs["Distance"].default_value = 0.0003
    L(nap.outputs["Fac"], bp.inputs["Height"]); L(bp.outputs["Normal"], b.inputs["Normal"])
    return m
def tin(name, w, dp, h, t, inside):
    """an open tin tray, w × dp, walls h high: black outside, `inside` within"""
    box_cm(name, -w / 2, w / 2, 0, t, -dp / 2, dp / 2, TIN, 0.02)
    box_cm(name + " inside", -w / 2 + t, w / 2 - t, t, t + 0.01, -dp / 2 + t, dp / 2 - t, inside)
    for (a, b_, c_, e) in ((-w / 2, w / 2, -dp / 2, -dp / 2 + t), (-w / 2, w / 2, dp / 2 - t, dp / 2), (-w / 2, -w / 2 + t, -dp / 2, dp / 2), (w / 2 - t, w / 2, -dp / 2, dp / 2)):
        box_cm(name, a, b_, 0, h, c_, e, TIN, 0.025)
def ink_pad():
    w, dp, h, t = PAD["w"], PAD["dp"], PAD["h"], PAD["t"]
    tin("pad tin", w, dp, h, t, TIN)
    felt = ink_felt()
    box_cm("pad felt", -w / 2 + t, w / 2 - t, t, h - 0.3, -dp / 2 + t, dp / 2 - t, felt, 0.06)
assembled("ink pad", ink_pad, at=(-22.6, 0, 13.4), turn=math.radians(87))
assembled("ink pad lid", lambda: tin("pad lid", PAD["w"] + 0.12, PAD["dp"] + 0.12, 0.55, PAD["t"], BARE), at=(-22.45, 0, 4.8), turn=math.radians(-1))

# the rubber stamp it inks: a dark varnished mount and turned handle, the
# rubber on its face; stood down as it was last used
WOOD = scan("stamp wood", "dark_wood", size=0.3, tint=(0.62, 0.44, 0.32), bright=0.5, sat=0.8, rough=(0.35, 0.55), bump=0.2, edges=0.5)
RUBBER = plain("stamp rubber", (0.11, 0.05, 0.035), rough=0.7)
def rubber_stamp():
    box_cm("stamp mount", -3.0, 3.0, 0.0, 1.5, -0.9, 0.9, WOOD, 0.12)
    box_cm("stamp rubber", -2.9, 2.9, -0.28, 0.0, -0.8, 0.8, RUBBER, 0.03)
    lathe("stamp handle", [(0, 0), (0.0075, 0), (0.0065, 0.012), (0.005, 0.03), (0.007, 0.037), (0.009, 0.045), (0.0085, 0.052), (0.005, 0.056), (0, 0.057)], WOOD, at=tuple(P(0, 1.5, 0)), steps=32)
assembled("rubber stamp", rubber_stamp, at=(-9.6, 0.28, 4.7), turn=math.radians(7))

# a pencil, sharpened with a knife until it was short
def pencil():
    L_, r = 7.4, 0.36
    body = cylinder("pencil", 0, 0, 0, M(L_), M(r), plain("pencil paint", (0.3, 0.045, 0.03), rough=0.5), verts=6)
    for p_ in body.data.polygons: p_.use_smooth = False
    cylinder("pencil wood", 0, 0, M(L_), M(L_ + 1.6), M(r * 0.92), plain("cedar", (0.52, 0.34, 0.2), rough=0.8), verts=12, r2=M(0.06))
    cylinder("pencil lead", 0, 0, M(L_ + 1.45), M(L_ + 1.85), M(0.075), plain("graphite", (0.04, 0.04, 0.045), rough=0.45, metal=0.3), verts=10, r2=M(0.01))
pc = assembled("pencil", pencil)
pc.rotation_euler = (0, math.radians(90), math.radians(-6)); pc.location = P(-3.6, 0.31, 5.0)

# an old rubber band, perished and lying slack
def band():
    me = bpy.data.meshes.new("rubber band"); bm = bmesh.new(); n = 64
    rings = []
    for k in range(n):
        a = k / n * math.tau
        rad = 2.1 + 0.35 * math.sin(2 * a + 0.7) + 0.18 * math.sin(5 * a + 1.3)
        c_ = Vector((math.cos(a) * rad * 1.25, math.sin(a) * rad * 0.8, 0)); nrm = Vector((math.cos(a), math.sin(a), 0))
        rings.append([bm.verts.new(M(1) * (c_ + nrm * dx) + Vector((0, 0, M(dz)))) for dx, dz in ((-0.09, 0), (0.09, 0), (0.09, 0.05), (-0.09, 0.05))])
    for k in range(n):
        A, B = rings[k], rings[(k + 1) % n]
        for e in range(4): bm.faces.new((A[e], A[(e + 1) % 4], B[(e + 1) % 4], B[e]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("rubber band", me)); o.data.materials.append(plain("old rubber", (0.32, 0.15, 0.08), rough=0.72))
    return o
bd = band(); bd.location = P(8.6, 0, 5.2); bd.rotation_euler = (0, 0, math.radians(-12))

# two pennies, worn by thirty years of hands: their high places bright, the
# hollows of the lettering gone dark
PENNY_R = 1.55
def coin_material(name, path, r):
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]; b.inputs["Metallic"].default_value = 1.0
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / (2 * M(r)), 1 / (2 * M(r)), 1); mp.inputs["Location"].default_value = (0.5, 0.5, 0)
    L(tc.outputs["Object"], mp.inputs["Vector"])
    im = N.new("ShaderNodeTexImage"); im.image = bpy.data.images.load(path, check_existing=True); im.image.colorspace_settings.name = "Non-Color"; im.extension = "EXTEND"
    L(mp.outputs["Vector"], im.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].position = 0.45; ramp.color_ramp.elements[1].position = 0.9
    ramp.color_ramp.elements[0].color = (0.11, 0.055, 0.03, 1); ramp.color_ramp.elements[1].color = (0.62, 0.36, 0.21, 1)
    L(im.outputs["Color"], ramp.inputs["Fac"])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 160; nz.inputs["Detail"].default_value = 8; L(tc.outputs["Object"], nz.inputs["Vector"])
    nr = N.new("ShaderNodeMapRange"); nr.inputs["To Min"].default_value = 0.6; nr.inputs["To Max"].default_value = 1.1; L(nz.outputs["Fac"], nr.inputs["Value"])
    mul = N.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
    L(ramp.outputs["Color"], mul.inputs[6]); L(nr.outputs["Result"], mul.inputs[7]); L(mul.outputs[2], b.inputs["Base Color"])
    rr = N.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.62; rr.inputs["To Max"].default_value = 0.34
    L(im.outputs["Color"], rr.inputs["Value"]); L(rr.outputs["Result"], b.inputs["Roughness"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.8; bp.inputs["Distance"].default_value = 0.0004
    L(im.outputs["Color"], bp.inputs["Height"]); L(bp.outputs["Normal"], b.inputs["Normal"])
    return m
PENNY = coin_material("penny", os.path.join(DRAWN, "penny.png"), PENNY_R)
def penny(x, d, turn, r=PENNY_R, at_y=0.0):
    lathe("penny", [(0, 0), (M(r), 0), (M(r), M(0.17)), (M(r - 0.05), M(0.18)), (0, M(0.18))], PENNY, at=tuple(P(x, at_y, d)), steps=96).rotation_euler = (0, 0, turn)
penny(-24.0, 4.1, 0.25, at_y=PAD["t"] + 0.01); penny(-20.9, 5.5, -0.9, at_y=PAD["t"] + 0.01)   # (in the lid)

# ── light: a candle held over the left shoulder; the moon, high in the
# window over the chest, on everything a little ──────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.003, 0.004, 0.008, 1)
CANDLE_AT = (float(arg("--cx", "-22")), float(arg("--cy", "62")), float(arg("--cd", "-8")))
candle = lamp("candle", "POINT", tuple(P(*CANDLE_AT)), energy=float(arg("--candle", "6")), colour=(1.0, 0.56, 0.24), size=0.012)
moon = lamp("the moon", "AREA", tuple(P(10, 170, 70)), aim=tuple(P(0, 0, 10)), energy=float(arg("--moon", "9")), colour=(0.55, 0.68, 1.0), size=0.6)
moon.visible_camera = False; moon.visible_glossy = False

# the lens: focused on the eight, stopped down so all of them are sharp
cam = scene.camera
cam.data.dof.use_dof = True
cam.data.dof.focus_distance = (P(*G) - P(*EYE)).length
cam.data.dof.aperture_fstop = float(arg("--fstop", "8"))

# ── where it all fell in the picture ───────────────────────────────────────
bpy.context.view_layer.update()
eight = [c for o in EIGHT for c in object_corners(o)]
layout = {
    "version": 1, "width": RW, "height": RH,
    "safe": box_of(eight, pad=14),
    "tickets": [[list(q) for q in outline(object_corners(o))] for o in EIGHT],
    # (where the candle's light falls brightest: under it, by the drawer's front)
    "candle": {"at": list(project(P(CANDLE_AT[0], 0, 0))), "r": round(scale_at(P(*G)) * 52, 1)},
}
with open(os.path.join(OUT, "ticketDrawer.json"), "w") as fh: json.dump(layout, fh, indent=1)

# ── render ─────────────────────────────────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "0.6")), glare=False)
finish(scene, SAMPLES, keep_gloss=("graphite",))
# (the standing hundreds: older and dustier than the eight in front)
_bb = BACKS.node_tree.nodes["Principled BSDF"].inputs["Base Color"]
_dim = BACKS.node_tree.nodes.new("ShaderNodeMix"); _dim.data_type = "RGBA"; _dim.blend_type = "MULTIPLY"; _dim.inputs["Factor"].default_value = 1.0
_dim.inputs[7].default_value = (0.72, 0.69, 0.64, 1)
BACKS.node_tree.links.new(_bb.links[0].from_socket, _dim.inputs[6]); BACKS.node_tree.links.new(_dim.outputs[2], _bb)
if PREVIEW: scene.cycles.adaptive_min_samples = 16
render(scene, os.path.join(OUT, "preview.png" if PREVIEW else "plate.png"))
print("TICKET_DRAWER_OK", layout["safe"])
