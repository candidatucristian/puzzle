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

def light_states(lights):
    """a plate for every way the lights can stand: `lights-101` has the first
    and the third on — in the order the room's scene names them"""
    variants = {}
    for mask in range(2 ** len(lights)):
        bits = [(mask >> (len(lights) - 1 - i)) & 1 for i in range(len(lights))]
        def on(bits=bits):
            for light, bit in zip(lights, bits): light.set(bool(bit))
        def off():
            for light in lights: light.set(True)
        variants["lights-" + "".join(map(str, bits))] = (on, off)
    return variants

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
