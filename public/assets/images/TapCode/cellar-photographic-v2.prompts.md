# Marks in Stone: photographic cellar

Mode: built-in image generation tool, sketch-to-render followed by a local Z alignment edit.

Final asset: `public/assets/images/TapCode/cellar-photographic-v2.png`.

References: `.artifacts/room5-puzzles-art/cellar-layout.png` (layout guide from original room geometry), `public/assets/images/TapCode/cellar-background.png` (real materials; its old circular rack is not used).

The photo provides real brick, joists, ladder/hatch, barrels, maps, candle/stool, chisel/dust and a real 5-by-5 square wooden lattice. The stone face is blank in the asset. Its six pairs of tally marks are drawn by the original `TAP_WORD`/`tapPair` code, calibrated to the photograph. The native deeply cut Z is retained at the photographed grid's final row to guarantee exact clue placement. The live candle, drip, floor ripples, fog and motes use the new photo landmarks. No puzzle solution or mechanics changed.

No tests, builds, browser previews or new game captures were run. Visual acceptance is pending.

## Main prompt

Use case: sketch-to-render. Asset: photorealistic background for "Marks in Stone", the existing cellar puzzle.
Input1 is the EXACT existing room-layout guide. Input2 is the photographic brick/stone/wood material reference ONLY; do not copy its round-hole rack or change the layout.
Make input1 an actual photographed low manor cellar, landscape1.75:1,1792x1024 composition, same straight-on camera and original perspective, back wall meets floor at77%height, low ceiling joists top8%, no windows, no new openings or central hole in floor.
Real dark uneven brickwork, lime mortar, damp patches low on wall, shallow side returns, heavy worn timber overhead, actual stone flag floor with subtle damp reflections and natural joints. Old rusty iron ladder at17.5%across extends to a small open ceiling hatch at top-left, cool blue light down the ladder. Two old oak barrels lower-left, a small crate and tub of rolled charts at34%across nearfloor, as existing.
Existing real cast-iron pipe runs from right along y14%height and turns DOWN at40%across. A wet threaded collar at47%across,14%down, tiny bead but no falling drop baked in. Small shallow puddle on floor beneath it at47%across,80%down. Leave room for live drips.
The message stone: a single small VERTICAL smoothly dressed GREY LIMESTONE slab mortared into the brick, exactly x54%-66%,y27%-58%. This face is COMPLETELY BLANK, no tally marks, no text, no cracks crossing its centre. The exact six-row carved message is added by the game. Subtle real pores, stone thickness/edge shadow, warmer lower-right candle reflection.
RIGHT of it, low against wall: keep the existing square WOODEN lattice / grating with EXACTLY FIVE COLUMNS and FIVE ROWS of empty SQUARE cells, positioned x78%-90.5%,y53%-75%. Real dark old oak rails and stiles, square through-openings with actual brick behind and believable recess depth, small dust and cobweb. NEVER circular bottle holes, glass panes, circular cubbies, or6rows. Frame straight and square to camera.
At x91.75%,y72.8%, just RIGHT of this grid and precisely aligned with the centre of its LAST/BOTTOM row, carve one small capital "Z" directly into the exposed brick/stone wall. Physically chisel-cut irregular deep groove, pale chipped inner lips, tiny falling dust below it. This is a wall carving, not ink, chalk or a plaque. It is the ONLY letter in the image. A narrow real steel masonry chisel lies on the floor directly below with a modest fresh pale stone-dust pile, not huge rubble.
At72%across a small genuine wooden three-legged stool on the floor with a brass saucer and short ivory wax candle. Candle wick tip at(72%,62.1%) and stool seat near66.5%height. NO FLAME baked into the image: live flame will be added. Surrounding wall/slab still has a gentle warm candle-like practical pool ready for compositing. Dark atmospheric, not pitch-black clues. No people, no other text/marks or numbers, no UI, no watermark. Actual photoreal objects and materials with substantial volume, not painting.

## Z alignment edit prompt

Use case: precise-object-edit. Input image1 is the edit target: this exact photographed cellar. Change ONLY the position of the small carved "Z" on the wall to the right of the wooden grid.
The wooden grid has FIVE rows. Its bottom row of square openings is around y670..712 in this1659x948image; their centres are aroundy692. The current Z is too high.
Erase the current carved Z around(1575,646) and restore ordinary matching brick there. Re-carve the same modest physically hand-chiselled Z centered at(1575,692), approximately x1554..1596,y672..711. Its centre must align exactly with the centre of the grid's FIFTH/BOTTOM row, just to its right, outside the grid. Real recessed jagged stone groove, dark inner shadow, pale freshly chipped lip, no paint or text overlay. This one Z is the only writing.
Keep EVERYTHING ELSE unchanged: all5x5square openings, frame, blank central stone, ladder, hatch, pipe, unlit candle, barrels, charts, chisel/dust, floor, camera, lighting, image size/aspect. No duplicate Z or extra marks.

