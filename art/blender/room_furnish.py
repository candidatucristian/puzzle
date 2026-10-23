# What the rooms off the halls are furnished from: books and the cases they
# stand in, curtains, tables and desks, lamp shades, rugs, and the garden at
# night beyond a window. In the room's centimetres (room_common.py); each
# takes the materials it is made of, and most are built about the origin, to
# be stood anywhere with room_common.assembled.

import bpy, bmesh, math, os
from mathutils import Vector
from kit import *
from room_common import *

# ── books ──────────────────────────────────────────────────────────────────
def cover_materials():
    """bookbinders' cloth and leather, in the old colours: the grain of a scan
    of leather under each"""
    tints = [(0.62, 0.16, 0.12), (0.16, 0.34, 0.2), (0.14, 0.18, 0.42), (0.5, 0.3, 0.14), (0.12, 0.11, 0.1), (0.7, 0.52, 0.26)]
    return [scan(f"cover {i}", "fabric_leather_02", size=0.22, tint=t, bright=0.55, sat=0.0, rough=(0.45, 0.8), bump=0.5, vary=0.25) for i, t in enumerate(tints)]

def bound(m, grain="fabric_leather_02", size=0.22):
    """a picture printed on a binding (a spine's lettering): the binding's own
    grain worked into it, light and dark and in its bump"""
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    pic = b.inputs["Base Color"].links[0].from_socket
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / size,) * 3
    Lk(tc.outputs["Object"], mp.inputs["Vector"])
    g = N.new("ShaderNodeTexImage"); g.image = bpy.data.images.load(f"{ASSETS}/textures/{grain}/Diffuse.jpg", check_existing=True); g.projection = "BOX"; g.projection_blend = 0.2
    Lk(mp.outputs["Vector"], g.inputs["Vector"])
    bw = N.new("ShaderNodeRGBToBW"); Lk(g.outputs["Color"], bw.inputs["Color"])
    lift = N.new("ShaderNodeMapRange"); lift.inputs["To Min"].default_value = 0.55; lift.inputs["To Max"].default_value = 1.25; Lk(bw.outputs["Val"], lift.inputs["Value"])
    mul = N.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
    Lk(pic, mul.inputs[6]); Lk(lift.outputs["Result"], mul.inputs[7]); Lk(mul.outputs[2], b.inputs["Base Color"])
    nt = N.new("ShaderNodeTexImage"); nt.image = bpy.data.images.load(f"{ASSETS}/textures/{grain}/nor_gl.jpg", check_existing=True); nt.image.colorspace_settings.name = "Non-Color"; nt.projection = "BOX"; nt.projection_blend = 0.2
    Lk(mp.outputs["Vector"], nt.inputs["Vector"])
    nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 0.8; Lk(nt.outputs["Color"], nm.inputs["Color"])
    nrm = b.inputs["Normal"]
    if nrm.is_linked and nrm.links[0].from_node.type == "BUMP": Lk(nm.outputs["Normal"], nrm.links[0].from_node.inputs["Normal"])
    else: Lk(nm.outputs["Normal"], nrm)
    b.inputs["Roughness"].default_value = 0.6
    m["detailed"] = True
    return m

def book(rng, x_back, d0, y, w, h, depth, spines, covers, pages, lean=0.0, side=-1):
    """a book standing on a shelf against a side wall, its spine to the room
    (one of the 32 in the spines' atlas)"""
    me = bpy.data.meshes.new("book"); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    uv = bm.loops.layers.uv.new()
    cell = rng.randrange(32); u0, v0 = (cell % 8) / 8, 1 - (cell // 8 + 1) / 4
    for v in bm.verts: v.co = Vector((v.co.x * M(depth), v.co.y * M(w), v.co.z * M(h)))
    for f in bm.faces:
        n = f.normal
        if n.x * -side > 0.9:
            f.material_index = 1
            for lp in f.loops:
                co = lp.vert.co
                # (left to right as one in the room sees it)
                lp[uv].uv = (u0 + (0.5 - side * co.y / M(w)) / 8, v0 + (0.5 + co.z / M(h)) / 4)
        elif abs(n.z) > 0.9: f.material_index = 2
        else: f.material_index = 0
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("book", me))
    o.data.materials.append(rng.choice(covers)); o.data.materials.append(spines); o.data.materials.append(pages)
    o.location = P(x_back - side * depth / 2, y + h / 2, d0 + w / 2)
    o.rotation_euler = (lean, 0, 0)
    return o

def bookcase(rng, wall, side, d0, d1, top, wood, wood_x, spines, covers, pages, depth=34, levels=(9, 46, 82, 118, 154, 190, 226), bays=3,
             marked=None, gaps=True, glass=None, out=6.0):
    """A bookcase built against a wall (the wall at x = `wall`, the case standing
    out from it toward -`side`): uprights, shelves, a cornice and a
    plinth, and the shelves packed close with old books — here and there one
    leaning, a gap with a jar of seeds, a few lying flat, a little plant.
    `marked(row, n)`: the books that stand `out` from the rest, a paper slip
    in each (row 0 the top shelf)."""
    X = wall
    face = X - side * depth
    xa, xb = sorted((X, face))
    box_cm("bookcase back", *sorted((X, X - side * 1.5)), 0, top, d0, d1, wood)
    uprights = [d0 + (d1 - d0) * k / bays for k in range(bays + 1)]
    for d in uprights:
        box_cm("upright", xa, xb, 0, top, d - 1.6, d + 1.6, wood, 0.4)
    box_cm("cornice", *sorted((X, face - side * 4)), top, top + 8, d0 - 4, d1 + 4, wood_x, 1.0)
    box_cm("plinth", *sorted((X, face - side * 1)), 0, levels[0], d0, d1, wood_x, 0.5)
    for y in levels[1:-1]:
        box_cm("shelf", xa, xb, y - 2.2, y, d0, d1, wood_x, 0.4)
    slip = plain("paper slip", (0.72, 0.68, 0.56), rough=0.85)
    rows = len(levels) - 1
    for i, y in enumerate(levels[:-1]):
        row = rows - 1 - i
        shelf_top = levels[i + 1] - 2.2
        n = 0
        for a, b in zip(uprights, uprights[1:]):
            d = a + 2.2
            while d < b - 4:
                if gaps and rng.random() < 0.06 and d < b - 22 and not (marked and any(marked(row, k) for k in range(n, n + 6))):
                    kind = rng.random()
                    if kind < 0.4 and glass:
                        lathe("jar", [(0, 0), (0.04, 0), (0.042, 0.004), (0.042, 0.11), (0.03, 0.12), (0.03, 0.13), (0, 0.13)], glass, at=tuple(P(X - side * 16, y, d + 6)), steps=24)
                        cylinder("seeds", M(X - side * 16), M(d + 6), M(y + 0.4), M(y + 7), M(3.9), plain("seeds", (0.2, 0.12, 0.05), rough=0.9))
                    elif kind < 0.75:
                        for k in range(3):
                            o = book(rng, X - side * 6, d + 1, y, 3.1, 24, 18 + rng.uniform(-2, 2), spines, covers, pages, side=side)
                            o.rotation_euler = (math.pi / 2, 0, rng.uniform(-0.1, 0.1)); o.location = P(X - side * 18, y + 1.6 + k * 3.2, d + 10)
                    else:
                        import_model("potted_plant_01", height=M(min(28, shelf_top - y - 2)), at=tuple(P(X - side * 16, y, d + 9)), rot=rng.uniform(0, 6))
                    d += 20; continue
                w = rng.uniform(2.2, 5.5); h = min(shelf_top - y - 1.5, rng.uniform(19, 31)); deep = rng.uniform(15, 24)
                stands_out = bool(marked and marked(row, n))
                lean = 0 if stands_out else rng.choice((0, 0, 0, 0, rng.uniform(-0.12, 0.12)))
                o = book(rng, X - side * (1.6 + (out if stands_out else 0)), d, y, w, h, deep, spines, covers, pages, lean, side=side)
                if stands_out:
                    s_ = box_cm("slip", *sorted((X - side * (1.6 + out + deep * 0.3), X - side * (1.6 + out + deep * 0.6))), y + h - 1, y + h + 4.5, d + w / 2 - 0.08, d + w / 2 + 0.08, slip, keep=False)
                d += w + rng.uniform(0.05, 0.5); n += 1
    return dict(levels=levels, uprights=uprights, face=face)

# ── curtains ───────────────────────────────────────────────────────────────
def curtain(rng, x0, x1, d, top, mat, bottom=1.0, folds=5, deep=5.5):
    """a curtain hung straight down across a back wall, in uneven folds,
    gathered a little on the floor"""
    me = bpy.data.meshes.new("curtain"); bm = bmesh.new(); nx, ny = folds * 8, 24
    phase = [rng.uniform(-0.6, 0.6) for _ in range(folds + 2)]
    amp = [deep * rng.uniform(0.6, 1.4) for _ in range(folds + 2)]
    def fold(i, j):
        t = i / nx * folds; k = int(t)
        a = amp[k] + (amp[k + 1] - amp[k]) * (t - k)
        low = 1 - j / ny
        return math.sin(t * 2 * math.pi + phase[k] * low) * a * (0.65 + 0.5 * low)
    grid = [[bm.verts.new((M(x0 + (x1 - x0) * i / nx), M(d + fold(i, j) - deep), M(bottom + (top - bottom) * j / ny - (6 * (1 - j / ny) ** 6 if j < 3 else 0)))) for i in range(nx + 1)] for j in range(ny + 1)]
    for j in range(ny):
        for i in range(nx): bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("curtain", me)); o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    so = o.modifiers.new("thick", "SOLIDIFY"); so.thickness = M(0.6)
    return arch(o)

def curtain_pole(x0, x1, y, d, brass):
    pole = cylinder("pole", 0, 0, M(x0), M(x1), M(1.6), brass, verts=24); pole.rotation_euler = (0, math.pi / 2, 0); pole.location = P(0, y, d); arch(pole)
    for x in (x0 - 2, x1 + 2): arch(sphere("finial", tuple(P(x, y, d)), M(3), brass))

# ── tables and desks ───────────────────────────────────────────────────────
def turned_table(t, wood, legs_in=4):
    """a table on four turned legs, a top with a moulded edge, an apron"""
    x0, x1, d0, d1, h = t["x0"], t["x1"], t["d0"], t["d1"], t["h"]
    box_cm("top", x0 - 2, x1 + 2, h - 3, h, d0 - 2, d1 + 2, wood, 0.8)
    box_cm("apron", x0 + 2, x1 - 2, h - 13, h - 3, d0 + 2, d1 - 2, wood, 0.4)
    for x in (x0 + legs_in, x1 - legs_in):
        for d in (d0 + legs_in, d1 - legs_in):
            lathe("leg", [(0, 0), (0.022, 0), (0.026, 0.03), (0.018, 0.08), (0.016, 0.3), (0.022, 0.42), (0.016, 0.5), (0.022, 0.56), (0.022, M(h - 3)), (0, M(h - 3))], wood, at=tuple(P(x, 0, d)), steps=24)

def pedestal_desk(k, wood, leather, brass):
    """a writing desk on two pedestals of drawers, a leather top, a knee drawer"""
    box_cm("desk top", k["x0"] - 2, k["x1"] + 2, k["h"] - 3, k["h"], k["d0"] - 3, k["d1"] + 1, wood, 0.8)
    box_cm("desk leather", k["x0"] + 8, k["x1"] - 8, k["h"] - 0.05, k["h"] + 0.05, k["d0"] + 6, k["d1"] - 8, leather)
    for (a, b) in ((k["x0"], k["x0"] + 38), (k["x1"] - 38, k["x1"])):
        box_cm("pedestal", a, b, 4, k["h"] - 3, k["d0"], k["d1"], wood, 0.6)
        for j in range(3):
            y0 = 8 + j * (k["h"] - 14) / 3
            box_cm("drawer", a + 2, b - 2, y0 + 1, y0 + (k["h"] - 14) / 3 - 1, k["d0"] - 1.2, k["d0"], wood, 0.5)
            pull = lathe("pull", [(0, 0), (0.008, 0), (0.008, 0.006), (0.004, 0.012), (0, 0.014)], brass, at=tuple(P((a + b) / 2, y0 + (k["h"] - 14) / 6, k["d0"] - 1.2)), steps=16)
            pull.rotation_euler = (math.pi / 2, 0, 0)
        box_cm("plinth", a - 0.5, b + 0.5, 0, 4, k["d0"] - 0.5, k["d1"] + 0.5, wood, 0.4)
    box_cm("knee drawer", k["x0"] + 40, k["x1"] - 40, k["h"] - 12, k["h"] - 4, k["d0"] - 1, k["d0"] + 2, wood, 0.5)
    box_cm("modesty", k["x0"] + 38, k["x1"] - 38, 10, k["h"] - 12, k["d1"] - 3, k["d1"] - 1, wood)

# ── lamp shades ────────────────────────────────────────────────────────────
def shade_material(name, colour, glow=(1.0, 0.72, 0.4), strength=3.0, through=0.5):
    """cloth or paper a bulb shines through: lit, it glows (its emission is
    what the room's light turns up)"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    n = m.node_tree.nodes; l = m.node_tree.links.new; b = n["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*colour, 1); b.inputs["Roughness"].default_value = 0.8
    b.inputs["Emission Color"].default_value = (*glow, 1); b.inputs["Emission Strength"].default_value = strength
    tr = n.new("ShaderNodeBsdfTranslucent"); tr.inputs["Color"].default_value = (*glow, 1)
    mx = n.new("ShaderNodeMixShader"); mx.inputs["Fac"].default_value = through
    l(b.outputs["BSDF"], mx.inputs[1]); l(tr.outputs["BSDF"], mx.inputs[2]); l(mx.outputs["Shader"], n["Material Output"].inputs["Surface"])
    return m

def pleated_shade(x, d, y0, y1, r0, r1, mat, pleats=20, depth=0.035):
    """a lamp shade, wider at its foot, pleated round"""
    me = bpy.data.meshes.new("shade"); bm = bmesh.new(); steps = 64; rings = []
    for i in range(14):
        t = i / 13; r = M(r0 + (r1 - r0) * t); z = M(y0 + (y1 - y0) * t)
        rings.append([bm.verts.new((M(x) + math.cos(a) * r * (1 + depth * math.cos(a * pleats)), M(d) + math.sin(a) * r * (1 + depth * math.cos(a * pleats)), z)) for a in [2 * math.pi * k / steps for k in range(steps)]])
    for ra, rb in zip(rings, rings[1:]):
        for k in range(steps): bm.faces.new((ra[k], ra[(k + 1) % steps], rb[(k + 1) % steps], rb[k]))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("shade", me)); o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    return o

# ── rugs ───────────────────────────────────────────────────────────────────
def rug_material(name, image, tint=(1, 1, 1), sat=1.0, value=0.42):
    """a rug's pattern woven in old wool, dark with years"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    n = m.node_tree.nodes; l = m.node_tree.links.new; b = n["Principled BSDF"]
    uv = n.new("ShaderNodeTexCoord")
    pat = n.new("ShaderNodeTexImage"); pat.image = bpy.data.images.load(image, check_existing=True); l(uv.outputs["UV"], pat.inputs["Vector"])
    mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (4, 2.3, 1); l(uv.outputs["UV"], mp.inputs["Vector"])
    wool = n.new("ShaderNodeTexImage"); wool.image = bpy.data.images.load(f"{ASSETS}/textures/dirty_carpet/Diffuse.jpg", check_existing=True); l(mp.outputs["Vector"], wool.inputs["Vector"])
    pile = n.new("ShaderNodeTexImage"); pile.image = bpy.data.images.load(f"{ASSETS}/textures/dirty_carpet/Displacement.jpg", check_existing=True); pile.image.colorspace_settings.name = "Non-Color"; l(mp.outputs["Vector"], pile.inputs["Vector"])
    hs = n.new("ShaderNodeHueSaturation"); hs.inputs["Saturation"].default_value = sat; hs.inputs["Value"].default_value = value; l(pat.outputs["Color"], hs.inputs["Color"])
    tn = n.new("ShaderNodeMix"); tn.data_type = "RGBA"; tn.blend_type = "MULTIPLY"; tn.inputs["Factor"].default_value = 1.0; tn.inputs[7].default_value = (*tint, 1); l(hs.outputs["Color"], tn.inputs[6])
    wn = n.new("ShaderNodeHueSaturation"); wn.inputs["Saturation"].default_value = 0.0; wn.inputs["Value"].default_value = 2.6; l(wool.outputs["Color"], wn.inputs["Color"])
    mul = n.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 0.85
    l(tn.outputs[2], mul.inputs[6]); l(wn.outputs["Color"], mul.inputs[7]); l(mul.outputs[2], b.inputs["Base Color"])
    bp = n.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.6; bp.inputs["Distance"].default_value = 0.002; l(pile.outputs["Color"], bp.inputs["Height"]); l(bp.outputs["Normal"], b.inputs["Normal"])
    # (wool's sheen, low, and the colour of the wool: at the low angle a rug is
    # seen at, a white sheen would wash it out)
    b.inputs["Roughness"].default_value = 0.97; b.inputs["Sheen Weight"].default_value = 0.15; b.inputs["Sheen Roughness"].default_value = 0.6
    l(tn.outputs[2], b.inputs["Sheen Tint"])
    return m

def rug(x0, x1, d0, d1, mat):
    return card("rug", [P(x0, 0.3, d0), P(x1, 0.3, d0), P(x1, 0.3, d1), P(x0, 0.3, d1)], mat)

# ── the garden at night, beyond a window ─────────────────────────────────
def garden(moon_at, trees, lawn, sky_at, sky_size=45):
    """trees and shrubs on a wet lawn (`lawn`: x0, x1, d0, d1, its height),
    the night sky, the moon in it; `trees`: (model, x, d, height m, turn)"""
    night_sky(sky_at, sky_size, moon_at)
    x0, x1, d0, d1, y = lawn
    for (mid, x, d, h, rot) in trees:
        import_model(mid, height=h, at=tuple(P(x, y, d)), rot=rot)
    box_cm("lawn", x0, x1, y - 5, y, d0, d1, scan("lawn", "leafy_grass", size=1.5, bright=0.035, sat=0.8, rough=(0.5, 0.8), coat=0.0), keep=False)

# ── windows, lanterns, roofs ───────────────────────────────────────────────
def sash_window_back(wall, x, hw, sill, top, D1, reveal, frame, glass, plaster, sill_mat, bars=(0.5,), wall_mat_cut=None):
    """a sash window in a back wall (at d D1): the opening cut through `wall`,
    reveals, a sill, two sashes (the upper outside the lower), glazing bars;
    returns its panes (Blender points) for the rain"""
    x0, x1 = x - hw, x + hw
    # (old thin glass, reflecting the lit room only a little against the night)
    glass = bpy.data.materials.get("window glass") or plain("window glass", (0.96, 0.97, 0.96), rough=0.0, transmission=1.0, ior=1.12)
    boolean_cut(wall, box("cut", M(x0), M(x1), M(D1 - 10), M(D1 + reveal + 30), M(sill), M(top), plaster))
    box_cm("reveal", x0 - 3, x0, sill, top, D1, D1 + reveal, plaster)
    box_cm("reveal", x1, x1 + 3, sill, top, D1, D1 + reveal, plaster)
    box_cm("reveal head", x0 - 3, x1 + 3, top, top + 3, D1, D1 + reveal, plaster)
    box_cm("sill", x0 - 8, x1 + 8, sill - 4, sill, D1 - 8, D1 + reveal - 6, sill_mat, 0.8)
    mid = (sill + top) / 2; panes = []
    for (y0, y1, dd) in ((sill + 1, mid + 2, D1 + reveal - 8), (mid - 2, top - 1, D1 + reveal - 13)):
        box_cm("sash", x0 + 1, x0 + 6, y0, y1, dd - 2.5, dd + 2.5, frame, 0.5); box_cm("sash", x1 - 6, x1 - 1, y0, y1, dd - 2.5, dd + 2.5, frame, 0.5)
        box_cm("sash", x0 + 1, x1 - 1, y0, y0 + 6, dd - 2.5, dd + 2.5, frame, 0.5); box_cm("sash", x0 + 1, x1 - 1, y1 - 6, y1, dd - 2.5, dd + 2.5, frame, 0.5)
        for f in bars:
            bx = x0 + (x1 - x0) * f
            box_cm("glazing bar", bx - 1.1, bx + 1.1, y0 + 6, y1 - 6, dd - 1.5, dd + 1.5, frame, 0.3)
        box_cm("glass", x0 + 5, x1 - 5, y0 + 5, y1 - 5, dd - 0.3, dd + 0.3, glass)
        panes.append([P(px, py, dd) for px, py in ((x0 + 5, y0 + 5), (x1 - 5, y0 + 5), (x1 - 5, y1 - 5), (x0 + 5, y1 - 5))])
    return panes

def oil_lantern(x, y, d, tin, glass_mat, energy=12.0, hanging=False):
    """a storm lantern standing (or hung) at x, y, d: its tin tank and cap, the
    glass globe in a wire guard, its bail, the flame; returns (lamp, flame
    material, where its flame is)"""
    lathe("lantern tank", [(0, 0), (0.065, 0), (0.07, 0.01), (0.07, 0.04), (0.045, 0.06), (0.03, 0.065), (0, 0.065)], tin, at=tuple(P(x, y, d)), steps=40)
    lathe("lantern globe", [(0.0, 0.0), (0.028, 0.0), (0.05, 0.03), (0.056, 0.07), (0.05, 0.11), (0.032, 0.135), (0.031, 0.14), (0.0, 0.14)], glass_mat, at=tuple(P(x, y + 6.5, d)), steps=40)
    lathe("lantern cap", [(0, 0), (0.042, 0), (0.05, 0.015), (0.035, 0.04), (0.02, 0.06), (0.025, 0.07), (0, 0.075)], tin, at=tuple(P(x, y + 20, d)), steps=40)
    for k in range(4):
        a = k / 4 * math.tau + 0.4
        rod("guard", P(x + math.cos(a) * 5.8, y + 6.5, d + math.sin(a) * 5.8), P(x + math.cos(a) * 4.0, y + 20.5, d + math.sin(a) * 4.0), M(0.25), tin, verts=6)
    tube("bail", [(-0.045, 0.21), (-0.035, 0.31 if hanging else 0.27), (0.035, 0.31 if hanging else 0.27), (0.045, 0.21)], 0.002, tin, at=tuple(P(x, y, d)), rot=0.6)
    flame = plain("lantern flame", (1.0, 0.6, 0.2), emit=(1.0, 0.55, 0.18), strength=40)
    sphere("lantern flame", tuple(P(x, y + 11.5, d)), M(0.9), flame, squash=(0.6, 0.6, 1.8))
    l = lamp("lantern", "POINT", tuple(P(x, y + 12, d)), energy=energy, colour=(1.0, 0.52, 0.22), size=0.02)
    return l, flame, P(x, y + 12, d)

def pitched_roof(x0, x1, d0, d1, eaves, ridge, boards, rafter_mat, every=60):
    """an attic's roof: boards laid on rafters pitched from the eaves (at x0
    and x1, `eaves` up) to the ridge over the middle, purlins along it, a
    ridge beam, collar ties"""
    xm = (x0 + x1) / 2; run = (x1 - x0) / 2; rise = ridge - eaves
    pitch = math.atan2(rise, run); length = math.hypot(run, rise)
    for side in (-1, 1):
        # (the roof's boards: one slab each side, under the rafters)
        sl = box("roof boards", M(-length / 2 - 4), M(length / 2 + 4), M(d0 - 30), M(d1 + 30), M(0), M(3), boards)
        # (rotated about the room's d: the left pitch rising toward the ridge, the right falling from it)
        tilt = -pitch if side < 0 else pitch
        sl.rotation_euler = (0, tilt, 0)
        sl.location = P(xm + side * run / 2, eaves + rise / 2, 0)
        arch(sl)
        for d in range(int(d0), int(d1) + 1, every):
            r = box("rafter", M(-length / 2), M(length / 2), M(d - 4), M(d + 4), M(-12), M(0), rafter_mat)
            r.rotation_euler = (0, tilt, 0)
            r.location = P(xm + side * run / 2, eaves + rise / 2, 0)
            arch(r)
        for t in (0.35, 0.7):
            px = xm + side * run * (1 - t); py = eaves + rise * t
            pu = box("purlin", M(-6), M(6), M(d0 - 30), M(d1 + 30), M(-10), M(0), rafter_mat)
            pu.rotation_euler = (0, tilt, 0); pu.location = P(px, py - 12, 0); arch(pu)
    box_cm("ridge beam", xm - 6, xm + 6, ridge - 22, ridge - 4, d0 - 30, d1 + 30, rafter_mat, 1.0)
    for d in range(int(d0) + every // 2, int(d1), every * 2):
        box_cm("collar tie", xm - run * 0.42, xm + run * 0.42, eaves + rise * 0.62 - 14, eaves + rise * 0.62 - 2, d - 5, d + 5, rafter_mat, 1.0)
    return pitch
