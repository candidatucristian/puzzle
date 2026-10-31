# What the rooms off the halls are built and rendered with. Each room is its
# own place, seen from wherever it is best seen: its own camera, its own
# furniture where it stands. Blender then tells the game where everything the
# game keeps alive fell in the picture — the things that open puzzles, the
# chest, the flames and lamps, the window's panes, the moonbeam — by
# projecting them (Layout, written beside the room's code).
#
# A room is measured in centimetres: x across, y up from the floor, d away from
# the door wall. In Blender, metres: (x, d, y) / 100. The renders are made at
# a reference picture of 1880 × 1000, which the game lays over its screen
# covering it, cropped a little at the edges, never stretched.

import bpy, bmesh, math, os, json
from mathutils import Vector, Matrix
from kit import *
from hall_common import ROOT, scan, ARCH, arch, slab, clear_glass, passes, candle_sconce

RW, RH = 1880, 1000

def P(x, y, d):
    """a place in the room (cm) in Blender's metres"""
    return Vector((x / 100, d / 100, y / 100))
def M(cm):
    return cm / 100

SCENE = None
def stage(width, eye, look, lens=24.0, lift=0.0):
    """an empty scene, its camera at `eye` looking at `look` (both in the
    room's cm), a lens of `lens` mm on a 36 mm frame, the picture lifted by
    `lift` (a shift, keeping verticals upright); and the picture's height"""
    global SCENE
    scene = fresh()
    cd = bpy.data.cameras.new("eye"); cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36; cd.lens = lens
    cd.clip_start = 0.05; cd.clip_end = 80; cd.shift_y = lift
    cam = link(bpy.data.objects.new("eye", cd)); cam.location = P(*eye)
    cam.rotation_euler = (P(*look) - P(*eye)).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    height = round(width * RH / RW)
    scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = width, height, 100
    SCENE = scene
    return scene, height

def project(p):
    """a place in the room (cm, or a Blender point) in the reference picture's pixels"""
    from bpy_extras.object_utils import world_to_camera_view
    v = world_to_camera_view(SCENE, SCENE.camera, p if isinstance(p, Vector) else P(*p))
    return (round(v.x * RW, 2), round((1 - v.y) * RH, 2))
def scale_at(p):
    """how many reference pixels a centimetre is, at a place in the room"""
    p = p if isinstance(p, Vector) else P(*p)
    right = SCENE.camera.matrix_world.to_3x3() @ Vector((1, 0, 0))
    a, b = project(p), project(p + right * 0.01)
    return round(math.hypot(b[0] - a[0], b[1] - a[1]), 4)
def outline(points):
    """the outline round some places in the room, in the picture (a convex hull)"""
    return hull([project(p) for p in points])
def corners(x0, x1, y0, y1, d0, d1):
    return [(x, y, d) for x in (x0, x1) for y in (y0, y1) for d in (d0, d1)]
def object_corners(o):
    """the corners of a Blender object's bounds, as it stands"""
    bpy.context.view_layer.update()
    return [o.matrix_world @ Vector(c) for c in o.bound_box]
def box_of(points, pad=3):
    """the box round some places in the room, in reference pixels, as the
    game rounds it (floor and ceiling, a few pixels spare)"""
    qs = [project(p) for p in points]
    x0, y0 = math.floor(min(q[0] for q in qs) - pad), math.floor(min(q[1] for q in qs) - pad)
    return [x0, y0, math.ceil(max(q[0] for q in qs) + pad) - x0, math.ceil(max(q[1] for q in qs) + pad) - y0]

def box_cm(name, x0, x1, y0, y1, d0, d1, mat, r=0.0, keep=True):
    """a block, in the room's centimetres: x across, y up, d away"""
    o = box(name, M(x0), M(x1), M(d0), M(d1), M(y0), M(y1), mat)
    if r: bevel(o, M(r), 2)
    return arch(o) if keep else o

def assembled(name, build, at=(0, 0, 0), turn=0.0):
    """build something in its own frame (`build` makes it about the origin),
    then stand it at `at` (cm), turned `turn` radians about the upright"""
    before = set(bpy.data.objects)
    build()
    root = bpy.data.objects.new(name, None); link(root)
    for o in [o for o in bpy.data.objects if o not in before and o.parent is None and o is not root]: o.parent = root
    root.location = P(*at); root.rotation_euler = (0, 0, turn)
    return root

def picture(name, path, rough=0.85, coat=0.0, bump=0.0):
    """an image printed on something, by its UVs"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    ti = N.new("ShaderNodeTexImage"); ti.image = bpy.data.images.load(path, check_existing=True)
    Lk(ti.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough; b.inputs["Coat Weight"].default_value = coat
    if bump:
        bw = N.new("ShaderNodeRGBToBW"); bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump; bp.inputs["Distance"].default_value = 0.0005
        Lk(ti.outputs["Color"], bw.inputs["Color"]); Lk(bw.outputs["Val"], bp.inputs["Height"]); Lk(bp.outputs["Normal"], b.inputs["Normal"])
    return m

def card(name, corners_, mat, uv=(0, 0, 1, 1)):
    """a flat quad, lower left first as one facing it sees it, an image on it"""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); layer = bm.loops.layers.uv.new()
    f = bm.faces.new([bm.verts.new(c) for c in corners_])
    u0, v0, u1, v1 = uv
    for lp, (u, v) in zip(f.loops, ((u0, v0), (u1, v0), (u1, v1), (u0, v1))): lp[layer].uv = (u, v)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    return o

def rod(name, a, b, r, mat, verts=12):
    """a cylinder from `a` to `b` (Blender points)"""
    a, b = Vector(a), Vector(b); L_ = (b - a).length
    o = cylinder(name, 0, 0, 0, L_, r, mat, verts=verts); o.location = a
    o.rotation_euler = (b - a).to_track_quat("Z", "Y").to_euler()
    return o

# ── the gilt chest ─────────────────────────────────────────────────────────
GOLD = None
def chest(c):
    """A small coffer of gilt brass with a barrel lid: its body standing on
    four little ball feet, banded, a lock plate on its front; its lid on a
    hinge along the back, to be swung open. `c`: x0, x1, d0, d1, y0, y1, lid
    (cm; its front toward d0). Returns the body's parts, the lid's hinge and
    the lid's parts."""
    global GOLD
    GOLD = GOLD or aged_metal("chest gilt", (0.88, 0.64, 0.26), (0.2, 0.13, 0.045), rough=(0.15, 0.36), scale=60, tarnish=0.3)
    body = []
    x0, x1, d0, d1, y0, y1, lid = c["x0"], c["x1"], c["d0"], c["d1"], c["y0"], c["y1"], c["lid"]
    body.append(box_cm("coffer", x0, x1, y0 + 0.6, y1, d0, d1, GOLD, r=0.25, keep=False))
    for x in (x0 + 0.8, x1 - 0.8):
        for d in (d0 + 0.8, d1 - 0.8):
            body.append(sphere("foot", tuple(P(x, y0 + 0.45, d)), M(0.55), GOLD))
    for x in (x0 + (x1 - x0) * 0.22, x1 - (x1 - x0) * 0.22):
        body.append(box_cm("band", x - 0.45, x + 0.45, y0 + 0.5, y1 + 0.05, d0 - 0.12, d1 + 0.12, GOLD, r=0.1, keep=False))
    body.append(box_cm("lock plate", (x0 + x1) / 2 - 1.3, (x0 + x1) / 2 + 1.3, y1 - 3.2, y1 - 0.3, d0 - 0.25, d0, GOLD, r=0.15, keep=False))
    hole = plain("keyhole", (0.01, 0.008, 0.005), rough=0.6)
    body.append(box_cm("keyhole", (x0 + x1) / 2 - 0.22, (x0 + x1) / 2 + 0.22, y1 - 2.4, y1 - 1.2, d0 - 0.3, d0 - 0.2, hole, keep=False))
    hinge = bpy.data.objects.new("chest hinge", None); link(hinge); hinge.location = P((x0 + x1) / 2, y1, d1)
    r = (d1 - d0) / 2
    me = bpy.data.meshes.new("lid"); bm = bmesh.new(); n = 16; w = (x1 - x0) / 2
    ring = lambda x: [bm.verts.new((M(x), M(-r - r * math.cos(math.pi * i / n)), M(lid * math.sin(math.pi * i / n)))) for i in range(n + 1)]
    left, right = ring(-w), ring(w)
    for i in range(n): bm.faces.new((left[i], left[i + 1], right[i + 1], right[i]))
    bm.faces.new(left); bm.faces.new(list(reversed(right)))
    bm.to_mesh(me); bm.free()
    lid_o = link(bpy.data.objects.new("lid", me)); lid_o.data.materials.append(GOLD); lid_o.parent = hinge
    for p in lid_o.data.polygons: p.use_smooth = True
    bevel(lid_o, M(0.15), 1)
    parts = [lid_o]
    for x in (-w * 0.56, w * 0.56):
        bd = bpy.data.meshes.new("lid band"); bm = bmesh.new()
        a = [bm.verts.new((M(x - 0.45), M(-r - (r + 0.12) * math.cos(math.pi * i / n)), M((lid + 0.12) * math.sin(math.pi * i / n)))) for i in range(n + 1)]
        b_ = [bm.verts.new((M(x + 0.45), M(-r - (r + 0.12) * math.cos(math.pi * i / n)), M((lid + 0.12) * math.sin(math.pi * i / n)))) for i in range(n + 1)]
        for i in range(n): bm.faces.new((a[i], a[i + 1], b_[i + 1], b_[i]))
        bm.to_mesh(bd); bm.free()
        o = link(bpy.data.objects.new("lid band", bd)); o.data.materials.append(GOLD); o.parent = hinge; parts.append(o)
    hasp = box("hasp", M(-0.9), M(0.9), M(-2 * r - 0.3), M(-2 * r + 0.1), M(-2.6), M(0.6), GOLD); hasp.parent = hinge; parts.append(hasp)
    body.append(box_cm("velvet", x0 + 0.3, x1 - 0.3, y1 - 0.4, y1 - 0.3, d0 + 0.3, d1 - 0.3, plain("velvet", (0.12, 0.01, 0.015), rough=0.9, sheen=0.8), keep=False))
    return body, hinge, parts

def chest_layout(c, turn=0.0, at=(0, 0, 0)):
    """where the chest falls in the picture: the box it is drawn in (room for
    its lid swung back), where its key comes up out of it, where it is pointed
    at, where it glints. `c` as chest(); if the chest was assembled and turned,
    its frame (`at`, `turn`)."""
    x0, x1, d0, d1, y0, y1, lid = c["x0"], c["x1"], c["d0"], c["d1"], c["y0"], c["y1"], c["lid"]
    frame = Matrix.Translation(P(*at)) @ Matrix.Rotation(turn, 4, "Z")
    w = lambda x, y, d: frame @ P(x, y, d)
    box_ = box_of([w(x, y, d) for x in (x0, x1) for d in (d0, d1 + 12) for y in (y0, y1 + lid + 22)], pad=6)
    mouth = w((x0 + x1) / 2, y1 + 2, (d0 + d1) / 2)
    hit = [project(w(x, y, d)) for x in (x0, x1) for y in (y0, y1 + lid) for d in (d0, d1)]
    xs, ys = [p[0] for p in hit], [p[1] for p in hit]
    glints = [w(x1 - 2, y1 + lid * 0.9, (d0 + d1) / 2), w(x0 + (x1 - x0) * 0.62, y1 - 1, d0), w(x0 + 3, y1 + lid * 0.7, d0 + 3)]
    return {"box": box_, "mouth": [*project(mouth), scale_at(mouth)], "hit": [min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)],
            "glints": [list(project(g)) for g in glints]}

def chest_sprites(scene, out, box_, body, hinge, lid_parts, kicker=7.0):
    """The chest shut and open, alone, each in the box the game draws it in:
    everything else held out, so the room shows through round it."""
    r = scene.render
    bx, by, bw, bh = box_
    W_, H_ = r.resolution_x, r.resolution_y
    k = W_ / RW
    r.use_border = True; r.use_crop_to_border = True
    r.border_min_x, r.border_max_x = bx * k / W_, (bx + bw) * k / W_
    r.border_min_y, r.border_max_y = 1 - (by + bh) * k / H_, 1 - by * k / H_
    r.film_transparent = True; r.image_settings.color_mode = "RGBA"
    mine = set(o.name for o in body + lid_parts)
    # (gilt in a dark room gives back only the dark: a soft light from our
    # side, falling on the chest alone, for its gold to be seen by)
    gilt = bpy.data.collections.new("the chest"); scene.collection.children.link(gilt)
    for o in body + lid_parts: gilt.objects.link(o)
    bpy.context.view_layer.update()
    centre = sum((o.matrix_world.translation for o in body), Vector()) / len(body)
    toward = (scene.camera.matrix_world.translation - centre).normalized()
    kick = lamp("on the chest", "AREA", tuple(centre + toward * 0.7 + Vector((0, 0, 0.45))), aim=tuple(centre), energy=kicker, colour=(1.0, 0.8, 0.55), size=0.6)
    kick.light_linking.receiver_collection = gilt
    kick.visible_camera = False
    for o in bpy.data.objects:
        if o.type in ("MESH", "CURVE", "FONT"):
            o.is_holdout = o.name not in mine
            if o.name in mine: o.hide_render = False
    for name, angle in (("chest-shut", 0.0), ("chest-open", -1.9)):
        hinge.rotation_euler = (angle, 0, 0)
        render(scene, os.path.join(out, f"{name}.png"))
    hinge.rotation_euler = (0, 0, 0)
    bpy.data.objects.remove(kick, do_unlink=True)
    for o in bpy.data.objects: o.is_holdout = False
    r.use_border = False; r.film_transparent = False; r.image_settings.color_mode = "RGB"

def crop_frames(scene, out, box_, frames):
    """render the room in `box_` (reference pixels) only, whole and opaque,
    once for each of `frames`: (name, what to set first)"""
    r = scene.render
    W_, H_ = r.resolution_x, r.resolution_y; k = W_ / RW
    bx, by, bw, bh = box_
    r.use_border = True; r.use_crop_to_border = True
    r.border_min_x, r.border_max_x = bx * k / W_, (bx + bw) * k / W_
    r.border_min_y, r.border_max_y = 1 - (by + bh) * k / H_, 1 - by * k / H_
    r.film_transparent = False; r.image_settings.color_mode = "RGB"
    for name, prepare in frames:
        prepare(); render(scene, os.path.join(out, f"{name}.png"))
    r.use_border = False

# ── the room's lights ──────────────────────────────────────────────────────
class Light:
    """one of the room's lights: its lamps, and what glows when it is on
    (materials whose emission it turns up); `after`, anything else that stands
    otherwise once its puzzle is done"""
    def __init__(self, name, lamps=(), glows=(), after=None):
        self.name, self.lamps, self.glows, self.after = name, list(lamps), list(glows), after
        self.energy = {l.name: l.data.energy for l in self.lamps}
        self.strength = {m.name: m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value for m in self.glows}
    def set(self, on):
        for l in self.lamps: l.data.energy = self.energy[l.name] if on else 0.0
        for m in self.glows: m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = self.strength[m.name] if on else 0.0
        if self.after: self.after(on)

def room_haze(x0, x1, d0, d1, y1, density):
    """dust in the room's air, for the moon's light to be seen in"""
    me = bpy.data.meshes.new("air"); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    # (kept a little off every wall and whatever hangs on it: a face of it lying
    # on a surface confuses the light there)
    x0, x1, d0, d1 = x0 + 7.3, x1 - 7.3, d0 + 7.3, d1 - 7.3
    for v in bm.verts: v.co = Vector((M(x0) + (v.co.x + 0.5) * M(x1 - x0), M(d0) + (v.co.y + 0.5) * M(d1 - d0), M(3.7) + (v.co.z + 0.5) * M(y1 - 7.4)))
    bm.to_mesh(me); bm.free()
    air = link(bpy.data.objects.new("air", me))
    am = bpy.data.materials.new("haze"); am.use_nodes = True
    an = am.node_tree.nodes; an.remove(an["Principled BSDF"]); vol = an.new("ShaderNodeVolumePrincipled"); vol.inputs["Density"].default_value = density; vol.inputs["Anisotropy"].default_value = 0.55
    am.node_tree.links.new(vol.outputs["Volume"], an["Material Output"].inputs["Volume"])
    air.data.materials.append(am); air.visible_shadow = False; ARCH.append(air)
    if density <= 0:
        # (no haze: the rooms are as clear as the halls — kept only so the passes have it to hide)
        for k in ("visible_camera", "visible_diffuse", "visible_glossy", "visible_transmission", "visible_volume_scatter"): setattr(air, k, False)
    return air

def night_sky(at, size, moon_at):
    """the night sky far off beyond a window (a wall of it at `at`, facing
    back toward the room), the moon in it; seen, but in no light's way"""
    sky = bpy.data.materials.new("night sky"); sky.use_nodes = True
    sn = sky.node_tree.nodes; sn.remove(sn["Principled BSDF"]); em = sn.new("ShaderNodeEmission")
    tc = sn.new("ShaderNodeTexCoord"); nz = sn.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.6; nz.inputs["Detail"].default_value = 5
    ramp = sn.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (0.003, 0.005, 0.012, 1); ramp.color_ramp.elements[1].color = (0.012, 0.02, 0.045, 1)
    sky.node_tree.links.new(tc.outputs["Object"], nz.inputs["Vector"]); sky.node_tree.links.new(nz.outputs["Fac"], ramp.inputs["Fac"])
    sky.node_tree.links.new(ramp.outputs["Color"], em.inputs["Color"]); em.inputs["Strength"].default_value = 1.0
    sky.node_tree.links.new(em.outputs["Emission"], sn["Material Output"].inputs["Surface"])
    wall = cylinder("night", 0, 0, -0.05, 0.05, size, sky, verts=8)
    wall.location = at; wall.visible_shadow = False; arch(wall)
    wall.rotation_euler = (SCENE.camera.location - Vector(at)).to_track_quat("Z", "Y").to_euler()
    moon = bpy.data.materials.new("moon"); moon.use_nodes = True
    mn = moon.node_tree.nodes; mn.remove(mn["Principled BSDF"]); me_ = mn.new("ShaderNodeEmission"); me_.inputs["Color"].default_value = (0.85, 0.9, 1.0, 1); me_.inputs["Strength"].default_value = 2.5
    moon.node_tree.links.new(me_.outputs["Emission"], mn["Material Output"].inputs["Surface"])
    disc = cylinder("moon", 0, 0, -0.01, 0.01, 0.55, moon, verts=48); disc.location = moon_at
    disc.rotation_euler = (Vector(moon_at) - SCENE.camera.location).to_track_quat("Z", "Y").to_euler(); disc.visible_shadow = False; arch(disc)
    return wall

# ── what the game is told ──────────────────────────────────────────────────
class Layout:
    """Where everything the game keeps alive fell in the picture, in the
    reference picture's pixels: written beside the room's code
    (src/levels/house/rooms/<Room>.json) for levels/house/roomRender.js."""
    def __init__(self, room):
        self.room = room
        self.data = {"width": RW, "height": RH, "things": [], "glows": {}, "flames": {}, "panes": [], "extra": {}}
    def thing(self, level, label, points, first=None):
        """something that opens a puzzle: its outline (round the places given)"""
        t = {"level": level, "label": label, "quad": [list(p) for p in outline(points)]}
        if first: t["first"] = {"label": first[0], "quad": [list(p) for p in outline(first[1])]}
        self.data["things"].append(t)
    def chest(self, c, **frame):
        self.data["chest"] = chest_layout(c, **frame)
    def glow(self, name, at, radius_cm):
        """a light the scene keeps alive: where it is, how far its glow reaches"""
        x, y = project(at); self.data["glows"][name] = [x, y, round(radius_cm * scale_at(at), 2)]
    def flame(self, name, at):
        """a candle's flame: where its foot is, how big a centimetre is there"""
        x, y = project(at); self.data["flames"][name] = [x, y, scale_at(at)]
    def pane(self, points):
        self.data["panes"].append([list(project(p)) for p in points])
    def dust(self, points):
        """where dust turns in the moonbeam"""
        self.data["dust"] = box_of(points, pad=0)
    def point(self, name, at):
        x, y = project(at); self.data["extra"][name] = [x, y, scale_at(at)]
    def box(self, name, points, pad=3):
        self.data["extra"][name] = box_of(points, pad)
    def quad(self, name, points):
        """a flat four-cornered thing the scene draws over (a screen's glass), its corners in order"""
        self.data.setdefault("quads", {})[name] = quad_of(name, points)
    def write(self):
        path = os.path.join(ROOT, "src/levels/house/rooms", f"{self.room}.json")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f: json.dump(self.data, f, indent=1)
        print("LAYOUT", path)

def leaf_blade(name, at, r, mat, squash=(1, 1, 1)):
    """a flattened sphere (a leaf, a petal) whose own origin is its middle, at
    `at`: turned, it turns where it is"""
    o = sphere(name, (0, 0, 0), r, mat, squash=squash)
    o.location = at
    return o

def darken_model(root, k=(0.5, 0.47, 0.42)):
    """a model brought in, dimmed by `k` (old varnish, old dust)"""
    seen = set()
    for name in root["meshes"]:
        for slot in bpy.data.objects[name].material_slots:
            mat = slot.material
            if not mat or mat.name in seen or not mat.use_nodes: continue
            seen.add(mat.name)
            for node in [n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"]:
                bc = node.inputs["Base Color"]
                if bc.is_linked:
                    mul = mat.node_tree.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
                    mul.inputs[7].default_value = (*k, 1)
                    mat.node_tree.links.new(bc.links[0].from_socket, mul.inputs[6]); mat.node_tree.links.new(mul.outputs[2], bc)
                else:
                    c = bc.default_value; bc.default_value = (c[0] * k[0], c[1] * k[1], c[2] * k[2], c[3])

def framed(at, turn=0.0):
    """places in something stood at `at` (cm), turned `turn`: (x, y, d) in its
    own frame, in Blender's"""
    m = Matrix.Translation(P(*at)) @ Matrix.Rotation(turn, 4, "Z")
    return lambda x, y, d: m @ P(x, y, d)

def quad_of(name, points):
    """for Layout.quad: a flat four-cornered thing the scene draws over"""
    c = sum((Vector(p) if isinstance(p, Vector) else P(*p) for p in points), Vector()) / len(points)
    return {"points": [list(project(p)) for p in points], "s": scale_at(c)}

def model_top(root):
    """how high a model brought in stands (cm), as it is placed"""
    bpy.context.view_layer.update()
    return max((bpy.data.objects[n].matrix_world @ Vector(c)).z for n in root["meshes"] for c in bpy.data.objects[n].bound_box) * 100

AMBIENT = ("fill", "fill at the eye", "fill on the right", "on the walls", "bookcase glow", "end wall glow")
def finish(scene, samples, keep_gloss=()):
    """What makes a room as clean as the halls: enough samples that the
    denoiser has little to guess (it smears grain and print when it has to),
    stray bright paths clamped, and no varnish shine — coat taken off and a
    floor under the roughness of everything that is not metal or glass
    (`keep_gloss`: materials left as they are)."""
    c = scene.cycles
    c.samples = samples; c.adaptive_threshold = 0.006; c.adaptive_min_samples = 64
    c.sample_clamp_indirect = 4.0; c.sample_clamp_direct = 0.0
    detail_scans()
    # (the room's own light at night is the halls': cool, soft, even — every
    # light that is only there to fill is given the moon's colour)
    for o in bpy.data.objects:
        if o.type == "LIGHT" and o.data.type == "AREA" and o.name.split(".")[0] in AMBIENT: o.data.color = (0.8, 0.85, 1.0)
    c.use_denoising = True; c.denoiser = "OPENIMAGEDENOISE"
    c.denoising_input_passes = "RGB_ALBEDO_NORMAL"; c.denoising_prefilter = "ACCURATE"
    try: c.denoising_quality = "HIGH"
    except Exception: pass
    for mat in bpy.data.materials:
        if mat.name in keep_gloss or not mat.use_nodes: continue
        for node in [n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"]:
            metal = node.inputs["Metallic"]; glass = node.inputs["Transmission Weight"]
            if metal.is_linked or metal.default_value > 0.5 or glass.default_value > 0.5: continue
            node.inputs["Coat Weight"].default_value = min(node.inputs["Coat Weight"].default_value, 0.08)
            r = node.inputs["Roughness"]
            if r.is_linked:
                mx = mat.node_tree.nodes.new("ShaderNodeMath"); mx.operation = "MAXIMUM"; mx.inputs[1].default_value = 0.42
                mat.node_tree.links.new(r.links[0].from_socket, mx.inputs[0]); mat.node_tree.links.new(mx.outputs[0], r)
            else:
                r.default_value = max(r.default_value, 0.42)

def detail_scans():
    """Every scanned material given its scan's own normal map (nor_gl, beside
    its Diffuse), under whatever bump it already has: the grain of the wood,
    the weave, the pits in plaster, as the halls show them."""
    for mat in bpy.data.materials:
        if not mat.use_nodes or mat.get("detailed"): continue
        N = mat.node_tree.nodes; Lk = mat.node_tree.links.new
        diff = next((n for n in N if n.type == "TEX_IMAGE" and n.image and os.path.basename(n.image.filepath).lower().startswith("diffuse")), None)
        bsdf = next((n for n in N if n.type == "BSDF_PRINCIPLED"), None)
        if not diff or not bsdf: continue
        path = os.path.join(os.path.dirname(bpy.path.abspath(diff.image.filepath)), "nor_gl.jpg")
        if not os.path.exists(path): continue
        t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(path, check_existing=True); t.image.colorspace_settings.name = "Non-Color"
        t.projection = diff.projection; t.projection_blend = diff.projection_blend
        if diff.inputs["Vector"].is_linked: Lk(diff.inputs["Vector"].links[0].from_socket, t.inputs["Vector"])
        nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 0.9
        Lk(t.outputs["Color"], nm.inputs["Color"])
        nrm = bsdf.inputs["Normal"]
        if nrm.is_linked and nrm.links[0].from_node.type == "BUMP":
            Lk(nm.outputs["Normal"], nrm.links[0].from_node.inputs["Normal"])
        elif not nrm.is_linked:
            Lk(nm.outputs["Normal"], nrm)
        mat["detailed"] = True

def probe(px, py):
    """what is seen at a point of the reference picture (a debugging aid):
    the first things a ray from the eye through it meets"""
    cam = SCENE.camera; bpy.context.view_layer.update()
    frame = [cam.matrix_world @ v for v in cam.data.view_frame(scene=SCENE)]   # top right, bottom right, bottom left, top left
    u, v = px / RW, py / RH
    top = frame[3].lerp(frame[0], u); bottom = frame[2].lerp(frame[1], u)
    target = top.lerp(bottom, v); origin = cam.matrix_world.translation
    d = (target - origin).normalized(); o = origin.copy()
    dg = bpy.context.evaluated_depsgraph_get()
    for _ in range(6):
        hit, loc, nrm, idx, obj, mat = SCENE.ray_cast(dg, o, d)
        if not hit: print("PROBE", px, py, "nothing"); return
        print("PROBE", px, py, obj.name, [round(c * 100) for c in loc], obj.active_material.name if obj.active_material else None)
        o = loc + d * 0.001

EYE = {}
def eye_fill(energy, size=1.6, ahead=30):
    """The halls' fill: a broad, soft, cool light a little ahead of the eye and
    above it, shining halfway between level and the way the eye looks (from a
    high eye looking down, onto the floor as well as the walls) — so that
    whatever faces the eye (a desk's front, a chair, the floor before it, the
    wall up to its cornice) is never quite black, as nothing in the halls is.
    It is lifted half the way to whatever is overhead, at most 40 cm, so it
    stays under the ceiling; it is not seen and puts no shine on anything.
    `ahead` (cm): how far before the eye it hangs — in a long room, a way
    down it, as the halls' fill is, so the far end has its share."""
    cam = SCENE.camera; bpy.context.view_layer.update()
    eye = cam.matrix_world.translation.copy()
    look = cam.matrix_world.to_3x3() @ Vector((0, 0, -1))
    level = Vector((look.x, look.y, 0)).normalized()
    foot = eye + level * M(ahead)
    hit, loc, *_ = SCENE.ray_cast(bpy.context.evaluated_depsgraph_get(), foot, Vector((0, 0, 1)))
    up = min(0.4, 0.5 * (loc.z - foot.z)) if hit else 0.4
    at = foot + Vector((0, 0, up))
    toward = (look + level).normalized()
    o = lamp("fill at the eye", "AREA", tuple(at), aim=tuple(at + toward), energy=energy, colour=(0.8, 0.85, 1.0), size=size)
    o.visible_camera = False; o.visible_glossy = False
    EYE["fill"] = o
    return o

def sweep(lit, plates):
    """(calibrating against the halls: `--sweep 1,2,4/-0.5,0,0.5` adds a plate
    `sweep-i-j` for each strength of the fill at the eye — times its own —
    at each step of exposure from the room's own)"""
    spec, fill = arg("--sweep", ""), EYE.get("fill")
    if not spec or not fill: return plates
    strengths, steps = ([float(v) for v in part.split(",")] for part in spec.split("/"))
    energy, exposure = fill.data.energy, SCENE.view_settings.exposure
    def off():
        fill.data.energy = energy; SCENE.view_settings.exposure = exposure
    for i, k in enumerate(strengths):
        for j, s in enumerate(steps):
            def on(k=k, s=s):
                lit.set(True); fill.data.energy = energy * k; SCENE.view_settings.exposure = exposure + s
            plates[f"sweep-{i}-{j}"] = (on, off)
    return plates

def one_light(lit, out=()):
    """A room by one light, as the halls are: `lit` the Light that burns —
    always — and `out` every other, put out for good (lamps dark, shades and
    bulbs cold). Returns the single plate to render, `lights-1`."""
    for light in out:
        for l in light.lamps: l.data.energy = 0.0
        for m in light.glows: m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 0.0
    lit.set(True)
    return sweep(lit, {"lights-1": (lambda: lit.set(True), lambda: lit.set(True))})

# ── glassware and a bench's slate, as the laboratories have them ─────────

def honed_slate(name):
    """a slab of slate honed flat, as a laboratory bench is topped: dark
    charcoal-grey, faintly clouded, streaked a little along its grain, its
    finish dulled unevenly where glass and hands have worn it"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L_ = m.node_tree.links.new; b_ = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    def noise(scale, detail, stretch=(1, 1, 1), rough=0.55):
        mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = stretch
        L_(tc.outputs["Object"], mp.inputs["Vector"])
        n = N.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = detail; n.inputs["Roughness"].default_value = rough
        L_(mp.outputs["Vector"], n.inputs["Vector"])
        return n.outputs["Fac"]
    def blend(a, b2, k):
        mx = N.new("ShaderNodeMix"); mx.data_type = "FLOAT"; mx.inputs[0].default_value = k
        L_(a, mx.inputs[2]); L_(b2, mx.inputs[3]); return mx.outputs[0]
    def band(v, lo, hi, a=0.0, b2=1.0):
        mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = lo; mr.inputs["From Max"].default_value = hi
        mr.inputs["To Min"].default_value = a; mr.inputs["To Max"].default_value = b2; L_(v, mr.inputs["Value"]); return mr.outputs["Result"]
    def math_(op, a, b2):
        mt = N.new("ShaderNodeMath"); mt.operation = op
        for k, v in enumerate((a, b2)):
            if isinstance(v, (int, float)): mt.inputs[k].default_value = v
            else: L_(v, mt.inputs[k])
        return mt.outputs[0]
    stone = blend(blend(noise(1.6, 6), noise(2.5, 8, (0.3, 8.0, 8.0)), 0.35), noise(14.0, 10, rough=0.7), 0.3)
    # (rings, faint, where bottles have stood wet; scuffs where things were slid)
    vor = N.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 4.0; L_(tc.outputs["Object"], vor.inputs["Vector"])
    ring = math_("MULTIPLY", band(math_("ABSOLUTE", math_("SUBTRACT", vor.outputs["Distance"], 0.3), 0), 0.004, 0.016, 1.0, 0.0), band(noise(3.0, 2), 0.5, 0.58))
    scuff = band(noise(30.0, 6, (0.25, 6.0, 6.0)), 0.62, 0.72)
    mark = math_("MINIMUM", math_("ADD", math_("MULTIPLY", ring, 0.7), math_("MULTIPLY", scuff, 0.5)), 1.0)
    ramp = N.new("ShaderNodeValToRGB"); cr = ramp.color_ramp
    cr.elements[0].position, cr.elements[1].position = 0.32, 0.7
    cr.elements[0].color = (0.013, 0.0135, 0.014, 1); cr.elements[1].color = (0.05, 0.05, 0.051, 1)
    L_(stone, ramp.inputs["Fac"])
    dull = N.new("ShaderNodeMix"); dull.data_type = "RGBA"; dull.blend_type = "SCREEN"; L_(mark, dull.inputs[0])
    L_(ramp.outputs["Color"], dull.inputs[6]); dull.inputs[7].default_value = (0.07, 0.07, 0.068, 1)
    L_(dull.outputs[2], b_.inputs["Base Color"])
    L_(math_("ADD", band(noise(5.0, 4), 0.3, 0.7, 0.45, 0.62), math_("MULTIPLY", mark, 0.2)), b_.inputs["Roughness"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.04; bump.inputs["Distance"].default_value = 0.001
    L_(noise(90.0, 3), bump.inputs["Height"]); L_(bump.outputs["Normal"], b_.inputs["Normal"])
    b_.inputs["Specular IOR Level"].default_value = 0.4
    m["detailed"] = True
    return m
GLASS_WALL = 0.0022                               # (a bottle's glass, 2.2 mm)
def walls(prof, t):
    """the inside of a vessel turned from its outside `prof` [(r, z)], from its
    foot on the axis up to its rim: every point moved t in, square to the glass"""
    def normal(a, b_):
        dr, dz = b_[0] - a[0], b_[1] - a[1]; n = math.hypot(dr, dz) or 1.0
        return (-dz / n, dr / n)
    inner = []
    for k, p in enumerate(prof):
        ns = ([normal(prof[k - 1], p)] if k else []) + ([normal(p, prof[k + 1])] if k + 1 < len(prof) else [])
        nr, nz = sum(n[0] for n in ns), sum(n[1] for n in ns); L = math.hypot(nr, nz) or 1.0
        nr, nz = nr / L, nz / L
        cos = max(0.35, nr * ns[0][0] + nz * ns[0][1])
        inner.append((max(0.0, p[0] + nr * t / cos), p[1] + nz * t / cos))
    return inner
def vessel(name, prof, mat, at, floor=None, t=GLASS_WALL, steps=48):
    """a glass vessel, its walls t thick, open at its mouth: `prof` its outside,
    from its foot on the axis up to its rim; `floor` (m) where its inside
    begins, when the glass of its foot is thicker than its walls. Returns the
    vessel and its inside, from its floor up."""
    inner = walls(prof, t)
    if floor is not None:
        up = [p for p in inner if p[1] > floor + 0.0005]
        inner = [(0.0, floor), (up[0][0], floor)] + up
    return lathe(name, prof + inner[::-1], mat, at=at, steps=steps), inner
def fill(name, inner, level, mat, at, steps=48, meniscus=True):
    """a vessel's liquid, from its floor up to `level` (m), just into its glass;
    its surface drawn up a little at the walls, standing at `level` in the
    middle, where it is read"""
    def radius(z):
        for (r0, z0), (r1, z1) in zip(inner, inner[1:]):
            if z0 <= z <= z1 and z1 > z0: return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
        return inner[-1][0]
    floor = inner[0][1]
    prof = [(0.0, floor - 0.0002)] + [(radius(z) + 0.00015, z) for z in (floor + (level - floor) * k / 14 for k in range(15))]
    if meniscus: prof = prof[:-1] + [(radius(level + 0.0012) - 0.00006, level + 0.0012), (radius(level) * 0.82, level + 0.0003), (0.0, level)]
    else: prof.append((0.0, level))
    o = lathe(name, prof, mat, at=at, steps=steps)
    # (its surface shaded flat where it lies level, so that what is seen through
    # it is not broken into facets)
    bm = bmesh.new(); bm.from_mesh(o.data); rl = radius(level) * (0.82 if meniscus else 1.0) + 1e-6
    for fc in bm.faces:
        c = fc.calc_center_median(); fc.smooth = not (fc.normal.z > 0.5 and math.hypot(c.x, c.y) < rl)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.link_faces[0].smooth != e.link_faces[1].smooth: e.smooth = False
    bm.to_mesh(o.data); bm.free()
    return o
