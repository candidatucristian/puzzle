# Reproducible Blender 4.5 Cycles studio pipeline for:
#   1. 3D Header Tool Buttons (btn-map-3d, btn-notebook-3d, btn-casefile-3d)
#   2. 3D Notebook Shelf Tabs & Sketch Pad (notebook-folder-tab-3d, notebook-folder-tab-open-3d, notebook-sketch-paper-3d)
#   3. 3D Architect's Drafting Board & Folded Vellum Plan (map-board-3d)
#
# Run:
#   "C:\Users\crist\Tools\blender-4.5.15-windows-x64\blender.exe" -b -P art/blender/ui_tools_blender.py -- --target all

import bpy
import bmesh
import math
import os
import sys
from mathutils import Vector

ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import kit
from dossier_cover import (
    OUT_DIR,
    setup_studio,
    add_shadow_catcher,
    make_oxblood_leather_mat,
    make_archival_paper_mat,
    build_paper_sheet,
)


def make_aged_brass_mat(name="AgedBrass", tint=(0.66, 0.52, 0.28), rough=0.36):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    N = nt.nodes
    Lk = nt.links.new
    bsdf = N["Principled BSDF"]
    bsdf.inputs["Metallic"].default_value = 0.90

    tc = N.new("ShaderNodeTexCoord")
    nz = N.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 28.0
    nz.inputs["Detail"].default_value = 10.0
    Lk(tc.outputs["Object"], nz.inputs["Vector"])

    ramp = N.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.25
    ramp.color_ramp.elements[0].color = (tint[0] * 0.65, tint[1] * 0.62, tint[2] * 0.58, 1.0)
    ramp.color_ramp.elements[1].position = 0.78
    ramp.color_ramp.elements[1].color = (
        min(1.0, tint[0] * 1.15),
        min(1.0, tint[1] * 1.12),
        min(1.0, tint[2] * 1.08),
        1.0,
    )
    Lk(nz.outputs["Fac"], ramp.inputs["Fac"])
    Lk(ramp.outputs["Color"], bsdf.inputs["Base Color"])

    mr = N.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = max(0.22, rough - 0.10)
    mr.inputs["To Max"].default_value = min(0.72, rough + 0.16)
    Lk(nz.outputs["Fac"], mr.inputs["Value"])
    Lk(mr.outputs["Result"], bsdf.inputs["Roughness"])

    bump = N.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.12
    bump.inputs["Distance"].default_value = 0.0003
    Lk(nz.outputs["Fac"], bump.inputs["Height"])
    Lk(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def make_mahogany_board_mat(name="MahoganyDraftingBoard"):
    return kit.pbr(
        name,
        "rosewood_veneer1",
        size=0.38,
        tint=(0.68, 0.48, 0.34),
        rough=(0.48, 0.74),
        bump=0.55,
        sat=0.92,
        bright=0.68,
        spec=0.22,
        dirt=0.20,
        grime=0.14,
    )


# ── 1. 3D MAP DRAFTING BOARD & FOLDED VELLUM PLAN (map-board-3d) ───────────
def render_map_board():
    # Exact 1000:610 aspect ratio (2000 x 1220)
    w_board, h_board = 0.500, 0.305
    scene, key, fill, _ = setup_studio(2000, 1220, ortho_scale=0.506, samples=96, transparent=True)
    key.data.energy = 9.2
    fill.data.energy = 6.8
    add_shadow_catcher(z=-0.0005)

    mahogany = make_mahogany_board_mat("DraftingMahogany")
    brass = make_aged_brass_mat("DraftingBrass", tint=(0.68, 0.53, 0.29), rough=0.34)

    # 1) Mahogany drafting board base with beveled edge (completely above shadow catcher!)
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(0.0, 0.0, 0.0016))
    board = bpy.context.active_object
    board.scale = (w_board * 0.5, h_board * 0.5, 0.0016)
    bpy.ops.object.transform_apply(scale=True)
    kit.bevel(board, width=0.0014, segments=3)
    board.data.materials.append(mahogany)

    # Brass corner L-brackets flush on the mahogany drafting board corners
    for sx in (-1, 1):
        for sy in (-1, 1):
            cx = sx * (w_board * 0.5 - 0.006)
            cy = sy * (h_board * 0.5 - 0.006)
            bpy.ops.mesh.primitive_cube_add(size=2.0, location=(cx, cy, 0.0033))
            plate = bpy.context.active_object
            plate.scale = (0.007, 0.007, 0.0004)
            bpy.ops.object.transform_apply(scale=True)
            kit.bevel(plate, width=0.0004, segments=2)
            plate.data.materials.append(brass)

    # 2) Crisp straight-cut antique vellum blueprint sheet inset inside the mahogany board rim
    w_paper, h_paper = 0.474, 0.281
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=220, y_segments=140, size=0.5)

    for v in bm.verts:
        nx = v.co.x * 2.0  # -1..1
        ny = v.co.y * 2.0  # -1..1
        x = nx * (w_paper * 0.5)
        y = ny * (h_paper * 0.5)

        edge_f = max(abs(nx), abs(ny))
        if edge_f > 0.96:
            t = (edge_f - 0.96) / 0.04
            x += 0.00012 * t * math.sin(ny * 97.0 + 1.2)
            y += 0.00012 * t * math.cos(nx * 113.0 - 0.8)

        # Subtle 3D fold ridges between the three floor columns + horizontal center crease
        fold_1 = 0.00085 * math.exp(-(((nx + 0.35) / 0.020) ** 2))
        fold_2 = -0.00075 * math.exp(-(((nx - 0.29) / 0.020) ** 2))
        fold_h = 0.00048 * math.exp(-((ny / 0.025) ** 2))
        undul = 0.00025 * math.sin(nx * 5.0 + 0.4) * math.cos(ny * 4.0 - 0.3)

        # Slight edge lift so the paper casts a crisp contact shadow onto the mahogany rim
        edge_lift = 0.00045 * max(0.0, (edge_f - 0.90) / 0.10) ** 1.5
        v.co = Vector((x, y, 0.0038 + fold_1 + fold_2 + fold_h + undul + edge_lift))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    p_mesh = bpy.data.meshes.new("MapVellumMesh")
    bm.to_mesh(p_mesh)
    bm.free()

    vellum = bpy.data.objects.new("MapVellum", p_mesh)
    kit.link(vellum)
    for p in vellum.data.polygons:
        p.use_smooth = True
    solid = vellum.modifiers.new("Solidify", "SOLIDIFY")
    solid.thickness = 0.00055
    solid.offset = -1.0

    vellum_mat = make_archival_paper_mat(
        "MapVellumMat",
        base_ivory=(0.905, 0.855, 0.742),
        edge_amber=(0.765, 0.678, 0.525),
        foxing_strength=0.11,
        bump_strength=0.16,
        half_w=w_paper * 0.5,
        half_h=h_paper * 0.5,
    )
    vellum.data.materials.append(vellum_mat)

    # 3) Four 3D tarnished brass architect's drawing pins at the 4 corners of the sheet
    for sx in (-1, 1):
        for sy in (-1, 1):
            px = sx * (w_paper * 0.5 - 0.009)
            py = sy * (h_paper * 0.5 - 0.009)
            bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.0044, depth=0.0012, location=(px, py, 0.0046))
            pin = bpy.context.active_object
            kit.bevel(pin, width=0.0004, segments=3)
            for p in pin.data.polygons:
                p.use_smooth = True
            pin.data.materials.append(brass)

            bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.0019, location=(px, py, 0.0052))
            cap = bpy.context.active_object
            cap.scale = (1.0, 1.0, 0.35)
            bpy.ops.object.transform_apply(scale=True)
            for p in cap.data.polygons:
                p.use_smooth = True
            cap.data.materials.append(brass)

    out_path = os.path.join(OUT_DIR, "map-board-3d.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


# ── 2. 3D NOTEBOOK FOLDER TABS & SKETCH PAD ────────────────────────────────
def render_notebook_folder_tab(is_open=False):
    scene, _, _, _ = setup_studio(640, 120, ortho_scale=0.220, samples=80, transparent=True)
    add_shadow_catcher(z=-0.0004)

    w, h = 0.214, 0.036
    hw, hh = w * 0.5, h * 0.5

    base_col = (0.935, 0.858, 0.678) if is_open else (0.855, 0.735, 0.505)
    edge_col = (0.815, 0.715, 0.525) if is_open else (0.725, 0.598, 0.385)
    manila = make_archival_paper_mat(
        "NotebookTabManila_" + ("Open" if is_open else "Closed"),
        base_ivory=base_col,
        edge_amber=edge_col,
        foxing_strength=0.08,
        bump_strength=0.16,
        half_w=hw,
        half_h=hh,
    )

    tab = build_paper_sheet(
        "NotebookFolderTab",
        width=w,
        height=h,
        thickness=0.00055,
        sub_x=120,
        sub_y=36,
        edge_waviness=0.00005,
        corner_curl=0.0003,
        creases=[],
        seed=4.2 if is_open else 1.8,
    )
    tab.data.materials.append(manila)

    if is_open:
        crimson = bpy.data.materials.new("CrimsonMarker")
        crimson.use_nodes = True
        c_bsdf = crimson.node_tree.nodes["Principled BSDF"]
        c_bsdf.inputs["Base Color"].default_value = (0.54, 0.11, 0.08, 1.0)
        c_bsdf.inputs["Roughness"].default_value = 0.55
        bpy.ops.mesh.primitive_cube_add(size=2.0, location=(-hw + 0.0018, 0.0, 0.0011))
        bar = bpy.context.active_object
        bar.scale = (0.0016, hh - 0.0012, 0.0004)
        bpy.ops.object.transform_apply(scale=True)
        kit.bevel(bar, width=0.0002, segments=2)
        bar.data.materials.append(crimson)

    # Connected 3D miniature manila folder emblem on the left side of the tab
    emblem_mat = make_archival_paper_mat(
        "FolderEmblemMat",
        base_ivory=(0.52, 0.38, 0.20) if not is_open else (0.60, 0.44, 0.24),
        edge_amber=(0.38, 0.26, 0.12),
        foxing_strength=0.04,
        bump_strength=0.14,
        half_w=0.008,
        half_h=0.006,
    )
    ex, ey = -hw + 0.0155, -0.0005
    # Back leaf + top-left ear overlapped so there is zero gap
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(ex, ey, 0.0011))
    f_back = bpy.context.active_object
    f_back.scale = (0.0068, 0.0048, 0.0003)
    bpy.ops.object.transform_apply(scale=True)
    kit.bevel(f_back, width=0.0002, segments=2)
    f_back.data.materials.append(emblem_mat)

    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(ex - 0.0036, ey + 0.0048, 0.0011))
    f_ear = bpy.context.active_object
    f_ear.scale = (0.0032, 0.0014, 0.0003)
    bpy.ops.object.transform_apply(scale=True)
    kit.bevel(f_ear, width=0.0002, segments=2)
    f_ear.data.materials.append(emblem_mat)

    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(ex, ey - 0.0008, 0.0015))
    f_front = bpy.context.active_object
    f_front.scale = (0.0068, 0.0040, 0.00028)
    if is_open:
        f_front.rotation_euler = (math.radians(22), 0.0, math.radians(-2))
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    kit.bevel(f_front, width=0.0002, segments=2)
    f_front.data.materials.append(emblem_mat)

    fname = "notebook-folder-tab-open-3d.png" if is_open else "notebook-folder-tab-3d.png"
    out_path = os.path.join(OUT_DIR, fname)
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


def render_notebook_sketch_paper():
    scene, _, _, _ = setup_studio(960, 450, ortho_scale=0.320, samples=80, transparent=False)
    pad = build_paper_sheet(
        "SketchPadSheet",
        width=0.330,
        height=0.156,
        thickness=0.0006,
        sub_x=160,
        sub_y=80,
        edge_waviness=0.0,
        corner_curl=0.0,
        creases=[],
        seed=9.3,
    )
    mat = make_archival_paper_mat(
        "SketchPadMat",
        base_ivory=(0.945, 0.915, 0.845),
        edge_amber=(0.865, 0.818, 0.725),
        foxing_strength=0.04,
        bump_strength=0.18,
        half_w=0.165,
        half_h=0.078,
    )
    pad.data.materials.append(mat)

    out_path = os.path.join(OUT_DIR, "notebook-sketch-paper-3d.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


# ── 3. 3D HEADER BUTTON ICONS (#btn-map, #btn-notebook, #btn-casefile) ─────
def render_btn_map():
    scene, key, fill, _ = setup_studio(256, 256, ortho_scale=0.086, samples=96, transparent=True)
    key.data.energy = 11.0
    fill.data.energy = 7.0
    add_shadow_catcher(z=-0.0004)

    vellum = make_archival_paper_mat(
        "BtnMapVellum",
        base_ivory=(0.915, 0.862, 0.742),
        edge_amber=(0.745, 0.645, 0.485),
        foxing_strength=0.10,
        bump_strength=0.18,
        half_w=0.034,
        half_h=0.028,
    )
    brass = make_aged_brass_mat("BtnMapBrass", tint=(0.76, 0.60, 0.33), rough=0.28)
    ink_mat = bpy.data.materials.new("BlueprintInk")
    ink_mat.use_nodes = True
    ink_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.18, 0.12, 0.08, 1.0)
    ink_mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.85

    crimson_needle = bpy.data.materials.new("CompassRed")
    crimson_needle.use_nodes = True
    crimson_needle.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.62, 0.10, 0.08, 1.0)
    crimson_needle.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.35

    # 3-panel accordion-folded architectural map sheet
    bm = bmesh.new()
    pts = [
        (-0.033, -0.024, 0.0006),
        (-0.011, -0.027, 0.0036),
        (0.011, -0.023, 0.0009),
        (0.033, -0.026, 0.0034),
        (0.033, 0.026, 0.0038),
        (0.011, 0.023, 0.0011),
        (-0.011, 0.027, 0.0039),
        (-0.033, 0.024, 0.0009),
    ]
    v = [bm.verts.new(p) for p in pts]
    bm.faces.new((v[0], v[1], v[6], v[7]))
    bm.faces.new((v[1], v[2], v[5], v[6]))
    bm.faces.new((v[2], v[3], v[4], v[5]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    m = bpy.data.meshes.new("BtnMapSheetMesh")
    bm.to_mesh(m)
    bm.free()

    sheet = bpy.data.objects.new("BtnMapSheet", m)
    sheet.rotation_euler = (0.0, 0.0, math.radians(-4))
    kit.link(sheet)
    solid = sheet.modifiers.new("Solidify", "SOLIDIFY")
    solid.thickness = 0.0014
    bev = sheet.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.0004
    sheet.data.materials.append(vellum)

    # Inked architectural border & floor lines on the map panels
    for rx, ry, rw, rh, rz in [
        (-0.022, 0.002, 0.014, 0.036, 0.0038),
        (-0.022, 0.008, 0.014, 0.012, 0.0038),
        (0.0, 0.002, 0.014, 0.036, 0.0038),
        (0.022, 0.004, 0.013, 0.034, 0.0038),
    ]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(rx, ry, rz))
        line_box = bpy.context.active_object
        line_box.scale = (rw * 0.5, rh * 0.5, 0.0004)
        line_box.rotation_euler = (0.0, 0.0, math.radians(-4))
        bpy.ops.object.transform_apply(rotation=True, scale=True)
        wf = line_box.modifiers.new("Wire", "WIREFRAME")
        wf.thickness = 0.0014
        line_box.data.materials.append(ink_mat)

    # 3D Brass Pocket Compass resting on the lower-right of the map
    cx, cy, cz = 0.011, -0.006, 0.0052
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.0145, depth=0.0014, location=(cx, cy, cz - 0.0006))
    c_dial = bpy.context.active_object
    c_dial.data.materials.append(vellum)

    bpy.ops.mesh.primitive_torus_add(
        major_segments=48, minor_segments=20, major_radius=0.0152, minor_radius=0.0024, location=(cx, cy, cz)
    )
    c_ring = bpy.context.active_object
    for p in c_ring.data.polygons:
        p.use_smooth = True
    c_ring.data.materials.append(brass)

    # Top suspension ring on pocket compass
    bpy.ops.mesh.primitive_torus_add(
        major_segments=32,
        minor_segments=14,
        major_radius=0.0042,
        minor_radius=0.0011,
        location=(cx + 0.003, cy + 0.0185, cz),
    )
    c_loop = bpy.context.active_object
    c_loop.data.materials.append(brass)

    # Compass needle (4-point star + crimson north pointer)
    for ang_deg, length, width, mat_n in [
        (0, 0.0115, 0.0026, crimson_needle),
        (90, 0.0105, 0.0022, brass),
    ]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(cx, cy, cz + 0.0010))
        needle = bpy.context.active_object
        needle.scale = (width, length, 0.0010)
        needle.rotation_euler = (0.0, 0.0, math.radians(ang_deg - 12))
        bpy.ops.object.transform_apply(rotation=True, scale=True)
        kit.bevel(needle, width=0.0005, segments=2)
        needle.data.materials.append(mat_n)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.0022, location=(cx, cy, cz + 0.0018))
    c_cap = bpy.context.active_object
    c_cap.data.materials.append(brass)

    out_path = os.path.join(OUT_DIR, "btn-map-3d.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


def render_btn_notebook():
    scene, key, fill, _ = setup_studio(256, 256, ortho_scale=0.086, samples=96, transparent=True)
    key.data.energy = 11.0
    fill.data.energy = 7.0
    add_shadow_catcher(z=-0.0004)

    leather = make_oxblood_leather_mat("BtnNotebookLeather", scale=3.6, brightness=1.18)
    pages_mat = make_archival_paper_mat(
        "BtnNotebookPages",
        base_ivory=(0.925, 0.875, 0.765),
        edge_amber=(0.785, 0.715, 0.575),
        foxing_strength=0.05,
        bump_strength=0.14,
        half_w=0.025,
        half_h=0.034,
    )
    brass = make_aged_brass_mat("BtnNotebookBrass", tint=(0.76, 0.60, 0.34), rough=0.28)
    wood_mat = bpy.data.materials.new("PencilCedar")
    wood_mat.use_nodes = True
    wood_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.72, 0.50, 0.29, 1.0)
    wood_mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.62

    barrel_mat = bpy.data.materials.new("PencilBarrel")
    barrel_mat.use_nodes = True
    barrel_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.64, 0.16, 0.11, 1.0)
    barrel_mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.42

    eraser_mat = bpy.data.materials.new("PencilEraser")
    eraser_mat.use_nodes = True
    eraser_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.72, 0.36, 0.32, 1.0)
    eraser_mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.78

    graphite_mat = bpy.data.materials.new("PencilGraphite")
    graphite_mat.use_nodes = True
    graphite_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.14, 0.14, 0.15, 1.0)
    graphite_mat.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 0.48
    graphite_mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.32

    # Parent empty for the leather notebook so cover, pages, spine ribs & brass corners rotate together
    nb_root = bpy.data.objects.new("NotebookRoot", None)
    kit.link(nb_root)

    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(0.0, 0.0, 0.0032))
    cover = bpy.context.active_object
    cover.scale = (0.025, 0.034, 0.0030)
    bpy.ops.object.transform_apply(scale=True)
    kit.bevel(cover, width=0.0012, segments=3)
    cover.data.materials.append(leather)
    cover.parent = nb_root

    # Cream page block visibly inset on right edge
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(0.0025, 0.0, 0.0032))
    pages = bpy.context.active_object
    pages.scale = (0.024, 0.032, 0.0022)
    bpy.ops.object.transform_apply(scale=True)
    kit.bevel(pages, width=0.0005, segments=2)
    pages.data.materials.append(pages_mat)
    pages.parent = nb_root

    # Brass corner protectors attached directly to top-right and bottom-right of cover
    for cy in (0.0305, -0.0305):
        bpy.ops.mesh.primitive_cube_add(size=2.0, location=(0.0215, cy, 0.0062))
        c_guard = bpy.context.active_object
        c_guard.scale = (0.0040, 0.0040, 0.0006)
        bpy.ops.object.transform_apply(scale=True)
        kit.bevel(c_guard, width=0.0003, segments=2)
        c_guard.data.materials.append(brass)
        c_guard.parent = nb_root

    # Vertical elastic band / brass clasp on notebook cover
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(0.014, 0.0, 0.0063))
    band = bpy.context.active_object
    band.scale = (0.0022, 0.0342, 0.0004)
    bpy.ops.object.transform_apply(scale=True)
    band.data.materials.append(brass)
    band.parent = nb_root

    nb_root.location = (-0.003, 0.0, 0.0)
    nb_root.rotation_euler = (0.0, 0.0, math.radians(-6))

    # 2) Build the 3D Hexagonal Wooden Pencil along local Y axis under a single parent empty
    p_root = bpy.data.objects.new("PencilRoot", None)
    kit.link(p_root)

    # Hexagonal shaft along Y (-0.021 .. +0.021)
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.0035, depth=0.042, location=(0.0, 0.0, 0.0))
    shaft = bpy.context.active_object
    shaft.rotation_euler = (math.radians(90), 0.0, 0.0)
    bpy.ops.object.transform_apply(rotation=True)
    kit.bevel(shaft, width=0.0003, segments=2)
    shaft.data.materials.append(barrel_mat)
    shaft.parent = p_root

    # Brass ferrule at +Y end (+0.021 .. +0.027)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.0036, depth=0.006, location=(0.0, 0.024, 0.0))
    ferrule = bpy.context.active_object
    ferrule.rotation_euler = (math.radians(90), 0.0, 0.0)
    bpy.ops.object.transform_apply(rotation=True)
    ferrule.data.materials.append(brass)
    ferrule.parent = p_root

    # Red rubber eraser at +Y tip (+0.027 .. +0.032)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.0033, depth=0.005, location=(0.0, 0.0295, 0.0))
    eraser = bpy.context.active_object
    eraser.rotation_euler = (math.radians(90), 0.0, 0.0)
    bpy.ops.object.transform_apply(rotation=True)
    kit.bevel(eraser, width=0.0008, segments=3)
    eraser.data.materials.append(eraser_mat)
    eraser.parent = p_root

    # Sharpened cedar wood cone at -Y end (-0.021 .. -0.031)
    bpy.ops.mesh.primitive_cone_add(
        vertices=32, radius1=0.0034, radius2=0.0012, depth=0.010, location=(0.0, -0.026, 0.0)
    )
    cone = bpy.context.active_object
    cone.rotation_euler = (math.radians(90), 0.0, 0.0)
    bpy.ops.object.transform_apply(rotation=True)
    cone.data.materials.append(wood_mat)
    cone.parent = p_root

    # Graphite lead point at -Y tip (-0.031 .. -0.035)
    bpy.ops.mesh.primitive_cone_add(
        vertices=32, radius1=0.0012, radius2=0.00015, depth=0.0042, location=(0.0, -0.033, 0.0)
    )
    lead = bpy.context.active_object
    lead.rotation_euler = (math.radians(90), 0.0, 0.0)
    bpy.ops.object.transform_apply(rotation=True)
    lead.data.materials.append(graphite_mat)
    lead.parent = p_root

    # Position and rotate the assembled pencil diagonally across the notebook cover
    p_root.location = (0.003, 0.001, 0.0098)
    p_root.rotation_euler = (0.0, 0.0, math.radians(-38))

    out_path = os.path.join(OUT_DIR, "btn-notebook-3d.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


def render_btn_casefile():
    scene, key, fill, _ = setup_studio(256, 256, ortho_scale=0.086, samples=96, transparent=True)
    key.data.energy = 11.0
    fill.data.energy = 7.0
    add_shadow_catcher(z=-0.0004)

    leather = make_oxblood_leather_mat("BtnDossierLeather", scale=3.4, brightness=1.18)
    manila = make_archival_paper_mat(
        "BtnDossierManila",
        base_ivory=(0.905, 0.825, 0.655),
        edge_amber=(0.765, 0.665, 0.485),
        foxing_strength=0.08,
        bump_strength=0.16,
        half_w=0.028,
        half_h=0.032,
    )
    paper = make_archival_paper_mat(
        "BtnDossierSheet",
        base_ivory=(0.945, 0.905, 0.815),
        edge_amber=(0.825, 0.755, 0.625),
        foxing_strength=0.05,
        bump_strength=0.12,
        half_w=0.026,
        half_h=0.032,
    )
    brass = make_aged_brass_mat("BtnDossierBrass", tint=(0.76, 0.60, 0.33), rough=0.28)
    wax_mat = bpy.data.materials.new("BtnDossierWax")
    wax_mat.use_nodes = True
    wax_mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.58, 0.075, 0.052, 1.0)
    wax_mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.34

    # Back folder board
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(-0.002, 0.002, 0.0016))
    back = bpy.context.active_object
    back.scale = (0.029, 0.034, 0.0014)
    back.rotation_euler = (0.0, 0.0, math.radians(4))
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    kit.bevel(back, width=0.0008, segments=3)
    back.data.materials.append(leather)

    # Filed correspondence sheets & manila evidence slips peeking out of the top/right
    for ox, oy, oz, rot_z, mat in [
        (-0.004, 0.006, 0.0032, -6.0, manila),
        (0.004, 0.005, 0.0044, 8.0, paper),
    ]:
        bpy.ops.mesh.primitive_cube_add(size=2.0, location=(ox, oy, oz))
        slip = bpy.context.active_object
        slip.scale = (0.025, 0.031, 0.0006)
        slip.rotation_euler = (0.0, 0.0, math.radians(rot_z))
        bpy.ops.object.transform_apply(rotation=True, scale=True)
        kit.bevel(slip, width=0.0003, segments=2)
        slip.data.materials.append(mat)

    # Front oxblood dossier cover with brass corner guards & brass clasp strap
    cf_root = bpy.data.objects.new("DossierFrontRoot", None)
    kit.link(cf_root)

    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(0.0, 0.0, 0.0062))
    front = bpy.context.active_object
    front.scale = (0.029, 0.031, 0.0015)
    bpy.ops.object.transform_apply(scale=True)
    kit.bevel(front, width=0.0009, segments=3)
    front.data.materials.append(leather)
    front.parent = cf_root

    # Brass corner guards on all 4 corners of the dossier cover
    for sx in (-1, 1):
        for sy in (-1, 1):
            bpy.ops.mesh.primitive_cube_add(
                size=2.0, location=(sx * 0.0252, sy * 0.0272, 0.0078)
            )
            cg = bpy.context.active_object
            cg.scale = (0.0042, 0.0042, 0.0005)
            bpy.ops.object.transform_apply(scale=True)
            kit.bevel(cg, width=0.0003, segments=2)
            cg.data.materials.append(brass)
            cg.parent = cf_root

    # Horizontal brass clasp strap across center
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(0.0, 0.0, 0.0079))
    clasp = bpy.context.active_object
    clasp.scale = (0.0294, 0.0038, 0.0005)
    bpy.ops.object.transform_apply(scale=True)
    kit.bevel(clasp, width=0.0003, segments=2)
    clasp.data.materials.append(brass)
    clasp.parent = cf_root

    # Crimson wax seal with raised outer rim & inner key boss
    bpy.ops.mesh.primitive_torus_add(
        major_segments=48, minor_segments=16, major_radius=0.0072, minor_radius=0.0018, location=(0.0, 0.0, 0.0090)
    )
    seal_rim = bpy.context.active_object
    for p in seal_rim.data.polygons:
        p.use_smooth = True
    seal_rim.data.materials.append(wax_mat)
    seal_rim.parent = cf_root

    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.0068, depth=0.0016, location=(0.0, 0.0, 0.0086))
    seal_base = bpy.context.active_object
    seal_base.data.materials.append(wax_mat)
    seal_base.parent = cf_root

    cf_root.location = (0.001, -0.003, 0.0)
    cf_root.rotation_euler = (0.0, 0.0, math.radians(-2))

    out_path = os.path.join(OUT_DIR, "btn-casefile-3d.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


TARGETS = {
    "map_board": render_map_board,
    "tab_closed": lambda: render_notebook_folder_tab(False),
    "tab_open": lambda: render_notebook_folder_tab(True),
    "sketch_pad": render_notebook_sketch_paper,
    "btn_map": render_btn_map,
    "btn_notebook": render_btn_notebook,
    "btn_casefile": render_btn_casefile,
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
