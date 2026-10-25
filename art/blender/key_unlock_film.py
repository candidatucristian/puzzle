# The key's frames (key_unlock.py → .artifacts/key-unlock) made a film for the
# game: H.264 in an MP4, as every browser plays it, no sound (the game makes
# its own, timed by the cues — levels/hall/keyUnlock.json, copied here too).
#
#   blender -b --factory-startup -P art/blender/key_unlock_film.py

import bpy, os, sys, json, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import arg
from hall_common import ROOT

FRAMES = os.path.abspath(arg("--frames", os.path.join(ROOT, ".artifacts/key-unlock")))
FILM = os.path.join(ROOT, "public/assets/video/key-unlock.mp4")
CUES = os.path.join(ROOT, "src/levels/hall/keyUnlock.json")

names = sorted(f for f in os.listdir(FRAMES) if f.startswith("frame-") and f.endswith(".png"))
if not names: raise SystemExit("no frames in " + FRAMES)
cues = json.load(open(os.path.join(FRAMES, "cues.json")))
if len(names) != cues["frames"]: raise SystemExit(f"{len(names)} frames of {cues['frames']}: render them all first")

scene = bpy.context.scene
scene.render.fps = cues["fps"]
scene.frame_start, scene.frame_end = 1, len(names)
se = scene.sequence_editor_create()
strips = getattr(se, "strips", None) or se.sequences
strip = strips.new_image("key", os.path.join(FRAMES, names[0]), 1, 1)
for name in names[1:]: strip.elements.append(name)
# (the frames are already as they are to be seen: no second view transform)
scene.view_settings.view_transform = "Standard"; scene.view_settings.look = "None"
img = bpy.data.images.load(os.path.join(FRAMES, names[0]))
scene.render.resolution_x, scene.render.resolution_y = img.size[0], img.size[1]
scene.render.resolution_percentage = 100
r = scene.render
r.image_settings.file_format = "FFMPEG"
r.ffmpeg.format = "MPEG4"; r.ffmpeg.codec = "H264"
r.ffmpeg.constant_rate_factor = "HIGH"; r.ffmpeg.ffmpeg_preset = "BEST"
r.ffmpeg.gopsize = 15; r.ffmpeg.audio_codec = "NONE"
os.makedirs(os.path.dirname(FILM), exist_ok=True)
r.filepath = FILM
r.use_file_extension = False
bpy.ops.render.render(animation=True)
shutil.copyfile(os.path.join(FRAMES, "cues.json"), CUES)
print("FILM", FILM, os.path.getsize(FILM), "bytes;", "cues", CUES)
