# To the Line (levels/measures): what room_weighing.py renders when it is run
# with `--view measures` — Room VIII's sink counter close to, at the height of
# the bottles' shoulders: the fireclay sink and its brass swan-neck tap, the
# white tiles, the window's lower panes over them (the rain is the game's), the
# lamp by the sink alight off to the right, a mortar and two reagent bottles.
#
# Rendered: the plate, its counter bare where the bottles and the flask stand
# (the bottles are the game's, in three dimensions, stage3d.js); the flask
# alone, its glass clear (film_transparent_glass), to be filled, burnt and
# tipped; and the flask's shadow alone on the slate (a shadow catcher), to stay
# on the slate or go with it. Where it all fell, and the camera itself, for the
# game's three dimensions to see as this one does (measuresLevel.json).

import bpy, math, os, json
from mathutils import Vector
from kit import *
from room_common import *

GLOSSY = ("white tiles", "tile cap", "tile cap back", "fireclay", "green enamel", "enamel inside", "hung bulb", "wall lamp glass", "board lamp bulb")

def run(g):
    scene, OUT, WIDTH, HEIGHT, SAMPLES = g["scene"], g["OUT"], g["WIDTH"], g["HEIGHT"], g["SAMPLES"]
    K = WIDTH / RW
    cycles(scene, SAMPLES, WIDTH, HEIGHT, exposure=float(arg("--exposure", "-0.2")), glare=False)
    scene.cycles.volume_bounces = 1
    finish(scene, SAMPLES, keep_gloss=GLOSSY)
    g["ONE"].set(True)
    for light in g["OUT_LIGHTS"]: light.set(light.name == "measures")     # (the lamp by the sink alight)
    g["air"].hide_render = True
    # (close to, the moon through the window is a glow on the slate, not a patch of
    # light; and the panes, at night, mirror the room only faintly)
    bpy.data.objects["the moon"].data.energy *= 0.15
    pane = plain("window pane", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.08)
    for o in bpy.data.objects:
        if o.type == "MESH" and o.name.split(".")[0] == "glass": o.data.materials.clear(); o.data.materials.append(pane)
    clear_glass()
    bpy.context.view_layer.update()
    ct, EYE, ROW, fx, FL = g["ct"], g["EYE"], g["ROW"], g["fx"], g["FL"]
    h = ct["h"]
    def corners_of(objs): return [c for o in objs for c in object_corners(o)]
    def px_box(points, pad=6):
        qs = [project(p) for p in points]
        X0 = max(0, math.floor(min(q[0] for q in qs) * K) - pad); Y0 = max(0, math.floor(min(q[1] for q in qs) * K) - pad)
        X1 = min(WIDTH, math.ceil(max(q[0] for q in qs) * K) + pad); Y1 = min(HEIGHT, math.ceil(max(q[1] for q in qs) * K) + pad)
        return [X0, Y0, X1 - X0, Y1 - Y0]
    def region(crop):
        r = scene.render
        if crop is None: r.use_border = False; r.use_crop_to_border = False; return
        x, y, w, hh = crop
        r.use_border = True; r.use_crop_to_border = True
        r.border_min_x, r.border_max_x = (x + 0.25) / WIDTH, (x + w + 0.25) / WIDTH
        r.border_min_y, r.border_max_y = (HEIGHT - y - hh + 0.25) / HEIGHT, (HEIGHT - y + 0.25) / HEIGHT
    ref = lambda c: [round(v / K, 3) for v in c]
    rel = lambda q, o: [round(q[0] - o[0], 2), round(q[1] - o[1], 2)]

    # ── the camera, as the game's three dimensions must have it ────────────
    cam = scene.camera.data
    fov = 2 * math.atan(math.tan(cam.angle_x / 2) * RH / RW)
    pitch = math.atan2(EYE[1] - g["LOOK"][1], g["LOOK"][2] - EYE[2])
    wl = g["wall_l"].location
    camera = {"fov": round(math.degrees(fov), 4), "pitch": round(math.degrees(pitch), 4),
              "height": round((EYE[1] - h) / 100, 4), "distance": round((ROW - EYE[2]) / 100, 4),
              "lamp": [round(wl.x - M(EYE[0]), 3), round(wl.z - M(h), 3), round(-(wl.y - M(ROW)), 3)]}

    # ── the flask: where it stands, its inside as the picture has it ───────
    flask_parts = g["FLASK_PARTS"]
    at = project(g["FLASK_AT"] + Vector((0, 0, FL["c"])))          # (the bulb's middle)
    # (its outline is where the eye's rays graze it: square to the way it is seen)
    view = Vector((M(fx - EYE[0]), M(ROW - EYE[2]))).normalized(); side = Vector((view.y, -view.x))
    def edge(r, z, s):                                              # r, z in metres up the flask; s = ±1
        return project(g["FLASK_AT"] + Vector((side.x * r * s, side.y * r * s, z)))
    inside = g["FLASK_IN"]
    poly = [edge(r, z, 1) for (r, z) in reversed(inside)] + [edge(r, z, -1) for (r, z) in inside[1:]]
    neck_l, neck_r = edge(FL["neck"], FL["shoulder"] + 0.01, -1), edge(FL["neck"], FL["shoulder"] + 0.01, 1)
    bulb_l, bulb_r = edge(FL["r"], FL["c"], -1), edge(FL["r"], FL["c"], 1)
    flask_crop = px_box(corners_of(flask_parts), 10)
    # its shadow on the slate: the lamp to the right throws it left, the window forward
    sh_pts = [P(x, h, d) for x in (fx - 55, fx + 14) for d in (ROW - 22, g["D1"])]
    shadow_crop = px_box(sh_pts, 4)
    flask = {"at": list(at), "crop": flask_crop, "box": ref(flask_crop),
             "poly": [rel(q, at) for q in poly],
             "top": rel(edge(FL["neck"] * 1.12, FL["top"], 1), at)[1], "bottom": rel(project(g["FLASK_AT"]), at)[1],
             "neckW": round(abs(neck_r[0] - neck_l[0]), 2), "r": round(abs(bulb_r[0] - bulb_l[0]) / 2, 2),
             "ring": rel(edge(FL["neck"], FL["ring_z"], 1), at)[1],
             "shadow": {"crop": shadow_crop, "box": ref(shadow_crop)}}

    # ── the row, the tap, the sink, the window ─────────────────────────────
    S = g["SINK"]
    sink_open = [P(x, h + 0.6, d) for x in (S["x0"] + 3.5, S["x1"] - 3.5) for d in (S["d0"] + 3.5, S["d1"] - 3.5)]
    lower = g["SASHES"][0]
    layout = {
        "version": 1, "width": RW, "height": RH,
        "camera": camera,
        "counter": project(P(EYE[0], h, ROW))[1],
        "scale": scale_at(P(EYE[0], h, ROW)),
        "bottles": [{"x": project(P(vx, h, ROW))[0]} for (vx, _, _) in g["VESSELS"]],
        "flask": flask,
        "tap": {"spout": list(project(g["SPOUT"])), "hit": [list(q) for q in outline(corners_of(g["TAP_PARTS"]))]},
        "sink": {"hit": [list(q) for q in outline(sink_open)], "drain": list(project(P(g["tx"], h - 19, (S["d0"] + S["d1"]) / 2)))},
        "panes": [[list(project(p)) for p in lower]],
        "sill": max(project(p)[1] for p in lower),
        "safe": box_of(sink_open + corners_of(g["TAP_PARTS"]) + corners_of(flask_parts + g["BOTTLE_PARTS"]), pad=24),
    }
    # (the sink runs on past the picture's left edge: what must be seen is kept within it)
    sx, sy, sw, sh = layout["safe"]; x0, y0 = max(0, sx), max(0, sy)
    layout["safe"] = [x0, y0, min(RW, sx + sw) - x0, min(RH, sy + sh) - y0]
    with open(os.path.join(OUT, "measuresLevel.json"), "w") as fh: json.dump(layout, fh, indent=1)

    every = [o for o in scene.objects if o.type in ("MESH", "CURVE", "FONT")]
    live = g["BOTTLE_PARTS"] + flask_parts
    for o in live: o.hide_render = True
    if arg("--still", ""):
        render(scene, os.path.join(OUT, "still.png")); return
    render(scene, os.path.join(OUT, "plate.png"))
    # the flask alone, clear glass, nothing else
    scene.render.film_transparent = True; scene.render.image_settings.color_mode = "RGBA"
    scene.cycles.film_transparent_glass = True
    for o in flask_parts: o.hide_render = False
    for o in every: o.is_holdout = o not in flask_parts; o.visible_shadow = o in flask_parts
    region(flask_crop); render(scene, os.path.join(OUT, "flask.png"))
    # its shadow alone on the slate: glass lets most of the light through
    scene.cycles.film_transparent_glass = False
    shade = bpy.data.materials.new("glass's shadow"); shade.use_nodes = True
    N = shade.node_tree.nodes; N.remove(N["Principled BSDF"])
    mx = N.new("ShaderNodeMixShader"); mx.inputs["Fac"].default_value = 0.68
    shade.node_tree.links.new(N.new("ShaderNodeBsdfDiffuse").outputs[0], mx.inputs[1])
    shade.node_tree.links.new(N.new("ShaderNodeBsdfTransparent").outputs[0], mx.inputs[2])
    shade.node_tree.links.new(mx.outputs[0], N["Material Output"].inputs["Surface"])
    slate = g["top"]
    for o in every:
        o.is_holdout = False; o.visible_shadow = True
        o.hide_render = not (o is slate or o is g["FLASK"])
    g["FLASK"].visible_camera = False
    g["FLASK"].data.materials.clear(); g["FLASK"].data.materials.append(shade)
    slate.is_shadow_catcher = True
    region(shadow_crop); render(scene, os.path.join(OUT, "flask-shadow.png"))
    region(None)
    print("MEASURES_LEVEL_DONE")
