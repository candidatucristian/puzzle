"""Render a rigid leather cover with procedural Blender materials only.

blender --background --factory-startup --python art/blender/dossier_cover.py -- \
  --output .artifacts/blender-dossier/cover.png \
  --blend .artifacts/blender-dossier/cover.blend
"""

import argparse
import math
import os
import sys

import bpy
from mathutils import Vector


def arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--blend", required=True)
    parser.add_argument("--samples", type=int, default=96)
    parser.add_argument("--resolution", type=int, default=1400)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])


def rounded_outline(width, height, radius, steps=12):
    points = []
    for cx, cy, start in [
        (width / 2 - radius, height / 2 - radius, 0),
        (-width / 2 + radius, height / 2 - radius, 90),
        (-width / 2 + radius, -height / 2 + radius, 180),
        (width / 2 - radius, -height / 2 + radius, 270),
    ]:
        for i in range(steps + 1):
            angle = math.radians(start + i * 90 / steps)
            points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return points


def board_mesh(name, width, height, radius):
    # The cover has real thickness, narrow compressed leather edges and flat
    # faces. It is never a padded rectangular rim or a plane with a photo.
    profiles = [
        (width - .0008, height - .0008, radius - .0004, 0),
        (width, height, radius, .0007),
        (width, height, radius, .0035),
        (width - .0010, height - .0010, radius - .0005, .0043),
    ]
    vertices = []
    for w, h, r, z in profiles:
        vertices.extend((x, y, z) for x, y in rounded_outline(w, h, r))
    count = len(vertices) // len(profiles)
    faces = [tuple(reversed(range(count)))]
    for layer in range(len(profiles) - 1):
        for i in range(count):
            j = (i + 1) % count
            faces.append((layer * count + i, layer * count + j,
                          (layer + 1) * count + j, (layer + 1) * count + i))
    faces.append(tuple((len(profiles) - 1) * count + i for i in range(count)))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for poly in mesh.polygons:
        poly.use_smooth = len(poly.vertices) == 4
    return obj


def leather_material():
    mat = bpy.data.materials.new("Fine aged bookbinding leather — procedural")
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.inputs["Roughness"].default_value = .52
    shader.inputs["IOR"].default_value = 1.46
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])

    coords = nodes.new("ShaderNodeTexCoord")
    macro = nodes.new("ShaderNodeTexNoise")
    macro.inputs["Scale"].default_value = 5
    macro.inputs["Detail"].default_value = 3
    macro.inputs["Roughness"].default_value = .7
    links.new(coords.outputs["Generated"], macro.inputs["Vector"])
    palette = nodes.new("ShaderNodeValToRGB")
    palette.color_ramp.elements[0].position = .2
    palette.color_ramp.elements[0].color = (.025, .009, .004, 1)
    palette.color_ramp.elements[1].position = .8
    palette.color_ramp.elements[1].color = (.095, .035, .014, 1)
    links.new(macro.outputs["Fac"], palette.inputs["Fac"])
    links.new(palette.outputs["Color"], shader.inputs["Base Color"])

    grain = nodes.new("ShaderNodeTexVoronoi")
    grain.feature = "DISTANCE_TO_EDGE"
    grain.inputs["Scale"].default_value = 235
    links.new(coords.outputs["Generated"], grain.inputs["Vector"])
    micro = nodes.new("ShaderNodeTexNoise")
    micro.inputs["Scale"].default_value = 460
    micro.inputs["Detail"].default_value = 2
    links.new(coords.outputs["Generated"], micro.inputs["Vector"])
    fine_bump = nodes.new("ShaderNodeBump")
    fine_bump.inputs["Strength"].default_value = .17
    fine_bump.inputs["Distance"].default_value = .00006
    links.new(micro.outputs["Fac"], fine_bump.inputs["Height"])
    grain_bump = nodes.new("ShaderNodeBump")
    grain_bump.inputs["Strength"].default_value = .28
    grain_bump.inputs["Distance"].default_value = .00016
    grain_bump.invert = True
    links.new(grain.outputs["Distance"], grain_bump.inputs["Height"])
    links.new(fine_bump.outputs["Normal"], grain_bump.inputs["Normal"])
    links.new(grain_bump.outputs["Normal"], shader.inputs["Normal"])

    roughness = nodes.new("ShaderNodeMapRange")
    roughness.inputs["From Min"].default_value = 0
    roughness.inputs["From Max"].default_value = 1
    roughness.inputs["To Min"].default_value = .41
    roughness.inputs["To Max"].default_value = .64
    links.new(macro.outputs["Fac"], roughness.inputs["Value"])
    links.new(roughness.outputs["Result"], shader.inputs["Roughness"])
    return mat


def seam_curve():
    data = bpy.data.curves.new("Compressed leather turn-in seam", "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = .00010
    data.bevel_resolution = 2
    outline = rounded_outline(.311, .311, .0035)
    spline = data.splines.new("POLY")
    spline.points.add(len(outline) - 1)
    for p, (x, y) in zip(spline.points, outline):
        p.co = (x, y, .00435, 1)
    spline.use_cyclic_u = True
    obj = bpy.data.objects.new("Fine recessed perimeter seam", data)
    bpy.context.collection.objects.link(obj)
    mat = bpy.data.materials.new("Dark compressed seam")
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (.013, .005, .002, 1)
    shader.inputs["Roughness"].default_value = .68
    obj.data.materials.append(mat)


def area_light(name, location, energy, size, color):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0, 0, 0)) - obj.location).to_track_quat("-Z", "Y").to_euler()


def main():
    args = arguments()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    board = board_mesh("Rigid leather wrapped board", .32, .32, .005)
    board.data.materials.append(leather_material())
    seam_curve()

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = args.samples
    scene.cycles.use_denoising = True
    scene.cycles.seed = 40
    scene.render.resolution_x = args.resolution
    scene.render.resolution_y = args.resolution
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.filepath = os.path.abspath(args.output)
    scene.view_settings.view_transform = "AgX"

    world = bpy.data.worlds.new("Neutral studio fill")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (.5, .5, .5, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = .18
    area_light("Warm soft window", (-.28, .18, .5), 65, .4, (1, .9, .78))
    area_light("Gentle edge fill", (.2, -.25, .4), 16, .3, (.8, .87, 1))

    camera = bpy.data.cameras.new("Near overhead orthographic camera")
    obj = bpy.data.objects.new("Camera", camera)
    bpy.context.collection.objects.link(obj)
    obj.location = (0, -.065, .8)
    obj.rotation_euler = (Vector((0, 0, .002)) - obj.location).to_track_quat("-Z", "Y").to_euler()
    camera.type = "ORTHO"
    camera.ortho_scale = .342
    scene.camera = obj
    scene.unit_settings.system = "METRIC"

    for filename in [args.output, args.blend]:
        os.makedirs(os.path.dirname(os.path.abspath(filename)), exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.blend), check_existing=False)
    bpy.ops.render.render(write_still=True)
    print("BLENDER_DOSSIER_RENDER=" + scene.render.filepath)


if __name__ == "__main__":
    main()
