# The letters' paper and their wax (src/ui/documentArt.js), rendered in
# Blender (2026-11-06: they were AI images; the Steam demo is to have none).
#
#   letter-paper: a sheet of good cream letter paper, looked straight down on,
#       lit as the case book is (case_book.py) — the same scans of a real
#       sheet's tooth and crumple (case_book_paper.py), aged only a little:
#       browned faintly at its edges, a few spots of foxing. 1002 x 1324 with
#       the sheet in from its edges (documentArt.js crops 70 / 65 px of it).
#   red-wax-seal: a seal of red sealing wax, pressed with the Ashcombes' key —
#       the blob run out unevenly round the stamp, the rim the stamp pushed
#       up, the key raised in the hollow, the wax a little glossy as wax is.
#       512 x 512, alpha; no shadow (the page gives it its own).
#
#   blender -b --factory-startup -P art/blender/letter_paper_seal.py -- [--samples 384]
#   (then the two PNGs in .artifacts/letter-paper-seal → webp, see README)

import bpy, bmesh, math, os, sys, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import ROOT
from case_book_paper import old_paper

OUT = arg("--out", os.path.join(ROOT, ".artifacts/letter-paper-seal"))
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "384"))
RNG = random.Random(1961)
def cm(x, y, z=0.0): return Vector((x / 100, y / 100, z / 100))

def stage(width, height, px):
    scene = fresh()
    cd = bpy.data.cameras.new("eye"); cd.type = "ORTHO"; cd.ortho_scale = width / px / 100; cd.sensor_fit = "HORIZONTAL"
    cam = link(bpy.data.objects.new("eye", cd)); cam.location = (0, 0, 1.0); scene.camera = cam
    world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.012, 0.011, 0.01, 1)
    lamp("the lamp", "AREA", tuple(cm(-118, 44, 68)), aim=tuple(cm(0, 0, 0)), energy=70, colour=(1.0, 0.86, 0.68), size=0.6, size_y=0.45)
    fill = lamp("the room", "AREA", tuple(cm(90, -40, 110)), aim=tuple(cm(0, 0, 0)), energy=12, colour=(0.92, 0.92, 0.9), size=1.4); fill.visible_glossy = False
    top = lamp("over it", "AREA", tuple(cm(-10, 10, 150)), aim=tuple(cm(0, 0, 0)), energy=10, colour=(1.0, 0.94, 0.84), size=1.2); top.visible_glossy = False
    cycles(scene, SAMPLES, width, height, exposure=0.0, glare=False, transparent=True)
    c = scene.cycles; c.denoiser = "OPENIMAGEDENOISE"; c.denoising_input_passes = "RGB_ALBEDO_NORMAL"; c.denoising_prefilter = "ACCURATE"
    return scene

# ── the letter paper ───────────────────────────────────────────────────────
W, H, PX = 1002, 1324, 45.0
SW, SH = (W - 140) / PX, (H - 130) / PX              # the sheet: the part documentArt.js keeps, and a little more
scene = stage(W, H, PX)
me = bpy.data.meshes.new("letter"); bm = bmesh.new(); uv = bm.loops.layers.uv.new()
cols, rows = 80, 100
sw, sh = SW + 1.2, SH + 1.2                           # (its edges run a few mm past the crop)
grid = [[bm.verts.new(cm(-sw / 2 + sw * i / cols, -sh / 2 + sh * j / rows,
                         0.04 * math.sin(i * 0.21 + j * 0.13) + 0.03 * math.sin(j * 0.29 - i * 0.07))) for j in range(rows + 1)] for i in range(cols + 1)]
for i in range(cols):
    for j in range(rows):
        f = bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
        for lp in f.loops:
            x, y = lp.vert.co.x * 100, lp.vert.co.y * 100
            # (u out from its middle to either side, so that both its edges are its outer ones)
            lp[uv].uv = (abs(x) / (sw / 2), (y + sh / 2) / sh)
bm.normal_update(); bm.to_mesh(me); bm.free()
sheet = link(bpy.data.objects.new("letter", me)); sheet.data.materials.append(old_paper("letter paper", browned=0.45, tone=1.1))
for p in sheet.data.polygons: p.use_smooth = True
render(scene, os.path.join(OUT, "letter-paper.png"))

# ── the wax seal ───────────────────────────────────────────────────────────
W, H, PX = 512, 512, 128.0
scene = stage(W, H, PX)
STAMP = 1.0                                            # the stamp's radius, cm
def outline(a):
    return 1.62 * (1 + 0.07 * math.sin(3 * a + 1.1) + 0.045 * math.sin(5 * a + 2.3) + 0.03 * math.sin(8 * a + 0.4) + 0.02 * math.sin(13 * a))
def smooth(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
def key(x, y):
    """how far inside the Ashcombes' key a point of the stamp is, 0..1:
    its bow a ring at the foot, its shaft up the middle, two bits at the top"""
    soft = 0.035
    d_ring = abs(math.hypot(x, y + 0.42) - 0.2) - 0.065
    def rect(x0, x1, y0, y1):
        dx = max(x0 - x, 0, x - x1); dy = max(y0 - y, 0, y - y1)
        inside = min(max(x0 - x, x - x1, y0 - y, y - y1), 0)
        return math.hypot(dx, dy) + inside
    d = min(d_ring, rect(-0.055, 0.055, -0.24, 0.58), rect(0.0, 0.25, 0.4, 0.48), rect(0.0, 0.19, 0.52, 0.6))
    return 1 - smooth(-soft, soft, d)
me = bpy.data.meshes.new("seal"); bm = bmesh.new()
rings, segs = 150, 360
centre = bm.verts.new(cm(0, 0, 0.2))
prev = None; first_ring = None
grid = []
for r_i in range(1, rings + 1):
    ring = []
    for s in range(segs):
        a = 2 * math.pi * s / segs
        R = outline(a); r = R * r_i / rings
        x, y = r * math.cos(a), r * math.sin(a)
        if r <= STAMP:
            z = 0.2 + 0.038 * key(x, y) + 0.004 * math.sin(x * 9 + y * 7)
            z += 0.035 * smooth(STAMP - 0.09, STAMP - 0.01, r)        # (the hollow's wall)
        else:
            lip = STAMP + 0.12
            ridge = 0.27 - 0.025 * smooth(STAMP, lip, r) * 0 + 0.0
            z = ridge * (1 - smooth(lip, R, r)) ** 0.55 if r > lip else 0.235 + 0.035 * math.sin((r - STAMP) / 0.12 * math.pi / 2)
            z += 0.012 * math.sin(a * 11 + r * 6) * smooth(lip, R, r)
        ring.append(bm.verts.new(cm(x, y, max(0.015, z))))
    grid.append(ring)
for s in range(segs):
    bm.faces.new((centre, grid[0][s], grid[0][(s + 1) % segs]))
for i in range(rings - 1):
    for s in range(segs):
        bm.faces.new((grid[i][s], grid[i + 1][s], grid[i + 1][(s + 1) % segs], grid[i][(s + 1) % segs]))
# (a skirt down to what it lies on, so its edge is the wax's own)
skirt = [bm.verts.new(Vector((v.co.x, v.co.y, 0.0))) for v in grid[-1]]
for s in range(segs):
    bm.faces.new((grid[-1][s], skirt[s], skirt[(s + 1) % segs], grid[-1][(s + 1) % segs]))
bm.normal_update()
for f in bm.faces:
    if f.normal.z < -0.2: f.normal_flip()
bm.to_mesh(me); bm.free()
seal = link(bpy.data.objects.new("seal", me))
for p in seal.data.polygons: p.use_smooth = True
wax = bpy.data.materials.new("sealing wax"); wax.use_nodes = True
N = wax.node_tree.nodes; L = wax.node_tree.links.new; b = N["Principled BSDF"]
tc = N.new("ShaderNodeTexCoord"); nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 260; nz.inputs["Detail"].default_value = 6
L(tc.outputs["Object"], nz.inputs["Vector"])
rp = N.new("ShaderNodeValToRGB"); rp.color_ramp.elements[0].color = (0.085, 0.006, 0.005, 1); rp.color_ramp.elements[1].color = (0.15, 0.012, 0.009, 1)
L(nz.outputs["Fac"], rp.inputs["Fac"]); L(rp.outputs["Color"], b.inputs["Base Color"])
b.inputs["Roughness"].default_value = 0.32; b.inputs["Specular IOR Level"].default_value = 0.5
b.inputs["Subsurface Weight"].default_value = 0.03; b.inputs["Subsurface Radius"].default_value = (0.4, 0.05, 0.03)
bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.08; bp.inputs["Distance"].default_value = 0.0004
L(nz.outputs["Fac"], bp.inputs["Height"]); L(bp.outputs["Normal"], b.inputs["Normal"])
seal.data.materials.append(wax)
render(scene, os.path.join(OUT, "red-wax-seal.png"))
print("LETTER_PAPER_SEAL_DONE", flush=True)
