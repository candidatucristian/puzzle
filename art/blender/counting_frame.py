# The counting frame (levels/abacus), close to: Orion's old frame lying on his
# oak workbench in Room XI, under the green lamp at the bench's end — built in
# three dimensions (counting_frame_model.py, as Room XI has it too) and
# rendered with Cycles. Beside it on the bench his notebook and pencil, and a
# magnifying glass.
#
# Rendered: the plate, without its blocks; and the blocks alone, all against
# the left rod, all in the middle, all against the right — each with its own
# shadow on the board (the board catches it; everything else is held out and
# casts none, the plate having those). Where each block falls in the picture
# at each of its three places, and where it is cut out of those renders into
# the game's atlas, is written beside them (countingFrame.json;
# counting_frame_publish.mjs).
#
#   blender -b --factory-startup -P art/blender/counting_frame.py -- [--samples 384] [--width 2560] [--still 1]

import bpy, math, os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *
from counting_frame_model import *

OUT = os.path.join(ROOT, ".artifacts/counting-frame")
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "384"))
WIDTH = int(arg("--width", "2560"))
STILL = arg("--still", "")

scene, HEIGHT = stage(WIDTH, eye=(0, float(arg("--ey", "60")), float(arg("--ed", "-52"))), look=(0, 0, float(arg("--ld", "5"))), lens=float(arg("--lens", "36")))

# ── the bench, the frame on it, and beside it his glass, notebook, pencil ──
OAK_X = dusted(scan("oak across", "dark_wood", size=0.8, tint=(0.78, 0.62, 0.48), bright=0.42, sat=0.75, rough=(0.3, 0.55), bump=0.3, coat=0.2), 0.1)
box_cm("bench", -80, 80, -4, 0, -60, 60, OAK_X, 0.6)
FRAME = Frame(dust=float(arg("--dust", "0.9")))
import_model("magnifying_glass_01", height=M(24), at=tuple(P(27, 0.9, 25)), rot=2.5, tilt=(math.pi / 2, 0.0))
COVERS = cover_materials()
assembled("notebook", lambda: (
    box_cm("notebook", -8, 8, 0, 1.6, -11, 11, COVERS[1], 0.4, keep=False),
    box_cm("notebook pages", -7.7, 7.6, 0.15, 1.45, -10.7, 10.7, plain("pages", (0.62, 0.57, 0.46), rough=0.9), 0.1, keep=False),
), at=(-31, 0, 29), turn=math.radians(14))
pencil = cylinder("pencil", 0, 0, -M(8), M(8), M(0.36), plain("pencil", (0.55, 0.38, 0.12), rough=0.5), verts=6)
pencil.rotation_euler = (0, math.pi / 2, math.radians(-30)); pencil.location = P(-30, 1.95, 27)

# ── light: the green lamp at the bench's end, high on the left; the moon ───
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.003, 0.004, 0.008, 1)
LAMP_AT = P(float(arg("--lx", "-30")), float(arg("--ly", "46")), float(arg("--ld2", "24")))
lamp_l = lamp("the lamp", "AREA", tuple(LAMP_AT), aim=tuple(P(2, 0, -2)), energy=float(arg("--lamp", "3.5")), colour=(1.0, 0.78, 0.52), size=0.16)
lamp_l.data.spread = math.radians(float(arg("--spread", "100")))
fill_l = lamp("fill", "AREA", tuple(P(40, 90, -70)), aim=tuple(P(0, 0, 0)), energy=float(arg("--fill", "1")), colour=(0.8, 0.85, 1.0), size=1.4)
fill_l.visible_camera = False; fill_l.visible_glossy = False

# ── where everything fell in the picture ───────────────────────────────────
bpy.context.view_layer.update()
K = WIDTH / RW                                 # render pixels a reference pixel
SHADOW = 1.5                                   # cm round a block its shadow may reach
blocks = []
for o, space, row in FRAME.blocks:
    per = []
    for place in range(3):
        cx, cv = block_x(space, place), block_v(row)
        pts = [project(P(cx + sx * (BW / 2 + SHADOW), BASE, D(cv + sv * (BL / 2 + SHADOW)))) for sx in (-1, 1) for sv in (-1, 1)]
        pts += [project(P(cx + sx * BW / 2, BLOCK_TOP, D(cv + sv * BL / 2))) for sx in (-1, 1) for sv in (-1, 1)]
        X0 = max(0, math.floor(min(p[0] for p in pts) * K)); Y0 = max(0, math.floor(min(p[1] for p in pts) * K))
        X1 = min(WIDTH, math.ceil(max(p[0] for p in pts) * K)); Y1 = min(HEIGHT, math.ceil(max(p[1] for p in pts) * K))
        top = [list(project(P(cx + sx * BW / 2, BLOCK_TOP, D(cv + sv * BL / 2)))) for sx, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        per.append({"crop": [X0, Y0, X1 - X0, Y1 - Y0], "box": [round(X0 / K, 3), round(Y0 / K, 3), round((X1 - X0) / K, 3), round((Y1 - Y0) / K, 3)],
                    "centre": list(project(P(cx, BLOCK_TOP, D(cv)))), "top": top})
    blocks.append({"space": space, "row": row, "places": per})
SW = max(p["crop"][2] for b in blocks for p in b["places"]); SH = max(p["crop"][3] for b in blocks for p in b["places"])
for i, b in enumerate(blocks):
    for k, p in enumerate(b["places"]): p["frame"] = [i * SW, k * SH, p["crop"][2], p["crop"][3]]
x0, x1, v0, v1 = BOARD["x0"], BOARD["x1"], BOARD["v0"], BOARD["v1"]
safe = box_of([P(x, BASE, D(v)) for x in (x0 - RIM, x1 + RIM) for v in (v0 - RIM, v1 + RIM)], pad=6)
data = {"version": 1, "width": RW, "height": RH, "safe": safe, "atlas": [SW * len(blocks), SH * 3], "blocks": blocks}
with open(os.path.join(OUT, "countingFrame.json"), "w") as f: json.dump(data, f, indent=1)

# ── render ─────────────────────────────────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "0.0")), glare=False)
finish(scene, SAMPLES, keep_gloss=("board", "frame brass"))
clear_glass()
BLOCKS = [o for o, *_ in FRAME.blocks]
if STILL:
    render(scene, os.path.join(OUT, "still.png"))
else:
    # the plate: the frame without its blocks
    for o in BLOCKS: o.hide_render = True
    render(scene, os.path.join(OUT, "plate.png"))
    # the blocks alone at each of their three places, their shadows on the board
    for o in BLOCKS: o.hide_render = False
    for o in scene.objects:
        if o.type in ("MESH", "CURVE") and o not in BLOCKS and o is not FRAME.board: o.is_holdout = True; o.visible_shadow = False
    FRAME.board.is_shadow_catcher = True
    scene.render.film_transparent = True; scene.render.image_settings.color_mode = "RGBA"
    for place in range(3):
        FRAME.place(lambda space, row, place=place: place)
        render(scene, os.path.join(OUT, f"blocks-{place}.png"))
print("FRAME_DONE")
