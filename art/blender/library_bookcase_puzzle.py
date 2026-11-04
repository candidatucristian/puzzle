"""Lamplight in the Library, seen in Room II itself (2026-11-04).

The user found the puzzle did not keep to the room: its picture had a window
in a wall that has none. So the puzzle is now the room. Room II is built
exactly as room_library_polished.py builds it (room_library_restored.py's
matte worn room, its green lamp, its moon), and the eye comes up to the end
bookcase, to the shelf at the eye where five books already stand a little out
of the rest with a paper slip in each (room_library.py, MARKED_ROW). Those
five get their titles in gilt on the spine and their numbers on the slips,
from bookshelf/puzzle.js (library_lamplight_publish.mjs --prepare writes
books.json); nothing else in the room is moved or added.

  blender -b --factory-startup -P art/blender/library_bookcase_puzzle.py -- [--only inspect|preview|plate,books] [--width 3200] [--samples 384]
  node art/blender/library_lamplight_publish.mjs --source .artifacts/library-bookcase-v4 --version 4
"""
import bpy, os, sys, math, json, runpy
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *
import room_common as rc

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = arg('--out', os.path.join(rc.ROOT, '.artifacts/library-bookcase-v4'))
WIDTH = int(arg('--width', '3200')); SAMPLES = int(arg('--samples', '384'))
ONLY = set(arg('--only', 'plate,books').split(','))
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, 'books.json'), encoding='utf-8') as f:
    BOOKS = json.load(f)

# ── Room II, built as the room's own picture is, nothing rendered ──────────
mine = list(ARGS)
ARGS[:] = ['--only', 'none', '--out', os.path.join(OUT, 'room'), '--width', str(WIDTH), '--samples', str(SAMPLES)]
try:
    polished = runpy.run_path(os.path.join(HERE, 'room_library_polished.py'), run_name='__main__')
finally:
    ARGS[:] = mine
scene = polished['scene']
bpy.context.view_layer.update()

def centre(o):
    return sum((o.matrix_world @ Vector(c) for c in o.bound_box), Vector()) / 8
def size_along(o, axis):
    """the object's extent along a world axis"""
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return max(p[axis] for p in pts) - min(p[axis] for p in pts)

# ── the five books that stand out on the end bookcase, and their slips ─────
case = bpy.data.objects['end bookcase']
slips = [o for o in case.children_recursive if o.name.split('.')[0] == 'slip']
books = [o for o in case.children_recursive if o.name.split('.')[0] == 'book']
marked = []
for s in slips:
    c = centre(s)
    b = min(books, key=lambda o: (Vector((centre(o).x, 0, 0)) - Vector((c.x, 0, 0))).length + abs(centre(o).z - c.z) * .2)
    marked.append((b, s))
marked.sort(key=lambda bs: centre(bs[0]).x)

if 'inspect' in ONLY:
    print('CAMERA', tuple(round(v, 3) for v in scene.camera.location), scene.camera.data.lens)
    for b, s in marked:
        print('MARKED', b.name, 'centre', tuple(round(v, 3) for v in centre(b)), 'w', round(size_along(b, 0), 4), 'h', round(size_along(b, 2), 4),
              'deep', round(size_along(b, 1), 4), '| slip', tuple(round(v, 3) for v in centre(s)))
    for name in ('green lamp', 'ladder', 'end bookcase'):
        o = bpy.data.objects.get(name)
        if o: print('AT', name, tuple(round(v, 3) for v in o.matrix_world.translation))
    for o in scene.objects:
        if o.type == 'LIGHT': print('LIGHT', o.name, o.data.type, round(o.data.energy, 2), tuple(round(v, 2) for v in o.location))
    tops = [o for o in scene.objects if o.parent is None and o.type in ('MESH', 'EMPTY')]
    for o in tops:
        c = o.matrix_world.translation
        if 4.6 < c.y < 9.0 and -2.6 < c.x < 2.6: print('NEAR', o.name, tuple(round(v, 2) for v in c))
    sys.exit(0)

# ── the eye, come up to the shelf: standing, a step and a half away ───────
fronts = [centre(b).y - size_along(b, 1) / 2 for b, _ in marked]
FRONT = min(fronts)
CX = sum(centre(b).x for b, _ in marked) / len(marked)
CZ = sum(centre(b).z for b, _ in marked) / len(marked)
AIM_X = CX + float(arg('--cx', '0.05'))
cam = scene.camera
cam.data.lens = float(arg('--lens', '32')); cam.data.shift_x = 0; cam.data.shift_y = 0
cam.location = Vector((AIM_X, FRONT - float(arg('--back', '1.4')), CZ + float(arg('--up', '0.08'))))
look = Vector((AIM_X, FRONT, CZ + float(arg('--look', '0.0'))))
cam.rotation_euler = (look - cam.location).to_track_quat('-Z', 'Y').to_euler()
bpy.context.view_layer.update()

# ── the five, made readable: a narrow one widened a little (from in the
#    room no one could tell); its title in gilt down its spine; its number
#    on a slip of paper standing up out of its pages ─────────────────────────
GILT = aged_metal('library | gilt spine lettering', (.66, .5, .22), (.12, .08, .03), rough=(.2, .4), scale=40, tarnish=.25)
INK = plain('library | bookmark ink', (.02, .018, .016), rough=.7)
CARD = paper('library | bookmark card', (.70, .64, .50), .25)
FONT = bpy.data.fonts.load('C:/Windows/Fonts/georgiab.ttf')
MIN_W = float(arg('--min-width', '0.034'))

def place(o, at, x_axis, normal, parent):
    """stand o at `at`, its x along x_axis and its face along normal; then
    give it to `parent`, where it is"""
    z = normal.normalized(); x = x_axis.normalized(); y = z.cross(x)
    o.matrix_world = Matrix.Translation(at) @ Matrix((x, y, z)).transposed().to_4x4()
    bpy.context.view_layer.update()
    keep = o.matrix_world.copy(); o.parent = parent; o.matrix_world = keep

def text_on(name, body, size, mat, at, x_axis, normal, parent, extrude=.00035):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = body; cu.font = FONT; cu.size = size
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.extrude = extrude
    o = link(bpy.data.objects.new(name, cu)); o.data.materials.append(mat)
    place(o, at, x_axis, normal, parent)
    return o

specials = []
for i, (b, s) in enumerate(marked):
    info = BOOKS[i]
    s.hide_render = True                      # (its own slip stood edge-on to the eye)
    rot = b.matrix_world.to_3x3()
    spine = (rot @ Vector((1, 0, 0))).normalized()          # (the spine faces the room)
    if spine.y > 0: spine = -spine
    w = size_along(b, 0)
    if w < MIN_W:
        k = MIN_W / w
        for v in b.data.vertices: v.co.y *= k
        b.data.update(); bpy.context.view_layer.update(); w = MIN_W
    c = centre(b); h = size_along(b, 2); deep = size_along(b, 1)
    face = c + spine * (deep / 2 + .0006)
    n = len(info['title'])
    size = min(w * .6, h * .8 / (n * .74))
    title = text_on(f"{info['title']} title", info['title'], size, GILT, face, Vector((0, 0, -1)), spine, b)
    # the slip: a card put in among the pages near the spine, its top standing
    # out above the book, turned to face the room
    cw, ch = min(w * .86, .03), .052
    top = c.z + h / 2
    at = Vector((c.x, (c + spine * (deep / 2 - .018)).y, top + ch * .05))
    me = bpy.data.meshes.new('bookmark')
    me.from_pydata([(-cw / 2, -ch / 2, 0), (cw / 2, -ch / 2, 0), (cw / 2, ch / 2, 0), (-cw / 2, ch / 2, 0)], [], [(0, 1, 2, 3)])
    me.uv_layers.new()
    card = link(bpy.data.objects.new(f"{info['title']} bookmark", me)); card.data.materials.append(CARD)
    sol = card.modifiers.new('paper', 'SOLIDIFY'); sol.thickness = .0004
    place(card, at, Vector((1, 0, 0)), spine, b)
    num_at = at + Vector((0, 0, ch * .18)) + spine * .0007
    number = text_on(f"{info['title']} bookmark number", str(info['mark']), ch * .42, INK, num_at, Vector((1, 0, 0)), spine, b, extrude=0)
    specials.append(dict(info=info, book=b, title=title, card=card, number=number, w=w, h=h, deep=deep, face=face, top=at.z + ch / 2))

# a low light from beside the eye that reaches only the lettering and the
# slips: gilt and paper caught as they would be by a lamp behind one
caught = bpy.data.collections.new('the clues, caught')
for sp in specials:
    for key in ('title', 'card', 'number'): caught.objects.link(sp[key])
glint = lamp('on the titles', 'AREA', tuple(cam.location + Vector((.35, .1, .45))), aim=tuple(Vector((CX, FRONT, CZ))),
             energy=float(arg('--glint', '6')), colour=(1.0, .82, .6), size=.5)
glint.visible_camera = False
glint.light_linking.receiver_collection = caught
bpy.context.view_layer.update()

# ── what the game is told: each book, where it is and what it shows ───────
POSES = 9; PULL = float(arg('--pull', '0.12'))
def proj(v):
    return list(rc.project(v))
layout = {'version': 4, 'width': rc.RW, 'height': rc.RH, 'poses': POSES, 'books': [], 'lamp': None, 'cup': None}
every = []
for i, sp in enumerate(specials):
    w, face, top = sp['w'], sp['face'], sp['top']
    bottom = face.z - sp['h'] / 2
    corners = ((face.x - w / 2, bottom), (face.x + w / 2, bottom), (face.x + w / 2, top), (face.x - w / 2, top))
    quad = [proj(Vector((x_, face.y, z))) for x_, z in corners]
    pts = [Vector((x_, face.y - dy, z)) for x_ in (face.x - w / 2 - .01, face.x + w / 2 + .01) for z in (bottom, top) for dy in (0, PULL)]
    crop = rc.box_of(pts, pad=16)
    title_box = [proj(p) for p in rc.object_corners(sp['title'])]
    number_box = [proj(p) for p in rc.object_corners(sp['number'])]
    across_px = max(p[0] for p in title_box) - min(p[0] for p in title_box)
    number_px = max(p[1] for p in number_box) - min(p[1] for p in number_box)
    layout['books'].append({'index': i, **sp['info'], 'quad': quad, 'crop': crop, 'minTextPixels': round(min(across_px, number_px), 2)})
    every += quad
xs = [p[0] for p in every]; ys = [p[1] for p in every]
layout['safe'] = [round(min(xs) - 60), round(min(ys) - 50), round(max(xs) - min(xs) + 120), round(max(ys) - min(ys) + 100)]
# (dust turning in the light over the shelf)
layout['lamp'] = [round((min(xs) + max(xs)) / 2, 2), round(min(ys) - 40, 2)]
with open(os.path.join(OUT, 'library.json'), 'w', encoding='utf-8') as f: json.dump(layout, f, indent=2)
print('LAYOUT', json.dumps({k: v for k, v in layout.items() if k != 'books'}), [(bk['title'], bk['minTextPixels']) for bk in layout['books']], flush=True)

if 'preview' in ONLY:
    render(scene, os.path.join(OUT, arg('--name', 'preview') + '.png'))
if 'plate' in ONLY:
    render(scene, os.path.join(OUT, 'plate.png'))
if 'books' in ONLY:
    for bk, sp in zip(layout['books'], specials):
        b = sp['book']; home = b.matrix_world.copy()
        frames = {}
        for pose in range(POSES):
            def set_pose(pose=pose, b=b, home=home):
                b.matrix_world = Matrix.Translation((0, -PULL * pose / (POSES - 1), 0)) @ home
            frames[f"book-{bk['index']}-{pose}"] = set_pose
        rc.crop_frames(scene, OUT, bk['crop'], frames.items())
        b.matrix_world = home
print('LIBRARY_BOOKCASE_DONE', flush=True)
