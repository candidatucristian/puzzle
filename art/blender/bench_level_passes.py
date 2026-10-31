# The Apothecary's Bench (levels/chemistry): what room_lab.py renders when it
# is run with `--view bench` — Silas's bench close to, from in front of it: the
# five bottles filled each to its own number on its printed scale, the flask
# on its tripod over the Bunsen burner, alight, the magnifying glass on its
# green cloth; the oil lamp's light from the left.
#
# Rendered: the plate; the cloth with the glass taken off it (cut to its
# place); and the bottles again at three times the size, for what is seen
# through the lens. Where it all fell in the picture (benchLevel.json).

import bpy, math, os, json
from mathutils import Vector
from kit import *
from room_common import *

ZOOM = 3

def run(g):
    scene, OUT, WIDTH, HEIGHT, SAMPLES = g["scene"], g["OUT"], g["WIDTH"], g["HEIGHT"], g["SAMPLES"]
    K = WIDTH / RW
    cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "0.15")), glare=False)
    scene.cycles.volume_bounces = 1
    finish(scene, SAMPLES, keep_gloss=("white tiles", "fireclay", "burner flame", "lamp flame", "liquid 3"))
    g["ONE"].set(True)
    for light in g["OUT_LIGHTS"]: light.set(True)        # (the burner alight, here)
    g["air"].hide_render = True
    bpy.data.objects["burner flame"].hide_render = True     # (its flame is the game's, alive; its light stays)
    bpy.context.view_layer.update()
    h, b, fx, fd = g["h"], g["b"], g["fx"], g["fd"]
    def corners_of(objs): return [c for o in objs for c in object_corners(o)]
    def px_box(points, pad=6, k=K, w=WIDTH, hh=HEIGHT):
        qs = [project(p) for p in points]
        X0 = max(0, math.floor(min(q[0] for q in qs) * k) - pad); Y0 = max(0, math.floor(min(q[1] for q in qs) * k) - pad)
        X1 = min(w, math.ceil(max(q[0] for q in qs) * k) + pad); Y1 = min(hh, math.ceil(max(q[1] for q in qs) * k) + pad)
        return [X0, Y0, X1 - X0, Y1 - Y0]
    def region(crop, w=WIDTH, hh=HEIGHT):
        r = scene.render
        if crop is None: r.use_border = False; r.use_crop_to_border = False; return
        x, y, cw, ch = crop
        r.use_border = True; r.use_crop_to_border = True
        r.border_min_x, r.border_max_x = (x + 0.25) / w, (x + cw + 0.25) / w
        r.border_min_y, r.border_max_y = (hh - y - ch + 0.25) / hh, (hh - y + 0.25) / hh
    ref = lambda c, k=K: [round(v / k, 3) for v in c]

    # ── where it all fell ──────────────────────────────────────────────────
    bottles = []
    for i, (x, d, bh, r, level) in enumerate(g["BOTTLE_LIQUID"]):
        body = [P(x + sx * r, y, d + sd * r) for sx in (-1, 1) for sd in (-1, 1) for y in (h, h + bh + 1)]
        inner = r * (0.55 if i == 3 else 0.7)
        bottles.append({"hit": [list(q) for q in outline(body)],
                        "liquid": {"left": project(P(x - inner, h + 2, d - r))[0], "right": project(P(x + inner, h + 2, d - r))[0],
                                   "bottom": project(P(x, h + 1.5, d - r))[1], "top": project(P(x, h + level * 100 - 0.6, d - r))[1]},
                        "s": scale_at(P(x, h + 5, d))})
    loupe = [o for o in bpy.data.objects if o.type == "MESH" and o.parent and o.parent.name.startswith("magnifying_glass_01")]
    cloth = bpy.data.objects["green cloth"]
    flask_top = P(fx, h + 20.5 + 16.5, fd)
    mouth = P(fx, h + 12.5, fd)
    zoom_pts = [P(x + sx * (r + 2), y, d - r) for (x, d, bh, r, _) in g["BOTTLE_LIQUID"] for sx in (-1, 1) for y in (h - 1, h + bh + 2)]
    zoom_crop = px_box(zoom_pts, 4, K * ZOOM, WIDTH * ZOOM, HEIGHT * ZOOM)
    loupe_crop = px_box(corners_of(loupe) + object_corners(cloth), 8)
    layout = {
        "version": 1, "width": RW, "height": RH,
        "safe": box_of(zoom_pts + corners_of(loupe) + [mouth, flask_top], pad=20),
        "bottles": bottles,
        "burner": {"mouth": list(project(mouth)), "s": scale_at(mouth)},
        "flask": {"steam": list(project(flask_top)), "s": scale_at(flask_top), "liquid": list(project(P(fx, h + 22, fd))), "r": round(scale_at(P(fx, h + 22, fd)) * 4.5, 2)},
        "uranium": {"at": list(project(P(g["BOTTLE_LIQUID"][3][0], h + 10, g["BOTTLE_LIQUID"][3][1]))), "s": scale_at(P(g["BOTTLE_LIQUID"][3][0], h + 10, g["BOTTLE_LIQUID"][3][1]))},
        "loupe": {"hit": [list(q) for q in outline(corners_of(loupe))], "crop": loupe_crop, "box": ref(loupe_crop)},
        "cloth": {"hit": [list(q) for q in outline(object_corners(cloth))]},
        "zoom": {"crop": zoom_crop, "box": ref(zoom_crop, K * ZOOM), "k": ZOOM},
    }
    with open(os.path.join(OUT, "benchLevel.json"), "w") as fh: json.dump(layout, fh, indent=1)

    if arg("--zoomtest", ""):                            # (one bottle through the lens, quickly)
        x, d, bh, r, _ = g["BOTTLE_LIQUID"][int(arg("--zoomtest", "3"))]
        scene.render.resolution_x, scene.render.resolution_y = WIDTH * ZOOM, HEIGHT * ZOOM
        region(px_box([P(x + sx * (r + 2), y, d - r) for sx in (-1, 1) for y in (h - 1, h + bh + 2)], 4, K * ZOOM, WIDTH * ZOOM, HEIGHT * ZOOM), WIDTH * ZOOM, HEIGHT * ZOOM)
        render(scene, os.path.join(OUT, "zoomtest.png")); return
    if arg("--still", ""):
        render(scene, os.path.join(OUT, "still.png")); return
    render(scene, os.path.join(OUT, "plate.png"))
    # the cloth, the glass taken off it
    for o in loupe: o.hide_render = True
    region(loupe_crop); render(scene, os.path.join(OUT, "cloth.png"))
    for o in loupe: o.hide_render = False
    # the bottles, three times the size, for the lens
    scene.render.resolution_x, scene.render.resolution_y = WIDTH * ZOOM, HEIGHT * ZOOM
    region(zoom_crop, WIDTH * ZOOM, HEIGHT * ZOOM); render(scene, os.path.join(OUT, "zoom.png"))
    region(None)
    print("BENCH_LEVEL_DONE")
