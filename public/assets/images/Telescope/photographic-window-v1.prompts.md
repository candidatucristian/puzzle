# Telescope puzzle — photographic window and Moon

Mode: built-in image_gen tool.

Saved assets:
- `public/assets/images/Telescope/window-photographic-v1.png` (1660 × 948).
- `public/assets/images/Telescope/moon-photographic-v1.png` (1254 × 1254, transparent cutout).

Composition guide: `.artifacts/telescope-art/window-composition-v1.png`, authored from the existing `archGeo`, curtain outlines and ridge coordinates. It contains no rendered game stars.

The photographic view replaces only the close-up puzzle's sky, valley, stone arch, sill and curtains. The photo contains no stars or Moon. Native `layoutWindow`, `archGeo`, `content`, `inSky`, Braille dot geometry, ROW_ORDER, TUNE and both star RNG seeds remain unchanged. The foreground matte follows the same original geometry, so existing stars and constellation lines remain behind the architecture and fabric. Signal stars use restrained optical bloom instead of a filled illustrated sparkle, retaining their original centres, brightness animation and hover logic. The lunar cutout is fitted to the existing Moon radius and exact centre, with a subtle atmospheric halo. Shared room/hall window painters and shared moon assets remain unchanged.

The landscape was lowered during a finishing edit to keep all existing celestial positions above the tree line. The pale ivory curtains remain clearly lit with real pleats and visible weave.

No tests, builds, browser/game previews or new game captures were run.

## Window — exact main prompt

Use case: sketch-to-render. Asset: photorealistic background for an existing telescope/star puzzle, landscape1792x1024, aspect1.75:1.
Input1 is the strict EDIT TARGET and composition blueprint generated directly from the game's existing window geometry. Transform this exact arrangement into a real photographed window looking out at night. Keep the unusual broad elliptical arched opening, sill, hills and tied-back curtain shapes in the SAME places and with the SAME proportions. Do not change the framing or camera.

A real dark English manor observatory window, viewed straight on right up at the sill. The broad arch spans x4.5%-95.5%, crown at y4.5%, springing about y44.5%, sill at y88.5%. The physical thickness of the wall is visible in a believable shallow reveal with bevelled old dressed stone, restrained fine surface pores, small wear, solid deep shadows, no rotten ruin. The dark room wall is visible only around the arch and below the sill. Substantial real stone sill with a thin forward face, natural polished wear. A curved narrow aged brass curtain rod follows the existing arch.

THE CURTAINS MUST BE CLEARLY VISIBLE AND REAL: two thin ivory linen/voile curtains, one on each side, hanging from the side arcs exactly as the blueprint shows. Their upper inner edges start at about (12.6%,20.3%) and(87.4%,20.3%); gather into small real antique brass/cord tiebacks at about(7.2%,61%) and(92.8%,61%); flare gently to hems at x4%-12.5% and87.5%-96%,y89%. Fine translucent woven fibres, many natural vertical pleats, physically layered soft folds, modest irregular hem, gentle sheen of moonlight. Pale grey/ivory cloth illuminated enough to see fabric and depth clearly against the dark wall and sky, while still a night scene. Visible diffuse silver highlights on folds, soft occlusion shadows between folds, extremely faint warm reflected room light low on the material. The fabric must NOT become almost black, a flat shape, overly see-through or oversized theatrical drapery. Keep cloth inside the blueprint silhouettes so the existing star positions remain clear.
The central aperture is a HUGE quiet clear dark night sky. Make it look like a genuine low-light photograph: natural blue-black airglow, extremely subtle dark atmospheric gradients, perhaps barely perceptible wisps of high cloud, very low contrast. NO bright nebula, galaxy band, fantasy colours, aurora or dawn. A full moon will later be placed at(63%,19%) and the lighting should be compatible with it BUT DO NOT paint any moon here.
At the bottom, keep the distant valley and low wooded rolling ridges around y75%-83%, entirely below y74.5%; dark natural English broadleaf tree silhouettes, gentle realistic layers of trees and faint ground mist. Real trees rather than pointy cartoon cypresses. Restrained moonlight separating the distant ridge from the near-black nearer trees. No tall foliage in the central sky.
CRITICAL: do NOT add ANY STARS, bright sky specks, moon, planets, constellations, lettering or UI to the image. Every star, including the exact puzzle formations, is rendered by the game at existing positions. Keep sky genuinely empty, not a generated star field. No glazing reflections, window bars, mullions, closed shutters or new objects that could cover the sky. No telescope, table, lantern or furniture in this close-up. Everything physically real and photographically coherent, especially the clearly lit curtains, arch and valley. Preserve the diagram composition. No illustration, brushwork, vector, flat collage or cartoon CGI; no text or watermark.

## Window — exact landscape finishing prompt

Use case: precise-object-edit. Input1 is the edit target, this exact real arched window with ivory curtains. Keep its entire stone frame, curtain shape, pleats, ties, sill, camera, colours and lighting unchanged.
Change ONLY the distant landscape height: lower/compress the wooded valley into the bottom of the opening. The current tree/ridge skyline is too high. Extend the SAME clear blue-black night sky down to y77% of the whole image (about y730 in this948px-high photo). EVERY tree tip, far ridge and hill must remain BELOW y730. The uppermost ridge may undulate only between y730..764; all nearer trees and mist fit between y764 and the unchanged sill around y839. Realistically compress the valley's vertical extent, preserving its natural broadleaf woods and misty depth. No trees above y730 anywhere, including sides. No horizon line or artificial seam across the sky.
All star positions in the game must stay unobstructed, which is why the sky needs this height. Sky remains completely STARLESS and MOONLESS: no light dots, celestial objects or fake constellations. No other changes. Keep the curtain and stone details crisp. Same photographic realism and dimensions.

## Moon — exact prompt

Use case: photorealistic-natural. Asset: astronomical FULL MOON photograph cutout on genuine alpha transparency for a telescope game. Square image.
One real full near-side Moon, perfectly circular disc, front-on telescopic view, north up, normal familiar lunar maria and fine craters, naturally varied grey/off-white regolith, subtle warm ivory highlights, restrained contrast and real photographic texture. Exposed to keep surface detail, not a blown-out lamp. Very subtle limb shading for spherical depth but it remains full phase, no large crescent shadow. No stylized painted blobs or excessive gouged craters.
Composition: Moon disc centered exactly in the square. Its visible diameter is72% of image width, leaving14% transparent margin on each side. Smooth natural antialiased circular limb. NO background or sky, NO stars, NO clouds, NO halo or glow outside the disc, no text, border, ring, watermark, diagram or illustration. It is a clean telescope photograph cutout, genuine transparency outside the lunar disc. The game supplies the soft atmosphere and the exact old size/position.
