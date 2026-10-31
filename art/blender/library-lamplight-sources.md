# Lamplight in the Library

`library_lamplight.py` models the complete puzzle in Blender 4.5 and renders it
with Cycles and OptiX. The packed editable scene is
`.artifacts/library-lamplight/library-lamplight.blend`. No AI imagery or old
photographic library, binding or shelf-row images are loaded by the new scene.

The mahogany case has four shelves in two bays, individual leather-bound
volumes, gilt tooling and raised titles. The five clue books have modeled
paper bookmarks with ink numbers. `library_lamplight_publish.mjs --prepare`
copies the titles and numbers directly from `bookshelf/puzzle.js`:
SHADOW 1, MIRROR 2, MAGIC 3, HOUND 1 and WATER 3. Their indexed letters still
read SIGHT. No answer or instructional text is added to the scene.

The room includes worn panelling and floorboards, a wool rug, a glazed sash
window with rain beads and a moonlit garden, a turned side table, brass lamp
and pleated linen shade, porcelain tea service and stacked books. An original
sleeping tabby is modeled with a curled torso, tucked paws, ears, eyelids,
whiskers, a striped coat and individual short fur curves.

Materials reuse the project's locally cached CC0 Poly Haven scans through
`kit.py` and `hall_common.py`: `dark_wood`, `rosewood_veneer1`,
`wood_floor_worn`, `plastered_wall_04`, `fabric_leather_02`, `velour_velvet`
and `dirty_carpet`. The rug uses the existing original `room_boards.mjs`
pattern. Brass, porcelain, paper and fur are original Blender shaders.
Nonmetal surfaces retain matte roughness and no clearcoat.

The 2560 × 1362 plate uses 384 samples and denoising. Nine actual pull poses
per clue book are rendered as opaque room crops from the same camera, including
the visible cover, bookmark, changing perspective and shadow. The publisher
packs all 45 poses into one atlas and copies the projected interaction bounds
to `bookshelf/nativeLibrary.json`. `NativeBookshelfScene` plays these poses
forward and back on click; lighting stays independent of puzzle completion.
On narrow screens, the pulled book can be read in a magnified view of its
same Cycles crop; clicking or pressing Escape puts it back.
The existing steam, dust and sparkle effects remain optional at runtime.

```powershell
node art/blender/library_lamplight_publish.mjs --prepare
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup -t 6 --python art/blender/library_lamplight.py -- --width 2560 --samples 384
node art/blender/library_lamplight_publish.mjs
```

For a lightweight visual preview, add `--width 1280 --samples 64 --preview 1
--only plate` to the Blender command. This writes `preview.png` without
publishing or replacing the final assets. No tests, linters or production
builds are required for asset production or visual inspection.
