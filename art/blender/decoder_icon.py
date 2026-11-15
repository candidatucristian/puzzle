# The hint drawer's decoder mark: an old brass cipher wheel, lying on the
# table and seen from above at a slant. It stands in the hints of the puzzles
# whose message is written in a code that can be looked up or run through a
# decoder (Morse, binary, Braille, the tap code, T9, Caesar), and says
# only that: a decoding device may help.
#
# The wheel: a reeded base plate engraved with the outer alphabet, a turned
# inner disc with the inner one, set three letters round (a Caesar shift),
# and a knurled thumb boss with a domed rivet. The engraving is the cipher
# face drawn by room_boards.mjs (.artifacts/rooms/cipher.png), cut into the
# brass and gone dark with old polish in it.
#
#   blender -b -P art/blender/decoder_icon.py -- [--samples 256] [--size 640]
#   node art/blender/decoder_icon_publish.mjs

import bpy, bmesh, math, os, sys
from mathutils import Vector

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
from kit import arg, fresh, link, lamp, cycles, render

PROJECT = os.path.abspath(os.path.join(ROOT, "..", ".."))
FACE = os.path.join(PROJECT, ".artifacts", "rooms", "cipher.png")
OUT = os.path.join(PROJECT, ".artifacts", "decoder-icon")
SIZE = int(arg("--size", "640"))
SAMPLES = int(arg("--samples", "256"))
os.makedirs(OUT, exist_ok=True)

# the face picture's half-width, in metres: its rim at 0.98 of it
FACE_HALF = 0.05
R_PLATE = 0.98 * FACE_HALF      # the base plate, outer alphabet
R_DISC = 0.74 * FACE_HALF       # the inner disc, inner alphabet
R_BOSS = 0.215 * FACE_HALF      # the thumb boss
T_PLATE = 0.0026
T_DISC = 0.0015
SHIFT = 3                       # letters the inner disc is turned


def engraved_brass(name, polish=(0.6, 0.4, 0.16), dirt=(0.05, 0.03, 0.014)):
    """brass with the cipher face cut into it: the cuts dark with a century of
    polish and grime, the open metal worn bright, tarnished in the hollows"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; Lk = nt.links.new
    b = N["Principled BSDF"]; b.inputs["Metallic"].default_value = 1.0
    tc = N.new("ShaderNodeTexCoord")
    mp = N.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (0.5 / FACE_HALF, 0.5 / FACE_HALF, 1)
    mp.inputs["Location"].default_value = (0.5, 0.5, 0)
    Lk(tc.outputs["Object"], mp.inputs["Vector"])
    im = N.new("ShaderNodeTexImage"); im.image = bpy.data.images.load(FACE, check_existing=True)
    im.image.colorspace_settings.name = "Non-Color"; im.extension = "EXTEND"; im.interpolation = "Cubic"
    Lk(mp.outputs["Vector"], im.inputs["Vector"])
    # the cut: where the face is drawn dark
    cut = N.new("ShaderNodeMapRange"); cut.inputs["From Min"].default_value = 0.42; cut.inputs["From Max"].default_value = 0.2
    Lk(im.outputs["Color"], cut.inputs["Value"])
    # tarnish: in the hollows, and in patches over the open metal
    ao = N.new("ShaderNodeAmbientOcclusion"); ao.inputs["Distance"].default_value = 0.004; ao.only_local = False; ao.samples = 16
    hollow = N.new("ShaderNodeMapRange"); hollow.inputs["From Min"].default_value = 0.6; hollow.inputs["From Max"].default_value = 1.0
    hollow.inputs["To Min"].default_value = 0.85; hollow.inputs["To Max"].default_value = 0.0
    Lk(ao.outputs["AO"], hollow.inputs["Value"])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 60; nz.inputs["Detail"].default_value = 8; nz.inputs["Roughness"].default_value = 0.62
    Lk(tc.outputs["Object"], nz.inputs["Vector"])
    patch = N.new("ShaderNodeMapRange"); patch.inputs["From Min"].default_value = 0.44; patch.inputs["From Max"].default_value = 0.7
    patch.inputs["To Max"].default_value = 0.6
    Lk(nz.outputs["Fac"], patch.inputs["Value"])
    tarnish = N.new("ShaderNodeMath"); tarnish.operation = "MAXIMUM"
    Lk(hollow.outputs["Result"], tarnish.inputs[0]); Lk(patch.outputs["Result"], tarnish.inputs[1])
    worn = N.new("ShaderNodeMix"); worn.data_type = "RGBA"
    worn.inputs[6].default_value = (*polish, 1); worn.inputs[7].default_value = (0.2, 0.12, 0.05, 1)
    Lk(tarnish.outputs["Value"], worn.inputs["Factor"])
    col = N.new("ShaderNodeMix"); col.data_type = "RGBA"; col.inputs[7].default_value = (*dirt, 1)
    Lk(cut.outputs["Result"], col.inputs["Factor"]); Lk(worn.outputs[2], col.inputs[6])
    Lk(col.outputs[2], b.inputs["Base Color"])
    # rough in the cuts and the tarnish, satin where it is handled; never a mirror
    rr = N.new("ShaderNodeMath"); rr.operation = "MAXIMUM"
    Lk(cut.outputs["Result"], rr.inputs[0]); Lk(tarnish.outputs["Value"], rr.inputs[1])
    rough = N.new("ShaderNodeMapRange"); rough.inputs["To Min"].default_value = 0.3; rough.inputs["To Max"].default_value = 0.78
    Lk(rr.outputs["Value"], rough.inputs["Value"]); Lk(rough.outputs["Result"], b.inputs["Roughness"])
    # the cut sunk in, and fine scratches over the polish
    bc = N.new("ShaderNodeBump"); bc.inputs["Strength"].default_value = 0.55; bc.inputs["Distance"].default_value = 0.00025; bc.invert = True
    Lk(cut.outputs["Result"], bc.inputs["Height"])
    sc = N.new("ShaderNodeTexNoise"); sc.inputs["Scale"].default_value = 900; sc.inputs["Detail"].default_value = 3
    scm = N.new("ShaderNodeMapping"); scm.inputs["Scale"].default_value = (1, 18, 1); scm.inputs["Rotation"].default_value = (0, 0, 0.5)
    Lk(tc.outputs["Object"], scm.inputs["Vector"]); Lk(scm.outputs["Vector"], sc.inputs["Vector"])
    bs = N.new("ShaderNodeBump"); bs.inputs["Strength"].default_value = 0.05; bs.inputs["Distance"].default_value = 0.0001
    Lk(sc.outputs["Fac"], bs.inputs["Height"]); Lk(bs.outputs["Normal"], bc.inputs["Normal"])
    Lk(bc.outputs["Normal"], b.inputs["Normal"])
    return m


def turned(name, profile, mat, segments=720, teeth=0, depth=0.0):
    """a turned piece: `profile` [(radius, height, reeded)] from the top's
    centre out and round to the bottom's; the reeded rings fluted with
    `teeth` flutes `depth` deep"""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    rings = []
    for r, z, reeded in profile:
        if r == 0:
            rings.append(bm.verts.new((0, 0, z))); continue
        ring = []
        for i in range(segments):
            a = math.tau * i / segments
            rr = r - (depth * (0.5 + 0.5 * math.cos(teeth * a)) if reeded and teeth else 0.0)
            ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), z)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        if isinstance(a, list) and isinstance(b, list):
            for i in range(segments):
                j = (i + 1) % segments
                bm.faces.new((a[i], a[j], b[j], b[i]))
        else:
            ring, hub = (b, a) if isinstance(b, list) else (a, b)
            for i in range(segments):
                bm.faces.new((hub, ring[i], ring[(i + 1) % segments]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = abs(p.normal.z) < 0.95
    return o


scene = fresh()
brass = engraved_brass("engraved brass")

# the base plate: flat, bevelled, its edge reeded
e = 0.0004
turned("plate", [
    (0, T_PLATE, False), (R_PLATE - 0.0011, T_PLATE, False), (R_PLATE - 0.0003, T_PLATE - 0.00025, False),
    (R_PLATE, T_PLATE - 0.0007, True), (R_PLATE, 0.0006, True),
    (R_PLATE - 0.0004, 0.0001, False), (R_PLATE - 0.0012, 0.0, False), (0, 0.0, False),
], brass, teeth=180, depth=0.00035)

# the inner disc, turned three letters round, its edge milled for the thumb
z0, z1 = T_PLATE, T_PLATE + T_DISC
disc = turned("disc", [
    (0, z1, False), (R_DISC - 0.0008, z1, False), (R_DISC - 0.0002, z1 - 0.0002, False),
    (R_DISC, z1 - 0.0005, True), (R_DISC, z0 + 0.0002, True), (R_DISC - 0.0003, z0, False), (0, z0, False),
], brass, teeth=120, depth=0.0003)
disc.rotation_euler.z = -SHIFT * math.tau / 26

# the thumb boss on its axle, knurled, a domed rivet through it
z2 = z1 + 0.0034
turned("boss", [
    (0, z2 + 0.0012, False), (0.0018, z2 + 0.0011, False), (0.0032, z2 + 0.0007, False), (0.0039, z2 + 0.0002, False),
    (0.0042, z2, False), (R_BOSS - 0.0007, z2, False), (R_BOSS - 0.0002, z2 - 0.0003, False),
    (R_BOSS, z2 - 0.0008, True), (R_BOSS, z1 + 0.0007, True), (R_BOSS - 0.0004, z1 + 0.0002, False),
    (R_BOSS - 0.0016, z1, False), (0, z1, False),
], brass, segments=480, teeth=44, depth=0.00045)

# the table it lies on: only its shadow is kept
bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0, 0, 0))
floor = bpy.context.active_object; floor.is_shadow_catcher = True

# the room's light: a broad warm lamp from the upper left, the room's own
# bounce soft from the right, and above it all a big warm softbox, warm at
# its far edge and going dark, for the polish to mirror
world = bpy.data.worlds.new("room"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.05, 0.035, 0.022, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
lamp("lamp", "AREA", (-0.42, 0.34, 0.5), aim=(0, 0, 0), energy=float(arg("--key", "16")), colour=(1.0, 0.8, 0.56), size=0.45)
lamp("bounce", "AREA", (0.5, -0.1, 0.25), aim=(0, 0, 0), energy=float(arg("--bounce", "4")), colour=(1.0, 0.9, 0.78), size=0.6)
sky = bpy.data.meshes.new("softbox"); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.6, calc_uvs=True); bm.to_mesh(sky); bm.free()
box = link(bpy.data.objects.new("softbox", sky)); box.location = (0, 0.15, 0.7); box.rotation_euler = (math.pi + 0.2, 0, 0)
sm = bpy.data.materials.new("softbox"); sm.use_nodes = True; SN = sm.node_tree.nodes; SL = sm.node_tree.links.new
SN.remove(SN["Principled BSDF"]); em = SN.new("ShaderNodeEmission")
stc = SN.new("ShaderNodeTexCoord"); grad = SN.new("ShaderNodeTexGradient"); gmap = SN.new("ShaderNodeMapping")
gmap.inputs["Rotation"].default_value = (0, 0, math.radians(-35)); gmap.inputs["Location"].default_value = (0.1, 0.5, 0)
SL(stc.outputs["Generated"], gmap.inputs["Vector"]); SL(gmap.outputs["Vector"], grad.inputs["Vector"])
ramp = SN.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (1.0, 0.84, 0.62, 1); ramp.color_ramp.elements[1].color = (0.05, 0.04, 0.03, 1)
ramp.color_ramp.elements[0].position = 0.15; ramp.color_ramp.elements[1].position = 0.9
SL(grad.outputs["Fac"], ramp.inputs["Fac"]); SL(ramp.outputs["Color"], em.inputs["Color"])
em.inputs["Strength"].default_value = float(arg("--softbox", "1.6"))
SL(em.outputs["Emission"], SN["Material Output"].inputs["Surface"])
box.data.materials.append(sm); box.visible_camera = False; box.visible_shadow = False

# the eye: above and in front, looking down at a slant, the wheel turned a little
tilt = math.radians(float(arg("--tilt", "52")))
dist = float(arg("--dist", "0.27"))
cd = bpy.data.cameras.new("eye"); cd.lens = 85; cd.sensor_width = 36
cam = link(bpy.data.objects.new("eye", cd))
cam.location = (0.0, -dist * math.cos(tilt), dist * math.sin(tilt) + 0.002)
cam.rotation_euler = (math.pi / 2 - tilt, 0, 0)
scene.camera = cam
for o in (bpy.data.objects["plate"], disc, bpy.data.objects["boss"]):
    o.rotation_euler.z += math.radians(float(arg("--turn", "-14")))

cycles(scene, SAMPLES, SIZE, SIZE, exposure=float(arg("--exposure", "-0.4")), glare=False, transparent=True)
scene.cycles.adaptive_threshold = 0.006
render(scene, os.path.join(OUT, "decoder.png"))
