"""Upgrade the existing Blender letter without rebaking its original paper.

Blender Cycles bakes the new solid wax. The portable model contains the
letter, envelope, seal and authored camera/hinge animation, with no desk.
"""
import bpy, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import arg
from letter_common import rounded
from letter_seal import seal_material, make_letter_seal

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
OUT = os.path.join(ROOT, '.artifacts/letter-stationery-v3')
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=arg('--source', os.path.join(ROOT, '.artifacts/letter-animation/letter-animation.blend')))
scene = bpy.context.scene
scene.frame_set(17)
bpy.context.view_layer.update()
envelope, flap = bpy.data.objects['envelope'], bpy.data.objects['top flap']
# The flap must not pass through the intact wax before the audible crack.
for curve in flap.animation_data.action.fcurves:
    if curve.data_path != 'rotation_euler':
        continue
    for point in curve.keyframe_points:
        if abs(point.co.x - 18) < .001:
            point.co.x += 2
            point.handle_left.x += 2
            point.handle_right.x += 2
    curve.update()
for obj in list(envelope.children_recursive):
    if obj.type == 'MESH' and any('sealing wax' in mat.name for mat in obj.data.materials if mat):
        bpy.data.objects.remove(obj, do_unlink=True)
outline = rounded([(-1.146, .586), (0, -.1), (1.146, .586)], .1)
material = seal_material()
intact, pocket, flap_wax = make_letter_seal(material, .19, .0415, (0, -.088), outline)
for obj, parent in ((intact, envelope), (pocket, envelope), (flap_wax, flap)):
    obj.parent = parent
    obj.matrix_parent_inverse = parent.matrix_world.inverted()

# One new atlas, baked from the genuine solid geometry in Cycles.
objects = [intact, pocket, flap_wax]
bpy.ops.object.select_all(action='DESELECT')
for obj in objects:
    obj.select_set(True)
    if not obj.data.uv_layers:
        obj.data.uv_layers.new(name='UVMap')
bpy.context.view_layer.objects.active = intact
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.015)
bpy.ops.object.mode_set(mode='OBJECT')
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 8
scene.render.bake.use_pass_direct = False
scene.render.bake.use_pass_indirect = False
scene.render.bake.use_pass_color = True
scene.render.bake.margin = 18
images = {}
for kind, bake_type in (('colour', 'DIFFUSE'), ('normal', 'NORMAL')):
    image = bpy.data.images.new('seal v3 ' + kind, width=1024, height=1024, alpha=False)
    image.colorspace_settings.name = 'sRGB' if kind == 'colour' else 'Non-Color'
    target = material.node_tree.nodes.new('ShaderNodeTexImage')
    target.image = image
    material.node_tree.nodes.active = target
    bpy.ops.object.bake(type=bake_type, use_clear=True)
    image.filepath_raw = os.path.join(OUT, 'seal-' + kind + '.png')
    image.file_format = 'PNG'
    image.save()
    image.pack()
    images[kind] = image
nodes, connect = material.node_tree.nodes, material.node_tree.links.new
nodes.clear()
output, bsdf = nodes.new('ShaderNodeOutputMaterial'), nodes.new('ShaderNodeBsdfPrincipled')
connect(bsdf.outputs[0], output.inputs[0])
colour, normal_tex, normal = nodes.new('ShaderNodeTexImage'), nodes.new('ShaderNodeTexImage'), nodes.new('ShaderNodeNormalMap')
colour.image, normal_tex.image = images['colour'], images['normal']
connect(colour.outputs['Color'], bsdf.inputs['Base Color'])
connect(normal_tex.outputs['Color'], normal.inputs['Color'])
connect(normal.outputs['Normal'], bsdf.inputs['Normal'])
bsdf.inputs['Roughness'].default_value = .57
bsdf.inputs['Coat Weight'].default_value = 0

# The old posed desk and its props must not enter the transparent UI model.
actor, camera = bpy.data.objects['arrival actor'], scene.camera
kept = {actor, camera, *actor.children_recursive}
for obj in list(scene.objects):
    if obj not in kept:
        bpy.data.objects.remove(obj, do_unlink=True)
scene.render.film_transparent = True
for obj, broken in ((intact, False), (pocket, True), (flap_wax, True)):
    for frame, cracked in ((1, False), (20, True), (156, True)):
        obj.hide_render = broken != cracked
        obj.keyframe_insert('hide_render', frame=frame)
scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for obj in kept:
    obj.select_set(True)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'letter-animation-v3.blend'), compress=True)
destination = os.path.join(ROOT, 'public/assets/images/CaseFile/letter/letter-animation-v3.glb')
bpy.ops.export_scene.gltf(filepath=destination, export_format='GLB', use_selection=True, use_renderable=False,
    export_cameras=True, export_lights=False, export_animations=True,
    export_animation_mode='ACTIVE_ACTIONS', export_nla_strips_merged_animation_name='LetterOpening',
    export_frame_range=True, export_force_sampling=True, export_apply=True, export_optimize_animation_size=True)
print('STATIONERY_V3_EXPORTED', destination, flush=True)
