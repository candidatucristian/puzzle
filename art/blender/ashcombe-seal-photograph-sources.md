# Case-file seal photograph

The revised opening identifies the letter by the Ashcombe crest, rather than by
unexplained recognition of its handwriting. The report shown in the prologue
includes this photograph so that the player can see the matching seal.

The printed detail is taken from the existing `public/assets/video/IntroVideo.mp4`
at 33 seconds, crop x=855, y=775, width=230, height=130 in the 1920 × 1080 frame.
This reuses existing film artwork; it is not a newly modelled seal or a claim
that the original film was rendered in Blender. No image-generation tool was used.

`ashcombe_seal_photograph.py` models the paper, its slight curl and thickness,
and its rough photographic surface. The film detail is a monochrome print
material on that geometry. Blender 4.5.15 Cycles renders it under area/world
lighting, without clearcoat, at 792 × 520 with transparent surroundings.
The printed words are live, translated HTML, not baked into the image.

Reproduce from the project root (PowerShell):

```powershell
New-Item -ItemType Directory -Path .artifacts/intro-story-review-2026-11-14 -Force
& 'C:\Users\crist\Tools\ffmpeg-dl\ffmpeg-master-latest-win64-gpl\bin\ffmpeg.exe' -hide_banner -loglevel error -ss 33 -i public/assets/video/IntroVideo.mp4 -frames:v 1 -update 1 -y .artifacts/intro-story-review-2026-11-14/envelope-33s.png
& 'C:\Users\crist\Tools\blender-4.5.15-windows-x64\blender.exe' -b --factory-startup -P art/blender/ashcombe_seal_photograph.py
node art/blender/ashcombe_seal_photograph_publish.mjs
```

The saved `.blend` in the artifact directory packs its reference image.
The WebP used by the application is `public/assets/images/CaseFile/ashcombe-seal-photograph.webp`.
