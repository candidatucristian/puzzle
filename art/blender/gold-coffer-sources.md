# The house's gold coffer and trefoil key

The replacement is an original Blender model, shared by all five rooms through
`gold_coffer_model.py` and `room_common.chest()`. No photographic cutout,
AI-generated image, painted highlight or emissive material is used.
The packed editable inspection scene is
`.artifacts/gold-coffer-v2/gold-coffer.blend`.

The body has four metal walls, a bottom, cast feet and mouldings, raised field
borders, individually modeled beading, acanthus relief, peened rivets, drop
handles, a pierced lock escutcheon and separate keyhole pocket. The barrel lid
has a real inner shell, solid end plates, cast ribs and rivets, alternating
hinge knuckles and a hasp. Oxblood velvet follows the walls and curved lid.
The trefoil key has three open loops, a cylindrical shank, turned collars and
separate cut wards. Its shape stays consistent with the existing door-unlock film.

Gold and bronze are physically metallic shaders with fine tool marks,
microscratches, cavity patina and varying roughness. The main gilt surface has
a 0.40 roughness floor; handled edges remain above 0.28. Clearcoat and emission
are zero. The neutral inspection photograph uses the project's cached CC0
Poly Haven `dark_wood` scan, with a matte roughness floor on the support.

`gold_coffer_rooms.py` builds each actual room with its existing camera and
lighting, activates the same fixed lighting configuration used by the room
plate and renders a calibrated crop of the coffer. Its feet are rested on the
real tabletop found by a downward ray. A Cycles shadow catcher contributes
the contact shadow; other room surfaces remain present for reflections,
occlusion and bounced light. No extra spotlight, image-brightness filter,
post-render tint or additive halo lights the coffer.
Existing broad area fills remain visible in the metal's reflections; hiding
those sources was a second reason the old gold went black without its kicker.

The old isolated-prop renderer added a 7 W reflector, while room-only passes
could leave normally inactive practical lamps on. The shared default reflector
has been removed and all room builders apply their fixed light configuration to
prop passes as well. The native pipeline adds no reflector at all.

Each room supplies 13 real lid poses and a key rendered in the same room light.
`gold_coffer_publish.mjs` creates registered alpha atlases, closed/open images
and native keys in `public/assets/images/Chest/native-v2`, plus
`house/nativeCoffer.json`. The room plates and puzzle geometry are unchanged.
At runtime the lid moves through these poses and the key rises without the
old white light burst. The index uses a neutral Cycles photograph of the same key.

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup -t 6 --python art/blender/gold_coffer.py -- --width 2000 --samples 384
foreach ($cofferRoom in @('Study', 'Room2', 'Room3', 'Room4', 'Room5')) {
  & 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup -t 6 --python art/blender/gold_coffer_rooms.py -- --room $cofferRoom --width 6144 --samples 320
}
node art/blender/gold_coffer_publish.mjs
```

`--width 6144` defines supersampling relative to each room's 1880-pixel reference.
Only the coffer's crop is rendered; the camera calibration preserves the room's
original projection. For inspection previews, `gold_coffer.py --preview 1
--width 1280 --samples 96` writes the two preview images without replacing the
packed scene or published assets. Asset production and visual inspection do
not run automated tests, linters or production builds.
