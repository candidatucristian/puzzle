# Rewind (levels/rewind), close to: Orion's windowsill in Room XI at night,
# seen level from a step away — his four ways of keeping time standing on it
# (rewind_model.py: the brass clock, the tear-off calendar, the sand-glass,
# the candle-clock), the lower sash behind them and the wet garden beyond, the
# moon over the trees. The window, its sill and the panelling under it are
# built as room_physics.py builds them, in the room's own cm.
#
# Rendered: the plate, everything as it lies now (puzzle.json `from`), the
# clock without its hands; then what the game moves or reveals, each cut to
# its own place in the picture — the hour hand and the minute hand (at
# twelve, alone, the game turns them), each calendar page from the one after
# the first back to the last (alone, the game lays them on), the sand-glass
# with its sand gone back up, and the candle grown back. Where everything
# fell in the picture is written beside them (rewindSill.json;
# rewind_publish.mjs packs the pieces into one atlas).
#
#   node art/blender/rewind_boards.mjs
#   blender -b --factory-startup -P art/blender/rewind_sill.py -- [--samples 384] [--width 2560] [--still 1]

import bpy, math, os, sys, json, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from room_common import *
from room_furnish import *
from rewind_model import *

OUT = os.path.join(ROOT, ".artifacts/rewind-sill")
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "384"))
WIDTH = int(arg("--width", "2560"))
STILL = arg("--still", "")
RNG = random.Random(1887)

eye = (float(arg("--ex", str(EYE[0]))), float(arg("--ey", str(EYE[1]))), float(arg("--ed", str(EYE[2]))))
scene, HEIGHT = stage(WIDTH, eye=eye, look=(eye[0], eye[1], SILL_AT[2]), lens=float(arg("--lens", "40")))

# ── the window wall, as room_physics.py has it ─────────────────────────────
X0, X1, D1, TOP = -250, 250, 600, 310
WIN = dict(x=30, hw=66, sill=82, top=272)
WALNUT = scan("walnut", "rosewood_veneer1", size=0.7, tint=(0.6, 0.4, 0.3), bright=0.48, sat=0.9, rough=(0.25, 0.45), bump=0.2, coat=0.2, upright=True)
WALNUT_X = scan("walnut across", "rosewood_veneer1", size=0.7, tint=(0.6, 0.4, 0.3), bright=0.46, sat=0.9, rough=(0.25, 0.45), bump=0.2, coat=0.2)
PLASTER = scan("plaster", "white_plaster_rough_01", size=2.4, tint=(0.86, 0.84, 0.76), bright=1.0, sat=0.35, rough=(0.8, 0.95), bump=0.4)
GLASS = plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
FRAME = plain("window paint", (0.8, 0.79, 0.74), rough=0.55)
back = box_cm("back wall", X0 - 25, X1 + 25, 0, TOP, D1, D1 + 30, PLASTER)
def dado_back(a, b, top):
    def piece(p0, p1, y0, y1, proud, mat, r=0.0): box_cm("dado", p0, p1, y0, y1, D1 - proud, D1, mat, r)
    piece(a, b, 0, top, 2.0, WALNUT)
    n = max(1, round((b - a) / 54))
    for k in range(n):
        p0 = a + k * (b - a) / n + 6; p1 = a + (k + 1) * (b - a) / n - 6
        piece(p0, p1, 18, top - 14, 3.2, WALNUT, 1.2)
    piece(a, b, top - 3, top + 4, 4.5, WALNUT_X, 1.0)
    piece(a, b, 0, 16, 3.5, WALNUT_X, 0.6)
WX0, WX1 = WIN["x"] - WIN["hw"] - 3, WIN["x"] + WIN["hw"] + 3
dado_back(X0, WX0, 96); dado_back(WX1, X1, 96); dado_back(WX0, WX1, WIN["sill"] - 8)
SASHES = sash_window_back(back, WIN["x"], WIN["hw"], WIN["sill"], WIN["top"], D1, 26, FRAME, GLASS, PLASTER, WALNUT_X, bars=(1 / 3, 2 / 3))
garden(P(-700, 800, 3600), [("island_tree_01", -900, 1900, 11.0, 0.3), ("island_tree_02", 900, 2600, 12.0, 1.4), ("tree_small_02", 300, 1300, 5.0, 2.2)],
       (-2500, 2500, D1 + 40, 3300, -40), P(-200, 800, 4200), sky_size=45)

# ── the four things on the sill ────────────────────────────────────────────
SILL = Sill(SILL_AT, turns_toward(eye))

# ── light: the moon behind them, the night through the glass, the green
# lamp far back on the bench, the candle ─────────────────────────────────
world = bpy.data.worlds.new("dark"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.012, 1)
lamp("the moon", "SUN", tuple(P(-500, 2600, 2900)), aim=tuple(P(20, 0, 380)), energy=float(arg("--moon", "2.6")), colour=(0.55, 0.68, 1.0), angle=math.radians(1.5))
sky_l = lamp("sky through the window", "AREA", tuple(P(WIN["x"], 180, D1 + 14)), aim=tuple(P(WIN["x"], 60, 380)), energy=float(arg("--sky", "14")), colour=(0.5, 0.62, 0.95), size=1.4, size_y=1.9)
sky_l.visible_camera = False; sky_l.visible_transmission = False; sky_l.visible_glossy = False
desk_l = lamp("the lamp", "POINT", tuple(P(-61, 117, 321)), energy=float(arg("--lamp", "16")), colour=(1.0, 0.8, 0.52), size=0.012)
key_l = lamp("lamp light on the sill", "AREA", tuple(P(-40, 125, 470)), aim=tuple(P(30, 92, 604)), energy=float(arg("--key", "9")), colour=(1.0, 0.8, 0.55), size=0.9)
key_l.visible_camera = False; key_l.visible_glossy = False
fill_l = lamp("fill at the eye", "AREA", tuple(P(eye[0] + 20, eye[1] + 30, eye[2] - 20)), aim=tuple(P(30, 90, 604)), energy=float(arg("--fill", "4")), colour=(0.8, 0.85, 1.0), size=1.2)
fill_l.visible_camera = False; fill_l.visible_glossy = False
FLAME_AT = SILL.wick_tip(REWIND["candle"]["from"]) + Vector((0, 0, M(1.4)))
flame_l = lamp("candle flame", "POINT", tuple(FLAME_AT), energy=float(arg("--flame", "1.4")), colour=(1.0, 0.68, 0.34), size=0.006)
clear_glass()

# ── where everything fell in the picture ───────────────────────────────────
bpy.context.view_layer.update()
K = WIDTH / RW
def px_box(points, pad=3):
    """the render's pixels round some places (Blender points), a few spare"""
    qs = [project(p) for p in points]
    X0_, Y0_ = max(0, math.floor(min(q[0] for q in qs) * K) - pad), max(0, math.floor(min(q[1] for q in qs) * K) - pad)
    X1_, Y1_ = min(WIDTH, math.ceil(max(q[0] for q in qs) * K) + pad), min(HEIGHT, math.ceil(max(q[1] for q in qs) * K) + pad)
    return [X0_, Y0_, X1_ - X0_, Y1_ - Y0_]
def ref(crop):
    return [round(v / K, 3) for v in crop]
def corners_of(objs):
    return [c for o in objs for c in object_corners(o)]
def pt(p):
    return list(project(p))
hit = {kind: [list(q) for q in outline(corners_of(SILL.objects(kind)))] for kind in SPOTS}

SILL.clock(0, 0)                               # (both hands at twelve, to be cut out)
crops = {}
crops["hour"] = px_box(corners_of([SILL.hands["hour"]]), 6)
crops["minute"] = px_box(corners_of([SILL.hands["minute"], SILL.hands["cap"]]), 6)
crops["page"] = px_box(corners_of([SILL.page_card]), 4)
crops["glass"] = px_box(corners_of(SILL.objects("glass")), 4)
CF = SILL.frames["candle"]
tall = REWIND["candle"]["to"]
crops["candle"] = px_box([CF(sx * (CANDLE_R + 0.6), y, sd * (CANDLE_R + 0.6)) for sx in (-1, 1) for sd in (-1, 1) for y in (CANDLE_FOOT + 1.2, ring_y(tall) + 1.2)], 4)
GF = SILL.frames["glass"]
layout = {
    "version": 1, "width": RW, "height": RH,
    "safe": box_of(corners_of([o for k in SPOTS for o in SILL.objects(k)]), pad=8),
    "hit": hit,
    "clock": {"pivot": pt(SILL.dial_centre()), "radius": round(DIAL_R * scale_at(SILL.dial_centre()), 2)},
    "glass": {
        "neck": pt(GF(0, NECK, 0)),
        "high": [pt(GF(0, NECK + 0.05, 0))[1], pt(GF(0, minute_y(REWIND["glass"]["to"]), 0))[1]],
        "low": [pt(GF(0, SAND_START[0] + SAND_START[1], 0))[1], pt(GF(0, SAND_END[0], 0))[1]],
        "s": scale_at(GF(0, NECK, 0)),
    },
    "candle": {
        "wick": [pt(SILL.wick_tip(REWIND["candle"]["from"])), pt(SILL.wick_tip(tall))],
        "top": [pt(CF(0, ring_y(REWIND["candle"]["from"]), 0)), pt(CF(0, ring_y(tall), 0))],
        "r": round(CANDLE_R * scale_at(CF(0, ring_y(tall), 0)), 2),
        "s": scale_at(CF(0, ring_y(tall), 0)),
        "eye": round(math.atan2(eye[1] - (SILL_AT[1] + ring_y(tall)), SILL_AT[2] - eye[2]), 4),
    },
}

# ── render ─────────────────────────────────────────────────────────────────
cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "0.2")), glare=False)   # (no glow: every piece must match the plate exactly)
finish(scene, SAMPLES, keep_gloss=("glass", "window glass", "dial", "candle wax"))
def region(crop):
    """render only `crop` (render pixels: x, y from the top, w, h), or all"""
    r = scene.render
    if crop is None: r.use_border = False; r.use_crop_to_border = False; return
    x, y, w, h = crop
    r.use_border = True; r.use_crop_to_border = True
    r.border_min_x, r.border_max_x = (x + 0.25) / WIDTH, (x + w + 0.25) / WIDTH
    r.border_min_y, r.border_max_y = (HEIGHT - y - h + 0.25) / HEIGHT, (HEIGHT - y + 0.25) / HEIGHT
def alone(keep):
    """everything but `keep` held out, casting nothing; the picture clear behind"""
    for o in scene.objects:
        if o.type in ("MESH", "CURVE", "FONT"):
            o.is_holdout = o not in keep; o.visible_shadow = o in keep
    scene.render.film_transparent = True; scene.render.image_settings.color_mode = "RGBA"
def all_seen():
    for o in scene.objects:
        if o.type in ("MESH", "CURVE", "FONT"): o.is_holdout = False; o.visible_shadow = True
    scene.render.film_transparent = False; scene.render.image_settings.color_mode = "RGB"

hands = list(SILL.hands.values())
if STILL:
    SILL.clock(*REWIND["clock"]["from"])
    render(scene, os.path.join(OUT, "still.png"))
else:
    # the plate: as it all lies now, the clock without its hands
    for o in hands: o.hide_render = True
    render(scene, os.path.join(OUT, "plate.png"))
    # the hands, at twelve
    for o in hands: o.hide_render = False
    alone([SILL.hands["hour"]]); region(crops["hour"]); render(scene, os.path.join(OUT, "hour.png"))
    alone([SILL.hands["minute"], SILL.hands["cap"]]); region(crops["minute"]); render(scene, os.path.join(OUT, "minute.png"))
    for o in hands: o.hide_render = True
    # each page, from the day before the first back to the last
    alone([SILL.page_card]); region(crops["page"])
    for day in range(REWIND["calendar"]["from"] - 1, REWIND["calendar"]["to"] - 1, -1):
        SILL.page(day); render(scene, os.path.join(OUT, f"page-{day}.png"))
    SILL.page(REWIND["calendar"]["from"])
    # the sand gone back up; the candle grown back (the rest as it was)
    all_seen()
    SILL.sand("end"); region(crops["glass"]); render(scene, os.path.join(OUT, "glass.png")); SILL.sand("start")
    SILL.candle(tall); flame_l.location = SILL.wick_tip(tall) + Vector((0, 0, M(1.4)))
    region(crops["candle"]); render(scene, os.path.join(OUT, "candle.png"))
    region(None)
layout["crops"] = crops
with open(os.path.join(OUT, "rewindSill.json"), "w") as f: json.dump(layout, f, indent=1)
print("SILL_DONE")
