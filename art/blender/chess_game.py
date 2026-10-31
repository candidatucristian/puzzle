# The Unfinished Game (levels/chessboard), close to: the games table in Room
# III, the captain's cabin, looked down on from white's side of the board —
# as room_cabin.py has it: the mahogany table on its pedestal, the board and
# the game left on it (chess_set.py; the level's CHESS_PIECES), the candle
# in its brass stick at the far corner, alight; the deck under it, the blue
# rug, the chair drawn up on the left; the moon in through the ports on the
# left, the storm lantern's red far off behind.
#
# Rendered: the plate, the board without its pieces; then each piece alone,
# cut to its own place (everything else held out), and each piece's shadow
# alone (caught by the board and the table, the piece itself unseen) — the
# game lays them back on and lets a piece be lifted. Where it all fell in the
# picture is written beside them (chessGame.json; chess_game_publish.mjs packs
# the pieces into one atlas).
#
#   blender -b --factory-startup -P art/blender/chess_game.py -- [--samples 700] [--width 2560] [--still 1] [--preview 1]

import bpy, math, os, sys, json
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *
import chess_set as chess

OUT = os.path.join(ROOT, ".artifacts/chess-game")
os.makedirs(OUT, exist_ok=True)
PREVIEW = arg("--preview", "") == "1"
STILL = arg("--still", "") or ("1" if PREVIEW else "")
SAMPLES = int(arg("--samples", "48" if PREVIEW else "700"))
WIDTH = int(arg("--width", "1280" if PREVIEW else "2560"))

# the game as the level leaves it: file, rank, white?, which piece
GAME = [(7, 0, True, "R"), (4, 1, True, "K"), (0, 2, True, "P"), (3, 3, False, "Q"), (0, 4, False, "K"), (2, 5, False, "N"), (7, 6, True, "B"), (4, 7, False, "B")]
TABLE = dict(s=70, h=70)                           # the games table, as room_cabin.py
TOP = TABLE["h"] + chess.THICK                    # the board's playing surface
CANDLE = (30.5, 30.5)                             # the candle, at the table's far right corner

# ── where we are: over white's side, looking down at the board ─────────────
EL, DIST = math.radians(float(arg("--el", "47"))), float(arg("--dist", "150"))
AIM = (0.0, TOP + 2.0, float(arg("--aimd", "3")))
EYE = (AIM[0], AIM[1] + DIST * math.sin(EL), AIM[2] - DIST * math.cos(EL))
scene, HEIGHT = stage(WIDTH, eye=EYE, look=AIM, lens=float(arg("--lens", "50")))

# ── materials ──────────────────────────────────────────────────────────────
MAHOGANY = scan("mahogany", "rosewood_veneer1", size=0.7, tint=(0.75, 0.48, 0.34), bright=0.46, sat=0.85, rough=(0.3, 0.5), bump=0.2, coat=0.2, upright=True, edges=0.25)
MAHOGANY_X = scan("mahogany top", "rosewood_veneer1", size=0.7, tint=(0.75, 0.48, 0.34), bright=0.44, sat=0.85, rough=(0.3, 0.5), bump=0.2, coat=0.2, edges=0.3, dust=0.1)
DECK = scan("deck planks", "wood_floor_worn", size=2.6, tint=(0.75, 0.62, 0.48), bright=0.45, rough=(0.3, 0.6), bump=0.6, coat=0.1)
BRASS = aged_metal("brass", (0.6, 0.42, 0.18), (0.08, 0.06, 0.03), rough=(0.2, 0.48), scale=30, tarnish=0.5)
WAX = bpy.data.materials.new("wax"); WAX.use_nodes = True
_w = WAX.node_tree.nodes["Principled BSDF"]; _w.inputs["Base Color"].default_value = (0.82, 0.74, 0.58, 1); _w.inputs["Subsurface Weight"].default_value = 0.6; _w.inputs["Subsurface Radius"].default_value = (0.02, 0.012, 0.006); _w.inputs["Roughness"].default_value = 0.42
WICK = plain("wick", (0.01, 0.01, 0.01), rough=0.9)

# ── the deck, the rug, the chair; the table; the board on it ───────────────
box_cm("deck", -300, 300, -6, 0, -200, 300, DECK)
rug(-140, 120, -110, 150, rug_material("rug", f"{ASSETS}/textures/persian_rug.jpg", tint=(0.35, 0.45, 0.9), sat=0.85, value=0.26))
import_model("gallinera_chair", height=M(103), at=tuple(P(-74, 0, 18)), rot=math.pi / 2 + 0.45)
s, h = TABLE["s"], TABLE["h"]
box_cm("games top", -s / 2, s / 2, h - 4, h, -s / 2, s / 2, MAHOGANY_X, 0.8)
box_cm("games apron", -s / 2 + 3, s / 2 - 3, h - 12, h - 4, -s / 2 + 3, s / 2 - 3, MAHOGANY, 0.4)
lathe("pedestal", [(0, 0), (0.05, 0), (0.07, 0.06), (0.045, 0.12), (0.04, 0.3), (0.055, 0.4), (0.04, 0.5), (0.05, M(h - 12)), (0, M(h - 12))], MAHOGANY, steps=32)
for k in range(4):
    tube("foot", [(0.03, 0.08), (0.14, 0.05), (0.24, 0.015)], 0.016, MAHOGANY, rot=k / 4 * math.tau + math.pi / 4)
BOARD = chess.board(TOP)
PIECES = chess.game(GAME, TOP)

# the candle at the far corner, in a brass stick, guttered a little
cx, cd = CANDLE
lathe("candlestick", [(0, 0), (0.045, 0), (0.047, 0.006), (0.02, 0.012), (0.012, 0.05), (0.018, 0.06), (0.012, 0.065), (0.014, 0.075), (0, 0.075)], BRASS, at=tuple(P(cx, h, cd)), steps=40)
WICK_TOP = h + 13.0                               # (burnt half down)
cylinder("candle", M(cx), M(cd), M(h + 7), M(WICK_TOP), M(1.0), WAX, verts=32)
for k in range(2):
    a = 0.8 + k * 2.3; L_ = 2.5 + k
    sphere("drip", tuple(P(cx + math.cos(a), WICK_TOP - L_ / 2, cd + math.sin(a))), M(0.3), WAX, squash=(1, 1, L_ / 0.6))
cylinder("wick", M(cx), M(cd), M(WICK_TOP - 0.2), M(WICK_TOP + 0.8), M(0.07), WICK, verts=6)
FLAME_AT = P(cx, WICK_TOP + 2.0, cd)

# ── light: the candle; the moon through the ports on the left; the lantern's
# red far behind; a little of the cabin's own dark ─────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.003, 0.004, 0.008, 1)
candle_l = lamp("candle", "POINT", tuple(FLAME_AT), energy=float(arg("--candle", "4")), colour=(1.0, 0.56, 0.24), size=0.01)
moon = lamp("the moon", "AREA", tuple(P(-240, 150, 60)), aim=tuple(P(0, TOP, 0)), energy=float(arg("--moon", "140")), colour=(0.55, 0.68, 1.0), size=0.34)
moon.visible_camera = False; moon.visible_glossy = False
lantern = lamp("the lantern", "POINT", tuple(P(-110, 150, 210)), energy=float(arg("--lantern", "25")), colour=(1.0, 0.35, 0.18), size=0.05)
fill = lamp("fill", "AREA", tuple(P(30, 190, -90)), aim=tuple(P(0, TOP, 0)), energy=float(arg("--fill", "20")), colour=(0.8, 0.85, 1.0), size=1.6)
fill.visible_camera = False; fill.visible_glossy = False

# the lens: focused on the middle of the board, stopped down
cam = scene.camera
cam.data.dof.use_dof = True
cam.data.dof.focus_distance = (P(*AIM) - P(*EYE)).length
cam.data.dof.aperture_fstop = float(arg("--fstop", "11"))

# ── where everything fell in the picture ───────────────────────────────────
bpy.context.view_layer.update()
K = WIDTH / RW                                   # render pixels a reference pixel
def px_box(points, pad=4):
    """the render's pixels round some places (Blender points), a few spare"""
    qs = [project(p) for p in points]
    X0_, Y0_ = max(0, math.floor(min(q[0] for q in qs) * K) - pad), max(0, math.floor(min(q[1] for q in qs) * K) - pad)
    X1_, Y1_ = min(WIDTH, math.ceil(max(q[0] for q in qs) * K) + pad), min(HEIGHT, math.ceil(max(q[1] for q in qs) * K) + pad)
    return [X0_, Y0_, X1_ - X0_, Y1_ - Y0_]
def ref(crop):
    return [round(v / K, 3) for v in crop]
LIGHT = candle_l.location.copy(); MOON_DIR = (moon.matrix_world.to_3x3() @ Vector((0, 0, -1))).normalized()
def shadow_points(o):
    """where a piece's shadow can fall on the board: its corners carried down
    from the candle, and along the moon's light, to the board's surface"""
    zb = M(TOP); pts = []
    for c in object_corners(o):
        pts.append(Vector((c.x, c.y, zb)))
        if LIGHT.z > c.z + 0.005:
            t = (LIGHT.z - zb) / (LIGHT.z - c.z); pts.append(LIGHT + (c - LIGHT) * t)
        if MOON_DIR.z < -0.05:
            t = (c.z - zb) / -MOON_DIR.z; pts.append(c + MOON_DIR * t)
    # (clipped to the table: a shadow falls no further)
    lim = M(TABLE["s"] / 2)
    return [Vector((max(-lim, min(lim, p.x)), max(-lim, min(lim, p.y)), p.z)) for p in pts]
pieces = []
for o, (f, r, white, kind) in zip(PIECES, GAME):
    body = px_box(object_corners(o), 5)
    shade = px_box(shadow_points(o), 14)
    foot = o.location.copy()
    up = [round(b - a, 3) for a, b in zip(project(foot), project(foot + Vector((0, 0, 0.01))))]
    pieces.append({"square": f"{chess.FILES[f]}{r + 1}", "kind": kind, "white": white, "rank": r + 1,
                   "crop": body, "box": ref(body), "shadowCrop": shade, "shadowBox": ref(shade),
                   "hit": [list(q) for q in outline(object_corners(o))], "up": up})
outer = chess.OUTER
safe = box_of([P(x, TOP, d) for x in (-outer, outer) for d in (-outer, outer)] + [c for o in PIECES for c in object_corners(o)], pad=10)
wick = P(cx, WICK_TOP + 0.8, cd)
layout = {"version": 1, "width": RW, "height": RH, "safe": safe, "pieces": pieces,
          "flame": {"x": project(wick)[0], "y": project(wick)[1], "s": scale_at(wick)}}
with open(os.path.join(OUT, "chessGame.json"), "w") as fh: json.dump(layout, fh, indent=1)

# ── render ─────────────────────────────────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "0.4")), glare=False)   # (no glow: the pieces must match the plate)
finish(scene, SAMPLES)
if PREVIEW: scene.cycles.adaptive_min_samples = 16
def region(crop):
    """render only `crop` (render pixels: x, y from the top, w, h), or all"""
    rr = scene.render
    if crop is None: rr.use_border = False; rr.use_crop_to_border = False; return
    x, y, w, hh = crop
    rr.use_border = True; rr.use_crop_to_border = True
    rr.border_min_x, rr.border_max_x = (x + 0.25) / WIDTH, (x + w + 0.25) / WIDTH
    rr.border_min_y, rr.border_max_y = (HEIGHT - y - hh + 0.25) / HEIGHT, (HEIGHT - y + 0.25) / HEIGHT
SURFACES = set(BOARD) | {bpy.data.objects["games top"]}
def solid():
    return [o for o in scene.objects if o.type in ("MESH", "CURVE", "FONT")]
if STILL:
    render(scene, os.path.join(OUT, "still.png"))
else:
    for o in PIECES: o.hide_render = True
    render(scene, os.path.join(OUT, "plate.png"))
    scene.render.film_transparent = True; scene.render.image_settings.color_mode = "RGBA"
    for i, o in enumerate(PIECES):
        # the piece alone, everything round it held out
        for q in PIECES: q.hide_render = q is not o
        for q in solid():
            q.is_holdout = q not in PIECES; q.is_shadow_catcher = False; q.visible_camera = True; q.visible_shadow = True
        region(pieces[i]["crop"]); render(scene, os.path.join(OUT, f"piece-{i}.png"))
        # its shadow alone: the board and the table catch it, the piece unseen
        for q in solid():
            q.is_holdout = q not in SURFACES and q is not o
            q.is_shadow_catcher = q in SURFACES
            q.visible_shadow = q is o              # (only the piece casts)
        o.visible_camera = False
        region(pieces[i]["shadowCrop"]); render(scene, os.path.join(OUT, f"shadow-{i}.png"))
        o.visible_camera = True
    region(None)
print("CHESS_GAME_DONE")
