"""Room II's thirteen real hinge poses, in the renovated room's own light."""
import bpy, os, math
from mathutils import Vector, Matrix
from kit import link, plain, render
from room_common import card
from gold_coffer_model import key_model


def render_coffer(scene,out,crop,body,hinge,lid,width,samples):
    r=scene.render; camera=scene.camera; cd=camera.data
    original_size=(r.resolution_x,r.resolution_y)
    bx,by,bw,bh=crop; k=max(width/1880,2.8)
    data=cd.copy(); data.sensor_fit='HORIZONTAL'; data.lens=cd.lens*1880/bw
    data.shift_x=(cd.shift_x+(bx+bw/2)/1880-.5)*1880/bw
    data.shift_y=(cd.shift_y+(.5-(by+bh/2)/1000)*1000/1880)*1880/bw
    cropped=link(bpy.data.objects.new('calibrated coffer crop',data)); cropped.matrix_world=camera.matrix_world.copy()
    scene.camera=cropped; r.resolution_x=round(bw*k); r.resolution_y=round(bh*k)
    r.film_transparent=True; r.image_settings.color_mode='RGBA'
    saved={o:(o.visible_camera,o.hide_render) for o in scene.objects if o.type in ('MESH','CURVE','FONT')}
    mine=set(body+lid)
    for obj in saved:
        obj.visible_camera=obj in mine
        if obj in mine: obj.hide_render=False
    bpy.context.view_layer.update()
    points=[o.matrix_world@Vector(c) for o in body for c in o.bound_box]
    lo=Vector([min(p[i] for p in points) for i in range(3)]); hi=Vector([max(p[i] for p in points) for i in range(3)])
    centre=(lo+hi)/2
    # The feet already rest on the actual tabletop; receive their contact shadow.
    hit,pos,normal,index,obj,matrix=scene.ray_cast(bpy.context.evaluated_depsgraph_get(),Vector((centre.x,centre.y,lo.z-.0002)),Vector((0,0,-1)),distance=.06)
    evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get()) if hit else None
    mesh=evaluated.data if evaluated is not None else None
    slot=mesh.polygons[index].material_index if mesh and 0<=index<len(mesh.polygons) else 0
    material=mesh.materials[slot] if mesh and slot<len(mesh.materials) else plain('walnut shadow receiver',(.11,.07,.04),rough=.66)
    z=pos.z+.00006 if hit else .77004
    receiver=card('coffer real contact shadow',[(lo.x-.045,lo.y-.045,z),(hi.x+.045,lo.y-.045,z),(hi.x+.045,hi.y+.045,z),(lo.x-.045,hi.y+.045,z)],material)
    receiver.is_shadow_catcher=True
    scene.cycles.samples=max(160,samples//2)
    for pose in range(13):
        hinge.rotation_euler.x=-1.9*pose/12
        render(scene,os.path.join(out,f'pose-{pose:02d}.png'))
    receiver.hide_render=True
    for obj in body+lid: obj.visible_camera=False
    key=key_model(); key.location=(centre.x,centre.y,hi.z+.06)
    # Reuse the room illumination, with a portrait camera for readable key art.
    eye=camera.matrix_world.translation.copy(); target=key.location+Vector((0,0,.051))
    kd=cd.copy(); kd.type='ORTHO'; kd.sensor_fit='VERTICAL'; kd.shift_x=kd.shift_y=0; kd.ortho_scale=.122
    portrait=link(bpy.data.objects.new('room key portrait',kd)); portrait.location=target+(eye-centre).normalized()*.65
    portrait.rotation_euler=(target-portrait.location).to_track_quat('-Z','Y').to_euler(); scene.camera=portrait
    orient=portrait.rotation_euler.to_matrix()@Matrix.Rotation(-math.pi/2,3,'X')
    key.rotation_euler=orient.to_euler(); key.location=target-orient@Vector((0,0,.051))
    r.resolution_x=432; r.resolution_y=990
    render(scene,os.path.join(out,'key.png'))
    key.hide_render=True
    for child in key.children_recursive: child.hide_render=True
    scene.camera=camera; r.resolution_x,r.resolution_y=original_size
    r.film_transparent=False; r.image_settings.color_mode='RGB'
    for obj,(visible,hidden) in saved.items(): obj.visible_camera=visible; obj.hide_render=hidden
    hinge.rotation_euler.x=0; scene.cycles.samples=samples
