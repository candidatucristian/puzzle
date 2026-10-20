# Original cellar — photographic materials, v3

Mode: built-in image_gen tool. These assets replace materials and individual objects inside the original `layoutCellar` geometry. No generated full-room background is used.

The ladder, ceiling hatch, pipe, message stone, barrels, crate, charts, candle, five-by-five lattice, carved Z and floor retain their original layout. Existing puzzle marks and animated effects remain code-rendered.

Saved assets:
- `public/assets/images/TapCode/original-cellar-surfaces-v3.png`
- `public/assets/images/TapCode/original-cellar-props-v3.png`

## Surface atlas — exact prompt

Use case: product-mockup. Asset: photographic MATERIAL SCAN atlas for an existing cellar; NOT a room image. Landscape1536x1024, EXACT3equal columns by2equal rows, every cell512x512edge-to-edge, no gutters or labels.
TOP LEFT: flat close orthographic macro scan of ONE real dark warm reddish-brown old clay brick FACE, natural fine pores, fired clay grain, slight subtle chipped surface variations; no mortar, no joints, no multiple bricks.
TOP MIDDLE: actual aged dark brown oak timber face, fine vertical grain, small worn fibres, maintained structural beam surface, no boards joints or ornate patterns.
TOP RIGHT: flat scan of real dark cast iron with subtle brown rust, fine metal pores and scratched old black paint, no pipes, objects, fixtures or fake drawn chips.
BOTTOM LEFT: real grey/taupe finely dressed limestone face, fine pits and subdued mineral variation, almost smooth enough for carving, no carved marks, writing, mortar or edges.
BOTTOM CENTRE: real old dark grey stone flag FACE, subtle grain and slight damp sheen, fine irregular wear, no joints, no additional slabs or cracks.
BOTTOM RIGHT: real grey aged lime plaster with natural fine mineral texture, restrained pale mottling, no brick, no holes or shapes.
Genuine high resolution photographic surface scans, neutral soft studio illumination, not too bright, natural low contrast so runtime light/shadows can shade them. Dark atmospheric palette. Photographs, no illustration or CGI. NO perspective, room, camera vanishing point, furniture, props, text, labels, people, borders or watermark.

## Transparent prop atlas — exact prompt

Use case: product-mockup. Asset: real PHOTOGRAPHIC cutout atlas for replacing existing cellar props WITHOUT moving or resizing them. SQUARE1536x1536, EXACT3columns by3rows, each equal cell512x512. Every object fully inside its own cell with generous12%transparent margin on every side; no object crosses a cell boundary. No drawn grid.
TOP LEFT: ONE full upright dark old oak barrel, modest bulge, three dark worn iron hoops, small ellipse of its top visible, front view slightly from above.
TOP CENTRE: ONE small low rectangular weathered oak slatted crate with FOUR empty green glass bottle necks protruding from straw. Front view slightly from above, real slats and nail heads, no printed labels.
TOP RIGHT: ONE small low wooden coopered tub holding seven old rolled paper charts at irregular angles, two longer rolls leaning behind and one small fallen roll in front; compact group, all in cell, realistic old paper coils and twine.
MIDDLE LEFT: ONE small simple THREE-LEGGED wooden stool, round seat, standing straight, shallow view of seat ellipse, three real splayed legs, front view. EMPTY seat; no candle here.
MIDDLE CENTRE: ONE EXACTLY SQUARE 5-by-5 wooden lattice/grating, FIVE COLUMNS and FIVE ROWS, six equally spaced vertical rails crossing six horizontal rails,25identical empty SQUARE openings. Front perfectly square to camera. Narrow dark old oak rails with fine grain and subtle physical depth, no deep cubbies. EVERY opening must be genuinely transparent all the way through, as well as outside frame; no solid back, wall, bottles or glass. No feet or attachments.
MIDDLE RIGHT: ONE small vertical rectangular blank grey limestone carving slab, ratio width:height2:3, front orthographic, subtly irregular chipped edge, thin pale lime mortar rim only. Completely blank dressed grey stone, no carvings, no writing, no backing wall, no symbols. Real pores and small bevel depth, no ornate moulding.
BOTTOM LEFT: ONE narrow old steel masonry chisel lying HORIZONTALLY, flat cutting edge at left, long straight narrow steel shank and gently mushroomed striking end at right, no wooden handle; entirely visible, front slightly above.
BOTTOM CENTRE: ONE small short unlit ivory wax candle in a shallow plain brass saucer. Candle with dark wick, real wax runs, NO flame or glow. Front view with small ellipse of saucer visible. 
BOTTOM RIGHT: EMPTY fully transparent.
All props from same real photographic shoot, soft cool light from upper-left plus restrained warm right fill, dark realistic material palette, real wood grain, paper, stone and metal. Physical depth and contact shading within objects only; no long floor shadows. TRUE alpha transparency outside each object, in the grid's25holes and all gaps between legs and rolls. No black/white/coloured matte, no coloured edge halos. No people, labels, numbers, text, ground or room background. No cartoon, illustration or CGI.

## Integration

The surface atlas is sampled onto the original brick faces, timber beams, flagstones and iron surfaces. Individual prop crops are scaled into the existing drawing bounds. Generated edge artifacts are removed when the runtime creates the cached crops. Original candle flicker, water drip, fog, carved marks and lattice position are retained.

No tests, builds or game previews were run, per the user's instruction.
