# The Moonlit Garden: Blender artwork

The active level now uses `public/assets/images/PlantPot/Blender/` exclusively:
a complete Blender/Cycles exterior garden terrace, scanned oak bench, clay pot,
galvanized pail and twelve original photographed Pelargonium leaf meshes.
The foreground oak window and its deep sill are a separate transparent
Cycles render, kept at the viewport edges so the view reads as looking
through an open manor window without obstructing the watering puzzle.
The background is now a dense dark woodland, with several distances of
instanced photographic tree scans, a damp leaf floor and faint cool haze.
No AI-generated garden or plant images
are loaded by the active scene. The editable source is
`art/blender/fibonacci.blend`; provenance and render commands are in
`art/blender/fibonacci-sources.md`.

## Historical assets, superseded by the Blender scene

Original assets generated with the built-in imagegen tool and encoded as WebP with alpha preserved.

- `public/assets/images/PlantPot/potting-bench-night-v2.webp`: empty oak table, drawn with a single uniform scale, with foot contact shadows. The garden photograph is the lighting reference.
- `public/assets/images/PlantPot/laurel-growth-atlas-v1.webp`: four individual leaf photographs, one terracotta pot with compost and one young stem. Runtime alpha bounds isolate each sprite; petioles anchor to the growing branches. Colour is graded to the lantern and moonlight.

The five pours still add 1, 1, 2, 3 and 5 leaves. No extra decorative leaves obscure the counting.

Foreground visibility: leaf and bark exposure is lifted independently of the pot and garden. The stem tapers from a stronger base, and the leaves have slightly broader blades. The final shoot extends above and to the right of the older foliage, with wider node spacing so its five leaves remain distinct. Browser checks compare the transformed opaque leaf silhouettes on desktop and compact layouts, in addition to checking the watering sequence.

## Table prompt

Use case: product-mockup.
Asset type: a photographic transparent cutout of an EMPTY antique oak potting table for a night garden game.
Reference image: the supplied botanical garden is ONLY the lighting and photographic realism reference. Do not include any garden background in the output.
Subject: a real, naturally weathered dark grey-brown English oak garden worktable, 120 cm wide, 55 cm deep, about 75 cm tall, three thick oak boards, honest wooden joinery, plain narrow apron, four square legs with a modest low stretcher. Wood is aged but sound, irregular fine grain, slightly softened corners and subdued old patina. No uniform CGI grooves or black outlines.
Camera: exactly straight-on, camera centered, moderately above the top so the depth of the tabletop is visible at a 25-degree downward viewing angle. Symmetrical front view with natural converging depth lines, no side-angle skew. Entire table visible, no crop. Landscape 1536x1024 framing. Back tabletop edge near y=9%, front tabletop edge near y=32%, front feet near y=95%. Front width x=4% to 96%, back width x=9% to 91%. Realistic continuous table, not flat material samples.
Lighting: quiet late-night exposure matching reference. Soft amber lantern light from just above the left end of the tabletop; cool faint silver-blue light on the far right and back edge; legs and apron recede into dark cool shade. Natural restrained neutral oak colours, no orange glow. Fine photographic surface details, never illustration, never plastic.
Output: genuine alpha transparency in ALL non-wood areas, including the large spaces between legs and stretcher. Absolutely NO floor plane, no opaque backdrop, no checkerboard painted into image, no haze, no cast shadow beyond the silhouette, no surroundings. The tabletop is COMPLETELY EMPTY: no pots, plants, lanterns, cans, tools, people, words, labels, watermark.

## Botanical atlas prompt

Use case: product-mockup.
Asset type: one 3-column by 2-row transparent photographic botanical sprite atlas for an interactive plant growing in an English garden at night.
Exactly six equal cells in a landscape 1536 by 1024 image, each cell 512x512. No borders, gaps, labels, letters, numbers or shadows outside the subjects. True transparent alpha around every object. Leave 7% transparent padding within each cell, each subject isolated and never crossing cell boundaries.
TOP ROW: three INDIVIDUAL real fresh bay/laurel leaves, one leaf in each cell, not branches or pairs. Each has its own fine green petiole at bottom centre pointing straight downward, blade tip at top centre. (1) broad gently arched dark olive leaf front, (2) slightly narrower curved leaf with a soft twist and a little asymmetry, (3) turned leaf showing its softly paler underside and delicate veins. Long natural leaf shapes, about 12-17 cm long, fine real vein structure and slightly undulating edges, no serrated fantasy leaves. Matt waxy living surfaces, no plastic, not perfect symmetry.
BOTTOM LEFT: one smaller individual young laurel leaf, mildly curled at tip, muted fresh olive-green; same petiole alignment bottom centre and tip upright.
BOTTOM MIDDLE: one EMPTY weathered terracotta flowerpot containing dark real moist crumbly compost, NO plant in it. Squat flowerpot roughly 22 cm wide across its thick rolled rim and 19 cm tall, tapering to a 14 cm foot. Seen front-on and from about 25 degrees above: clearly visible oval mouth/soil, ellipse vertical to horizontal ratio about .4. Subtle pale mineral deposits, a few tiny moss spots low on the clay, earthy handmade terracotta, naturally uneven matte surface. Centered with foot near bottom of cell. Entire pot visible.
BOTTOM RIGHT: a straight thin real young laurel woody green-brown stem segment, upright centered, no leaves, subtle fine bark, small natural nodes, gently tapering from bottom to top. About 1 cm diameter and 25 cm long; close photographic detail for a stem texture.
ALL OBJECTS: macro photographic realism, natural colour and fine physical details. Lighting is subdued evening silver-blue from upper right and soft warm amber from lower left, matching a night botanical garden. Leaves stay dark rich olive green, not luminous neon. No painted highlights, no hard studio glow, no backdrop of any kind, no plant pots in top row. Four individual leaves, ONE pot with soil and ONE stem, exactly in the six assigned cells.
