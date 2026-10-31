# What a found letter is made of (letter_animation.py): old cream laid paper,
# mottled, its edges darker where it was held, with the folds it was sent in;
# flat pieces of it cut to shape; and the red wax on the flap, pressed with the
# house's key (shared/keyArt.js: a trefoil bow, a shank, a bit).

import bpy, bmesh, math
from mathutils import Vector
from kit import link, bevel, box, sphere

def aged_paper(name, tone=(0.78, 0.655, 0.46), half=(1, 1), seed=0.0, folds=()):
    """`half`: the sheet's half width and height (object units), for its edges
    to darken toward; `folds`: heights (object y) where it was once folded"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    def noise(scale, detail=6, rough=0.55, w=seed):
        n = N.new("ShaderNodeTexNoise"); n.noise_dimensions = "4D"
        n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = detail
        n.inputs["Roughness"].default_value = rough; n.inputs["W"].default_value = w
        L(tc.outputs["Object"], n.inputs["Vector"]); return n
    def mix(a, b_, fac, blend="MIX"):
        x = N.new("ShaderNodeMix"); x.data_type = "RGBA"; x.blend_type = blend
        if isinstance(fac, float): x.inputs["Factor"].default_value = fac
        else: L(fac, x.inputs["Factor"])
        for slot, v in ((6, a), (7, b_)):
            if isinstance(v, tuple): x.inputs[slot].default_value = (*v, 1)
            else: L(v, x.inputs[slot])
        return x.outputs[2]
    def ranged(src, a, b_, c=0.0, d=1.0):
        r = N.new("ShaderNodeMapRange"); L(src, r.inputs["Value"])
        r.inputs["From Min"].default_value, r.inputs["From Max"].default_value = a, b_
        r.inputs["To Min"].default_value, r.inputs["To Max"].default_value = c, d
        return r.outputs["Result"]
    def math_(op, a, b_=None):
        n = N.new("ShaderNodeMath"); n.operation = op
        for i, v in enumerate((a, b_)):
            if v is None: continue
            if isinstance(v, float): n.inputs[i].default_value = v
            else: L(v, n.inputs[i])
        return n.outputs[0]
    dark = tuple(v * 0.72 for v in tone)
    # the mottling of age, broad and soft
    col = mix(tone, dark, ranged(noise(2.6, 5, 0.6).outputs["Fac"], 0.42, 0.72))
    # the fibres of the rag, fine
    fib = ranged(noise(260, 3, 0.5).outputs["Fac"], 0.0, 1.0, 0.94, 1.04)
    fibc = N.new("ShaderNodeCombineColor")
    for k in ("Red", "Green", "Blue"): L(fib, fibc.inputs[k])
    col = mix(col, fibc.outputs["Color"], 1.0, "MULTIPLY")
    # foxing: a few small brown spots
    vo = N.new("ShaderNodeTexVoronoi"); vo.feature = "F1"; vo.inputs["Scale"].default_value = 7.0; vo.inputs["Randomness"].default_value = 1.0
    L(tc.outputs["Object"], vo.inputs["Vector"])
    spot = math_("MULTIPLY", ranged(vo.outputs["Distance"], 0.035, 0.0), math_("GREATER_THAN", vo.outputs["Color"], 0.82))
    col = mix(col, (0.45, 0.3, 0.16), math_("MULTIPLY", spot, 0.6))
    # the edges, darker and warmer where it has been held
    sep = N.new("ShaderNodeSeparateXYZ"); L(tc.outputs["Object"], sep.inputs["Vector"])
    edge = lambda axis, h: math_("SUBTRACT", h, math_("ABSOLUTE", sep.outputs[axis]))
    near = math_("MINIMUM", edge("X", half[0]), edge("Y", half[1]))
    wob = N.new("ShaderNodeMath"); wob.operation = "MULTIPLY_ADD"; L(noise(9, 3).outputs["Fac"], wob.inputs[0]); wob.inputs[1].default_value = 0.05; L(near, wob.inputs[2])
    col = mix(col, (0.42, 0.28, 0.13), ranged(wob.outputs[0], 0.02, min(half) * 0.32, 0.55, 0.0))
    b.inputs["Roughness"].default_value = 0.88; b.inputs["Specular IOR Level"].default_value = 0.25
    b.inputs["Sheen Weight"].default_value = 0.15
    # its tooth, and the folds it was sent in
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.12; bump.inputs["Distance"].default_value = 0.002
    L(noise(180, 4, 0.6).outputs["Fac"], bump.inputs["Height"])
    nrm = bump.outputs["Normal"]
    for y in folds:
        off = math_("ABSOLUTE", math_("SUBTRACT", sep.outputs["Y"], float(y)))
        fb = N.new("ShaderNodeBump"); fb.inputs["Strength"].default_value = 0.35; fb.inputs["Distance"].default_value = 0.01
        L(ranged(off, 0.0, 0.03), fb.inputs["Height"]); L(nrm, fb.inputs["Normal"]); nrm = fb.outputs["Normal"]
        col = mix(col, (0.55, 0.45, 0.3), ranged(off, 0.0, 0.012, 0.12, 0.0))
    L(col, b.inputs["Base Color"])
    L(nrm, b.inputs["Normal"])
    return m

def piece(name, points, z, thick, mat, origin=(0, 0, 0)):
    """a flat piece of paper cut to `points` (x, y), lying at `z`, `thick`
    deep; its object's origin at `origin` (a hinge, say), the shape where it is"""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    o_ = Vector(origin)
    face = bm.faces.new([bm.verts.new(Vector((x, y, z)) - o_) for x, y in points])
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    bmesh.ops.translate(bm, verts=[v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)], vec=(0, 0, thick))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat); o.location = o_
    bevel(o, thick * 0.45, 2)
    return o

def rounded(points, r, steps=6):
    """a polygon with its corners rounded off by `r`"""
    out = []
    n = len(points)
    for i in range(n):
        p0, p1, p2 = Vector(points[i - 1]), Vector(points[i]), Vector(points[(i + 1) % n])
        a, b_ = (p0 - p1).normalized(), (p2 - p1).normalized()
        rr = min(r, (p0 - p1).length / 2.2, (p2 - p1).length / 2.2)
        s, e = p1 + a * rr, p1 + b_ * rr
        for k in range(steps + 1):
            t = k / steps
            out.append(tuple((s * (1 - t) ** 2 + p1 * 2 * (1 - t) * t + e * t * t)[:2]))
    return out

def sealing_wax():
    m = bpy.data.materials.new("sealing wax"); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.29, 0.02, 0.018, 1)
    b.inputs["Roughness"].default_value = 0.34
    b.inputs["Subsurface Weight"].default_value = 0.2; b.inputs["Subsurface Radius"].default_value = (0.9, 0.2, 0.1)
    b.inputs["Subsurface Scale"].default_value = 0.02
    b.inputs["Coat Weight"].default_value = 0.25; b.inputs["Coat Roughness"].default_value = 0.25
    return m

def _torus(name, at, R, r, z0, mat):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    rings, segs = 40, 14
    grid = [[bm.verts.new((at[0] + (R + r * math.cos(b_)) * math.cos(a), at[1] + (R + r * math.cos(b_)) * math.sin(a), z0 + r * 0.55 * math.sin(b_)))
             for b_ in [math.tau * j / segs for j in range(segs)]] for a in [math.tau * i / rings for i in range(rings)]]
    for i in range(rings):
        for j in range(segs):
            bm.faces.new((grid[i][j], grid[(i + 1) % rings][j], grid[(i + 1) % rings][(j + 1) % segs], grid[i][(j + 1) % segs]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    return o

def wax_seal(mat, radius, z, split=None):
    """the wax, a puddle pressed flat in the middle with a rim round that, the
    key in relief on it; centred at the origin, its foot at `z`. With `split`
    (a height, y), two halves: [below, above], broken unevenly along it."""
    me = bpy.data.meshes.new("wax"); bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=96, v_segments=48, radius=1.0)
    for v in bm.verts:
        th = math.atan2(v.co.y, v.co.x)
        k = 1 + 0.055 * math.sin(3 * th + 1.1) + 0.035 * math.sin(7 * th + 2.3) + 0.02 * math.sin(13 * th + 0.4)
        rr = math.hypot(v.co.x, v.co.y) * radius * k
        press = 0.70 * radius
        height = 0.055 * max(0.0, v.co.z) ** 0.5 * radius / 0.17
        if rr < press: height = (0.034 + 0.004 * (rr / press) ** 4) * radius / 0.17
        elif rr < press + 0.022 * radius / 0.17: height = (0.034 + 0.016 * math.sin(math.pi * (rr - press) / (0.022 * radius / 0.17))) * radius / 0.17
        v.co = Vector((v.co.x * radius * k, v.co.y * radius * k, z + height * (1 if v.co.z >= 0 else 0)))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.to_mesh(me); bm.free()
    blob = link(bpy.data.objects.new("wax", me)); blob.data.materials.append(mat)
    for p in blob.data.polygons: p.use_smooth = True
    sub = blob.modifiers.new("smooth", "SUBSURF"); sub.levels = sub.render_levels = 2
    # the key, standing up the seal: its trefoil bow, its shank, its bit
    u = 0.0105 * radius / 0.17; kz = z + 0.034 * radius / 0.17
    key = [_torus("key bow", (x * u / 0.0105, y * u / 0.0105), 1.25 * u, 0.42 * u, kz, mat) for (x, y) in ((0, 0.06), (-0.021, 0.04), (0.021, 0.04))]
    key.append(sphere("key boss", (0, 0.045 * u / 0.0105, kz), 0.6 * u, mat, squash=(1, 1, 0.45)))
    for (x0, x1, y0, y1) in ((-0.0045, 0.0045, -0.072, 0.03), (-0.0075, 0.0075, 0.02, 0.026), (0.0045, 0.024, -0.072, -0.056), (0.0045, 0.019, -0.05, -0.042)):
        f = u / 0.0105
        b_ = box("key", x0 * f, x1 * f, y0 * f, y1 * f, kz - 0.002 * f, kz + 0.0042 * f, mat); bevel(b_, 0.0018 * f, 2); key.append(b_)
    # (the key and the wax one thing)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = blob
    bpy.ops.object.modifier_apply(modifier="smooth")
    for o in key: o.select_set(True)
    blob.select_set(True)
    bpy.ops.object.join()
    if split is None: return [blob]
    # broken across along `split`: each half the whole cut by a plane, the break
    # filled, its edge running unevenly (the same on both, so they still meet)
    halves = []
    for keep_above in (False, True):
        part = blob.copy(); part.data = blob.data.copy(); link(part)
        bm = bmesh.new(); bm.from_mesh(part.data)
        cut = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, split, 0), plane_no=(0, 1, 0),
                                     clear_inner=keep_above, clear_outer=not keep_above)
        bmesh.ops.holes_fill(bm, edges=[e for e in cut["geom_cut"] if isinstance(e, bmesh.types.BMEdge)], sides=0)
        for v in bm.verts:
            if abs(v.co.y - split) < 1e-6: v.co.y += 0.007 * radius / 0.17 * (math.sin(v.co.x * 70) * 0.6 + math.sin(v.co.x * 190 + 1.3) * 0.4)
        bm.to_mesh(part.data); bm.free()
        halves.append(part)
    bpy.data.objects.remove(blob, do_unlink=True)
    return halves          # [the half below the line, the half above it]
