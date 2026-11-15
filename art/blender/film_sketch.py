# The opening film as a moving pencil sketch (2026-11-15): each of Arthur
# Wren's lines (story.js OPENING.asides) a short shot built in 3D and drawn by
# Grease Pencil Line Art — white lines on black, a little boil, the lines
# drawing themselves in — so it moves like film and still looks drawn.
#
#   blender -b --factory-startup -P art/blender/film_sketch.py -- --shot 1 [--stills 1,40,90] [--res 1600x900]
#
# Frames go to .artifacts/film-sketch/shot<N>/; film_sketch_encode.mjs makes
# the clip.

import bpy, math, os, sys
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default):
    return argv[argv.index(name) + 1] if name in argv else default

SHOT = int(arg("--shot", "1"))
SOLID = "--solid" in argv
STILL = "--still" in argv   # the scene frozen, only the camera moving over it
STILLS = [int(s) for s in arg("--stills", "").split(",") if s]
RW, RH = (int(v) for v in arg("--res", "1600x900").split("x"))
FPS = 24
OUT = os.path.join(ROOT, ".artifacts", "film-sketch", f"shot{SHOT}" + ("-still" if "--still" in argv else ""))
os.makedirs(OUT, exist_ok=True)

INK = (0.93, 0.91, 0.86, 1.0)    # the game's white pencil, a touch warm
LINE = 0.00062                     # line radius per metre from the camera: thin

# ── helpers ──────────────────────────────────────────────────────────────
def clamp(v, a=0.0, b=1.0): return max(a, min(b, v))
def smooth(t): t = clamp(t); return t * t * (3 - 2 * t)
def ease_out(t): t = clamp(t); return 1 - (1 - t) ** 3
def ease_in_out(t): t = clamp(t); return 4 * t ** 3 if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2
def span(f, a, b): return clamp((f - a) / (b - a))
def lerp(a, b, t): return a + (b - a) * t
def vlerp(a, b, t): return Vector(a).lerp(Vector(b), t)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE_NEXT"
    sc.render.resolution_x, sc.render.resolution_y = RW, RH
    sc.render.resolution_percentage = 100
    sc.render.fps = FPS
    sc.eevee.taa_render_samples = 16
    sc.view_settings.view_transform = "Standard"
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    w = bpy.data.worlds.new("Dark"); w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0, 0, 0, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0
    sc.world = w
    return sc

BLACK = None
def black():
    global BLACK
    if BLACK is None:
        BLACK = bpy.data.materials.new("unseen")
        BLACK.diffuse_color = (0, 0, 0, 1)
        BLACK.use_nodes = True
        b = BLACK.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        b.inputs["Roughness"].default_value = 1
    return BLACK

def mesh_obj(name, verts, faces, parent=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    me.materials.append(black())
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    if parent: o.parent = parent
    return o

def box(name, x0, y0, z0, x1, y1, z1, parent=None):
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return mesh_obj(name, v, f, parent)

def torus(name, loc, major, minor, parent=None, rot=(math.pi / 2, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=40, minor_segments=10, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name
    o.data.materials.append(black())
    if parent:
        mw = o.matrix_world.copy(); o.parent = parent; o.matrix_world = mw
    return o

FONT = None
def text(name, body, loc, size, parent=None, font="C:/Windows/Fonts/courbd.ttf"):
    global FONT
    if FONT is None and os.path.exists(font): FONT = bpy.data.fonts.load(font)
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = body; cu.size = size; cu.extrude = 0.0004
    cu.align_x = "CENTER"; cu.align_y = "CENTER"; cu.space_line = 1.15
    if FONT: cu.font = FONT
    o = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc; o.rotation_euler = (math.pi / 2, 0, 0)
    bpy.context.view_layer.objects.active = o
    for s in bpy.context.selected_objects: s.select_set(False)
    o.select_set(True)
    bpy.ops.object.convert(target="MESH")
    o = bpy.context.object
    o.data.materials.clear(); o.data.materials.append(black())
    if parent:
        mw = o.matrix_world.copy(); o.parent = parent; o.matrix_world = mw
    return o

def line_art(sc, cam):
    sc.camera = cam
    bpy.ops.object.grease_pencil_add(type="LINEART_SCENE")
    gp = bpy.context.object; gp.name = "Pencil"
    la = gp.modifiers[0]
    la.use_contour = True; la.use_crease = True; la.use_intersection = True
    la.use_loose = False; la.use_material = False; la.use_edge_mark = False
    la.crease_threshold = math.radians(130)
    la.radius = 0.0011
    la.smooth_tolerance = 0.05
    la.overscan = 0.2
    mat = la.target_material or gp.data.materials[0]
    mat.grease_pencil.color = INK
    for layer in gp.data.layers: layer.use_lights = False   # drawn, not lit
    return gp, la

def draw_in(gp, start, frames):
    b = gp.modifiers.new("draw in", "GREASE_PENCIL_BUILD")
    b.mode = "CONCURRENT"; b.transition = "GROW"; b.time_mode = "FRAMES"
    b.start_delay = 0; b.length = frames
    b.use_restrict_frame_range = True; b.frame_start = start; b.frame_end = start + frames + 2
    return b

def look(cam, eye, target, lens):
    cam.location = Vector(eye)
    cam.rotation_euler = (Vector(target) - Vector(eye)).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = lens

# ── a right hand in a jacket sleeve: a skin mesh over a skeleton of points,
#    bent by an armature (the bones bend the points, the skin follows) ────
FINGERS = {  # knuckle (hand space: x forward, y thumb side, z back of hand), phalanx lengths, radii
    "index":  ((0.084, 0.023, 0.002), (0.040, 0.024, 0.019), (0.0098, 0.0090, 0.0082, 0.0074)),
    "middle": ((0.088, 0.004, 0.003), (0.044, 0.027, 0.020), (0.0102, 0.0094, 0.0084, 0.0076)),
    "ring":   ((0.083, -0.015, 0.002), (0.041, 0.026, 0.019), (0.0096, 0.0088, 0.0080, 0.0072)),
    "pinky":  ((0.073, -0.031, 0.000), (0.032, 0.020, 0.017), (0.0086, 0.0078, 0.0072, 0.0066)),
}
THUMB = [(0.020, 0.012, -0.006), (0.046, 0.040, -0.011), (0.070, 0.051, -0.011), (0.089, 0.055, -0.009)]
THUMB_R = (0.0135, 0.0118, 0.0098, 0.0086)

def build_hand():
    arm_data = bpy.data.armatures.new("ArmRig")
    rig = bpy.data.objects.new("Arm", arm_data)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm_data.edit_bones
    def bone(name, head, tail, parent=None):
        b = eb.new(name); b.head = head; b.tail = tail; b.roll = 0
        if parent: b.parent = eb[parent]; b.use_connect = False
        return b
    bone("forearm", (-0.30, 0, 0), (0, 0, 0))
    bone("hand", (0, 0, 0), FINGERS["middle"][0], "forearm")
    for f, (k, ls, _) in FINGERS.items():
        a = Vector(k)
        for i, l in enumerate(ls):
            b = a + Vector((l, 0, 0))
            bone(f"{f}{i+1}", a, b, "hand" if i == 0 else f"{f}{i}")
            a = b
    for i in range(3):
        bone(f"thumb{i+1}", THUMB[i], THUMB[i + 1], "hand" if i == 0 else f"thumb{i}")
    bpy.ops.object.mode_set(mode="OBJECT")

    # the skeleton of points, each on the bone that carries it
    verts, edges, radii, groups, roots = [], [], [], [], []
    def v(p, r, g):
        verts.append(tuple(p)); radii.append(r); groups.append(g); return len(verts) - 1
    # the wrist, out of the cuff into the palm
    stub = v((-0.07, 0, 0), 0.020, "forearm")
    w = v((0, 0, 0), 0.0175, "hand"); edges.append((stub, w))
    edges.append((w, v((0.03, -0.002, -0.001), 0.016, "hand")))
    # each finger from inside the palm out
    for f, (k, ls, rs) in FINGERS.items():
        a = v(Vector(k) - Vector((0.022, 0, 0.002)), rs[0], "hand"); roots.append(a)
        b0 = v(k, rs[0], "hand"); edges.append((a, b0)); a = b0
        p = Vector(k)
        for i, l in enumerate(ls):
            p = p + Vector((l, 0, 0))
            m = v(p - Vector((l * 0.5, 0, 0)), (rs[i] + rs[i + 1]) / 2, f"{f}{i+1}")
            b = v(p, rs[i + 1], f"{f}{i+1}")
            edges += [(a, m), (m, b)]; a = b
    a = v(THUMB[0], THUMB_R[0], "hand"); roots.append(a)
    for i in range(1, 4):
        b = v(THUMB[i], THUMB_R[i], f"thumb{i}"); edges.append((a, b)); a = b
    me = bpy.data.meshes.new("HandSkin")
    me.from_pydata(verts, edges, [])
    hand = bpy.data.objects.new("Hand", me)
    bpy.context.scene.collection.objects.link(hand)
    hand.parent = rig
    for s in bpy.context.selected_objects: s.select_set(False)
    bpy.context.view_layer.objects.active = hand; hand.select_set(True)
    sk = hand.modifiers.new("skin", "SKIN")
    for i, r in enumerate(radii):
        hand.data.skin_vertices[0].data[i].radius = (r * 1.32, r * 1.32 * 0.9)   # the skin shrinks as it is smoothed
    for r in [stub] + roots: hand.data.skin_vertices[0].data[r].use_root = True   # one per piece
    sk.branch_smoothing = 0.6
    for g in set(groups): hand.vertex_groups.new(name=g)
    for i, g in enumerate(groups): hand.vertex_groups[g].add([i], 1.0, "REPLACE")
    am = hand.modifiers.new("bones", "ARMATURE"); am.object = rig
    bpy.ops.object.modifier_move_to_index(modifier="bones", index=0)
    ss = hand.modifiers.new("smooth", "SUBSURF"); ss.levels = ss.render_levels = 2
    hand.data.materials.append(black())
    # the palm: a soft slab under the knuckles, the fingers growing out of it
    # narrow at the wrist, broad at the knuckles, the little-finger side shorter
    pv = [(0.002, -0.025, -0.011), (0.002, 0.024, -0.011), (0.002, 0.024, 0.011), (0.002, -0.025, 0.011),
          (0.078, -0.039, -0.010), (0.090, 0.032, -0.010), (0.090, 0.032, 0.012), (0.078, -0.039, 0.012)]
    palm = mesh_obj("Palm", pv, [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], rig)
    pb = palm.modifiers.new("round", "BEVEL"); pb.width = 0.009; pb.segments = 3
    ps = palm.modifiers.new("smooth", "SUBSURF"); ps.levels = ps.render_levels = 2

    # the sleeve: a jacket cuff over a shirt cuff, out to the elbow and beyond
    def tube(name, x0, x1, r0, r1, seg=28):
        vs, fs = [], []
        for i, (x, r) in enumerate(((x0, r0), (x1, r1))):
            for j in range(seg):
                a = 2 * math.pi * j / seg
                vs.append((x, math.cos(a) * r * 1.08, math.sin(a) * r * 0.92))
        for j in range(seg):
            fs.append((j, (j + 1) % seg, seg + (j + 1) % seg, seg + j))
        return mesh_obj(name, vs, fs, rig)   # the forearm never bends off the rig
    tube("Cuff", -0.035, 0.006, 0.033, 0.034)
    tube("Sleeve", -0.95, -0.018, 0.052, 0.041)
    return rig, hand

def curl(rig, f, frame, angles):
    """bend a finger's three joints by `angles` (degrees, toward the palm)"""
    names = [f"{f}1", f"{f}2", f"{f}3"] if f != "thumb" else ["thumb1", "thumb2", "thumb3"]
    for n, a in zip(names, angles):
        pb = rig.pose.bones[n]
        axis = pb.bone.matrix_local.to_3x3().inverted() @ Vector((0, 1, 0))
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = Matrix.Rotation(math.radians(a), 4, axis).to_quaternion()
        pb.keyframe_insert("rotation_quaternion", frame=frame)

# ── shot 1 · "Every October, I take out the Ashcombe file." ─────────────
# A shelf of box files at night; a hand comes in, hooks the ring of one and
# draws it out; we close in on its label: ASHCOMBE · 61/1013.
def shot1(sc):
    END = 150
    sc.frame_start, sc.frame_end = 1, END
    import random
    rnd = random.Random(1961)

    # the shelving: two boards, the uprights, the back
    box("BoardLow", -0.699, -0.02, -0.028, 0.799, 0.341, 0.0)
    box("BoardHigh", -0.699, -0.02, 0.365, 0.799, 0.341, 0.392)
    box("BoardLower", -0.699, -0.02, -0.42, 0.799, 0.341, -0.395)
    box("SideL", -0.74, -0.02, -0.60, -0.70, 0.34, 0.80)
    box("SideR", 0.80, -0.02, -0.60, 0.84, 0.34, 0.80)
    box("Back", -0.699, 0.342, -0.60, 0.799, 0.355, 0.80)

    # a row of box files, spines out, a label and a finger ring on each
    D, Hf = 0.29, 0.318
    files, x = [], -0.66
    years = ["58/0412", "59/0077", "59/0931", "60/0210", "60/0745", "61/0388", "61/1013", "62/0054", "62/0619", "63/0102", "63/0870", "64/0233", "64/0991"]
    for i, ref in enumerate(years):
        w = 0.098 if ref == "61/1013" else 0.066 + rnd.random() * 0.016
        if x + w > 0.78: break
        f = box(f"File{i}", 0, 0, 0.0015, w, D, Hf)   # standing just clear of the board, so no edge is shared
        f.location = (x, 0.004 + rnd.random() * 0.012, 0)
        cx = w / 2
        box(f"Label{i}", cx - w * 0.36, -0.002, 0.075, cx + w * 0.36, 0.0, 0.175, f)
        torus(f"Ring{i}", (x + cx, f.location.y - 0.0015, 0.238), 0.0135, 0.0026, f)
        if ref == "61/1013":
            text("Name", "ASHCOMBE", (x + cx, f.location.y - 0.0026, 0.150), 0.0150, f)
            text("Ref", ref, (x + cx, f.location.y - 0.0026, 0.122), 0.0135, f)
            text("Year", "1961", (x + cx, f.location.y - 0.0026, 0.094), 0.0120, f)
        files.append((ref, f, w))
        x += w + 0.002 + (0.018 if i == 9 else 0)
    # the last one leaning into the gap
    files[-1][1].rotation_euler = (0, math.radians(-9), 0)
    # the shelf above: more files, their bottoms; below, files laid flat
    x = -0.66
    while x < 0.70:
        w = 0.064 + rnd.random() * 0.02
        box("Up", x, 0.006, 0.3935, x + w, 0.30, 0.71)
        x += w + 0.002
    for k in range(4):
        box("Flat", -0.60 + k * 0.012, 0.01 + k * 0.004, -0.395 + k * 0.058, -0.24 + k * 0.01, 0.30, -0.395 + (k + 1) * 0.058 - 0.002)

    target = next(f for ref, f, w in files if ref == "61/1013")
    tw = next(w for ref, f, w in files if ref == "61/1013")
    rest = target.matrix_world.copy()
    ring = Vector((target.location.x + tw / 2, target.location.y - 0.0015, 0.238))
    label = Vector((target.location.x + tw / 2, target.location.y - 0.003, 0.128))
    pivot = Vector((target.location.x, target.location.y, 0))  # its front bottom edge

    # how the file comes out: tipped forward on its front edge, then drawn out
    HOOK, TIP_END, PULL_A, PULL_B = 60, 78, 74, 112
    def file_matrix(f):
        th = math.radians(14) * ease_in_out(span(f, HOOK + 2, TIP_END)) - math.radians(5) * ease_in_out(span(f, PULL_A, PULL_B))
        out = Vector((0.004, -0.23, 0.012)) * ease_in_out(span(f, PULL_A, PULL_B))
        return Matrix.Translation(pivot + out) @ Matrix.Rotation(th, 4, "X") @ Matrix.Translation(-pivot)

    rig, hand = build_hand()
    # the hand's set: fingers toward the shelf and a little left, palm down,
    # turned a little onto its little-finger side, the fingers dipped
    R = Matrix.Rotation(math.radians(90 + 20), 4, "Z") @ Matrix.Rotation(math.radians(-28), 4, "X") @ Matrix.Rotation(math.radians(5), 4, "Y")
    # the index finger goes in through the ring to its middle joint, then
    # bends down behind the spine, out of sight
    pip = Vector(FINGERS["index"][0]) + Vector((FINGERS["index"][1][0], 0, 0))
    def root_for(at): return at - (R.to_3x3() @ pip)
    at_ring = root_for(ring + Vector((0, -0.006, 0.001)))
    before = root_for(ring + Vector((0.006, -0.065, 0.012)))
    start = before + Vector((0.78, -0.30, -0.03))   # out of frame until it comes
    rig.rotation_mode = "QUATERNION"

    for f in range(1, END + 1):
        if f <= HOOK:
            if f < 22: loc = start
            elif f < 48: loc = start.lerp(before, ease_out(span(f, 22, 48)))
            else: loc = before.lerp(at_ring, ease_in_out(span(f, 48, 56)))
        else:
            loc = at_ring + (file_matrix(f) @ ring - ring)
        rig.location = loc
        rig.keyframe_insert("location", frame=f)
        # the wrist turns a touch as it pulls
        q = (R @ Matrix.Rotation(math.radians(-8) * ease_in_out(span(f, HOOK, PULL_B)), 4, "Y")).to_quaternion()
        rig.rotation_quaternion = q
        rig.keyframe_insert("rotation_quaternion", frame=f)
        mw = file_matrix(f) @ rest
        target.matrix_world = mw
        target.keyframe_insert("location", frame=f)
        target.keyframe_insert("rotation_euler", frame=f)

    # the fingers: loose as it reaches, the index hooks, the rest close
    for f, a in ((1, 0), (40, 0), (55, 0.04), (HOOK + 2, 1), (END, 1)):
        curl(rig, "index", f, (lerp(4, 14, a), lerp(6, 86, a), lerp(4, 52, a)))
        curl(rig, "middle", f, (lerp(16, 58, a), lerp(22, 82, a), lerp(12, 48, a)))
        curl(rig, "ring", f, (lerp(20, 64, a), lerp(26, 84, a), lerp(14, 50, a)))
        curl(rig, "pinky", f, (lerp(24, 70, a), lerp(30, 86, a), lerp(16, 50, a)))
        curl(rig, "thumb", f, (lerp(4, 14, a), lerp(6, 22, a), lerp(4, 18, a)))

    cam_data = bpy.data.cameras.new("Cam"); cam_data.sensor_width = 36
    cam = bpy.data.objects.new("Cam", cam_data); sc.collection.objects.link(cam)

    if STILL:
        # a picture: the moment the file is half out in his hand, held; the
        # camera comes across and in, the hand and file sliding past the row
        FREEZE = 100
        sc.frame_set(FREEZE)
        for o in (rig, target):
            mw = o.matrix_world.copy(); o.animation_data_clear(); o.matrix_world = mw
        lab = file_matrix(FREEZE) @ label
        END = 168; sc.frame_end = END
        for f in range(1, END + 1):
            k = ease_in_out(span(f, 8, END - 6))
            eye = (lab + Vector((-0.34, -0.66, 0.15))).lerp(lab + Vector((-0.06, -0.31, 0.035)), k)
            at = (lab + Vector((0.07, 0.05, 0.07))).lerp(lab + Vector((0.004, 0, 0.006)), k)
            look(cam, eye, at, lerp(34, 47, k))
            cam.keyframe_insert("location", frame=f); cam.keyframe_insert("rotation_euler", frame=f)
            cam.data.keyframe_insert("lens", frame=f)
        gp, la = line_art(sc, cam)
        draw_in(gp, 1, 18)
        for f in range(1, END + 1):
            sc.frame_set(f)
            la.radius = LINE * (cam.matrix_world.translation - lab).length
            la.keyframe_insert("radius", frame=f)
        return END

    # the camera: on the row, drifting in; then closing on the label as it comes out
    for f in range(1, END + 1):
        lab = file_matrix(f) @ label
        wide_eye, wide_at = Vector((-0.26, -0.96, 0.34)), Vector((0.06, 0.1, 0.17))
        drift = Vector((0.03, 0.06, 0)) * smooth(f / END)
        near_eye, near_at = lab + Vector((-0.09, -0.30, 0.03)), lab + Vector((0, 0, 0.004))
        k = ease_in_out(span(f, 80, 136))
        hand_held = Vector((math.sin(f * 0.07) * 0.002, 0, math.sin(f * 0.051 + 1) * 0.0015))
        look(cam, wide_eye.lerp(near_eye, k) + drift * (1 - k) + hand_held, wide_at.lerp(near_at, k), lerp(36, 50, k))
        cam.keyframe_insert("location", frame=f); cam.keyframe_insert("rotation_euler", frame=f)
        cam.data.keyframe_insert("lens", frame=f)

    gp, la = line_art(sc, cam)
    draw_in(gp, 1, 16)
    # the line kept the same fineness on the screen however near the camera comes
    for f in range(1, END + 1):
        sc.frame_set(f)
        la.radius = LINE * (cam.matrix_world.translation - (file_matrix(f) @ label)).length
        la.keyframe_insert("radius", frame=f)
    return END

SHOTS = {1: shot1}

sc = reset()
end = SHOTS[SHOT](sc)
for o in sc.objects:
    if o.type == "MESH": o.hide_render = False
if SOLID:
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "SINGLE"
    sc.display.shading.single_color = (0.8, 0.8, 0.8)
    for o in sc.objects:
        if o.type == "GREASEPENCIL": o.hide_render = True
sc.render.filepath = os.path.join(OUT, "f_####")
if STILLS:
    for f in STILLS:
        sc.frame_set(f)
        sc.render.filepath = os.path.join(OUT, f"{'solid' if SOLID else 'still'}_{f:04d}.png")
        bpy.ops.render.render(write_still=True)
else:
    bpy.ops.render.render(animation=True)
print("FILM_SKETCH_DONE", SHOT, end, OUT)
