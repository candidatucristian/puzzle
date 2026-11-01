# Notebook (N) and Case file (C)

Original models and physical Cycles lighting: `archive_tools.py`.
Only the two menu tools are replaced; room notebooks, correspondence arrivals,
the map and gameplay artwork have separate pipelines.

The archive folio has leather-covered boards, individual backing sheets, a
curved upper leaf with actual punched holes, nickel hoops, a pressed rail,
slotted screws and a release paddle. The notebook has 27 separate leaves,
five sewn stations, a stitched headband, a leather spine and a woven ribbon.
The closed menu objects are independent three-quarter photographs from the
same materials. Thread, corner shoes, page thickness and paper curl are
geometry. No AI images, CSS-painted metal, or additive highlight layer.

The leather and ribbon use the existing local Poly Haven CC0 scans
`brown_leather` and `crepe_satin`; photographic portraits use `dark_wood`.
Cotton paper uses procedural fibre-scale bump and restrained colour variation.
All surfaces have physically rough reflection; no clearcoat or bloom.
No external downloads are required.

Production:

```powershell
& 'C:\Users\crist\Tools\blender-4.5.15-windows-x64\blender.exe' -b -t 8 -P art/blender/archive_tools.py -- --target all --samples 384 --scale 2
node art/blender/archive_tools_publish.mjs
```

Packed editable scenes, full-resolution RGBA plates and desk portraits are
under `.artifacts/archive-tools-v1`. Published assets are under
`public/assets/images/ArchiveTools/native-v1`.

The 2960 × 1840 dossier photograph is sliced at reference x=340 and x=412
(on a 1480 px layout). Its three backgrounds follow the existing index,
hinge and reader columns. Consequently the rendered rings, holes, paper and
their shadows stay registered as the reader resizes. The notebook plate is
1120 × 2000; icons are 1120 × 1120. Text, translation, keyboard shortcuts,
note storage, drawing and letter/evidence navigation remain DOM controls.

Verification is visual inspection of the Cycles plates and interface
captures, plus lightweight script syntax checks; no test suites, lint or
production build are part of asset publication.
