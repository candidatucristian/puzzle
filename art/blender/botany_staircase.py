"""The botanist's stair: carved stone, a turning flight and forged garden gates.

Built at real scale for hall_ground.py's camera. The two gate leaves remain
separate objects so the game can open them. No painted walls or image planes
stand in for the stairwell: every tread, joint, arch stone and hinge is a mesh.
"""

import math
import random
import bpy
import bmesh
from mathutils import Vector
from kit import box, bevel, cylinder, lathe, link, plain, aged_metal, lamp
from hall_common import arch, scan, boolean_cut, END


def mesh(name, vertices, faces, material, keep=True, edge=0.0):
    data = bpy.data.meshes.new(name)
    bm = bmesh.new()
    verts = [bm.verts.new(co) for co in vertices]
    for face in faces:
        bm.faces.new([verts[i] for i in face])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(data); bm.free()
    obj = link(bpy.data.objects.new(name, data))
    obj.data.materials.append(material)
    if edge: bevel(obj, edge, 3)
    return arch(obj) if keep else obj


def block(name, x0, x1, y0, y1, z0, z1, material, keep=True, edge=0.006):
    obj = box(name, x0, x1, y0, y1, z0, z1, material)
    if edge: bevel(obj, edge, 3)
    return arch(obj) if keep else obj


def bar(name, points, radius, material, keep=True):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'; curve.bevel_depth = radius
    curve.bevel_resolution = 3; curve.use_fill_caps = True
    line = curve.splines.new('POLY'); line.points.add(len(points) - 1)
    for p, co in zip(line.points, points): p.co = (*co, 1)
    obj = link(bpy.data.objects.new(name, curve)); obj.data.materials.append(material)
    return arch(obj) if keep else obj


def arch_volume(name, half, spring, rise, front, back, material):
    """A closed arch-shaped cutter, including the opening below its spring."""
    outline = [(-half, -0.08), (half, -0.08)]
    outline += [(half * math.cos(t * math.pi / 48), spring + rise * math.sin(t * math.pi / 48)) for t in range(49)]
    vertices = [(x, y, z) for y in (front, back) for x, z in outline]
    n = len(outline)
    faces = [tuple(reversed(range(n))), tuple(range(n, n * 2))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    return mesh(name, vertices, faces, material, keep=False)


def tread(name, half, front, depth, height, material, turn=False, origin=(0, 0)):
    """A solid tread with a worn central walking line and a rounded nosing."""
    nx, ny = 20, 5
    vertices = []
    for row in range(ny + 1):
        dy = depth * row / ny
        for column in range(nx + 1):
            x = -half + 2 * half * column / nx
            wear = 0.006 * math.exp(-((x / (half * 0.62)) ** 4)) * math.exp(-((dy - 0.065) / 0.095) ** 2)
            vertices.append((x, front + dy, height - wear))
    faces = []
    for row in range(ny):
        for column in range(nx):
            a = row * (nx + 1) + column
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    ring = list(range(nx + 1))
    ring += [r * (nx + 1) + nx for r in range(1, ny + 1)]
    ring += [ny * (nx + 1) + c for c in range(nx - 1, -1, -1)]
    ring += [r * (nx + 1) for r in range(ny - 1, 0, -1)]
    bottom = len(vertices)
    vertices += [(vertices[i][0], vertices[i][1], height - 0.065) for i in ring]
    for i in range(len(ring)):
        j = (i + 1) % len(ring)
        faces.append((ring[i], bottom + i, bottom + j, ring[j]))
    faces.append(tuple(reversed(range(bottom, len(vertices)))))
    if turn:
        vertices = [(origin[0] + y - front, origin[1] + x, z) for x, y, z in vertices]
    return mesh(name, vertices, faces, material, edge=0.007)


def build_staircase(end_wall, opening_half, head, oak, brass, glass):
    rnd = random.Random(73114)
    stone = scan('stair | smoked limestone', 'old_sandstone_02', size=1.3,
                 tint=(0.52, 0.49, 0.43), bright=0.5, sat=0.45,
                 rough=(0.62, 0.87), bump=0.6, vary=0.12)
    masonry = scan('stair | charcoal rubble', 'castle_wall_slates', size=1.6,
                   tint=(0.34, 0.31, 0.27), bright=0.37, sat=0.35,
                   rough=(0.68, 0.93), bump=0.7, vary=0.12)
    paving = scan('stair | worn dark treads', 'slate_driveway', size=0.9,
                  tint=(0.62, 0.61, 0.58), bright=0.56, sat=0.2,
                  rough=(0.56, 0.84), bump=0.38, coat=0.0, vary=0.06, dirt=0.22, grime=0.14)
    mortar = plain('stair | recessed charcoal mortar', (0.055, 0.052, 0.043), rough=0.97)
    iron = aged_metal('stair | hand-forged black iron', (0.105, 0.11, 0.105),
                       (0.025, 0.022, 0.017), rough=(0.36, 0.67), scale=55,
                       tarnish=0.58, hammer=0.12)
    bronze = aged_metal('stair | rubbed lock bronze', (0.34, 0.24, 0.11),
                         (0.055, 0.048, 0.032), rough=(0.32, 0.63), scale=65, tarnish=0.7)
    half = opening_half - 0.065
    spring, rise = head - 0.57, 0.55
    front, back = END - 0.16, END + 0.27
    boolean_cut(end_wall, arch_volume('stair | arched opening', half, spring, rise,
                                     END - 0.6, END + 0.7, mortar))
    # Exposed reveals are the stone core of the wall, not the silk finish
    # on its front. Silk's grazing sheen would leave pale vertical stripes.
    end_wall.data.materials.append(stone)
    for face in end_wall.data.polygons:
        if abs(face.normal.y) < 0.99:
            face.material_index = len(end_wall.data.materials) - 1

    # Recessed mortar closes the joints through the full depth of the portal.
    # Without this bed, moonlight would shine through gaps between voussoirs.
    points = 65
    vertices = [(r * math.cos(k * math.pi / (points - 1)), y,
                 spring + h * math.sin(k * math.pi / (points - 1)))
                for y in (front + 0.018, back + 0.006)
                for r, h in ((half + 0.002, rise + 0.002), (half + 0.28, rise + 0.28))
                for k in range(points)]
    faces = []
    for k in range(points - 1):
        faces += [(k, k + 1, points + k + 1, points + k),
                  (2 * points + k, 3 * points + k, 3 * points + k + 1, 2 * points + k + 1),
                  (k, 2 * points + k, 2 * points + k + 1, k + 1),
                  (points + k, points + k + 1, 3 * points + k + 1, 3 * points + k)]
    faces += [(0, points, 3 * points, 2 * points),
              (points - 1, 3 * points - 1, 4 * points - 1, 2 * points - 1)]
    mesh('portal | recessed arch mortar', vertices, faces, mortar)

    # Individually bedded jambs, with recessed joints and battered arrises.
    for side in (-1, 1):
        xa, xb = sorted((side * (half + 0.002), side * (half + 0.28)))
        block('portal | jamb mortar', xa, xb, front + 0.018, back + 0.006, 0, spring, mortar, edge=0)
        for course in range(8):
            z0 = course * spring / 8
            outer = half + 0.23 + (0.035 if course % 2 == 0 else 0)
            xa, xb = sorted((side * (half + 0.004), side * outer))
            block('portal | limestone jamb', xa, xb, front - rnd.uniform(0, 0.012), back,
                  z0 + 0.006, (course + 1) * spring / 8 - 0.006, stone, edge=0.009)
        xa, xb = sorted((side * half, side * (half + 0.29)))
        block('portal | foot block', xa, xb, front - 0.035, back, 0, 0.16, stone, edge=0.012)
        block('portal | impost', xa - 0.018, xb + 0.018, front - 0.028, back,
              spring - 0.055, spring + 0.018, stone, edge=0.009)
    count = 17
    for k in range(count):
        a, b = math.pi * k / count + 0.003, math.pi * (k + 1) / count - 0.003
        thick = 0.22 + (0.04 if k == count // 2 else 0)
        vertices = []
        for y in (front - (0.025 if k == count // 2 else 0), back):
            vertices += [(r * math.cos(t), y, spring + h * math.sin(t))
                         for r, h, t in [(half, rise, a), (half, rise, b),
                                         (half + thick, rise + thick, b), (half + thick, rise + thick, a)]]
        mesh('portal | carved voussoir', vertices,
             [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)],
             stone, edge=0.008)
    block('stair | stone threshold', -half, half, END - 0.23, END + 0.45, -0.04, 0.018, paving, edge=0.012)

    # A real L-shaped stair: twelve risers, a deep landing, then seven
    # risers turning right. 175 mm rise, 285 mm going and generous width
    # leave room for the gates to fold back clear of the stair walls.
    sw, run, step, first_count, second_count = 1.27, 0.285, 0.175, 12, 7
    y0 = END + 0.43
    landing_y = y0 + first_count * run
    landing_z = first_count * step
    landing_depth = 1.18
    rear = landing_y + landing_depth + 0.25
    block('stair | foundation floor', -sw - 0.2, sw + 0.2, END + 0.2, rear, -0.12, 0, stone, edge=0)
    for k in range(first_count):
        y, z = y0 + k * run, (k + 1) * step
        block('stair | riser', -sw, sw, y, y + run + 0.01, 0, z - 0.045, stone, edge=0.004)
        tread('stair | hollow-worn tread', sw + 0.012, y - 0.027, run + 0.038, z, paving)
    block('stair | landing', -sw, sw + 0.04, landing_y - 0.015, landing_y + landing_depth,
          landing_z - 0.09, landing_z, paving, edge=0.008)
    for k in range(second_count):
        x, z = sw + k * run, landing_z + (k + 1) * step
        block('stair | upper riser', x, x + run + 0.01, landing_y, landing_y + landing_depth,
              landing_z - 0.06, z - 0.045, stone, edge=0.004)
        tread('stair | turning tread', landing_depth / 2 + 0.012, 0, run + 0.038, z,
              paving, turn=True, origin=(x - 0.027, landing_y + landing_depth / 2))

    # Thick stone enclosure; actual block faces, rather than pale flat planes.
    left, right, height = -sw - 0.16, sw + second_count * run + 0.25, 6.1
    block('stair | left masonry core', left - 0.2, left, END + 0.26, rear, 0, height, mortar)
    block('stair | right masonry core', right, right + 0.2, landing_y - 0.1, rear, 0, height, mortar)
    block('stair | back masonry core', left, right + 0.2, rear, rear + 0.23, 0, height, masonry)
    block('stair | side reveal', sw + 0.12, sw + 0.32, END + 0.26, landing_y - 0.1, 0, height, mortar)
    for side, x, start, stop in [(-1, left, END + 0.27, rear), (1, sw + 0.12, END + 0.27, landing_y - 0.12)]:
        for row in range(15):
            z0, z1 = row * 0.39 + 0.008, (row + 1) * 0.39 - 0.008
            y = start
            while y < stop - 0.03:
                length = min(rnd.uniform(0.45, 0.85), stop - y)
                if length < 0.025: break
                xa, xb = sorted((x, x - side * rnd.uniform(0.045, 0.07)))
                block('stair | laid wall stone', xa, xb, y + 0.006, y + length - 0.006,
                      z0, z1, masonry, edge=0.009)
                y += length
    # The upper wall is dark masonry too, with a small leaded window.
    window_x0, window_x1, window_z0, window_z1 = -0.58, 0.58, 2.6, 4.5
    wall = next(o for o in bpy.data.objects if o.name.startswith('stair | back masonry core'))
    boolean_cut(wall, box('cut window', window_x0, window_x1, rear - 0.1, rear + 0.4, window_z0, window_z1, mortar))
    for x in (window_x0 - 0.045, window_x1):
        block('stair | window jamb', x, x + 0.045, rear - 0.035, rear + 0.12, window_z0 - 0.045, window_z1 + 0.045, stone)
    for z in (window_z0 - 0.045, window_z1):
        block('stair | window sill', window_x0 - 0.07, window_x1 + 0.07, rear - 0.07, rear + 0.12, z, z + 0.045, stone)
    window_glass = plain('stair | thin leaded glass', (0.92, 0.95, 0.97), rough=0.04, transmission=1.0, ior=1.12)
    block('stair | window glass', window_x0, window_x1, rear + 0.06, rear + 0.064, window_z0, window_z1, window_glass, edge=0)
    for x in (-0.2, 0.2):
        block('stair | window mullion', x - 0.018, x + 0.018, rear - 0.01, rear + 0.065, window_z0, window_z1, iron, edge=0.003)
    for z in (3.08, 3.56, 4.04):
        block('stair | window transom', window_x0, window_x1, rear - 0.01, rear + 0.065, z - 0.015, z + 0.015, iron, edge=0.003)
    stair_sky = bpy.data.materials.new('stair | night sky'); stair_sky.use_nodes = True
    sn = stair_sky.node_tree.nodes; sn.remove(sn['Principled BSDF']); em = sn.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (0.01, 0.022, 0.055, 1); em.inputs['Strength'].default_value = 0.55
    stair_sky.node_tree.links.new(em.outputs['Emission'], sn['Material Output'].inputs['Surface'])
    sky_backdrop = block('stair | night sky backdrop', -2.4, 2.4, rear + 2.2, rear + 2.25, 1.5, 6.2, stair_sky, edge=0)
    sky_backdrop.visible_shadow = False

    # Wall-mounted handrail, turned ends, forged brackets and square fixings.
    for side in (-1, 1):
        x = side * (sw - 0.06)
        points = [(x, y0 + 3 * run - 0.02, 4 * step + 0.9)]
        points += [(x, y0 + k * run + run / 2, (k + 1) * step + 0.9) for k in range(3, first_count)]
        points += [(x, landing_y + 0.3, landing_z + 0.9)]
        bar('stair | oak handrail', points, 0.035, oak)
        for k in (4, 7, 10):
            y, z = y0 + k * run + run / 2, (k + 1) * step + 0.86
            bar('stair | forged handrail bracket', [(side * (sw + 0.06), y, z - 0.11), (x, y, z - 0.07), (x, y, z)], 0.012, iron)
            block('stair | bracket plate', *sorted((side * (sw + 0.07), side * (sw + 0.08))), y - 0.04, y + 0.04, z - 0.17, z - 0.06, iron, edge=0.004)

    # New forged leaves: substantial stiles, arched rails, paired botanical
    # scrolls, hammered lower panels, real hinges, collars and a mortise lock.
    gates = []
    gate_y, gate_half = END + 0.005, half - 0.075
    gate_top = lambda x: spring + rise * math.sqrt(max(0, 1 - (x / half) ** 2)) - 0.075
    for side in (-1, 1):
        first_part = len(gates)
        a, b = sorted((side * gate_half, side * 0.018))
        mid = (a + b) / 2
        for x in (a + 0.022, b - 0.022):
            gates.append(block('gate | square stile', x - 0.023, x + 0.023, gate_y - 0.022, gate_y + 0.022,
                               0.055, gate_top(x), iron, keep=False, edge=0.005))
        for z in (0.09, 0.34, 1.1):
            gates.append(block('gate | forged crossrail', a, b, gate_y - 0.018, gate_y + 0.018,
                               z, z + 0.034, iron, keep=False, edge=0.004))
        gates.append(block('gate | hammered kick panel', a + 0.04, b - 0.04, gate_y - 0.004, gate_y + 0.012,
                           0.13, 0.3, iron, keep=False, edge=0.008))
        for offset in (0, -0.19):
            points = [(a + (b - a) * k / 40, gate_y, gate_top(a + (b - a) * k / 40) + offset) for k in range(41)]
            gates.append(bar('gate | rolled arch rail', points, 0.019 if offset == 0 else 0.012, iron, keep=False))
        for k in range(1, 7):
            x = a + k * (b - a) / 7
            z1 = gate_top(x) - 0.03
            points = [(x, gate_y, 0.32), (x + side * 0.004, gate_y, 1.1), (x, gate_y, z1)]
            gates.append(bar('gate | forged upright', points, 0.0115, iron, keep=False))
            for z in (0.38, 1.07, z1 - 0.2):
                gates.append(block('gate | forged collar', x - 0.018, x + 0.018, gate_y - 0.018, gate_y + 0.018,
                                   z, z + 0.035, iron, keep=False, edge=0.003))
        # A paired vine grows from the middle rail, with tapered forged leaves.
        for direction in (-1, 1):
            points = []
            for k in range(45):
                t = k / 44
                x = mid + direction * (0.27 * math.sin(t * math.pi * 1.4))
                z = 1.16 + t * 0.82
                points.append((x, gate_y - 0.012, z))
            gates.append(bar('gate | botanical volute', points, 0.009, iron, keep=False))
            for t in (0.22, 0.5, 0.74):
                x = mid + direction * (0.27 * math.sin(t * math.pi * 1.4)); z = 1.16 + t * 0.82
                tip = (x + direction * 0.095, gate_y - 0.018, z + 0.095)
                vertices = [(x, gate_y - 0.016, z), (x + direction * 0.075, gate_y - 0.027, z + 0.025), tip,
                            (x + direction * 0.025, gate_y - 0.027, z + 0.078), (x + direction * 0.04, gate_y - 0.043, z + 0.045)]
                gates.append(mesh('gate | beaten iron leaf', vertices, [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)], iron, keep=False))
        # Bronze escutcheons and iron straps are fixed to each meeting stile.
        x = side * 0.065
        gates.append(block('gate | lock escutcheon', x - 0.035, x + 0.035, gate_y - 0.04, gate_y - 0.018,
                           0.96, 1.22, bronze, keep=False, edge=0.012))
        gates.append(bar('gate | pull handle', [(x, gate_y - 0.045, 1.04), (x, gate_y - 0.09, 1.08), (x, gate_y - 0.09, 1.14), (x, gate_y - 0.045, 1.18)], 0.008, bronze, keep=False))
        for z in (0.45, 1.95):
            hinge_x = side * (gate_half + 0.018)
            arch(cylinder('gate | hinge pintle', hinge_x, gate_y + 0.015, z - 0.055, z + 0.075, 0.026, iron, verts=24))
            xa, xb = sorted((side * (half + 0.12), side * (gate_half - 0.08)))
            arch(block('gate | wall hinge plate', xa, xb, gate_y + 0.01, gate_y + 0.035, z - 0.045, z + 0.045, iron, keep=False))
            gates.append(block('gate | hinge strap', *sorted((side * gate_half, side * (gate_half - 0.26))), gate_y - 0.025, gate_y - 0.005,
                               z - 0.027, z + 0.027, iron, keep=False, edge=0.004))
        hinge = link(bpy.data.objects.new('gate | working hinge', None))
        hinge.location = (side * gate_half, gate_y, 0)
        hinge['side'] = side
        bpy.context.view_layer.update()
        for part in gates[first_part:]:
            world = part.matrix_world.copy()
            part.parent = hinge; part.matrix_world = world
    # A hint of warm candlelight meets the cool, indirect landing window.
    sconce_x, sconce_y, sconce_z = -sw + 0.12, y0 + 1.05, 1.98
    block('stair | sconce backplate', left + 0.06, left + 0.08, sconce_y - 0.06, sconce_y + 0.06,
          sconce_z - 0.2, sconce_z + 0.17, iron, edge=0.014)
    bar('stair | sconce arm', [(left + 0.07, sconce_y, sconce_z - 0.13), (sconce_x, sconce_y, sconce_z - 0.12),
                             (sconce_x, sconce_y, sconce_z)], 0.012, iron)
    arch(lathe('stair | candle pan', [(0, 0), (0.015, 0), (0.065, 0.01), (0.07, 0.022), (0.02, 0.03), (0, 0.03)], bronze, at=(sconce_x, sconce_y, sconce_z)))
    wax = plain('stair | aged candle wax', (0.38, 0.31, 0.21), rough=0.52)
    arch(cylinder('stair | candle', sconce_x, sconce_y, sconce_z + 0.02, sconce_z + 0.16, 0.02, wax, verts=24))
    flame = plain('stair | candle flame', (1, 0.55, 0.18), emit=(1, 0.52, 0.14), strength=14)
    fl_obj = arch(lathe('stair | flame', [(0, 0), (0.006, 0.008), (0.008, 0.02), (0.004, 0.033), (0, 0.05)], flame,
                        at=(sconce_x, sconce_y, sconce_z + 0.16), steps=16))
    fl_obj.visible_shadow = False
    lamp('stair | candle light', 'POINT', (sconce_x + 0.02, sconce_y, sconce_z + 0.18),
         energy=8.5, colour=(1, 0.55, 0.22), size=0.015)
    moon = lamp('stair | cool window light', 'AREA', (0, rear + 0.42, 3.75),
                aim=(0, y0 + 1.6, 0.7), energy=75, colour=(0.52, 0.66, 1), size=0.85)
    moon.visible_camera = False; moon.visible_transmission = False; moon.visible_glossy = False
    bounce = lamp('stair | landing bounce', 'AREA', (0.7, landing_y + 0.4, 5.4),
                  aim=(0, y0 + 1.1, 0.5), energy=20, colour=(0.52, 0.66, 1), size=1.2)
    bounce.visible_camera = False; bounce.visible_transmission = False; bounce.visible_glossy = False
    return gates


def render_gate_motion(scene, gates, air, out, opening_half, head, frames=49):
    """Photographic poses of both real hinged leaves, cropped to the opening."""
    import json
    import os
    from kit import render, to_picture
    from hall_common import WR, HR
    r = scene.render
    w, h = r.resolution_x, r.resolution_y
    a = to_picture(scene, scene.camera, (-opening_half, END, head), (w, h))
    b = to_picture(scene, scene.camera, (opening_half, END, 0), (w, h))
    x0, x1 = math.floor(a[0]), math.ceil(b[0])
    y0, y1 = math.floor(h - b[1]), math.ceil(h - a[1])
    r.use_border = True; r.use_crop_to_border = True
    r.border_min_x, r.border_max_x = x0 / w, x1 / w
    r.border_min_y, r.border_max_y = y0 / h, y1 / h
    r.film_transparent = True; r.image_settings.color_mode = 'RGBA'
    for obj in bpy.data.objects:
        if obj.type in ('MESH', 'CURVE', 'FONT'):
            obj.is_holdout = obj not in gates
    air.hide_render = True
    for obj in gates: obj.hide_render = False
    prev_samples = scene.cycles.samples
    scene.cycles.samples = min(prev_samples, 96)
    hinges = {part.parent for part in gates}
    for i in range(frames):
        angle = math.radians(82) * i / (frames - 1)
        for hinge in hinges: hinge.rotation_euler.z = -hinge['side'] * angle
        render(scene, os.path.join(out, f'gate-pose-{i:02d}.png'))
    scene.cycles.samples = prev_samples
    with open(os.path.join(out, 'gate-motion.json'), 'w') as handle:
        json.dump({'frames': frames, 'columns': 8,
                   'box': [x0 / w * WR, (h - y1) / h * HR,
                           (x1 - x0) / w * WR, (y1 - y0) / h * HR]}, handle, indent=2)
