# Interface fonts

These fonts are self-hosted so the game does not contact a font provider during play.
Downloaded unchanged from Google Fonts on 2026-10-05. Exact asset and license URLs
are recorded in `sources.json`.

| Family | Styles | Weights | Purpose |
| --- | --- | --- | --- |
| DM Serif Display | Normal | 400 | Display headings |
| Cormorant Garamond | Normal, italic | Variable, 300–700 | Display headings and editorial accents |
| IBM Plex Sans | Normal | Variable, 100–700 | Readable interface labels and instructions |
| IBM Plex Mono | Normal | 400 | Codes and compact numeric details |

Each style has separate `latin` and `latin-ext` WOFF2 subsets. Together they cover
Romanian characters, including Ă/ă, Â/â, Î/î, Ș/ș and Ț/ț. Use the corresponding
Unicode ranges when declaring the subsets so the browser downloads only the
glyph coverage required by the interface.

Cormorant Garamond is copyright 2015 the Cormorant Project Authors, designed by
Christian Thalmann. [Project](https://github.com/CatharsisFonts/Cormorant).
The complete SIL Open Font License 1.1 is retained in
`Cormorant-Garamond-OFL.txt`.

IBM Plex Sans and IBM Plex Mono are copyright 2017 IBM Corp., with Reserved Font
Name "Plex". [Project](https://github.com/IBM/plex). Their complete SIL Open Font
License 1.1 is retained in `IBM-Plex-OFL.txt`.

DM Serif Display is copyright 2014 The DM Serif Display Project Authors.
[Project](https://github.com/google/fonts/tree/main/ofl/dmserifdisplay).
The complete SIL Open Font License 1.1 is retained in `DM-Serif-Display-OFL.txt`.

These licenses allow embedding and redistribution with the game. Keep their
copyright notices and license files with the font files. The downloaded font
binaries have not been modified; filenames were made descriptive locally.
