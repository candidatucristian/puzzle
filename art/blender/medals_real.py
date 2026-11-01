# The Trophy Wall (levels/flags): the five Olympiad medals, struck in Blender
# as real medals are struck — a polished field that mirrors the room's light,
# the relief and the lettering frosted by the die, the rim burnished, the
# metal toned darker down in its recesses — each with the ring it hangs by.
# Bronze, bronze (the Brazilian one enamelled in its cells), silver, gold,
# copper; their dies are reliefs.mjs's (render/assets/medals).
#
# Seen straight on, as the game hangs them (flags/trophies.js): the light the
# trophy wall has — the lamp warm from the upper left, the rainy window cold
# on the right — and, mirrored in every polished field, a broad soft light
# going from warm to dark across it, as a medal held up in a room shows.
#
#   blender -b --factory-startup -P art/blender/medals_real.py -- [--samples 256] [--size 640] [--only de_leaf]
#   node art/blender/medals_publish.mjs

import bpy, bmesh, math, sys, os
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
from hall_common import ROOT

OUT = os.path.join(ROOT, ".artifacts/medals-real")
os.makedirs(OUT, exist_ok=True)
SAMPLES = int(arg("--samples", "256"))
SIZE = int(arg("--size", "640"))
DIES = "C:/Users/crist/Tools/render/assets/medals"
ONLY = arg("--only", "")

# name: (the metal, its toning in the recesses, how much of it there is)
GOLD, SILVER = (1.0, 0.77, 0.36), (0.94, 0.93, 0.89)
BRONZE, COPPER = (0.76, 0.48, 0.27), (0.92, 0.58, 0.45)
MEDALS = {
    "de_leaf": (BRONZE, (0.16, 0.09, 0.04), 0.55),
    "br_fern": (BRONZE, (0.16, 0.09, 0.04), 0.55),
    "ie_shamrock": (SILVER, (0.22, 0.2, 0.17), 0.4),
    "fi_sprig": (GOLD, (0.32, 0.2, 0.06), 0.35),
    "ng_flower": (COPPER, (0.2, 0.08, 0.04), 0.55),
    "br_flag": (BRONZE, (0.16, 0.09, 0.04), 0.55),
}

def image(path, colour=False):
    im = bpy.data.images.load(path, check_existing=True)
    im.colorspace_settings.name = "sRGB" if colour else "Non-Color"
    return im

def strike(name, metal, toning, tone_k):
    scene = fresh()
    # the blank: the die's square, the medal of radius 500/512 in it
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bm.loops.layers.uv.new()
    bmesh.ops.create_grid(bm, x_segments=800, y_segments=800, size=1.0, calc_uvs=True)
    bm.to_mesh(me); bm.free()
    disc = link(bpy.data.objects.new(name, me))
    for p in disc.data.polygons: p.use_smooth = True
    tex = bpy.data.textures.new(name + "_die", "IMAGE"); tex.image = image(f"{DIES}/{name}_height.png"); tex.extension = "EXTEND"
    dm = disc.modifiers.new("struck", "DISPLACE"); dm.texture = tex; dm.texture_coords = "UV"; dm.strength = 0.06; dm.mid_level = 0.0

    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; Lk = nt.links.new
    b = N["Principled BSDF"]; b.inputs["Metallic"].default_value = 1.0
    uv = N.new("ShaderNodeTexCoord")
    def tx(path, colour=False):
        t = N.new("ShaderNodeTexImage"); t.image = image(path, colour); t.extension = "EXTEND"; t.interpolation = "Cubic"
        Lk(uv.outputs["UV"], t.inputs["Vector"]); return t
    h = tx(f"{DIES}/{name}_height.png")
    # what stands proud (the relief, the lettering, the rim) and what is field
    proud = N.new("ShaderNodeMapRange"); proud.inputs["From Min"].default_value = 0.36; proud.inputs["From Max"].default_value = 0.44
    Lk(h.outputs["Color"], proud.inputs["Value"])
    # the field polished, the relief frosted, a few dull blooms of handling
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 5; nz.inputs["Detail"].default_value = 6
    Lk(uv.outputs["UV"], nz.inputs["Vector"])
    bloom = N.new("ShaderNodeMapRange"); bloom.inputs["From Min"].default_value = 0.45; bloom.inputs["From Max"].default_value = 0.75
    bloom.inputs["To Min"].default_value = 0.0; bloom.inputs["To Max"].default_value = 0.08; Lk(nz.outputs["Fac"], bloom.inputs["Value"])
    rough = N.new("ShaderNodeMapRange"); rough.inputs["To Min"].default_value = 0.1; rough.inputs["To Max"].default_value = 0.3
    Lk(proud.outputs["Result"], rough.inputs["Value"])
    rr = N.new("ShaderNodeMath"); rr.operation = "ADD"; Lk(rough.outputs["Result"], rr.inputs[0]); Lk(bloom.outputs["Result"], rr.inputs[1])
    Lk(rr.outputs["Value"], b.inputs["Roughness"])
    # toned dark in the recesses: down in the hollows and at the foot of the relief
    ao = N.new("ShaderNodeAmbientOcclusion"); ao.inputs["Distance"].default_value = 0.025; ao.only_local = True; ao.samples = 24
    tone = N.new("ShaderNodeMapRange"); tone.inputs["From Min"].default_value = 0.55; tone.inputs["From Max"].default_value = 0.95
    tone.inputs["To Min"].default_value = tone_k; tone.inputs["To Max"].default_value = 0.0
    Lk(ao.outputs["AO"], tone.inputs["Value"])
    col = N.new("ShaderNodeMix"); col.data_type = "RGBA"
    col.inputs[6].default_value = (*metal, 1); col.inputs[7].default_value = (*toning, 1)
    Lk(tone.outputs["Result"], col.inputs["Factor"])
    metal_out = col.outputs[2]
    # hairline scratches in the polish
    sc = N.new("ShaderNodeTexNoise"); sc.inputs["Scale"].default_value = 220; sc.inputs["Detail"].default_value = 3
    scm = N.new("ShaderNodeMapping"); scm.inputs["Scale"].default_value = (1, 22, 1); scm.inputs["Rotation"].default_value = (0, 0, 0.6)
    Lk(uv.outputs["UV"], scm.inputs["Vector"]); Lk(scm.outputs["Vector"], sc.inputs["Vector"])
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.035; bp.inputs["Distance"].default_value = 0.0006
    Lk(sc.outputs["Fac"], bp.inputs["Height"]); Lk(bp.outputs["Normal"], b.inputs["Normal"])
    surface = b.outputs["BSDF"]
    Lk(metal_out, b.inputs["Base Color"])
    if os.path.exists(f"{DIES}/{name}_enamel.png"):
        # the enamel in its cells: glassy colour, a little chipped
        en = N.new("ShaderNodeBsdfPrincipled")
        ec = tx(f"{DIES}/{name}_enamel.png", True)
        dk = N.new("ShaderNodeHueSaturation"); dk.inputs["Value"].default_value = 0.8; dk.inputs["Saturation"].default_value = 1.0
        Lk(ec.outputs["Color"], dk.inputs["Color"]); Lk(dk.outputs["Color"], en.inputs["Base Color"])
        en.inputs["Roughness"].default_value = 0.12; en.inputs["Specular IOR Level"].default_value = 0.5
        cells = tx(f"{DIES}/{name}_cells.png")
        ch = N.new("ShaderNodeTexNoise"); ch.inputs["Scale"].default_value = 22; ch.inputs["Detail"].default_value = 6
        Lk(uv.outputs["UV"], ch.inputs["Vector"])
        chip = N.new("ShaderNodeMapRange"); chip.inputs["From Min"].default_value = 0.7; chip.inputs["From Max"].default_value = 0.74
        chip.inputs["To Min"].default_value = 1.0; chip.inputs["To Max"].default_value = 0.0
        Lk(ch.outputs["Fac"], chip.inputs["Value"])
        k = N.new("ShaderNodeMath"); k.operation = "MULTIPLY"; Lk(cells.outputs["Color"], k.inputs[0]); Lk(chip.outputs["Result"], k.inputs[1])
        mix = N.new("ShaderNodeMixShader"); Lk(k.outputs["Value"], mix.inputs["Fac"]); Lk(b.outputs["BSDF"], mix.inputs[1]); Lk(en.outputs["BSDF"], mix.inputs[2])
        surface = mix.outputs["Shader"]
    # nothing beyond the medal's own outline
    mk = tx(f"{DIES}/{name}_mask.png")
    cut = N.new("ShaderNodeMixShader"); tr = N.new("ShaderNodeBsdfTransparent")
    Lk(mk.outputs["Color"], cut.inputs["Fac"]); Lk(tr.outputs["BSDF"], cut.inputs[1]); Lk(surface, cut.inputs[2])
    Lk(cut.outputs["Shader"], N["Material Output"].inputs["Surface"])
    disc.data.materials.append(m)

    # the ring it hangs by, through a lug at its top
    ring_m = bpy.data.materials.new(name + " ring"); ring_m.use_nodes = True
    rb = ring_m.node_tree.nodes["Principled BSDF"]; rb.inputs["Base Color"].default_value = (*metal, 1); rb.inputs["Metallic"].default_value = 1.0; rb.inputs["Roughness"].default_value = 0.18
    R = 500 / 512
    bpy.ops.mesh.primitive_torus_add(major_radius=0.115, minor_radius=0.025, location=(0, R * 0.84, 0.09), rotation=(math.pi / 2, 0, 0))
    ring = bpy.context.active_object; ring.data.materials.append(ring_m)
    for p in ring.data.polygons: p.use_smooth = True
    lug = cylinder(name + " lug", 0, R * 0.9, 0.0, 0.07, 0.065, ring_m, verts=32)

    # the room's light: the lamp warm from the upper left, the window cold
    # on the right; and over the camera a broad soft light, warm at its top
    # left going dark to its bottom right, for the polish to mirror
    world = bpy.data.worlds.new("room"); scene.world = world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.02, 0.014, 0.01, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
    lamp("lamp", "AREA", (-2.4, 2.2, 1.6), aim=(0, 0, 0), energy=float(arg("--key", "260")), colour=(1.0, 0.78, 0.52), size=1.4)
    lamp("window", "AREA", (2.6, -0.4, 1.2), aim=(0, 0, 0), energy=float(arg("--window", "70")), colour=(0.6, 0.72, 1.0), size=1.0, size_y=2.0)
    sky = bpy.data.meshes.new("softbox"); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=4.0, calc_uvs=True); bm.to_mesh(sky); bm.free()
    box_o = link(bpy.data.objects.new("softbox", sky)); box_o.location = (0, 0, 6.0); box_o.rotation_euler = (math.pi, 0, 0)
    sm = bpy.data.materials.new("softbox"); sm.use_nodes = True; SN = sm.node_tree.nodes; SL = sm.node_tree.links.new
    SN.remove(SN["Principled BSDF"]); em = SN.new("ShaderNodeEmission")
    stc = SN.new("ShaderNodeTexCoord"); grad = SN.new("ShaderNodeTexGradient"); gmap = SN.new("ShaderNodeMapping")
    gmap.inputs["Rotation"].default_value = (0, 0, math.radians(-40)); gmap.inputs["Location"].default_value = (0.15, 0.55, 0)
    SL(stc.outputs["Generated"], gmap.inputs["Vector"]); SL(gmap.outputs["Vector"], grad.inputs["Vector"])
    ramp = SN.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (1.0, 0.86, 0.66, 1); ramp.color_ramp.elements[1].color = (0.03, 0.025, 0.02, 1)
    ramp.color_ramp.elements[0].position = 0.12; ramp.color_ramp.elements[1].position = 0.88
    SL(grad.outputs["Fac"], ramp.inputs["Fac"]); SL(ramp.outputs["Color"], em.inputs["Color"])
    em.inputs["Strength"].default_value = float(arg("--softbox", "3.0"))
    SL(em.outputs["Emission"], SN["Material Output"].inputs["Surface"])
    box_o.data.materials.append(sm); box_o.visible_camera = False; box_o.visible_shadow = False

    # the camera straight on it, the medal filling the frame
    cd = bpy.data.cameras.new("eye"); cd.type = "ORTHO"; cd.ortho_scale = 2 * R * 1.004
    cam = link(bpy.data.objects.new("eye", cd)); cam.location = (0, 0, 3); scene.camera = cam
    cycles(scene, SAMPLES, SIZE, SIZE, exposure=float(arg("--exposure", "0.0")), glare=False, transparent=True)
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.cycles.adaptive_threshold = 0.006
    render(scene, os.path.join(OUT, f"{name}.png"))

for name, spec in MEDALS.items():
    if ONLY and name != ONLY: continue
    strike(name, *spec)
print("MEDALS_DONE")
