# Ivy's pressed plants, for herbarium_desk.py: the ten specimens of her five
# pages (levels/herbarium/puzzle.js PAGES), built flat as pressed plants are —
# leaves cut to their own outlines with their veins in them, petals thin
# enough to let the light through, stems and twigs flattened, thorns — each
# held to its sheet by narrow strips of gummed paper. A page is built on its
# own top sheet of the open album, rendered, and taken away again.
#
# Places on a page are in centimetres from its sheet's top left, x across,
# y down; directions in degrees, 0 to the right, 90 up the page.

import bpy, bmesh, math, random
from mathutils import Vector

# ── what they are made of ───────────────────────────────────────────────────

def tissue(name, colour, edge, vein=0.5, venation="pinnate", n=9.0, slope=1.3, trans=0.0, rough=0.78, tip=None, crinkle=0.2, dim=0.68):
    """a pressed plant's tissue: its colour gone toward `edge` at its margins,
    its veins lighter; `venation` pinnate (from a midrib), palmate (from the
    base, round a leaf), parallel (along it) or none; `tip` a colour its far
    end goes to (a daisy's rays)"""
    # (pressed and kept, every colour gone duller and darker than it grew)
    grey = lambda c: sum(c) / 3
    colour = tuple((x * 0.78 + grey(colour) * 0.22) * dim for x in colour); edge = tuple((x * 0.8 + grey(edge) * 0.2) * dim for x in edge)
    if tip: tip = tuple(x * dim for x in tip)
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    uv = N.new("ShaderNodeUVMap"); uv.uv_map = "rel"
    sep = N.new("ShaderNodeSeparateXYZ"); L(uv.outputs["UV"], sep.inputs["Vector"])
    across, along = sep.outputs["X"], sep.outputs["Y"]
    def mr(v, a, b2, c=0.0, d=1.0, smooth=True):
        r = N.new("ShaderNodeMapRange"); r.interpolation_type = "SMOOTHSTEP" if smooth else "LINEAR"
        r.inputs["From Min"].default_value = a; r.inputs["From Max"].default_value = b2; r.inputs["To Min"].default_value = c; r.inputs["To Max"].default_value = d
        L(v, r.inputs["Value"]); return r.outputs["Result"]
    def op(o, a, b2):
        t = N.new("ShaderNodeMath"); t.operation = o
        for k, v in enumerate((a, b2)):
            if isinstance(v, (int, float)): t.inputs[k].default_value = v
            else: L(v, t.inputs[k])
        return t.outputs[0]
    def mix(fac, a, b2):
        x = N.new("ShaderNodeMix"); x.data_type = "RGBA"
        if isinstance(fac, (int, float)): x.inputs["Factor"].default_value = fac
        else: L(fac, x.inputs["Factor"])
        for sock, v in ((x.inputs[6], a), (x.inputs[7], b2)):
            if isinstance(v, tuple): sock.default_value = (*v, 1)
            else: L(v, sock)
        return x.outputs[2]
    tc = N.new("ShaderNodeTexCoord")
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 260; nz.inputs["Detail"].default_value = 6; L(tc.outputs["Object"], nz.inputs["Vector"])
    blot = N.new("ShaderNodeTexNoise"); blot.inputs["Scale"].default_value = 60; blot.inputs["Detail"].default_value = 4; L(tc.outputs["Object"], blot.inputs["Vector"])
    # (its margins browned, unevenly)
    brown = op("MINIMUM", op("ADD", mr(across, 0.62, 1.0, 0.0, 0.85), op("MULTIPLY", mr(blot.outputs["Fac"], 0.45, 0.75), 0.35)), 1.0)
    col = mix(brown, colour, edge)
    if tip: col = mix(mr(along, 0.72, 1.0), col, tip)
    if venation != "none":
        if venation == "pinnate":
            mid = mr(across, 0.0, 0.06, 1.0, 0.0)
            side = mr(op("FRACT", op("SUBTRACT", op("MULTIPLY", along, n), op("MULTIPLY", across, slope)), 0), 0.0, 0.09, 1.0, 0.0, smooth=False)
            veins = op("MAXIMUM", mid, op("MULTIPLY", side, mr(across, 0.0, 0.85, 0.8, 0.0)))
        elif venation == "palmate":
            # (rel: across = how far out from the leaf's middle, along = round it)
            ribs = mr(op("PINGPONG", op("MULTIPLY", along, n), 0.5), 0.0, 0.05, 1.0, 0.0)
            fine = mr(op("FRACT", op("ADD", op("MULTIPLY", along, n * 4), op("MULTIPLY", across, 2.0)), 0), 0.0, 0.08, 0.5, 0.0, smooth=False)
            veins = op("MULTIPLY", op("MAXIMUM", ribs, op("MULTIPLY", fine, mr(across, 0.3, 0.9, 1.0, 0.0))), mr(across, 0.0, 0.95, 1.0, 0.2))
        else:  # parallel
            veins = mr(op("PINGPONG", op("MULTIPLY", across, n), 0.5), 0.0, 0.06, 1.0, 0.0)
        light = tuple(min(1.0, c * 1.7 + 0.03) for c in colour)
        col = mix(op("MULTIPLY", veins, vein), col, light)
    else:
        veins = None
    # (patches darker where it pressed unevenly; each piece a little unlike the next)
    dark = tuple(x * 0.5 for x in edge)
    col = mix(mr(blot.outputs["Fac"], 0.42, 0.72, 0.0, 0.5), col, dark)
    oi = N.new("ShaderNodeObjectInfo"); hsv = N.new("ShaderNodeHueSaturation")
    L(mr(oi.outputs["Random"], 0.0, 1.0, 0.72, 1.18, smooth=False), hsv.inputs["Value"]); hsv.inputs["Saturation"].default_value = 0.92
    L(mr(oi.outputs["Random"], 0.0, 1.0, 0.485, 0.515, smooth=False), hsv.inputs["Hue"])
    L(col, hsv.inputs["Color"]); col = hsv.outputs["Color"]
    L(col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough; b.inputs["Specular IOR Level"].default_value = 0.25
    if trans:
        b.inputs["Transmission Weight"].default_value = trans; b.inputs["IOR"].default_value = 1.3
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = crinkle; bp.inputs["Distance"].default_value = 0.0002
    L(op("ADD", nz.outputs["Fac"], op("MULTIPLY", veins, -0.6)) if veins else nz.outputs["Fac"], bp.inputs["Height"]); L(bp.outputs["Normal"], b.inputs["Normal"])
    return m

def materials():
    """every pressed tissue the pages want, by name"""
    g = {}
    def t(key, *a, **k): g[key] = tissue(f"pressed {key}", *a, **k)
    t("hawthorn", (0.075, 0.095, 0.03), (0.13, 0.08, 0.03), n=6, slope=1.6)
    t("haw flower", (0.52, 0.47, 0.36), (0.36, 0.26, 0.14), venation="none", trans=0.25, rough=0.7, dim=0.9)
    t("daisy leaf", (0.08, 0.1, 0.035), (0.14, 0.1, 0.04), n=5, slope=1.4)
    t("daisy ray", (0.62, 0.6, 0.52), (0.5, 0.42, 0.3), venation="parallel", n=1.5, vein=0.15, trans=0.25, tip=(0.48, 0.24, 0.26), dim=0.9)
    t("daisy disc", (0.42, 0.28, 0.04), (0.3, 0.18, 0.03), venation="none", rough=0.9, crinkle=0.6)
    t("rose leaf", (0.07, 0.09, 0.03), (0.14, 0.09, 0.03), n=8, slope=1.2)
    t("rose petal", (0.56, 0.33, 0.31), (0.44, 0.27, 0.2), venation="parallel", n=3.0, vein=0.2, trans=0.3, rough=0.65, crinkle=0.35, dim=0.9)
    t("stamens", (0.5, 0.36, 0.06), (0.32, 0.2, 0.04), venation="none", rough=0.9, crinkle=0.8)
    t("oak", (0.1, 0.1, 0.035), (0.17, 0.1, 0.035), n=7, slope=0.9)
    t("ivy", (0.04, 0.06, 0.025), (0.09, 0.07, 0.03), venation="palmate", n=2.5, vein=0.55)
    t("plantain", (0.08, 0.1, 0.035), (0.14, 0.1, 0.04), venation="parallel", n=2.5, vein=0.4)
    t("spike", (0.07, 0.05, 0.03), (0.05, 0.035, 0.02), venation="none", rough=0.95, crinkle=0.9)
    t("blackthorn leaf", (0.07, 0.085, 0.03), (0.13, 0.08, 0.03), n=7, slope=1.1)
    t("sloe flower", (0.6, 0.57, 0.48), (0.42, 0.34, 0.22), venation="none", trans=0.3, rough=0.65, dim=0.9)
    t("beech", (0.13, 0.1, 0.035), (0.2, 0.11, 0.035), n=8, slope=0.6)
    t("privet", (0.06, 0.08, 0.03), (0.11, 0.08, 0.03), n=6, slope=1.0)
    t("privet flower", (0.55, 0.5, 0.38), (0.4, 0.32, 0.2), venation="none", trans=0.2, rough=0.7, dim=0.9)
    t("primrose leaf", (0.09, 0.11, 0.04), (0.15, 0.11, 0.04), n=9, slope=1.0, crinkle=0.55)
    t("primrose", (0.6, 0.55, 0.26), (0.48, 0.38, 0.16), venation="parallel", n=2.0, vein=0.12, trans=0.3, tip=(0.62, 0.58, 0.32), dim=0.9)
    t("primrose eye", (0.5, 0.36, 0.08), (0.4, 0.28, 0.06), venation="none")
    t("twig", (0.11, 0.065, 0.035), (0.08, 0.05, 0.03), venation="none", rough=0.7, crinkle=0.4)
    t("dark twig", (0.035, 0.028, 0.024), (0.05, 0.035, 0.025), venation="none", rough=0.6, crinkle=0.4)
    t("green stem", (0.09, 0.1, 0.04), (0.12, 0.09, 0.04), venation="none", rough=0.75)
    g["strip"] = tissue("gummed strip", (0.68, 0.6, 0.43), (0.6, 0.5, 0.34), venation="none", trans=0.12, rough=0.45, crinkle=0.1, dim=0.95)
    return g

# ── a page being built on its sheet ─────────────────────────────────────────

class Page:
    """one top sheet of the album, its specimens built on it: `rect` its
    corners in the book's picture (px), `at` the desk script's own px → metres,
    `px` its centimetre, `z` the sheet's height (cm) and `bow` how it bends
    into the spine at `spine_x`"""
    def __init__(self, rect, at, px, z, bow, spine_x, seed):
        self.x0, self.y0, self.x1, self.y1 = rect; self.at, self.PX, self.z = at, px, z
        self.bow, self.spine = bow, spine_x
        self.objs = []; self.rng = random.Random(seed)
        self.w_cm, self.h_cm = (self.x1 - self.x0) / px, (self.y1 - self.y0) / px
    def w(self, x, y, lift=0.0):
        """a place on the sheet (cm from its top left) in Blender's metres"""
        return self.at(self.x0 + x * self.PX, self.y0 + y * self.PX, self.z + 0.02 + lift)
    def keep(self, o):
        self.objs.append(o); return o
    def finish(self):
        """everything laid down onto the sheet where it bends into the spine"""
        for o in self.objs:
            for v in o.data.vertices:
                px_ = v.co.x * 100 * self.PX + 768
                v.co.z -= self.bow * math.exp(-abs(px_ - self.spine) / self.PX / 1.4) / 100
            o.data.update()
    def clear(self):
        for o in self.objs:
            me = o.data; bpy.data.objects.remove(o, do_unlink=True); bpy.data.meshes.remove(me)
        self.objs = []

def _object(page, name, bm, mat):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    return page.keep(o)

def _dir(angle):
    a = math.radians(angle); return Vector((math.cos(a), -math.sin(a)))     # (page cm: y down)

# ── the pieces ──────────────────────────────────────────────────────────────

def blade(page, base, angle, length, width_fn, mat, lift=0.0, bend=0.0, steps=36, lift_fn=None, name="leaf"):
    """a leaf (or a petal, a strip) laid flat: from `base` along `angle`,
    `length` cm, its half-width `width_fn(t)` cm at t from base to tip; its
    middle bent a little to one side by `bend`"""
    d = _dir(angle); s = Vector((-d.y, d.x))
    bm = bmesh.new(); uv = bm.loops.layers.uv.new("UVMap"); rel = bm.loops.layers.uv.new("rel")
    rows = []
    p1, p2 = page.rng.uniform(0, 1), page.rng.uniform(0, 1)
    uneven = lambda t: 1 + 0.045 * math.sin(math.tau * (3.1 * t + p1)) + 0.03 * math.sin(math.tau * (7.3 * t + p2))
    for k in range(steps + 1):
        t = k / steps; hw = max(0.002, width_fn(t) * uneven(t))
        c = Vector(base) + d * t * length + s * bend * length * 0.12 * math.sin(math.pi * t)
        z = lift + (lift_fn(t) if lift_fn else 0.0)
        rows.append([(bm.verts.new(page.w(*(c + s * e * hw), z)), e, t) for e in (-1.0, 0.0, 1.0)])
    for k in range(steps):
        for j in range(2):
            q = [rows[k][j], rows[k][j + 1], rows[k + 1][j + 1], rows[k + 1][j]]
            f = bm.faces.new([v for v, _, _ in q])
            for lp, (_, e, t) in zip(f.loops, q):
                lp[uv].uv = (0.5 + e * 0.5, t); lp[rel].uv = (abs(e), t)
    return _object(page, name, bm, mat)

def palmate(page, centre, angle, R, mat, lift=0.0, lobes=((0, 1.0), (55, 0.8), (-55, 0.8), (110, 0.55), (-110, 0.55)), steps=96, name="ivy leaf"):
    """a leaf round from its middle, lobed (ivy): each lobe its angle from
    `angle` and its reach; a notch where its stalk comes in"""
    bm = bmesh.new(); uv = bm.loops.layers.uv.new("UVMap"); rel = bm.loops.layers.uv.new("rel")
    c = Vector(centre); mid = bm.verts.new(page.w(*c, lift))
    def r(th):
        # (th: from the leaf's tip round; its stalk comes in at th = ±pi)
        k = 0.48 + sum(reach * 0.52 * math.exp(-(((th - math.radians(a) + math.pi) % math.tau - math.pi) / 0.42) ** 2) for a, reach in lobes)
        off_stalk = math.pi - abs(((th + math.pi) % math.tau) - math.pi)
        return R * k * (0.45 + 0.55 * min(1.0, off_stalk / 0.45))
    ring = []
    for k in range(steps):
        th = k / steps * math.tau; a = math.radians(angle) + th + math.pi     # (th = 0 is the stalk's side, behind)
        dv = Vector((math.cos(a), -math.sin(a)))
        rr = r(th - math.pi)
        ring.append(((bm.verts.new(page.w(*(c + dv * rr * 0.5), lift)), bm.verts.new(page.w(*(c + dv * rr), lift))), k / steps))
    for k in range(steps):
        (m0, o0), t0 = ring[k]; (m1, o1), t1 = ring[(k + 1) % steps]
        t1 = t1 if k + 1 < steps else 1.0
        for f_, verts, rels in ((bm.faces.new((mid, m0, m1)), None, [(0, t0), (0.5, t0), (0.5, t1)]), (bm.faces.new((m0, o0, o1, m1)), None, [(0.5, t0), (1, t0), (1, t1), (0.5, t1)])):
            for lp, rv in zip(f_.loops, rels): lp[rel].uv = rv; lp[uv].uv = rv
    return _object(page, name, bm, mat)

def stem(page, points, r0, r1, mat, lift=0.0, squash=0.45, name="stem"):
    """a stem through `points` (cm), from r0 to r1 thick (cm), pressed flat"""
    pts = [Vector(p) for p in points]
    # (smoothed, more points along it)
    fine = []
    for i in range(len(pts) - 1):
        for k in range(6):
            t = k / 6; p0, p1 = pts[i], pts[i + 1]
            pm = pts[i - 1] if i else p0; pn = pts[i + 2] if i + 2 < len(pts) else p1
            fine.append(0.5 * ((2 * p0) + (-pm + p1) * t + (2 * pm - 5 * p0 + 4 * p1 - pn) * t * t + (-pm + 3 * p0 - 3 * p1 + pn) * t ** 3))
    fine.append(pts[-1])
    bm = bmesh.new(); rel = bm.loops.layers.uv.new("rel"); uv = bm.loops.layers.uv.new("UVMap")
    rings = []; n = len(fine); sides = 8
    for i, p in enumerate(fine):
        tng = (fine[min(n - 1, i + 1)] - fine[max(0, i - 1)]).normalized(); side = Vector((-tng.y, tng.x))
        rr = r0 + (r1 - r0) * i / (n - 1)
        rings.append([bm.verts.new(page.w(*(p + side * math.cos(a) * rr), lift + rr * squash * (1 + math.sin(a)))) for a in (k / sides * math.tau for k in range(sides))])
    for i in range(n - 1):
        for k in range(sides):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
            for lp in f.loops: lp[rel].uv = (0.3, i / (n - 1))
    for ring_ in (rings[0], rings[-1][::-1]): bm.faces.new(ring_)
    return _object(page, name, bm, mat)

def thorn(page, base, angle, length, mat, lift=0.0):
    return blade(page, base, angle, length, lambda t: 0.09 * length * (1 - t), mat, lift, steps=4, name="thorn")

def strip(page, centre, angle, length, mats, height=0.12):
    """a narrow strip of gummed paper laid across something, its middle raised
    over it"""
    d = _dir(angle); base = Vector(centre) - d * length / 2
    return blade(page, base, angle, length, lambda t: 0.28, mats["strip"], 0.0, steps=12,
                 lift_fn=lambda t: 0.01 + height * math.sin(math.pi * min(1.0, max(0.0, (t - 0.2) / 0.6))) ** 0.4, name="strip")

# leaf outlines: half-width at t (0 base … 1 tip), for a leaf `W` cm across at most
ovate = lambda W, base=0.7: (lambda t: W / 2 * math.sin(math.pi * t) ** base * (1.15 - 0.3 * t))
elliptic = lambda W: (lambda t: W / 2 * math.sin(math.pi * t) ** 0.75)
lance = lambda W: (lambda t: W / 2 * math.sin(math.pi * t) ** 0.55 * (1 - 0.35 * t))
obovate = lambda W: (lambda t: W / 2 * (t ** 0.55) * max(0.0, 1 - t ** 5) ** 0.45)
spoon = lambda W: (lambda t: W / 2 * (0.18 + 0.82 * max(0.0, (t - 0.35) / 0.65) ** 0.5) * max(0.0, 1 - t ** 6) ** 0.5)
def serrate(f, n, k=0.08):
    return lambda t: f(t) * (1 + k * (abs(((t * n) % 1) - 0.5) * 2 - 0.5))
def lobed(f, n, depth, phase=0.0):
    return lambda t: f(t) * (1 - depth + depth * abs(math.sin(math.pi * (t * n + phase))) ** 0.45)
def wavy(f, n, k=0.06):
    return lambda t: f(t) * (1 + k * math.sin(math.pi * 2 * n * t))

# ── composite pieces ────────────────────────────────────────────────────────

def flower(page, centre, R, n, petal, eye, mats, lift=0.05, rot=0.0, petal_w=0.62, eye_r=0.28, stamens=0, jitter=8.0):
    """a flower pressed open: `n` petals round it, its eye, its stamens"""
    rng = page.rng; c = Vector(centre)
    for k in range(n):
        a = rot + k * 360 / n + rng.uniform(-jitter, jitter)
        blade(page, c + _dir(a) * R * 0.08, a, R * rng.uniform(0.9, 1.05), obovate(R * petal_w * rng.uniform(0.9, 1.1)), mats[petal], lift + 0.008 * k, steps=16, name="petal")
    blade(page, c - _dir(rot) * R * eye_r, rot, 2 * R * eye_r, lambda t: R * eye_r * math.sin(math.pi * t) ** 0.5, mats[eye], lift + 0.008 * n + 0.01, steps=12, name="eye")
    for k in range(stamens):
        a = k * 360 / stamens + rng.uniform(-10, 10); p = c + _dir(a) * R * eye_r * rng.uniform(0.9, 1.5)
        blade(page, p - _dir(a) * 0.05, a, 0.11, lambda t: 0.045 * math.sin(math.pi * t) ** 0.5, mats["stamens"], lift + 0.008 * n + 0.02, steps=4, name="stamen")

def twig_leaves(page, path, mats, leaf_mat, count, length, width_fn, lift=0.03, side_angle=50, every=None, opposite=False, start=0.15, stalk=0.35):
    """leaves set along a twig's path: alternate (or opposite pairs), each on
    a short stalk, turned off the twig by `side_angle`"""
    rng = page.rng; pts = [Vector(p) for p in path]
    def at_t(t):
        f = t * (len(pts) - 1); i = min(len(pts) - 2, int(f)); u = f - i
        p = pts[i].lerp(pts[i + 1], u); d = (pts[i + 1] - pts[i]).normalized(); return p, d
    for k in range(count):
        t = start + (1 - start - 0.06) * k / max(1, count - 1)
        p, d = at_t(t); a0 = math.degrees(math.atan2(-d.y, d.x))
        for e in ((-1, 1) if opposite else ((-1) ** k,)):
            a = a0 + e * (side_angle + rng.uniform(-10, 10))
            stk = p + _dir(a) * stalk
            stem(page, [p, stk], 0.05, 0.04, mats["green stem"], lift)
            sc = rng.uniform(0.82, 1.08)
            blade(page, stk, a + rng.uniform(-8, 8), length * sc, lambda t, f=width_fn, s=sc: f(t) * s, leaf_mat, lift + 0.01, bend=rng.uniform(-0.6, 0.6))

# ── the ten specimens ───────────────────────────────────────────────────────
# (the large one of each page in the upper part of its sheet, inside where her
# pencil figure goes round it; the small one below)

def hawthorn(page, m):
    W_, H_ = page.w_cm, page.h_cm
    main = [(W_ * 0.12, H_ * 0.52), (W_ * 0.3, H_ * 0.42), (W_ * 0.48, H_ * 0.3), (W_ * 0.66, H_ * 0.2), (W_ * 0.82, H_ * 0.09)]
    stem(page, main, 0.22, 0.1, m["twig"])
    branch = [(W_ * 0.48, H_ * 0.3), (W_ * 0.58, H_ * 0.38), (W_ * 0.74, H_ * 0.42), (W_ * 0.86, H_ * 0.4)]
    stem(page, branch, 0.14, 0.07, m["twig"])
    for p, a in (((W_ * 0.22, H_ * 0.47), 70), ((W_ * 0.56, H_ * 0.26), -40), ((W_ * 0.4, H_ * 0.35), 120), ((W_ * 0.66, H_ * 0.4), -70)):
        thorn(page, p, a, 0.9, m["twig"], 0.05)
    leaf = lobed(serrate(lambda t: 2.0 * math.sin(math.pi * min(1, t * 1.05)) ** 0.6 * (0.55 + 0.65 * t), 9, 0.1), 2.6, 0.78, 0.22)
    twig_leaves(page, main, m, m["hawthorn"], 5, 3.6, leaf, start=0.12, side_angle=55)
    twig_leaves(page, branch, m, m["hawthorn"], 3, 3.2, leaf, start=0.25, side_angle=60)
    # (two heads of its small flowers, at the ends)
    for cx, cy, n in ((W_ * 0.84, H_ * 0.08, 9), (W_ * 0.88, H_ * 0.39, 7)):
        for k in range(n):
            a = k * 360 / n + page.rng.uniform(-20, 20); rr = page.rng.uniform(0.6, 1.9)
            p = Vector((cx, cy)) + _dir(a) * rr
            stem(page, [(cx, cy), p], 0.03, 0.025, m["green stem"], 0.04)
            flower(page, p, 0.55, 5, "haw flower", "stamens", m, lift=0.07 + 0.02 * k, rot=page.rng.uniform(0, 72), stamens=8)
    for p, a in ((main[1], 30), (main[3], 120), (branch[2], 10)): strip(page, p, a, 1.6, m)

def daisy(page, m):
    W_, H_ = page.w_cm, page.h_cm; cx, cy = W_ * 0.5, H_ * 0.88
    for k, a in enumerate((140, 115, 165, 70, 40)):
        blade(page, (cx - 0.5, cy), a + page.rng.uniform(-6, 6), 3.4 + page.rng.uniform(-0.4, 0.4), serrate(spoon(1.3), 5, 0.06), m["daisy leaf"], 0.02 + 0.01 * k, bend=page.rng.uniform(-0.5, 0.5))
    top = (cx + 2.4, cy - 6.0)
    stem(page, [(cx - 0.4, cy), (cx + 1.0, cy - 3.0), top], 0.07, 0.06, m["green stem"], 0.03)
    flower(page, top, 1.05, 26, "daisy ray", "daisy disc", m, lift=0.06, petal_w=0.3, eye_r=0.32, jitter=4)
    strip(page, (cx + 0.6, cy - 2.2), 20, 1.4, m)

def dog_rose(page, m):
    W_, H_ = page.w_cm, page.h_cm
    main = [(W_ * 0.1, H_ * 0.55), (W_ * 0.28, H_ * 0.46), (W_ * 0.46, H_ * 0.36), (W_ * 0.58, H_ * 0.25), (W_ * 0.64, H_ * 0.18)]
    stem(page, main, 0.2, 0.12, m["green stem"])
    for k in range(7):
        t = 0.1 + k * 0.12; i = min(len(main) - 2, int(t * (len(main) - 1)))
        p = Vector(main[i]).lerp(Vector(main[i + 1]), t * (len(main) - 1) - i)
        thorn(page, p, 120 + (k % 2) * 140, 0.55, m["twig"], 0.05)
    leaflet = serrate(elliptic(1.5), 12, 0.12)
    for (p, a) in (((W_ * 0.28, H_ * 0.46), 95), ((W_ * 0.45, H_ * 0.37), -30), ((W_ * 0.36, H_ * 0.42), 150)):
        d = _dir(a); end = Vector(p) + d * 6.4
        stem(page, [p, end], 0.06, 0.04, m["green stem"], 0.03)
        for j in range(3):
            q = Vector(p) + d * (2.0 + j * 2.0)
            for e in (-1, 1):
                if j == 2 and e == 1: continue
                blade(page, q, a + e * 62, 2.5, leaflet, m["rose leaf"], 0.04, bend=0.3 * e)
        blade(page, end, a, 2.7, leaflet, m["rose leaf"], 0.04)
    # its flower open at the top, a bud below it
    stem(page, [main[-1], (W_ * 0.72, H_ * 0.12)], 0.08, 0.07, m["green stem"], 0.04)
    flower(page, (W_ * 0.74, H_ * 0.12), 2.9, 5, "rose petal", "stamens", m, lift=0.08, petal_w=0.95, eye_r=0.2, stamens=46, jitter=4)
    bud = (W_ * 0.86, H_ * 0.33)
    stem(page, [(W_ * 0.6, H_ * 0.23), (W_ * 0.74, H_ * 0.3), bud], 0.06, 0.05, m["green stem"], 0.03)
    blade(page, bud, -20, 1.4, lambda t: 0.45 * math.sin(math.pi * t) ** 0.6, m["rose petal"], 0.06)
    for p, a in ((main[1], 40), (main[3], 140)): strip(page, p, a, 1.6, m)

def oak(page, m):
    W_, H_ = page.w_cm, page.h_cm; base = Vector((W_ * 0.36, H_ * 0.86))
    stem(page, [base, base + _dir(20) * 1.2], 0.08, 0.07, m["twig"], 0.02)
    lobes_ = lobed(lambda t: 2.6 * math.sin(math.pi * t) ** 0.7 * (0.8 + 0.35 * t), 4.5, 0.45, 0.1)
    blade(page, base + _dir(20) * 1.1, 22, 8.4, lobes_, m["oak"], 0.04, bend=0.3)
    acorn = base + _dir(-20) * 1.0
    blade(page, acorn, -18, 1.5, lambda t: 0.62 * math.sin(math.pi * t) ** 0.5, m["twig"], 0.04, name="acorn")
    blade(page, acorn + _dir(-18) * 0.9, -18, 1.4, lambda t: 0.55 * math.sin(math.pi * t) ** 0.7, m["beech"], 0.06, name="acorn nut")
    strip(page, base + _dir(20) * 0.6, 110, 1.3, m)

def ivy(page, m):
    W_, H_ = page.w_cm, page.h_cm
    path = [(W_ * 0.08, H_ * 0.12), (W_ * 0.3, H_ * 0.18), (W_ * 0.5, H_ * 0.3), (W_ * 0.64, H_ * 0.42), (W_ * 0.86, H_ * 0.5)]
    stem(page, path, 0.16, 0.09, m["twig"])
    pts = [Vector(p) for p in path]
    for k, (t, e, R) in enumerate(((0.12, 1, 2.6), (0.28, -1, 3.1), (0.45, 1, 3.4), (0.6, -1, 2.4), (0.76, 1, 2.6), (0.92, 1, 2.0))):
        f = t * (len(pts) - 1); i = min(len(pts) - 2, int(f)); p = pts[i].lerp(pts[i + 1], f - i)
        d = (pts[i + 1] - pts[i]).normalized(); a = math.degrees(math.atan2(-d.y, d.x)) + e * 70
        stk = p + _dir(a) * 1.6
        stem(page, [p, stk], 0.06, 0.05, m["twig"], 0.03)
        palmate(page, stk + _dir(a) * R * 0.22, a + page.rng.uniform(-12, 12), R, m["ivy"], 0.04 + 0.005 * k)
        # (its rootlets, little brown hairs along the stem under the leaf)
        for j in range(3):
            q = p + d * (j - 1) * 0.3
            stem(page, [q, q + _dir(a + 180 + page.rng.uniform(-30, 30)) * 0.16], 0.008, 0.005, m["twig"], 0.01)
    for p, a in ((path[1], 60), (path[3], 140)): strip(page, p, a, 1.6, m)

def plantain(page, m):
    W_, H_ = page.w_cm, page.h_cm; base = Vector((W_ * 0.5, H_ * 0.9))
    for a, L_ in ((112, 7.0), (72, 6.4)):
        blade(page, base, a, L_, lance(1.3), m["plantain"], 0.02, bend=page.rng.uniform(-0.3, 0.3))
    top = base + Vector((-0.4, -6.8))
    stem(page, [base, base + Vector((0.2, -3.4)), top], 0.06, 0.05, m["green stem"], 0.03)
    blade(page, top, 96, 2.0, lambda t: 0.42 * math.sin(math.pi * t) ** 0.4, m["spike"], 0.05, name="spike")
    strip(page, base + Vector((0.15, -3.0)), 10, 1.3, m)

def blackthorn(page, m):
    W_, H_ = page.w_cm, page.h_cm
    main = [(W_ * 0.08, H_ * 0.5), (W_ * 0.3, H_ * 0.4), (W_ * 0.52, H_ * 0.28), (W_ * 0.72, H_ * 0.18), (W_ * 0.9, H_ * 0.1)]
    stem(page, main, 0.2, 0.09, m["dark twig"])
    pts = [Vector(p) for p in main]
    for k, t in enumerate((0.15, 0.32, 0.48, 0.63, 0.8)):
        f = t * (len(pts) - 1); i = min(len(pts) - 2, int(f)); p = pts[i].lerp(pts[i + 1], f - i)
        d = (pts[i + 1] - pts[i]).normalized(); a = math.degrees(math.atan2(-d.y, d.x)) + (60 if k % 2 else -60)
        spur = p + _dir(a) * 2.2
        stem(page, [p, spur], 0.08, 0.03, m["dark twig"], 0.02)
        thorn(page, spur, a, 0.7, m["dark twig"], 0.03)
        for j in range(3):
            q = p + _dir(a) * (0.5 + j * 0.6) + _dir(a + 90) * page.rng.uniform(-0.6, 0.6)
            flower(page, q, 0.62, 5, "sloe flower", "stamens", m, lift=0.06 + 0.015 * j, rot=page.rng.uniform(0, 72), stamens=10)
    twig_leaves(page, main, m, m["blackthorn leaf"], 3, 2.6, serrate(ovate(1.3, 0.6), 10, 0.1), start=0.55, side_angle=45)
    for p, a in ((main[1], 30), (main[3], 130)): strip(page, p, a, 1.6, m)

def beech(page, m):
    W_, H_ = page.w_cm, page.h_cm; base = Vector((W_ * 0.42, H_ * 0.89))
    stem(page, [base, base + Vector((1.6, -1.0)), base + Vector((3.6, -1.4))], 0.07, 0.05, m["twig"], 0.02)
    leaf = wavy(ovate(3.2, 0.6), 4, 0.05)
    blade(page, base + Vector((1.2, -0.8)), 105, 6.2, leaf, m["beech"], 0.04, bend=-0.2)
    blade(page, base + Vector((3.2, -1.3)), 40, 5.6, leaf, m["beech"], 0.04, bend=0.3)
    strip(page, base + Vector((2.2, -1.2)), 75, 1.3, m)

def privet(page, m):
    W_, H_ = page.w_cm, page.h_cm
    main = [(W_ * 0.5, H_ * 0.55), (W_ * 0.48, H_ * 0.42), (W_ * 0.5, H_ * 0.29), (W_ * 0.52, H_ * 0.2)]
    stem(page, main, 0.16, 0.1, m["twig"])
    twig_leaves(page, main, m, m["privet"], 4, 4.2, elliptic(1.5), start=0.08, side_angle=62, opposite=True, stalk=0.25)
    # (its panicle of small flowers at the top)
    top = Vector(main[-1])
    for k in range(34):
        a = 90 + page.rng.uniform(-70, 70); rr = page.rng.uniform(0.4, 3.4)
        p = top + _dir(a) * rr
        if k % 3 == 0: stem(page, [top, p], 0.03, 0.02, m["green stem"], 0.04)
        flower(page, p, 0.34, 4, "privet flower", "stamens", m, lift=0.07 + 0.01 * (k % 6), rot=page.rng.uniform(0, 90), eye_r=0.18, stamens=2)
    for p, a in ((main[0], 10), (main[2], 170)): strip(page, p, a, 1.5, m)

def primrose(page, m):
    W_, H_ = page.w_cm, page.h_cm; base = Vector((W_ * 0.48, H_ * 0.9))
    for k, a in enumerate((130, 95, 55)):
        blade(page, base, a + page.rng.uniform(-5, 5), 6.6 + page.rng.uniform(-0.6, 0.6), wavy(obovate(2.6), 7, 0.05), m["primrose leaf"], 0.02 + 0.01 * k, bend=page.rng.uniform(-0.3, 0.3))
    for k, (dx, dy) in enumerate(((-3.2, -5.6), (2.6, -6.2))):
        top = base + Vector((dx, dy))
        stem(page, [base, base + Vector((dx * 0.4, dy * 0.5)), top], 0.05, 0.045, m["green stem"], 0.06)
        flower(page, top, 1.4, 5, "primrose", "primrose eye", m, lift=0.09 + 0.03 * k, rot=page.rng.uniform(0, 72), petal_w=1.05, eye_r=0.24)
    strip(page, base + Vector((0.0, -2.0)), 0, 1.4, m)

PAGES = [(hawthorn, daisy), (dog_rose, oak), (ivy, plantain), (blackthorn, beech), (privet, primrose)]

def build(page, index, mats):
    big, small = PAGES[index]
    big(page, mats); small(page, mats)
    page.finish()
