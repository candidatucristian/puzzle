# MobilePhone — procedural scene

The entire scene is drawn in JavaScript with Canvas 2D and Phaser. It does not load
photographs, image files, embedded raster data, or externally generated textures.

- `materials.js`: deterministic random fields, gradients, surface pores and cached Canvas drawing.
- `proceduralPhone.js`: curved handset silhouette, rubber antenna, graphite surface shading
  derived from bevel normals, recessed speaker and LCD glass, independent rubber keycaps,
  microphone holes, contact shadow and screen light.
- `proceduralDesk.js`: walnut grain from a warped noise field, joins and wear, glazed ceramic
  cup with coffee and reflections, coffee stains, paper fibres and curled corner, brass fountain pen.
- `art.js`: shared geometry and texture preparation. These texture keys identify canvases
  drawn at runtime; they are not file paths.
- `DeskView.js`: responsive arrangement. Each prop scales relative to the handset, so short
  viewports retain natural proportions. The note and coffee ripples share the prop transforms.
- `MobilePhoneScene.js`: live LCD content, keypad hit areas, presses, calling state and sound.

The expensive material drawing runs once per game instance. Phaser reuses the resulting
Canvas textures across resizes and scene visits. Each button moves independently in its
recess; text and input regions follow the same transform.

There are no image requests in the MobilePhone preload method. It loads only the existing
vibration and keypad audio. The previous generated PNGs are excluded from public assets.
