"""Export the real foreground trees' matte and the view behind them.

Uses the same modeled manor, camera, lighting and scanned materials as the
published exterior. No AI images, guessed foliage outlines or inpainting.
The browser moves only pixels belonging to the rendered trees; their revealed
background is rendered here, with the trees' lighting/shadows retained.
"""
import json
from pathlib import Path
import runpy
import sys

import bpy

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
import kit

OUT=Path(kit.arg('--wind-out',str(HERE.parents[1]/'.artifacts/manor-wind')))
OUT.mkdir(parents=True,exist_ok=True)
CACHE=OUT/'source.blend'


def export(scene):
    roots=sorted((o for o in scene.objects if o.type=='EMPTY' and o.name.startswith('jacaranda_tree') and 'meshes' in o),key=lambda o:o.name)
    assert len(roots)==2,[(o.name,o.type) for o in roots]
    groups=[[bpy.data.objects[n] for n in root['meshes'] if bpy.data.objects[n].type=='MESH'] for root in roots]
    foreground={o for group in groups for o in group}
    settings={'source':'Blender / Cycles, art/blender/manor.py','size':[scene.render.resolution_x,scene.render.resolution_y],'trees':[[o.name for o in group] for group in groups],'swayPixels':11.5,'noAiGeneration':True}
    (OUT/'wind.json').write_text(json.dumps(settings,indent=2),encoding='utf-8')
    # Hide only direct camera visibility: the same trees still cast their
    # shadows and reflect light. The revealed facade and sky are real renders.
    for obj in foreground:
        obj.visible_camera=False
    if '--mask-only' not in sys.argv:
        scene.render.filepath=str(OUT/'clean.png')
        scene.cycles.samples=int(kit.arg('--samples','256'))
        print('MANOR_WIND_CLEAN',flush=True)
        bpy.ops.render.render(write_still=True)
    for obj in foreground:
        obj.visible_camera=True

    # An antialiased emission matte, retaining every leaf's original alpha
    # texture. The two trees have separate channels, all foreground occluders
    # remain in the render, and opaque architecture is exactly black.
    def matte_material(original,colour):
        mat=original.copy() if original else bpy.data.materials.new('wind matte')
        mat.use_nodes=True
        nodes,links=mat.node_tree.nodes,mat.node_tree.links
        shader=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None)
        alpha=shader.inputs['Alpha'] if shader else None
        source=alpha.links[0].from_socket if alpha and alpha.is_linked else None
        value=alpha.default_value if alpha else 1
        emission=nodes.new('ShaderNodeEmission')
        emission.inputs['Color'].default_value=(*colour,1)
        emission.inputs['Strength'].default_value=1
        out=next((n for n in nodes if n.type=='OUTPUT_MATERIAL'),None) or nodes.new('ShaderNodeOutputMaterial')
        if source or value<1:
            transparent=nodes.new('ShaderNodeBsdfTransparent')
            mix=nodes.new('ShaderNodeMixShader')
            mix.inputs[0].default_value=value
            if source:
                links.new(source,mix.inputs[0])
            links.new(transparent.outputs[0],mix.inputs[1])
            links.new(emission.outputs[0],mix.inputs[2])
            links.new(mix.outputs[0],out.inputs['Surface'])
        else:
            links.new(emission.outputs[0],out.inputs['Surface'])
        if out.inputs['Volume'].is_linked:
            for link in list(out.inputs['Volume'].links): links.remove(link)
        return mat

    mask_cache={}
    for obj in scene.objects:
        if obj.type not in {'MESH','FONT','CURVE','SURFACE','META'}: continue
        if obj.name=='mist':
            obj.hide_render=True
            continue
        group=next((i for i,objects in enumerate(groups) if obj in objects),-1)
        colour=(1,0,0) if group==0 else ((0,1,0) if group==1 else (0,0,0))
        for slot in obj.material_slots:
            original=slot.material
            key=(original.name if original else '',group)
            if key not in mask_cache:
                mask_cache[key]=matte_material(original,colour)
            slot.link='OBJECT'
            slot.material=mask_cache[key]
    world=bpy.data.worlds.new('wind matte black world')
    world.use_nodes=True
    world.node_tree.nodes.get('Background').inputs['Color'].default_value=(0,0,0,1)
    scene.world=world
    scene.use_nodes=False
    scene.view_settings.view_transform='Raw'
    scene.view_settings.look='None'
    scene.view_settings.exposure=0
    scene.view_settings.gamma=1
    # This is data, not artwork: display dithering would create tiny false
    # tree coverage on the otherwise black, stationary architecture.
    scene.render.dither_intensity=0
    scene.cycles.samples=48
    scene.cycles.use_denoising=False
    scene.cycles.max_bounces=2
    scene.cycles.transparent_max_bounces=16
    scene.render.image_settings.color_mode='RGB'
    scene.render.filepath=str(OUT/'trees-mask.png')
    print('MANOR_WIND_MASK',flush=True)
    bpy.ops.render.render(write_still=True)
    print('MANOR_WIND_DONE',str(OUT),flush=True)


if CACHE.exists():
    bpy.ops.wm.open_mainfile(filepath=str(CACHE))
    # A fresh background process also needs its local GPU enabled.
    kit.cycles(bpy.context.scene,int(kit.arg('--samples','256')),2560,1330,exposure=.6)
    export(bpy.context.scene)
else:
    def capture(scene,out,blend=''):
        bpy.context.preferences.filepaths.save_version=0
        bpy.ops.wm.save_as_mainfile(filepath=str(CACHE),compress=True)
        export(scene)
    kit.render=capture
    runpy.run_path(str(HERE/'manor.py'),run_name='__main__')
