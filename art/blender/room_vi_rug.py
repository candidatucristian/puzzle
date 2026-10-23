"""A photographed antique carpet on a modeled wool surface. No AI imagery.

The Met, object 57.5, 1863, public-domain Open Access photograph.
See room_vi_assets/SOURCES.md for the original and the texture crop.
"""
import math
import bpy
from pathlib import Path


def rug_image():
    return bpy.data.images.load(str(Path(__file__).parent/"room_vi_assets/persian-carpet-color.jpg"),check_existing=True)


def make_rug(scene,assets):
    material=bpy.data.materials.new("VI | faded wool rug, woven ornament")
    material.use_nodes=True
    nodes,links=material.node_tree.nodes,material.node_tree.links
    shader=nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value=.91
    shader.inputs["Specular IOR Level"].default_value=.25
    shader.inputs["Sheen Weight"].default_value=.42
    coords=nodes.new("ShaderNodeTexCoord")
    texture=nodes.new("ShaderNodeTexImage")
    texture.image=rug_image()
    links.new(coords.outputs["UV"],texture.inputs["Vector"])
    faded=nodes.new("ShaderNodeHueSaturation")
    faded.inputs["Saturation"].default_value=.58
    faded.inputs["Value"].default_value=.8
    links.new(texture.outputs["Color"],faded.inputs["Color"])
    # The ornament is modulated by an actual scanned fabric surface.
    scan=Path(assets)/"textures/quatrefoil_jacquard_fabric/Diffuse.jpg"
    if scan.exists():
        image=nodes.new("ShaderNodeTexImage")
        image.image=bpy.data.images.load(str(scan),check_existing=True)
        mapping=nodes.new("ShaderNodeMapping")
        mapping.inputs["Scale"].default_value=(19,16,1)
        links.new(coords.outputs["UV"],mapping.inputs["Vector"])
        links.new(mapping.outputs["Vector"],image.inputs["Vector"])
        grey=nodes.new("ShaderNodeRGBToBW")
        links.new(image.outputs["Color"],grey.inputs["Color"])
        remap=nodes.new("ShaderNodeMapRange")
        remap.inputs["To Min"].default_value=.35
        remap.inputs["To Max"].default_value=1.2
        links.new(grey.outputs[0],remap.inputs["Value"])
        mix=nodes.new("ShaderNodeMixRGB")
        mix.blend_type="MULTIPLY"
        mix.inputs[0].default_value=.58
        links.new(faded.outputs["Color"],mix.inputs[1])
        links.new(remap.outputs["Result"],mix.inputs[2])
        links.new(mix.outputs[0],shader.inputs["Base Color"])
    else:
        links.new(faded.outputs["Color"],shader.inputs["Base Color"])
    # Opposing warp and weft really change the material normals.
    bumps=[]
    for axis in ["X","Y"]:
        wave=nodes.new("ShaderNodeTexWave")
        wave.wave_type="BANDS"
        wave.bands_direction=axis
        wave.inputs["Scale"].default_value=640 if axis=="X" else 520
        links.new(coords.outputs["UV"],wave.inputs["Vector"])
        bumps.append(wave)
    mix=nodes.new("ShaderNodeMath")
    mix.operation="MULTIPLY"
    for i,wave in enumerate(bumps):
        links.new(wave.outputs["Fac"],mix.inputs[i])
    bump=nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value=.3
    bump.inputs["Distance"].default_value=.00065
    links.new(mix.outputs[0],bump.inputs["Height"])
    links.new(bump.outputs["Normal"],shader.inputs["Normal"])

    # Slightly irregular perimeter and real 4 mm thickness, no floating plane.
    nx,ny=64,56
    verts=[]
    faces=[]
    for j in range(ny+1):
        for i in range(nx+1):
            u,v=i/nx,j/ny
            x=-2.15+4.1*u
            y=2.3+3.38*v
            edge=min(u,v,1-u,1-v)
            z=.006+(.0018*math.sin(u*29+v*19))*math.exp(-edge*40)
            verts.append((x,y,z))
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i
            faces.append((a,a+1,a+nx+2,a+nx+1))
    mesh=bpy.data.meshes.new("Real low pile wool carpet")
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    uv=mesh.uv_layers.new(name="Woven carpet coordinates")
    for face in mesh.polygons:
        face.use_smooth=True
        for index in face.loop_indices:
            vertex=mesh.vertices[mesh.loops[index].vertex_index].co
            uv.data[index].uv=((vertex.x+2.15)/4.1,(vertex.y-2.3)/3.38)
    obj=bpy.data.objects.new("VI rug | worn wool carpet",mesh)
    scene.collection.objects.link(obj)
    obj.data.materials.append(material)
    solidify=obj.modifiers.new("Wool pile thickness","SOLIDIFY")
    solidify.thickness=.004
    solidify.offset=-1
    return obj
