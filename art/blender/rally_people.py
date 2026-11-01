# The Night Circuit's people, for rally_stage.py: the spectators behind the
# tape — in coats and hats, hands in pockets or arms up as a car crosses —
# and the marshal in his orange jacket, his flag arm apart (in three flutters
# of the chequered cloth) to be swung at the shoulder by the game.
#
# Each is built where stage.json has them stand, lit by the stage's own
# lights, and rendered alone, cropped to itself (people.json: where each
# picture lies in the reference picture, where its feet are; the marshal's
# shoulder).

import bpy, math, os, json, random
from mathutils import Vector, Quaternion
from kit import link, plain, sphere, cylinder, box, render
from dawn_folk import _blob, _ell, _limb

JACKETS = [(0.03, 0.035, 0.06), (0.02, 0.02, 0.025), (0.05, 0.055, 0.04), (0.12, 0.025, 0.03), (0.07, 0.072, 0.08), (0.42, 0.11, 0.02),
           (0.025, 0.1, 0.14), (0.33, 0.22, 0.04), (0.25, 0.02, 0.025), (0.02, 0.05, 0.16), (0.035, 0.035, 0.04), (0.14, 0.09, 0.06)]
TROUSERS = [(0.02, 0.022, 0.03), (0.03, 0.04, 0.06), (0.015, 0.015, 0.018), (0.06, 0.055, 0.05)]
HATS = [None, "beanie", "cap", "hood", None, "beanie"]
SKIN = [(0.45, 0.3, 0.22), (0.38, 0.24, 0.17), (0.5, 0.36, 0.27), (0.25, 0.15, 0.1)]

def person(name, at, rr, cheer, h=1.75, jacket=None, trousers=None, hat=None, face=0.0):
    """a standing figure, its feet at `at` (Blender, metres), facing −y (the
    camera) turned by `face`; arms down, or up for a cheer"""
    root = bpy.data.objects.new(name, None); link(root); root.location = at; root.rotation_euler = (0, 0, face)
    k = h / 1.75
    jk = plain(f"{name} coat", jacket, rough=0.8, sheen=0.4); tr = plain(f"{name} trousers", trousers, rough=0.85)
    sk = plain(f"{name} skin", rr.choice(SKIN), rough=0.55); bt = plain(f"{name} boots", (0.025, 0.02, 0.015), rough=0.6)
    def blob(part, mat):
        ob, mb = _blob(f"{name} {part}", mat, 0.012); ob.parent = root; return ob, mb
    objs = []
    o, b = blob("coat", jk); objs.append(o)
    _ell(b, (0, 0, 1.17 * k), (0.2 * k, 0.13 * k, 0.33 * k))
    _limb(b, (-0.17 * k, 0, 1.4 * k), (0.17 * k, 0, 1.4 * k), 0.075 * k)
    for s in (-1, 1):
        if cheer:
            el = (s * 0.3 * k, -0.02, 1.62 * k); wr = (s * 0.27 * k, -0.06, 1.95 * k)
        else:
            el = (s * 0.24 * k, 0.0, 1.12 * k); wr = (s * 0.2 * k, -0.06, 0.9 * k)
        _limb(b, (s * 0.19 * k, 0, 1.4 * k), el, 0.055 * k); _limb(b, el, wr, 0.048 * k)
        o2, b2 = blob(f"hand{s}", sk); objs.append(o2); _ell(b2, wr, (0.04 * k, 0.04 * k, 0.05 * k))
    o, b = blob("legs", tr); objs.append(o)
    for s in (-1, 1):
        _limb(b, (s * 0.09 * k, 0, 0.88 * k), (s * 0.1 * k, 0, 0.45 * k), 0.07 * k)
        _limb(b, (s * 0.1 * k, 0, 0.45 * k), (s * 0.1 * k, 0, 0.08 * k), 0.058 * k)
    o, b = blob("boots", bt); objs.append(o)
    for s in (-1, 1): _ell(b, (s * 0.1 * k, -0.04, 0.05 * k), (0.055 * k, 0.12 * k, 0.05 * k))
    o, b = blob("head", sk); objs.append(o)
    _limb(b, (0, 0, 1.47 * k), (0, 0, 1.55 * k), 0.055 * k); _ell(b, (0, 0, 1.64 * k), (0.085 * k, 0.095 * k, 0.11 * k))
    if hat:
        hm = plain(f"{name} hat", rr.choice(JACKETS), rough=0.85)
        if hat == "beanie": objs.append(sphere(f"{name} beanie", (0, 0, 1.7 * k), 0.095 * k, hm, squash=(1, 1.05, 0.75)))
        elif hat == "cap":
            objs.append(sphere(f"{name} cap", (0, 0, 1.7 * k), 0.093 * k, hm, squash=(1, 1.05, 0.55)))
            objs.append(sphere(f"{name} peak", (0, -0.09 * k, 1.69 * k), 0.06 * k, hm, squash=(1.1, 0.9, 0.2)))
        else: objs.append(sphere(f"{name} hood", (0, 0.02 * k, 1.64 * k), 0.13 * k, jk, squash=(1, 1.1, 1.08)))
        objs[-1].parent = root
        if hat == "cap": objs[-2].parent = root
    return root, objs

def build(S, W, Wm, RNG):
    crowd = []
    for i, p in enumerate(S["crowd"]):
        rr = random.Random(p["seed"])
        at = W(p["x"], 0, p["z"])
        spec = dict(h=rr.uniform(1.62, 1.88), jacket=JACKETS[p["seed"] % len(JACKETS)], trousers=TROUSERS[(p["seed"] // 7) % len(TROUSERS)],
                    hat=HATS[(p["seed"] // 3) % len(HATS)], face=rr.uniform(-0.35, 0.35))
        r1, still = person(f"spectator{i}", at, random.Random(p["seed"]), False, **spec)
        r2, cheer = person(f"spectatorup{i}", at, random.Random(p["seed"]), True, **spec)
        crowd.append({"i": i, "at": at, "still": [r1] + still, "cheer": [r2] + cheer, "z": p["z"]})
    # the marshal: an orange jacket, a dark cap, his flag arm up and out to his left
    M = S["marshal"]; at = W(M["x"], 0, M["z"])
    rr = random.Random(77)
    root, body = person("marshal", at, rr, False, h=1.8, jacket=(0.85, 0.22, 0.02), trousers=(0.02, 0.022, 0.03), hat="cap", face=-0.25)
    # (his right arm hangs; the flag arm is apart)
    shoulder = at + Quaternion((0, 0, 1), -0.25) @ Vector((0.21, 0, 1.4))
    arms = []
    WHITE = plain("flag white", (0.8, 0.8, 0.76), rough=0.7, sheen=0.5); BLACK = plain("flag black", (0.02, 0.02, 0.022), rough=0.7, sheen=0.5)
    sleeve = plain("marshal sleeve", (0.85, 0.22, 0.02), rough=0.8, sheen=0.4)
    for f in range(3):
        objs = []
        ob, mb = _blob(f"flagarm{f} sleeve", sleeve, 0.012); objs.append(ob)
        el = shoulder + Vector((0.12, -0.05, 0.28)); wr = el + Vector((0.08, -0.05, 0.3))
        _limb(mb, shoulder, el, 0.055); _limb(mb, el, wr, 0.048)
        pole = cylinder(f"flagarm{f} pole", 0, 0, 0, 0.75, 0.012, plain("flag pole", (0.1, 0.08, 0.06), rough=0.5), verts=8)
        pole.location = wr - Vector((0, 0, 0.1)); pole.rotation_euler = (0.08, 0.22, 0); objs.append(pole)
        top = wr + Vector((0.15, 0, 0.62))
        for i in range(6):
            for j in range(4):
                ph = f * 2.1
                x0, z0 = i * 0.09, -j * 0.09
                wave = lambda x: 0.05 * math.sin(x * 9 + ph) * (x / 0.54)
                pts = [(x0, z0), (x0 + 0.09, z0), (x0 + 0.09, z0 - 0.09), (x0, z0 - 0.09)]
                me = bpy.data.meshes.new("flag cell")
                me.from_pydata([tuple(top + Vector((x, wave(x), z - 0.06 * (x / 0.54) ** 2))) for (x, z) in pts], [], [(0, 1, 2, 3)]); me.update()
                c = link(bpy.data.objects.new(f"flagarm{f} cell", me)); c.data.materials.append(WHITE if (i + j) % 2 else BLACK); objs.append(c)
        arms.append(objs)
    return crowd, {"body": [root] + body, "arms": arms, "shoulder": shoulder}

def render_all(scene, crowd, marshal, show, lights, haze, to_ref, out, WIDTH, HEIGHT):
    """each figure alone, cropped to itself, everything else held out"""
    lights(True); haze.hide_render = True
    r = scene.render; r.film_transparent = True; r.image_settings.color_mode = "RGBA"
    every = [o for o in bpy.data.objects if o.type in ("MESH", "CURVE", "FONT", "META")]
    k = WIDTH / 1880
    meta = {"scale": k, "crowd": [], "marshal": {}}
    def crop(objs, pad=10):
        pts = []
        for o in objs:
            if o.type == "EMPTY": continue
            if o.type == "META":
                bpy.context.view_layer.update()
                ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get())
                pts += [o.matrix_world @ Vector(c) for c in ev.bound_box]
            else:
                pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
        qs = [to_ref(p) for p in pts]
        x0 = max(0, min(q[0] for q in qs) * k - pad); y0 = max(0, min(q[1] for q in qs) * k - pad)
        x1 = min(WIDTH, max(q[0] for q in qs) * k + pad); y1 = min(HEIGHT, max(q[1] for q in qs) * k + pad)
        return [int(x0), int(y0), int(math.ceil(x1 - x0)), int(math.ceil(y1 - y0))]
    def shot(objs, name):
        box_ = crop(objs)
        x, y, w, h = box_
        r.use_border = True; r.use_crop_to_border = True
        r.border_min_x, r.border_max_x = x / WIDTH, (x + w) / WIDTH
        r.border_min_y, r.border_max_y = 1 - (y + h) / HEIGHT, 1 - y / HEIGHT
        mine = set(objs)
        for o in every: o.is_holdout = o not in mine and o.type != "META"
        show(objs, True)
        render(scene, os.path.join(out, name + ".png"))
        show(objs, False)
        return [round(v / k, 2) for v in box_]
    for p in crowd:
        feet = to_ref(p["at"])
        a = shot(p["still"], f"spectator-{p['i']}"); b = shot(p["cheer"], f"spectator-{p['i']}-up")
        meta["crowd"].append({"i": p["i"], "feet": feet, "still": a, "cheer": b, "z": p["z"]})
    meta["marshal"]["feet"] = to_ref(marshal["body"][0].location)
    meta["marshal"]["body"] = shot(marshal["body"], "marshal")
    meta["marshal"]["shoulder"] = to_ref(marshal["shoulder"])
    meta["marshal"]["arms"] = [shot(objs, f"flag-arm-{f}") for f, objs in enumerate(marshal["arms"])]
    for o in every: o.is_holdout = False
    r.use_border = False; r.use_crop_to_border = False
    with open(os.path.join(out, "people.json"), "w") as fh: json.dump(meta, fh, indent=1)
