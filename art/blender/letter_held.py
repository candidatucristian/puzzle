# A found letter, held up before his eyes (the user's choice, 2026-11-12: the
# sheet alone, no hands, old and dark, the floor where it was found out of
# focus behind it):
#
#   ivy     a page torn out of her garden book: the binding's tear down its
#           left side, a thumb of soil, an ivy leaf pressed in it. Behind: the
#           Botany Hall.
#   silas   a page of his laboratory note book: squared, a double red margin,
#           torn off along its perforations, a jar's ring on it. Behind: the
#           Chemistry Hall.
#   orion   the back of his star chart: grey card, the chart showing through,
#           pin holes at its corners, curling where it was rolled. Behind: the
#           observatory.
#   last    the house's note paper: laid, deckle-edged, the key blind-pressed
#           at its head, folded in three. Behind: the Botany Hall, the way in.
#
# The paper is photographed paper (ambientCG scans, CC0), aged. What is printed
# on it is drawn by letter_pages_prints.mjs. The words are not in the picture:
# the game lays them on it, in every language (letterArrival.js).
#
# For each: the film of it being lifted into view (Cycles, real motion blur and
# depth of field, 1920×1080, frames as PNG), and the still it comes to rest in,
# which is the film's last frame, rendered cleaner. Also writes where the sheet
# and its words lie on the picture (letterHeld.json).
#
#   blender -b --factory-startup -P art/blender/letter_held.py -- --out <abs dir>
#       [--only ivy,orion] [--preview] [--still-only]
import bpy, math, os, sys, json
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from bpy_extras.object_utils import world_to_camera_view
sys.path.append(os.path.dirname(__file__))
from kit import fresh, link, cycles, lamp, arg

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PRINTS = os.path.join(ROOT, ".artifacts", "letter-pages")
SCANS = "C:/Users/crist/Tools/render/assets/textures"
OUT = arg("--out", os.path.join(PRINTS, "held"))
PREVIEW = "--preview" in sys.argv
STILL_ONLY = "--still-only" in sys.argv
RES = (960, 540) if PREVIEW else (1920, 1080)
FPS = 30
MM = 0.001
EYE = Vector((0.0, -0.16, 1.675))   # (where his eyes are; the sheet ~40 cm before them, a little below)
DOWN, DIST = math.radians(24), 0.4

SHEETS = {
    "ivy": dict(size=(160, 230), text=(26, 24, 18, 56), scan="Paper001", tint=(0.66, 0.56, 0.4), seed=3.1,
                print="ivy-print", print_strength=0.85, torn="left", room="Botany/hall-ground-render-v1.webp",
                stains=[("blot", (40, -70), 22, (0.55, 0.4, 0.22), 0.3), ("blot", (-20, 60), 30, (0.6, 0.47, 0.28), 0.22)],
                leaf=dict(at=(56, -88), size=62, turn=-28), bow=(0.006, 0.012), lift=dict(roll=8, tilt=26, side=0.02)),
    "silas": dict(size=(200, 280), text=(36, 27, 13, 15), scan="Paper001", tint=(0.62, 0.58, 0.48), seed=7.7,
                  print="silas-print", print_strength=0.9, perforated=True, room="Chemistry/hall-chem-render-v1.webp",
                  stains=[("ring", (52, -78), 33, (0.42, 0.27, 0.12), 0.55), ("blot", (52, -78), 31, (0.6, 0.48, 0.3), 0.16),
                          ("blot", (-60, 100), 7, (0.62, 0.5, 0.18), 0.3), ("blot", (-30, -20), 45, (0.6, 0.5, 0.35), 0.14)],
                  bow=(0.007, 0.014), lift=dict(roll=-7, tilt=24, side=-0.025)),
    "orion": dict(size=(420, 300), text=(72, 44, 72, 42), scan="Paper002", tint=(0.66, 0.64, 0.58), seed=12.4,
                  print="orion-print", print_strength=0.14, pins=True, thick=0.0004, room="Physics/observatory-native-v2.webp",
                  stains=[("blot", (-150, -95), 40, (0.55, 0.48, 0.36), 0.2), ("blot", (120, 80), 60, (0.6, 0.55, 0.42), 0.12)],
                  bow=(0.016, 0.006), lift=dict(roll=5, tilt=30, side=0.03)),
    "last": dict(size=(190, 260), text=(23, 36, 21, 18), scan="Paper001", tint=(0.72, 0.63, 0.47), seed=21.9,
                 print="last-print", print_strength=1.0, deckle=True, emboss="last-emboss", folds=True,
                 room="Botany/hall-ground-render-v1.webp", stains=[("blot", (60, 90), 35, (0.6, 0.5, 0.34), 0.14)],
                 bow=(0.006, 0.01), lift=dict(roll=-6, tilt=22, side=-0.02)),
}

# ── node shorthand ─────────────────────────────────────────────────────────
class G:
    def __init__(s, mat):
        mat.use_nodes = True; s.N = mat.node_tree.nodes; s.Lk = mat.node_tree.links.new
        s.tc = s.N.new("ShaderNodeTexCoord")
    def _in(s, sock, v):
        if isinstance(v, (int, float)): sock.default_value = v
        elif isinstance(v, tuple): sock.default_value = (*v, 1) if len(v) == 3 else v
        else: s.Lk(v, sock)
    def m(s, op, a, b=None):
        n = s.N.new("ShaderNodeMath"); n.operation = op
        for i, v in enumerate((a, b)):
            if v is not None: s._in(n.inputs[i], v)
        return n.outputs[0]
    def rng(s, v, a, b, c=0.0, d=1.0):
        n = s.N.new("ShaderNodeMapRange"); s._in(n.inputs["Value"], v)
        n.inputs[1].default_value, n.inputs[2].default_value, n.inputs[3].default_value, n.inputs[4].default_value = a, b, c, d
        return n.outputs["Result"]
    def mix(s, a, b, fac, blend="MIX"):
        x = s.N.new("ShaderNodeMix"); x.data_type = "RGBA"; x.blend_type = blend
        s._in(x.inputs["Factor"], fac); s._in(x.inputs[6], a); s._in(x.inputs[7], b); return x.outputs[2]
    def noise(s, vec, scale, w, detail=4.0):
        n = s.N.new("ShaderNodeTexNoise"); n.noise_dimensions = "4D"
        n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = detail; n.inputs["W"].default_value = w
        s.Lk(vec, n.inputs["Vector"]); return n.outputs["Fac"]
    def image(s, path, vec, colour=True, extension="REPEAT"):
        t = s.N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(path, check_existing=True)
        if not colour: t.image.colorspace_settings.name = "Non-Color"
        t.extension = extension; t.interpolation = "Cubic"; s.Lk(vec, t.inputs["Vector"]); return t
    def mapping(s, vec, scale):
        mp = s.N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = scale; s.Lk(vec, mp.inputs["Vector"]); return mp.outputs["Vector"]

def paper(name, spec, hw, hh):
    """photographed paper, aged where it was handled, with its print and its stains"""
    mat = bpy.data.materials.new(f"{name} paper"); g = G(mat); b = g.N["Principled BSDF"]; seed = spec["seed"]
    uv = g.tc.outputs["UV"]
    sep = g.N.new("ShaderNodeSeparateXYZ"); g.Lk(uv, sep.inputs["Vector"])
    X = g.m("MULTIPLY", g.m("SUBTRACT", sep.outputs["X"], 0.5), 2 * hw); Y = g.m("MULTIPLY", g.m("SUBTRACT", sep.outputs["Y"], 0.5), 2 * hh)
    P = g.N.new("ShaderNodeCombineXYZ"); g.Lk(X, P.inputs["X"]); g.Lk(Y, P.inputs["Y"]); P = P.outputs["Vector"]
    def line_noise(along, scale, w):
        v = g.N.new("ShaderNodeCombineXYZ"); g.Lk(along, v.inputs["X"]); v.inputs["Y"].default_value = w
        return g.noise(v.outputs["Vector"], scale, w, 3)
    def dist(cx, cy):
        v = g.N.new("ShaderNodeCombineXYZ"); g.Lk(g.m("SUBTRACT", X, cx), v.inputs["X"]); g.Lk(g.m("SUBTRACT", Y, cy), v.inputs["Y"])
        ln = g.N.new("ShaderNodeVectorMath"); ln.operation = "LENGTH"; g.Lk(v.outputs["Vector"], ln.inputs[0]); return ln.outputs["Value"]
    # the scan, at its own scale (one tile of it ~ 25 cm of paper)
    tile = g.mapping(P, (4.0, 4.0, 1.0))
    scan = g.image(f"{SCANS}/{spec['scan']}/Diffuse.jpg", tile)
    col = g.mix(scan.outputs["Color"], spec["tint"], 1.0, "MULTIPLY")
    # age: broad tea-coloured mottling, foxing
    col = g.mix(col, (0.62, 0.5, 0.34), g.rng(g.noise(P, 6, seed, 6), 0.36, 0.76, 0.0, 0.9), "MULTIPLY")
    vo = g.N.new("ShaderNodeTexVoronoi"); vo.inputs["Scale"].default_value = 30; g.Lk(P, vo.inputs["Vector"])
    spot = g.m("MULTIPLY", g.rng(vo.outputs["Distance"], 0.03, 0.0), g.m("GREATER_THAN", vo.outputs["Color"], 0.8))
    col = g.mix(col, (0.4, 0.26, 0.13), g.m("MULTIPLY", spot, 0.6))
    if spec.get("print"):
        t = g.image(os.path.join(PRINTS, spec["print"] + ".png"), uv, extension="CLIP")
        col = g.mix(col, t.outputs["Color"], spec["print_strength"], "MULTIPLY")
    for kind, (cx, cy), r, c, s in spec.get("stains", []):
        cx, cy, r = cx * MM, cy * MM, r * MM
        d = g.m("ADD", dist(cx, cy), g.m("MULTIPLY", g.rng(g.noise(P, 140, seed + cx * 7), 0, 1, -1, 1), r * 0.06))
        if kind == "ring":
            f = g.m("MULTIPLY", g.rng(g.m("ABSOLUTE", g.m("SUBTRACT", d, r)), 0.0, 0.0011, 1.0, 0.0), g.rng(g.noise(P, 40, seed + 5), 0.2, 0.75, 0.25, 1.0))
        else:
            f = g.rng(g.m("ADD", d, g.m("MULTIPLY", g.noise(P, 60, seed + cy * 5), r * 0.5)), r * 0.35, r * 1.2, 1.0, 0.0)
        col = g.mix(col, c, g.m("MULTIPLY", f, s))
    # its edges: torn, perforated or deckled, darker where it was held
    left, right = g.m("ADD", X, hw), g.m("SUBTRACT", hw, X)
    bottom, top = g.m("ADD", Y, hh), g.m("SUBTRACT", hh, Y)
    soft = 0.00012
    if spec.get("torn") == "left":
        tear = g.m("ADD", g.m("ADD", g.m("MULTIPLY", line_noise(Y, 14, 1), 0.0085), g.m("MULTIPLY", line_noise(Y, 85, 2), 0.0028)), g.m("MULTIPLY", line_noise(Y, 420, 3), 0.0009))
        left = g.m("SUBTRACT", left, g.m("ADD", tear, 0.0006))
        col = g.mix(col, (0.86, 0.8, 0.66), g.rng(g.m("ADD", left, g.m("MULTIPLY", g.noise(P, 900, 6), 0.0008)), 0.0, 0.0019, 0.6, 0.0))
    if spec.get("perforated"):
        bite = g.m("MULTIPLY", g.m("ABSOLUTE", g.m("SINE", g.m("MULTIPLY", X, math.pi / 0.0026))), 0.0008)
        top = g.m("SUBTRACT", top, g.m("ADD", bite, g.m("MULTIPLY", line_noise(X, 300, 4), 0.00045)))
    if spec.get("deckle"):
        edges = []
        for k, (e, along) in enumerate(((left, Y), (right, Y), (bottom, X), (top, X))):
            edges.append(g.m("SUBTRACT", e, g.m("ADD", g.m("MULTIPLY", line_noise(along, 70, seed + k), 0.0026), g.m("MULTIPLY", line_noise(along, 520, seed + k + 9), 0.0009))))
        left, right, bottom, top = edges; soft = 0.0007
    near = g.m("MINIMUM", g.m("MINIMUM", left, right), g.m("MINIMUM", bottom, top))
    col = g.mix(col, (0.48, 0.35, 0.2), g.rng(g.m("ADD", near, g.m("MULTIPLY", g.noise(P, 70, 3), 0.004)), 0.0015, 0.04, 0.8, 0.0))
    alpha = g.rng(near, 0.0, soft)
    if spec.get("pins"):   # the holes it hung by, each with its rust
        for sx in (-1, 1):
            for sy in (-1, 1):
                d = dist(sx * (hw - 0.0085), sy * (hh - 0.0085))
                alpha = g.m("MULTIPLY", alpha, g.rng(d, 0.00035, 0.00055))
                col = g.mix(col, (0.34, 0.16, 0.06), g.m("MULTIPLY", g.rng(d, 0.0006, 0.003, 1.0, 0.0), g.rng(g.noise(P, 900, seed + sx + 2 * sy), 0.3, 0.7, 0.4, 0.8)))
    # relief: the paper's own grain, the crumple of being handled, its folds and its emboss
    crumple = g.image(f"{SCANS}/Paper003/nor_gl.jpg", g.mapping(P, (2.2, 2.2, 1.0)), colour=False)
    nm = g.N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 1.15 if not spec.get("thick") else 0.6
    g.Lk(crumple.outputs["Color"], nm.inputs["Color"])
    grain = g.image(f"{SCANS}/{'Paper002' if spec.get('thick') else 'Paper001'}/Displacement.jpg", tile, colour=False)
    bump = g.N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25; bump.inputs["Distance"].default_value = 0.0003
    g.Lk(grain.outputs["Color"], bump.inputs["Height"]); g.Lk(nm.outputs["Normal"], bump.inputs["Normal"]); nrm = bump.outputs["Normal"]
    if spec.get("folds"):
        for k in (-1, 1):
            off = g.m("ABSOLUTE", g.m("SUBTRACT", Y, k * hh / 3))
            fb = g.N.new("ShaderNodeBump"); fb.inputs["Strength"].default_value = 0.6; fb.inputs["Distance"].default_value = 0.0006; fb.invert = k > 0
            g.Lk(g.rng(off, 0.0, 0.0022), fb.inputs["Height"]); g.Lk(nrm, fb.inputs["Normal"]); nrm = fb.outputs["Normal"]
            col = g.mix(col, (0.5, 0.4, 0.27), g.rng(off, 0.0, 0.001, 0.25, 0.0))
    if spec.get("emboss"):
        t = g.image(os.path.join(PRINTS, spec["emboss"] + ".png"), uv, colour=False, extension="CLIP")
        eb = g.N.new("ShaderNodeBump"); eb.inputs["Strength"].default_value = 0.5; eb.inputs["Distance"].default_value = 0.0007
        g.Lk(t.outputs["Color"], eb.inputs["Height"]); g.Lk(nrm, eb.inputs["Normal"]); nrm = eb.outputs["Normal"]
    g.Lk(col, b.inputs["Base Color"]); g.Lk(nrm, b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.86; b.inputs["Specular IOR Level"].default_value = 0.3; b.inputs["Sheen Weight"].default_value = 0.2
    tr = g.N.new("ShaderNodeBsdfTranslucent"); g.Lk(col, tr.inputs["Color"])
    sm = g.N.new("ShaderNodeMixShader"); sm.inputs[0].default_value = 0.04 if not spec.get("thick") else 0.0
    g.Lk(b.outputs[0], sm.inputs[1]); g.Lk(tr.outputs[0], sm.inputs[2])
    cut = g.N.new("ShaderNodeMixShader"); g.Lk(alpha, cut.inputs[0])
    g.Lk(g.N.new("ShaderNodeBsdfTransparent").outputs[0], cut.inputs[1]); g.Lk(sm.outputs[0], cut.inputs[2])
    g.Lk(cut.outputs[0], g.N["Material Output"].inputs["Surface"])
    return mat

def leaf_material():
    mat = bpy.data.materials.new("pressed leaf"); g = G(mat); b = g.N["Principled BSDF"]
    t = g.image(os.path.join(PRINTS, "ivy-leaf.png"), g.tc.outputs["UV"], extension="CLIP")
    g.Lk(g.mix(t.outputs["Color"], (0.7, 0.64, 0.52), 1.0, "MULTIPLY"), b.inputs["Base Color"]); g.Lk(t.outputs["Alpha"], b.inputs["Alpha"])
    b.inputs["Roughness"].default_value = 0.65
    return mat

# ── the sheet, held: bowed a little (its sides toward him, its top falling away) ──
def bow(spec, x, y, hw, hh):
    side, top = spec["bow"]; z = side * (x / hw) ** 2 - top * np.maximum(0, (y + hh * 0.3) / (hh * 1.3)) ** 2
    if spec.get("folds"):   # folded in three: each fold standing a little
        z = z + 0.0022 * (1 - np.minimum(np.abs(y - hh / 3), np.abs(y + hh / 3)) / (hh / 3)).clip(0, 1) ** 3
    return z

def grid_object(name, xy, nx, ny, z, frame, parent=None):
    """points (x, y on the sheet, z toward him) laid in the held frame, about
    the sheet's centre: the object sits at the centre, so it can be moved whole"""
    C, R, U, D = frame
    us, vs = np.meshgrid(np.linspace(0, 1, nx + 1), np.linspace(0, 1, ny + 1))
    x, y = xy(us, vs); zz = z(x, y)
    P = x[..., None] * np.array(R) + y[..., None] * np.array(U) - zz[..., None] * np.array(D)
    idx = np.arange((nx + 1) * (ny + 1)).reshape(ny + 1, nx + 1)
    quads = np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], -1).reshape(-1, 4)
    me = bpy.data.meshes.new(name); me.vertices.add((nx + 1) * (ny + 1)); me.loops.add(quads.size); me.polygons.add(len(quads))
    me.vertices.foreach_set("co", P.reshape(-1, 3).astype(np.float32).ravel())
    me.loops.foreach_set("vertex_index", quads.ravel().astype(np.int32))
    me.polygons.foreach_set("loop_start", (np.arange(len(quads)) * 4).astype(np.int32))
    me.polygons.foreach_set("loop_total", np.full(len(quads), 4, np.int32))
    me.polygons.foreach_set("use_smooth", np.ones(len(quads), bool))
    uvl = me.uv_layers.new(name="UVMap")
    uvl.data.foreach_set("uv", np.c_[us.ravel()[quads.ravel()], vs.ravel()[quads.ravel()]].ravel().astype(np.float32)); me.update()
    o = link(bpy.data.objects.new(name, me))
    if parent: o.parent = parent
    else: o.location = C
    return o

def build(name, spec):
    scene = fresh()
    w_mm, h_mm = spec["size"]; hw, hh = w_mm * MM / 2, h_mm * MM / 2
    D = Vector((0, -math.cos(DOWN), -math.sin(DOWN)))       # the way he looks
    R = Vector((-1, 0, 0)); U = R.cross(D).normalized()       # his right; up, in the sheet
    C = EYE + D * DIST
    frame = (C, R, U, D)
    n = 140; ny = round(n * hh / hw) if hh > hw else n; nx = n if hh > hw else round(n * hw / hh)
    sheet = grid_object(name, lambda u, v: ((u - 0.5) * 2 * hw, (v - 0.5) * 2 * hh), nx, ny, lambda x, y: bow(spec, x, y, hw, hh), frame)
    sheet.data.materials.append(paper(name, spec, hw, hh))
    sheet.modifiers.new("thickness", "SOLIDIFY").thickness = spec.get("thick", 0.00012)
    if spec.get("leaf"):   # pressed in the page, lying on it
        L = spec["leaf"]; ax, ay, size, a = L["at"][0] * MM, L["at"][1] * MM, L["size"] * MM, math.radians(L["turn"])
        def at(u, v):
            lx, ly = (u - 0.5) * size, (v - 0.5) * size
            return ax + lx * math.cos(a) - ly * math.sin(a), ay + lx * math.sin(a) + ly * math.cos(a)
        leaf = grid_object("leaf", at, 20, 20, lambda x, y: bow(spec, x, y, hw, hh) + 0.0004, frame, parent=sheet)
        leaf.data.materials.append(leaf_material())
    # the room behind, far off and out of focus
    bg = bpy.data.images.load(os.path.join(ROOT, "public/assets/images", spec["room"]))
    bpy.ops.mesh.primitive_plane_add(size=1, location=EYE + D * 4.0)
    plate = bpy.context.object; plate.rotation_euler = (-D).to_track_quat("Z", "Y").to_euler()
    # the hall as the game shows it: the whole picture just covering the
    # camera's view at the plate's distance (not a magnified middle of it)
    held_h = max(hh, hw * RES[1] / RES[0] * 1.25)   # (a wide card: its width decides)
    lens = 12 / math.tan(math.atan(held_h / 0.72 / DIST))
    view_h = 4.0 * 24 / lens; view_w = view_h * RES[0] / RES[1]; aspect = bg.size[0] / bg.size[1]
    plate_h = max(view_h, view_w / aspect) * float(arg("--room-scale", 1.02))
    plate.scale = (plate_h * aspect, plate_h, 1)
    pm = bpy.data.materials.new("room"); g = G(pm); t = g.image(bpy.path.abspath(bg.filepath), g.tc.outputs["UV"], extension="EXTEND")
    em = g.N.new("ShaderNodeEmission"); g.Lk(t.outputs["Color"], em.inputs["Color"]); em.inputs["Strength"].default_value = float(arg("--room", 1.6))
    g.Lk(em.outputs[0], g.N["Material Output"].inputs["Surface"]); plate.data.materials.append(pm)
    plate.visible_shadow = False
    # (since 2026-11-12 the game itself lies behind the sheet, blurred: the room
    # still lights the paper, but the camera does not see it)
    plate.visible_camera = False
    # one warm lamp over his left shoulder, and the room round him
    lamp("lamp", "AREA", EYE + Vector((1.0, 0.25, 0.75)), aim=C, energy=float(arg("--energy", 120)), colour=(1.0, 0.86, 0.7), size=1.0)
    world = bpy.data.worlds.new("room"); world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.2, 0.16, 0.12, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.3; scene.world = world
    # his eyes: the sheet ~72% of the picture's height, the room far out of focus
    cam_data = bpy.data.cameras.new("eye"); cam = link(bpy.data.objects.new("eye", cam_data)); scene.camera = cam
    cam_data.sensor_fit = "VERTICAL"; cam_data.sensor_height = 24; cam_data.clip_start = 0.05
    cam.location = EYE; cam.rotation_euler = D.to_track_quat("-Z", "Y").to_euler()
    held_h = max(hh, hw * RES[1] / RES[0] * 1.25)   # (a wide card: its width decides)
    cam_data.lens = 12 / math.tan(math.atan(held_h / 0.72 / DIST))
    cam_data.dof.use_dof = True; cam_data.dof.focus_distance = DIST; cam_data.dof.aperture_fstop = float(arg("--fstop", 2.8))
    cycles(scene, 64 if PREVIEW else 512, RES[0], RES[1], exposure=float(arg("--exposure", -1.4)), glare=False, transparent=True)
    scene.view_settings.view_transform = "AgX"; scene.view_settings.look = "AgX - Base Contrast"
    os.makedirs(OUT, exist_ok=True)
    # the lift: up into view from below, turned and tipped back, slowing,
    # settling with the small give of a held sheet (keyed every frame: Cycles
    # blurs between the keys)
    lift = spec["lift"]; length = float(arg("--length", 1.7)); frames = round(length * FPS) + 1
    def held(t):
        v = min(1.0, t / 1.45); e = 1 - (1 - v) ** 3
        give = 0.0035 * math.sin(math.pi * min(1, max(0, (t - 1.1) / 0.6))) * (1 - v * 0.5)
        off = -U * (0.34 * (1 - e) - give) + R * lift["side"] * (1 - e) ** 1.5 + D * 0.07 * (1 - e)
        turn = Quaternion(D, math.radians(lift["roll"]) * (1 - e) ** 1.4) @ Quaternion(R, math.radians(lift["tilt"]) * (1 - e) ** 1.2)
        return C + off, turn
    sheet.rotation_mode = "QUATERNION"
    scene.frame_start, scene.frame_end = 0, frames - 1; scene.render.fps = FPS
    for f in range(frames):
        loc, q = held(f / FPS); sheet.location = loc; sheet.rotation_quaternion = q
        sheet.keyframe_insert("location", frame=f); sheet.keyframe_insert("rotation_quaternion", frame=f)
    for fc in sheet.animation_data.action.fcurves:
        for k in fc.keyframe_points: k.interpolation = "LINEAR"
    # at rest: the still, clean (the film's last frame)
    scene.frame_set(frames - 1)
    scene.render.filepath = os.path.join(OUT, f"{name}-still.png"); bpy.ops.render.render(write_still=True)
    if not STILL_ONLY:
        scene.render.use_motion_blur = True; scene.render.motion_blur_shutter = 0.5
        scene.cycles.samples = 48 if PREVIEW else int(arg("--film-samples", 160))
        scene.render.filepath = os.path.join(OUT, f"{name}-film", "f"); os.makedirs(os.path.join(OUT, f"{name}-film"), exist_ok=True)
        scene.render.image_settings.file_format = "PNG"
        bpy.ops.render.render(animation=True)
    # where the sheet and its words lie on the picture (fractions of it)
    scene.frame_set(frames - 1); bpy.context.view_layer.update()
    def seen(x, y):
        p = C + R * x + U * y - D * float(bow(spec, np.array(x), np.array(y), hw, hh))
        v = world_to_camera_view(scene, cam, p); return [round(v.x, 5), round(1 - v.y, 5)]
    l, t_, r, b_ = (v * MM for v in spec["text"])
    corners = [seen(-hw, hh), seen(hw, hh), seen(hw, -hh), seen(-hw, -hh)]
    text = [seen(-hw + l, hh - t_), seen(hw - r, hh - t_), seen(hw - r, -hh + b_), seen(-hw + l, -hh + b_)]
    box = lambda q: [min(p[0] for p in q), min(p[1] for p in q), max(p[0] for p in q), max(p[1] for p in q)]
    return {"frame": list(RES), "sheet": box(corners), "text": box(text), "quad": corners,
            "film": {"fps": FPS, "frames": frames, "seconds": round((frames - 1) / FPS, 3)}}

layout = {}
for name, spec in SHEETS.items():
    if arg("--only", "") and name not in arg("--only", "").split(","): continue
    layout[name] = build(name, spec)
    print("PAGE", name, layout[name], flush=True)
path = os.path.join(OUT, "letterHeld.json")
old = json.load(open(path)) if os.path.exists(path) else {}
old.update(layout); json.dump(old, open(path, "w"), indent=2)
