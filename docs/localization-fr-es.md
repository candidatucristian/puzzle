# French and Spanish

The settings language selector includes Français (`fr`) and Español (`es`). The choice uses the existing `puzzleLanguage` preference and updates the active interface, scene captions and open documents.

Both locales contain the full English locale structure: menus, accessibility labels, settings, manual, case file, opening, story, letters, room notes, 41 puzzle titles and 42 hint sets. Language names remain in their own language. Character names, signatures, letter IDs, numeric values and narrative timing cues retain their original values.

Puzzle answers and physical encoded inscriptions retain their original spelling. The manual explains this; the Spanish manual specifies A–Z without Ñ. Musical hints identify the A–G note alphabet. No puzzle logic or answer aliases change.

French uses vous in the interface, with tu retained for personal family correspondence. Spanish uses tú. Enter is displayed as Entrée / Intro. The existing Latin fonts provide accented characters; no external font request is added.

The language list opens toward the available space inside settings and scrolls when necessary. Existing mouse and keyboard navigation covers all six languages.

Source inspection: no missing locale fields or i18n references, matching interpolation parameters, unchanged numeric data and hint counts. TV captions use different line breaks to fit translated text. No automated tests, linters or production builds were run for this change.
