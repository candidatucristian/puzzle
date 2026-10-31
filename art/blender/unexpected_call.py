# Photorealistic 3D Blender Cycles renders for the "An Unexpected Call"
# (MobilePhone) puzzle room, matching the Captain's Cabin (Room3):
#   1. desk.png    (2304 x 1536 RGB)  -> frontal-desk-photographic-v2.webp (1536 x 1024)
#                                     -> walnut-desk-photographic-v1.webp  (1536 x 1024)
#   2. cradle.png  (1774 x 887  RGBA) -> charging-cradle-photographic-v1.webp
#   3. handset.png (857  x 1835 RGBA) -> handset-photographic-v1.webp
#
# Usage:
#   blender -b --factory-startup -P art/blender/unexpected_call.py -- [--samples 320]

import bpy, bmesh, math, os, sys, json
from mathutils import Vector, Matrix, Euler
from bpy_extras.object_utils import world_to_camera_view

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import ROOT, scan, detail_scans, clear_glass

OUT = os.path.join(ROOT, ".artifacts/mobilephone")
DRAWN = os.path.join(ROOT, ".artifacts/rooms")
os.makedirs(OUT, exist_ok=True)

SAMPLES = int(arg("--samples", "320"))
ONLY = set(arg("--only", "desk,cradle,handset").split(","))


def finish_scene(scene, samples, exposure=0.0, keep_gloss=()):
    """Switch to Cycles GPU (OptiX/CUDA), configure OIDN denoiser with albedo+normal
    passes, clamp indirect fireflies, wire normal maps, and enforce realistic matte
    roughness floors."""
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
            o.visible_glossy = False
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


def fine_grained_polymer(
    name,
    base_color=(0.075, 0.078, 0.084),
    edge_color=(0.115, 0.120, 0.128),
    rough_range=(0.40, 0.64),
    grain_scale=1400.0,
    bump_strength=0.18,
    metallic=0.0,
):
    """Authentic 1990s matte ABS / elastomer / bakelite material with ultra-fine
    micro-pebble mold texture, ambient-occlusion crevice darkening, and subtle
    edge wear."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    N = m.node_tree.nodes
    L = m.node_tree.links.new
    b = N["Principled BSDF"]
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Specular IOR Level"].default_value = 0.35
    b.inputs["Coat Weight"].default_value = 0.0

    tc = N.new("ShaderNodeTexCoord")
    mp = N.new("ShaderNodeMapping")
    L(tc.outputs["Object"], mp.inputs["Vector"])

    n_fine = N.new("ShaderNodeTexNoise")
    n_fine.inputs["Scale"].default_value = grain_scale
    n_fine.inputs["Detail"].default_value = 6.0
    n_fine.inputs["Roughness"].default_value = 0.65
    L(mp.outputs["Vector"], n_fine.inputs["Vector"])

    n_broad = N.new("ShaderNodeTexNoise")
    n_broad.inputs["Scale"].default_value = 18.0
    n_broad.inputs["Detail"].default_value = 4.0
    n_broad.inputs["Roughness"].default_value = 0.6
    L(mp.outputs["Vector"], n_broad.inputs["Vector"])

    bev = N.new("ShaderNodeBevel")
    bev.samples = 4
    bev.inputs["Radius"].default_value = 0.008
    gm = N.new("ShaderNodeNewGeometry")
    dt = N.new("ShaderNodeVectorMath")
    dt.operation = "DOT_PRODUCT"
    L(gm.outputs["Normal"], dt.inputs[0])
    L(bev.outputs["Normal"], dt.inputs[1])
    ed_map = N.new("ShaderNodeMapRange")
    ed_map.inputs["From Min"].default_value = 0.78
    ed_map.inputs["From Max"].default_value = 0.995
    ed_map.inputs["To Min"].default_value = 0.38
    ed_map.inputs["To Max"].default_value = 0.0
    L(dt.outputs["Value"], ed_map.inputs["Value"])

    col_mix = N.new("ShaderNodeMix")
    col_mix.data_type = "RGBA"
    col_mix.inputs[6].default_value = (*base_color, 1.0)
    col_mix.inputs[7].default_value = (*edge_color, 1.0)
    L(ed_map.outputs["Result"], col_mix.inputs["Factor"])

    ao = N.new("ShaderNodeAmbientOcclusion")
    ao.samples = 8
    ao.inputs["Distance"].default_value = 0.06
    ao_ramp = N.new("ShaderNodeMapRange")
    ao_ramp.inputs["From Min"].default_value = 0.0
    ao_ramp.inputs["From Max"].default_value = 1.0
    ao_ramp.inputs["To Min"].default_value = 0.52
    ao_ramp.inputs["To Max"].default_value = 1.0
    L(ao.outputs["AO"], ao_ramp.inputs["Value"])

    ao_mul = N.new("ShaderNodeMix")
    ao_mul.data_type = "RGBA"
    ao_mul.blend_type = "MULTIPLY"
    ao_mul.inputs["Factor"].default_value = 1.0
    L(col_mix.outputs[2], ao_mul.inputs[6])
    L(ao_ramp.outputs["Result"], ao_mul.inputs[7])
    L(ao_mul.outputs[2], b.inputs["Base Color"])

    r_mix = N.new("ShaderNodeMix")
    r_mix.data_type = "FLOAT"
    r_mix.inputs["Factor"].default_value = 0.45
    L(n_fine.outputs["Fac"], r_mix.inputs[2])
    L(n_broad.outputs["Fac"], r_mix.inputs[3])

    r_map = N.new("ShaderNodeMapRange")
    r_map.inputs["To Min"].default_value = rough_range[0]
    r_map.inputs["To Max"].default_value = rough_range[1]
    L(r_mix.outputs[0], r_map.inputs["Value"])
    L(r_map.outputs["Result"], b.inputs["Roughness"])

    bp = N.new("ShaderNodeBump")
    bp.inputs["Strength"].default_value = bump_strength
    bp.inputs["Distance"].default_value = 0.00035
    L(n_fine.outputs["Fac"], bp.inputs["Height"])
    L(bp.outputs["Normal"], b.inputs["Normal"])
    m["detailed"] = True
    return m


def cyl(name, center, r, h, mat, verts=32):
    """Vertical cylinder centered at (center.x, center.y) from z=center.z to center.z+h."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=verts,
        radius1=r,
        radius2=r,
        depth=h,
    )
    for v in bm.verts:
        v.co += Vector((center[0], center[1], center[2] + h * 0.5))
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me))
    for p in o.data.polygons:
        p.use_smooth = True
    if mat:
        o.data.materials.append(mat)
    return o


def lathe(name, profile, segs=48, mat=None):
    """Revolve a 2D (r, z) profile around the Z axis."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        ring = []
        for i in range(segs):
            a = 2.0 * math.pi * i / segs
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings.append(ring)
    for k in range(len(rings) - 1):
        r0, r1 = rings[k], rings[k + 1]
        for i in range(segs):
            ni = (i + 1) % segs
            bm.faces.new([r0[i], r0[ni], r1[ni], r1[i]])
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me))
    for p in o.data.polygons:
        p.use_smooth = True
    if mat:
        o.data.materials.append(mat)
    return o


def curve_tube(name, points, radius, mat, cyclic=False, res=16):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 8
    cu.resolution_u = res
    sp = cu.splines.new("BEZIER" if len(points) > 2 else "POLY")
    if sp.type == "BEZIER":
        sp.bezier_points.add(len(points) - 1)
        for i, p in enumerate(points):
            bp = sp.bezier_points[i]
            bp.co = p
            bp.handle_left_type = bp.handle_right_type = "AUTO"
    else:
        sp.points.add(len(points) - 1)
        for i, p in enumerate(points):
            sp.points[i].co = (*p, 1.0)
    sp.use_cyclic_u = cyclic
    o = link(bpy.data.objects.new(name, cu))
    if mat:
        o.data.materials.append(mat)
    return o


def solidify(o, thickness):
    mod = o.modifiers.new("Solidify", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = -1.0
    mod.use_even_offset = True
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return o


def world_tint(scene, color, strength):
    w = bpy.data.worlds.new("world")
    w.use_nodes = True
    scene.world = w
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*color, 1.0)
    bg.inputs["Strength"].default_value = strength


def uv_box(
    name, x0, x1, y0, y1, z0, z1, mat, bevel_r=0.003, uv_scale=1.0, uv_offset=(0.0, 0.0)
):
    """Create a timber plank box with UVs oriented so the scan's vertical V grain
    runs horizontally along the X axis of the plank."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((
            x0 + (v.co.x + 0.5) * (x1 - x0),
            y0 + (v.co.y + 0.5) * (y1 - y0),
            z0 + (v.co.z + 0.5) * (z1 - z0),
        ))
    uv = bm.loops.layers.uv.new()
    u0, v0 = uv_offset
    for f in bm.faces:
        n = f.normal
        for lp in f.loops:
            co = lp.vert.co
            if abs(n.z) > 0.5:
                lp[uv].uv = (co.y * uv_scale + u0, co.x * uv_scale * 0.45 + v0)
            elif abs(n.y) > 0.5:
                lp[uv].uv = (co.z * uv_scale + u0, co.x * uv_scale * 0.45 + v0)
            else:
                lp[uv].uv = (co.y * uv_scale + u0, co.z * uv_scale + v0)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me))
    if mat:
        o.data.materials.append(mat)
    if bevel_r > 0:
        bevel(o, bevel_r, 2)
    return o


# ═══════════════════════════════════════════════════════════════════════════
# 1. CAPTAIN'S CABIN DESK (frontal-desk-photographic-v2.webp)
# ═══════════════════════════════════════════════════════════════════════════
def render_desk():
    scene = fresh()
    W, H = 2304, 1536
    scene.render.resolution_x = W
    scene.render.resolution_y = H
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGB"

    cd = bpy.data.cameras.new("eye")
    cd.sensor_fit = "HORIZONTAL"
    cd.sensor_width = 36.0
    cd.lens = 28.0
    cd.clip_start = 0.05
    cd.clip_end = 40.0
    cd.dof.use_dof = True
    cd.dof.focus_distance = 0.98
    cd.dof.aperture_fstop = 6.3

    cam_pos = Vector((0.0, -0.96, 0.44))
    cam_look = Vector((0.0, 0.12, 0.14))
    cam = link(bpy.data.objects.new("eye", cd))
    cam.location = cam_pos
    cam.rotation_euler = (cam_look - cam_pos).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam

    # ── Materials ──────────────────────────────────────────────────────────
    MAHOGANY = scan(
        "mahogany",
        "rosewood_veneer1",
        size=0.80,
        tint=(0.64, 0.36, 0.22),
        bright=0.45,
        sat=0.95,
        rough=(0.44, 0.72),
        bump=0.50,
        coat=0.0,
        uvs=True,
        dirt=0.32,
        stains=0.20,
        edges=0.10,
    )
    MAHOGANY_TRIM = scan(
        "mahogany trim",
        "rosewood_veneer1",
        size=0.65,
        tint=(0.54, 0.30, 0.18),
        bright=0.38,
        sat=0.9,
        rough=(0.46, 0.74),
        bump=0.42,
        uvs=True,
    )
    BULKHEAD = scan(
        "bulkhead planks",
        "dark_wooden_planks",
        size=1.0,
        tint=(0.44, 0.50, 0.56),
        bright=0.34,
        sat=0.45,
        rough=(0.64, 0.88),
        bump=0.65,
        dirt=0.42,
        stains=0.22,
    )
    DADO = scan(
        "dado navy",
        "dark_wood",
        size=0.85,
        tint=(0.16, 0.24, 0.33),
        bright=0.28,
        sat=0.78,
        rough=(0.56, 0.84),
        bump=0.45,
        dirt=0.35,
    )
    BRASS = aged_metal(
        "aged brass",
        (0.66, 0.48, 0.21),
        (0.10, 0.07, 0.03),
        rough=(0.24, 0.50),
        scale=28,
        tarnish=0.48,
    )
    GOLD_NIB = aged_metal(
        "gold nib",
        (0.84, 0.65, 0.26),
        (0.18, 0.12, 0.05),
        rough=(0.18, 0.36),
        scale=45,
        tarnish=0.22,
    )
    DARK_IRON = aged_metal(
        "dark iron",
        (0.09, 0.09, 0.10),
        (0.03, 0.03, 0.03),
        rough=(0.40, 0.70),
        scale=30,
        tarnish=0.55,
    )
    GLASS = plain(
        "porthole glass", (0.94, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.15
    )

    GREEN_GLASS = bpy.data.materials.new("green glass shade")
    GREEN_GLASS.use_nodes = True
    _gn = GREEN_GLASS.node_tree.nodes
    _gl = GREEN_GLASS.node_tree.links.new
    _gb = _gn["Principled BSDF"]
    _gb.inputs["Base Color"].default_value = (0.015, 0.20, 0.055, 1.0)
    _gb.inputs["Roughness"].default_value = 0.16
    _gb.inputs["Emission Color"].default_value = (0.12, 0.76, 0.25, 1.0)
    _gb.inputs["Emission Strength"].default_value = 1.6
    _gtr = _gn.new("ShaderNodeBsdfTranslucent")
    _gtr.inputs["Color"].default_value = (0.20, 0.86, 0.32, 1.0)
    _gmx = _gn.new("ShaderNodeMixShader")
    _gmx.inputs["Fac"].default_value = 0.38
    _gl(_gb.outputs["BSDF"], _gmx.inputs[1])
    _gl(_gtr.outputs["BSDF"], _gmx.inputs[2])
    _gl(_gmx.outputs["Shader"], _gn["Material Output"].inputs["Surface"])

    OPAL_LINER = plain(
        "opal liner",
        (1.0, 0.92, 0.74),
        rough=0.3,
        emit=(1.0, 0.78, 0.42),
        strength=8.5,
    )
    CERAMIC_MUG = scan(
        "ceramic mug",
        "plastered_wall_04",
        size=0.35,
        tint=(0.76, 0.70, 0.60),
        bright=0.78,
        sat=0.35,
        rough=(0.38, 0.56),
        bump=0.14,
        dirt=0.25,
        stains=0.18,
    )
    CERAMIC_RIM = plain("ceramic rim brown", (0.24, 0.14, 0.08), rough=0.40)
    COFFEE_LIQUID = plain("black coffee", (0.012, 0.007, 0.004), rough=0.05)
    CREMA = plain("coffee crema", (0.26, 0.15, 0.07), rough=0.46)
    PEN_BODY = fine_grained_polymer(
        "ebonite pen",
        (0.032, 0.024, 0.022),
        (0.065, 0.048, 0.042),
        rough_range=(0.32, 0.48),
        grain_scale=900.0,
        bump_strength=0.06,
    )
    CORK = scan(
        "cork coaster",
        "white_plaster_rough_01",
        size=0.18,
        tint=(0.48, 0.34, 0.21),
        bright=0.62,
        sat=0.75,
        rough=(0.78, 0.94),
        bump=0.55,
    )

    # ── 1A. Mahogany Desk Top (Planks + Front Bullnose + Brass Corner Brackets)
    plank_bounds = [(-0.46, -0.14), (-0.14, 0.18), (0.18, 0.44)]
    for i, (y0, y1) in enumerate(plank_bounds):
        uv_box(
            f"desk plank {i}",
            -1.05,
            1.05,
            y0,
            y1 - 0.0018,
            -0.045,
            0.0,
            MAHOGANY,
            bevel_r=0.0025,
            uv_scale=0.72,
            uv_offset=(i * 0.37, i * 0.53),
        )

    uv_box(
        "desk front molding",
        -1.05,
        1.05,
        -0.485,
        -0.458,
        -0.052,
        0.003,
        MAHOGANY_TRIM,
        bevel_r=0.004,
        uv_scale=0.75,
        uv_offset=(0.15, 0.25),
    )

    for side in (-1, 1):
        bx = side * 0.50
        by = -0.26
        b1 = box(
            "brass corner leg1",
            bx - 0.045 if side > 0 else bx,
            bx if side > 0 else bx + 0.045,
            by - 0.014,
            by + 0.014,
            -0.0005,
            0.0016,
            BRASS,
        )
        bevel(b1, 0.0006, 2)
        b2 = box(
            "brass corner leg2",
            bx - 0.014,
            bx + 0.014,
            by - 0.014,
            by + 0.045,
            -0.0005,
            0.0016,
            BRASS,
        )
        bevel(b2, 0.0006, 2)
        for sx, sy in (
            (bx - side * 0.032, by),
            (bx, by + 0.032),
            (bx - side * 0.005, by + 0.005),
        ):
            sc = cyl("brass screw", (sx, sy, 0.0014), 0.0025, 0.001, BRASS, verts=16)
            bevel(sc, 0.0004, 1)

    # ── 1B. Captain's Cabin Bulkhead Wall, Dado Wainscoting, Porthole & Chart
    wall_y = 0.44
    dado_top = 0.21
    px_port, pz_port = 0.37, 0.42
    r_glass, r_flange = 0.105, 0.138

    port_cutter = cyl(
        "porthole cutter", (0, 0, 0), r_glass + 0.012, 0.16, None, verts=48
    )
    port_cutter.rotation_euler = (math.pi / 2, 0, 0)
    port_cutter.location = (px_port, wall_y + 0.08, pz_port)

    for i in range(8):
        z0 = dado_top + i * 0.095
        z1 = z0 + 0.0942
        p = box("ship plank", -1.25, 1.25, wall_y, wall_y + 0.04, z0, z1, BULKHEAD)
        bevel(p, 0.0025, 2)
        if z0 < pz_port + r_flange and z1 > pz_port - r_flange:
            bm_mod = p.modifiers.new("PortholeCut", "BOOLEAN")
            bm_mod.operation = "DIFFERENCE"
            bm_mod.solver = "EXACT"
            bm_mod.object = port_cutter
            bpy.context.view_layer.objects.active = p
            for m in list(p.modifiers):
                bpy.ops.object.modifier_apply(modifier=m.name)

    bpy.data.objects.remove(port_cutter, do_unlink=True)

    dado_base = box(
        "dado backing", -1.25, 1.25, wall_y - 0.012, wall_y, -0.05, dado_top, DADO
    )
    bevel(dado_base, 0.002, 1)
    rail = uv_box(
        "dado rail",
        -1.25,
        1.25,
        wall_y - 0.030,
        wall_y,
        dado_top - 0.024,
        dado_top + 0.010,
        MAHOGANY_TRIM,
        bevel_r=0.004,
    )
    skirting = uv_box(
        "desk backstop",
        -1.25,
        1.25,
        wall_y - 0.026,
        wall_y,
        0.0,
        0.026,
        MAHOGANY_TRIM,
        bevel_r=0.003,
    )

    n_panels = 7
    pw = 2.10 / n_panels
    for i in range(n_panels):
        px0 = -1.05 + i * pw
        px1 = px0 + pw
        stile = box(
            "dado stile",
            px0 - 0.014,
            px0 + 0.014,
            wall_y - 0.022,
            wall_y - 0.010,
            0.02,
            dado_top - 0.022,
            DADO,
        )
        bevel(stile, 0.002, 2)
        panel = box(
            "dado raised panel",
            px0 + 0.028,
            px1 - 0.028,
            wall_y - 0.020,
            wall_y - 0.010,
            0.042,
            dado_top - 0.042,
            DADO,
        )
        bevel(panel, 0.005, 2)

    # Brass Ship's Porthole on the upper right bulkhead (looking out at moonlit night)
    sky_mat = plain(
        "night sky",
        (0.018, 0.032, 0.058),
        rough=1.0,
        emit=(0.14, 0.24, 0.44),
        strength=1.5,
    )
    box(
        "night sky card",
        px_port - 0.16,
        px_port + 0.16,
        wall_y + 0.28,
        wall_y + 0.30,
        pz_port - 0.16,
        pz_port + 0.16,
        sky_mat,
    )
    moon_mat = plain(
        "moon",
        (0.92, 0.95, 1.0),
        rough=0.2,
        emit=(0.88, 0.93, 1.0),
        strength=6.5,
    )
    moon = lathe(
        "moon disc",
        [(0.0, 0.0), (0.024, 0.0), (0.024, 0.003), (0.0, 0.003)],
        32,
        moon_mat,
    )
    moon.rotation_euler = (math.pi / 2, 0, 0)
    moon.location = (px_port + 0.035, wall_y + 0.26, pz_port + 0.038)

    foliage_mat = plain("night foliage", (0.012, 0.020, 0.016), rough=0.92)
    for tx, tz, tr in (
        (px_port - 0.055, pz_port - 0.048, 0.060),
        (px_port - 0.012, pz_port - 0.070, 0.050),
        (px_port + 0.065, pz_port - 0.060, 0.045),
    ):
        me = bpy.data.meshes.new("tree crown")
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=2, radius=tr)
        bm.to_mesh(me)
        bm.free()
        to = link(bpy.data.objects.new("tree crown", me))
        to.location = (tx, wall_y + 0.16, tz)
        to.scale = (1.2, 0.35, 0.9)
        to.data.materials.append(foliage_mat)

    port_ring = lathe(
        "porthole ring",
        [
            (r_glass - 0.004, -0.045),
            (r_flange, -0.045),
            (r_flange, 0.020),
            (r_flange - 0.010, 0.032),
            (r_glass + 0.008, 0.032),
            (r_glass, 0.022),
            (r_glass - 0.004, 0.022),
            (r_glass - 0.004, -0.045),
        ],
        48,
        BRASS,
    )
    port_ring.rotation_euler = (math.pi / 2, 0, 0)
    port_ring.location = (px_port, wall_y + 0.002, pz_port)

    r_bolt = (r_glass + r_flange) * 0.5
    for k in range(8):
        ang = k * math.pi / 4.0 + math.pi / 8.0
        bx = px_port + math.cos(ang) * r_bolt
        bz = pz_port + math.sin(ang) * r_bolt
        bolt = cyl("porthole bolt", (0, 0, 0), 0.0055, 0.010, BRASS, verts=6)
        bolt.rotation_euler = (math.pi / 2, ang, 0)
        bolt.location = (bx, wall_y - 0.016, bz)

    for side in (-1, 1):
        dog = box(
            "porthole dog",
            px_port + side * (r_flange - 0.004) - 0.009,
            px_port + side * (r_flange - 0.004) + 0.009,
            wall_y - 0.038,
            wall_y - 0.008,
            pz_port - 0.014,
            pz_port + 0.014,
            BRASS,
        )
        bevel(dog, 0.003, 2)

    p_glass = lathe(
        "porthole glass",
        [(0.0, 0.0), (r_glass, 0.0), (r_glass, 0.005), (0.0, 0.005)],
        48,
        GLASS,
    )
    p_glass.rotation_euler = (math.pi / 2, 0, 0)
    p_glass.location = (px_port, wall_y - 0.004, pz_port)

    # Framed Nautical Chart on the Bulkhead (center-left)
    fx, fz = -0.02, 0.42
    fw, fh = 0.145, 0.108
    f_outer = uv_box(
        "picture frame",
        fx - fw,
        fx + fw,
        wall_y - 0.022,
        wall_y + 0.001,
        fz - fh,
        fz + fh,
        MAHOGANY_TRIM,
        bevel_r=0.004,
    )
    f_brass = box(
        "picture brass liner",
        fx - fw + 0.018,
        fx + fw - 0.018,
        wall_y - 0.024,
        wall_y - 0.016,
        fz - fh + 0.018,
        fz + fh - 0.018,
        BRASS,
    )
    bevel(f_brass, 0.0015, 1)

    chart_img_path = os.path.join(OUT, "nautical_chart.png")
    if os.path.exists(chart_img_path):
        art_mat = bpy.data.materials.new("nautical chart print")
        art_mat.use_nodes = True
        _an = art_mat.node_tree.nodes
        _al = art_mat.node_tree.links.new
        _ab = _an["Principled BSDF"]
        _ti = _an.new("ShaderNodeTexImage")
        _ti.image = bpy.data.images.load(chart_img_path, check_existing=True)
        _hs = _an.new("ShaderNodeHueSaturation")
        _hs.inputs["Value"].default_value = 0.62
        _hs.inputs["Saturation"].default_value = 0.85
        _al(_ti.outputs["Color"], _hs.inputs["Color"])
        _al(_hs.outputs["Color"], _ab.inputs["Base Color"])
        _ab.inputs["Roughness"].default_value = 0.78
    else:
        art_mat = plain("parchment print", (0.58, 0.52, 0.40), rough=0.8)

    me_art = bpy.data.meshes.new("picture canvas")
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new()
    f = bm.faces.new([
        bm.verts.new((fx - fw + 0.022, wall_y - 0.025, fz - fh + 0.022)),
        bm.verts.new((fx + fw - 0.022, wall_y - 0.025, fz - fh + 0.022)),
        bm.verts.new((fx + fw - 0.022, wall_y - 0.025, fz + fh - 0.022)),
        bm.verts.new((fx - fw + 0.022, wall_y - 0.025, fz + fh - 0.022)),
    ])
    for lp, (u, v) in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        lp[uv].uv = (u, v)
    bm.to_mesh(me_art)
    bm.free()
    o_art = link(bpy.data.objects.new("picture canvas", me_art))
    o_art.data.materials.append(art_mat)

    # ── 1C. Antique Brass Banker's Lamp with Emerald Green Shade (Top-Left) ──
    lx, ly = -0.39, 0.17
    lamp_base = lathe(
        "banker lamp base",
        [
            (0.0, 0.0),
            (0.088, 0.0),
            (0.090, 0.010),
            (0.082, 0.016),
            (0.072, 0.024),
            (0.056, 0.036),
            (0.024, 0.048),
            (0.016, 0.062),
            (0.012, 0.195),
            (0.019, 0.205),
            (0.014, 0.218),
            (0.0, 0.218),
        ],
        48,
        BRASS,
    )
    lamp_base.location = (lx, ly, 0.0)

    for side in (-1, 1):
        curve_tube(
            "lamp yoke arm",
            [
                (lx, ly, 0.205),
                (lx + side * 0.065, ly, 0.215),
                (lx + side * 0.108, ly - 0.012, 0.245),
                (lx + side * 0.108, ly - 0.016, 0.275),
            ],
            0.005,
            BRASS,
        )
        knob = cyl("lamp thumbscrew", (0, 0, 0), 0.012, 0.016, BRASS, verts=20)
        knob.rotation_euler = (0, math.pi / 2, 0)
        knob.location = (
            lx + side * 0.114 if side < 0 else lx + side * 0.100,
            ly - 0.016,
            0.275,
        )
        bevel(knob, 0.002, 1)

    def make_banker_shade(name, radius, half_len, mat):
        me = bpy.data.meshes.new(name)
        bm = bmesh.new()
        segs = 32
        cols = 16
        grid = []
        for i in range(cols + 1):
            x = -half_len + (2.0 * half_len) * (i / cols)
            end_k = 1.0 - 0.06 * ((x / half_len) ** 4)
            ring = []
            for j in range(segs + 1):
                ang = -0.18 + (math.pi + 0.32) * (j / segs)
                y = -math.cos(ang) * radius * end_k
                z = math.sin(ang) * radius * 0.86 * end_k
                ring.append(bm.verts.new((x, y, z)))
            grid.append(ring)
        for i in range(cols):
            for j in range(segs):
                bm.faces.new([
                    grid[i][j],
                    grid[i + 1][j],
                    grid[i + 1][j + 1],
                    grid[i][j + 1],
                ])
        for side_idx, sign in ((0, -1), (cols, 1)):
            c_vert = bm.verts.new((sign * half_len * 0.98, 0.0, radius * 0.22))
            ring = grid[side_idx]
            for j in range(segs):
                if sign < 0:
                    bm.faces.new([c_vert, ring[j + 1], ring[j]])
                else:
                    bm.faces.new([c_vert, ring[j], ring[j + 1]])
        bm.to_mesh(me)
        bm.free()
        o = link(bpy.data.objects.new(name, me))
        for p in o.data.polygons:
            p.use_smooth = True
        solidify(o, 0.0035)
        o.data.materials.append(mat)
        return o

    shade_outer = make_banker_shade("emerald shade", 0.064, 0.102, GREEN_GLASS)
    shade_outer.location = (lx, ly - 0.016, 0.262)
    shade_outer.rotation_euler = (0.20, 0.0, 0.22)

    shade_inner = make_banker_shade("opal liner shade", 0.059, 0.096, OPAL_LINER)
    shade_inner.location = (lx, ly - 0.016, 0.260)
    shade_inner.rotation_euler = (0.20, 0.0, 0.22)

    for k in range(13):
        cz = 0.245 - k * 0.0085
        me_b = bpy.data.meshes.new("chain bead")
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.0026)
        bm.to_mesh(me_b)
        bm.free()
        bo = link(bpy.data.objects.new("chain bead", me_b))
        bo.location = (lx + 0.044, ly - 0.032, cz)
        bo.data.materials.append(BRASS)
    acorn = lathe(
        "chain acorn",
        [
            (0.0, 0.0),
            (0.0045, 0.004),
            (0.0055, 0.010),
            (0.003, 0.015),
            (0.0, 0.016),
        ],
        16,
        BRASS,
    )
    acorn.location = (lx + 0.044, ly - 0.032, 0.245 - 13 * 0.0085 - 0.012)

    # ── 1D. Stoneware Coffee Mug & Hot Black Coffee (Bottom-Left) ──────────
    mx, my = -0.34, -0.07
    r_mug = 0.046
    h_mug = 0.088
    z_coffee = 0.074

    coaster = lathe(
        "cork coaster",
        [(0.0, 0.0), (0.056, 0.0), (0.056, 0.0045), (0.0, 0.0045)],
        48,
        CORK,
    )
    coaster.location = (mx, my, 0.0)
    coaster_rim = lathe(
        "coaster brass rim",
        [
            (0.054, 0.0),
            (0.058, 0.0),
            (0.058, 0.006),
            (0.055, 0.006),
            (0.054, 0.0045),
        ],
        48,
        BRASS,
    )
    coaster_rim.location = (mx, my, 0.0)

    mug_body = lathe(
        "stoneware mug",
        [
            (0.0, 0.0045),
            (r_mug * 0.88, 0.0045),
            (r_mug * 0.92, 0.010),
            (r_mug * 1.02, 0.036),
            (r_mug * 0.99, 0.072),
            (r_mug * 1.03, h_mug - 0.003),
            (r_mug * 0.98, h_mug),
            (r_mug * 0.90, h_mug - 0.003),
            (r_mug * 0.88, 0.014),
            (0.0, 0.014),
        ],
        56,
        CERAMIC_MUG,
    )
    mug_body.location = (mx, my, 0.0)

    mug_band = lathe(
        "mug glaze band",
        [
            (r_mug * 0.985, h_mug - 0.014),
            (r_mug * 1.033, h_mug - 0.003),
            (r_mug * 0.98, h_mug + 0.0004),
            (r_mug * 0.898, h_mug - 0.003),
            (r_mug * 0.898, h_mug - 0.011),
        ],
        56,
        CERAMIC_RIM,
    )
    mug_band.location = (mx, my, 0.0)

    h_angle = -2.35
    hx_dir, hy_dir = math.cos(h_angle), math.sin(h_angle)
    handle_pts = []
    for k in range(9):
        t = k / 8.0
        ang = (t - 0.5) * math.pi * 0.92
        out = r_mug * 0.95 + math.cos(ang) * 0.028
        hz = 0.048 - math.sin(ang) * 0.027
        handle_pts.append((mx + hx_dir * out, my + hy_dir * out, hz))
    mug_handle = curve_tube("mug handle", handle_pts, 0.0068, CERAMIC_MUG)
    mug_handle.scale = (1.0, 1.0, 1.18)

    r_liq = r_mug * 0.885
    coffee_disc = lathe(
        "coffee surface",
        [
            (0.0, z_coffee),
            (r_liq * 0.92, z_coffee),
            (r_liq, z_coffee + 0.0018),
            (r_liq, z_coffee - 0.005),
            (0.0, z_coffee - 0.005),
        ],
        48,
        COFFEE_LIQUID,
    )
    coffee_disc.location = (mx, my, 0.0)

    crema_ring = lathe(
        "coffee crema meniscus",
        [
            (r_liq * 0.84, z_coffee + 0.0002),
            (r_liq * 0.995, z_coffee + 0.0020),
            (r_liq * 0.995, z_coffee - 0.001),
            (r_liq * 0.84, z_coffee - 0.001),
        ],
        48,
        CREMA,
    )
    crema_ring.location = (mx, my, 0.0)

    # ── 1E. Warning Note, Fountain Pen & Brass Dividers (Right) ─────────────
    note_img_path = os.path.join(OUT, "note_ink.png")
    if os.path.exists(note_img_path):
        note_mat = bpy.data.materials.new("warning note paper")
        note_mat.use_nodes = True
        _nn = note_mat.node_tree.nodes
        _nl = note_mat.node_tree.links.new
        _nb = _nn["Principled BSDF"]
        _ti = _nn.new("ShaderNodeTexImage")
        _ti.image = bpy.data.images.load(note_img_path, check_existing=True)

        _hs = _nn.new("ShaderNodeHueSaturation")
        _hs.inputs["Value"].default_value = 0.72
        _hs.inputs["Saturation"].default_value = 1.05
        _nl(_ti.outputs["Color"], _hs.inputs["Color"])
        _nl(_hs.outputs["Color"], _nb.inputs["Base Color"])
        _nb.inputs["Roughness"].default_value = 0.86

        _tc = _nn.new("ShaderNodeTexCoord")
        _nz = _nn.new("ShaderNodeTexNoise")
        _nz.inputs["Scale"].default_value = 420.0
        _nz.inputs["Detail"].default_value = 5.0
        _nl(_tc.outputs["UV"], _nz.inputs["Vector"])
        _bp = _nn.new("ShaderNodeBump")
        _bp.inputs["Strength"].default_value = 0.14
        _bp.inputs["Distance"].default_value = 0.0003
        _nl(_nz.outputs["Fac"], _bp.inputs["Height"])
        _nl(_bp.outputs["Normal"], _nb.inputs["Normal"])
        note_mat["detailed"] = True
    else:
        note_mat = plain("warning note paper", (0.76, 0.68, 0.54), rough=0.88)

    nx, ny = 0.31, -0.04
    nw, nh = 0.195, 0.134
    yaw = math.radians(-9.5)
    cos_a, sin_a = math.cos(yaw), math.sin(yaw)

    me_note = bpy.data.meshes.new("warning note")
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new()
    gx, gy = 24, 16
    verts_grid = []
    for j in range(gy + 1):
        v_coord = j / gy
        ly_local = (0.5 - v_coord) * nh
        row_v = []
        for i in range(gx + 1):
            u_coord = i / gx
            lx_local = (u_coord - 0.5) * nw
            curl = (
                0.0028 * ((u_coord - 0.45) ** 2)
                + 0.0020 * ((v_coord - 0.5) ** 2)
                + 0.0038 * max(0.0, u_coord + v_coord - 1.25) ** 1.6
                + 0.0005 * math.sin(u_coord * math.pi * 2.0)
            )
            wx = nx + lx_local * cos_a - ly_local * sin_a
            wy = ny + lx_local * sin_a + ly_local * cos_a
            wz = 0.0006 + curl
            row_v.append(bm.verts.new((wx, wy, wz)))
        verts_grid.append(row_v)
    for j in range(gy):
        for i in range(gx):
            f = bm.faces.new([
                verts_grid[j][i],
                verts_grid[j][i + 1],
                verts_grid[j + 1][i + 1],
                verts_grid[j + 1][i],
            ])
            coords = [
                (i / gx, 1.0 - j / gy),
                ((i + 1) / gx, 1.0 - j / gy),
                ((i + 1) / gx, 1.0 - (j + 1) / gy),
                (i / gx, 1.0 - (j + 1) / gy),
            ]
            for lp, uv_c in zip(f.loops, coords):
                lp[uv_layer].uv = uv_c
    bm.to_mesh(me_note)
    bm.free()
    o_note = link(bpy.data.objects.new("warning note", me_note))
    for p in o_note.data.polygons:
        p.use_smooth = True
    solidify(o_note, 0.0006)
    o_note.data.materials.append(note_mat)

    px, py = 0.29, -0.155
    pen_yaw = math.radians(-162.0)
    pen_barrel = lathe(
        "fountain pen barrel",
        [
            (0.0, -0.068),
            (0.0040, -0.066),
            (0.0062, -0.042),
            (0.0066, 0.015),
            (0.0058, 0.022),
            (0.0050, 0.040),
            (0.0053, 0.044),
            (0.0, 0.044),
        ],
        28,
        PEN_BODY,
    )
    pen_barrel.rotation_euler = (math.pi / 2, 0.0, pen_yaw)
    pen_barrel.location = (px, py, 0.0068)

    pen_band = lathe(
        "pen gold band",
        [
            (0.0065, 0.012),
            (0.0069, 0.012),
            (0.0069, 0.019),
            (0.0065, 0.019),
        ],
        28,
        GOLD_NIB,
    )
    pen_band.rotation_euler = (math.pi / 2, 0.0, pen_yaw)
    pen_band.location = (px, py, 0.0068)

    pen_nib = lathe(
        "pen gold nib",
        [
            (0.0, 0.044),
            (0.0044, 0.044),
            (0.0030, 0.056),
            (0.0006, 0.068),
            (0.0, 0.069),
        ],
        20,
        GOLD_NIB,
    )
    pen_nib.rotation_euler = (math.pi / 2, 0.0, pen_yaw)
    pen_nib.location = (px, py, 0.0068)

    cap_x, cap_y = 0.39, -0.135
    cap_yaw = math.radians(-138.0)
    pen_cap = lathe(
        "fountain pen cap",
        [
            (0.0, 0.0),
            (0.0072, 0.0),
            (0.0074, 0.048),
            (0.0062, 0.056),
            (0.0, 0.058),
        ],
        28,
        PEN_BODY,
    )
    pen_cap.rotation_euler = (math.pi / 2, 0.0, cap_yaw)
    pen_cap.location = (cap_x, cap_y, 0.0074)
    cap_ring = lathe(
        "pen cap gold ring",
        [(0.0073, 0.002), (0.0077, 0.002), (0.0077, 0.008), (0.0073, 0.008)],
        28,
        GOLD_NIB,
    )
    cap_ring.rotation_euler = (math.pi / 2, 0.0, cap_yaw)
    cap_ring.location = (cap_x, cap_y, 0.0074)

    cx_div, cy_div = 0.33, 0.11
    div_hinge = cyl(
        "divider hinge", (cx_div, cy_div, 0.002), 0.010, 0.008, BRASS, verts=24
    )
    bevel(div_hinge, 0.0015, 1)
    for leg_ang in (-2.05, -2.52):
        lx_end = cx_div + math.cos(leg_ang) * 0.135
        ly_end = cy_div + math.sin(leg_ang) * 0.135
        curve_tube(
            "divider leg",
            [
                (cx_div, cy_div, 0.006),
                ((cx_div + lx_end) * 0.5, (cy_div + ly_end) * 0.5, 0.0045),
                (lx_end, ly_end, 0.0015),
            ],
            0.0032,
            BRASS,
        )

    # ── 1F. Atmospheric Captain's Cabin Lighting ───────────────────────────
    world_tint(scene, (0.015, 0.022, 0.036), 0.25)

    l_bulb = lamp(
        "banker bulb",
        "POINT",
        (lx + 0.02, ly - 0.03, 0.225),
        energy=18.0,
        colour=(1.0, 0.74, 0.40),
        size=0.055,
    )
    l_bulb.visible_glossy = False

    l_key = lamp(
        "cabin lantern fill",
        "AREA",
        (-0.22, -0.32, 0.72),
        aim=(0.04, 0.04, 0.02),
        energy=12.5,
        colour=(1.0, 0.80, 0.54),
        size=0.55,
    )
    l_key.visible_glossy = False

    l_moon = lamp(
        "porthole moonlight",
        "SPOT",
        (px_port + 0.06, wall_y + 0.35, pz_port + 0.10),
        aim=(0.12, -0.04, 0.0),
        energy=22.0,
        colour=(0.50, 0.68, 1.0),
        size=0.14,
        spot=math.radians(55),
    )
    l_moon.visible_glossy = False

    l_rim = lamp(
        "cool right fill",
        "AREA",
        (0.68, -0.35, 0.55),
        aim=(0.12, 0.05, 0.08),
        energy=6.5,
        colour=(0.58, 0.74, 0.96),
        size=0.65,
    )
    l_rim.visible_glossy = False

    clear_glass()
    finish_scene(
        scene,
        SAMPLES,
        exposure=-0.05,
        keep_gloss=("black coffee", "porthole glass", "green glass shade"),
    )

    bpy.context.view_layer.update()
    REF_W, REF_H = 1536.0, 1024.0
    c_uv = world_to_camera_view(scene, cam, Vector((mx, my, z_coffee)))
    cx_px = round(c_uv.x * REF_W, 1)
    cy_px = round((1.0 - c_uv.y) * REF_H, 1)
    pts_px = []
    for k in range(16):
        a = k * math.pi / 8.0
        p_uv = world_to_camera_view(
            scene,
            cam,
            Vector((
                mx + math.cos(a) * r_liq * 0.92,
                my + math.sin(a) * r_liq * 0.92,
                z_coffee,
            )),
        )
        pts_px.append((p_uv.x * REF_W, (1.0 - p_uv.y) * REF_H))
    rx_px = round((max(p[0] for p in pts_px) - min(p[0] for p in pts_px)) * 0.5, 1)
    ry_px = round((max(p[1] for p in pts_px) - min(p[1] for p in pts_px)) * 0.5, 1)

    layout_data = {
        "mug": {"cx": cx_px, "cy": cy_px, "rx": rx_px, "ry": ry_px},
    }
    with open(os.path.join(OUT, "layout.json"), "w", encoding="utf-8") as f:
        json.dump(layout_data, f, indent=2)
    print("MUG_LAYOUT", layout_data["mug"])

    out_path = os.path.join(OUT, "desk.png")
    render(scene, out_path)


# ═══════════════════════════════════════════════════════════════════════════
# 2. HEAVY CHARGING CRADLE DOCK (charging-cradle-photographic-v1.webp)
# ═══════════════════════════════════════════════════════════════════════════
def render_cradle():
    scene = fresh()
    W, H = 1774, 887
    scene.render.resolution_x = W
    scene.render.resolution_y = H
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"

    cd = bpy.data.cameras.new("eye")
    cd.sensor_fit = "HORIZONTAL"
    cd.sensor_width = 36.0
    cd.lens = 50.0
    cd.clip_start = 0.05
    cd.clip_end = 20.0

    cam_pos = Vector((0.0, -2.08, 0.90))
    cam_look = Vector((0.0, 0.0, 0.045))
    cam = link(bpy.data.objects.new("eye", cd))
    cam.location = cam_pos
    cam.rotation_euler = (cam_look - cam_pos).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam

    DOCK_BODY = fine_grained_polymer(
        "dock charcoal body",
        base_color=(0.068, 0.062, 0.056),
        edge_color=(0.125, 0.115, 0.102),
        rough_range=(0.42, 0.64),
        grain_scale=1600.0,
        bump_strength=0.16,
    )
    DOCK_DARK = fine_grained_polymer(
        "dock dark well",
        base_color=(0.025, 0.024, 0.022),
        edge_color=(0.055, 0.052, 0.048),
        rough_range=(0.48, 0.72),
        grain_scale=1800.0,
        bump_strength=0.14,
    )
    BRASS_PIN = aged_metal(
        "charging brass pin",
        (0.84, 0.66, 0.26),
        (0.22, 0.15, 0.06),
        rough=(0.18, 0.36),
        scale=40,
        tarnish=0.20,
    )
    CHROME_BEZEL = aged_metal(
        "led chrome bezel",
        (0.55, 0.56, 0.58),
        (0.18, 0.18, 0.20),
        rough=(0.22, 0.40),
        scale=50,
        tarnish=0.25,
    )
    BADGE_BRASS = aged_metal(
        "dock brass badge",
        (0.62, 0.46, 0.22),
        (0.14, 0.10, 0.05),
        rough=(0.24, 0.44),
        scale=35,
        tarnish=0.35,
    )
    LED_RED = plain(
        "led amber red",
        (0.95, 0.18, 0.06),
        rough=0.12,
        emit=(1.0, 0.22, 0.05),
        strength=7.5,
    )

    def make_rounded_slab(
        name, rx, ry_front, ry_back, z0, z1, corner_r=0.075, top_in=0.016, mat=None
    ):
        me = bpy.data.meshes.new(name)
        bm = bmesh.new()
        segs = 64
        ring_b, ring_t = [], []
        for i in range(segs):
            a = 2.0 * math.pi * i / segs
            ca, sa = math.cos(a), math.sin(a)
            ry = ry_front if sa < 0 else ry_back
            px = math.copysign(max(0.0, rx - corner_r), ca) + corner_r * ca
            py = math.copysign(max(0.0, abs(ry) - corner_r), sa) + corner_r * sa
            ring_b.append(bm.verts.new((px, py, z0)))
            scale_t = 1.0 - top_in / rx
            ring_t.append(bm.verts.new((px * scale_t, py * scale_t, z1)))
        for i in range(segs):
            ni = (i + 1) % segs
            bm.faces.new([ring_b[i], ring_b[ni], ring_t[ni], ring_t[i]])
        bm.faces.new(ring_b[::-1])
        bm.faces.new(ring_t)
        bm.to_mesh(me)
        bm.free()
        o = link(bpy.data.objects.new(name, me))
        for p in o.data.polygons:
            p.use_smooth = True
        bevel(o, 0.012, 3)
        if mat:
            o.data.materials.append(mat)
        return o

    # 1. Stepped heavy plinth base
    make_rounded_slab(
        "cradle lower plinth",
        rx=0.70,
        ry_front=-0.27,
        ry_back=0.25,
        z0=-0.165,
        z1=-0.088,
        corner_r=0.095,
        top_in=0.008,
        mat=DOCK_DARK,
    )

    # 2. Main sculpted housing body
    make_rounded_slab(
        "cradle main deck",
        rx=0.675,
        ry_front=-0.245,
        ry_back=0.23,
        z0=-0.092,
        z1=0.004,
        corner_r=0.085,
        top_in=0.018,
        mat=DOCK_BODY,
    )

    # 3. Recessed horizontal ventilation grooves along the center-front apron
    for gz in (-0.062, -0.044, -0.026):
        rib = box(
            "cradle front vent rib",
            -0.25,
            0.35,
            -0.245,
            -0.235,
            gz - 0.003,
            gz + 0.003,
            DOCK_DARK,
        )
        bevel(rib, 0.001, 1)

    # 4. Left and right raised guide cheeks (framing the handset at x = +/- 0.435 m)
    for side in (-1, 1):
        x_in = side * 0.435
        x_out = side * 0.565
        x0, x1 = min(x_in, x_out), max(x_in, x_out)
        cheek = box(
            "cradle guide cheek",
            x0,
            x1,
            -0.115,
            0.195,
            -0.010,
            0.118,
            DOCK_BODY,
        )
        bevel(cheek, 0.022, 3)

        pad = box(
            "cheek rubber bumper",
            x_in - side * 0.004 if side > 0 else x_in,
            x_in if side > 0 else x_in - side * 0.004,
            -0.075,
            0.135,
            0.008,
            0.088,
            DOCK_DARK,
        )
        bevel(pad, 0.003, 2)

    # 5. Raised back rest wall behind the handset
    back_wall = box(
        "cradle back wall",
        -0.46,
        0.46,
        0.105,
        0.205,
        -0.010,
        0.132,
        DOCK_BODY,
    )
    bevel(back_wall, 0.020, 3)

    # 6. Deep dark charging well floor & 4 brass spring-loaded pogo pins
    well_floor = box(
        "cradle pocket well",
        -0.440,
        0.440,
        -0.125,
        0.115,
        -0.015,
        0.0065,
        DOCK_DARK,
    )
    bevel(well_floor, 0.005, 2)

    front_lip = box(
        "cradle front retaining lip",
        -0.455,
        0.455,
        -0.165,
        -0.112,
        -0.010,
        0.012,
        DOCK_BODY,
    )
    bevel(front_lip, 0.008, 3)

    conn_block = box(
        "connector block",
        -0.14,
        0.14,
        -0.03,
        0.04,
        0.004,
        0.018,
        DOCK_DARK,
    )
    bevel(conn_block, 0.003, 2)
    for px in (-0.09, -0.03, 0.03, 0.09):
        pin = box(
            "charging brass pin",
            px - 0.009,
            px + 0.009,
            -0.012,
            0.022,
            0.012,
            0.028,
            BRASS_PIN,
        )
        bevel(pin, 0.003, 2)

    # 7. Brushed-brass industrial nameplate badge on the front-left apron
    badge_recess = box(
        "badge recess",
        -0.52,
        -0.31,
        -0.246,
        -0.236,
        -0.064,
        -0.024,
        DOCK_DARK,
    )
    bevel(badge_recess, 0.003, 2)
    badge_plate = box(
        "brass badge plate",
        -0.512,
        -0.318,
        -0.247,
        -0.238,
        -0.060,
        -0.028,
        BADGE_BRASS,
    )
    bevel(badge_plate, 0.002, 2)
    for rx in (-0.498, -0.332):
        rv = cyl("badge rivet", (0, 0, 0), 0.0035, 0.004, CHROME_BEZEL, verts=12)
        rv.rotation_euler = (math.pi / 2, 0, 0)
        rv.location = (rx, -0.246, -0.044)

    # 8. Chrome bezel & glowing red-amber power LED jewel on the front-right apron
    led_x, led_y, led_z = 0.44, -0.244, -0.044
    led_bezel = lathe(
        "led chrome bezel",
        [
            (0.012, 0.0),
            (0.020, 0.0),
            (0.020, 0.008),
            (0.015, 0.012),
            (0.012, 0.012),
            (0.012, 0.0),
        ],
        28,
        CHROME_BEZEL,
    )
    led_bezel.rotation_euler = (math.pi / 2, 0, 0)
    led_bezel.location = (led_x, led_y + 0.006, led_z)

    me_led = bpy.data.meshes.new("led jewel")
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=0.0125)
    bm.to_mesh(me_led)
    bm.free()
    o_led = link(bpy.data.objects.new("led jewel", me_led))
    o_led.location = (led_x, led_y - 0.003, led_z)
    o_led.scale = (1.0, 0.55, 1.0)
    o_led.data.materials.append(LED_RED)

    world_tint(scene, (0.04, 0.04, 0.05), 0.35)
    lk = lamp(
        "cradle warm key",
        "AREA",
        (-1.1, -1.2, 1.15),
        aim=(0.0, 0.0, 0.0),
        energy=36.0,
        colour=(1.0, 0.80, 0.54),
        size=0.95,
    )
    lk.visible_glossy = False
    lf = lamp(
        "cradle cool fill",
        "AREA",
        (1.2, -0.9, 0.95),
        aim=(0.0, 0.0, 0.0),
        energy=18.0,
        colour=(0.64, 0.78, 1.0),
        size=0.95,
    )
    lf.visible_glossy = False
    lt = lamp(
        "cradle top rim",
        "AREA",
        (0.0, 0.85, 1.35),
        aim=(0.0, 0.0, 0.0),
        energy=22.0,
        colour=(0.94, 0.90, 0.82),
        size=0.80,
    )
    lt.visible_glossy = False

    finish_scene(scene, SAMPLES, exposure=0.0, keep_gloss=("led amber red",))
    out_path = os.path.join(OUT, "cradle.png")
    render(scene, out_path)


# ═══════════════════════════════════════════════════════════════════════════
# 3. 1990s GSM BRICK HANDSET (handset-photographic-v1.webp)
# ═══════════════════════════════════════════════════════════════════════════
def render_handset():
    scene = fresh()
    W, H = 857, 1835
    scene.render.resolution_x = W
    scene.render.resolution_y = H
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"

    cd = bpy.data.cameras.new("eye")
    cd.type = "ORTHO"
    cd.ortho_scale = H / 100.0
    cd.clip_start = 0.1
    cd.clip_end = 50.0
    cam = link(bpy.data.objects.new("eye", cd))
    cam.location = (0.0, 0.0, 12.0)
    cam.rotation_euler = (0.0, 0.0, 0.0)
    scene.camera = cam

    def px_to_xy(px_x, px_y):
        return ((px_x - W * 0.5) / 100.0, (H * 0.5 - px_y) / 100.0)

    # ── Handset Materials ──────────────────────────────────────────────────
    SHELL_MAT = fine_grained_polymer(
        "handset body shell",
        base_color=(0.072, 0.076, 0.082),
        edge_color=(0.135, 0.142, 0.152),
        rough_range=(0.40, 0.60),
        grain_scale=1500.0,
        bump_strength=0.18,
    )
    FACEPLATE_MAT = fine_grained_polymer(
        "handset pewter faceplate",
        base_color=(0.145, 0.152, 0.162),
        edge_color=(0.220, 0.230, 0.242),
        rough_range=(0.36, 0.52),
        grain_scale=1800.0,
        bump_strength=0.12,
        metallic=0.25,
    )
    SCREEN_FRAME_MAT = aged_metal(
        "screen brushed pewter frame",
        (0.28, 0.30, 0.32),
        (0.14, 0.15, 0.16),
        rough=(0.26, 0.44),
        scale=45,
        tarnish=0.25,
    )
    RUBBER_KEY = fine_grained_polymer(
        "silicone rubber key",
        base_color=(0.115, 0.120, 0.128),
        edge_color=(0.185, 0.192, 0.205),
        rough_range=(0.42, 0.58),
        grain_scale=1900.0,
        bump_strength=0.10,
    )
    WELL_DARK = plain("key recess well", (0.008, 0.010, 0.008), rough=0.85)
    CALL_GREEN = plain(
        "softkey call green",
        (0.14, 0.56, 0.24),
        rough=0.35,
        emit=(0.16, 0.68, 0.28),
        strength=0.8,
    )
    END_RED = plain(
        "softkey end red",
        (0.68, 0.16, 0.14),
        rough=0.35,
        emit=(0.78, 0.18, 0.15),
        strength=0.8,
    )

    LCD_MAT = bpy.data.materials.new("stn lcd glass")
    LCD_MAT.use_nodes = True
    _ln = LCD_MAT.node_tree.nodes
    _ll = LCD_MAT.node_tree.links.new
    _lb = _ln["Principled BSDF"]
    _tc = _ln.new("ShaderNodeTexCoord")
    _sep = _ln.new("ShaderNodeSeparateXYZ")
    _ll(_tc.outputs["Generated"], _sep.inputs["Vector"])
    _rmp = _ln.new("ShaderNodeValToRGB")
    _rmp.color_ramp.elements[0].position = 0.0
    _rmp.color_ramp.elements[0].color = (0.36, 0.44, 0.22, 1.0)
    _rmp.color_ramp.elements[1].position = 1.0
    _rmp.color_ramp.elements[1].color = (0.48, 0.58, 0.30, 1.0)
    _ll(_sep.outputs["Y"], _rmp.inputs["Fac"])
    _ll(_rmp.outputs["Color"], _lb.inputs["Base Color"])
    _ll(_rmp.outputs["Color"], _lb.inputs["Emission Color"])
    _lb.inputs["Emission Strength"].default_value = 0.45
    _lb.inputs["Roughness"].default_value = 0.18

    # ── 3A. Sculpted Ergonomic Handset Body & Inset Pewter Faceplate ───────
    y_top, y_bot = 6.50, -8.98

    def half_width_at_y(py):
        t = max(0.0, min(1.0, (y_top - py) / (y_top - y_bot)))
        w = 3.28 - 0.18 * math.sin(t * math.pi * 1.15) + 0.08 * math.sin(t * math.pi * 2.2)
        if t < 0.09:
            u = t / 0.09
            w *= math.sqrt(max(0.0, 1.0 - (1.0 - u) ** 2.2))
        elif t > 0.90:
            u = (1.0 - t) / 0.10
            w *= math.sqrt(max(0.0, 1.0 - (1.0 - u) ** 2.2))
        return w

    def body_front_z(px, py):
        hw = max(0.20, half_width_at_y(py))
        u = max(-1.0, min(1.0, px / hw))
        t_y = max(0.0, min(1.0, (y_top - py) / (y_top - y_bot)))
        end_drop = 0.0
        if t_y < 0.07:
            end_drop = 0.32 * ((1.0 - t_y / 0.07) ** 2)
        elif t_y > 0.92:
            end_drop = 0.36 * (((t_y - 0.92) / 0.08) ** 2)
        edge_drop = 0.42 * (abs(u) ** 3.2) + 0.08 * (u ** 2)
        return 0.56 - edge_drop - end_drop

    me_body = bpy.data.meshes.new("handset body")
    bm = bmesh.new()
    ny_rows = 88
    nx_cols = 40
    grid_front, grid_back = [], []
    for j in range(ny_rows + 1):
        py = y_top - (y_top - y_bot) * (j / ny_rows)
        hw = max(0.20, half_width_at_y(py))
        t_y = (y_top - py) / (y_top - y_bot)
        end_drop = 0.0
        if t_y < 0.07:
            end_drop = 0.32 * ((1.0 - t_y / 0.07) ** 2)
        elif t_y > 0.92:
            end_drop = 0.36 * (((t_y - 0.92) / 0.08) ** 2)
        row_f, row_b = [], []
        for i in range(nx_cols + 1):
            u = (i / nx_cols) * 2.0 - 1.0
            px = u * hw
            pz_f = body_front_z(px, py)
            pz_b = -0.45 + 0.22 * (u ** 2) + end_drop * 0.5
            row_f.append(bm.verts.new((px, py, pz_f)))
            row_b.append(bm.verts.new((px, py, pz_b)))
        grid_front.append(row_f)
        grid_back.append(row_b)

    for j in range(ny_rows):
        for i in range(nx_cols):
            bm.faces.new([
                grid_front[j][i],
                grid_front[j + 1][i],
                grid_front[j + 1][i + 1],
                grid_front[j][i + 1],
            ])
            bm.faces.new([
                grid_back[j][i + 1],
                grid_back[j + 1][i + 1],
                grid_back[j + 1][i],
                grid_back[j][i],
            ])
        bm.faces.new([
            grid_back[j][0],
            grid_back[j + 1][0],
            grid_front[j + 1][0],
            grid_front[j][0],
        ])
        bm.faces.new([
            grid_front[j][nx_cols],
            grid_front[j + 1][nx_cols],
            grid_back[j + 1][nx_cols],
            grid_back[j][nx_cols],
        ])
    for i in range(nx_cols):
        bm.faces.new([
            grid_back[0][i],
            grid_front[0][i],
            grid_front[0][i + 1],
            grid_back[0][i + 1],
        ])
        bm.faces.new([
            grid_front[ny_rows][i],
            grid_back[ny_rows][i],
            grid_back[ny_rows][i + 1],
            grid_front[ny_rows][i + 1],
        ])

    bm.to_mesh(me_body)
    bm.free()
    o_body = link(bpy.data.objects.new("handset body", me_body))
    for p in o_body.data.polygons:
        p.use_smooth = True
    o_body.data.materials.append(SHELL_MAT)

    # Raised contrasting pewter faceplate strictly above `body_front_z(px, py)`
    me_fp = bpy.data.meshes.new("handset faceplate")
    bm = bmesh.new()
    fp_rows, fp_cols = 64, 28
    fy_top, fy_bot = 5.85, -7.65
    fp_front, fp_back = [], []
    for j in range(fp_rows + 1):
        v = j / fp_rows
        py = fy_top - (fy_top - fy_bot) * v
        hw = 2.58 * (math.sin(math.acos(max(-0.98, min(0.98, (v - 0.5) * 1.94)))) ** 0.45)
        row_f, row_b = [], []
        for i in range(fp_cols + 1):
            u = (i / fp_cols) * 2.0 - 1.0
            px = u * hw
            bz = body_front_z(px, py)
            pz_f = bz + 0.026 * (1.0 - 0.35 * (u ** 4))
            row_b.append(bm.verts.new((px, py, bz - 0.02)))
            row_f.append(bm.verts.new((px, py, pz_f)))
        fp_front.append(row_f)
        fp_back.append(row_b)
    for j in range(fp_rows):
        for i in range(fp_cols):
            bm.faces.new([
                fp_front[j][i],
                fp_front[j + 1][i],
                fp_front[j + 1][i + 1],
                fp_front[j][i + 1],
            ])
        bm.faces.new([
            fp_back[j][0],
            fp_back[j + 1][0],
            fp_front[j + 1][0],
            fp_front[j][0],
        ])
        bm.faces.new([
            fp_front[j][fp_cols],
            fp_front[j + 1][fp_cols],
            fp_back[j + 1][fp_cols],
            fp_back[j][fp_cols],
        ])
    bm.to_mesh(me_fp)
    bm.free()
    o_fp = link(bpy.data.objects.new("handset faceplate", me_fp))
    for p in o_fp.data.polygons:
        p.use_smooth = True
    o_fp.data.materials.append(FACEPLATE_MAT)

    seam_pts_l, seam_pts_r = [], []
    for k in range(41):
        v = k / 40.0
        py = fy_top - (fy_top - fy_bot) * v
        hw = 2.59 * (math.sin(math.acos(max(-0.98, min(0.98, (v - 0.5) * 1.94)))) ** 0.45)
        pz = body_front_z(hw, py) + 0.012
        seam_pts_l.append((-hw, py, pz))
        seam_pts_r.append((hw, py, pz))
    curve_tube("faceplate seam left", seam_pts_l, 0.032, WELL_DARK)
    curve_tube("faceplate seam right", seam_pts_r, 0.032, WELL_DARK)

    # ── 3B. Stubby Helical Rubber Antenna (Top Right) ──────────────────────
    ant_x = 2.24
    ant_y0 = 5.45
    ant = lathe(
        "handset antenna",
        [
            (0.0, 0.0),
            (0.62, 0.0),
            (0.60, 0.85),
            (0.50, 0.94),
            (0.58, 1.04),
            (0.49, 1.15),
            (0.56, 1.25),
            (0.52, 2.75),
            (0.44, 3.22),
            (0.26, 3.42),
            (0.0, 3.48),
        ],
        36,
        SHELL_MAT,
    )
    ant.rotation_euler = (-math.pi / 2, 0.0, -0.025)
    ant.location = (ant_x, ant_y0, 0.05)

    # ── 3C. Earpiece Speaker Grille, Brand Badge & Bottom Mic ──────────────
    ear_well = box("earpiece pad", -1.08, 1.08, 5.05, 5.56, 0.54, 0.615, SHELL_MAT)
    bevel(ear_well, 0.08, 3)
    for k in range(-3, 4):
        cyl("earpiece hole", (k * 0.24, 5.30, 0.55), 0.075, 0.085, WELL_DARK, verts=20)

    brand_plate = box(
        "brand nameplate", -0.82, 0.82, 4.30, 4.66, 0.56, 0.62, SCREEN_FRAME_MAT
    )
    bevel(brand_plate, 0.05, 2)

    for k in (-1, 0, 1):
        cyl("mic hole", (k * 0.28, -8.10, 0.42), 0.065, 0.14, WELL_DARK, verts=16)

    # ── 3D. Recessed LCD Screen Window & Metallic Bezel (429, 680; 450x254) ─
    sx, sy = px_to_xy(429, 680)
    sw, sh = 4.50, 2.54

    b_out = 0.26
    bezel_outer = box(
        "screen metallic bezel",
        sx - sw * 0.5 - b_out,
        sx + sw * 0.5 + b_out,
        sy - sh * 0.5 - b_out,
        sy + sh * 0.5 + b_out,
        0.52,
        0.65,
        SCREEN_FRAME_MAT,
    )
    bevel(bezel_outer, 0.12, 3)

    lip_pad = 0.07
    bezel_lip = box(
        "screen shadow lip",
        sx - sw * 0.5 - lip_pad,
        sx + sw * 0.5 + lip_pad,
        sy - sh * 0.5 - lip_pad,
        sy + sh * 0.5 + lip_pad,
        0.54,
        0.665,
        WELL_DARK,
    )
    bevel(bezel_lip, 0.04, 2)

    lcd_glass = box(
        "lcd glass",
        sx - sw * 0.5,
        sx + sw * 0.5,
        sy - sh * 0.5,
        sy + sh * 0.5,
        0.56,
        0.68,
        LCD_MAT,
    )
    bevel(lcd_glass, 0.03, 2)

    # ── 3E. Sculpted Rounded-Pill 3D Silicone Keys ─────────────────────────
    def make_pill_prism(name, cx, cy, w, h, z0, z1, corner_r, dome=0.0, mat=None):
        me = bpy.data.meshes.new(name)
        bm = bmesh.new()
        segs = 48
        rx, ry = w * 0.5, h * 0.5
        cr = min(corner_r, rx * 0.95, ry * 0.95)
        ring_b, ring_t = [], []
        for i in range(segs):
            a = 2.0 * math.pi * i / segs
            ca, sa = math.cos(a), math.sin(a)
            px = math.copysign(max(0.0, rx - cr), ca) + cr * ca
            py = math.copysign(max(0.0, ry - cr), sa) + cr * sa
            ring_b.append(bm.verts.new((cx + px, cy + py, z0)))
            ring_t.append(bm.verts.new((cx + px * 0.94, cy + py * 0.92, z1)))
        for i in range(segs):
            ni = (i + 1) % segs
            bm.faces.new([ring_b[i], ring_b[ni], ring_t[ni], ring_t[i]])
        bm.faces.new(ring_b[::-1])
        c_top = bm.verts.new((cx, cy, z1 + dome))
        for i in range(segs):
            ni = (i + 1) % segs
            bm.faces.new([c_top, ring_t[i], ring_t[ni]])
        bm.to_mesh(me)
        bm.free()
        o = link(bpy.data.objects.new(name, me))
        for p in o.data.polygons:
            p.use_smooth = True
        bevel(o, 0.022, 2)
        if mat:
            o.data.materials.append(mat)
        return o

    def build_key_pill(name, px_x, px_y, px_w, px_h, accent_mat=None):
        kx, ky = px_to_xy(px_x, px_y)
        kw, kh = px_w / 100.0, px_h / 100.0
        r_pill = kh * 0.34
        make_pill_prism(
            f"{name}_well",
            kx,
            ky,
            kw * 1.03,
            kh * 1.05,
            0.52,
            0.605,
            r_pill * 1.05,
            dome=0.0,
            mat=WELL_DARK,
        )
        make_pill_prism(
            name,
            kx,
            ky,
            kw * 0.92,
            kh * 0.88,
            0.56,
            0.68,
            r_pill * 0.90,
            dome=0.032,
            mat=RUBBER_KEY,
        )
        if accent_mat:
            make_pill_prism(
                f"{name}_bar",
                kx,
                ky - kh * 0.26,
                kw * 0.42,
                kh * 0.11,
                0.66,
                0.715,
                kh * 0.05,
                dome=0.005,
                mat=accent_mat,
            )

    # 1. Soft Keys: x=[260, 603], y=923, w=156, h=70
    build_key_pill("soft_0", 260, 923, 156, 70, accent_mat=CALL_GREEN)
    build_key_pill("soft_1", 603, 923, 156, 70, accent_mat=END_RED)

    # 2. Navigation Rocker: x=429, y=1047, w=350, h=138
    rx, ry = px_to_xy(429, 1047)
    rw, rh = 3.50, 1.38
    make_pill_prism(
        "rocker_well",
        rx,
        ry,
        rw * 1.02,
        rh * 1.04,
        0.52,
        0.605,
        rh * 0.48,
        dome=0.0,
        mat=WELL_DARK,
    )
    make_pill_prism(
        "rocker_cap",
        rx,
        ry,
        rw * 0.93,
        rh * 0.88,
        0.56,
        0.685,
        rh * 0.44,
        dome=0.035,
        mat=RUBBER_KEY,
    )
    # Brushed pewter center ring facing the camera (+Z, rotation_euler = (0, 0, 0))
    rocker_ring = lathe(
        "rocker center ring",
        [
            (0.45, 0.0),
            (0.54, 0.0),
            (0.54, 0.06),
            (0.495, 0.08),
            (0.45, 0.06),
            (0.45, 0.0),
        ],
        48,
        SCREEN_FRAME_MAT,
    )
    rocker_ring.location = (rx, ry, 0.675)

    # 3. 12 Numeric Keys: x=[252, 430, 607], y=[1191, 1311, 1430, 1550], w=150, h=90
    key_xs = [252, 430, 607]
    key_ys = [1191, 1311, 1430, 1550]
    for r_idx, ky_px in enumerate(key_ys):
        for c_idx, kx_px in enumerate(key_xs):
            build_key_pill(f"num_{r_idx * 3 + c_idx}", kx_px, ky_px, 150, 90)

    # ── 3F. Studio + Cabin Dual-Tone Lighting on Handset ───────────────────
    world_tint(scene, (0.04, 0.045, 0.055), 0.45)

    hk = lamp(
        "handset warm key",
        "AREA",
        (-6.2, 5.2, 8.2),
        aim=(0.0, 0.0, 0.5),
        energy=260.0,
        colour=(1.0, 0.84, 0.62),
        size=4.5,
    )
    hk.visible_glossy = False

    hf = lamp(
        "handset cool fill",
        "AREA",
        (6.8, -1.5, 7.5),
        aim=(0.0, -1.0, 0.5),
        energy=155.0,
        colour=(0.68, 0.82, 1.0),
        size=5.0,
    )
    hf.visible_glossy = False

    hr = lamp(
        "handset top rim",
        "AREA",
        (0.0, 9.5, 6.2),
        aim=(0.0, -1.5, 0.5),
        energy=195.0,
        colour=(0.95, 0.92, 0.86),
        size=4.5,
    )
    hr.visible_glossy = False

    hb = lamp(
        "handset bottom bounce",
        "AREA",
        (0.0, -10.5, 6.5),
        aim=(0.0, -3.5, 0.5),
        energy=95.0,
        colour=(0.90, 0.78, 0.62),
        size=5.0,
    )
    hb.visible_glossy = False

    finish_scene(
        scene,
        SAMPLES,
        exposure=0.0,
        keep_gloss=("stn lcd glass", "softkey call green", "softkey end red"),
    )
    out_path = os.path.join(OUT, "handset.png")
    render(scene, out_path)


if __name__ == "__main__":
    if "desk" in ONLY:
        render_desk()
    if "cradle" in ONLY:
        render_cradle()
    if "handset" in ONLY:
        render_handset()
    print("UNEXPECTED_CALL_DONE")
