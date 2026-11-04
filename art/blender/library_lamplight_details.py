"""Physical sash joinery, old glazing and the library's moonlit garden."""
import bpy, math, os
from mathutils import Vector
from kit import link, plain, sphere, boolean_cut
from room_common import ROOT, P, M, box_cm
from room_furnish import curtain, curtain_pole


def twig(name, points, radius, material):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    curve.resolution_u = 10
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for i, (point, position) in enumerate(zip(spline.bezier_points, points)):
        point.co = position
        point.radius = max(.09, 1 - .83 * i / max(1, len(points) - 1))
        point.handle_left_type = point.handle_right_type = 'AUTO'
    obj = link(bpy.data.objects.new(name, curve))
    obj.data.materials.append(material)
    return obj


def window_glass():
    material = plain('library old window glass', (.94,.97,1), rough=.018, transmission=1, ior=1.48)
    nodes, connect = material.node_tree.nodes, material.node_tree.links.new
    coords = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 8
    noise.inputs['Detail'].default_value = 3
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = .08
    bump.inputs['Distance'].default_value = .000055
    connect(coords.outputs['Object'], noise.inputs['Vector'])
    connect(noise.outputs['Fac'], bump.inputs['Height'])
    connect(bump.outputs['Normal'], nodes['Principled BSDF'].inputs['Normal'])
    return material


def make_library_window(rng, wall, wood, rails, brass, velvet):
    x0, x1, bottom, top = -190, -134, 69, 195
    # The opening passes through the panelling as well as the plaster.
    targets = [wall]
    for obj in list(bpy.context.scene.objects):
        if obj.type != 'MESH' or not obj.name.startswith('dado'):
            continue
        corners = [obj.matrix_world @ Vector(p) for p in obj.bound_box]
        if max(p.x for p in corners) > M(x0) and min(p.x for p in corners) < M(x1) and max(p.z for p in corners) > M(bottom):
            targets.append(obj)
    for target in targets:
        cutter = box_cm('window aperture cutter', x0, x1, bottom, top, 360, 400, wood, keep=False)
        boolean_cut(target, cutter)

    for x in (x0-6, x1):
        box_cm('window outer architrave', x, x+6, bottom-7, top+7, 362, 378, wood, .4)
        box_cm('window raised bead', x+1.2, x+4.8, bottom-5.5, top+5.5, 360.8, 363, rails, .25)
    for y in (bottom-6, top):
        box_cm('window header and apron', x0-6, x1+6, y, y+6, 362, 378, rails, .4)
    box_cm('window sill with worn lip', x0-9, x1+9, bottom-7.5, bottom-3.5, 351, 392, rails, .55)
    box_cm('window sill underside', x0-7, x1+7, bottom-9, bottom-7, 355, 382, wood, .3)
    middle = (x0+x1)/2
    for x in (x0+.5, middle-1, x1-2.5):
        box_cm('sash upright', x, x+2, bottom+.3, top-.3, 372.5, 382, wood, .14)
    for y, height in ((bottom, 2.3), (110, 2.8), (152, 2.5), (top-2.5, 2.5)):
        box_cm('sash meeting rail', x0+.5, x1-.5, y, y+height, 372, 382, rails, .18)
    putty = plain('aged glazing putty', (.26,.25,.19), rough=.94)
    glass = window_glass()
    for left, right in ((x0+2.5, middle-1), (middle+1, x1-2.5)):
        for low, high in ((bottom+2.3,110), (112.8,152), (154.5,top-2.5)):
            box_cm('individual old glass pane', left,right,low,high,380.7,380.92,glass,.015,keep=False)
            for edge in (left-.18,right-.18):
                box_cm('glazing putty fillet',edge,edge+.36,low,high,379.9,380.7,putty,.08,keep=False)
            for edge in (low-.18,high-.18):
                box_cm('glazing putty fillet',left,right,edge,edge+.36,379.9,380.7,putty,.08,keep=False)
    box_cm('sash latch keeper',middle-2,middle+2,110.3,111.5,370.9,372,brass,.14,keep=False)
    twig('curved sash latch',[P(middle-1.5,111.3,371),P(middle,112.4,369.8),P(middle+2.4,111.8,370.4)],.0028,brass)
    for x in (middle-1.3,middle+1.3):
        sphere('sash keeper screw',tuple(P(x,110.9,370.8)),.0013,brass,squash=(1,.35,1))
    for i in range(105):
        x, y = rng.uniform(x0+3,x1-3), rng.uniform(bottom+3,top-3)
        radius = rng.uniform(.00065,.00165)
        sphere('rain on exterior glass',tuple(P(x,y,381.02)),radius,glass,squash=(.72,.40,rng.uniform(1.2,2.3)))
    for i in range(12):
        x, y = rng.uniform(x0+4,x1-4), rng.uniform(bottom+12,top-7)
        twig('fine rain trail',[P(x,y,381.05),P(x+.2,y-1.8,381.05),P(x-.1,y-4.5,381.05)],.00024,glass)

    # The sky is far behind layered trees, never a luminous plane next to the sash.
    sky = bpy.data.materials.new('layered midnight sky')
    sky.use_nodes = True
    nodes, connect = sky.node_tree.nodes, sky.node_tree.links.new
    bsdf = nodes['Principled BSDF']
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 2.5
    noise.inputs['Detail'].default_value = 4
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (.008,.015,.027,1)
    ramp.color_ramp.elements[1].color = (.032,.047,.072,1)
    connect(noise.outputs['Fac'],ramp.inputs[0])
    connect(ramp.outputs['Color'],bsdf.inputs['Base Color'])
    connect(ramp.outputs['Color'],bsdf.inputs['Emission Color'])
    bsdf.inputs['Emission Strength'].default_value = .7
    bsdf.inputs['Roughness'].default_value = 1
    sky_card=box_cm('distant night sky',-1100,500,-150,850,1650,1651,sky,keep=False)
    sky_card.visible_shadow=False
    bark = plain('damp garden bark',(.027,.033,.028),rough=.94)
    foliage = plain('moonlit garden canopy',(.025,.043,.033),rough=.95)
    eye=bpy.context.scene.camera.location.copy()
    moon_ray=P(-147,178,382)-eye
    for layer, depth in enumerate((520,730,970)):
        for index in range(5):
            x = -275 - layer*80 + index*52 + rng.uniform(-10,10)
            height = rng.uniform(205,320)
            root = P(x,0,depth+rng.uniform(-30,30))
            twig('garden trunk',[root,root+Vector((.02,.01,M(height*.35))),root+Vector((-.04,.04,M(height*.7))),root+Vector((.06,.06,M(height)))],.032-layer*.004,bark)
            for branch in range(7):
                h = height*(.35+.075*branch)
                side = -1 if branch%2 else 1
                end = root+Vector((M(side*rng.uniform(28,62)),rng.uniform(-.2,.2),M(h+rng.uniform(25,45))))
                twig('garden tapering branch',[root+Vector((0,0,M(h))),end-Vector((M(side*12),.015,.08)),end],.009,bark)
                if branch>=3:
                    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=end)
                    crown=bpy.context.object;crown.name='distant irregular leaf crown'
                    crown.scale=(rng.uniform(.18,.36),rng.uniform(.17,.29),rng.uniform(.16,.30))
                    # An opening in the canopy frames the moon instead of
                    # burying the upper panes in a solid black silhouette.
                    sight=eye+moon_ray*((end.y-eye.y)/moon_ray.y)
                    if abs(end.x-sight.x)<.45 and abs(end.z-sight.z)<.45:
                        crown.scale*=.24
                    crown.data.materials.append(foliage)
                    for face in crown.data.polygons:face.use_smooth=True

    moon_mat = plain('lunar surface',(.55,.58,.62),rough=1)
    nodes, connect = moon_mat.node_tree.nodes, moon_mat.node_tree.links.new
    texture=nodes.new('ShaderNodeTexImage')
    texture.image=bpy.data.images.load(os.path.join(ROOT,'art/blender/open_window_assets/lroc_color_2k.jpg'),check_existing=True)
    bsdf=nodes['Principled BSDF']
    connect(texture.outputs['Color'],bsdf.inputs['Base Color'])
    connect(texture.outputs['Color'],bsdf.inputs['Emission Color'])
    bsdf.inputs['Emission Strength'].default_value=.85
    position=eye+moon_ray*((12-eye.y)/moon_ray.y)
    # A local UV sphere keeps the lunar map spherical and rotates about its
    # own centre. The room's baked-coordinate sphere helper has no UVs.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=32,radius=.10,location=position)
    moon=bpy.context.object;moon.name='textured moon behind garden'
    moon.data.materials.append(moon_mat)
    for face in moon.data.polygons:face.use_smooth=True
    moon.rotation_euler=(math.radians(90),0,math.radians(20))
    moon.visible_shadow=False
    curtain(rng,-229,-197,364,235,velvet,folds=5,deep=3)
    curtain_pole(-235,-124,237,365,brass)
    return glass
