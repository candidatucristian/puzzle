// One source for game answers, Info requirements and the reference ledger.
// Keep IDs stable when renaming or reordering levels; IDs are used in saves.
import { HINT_DETAILS } from './hints.js';

const metadata = [
  {
    "id": "binarytree",
    "key": "BinaryTree",
    "name": "The Old Tree",
    "summary": "An old tree stands over a locked box, with a note left among its roots.",
    "code": "CABBAGE",
    "altCode": null,
    "hint": {
      "text": "THE ROOTS GROW UPWARDS.\nThe note beside the tree is not a doodle — each line on it is a journey.",
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
    "name": "The Moonlit Garden",
    "summary": "A lantern lights a quiet potting bench in the moonlit garden.",
    "code": "FIBO",
    "altCode": "FIBONACCI",
    "hint": {
      "text": "WATER THE PLANT.\nWatch what each pour brings out of it.",
      "sound": false,
      "tool": false
    },
    "description": "Dragging the bucket to the pot waters the plant; five pours add branches with 1, 1, 2, 3 and 5 leaves. The growing pattern is the Fibonacci sequence. A moonlit garden surrounds the potting bench — hills, cypresses, a lantern on the bench; the scenery contains no written formula. The name of the sequence gives FIBO or FIBONACCI.",
    "references": [
      "LEAF_DEFS (PlantPotScene.js) — the leaves each pour brings: 1, 1, 2, 3 and 5, and where on the new branch they grow",
      "SEGMENTS — the plant's five branches, one per pour, in cm from the soil; paintStems() (plant.js) draws them as they grow",
      "triggerPour() / _pourPoint() — dragging the bucket over the pot tips it and pours"
    ]
  },
  {
    "id": "sequence",
    "key": "Sequence",
    "name": "The Table of Cards",
    "summary": "Six cards and a handwritten note wait to be examined.",
    "code": "19334488111",
    "altCode": "1 9 33 44 88 111",
    "hint": {
      "text": "SIX NUMBERS, ONE VOICE.\nThe cards want an order, and the note in the corner shows how they speak.",
      "sound": false,
      "tool": false
    },
    "description": "Six shuffled cards show 23, 31, 11, 28, 19, 24. Sorting them gives 11, 19, 23, 24, 28, 31. A corner example, 25 → 55, teaches how to read each card as a count followed by a digit: 11 → 1, 19 → 9, 23 → 33, 24 → 44, 28 → 88, 31 → 111. Joining those groups gives 19334488111.",
    "references": [
      "SEQ_START = [23,31,11,28,19,24] / SEQ_SORTED = [11,19,23,24,28,31]",
      "_refreshFused() — builds the live fused number under the sorted cards",
      "corner note \"25 → 55\" — teaches the look-and-say (count, then digit) reading"
    ]
  },
  {
    "id": "cryptex",
    "key": "Cryptex",
    "name": "Candlelight and Brass",
    "summary": "Candlelight catches the engraved letters of a brass mechanism.",
    "code": "ROTOR",
    "altCode": null,
    "hint": {
      "text": "AN OLD BRASS WHEEL.\nThe candle, the envelope and the wheel keep one secret between them.",
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
    "name": "The Unfinished Game",
    "summary": "An unfinished game rests on the table in a silent parlour.",
    "code": "HEADACHE",
    "altCode": null,
    "hint": {
      "text": "AN ABANDONED GAME.\nForget the rules — look at where the pieces stand.",
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
    "name": "An Unexpected Call",
    "summary": "An old mobile phone lights up with an incoming call.",
    "code": "GEORGE",
    "altCode": null,
    "hint": {
      "text": "AN OLD FRIEND CALLS.\nThe number on the screen is someone's name in disguise.",
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
    "name": "A Flicker in the Dark",
    "summary": "A single bulb and a wall switch interrupt the darkness.",
    "code": "POWER",
    "altCode": null,
    "hint": {
      "text": "A DARK ROOM. A SWITCH ON THE WALL.\nPress it, and keep your eyes on the bulb.",
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
    "name": "The Empty Broadcast",
    "summary": "An old television keeps broadcasting into an empty room.",
    "code": "VOID",
    "altCode": "NULL",
    "hint": {
      "text": "DEAD AIR.\nFour channels — watch every one of them to the end.",
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
    "name": "The Room Beneath the Desk",
    "summary": "Small lights blink on a router beneath the desk lamp.",
    "code": "HTTPS",
    "altCode": null,
    "hint": {
      "text": "SIGNAL INTERCEPTED.\nThe old router's lights never stop talking.",
      "sound": false,
      "tool": true
    },
    "description": "An old router on a desk in a lamplit room at night blinks two LEDs to transmit the word HTTPS as ASCII binary, letter by letter — one LED flashes for each 0 bit, the other for each 1 bit. After each full letter, one of five \"counter\" LEDs lights solid red, confirming a 5-letter word once all five are lit. The router's maker's name printed on its front, \"W. LEIBNIZ\", nods to Gottfried Leibniz, inventor of binary notation, hinting that the blinking should be read as binary.",
    "references": [
      "modem/puzzle.js: MODEM_WORD = \"HTTPS\", planTransmission() — ASCII binary LED schedule",
      "_startAnimation() — LED 5 = bit 0, LED 6 = bit 1, LED[i] turns red per completed letter",
      "room.js paintRouter() — the maker's name \"W. LEIBNIZ\" printed on the router's front, the binary-notation flavor clue"
    ]
  },
  {
    "id": "telescope",
    "key": "Telescope",
    "name": "The Open Window",
    "summary": "A telescope waits beside a window open to the stars.",
    "code": "ORION",
    "altCode": null,
    "hint": {
      "text": "A TELESCOPE AT THE WINDOW.\nLook through it. Not everything up there was arranged by nature.",
      "sound": false,
      "tool": true
    },
    "description": "Clicking the sketched telescope carries you up to the very same arched window, now filling the screen with its shutters open and the veranda rail just outside. Among the scattered stars, five groups sit on a perfect 2×3 grid — Braille cells (dot layout 1 4 / 2 5 / 3 6) — and that flawless alignment is the tell. Hovering one lights a faint line through its dots, slowly. Reading them left to right: O=1,3,5 · R=1,2,3,5 · I=2,4 · O=1,3,5 · N=1,3,4,5, spelling O-R-I-O-N.",
    "references": [
      "BRAILLE — letter → dot-number lookup table",
      "BRAILLE_DOT_POS — dot number → 2×3 grid position; every cell shares one exact grid, with no jitter",
      "TUNE.CELL_W / CELL_H — the cell grid every letter is laid out on",
      "TUNE.HOVER_IN (0.95s) / LINE_ALPHA — the slow, faded light-up on hover",
      "windowFrame.js — curtain geometry for the painted arched-window close-up in window.js"
    ]
  },
  {
    "id": "wires",
    "key": "Wires",
    "name": "Before Sunrise",
    "summary": "Birds settle on the wires above a farmhouse at dawn.",
    "code": "FACADE",
    "altCode": null,
    "hint": {
      "text": "THE MORNING CHOIR.\nLook at the birds sitting on the wires.",
      "sound": false,
      "tool": true
    },
    "description": "Six birds perch on five overhead wires, read bottom to top as D, F, A, C, E. From left to right their positions spell F, A, C, A, D, E. The scene is the minute before sunrise on a country hill — the dawn's early light the Star-Spangled Banner opens with — with a farmhouse below, its porch lantern still lit and an old man in a rocking chair playing the harmonica. The harmonica recording and drifting notes are atmosphere; listening and playing an instrument are not required to solve the puzzle.",
    "references": [
      "WI_BIRDS — each bird’s wire position encodes one letter",
      "meadow.js wireY() — the five wires the birds are placed on",
      "Optional ambience: assets/sounds/Wires/music.mp3"
    ]
  },
  {
    "id": "station",
    "key": "Station",
    "name": "The Quiet Station",
    "summary": "The departures board is still lit in a nearly empty station.",
    "code": "EXIT",
    "altCode": null,
    "hint": {
      "text": "THE LAST STATION.\nThe departures board — only the trains still boarding.",
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
    "name": "The Sleeping City",
    "summary": "Across the water, a few windows remain lit in the sleeping skyline.",
    "code": "PI",
    "altCode": "3.14",
    "hint": {
      "text": "ONE BUILDING NEVER SLEEPS.\nIts lit windows are worth counting.",
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
    "name": "The Cat on the Crossing",
    "summary": "A quiet street, a wandering cat and a worn pedestrian crossing.",
    "code": "GO",
    "altCode": null,
    "hint": {
      "text": "MIND THE CROSSING.\nLook down at the stripes painted on the road.",
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
    "name": "Harbor at Dusk",
    "summary": "Colourful flags stir in the breeze along a sunlit harbour.",
    "code": "DEBRIEFING",
    "altCode": null,
    "hint": {
      "text": "DRESS THE SHIP.\nThe flags along the line, left to right.",
      "sound": false,
      "tool": true
    },
    "description": "In a harbour on a sunny day, five national flags hang pegged to a line strung between two harbour lamps on the quay, left to right: Germany, Brazil, Ireland, Finland, Nigeria — none of them labeled by name, only by their actual colors/pattern. Concatenating each country's ISO two-letter code in hanging order — DE + BR + IE + FI + NG — spells DEBRIEFING.",
    "references": [
      "FL_FLAGS = [\"DE\",\"BR\",\"IE\",\"FI\",\"NG\"] — hanging order = code order",
      "harbour.js paintDesign() — per-flag colored geometry, no text labels drawn; paintFlagFrames() makes them flutter"
    ]
  },
  {
    "id": "tapcode",
    "key": "TapCode",
    "name": "Marks in Stone",
    "summary": "Someone has carved small marks into an old stone slab.",
    "code": "ESCAPE",
    "altCode": null,
    "hint": {
      "text": "KNOCK TWICE.\nThe marks cut into the great stone.",
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
    "name": "The Night Circuit",
    "summary": "Engines cut through the night as cars approach the finish line.",
    "code": "SILVER",
    "altCode": null,
    "hint": {
      "text": "THE STAGE FINISH.\nWatch the cars as they cross the line.",
      "sound": false,
      "tool": false
    },
    "description": "Six numbered rally cars come round a floodlit gravel oval at night and cross the finish line in order: 19, 9, 12, 22, 5, 18. Interpreting each number as an alphabet position (A=1 through Z=26) spells SILVER. After the last car, the floodlights go out and a podium appears. The race runs once; replay runs it again. The optional car recording is atmosphere and is not required to solve the level.",
    "references": [
      "RALLY_NUMBERS = [19, 9, 12, 22, 5, 18] (puzzle.js) — the door numbers, in order of crossing",
      "RALLY_CROSS_MS — original crossing times [0, 3000, 3420, 6420, 7170, 7590] and RALLY_CAR_MS are divided by RALLY_PACE (0.77), running at 77% of base pace while preserving their spacing; tight pairs cross about 545 ms apart",
      "RALLY_SPEED — each car runs a touch faster or slower; the crossing times stay exact",
      "track.js — the oval as one projection: a car's size follows from its height below the horizon, and it is never tilted",
      "cars.js — one 3D rally car rendered in software at every angle the drive needs (FRAME_COUNT views; side-on, exactly, at the line); paintPanel() puts the number on the white door panel",
      "stage.js — the floodlit stage, its ground lit pixel by pixel by the real lamps; CAR_LANES keeps each car on its own line, the close pairs one near and one far",
      "_planRound() / _runRace() — work out launches and whooshes from RALLY_CROSS_MS, then lights out, then the podium (RALLY_PODIUM_MS later); the race runs once",
      "_soundLead() — measures the loudest moment of wroom.mp3 so it lands on the line",
      "podium.js: RY_WINNERS — the top three and their cups; drawPodium() paints the board"
    ]
  },
  {
    "id": "overtime",
    "key": "Overtime",
    "name": "After Hours",
    "summary": "The office is empty, but the clocks and desk lamp are still working.",
    "code": "SOIL",
    "altCode": null,
    "hint": {
      "text": "OVERTIME.\nThe clocks on the wall, and the calculator on the desk.",
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
  },
  {
    "id": "fireworks",
    "key": "Fireworks",
    "name": "Midnight Over Paris",
    "summary": "Five balloons are tied to a bench in a moonlit park in Paris.",
    "code": "NIGHT",
    "altCode": null,
    "hint": {
      "text": "MIDNIGHT IN PARIS.\nThe balloons tied to the bench, from the highest down.",
      "sound": false,
      "tool": true
    },
    "description": "Midnight in a little park in Paris: a full moon, the Tower faint and far off, a pond with the moon in it, an old lantern, fireflies over the lawn. By the gravel path stands a green bench, facing us and turned a little aside; someone has tried colours on it, leaving a brush stroke of each on its slats, and a card tied to its back says FRESH PAINT. Tied to the top of its back are five small matt balloons. Each is one flat colour with no shine or shading, and that colour is exact: from the highest balloon down, #4E2233, #492244, #472255, #482266, #542277. A colour picker reads the codes off the screen. In #RRGGBB the red is the first two digits — 4E 49 47 48 54 — and read as ASCII those spell N I G H T. The balloons sway on their strings; nothing is drawn over them, so their colours stay true.",
    "references": [
      "FW_CODES = [\"#4E2233\", \"#492244\", \"#472255\", \"#482266\", \"#542277\"] (colors/Fireworksscene.js) — the five balloons’ colours, from the highest to the lowest",
      "colors/park.js layoutPark() — the balloons’ heights, the first the highest; paintBalloon() — each filled with exactly its code’s colour",
      "colors/park.js paintBench() — the card tied to the bench: FRESH PAINT"
    ]
  },
  {
    "id": "compass",
    "key": "Compass",
    "name": "The Captain’s Cabin",
    "summary": "A lantern swings above the chart table in a creaking ship's cabin.",
    "code": "LOST",
    "altCode": null,
    "hint": {
      "text": "THE NEEDLE WILL NOT SETTLE.\nOpen the map lying on the table.",
      "sound": false,
      "tool": false
    },
    "description": "A pirate ship at night, the captain’s cabin seen whole: the hull’s ribs, the deck beams, a cannon at its port, barrels and rope, the ship’s colours, a swinging lantern, the timbers creaking, and at the far end the stern window open on the moonlit sea. On the chart table stands a brass compass in its box, its card ruled to the degree (0 to 330 numbered, N E S W lettered), and its needle has gone mad: it spins, then stops on one bearing after another. Beside it lies a folded map sealed in red wax; clicked, it unfolds to show an island with a dotted way to an X and a treasure chest, and four lines of bearings: 180 180 90 / 270 180 180 90 90 0 0 270 / 270 270 180 90 90 180 270 270 / 90 90 270 180 180. North is 0, east 90, south 180, west 270; each bearing is one step that way and each line draws one letter — down, down, right is L — so the four walks write L O S T. The needle points out the same bearings line by line, a spin between letters, a kick off and back where a bearing repeats; a tap on the glass starts it again from the first letter.",
    "references": [
      "COMPASS_BEARINGS (compass/puzzle.js) — the four lines of the map, one letter each",
      "walk() / drawBearings() — one unit step per bearing (0 up, 90 right, 180 down, 270 left); drawBearings shows the letter as # marks",
      "compass/cabin.js paintCard() — the compass card: every degree ruled, every 30 numbered, the four winds lettered; paintCompassBox() lays it in its box on the table",
      "compass/cabin.js paintSheet() — the unfolded map: the island, the dotted way, the X and the chest",
      "CompassScene program() / _dance() — the needle: a spin before each letter, then each bearing held; a kick marks a repeated bearing"
    ]
  },
  {
    "id": "bookshelf",
    "key": "Bookshelf",
    "name": "Lamplight in the Library",
    "summary": "Lamplight falls on old books while a cat sleeps above the shelves.",
    "code": "SIGHT",
    "altCode": null,
    "hint": {
      "text": "THE INDEX IS THE KEY.\nFive books stand out from the rest.",
      "sound": false,
      "tool": false
    },
    "description": "A dark library late at night: a tall mahogany bookcase lit only by one table lamp, the rest of the room in shadow; a cup of tea steaming beside the lamp, the moon in the window, a Persian rug, a tabby cat asleep on top of the case. On the third shelf five books stand pulled a little out, each with a one-word title in gold on its spine and a paper bookmark in it with a number: SHADOW 1, MIRROR 2, MAGIC 3, HOUND 1, WATER 3, left to right. The bookmark is the index into the title (a book cipher): the 1st letter of SHADOW, the 2nd of MIRROR, the 3rd of MAGIC, the 1st of HOUND, the 3rd of WATER — S I G H T. A click on one of the five draws it a little further out, and back.",
    "references": [
      "BOOKS (bookshelf/puzzle.js) — the five titles and their bookmarks, left to right",
      "readBook() / readShelf() — the bookmark's number is the letter's place in the title, counting from 1",
      "bookshelf/library.js paintSpecial() — one of the five, pulled out: its spine and title, the bookmark standing out of its pages",
      "bookshelf/library.js placeBooks() — every book on the shelves; the five stand on the third"
    ]
  },
  {
    "id": "chemistry",
    "key": "Chemistry",
    "name": "The Apothecary’s Bench",
    "summary": "Graduated glass bottles crowd an abandoned laboratory bench.",
    "code": "FOCUS",
    "altCode": null,
    "hint": {
      "text": "READ THE GRADUATIONS.\nLook where the liquid stops in each bottle.",
      "sound": false,
      "tool": true
    },
    "description": "An old laboratory at night, lit by a Bunsen burner’s blue flame and an oil lamp: stone walls, a shelf of apothecary jars, a faded periodic table pinned to the wall, a test-tube rack and a retort at the back of the bench, a flask boiling on a tripod. Across the bench stand five graduated bottles of coloured liquid, each with a fine printed scale too small to read by eye. A magnifying glass lies on a green cloth at the front: click it and it becomes the pointer, enlarging whatever it is held over (click the cloth, or press Escape, to put it down). Under the lens each liquid’s front edge stands at a division of its scale: 9, 8, 6, 92, 16. They are atomic numbers: fluorine F, oxygen O, carbon C, uranium U, sulfur S — F O C U S. Each liquid has its element’s colour (pale yellow, pale blue, black, a glowing uranium green, sulfur yellow). The poster has every element in its place, faded but readable close up. With the glass put down, a click on a bottle swirls it; a click on the burner turns up the gas.",
    "references": [
      "BOTTLES (chemistry/puzzle.js) — the five atomic numbers marked at the menisci, left to right",
      "ELEMENTS / symbolOf() — every element's symbol by atomic number; readBottles() spells FOCUS",
      "cellOf() / familyOf() — each element's place and family on the poster",
      "chemistry/lab.js paintBottle() — the glass, its fine printed scale and liquid, painted for the bench and again for the lens; paintLoupe() / paintLens() — the magnifying glass; paintPoster() — the faded periodic table"
    ]
  },
  {
    "id": "billiards",
    "key": "Billiards",
    "name": "The Quiet Pub",
    "summary": "A pool table waits beneath the lights in a quiet pub.",
    "code": "BLIND",
    "altCode": null,
    "hint": {
      "text": "A SET HAS FIFTEEN BALLS.\nThe rack is short of a few — and some pockets are marked.",
      "sound": false,
      "tool": false
    },
    "description": "An abandoned pub at night, in three dimensions: a pool table seen across its long side from above — legs, apron, polished rails, pockets going down into it — under a billiard lamp of three green shades on a brass bar, the only warm light in a dark room; rain and street lamps in the window at the back, its cold light lying on the boards; a cue leaning on the corner of the table. The balls stand racked for the break, but five places in the triangle are empty — 2, 4, 9, 12 and 14 are gone. They lie in the pockets, five of which are marked I to V on little brass plates; down in a pocket a ball shows only its colour and whether it is striped, which with the rack and the set’s colours (1–7 solid, 9–15 striped in the same colours, 8 black) tells its number: I blue solid 2, II purple stripe 12, III yellow stripe 9, IV green stripe 14, V purple solid 4. A chalk slate on the back wall says “What is missing defines the answer”. In the pockets’ order, 2 12 9 14 4 as letters of the alphabet (A1Z26): B L I N D. A click on a pocket rattles its ball; the cue ball can be nudged.",
    "references": [
      "RACK (billiards/puzzle.js) — the triangle, column by column from its apex; null where a ball is missing",
      "POCKETS / POCKET_MARKS — the ball in each marked pocket, I to V: 2, 12, 9, 14, 4",
      "missing() / ballColour() / isStripe() — which balls are gone, and how each looks",
      "letter() / readPockets() — A1Z26: 2 12 9 14 4 → BLIND",
      "billiards/pub.js paintBall() — a ball seen from above; sunk in a pocket it shows no number"
    ]
  },
  {
    "id": "metro",
    "key": "Metro",
    "name": "Platform After Dark",
    "summary": "A line diagram hangs over a deserted underground platform.",
    "code": "SIGNAL",
    "altCode": null,
    "hint": {
      "text": "THE LAST TRAIN HAS GONE.\nThe line diagram hanging over the platform, in the direction the trains run.",
      "sound": false,
      "tool": true
    },
    "description": "A real underground platform late at night, seen down its length: the track in its trench running into the tunnel under a signal lamp that turns from red to green and back, a platform wall of glazed tile with the station’s name on it, posters, a bench, a tannoy horn, a row of fluorescent tubes overhead with one of them failing, the way out lit at the far end. Hanging over the platform, facing us, is the enamel line diagram: Line 6, eastbound, its six stops in order — Sierra Heights (marked YOU ARE HERE), India Docks, Golf Links, November Street, Alpha Park, Lima Road — and an arrow for the way the trains run. Their first words are the NATO phonetic alphabet — Sierra S, India I, Golf G, November N, Alpha A, Lima L — so in the line’s order they spell SIGNAL. A small light runs the line end to end, lighting each stop as it passes; a click on a stop rings it; a click on the horn brings an announcement that is nothing but static.",
    "references": [
      "METRO_STATIONS (metro/puzzle.js) — the six stations of the line, in the order the trains run",
      "NATO / natoLetter() — the phonetic alphabet, A to Z (ALPHA and ALFA both read A); readLine() spells SIGNAL",
      "metro/map.js paintDiagram() — the enamel plate with the stops’ names; paintLitLine() — the line, its rings and its arrow",
      "metro/map.js layoutStation() — the platform in one-point perspective; MetroScene — the running light, the signal, the failing tube"
    ]
  },
  {
    "id": "resistors",
    "key": "Resistors",
    "name": "The Workshop Bench",
    "summary": "A magnifier lamp illuminates a circuit board on the workbench.",
    "code": "1024",
    "altCode": null,
    "hint": {
      "text": "FOUR PARTS, FOUR BANDS EACH.\nThe resistors in order, and the card on the bench.",
      "sound": false,
      "tool": true
    },
    "description": "A workshop bench at night, seen from straight above like a photograph under the magnifier lamp: walnut boards, a grey anti-static mat, a multimeter whose leads rest on the board (its reading flickering round 5 V), a soldering iron smoking in its stand, a reel of solder, tweezers. On the mat lies a green circuit board — copper traces under the mask, vias, silkscreen, a chip, capacitors, a beating red LED — with four big resistors soldered in a row, R1 to R4, four colour bands on each — R1 brown black red gold, R2 black brown black gold, R3 red red orange gold, R4 yellow violet red gold. Pinned to the bench is the resistor colour code: ten swatches, black to white, a digit under each (black 0, brown 1, red 2, orange 3, yellow 4, green 5, blue 6, violet 7, grey 8, white 9), gold and silver apart as tolerances. The first band of each resistor, R1 to R4, is brown, black, red, yellow: 1 0 2 4. The code is 1024. A click on a resistor holds a loupe over it, its bands big and clear.",
    "references": [
      "RESISTORS (resistors/puzzle.js) — the four resistors' bands, R1 to R4, read from the end away from the tolerance band",
      "BAND_DIGITS / bandDigit() — the colour code, black 0 to white 9; readFirstBands() gives 1024",
      "resistorOhms() / ohmsLabel() — the values the bands actually mean (1 kΩ, 1 Ω, 22 kΩ, 4.7 kΩ)",
      "resistors/bench.js paintResistor() — a resistor and its bands; paintCard() — the colour code pinned to the bench",
      "resistors/bench.js paintLoupe() — a resistor seen big through a loupe, which ResistorsScene holds up on a tap"
    ]
  },
  {
    "id": "ripples",
    "key": "Ripples",
    "name": "Moonlight on the Water",
    "summary": "Rain disturbs a shallow puddle among the engraved paving stones.",
    "code": "DROP",
    "altCode": null,
    "hint": {
      "text": "THE RAIN RETURNS TO THREE PLACES.\nWatch the rings on the water and the stones they reach.",
      "sound": false,
      "tool": false
    },
    "description": "A wet cobbled street seen from directly above at night, washed by a distorted red neon reflection. Three fixed drip points send out circular wavefronts. Their emission delays are calculated from the distances to four engraved stones, so all three fronts really coincide on D, R, O and P during successive rounds. Other stones carry decoy letters. A brief wet gleam makes a three-way agreement readable; it is computed from the same wave geometry for every engraving. Read the four converging stones from top to bottom: DROP. The sequence repeats, including with decorative rain disabled.",
    "references": [
      "ripples/puzzle.js RIPPLE_SOURCES / RIPPLE_STONES / RIPPLE_TARGETS — the three fixed sources and the engraved paving",
      "dropTimes() / rippleFrame() — distance-based emission delays and expanding circular fronts",
      "convergence() / readConvergences() — compare three arrival times at every stone; only four stones agree",
      "ripples/street.js — wet stone, engraved letters and the reflected neon; RipplesScene animates refraction, drops and waves"
    ]
  },
  {
    "id": "vertex",
    "key": "Vertex",
    "name": "The Strange Arrangement",
    "summary": "A delicate wireframe structure hangs against dark drafting paper.",
    "code": "FACE",
    "altCode": null,
    "hint": {
      "text": "DEGREE OF CONNECTION.\nThe four pulsing points, from left to right.",
      "sound": false,
      "tool": false
    },
    "description": "An asymmetric crystal drawn only in white wireframe on blue-black drafting paper. Four actual graph vertices pulse subtly from left to right among dozens of crossing struts. Count the edges that end at each marked vertex: 6, 1, 3, 5. The second is a genuine blind branch with a single connection. Convert the degrees using A=1 through Z=26: F A C E. The inscription Degree of connection hints at graph degree. Unrelated edges stay clear of the marked points so Inspect can distinguish true connections from projected crossings.",
    "references": [
      "vertex/puzzle.js VERTEX_NODES / VERTEX_EDGES / VERTEX_MARKED — the actual displayed graph",
      "degree() / readVertex() — count incident edges, then read 6, 1, 3, 5 as FACE",
      "segmentDistance() — keeps unrelated struts clear of the marked vertices",
      "VertexScene — technical white line drawing, sequential node pulses and the Degree of connection inscription"
    ]
  },
  {
    "id": "plotter",
    "key": "Plotter",
    "name": "The Drafting Desk",
    "summary": "A green terminal glows with the instructions of a silent machine.",
    "code": "PING",
    "altCode": null,
    "hint": {
      "text": "BECOME THE MACHINE.\nThe four blocks of coordinates are instructions for a pen.",
      "sound": false,
      "tool": false
    },
    "description": "A green monochrome vector terminal displays four numbered blocks of Cartesian coordinates. Join consecutive points with straight lines, with X increasing right and Y increasing up; lift the pen and start a fresh drawing for each block. The blocks are deliberately ordered P, I, N, G: P has a vertical stem and an upper loop; I has two horizontal bars and a central stem; N has two verticals joined diagonally; G is an open square with an inward stroke. Read the four drawings in block order: PING. The display keeps all instructions visible; it never automatically draws the answer for the player.",
    "references": [
      "plotter/puzzle.js PLOTTER_BLOCKS — the four coordinate paths, in P-I-N-G order",
      "formatPath() / pathSegments() — the printed instructions and their actual line segments",
      "PlotterScene — monochrome CRT glass, four numbered blocks, coordinate orientation and tracing instruction"
    ]
  },
  {
    "id": "kinetic",
    "key": "Kinetic",
    "name": "The Nursery at Rest",
    "summary": "A baby sleeps beneath a gently swaying mobile in a moonlit purple nursery.",
    "code": "CAGE",
    "altCode": null,
    "hint": {
      "text": "A STUDY OF BOUNDARIES.\nThe wooden shapes hanging over the cot, from highest to lowest.",
      "sound": false,
      "tool": false
    },
    "description": "A baby sleeps in a pale wooden crib seen from its long side and a little from above, in a small, dark purple nursery whose side walls close in at either hand. The one warm light is a floor lamp in the far corner: it lights the wall behind it and the crib, lays the far rail’s slats in stripes across the sheet and throws the crib’s shadow forward onto the rug. The baby, its pillow, the quilt over its legs and a plush bunny are modelled in three dimensions and seen between the near slats; a small window with the moon in it stands over a dresser, toys lie on the floor. The mobile is small and brightly painted — a coral triangle, a yellow circle, a sea-green heptagon, a blue pentagon. A draft gently moves a wooden mobile above the baby. From highest to lowest, its forms are a triangle, a circle, a heptagon and a pentagon. Count the straight sides of each polygon; the label defines the circle's single unbroken curved rim as one for this puzzle. The counts 3, 1, 7, 5 map through A=1 to C A G E. Connected threads, gentle sway and restrained rotation preserve readable shapes and their vertical order. Reduced motion freezes the nursery while leaving every clue visible.",
    "references": [
      "kinetic/puzzle.js KINETIC_FORMS — triangle, circle, heptagon and pentagon with explicit rim counts",
      "polygonVertices() / kineticPose() — genuine polygon outlines and slow movement that keeps their order",
      "readKinetic() — read 3, 1, 7, 5 as CAGE",
      "KineticScene / room.js / baby.js — a moonlit nursery, a sleeping baby and a connected wooden mobile above the crib"
    ]
  },
  {
    "id": "genome",
    "key": "Genome",
    "name": "The Glass Specimen",
    "summary": "A laboratory display flickers with fragments of a genetic sequence.",
    "code": "SPACE",
    "altCode": null,
    "hint": {
      "text": "THE BUILDING BLOCKS OF LIFE.\nThe highlighted pieces of DNA, from left to right.",
      "sound": false,
      "tool": true
    },
    "description": "A laboratory monitor streams DNA sequences around a clearly framed fragment: TCT - CCT - GCT - TGT - GAA. The display specifies the DNA coding strand read 5 prime to 3 prime and the standard genetic code (translation table 1). The codons encode serine, proline, alanine, cysteine and glutamic acid; their standard one-letter amino-acid symbols spell S P A C E. An RNA codon table also works after replacing T with U, without complementing or reversing the coding strand. Decorative sequence flow and a double helix surround the stable clue. Reference may help is enabled for the codon table.",
    "references": [
      "genome/puzzle.js GENOME_FRAGMENT / STANDARD_CODE — the five DNA codons and the complete 64-codon standard table",
      "aminoAcid() / translateFragment() — standard one-letter translation, accepting DNA or corresponding RNA triplets",
      "GenomeScene — highlighted coding strand, direction, streaming sequences and procedural double helix",
      "NCBI standard genetic code: https://www.ncbi.nlm.nih.gov/datasets/docs/v2/data-processing/taxonomy-processing/genetic-codes/#1-the-standard-code-transl_table1"
    ]
  },
  {
    "id": "curtain",
    "key": "Curtain",
    "name": "The Drawing Room",
    "summary": "Moonlight enters an abandoned room through a worn velvet curtain.",
    "code": "MOTH",
    "altCode": null,
    "hint": {
      "text": "LET THE SHADOWS GUIDE YOUR EYES.\nThe curtain, and the letters on the moonlit floor.",
      "sound": false,
      "tool": false
    },
    "description": "A full moon shines through a tall Gothic window in an abandoned room. A square of moonlight falls on fifty fixed letters engraved in the floorboards. Drag the moth-eaten velvet curtain along its rail: its four irregular tears project moving pools of light, physically masking the same unchanged floor texture. At the correct position the cloth covers the rest of the square and only M, O, T and H remain lit, read from left to right. This is a translating Cardan grille; there is no rotation step or automatic answer reveal. Left/right arrows allow fine adjustment, Shift makes larger steps. Resize preserves the curtain position; replay opens it again.",
    "references": [
      "curtain/puzzle.js CURTAIN_LETTERS / CURTAIN_HOLES / tearOutline — fifty engravings and four matching physical tears",
      "curtainLightAt() / curtainShift() — one projected aperture geometry for the whole floor",
      "CurtainScene — draggable cloth and a GeometryMask over the single illuminated floor texture",
      "curtain/room.js — Gothic window, velvet folds, engraved boards and projected moonlight"
    ]
  },
  {
    "id": "thesill",
    "key": "TheSill",
    "name": "The Window Ledge",
    "summary": "Everyday objects rest in silhouette along an old moonlit window.",
    "code": "WAKE",
    "altCode": null,
    "hint": {
      "text": "READ THE LIGHT, NOT THE DARK.\nLook at the floor beneath the window.",
      "sound": false,
      "tool": false
    },
    "description": "A low view of an old window: leaning books, a wine bottle, an unlit candlestick, a vase and a mantel clock stand in silhouette against diffuse moonlight. Their long overlapping shadows reach towards the viewer across the floorboards. Read the light left between those dark shapes: four polygonal gaps spell W A K E from left to right, with the triangular counter of A remaining shadow. The composition is a single static painting; no object needs moving and no word is overlaid or revealed on click. The puzzle is the figure/ground reversal itself, including with ambient effects disabled.",
    "references": [
      "thesill/puzzle.js SILL_APERTURES / aperturePoints — actual light outlines and the dark counter of A",
      "thesill/sill.js paintSill — overlapping cast silhouettes with the apertures cut from the shadow field",
      "TheSillScene — one static room texture, resizing and the negative-space clue"
    ]
  },
  {
    "id": "venetian",
    "key": "Venetian",
    "name": "An Evening in Venice",
    "summary": "Beyond the lowered blinds, a thousand distant windows shine.",
    "code": "CITY",
    "altCode": null,
    "hint": {
      "text": "FOCUS THROUGH THE NOISE.\nThe blinds, and the city lights behind them.",
      "sound": false,
      "tool": false
    },
    "description": "A high-rise window overlooks thousands of cold and amber city lights through lowered Venetian blinds. Drag the cord up or down to tilt the horizontal slats. The city is one immutable image: narrow rows of lights forming CITY are interleaved with four rows of distracting lights per band. The cord changes only the openings of the opaque barrier. Near the correct angle, the slits pass the letter rows and cover the interference; at other angles the same word falls back into visual noise. Nothing swaps or fades in a separate answer image. Up/down arrows make fine adjustments, Shift makes larger steps. Resize retains the tilt; replay restores the noisy starting view.",
    "references": [
      "venetian/puzzle.js cityLights() / cityLetterAt() — deterministic interlaced city and actual letter strokes",
      "blindSlits() / lightPassesBlind() — the moving barrier apertures, independent of the image",
      "venetian/city.js paintVenetian — static skyline, thousands of lights and the window frame",
      "VenetianScene — draggable cord, horizontal slats and a GeometryMask over the unchanged city texture"
    ]
  }
];

export const LEVEL_METADATA = Object.freeze(metadata.map((level) => Object.freeze({
  ...level,
  hint: Object.freeze({ ...level.hint, steps: Object.freeze([level.hint.text, ...HINT_DETAILS[level.id]]) }),
  references: Object.freeze(level.references),
})));
