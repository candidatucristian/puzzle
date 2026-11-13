# The case book's paper (case_book.py), old and handled (2026-11-06: the user
# found the first pages "de plastic" and asked for them MUCH more worn).
#
# The map's yellowed white, gone further: toned unevenly in broad clouds and
# finer mottling; tide-marked where water once stood on it, a darker rim round
# each mark; foxed all over in rust-brown spots, small and a few larger; browned
# deep at the edges it was handled by, unevenly; grey with thumbs at its outer
# corners and along its outer edge where the leaves were turned; the dark
# specks of the pulp in it. Its tooth (ambientCG Paper001) and the faint
# crumple of a sheet that has been damp and dried (Paper003), laid once over
# the open book. Dead matt: no sheen, almost no specular, nothing like a
# coated surface.

import bpy

TEX = "C:/Users/crist/Tools/render/assets/textures"

def _img(N, path, colour, extend=True):
    t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(path, check_existing=True)
    t.image.colorspace_settings.name = "sRGB" if colour else "Non-Color"
    if extend: t.extension = "EXTEND"
    return t

def old_paper(name, browned=1.0, tone=1.0, tide=True):
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    def mul(out, colour_or_socket, factor=1.0):
        mx = N.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "MULTIPLY"
        if isinstance(factor, float): mx.inputs["Factor"].default_value = factor
        else: L(factor, mx.inputs["Factor"])
        L(out, mx.inputs[6])
        if isinstance(colour_or_socket, tuple): mx.inputs[7].default_value = (*colour_or_socket, 1)
        else: L(colour_or_socket, mx.inputs[7])
        return mx.outputs[2]
    def noise(scale, detail=6, rough=0.55, coords=None):
        n = N.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = detail
        n.inputs["Roughness"].default_value = rough; L(coords or tc.outputs["Object"], n.inputs["Vector"]); return n.outputs["Fac"]
    def ramp(sock, stops):
        r = N.new("ShaderNodeValToRGB"); els = r.color_ramp.elements
        while len(els) < len(stops): els.new(0.5)
        for e, (pos, col) in zip(els, stops): e.position = pos; e.color = (*col, 1)
        L(sock, r.inputs["Fac"]); return r.outputs["Color"]
    def remap(sock, a, b_, c, d):
        r = N.new("ShaderNodeMapRange"); r.inputs["From Min"].default_value = a; r.inputs["From Max"].default_value = b_
        r.inputs["To Min"].default_value = c; r.inputs["To Max"].default_value = d; L(sock, r.inputs["Value"]); return r.outputs["Result"]
    def math_(op, a, b_=None, c=None):
        n = N.new("ShaderNodeMath"); n.operation = op
        for i, v in enumerate((a, b_, c)):
            if v is None: continue
            if isinstance(v, (int, float)): n.inputs[i].default_value = v
            else: L(v, n.inputs[i])
        return n.outputs["Value"]

    # the scans laid once over the open book (only the clean part of each)
    once = N.new("ShaderNodeMapping"); once.inputs["Scale"].default_value = (0.77 / 0.46, 0.94 / 0.30, 1.0)
    once.inputs["Location"].default_value = (0.03 + 0.23 * 0.77 / 0.46, 0.03 + 0.15 * 0.94 / 0.30, 0.0)
    L(tc.outputs["Object"], once.inputs["Vector"])
    tooth_d = _img(N, f"{TEX}/Paper001/Diffuse.jpg", True); L(once.outputs["Vector"], tooth_d.inputs["Vector"])
    tooth_n = _img(N, f"{TEX}/Paper001/nor_gl.jpg", False); L(once.outputs["Vector"], tooth_n.inputs["Vector"])
    sq = N.new("ShaderNodeMapping"); sq.inputs["Scale"].default_value = (1 / 0.46, 1 / 0.46, 1.0)
    sq.inputs["Location"].default_value = (0.5, 0.5, 0.0); L(tc.outputs["Object"], sq.inputs["Vector"])
    crumple = _img(N, f"{TEX}/Paper003/nor_gl.jpg", False); L(sq.outputs["Vector"], crumple.inputs["Vector"])
    specks = _img(N, f"{TEX}/Paper002/Diffuse.jpg", True, extend=False)
    sk = N.new("ShaderNodeMapping"); sk.inputs["Scale"].default_value = (1 / 0.16, 1 / 0.16, 1.0); L(tc.outputs["Object"], sk.inputs["Vector"]); L(sk.outputs["Vector"], specks.inputs["Vector"])

    # the paper, gone to old cream, toned unevenly
    out = mul(tooth_d.outputs["Color"], (0.8 * tone, 0.71 * tone, 0.52 * tone))
    out = mul(out, ramp(noise(1.1, 8, 0.6), [(0.28, (0.87, 0.81, 0.7)), (0.72, (1.04, 1.03, 1.01))]))
    out = mul(out, ramp(noise(7.0, 6, 0.6), [(0.35, (0.93, 0.89, 0.83)), (0.7, (1.02, 1.01, 1.0))]))
    # the pulp's dark specks (Paper002's, its grey taken off)
    sl = N.new("ShaderNodeRGBToBW"); L(specks.outputs["Color"], sl.inputs["Color"])
    out = mul(out, ramp(sl.outputs["Val"], [(0.45, (0.6, 0.54, 0.47)), (0.62, (1.0, 1.0, 1.0))]))

    # tide marks: where water stood, a little darker, with a darker rim
    wv = N.new("ShaderNodeMapping"); wv.inputs["Location"].default_value = (3.7, -1.2, 0.4); L(tc.outputs["Object"], wv.inputs["Vector"])
    wn = N.new("ShaderNodeTexNoise"); wn.inputs["Scale"].default_value = 1.7; wn.inputs["Detail"].default_value = 5
    wn.inputs["Roughness"].default_value = 0.58; wn.inputs["Distortion"].default_value = 0.35; L(wv.outputs["Vector"], wn.inputs["Vector"])
    # (`tide=False`: a sheet no water has stood on — the settings sheet)
    if tide:
        out = mul(out, ramp(wn.outputs["Fac"], [(0.0, (1, 1, 1)), (0.628, (1, 1, 1)), (0.638, (0.76, 0.65, 0.48)),
                                                 (0.656, (0.95, 0.91, 0.84)), (0.72, (0.93, 0.88, 0.8)), (1.0, (0.91, 0.86, 0.77))]))

    # foxed: rust-brown spots everywhere, small; a few larger
    for scale, size, gate, strength in ((52, 0.07, (0.5, 0.6), 0.6), (17, 0.05, (0.62, 0.7), 0.5)):
        fv = N.new("ShaderNodeTexVoronoi"); fv.inputs["Scale"].default_value = scale; fv.inputs["Randomness"].default_value = 1
        L(tc.outputs["Object"], fv.inputs["Vector"])
        spot = remap(fv.outputs["Distance"], 0.0, size, 1.0, 0.0)
        g = remap(noise(5.5, 4), gate[0], gate[1], 0.0, 1.0)
        f = math_("MULTIPLY", math_("MULTIPLY", spot, g), strength)
        out = mul(out, (0.6, 0.44, 0.27), f)

    # browned deep toward the edges it was handled by: the outer edge, the
    # head and the tail (UV: u out from the spine, v up the page)
    sep = N.new("ShaderNodeSeparateXYZ"); L(tc.outputs["UV"], sep.inputs["Vector"])
    to_out = math_("SUBTRACT", 1.0, sep.outputs["X"])
    to_ht = math_("MULTIPLY", math_("PINGPONG", sep.outputs["Y"], 0.5), 1.3)
    edge = math_("MINIMUM", to_out, to_ht)
    edge = math_("ADD", edge, math_("MULTIPLY_ADD", noise(3.2, 6), 0.09, -0.045))
    brown = remap(edge, 0.0, 0.15, 0.7 * browned, 0.0)
    out = mul(out, (0.7, 0.56, 0.37), brown)
    rim = remap(edge, 0.0, 0.025, 0.5 * browned, 0.0)                        # (the very edge darkest)
    out = mul(out, (0.62, 0.5, 0.36), rim)
    # thumbed: grey-brown at the outer corners, and along the outer edge where it was turned
    cy = math_("MINIMUM", sep.outputs["Y"], math_("SUBTRACT", 1.0, sep.outputs["Y"]))
    cc = N.new("ShaderNodeCombineXYZ"); L(to_out, cc.inputs["X"]); L(cy, cc.inputs["Y"])
    cl = N.new("ShaderNodeVectorMath"); cl.operation = "LENGTH"; L(cc.outputs["Vector"], cl.inputs[0])
    thumb = math_("MULTIPLY", remap(cl.outputs["Value"], 0.02, 0.24, 0.5, 0.0), noise(2.4, 6))
    out = mul(out, (0.58, 0.52, 0.45), thumb)
    turned = math_("MULTIPLY", remap(to_out, 0.0, 0.07, 0.35, 0.0), remap(noise(1.6, 4), 0.4, 0.7, 0.0, 1.0))
    out = mul(out, (0.6, 0.54, 0.46), turned)
    L(out, b.inputs["Base Color"])

    # its surface: the tooth, the crumple, a little grime-dulled
    tn = N.new("ShaderNodeNormalMap"); tn.inputs["Strength"].default_value = 0.7; L(tooth_n.outputs["Color"], tn.inputs["Color"])
    cn = N.new("ShaderNodeNormalMap"); cn.inputs["Strength"].default_value = 0.45; L(crumple.outputs["Color"], cn.inputs["Color"])
    both = N.new("ShaderNodeVectorMath"); both.operation = "ADD"; L(tn.outputs["Normal"], both.inputs[0]); L(cn.outputs["Normal"], both.inputs[1])
    nrm = N.new("ShaderNodeVectorMath"); nrm.operation = "NORMALIZE"; L(both.outputs["Vector"], nrm.inputs[0])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.22; bp.inputs["Distance"].default_value = 0.003
    L(noise(2.6, 3), bp.inputs["Height"]); L(nrm.outputs["Vector"], bp.inputs["Normal"]); L(bp.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.97
    b.inputs["Specular IOR Level"].default_value = 0.06
    b.inputs["Sheen Weight"].default_value = 0.0
    b.inputs["Coat Weight"].default_value = 0.0
    return m
