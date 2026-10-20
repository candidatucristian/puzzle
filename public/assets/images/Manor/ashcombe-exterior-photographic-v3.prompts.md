# Ashcombe exterior: optional balcony and telescope (V3)

Mode: built-in image generation tool, precise-object-edit.

Edit target: `public/assets/images/Manor/ashcombe-exterior-photographic-v2.png`.

Saved asset: `public/assets/images/Manor/ashcombe-exterior-photographic-v3.png`.

The small first-floor balcony and telescope occupy the left illuminated window. The central entrance, existing framing, gates, night mood and live rain/mist code are retained.

## Revert

The accepted V2 image is preserved unchanged. To restore it, change only the image filename in `src/ui/manorExterior.js` from `ashcombe-exterior-photographic-v3.png` to `ashcombe-exterior-photographic-v2.png`.

No tests, builds or browser previews were run; visual acceptance is pending.

## Exact prompt

Use case: precise-object-edit.
Asset type: photorealistic exterior background for a mystery game, experimental balcony variant.
Input image 1 is the EDIT TARGET. Make a very localized architectural edit; preserve the accepted photograph everywhere else.
Primary request: At the warm lit FIRST FLOOR window on the LEFT side of the manor, add a small believable projecting balcony with one real telescope standing on it. This is the narrow arched illuminated window centered at approximately (662, 455) in the 1740 x 904 input, about 38% across and 50% down the image, just to the right of the LEFT gate pillar. It is above the ground floor and BELOW the small lit attic window at (749,357). Edit that lower, leftmost warm upper-floor window ONLY.
Balcony: modest shallow stone platform, dark slender wrought-iron railing and two plausible carved stone support corbels, physically attached at the window sill around y505. Approximately x605 to720 and y470 to535 in the input. Retain the arched opening, make it a narrow glazed balcony door if necessary. The small balcony must feel integrated into the existing Victorian stone architecture with correct perspective, weight, contact shadows and damp materials.
Telescope: one realistic antique brass and dark metal refractor on a three-legged wooden tripod, resting on the balcony floor, aimed outward and slightly upward toward the left night sky. A clear but modestly sized silhouette with visible optical tube and tripod, warm reflected interior light on brass, cool night rim light. It belongs at human scale, approximately 45 to60 pixels tall in this wide photograph. Its body appears above the railing; its feet stand securely on the balcony. Keep it readable without enlarging it into a giant object. No people.
Style: real cinematic architectural night photography with convincing volume, exact scene lighting and physical textures; no illustration.
Invariants: same exact full image framing, image aspect and dimensions, camera position and elevation, same smaller gates and pillars, same main central balcony, same central front door at (948,650), same manor architecture, stone color, roof, windows elsewhere, trees, wet driveway, mist, dark blue sky and warm practical lights. Preserve all unchanged regions as closely as possible. Do not brighten the image or redesign the facade. No other new props, no text, no watermark.

