# The two introductions

The house's two short introductions — the first door, in the hall; the first puzzle, in Room I — are a card over the game (`src/ui/guide.js`; `hallGuide.js` + `hallGuideDoor.js`, `studyGuide.js` + `studyGuideArt.js`; `styles/guide-card.css`, `guide-study.css`). On its left the thing itself, drawn by the game's own painters from the game's own renders: the hall's door I, the study's glass case; a sketched pointer shows what to do with it. On its right the words.

Each has two steps, and since 2026-11-10 they play by themselves, one after the other, over and over, like a slide show: the words and the two thin marks under them keep pace, the mark of the step playing filling from the left. A mark can be clicked to go to its step. "Got it" (or ×, or Esc) closes the card, and it is not shown again.

- **Hall.** The pointer comes to the shut door and clicks: it swings open (4.3 s). Then it clicks the open door, and the eye goes in through it — the doorway swelling and gliding to the middle (`lookInto`), never past the picture's edge — to the dark (4.0 s).
- **Room I.** The glass case glints — larger and more than in the game, so it is seen for what it is — the pointer clicks it, the eye goes to it and the puzzle comes up in its place, cut to the window (5.2 s). Then the puzzle over the game's own answer row: an example answer typed and sent (5.6 s).

Every picture is cut to the window's own shape (6:7) and fills it edge to edge under a hairline; whatever is not picture is the card's own dark, so nothing ever reads as a picture inside a picture. The window is as large as the screen allows (`--guide-window`, up to 560 px wide).

Each comes up when its place has finished its arrival fade (`HALL_READY`, `ROOM_READY`), with nothing else open and nothing on the move. Dismissal is stored in `house:hall-guide:v2` / `house:study-guide:v2` (bumped 2026-11-10, so the new card is seen once by everyone); resetting the game clears both. The settings' "First steps" and "Your first puzzle" open them again anywhere. With motion reduced the picture is a still and the marks switch the step by hand; the hall's first step then says that one click goes straight in (`oneReduced`).

The strings are `hallGuide.*` and `studyGuide.*` in the locales: `eyebrow`, `title`, `replay`, `close`, `illustration`, `one`, `two`, `done`, `footer` (hall: `oneReduced`; study: `example`, `sample`).
