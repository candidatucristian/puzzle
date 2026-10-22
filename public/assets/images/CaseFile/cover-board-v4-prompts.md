# Rigid leather dossier cover — v4

Generated with the built-in `imagegen` tool, with transparent background.

Saved asset: `public/assets/images/CaseFile/dossier-cover-board-v4.webp` (1210 × 1151, WebP, alpha).

Source: `C:/Users/crist/.codex/generated_images/01a15059-a34f-7fc0-aeaf-1d58ed11c75c/exec-d4e06519-e9d6-4869-a52f-35487198ef8e.png`.

Final prompt:

```text
Use case: product-mockup
Asset type: a photographic inside cover-board material for an interactive old detective dossier. One board only; the interface will join two boards with a separate spine.
Primary request: a direct top-down close photograph of the INSIDE of one rigid archival binder cover, leather wrapped over a firm 3 millimeter bookbinding board. Forty-year-old dark chocolate brown leather, fine close grain, rubbed satin patina, restrained scuffs on outer corners. The physical construction must clearly read as a bound book cover rather than a piece of hide: a narrow raised rolled leather rim, precisely folded leather turn-ins along all four sides, small genuine corner miters, a fine recessed seam just inside the outer edge, and visible dark layered board thickness along the bottom and right edges. The board is flat, square-cornered with only softly rounded worn corners, stiff and structurally straight. Dark brown inner lining, NOT a decorative central panel.
Composition: almost-square rectangle centered, viewed perfectly from overhead with parallel edges, showing the complete board perimeter and its subtle thickness; maximum object coverage with a very small transparent margin. No perspective taper, no diagonal rotation. Soft raking warm light from upper left, realistic close contact shadow only. Keep the center plain because paper will cover it.
Materials: finely grained dark oxblood-brown bookbinding leather, not coarse pebbled upholstery; slightly faded edges, subtle real stitching if present, no ornamental tooling.
Constraints: just ONE blank rigid cover board. No pages, paper, ring mechanism, hinge, central crease, straps, buckles, pockets, corners made of metal, handles, title, letters, labels, stamps, text, watermark, frame graphic or surrounding desk. Do not show a rectangle of loose flexible leather. Transparent outside the complete physical cover; no white fringe or halo.
```

Packaging: `.artifacts/casefile-redesign/prepare-cover-board-v4.mjs` trims only exterior transparent padding and converts to WebP at quality 92 / alpha quality 100.

The UI places this photographic board behind each paper leaf. Both boards and the paper share the same CSS grid and padding variables, so the leather hinge stays underneath the steel rail at every breakpoint. The covers carry no text. The existing paper, rail, perforations and front/back ring layering remain separate. The notebook keeps its existing paper and materials; both objects have large external close buttons.

