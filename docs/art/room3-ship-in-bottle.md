# Room 3 — ship in a bottle

- Asset: `public/assets/images/Room3/ship-in-bottle.png`
- Created with the built-in OpenAI image generation tool (imagegen skill) on 2026-10-11, without a reference image or CLI.
- Native size: 1961 × 802 pixels, PNG with alpha; translucent glass and transparent surroundings.
- The image contains the bottle, ship, cork, wax seal and two wooden supports. The table, lantern and other room furniture keep their existing rendering.
- `Room3Scene` loads the texture and fits it within the existing compass interaction area without stretching. The source texture remains cached through room visits and resizes.
- A separate Phaser image preserves source detail during the camera's approach. Amber/cool tints follow the ship puzzle's lighting state, and contact shadows place the supports on the table.
- Scene art and navigation live in `src/levels/room3/`. Generated image provenance and the original prompt are recorded here.

## Generation prompt

```text
Use case: photorealistic-natural / product asset. Generate ONE exceptionally realistic antique SHIP IN A BOTTLE as a transparent-background game prop for a dark captain's room in an old manor.

Subject: a large antique clear glass bottle lying HORIZONTALLY on two small hand-carved dark walnut cradle supports. Bottle's rounded base is on the LEFT and its narrow corked neck points RIGHT, with a worn cork and a modest dark red wax seal at the far right. Broad cylindrical body, smoothly rounded shoulders, thick rolled glass mouth, subtle pale sea-green glass thickness at the edges. Total object silhouette approximately 2.45 times wider than tall, including supports. Render the entire object and both supports, nothing cropped. Keep the body broad enough to see the whole model ship.

Inside: a meticulously crafted three-masted 18th century sailing ship with its bow pointing RIGHT, full set of warm aged ivory canvas sails with natural volume, fine seams, subtle cloth creases, realistic wooden yards, tiny dark rope rigging and shrouds, finely carved walnut hull with narrow brass trim, planked deck and railings, small bowsprit. Sails clearly separate, realistically billowing and varied, never repeated flat crescent shapes. The model sits in a low layer of dark blue-green sculpted resin sea with tiny irregular wavelets and restrained glints. It is a tangible finely made miniature entirely enclosed in the bottle, never a ship outside it.

Camera / composition: a mostly broadside view, camera about 12 degrees above the object, enough to see a little of the bottle's top and the ship's deck and support tops, with very slight view of its left rounded end. Bottle's long horizontal axis stays level in the image. High resolution, sharp material detail that survives zooming to examine it. The object fills most of a wide landscape canvas with a small transparent margin.

Light / integration: this prop will stand on a table in a dim manor. Soft warm amber illumination comes from a small lantern immediately to the LEFT of the bottle. Very faint cool moonlight from upper right. Subtle optical glass refraction and double edges, graceful narrow reflections, softly worn old glass and tiny imperfections. Enough light to appreciate the craftsmanship but restrained highlights, NO bright white studio softbox stripe, no blown-out speculars, no bright studio lighting, no glows outside the object. Real carved wood grain and contact between glass and walnut cradles. A very faint tight contact shadow only directly below the two supports.

Transparency is essential: genuine PNG alpha background. The empty space around the object is fully transparent, AND the clear air-filled regions of the bottle between the ship and the glass silhouette are TRANSLUCENT so the game's wall will show through them. Preserve the ship, glass edge reflections, cork, wax and wooden supports at their appropriate opacity. No opaque black or gray oval behind the ship, no matte rectangle, no checkerboard painted into the image, no white halo.

Constraints: ONE bottle with ONE ship, two simple matching walnut supports. No table, no pedestal platform connecting the supports, no lantern, no surroundings, no window, no background room, no labels, no text, no badges, no numbers, no people. Museum-quality realism and physical materials, not an illustration, not flat vector shapes, not a toy-like cartoon. Return the isolated finished object as a transparent PNG.
```
