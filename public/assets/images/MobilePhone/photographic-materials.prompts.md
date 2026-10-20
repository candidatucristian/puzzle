# An Unexpected Call: photographic handset and desk

Mode: built-in image generation tool, precise-object-edit, transparent output.

Final assets:
- `public/assets/images/MobilePhone/handset-photographic-v1.png` — 857 × 1835, real alpha transparency.
- `public/assets/images/MobilePhone/walnut-desk-photographic-v1.png` — 1536 × 1024, existing photographic desk restored from the workspace.

Handset edit target: `.artifacts/phone-scene/image-version/handset.png`.

Desk source: `.artifacts/phone-scene/image-version/walnut-desk.png`. This existing image was copied unchanged; no new desk-generation prompt was used.

The handset is a separate transparent object. Each live key cap is extracted at runtime from its photographed position. Screen content, exact keypad numbers and letter groups, multi-tap input, caller clue, solve state, sounds, key presses, ringing vibration and coffee ripples remain native. The note keeps its original exact text. The desk photograph supplies the real mug, paper and pen. The Room III overview is unchanged.

No tests, builds, browser previews or new game captures were run. Visual acceptance is pending.

## Exact handset prompt

Use case: precise-object-edit. Asset: photographic transparent handset for an interactive mystery-game puzzle, NOT a complete scene.
Input image 1 is the EDIT TARGET and exact geometry guide. Preserve its complete old circa-2001 black mobile phone design, its silhouette and ALL screen/key positions. Improve it into convincingly real high-end macro product photography, a real used handset laid flat on a dark walnut desk, shot exactly perpendicular from above so the front face remains square to the image.
Materials: dark charcoal injection-moulded polymer, fine authentic microtexture, subtle rubbed smoother corners, tiny restrained scratches and skin polish near keys, real seams and edge thickness, very dark rubber antenna upper-right, actual metal speaker grille recess, rubber keys with real curved convex surfaces, narrow shadow gaps, lower microphone pinholes. Gentle warm lamplight upper-left, muted cool reflection right, black surfaces retain texture and depth. Real glass over a muted olive-green blank monochrome LCD, very faint window reflection and micro-scratches at the perimeter; keep the display clear for live text. Do not cover the display with glare. No flat painted shading, no fake plastic CGI, no cartoon and no grime overload.
Geometry invariants, measured in the 857 x 1835 target: preserve empty olive display rectangle centered (429,680), 450 wide x254 high. TWO soft rubber keys centered (260,923),(603,923),156x70. ONE oval horizontal navigation rocker centered (429,1047),350x138 with a circular central cap. EXACTLY12 numeral keys in 3 columns centered x252,430,607 and4rows centered y1191,1311,1430,1550, each about150x90. All keys must remain completely BLANK so the game overlays the exact live numbers, letters and labels. These are physically moulded real rubber keys, not flat empty holes. No printed digits, letters, names, logos, UI, caller number or screen icons. Do not move or resize the display, key centres or rocker. Preserve all button spacing.
Keep the phone's full outline visible in identical narrow portrait framing and padding. Entire background outside the handset must be genuinely transparent, retaining clean realistic alpha edges. No table, no props, no cast shadow beyond the cutout, no hands, no watermark. Same857:1835 aspect, upright vertical phone.

