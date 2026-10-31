# The Lit Tree (levels/pi): what room_drawing.py renders when it is run with
# `--view tree` — Room V's corner close to: the tree with just so many of its
# lamps alight on each tier as the puzzle has them, the window and the moon in
# it, the parcels under the tree.
#
# Rendered: the plate (the first parcel tied up); that parcel opened, its lid
# laid by, cut to its place; and the rule, the protractor and the compasses
# each alone where they come to lie, their shadows on the boards. Where it all
# fell in the picture: the lamps alight (for their twinkling), the moon, the
# parcel, the instruments (treeLevel.json; tree_level_publish.mjs).

import bpy, math, os, json
from mathutils import Vector
from kit import *
from room_common import *

def run(g):
    scene, OUT, WIDTH, HEIGHT, SAMPLES = g["scene"], g["OUT"], g["WIDTH"], g["HEIGHT"], g["SAMPLES"]
    if arg("--probe", ""):
        bpy.context.view_layer.update()
        for pair in arg("--probe", "").split(";"): probe(*map(float, pair.split(",")))
        return
    K = WIDTH / RW
    cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "1.6")), glare=False)
    scene.cycles.volume_bounces = 1
    finish(scene, SAMPLES, keep_gloss=("snow", "standby lamp", "lamp alight", "lamp dark"))
    one_light(g["ONE"], g["OUT_LIGHTS"])
    g["air"].hide_render = True
    bpy.context.view_layer.update()

    def solid(root):
        return [o for o in [root] + list(root.children_recursive) if o.type in ("MESH", "CURVE", "FONT")]
    shut = solid(g["GIFT"]["root"])
    opened = [o for r in g["OPEN"] for o in solid(r)]
    toys = [solid(r) for r in g["TOYS"]]
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

    # ── where it all fell ──────────────────────────────────────────────────
    T, P_ = g["T"], P
    lamps = []
    for (p, on) in g["LAMPS"]:
        if not on: continue
        q = project(p); lamps.append({"x": q[0], "y": q[1], "s": scale_at(p)})
    moon = project(g["MOON_AT"])
    open_crop = px_box(corners_of(shut + opened), 10)
    gift_top = Vector(g["GIFT"]["root"].matrix_world.translation) + Vector((0, 0, M(g["GIFT"]["h"])))
    instruments = []
    for parts in toys:
        crop = px_box(corners_of(parts), 14)
        mid = sum((o.matrix_world.translation for o in parts), Vector()) / len(parts)
        instruments.append({"crop": crop, "box": ref(crop), "at": list(project(mid))})
    tree_pts = [P_(T["x"] + dx, y, T["d"] + dd) for dx in (-70, 70) for dd in (-70, 70) for y in (0, g["TOP_Y"] + 16)]
    layout = {
        "version": 1, "width": RW, "height": RH,
        "safe": box_of(tree_pts + [g["MOON_AT"]], pad=10),
        "lamps": lamps,
        "moon": {"x": moon[0], "y": moon[1], "r": round(scale_at(g["MOON_AT"]) * 55, 2)},
        "gift": {"hit": [list(q) for q in outline(corners_of(shut))], "crop": open_crop, "box": ref(open_crop), "from": list(project(gift_top))},
        "instruments": instruments,
    }
    with open(os.path.join(OUT, "treeLevel.json"), "w") as fh: json.dump(layout, fh, indent=1)

    # ── the plate: the parcel tied up, nothing out of it ───────────────────
    for o in opened + [o for parts in toys for o in parts]: o.hide_render = True
    if arg("--still", ""): render(scene, os.path.join(OUT, "still.png")); return
    render(scene, os.path.join(OUT, "plate.png"))
    # the parcel opened, its lid laid by
    for o in shut: o.hide_render = True
    for o in opened: o.hide_render = False
    region(open_crop); render(scene, os.path.join(OUT, "open.png"))
    # each instrument alone, its shadow on the boards
    floor = bpy.data.objects["parquet"]
    scene.render.film_transparent = True; scene.render.image_settings.color_mode = "RGBA"
    every = [o for o in scene.objects if o.type in ("MESH", "CURVE", "FONT")]
    for i, parts in enumerate(toys):
        for o in every:
            mine = o in parts
            if mine: o.hide_render = False
            o.is_holdout = not mine and o is not floor
            o.visible_shadow = mine
            o.is_shadow_catcher = o is floor
        for j, other in enumerate(toys):
            if j != i:
                for o in other: o.hide_render = True
        region(instruments[i]["crop"]); render(scene, os.path.join(OUT, f"instrument-{i}.png"))
    region(None)
    print("TREE_LEVEL_DONE")
