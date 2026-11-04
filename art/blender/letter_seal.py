"""Solid wax with an intact surface and a break matching the envelope flap."""
import bpy, bmesh, math
from kit import link, box, sphere, bevel
from letter_common import _torus, piece


def seal_material():
    material = bpy.data.materials.new('letter sealing wax')
    material.use_nodes = True
    nodes, connect = material.node_tree.nodes, material.node_tree.links.new
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (.24, .014, .011, 1)
    bsdf.inputs['Roughness'].default_value = .57
    bsdf.inputs['Coat Weight'].default_value = 0
    bsdf.inputs['Specular IOR Level'].default_value = .28
    grain = nodes.new('ShaderNodeTexNoise')
    grain.inputs['Scale'].default_value = 195
    grain.inputs['Detail'].default_value = 3
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .13
    bump.inputs['Distance'].default_value = .00035
    connect(grain.outputs['Fac'], bump.inputs['Height'])
    connect(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return material


def make_letter_seal(material, radius, z, centre, flap_outline):
    # Explicit top, rim, walls and bottom: flattening a sphere creates
    # overlapping bottom faces and unstable normals at a later fracture.
    count = 128
    rings = ((.24, .026), (.51, .026), (.68, .027), (.75, .032),
             (.82, .035), (.90, .027), (.965, .014), (1, .005))
    vertices = [(centre[0], centre[1], z + .026)]
    faces = []
    scale = radius / .19
    def rim(j):
        angle = math.tau * j / count
        return angle, 1 + .036 * math.sin(3 * angle + 1.1) + .023 * math.sin(7 * angle + 2.3) + .01 * math.sin(13 * angle + .4)
    for fraction, height in rings:
        for j in range(count):
            angle, wobble = rim(j)
            vertices.append((centre[0] + radius * fraction * wobble * math.cos(angle),
                             centre[1] + radius * fraction * wobble * math.sin(angle), z + height * scale))
    for j in range(count):
        faces.append((0, 1 + j, 1 + (j + 1) % count))
    for ring in range(len(rings) - 1):
        inner, outer = 1 + ring * count, 1 + (ring + 1) * count
        for j in range(count):
            k = (j + 1) % count
            faces.append((inner + j, outer + j, outer + k, inner + k))
    bottom_centre = len(vertices)
    vertices.append((centre[0], centre[1], z))
    bottom = len(vertices)
    for j in range(count):
        angle, wobble = rim(j)
        vertices.append((centre[0] + radius * wobble * math.cos(angle),
                         centre[1] + radius * wobble * math.sin(angle), z))
    outer = 1 + (len(rings) - 1) * count
    for j in range(count):
        k = (j + 1) % count
        faces.extend(((outer + j, bottom + j, bottom + k, outer + k),
                      (bottom_centre, bottom + k, bottom + j)))
    mesh = bpy.data.meshes.new('solid poured wax')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    intact = link(bpy.data.objects.new('seal intact', mesh))
    mesh.materials.append(material)

    # The same trefoil key as the original seal, fused into the wax rather
    # than leaving intersecting ring, sphere and bar surfaces in the export.
    u = .0105 * radius / .17
    kz = z + .026 * scale
    parts = [_torus('seal key bow', (centre[0] + x * u / .0105, centre[1] + y * u / .0105),
                    1.25 * u, .42 * u, kz, material)
             for x, y in ((0, .06), (-.021, .04), (.021, .04))]
    parts.append(sphere('seal key boss', (centre[0], centre[1] + .045 * u / .0105, kz),
                        .6 * u, material, squash=(1, 1, .45)))
    for x0, x1, y0, y1 in ((-.0045, .0045, -.072, .03), (-.0075, .0075, .02, .026),
                            (.0045, .024, -.072, -.056), (.0045, .019, -.05, -.042)):
        f = u / .0105
        bar = box('seal key bit', centre[0] + x0 * f, centre[0] + x1 * f,
                  centre[1] + y0 * f, centre[1] + y1 * f, kz - .002 * f, kz + .0042 * f, material)
        bevel(bar, .0015 * f, 2)
        parts.append(bar)
    bpy.ops.object.select_all(action='DESELECT')
    intact.select_set(True)
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = intact
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.join()
    fusion = intact.modifiers.new('fused wax and impression', 'REMESH')
    fusion.mode = 'VOXEL'
    fusion.voxel_size = .0011 * scale
    fusion.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier=fusion.name)
    smooth = intact.modifiers.new('soft poured edges', 'SMOOTH')
    smooth.factor = .16
    smooth.iterations = 2
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    simplify = intact.modifiers.new('portable wax surface', 'DECIMATE')
    simplify.ratio = .08
    bpy.ops.object.modifier_apply(modifier=simplify.name)

    # Use the actual rounded V-shaped flap footprint. Its lifted fragment
    # then stays inside the paper silhouette even when the flap turns over.
    cutter = piece('seal flap footprint', flap_outline, z - .3, .7, material)
    bpy.context.view_layer.objects.active = cutter
    # The XY outline is already rounded. A bevel based on the cutter's
    # extrusion depth would change the seam instead of following the flap.
    cutter.modifiers.clear()
    fragments = []
    for name, operation in (('seal pocket', 'DIFFERENCE'), ('seal flap', 'INTERSECT')):
        fragment = intact.copy()
        fragment.data = intact.data.copy()
        fragment.name = name
        link(fragment)
        bpy.context.view_layer.objects.active = fragment
        cut = fragment.modifiers.new('fracture along flap seam', 'BOOLEAN')
        cut.operation = operation
        cut.solver = 'EXACT'
        cut.object = cutter
        bpy.ops.object.modifier_apply(modifier=cut.name)
        fragments.append(fragment)
    bpy.data.objects.remove(cutter, do_unlink=True)
    for obj in (intact, *fragments):
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        for edge in bm.edges:
            if edge.is_manifold and edge.calc_face_angle() > math.radians(55):
                edge.smooth = False
        bm.to_mesh(obj.data)
        bm.free()
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    return intact, *fragments
