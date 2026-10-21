# Old planked attic doors

Mode: built-in imagegen, precise-object-edit.

Final selected asset: `public/assets/images/Attic/aged-plank-door-v2.webp`.

Edit target: `public/assets/images/Attic/walnut-door-worn-v1.webp`.
Material reference: `public/assets/images/Attic/narrow-passage-wood-v3.webp`.

This replaces only the two Top Passage doors and their sampled timber surrounds. The rightmost board supplies plain wood for the surrounds, without repeating the iron hinges. The live iron handles and keyholes follow the existing projection and latch animation. Roman numerals, door positions, entry controls and other halls retain their existing behavior. The texture is converted to WebP without resizing; the renderer applies the existing shared night exposure.

## Final prompt

Use case: precise-object-edit.
Asset type: portrait photographic door-leaf texture for the two animated doors in a dark wooden manor attic.
Input image 1: EDIT TARGET, the current full door texture. Keep its full rectangular edge-to-edge silhouette and portrait aspect ratio, but replace its polished six-panel design.
Input image 2: MATERIAL AND ATMOSPHERE REFERENCE ONLY, the actual attic passage. Match its aged rough timbers, muted dark brown wood, dust, and understated old black iron. Do not reproduce the room.
Primary request: replace the elegant varnished door with an authentic very old attic storage door made from six broad vertical solid oak planks. A plain workmanlike door, hand-built many decades ago, with irregular narrow dark seams between the boards, natural knots, coarse raised wood fibres, softly chipped corners, a few fine age splits, faded dry brown surface and rubbed edges. The wood should look like it belongs to the reference attic's old timber walls. Rich brown with subdued grey age, naturally varied, matte with almost no varnish sheen. Structurally intact, no holes or missing boards.
Hardware: two slim antique hand-forged black iron strap hinges, each starting flush at the LEFT edge and extending to approximately 47% of door width, at 21% and 80% of height. Gently tapered rounded ends, real small hammered rivet heads, softly pitted charcoal metal with very subtle brown oxidation. Hinges lie flat against the boards. Keep the far-right quarter of the leaf pure exposed wood from top to bottom because the game draws the live handle separately.
Composition: a strict straight-on orthographic photograph of ONLY THE DOOR LEAF, no surrounding room or architrave. All four edges exactly touch the image bounds; no perspective or tilt, no margins, no shadows outside the door. Preserve the original 2:3 portrait ratio.
Lighting: diffuse neutral soft material-scan lighting, moderate usable exposure, detailed wood grain without bright glare. The game applies the attic's night lighting. Extremely photorealistic actual aged timber and iron; no illustration, no stylized render.
Constraints: no carved panels or raised mouldings, no polished walnut, no decorative trim, no handle, no lock plate, no keyhole, no lettering, no numbers, no plaque, no additional cross braces, no Z brace, no people, no UI, no border or background. Do not bake in dramatic room lighting. The result is a single rectangular texture of a believable old planked attic door.
