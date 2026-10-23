# What the manor's halls are built and rendered with, on every floor: the
# measures of levels/hall/hall.js layoutHall turned to metres, the camera the
# game draws its halls through, scanned materials, and the passes the game
# lays over one another (levels/hall/hallRender.js).
#
# hall.js's places: X across and Y down from the eye, in pixels at the
# picture, z how far (1 at the picture). In metres a place is
# (X·K, z·D0, EYE − Y·K): the eye 1.55 m up, a lens of 15.3 mm, so
# everything the game keeps alive over the picture falls where it is drawn.

import bpy, bmesh, math, os
from mathutils import Vector
from kit import *

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))

# ── hall.js's measures, at the picture the layout is reckoned for ──────────
WR, HR = 1856, 1000                 # (any wide screen is this, stretched)
U = min(WR / 1000, HR / 700)
F_PX = 0.791 * HR                   # the lens, in pixels: doors 0.43 as wide as tall
K = 2.3 / (0.92 * HR)               # metres a pixel, at the picture: doors 2.3 m
D0 = F_PX * K                       # how far the picture stands from the eye
EYE = 0.62 * HR * K                 # the floor 0.62 of the height below the eye
WALL = 0.6 * WR * K                 # half the hall's width
CEIL = EYE + 0.66 * HR * K
END = 4.7 * D0
VP = (WR * 0.5, HR * 0.47)
DOOR_LEN, DOOR_H = 0.5 * D0, 0.92 * HR * K
Y0 = 1.8                            # the nearest the hall is built
def at(X, Y, z):
    """hall.js's place (X across and Y down, in pixels at the picture; z
    far) in metres"""
    return Vector((X * K, z * D0, EYE - Y * K))
def from_screen(sx, sy, height):
    """where a point of the reference picture lies, at a given height"""
    d = Vector(((sx - VP[0]) / F_PX, 1.0, -(sy - VP[1]) / F_PX))
    t = (height - EYE) / d.z
    return Vector((0, 0, EYE)) + d * t
def sconce_tip(side, zs):
    """where a sconce's candle burns, as the scene lights it"""
    return Vector(((side * (0.6 * WR - 20 * U)) * K, zs * D0, EYE + (0.2 * HR + 24 * U) * K))

def stage(width):
    """an empty scene, its camera the hall's eye; and the picture's height"""
    scene = fresh()
    cd = bpy.data.cameras.new("eye"); cd.lens = F_PX / WR * 36; cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36
    cd.shift_y = -(0.5 - 0.47) * HR / WR; cd.clip_start = 0.05; cd.clip_end = 60
    cam = link(bpy.data.objects.new("eye", cd)); cam.location = (0, 0, EYE); cam.rotation_euler = (math.pi / 2, 0, 0)
    scene.camera = cam
    return scene, round(width * HR / WR)

# ── materials ──────────────────────────────────────────────────────────────
def scan(name, tid, size=1.0, tint=(1, 1, 1), bright=1.0, sat=1.0, rough=(0.4, 0.8), bump=0.4, coat=0.0, upright=False, uvs=False, rot=None, vary=0.0):
    """a Poly Haven scan, laid by the object's own coordinates; darker in its
    corners and joins; `vary` each piece a little lighter or darker"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links.new; b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / size,) * 3
    if upright: mp.inputs["Rotation"].default_value = (0, math.pi / 2, 0)
    if rot: mp.inputs["Rotation"].default_value = rot
    L(tc.outputs["UV" if uvs else "Object"], mp.inputs["Vector"])
    def tex(kind, colour=False):
        for folder in ("textures4k", "textures"):
            for ext in ("jpg", "png"):
                p = f"{ASSETS}/{folder}/{tid}/{kind}.{ext}"
                if os.path.exists(p):
                    t = N.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(p, check_existing=True)
                    t.image.colorspace_settings.name = "sRGB" if colour else "Non-Color"
                    if not uvs: t.projection = "BOX"; t.projection_blend = 0.2
                    L(mp.outputs["Vector"], t.inputs["Vector"]); return t
        return None
    d = tex("Diffuse", True)
    h = N.new("ShaderNodeHueSaturation"); h.inputs["Value"].default_value = bright; h.inputs["Saturation"].default_value = sat
    L(d.outputs["Color"], h.inputs["Color"])
    if vary:
        oi = N.new("ShaderNodeObjectInfo"); vr = N.new("ShaderNodeMapRange")
        vr.inputs["To Min"].default_value = bright * (1 - vary); vr.inputs["To Max"].default_value = bright * (1 + vary * 0.5)
        L(oi.outputs["Random"], vr.inputs["Value"]); L(vr.outputs["Result"], h.inputs["Value"])
    t = N.new("ShaderNodeMix"); t.data_type = "RGBA"; t.blend_type = "MULTIPLY"; t.inputs["Factor"].default_value = 1; t.inputs[7].default_value = (*tint, 1)
    L(h.outputs["Color"], t.inputs[6])
    # (age: darker in the corners and joins)
    ao = N.new("ShaderNodeAmbientOcclusion"); ao.inputs["Distance"].default_value = 0.25
    ar = N.new("ShaderNodeValToRGB"); ar.color_ramp.elements[0].color = (0.45, 0.43, 0.4, 1)
    L(ao.outputs["AO"], ar.inputs["Fac"])
    am = N.new("ShaderNodeMix"); am.data_type = "RGBA"; am.blend_type = "MULTIPLY"; am.inputs["Factor"].default_value = 1
    L(t.outputs[2], am.inputs[6]); L(ar.outputs["Color"], am.inputs[7]); L(am.outputs[2], b.inputs["Base Color"])
    r = tex("Rough")
    if r:
        mr = N.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = rough[0]; mr.inputs["To Max"].default_value = rough[1]
        L(r.outputs["Color"], mr.inputs["Value"]); L(mr.outputs["Result"], b.inputs["Roughness"])
    else:
        b.inputs["Roughness"].default_value = sum(rough) / 2
    hgt = tex("Displacement") or r
    if hgt:
        bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump; bp.inputs["Distance"].default_value = 0.002
        L(hgt.outputs["Color"], bp.inputs["Height"]); L(bp.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Coat Weight"].default_value = coat; b.inputs["Coat Roughness"].default_value = 0.12
    return m

# ── what is architecture: held out of the furniture's own pass ─────────────
ARCH = []
def arch(o):
    ARCH.append(o); return o
def slab(x0, x1, y0, y1, z0, z1, mat, r=0.006, keep=True):
    o = box("part", x0, x1, y0, y1, z0, z1, mat)
    if r: bevel(o, r, 2)
    return arch(o) if keep else o

def clear_glass():
    """glass lets the light through it: shadow rays pass every glass, and
    every liquid behind glass"""
    for mat in bpy.data.materials:
        if not mat.use_nodes or mat.get("clear"): continue
        nt = mat.node_tree; b = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not b or b.inputs["Transmission Weight"].default_value < 0.5: continue
        out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
        src = out.inputs["Surface"].links[0].from_socket
        l2 = nt.nodes.new("ShaderNodeLightPath"); tr = nt.nodes.new("ShaderNodeBsdfTransparent"); mx = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(l2.outputs["Is Shadow Ray"], mx.inputs["Fac"]); nt.links.new(src, mx.inputs[1]); nt.links.new(tr.outputs["BSDF"], mx.inputs[2])
        nt.links.new(mx.outputs["Shader"], out.inputs["Surface"]); mat["clear"] = True

def haze(density, beyond=4.0):
    """a little dust in the air, for light to be seen in, the hall's length
    and on past its end"""
    me = bpy.data.meshes.new("air"); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * (2 * WALL - 0.4), Y0 + 0.2 + (v.co.y + 0.5) * (END + beyond - Y0), 0.05 + (v.co.z + 0.5) * (CEIL - 0.3)))
    bm.to_mesh(me); bm.free()
    air = link(bpy.data.objects.new("air", me))
    am = bpy.data.materials.new("haze"); am.use_nodes = True
    an = am.node_tree.nodes; an.remove(an["Principled BSDF"]); vol = an.new("ShaderNodeVolumePrincipled"); vol.inputs["Density"].default_value = density; vol.inputs["Anisotropy"].default_value = 0.5
    am.node_tree.links.new(vol.outputs["Volume"], an["Material Output"].inputs["Volume"])
    air.data.materials.append(am); air.visible_shadow = False; ARCH.append(air)
    return air

# ── the passes ─────────────────────────────────────────────────────────────
def passes(scene, out, only, air, apart=None, unseen=None, variants=None):
    """Render what the game lays together:
      plate   the hall, without what moves
      doors   the same with nothing stood in it (what stands there still
              throws its shadow), for a door to swing open with
      front   what stands in it, alone
      and each part in `apart` alone, `unseen[name]` hidden while it is;
      and each of `variants` — name: (switch on, switch off) — as a plate."""
    apart, unseen, variants = apart or {}, unseen or {}, variants or {}
    moving = [o for objs in apart.values() for o in objs]
    built = {o.name for o in ARCH} | {o.name for o in moving}
    furniture = [o for o in bpy.data.objects if o.type in ("MESH", "CURVE", "FONT") and o.name not in built]
    def visible(objs, yes):
        for o in objs: o.hide_render = not yes
    def held(objs, yes):
        for o in objs: o.is_holdout = yes
    def opaque():
        scene.render.film_transparent = False; scene.render.image_settings.color_mode = "RGB"
    def alone():
        scene.render.film_transparent = True; scene.render.image_settings.color_mode = "RGBA"
    visible(moving, False)
    if "plate" in only:
        opaque(); render(scene, os.path.join(out, "plate.png"))
    for name, (on, off) in variants.items():
        if name in only:
            opaque(); on(); render(scene, os.path.join(out, f"{name}.png")); off()
    if "doors" in only:
        opaque()
        for o in furniture: o.visible_camera = False
        render(scene, os.path.join(out, "doors.png"))
        for o in furniture: o.visible_camera = True
    if "front" in only:
        alone(); held(ARCH, True); air.hide_render = True
        render(scene, os.path.join(out, "front.png"))
        held(ARCH, False); air.hide_render = False
    for name, objs in apart.items():
        if name not in only: continue
        alone(); visible(objs, True); held(ARCH + furniture, True); air.hide_render = True; visible(unseen.get(name, []), False)
        render(scene, os.path.join(out, f"{name}.png"))
        visible(objs, False); held(ARCH + furniture, False); air.hide_render = False; visible(unseen.get(name, []), True)

def candle_sconce(side, tip, brass, wax, wick, candle=0.2, lit=True):
    """a brass sconce on a side wall: a plate, an arm, a drip pan, a cup and
    its candle, `candle` long, burning down to `tip` (a stub, if it is out)"""
    objs = []
    bp = cylinder("backplate", 0, 0, -0.01, 0.01, 0.045, brass, verts=48); bp.rotation_euler = (math.pi / 2, 0, 0); bp.scale = (1, 2.0, 1); bp.location = (-0.085, 0, 0.095)
    bevel(bp, 0.005, 3); objs.append(bp)
    objs.append(tube("arm", [(-0.085, 0.1), (-0.05, 0.07), (-0.012, 0.085), (0.008, 0.14), (0.0, 0.205)], 0.009, brass))
    objs.append(lathe("pan", [(0, 0), (0.008, 0), (0.058, 0.012), (0.062, 0.02), (0.057, 0.022), (0.01, 0.014), (0, 0.014)], brass, at=(0, 0, 0.205), steps=48))
    objs.append(lathe("cup", [(0, 0), (0.019, 0), (0.023, 0.02), (0.019, 0.034), (0.026, 0.058), (0.028, 0.063), (0.024, 0.064), (0, 0.058)], brass, at=(0, 0, 0.217), steps=48))
    top = 0.27 + candle
    if candle > 0:
        objs.append(cylinder("candle", 0, 0, 0.27, top, 0.018, wax, verts=32))
        for k in range(3):
            a = -0.9 + k * 1.1; L_ = 0.03 + k * 0.014
            objs.append(sphere("drip", (math.cos(a) * 0.018, -abs(math.sin(a)) * 0.018, top - L_ / 2), 0.0042, wax, squash=(1, 1, L_ / 0.0084)))
        objs.append(cylinder("wick", 0, 0, top - 0.002, top + (0.015 if lit else 0.006), 0.0012, wick, verts=6))
    root = bpy.data.objects.new("sconce", None); link(root)
    for o in objs: o.parent = root
    # (its plate against the wall: to the left on the left wall, to the right on the right)
    root.rotation_euler = (0, 0, 0 if side < 0 else math.pi)
    root.location = (tip.x, tip.y, tip.z - 0.485)
    return root
