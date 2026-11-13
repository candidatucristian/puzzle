"""Hall onboarding door. Real geometry and Cycles; no generated imagery.
Render: blender -b --factory-startup -P art/blender/hall_guide.py -- --frames 24
Publish: node art/blender/hall_guide_publish.mjs
"""
import bpy, math, os, sys, json
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import fresh, link, box, bevel, pbr, plain, aged_metal, sphere, lamp, cycles, render, arg, to_picture

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
OUT = os.path.join(ROOT, ".artifacts/hall-guide")
os.makedirs(OUT, exist_ok=True)
COUNT = int(arg("--frames", "24"))
ONLY = arg("--only", "")
scene = fresh()
wood = pbr("Old walnut, open grain", "rosewood_veneer1", size=0.72,
           tint=(0.68, 0.51, 0.38), bright=0.65, rough=(0.52, 0.78),
           bump=0.22, spec=0.26, grime=0.12)
floor = pbr("Worn oak floor", "dark_wood", size=1.3, bright=0.52,
            rough=(0.62, 0.84), bump=0.2, spec=0.24)
brass = aged_metal("Tarnished brass", (0.48, 0.31, 0.12), (0.09, 0.065, 0.032),
                   rough=(0.4, 0.68), tarnish=0.7)
ink = plain("Blackened engraving", (0.018, 0.014, 0.01), rough=0.88)
green = plain("Faded botanic green plaster", (0.052, 0.078, 0.057), rough=0.92)
n = green.node_tree.nodes; lk = green.node_tree.links.new
noise = n.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 85
noise.inputs["Detail"].default_value = 3
bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.18
bump.inputs["Distance"].default_value = 0.003
lk(noise.outputs["Fac"], bump.inputs["Height"])
lk(bump.outputs["Normal"], n["Principled BSDF"].inputs["Normal"])
dark = plain("Unlit room", (0.012, 0.018, 0.015), rough=0.96)

# A complete frame, reveal and floor; the doorway is an actual opening.
box("Left wall", -2, -0.59, 0.07, 0.3, 0, 3.2, green)
box("Right wall", 0.59, 2, 0.07, 0.3, 0, 3.2, green)
box("Lintel wall", -0.59, 0.59, 0.07, 0.3, 2.4, 3.2, green)
box("Floor", -2, 2, -2.8, 2.7, -0.08, 0, floor)
box("Room back wall", -2, 2, 2.2, 2.35, 0, 3.2, dark)
box("Room left wall", -1.8, -1.68, 0.2, 2.2, 0, 3.2, dark)
box("Room skirting", -1.65, 1.65, 2.13, 2.19, 0, 0.16, wood)
for x0, x1 in [(-0.72, -0.55), (0.55, 0.72)]:
    bevel(box("Architrave", x0, x1, -0.055, 0.11, 0, 2.52, wood), 0.009, 3)
    bevel(box("Inner bead", x0+0.025, x1-0.025, -0.077, -0.055, 0.025, 2.49, wood), 0.005, 3)
bevel(box("Frame head", -0.73, 0.73, -0.06, 0.11, 2.36, 2.54, wood), 0.008, 3)
bevel(box("Top moulding", -0.76, 0.76, -0.082, 0.13, 2.51, 2.57, wood), 0.006, 3)
bevel(box("Threshold", -0.6, 0.6, -0.12, 0.33, 0, 0.022, wood), 0.005, 2)
for a,b in [(-2,-0.72), (0.72,2)]:
    bevel(box("Skirting", a,b,-0.02,0.07,0,0.17,wood),0.006,2)

pivot = link(bpy.data.objects.new("Door hinge", None))
pivot.location = (-0.54, 0.09, 0.025)
bpy.context.view_layer.update()
before = set(bpy.data.objects)
bevel(box("Solid walnut door", -0.54,0.54,0.025,0.095,0.026,2.35,wood),0.004,3)
for z0,z1 in [(0.12,0.68),(0.79,1.4),(1.51,2.22)]:
    for x0,x1 in [(-0.44,-0.045),(0.045,0.44)]:
        bevel(box("Raised panel",x0,x1,-0.005,0.026,z0,z1,wood),0.024,3)
        for a,b,c,d in [(x0-0.015,x1+0.015,z0-0.015,z0),
                         (x0-0.015,x1+0.015,z1,z1+0.015),
                         (x0-0.015,x0,z0,z1),(x1,x1+0.015,z0,z1)]:
            bevel(box("Panel bead",a,b,-0.019,-0.002,c,d,wood),0.004,3)
# Escutcheon and turned lever; brass stays worn, without clearcoat.
bevel(box("Handle plate",0.365,0.438,-0.04,0.023,0.94,1.24,brass),0.021,4)
sphere("Handle neck",(0.402,-0.06,1.15),0.037,brass,squash=(0.7,1.4,0.7))
bevel(box("Lever",0.263,0.408,-0.106,-0.067,1.128,1.164,brass),0.016,4)
sphere("Lever end",(0.268,-0.087,1.146),0.024,brass)
sphere("Keyhole head",(0.402,-0.043,1.027),0.009,ink,squash=(1,0.3,1))
box("Keyhole stem",0.399,0.405,-0.047,-0.04,1.001,1.026,ink)
for z in [0.968,1.214]:
    sphere("Slotted screw",(0.401,-0.045,z),0.006,brass,squash=(1,0.3,1))
    box("Screw slot",0.396,0.406,-0.048,-0.046,z-0.0008,z+0.0008,ink)
bevel(box("Room plate",-0.105,0.105,-0.029,0.023,1.74,1.84,brass),0.016,4)
box("Roman I",-0.004,0.004,-0.031,-0.028,1.762,1.816,ink)
for z in [1.762,1.813]:
    box("Roman I serif",-0.016,0.016,-0.031,-0.028,z,z+0.004,ink)
for obj in set(bpy.data.objects)-before:
    obj.parent = pivot
    obj.matrix_parent_inverse = pivot.matrix_world.inverted()

# Unmoving warm lamp and a small cool fill, with a restrained room spill.
world = bpy.data.worlds.new("Night")
scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.16,0.2,0.27,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.1
lamp("Hall lamp","AREA",(-1.8,-2.2,3.2),aim=(0,0,1.2),energy=170,colour=(1,0.74,0.47),size=1.25)
lamp("Cool window fill","AREA",(2,-1.1,2.8),aim=(0,0,1.1),energy=55,colour=(0.48,0.63,1),size=1.8)
lamp("Room lamp","AREA",(0.8,1.8,2.35),aim=(0,0,0.1),energy=75,colour=(1,0.69,0.36),size=1.2)

cd = bpy.data.cameras.new("Tutorial camera"); cd.type="ORTHO"; cd.ortho_scale=3.38
cam = link(bpy.data.objects.new("Tutorial camera",cd))
cam.location=(1.35,-6,2.45)
cam.rotation_euler=(Vector((0,0.12,1.25))-cam.location).to_track_quat("-Z","Y").to_euler()
scene.camera=cam
cycles(scene,int(arg("--samples","48")),480,560,exposure=0.05,glare=False)
scene.cycles.use_animated_seed=False
scene.render.use_persistent_data=True
scene.cycles.max_bounces=6
scene.render.image_settings.compression=30
positions = {}
for index in range(COUNT):
    pivot.rotation_euler.z=math.radians(78)*index/(COUNT-1)
    bpy.context.view_layer.update()
    if index in (0,COUNT-1):
        point = pivot.matrix_world @ Vector((0.942,-0.177,1.121))
        positions[str(index)] = to_picture(scene,cam,point,(480,560))
    if ONLY and index not in [int(value) for value in ONLY.split(",")]: continue
    target=os.path.join(OUT,f"door-{index:02d}.png")
    if not os.path.exists(target) or "--replace" in sys.argv:
        render(scene,target)
with open(os.path.join(OUT,"door.json"),"w") as file:
    json.dump({"width":480,"height":560,"frames":COUNT,"columns":6,"handle":positions,
               "entry":to_picture(scene,cam,(0,0.45,1.17),(480,560)),
               "source":"art/blender/hall_guide.py","renderer":"Blender Cycles"},file,indent=2)
print("HALL GUIDE READY",COUNT)

