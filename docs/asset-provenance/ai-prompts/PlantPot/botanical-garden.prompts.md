# The Moonlit Garden — outdoor botanical background

Generated with the built-in imagegen tool. Final workspace assets:

- `public/assets/images/PlantPot/botanical-garden.png`
- `public/assets/images/PlantPot/potting-bench-materials.png` — final isolated bench with transparent surroundings and leg gaps.

Only the PlantPot puzzle uses these assets. The pot, bucket, growing plant, watering logic and hurricane lantern retain their existing art and coordinates. The bench top is projected to the existing working plane; its photographed legs end on the outdoor terrace. Indoor curtains, sill and frame are no longer rendered. The moon, sky effects, fireflies and lantern light remain live.

## Botanical garden

Asset: `public/assets/images/PlantPot/botanical-garden.png`.

Use case: photorealistic-natural.
Asset type: wide cinematic background photograph for the outdoor puzzle "The Moonlit Garden" in a Victorian manor mystery game. Landscape 1536 by 1024 composition.
Primary request: a beautiful believable outdoor English botanical garden at night, viewed from a standing visitor at the edge of a small potting terrace, looking gently downward into the garden. Natural photography with physically convincing mature broad deciduous trees, not a painted illustration and not stylized CGI.
Composition: horizon of the garden in the upper fifth of the frame, a small open area of deep navy evening sky in the upper central third. Keep the sky at normalized x=0.72,y=0.082 clear and empty: a separate animated moon will be composited there. Do NOT paint a moon or bright stars.
Middle ground: a gently curving pale gravel and worn stone path leads into a quiet botanical collection, low brick-edged planting beds full of real herbaceous plants, richly layered ferns, soft small white and pale mauve flowers, some lavender and naturally varied leaves. Several large old oak and chestnut trees with broad irregular canopies and thick branching trunks frame the sides and create convincing scale and depth. Deep botanical greenery, no skinny upright cartoon trees, no cone topiary.
Foreground: a level weathered stone-and-fine-gravel potting terrace fills the lower third. Leave the central foreground from x=0.27 to x=0.70 and y=0.58 to the bottom OPEN and mostly quiet: an empty potting workbench and the actual game objects will be composited here later. Real stone texture and natural little tufts of moss along terrace edges, with a few low ferns toward the outside corners.
Far garden: one very small dark iron-and-glass Victorian glasshouse can be glimpsed deep in the right middle distance among trees, dim and unobtrusive, no bright interior. The scene is definitely OUTDOORS, no room, no window frame or curtains, no indoor view.
Lighting: natural silver-blue moonlight from the upper right, subdued night exposure while keeping real leaf and bark detail visible, gentle warm amber light spills onto the lower LEFT terrace from an off-camera existing lantern. Restrained night colors, deep cool greens, pale stone and small ivory blooms, delicate depth and a hint of ground moisture, no fantasy glow or oversaturated blue.
Constraints: NO BENCH, NO TABLE, NO POT, NO BUCKET, NO LANTERN, NO watering can, no characters, no people, no large statues, no fountains, no mountains, no hills as the focus, no labels, no signs, no written text, no numbers, no puzzle formulas, no watermark. Leave the foreground work area empty. The garden should feel cared for, botanical, real and peaceful without being overcrowded.

## Oak bench source

Asset: `public/assets/images/PlantPot/potting-bench-materials.png`.

Use case: product-mockup.
Asset type: one photorealistic EMPTY outdoor potting workbench as a transparent cutout for a botanical garden puzzle, landscape 1536 by 1024.
Primary request: a real beautifully aged oak garden workbench, plain and well-crafted, viewed precisely from the front and slightly above. Long horizontal rectangular top made from three broad thick oak planks laid across the width, genuine weathered open grain, subtle worn edges, tiny natural scratches and a few dark wood knots. Robust mortise-and-tenon joinery, a narrow front apron and four substantial square wooden legs, a discreet low cross rail/lower shelf. Empty open space underneath with true transparency between the legs and rail. Satin worn warm grey-brown oak, dark end grain and naturally uneven aged patina, not new furniture.
CRITICAL composition for game alignment: the bench fills the frame nearly edge-to-edge, with only 2 percent clear transparent margins. Both horizontal back and front edges of the tabletop are visible. Back tabletop edge at roughly 5 percent of image height, front tabletop edge at roughly 35 percent of image height, four legs extending to about 97 percent of image height. The FAR edge of the tabletop is about 92 percent as wide as the near front edge; the bench is symmetrical and viewed head-on, not angled to one side. Surface clearly seen from above, approximately a 27-degree downward view. Horizontal straight tabletop edges and upright vertical legs. No high back, no raised shelving, no surrounding walls.
Lighting: gentle warm amber light from an OFF-CAMERA lantern at the tabletop's left end, softly grazing the grain; quiet silver-blue moonlight from upper right on the far edge; dark but readable front apron and legs. Plausible outdoor night lighting, no exaggerated orange glow, no black silhouettes. The entire object should be sharply photographed with real physical depth.
Constraints: the tabletop must be COMPLETELY EMPTY. NO LANTERN, NO LAMP, NO POT, NO BUCKET, NO PLANT, NO tools, NO bowls, NO seeds or sacks, NO objects on top or below. No floor plane, no landscape, no room, no people, no writing, no watermark, no cast shadow beyond the object. True alpha transparency everywhere outside the bench silhouette, including between its legs. Only the wooden workbench. This image will sit behind the game's existing pot, bucket and lantern, which must remain unchanged.

## Final bench cutout edit

Asset: `public/assets/images/PlantPot/potting-bench-materials.png`.

Use case: background-extraction.
Edit target: the supplied empty oak workbench image.
Primary request: REMOVE ALL background from this image. Produce the SAME exact wooden workbench with genuine alpha transparency everywhere outside the solid WOOD silhouette. This includes every gap between all legs, beneath the apron, above and beneath the lower rail, and around the entire bench. The brown/orange/blue blurred background and the black floor shadow must be completely transparent, NOT replaced by another solid color, checkerboard, haze or backdrop.
Preserve the workbench itself pixel-faithfully in appearance: all four legs, three tabletop planks, front apron, joinery pegs and lower cross rail, all existing real oak grain, scratches, color and warm-left/cool-right lighting. Preserve exact canvas dimensions, bench size, camera angle, horizontal tabletop position and the same object placement. Do not move, crop, zoom, rotate or redesign anything.
Final deliverable: only the isolated empty workbench, on truly transparent alpha, with clean natural edges, no residual background halo and no cast floor shadow. No new objects. No pots, lamps, buckets, plants, floors, walls, people, text or watermark.

