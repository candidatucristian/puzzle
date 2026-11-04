# A found letter: native Blender animation

The runtime scene uses original geometry and keyframes authored by
`letter_animation.py`, shared original paper construction from
`letter_common.py`, solid wax from `letter_seal.py`, and no video. The old letter movies and their encoder
have been removed.

Blender models the envelope as separate, genuinely thick paper pieces with
an actual flap hinge. A continuous key-stamped seal is shown until the crack
cue. At that cue it is replaced by two complementary solid meshes, cut along
the actual rounded flap footprint. The moving wax stays inside the flap's
silhouette, without intersecting key pieces or a prematurely visible seam.
The flap stays closed until this same cue so it cannot rise through the intact wax.
The letter is made of three hinged panels: it stays inside the pocket
until the flap opens, slides out, is laid on the desk and unfolds. During the
slide the flap lies fully back below the paper. The folded sheet clears the
rear panel, passes under the front pocket and is completely inside before
the flap closes. Both Blender and a browser test check these clearances
through every sliding frame. A parent
actor brings the sealed envelope into frame. Camera, hinges, paper and
envelope movements are merged into one portable glTF animation clip.

Cycles CPU bakes original aged-paper procedural colours and normals into a
2048-pixel stationery atlas. The incremental v3 export preserves that original
paper and bakes its new matte wax into a separate 1024-pixel atlas. Only the
envelope, letter, seal variants and camera are exported. The desk, writing bed,
inkwell and pen are excluded. The canvas clears to transparency over the
interface's dark radial fade; there is no photographic or 3D background.
No AI-generated imagery is used.

The output is `public/assets/images/CaseFile/letter/letter-animation-v3.glb`.
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

The hall wax fracture now uses the supplied `public/assets/sounds/sigilbreak.mp3`.
It is decoded before opening; leading silence/encoder padding is skipped, and
the `crack` cue from the same Blender animation clock triggers the buffer.
It plays at the game's SFX/master settings and stops when the presentation is
disposed. The optional full-opening recording above does not suppress this
dedicated fracture cue.

Rebuild:

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/letter_animation.py -- --samples 16 --pack
node art/blender/letter_animation_publish.mjs
```

To upgrade the existing packed `.artifacts/letter-animation/letter-animation.blend`
while keeping its original paper bake:

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b -t 6 -P art/blender/letter_stationery_v3.py
```
