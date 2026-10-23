"""Exact 3D pot-rim occlusion for the interactive stem layer.

Only a small visibility pass is needed: CPU Cycles, unlit stems, and the real
pot as a holdout. This preserves the opening and rim depth without painting
over the pot when the plant grows. The packed source scene is never changed.
"""
import bpy
import sys
from pathlib import Path


def render_stem_occlusion(scene, out):
    def belongs_to_pot(obj):
        while obj:
            if obj.name.startswith('planter_pot_clay'):
                return True
            obj=obj.parent
        return False

    holdout=bpy.data.materials.new('Fibonacci visibility | actual pot holdout')
    holdout.use_nodes=True
    n=holdout.node_tree.nodes
    n.clear()
    h=n.new('ShaderNodeHoldout');o=n.new('ShaderNodeOutputMaterial')
    holdout.node_tree.links.new(h.outputs[0],o.inputs['Surface'])
    white=bpy.data.materials.new('Fibonacci visibility | unlit stem')
    white.use_nodes=True
    n=white.node_tree.nodes;n.clear()
    e=n.new('ShaderNodeEmission');o=n.new('ShaderNodeOutputMaterial')
    white.node_tree.links.new(e.outputs[0],o.inputs['Surface'])
    pot_count=0
    for obj in scene.objects:
        if obj.type not in {'MESH','CURVE','SURFACE','FONT','VOLUME','META'}:
            continue
        stem=obj.name.startswith('Plant | branch')
        pot=belongs_to_pot(obj)
        obj.hide_render=not (stem or pot)
        if stem or pot:
            obj.visible_camera=True
            obj.data.materials.clear()
            obj.data.materials.append(holdout if pot else white)
            pot_count+=int(pot)
    assert pot_count, 'The actual terracotta pot must be present for the rim mask'
    scene.render.engine='CYCLES'
    scene.cycles.device='CPU'
    scene.cycles.samples=8
    scene.cycles.use_adaptive_sampling=False
    scene.cycles.use_denoising=False
    scene.cycles.max_bounces=1
    scene.render.film_transparent=True
    scene.camera.data.dof.use_dof=False
    scene.render.image_settings.color_mode='RGBA'
    scene.render.filepath=str(Path(out)/'stems-occlusion.png')
    bpy.ops.render.render(write_still=True)
    print('FIBONACCI_OCCLUSION_DONE',flush=True)


if __name__=='__main__':
    here=Path(__file__).resolve().parent
    sys.path.insert(0,str(here))
    from kit import arg
    bpy.ops.wm.open_mainfile(filepath=arg('--scene',str(here/'fibonacci.blend')))
    render_stem_occlusion(bpy.context.scene,Path(arg('--out',str(here.parents[1]/'.artifacts/fibonacci-blender'))))
