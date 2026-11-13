# Inspector Wren's desk, the night the letter comes: the picture the game
# opens on out of the opening film (src/ui/prologue.js, introVideo.js). It is
# made to stand in for the old generated picture exactly — the same camera,
# the same things where they lay — because the film's last shot hands over
# to it by a dissolve, and because the game keeps things alive on it at the
# old picture's own pixels (1672 x 941): the letter, the file and the plate
# that are clicked, the panes the rain runs down.
#
# So everything is placed by where it falls in that picture: a pixel and a
# height (or a depth) give the point of the room it is seen at, through this
# camera. The camera is low over the desk, looking a little down at it and on
# to the window; a shift keeps the window's uprights upright.
#
#   blender -b -P wren_desk.py -- [--preview] [--out path.png] [--samples n]

import bpy, bmesh, math, os, random, sys
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
PW, PH = 1672, 941                     # the old picture, whose pixels the game keeps
PREVIEW = "--preview" in ARGS
SCALE = float(arg("--scale", "0.5" if PREVIEW else "1.5"))
OUT = arg("--out", os.path.join(ROOT, ".artifacts/wren-desk/wren-desk.png"))
random.seed(7)
T0 = __import__("time").time()

DZ = 0.76                              # the desk's top
EYE = (0.0, 0.0, DZ + 0.40)
LENS, PITCH, SHIFT = 27.0, -9.0, -0.115
WALL = 1.95                            # the window wall, this far ahead of the eye

scene = fresh()
cd = bpy.data.cameras.new("eye"); cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36; cd.lens = LENS
cd.shift_y = SHIFT; cd.clip_start = 0.02; cd.clip_end = 120
cam = link(bpy.data.objects.new("eye", cd)); cam.location = EYE
cam.rotation_euler = (math.radians(90 + PITCH), 0, 0)
scene.camera = cam
scene.render.resolution_x, scene.render.resolution_y = round(PW * SCALE), round(PH * SCALE)
bpy.context.view_layer.update()

# ── where a pixel of the old picture is, in the room ───────────────────────
print("STAGE", round(__import__("time").time() - T0, 1), "where a pixel of the old pictu")
def ray(px, py):
    frame = [cam.matrix_world @ v for v in cam.data.view_frame(scene=scene)]  # TR, BR, BL, TL
    u, v = px / PW, py / PH
    top = frame[3].lerp(frame[0], u); bottom = frame[2].lerp(frame[1], u)
    o = cam.matrix_world.translation
    return o, (top.lerp(bottom, v) - o).normalized()
def on_z(px, py, z):
    o, d = ray(px, py); t = (z - o.z) / d.z; return o + d * t
def on_y(px, py, y):
    o, d = ray(px, py); t = (y - o.y) / d.y; return o + d * t
def pixel(p):
    from bpy_extras.object_utils import world_to_camera_view
    v = world_to_camera_view(scene, cam, Vector(p)); return (round(v.x * PW, 1), round((1 - v.y) * PH, 1))

# ── materials ──────────────────────────────────────────────────────────────
print("STAGE", round(__import__("time").time() - T0, 1), "materials ────────────────────")
desk_wood = pbr("desk wood", "dark_wood", size=0.9, tint=(0.46, 0.36, 0.3), bright=0.45, rough=(0.5, 0.8), dirt=0.3, edges=0.25, grime=0.2)
leather_top = pbr("desk leather", "Leather037", size=0.5, tint=(0.075, 0.15, 0.065), sat=0.35, bright=0.7, rough=(0.6, 0.88), bump=0.9, grime=0.3, stains=0.25)
folio_leather = pbr("folio leather", "Leather037", size=0.16, tint=(0.2, 0.075, 0.05), sat=0.8, bright=0.7, rough=(0.32, 0.58), bump=1.6, grime=0.35, stains=0.3, spec=0.4)
box_leather = pbr("box leather", "Leather031", size=0.3, tint=(1.4, 0.8, 0.5), bright=2.2, rough=(0.45, 0.75), bump=0.6, grime=0.2)
wall_mat = pbr("wall", "plastered_wall_04", size=1.6, tint=(0.25, 0.22, 0.18), bright=0.6, rough=(0.7, 0.95), dirt=0.4, grime=0.3)
frame_wood = pbr("window wood", "dark_wood", size=0.7, tint=(0.42, 0.32, 0.24), bright=0.6, rough=(0.5, 0.78), dirt=0.3, edges=0.2, upright=True)
rose = pbr("plate wood", "rosewood_veneer1", size=0.25, tint=(0.6, 0.38, 0.3), bright=0.6, rough=(0.38, 0.6), edges=0.2)
brass = aged_metal("brass", (0.62, 0.44, 0.2), (0.16, 0.1, 0.05), rough=(0.26, 0.55), tarnish=0.5)
plate_brass = aged_metal("plate brass", (0.5, 0.36, 0.17), (0.2, 0.13, 0.06), rough=(0.42, 0.62), tarnish=0.35, scale=9)
enamel = plain("shade enamel", (0.014, 0.013, 0.012), rough=0.22, spec=0.6)
shade_in = plain("shade inside", (0.8, 0.56, 0.32), rough=0.6, emit=(1.0, 0.62, 0.3), strength=0.3)
bulb = plain("bulb", (1, 0.9, 0.7), emit=(1.0, 0.72, 0.42), strength=60)
envelope_paper = pbr("envelope paper", "Paper003", size=0.3, tint=(0.95, 0.9, 0.8), bright=1.0, rough=(0.8, 0.95), bump=0.3)
cream = pbr("papers", "Paper001", size=0.3, tint=(0.38, 0.36, 0.31), rough=(0.8, 0.95), bump=0.3)
wax = plain("wax", (0.16, 0.02, 0.016), rough=0.5, spec=0.4)
black_lac = plain("pencil black", (0.012, 0.012, 0.012), rough=0.42)
wood_bare = plain("pencil wood", (0.55, 0.38, 0.22), rough=0.8)
graphite = plain("graphite", (0.05, 0.05, 0.05), rough=0.35, metal=0.6)
ink = plain("engraving", (0.02, 0.015, 0.01), rough=0.7)
glass = plain("glass", (0.92, 0.95, 1.0), rough=0.07, transmission=1.0, ior=1.12, spec=0.4)
water = plain("water", (1, 1, 1), rough=0.0, transmission=1.0, ior=1.33)
velvet = pbr("curtain", "velour_velvet", size=0.5, tint=(0.18, 0.12, 0.1), bright=0.5, rough=(0.7, 0.95))

# ── the desk ───────────────────────────────────────────────────────────────
print("STAGE", round(__import__("time").time() - T0, 1), "the desk ─────────────────────")
back = on_z(836, 600, DZ).y              # where the desk's top ends, against the dark
desk = box("desk", -2.0, 2.0, 0.15, back, DZ - 0.05, DZ, desk_wood); bevel(desk, 0.01, 3)
# the leather let into it, a tooled line round its edge
lf, lr = on_z(640, 848, DZ), on_z(1515, 848, DZ)
inset = box("desk leather", -1.2, lr.x, lf.y, back - 0.04, DZ, DZ + 0.0012, leather_top)
gilt = aged_metal("tooling", (0.45, 0.33, 0.16), (0.12, 0.08, 0.04), rough=(0.4, 0.7))
for name, (x0, x1, y0, y1) in {"tooling front": (-1.2, lr.x - 0.018, lf.y + 0.016, lf.y + 0.019),
                               "tooling right": (lr.x - 0.021, lr.x - 0.018, lf.y + 0.016, back - 0.06)}.items():
    box(name, x0, x1, y0, y1, DZ + 0.0012, DZ + 0.0016, gilt)

# ── the wall and its window ───────────────────────────────────────────────
print("STAGE", round(__import__("time").time() - T0, 1), "the wall and its window ──────")
pane_l, pane_r = on_y(738, 300, WALL), on_y(1429, 300, WALL)
sill_z = on_y(1100, 486, WALL).z
mull = {"left": (on_y(915, 300, WALL).x, on_y(939, 300, WALL).x), "right": (on_y(1158, 300, WALL).x, on_y(1183, 300, WALL).x)}
bar_z = (on_y(1050, 178, WALL).z, on_y(1050, 152, WALL).z)
top_z = sill_z + 2.2
fl, fr = on_y(724, 300, WALL).x, on_y(1445, 300, WALL).x
# the wall, with the window cut through it
wall = box("wall", -3.5, 3.5, WALL, WALL + 0.06, 0.0, 3.2, wall_mat)
cut = box("cut", fl, fr, WALL - 0.1, WALL + 0.2, sill_z - 0.02, top_z, wall_mat); boolean_cut(wall, cut)
# the reveal and the frame, in old dark wood
for name, (x0, x1, z0, z1) in {"frame left": (fl, pane_l.x, sill_z - 0.02, top_z), "frame right": (pane_r.x, fr, sill_z - 0.02, top_z),
                               "mullion left": (*mull["left"], sill_z, top_z), "mullion right": (*mull["right"], sill_z, top_z),
                               "bar": (pane_l.x, pane_r.x, *bar_z)}.items():
    o = box(name, x0, x1, WALL + 0.0, WALL + 0.07, z0, z1, frame_wood); bevel(o, 0.004, 2)
# the sill: a deep ledge before the window, the books and ornament on it
ledge_front = on_z(1000, 545, sill_z).y
ledge = box("ledge", -0.9, 1.1, ledge_front, WALL + 0.02, sill_z - 0.045, sill_z, frame_wood); bevel(ledge, 0.006, 2)
box("under the ledge", -0.9, 1.1, ledge_front + 0.01, WALL, DZ - 0.3, sill_z - 0.045, wall_mat)
pane = box("glass", pane_l.x, pane_r.x, WALL + 0.034, WALL + 0.038, sill_z, top_z, glass)
pane.visible_shadow = False

# rain on the glass, on its outer face: drops, and here and there a run
def drops():
    # one small sphere, flattened against the glass, copied for every drop
    seg, rings = 8, 5
    tv = [(0.0, 0.0, 1.0)] + [(math.sin(math.pi * j / rings) * math.cos(math.tau * i / seg), math.sin(math.pi * j / rings) * math.sin(math.tau * i / seg), math.cos(math.pi * j / rings)) for j in range(1, rings) for i in range(seg)] + [(0.0, 0.0, -1.0)]
    tf = [(0, 1 + (i + 1) % seg, 1 + i) for i in range(seg)]
    for j in range(rings - 2):
        for i in range(seg):
            a_, b_ = 1 + j * seg + i, 1 + j * seg + (i + 1) % seg
            tf.append((a_, b_, b_ + seg, a_ + seg))
    last = len(tv) - 1
    tf += [(last, 1 + (rings - 2) * seg + i, 1 + (rings - 2) * seg + (i + 1) % seg) for i in range(seg)]
    verts, faces = [], []
    y = WALL + 0.039
    for i in range(3200):
        x = random.uniform(pane_l.x, pane_r.x); z = random.uniform(sill_z, sill_z + 1.1)
        r = random.choice((0.0016, 0.0022, 0.003, 0.0038, 0.005)) * random.uniform(0.8, 1.2)
        run = 1.0 if random.random() > 0.06 else random.uniform(3, 9)
        base = len(verts)
        # (the sphere's pole axis along y, so it sits flat on the pane)
        verts += [(x + vx * r, y + abs(vz) * r * 0.45, z + vy * r * run) for vx, vy, vz in tv]
        faces += [tuple(base + k for k in face) for face in tf]
    me = bpy.data.meshes.new("rain"); me.from_pydata(verts, [], faces); me.update()
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new("rain", me)); me.materials.append(water); o.visible_shadow = False
drops()

# curtains either side, heavy and dark
def curtain(name, x0, x1, folds):
    bm = bmesh.new(); n = 60
    cols = []
    for i in range(n + 1):
        u = i / n; x = x0 + (x1 - x0) * u
        dy = 0.035 * math.sin(u * folds * math.tau) + 0.01 * math.sin(u * 23)
        cols.append([bm.verts.new((x, WALL - 0.12 + dy, z)) for z in (DZ - 0.3, top_z)])
    for a, b in zip(cols, cols[1:]): bm.faces.new((a[0], b[0], b[1], a[1]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new(name, me)); me.materials.append(velvet)
    s = o.modifiers.new("t", "SOLIDIFY"); s.thickness = 0.01
curtain("curtain left", on_y(540, 300, WALL - 0.12).x, fl + 0.02, 3.5)
curtain("curtain right", fr - 0.02, on_y(1530, 300, WALL - 0.12).x, 2.0)

# ── outside: the street in the rain ───────────────────────────────────────
# The study is a floor up. Across the road, on the left, a terrace of old
# stone houses, a window or two still lit; on the right a street runs away
# from us between lower houses, wet, the far end under a little sky; at its
# corner on our side the street lamp, its lantern where the old picture had it.
LAMP_D = WALL + 6.0
head = on_y(1325, 238, LAMP_D)
GZ = head.z - 4.3                      # the street, below the study
FAR = WALL + 22.0                      # the terrace's front, across the road
CORNER = 3.2                           # where the terrace ends and the street turns away
road = pbr("wet road", "slate_driveway", size=1.4, tint=(0.36, 0.37, 0.4), bright=0.55, rough=(0.02, 0.14), bump=0.25)
box("road", -30, 40, WALL + 0.3, WALL + 120, GZ - 0.05, GZ, road)
pave = pbr("pavement", "checkered_pavement_tiles", size=1.0, tint=(0.4, 0.39, 0.38), bright=0.55, rough=(0.04, 0.22))
box("far pavement", -30, CORNER, FAR - 2.4, FAR, GZ, GZ + 0.14, pave)
box("near pavement", -30, 40, WALL + 0.3, WALL + 2.6, GZ, GZ + 0.14, pave)
box("side pavement", CORNER + 7.0, CORNER + 9.4, FAR - 9.0, WALL + 120, GZ, GZ + 0.14, pave)
stone = pbr("terrace stone", "old_sandstone_02", size=2.5, tint=(0.5, 0.5, 0.5), bright=0.65, sat=0.6, rough=(0.6, 0.9), streaks=0.3, grime=0.3)
brick = pbr("street brick", "white_sandstone_bricks_03", size=2.0, tint=(0.42, 0.4, 0.4), bright=0.6, sat=0.5, rough=(0.6, 0.9), streaks=0.3, grime=0.35)
slate = pbr("roof slate", "roof_slates_02", size=1.5, tint=(0.25, 0.27, 0.3), bright=0.6, rough=(0.3, 0.6))
sash = pbr("sash", "dark_wood", size=0.5, tint=(0.3, 0.26, 0.22), bright=0.5)
lit_window = plain("lit window", (0.1, 0.08, 0.05), emit=(1.0, 0.66, 0.34), strength=5.0)
dark_window = plain("dark window", (0.012, 0.016, 0.022), rough=0.06, spec=0.7)
def front(name, x0, x1, at, h, mat, seed, facing="y", lit_k=0.25, bay=2.4, storeys=3, sign=1):
    """a row of houses: its front a plane at `at` (y, or x if facing x),
    running x0..x1 along it, `h` to the eaves, sash windows in bays, a
    slate roof over"""
    rnd = random.Random(seed)
    def B(n, a0, a1, d0, d1, z0, z1, m):
        return box(n, a0, a1, d0, d1, z0, z1, m) if facing == "y" else box(n, d0, d1, a0, a1, z0, z1, m)
    B(name, x0, x1, at, at + sign * 9, GZ, GZ + h, mat)
    B(name + " cornice", x0, x1, at - sign * 0.3, at, GZ + h - 0.5, GZ + h - 0.25, mat)
    roof = B(name + " roof", x0, x1, at + sign * 0.2, at + sign * 9, GZ + h, GZ + h + 2.6, slate)
    for i in range(int((x1 - x0) / bay)):
        for floor in range(storeys):
            a = x0 + 0.7 + i * bay; z = GZ + 1.1 + floor * 3.1
            if z + 1.9 > GZ + h - 0.7: continue
            lit = rnd.random() < lit_k
            B(f"{name} pane {i}-{floor}", a, a + 1.0, at - sign * 0.03, at - sign * 0.02, z, z + 1.9, lit_window if lit else dark_window)
            for k, (p0, p1, q0, q1) in enumerate([(a - 0.08, a + 1.08, z - 0.14, z), (a - 0.08, a, z, z + 1.9), (a + 1.0, a + 1.08, z, z + 1.9), (a - 0.08, a + 1.08, z + 1.9, z + 2.04), (a, a + 1.0, z + 0.92, z + 0.98), (a + 0.47, a + 0.53, z, z + 1.9)]):
                B(f"{name} sash {i}-{floor}-{k}", p0, p1, at - sign * 0.07, at, q0, q1, sash)
front("terrace", -30, CORNER, FAR, 10.0, stone, 1, lit_k=0.5)
# down the side street: its left side the terrace's flank, its right a lower row
front("terrace flank", FAR, FAR + 9, CORNER, 10.0, stone, 2, facing="x", lit_k=0.0, sign=-1)
front("lower row", FAR - 6.0, WALL + 110, CORNER + 9.4, 6.6, brick, 3, facing="x", lit_k=0.12, storeys=2)
sky = bpy.data.worlds.new("night"); scene.world = sky; sky.use_nodes = True
bg = sky.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.07, 0.095, 0.14, 1); bg.inputs[1].default_value = 1.0
# the street lamp
# (made here: a plain iron post, a four-sided lantern of glass on it)
iron = plain("iron", (0.02, 0.02, 0.022), rough=0.45, metal=0.6)
cylinder("lamp post", head.x, LAMP_D, GZ, head.z - 0.32, 0.06, iron, verts=16, r2=0.04)
cylinder("lamp collar", head.x, LAMP_D, head.z - 0.36, head.z - 0.3, 0.07, iron, verts=16)
lantern_glass = plain("lantern glass", (1.0, 0.85, 0.6), rough=0.3, transmission=0.6, emit=(1.0, 0.7, 0.4), strength=6)
cylinder("lantern", head.x, LAMP_D, head.z - 0.3, head.z + 0.22, 0.13, lantern_glass, verts=4, r2=0.19).rotation_euler.z = 0.0
cylinder("lantern cap", head.x, LAMP_D, head.z + 0.22, head.z + 0.42, 0.22, iron, verts=4, r2=0.03)
glow = lamp("street lamp", "POINT", tuple(head), energy=900, colour=(1.0, 0.66, 0.34), size=0.12)
lantern = sphere("lantern glow", tuple(head), 0.06, plain("lantern", (1, 0.8, 0.5), emit=(1.0, 0.74, 0.42), strength=16))
lantern.visible_shadow = False
# more lamps down the side street, and one along the terrace
for k, d in enumerate((28, 55, 85)):
    lamp(f"street lamp {k}", "POINT", (CORNER + 8.6, WALL + d, GZ + 4.2), energy=900, colour=(1.0, 0.68, 0.38), size=0.1)
    sphere(f"far lantern {k}", (CORNER + 8.6, WALL + d, GZ + 4.2), 0.12, bpy.data.materials["lantern"])
lamp("terrace lamp", "POINT", (-6.0, FAR - 2.2, GZ + 4.2), energy=1200, colour=(1.0, 0.7, 0.4), size=0.1)
# the sky's cold glow on the fronts, and the moon over the roofs
lamp("sky on the terrace", "AREA", (0.0, FAR - 8.0, GZ + 14.0), aim=(0.0, FAR, GZ + 4.0), energy=8500, colour=(0.55, 0.65, 0.95), size=16)
lamp("moon", "SUN", (0, WALL + 5, 8), aim=(0.3, WALL - 1, 0), energy=1.0, colour=(0.62, 0.72, 1.0), angle=0.05)

# ── the lamp on the desk: a brass swan-neck, its dome of dark enamel ─────
print("STAGE", round(__import__("time").time() - T0, 1), "the lamp on the desk: a brass ")
base_at = on_z(62, 552, DZ + 0.04)
for k, (w, d_, h, tint) in enumerate([(0.22, 0.17, 0.022, (0.09, 0.05, 0.035)), (0.19, 0.15, 0.016, (0.05, 0.035, 0.03))]):
    z0 = DZ + (0 if k == 0 else 0.025)
    b = box(f"book under the lamp {k}", base_at.x - w / 2, base_at.x + w / 2, base_at.y - d_ / 2, base_at.y + d_ / 2, z0, z0 + h, pbr(f"lamp book {k}", "Leather031", size=0.2, tint=tuple(c * 12 for c in tint), bright=1.0, rough=(0.45, 0.75), spec=0.25))
    bevel(b, 0.003, 2)
base_at = Vector((base_at.x, base_at.y, DZ + 0.043))
lathe("lamp base", [(0.0, 0.0), (0.075, 0.0), (0.078, 0.007), (0.066, 0.014), (0.04, 0.022), (0.026, 0.04), (0.02, 0.06), (0.024, 0.075), (0.0, 0.075)], brass, at=base_at)
shade_c = on_y(250, 292, base_at.y + 0.02)
from desk_kit import wire
arm = [base_at + Vector((0, 0, 0.07)), base_at + Vector((0.005, 0.0, 0.2)), base_at + Vector((0.03, 0.01, 0.34)), base_at.lerp(shade_c, 0.55) + Vector((0, 0.0, 0.18)), shade_c + Vector((-0.07, 0, 0.07))]
wire("lamp arm", [tuple(p) for p in arm], 0.007, brass)
sr = (on_y(395, 290, shade_c.y) - on_y(100, 290, shade_c.y)).length / 2
prof = [(1.0, 0.0), (0.99, 0.03), (0.95, 0.15), (0.86, 0.32), (0.7, 0.48), (0.48, 0.6), (0.22, 0.67), (0.0, 0.69)]
shade = lathe("shade", [(sr * f, sr * h) for f, h in prof], enamel, at=shade_c)
s = shade.modifiers.new("t", "SOLIDIFY"); s.thickness = 0.0025; s.offset = 1
inner = lathe("shade inside", [(sr * f * 0.99, sr * h - 0.0008) for f, h in prof], shade_in, at=shade_c)
for n in inner.data.polygons: n.flip()
rim = cylinder("shade rim", 0, 0, -0.002, 0.004, sr * 1.01, brass, verts=64, open_ends=True); rim.location = shade_c
bulb_o = sphere("bulb", (0, 0, 0), 0.026, bulb)
for o in (shade, inner, rim, bulb_o):
    o.rotation_euler = (math.radians(-5), math.radians(-18), 0)
bulb_o.location = shade_c + (Matrix.Rotation(math.radians(-18), 3, "Y") @ Matrix.Rotation(math.radians(-5), 3, "X") @ Vector((0, 0, sr * 0.3)))
key = lamp("desk lamp", "SPOT", tuple(bulb_o.location - Vector((0, 0, 0.02))), aim=tuple(on_z(520, 690, DZ)), energy=20, colour=(1.0, 0.72, 0.44), size=0.04, spot=math.radians(125))

# ── the file: an old leather document wallet, open, things sticking out ───
print("STAGE", round(__import__("time").time() - T0, 1), "the file: an old leather docum")
def corner(px, py, z=DZ): return on_z(px, py, z)
F = [corner(330, 546), corner(806, 603), corner(566, 792), corner(-150, 712)]   # far left, far right, near right, near left
def quad(name, pts, mat, thick=0.004, round_=0.003):
    uvs = [(0, 1), (1, 1), (1, 0), (0, 0)][:len(pts)]
    # always facing up, so that its thickness stands up off what it lies on
    # (the corners come far-left first, clockwise seen from above, which
    # would face it down and sink its thickness into the desk)
    area = sum(a.x * b.y - b.x * a.y for a, b in zip(pts, pts[1:] + pts[:1]))
    if area < 0: pts, uvs = pts[::-1], uvs[::-1]
    bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    vs = [bm.verts.new(p) for p in pts]; f = bm.faces.new(vs)
    for lp, c in zip(f.loops, uvs): lp[uv].uv = c
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); me.materials.append(mat)
    if thick:
        m = o.modifiers.new("t", "SOLIDIFY"); m.thickness = thick; m.offset = 1
        bevel(o, min(round_, thick * 0.9), 3)
    return o
def mixp(a, b, k): return a.lerp(b, k)
def at(u, v, h=0.0):
    """a point of the file: u from its left to its right, v from its far edge to its near"""
    return mixp(mixp(F[0], F[1], u), mixp(F[3], F[2], u), v) + Vector((0, 0, h))
def rect(name, u0, u1, v0, v1, h, mat, thick=0.0004, turn=0.0):
    o = quad(name, [at(u0, v0, h), at(u1, v0, h), at(u1, v1, h), at(u0, v1, h)], mat, thick, 0.0002)
    if turn:
        c = at((u0 + u1) / 2, (v0 + v1) / 2, h)
        o.data.transform(Matrix.Translation(-c)); o.data.transform(Matrix.Rotation(math.radians(turn), 4, "Z")); o.location = c
    return o
def bw_print(name, image):
    m = paper(name, (0.8, 0.78, 0.72), foxing=0.05, image=image if os.path.exists(image) else None)
    nt = m.node_tree
    for n in nt.nodes:
        if n.type == "TEX_IMAGE":
            bw = nt.nodes.new("ShaderNodeRGBToBW"); out = n.outputs["Color"].links[0].to_socket
            nt.links.new(n.outputs["Color"], bw.inputs[0]); nt.links.new(bw.outputs[0], out)
    return m
# A document wallet, as the old picture has it: a thick back board, the
# case's papers in it — their edges seen in a block along its near side —
# and over their left the pocket's front, its slanted mouth, out of which the
# papers and photographs come spread to the right.
B0 = 0.0012                                   # on the desk's leather
BACK = 0.007                                  # the back board's thickness
quad("file back", F, folio_leather, BACK, 0.0035)
# the papers in it: a block wider than the pocket, so its edge shows between
# the boards; then the loose ones, fanned out of its mouth
for i, (u0, u1, v0, v1, turn) in enumerate([(0.03, 0.95, 0.06, 0.96, 0), (0.04, 0.97, 0.1, 0.95, -1.5), (0.05, 0.96, 0.05, 0.93, 1)]):
    rect(f"stack {i}", u0, u1, v0, v1, B0 + BACK + 0.0003 + i * 0.0012, cream, thick=0.001, turn=turn)
P0 = B0 + BACK + 0.0039                       # the top of the block
for i, (u0, u1, v0, v1, turn) in enumerate([(0.5, 0.98, 0.12, 0.9, -3), (0.52, 1.0, 0.18, 0.86, 4), (0.5, 0.94, 0.08, 0.8, -6), (0.56, 0.99, 0.3, 0.95, 2)]):
    rect(f"paper {i}", u0, u1, v0, v1, P0 + 0.0002 + i * 0.0006, cream, turn=turn)
rect("photograph", 0.6, 0.84, 0.16, 0.5, P0 + 0.003, bw_print("photograph", os.path.join(ROOT, "public/assets/images/Manor/ashcombe-exterior-render-v2.webp")), 0.0006, turn=-4)
rect("photograph 2", 0.7, 0.92, 0.48, 0.78, P0 + 0.0026, bw_print("photograph 2", os.path.join(ROOT, "public/assets/images/Room1/room1-lights-1-render-v12.webp")), 0.0006, turn=7)
rect("card", 0.64, 0.86, 0.72, 0.9, P0 + 0.0023, plain("card", (0.55, 0.52, 0.46), rough=0.9), 0.0005, turn=-2)
# one more, a portrait, put in at the top, standing out above the pocket
rect("portrait", 0.2, 0.42, -0.06, 0.2, P0 + 0.0003, bw_print("portrait", os.path.join(ROOT, "public/assets/images/Manor/ashcombe-wind-background-v1.webp")), 0.0006, turn=3)
# the pocket's front, over the left of it, its mouth slanting, lifted a
# little at the mouth by what comes out of it
FRONT = 0.0035
flap = quad("file flap", [at(0.0, 0.07, P0 + 0.0012), at(0.6, 0.12, P0 + 0.0042), at(0.53, 1.0, P0 + 0.0008), at(0.0, 1.0, P0)], folio_leather, FRONT, 0.003)
# its sides, closing the pocket down to the back board at the left and the near edge
quad("pocket side", [at(0.0, 0.07, B0 + 0.002), at(0.0, 0.07, P0 + 0.0012 + FRONT), at(0.0, 1.0, P0 + FRONT), at(0.0, 1.0, B0 + 0.002)], folio_leather, 0.0)
thread = plain("thread", (0.62, 0.5, 0.34), rough=0.85)
def stitch(name, a, b, step=0.007, inset=Vector((0, 0, 0))):
    n = max(2, int((b - a).length / step))
    d = (b - a).normalized()
    bm = bmesh.new()
    for i in range(n):
        p = a.lerp(b, (i + 0.25) / n) + inset
        q = p + d * step * 0.55
        side = Vector((-d.y, d.x, 0)) * 0.0007
        for v in (p - side, q - side, q + side, p + side): bm.verts.new(v)
        bm.verts.ensure_lookup_table(); vs = bm.verts[-4:]; bm.faces.new(vs)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); me.materials.append(thread)
def toward(p, c, k): return p.lerp(c, k)
mid_flap = at(0.28, 0.6, 0.0)
TOP = P0 + FRONT + 0.0002                     # on the pocket's front
fl_pts = [at(0.0, 0.07, TOP + 0.0012), at(0.6, 0.12, TOP + 0.0042), at(0.53, 1.0, TOP + 0.0008)]
fl_pts = [toward(p, mid_flap + Vector((0, 0, p.z - DZ)), 0.035) for p in fl_pts]
stitch("flap stitching top", fl_pts[0], fl_pts[1]); stitch("flap stitching side", fl_pts[1], fl_pts[2])
# round the back board's edge where the papers leave it bare
mid_back = at(0.5, 0.5, 0.0)
bk = [toward(at(u, v, B0 + BACK + 0.0002), mid_back + Vector((0, 0, B0 + BACK + 0.0002)), 0.025) for u, v in ((0.62, 0), (1, 0), (1, 1), (0.6, 1))]
stitch("back stitching top", bk[0], bk[1]); stitch("back stitching side", bk[1], bk[2]); stitch("back stitching near", bk[2], bk[3])
# its label, typed, and its snap
lab0 = at(0.16, 0.32, TOP + 0.0008); lab1 = at(0.36, 0.34, TOP + 0.0012); lab3 = at(0.16, 0.42, TOP + 0.0006)
label_mat = paper("label", (0.62, 0.58, 0.5), foxing=0.15)
quad("label", [lab0, lab1, lab1 + (lab3 - lab0), lab3], label_mat, 0.0)
snap = at(0.3, 0.13, TOP + 0.0014)
cylinder("snap", snap.x, snap.y, snap.z - 0.001, snap.z + 0.0025, 0.007, brass)

# ── the letter ───────────────────────────────────────────────────────────
print("STAGE", round(__import__("time").time() - T0, 1), "the letter ───────────────────")
E = [on_z(802, 704, DZ), on_z(1138, 716, DZ), on_z(1150, 809, DZ), on_z(727, 792, DZ)]
env = quad("envelope", [p + Vector((0, 0, 0.0016)) for p in E], envelope_paper, 0.0012)
# the flap's folds: a faint V of shadow, made by a flap a hair above
apex = mixp(mixp(E[3], E[2], 0.5), mixp(E[0], E[1], 0.5), 0.42)
quad("flap", [E[0] + Vector((0, 0, 0.0029)), E[1] + Vector((0, 0, 0.0029)), apex + Vector((0, 0, 0.0034)), apex + Vector((0, 0, 0.0034))], envelope_paper, 0.0003)
seal_at = on_z(962, 750, DZ + 0.004)
seal = cylinder("seal", seal_at.x, seal_at.y, DZ + 0.003, DZ + 0.0065, 0.017, wax, verts=40)
bm = bmesh.new(); bm.from_mesh(seal.data)
for v in bm.verts:
    a_ = math.atan2(v.co.y - seal_at.y, v.co.x - seal_at.x)
    k = 1 + 0.08 * math.sin(a_ * 7) + 0.05 * math.sin(a_ * 13)
    v.co.x = seal_at.x + (v.co.x - seal_at.x) * k; v.co.y = seal_at.y + (v.co.y - seal_at.y) * k
bm.to_mesh(seal.data); bm.free(); bevel(seal, 0.0015, 3)
cylinder("seal boss", seal_at.x, seal_at.y, DZ + 0.0065, DZ + 0.0075, 0.0105, wax, verts=40)

# ── his name, on brass, on a block of wood ─────────────────────────────────
print("STAGE", round(__import__("time").time() - T0, 1), "his name, on brass, on a block")
nl, nr = on_z(900, 668, DZ), on_z(1174, 672, DZ)
W_ = nr.x - nl.x
# a plinth, and on it a board leaning back a little, the brass let into its face
plinth = box("plate plinth", nl.x, nr.x, nl.y - 0.004, nl.y + 0.06, DZ, DZ + 0.013, rose); bevel(plinth, 0.004, 3)
top = on_y(1040, 558, nl.y + 0.02).z
H_ = top - DZ - 0.013
board = box("plate board", -W_ / 2 + 0.006, W_ / 2 - 0.006, -0.011, 0.011, 0.0, H_, rose); bevel(board, 0.004, 3)
board.location = ((nl.x + nr.x) / 2, nl.y + 0.03, DZ + 0.012); board.rotation_euler.x = math.radians(-10)
plate = box("plate", -W_ / 2 + 0.024, W_ / 2 - 0.024, -0.0125, -0.0105, 0.0, H_ - 0.03, plate_brass); bevel(plate, 0.0008, 2)
plate.parent = board; plate.location = (0, 0, 0.015)
font = bpy.data.fonts.load("C:/Windows/Fonts/times.ttf")
tc_ = bpy.data.curves.new("name", "FONT"); tc_.body = "Inspector Arthur Wren"; tc_.font = font
tc_.align_x = "CENTER"; tc_.align_y = "CENTER"; tc_.size = (W_ - 0.07) / 7.4; tc_.extrude = 0.00008
txt = link(bpy.data.objects.new("name", tc_)); txt.data.materials.append(ink)
txt.parent = plate; txt.location = (0, -0.0126, (H_ - 0.03) / 2); txt.rotation_euler = (math.pi / 2, 0, 0)
for k, x in enumerate((-W_ / 2 + 0.032, W_ / 2 - 0.032)):
    pin = sphere(f"pin {k}", (0, 0, 0), 0.0018, plate_brass, squash=(1, 0.5, 1)); pin.parent = plate; pin.location = (x, -0.0125, (H_ - 0.03) / 2)

# ── the pencil ───────────────────────────────────────────────────────────
print("STAGE", round(__import__("time").time() - T0, 1), "the pencil ───────────────────")
pa, pb = on_z(1192, 684, DZ + 0.0045), on_z(1368, 770, DZ + 0.0045)
d_ = (pb - pa); L = d_.length
pen = cylinder("pencil", 0, 0, 0, L * 0.86, 0.0052, black_lac, verts=6)
tip = cylinder("pencil wood", 0, 0, -L * 0.07, 0.0, 0.0012, wood_bare, verts=12, r2=0.0042)
lead = cylinder("pencil lead", 0, 0, -L * 0.085, -L * 0.07, 0.0, graphite, verts=12, r2=0.0012)
fer = cylinder("ferrule", 0, 0, L * 0.86, L * 0.95, 0.0045, brass, verts=24)
end = cylinder("pencil end", 0, 0, L * 0.95, L * 0.99, 0.0043, black_lac, verts=24)
rot = Vector((0, 0, 1)).rotation_difference(d_.normalized())
for o in (pen, tip, lead, fer, end):
    o.rotation_mode = "QUATERNION"; o.rotation_quaternion = rot; o.location = pa

# ── to the right: the pen pot, an inkwell, a box, books ─────────────────────
print("STAGE", round(__import__("time").time() - T0, 1), "to the right: the pen pot, an ")
pot = on_z(1470, 668, DZ)
pot_top = on_y(1470, 505, pot.y).z
lathe("pen pot", [(0.0, 0.0), (0.03, 0.0), (0.032, 0.006), (0.026, 0.012), (0.024, pot_top - DZ - 0.01), (0.027, pot_top - DZ), (0.0, pot_top - DZ)], aged_metal("pot brass", (0.48, 0.34, 0.16), (0.12, 0.08, 0.04), rough=(0.32, 0.6), tarnish=0.6), at=pot)
for k, (dx, dy, lean, h) in enumerate([(-0.008, 0.0, 0.1, 0.19), (0.008, 0.006, -0.14, 0.17), (0.0, -0.008, 0.2, 0.15)]):
    o = cylinder(f"pen {k}", 0, 0, 0, h, 0.0035, black_lac, verts=10, r2=0.002)
    o.location = pot + Vector((dx, dy, 0.02)); o.rotation_euler = (lean * 0.4, lean, 0)
well = on_z(1415, 640, DZ)
lathe("inkwell", [(0.0, 0.0), (0.035, 0.0), (0.036, 0.008), (0.03, 0.016), (0.012, 0.022), (0.012, 0.03), (0.0, 0.03)], aged_metal("inkwell brass", (0.4, 0.28, 0.13), (0.1, 0.07, 0.04), rough=(0.45, 0.7), tarnish=0.7), at=well)
bx0, bx1 = on_z(1488, 690, DZ), on_z(1720, 690, DZ)
bbox = box("leather box", bx0.x, bx1.x, bx0.y, bx0.y + 0.11, DZ, on_y(1560, 572, bx0.y).z, box_leather); bevel(bbox, 0.006, 3)
clasp = cylinder("clasp", 0, 0, -0.003, 0.003, 0.008, brass, verts=16)
clasp.location = (bx0.x + 0.06, bx0.y - 0.002, on_y(1560, 640, bx0.y).z); clasp.rotation_euler.x = math.pi / 2
# books, made here: boards of leather or cloth, a block of pages, a few bands
def book(name, w, d, h, at, rot=0.0, tint=(0.3, 0.12, 0.08), lying=True, tex="Leather031"):
    """a book `w` across its boards, `d` deep, `h` thick, lying (or stood on
    its tail if not), its foot's middle at `at`, turned `rot`"""
    cover = pbr(f"{name} cover", tex, size=0.2, tint=tuple(c * 22 for c in tint), bright=1.0, rough=(0.65, 0.9), bump=0.6, grime=0.2, spec=0.15)
    pages = plain(f"{name} pages", (0.42, 0.36, 0.26), rough=0.9)
    parts = []
    if lying:
        parts.append(box(f"{name} lower", -w / 2, w / 2, -d / 2, d / 2, 0, 0.003, cover))
        parts.append(box(f"{name} upper", -w / 2, w / 2, -d / 2, d / 2, h - 0.003, h, cover))
        parts.append(box(f"{name} spine", -w / 2 - 0.002, -w / 2 + 0.006, -d / 2, d / 2, 0, h, cover))
        parts.append(box(f"{name} block", -w / 2 + 0.004, w / 2 - 0.003, -d / 2 + 0.003, d / 2 - 0.003, 0.003, h - 0.003, pages))
    else:
        parts.append(box(f"{name} left", -h / 2, -h / 2 + 0.003, -d / 2, d / 2, 0, w, cover))
        parts.append(box(f"{name} right", h / 2 - 0.003, h / 2, -d / 2, d / 2, 0, w, cover))
        parts.append(box(f"{name} spine", -h / 2, h / 2, -d / 2 - 0.002, -d / 2 + 0.006, 0, w, cover))
        parts.append(box(f"{name} block", -h / 2 + 0.003, h / 2 - 0.003, -d / 2 + 0.004, d / 2 - 0.003, 0.003, w - 0.003, pages))
        for k in range(3):
            z = w * (0.18 + k * 0.3)
            parts.append(box(f"{name} band {k}", -h / 2 - 0.0005, h / 2 + 0.0005, -d / 2 - 0.004, -d / 2 + 0.002, z, z + 0.006, brass))
    root = bpy.data.objects.new(name, None); link(root)
    for p in parts: bevel(p, 0.0015, 2); p.parent = root
    root.location = at; root.rotation_euler = (0, 0, rot)
    return root
# two books on the desk's right, one on the other, near the edge
r = on_z(1600, 800, DZ)
book("desk book low", 0.2, 0.15, 0.035, on_z(1650, 850, DZ), math.radians(76), (0.08, 0.045, 0.03))
book("desk book high", 0.17, 0.12, 0.03, on_z(1660, 840, DZ + 0.035), math.radians(84), (0.05, 0.035, 0.028))
# on the sill: two lying, three stood up to the left of the window
sb = on_z(1160, 548, sill_z) + Vector((0, 0.06, 0))
book("sill book low", 0.28, 0.2, 0.045, sb, math.radians(2), (0.08, 0.04, 0.03))
book("sill book high", 0.24, 0.17, 0.035, sb + Vector((0.01, 0.0, 0.045)), math.radians(-3), (0.05, 0.035, 0.03))
ub = on_z(645, 535, sill_z) + Vector((0, 0.07, 0))
for k, (dx, w, t, tint) in enumerate([(-0.05, 0.3, 0.05, (0.08, 0.04, 0.03)), (0.0, 0.27, 0.045, (0.05, 0.035, 0.03)), (0.045, 0.31, 0.055, (0.1, 0.06, 0.035))]):
    book(f"stood book {k}", w, 0.2, t, ub + Vector((dx * 1.2, 0, 0)), math.radians(0), tint, lying=False)
# a bronze urn on the sill, dark with age
bronze = aged_metal("bronze", (0.3, 0.22, 0.13), (0.05, 0.04, 0.03), rough=(0.4, 0.7), tarnish=0.8)
lathe("urn", [(0.0, 0.0), (0.035, 0.0), (0.036, 0.01), (0.018, 0.03), (0.016, 0.05), (0.04, 0.09), (0.046, 0.12), (0.038, 0.15), (0.02, 0.165), (0.024, 0.18), (0.012, 0.2), (0.016, 0.215), (0.0, 0.245)], bronze, at=on_z(762, 530, sill_z) + Vector((0, 0.07, 0)))
# a picture on the wall, up in the corner
pic = import_model("fancy_picture_frame_01", height=0.45, at=tuple(on_y(150, 120, WALL - 0.02)), rot=0.0)

# only what was brought in is aged here; what is made above is made worn
imported = {m.name for o in meshes_of(pic) for m in o.data.materials if m}
age_everything(keep={m.name for m in bpy.data.materials} - imported, own=set())

# the lamp's light off the room, back onto what faces us (the brass, the papers)
bounce = lamp("bounce", "AREA", (0.1, -0.5, 1.45), aim=(0.1, 0.8, DZ), energy=3, colour=(1.0, 0.78, 0.55), size=1.6)
bounce.visible_camera = False
# and up on the walls, warm, as the lamp's light comes off the ceiling
walls_glow = lamp("walls glow", "AREA", (-0.4, 0.9, 2.3), aim=(-0.2, WALL, 1.3), energy=16, colour=(1.0, 0.74, 0.5), size=1.4)
walls_glow.visible_camera = False
# ── a little fill, cold, from the window; the render ──────────────────────
print("STAGE", round(__import__("time").time() - T0, 1), "a little fill, cold, from the ")
fill = lamp("window fill", "AREA", ((pane_l.x + pane_r.x) / 2, WALL - 0.2, sill_z + 0.6), aim=(0, 0.3, DZ), energy=16, colour=(0.72, 0.8, 1.0), size=0.9)
fill.visible_camera = False
cd.dof.use_dof = True; cd.dof.focus_distance = (on_z(1000, 700, DZ) - cam.location).length; cd.dof.aperture_fstop = 5.6
samples = int(arg("--samples", "48" if PREVIEW else "1024"))
cycles(scene, samples, scene.render.resolution_x, scene.render.resolution_y, exposure=float(arg("--exposure", "-0.4")))
scene.cycles.adaptive_threshold = 0.04 if PREVIEW else 0.008
scene.cycles.sample_clamp_indirect = 4.0
os.makedirs(os.path.dirname(OUT), exist_ok=True)
for name, p in {"envelope": E[0], "plate": nl, "shade": shade_c, "pot": pot, "horizon": Vector((0, 30, EYE[2]))}.items(): print("CHECK", name, pixel(p), tuple(round(c, 3) for c in p))
render(scene, OUT, blend="" if PREVIEW else OUT.replace(".png", ".blend"))
