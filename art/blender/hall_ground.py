# The ground-floor Botany hall of Ashcombe Manor, built in three dimensions and
# rendered with Cycles through the exact camera of levels/hall/hall.js
# (layoutHall). Refactored into modular builders with full PBR normal maps
# (`nor_gl`), zero artificial plastic/lacquer gloss (`finish_hall`), dark
# coffered timber ceiling, bespoke Victorian damask & herbarium plates, and
# the Chemistry hall's lighting balance.
#
#   node art/blender/clock_dial.mjs
#   blender -b --factory-startup -P art/blender/hall_ground.py -- [--samples 384] [--width 2560] [--only plate,doors,front,gate,pendulum,gate-motion]

import bpy, bmesh, math, os, sys, random, json
from mathutils import Vector, Matrix, Quaternion
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import *
from botany_staircase import build_staircase, render_gate_motion, block, bar, mesh

OUT = os.path.abspath(arg("--output", os.path.join(ROOT, ".artifacts/hall")))
DRAWN = os.path.join(ROOT, ".artifacts/hall")
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "384"))
WIDTH = int(arg("--width", "2560"))
ONLY = set(arg("--only", "plate,doors,front,gate,pendulum,gate-motion").split(","))
RNG = random.Random(1912)

# ── Hall layout constants (synchronised with src/levels/hall/hall.js) ────────
DOORS = [1.32, 2.2, 3.1]
SCONCES = [2.01, 2.9]
ROMAN = ["I", "II", "III", "IV", "V", "VI"]
OPEN = 0.5 * WALL
HEAD = EYE + 0.52 * HR * K
DADO, RAIL = 0.98, 2.86
RUN_HALF = WALL * 0.34 * 0.86
SKY_X, SKY_Y0, SKY_Y1 = 1.35, 3.2, 7.4

scene, HEIGHT = stage(WIDTH)
GATE, PENDULUM, LIT = [], [], []


# ── Materials (full PBR normal maps, matte aged finishes, zero plastic coat) ─
def build_materials():
    oak = scan("panelling", "dark_wood", size=1.15, tint=(0.76, 0.58, 0.42), bright=0.46,
               rough=(0.52, 0.78), bump=0.42, coat=0.0, upright=True, vary=0.08,
               dirt=0.22, grime=0.14, edges=0.025)
    oak_x = scan("panelling across", "dark_wood", size=1.15, tint=(0.76, 0.58, 0.42), bright=0.44,
                 rough=(0.52, 0.78), bump=0.42, coat=0.0, vary=0.08,
                 dirt=0.22, grime=0.14, edges=0.025)
    walnut = scan("walnut door", "rosewood_veneer1", size=0.75, tint=(0.68, 0.5, 0.38), bright=0.48, sat=0.82,
                  rough=(0.48, 0.74), bump=0.38, coat=0.0, vary=0.08,
                  dirt=0.24, grime=0.14, edges=0.03)
    walnut_x = scan("walnut door across", "rosewood_veneer1", size=0.75, tint=(0.68, 0.5, 0.38), bright=0.46, sat=0.82,
                    rough=(0.48, 0.74), bump=0.38, coat=0.0, upright=True, vary=0.08,
                    dirt=0.24, grime=0.14, edges=0.03)
    boards = scan("floor boards", "wood_floor_worn", size=1.8, tint=(0.74, 0.58, 0.44), bright=0.46,
                  rough=(0.54, 0.82), bump=0.48, coat=0.0, vary=0.12,
                  dirt=0.26, grime=0.16, streaks=0.1)
    ceiling = scan("ceiling boards", "dark_wooden_planks", size=2.1, tint=(0.76, 0.64, 0.52), bright=0.42,
                   rough=(0.58, 0.86), bump=0.45, coat=0.0, vary=0.1,
                   dirt=0.25, grime=0.15)
    plaster = scan("aged cornice plaster", "plastered_wall_04", size=1.8, tint=(0.62, 0.6, 0.55), bright=0.46, sat=0.25,
                   rough=(0.78, 0.94), bump=0.5, coat=0.0, dirt=0.28, grime=0.18, streaks=0.12)
    stone = scan("carved limestone", "old_sandstone_02", size=1.1, tint=(0.56, 0.53, 0.48), bright=0.45, sat=0.32,
                 rough=(0.68, 0.9), bump=0.58, coat=0.0, vary=0.08, dirt=0.3, grime=0.2)
    soil = scan("botanical bed earth", "dry_decay_leaves", size=0.65, tint=(0.45, 0.38, 0.3), bright=0.34, sat=0.7,
                rough=(0.82, 0.96), bump=0.65, coat=0.0, dirt=0.3)
    moss = scan("moss basket lining", "mossy_stone_wall", size=0.5, tint=(0.42, 0.48, 0.34), bright=0.36, sat=0.75,
                rough=(0.84, 0.96), bump=0.6, coat=0.0)
    terracotta = scan("aged terracotta", "old_sandstone_02", size=0.6, tint=(0.68, 0.34, 0.2), bright=0.48, sat=0.85,
                      rough=(0.72, 0.92), bump=0.45, coat=0.0, vary=0.08, dirt=0.28, grime=0.18)
    leather = scan("trunk leather", "brown_leather", size=0.55, tint=(0.62, 0.4, 0.26), bright=0.44,
                   rough=(0.55, 0.82), bump=0.5, coat=0.0, dirt=0.25, grime=0.16, edges=0.04)
    brass = aged_metal("brass", (0.5, 0.36, 0.16), (0.07, 0.05, 0.025), rough=(0.28, 0.56), scale=30, tarnish=0.62)
    bronze = aged_metal("bronze", (0.3, 0.21, 0.11), (0.045, 0.032, 0.018), rough=(0.34, 0.62), scale=32, tarnish=0.7)
    copper = aged_metal("copper", (0.54, 0.27, 0.14), (0.05, 0.075, 0.055), rough=(0.32, 0.58), scale=18, tarnish=0.68)
    gilt = aged_metal("gilt", (0.6, 0.44, 0.19), (0.11, 0.075, 0.03), rough=(0.24, 0.48), scale=40, tarnish=0.45)
    iron = aged_metal("wrought iron", (0.08, 0.082, 0.08), (0.02, 0.018, 0.015), rough=(0.42, 0.72), scale=45, tarnish=0.6, hammer=0.1)
    glass = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.48)
    thin_glass = plain("print glass", (0.96, 0.97, 0.96), rough=0.03, transmission=1.0, ior=1.12)
    wax = bpy.data.materials.new("wax"); wax.use_nodes = True
    _w = wax.node_tree.nodes["Principled BSDF"]
    _w.inputs["Base Color"].default_value = (0.38, 0.31, 0.21, 1)
    _w.inputs["Subsurface Weight"].default_value = 0.22
    _w.inputs["Subsurface Radius"].default_value = (0.012, 0.007, 0.003)
    _w.inputs["Roughness"].default_value = 0.54
    wick = plain("wick", (0.01, 0.01, 0.01), rough=0.9)
    flame = plain("candle flame", (1.0, 0.62, 0.22), emit=(1.0, 0.56, 0.18), strength=14.0)

    # Damask wallpaper using procedural SVG tile + woven linen normal map + wear
    wallpaper = bpy.data.materials.new("botanic damask"); wallpaper.use_nodes = True
    N = wallpaper.node_tree.nodes; Lk = wallpaper.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / 0.72, 1 / 0.72, 1 / 0.72)
    Lk(tc.outputs["Object"], mp.inputs["Vector"])
    paper_path = os.path.join(DRAWN, "botanic-paper.png")
    ti = N.new("ShaderNodeTexImage")
    ti.image = bpy.data.images.load(paper_path, check_existing=True)
    ti.projection = "BOX"; ti.projection_blend = 0.15
    Lk(mp.outputs["Vector"], ti.inputs["Vector"])
    aged_col = wear(N, Lk, ti.outputs["Color"], tc, dirt=0.26, stains=0.18, grime=0.15, streaks=0.12)
    Lk(aged_col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.82
    b.inputs["Sheen Weight"].default_value = 0.18
    b.inputs["Sheen Roughness"].default_value = 0.65
    b.inputs["Specular IOR Level"].default_value = 0.22
    nor_p = tex_path("plastered_wall_04", "nor_gl")
    if nor_p:
        nt = N.new("ShaderNodeTexImage"); nt.image = bpy.data.images.load(nor_p, check_existing=True)
        nt.image.colorspace_settings.name = "Non-Color"; nt.projection = "BOX"; nt.projection_blend = 0.2
        Lk(mp.outputs["Vector"], nt.inputs["Vector"])
        nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 0.55
        Lk(nt.outputs["Color"], nm.inputs["Color"])
        bw = N.new("ShaderNodeRGBToBW"); bp = N.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = 0.22; bp.inputs["Distance"].default_value = 0.001
        Lk(ti.outputs["Color"], bw.inputs["Color"]); Lk(bw.outputs["Val"], bp.inputs["Height"])
        Lk(nm.outputs["Normal"], bp.inputs["Normal"]); Lk(bp.outputs["Normal"], b.inputs["Normal"])
    wallpaper["detailed"] = True

    return dict(
        OAK=oak, OAK_X=oak_x, WALNUT=walnut, WALNUT_X=walnut_x, BOARDS=boards,
        CEILING=ceiling, PLASTER=plaster, STONE=stone, SOIL=soil, MOSS=moss,
        TERRACOTTA=terracotta, LEATHER=leather, BRASS=brass, BRONZE=bronze,
        COPPER=copper, GILT=gilt, IRON=iron, GLASS=glass, THIN_GLASS=thin_glass,
        WAX=wax, WICK=wick, FLAME=flame, WALLPAPER=wallpaper,
    )


M = build_materials()


# ── 1. Floor: individual beveled oak boards, sunken bronze-curbed botanical bed
def build_floor():
    arch(box("subfloor", -WALL - 0.1, WALL + 0.1, Y0 - 0.2, END + 0.5, -0.06, -0.025,
             plain("subfloor gaps", (0.006, 0.005, 0.004), rough=0.98)))
    x = -WALL
    col = 0
    while x < WALL - 0.01:
        bw = min(0.155, WALL - x)
        if not (-RUN_HALF - 0.035 < x + bw / 2 < RUN_HALF + 0.035):
            y = Y0 - (col % 3) * 0.52
            while y < END:
                L_ = RNG.uniform(1.45, 2.65)
                y0_b, y1_b = max(y, Y0) + 0.0018, min(y + L_, END) - 0.0018
                if y1_b - y0_b > 0.08:
                    z_top = RNG.uniform(-0.0008, 0.0008)
                    slab(x + 0.0018, x + bw - 0.0018, y0_b, y1_b, -0.025, z_top, M["BOARDS"], 0.0018)
                    for ny in (y0_b + 0.03, y1_b - 0.03):
                        if Y0 + 0.05 < ny < END - 0.05:
                            for nx in (x + 0.024, x + bw - 0.024):
                                arch(cylinder("floor nail", nx, ny, z_top - 0.001, z_top + 0.0004, 0.0022, M["IRON"], verts=8))
                y += L_
        x += bw
        col += 1

    # Sunken botanical bed in the middle with subdivided uneven earth and bronze curbs
    bed = arch(box("botanical soil bed", -RUN_HALF, RUN_HALF, Y0, END, -0.032, -0.008, M["SOIL"]))
    sub = bed.modifiers.new("soil_sub", "SUBSURF"); sub.subdivision_type = "SIMPLE"; sub.levels = sub.render_levels = 4
    crumb = bpy.data.textures.new("bed_crumb", "CLOUDS"); crumb.noise_scale = 0.08; crumb.noise_depth = 3
    dsp = bed.modifiers.new("soil_disp", "DISPLACE"); dsp.texture = crumb; dsp.strength = 0.009; dsp.mid_level = 0.5

    for xs in (-1, 1):
        slab(xs * RUN_HALF - 0.026, xs * RUN_HALF + 0.026, Y0, END, -0.03, 0.014, M["BRONZE"], 0.004)
        slab(xs * (RUN_HALF + 0.032) - 0.012, xs * (RUN_HALF + 0.032) + 0.012, Y0, END, -0.025, 0.003, M["OAK"], 0.002)

    # Dense, dark, matte conservatory grass & low botanical groundcover
    grass_Templates = []
    for n in ("large_a", "large_b", "mid_a", "mid_b", "mid_c", "small_a", "small_b"):
        g_root = import_model("grass_medium_01", only=f"grass_medium_01_{n}_LOD0", at=(0, 0, -50))
        darken_model(g_root, (0.48, 0.46, 0.4), rough_floor=0.68)
        grass_Templates.append(g_root)

    x0, x1, y0, y1 = -RUN_HALF + 0.035, RUN_HALF - 0.035, Y0, END - 0.04
    for _ in range(int((x1 - x0) * (y1 - y0) * 195)):
        twin = clone(RNG.choice(grass_Templates),
                     (RNG.uniform(x0, x1), RNG.uniform(y0, y1), -0.013),
                     RNG.uniform(0, math.tau), RNG.uniform(0.62, 0.98))
        ARCH.extend(meshes_of(twin))

    # 3D curled & veined fallen leaves along the oak boards (never flat 2D ovals)
    leaf_mat = scan("dried fallen leaves", "dry_decay_leaves", size=0.35, tint=(0.65, 0.48, 0.32),
                    bright=0.42, sat=0.75, rough=(0.68, 0.9), bump=0.5, coat=0.0)
    me = bpy.data.meshes.new("fallen_leaves_3d"); bm = bmesh.new()
    for _ in range(110):
        side = RNG.choice((-1, 1))
        # Concentrate naturally along the bronze runner curb and wall skirtings
        if RNG.random() < 0.62:
            lx = side * (RUN_HALF + RNG.uniform(0.04, 0.38))
        else:
            lx = side * (WALL - RNG.uniform(0.06, 0.42))
        ly = RNG.uniform(Y0 + 0.1, END - 0.15)
        sz = RNG.uniform(0.026, 0.048)
        ang = RNG.uniform(0, math.tau)
        curl = RNG.uniform(0.0025, 0.0055)
        ca, sa = math.cos(ang), math.sin(ang)
        # 3D cupped leaf mesh with raised midrib and curled tip/margins
        spine = [bm.verts.new((lx + (-0.9 + 0.6 * k) * sz * ca,
                               ly + (-0.9 + 0.6 * k) * sz * sa,
                               0.001 + curl * (0.4 if k in (1, 2) else 0.9))) for k in range(4)]
        for s_dir in (-1, 1):
            edge_pts = []
            for k, w_fac in enumerate((0.12, 0.42, 0.34, 0.05)):
                px = (-0.85 + 0.6 * k) * sz
                py = s_dir * w_fac * sz
                ez = 0.0008 + curl * (1.2 if k in (1, 2) else 0.3)
                edge_pts.append(bm.verts.new((lx + px * ca - py * sa, ly + px * sa + py * ca, ez)))
            for k in range(3):
                f = bm.faces.new((spine[k], spine[k + 1], edge_pts[k + 1], edge_pts[k]) if s_dir > 0 else
                                 (spine[k + 1], spine[k], edge_pts[k], edge_pts[k + 1]))
                f.smooth = True
    bm.to_mesh(me); bm.free()
    fl_obj = link(bpy.data.objects.new("fallen_leaves_3d", me))
    fl_obj.data.materials.append(leaf_mat)


# ── 2. Walls & Wainscot Dado Panelling ──────────────────────────────────────
def build_walls():
    for side in (-1, 1):
        X = side * WALL
        xa, xb = sorted((X, X + side * 0.25))
        w = arch(box("wall", xa, xb, Y0 - 1, END + 0.3, 0, CEIL, M["WALLPAPER"]))
        for zd in DOORS:
            y0, y1 = zd * D0, zd * D0 + DOOR_LEN
            boolean_cut(w, box("cut", xa - 0.1, xb + 0.1, y0, y1, -0.1, DOOR_H, M["IRON"]))

        spans, y = [], Y0 - 1
        for zd in DOORS:
            spans.append((y, zd * D0 - 0.13))
            y = zd * D0 + DOOR_LEN + 0.13
        spans.append((y, END))

        for a, b in spans:
            if b - a < 0.2: continue
            slab(*sorted((X, X - side * 0.028)), a, b, 0, DADO, M["OAK"], 0)
            n = max(1, int((b - a) / 0.58))
            for k in range(n):
                pa = a + k * (b - a) / n + 0.065
                pb = a + (k + 1) * (b - a) / n - 0.065
                # Recessed panel & fielded centre
                slab(*sorted((X - side * 0.028, X - side * 0.046)), pa, pb, 0.22, DADO - 0.11, M["WALNUT"], 0.008)
                for (c0, c1, d0, d1) in ((pa - 0.012, pb + 0.012, 0.208, 0.222),
                                         (pa - 0.012, pb + 0.012, DADO - 0.11, DADO - 0.096),
                                         (pa - 0.012, pa + 0.002, 0.22, DADO - 0.11),
                                         (pb - 0.002, pb + 0.012, 0.22, DADO - 0.11)):
                    slab(*sorted((X - side * 0.028, X - side * 0.052)), c0, c1, d0, d1, M["OAK"], 0.003)
            slab(*sorted((X, X - side * 0.062)), a, b, DADO - 0.02, DADO + 0.048, M["OAK_X"], 0.01)
            slab(*sorted((X, X - side * 0.055)), a, b, 0, 0.18, M["OAK_X"], 0.008)
            slab(*sorted((X, X - side * 0.065)), a, b, 0.18, 0.205, M["OAK_X"], 0.005)

        # Picture rail, dark plaster frieze, and layered cornice with oak bed-moulding
        slab(*sorted((X, X - side * 0.042)), Y0 - 1, END, RAIL, RAIL + 0.048, M["OAK_X"], 0.008)
        slab(*sorted((X, X - side * 0.018)), Y0 - 1, END, RAIL + 0.048, CEIL, M["PLASTER"], 0)
        slab(*sorted((X, X - side * 0.115)), Y0 - 1, END, CEIL - 0.12, CEIL, M["PLASTER"], 0.022)
        slab(*sorted((X, X - side * 0.068)), Y0 - 1, END, CEIL - 0.19, CEIL - 0.12, M["PLASTER"], 0.015)
        slab(*sorted((X, X - side * 0.045)), Y0 - 1, END, CEIL - 0.22, CEIL - 0.19, M["OAK_X"], 0.006)


# ── 3. Six-Panel Walnut Doors ───────────────────────────────────────────────
def build_doors():
    for side in (-1, 1):
        for i, zd in enumerate(DOORS):
            n = i + (0 if side < 0 else 3)
            y0, y1 = zd * D0, zd * D0 + DOOR_LEN
            X = side * WALL
            face = X + side * 0.07
            H_ = DOOR_H

            def piece(a, b, c, d_, depth0, depth1, mat, r=0.004):
                xa, xb = sorted((face - side * depth0, face - side * depth1))
                return slab(xa, xb, a, b, c, d_, mat, r)

            # Recessed panel backing (0..0.016), stiles & rails protruding toward the hall (0..0.044)
            piece(y0, y1, 0, H_, 0, 0.016, M["WALNUT"], 0)
            for ya, yb in ((y0, y0 + 0.11), ((y0 + y1) / 2 - 0.05, (y0 + y1) / 2 + 0.05), (y1 - 0.11, y1)):
                piece(ya, yb, 0, H_, 0, 0.044, M["WALNUT"])
            rails = (0, 0.2, H_ * 0.47, H_ * 0.47 + 0.11, H_ * 0.73, H_ * 0.73 + 0.11, H_ - 0.2, H_)
            for za, zb in zip(rails[0::2], rails[1::2]):
                piece(y0 + 0.11, y1 - 0.11, za, zb, 0, 0.044, M["WALNUT_X"])
            for za, zb in ((0.2, H_ * 0.47), (H_ * 0.47 + 0.11, H_ * 0.73), (H_ * 0.73 + 0.11, H_ - 0.2)):
                for ya, yb in ((y0 + 0.11, (y0 + y1) / 2 - 0.05), ((y0 + y1) / 2 + 0.05, y1 - 0.11)):
                    piece(ya + 0.042, yb - 0.042, za + 0.042, zb - 0.042, 0.014, 0.036, M["WALNUT"], 0.016)
                    for (a, b, c, d_) in ((ya, yb, za, za + 0.014), (ya, yb, zb - 0.014, zb),
                                          (ya, ya + 0.014, za, zb), (yb - 0.014, yb, za, zb)):
                        piece(a, b, c, d_, 0.016, 0.04, M["WALNUT"], 0.003)

            # Gilt numeral on top rail (proud of the 0.044 rail face)
            t = bpy.data.curves.new("numeral", "FONT"); t.body = ROMAN[n]
            try: t.font = bpy.data.fonts.load("C:/Windows/Fonts/georgiab.ttf")
            except Exception: pass
            t.size = 0.11; t.align_x = "CENTER"; t.align_y = "CENTER"; t.extrude = 0.0035
            num = arch(link(bpy.data.objects.new("numeral", t))); num.data.materials.append(M["GILT"])
            num.rotation_euler = (math.pi / 2, 0, -side * math.pi / 2)
            num.location = (face - side * 0.047, (y0 + y1) / 2, H_ - 0.1)

            # Brass knob, rose, shank & lock escutcheon
            ky = y1 - 0.065
            arch(sphere("knob", (face - side * 0.075, ky, 1.02), 0.028, M["BRASS"]))
            k1 = cylinder("rose", 0, 0, -0.005, 0.005, 0.032, M["BRASS"])
            k1.rotation_euler = (0, math.pi / 2, 0); k1.location = (face - side * 0.049, ky, 1.02)
            k2 = cylinder("shank", 0, 0, -0.02, 0.02, 0.008, M["BRASS"])
            k2.rotation_euler = (0, math.pi / 2, 0); k2.location = (face - side * 0.06, ky, 1.02)
            es = slab(*sorted((face - side * 0.044, face - side * 0.05)), ky - 0.016, ky + 0.016, 0.88, 0.95, M["BRASS"], 0.004)
            for o in (k1, k2, es): arch(o)

            # Moulded oak architraves & door reveals
            for (a, b, c, d_) in ((y0 - 0.13, y0, 0, H_ + 0.13), (y1, y1 + 0.13, 0, H_ + 0.13), (y0 - 0.13, y1 + 0.13, H_, H_ + 0.13)):
                slab(*sorted((X, X - side * 0.034)), a, b, c, d_, M["OAK_X"] if c == H_ else M["OAK"], 0.01)
                slab(*sorted((X - side * 0.034, X - side * 0.048)), a + 0.028, b - 0.028, c + (0.028 if c == H_ else 0), d_ - 0.028, M["OAK"], 0.006)
            xa, xb = sorted((X, face))
            slab(xa, xb, y0 - 0.002, y0, 0, H_, M["OAK"], 0)
            slab(xa, xb, y1, y1 + 0.002, 0, H_, M["OAK"], 0)
            slab(xa, xb, y0, y1, H_, H_ + 0.002, M["OAK"], 0)
            arch(box("under", face - side * 0.002, face + side * 0.01, y0 + 0.02, y1 - 0.02, 0.0, 0.005,
                     plain("lamplight", (1, 0.58, 0.26), emit=(1.0, 0.55, 0.22), strength=4.5)))


# ── 4. Coffered Dark Timber Ceiling, Glazed Lantern & Bronze Chandelier ─────
def build_ceiling_and_chandelier():
    ceil = arch(box("ceiling", -WALL - 0.3, WALL + 0.3, Y0 - 1, END + 0.3, CEIL, CEIL + 0.2, M["CEILING"]))
    boolean_cut(ceil, box("cut", -SKY_X, SKY_X, SKY_Y0, SKY_Y1, CEIL - 0.1, CEIL + 0.5, M["IRON"]))

    # Heavy transverse oak beams across the hall ceiling (matching Chemistry)
    for y_beam in (2.15, SKY_Y0 - 0.08, SKY_Y1 + 0.08, 8.35):
        slab(-WALL, WALL, y_beam - 0.08, y_beam + 0.08, CEIL - 0.16, CEIL, M["OAK_X"], 0.01)

    # Skylight moulded timber curb
    for (a, b, c, d_) in ((-SKY_X - 0.14, SKY_X + 0.14, SKY_Y0 - 0.14, SKY_Y0),
                          (-SKY_X - 0.14, SKY_X + 0.14, SKY_Y1, SKY_Y1 + 0.14),
                          (-SKY_X - 0.14, -SKY_X, SKY_Y0, SKY_Y1),
                          (SKY_X, SKY_X + 0.14, SKY_Y0, SKY_Y1)):
        slab(a, b, c, d_, CEIL - 0.14, CEIL + 0.04, M["OAK_X"], 0.014)

    RIDGE = CEIL + 0.9
    for k in range(9):
        y = SKY_Y0 + k * (SKY_Y1 - SKY_Y0) / 8
        for xs in (-1, 1):
            arch(tube("bar", [(xs * SKY_X, CEIL + 0.02), (0, RIDGE)], 0.018, M["IRON"], at=(0, y, 0)))
    arch(tube("ridge", [(SKY_Y0, RIDGE), (SKY_Y1, RIDGE)], 0.024, M["IRON"], rot=math.pi / 2))

    sky_glass = plain("skylight glass", (0.92, 0.95, 0.96), rough=0.055, transmission=1.0, ior=1.14)

    def skylight_pane(name, corners):
        me = bpy.data.meshes.new(name); bm = bmesh.new()
        bm.faces.new([bm.verts.new(v) for v in corners]); bm.to_mesh(me); bm.free()
        pane = arch(link(bpy.data.objects.new(name, me))); pane.data.materials.append(sky_glass)
        th = pane.modifiers.new("glass thickness", "SOLIDIFY"); th.thickness = 0.004; th.offset = 0
        return pane

    for xs in (-1, 1):
        corners = [(xs * SKY_X, SKY_Y0, CEIL + 0.02), (0, SKY_Y0, RIDGE), (0, SKY_Y1, RIDGE), (xs * SKY_X, SKY_Y1, CEIL + 0.02)]
        skylight_pane("sloping pane", list(reversed(corners)) if xs > 0 else corners)
        z = (CEIL + 0.02 + RIDGE) / 2
        arch(tube("glazing bar", [(SKY_Y0, z), (SKY_Y1, z)], 0.012, M["IRON"], at=(xs * SKY_X / 2, 0, 0), rot=math.pi / 2))
    for y in (SKY_Y0, SKY_Y1):
        corners = [(-SKY_X, y, CEIL + 0.02), (SKY_X, y, CEIL + 0.02), (0, y, RIDGE)]
        skylight_pane("end pane", list(reversed(corners)) if y == SKY_Y1 else corners)

    # Night sky and overhanging branches above the skylight lantern
    sky = bpy.data.materials.new("night sky"); sky.use_nodes = True
    sn = sky.node_tree.nodes; sn.remove(sn["Principled BSDF"]); em = sn.new("ShaderNodeEmission")
    nz = sn.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.7; nz.inputs["Detail"].default_value = 6
    cr = sn.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = (0.003, 0.006, 0.018, 1)
    cr.color_ramp.elements[1].color = (0.018, 0.036, 0.085, 1)
    sky.node_tree.links.new(nz.outputs["Fac"], cr.inputs["Fac"])
    sky.node_tree.links.new(cr.outputs["Color"], em.inputs["Color"])
    em.inputs["Strength"].default_value = 0.9
    sky.node_tree.links.new(em.outputs["Emission"], sn["Material Output"].inputs["Surface"])
    sky_box = arch(box("night", -6, 6, 0, 14, CEIL + 3.0, CEIL + 3.1, sky))
    sky_box.visible_shadow = False

    # Silhouetted tree limbs and fallen leaves outside the skylight glass
    for b_pts, r_b in [([(-1.8, 3.8, RIDGE + 0.35), (-0.3, 4.5, RIDGE + 0.18), (0.6, 5.1, RIDGE + 0.28)], 0.032),
                       ([(1.7, 6.2, RIDGE + 0.4), (0.2, 5.8, RIDGE + 0.2), (-0.5, 6.4, RIDGE + 0.3)], 0.026)]:
        bar("exterior overhanging branch", b_pts, r_b, M["IRON"])

    leaf_glass_mat = plain("leaves on glass", (0.025, 0.02, 0.01), rough=0.85)
    for _ in range(42):
        xs = RNG.choice((-1, 1)); t_ = RNG.uniform(0.12, 0.92); y = RNG.uniform(SKY_Y0 + 0.1, SKY_Y1 - 0.1)
        rise = RIDGE - CEIL - 0.02
        normal = Vector((xs * rise, 0, SKY_X)).normalized()
        p = Vector((xs * SKY_X * (1 - t_), y, CEIL + 0.02 + rise * t_)) + normal * 0.005
        lf = cylinder("leaf", 0, 0, 0, 0.002, RNG.uniform(0.028, 0.052), leaf_glass_mat, verts=7)
        lf.location = p; lf.scale = (1, 0.58, 1); lf.rotation_mode = "QUATERNION"
        lf.rotation_quaternion = normal.to_track_quat("Z", "Y") @ Quaternion((0, 0, 1), RNG.uniform(0, 3))
        arch(lf)

    # Chandelier suspended from a heavy structural oak tie-beam with bronze boss
    HUB = at(0, -0.4 * HR, 1.9)
    hk = HR / 700 / 1.9
    hub_s = (VP[0], VP[1] + (-0.4 * HR) / 1.9)
    wicks = []
    for i in range(8):
        a = (i / 8) * math.pi * 2 + 0.32
        sx = hub_s[0] + math.cos(a) * 132 * hk
        sy = hub_s[1] + (math.sin(a) * 132 * 0.22 - 68) * hk
        wicks.append(from_screen(sx * 1.0, sy, HUB.z + 68 * (HR / 700) * K))

    slab(-SKY_X - 0.12, SKY_X + 0.12, HUB.y - 0.09, HUB.y + 0.09, CEIL - 0.12, CEIL + 0.04, M["OAK_X"], 0.012)
    for xs in (-1, 1):
        slab(xs * (SKY_X - 0.08) - 0.06, xs * (SKY_X - 0.08) + 0.06, HUB.y - 0.11, HUB.y + 0.11, CEIL - 0.15, CEIL + 0.05, M["IRON"], 0.004)
    arch(lathe("rose", [(0, 0), (0.15, 0), (0.14, -0.025), (0.085, -0.05), (0.035, -0.075), (0, -0.075)],
               M["BRONZE"], at=(0, HUB.y, CEIL - 0.12)))
    for k in range(int((CEIL - 0.18 - (HUB.z + 0.3)) / 0.055)):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.02, minor_radius=0.0045,
            location=(0, HUB.y, CEIL - 0.2 - k * 0.055),
            rotation=(math.pi / 2, 0, (k % 2) * math.pi / 2),
        )
        c = bpy.context.active_object; c.data.materials.append(M["BRONZE"]); arch(c)
    arch(lathe("stem", [(0, 0), (0.055, 0), (0.078, 0.045), (0.048, 0.12), (0.028, 0.2),
                        (0.048, 0.26), (0.032, 0.32), (0.018, 0.4), (0.028, 0.45), (0, 0.48)],
               M["BRONZE"], at=(0, HUB.y, HUB.z - 0.15)))
    for w in wicks:
        cup_top = w.z - 0.13
        d = Vector((w.x, w.y, 0)) - Vector((0, HUB.y, 0)); L_ = d.length; ang = math.atan2(d.y, d.x)
        a2 = tube("arm", [(0.02, 0.0), (L_ * 0.55, -0.08), (L_ * 0.95, -0.02), (L_, cup_top - HUB.z - 0.02)],
                  0.0105, M["BRONZE"], at=(0, HUB.y, HUB.z))
        a2.rotation_euler = (0, 0, ang); arch(a2)
        arch(lathe("cup", [(0, 0), (0.012, 0), (0.036, 0.012), (0.04, 0.02), (0.02, 0.03), (0.022, 0.06), (0, 0.06)],
                   M["BRONZE"], at=(w.x, w.y, cup_top - 0.04)))
        arch(cylinder("candle", w.x, w.y, cup_top + 0.01, w.z - 0.004, 0.012, M["WAX"], verts=20))
        arch(cylinder("wick", w.x, w.y, w.z - 0.006, w.z + 0.006, 0.0012, M["WICK"], verts=6))
        fl = arch(lathe("chandelier flame", [(0, 0), (0.0045, 0.006), (0.006, 0.016), (0.003, 0.026), (0, 0.036)],
                        M["FLAME"], at=(w.x, w.y, w.z + 0.004), steps=14))
        fl.visible_shadow = False


# ── 5. Far End Wall, Stone Staircase & Long-Case Grandfather Clock ──────────
def build_end_and_clock():
    end = arch(box("end wall", -WALL - 0.3, WALL + 0.3, END, END + 0.3, 0, CEIL, M["WALLPAPER"]))
    GATE.extend(build_staircase(end, OPEN, HEAD, M["OAK"], M["BRASS"], M["GLASS"]))
    for xs in (-1, 1):
        a, b = sorted((xs * WALL, xs * (OPEN + 0.18)))
        slab(a, b, END - 0.028, END, 0, DADO, M["OAK"], 0)
        slab(a, b, END - 0.058, END, DADO - 0.02, DADO + 0.048, M["OAK_X"], 0.01)
        slab(a, b, END - 0.055, END, 0, 0.18, M["OAK_X"], 0.008)
        slab(a, b, END - 0.042, END, RAIL, RAIL + 0.048, M["OAK_X"], 0.008)
        slab(a, b, END - 0.115, END, CEIL - 0.12, CEIL, M["PLASTER"], 0.02)

    # Long-case clock (left of the stone arch) — matte waxed walnut with colonnettes
    CLK_X, CLK_Y = -0.74 * WALL, 4.58 * D0
    PIV = 262 * (HR / 700) * K; PLEN = 168 * (HR / 700) * K; BOB = 16 * (HR / 700) * K
    cx0, cx1, cy0, cy1 = CLK_X - 0.27, CLK_X + 0.27, CLK_Y - 0.13, END - 0.01
    slab(cx0 - 0.045, cx1 + 0.045, cy0 - 0.045, cy1, 0, 0.08, M["WALNUT_X"], 0.008)
    slab(cx0 - 0.035, cx1 + 0.035, cy0 - 0.035, cy1, 0.08, 0.32, M["WALNUT"], 0.008)
    slab(cx0 - 0.19, cx1 + 0.19, cy0 - 0.045, cy0 - 0.03, 0.12, 0.28, M["OAK"], 0.006)
    trunk = slab(cx0, cx1, cy0, cy1, 0.32, 1.58, M["WALNUT"], 0.006)
    slab(cx0 - 0.032, cx1 + 0.032, cy0 - 0.032, cy1, 1.58, 1.66, M["WALNUT_X"], 0.01)
    slab(cx0 - 0.022, cx1 + 0.022, cy0 - 0.022, cy1, 1.66, 2.24, M["WALNUT"], 0.008)
    slab(cx0 - 0.052, cx1 + 0.052, cy0 - 0.052, cy1, 2.24, 2.32, M["WALNUT_X"], 0.014)

    # Turned hood colonnettes with brass bases & capitals
    for xs in (-1, 1):
        col_x = CLK_X + xs * 0.245
        arch(cylinder("clock column", col_x, cy0 - 0.028, 1.68, 2.22, 0.018, M["WALNUT"], verts=20))
        arch(cylinder("clock col base", col_x, cy0 - 0.028, 1.66, 1.69, 0.024, M["BRASS"], verts=20))
        arch(cylinder("clock col cap", col_x, cy0 - 0.028, 2.20, 2.24, 0.024, M["BRASS"], verts=20))
    for xs in (-1, 0, 1):
        arch(lathe("clock finial", [(0, 0), (0.026, 0), (0.02, 0.045), (0.032, 0.085), (0, 0.145)],
                   M["BRASS"], at=(CLK_X + xs * 0.22, cy0 + 0.08, 2.32)))

    boolean_cut(trunk, box("cut", CLK_X - 0.13, CLK_X + 0.13, cy0 - 0.05, CLK_Y + 0.06, PIV - PLEN - BOB - 0.06, PIV + 0.05, M["IRON"]))
    arch(box("trunk inside", CLK_X - 0.14, CLK_X + 0.14, CLK_Y + 0.05, CLK_Y + 0.07, PIV - PLEN - BOB - 0.08, PIV + 0.06,
             plain("inside", (0.01, 0.008, 0.006), rough=0.92)))
    # Two brass drive weights hanging beside the pendulum inside the case
    for wx_off, wz_top in ((-0.075, PIV - 0.18), (0.075, PIV - 0.28)):
        arch(cylinder("clock weight", CLK_X + wx_off, CLK_Y + 0.015, wz_top - 0.16, wz_top, 0.024, M["BRONZE"], verts=20))
        arch(cylinder("weight cable", CLK_X + wx_off, CLK_Y + 0.015, wz_top, PIV + 0.04, 0.0018, M["IRON"], verts=8))
    clock_glass = arch(box("trunk glass", CLK_X - 0.13, CLK_X + 0.13, cy0 + 0.005, cy0 + 0.01, PIV - PLEN - BOB - 0.06, PIV + 0.05, M["THIN_GLASS"]))

    dial_path = os.path.join(DRAWN, "dial.png")
    if os.path.exists(dial_path):
        dmat = bpy.data.materials.new("dial"); dmat.use_nodes = True
        dn = dmat.node_tree.nodes; Lk = dmat.node_tree.links.new
        ti = dn.new("ShaderNodeTexImage"); ti.image = bpy.data.images.load(dial_path, check_existing=True)
        tco = dn.new("ShaderNodeTexCoord"); Lk(tco.outputs["UV"], ti.inputs["Vector"])
        Lk(ti.outputs["Color"], dn["Principled BSDF"].inputs["Base Color"])
        dn["Principled BSDF"].inputs["Roughness"].default_value = 0.46
        bw = dn.new("ShaderNodeRGBToBW"); bp = dn.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = 0.25; bp.inputs["Distance"].default_value = 0.001
        Lk(ti.outputs["Color"], bw.inputs["Color"]); Lk(bw.outputs["Val"], bp.inputs["Height"])
        Lk(bp.outputs["Normal"], dn["Principled BSDF"].inputs["Normal"])
        me = bpy.data.meshes.new("dial"); bm = bmesh.new(); bm.loops.layers.uv.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5, calc_uvs=True)
        for v in bm.verts: v.co = Vector((v.co.x * 0.42, 0, v.co.y * 0.42))
        bm.to_mesh(me); bm.free()
        dial = arch(link(bpy.data.objects.new("dial", me))); dial.data.materials.append(dmat)
        dial.location = (CLK_X, cy0 - 0.025, 1.95)
        arch(box("hood glass", CLK_X - 0.23, CLK_X + 0.23, cy0 - 0.035, cy0 - 0.03, 1.72, 2.18, M["THIN_GLASS"]))

    PENDULUM.append(cylinder("pendulum rod", CLK_X, CLK_Y, PIV - PLEN, PIV, 0.004, M["BRASS"], verts=12))
    pb = cylinder("pendulum bob", 0, 0, -0.006, 0.006, BOB, M["BRASS"], verts=32)
    pb.rotation_euler = (math.pi / 2, 0, 0); pb.location = (CLK_X, CLK_Y, PIV - PLEN)
    bevel(pb, 0.004, 2); PENDULUM.append(pb)
    return clock_glass


# ── 6. Sconces, Herbarium Prints & Botanical Conservatory Furniture ─────────
def build_sconces_and_herbarium():
    idx = 0
    for side in (-1, 1):
        for zs in SCONCES:
            tip = sconce_tip(side, zs)
            candle_sconce(side, tip, M["BRASS"], M["WAX"], M["WICK"])
            sfl = arch(lathe("sconce flame", [(0, 0), (0.005, 0.007), (0.0068, 0.018), (0.0035, 0.03), (0, 0.042)],
                             M["FLAME"], at=(tip.x, tip.y, tip.z - 0.004), steps=14))
            sfl.visible_shadow = False
            LIT.append(tip)

            # Framed botanical herbarium specimen plate above each sconce (cleanly below RAIL=2.86)
            y = zs * D0
            z0, w, h = 2.2, 0.4, 0.52
            z1 = z0 + h
            X = side * WALL
            face = X - side * 0.026
            fw = 0.036
            # Backing board
            slab(*sorted((X, face + side * 0.012)), y - w / 2 - fw, y + w / 2 + fw, z0 - fw, z1 + fw, M["WALNUT"], 0.004, keep=False)
            # Moulded walnut frame stiles & rails
            for (ya, yb, za, zb, across) in ((y - w / 2 - fw, y + w / 2 + fw, z0 - fw, z0, True),
                                             (y - w / 2 - fw, y + w / 2 + fw, z1, z1 + fw, True),
                                             (y - w / 2 - fw, y - w / 2, z0, z1, False),
                                             (y + w / 2, y + w / 2 + fw, z0, z1, False)):
                slab(*sorted((X - side * 0.004, face)), ya, yb, za, zb, M["WALNUT_X"] if across else M["WALNUT"], 0.006, keep=False)
            # Inner tarnished gilt slip
            g_w = 0.008
            for (ya, yb, za, zb) in ((y - w / 2, y + w / 2, z0, z0 + g_w),
                                     (y - w / 2, y + w / 2, z1 - g_w, z1),
                                     (y - w / 2, y - w / 2 + g_w, z0 + g_w, z1 - g_w),
                                     (y + w / 2 - g_w, y + w / 2, z0 + g_w, z1 - g_w)):
                slab(*sorted((X - side * 0.012, face + side * 0.004)), ya, yb, za, zb, M["GILT"], 0.002, keep=False)

            # High-res herbarium sheet quad
            p_path = os.path.join(DRAWN, f"herbarium-{idx % 4}.png")
            p_mat = bpy.data.materials.new(f"herbarium_{idx}"); p_mat.use_nodes = True
            pn = p_mat.node_tree.nodes; pl = p_mat.node_tree.links.new
            ti = pn.new("ShaderNodeTexImage"); ti.image = bpy.data.images.load(p_path, check_existing=True)
            tco = pn.new("ShaderNodeTexCoord"); pl(tco.outputs["UV"], ti.inputs["Vector"])
            pl(ti.outputs["Color"], pn["Principled BSDF"].inputs["Base Color"])
            pn["Principled BSDF"].inputs["Roughness"].default_value = 0.88
            pn["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.18
            bw = pn.new("ShaderNodeRGBToBW"); bp = pn.new("ShaderNodeBump")
            bp.inputs["Strength"].default_value = 0.18; bp.inputs["Distance"].default_value = 0.0008
            pl(ti.outputs["Color"], bw.inputs["Color"]); pl(bw.outputs["Val"], bp.inputs["Height"])
            pl(bp.outputs["Normal"], pn["Principled BSDF"].inputs["Normal"])

            px = X - side * 0.016
            corners = ([(px, y - w / 2 + g_w, z0 + g_w), (px, y + w / 2 - g_w, z0 + g_w),
                        (px, y + w / 2 - g_w, z1 - g_w), (px, y - w / 2 + g_w, z1 - g_w)] if side < 0 else
                       [(px, y + w / 2 - g_w, z0 + g_w), (px, y - w / 2 + g_w, z0 + g_w),
                        (px, y - w / 2 + g_w, z1 - g_w), (px, y + w / 2 - g_w, z1 - g_w)])
            me = bpy.data.meshes.new(f"herbarium_card_{idx}"); bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
            f = bm.faces.new([bm.verts.new(c) for c in corners])
            for lp, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): lp[uvl].uv = uv
            bm.to_mesh(me); bm.free()
            card_o = link(bpy.data.objects.new(f"herbarium_card_{idx}", me)); card_o.data.materials.append(p_mat)

            # Non-glare glass pane & picture rail hanging wires
            slab(*sorted((X - side * 0.02, X - side * 0.022)), y - w / 2, y + w / 2, z0, z1, M["THIN_GLASS"], 0, keep=False)
            for wy in (y - w * 0.36, y + w * 0.36):
                bar("picture wire", [(X - side * 0.018, wy, z1 + fw), (X - side * 0.022, wy, RAIL + 0.02)], 0.0014, M["BRASS"], keep=False)
            idx += 1


def terracotta_pot(x, y, w=0.34, h=0.3, plant=None, only=None, ph=0.68, rot=0.0, z=0.0, dark=(0.56, 0.52, 0.46)):
    r0, r1 = w * 0.36, w / 2
    lathe("terracotta pot", [(0, 0), (r0, 0), (r0 * 1.03, 0.012), (r1 * 0.92, h * 0.8),
                             (r1, h * 0.83), (r1 * 1.04, h * 0.9), (r1 * 1.02, h),
                             (r1 * 0.89, h), (r1 * 0.87, h * 0.85), (0, h * 0.85)],
          M["TERRACOTTA"], at=(x, y, z), steps=48)
    cylinder("pot soil", x, y, z + h * 0.78, z + h * 0.82, r1 * 0.87, M["SOIL"])
    if plant:
        mdl = import_model(plant, height=ph, only=only, at=(x, y, z + h * 0.72), rot=rot)
        darken_model(mdl, dark, rough_floor=0.6)


def build_furniture_and_props():
    # 1. Left foreground: philodendron in aged clay pot
    p_fg = import_model("potted_plant_02", height=1.12, at=(-WALL + 0.45, 2.15, 0), rot=0.6)
    darken_model(p_fg, (0.52, 0.5, 0.44), rough_floor=0.58)

    # 2. Right foreground: turned walnut plant stand with fern
    lathe("plant stand", [(0, 0), (0.18, 0), (0.18, 0.03), (0.055, 0.065), (0.042, 0.6),
                          (0.062, 0.64), (0.165, 0.66), (0.165, 0.7), (0, 0.7)],
          M["WALNUT"], at=(WALL - 0.42, 2.2, 0))
    terracotta_pot(WALL - 0.42, 2.2, 0.32, 0.26, "fern_02", "fern_02_b", 0.68, 1.1, z=0.7)

    # 3. Left between Doors I and II: darkened walnut side table, fern & specimen bell-jar
    mid1 = (DOORS[0] * D0 + DOOR_LEN + DOORS[1] * D0) / 2 + 0.18
    tbl = import_model("side_table_01", height=0.72, at=(-WALL + 0.32, mid1, 0), rot=math.pi / 2)
    for m_obj in meshes_of(tbl):
        m_obj.data.materials.clear()
        m_obj.data.materials.append(M["WALNUT"])
    terracotta_pot(-WALL + 0.3, mid1 - 0.08, 0.23, 0.19, "fern_02", "fern_02_a", 0.42, 2.0, z=0.72)
    # Glass specimen bell-jar on turned walnut base
    bx, by = -WALL + 0.31, mid1 + 0.22
    lathe("cloche base", [(0, 0), (0.095, 0), (0.1, 0.012), (0.088, 0.024), (0, 0.024)], M["WALNUT"], at=(bx, by, 0.72), steps=36)
    lathe("cloche dome", [(0.082, 0), (0.084, 0.15), (0.072, 0.19), (0.04, 0.215), (0.012, 0.222), (0.016, 0.235), (0, 0.24)],
          M["GLASS"], at=(bx, by, 0.744), steps=36)
    terracotta_pot(bx, by, 0.11, 0.09, "celandine_01", None, 0.16, 0.8, z=0.744)

    # 4. Right between Doors IV and V: weathered carved stone plinth & Medici urn (replaces white box!)
    ux, uy = WALL - 0.31, mid1
    slab(ux - 0.21, ux + 0.21, uy - 0.21, uy + 0.21, 0, 0.08, M["STONE"], 0.01, keep=False)
    slab(ux - 0.17, ux + 0.17, uy - 0.17, uy + 0.17, 0.08, 0.56, M["STONE"], 0.008, keep=False)
    for (px0, px1, py0, py1) in ((ux - 0.182, ux - 0.168, uy - 0.11, uy + 0.11),
                                 (ux - 0.11, ux + 0.11, uy - 0.182, uy - 0.168),
                                 (ux - 0.11, ux + 0.11, uy + 0.168, uy + 0.182)):
        slab(px0, px1, py0, py1, 0.15, 0.49, M["OAK"], 0.004, keep=False)
    slab(ux - 0.21, ux + 0.21, uy - 0.21, uy + 0.21, 0.56, 0.63, M["STONE"], 0.01, keep=False)
    lathe("carved stone urn", [(0, 0), (0.125, 0), (0.13, 0.025), (0.062, 0.06), (0.052, 0.12),
                               (0.155, 0.19), (0.185, 0.31), (0.168, 0.35), (0.192, 0.38),
                               (0.165, 0.38), (0.15, 0.22), (0, 0.22)],
          M["STONE"], at=(ux, uy, 0.63), steps=48)
    cylinder("urn soil", ux, uy, 0.94, 0.98, 0.155, M["SOIL"])
    anth = import_model("anthurium_botany_01", height=0.46, at=(ux, uy, 0.96), rot=2.2)
    darken_model(anth, (0.52, 0.5, 0.44), rough_floor=0.58)
    for k in range(4):
        pw = import_model("periwinkle_plant", height=0.28,
                          only=["periwinkle_plant_01_LOD0", "periwinkle_plant_02_LOD0"][k % 2],
                          at=(ux + math.cos(k * 1.57) * 0.075, uy + math.sin(k * 1.57) * 0.075, 0.95), rot=k * 1.4)
        darken_model(pw, (0.5, 0.48, 0.42), rough_floor=0.62)

    # 5. Left between Doors II and III: walnut & bronze hall stand with walking sticks
    mid2 = (DOORS[1] * D0 + DOOR_LEN + DOORS[2] * D0) / 2 + 0.15
    sx, sy = -WALL + 0.25, mid2
    lathe("stand drip pan", [(0, 0), (0.145, 0), (0.15, 0.03), (0.13, 0.035), (0.12, 0.012), (0, 0.012)], M["BRONZE"], at=(sx, sy, 0), steps=36)
    for k in range(4):
        a = k * math.pi / 2 + 0.4
        cylinder("stand post", sx + math.cos(a) * 0.105, sy + math.sin(a) * 0.105, 0.01, 0.62, 0.012, M["WALNUT"], verts=16)
    for z_ring in (0.18, 0.58):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.105, minor_radius=0.008, location=(sx, sy, z_ring))
        r_o = bpy.context.active_object; r_o.data.materials.append(M["BRASS"])
    for dx, dy, lean in ((0.03, 0.02, 0.11), (-0.035, -0.02, -0.08)):
        st = cylinder("cane", 0, 0, 0, 0.88, 0.01, M["WALNUT"], verts=12)
        st.location = (sx + dx, sy + dy, 0.02); st.rotation_euler = (lean, 0.08, 0)
        sphere("cane pommel", (sx + dx, sy + dy - math.sin(lean) * 0.89, 0.02 + math.cos(lean) * 0.89), 0.018, M["BRASS"])

    # 6. Right between Doors V and VI: banded leather & oak steamer trunk + plants & books
    tx, ty = WALL - 0.32, mid2
    slab(tx - 0.26, tx + 0.26, ty - 0.45, ty + 0.45, 0.0, 0.48, M["LEATHER"], 0.016, keep=False)
    for sz_slat in (0.14, 0.34):
        slab(tx - 0.268, tx + 0.268, ty - 0.455, ty + 0.455, sz_slat, sz_slat + 0.032, M["OAK_X"], 0.004, keep=False)
    for yy in (ty - 0.28, ty + 0.28):
        slab(tx - 0.272, tx + 0.272, yy - 0.024, yy + 0.024, 0.0, 0.49, M["WALNUT"], 0.004, keep=False)
        slab(tx - 0.276, tx - 0.25, yy - 0.018, yy + 0.018, 0.28, 0.36, M["BRASS"], 0.002, keep=False)
    slab(tx - 0.275, tx - 0.25, ty - 0.04, ty + 0.04, 0.36, 0.46, M["BRASS"], 0.003, keep=False)
    for (cx, cy) in ((tx - 0.26, ty - 0.45), (tx - 0.26, ty + 0.45)):
        for cz in (0.02, 0.44):
            slab(cx - 0.012, cx + 0.04, cy - 0.04, cy + 0.04, cz, cz + 0.04, M["BRASS"], 0.003, keep=False)
    terracotta_pot(tx - 0.02, ty + 0.14, 0.22, 0.18, "fern_02", "fern_02_c", 0.42, 0.4, z=0.48)
    bks = import_model("book_encyclopedia_set_01", width=0.28, at=(tx + 0.02, ty - 0.18, 0.48), rot=-math.pi / 2 + 0.15)
    darken_model(bks, (0.55, 0.5, 0.44), rough_floor=0.62)

    # 7. Right of the stone staircase: oak water bucket, clay planters & antique copper watering can
    bkt = import_model("wooden_bucket_01", height=0.42, at=(OPEN + 0.62, END - 0.42, 0), rot=0.6)
    darken_model(bkt, (0.48, 0.42, 0.36), rough_floor=0.62)
    wx, wy = OPEN + 0.34, END - 0.88
    lathe("copper watering can", [(0, 0), (0.12, 0), (0.125, 0.012), (0.12, 0.24), (0.105, 0.27), (0.08, 0.28), (0, 0.28)],
          M["COPPER"], at=(wx, wy, 0), steps=40)
    tube("spout", [(0.115, 0.045), (0.22, 0.16), (0.29, 0.27)], 0.014, M["COPPER"], at=(wx, wy, 0), rot=math.pi * 0.8)
    lathe("spout rose", [(0, 0), (0.016, 0), (0.036, 0.028), (0, 0.032)], M["BRASS"],
          at=(wx + math.cos(math.pi * 0.8) * 0.29, wy + math.sin(math.pi * 0.8) * 0.29, 0.27), steps=24)
    tube("can handle", [(-0.095, 0.27), (-0.02, 0.39), (0.09, 0.37), (0.125, 0.24)], 0.009, M["COPPER"], at=(wx, wy, 0), rot=math.pi * 0.8)
    terracotta_pot(wx + 0.28, wy + 0.18, 0.21, 0.18, "potted_plant_04", None, 0.34, 1.3, z=0.0)

    # 8. Two wrought-iron wirework hanging conservatory baskets with moss & ferns
    for (bx, by) in ((-1.85, 4.95), (1.85, 6.55)):
        bz = 2.38
        sphere("moss basket core", (bx, by, bz), 0.19, M["MOSS"], squash=(1, 1, 0.65))
        bpy.ops.mesh.primitive_torus_add(major_radius=0.195, minor_radius=0.006, location=(bx, by, bz + 0.04))
        rim = bpy.context.active_object; rim.data.materials.append(M["IRON"])
        for k in range(8):
            a = k * math.tau / 8
            rib_pts = [(bx + math.cos(a) * 0.195 * math.sin(t),
                        by + math.sin(a) * 0.195 * math.sin(t),
                        bz + 0.04 - 0.135 * math.cos(t)) for t in [j * math.pi / 12 for j in range(7)]]
            bar("basket wire rib", rib_pts, 0.0035, M["IRON"], keep=False)
        for k in range(3):
            a = k * math.tau / 3 + 0.4
            foot = Vector((bx + math.cos(a) * 0.195, by + math.sin(a) * 0.195, bz + 0.045))
            top = Vector((bx, by, CEIL - 0.04))
            bar("basket chain", [foot, top], 0.0028, M["IRON"], keep=False)
        for k, f_part in enumerate(("fern_02_a", "fern_02_b")):
            fn = import_model("fern_02", height=0.48, only=f_part, at=(bx, by, bz - 0.03), rot=bx + k * 1.9)
            darken_model(fn, (0.5, 0.48, 0.42), rough_floor=0.6)


# ── 7. Lighting (Chemistry Hall Reference: crisp moonlight + warm sconces) ──
def build_lighting():
    world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0

    # Directional moon through the glazed roof lantern
    lamp("moon in the lantern", "SUN", (1.6, 5.2, 16.0), aim=(-0.4, 4.8, 0.0),
         energy=float(arg("--skymoon", "2.2")), colour=(0.55, 0.68, 1.0), angle=math.radians(2.2))
    sky_fill = lamp("lantern cool sky", "AREA", (0, 5.3, CEIL + 0.45), aim=(0, 5.3, 0.0),
                    energy=float(arg("--skyfill", "65")), colour=(0.55, 0.68, 1.0), size=2.0, size_y=3.4)
    sky_fill.visible_camera = False; sky_fill.visible_glossy = False; sky_fill.visible_transmission = False

    # Cool moonlight pouring down the stone staircase onto the hall floor (like Chemistry's stairwell)
    stair_spill = lamp("moon down the stair", "AREA", (0, END + 1.4, 2.85), aim=(0, END - 2.2, 0.0),
                       energy=float(arg("--stairmoon", "190")), colour=(0.55, 0.68, 1.0), size=1.3)
    stair_spill.visible_camera = False; stair_spill.visible_glossy = False; stair_spill.visible_transmission = False

    # Warm candle sconces (no artificial ceiling bounce lights)
    for tip in LIT:
        lamp("candle", "POINT", tuple(tip + Vector((0, 0, 0.02))),
             energy=float(arg("--candle", "8.5")), colour=(1.0, 0.55, 0.22), size=0.014)

    # Gentle warm glow from the 8-branch bronze chandelier
    HUB = at(0, -0.4 * HR, 1.9)
    lamp("chandelier glow", "POINT", (0, HUB.y, HUB.z + 0.18),
         energy=float(arg("--chandelier", "4.2")), colour=(1.0, 0.56, 0.22), size=0.18)

    # Subtle cool hall fill (matched to Chemistry)
    fill = lamp("fill", "AREA", (0, 0.6, 2.6), aim=(0, END, 1.0),
                energy=float(arg("--fill", "50")), colour=(0.8, 0.85, 1.0), size=2.5)
    fill.visible_camera = False; fill.visible_glossy = False


# ── Build Scene & Render Passes ─────────────────────────────────────────────
build_floor()
build_walls()
build_doors()
build_ceiling_and_chandelier()
clock_glass = build_end_and_clock()
build_sconces_and_herbarium()
build_furniture_and_props()
build_lighting()

clear_glass()
air = haze(float(arg("--haze", "0.0045")))

cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "1.5")))
scene.cycles.volume_bounces = 1
scene.render.use_persistent_data = True
finish_hall(scene, SAMPLES, keep_gloss=("glass", "skylight glass", "print glass", "stair | thin leaded glass"))

if arg("--blend", ""):
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(arg("--blend", "")))

moving = {"pendulum": PENDULUM}
if arg("--preview-gates", "0") != "1":
    moving["gate"] = GATE
passes(scene, OUT, ONLY, air, apart=moving, unseen={"pendulum": [clock_glass]})
if "gate-motion" in ONLY:
    render_gate_motion(scene, GATE, air, OUT, OPEN, HEAD)
print("HALL_DONE")
