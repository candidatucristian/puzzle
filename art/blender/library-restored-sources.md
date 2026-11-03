# Room II — original library, updated surfaces

The active room is built by `room_library_restored.py`, which executes the
original `room_library.py` geometry and camera without rendering or
publishing its old materials. It then assigns the worn materials introduced
in the newer design and renders everything in Blender 4.5 / Cycles / OptiX.
There are no AI-generated assets.

The original full-height walnut panelling, coffered ceiling, herringbone
parquet, bookcases on two walls, central reading table, clock desk, ladder,
chairs, red curtains, two sash windows and garden remain in their original
positions. The walls are entirely dark wood. Camera position, focal length
and puzzle geometry come directly from the original builder.

The newer material response uses locally cached photographic CC0 Poly Haven
scans: `dark_wood`, `wood_floor_worn`, `brown_leather`, `fabric_leather_02`,
`velour_velvet` and `plastered_wall_04`. Wood has subtle grain, surface wear,
normal and roughness detail with no clearcoat. The parquet retains its
original pattern, with worn oak and per-block tonal variation. Burgundy
curtains retain their original colour and folds, with a matte velvet shader.
Books use muted calf bindings; paper edges use the newer rag-paper shader.
Brass has rubbed, tarnished surfaces. Nonmetal roughness is at least 0.46.
Existing CC0 furniture and garden models and original rug, print, spine and
clock-face artwork are reused from the original scene.

Only the green reading lamp is on. The two existing windows admit the moon
and a broad exterior sky source each. Interior shelf lights, frontal fills,
the office lamp and the clock's red wall wash are disabled. Window emitters
are outside the wall and parallel to the glass. Thin window shadow rays
transmit direct illumination through the project's `clear_glass` shader.
Display emission is subdued. Runtime keeps the calm indicator lenses and
subtle puzzle cues without adding lamp halos or a blinking clock colon.

Room II's contour glints use actual camera-projected silhouettes: the five
marked volumes, four clock cases and the router body and aerials. The
`interactionContours` export is independent of the larger click zones.
`room2/contourSparkles.js` keeps glints on those edges, strengthens the
contours on hover and provides a still version for reduced motion.

The shared hollow coffer is photographed in the same room lighting through
the same camera. `library_coffer_pass.py` provides thirteen hinge poses,
contact shadows and the matching key. Projected puzzle, coffer, indicator
and rain geometry is published together with the room's image.
The foreground plant's camera-projected outline masks the live rain so
droplets remain behind its leaves, on the window glass.

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup -t 6 --python art/blender/room_library_restored.py -- --width 3200 --samples 512 --only plate,coffer
node art/blender/room_library_v3_publish.mjs --source .artifacts/room-library-restored --version 4 --coffer-version 5
```

The packed editable scene is
`.artifacts/room-library-restored/room-library-restored.blend`.
The image is published as `Room2/room2-lights-1-render-v4.webp`, with native
v5 coffer assets and the original camera's projected room geometry.
`house/roomRender.js` selects the room's version 4; other rooms retain their
own artwork versions.

Use `--width 1440 --samples 80 --only preview` for a local visual draft.
Preview mode includes the shut coffer and does not publish game assets.
