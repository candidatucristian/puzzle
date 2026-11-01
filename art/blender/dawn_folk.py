# Before Sunrise (dawn_country.py): who is in the picture besides the land —
# the swallows on the telegraph wires, the man on the farmhouse porch singing
# to his guitar in his rocking chair, and the flag on the porch post.
#
# Built of metaballs where they are soft (a bird's body, a man's), of meshes
# where they are not (a bill, a wing's flight feathers, a guitar); real sizes,
# real colours. Each is given back as one empty to place: its feet (the bird),
# its seat (the man), its foot on the post (the flag's pole).

import bpy, bmesh, math
from mathutils import Vector, Matrix, Quaternion
from kit import link, plain, sphere, cylinder, box, lathe, bevel, aged_metal

MB = 0.575                      # a lone metaball's surface lies at 0.575 of its radius (stiffness 2, threshold 0.6)

def _blob(name, mat, res):
    mb = bpy.data.metaballs.new(name); mb.resolution = res * 2; mb.render_resolution = res; mb.threshold = 0.6
    ob = link(bpy.data.objects.new(name, mb)); mb.materials.append(mat)
    return ob, mb

def _ell(mb, at, axes, rot=None):
    """an ellipsoid, its surface `axes` (semi-axes) out from `at`"""
    m = max(axes); e = mb.elements.new(); e.type = "ELLIPSOID"; e.co = at; e.radius = m / MB
    e.size_x, e.size_y, e.size_z = (a / m for a in axes)
    if rot is not None: e.rotation = rot
    return e

def _limb(mb, a, b, r):
    """a capsule from a to b, `r` thick"""
    a, b = Vector(a), Vector(b); d = b - a
    e = mb.elements.new(); e.type = "CAPSULE"; e.co = (a + b) / 2; e.radius = r / MB
    e.size_x = max(1e-5, d.length / 2); e.rotation = Vector((1, 0, 0)).rotation_difference(d)
    return e

def _blade(name, outline, mat, thick, bend=0.0):
    """a thin flat piece (a feather, a wing folded): `outline` a list of
    (u, half-width) along its length; curled by `bend` (its middle out of
    its plane). Its plane is x (along) y (across); its face +z."""
    bm = bmesh.new(); n = len(outline); rows = []
    L = outline[-1][0] or 1.0
    for (u, w) in outline:
        k = u / L; z = bend * 4 * k * (1 - k)
        rows.append([bm.verts.new((u, -w, z - bend * 0.0)), bm.verts.new((u, 0.0, z + abs(w) * 0.25 * (1 if bend >= 0 else -1))), bm.verts.new((u, w, z))])
    for a, b in zip(rows, rows[1:]):
        bm.faces.new((a[0], b[0], b[1], a[1])); bm.faces.new((a[1], b[1], b[2], a[2]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new(name, me)); me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    s = ob.modifiers.new("thick", "SOLIDIFY"); s.thickness = thick; s.offset = 0
    ob.modifiers.new("smooth", "SUBSURF").levels = 2
    ob.modifiers["smooth"].render_levels = 2
    return ob

def _place(ob, origin, x_dir, z_hint, parent):
    """lay `ob`'s own x along x_dir, its z toward z_hint, at origin"""
    x = Vector(x_dir).normalized(); y = Vector(z_hint).cross(x).normalized(); z = x.cross(y)
    m = Matrix((x, y, z)).transposed().to_4x4(); m.translation = Vector(origin)
    ob.matrix_world = m
    ob.parent = parent; ob.matrix_parent_inverse = Matrix.Identity(4)
    ob.matrix_basis = m
    return ob

# ── a barn swallow, perched ─────────────────────────────────────────────────
_SWALLOW = {}
def _swallow_materials():
    if _SWALLOW: return _SWALLOW
    # its plumage: steel-blue black above, a rust throat and forehead, a dark
    # band across the breast, cream below — reckoned in the bird's own frame
    m = bpy.data.materials.new("swallow plumage"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    att = N.new("ShaderNodeAttribute"); att.attribute_type = "OBJECT"; att.attribute_name = "cm"
    cm = N.new("ShaderNodeVectorMath"); cm.operation = "MULTIPLY"; L(tc.outputs["Object"], cm.inputs[0]); L(att.outputs["Vector"], cm.inputs[1])
    sep = N.new("ShaderNodeSeparateXYZ"); L(cm.outputs[0], sep.inputs[0])
    def node(op, *ins):
        n = N.new("ShaderNodeMath"); n.operation = op
        for i, v in enumerate(ins):
            if isinstance(v, (int, float)): n.inputs[i].default_value = v
            else: L(v, n.inputs[i])
        return n.outputs[0]
    # (above a line from the gape to the vent: the dark back — in the level
    # bird's own centimetres, z from its pivot)
    zl = node("MULTIPLY_ADD", sep.outputs["X"], 0.069, -0.05)
    above = node("SUBTRACT", sep.outputs["Z"], zl)
    back = N.new("ShaderNodeMapRange"); back.inputs["From Min"].default_value = -0.25; back.inputs["From Max"].default_value = 0.35
    L(above, back.inputs["Value"])
    def near(cx, cz, r0, r1):
        d = N.new("ShaderNodeVectorMath"); d.operation = "DISTANCE"; d.inputs[1].default_value = (cx, 0, cz)
        flat = N.new("ShaderNodeVectorMath"); flat.operation = "MULTIPLY"; flat.inputs[1].default_value = (1, 0.0, 1)
        L(cm.outputs[0], flat.inputs[0]); L(flat.outputs[0], d.inputs[0])
        k = N.new("ShaderNodeMapRange"); k.inputs["From Min"].default_value = r0; k.inputs["From Max"].default_value = r1
        k.inputs["To Min"].default_value = 1.0; k.inputs["To Max"].default_value = 0.0
        L(d.outputs["Value"], k.inputs["Value"]); return k.outputs["Result"]
    throat = node("MAXIMUM", near(4.55, -0.3, 0.32, 0.72), near(5.05, 0.85, 0.2, 0.42))
    band = near(3.55, -0.85, 0.4, 0.78)
    def mix(fac, a, c):
        x = N.new("ShaderNodeMix"); x.data_type = "RGBA"; L(fac, x.inputs["Factor"])
        for i, v in ((6, a), (7, c)):
            if isinstance(v, tuple): x.inputs[i].default_value = (*v, 1)
            else: L(v, x.inputs[i])
        return x.outputs[2]
    cream = (0.56, 0.45, 0.34); blue = (0.006, 0.008, 0.02); rust = (0.3, 0.085, 0.03)
    c = mix(band, cream, (0.02, 0.022, 0.035))
    c = mix(throat, c, rust)
    c = mix(back.outputs["Result"], c, blue)
    fine = N.new("ShaderNodeTexNoise"); fine.inputs["Scale"].default_value = 900; fine.inputs["Detail"].default_value = 3
    L(tc.outputs["Object"], fine.inputs["Vector"])
    g = N.new("ShaderNodeMix"); g.data_type = "RGBA"; g.blend_type = "MULTIPLY"; g.inputs["Factor"].default_value = 0.25
    L(c, g.inputs[6]); L(fine.outputs["Color"], g.inputs[7])
    L(g.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.5; b.inputs["Specular IOR Level"].default_value = 0.35
    b.inputs["Sheen Weight"].default_value = 0.22; b.inputs["Sheen Roughness"].default_value = 0.4
    b.inputs["Sheen Tint"].default_value = (0.55, 0.62, 0.85, 1)
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25; bump.inputs["Distance"].default_value = 0.0004
    L(fine.outputs["Fac"], bump.inputs["Height"]); L(bump.outputs["Normal"], b.inputs["Normal"])
    _SWALLOW["plumage"] = m
    # flight feathers and tail: near black, a blue sheen, the vanes' edges
    w = plain("swallow wing", (0.008, 0.009, 0.016), rough=0.5, sheen=0.25)
    wn = w.node_tree.nodes; wl = w.node_tree.links.new; wb = wn["Principled BSDF"]
    wb.inputs["Sheen Tint"].default_value = (0.5, 0.58, 0.85, 1)
    wv = wn.new("ShaderNodeTexWave"); wv.inputs["Scale"].default_value = 70; wv.bands_direction = "X"; wv.inputs["Distortion"].default_value = 2
    wt = wn.new("ShaderNodeTexCoord"); wl(wt.outputs["Object"], wv.inputs["Vector"])
    wbp = wn.new("ShaderNodeBump"); wbp.inputs["Strength"].default_value = 0.3; wbp.inputs["Distance"].default_value = 0.0003
    wl(wv.outputs["Fac"], wbp.inputs["Height"]); wl(wbp.outputs["Normal"], wb.inputs["Normal"])
    _SWALLOW["wing"] = w
    _SWALLOW["bill"] = plain("swallow bill", (0.012, 0.01, 0.009), rough=0.35)
    _SWALLOW["eye"] = plain("swallow eye", (0.004, 0.003, 0.003), rough=0.08)
    _SWALLOW["feet"] = plain("swallow feet", (0.06, 0.04, 0.035), rough=0.6)
    return _SWALLOW

def swallow(name, foot, facing, k=1.0, lean=0.0, head_turn=0.0):
    """a barn swallow perched on a wire, its feet at `foot`, facing `facing`
    (radians about the upright, 0 = +x); `k` its size against a real one
    (17 cm, its streamers in); `lean` its body tipped forward (radians);
    `head_turn` its head turned (radians). Built level, in centimetres —
    x forward, z up from a pivot 2.4 cm over its feet — then tipped up."""
    M = _swallow_materials()
    s = 0.01 * k
    root = bpy.data.objects.new(name, None); link(root)
    root.location = foot; root.rotation_euler = (0, 0, facing)
    tilt = Quaternion((0, 1, 0), math.radians(-32) + lean)
    PIV = Vector((0, 0, 2.4))
    def at(x, z, y=0.0):
        """a point of the level bird, where it is once tipped up (m)"""
        return (tilt @ Vector((x, y, z)) + PIV) * s
    # (its body: one blob, built level in its own object, the object tipped)
    ob, mb = _blob(name + " body", M["plumage"], 0.0011 * k)
    ob["cm"] = (1 / s, 1 / s, 1 / s)
    ob.parent = root; ob.location = PIV * s; ob.rotation_mode = "QUATERNION"; ob.rotation_quaternion = tilt
    c = lambda x, z, y=0.0: Vector((x * s, y * s, z * s))
    _ell(mb, c(-0.3, 0.0), (4.2 * s, 1.28 * s, 1.45 * s))
    _ell(mb, c(1.5, -0.25), (1.9 * s, 1.3 * s, 1.55 * s))
    _ell(mb, c(-3.0, -0.2), (1.7 * s, 0.85 * s, 0.8 * s))
    hq = Quaternion((0, 0, 1), head_turn) @ Quaternion((0, 1, 0), math.radians(22))
    HC = (4.0, 0.6)
    _ell(mb, c(*HC), (1.28 * s, 1.0 * s, 1.0 * s), hq)
    _limb(mb, c(2.5, 0.25), c(*HC), 0.95 * s)
    def head(x, y, z):
        """a point on its head (cm from the head's middle), placed"""
        v = hq @ Vector((x, y, z)); return at(HC[0] + v.x, HC[1] + v.z, v.y)
    fwd = (tilt @ (hq @ Vector((1, 0, -0.18)))).normalized()
    bill = cylinder(name + " bill", 0, 0, 0, 0.9 * s, 0.3 * s, M["bill"], verts=12, r2=0.03 * s)
    bill.rotation_euler = Vector((0, 0, 1)).rotation_difference(fwd).to_euler()
    bill.location = head(1.15, 0, -0.12); bill.scale = (1.0, 1.25, 1.0); bill.parent = root
    for side in (-1, 1):
        e = sphere(name + " eye", tuple(head(0.62, side * 0.8, 0.22)), 0.2 * s, M["eye"]); e.parent = root
    # wings folded along the back, their tips crossed beyond the tail
    for side in (-1, 1):
        outline = [(0, 0.9), (1.2, 1.55), (2.8, 1.62), (4.8, 1.4), (6.8, 1.05), (8.6, 0.6), (9.9, 0.28), (10.8, 0.02)]
        wg = _blade(name + " wing", [(u * s, w * s) for (u, w) in outline], M["wing"], 0.2 * s, bend=-0.35 * s)
        shoulder = at(2.2, 0.75, side * 1.05)
        tip = at(-8.3, 0.2, -side * 0.5)
        _place(wg, shoulder, tip - shoulder, tilt @ Vector((0, side * 0.8, 1.0)), root)
    # the forked tail, its outer streamers long
    base = at(-3.9, -0.15)
    for side in (-1, 1):
        st = _blade(name + " streamer", [(u * s, w * s) for (u, w) in ((0, 0.7), (1.5, 0.62), (3.5, 0.4), (5.5, 0.2), (7.6, 0.07), (8.4, 0.01))], M["wing"], 0.12 * s)
        _place(st, base, at(-12.0, -0.9, side * 1.5) - base, tilt @ Vector((0, 0, 1)), root)
    mid = _blade(name + " tail", [(u * s, w * s) for (u, w) in ((0, 0.9), (1.5, 1.05), (3.0, 0.95), (3.8, 0.4))], M["wing"], 0.14 * s)
    _place(mid, base, at(-7.8, -0.5) - base, tilt @ Vector((0, 0, 1)), root)
    # its feet on the wire
    for side in (-1, 1):
        lg = cylinder(name + " leg", 0, 0, 0, 0.7 * s, 0.13 * s, M["feet"], verts=8); lg.location = (0.2 * s, side * 0.45 * s, 0.05 * s); lg.parent = root
        for (dx, dz) in ((0.75, -0.05), (-0.55, -0.1)):
            toe = cylinder(name + " toe", 0, 0, 0, abs(dx) * s, 0.08 * s, M["feet"], verts=6)
            toe.rotation_euler = (0, math.copysign(math.pi / 2 + 0.5, dx), 0); toe.location = (0.2 * s, side * 0.45 * s, (0.15 + dz) * s); toe.parent = root
    return root

# ── the man on the porch, his guitar ─────────────────────────────────────────
def _plaid():
    """a red flannel shirt, checked with black and a thin yellow line"""
    m = bpy.data.materials.new("flannel"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); L(tc.outputs["Object"], sep.inputs[0])
    def stripes(axis):
        w = N.new("ShaderNodeMath"); w.operation = "MULTIPLY"; w.inputs[1].default_value = 1 / 0.07; L(sep.outputs[axis], w.inputs[0])
        f = N.new("ShaderNodeMath"); f.operation = "FRACT"; L(w.outputs[0], f.inputs[0])
        k = N.new("ShaderNodeMath"); k.operation = "LESS_THAN"; k.inputs[1].default_value = 0.42; L(f.outputs[0], k.inputs[0])
        t = N.new("ShaderNodeMath"); t.operation = "COMPARE"; t.inputs[1].default_value = 0.71; t.inputs[2].default_value = 0.025; L(f.outputs[0], t.inputs[0])
        return k.outputs[0], t.outputs[0]
    ax, tx = stripes("X"); az, tz = stripes("Z")
    both = N.new("ShaderNodeMath"); both.operation = "ADD"; L(ax, both.inputs[0]); L(az, both.inputs[1])
    dark = N.new("ShaderNodeMapRange"); dark.inputs["From Max"].default_value = 2.0; dark.inputs["To Max"].default_value = 0.92; L(both.outputs[0], dark.inputs["Value"])
    c = N.new("ShaderNodeMix"); c.data_type = "RGBA"; c.inputs[6].default_value = (0.32, 0.035, 0.03, 1); c.inputs[7].default_value = (0.02, 0.012, 0.012, 1)
    L(dark.outputs["Result"], c.inputs["Factor"])
    line = N.new("ShaderNodeMath"); line.operation = "MAXIMUM"; L(tx, line.inputs[0]); L(tz, line.inputs[1])
    y = N.new("ShaderNodeMix"); y.data_type = "RGBA"; y.inputs[7].default_value = (0.42, 0.33, 0.1, 1)
    L(line.outputs[0], y.inputs["Factor"]); L(c.outputs[2], y.inputs[6])
    L(y.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.92; b.inputs["Sheen Weight"].default_value = 0.6; b.inputs["Specular IOR Level"].default_value = 0.2
    return m

def _guitar(name, mats):
    """an old dreadnought: its body outlined from its two bouts, a spruce top
    gone amber, a dark sound hole and bridge; its neck and headstock. Built
    with its neck along +y, its top facing +z, the lower bout's middle at 0"""
    root = bpy.data.objects.new(name, None); link(root)
    def half(y):
        lo = 0.2 * math.sqrt(max(0.0, 1 - (y / 0.215) ** 2))
        up = 0.148 * math.sqrt(max(0.0, 1 - ((y - 0.265) / 0.155) ** 2))
        waist = 0.122 + 0.02 * ((y - 0.15) / 0.06) ** 2
        w = max(lo, up)
        if 0.09 < y < 0.21: w = min(max(w, waist), max(lo, up, waist))
        return w
    ys = [-0.215 + 0.635 * i / 80 for i in range(81)]
    pts = [(half(y), y) for y in ys]
    outline = [(x, y) for (x, y) in pts if x > 1e-4]
    loop = outline + [(-x, y) for (x, y) in reversed(outline)]
    def slab(nm, z0, z1, mat, scale=1.0):
        bm = bmesh.new()
        lo = [bm.verts.new((x * scale, y, z0)) for (x, y) in loop]
        hi = [bm.verts.new((x * scale, y, z1)) for (x, y) in loop]
        bm.faces.new(lo[::-1]); bm.faces.new(hi)
        for i in range(len(loop)):
            j = (i + 1) % len(loop); bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
        me = bpy.data.meshes.new(nm); bm.to_mesh(me); bm.free()
        o = link(bpy.data.objects.new(nm, me)); me.materials.append(mat); o.parent = root
        bv = o.modifiers.new("bevel", "BEVEL"); bv.width = 0.004; bv.segments = 2
        return o
    slab(name + " body", -0.1, -0.004, mats["sides"])
    slab(name + " top", -0.004, 0.0, mats["top"])
    hole = cylinder(name + " sound hole", 0, 0.115, 0.0, 0.0012, 0.044, mats["hole"], verts=48)
    ring = cylinder(name + " rosette", 0, 0.115, -0.0002, 0.0008, 0.05, mats["neck"], verts=48)
    for o in (hole, ring): o.parent = root
    guard = cylinder(name + " pickguard", 0.045, 0.06, 0.0, 0.0009, 0.05, mats["neck"], verts=24); guard.scale = (1, 1.5, 1); guard.parent = root
    br = box(name + " bridge", -0.075, 0.075, -0.08, -0.06, 0.0, 0.009, mats["neck"]); bevel(br, 0.003, 2); br.parent = root
    nk = box(name + " neck", -0.026, 0.026, 0.4, 0.95, -0.03, 0.006, mats["neck"]); bevel(nk, 0.008, 3); nk.parent = root
    hs = box(name + " headstock", -0.04, 0.04, 0.0, 0.19, -0.016, 0.0, mats["neck"]); bevel(hs, 0.005, 2); hs.parent = root
    hs.location = (0, 0.945, -0.008); hs.rotation_euler = (math.radians(-13), 0, 0)
    for i in range(3):
        for side in (-1, 1):
            peg = cylinder(name + " tuner", 0, 0, 0, 0.022, 0.006, mats["string"], verts=8); peg.parent = hs
            peg.rotation_euler = (0, side * math.pi / 2, 0); peg.location = (side * 0.04, 0.04 + 0.055 * i, -0.008)
    for i in range(6):
        st = cylinder(name + " string", 0, 0, 0, 1.0, 0.0006, mats["string"], verts=6)
        st.rotation_euler = (-math.pi / 2, 0, 0); st.location = (-0.018 + 0.0072 * i, -0.07, 0.0085); st.parent = root
    return root

def singer(name, porch_light=None):
    """a man in his rocking chair on the porch, his guitar on his knee,
    singing up at the morning: a worn felt hat, a beard, a red flannel
    shirt, jeans, boots. In his own frame: facing +y, x to his left hand's
    side (his right is -x... no: x to his right), z up from the seat."""
    root = bpy.data.objects.new(name, None); link(root)
    skin = plain("weathered skin", (0.42, 0.25, 0.17), rough=0.55)
    sk = skin.node_tree.nodes["Principled BSDF"]; sk.inputs["Subsurface Weight"].default_value = 0.25; sk.inputs["Subsurface Radius"].default_value = (0.012, 0.005, 0.003)
    denim = plain("old denim", (0.05, 0.075, 0.13), rough=0.95, sheen=0.4)
    leather = plain("boot leather", (0.09, 0.05, 0.025), rough=0.6)
    beard = plain("beard", (0.07, 0.045, 0.03), rough=0.95, sheen=0.7)
    felt = plain("hat felt", (0.33, 0.24, 0.15), rough=0.9, sheen=0.4)
    band = plain("hat band", (0.05, 0.03, 0.02), rough=0.7)
    shirt = _plaid()
    def blob(nm, mat):
        ob, mb = _blob(f"{name} {nm}", mat, 0.006); ob.parent = root; return mb
    # (shirt: chest, a comfortable belly, arms in their sleeves)
    sh = blob("shirt", shirt)
    lean = Quaternion((1, 0, 0), math.radians(-9))
    _ell(sh, (0, -0.04, 0.36), (0.175, 0.115, 0.2), lean)
    _ell(sh, (0, 0.03, 0.2), (0.165, 0.14, 0.14))
    R_SH, R_EL, R_WR = (0.19, -0.05, 0.53), (0.27, 0.06, 0.35), (0.12, 0.26, 0.29)
    L_SH, L_EL, L_WR = (-0.19, -0.05, 0.53), (-0.31, 0.1, 0.36), (-0.36, 0.25, 0.43)
    for a, b, r in ((R_SH, R_EL, 0.052), (R_EL, R_WR, 0.045), (L_SH, L_EL, 0.052), (L_EL, L_WR, 0.045)):
        _limb(sh, a, b, r)
    _limb(sh, (-0.15, -0.05, 0.53), (0.15, -0.05, 0.53), 0.065)
    # (jeans: hips, thighs out to the knees, shins down to the boots)
    jn = blob("jeans", denim)
    _ell(jn, (0, 0.0, 0.08), (0.17, 0.13, 0.09))
    for x in (-0.1, 0.11):
        _limb(jn, (x, 0.02, 0.08), (x * 1.15, 0.43, 0.09), 0.075)
        _limb(jn, (x * 1.15, 0.45, 0.07), (x * 1.18, 0.48, -0.36), 0.058)
    bt = blob("boots", leather)
    for x in (-0.1, 0.11):
        _limb(bt, (x * 1.18, 0.48, -0.33), (x * 1.18, 0.49, -0.42), 0.05)
        _ell(bt, (x * 1.18, 0.54, -0.43), (0.05, 0.11, 0.04))
    # (skin: neck, head tipped back a little — he is singing — and hands)
    sk_ = blob("skin", skin)
    head_q = Quaternion((1, 0, 0), math.radians(14))
    _limb(sk_, (0, -0.03, 0.56), (0, -0.01, 0.64), 0.052)
    HC = Vector((0, 0.0, 0.725))
    _ell(sk_, HC, (0.078, 0.093, 0.105), head_q)
    _ell(sk_, HC + head_q @ Vector((0, 0.09, 0.0)), (0.017, 0.022, 0.026), head_q)       # nose
    for side in (-1, 1): _ell(sk_, HC + head_q @ Vector((side * 0.078, -0.005, 0.0)), (0.012, 0.022, 0.03), head_q)   # ears
    _ell(sk_, Vector(R_WR) + Vector((-0.02, 0.025, 0.0)), (0.035, 0.045, 0.024))   # strumming hand
    _ell(sk_, Vector(L_WR) + Vector((0.0, 0.02, 0.02)), (0.03, 0.035, 0.045))      # hand on the neck
    bd = blob("beard", beard)
    _ell(bd, HC + head_q @ Vector((0, 0.05, -0.065)), (0.072, 0.055, 0.06), head_q)
    _ell(bd, HC + head_q @ Vector((0, 0.083, -0.022)), (0.04, 0.014, 0.012), head_q)    # moustache
    for side in (-1, 1): _ell(bd, HC + head_q @ Vector((side * 0.06, 0.02, -0.04)), (0.022, 0.04, 0.05), head_q)
    mouth = sphere(f"{name} mouth", tuple(HC + head_q @ Vector((0, 0.091, -0.045))), 0.012, plain("mouth", (0.03, 0.008, 0.006), rough=0.6), squash=(1.2, 0.5, 0.9))
    mouth.parent = root
    for side in (-1, 1):
        e = sphere(f"{name} eye", tuple(HC + head_q @ Vector((side * 0.03, 0.078, 0.022))), 0.008, plain("eye", (0.02, 0.015, 0.012), rough=0.2))
        e.parent = root
    # his hat: a worn felt cattleman's, its brim curled up at the sides
    hat = lathe(f"{name} hat brim", [(0, 0), (0.105, 0.0), (0.16, 0.004), (0.2, 0.022), (0.205, 0.03), (0.198, 0.031), (0.155, 0.012), (0.1, 0.009), (0, 0.009)], felt, steps=48)
    hat.scale = (1.0, 1.18, 1.0)
    crown = lathe(f"{name} hat crown", [(0, 0.115), (0.04, 0.112), (0.075, 0.1), (0.092, 0.06), (0.098, 0.0), (0, 0.0)], felt, steps=48)
    crown.scale = (0.9, 1.15, 1.0)
    hb = lathe(f"{name} hat band", [(0.0992, 0.0), (0.0995, 0.022), (0.096, 0.022), (0.095, 0.0)], band, steps=48); hb.scale = (0.9, 1.15, 1.0)
    hat_root = bpy.data.objects.new(f"{name} hat", None); link(hat_root); hat_root.parent = root
    for o in (hat, crown, hb): o.parent = hat_root
    hat_root.location = HC + head_q @ Vector((0, -0.008, 0.07)); hat_root.rotation_euler = head_q.to_euler()
    # the guitar, its waist on his right thigh, its neck to his left hand
    mats = {"top": plain("guitar spruce", (0.5, 0.31, 0.13), rough=0.42), "sides": plain("guitar rosewood", (0.09, 0.04, 0.02), rough=0.45),
            "hole": plain("sound hole", (0.006, 0.004, 0.003), rough=0.9), "neck": plain("guitar ebony", (0.025, 0.016, 0.01), rough=0.5),
            "string": plain("guitar string", (0.6, 0.55, 0.45), rough=0.3, metal=1.0)}
    gt = _guitar(f"{name} guitar", mats)
    centre = Vector((0.1, 0.24, 0.24))
    neck = (Vector(L_WR) + Vector((0, 0.03, 0.0)) - centre)
    up = Vector((0.0, 1.0, 0.18))
    _place(gt, centre, neck, up, root)
    # (built along +y: turn its y onto the neck's line, its z out from the top)
    y = neck.normalized(); z = (up - y * up.dot(y)).normalized(); x = y.cross(z)
    m = Matrix((x, y, z)).transposed().to_4x4(); m.translation = centre
    gt.matrix_basis = m
    return root

# ── the flag on the porch post ─────────────────────────────────────────────
def porch_flag(name, image, foot, out_dir, frames=48, wind=0.0):
    """a cotton flag on an angled pole from the porch post, hanging in the
    still air of a morning: `foot` where the pole's bracket is, `out_dir`
    the way the pole points (up and out). The cloth is let fall with
    Blender's cloth (`frames` of it) and kept as it lies."""
    root = bpy.data.objects.new(name, None); link(root)
    d = Vector(out_dir).normalized(); POLE = 1.75
    pole = cylinder(name + " pole", 0, 0, 0, POLE, 0.014, plain("flagpole", (0.24, 0.17, 0.09), rough=0.5), verts=16)
    pole.rotation_euler = Vector((0, 0, 1)).rotation_difference(d).to_euler(); pole.location = foot
    fin = sphere(name + " finial", tuple(Vector(foot) + d * (POLE + 0.025)), 0.028, aged_metal("finial brass", (0.6, 0.45, 0.2), (0.1, 0.07, 0.03), rough=(0.3, 0.5), scale=40, tarnish=0.5))
    br = box(name + " bracket", -0.04, 0.04, -0.03, 0.03, -0.06, 0.06, plain("bracket iron", (0.04, 0.035, 0.03), rough=0.6, metal=0.6)); br.location = foot
    # the cloth: hoist along the pole, near its end; 1.2 m by 0.66
    FW, FH = 1.2, 0.66
    bm = bmesh.new(); res_u, res_v = 48, 27
    uv = bm.loops.layers.uv.new("UVMap")
    grid = [[bm.verts.new((FW * i / res_u, 0, -FH * j / res_v)) for i in range(res_u + 1)] for j in range(res_v + 1)]
    for j in range(res_v):
        for i in range(res_u):
            f = bm.faces.new((grid[j][i], grid[j + 1][i], grid[j + 1][i + 1], grid[j][i + 1]))
            for lp in f.loops:
                co = lp.vert.co; lp[uv].uv = (co.x / FW, 1 + co.z / FH)
    me = bpy.data.meshes.new(name + " cloth"); bm.to_mesh(me); bm.free()
    cloth = link(bpy.data.objects.new(name + " cloth", me))
    m = bpy.data.materials.new(name + " cotton"); m.use_nodes = True
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(image, check_existing=True)
    Lk(t.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.95; b.inputs["Sheen Weight"].default_value = 0.6; b.inputs["Specular IOR Level"].default_value = 0.15
    tr = N.new("ShaderNodeBsdfTranslucent"); Lk(t.outputs["Color"], tr.inputs["Color"])
    mx = N.new("ShaderNodeMixShader"); mx.inputs["Fac"].default_value = 0.12
    Lk(b.outputs[0], mx.inputs[1]); Lk(tr.outputs[0], mx.inputs[2]); Lk(mx.outputs[0], N["Material Output"].inputs["Surface"])
    me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    # lay its hoist (u = 0) along the pole, from 1.68 m back to 1.68 − FH
    side = d.cross(Vector((0, 0, 1)))
    if side.length < 1e-6: side = Vector((1, 0, 0))
    side.normalize(); down = side.cross(d).normalized()
    # (the cloth's x runs away from the pole, sideways; its −z down the pole)
    top = Vector(foot) + d * (POLE - 0.07)
    mtx = Matrix((side, side.cross(-d), -d * -1)).transposed()
    for v in me.vertices:
        u, h = v.co.x, -v.co.z                                  # (out from the hoist, down it)
        p = top - d * h + side * u
        v.co = p
    vg = cloth.vertex_groups.new(name="hoist")
    vg.add([v.index for v in me.vertices if v.index % (res_u + 1) == 0], 1.0, "REPLACE")
    cm = cloth.modifiers.new("cloth", "CLOTH"); st = cm.settings
    st.quality = 10; st.mass = 0.25; st.tension_stiffness = 20; st.compression_stiffness = 20; st.bending_stiffness = 0.6
    st.air_damping = 2.0; st.vertex_group_mass = "hoist"
    cm.point_cache.frame_start = 1; cm.point_cache.frame_end = frames
    if wind:
        fw = bpy.data.objects.new(name + " air", None); link(fw)
        bpy.context.view_layer.update()
    for o in (pole, fin, br): o.parent = root
    return root, cloth

def settle_cloth(scene, frames):
    """run the cloth to rest: step the scene through its frames"""
    for f in range(1, frames + 1): scene.frame_set(f)
