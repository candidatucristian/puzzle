# Ashcombe Manor at night, in the rain: the start screen's picture, built in
# three dimensions and rendered with Cycles. Every material a CC0 scan
# (Poly Haven), every model CC0 or modelled here; nothing generated.
#
# A Victorian-Jacobethan house of honey ashlar under slate: a gabled centre
# bay rising to a shaped gable with a finial, its arched doorway up a flight
# of steps with a lantern hung in it, a balustraded balcony over, a tall
# arched window; two-storey ranges either side, each with a gabled bay and
# mullioned windows under hood moulds; tall chimneys. Before it, across a
# wet gravel drive strewn with leaves, a pair of stone gate piers with urns,
# the iron gates standing open, iron railings on a low wall; old trees at
# either hand; mist; a storm sky made night. A few windows lit.
#
# The camera keeps the game's composition (ui/manorExterior.js): the door at
# about 0.66 of the height, the gate piers at 0.27 and 0.73 of the width.
# Where the door, the lantern, the lit windows and the wet ground fall in the
# picture is written beside it (--data), for the game.
#
#   blender -b --factory-startup -P art/blender/manor.py -- --out manor.png [--samples 512] [--width 2560] [--data manor.json]

import bpy, bmesh, math, json, random, sys, os
from mathutils import Vector, Matrix, Euler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *

OUT = arg("--out", "C:/Users/crist/Desktop/PUZZLE/.artifacts/manor/manor.png")
SAMPLES = int(arg("--samples", "512"))
WIDTH = int(arg("--width", "2560"))
HEIGHT = round(WIDTH * 904 / 1740)
DATA = arg("--data", "")
BLEND = arg("--blend", "")
RNG = random.Random(1874)

scene = fresh()

# ── the camera: 2.6 m up, 24 mm, level (the verticals true), the horizon at
# 0.68 of the height ─────────────────────────────────────────────────────────
EYE, LENS, HORIZON = 2.6, 24, 0.68
cd = bpy.data.cameras.new("eye"); cd.lens = LENS; cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36
cd.shift_y = (HORIZON - 0.5) * HEIGHT / WIDTH; cd.clip_start = 0.1; cd.clip_end = 400
cam = link(bpy.data.objects.new("eye", cd)); cam.location = (0, 0, EYE); cam.rotation_euler = (math.pi / 2, 0, 0)
scene.camera = cam

# ── materials ──────────────────────────────────────────────────────────────
T = f"{ASSETS}/textures"
def img(N, path, colour=False, proj="BOX", blend=0.25):
    t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(path, check_existing=True)
    t.image.colorspace_settings.name = "sRGB" if colour else "Non-Color"
    t.projection = proj; t.projection_blend = blend
    return t

def outdoor(name, tid, size=2.0, tint=(1, 1, 1), bright=1.0, sat=1.0, rough=(0.5, 0.9), bump=0.6,
            wet=0.6, puddles=0.0, streaks=0.0, moss=0.0, leaves=None, leaf_mix=0.0, hue=0.5, courses=None, runoff=0.0):
    """a scanned surface out in the rain: darker and glossier for being wet;
    on the ground, water standing in its hollows; on walls, runs of damp, and
    green low down where it never dries"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; L = nt.links.new
    b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / size,) * 3
    L(tc.outputs["Object"], mp.inputs["Vector"])
    def tex(tid, kind, colour=False, mapping=mp):
        for ext in ("jpg", "png"):
            p = f"{T}/{tid}/{kind}.{ext}"
            if os.path.exists(p):
                t = img(N, p, colour); L(mapping.outputs["Vector"], t.inputs["Vector"]); return t
        return None
    col = tex(tid, "Diffuse", True).outputs["Color"]
    hsv = N.new("ShaderNodeHueSaturation"); hsv.inputs["Saturation"].default_value = sat; hsv.inputs["Value"].default_value = bright
    hsv.inputs["Hue"].default_value = hue
    L(col, hsv.inputs["Color"]); col = hsv.outputs["Color"]
    tn = N.new("ShaderNodeRGB"); tn.outputs[0].default_value = (*tint, 1)
    mul = N.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1
    L(col, mul.inputs[6]); L(tn.outputs[0], mul.inputs[7]); col = mul.outputs[2]
    height = tex(tid, "Displacement")
    rough_map = tex(tid, "Rough")
    joints = None
    if runoff:
        # what the rain has run down off every sill and cornice, darkening
        # the stone below it (the map is drawn once the house is built:
        # stain_fronts())
        sp2 = N.new("ShaderNodeSeparateXYZ"); L(tc.outputs["Object"], sp2.inputs["Vector"])
        su = N.new("ShaderNodeMath"); su.operation = "MULTIPLY_ADD"; su.inputs[1].default_value = 1 / 60; su.inputs[2].default_value = 0.5
        L(sp2.outputs["X"], su.inputs[0])
        sv = N.new("ShaderNodeMath"); sv.operation = "MULTIPLY"; sv.inputs[1].default_value = 1 / 24; L(sp2.outputs["Z"], sv.inputs[0])
        suv = N.new("ShaderNodeCombineXYZ"); L(su.outputs["Value"], suv.inputs["X"]); L(sv.outputs["Value"], suv.inputs["Y"])
        st_ = N.new("ShaderNodeTexImage"); st_.name = "runoff"; st_.extension = "EXTEND"; L(suv.outputs["Vector"], st_.inputs["Vector"])
        sd_ = N.new("ShaderNodeMix"); sd_.data_type = "RGBA"; sd_.inputs[7].default_value = (0.16, 0.15, 0.13, 1)
        sf_ = N.new("ShaderNodeMath"); sf_.operation = "MULTIPLY"; sf_.inputs[1].default_value = runoff; L(st_.outputs["Color"], sf_.inputs[0])
        L(sf_.outputs["Value"], sd_.inputs["Factor"]); L(col, sd_.inputs[6]); col = sd_.outputs[2]
    if courses:
        # the courses of a mason's wall, laid on each face along it: every
        # block its own shade and its own weathering, the joints cut back
        bw, ch, mortar = courses
        sn_ = N.new("ShaderNodeSeparateXYZ"); L(tc.outputs["Normal"], sn_.inputs["Vector"])
        sp_ = N.new("ShaderNodeSeparateXYZ"); L(tc.outputs["Object"], sp_.inputs["Vector"])
        ax = N.new("ShaderNodeMath"); ax.operation = "ABSOLUTE"; L(sn_.outputs["X"], ax.inputs[0])
        side = N.new("ShaderNodeMath"); side.operation = "GREATER_THAN"; side.inputs[1].default_value = 0.5; L(ax.outputs["Value"], side.inputs[0])
        u = N.new("ShaderNodeMix"); u.data_type = "FLOAT"; L(side.outputs["Value"], u.inputs["Factor"]); L(sp_.outputs["X"], u.inputs[2]); L(sp_.outputs["Y"], u.inputs[3])
        uv_ = N.new("ShaderNodeCombineXYZ"); L(u.outputs[0], uv_.inputs["X"]); L(sp_.outputs["Z"], uv_.inputs["Y"])
        br = N.new("ShaderNodeTexBrick"); br.offset = 0.5; br.offset_frequency = 2
        br.inputs["Scale"].default_value = 1.0; br.inputs["Mortar Size"].default_value = mortar; br.inputs["Mortar Smooth"].default_value = 0.25
        br.inputs["Bias"].default_value = 0.0; br.inputs["Brick Width"].default_value = bw; br.inputs["Row Height"].default_value = ch
        br.inputs["Color1"].default_value = (1.0, 0.98, 0.94, 1); br.inputs["Color2"].default_value = (0.6, 0.55, 0.48, 1); br.inputs["Mortar"].default_value = (0.24, 0.23, 0.21, 1)
        L(uv_.outputs["Vector"], br.inputs["Vector"])
        bmx = N.new("ShaderNodeMix"); bmx.data_type = "RGBA"; bmx.blend_type = "MULTIPLY"; bmx.inputs["Factor"].default_value = 1
        L(col, bmx.inputs[6]); L(br.outputs["Color"], bmx.inputs[7]); col = bmx.outputs[2]
        joints = br.outputs["Fac"]
    if leaves:
        # leaves lying over it, in drifts
        lm = N.new("ShaderNodeMapping"); lm.inputs["Scale"].default_value = (1 / 1.6,) * 3; L(tc.outputs["Object"], lm.inputs["Vector"])
        lc = tex(leaves, "Diffuse", True, lm)
        ln = N.new("ShaderNodeTexNoise"); ln.inputs["Scale"].default_value = 0.35; ln.inputs["Detail"].default_value = 6
        L(tc.outputs["Object"], ln.inputs["Vector"])
        lr = N.new("ShaderNodeMapRange"); lr.inputs["From Min"].default_value = 0.62 - leaf_mix * 0.3; lr.inputs["From Max"].default_value = 0.7 - leaf_mix * 0.3
        L(ln.outputs["Fac"], lr.inputs["Value"])
        lmix = N.new("ShaderNodeMix"); lmix.data_type = "RGBA"
        L(lr.outputs["Result"], lmix.inputs["Factor"]); L(col, lmix.inputs[6]); L(lc.outputs["Color"], lmix.inputs[7]); col = lmix.outputs[2]
    if moss:
        # green and dark where the wall meets the wet ground
        geo = N.new("ShaderNodeNewGeometry"); sep = N.new("ShaderNodeSeparateXYZ"); L(geo.outputs["Position"], sep.inputs["Vector"])
        low = N.new("ShaderNodeMapRange"); low.inputs["From Min"].default_value = 1.4; low.inputs["From Max"].default_value = 0.0
        L(sep.outputs["Z"], low.inputs["Value"])
        mn = N.new("ShaderNodeTexNoise"); mn.inputs["Scale"].default_value = 3; mn.inputs["Detail"].default_value = 8; L(tc.outputs["Object"], mn.inputs["Vector"])
        mk = N.new("ShaderNodeMath"); mk.operation = "MULTIPLY"; L(low.outputs["Result"], mk.inputs[0]); L(mn.outputs["Fac"], mk.inputs[1])
        mk2 = N.new("ShaderNodeMath"); mk2.operation = "MULTIPLY"; mk2.inputs[1].default_value = moss * 1.6; mk2.use_clamp = True; L(mk.outputs["Value"], mk2.inputs[0])
        mm = N.new("ShaderNodeMix"); mm.data_type = "RGBA"; mm.inputs[7].default_value = (0.035, 0.05, 0.02, 1)
        L(mk2.outputs["Value"], mm.inputs["Factor"]); L(col, mm.inputs[6]); col = mm.outputs[2]
    if streaks:
        sm = N.new("ShaderNodeMapping"); sm.inputs["Scale"].default_value = (1.4, 1.4, 0.12); L(tc.outputs["Object"], sm.inputs["Vector"])
        sn = N.new("ShaderNodeTexNoise"); sn.inputs["Scale"].default_value = 3.0; sn.inputs["Detail"].default_value = 6; L(sm.outputs["Vector"], sn.inputs["Vector"])
        sr = N.new("ShaderNodeValToRGB"); sr.color_ramp.elements[0].position = 0.45; sr.color_ramp.elements[1].position = 0.68
        sr.color_ramp.elements[0].color = (1 - streaks, 1 - streaks * 0.95, 1 - streaks * 0.9, 1)
        L(sn.outputs["Fac"], sr.inputs["Fac"])
        sx = N.new("ShaderNodeMix"); sx.data_type = "RGBA"; sx.blend_type = "MULTIPLY"; sx.inputs["Factor"].default_value = 1
        L(col, sx.inputs[6]); L(sr.outputs["Color"], sx.inputs[7]); col = sx.outputs[2]
    # wet: darker, a little richer
    dk = N.new("ShaderNodeHueSaturation"); dk.inputs["Saturation"].default_value = 1 + 0.22 * wet; dk.inputs["Value"].default_value = 1 - 0.35 * wet
    L(col, dk.inputs["Color"]); col = dk.outputs["Color"]
    rr = N.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = rough[0] * (1 - 0.45 * wet); rr.inputs["To Max"].default_value = rough[1] * (1 - 0.35 * wet)
    if rough_map: L(rough_map.outputs["Color"], rr.inputs["Value"])
    rough_out = rr.outputs["Result"]
    nrm = None
    nrm_tex = tex(tid, "nor_gl", False) or tex(tid, "Normal", False)
    if nrm_tex:
        nm = N.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = min(1.35, 0.75 + bump * 0.5)
        L(nrm_tex.outputs["Color"], nm.inputs["Color"])
        nrm = nm
    if height:
        bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump; bp.inputs["Distance"].default_value = 0.018 * size
        L(height.outputs["Color"], bp.inputs["Height"])
        if nrm: L(nrm.outputs["Normal"], bp.inputs["Normal"])
        nrm = bp
    if joints is not None:
        # (the joints, sunk back a centimetre: the light catches each block's arris)
        inv = N.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0; L(joints, inv.inputs[1])
        jb = N.new("ShaderNodeBump"); jb.inputs["Strength"].default_value = 0.9; jb.inputs["Distance"].default_value = 0.012
        L(inv.outputs["Value"], jb.inputs["Height"])
        if nrm: L(nrm.outputs["Normal"], bp.inputs["Normal"] if not jb else jb.inputs["Normal"])
        nrm = jb
    L(col, b.inputs["Base Color"]); L(rough_out, b.inputs["Roughness"])
    if nrm: L(nrm.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Specular IOR Level"].default_value = 0.5
    if "Coat Weight" in b.inputs: b.inputs["Coat Weight"].default_value = 0.0
    return m

# honey-coloured Bath-like stone, coursed: blocks about 0.8 m long in courses
# of 0.36 m, the joints a centimetre
STONE = outdoor("ashlar", "sandstone_blocks_08", size=2.9, tint=(0.96, 0.88, 0.74), bright=0.92, sat=0.78, rough=(0.55, 0.85), bump=0.45, wet=0.38, streaks=0.12, moss=0.42, courses=(0.82, 0.36, 0.011), runoff=0.85)
STONE.node_tree.nodes["Image Texture"].projection_blend = 0.25
DRESSED = outdoor("dressings", "old_sandstone_02", size=2.8, tint=(0.98, 0.91, 0.79), bright=0.96, sat=0.72, rough=(0.50, 0.80), bump=0.52, wet=0.35, streaks=0.09, moss=0.26, runoff=0.62)
ROCKFACE = outdoor("rock-faced", "castle_wall_slates", size=1.2, tint=(0.95, 0.9, 0.8), bright=0.85, rough=(0.55, 0.9), bump=1.0, wet=0.48, moss=0.5, courses=(0.62, 0.42, 0.016))
RUBBLE = outdoor("rubble", "mossy_stone_wall", size=1.5, tint=(0.82, 0.80, 0.74), bright=0.70, rough=(0.58, 0.88), bump=0.85, wet=0.48, moss=0.6)
SLATE = outdoor("slates", "roof_slates_02", size=2.1, tint=(0.62, 0.66, 0.72), bright=0.60, sat=0.62, rough=(0.40, 0.72), bump=0.95, wet=0.52, streaks=0.2)
DRIVE = outdoor("drive", "slate_driveway", size=1.95, tint=(0.94, 0.90, 0.84), bright=0.78, sat=0.72, rough=(0.32, 0.64), bump=1.15, wet=0.48, puddles=0.0, leaves="dry_decay_leaves", leaf_mix=0.18)
LAWN = outdoor("lawn", "forest_leaves_02", size=2.5, tint=(0.74, 0.79, 0.61), bright=0.58, sat=0.84, rough=(0.55, 0.88), bump=0.65, wet=0.5, leaves="dry_decay_leaves", leaf_mix=0.48)
STEPS = outdoor("steps", "old_sandstone_02", size=2.8, tint=(0.84, 0.78, 0.69), bright=0.68, rough=(0.46, 0.76), bump=0.55, wet=0.52, puddles=0.0, moss=0.32)
IRON = aged_metal("iron", (0.032, 0.035, 0.038), (0.018, 0.015, 0.012), rough=(0.38, 0.64), tarnish=0.55, hammer=0.18)
OAK = outdoor("oak door", "rosewood_veneer1", size=0.9, tint=(0.42, 0.28, 0.16), bright=0.38, sat=0.75, rough=(0.48, 0.74), bump=0.48, wet=0.35)
FRAME = aged_metal("window frames", (0.048, 0.046, 0.044), (0.02, 0.02, 0.018), rough=(0.44, 0.7), tarnish=0.5)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.018, transmission=1.0, ior=1.5)
POT = outdoor("chimney pots", "old_sandstone_02", size=0.9, tint=(0.56, 0.25, 0.15), bright=0.52, rough=(0.58, 0.84), bump=0.5, wet=0.35, streaks=0.2)
HEDGE = outdoor("hedge", "forest_leaves_02", size=1.1, tint=(0.18, 0.26, 0.15), bright=0.32, sat=0.75, rough=(0.58, 0.88), bump=0.85, wet=0.45)
BRASS = aged_metal("brass", (0.44, 0.30, 0.12), (0.08, 0.06, 0.03), rough=(0.28, 0.52), tarnish=0.45)
CURTAIN = outdoor("velvet curtain", "velour_velvet", size=0.8, tint=(0.24, 0.08, 0.05), bright=0.42, sat=0.85, rough=(0.78, 0.96), bump=0.35, wet=0.0)

def lit_room(name, warm=(1.0, 0.62, 0.3), strength=1.1, curtain=(0.48, 0.26, 0.13)):
    """what is seen of a lit room through its window: curtains drawn back in
    folds, the lamplight on them"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new
    b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    wv = N.new("ShaderNodeTexWave"); wv.inputs["Scale"].default_value = 8; wv.inputs["Distortion"].default_value = 2.8; wv.bands_direction = "X"
    L(tc.outputs["Object"], wv.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (curtain[0] * 0.32, curtain[1] * 0.28, curtain[2] * 0.24, 1); ramp.color_ramp.elements[1].color = (*curtain, 1)
    L(wv.outputs["Fac"], ramp.inputs["Fac"])
    gn = N.new("ShaderNodeTexNoise"); gn.inputs["Scale"].default_value = 1.2
    L(tc.outputs["Object"], gn.inputs["Vector"])
    glow = N.new("ShaderNodeMath"); glow.operation = "MULTIPLY"; glow.inputs[1].default_value = strength
    L(gn.outputs["Fac"], glow.inputs[0])
    L(ramp.outputs["Color"], b.inputs["Base Color"]); L(ramp.outputs["Color"], b.inputs["Emission Color"])
    L(glow.outputs["Value"], b.inputs["Emission Strength"])
    b.inputs["Roughness"].default_value = 0.9
    if "Coat Weight" in b.inputs: b.inputs["Coat Weight"].default_value = 0.0
    return m
ROOM_LIT = [lit_room("lit room", strength=1.12), lit_room("lit room deep", strength=0.84, curtain=(0.44, 0.20, 0.09)), lit_room("lit room pale", strength=0.98, curtain=(0.54, 0.38, 0.22))]
# (a room not lit: curtains, just, in what light comes in)
ROOM_DARK = lit_room("dark room", strength=0.0, curtain=(0.05, 0.04, 0.035))

# ── building in pieces ─────────────────────────────────────────────────────
CUTS = []          # every opening's cutter: (the wall it is cut in, its mesh)
SILLS = []         # every window's sill (x0, x1, z): the rain runs off it
LITS = []          # where a lit window is, for the game's glow
def slab(x0, x1, y0, y1, z0, z1, mat=None, round_=0.01, name="stone"):
    o = box(name, x0, x1, y0, y1, z0, z1, mat or STONE)
    if round_: bevel(o, round_, 2)
    return o

def outline_prism(name, pts, y0, y1, mat):
    """a flat shape drawn in x-z, given thickness along y"""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    front = [bm.verts.new((x, y0, z)) for x, z in pts]; back = [bm.verts.new((x, y1, z)) for x, z in pts]
    bm.faces.new(front); bm.faces.new(back[::-1])
    for i in range(len(pts)):
        j = (i + 1) % len(pts); bm.faces.new((front[i], back[i], back[j], front[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    return o

def roof_prism(name, profile, x0, x1, mat, along="x"):
    """a roof: its cross-section `profile` [(y, z)] drawn out along x (or
    [(x, z)] along y), given thickness"""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    if along == "x":
        a = [bm.verts.new((x0, y, z)) for y, z in profile]; b2 = [bm.verts.new((x1, y, z)) for y, z in profile]
    else:
        a = [bm.verts.new((x, x0, z)) for x, z in profile]; b2 = [bm.verts.new((x, x1, z)) for x, z in profile]
    for i in range(len(profile) - 1):
        bm.faces.new((a[i], a[i + 1], b2[i + 1], b2[i]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    s = o.modifiers.new("slate", "SOLIDIFY"); s.thickness = 0.12
    return o

def cut(wall, x0, x1, y0, y1, z0, z1, arch=False):
    """an opening through `wall`, square-headed or round-arched"""
    me = bpy.data.meshes.new("cut"); bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((x0 + (v.co.x + 0.5) * (x1 - x0), y0 + (v.co.y + 0.5) * (y1 - y0), z0 + (v.co.z + 0.5) * (z1 - z0)))
    if arch:
        r = (x1 - x0) / 2
        ret = bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=r, radius2=r, depth=y1 - y0)
        for v in ret["verts"]:
            v.co = Vector((v.co.x + (x0 + x1) / 2, v.co.z + (y0 + y1) / 2, -v.co.y + z1))
    bm.to_mesh(me); bm.free()
    CUTS.append((wall, link(bpy.data.objects.new("cut", me))))

def apply_cuts():
    # one at a time: an arched cutter overlaps itself (its box and its
    # half-cylinder), which the exact solver must be told of
    for wall, c in CUTS:
        mod = wall.modifiers.new("cut", "BOOLEAN"); mod.operation = "DIFFERENCE"; mod.object = c
        mod.solver = "EXACT"; mod.use_self = True
        bpy.context.view_layer.objects.active = wall
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.data.objects.remove(c, do_unlink=True)
    CUTS.clear()

def window(wall, x, yf, z0, w, h, lights=2, lit=0, arch=False, hood=True, depth=0.32, transom=True):
    """a stone-mullioned window in the wall whose face is at y=yf: its
    opening, its surround and sill, its hood mould, its mullions and
    transom, glazing bars, glass; and the room behind, lit or dark"""
    x0, x1 = x - w / 2, x + w / 2
    SILLS.append((x0 - 0.2, x1 + 0.2, z0 - 0.14))
    cut(wall, x0, x1, yf - 0.05, yf + depth + 0.75, z0, z0 + h - (w / 2 if arch else 0), arch)
    top = z0 + h
    # the surround, standing proud of the wall
    sw = 0.16
    slab(x0 - sw, x0, yf - 0.07, yf + 0.02, z0, top if not arch else top - w / 2, DRESSED)
    slab(x1, x1 + sw, yf - 0.07, yf + 0.02, z0, top if not arch else top - w / 2, DRESSED)
    if arch:
        ring = arch_ring_xz("arch", x, top - w / 2, w / 2, w / 2 + sw, yf - 0.07, yf + 0.02, DRESSED)
    else:
        slab(x0 - sw, x1 + sw, yf - 0.07, yf + 0.02, top, top + sw, DRESSED)
    # the sill, and the hood mould over, its ends turned down
    slab(x0 - sw - 0.06, x1 + sw + 0.06, yf - 0.16, yf + 0.05, z0 - 0.14, z0, DRESSED, 0.02)
    if hood and not arch:
        hz = top + sw + 0.06
        slab(x0 - sw - 0.12, x1 + sw + 0.12, yf - 0.16, yf + 0.02, hz, hz + 0.12, DRESSED, 0.025)
        for xs in (x0 - sw - 0.12, x1 + sw + 0.01):
            slab(xs, xs + 0.11, yf - 0.16, yf + 0.02, hz - 0.3, hz, DRESSED, 0.02)
    # the mullions and the transom, stone
    gy = yf + depth
    head = top if not arch else top - w / 2
    for k in range(1, lights):
        mx = x0 + k * w / lights
        slab(mx - 0.065, mx + 0.065, gy - 0.12, gy + 0.02, z0, top if not arch else top - 0.08, DRESSED, 0.012)
    tz = (head if arch else z0 + h * 0.66) if (transom or arch) and h > 1.6 else None
    if tz: slab(x0, x1, gy - 0.12, gy + 0.02, tz - 0.06, tz + 0.06, DRESSED, 0.012)
    # glass, leaded in small panes all the way to the top of the opening
    glass = box("glass", x0, x1, gy + 0.01, gy + 0.02, z0, top, GLASS)
    for k in range(lights):
        lx0 = x0 + k * w / lights; lx1 = lx0 + w / lights
        for j in range(1, int(h / 0.32) + 1):
            zz = z0 + j * 0.32
            if zz < top - 0.06: box("came", lx0, lx1, gy - 0.004, gy + 0.004, zz - 0.007, zz + 0.007, FRAME)
        box("came", (lx0 + lx1) / 2 - 0.007, (lx0 + lx1) / 2 + 0.007, gy - 0.004, gy + 0.004, z0, top - 0.04, FRAME)
    # parted 3D velvet curtains framing the window interior
    cw = w * 0.19
    for side_c, cx0, cx1 in ((-1, x0 - 0.04, x0 + cw), (1, x1 - cw, x1 + 0.04)):
        for fold in range(3):
            fx0 = cx0 + fold * (cx1 - cx0) / 3
            fx1 = fx0 + (cx1 - cx0) / 3 + 0.01
            fy = gy + 0.12 + (fold % 2) * 0.03
            slab(fx0, fx1, fy, fy + 0.05, z0 - 0.08, top + 0.05, CURTAIN, 0.012, name="curtain")
    # the room behind
    room = ROOM_LIT[(lit - 1) % len(ROOM_LIT)] if lit else ROOM_DARK
    box("room", x0 - 0.35, x1 + 0.35, gy + 0.54, gy + 0.60, z0 - 0.3, top + 0.4, room)
    if lit:
        # its lamp, lighting the reveal, and out over the wet drive
        wl = lamp(f"window {x:.1f} {z0:.1f}", "AREA", (x, gy + 0.42, z0 + h * 0.52), aim=(x, gy - 6, z0 - 2.5), energy=22 * w * h * (0.68 + 0.28 * lit),
                  colour=(1.0, 0.58, 0.26), size=w * 0.85, size_y=h * 0.75)
        wl.data.cycles.max_bounces = 4
        wl.visible_camera = False; wl.visible_transmission = False; wl.visible_glossy = False
        LITS.append(((x, gy, z0 + h / 2), (w, h)))

def arch_ring_xz(name, cx, cz, r_in, r_out, y0, y1, mat, n=40):
    return arch_ring_mesh(name, cx, cz, r_in, r_out, y0, y1, mat, n)

def arch_ring_mesh(name, cx, cz, r_in, r_out, y0, y1, mat, n=40):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    rows = []
    for i in range(n + 1):
        a = math.pi * i / n; c, s = math.cos(a), math.sin(a)
        rows.append([bm.verts.new((cx + r * c, y, cz + r * s)) for r in (r_in, r_out) for y in (y0, y1)])
    for a, b_ in zip(rows, rows[1:]):
        i0, i1, o0, o1 = a; j0, j1, p0, p1 = b_
        bm.faces.new((i0, j0, p0, o0)); bm.faces.new((i1, o1, p1, j1)); bm.faces.new((i0, i1, j1, j0)); bm.faces.new((o0, p0, p1, o1))
    for row in (rows[0], rows[-1]):
        i0, i1, o0, o1 = row; bm.faces.new((i0, o0, o1, i1))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    return o

def finial(x, y, z, s=1.0, mat=None):
    """a stone finial: a moulded base, a ball, a spike"""
    lathe("finial", [(0, 0), (0.16 * s, 0), (0.16 * s, 0.08 * s), (0.1 * s, 0.14 * s), (0.08 * s, 0.3 * s), (0.14 * s, 0.4 * s),
                     (0.15 * s, 0.5 * s), (0.12 * s, 0.6 * s), (0.04 * s, 0.68 * s), (0.03 * s, 0.9 * s), (0, 1.0 * s)], mat or DRESSED, at=(x, y, z), steps=24)

def moulding(x0, x1, yf, z, h=0.24, proj=0.16, mat=None):
    """a string course or cornice: a band of stone along the face, stepped"""
    slab(x0 - proj * 0.6, x1 + proj * 0.6, yf - proj, yf + 0.02, z, z + h * 0.45, mat or DRESSED, 0.02)
    slab(x0 - proj * 0.3, x1 + proj * 0.3, yf - proj * 0.6, yf + 0.02, z + h * 0.45, z + h, mat or DRESSED, 0.02)

def chimney(x, y, z0, z1, w=1.3, d=0.8, pots=3):
    slab(x - w / 2, x + w / 2, y - d / 2, y + d / 2, z0, z1, STONE, 0.02)
    slab(x - w / 2 - 0.1, x + w / 2 + 0.1, y - d / 2 - 0.1, y + d / 2 + 0.1, z1, z1 + 0.22, DRESSED, 0.03)
    slab(x - w / 2 - 0.05, x + w / 2 + 0.05, y - d / 2 - 0.05, y + d / 2 + 0.05, z1 - 0.6, z1 - 0.45, DRESSED, 0.02)
    for k in range(pots):
        px = x - w / 2 + (k + 0.5) * w / pots
        lathe("pot", [(0, 0), (0.17, 0), (0.15, 0.25), (0.12, 0.55), (0.14, 0.62), (0.11, 0.64), (0.1, 0.62)], POT, at=(px, y, z1 + 0.22), steps=20)

# ── the house ──────────────────────────────────────────────────────────────
F = 30.0                      # the ranges' front face
EAVES, RIDGE_Y, RIDGE = 9.6, 36.2, 16.6
CX0, CX1, CF = -4.2, 4.2, 28.4  # the centre bay, standing forward

# the two ranges, either side of the centre bay
ranges = slab(-16, 16, F, 42, 0, EAVES, STONE, 0)
ranges.name = "ranges"
slab(-16.1, 16.1, F - 0.12, F + 0.1, 0, 0.85, RUBBLE, 0.02)           # the plinth
moulding(-16, 16, F, 4.45)                                           # the string course
moulding(-16, 16, F, EAVES - 0.35, h=0.38, proj=0.32)                # the cornice
# a gabled bay forward on each range
BAYS = []
for side in (-1, 1):
    bx0, bx1 = sorted((side * 7.4, side * 12.6))
    bay = slab(bx0, bx1, F - 0.7, F + 0.2, 0, 10.9, STONE, 0)
    bay.name = f"bay{side}"
    BAYS.append(bay)
    slab(bx0 - 0.1, bx1 + 0.1, F - 0.82, F - 0.6, 0, 0.85, RUBBLE, 0.02)
    moulding(bx0, bx1, F - 0.7, 4.45)
    # its gable: straight, coped, with kneelers and a finial at the apex
    apex = 14.9
    outline_prism("gable", [(bx0, 10.9), (bx1, 10.9), ((bx0 + bx1) / 2, apex)], F - 0.7, F + 0.2, STONE)
    gm = (bx0 + bx1) / 2; half = (bx1 - bx0) / 2; rise = apex - 10.9
    L_ = math.hypot(half, rise); ang = math.atan2(rise, half)
    for s in (-1, 1):
        # the coping up each slope, and the kneeler stone at its foot
        (xa, za), (xb, zb) = (gm + s * half, 10.9), (gm, apex)
        cp = box("coping", -L_ / 2 - 0.1, L_ / 2 + 0.05, F - 0.85, F + 0.25, -0.1, 0.1, DRESSED)
        cp.rotation_euler = (0, -math.atan2(zb - za, xb - xa), 0); cp.location = ((xa + xb) / 2, 0, (za + zb) / 2 + 0.08)
        bevel(cp, 0.02, 2)
        slab(xa - 0.22, xa + 0.22, F - 0.85, F + 0.25, 10.7, 11.15, DRESSED, 0.02)
    finial(gm, F - 0.3, apex + 0.05, 1.2)
    # its roof, back into the main one
    roof_prism("bay roof", [(bx0 - 0.25, 10.75), (gm, apex - 0.1), (bx1 + 0.25, 10.75)], F - 0.6, RIDGE_Y - 1.0, SLATE, along="y")
    # its windows: ground, first, and one in the gable
    window(bay, gm, F - 0.7, 1.35, 2.5, 2.6, lights=3, lit=1 if side < 0 else 2)
    window(bay, gm, F - 0.7, 5.35, 2.5, 2.4, lights=3, lit=3 if side < 0 else 0)
    window(bay, gm, F - 0.7, 11.3, 0.9, 1.6, lights=1, lit=1 if side > 0 else 0, hood=False, transom=False)
# the ranges' own windows, either side of the bays
for x, lit_g, lit_f in ((-14.3, 0, 0), (-5.9, 2, 0), (5.9, 0, 1), (14.3, 3, 0)):
    window(ranges, x, F, 1.35, 1.5, 2.6, lights=2, lit=lit_g)
    window(ranges, x, F, 5.35, 1.5, 2.4, lights=2, lit=lit_f)
# the main roof, its gable ends, a dormer or two
roof_prism("main roof", [(F - 0.45, EAVES - 0.1), (RIDGE_Y, RIDGE), (42.45, EAVES - 0.1)], -16.4, 16.4, SLATE)
for xs in (-16, 16):
    me = bpy.data.meshes.new("end"); bm = bmesh.new()
    pts = [(F, EAVES), (42, EAVES), (RIDGE_Y, RIDGE)]
    a = [bm.verts.new((xs - 0.3, y, z)) for y, z in pts]; b_ = [bm.verts.new((xs + 0.3, y, z)) for y, z in pts]
    bm.faces.new(a); bm.faces.new(b_[::-1])
    for i in range(3):
        j = (i + 1) % 3; bm.faces.new((a[i], b_[i], b_[j], a[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    link(bpy.data.objects.new("end gable", me)).data.materials.append(STONE)
# the chimneys: tall, in pairs on the ridge, and at the ends
for x, y, top in ((-5.6, RIDGE_Y + 0.6, 19.4), (5.6, RIDGE_Y + 0.6, 19.4), (-15.4, RIDGE_Y, 18.6), (15.4, RIDGE_Y, 18.6), (-10.0, 39.5, 17.6)):
    chimney(x, y, 9.0, top)

# the centre bay: forward, higher, its doorway, its balcony, its great window,
# its shaped gable
centre = slab(CX0, CX1, CF, F + 0.5, 0, 12.6, STONE, 0)
centre.name = "centre"
slab(CX0 - 0.1, CX1 + 0.1, CF - 0.12, CF + 0.1, 0, 0.85, RUBBLE, 0.02)
moulding(CX0, CX1, CF, 12.25, h=0.36, proj=0.3)
# quoins and buttress-like pilasters at its corners, rising to pinnacles
for xs in (CX0, CX1):
    slab(xs - 0.32, xs + 0.32, CF - 0.3, CF + 0.35, 0, 12.6, DRESSED, 0.02)
    shaft = cylinder("pinnacle", xs, CF + 0.02, 12.6, 15.2, 0.3, DRESSED, verts=8)
    lathe("cap", [(0, 0), (0.38, 0), (0.38, 0.12), (0.32, 0.2), (0.12, 0.7), (0.05, 0.9), (0, 1.0)], DRESSED, at=(xs, CF + 0.02, 15.2), steps=8)
    finial(xs, CF + 0.02, 16.1, 0.8)
# the doorway: a round arch, deep, its door at the back, a fanlight in the arch
DW, DSP = 2.3, 3.55          # its width, and where its arch springs
cut(centre, -DW / 2, DW / 2, CF - 0.05, CF + 0.95, 0.9, DSP, arch=True)
arch_ring_mesh("door arch", 0, DSP, DW / 2, DW / 2 + 0.28, CF - 0.12, CF + 0.04, DRESSED)
arch_ring_mesh("door arch inner", 0, DSP, DW / 2 - 0.02, DW / 2 + 0.1, CF + 0.04, CF + 0.95, DRESSED)
for xs in (-1, 1):
    slab(xs * DW / 2 - 0.28 * (xs < 0), xs * DW / 2 + 0.28 * (xs > 0), CF - 0.12, CF + 0.04, 0.9, DSP, DRESSED)
    # columns either side, on bases, with capitals
    cx = xs * (DW / 2 + 0.55)
    lathe("column", [(0, 0), (0.24, 0), (0.24, 0.12), (0.18, 0.22), (0.16, 0.3), (0.15, 2.5), (0.2, 2.62), (0.26, 2.72), (0.26, 2.82), (0, 2.82)], DRESSED, at=(cx, CF - 0.25, 0.9), steps=24)
# the door: two leaves of oak, panelled, and the fanlight, lit from the hall
DOOR_Y = CF + 0.9
for xs in (-1, 1):
    x0, x1 = sorted((0, xs * DW / 2))
    slab(x0 + 0.01, x1 - 0.01, DOOR_Y, DOOR_Y + 0.08, 0.9, DSP - 0.12, OAK, 0.008)
    for zz in (1.15, 2.25):
        slab(x0 + 0.14, x1 - 0.14, DOOR_Y - 0.02, DOOR_Y + 0.01, zz, zz + 0.85, OAK, 0.02)
    sphere("knob", (xs * 0.12, DOOR_Y - 0.04, 2.0), 0.035, BRASS)
    # a grid of nail-heads, hand-forged, and the strap hinges
    for i in range(4):
        for j in range(7):
            sx = x0 + 0.14 + i * (x1 - x0 - 0.28) / 3
            sphere("stud", (sx, DOOR_Y - 0.012, 1.05 + j * 0.36), 0.018, IRON, squash=(1, 0.5, 1))
    for zz in (1.25, 2.95):
        box("strap", min(0, xs * DW / 2) + 0.04, max(0, xs * DW / 2) - 0.04, DOOR_Y - 0.02, DOOR_Y, zz - 0.035, zz + 0.035, IRON)
bpy.ops.mesh.primitive_torus_add(major_radius=0.085, minor_radius=0.014, major_segments=24, minor_segments=8, location=(0.32, DOOR_Y - 0.06, 1.72), rotation=(math.pi / 2, 0, 0))
bpy.context.active_object.data.materials.append(BRASS)
sphere("knocker boss", (0.32, DOOR_Y - 0.03, 1.82), 0.04, BRASS)
fan = arch_ring_mesh("fanlight", 0, DSP - 0.1, 0.05, DW / 2 - 0.02, DOOR_Y + 0.02, DOOR_Y + 0.04, ROOM_LIT[0])
box("transom", -DW / 2, DW / 2, DOOR_Y - 0.03, DOOR_Y + 0.05, DSP - 0.14, DSP - 0.04, OAK)
# the steps up to it
for k in range(5):
    slab(-2.2 - (4 - k) * 0.12, 2.2 + (4 - k) * 0.12, CF - 0.36 * (5 - k), CF + 0.1, 0, 0.18 * (k + 1), STEPS, 0.02)
# the lantern hung in the arch
LANTERN = (0, CF + 0.45, 2.95)
lant = import_model("Lantern_01", height=0.62, at=(LANTERN[0], LANTERN[1], LANTERN[2] - 0.31))
lant_chain = cylinder("chain", LANTERN[0], LANTERN[1], LANTERN[2] + 0.3, DSP + 0.9, 0.008, IRON, verts=6)
lant_lamp = lamp("lantern", "POINT", (LANTERN[0], LANTERN[1], LANTERN[2] - 0.05), energy=75, colour=(1.0, 0.58, 0.26), size=0.05)
hl = lamp("hall", "AREA", (0, DOOR_Y + 0.6, 3.0), aim=(0, CF - 4, 1.0), energy=40, colour=(1.0, 0.6, 0.3), size=1.2)
hl.visible_camera = False; hl.visible_transmission = False; hl.visible_glossy = False
# the balcony over the doorway, balustraded
BZ = 4.75
slab(CX0 - 0.15, CX1 + 0.15, CF - 0.75, CF + 0.1, BZ - 0.32, BZ, DRESSED, 0.03)
slab(CX0 - 0.1, CX1 + 0.1, CF - 0.72, CF - 0.5, BZ + 0.82, BZ + 0.94, DRESSED, 0.02)
slab(CX0 - 0.1, CX1 + 0.1, CF - 0.72, CF - 0.5, BZ, BZ + 0.1, DRESSED, 0.01)
for k in range(17):
    bx = CX0 + 0.25 + k * (CX1 - CX0 - 0.5) / 16
    lathe("baluster", [(0, 0), (0.07, 0), (0.07, 0.06), (0.05, 0.12), (0.09, 0.32), (0.1, 0.42), (0.05, 0.58), (0.045, 0.64), (0.07, 0.68), (0.07, 0.72), (0, 0.72)], DRESSED, at=(bx, CF - 0.61, BZ + 0.1), steps=12)
# the great window over it, round-headed, lit
window(centre, 0, CF, 5.6, 2.6, 3.9, lights=2, lit=1, arch=True, depth=0.45)
# the window under the gable
window(centre, 0, CF, 10.2, 1.3, 1.7, lights=2, lit=0, hood=True, transom=False)
# the shaped gable: scrolls stepping up to a pedimented top, coped
G0, G1 = 12.6, 16.4
shape = [(CX0 + 0.2, G0), (CX1 - 0.2, G0), (CX1 - 0.2, G0 + 0.9), (CX1 - 1.1, G0 + 1.3), (CX1 - 1.1, G0 + 2.1), (1.4, G0 + 2.4),
         (1.4, G0 + 3.0), (0.0, G1 + 0.2), (-1.4, G0 + 3.0), (-1.4, G0 + 2.4), (CX0 + 1.1, G0 + 2.1), (CX0 + 1.1, G0 + 1.3), (CX0 + 0.2, G0 + 0.9)]
outline_prism("shaped gable", shape, CF, CF + 0.55, STONE)
for (xa, za), (xb, zb) in zip(shape[1:] + shape[:1], shape[2:] + shape[:2]):
    if za == G0 and zb == G0: continue
    L_ = math.hypot(xb - xa, zb - za)
    if L_ < 0.05: continue
    cp = box("coping", -L_ / 2 - 0.06, L_ / 2 + 0.06, CF - 0.1, CF + 0.65, -0.07, 0.07, DRESSED)
    cp.rotation_euler = (0, -math.atan2(zb - za, xb - xa), 0); cp.location = ((xa + xb) / 2, 0, (za + zb) / 2 + 0.05)
    bevel(cp, 0.015, 2)
finial(0, CF + 0.25, G1 + 0.25, 1.5)
for xs in (-1.4, 1.4):
    finial(xs, CF + 0.25, G0 + 3.05, 0.7)
# a small round window in the gable: dark glass in a ring of stone
# the family's arms, carved in the gable, in a moulded frame
ARMS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.artifacts/manor/arms.png")
if os.path.exists(ARMS):
    me = bpy.data.meshes.new("arms"); bm = bmesh.new(); bm.loops.layers.uv.new()
    bmesh.ops.create_grid(bm, x_segments=260, y_segments=260, size=0.85, calc_uvs=True)
    for v in bm.verts: v.co = Vector((v.co.x, 0, v.co.y))
    bm.to_mesh(me); bm.free()
    arms = link(bpy.data.objects.new("arms", me)); arms.data.materials.append(DRESSED)
    arms.location = (0, CF - 0.03, G0 + 1.55)
    at = bpy.data.textures.new("arms", "IMAGE"); at.image = bpy.data.images.load(ARMS); at.image.colorspace_settings.name = "Non-Color"; at.extension = "EXTEND"
    dm = arms.modifiers.new("carved", "DISPLACE"); dm.texture = at; dm.texture_coords = "UV"; dm.strength = -0.14; dm.direction = "Y"; dm.mid_level = 0
    for p in arms.data.polygons: p.use_smooth = True
    for (x0, x1, z0, z1) in ((-0.95, 0.95, G0 + 0.62, G0 + 0.72), (-0.95, 0.95, G0 + 2.38, G0 + 2.48), (-0.95, -0.85, G0 + 0.62, G0 + 2.48), (0.85, 0.95, G0 + 0.62, G0 + 2.48)):
        slab(x0, x1, CF - 0.12, CF + 0.02, z0, z1, DRESSED, 0.02)
# the name and the year, cut in a band of stone across the bay
band = slab(CX0 + 0.35, CX1 - 0.35, CF - 0.05, CF + 0.02, 11.7, 12.18, DRESSED, 0.015)
txt = bpy.data.curves.new("inscription", "FONT"); txt.body = "ASHCOMBE  ·  MDCCCLXXIV"
try: txt.font = bpy.data.fonts.load("C:/Windows/Fonts/georgiab.ttf")
except Exception: pass
txt.size = 0.27; txt.align_x = "CENTER"; txt.align_y = "CENTER"; txt.extrude = 0.012
ins = link(bpy.data.objects.new("inscription", txt)); ins.rotation_euler = (math.pi / 2, 0, 0); ins.location = (0, CF - 0.05, 11.94)
ins.data.materials.append(DRESSED)
roof_prism("centre roof", [(CX0 + 0.2, G0), (0, G1 - 0.2), (CX1 - 0.2, G0)], CF + 0.5, RIDGE_Y - 1.5, SLATE, along="y")

# a lower wing beyond, to the right, going back into the trees
wing = slab(16, 27, 33, 45, 0, 8.4, STONE, 0)
wing.name = "wing"
moulding(16, 27, 33, 8.05, h=0.34, proj=0.28)
roof_prism("wing roof", [(32.6, 8.3), (39, 14.2), (45.4, 8.3)], 15.8, 27.4, SLATE)
for x in (18.4, 21.5, 24.6):
    window(wing, x, 33, 1.3, 1.3, 2.4, lights=2, lit=2 if x == 21.5 else 0)
    window(wing, x, 33, 4.9, 1.3, 2.2, lights=2, lit=0)
chimney(25.5, 39, 8, 16.2, pots=2)
# and to the left, the same, mostly in the trees
wingl = slab(-27, -16, 33, 45, 0, 8.4, STONE, 0)
wingl.name = "wingl"
roof_prism("wing roof l", [(32.6, 8.3), (39, 14.2), (45.4, 8.3)], -27.4, -15.8, SLATE)
for x in (-18.4, -21.5, -24.6):
    window(wingl, x, 33, 1.3, 1.3, 2.4, lights=2, lit=0)

apply_cuts()

# ── what a house that has stood a hundred years has on it ──────────────────
# quoins at its corners, long and short by turns
def quoins(x, yf, z0, z1, side):
    z, k = z0, 0
    while z < z1 - 0.1:
        h = min(0.36, z1 - z); long_ = k % 2 == 0
        a, b_ = sorted((x, x - side * (0.72 if long_ else 0.42)))
        slab(a, b_, yf - 0.045, yf + 0.02, z + 0.01, z + h - 0.01, DRESSED, 0.012)
        z += h; k += 1
for x in (-16, 16): quoins(x, F, 0.85, EAVES - 0.4, 1 if x > 0 else -1)
for bx in (-12.6, -7.4, 7.4, 12.6): quoins(bx, F - 0.7, 0.85, 10.6, 1 if bx in (-7.4, 12.6) else -1)
# cast-iron gutters along the eaves, and their downpipes, each with its
# hopper head, its brackets, its shoe at the foot
for a, b_ in ((-16.2, -12.6), (-7.4, -4.2), (4.2, 7.4), (12.6, 16.2)):
    g = cylinder("gutter", 0, 0, a, b_, 0.075, IRON, verts=16); g.rotation_euler = (0, math.pi / 2, 0); g.location = (0, F - 0.5, EAVES - 0.18)
for x in (-15.65, -4.62, 4.62, 15.65):
    cylinder("downpipe", x, F - 0.13, 0.05, EAVES - 0.4, 0.055, IRON, verts=12)
    slab(x - 0.17, x + 0.17, F - 0.3, F - 0.05, EAVES - 0.62, EAVES - 0.3, IRON, 0.02)
    slab(x - 0.09, x + 0.09, F - 0.36, F - 0.02, 0.0, 0.16, IRON, 0.01)
    for z in range(1, 5):
        box("bracket", x - 0.08, x + 0.08, F - 0.08, F, z * 1.9, z * 1.9 + 0.05, IRON)
# the great window's tracery: an arch over each light, a ring in the head
TG = CF + 0.45
for xs in (-0.65, 0.65):
    arch_ring_mesh("tracery", xs, 8.2, 0.55, 0.64, TG - 0.12, TG + 0.01, DRESSED, n=24)
bpy.ops.mesh.primitive_torus_add(major_radius=0.36, minor_radius=0.05, major_segments=32, minor_segments=8, location=(0, TG - 0.05, 8.95), rotation=(math.pi / 2, 0, 0))
bpy.context.active_object.data.materials.append(DRESSED)
# ivy, gone red with the autumn, up the walls here and there
IVY = plain("ivy", (0.11, 0.02, 0.012), rough=0.55)
iv = IVY.node_tree.nodes; il = IVY.node_tree.links.new
ivn = iv.new("ShaderNodeTexNoise"); ivn.inputs["Scale"].default_value = 1.2
ivr = iv.new("ShaderNodeValToRGB"); ivr.color_ramp.elements[0].color = (0.13, 0.018, 0.01, 1); ivr.color_ramp.elements[1].color = (0.03, 0.045, 0.012, 1)
il(ivn.outputs["Fac"], ivr.inputs["Fac"]); il(ivr.outputs["Color"], iv["Principled BSDF"].inputs["Base Color"])
ivv = iv.new("ShaderNodeTexVoronoi"); ivv.inputs["Scale"].default_value = 55
ivb = iv.new("ShaderNodeBump"); ivb.inputs["Strength"].default_value = 1.0
il(ivv.outputs["Distance"], ivb.inputs["Height"]); il(ivb.outputs["Normal"], iv["Principled BSDF"].inputs["Normal"])
from mathutils import noise as mnoise
def ivy(x0, x1, z0, z1, yf, seed, rise=1.0):
    """a mat of ivy on a wall face, thick at its root, ragged at its edges"""
    me = bpy.data.meshes.new("ivy"); bm = bmesh.new()
    nx, nz = int((x1 - x0) / 0.12), int((z1 - z0) / 0.12)
    verts = [[bm.verts.new((x0 + i * (x1 - x0) / nx, yf, z0 + j * (z1 - z0) / nz)) for j in range(nz + 1)] for i in range(nx + 1)]
    for i in range(nx):
        for j in range(nz):
            cx, cz = x0 + (i + 0.5) * (x1 - x0) / nx, z0 + (j + 0.5) * (z1 - z0) / nz
            n = mnoise.noise(Vector((cx * 0.6 + seed, cz * 0.6, seed * 0.3)))
            keep = n + 0.55 - ((cz - z0) / (z1 - z0)) ** 1.5 * rise
            if keep > 0: bm.faces.new((verts[i][j], verts[i + 1][j], verts[i + 1][j + 1], verts[i][j + 1]))
    for v in bm.verts:
        v.co.y -= 0.04 + 0.08 * (mnoise.noise(Vector((v.co.x * 3 + seed, v.co.z * 3, 1))) * 0.5 + 0.5)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("ivy", me)); o.data.materials.append(IVY)
    o.modifiers.new("leaves", "SOLIDIFY").thickness = 0.05
    for p in o.data.polygons: p.use_smooth = True
ivy(-16.3, -12.7, 0.0, 8.8, F - 0.06, 3.1, rise=0.9)
ivy(12.7, 16.3, 0.0, 6.5, F - 0.06, 7.7, rise=1.2)
ivy(-12.6, -10.6, 0.0, 4.2, F - 0.76, 1.9, rise=1.3)

# dormers in the main roof, gabled, each with its window
def roof_z(y):
    return EAVES - 0.1 + (y - (F - 0.45)) / (RIDGE_Y - (F - 0.45)) * (RIDGE - EAVES + 0.1)
for dx, lit_d in ((-14.3, 0), (-5.9, 1), (5.9, 0), (14.3, 2)):
    dy0 = 31.3; zb = roof_z(dy0) - 0.2
    dm_ = slab(dx - 0.95, dx + 0.95, dy0, dy0 + 2.6, zb, zb + 2.3, STONE, 0)
    dm_.name = f"dormer{dx}"
    outline_prism("dormer gable", [(dx - 0.95, zb + 2.3), (dx + 0.95, zb + 2.3), (dx, zb + 3.15)], dy0, dy0 + 0.25, STONE)
    roof_prism("dormer roof", [(dx - 1.15, zb + 2.2), (dx, zb + 3.2), (dx + 1.15, zb + 2.2)], dy0 - 0.15, dy0 + 2.8, SLATE, along="y")
    finial(dx, dy0 + 0.1, zb + 3.18, 0.6)
    window(dm_, dx, dy0, zb + 0.45, 0.95, 1.45, lights=2, lit=lit_d, hood=False, transom=False, depth=0.22)
apply_cuts()

# wall lanterns either side of the centre bay, on iron brackets, lit
LAMPS = []
for xs in (-1, 1):
    lx = xs * 5.15
    lamp_root = import_model("street_lamp_02", height=1.55, at=(lx, F - 0.55, 2.45))
    bpy.context.view_layer.update()
    bulb = None
    for o in meshes_of(lamp_root):
        idx = [i for i, m in enumerate(o.data.materials) if m and "bulb" in m.name]
        pts = [o.matrix_world @ o.data.vertices[v].co for p in o.data.polygons if p.material_index in idx for v in p.vertices]
        if pts: bulb = sum(pts, Vector()) / len(pts)
    bulb = bulb or Vector((lx, F - 0.7, 3.4))
    lamp(f"wall lantern {xs}", "POINT", bulb, energy=70, colour=(1.0, 0.58, 0.26), size=0.05)
    LAMPS.append(tuple(bulb))
for mat in bpy.data.materials:
    if "street_lamp_02_bulb" in mat.name and mat.use_nodes:
        b = mat.node_tree.nodes.get("Principled BSDF")
        if b: b.inputs["Emission Color"].default_value = (1, 0.6, 0.28, 1); b.inputs["Emission Strength"].default_value = 30

def stain_fronts():
    """the runoff map, 60 m across and 24 up (x from -30, z from 0): long
    dark tails under each sill, a row of them under every cornice and string
    course, all ragged"""
    import numpy as np
    W_, H_ = 1536, 616
    m = np.zeros((H_, W_), np.float32)
    rng = np.random.default_rng(7)
    px = lambda x: int((x + 30) / 60 * W_); pz = lambda z: int(z / 24 * H_)
    def tails(x0, x1, z, depth, density, strength):
        for xi in range(px(x0), px(x1)):
            if rng.random() > density: continue
            L_ = int(rng.uniform(0.3, 1.0) * depth / 24 * H_)
            top = pz(z)
            w = rng.integers(1, 4)
            for k in range(L_):
                zz = top - k
                if zz < 0: break
                m[zz, xi:xi + w] = np.maximum(m[zz, xi:xi + w], strength * (1 - k / L_) ** 1.3 * rng.uniform(0.6, 1.0))
    for x0, x1, z in SILLS: tails(x0, x1, z, 2.6, 0.55, 0.9)
    for z in (4.45, EAVES - 0.35, 12.25, 10.9): tails(-28, 28, z, 1.4, 0.18, 0.5)
    # a softening, as water spreads in stone
    for _ in range(2):
        m = (m + np.roll(m, 1, 1) + np.roll(m, -1, 1) + np.roll(m, 1, 0)) / 4
    im = bpy.data.images.new("runoff", W_, H_, alpha=False, float_buffer=True)
    im.colorspace_settings.name = "Non-Color"
    px_ = np.ones((H_, W_, 4), np.float32); px_[..., 0] = px_[..., 1] = px_[..., 2] = m
    im.pixels.foreach_set(px_.ravel())
    for mat in (STONE, DRESSED):
        node = mat.node_tree.nodes.get("runoff")
        if node: node.image = im
stain_fronts()

# urns with real 3D botanical shrubs either side of the steps
urn_shrub_proto = import_model("shrub_02", height=1.05, at=(-2.75, CF - 1.6, 1.66), rot=0.4, only=["shrub_02_a"])
for xs in (-1, 1):
    ux, uy = xs * 2.75, CF - 1.6
    slab(ux - 0.42, ux + 0.42, uy - 0.42, uy + 0.42, 0, 0.9, DRESSED, 0.02)
    lathe("urn", [(0, 0), (0.3, 0), (0.3, 0.08), (0.14, 0.16), (0.12, 0.3), (0.34, 0.5), (0.4, 0.72), (0.36, 0.8), (0.4, 0.84), (0.38, 0.86), (0, 0.86)], DRESSED, at=(ux, uy, 0.9), steps=32)
    if xs > 0:
        clone(urn_shrub_proto, (ux, uy, 1.66), 2.3, 0.98)

# ── the ground: a 3D wet slate flagstone courtyard with 3D water ripples ───
ground = box("lawn", -120, 120, -10, 160, -0.3, 0, LAWN)
drive = [(-4.0, 6), (4.0, 6), (4.6, 18), (12.5, 23), (12.5, CF + 0.4), (-12.5, CF + 0.4), (-12.5, 23), (-4.6, 18)]

def inside(x, y, poly):
    c = False
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0): c = not c
    return c

def drive_z(x, y):
    half_w = 4.2 if y < 18 else min(12.5, 4.2 + (y - 18) * 1.4)
    crown = max(0.0, 1.0 - (x / half_w) ** 2) * 0.028
    rut = -0.008 * (math.exp(-((abs(x) - 1.45) / 0.45) ** 2))
    undul = 0.005 * math.sin(x * 0.7 + y * 0.45) * math.cos(y * 0.32 - x * 0.25)
    return 0.012 + crown + rut + undul

me = bpy.data.meshes.new("drive"); bm = bmesh.new(); uv_lay = bm.loops.layers.uv.new()
nx_d, ny_d = 96, 84
dx0, dx1, dy0, dy1 = -12.6, 12.6, 6.0, CF + 0.4
grid_v = [[bm.verts.new((dx0 + i * (dx1 - dx0) / nx_d, dy0 + j * (dy1 - dy0) / ny_d, drive_z(dx0 + i * (dx1 - dx0) / nx_d, dy0 + j * (dy1 - dy0) / ny_d))) for j in range(ny_d + 1)] for i in range(nx_d + 1)]
for i in range(nx_d):
    for j in range(ny_d):
        cx = dx0 + (i + 0.5) * (dx1 - dx0) / nx_d
        cy = dy0 + (j + 0.5) * (dy1 - dy0) / ny_d
        if inside(cx, cy, drive):
            f = bm.faces.new((grid_v[i][j], grid_v[i + 1][j], grid_v[i + 1][j + 1], grid_v[i][j + 1]))
            for loop in f.loops:
                co = loop.vert.co
                loop[uv_lay].uv = ((co.x - dx0) / (dx1 - dx0), (co.y - dy0) / (dy1 - dy0))
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
bm.to_mesh(me); bm.free()
for p in me.polygons: p.use_smooth = True
dr = link(bpy.data.objects.new("drive", me)); dr.data.materials.append(DRIVE)
dr_disp_path = f"{T}/slate_driveway/Displacement.jpg"
if os.path.exists(dr_disp_path):
    dr_tex = bpy.data.textures.new("slate_disp", "IMAGE")
    dr_tex.image = bpy.data.images.load(dr_disp_path, check_existing=True)
    dr_tex.image.colorspace_settings.name = "Non-Color"
    dm_dr = dr.modifiers.new("flagstones", "DISPLACE")
    dm_dr.texture = dr_tex; dm_dr.texture_coords = "GLOBAL"; dm_dr.strength = 0.022; dm_dr.mid_level = 0.5

# 3D Concentric Rain Ripples raytraced directly on the wet slate flagstones:
import numpy as np
RIPPLE_W, RIPPLE_H = 1536, 1536
rx0_rip, rx1_rip, ry0_rip, ry1_rip = -5.4, 5.4, 6.4, 22.4
ripple_im = bpy.data.images.new("drive_ripples", RIPPLE_W, RIPPLE_H, alpha=False, float_buffer=True)
ripple_im.colorspace_settings.name = "Non-Color"
RIPPLE_SPOTS = []
rng_rip = random.Random(404)
for i_spot in range(150):
    # Extra concentration in the foreground/midground courtyard (y = 6.8..15.5) where camera sees ripples best:
    if i_spot < 85:
        rx = rng_rip.uniform(-4.4, 4.4)
        ry = rng_rip.uniform(6.8, 14.8)
    else:
        rx = rng_rip.uniform(-4.2, 4.2)
        ry = rng_rip.uniform(14.0, 21.2)
    if abs(rx) > 3.7 and ry < 16.5: continue
    RIPPLE_SPOTS.append((rx, ry, rng_rip.uniform(0.30, 0.62), rng_rip.random()))

def setup_drive_ripples():
    nt = DRIVE.node_tree; N = nt.nodes; L = nt.links.new
    b = N["Principled BSDF"]
    tc = next(n for n in N if n.type == "TEX_COORD")
    sp = N.new("ShaderNodeSeparateXYZ"); L(tc.outputs["Object"], sp.inputs["Vector"])
    u = N.new("ShaderNodeMath"); u.operation = "MULTIPLY_ADD"; u.inputs[1].default_value = 1 / (rx1_rip - rx0_rip); u.inputs[2].default_value = -rx0_rip / (rx1_rip - rx0_rip)
    L(sp.outputs["X"], u.inputs[0])
    v = N.new("ShaderNodeMath"); v.operation = "MULTIPLY_ADD"; v.inputs[1].default_value = 1 / (ry1_rip - ry0_rip); v.inputs[2].default_value = -ry0_rip / (ry1_rip - ry0_rip)
    L(sp.outputs["Y"], v.inputs[0])
    uv = N.new("ShaderNodeCombineXYZ"); L(u.outputs["Value"], uv.inputs["X"]); L(v.outputs["Value"], uv.inputs["Y"])
    rim_node = N.new("ShaderNodeTexImage"); rim_node.name = "drive_ripples"; rim_node.image = ripple_im; rim_node.extension = "EXTEND"
    L(uv.outputs["Vector"], rim_node.inputs["Vector"])
    sep_c = N.new("ShaderNodeSeparateColor")
    L(rim_node.outputs["Color"], sep_c.inputs["Color"])
    rb = N.new("ShaderNodeBump"); rb.inputs["Strength"].default_value = 2.35; rb.inputs["Distance"].default_value = 0.026
    L(sep_c.outputs["Red"], rb.inputs["Height"])
    if b.inputs["Normal"].is_linked:
        L(b.inputs["Normal"].links[0].from_socket, rb.inputs["Normal"])
    L(rb.outputs["Normal"], b.inputs["Normal"])
    # Wet water film along the active concentric wave rings and their damp haloes:
    if b.inputs["Roughness"].is_linked:
        old_r = b.inputs["Roughness"].links[0].from_socket
        rmix = N.new("ShaderNodeMix"); rmix.data_type = "FLOAT"; rmix.inputs[3].default_value = 0.05
        L(sep_c.outputs["Green"], rmix.inputs["Factor"]); L(old_r, rmix.inputs[2]); L(rmix.outputs[0], b.inputs["Roughness"])
    smix = N.new("ShaderNodeMix"); smix.data_type = "FLOAT"; smix.inputs[2].default_value = 0.5; smix.inputs[3].default_value = 0.88
    L(sep_c.outputs["Green"], smix.inputs["Factor"]); L(smix.outputs[0], b.inputs["Specular IOR Level"])
    # Curved capillary wave crests catch wide-angle upper sky dome light as well as 3D scene lights:
    if b.inputs["Base Color"].is_linked:
        old_col = b.inputs["Base Color"].links[0].from_socket
        ck = N.new("ShaderNodeMath"); ck.operation = "MULTIPLY"; ck.inputs[1].default_value = 0.42
        L(sep_c.outputs["Blue"], ck.inputs[0])
        cmix = N.new("ShaderNodeMix"); cmix.data_type = "RGBA"; cmix.inputs[7].default_value = (0.32, 0.37, 0.45, 1)
        L(ck.outputs["Value"], cmix.inputs["Factor"]); L(old_col, cmix.inputs[6]); L(cmix.outputs[2], b.inputs["Base Color"])
setup_drive_ripples()

def update_drive_ripples(phase_norm=0.0):
    xs = np.linspace(rx0_rip, rx1_rip, RIPPLE_W, dtype=np.float32)[None, :]
    ys = np.linspace(ry0_rip, ry1_rip, RIPPLE_H, dtype=np.float32)[:, None]
    h = np.full((RIPPLE_H, RIPPLE_W), 0.5, dtype=np.float32)
    wet_mask = np.zeros((RIPPLE_H, RIPPLE_W), dtype=np.float32)
    crest_mask = np.zeros((RIPPLE_H, RIPPLE_W), dtype=np.float32)
    for rx, ry, max_r, ph0 in RIPPLE_SPOTS:
        age = (ph0 + phase_norm) % 1.0
        fade = (1.0 - age) * (1.0 - age * 0.62)
        if fade < 0.02: continue
        ix0 = max(2, int((rx - max_r - rx0_rip) / (rx1_rip - rx0_rip) * RIPPLE_W))
        ix1 = min(RIPPLE_W - 2, int((rx + max_r - rx0_rip) / (rx1_rip - rx0_rip) * RIPPLE_W) + 1)
        iy0 = max(2, int((ry - max_r - ry0_rip) / (ry1_rip - ry0_rip) * RIPPLE_H))
        iy1 = min(RIPPLE_H - 2, int((ry + max_r - ry0_rip) / (ry1_rip - ry0_rip) * RIPPLE_H) + 1)
        if ix0 >= ix1 or iy0 >= iy1: continue
        d = np.hypot(xs[:, ix0:ix1] - rx, ys[iy0:iy1, :] - ry) / max_r
        in_disc = (d < 1.0).astype(np.float32)
        # 3 concentric capillary wave rings (crest + trough pairs) + central impact crown
        r0 = d - (0.12 + age * 0.82)
        r1 = d - (0.04 + age * 0.56)
        r2 = d - (age * 0.30)
        w0 = np.sin(r0 * 28.0) * np.exp(-(r0 * 11.5) ** 2)
        w1 = 0.72 * np.sin(r1 * 32.0) * np.exp(-(r1 * 13.5) ** 2) * (age > 0.10)
        w2 = 0.46 * np.sin(r2 * 36.0) * np.exp(-(r2 * 15.5) ** 2) * (age > 0.22)
        crown = 1.35 * np.cos(d * 18.0) * np.exp(-(d * 13.0) ** 2) * max(0.0, 1.0 - age / 0.25)
        wave = (w0 + w1 + w2 + crown) * fade * in_disc
        h[iy0:iy1, ix0:ix1] += wave * 0.28
        ring_env = (np.exp(-(r0 * 9.0) ** 2) + 0.78 * np.exp(-(r1 * 11.0) ** 2) * (age > 0.10) + 0.55 * np.exp(-(d * 4.5) ** 2)) * fade * in_disc
        wet_mask[iy0:iy1, ix0:ix1] = np.maximum(wet_mask[iy0:iy1, ix0:ix1], np.clip(ring_env * 0.95, 0.0, 1.0))
        crest = (np.maximum(0.0, w0) ** 1.35 + 0.75 * np.maximum(0.0, w1) ** 1.35 * (age > 0.10) + 0.48 * np.maximum(0.0, w2) ** 1.35 * (age > 0.22) + 1.15 * np.maximum(0.0, crown)) * fade * in_disc
        crest_mask[iy0:iy1, ix0:ix1] = np.maximum(crest_mask[iy0:iy1, ix0:ix1], np.clip(crest, 0.0, 1.0))
    px_ = np.ones((RIPPLE_H, RIPPLE_W, 4), np.float32)
    px_[..., 0] = np.clip(h, 0.0, 1.0)
    px_[..., 1] = np.clip(wet_mask, 0.0, 1.0)
    px_[..., 2] = np.clip(crest_mask, 0.0, 1.0)
    new_im = bpy.data.images.new(f"drive_ripples_{phase_norm:.3f}", RIPPLE_W, RIPPLE_H, alpha=False, float_buffer=True)
    new_im.colorspace_settings.name = "Non-Color"
    new_im.pixels.foreach_set(px_.ravel())
    new_im.update()
    rim_node = DRIVE.node_tree.nodes.get("drive_ripples")
    if rim_node:
        old_im = rim_node.image
        rim_node.image = new_im
        if old_im and old_im != new_im and old_im.users == 0:
            bpy.data.images.remove(old_im)
update_drive_ripples(0.0)

# the lawns' kerbs, a rubble edging along the drive
for (xa, ya), (xb, yb) in zip(drive, drive[1:] + drive[:1]):
    L_ = math.hypot(xb - xa, yb - ya)
    if L_ < 0.5 or ya >= CF and yb >= CF: continue
    k = box("kerb", -L_ / 2, L_ / 2, -0.09, 0.09, 0, 0.09, RUBBLE)
    k.rotation_euler = (0, 0, math.atan2(yb - ya, xb - xa)); k.location = ((xa + xb) / 2, (ya + yb) / 2, 0)

# Wet autumn leaves drifted along the stone kerbs on the edges of the courtyard
LEAF = bpy.data.materials.new("fallen leaves"); LEAF.use_nodes = True
ln_ = LEAF.node_tree.nodes; ll_ = LEAF.node_tree.links.new
lca = ln_.new("ShaderNodeVertexColor"); lca.layer_name = "leaf"
ll_(lca.outputs["Color"], ln_["Principled BSDF"].inputs["Base Color"])
ln_["Principled BSDF"].inputs["Roughness"].default_value = 0.38
if "Coat Weight" in ln_["Principled BSDF"].inputs: ln_["Principled BSDF"].inputs["Coat Weight"].default_value = 0.0
lv = ln_.new("ShaderNodeTexWave"); lv.inputs["Scale"].default_value = 60; lv.bands_direction = "Y"
lb = ln_.new("ShaderNodeBump"); lb.inputs["Strength"].default_value = 0.15
ll_(lv.outputs["Fac"], lb.inputs["Height"]); ll_(lb.outputs["Normal"], ln_["Principled BSDF"].inputs["Normal"])
AUTUMN = [(0.26, 0.08, 0.02), (0.34, 0.14, 0.03), (0.20, 0.09, 0.02), (0.38, 0.22, 0.04), (0.15, 0.06, 0.02), (0.28, 0.05, 0.02)]
me = bpy.data.meshes.new("leaves"); bm = bmesh.new()
cl = bm.loops.layers.color.new("leaf")
placed = 0
while placed < 420:
    x, y = RNG.uniform(-12.5, 12.5), RNG.uniform(10.2, CF - 0.3)
    near_edge = min(abs(abs(x) - 4.1), abs(abs(x) - 12.1)) < 0.85
    if not inside(x, y, drive): continue
    if not near_edge and RNG.random() < 0.94: continue
    size = RNG.uniform(0.045, 0.09); a = RNG.uniform(0, math.tau); lobes = RNG.choice((0, 3, 5))
    gz = drive_z(x, y)
    ring = []
    for k in range(12):
        t = k / 12 * math.tau
        r = size * (0.55 + 0.45 * math.cos(t) ** 2) * (1 + (0.18 * math.cos(lobes * t) if lobes else 0))
        lx, ly = math.cos(t) * r, math.sin(t) * r * 0.62
        ring.append((x + lx * math.cos(a) - ly * math.sin(a), y + lx * math.sin(a) + ly * math.cos(a), gz + 0.002 + 0.005 * (lx / size) ** 2))
    vs = [bm.verts.new(p) for p in ring]
    face = bm.faces.new(vs)
    c = RNG.choice(AUTUMN); k = RNG.uniform(0.65, 1.05)
    for loop in face.loops: loop[cl] = (c[0] * k, c[1] * k, c[2] * k, 1)
    placed += 1
bm.to_mesh(me); bm.free()
leaves_ob = link(bpy.data.objects.new("leaves", me)); leaves_ob.data.materials.append(LEAF)

# ── the gate: two piers with urns, the iron gates open, railings ───────────
GY, GX = 13.5, 4.7
for side in (-1, 1):
    x = side * GX
    slab(x - 0.62, x + 0.62, GY - 0.62, GY + 0.62, 0, 0.55, DRESSED, 0.03)
    slab(x - 0.5, x + 0.5, GY - 0.5, GY + 0.5, 0.55, 3.35, STONE, 0.02)
    # a sunk panel on its face
    slab(x - 0.3, x + 0.3, GY - 0.52, GY - 0.46, 1.2, 2.6, DRESSED, 0.01)
    slab(x - 0.24, x + 0.24, GY - 0.54, GY - 0.5, 1.26, 2.54, STONE, 0.01)
    slab(x - 0.62, x + 0.62, GY - 0.62, GY + 0.62, 3.35, 3.55, DRESSED, 0.03)
    slab(x - 0.5, x + 0.5, GY - 0.5, GY + 0.5, 3.55, 3.68, DRESSED, 0.02)
    lathe("pier urn", [(0, 0), (0.26, 0), (0.26, 0.08), (0.12, 0.16), (0.1, 0.26), (0.3, 0.42), (0.36, 0.6), (0.3, 0.74), (0.18, 0.8), (0.2, 0.86),
                       (0.08, 0.92), (0.06, 1.05), (0.1, 1.1), (0.04, 1.2), (0, 1.24)], DRESSED, at=(x, GY, 3.68), steps=32)
    # its gate leaf, open inward
    leaf = import_model("large_iron_gate", only=["large_iron_gate_left_door"] if side < 0 else ["large_iron_gate_right_door"])
    for o in meshes_of(leaf): o.data.materials.clear(); o.data.materials.append(IRON)
    leaf.scale = (1.5, 1.0, 1.0)
    bpy.context.view_layer.update()
    lo_, hi_ = (lambda pts: (Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))), Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))))([o.matrix_world @ Vector(c) for o in meshes_of(leaf) for c in o.bound_box])
    hinge = Vector((x - side * 0.5, GY, 0.05))
    # bring its hinge edge to the pier, then swing it open
    pivot = bpy.data.objects.new("hinge", None); link(pivot); pivot.location = hinge
    bpy.context.view_layer.update()
    leaf.location += Vector((hinge.x - (lo_.x if side < 0 else hi_.x), hinge.y - (lo_.y + hi_.y) / 2, hinge.z - lo_.z))
    bpy.context.view_layer.update()
    leaf.parent = pivot; leaf.matrix_parent_inverse = pivot.matrix_world.inverted()
    pivot.rotation_euler = (0, 0, side * -1.25)
# the railings, on a low wall, away from the piers to either side
def railings(xa, xb, y):
    x0, x1 = sorted((xa, xb))
    slab(x0, x1, y - 0.22, y + 0.22, 0, 0.48, RUBBLE, 0.02)
    slab(x0, x1, y - 0.27, y + 0.27, 0.48, 0.58, DRESSED, 0.02)
    me = bpy.data.meshes.new("railings"); bm = bmesh.new()
    n = int((x1 - x0) / 0.13)
    for k in range(n + 1):
        bx = x0 + 0.06 + k * (x1 - x0 - 0.12) / n
        r = bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.013, radius2=0.013, depth=1.55)
        bmesh.ops.translate(bm, verts=r["verts"], vec=(bx, y, 0.58 + 0.775))
        s = bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.032, radius2=0.0, depth=0.12)
        bmesh.ops.translate(bm, verts=s["verts"], vec=(bx, y, 0.58 + 1.55 + 0.06))
    for zz in (0.72, 1.85):
        c = bmesh.ops.create_cube(bm, size=1.0)
        for v in c["verts"]: v.co = Vector((x0 + (v.co.x + 0.5) * (x1 - x0), y + v.co.y * 0.04, zz + v.co.z * 0.03))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("railings", me)); o.data.materials.append(IRON)
    for p in o.data.polygons: p.use_smooth = True
for side in (-1, 1):
    railings(side * (GX + 0.62), side * 24, GY)
    # a hedge behind them, clipped
    # (clipped square, its edges softened, then leafy all over)
    h = box("hedge", *sorted((side * (GX + 0.9), side * 24)), GY + 0.5, GY + 1.6, 0, 1.9, HEDGE)
    bv = h.modifiers.new("soft", "BEVEL"); bv.width = 0.28; bv.segments = 4
    sd = h.modifiers.new("dense", "SUBSURF"); sd.subdivision_type = "SIMPLE"; sd.levels = sd.render_levels = 5
    d = h.modifiers.new("leafage", "DISPLACE"); tx = bpy.data.textures.new("hedge", "CLOUDS"); tx.noise_scale = 0.18; tx.noise_depth = 3; d.texture = tx; d.strength = 0.16; d.texture_coords = "GLOBAL"

# ── trees: old ones framing it, the woods behind ───────────────────────────
def autumn(objs, keep=0.45, seed=1):
    """the tree's leaves gone to autumn and half of them fallen"""
    rng = random.Random(seed)
    for o in objs:
        for mat in o.data.materials:
            if not mat or not mat.use_nodes: continue
            b = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if not b: continue
            if "Coat Weight" in b.inputs: b.inputs["Coat Weight"].default_value = 0.0
            if "bark" in mat.name.lower() or "trunk" in mat.name.lower():
                if not mat.get("wet_bark"):
                    mat["wet_bark"] = True
                    b.inputs["Roughness"].default_value = 0.52
                    b.inputs["Specular IOR Level"].default_value = 0.38
                    for n in mat.node_tree.nodes:
                        if n.type == "NORMAL_MAP": n.inputs["Strength"].default_value = 1.35
                continue
            if "leaves" not in mat.name or mat.get("autumn"): continue
            mat["autumn"] = True
            b.inputs["Roughness"].default_value = 0.36
            b.inputs["Specular IOR Level"].default_value = 0.45
            if not b.inputs["Base Color"].is_linked: continue
            src = b.inputs["Base Color"].links[0].from_socket
            h = mat.node_tree.nodes.new("ShaderNodeHueSaturation"); h.inputs["Hue"].default_value = 0.31; h.inputs["Saturation"].default_value = 1.18; h.inputs["Value"].default_value = 0.56
            mat.node_tree.links.new(src, h.inputs["Color"]); mat.node_tree.links.new(h.outputs["Color"], b.inputs["Base Color"])
        # (and thin them: drop whole leaf islands at random)
        idx = [i for i, m in enumerate(o.data.materials) if m and "leaves" in m.name]
        if not idx: continue
        bm = bmesh.new(); bm.from_mesh(o.data)
        bm.faces.ensure_lookup_table()
        islands, seen = [], set()
        for f in bm.faces:
            if f.material_index not in idx or f.index in seen: continue
            stack, isl = [f], []
            seen.add(f.index)
            while stack:
                g = stack.pop(); isl.append(g)
                for e in g.edges:
                    for h2 in e.link_faces:
                        if h2.index not in seen and h2.material_index in idx: seen.add(h2.index); stack.append(h2)
            islands.append(isl)
        gone = [f for isl in islands if rng.random() > keep for f in isl]
        bmesh.ops.delete(bm, geom=gone, context="FACES")
        bm.to_mesh(o.data); bm.free()

def tree(mid, at, height, rot, keep=0.45, seed=1, only=None):
    """a tree, its trunk (not its crown's middle) stood at `at`"""
    r = import_model(mid, height=height, rot=rot, only=only, at=at)
    bpy.context.view_layer.update()
    foot = [o.matrix_world @ v.co for o in meshes_of(r) for v in o.data.vertices]
    low = min(p.z for p in foot)
    base = [p for p in foot if p.z < low + 0.6]
    cx, cy = sum(p.x for p in base) / len(base), sum(p.y for p in base) / len(base)
    r.location += Vector((at[0] - cx, at[1] - cy, 0))
    r["offset"] = tuple(Vector(r["offset"]) + Matrix.Rotation(-rot, 3, "Z") @ Vector((cx - at[0], cy - at[1], 0)) / r.scale.z * r.scale.z)
    autumn(meshes_of(r), keep, seed)
    return r

def clone_unique(root, at, rot=0.0, k=1.0):
    twin = clone(root, at, rot, k)
    for o in meshes_of(twin):
        o.data = o.data.copy()
    return twin

def bounds_of(objs):
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    return (Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))), Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))))

# (each foreground/midground tree given unique mesh data so 3D wind bends both sides in world wind direction)
old = tree("jacaranda_tree", (-9.3, 12.0, 0), 17, float(arg("--treerot", "2.4")), keep=0.26, seed=3)
old_right = clone_unique(old, (10.0, 13.0, 0), float(arg("--treerot", "2.4")) + 3.3, 0.95)
fir = import_model("fir_tree_01", height=21, at=(-8, 70, 0), rot=1.2, only=["fir_tree_01_a_LOD0"])
pine = import_model("pine_tree_01", height=19, at=(-30, 55, 0), rot=0.3, only=["pine_tree_01_a_LOD0"])
for (x, y, k, r, kind) in ((12, 66, 1.0, 2.0, fir), (34, 58, 1.05, 0.7, pine), (-40, 40, 0.9, 2.6, fir), (40, 40, 0.95, 1.4, pine), (0, 85, 1.15, 0.9, fir), (-55, 70, 1.1, 1.9, pine), (55, 75, 1.0, 0.2, fir)):
    clone(kind, (x, y, 0), r, k)
mid = tree("island_tree_01", (-22, 26, 0), 9, 0.4, keep=0.5, seed=22)
mid_right = clone_unique(mid, (23, 24, 0), 2.1, 0.9)
small = tree("tree_small_02", (-9, 19, 0), 4.5, 1.0, keep=0.7, seed=9)
small_right = clone_unique(small, (9.5, 18, 0), 2.2, 0.9)

# ── 3D Wind Deformation for Trees + Porch Lantern ─────────────────────────
bpy.context.view_layer.update()
TREE_WIND_RECORDS = []
for root_ob, tx, ty, h_ref, amp_k in (
    (old, -9.3, 12.0, 13.5, 1.0),
    (old_right, 10.0, 13.0, 13.5, 0.96),
    (mid, -22.0, 26.0, 8.0, 0.75),
    (mid_right, 23.0, 24.0, 8.0, 0.75),
    (small, -9.0, 19.0, 4.0, 0.65),
    (small_right, 9.5, 18.0, 4.0, 0.65),
):
    for o in meshes_of(root_ob):
        nv = len(o.data.vertices)
        if nv == 0: continue
        co_rest = np.empty(nv * 3, dtype=np.float32)
        o.data.vertices.foreach_get("co", co_rest)
        co_rest = co_rest.reshape((nv, 3))
        mw = np.array(o.matrix_world.to_3x3(), dtype=np.float32)
        tw = np.array(o.matrix_world.translation, dtype=np.float32)
        mw_inv = np.array(o.matrix_world.inverted().to_3x3(), dtype=np.float32)
        w_rest = co_rest @ mw.T + tw
        h_bough = (np.clip((w_rest[:, 2] - 1.2) / h_ref, 0.0, 1.25) ** 1.35 * amp_k).astype(np.float32)
        r_branch = (np.clip(np.hypot(w_rest[:, 0] - tx, w_rest[:, 1] - ty) / 5.0, 0.0, 1.3) ** 1.2).astype(np.float32)
        TREE_WIND_RECORDS.append((o, co_rest, w_rest, mw_inv, h_bough, r_branch))

def update_3d_tree_wind(phase_norm=0.0):
    phase = phase_norm * math.tau
    for o, co_rest, w_rest, mw_inv, h_bough, r_branch in TREE_WIND_RECORDS:
        wx, wy, wz = w_rest[:, 0], w_rest[:, 1], w_rest[:, 2]
        phi1 = phase - 0.15 * wx - 0.08 * wy + 0.18 * wz
        phi2 = 2.0 * phase - 0.30 * wx - 0.16 * wy + 0.45 * wz
        phi3 = 3.0 * phase - 0.58 * wx + 0.42 * wy + 0.92 * wz
        s1, c1 = np.sin(phi1), np.cos(phi1 - 0.35)
        s2 = np.sin(phi2)
        s3, c3 = np.sin(phi3), np.cos(phi3)
        dx = h_bough * (0.40 * s1 + 0.16 * s2) + h_bough * r_branch * (0.19 * s2 + 0.085 * s3)
        dy = h_bough * (0.12 * c1 + 0.06 * s2) + h_bough * r_branch * (0.075 * c3)
        dz = -h_bough * (0.065 * s1) + h_bough * r_branch * (0.055 * s2 + 0.04 * s3)
        d_world = np.stack([dx, dy, dz], axis=1)
        co_new = co_rest + d_world @ mw_inv.T
        o.data.vertices.foreach_set("co", co_new.astype(np.float32).ravel())
        o.data.update()
    # Subtle 3D sway of the hanging porch lantern on its iron chain:
    sway_ang = 0.032 * math.sin(phase + 0.4) + 0.012 * math.sin(2.0 * phase - 0.3)
    lant.rotation_euler = (0.010 * math.cos(phase), sway_ang, 0.0)
    lant.location = (LANTERN[0] + math.sin(sway_ang) * 0.31, LANTERN[1], LANTERN[2] - 0.31)
    lant_lamp.location = (LANTERN[0] + math.sin(sway_ang) * 0.18, LANTERN[1], LANTERN[2] - 0.05)

# ── 3D Rain Streaks & 3D Wind-Blown Autumn Leaves ──────────────────────────
RAIN_3D = bpy.data.materials.new("rain_3d_streaks"); RAIN_3D.use_nodes = True
RAIN_3D["clear"] = True
rn_ = RAIN_3D.node_tree.nodes; rl_ = RAIN_3D.node_tree.links.new
for n in list(rn_): rn_.remove(n)
r_out = rn_.new("ShaderNodeOutputMaterial")
r_tc = rn_.new("ShaderNodeTexCoord"); r_sep = rn_.new("ShaderNodeSeparateXYZ")
rl_(r_tc.outputs["UV"], r_sep.inputs["Vector"])
# Smooth vertical & horizontal taper along each 3D rain ribbon: sin(pi * v)^1.4 * sin(pi * u) * droplet head weighting
r_vpi = rn_.new("ShaderNodeMath"); r_vpi.operation = "MULTIPLY"; r_vpi.inputs[1].default_value = math.pi; rl_(r_sep.outputs["Y"], r_vpi.inputs[0])
r_vsin = rn_.new("ShaderNodeMath"); r_vsin.operation = "SINE"; rl_(r_vpi.outputs["Value"], r_vsin.inputs[0])
r_vpow = rn_.new("ShaderNodeMath"); r_vpow.operation = "POWER"; r_vpow.inputs[1].default_value = 1.4; rl_(r_vsin.outputs["Value"], r_vpow.inputs[0])
r_head = rn_.new("ShaderNodeMath"); r_head.operation = "MULTIPLY_ADD"; r_head.inputs[1].default_value = -0.45; r_head.inputs[2].default_value = 1.22; rl_(r_sep.outputs["Y"], r_head.inputs[0])
r_vprof = rn_.new("ShaderNodeMath"); r_vprof.operation = "MULTIPLY"; rl_(r_vpow.outputs["Value"], r_vprof.inputs[0]); rl_(r_head.outputs["Value"], r_vprof.inputs[1])
r_upi = rn_.new("ShaderNodeMath"); r_upi.operation = "MULTIPLY"; r_upi.inputs[1].default_value = math.pi; rl_(r_sep.outputs["X"], r_upi.inputs[0])
r_usin = rn_.new("ShaderNodeMath"); r_usin.operation = "SINE"; rl_(r_upi.outputs["Value"], r_usin.inputs[0])
r_env = rn_.new("ShaderNodeMath"); r_env.operation = "MULTIPLY"; rl_(r_vprof.outputs["Value"], r_env.inputs[0]); rl_(r_usin.outputs["Value"], r_env.inputs[1])
r_fac = rn_.new("ShaderNodeMath"); r_fac.operation = "MULTIPLY"; r_fac.inputs[1].default_value = 0.14; rl_(r_env.outputs["Value"], r_fac.inputs[0])
# 3D world-space warm light catch near the porch lantern and lit windows vs cool moonlight:
r_geo = rn_.new("ShaderNodeNewGeometry")
r_dist = rn_.new("ShaderNodeVectorMath"); r_dist.operation = "DISTANCE"; r_dist.inputs[1].default_value = (0.0, 27.5, 4.0)
rl_(r_geo.outputs["Position"], r_dist.inputs[0])
r_warm = rn_.new("ShaderNodeMapRange"); r_warm.inputs["From Min"].default_value = 2.5; r_warm.inputs["From Max"].default_value = 11.5; r_warm.inputs["To Min"].default_value = 1.0; r_warm.inputs["To Max"].default_value = 0.0
rl_(r_dist.outputs["Value"], r_warm.inputs["Value"])
r_col = rn_.new("ShaderNodeMix"); r_col.data_type = "RGBA"
r_col.inputs[6].default_value = (0.56, 0.68, 0.88, 1); r_col.inputs[7].default_value = (1.0, 0.72, 0.38, 1)
rl_(r_warm.outputs["Result"], r_col.inputs["Factor"])
r_tr = rn_.new("ShaderNodeBsdfTransparent")
r_em = rn_.new("ShaderNodeEmission")
rl_(r_col.outputs[2], r_em.inputs["Color"]); rl_(r_fac.outputs["Value"], r_em.inputs["Strength"])
# Additive motion-blurred water glint over Transparent BSDF so rain streaks never darken lit windows or sky:
r_add = rn_.new("ShaderNodeAddShader")
rl_(r_tr.outputs["BSDF"], r_add.inputs[0]); rl_(r_em.outputs["Emission"], r_add.inputs[1])
r_lp = rn_.new("ShaderNodeLightPath"); r_sh = rn_.new("ShaderNodeMixShader")
rl_(r_lp.outputs["Is Camera Ray"], r_sh.inputs["Fac"]); rl_(r_tr.outputs["BSDF"], r_sh.inputs[1]); rl_(r_add.outputs["Shader"], r_sh.inputs[2])
rl_(r_sh.outputs["Shader"], r_out.inputs["Surface"])

RAIN_DROPS = []
rng_rain = random.Random(1888)
for layer_i, (cnt, y_lo, y_hi, x_span, z_hi, w_drop, l_lo, l_hi) in enumerate((
    (620, 4.4, 11.2, 7.6, 8.2, 0.0022, 0.36, 0.56),
    (680, 11.2, 20.2, 12.5, 12.2, 0.0032, 0.46, 0.68),
    (440, 20.2, 27.2, 16.2, 15.2, 0.0042, 0.54, 0.82),
)):
    for _ in range(cnt):
        RAIN_DROPS.append((
            rng_rain.uniform(-x_span, x_span),
            rng_rain.uniform(y_lo, y_hi),
            rng_rain.uniform(0.1, z_hi),
            x_span, z_hi,
            w_drop * rng_rain.uniform(0.85, 1.2),
            rng_rain.uniform(l_lo, l_hi),
            rng_rain.random(),
        ))

rain_me = bpy.data.meshes.new("rain_3d"); rain_bm = bmesh.new(); rain_uv = rain_bm.loops.layers.uv.new()
WIND_DIR = Vector((0.18, 0.02, -1.0)).normalized()
VS_RIBBON = (0.0, 0.2, 0.5, 0.8, 1.0)
for idx_d, (rx0, ry0, rz0, x_sp, z_hi, wd, ld, ph_d) in enumerate(RAIN_DROPS):
    rows_v = []
    for v_s in VS_RIBBON:
        w_taper = wd * math.sin(max(0.05, min(0.95, v_s)) * math.pi)
        p_c = Vector((rx0, ry0, rz0)) + WIND_DIR * ((v_s - 0.5) * ld)
        v_l = rain_bm.verts.new((p_c.x - w_taper * 0.5, p_c.y, p_c.z))
        v_r = rain_bm.verts.new((p_c.x + w_taper * 0.5, p_c.y, p_c.z))
        rows_v.append((v_l, v_r, v_s))
    for (vl0, vr0, vs0), (vl1, vr1, vs1) in zip(rows_v[:-1], rows_v[1:]):
        f_r = rain_bm.faces.new((vl0, vr0, vr1, vl1))
        f_r.loops[0][rain_uv].uv = (0.0, vs0)
        f_r.loops[1][rain_uv].uv = (1.0, vs0)
        f_r.loops[2][rain_uv].uv = (1.0, vs1)
        f_r.loops[3][rain_uv].uv = (0.0, vs1)
rain_bm.to_mesh(rain_me); rain_bm.free()
rain_ob = link(bpy.data.objects.new("rain_3d", rain_me)); rain_ob.data.materials.append(RAIN_3D)
rain_ob.visible_shadow = False; rain_ob.visible_diffuse = False

def update_3d_rain(phase_norm=0.0):
    nv_r = len(RAIN_DROPS) * 10
    co_r = np.empty((nv_r, 3), dtype=np.float32)
    wx_d, wy_d, wz_d = WIND_DIR.x, WIND_DIR.y, WIND_DIR.z
    for i, (rx0, ry0, rz0, x_sp, z_hi, wd, ld, ph_d) in enumerate(RAIN_DROPS):
        u_t = (ph_d + phase_norm) % 1.0
        zc = z_hi - u_t * (z_hi - 0.1)
        dz_moved = rz0 - zc
        xc = ((rx0 + x_sp + (u_t * (z_hi - 0.1)) * 0.18) % (2.0 * x_sp)) - x_sp
        yc = ry0
        base = i * 10
        for k_s, v_s in enumerate(VS_RIBBON):
            w_taper = wd * math.sin(max(0.05, min(0.95, v_s)) * math.pi)
            off = (v_s - 0.5) * ld
            px = xc + wx_d * off
            py = yc + wy_d * off
            pz = zc + wz_d * off
            co_r[base + k_s * 2] = (px - w_taper * 0.5, py, pz)
            co_r[base + k_s * 2 + 1] = (px + w_taper * 0.5, py, pz)
    rain_me.vertices.foreach_set("co", co_r.ravel())
    rain_me.update()

# 3D Wind-Blown Autumn Leaves tumbling across the courtyard in 3D space:
FLY_LEAVES_META = []
rng_fly = random.Random(1892)
fly_me = bpy.data.meshes.new("flying_leaves_3d"); fly_bm = bmesh.new()
fly_cl = fly_bm.loops.layers.color.new("leaf")
for _ in range(28):
    sz_f = rng_fly.uniform(0.055, 0.105)
    lobes_f = rng_fly.choice((0, 3, 5))
    local_ring = []
    for k in range(12):
        t = k / 12 * math.tau
        r = sz_f * (0.55 + 0.45 * math.cos(t) ** 2) * (1 + (0.18 * math.cos(lobes_f * t) if lobes_f else 0))
        lx, ly = math.cos(t) * r, math.sin(t) * r * 0.62
        lz = 0.012 * (lx / sz_f) ** 2 - 0.006 * (ly / sz_f)
        local_ring.append(Vector((lx, ly, lz)))
    vs_f = [fly_bm.verts.new(p) for p in local_ring]
    fc_f = fly_bm.faces.new(vs_f)
    c_f = rng_fly.choice(AUTUMN); k_f = rng_fly.uniform(0.65, 1.0)
    for loop in fc_f.loops: loop[fly_cl] = (c_f[0] * k_f, c_f[1] * k_f, c_f[2] * k_f, 1)
    FLY_LEAVES_META.append((
        local_ring,
        rng_fly.uniform(8.2, 18.5),   # y0
        rng_fly.uniform(1.8, 6.8),    # z0
        rng_fly.uniform(0.6, 1.6),    # z_drop
        rng_fly.random(),             # u0
        rng_fly.uniform(0, math.tau), # rot_phase
    ))
fly_bm.to_mesh(fly_me); fly_bm.free()
fly_ob = link(bpy.data.objects.new("flying_leaves_3d", fly_me)); fly_ob.data.materials.append(LEAF)

def update_3d_wind_leaves(phase_norm=0.0):
    phase = phase_norm * math.tau
    co_f = np.empty((len(FLY_LEAVES_META) * 12, 3), dtype=np.float32)
    for i, (local_ring, y0, z0, z_drop, u0, r_ph) in enumerate(FLY_LEAVES_META):
        u = (u0 + phase_norm) % 1.0
        xc = -10.5 + u * 21.0
        yc = y0 + 0.65 * math.sin(u * math.tau + r_ph)
        zc = max(0.25, z0 - u * z_drop + 0.38 * math.sin(2.0 * u * math.tau + r_ph))
        rot_m = Euler((phase + r_ph + u * math.tau, 2.0 * phase + r_ph * 0.7, u * math.tau + r_ph), "XYZ").to_matrix()
        center = Vector((xc, yc, zc))
        base = i * 12
        for k, lp in enumerate(local_ring):
            wp = center + rot_m @ lp
            co_f[base + k] = (wp.x, wp.y, wp.z)
    fly_me.vertices.foreach_set("co", co_f.ravel())
    fly_me.update()

def set_storm_phase(phase_norm=0.0, active=True):
    if active:
        update_drive_ripples(phase_norm)
        update_3d_tree_wind(phase_norm)
        update_3d_rain(phase_norm)
        update_3d_wind_leaves(phase_norm)
        rain_ob.hide_render = False
        fly_ob.hide_render = False
    else:
        px_ = np.zeros((RIPPLE_H, RIPPLE_W, 4), np.float32)
        px_[..., 0] = 0.5
        px_[..., 3] = 1.0
        new_im = bpy.data.images.new("drive_ripples_clean", RIPPLE_W, RIPPLE_H, alpha=False, float_buffer=True)
        new_im.colorspace_settings.name = "Non-Color"
        new_im.pixels.foreach_set(px_.ravel())
        new_im.update()
        rim_node = DRIVE.node_tree.nodes.get("drive_ripples")
        if rim_node: rim_node.image = new_im
        rain_ob.hide_render = True
        fly_ob.hide_render = True

set_storm_phase(float(arg("--phase", "0.0")), active=int(arg("--frames", "0")) > 0 or "--bake-weather" in ARGS)

# ── light: a storm sky made night, a moon behind cloud ────────────────────
world = bpy.data.worlds.new("night"); scene.world = world; world.use_nodes = True
wn = world.node_tree.nodes; WL = world.node_tree.links.new
env = wn.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(f"{ASSETS}/hdri/approaching_storm.hdr")
tc = wn.new("ShaderNodeTexCoord"); mp = wn.new("ShaderNodeMapping"); mp.inputs["Rotation"].default_value = (0, 0, math.radians(float(arg("--sky", "200"))))
WL(tc.outputs["Generated"], mp.inputs["Vector"]); WL(mp.outputs["Vector"], env.inputs["Vector"])
night = wn.new("ShaderNodeHueSaturation"); night.inputs["Saturation"].default_value = 0.4; night.inputs["Value"].default_value = 1.0
WL(env.outputs["Color"], night.inputs["Color"])
tint = wn.new("ShaderNodeMix"); tint.data_type = "RGBA"; tint.blend_type = "MULTIPLY"; tint.inputs["Factor"].default_value = 1; tint.inputs[7].default_value = (0.28, 0.4, 0.85, 1)
WL(night.outputs["Color"], tint.inputs[6])
seen = wn.new("ShaderNodeBackground"); seen.inputs["Strength"].default_value = float(arg("--skyseen", "0.016"))
lit_ = wn.new("ShaderNodeBackground"); lit_.inputs["Strength"].default_value = float(arg("--skylit", "0.03"))
WL(tint.outputs[2], seen.inputs["Color"]); WL(tint.outputs[2], lit_.inputs["Color"])
lp = wn.new("ShaderNodeLightPath"); mix = wn.new("ShaderNodeMixShader")
WL(lp.outputs["Is Camera Ray"], mix.inputs["Fac"]); WL(lit_.outputs["Background"], mix.inputs[1]); WL(seen.outputs["Background"], mix.inputs[2])
WL(mix.outputs["Shader"], wn["World Output"].inputs["Surface"])
# Primary moon aligned with the visible moon in the upper-left sky + right rim moon:
lamp("moon_left", "SUN", (-52, 14, 32), aim=(0, 28, 4), energy=float(arg("--moonleft", "0.85")), colour=(0.64, 0.74, 0.98), angle=math.radians(3.5))
lamp("moon", "SUN", (60, 12, 30), aim=(0, 30, 4), energy=float(arg("--moon", "0.55")), colour=(0.6, 0.7, 1.0), angle=math.radians(3))
lamp("sky glow", "SUN", (-30, -60, 70), aim=(0, 30, 4), energy=float(arg("--front", "0.032")), colour=(0.52, 0.62, 0.86), angle=math.radians(40))

# the mist: hugging the wet courtyard low down, thinning rapidly upward so the façade is crisp
me = bpy.data.meshes.new("mist"); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
for v in bm.verts: v.co = Vector((v.co.x * 160, 2 + (v.co.y + 0.5) * 140, (v.co.z + 0.5) * 40 - 0.5))
bm.to_mesh(me); bm.free()
mist = link(bpy.data.objects.new("mist", me))
mm = bpy.data.materials.new("mist"); mm.use_nodes = True
mn = mm.node_tree.nodes; ML = mm.node_tree.links.new
mn.remove(mn["Principled BSDF"])
vol = mn.new("ShaderNodeVolumePrincipled"); vol.inputs["Color"].default_value = (0.7, 0.76, 0.86, 1); vol.inputs["Anisotropy"].default_value = 0.55
geo = mn.new("ShaderNodeNewGeometry"); sep = mn.new("ShaderNodeSeparateXYZ"); ML(geo.outputs["Position"], sep.inputs["Vector"])
fall = mn.new("ShaderNodeMath"); fall.operation = "MULTIPLY"; fall.inputs[1].default_value = -1 / 2.5; ML(sep.outputs["Z"], fall.inputs[0])
ex = mn.new("ShaderNodeMath"); ex.operation = "EXPONENT"; ML(fall.outputs["Value"], ex.inputs[0])
dens = mn.new("ShaderNodeMath"); dens.operation = "MULTIPLY_ADD"; dens.inputs[1].default_value = float(arg("--mist", "0.016")); dens.inputs[2].default_value = 0.0004
ML(ex.outputs["Value"], dens.inputs[0]); ML(dens.outputs["Value"], vol.inputs["Density"])
ML(vol.outputs["Volume"], mn["Material Output"].inputs["Volume"])
mist.data.materials.append(mm)

# every glass lets light through it (its lamp out of its lantern, the rooms out of their windows)
for mat in bpy.data.materials:
    if not mat.use_nodes or mat.get("clear"): continue
    nt = mat.node_tree; b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if not b or (b.inputs["Transmission Weight"].default_value < 0.5 and "glass" not in mat.name.lower()): continue
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    if not out.inputs["Surface"].is_linked: continue
    src = out.inputs["Surface"].links[0].from_socket
    l2 = nt.nodes.new("ShaderNodeLightPath"); tr = nt.nodes.new("ShaderNodeBsdfTransparent"); mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(l2.outputs["Is Shadow Ray"], mx.inputs["Fac"]); nt.links.new(src, mx.inputs[1]); nt.links.new(tr.outputs["BSDF"], mx.inputs[2])
    nt.links.new(mx.outputs["Shader"], out.inputs["Surface"]); mat["clear"] = True
for mat in bpy.data.materials:
    if "Lantern_01_glass" in mat.name and mat.use_nodes:
        b = mat.node_tree.nodes.get("Principled BSDF")
        if b: b.inputs["Emission Color"].default_value = (1, 0.6, 0.28, 1); b.inputs["Emission Strength"].default_value = 6

# ── where things fall in the picture, for the game ─────────────────────────
if DATA:
    size = (WIDTH, HEIGHT)
    pic = lambda co: to_picture(scene, cam, co, size)
    door = [pic((x, DOOR_Y, z)) for x, z in ((-DW / 2, 0.9), (DW / 2, 0.9), (DW / 2, DSP + DW / 2), (-DW / 2, DSP + DW / 2))]
    rx = lambda at, w: abs(pic((at[0] + w / 2, at[1], at[2]))[0] - pic(at)[0])
    rz = lambda at, h: abs(pic((at[0], at[1], at[2] + h / 2))[1] - pic(at)[1])
    data = {
        "size": size,
        "door": door,
        "lantern": {"at": pic(LANTERN), "rx": rx(LANTERN, 0.9), "ry": rz(LANTERN, 1.4)},
        "windows": [{"at": pic(at), "rx": rx(at, w), "ry": rz(at, h)} for at, (w, h) in LITS],
        "ground": [pic((x, y, 0)) for x, y in [(-4.0, 10.6), (4.0, 10.6), (4.6, 18), (12.5, 23), (12.5, CF - 1.9), (2.6, CF - 1.9), (2.6, CF), (-2.6, CF), (-2.6, CF - 1.9), (-12.5, CF - 1.9), (-12.5, 23), (-4.6, 18)]],
        "horizon": pic((0, CF, 0))[1],
    }
    with open(DATA, "w") as f: json.dump(data, f, indent=1)
    print("DATA", DATA)

cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "0.65")))
scene.cycles.volume_bounces = 1
scene.cycles.volume_step_rate = 4.0

FRAMES = int(arg("--frames", "0"))
ANIM_DIR = arg("--anim-dir", "")
WIND_OUT = arg("--wind-out", "")
if FRAMES > 0 and ANIM_DIR:
    import shutil
    os.makedirs(ANIM_DIR, exist_ok=True)
    for f_idx in range(FRAMES):
        f_out = os.path.join(ANIM_DIR, f"frame_{f_idx:02d}.png")
        if f_idx == 0 and OUT and os.path.exists(OUT):
            shutil.copyfile(OUT, f_out)
            print("REUSED FRAME 0", f_out, flush=True)
            continue
        set_storm_phase(f_idx / FRAMES)
        render(scene, f_out, BLEND if f_idx == 0 else "")
        if f_idx == 0 and OUT:
            os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
            shutil.copyfile(f_out, OUT)
else:
    render(scene, OUT, BLEND)

if WIND_OUT:
    from pathlib import Path
    w_out = Path(WIND_OUT)
    w_out.mkdir(parents=True, exist_ok=True)
    set_storm_phase(0.0)
    roots = [old, old_right]
    groups = [[o for o in meshes_of(r) if o.type == "MESH"] for r in roots]
    foreground = {o for group in groups for o in group}
    settings = {
        "source": "Blender / Cycles, art/blender/manor.py",
        "size": [scene.render.resolution_x, scene.render.resolution_y],
        "trees": [[o.name for o in group] for group in groups],
        "swayPixels": 11.5,
        "frames": FRAMES,
        "noAiGeneration": True,
    }
    (w_out / "wind.json").write_text(json.dumps(settings, indent=2), encoding="utf-8")
    for obj in foreground: obj.visible_camera = False
    rain_ob.hide_render = True; fly_ob.hide_render = True
    scene.render.filepath = str(w_out / "clean.png")
    print("MANOR_WIND_CLEAN", flush=True)
    bpy.ops.render.render(write_still=True)
    for obj in foreground: obj.visible_camera = True

    def matte_material(original, colour):
        mat = original.copy() if original else bpy.data.materials.new("wind matte")
        mat.use_nodes = True
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        shader = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
        alpha = shader.inputs["Alpha"] if shader else None
        source = alpha.links[0].from_socket if alpha and alpha.is_linked else None
        value = alpha.default_value if alpha else 1
        emission = nodes.new("ShaderNodeEmission")
        emission.inputs["Color"].default_value = (*colour, 1)
        emission.inputs["Strength"].default_value = 1
        out = next((n for n in nodes if n.type == "OUTPUT_MATERIAL"), None) or nodes.new("ShaderNodeOutputMaterial")
        if source or value < 1:
            transparent = nodes.new("ShaderNodeBsdfTransparent")
            mix = nodes.new("ShaderNodeMixShader")
            mix.inputs[0].default_value = value
            if source: links.new(source, mix.inputs[0])
            links.new(transparent.outputs[0], mix.inputs[1])
            links.new(emission.outputs[0], mix.inputs[2])
            links.new(mix.outputs[0], out.inputs["Surface"])
        else:
            links.new(emission.outputs[0], out.inputs["Surface"])
        if out.inputs["Volume"].is_linked:
            for link_ in list(out.inputs["Volume"].links): links.remove(link_)
        return mat

    mask_cache = {}
    for obj in scene.objects:
        if obj.type not in {"MESH", "FONT", "CURVE", "SURFACE", "META"}: continue
        if obj.name in {"mist", "rain_3d", "flying_leaves_3d"}:
            obj.hide_render = True
            continue
        group = next((i for i, objects in enumerate(groups) if obj in objects), -1)
        colour = (1, 0, 0) if group == 0 else ((0, 1, 0) if group == 1 else (0, 0, 0))
        for slot in obj.material_slots:
            original = slot.material
            key = (original.name if original else "", group)
            if key not in mask_cache:
                mask_cache[key] = matte_material(original, colour)
            slot.link = "OBJECT"
            slot.material = mask_cache[key]
    w_black = bpy.data.worlds.new("wind matte black world")
    w_black.use_nodes = True
    w_black.node_tree.nodes.get("Background").inputs["Color"].default_value = (0, 0, 0, 1)
    scene.world = w_black
    scene.use_nodes = False
    scene.view_settings.view_transform = "Raw"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    scene.render.dither_intensity = 0
    scene.cycles.samples = 48
    scene.cycles.use_denoising = False
    scene.cycles.max_bounces = 2
    scene.cycles.transparent_max_bounces = 16
    scene.render.image_settings.color_mode = "RGB"
    scene.render.filepath = str(w_out / "trees-mask.png")
    print("MANOR_WIND_MASK", flush=True)
    bpy.ops.render.render(write_still=True)
    print("MANOR_WIND_DONE", str(w_out), flush=True)
