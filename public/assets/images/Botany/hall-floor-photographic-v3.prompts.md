# Botany Hall: continuous photographic floor (V3)

Mode: built-in image generation tool, followed by a targeted grass edit.

Final asset: `public/assets/images/Botany/hall-floor-photographic-v3.png`.

Reference: `public/assets/images/Botany/hall-finishes-v2.png` for the established dark walnut and living grass palette. The first generation is an orthographic floor scan, not a room background. The final edit changes only the grass texture.

The original floor projection, door thresholds, grass-runner footprint and hall lighting are preserved. The floor scan is remapped into three adjoining strips so its grass occupies the original 29.24% of the hall width, then projected once over the existing floor plane. No repeating macro grass tiles, copied gloss stripes or procedural dark plank outlines are drawn over it. Existing hall walls, doors, plants, clock, stairs, gate, interactions and other floors are unchanged.

The earlier materials remain available as fallback. No tests, builds, browser previews or new game captures were run. Visual acceptance is pending.

## Exact generation prompt

Use case: photorealistic-natural.
Asset type: one continuous PHOTOGRAPHIC FLOOR MATERIAL for an existing botanical manor hallway. This is a flat surface texture, not a picture of a room.
Input image 1 is a MATERIAL AND COLOUR REFERENCE ONLY: preserve the established combination of dark glossy walnut and living grass, but improve the floor's natural realism. Do not reproduce its atlas layout.
Primary request: a portrait1024x2048 orthographic overhead photographic scan of a complete long rectangular floor area, approximately5metres wide by10metres long, seen exactly perpendicular. The image is ENTIRELY filled by the floor surface edge to edge. Absolutely NO vanishing point, horizon, perspective, walls or furniture; the game will apply the real perspective itself.
Layout: a single straight continuous narrow living grass strip down the exact middle, running the entire image height with parallel edges. Its width is29.24% of total image width, from35.38% to64.62% across, leaving dark walnut floor on both sides. A very narrow flush dark walnut retaining border runs along both edges of the grass, about0.7% image width each. The grass lies at almost the same level as the floor, with a fine recessed dark edge and tiny natural contact shadows. Keep this a maintained indoor botanical feature, not an abandoned or ruined building.
Wood: ACTUAL dark espresso/chocolate walnut floorboards, long narrow real boards running vertically, staggered discreet end joints, about18to22board widths across the whole image including grass-covered centre. Each visible board has its own subtly different brown grain, real pores and fine fibres, tiny natural knots sparingly, smooth dark shellac/satin-gloss polish with restrained natural reflected light. Soft variations in sheen and very slight ordinary foot wear, beautifully kept wood. Thin natural seams with real subtle depth, not thick black cartoon outlines. Do not repeat identical plank patterns or white gloss stripes. Dark brown maintained timber, no orange raw wood, no grey rot, no distress/grunge, no gouges.
Grass: a real dense strip of SHORT fine healthy living grass, believable small human-scale individual blades approximately2to4cm long, slender irregular curving leaves in varied deep forest/olive/natural green with restrained lighter tips, tiny blade-on-blade shadows and slight variations in density. The blades should read as a detailed botanical photograph; NOT an artificial turf carpet, not a repeated grid, not thick triangular spikes, not giant macro blades, not neon green. No flowers or broad leaves. There must be no visible seams or repeated checkerboard squares along the entire grass strip.
Lighting: neutral soft diffuse photographic illumination with restrained warm/cool reflection in wood, balanced exposure so the game's dim lighting can shade it later. No directional pools of bright light, no fake glossy white streaks, no baked window or chandelier reflection. Sharp natural detail at realistic material scale, physically believable relief and micro-shadows. Looks like real floor photography, NOT CGI or painting.
Opaque full-bleed surface, no transparency. No text, labels, numbers, diagrams, inset panels, other materials, people, props or watermark.

## Exact final grass edit prompt

Use case: precise-object-edit. Input image1 is the edit target: an orthographic overhead floor material for a game.
Keep the walnut boards, all wood grain, board joints, dark colour, borders, exact framing and floor layout IDENTICAL. Change ONLY the central grass surface.
Replace the tangled curly string-like vegetation with a real maintained short fine-bladed lawn photographed from directly overhead. Actual living cool-season fescue/ryegrass: fine flat tapered spear-shaped leaf blades, 2to4cm long, gently curved but predominantly straight, crisp subtle parallel leaf veins, irregular overlapping clusters, organic density variation and fine dark inter-blade shadows. A natural healthy deep forest green and muted olive green, lighter narrow tips, restrained saturation. Each blade has real width and a pointed tip; no looping stems. Keep the foliage small at the same human scale as the floorboards. Slightly flattened fine grass where walked, without bare dead patches. The whole central strip is photographed grass, not a printed or synthetic carpet.
No long hair-like curls, spirals, clover, intertwined wires, lace pattern, moss, neon green, thick triangles or repeated tile pattern. The target is genuine photographic grass with quiet natural detail. Retain the narrow existing grass footprint and dark wood borders unchanged. Camera remains straight orthographic top-down, flat texture, no perspective, no objects, no text, no watermarks.

