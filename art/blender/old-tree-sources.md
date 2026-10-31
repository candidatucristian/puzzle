# The Old Tree — native Blender specimen

`old_tree.py` builds the complete puzzle photograph in Blender 4.5 LTS.
The case, roots, soil surface, tags, engraved route plaques, bench, book,
wood panelling and lights are three-dimensional. The finished image is a
Cycles render, with no generated illustration or photographic backdrop.

The puzzle remains observational. Its original seven paths and eight leaf
letters are read directly from `src/levels/binarytree/puzzle.js`. Exactly
three forks reach eight tips. The fourteen child branches and entrance root
are modeled together; microscopic hairs never create additional clue paths.
Letters are ink on physical rag-paper tags. Route lettering is recessed
into separate brass plates, with dark ink in the recesses. All clues pass
through the same camera, glazing, light and render as the surroundings.

## Existing photographed sources

The locally installed Poly Haven CC0 library at
`C:/Users/crist/Tools/render/assets` supplies photographed material scans:

- `dark_wood`: case joinery and shaded wall panels;
- `rosewood_veneer1`: the hand-planed bench boards;
- `plastered_wall_04`: muted olive plaster;
- `gravel_road`: darkened fine soil/mineral surface detail;
- `potted_plant_01`: original scanned Pelargonium leaf geometry, UVs,
  photographed colour, normal and roughness textures. `fibonacci_geranium.py`
  extracts the same original leaf components already used by the garden.

Sources: [Poly Haven textures](https://polyhaven.com/textures),
[Poly Haven models](https://polyhaven.com/models),
[CC0 licence](https://polyhaven.com/license).
Only the leaf blades are taken from the botanical scan. The new shoot,
petioles, exact clue roots and complete display case are authored geometry.
`specimen_book.py` supplies the same closed green book to this close-up and
`room_study.py`, retaining its relative position beside the room-view case.
Georgia Italic and Courier New Bold use the installed Windows typefaces.

## Rebuild

From the project root in PowerShell:

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup --python art/blender/old_tree.py -- --width 2880 --samples 384 --pack
node art/blender/old_tree_publish.mjs
```

The current version uses a slightly elevated camera about thirteen degrees
to the right of the front view. Its distance leaves approximately fifteen
percent more space around the case, revealing its side glazing, roof depth,
joinery and more of the workbench. The frontal strip light remains absent
so no bright reflection covers the paper tags.

The script saves `.artifacts/old-tree-v2/old-tree.blend`, packs its textures
when `--pack` is supplied, and renders `old-tree.png` at 2880 × 1800.
The publisher writes `public/assets/images/BinaryTree/old-tree-native-v2.webp`
and `src/levels/binarytree/nativeTree.json`. This small JSON contains the
actual camera bounds. One continuous photograph covers the viewport at its
original proportions. On wider screens the vertical crop shifts upwards
to keep the bottom route rail visible.

For a composition render use `--out .artifacts/old-tree-v2-preview --width 1440
--samples 48 --cpu`. It does not publish the image to the game.

The runtime loads only the native render. The older photographic and canvas
modules are no longer imported by `BinaryTreeScene.js`. No new puzzle
interaction, timed requirement or sound is introduced.

Rendering and inspecting the artwork is part of producing the asset. No
test suite, browser automation or application build was run for this change,
in accordance with the user's instruction.
