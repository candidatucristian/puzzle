# Black leather archive: Settings, Notebook and Case file

The active material set is `public/assets/images/ArchiveTools/native-v2`.
It replaces the earlier chestnut leather and clean paper photographs.

`archive_black.py` constructs all three objects in a shared Blender Cycles
studio. It reuses the original geometric dossier construction from
`archive_tools.py`, with new black dyed calfskin, charcoal sewing, tarnished
nickel and darkened corner shoes. The notebook has a wider black binding;
Settings has its own landscape folio with a black navigation margin.

Paper oxidation is generated in the actual Blender material: low frequency
fibre density, uneven edge browning, small foxing marks and fibre-scale bump.
The paper leaves have thickness, slight curl and a separately rendered stack.
The black leather uses the local CC0 Poly Haven `brown_leather` scan with
neutral dye, scanned normals and high roughness. The bookmark uses the
existing CC0 `crepe_satin` scan. No AI generation or image recolouring is used.

```powershell
& 'C:\Users\crist\Tools\blender-4.5.15-windows-x64\blender.exe' -b -t 8 -P art/blender/archive_black.py -- --target all --samples 384 --scale 2
node art/blender/archive_black_publish.mjs
```

Packed editable models and RGBA source plates are under
`.artifacts/archive-black-v2`. One persistent scene is used for all five
photographs, retaining the same material and lighting setup.

The case file retains its three registered slices. Notebook uses a nine-slice
border so the black binding and browned paper edges keep their thickness as
notes grow. Settings uses a separate landscape plate, with a portrait layout
for narrow windows. Text and controls remain HTML, with all existing IDs and
saved-data logic. The live style is `src/ui/styles/archive-black.css`.

Visual captures: `archive_tools_review.mjs` and
`.artifacts/settings-polish-review/capture.mjs`. No automated tests, lint or
production build were run.
