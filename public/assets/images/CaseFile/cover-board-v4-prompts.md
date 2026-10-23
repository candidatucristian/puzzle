# Rigid leather dossier cover — v4

This material was created before the user's instruction to use Blender and stop AI image generation. It is a temporary cover material pending the Blender render. Do not use image generation for future visual work.

Current asset: `public/assets/images/CaseFile/dossier-cover-board-v4.webp` (1198 × 1150, WebP with alpha).

Original source: `C:/Users/crist/.codex/generated_images/01a15059-a34f-7fc0-aeaf-1d58ed11c75c/exec-d4e06519-e9d6-4869-a52f-35487198ef8e.png`.
Refined source: `C:/Users/crist/.codex/generated_images/01a15059-a34f-7fc0-aeaf-1d58ed11c75c/exec-ba959af9-b0ef-455b-8555-f521b1347b6b.png`.
Built-in imagegen was used for both operations before the workflow change.

Original prompt:

```text
Use case: product-mockup
Asset type: a photographic inside cover-board material for an interactive old detective dossier. One board only; the interface will join two boards with a separate spine.
Primary request: a direct top-down close photograph of the INSIDE of one rigid archival binder cover, leather wrapped over a firm 3 millimeter bookbinding board. Forty-year-old dark chocolate brown leather, fine close grain, rubbed satin patina, restrained scuffs on outer corners. The physical construction must clearly read as a bound book cover rather than a piece of hide: a narrow raised rolled leather rim, precisely folded leather turn-ins along all four sides, small genuine corner miters, a fine recessed seam just inside the outer edge, and visible dark layered board thickness along the bottom and right edges. The board is flat, square-cornered with only softly rounded worn corners, stiff and structurally straight. Dark brown inner lining, NOT a decorative central panel.
Composition: almost-square rectangle centered, viewed perfectly from overhead with parallel edges, showing the complete board perimeter and its subtle thickness; maximum object coverage with a very small transparent margin. No perspective taper, no diagonal rotation. Soft raking warm light from upper left, realistic close contact shadow only. Keep the center plain because paper will cover it.
Materials: finely grained dark oxblood-brown bookbinding leather, not coarse pebbled upholstery; slightly faded edges, subtle real stitching if present, no ornamental tooling.
Constraints: just ONE blank rigid cover board. No pages, paper, ring mechanism, hinge, central crease, straps, buckles, pockets, corners made of metal, handles, title, letters, labels, stamps, text, watermark, frame graphic or surrounding desk. Do not show a rectangle of loose flexible leather. Transparent outside the complete physical cover; no white fringe or halo.
```

Refinement prompt:

```text
Use case: precise-object-edit.
The reference is the edit target: the complete single leather binder cover board. Preserve its dark brown finely grained aged leather, flat square outline, top-down camera, scuffed corners and realistic lighting.
Correct its construction: REMOVE the large rounded tubular/padded ridge running around the entire perimeter. That ridge makes it look like a picture frame. Replace it with the authentic FLAT leather turn-in of a rigid bookbinding cover: a very thin compressed folded leather edge, approximately 3 millimeters wide relative to a 30-centimeter-wide board. The cover surface should stay FLAT all the way to that narrow outer edge, with tiny natural corner miters. Show only the small 3-millimeter dark board cross-section along the extreme bottom and right side to establish thickness. Any seam should be a very fine, low-contrast recessed line very near the outer perimeter, NOT an inner rectangle or ornamental border.
Keep the complete object isolated on genuine alpha transparency. No pages, text, paper, hardware, central hinge, graphics, straps, large stitching or extra objects. No raised rectangular rim, no cushion, no frame, no wide bevel. A real flat rigid book cover, not loose hide and not a picture frame.
```

Packaging: `.artifacts/casefile-redesign/prepare-cover-board-v4.mjs` trims exterior transparent padding and converts to WebP at quality 92 / alpha quality 100.

The UI places a rigid cover panel behind each paper leaf, using the same CSS grid as the paper and center rail. A separate hinge connects the boards. The steel rings keep their front/back layers and paper perforations. All text remains on paper. Large external close buttons have a separate space above the dossier and notebook.

Next renderer: Blender, with procedural materials, no generated texture inputs. The reproducible source will be kept under `art/blender`.

