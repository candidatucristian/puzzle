"""Candlelight and Brass: the sealed letter, opened — on its own.

The letter from the envelope on the ledge, unfolded and held up to the
candles: one sheet of old cotton-rag paper, folded in three for its envelope
and opened out again, so its two folds still stand a little and its corners
curl; edges gone to tea, a few spots of foxing, dust in the folds; the date
and the initials in her hand, the cipher typed. Nothing behind it: the game
lays it over the room, darkened (levels/cryptex/NativeCryptexScene.js), and
it carries its own soft shadow.

  blender -b --factory-startup -P art/blender/cipher_letter.py -- [--samples 256]
  node art/blender/candlelight_brass_publish.mjs --letter
"""
import bpy, bmesh, math, json, re, sys
from pathlib import Path
from mathutils import Vector, noise
HERE = Path(__file__).resolve().parent; sys.path.insert(0, str(HERE))
from kit import arg, fresh, link, plain, lamp, cycles, render

ROOT = HERE.parents[1]
OUT = Path(arg("--out", str(ROOT / ".artifacts/candlelight-brass"))).resolve(); OUT.mkdir(parents=True, exist_ok=True)
SAMPLES = int(arg("--samples", "256"))
WIDTH, HEIGHT = int(arg("--width", "1240")), int(arg("--height", "1600"))
source = (ROOT / "src/levels/cryptex/puzzle.js").read_text(encoding="utf-8")
CIPHER = json.loads(re.search(r"CRYPTEX_CIPHER\s*=\s*Object.freeze\((\[[^\]]+\])\)", source).group(1))
scene = fresh()
HAND = bpy.data.fonts.load("C:/Windows/Fonts/georgiai.ttf")
TYPE = bpy.data.fonts.load("C:/Windows/Fonts/cour.ttf")

# ── the sheet: a letter folded in three, opened out ─────────────────────────
HW, HH = 0.108, 0.148                       # half its width and height (m)
FOLD = HH / 3                               # its two folds, at ±FOLD
TOP_RISE, LOW_RISE = math.radians(5.5), math.radians(7.5)

def lift(x, y):
    """how far the sheet stands off the table at (x, y)"""
    z = 0.0
    if y > FOLD: z += (y - FOLD) * math.tan(TOP_RISE)
    if y < -FOLD: z += (-FOLD - y) * math.tan(LOW_RISE)
    for f in (FOLD, -FOLD):                 # (each fold pressed into a valley)
        z -= 0.00045 * math.exp(-((y - f) / 0.0016) ** 2)
    z += 0.0024 * (abs(x) / HW) ** 6 * (0.4 + 0.6 * (abs(y) / HH) ** 2)   # (the corners curl)
    z += 0.0007 * noise.noise(Vector((x * 14, y * 14, 0.3))) + 0.00025 * noise.noise(Vector((x * 60, y * 60, 1.7)))
    return z + 0.0012

NX, NY = 120, 164
me = bpy.data.meshes.new("letter"); bm = bmesh.new()
uv = bm.loops.layers.uv.new("UVMap")
rows = []
for j in range(NY + 1):
    y = -HH + 2 * HH * j / NY
    rows.append([bm.verts.new((-HW + 2 * HW * i / NX, y, lift(-HW + 2 * HW * i / NX, y))) for i in range(NX + 1)])
for j in range(NY):
    for i in range(NX):
        f = bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
        for loop in f.loops:
            co = loop.vert.co; loop[uv].uv = ((co.x + HW) / (2 * HW), (co.y + HH) / (2 * HH))
bm.to_mesh(me); bm.free()
sheet = link(bpy.data.objects.new("letter", me))
for p in me.polygons: p.use_smooth = True
sol = sheet.modifiers.new("paper", "SOLIDIFY"); sol.thickness = 0.00022; sol.offset = -1

def rag_paper():
    """old cotton rag: its fibres, cream gone to tea at the edges, a little
    darker in the folds, foxed here and there; matte, a breath of light
    through it"""
    m = bpy.data.materials.new("rag paper"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    fib = N.new("ShaderNodeTexNoise"); fib.inputs["Scale"].default_value = 140; fib.inputs["Detail"].default_value = 8
    cloud = N.new("ShaderNodeTexNoise"); cloud.inputs["Scale"].default_value = 9; cloud.inputs["Detail"].default_value = 4
    for t in (fib, cloud): L(tc.outputs["Object"], t.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB"); r = ramp.color_ramp
    r.elements[0].position = 0.3; r.elements[0].color = (0.66, 0.58, 0.42, 1)
    r.elements[1].position = 0.75; r.elements[1].color = (0.84, 0.78, 0.63, 1)
    L(cloud.outputs["Fac"], ramp.inputs["Fac"])
    grain = N.new("ShaderNodeMix"); grain.data_type = "RGBA"; grain.blend_type = "OVERLAY"; grain.inputs["Factor"].default_value = 0.26
    L(ramp.outputs["Color"], grain.inputs[6]); L(fib.outputs["Color"], grain.inputs[7])
    # (tea at the edges: how near the nearest edge, in object space)
    sep = N.new("ShaderNodeSeparateXYZ"); L(tc.outputs["Object"], sep.inputs["Vector"])
    def near(axis, half):
        a = N.new("ShaderNodeMath"); a.operation = "ABSOLUTE"; L(sep.outputs[axis], a.inputs[0])
        d = N.new("ShaderNodeMath"); d.operation = "SUBTRACT"; d.inputs[0].default_value = half; L(a.outputs[0], d.inputs[1])
        return d
    edge = N.new("ShaderNodeMath"); edge.operation = "MINIMUM"
    L(near("X", HW).outputs[0], edge.inputs[0]); L(near("Y", HH).outputs[0], edge.inputs[1])
    wob = N.new("ShaderNodeTexNoise"); wob.inputs["Scale"].default_value = 40; L(tc.outputs["Object"], wob.inputs["Vector"])
    wobk = N.new("ShaderNodeMath"); wobk.operation = "MULTIPLY_ADD"; wobk.inputs[1].default_value = 0.006; wobk.inputs[2].default_value = -0.003
    L(wob.outputs["Fac"], wobk.inputs[0])
    edge2 = N.new("ShaderNodeMath"); edge2.operation = "ADD"; L(edge.outputs[0], edge2.inputs[0]); L(wobk.outputs[0], edge2.inputs[1])
    tea = N.new("ShaderNodeMapRange"); tea.inputs["From Min"].default_value = 0.0; tea.inputs["From Max"].default_value = 0.013
    tea.inputs["To Min"].default_value = 0.55; tea.inputs["To Max"].default_value = 0.0
    L(edge2.outputs[0], tea.inputs["Value"])
    # (dust in the folds)
    def fold_line(f):
        d = N.new("ShaderNodeMath"); d.operation = "SUBTRACT"; d.inputs[1].default_value = f; L(sep.outputs["Y"], d.inputs[0])
        a = N.new("ShaderNodeMath"); a.operation = "ABSOLUTE"; L(d.outputs[0], a.inputs[0])
        k = N.new("ShaderNodeMapRange"); k.inputs["From Min"].default_value = 0.0; k.inputs["From Max"].default_value = 0.0035
        k.inputs["To Min"].default_value = 0.22; k.inputs["To Max"].default_value = 0.0; L(a.outputs[0], k.inputs["Value"])
        return k
    folds = N.new("ShaderNodeMath"); folds.operation = "MAXIMUM"
    L(fold_line(FOLD).outputs["Result"], folds.inputs[0]); L(fold_line(-FOLD).outputs["Result"], folds.inputs[1])
    age = N.new("ShaderNodeMath"); age.operation = "MAXIMUM"; L(tea.outputs["Result"], age.inputs[0]); L(folds.outputs[0], age.inputs[1])
    brown = N.new("ShaderNodeMix"); brown.data_type = "RGBA"; brown.blend_type = "MULTIPLY"
    brown.inputs[7].default_value = (0.62, 0.42, 0.22, 1)
    L(age.outputs[0], brown.inputs["Factor"]); L(grain.outputs[2], brown.inputs[6])
    # (foxing: a few small rusty spots)
    vz = N.new("ShaderNodeTexVoronoi"); vz.inputs["Scale"].default_value = 26; vz.inputs["Randomness"].default_value = 1.0
    L(tc.outputs["Object"], vz.inputs["Vector"])
    big = N.new("ShaderNodeTexNoise"); big.inputs["Scale"].default_value = 5; L(tc.outputs["Object"], big.inputs["Vector"])
    spot = N.new("ShaderNodeMapRange"); spot.inputs["From Min"].default_value = 0.0; spot.inputs["From Max"].default_value = 0.05
    spot.inputs["To Min"].default_value = 0.5; spot.inputs["To Max"].default_value = 0.0; L(vz.outputs["Distance"], spot.inputs["Value"])
    few = N.new("ShaderNodeMapRange"); few.inputs["From Min"].default_value = 0.56; few.inputs["From Max"].default_value = 0.66
    L(big.outputs["Fac"], few.inputs["Value"])
    fx = N.new("ShaderNodeMath"); fx.operation = "MULTIPLY"; L(spot.outputs["Result"], fx.inputs[0]); L(few.outputs["Result"], fx.inputs[1])
    fox = N.new("ShaderNodeMix"); fox.data_type = "RGBA"; fox.inputs[7].default_value = (0.42, 0.24, 0.1, 1)
    L(fx.outputs[0], fox.inputs["Factor"]); L(brown.outputs[2], fox.inputs[6])
    L(fox.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.93; b.inputs["Specular IOR Level"].default_value = 0.18
    b.inputs["Subsurface Weight"].default_value = 0.12; b.inputs["Subsurface Radius"].default_value = (0.002, 0.0015, 0.001)
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.12; bump.inputs["Distance"].default_value = 0.0001
    L(fib.outputs["Fac"], bump.inputs["Height"]); L(bump.outputs["Normal"], b.inputs["Normal"])
    return m
PAPER = rag_paper(); me.materials.append(PAPER)

# ── the writing on it ─────────────────────────────────────────────────────
INK = plain("iron-gall ink", (0.03, 0.02, 0.012), rough=0.9, spec=0.15)
TYPED = plain("typewriter ink", (0.035, 0.03, 0.028), rough=0.92, spec=0.12)
def writing(body, y, size, font, mat):
    cu = bpy.data.curves.new("ink", "FONT"); cu.body = body; cu.font = font; cu.size = size
    cu.align_x = "CENTER"; cu.align_y = "CENTER"; cu.extrude = 0.00002; cu.resolution_u = 16
    ob = link(bpy.data.objects.new("ink " + body, cu)); cu.materials.append(mat)
    tilt = TOP_RISE if y > FOLD else (-LOW_RISE if y < -FOLD else 0.0)
    ob.rotation_euler = (tilt, 0, 0); ob.location = (0, y, lift(0, y) + 0.003)
    ob.visible_shadow = False
    # (laid down onto the sheet itself, which is not quite flat anywhere)
    sw = ob.modifiers.new("onto the paper", "SHRINKWRAP"); sw.target = sheet; sw.wrap_method = "PROJECT"
    sw.use_project_z = True; sw.use_negative_direction = True; sw.use_positive_direction = True
    sw.wrap_mode = "ABOVE_SURFACE"; sw.offset = 0.00005
    return ob
writing("13 October 1961", 0.112, 0.0078, HAND, INK)
writing(CIPHER[0], 0.026, 0.021, TYPE, TYPED)
writing(CIPHER[1], -0.011, 0.021, TYPE, TYPED)
writing("— I. A.", -0.11, 0.0085, HAND, INK)

# ── what it lies on: nothing but its shadow ───────────────────────────────
ground = link(bpy.data.objects.new("shadow", bpy.data.meshes.new("shadow")))
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.6); bm.to_mesh(ground.data); bm.free()
ground.is_shadow_catcher = True

# ── candlelight, and the night's cool from the window ─────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.03, 0.035, 0.05, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.4
lamp("the candles", "AREA", (0.36, -0.26, 0.3), aim=(0, 0, 0), energy=float(arg("--key", "5.5")), colour=(1.0, 0.72, 0.44), size=0.22)
lamp("the room", "AREA", (-0.35, 0.25, 0.55), aim=(0, 0, 0), energy=float(arg("--fill", "1.2")), colour=(0.75, 0.82, 0.95), size=0.6)

cd = bpy.data.cameras.new("reading"); cd.lens = float(arg("--lens", "100")); cd.sensor_width = 36; cd.sensor_fit = "HORIZONTAL"
cam = link(bpy.data.objects.new("reading", cd)); cam.location = (0, -0.085, 0.755)
cam.rotation_euler = (Vector((0, 0.0, 0.0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "0.0")), glare=False, transparent=True)
scene.cycles.adaptive_threshold = 0.008
render(scene, str(OUT / "letter-open.png"))
print("LETTER_DONE", flush=True)
