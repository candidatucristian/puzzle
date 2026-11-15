"""An archival print of the seal already visible in the opening film.

The photograph reuses the existing film's seal detail as its printed image;
the curled, matte photographic paper is geometry rendered with Cycles.
No new emblem is invented: the letter and the case-file exhibit must match.

Extract the reference frame first (see ashcombe-seal-photograph-sources.md), then:
  blender -b --factory-startup -P art/blender/ashcombe_seal_photograph.py
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from kit import arg, fresh, link, plain, lamp, cycles, render

ROOT = HERE.parents[1]
OUT = ROOT / '.artifacts/intro-story-review-2026-11-14'
OUT.mkdir(parents=True, exist_ok=True)
REFERENCE = Path(arg('--reference', str(OUT / 'envelope-33s.png')))
scene = fresh()

paper = plain('aged matte photographic paper', (0.76, 0.71, 0.60), rough=0.86, spec=0.18)
nodes = paper.node_tree.nodes
links = paper.node_tree.links
bsdf = nodes['Principled BSDF']
uv = nodes.new('ShaderNodeTexCoord')
noise = nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value = 240
noise.inputs['Detail'].default_value = 3
links.new(uv.outputs['UV'], noise.inputs['Vector'])
bump = nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = 0.12
bump.inputs['Distance'].default_value = 0.00007
links.new(noise.outputs['Fac'], bump.inputs['Height'])
links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])

ink = paper.copy()
ink.name = 'faded photographic silver on matte paper'
nodes, links = ink.node_tree.nodes, ink.node_tree.links
bsdf = nodes['Principled BSDF']
tex = nodes.new('ShaderNodeTexImage')
tex.image = bpy.data.images.load(str(REFERENCE))
tex.image.pack()
tex.interpolation = 'Linear'
uv = nodes.get('Texture Coordinate')
mapping = nodes.new('ShaderNodeMapping')
# Pixel crop of the Blender-rendered seal and its surrounding envelope, from a
# 1920 x 1080 frame at 33s. UV coordinates rise from the bottom of the image.
mapping.inputs['Location'].default_value = (730 / 1920, (1080 - 690) / 1080, 0)
mapping.inputs['Scale'].default_value = (480 / 1920, 290 / 1080, 1)
links.new(uv.outputs['UV'], mapping.inputs['Vector'])
links.new(mapping.outputs['Vector'], tex.inputs['Vector'])
grey = nodes.new('ShaderNodeRGBToBW')
links.new(tex.outputs['Color'], grey.inputs['Color'])
tones = nodes.new('ShaderNodeValToRGB')
tones.color_ramp.elements[0].position = 0.025
tones.color_ramp.elements[0].color = (0.045, 0.039, 0.030, 1)
tones.color_ramp.elements[1].position = 0.72
tones.color_ramp.elements[1].color = (0.70, 0.65, 0.55, 1)
links.new(grey.outputs[0], tones.inputs[0])
links.new(tones.outputs[0], bsdf.inputs['Base Color'])

def height(x, y):
    return 0.001 + 0.0014 * (abs(x) / .09) ** 5 + 0.0010 * (abs(y) / .058) ** 6 \
        + 0.00035 * math.sin(x * 28 + y * 34)

def sheet(name, width, depth, material, offset=0):
    nx, ny = 60, 42
    vertices = []
    for j in range(ny + 1):
        for i in range(nx + 1):
            x, y = (i / nx - .5) * width, (j / ny - .5) * depth
            vertices.append((x, y, height(x, y) + offset))
    faces = []
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.uv_layers.new(name='UVMap')
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        for index in polygon.loop_indices:
            x, y, _ = vertices[mesh.loops[index].vertex_index]
            mesh.uv_layers.active.data[index].uv = (x / width + .5, y / depth + .5)
    obj = link(bpy.data.objects.new(name, mesh))
    obj.data.materials.append(material)
    return obj

base = sheet('worn photographic print', .18, .116, paper)
solid = base.modifiers.new('paper thickness', 'SOLIDIFY')
solid.thickness = .00028
sheet('archival seal photograph', .162, .0916, ink, .000025)

camera_data = bpy.data.cameras.new('archive camera')
camera = link(bpy.data.objects.new('archive camera', camera_data))
camera.location = (0, -.015, .34)
camera.rotation_euler = (Vector((0, 0, .001)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera_data.type = 'ORTHO'
camera_data.ortho_scale = .198
scene.camera = camera
scene.world = bpy.data.worlds.new('soft archive light')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.75, .78, .82, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .45
lamp('window', 'AREA', (-.16, -.08, .30), aim=(0, 0, 0), energy=2, size=.28, colour=(1, .94, .83))
cycles(scene, 64, 792, 520, exposure=-.5, glare=False, transparent=True)
scene.view_settings.look = 'AgX - Medium High Contrast'
render(scene, str(OUT / 'ashcombe-seal-photograph.png'), str(OUT / 'ashcombe-seal-photograph.blend'))
