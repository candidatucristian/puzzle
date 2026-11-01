# The Night Circuit (levels/rally): everything else on its screen, made in
# Blender — the board the top three come up on (black lacquer, a fine gold
# line, TOP 3, each row a turned cup in its own metal and a name in gilt);
# the tape's own lettering (the recorder's PLAY and SP, the broadcaster's
# caption with its LIVE tag); and the television the race is watched on in
# the house — the flat set on the drawing room's red damask, its glass left
# clear for the picture.
#
# Each is drawn at the size the game shows it at on its 1880 × 1000 picture,
# twice over (board.json: what is where, and how big).
#
#   blender -b --factory-startup -P art/blender/rally_board.py -- [--samples 128]
#   node art/blender/rally_publish.mjs

import bpy, bmesh, math, sys, os, json
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import ROOT, scan

OUT = os.path.join(ROOT, ".artifacts/rally/board"); os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "128"))
RES = 2                                           # (pixels to one of the picture's)
RW, RH = 1880, 1000
SERIF = "C:/Windows/Fonts/georgiab.ttf"; OSD = "C:/Windows/Fonts/consolab.ttf"; SANS = "C:/Windows/Fonts/arialbd.ttf"
META = {"res": RES}
PX = 0.001                                        # (a picture pixel is a millimetre here)

def stage_for(w, h, z=5.0):
    """a fresh scene, an orthographic camera straight down onto w × h picture pixels"""
    scene = fresh()
    cd = bpy.data.cameras.new("eye"); cd.type = "ORTHO"; cd.sensor_fit = "HORIZONTAL" if w >= h else "VERTICAL"
    cd.ortho_scale = max(w, h) * PX
    cam = link(bpy.data.objects.new("eye", cd)); cam.location = (w * PX / 2, -h * PX / 2, z); scene.camera = cam
    cycles(scene, SAMPLES, int(round(w * RES)), int(round(h * RES)), exposure=0.0, glare=False, transparent=True)
    scene.view_settings.look = "AgX - Medium High Contrast"
    return scene
def at(x, y, z=0.0): return Vector((x * PX, -y * PX, z * PX))
def text(body, x, y, size, font, mat, align="LEFT", valign="CENTER", z=0.2, extrude=0.2):
    cu = bpy.data.curves.new("text", "FONT"); cu.body = body; cu.font = bpy.data.fonts.load(font, check_existing=True)
    cu.size = size * PX; cu.align_x = align; cu.align_y = valign; cu.extrude = extrude * PX; cu.resolution_u = 16
    o = link(bpy.data.objects.new("text " + body, cu)); cu.materials.append(mat); o.location = at(x, y, z)
    bpy.context.view_layer.update()
    return o
def width_of(o): bpy.context.view_layer.update(); return o.dimensions.x / PX
def lights_for(w, h, warm=1.0, over=True):
    world = bpy.data.worlds.new("dark"); bpy.context.scene.world = world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.02, 0.018, 0.016, 1)
    lamp("key", "AREA", (w * PX * 0.1, h * PX * 0.4, 1.2), aim=(w * PX / 2, -h * PX / 2, 0), energy=60 * warm, colour=(1.0, 0.82, 0.62), size=0.8)
    lamp("fill", "AREA", (w * PX * 1.1, -h * PX * 1.2, 1.0), aim=(w * PX / 2, -h * PX / 2, 0), energy=18, colour=(0.7, 0.78, 1.0), size=1.0)
    if over: lamp("over", "AREA", (w * PX / 2, -h * PX / 2, 2.0), aim=(w * PX / 2, -h * PX / 2, 0), energy=25, colour=(1.0, 0.92, 0.82), size=2.0)
    else:
        # (over the camera a broad soft light, warm at its top left going dark: what polish and gilt mirror)
        for o in [o for o in bpy.context.scene.objects if o.type == "LIGHT"]: o.data.energy *= 0.15
        me = bpy.data.meshes.new("softbox"); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=3.0, calc_uvs=True); bm.to_mesh(me); bm.free()
        sb = link(bpy.data.objects.new("softbox", me)); sb.location = (w * PX / 2, -h * PX / 2, 7.0); sb.rotation_euler = (math.pi, 0, 0)
        sm = bpy.data.materials.new("softbox"); sm.use_nodes = True; SN = sm.node_tree.nodes; SL = sm.node_tree.links.new
        SN.remove(SN["Principled BSDF"]); em = SN.new("ShaderNodeEmission")
        stc = SN.new("ShaderNodeTexCoord"); gr = SN.new("ShaderNodeTexGradient"); gm = SN.new("ShaderNodeMapping")
        gm.inputs["Rotation"].default_value = (0, 0, math.radians(-35)); gm.inputs["Location"].default_value = (0.2, 0.5, 0)
        SL(stc.outputs["Generated"], gm.inputs["Vector"]); SL(gm.outputs["Vector"], gr.inputs["Vector"])
        rp = SN.new("ShaderNodeValToRGB"); rp.color_ramp.elements[0].color = (1.0, 0.85, 0.62, 1); rp.color_ramp.elements[1].color = (0.05, 0.04, 0.03, 1)
        rp.color_ramp.elements[0].position = 0.15; rp.color_ramp.elements[1].position = 0.85
        SL(gr.outputs["Fac"], rp.inputs["Fac"]); SL(rp.outputs["Color"], em.inputs["Color"]); em.inputs["Strength"].default_value = 2.5
        SL(em.outputs["Emission"], SN["Material Output"].inputs["Surface"]); sb.data.materials.append(sm); sb.visible_camera = False

# (made again in every fresh scene)
def gold(): return aged_metal("gold leaf", (0.9, 0.68, 0.3), (0.3, 0.2, 0.06), rough=(0.25, 0.4), scale=200, tarnish=0.2)
def lacquer(): return plain("black lacquer", (0.012, 0.011, 0.012), rough=0.35, coat=0.15)

# ── the podium board ───────────────────────────────────────────────────────
s = 1.1
pw, rowH, head = 520 * s, 76 * s, 74 * s
ph = head + rowH * 3 + 24 * s
pad = 16 * s
BW, BH = pw + 2 * pad, ph + 2 * pad
scene = stage_for(BW, BH)
GOLD_LEAF, LACQUER = gold(), lacquer()
lights_for(BW, BH, over=False)
b = box("board", 0, BW * PX, -BH * PX, 0, 0, 6 * PX, LACQUER); bevel(b, 4 * PX, 3)
for (x0, y0, x1, y1) in ((pad - 6, pad - 6, BW - pad + 6, pad - 4), (pad - 6, BH - pad + 4, BW - pad + 6, BH - pad + 6),
                         (pad - 6, pad - 6, pad - 4, BH - pad + 6), (BW - pad + 4, pad - 6, BW - pad + 6, BH - pad + 6)):
    box("gilt line", x0 * PX, x1 * PX, -y1 * PX, -y0 * PX, 6 * PX, 6.6 * PX, GOLD_LEAF)
cx = BW / 2
text("TOP 3", cx, pad + 36 * s, 30 * s, SERIF, GOLD_LEAF, align="CENTER", z=6.2)
ry = pad + 62 * s
for (x0, x1) in ((pad + 44 * s, cx - 10 * s), (cx + 10 * s, pad + pw - 44 * s)):
    box("rule", x0 * PX, x1 * PX, -(ry + 0.8) * PX, -(ry - 0.8) * PX, 6 * PX, 6.4 * PX, GOLD_LEAF)
d = sphere("rule diamond", tuple(at(cx, ry, 6.3)), 4.5 * s * PX, GOLD_LEAF, squash=(1, 1, 0.2)); d.rotation_euler = (0, 0, math.pi / 4); d.scale = (0.8, 0.8, 0.2)
for i in (1, 2):
    y = pad + head + rowH * i
    box("row rule", (pad + 30 * s) * PX, (pad + pw - 30 * s) * PX, -(y + 0.5) * PX, -(y - 0.5) * PX, 6 * PX, 6.2 * PX, plain("faint gilt", (0.35, 0.27, 0.12), rough=0.5))
render(scene, os.path.join(OUT, "board.png"))
META["board"] = {"w": BW, "h": BH, "pad": pad, "pw": pw, "ph": ph, "rowH": rowH, "head": head, "s": s}

# ── the cups ───────────────────────────────────────────────────────────────
METALS = {"gold": ((1.0, 0.76, 0.34), 0.18), "silver": ((0.93, 0.93, 0.92), 0.16), "bronze": ((0.78, 0.47, 0.26), 0.24)}
META["cups"] = {}
for name, (colour, rough) in METALS.items():
    h = (62 if name == "gold" else 56) * s
    w = h * 0.9
    scene = stage_for(w, h, z=5.0)
    LACQUER = lacquer()
    world = bpy.data.worlds.new("cup room"); scene.world = world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.05, 0.04, 0.035, 1)
    metal = plain(f"cup {name}", colour, rough=rough, metal=1.0)
    # (turned, standing on a black plinth with a brass plate; seen from the front)
    u = h * PX
    cup = lathe("cup", [(0, 0), (0.17 * u, 0), (0.15 * u, 0.04 * u), (0.05 * u, 0.08 * u), (0.04 * u, 0.3 * u), (0.07 * u, 0.36 * u), (0.26 * u, 0.48 * u),
                        (0.3 * u, 0.62 * u), (0.31 * u, 0.74 * u), (0.29 * u, 0.74 * u), (0.27 * u, 0.62 * u), (0.23 * u, 0.5 * u), (0, 0.45 * u)], metal, steps=96)
    cup.location = (w * PX / 2, 0, 0.2 * u)
    for side in (-1, 1):
        tube("handle", [(0.27 * u * side, 0.68 * u + 0.2 * u), (0.42 * u * side, 0.64 * u + 0.2 * u), (0.42 * u * side, 0.52 * u + 0.2 * u), (0.24 * u * side, 0.46 * u + 0.2 * u)], 0.018 * u, metal, at=(w * PX / 2, 0, 0))
    pl = box("plinth", w * PX / 2 - 0.22 * u, w * PX / 2 + 0.22 * u, -0.2 * u, 0.2 * u, 0.0, 0.2 * u, LACQUER); bevel(pl, 0.01 * u, 2)
    plate = box("plate", w * PX / 2 - 0.12 * u, w * PX / 2 + 0.12 * u, -0.204 * u, -0.2 * u, 0.06 * u, 0.14 * u, plain("cup plate", (0.7, 0.55, 0.3), rough=0.3, metal=1.0))
    # (the camera faces the cup from the front: lay the scene so its foot is the picture's bottom)
    cam = scene.camera; cam.location = (w * PX / 2, -1.0, h * PX / 2 - 0.2 * u); cam.rotation_euler = (math.pi / 2, 0, 0)
    cam.data.sensor_fit = "VERTICAL"; cam.data.ortho_scale = h * PX
    lamp("key", "AREA", (w * PX / 2 - 0.5, -0.6, 0.4), aim=(w * PX / 2, 0, 0.3 * u), energy=float(arg("--cupkey", "18")), colour=(1.0, 0.85, 0.66), size=0.4)
    lamp("rim", "AREA", (w * PX / 2 + 0.4, 0.3, 0.3), aim=(w * PX / 2, 0, 0.4 * u), energy=10, colour=(0.75, 0.82, 1.0), size=0.3)
    lamp("front", "AREA", (w * PX / 2, -0.8, 0.1), aim=(w * PX / 2, 0, 0.3 * u), energy=6, colour=(1.0, 0.95, 0.88), size=0.8)
    for o in (cup, pl, plate): pass
    render(scene, os.path.join(OUT, f"cup-{name}.png"))
    META["cups"][name] = {"w": w, "h": h}

# ── the names ──────────────────────────────────────────────────────────────
WINNERS = [(1, "Alan Brown", (0.96, 0.9, 0.72)), (2, "Chad Dawson", (0.88, 0.85, 0.77)), (3, "Eugene Fontaine", (0.88, 0.85, 0.77))]
META["names"] = []
for (place, name, colour) in WINNERS:
    size = 27 * s; label = f"{place}. {name}"
    w_guess = size * 0.62 * len(label) + 20; h_ = size * 1.6
    scene = stage_for(w_guess, h_)
    lights_for(w_guess, h_, warm=0.8)
    gilt = aged_metal(f"name gilt {place}", colour, (colour[0] * 0.4, colour[1] * 0.35, colour[2] * 0.25), rough=(0.28, 0.42), scale=200, tarnish=0.15)
    t = text(label, 6, h_ / 2, size, SERIF, gilt, z=0.0, extrude=1.0)
    w = width_of(t) + 14
    scene.render.resolution_x = int(round(w * RES)); scene.camera.data.ortho_scale = max(w, h_) * PX
    scene.camera.data.sensor_fit = "HORIZONTAL" if w >= h_ else "VERTICAL"; scene.camera.location = (w * PX / 2, -h_ * PX / 2, 5.0)
    render(scene, os.path.join(OUT, f"name-{place}.png"))
    META["names"].append({"place": place, "w": w, "h": h_})

# ── the tape's lettering: PLAY, SP, the caption ───────────────────────────
def flat(name, colour, strength=1.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; N = m.node_tree.nodes; N.remove(N["Principled BSDF"])
    e = N.new("ShaderNodeEmission"); e.inputs["Color"].default_value = (*colour, 1); e.inputs["Strength"].default_value = strength
    m.node_tree.links.new(e.outputs[0], N["Material Output"].inputs["Surface"]); return m
def lettering(name, items, w, h):
    scene = stage_for(w, h)
    world = bpy.data.worlds.new("none"); scene.world = world; world.use_nodes = True; world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0
    scene.view_settings.view_transform = "Standard"; scene.view_settings.look = "None"
    for it in items: it()
    render(scene, os.path.join(OUT, name + ".png"))
os_ = round(RH * 0.042)
WHITE = (0.92, 0.92, 0.88)
def play_mark():
    m = flat("osd white", WHITE)
    t = text("PLAY", 4, os_ * 0.65, os_, OSD, m, z=0.0, extrude=0.0)
    x = 4 + width_of(t) + os_ * 0.35; y = os_ * 0.65; s_ = os_ * 0.36
    me = bpy.data.meshes.new("play mark"); me.from_pydata([tuple(at(x, y - s_)), tuple(at(x + s_ * 1.5, y)), tuple(at(x, y + s_))], [], [(0, 1, 2)]); me.update()
    link(bpy.data.objects.new("play mark", me)).data.materials.append(m)
lettering("osd-play", [play_mark], os_ * 4.6, os_ * 1.3)
lettering("osd-sp", [lambda: text("SP", 4, os_ * 0.5, os_ * 0.7, OSD, flat("osd white", WHITE), z=0.0, extrude=0.0)], os_ * 1.8, os_ * 1.0)
META["osd"] = {"size": os_, "play": [os_ * 4.6, os_ * 1.3], "sp": [os_ * 1.8, os_ * 1.0]}
cs = round(RH * 0.03)
TITLE, LINE = "THE GRAND NIGHT RALLY", "FINAL STAGE  \u00b7  THE CHAMPIONSHIP IS DECIDED TONIGHT"
pad_c = cs * 0.5
tw_, lw_ = cs * 1.25 * 0.62 * len(TITLE), cs * 0.62 * 0.6 * len(LINE)
boxW = max(tw_, lw_) + pad_c * 2.4
th_, lh_ = cs * 1.25 * 1.15, cs * 0.62 * 1.15
boxH = th_ + lh_ + pad_c * 1.4
tagH = cs * 0.62 * 1.15 + pad_c * 0.3; tagW = cs * 0.62 * 2.6 + pad_c * 1.2
CW, CH = boxW, boxH + tagH
def caption():
    box("caption box", 0, boxW * PX, -CH * PX, -tagH * PX, -1 * PX, 0, flat("caption navy", (0.02, 0.05, 0.2), 0.78))
    rule_h = max(2, cs * 0.12)
    box("caption rule", 0, boxW * PX, -CH * PX, -(CH - rule_h) * PX, 0, 0.5 * PX, flat("caption gold", (0.75, 0.5, 0.06)))
    box("live tag", 0, tagW * PX, -tagH * PX, 0, 0, 0.5 * PX, flat("live red", (0.62, 0.02, 0.02)))
    text("LIVE", tagW / 2, tagH / 2, cs * 0.62, SANS, flat("live white", WHITE), align="CENTER", z=1.0, extrude=0.0)
    text(TITLE, boxW - pad_c * 1.2, tagH + pad_c * 0.6 + th_ / 2, cs * 1.25, SANS, flat("title white", (1, 1, 1)), align="RIGHT", z=1.0, extrude=0.0)
    text(LINE, boxW - pad_c * 1.2, tagH + pad_c * 0.7 + th_ + lh_ / 2, cs * 0.62, SANS, flat("line gold", (1.0, 0.75, 0.15)), align="RIGHT", z=1.0, extrude=0.0)
lettering("caption", [caption], CW, CH)
META["caption"] = {"w": CW, "h": CH, "tagH": tagH}

# ── the television, on the drawing room's wall ─────────────────────────────
ZOOM = 0.9
FW, FH = RW / ZOOM, RH / ZOOM
x0, y0 = (FW - RW) / 2, (FH - RH) / 2
scene = stage_for(FW, FH, z=3.0)
scene.view_settings.look = "AgX - Medium High Contrast"
world = bpy.data.worlds.new("room"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.01, 0.008, 0.008, 1)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")
paper = bpy.data.materials.new("red damask"); paper.use_nodes = True
PN = paper.node_tree.nodes; PL = paper.node_tree.links.new; pb = PN["Principled BSDF"]
ptc = PN.new("ShaderNodeTexCoord"); pmp = PN.new("ShaderNodeMapping"); pmp.inputs["Scale"].default_value = (1 / 0.55,) * 3
PL(ptc.outputs["Object"], pmp.inputs["Vector"])
pti = PN.new("ShaderNodeTexImage"); pti.image = bpy.data.images.load(os.path.join(DRAWN, "study-paper.png"), check_existing=True); PL(pmp.outputs["Vector"], pti.inputs["Vector"])
phs = PN.new("ShaderNodeHueSaturation"); phs.inputs["Hue"].default_value = 0.0; phs.inputs["Saturation"].default_value = 1.0
tint = PN.new("ShaderNodeMix"); tint.data_type = "RGBA"; tint.blend_type = "MULTIPLY"; tint.inputs["Factor"].default_value = 1.0; tint.inputs[7].default_value = (0.55, 0.16, 0.14, 1)
PL(pti.outputs["Color"], tint.inputs[6]); PL(tint.outputs[2], pb.inputs["Base Color"]); pb.inputs["Roughness"].default_value = 0.85
wall = box("wall", -0.5, FW * PX + 0.5, -FH * PX - 0.5, 0.5, -0.02, 0.0, paper)
edge = min(x0, y0) * 0.42
BEZEL = plain("bezel", (0.012, 0.012, 0.014), rough=0.32, coat=0.3)
tv = box("television", (x0 - edge) * PX, (x0 + RW + edge) * PX, -(y0 + RH + edge) * PX, -(y0 - edge) * PX, 0.0, 0.035, BEZEL); bevel(tv, edge * 0.35 * PX, 4)
hole = box("glass", x0 * PX, (x0 + RW) * PX, -(y0 + RH) * PX, -y0 * PX, 0.034, 0.0375, plain("screen", (0, 0, 0), rough=0.1))
hole.is_holdout = True
sphere("standby lamp", tuple(at(x0 + RW - edge * 1.4, y0 + RH + edge * 0.5, 36.5)), max(1.6, edge * 0.1) * PX, plain("standby", (0.6, 0.02, 0.01), emit=(1.0, 0.05, 0.02), strength=4))
lamp("room", "AREA", (FW * PX * 0.15, FH * PX * 0.5, 1.4), aim=(FW * PX / 2, -FH * PX / 2, 0), energy=float(arg("--tvroom", "140")), colour=(1.0, 0.72, 0.45), size=1.6)
lamp("the set's own light", "AREA", (FW * PX / 2, -FH * PX / 2, 0.25), aim=(FW * PX / 2, -FH * PX / 2, -1), energy=0.0, colour=(0.7, 0.8, 1.0), size=1.5)
fill = lamp("fill", "AREA", (FW * PX / 2, -FH * PX * 1.4, 1.2), aim=(FW * PX / 2, -FH * PX / 2, 0), energy=6, colour=(0.8, 0.85, 1.0), size=2.0)
render(scene, os.path.join(OUT, "tv.png"))
META["tv"] = {"w": FW, "h": FH, "x0": x0, "y0": y0, "zoom": ZOOM}
with open(os.path.join(OUT, "board.json"), "w") as fh: json.dump(META, fh, indent=1)
print("RALLY_BOARD_DONE")
