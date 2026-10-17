# Room VII — laboratory bench realism

Generated with the built-in imagegen tool. The existing Room VII projection, furniture positions, bottle order and colors, interaction zones, notebook, cabinet and washing station are preserved. The Chemistry puzzle scene and chemistry hallway do not consume these new assets.

Final workspace assets:

- `public/assets/images/Room7/bench-vessels.png`
- `public/assets/images/Room7/bench-apparatus.png`
- `public/assets/images/Room7/laboratory-materials.png`

The vessel and apparatus atlases have alpha transparency. Their frames are cropped and graded once and reused across room resizes. The lamp and burner photographs are unlit; flames and the existing ambient glow remain controlled by the room's puzzle state. The original wooden bench faces and slate working plane receive photographic materials. The room's existing wall, floor and beam geometry remains unchanged.

## Five bench vessels

Asset: `public/assets/images/Room7/bench-vessels.png`.

### Final prompt

Use case: product-mockup.
Asset type: one photographic laboratory-glassware SPRITE ATLAS for the existing Room VII chemistry laboratory of a Victorian manor puzzle game. Landscape 1536 by 1024. Genuine transparent background.
Primary request: EXACTLY FIVE separate real laboratory vessels, one in each of FIVE equal vertical columns. Column centers at 10%, 30%, 50%, 70%, 90% of total width. Each vessel isolated entirely within its own column, with ample clear transparent separation and no object crossing a column boundary. All bases on the same baseline at 95% of canvas height. Front view from slightly above, about 12 degrees downward. No tilt of the camera.
Vessels from LEFT TO RIGHT, preserve these identities and distinct colors:
1. A real narrow-neck Erlenmeyer conical flask, with a small dark cork, partially filled to about 55% of the useful lower body with muted pale yellow-green transparent liquid. Actual vessel dimensions approximately 22cm tall, 13cm wide.
2. A real round Florence flask with a long slender neck, round bulb and a stable flattened base, transparent very pale blue liquid filling about 40% of the bulb. About 25cm tall, 12cm wide.
3. A real short wide straight-sided glass reagent jar with a broad neck and dark cork stopper, dark nearly black charcoal liquid filling 45% of its height. About 18cm tall, 12cm wide.
4. A real tall slender glass graduated measuring cylinder with a stable small circular foot, 70% full of naturally translucent medium green liquid, NO fantasy glow. About 32cm tall, 7cm cylinder width, slightly wider base.
5. A real glass laboratory beaker with a small pouring lip, 62% full of clear golden-yellow liquid, not opaque paint. About 17cm tall, 11cm wide.
Scale: all five use the SAME photographic physical scale; tallest cylinder uses 85% of image height, other objects shorter according to the given heights. Do not make them equal height. Every object completely visible, no clipping of rims or feet.
Materials and detail: thin borosilicate glass with real thickness at rolled rims, clear transparency with subtle physical refraction, faint double edge reflections, elliptical openings and liquid menisci, fine white graduation ticks only, softly worn surfaces and clean glass, modest reflections. Real wet chemistry photography, not vector outlines, not colorful plastic, not crayons.
Light: neutral diffuse photographic light with a subtle warm amber reflection on left edges and cool blue fill on right edges, suitable for a dim old laboratory. Readable source colors that can be darkened in the game.
Constraints: NO table, no shelf, no room, no backdrop, no floor, no cast shadows outside the objects, no extra vessels, no plants, no labels, NO words, NO element names or symbols, NO readable numerals, no logos, no watermark. Background and all separation gaps must have genuine alpha transparency. The existing room and puzzle interactions must not be redesigned.

## Oil lamp, retort stand and burner assembly

Asset: `public/assets/images/Room7/bench-apparatus.png`.

### Final prompt

Use case: product-mockup.
Asset type: one photorealistic laboratory apparatus sprite atlas, landscape 1536 by 1024, genuine alpha transparency.
Layout: THREE separate full objects, each isolated completely within one equal vertical third of the canvas. Centers at x=16.67%,50%,83.33%. Wide clear transparent gaps between thirds. All bases aligned at 95% image height, every object fully visible. Front view from about 12 degrees above, no sideways perspective tilt.
LEFT THIRD: one antique brass-and-clear-glass OIL LAMP, unlit, with a small round brass foot, a short stem, a rounded clear amber glass oil reservoir, a brass wick mechanism and a slender clear glass chimney. Real polished and tarnished brass, fine scratches, thin chimney glass with actual thickness and rim. Overall proportions: 44cm tall, 14cm widest. Base y=0, reservoir center 13cm above base, wick at 25cm, chimney top 44cm. Absolutely no flame or glow in this photo; the game adds the animated flame later. Empty transparent chimney interior must remain visible.
MIDDLE THIRD: a laboratory RETORT STAND holding one real round glass flask. Heavy rectangular dark cast-iron base, a straight slim steel vertical support rod on the LEFT side rising 58cm above base, small adjustable brass-and-steel clamp at 35cm, one real round-bottom borosilicate flask held to its RIGHT. Flask bulb centered 26cm above the bench, diameter16cm, narrow open neck rising to42cm, a small amount of muted transparent sage-green liquid in the lower half. Rod and clamp physically grip the neck properly. Whole stand about28cm wide and58cm high. Believable heavy metal, screws and real transparent glass, not outlined symbols.
RIGHT THIRD: a real UNLIT BUNSEN BURNER under a small iron tripod and wire gauze carrying a real Erlenmeyer flask. Physical proportions: overall height41cm,width18cm. Burner round metal foot at y=0, brass-and-steel tube reaches14cm above it, no flame. Three iron tripod legs support a fine wire gauze platform at25cm above the bench. Conical borosilicate flask base rests on gauze at25cm, neck reaches41cm. Flask contains a small quantity of transparent muted red-orange liquid. Leave a clear open gap between nozzle14cm and gauze25cm for the game's animated blue flame. No burner hose extending outside its third.
Scale: use the same physical scale in each third, so retort stand is tallest, lamp slightly shorter and burner assembly shorter still. Do not stretch them to equal height.
Lighting: restrained neutral photographic lighting, very gentle warm reflections from the left and cool night fill from the right, readable fine material details suited to compositing into a dim historic school chemistry room. Authentic real glass, iron and brass; not plastic, CGI or illustration.
Constraints: EXACTLY these three apparatus assemblies. No background, room, table, floor, surroundings, labels, text, element symbols, numerals, formulas, logos, watermark, cast floor shadows, people or additional glassware. Genuine alpha transparency outside each object and through all gaps. Preserve empty space between objects for cropping.

## Room materials and magnifying glass

Asset: `public/assets/images/Room7/laboratory-materials.png`.

### Final prompt

Use case: photorealistic-natural.
Asset type: one MATERIAL ATLAS for the existing Victorian chemistry Room VII, landscape 1536 by 1024, exactly THREE columns and TWO rows of equal 512-square swatches, edge to edge, no gutters, no borders, no labels.
Primary request: real photographic surface scans and one top-down tabletop detail. Every cell perfectly flat, orthographic, sharp, evenly lit. Restrained old laboratory materials, tactile and cared for, not ruined or fantastical.
TOP LEFT: rich old medium-dark oak cabinet wood, fine grain running vertically, open pores, satin worn wax, tiny genuine scratches, no plank joints, no metal fittings, no furniture forms. Entire square wood only.
TOP MIDDLE: dark charcoal black laboratory slate worktop, fine grey mineral grain, restrained very faint natural veins and subtly worn surface, matte with slight soft polish, no cracks, no seams, no objects. Entire square stone only.
TOP RIGHT: old muted grey-sage lime plaster wall, fine chalky pores and gentle trowel texture, subtle natural mineral mottling, quiet medium grey-green color, no decorative pattern, no cracks or objects. Entire square plaster only.
BOTTOM LEFT: worn medium-dark warm grey limestone floor surface, fine mineral grain, tiny natural pits and faint pale veins, slightly uneven aged patina, no joints, no tile outlines, no cracks, no objects. Entire square stone only.
BOTTOM MIDDLE: deep desaturated forest green painted oak, fine VERTICAL wood grain through old satin green paint, tiny restrained rubbed highlights, no huge chips, no seams, no objects. Entire square wood surface only.
BOTTOM RIGHT: perfectly overhead photograph of a small REAL antique magnifying glass resting on soft dark green cotton cloth. The green cloth fills the whole square edge to edge, fine visible woven fibers, a small soft diagonal wrinkle. Magnifier has a naturally aged brass round rim, a real clear thick lens with one subtle reflected highlight, and an elegant dark walnut handle extending from the lens toward the lower right. Lens centered at 37% across and 45% down, diameter about 44% of the square, handle finishes near 85% across and 78% down. The green cloth remains visible through the glass with believable mild optical magnification. No writing, no symbols, no extra objects.
Constraints: NO ROOM or landscape, no perspective camera, no furniture silhouettes, no bottles, no sink, no cabinet as a whole, no labels, no text, no formulas, no periodic table, no logos, no watermark. These photographic textures will be applied to the room's existing unchanged geometry.

