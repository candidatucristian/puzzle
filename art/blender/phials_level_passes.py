# Two Phials (levels/phials): what room_lab.py renders when it is run with
# `--view phials` — Room VII's counter of sinks close to, at its end the little
# walnut rack: a phial of yellow, an empty tube, a phial of blue, the tag on
# its post ("For my sister.", lab_boards.mjs).
#
# Rendered: the plate, the rack standing empty; each tube alone, its glass
# clear (film_transparent_glass), to be lifted out of the rack and held up to
# the window; and the rack's upper board alone, laid over the tubes standing
# in it, so they stand through it. Where it all fell (phialsLevel.json).

import bpy, math, os, json
from mathutils import Vector
from kit import *
from room_common import *

def run(g):
    scene, OUT, WIDTH, HEIGHT, SAMPLES = g["scene"], g["OUT"], g["WIDTH"], g["HEIGHT"], g["SAMPLES"]
    K = WIDTH / RW
    cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "0.15")), glare=False)
    scene.cycles.volume_bounces = 1
    finish(scene, SAMPLES, keep_gloss=("white tiles", "fireclay", "burner flame", "lamp flame", "liquid 3"))
    one_light(g["ONE"], g["OUT_LIGHTS"])
    g["air"].hide_render = True
    bpy.context.view_layer.update()
    tubes, board = g["PHIALS"], g["RACK_BOARD"][0]
    def corners_of(objs): return [c for o in objs for c in object_corners(o)]
    def px_box(points, pad=6):
        qs = [project(p) for p in points]
        X0 = max(0, math.floor(min(q[0] for q in qs) * K) - pad); Y0 = max(0, math.floor(min(q[1] for q in qs) * K) - pad)
        X1 = min(WIDTH, math.ceil(max(q[0] for q in qs) * K) + pad); Y1 = min(HEIGHT, math.ceil(max(q[1] for q in qs) * K) + pad)
        return [X0, Y0, X1 - X0, Y1 - Y0]
    ref = lambda c: [round(v / K, 3) for v in c]
    def region(crop):
        r = scene.render
        if crop is None: r.use_border = False; r.use_crop_to_border = False; return
        x, y, w, h = crop
        r.use_border = True; r.use_crop_to_border = True
        r.border_min_x, r.border_max_x = (x + 0.25) / WIDTH, (x + w + 0.25) / WIDTH
        r.border_min_y, r.border_max_y = (HEIGHT - y - h + 0.25) / HEIGHT, (HEIGHT - y + 0.25) / HEIGHT
    LIFT = float(arg("--lift", "10"))             # cm a tube comes up out of the rack
    items = []
    for i, parts in enumerate(tubes):
        crop = px_box(corners_of(parts), 8)
        foot = parts[0].matrix_world.translation.copy()
        base = project(foot); up = project(foot + Vector((0, 0, LIFT / 100)))
        items.append({"crop": crop, "box": ref(crop), "foot": list(base), "lift": [round(up[0] - base[0], 2), round(up[1] - base[1], 2)]})
    board_crop = px_box(object_corners(board), 4)
    tube_objs = [o for parts in tubes for o in parts]
    lifted = [p + Vector((0, 0, LIFT / 100)) for p in corners_of(tube_objs)]
    layout = {"version": 1, "width": RW, "height": RH, "safe": box_of(corners_of(tube_objs) + object_corners(board) + lifted, pad=24),
              "tubes": items, "board": {"crop": board_crop, "box": ref(board_crop)}}
    with open(os.path.join(OUT, "phialsLevel.json"), "w") as fh: json.dump(layout, fh, indent=1)

    every = [o for o in scene.objects if o.type in ("MESH", "CURVE", "FONT")]
    if arg("--still", ""):
        render(scene, os.path.join(OUT, "still.png")); return
    for o in tube_objs: o.hide_render = True
    render(scene, os.path.join(OUT, "plate.png"))
    # each tube alone, clear glass, nothing else
    scene.render.film_transparent = True; scene.render.image_settings.color_mode = "RGBA"
    scene.cycles.film_transparent_glass = True
    for i, parts in enumerate(tubes):
        for o in every: o.is_holdout = o not in parts; o.visible_shadow = o in parts
        for o in tube_objs: o.hide_render = o not in parts
        region(items[i]["crop"]); render(scene, os.path.join(OUT, f"tube-{i}.png"))
    # the rack's upper board alone, to lie over the tubes standing in it
    for o in tube_objs: o.hide_render = True
    for o in every: o.is_holdout = o is not board; o.visible_shadow = True
    scene.cycles.film_transparent_glass = False
    region(board_crop); render(scene, os.path.join(OUT, "board.png"))
    region(None)
    print("PHIALS_LEVEL_DONE")
