# A found letter: native Blender animation

The runtime scene uses original geometry and keyframes authored by
`letter_animation.py`, shared original paper and wax construction from
`letter_common.py`, and no video. The old letter movies and their encoder
have been removed.

Blender models the envelope as separate, genuinely thick paper pieces with
an actual flap hinge. The key-stamped wax is fractured into two complementary
meshes. The letter is made of three hinged panels: it stays inside the pocket
until the flap opens, slides out, is laid on the desk and unfolds. During the
slide the flap lies fully back below the paper. The folded sheet clears the
rear panel, passes under the front pocket and is completely inside before
the flap closes. Both Blender and a browser test check these clearances
through every sliding frame. A parent
actor brings the sealed envelope into frame. Camera, hinges, paper and
envelope movements are merged into one portable glTF animation clip.

Cycles CPU bakes original aged-paper procedural colours and normals into a
2048-pixel stationery atlas. Another 2048-pixel atlas captures the desk,
writing bed and fittings. Desk wood and leather reuse the existing Poly Haven
CC0 `dark_wood` and `brown_leather` scans. Wax, ink, brass, glass and the pen
are original geometry and shaders. No AI-generated imagery is used in the
new arrival scene.

The output is `public/assets/images/CaseFile/letter/letter-animation-v2.glb`.
The versioned filename prevents a cached older mesh animation being reused.
The publisher derives the actual exported clip duration and cue times into
`src/ui/letterAnimation.json`. Three.js renders these meshes with live light
and shadows. Readable, scrollable localised words are projected onto the
opened paper; they remain normal accessible DOM text. Reduced motion jumps
to the appropriate physical pose. A failed model load still allows reading
and filing on a simple paper fallback.

The future user-provided sound goes in
`public/assets/sounds/letter-open.mp4`. `paperSounds.js` checks for it and
uses an HTMLAudioElement connected to the game's audio output. The MP4
extension is a container name only: no video is shown or used for motion.
Mute, master volume, SFX volume and scene cleanup apply to this sound.

Rebuild:

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/letter_animation.py -- --samples 16 --pack
node art/blender/letter_animation_publish.mjs
```
