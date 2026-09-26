// One source for game answers, Info requirements and the reference ledger.
// Keep IDs stable when renaming or reordering levels; IDs are used in saves.
const metadata = [
  {
    "id": "binarytree",
    "key": "BinaryTree",
    "name": "Binary Tree",
    "code": "CABBAGE",
    "altCode": null,
    "hint": {
      "text": "This looks like a root - could it be a vegetable or a fruit?",
      "sound": false,
      "tool": false
    },
    "description": "A pencil-sketch binary tree has a note pinned above it listing seven 3-letter paths: RLR, LRL, LLL, LLL, LRL, LLR, LRR. Eight lettered leaves sit at the bottom, left to right: B G A E D C H F — deliberately not alphabetical. Read each path as binary (L=0, R=1) to get a 3-bit index (0–7) into the leaf row: RLR=101=5→C, LRL=010=2→A, LLL=000=0→B, LLL=000=0→B, LRL=010=2→A, LLR=001=1→G, LRR=011=3→E. That spells C-A-B-B-A-G-E.",
    "references": [
      "BT_CODES = [\"RLR\",\"LRL\",\"LLL\",\"LLL\",\"LRL\",\"LLR\",\"LRR\"] — the seven written paths",
      "BT_LEAVES = [\"B\",\"G\",\"A\",\"E\",\"D\",\"C\",\"H\",\"F\"] — leaf letters, index = binary value of the path"
    ]
  },
  {
    "id": "plantpot",
    "key": "PlantPot",
    "name": "Plant Pot",
    "code": "FIBO",
    "altCode": "FIBONACCI",
    "hint": {
      "text": "WATER THE PLANT.\nObserve the pattern of its leaves. What or who does it remind you of?",
      "sound": false,
      "tool": false
    },
    "description": "Watering the plant five times adds branches with 1, 1, 2, 3 and 5 leaves. The growing pattern is the Fibonacci sequence. A gardener, plants and a starry garden surround the pot; the scenery contains no written formula. The name of the sequence gives FIBO or FIBONACCI.",
    "references": [
      "fibSeq = [1, 1, 2, 3, 5] — leaves added per pour",
      "leafDefs — leaf positions for each growth stage"
    ]
  },
  {
    "id": "sequence",
    "key": "Sequence",
    "name": "Sequence",
    "code": "19334488111",
    "altCode": "1 9 33 44 88 111",
    "hint": {
      "text": "SIX NUMBERS, ONE VOICE.\nSmallest first, and they become one. Then don't just look at it — read it aloud, the way the note in the corner does.",
      "sound": false,
      "tool": false
    },
    "description": "Six shuffled cards show 23, 31, 11, 28, 19, 24. Sorting them gives 11, 19, 23, 24, 28, 31. A corner example, 25 → 55, teaches how to read each card as a count followed by a digit: 11 → 1, 19 → 9, 23 → 33, 24 → 44, 28 → 88, 31 → 111. Joining those groups gives 19334488111.",
    "references": [
      "SEQ_START = [23,31,11,28,19,24] / SEQ_SORTED = [11,19,23,24,28,31]",
      "_refreshFused() — builds the live fused number under the sorted cards",
      "corner note \"25 → 55\" — teaches the look-and-say (count, then digit) reading",
      "statusText after solve: \"One number. Now read it aloud.\""
    ]
  },
  {
    "id": "cryptex",
    "key": "Cryptex",
    "name": "Cryptex",
    "code": "ROTOR",
    "altCode": null,
    "hint": {
      "text": "AN OLD BRASS WHEEL.\nIt turns like a clock that lost its hours.",
      "sound": false,
      "tool": false
    },
    "description": "A wax-sealed envelope holds three lines of Caesar-shifted ciphertext: \"HYHUB FLSKHU PDFKLQH\", \"JXDUGV LWV VSLQQLQJ KHDUW\", \"WKH URWRU\". The candle takes three clicks to extinguish; that count hints at shift 3. Turning the brass cipher wheel back 3 letters (Caesar shift −3) decodes it to \"EVERY CIPHER MACHINE GUARDS ITS SPINNING HEART — THE ROTOR\".",
    "references": [
      "CRYPTEX_CIPHER — the three lines of shift-3 ciphertext",
      "Candle.blow() - three clicks extinguish the flame and reveal the shift through counting",
      "CRYPTEX_ALPHA + the rotating disk — the physical decoder wheel"
    ]
  },
  {
    "id": "chessboard",
    "key": "Chessboard",
    "name": "Chessboard",
    "code": "HEADACHE",
    "altCode": null,
    "hint": {
      "text": "AN ABANDONED GAME.\nNobody won. This game is too heavy for the mind - it brings so much ...",
      "sound": false,
      "tool": false
    },
    "description": "An overhead chessboard with etched algebraic coordinates holds 8 pieces, one per rank: Rook h1, White King e2, Pawn a3, Black Queen d4, Black King a5, Knight c6, White Bishop h7, Black Bishop e8. Reading the FILE letter of each piece in rank order 1→8 gives h-e-a-d-a-c-h-e. Pieces can be picked up but always snap back to their home square, so the message can't be scrambled.",
    "references": [
      "CHESS_PIECES — exact squares: h1, e2, a3, d4, a5, c6, h7, e8",
      "CHESS_FILES = \"abcdefgh\" — the only coordinate tool the level offers",
      "_placePieces() — pieces always settle back to their home square"
    ]
  },
  {
    "id": "mobilephone",
    "key": "MobilePhone",
    "name": "Mobile Phone",
    "code": "GEORGE",
    "altCode": null,
    "hint": {
      "text": "AN OLD FRIEND CALLS.\nFind out who he actually is.",
      "sound": false,
      "tool": false
    },
    "description": "An incoming call shows caller ID (433)-666-777-433. Grouped into runs of identical digits — 4, 33, 666, 777, 4, 33 — this is an old T9 multi-tap number: press each digit that many times on the numeric keypad to select the Nth letter of that key's group (4=GHI, 3=DEF, 6=MNO, 7=PQRS). 4×1→G, 3×2→E, 6×3→O, 7×3→R, 4×1→G, 3×2→E spells GEORGE, typed out on the in-scene keypad.",
    "references": [
      "mobilephone/puzzle.js: CALLER_NUMBER — the multi-tap-encoded caller ID",
      "PHONE_KEYMAP — letter groups per digit key (multi-tap letter sets)",
      "pressPhoneKey() / commitPhoneInput() — letter cycling and committing after 800 ms",
      "CALLER_NAME / phoneDisplay() — the scene reveals GEORGE when the displayed name matches"
    ]
  },
  {
    "id": "lightswitch",
    "key": "Lightswitch",
    "name": "Lightswitch",
    "code": "POWER",
    "altCode": null,
    "hint": {
      "text": "A DARK ROOM. A SWITCH ON THE WALL.\nSome bulbs flicker. This one insists.",
      "sound": false,
      "tool": true
    },
    "description": "Each press of the wall switch blinks the bulb (and the switch's LED) in Morse for one letter of POWER, then the wiring shorts out and resets. Transcribing each blink burst: P=.--. , O=--- , W=.-- , E=. , R=.-. spells POWER. During the brief full-room flash a portrait of Samuel Morse is visible — \"lit only by his own code\" — confirming the mechanic.",
    "references": [
      "lightswitch/puzzle.js: MORSE — standard Morse lookup table",
      "this.ANSWER = \"POWER\", _letterIdx — which letter blinks next",
      "_pressSwitch() → buildMorseSteps() → _morseStep() — dot 40ms / dash 500ms timing",
      "Samuel Morse portrait, visible only during the flash"
    ]
  },
  {
    "id": "tv",
    "key": "TV",
    "name": "TV",
    "code": "VOID",
    "altCode": "NULL",
    "hint": {
      "text": "DEAD AIR.\nFour channels. Four different worlds. All of them speak of the same thing — without ever saying it.",
      "sound": false,
      "tool": false
    },
    "description": "Four channels each describe absence/nothingness without naming it: a cosmic supervoid on Cosmos Net, a legally unenforceable contract on Lawcourt, a function with no return value on Code Review (\"not zero, not false — and even null still carries meaning\", pointedly ruling NULL out), and a true-vacuum experiment on Science Foundation. The Code Review channel is most direct: it describes a keyword \"reserved for the complete absence of any return\", present in C, C++, Java, Swift — the keyword void. All four fields point at the same unstated word: VOID.",
    "references": [
      "_CHANNELS getter — all four broadcast texts",
      "Channel 2 (\"CODE REVIEW\") explicitly contrasts void with null",
      "top-of-file comment: \"All four channels describe VOID without ever naming it.\""
    ]
  },
  {
    "id": "modem",
    "key": "Modem",
    "name": "Modem",
    "code": "HTTPS",
    "altCode": null,
    "hint": {
      "text": "SIGNAL INTERCEPTED.\nThe old router never stopped transmitting.",
      "sound": false,
      "tool": true
    },
    "description": "A sketched router blinks two LEDs to transmit the word HTTPS as ASCII binary, letter by letter — one LED flashes for each 0 bit, the other for each 1 bit. After each full letter, one of five \"counter\" LEDs lights solid red, confirming a 5-letter word once all five are lit. The router's engraved model name \"W. LEIBNIZ\" nods to Gottfried Leibniz, inventor of binary notation, hinting that the blinking should be read as binary.",
    "references": [
      "modem/puzzle.js: MODEM_WORD = \"HTTPS\", planTransmission() — ASCII binary LED schedule",
      "_startAnimation() — LED 5 = bit 0, LED 6 = bit 1, LED[i] turns red per completed letter",
      "engraved label \"W. LEIBNIZ\" — binary-notation flavor clue"
    ]
  },
  {
    "id": "telescope",
    "key": "Telescope",
    "name": "Telescope",
    "code": "ORION",
    "altCode": null,
    "hint": {
      "text": "A TELESCOPE AT THE WINDOW.\nNot everything up there was arranged by nature.",
      "sound": false,
      "tool": true
    },
    "description": "Clicking the sketched telescope carries you up to the very same arched window, now filling the screen with its shutters open and the veranda rail just outside. Among the scattered stars, five groups sit on a perfect 2×3 grid — Braille cells (dot layout 1 4 / 2 5 / 3 6) — and that flawless alignment is the tell. Hovering one lights a faint line through its dots, slowly. Reading them left to right: O=1,3,5 · R=1,2,3,5 · I=2,4 · O=1,3,5 · N=1,3,4,5, spelling O-R-I-O-N.",
    "references": [
      "BRAILLE — letter → dot-number lookup table",
      "BRAILLE_DOT_POS — dot number → 2×3 grid position; every cell shares one exact grid, with no jitter",
      "TUNE.CELL_W / CELL_H — the cell grid every letter is laid out on",
      "TUNE.HOVER_IN (0.95s) / LINE_ALPHA — the slow, faded light-up on hover",
      "windowFrame.js drawWindowFrame() — the one arch-and-shutters drawing, used by both the room sketch and this close-up"
    ]
  },
  {
    "id": "wires",
    "key": "Wires",
    "name": "Wires",
    "code": "FACADE",
    "altCode": null,
    "hint": {
      "text": "THE MORNING CHOIR.\nThey sat down exactly where the composer left them.",
      "sound": false,
      "tool": true
    },
    "description": "Six birds perch on five overhead wires, read bottom to top as D, F, A, C, E. From left to right their positions spell F, A, C, A, D, E. A small house and a person playing harmonica in a rocking chair sit under a starry sky. The harmonica recording and drifting notes are atmosphere; listening and playing an instrument are not required to solve the puzzle.",
    "references": [
      "WI_BIRDS — each bird’s wire position encodes one letter",
      "Optional ambience: assets/sounds/Wires/music.mp3"
    ]
  },
  {
    "id": "station",
    "key": "Station",
    "name": "Station",
    "code": "EXIT",
    "altCode": null,
    "hint": {
      "text": "THE LAST STATION.\nNobody checks the spelling anymore. Four trains are still boarding — leave in order of departure.",
      "sound": false,
      "tool": false
    },
    "description": "The departures board lists 8 rows; only 4 are marked BOARDING — GENETA 22:41, MOXCOW 22:07, PERIS 21:03, LINDON 22:24 (the rest are cancelled/delayed filler). Each boarding destination has one visibly misspelled letter that stutters into place: P(E)RIS, MO(X)COW, L(I)NDON, GENE(T)A. Sorted by departure time — 21:03 PERIS→E, 22:07 MOXCOW→X, 22:24 LINDON→I, 22:41 GENETA→T — the anomalous letters read E-X-I-T.",
    "references": [
      "STATION_ROWS — time, dest, remark, wrongIdx fields",
      "wrongIdx — the anomalous letter index in each destination",
      "only remark === \"BOARDING\" rows matter; sort key is time"
    ]
  },
  {
    "id": "pi",
    "key": "Pi",
    "name": "Pi",
    "code": "PI",
    "altCode": "3.14",
    "hint": {
      "text": "ONE BUILDING NEVER SLEEPS.\nThe city keeps its books by lamplight — floor by floor, from the top.",
      "sound": false,
      "tool": false
    },
    "description": "In a sleeping skyline, one building has lit windows on every floor. The count of lit windows per floor, top to bottom, is 3, 1, 4, 1, 5, 9, 2, 6, 5 — the digits of π. Window position within each floor is randomized and irrelevant; only the count per row matters (clicking a lit window relocates it within its own floor, preserving the count).",
    "references": [
      "PI_DIGITS = [3,1,4,1,5,9,2,6,5] — lit-window count per floor, top to bottom",
      "_drawHeroBuilding() — scatters PI_DIGITS[f] lit windows per floor",
      "_onLitWindowClick() — relocates but never changes the per-floor count"
    ]
  },
  {
    "id": "crossing",
    "key": "Crossing",
    "name": "Crossing",
    "code": "GO",
    "altCode": null,
    "hint": {
      "text": "MIND THE CROSSING.\nThe paint is not evenly worn. Wide and narrow is a language too.",
      "sound": false,
      "tool": true
    },
    "description": "The painted pedestrian crossing is a Code 39 barcode for GO. Read the wide and narrow stripe pattern from the near curb to the far curb to decode the two letters. A cat walks near the crossing, and the shop advertises cat food.",
    "references": [
      "CR_WORD = \"GO\" — the encoded string",
      "CR_CODE39 — letter → wide/narrow bar pattern lookup",
      "_drawBarcodeCrossing() — renders only the bar elements as painted stripes"
    ]
  },
  {
    "id": "flags",
    "key": "Flags",
    "name": "Flags",
    "code": "DEBRIEFING",
    "altCode": null,
    "hint": {
      "text": "DRESS THE SHIP.\nEach colour flies for a country, and every country signs with two letters.",
      "sound": false,
      "tool": true
    },
    "description": "Five national flags hang on a clothesline, left to right: Germany, Brazil, Ireland, Finland, Nigeria — none of them labeled by name, only by their actual colors/pattern. Concatenating each country's ISO two-letter code in hanging order — DE + BR + IE + FI + NG — spells DEBRIEFING.",
    "references": [
      "FL_FLAGS = [\"DE\",\"BR\",\"IE\",\"FI\",\"NG\"] — hanging order = code order",
      "_paintFlag() — per-flag colored geometry, no text labels drawn"
    ]
  },
  {
    "id": "tapcode",
    "key": "TapCode",
    "name": "Tap Code",
    "code": "ESCAPE",
    "altCode": null,
    "hint": {
      "text": "KNOCK TWICE.\nA prisoner counts in fives; two numbers find a letter.",
      "sound": false,
      "tool": true
    },
    "description": "A stone slab carries 6 lines of tally marks, two clusters per line, following the classic 5×5 prisoner's tap code (K folded into C's square). Each letter of ESCAPE becomes a (row, column) pair rendered as that many carved marks: E=(1,5), S=(4,3), C=(1,3), A=(1,1), P=(3,5), E=(1,5). Two small scratched \"1\" labels are the only nudge toward counting rows-then-columns from 1.",
    "references": [
      "TAP_WORD = \"ESCAPE\", TAP_GRID = 5×5 tap-code grid (K→C)",
      "tapPair() — converts a letter to its (row, col) grid position",
      "_drawSlab() — carves row marks, a gap, then column marks per letter"
    ]
  },
  {
    "id": "rally",
    "key": "Rally",
    "name": "Rally",
    "code": "SILVER",
    "altCode": null,
    "hint": {
      "text": "THE STAGE FINISH.\nEach car wears a number, and every number has a place.",
      "sound": false,
      "tool": false
    },
    "description": "Six numbered cars cross a night rally finish line in order: 19, 9, 12, 22, 5, 18. Interpreting each number as an alphabet position (A=1 through Z=26) spells SILVER. After the last car, the lights go out and a podium appears. The race runs once; replay runs it again. The optional car recording is atmosphere and is not required to solve the level.",
    "references": [
      "RY_NUMBERS = [19, 9, 12, 22, 5, 18] — the door numbers, in order of crossing",
      "RY_CROSS_MS = [0, 3000, 3210, 6210, 6960, 7170] — when each car's centre crosses the line; the bunches, 3 s apart (the tight pairs are 210 ms apart)",
      "RY_SPEED — each car runs a touch faster or slower; the crossing times stay exact",
      "cars.js: RY_DIGITS — hand-painted numeral strokes (no font); paintNumber() draws them on the plate",
      "_planRound() / _runRace() — work out launches and whooshes from RY_CROSS_MS, then lights out, then the podium (RY_PODIUM_MS later); the race runs once",
      "_soundLead() — measures the loudest moment of wroom.mp3 so it lands on the line",
      "podium.js: RY_WINNERS / RY_CUPS — the top three and their cups; drawPodium() / drawCup() draw the board"
    ]
  },
  {
    "id": "overtime",
    "key": "Overtime",
    "name": "Overtime",
    "code": "SOIL",
    "altCode": null,
    "hint": {
      "text": "OVERTIME.\nAll these hours, and nothing to show for them but a number.",
      "sound": false,
      "tool": false
    },
    "description": "Four electronic clocks hang on a wall — 22:03, 14:11, 11:47 and 23:44 — above a desk with a pocket adding calculator (digits, 00, +, = and C). Read each clock as a plain number, the colon ignored, and add them: 2203 + 1411 + 1147 + 2344 = 7105. The calculator's seven-segment display, turned upside down, reads SOIL: read from the last digit to the first, 5 is S, 0 is O, 1 is I and 7 is L. The calculator does not turn over; the player reads the display upside down without any help from the game.",
    "references": [
      "OVERTIME_CLOCKS = [\"22:03\", \"14:11\", \"11:47\", \"23:44\"] — the four clocks; the order does not matter, all are added",
      "clockNumber() / overtimeTotal() — 22:03 → 2203; 2203 + 1411 + 1147 + 2344 = 7105",
      "readUpsideDown() — reverses the digits and maps 5→S, 0→O, 1→I, 7→L (also 2→Z, 3→E, 4→H, 6/9→G, 8→B)",
      "SEGMENTS / turnSegments() — the seven-segment digit shapes; turned through 180° they are the letters",
      "createCalculator() / pressKey() — the adding calculator: digits, 00, +, =, C; eight digits, then E until C",
      "OvertimeScene — draws the wall, the four clocks, the desk, the lamp and the working calculator"
    ]
  }
];

export const LEVEL_METADATA = Object.freeze(metadata.map((level) => Object.freeze({
  ...level,
  hint: Object.freeze(level.hint),
  references: Object.freeze(level.references),
})));

export default LEVEL_METADATA;
