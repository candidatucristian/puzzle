# Room XI, Orion's physics study, built in three dimensions and rendered with
# Cycles, seen from a step up by the door, across his workbench.
#
# Plaster over a walnut dado, a herringbone floor, a coffered ceiling. In the
# middle of the room, standing free and turned to the window, his long
# workbench: an induction coil on its mahogany base, a galvanometer, two
# lenses on their stands, a row of Leyden jars, a pendulum on its brass frame,
# copper wire run between them, a green-shaded lamp at its end, and lying at
# its near corner his counting frame, grey with dust (counting_frame_model.py;
# the level's own close-up is counting_frame.py). On the slate
# on the left-hand wall a wave drawn twice and a pendulum swung out, in chalk;
# books down the right; at the far end the tall sash window, the rain on it,
# and on its sill his four ways of keeping time — a brass clock, a tear-off
# calendar, a sand-glass, a candle-clock alight (rewind_model.py; the level's
# own close-up is rewind_sill.py).
#
# One plate (lights-1: the lamp lit) and where it all fell in the picture
# (src/levels/house/rooms/Room11.json).
#
#   blender -b --factory-startup -P art/blender/room_physics.py -- [--samples 700] [--width 2560]

import bpy, bmesh, math, os, sys, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *
from counting_frame_model import Frame, BOARD, RIM, BASE, D
from rewind_model import Sill, SILL_AT, SPOTS, REWIND, turns_toward

OUT = os.path.join(ROOT, ".artifacts/room-physics")
os.makedirs(OUT, exist_ok=True)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")       # physics_boards.mjs, room_boards.mjs
SAMPLES = int(arg("--samples", "700"))
WIDTH = int(arg("--width", "2560"))
RNG = random.Random(1887)

X0, X1, D1, TOP = -250, 250, 600, 310
EYE = (float(arg("--ex", "175")), float(arg("--ey", "170")), float(arg("--ed", "50")))
LOOK = (float(arg("--lx", "-70")), float(arg("--ly", "96")), float(arg("--ld", "480")))
scene, HEIGHT = stage(WIDTH, eye=EYE, look=LOOK, lens=float(arg("--lens", "24")))
WIN = dict(x=30, hw=66, sill=82, top=272)
BENCH = dict(at=(10, 0, 360), turn=math.radians(16), w=200, deep=84, h=82)
SLATE = dict(d0=240, d1=470, y0=104, y1=104 + 230 * 1400 / 2400)

WALNUT = scan("walnut", "rosewood_veneer1", size=0.7, tint=(0.6, 0.4, 0.3), bright=0.48, sat=0.9, rough=(0.25, 0.45), bump=0.2, coat=0.2, upright=True)
WALNUT_X = scan("walnut across", "rosewood_veneer1", size=0.7, tint=(0.6, 0.4, 0.3), bright=0.46, sat=0.9, rough=(0.25, 0.45), bump=0.2, coat=0.2)
OAK = scan("oak", "dark_wood", size=1.0, tint=(0.82, 0.62, 0.44), bright=0.52, rough=(0.3, 0.55), bump=0.3, coat=0.2, upright=True)
OAK_X = scan("oak across", "dark_wood", size=1.0, tint=(0.82, 0.62, 0.44), bright=0.5, rough=(0.3, 0.55), bump=0.3, coat=0.2)
MAHOGANY = scan("mahogany", "rosewood_veneer1", size=0.5, tint=(0.72, 0.42, 0.3), bright=0.48, sat=0.9, rough=(0.2, 0.4), bump=0.2, coat=0.3)
PLASTER = scan("plaster", "white_plaster_rough_01", size=2.4, tint=(0.86, 0.84, 0.76), bright=1.0, sat=0.35, rough=(0.8, 0.95), bump=0.4)
CEILING = scan("ceiling", "plastered_wall_04", size=2.0, tint=(0.82, 0.8, 0.74), bright=0.72, sat=0.3, rough=(0.8, 0.95), bump=0.5)
BRASS = aged_metal("brass", (0.6, 0.43, 0.19), (0.08, 0.06, 0.03), rough=(0.18, 0.42), scale=30, tarnish=0.45)
COPPER = aged_metal("copper wire", (0.62, 0.3, 0.16), (0.12, 0.08, 0.05), rough=(0.25, 0.45), scale=60, tarnish=0.35)
EBONITE = plain("ebonite", (0.015, 0.013, 0.012), rough=0.35)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
FOIL = aged_metal("tin foil", (0.7, 0.7, 0.68), (0.3, 0.3, 0.28), rough=(0.3, 0.55), scale=80, tarnish=0.3)
FRAME = plain("window paint", (0.8, 0.79, 0.74), rough=0.55)
SLATE_MAT = picture("slate", os.path.join(DRAWN, "physics-slate.png"), rough=0.88, bump=0.12)
DIAL = picture("galvanometer dial", os.path.join(DRAWN, "galvanometer.png"), rough=0.4, coat=0.5)
spine_mat = bound(picture("spines", os.path.join(DRAWN, "spines.png"), rough=0.5, coat=0.15, bump=0.3))
COVERS = cover_materials()
PAGES = plain("pages", (0.3, 0.26, 0.19), rough=0.9)
LAYOUT = Layout("Room11")

# ── the shell ──────────────────────────────────────────────────────────────
def parquet(x0, x1, d0, d1, L=35.0, W=7.0):
    """blocks of oak laid in herringbone, each a little lighter or darker"""
    me = bpy.data.meshes.new("parquet"); bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    k = round(L / W); c, s = math.cos(math.pi / 4), math.sin(math.pi / 4)
    world = lambda u, v: (x0 + (x1 - x0) / 2 + (u * c - v * s) * W, d0 + (u * s + v * c) * W)
    span = int((max(x1 - x0, d1 - d0) / W) * 1.6) + k; gap = 0.12 / W
    for i in range(-span, span):
        for j in range(-span // k - 2, span // k + 2):
            ox, oy = i + j * k, i - j * k
            for (ax, ay, bx, by, along) in ((ox, oy, ox + k, oy + 1, True), (ox, oy + 1, ox + 1, oy + 1 + k, False)):
                pts = [world(ax + gap, ay + gap), world(bx - gap, ay + gap), world(bx - gap, by - gap), world(ax + gap, by - gap)]
                mx, md = sum(p[0] for p in pts) / 4, sum(p[1] for p in pts) / 4
                if not (x0 - 10 < mx < x1 + 10 and d0 - 10 < md < d1 + 10): continue
                f = bm.faces.new([bm.verts.new(tuple(P(px, 0.0, pd))) for px, pd in pts])
                ou, ov = RNG.uniform(0, 3), RNG.uniform(0, 3)
                for lp, (cu, cv) in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
                    lu, lv = (cu * L, cv * W) if along else (cv * L, cu * W)
                    lp[uv].uv = (ou + M(lu), ov + M(lv))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("parquet", me))
    m = scan("parquet", "dark_wood", size=1.0, tint=(0.85, 0.6, 0.4), bright=0.55, rough=(0.3, 0.55), bump=0.3, coat=0.2, uvs=True)
    N = m.node_tree.nodes; geo = N.new("ShaderNodeNewGeometry"); hs = next(n for n in N if n.type == "HUE_SAT")
    vr = N.new("ShaderNodeMapRange"); vr.inputs["To Min"].default_value = 0.42; vr.inputs["To Max"].default_value = 0.7
    m.node_tree.links.new(geo.outputs["Random Per Island"], vr.inputs["Value"]); m.node_tree.links.new(vr.outputs["Result"], hs.inputs["Value"])
    o.data.materials.append(m)
    return arch(o)
parquet(X0, X1, -30, D1)
box_cm("subfloor", X0 - 20, X1 + 20, -6, -0.05, -40, D1 + 20, plain("joints", (0.01, 0.007, 0.005), rough=1))
box_cm("ceiling", X0 - 20, X1 + 20, TOP, TOP + 10, -40, D1 + 20, CEILING)
for d in range(60, D1, 90):
    box_cm("coffer beam", X0, X1, TOP - 20, TOP, d - 7, d + 7, WALNUT_X, 1.0)
for x in (-125, 0, 125):
    box_cm("coffer beam", x - 7, x + 7, TOP - 20, TOP, -40, D1, WALNUT_X, 1.0)
for (x0, x1) in ((X0 - 25, X0), (X1, X1 + 25)):
    box_cm("wall", x0, x1, 0, TOP, -40, D1 + 20, PLASTER)
box_cm("door wall", X0 - 25, X1 + 25, 0, TOP, -65, -40, PLASTER)
back = box_cm("back wall", X0 - 25, X1 + 25, 0, TOP, D1, D1 + 30, PLASTER)
DADO = 96
def dado(along_x, at, facing, a, b, top=DADO, cornice=True):
    def piece(p0, p1, y0, y1, proud, mat, r=0.0):
        q0, q1 = sorted((at, at + facing * proud))
        if along_x: box_cm("dado", p0, p1, y0, y1, q0, q1, mat, r)
        else: box_cm("dado", q0, q1, y0, y1, p0, p1, mat, r)
    piece(a, b, 0, top, 2.0, WALNUT)
    n = max(1, round((b - a) / 54))
    for k in range(n):
        p0 = a + k * (b - a) / n + 6; p1 = a + (k + 1) * (b - a) / n - 6
        piece(p0, p1, 18, top - 14, 3.2, WALNUT, 1.2)
    piece(a, b, top - 3, top + 4, 4.5, WALNUT_X, 1.0)
    piece(a, b, 0, 16, 3.5, WALNUT_X, 0.6)
    if cornice: piece(a, b, TOP - 16, TOP, 9, CEILING, 2.0)
dado(False, X0, 1, -40, D1)
dado(False, X1, -1, -40, D1)
# (on the back wall the panelling stops at the window, and runs on lower under its sill)
WX0, WX1 = WIN["x"] - WIN["hw"] - 3, WIN["x"] + WIN["hw"] + 3
dado(True, D1, -1, X0, WX0)
dado(True, D1, -1, WX1, X1)
dado(True, D1, -1, WX0, WX1, top=WIN["sill"] - 8)
SASHES = sash_window_back(back, WIN["x"], WIN["hw"], WIN["sill"], WIN["top"], D1, 26, FRAME, GLASS, PLASTER, WALNUT_X, bars=(1 / 3, 2 / 3))
curtain(RNG, WIN["x"] - WIN["hw"] - 60, WIN["x"] - WIN["hw"] - 2, D1 - 8, 300, scan("curtain", "velour_velvet", size=0.5, tint=(0.2, 0.32, 0.4), bright=0.32, sat=0.9, rough=(0.75, 0.92), bump=0.2), folds=4, deep=8)
curtain(RNG, WIN["x"] + WIN["hw"] + 2, WIN["x"] + WIN["hw"] + 60, D1 - 8, 300, bpy.data.materials["curtain"], folds=4, deep=8)
SILL = Sill(SILL_AT, turns_toward())               # (as the close-up has them, turned toward where it looks from)
garden(P(-700, 800, 3600), [("island_tree_01", -900, 1900, 11.0, 0.3), ("island_tree_02", 900, 2600, 12.0, 1.4), ("tree_small_02", 300, 1300, 5.0, 2.2)],
       (-2500, 2500, D1 + 40, 3300, -40), P(-200, 800, 4200), sky_size=45)

# ── the slate on the left-hand wall ────────────────────────────────────────
sl = SLATE
for (a, b, c, e) in ((sl["d0"] - 5, sl["d1"] + 5, sl["y0"] - 5, sl["y0"]), (sl["d0"] - 5, sl["d1"] + 5, sl["y1"], sl["y1"] + 5), (sl["d0"] - 5, sl["d0"], sl["y0"], sl["y1"]), (sl["d1"], sl["d1"] + 5, sl["y0"], sl["y1"])):
    box_cm("slate frame", X0, X0 + 4, c, e, a, b, OAK_X if e - c < 10 else OAK, 0.6)
arch(card("slate", [P(X0 + 1.6, sl["y0"], sl["d0"]), P(X0 + 1.6, sl["y0"], sl["d1"]), P(X0 + 1.6, sl["y1"], sl["d1"]), P(X0 + 1.6, sl["y1"], sl["d0"])], SLATE_MAT))
box_cm("chalk tray", X0, X0 + 7, sl["y0"] - 7, sl["y0"] - 5, sl["d0"], sl["d1"], OAK_X, 0.4)
for k, d in enumerate((sl["d0"] + 40, sl["d0"] + 52, sl["d1"] - 60)):
    rod("chalk", P(X0 + 4, sl["y0"] - 4.4, d), P(X0 + 4.4, sl["y0"] - 4.4, d + (6 if k != 1 else 4)), M(0.5), plain("chalk", (0.86, 0.85, 0.8), rough=0.95), verts=8)

# ── books down the right-hand wall ─────────────────────────────────────────
bookcase(RNG, X1, 1, 200, 570, 250, OAK, OAK_X, spine_mat, COVERS, PAGES, depth=32, levels=(9, 50, 91, 132, 173, 214, 250), bays=4, glass=GLASS)

# ── his workbench, standing free, and what is on it ────────────────────────
B = BENCH
def workbench():
    w, dp, h = B["w"], B["deep"], B["h"]
    turned_table(dict(x0=-w / 2, x1=w / 2, d0=-dp / 2, d1=dp / 2, h=h), OAK, legs_in=6)
    box_cm("stretcher", -w / 2 + 6, w / 2 - 6, 14, 19, -2, 2, OAK, 0.4, keep=False)
    # the induction coil: a long drum wound with copper on a mahogany base, its brass ends, a spark gap on top
    cx, cd = -40, -4
    box_cm("coil base", cx - 26, cx + 26, h, h + 4, cd - 11, cd + 11, MAHOGANY, 0.6, keep=False)
    for e in (-1, 1): box_cm("coil cheek", cx + e * 19 - 1.5, cx + e * 19 + 1.5, h + 4, h + 20, cd - 8, cd + 8, EBONITE, 0.8, keep=False)
    drum = cylinder("coil winding", 0, 0, M(-17.5), M(17.5), M(7.5), COPPER, verts=48); drum.rotation_euler = (0, math.pi / 2, 0); drum.location = P(cx, h + 14, cd)
    for k in range(-16, 17, 2):
        rr = cylinder("winding turn", 0, 0, M(-0.35), M(0.35), M(7.65), COPPER, verts=40); rr.rotation_euler = (0, math.pi / 2, 0); rr.location = P(cx + k, h + 14, cd)
    for e in (-1, 1):
        rod("spark rod", P(cx + e * 10, h + 22, cd), P(cx + e * 2.2, h + 30, cd), M(0.45), BRASS, verts=10)
        sphere("spark ball", tuple(P(cx + e * 1.8, h + 30.2, cd)), M(1.2), BRASS)
        cylinder("spark pillar", M(cx + e * 10), M(cd), M(h + 20), M(h + 23), M(0.8), EBONITE, verts=12)
    # the galvanometer: a brass drum, its dial under glass, on three feet
    gx, gd = 12, -8
    for k in range(3):
        a = k / 3 * math.tau
        sphere("foot", tuple(P(gx + math.cos(a) * 7, h + 0.8, gd + math.sin(a) * 7)), M(1.0), BRASS)
    drum2 = cylinder("galvanometer case", 0, 0, M(-4), M(4), M(10), BRASS, verts=48); drum2.rotation_euler = (math.pi / 2, 0, 0); drum2.location = P(gx, h + 13, gd)
    face = bpy.data.meshes.new("dial"); bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); n = 48
    c0 = bm.verts.new(tuple(P(gx, h + 13, gd - 4.05)))
    ring = [bm.verts.new(tuple(P(gx + math.cos(2 * math.pi * k / n) * 9.2, h + 13 + math.sin(2 * math.pi * k / n) * 9.2, gd - 4.05))) for k in range(n)]
    for k in range(n):
        f = bm.faces.new((c0, ring[(k + 1) % n], ring[k]))
        for lp in f.loops:
            co = lp.vert.co
            lp[uvl].uv = (0.5 + (co.x - M(gx)) / M(18.4), 0.5 + (co.z - M(h + 13)) / M(18.4))
    bm.to_mesh(face); bm.free()
    link(bpy.data.objects.new("dial", face)).data.materials.append(DIAL)
    for e in (-1, 1): lathe("terminal", [(0, 0), (0.008, 0), (0.008, 0.012), (0.012, 0.016), (0, 0.02)], BRASS, at=tuple(P(gx + e * 6, h + 3.5, gd - 5)), steps=16)
    box_cm("galvanometer stand", gx - 9, gx + 9, h + 0.8, h + 3.5, gd - 6, gd + 6, MAHOGANY, 0.5, keep=False)
    # two lenses on their stands
    for (lx, ld, r) in ((44, 10, 6.5), (60, 8, 5.0)):
        box_cm("lens foot", lx - 5, lx + 5, h, h + 1.4, ld - 5, ld + 5, BRASS, 0.4, keep=False)
        cylinder("lens rod", M(lx), M(ld), M(h + 1.4), M(h + 18), M(0.6), BRASS, verts=12)
        bpy.ops.mesh.primitive_torus_add(major_radius=M(r + 0.3), minor_radius=M(0.6), location=tuple(P(lx, h + 18 + r, ld)), rotation=(math.pi / 2, 0, 0.2))
        bpy.context.active_object.data.materials.append(BRASS)
        lens = sphere("lens", (0, 0, 0), M(r), GLASS, squash=(1, 0.14, 1)); lens.location = P(lx, h + 18 + r, ld); lens.rotation_euler = (0, 0, 0.2)
    # a row of Leyden jars, their foil coats, their brass knobs
    for k in range(3):
        jx, jd = 74 + k * 9, -18
        lathe("Leyden jar", [(0, 0), (0.038, 0), (0.04, 0.005), (0.04, 0.17), (0.035, 0.18), (0, 0.18)], GLASS, at=tuple(P(jx, h, jd)), steps=32)
        cylinder("jar foil", M(jx), M(jd), M(h + 0.4), M(h + 10), M(4.08), FOIL, verts=32, open_ends=True)
        cylinder("jar stopper", M(jx), M(jd), M(h + 17.6), M(h + 19), M(3.4), plain("cork", (0.32, 0.2, 0.1), rough=0.9), verts=20)
        rod("jar rod", P(jx, h + 19, jd), P(jx, h + 27, jd), M(0.3), BRASS, verts=8)
        sphere("jar knob", tuple(P(jx, h + 27.8, jd)), M(1.1), BRASS)
    # the pendulum on its brass frame, at the far end
    px, pd = 86, 20
    box_cm("pendulum base", px - 12, px + 12, h, h + 2.5, pd - 10, pd + 10, MAHOGANY, 0.6, keep=False)
    for e in (-1, 1): rod("pendulum post", P(px + e * 9, h + 2.5, pd), P(px + e * 7, h + 48, pd), M(0.55), BRASS, verts=10)
    rod("pendulum bar", P(px - 8, h + 48, pd), P(px + 8, h + 48, pd), M(0.6), BRASS, verts=10)
    a = 0.22
    bob = P(px + math.sin(a) * 38, h + 48 - math.cos(a) * 38, pd)
    rod("pendulum string", P(px, h + 48, pd), bob, M(0.06), plain("silk", (0.7, 0.66, 0.58), rough=0.8), verts=4)
    sphere("pendulum bob", tuple(bob), M(2.4), BRASS)
    # copper wire run from the coil to the galvanometer, and on to the jars
    for (pts) in (((cx + 19, h + 4, cd + 6), (cx + 30, h + 0.6, cd + 14), (gx - 6, h + 0.6, gd + 6), (gx - 6, h + 3.5, gd - 5)),
                  ((gx + 6, h + 3.5, gd - 5), (gx + 16, h + 0.6, gd + 2), (70, h + 0.6, -4), (74, h + 25, -18))):
        cu = bpy.data.curves.new("wire", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = M(0.22); spl = cu.splines.new("BEZIER"); spl.bezier_points.add(len(pts) - 1)
        for bp_, v in zip(spl.bezier_points, pts): bp_.co = P(*v); bp_.handle_left_type = bp_.handle_right_type = "AUTO"
        link(bpy.data.objects.new("wire", cu)).data.materials.append(COPPER)
    # his counting frame, lying at the bench's near corner as he left it
    assembled("counting frame", Frame, at=(45, h, -25.8))
    # his notebook open, a pencil
    page = paper("his notes", (0.66, 0.6, 0.48), 0.3)
    card("notes", [P(-90, h + 0.4, 6), P(-58, h + 0.4, 2), P(-56, h + 0.4, 24), P(-88, h + 0.4, 28)], page)
    tube("pencil", [(0, 0), (0.15, 0.003)], 0.0035, plain("pencil", (0.55, 0.38, 0.12), rough=0.5), at=tuple(P(-74, h + 0.9, 14)), rot=0.4)
    # the green-shaded lamp at its near end
    gx_, gd_ = -84, -22
    lathe("banker's lamp", [(0, 0), (0.065, 0), (0.065, 0.015), (0.03, 0.025), (0.012, 0.03), (0.009, 0.34), (0, 0.34)], BRASS, at=tuple(P(gx_, h, gd_)), steps=32)
    tube("shade arm", [(0, 0.3), (0.0, 0.36), (0.05, 0.38)], 0.005, BRASS, at=tuple(P(gx_, h, gd_)), rot=0.0)
    sh = cylinder("green shade", 0, 0, M(-13), M(13), M(6.5), GREEN_GLASS, verts=48)
    sh.rotation_euler = (0, math.pi / 2, 0); sh.location = P(gx_ + 5, h + 38, gd_)
    boolean_cut(sh, box("cut", M(gx_ - 15), M(gx_ + 25), M(gd_ - 20), M(gd_ + 8), M(h + 30), M(h + 38), GLASS))
    sh.modifiers.new("thick", "SOLIDIFY").thickness = M(0.35)
GREEN_GLASS = bpy.data.materials.new("green glass shade"); GREEN_GLASS.use_nodes = True
_g = GREEN_GLASS.node_tree.nodes["Principled BSDF"]; _g.inputs["Base Color"].default_value = (0.008, 0.09, 0.03, 1); _g.inputs["Roughness"].default_value = 0.08; _g.inputs["Coat Weight"].default_value = 1.0
_g.inputs["Emission Color"].default_value = (0.05, 0.7, 0.2, 1); _g.inputs["Emission Strength"].default_value = 0.22
assembled("workbench", workbench, at=B["at"], turn=B["turn"])
WF = framed(B["at"], B["turn"])
LAMP_AT = WF(-84 + 5, B["h"] + 35, -22 + 4)
lamp_l = lamp("green lamp", "POINT", tuple(LAMP_AT), energy=float(arg("--lamp", "16")), colour=(1.0, 0.8, 0.52), size=0.012)
import_model("wooden_stool_01", height=M(66), at=tuple(WF(-30, 0, -B["deep"] / 2 - 30)), rot=0.5)
import_model("dining_chair_02", height=M(97), at=tuple(WF(70, 0, B["deep"] / 2 + 36)), rot=B["turn"] + 0.3)
rug(-170, 150, 230, 520, rug_material("rug", f"{ASSETS}/textures/persian_rug.jpg", tint=(0.7, 0.62, 0.5), sat=0.8, value=0.38))

# ── light ──────────────────────────────────────────────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
lamp("the moon", "SUN", tuple(P(-500, 2600, 2900)), aim=tuple(P(20, 0, 380)), energy=float(arg("--moon", "2.6")), colour=(0.55, 0.68, 1.0), angle=math.radians(1.5))
sky_l = lamp("sky through the window", "AREA", tuple(P(WIN["x"], 180, D1 + 14)), aim=tuple(P(WIN["x"], 60, 380)), energy=float(arg("--sky", "24")), colour=(0.5, 0.62, 0.95), size=1.4, size_y=1.9)
sky_l.visible_camera = False; sky_l.visible_transmission = False; sky_l.visible_glossy = False
fill_l = lamp("fill", "AREA", tuple(P(200, 230, 20)), aim=tuple(P(-80, 80, 480)), energy=float(arg("--fill", "16")), colour=(0.8, 0.85, 1.0), size=1.6)
fill_l.visible_camera = False; fill_l.visible_glossy = False
eye_fill(float(arg("--eyefill", "19")))                # (the halls' fill: nothing the eye sees falls to black)
for (at_, aim) in ((P(-120, 220, 360), P(X0, 150, 360)), (P(0, 220, 480), P(0, 140, D1)), (P(120, 220, 360), P(X1, 140, 380))):
    wash = lamp("on the walls", "AREA", tuple(at_), aim=tuple(aim), energy=float(arg("--wash", "12")), colour=(0.82, 0.86, 1.0), size=1.0)
    wash.visible_camera = False; wash.visible_glossy = False
candle_l = lamp("candle flame", "POINT", tuple(SILL.wick_tip(REWIND["candle"]["from"]) + Vector((0, 0, M(1.4)))), energy=float(arg("--candle", "0.4")), colour=(1.0, 0.68, 0.34), size=0.006)
LIGHTS = [Light("lamp", [lamp_l], [GREEN_GLASS])]
clear_glass()
air = room_haze(X0, X1, -30, D1, TOP, float(arg("--haze", "0")))

# ── what the game is told ──────────────────────────────────────────────────
for pane in SASHES: LAYOUT.pane(pane)
frame_ = bpy.data.objects["counting frame"]; bpy.context.view_layer.update()
LAYOUT.thing("abacus", "Look at the counting frame", [frame_.matrix_world @ P(x, y, D(v)) for x in (BOARD["x0"] - RIM, BOARD["x1"] + RIM) for v in (BOARD["v0"] - RIM, BOARD["v1"] + RIM) for y in (0, BASE + 2.2)])
LAYOUT.thing("rewind", "Look at the windowsill", [c for k in SPOTS for o in SILL.objects(k) for c in object_corners(o)])
LAYOUT.flame("candle", SILL.wick_tip(REWIND["candle"]["from"]))
LAYOUT.glow("lamp", WF(-84 + 5, B["h"] + 22, -22 + 2), 90)
LAYOUT.dust([P(WIN["x"] - WIN["hw"], WIN["top"], D1), P(WIN["x"] + WIN["hw"], WIN["sill"], D1), P(-40, 0, 300), P(120, 0, 520)])
LAYOUT.write()

cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "1.6")))
scene.cycles.volume_bounces = 1
GLOSSY = ("green glass shade", "galvanometer dial")
finish(scene, SAMPLES, keep_gloss=GLOSSY)
plates = one_light(LIGHTS[0])
passes(scene, OUT, set(plates), air, variants=plates)
print("ROOM_DONE")
