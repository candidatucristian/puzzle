# The letter's frames (letter_film.py → .artifacts/letter-film) made a film:
# H.264 in an MP4, as every browser plays it, no sound (the game makes its
# own). The same frames make both films the game plays: forward, the letter
# opened; and backward from the end, faster, the letter folded up again.
#
#   blender -b --factory-startup -P art/blender/letter_film_encode.py -- --from 1 --to 156 --out public/assets/video/letter-open.mp4
#   blender -b --factory-startup -P art/blender/letter_film_encode.py -- --from 156 --to 56 --step 2 --out public/assets/video/letter-fold.mp4

import bpy, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import arg
from hall_common import ROOT

FRAMES = os.path.abspath(arg("--frames", os.path.join(ROOT, ".artifacts/letter-film")))
A, B, STEP = int(arg("--from", "1")), int(arg("--to", "156")), int(arg("--step", "1"))
FILM = os.path.join(ROOT, arg("--out", "public/assets/video/letter-open.mp4"))
FPS = int(arg("--fps", "30"))

order = range(A, B + 1, STEP) if B >= A else range(A, B - 1, -STEP)
names = [f"frame-{n:04d}.png" for n in order]
missing = [n for n in names if not os.path.exists(os.path.join(FRAMES, n))]
if missing: raise SystemExit(f"{len(missing)} frames missing, from {missing[0]}: render them all first")

scene = bpy.context.scene
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 1, len(names)
se = scene.sequence_editor_create()
strips = getattr(se, "strips", None) or se.sequences
strip = strips.new_image("letter", os.path.join(FRAMES, names[0]), 1, 1)
for name in names[1:]: strip.elements.append(name)
# (the frames are already as they are to be seen: no second view transform)
scene.view_settings.view_transform = "Standard"; scene.view_settings.look = "None"
img = bpy.data.images.load(os.path.join(FRAMES, names[0]))
scene.render.resolution_x, scene.render.resolution_y = img.size[0], img.size[1]
scene.render.resolution_percentage = 100
r = scene.render
r.image_settings.file_format = "FFMPEG"
r.ffmpeg.format = "MPEG4"; r.ffmpeg.codec = "H264"
r.ffmpeg.constant_rate_factor = arg("--quality", "MEDIUM"); r.ffmpeg.ffmpeg_preset = "BEST"
r.ffmpeg.gopsize = 15; r.ffmpeg.audio_codec = "NONE"
os.makedirs(os.path.dirname(FILM), exist_ok=True)
r.filepath = FILM; r.use_file_extension = False
bpy.ops.render.render(animation=True)
print("FILM", FILM, len(names), "frames", os.path.getsize(FILM), "bytes")
