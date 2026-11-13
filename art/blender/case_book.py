# The case file (src/ui/caseBook.js): Inspector Wren's case book for the
# Ashcombe file, lying open, looked straight down on, alone — no desk under
# it, for it is shown over the game — built in three dimensions and rendered
# with Cycles (2026-11-06: the user asked for a real book, "supra realistă").
#
# The book: boards bound in worn brown leather (Poly Haven fabric_leather_02),
# rubbed pale along their edges and at the corners; the block of pages thick
# on either side, every sheet its own, rising out of the gutter and lying a
# little convex, their edges stepped and not quite even where the block goes
# down to the boards; the paper the yellowed white of the house map, with the
# tooth of a real sheet (ambientCG Paper001), tea-coloured toward its edges,
# foxed, thumbed at the outer corners; the outer corners of the two top sheets
# lifting a little; headbands at the head and tail of the spine; a ribbon out
# of the tail; the book's own shadow under it, on nothing (alpha).
#
# The two top sheets are where the game lays its pages (caseBook.js cuts each
# out of this picture, writes on it, and turns it): each SHEET_W x SHEET_H cm,
# the game's page of 1000 x 1280, meeting at the spine in the middle of the
# picture; where they lie is written beside it (caseBook.json).
#
#   blender -b --factory-startup -P art/blender/case_book.py -- [--samples 768] [--preview]
#   node art/blender/case_book_publish.mjs

import bpy, bmesh, math, os, sys, json, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import ROOT, scan

OUT = arg("--out", os.path.join(ROOT, ".artifacts/case-book"))
os.makedirs(OUT, exist_ok=True)
PREVIEW = "--preview" in sys.argv
SAMPLES = int(arg("--samples", "96" if PREVIEW else "768"))
PX = float(arg("--px", "56"))                     # pixels a centimetre
SHEET_W, SHEET_H = 22.0, 28.16                    # a top sheet, cm (1000 x 1280)
W, H = 2900, 2000                                 # the picture: the book, and room for its shadow
RNG = random.Random(61_1013)

def cm(x, y, z=0.0):
    """a place in centimetres (x across, the spine at 0; y up the page; z up
    from what it lies on), in metres"""
    return Vector((x / 100, y / 100, z / 100))
def picture(x, y, z=0.0):
    """where a place (cm) falls in the picture, in its pixels"""
    k = EYE_D * 100 / (EYE_D * 100 - z)
    return [round(W / 2 + x * PX * k, 2), round(H / 2 - y * PX * k, 2)]

scene = fresh()
# (a real lens straight over the middle of it, not a flat projection: the
#  sides of the blocks of pages, going down to the boards, are seen as they are)
LENS = float(arg("--lens", "70"))
cd = bpy.data.cameras.new("eye"); cd.lens = LENS; cd.sensor_width = 36; cd.sensor_fit = "HORIZONTAL"; cd.clip_start = 0.05; cd.clip_end = 10
EYE_D = (W / PX / 100 / 2) / (18 / LENS)            # metres over the ground: W px across it
cam = link(bpy.data.objects.new("eye", cd)); cam.location = (0, 0, EYE_D); scene.camera = cam

# ── the measures of it (cm) ────────────────────────────────────────────────
BOARD_T = 0.32                                     # a board's thickness
SQUARE = 0.55                                      # how far the boards stand out round the pages
FAN_X, FAN_Y = 0.72, 0.42                          # how far the lowest sheet reaches past the top one
BOARD_X0, BOARD_X1 = 1.55, SHEET_W + FAN_X + SQUARE
BOARD_Y = SHEET_H / 2 + FAN_Y + SQUARE
SHEETS = {-1: int(arg("--left-sheets", "5")), 1: int(arg("--right-sheets", "4"))}   # loose sheets under each top one (the rest is the block)

def lift(d):
    """the top sheet's height (cm over what the book lies on) at d cm from the
    spine: down in the gutter, rising out of it, a little convex, coming down
    a touch at its outer edge"""
    return BOARD_T + 0.16 + 1.78 * (1 - math.exp(-d / 1.9)) - 0.32 * (d / SHEET_W) ** 2

# ── materials ──────────────────────────────────────────────────────────────
TEX = "C:/Users/crist/Tools/render/assets/textures"
def image_node(N, path, colour):
    t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(path, check_existing=True)
    t.image.colorspace_settings.name = "sRGB" if colour else "Non-Color"
    return t

def book_paper(name, browned=1.0, tone=1.0):
    """the yellowed white of the house map (#ddd3b8 at its middle), a real
    sheet's tooth and fibres, darker blotched in places, foxed, tea-coloured
    toward the edges it is handled by, thumbed at its outer corners"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    # (the scan laid once over the whole open book, never repeated, and only
    #  its clean part: its right-hand edge is the scanner's, and dark)
    mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (0.77 / 0.46, 0.94 / 0.30, 1.0)
    mp.inputs["Location"].default_value = (0.03 + 0.23 * 0.77 / 0.46, 0.03 + 0.15 * 0.94 / 0.30, 0.0)
    L(tc.outputs["Object"], mp.inputs["Vector"])
    dif = image_node(N, f"{TEX}/Paper001/Diffuse.jpg", True); L(mp.outputs["Vector"], dif.inputs["Vector"]); dif.extension = "EXTEND"
    nor = image_node(N, f"{TEX}/Paper001/nor_gl.jpg", False); L(mp.outputs["Vector"], nor.inputs["Vector"]); nor.extension = "EXTEND"
    # the sheet's own white, taken to the map's cream (and each sheet under
    # the top one a little lighter or darker than the next, so that its edge
    # is seen as its own)
    cream = N.new("ShaderNodeMix"); cream.data_type = "RGBA"; cream.blend_type = "MULTIPLY"; cream.inputs["Factor"].default_value = 1
    cream.inputs[7].default_value = (0.74 * tone, 0.645 * tone, 0.455 * tone, 1)
    L(dif.outputs["Color"], cream.inputs[6]); out = cream.outputs[2]
    if tone < 1:
        at_ = N.new("ShaderNodeAttribute"); at_.attribute_type = "OBJECT"; at_.attribute_name = "tone"
        vr = N.new("ShaderNodeMapRange"); vr.inputs["To Min"].default_value = 0.84; vr.inputs["To Max"].default_value = 1.08
        L(at_.outputs["Fac"], vr.inputs["Value"])
        vk = N.new("ShaderNodeMix"); vk.data_type = "RGBA"; vk.blend_type = "MULTIPLY"; vk.inputs["Factor"].default_value = 1
        cv = N.new("ShaderNodeCombineColor")
        for i in range(3): L(vr.outputs["Result"], cv.inputs[i])
        L(out, vk.inputs[6]); L(cv.outputs["Color"], vk.inputs[7]); out = vk.outputs[2]
    # blotched: broad, faint, uneven toning
    bz = N.new("ShaderNodeTexNoise"); bz.inputs["Scale"].default_value = 3.2; bz.inputs["Detail"].default_value = 6; bz.inputs["Roughness"].default_value = 0.55
    L(tc.outputs["Object"], bz.inputs["Vector"])
    br = N.new("ShaderNodeValToRGB"); br.color_ramp.elements[0].position = 0.3; br.color_ramp.elements[1].position = 0.75
    br.color_ramp.elements[0].color = (0.86, 0.8, 0.7, 1); br.color_ramp.elements[1].color = (1.03, 1.02, 1.0, 1)
    L(bz.outputs["Fac"], br.inputs["Fac"])
    blot = N.new("ShaderNodeMix"); blot.data_type = "RGBA"; blot.blend_type = "MULTIPLY"; blot.inputs["Factor"].default_value = 1
    L(out, blot.inputs[6]); L(br.outputs["Color"], blot.inputs[7]); out = blot.outputs[2]
    # foxed: a few small rust-brown spots, here and there
    fv = N.new("ShaderNodeTexVoronoi"); fv.inputs["Scale"].default_value = 26; fv.feature = "F1"; fv.inputs["Randomness"].default_value = 1
    L(tc.outputs["Object"], fv.inputs["Vector"])
    fr = N.new("ShaderNodeMapRange"); fr.inputs["From Min"].default_value = 0.0; fr.inputs["From Max"].default_value = 0.03
    fr.inputs["To Min"].default_value = 1.0; fr.inputs["To Max"].default_value = 0.0; L(fv.outputs["Distance"], fr.inputs["Value"])
    fz = N.new("ShaderNodeTexNoise"); fz.inputs["Scale"].default_value = 9; L(tc.outputs["Object"], fz.inputs["Vector"])
    fk = N.new("ShaderNodeMapRange"); fk.inputs["From Min"].default_value = 0.66; fk.inputs["From Max"].default_value = 0.72
    L(fz.outputs["Fac"], fk.inputs["Value"])
    fm = N.new("ShaderNodeMath"); fm.operation = "MULTIPLY"; L(fr.outputs["Result"], fm.inputs[0]); L(fk.outputs["Result"], fm.inputs[1])
    fs = N.new("ShaderNodeMath"); fs.operation = "MULTIPLY"; fs.inputs[1].default_value = 0.4; L(fm.outputs["Value"], fs.inputs[0])
    fox = N.new("ShaderNodeMix"); fox.data_type = "RGBA"; fox.inputs[7].default_value = (0.42, 0.25, 0.11, 1)
    L(fs.outputs["Value"], fox.inputs["Factor"]); L(out, fox.inputs[6]); out = fox.outputs[2]
    # browned toward the edges: by its own UVs (u from the spine out, v up),
    # most at the outer edge, at the head and the tail, least at the spine
    sep = N.new("ShaderNodeSeparateXYZ"); L(tc.outputs["UV"], sep.inputs["Vector"])
    def toward(sock, flip):
        a = sock
        if flip:
            inv = N.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0; L(sock, inv.inputs[1]); a = inv.outputs["Value"]
        return a
    vt = N.new("ShaderNodeMath"); vt.operation = "PINGPONG"; vt.inputs[1].default_value = 0.5; L(sep.outputs["Y"], vt.inputs[0])
    out_edge = toward(sep.outputs["X"], True)                      # 0 at the outer edge
    mn = N.new("ShaderNodeMath"); mn.operation = "MINIMUM"; L(out_edge, mn.inputs[0])
    vs = N.new("ShaderNodeMath"); vs.operation = "MULTIPLY"; vs.inputs[1].default_value = 1.25; L(vt.outputs["Value"], vs.inputs[0]); L(vs.outputs["Value"], mn.inputs[1])
    en = N.new("ShaderNodeTexNoise"); en.inputs["Scale"].default_value = 4; en.inputs["Detail"].default_value = 8; L(tc.outputs["Object"], en.inputs["Vector"])
    ew = N.new("ShaderNodeMath"); ew.operation = "MULTIPLY_ADD"; ew.inputs[1].default_value = 0.008; ew.inputs[2].default_value = -0.004
    L(en.outputs["Fac"], ew.inputs[0])
    ed = N.new("ShaderNodeMath"); ed.operation = "ADD"; L(mn.outputs["Value"], ed.inputs[0]); L(ew.outputs["Value"], ed.inputs[1])
    er = N.new("ShaderNodeMapRange"); er.inputs["From Min"].default_value = 0.0; er.inputs["From Max"].default_value = 0.11
    er.inputs["To Min"].default_value = 0.62 * browned; er.inputs["To Max"].default_value = 0.0; L(ed.outputs["Value"], er.inputs["Value"])
    tea = N.new("ShaderNodeMix"); tea.data_type = "RGBA"; tea.blend_type = "MULTIPLY"; tea.inputs[7].default_value = (0.72, 0.56, 0.36, 1)
    L(er.outputs["Result"], tea.inputs["Factor"]); L(out, tea.inputs[6]); out = tea.outputs[2]
    # thumbed: a soft grey-brown where the outer corners are taken to turn it
    cx = N.new("ShaderNodeMath"); cx.operation = "SUBTRACT"; cx.inputs[0].default_value = 1.0; L(sep.outputs["X"], cx.inputs[1])
    cy = N.new("ShaderNodeMath"); cy.operation = "MINIMUM"; L(sep.outputs["Y"], cy.inputs[0])
    cyi = N.new("ShaderNodeMath"); cyi.operation = "SUBTRACT"; cyi.inputs[0].default_value = 1.0; L(sep.outputs["Y"], cyi.inputs[1]); L(cyi.outputs["Value"], cy.inputs[1])
    cc = N.new("ShaderNodeCombineXYZ"); L(cx.outputs["Value"], cc.inputs["X"]); L(cy.outputs["Value"], cc.inputs["Y"])
    cl = N.new("ShaderNodeVectorMath"); cl.operation = "LENGTH"; L(cc.outputs["Vector"], cl.inputs[0])
    tr = N.new("ShaderNodeMapRange"); tr.inputs["From Min"].default_value = 0.02; tr.inputs["From Max"].default_value = 0.2
    tr.inputs["To Min"].default_value = 0.22 * browned; tr.inputs["To Max"].default_value = 0.0; L(cl.outputs["Value"], tr.inputs["Value"])
    tn = N.new("ShaderNodeMath"); tn.operation = "MULTIPLY"; L(tr.outputs["Result"], tn.inputs[0]); L(bz.outputs["Fac"], tn.inputs[1])
    thumb = N.new("ShaderNodeMix"); thumb.data_type = "RGBA"; thumb.blend_type = "MULTIPLY"; thumb.inputs[7].default_value = (0.66, 0.58, 0.48, 1)
    L(tn.outputs["Value"], thumb.inputs["Factor"]); L(out, thumb.inputs[6]); out = thumb.outputs[2]
    L(out, b.inputs["Base Color"])
    nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 0.55; L(nor.outputs["Color"], nm.inputs["Color"])
    # (and the faint cockle of old paper, broad and low)
    ck = N.new("ShaderNodeTexNoise"); ck.inputs["Scale"].default_value = 2.2; ck.inputs["Detail"].default_value = 3; L(tc.outputs["Object"], ck.inputs["Vector"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.18; bp.inputs["Distance"].default_value = 0.003
    L(ck.outputs["Fac"], bp.inputs["Height"]); L(nm.outputs["Normal"], bp.inputs["Normal"]); L(bp.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.88; b.inputs["Specular IOR Level"].default_value = 0.28
    b.inputs["Sheen Weight"].default_value = 0.12; b.inputs["Sheen Tint"].default_value = (1.0, 0.95, 0.85, 1)
    # light passes a little through a sheet
    b.inputs["Subsurface Weight"].default_value = 0.04; b.inputs["Subsurface Radius"].default_value = (0.2, 0.15, 0.1)
    return m

# (the paper, old and handled: case_book_paper.py; book_paper above was the
#  first, too clean — "de plastic", the user said)
from case_book_paper import old_paper
TOP_PAPER = old_paper("case book | top sheet")
UNDER_PAPER = old_paper("case book | the pages under", browned=1.4, tone=0.9)
LEATHER = scan("case book | worn brown leather", "fabric_leather_02", size=0.32, tint=(0.24, 0.14, 0.085), bright=0.36, sat=0.95,
               rough=(0.45, 0.78), bump=0.9, edges=0.3, dirt=0.3, grime=0.25)
SPINE_LEATHER = scan("case book | spine leather", "fabric_leather_02", size=0.2, tint=(0.52, 0.36, 0.25), bright=0.55, sat=0.9,
                     rough=(0.4, 0.72), bump=0.9, edges=0.4, dirt=0.3)
def headband_silk():
    m = bpy.data.materials.new("case book | headband silk"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); wv = N.new("ShaderNodeTexWave"); wv.inputs["Scale"].default_value = 620; wv.wave_profile = "SAW"
    L(tc.outputs["Object"], wv.inputs["Vector"])
    rp = N.new("ShaderNodeValToRGB"); rp.color_ramp.interpolation = "CONSTANT"; rp.color_ramp.elements[1].position = 0.5
    rp.color_ramp.elements[0].color = (0.22, 0.045, 0.035, 1); rp.color_ramp.elements[1].color = (0.5, 0.42, 0.3, 1)
    L(wv.outputs["Fac"], rp.inputs["Fac"]); L(rp.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.5; b.inputs["Sheen Weight"].default_value = 0.4
    return m
SILK = headband_silk()
RIBBON = plain("case book | ribbon", (0.07, 0.012, 0.014), rough=0.58, sheen=0.25, spec=0.3)

# ── the boards and the spine ───────────────────────────────────────────────
def board(name, x0, x1):
    o = box(name, x0 / 100, x1 / 100, -BOARD_Y / 100, BOARD_Y / 100, 0, BOARD_T / 100, LEATHER)
    m = o.modifiers.new("bevel", "BEVEL"); m.width = 0.0016; m.segments = 4; m.limit_method = "NONE"
    # (the corners knocked round with years of use)
    return o
board("case book | left board", -BOARD_X1, -BOARD_X0)
board("case book | right board", BOARD_X0, BOARD_X1)
# the spine's back, under the block, its ends seen at the head and the tail
sp = box("case book | spine", -2.1 / 100, 2.1 / 100, -(BOARD_Y - 0.12) / 100, (BOARD_Y - 0.12) / 100, -0.05 / 100, 0.22 / 100, SPINE_LEATHER)
bevel(sp, 0.0012, 3)
# the joints, where each board turns: a soft leather roll
for s in (-1, 1):
    j = cylinder("case book | joint", 0, 0, -BOARD_Y / 100 + 0.002, BOARD_Y / 100 - 0.002, 0.0032, SPINE_LEATHER, verts=24)
    j.rotation_euler = (math.pi / 2, 0, 0); j.location = (s * BOARD_X0 / 100 - s * 0.0012, 0, 0.0026)

# ── the block of pages ─────────────────────────────────────────────────────
CURL = float(arg("--curl", "0.34"))
def top_z(d, y, reach=SHEET_W, half_h=SHEET_H / 2, curl=CURL, uneven=0.05):
    """the top sheet's height at d cm from the spine, y up the page"""
    corner = max(0.0, (d / reach - 0.8) / 0.2) ** 2 * max(0.0, (abs(y) / half_h - 0.72) / 0.28) ** 2
    wave = 0.6 * math.sin(y * 0.9 + d * 0.31) + 0.4 * math.sin(d * 0.37 - y * 0.52 + 1.3)
    return lift(d) + curl * corner + uneven * wave * (d / reach)

def page_edges():
    """the cut edges of the pages, seen down the side of the block: a cream
    gone grey-brown with handling, every sheet a fine line of its own, the
    lines not quite even"""
    m = bpy.data.materials.new("case book | page edges"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); L(tc.outputs["UV"], sep.inputs["Vector"])
    # (lines along the edge: they vary across it, down the block, wavering a little along it)
    wob = N.new("ShaderNodeTexNoise"); wob.inputs["Scale"].default_value = 3.0; wob.inputs["Detail"].default_value = 4
    L(tc.outputs["UV"], wob.inputs["Vector"])
    wk = N.new("ShaderNodeMath"); wk.operation = "MULTIPLY_ADD"; wk.inputs[1].default_value = 0.012
    L(wob.outputs["Fac"], wk.inputs[0]); L(sep.outputs["Y"], wk.inputs[2])
    def lines(scale, sharp):
        k = N.new("ShaderNodeMath"); k.operation = "MULTIPLY"; k.inputs[1].default_value = scale; L(wk.outputs["Value"], k.inputs[0])
        sn = N.new("ShaderNodeMath"); sn.operation = "SINE"; L(k.outputs["Value"], sn.inputs[0])
        ab = N.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"; L(sn.outputs["Value"], ab.inputs[0])
        pw = N.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = sharp; L(ab.outputs["Value"], pw.inputs[0])
        return pw.outputs["Value"]
    fine = lines(118.0, 0.7); coarse = lines(37.0, 4.0)
    gaps = N.new("ShaderNodeTexNoise"); gaps.inputs["Scale"].default_value = 40; gaps.inputs["Detail"].default_value = 2
    gm = N.new("ShaderNodeMapping"); gm.inputs["Scale"].default_value = (0.4, 60, 1); L(tc.outputs["UV"], gm.inputs["Vector"]); L(gm.outputs["Vector"], gaps.inputs["Vector"])
    gr = N.new("ShaderNodeMapRange"); gr.inputs["From Min"].default_value = 0.55; gr.inputs["From Max"].default_value = 0.75
    gr.inputs["To Min"].default_value = 1.0; gr.inputs["To Max"].default_value = 0.6; L(gaps.outputs["Fac"], gr.inputs["Value"])
    shade = N.new("ShaderNodeMath"); shade.operation = "MULTIPLY_ADD"; shade.inputs[1].default_value = 0.34; shade.inputs[2].default_value = 0.66
    L(fine, shade.inputs[0])
    sh2 = N.new("ShaderNodeMath"); sh2.operation = "MULTIPLY"; L(shade.outputs["Value"], sh2.inputs[0]); L(gr.outputs["Result"], sh2.inputs[1])
    cs = N.new("ShaderNodeMath"); cs.operation = "MULTIPLY_ADD"; cs.inputs[1].default_value = -0.12; cs.inputs[2].default_value = 1.0
    L(coarse, cs.inputs[0])
    sh3 = N.new("ShaderNodeMath"); sh3.operation = "MULTIPLY"; L(sh2.outputs["Value"], sh3.inputs[0]); L(cs.outputs["Value"], sh3.inputs[1])
    # the cream of the paper, greyed and browned where hands have been along it
    gz = N.new("ShaderNodeTexNoise"); gz.inputs["Scale"].default_value = 6; gz.inputs["Detail"].default_value = 6; L(tc.outputs["Object"], gz.inputs["Vector"])
    gc = N.new("ShaderNodeValToRGB"); gc.color_ramp.elements[0].color = (0.36, 0.28, 0.18, 1); gc.color_ramp.elements[1].color = (0.54, 0.45, 0.31, 1)
    L(gz.outputs["Fac"], gc.inputs["Fac"])
    cv = N.new("ShaderNodeCombineColor")
    for i in range(3): L(sh3.outputs["Value"], cv.inputs[i])
    mx = N.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "MULTIPLY"; mx.inputs["Factor"].default_value = 1
    L(gc.outputs["Color"], mx.inputs[6]); L(cv.outputs["Color"], mx.inputs[7]); L(mx.outputs[2], b.inputs["Base Color"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.35; bp.inputs["Distance"].default_value = 0.0004
    L(fine, bp.inputs["Height"]); L(bp.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.92; b.inputs["Specular IOR Level"].default_value = 0.2
    return m
EDGES = page_edges()

def block_side(side, fan_x, fan_y, rows=18):
    """the side of one half of the block: from just under the top sheet's
    edge round its head, its outer edge and its tail, out and down to the
    board — rounded over at the top as a block of pages is"""
    half = SHEET_H / 2
    path = []   # (d, y, outward normal in plan as (nx, ny), fan)
    for i in range(0, 41):
        d = 0.5 + (SHEET_W - 0.5) * (i / 40) ** 0.8
        path.append((d, half, (0.0, 1.0), fan_y))
    for i in range(1, 8):                                  # (the corner, rounded)
        a = math.pi / 2 * i / 8
        path.append((SHEET_W, half, (math.sin(a), math.cos(a)), fan_y + (fan_x - fan_y) * i / 8))
    for i in range(0, 61):
        path.append((SHEET_W, half - 2 * half * i / 60, (1.0, 0.0), fan_x))
    for i in range(1, 8):
        a = math.pi / 2 * i / 8
        path.append((SHEET_W, -half, (math.cos(a), -math.sin(a)), fan_x + (fan_y - fan_x) * i / 8))
    for i in range(40, -1, -1):
        d = 0.5 + (SHEET_W - 0.5) * (i / 40) ** 0.8
        path.append((d, -half, (0.0, -1.0), fan_y))
    me = bpy.data.meshes.new("block side"); bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    grid = []; length = 0.0; prev = None; us = []
    for d, y, n, fan in path:
        if prev: length += math.hypot(d - prev[0], y - prev[1]) + 0.05
        us.append(length); prev = (d, y)
    for (d, y, (nx, ny), fan), u in zip(path, us):
        zt = top_z(d, y) - 0.025; zb = BOARD_T + 0.004
        col = []
        for j in range(rows + 1):
            v = j / rows; out = fan * math.sin(v * math.pi / 2) + RNG.uniform(-0.01, 0.01) * v
            z = zt - (zt - zb) * v ** 1.35
            col.append((bm.verts.new(cm(side * (d + nx * out), y + ny * out, z)), (u / length, v)))
        grid.append(col)
    for i in range(len(grid) - 1):
        for j in range(rows):
            a, b_, c_, d_ = grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]
            f = bm.faces.new([q[0] for q in ((a, b_, c_, d_) if side < 0 else (a, d_, c_, b_))])
            for lp, q in zip(f.loops, ((a, b_, c_, d_) if side < 0 else (a, d_, c_, b_))): lp[uv].uv = q[1]
    bm.normal_update()
    # (whichever way the loops ran, every face looks up and out)
    for f in bm.faces:
        if f.normal.z < -0.05: f.normal_flip()
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("case book | block of pages", me)); o.data.materials.append(EDGES)
    for p in o.data.polygons: p.use_smooth = True
    return o

def sheet_mesh(name, side, reach, half_h, drop, mat, cols, rows, curl=0.0, uneven=0.0):
    """a sheet from the spine out to `reach` cm, `half_h` cm up and down from
    the middle, `drop` cm under the top sheet (less in the gutter, where the
    sheets are sewn together); `curl` lifts its outer corners"""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    grid = []
    for i in range(cols + 1):
        t = i / cols
        d = reach * (t ** 1.6)                     # (closer together in the gutter, where it curves)
        row = []
        for j in range(rows + 1):
            v = j / rows; y = -half_h + 2 * half_h * v
            # (each sheet a hair under the one over it even in the gutter, so
            #  none of them lies in the same place as another)
            z = top_z(d, y, reach, half_h, curl, uneven) - drop * (1 - math.exp(-d / 0.9)) - 0.004 * drop / 0.03
            row.append(bm.verts.new(cm(side * d, y, max(BOARD_T + 0.03, z))))
        grid.append(row)
    for i in range(cols):
        for j in range(rows):
            a, b_, c_, d_ = grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]
            f = bm.faces.new((a, b_, c_, d_) if side > 0 else (a, d_, c_, b_))
            for lp in f.loops:
                x_, y_ = lp.vert.co.x * 100, lp.vert.co.y * 100
                lp[uv].uv = (abs(x_) / reach, (y_ + half_h) / (2 * half_h))
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    return o

for side in (-1, 1):
    # (the left half of the block thicker: it is open past its middle)
    fan_x, fan_y = (FAN_X, FAN_Y) if side < 0 else (FAN_X * 0.8, FAN_Y * 0.85)
    block_side(side, fan_x, fan_y)
    # the few sheets just under the top one, their edges a little out of line
    for k in range(SHEETS[side], 0, -1):
        reach = SHEET_W + 0.035 * k + RNG.uniform(-0.02, 0.03)
        half_h = SHEET_H / 2 + 0.025 * k + RNG.uniform(-0.015, 0.02)
        o = sheet_mesh("case book | page", side, reach, half_h, 0.022 * k, UNDER_PAPER, 80, 48, curl=CURL * 0.6, uneven=0.045)
        o["tone"] = RNG.uniform(0.0, 1.0)
    sheet_mesh("case book | top sheet", side, SHEET_W, SHEET_H / 2, 0.0, TOP_PAPER, 160, 64, curl=CURL, uneven=0.05)

# ── the headbands, and the ribbon out of the tail ──────────────────────────
for s in (-1, 1):
    hb = cylinder("case book | headband", 0, 0, -1.35 / 100, 1.35 / 100, 0.0019, SILK, verts=20)
    hb.rotation_euler = (0, math.pi / 2, 0); hb.location = (0, s * (SHEET_H / 2 + 0.16) / 100, (BOARD_T + 0.42) / 100)
def ribbon(points, width, mat):
    me = bpy.data.meshes.new("ribbon"); bm = bmesh.new(); prev = None
    for i, (x, y, z, twist) in enumerate(points):
        a = bm.verts.new(cm(x - width / 2 * math.cos(twist), y, z + width / 2 * math.sin(twist)))
        b_ = bm.verts.new(cm(x + width / 2 * math.cos(twist), y, z - width / 2 * math.sin(twist)))
        if prev: bm.faces.new((prev[0], prev[1], b_, a))
        prev = (a, b_)
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new("case book | ribbon", me)); o.data.materials.append(mat)
    so = o.modifiers.new("thick", "SOLIDIFY"); so.thickness = 0.0004
    for p in o.data.polygons: p.use_smooth = True
    return o
ribbon([(0.15, -SHEET_H / 2 + 1.2, BOARD_T + 0.08, 0.0), (0.2, -SHEET_H / 2 - 0.2, BOARD_T + 0.1, 0.05),
        (0.5, -BOARD_Y + 0.1, BOARD_T + 0.08, 0.12), (0.95, -BOARD_Y - 0.9, 0.06, 0.2), (1.35, -BOARD_Y - 1.8, 0.02, 0.16),
        (1.5, -BOARD_Y - 2.3, 0.02, 0.1)], 0.62, RIBBON)   # (its end inside the picture)

# ── the ground it lies on: nothing but its shadow ──────────────────────────
gp = box("ground", -1.5, 1.5, -1.5, 1.5, -0.002, 0.0, plain("ground", (0.5, 0.5, 0.5), rough=0.9))
gp.is_shadow_catcher = True

# ── the light: warm and broad from up on the left, as the lamp at his
#    desk; the room's light, softer, from the right; none of it one hot spot
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.012, 0.011, 0.01, 1)
lamp("the lamp", "AREA", tuple(cm(-118, 44, 68)), aim=tuple(cm(6, -4, 0)), energy=float(arg("--lamp", "70")), colour=(1.0, 0.82, 0.6), size=0.6, size_y=0.45)
fill = lamp("the room", "AREA", tuple(cm(90, -40, 110)), aim=tuple(cm(0, 0, 0)), energy=float(arg("--fill", "9")), colour=(0.9, 0.9, 0.88), size=1.4)
fill.visible_glossy = False
top = lamp("over it", "AREA", tuple(cm(-10, 10, 150)), aim=tuple(cm(0, 0, 0)), energy=float(arg("--top", "6")), colour=(1.0, 0.9, 0.76), size=1.2)
top.visible_glossy = False

# ── where the top sheets lie, in the picture ───────────────────────────────
spine = W / 2
# (each top sheet as the lens sees it: its outline, followed round from the
#  spine along its head, down its outer edge and back along its tail — the
#  game cuts each page to it, and turns a leaf of that shape)
def outline(side):
    half = SHEET_H / 2; pts = []
    for i in range(0, 25): d = SHEET_W * (i / 24) ** 0.7; pts.append(picture(side * d, half, top_z(d, half)))
    for i in range(1, 24): y = half - 2 * half * i / 24; pts.append(picture(side * SHEET_W, y, top_z(SHEET_W, y)))
    for i in range(24, -1, -1): d = SHEET_W * (i / 24) ** 0.7; pts.append(picture(side * d, -half, top_z(d, -half)))
    return pts
sheets = {"left": outline(-1), "right": outline(1)}
every = sheets["left"] + sheets["right"]
data = {
    "version": int(arg("--version", "1")), "width": W, "height": H, "px": PX,
    "spine": spine, "top": min(p[1] for p in every), "bottom": max(p[1] for p in every),
    "leaf": round(max(abs(p[0] - spine) for p in every), 2), "sheets": sheets,
    "book": {"left": picture(-BOARD_X1, 0, BOARD_T)[0], "right": picture(BOARD_X1, 0, BOARD_T)[0], "top": picture(0, BOARD_Y, BOARD_T)[1], "bottom": picture(0, -BOARD_Y, BOARD_T)[1]},
}
with open(os.path.join(OUT, "caseBook.json"), "w") as fh: json.dump(data, fh, indent=1)

cycles(scene, SAMPLES, W, H, exposure=float(arg("--exposure", "-0.1")), glare=False, transparent=True)
c = scene.cycles
c.adaptive_threshold = 0.006; c.adaptive_min_samples = 64; c.sample_clamp_indirect = 4.0
c.denoiser = "OPENIMAGEDENOISE"; c.denoising_input_passes = "RGB_ALBEDO_NORMAL"; c.denoising_prefilter = "ACCURATE"
if PREVIEW: scene.render.resolution_percentage = 50
render(scene, os.path.join(OUT, "preview.png" if PREVIEW else "book.png"))
print("CASE_BOOK_DONE", json.dumps(data), flush=True)
