"""Room VI, alive: what the game composes its living room from.

The finished scene (room_vi.blend, room_vi.py's) is rendered as plates and
measured, and what should move is taken out of it to be moved in the game,
in WebGL, through the same camera (src/shared/liveRoom.js, levels/room6/
liveRoom6.js):

  plate.webp        the room without the mobile's turning parts and without
                    the cabinet's glass (the medals hang behind it, live)
  plate-dim.webp    the same with a cloud over the moon
  glass.webp        what the cabinet's glass adds in front of the medals (its
                    reflections), cropped to the glass, to be laid back on
  depth.webp        how far each pixel is, for parallax and for the medals to
                    go behind the cabinet's frame: 16-bit inverse depth in
                    red (high byte) and green (low byte)
  probe-cabinet.hdr, probe-mobile.hdr
                    the room as seen from where the medals and the mobile
                    hang, for their reflections and light
  mobile.glb        the mobile's hoop and what hangs from it, each drop on
                    its own pivot
  room6Live.json    the camera, the encoding, and where things are

  blender -b --factory-startup -P art/blender/room_vi_live.py -- [--samples 512] [--width 2560] [--only plate,dim,glass,probes,mobile]
"""

import argparse
import json
import math
import os
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[2]
p = argparse.ArgumentParser()
p.add_argument("--blend", default=str(ROOT / "art/blender/room_vi.blend"))
p.add_argument("--out", default=str(ROOT / "public/assets/images/Room6/live"))
p.add_argument("--data", default=str(ROOT / "src/levels/room6/room6Live.json"))
p.add_argument("--samples", type=int, default=512)
p.add_argument("--width", type=int, default=2560)
p.add_argument("--only", default="plate,dim,glass,probes,mobile")
ARGS = p.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
OUT = Path(ARGS.out).resolve()
OUT.mkdir(parents=True, exist_ok=True)
WORK = ROOT / ".artifacts/room-vi-live"
WORK.mkdir(parents=True, exist_ok=True)
ONLY = set(ARGS.only.split(","))

bpy.ops.wm.open_mainfile(filepath=ARGS.blend)
S = bpy.context.scene
CAM = S.camera
O = bpy.data.objects
W = ARGS.width
H = round(W * 948 / 1659)

# ── the medals' rod, back from the glass ───────────────────────────────────
# It hung 1.3 cm behind the glass, where the medals could only be painted on
# it. Back where a rod would be, 17 cm in, they hang in the case: the left
# door shows three, the right two, the mullion between.
ROD_X, ROD_Z, ROD_Y = -2.95, 2.444, (4.56, 6.10)
rod = O["VI cabinet | brass suspension rod"]
rod.location.x += ROD_X - (-2.793)
MEDAL_Y = [4.96, 5.2, 5.44, 5.86, 6.02]

# ── what moves in the game is not in the plates ────────────────────────────
MOBILE = [o for o in S.objects if o.name.startswith("VI mobile |") and "arm" not in o.name]
GLASS = O["cab_glass"]
def hidden(objs, yes=True):
    for o in objs: o.hide_render = yes

# ── the render, as room_vi.py's ────────────────────────────────────────────
S.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
for backend in ("OPTIX", "CUDA"):
    try:
        prefs.compute_device_type = backend; prefs.get_devices()
        if any(d.type == backend for d in prefs.devices):
            for d in prefs.devices: d.use = d.type == backend
            S.cycles.device = "GPU"
            break
    except Exception:
        pass
S.cycles.samples = ARGS.samples
S.cycles.seed = 6606
S.cycles.use_denoising = True
S.cycles.adaptive_threshold = .012 if ARGS.samples >= 256 else .035
S.render.resolution_x, S.render.resolution_y, S.render.resolution_percentage = W, H, 100
S.render.image_settings.file_format = "PNG"
S.render.image_settings.color_mode = "RGB"
S.render.use_border = False
S.view_layers[0].use_pass_z = True

def compositor(depth_to=None):
    S.use_nodes = True
    nt = S.node_tree; nt.nodes.clear()
    rl = nt.nodes.new("CompositorNodeRLayers")
    nt.links.new(rl.outputs["Image"], nt.nodes.new("CompositorNodeComposite").inputs["Image"])
    if depth_to:
        fo = nt.nodes.new("CompositorNodeOutputFile")
        fo.base_path = str(depth_to.parent)
        fo.file_slots[0].path = depth_to.stem + "_"
        fo.format.file_format = "OPEN_EXR"; fo.format.color_depth = "32"
        nt.links.new(rl.outputs["Depth"], fo.inputs[0])

def render(path, depth_to=None):
    compositor(depth_to)
    S.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    print("LIVE rendered", path, flush=True)

def pixels(path):
    """an image's pixels, rows from the top, as floats"""
    im = bpy.data.images.load(str(path), check_existing=False)
    im.colorspace_settings.name = "Non-Color"
    a = np.empty(im.size[0] * im.size[1] * 4, np.float32); im.pixels.foreach_get(a)
    a = a.reshape(im.size[1], im.size[0], 4)[::-1]
    bpy.data.images.remove(im)
    return a

def save(rgb, path):
    """rows from the top, 0..1, written as they are (no colour transform)"""
    h, w = rgb.shape[:2]
    im = bpy.data.images.new(path.stem, w, h, alpha=False)
    im.colorspace_settings.name = "Non-Color"
    a = np.ones((h, w, 4), np.float32); a[..., :3] = rgb[..., :3]
    im.pixels.foreach_set(a[::-1].ravel())
    im.filepath_raw = str(path); im.file_format = "PNG"; im.save()
    bpy.data.images.remove(im)

def picture(xyz):
    v = world_to_camera_view(S, CAM, Vector(xyz))
    return [round(v.x * W, 2), round((1 - v.y) * H, 2)]

DEPTH = {"near": 1.0, "far": 40.0}
data = {}
if Path(ARGS.data).exists():
    data = json.loads(Path(ARGS.data).read_text(encoding="utf-8"))

# ── the plate, and how far everything in it is ─────────────────────────────
if "plate" in ONLY:
    hidden(MOBILE); hidden([GLASS])
    render(WORK / "plate.png", WORK / "depth.exr")
    exr = sorted(WORK.glob("depth_*.exr"))[-1]
    z = pixels(exr)[..., 0]
    near, far = DEPTH["near"], DEPTH["far"]
    inv = (1 / np.clip(z, near, far) - 1 / far) / (1 / near - 1 / far)
    q = np.round(inv * 65535).astype(np.uint32)
    rgb = np.zeros((H, W, 3), np.float32)
    rgb[..., 0] = (q >> 8) / 255.0; rgb[..., 1] = (q & 255) / 255.0
    save(rgb, WORK / "depth.png")
    print("LIVE depth", float(z.min()), float(np.median(z)), float(z.max()), flush=True)

# ── a cloud over the moon ──────────────────────────────────────────────────
if "dim" in ONLY:
    hidden(MOBILE); hidden([GLASS])
    window = O["VI light | cool window"].data; energy = window.energy
    window.energy = energy * 0.3
    sky = bpy.data.materials["VI | actual blue night sky behind the garden"].node_tree.nodes["Emission"]
    sky_strength = sky.inputs["Strength"].default_value
    sky.inputs["Strength"].default_value = sky_strength * 0.45
    bg = [n for n in S.world.node_tree.nodes if n.type == "BACKGROUND"]
    was = [n.inputs["Strength"].default_value for n in bg]
    for n in bg: n.inputs["Strength"].default_value *= 0.5
    render(WORK / "plate-dim.png")
    window.energy = energy; sky.inputs["Strength"].default_value = sky_strength
    for n, s in zip(bg, was): n.inputs["Strength"].default_value = s

# ── the cabinet's glass: what it lays over what is behind it ───────────────
GLASS_BOX = None
if "glass" in ONLY or "plate" in ONLY:
    corners = [picture((-2.777, y, z)) for y in (4.55, 6.11) for z in (1.13, 2.49)]
    x0 = max(0, int(min(c[0] for c in corners)) - 8); x1 = min(W, int(max(c[0] for c in corners)) + 8)
    y0 = max(0, int(min(c[1] for c in corners)) - 8); y1 = min(H, int(max(c[1] for c in corners)) + 8)
    GLASS_BOX = [x0, y0, x1 - x0, y1 - y0]
if "glass" in ONLY:
    hidden(MOBILE); hidden([GLASS], False)
    S.render.use_border = True; S.render.use_crop_to_border = False
    x0, y0, w, h = GLASS_BOX
    S.render.border_min_x, S.render.border_max_x = x0 / W, (x0 + w) / W
    S.render.border_min_y, S.render.border_max_y = 1 - (y0 + h) / H, 1 - y0 / H
    render(WORK / "plate-glass.png")
    S.render.use_border = False
    on = pixels(WORK / "plate-glass.png")[y0:y0 + h, x0:x0 + w, :3]
    off = pixels(WORK / "plate.png")[y0:y0 + h, x0:x0 + w, :3]
    save(np.clip(on - off, 0, 1), WORK / "glass.png")

# ── the room as the medals and the mobile see it ───────────────────────────
PROBES = {"cabinet": (ROD_X - 0.02, 5.4, 2.25), "mobile": (0.43, 7.05, 1.55)}
if "probes" in ONLY:
    hidden(MOBILE); hidden([GLASS], False)
    pano = bpy.data.cameras.new("probe"); pano.type = "PANO"
    try: pano.panorama_type = "EQUIRECTANGULAR"
    except AttributeError: pano.cycles.panorama_type = "EQUIRECTANGULAR"
    eye = bpy.data.objects.new("probe", pano); S.collection.objects.link(eye)
    # (looking along +x with z up: three.js's equirectangular middle)
    eye.rotation_euler = (math.pi / 2, 0, -math.pi / 2)
    S.camera = eye
    S.render.resolution_x, S.render.resolution_y = 512, 256
    S.render.image_settings.file_format = "HDR"; S.render.image_settings.color_mode = "RGB"
    samples = S.cycles.samples; S.cycles.samples = min(256, samples)
    for name, at in PROBES.items():
        eye.location = at
        render(OUT / f"probe-{name}.hdr")
    S.cycles.samples = samples
    S.camera = CAM
    S.render.resolution_x, S.render.resolution_y = W, H
    S.render.image_settings.file_format = "PNG"

# ── the mobile, to be turned ───────────────────────────────────────────────
PIVOT = (0.43, 7.05, 1.9)
if "mobile" in ONLY:
    for o in S.objects: o.select_set(False)
    # (each placed, and the scene brought up to date, before the next is
    # hung from it: a parent's world matrix is stale until then)
    def adopt(child, parent):
        bpy.context.view_layer.update()
        mw = child.matrix_world.copy(); child.parent = parent; child.matrix_world = mw
        bpy.context.view_layer.update()
    def empty(name, at):
        e = bpy.data.objects.new(name, None); S.collection.objects.link(e); e.location = at
        bpy.context.view_layer.update()
        return e
    root = empty("mobile", PIVOT)
    hoop = O["VI mobile | embroidery hoop"]
    # (the hoop in a plain stained wood: the joinery's 4k scans are not sent)
    stain = bpy.data.materials.new("VI | mobile stained hoop"); stain.use_nodes = True
    sb = stain.node_tree.nodes["Principled BSDF"]
    sb.inputs["Base Color"].default_value = (0.075, 0.034, 0.018, 1); sb.inputs["Roughness"].default_value = 0.45
    hoop.data.materials.clear(); hoop.data.materials.append(stain)
    bpy.context.view_layer.objects.active = hoop; hoop.select_set(True)
    bpy.ops.object.convert(target="MESH"); hoop.select_set(False)
    hoop = O["VI mobile | embroidery hoop"]
    bpy.context.view_layer.update()
    adopt(hoop, root)
    for o in [o for o in MOBILE if "suspension" in o.name]: adopt(o, root)
    drops = [o for o in MOBILE if "drop" in o.name]
    shapes = [o for o in MOBILE if "sewn" in o.name]
    for i, thread in enumerate(sorted(drops, key=lambda o: o.name)):
        c = thread.matrix_world.translation
        top = max((thread.matrix_world @ Vector(v)).z for v in thread.bound_box)
        pin = empty(f"drop{i}", (c.x, c.y, top))
        adopt(pin, root); adopt(thread, pin)
        # (the sewn shapes were built in place, their origins at the room's)
        middle = lambda s: sum((s.matrix_world @ Vector(v) for v in s.bound_box), Vector()) / 8
        mine = min(shapes, key=lambda s: (middle(s).xy - c.xy).length)
        adopt(mine, pin)
    bpy.context.view_layer.update()
    for o in [root, *root.children_recursive]: o.hide_render = False; o.hide_set(False); o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT / "mobile.glb"), export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True, export_cameras=False, export_lights=False)
    print("LIVE mobile", [o.name for o in root.children_recursive], flush=True)

# ── where things are, for the game ─────────────────────────────────────────
m = CAM.matrix_world
data.update({
    "size": [W, H],
    "camera": {"matrix": [list(r) for r in m], "lens": CAM.data.lens, "sensor": CAM.data.sensor_width,
               "shift": [CAM.data.shift_x, CAM.data.shift_y], "near": 0.05, "far": 100},
    "depth": DEPTH,
    "glass": GLASS_BOX or data.get("glass"),
    "rod": {"x": ROD_X, "z": ROD_Z, "y": ROD_Y, "radius": 0.0065},
    "medals": [{"y": y} for y in MEDAL_Y],
    "cabinet": {"velvet": -3.338, "floor": 1.131, "glass": -2.777, "y": [4.55, 6.11], "z": [1.13, 2.49],
                "light": {"at": [-3.0, 5.33, 2.46], "to": [-3.0, 5.33, 1.15]}},
    "mobile": {"pivot": PIVOT, "wall": 7.515, "light": {"at": [0.0, 5.1, 2.8], "to": [0.0, 7.52, 2.45]}},
    "probes": {k: list(v) for k, v in PROBES.items()},
    "window": {"glass": [[-1.754, 7.74, 1.339], [-0.734, 7.74, 3.556]], "outside": 8.4},
})
Path(ARGS.data).write_text(json.dumps(data, indent=1), encoding="utf-8")
print("LIVE done", flush=True)
