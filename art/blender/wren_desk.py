# Inspector Wren's desk, the night the letter comes: the picture the game
# opens on out of the opening film (src/ui/prologue.js, introVideo.js). It is
# made to stand in for the old generated picture — the same camera, the same
# things where they lay — because the film's last shot hands over to it by a
# dissolve, and because the game keeps things alive on it at the picture's
# own pixels (1672 x 941): the letter, the file and the plate that are
# clicked, the panes the rain runs down.
#
#   blender -b -P wren_desk.py -- [--preview] [--out path.png] [--samples n]

import bpy, bmesh, math, os, random, sys
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from kit import _multiply
from desk_kit import wire

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
PW, PH = 1672, 941                     # the reference picture's pixel grid
PREVIEW = "--preview" in ARGS
SCALE = float(arg("--scale", "0.5" if PREVIEW else "1.0"))
OUT = os.path.abspath(arg("--out", os.path.join(ROOT, ".artifacts/wren-desk/wren-desk.png")))
TEX_DIR = os.path.join(ROOT, ".artifacts/wren-desk/tex")
os.makedirs(TEX_DIR, exist_ok=True)
random.seed(7)
T0 = __import__("time").time()

DZ = 0.76                              # the desk's top
EYE = (0.0, 0.0, DZ + 0.40)
LENS, PITCH, SHIFT = 27.0, -9.0, -0.115
WALL = 1.95                            # the window wall, this far ahead of the eye

scene = fresh()
cd = bpy.data.cameras.new("eye"); cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36; cd.lens = LENS
cd.shift_y = SHIFT; cd.clip_start = 0.02; cd.clip_end = 120
cam = link(bpy.data.objects.new("eye", cd)); cam.location = EYE
cam.rotation_euler = (math.radians(90 + PITCH), 0, 0)
scene.camera = cam
scene.render.resolution_x, scene.render.resolution_y = round(PW * SCALE), round(PH * SCALE)
bpy.context.view_layer.update()

# ── where a pixel of the reference picture is, in the room ──────────────────
def ray(px, py):
    frame = [cam.matrix_world @ v for v in cam.data.view_frame(scene=scene)]  # TR, BR, BL, TL
    u, v = px / PW, py / PH
    top = frame[3].lerp(frame[0], u); bottom = frame[2].lerp(frame[1], u)
    o = cam.matrix_world.translation
    return o, (top.lerp(bottom, v) - o).normalized()
def on_z(px, py, z):
    o, d = ray(px, py); t = (z - o.z) / d.z; return o + d * t
def on_y(px, py, y):
    o, d = ray(px, py); t = (y - o.y) / d.y; return o + d * t
def pixel(p):
    from bpy_extras.object_utils import world_to_camera_view
    v = world_to_camera_view(scene, cam, Vector(p)); return (round(v.x * PW, 1), round((1 - v.y) * PH, 1))

# ── custom procedural textures saved for the case file & photos ────────────
def save_rgba(name, arr):
    path = os.path.join(TEX_DIR, name)
    h, w, _ = arr.shape
    im = bpy.data.images.new(name, width=w, height=h, alpha=True)
    im.pixels = np.flipud(arr).ravel().tolist()
    im.filepath_raw = path; im.file_format = "PNG"; im.save()
    return path

def build_custom_textures():
    # 1. B&W portrait photograph sticking out of the top pocket of the folder
    w, h = 512, 360
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = x / w, y / h
    rng = np.random.default_rng(42)
    grain = rng.normal(0, 0.018, (h, w)).astype(np.float32)

    lum = 0.16 + 0.05 * np.sin(u * 3.1) * np.cos(v * 2.7) + grain
    hx = (u - 0.42) / 0.30; hy = (v - 0.50) / 0.40
    hair_r = np.sqrt(hx * hx + hy * hy) + 0.04 * np.sin(np.arctan2(hy, hx) * 6.0)
    lum = np.where(hair_r < 1.0, 0.025 + 0.015 * np.sin(u * 35 + v * 15), lum)

    fx = (u - 0.48) * math.cos(0.18) + (v - 0.53) * math.sin(0.18)
    fy = -(u - 0.48) * math.sin(0.18) + (v - 0.53) * math.cos(0.18)
    face_d = np.sqrt((fx / 0.165) ** 2 + (fy / 0.215) ** 2)
    face_shade = np.clip(0.88 - 0.26 * (face_d ** 1.8) - 0.08 * fx / 0.165, 0.12, 0.90)
    lum = np.where(face_d < 1.0, face_shade, lum)

    fore_hair = (fx < -0.105 + 0.025 * np.cos(fy * 12.0)) & (face_d < 1.02)
    lum = np.where(fore_hair, 0.03, lum)

    for ey_off in (-0.070, 0.068):
        ed = np.sqrt(((fx + 0.012) / 0.028) ** 2 + ((fy - ey_off) / 0.044) ** 2)
        lum = np.where(ed < 1.0, 0.06 + 0.10 * ed, lum)
        pd = np.sqrt(((fx + 0.015) / 0.016) ** 2 + ((fy - ey_off) / 0.022) ** 2)
        lum = np.where(pd < 1.0, 0.015, lum)
        bd = np.sqrt(((fx + 0.048) / 0.014) ** 2 + ((fy - ey_off) / 0.052) ** 2)
        lum = np.where(bd < 1.0, 0.03, lum)

    nd = np.sqrt(((fx - 0.038) / 0.042) ** 2 + ((fy + 0.004) / 0.022) ** 2)
    lum = np.where(nd < 1.0, lum - 0.20 * (1 - nd), lum)
    ld = np.sqrt(((fx - 0.095) / 0.022) ** 2 + ((fy + 0.002) / 0.046) ** 2)
    lum = np.where(ld < 1.0, 0.10 + 0.08 * ld, lum)

    cd_ = np.sqrt(((u - 0.68) / 0.085) ** 2 + ((v - 0.56) / 0.15) ** 2)
    lum = np.where(cd_ < 1.0, 0.68 * (1 - cd_ * 0.5), lum)

    border = (u < 0.075) | (u > 0.925) | (v < 0.095) | (v > 0.905)
    lum = np.where(border, 0.88 - 0.04 * ((u - 0.5) ** 2 + (v - 0.5) ** 2) + grain * 0.4, lum)
    lum = np.clip(lum, 0.015, 0.95)
    arr = np.stack([lum * 0.96, lum * 0.94, lum * 0.88, np.ones_like(lum)], axis=-1)
    p_portrait = save_rgba("portrait_bw.png", arr)

    # 2. Annotated case notes sheet ("Fig. 14" & cursive lines at bottom-left)
    w, h = 512, 512
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = x / w, y / h
    base = 0.85 - 0.08 * ((u - 0.5) ** 2 + (v - 0.5) ** 2) + rng.normal(0, 0.015, (h, w)).astype(np.float32)
    ink_mask = np.zeros((h, w), dtype=np.float32)
    for row_v in (0.72, 0.76, 0.80, 0.84, 0.88):
        wave = 0.004 * np.sin(u * 95.0 + row_v * 40.0) + 0.002 * np.cos(u * 210.0)
        line = (np.abs(v - (row_v + wave)) < 0.0032) & (u > 0.08) & (u < 0.42)
        gaps = np.sin(u * 140.0 + row_v * 80.0) > -0.35
        ink_mask = np.maximum(ink_mask, (line & gaps).astype(np.float32) * 0.68)
    ticks = (v > 0.91) & (v < 0.96) & (u > 0.08) & (u < 0.48) & (np.sin(u * 180.0) > 0.75)
    ink_mask = np.maximum(ink_mask, ticks.astype(np.float32) * 0.58)
    diag = (np.abs((u - 0.62) * 0.7 - (v - 0.35) * 0.5) < 0.0025) & (u > 0.45) & (u < 0.82)
    ink_mask = np.maximum(ink_mask, diag.astype(np.float32) * 0.45)
    lum = np.clip(base * (1.0 - ink_mask * 0.80), 0.08, 0.92)
    arr = np.stack([lum * 0.95, lum * 0.89, lum * 0.77, np.ones_like(lum)], axis=-1)
    p_notes = save_rgba("case_notes.png", arr)

    # 3. Recessed folder label texture
    w, h = 256, 128
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = x / w, y / h
    base = 0.76 - 0.14 * ((u - 0.5) ** 2 + (v - 0.5) ** 2) + rng.normal(0, 0.025, (h, w)).astype(np.float32)
    bdr = ((np.abs(u - 0.5) > 0.43) & (np.abs(u - 0.5) < 0.46) & (np.abs(v - 0.5) < 0.42)) | \
          ((np.abs(v - 0.5) > 0.38) & (np.abs(v - 0.5) < 0.42) & (np.abs(u - 0.5) < 0.46))
    txt1 = (np.abs(v - 0.42 + 0.01 * np.sin(u * 60)) < 0.03) & (u > 0.18) & (u < 0.82) & (np.sin(u * 110) > -0.2)
    txt2 = (np.abs(v - 0.62 + 0.01 * np.cos(u * 50)) < 0.025) & (u > 0.26) & (u < 0.72) & (np.sin(u * 95) > -0.1)
    lum = np.clip(base * (1.0 - 0.45 * bdr - 0.55 * (txt1 | txt2)), 0.12, 0.88)
    arr = np.stack([lum * 0.95, lum * 0.88, lum * 0.73, np.ones_like(lum)], axis=-1)
    p_label = save_rgba("folder_label.png", arr)

    # 4. Dark vintage B&W interior/manor photograph in right pocket (with crisp white border & architectural contrast)
    w, h = 384, 384
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = x / w, y / h
    lum = 0.08 + 0.34 * np.exp(-((u - 0.32) / 0.20) ** 2 - ((v - 0.36) / 0.24) ** 2)
    lum += 0.26 * np.exp(-((u - 0.64) / 0.18) ** 2 - ((v - 0.55) / 0.20) ** 2)
    # Architectural vertical columns / arches inside the vintage photo
    arch = ((np.abs(u - 0.35) < 0.04) | (np.abs(u - 0.52) < 0.035) | (np.abs(u - 0.68) < 0.04)) & (v > 0.25) & (v < 0.82)
    lum = np.where(arch, lum * 0.42, lum)
    lum += 0.04 * np.sin(u * 18.0 + v * 6.0) * np.cos(u * 9.0 - v * 14.0)
    lum += rng.normal(0, 0.018, (h, w)).astype(np.float32)
    bdr = (u < 0.065) | (u > 0.935) | (v < 0.065) | (v > 0.935)
    lum = np.where(bdr, 0.84 + rng.normal(0, 0.015, (h, w)).astype(np.float32), lum)
    lum = np.clip(lum, 0.02, 0.90)
    arr = np.stack([lum * 0.95, lum * 0.92, lum * 0.86, np.ones_like(lum)], axis=-1)
    p_photo = save_rgba("case_photo_bw.png", arr)

    return p_portrait, p_notes, p_label, p_photo

p_portrait, p_notes, p_label, p_photo = build_custom_textures()

# ── materials ──────────────────────────────────────────────────────────────
print("STAGE", round(__import__("time").time() - T0, 1), "materials")
desk_wood = pbr("desk wood", "dark_wood", size=0.35, tint=(0.22, 0.11, 0.055), bright=0.22, rough=(0.45, 0.78), bump=1.4, dirt=0.40, edges=0.22, grime=0.30, stains=0.35, spec=0.22)
leather_top = pbr("desk leather", "Leather037", size=0.36, tint=(0.15, 0.36, 0.22), sat=0.65, bright=0.44, rough=(0.56, 0.86), bump=1.35, grime=0.50, stains=0.42, spec=0.22)

# Supple, deeply creased antique oxblood/chestnut brown leather for the case file (no plastic clearcoat!)
folio_leather = pbr("folio leather", "Leather037", size=0.26, tint=(1.05, 0.30, 0.11), sat=1.0, bright=0.42, rough=(0.28, 0.52), bump=0.95, grime=0.50, stains=0.30, spec=0.30)
def enrich_folio_leather(m):
    nt = m.node_tree; N = nt.nodes; Lk = nt.links.new; b = N["Principled BSDF"]
    b.inputs["Specular Tint"].default_value = (1.0, 0.86, 0.72, 1.0)
    tc = N.new("ShaderNodeTexCoord")
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 6.2; nz.inputs["Detail"].default_value = 7; nz.inputs["Roughness"].default_value = 0.62
    Lk(tc.outputs["Object"], nz.inputs["Vector"])
    mix_v = N.new("ShaderNodeMix"); mix_v.data_type = "VECTOR"; mix_v.inputs["Factor"].default_value = 0.28
    Lk(tc.outputs["Object"], mix_v.inputs[4]); Lk(nz.outputs["Color"], mix_v.inputs[5])

    vor = N.new("ShaderNodeTexVoronoi"); vor.feature = "DISTANCE_TO_EDGE"; vor.inputs["Scale"].default_value = 5.5
    Lk(mix_v.outputs[1], vor.inputs["Vector"])
    cr = N.new("ShaderNodeMapRange")
    cr.inputs["From Min"].default_value = 0.0; cr.inputs["From Max"].default_value = 0.34
    cr.inputs["To Min"].default_value = 0.0; cr.inputs["To Max"].default_value = 1.0
    Lk(vor.outputs["Distance"], cr.inputs["Value"])

    vor2 = N.new("ShaderNodeTexVoronoi"); vor2.feature = "DISTANCE_TO_EDGE"; vor2.inputs["Scale"].default_value = 14.0
    Lk(mix_v.outputs[1], vor2.inputs["Vector"])
    cr2 = N.new("ShaderNodeMapRange")
    cr2.inputs["From Min"].default_value = 0.0; cr2.inputs["From Max"].default_value = 0.32
    cr2.inputs["To Min"].default_value = 0.35; cr2.inputs["To Max"].default_value = 1.0
    Lk(vor2.outputs["Distance"], cr2.inputs["Value"])

    comb = N.new("ShaderNodeMath"); comb.operation = "MULTIPLY"
    Lk(cr.outputs["Result"], comb.inputs[0]); Lk(cr2.outputs["Result"], comb.inputs[1])

    # Darken crease valleys into deep warm oxblood-mahogany in Base Color
    if b.inputs["Base Color"].is_linked:
        old_c = b.inputs["Base Color"].links[0].from_socket
        c_ramp = N.new("ShaderNodeMapRange"); c_ramp.inputs["From Min"].default_value = 0.0; c_ramp.inputs["From Max"].default_value = 0.58
        c_ramp.inputs["To Min"].default_value = 0.0; c_ramp.inputs["To Max"].default_value = 1.0
        Lk(comb.outputs["Value"], c_ramp.inputs["Value"])
        c_mix = N.new("ShaderNodeMix"); c_mix.data_type = "RGBA"
        c_mix.inputs[6].default_value = (0.22, 0.055, 0.018, 1.0)
        c_mix.inputs[7].default_value = (1.12, 0.92, 0.76, 1.0)
        Lk(c_ramp.outputs["Result"], c_mix.inputs["Factor"])
        Lk(_multiply(N, Lk, old_c, c_mix.outputs[2]), b.inputs["Base Color"])

    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.34; bp.inputs["Distance"].default_value = 0.0015
    Lk(comb.outputs["Value"], bp.inputs["Height"])
    if b.inputs["Normal"].is_linked:
        old_n = b.inputs["Normal"].links[0].from_socket
        Lk(old_n, bp.inputs["Normal"])
    Lk(bp.outputs["Normal"], b.inputs["Normal"])
enrich_folio_leather(folio_leather)

rail_wood = pbr("desk rail wood", "dark_wood", size=0.35, tint=(0.30, 0.13, 0.05), bright=0.22, rough=(0.62, 0.86), bump=1.0, dirt=0.18, edges=0.30, grime=0.10, spec=0.12)
box_leather = pbr("box leather", "dark_wood", size=0.35, tint=(0.32, 0.17, 0.085), bright=0.42, rough=(0.60, 0.88), bump=1.2, dirt=0.48, edges=0.30, grime=0.38)
wall_mat = pbr("wall", "plastered_wall_04", size=1.6, tint=(0.14, 0.14, 0.12), bright=0.42, rough=(0.75, 0.96), dirt=0.45, grime=0.35)
frame_wood = pbr("window wood", "dark_wood", size=0.65, tint=(0.20, 0.15, 0.11), bright=0.34, rough=(0.45, 0.76), dirt=0.38, edges=0.20, upright=True)
rose = pbr("plate wood", "rosewood_veneer1", size=0.25, tint=(0.46, 0.25, 0.16), bright=0.52, rough=(0.26, 0.48), edges=0.25)
brass = aged_metal("brass", (0.56, 0.36, 0.11), (0.16, 0.10, 0.048), rough=(0.30, 0.55), tarnish=0.50)
plate_brass = aged_metal("plate brass", (0.82, 0.62, 0.29), (0.24, 0.16, 0.075), rough=(0.40, 0.58), tarnish=0.20, scale=9)
enamel = aged_metal("shade bronze", (0.05, 0.04, 0.03), (0.016, 0.013, 0.010), rough=(0.20, 0.38), tarnish=0.68, scale=16)
shade_in = plain("shade inside", (0.95, 0.70, 0.38), rough=0.42, emit=(1.0, 0.70, 0.36), strength=1.6)
bulb = plain("bulb", (1, 0.95, 0.82), emit=(1.0, 0.80, 0.50), strength=65)
envelope_paper = pbr("envelope paper", "Paper003", size=0.28, tint=(0.90, 0.84, 0.73), bright=0.92, rough=(0.78, 0.94), bump=0.35)
cream = pbr("papers", "Paper001", size=0.28, tint=(0.64, 0.58, 0.48), rough=(0.76, 0.92), bump=0.35)
wax = plain("wax", (0.18, 0.022, 0.016), rough=0.30, spec=0.65)
black_lac = plain("pencil black", (0.012, 0.012, 0.012), rough=0.38)
wood_bare = plain("pencil wood", (0.55, 0.38, 0.22), rough=0.78)
graphite = plain("graphite", (0.04, 0.04, 0.04), rough=0.3, metal=0.65)
ink = plain("engraving", (0.012, 0.009, 0.006), rough=0.75)

def make_rainy_glass():
    m = bpy.data.materials.new("glass"); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; Lk = nt.links.new; b = N["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.94, 0.97, 1.0, 1)
    b.inputs["Transmission Weight"].default_value = 1.0
    b.inputs["IOR"].default_value = 1.03
    b.inputs["Specular IOR Level"].default_value = 0.06
    tc = N.new("ShaderNodeTexCoord")
    mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (32.0, 1.0, 2.4)
    Lk(tc.outputs["Object"], mp.inputs["Vector"])
    riv = N.new("ShaderNodeTexNoise"); riv.inputs["Scale"].default_value = 2.6; riv.inputs["Detail"].default_value = 6; riv.inputs["Distortion"].default_value = 0.65
    Lk(mp.outputs["Vector"], riv.inputs["Vector"])
    mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.35; mr.inputs["From Max"].default_value = 0.72
    mr.inputs["To Min"].default_value = 0.02; mr.inputs["To Max"].default_value = 0.11
    Lk(riv.outputs["Fac"], mr.inputs["Value"]); Lk(mr.outputs["Result"], b.inputs["Roughness"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.12; bp.inputs["Distance"].default_value = 0.001
    Lk(riv.outputs["Fac"], bp.inputs["Height"]); Lk(bp.outputs["Normal"], b.inputs["Normal"])
    return m
glass = make_rainy_glass()

def make_sparkling_water():
    m = bpy.data.materials.new("water"); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; Lk = nt.links.new; b = N["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.96, 0.98, 1.0, 1)
    b.inputs["Transmission Weight"].default_value = 0.96
    b.inputs["Roughness"].default_value = 0.015
    b.inputs["IOR"].default_value = 1.33
    b.inputs["Specular IOR Level"].default_value = 0.85
    # Delicate rim glints on a sparse subset of raindrops so they sparkle without obscuring the exterior view
    tc = N.new("ShaderNodeTexCoord")
    lw = N.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.72
    sep = N.new("ShaderNodeSeparateXYZ"); Lk(tc.outputs["Object"], sep.inputs["Vector"])
    warm_ramp = N.new("ShaderNodeMapRange"); warm_ramp.inputs["From Min"].default_value = 0.12; warm_ramp.inputs["From Max"].default_value = 0.42
    Lk(sep.outputs["X"], warm_ramp.inputs["Value"])
    col_mix = N.new("ShaderNodeMix"); col_mix.data_type = "RGBA"
    col_mix.inputs[6].default_value = (0.58, 0.75, 0.96, 1)
    col_mix.inputs[7].default_value = (1.0, 0.78, 0.46, 1)
    Lk(warm_ramp.outputs["Result"], col_mix.inputs["Factor"])
    Lk(col_mix.outputs[2], b.inputs["Emission Color"])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 115.0; nz.inputs["Detail"].default_value = 3
    Lk(tc.outputs["Object"], nz.inputs["Vector"])
    sp_mr = N.new("ShaderNodeMapRange"); sp_mr.inputs["From Min"].default_value = 0.48; sp_mr.inputs["From Max"].default_value = 0.82
    sp_mr.inputs["To Min"].default_value = 0.0; sp_mr.inputs["To Max"].default_value = 0.15
    Lk(nz.outputs["Fac"], sp_mr.inputs["Value"])
    rim_mul = N.new("ShaderNodeMath"); rim_mul.operation = "MULTIPLY"
    Lk(sp_mr.outputs["Result"], rim_mul.inputs[0]); Lk(lw.outputs["Facing"], rim_mul.inputs[1])
    Lk(rim_mul.outputs["Value"], b.inputs["Emission Strength"])
    return m
water = make_sparkling_water()

# ── the desk & worn front oak rail ──────────────────────────────────────────
print("STAGE", round(__import__("time").time() - T0, 1), "the desk")
back = on_z(836, 600, DZ).y              # where the desk's top ends
desk = box("desk", -2.0, 2.0, 0.15, back, DZ - 0.05, DZ, desk_wood); bevel(desk, 0.008, 3)

lf, lr = on_z(640, 848, DZ), on_z(1515, 848, DZ)
def make_front_rail():
    bm = bmesh.new(); nx, ny = 90, 20
    x0, x1 = -1.35, 1.35
    y0, y1 = 0.34, lf.y + 0.003
    vs = []
    for j in range(ny + 1):
        v = j / ny
        y = y0 + (y1 - y0) * v
        lip = 0.0028 * math.exp(-((v - 0.88) / 0.07) ** 2) - 0.0165 * ((1.0 - v) ** 1.9)
        row = []
        for i in range(nx + 1):
            u = i / nx; x = x0 + (x1 - x0) * u
            wear_z = 0.0005 * math.sin(u * 41.0 + v * 9.0) + 0.0003 * math.cos(u * 89.0)
            row.append(bm.verts.new((x, y, DZ + lip + wear_z)))
        vs.append(row)
    for j in range(ny):
        for i in range(nx):
            bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
    me = bpy.data.meshes.new("desk front rail"); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new("desk front rail", me)); me.materials.append(rail_wood)
    s = o.modifiers.new("t", "SOLIDIFY"); s.thickness = 0.006; s.offset = -1
make_front_rail()

inset = box("desk leather", -1.2, lr.x, lf.y, back - 0.04, DZ, DZ + 0.0012, leather_top); bevel(inset, 0.001, 2)
faint_tooling = pbr("faint tooling", "Leather037", size=0.25, tint=(0.070, 0.064, 0.045), sat=0.35, bright=0.36, rough=(0.68, 0.92), grime=0.65, stains=0.5)
for name, (x0, x1, y0, y1) in {
    "tooling front": (-1.2, lr.x - 0.018, lf.y + 0.015, lf.y + 0.0175),
    "tooling right": (lr.x - 0.0205, lr.x - 0.018, lf.y + 0.015, back - 0.06),
    "tooling right outer": (lr.x - 0.009, lr.x - 0.0065, lf.y + 0.008, back - 0.05)
}.items():
    box(name, x0, x1, y0, y1, DZ + 0.0011, DZ + 0.00135, faint_tooling)

# ── the wall and its window ───────────────────────────────────────────────
print("STAGE", round(__import__("time").time() - T0, 1), "the wall and its window")
pane_l, pane_r = on_y(738, 300, WALL), on_y(1429, 300, WALL)
sill_z = on_y(1100, 486, WALL).z
mull = {"left": (on_y(915, 300, WALL).x, on_y(939, 300, WALL).x), "right": (on_y(1158, 300, WALL).x, on_y(1183, 300, WALL).x)}
bar_z = (on_y(1050, 178, WALL).z, on_y(1050, 152, WALL).z)
top_z = sill_z + 2.2
fl, fr = on_y(724, 300, WALL).x, on_y(1445, 300, WALL).x

wall = box("wall", -3.5, 3.5, WALL, WALL + 0.06, 0.0, 3.2, wall_mat)
cut = box("cut", fl, fr, WALL - 0.1, WALL + 0.2, sill_z - 0.02, top_z, wall_mat); boolean_cut(wall, cut)

rev_l_x = on_y(545, 300, WALL - 0.12).x
box("reveal left panel", rev_l_x, fl + 0.01, WALL - 0.14, WALL + 0.02, sill_z - 0.04, top_z, frame_wood)
box("reveal left moulding", rev_l_x - 0.03, rev_l_x + 0.01, WALL - 0.16, WALL, DZ - 0.3, top_z, frame_wood)

for name, (x0, x1, z0, z1) in {"frame left": (fl, pane_l.x, sill_z - 0.02, top_z), "frame right": (pane_r.x, fr, sill_z - 0.02, top_z),
                               "mullion left": (*mull["left"], sill_z, top_z), "mullion right": (*mull["right"], sill_z, top_z),
                               "bar": (pane_l.x, pane_r.x, *bar_z)}.items():
    o = box(name, x0, x1, WALL + 0.0, WALL + 0.07, z0, z1, frame_wood); bevel(o, 0.004, 2)

ledge_front = on_z(1000, 545, sill_z).y
ledge = box("ledge", -0.9, 1.1, ledge_front, WALL + 0.02, sill_z - 0.045, sill_z, frame_wood); bevel(ledge, 0.006, 2)
box("under the ledge", -0.9, 1.1, ledge_front + 0.01, WALL, DZ - 0.3, sill_z - 0.045, wall_mat)
pane = box("glass", pane_l.x, pane_r.x, WALL + 0.034, WALL + 0.038, sill_z, top_z, glass)
pane.visible_shadow = False

# Dense raindrops & vertical water streaks on the outer face of the glass
def drops():
    seg, rings = 8, 5
    tv = [(0.0, 0.0, 1.0)] + [(math.sin(math.pi * j / rings) * math.cos(math.tau * i / seg), math.sin(math.pi * j / rings) * math.sin(math.tau * i / seg), math.cos(math.pi * j / rings)) for j in range(1, rings) for i in range(seg)] + [(0.0, 0.0, -1.0)]
    tf = [(0, 1 + (i + 1) % seg, 1 + i) for i in range(seg)]
    for j in range(rings - 2):
        for i in range(seg):
            a_, b_ = 1 + j * seg + i, 1 + j * seg + (i + 1) % seg
            tf.append((a_, b_, b_ + seg, a_ + seg))
    last = len(tv) - 1
    tf += [(last, 1 + (rings - 2) * seg + i, 1 + (rings - 2) * seg + (i + 1) % seg) for i in range(seg)]
    verts, faces = [], []
    y = WALL + 0.039
    for i in range(5400):
        x = random.uniform(pane_l.x, pane_r.x); z = random.uniform(sill_z, sill_z + 1.05)
        r = random.choice((0.0008, 0.0011, 0.0015, 0.0020, 0.0027, 0.0034)) * random.uniform(0.75, 1.25)
        run = 1.0 if random.random() > 0.085 else random.uniform(3.5, 12.0)
        base = len(verts)
        verts += [(x + vx * r, y + abs(vz) * r * 0.52, z + vy * r * run) for vx, vy, vz in tv]
        faces += [tuple(base + k for k in face) for face in tf]
    for rx_px in (775, 830, 882, 965, 1018, 1085, 1132, 1215, 1275, 1345, 1395):
        rx0 = on_y(rx_px, 250, WALL).x
        for k in range(32):
            z = sill_z + 0.02 + k * 0.030 + random.uniform(-0.006, 0.006)
            x = rx0 + 0.0025 * math.sin(k * 0.7 + rx_px)
            r = random.uniform(0.0010, 0.0022)
            run = random.uniform(1.8, 3.8)
            base = len(verts)
            verts += [(x + vx * r, y + abs(vz) * r * 0.50, z + vy * r * run) for vx, vy, vz in tv]
            faces += [tuple(base + m_ for m_ in face) for face in tf]
    me = bpy.data.meshes.new("rain"); me.from_pydata(verts, [], faces); me.update()
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new("rain", me)); me.materials.append(water); o.visible_shadow = False
drops()

# ── outside: stormy blue night sky, Gothic chimneys, trees, wet street & lamp ─
print("STAGE", round(__import__("time").time() - T0, 1), "outside")
LAMP_D = WALL + 6.2
head = on_y(1325, 252, LAMP_D)
GZ = head.z - 4.2
FAR = WALL + 21.0
CORNER = 2.6

road = pbr("wet road", "slate_driveway", size=1.4, tint=(0.24, 0.28, 0.36), bright=0.58, rough=(0.010, 0.065), bump=0.42, spec=0.80)
box("road", -30, 40, WALL + 0.3, WALL + 120, GZ - 0.05, GZ, road)
pave = pbr("pavement", "checkered_pavement_tiles", size=1.0, tint=(0.28, 0.31, 0.36), bright=0.52, rough=(0.02, 0.11), spec=0.68)
box("far pavement", -30, CORNER, FAR - 2.4, FAR, GZ, GZ + 0.14, pave)
box("near pavement", -30, 40, WALL + 0.3, WALL + 2.6, GZ, GZ + 0.14, pave)

stone = pbr("terrace stone", "old_sandstone_02", size=2.5, tint=(0.22, 0.26, 0.34), bright=0.46, sat=0.55, rough=(0.55, 0.88), streaks=0.35, grime=0.38, spec=0.15)
slate = pbr("roof slate", "roof_slates_02", size=1.5, tint=(0.16, 0.20, 0.26), bright=0.45, rough=(0.25, 0.55))
lit_window = plain("lit window", (0.22, 0.14, 0.05), emit=(1.0, 0.65, 0.28), strength=4.0)
dim_window = plain("dim window", (0.14, 0.10, 0.05), emit=(1.0, 0.58, 0.22), strength=1.4)
dark_window = plain("dark window", (0.012, 0.016, 0.024), rough=0.55, spec=0.10)

bldg_top = on_y(850, 148, FAR).z
box("terrace body", -18.0, on_y(1060, 300, FAR).x, FAR, FAR + 8.0, GZ, bldg_top, stone)
for cx_px, top_py, w_m in [(815, 78, 1.4), (972, 32, 0.85), (1038, 62, 0.72), (1095, 95, 0.95)]:
    cp = on_y(cx_px, top_py, FAR + 0.5)
    box(f"chimney {cx_px}", cp.x - w_m / 2, cp.x + w_m / 2, FAR + 0.2, FAR + 1.6, bldg_top - 0.5, cp.z, stone)
    cylinder(f"chimney pot {cx_px}", cp.x, FAR + 0.7, cp.z, cp.z + 0.45, 0.16, slate, verts=12)

for wx_px, wy_py, ww, wh, mat_w in [
    (952, 256, 0.20, 0.32, lit_window),
    (966, 355, 0.42, 0.90, dim_window),
    (1022, 345, 0.38, 0.80, dim_window),
    (835, 290, 0.68, 1.25, dark_window),
    (835, 390, 0.68, 1.10, dark_window),
]:
    wp = on_y(wx_px, wy_py, FAR - 0.05)
    box(f"ext win {wx_px}-{wy_py}", wp.x - ww / 2, wp.x + ww / 2, FAR - 0.06, FAR + 0.02, wp.z - wh / 2, wp.z + wh / 2, mat_w)

dist_p = on_y(1098, 382, FAR + 8.0)
sphere("distant street pinpoint", tuple(dist_p), 0.085, plain("dist bulb", (1, 0.80, 0.45), emit=(1.0, 0.70, 0.32), strength=28))
rd_x = on_y(1015, 440, FAR - 5.0).x
lamp("wet road warm reflection", "AREA", (rd_x, FAR - 5.5, GZ + 1.8), aim=(rd_x, FAR - 4.0, GZ), energy=2400, colour=(1.0, 0.62, 0.24), size=1.4)
# Cool slate-blue misty night light illuminating the Victorian facade & wet road
lamp("facade mist fill", "AREA", (rd_x - 2.0, WALL + 4.0, GZ + 6.0), aim=(rd_x - 1.5, FAR, GZ + 2.5), energy=1200, colour=(0.48, 0.66, 0.94), size=10.0)

bark_mat = plain("dark bark", (0.015, 0.018, 0.022), rough=0.85)
TREE_D = WALL + 4.5
branches = [
    [(1440, -10), (1365, 38), (1295, 72), (1225, 92)],
    [(1365, 38), (1330, 88), (1285, 128)],
    [(1420, 28), (1375, 75), (1340, 118)],
    [(1295, 72), (1255, 42), (1210, 18)],
    [(1435, 65), (1390, 105), (1355, 142)],
]
for idx, bpts in enumerate([]):   # (kept for reference; the old picture has no tree)
    pts3 = [tuple(on_y(px, py, TREE_D + idx * 0.08)) for px, py in bpts]
    wire(f"tree branch {idx}", pts3, 0.020 if idx == 0 else 0.012, bark_mat)

sky = bpy.data.worlds.new("night"); scene.world = sky; sky.use_nodes = True
bg = sky.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.07, 0.10, 0.15, 1); bg.inputs[1].default_value = 0.18

# Victorian street lamp in lower-right pane (px 1325, py 252)
iron = plain("iron", (0.018, 0.020, 0.024), rough=0.42, metal=0.65)
cylinder("lamp post", head.x, LAMP_D, GZ, head.z - 0.24, 0.050, iron, verts=16, r2=0.035)
cylinder("lamp collar", head.x, LAMP_D, head.z - 0.28, head.z - 0.22, 0.072, iron, verts=16)
lantern_glass = plain("lantern glass", (1.0, 0.84, 0.56), rough=0.28, transmission=0.65, emit=(1.0, 0.66, 0.30), strength=3.2)
cylinder("lantern", head.x, LAMP_D, head.z - 0.22, head.z + 0.17, 0.095, lantern_glass, verts=6, r2=0.145)
cylinder("lantern cap", head.x, LAMP_D, head.z + 0.17, head.z + 0.32, 0.165, iron, verts=6, r2=0.025)
cylinder("lantern finial", head.x, LAMP_D, head.z + 0.32, head.z + 0.42, 0.025, iron, verts=12, r2=0.005)
glow = lamp("street lamp", "POINT", tuple(head), energy=1250, colour=(1.0, 0.65, 0.30), size=0.16)
lantern = sphere("lantern glow", tuple(head), 0.058, plain("lantern core", (1, 0.84, 0.55), emit=(1.0, 0.68, 0.32), strength=7))
lantern.visible_shadow = False

lamp("sky on the terrace", "AREA", (1.5, FAR - 6.0, GZ + 15.0), aim=(0.0, FAR, GZ + 3.0), energy=1500, colour=(0.52, 0.68, 0.98), size=18)
lamp("moon", "SUN", (0, WALL + 5, 8), aim=(0.3, WALL - 1, 0), energy=1.3, colour=(0.58, 0.72, 1.0), angle=0.08)

# ── the lamp on the desk: articulated brass arm, top socket, bronze dome ────
print("STAGE", round(__import__("time").time() - T0, 1), "the lamp on the desk")
bg_book_at = on_z(45, 545, DZ)
dark_ledger = pbr("dark ledger", "Leather037", size=0.25, tint=(0.14, 0.10, 0.08), bright=0.35, rough=(0.65, 0.92), spec=0.08)
box("back lamp book 1", bg_book_at.x - 0.09, bg_book_at.x + 0.08, bg_book_at.y - 0.06, bg_book_at.y + 0.06, DZ, DZ + 0.015, dark_ledger)
box("back lamp book 2", bg_book_at.x - 0.085, bg_book_at.x + 0.075, bg_book_at.y - 0.055, bg_book_at.y + 0.055, DZ + 0.015, DZ + 0.028, dark_ledger)

lbox_c = on_z(24, 648, DZ)
lb_body = box("left wood box", lbox_c.x - 0.09, lbox_c.x + 0.065, lbox_c.y - 0.044, lbox_c.y + 0.044, DZ, DZ + 0.040, box_leather); bevel(lb_body, 0.0025, 2)
lb_lid = box("left wood box lid", lbox_c.x - 0.092, lbox_c.x + 0.068, lbox_c.y - 0.046, lbox_c.y + 0.046, DZ + 0.040, DZ + 0.054, box_leather); bevel(lb_lid, 0.003, 2)
box("left box lock", lbox_c.x + 0.02, lbox_c.x + 0.038, lbox_c.y - 0.047, lbox_c.y - 0.043, DZ + 0.026, DZ + 0.044, plate_brass)

base_at = on_z(62, 585, DZ)
lathe("lamp base", [
    (0.0, 0.0), (0.092, 0.0), (0.095, 0.004), (0.092, 0.010), (0.082, 0.015),
    (0.074, 0.022), (0.062, 0.028), (0.046, 0.036), (0.035, 0.046), (0.038, 0.052),
    (0.032, 0.060), (0.025, 0.075), (0.028, 0.082), (0.022, 0.095), (0.026, 0.102),
    (0.018, 0.112), (0.022, 0.118), (0.0, 0.122)
], brass, at=base_at, steps=96)

shade_c = on_y(248, 292, base_at.y + 0.02)
sr = (on_y(396, 290, shade_c.y) - on_y(98, 290, shade_c.y)).length / 2
shade_rot = Matrix.Rotation(math.radians(-16), 3, "Y") @ Matrix.Rotation(math.radians(-5), 3, "X")
dome_apex = shade_c + (shade_rot @ Vector((0, 0, sr * 0.68)))

arm_start = base_at + Vector((0.0, 0.0, 0.118))
elbow_pt = on_y(10, 228, base_at.y + 0.01)
arm_lower = [
    arm_start,
    arm_start.lerp(elbow_pt, 0.35) + Vector((-0.012, 0.0, -0.01)),
    arm_start.lerp(elbow_pt, 0.72) + Vector((-0.018, 0.0, -0.005)),
    elbow_pt
]
wire("lamp arm lower", [tuple(p) for p in arm_lower], 0.0068, brass)
sphere("lamp elbow joint", tuple(elbow_pt), 0.013, brass)
kn = cylinder("lamp elbow screw", 0, 0, -0.018, 0.018, 0.006, brass, verts=20)
kn.location = elbow_pt; kn.rotation_euler = (math.pi / 2, 0, 0)

arm_upper = [
    elbow_pt,
    on_y(48, 185, shade_c.y),
    on_y(125, 148, shade_c.y),
    dome_apex + Vector((-0.012, 0.0, 0.028)),
    dome_apex + Vector((0.0, 0.0, 0.014))
]
wire("lamp arm upper", [tuple(p) for p in arm_upper], 0.0065, brass)

cap_prof = [(0.0, -0.005), (0.022, -0.002), (0.024, 0.004), (0.018, 0.010), (0.019, 0.022), (0.014, 0.028), (0.016, 0.034), (0.0, 0.036)]
cap_o = lathe("shade top socket", cap_prof, brass, at=dome_apex, steps=48)
cap_o.rotation_euler = (math.radians(-5), math.radians(-16), 0)

prof = [(1.0, 0.0), (0.99, 0.03), (0.95, 0.15), (0.86, 0.32), (0.7, 0.48), (0.48, 0.6), (0.22, 0.67), (0.0, 0.69)]
shade = lathe("shade", [(sr * f, sr * h) for f, h in prof], enamel, at=shade_c, steps=96)
s = shade.modifiers.new("t", "SOLIDIFY"); s.thickness = 0.0028; s.offset = 1
inner = lathe("shade inside", [(sr * f * 0.99, sr * h - 0.0008) for f, h in prof], shade_in, at=shade_c, steps=96)
for n in inner.data.polygons: n.flip()
rim = cylinder("shade rim", 0, 0, -0.0025, 0.0045, sr * 1.012, brass, verts=96, open_ends=True); rim.location = shade_c
bulb_o = sphere("bulb", (0, 0, 0), 0.032, bulb, squash=(1.3, 1.3, 0.75))
for o in (shade, inner, rim, bulb_o):
    o.rotation_euler = (math.radians(-5), math.radians(-16), 0)
bulb_o.location = shade_c + (shade_rot @ Vector((0, 0, sr * 0.26)))
key = lamp("desk lamp", "SPOT", tuple(bulb_o.location - Vector((0, 0, 0.012))), aim=tuple(on_z(435, 675, DZ)), energy=26, colour=(1.0, 0.70, 0.40), size=0.040, spot=math.radians(96))
# Pinpoint specular highlight on the upper-middle curve of the bronze dome (px 250, py 235)
dome_glint_pt = on_y(252, 234, shade_c.y - sr * 0.55)
dome_glint = lamp("dome pinpoint glint", "POINT", tuple(dome_glint_pt + Vector((0.01, -0.11, 0.055))), energy=0.55, colour=(1.0, 0.85, 0.62), size=0.006)
dome_glint.visible_diffuse = False

# ── the framed picture on the top-left wall (px 18..268, py 0..105) ─────────
print("STAGE", round(__import__("time").time() - T0, 1), "wall picture")
pf_tl, pf_br = on_y(18, -10, WALL - 0.02), on_y(268, 104, WALL - 0.02)
pframe = box("wall frame", pf_tl.x, pf_br.x, WALL - 0.032, WALL - 0.01, pf_br.z, pf_tl.z, frame_wood); bevel(pframe, 0.003, 2)
pmat_c = box("wall frame mat", pf_tl.x + 0.025, pf_br.x - 0.025, WALL - 0.033, WALL - 0.028, pf_br.z + 0.024, pf_tl.z - 0.02,
             plain("dark mat", (0.058, 0.046, 0.034), rough=0.88))
part_c = box("wall frame art", pf_tl.x + 0.042, pf_br.x - 0.042, WALL - 0.034, WALL - 0.029, pf_br.z + 0.040, pf_tl.z - 0.035,
             plain("dark print", (0.014, 0.011, 0.008), rough=0.75))

# ── the file: supple, creased leather document wallet with upper portrait pocket ─
print("STAGE", round(__import__("time").time() - T0, 1), "the leather case file")
def corner(px, py, z=DZ): return on_z(px, py, z)
F = [corner(330, 546), corner(806, 603), corner(562, 812), corner(-150, 718)]   # far left, far right, near right, near left
def mixp(a, b, k): return a.lerp(b, k)
def at(u, v, h=0.0):
    return mixp(mixp(F[0], F[1], u), mixp(F[3], F[2], u), v) + Vector((0, 0, h))

def quad(name, pts, mat, thick=0.004, round_=0.003):
    uvs = [(0, 1), (1, 1), (1, 0), (0, 0)][:len(pts)]
    area = sum(a.x * b.y - b.x * a.y for a, b in zip(pts, pts[1:] + pts[:1]))
    if area < 0: pts, uvs = pts[::-1], uvs[::-1]
    bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    vs = [bm.verts.new(p) for p in pts]; f = bm.faces.new(vs)
    for lp, c in zip(f.loops, uvs): lp[uv].uv = c
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); me.materials.append(mat)
    if thick:
        m = o.modifiers.new("t", "SOLIDIFY"); m.thickness = thick; m.offset = 1
        bevel(o, min(round_, thick * 0.9), 3)
    return o

def leather_sheet(name, corners_4, nx, ny, thick, mat, displace_fn):
    TL, TR, BR, BL = corners_4
    bm = bmesh.new(); uv_lay = bm.loops.layers.uv.new()
    grid = []
    for j in range(ny + 1):
        v = j / ny
        row = []
        for i in range(nx + 1):
            u = i / nx
            p = mixp(mixp(TL, TR, u), mixp(BL, BR, u), v)
            dz = displace_fn(u, v)
            row.append(bm.verts.new((p.x, p.y, p.z + dz)))
        grid.append(row)
    for j in range(ny):
        for i in range(nx):
            f = bm.faces.new((grid[j][i], grid[j + 1][i], grid[j + 1][i + 1], grid[j][i + 1]))
            for lp, (uu, vv) in zip(f.loops, ((i / nx, 1 - j / ny), (i / nx, 1 - (j + 1) / ny), ((i + 1) / nx, 1 - (j + 1) / ny), ((i + 1) / nx, 1 - j / ny))):
                lp[uv_lay].uv = (uu, vv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new(name, me)); me.materials.append(mat)
    if thick:
        m = o.modifiers.new("t", "SOLIDIFY"); m.thickness = thick; m.offset = 1
        b = o.modifiers.new("b", "BEVEL"); b.width = min(0.0020, thick * 0.45); b.segments = 2; b.limit_method = "ANGLE"
    return o

B0 = 0.0012
BACK = 0.0052
def back_displace(u, v):
    edge_curl = 0.0014 * ((max(0.0, u - 0.85) / 0.15) ** 2 + (max(0.0, v - 0.88) / 0.12) ** 2)
    wave = 0.0005 * math.sin(u * 9.0 + v * 6.0)
    return B0 + edge_curl + wave

leather_sheet("file back", F, 48, 48, BACK, folio_leather, back_displace)

def rect(name, u0, u1, v0, v1, h, mat, thick=0.0004, turn=0.0, curl=0.0010):
    TL, TR, BR, BL = at(u0, v0, h), at(u1, v0, h), at(u1, v1, h), at(u0, v1, h)
    def paper_disp(u, v):
        return curl * ((u * (1 - u) * 1.3) + 0.3 * ((u - 0.5) ** 2 + (v - 0.5) ** 2))
    o = leather_sheet(name, [TL, TR, BR, BL], 16, 16, thick, mat, paper_disp)
    if turn:
        c = at((u0 + u1) / 2, (v0 + v1) / 2, h)
        o.data.transform(Matrix.Translation(-c)); o.data.transform(Matrix.Rotation(math.radians(turn), 4, "Z")); o.location = c
    return o

# Thick sheaf of papers inside the right pocket
for i, (u0, u1, v0, v1, turn) in enumerate([
    (0.36, 0.94, 0.30, 0.96, 0.6),
    (0.38, 0.95, 0.32, 0.95, -1.4),
    (0.40, 0.93, 0.30, 0.94, 1.8),
    (0.38, 0.96, 0.33, 0.93, -0.9),
]):
    rect(f"stack {i}", u0, u1, v0, v1, B0 + BACK + 0.0004 + i * 0.0009, cream, thick=0.0008, turn=turn, curl=0.0005)

P0 = B0 + BACK + 0.0042
notes_mat = paper("case notes", (0.86, 0.80, 0.68), foxing=0.12, image=p_notes)
photo_mat = paper("case photo", (0.88, 0.85, 0.78), foxing=0.04, image=p_photo)
portrait_mat = paper("portrait", (0.94, 0.91, 0.84), foxing=0.02, image=p_portrait)

rect("paper under", 0.52, 0.96, 0.24, 0.90, P0 + 0.0002, cream, thick=0.0005, turn=-3.5, curl=0.0012)
rect("paper notes", 0.50, 0.92, 0.26, 0.92, P0 + 0.0010, notes_mat, thick=0.0005, turn=2.5, curl=0.0015)
rect("case photo", 0.60, 0.87, 0.30, 0.74, P0 + 0.0020, photo_mat, thick=0.0006, turn=-4.0, curl=0.0012)

# Unbroken, continuous 72x72 leather cover (`file flap`) + diagonal inner pocket flap (reaching u=0.71 at bottom!)
FRONT = 0.0032
flap_corners = [at(0.0, 0.04, P0 + 0.0016), at(0.68, 0.12, P0 + 0.0038), at(0.71, 0.98, P0 + 0.0014), at(0.0, 1.0, P0 + 0.0005)]
def flap_displace(u, v):
    # 1. Supple cushion dome over the contents
    dome = 0.0028 * math.sin(u * math.pi * 0.92) * math.sin(v * math.pi * 0.94)
    # 2. Diagonal pocket seam groove at u_seam = 0.76 - 0.08 * v (separating main left cover from the diagonal inner pocket flap!)
    u_seam = 0.76 - 0.08 * v
    d_seam = u - u_seam
    seam_w = 1.0 if v > 0.34 else max(0.0, (v - 0.26) / 0.08)
    seam_groove = -0.0026 * math.exp(-((d_seam / 0.022) ** 2)) * seam_w
    # 3. Raised curved diagonal pocket flap to the right of the seam (u > u_seam)
    lip_arch = 0.0022 * math.sin(max(0.0, min(1.0, (u - u_seam) / (1.0 - u_seam + 1e-4))) * math.pi * 0.88) * seam_w if u > u_seam else 0.0
    # 4. Recessed rectangular label window on main left cover (u in 0.18..0.44, v in 0.34..0.46)
    in_label = (0.18 < u < 0.44) and (0.33 < v < 0.46)
    label_dip = -0.0011 if in_label else 0.0
    return dome + seam_groove + lip_arch + label_dip

flap = leather_sheet("file flap", flap_corners, 72, 72, FRONT, folio_leather, flap_displace)
# Stitched seam along the diagonal pocket groove on the leather flap
st_a = at(0.68 * (0.76 - 0.08 * 0.34), 0.34, P0 + FRONT + 0.0032)
st_b = at(0.71 * (0.76 - 0.08 * 0.96), 0.96, P0 + FRONT + 0.0022)

# Upper pocket: B&W portrait photograph sitting in the upper pocket slot (above TOP)
# with a thin leather pocket lip overlapping its top-left edge!
TOP = P0 + FRONT + 0.0020
rect("portrait back card", 0.34, 0.67, 0.05, 0.30, TOP + 0.0004, cream, thick=0.0005, turn=-5.5, curl=0.0008)
rect("portrait", 0.25, 0.65, 0.08, 0.34, TOP + 0.0012, portrait_mat, thick=0.0006, turn=2.0, curl=0.0010)
upper_lip = [at(0.18, 0.04, TOP + 0.0018), at(0.67, 0.10, TOP + 0.0026), at(0.66, 0.15, TOP + 0.0028), at(0.18, 0.09, TOP + 0.0022)]
leather_sheet("upper pocket lip", upper_lip, 20, 8, 0.0018, folio_leather, lambda u, v: 0.0006 * math.sin(u * math.pi))

# Recessed aged paper label on the left leather flap + round brass snap above it
lab0 = at(0.13, 0.36, TOP + 0.0003); lab1 = at(0.30, 0.38, TOP + 0.0009); lab3 = at(0.12, 0.45, TOP + 0.0001)
label_mat = paper("label", (0.76, 0.69, 0.56), foxing=0.15, image=p_label)
quad("label", [lab0, lab1, lab1 + (lab3 - lab0), lab3], label_mat, 0.0002, 0.0001)

snap = at(0.21, 0.26, TOP + 0.0018)
lathe("snap", [(0.0, 0.0), (0.004, 0.0), (0.009, 0.0005), (0.0095, 0.0022), (0.0065, 0.0026), (0.0038, 0.0010), (0.0, 0.0010)], brass, at=snap, steps=32)

thread = plain("thread", (0.18, 0.09, 0.05), rough=0.82)
def stitch(name, a, b, step=0.0065):
    n = max(2, int((b - a).length / step))
    d = (b - a).normalized()
    bm = bmesh.new()
    for i in range(n):
        p = a.lerp(b, (i + 0.25) / n)
        q = p + d * step * 0.52
        side = Vector((-d.y, d.x, 0)) * 0.00040
        for v in (p - side, q - side, q + side, p + side): bm.verts.new(v)
        bm.verts.ensure_lookup_table(); bm.faces.new(bm.verts[-4:])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); me.materials.append(thread)

bk = [at(u, v, B0 + BACK + 0.0008) for u, v in ((0.60, 0.02), (0.98, 0.02), (0.98, 0.98), (0.56, 0.98))]
stitch("back stitch far", bk[0], bk[1]); stitch("back stitch right", bk[1], bk[2]); stitch("back stitch near", bk[2], bk[3])
stitch("pocket seam stitch", st_a, st_b, step=0.0055)

# ── the letter & red wax seal (px 727..1150, py 704..809) ──────────────────
print("STAGE", round(__import__("time").time() - T0, 1), "the letter")
E = [on_z(802, 704, DZ), on_z(1138, 716, DZ), on_z(1150, 809, DZ), on_z(727, 792, DZ)]
def env_displace(u, v):
    return 0.0016 + 0.0014 * math.sin(u * math.pi) * math.sin(v * math.pi) + 0.0006 * ((u - 0.5) ** 2)
env = leather_sheet("envelope", E, 24, 24, 0.0011, envelope_paper, env_displace)

apex = mixp(mixp(E[3], E[2], 0.5), mixp(E[0], E[1], 0.5), 0.42)
quad("flap", [E[0] + Vector((0, 0, 0.0031)), E[1] + Vector((0, 0, 0.0031)), apex + Vector((0, 0, 0.0040)), apex + Vector((0, 0, 0.0040))], envelope_paper, 0.00035)
for c_pt in (E[2], E[3]):
    wire("env fold", [tuple(c_pt + Vector((0, 0, 0.0026))), tuple(apex + Vector((0, 0, 0.0034)))], 0.00035, ink)

seal_at = on_z(962, 750, DZ + 0.0042)
seal_prof = [
    (0.0, 0.0), (0.0185, 0.0), (0.0195, 0.0014), (0.0182, 0.0032),
    (0.0145, 0.0035), (0.0128, 0.0018), (0.0105, 0.0018), (0.0095, 0.0030),
    (0.0065, 0.0024), (0.0035, 0.0032), (0.0, 0.0028)
]
seal = lathe("seal", seal_prof, wax, at=seal_at, steps=64)
bm = bmesh.new(); bm.from_mesh(seal.data)
for v in bm.verts:
    r_ = math.hypot(v.co.x, v.co.y)
    if r_ > 0.013:
        a_ = math.atan2(v.co.y, v.co.x)
        k = 1.0 + 0.07 * math.sin(a_ * 5.0 + 0.4) + 0.045 * math.cos(a_ * 9.0) + 0.025 * math.sin(a_ * 15.0)
        v.co.x *= k; v.co.y *= k
bm.to_mesh(seal.data); bm.free()

# ── his name, on brass, on a block of wood (px 900..1174, py 558..672) ─────
print("STAGE", round(__import__("time").time() - T0, 1), "nameplate")
nl, nr = on_z(900, 668, DZ), on_z(1174, 672, DZ)
W_ = nr.x - nl.x
plinth = box("plate plinth", nl.x, nr.x, nl.y - 0.004, nl.y + 0.06, DZ, DZ + 0.013, rose); bevel(plinth, 0.0035, 3)
top = on_y(1040, 558, nl.y + 0.02).z
H_ = top - DZ - 0.013
board = box("plate board", -W_ / 2 + 0.006, W_ / 2 - 0.006, -0.011, 0.011, 0.0, H_, rose); bevel(board, 0.0035, 3)
board.location = ((nl.x + nr.x) / 2, nl.y + 0.03, DZ + 0.012); board.rotation_euler.x = math.radians(-10)
# (2026-11-14: the user could not read it in the game: a larger plate, bold letters ~40% larger, a brighter brass)
plate = box("plate", -W_ / 2 + 0.014, W_ / 2 - 0.014, -0.0125, -0.0105, 0.0, H_ - 0.020, plate_brass); bevel(plate, 0.0008, 2)
plate.parent = board; plate.location = (0, 0, 0.010)
font = bpy.data.fonts.load("C:/Windows/Fonts/timesbd.ttf")
# two lines, so the name can be large: INSPECTOR small over Arthur Wren
HP = H_ - 0.020
for line, (body, size, z, spacing) in enumerate((("INSPECTOR", HP * 0.25, HP * 0.76, 1.18), ("Arthur Wren", HP * 0.60, HP * 0.33, 1.0))):
    tc_ = bpy.data.curves.new(f"name {line}", "FONT"); tc_.body = body; tc_.font = font; tc_.space_character = spacing
    tc_.align_x = "CENTER"; tc_.align_y = "CENTER"; tc_.size = size; tc_.extrude = 0.00008
    txt = link(bpy.data.objects.new(f"name {line}", tc_)); txt.data.materials.append(ink)
    txt.parent = plate; txt.location = (0, -0.0126, z); txt.rotation_euler = (math.pi / 2, 0, 0)
for k, x in enumerate((-W_ / 2 + 0.022, W_ / 2 - 0.022)):
    pin = sphere(f"pin {k}", (0, 0, 0), 0.0018, plate_brass, squash=(1, 0.5, 1)); pin.parent = plate; pin.location = (x, -0.0125, (H_ - 0.020) / 2)

# ── the pencil (px 1192..1368, py 684..770) ────────────────────────────────
print("STAGE", round(__import__("time").time() - T0, 1), "the pencil")
pa, pb = on_z(1192, 684, DZ + 0.0045), on_z(1368, 770, DZ + 0.0045)
d_ = (pb - pa); L = d_.length
pen = cylinder("pencil", 0, 0, 0, L * 0.86, 0.0050, black_lac, verts=6)
tip = cylinder("pencil wood", 0, 0, -L * 0.075, 0.0, 0.0012, wood_bare, verts=12, r2=0.0042)
lead = cylinder("pencil lead", 0, 0, -L * 0.092, -L * 0.075, 0.0, graphite, verts=12, r2=0.0012)
fer = cylinder("ferrule", 0, 0, L * 0.86, L * 0.96, 0.0046, brass, verts=24)
end = cylinder("pencil end", 0, 0, L * 0.96, L * 1.0, 0.0044, black_lac, verts=24)
rot = Vector((0, 0, 1)).rotation_difference(d_.normalized())
for o in (pen, tip, lead, fer, end):
    o.rotation_mode = "QUATERNION"; o.rotation_quaternion = rot; o.location = pa

# ── to the right: inkwell, brass pen pot + 3 brushes, strapped chest, 2 books ─
print("STAGE", round(__import__("time").time() - T0, 1), "right side props")
pot = on_z(1470, 668, DZ)
pot_top = on_y(1470, 505, pot.y).z
pot_h = pot_top - DZ
pot_brass = aged_metal("pot brass", (0.52, 0.35, 0.13), (0.12, 0.08, 0.04), rough=(0.34, 0.60), tarnish=0.60)
lathe("pen pot", [
    (0.0, 0.0), (0.033, 0.0), (0.035, 0.003), (0.032, 0.008), (0.027, 0.013),
    (0.025, 0.018), (0.025, pot_h - 0.014), (0.027, pot_h - 0.008), (0.029, pot_h - 0.002),
    (0.029, pot_h), (0.024, pot_h), (0.024, 0.012), (0.0, 0.012)
], pot_brass, at=pot, steps=96)

brush_wood = pbr("brush wood", "dark_wood", size=0.15, tint=(0.48, 0.32, 0.20), bright=0.6, rough=(0.35, 0.65))
for k, (dx, dy, rx_, ry_, h) in enumerate([
    (-0.007, 0.002, -0.04, 0.06, 0.215),
    (0.006, 0.004, 0.05, 0.22, 0.205),
    (0.008, -0.006, -0.03, 0.28, 0.165),
]):
    b_o = lathe(f"pot brush {k}", [(0.0, 0.0), (0.0026, 0.0), (0.0032, h * 0.55), (0.0022, h * 0.86), (0.0005, h), (0.0, h)], brush_wood, at=pot + Vector((dx, dy, 0.02)), steps=16)
    b_o.rotation_euler = (rx_, ry_, 0)

well = on_z(1415, 640, DZ)
lathe("inkwell", [
    (0.0, 0.0), (0.034, 0.0), (0.036, 0.005), (0.033, 0.012), (0.026, 0.016),
    (0.012, 0.018), (0.013, 0.025), (0.009, 0.028), (0.0, 0.028)
], pot_brass, at=well, steps=64)

bx0, bx1 = on_z(1488, 690, DZ), on_z(1720, 690, DZ)
bx_top = on_y(1560, 572, bx0.y).z
bx_split = DZ + (bx_top - DZ) * 0.68
bbox_low = box("chest lower", bx0.x, bx1.x, bx0.y, bx0.y + 0.125, DZ, bx_split - 0.0015, box_leather); bevel(bbox_low, 0.004, 3)
bbox_lid = box("chest lid", bx0.x - 0.003, bx1.x + 0.003, bx0.y - 0.003, bx0.y + 0.128, bx_split, bx_top, box_leather); bevel(bbox_lid, 0.005, 3)
for cx_off in (0.028, 0.082):
    cx = bx0.x + cx_off
    h_up = box(f"clasp top {cx_off}", cx - 0.007, cx + 0.007, bx0.y - 0.005, bx0.y, bx_split - 0.018, bx_split + 0.010, brass); bevel(h_up, 0.001, 2)
    h_lo = box(f"clasp lock {cx_off}", cx - 0.009, cx + 0.009, bx0.y - 0.004, bx0.y, bx_split - 0.032, bx_split - 0.008, plate_brass); bevel(h_lo, 0.001, 2)
    sphere(f"clasp pin {cx_off}", (cx, bx0.y - 0.005, bx_split - 0.022), 0.0035, brass)

# Photoscanned antique books (`book_encyclopedia_set_01`) with darkened noir leather
def settle(root, at, rx=0.0, ry=0.0, rz=0.0, k=None):
    if k: root.scale = (k, k, k)
    root.rotation_euler = (rx, ry, rz); root.location = (0, 0, 0)
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in meshes_of(root) for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    root.location = Vector(at) - Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    bpy.context.view_layer.update()
    return hi.z - lo.z

BOOKS = "book_encyclopedia_set_01"
brought_books = []
def volume(n, at, rx=0.0, ry=0.0, rz=0.0, k=1.0):
    r = import_model(BOOKS, only=f"{BOOKS}_book{n:02d}")
    brought_books.append(r)
    return settle(r, at, rx, ry, rz, k=k)

# Two thick worn leather-bound books stacked in lower-right foreground (px 1502..1672, py 680..925)
bh1 = volume(13, on_z(1645, 855, DZ), 0, math.pi / 2, math.radians(-105), k=0.95)
volume(15, on_z(1660, 825, DZ + bh1), 0, math.pi / 2, math.radians(-96), k=0.88)

# ── on the window sill: left books, bronze finial urn, flat books, right leaning books ─
print("STAGE", round(__import__("time").time() - T0, 1), "window sill props")
sb = on_z(1160, 548, sill_z) + Vector((0, 0.05, 0))
sbh = volume(17, sb, 0, math.pi / 2, math.radians(4), k=1.05)
volume(18, sb + Vector((0.008, -0.005, sbh)), 0, math.pi / 2, math.radians(-6), k=0.95)

# Left sill upright books with dark leather spines facing the camera (rz=0, zero white stripes!) + wooden pilaster cap
ub = on_z(635, 535, sill_z) + Vector((0, 0.05, 0))
ub_h = 0.0
for idx_b, n in enumerate((3, 7)):
    ub_h = max(ub_h, volume(n, ub + Vector(((idx_b - 0.5) * 0.044, 0, 0)), 0, 0, math.radians(random.uniform(-3, 3)), k=1.08))
box("left sill pilaster cap", ub.x - 0.058, ub.x + 0.058, ub.y - 0.065, ub.y + 0.065, sill_z + ub_h, sill_z + ub_h + 0.014, frame_wood)

# Right sill leaning books with dark leather spines facing the camera (rz=0, leaning right ry=11 deg)
rb_at = on_z(1438, 545, sill_z) + Vector((0, 0.05, 0))
volume(9, rb_at, 0, math.radians(11), math.radians(-6), k=1.10)
volume(11, rb_at + Vector((0.050, 0.0, 0.0)), 0, math.radians(14), math.radians(-4), k=1.14)

bronze = aged_metal("bronze", (0.14, 0.11, 0.08), (0.025, 0.020, 0.016), rough=(0.35, 0.65), tarnish=0.8)
lathe("urn", [
    (0.0, 0.0), (0.042, 0.0), (0.044, 0.012), (0.032, 0.024), (0.022, 0.045),
    (0.045, 0.085), (0.050, 0.115), (0.042, 0.145), (0.022, 0.165), (0.028, 0.182),
    (0.014, 0.202), (0.020, 0.218), (0.008, 0.238), (0.002, 0.262), (0.0, 0.265)
], bronze, at=on_z(756, 530, sill_z) + Vector((0, 0.06, 0)), steps=64)

mote_mat = plain("dust mote", (1.0, 0.85, 0.65), rough=0.5, transmission=0.7, emit=(1.0, 0.78, 0.50), strength=1.5)
for idx, (mpx, mpy, md, mr) in enumerate([
    (272, 275, 1.35, 0.0012), (348, 395, 1.45, 0.0010), (485, 425, 1.50, 0.0009),
    (612, 342, 1.55, 0.0011), (1492, 424, 1.55, 0.0011),
]):
    o_, d_ray = ray(mpx, mpy)
    mp_ = o_ + d_ray * md
    m_o = sphere(f"mote {idx}", tuple(mp_), mr, mote_mat); m_o.visible_shadow = False

# Darken and mute the imported encyclopedia volumes (and crush bright page-edge highlights via Gamma=1.85)
imported_mats = {m.name for r in brought_books for o in meshes_of(r) for m in o.data.materials if m}
age_everything(keep={m.name for m in bpy.data.materials} - imported_mats, own={"folio leather"})
for mn in imported_mats:
    mat = bpy.data.materials[mn]
    for node in mat.node_tree.nodes:
        if node.type == "BSDF_PRINCIPLED":
            node.inputs["Specular IOR Level"].default_value = 0.08
            bc = node.inputs["Base Color"]
            if bc.is_linked:
                gm = mat.node_tree.nodes.new("ShaderNodeGamma")
                gm.inputs["Gamma"].default_value = 1.35
                dk = mat.node_tree.nodes.new("ShaderNodeHueSaturation")
                dk.inputs["Saturation"].default_value = 0.80
                dk.inputs["Value"].default_value = 0.55
                mat.node_tree.links.new(bc.links[0].from_socket, gm.inputs["Color"])
                mat.node_tree.links.new(gm.outputs["Color"], dk.inputs["Color"])
                mat.node_tree.links.new(dk.outputs["Color"], bc)

# ── room fill, warm wall bounce, cold window rim, DOF & Cycles render ───────
print("STAGE", round(__import__("time").time() - T0, 1), "lighting and render")
bounce = lamp("bounce", "AREA", (-0.42, 0.72, 1.35), aim=(-0.25, 0.85, DZ), energy=0.80, colour=(1.0, 0.74, 0.48), size=1.1)
bounce.visible_camera = False
walls_glow = lamp("walls glow", "AREA", (-0.42, 0.95, 2.15), aim=(-0.25, WALL, 1.25), energy=22, colour=(1.0, 0.72, 0.46), size=1.5)
walls_glow.visible_camera = False
fill = lamp("window fill", "AREA", ((pane_l.x + pane_r.x) / 2, WALL - 0.65, sill_z + 0.55), aim=(0.1, 0.35, DZ), energy=2.6, colour=(0.62, 0.76, 1.0), size=1.4)
fill.visible_camera = False
plate_rim = lamp("plate warm accent", "SPOT", (-0.18, 0.68, 1.08), aim=((nl.x + nr.x) / 2, nl.y, DZ + 0.03), energy=34.0, colour=(1.0, 0.76, 0.46), size=0.18, spot=math.radians(32))
plate_rim.visible_camera = False

cd.dof.use_dof = True
cd.dof.focus_distance = (on_z(950, 740, DZ) - cam.location).length
cd.dof.aperture_fstop = 7.5

samples = int(arg("--samples", "64" if PREVIEW else "512"))
cycles(scene, samples, scene.render.resolution_x, scene.render.resolution_y, exposure=float(arg("--exposure", "-0.35")))
scene.cycles.adaptive_threshold = 0.03 if PREVIEW else 0.008
scene.cycles.sample_clamp_indirect = 4.0
os.makedirs(os.path.dirname(OUT), exist_ok=True)
for name, p in {"envelope": E[0], "plate": nl, "shade": shade_c, "pot": pot}.items():
    print("CHECK", name, pixel(p), tuple(round(c, 3) for c in p))
render(scene, OUT, blend="" if PREVIEW else OUT.replace(".png", ".blend"))
