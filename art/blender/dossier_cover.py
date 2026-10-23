# Reproducible Blender 4.5 Cycles studio pipeline for all Case File and
# Notebook archival materials. Uses CC0 Poly Haven scans from ASSETS plus
# 3D-modeled geometry and procedural micro-fibers (zero AI-generated images).
#
# Run:
#   "C:\Users\crist\Tools\blender-4.5.15-windows-x64\blender.exe" -b -P art/blender/dossier_cover.py -- --target all

import bpy
import bmesh
import math
import os
import sys
from mathutils import Vector, Euler

ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import kit

OUT_DIR = os.path.abspath(os.path.join(ROOT, "..", "..", ".artifacts", "blender-ui"))
os.makedirs(OUT_DIR, exist_ok=True)


def setup_studio(res_x, res_y, ortho_scale=1.0, samples=96, transparent=True, cam_z=1.5):
    scene = kit.fresh()
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for dev_type in ("OPTIX", "CUDA", "HIP", "ONEAPI"):
        try:
            prefs.compute_device_type = dev_type
            prefs.get_devices()
            if any(d.type != "CPU" for d in prefs.devices):
                for d in prefs.devices:
                    d.use = True
                scene.cycles.device = "GPU"
                break
        except Exception:
            pass

    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.008
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = transparent
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA" if transparent else "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.18

    world = bpy.data.worlds.new("StudioWorld")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.06, 0.05, 0.04, 1.0)
    bg.inputs["Strength"].default_value = 0.35

    cam_data = bpy.data.cameras.new("OrthoCam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = ortho_scale
    cam = bpy.data.objects.new("OrthoCam", cam_data)
    cam.location = (0.0, 0.0, cam_z)
    cam.rotation_euler = (0.0, 0.0, 0.0)
    kit.link(cam)
    scene.camera = cam

    # Warm raking evening desk-lamp from upper-left
    key_data = bpy.data.lights.new("DeskKey", type="AREA")
    key_data.shape = "RECTANGLE"
    key_data.size = 0.85
    key_data.size_y = 0.65
    key_data.energy = 10.2
    key_data.color = (1.0, 0.93, 0.82)
    key = bpy.data.objects.new("DeskKey", key_data)
    key.location = (-0.52, 0.48, 0.78)
    key.rotation_euler = (math.radians(34), math.radians(-30), math.radians(-18))
    kit.link(key)

    # Soft overhead neutral-warm fill so reading areas stay even and legible
    fill_data = bpy.data.lights.new("OverheadFill", type="AREA")
    fill_data.shape = "DISK"
    fill_data.size = 1.6
    fill_data.energy = 6.4
    fill_data.color = (0.99, 0.96, 0.91)
    fill = bpy.data.objects.new("OverheadFill", fill_data)
    fill.location = (0.06, -0.05, 1.35)
    fill.rotation_euler = (math.radians(-3), math.radians(3), 0.0)
    kit.link(fill)

    # Subtle cool lower-right counter-fill
    rim_data = bpy.data.lights.new("CounterFill", type="AREA")
    rim_data.shape = "RECTANGLE"
    rim_data.size = 0.9
    rim_data.size_y = 0.9
    rim_data.energy = 2.0
    rim_data.color = (0.85, 0.88, 0.95)
    rim = bpy.data.objects.new("CounterFill", rim_data)
    rim.location = (0.62, -0.58, 0.72)
    rim.rotation_euler = (math.radians(-32), math.radians(30), 0.0)
    kit.link(rim)

    return scene, key, fill, rim


def add_shadow_catcher(z=-0.0005):
    bpy.ops.mesh.primitive_plane_add(size=4.0, location=(0.0, 0.0, z))
    catcher = bpy.context.active_object
    catcher.name = "ShadowCatcher"
    catcher.is_shadow_catcher = True
    mat = bpy.data.materials.new("CatcherMat")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.04, 0.03, 0.02, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.95
    bsdf.inputs["Specular IOR Level"].default_value = 0.0
    catcher.data.materials.append(mat)
    return catcher


def make_oxblood_leather_mat(name="OxbloodLeather", scale=2.4, brightness=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    N = nt.nodes
    Lk = nt.links.new
    bsdf = N["Principled BSDF"]
    bsdf.inputs["Specular IOR Level"].default_value = 0.18

    tc = N.new("ShaderNodeTexCoord")
    mp = N.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale, scale, scale)
    Lk(tc.outputs["Object"], mp.inputs["Vector"])

    diff_path = kit.tex_path("brown_leather", "Diffuse")
    rough_path = kit.tex_path("brown_leather", "Rough")
    norm_path = kit.tex_path("brown_leather", "Normal")

    if diff_path:
        tex_d = N.new("ShaderNodeTexImage")
        tex_d.image = bpy.data.images.load(diff_path, check_existing=True)
        tex_d.projection = "BOX"
        tex_d.projection_blend = 0.25
        Lk(mp.outputs["Vector"], tex_d.inputs["Vector"])

        hsv = N.new("ShaderNodeHueSaturation")
        hsv.inputs["Hue"].default_value = 0.48
        hsv.inputs["Saturation"].default_value = 0.92
        hsv.inputs["Value"].default_value = 0.56 * brightness
        Lk(tex_d.outputs["Color"], hsv.inputs["Color"])
        base_col = hsv.outputs["Color"]
    else:
        rgb = N.new("ShaderNodeRGB")
        rgb.outputs[0].default_value = (0.20 * brightness, 0.095 * brightness, 0.062 * brightness, 1.0)
        base_col = rgb.outputs[0]

    # Broad organic handling patina
    patina_nz = N.new("ShaderNodeTexNoise")
    patina_nz.inputs["Scale"].default_value = 4.6
    patina_nz.inputs["Detail"].default_value = 8.0
    patina_nz.inputs["Roughness"].default_value = 0.65
    Lk(tc.outputs["Object"], patina_nz.inputs["Vector"])

    patina_ramp = N.new("ShaderNodeValToRGB")
    patina_ramp.color_ramp.elements[0].position = 0.25
    patina_ramp.color_ramp.elements[0].color = (0.68, 0.58, 0.50, 1.0)
    patina_ramp.color_ramp.elements[1].position = 0.78
    patina_ramp.color_ramp.elements[1].color = (1.22, 1.08, 0.96, 1.0)
    Lk(patina_nz.outputs["Fac"], patina_ramp.inputs["Fac"])

    col_out = kit._multiply(N, Lk, base_col, patina_ramp.outputs["Color"])

    # Corner/edge rubbing (warmer worn saddle brown on raised turn-ins and edges)
    ao = N.new("ShaderNodeAmbientOcclusion")
    ao.inside = True
    ao.inputs["Distance"].default_value = 0.006
    ao_ramp = N.new("ShaderNodeValToRGB")
    ao_ramp.color_ramp.elements[0].position = 0.55
    ao_ramp.color_ramp.elements[0].color = (1.42, 1.22, 1.02, 1.0)
    ao_ramp.color_ramp.elements[1].position = 0.90
    ao_ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)
    Lk(ao.outputs["AO"], ao_ramp.inputs["Fac"])
    col_out = kit._multiply(N, Lk, col_out, ao_ramp.outputs["Color"])

    # Darken recessed seams and blind-tooled grooves
    ao_out = N.new("ShaderNodeAmbientOcclusion")
    ao_out.inside = False
    ao_out.inputs["Distance"].default_value = 0.008
    ao_out_ramp = N.new("ShaderNodeValToRGB")
    ao_out_ramp.color_ramp.elements[0].position = 0.35
    ao_out_ramp.color_ramp.elements[0].color = (0.38, 0.30, 0.25, 1.0)
    ao_out_ramp.color_ramp.elements[1].position = 0.85
    ao_out_ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)
    Lk(ao_out.outputs["AO"], ao_out_ramp.inputs["Fac"])
    col_out = kit._multiply(N, Lk, col_out, ao_out_ramp.outputs["Color"])

    Lk(col_out, bsdf.inputs["Base Color"])

    # Matte-satin roughness (0.54 - 0.82, never glossy plastic)
    if rough_path:
        tex_r = N.new("ShaderNodeTexImage")
        tex_r.image = bpy.data.images.load(rough_path, check_existing=True)
        tex_r.image.colorspace_settings.name = "Non-Color"
        tex_r.projection = "BOX"
        Lk(mp.outputs["Vector"], tex_r.inputs["Vector"])
        mr = N.new("ShaderNodeMapRange")
        mr.inputs["To Min"].default_value = 0.54
        mr.inputs["To Max"].default_value = 0.82
        Lk(tex_r.outputs["Color"], mr.inputs["Value"])
        Lk(mr.outputs["Result"], bsdf.inputs["Roughness"])
    else:
        bsdf.inputs["Roughness"].default_value = 0.66

    # Fine calfskin grain + normal map
    grain_vor = N.new("ShaderNodeTexVoronoi")
    grain_vor.feature = "SMOOTH_F1"
    grain_vor.inputs["Scale"].default_value = 180.0
    grain_vor.inputs["Smoothness"].default_value = 0.45
    Lk(mp.outputs["Vector"], grain_vor.inputs["Vector"])

    crease_nz = N.new("ShaderNodeTexNoise")
    crease_nz.inputs["Scale"].default_value = 16.0
    crease_nz.inputs["Detail"].default_value = 10.0
    crease_nz.inputs["Distortion"].default_value = 0.55
    Lk(mp.outputs["Vector"], crease_nz.inputs["Vector"])

    mix_h = N.new("ShaderNodeMath")
    mix_h.operation = "MULTIPLY_ADD"
    mix_h.inputs[1].default_value = 0.65
    Lk(grain_vor.outputs["Distance"], mix_h.inputs[0])
    Lk(crease_nz.outputs["Fac"], mix_h.inputs[2])

    bump = N.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.36
    bump.inputs["Distance"].default_value = 0.0006
    Lk(mix_h.outputs["Value"], bump.inputs["Height"])

    if norm_path:
        tex_n = N.new("ShaderNodeTexImage")
        tex_n.image = bpy.data.images.load(norm_path, check_existing=True)
        tex_n.image.colorspace_settings.name = "Non-Color"
        tex_n.projection = "BOX"
        Lk(mp.outputs["Vector"], tex_n.inputs["Vector"])
        nm = N.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = 0.62
        Lk(tex_n.outputs["Color"], nm.inputs["Color"])
        Lk(nm.outputs["Normal"], bump.inputs["Normal"])

    Lk(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def make_archival_paper_mat(
    name="ArchivalPaper",
    base_ivory=(0.915, 0.865, 0.755),
    edge_amber=(0.775, 0.685, 0.525),
    foxing_strength=0.12,
    bump_strength=0.15,
    half_w=0.15,
    half_h=0.15,
):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    N = nt.nodes
    Lk = nt.links.new
    bsdf = N["Principled BSDF"]
    bsdf.inputs["Specular IOR Level"].default_value = 0.06
    bsdf.inputs["Roughness"].default_value = 0.90

    tc = N.new("ShaderNodeTexCoord")
    plaster_norm = kit.tex_path("white_plaster_rough_01", "Normal")

    mp_scan = N.new("ShaderNodeMapping")
    mp_scan.inputs["Scale"].default_value = (5.0, 5.0, 5.0)
    Lk(tc.outputs["Object"], mp_scan.inputs["Vector"])

    fiber_nz = N.new("ShaderNodeTexNoise")
    fiber_nz.inputs["Scale"].default_value = 210.0
    fiber_nz.inputs["Detail"].default_value = 12.0
    fiber_nz.inputs["Roughness"].default_value = 0.72
    Lk(tc.outputs["Object"], fiber_nz.inputs["Vector"])

    mottle_nz = N.new("ShaderNodeTexNoise")
    mottle_nz.inputs["Scale"].default_value = 8.2
    mottle_nz.inputs["Detail"].default_value = 6.0
    mottle_nz.inputs["Roughness"].default_value = 0.58
    Lk(tc.outputs["Object"], mottle_nz.inputs["Vector"])

    sep = N.new("ShaderNodeSeparateXYZ")
    Lk(tc.outputs["Object"], sep.inputs["Vector"])

    abs_x = N.new("ShaderNodeMath")
    abs_x.operation = "ABSOLUTE"
    Lk(sep.outputs["X"], abs_x.inputs[0])
    norm_x = N.new("ShaderNodeMath")
    norm_x.operation = "DIVIDE"
    norm_x.inputs[1].default_value = max(half_w, 0.01)
    Lk(abs_x.outputs["Value"], norm_x.inputs[0])

    abs_y = N.new("ShaderNodeMath")
    abs_y.operation = "ABSOLUTE"
    Lk(sep.outputs["Y"], abs_y.inputs[0])
    norm_y = N.new("ShaderNodeMath")
    norm_y.operation = "DIVIDE"
    norm_y.inputs[1].default_value = max(half_h, 0.01)
    Lk(abs_y.outputs["Value"], norm_y.inputs[0])

    edge_max = N.new("ShaderNodeMath")
    edge_max.operation = "MAXIMUM"
    Lk(norm_x.outputs["Value"], edge_max.inputs[0])
    Lk(norm_y.outputs["Value"], edge_max.inputs[1])

    edge_jit = N.new("ShaderNodeMath")
    edge_jit.operation = "MULTIPLY_ADD"
    edge_jit.inputs[1].default_value = 0.14
    edge_jit.inputs[2].default_value = -0.07
    Lk(mottle_nz.outputs["Fac"], edge_jit.inputs[0])

    edge_sum = N.new("ShaderNodeMath")
    edge_sum.operation = "ADD"
    Lk(edge_max.outputs["Value"], edge_sum.inputs[0])
    Lk(edge_jit.outputs["Value"], edge_sum.inputs[1])

    edge_map = N.new("ShaderNodeMapRange")
    edge_map.inputs["From Min"].default_value = 0.82
    edge_map.inputs["From Max"].default_value = 1.02
    edge_map.inputs["To Min"].default_value = 0.0
    edge_map.inputs["To Max"].default_value = 1.0
    Lk(edge_sum.outputs["Value"], edge_map.inputs["Value"])

    col_ramp = N.new("ShaderNodeValToRGB")
    col_ramp.color_ramp.elements[0].position = 0.25
    col_ramp.color_ramp.elements[0].color = (
        base_ivory[0] * 0.96,
        base_ivory[1] * 0.95,
        base_ivory[2] * 0.93,
        1.0,
    )
    col_ramp.color_ramp.elements[1].position = 0.78
    col_ramp.color_ramp.elements[1].color = (
        min(1.0, base_ivory[0] * 1.03),
        min(1.0, base_ivory[1] * 1.03),
        min(1.0, base_ivory[2] * 1.02),
        1.0,
    )
    Lk(mottle_nz.outputs["Fac"], col_ramp.inputs["Fac"])
    paper_col = col_ramp.outputs["Color"]

    fleck_vor = N.new("ShaderNodeTexVoronoi")
    fleck_vor.inputs["Scale"].default_value = 380.0
    Lk(tc.outputs["Object"], fleck_vor.inputs["Vector"])
    fleck_ramp = N.new("ShaderNodeValToRGB")
    fleck_ramp.color_ramp.elements[0].position = 0.0
    fleck_ramp.color_ramp.elements[0].color = (0.78, 0.72, 0.62, 1.0)
    fleck_ramp.color_ramp.elements[1].position = 0.12
    fleck_ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)
    Lk(fleck_vor.outputs["Distance"], fleck_ramp.inputs["Fac"])
    paper_col = kit._multiply(N, Lk, paper_col, fleck_ramp.outputs["Color"])

    edge_mix = N.new("ShaderNodeMix")
    edge_mix.data_type = "RGBA"
    edge_mix.blend_type = "MIX"
    edge_mix.inputs[7].default_value = (*edge_amber, 1.0)
    Lk(edge_map.outputs["Result"], edge_mix.inputs["Factor"])
    Lk(paper_col, edge_mix.inputs[6])
    paper_col = edge_mix.outputs[2]

    if foxing_strength > 0.0:
        fox_nz = N.new("ShaderNodeTexNoise")
        fox_nz.inputs["Scale"].default_value = 24.0
        fox_nz.inputs["Detail"].default_value = 9.0
        fox_nz.inputs["Roughness"].default_value = 0.75
        Lk(tc.outputs["Object"], fox_nz.inputs["Vector"])
        fox_ramp = N.new("ShaderNodeValToRGB")
        fox_ramp.color_ramp.elements[0].position = 0.68
        fox_ramp.color_ramp.elements[0].color = (1.0, 1.0, 1.0, 1.0)
        fox_ramp.color_ramp.elements[1].position = 0.84
        fox_ramp.color_ramp.elements[1].color = (
            1.0 - foxing_strength * 0.55,
            1.0 - foxing_strength * 0.80,
            1.0 - foxing_strength * 1.15,
            1.0,
        )
        Lk(fox_nz.outputs["Fac"], fox_ramp.inputs["Fac"])
        paper_col = kit._multiply(N, Lk, paper_col, fox_ramp.outputs["Color"])

    Lk(paper_col, bsdf.inputs["Base Color"])

    bump = N.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = bump_strength
    bump.inputs["Distance"].default_value = 0.0003
    Lk(fiber_nz.outputs["Fac"], bump.inputs["Height"])

    if plaster_norm:
        tex_n = N.new("ShaderNodeTexImage")
        tex_n.image = bpy.data.images.load(plaster_norm, check_existing=True)
        tex_n.image.colorspace_settings.name = "Non-Color"
        tex_n.projection = "BOX"
        Lk(mp_scan.outputs["Vector"], tex_n.inputs["Vector"])
        nm = N.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = 0.16
        Lk(tex_n.outputs["Color"], nm.inputs["Color"])
        Lk(nm.outputs["Normal"], bump.inputs["Normal"])

    Lk(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


# ── 1. RIGID LEATHER DOSSIER COVER BOARD (dossier-cover-board-v4) ──────────
def render_cover_board():
    scene, _, _, _ = setup_studio(1198, 1150, ortho_scale=0.334, samples=96, transparent=True)
    add_shadow_catcher(z=-0.0004)

    leather_mat = make_oxblood_leather_mat("CoverBoardLeather", scale=2.2, brightness=1.05)
    board_edge_mat = make_oxblood_leather_mat("CoverBoardEdge", scale=3.2, brightness=0.55)

    w, h, thick = 0.318, 0.305, 0.0038
    turn_in = 0.0042
    crease_w = 0.0014

    # Exposed dark layered bookboard core underneath, slightly offset (+0.8mm right, -0.8mm bottom)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0007, -0.0007, thick * 0.35))
    core = bpy.context.active_object
    core.scale = (w * 0.5, h * 0.5, thick * 0.35)
    bpy.ops.object.transform_apply(scale=True)
    kit.bevel(core, width=0.0006, segments=2)
    core.data.materials.append(board_edge_mat)

    bm = bmesh.new()
    v00 = bm.verts.new((-w / 2, -h / 2, 0.0005))
    v10 = bm.verts.new((w / 2, -h / 2, 0.0005))
    v11 = bm.verts.new((w / 2, h / 2, 0.0005))
    v01 = bm.verts.new((-w / 2, h / 2, 0.0005))
    base_face = bm.faces.new((v00, v10, v11, v01))

    top_geom = bmesh.ops.extrude_face_region(bm, geom=[base_face])["geom"]
    top_verts = [ele for ele in top_geom if isinstance(ele, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=top_verts, vec=(0.0, 0.0, thick))
    top_faces = [ele for ele in top_geom if isinstance(ele, bmesh.types.BMFace)]

    # 1) Narrow flat folded leather turn-in (~4mm)
    res1 = bmesh.ops.inset_region(bm, faces=top_faces, thickness=turn_in, depth=0.00035, use_even_offset=True)
    # 2) Fine blind-tooled recessed seam just inside the turn-in
    inner1 = [f for f in bm.faces if f not in res1["faces"] and f.normal.z > 0.5]
    res2 = bmesh.ops.inset_region(bm, faces=inner1, thickness=crease_w, depth=-0.00065, use_even_offset=True)
    # 3) Flat inner lining board
    inner2 = [f for f in bm.faces if f not in res1["faces"] and f not in res2["faces"] and f.normal.z > 0.5]
    bmesh.ops.inset_region(bm, faces=inner2, thickness=0.0014, depth=0.00045, use_even_offset=True)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new("CoverBoardMesh")
    bm.to_mesh(mesh)
    bm.free()

    board = bpy.data.objects.new("CoverBoard", mesh)
    kit.link(board)
    board.data.materials.append(leather_mat)

    bev = board.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.0008
    bev.segments = 3
    bev.limit_method = "ANGLE"

    out_path = os.path.join(OUT_DIR, "dossier-cover-board-v4.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


# ── 2. FULL-BLEED OXBLOOD CALFSKIN LEATHER (dossier-leather-real-v1) ───────
def render_leather_fullbleed():
    scene, _, _, _ = setup_studio(1536, 1024, ortho_scale=0.45, samples=80, transparent=False)
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=180, y_subdivisions=120, size=0.52, location=(0.0, 0.0, 0.0))
    hide = bpy.context.active_object
    hide.scale = (1.0, 0.68, 1.0)
    bpy.ops.object.transform_apply(scale=True)

    bm = bmesh.new()
    bm.from_mesh(hide.data)
    for v in bm.verts:
        x, y, _ = v.co
        z = (
            0.0012 * math.sin(x * 19.0 + y * 11.0)
            + 0.0007 * math.cos(x * 37.0 - y * 29.0)
            + 0.0004 * math.sin((x * x + y * y) * 85.0)
        )
        v.co.z = z
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(hide.data)
    bm.free()
    for poly in hide.data.polygons:
        poly.use_smooth = True

    mat = make_oxblood_leather_mat("FullBleedLeather", scale=2.0, brightness=1.08)
    hide.data.materials.append(mat)

    out_path = os.path.join(OUT_DIR, "dossier-leather-real-v1.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


# ── HELPER: 3D DISPLACED ARCHIVAL PAPER SHEET (CRISP STRAIGHT CUT EDGES) ───
def build_paper_sheet(
    name,
    width,
    height,
    thickness=0.00045,
    sub_x=140,
    sub_y=140,
    edge_waviness=0.00012,
    corner_curl=0.0014,
    creases=(),
    seed=1.0,
):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=sub_x, y_segments=sub_y, size=0.5)
    for v in bm.verts:
        nx = v.co.x * 2.0  # -1..1
        ny = v.co.y * 2.0  # -1..1
        x = nx * (width * 0.5)
        y = ny * (height * 0.5)

        # Crisp straight-cut paper edge with only microscopic fiber irregularity
        edge_factor = max(abs(nx), abs(ny))
        if edge_factor > 0.96 and edge_waviness > 0.0:
            t = (edge_factor - 0.96) / 0.04
            wav_x = edge_waviness * t * (
                0.5 * math.sin(ny * 83.0 + seed) + 0.5 * math.cos(ny * 149.0 + seed * 2.1)
            )
            wav_y = edge_waviness * t * (
                0.5 * math.cos(nx * 79.0 - seed) + 0.5 * math.sin(nx * 137.0 + seed * 1.7)
            )
            x += wav_x
            y += wav_y

        # Subtle softened worn corners (~1.2mm radius)
        if abs(nx) > 0.96 and abs(ny) > 0.96:
            cx = (abs(nx) - 0.96) / 0.04
            cy = (abs(ny) - 0.96) / 0.04
            pull = 0.0011 * (cx * cy)
            x -= math.copysign(pull, x)
            y -= math.copysign(pull, y)

        z = 0.00022 * math.sin(nx * 4.2 + seed) * math.cos(ny * 3.8 - seed * 0.5)
        if nx > 0.55 and ny < -0.55:
            c_fac = ((nx - 0.55) / 0.45) * ((-ny - 0.55) / 0.45)
            z += corner_curl * (c_fac ** 1.6)

        for cy_pos, c_amp, c_sharp in creases:
            dist = abs(ny - cy_pos)
            z += c_amp * math.exp(-((dist / c_sharp) ** 2))

        v.co = Vector((x, y, z + thickness + 0.0002))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name + "Mesh")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    kit.link(obj)
    for poly in obj.data.polygons:
        poly.use_smooth = True

    solid = obj.modifiers.new("Solidify", "SOLIDIFY")
    solid.thickness = thickness
    solid.offset = -1.0
    return obj


# ── 3. AGED ARCHIVAL READING SHEET (dossier-paper-aged-v3) ─────────────────
def render_paper_aged():
    scene, _, _, _ = setup_studio(1173, 1159, ortho_scale=0.312, samples=80, transparent=True)
    add_shadow_catcher(z=-0.0004)

    sheet = build_paper_sheet(
        "DossierPaperAged",
        width=0.298,
        height=0.294,
        thickness=0.0005,
        edge_waviness=0.00012,
        corner_curl=0.0014,
        creases=[(0.02, 0.00048, 0.045)],
        seed=2.4,
    )
    mat = make_archival_paper_mat(
        "DossierPaperAgedMat",
        base_ivory=(0.915, 0.868, 0.762),
        edge_amber=(0.785, 0.695, 0.535),
        foxing_strength=0.10,
        bump_strength=0.15,
        half_w=0.149,
        half_h=0.147,
    )
    sheet.data.materials.append(mat)

    out_path = os.path.join(OUT_DIR, "dossier-paper-aged-v3.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


# ── 4. NARROW BUFF INDEX LEAF (dossier-index-aged-v3) ──────────────────────
def render_index_aged():
    scene, _, _, _ = setup_studio(635, 1956, ortho_scale=0.46, samples=80, transparent=True)
    add_shadow_catcher(z=-0.0004)

    leaf = build_paper_sheet(
        "DossierIndexAged",
        width=0.142,
        height=0.442,
        thickness=0.0006,
        sub_x=80,
        sub_y=180,
        edge_waviness=0.00010,
        corner_curl=0.0011,
        creases=[(-0.18, 0.00038, 0.05), (0.24, -0.00032, 0.04)],
        seed=5.1,
    )
    mat = make_archival_paper_mat(
        "DossierIndexAgedMat",
        base_ivory=(0.885, 0.832, 0.718),
        edge_amber=(0.745, 0.652, 0.495),
        foxing_strength=0.12,
        bump_strength=0.16,
        half_w=0.071,
        half_h=0.221,
    )
    leaf.data.materials.append(mat)

    out_path = os.path.join(OUT_DIR, "dossier-index-aged-v3.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


# ── 5. SMOOTH ARCHIVAL NOTEBOOK/DOSSIER SHEET (dossier-sheet-v2) ───────────
def render_sheet_v2():
    scene, _, _, _ = setup_studio(1200, 1200, ortho_scale=0.312, samples=80, transparent=True)
    add_shadow_catcher(z=-0.0004)

    sheet = build_paper_sheet(
        "DossierSheetV2",
        width=0.300,
        height=0.300,
        thickness=0.00042,
        edge_waviness=0.00008,
        corner_curl=0.0009,
        creases=[],
        seed=7.7,
    )
    mat = make_archival_paper_mat(
        "DossierSheetV2Mat",
        base_ivory=(0.935, 0.895, 0.805),
        edge_amber=(0.825, 0.752, 0.625),
        foxing_strength=0.05,
        bump_strength=0.11,
        half_w=0.150,
        half_h=0.150,
    )
    sheet.data.materials.append(mat)

    out_path = os.path.join(OUT_DIR, "dossier-sheet-v2.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


# ── 6. STEEL 2-RING BINDER MECHANISM (dossier-steel-binding-v3) ────────────
def render_steel_binding():
    scene, _, _, _ = setup_studio(368, 1495, ortho_scale=0.365, samples=96, transparent=True)
    add_shadow_catcher(z=-0.0004)

    steel_mat = bpy.data.materials.new("AgedNickelSteel")
    steel_mat.use_nodes = True
    nt = steel_mat.node_tree
    N = nt.nodes
    Lk = nt.links.new
    bsdf = N["Principled BSDF"]
    bsdf.inputs["Metallic"].default_value = 0.92

    tc = N.new("ShaderNodeTexCoord")
    mp = N.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (6.0, 28.0, 6.0)
    Lk(tc.outputs["Object"], mp.inputs["Vector"])

    scratch_nz = N.new("ShaderNodeTexNoise")
    scratch_nz.inputs["Scale"].default_value = 38.0
    scratch_nz.inputs["Detail"].default_value = 12.0
    scratch_nz.inputs["Roughness"].default_value = 0.78
    Lk(mp.outputs["Vector"], scratch_nz.inputs["Vector"])

    rust_nz = N.new("ShaderNodeTexNoise")
    rust_nz.inputs["Scale"].default_value = 14.0
    rust_nz.inputs["Detail"].default_value = 8.0
    Lk(tc.outputs["Object"], rust_nz.inputs["Vector"])

    col_ramp = N.new("ShaderNodeValToRGB")
    col_ramp.color_ramp.elements[0].position = 0.25
    col_ramp.color_ramp.elements[0].color = (0.30, 0.27, 0.23, 1.0)
    col_ramp.color_ramp.elements[1].position = 0.72
    col_ramp.color_ramp.elements[1].color = (0.68, 0.65, 0.60, 1.0)
    Lk(rust_nz.outputs["Fac"], col_ramp.inputs["Fac"])
    Lk(col_ramp.outputs["Color"], bsdf.inputs["Base Color"])

    rough_map = N.new("ShaderNodeMapRange")
    rough_map.inputs["To Min"].default_value = 0.34
    rough_map.inputs["To Max"].default_value = 0.62
    Lk(scratch_nz.outputs["Fac"], rough_map.inputs["Value"])
    Lk(rough_map.outputs["Result"], bsdf.inputs["Roughness"])

    bump = N.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.14
    bump.inputs["Distance"].default_value = 0.0004
    Lk(scratch_nz.outputs["Fac"], bump.inputs["Height"])
    Lk(bump.outputs["Normal"], bsdf.inputs["Normal"])

    brass_tarnish = bpy.data.materials.new("RivetBrass")
    brass_tarnish.use_nodes = True
    b_bsdf = brass_tarnish.node_tree.nodes["Principled BSDF"]
    b_bsdf.inputs["Base Color"].default_value = (0.46, 0.36, 0.23, 1.0)
    b_bsdf.inputs["Metallic"].default_value = 0.88
    b_bsdf.inputs["Roughness"].default_value = 0.46

    # 1) Pressed steel vertical backing spine plate
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, 0.0018))
    plate = bpy.context.active_object
    plate.scale = (0.0085, 0.168, 0.0018)
    bpy.ops.object.transform_apply(scale=True)
    kit.bevel(plate, width=0.0012, segments=3)
    plate.data.materials.append(steel_mat)

    # Central raised spine rib
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.0032, depth=0.308, location=(0.0, 0.0, 0.0036))
    rib = bpy.context.active_object
    rib.rotation_euler = (math.radians(90), 0.0, 0.0)
    rib.scale = (1.0, 0.55, 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    rib.data.materials.append(steel_mat)

    # 2) Two domed rivets near top and bottom
    for ry in (0.152, -0.152):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.0044, location=(0.0, ry, 0.0035))
        rivet = bpy.context.active_object
        rivet.scale = (1.0, 1.0, 0.48)
        bpy.ops.object.transform_apply(scale=True)
        for p in rivet.data.polygons:
            p.use_smooth = True
        rivet.data.materials.append(brass_tarnish)

    # 3) Two closed elliptical steel arch rings at upper and lower quarters
    for ring_y in (0.090, -0.090):
        bpy.ops.mesh.primitive_torus_add(
            major_segments=72,
            minor_segments=24,
            major_radius=0.034,
            minor_radius=0.0024,
            location=(0.0, ring_y, 0.0062),
        )
        ring = bpy.context.active_object
        ring.scale = (1.0, 0.28, 1.35)
        bpy.ops.object.transform_apply(scale=True)
        for p in ring.data.polygons:
            p.use_smooth = True
        ring.data.materials.append(steel_mat)

        # Ring collar clamp on spine
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, ring_y, 0.0045))
        collar = bpy.context.active_object
        collar.scale = (0.0098, 0.0068, 0.0032)
        bpy.ops.object.transform_apply(scale=True)
        kit.bevel(collar, width=0.0008, segments=2)
        collar.data.materials.append(steel_mat)

    # 4) Connected bottom locking latch lever pivoted right on the lower spine
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0028, -0.138, 0.0048))
    latch = bpy.context.active_object
    latch.scale = (0.0045, 0.0115, 0.0014)
    latch.rotation_euler = (0.0, 0.0, math.radians(-16))
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    kit.bevel(latch, width=0.0005, segments=2)
    latch.data.materials.append(steel_mat)

    out_path = os.path.join(OUT_DIR, "dossier-steel-binding-v3.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


# ── 7. FOLDED CORRESPONDENCE LETTER PAPER (letter-paper-v2) ────────────────
def render_letter_paper():
    scene, _, _, _ = setup_studio(1024, 1365, ortho_scale=0.395, samples=80, transparent=True)
    add_shadow_catcher(z=-0.0004)

    sheet = build_paper_sheet(
        "LetterPaperV2",
        width=0.282,
        height=0.378,
        thickness=0.00045,
        sub_x=130,
        sub_y=170,
        edge_waviness=0.00010,
        corner_curl=0.0012,
        creases=[
            (0.34, 0.00068, 0.028),
            (0.0, -0.00058, 0.032),
            (-0.34, 0.00068, 0.028),
        ],
        seed=3.9,
    )
    mat = make_archival_paper_mat(
        "LetterPaperV2Mat",
        base_ivory=(0.925, 0.882, 0.785),
        edge_amber=(0.795, 0.715, 0.575),
        foxing_strength=0.08,
        bump_strength=0.14,
        half_w=0.141,
        half_h=0.189,
    )
    sheet.data.materials.append(mat)

    out_path = os.path.join(OUT_DIR, "letter-paper-v2.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


# ── 8. 3D PRESSED CRIMSON WAX SEAL (SMOOTH POLAR MESH) (red-wax-seal) ──────
def render_wax_seal():
    scene, _, _, _ = setup_studio(512, 512, ortho_scale=0.092, samples=96, transparent=True)
    add_shadow_catcher(z=-0.0004)

    bm = bmesh.new()
    rings = 110
    segs = 180
    center_v = bm.verts.new((0.0, 0.0, 0.0014))
    ring_verts = []

    for ir in range(1, rings + 1):
        u = ir / rings  # 0..1
        row = []
        for iseg in range(segs):
            ang = (iseg / segs) * math.tau
            max_r = 0.038 * (
                1.0
                + 0.062 * math.sin(ang * 3.0 + 0.7)
                + 0.038 * math.cos(ang * 5.0 - 1.2)
                + 0.022 * math.sin(ang * 8.0 + 2.1)
            )
            r = u * max_r
            x = r * math.cos(ang)
            y = r * math.sin(ang)

            if u > 0.70:
                lip_t = (u - 0.70) / 0.30
                z = 0.0042 * (math.sin(lip_t * math.pi) ** 0.82)
                z += 0.00035 * math.sin(ang * 7.0 + u * 18.0)
            else:
                basin_t = u / 0.70
                z = 0.0013 + 0.00035 * (basin_t ** 2)
                ring_d = abs(u - 0.61)
                z += 0.00072 * math.exp(-((ring_d / 0.026) ** 2))

                # Central relief impression of an antique warded key
                bow_r = math.hypot(x, y + 0.0085)
                bow_ring = abs(bow_r - 0.0052)
                if bow_ring < 0.0017:
                    z += 0.00095 * math.cos((bow_ring / 0.0017) * math.pi * 0.5)
                if abs(x) < 0.0014 and -0.0035 <= y <= 0.0135:
                    z += 0.00095 * math.cos((x / 0.0014) * math.pi * 0.5)
                if 0.0010 <= x <= 0.0064 and 0.0065 <= y <= 0.0125:
                    if not (0.0032 <= x <= 0.0046 and 0.0086 <= y <= 0.0104):
                        z += 0.00085

            row.append(bm.verts.new((x, y, z + 0.0002)))
        ring_verts.append(row)

    # Connect center fan
    first_row = ring_verts[0]
    for iseg in range(segs):
        bm.faces.new((center_v, first_row[iseg], first_row[(iseg + 1) % segs]))

    # Connect quad rings
    for ir in range(rings - 1):
        r0 = ring_verts[ir]
        r1 = ring_verts[ir + 1]
        for iseg in range(segs):
            jn = (iseg + 1) % segs
            bm.faces.new((r0[iseg], r1[iseg], r1[jn], r0[jn]))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new("WaxSealMesh")
    bm.to_mesh(mesh)
    bm.free()

    seal = bpy.data.objects.new("WaxSeal", mesh)
    kit.link(seal)
    for p in seal.data.polygons:
        p.use_smooth = True

    solid = seal.modifiers.new("Solidify", "SOLIDIFY")
    solid.thickness = 0.0006
    solid.offset = -1.0

    wax_mat = bpy.data.materials.new("CrimsonSealingWax")
    wax_mat.use_nodes = True
    nt = wax_mat.node_tree
    N = nt.nodes
    Lk = nt.links.new
    bsdf = N["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.48, 0.058, 0.040, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.38
    bsdf.inputs["Specular IOR Level"].default_value = 0.42
    if "Subsurface Weight" in bsdf.inputs:
        bsdf.inputs["Subsurface Weight"].default_value = 0.16
        bsdf.inputs["Subsurface Radius"].default_value = (0.8, 0.15, 0.08)

    tc = N.new("ShaderNodeTexCoord")
    nz = N.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 65.0
    nz.inputs["Detail"].default_value = 8.0
    Lk(tc.outputs["Object"], nz.inputs["Vector"])

    bump = N.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.12
    bump.inputs["Distance"].default_value = 0.0003
    Lk(nz.outputs["Fac"], bump.inputs["Height"])
    Lk(bump.outputs["Normal"], bsdf.inputs["Normal"])

    seal.data.materials.append(wax_mat)

    out_path = os.path.join(OUT_DIR, "red-wax-seal.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


# ── 9. 3D FOLDED ENVELOPE BACK (envelope-back) ─────────────────────────────
def render_envelope_back():
    scene, _, _, _ = setup_studio(1320, 800, ortho_scale=0.34, samples=80, transparent=True)
    add_shadow_catcher(z=-0.0004)

    w, h = 0.312, 0.189
    hw, hh = w * 0.5, h * 0.5

    env_mat = make_archival_paper_mat(
        "EnvelopePaperMat",
        base_ivory=(0.885, 0.832, 0.715),
        edge_amber=(0.755, 0.668, 0.522),
        foxing_strength=0.09,
        bump_strength=0.15,
        half_w=hw,
        half_h=hh,
    )

    def make_flap(name, coords, z_base, thickness=0.00045):
        bm = bmesh.new()
        verts = [bm.verts.new((x, y, z_base)) for (x, y) in coords]
        bm.faces.new(verts)
        bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=24, use_grid_fill=True)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        m = bpy.data.meshes.new(name + "Mesh")
        bm.to_mesh(m)
        bm.free()
        obj = bpy.data.objects.new(name, m)
        kit.link(obj)
        solid = obj.modifiers.new("Solidify", "SOLIDIFY")
        solid.thickness = thickness
        solid.offset = 1.0
        bev = obj.modifiers.new("Bevel", "BEVEL")
        bev.width = 0.0003
        bev.segments = 2
        obj.data.materials.append(env_mat)
        return obj

    make_flap("EnvBase", [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)], 0.0002)
    make_flap("EnvLeft", [(-hw, -hh), (0.02, -0.01), (0.02, 0.01), (-hw, hh)], 0.0007)
    make_flap("EnvRight", [(hw, -hh), (hw, hh), (-0.02, 0.01), (-0.02, -0.01)], 0.0009)
    make_flap("EnvBottom", [(-hw, -hh), (hw, -hh), (0.04, 0.018), (-0.04, 0.018)], 0.0013)
    make_flap("EnvTopFlap", [(-hw, hh), (hw, hh), (0.0, -0.038)], 0.0018)

    out_path = os.path.join(OUT_DIR, "envelope-back.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


# ── 10. 3D MANILA EVIDENCE TAG (evidence-tag-3d) ───────────────────────────
def render_evidence_tag():
    scene, _, _, _ = setup_studio(640, 260, ortho_scale=0.185, samples=80, transparent=True)
    add_shadow_catcher(z=-0.0004)

    w, h = 0.174, 0.068
    hw, hh = w * 0.5, h * 0.5
    clip = 0.014
    hole_x = -hw + 0.018

    manila_mat = make_archival_paper_mat(
        "ManilaTagMat",
        base_ivory=(0.885, 0.802, 0.618),
        edge_amber=(0.765, 0.662, 0.475),
        foxing_strength=0.10,
        bump_strength=0.17,
        half_w=hw,
        half_h=hh,
    )
    patch_mat = make_archival_paper_mat(
        "ManilaPatchMat",
        base_ivory=(0.785, 0.675, 0.485),
        edge_amber=(0.685, 0.575, 0.395),
        foxing_strength=0.08,
        bump_strength=0.19,
        half_w=0.012,
        half_h=0.012,
    )
    brass_mat = bpy.data.materials.new("EyeletBrass")
    brass_mat.use_nodes = True
    b_bsdf = brass_mat.node_tree.nodes["Principled BSDF"]
    b_bsdf.inputs["Base Color"].default_value = (0.52, 0.40, 0.23, 1.0)
    b_bsdf.inputs["Metallic"].default_value = 0.88
    b_bsdf.inputs["Roughness"].default_value = 0.42

    bm = bmesh.new()
    pts = [
        (-hw + clip, -hh),
        (hw, -hh),
        (hw, hh),
        (-hw + clip, hh),
        (-hw, hh - clip),
        (-hw, -hh + clip),
    ]
    v_outer = [bm.verts.new((x, y, 0.0004)) for (x, y) in pts]
    bm.faces.new(v_outer)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    m = bpy.data.meshes.new("EvidenceTagMesh")
    bm.to_mesh(m)
    bm.free()

    tag_obj = bpy.data.objects.new("EvidenceTag", m)
    kit.link(tag_obj)
    solid = tag_obj.modifiers.new("Solidify", "SOLIDIFY")
    solid.thickness = 0.0006
    solid.offset = 1.0
    tag_obj.data.materials.append(manila_mat)

    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.0046, depth=0.01, location=(hole_x, 0.0, 0.0))
    cutter = bpy.context.active_object
    cutter.hide_render = True
    bool_mod = tag_obj.modifiers.new("PunchHole", "BOOLEAN")
    bool_mod.operation = "DIFFERENCE"
    bool_mod.object = cutter

    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.0092, depth=0.0003, location=(hole_x, 0.0, 0.0011))
    patch = bpy.context.active_object
    patch.data.materials.append(patch_mat)
    bool_p = patch.modifiers.new("PatchHole", "BOOLEAN")
    bool_p.operation = "DIFFERENCE"
    bool_p.object = cutter

    bpy.ops.mesh.primitive_torus_add(
        major_segments=48,
        minor_segments=20,
        major_radius=0.0052,
        minor_radius=0.0011,
        location=(hole_x, 0.0, 0.0013),
    )
    eyelet = bpy.context.active_object
    eyelet.scale = (1.0, 1.0, 0.55)
    bpy.ops.object.transform_apply(scale=True)
    for p in eyelet.data.polygons:
        p.use_smooth = True
    eyelet.data.materials.append(brass_mat)

    out_path = os.path.join(OUT_DIR, "evidence-tag-3d.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


TARGETS = {
    "cover": render_cover_board,
    "leather": render_leather_fullbleed,
    "paper": render_paper_aged,
    "index": render_index_aged,
    "sheet": render_sheet_v2,
    "steel": render_steel_binding,
    "letter": render_letter_paper,
    "wax": render_wax_seal,
    "envelope": render_envelope_back,
    "tag": render_evidence_tag,
}

if __name__ == "__main__":
    which = kit.arg("--target", "all")
    if which == "all":
        for fn in TARGETS.values():
            fn()
    elif which in TARGETS:
        TARGETS[which]()
    else:
        raise ValueError(f"Unknown --target {which}")
