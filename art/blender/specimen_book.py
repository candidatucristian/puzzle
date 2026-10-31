"""The same closed moss-green specimen book in Room I and The Old Tree.

Coordinates are the original close-up model's metres. The parent transform
places that exact model beside the smaller room-view terrarium.
"""
import bpy
from kit import link, box, bevel, plain


def build_specimen_book(at=(0, 0, 0), scale=1.0, turn=0.0):
    root = link(bpy.data.objects.new('Specimen book | shared green volume', None))
    root.location = at
    root.scale = (scale,) * 3
    root.rotation_euler.z = turn

    cloth = plain('Book | old moss-green linen', (.035,.052,.023), rough=.92)
    nodes, connect = cloth.node_tree.nodes, cloth.node_tree.links.new
    bsdf = nodes['Principled BSDF']
    tc = nodes.new('ShaderNodeTexCoord')
    nz = nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 900
    nz.inputs['Detail'].default_value = 5
    nz.inputs['Roughness'].default_value = .74
    connect(tc.outputs['Object'], nz.inputs['Vector'])
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (.035,.052,.023,1)
    ramp.color_ramp.elements[1].color = (.10,.13,.065,1)
    connect(nz.outputs['Fac'], ramp.inputs[0])
    connect(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    fine = nodes.new('ShaderNodeTexNoise')
    fine.inputs['Scale'].default_value = 8100
    fine.inputs['Detail'].default_value = 3
    connect(tc.outputs['Object'], fine.inputs['Vector'])
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .37
    bump.inputs['Distance'].default_value = .00013
    connect(fine.outputs['Fac'], bump.inputs['Height'])
    connect(bump.outputs['Normal'], bsdf.inputs['Normal'])
    pages = plain('Book | aged page block', (.37,.31,.21), rough=.94)
    ink = plain('Book | fine page-edge shadows', (.025,.018,.010), rough=.92, spec=.12)

    def slab(name, x0,x1,y0,y1,z0,z1,mat,edge):
        obj = bevel(box(name,x0,x1,y0,y1,z0,z1,mat),edge,3)
        obj.parent = root
        return obj

    slab('Book | cut page edges', .53,.77,-.04,.25,.812,.851,pages,.003)
    for z in (.805,.852):
        slab('Book | cloth covered board',.522,.778,-.047,.257,z,z+.006,cloth,.004)
    slab('Book | closed cloth spine',.52,.533,-.047,.257,.808,.858,cloth,.006)
    for i in range(10):
        z = .818 + i*.003
        data = bpy.data.curves.new('Book | individual page edge','CURVE')
        data.dimensions = '3D'
        data.bevel_depth = .00014
        data.bevel_resolution = 4
        data.use_fill_caps = True
        spline = data.splines.new('POLY')
        spline.points.add(1)
        spline.points[0].co = (.538,-.040,z,1)
        spline.points[1].co = (.764,-.040,z+.0003,1)
        obj = link(bpy.data.objects.new('Book | individual page edge', data))
        data.materials.append(ink)
        obj.parent = root
    return root
