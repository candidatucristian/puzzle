# Inspector Wren's desk: sources

The desk the game opens on out of the opening film
(`public/assets/images/Prologue/inspector-desk-cycles-v1.webp`). `wren_desk.py`
models and renders it in Blender Cycles. It replaced the generated
`inspector-desk-film-match-v2.webp` on 2026-11-12, which is archived in
`.artifacts/removed-assets/2026-11-12/`.

## Why it is placed by pixels

The film's last shot dissolves into this picture (`src/ui/introVideo.js`).
The game also keeps live things on it at the old picture's own pixels
(1672 × 941):
- the letter, the file and the plate (`prologue.js`, `place()` and `OUTLINES`);
- the panes the rain runs down (`windowRain.js`).

So every object is put where it lay in the old picture. A pixel and a height
(or a depth) give the point of the room that this camera sees there
(`on_z`, `on_y`). The render is 1.5 × that size (2508 × 1412), with the same
aspect, so the game's coordinates hold unchanged.

## Materials and models (CC0)

- Poly Haven textures:
  - `dark_wood`: the desk, the window, the sill
  - `rosewood_veneer1`: the nameplate
  - `plastered_wall_04`: the walls
  - `velour_velvet`: the curtains
  - `slate_driveway`: the wet road
  - `checkered_pavement_tiles`: the pavements
  - `old_sandstone_02`: the terrace across the road
  - `white_sandstone_bricks_03`: the lower houses
  - `roof_slates_02`: the roofs
- ambientCG textures:
  - `Leather037`: the desk's leather and the file, tinted burgundy
  - `Leather031`: the books, the box
  - `Paper001`, `Paper003`: the papers, the envelope
- Poly Haven model: `fancy_picture_frame_01`, the picture on the wall.

Everything else is modelled in the script:
- the lamp, the file and its stitching, the envelope and its seal;
- the plate, the pencil, the pen pot, the inkwell and the books;
- the window, the street lamp, the houses and the drops on the glass.

The photographs in the file are the game's own renders, printed in grey: the
manor, and Room I. The nameplate's lettering is Times New Roman, rendered
into the picture.

## Make it

```
blender -b -P art/blender/wren_desk.py                      # 2508 x 1412, 1024 samples
blender -b -P art/blender/wren_desk.py -- --preview         # half size, 48 samples, a few seconds
```

Then convert `.artifacts/wren-desk/wren-desk.png` to webp:

```
ffmpeg -i .artifacts/wren-desk/wren-desk.png -c:v libwebp -quality 88 public/assets/images/Prologue/inspector-desk-cycles-v1.webp
```
