# The ground-floor (botanic) hall's pictures, made in Blender: what the hall
# (levels/hall/botanicMaterials.js) cuts up and lays on the walls and floor it
# paints. Each comes out in the very layout the hall reads it in:
#
#   hall-finishes   a 3 × 2 atlas of 512 squares: green silk wallpaper,
#                   polished rosewood, dark floor boards; a lawn, sage
#                   plaster, glass at night
#   hall-greenery   six cut-outs on transparency, two rows: a leafy plant in
#                   its pot, a fern in terracotta, a flowering plant in a stone
#                   pot; a fern in a hanging basket, a strand of ivy, a
#                   watering can with flowerpots and a seed packet
#   walnut-door     a six-panel walnut door, square on
#   herbarium       two framed herbarium sheets, a fern and a periwinkle
#   sconce          a brass candle sconce, its candle
#   hall-floor      the floor from above: boards either side, a strip of lawn
#                   between edging battens
#
# Every surface a CC0 scan (Poly Haven) or modelled here; nothing generated.
#
#   blender -b --factory-startup -P art/blender/botany_hall.py -- [--only finishes,greenery,door,herbarium,sconce,floor] [--samples 256]

import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
OUT = os.path.join(ROOT, ".artifacts/botany-hall")
os.makedirs(OUT, exist_ok=True)
ONLY = set(arg("--only", "finishes,greenery,door,herbarium,sconce,floor").split(","))
SAMPLES = int(arg("--samples", "256"))
RNG = random.Random(1907)

scene = fresh()
T = f"{ASSETS}/textures"

# ── shooting: an orthographic camera square on to what is shown ────────────
cd = bpy.data.cameras.new("eye"); cd.type = "ORTHO"; cd.sensor_fit = "HORIZONTAL"   # (the scale is the width, upright pictures too)
cam = link(bpy.data.objects.new("eye", cd)); scene.camera = cam
STUDIO = {"strength": 1.0}
def studio(strength=1.0, warm=True):
    STUDIO["strength"] = strength
def light_for(mid, view, size):
    """soft light from above and to the left, a fill from the right, a
    little behind: as a photographer lights a thing on its own, set round
    the middle of whatever is shot"""
    for o in [o for o in bpy.data.objects if o.type == "LIGHT"]: bpy.data.objects.remove(o, do_unlink=True)
    s_ = max(1.0, size); k = STUDIO["strength"] * s_ ** 2
    m = Vector(mid)
    at = lambda dx, dy, dz: tuple(m + Vector((dx, dy, dz)) * s_)
    if view == "front":
        lamp("key", "AREA", at(-2.5, -3.5, 3.0), aim=tuple(m), energy=650 * k, colour=(1.0, 0.93, 0.84), size=3.0 * s_)
        lamp("fill", "AREA", at(3.2, -2.5, 0.8), aim=tuple(m), energy=180 * k, colour=(0.9, 0.94, 1.0), size=3.0 * s_)
        lamp("rim", "AREA", at(1.0, 3.0, 2.5), aim=tuple(m), energy=220 * k, colour=(1, 0.97, 0.92), size=2.0 * s_)
    else:
        lamp("key", "AREA", at(-1.5, 1.2, 3.5), aim=tuple(m), energy=700 * k, colour=(1.0, 0.95, 0.88), size=3.5 * s_)
        lamp("fill", "AREA", at(2.0, -1.0, 3.0), aim=tuple(m), energy=200 * k, colour=(0.92, 0.95, 1.0), size=3.0 * s_)
world = bpy.data.worlds.new("studio"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.08, 0.08, 0.085, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0

def bounds_of(objs):
    bpy.context.view_layer.update()
    pts = []
    for o in objs:
        if o.type in ("MESH", "CURVE", "FONT"):
            pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    return (Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))),
            Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))))

def only(objs):
    keep = set(objs)
    for o in bpy.data.objects:
        if o.type in ("MESH", "CURVE", "FONT", "EMPTY"):
            o.hide_render = o not in keep
def collect(fn):
    """what `fn` makes: the objects that were not there before it"""
    before = set(bpy.data.objects); fn()
    return [o for o in bpy.data.objects if o not in before and o.type != "LIGHT"]

def shoot(objs, path, w, h, view="front", margin=1.04, transparent=True, exposure=0.0, samples=None, frame=None, lit=True):
    """photograph `objs` filling a w × h picture (or `frame`'s bounds)"""
    only(objs)
    lo, hi = bounds_of(frame or objs)
    mid = (lo + hi) / 2
    if lit: light_for(mid, view, max(hi.x - lo.x, (hi.z - lo.z) if view == "front" else (hi.y - lo.y)))
    if view == "front":
        cam.rotation_euler = (math.pi / 2, 0, 0); cam.location = (mid.x, lo.y - 10, mid.z)
        span_x, span_y = hi.x - lo.x, hi.z - lo.z
    else:
        cam.rotation_euler = (0, 0, 0); cam.location = (mid.x, mid.y, hi.z + 10)
        span_x, span_y = hi.x - lo.x, hi.y - lo.y
    cd.ortho_scale = max(span_x, span_y * w / h) * margin
    cd.clip_end = 100
    cycles(scene, samples or SAMPLES, w, h, exposure=exposure, glare=False, transparent=transparent)
    scene.view_settings.look = "AgX - Base Contrast"
    render(scene, path)

# ── materials ──────────────────────────────────────────────────────────────
def scan(name, tid, size=1.0, tint=(1, 1, 1), bright=1.0, sat=1.0, rough=(0.4, 0.8), bump=0.4, coat=0.0, rotate=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / size,) * 3
    mp.inputs["Rotation"].default_value = (0, rotate, 0)
    L(tc.outputs["Object"], mp.inputs["Vector"])
    def tex(kind, colour=False):
        for folder in ("textures4k", "textures"):
            for ext in ("jpg", "png"):
                p = f"{ASSETS}/{folder}/{tid}/{kind}.{ext}"
                if os.path.exists(p):
                    t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(p, check_existing=True)
                    t.image.colorspace_settings.name = "sRGB" if colour else "Non-Color"; t.projection = "BOX"; t.projection_blend = 0.2
                    L(mp.outputs["Vector"], t.inputs["Vector"]); return t
        return None
    d = tex("Diffuse", True)
    h = N.new("ShaderNodeHueSaturation"); h.inputs["Value"].default_value = bright; h.inputs["Saturation"].default_value = sat
    L(d.outputs["Color"], h.inputs["Color"])
    t = N.new("ShaderNodeMix"); t.data_type = "RGBA"; t.blend_type = "MULTIPLY"; t.inputs["Factor"].default_value = 1; t.inputs[7].default_value = (*tint, 1)
    L(h.outputs["Color"], t.inputs[6]); L(t.outputs[2], b.inputs["Base Color"])
    r = tex("Rough")
    if r:
        mr = N.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = rough[0]; mr.inputs["To Max"].default_value = rough[1]
        L(r.outputs["Color"], mr.inputs["Value"]); L(mr.outputs["Result"], b.inputs["Roughness"])
    else:
        b.inputs["Roughness"].default_value = sum(rough) / 2
    n = tex("nor_gl")
    if n:
        nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = bump
        L(n.outputs["Color"], nm.inputs["Color"]); L(nm.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Coat Weight"].default_value = coat; b.inputs["Coat Roughness"].default_value = 0.08
    return m

def aged_brass(name="brass"):
    return aged_metal(name, (0.5, 0.36, 0.17), (0.07, 0.05, 0.025), rough=(0.28, 0.6), scale=30, tarnish=0.65)

def plane(name, w, h, mat, at=(0, 0, 0), up=False, segments=1):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bm.loops.layers.uv.new()
    bmesh.ops.create_grid(bm, x_segments=segments, y_segments=segments, size=0.5, calc_uvs=True)
    for v in bm.verts: v.co = Vector((v.co.x * w, v.co.y * h, 0)) if up else Vector((v.co.x * w, 0, v.co.y * h))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat); o.location = at
    return o

# ── real grass: blades from a CC0 grass model, scattered thick ─────────────
GRASS = []
def lawn(x0, x1, y0, y1, density=30):
    """a lawn over a patch of floor: clumps of real grass at their own size,
    of six kinds, each turned and sized its own way (instances: each kind's
    mesh once in memory)"""
    if not GRASS:
        for n in ("large_a", "large_b", "mid_a", "mid_b", "mid_c", "small_a", "small_b"):
            GRASS.append(import_model("grass_medium_01", only=f"grass_medium_01_{n}_LOD0", at=(0, 0, -50)))
    out = []
    for _ in range(int((x1 - x0) * (y1 - y0) * density)):
        twin = clone(RNG.choice(GRASS), (RNG.uniform(x0, x1), RNG.uniform(y0, y1), 0), RNG.uniform(0, math.tau), RNG.uniform(0.75, 1.2))
        out.append(twin); out += meshes_of(twin)
    return out

# ════════════════════════════════════════════════════════════════════════════
# the finishes atlas: six 512 squares
# ════════════════════════════════════════════════════════════════════════════
if "finishes" in ONLY:
    cells = []
    # green silk wallpaper: slubbed threads running across, a sheen
    silk = bpy.data.materials.new("green silk"); silk.use_nodes = True
    N = silk.node_tree.nodes; L = silk.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    wv = N.new("ShaderNodeTexWave"); wv.wave_type = "BANDS"; wv.bands_direction = "Y"; wv.inputs["Scale"].default_value = 70; wv.inputs["Distortion"].default_value = 3.0; wv.inputs["Detail"].default_value = 5
    L(tc.outputs["Object"], wv.inputs["Vector"])
    sl = N.new("ShaderNodeTexNoise"); sl.inputs["Scale"].default_value = 9; sl.inputs["Detail"].default_value = 8
    mp_ = N.new("ShaderNodeMapping"); mp_.inputs["Scale"].default_value = (0.25, 12, 1); L(tc.outputs["Object"], mp_.inputs["Vector"]); L(mp_.outputs["Vector"], sl.inputs["Vector"])
    mx = N.new("ShaderNodeMath"); mx.operation = "MULTIPLY"; L(wv.outputs["Fac"], mx.inputs[0]); L(sl.outputs["Fac"], mx.inputs[1])
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (0.004, 0.035, 0.016, 1); ramp.color_ramp.elements[1].color = (0.05, 0.22, 0.11, 1)
    L(mx.outputs["Value"], ramp.inputs["Fac"]); L(ramp.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.42; b.inputs["Sheen Weight"].default_value = 0.6; b.inputs["Sheen Roughness"].default_value = 0.35
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.6; bp.inputs["Distance"].default_value = 0.002; L(mx.outputs["Value"], bp.inputs["Height"]); L(bp.outputs["Normal"], b.inputs["Normal"])
    rose = scan("rosewood", "rosewood_veneer1", size=0.7, bright=0.42, sat=1.0, rough=(0.08, 0.2), bump=0.3, coat=0.7)
    boards = scan("boards", "dark_wood", size=0.9, bright=0.38, rough=(0.2, 0.45), bump=0.5, coat=0.4, rotate=math.pi / 2)
    plaster = scan("sage plaster", "plastered_wall_04", size=1.2, tint=(0.62, 0.72, 0.6), bright=0.95, sat=0.35, rough=(0.8, 0.95), bump=0.8)
    glass = plain("night glass", (0.9, 0.95, 1.0), rough=0.02, metal=0.0, transmission=1.0)
    for k, mat in enumerate((silk, rose, boards, None, plaster, glass)):
        col, row = k % 3, k // 3
        at = (col * 1.2, 0, -row * 1.2)
        if mat is None:
            # the lawn: real blades on dark soil, seen from above
            soil = plane("soil", 1.0, 1.0, plain("soil", (0.05, 0.045, 0.02), rough=0.9), at=(at[0], 20 + at[2], 0), up=True)
            blades = lawn(at[0] - 0.62, at[0] + 0.62, 20 + at[2] - 0.62, 20 + at[2] + 0.62, density=320)
            cells.append(("top", [soil] + blades, k, soil))
        elif mat is glass:
            # glass at night: a dark sash pane with the sky and a lamp in it
            sky = bpy.data.materials.new("night beyond"); sky.use_nodes = True
            sn = sky.node_tree.nodes; sl_ = sky.node_tree.links.new; sn.remove(sn["Principled BSDF"])
            em = sn.new("ShaderNodeEmission"); grad = sn.new("ShaderNodeTexGradient"); tcs = sn.new("ShaderNodeTexCoord"); mps = sn.new("ShaderNodeMapping")
            mps.inputs["Rotation"].default_value = (0, -math.pi / 2, 0); sl_(tcs.outputs["Generated"], mps.inputs["Vector"]); sl_(mps.outputs["Vector"], grad.inputs["Vector"])
            cr = sn.new("ShaderNodeValToRGB"); cr.color_ramp.elements[0].color = (0.002, 0.006, 0.03, 1); cr.color_ramp.elements[1].color = (0.03, 0.09, 0.3, 1)
            nz2 = sn.new("ShaderNodeTexNoise"); nz2.inputs["Scale"].default_value = 3
            mxn = sn.new("ShaderNodeMath"); mxn.operation = "MULTIPLY_ADD"; mxn.inputs[1].default_value = 0.25
            sl_(nz2.outputs["Fac"], mxn.inputs[0]); sl_(grad.outputs["Fac"], mxn.inputs[2])
            sl_(mxn.outputs["Value"], cr.inputs["Fac"]); sl_(cr.outputs["Color"], em.inputs["Color"]); em.inputs["Strength"].default_value = 2.2
            sl_(em.outputs["Emission"], sn["Material Output"].inputs["Surface"])
            back = plane("night", 1.6, 1.6, sky, at=(at[0], 0.5, at[2]))
            pane = plane("pane", 1.0, 1.0, glass, at=at)
            glass.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.06
            streak = plane("streak", 0.12, 1.6, plain("lamp", (1, 1, 1), emit=(0.65, 0.78, 1.0), strength=4), at=(at[0] - 0.3, -1.5, at[2]))
            streak.visible_camera = False
            cells.append(("front", [back, pane, streak], k, pane))
        else:
            p_ = plane(f"cell{k}", 1.0, 1.0, mat, at=at, segments=2)
            cells.append(("front", [p_], k, p_))
    studio(0.55)
    for view, objs, k, framed_by in cells:
        shoot(objs, f"{OUT}/finish-{k}.png", 512, 512, view=view, margin=1.0, transparent=False, samples=128, frame=[framed_by])

# ════════════════════════════════════════════════════════════════════════════
# the greenery: six cut-outs
# ════════════════════════════════════════════════════════════════════════════
def clay_pot(at, w=0.32, h=0.28, mat=None):
    """a flowerpot: tapering, its rim rolled"""
    mat = mat or scan("terracotta", "brick_4" if os.path.exists(f"{T}/brick_4") else "rosewood_veneer1", size=0.3, tint=(0.75, 0.38, 0.22), bright=1.1, sat=0.5, rough=(0.7, 0.95))
    r0, r1 = w * 0.36, w / 2
    prof = [(0, 0), (r0, 0), (r0 * 1.02, 0.01), (r1 * 0.93, h * 0.82), (r1, h * 0.84), (r1 * 1.03, h * 0.9), (r1 * 1.02, h), (r1 * 0.9, h), (r1 * 0.88, h * 0.86), (0, h * 0.86)]
    return lathe("pot", prof, mat, at=at, steps=48)
TERRA = None
def terracotta():
    global TERRA
    if TERRA is None:
        TERRA = bpy.data.materials.new("terracotta"); TERRA.use_nodes = True
        N = TERRA.node_tree.nodes; L = TERRA.node_tree.links.new; b = N["Principled BSDF"]
        nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 40; nz.inputs["Detail"].default_value = 10
        ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (0.32, 0.12, 0.05, 1); ramp.color_ramp.elements[1].color = (0.52, 0.24, 0.12, 1)
        L(nz.outputs["Fac"], ramp.inputs["Fac"]); L(ramp.outputs["Color"], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.88
        bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.15; L(nz.outputs["Fac"], bp.inputs["Height"]); L(bp.outputs["Normal"], b.inputs["Normal"])
    return TERRA

if "greenery" in ONLY:
    studio(1.0)
    shots = []
    soil = plain("potting soil", (0.035, 0.024, 0.016), rough=1.0)
    # 1 · a leafy plant in its own clay pot (the model's)
    shots.append(collect(lambda: import_model("potted_plant_02", height=1.0)))
    # 2 · a fern in terracotta
    def fern():
        p = clay_pot((0, 0, 0), 0.34, 0.3, terracotta())
        cylinder("soil", 0, 0, 0.24, 0.25, 0.15, soil)
        import_model("fern_02", height=0.62, only="fern_02_b", at=(0, 0, 0.19))
    shots.append(collect(fern))
    # 3 · a flowering plant — periwinkle in bloom — in a stone pot
    def flowering():
        stone = scan("stone pot", "plastered_wall_04", size=0.25, tint=(0.85, 0.82, 0.74), bright=1.05, sat=0.2, rough=(0.75, 0.95), bump=1.0)
        lathe("stone pot", [(0, 0), (0.1, 0), (0.115, 0.015), (0.13, 0.17), (0.138, 0.185), (0.13, 0.195), (0.118, 0.19), (0, 0.19)], stone, steps=48)
        cylinder("soil", 0, 0, 0.17, 0.18, 0.12, soil)
        for k, (dx, dy, rot) in enumerate(((0, 0, 0), (0.06, 0.03, 1.4), (-0.06, -0.02, 2.8), (0.02, -0.06, 4.0), (-0.03, 0.06, 5.1), (0.05, -0.04, 0.7))):
            import_model("periwinkle_plant", height=0.36 + 0.03 * (k % 3), only=["periwinkle_plant_01_LOD0", "periwinkle_plant_02_LOD0"][k % 2], at=(dx, dy, 0.15), rot=rot)
    shots.append(collect(flowering))
    # 4 · a fern hung in a wire basket lined with moss, on three chains
    def hanging():
        wire = plain("wire", (0.03, 0.03, 0.03), rough=0.5, metal=0.8)
        moss = plain("moss lining", (0.06, 0.07, 0.03), rough=1.0)
        sphere("basket lining", (0, 0, 0.18), 0.19, moss, squash=(1, 1, 0.75))
        for k in range(10):
            a = k * math.tau / 10
            tube("rib", [(0, 0.04), (0.16, 0.1), (0.2, 0.2), (0.205, 0.3)], 0.003, wire, rot=a)
        for z in (0.18, 0.3):
            bpy.ops.mesh.primitive_torus_add(major_radius=0.2 if z > 0.2 else 0.17, minor_radius=0.004, location=(0, 0, z)); bpy.context.active_object.data.materials.append(wire)
        apex = Vector((0, 0, 0.78))
        for k in range(3):
            a = k * math.tau / 3 + 0.5
            foot = Vector((math.cos(a) * 0.2, math.sin(a) * 0.2, 0.3))
            c = cylinder("chain", 0, 0, 0, (apex - foot).length, 0.0028, wire, verts=6)
            c.location = foot + (apex - foot) / 2 - Vector((0, 0, (apex - foot).length / 2))
            c.rotation_euler = (apex - foot).to_track_quat("Z", "Y").to_euler()
            c.location = foot
            me = c.data
            for v in me.vertices: v.co.z -= 0.0
        bpy.ops.mesh.primitive_torus_add(major_radius=0.02, minor_radius=0.004, location=tuple(apex), rotation=(math.pi / 2, 0, 0)); bpy.context.active_object.data.materials.append(wire)
        f = import_model("fern_02", height=0.55, only="fern_02_a", at=(0, 0, 0.12))
        # (its fronds falling over the rim: squashed and drooped)
        f.scale.z *= 1.05
    shots.append(collect(hanging))
    # 5 · a strand of ivy, as it hangs from a wall
    def ivy():
        leafmat = bpy.data.materials.new("ivy leaf"); leafmat.use_nodes = True
        N = leafmat.node_tree.nodes; L = leafmat.node_tree.links.new; b = N["Principled BSDF"]
        vor = N.new("ShaderNodeTexVoronoi"); vor.feature = "DISTANCE_TO_EDGE"; vor.inputs["Scale"].default_value = 18
        ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (0.25, 0.32, 0.16, 1); ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[1].position = 0.06; ramp.color_ramp.elements[1].color = (0.02, 0.07, 0.02, 1)
        L(vor.outputs["Distance"], ramp.inputs["Fac"]); L(ramp.outputs["Color"], b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.35
        stem = plain("ivy stem", (0.08, 0.06, 0.03), rough=0.7)
        pts = [(0.02 * math.sin(i * 0.9), -i * 0.11) for i in range(16)]
        tube("ivy stem", [(x, z) for x, z in pts], 0.004, stem)
        for i in range(1, 16):
            x, z = pts[i]; side = 1 if i % 2 else -1; s = 0.055 - i * 0.0012
            me = bpy.data.meshes.new("ivy leaf"); bm = bmesh.new()
            ring = []
            for k in range(40):
                t = k / 40 * math.tau
                r = s * (0.62 + 0.38 * abs(math.cos(2.5 * t)) ** 0.6)
                ring.append(bm.verts.new((math.sin(t) * r, -0.002 * math.cos(t), math.cos(t) * r * 0.95)))
            bm.faces.new(ring); bm.to_mesh(me); bm.free()
            lf = link(bpy.data.objects.new("ivy leaf", me)); lf.data.materials.append(leafmat)
            lf.location = (x + side * s * 0.9, 0, z - s * 0.3); lf.rotation_euler = (0, side * 0.5, RNG.uniform(-0.3, 0.3))
            tube("petiole", [(x, z), (x + side * s * 0.5, z - s * 0.1)], 0.002, stem)
    shots.append(collect(ivy))
    # 6 · a galvanised watering can, two flowerpots, a seed packet
    def tools():
        zinc = aged_metal("zinc", (0.55, 0.57, 0.58), (0.2, 0.21, 0.2), rough=(0.35, 0.65), scale=12, tarnish=0.5)
        lathe("can", [(0, 0), (0.15, 0), (0.155, 0.01), (0.15, 0.3), (0.135, 0.33), (0.11, 0.34), (0, 0.34)], zinc, at=(0.05, 0.05, 0), steps=48)
        tube("spout", [(0.15, 0.06), (0.28, 0.2), (0.36, 0.34)], 0.017, zinc, at=(0.05, 0.05, 0), rot=math.pi)
        rose_ = lathe("rose", [(0, 0), (0.035, 0), (0.04, 0.02), (0.012, 0.06), (0, 0.06)], zinc, at=(0, 0, 0))
        rose_.location = (0.05 - 0.36, 0.05, 0.36); rose_.rotation_euler = (0, -0.9, 0)
        tube("handle", [(-0.12, 0.33), (-0.02, 0.48), (0.12, 0.46), (0.17, 0.3)], 0.012, zinc, at=(0.05, 0.05, 0))
        tube("back handle", [(0.15, 0.28), (0.22, 0.24), (0.21, 0.1), (0.15, 0.06)], 0.01, zinc, at=(0.05, 0.05, 0))
        clay_pot((-0.22, -0.12, 0), 0.24, 0.2, terracotta())
        clay_pot((-0.02, -0.2, 0), 0.22, 0.18, terracotta())
        kraft = scan("seed packet", "plastered_wall_04", size=0.2, tint=(0.62, 0.45, 0.28), bright=1.0, sat=0.3, rough=(0.85, 0.95), bump=0.2)
        pk = box("packet", -0.07, 0.07, -0.005, 0.005, 0, 0.2, kraft); pk.location = (0.32, -0.16, 0); pk.rotation_euler = (0.12, 0, -0.2)
        bevel(pk, 0.003)
    shots.append(collect(tools))
    for k, objs in enumerate(shots):
        shoot(objs, f"{OUT}/plant-{k}.png", 600, 600, view="front", margin=1.04)

# ════════════════════════════════════════════════════════════════════════════
# the walnut door: six raised and fielded panels
# ════════════════════════════════════════════════════════════════════════════
if "door" in ONLY:
    studio(0.7)
    walnut = scan("walnut", "rosewood_veneer1", size=0.75, tint=(0.62, 0.5, 0.42), bright=0.42, sat=0.85, rough=(0.18, 0.36), bump=0.25, coat=0.45)
    across = scan("walnut across", "rosewood_veneer1", size=0.75, tint=(0.62, 0.5, 0.42), bright=0.4, sat=0.85, rough=(0.18, 0.36), bump=0.25, coat=0.45, rotate=math.pi / 2)
    def door():
        W_, H_ = 1.0, 1.5
        box("slab", -W_ / 2, W_ / 2, 0, 0.04, 0, H_, walnut)
        # stiles and rails, standing a little proud of the panels
        for x0, x1 in ((-0.5, -0.43), (-0.035, 0.035), (0.43, 0.5)):
            bevel(box("stile", x0, x1, -0.012, 0, 0, H_, walnut), 0.004, 2)
        for z0, z1 in ((0, 0.08), (0.53, 0.6), (1.02, 1.09), (1.43, 1.5)):
            bevel(box("rail", -0.43, 0.43, -0.012, 0, z0, z1, across), 0.004, 2)
        for (z0, z1) in ((0.08, 0.53), (0.6, 1.02), (1.09, 1.43)):
            for (x0, x1) in ((-0.43, -0.035), (0.035, 0.43)):
                # the panel: a sunk margin, a fielded middle with its bevel
                box("panel", x0, x1, -0.004, 0.0, z0, z1, walnut)
                f = bevel(box("field", x0 + 0.05, x1 - 0.05, -0.016, -0.004, z0 + 0.05, z1 - 0.05, walnut), 0.03, 3)
                for (a, b_, c, d) in ((x0, x1, z0, z0 + 0.012), (x0, x1, z1 - 0.012, z1), (x0, x0 + 0.012, z0, z1), (x1 - 0.012, x1, z0, z1)):
                    bevel(box("moulding", a, b_, -0.018, -0.008, c, d, walnut), 0.004, 2)
    objs = collect(door)
    shoot(objs, f"{OUT}/door.png", 1024, 1536, view="front", margin=1.0, transparent=False)

# ════════════════════════════════════════════════════════════════════════════
# two herbarium sheets, framed
# ════════════════════════════════════════════════════════════════════════════
if "herbarium" in ONLY:
    studio(0.8)
    frame_wood = scan("frame oak", "dark_wood", size=0.3, bright=0.5, rough=(0.35, 0.6), bump=0.3, coat=0.3)
    gilt = aged_brass("gilt slip")
    sheet = paper("sheet", (0.72, 0.65, 0.5), 0.35)
    label = paper("label", (0.75, 0.7, 0.58), 0.1)
    def framed(x, plant, only_, h_plant, rot=0.0):
        w, h = 0.42, 0.62
        for nm, a in (("t", (-w / 2 - 0.035, w / 2 + 0.035, h, h + 0.035)), ("b", (-w / 2 - 0.035, w / 2 + 0.035, -0.035, 0)),
                      ("l", (-w / 2 - 0.035, -w / 2, 0, h)), ("r", (w / 2, w / 2 + 0.035, 0, h))):
            bevel(box(f"frame {nm}", x + a[0], x + a[1], -0.02, 0.02, a[2], a[3], frame_wood), 0.008, 3)
        for nm, a in (("t", (-w / 2, w / 2, h - 0.008, h)), ("b", (-w / 2, w / 2, 0, 0.008)), ("l", (-w / 2, -w / 2 + 0.008, 0, h)), ("r", (w / 2 - 0.008, w / 2, 0, h))):
            box(f"slip {nm}", x + a[0], x + a[1], -0.006, 0.0, a[2], a[3], gilt)
        box("sheet", x - w / 2, x + w / 2, 0.0, 0.004, 0, h, sheet)
        box("label", x + w / 2 - 0.15, x + w / 2 - 0.03, -0.002, 0.0, 0.035, 0.09, label)
        for k, zz in enumerate((0.12, 0.3, 0.45)):
            box("tape", x - 0.015 + k * 0.01, x + 0.02 + k * 0.01, -0.003, 0, zz, zz + 0.012, label)
        if plant is None: return
        p = import_model(plant, height=h_plant, only=only_, rot=rot)
        p.scale = (p.scale.x, p.scale.y * 0.04, p.scale.z)
        bpy.context.view_layer.update()
        lo, hi = bounds_of(meshes_of(p))
        # (never wider than the sheet)
        k_ = min(1.0, (w - 0.08) / max(1e-6, hi.x - lo.x)); p.scale = (p.scale.x * k_, p.scale.y, p.scale.z * k_)
        lo, hi = bounds_of(meshes_of(p))
        p.location += Vector((x - (lo.x + hi.x) / 2, -0.004 - hi.y, 0.06 - lo.z))
        for o in meshes_of(p):
            for mat in o.data.materials:
                if not mat or mat.get("pressed"): continue
                mat["pressed"] = True
                bsdf = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
                if bsdf and bsdf.inputs["Base Color"].is_linked:
                    hs = mat.node_tree.nodes.new("ShaderNodeHueSaturation"); hs.inputs["Saturation"].default_value = 0.55; hs.inputs["Value"].default_value = 0.8; hs.inputs["Hue"].default_value = 0.47
                    mat.node_tree.links.new(bsdf.inputs["Base Color"].links[0].from_socket, hs.inputs["Color"]); mat.node_tree.links.new(hs.outputs["Color"], bsdf.inputs["Base Color"])
    pressed = bpy.data.materials.new("pressed fern"); pressed.use_nodes = True
    pn_ = pressed.node_tree.nodes; pl_ = pressed.node_tree.links.new
    pz = pn_.new("ShaderNodeTexNoise"); pz.inputs["Scale"].default_value = 30
    pr_ = pn_.new("ShaderNodeValToRGB"); pr_.color_ramp.elements[0].color = (0.1, 0.11, 0.04, 1); pr_.color_ramp.elements[1].color = (0.2, 0.19, 0.07, 1)
    pl_(pz.outputs["Fac"], pr_.inputs["Fac"]); pl_(pr_.outputs["Color"], pn_["Principled BSDF"].inputs["Base Color"]); pn_["Principled BSDF"].inputs["Roughness"].default_value = 0.8
    def frond(x, z0, L):
        """a pressed fern frond: its stipe and rachis, pinnae either side
        tapering to the tip, each pinna cut into lobes"""
        me = bpy.data.meshes.new("frond"); bm = bmesh.new()
        def leaf(cx, cz, ang, l, w, lobes):
            pts = []
            for k in range(2 * lobes + 1):
                t = k / (2 * lobes)
                hw = w * math.sin(math.pi * min(1, t * 1.15)) * (1 if k % 2 == 0 else 0.62)
                pts.append((t * l, hw))
            for k in range(2 * lobes, -1, -1):
                t = k / (2 * lobes)
                hw = w * math.sin(math.pi * min(1, t * 1.15)) * (1 if k % 2 == 0 else 0.62)
                pts.append((t * l, -hw))
            vs = [bm.verts.new((cx + px * math.cos(ang) - py * math.sin(ang), -0.0008, cz + px * math.sin(ang) + py * math.cos(ang))) for px, py in pts[:-1]]
            bm.faces.new(vs)
        n = 22
        for i in range(n):
            t = i / n
            cz = z0 + L * (0.2 + 0.78 * t); cx = x + 0.012 * math.sin(t * 3)
            l = L * 0.32 * (1 - t) ** 0.8 + 0.01
            for side in (-1, 1):
                ang = math.pi / 2 - side * (math.pi / 2 - 0.55 - 0.25 * t)
                leaf(cx, cz, ang, l, l * 0.17, max(3, int(9 * (1 - t))))
        bm.to_mesh(me); bm.free()
        o = link(bpy.data.objects.new("frond", me)); o.data.materials.append(pressed)
        tube("rachis", [(x - 0.004, z0), (x, z0 + L * 0.2), (x + 0.012 * math.sin(3), z0 + L * 0.98)], 0.0022, pressed, at=(0, -0.001, 0))
        return o
    objs = collect(lambda: (framed(-0.28, None, None, 0, 0) , frond(-0.28, 0.07, 0.5), framed(0.28, "periwinkle_plant", "periwinkle_plant_02_LOD0", 0.48, 0.2)))
    shoot(objs, f"{OUT}/herbarium.png", 1536, 1024, view="front", margin=1.06)

# ════════════════════════════════════════════════════════════════════════════
# a candle sconce in old brass
# ════════════════════════════════════════════════════════════════════════════
SCONCE = {}
if "sconce" in ONLY:
    studio(0.9)
    brass = aged_brass()
    wax = bpy.data.materials.new("wax"); wax.use_nodes = True
    wb = wax.node_tree.nodes["Principled BSDF"]; wb.inputs["Base Color"].default_value = (0.82, 0.74, 0.58, 1)
    wb.inputs["Subsurface Weight"].default_value = 0.6; wb.inputs["Subsurface Radius"].default_value = (0.02, 0.012, 0.006); wb.inputs["Roughness"].default_value = 0.42
    def sconce():
        # the backplate, oval, with its two screws, against the wall
        bp_ = cylinder("backplate", 0, 0, -0.01, 0.01, 0.045, brass, verts=48); bp_.rotation_euler = (math.pi / 2, 0, 0); bp_.scale = (1, 2.0, 1); bp_.location = (-0.085, 0.03, 0.095)
        bevel(bp_, 0.005, 3)
        for z in (0.025, 0.165): sphere("screw", (-0.085, 0.018, z), 0.006, brass, squash=(1, 0.5, 1))
        # the arm, out from the plate and up under the cup, a little scroll in it
        tube("arm", [(-0.085, 0.1), (-0.05, 0.07), (-0.012, 0.085), (0.008, 0.14), (0.0, 0.205)], 0.009, brass)
        tube("scroll", [(-0.06, 0.12), (-0.04, 0.15), (-0.02, 0.14), (-0.025, 0.12)], 0.004, brass)
        # the drip pan, the cup
        lathe("pan", [(0, 0), (0.008, 0), (0.058, 0.012), (0.062, 0.02), (0.057, 0.022), (0.01, 0.014), (0, 0.014)], brass, at=(0, 0, 0.205), steps=48)
        lathe("cup", [(0, 0), (0.019, 0), (0.023, 0.02), (0.019, 0.034), (0.026, 0.058), (0.028, 0.063), (0.024, 0.064), (0, 0.058)], brass, at=(0, 0, 0.217), steps=48)
        # the candle, its drips, its wick
        cylinder("candle", 0, 0, 0.27, 0.47, 0.018, wax, verts=32)
        for k in range(4):
            a = -0.9 + k * 1.1; L_ = 0.03 + k * 0.014
            sphere("drip", (math.cos(a) * 0.018, -abs(math.sin(a)) * 0.018, 0.47 - L_ / 2), 0.0042, wax, squash=(1, 1, L_ / 0.0084))
        tube("wick", [(0.0, 0.0), (0.002, 0.011), (0.004, 0.02)], 0.0012, plain("wick", (0.01, 0.01, 0.01), rough=0.9), at=(0, 0, 0.47))
    objs = collect(sconce)
    shoot(objs, f"{OUT}/sconce.png", 400, 1013, view="front", margin=1.0)
    # (where the candle and the holder lie in it, for the hall's crops)
    lo, hi = bounds_of(objs)
    SCONCE.update(lo_z=lo.z, hi_z=hi.z, lo_x=lo.x, hi_x=hi.x, candle=(-0.018, 0.018, 0.27, 0.47), cup=0.217)
    import json
    with open(f"{OUT}/sconce.json", "w") as f: json.dump(SCONCE, f)

# ════════════════════════════════════════════════════════════════════════════
# the hall's floor from above: boards, a strip of lawn between battens
# ════════════════════════════════════════════════════════════════════════════
if "floor" in ONLY:
    studio(0.55)
    planks = scan("floor walnut", "dark_wood", size=1.4, tint=(0.75, 0.6, 0.5), bright=0.4, sat=0.95, rough=(0.25, 0.5), bump=0.5, coat=0.3, rotate=math.pi / 2)
    batten = scan("batten", "dark_wood", size=0.5, bright=0.35, rough=(0.3, 0.5), coat=0.3, rotate=math.pi / 2)
    W_, H_ = 2.0, 4.0
    def floor():
        g0, g1 = -W_ / 2 + 0.326 * W_, -W_ / 2 + 0.676 * W_
        # boards, each its own length and shade, running along the hall
        for side, (a, b_) in ((-1, (-W_ / 2, g0 - 0.03)), (1, (g1 + 0.03, W_ / 2))):
            x = a
            while x < b_ - 0.01:
                bw = min(0.14, b_ - x)
                y = -H_ / 2 - RNG.uniform(0, 1.2)
                while y < H_ / 2:
                    L_ = RNG.uniform(0.9, 2.1)
                    o = box("board", x + 0.0015, x + bw - 0.0015, max(y, -H_ / 2) + 0.0015, min(y + L_, H_ / 2) - 0.0015, -0.02 - RNG.uniform(0, 0.0015), 0, planks)
                    bevel(o, 0.0015, 1); o["shade"] = RNG.random()
                    y += L_
                x += bw
        box("gap", -W_ / 2, W_ / 2, -H_ / 2, H_ / 2, -0.04, -0.021, plain("gaps", (0.005, 0.004, 0.003), rough=1))
        for x0 in (g0 - 0.03, g1):
            bevel(box("batten", x0, x0 + 0.03, -H_ / 2, H_ / 2, -0.02, 0.012, batten), 0.004, 2)
        plane("soil", g1 - g0, H_, plain("soil", (0.05, 0.045, 0.02), rough=0.95), at=((g0 + g1) / 2, 0, -0.005), up=True)
    objs = collect(floor)
    g0, g1 = -W_ / 2 + 0.326 * W_, -W_ / 2 + 0.676 * W_
    objs += lawn(g0, g1, -H_ / 2, H_ / 2, density=300)
    shoot(objs, f"{OUT}/floor.png", 887, 1774, view="top", margin=1.0, transparent=False)
print("BOTANY_HALL_DONE")
