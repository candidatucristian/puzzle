# The Night Circuit (levels/rally): the six rally cars, rendered in Cycles at
# every view the drive needs — the game's own car (cars.js, exported by
# rally_export.mjs: its mesh, what each face of it is, its liveries and door
# numbers) given real paint, glass, rubber and lamps alight, under the
# stage's lights, its shadow on the gravel kept in the picture's alpha.
#
# Each view is drawn exactly as the game's software renderer drew it: the
# same yaw and pitch, the same pixels to a metre, the car's foot at the same
# place in the same cell (cars.json) — so the game turns, places and fades
# them just as before. One sheet per car, four views across.
#
#   node art/blender/rally_export.mjs
#   blender -b --factory-startup -P art/blender/rally_cars.py -- [--samples 96] [--only 0]
#   node art/blender/rally_publish.mjs

import bpy, bmesh, math, sys, os, json
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import ROOT

IN = os.path.join(ROOT, ".artifacts/rally")
OUT = os.path.join(IN, "cars")
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "96"))
CAR = json.load(open(os.path.join(IN, "car.json")))
VIEWS = json.load(open(os.path.join(IN, "cars.json")))
CELL, PPM, PITCH = VIEWS["cell"], VIEWS["ppm"], VIEWS["pitchDeg"]
RAD = math.pi / 180
M = lambda v: Vector((v[0], v[2], v[1]))          # (the game's car frame — x forward, y up, z left — in Blender's)

scene = fresh()

# ── the car's mesh ─────────────────────────────────────────────────────────
PART = CAR["parts"]
pos, idx, part, kind = CAR["pos"], CAR["idx"], CAR["part"], CAR["kind"]
me = bpy.data.meshes.new("rally car")
verts = [tuple(M(pos[i * 3:i * 3 + 3])) for i in range(len(pos) // 3)]
faces = [tuple(idx[t * 3:t * 3 + 3]) for t in range(len(idx) // 3)]
me.from_pydata(verts, [], faces); me.update()
car = link(bpy.data.objects.new("rally car", me))
# (one slot per material: by part, and on the body by what that face is)
K = {"PAINT": 0, "GLASS": 1, "BLACK": 2, "GRILLE": 3, "HEAD": 4, "TAIL": 5, "PILLAR": 6, "SEAL": 7}
SLOTS = ["paint", "glass", "black", "grille", "head", "tail", "pillar", "seal",
         "tread", "wall", "rim", "liner", "pod", "pod lamp", "wing", "mirror", "flap", "vent", "tow", "exhaust"]
BY_PART = {PART["TREAD"]: "tread", PART["WALL"]: "wall", PART["RIM"]: "rim", PART["LINER"]: "liner", PART["POD"]: "pod",
           PART["POD_LAMP"]: "pod lamp", PART["WING"]: "wing", PART["MIRROR"]: "mirror", PART["FLAP"]: "flap",
           PART["VENT"]: "vent", PART["TOW"]: "tow", PART["EXHAUST"]: "exhaust"}
BY_KIND = {v: k.lower() for k, v in K.items()}
for t, p in enumerate(me.polygons):
    pid = part[idx[t * 3]]
    name = BY_KIND[kind[t]] if pid == PART["BODY"] else BY_PART.get(pid, "black")
    p.material_index = SLOTS.index(name)
    p.use_smooth = pid not in (PART["POD"], PART["WING"], PART["FLAP"], PART["VENT"], PART["TOW"], PART["MIRROR"])
bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
car.modifiers.new("edges", "WEIGHTED_NORMAL")

# ── its materials ──────────────────────────────────────────────────────────
X0, X1, Y1, ZT = CAR["xr"] - 0.05, CAR["xf"] + 0.05, 1.6, 1.0
def livery_paint(c):
    """the paint, by the livery's pictures: the side seen from the right or
    the left, the top from above, as the face looks; dust over it low down"""
    m = bpy.data.materials.new(f"paint {c}"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); L(tc.outputs["Object"], sep.inputs[0])
    nrm = N.new("ShaderNodeSeparateXYZ"); geo = N.new("ShaderNodeNewGeometry")
    tr = N.new("ShaderNodeVectorTransform"); tr.convert_from = "WORLD"; tr.convert_to = "OBJECT"; tr.vector_type = "NORMAL"
    L(geo.outputs["Normal"], tr.inputs[0]); L(tr.outputs[0], nrm.inputs[0])
    def mr(v, a, b_):
        n = N.new("ShaderNodeMapRange"); n.inputs["From Min"].default_value = a; n.inputs["From Max"].default_value = b_; L(v, n.inputs["Value"]); return n.outputs["Result"]
    u = mr(sep.outputs["X"], X0, X1)
    v_side = mr(sep.outputs["Z"], 0.0, Y1)
    v_top = mr(sep.outputs["Y"], -ZT, ZT)
    def img(path, u_, v_):
        cmb = N.new("ShaderNodeCombineXYZ"); L(u_, cmb.inputs["X"]); L(v_, cmb.inputs["Y"])
        t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(path, check_existing=True); t.extension = "EXTEND"
        L(cmb.outputs[0], t.inputs["Vector"]); return t.outputs["Color"]
    right = img(os.path.join(IN, f"livery-{c}-right.png"), u, v_side)
    left = img(os.path.join(IN, f"livery-{c}-left.png"), u, v_side)
    top = img(os.path.join(IN, f"livery-{c}-top.png"), u, v_top)
    lr = N.new("ShaderNodeMix"); lr.data_type = "RGBA"
    side_k = N.new("ShaderNodeMath"); side_k.operation = "GREATER_THAN"; side_k.inputs[1].default_value = 0.0; L(sep.outputs["Y"], side_k.inputs[0])
    L(side_k.outputs[0], lr.inputs["Factor"]); L(right, lr.inputs[6]); L(left, lr.inputs[7])
    up_k = N.new("ShaderNodeMath"); up_k.operation = "GREATER_THAN"; up_k.inputs[1].default_value = 0.6; L(nrm.outputs["Z"], up_k.inputs[0])
    st = N.new("ShaderNodeMix"); st.data_type = "RGBA"; L(up_k.outputs[0], st.inputs["Factor"]); L(lr.outputs[2], st.inputs[6]); L(top, st.inputs[7])
    dirt = img(os.path.join(IN, "dirt.png"), u, v_side)
    dsep = N.new("ShaderNodeSeparateColor"); L(dirt, dsep.inputs[0])
    dust = N.new("ShaderNodeMix"); dust.data_type = "RGBA"; dust.inputs[7].default_value = (0.3, 0.25, 0.19, 1)
    L(dsep.outputs["Red"], dust.inputs["Factor"]); L(st.outputs[2], dust.inputs[6])
    L(dust.outputs[2], b.inputs["Base Color"])
    rr = N.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.22; rr.inputs["To Max"].default_value = 0.85
    L(dsep.outputs["Red"], rr.inputs["Value"]); L(rr.outputs["Result"], b.inputs["Roughness"])
    cw = N.new("ShaderNodeMapRange"); cw.inputs["To Min"].default_value = 0.6; cw.inputs["To Max"].default_value = 0.0
    L(dsep.outputs["Red"], cw.inputs["Value"]); L(cw.outputs["Result"], b.inputs["Coat Weight"])
    b.inputs["Coat Roughness"].default_value = 0.08
    return m
def col(c): return tuple(c)
def mat(name, colour, rough=0.5, metal=0.0, emit=None, strength=0.0, coat=0.0):
    return plain(name, colour, rough=rough, metal=metal, emit=emit, strength=strength, coat=coat)
FIXED = {
    "glass": mat("glass", (0.012, 0.014, 0.018), rough=0.04, coat=1.0),
    "black": mat("black plastic", (0.018, 0.018, 0.02), rough=0.62),
    "grille": mat("grille", (0.025, 0.025, 0.028), rough=0.5, metal=0.3),
    "head": mat("headlamp", (1.0, 0.96, 0.88), emit=(1.0, 0.93, 0.8), strength=26),
    "tail": mat("tail lamp", (0.45, 0.02, 0.015), emit=(1.0, 0.05, 0.02), strength=2.5),
    "pillar": mat("pillar", (0.012, 0.012, 0.014), rough=0.35),
    "seal": mat("seal", (0.01, 0.01, 0.011), rough=0.7),
    "tread": mat("tread", (0.028, 0.026, 0.024), rough=0.9),
    "wall": mat("tyre wall", (0.035, 0.033, 0.03), rough=0.8),
    "liner": mat("arch liner", (0.012, 0.011, 0.01), rough=0.9),
    "pod": mat("lamp pod", (0.015, 0.015, 0.017), rough=0.45),
    "pod lamp": mat("pod lamp", (1.0, 0.97, 0.9), emit=(1.0, 0.95, 0.85), strength=34),
    "vent": mat("roof vent", (0.02, 0.02, 0.022), rough=0.55),
    "tow": mat("tow strap", (0.55, 0.04, 0.03), rough=0.7),
    "exhaust": mat("exhaust", (0.08, 0.07, 0.065), rough=0.4, metal=0.9),
}
for s in SLOTS: me.materials.append(FIXED.get(s, FIXED["black"]))
def dress(c):
    liv = CAR["liveries"][c]
    me.materials[SLOTS.index("paint")] = livery_paint(c)
    me.materials[SLOTS.index("mirror")] = me.materials[SLOTS.index("paint")]
    me.materials[SLOTS.index("rim")] = mat(f"rim {c}", col(liv["rim"]), rough=0.3 if liv.get("rimMetal") else 0.45, metal=1.0 if liv.get("rimMetal") else 0.0)
    me.materials[SLOTS.index("wing")] = mat(f"wing {c}", col(liv["wing"]), rough=0.3, coat=0.4)
    me.materials[SLOTS.index("flap")] = mat(f"flap {c}", col(liv["flap"]), rough=0.75)

# ── the gravel it stands on: only its shadow kept ──────────────────────────
ground = link(bpy.data.objects.new("gravel", bpy.data.meshes.new("gravel")))
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=12); bm.to_mesh(ground.data); bm.free()
ground.is_shadow_catcher = True

# ── the night it is reflected in: dark sky, the stadium's haze along the
# horizon, the treeline, lit gravel below ─────────────────────────────────
world = bpy.data.worlds.new("night"); scene.world = world; world.use_nodes = True
WN = world.node_tree.nodes; WL = world.node_tree.links.new
wc = WN.new("ShaderNodeTexCoord"); ws = WN.new("ShaderNodeSeparateXYZ"); WL(wc.outputs["Generated"], ws.inputs[0])
ramp = WN.new("ShaderNodeValToRGB"); r = ramp.color_ramp
r.elements[0].position = 0.38; r.elements[0].color = (0.09, 0.072, 0.055, 1)
r.elements[1].position = 1.0; r.elements[1].color = (0.008, 0.011, 0.024, 1)
for (p_, c_) in ((0.5, (0.02, 0.018, 0.018, 1)), (0.505, (0.13, 0.105, 0.085, 1)), (0.52, (0.035, 0.03, 0.03, 1)), (0.6, (0.06, 0.055, 0.06, 1))):
    e = r.elements.new(p_); e.color = c_
gz = WN.new("ShaderNodeMath"); gz.operation = "MULTIPLY_ADD"; gz.inputs[1].default_value = 0.5; gz.inputs[2].default_value = 0.5
WL(ws.outputs["Z"], gz.inputs[0]); WL(gz.outputs[0], ramp.inputs["Fac"]); WL(ramp.outputs["Color"], WN["Background"].inputs["Color"])
WN["Background"].inputs["Strength"].default_value = 1.0

# ── the stage's lights, fixed to the camera as the game has them ───────────
def norm(v): return Vector(v).normalized()
STAGE = [((-0.68, 0.52, 0.52), (1.0, 0.84, 0.64), 2.3), ((0.68, 0.52, 0.52), (1.0, 0.84, 0.64), 2.3),
         ((-0.3, 0.42, -0.86), (1.0, 0.88, 0.74), 1.25), ((0.3, 0.42, -0.86), (1.0, 0.88, 0.74), 1.25),
         ((-0.55, 0.7, 0.45), (0.5, 0.62, 0.95), 0.16)]
SUNS = []
for (d, c, I) in STAGE:
    s = lamp("stage light", "SUN", (0, 0, 0), energy=I * float(arg("--light", "2.2")), colour=c, angle=math.radians(2.5))
    SUNS.append((s, norm(d)))

# ── the camera, per view, exactly as cars.js's rasteriser ─────────────────
cd = bpy.data.cameras.new("eye"); cd.type = "ORTHO"; cd.sensor_fit = "HORIZONTAL"; cd.ortho_scale = CELL["w"] / PPM
cd.clip_start = 0.1; cd.clip_end = 100
cam = link(bpy.data.objects.new("eye", cd)); scene.camera = cam
def basis(yaw, pitch):
    psi, phi = yaw * RAD, pitch * RAD
    d = Vector((math.cos(psi) * math.cos(phi), math.sin(phi), math.sin(psi) * math.cos(phi)))
    f = -d; rl = math.hypot(f[2], f[0]) or 1
    right = Vector((f[2] / rl, 0, -f[0] / rl))
    up = Vector((f[1] * right[2] - f[2] * right[1], f[2] * right[0] - f[0] * right[2], f[0] * right[1] - f[1] * right[0]))
    h = -math.pi / 2 - psi
    return d, right, up, math.cos(h), math.sin(h)
def view(yaw):
    d, right, up, ch, sh = basis(yaw, PITCH)
    db, rb, ub = M(d), M(right), M(up)
    w, h, ax, ay = CELL["w"], CELL["h"], CELL["ax"], CELL["ay"]
    centre = rb * ((w / 2 - ax) / PPM) + ub * ((ay - h / 2) / PPM)
    rot = Matrix((rb, ub, db)).transposed()
    cam.matrix_world = Matrix.Translation(centre + db * 30) @ rot.to_4x4()
    # (each light, as the game turns it into the car's frame)
    for (s, dl) in SUNS:
        c = Vector((dl[0] * ch + dl[2] * sh, dl[1], -dl[0] * sh + dl[2] * ch))
        toward = M(c).normalized()
        s.rotation_euler = (-toward).to_track_quat("-Z", "Y").to_euler()

cycles(scene, SAMPLES, CELL["w"], CELL["h"], exposure=float(arg("--exposure", "0.0")), glare=False, transparent=True)
scene.view_settings.look = "AgX - Medium High Contrast"
scene.cycles.adaptive_threshold = 0.01
COLS = 4
for c in range(len(CAR["liveries"])):
    if arg("--only", "") and str(c) != arg("--only", ""): continue
    dress(c)
    for i, yaw in enumerate(VIEWS["yaws"]):
        if arg("--frames", "") and str(i) not in arg("--frames", "").split(","): continue
        view(yaw)
        render(scene, os.path.join(OUT, f"car-{c}-{i:02d}.png"))
print("RALLY_CARS_DONE")
