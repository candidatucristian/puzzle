# Photorealistic 3D Blender Cycles renders for "The Table of Cards"
# (Sequence puzzle in Room IV — The Counting Room):
#   1. study.png        (2304 x 1296 RGB)  -> public/assets/images/Sequence/study-background.webp
#   2. index-card.png   (960  x 640  RGBA) -> public/assets/images/Sequence/index-card.webp
#   3. note-card.png    (960  x 640  RGBA) -> public/assets/images/Sequence/sticky-note-cutout.webp
#                                          -> public/assets/images/Sequence/sticky-note.webp
#   4. ledger-strip.png (1400 x 260  RGBA) -> public/assets/images/Sequence/ledger-strip.webp
#
# Usage:
#   blender -b --factory-startup -P art/blender/table_of_cards.py -- [--samples 320]

import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit as _kit
from kit import *
from hall_common import ROOT, scan, detail_scans, clear_glass
from room_common import rod


def box(name, x0, x1, y0, y1, z0, z1, mat, bev=0.0):
    o = _kit.box(name, x0, x1, y0, y1, z0, z1, mat)
    if bev > 0.0:
        m = o.modifiers.new("bevel", "BEVEL")
        m.width = bev
        m.segments = 2
    return o


OUT = os.path.join(ROOT, ".artifacts/sequence")
os.makedirs(OUT, exist_ok=True)

SAMPLES = int(arg("--samples", "320"))
ONLY = set(arg("--only", "study,index_card,note_card,strip").split(","))


def finish_scene(scene, samples, exposure=0.0, keep_gloss=()):
    """Configure Cycles GPU (OptiX/CUDA), OIDN denoiser with albedo+normal passes,
    indirect clamping, and realistic non-plastic roughness floors while preserving
    glossy/metallic light reflections on brass, glass, and ink."""
    cycles(
        scene,
        samples,
        scene.render.resolution_x,
        scene.render.resolution_y,
        exposure=exposure,
        glare=False,
        transparent=scene.render.film_transparent,
    )
    c = scene.cycles
    c.use_auto_tile = False
    c.adaptive_threshold = 0.007
    c.adaptive_min_samples = min(64, max(24, samples // 4))
    c.sample_clamp_indirect = 4.5
    c.sample_clamp_direct = 0.0
    detail_scans()
    c.use_denoising = True
    c.denoiser = "OPENIMAGEDENOISE"
    c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    c.denoising_prefilter = "ACCURATE"
    try:
        c.denoising_quality = "HIGH"
    except Exception:
        pass
    for o in bpy.data.objects:
        if o.type == "LIGHT" and o.data.type == "AREA":
            o.visible_camera = False
    for mat in bpy.data.materials:
        if mat.name in keep_gloss or not mat.use_nodes:
            continue
        for node in [n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"]:
            metal = node.inputs["Metallic"]
            glass = node.inputs["Transmission Weight"]
            if metal.is_linked or metal.default_value > 0.5 or glass.default_value > 0.5:
                continue
            node.inputs["Coat Weight"].default_value = 0.0
            node.inputs["Specular IOR Level"].default_value = min(
                node.inputs["Specular IOR Level"].default_value, 0.35
            )
            r = node.inputs["Roughness"]
            if r.is_linked:
                mx = mat.node_tree.nodes.new("ShaderNodeMath")
                mx.operation = "MAXIMUM"
                mx.inputs[1].default_value = 0.38
                mat.node_tree.links.new(r.links[0].from_socket, mx.inputs[0])
                mat.node_tree.links.new(mx.outputs[0], r)
            else:
                r.default_value = max(r.default_value, 0.38)


# ─────────────────────────────────────────────────────────────────────────────
# PROCEDURAL MATERIALS MATCHING ROOM IV (THE COUNTING ROOM)
# ─────────────────────────────────────────────────────────────────────────────

def make_cork_material():
    """Rich medium-dark russet natural cork pinboard material (matching Room IV)
    with multi-scale cellular cork granules, dark pores, and warm vignette."""
    m = bpy.data.materials.new("counting_cork")
    m.use_nodes = True
    N = m.node_tree.nodes
    L = m.node_tree.links.new
    b = N["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.93
    b.inputs["Specular IOR Level"].default_value = 0.18
    b.inputs["Coat Weight"].default_value = 0.0

    tc = N.new("ShaderNodeTexCoord")

    # Fine cellular cork granules
    vz1 = N.new("ShaderNodeTexVoronoi")
    vz1.inputs["Scale"].default_value = 185.0
    vz1.inputs["Randomness"].default_value = 0.95
    L(tc.outputs["Object"], vz1.inputs["Vector"])

    # Secondary smaller cork pores
    vz2 = N.new("ShaderNodeTexVoronoi")
    vz2.inputs["Scale"].default_value = 520.0
    vz2.inputs["Randomness"].default_value = 0.95
    L(tc.outputs["Object"], vz2.inputs["Vector"])

    # Broad organic color mottling across the sheet
    nz_broad = N.new("ShaderNodeTexNoise")
    nz_broad.inputs["Scale"].default_value = 4.2
    nz_broad.inputs["Detail"].default_value = 6.0
    nz_broad.inputs["Roughness"].default_value = 0.68
    L(tc.outputs["Object"], nz_broad.inputs["Vector"])

    # Medium grain noise
    nz_med = N.new("ShaderNodeTexNoise")
    nz_med.inputs["Scale"].default_value = 75.0
    nz_med.inputs["Detail"].default_value = 8.0
    nz_med.inputs["Roughness"].default_value = 0.75
    L(tc.outputs["Object"], nz_med.inputs["Vector"])

    # Combine fine cellular distance + medium noise for color factor
    mix_f1 = N.new("ShaderNodeMath")
    mix_f1.operation = "MULTIPLY_ADD"
    mix_f1.inputs[1].default_value = 0.58
    L(vz1.outputs["Distance"], mix_f1.inputs[0])
    L(nz_med.outputs["Fac"], mix_f1.inputs[2])

    mix_f2 = N.new("ShaderNodeMix")
    mix_f2.data_type = "FLOAT"
    mix_f2.inputs["Factor"].default_value = 0.30
    L(mix_f1.outputs["Value"], mix_f2.inputs["A"])
    L(nz_broad.outputs["Fac"], mix_f2.inputs["B"])

    ramp = N.new("ShaderNodeValToRGB")
    e0 = ramp.color_ramp.elements[0]
    e0.position = 0.18
    e0.color = (0.052, 0.026, 0.012, 1.0)
    e1 = ramp.color_ramp.elements[1]
    e1.position = 0.85
    e1.color = (0.215, 0.118, 0.056, 1.0)
    em = ramp.color_ramp.elements.new(0.50)
    em.color = (0.128, 0.068, 0.032, 1.0)
    L(mix_f2.outputs["Result"], ramp.inputs["Fac"])
    L(ramp.outputs["Color"], b.inputs["Base Color"])

    # Combine Voronoi + Noise into crisp cork relief bump
    bump_mix = N.new("ShaderNodeMath")
    bump_mix.operation = "MULTIPLY_ADD"
    bump_mix.inputs[1].default_value = 0.65
    L(vz1.outputs["Distance"], bump_mix.inputs[0])
    L(vz2.outputs["Distance"], bump_mix.inputs[2])

    bp = N.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.82
    bp.inputs["Distance"].default_value = 0.0025
    L(bump_mix.outputs["Value"], bp.inputs["Height"])
    L(bp.outputs["Normal"], b.inputs["Normal"])

    return m


def make_green_cased_glass():
    """Authentic antique emerald-green cased glass banker's lamp shade (matching room_counting.py)."""
    m = bpy.data.materials.new("green_cased_glass")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.005, 0.075, 0.020, 1.0)
    b.inputs["Roughness"].default_value = 0.08
    b.inputs["Specular IOR Level"].default_value = 0.65
    b.inputs["Coat Weight"].default_value = 0.92
    b.inputs["Coat Roughness"].default_value = 0.04
    b.inputs["Emission Color"].default_value = (0.03, 0.42, 0.09, 1.0)
    b.inputs["Emission Strength"].default_value = 0.20
    return m


def make_pushpin_red_material(name="pushpin_red"):
    """Rich oxblood-crimson bakelite/enamel pushpin head."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    N = m.node_tree.nodes
    L = m.node_tree.links.new
    b = N["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.24, 0.015, 0.012, 1.0)
    b.inputs["Roughness"].default_value = 0.22
    b.inputs["Specular IOR Level"].default_value = 0.58
    b.inputs["Coat Weight"].default_value = 0.55
    b.inputs["Coat Roughness"].default_value = 0.12

    tc = N.new("ShaderNodeTexCoord")
    nz = N.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 160.0
    nz.inputs["Detail"].default_value = 4.0
    L(tc.outputs["Object"], nz.inputs["Vector"])

    bp = N.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.05
    bp.inputs["Distance"].default_value = 0.0003
    L(nz.outputs["Fac"], bp.inputs["Height"])
    L(bp.outputs["Normal"], b.inputs["Normal"])
    return m


def make_paper_card_material(
    name,
    ruled=True,
    strip_mode=False,
    base_light=(0.74, 0.64, 0.47),
    base_dark=(0.48, 0.37, 0.23),
):
    """Tactile aged cotton/manila cardstock material with 3D paper fiber relief,
    aged edge darkening, subtle tea/handling mottling, and crisp ruled lines
    using ShaderNodeMath COMPARE."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    N = m.node_tree.nodes
    L = m.node_tree.links.new
    b = N["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.88
    b.inputs["Specular IOR Level"].default_value = 0.18
    b.inputs["Coat Weight"].default_value = 0.0

    tc = N.new("ShaderNodeTexCoord")

    # Fine cotton paper fiber noise
    nz_fiber = N.new("ShaderNodeTexNoise")
    nz_fiber.inputs["Scale"].default_value = 160.0
    nz_fiber.inputs["Detail"].default_value = 10.0
    nz_fiber.inputs["Roughness"].default_value = 0.82
    L(tc.outputs["Object"], nz_fiber.inputs["Vector"])

    # Medium parchment mottling / age spots
    nz_age = N.new("ShaderNodeTexNoise")
    nz_age.inputs["Scale"].default_value = 14.0
    nz_age.inputs["Detail"].default_value = 6.0
    nz_age.inputs["Roughness"].default_value = 0.68
    L(tc.outputs["Object"], nz_age.inputs["Vector"])

    # Tiny dark paper pulp flecks
    vz_fleck = N.new("ShaderNodeTexVoronoi")
    vz_fleck.inputs["Scale"].default_value = 260.0
    L(tc.outputs["Object"], vz_fleck.inputs["Vector"])

    fleck_ramp = N.new("ShaderNodeValToRGB")
    fleck_ramp.color_ramp.elements[0].position = 0.0
    fleck_ramp.color_ramp.elements[0].color = (0.28, 0.18, 0.10, 1.0)
    fleck_ramp.color_ramp.elements[1].position = 0.14
    fleck_ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)
    L(vz_fleck.outputs["Distance"], fleck_ramp.inputs["Fac"])

    # UV coordinates (u in [0,1], v in [0,1] bottom-to-top)
    sep_uv = N.new("ShaderNodeSeparateXYZ")
    L(tc.outputs["UV"], sep_uv.inputs["Vector"])

    # Edge darkening mask: min distance to any of the 4 UV edges
    inv_u = N.new("ShaderNodeMath")
    inv_u.operation = "SUBTRACT"
    inv_u.inputs[0].default_value = 1.0
    L(sep_uv.outputs["X"], inv_u.inputs[1])

    min_u = N.new("ShaderNodeMath")
    min_u.operation = "MINIMUM"
    L(sep_uv.outputs["X"], min_u.inputs[0])
    L(inv_u.outputs["Value"], min_u.inputs[1])

    inv_v = N.new("ShaderNodeMath")
    inv_v.operation = "SUBTRACT"
    inv_v.inputs[0].default_value = 1.0
    L(sep_uv.outputs["Y"], inv_v.inputs[1])

    min_v = N.new("ShaderNodeMath")
    min_v.operation = "MINIMUM"
    L(sep_uv.outputs["Y"], min_v.inputs[0])
    L(inv_v.outputs["Value"], min_v.inputs[1])

    edge_dist = N.new("ShaderNodeMath")
    edge_dist.operation = "MINIMUM"
    L(min_u.outputs["Value"], edge_dist.inputs[0])
    L(min_v.outputs["Value"], edge_dist.inputs[1])

    edge_ramp = N.new("ShaderNodeValToRGB")
    edge_ramp.color_ramp.elements[0].position = 0.0
    edge_ramp.color_ramp.elements[0].color = (0.15, 0.15, 0.15, 1.0)
    edge_ramp.color_ramp.elements[1].position = 0.16
    edge_ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)
    L(edge_dist.outputs["Value"], edge_ramp.inputs["Fac"])

    # Combine age noise + fiber noise + edge darkening
    mix_age = N.new("ShaderNodeMix")
    mix_age.data_type = "FLOAT"
    mix_age.inputs["Factor"].default_value = 0.45
    L(nz_age.outputs["Fac"], mix_age.inputs["A"])
    L(nz_fiber.outputs["Fac"], mix_age.inputs["B"])

    edge_mul = N.new("ShaderNodeMath")
    edge_mul.operation = "MULTIPLY"
    L(mix_age.outputs["Result"], edge_mul.inputs[0])
    L(edge_ramp.outputs["Color"], edge_mul.inputs[1])

    paper_col = N.new("ShaderNodeMix")
    paper_col.data_type = "RGBA"
    paper_col.inputs["A"].default_value = (*base_dark, 1.0)
    paper_col.inputs["B"].default_value = (*base_light, 1.0)
    L(edge_mul.outputs["Value"], paper_col.inputs["Factor"])

    fleck_mul = N.new("ShaderNodeMix")
    fleck_mul.data_type = "RGBA"
    fleck_mul.blend_type = "MULTIPLY"
    fleck_mul.inputs["Factor"].default_value = 0.50
    L(paper_col.outputs["Result"], fleck_mul.inputs["A"])
    L(fleck_ramp.outputs["Color"], fleck_mul.inputs["B"])

    cur_color = fleck_mul.outputs["Result"]

    if ruled:
        # Faded crimson double header line at v = 0.765 and v = 0.742 using COMPARE
        red_cmp1 = N.new("ShaderNodeMath")
        red_cmp1.operation = "COMPARE"
        L(sep_uv.outputs["Y"], red_cmp1.inputs[0])
        red_cmp1.inputs[1].default_value = 0.765
        red_cmp1.inputs[2].default_value = 0.0065

        red_cmp2 = N.new("ShaderNodeMath")
        red_cmp2.operation = "COMPARE"
        L(sep_uv.outputs["Y"], red_cmp2.inputs[0])
        red_cmp2.inputs[1].default_value = 0.742
        red_cmp2.inputs[2].default_value = 0.0040

        red_any = N.new("ShaderNodeMath")
        red_any.operation = "MAXIMUM"
        L(red_cmp1.outputs["Value"], red_any.inputs[0])
        L(red_cmp2.outputs["Value"], red_any.inputs[1])

        red_fade = N.new("ShaderNodeMath")
        red_fade.operation = "MULTIPLY"
        L(red_any.outputs["Value"], red_fade.inputs[0])
        red_fade.inputs[1].default_value = 0.72

        mix_red = N.new("ShaderNodeMix")
        mix_red.data_type = "RGBA"
        mix_red.inputs["B"].default_value = (0.44, 0.10, 0.08, 1.0)
        L(red_fade.outputs["Value"], mix_red.inputs["Factor"])
        L(cur_color, mix_red.inputs["A"])
        cur_color = mix_red.outputs["Result"]

        # 5 pale slate-blue horizontal ledger rules at v = 0.60, 0.47, 0.34, 0.21, 0.09
        blue_accum = None
        for v_pos in (0.60, 0.47, 0.34, 0.21, 0.09):
            bcmp = N.new("ShaderNodeMath")
            bcmp.operation = "COMPARE"
            L(sep_uv.outputs["Y"], bcmp.inputs[0])
            bcmp.inputs[1].default_value = v_pos
            bcmp.inputs[2].default_value = 0.0048

            if blue_accum is None:
                blue_accum = bcmp.outputs["Value"]
            else:
                mx_b = N.new("ShaderNodeMath")
                mx_b.operation = "MAXIMUM"
                L(blue_accum, mx_b.inputs[0])
                L(bcmp.outputs["Value"], mx_b.inputs[1])
                blue_accum = mx_b.outputs["Value"]

        blue_fade = N.new("ShaderNodeMath")
        blue_fade.operation = "MULTIPLY"
        L(blue_accum, blue_fade.inputs[0])
        blue_fade.inputs[1].default_value = 0.56

        mix_blue = N.new("ShaderNodeMix")
        mix_blue.data_type = "RGBA"
        mix_blue.inputs["B"].default_value = (0.18, 0.30, 0.44, 1.0)
        L(blue_fade.outputs["Value"], mix_blue.inputs["Factor"])
        L(cur_color, mix_blue.inputs["A"])
        cur_color = mix_blue.outputs["Result"]

    if strip_mode:
        # Faded crimson top rule at v = 0.82 and sepia baseline at v = 0.20 using COMPARE
        top_cmp = N.new("ShaderNodeMath")
        top_cmp.operation = "COMPARE"
        L(sep_uv.outputs["Y"], top_cmp.inputs[0])
        top_cmp.inputs[1].default_value = 0.82
        top_cmp.inputs[2].default_value = 0.012

        top_fade = N.new("ShaderNodeMath")
        top_fade.operation = "MULTIPLY"
        L(top_cmp.outputs["Value"], top_fade.inputs[0])
        top_fade.inputs[1].default_value = 0.52

        mix_top = N.new("ShaderNodeMix")
        mix_top.data_type = "RGBA"
        mix_top.inputs["B"].default_value = (0.44, 0.11, 0.09, 1.0)
        L(top_fade.outputs["Value"], mix_top.inputs["Factor"])
        L(cur_color, mix_top.inputs["A"])
        cur_color = mix_top.outputs["Result"]

        base_cmp = N.new("ShaderNodeMath")
        base_cmp.operation = "COMPARE"
        L(sep_uv.outputs["Y"], base_cmp.inputs[0])
        base_cmp.inputs[1].default_value = 0.20
        base_cmp.inputs[2].default_value = 0.014

        base_fade = N.new("ShaderNodeMath")
        base_fade.operation = "MULTIPLY"
        L(base_cmp.outputs["Value"], base_fade.inputs[0])
        base_fade.inputs[1].default_value = 0.58

        mix_base = N.new("ShaderNodeMix")
        mix_base.data_type = "RGBA"
        mix_base.inputs["B"].default_value = (0.26, 0.17, 0.10, 1.0)
        L(base_fade.outputs["Value"], mix_base.inputs["Factor"])
        L(cur_color, mix_base.inputs["A"])
        cur_color = mix_base.outputs["Result"]

    L(cur_color, b.inputs["Base Color"])

    # Paper fiber relief bump
    bp = N.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = 0.45
    bp.inputs["Distance"].default_value = 0.0014
    L(nz_fiber.outputs["Fac"], bp.inputs["Height"])
    L(bp.outputs["Normal"], b.inputs["Normal"])

    return m


# ─────────────────────────────────────────────────────────────────────────────
# 3D GEOMETRY HELPERS FOR PROPS & CARDS
# ─────────────────────────────────────────────────────────────────────────────

def build_pushpin(at_xyz, head_mat, shaft_mat, radius=0.011, tilt=(0.24, -0.10, 0.0)):
    """Build a realistic 3D spherical/collar pushpin with visible steel shaft and puncture hole."""
    px, py, pz = at_xyz
    root = bpy.data.objects.new("pushpin_root", None)
    link(root)
    root.location = (px, py, pz)
    root.rotation_euler = tilt

    hole_mat = plain("pin_hole_dark", (0.04, 0.03, 0.02), rough=0.95)
    hole = cylinder("pin_hole", 0, 0, -0.0005, 0.0008, radius * 0.24, hole_mat, verts=16)
    hole.rotation_euler = (math.pi / 2, 0, 0)
    hole.parent = root

    shaft = cylinder("pin_shaft", 0, 0, -radius * 1.45, 0.003, radius * 0.135, shaft_mat, verts=20)
    shaft.rotation_euler = (math.pi / 2, 0, 0)
    shaft.parent = root

    head = sphere("pin_head", (0, -radius * 1.65, 0), radius, head_mat, squash=(1.0, 0.90, 1.0))
    head.parent = root

    neck = cylinder("pin_neck", 0, 0, -radius * 1.05, -radius * 0.65, radius * 0.38, head_mat, verts=24)
    neck.rotation_euler = (math.pi / 2, 0, 0)
    neck.parent = root
    return root


def build_brass_tack(at_xyz, brass_mat, shaft_mat, radius=0.011, tilt=(0.08, -0.04, 0.0)):
    """Build a classic convex-domed aged brass drawing pin / thumbtack with beveled rim."""
    px, py, pz = at_xyz
    root = bpy.data.objects.new("brass_tack_root", None)
    link(root)
    root.location = (px, py, pz)
    root.rotation_euler = tilt

    profile = [
        (0.0, 0.0046),
        (radius * 0.35, 0.0042),
        (radius * 0.70, 0.0030),
        (radius * 0.92, 0.0014),
        (radius * 1.00, 0.0004),
        (radius * 0.98, 0.0000),
        (0.0, 0.0000),
    ]
    cap = lathe("tack_cap", profile, brass_mat, at=(0, -0.0012, 0), steps=40)
    cap.rotation_euler = (-math.pi / 2, 0, 0)
    cap.parent = root

    shaft = cylinder("tack_shaft", 0, 0, -0.001, 0.006, radius * 0.12, shaft_mat, verts=16)
    shaft.rotation_euler = (math.pi / 2, 0, 0)
    shaft.parent = root
    return root


def build_warped_paper_sheet(
    name,
    width,
    height,
    mat,
    curl_br=0.014,
    curl_tl=0.003,
    corner_radius=0.005,
    edge_jitter=0.00022,
    thickness=0.0007,
    seed=101,
):
    """Build a subdivided 3D cardstock sheet in the XZ plane (facing -Y) with UV
    coordinates, straight cut edges with subtle worn micro-roughness, rounded corners,
    and a realistic 3D curled bottom-right corner."""
    rng = random.Random(seed)
    nx, nz = 80, 54
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")

    hw = width * 0.5
    hh = height * 0.5
    cr = min(corner_radius, hw * 0.25, hh * 0.25)

    verts_grid = []
    for j in range(nz + 1):
        v_norm = j / nz  # 0 at bottom, 1 at top
        row = []
        for i in range(nx + 1):
            u_norm = i / nx  # 0 at left, 1 at right
            x = (u_norm - 0.5) * width
            z = (v_norm - 0.5) * height

            ax = abs(x) - (hw - cr)
            az = abs(z) - (hh - cr)
            if ax > 0.0 and az > 0.0:
                dist_c = math.hypot(ax, az)
                if dist_c > cr:
                    scale_c = cr / dist_c
                    x = math.copysign((hw - cr) + ax * scale_c, x)
                    z = math.copysign((hh - cr) + az * scale_c, z)

            if i in (0, nx) or j in (0, nz):
                x += rng.uniform(-edge_jitter, edge_jitter)
                z += rng.uniform(-edge_jitter, edge_jitter)

            pin_d = math.hypot(u_norm - 0.5, v_norm - 0.88)
            bow = -0.0018 * math.sin(u_norm * math.pi) * math.sin(v_norm * math.pi)
            ripple = 0.0004 * math.sin(u_norm * 8.0 + 0.5) * math.cos(v_norm * 6.0) * min(1.0, pin_d * 2.5)
            y = bow + ripple

            # Bottom-right corner curl (u > 0.70, v < 0.36) -> lifts forward toward -Y
            c_dist = (u_norm - 0.70) * 0.72 + (0.36 - v_norm) * 0.68
            if c_dist > 0.0:
                t = min(1.0, c_dist / 0.44)
                curl_amt = (t ** 2.15) * curl_br
                y -= curl_amt
                x -= (t ** 2.4) * curl_br * 0.34
                z += (t ** 2.4) * curl_br * 0.38

            tl_dist = (0.18 - u_norm) * 0.7 + (v_norm - 0.82) * 0.7
            if tl_dist > 0.0:
                t2 = min(1.0, tl_dist / 0.20)
                y -= (t2 ** 2.0) * curl_tl

            v_bm = bm.verts.new((x, y, z))
            row.append((v_bm, u_norm, v_norm))
        verts_grid.append(row)

    for j in range(nz):
        for i in range(nx):
            v00, u00, w00 = verts_grid[j][i]
            v10, u10, w10 = verts_grid[j][i + 1]
            v11, u11, w11 = verts_grid[j + 1][i + 1]
            v01, u01, w01 = verts_grid[j + 1][i]
            f = bm.faces.new((v00, v10, v11, v01))
            f.smooth = True
            for loop, (uu, ww) in zip(f.loops, ((u00, w00), (u10, w10), (u11, w11), (u01, w01))):
                loop[uv_layer].uv = (uu, ww)

    bm.to_mesh(me)
    bm.free()

    obj = link(bpy.data.objects.new(name, me))
    obj.data.materials.append(mat)

    sol = obj.modifiers.new("paper_thickness", "SOLIDIFY")
    sol.thickness = thickness
    sol.offset = 1.0
    return obj


# ─────────────────────────────────────────────────────────────────────────────
# 1. RENDER THE COUNTING ROOM STUDY & CORK BOARD (`study.png`)
# ─────────────────────────────────────────────────────────────────────────────

def render_study_background():
    scene = fresh()
    W, H = 2304, 1296
    RNG = random.Random(1913)

    # Camera looking straight-on (+Y) at the Counting Room wall & desk
    cam_d = bpy.data.cameras.new("study_cam")
    cam_d.lens = 38.0
    cam_d.sensor_width = 36.0
    cam = link(bpy.data.objects.new("study_cam", cam_d))
    cam.location = (0.0, -2.35, 1.18)
    cam.rotation_euler = (math.pi / 2, 0.0, 0.0)
    scene.camera = cam

    # Materials from Room IV (room_counting.py)
    PLASTER = scan(
        "lime_plaster",
        "white_plaster_rough_01",
        size=1.8,
        tint=(0.86, 0.78, 0.66),
        bright=0.60,
        sat=0.50,
        rough=(0.82, 0.96),
        bump=0.55,
    )
    OAK = scan(
        "oak_vert",
        "dark_wood",
        size=0.85,
        tint=(0.74, 0.54, 0.36),
        bright=0.40,
        rough=(0.42, 0.65),
        bump=0.38,
        coat=0.0,
        upright=True,
    )
    OAK_X = scan(
        "oak_horiz",
        "dark_wood",
        size=0.85,
        tint=(0.74, 0.54, 0.36),
        bright=0.38,
        rough=(0.42, 0.65),
        bump=0.38,
        coat=0.0,
    )
    BEAM = scan(
        "beam_oak",
        "dark_wood",
        size=1.1,
        tint=(0.54, 0.38, 0.28),
        bright=0.28,
        rough=(0.55, 0.82),
        bump=0.60,
    )
    # Use dark_wood with warm mahogany tint for horizontal desk moldings & drawer fronts
    # so the wood grain runs smoothly horizontally without repeating arches
    MAHOGANY = scan(
        "mahogany_desk",
        "dark_wood",
        size=1.15,
        tint=(0.68, 0.38, 0.25),
        bright=0.38,
        sat=0.92,
        rough=(0.38, 0.56),
        bump=0.28,
        coat=0.0,
    )
    LEATHER = scan(
        "counting_leather",
        "brown_leather",
        size=0.48,
        tint=(0.24, 0.32, 0.20),
        bright=0.35,
        rough=(0.44, 0.68),
        bump=0.48,
    )
    BOOK_RED = scan(
        "book_leather_red",
        "brown_leather",
        size=0.35,
        tint=(0.48, 0.16, 0.12),
        bright=0.36,
        rough=(0.45, 0.70),
        bump=0.40,
    )
    BOOK_GREEN = scan(
        "book_leather_green",
        "brown_leather",
        size=0.35,
        tint=(0.16, 0.32, 0.22),
        bright=0.34,
        rough=(0.45, 0.70),
        bump=0.40,
    )
    BOOK_BROWN = scan(
        "book_leather_brown",
        "brown_leather",
        size=0.35,
        tint=(0.38, 0.25, 0.16),
        bright=0.35,
        rough=(0.45, 0.70),
        bump=0.40,
    )
    BOOK_NAVY = scan(
        "book_leather_navy",
        "brown_leather",
        size=0.35,
        tint=(0.16, 0.20, 0.34),
        bright=0.34,
        rough=(0.45, 0.70),
        bump=0.40,
    )
    BRASS = aged_metal(
        "aged_brass",
        (0.66, 0.48, 0.22),
        (0.14, 0.10, 0.045),
        rough=(0.22, 0.46),
        scale=28,
        tarnish=0.42,
    )
    STEEL = aged_metal(
        "aged_steel",
        (0.54, 0.55, 0.58),
        (0.14, 0.13, 0.12),
        rough=(0.24, 0.45),
        scale=36,
        tarnish=0.32,
    )
    IRON = aged_metal(
        "cast_iron",
        (0.08, 0.08, 0.09),
        (0.04, 0.03, 0.02),
        rough=(0.48, 0.78),
        scale=22,
        tarnish=0.5,
    )
    CORK = make_cork_material()
    GREEN_GLASS = make_green_cased_glass()
    GLASS = plain("crystal_glass", (0.94, 0.97, 0.95), rough=0.03, transmission=1.0, ior=1.52)
    LEADED = plain("leaded_glass", (0.72, 0.83, 0.76), rough=0.14, transmission=0.92, ior=1.5)
    LEAD = plain("lead_came", (0.07, 0.075, 0.08), rough=0.52, metal=0.75)
    PIN_RED = make_pushpin_red_material()
    DRAPE = scan(
        "counting_drape",
        "white_plaster_rough_01",
        size=0.6,
        tint=(0.14, 0.22, 0.16),
        bright=0.28,
        rough=(0.78, 0.94),
        bump=0.35,
    )
    GILT_LINE = aged_metal(
        "gilt_tooled",
        (0.58, 0.43, 0.18),
        (0.18, 0.12, 0.05),
        rough=(0.30, 0.56),
        scale=45,
        tarnish=0.48,
    )

    # ── 1. THE COUNTING ROOM WALL & WAINSCOTING (Y = 0.0) ────────────────────
    box("plaster_wall", -1.65, 1.65, 0.02, 0.08, 0.40, 2.10, PLASTER)
    box("top_beam", -1.65, 1.65, -0.06, 0.03, 1.81, 1.98, BEAM, 0.006)
    box("top_cornice", -1.65, 1.65, -0.035, 0.025, 1.785, 1.815, OAK_X, 0.004)

    box("wainscot_backing", -1.60, 1.60, 0.00, 0.022, 0.45, 1.79, OAK)

    for z0, z1 in ((1.73, 1.785), (1.02, 1.070), (0.84, 0.89)):
        box("wainscot_rail", -1.55, 1.55, -0.012, 0.005, z0, z1, OAK_X, 0.003)

    stile_xs = (-1.22, -0.90, -0.58, -0.20, 0.20, 0.58, 0.90, 1.22)
    for sx in stile_xs:
        box("wainscot_stile_up", sx - 0.028, sx + 0.028, -0.012, 0.005, 1.070, 1.73, OAK, 0.003)
        box("wainscot_stile_lo", sx - 0.028, sx + 0.028, -0.012, 0.005, 0.89, 1.02, OAK, 0.003)

    for i in range(len(stile_xs) - 1):
        px0 = stile_xs[i] + 0.042
        px1 = stile_xs[i + 1] - 0.042
        if px1 > px0 + 0.04:
            box("panel_up", px0, px1, -0.006, 0.002, 1.084, 1.714, OAK, 0.006)
            box("panel_lo", px0, px1, -0.006, 0.002, 0.902, 1.008, OAK, 0.005)

    # ── 2. THE OAK-FRAMED CORK BOARD (X in [-0.812, +0.812], Z in [1.102, 1.735]) ──
    cx0, cx1 = -0.812, 0.812
    cz0, cz1 = 1.102, 1.735
    fw = 0.046
    fx0, fx1 = cx0 - fw, cx1 + fw
    fz0, fz1 = cz0 - fw, cz1 + fw

    box("board_back", fx0, fx1, -0.008, 0.000, fz0, fz1, OAK_X)

    cork_me = bpy.data.meshes.new("cork_sheet")
    bm = bmesh.new()
    cnx, cnz = 96, 42
    c_verts = []
    pinholes = [
        (-0.55, 1.58), (-0.28, 1.59), (0.02, 1.58), (0.31, 1.59),
        (-0.62, 1.26), (0.64, 1.24), (-0.42, 1.22), (0.44, 1.23),
    ]
    for j in range(cnz + 1):
        row = []
        vz = cz0 + (cz1 - cz0) * (j / cnz)
        for i in range(cnx + 1):
            vx = cx0 + (cx1 - cx0) * (i / cnx)
            vy = -0.020 + 0.0006 * math.sin(vx * 7.5) * math.cos(vz * 9.2)
            for phx, phz in pinholes:
                d = math.hypot(vx - phx, vz - phz)
                if d < 0.010:
                    vy += 0.0018 * (1.0 - d / 0.010)
            row.append(bm.verts.new((vx, vy, vz)))
        c_verts.append(row)
    for j in range(cnz):
        for i in range(cnx):
            f = bm.faces.new((c_verts[j][i], c_verts[j][i + 1], c_verts[j + 1][i + 1], c_verts[j + 1][i]))
            f.smooth = True
    bm.to_mesh(cork_me)
    bm.free()
    cork_obj = link(bpy.data.objects.new("cork_sheet", cork_me))
    cork_obj.data.materials.append(CORK)

    box("board_frame_top", fx0, fx1, -0.044, -0.008, cz1, fz1, OAK_X, 0.004)
    box("board_frame_bot", fx0, fx1, -0.044, -0.008, fz0, cz0, OAK_X, 0.004)
    box("board_frame_left", fx0, cx0, -0.044, -0.008, cz0, cz1, OAK, 0.004)
    box("board_frame_right", cx1, fx1, -0.044, -0.008, cz0, cz1, OAK, 0.004)

    lip = 0.007
    box("board_lip_top", cx0 - lip, cx1 + lip, -0.029, -0.018, cz1 - lip, cz1 + 0.002, BRASS, 0.0015)
    box("board_lip_bot", cx0 - lip, cx1 + lip, -0.029, -0.018, cz0 - 0.002, cz0 + lip, BRASS, 0.0015)
    box("board_lip_left", cx0 - 0.002, cx0 + lip, -0.029, -0.018, cz0, cz1, BRASS, 0.0015)
    box("board_lip_right", cx1 - lip, cx1 + 0.002, -0.029, -0.018, cz0, cz1, BRASS, 0.0015)

    box("board_ledge", fx0 + 0.02, fx1 - 0.02, -0.070, -0.040, fz0 - 0.004, fz0 + 0.012, OAK_X, 0.0025)

    build_pushpin((-0.48, -0.054, fz0 + 0.016), PIN_RED, STEEL, radius=0.0085, tilt=(1.1, 0.3, 0.4))
    build_pushpin((0.52, -0.054, fz0 + 0.016), PIN_RED, STEEL, radius=0.0085, tilt=(1.2, -0.4, -0.3))
    pencil_mat = plain("cedar_pencil", (0.48, 0.24, 0.10), rough=0.52)
    p_body = cylinder("ledge_pencil", 0, 0, -0.08, 0.08, 0.0038, pencil_mat, verts=6)
    p_body.rotation_euler = (0, math.pi / 2, 0.03)
    p_body.location = (-0.22, -0.054, fz0 + 0.016)
    p_ferrule = cylinder("pencil_ferrule", 0, 0, -0.092, -0.08, 0.0040, BRASS, verts=16)
    p_ferrule.rotation_euler = (0, math.pi / 2, 0.03)
    p_ferrule.location = (-0.22, -0.054, fz0 + 0.016)

    arm_l = 0.092
    arm_w = 0.038
    by0, by1 = -0.0475, -0.0435
    corners_cfg = [
        (fx0 + 0.003, fz1 - 0.003, 1, -1),
        (fx1 - 0.003, fz1 - 0.003, -1, -1),
        (fx0 + 0.003, fz0 + 0.003, 1, 1),
        (fx1 - 0.003, fz0 + 0.003, -1, 1),
    ]
    for kx, kz, sx_dir, sz_dir in corners_cfg:
        hx0, hx1 = sorted((kx, kx + sx_dir * arm_l))
        hz0, hz1 = sorted((kz, kz + sz_dir * arm_w))
        vx0, vx1 = sorted((kx, kx + sx_dir * arm_w))
        vz0, vz1 = sorted((kz, kz + sz_dir * arm_l))
        box("brass_corner_h", hx0, hx1, by0, by1, hz0, hz1, BRASS, 0.0012)
        box("brass_corner_v", vx0, vx1, by0, by1, vz0, vz1, BRASS, 0.0012)
        for rx, rz in (
            (kx + sx_dir * 0.019, kz + sz_dir * 0.019),
            (kx + sx_dir * 0.052, kz + sz_dir * 0.019),
            (kx + sx_dir * 0.078, kz + sz_dir * 0.019),
            (kx + sx_dir * 0.019, kz + sz_dir * 0.052),
            (kx + sx_dir * 0.019, kz + sz_dir * 0.078),
        ):
            sphere("brass_rivet", (rx, by0 - 0.001, rz), 0.0042, BRASS, squash=(1.0, 0.55, 1.0))

    # ── 3. OVERHEAD BRASS PICTURE LIGHT (VISIBLE AT TOP OF BOARD FRAME) ─────
    for side in (-1, 1):
        bx = side * 0.22
        lathe(
            "pic_wall_plate",
            [(0, 0), (0.018, 0), (0.018, 0.006), (0.010, 0.012), (0, 0.012)],
            BRASS,
            at=(bx, -0.044, fz1 - 0.018),
            steps=24,
        ).rotation_euler = (-math.pi / 2, 0, 0)
        tube(
            "pic_light_arm",
            [(0.0, 0.0), (0.0, 0.05), (0.11, 0.02), (0.13, -0.015)],
            0.0055,
            BRASS,
            at=(bx, -0.044, fz1 - 0.018),
            rot=-math.pi / 2,
        )
    hood = cylinder("pic_light_hood", 0, 0, -0.32, 0.32, 0.022, BRASS, verts=36)
    hood.rotation_euler = (0, math.pi / 2, 0)
    hood.location = (0.0, -0.175, fz1 - 0.032)
    for side in (-1, 1):
        sphere("pic_hood_cap", (side * 0.32, -0.175, fz1 - 0.032), 0.0225, BRASS, squash=(0.35, 1.0, 1.0))

    pic_bulb_mat = plain("pic_bulb_emit", (1.0, 0.88, 0.65), emit=(1.0, 0.78, 0.44), strength=12.0)
    box("pic_bulb_tube", -0.28, 0.28, -0.180, -0.165, fz1 - 0.045, fz1 - 0.038, pic_bulb_mat)

    # ── 4. LEFT FLANK: TALL OAK REGISTER BOOKCASE (`SHELF` FROM ROOM IV) ────
    box("reg_case_side", -0.96, -0.92, -0.26, 0.0, 0.86, 1.82, OAK_X, 0.003)
    box("reg_case_trim", -0.965, -0.915, -0.27, -0.245, 0.86, 1.82, OAK, 0.003)
    box("reg_case_back", -1.35, -0.93, -0.02, 0.0, 0.86, 1.82, OAK)
    COVERS = [BOOK_RED, BOOK_GREEN, BOOK_BROWN, BOOK_NAVY]
    PAGES = plain("reg_pages", (0.68, 0.60, 0.46), rough=0.88)
    for sz in (0.98, 1.28, 1.56, 1.80):
        box("reg_shelf", -1.32, -0.925, -0.265, -0.01, sz - 0.022, sz, OAK_X, 0.003)
        if sz < 1.70:
            bx_cur = -1.28
            idx_b = 0
            while bx_cur < -0.97:
                bw = RNG.uniform(0.036, 0.052)
                bh = RNG.uniform(0.22, 0.25)
                bd = RNG.uniform(0.19, 0.22)
                cov = COVERS[idx_b % len(COVERS)]
                box("reg_book", bx_cur, bx_cur + bw, -bd, -0.02, sz, sz + bh, cov, 0.003)
                for bz_rel in (0.22, 0.48, 0.76, 0.86):
                    box(
                        "reg_band",
                        bx_cur + 0.002,
                        bx_cur + bw - 0.002,
                        -bd - 0.0015,
                        -bd + 0.002,
                        sz + bh * bz_rel,
                        sz + bh * bz_rel + 0.005,
                        GILT_LINE,
                    )
                bx_cur += bw + 0.003
                idx_b += 1

    # ── 5. RIGHT FLANK: LEADED CASEMENT WINDOW & DRAPE (FROM ROOM IV) ───────
    box("win_frame_left", 0.96, 1.00, -0.14, 0.02, 0.86, 1.82, OAK, 0.004)
    box("win_sill", 0.94, 1.32, -0.18, 0.02, 0.84, 0.88, OAK_X, 0.004)
    box("win_glass", 1.00, 1.30, -0.08, -0.075, 0.88, 1.80, LEADED)
    for k in range(-6, 8):
        z_start = 0.88 + k * 0.14
        rod("lead_d1", (1.00, -0.082, z_start), (1.28, -0.082, z_start + 0.34), 0.003, LEAD, verts=6)
        rod("lead_d2", (1.00, -0.082, z_start + 0.34), (1.28, -0.082, z_start), 0.003, LEAD, verts=6)

    for p_i in range(7):
        px = 0.91 + p_i * 0.016
        py = -0.15 - 0.012 * math.sin(p_i * 1.4)
        pr = 0.012 + 0.0025 * math.cos(p_i * 1.1)
        cylinder(f"drape_pleat_{p_i}", px, py, 0.85, 1.84, pr, DRAPE, verts=16)

    # ── 6. THE COUNTING TABLE IN THE FOREGROUND (Z = 0.905, Y = -0.16 .. -0.96) ──
    desk_z = 0.905
    box("desk_top_slab", -1.28, 1.28, -0.95, -0.14, desk_z - 0.024, desk_z, MAHOGANY, 0.005)
    box("desk_front_molding", -1.29, 1.29, -0.965, -0.935, desk_z - 0.028, desk_z + 0.002, MAHOGANY, 0.006)
    box("desk_back_riser", -1.28, 1.28, -0.18, -0.13, desk_z, desk_z + 0.024, MAHOGANY, 0.004)

    box("desk_leather_skiver", -1.04, 1.04, -0.89, -0.22, desk_z - 0.001, desk_z + 0.0025, LEATHER, 0.002)
    gx0, gx1, gy0, gy1 = -1.00, 1.00, -0.86, -0.25
    for (ax0, ax1, ay0, ay1) in (
        (gx0, gx1, gy0, gy0 + 0.004),
        (gx0, gx1, gy1 - 0.004, gy1),
        (gx0, gx0 + 0.004, gy0, gy1),
        (gx1 - 0.004, gx1, gy0, gy1),
    ):
        box("gilt_rule", ax0, ax1, ay0, ay1, desk_z + 0.0018, desk_z + 0.0030, GILT_LINE)

    box("desk_frieze_body", -1.25, 1.25, -0.935, -0.20, 0.72, desk_z - 0.024, MAHOGANY)
    box("desk_lower_rail", -1.26, 1.26, -0.950, -0.925, 0.785, 0.805, MAHOGANY, 0.003)

    drawer_spans = ((-1.02, -0.46), (-0.42, 0.42), (0.46, 1.02))
    dz0, dz1 = 0.810, desk_z - 0.030
    mid_z = (dz0 + dz1) * 0.5
    for d_idx, (dx0, dx1) in enumerate(drawer_spans):
        box(f"drawer_front_{d_idx}", dx0, dx1, -0.952, -0.932, dz0, dz1, MAHOGANY, 0.004)
        mid_x = (dx0 + dx1) * 0.5

        if d_idx == 1:
            box("key_escutcheon", mid_x - 0.011, mid_x + 0.011, -0.956, -0.950, mid_z - 0.016, mid_z + 0.016, BRASS, 0.002)
            cylinder("keyhole_slot", mid_x, -0.957, mid_z - 0.006, mid_z + 0.005, 0.0030, IRON, verts=12)

        pull_xs = (mid_x - 0.20, mid_x + 0.20) if d_idx == 1 else (mid_x,)
        for px in pull_xs:
            for side in (-1, 1):
                rx = px + side * 0.038
                lathe(
                    "pull_rosette",
                    [(0, 0), (0.012, 0), (0.012, 0.004), (0.006, 0.009), (0, 0.009)],
                    BRASS,
                    at=(rx, -0.952, mid_z + 0.004),
                    steps=20,
                ).rotation_euler = (-math.pi / 2, 0, 0)
            bail = tube(
                "swan_bail",
                [
                    (-0.038, 0.0),
                    (-0.042, -0.016),
                    (-0.020, -0.026),
                    (0.0, -0.028),
                    (0.020, -0.026),
                    (0.042, -0.016),
                    (0.038, 0.0),
                ],
                0.0040,
                BRASS,
                at=(px, -0.958, mid_z + 0.004),
                rot=0.0,
            )
            bail.rotation_euler = (math.pi / 2, 0, 0)

    # ── 7. FOREGROUND PROPS ON THE COUNTING TABLE ────────────────────────────
    lx, ly = -0.68, -0.58
    base_profile = [
        (0.0, 0.0),
        (0.088, 0.0),
        (0.088, 0.011),
        (0.078, 0.017),
        (0.068, 0.030),
        (0.038, 0.044),
        (0.022, 0.058),
        (0.015, 0.070),
        (0.012, 0.30),
        (0.017, 0.31),
        (0.0, 0.315),
    ]
    lathe("banker_lamp_base", base_profile, BRASS, at=(lx, ly, desk_z), steps=40)

    tube(
        "banker_yoke",
        [(0.0, 0.29), (0.0, 0.345), (0.045, 0.365)],
        0.0060,
        BRASS,
        at=(lx, ly, desk_z),
        rot=-math.pi / 2,
    )

    sx, sy, sz = lx + 0.055, ly - 0.03, desk_z + 0.355
    shade_yaw = -0.22
    sh = cylinder("green_glass_shade", 0, 0, -0.130, 0.130, 0.065, GREEN_GLASS, verts=48)
    sh.rotation_euler = (0, math.pi / 2, shade_yaw)
    sh.location = (sx, sy, sz)
    cut_box = box("shade_cut", -0.16, 0.16, -0.10, 0.10, -0.09, -0.005, GLASS)
    cut_box.rotation_euler = (0, 0, shade_yaw)
    cut_box.location = (sx, sy, sz)
    boolean_cut(sh, cut_box)
    sh.modifiers.new("glass_thick", "SOLIDIFY").thickness = 0.004

    for side in (-1, 1):
        ex = sx + side * 0.133 * math.cos(shade_yaw)
        ey = sy + side * 0.133 * math.sin(shade_yaw)
        sphere("shade_end_knob", (ex, ey, sz), 0.010, BRASS)

    for k in range(10):
        sphere("pull_bead", (sx + 0.055, sy + 0.01, sz - 0.028 - k * 0.008), 0.0030, BRASS)
    lathe(
        "pull_acorn",
        [(0, 0), (0.0055, 0.0045), (0.0045, 0.013), (0, 0.016)],
        BRASS,
        at=(sx + 0.055, sy + 0.01, sz - 0.122),
        steps=16,
    )

    bulb_mat = plain("banker_bulb", (1.0, 0.90, 0.65), emit=(1.0, 0.78, 0.42), strength=18.0)
    sphere("banker_bulb_mesh", (sx, sy, sz + 0.018), 0.016, bulb_mat)

    box("desk_book_1", -1.03, -0.82, -0.56, -0.28, desk_z, desk_z + 0.034, BOOK_RED, 0.004)
    box("desk_book_1_pages", -1.02, -0.825, -0.555, -0.285, desk_z + 0.005, desk_z + 0.029, PAGES)
    box("desk_book_2", -1.01, -0.83, -0.54, -0.29, desk_z + 0.034, desk_z + 0.062, BOOK_GREEN, 0.004)
    box("desk_book_2_pages", -1.00, -0.835, -0.535, -0.295, desk_z + 0.039, desk_z + 0.057, PAGES)

    for wx, wy, wr, wh in (
        (-0.50, -0.44, 0.015, 0.032),
        (-0.46, -0.46, 0.011, 0.024),
        (-0.43, -0.44, 0.0085, 0.018),
    ):
        cylinder("brass_weight", wx, wy, desk_z, desk_z + wh, wr, BRASS, verts=24)
        sphere("weight_knob", (wx, wy, desk_z + wh + wr * 0.35), wr * 0.42, BRASS)

    ix, iy = 0.62, -0.52
    box("inkwell_tray", ix - 0.062, ix + 0.062, iy - 0.052, iy + 0.052, desk_z, desk_z + 0.012, MAHOGANY, 0.003)
    box("inkwell_body", ix - 0.032, ix + 0.032, iy - 0.032, iy + 0.032, desk_z + 0.012, desk_z + 0.058, GLASS, 0.005)
    ink_mat = plain("dark_ink", (0.01, 0.012, 0.025), rough=0.08)
    box("ink_liquid", ix - 0.025, ix + 0.025, iy - 0.025, iy + 0.025, desk_z + 0.015, desk_z + 0.042, ink_mat, 0.003)
    lathe(
        "inkwell_cap",
        [(0, 0), (0.020, 0), (0.022, 0.007), (0.016, 0.016), (0.005, 0.020), (0, 0.020)],
        BRASS,
        at=(ix, iy, desk_z + 0.058),
        steps=28,
    )

    pen_handle = cylinder("dip_pen_shaft", 0, 0, -0.090, 0.070, 0.0036, plain("ebony_pen", (0.03, 0.025, 0.02), rough=0.40), verts=16)
    pen_handle.rotation_euler = (0, math.pi / 2, -0.32)
    pen_handle.location = (0.54, -0.64, desk_z + 0.006)
    pen_nib = cylinder("dip_pen_nib", 0, 0, -0.120, -0.088, 0.0030, BRASS, verts=12)
    pen_nib.rotation_euler = (0, math.pi / 2, -0.32)
    pen_nib.location = (0.54, -0.64, desk_z + 0.006)

    ledger_cov = box("right_ledger_cov", -0.13, 0.13, -0.18, 0.18, 0.0, 0.028, BOOK_BROWN, 0.004)
    ledger_cov.location = (0.84, -0.60, desk_z + 0.002)
    ledger_cov.rotation_euler = (0, 0, 0.18)
    ledger_pg = box("right_ledger_pg", -0.122, 0.125, -0.172, 0.172, 0.004, 0.024, PAGES)
    ledger_pg.location = (0.84, -0.60, desk_z + 0.002)
    ledger_pg.rotation_euler = (0, 0, 0.18)

    spare_card_mat = make_paper_card_material("spare_desk_card", ruled=True)
    for c_i in range(4):
        sc = box("spare_card", -0.052, 0.052, -0.036, 0.036, 0.0, 0.0012, spare_card_mat, 0.0004)
        sc.location = (0.44 + c_i * 0.002, -0.38 - c_i * 0.0015, desk_z + 0.0025 + c_i * 0.0013)
        sc.rotation_euler = (0, 0, -0.14 + c_i * 0.035)
    build_pushpin((0.35, -0.41, desk_z + 0.008), PIN_RED, STEEL, radius=0.0080, tilt=(1.15, 0.25, -0.5))
    build_pushpin((0.375, -0.43, desk_z + 0.008), PIN_RED, STEEL, radius=0.0080, tilt=(1.10, -0.35, 0.8))

    # ── 8. LIGHTING MATCHING ROOM IV (WARM BANKER'S LAMP + PICTURE LIGHT + MOON) ──
    world = bpy.data.worlds.new("counting_study_world")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.008, 0.009, 0.016, 1.0)

    lamp(
        "banker_key",
        "POINT",
        (sx, sy - 0.01, sz - 0.025),
        energy=22.0,
        colour=(1.0, 0.76, 0.42),
        size=0.045,
    )
    lamp(
        "banker_desk_wash",
        "AREA",
        (sx + 0.08, sy - 0.08, sz - 0.02),
        aim=(-0.15, -0.60, desk_z),
        energy=18.0,
        colour=(1.0, 0.80, 0.48),
        size=0.26,
        size_y=0.16,
    )
    lamp(
        "drawer_front_fill",
        "AREA",
        (-0.15, -1.75, 0.92),
        aim=(0.0, -0.95, 0.85),
        energy=16.0,
        colour=(1.0, 0.82, 0.56),
        size=1.40,
        size_y=0.35,
    )
    lamp(
        "board_picture_light",
        "AREA",
        (0.0, -0.24, fz1 - 0.05),
        aim=(0.0, -0.020, 1.38),
        energy=24.0,
        colour=(1.0, 0.80, 0.50),
        size=0.95,
        size_y=0.14,
    )
    lamp(
        "cork_even_fill",
        "AREA",
        (-0.20, -1.75, 1.46),
        aim=(0.0, -0.020, 1.36),
        energy=18.0,
        colour=(1.0, 0.84, 0.62),
        size=1.55,
        size_y=0.90,
    )
    lamp(
        "window_moonlight",
        "AREA",
        (1.35, -0.55, 1.52),
        aim=(0.25, -0.35, 1.05),
        energy=13.0,
        colour=(0.56, 0.70, 1.0),
        size=0.55,
        size_y=0.85,
    )
    lamp(
        "stove_ambient",
        "AREA",
        (-1.45, -1.20, 0.95),
        aim=(-0.30, -0.30, 1.10),
        energy=9.5,
        colour=(1.0, 0.56, 0.24),
        size=0.85,
        size_y=0.75,
    )

    clear_glass()
    scene.render.resolution_x = W
    scene.render.resolution_y = H
    scene.render.film_transparent = False
    finish_scene(
        scene,
        SAMPLES,
        exposure=0.0,
        keep_gloss=("green_cased_glass", "crystal_glass", "leaded_glass", "dark_ink", "pushpin_red"),
    )
    scene.render.filepath = os.path.join(OUT, "study.png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED study.png")


# ─────────────────────────────────────────────────────────────────────────────
# 2. RENDER THE 3D RULED INDEX CARD WITH RED PUSHPIN (`index-card.png`)
# ─────────────────────────────────────────────────────────────────────────────

def render_index_card():
    """Render an isolated 3:2 orthographic RGBA cutout of a worn, ruled counting
    house index card pinned at top-center with a 3D crimson-red pushpin."""
    scene = fresh()
    W, H = 960, 640

    cam_d = bpy.data.cameras.new("card_cam")
    cam_d.type = "ORTHO"
    cam_d.ortho_scale = 0.305
    cam = link(bpy.data.objects.new("card_cam", cam_d))
    cam.location = (0.0, -0.60, 0.0)
    cam.rotation_euler = (math.pi / 2, 0.0, 0.0)
    scene.camera = cam

    card_mat = make_paper_card_material(
        "ruled_index_card_mat",
        ruled=True,
        strip_mode=False,
        base_light=(0.74, 0.64, 0.48),
        base_dark=(0.48, 0.37, 0.23),
    )
    pin_red = make_pushpin_red_material("card_pin_red")
    steel = aged_metal(
        "card_pin_steel",
        (0.55, 0.56, 0.58),
        (0.12, 0.11, 0.10),
        rough=(0.22, 0.42),
        scale=40,
        tarnish=0.28,
    )

    card_w, card_h = 0.268, 0.176
    sheet = build_warped_paper_sheet(
        "index_card_mesh",
        card_w,
        card_h,
        card_mat,
        curl_br=0.013,
        curl_tl=0.0025,
        corner_radius=0.0055,
        edge_jitter=0.00022,
        thickness=0.0008,
        seed=307,
    )
    sheet.location = (-0.002, 0.0, -0.003)

    build_pushpin(
        (-0.002, -0.0018, 0.065),
        pin_red,
        steel,
        radius=0.0108,
        tilt=(0.28, -0.11, 0.04),
    )

    catcher = box("card_shadow_catcher", -0.145, 0.148, 0.0022, 0.0045, -0.098, 0.095, plain("catcher", (0.25, 0.16, 0.09), rough=0.95))
    catcher.is_shadow_catcher = True

    world = bpy.data.worlds.new("card_world")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.04, 0.035, 0.03, 1.0)

    lamp(
        "card_key",
        "AREA",
        (-0.09, -0.54, 0.11),
        aim=(0.0, 0.0, 0.0),
        energy=4.8,
        colour=(1.0, 0.90, 0.74),
        size=0.14,
        size_y=0.14,
    )
    lamp(
        "card_fill",
        "AREA",
        (0.10, -0.62, -0.04),
        aim=(0.0, 0.0, 0.0),
        energy=2.6,
        colour=(0.94, 0.95, 1.0),
        size=0.36,
        size_y=0.36,
    )
    lamp(
        "card_rake",
        "AREA",
        (-0.34, -0.08, 0.08),
        aim=(0.0, 0.0, 0.0),
        energy=2.4,
        colour=(1.0, 0.84, 0.62),
        size=0.09,
        size_y=0.14,
    )

    scene.render.resolution_x = W
    scene.render.resolution_y = H
    scene.render.film_transparent = True
    finish_scene(scene, SAMPLES, exposure=-0.38, keep_gloss=("card_pin_red",))
    scene.render.filepath = os.path.join(OUT, "index-card.png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED index-card.png")


# ─────────────────────────────────────────────────────────────────────────────
# 3. RENDER THE 3D CLUE NOTE CARD WITH BRASS TACK (`note-card.png`)
# ─────────────────────────────────────────────────────────────────────────────

def render_note_card():
    """Render an isolated 3:2 orthographic RGBA cutout of a worn, unruled
    parchment/manila clue note with a curled bottom-right corner and an aged
    brass drawing pin at the very top edge."""
    scene = fresh()
    W, H = 960, 640

    cam_d = bpy.data.cameras.new("note_cam")
    cam_d.type = "ORTHO"
    cam_d.ortho_scale = 0.305
    cam = link(bpy.data.objects.new("note_cam", cam_d))
    cam.location = (0.0, -0.60, 0.0)
    cam.rotation_euler = (math.pi / 2, 0.0, 0.0)
    scene.camera = cam

    note_mat = make_paper_card_material(
        "clue_note_mat",
        ruled=False,
        strip_mode=False,
        base_light=(0.76, 0.65, 0.46),
        base_dark=(0.48, 0.36, 0.21),
    )
    brass = aged_metal(
        "note_tack_brass",
        (0.72, 0.53, 0.23),
        (0.16, 0.11, 0.05),
        rough=(0.20, 0.42),
        scale=32,
        tarnish=0.36,
    )
    steel = aged_metal(
        "note_tack_steel",
        (0.54, 0.55, 0.58),
        (0.12, 0.11, 0.10),
        rough=(0.24, 0.45),
        scale=40,
        tarnish=0.32,
    )

    card_w, card_h = 0.268, 0.176
    sheet = build_warped_paper_sheet(
        "note_card_mesh",
        card_w,
        card_h,
        note_mat,
        curl_br=0.018,
        curl_tl=0.0035,
        corner_radius=0.0045,
        edge_jitter=0.00028,
        thickness=0.0007,
        seed=509,
    )
    sheet.location = (-0.002, 0.0, -0.002)

    build_brass_tack(
        (-0.002, -0.0018, 0.072),
        brass,
        steel,
        radius=0.0098,
        tilt=(0.06, -0.04, 0.03),
    )

    catcher = box("note_shadow_catcher", -0.145, 0.148, 0.0022, 0.0045, -0.098, 0.095, plain("note_catcher", (0.25, 0.16, 0.09), rough=0.95))
    catcher.is_shadow_catcher = True

    world = bpy.data.worlds.new("note_world")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.04, 0.035, 0.03, 1.0)

    lamp(
        "note_key",
        "AREA",
        (-0.08, -0.54, 0.10),
        aim=(0.0, 0.0, 0.04),
        energy=4.8,
        colour=(1.0, 0.89, 0.72),
        size=0.16,
        size_y=0.16,
    )
    lamp(
        "note_fill",
        "AREA",
        (0.08, -0.62, 0.02),
        aim=(0.0, 0.0, 0.04),
        energy=2.6,
        colour=(0.96, 0.94, 0.90),
        size=0.38,
        size_y=0.38,
    )
    lamp(
        "note_rake",
        "AREA",
        (-0.34, -0.08, 0.08),
        aim=(0.0, 0.0, 0.0),
        energy=2.5,
        colour=(1.0, 0.84, 0.62),
        size=0.09,
        size_y=0.14,
    )

    scene.render.resolution_x = W
    scene.render.resolution_y = H
    scene.render.film_transparent = True
    finish_scene(scene, SAMPLES, exposure=-0.38)
    scene.render.filepath = os.path.join(OUT, "note-card.png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED note-card.png")


# ─────────────────────────────────────────────────────────────────────────────
# 4. RENDER THE 3D PINNED LEDGER STRIP (`ledger-strip.png`)
# ─────────────────────────────────────────────────────────────────────────────

def render_ledger_strip():
    """Render an isolated 1400 x 260 orthographic RGBA cutout of the long
    accounting paper slip pinned with two 3D crimson-red pushpins."""
    scene = fresh()
    W, H = 1400, 260

    cam_d = bpy.data.cameras.new("strip_cam")
    cam_d.type = "ORTHO"
    cam_d.ortho_scale = 0.56
    cam = link(bpy.data.objects.new("strip_cam", cam_d))
    cam.location = (0.0, -0.60, 0.0)
    cam.rotation_euler = (math.pi / 2, 0.0, 0.0)
    scene.camera = cam

    strip_mat = make_paper_card_material(
        "ledger_strip_mat",
        ruled=False,
        strip_mode=True,
        base_light=(0.75, 0.65, 0.49),
        base_dark=(0.49, 0.38, 0.24),
    )
    pin_red = make_pushpin_red_material("strip_pin_red")
    steel = aged_metal(
        "strip_pin_steel",
        (0.55, 0.56, 0.58),
        (0.12, 0.11, 0.10),
        rough=(0.22, 0.42),
        scale=40,
        tarnish=0.28,
    )

    strip_w, strip_h = 0.515, 0.080
    sheet = build_warped_paper_sheet(
        "ledger_strip_mesh",
        strip_w,
        strip_h,
        strip_mat,
        curl_br=0.0075,
        curl_tl=0.0020,
        corner_radius=0.0035,
        edge_jitter=0.00018,
        thickness=0.0006,
        seed=703,
    )
    sheet.location = (-0.002, 0.0, 0.001)

    for side in (-1, 1):
        build_pushpin(
            (side * 0.228 - 0.002, -0.0016, 0.017),
            pin_red,
            steel,
            radius=0.0086,
            tilt=(0.24, side * -0.09, side * 0.04),
        )

    catcher = box("strip_shadow_catcher", -0.268, 0.270, 0.0020, 0.0045, -0.046, 0.045, plain("strip_catcher", (0.25, 0.16, 0.09), rough=0.95))
    catcher.is_shadow_catcher = True

    world = bpy.data.worlds.new("strip_world")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.04, 0.035, 0.03, 1.0)

    lamp(
        "strip_key",
        "AREA",
        (-0.10, -0.54, 0.10),
        aim=(0.0, 0.0, 0.0),
        energy=5.0,
        colour=(1.0, 0.90, 0.74),
        size=0.22,
        size_y=0.14,
    )
    lamp(
        "strip_fill",
        "AREA",
        (0.10, -0.62, -0.04),
        aim=(0.0, 0.0, 0.0),
        energy=2.6,
        colour=(0.94, 0.95, 1.0),
        size=0.46,
        size_y=0.22,
    )

    scene.render.resolution_x = W
    scene.render.resolution_y = H
    scene.render.film_transparent = True
    finish_scene(scene, SAMPLES, exposure=-0.38, keep_gloss=("strip_pin_red",))
    scene.render.filepath = os.path.join(OUT, "ledger-strip.png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED ledger-strip.png")


if "study" in ONLY:
    render_study_background()
if "index_card" in ONLY:
    render_index_card()
if "note_card" in ONLY:
    render_note_card()
if "strip" in ONLY:
    render_ledger_strip()
print("SEQUENCE_ALL_DONE")
