# ROTOR — square walnut mount and seated photographic books

Mode: built-in image_gen tool.

Final assets:
- public/assets/images/Cryptex/rotor-square-photographic-v2.png
- public/assets/images/Cryptex/books-photographic-v2.png

Room reference: public/assets/images/Room1/room1-photographic-v1.png
Geometry guides:
- .artifacts/rotor-square-art/square-rotor-layout.png
- .artifacts/rotor-square-art/books-layout.png

The rotating disk, both 26-letter alphabets, candle gate, letter contents, input and snap behavior remain native. The square plaque has a physical height field and corner fasteners. The books use the desk camera's projected physical bounds, a contact shadow and the same ambient/candle light calculation as the room.

## Square instrument — generation

```text
Use case: sketch-to-render.
Asset type: exact front-on square photographic UV image of an authentic antique brass cipher rotor on a SQUARE polished dark walnut wall plaque.
Input1 is a strict GEOMETRY guide. Input2 Room I is the visual identity reference: recreate a close-up of THAT specific small brass wheel on its square walnut plaque above the desk. Input3 is the previous round instrument, a MATERIAL DETAIL reference only. Replace the round wood mount with the square mount from Room I, preserve the good real brass texture.
STRICT guide geometry normalized to 1024 square: face center512,512. Square walnut plaque extendsx32.5..991.5,y32.5..991.5 with nearly square corners and a subtle real machined bevel. Thin dark wood side thickness visible along lower/right edges, genuine fine walnut pores and subdued polished rich brown finish, no ornate trim or round wood rim. FOUR small domed slotted brass screws at(127,127),(897,127),(127,897),(897,897), like Room I.
Brass circular instrument on wood: outer radius367.5 pixels. Stationary broad annular brass ring goes fromradius269.5 to367.5. Very fine concentric seams atradii280 and339.5. Dark recessed narrow gap betweenradius260.75 and269.5. Rotating inner brass disk radius260.75. Fine concentric seams atradius197.75 and243.25, real domed brass axle screw/hub radius56 at exact center. Tiny fixed tapered index at twelve o'clock fromy113..188 as guide, but natural actual solid metal not giant ornament.
The round metal occupies about77% of the square walnut board's width, exactly as in Room I. Board square is crucial and must remain clearly visible on all sides and in all four corners.
Style: premium straight-on macro photograph of a genuine working Victorian scientific instrument, rich quiet dark walnut and mellow golden brass, fine genuine lathe marks, minute scratches, restrained age and patina, tangible layered real bevels and joinery, not painting, cartoon, plastic, MS Paint or flat gradients.
Lighting: broad neutral diffuse near-camera light, even legible exposure, no dramatic baked candle highlight or harsh deep directional shadows; the game relights all surfaces from animated candles.
CRITICAL: absolutely NO letters, alphabets, numbers, tick marks, radial dividers, readable symbols or text. Both letter bands blank. The game adds exactly26 divisions and exact interactive letters. Only guide's circular seams. No extra decorative gears or stars. Camera perfectly orthographic/front-on, no skew or perspective ellipse, keep all specified dimensions exact. Tiny surrounding border is subdued dark sage plaster, no furniture or room scene. Square format.
```

## Square instrument — final centering edit

```text
Use case: precise-object-edit.
Input1 is the EDIT TARGET, a square photograph of a brass cipher instrument on square walnut mount. Input2 is the strict correct geometry guide.
Change ONLY ONE geometrical error in input1: the complete CIRCULAR BRASS MECHANISM (all its circular rings, center axle, gap and top index pointer together) currently sits too high. Its axle is approximately at(x627,y581) in the1254x1254 photo. Translate the COMPLETE circular assembly vertically DOWN46 pixels, so the axle becomes EXACTLY at(x627,y627), the exact center of the square image and of the square walnut board. KEEP its diameter and all ring radii identical. DO NOT scale, enlarge, shrink or skew any brass circle. It must be a round circle with the center precisely50% width and50% height, matching the guide.
The square walnut mount and all FOUR corner screw fasteners must remain in their existing positions, unchanged. Preserve the exact real material textures, gold/brass color, lathe marks, tiny wear, lighting and front-on camera. Fill the small vacated top area with matching actual walnut grain. No other compositional change.
Keep both alphabet rings BLANK: no text, alphabet, numbers, ticks or radial dividers. No new screws, no extra hardware. This is only a46px downward translation of the brass circle and its index, leaving the square mount untouched.
```

## Books — generation

```text
Use case: sketch-to-render.
Asset type: single photographic true RGBA transparent cutout of two genuine closed botanical books stacked flat, for an existing desk scene.
Input1 is the STRICT silhouette and perspective guide. Match its almost horizontal front edges, shallow stack, book dimensions, small top-book offset, and LOW oblique tabletop viewing angle. It is a diagram of two books already projected with the game's actual desk camera. Transform ONLY those book volumes into actual physical photographed books, no background or extra objects.
Bottom book: a moderately used but cared-for dark brown leather scientific volume, about20x14cm, 1.8cm thick, real calfskin pores, genuine stitched spine at the left, subtly rounded cover corners, about240 uneven cream pages with real individual page edges. Top book: a slightly smaller dark forest green cloth botanical notebook about18.5x12.8cm,1.3cm thick, slightly offset left/back and angled just a few degrees, actual fine linen weave, modest worn corners, sewn binding and lightly yellowed paper. Empty covers and spines, no visible lettering, labels, emblems, decorative ribbons or objects.
Keep the two books THIN and flat on a horizontal desk plane, not thick square blocks or giant diagonal towers. The lowest cover has a clear real bottom contact edge so it can sit exactly on the game's desk. Look down about26 degrees toward the tabletop, mostly front view, only modest top-cover visibility, no dramatic45-degree diagonal product shot. Preserve the guide's silhouette and perspective as precisely as possible.
Style: lifelike product photograph, convincing dimensional covers and paper blocks, clean natural material detail, no exaggerated rips or rot, no illustration, 3D-render plastic, painted surfaces or hard vector edges.
Lighting: soft neutral even photographic illumination from near upper right, subdued shadows within the real bindings; enough material detail for the game's own warm candle light to relight it. No strong baked orange rim or dramatic reflected glare. Actual alpha transparency around the complete stack, no tabletop, floor, cast shadow outside object, backdrop, props, hands, checkerboard or glow. At least10% transparent safe margins around all sides.
```

