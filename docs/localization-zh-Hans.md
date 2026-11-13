# Simplified Chinese localization

Added 2026-11-08. The locale is `zh-Hans`, shown as `简体中文` in Settings.
The URL and stored-language reader also recognize `zh`, `zh-CN`, `zh-SG` and
Steam's `schinese`, normalizing them to `zh-Hans`. Choosing the language stores
the canonical value and updates the current interface immediately.

`src/locales/zh-Hans.js` supplies every section of the English locale, including
41 puzzle names, 42 hint sets (including the retained legacy entry), the manual,
letters, story passages, room notes, broadcasts, menus and accessibility labels.
Document IDs, timing cues, interpolation parameters and puzzle codes retain their
original values. Chinese instructions explain the use of the original Latin
letters; encoded inscriptions and book titles used as puzzle data are preserved.

Noto Sans SC and Noto Serif SC are bundled as original variable TTF files, with
OFL notices and a source/hash manifest in `public/assets/fonts/cjk/`. No CJK font
CDN is contacted during play. Their sizes are about 17.8 MB and 25.1 MB; these
files are loaded when Chinese text is needed. Fonts are awaited at startup for
Chinese. When a language switch loads them later, the current canvas text and
open documents are redrawn after loading. A later language choice takes priority
over an earlier font-loading request.

The shared canvas line wrapper supports Chinese character boundaries and keeps
closing punctuation with the preceding character. Canvas measurement and drawing
use the same bundled CJK font fallbacks. Chinese interface typography uses normal
character spacing and upright text. Keyboard composition is tracked in the answer
field so Enter used to confirm an IME candidate does not submit an answer.

Validation for this change is static: locale structure, placeholders, file syntax,
and the fonts' Unicode cmap coverage. No automated application tests, linters or
production builds were run. Static inventories are in `.artifacts/i18n-audit/`.
