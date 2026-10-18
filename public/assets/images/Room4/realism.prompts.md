# Room IV: photographic counting room

Generated with the built-in imagegen tool.

Saved runtime assets:
- `public/assets/images/Room4/surface-atlas.png`: photographic lime plaster, limestone, burgundy wool, walnut, cork, paper, structural oak, leaded night glass and gilding. Actual atlas size is 1254x1254; cells are derived from its actual dimensions.
- `public/assets/images/Room4/furniture-fronts.png`: real writing desk front, ledger bookcase front and a single brass-handled drawer front. The actual empty column gaps are at 48.2% and 71% of width; the broad desk is kept complete.
- `public/assets/images/Room4/room-props.png`: real cast-iron stove, green-glass banker lamp, chair from behind and wicker log basket. Per-column row gaps preserve the chair crest and lamp base.

Integration:
- The existing `layoutRoom4` is unchanged: room projection, walls, floor, ceiling beams, high rectangular leaded window, desk, cabinet, shelf, chair, stove and painting occupy their original geometry and anchors.
- Photographic timber follows the original projected furniture sides and tops; photographic desk, bookshelves and drawer faces supply physical details. The same drawer-front photo follows the existing opening frames and final open state.
- The existing six card numbers, street picture and Code 39 crossing are retained. Real paper/cork/gilding supplies their materials; the puzzle views themselves are unchanged.
- The stove's original pipe and hearth location are retained. The photographic stove includes the firebox; its existing live ember glow remains scene-controlled. The desk lamp photo is unlit, with its puzzle-controlled glow kept separate. The candle, fire tools, picture lights, dust, gold chest and key retain their original behavior and positions.
- Photographic plaster uses the room-local cleanPlaster flag to omit old procedural crack/stain overlays. Other rooms retain their current plaster rendering.
- Fine grain is reduced to preserve the new material detail. Existing puzzle-light and night shading logic remains active, with matching shading on animated drawer frames.

No tests, build, browser, game preview or new game screenshots were run. Only source and generated artwork were inspected, per the user's request to approve the visual feature before testing.

## surfaces: final prompt

Use case: product-mockup.
Asset type: a PHOTOGRAPHIC MATERIAL SCAN ATLAS for the existing Room IV counting room of a Victorian manor. Square image, precisely THREE columns by THREE rows, nine equal square swatches, edge-to-edge without dividers, labels or gutters.
ROW 1 LEFT: real old warm-grey lime plaster with fine surface granules, subtle natural trowel marks, clean gently aged surface, no mold, no rot, no dominating cracks or stains.
ROW 1 CENTER: one actual cool grey limestone flagstone surface, very fine mineral grains, subtle worn smooth high spots and slight natural tonal variation, NO joints or grid, no room view.
ROW 1 RIGHT: real deep muted burgundy wool rug surface with fine dense woven pile and gentle use, plain field only, no ornate motifs, no border or fringe.
ROW 2 LEFT: real rich dark-brown old walnut furniture timber, fine VERTICAL grain, satin polished finish, genuine subtle pores and small specular reflections, well-maintained old wood, no distressed paint.
ROW 2 CENTER: real natural fine-grained warm tan cork bulletin-board material, tiny cork granules, natural variation, no pin holes dominating, no frame.
ROW 2 RIGHT: real thick ivory cotton index-card paper, crisp fine visible paper fibers, clean gently used paper, no lines, no writing, no objects.
ROW 3 LEFT: real dark oak structural beam timber surface with fine LONGITUDINAL VERTICAL grain, deep brown, natural small age fissures, healthy solid oak, no broken or rotten wood, no joints.
ROW 3 CENTER: a real Victorian leaded glass window pane photographed straight-on at night, fine diagonal dark lead cames forming small diamond glass pieces, exactly two stronger horizontal glazing bars at one third and two thirds height. Genuine wavy antique glass with faint rain droplets and cool moonlit blue night beyond, a restrained small moon behind the glass upper right. Glass pane fills the square, no outer frame, no room.
ROW 3 RIGHT: actual subdued antique gold-leaf picture-frame wood surface, fine genuine gilding and subtle worn high spots, real material not a metallic gradient, no complete frame, no shapes or border.
All nine swatches are true high-resolution material macrophotographs with neutral low-contrast lighting, not an illustrated texture pack. No text, no icons, no painterly strokes, no CGI, no art, no watermark.

## furniture: final prompt

Use case: product-mockup.
Asset type: photographic furniture-component CUTOUT ATLAS, landscape 1536x1024, THREE separate equal-width columns. True transparent alpha outside each object. No subject crosses a column boundary; keep at least 30px transparent margin to every column edge. Every object entirely visible.
LEFT COLUMN: authentic old dark-walnut twin-pedestal writing desk, broad horizontal desk about 145cm wide and 76cm high, two sets of three drawers at left and right, a clear central kneehole, narrow central drawer below tabletop, small real round brass drawer knobs, fine satin-polished dark walnut grain. Perfect orthographic FRONT ELEVATION ONLY, no visible tabletop surface or end panels, no camera tilt, exact bilateral symmetry of the structure but natural wood grain. Nothing on desk, no chair.
CENTER COLUMN: authentic narrow tall dark-walnut open bookcase, about 72cm wide and 182cm tall, four shelf openings full of actual antique cloth and leather-bound ledgers, muted brown/olive/charcoal/ochre spines with tiny worn blank paper labels, real uneven page edges. Slim substantial dark-walnut frame and plinth, real shadows behind books, natural uneven book heights and spacing, believable recessed shelves. Perfect FRONT ELEVATION ONLY, NO visible top or end panel, no tilt. No readable titles or text, no extra objects.
RIGHT COLUMN: ONE actual long rectangular dark-walnut DRAWER FRONT, about 70cm wide and 24cm high, perfect front elevation, fine raised inset molding near all four edges, genuine wood relief and satin grain, TWO small round antique brass knobs at 24 percent and 76 percent of width, central height, simple solid silhouette. Just one drawer front component, no cabinet, no legs, no surrounding room.
Soft warm architectural photography light from upper left with mild cool fill from right, genuine solid physical wood and metal, clear depth and details, natural restrained dark colors, no illustration, no plastic, no digital painting. Fully TRANSPARENT alpha background and holes. No colored or blurred photographic background, no gradient, no green screen, no color spill, no backdrop shadows, no people, no decor, no text or watermark.

## props: final prompt

Use case: product-mockup.
Asset type: actual photographic room-prop CUTOUT ATLAS, landscape 1536x1024, exactly TWO columns by TWO rows. Four separate objects, each entirely within its own equal cell with generous transparent margins, no overlap.
TOP LEFT: one genuine small Victorian black cast-iron potbelly stove with four short splayed feet, a short cylindrical flue COLLAR only on top, NO long chimney pipe. Stove has a small arched recessed front firebox with a closed thin iron grate and real glowing embers and a small subdued wood fire inside, physical iron casting texture, tiny hardware, warm light only inside. View front-on from slightly above, subtle visible right side, compact body about 70cm wide by 90cm high, natural deep dimensional shadows. No stone slab or background floor.
TOP RIGHT: one real antique banker's desk lamp, dark rich green GLASS shade on a genuine aged brass curved stem and an oval brass base, complete base and shade visible. Shade UNLIT, real glass reflections only, no emitted glow or halo. Camera near front, slightly above, centered natural proportions.
BOTTOM LEFT: one genuine old dark-walnut wooden chair viewed FROM THE BACK facing away from us toward a desk: tall gently curved crest rail, a central vase-shaped wooden splat and two tall back posts, real dark brown leather seat slightly visible beyond the back frame, four legs and lower stretchers, subtle angle that shows seat depth. Complete whole chair with all feet. About 44cm wide and 104cm high, satin polished timber, no upholstery on the back, no desk, no objects.
BOTTOM RIGHT: one compact actual wicker basket with a small natural handle and a few short cut firewood logs inside, visible true wood end-grain and bark, plain natural wicker, no extra tools, no floor.
Photorealistic DSLR product photographs with soft dim warm front-left lighting and restrained cool upper-right fill, detailed physically plausible surfaces, believable contact depth inside each object, no cartoon, no illustration, no sketch, no CGI plastic.
Fully transparent alpha background outside each object and in all chair gaps. No image backdrop, no gradient, no blurred garden/room, no green screen, no neon cutout outlines, no printed checkerboard, no cast shadows on background, no people, no writing or watermark.
