# Candlelight and Brass — native Blender/Cycles level

`candlelight_brass.py` models the square walnut-mounted cipher wheel,
turned and scratched brass, its central spindle and radial divisions,
52 physical Roman letters, three hollow beeswax candles, separate wax
runs, melt pools, braided wicks, turned holders, a folded rag-paper
envelope and burgundy wax seal. All geometry and text is authored in
Blender. No generated bitmap art is used.

The original puzzle remains intact: three candles are extinguished
separately; after the last, the two luminous alphabets become readable and
the inner disc turns in 26 steps. The sealed letter reads `WKH DQVZHU` /
`LV URWRU`; a Caesar shift of three yields the original answer, ROTOR.
The builder reads both alphabets and cipher from `cryptex/puzzle.js`.

## Lighting and runtime

Eight Cycles photographs cover all combinations of the three actual
candle lights. The runtime mixes these by the individual flames' current
strengths. This preserves each candle's own illumination and shadows,
including while it is being extinguished, rather than dimming a painted
room uniformly. A very low, cool night fill keeps the apparatus legible.

In darkness, a native transparent photograph of the circular inner rotor
turns over the unchanged outer ring. All 26 letters, machining, patina and
inlay are part of its Blender render. The disc is photographed face-on so
its circular projection and turning pivot agree. It is locked while the
candles burn. The unfolded letter has its own physically lit photograph,
with curved paper, folds and actual ink geometry. Sixteen flame meshes
are rendered in one transparent atlas and animated over the real wicks.
The existing candle, ember and smoke lifecycle is retained.

The runtime uses only these new renders. The legacy photographic material
atlas and procedural study painter are no longer imported by the level.
All projected candle, rotor and envelope coordinates come from the same
Blender camera. The picture covers the viewport at its original aspect.

## Photographed CC0 sources

Existing local Poly Haven scans at `C:/Users/crist/Tools/render/assets`:

- `rosewood_veneer1`: rubbed walnut plaque and moulding;
- `dark_wood`: individual ledge boards;
- `plastered_wall_04`: sage lime plaster.

Source library: [Poly Haven](https://polyhaven.com/textures),
[CC0 licence](https://polyhaven.com/license).
Brass, wax, paper fibres, seal and fire use original procedural shaders.
Georgia and Courier use the installed Windows typefaces, rendered into
the artwork. The editable main scene packs its image textures.

## Rebuild

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup --python art/blender/candlelight_brass.py -- --width 2560 --samples 256 --pack
node art/blender/candlelight_brass_publish.mjs
```

The editable main scene is `.artifacts/candlelight-brass/candlelight-brass.blend`.
The script also renders the letter and flame atlas. The publisher writes
`public/assets/images/Cryptex/native-v1/` and matching camera metadata in
`src/levels/cryptex/nativeCryptex.json`.

For a composition render, pass `--out .artifacts/candlelight-brass-preview
--width 1440 --samples 40 --cpu --preview`.

No tests, application builds or browser automation are run, following the
user's explicit instruction. Rendering and visually inspecting the artwork
are asset-production steps.
