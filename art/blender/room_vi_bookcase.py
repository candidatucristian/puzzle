"""Room VI with a bookcase where the cot stood (2026-11-05).

The user swapped two puzzles between rooms: His Cot went to Room II, for the
demo, and Lamplight in the Library came here. So the finished nursery
(room_vi.blend, room_vi.py's) is opened, the cot and the mobile over it are
taken out, and a low mahogany bookcase is built against the back wall in
their place, under the family portrait: the boy's books, and on its middle
shelf five standing a little out of the rest with a paper slip in each
(room_furnish.bookcase, as Room II's end bookcase had them). The scene is
saved for room_vi_live.py (the room's live plates) and for
library_bookcase_puzzle.py --room 6 (the puzzle's close-up).

  blender -b --factory-startup -P art/blender/room_vi_bookcase.py -- [--preview 1]
"""
import bpy, os, sys, math, json, random
from pathlib import Path
from mathutils import Vector
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
bpy.ops.wm.open_mainfile(filepath=str(HERE / "room_vi.blend"))
from kit import arg, plain, lamp
import room_common as rc
import room_furnish as rf
from bpy_extras.object_utils import world_to_camera_view

OUT = Path(arg("--out", str(ROOT / ".artifacts/room-vi-books"))); OUT.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene

# ── the cot and its mobile, gone (to Room II) ──────────────────────────────
gone = [o for o in bpy.data.objects if o.name.startswith(("cot_", "VI cot |", "mobile_post", "VI mobile |"))]
for o in gone: bpy.data.objects.remove(o, do_unlink=True)
print("COT TAKEN OUT", len(gone), flush=True)

# ── a low bookcase in its place, in the room's own mahogany ───────────────
WOOD = bpy.data.materials.get("VI | figured mahogany joinery") or plain("nursery bookcase mahogany", (.16, .07, .04), rough=.5)
SPINES = rf.bound(rc.picture("spines", str(ROOT / ".artifacts/rooms/spines.png"), rough=.5, coat=.1, bump=.3))
COVERS = rf.cover_materials()
PAGES = plain("nursery book page edges", (.42, .37, .28), rough=.9)
GLASS = plain("nursery jar glass", (.95, .97, .96), rough=.03, transmission=1.0, ior=1.5)
RNG = random.Random(19610613)
X0, WIDTH_CM, WALL_D, TOP = -12, 142, 748, 145
LEVELS = (8, 42, 76, 110, TOP)
MARKED_ROW = 1                       # (row 0 the top shelf: this is the one at 76–110 cm)
MARKED = (5, 9, 14, 20, 25)
def build():
    rf.bookcase(RNG, 0, -1, 0, WIDTH_CM, TOP, WOOD, WOOD, SPINES, COVERS, PAGES, depth=30, levels=LEVELS, bays=2,
                glass=GLASS, marked=lambda r, n: r == MARKED_ROW and n in MARKED)
case = rc.assembled("nursery bookcase", build, at=(X0, 0, WALL_D), turn=-math.pi / 2)
bpy.context.view_layer.update()
slips = [o for o in case.children_recursive if o.name.split(".")[0] == "slip"]
print("BOOKCASE BUILT, marked", len(slips), flush=True)

# ── his toys, that lay on the cot's mattress: set out along the top of the
#    bookcase, each where it lay across, back from the edge ─────────────────
def bounds(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for o_ in [o] if o.type in ("MESH", "CURVE") for c in o.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])
def family(o):
    return [o, *o.children_recursive]
toys = {
    "hotel": [o for o in bpy.data.objects if o.name.startswith("VI toy hotel") and o.parent is None],
    "train": [o for o in bpy.data.objects if o.name.startswith("VI toy train") and o.parent is None],
    "bear": [o for o in bpy.data.objects if o.name.startswith("bear_") and o.parent is None],
    "blocks": [o for o in bpy.data.objects if o.name.split(".")[0] == "block" and o.parent is None],
    "duck": [o for o in bpy.data.objects if o.name.startswith("rubber_duck_toy") and o.parent is None],
}
top_z = TOP / 100 + .002
for name, roots in toys.items():
    if not roots: continue
    every = [m for r in roots for m in family(r)]
    lo, hi = bounds(every)
    if not (-.4 < (lo.x + hi.x) / 2 < 1.6 and 6.5 < (lo.y + hi.y) / 2 < 7.6): continue
    cx = min(max((lo.x + hi.x) / 2, x0_ := X0 / 100 + .12), (X0 + WIDTH_CM) / 100 - .12)
    shift = Vector((cx - (lo.x + hi.x) / 2, 7.33 - (lo.y + hi.y) / 2, top_z - lo.z))
    for r in roots: r.location += shift
    print("TOY ON TOP", name, tuple(round(v, 2) for v in shift), flush=True)
bpy.context.view_layer.update()

# ── where it is, for the game (room_vi.py's logical 1659 × 948 picture) ───
def project(p):
    v = world_to_camera_view(scene, scene.camera, Vector(p)); return [round(v.x * 1659, 3), round((1 - v.y) * 948, 3)]
face_y = (WALL_D - 30) / 100
x0, x1 = X0 / 100, (X0 + WIDTH_CM) / 100
quad = [project((x0, face_y, TOP / 100 + .08)), project((x1, face_y, TOP / 100 + .08)), project((x1, face_y, 0)), project((x0, face_y, 0))]
(OUT / "bookcase.json").write_text(json.dumps({"bookcase": quad, "camera": list(scene.camera.location)}, indent=1), encoding="utf-8")
print("BOOKCASE QUAD", quad, flush=True)

bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "room_vi_books.blend"), compress=True)
if arg("--preview", "") == "1":
    scene.render.resolution_x = 1600; scene.render.resolution_y = round(1600 * 948 / 1659)
    scene.cycles.samples = 96
    scene.render.filepath = str(OUT / "preview.png"); bpy.ops.render.render(write_still=True)
print("ROOM_VI_BOOKCASE_DONE", flush=True)
