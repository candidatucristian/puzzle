# MobilePhone — realistic desk and handset

- Created on 2026-10-11 using the built-in OpenAI image generation tool and the imagegen skill. No reference images or CLI.
- Desk: `public/assets/images/MobilePhone/walnut-desk.png` — 1536 × 1024, opaque PNG.
- Handset: `public/assets/images/MobilePhone/handset.png` — 857 × 1835, PNG with true alpha.
- Both originals are copied into the project; generated source files are preserved.
- `src/levels/mobilephone/art.js` records the source coordinates for the screen, key faces, coffee and paper note.
- The desk image scales proportionally and crops around the props. The note lettering and coffee ripples follow the same transform.
- The handset remains a separate sprite with a soft contact shadow. Its screen, status icons, keypad labels, press feedback and answer button remain live Phaser objects.
- Key faces are texture frames from the handset image, with matching hit areas. The existing multi-tap answer, sound, vibration, resize and reduced-motion behaviour are preserved.

## Desk prompt

```text
Create a photorealistic background plate for a playable mystery game set in an old manor, viewed from DIRECTLY ABOVE: a beautiful, aged dark walnut writing desk at night. Landscape canvas, approximately 3:2. Real photographic materials and fine detail, intimate cinematic still-life lighting. A soft warm desk lamp OUTSIDE the image illuminates the upper left, while faint cool ambient light reaches the right edge. Rich brown wood with continuous fine natural grain, polished worn areas, tiny scratches, restrained patina, a few subtle board joints, deep but readable shadows. The desk fills the entire frame; no room, walls, windows or horizon.

Composition is essential: keep the entire central vertical 42 percent of the canvas completely EMPTY wood, from top to bottom, to place a separately rendered interactive mobile phone there. NO PHONE in this background. At x=18 percent, y=35 percent, place one realistic small ivory glazed ceramic coffee cup, seen exactly from above, with handle pointing left, dark coffee and restrained lamp reflection, approximately 15 percent of image height in outer diameter. A subtle old coffee ring near it. On the right at x=82 percent, y=31 percent, place a single small rectangular blank cream paper note, approximately 17 percent of image width and 22 percent of image height, flat on the desk, its horizontal edge rotated just 5 degrees clockwise. Entirely blank paper, no writing, enough clean central space to add a four-line clue in software. Beautiful subtle paper fibre, slightly bent bottom corner, delicate cast shadow. At x=80 percent, y=73 percent, place one beautifully realistic dark fountain pen with a modest aged brass nib, lying diagonally from lower left to upper right, approximately 23 percent of image width long. Objects must be separated from central empty area. Tangible depth, convincing contact shadows cast slightly down and right. No huge objects, no other props, no text, no letters, no symbols, no watermarks, no graphic borders. The image must look like a real carefully lit photograph, never a pencil sketch or an illustration.
```

## Handset prompt

```text
Generate one ultra-realistic late-1990s candybar mobile phone, isolated on a genuinely transparent PNG background. It is a playable mystery-game prop. DIRECT OVERHEAD, perfectly straight front view with no rotation or perspective foreshortening: vertical long axis, top at image top. The entire phone is visible with a small transparent margin. The dark charcoal body is about 2.15 times taller than wide, plus a short rubber antenna projecting above its upper right corner. Photograph-quality physical materials: gently curved dark graphite ABS plastic shell, very fine moulded texture, subtle worn smooth edges and tiny realistic use marks, bevels catching soft warm light from upper LEFT, dim cool fill from right, recessed seams, softly reflective glass, physically credible soft contact shadow to lower right. No strong white studio reflections. Extremely fine detail, no drawing outlines, no stylized illustration.

IMPORTANT FRONT PANEL DESIGN, ALL LEGENDS WILL BE ADDED BY GAME CODE:
- near the top, a small recessed horizontal earpiece grille with tiny real perforations;
- in the upper third, a rectangular inset monochrome pale olive-green LCD screen under glass. Screen approximately 70 percent of the phone body's width and 21 percent of its height. Entire screen is BLANK: no numbers, no text, no icons. Clear, readable soft green surface, only very subtle glass reflection. Dark moulded bezel and thin polished rim.
- under the screen, two small horizontal rounded oblong blank dark-gray rubber soft keys, one at left, one at right;
- directly below those two keys, ONE centrally positioned horizontal oval dark navigation rocker with a circular recessed centre. Keep its centre blank for a software label;
- lower half: exactly TWELVE separate tactile rounded rectangular rubber keys in a clean symmetric grid of THREE columns by FOUR rows. ALL twelve keys completely BLANK with NO text or symbols. Consistent spacing. Key faces slightly convex, graphite-gray, real tiny rubber texture, softly lit bevel on upper edge and dark contact recess below. Each key approximately one quarter of the phone width, significantly wider than tall, generous empty face for a number and a small alphabet legend.
- bottom chin: tiny microphone holes.
Make the screen and all key faces square to camera and geometrically aligned so crisp UI can be overlaid.
No branding, no words, no digits, no letters, no logo, no handwritten marks, no extra controls. No table, hands, accessories, background, scenery or ground plane. A REAL physical vintage handset with exceptional photographic realism. True alpha transparency around the complete phone and antenna, not a painted checkerboard.
```
