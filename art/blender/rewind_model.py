# The four things on Orion's windowsill (Rewind, Room XI), as both the
# level's close-up (rewind_sill.py) and the room (room_physics.py) build
# them: four of his ways of keeping time, left to right —
#
#   a brass drum clock on a walnut plinth, its hands apart (the game turns them);
#   a tear-off calendar on a little walnut easel, a day a page;
#   a sand-glass between walnut plates, a brass scale of minutes beside it;
#   a candle-clock in a brass dish, the hours painted up it.
#
# Each can be set as it is at any moment (`Sill.clock(h, m)`, `.page(day)`,
# `.sand(...)`, `.candle(ring)`); the puzzle says where they lie now and where
# they stop (src/levels/rewind/puzzle.json; rewind_boards.mjs draws the dial,
# the pages and the candle's hours). In the room's cm: x across, y up, d away.

import bpy, bmesh, math, os, json
from mathutils import Vector, Matrix
from kit import *
from room_common import *

with open(os.path.join(ROOT, "src/levels/rewind/puzzle.json")) as f: REWIND = json.load(f)
DRAWN = os.path.join(ROOT, ".artifacts/rooms")
SPOTS = {"clock": -27, "calendar": -9, "glass": 9, "candle": 27}   # across the sill from its middle
SILL_AT = (30, 82, 604)                        # the middle of Room XI's sill (room_physics.py WIN), on its top
EYE = (30, 95, 500)                            # where the close-up looks from: level, a little over the sill
def turns_toward(eye=EYE, at=SILL_AT):
    """each thing turned to face the eye (the clock's dial square to it)"""
    return {k: math.atan2(eye[0] - (at[0] + x), at[2] - eye[2]) for k, x in SPOTS.items()}

# the clock
DIAL_Y, DIAL_R, DIAL_D = 10.4, 5.6, -2.45      # the dial's middle over the sill, its radius, its face
# the sand-glass: its glass from plate to plate, the neck halfway; the scale's minutes
GLASS_H = 22.4
BULB = [(2.4, 1.2), (3.3, 1.6), (3.85, 2.6), (4.0, 4.0), (3.85, 5.6), (3.2, 7.2), (2.1, 8.7), (1.0, 9.9), (0.45, 10.8), (0.33, 11.2)]
PROFILE = BULB + [(r, GLASS_H - y) for r, y in reversed(BULB[:-1])]
NECK = 11.2
MINUTE0, MINUTE = 11.7, 0.6                    # the scale: minute m stands at MINUTE0 + m · MINUTE
def minute_y(m): return MINUTE0 + m * MINUTE
SAND_START, SAND_END = (9.4, 1.4), (2.8, 0.8)  # the low pile, before and after: its level and its heap
# the candle: its foot in the dish's socket; ring h an hour up it
CANDLE_FOOT, CANDLE_R = 2.0, 2.0
def ring_y(h): return CANDLE_FOOT + 1 + h

def glass_r(y):
    """the sand-glass's outside, at a height"""
    for (r0, y0), (r1, y1) in zip(PROFILE, PROFILE[1:]):
        if y0 <= y <= y1: return r0 + (r1 - r0) * (y - y0) / max(1e-6, y1 - y0)
    return PROFILE[0][0] if y < PROFILE[0][1] else PROFILE[-1][0]

def disc(name, centre, r, mat, n=64):
    """a flat round face looking toward -d, its picture by its UVs"""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    c0 = bm.verts.new(centre)
    ring = [bm.verts.new(centre + Vector((math.cos(2 * math.pi * k / n) * M(r), 0, math.sin(2 * math.pi * k / n) * M(r)))) for k in range(n)]
    for k in range(n):
        f = bm.faces.new((c0, ring[(k + 1) % n], ring[k]))
        for lp in f.loops:
            q = lp.vert.co - centre
            lp[uv].uv = (0.5 + q.x / M(2 * r), 0.5 + q.z / M(2 * r))
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    return o

def flat(name, outline, d, thick, mat):
    """a flat piece in the clock's face (outline: (x, y) cm about the dial's middle, pointing up)"""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    vs = [bm.verts.new((M(x), 0, M(y))) for x, y in outline]
    bm.faces.new(vs); bm.normal_update(); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me)); o.data.materials.append(mat)
    s = o.modifiers.new("thick", "SOLIDIFY"); s.thickness = M(thick)
    return o

def sand_mesh(name, y0, y1, heap, mat_name=None):
    """sand in the glass from y0 up to y1 (cm over the plates' foot), a heap on top"""
    me = bpy.data.meshes.new(name)
    pts = [(0.0, y0)]
    steps = max(2, int((y1 - y0) / 0.25))
    for k in range(steps + 1):
        y = y0 + (y1 - y0) * k / steps
        pts.append((max(0.05, glass_r(y) - 0.16), y))
    if heap: pts += [(pts[-1][0] * 0.55, y1 + heap * 0.55), (0.0, y1 + heap)]
    else: pts.append((0.0, y1))
    bm = bmesh.new()
    vs = [bm.verts.new((M(r), 0, M(y))) for r, y in pts]
    for a, b in zip(vs, vs[1:]): bm.edges.new((a, b))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], axis=(0, 0, 1), cent=(0, 0, 0), steps=48, angle=math.tau)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0002)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    return me

def candle_mesh(name, top):
    """the candle from its foot to `top` (cm up it): its side mapped to the
    painted hours (the front, toward -d, the middle of the picture), a shallow
    hollow in its top where the wax has melted"""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    n, L = 64, REWIND["candle"]["length"]
    angle = lambda k: -math.pi / 2 + 2 * math.pi * (k / n - 0.5)       # (u 0.5 at the front, the seam behind)
    col = lambda k, y, r=CANDLE_R: bm.verts.new((M(r * math.cos(angle(k))), M(r * math.sin(angle(k))), M(y)))
    bottom = [col(k, 0) for k in range(n + 1)]; upper = [col(k, top) for k in range(n + 1)]
    for k in range(n):
        f = bm.faces.new((bottom[k], bottom[k + 1], upper[k + 1], upper[k]))
        for lp, (u, v) in zip(f.loops, ((k / n, 0), ((k + 1) / n, 0), ((k + 1) / n, top / L), (k / n, top / L))): lp[uv].uv = (u, v)
    rim = [col(k, top - 0.12, CANDLE_R * 0.82) for k in range(n)]
    centre = bm.verts.new((0, 0, M(top - 0.3)))
    for k in range(n):
        for f in (bm.faces.new((upper[k], upper[k + 1], rim[(k + 1) % n], rim[k])), bm.faces.new((rim[k], rim[(k + 1) % n], centre))):
            for lp in f.loops: lp[uv].uv = (0.97, 0.995)                 # (the plain wax above the hours)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.00005)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    return me

class Sill:
    """The four things, set out along a sill whose middle is `at` (room cm,
    on its top); `turns`: how each is turned toward the eye (radians)."""
    def __init__(self, at, turns=None):
        turns = turns or {}
        ax, ay, ad = at
        self.frames = {k: framed((ax + x, ay, ad), turns.get(k, 0.0)) for k, x in SPOTS.items()}
        self.turns = turns
        walnut = scan("sill walnut", "rosewood_veneer1", size=0.4, tint=(0.55, 0.36, 0.26), bright=0.4, sat=0.85, rough=(0.3, 0.5), bump=0.2, coat=0.2)
        brass = aged_metal("sill brass", (0.62, 0.45, 0.2), (0.09, 0.065, 0.03), rough=(0.18, 0.4), scale=50, tarnish=0.45)
        steel = plain("blued steel", (0.02, 0.025, 0.045), rough=0.3, metal=0.9)
        self.made = {}
        def made(kind, o):
            self.made.setdefault(kind, []).append(o); return o
        def at(kind, o):
            """an object built about the thing's own foot, stood where the thing stands"""
            bpy.context.view_layer.update()
            o.matrix_world = Matrix.Translation(self.frames[kind](0, 0, 0)) @ Matrix.Rotation(turns.get(kind, 0.0), 4, "Z") @ o.matrix_world
            return made(kind, o)

        # ── the clock ──────────────────────────────────────────────────────
        at("clock", box_cm("clock plinth", -7, 7, 0, 2.2, -4.2, 4.2, walnut, 0.5, keep=False))
        for e in (-1, 1): at("clock", box_cm("clock foot", e * 3.6 - 1, e * 3.6 + 1, 2.2, 4.6, -2, 2, brass, 0.3, keep=False))
        drum = cylinder("clock drum", 0, 0, M(-2.4), M(2.4), M(6.4), brass, verts=64)
        drum.rotation_euler = (math.pi / 2, 0, 0); drum.location = P(0, DIAL_Y, 0); bpy.context.view_layer.update(); at("clock", drum)
        bpy.ops.mesh.primitive_torus_add(major_radius=M(5.95), minor_radius=M(0.55), major_segments=64, minor_segments=16, location=tuple(P(0, DIAL_Y, DIAL_D - 0.1)), rotation=(math.pi / 2, 0, 0))
        bez = bpy.context.active_object; bez.name = "clock bezel"; bez.data.materials.append(brass); at("clock", bez)
        at("clock", disc("dial", P(0, DIAL_Y, DIAL_D), DIAL_R, picture("dial", os.path.join(DRAWN, "rewind-dial.png"), rough=0.35, coat=0.3)))
        at("clock", tube("clock handle", [(-0.017, 0.164), (-0.017, 0.179), (0.017, 0.179), (0.017, 0.164)], 0.0025, brass))
        # the hands: built pointing at twelve about the dial's middle
        hour = flat("hour hand", [(0, -0.9), (0.2, -0.6), (0.14, 0), (0.12, 1.9), (0.42, 2.45), (0, 3.4), (-0.42, 2.45), (-0.12, 1.9), (-0.14, 0), (-0.2, -0.6)], 0, 0.05, steel)
        minute = flat("minute hand", [(0, -1.25), (0.16, -0.95), (0.1, 0), (0.08, 4.1), (0, 4.9), (-0.08, 4.1), (-0.1, 0), (-0.16, -0.95)], 0, 0.05, steel)
        cap = cylinder("hand cap", 0, 0, M(-0.12), M(0.12), M(0.38), brass, verts=24); cap.rotation_euler = (math.pi / 2, 0, 0)
        self.hands = {"hour": hour, "minute": minute, "cap": cap}
        self._hand_d = {"hour": DIAL_D - 0.12, "minute": DIAL_D - 0.22, "cap": DIAL_D - 0.36}
        for o in (hour, minute, cap): made("clock", o)
        self.clock(*REWIND["clock"]["from"])

        # ── the calendar ───────────────────────────────────────────────────
        at("calendar", box_cm("calendar base", -6, 6, 0, 1.4, -3, 3, walnut, 0.4, keep=False))
        easel = bpy.data.objects.new("calendar easel", None); link(easel)
        easel.location = P(0, 1.4, 0.6); easel.rotation_euler = (-math.radians(12), 0, 0)
        bpy.context.view_layer.update(); at("calendar", easel)
        def on_easel(o):
            o.parent = easel; return made("calendar", o)
        on_easel(box_cm("calendar board", -5.6, 5.6, 0, 15.5, 0.0, 0.8, walnut, 0.4, keep=False))
        on_easel(box_cm("calendar pages", -4.8, 4.8, 1.0, 13.8, -1.1, 0.0, paper("calendar pages", (0.78, 0.74, 0.62), 0.1), 0.05, keep=False))
        self.pages = {day: picture(f"calendar page {day}", os.path.join(DRAWN, f"rewind-page-{day}.png"), rough=0.8) for day in range(REWIND["calendar"]["to"], REWIND["calendar"]["from"] + 1)}
        self.page_card = on_easel(card("calendar page", [P(-4.8, 1.0, -1.13), P(4.8, 1.0, -1.13), P(4.8, 13.8, -1.13), P(-4.8, 13.8, -1.13)], self.pages[REWIND["calendar"]["from"]]))
        on_easel(box_cm("calendar clip", -3.6, 3.6, 13.1, 13.9, -1.5, -1.1, brass, 0.2, keep=False))

        # ── the sand-glass ─────────────────────────────────────────────────
        for y0 in (0, GLASS_H - 1.2):
            at("glass", lathe("glass plate", [(0, 0), (0.048, 0), (0.05, 0.004), (0.05, 0.008), (0.048, 0.012), (0, 0.012)], walnut, at=tuple(P(0, y0, 0)), steps=48))
        for (px, pd) in ((-4.1, 0), (4.1, 0), (0, 4.1)):
            at("glass", lathe("glass post", [(0, 0), (0.0045, 0), (0.0035, 0.01), (0.0035, M(GLASS_H - 4.4)), (0.0045, M(GLASS_H - 2.4)), (0, M(GLASS_H - 2.4))], brass, at=tuple(P(px, 1.2, pd)), steps=16))
        glass_mat = bpy.data.materials.get("glass") or plain("glass", (0.95, 0.97, 0.96), rough=0.02, transmission=1.0, ior=1.5)
        g = at("glass", lathe("sand glass", [(r / 100, y / 100) for r, y in PROFILE], glass_mat, at=(0, 0, 0), steps=64))
        g.modifiers.new("thick", "SOLIDIFY").thickness = M(0.12)
        self.sand_mat = plain("sand", (0.4, 0.28, 0.16), rough=0.95)
        self.sand_low = at("glass", link(bpy.data.objects.new("sand low", sand_mesh("sand low", 1.25, SAND_START[0], SAND_START[1]))))
        self.sand_high = at("glass", link(bpy.data.objects.new("sand high", sand_mesh("sand high", NECK + 0.05, NECK + 0.1, 0))))
        for o in (self.sand_low, self.sand_high): o.data.materials.append(self.sand_mat)
        self.sand_high.hide_render = True
        # the scale of minutes, on the right-hand post
        at("glass", box_cm("glass scale", 4.35, 6.1, MINUTE0 - 0.5, minute_y(15) + 0.5, -0.75, -0.55, plain("ivory", (0.72, 0.66, 0.52), rough=0.5), 0.1, keep=False))   # (an ivory scale, the minutes in black)
        ink = plain("engraving", (0.015, 0.012, 0.01), rough=0.6)
        try: font = bpy.data.fonts.load("C:/Windows/Fonts/timesbd.ttf", check_existing=True)
        except Exception: font = None
        for m in range(16):
            at("glass", box_cm("scale tick", 4.4, 4.4 + (0.5 if m % 2 == 0 else 0.28), minute_y(m) - 0.035, minute_y(m) + 0.035, -0.78, -0.74, ink, keep=False))
            if m % 2 == 0 and m:
                t = bpy.data.curves.new(f"minute {m}", "FONT"); t.body = str(m); t.size = M(0.82); t.align_y = "CENTER"
                if font: t.font = font
                lab = link(bpy.data.objects.new(f"minute {m}", t)); lab.data.materials.append(ink)
                lab.location = P(4.98, minute_y(m), -0.77); lab.rotation_euler = (math.pi / 2, 0, 0)
                bpy.context.view_layer.update(); at("glass", lab)
        self.sand("start")

        # ── the candle-clock ───────────────────────────────────────────────
        at("candle", lathe("candle dish", [(0, 0), (0.042, 0), (0.044, 0.003), (0.043, 0.008), (0.04, 0.009), (0.023, 0.007), (0.023, 0.024), (0.025, 0.026), (0.02, 0.026), (0, 0.02)], brass, at=(0, 0, 0), steps=48))
        at("candle", tube("candle loop", [(0.04, 0.006), (0.058, 0.01), (0.058, 0.026), (0.042, 0.008)], 0.0025, brass, at=(0, 0, 0), rot=0.0))
        wax = picture("candle wax", os.path.join(DRAWN, "rewind-candle.png"), rough=0.45)
        wb = wax.node_tree.nodes["Principled BSDF"]; wb.inputs["Subsurface Weight"].default_value = 0.35
        wb.inputs["Subsurface Radius"].default_value = (1.0, 0.55, 0.3); wb.inputs["Subsurface Scale"].default_value = 0.01
        self.candle_obj = at("candle", link(bpy.data.objects.new("candle", candle_mesh("candle", 1 + REWIND["candle"]["from"]))))
        self.candle_obj.location = self.frames["candle"](0, CANDLE_FOOT, 0); self.candle_obj.data.materials.append(wax)
        self.wick = made("candle", rod("wick", Vector(), Vector((0, 0, M(1.0))), M(0.08), plain("wick", (0.02, 0.015, 0.01), rough=0.9), verts=8))
        self.candle(REWIND["candle"]["from"])

    # ── setting them ───────────────────────────────────────────────────────
    def dial_centre(self):
        return self.frames["clock"](0, DIAL_Y, DIAL_D)
    def clock(self, h, m):
        """the hands at h:m (the cap with them)"""
        angles = {"hour": ((h % 12) + m / 60) / 12 * math.tau, "minute": m / 60 * math.tau, "cap": 0.0}
        turn = self.turns.get("clock", 0.0)
        for name, o in self.hands.items():
            o.matrix_world = Matrix.Translation(self.frames["clock"](0, DIAL_Y, self._hand_d[name])) @ Matrix.Rotation(turn, 4, "Z") @ Matrix.Rotation(angles[name], 4, "Y") @ (Matrix.Rotation(math.pi / 2, 4, "X") if name == "cap" else Matrix())
    def page(self, day):
        self.page_card.data.materials[0] = self.pages[day]
    def sand(self, when, high=None):
        """the sand as it lies at the start (all of it below) or the end (up
        to the minute `high` above, the rest below)"""
        low = SAND_START if when == "start" else SAND_END
        self.sand_low.data = sand_mesh("sand low", 1.25, low[0], low[1]); self.sand_low.data.materials.append(self.sand_mat)
        if when == "start": self.sand_high.hide_render = True
        else:
            self.sand_high.data = sand_mesh("sand high", NECK + 0.05, minute_y(REWIND["glass"]["to"] if high is None else high), 0)
            self.sand_high.data.materials.append(self.sand_mat); self.sand_high.hide_render = False
    def candle(self, ring):
        """the candle burned down (or grown back) to the ring of hour `ring`"""
        top = 1 + ring
        mats = list(self.candle_obj.data.materials)
        self.candle_obj.data = candle_mesh("candle", top)
        for m_ in mats: self.candle_obj.data.materials.append(m_)
        self.wick.matrix_world = Matrix.Translation(self.frames["candle"](0.05, CANDLE_FOOT + top - 0.25, 0)) @ Matrix.Rotation(0.12, 4, "X")
    def wick_tip(self, ring):
        return self.frames["candle"](0.05, CANDLE_FOOT + 1 + ring + 0.7, 0)
    def objects(self, kind):
        return self.made.get(kind, [])
