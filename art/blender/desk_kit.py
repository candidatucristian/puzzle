# Helpers for the Inspector's Desk renders (inspector_scene.py): leaves of
# paper with UVs, wires and cords, rods, shadow catchers, paper and ink
# materials (procedural, or from scanned paper), cameras and regions.
import bpy, bmesh, math, os, json
from mathutils import Vector, Matrix
from kit import *

# ── making ─────────────────────────────────────────────────────────────────
def sheet(name, w, h, mat, at=(0, 0, 0), rot=0.0, nx=24, ny=24, lift=None, thick=0.00022):
    """a leaf w x h (m), lying flat, its UVs 0..1 across it; `lift(u, v)`
    raises it (m) where it does not lie flat"""
    bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    vs = [[bm.verts.new(((i / nx - 0.5) * w, (j / ny - 0.5) * h, lift(i / nx, j / ny) if lift else 0.0)) for i in range(nx + 1)] for j in range(ny + 1)]
    for j in range(ny):
        for i in range(nx):
            f = bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
            for lp, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))): lp[uv].uv = (a / nx, b / ny)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new(name, me)); me.materials.append(mat)
    o.location = at; o.rotation_euler = (0, 0, rot)
    if thick:
        s = o.modifiers.new("thickness", "SOLIDIFY"); s.thickness = thick; s.offset = -1
    return o

def wire(name, pts, r, mat):
    """a round wire or cord through `pts` (3D, m)"""
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = r; cu.bevel_resolution = 4; cu.use_fill_caps = True
    sp = cu.splines.new("BEZIER"); sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts): bp.co = p; bp.handle_left_type = bp.handle_right_type = "AUTO"
    o = link(bpy.data.objects.new(name, cu)); cu.materials.append(mat)
    return o

def rod(name, a, b, r, mat, verts=24):
    """a straight round bar from a to b"""
    a, b = Vector(a), Vector(b); d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d.length, location=(a + b) / 2)
    o = bpy.context.active_object; o.name = name
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler(); o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = verts > 8
    return o

def catcher(size=4.0, z=0.0):
    """the surface things lie on: only their shadows on it are kept"""
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, z))
    o = bpy.context.active_object; o.name = "shadow catcher"; o.is_shadow_catcher = True
    o.data.materials.append(plain("catcher", (0.2, 0.2, 0.2), rough=0.9))
    return o

def fibres(m, strength=0.05, scale=900.0):
    """a paper's or a card's fibres, felt in the light across it"""
    nt = m.node_tree; N = nt.nodes; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = scale; nz.inputs["Detail"].default_value = 6
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = strength; bp.inputs["Distance"].default_value = 0.0002
    nt.links.new(nz.outputs["Fac"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m

def leaf(name, colour, image=None, foxing=0.08, rough=0.9, shade=0.004):
    """paper; `shade`: how far off its own darkening in corners reaches (m) —
    kept short, or a glass in front of it would darken it all"""
    m = fibres(paper(name, colour=colour, foxing=foxing, image=image))
    N = m.node_tree.nodes; N["Principled BSDF"].inputs["Roughness"].default_value = rough
    for n in N:
        if n.type == "AMBIENT_OCCLUSION": n.inputs["Distance"].default_value = shade
    return m

def ink(name, image, colour, alpha=0.88):
    """ink pressed into paper: `image` says where (white on clear)"""
    m = bpy.data.materials.new(name); m.use_nodes = True; m.blend_method = "HASHED"
    nt = m.node_tree; N = nt.nodes; Lk = nt.links.new
    out = N["Material Output"]; b = N["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*colour, 1); b.inputs["Roughness"].default_value = 0.85
    tc = N.new("ShaderNodeTexCoord"); t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(image, check_existing=True)
    Lk(tc.outputs["UV"], t.inputs["Vector"])
    k = N.new("ShaderNodeMath"); k.operation = "MULTIPLY"; k.inputs[1].default_value = alpha; Lk(t.outputs["Alpha"], k.inputs[0])
    tr = N.new("ShaderNodeBsdfTransparent"); mx = N.new("ShaderNodeMixShader")
    Lk(k.outputs["Value"], mx.inputs["Fac"]); Lk(tr.outputs["BSDF"], mx.inputs[1]); Lk(b.outputs["BSDF"], mx.inputs[2])
    Lk(mx.outputs["Shader"], out.inputs["Surface"])
    return m

def cloth(name, colour, rough=0.86, weave=1600.0):
    """book cloth: a fine plain weave, matte"""
    m = plain(name, colour, rough=rough, spec=0.3)
    nt = m.node_tree; N = nt.nodes; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    w1 = N.new("ShaderNodeTexWave"); w1.wave_type = "BANDS"; w1.bands_direction = "X"; w1.inputs["Scale"].default_value = weave
    w2 = N.new("ShaderNodeTexWave"); w2.wave_type = "BANDS"; w2.bands_direction = "Y"; w2.inputs["Scale"].default_value = weave
    for w in (w1, w2): nt.links.new(tc.outputs["Object"], w.inputs["Vector"])
    mx = N.new("ShaderNodeMath"); mx.operation = "MULTIPLY"; nt.links.new(w1.outputs["Fac"], mx.inputs[0]); nt.links.new(w2.outputs["Fac"], mx.inputs[1])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.35; bp.inputs["Distance"].default_value = 0.0002
    nt.links.new(mx.outputs["Value"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    return m

def finish(scene, samples, exposure):
    """clean, crisp, matte: enough samples, stray paths clamped, no varnish"""
    c = scene.cycles
    c.samples = samples; c.adaptive_threshold = 0.006; c.adaptive_min_samples = 64
    c.sample_clamp_indirect = 4.0; c.max_bounces = 8
    c.use_denoising = True; c.denoiser = "OPENIMAGEDENOISE"; c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    try: c.denoising_quality = "HIGH"
    except Exception: pass
    scene.view_settings.exposure = exposure
    for mat in bpy.data.materials:
        if not mat.use_nodes: continue
        for n in [n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"]:
            n.inputs["Coat Weight"].default_value = min(n.inputs["Coat Weight"].default_value, 0.05)

def top_camera(scene, cx, cy, w, h, px_w):
    """straight down on a rectangle w x h (m) about (cx, cy)"""
    cd = bpy.data.cameras.new("eye"); cd.type = "ORTHO"; cd.ortho_scale = max(w, h)
    cam = link(bpy.data.objects.new("eye", cd)); cam.location = (cx, cy, 1.5); scene.camera = cam
    scene.render.resolution_x = round(px_w * SCALE); scene.render.resolution_y = round(px_w * SCALE * h / w)
    cd.sensor_fit = "HORIZONTAL" if w >= h else "VERTICAL"
    return cam

def region(scene, cam, corners):
    """where a rectangle (its four corners, m) falls in the picture: [x0, y0, x1, y1] as fractions"""
    size = (scene.render.resolution_x, scene.render.resolution_y)
    pts = [to_picture(scene, cam, c, size) for c in corners]
    xs = [p[0] / size[0] for p in pts]; ys = [p[1] / size[1] for p in pts]
    return [round(min(xs), 4), round(min(ys), 4), round(max(xs), 4), round(max(ys), 4)]

def flat_rect(o, w, h, z=0.0):
    """the corners of a leaf w x h, as it lies (its own place and turn)"""
    mw = o.matrix_world
    return [mw @ Vector((sx * w / 2, sy * h / 2, z)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]

def write(name, scene, regions):
    with open(os.path.join(OUT, f"{name}.json"), "w") as f:
        json.dump({"width": scene.render.resolution_x, "height": scene.render.resolution_y, "regions": regions}, f, indent=1)

def scanned(name, tid, size=0.25, tint=(1, 1, 1), bright=1.0, sat=1.0, rough=(0.6, 0.95), bump=0.6, image=None, image_mix=1.0):
    """paper or card from a scan (tid in the texture library), laid on by the
    object's own coordinates at `size` m a tile; `image` printed on it by
    its UVs (multiplied, as ink is)"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; Lk = nt.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / size,) * 3
    Lk(tc.outputs["Object"], mp.inputs["Vector"])
    def img(kind, colour):
        p = tex_path(tid, kind)
        if not p: return None
        t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(p, check_existing=True)
        t.image.colorspace_settings.name = "sRGB" if colour else "Non-Color"
        Lk(mp.outputs["Vector"], t.inputs["Vector"]); return t
    d = img("Diffuse", True)
    hsv = N.new("ShaderNodeHueSaturation"); hsv.inputs["Saturation"].default_value = sat; hsv.inputs["Value"].default_value = bright
    Lk(d.outputs["Color"], hsv.inputs["Color"])
    rgb = N.new("ShaderNodeRGB"); rgb.outputs[0].default_value = (*tint, 1)
    col = N.new("ShaderNodeMix"); col.data_type = "RGBA"; col.blend_type = "MULTIPLY"; col.inputs["Factor"].default_value = 1
    Lk(hsv.outputs["Color"], col.inputs[6]); Lk(rgb.outputs[0], col.inputs[7]); out = col.outputs[2]
    if image:
        ti = N.new("ShaderNodeTexImage"); ti.image = bpy.data.images.load(image, check_existing=True); ti.extension = "CLIP"
        Lk(tc.outputs["UV"], ti.inputs["Vector"])
        pm = N.new("ShaderNodeMix"); pm.data_type = "RGBA"; pm.blend_type = "MULTIPLY"; pm.inputs["Factor"].default_value = image_mix
        Lk(out, pm.inputs[6]); Lk(ti.outputs["Color"], pm.inputs[7]); out = pm.outputs[2]
    Lk(out, b.inputs["Base Color"])
    r = img("Rough", False)
    if r:
        mr = N.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = rough[0]; mr.inputs["To Max"].default_value = rough[1]
        Lk(r.outputs["Color"], mr.inputs["Value"]); Lk(mr.outputs["Result"], b.inputs["Roughness"])
    n = img("nor_gl", False)
    if n:
        nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = bump
        Lk(n.outputs["Color"], nm.inputs["Color"]); Lk(nm.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Specular IOR Level"].default_value = 0.25
    return m

def placed(scene, cam, o, w, h):
    """where a leaf w x h lies in the picture: its centre and size as
    fractions of the picture, and its turn (degrees, clockwise as the screen
    sees it)"""
    size = (scene.render.resolution_x, scene.render.resolution_y)
    c = to_picture(scene, cam, o.matrix_world @ Vector((0, 0, 0)), size)
    a = to_picture(scene, cam, o.matrix_world @ Vector((-w / 2, 0, 0)), size)
    b = to_picture(scene, cam, o.matrix_world @ Vector((w / 2, 0, 0)), size)
    t = to_picture(scene, cam, o.matrix_world @ Vector((0, h / 2, 0)), size)
    wpx = math.hypot(b[0] - a[0], b[1] - a[1]); hpx = math.hypot(t[0] - c[0], t[1] - c[1]) * 2
    ang = math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))
    return {"x": round(c[0] / size[0], 5), "y": round(c[1] / size[1], 5), "w": round(wpx / size[0], 5), "h": round(hpx / size[1], 5), "turn": round(ang, 3)}
