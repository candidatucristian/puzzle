# Decoder's Book · manor edition

Solving `plantpot` awards `fibonacci` once through `LevelManager.onSolved`.
The collection is independent of case progress and survives replays, reloads
and new cases. Version 2 of `decoderBook:achievements` stores the original ISO
unlock timestamp, recipient name and stable certificate reference. Loading
version 1 preserves its timestamp. Changing the name never changes the date.

## Delivery and collection

The new reward is a small sealed envelope that flies to the header's
Achievements button after room travel and other letter presentations finish.
It does not open a modal, cover the scene or suspend puzzle controls.
`delivery.js` uses one RAF clock for its curved path, shrinking and continuous
3D rotations. `flightStage3d.js` plays the real Blender envelope on a transparent
canvas. A Cycles cutout supports systems where WebGL is unavailable.

The unread badge appears on arrival and is cleared by opening the collection.
Read IDs persist separately under `decoderBook:seen`. The manual replay control
repeats the flight and unread badge without re-awarding or changing the date.
Reduced motion skips the flight and announces the new item directly. Hiding
the page finishes the delivery; cancellation and disposal release its renderer,
textures, animation frame and DOM elements.

The reader has a left-hand index, diploma/field-notes tabs, page navigation
and a replay control. It follows `i18n.language`; there is no second language
selector or independent book language preference. Its backdrop is plain dark,
without an illuminated desk image. Physical cover, binding, paper and wax are
real Cycles renders lit from warm and cool angles. The earlier v2 opening
atlases and full-screen reward are no longer used by the UI.

Names are editable and saved locally. `AchievementStore` accepts an optional
`getPlayerName` callback for a future platform host; no Steam identity is
invented. Names are normalised, limited to 64 characters and escaped in HTML.
Date, time and timezone use the game's language.

## Blender assets

`art/blender/decoder_manor.py` reuses the folio geometry from `decoder_reward.py`:
scanned dark leather, individual saddle stitches, worn tooling, linen lining,
layered cotton leaves, ribbon and a wax key seal. It removes the walnut desktop
and renders transparent cutouts in Cycles at 256 samples. A shielded warm area
light rakes across the surfaces; one weak cool reflection defines the opposite
edge. Existing CC0 scans and the repository's procedural paper/material kit
supply the materials. There is no AI imagery.

The flight envelope is isolated in Blender from the hall letter's authored
`letter-animation-v2.glb`, with the flap and wax in their sealed pose. Its
geometry and Cycles-baked colour/normal surfaces retain real folds and depth.
The corresponding still is also rendered in Cycles. Live lighting is dim and
warm; clearcoat is disabled and paper/wax roughness has a realistic floor.

`decoder_manor_details.py` renders the bound diploma at 3500 × 2600 and exports
its paper corners through the actual camera. `manorArt.json` aligns live ink
with that sheet on resize. The script also reduces flight texture maps to
512 pixels, appropriate for the small on-screen object, before exporting its
dedicated glTF. Source renders and packed scenes are in
`.artifacts/decoder-manor-v3`.

`art/decoders-book/publishManor.mjs` publishes WebP cutouts and the native model
under `public/assets/images/DecoderBook/v3`, plus the camera metadata in the UI.
It only processes assets with Sharp and filesystem operations. It has no
browser automation, tests, linter or application build.

## Seal recording and other sound

`public/assets/sounds/sigilbreak.mp3` is the user-supplied hall-envelope fracture.
`paperSounds.prepareSealBreak()` fetches and decodes it before the opening
motion. It finds the first audible samples and skips only the leading silence
and encoder padding. `letterArrival.js` starts the decoded Web Audio buffer
when its shared animation clock crosses `letterAnimation.cues.crack`, including
a direct jump to the open pose. This does not rely on a separate timeout or an
HTMLAudioElement starting to stream. The sound follows SFX volume, master
volume and mute; close/disposal stops it. The synthetic crack remains a fallback.

The delivery uses the existing quiet paper whoosh and filing slide. The filing
slide begins 360 ms before the contact/badge moment. Reader opening and page
navigation use the paper effects. No extra recording is required for this
version.

## Documents

The personalised diploma PDF is created locally only on Save diploma: a
3508 × 2480 raster page in an A4 landscape PDF, using neutral Cycles print
stock, recipient, original unlock time and certificate reference. Its letters
are rasterised at print resolution. The dark reader uses its separately lit,
physically bound diploma render instead.

The separate four-page field-notes PDFs retain selectable text, embedded fonts
and vector diagrams. They explain the observed sequence, cumulative total,
solution, recurrence, history, original square diagram and exercises. Their
sources are linked in the documents. `copy.js`, `render.js` and `document.css`
remain shared sources. The offline `publish.mjs` regenerates those PDFs only
when explicitly requested; it is not part of this asset pipeline or startup.

No automated tests, lint, browser captures or production builds were run for
this redesign. Blender rendering and image/model export are asset production.
