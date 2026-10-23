# What every scene of the house is built with: the materials (CC0 scans from
# Poly Haven, worn the way the house is worn), the shapes, bringing a model
# in, the lamps, the render, and where a point of the scene falls in the
# picture. room6.py has its own copy of most of this; trophies.py and
# medals.py share this one.

import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix

ASSETS = "C:/Users/crist/Tools/render/assets"
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

def arg(name, default):
    return ARGS[ARGS.index(name) + 1] if name in ARGS else default

def fresh():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene

def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj

def bevel(obj, width=0.008, segments=2):
    m = obj.modifiers.new("bevel", "BEVEL"); m.width = width; m.segments = segments; m.limit_method = "ANGLE"
    return obj

# ── materials ──────────────────────────────────────────────────────────────
def tex_path(tid, kind):
    for folder in ("textures4k", "textures"):
        for ext in ("jpg", "png"):
            p = f"{ASSETS}/{folder}/{tid}/{kind}.{ext}"
            if os.path.exists(p): return p
    return None

def _multiply(N, Lk, out, factor_out):
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs["Factor"].default_value = 1.0
    Lk(out, mix.inputs[6]); Lk(factor_out, mix.inputs[7])
    return mix.outputs[2]

def wear(N, Lk, out, tc, dirt=0.0, stains=0.0, grime=0.0, streaks=0.0, dust=0.0, edges=0.0):
    """age laid over a colour: dark in the joins, mottled, grimed, run with
    streaks, dust on what faces up"""
    if stains:
        nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.9; nz.inputs["Detail"].default_value = 6
        Lk(tc.outputs["Object"], nz.inputs["Vector"])
        ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].position = 0.35; ramp.color_ramp.elements[1].position = 0.75
        ramp.color_ramp.elements[0].color = (1 - stains, 1 - stains, 1 - stains * 0.8, 1)
        Lk(nz.outputs["Fac"], ramp.inputs["Fac"]); out = _multiply(N, Lk, out, ramp.outputs["Color"])
    if dirt:
        ao = N.new("ShaderNodeAmbientOcclusion"); ao.inputs["Distance"].default_value = 0.2; ao.only_local = True
        ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (1 - dirt, 1 - dirt, 1 - dirt, 1)
        Lk(ao.outputs["AO"], ramp.inputs["Fac"]); out = _multiply(N, Lk, out, ramp.outputs["Color"])
    if grime:
        gz = N.new("ShaderNodeTexNoise"); gz.inputs["Scale"].default_value = 2.6; gz.inputs["Detail"].default_value = 10; gz.inputs["Roughness"].default_value = 0.62
        Lk(tc.outputs["Object"], gz.inputs["Vector"])
        ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].position = 0.42; ramp.color_ramp.elements[1].position = 0.68
        ramp.color_ramp.elements[0].color = (1 - grime, 1 - grime * 0.95, 1 - grime * 0.9, 1)
        Lk(gz.outputs["Fac"], ramp.inputs["Fac"]); out = _multiply(N, Lk, out, ramp.outputs["Color"])
    if streaks:
        sm = N.new("ShaderNodeMapping"); sm.inputs["Scale"].default_value = (2.2, 2.2, 0.22)
        Lk(tc.outputs["Object"], sm.inputs["Vector"])
        sz = N.new("ShaderNodeTexNoise"); sz.inputs["Scale"].default_value = 2.4; sz.inputs["Detail"].default_value = 6
        Lk(sm.outputs["Vector"], sz.inputs["Vector"])
        ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].position = 0.56; ramp.color_ramp.elements[1].position = 0.7
        ramp.color_ramp.elements[0].color = (1 - streaks, 1 - streaks * 0.9, 1 - streaks * 0.85, 1)
        Lk(sz.outputs["Fac"], ramp.inputs["Fac"]); out = _multiply(N, Lk, out, ramp.outputs["Color"])
    if edges:
        # every edge rubbed pale where hands and dusters went
        ai = N.new("ShaderNodeAmbientOcclusion"); ai.inside = True; ai.inputs["Distance"].default_value = 0.006; ai.samples = 8
        em = N.new("ShaderNodeMapRange"); em.inputs["From Min"].default_value = 1.0; em.inputs["From Max"].default_value = 0.55
        em.inputs["To Max"].default_value = edges
        Lk(ai.outputs["AO"], em.inputs["Value"])
        en = N.new("ShaderNodeTexNoise"); en.inputs["Scale"].default_value = 40; Lk(tc.outputs["Object"], en.inputs["Vector"])
        ek = N.new("ShaderNodeMath"); ek.operation = "MULTIPLY"; Lk(em.outputs["Result"], ek.inputs[0]); Lk(en.outputs["Fac"], ek.inputs[1])
        mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "SCREEN"; mix.inputs[7].default_value = (0.42, 0.3, 0.2, 1)
        Lk(ek.outputs["Value"], mix.inputs["Factor"]); Lk(out, mix.inputs[6]); out = mix.outputs[2]
    if dust:
        geo = N.new("ShaderNodeNewGeometry"); sep = N.new("ShaderNodeSeparateXYZ")
        Lk(geo.outputs["Normal"], sep.inputs["Vector"])
        up = N.new("ShaderNodeMapRange"); up.inputs["From Min"].default_value = 0.7; up.inputs["To Max"].default_value = dust
        Lk(sep.outputs["Z"], up.inputs["Value"])
        dz = N.new("ShaderNodeTexNoise"); dz.inputs["Scale"].default_value = 6; Lk(tc.outputs["Object"], dz.inputs["Vector"])
        k = N.new("ShaderNodeMath"); k.operation = "MULTIPLY"; Lk(up.outputs["Result"], k.inputs[0]); Lk(dz.outputs["Fac"], k.inputs[1])
        mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs[7].default_value = (0.3, 0.28, 0.25, 1)
        Lk(k.outputs["Value"], mix.inputs["Factor"]); Lk(out, mix.inputs[6]); out = mix.outputs[2]
    return out

def pbr(name, tid, size=1.0, tint=None, rough=(0.0, 1.0), bump=1.0, sat=1.0, bright=1.0, spec=0.3, hue=0.5, upright=False, **age):
    """a scanned material, laid on by box projection at `size` metres a tile"""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; Lk = nt.links.new
    bsdf = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / size, 1 / size, 1 / size)
    if upright: mp.inputs["Rotation"].default_value = (0, math.pi / 2, 0)   # the grain up and down
    Lk(tc.outputs["Object"], mp.inputs["Vector"])
    def img(kind, colour):
        p = tex_path(tid, kind)
        if not p: return None
        t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(p, check_existing=True)
        t.image.colorspace_settings.name = "sRGB" if colour else "Non-Color"
        t.projection = "BOX"; t.projection_blend = 0.25
        Lk(mp.outputs["Vector"], t.inputs["Vector"])
        return t
    d = img("Diffuse", True)
    if d:
        out = d.outputs["Color"]
        hsv = N.new("ShaderNodeHueSaturation"); hsv.inputs["Saturation"].default_value = sat; hsv.inputs["Value"].default_value = bright
        hsv.inputs["Hue"].default_value = hue
        Lk(out, hsv.inputs["Color"]); out = hsv.outputs["Color"]
        if tint:
            rgb = N.new("ShaderNodeRGB"); rgb.outputs[0].default_value = (*tint, 1)
            out = _multiply(N, Lk, out, rgb.outputs[0])
        Lk(wear(N, Lk, out, tc, **age), bsdf.inputs["Base Color"])
    bsdf.inputs["Specular IOR Level"].default_value = spec
    r = img("Rough", False)
    if r:
        mr = N.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = rough[0]; mr.inputs["To Max"].default_value = rough[1]
        Lk(r.outputs["Color"], mr.inputs["Value"]); Lk(mr.outputs["Result"], bsdf.inputs["Roughness"])
    else:
        bsdf.inputs["Roughness"].default_value = rough[1]
    n = img("nor_gl", False)
    if n:
        nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = bump
        Lk(n.outputs["Color"], nm.inputs["Color"]); Lk(nm.outputs["Normal"], bsdf.inputs["Normal"])
    return m

def plain(name, colour, rough=0.5, metal=0.0, emit=None, strength=0.0, transmission=0.0, ior=1.45, sheen=0.0, coat=0.0, spec=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*colour, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["IOR"].default_value = ior
    b.inputs["Transmission Weight"].default_value = transmission
    b.inputs["Sheen Weight"].default_value = sheen
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Specular IOR Level"].default_value = spec
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    return m

def aged_metal(name, colour, patina, rough=(0.32, 0.6), scale=18.0, tarnish=0.55, hammer=0.0):
    """old metal, handled for a century: bright where hands and cloths wore it,
    gone dark and brown in every hollow and in patches, scratched all over"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; Lk = nt.links.new
    b = N["Principled BSDF"]; b.inputs["Metallic"].default_value = 1.0
    tc = N.new("ShaderNodeTexCoord")
    # the hollows: where the polish never reached
    ao = N.new("ShaderNodeAmbientOcclusion"); ao.inputs["Distance"].default_value = 0.02; ao.only_local = True
    # and patches of tarnish across the open metal
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = scale; nz.inputs["Detail"].default_value = 8; nz.inputs["Roughness"].default_value = 0.6
    Lk(tc.outputs["Object"], nz.inputs["Vector"])
    patch = N.new("ShaderNodeMapRange"); patch.inputs["From Min"].default_value = 0.42; patch.inputs["From Max"].default_value = 0.66
    Lk(nz.outputs["Fac"], patch.inputs["Value"])
    hollow = N.new("ShaderNodeMapRange"); hollow.inputs["From Min"].default_value = 0.55; hollow.inputs["From Max"].default_value = 1.0
    hollow.inputs["To Min"].default_value = 1.0; hollow.inputs["To Max"].default_value = 0.0
    Lk(ao.outputs["AO"], hollow.inputs["Value"])
    t = N.new("ShaderNodeMath"); t.operation = "MAXIMUM"; Lk(hollow.outputs["Result"], t.inputs[0])
    k = N.new("ShaderNodeMath"); k.operation = "MULTIPLY"; k.inputs[1].default_value = tarnish; Lk(patch.outputs["Result"], k.inputs[0])
    Lk(k.outputs["Value"], t.inputs[1])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.inputs[6].default_value = (*colour, 1); mix.inputs[7].default_value = (*patina, 1)
    Lk(t.outputs["Value"], mix.inputs["Factor"]); Lk(mix.outputs[2], b.inputs["Base Color"])
    rr = N.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = rough[0]; rr.inputs["To Max"].default_value = rough[1]
    Lk(t.outputs["Value"], rr.inputs["Value"]); Lk(rr.outputs["Result"], b.inputs["Roughness"])
    # fine scratches and dents
    sc = N.new("ShaderNodeTexNoise"); sc.inputs["Scale"].default_value = scale * 14; sc.inputs["Detail"].default_value = 4
    Lk(tc.outputs["Object"], sc.inputs["Vector"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.08; bp.inputs["Distance"].default_value = 0.0005
    Lk(sc.outputs["Fac"], bp.inputs["Height"])
    if hammer:
        # raised by hand: the hammer's facets over all of it
        vh = N.new("ShaderNodeTexVoronoi"); vh.inputs["Scale"].default_value = 70; vh.feature = "F1"; vh.distance = "EUCLIDEAN"
        Lk(tc.outputs["Object"], vh.inputs["Vector"])
        hb = N.new("ShaderNodeBump"); hb.inputs["Strength"].default_value = hammer; hb.inputs["Distance"].default_value = 0.002
        Lk(vh.outputs["Distance"], hb.inputs["Height"]); Lk(hb.outputs["Normal"], bp.inputs["Normal"])
    Lk(bp.outputs["Normal"], b.inputs["Normal"])
    return m

def paper(name, colour=(0.6, 0.52, 0.38), foxing=0.35, image=None):
    """old paper: cream gone to tea at the edges, foxed with brown spots;
    `image` printed on it (by its UVs), if any"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; Lk = nt.links.new
    b = N["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.92; b.inputs["Specular IOR Level"].default_value = 0.2
    tc = N.new("ShaderNodeTexCoord")
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 30; nz.inputs["Detail"].default_value = 10
    Lk(tc.outputs["Object"], nz.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (colour[0] * 0.8, colour[1] * 0.72, colour[2] * 0.6, 1)
    ramp.color_ramp.elements[1].color = (*colour, 1)
    Lk(nz.outputs["Fac"], ramp.inputs["Fac"]); out = ramp.outputs["Color"]
    vz = N.new("ShaderNodeTexVoronoi"); vz.inputs["Scale"].default_value = 60; vz.feature = "F1"
    Lk(tc.outputs["Object"], vz.inputs["Vector"])
    spot = N.new("ShaderNodeMapRange"); spot.inputs["From Min"].default_value = 0.0; spot.inputs["From Max"].default_value = 0.12
    spot.inputs["To Min"].default_value = foxing; spot.inputs["To Max"].default_value = 0.0
    Lk(vz.outputs["Distance"], spot.inputs["Value"])
    fx = N.new("ShaderNodeMix"); fx.data_type = "RGBA"; fx.inputs[7].default_value = (0.25, 0.14, 0.06, 1)
    Lk(spot.outputs["Result"], fx.inputs["Factor"]); Lk(out, fx.inputs[6]); out = fx.outputs[2]
    if image:
        ti = N.new("ShaderNodeTexImage"); ti.image = bpy.data.images.load(image, check_existing=True)
        Lk(tc.outputs["UV"], ti.inputs["Vector"])
        out = _multiply(N, Lk, out, ti.outputs["Color"])
    ao = N.new("ShaderNodeAmbientOcclusion"); ao.inputs["Distance"].default_value = 0.03; ao.only_local = False
    r2 = N.new("ShaderNodeValToRGB"); r2.color_ramp.elements[0].color = (0.45, 0.42, 0.38, 1)
    Lk(ao.outputs["AO"], r2.inputs["Fac"]); out = _multiply(N, Lk, out, r2.outputs["Color"])
    Lk(out, b.inputs["Base Color"])
    return m

# ── shapes ─────────────────────────────────────────────────────────────────
def box(name, x0, x1, y0, y1, z0, z1, mat):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((x0 + (v.co.x + 0.5) * (x1 - x0), y0 + (v.co.y + 0.5) * (y1 - y0), z0 + (v.co.z + 0.5) * (z1 - z0)))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me))
    o.data.materials.append(mat)
    return o

def cylinder(name, x, y, z0, z1, r, mat, verts=32, r2=None, open_ends=False):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=not open_ends, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=z1 - z0)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(x, y, (z0 + z1) / 2))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    return o

def sphere(name, at, r, mat, squash=(1, 1, 1)):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=16, radius=r)
    for v in bm.verts: v.co = Vector((v.co.x * squash[0] + at[0], v.co.y * squash[1] + at[1], v.co.z * squash[2] + at[2]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    return o

def lathe(name, profile, mat, at=(0, 0, 0), steps=48, smooth=True):
    """a turned thing: `profile` [(radius, height)], spun about its upright"""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    verts = [bm.verts.new((r, 0, z)) for r, z in profile]
    for a, b in zip(verts, verts[1:]): bm.edges.new((a, b))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], axis=(0, 0, 1), cent=(0, 0, 0), steps=steps, angle=math.tau)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0002)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat); o.location = at
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    return o

def tube(name, points, r, mat, at=(0, 0, 0), rot=0.0):
    """a bent rod through `points` (x, z) in its own upright plane"""
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"
    cu.bevel_depth = r; cu.bevel_resolution = 4; cu.use_fill_caps = True
    sp = cu.splines.new("BEZIER"); sp.bezier_points.add(len(points) - 1)
    for bp, (x, z) in zip(sp.bezier_points, points):
        bp.co = (x, 0, z); bp.handle_left_type = bp.handle_right_type = "AUTO"
    o = link(bpy.data.objects.new(name, cu)); o.data.materials.append(mat)
    o.location = at; o.rotation_euler = (0, 0, rot)
    return o

def boolean_cut(target, cutter):
    mod = target.modifiers.new("cut", "BOOLEAN"); mod.operation = "DIFFERENCE"; mod.object = cutter; mod.solver = "EXACT"
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)

def import_model(mid, height=None, width=None, at=(0, 0, 0), rot=0.0, only=None, stretch_x=1.0, tilt=(0.0, 0.0)):
    """a Poly Haven model, stood at `at` (its foot, its middle), turned `rot`
    about its upright; `only` keeps the meshes so named"""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=f"{ASSETS}/models/{mid}/{mid}.gltf")
    objs = [o for o in bpy.data.objects if o not in before]
    if only:
        keep = {only} if isinstance(only, str) else set(only)
        # (a second import of a model names its parts .001, .002…)
        for o in [o for o in objs if o.name.rsplit(".", 1)[0] not in keep and o.name not in keep and o.type == "MESH"]: bpy.data.objects.remove(o, do_unlink=True)
        objs = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new(mid, None); link(root)
    for o in objs:
        if o.parent is None: o.parent = root
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in objs if o.type == "MESH" for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    s = 1.0
    if height: s = height / (hi.z - lo.z)
    if width: s = width / max(hi.x - lo.x, hi.y - lo.y)
    root.scale = (s * stretch_x, s, s)
    root.rotation_euler = (tilt[0], tilt[1], rot)
    centre = (lo + hi) / 2
    root.location = Vector(at) - Matrix.Rotation(rot, 3, "Z") @ Vector((centre.x * s * stretch_x, centre.y * s, lo.z * s))
    root["meshes"] = [o.name for o in objs if o.type == "MESH"]
    root["offset"] = (centre.x * s * stretch_x, centre.y * s, lo.z * s)
    return root

def clone(root, at, rot=0.0, k=1.0):
    """another of a model brought in, sharing its meshes (an instance: no
    more memory), stood at `at`, turned `rot`, `k` times the size"""
    twin = root.copy(); link(twin)
    meshes = []
    for c in root.children:
        d = c.copy(); link(d); d.parent = twin; meshes.append(d.name)
    twin.scale = tuple(v * k for v in root.scale)
    twin.rotation_euler = (0, 0, rot)
    off = Vector(root["offset"]) * k
    twin.location = Vector(at) - Matrix.Rotation(rot, 3, "Z") @ off
    twin["meshes"] = meshes
    return twin

def meshes_of(root):
    return [bpy.data.objects[n] for n in root["meshes"]]

# ── light ──────────────────────────────────────────────────────────────────
def lamp(name, kind, at, aim=None, energy=10, colour=(1, 1, 1), size=0.5, size_y=None, angle=None, spot=None):
    d = bpy.data.lights.new(name, kind); d.energy = energy; d.color = colour
    if kind == "AREA":
        d.shape = "RECTANGLE" if size_y else "SQUARE"; d.size = size
        if size_y: d.size_y = size_y
    if kind == "SUN" and angle is not None: d.angle = angle
    if kind in ("POINT", "SPOT"): d.shadow_soft_size = size
    if kind == "SPOT" and spot: d.spot_size = spot; d.spot_blend = 0.6
    o = link(bpy.data.objects.new(name, d)); o.location = at
    if aim is not None:
        o.rotation_euler = (Vector(aim) - Vector(at)).to_track_quat("-Z", "Y").to_euler()
    return o

def age_everything(keep, own):
    """what was brought in, made as worn as the room: no lacquer, little shine,
    and darkened with age if it is not the room's own"""
    for mat in bpy.data.materials:
        if mat.name in keep or not mat.use_nodes: continue
        for node in mat.node_tree.nodes:
            if node.type != "BSDF_PRINCIPLED": continue
            node.inputs["Coat Weight"].default_value = 0.0
            if mat.name in own: continue
            node.inputs["Specular IOR Level"].default_value = min(node.inputs["Specular IOR Level"].default_value, 0.32)
            bc = node.inputs["Base Color"]
            if bc.is_linked:
                age = mat.node_tree.nodes.new("ShaderNodeMix"); age.data_type = "RGBA"; age.blend_type = "MULTIPLY"; age.inputs["Factor"].default_value = 1.0
                age.inputs[7].default_value = (0.68, 0.64, 0.58, 1)
                mat.node_tree.links.new(bc.links[0].from_socket, age.inputs[6]); mat.node_tree.links.new(age.outputs[2], bc)
            else:
                c = bc.default_value; bc.default_value = (c[0] * 0.68, c[1] * 0.64, c[2] * 0.58, c[3])
            r = node.inputs["Roughness"]
            floor = 0.45 if node.inputs["Metallic"].default_value > 0.5 or node.inputs["Metallic"].is_linked else 0.7
            if r.is_linked:
                mx = mat.node_tree.nodes.new("ShaderNodeMath"); mx.operation = "MAXIMUM"; mx.inputs[1].default_value = floor
                mat.node_tree.links.new(r.links[0].from_socket, mx.inputs[0]); mat.node_tree.links.new(mx.outputs[0], r)
            else:
                r.default_value = max(r.default_value, floor)

# ── the render ─────────────────────────────────────────────────────────────
def cycles(scene, samples, width, height, exposure=-0.3, glare=True, transparent=False):
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for backend in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = backend; prefs.get_devices()
            if any(d.type == backend for d in prefs.devices): break
        except Exception: pass
    for d in prefs.devices: d.use = d.type != "CPU"
    scene.cycles.device = "GPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.adaptive_threshold = 0.015
    scene.cycles.max_bounces = 10
    scene.cycles.volume_bounces = 1
    scene.cycles.caustics_reflective = False; scene.cycles.caustics_refractive = False
    scene.render.resolution_x = width; scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = transparent
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = exposure
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA" if transparent else "RGB"
    if glare:
        scene.use_nodes = True
        ct = scene.node_tree; cn = ct.nodes
        for node in list(cn): cn.remove(node)
        rl = cn.new("CompositorNodeRLayers"); comp = cn.new("CompositorNodeComposite")
        g = cn.new("CompositorNodeGlare"); g.glare_type = "FOG_GLOW"; g.threshold = 0.9; g.size = 8
        try: g.mix = -0.75
        except Exception: pass
        ct.links.new(rl.outputs["Image"], g.inputs["Image"]); ct.links.new(g.outputs["Image"], comp.inputs["Image"])

def render(scene, out, blend=""):
    scene.render.filepath = out
    if blend: bpy.ops.wm.save_as_mainfile(filepath=blend)
    bpy.ops.render.render(write_still=True)
    print("RENDERED", out)

# ── where the scene falls in the picture ───────────────────────────────────
def to_picture(scene, cam, co, size):
    """a point of the scene, in the picture's pixels (x right, y down)"""
    from bpy_extras.object_utils import world_to_camera_view
    v = world_to_camera_view(scene, cam, Vector(co))
    return [round(v.x * size[0], 1), round((1 - v.y) * size[1], 1)]

def hull(points):
    """the convex hull of 2D points, clockwise on screen"""
    pts = sorted(set(map(tuple, points)))
    if len(pts) < 3: return [list(p) for p in pts]
    def cross(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, hi = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(hi) >= 2 and cross(hi[-2], hi[-1], p) <= 0: hi.pop()
        hi.append(p)
    return [list(p) for p in lo[:-1] + hi[:-1]]
