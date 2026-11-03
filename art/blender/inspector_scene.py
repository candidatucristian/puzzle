# The Inspector's things, photographed from straight above under his lamp
# (inspector_desk_publish.mjs takes them in; the words and controls are laid
# over their paper by ui/styles/inspector-desk.css). The case file and the
# notebook alone, their own shadows kept on a transparent ground, to be laid
# over the game, bound in the same leather (--cover black|green|oxblood, black
# by default); the settings his whole desk, edge to edge of the screen.
#
#   casefile  the Ashcombe file, open: on its left board the minute sheet
#             (the index), a police photograph of the hall out from under it;
#             on its right the letters under a brass fastener and a clip, the
#             file's number on a card in a brass frame over them.
#   notebook  his spiral notebook open flat, notes on the left, sketches on the
#             right, a brass-framed plaque over its head for its tools.
#   settings  his form on his clipboard, on the old oak desk, his things about it.
#
# Beside each picture, <name>.json: for each sheet the page is laid on, its
# centre, its size (fractions of the picture) and its turn.
#
#   blender -b --factory-startup -P art/blender/inspector_scene.py -- [--only casefile,notebook,settings] [--samples 384] [--name <file>]
import bpy, bmesh, math, os, sys, json, random
from mathutils import Vector, Matrix, Euler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
import desk_kit as dk
from desk_kit import sheet, wire, rod, catcher, leaf, scanned, finish, placed

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, ".artifacts", "inspector-desk", "scene"); os.makedirs(OUT, exist_ok=True)
PRINT = lambda name: os.path.join(ROOT, ".artifacts", "inspector-desk", "prints", f"{name}.png")
ONLY = set(arg("--only", "casefile").split(","))
SAMPLES = int(arg("--samples", "384")); SCALE = float(arg("--scale", "1"))
dk.SCALE = SCALE; dk.OUT = OUT
VIEW_W, VIEW_H = 0.80, 0.45          # what the camera takes in, m (16:9)

# ── the desk, its light ────────────────────────────────────────────────────
def desk():
    wood = pbr("old oak", "wood_table_worn", size=0.95, tint=(0.8, 0.68, 0.58), bright=0.62, sat=0.72, rough=(0.45, 0.74), bump=0.7)
    box("desk", -1.2, 1.2, -1.2, 1.2, -0.04, 0.0, wood)

def lights(energy=1.0):
    # the lamp: up to the left, its shade a broad one — warm, and falling off
    # across the desk; the window's cool night on the right, faint; the room
    lamp("lamp", "AREA", (-0.42, 0.26, 0.48), aim=(0.02, -0.03, 0), energy=82 * energy, colour=(1.0, 0.76, 0.52), size=0.26)
    lamp("window", "AREA", (0.9, -0.2, 0.6), aim=(0.1, 0.0, 0), energy=14 * energy, colour=(0.7, 0.8, 1.0), size=1.0)
    lamp("room", "AREA", (0.0, 0.0, 2.2), aim=(0, 0, 0), energy=9 * energy, colour=(1.0, 0.86, 0.72), size=3.0)

def prop(mid, at, rot=0.0, width=None, height=None, only=None, tilt=(0.0, 0.0)):
    """a model, laid down at `at`: resting on what is under it (z = at.z),
    however it was tilted to lie"""
    try:
        root = import_model(mid, width=width, height=height, at=at, rot=rot, only=only, tilt=tilt)
    except Exception as e:
        print("PROP MISSING", mid, e); return None
    bpy.context.view_layer.update()
    meshes = [o for o in root.children_recursive if o.type == "MESH"]
    pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    root.location += Vector((at[0] - (lo.x + hi.x) / 2, at[1] - (lo.y + hi.y) / 2, at[2] - lo.z))
    return root

def child(o, parent):
    o.parent = parent; return o

def paperclip(name, cx, cy, cz, steel, turn=0.0):
    pts = [(-0.004, -0.034), (-0.004, -0.004), (0, 0.002), (0.004, -0.004), (0.004, -0.028), (0.0008, -0.031), (-0.0018, -0.028), (-0.0018, -0.009)]
    c, s = math.cos(turn), math.sin(turn)
    return wire(name, [(cx + x * c - y * s, cy + x * s + y * c, cz) for x, y in pts], 0.00062, steel)

def metal_light(scene, names, energy=40.0):
    """the metal's own light: a broad glow overhead that only the metal sees —
    its flat faces would mirror black without it, and the leather would grey
    over under it"""
    metals = bpy.data.collections.new("metals")
    for o in scene.objects:
        if o.type in ("MESH", "CURVE") and any(m and m.name.split(".")[0] in names for m in o.data.materials):
            metals.objects.link(o)
    shine = lamp("shine", "AREA", (0.05, 0.08, 2.2), aim=(0, 0, 0), energy=energy, colour=(1.0, 0.9, 0.78), size=2.0)
    shine.visible_camera = False; shine.light_linking.receiver_collection = metals
    return shine

def plate2d(name, outer, holes=(), thick=0.0007, round_=0.00025, mat=None):
    """a flat piece of sheet metal: its outline (and any holes) in its own
    plane, its edges rolled"""
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "2D"; cu.fill_mode = "BOTH"
    cu.extrude = max(thick / 2 - round_, 0.00001); cu.bevel_depth = round_; cu.bevel_resolution = 3
    for loop in (outer, *holes):
        sp = cu.splines.new("POLY"); sp.points.add(len(loop) - 1); sp.use_cyclic_u = True
        for p, (x, y) in zip(sp.points, loop): p.co = (x, y, 0, 1)
    o = link(bpy.data.objects.new(name, cu)); cu.materials.append(mat)
    return o

def circle_pts(cx, cy, r, n=48, a0=0.0, a1=math.tau):
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / n), cy + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n if a1 - a0 >= math.tau - 1e-6 else n + 1)]

def book_light(scene):
    """the light the notebook, the clipboard and the file are all taken in:
    the desk's, the room's glow from straight above kept low (or the leather
    greys over under it), the lamp a little less orange (so the cover keeps
    its own colour)"""
    lights(0.8)
    bpy.data.lights["room"].energy *= float(arg("--room", "0.3"))
    bpy.data.lights["lamp"].color = (1.0, 0.84, 0.66); bpy.data.lights["lamp"].energy *= float(arg("--lamp", "1.08"))

# ── the notebook's own pieces: its leather, its rounded boards, his pencil ──
# the covers it can be bound in: the scan, how it is coloured, what its rims
# rub through to, the ribbon in it
COVERS = {
    "black":   dict(colour=(0.0062, 0.0062, 0.0064), rub=(0.03, 0.027, 0.025), ribbon=(0.2, 0.018, 0.016)),
    "green":   dict(colour=(0.004, 0.017, 0.0095), rub=(0.026, 0.044, 0.03), ribbon=(0.2, 0.018, 0.016)),
    "oxblood": dict(colour=(0.034, 0.0035, 0.0072), rub=(0.09, 0.022, 0.03), ribbon=(0.012, 0.011, 0.011)),
}

def leather(name, ref, colour, tid="Leather037", size=0.08, rough=(0.42, 0.7), bump=1.1, rub=(0.1, 0.08, 0.06), **_):
    """the cover's leather: a fine pebbled grain (a scan's relief, its pores
    sunk darker), the grain running on unbroken from piece to piece (all laid
    on by `ref`'s coordinates); mottled a little; its rims and the shoulders
    of its fold rubbed paler and smoother where the hand goes"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; Lk = nt.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); tc.object = ref
    mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / size,) * 3
    Lk(tc.outputs["Object"], mp.inputs["Vector"])
    def img(kind, colour_):
        t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(tex_path(tid, kind), check_existing=True)
        t.image.colorspace_settings.name = "sRGB" if colour_ else "Non-Color"
        t.projection = "BOX"; t.projection_blend = 0.45
        Lk(mp.outputs["Vector"], t.inputs["Vector"]); return t
    def scalar(v):
        c = N.new("ShaderNodeCombineXYZ"); [Lk(v, c.inputs[i]) for i in range(3)]; return c.outputs["Vector"]
    base = N.new("ShaderNodeRGB"); base.outputs[0].default_value = (*colour, 1)
    # the scan's own light and dark, about its mean
    bw = N.new("ShaderNodeRGBToBW"); Lk(img("Diffuse", True).outputs["Color"], bw.inputs["Color"])
    tone = N.new("ShaderNodeMapRange"); tone.inputs["From Min"].default_value = 0.1; tone.inputs["From Max"].default_value = 0.155
    tone.inputs["To Min"].default_value = 0.82; tone.inputs["To Max"].default_value = 1.18
    Lk(bw.outputs["Val"], tone.inputs["Value"])
    out = dk_mix(N, Lk, "MULTIPLY", 1.0, base.outputs[0], scalar(tone.outputs["Result"]))
    # the pores and creases between the pebbles, sunk darker
    hgt = img("Disp", False)
    pore = N.new("ShaderNodeMapRange"); pore.inputs["From Min"].default_value = 0.28; pore.inputs["From Max"].default_value = 0.62
    pore.inputs["To Min"].default_value = 0.55; pore.inputs["To Max"].default_value = 1.1
    Lk(hgt.outputs["Color"], pore.inputs["Value"])
    out = dk_mix(N, Lk, "MULTIPLY", 1.0, out, scalar(pore.outputs["Result"]))
    # its patina: broad, soft, a few per cent either way
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 26; nz.inputs["Detail"].default_value = 5
    Lk(tc.outputs["Object"], nz.inputs["Vector"])
    pr = N.new("ShaderNodeMapRange"); pr.inputs["To Min"].default_value = 0.85; pr.inputs["To Max"].default_value = 1.15
    Lk(nz.outputs["Fac"], pr.inputs["Value"])
    out = dk_mix(N, Lk, "MULTIPLY", 1.0, out, scalar(pr.outputs["Result"]))
    # the rubbing: where the leather turns away from the flat (its rolled
    # rims, the shoulders of the fold), broken up, the pebbles' tops first
    geo = N.new("ShaderNodeNewGeometry"); sz = N.new("ShaderNodeSeparateXYZ"); Lk(geo.outputs["True Normal"], sz.inputs["Vector"])
    em = N.new("ShaderNodeMapRange"); em.inputs["From Min"].default_value = 0.985; em.inputs["From Max"].default_value = 0.55
    Lk(sz.outputs["Z"], em.inputs["Value"])
    bz = N.new("ShaderNodeTexNoise"); bz.inputs["Scale"].default_value = 180; bz.inputs["Detail"].default_value = 6
    Lk(tc.outputs["Object"], bz.inputs["Vector"])
    br = N.new("ShaderNodeMapRange"); br.inputs["From Min"].default_value = 0.38; br.inputs["From Max"].default_value = 0.62
    Lk(bz.outputs["Fac"], br.inputs["Value"])
    tops = N.new("ShaderNodeMapRange"); tops.inputs["From Min"].default_value = 0.35; tops.inputs["From Max"].default_value = 0.6
    Lk(hgt.outputs["Color"], tops.inputs["Value"])
    worn = N.new("ShaderNodeMath"); worn.operation = "MULTIPLY"; worn.use_clamp = True
    Lk(em.outputs["Result"], worn.inputs[0]); Lk(br.outputs["Result"], worn.inputs[1])
    worn2 = N.new("ShaderNodeMath"); worn2.operation = "MULTIPLY"; worn2.use_clamp = True
    Lk(worn.outputs["Value"], worn2.inputs[0]); Lk(tops.outputs["Result"], worn2.inputs[1])
    rubc = N.new("ShaderNodeRGB"); rubc.outputs[0].default_value = (*rub, 1)
    out = dk_mix(N, Lk, "MIX", worn2.outputs["Value"], out, rubc.outputs[0])
    Lk(out, b.inputs["Base Color"])
    rr = N.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = rough[0]; rr.inputs["To Max"].default_value = rough[1]
    Lk(img("Rough", False).outputs["Color"], rr.inputs["Value"])
    polish = N.new("ShaderNodeMath"); polish.operation = "MULTIPLY_ADD"; polish.inputs[1].default_value = -0.14
    Lk(worn.outputs["Value"], polish.inputs[0]); Lk(rr.outputs["Result"], polish.inputs[2]); Lk(polish.outputs["Value"], b.inputs["Roughness"])
    nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = bump
    Lk(img("nor_gl", False).outputs["Color"], nm.inputs["Color"]); Lk(nm.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Specular IOR Level"].default_value = 0.34
    return m

def dk_mix(N, Lk, blend, factor, a, b_):
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = blend
    if isinstance(factor, float): mix.inputs["Factor"].default_value = factor
    else: Lk(factor, mix.inputs["Factor"])
    Lk(a, mix.inputs[6]); Lk(b_, mix.inputs[7]); return mix.outputs[2]

def slab(name, x0, x1, y0, y1, z0, z1, mat, corners=(0.0, 0.0, 0.0, 0.0), rim=0.001):
    """a board of leather: its corners (bottom left, bottom right, top right,
    top left) rounded off as far as each is given, every edge of it rolled"""
    bm = bmesh.new(); pts = []
    for (cx, cy, a0), r in zip(((x0, y0, 180), (x1, y0, 270), (x1, y1, 0), (x0, y1, 90)), corners):
        if r <= 0: pts.append((cx, cy)); continue
        ox, oy = cx + (r if cx == x0 else -r), cy + (r if cy == y0 else -r)
        pts += [(ox + r * math.cos(math.radians(a0 + 90 * j / 12)), oy + r * math.sin(math.radians(a0 + 90 * j / 12))) for j in range(13)]
    f = bm.faces.new([bm.verts.new((x, y, z0)) for x, y in pts])
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, verts=[v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)], vec=(0, 0, z1 - z0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    bv = o.modifiers.new("rim", "BEVEL"); bv.width = rim; bv.segments = 5; bv.limit_method = "ANGLE"; bv.angle_limit = math.radians(40)
    bv.harden_normals = True
    return o

def turned(name, profile, mat):
    """a turned thing along +x: `profile` [(x, radius)], spun about the x axis"""
    bm = bmesh.new(); vs = [bm.verts.new((x, 0.0, r)) for x, r in profile]
    for a, b_ in zip(vs, vs[1:]): bm.edges.new((a, b_))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], axis=(1, 0, 0), cent=(0, 0, 0), steps=72, angle=math.tau)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.000005)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    return o

def fine_pencil(foot, ang, lacquer=(0.012, 0.05, 0.026)):
    """his pencil, lying from `foot` (its point) at `ang` across the table:
    six-sided, lacquered, its maker's name in gold leaf on its upper face;
    sharpened by a knife to a cone of cedar, the paint scalloped where the cone
    cuts each face, the lead black and glinting; a brass ferrule ribbed twice,
    and the rubber worn round and grey at its end"""
    R, rc = 0.0038, 0.00045                       # across its corners / 2; how round the corners are
    FLAT = R * math.cos(math.pi / 6)
    FER = 0.00395                                 # the ferrule, the widest of it: what it rests on
    root = link(bpy.data.objects.new("pencil", None))
    root.location = (foot[0], foot[1], FER + 0.00002); root.rotation_euler = (0, 0, ang)
    paint = plain("pencil lacquer", lacquer, rough=0.34, spec=0.5)
    pn = paint.node_tree; pb = pn.nodes["Principled BSDF"]
    pz = pn.nodes.new("ShaderNodeTexNoise"); pz.inputs["Scale"].default_value = 2600; pz.inputs["Detail"].default_value = 3
    ptc = pn.nodes.new("ShaderNodeTexCoord"); pn.links.new(ptc.outputs["Object"], pz.inputs["Vector"])
    pbp = pn.nodes.new("ShaderNodeBump"); pbp.inputs["Strength"].default_value = 0.04; pbp.inputs["Distance"].default_value = 0.00005
    pn.links.new(pz.outputs["Fac"], pbp.inputs["Height"]); pn.links.new(pbp.outputs["Normal"], pb.inputs["Normal"])
    # the wood and the lead: cedar, its grain down its length; the lead its
    # core, a millimetre across
    point = bpy.data.materials.new("pencil point"); point.use_nodes = True
    nt = point.node_tree; N = nt.nodes; Lk = nt.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    off = N.new("ShaderNodeVectorMath"); off.operation = "MULTIPLY"; off.inputs[1].default_value = (0, 1, 1)
    Lk(tc.outputs["Object"], off.inputs[0])
    rad = N.new("ShaderNodeVectorMath"); rad.operation = "LENGTH"; Lk(off.outputs["Vector"], rad.inputs[0])
    core = N.new("ShaderNodeMapRange"); core.inputs["From Min"].default_value = 0.00102; core.inputs["From Max"].default_value = 0.00094
    Lk(rad.outputs["Value"], core.inputs["Value"])
    log = N.new("ShaderNodeVectorMath"); log.operation = "ADD"; log.inputs[1].default_value = (0, 0.021, 0.004)
    Lk(tc.outputs["Object"], log.inputs[0])
    wv = N.new("ShaderNodeTexWave"); wv.wave_type = "RINGS"; wv.rings_direction = "X"
    wv.inputs["Scale"].default_value = 700; wv.inputs["Distortion"].default_value = 3; wv.inputs["Detail"].default_value = 3
    Lk(log.outputs["Vector"], wv.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.42, 0.22, 0.11, 1); ramp.color_ramp.elements[1].color = (0.72, 0.5, 0.31, 1)
    ramp.color_ramp.elements[0].position = 0.25; ramp.color_ramp.elements[1].position = 0.75
    Lk(wv.outputs["Fac"], ramp.inputs["Fac"])
    lead = N.new("ShaderNodeRGB"); lead.outputs[0].default_value = (0.03, 0.03, 0.034, 1)
    Lk(dk_mix(N, Lk, "MIX", core.outputs["Result"], ramp.outputs["Color"], lead.outputs[0]), b.inputs["Base Color"])
    rmx = N.new("ShaderNodeMapRange"); rmx.inputs["To Min"].default_value = 0.78; rmx.inputs["To Max"].default_value = 0.3
    Lk(core.outputs["Result"], rmx.inputs["Value"]); Lk(rmx.outputs["Result"], b.inputs["Roughness"])
    mt = N.new("ShaderNodeMath"); mt.operation = "MULTIPLY"; mt.inputs[1].default_value = 0.45
    Lk(core.outputs["Result"], mt.inputs[0]); Lk(mt.outputs["Value"], b.inputs["Metallic"])
    fz = N.new("ShaderNodeTexNoise"); fz.inputs["Scale"].default_value = 1800; fz.inputs["Detail"].default_value = 4
    fm = N.new("ShaderNodeMapping"); fm.inputs["Scale"].default_value = (0.08, 1, 1); Lk(tc.outputs["Object"], fm.inputs["Vector"]); Lk(fm.outputs["Vector"], fz.inputs["Vector"])
    fb = N.new("ShaderNodeBump"); fb.inputs["Strength"].default_value = 0.12; fb.inputs["Distance"].default_value = 0.00005
    Lk(fz.outputs["Fac"], fb.inputs["Height"]); Lk(fb.outputs["Normal"], b.inputs["Normal"])
    # the body: six faces, a flat one up, its corners rounded; from just
    # behind its point to under the ferrule
    sec = []
    for k in range(6):
        a = math.radians(60 * k); dc = R - rc / math.sin(math.radians(60))
        cy, cz = dc * math.cos(a), dc * math.sin(a)
        sec += [(cy + rc * math.cos(a + math.radians(-30 + 20 * j)), cz + rc * math.sin(a + math.radians(-30 + 20 * j))) for j in range(4)]
    bm = bmesh.new()
    ring = lambda x: [bm.verts.new((x, y, z)) for y, z in sec]
    r0, r1 = ring(-0.001), ring(0.1515); n = len(sec)
    for i in range(n):
        f = bm.faces.new((r0[i], r0[(i + 1) % n], r1[(i + 1) % n], r1[i])); f.smooth = True
    bm.faces.new(r1); bm.faces.new(list(reversed(r0)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # (sharp where each flat face meets its rounded corner, and round its ends)
    for i in range(n):
        if i % 4 in (0, 3): bm.edges.get((r0[i], r1[i])).smooth = False
        for r_ in (r0, r1): bm.edges.get((r_[i], r_[(i + 1) % n])).smooth = False
    me = bpy.data.meshes.new("pencil body"); bm.to_mesh(me); bm.free()
    body = link(bpy.data.objects.new("pencil body", me)); me.materials.append(paint); body.parent = root
    # the knife's cone: its point just blunt, opening at ten degrees and a half
    tip, k_ = 0.00024, (R - 0.00024) / 0.0195
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=160, radius1=tip, radius2=tip + 0.2 * k_, depth=0.2)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, "Y"))
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0.1, 0, 0))
    for f in bm.faces: f.smooth = True
    me = bpy.data.meshes.new("knife"); bm.to_mesh(me); bm.free()
    knife = link(bpy.data.objects.new("knife", me)); me.materials.append(point); knife.parent = root
    knife.hide_render = True; knife.hide_viewport = True
    bo = body.modifiers.new("cut", "BOOLEAN"); bo.operation = "INTERSECT"; bo.solver = "EXACT"; bo.object = knife
    try: bo.material_mode = "TRANSFER"
    except Exception: pass
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    cut = bpy.data.meshes.new_from_object(body.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    body.modifiers.clear(); body.data = cut
    bm = bmesh.new(); bm.from_mesh(cut)
    for e in bm.edges:   # (sharp where the cone cuts the paint)
        if len(e.link_faces) == 2 and e.link_faces[0].material_index != e.link_faces[1].material_index: e.smooth = False
    bm.to_mesh(cut); bm.free()
    print("PENCIL materials", [m.name for m in cut.materials], "faces", len(cut.polygons))
    # its maker's name, gold leaf pressed into the upper face
    foil = aged_metal("gold leaf", (1.0, 0.8, 0.44), (0.5, 0.37, 0.17), rough=(0.5, 0.62), tarnish=0.2)
    cu = bpy.data.curves.new("pencil words", "FONT")
    cu.body = "CASTLEMOOR  ·  ENGLAND  ·  No. 2   HB"
    try: cu.font = bpy.data.fonts.load("C:/Windows/Fonts/timesbd.ttf", check_existing=True)
    except Exception as e: print("FONT", e)
    cu.size = 0.0027; cu.align_x = "CENTER"; cu.align_y = "CENTER"; cu.extrude = 0.000012; cu.space_character = 1.06
    words = link(bpy.data.objects.new("pencil words", cu)); cu.materials.append(foil)
    words.parent = root; words.location = (0.088, 0.0, FLAT + 0.000004)
    # the ferrule: brass, rolled at both its ends, ribbed in two bands
    prof = [(0.1503, 0.0033), (0.1503, 0.00384), (0.15045, 0.00395)]
    for x0 in (0.1531, 0.1596):
        for g in range(3):
            gx = x0 + g * 0.00062
            prof += [(gx, 0.00395), (gx + 0.00016, 0.00378), (gx + 0.00031, 0.00378), (gx + 0.00047, 0.00395)]
    prof += [(0.16205, 0.00395), (0.1622, 0.00384), (0.1622, 0.0034)]
    fer = turned("ferrule", prof, aged_metal("ferrule brass", (0.72, 0.54, 0.28), (0.22, 0.15, 0.07), rough=(0.34, 0.58), tarnish=0.55)); fer.parent = root
    # the rubber: worn to a dome, grey with use at its end
    rub = plain("rubber", (0.52, 0.13, 0.1), rough=0.9, spec=0.25)
    rn = rub.node_tree; rbn = rn.nodes["Principled BSDF"]
    rtc = rn.nodes.new("ShaderNodeTexCoord"); sx = rn.nodes.new("ShaderNodeSeparateXYZ"); rn.links.new(rtc.outputs["Object"], sx.inputs["Vector"])
    gr = rn.nodes.new("ShaderNodeMapRange"); gr.inputs["From Min"].default_value = 0.1700; gr.inputs["From Max"].default_value = 0.17146
    gr.inputs["To Max"].default_value = 0.7; rn.links.new(sx.outputs["X"], gr.inputs["Value"])
    grey = rn.nodes.new("ShaderNodeMix"); grey.data_type = "RGBA"; grey.inputs[6].default_value = (0.52, 0.13, 0.1, 1); grey.inputs[7].default_value = (0.16, 0.085, 0.075, 1)
    rn.links.new(gr.outputs["Result"], grey.inputs["Factor"]); rn.links.new(grey.outputs[2], rbn.inputs["Base Color"])
    rz = rn.nodes.new("ShaderNodeTexNoise"); rz.inputs["Scale"].default_value = 3000; rn.links.new(rtc.outputs["Object"], rz.inputs["Vector"])
    rbp = rn.nodes.new("ShaderNodeBump"); rbp.inputs["Strength"].default_value = 0.25; rbp.inputs["Distance"].default_value = 0.00004
    rn.links.new(rz.outputs["Fac"], rbp.inputs["Height"]); rn.links.new(rbp.outputs["Normal"], rbn.inputs["Normal"])
    er = turned("rubber", [(0.1620, 0.0), (0.1620, 0.00352), (0.1682, 0.00352), (0.16955, 0.00341), (0.17035, 0.00315),
                           (0.17095, 0.00262), (0.17128, 0.00185), (0.17142, 0.001), (0.17146, 0.0)], rub); er.parent = root
    return root

# ── the notebook: his spiral notebook open flat, two leaves — his notes on the
#    left, his sketches on the right — in the same black leather as the file;
#    over its head a little black plaque framed in brass for its tools. Alone,
#    its own shadow kept, laid over the game ───────────────────────────────
def build_notebook():
    scene = fresh(); catcher(2.0, 0.0)
    PW, PH = 0.150, 0.205                 # each leaf (inspector_prints.mjs: spiral-notes, spiral-sketch)
    IN = 0.0055                           # each leaf's inner edge, off the middle
    PITCH, FIRST, HOLE_IN = 0.0084667, 0.006, 0.0055      # the punching (as printed)
    CM, CT = 0.007, 0.0025                # the covers: how far past the leaves, how thick
    book = link(bpy.data.objects.new("the book", None))
    look = COVERS[arg("--cover", "black")]
    leather_m = leather("cover leather", book, size=float(arg("--grain", "0.08")), **look)
    # the covers, open: each under its leaf, rounded at its outer corners, and
    # the strip of the back between them
    XO = IN + PW + CM
    child(slab("left cover", -XO, -0.002, -PH / 2 - CM, PH / 2 + CM, 0.0, CT, leather_m, corners=(0.006, 0.0, 0.0, 0.006), rim=0.0011), book)
    child(slab("right cover", 0.002, XO, -PH / 2 - CM, PH / 2 + CM, 0.0, CT, leather_m, corners=(0.0, 0.006, 0.006, 0.0), rim=0.0011), book)
    child(slab("back strip", -0.0035, 0.0035, -PH / 2 - CM + 0.0015, PH / 2 + CM - 0.0015, 0.0, 0.0016, leather_m, rim=0.0005), book)
    # the leaves under each open one, each a hair out of true
    LEAVES = 7
    for side in (-1, 1):
        for k in range(LEAVES, 0, -1):
            m = scanned(f"leaf {side} {k}", "Paper001", size=0.2, tint=(0.9 - 0.01 * k, 0.8 - 0.01 * k, 0.62 - 0.012 * k), bright=0.84, sat=0.7)
            o = child(sheet(f"leaf {side} {k}", PW, PH, m, thick=0.00018), book)
            o.location = (side * (IN + PW / 2) + side * 0.00025 * k, -0.0004 * k, CT + 0.0002 * (LEAVES + 1 - k))
            o.rotation_euler = (0, 0, math.radians(0.1 * (k % 3 - 1)))
    # the two open, rising a little to the coil
    ZP = CT + 0.0002 * (LEAVES + 1) + 0.0002
    def rise(inner_u):
        return lambda u, v: 0.0011 * max(0.0, 1 - abs(u - inner_u) / 0.06) ** 2
    notes = scanned("notes leaf", "Paper001", size=0.2, tint=(0.93, 0.8, 0.6), bright=0.8, sat=0.7, image=PRINT("spiral-notes"), image_mix=0.95)
    left = child(sheet("notes leaf", PW, PH, notes, nx=48, ny=64, lift=rise(1.0), thick=0.00018), book); left.location = (-(IN + PW / 2), 0, ZP)
    sk = scanned("sketch leaf", "Paper001", size=0.2, tint=(0.93, 0.8, 0.6), bright=0.8, sat=0.7, image=PRINT("spiral-sketch"), image_mix=0.95)
    right = child(sheet("sketch leaf", PW, PH, sk, nx=48, ny=64, lift=rise(0.0), thick=0.00018), book); right.location = (IN + PW / 2, 0, ZP)
    # the coil: a turn of wire through each pair of holes, up over the middle
    steel = aged_metal("coil steel", (0.5, 0.5, 0.5), (0.16, 0.15, 0.14), rough=(0.3, 0.48), scale=60.0, tarnish=0.3)
    XH = IN + HOLE_IN                     # the holes' centres, off the middle
    ZC = ZP - 0.0022                      # the coil's axis, a little under the leaves
    R = math.hypot(XH, ZP - ZC)
    lo = math.asin((ZP - 0.0016 - ZC) / R)          # (from just under the leaf to just under the other)
    for k in range(24):
        yk = PH / 2 - FIRST - k * PITCH
        pts = []
        for j in range(17):
            t = lo + (math.pi - 2 * lo) * j / 16
            pts.append((R * math.cos(t), yk - 0.0011 + 0.0022 * j / 16, ZC + R * math.sin(t)))
        child(wire(f"coil {k}", list(reversed(pts)), 0.00068, steel), book)
    # the plaque over its head: black leather in a thin brass frame, a rivet at
    # each corner (the game sets its four tools on it)
    BW_, BH_ = 0.124, 0.027
    by = PH / 2 + CM + 0.004 + BH_ / 2
    brass = aged_metal("book brass", (0.8, 0.57, 0.26), (0.3, 0.19, 0.08), rough=(0.3, 0.46), scale=70.0, tarnish=0.22)
    [setattr(n.inputs["Strength"], "default_value", 0.03) for n in brass.node_tree.nodes if n.type == "BUMP"]
    child(slab("plaque", -BW_ / 2, BW_ / 2, by - BH_ / 2, by + BH_ / 2, 0.0, 0.003, leather_m, corners=(0.004,) * 4, rim=0.0009), book)
    def rrect(w, h, r, n=8):
        pts = []
        for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
            pts += [(cx + r * math.cos(math.radians(a0 + 90 * j / n)), cy + r * math.sin(math.radians(a0 + 90 * j / n))) for j in range(n + 1)]
        return pts
    frame = child(plate2d("plaque frame", rrect(BW_ - 0.0022, BH_ - 0.0022, 0.003), holes=[rrect(BW_ - 0.0056, BH_ - 0.0056, 0.0018)], thick=0.0006, round_=0.00024, mat=brass), book)
    frame.location = (0, by, 0.0033)
    for sx in (-1, 1):
        for sy in (-1, 1):
            child(sphere("plaque rivet", (sx * (BW_ / 2 - 0.0019), by + sy * (BH_ / 2 - 0.0019), 0.0036), 0.0011, brass, squash=(1, 1, 0.5)), book)
    # where the game lays its pages: the notes' and the sketches' leaves (clear
    # of the holes), the plaque's face, and the edge the saved pages' tabs
    # come out from
    def mark(name, x, y, z):
        e = child(link(bpy.data.objects.new(name, None)), book); e.location = (x, y, z); return e
    AW, AH = PW - 0.0215, PH - 0.016
    a_left = mark("notes area", -(IN + PW / 2) - 0.00275, 0.0, ZP + 0.0002)
    a_right = mark("sketch area", (IN + PW / 2) + 0.00275, 0.0, ZP + 0.0002)
    a_bar = mark("plaque face", 0.0, by, 0.0034)
    TW = 0.024
    a_tabs = mark("tab edge", XO + TW / 2, 0.0, 0.0)
    book_light(scene)
    metal_light(scene, ("coil steel", "book brass"), energy=float(arg("--shine", "40")))
    cycles(scene, SAMPLES, 10, 10, glare=False, transparent=True)
    W = 2 * (XO + TW + 0.004)
    top, bottom = by + BH_ / 2 + 0.006, -PH / 2 - CM - 0.012
    H = top - bottom
    cam = dk.top_camera(scene, 0.0, (top + bottom) / 2, W, H, int(arg("--book-px", "2000")))
    finish(scene, SAMPLES, exposure=float(arg("--book-exposure", "-1.85")))
    bpy.context.view_layer.update()
    pages = {"left": placed(scene, cam, a_left, AW, AH), "right": placed(scene, cam, a_right, AW, AH),
             "bar": placed(scene, cam, a_bar, BW_ - 0.0062, BH_ - 0.0062), "tabs": placed(scene, cam, a_tabs, TW, PH - 0.012)}
    name = arg("--name", "notebook")
    render(scene, os.path.join(OUT, f"{name}.png"))
    with open(os.path.join(OUT, f"{name}.json"), "w") as f:
        json.dump({"width": scene.render.resolution_x, "height": scene.render.resolution_y, "pages": pages}, f, indent=1)

# ── the case file: the Ashcombe file, open — its two boards in the same black
#    leather as his notebook and his clipboard, alone, its own shadow kept,
#    laid over the game ────────────────────────────────────────────────────
def build_casefile():
    scene = fresh(); catcher(2.0, 0.0)
    BW, BH, BT, GAP = 0.236, 0.322, 0.0035, 0.0075     # each board; half the hinge between them
    file = link(bpy.data.objects.new("the file", None)); file.rotation_euler = (0, 0, math.radians(-0.5))
    look = COVERS[arg("--cover", "black")]
    leather_m = leather("file leather", file, size=float(arg("--grain", "0.08")), **look)
    LX, RX = -GAP - BW / 2, GAP + BW / 2               # the boards' middles
    child(slab("left board", -GAP - BW, -GAP, -BH / 2, BH / 2, 0.0, BT, leather_m, corners=(0.008, 0.0, 0.0, 0.008), rim=0.0013), file)
    child(slab("right board", GAP, GAP + BW, -BH / 2, BH / 2, 0.0, BT, leather_m, corners=(0.0, 0.008, 0.008, 0.0), rim=0.0013), file)
    child(slab("hinge", -GAP - 0.001, GAP + 0.001, -BH / 2, BH / 2, 0.0, 0.0018, leather_m, rim=0.0005), file)
    steel = aged_metal("clip steel", (0.62, 0.62, 0.6), (0.22, 0.2, 0.18), rough=(0.28, 0.5), tarnish=0.3)
    brass = aged_metal("file brass", (0.8, 0.57, 0.26), (0.3, 0.19, 0.08), rough=(0.3, 0.46), scale=70.0, tarnish=0.22)
    [setattr(n.inputs["Strength"], "default_value", 0.03) for n in brass.node_tree.nodes if n.type == "BUMP"]
    # ── the left board: the minute sheet (the index), a police photograph of
    #    the hall out from under its head, a clip on it
    MW, MH = 0.204, 0.284
    mx, my = LX - 0.0008, -0.009
    under = child(sheet("minute under", MW, MH, scanned("minute under", "Paper002", size=0.3, tint=(0.95, 0.88, 0.74), bright=1.0, sat=0.6), thick=0.00025), file)
    under.location = (mx + 0.0016, my - 0.0024, BT + 0.0002); under.rotation_euler = (0, 0, math.radians(0.9))
    photo = child(sheet("photograph", 0.112, 0.0782, leaf("photo paper", (0.82, 0.8, 0.76), image=PRINT("photo"), foxing=0.02, rough=0.62), thick=0.0003), file)
    photo.location = (mx + 0.04, my + MH / 2 + 0.011, BT + 0.0005); photo.rotation_euler = (0, 0, math.radians(-6.5))
    minute = scanned("minute sheet", "Paper002", size=0.3, tint=(0.98, 0.9, 0.76), bright=0.95, sat=0.6, rough=(0.8, 0.96), bump=0.35, image=PRINT("minute-sheet"))
    ms = child(sheet("minute sheet", MW, MH, minute, nx=30, ny=40, lift=lambda u, v: 0.0016 * (1 - v) ** 3 * u, thick=0.00025), file)
    ms.location = (mx, my, BT + 0.0009); ms.rotation_euler = (0, 0, math.radians(-0.7))
    child(paperclip("paperclip", mx - 0.054, my + MH / 2 + 0.006, BT + 0.0021, steel, math.radians(-2)), file)
    # ── the right board: the letters, the top one under a brass fastener and
    #    a clip; over them the file's number on a card in a brass frame
    LW, LH = 0.206, 0.29
    base = Vector((RX + 0.0008, -0.0095, 0))
    tints = [(0.88, 0.76, 0.58), (0.93, 0.83, 0.66), (0.86, 0.75, 0.58), (0.95, 0.86, 0.7)]
    stack = []
    for k, (dx, dy, rz) in enumerate([(0.0026, -0.0034, 1.2), (-0.0018, -0.0013, -0.8), (0.0009, 0.0011, 0.4), (0.0, 0.0, -0.15)]):
        m = scanned(f"letter {k}", "Paper001", size=0.24, tint=tints[k], bright=0.84, sat=0.7, rough=(0.78, 0.95), bump=0.4)
        o = child(sheet(f"letter {k}", LW, LH, m, nx=24, ny=32, lift=(lambda u, v: 0.0014 * (u ** 4) * (1 - v)) if k == 3 else None, thick=0.00022), file)
        o.location = base + Vector((dx, dy, BT + 0.0002 + 0.0003 * k)); o.rotation_euler = (0, 0, math.radians(rz)); stack.append(o)
    top = stack[-1]
    fx, fy = top.location.x - LW / 2 + 0.013, top.location.y + LH / 2 - 0.015
    child(sphere("paper fastener", (fx, fy, BT + 0.0028), 0.0047, brass, squash=(1, 1, 0.32)), file)
    child(paperclip("paperclip 2", top.location.x + 0.046, top.location.y + LH / 2 + 0.006, BT + 0.0024, steel, math.radians(1.5)), file)
    # the frame: its window over the typed card, a rivet at each end
    hx, hy = RX, BH / 2 - 0.0118
    card = child(sheet("file label", 0.0686, 0.017, leaf("label card", (0.84, 0.79, 0.68), image=PRINT("file-label"), foxing=0.03), thick=0.00012), file)
    card.location = (hx, hy, BT + 0.0001)
    def rrect(w, h, r, n=8):
        pts = []
        for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
            pts += [(cx + r * math.cos(math.radians(a0 + 90 * j / n)), cy + r * math.sin(math.radians(a0 + 90 * j / n))) for j in range(n + 1)]
        return pts
    frame = child(plate2d("label frame", rrect(0.0775, 0.0215, 0.0032), holes=[rrect(0.0632, 0.0138, 0.0012)], thick=0.0007, round_=0.00028, mat=brass), file)
    frame.location = (hx, hy, BT + 0.00055)
    for sx in (-1, 1):
        child(sphere("frame rivet", (hx + sx * 0.0352, hy, BT + 0.0009), 0.0016, brass, squash=(1, 1, 0.45)), file)
    book_light(scene)
    metal_light(scene, ("clip steel", "file brass"), energy=float(arg("--shine", "40")))
    cycles(scene, SAMPLES, 10, 10, glare=False, transparent=True)
    W, H = 0.52, 0.38
    cam = dk.top_camera(scene, 0.0, 0.014, W, H, int(arg("--file-px", "2400")))
    finish(scene, SAMPLES, exposure=float(arg("--exposure", "-1.85")))
    bpy.context.view_layer.update()
    pages = {"index": placed(scene, cam, ms, MW, MH), "reader": placed(scene, cam, top, LW, LH)}
    name = arg("--name", "casefile")
    render(scene, os.path.join(OUT, f"{name}.png"))
    with open(os.path.join(OUT, f"{name}.json"), "w") as f:
        json.dump({"width": scene.render.resolution_x, "height": scene.render.resolution_y, "pages": pages}, f, indent=1)

# ── settings: his form on his clipboard, on the desk ───────────────────────
def build_settings():
    scene = fresh(); desk()
    board = prop("clipboard", (-0.045, -0.004, 0.0), rot=math.radians(1.6), width=0.34)
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in board.children_recursive if o.type == "MESH" for c in o.bound_box]
    FW, FH = 0.205, 0.272
    form = scanned("form paper", "Paper001", size=0.24, tint=(0.92, 0.86, 0.72), bright=0.8, sat=0.7, image=PRINT("settings-form"), image_mix=0.95)
    # (on the board, its head under the clip)
    sheet_z = float(arg("--form-z", "0.0072"))
    under = sheet("form under", FW, FH, scanned("form under", "Paper001", size=0.24, tint=(0.88, 0.82, 0.68), bright=0.82, sat=0.7), thick=0.0002)
    under.location = (-0.0415, 0.004, sheet_z - 0.0003); under.rotation_euler = (0, 0, math.radians(2.6))
    fm = sheet("form", FW, FH, form, nx=24, ny=32, lift=lambda u, v: 0.0012 * (1 - v) ** 3 * (1 - u), thick=0.0002)
    fm.location = (-0.045, 0.0, sheet_z); fm.rotation_euler = (0, 0, math.radians(1.2))
    area = link(bpy.data.objects.new("form writing", None)); area.parent = fm; area.location = (0, -0.02, 0.0002)
    print("CLIPBOARD top", round(max(p.z for p in pts), 4), "y", round(min(p.y for p in pts), 4), round(max(p.y for p in pts), 4))
    # about it, his things: tea, the stapler, his pen, his watch, a photograph
    prop("tea_set_01", (-0.33, 0.13, 0.0), rot=-0.4, width=0.142, only="tea_set_01_saucer_circular_03")
    prop("tea_set_01", (-0.33, 0.13, 0.006), rot=-1.6, width=0.098, only="tea_set_01_cup_small_01")
    tea = plain("cold tea", (0.055, 0.022, 0.007), rough=0.06, spec=0.5)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.031, depth=0.001, location=(-0.33, 0.13, 0.04)); t = bpy.context.active_object; t.data.materials.append(tea)
    prop("Camera_01", (0.3, 0.12, 0.0), rot=-0.6, width=0.15)
    prop("vintage_pocket_watch", (-0.31, -0.13, 0.0), rot=0.9, width=0.052, tilt=(-math.pi / 2, 0.0))
    black = plain("pen lacquer", (0.012, 0.012, 0.014), rough=0.3, spec=0.45)
    gold = aged_metal("pen gold", (0.75, 0.56, 0.28), (0.18, 0.12, 0.05), rough=(0.22, 0.45), tarnish=0.4)
    a, b = Vector((0.12, -0.17, 0.0066)), Vector((0.165, -0.04, 0.0066))
    rod("pen barrel", a, b, 0.0066, black, verts=32); rod("pen cap band", a + (b - a) * 0.6, a + (b - a) * 0.63, 0.0069, gold, verts=32)
    rod("pen clip", a + (b - a) * 0.72 + Vector((0, 0, 0.0062)), b - (b - a) * 0.03 + Vector((0, 0, 0.0062)), 0.0012, gold, verts=8)
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.0055, radius2=0.0012, depth=0.016, location=a - (b - a).normalized() * 0.008)
    nib = bpy.context.active_object; nib.rotation_euler = (a - b).to_track_quat("Z", "Y").to_euler(); nib.data.materials.append(gold)
    p3 = sheet("photograph", 0.112, 0.0782, leaf("photo paper", (0.82, 0.8, 0.76), image=PRINT("photo"), foxing=0.02, rough=0.62), thick=0.0003)
    p3.location = (0.29, -0.13, 0.0004); p3.rotation_euler = (0, 0, math.radians(-11))
    lights()
    cycles(scene, SAMPLES, 10, 10, glare=False)
    cam = dk.top_camera(scene, 0, 0, VIEW_W, VIEW_H, 2880)
    finish(scene, SAMPLES, exposure=float(arg("--set-exposure", "-1.8")))
    bpy.context.view_layer.update()
    pages = {"form": placed(scene, cam, area, FW, FH - 0.04)}
    render(scene, os.path.join(OUT, "settings.png"))
    with open(os.path.join(OUT, "settings.json"), "w") as f:
        json.dump({"width": scene.render.resolution_x, "height": scene.render.resolution_y, "pages": pages}, f, indent=1)

if "casefile" in ONLY: build_casefile(); print("SCENE_DONE casefile")
if "notebook" in ONLY: build_notebook(); print("SCENE_DONE notebook")
if "settings" in ONLY: build_settings(); print("SCENE_DONE settings")
print("INSPECTOR_SCENE_DONE")
