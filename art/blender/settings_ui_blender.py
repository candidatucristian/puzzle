# Reproducible Blender 4.5 Cycles studio pipeline for the Settings Menu
# (Ashcombe Manor 1961 — Archival Leather Portfolio, Brass Clamp, Aged Ledger Leaf & Calibration Stud):
#   1. settings-leather-board-3d.png (Oxblood Morocco Leather Board with 3D Brass Corner Protectors)
#   2. settings-paper-sheet-3d.png   (3D Displaced Aged Archival Ledger Sheet with Brass Eyelets)
#   3. settings-brass-clip-3d.png    (3D Aged-Brass & Steel Archival Bulldog Clamp)
#   4. settings-slider-knob-3d.png   (Radially Symmetric 3D Brass & Oxblood Slider Stud, centered)
#
# Run:
#   "C:\Users\crist\Tools\blender-4.5.15-windows-x64\blender.exe" -b -P art/blender/settings_ui_blender.py

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
from ui_tools_blender import make_aged_brass_mat


def add_brass_rivet(x, y, z, radius=0.0022, mat=None):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=28, ring_count=14, radius=radius, location=(x, y, z)
    )
    rivet = bpy.context.active_object
    rivet.scale = (1.0, 1.0, 0.44)
    bpy.ops.object.transform_apply(scale=True)
    for p in rivet.data.polygons:
        p.use_smooth = True
    if mat:
        rivet.data.materials.append(mat)
    return rivet


def add_corner_l_bracket(cx, cy, z, sx, sy, arm_len=0.028, arm_w=0.0085, thick=0.0009, brass_mat=None):
    """Builds a 3D brass corner protector at (cx, cy) with zero coplanar overlap."""
    hx = cx - sx * (arm_len * 0.5)
    hy = cy - sy * (arm_w * 0.5)
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(hx, hy, z))
    h_arm = bpy.context.active_object
    h_arm.scale = (arm_len * 0.5, arm_w * 0.5, thick * 0.5)
    bpy.ops.object.transform_apply(scale=True)
    kit.bevel(h_arm, width=0.00035, segments=2)
    if brass_mat:
        h_arm.data.materials.append(brass_mat)

    rem_len = arm_len - arm_w
    vx = cx - sx * (arm_w * 0.5)
    vy = cy - sy * (arm_w + rem_len * 0.5)
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(vx, vy, z))
    v_arm = bpy.context.active_object
    v_arm.scale = (arm_w * 0.5, rem_len * 0.5, thick * 0.5)
    bpy.ops.object.transform_apply(scale=True)
    kit.bevel(v_arm, width=0.00035, segments=2)
    if brass_mat:
        v_arm.data.materials.append(brass_mat)

    r_z = z + thick * 0.5
    add_brass_rivet(cx - sx * (arm_w * 0.5), cy - sy * (arm_w * 0.5), r_z, radius=0.0017, mat=brass_mat)
    add_brass_rivet(cx - sx * (arm_len - 0.0050), cy - sy * (arm_w * 0.5), r_z, radius=0.0015, mat=brass_mat)
    add_brass_rivet(cx - sx * (arm_w * 0.5), cy - sy * (arm_len - 0.0050), r_z, radius=0.0015, mat=brass_mat)


# ── 1. OXBLOOD MOROCCO LEATHER BOARD WITH BRASS CORNERS ────────────────────
def render_settings_leather_board():
    scene, _, _, _ = setup_studio(1080, 1240, ortho_scale=0.376, samples=96, transparent=True)
    add_shadow_catcher(z=-0.0004)

    leather_mat = make_oxblood_leather_mat("SettingsCoverLeather", scale=2.1, brightness=1.04)
    board_edge_mat = make_oxblood_leather_mat("SettingsCoverEdge", scale=3.2, brightness=0.52)
    brass_mat = make_aged_brass_mat("SettingsCornerBrass", tint=(0.68, 0.53, 0.29), rough=0.35)

    w, h, thick = 0.312, 0.358, 0.0038
    turn_in = 0.0044
    crease_w = 0.0014

    # Exposed dark layered bookboard core underneath
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

    # 1) Narrow flat folded leather turn-in
    res1 = bmesh.ops.inset_region(bm, faces=top_faces, thickness=turn_in, depth=0.00035, use_even_offset=True)
    # 2) Fine blind-tooled recessed seam just inside the turn-in
    inner1 = [f for f in bm.faces if f not in res1["faces"] and f.normal.z > 0.5]
    res2 = bmesh.ops.inset_region(bm, faces=inner1, thickness=crease_w, depth=-0.00065, use_even_offset=True)
    # 3) Flat inner lining board
    inner2 = [f for f in bm.faces if f not in res1["faces"] and f not in res2["faces"] and f.normal.z > 0.5]
    bmesh.ops.inset_region(bm, faces=inner2, thickness=0.0014, depth=0.00045, use_even_offset=True)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new("SettingsLeatherBoardMesh")
    bm.to_mesh(mesh)
    bm.free()

    board = bpy.data.objects.new("SettingsLeatherBoard", mesh)
    kit.link(board)
    board.data.materials.append(leather_mat)

    bev = board.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.0008
    bev.segments = 3
    bev.limit_method = "ANGLE"

    # 4 Aged-Brass Corner Protectors fitted flush onto the 4 corners of the leather board
    for sx in (-1, 1):
        for sy in (-1, 1):
            cx = sx * (w * 0.5 - 0.0006)
            cy = sy * (h * 0.5 - 0.0006)
            add_corner_l_bracket(
                cx, cy, z=thick + 0.0011, sx=sx, sy=sy,
                arm_len=0.026, arm_w=0.0078, thick=0.0008, brass_mat=brass_mat
            )

    out_path = os.path.join(OUT_DIR, "settings-leather-board-3d.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


# ── 2. AGED ARCHIVAL LEDGER SHEET WITH BRASS EYELETS ───────────────────────
def render_settings_paper_sheet():
    scene, _, _, _ = setup_studio(1000, 1160, ortho_scale=0.354, samples=80, transparent=True)
    add_shadow_catcher(z=-0.0004)

    w, h = 0.292, 0.338
    sheet = build_paper_sheet(
        "SettingsArchivalSheet",
        width=w,
        height=h,
        thickness=0.00048,
        sub_x=140,
        sub_y=160,
        edge_waviness=0.00010,
        corner_curl=0.0011,
        creases=[(0.18, 0.00032, 0.045), (-0.22, -0.00028, 0.050)],
        seed=3.7,
    )
    mat = make_archival_paper_mat(
        "SettingsArchivalPaperMat",
        base_ivory=(0.922, 0.876, 0.772),
        edge_amber=(0.792, 0.704, 0.548),
        foxing_strength=0.08,
        bump_strength=0.14,
        half_w=w * 0.5,
        half_h=h * 0.5,
    )
    sheet.data.materials.append(mat)

    # Two aged-brass reinforcing eyelets near the top-left and top-right corners
    brass = make_aged_brass_mat("EyeletBrass", tint=(0.66, 0.51, 0.28), rough=0.36)
    hole_dark = bpy.data.materials.new("EyeletHoleDark")
    hole_dark.use_nodes = True
    hole_dark.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.14, 0.08, 0.05, 1.0)
    hole_dark.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.90

    for sx in (-1, 1):
        ex = sx * (w * 0.5 - 0.016)
        ey = h * 0.5 - 0.015
        bpy.ops.mesh.primitive_torus_add(
            major_segments=48, minor_segments=20, major_radius=0.0036, minor_radius=0.0011, location=(ex, ey, 0.0011)
        )
        eyelet = bpy.context.active_object
        eyelet.scale = (1.0, 1.0, 0.45)
        bpy.ops.object.transform_apply(scale=True)
        for p in eyelet.data.polygons:
            p.use_smooth = True
        eyelet.data.materials.append(brass)

        bpy.ops.mesh.primitive_cylinder_add(vertices=36, radius=0.0026, depth=0.0008, location=(ex, ey, 0.0009))
        hole = bpy.context.active_object
        hole.data.materials.append(hole_dark)

    out_path = os.path.join(OUT_DIR, "settings-paper-sheet-3d.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


# ── 3. 3D AGED-BRASS ARCHIVAL BULLDOG CLAMP (settings-brass-clip-3d.png) ───
def render_settings_brass_clip():
    scene, key, fill, rim = setup_studio(520, 150, ortho_scale=0.156, samples=96, transparent=True)
    key.data.energy = 11.0
    fill.data.energy = 6.8
    rim.data.energy = 2.8
    add_shadow_catcher(z=-0.0004)

    brass = make_aged_brass_mat("ClipBrass", tint=(0.70, 0.55, 0.30), rough=0.33)
    brass_dark = make_aged_brass_mat("ClipDarkBrass", tint=(0.48, 0.37, 0.20), rough=0.42)

    # Lower jaw plate clamping onto the paper
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(0.0, -0.0035, 0.0014))
    jaw = bpy.context.active_object
    jaw.scale = (0.068, 0.0115, 0.0012)
    bpy.ops.object.transform_apply(scale=True)
    kit.bevel(jaw, width=0.0006, segments=3)
    jaw.data.materials.append(brass)

    # Stepped upper clamp plate
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(0.0, 0.0015, 0.0028))
    upper = bpy.context.active_object
    upper.scale = (0.062, 0.0085, 0.0012)
    bpy.ops.object.transform_apply(scale=True)
    kit.bevel(upper, width=0.0005, segments=3)
    upper.data.materials.append(brass_dark)

    # Rolled cylindrical spring barrel along top edge
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=48, radius=0.0038, depth=0.132, location=(0.0, 0.0088, 0.0038),
        rotation=(0.0, math.radians(90), 0.0)
    )
    barrel = bpy.context.active_object
    kit.bevel(barrel, width=0.0005, segments=2)
    for p in barrel.data.polygons:
        p.use_smooth = True
    barrel.data.materials.append(brass)

    # Central raised grip tab at the top of the barrel
    bpy.ops.mesh.primitive_torus_add(
        major_segments=48, minor_segments=20, major_radius=0.0082, minor_radius=0.0018, location=(0.0, 0.0125, 0.0032)
    )
    grip = bpy.context.active_object
    grip.scale = (1.15, 0.72, 0.55)
    bpy.ops.object.transform_apply(scale=True)
    for p in grip.data.polygons:
        p.use_smooth = True
    grip.data.materials.append(brass_dark)

    # 2 dome-headed brass rivets on the jaw plate
    for sx in (-1, 1):
        add_brass_rivet(sx * 0.050, -0.0035, 0.0028, radius=0.0026, mat=brass)

    out_path = os.path.join(OUT_DIR, "settings-brass-clip-3d.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


# ── 4. RADIALLY SYMMETRIC 3D BRASS & OXBLOOD SLIDER STUD (CENTERED) ────────
def render_slider_knob():
    # Centered lights and no trim so (50%, 50%) is the exact geometric center
    scene, key, fill, rim = setup_studio(96, 96, ortho_scale=0.036, samples=96, transparent=True)
    key.location = (-0.25, 0.25, 1.15)
    key.rotation_euler = (math.radians(14), math.radians(-14), 0.0)
    key.data.energy = 11.5
    fill.data.energy = 8.0
    rim.location = (0.25, -0.25, 1.10)
    rim.rotation_euler = (math.radians(-14), math.radians(14), 0.0)
    rim.data.energy = 4.5
    add_shadow_catcher(z=-0.0003)

    brass = make_aged_brass_mat("StudBrass", tint=(0.74, 0.58, 0.32), rough=0.29)
    brass_deep = make_aged_brass_mat("StudDeepBrass", tint=(0.48, 0.36, 0.20), rough=0.38)

    oxblood = bpy.data.materials.new("StudOxbloodCenter")
    oxblood.use_nodes = True
    ob_bsdf = oxblood.node_tree.nodes["Principled BSDF"]
    ob_bsdf.inputs["Base Color"].default_value = (0.34, 0.08, 0.06, 1.0)
    ob_bsdf.inputs["Roughness"].default_value = 0.42

    # Outer beveled brass base ring
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.0138, depth=0.0022, location=(0.0, 0.0, 0.0012))
    skirt = bpy.context.active_object
    kit.bevel(skirt, width=0.0005, segments=3)
    for p in skirt.data.polygons:
        p.use_smooth = True
    skirt.data.materials.append(brass_deep)

    # Raised chamfered brass rim torus
    bpy.ops.mesh.primitive_torus_add(
        major_segments=64, minor_segments=24, major_radius=0.0108, minor_radius=0.0021, location=(0.0, 0.0, 0.0028)
    )
    ring = bpy.context.active_object
    for p in ring.data.polygons:
        p.use_smooth = True
    ring.data.materials.append(brass)

    # Inset oxblood enamel disc
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.0094, depth=0.0014, location=(0.0, 0.0, 0.0024))
    disc = bpy.context.active_object
    for p in disc.data.polygons:
        p.use_smooth = True
    disc.data.materials.append(oxblood)

    # Central domed brass rivet
    add_brass_rivet(0.0, 0.0, 0.0034, radius=0.0040, mat=brass)

    out_path = os.path.join(OUT_DIR, "settings-slider-knob-3d.png")
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("Rendered:", out_path)


def main():
    render_settings_leather_board()
    render_settings_paper_sheet()
    render_settings_brass_clip()
    render_slider_knob()


if __name__ == "__main__":
    main()
