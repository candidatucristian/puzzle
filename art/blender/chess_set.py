# The chess set of Room III and The Unfinished Game (levels/chessboard): one
# board and one set of pieces, for the room (room_cabin.py) and the level's
# close-up (chess_game.py) alike.
#
# The pieces are Poly Haven's chess_set (CC0) — a Staunton set carved in
# marble — their forms and their carving kept (its normal maps, its occlusion),
# their stone made wood: turned boxwood for white, ebony for black, as the
# level has always had them. Scaled to the board's squares.
#
# The board is made here: squares of maple and walnut veneer, each cut from
# its own piece of the sheet; a line of boxwood stringing round them; a
# walnut frame with the coordinates inlaid in boxwood on all four sides, a–h
# along the near and far edges, 1–8 up the left and right, all reading from
# white's side, which is the side one sits at.
#
# Everything is placed in the room's centimetres (x across, y up, d away from
# white), about the board's middle: build it inside an `assembled` frame to
# stand it anywhere.

import bpy, math, os, random
from mathutils import Vector, Matrix
from kit import *
from room_common import P, M, box_cm

SQ = 5.6                                         # a square, cm
HALF = SQ * 4                                    # half the playing field
STRING = 0.3                                     # the boxwood line round it
FRAME = 4.3                                      # the frame's width
OUTER = HALF + STRING + FRAME                    # half the whole board
THICK = 2.0                                      # how high the board stands
MODEL = f"{ASSETS}/models/chess_set"
FILES = "abcdefgh"

def square_at(f, r):
    """the middle of a square (file 0–7 from a, rank 0–7 from 1): x, d"""
    return -HALF + (f + 0.5) * SQ, -HALF + (r + 0.5) * SQ

def wood(name, tid, tint, bright, sat, rough, size, upright=False, jitter=True, contrast=0.0):
    """a scanned wood, laid by box projection on each piece of it; with
    `jitter` each object shows another part of the sheet (a board's squares
    are each their own piece of veneer)"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / size,) * 3
    if upright: mp.inputs["Rotation"].default_value = (0, math.pi / 2, 0)
    src = tc.outputs["Object"]
    if jitter:
        oi = N.new("ShaderNodeObjectInfo"); off = N.new("ShaderNodeVectorMath"); off.operation = "MULTIPLY_ADD"
        off.inputs[1].default_value = (3.1, 7.3, 1.9)
        L(oi.outputs["Random"], off.inputs[0]); L(src, off.inputs[2]); src = off.outputs["Vector"]
    L(src, mp.inputs["Vector"])
    def tex(kind, colour):
        for folder in ("textures4k", "textures"):
            p = f"{ASSETS}/{folder}/{tid}/{kind}.jpg"
            if os.path.exists(p):
                t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(p, check_existing=True)
                t.image.colorspace_settings.name = "sRGB" if colour else "Non-Color"
                t.projection = "BOX"; t.projection_blend = 0.3
                L(mp.outputs["Vector"], t.inputs["Vector"]); return t
    d = tex("Diffuse", True)
    hs = N.new("ShaderNodeHueSaturation"); hs.inputs["Saturation"].default_value = sat; hs.inputs["Value"].default_value = bright
    if contrast:
        # (a quieter grain: the figure pulled toward its own middle)
        bc_ = N.new("ShaderNodeBrightContrast"); bc_.inputs["Contrast"].default_value = -contrast; bc_.inputs["Bright"].default_value = -0.5 * contrast * 0.62
        L(d.outputs["Color"], bc_.inputs["Color"]); L(bc_.outputs["Color"], hs.inputs["Color"])
    else:
        L(d.outputs["Color"], hs.inputs["Color"])
    tn = N.new("ShaderNodeMix"); tn.data_type = "RGBA"; tn.blend_type = "MULTIPLY"; tn.inputs["Factor"].default_value = 1.0
    tn.inputs[7].default_value = (*tint, 1); L(hs.outputs["Color"], tn.inputs[6])
    L(tn.outputs[2], b.inputs["Base Color"])
    r = tex("Rough", False)
    mr = N.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = rough[0]; mr.inputs["To Max"].default_value = rough[1]
    L(r.outputs["Color"], mr.inputs["Value"]); L(mr.outputs["Result"], b.inputs["Roughness"])
    n = tex("nor_gl", False)
    nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 0.35
    L(n.outputs["Color"], nm.inputs["Color"]); L(nm.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Specular IOR Level"].default_value = 0.4
    m["detailed"] = True
    return m

def turned(name, colour, figure, rough, carving):
    """a piece's wood: close, quiet, a faint grain running up it as it was
    turned; the carving and its hollows the set's own (its normal map, its
    occlusion)"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    uv = N.new("ShaderNodeTexCoord")
    gm = N.new("ShaderNodeMapping"); gm.inputs["Scale"].default_value = (90, 90, 9)
    oi = N.new("ShaderNodeObjectInfo"); off = N.new("ShaderNodeVectorMath"); off.operation = "ADD"
    L(uv.outputs["Object"], off.inputs[0]); L(oi.outputs["Random"], off.inputs[1]); L(off.outputs["Vector"], gm.inputs["Vector"])
    grain = N.new("ShaderNodeTexNoise"); grain.inputs["Scale"].default_value = 1.0; grain.inputs["Detail"].default_value = 6; grain.inputs["Roughness"].default_value = 0.55
    L(gm.outputs["Vector"], grain.inputs["Vector"])
    gr = N.new("ShaderNodeMapRange"); gr.inputs["To Min"].default_value = 1 - figure; gr.inputs["To Max"].default_value = 1 + figure * 0.5
    L(grain.outputs["Fac"], gr.inputs["Value"])
    col = N.new("ShaderNodeMix"); col.data_type = "RGBA"; col.blend_type = "MULTIPLY"; col.inputs["Factor"].default_value = 1.0
    col.inputs[6].default_value = (*colour, 1); L(gr.outputs["Result"], col.inputs[7]); L(col.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough; b.inputs["Specular IOR Level"].default_value = 0.45
    nrm = N.new("ShaderNodeTexImage"); nrm.image = bpy.data.images.load(f"{MODEL}/textures/{carving}_nor_gl_4k.jpg", check_existing=True); nrm.image.colorspace_settings.name = "Non-Color"
    arm = N.new("ShaderNodeTexImage"); arm.image = bpy.data.images.load(f"{MODEL}/textures/{carving}_arm_4k.jpg", check_existing=True); arm.image.colorspace_settings.name = "Non-Color"
    L(uv.outputs["UV"], nrm.inputs["Vector"]); L(uv.outputs["UV"], arm.inputs["Vector"])
    nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 0.8
    L(nrm.outputs["Color"], nm.inputs["Color"]); L(nm.outputs["Normal"], b.inputs["Normal"])
    sep = N.new("ShaderNodeSeparateColor"); L(arm.outputs["Color"], sep.inputs["Color"])
    ao = N.new("ShaderNodeMix"); ao.data_type = "RGBA"; ao.blend_type = "MULTIPLY"; ao.inputs["Factor"].default_value = 0.85
    bc = b.inputs["Base Color"]; L(bc.links[0].from_socket, ao.inputs[6]); L(sep.outputs["Red"], ao.inputs[7]); L(ao.outputs[2], bc)
    return m

BOXWOOD = None; EBONY = None
def materials():
    global BOXWOOD, EBONY, MAPLE, WALNUT_SQ, WALNUT_FRAME, INLAY
    BOXWOOD = turned("boxwood", (0.6, 0.44, 0.24), 0.08, 0.42, "chess_set_pieces_white")
    EBONY = turned("ebony", (0.014, 0.012, 0.011), 0.35, 0.36, "chess_set_pieces_black")
    MAPLE = wood("maple square", "dark_wood", (1.0, 0.82, 0.6), 1.25, 0.4, (0.35, 0.5), 0.35, contrast=0.72)
    WALNUT_SQ = wood("walnut square", "dark_wood", (0.6, 0.43, 0.31), 0.5, 0.75, (0.35, 0.5), 0.35, contrast=0.3)
    WALNUT_FRAME = wood("board frame", "rosewood_veneer1", (0.62, 0.44, 0.33), 0.4, 0.8, (0.35, 0.5), 0.3, jitter=False)
    INLAY = wood("boxwood inlay", "dark_wood", (1.0, 0.85, 0.6), 1.3, 0.4, (0.4, 0.55), 0.2, jitter=False, contrast=0.8)

def board(top_at=0.0):
    """the board, its playing surface `top_at` cm up: frame, stringing,
    squares, the inlaid coordinates; its parts"""
    if BOXWOOD is None: materials()
    y0, y1 = top_at - THICK, top_at
    parts = []
    # the frame: four rails mitred at the corners (as four boxes overlapping)
    for (a, b_, c, e) in ((-OUTER, OUTER, -OUTER, -HALF - STRING), (-OUTER, OUTER, HALF + STRING, OUTER),
                          (-OUTER, -HALF - STRING, -OUTER, OUTER), (HALF + STRING, OUTER, -OUTER, OUTER)):
        parts.append(box_cm("board frame", a, b_, y0, y1, c, e, WALNUT_FRAME, 0.35, keep=False))
    # the stringing round the field, flush
    S0, S1 = HALF, HALF + STRING
    for (a, b_, c, e) in ((-S1, S1, -S1, -S0), (-S1, S1, S0, S1), (-S1, -S0, -S0, S0), (S0, S1, -S0, S0)):
        parts.append(box_cm("stringing", a, b_, y1 - 0.4, y1, c, e, INLAY, keep=False))
    # the bed under the squares, and the squares, each its own piece of veneer
    parts.append(box_cm("board bed", -S0, S0, y0, y1 - 0.25, -S0, S0, WALNUT_FRAME, keep=False))
    for r in range(8):
        for f in range(8):
            x, d = square_at(f, r)
            dark = (f + r) % 2 == 0                # (a1 dark, h1 light)
            parts.append(box_cm("square", x - SQ / 2, x + SQ / 2, y1 - 0.25, y1, d - SQ / 2, d + SQ / 2, WALNUT_SQ if dark else MAPLE, keep=False))
    # the coordinates, inlaid: letters along the near and far rails, figures
    # up the left and the right, all upright to one sitting at white's side
    font = bpy.data.fonts.load("C:/Windows/Fonts/timesbd.ttf", check_existing=True)
    mid = HALF + STRING + FRAME / 2
    def inlay(ch, x, d):
        cu = bpy.data.curves.new(f"coordinate {ch}", "FONT"); cu.body = ch; cu.font = font
        cu.size = M(3.1); cu.align_x = "CENTER"; cu.align_y = "CENTER"
        o = link(bpy.data.objects.new(f"coordinate {ch}", cu)); o.data.materials.append(INLAY)
        o.location = P(x, y1 + 0.004, d)
        parts.append(o)
    for k in range(8):
        x, _ = square_at(k, 0); _, d = square_at(0, k)
        inlay(FILES[k], x, -mid); inlay(FILES[k], x, mid)
        inlay(str(k + 1), -mid, d); inlay(str(k + 1), mid, d)
    return parts

# ── the pieces ─────────────────────────────────────────────────────────────
TEMPLATES = {}
KINDS = {"K": "king", "Q": "queen", "R": "rook", "B": "bishop", "N": "knight", "P": "pawn"}
def templates():
    """the set's pieces, one mesh of each kind and colour, stood with its
    foot's middle at the origin, scaled to these squares, white's facing
    toward white (toward -d), its own stone left off"""
    if TEMPLATES: return TEMPLATES
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=f"{MODEL}/chess_set.gltf")
    new = [o for o in bpy.data.objects if o not in before]
    bpy.context.view_layer.update()
    k = SQ / 5.79                                 # (the set's squares are 5.79 cm)
    turn = Matrix.Rotation(math.pi, 4, "Z")       # (its white sat at +y: ours sits at -d)
    for kind, word in KINDS.items():
        for white in (True, False):
            name = f"piece_{word}_{'white' if white else 'black'}"
            src = next(o for o in new if o.name.startswith(name))
            me = src.data.copy(); me.name = f"{word} {'white' if white else 'black'}"
            me.transform(src.matrix_world)
            co = [v.co for v in me.vertices]
            cx = (min(c.x for c in co) + max(c.x for c in co)) / 2; cy = (min(c.y for c in co) + max(c.y for c in co)) / 2; z0 = min(c.z for c in co)
            me.transform(Matrix.Translation((-cx, -cy, -z0)))
            me.transform(turn @ Matrix.Scale(k, 4))
            me.materials.clear(); me.materials.append(BOXWOOD if white else EBONY)
            for p in me.polygons: p.use_smooth = True
            TEMPLATES[(kind, white)] = me
    for o in new: bpy.data.objects.remove(o, do_unlink=True)
    return TEMPLATES

def piece(kind, white, f, r, top_at=0.0, turn=0.0, nudge=(0.0, 0.0)):
    """one piece stood on its square (file f, rank r), turned `turn` radians,
    off its middle by `nudge` cm"""
    if BOXWOOD is None: materials()
    me = templates()[(kind, white)]
    x, d = square_at(f, r)
    o = link(bpy.data.objects.new(f"{'white' if white else 'black'} {KINDS[kind]} {FILES[f]}{r + 1}", me))
    o.location = P(x + nudge[0], top_at, d + nudge[1]); o.rotation_euler = (0, 0, turn)
    return o

def game(moves, top_at=0.0, seed=1851):
    """the pieces of a game left as it stood: (file, rank, white?, kind) each,
    none of them set quite straight or quite in the middle of its square —
    the knights turned to show their heads"""
    rnd = random.Random(seed)
    out = []
    for (f, r, white, kind) in moves:
        turn = rnd.uniform(-0.25, 0.25)
        if kind == "N": turn += 0.9 if white else -0.9
        out.append(piece(kind, white, f, r, top_at, turn, (rnd.uniform(-0.35, 0.35), rnd.uniform(-0.35, 0.35))))
    return out
