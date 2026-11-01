"""Local material correction for ground-floor brass desk lamps."""
import bpy

def soften_lamp_metal(scene):
    copies={}
    for obj in scene.objects:
        if obj.type not in ('MESH','CURVE'): continue
        if not any(word in obj.name.lower() for word in ('lamp','shade arm','shade cap','pull chain')): continue
        for slot in obj.material_slots:
            mat=slot.material
            if not mat or not mat.use_nodes: continue
            b=mat.node_tree.nodes.get('Principled BSDF')
            if not b or b.inputs['Metallic'].default_value<.5: continue
            if mat.name not in copies:
                copy=mat.copy(); copy.name=mat.name+' | brushed lamp metal'
                nt=copy.node_tree; bs=nt.nodes['Principled BSDF']; rough=bs.inputs['Roughness']
                if rough.is_linked:
                    maximum=nt.nodes.new('ShaderNodeMath'); maximum.operation='MAXIMUM'; maximum.inputs[1].default_value=.62
                    nt.links.new(rough.links[0].from_socket,maximum.inputs[0]); nt.links.new(maximum.outputs[0],rough)
                else: rough.default_value=max(.62,rough.default_value)
                bs.inputs['Coat Weight'].default_value=0
                colour=bs.inputs['Base Color']
                if colour.is_linked:
                    tone=nt.nodes.new('ShaderNodeMixRGB'); tone.blend_type='MULTIPLY'; tone.inputs[0].default_value=1
                    tone.inputs[2].default_value=(.45,.45,.45,1)
                    nt.links.new(colour.links[0].from_socket,tone.inputs[1]); nt.links.new(tone.outputs[0],colour)
                else: colour.default_value=tuple(v*.45 for v in colour.default_value[:3])+(1,)
                copies[mat.name]=copy
            slot.material=copies[mat.name]
