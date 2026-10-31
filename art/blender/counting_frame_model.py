# Orion's counting frame (levels/abacus), as both its close-up
# (counting_frame.py) and Room XI (room_physics.py) build it: a walnut frame
# round a white enamelled board, five ebony rods lying along it making four
# spaces, two brass wires across them, and on the wires in each space two
# black blocks — one high, one low — each against the left rod, in the middle
# or against the right. It has lain on his bench for years: the board is grey
# with dust, except where each block stood all that time, a clean place the
# size of the block (src/levels/abacus/puzzle.json: where they stood, and
# where they lie now).
#
# In its own cm, built about the origin: x across, v along it from the
# figures' foot (d = v - 10.5 in the room's terms, so it is centred), y up
# from whatever it lies on.

import bpy, math, os, json
import numpy as np
from kit import *
from room_common import *

with open(os.path.join(ROOT, "src/levels/abacus/puzzle.json")) as f: PUZZLE = json.load(f)
MARKS, START = PUZZLE["marks"], PUZZLE["start"]

CELL, SPACES, ROD_R = 9.0, PUZZLE["cells"], 0.38
FIG_H = 21.0                                   # the figures' height, foot to head
ROWS = {0: (12.8, 18.2), 1: (2.8, 8.2)}        # each row's counter: high (0), low (1)
BW, BL, BT = 2.66, 5.2, 1.1                    # a block: across, along, thick
BASE = 1.0                                     # the board's face, over what it lies on
BOARD = dict(x0=-21, x1=21, v0=-3, v1=24)
RIM = 2.4
DUST = (0.36, 0.33, 0.28)
def D(v): return v - FIG_H / 2
def rod_x(k): return -CELL * SPACES / 2 + CELL * k
def block_x(space, place):
    inner = CELL - 2 * ROD_R
    return rod_x(space) + ROD_R + inner / 3 * (place + 0.5)
def block_v(row): return sum(ROWS[row]) / 2
BLOCK_TOP = BASE + 0.12 + BT

def dusted(mat, amount, scale=40.0):
    """dust settled on whatever faces up, thicker in places"""
    N = mat.node_tree.nodes; Lk = mat.node_tree.links.new
    b = next(n for n in N if n.type == "BSDF_PRINCIPLED"); bc = b.inputs["Base Color"]
    geo = N.new("ShaderNodeNewGeometry"); sep = N.new("ShaderNodeSeparateXYZ"); Lk(geo.outputs["Normal"], sep.inputs["Vector"])
    up = N.new("ShaderNodeMapRange"); up.inputs["From Min"].default_value = 0.35; up.inputs["From Max"].default_value = 0.95
    Lk(sep.outputs["Z"], up.inputs["Value"])
    tc = N.new("ShaderNodeTexCoord"); nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = scale; nz.inputs["Detail"].default_value = 8
    Lk(tc.outputs["Object"], nz.inputs["Vector"])
    nr = N.new("ShaderNodeMapRange"); nr.inputs["From Min"].default_value = 0.35; nr.inputs["From Max"].default_value = 0.7; nr.inputs["To Min"].default_value = 0.5
    Lk(nz.outputs["Fac"], nr.inputs["Value"])
    m1 = N.new("ShaderNodeMath"); m1.operation = "MULTIPLY"; Lk(up.outputs["Result"], m1.inputs[0]); Lk(nr.outputs["Result"], m1.inputs[1])
    m2 = N.new("ShaderNodeMath"); m2.operation = "MULTIPLY"; m2.inputs[1].default_value = amount; Lk(m1.outputs[0], m2.inputs[0])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.inputs[7].default_value = (*DUST, 1)
    if bc.is_linked: Lk(bc.links[0].from_socket, mix.inputs[6])
    else: mix.inputs[6].default_value = bc.default_value[:]
    Lk(m2.outputs[0], mix.inputs["Factor"]); Lk(mix.outputs[2], bc)
    return mat

def board_material(dust=0.9, px_cm=48):
    """the board: white enamel under years of dust, but clean where the
    blocks stood, and the dust banked against the rods and the rim"""
    bw_, bh_ = BOARD["x1"] - BOARD["x0"], BOARD["v1"] - BOARD["v0"]
    W_, H_ = bw_ * px_cm, bh_ * px_cm
    X, V = np.meshgrid(BOARD["x0"] + (np.arange(W_) + 0.5) / px_cm, BOARD["v0"] + (np.arange(H_) + 0.5) / px_cm)  # (row 0 the near edge, as Blender keeps an image)
    def soft_box(cx, cv, hx, hv, edge):
        return np.clip((hx - np.abs(X - cx)) / edge + 0.5, 0, 1) * np.clip((hv - np.abs(V - cv)) / edge + 0.5, 0, 1)
    clean = np.zeros_like(X)
    for space, places in enumerate(MARKS):
        for row, place in enumerate(places):
            clean = np.maximum(clean, 0.94 * soft_box(block_x(space, place), block_v(row), BW / 2 - 0.1, BL / 2 - 0.1, 0.28))
    for row in ROWS:                           # (a hair of clean board under each wire)
        clean = np.maximum(clean, 0.3 * np.exp(-((V - block_v(row)) / 0.05) ** 2))
    heap = np.zeros_like(X)
    along = np.clip(np.minimum(V, FIG_H - V) / 0.3 + 0.5, 0, 1)
    for k in range(SPACES + 1):
        heap = np.maximum(heap, along * np.exp(-np.maximum(np.abs(X - rod_x(k)) - ROD_R * 0.6, 0) / 0.35))
    heap = np.maximum(heap, np.exp(-np.minimum.reduce([X - BOARD["x0"], BOARD["x1"] - X, V - BOARD["v0"], BOARD["v1"] - V]) / 0.6))
    img = bpy.data.images.new("dust marks", W_, H_, alpha=False, float_buffer=True); img.colorspace_settings.name = "Non-Color"
    px = np.zeros((H_, W_, 4), dtype=np.float32); px[..., 0] = clean; px[..., 1] = heap; px[..., 3] = 1
    img.pixels.foreach_set(px.ravel())
    m = bpy.data.materials.new("board"); m.use_nodes = True
    N = m.node_tree.nodes; Lk = m.node_tree.links.new; b = N["Principled BSDF"]
    t = N.new("ShaderNodeTexImage"); t.image = img; t.interpolation = "Cubic"
    s = N.new("ShaderNodeSeparateColor"); Lk(t.outputs["Color"], s.inputs["Color"])
    tc = N.new("ShaderNodeTexCoord")
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 6; nz.inputs["Detail"].default_value = 6; Lk(tc.outputs["Object"], nz.inputs["Vector"])
    nr = N.new("ShaderNodeMapRange"); nr.inputs["From Min"].default_value = 0.35; nr.inputs["From Max"].default_value = 0.65; nr.inputs["To Min"].default_value = 0.62; Lk(nz.outputs["Fac"], nr.inputs["Value"])
    sp = N.new("ShaderNodeTexNoise"); sp.inputs["Scale"].default_value = 900; sp.inputs["Detail"].default_value = 2; Lk(tc.outputs["Object"], sp.inputs["Vector"])
    sr = N.new("ShaderNodeMapRange"); sr.inputs["From Min"].default_value = 0.55; sr.inputs["From Max"].default_value = 0.75; sr.inputs["To Min"].default_value = 0.0; sr.inputs["To Max"].default_value = 0.25; Lk(sp.outputs["Fac"], sr.inputs["Value"])
    def op(kind, a, b_):
        n = N.new("ShaderNodeMath"); n.operation = kind; n.use_clamp = True
        for i, v in enumerate((a, b_)):
            if isinstance(v, (int, float)): n.inputs[i].default_value = v
            else: Lk(v, n.inputs[i])
        return n.outputs[0]
    lies = op("SUBTRACT", 1.0, s.outputs["Red"])                          # where the dust lies
    amount = op("ADD", op("MULTIPLY", op("MULTIPLY", lies, nr.outputs["Result"]), dust), op("MULTIPLY", s.outputs["Green"], 0.32))
    amount = op("ADD", amount, op("MULTIPLY", sr.outputs["Result"], lies))
    mc = N.new("ShaderNodeMix"); mc.data_type = "RGBA"; mc.inputs[6].default_value = (0.83, 0.81, 0.75, 1); mc.inputs[7].default_value = (*DUST, 1)
    Lk(amount, mc.inputs["Factor"]); Lk(mc.outputs[2], b.inputs["Base Color"])
    mr = N.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = 0.26; mr.inputs["To Max"].default_value = 0.92; Lk(amount, mr.inputs["Value"]); Lk(mr.outputs["Result"], b.inputs["Roughness"])
    b.inputs["Coat Weight"].default_value = 0.0
    return m

class Frame:
    """The frame, built about the origin: `board` (the board's face), `blocks`
    [(object, space, row)], and `place(where)` to set every block."""
    def __init__(self, dust=0.9):
        walnut = dusted(scan("frame walnut", "rosewood_veneer1", size=0.5, tint=(0.5, 0.33, 0.24), bright=0.36, sat=0.85, rough=(0.3, 0.5), bump=0.25, coat=0.2, upright=True), 0.14)
        walnut_x = dusted(scan("frame walnut across", "rosewood_veneer1", size=0.5, tint=(0.5, 0.33, 0.24), bright=0.36, sat=0.85, rough=(0.3, 0.5), bump=0.25, coat=0.2), 0.14)
        ebony = dusted(plain("ebony", (0.014, 0.012, 0.011), rough=0.55, spec=0.25), 0.08)
        lacquer = dusted(plain("black lacquer", (0.006, 0.006, 0.007), rough=0.82, spec=0.08), 0.04)   # (a dead black: it gives back almost nothing)
        brass = dusted(aged_metal("frame brass", (0.6, 0.43, 0.19), (0.08, 0.06, 0.03), rough=(0.2, 0.45), scale=60, tarnish=0.5), 0.18)
        x0, x1, v0, v1 = BOARD["x0"], BOARD["x1"], BOARD["v0"], BOARD["v1"]
        box_cm("frame base", x0 - RIM, x1 + RIM, 0, BASE, D(v0 - RIM), D(v1 + RIM), walnut_x, 0.4, keep=False)
        self.board = card("board", [P(x0, BASE + 0.01, D(v0)), P(x1, BASE + 0.01, D(v0)), P(x1, BASE + 0.01, D(v1)), P(x0, BASE + 0.01, D(v1))], board_material(dust))
        for (a, b_, c, e, m_) in ((x0 - RIM, x1 + RIM, v0 - RIM, v0, walnut_x), (x0 - RIM, x1 + RIM, v1, v1 + RIM, walnut_x), (x0 - RIM, x0, v0, v1, walnut), (x1, x1 + RIM, v0, v1, walnut)):
            box_cm("rim", a, b_, BASE, BASE + 1.5, D(c), D(e), m_, 0.45, keep=False)
        for sx in (-1, 1):
            for sv in (-1, 1):
                cx_, cv_ = (x1 + RIM / 2) * sx, (v0 + v1) / 2 + sv * ((v1 - v0) / 2 + RIM / 2)
                box_cm("corner plate", cx_ - RIM / 2 + 0.15, cx_ + RIM / 2 - 0.15, BASE + 1.5, BASE + 1.58, D(cv_ - RIM / 2 + 0.15), D(cv_ + RIM / 2 - 0.15), brass, 0.1, keep=False)
        # the rods, lying along it, brass at their ends; the wires across, through them
        for k in range(SPACES + 1):
            x_ = rod_x(k)
            rod("rod", P(x_, BASE + ROD_R, D(0.25)), P(x_, BASE + ROD_R, D(FIG_H - 0.25)), M(ROD_R), ebony, verts=20)
            for vv in (0.0, FIG_H - 0.5):
                rod("ferrule", P(x_, BASE + ROD_R, D(vv)), P(x_, BASE + ROD_R, D(vv + 0.5)), M(ROD_R + 0.04), brass, verts=20)
        for row in ROWS:
            rod("wire", P(x0 - 0.5, BASE + 0.12 + BT / 2, D(block_v(row))), P(x1 + 0.5, BASE + 0.12 + BT / 2, D(block_v(row))), M(0.055), brass, verts=8)
        # the blocks, built about their middle, set where they are
        self.blocks = []
        for space in range(SPACES):
            for row in (0, 1):
                o = box(f"block {space} {row}", M(-BW / 2), M(BW / 2), M(-BL / 2), M(BL / 2), M(BASE + 0.12), M(BLOCK_TOP), lacquer)
                bevel(o, M(0.16), 3)
                self.blocks.append((o, space, row))
        self.place(lambda space, row: START[space][row])
    def place(self, where):
        """every block to its place: `where(space, row)` → 0, 1, 2"""
        for o, space, row in self.blocks:
            o.location = (M(block_x(space, where(space, row))), M(D(block_v(row))), 0)
