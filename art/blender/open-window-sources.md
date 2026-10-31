# The Open Window

The active Telescope level uses three original Blender/Cycles renders, built
by `open_window.py`. The sky, stars, Moon, valley, window, curtains, balcony,
brass telescope and wooden tripod are geometry. No AI generated picture is
used by this version of the level.

The window has a solid oak frame, opened glazed side casements, a recessed
sage plaster arch, brass hinges and tied-back cloth. Warm reflected room
light meets cool moonlight. The landscape is an undulating mesh with scanned
trees and three distant ridges. Stars are small emissive spheres projected
through the same camera as the window; the background is a clear night-sky
shader. The photographic night environment illuminates the scene but is
hidden from the camera.

## Photographic source data

- Lunar colour and elevation: [NASA CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/),
  NASA's Scientific Visualization Studio, Lunar Reconnaissance Orbiter
  (LROC and LOLA); visualizer Ernie Wright. The files are cached in
  `open_window_assets/`: [colour](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg)
  and [laser-altimetry elevation](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_3_8bit.jpg).
  These are photographic/scientific maps applied to a spherical lunar mesh;
  elevation drives both displacement and bump shading.
- Existing [Poly Haven CC0](https://polyhaven.com/license) cache at
  `C:/Users/crist/Tools/render/assets`: `dark_wood`, `plastered_wall_04`,
  `old_sandstone_02`, `velour_velvet`, `grass_ground`, `fir_tree_01`,
  `tree_small_02`, `island_tree_01`, and lighting environment `moonlit_golf`.
- Oak architecture, brass telescope and hardware, cloth folds, balcony,
  valley terrain, ridges and star geometry are built by the script.

## Puzzle and runtime

`src/levels/telescope/puzzle.json` defines the same five Braille letters,
O-R-I-O-N. All signal stars use the exact six-dot grid; decorative stars
avoid those cells. Camera coordinates, aperture polygon and telescope bounds
are exported with the render. The existing hover guide uses these coordinates
and is masked inside the opening.

The full-screen close-up loads directly when entered from its house room.
Standalone play retains the telescope approach and return. A second sky
render gently dims only decorative stars while a clue is being observed;
signal geometry remains identical. Both renders share the same camera,
lighting and deterministic scene. Reduced motion skips the transition and
ambient scintillation. The existing night-wind ambience is retained.

## Rebuild

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup --python art/blender/open_window.py -- --width 2880 --samples 256 --pack
node art/blender/open_window_publish.mjs
```

The packed, editable scene is `.artifacts/open-window/open-window.blend`.
The publisher writes `public/assets/images/Telescope/native-v1/*.webp` and
`src/levels/telescope/nativeWindow.json`. For a small artwork preview, use
`--out .artifacts/open-window-preview --width 1440 --samples 40 --cpu --preview`.
