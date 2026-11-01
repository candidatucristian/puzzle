# Before Sunrise (levels/wires): the picture on Room IV's back wall — the
# last minute before sunrise over English country, made in three dimensions
# and rendered with Cycles. From a hilltop meadow: on the left an old wooden
# farmhouse under a tin roof, its porch lantern still burning, the flag hung
# out from its porch post, and on the porch a man in his rocking chair with
# his guitar, singing to the morning; a split-rail fence and a dry-stone wall
# in the wet grass; in the middle a weathered telegraph pole, five wires on
# it, and on the wires six swallows — where the puzzle has them (puzzle.js
# WIRE_BIRDS: which wire, how far across the picture); beyond, the valley
# under its mist, hedgerows and trees, far hills, and the sky going from slate
# to apricot where the sun will come up.
#
# Rendered: the picture (16:9), and where the birds fell in it
# (dawnCountry.json). The picture is what Room IV hangs (room_counting.py
# reads it as .artifacts/rooms/painting.png) and what the level frames
# (dawn_frame.py).
#
#   blender -b --factory-startup -P art/blender/dawn_country.py -- [--samples 512] [--width 2560] [--preview 1]

import bpy, bmesh, math, os, sys, json, random
from mathutils import Vector, Matrix, noise
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import ROOT, scan
import dawn_folk as folk

OUT = os.path.join(ROOT, ".artifacts/dawn-country")
os.makedirs(OUT, exist_ok=True)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")
PREVIEW = arg("--preview", "") == "1"
SAMPLES = int(arg("--samples", "40" if PREVIEW else "512"))
WIDTH = int(arg("--width", "960" if PREVIEW else "2560"))
HEIGHT = WIDTH * 9 // 16
RNG = random.Random(1961)

# the clue (src/levels/wires/puzzle.js): the five wires bottom to top, and
# for each of the six birds which wire and how far across the picture
WIRE_BIRDS = [(1, .12), (2, .23), (3, .34), (2, .68), (0, .79), (4, .90)]
POLE_X = .52

scene = fresh()
cd = bpy.data.cameras.new("eye"); cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36
cd.lens = float(arg("--lens", "35")); cd.shift_y = float(arg("--shift", "0.0")); cd.clip_start = 0.1; cd.clip_end = 20000
cam = link(bpy.data.objects.new("eye", cd)); cam.location = (0, 0, 1.65)
cam.rotation_euler = (math.radians(90 + float(arg("--tilt", "2.5"))), 0, 0)
scene.camera = cam
scene.render.resolution_x, scene.render.resolution_y = WIDTH, HEIGHT
bpy.context.view_layer.update()
from bpy_extras.object_utils import world_to_camera_view
def frac(p):
    v = world_to_camera_view(scene, cam, Vector(p)); return v.x, 1 - v.y

# ── the land: a meadow falling away to a valley, far hills ────────────────
def height(x, y):
    """the ground's height (m) at x across, y away"""
    t = min(1.0, max(0.0, (y - 20) / 330))
    near = -62.0 * (3 * t * t - 2 * t * t * t) ** 0.8 - 0.07 * min(y, 20) - 0.004 * min(y, 20) ** 2 + 0.25 * noise.noise(Vector((x * 0.08, y * 0.08, 0.3)))
    fall = 0.0
    valley = 5.0 * noise.noise(Vector((x * 0.003, y * 0.003, 1.7))) if y > 300 else 0.0
    hills = 0.0
    if y > 1800:
        t = min(1.0, (y - 1800) / 3200)
        hills = t * (95 + 60 * noise.noise(Vector((x * 0.0005, y * 0.0005, 4.2))) + 25 * noise.noise(Vector((x * 0.002, y * 0.002, 7.1))))
    return near + fall + valley + hills
def terrain():
    me = bpy.data.meshes.new("land"); bm = bmesh.new()
    rows = []; y = 0.5; k = 0
    ys = []
    while y < 7000: ys.append(y); y = 0.5 + 0.9 * (1.045 ** k - 1) * 4.0; k += 1
    cols = 180
    for y in ys:
        span = 25 + y * 1.25
        rows.append([bm.verts.new((x, y, height(x, y))) for x in (-span + 2 * span * i / cols for i in range(cols + 1))])
    for a, b in zip(rows, rows[1:]):
        for i in range(cols): bm.faces.new((a[i], a[i + 1], b[i + 1], b[i]))
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("land", me))
    for p in o.data.polygons: p.use_smooth = True
    return o
LAND = terrain()

def land_material():
    """the meadow's own grass close by; further off fields of different
    greens and a few ploughed, hedged about, all going blue in the distance"""
    m = bpy.data.materials.new("land"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    grass = N.new("ShaderNodeTexImage"); grass.image = bpy.data.images.load(f"{ASSETS}/textures/grass_ground/Diffuse.jpg", check_existing=True)
    gm = N.new("ShaderNodeMapping"); gm.inputs["Scale"].default_value = (0.6, 0.6, 0.6); L(tc.outputs["Object"], gm.inputs["Vector"]); L(gm.outputs["Vector"], grass.inputs["Vector"])
    vz = N.new("ShaderNodeTexVoronoi"); vz.inputs["Scale"].default_value = 0.012; vz.feature = "F1"; L(tc.outputs["Object"], vz.inputs["Vector"])
    edge = N.new("ShaderNodeTexVoronoi"); edge.inputs["Scale"].default_value = 0.012; edge.feature = "DISTANCE_TO_EDGE"; L(tc.outputs["Object"], edge.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp; cr.interpolation = "CONSTANT"
    cr.elements[0].position = 0.0; cr.elements[0].color = (0.05, 0.085, 0.03, 1)
    cr.elements[1].position = 0.3; cr.elements[1].color = (0.08, 0.11, 0.035, 1)
    for pos, col in ((0.5, (0.11, 0.12, 0.05, 1)), (0.68, (0.06, 0.1, 0.04, 1)), (0.85, (0.14, 0.1, 0.06, 1))):
        e = cr.elements.new(pos); e.color = col
    L(vz.outputs["Color"], ramp.inputs["Fac"])
    hedge = N.new("ShaderNodeMapRange"); hedge.inputs["From Min"].default_value = 0.0; hedge.inputs["From Max"].default_value = 0.035
    hedge.inputs["To Min"].default_value = 0.35; hedge.inputs["To Max"].default_value = 1.0
    L(edge.outputs["Distance"], hedge.inputs["Value"])
    fields = N.new("ShaderNodeMix"); fields.data_type = "RGBA"; fields.blend_type = "MULTIPLY"; fields.inputs["Factor"].default_value = 1.0
    L(ramp.outputs["Color"], fields.inputs[6]); L(hedge.outputs["Result"], fields.inputs[7])
    near_ = N.new("ShaderNodeSeparateXYZ"); L(tc.outputs["Object"], near_.inputs["Vector"])
    nr = N.new("ShaderNodeMapRange"); nr.inputs["From Min"].default_value = 40; nr.inputs["From Max"].default_value = 160
    L(near_.outputs["Y"], nr.inputs["Value"])
    gh = N.new("ShaderNodeHueSaturation"); gh.inputs["Value"].default_value = 0.4; gh.inputs["Saturation"].default_value = 1.15; gh.inputs["Hue"].default_value = 0.58
    L(grass.outputs["Color"], gh.inputs["Color"])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; L(nr.outputs["Result"], mix.inputs["Factor"]); L(gh.outputs["Color"], mix.inputs[6]); L(fields.outputs[2], mix.inputs[7])
    L(mix.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.95; b.inputs["Specular IOR Level"].default_value = 0.08
    gn = N.new("ShaderNodeTexImage"); gn.image = bpy.data.images.load(f"{ASSETS}/textures/grass_ground/nor_gl.jpg", check_existing=True); gn.image.colorspace_settings.name = "Non-Color"
    L(gm.outputs["Vector"], gn.inputs["Vector"])
    nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 0.8; L(gn.outputs["Color"], nm.inputs["Color"]); L(nm.outputs["Normal"], b.inputs["Normal"])
    return m
LAND.data.materials.append(land_material())

# ── what grows: grass, nettles, dandelions, small daisies, weeds ───────────
def kit_of(mids, name):
    """the parts of some models, each stood on its own foot at the origin,
    in a collection kept out of the picture (for scattering)"""
    col = bpy.data.collections.new(name); scene.collection.children.link(col)
    for mid in mids:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=f"{ASSETS}/models/{mid}/{mid}.gltf")
        bpy.context.view_layer.update()
        for o in [o for o in bpy.data.objects if o not in before]:
            if o.type != "MESH": bpy.data.objects.remove(o, do_unlink=True); continue
            me = o.data.copy(); me.transform(o.matrix_world)
            co = [v.co for v in me.vertices]
            me.transform(Matrix.Translation((-(min(c.x for c in co) + max(c.x for c in co)) / 2, -(min(c.y for c in co) + max(c.y for c in co)) / 2, -min(c.z for c in co))))
            n = bpy.data.objects.new(o.name, me); col.objects.link(n)
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.context.view_layer.layer_collection.children[name].exclude = True
    for o in col.objects:
        for mat in o.data.materials:
            if not mat or mat.get("dawn"): continue
            bc = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if not bc: continue
            mat["dawn"] = True
            bc.inputs["Specular IOR Level"].default_value = min(0.25, bc.inputs["Specular IOR Level"].default_value)
            src = bc.inputs["Base Color"]
            if src.is_linked:
                mx = mat.node_tree.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "MULTIPLY"; mx.inputs["Factor"].default_value = 1.0
                mx.inputs[7].default_value = (0.55, 0.6, 0.5, 1)
                mat.node_tree.links.new(src.links[0].from_socket, mx.inputs[6]); mat.node_tree.links.new(mx.outputs[2], src)
    return col
def scatter(target, col, count, size, spread=0.4, seed=1, vgroup=None):
    ps = target.modifiers.new(col.name, "PARTICLE_SYSTEM").particle_system
    st = ps.settings; st.type = "HAIR"; st.count = count; st.hair_length = 1.0
    st.render_type = "COLLECTION"; st.instance_collection = col; st.use_collection_pick_random = True
    st.particle_size = size; st.size_random = spread; st.use_rotations = True; st.rotation_mode = "GLOB_Z"
    st.phase_factor_random = 2.0; st.use_advanced_hair = True
    ps.seed = seed
    if vgroup: ps.vertex_group_density = vgroup
    return ps
def meadow():
    """the near meadow, its own mesh (finer than the land) for the grass"""
    me = bpy.data.meshes.new("meadow"); bm = bmesh.new()
    xs = [-28 + i * 0.5 for i in range(113)]; ys = [8.0 + j * 0.5 for j in range(70)]
    grid = [[bm.verts.new((x, y, height(x, y) + 0.01)) for x in xs] for y in ys]
    for a, b in zip(grid, grid[1:]):
        for i in range(len(xs) - 1): bm.faces.new((a[i], a[i + 1], b[i + 1], b[i]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("meadow", me)); o.data.materials.append(LAND.data.materials[0])
    o.hide_render = False
    return o
MEADOW = meadow()
GRASS = kit_of(["grass_medium_01", "grass_medium_02"], "grass kit")
for o in [o for o in GRASS.objects if "tall" in o.name]: GRASS.objects.unlink(o)    # (nothing tall enough to stand up into the sky)
FLOWERS = kit_of(["dandelion_01", "flower_ursinia"], "flower kit")     # (low things only: nothing to stand up into the sky)
scatter(MEADOW, GRASS, int(arg("--grass", "60000")), 1.25, 0.5, 3)
scatter(MEADOW, FLOWERS, int(arg("--flowers", "5000")), 1.0, 0.5, 7)

# ── the valley: hedgerows and trees, a copse or two ────────────────────────
TREES = kit_of(["island_tree_01", "island_tree_02", "island_tree_03", "tree_small_02"], "tree kit")
TREE_SOURCES = list(TREES.objects)
TREE_TALL = {o.name: max(v.co.z for v in o.data.vertices) for o in TREE_SOURCES}
def tree(x, y, h):
    src = RNG.choice(TREE_SOURCES)
    o = bpy.data.objects.new("tree", src.data); link(o)
    k = h / max(0.1, TREE_TALL[src.name])
    o.scale = (k * RNG.uniform(0.85, 1.15), k * RNG.uniform(0.85, 1.15), k); o.rotation_euler = (0, 0, RNG.uniform(0, math.tau))
    o.location = (x, y, height(x, y) - 0.2)
FAST = arg("--fast", "1" if PREVIEW else "") == "1"
for _ in range(30 if FAST else 95):               # hedgerows: lines of trees across the valley
    x0, y0 = RNG.uniform(-2600, 2600), RNG.uniform(380, 3000)
    a = RNG.uniform(0, math.pi); L_ = RNG.uniform(120, 520)
    n = int(L_ / RNG.uniform(9, 16))
    for k in range(n):
        if RNG.random() < 0.12: continue
        t = k / max(1, n - 1)
        x, y = x0 + math.cos(a) * L_ * t, y0 + math.sin(a) * L_ * t
        if y < 380: continue
        tree(x + RNG.gauss(0, 2), y + RNG.gauss(0, 2), RNG.uniform(8, 15))
for _ in range(25 if FAST else 60):               # trees standing alone, and copses
    x, y = RNG.uniform(-2400, 2400), RNG.uniform(380, 3200)
    for _k in range(RNG.choice([1, 1, 4, 8, 12])):
        tree(x + RNG.gauss(0, 14), y + RNG.gauss(0, 14), RNG.uniform(9, 17))
for (x, y, h) in ((-17, 30, 11), (-25, 40, 13), (26, 44, 9), (44, 120, 12), (-46, 140, 13), (70, 180, 12)):
    tree(x, y, h)                                 # (the nearer ones, down the slope)

# ── the farmhouse on the left, its porch, the man singing on it ────────────
STONE = scan("foundation stone", "old_sandstone_02", size=1.6, tint=(0.95, 0.88, 0.75), bright=0.85, sat=0.7, rough=(0.6, 0.9), bump=0.9, edges=0.2)
SIDING = scan("weathered siding", "dark_wooden_planks", size=1.3, tint=(0.66, 0.56, 0.45), bright=0.55, sat=0.35, rough=(0.7, 0.92), bump=0.7, edges=0.35)
GABLE = scan("weathered gable boards", "dark_wooden_planks", size=1.3, tint=(0.62, 0.53, 0.43), bright=0.5, sat=0.35, rough=(0.7, 0.92), bump=0.7, upright=True)
TIMBER = scan("old timber", "dark_wood", size=1.2, tint=(0.6, 0.5, 0.42), bright=0.45, sat=0.4, rough=(0.6, 0.85), bump=0.5, edges=0.3)
GREY_WOOD = scan("weathered wood", "dark_wood", size=1.0, tint=(0.62, 0.58, 0.52), bright=0.5, sat=0.15, rough=(0.65, 0.9), bump=0.6, edges=0.4)
PORCH_BOARDS = scan("porch boards", "wood_floor_worn", size=1.4, tint=(0.62, 0.54, 0.46), bright=0.5, sat=0.3, rough=(0.7, 0.92), bump=0.6)
WALLSTONE = scan("dry stone", "mossy_stone_wall", size=1.2, tint=(0.9, 0.9, 0.85), bright=0.75, sat=0.7, rough=(0.6, 0.9), bump=1.0)
TIN = aged_metal("old tin roof", (0.34, 0.34, 0.35), (0.2, 0.085, 0.035), rough=(0.45, 0.82), scale=5, tarnish=0.72)
WINDOW_GLOW = plain("lit window", (1.0, 0.75, 0.45), emit=(1.0, 0.62, 0.3), strength=float(arg("--window", "6")))
DARK_GLASS = plain("dark glass", (0.02, 0.025, 0.03), rough=0.08)
C = dict(at=(float(arg("--hx", "-10.0")), float(arg("--hy", "19"))), turn=math.radians(float(arg("--hturn", "45"))), L=8.0, D=5.0, H=2.9)
cottage = bpy.data.objects.new("farmhouse", None); link(cottage)
def part(o): o.parent = cottage; return o
def cbox(name, x0, x1, y0, y1, z0, z1, mat, r=0.0):
    o = box(name, x0, x1, y0, y1, z0, z1, mat)
    if r: bevel(o, r, 2)
    return part(o)
def mesh_of(name, verts, faces, mat, smooth=False):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in verts], [], faces); me.update()
    o = part(link(bpy.data.objects.new(name, me))); me.materials.append(mat)
    for p in me.polygons: p.use_smooth = smooth
    return o
L_, D_, H_ = C["L"], C["D"], C["H"]
SILL_Z = 0.3                                      # (the boards start over a stone footing)
# (the house's own frame: x across its front, y back from it, z up; the front faces local -y)
cbox("footing", -L_ / 2 - 0.05, L_ / 2 + 0.05, -0.05, D_ + 0.05, -0.6, SILL_Z, STONE, 0.03)
cbox("walls", -L_ / 2, L_ / 2, 0, D_, SILL_Z - 0.02, H_, SIDING)
# its clapboards: lapped boards 17 cm to the weather, each a thin wedge, the
# openings left clear (in front: two windows and the door)
WINDOWS = ((-2.4, True), (0.6, False))
OPENINGS = [(wx - 0.52, wx + 0.52, 0.98, 2.12) for (wx, _) in WINDOWS] + [(1.97, 2.98, -1.0, 2.08)]
def clapboards(length, openings, place):
    z = SILL_Z
    while z < H_ - 0.02:
        z1 = min(H_, z + 0.19)
        cuts = sorted((a, b) for (a, b, c, d) in openings if c < z1 and d > z)
        x = -length / 2 - 0.03; spans = []
        for (a, b) in cuts:
            if a > x: spans.append((x, a))
            x = max(x, b)
        if x < length / 2 + 0.03: spans.append((x, length / 2 + 0.03))
        for (x0, x1) in spans:
            if x1 - x0 < 0.02: continue
            # (a wedge: thick at its foot, thin where the next board laps it)
            vs = [(x0, -0.032, z), (x1, -0.032, z), (x1, -0.006, z1), (x0, -0.006, z1),
                  (x0, 0.0, z), (x1, 0.0, z), (x1, 0.0, z1), (x0, 0.0, z1)]
            fs = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (3, 2, 6, 7), (0, 3, 7, 4), (1, 5, 6, 2)]
            mesh_of("clapboard", [place(Vector(v)) for v in vs], fs, SIDING)
        z += 0.17
for (length, openings, place) in (
        (L_, OPENINGS, lambda v: v),                                                 # front
        (L_, [], lambda v: Vector((-v.x, D_ - v.y, v.z))),                           # back
        (D_, [], lambda v: Vector((-L_ / 2 + v.y, D_ / 2 + v.x, v.z))),              # left end
        (D_, [], lambda v: Vector((L_ / 2 - v.y, D_ / 2 - v.x, v.z)))):             # right end
    clapboards(length, openings, place)
for (cx, cy) in ((-L_ / 2, 0), (L_ / 2, 0), (-L_ / 2, D_), (L_ / 2, D_)):         # (corner boards)
    cbox("corner board", cx - 0.07, cx + 0.07, cy - 0.07, cy + 0.07, SILL_Z, H_, TIMBER, 0.01)
RISE = D_ / 2 * math.tan(math.radians(36))
for gx in (-L_ / 2 - 0.03, L_ / 2 + 0.03):
    me = bpy.data.meshes.new("gable"); bm = bmesh.new()
    vs = [bm.verts.new(v) for v in ((gx, 0, H_), (gx, D_, H_), (gx, D_ / 2, H_ + RISE))]
    bm.faces.new(vs); bm.to_mesh(me); bm.free()
    g = part(link(bpy.data.objects.new("gable", me))); g.data.materials.append(GABLE)
    g.modifiers.new("thick", "SOLIDIFY").thickness = 0.06
# the roof: corrugated tin on both slopes, gone to rust in streaks
def corrugated(name, x0, x1, eave, ridge, mat, period=0.076, amp=0.011):
    eave, ridge = Vector(eave), Vector(ridge); s = (ridge - eave).normalized()
    n = Vector((0, -s.z, s.y)); n = n if n.z > 0 else -n
    k = int((x1 - x0) / period * 8); rows = 3
    vs = [eave.lerp(ridge, j / (rows - 1)) + Vector((x0 + (x1 - x0) * i / k, 0, 0)) + n * amp * math.sin(math.tau * (x1 - x0) * i / k / period)
          for j in range(rows) for i in range(k + 1)]
    fs = [(j * (k + 1) + i, j * (k + 1) + i + 1, (j + 1) * (k + 1) + i + 1, (j + 1) * (k + 1) + i) for j in range(rows - 1) for i in range(k)]
    o = mesh_of(name, vs, fs, mat, smooth=True)
    o.modifiers.new("thick", "SOLIDIFY").thickness = 0.003
    return o
OVER = 0.35
TAN = math.tan(math.radians(36))
corrugated("tin roof", -L_ / 2 - 0.3, L_ / 2 + 0.3, (0, -OVER, H_ - OVER * TAN), (0, D_ / 2 + 0.02, H_ + RISE + 0.02), TIN)
corrugated("tin roof", -L_ / 2 - 0.3, L_ / 2 + 0.3, (0, D_ + OVER, H_ - OVER * TAN), (0, D_ / 2 - 0.02, H_ + RISE + 0.02), TIN)
cap = mesh_of("ridge cap", [(-L_ / 2 - 0.3, D_ / 2 - 0.16, H_ + RISE - 0.08), (L_ / 2 + 0.3, D_ / 2 - 0.16, H_ + RISE - 0.08),
                            (L_ / 2 + 0.3, D_ / 2, H_ + RISE + 0.06), (-L_ / 2 - 0.3, D_ / 2, H_ + RISE + 0.06),
                            (L_ / 2 + 0.3, D_ / 2 + 0.16, H_ + RISE - 0.08), (-L_ / 2 - 0.3, D_ / 2 + 0.16, H_ + RISE - 0.08)],
              [(0, 1, 2, 3), (3, 2, 4, 5)], TIN)
cap.modifiers.new("thick", "SOLIDIFY").thickness = 0.004
for fy in (-OVER, D_ + OVER):                                                    # (the fascia boards under the eaves)
    cbox("fascia", -L_ / 2 - 0.32, L_ / 2 + 0.32, fy - 0.03, fy + 0.03, H_ - OVER * TAN - 0.2, H_ - OVER * TAN + 0.01, TIMBER, 0.01)
cbox("chimney", -L_ / 2 + 0.3, -L_ / 2 + 1.0, D_ / 2 - 0.4, D_ / 2 + 0.4, H_, H_ + RISE + 1.0, STONE, 0.03)
cbox("chimney cap", -L_ / 2 + 0.25, -L_ / 2 + 1.05, D_ / 2 - 0.45, D_ / 2 + 0.45, H_ + RISE + 1.0, H_ + RISE + 1.08, STONE, 0.02)
# windows: one lit, one dark, in plain wooden frames; the door under the porch
for (wx, lit) in WINDOWS:
    cbox("window lining", wx - 0.5, wx + 0.5, -0.02, 0.14, 1.0, 2.1, TIMBER)
    cbox("window", wx - 0.42, wx + 0.42, -0.04, 0.02, 1.07, 2.03, WINDOW_GLOW if lit else DARK_GLASS)
    cbox("glazing bar", wx - 0.03, wx + 0.03, -0.07, -0.03, 1.07, 2.03, TIMBER)
    cbox("glazing bar", wx - 0.42, wx + 0.42, -0.07, -0.03, 1.53, 1.58, TIMBER)
    for (a, b) in ((wx - 0.6, wx - 0.5), (wx + 0.5, wx + 0.6)):
        cbox("window casing", a, b, -0.06, 0.0, 0.96, 2.16, TIMBER, 0.01)
    cbox("window head", wx - 0.62, wx + 0.62, -0.08, 0.0, 2.12, 2.22, TIMBER, 0.01)
    cbox("sill", wx - 0.62, wx + 0.62, -0.16, 0.02, 0.92, 0.99, TIMBER, 0.015)
for k in range(5):
    cbox("door plank", 2.0 + k * 0.19, 2.0 + (k + 1) * 0.19 - 0.006, -0.05, 0.05, SILL_Z, 2.05, TIMBER, 0.006)
cbox("door ledge", 2.03, 2.92, -0.075, -0.05, 0.6, 0.72, TIMBER, 0.006); cbox("door ledge", 2.03, 2.92, -0.075, -0.05, 1.6, 1.72, TIMBER, 0.006)
for (a, b) in ((1.9, 2.0), (2.95, 3.05)):
    cbox("door casing", a, b, -0.07, 0.0, SILL_Z, 2.15, TIMBER, 0.01)
# the porch: boards on joists, two steps, posts, a beam, a lean-to of tin
PZ = 0.42
cbox("porch joists", 0.9, L_ / 2 + 0.3, -2.4, 0.0, -0.6, PZ - 0.04, TIMBER)
for k in range(int(2.4 / 0.14)):
    y0 = -2.4 + k * 0.14
    cbox("porch board", 0.88, L_ / 2 + 0.32, y0 + 0.004, y0 + 0.136, PZ - 0.04, PZ, PORCH_BOARDS, 0.004)
for st in range(2):
    cbox("step", 1.6, 2.6, -2.4 - 0.32 * (st + 1), -2.4 - 0.32 * st, PZ - 0.2 * (st + 1) - 0.04, PZ - 0.2 * (st + 1), PORCH_BOARDS, 0.006)
    cbox("step riser", 1.6, 2.6, -2.4 - 0.32 * (st + 1), -2.4 - 0.32 * (st + 1) + 0.03, -0.6, PZ - 0.2 * (st + 1) - 0.04, TIMBER)
POSTS = (1.0, L_ / 2 + 0.15)
for px_ in POSTS:
    cbox("porch post", px_ - 0.07, px_ + 0.07, -2.34, -2.2, PZ, 2.45, TIMBER, 0.015)
cbox("porch beam", 0.9, L_ / 2 + 0.3, -2.4, -2.16, 2.45, 2.6, TIMBER, 0.02)
cbox("porch rail", POSTS[1] - 0.04, POSTS[1] + 0.04, -2.2, -0.05, PZ + 0.86, PZ + 0.92, GREY_WOOD, 0.01)
for k in range(9):
    yb = -2.15 + k * 0.24
    cbox("baluster", POSTS[1] - 0.025, POSTS[1] + 0.025, yb - 0.025, yb + 0.025, PZ, PZ + 0.86, GREY_WOOD, 0.006)
corrugated("porch tin", 0.75, L_ / 2 + 0.45, (0, -2.7, 2.58), (0, 0.15, 2.58 + 2.85 * math.tan(math.radians(14))), TIN)
# the lantern on the wall by the door, still burning
lantern = import_model("Lantern_01", height=0.32, at=(0, 0, 0))
lantern.parent = cottage; lantern.location = (1.72, -0.16, 1.85)
FLAME = plain("lantern flame", (1.0, 0.7, 0.3), emit=(1.0, 0.6, 0.25), strength=60)
fl = sphere("flame", (1.72, -0.2, 1.97), 0.018, FLAME, squash=(0.6, 0.6, 1.6)); part(fl)
lantern_l = lamp("lantern", "POINT", (0, 0, 0), energy=float(arg("--lantern", "55")), colour=(1.0, 0.55, 0.22), size=0.03)
part(lantern_l); lantern_l.location = (1.72, -0.24, 1.98)
win_l = lamp("lit window", "AREA", (0, 0, 0), energy=float(arg("--winlight", "25")), colour=(1.0, 0.62, 0.32), size=0.9)
part(win_l); win_l.location = (-2.4, -0.3, 1.55); win_l.rotation_euler = (math.radians(90), 0, 0)
# the rocking chair, the man in it singing to his guitar, turned toward the
# valley and the morning (dawn_folk.py)
MAN_TURN = math.radians(float(arg("--manturn", "-176")))
chair = import_model("Rockingchair_01", height=1.0, at=(0, 0, 0))
chair.parent = cottage; chair.location = (3.0, -1.2, PZ); chair.rotation_euler = (0, 0, MAN_TURN + math.pi)
man = folk.singer("singer"); man.parent = cottage; man.location = (3.0, -1.12, PZ + 0.45); man.rotation_euler = (0, 0, MAN_TURN)
porch_glow = lamp("porch, round the singer", "POINT", (0, 0, 0), energy=float(arg("--singerlight", "8")), colour=(1.0, 0.6, 0.3), size=0.2)
part(porch_glow); porch_glow.location = (2.4, -1.9, 2.1)
for (x_, y_, s_) in ((1.25, -2.0, 0.55), (4.1, -0.4, 0.7)):
    pot = import_model("planter_pot_clay", height=0.32 * s_, at=(0, 0, 0)); pot.parent = cottage; pot.location = (x_, y_, PZ)
cottage.location = (*C["at"], height(*C["at"])); cottage.rotation_euler = (0, 0, C["turn"])
bpy.context.view_layer.update()
# the flag on the outer porch post, its pole out over the steps (its cloth let
# fall where it hangs, in the world's own frame)
FLAG_AT = cottage.matrix_world @ Vector((POSTS[1] - 0.09, -2.34, 2.0))
FLAG_DIR = cottage.matrix_world.to_3x3() @ Vector((float(arg("--flagx", "0.5")), float(arg("--flagy", "-0.7")), float(arg("--flagz", "0.52"))))
flag_root, flag_cloth = folk.porch_flag("flag", os.path.join(DRAWN, "us-flag.png"), tuple(FLAG_AT), tuple(FLAG_DIR))
# ivy and shrubs at its foot
bpy.context.view_layer.update()
SHRUBS = kit_of(["shrub_01", "shrub_02", "shrub_03", "shrub_04"], "shrub kit")
for _ in range(16):
    src = RNG.choice(list(SHRUBS.objects)); o = bpy.data.objects.new("shrub", src.data); link(o)
    a = RNG.uniform(-L_ / 2 - 1, L_ / 2 + 1); bx_, by_ = RNG.choice([(a, -0.2), (-L_ / 2 - 0.3, RNG.uniform(0, D_))])
    w = cottage.matrix_world @ Vector((bx_, by_, 0)); k = RNG.uniform(1.2, 1.8)
    o.scale = (k, k, k * RNG.uniform(0.9, 1.2)); o.rotation_euler = (0, 0, RNG.uniform(0, math.tau)); o.location = (w.x, w.y, height(w.x, w.y) - 0.05)

# ── the fence, the dry-stone wall, in the foreground ───────────────────────
def fence(a, b, posts):
    a, b = Vector(a), Vector(b)
    for k in range(posts):
        t = k / (posts - 1); p = a.lerp(b, t)
        z = height(p.x, p.y)
        po = box("fence post", -0.07, 0.07, -0.07, 0.07, -0.3, 1.15, GREY_WOOD); bevel(po, 0.015, 2)
        po.location = (p.x, p.y, z); po.rotation_euler = (RNG.uniform(-0.05, 0.05), RNG.uniform(-0.06, 0.06), RNG.uniform(0, 0.4))
    d = (b - a); ang = math.atan2(d.y, d.x)
    for zr in (0.5, 0.95):
        for k in range(posts - 1):
            p0, p1 = a.lerp(b, k / (posts - 1)), a.lerp(b, (k + 1) / (posts - 1))
            mid = (p0 + p1) / 2; ln = (p1 - p0).length
            r = box("fence rail", -ln / 2 - 0.12, ln / 2 + 0.12, -0.04, 0.04, -0.055, 0.055, GREY_WOOD); bevel(r, 0.012, 2)
            r.location = (mid.x, mid.y, height(mid.x, mid.y) + zr + RNG.uniform(-0.04, 0.04)); r.rotation_euler = (RNG.uniform(-0.04, 0.04), RNG.uniform(-0.05, 0.05), ang)
fence((1.5, 8.6), (9.5, 10.8), 4)
def dry_wall(a, b):
    a, b = Vector(a), Vector(b); d = b - a; ang = math.atan2(d.y, d.x); n = int(d.length / 0.32)
    for row, (zz, hh) in enumerate(((0.0, 0.22), (0.2, 0.2), (0.38, 0.18), (0.54, 0.14))):
        for k in range(n):
            t = (k + (0.5 if row % 2 else 0) + RNG.uniform(-0.1, 0.1)) / n
            if t > 1: continue
            p = a.lerp(b, t)
            s = box("wall stone", -0.17, 0.17, -0.2 + row * 0.03, 0.2 - row * 0.03, 0, hh, WALLSTONE); bevel(s, 0.04, 2)
            s.location = (p.x, p.y, height(p.x, p.y) + zz - 0.04); s.rotation_euler = (RNG.uniform(-0.12, 0.12), RNG.uniform(-0.12, 0.12), ang + RNG.uniform(-0.2, 0.2))
            s.scale = (RNG.uniform(0.8, 1.25), 1, RNG.uniform(0.8, 1.2))
dry_wall((-6.4, 9.0), (-0.8, 8.2))

# ── the telegraph pole, its five wires, the six birds ──────────────────────
POLE = Vector((float(arg("--px", "0.21")), float(arg("--py", "10")), 0)); POLE.z = height(POLE.x, POLE.y)
POLE_TOP = 6.1
cylinder("telegraph pole", POLE.x, POLE.y, POLE.z - 0.5, POLE.z + POLE_TOP, 0.13, GREY_WOOD, verts=20, r2=0.095)
cylinder("pole cap", POLE.x, POLE.y, POLE.z + POLE_TOP, POLE.z + POLE_TOP + 0.12, 0.1, GREY_WOOD, verts=20, r2=0.02)
WIRE_Z = [POLE.z + 3.1 + 0.45 * w for w in range(5)]
ARM = 0.34
INSUL = plain("insulator", (0.55, 0.55, 0.5), rough=0.25, coat=0.3)
IRON = plain("iron", (0.05, 0.045, 0.04), rough=0.6, metal=0.7)
for z in WIRE_Z:
    box("arm", POLE.x - ARM - 0.05, POLE.x + ARM + 0.05, POLE.y - 0.03, POLE.y + 0.03, z - 0.13, z - 0.09, IRON)
    for s in (-1, 1):
        lathe("insulator", [(0, 0), (0.028, 0), (0.035, 0.02), (0.022, 0.05), (0.03, 0.06), (0.018, 0.085), (0, 0.09)], INSUL, at=(POLE.x + s * ARM, POLE.y, z - 0.09), steps=16)
LEFT = Vector((-12.0, 6.0, 0)); RIGHT = Vector((12.0, 7.0, 0))
for e in (LEFT, RIGHT): e.z = height(e.x, e.y)
WIRE = plain("wire", (0.03, 0.03, 0.03), rough=0.5, metal=0.6)
def span(a, b, sag, n=60):
    return [a.lerp(b, k / n) - Vector((0, 0, 4 * sag * (k / n) * (1 - k / n))) for k in range(n + 1)]
WIRES = []
for w, z in enumerate(WIRE_Z):
    l0 = Vector((LEFT.x, LEFT.y, LEFT.z + 0.25 + z - POLE.z)); r1 = Vector((RIGHT.x, RIGHT.y, RIGHT.z + 0.25 + z - POLE.z))
    li = Vector((POLE.x - ARM, POLE.y, z)); ri = Vector((POLE.x + ARM, POLE.y, z))
    left, right = span(l0, li, 0.2), span(ri, r1, 0.22)
    jumper = span(li, ri, 0.05, 8)
    pts = left + jumper[1:] + right[1:]
    cu = bpy.data.curves.new(f"wire {w}", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.006; cu.bevel_resolution = 2
    sp = cu.splines.new("POLY"); sp.points.add(len(pts) - 1)
    for p_, v in zip(sp.points, pts): p_.co = (*v, 1)
    o = link(bpy.data.objects.new(f"wire {w}", cu)); o.data.materials.append(WIRE)
    WIRES.append((left, right))
BIRD_K = float(arg("--bird", "2.0"))             # (a swallow, 17 cm with its streamers, made larger to be read on its wire)
# (each turned from its wire's line — some showing their backs, some their
# breasts — and its head turned a little its own way)
POSES = [(0.75, 0.0), (math.pi - 0.6, 0.3), (-0.7, -0.25), (math.pi + 0.7, 0.0), (0.6, 0.35), (math.pi - 0.8, -0.3)]
BIRDS = []
for i, (w, xf) in enumerate(WIRE_BIRDS):
    left, right = WIRES[w]
    pts = left if xf < POLE_X else right
    best = min(range(len(pts) - 1), key=lambda k: abs(frac(pts[k])[0] - xf))
    a, b = pts[best], pts[best + 1]
    fa, fb = frac(a)[0], frac(b)[0]
    t = 0.0 if abs(fb - fa) < 1e-9 else max(0.0, min(1.0, (xf - fa) / (fb - fa)))
    foot = a.lerp(b, t) + Vector((0, 0, 0.006))
    along = math.atan2((b - a).y, (b - a).x)
    turn, head = POSES[i]
    BIRDS.append((w, xf, folk.swallow(f"swallow{i}", foot, along + turn, k=BIRD_K, head_turn=head), foot))

# ── the sky before sunrise, and its light ──────────────────────────────────
world = bpy.data.worlds.new("dawn"); scene.world = world; world.use_nodes = True
N = world.node_tree.nodes; Lk = world.node_tree.links.new
sky = N.new("ShaderNodeTexSky"); sky.sky_type = "NISHITA"
sky.sun_elevation = math.radians(float(arg("--sun", "-1.0"))); sky.sun_rotation = math.radians(float(arg("--sunaz", "-12")))
sky.sun_disc = False; sky.altitude = 120; sky.air_density = float(arg("--air", "1.2")); sky.dust_density = float(arg("--dust", "2.2")); sky.ozone_density = 1.2
Lk(sky.outputs["Color"], N["Background"].inputs["Color"]); N["Background"].inputs["Strength"].default_value = float(arg("--skystrength", "1.0"))
# (the moon, a thin crescent high on the right, lit by the sun below the hills)
moon_at = cam.location + Vector((0.44, 1.0, 0.25)).normalized() * 9000
moon = sphere("moon", tuple(moon_at), 38, plain("moon", (0.8, 0.8, 0.78), rough=0.9)); moon.hide_render = True
sun_dir = Vector((math.sin(-sky.sun_rotation) * math.cos(sky.sun_elevation), math.cos(sky.sun_rotation) * math.cos(sky.sun_elevation), math.sin(sky.sun_elevation)))
sun = lamp("the sun (below the hills)", "SUN", (0, 0, 0), energy=float(arg("--sunlight", "0.0")), colour=(1.0, 0.6, 0.35), angle=math.radians(0.6))
sun.rotation_euler = (-sun_dir).to_track_quat("-Z", "Y").to_euler()
sun_m = lamp("on the moon", "SUN", (0, 0, 0), energy=12.0, colour=(1.0, 0.95, 0.9), angle=math.radians(0.6))
sun_m.rotation_euler = (-sun_dir).to_track_quat("-Z", "Y").to_euler()
moon_coll = bpy.data.collections.new("moon only"); moon_coll.objects.link(moon)
sun_m.light_linking.receiver_collection = moon_coll
# (the valley's mist: a layer of it lying low over the fields)
mist = box("mist", -6000, 6000, 260, 6000, -80, -48, None)
mist.data.materials.clear()
vm = bpy.data.materials.new("mist"); vm.use_nodes = True
VN = vm.node_tree.nodes; VL = vm.node_tree.links.new
VN.remove(VN["Principled BSDF"])
pv = VN.new("ShaderNodeVolumePrincipled"); pv.inputs["Color"].default_value = (0.75, 0.78, 0.85, 1)
gz = VN.new("ShaderNodeTexCoord"); sx = VN.new("ShaderNodeSeparateXYZ"); VL(gz.outputs["Object"], sx.inputs["Vector"])
fall = VN.new("ShaderNodeMapRange"); fall.inputs["From Min"].default_value = -66; fall.inputs["From Max"].default_value = -50
fall.inputs["To Min"].default_value = float(arg("--mist", "0.0045")); fall.inputs["To Max"].default_value = 0.0
VL(sx.outputs["Z"], fall.inputs["Value"])
mz = VN.new("ShaderNodeTexNoise"); mz.inputs["Scale"].default_value = 0.004; VL(gz.outputs["Object"], mz.inputs["Vector"])
mk = VN.new("ShaderNodeMath"); mk.operation = "MULTIPLY"; VL(fall.outputs["Result"], mk.inputs[0]); VL(mz.outputs["Fac"], mk.inputs[1])
VL(mk.outputs["Value"], pv.inputs["Density"])
VL(pv.outputs["Volume"], VN["Material Output"].inputs["Volume"])
mist.data.materials.append(vm)
haze = box("haze", -9000, 9000, 300, 9000, -90, 320, None); haze.data.materials.clear()
hm = bpy.data.materials.new("haze"); hm.use_nodes = True; HN = hm.node_tree.nodes; HN.remove(HN["Principled BSDF"])
hv = HN.new("ShaderNodeVolumePrincipled"); hv.inputs["Color"].default_value = (0.62, 0.68, 0.8, 1); hv.inputs["Density"].default_value = float(arg("--haze", "0.00022"))
hm.node_tree.links.new(hv.outputs["Volume"], HN["Material Output"].inputs["Volume"]); haze.data.materials.append(hm)
if FAST: mist.hide_render = True; haze.hide_render = True

# ── where the birds fell in the picture ────────────────────────────────────
bpy.context.view_layer.update()
data = {"width": WIDTH, "height": HEIGHT, "pole": list(frac(POLE + Vector((0, 0, WIRE_Z[2] - POLE.z)))),
        "birds": [{"wire": w, "x": round(frac(f)[0], 4), "y": round(frac(f)[1], 4)} for (w, xf, _, f) in BIRDS],
        "wires": [[list(map(lambda v: round(v, 4), frac(p))) for p in (WIRES[w][0][0], WIRES[w][0][-1], WIRES[w][1][-1])] for w in range(5)]}
with open(os.path.join(OUT, "dawnCountry.json"), "w") as fh: json.dump(data, fh, indent=1)

# ── render ─────────────────────────────────────────────────────────────────
folk.settle_cloth(scene, 48)                      # (the flag let fall to rest)
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "1.35")), glare=False)
scene.cycles.volume_step_rate = 4.0; scene.cycles.volume_bounces = 1
scene.cycles.use_denoising = True; scene.cycles.denoiser = "OPENIMAGEDENOISE"
scene.cycles.adaptive_threshold = 0.01
scene.view_settings.look = "AgX - Medium High Contrast"
render(scene, os.path.join(OUT, "preview.png" if PREVIEW else "picture.png"))
print("DAWN_DONE", json.dumps(data["birds"]))
