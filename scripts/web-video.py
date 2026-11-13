# The intro film made smaller for the web demo, with Blender's own FFmpeg: the
# picture through untouched (Standard view, no look, no dither: the same
# colour, BT.709 as the original), H.264 at a constant quality, AAC sound.
# MEDIUM (CRF 23) gave 17.9 MB from 52 MB with the detail kept (2026-11-07).
#   blender -b --factory-startup -P scripts/web-video.py -- public/assets/video/IntroVideo.mp4 <out.mp4> MEDIUM
#   node scripts/mp4-faststart.mjs <out.mp4> public/assets/video/IntroVideo-web.mp4
import bpy, sys
args = sys.argv[sys.argv.index("--") + 1:]
src, out = args[0], args[1]
crf = args[2] if len(args) > 2 else "LOW"
scene = bpy.context.scene
seq = scene.sequence_editor_create()
strips = seq.strips if hasattr(seq, "strips") else seq.sequences
movie = strips.new_movie("film", src, channel=1, frame_start=1)
sound = strips.new_sound("sound", src, channel=2, frame_start=1)
el = movie.elements[0]
r = scene.render
r.resolution_x, r.resolution_y, r.resolution_percentage = el.orig_width, el.orig_height, 100
r.fps, r.fps_base = 30, 1.001
scene.frame_start, scene.frame_end = 1, movie.frame_final_duration
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.display_settings.display_device = "sRGB"
r.dither_intensity = 0
r.image_settings.file_format = "FFMPEG"
ff = r.ffmpeg
ff.format = "MPEG4"
ff.codec = "H264"
ff.constant_rate_factor = crf
ff.ffmpeg_preset = "BEST"
ff.gopsize = 60
ff.use_max_b_frames = True
ff.max_b_frames = 2
ff.audio_codec = "AAC"
ff.audio_bitrate = 128
ff.audio_mixrate = 48000
ff.audio_channels = "STEREO"
r.filepath = out
r.use_file_extension = False
print("ENCODE", src, "->", out, crf, scene.frame_end, "frames", flush=True)
bpy.ops.render.render(animation=True)
print("ENCODE_DONE", flush=True)
