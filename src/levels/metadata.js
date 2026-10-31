// One source for game answers, Info requirements and the reference ledger.
// Keep IDs stable when renaming or reordering levels; IDs are used in saves.
import { HINT_DETAILS } from './hints.js';

const metadata = [
  {
    "id": "binarytree",
    "key": "BinaryTree",
    "name": "The Old Tree",
    "summary": "A living specimen grows inside Ivy's glazed oak root case, its branching roots marked with paper tags.",
    "code": "CABBAGE",
    "altCode": null,
    "hint": {
      "text": "THE ROOTS GROW UPWARDS.\nThe note beside the tree is not a doodle — each line on it is a journey.",
      "sound": false,
      "tool": false
    },
    "description": "An original Blender/Cycles close-up of Ivy's glazed oak root-observation case on a walnut bench. Real clear glass, tarnished brass hardware, photographed loam detail and original scanned Pelargonium leaves share one physically lit scene. The continuous root forks exactly three times to eight physical paper tags, left to right: B G A E D C H F. Seven brass route plaques read RLR, LRL, LLL, LLL, LRL, LLR, LRR. Follow each route from the stem, choosing the left or right branch at every fork: C, A, B, B, A, G, E. Everything needed is rendered into the scene; the player observes and enters CABBAGE. Camera-derived bounds keep every clue visible when resizing.",
    "references": [
      "binarytree/puzzle.js BINARY_PATHS / BINARY_LEAVES — the original seven routes and eight tip letters; also read directly by the Blender builder",
      "art/blender/old_tree.py and old_tree_publish.mjs — complete native specimen, physical clues, packed editable scene and publication",
      "binarytree/nativeTree.json — protective image bounds projected through the actual render camera"
    ]
  },
  {
    "id": "plantpot",
    "key": "PlantPot",
    "name": "The Moonlit Garden",
    "summary": "An oil lamp lights a potting bench on the manor's open garden terrace.",
    "code": "FIBO",
    "altCode": "FIBONACCI",
    "hint": {
      "text": "WATER THE PLANT.\nWatch what each pour brings out of it.",
      "sound": false,
      "tool": false
    },
    "description": "Dragging the galvanized pail to the terracotta pot waters the plant; five pours add 1, 1, 2, 3 and 5 leaves. One Pelargonium specimen grows on the worn oak workbench outside, seen through an open manor window. Its individual leaf meshes retain the photographed specimen's folds, lobed margins, veins and surface detail. Moonlight and an old oil lamp illuminate the workbench and wet stone; beyond the terrace steps, a narrow track disappears into dark woodland, with dense crowns, irregular trunks and faint cool haze between distant trees. The scene contains no written formula. The growing pattern is the Fibonacci sequence; its name gives FIBO or FIBONACCI.",
    "references": [
      "LEAF_DEFS (PlantPotScene.js) — the leaves each pour brings: 1, 1, 2, 3 and 5, and where on the new branch they grow",
      "SEGMENTS — the plant's five branches, one per pour, in cm from the soil; paintStems() (plant.js) draws them as they grow",
      "triggerPour() / _pourPoint() — dragging the bucket over the pot tips it and pours",
      "art/blender/fibonacci_garden.py and fibonacci_geranium.py — complete Blender exterior and original photographed leaf meshes; the same source supplies gameplay branch and leaf positions. fibonacci_publish.mjs exports Cycles layers and the actual bucket contact shadow."
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
    "description": "An original Blender/Cycles close-up of the square walnut-mounted brass cipher wheel from Room I: machined concentric rings, a turned thumb grip, patina, physical luminous Roman letters, three hollow dripped beeswax candles and a wax-sealed rag-paper envelope. Eight native photographs preserve each candle's individual illumination and shadows. Each candle goes out with one click; their number hints at shift 3. After the last, the two alphabets become readable and the inner disc turns. The letter has its own native photograph, with actual ink reading WKH DQVZHU / LV URWRU. A Caesar shift of three decodes THE ANSWER IS ROTOR. Sixteen original Blender flame frames animate over camera-projected wicks. The original answer and puzzle mechanics are retained.",
    "references": [
      "cryptex/puzzle.js CRYPTEX_CIPHER / CRYPTEX_ALPHA — shared cipher and alphabet, read by the Blender builder",
      "Candles.blow() (Candle.js) — one click extinguishes each candle; the existing flame, ember and smoke lifecycle uses the native flame atlas",
      "art/blender/candlelight_brass.py and candlelight_brass_publish.mjs — original apparatus, eight illumination states, luminous rotor and physically lit letter",
      "NativeCryptexScene.js / nativeCryptex.json — projected interaction geometry, candle-light mixing and the rotating native rotor"
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
    "description": "The games table in Room III (a Blender render, the same set as the room shows): a maple-and-walnut board with the algebraic coordinates inlaid in boxwood round its frame, lit by a candle at the table's corner, holds 8 boxwood and ebony Staunton pieces, one per rank: Rook h1, White King e2, Pawn a3, Black Queen d4, Black King a5, Knight c6, White Bishop h7, Black Bishop e8. Reading the FILE letter of each piece in rank order 1→8 gives h-e-a-d-a-c-h-e. Pieces can be picked up but always snap back to their home square, so the message can't be scrambled.",
    "references": [
      "CHESS_PIECES — exact squares: h1, e2, a3, d4, a5, c6, h7, e8",
      "CHESS_FILES = \"abcdefgh\" — the only coordinate tool the level offers",
      "_placePieces() — pieces always settle back to their home square",
      "art/blender/chess_set.py (board, pieces from Poly Haven chess_set, CC0), chess_game.py (the level's render), room_cabin.py (the room)"
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
    "description": "An old router on a desk in a lamplit room at night shows the word HTTPS as ASCII binary, one letter at a time across its seven right-hand LEDs — each letter's 7-bit ASCII code at once (the always-zero leading bit has no LED; a plain space stands between the counters and the letter), an LED lit for each 1 bit and dark for each 0, the first bit on the left, held for a few seconds. After each full letter, one of five \"counter\" LEDs lights solid red, confirming a 5-letter word once all five are lit. The router's maker's name printed on its front, \"W. LEIBNIZ\", nods to Gottfried Leibniz, inventor of binary notation, hinting that the blinking should be read as binary.",
    "references": [
      "modem/puzzle.js: MODEM_WORD = \"HTTPS\", planTransmission() — ASCII binary LED schedule",
      "modem/NativeModemScene.js — original transmission drives twelve separately rendered optical/reflection layers",
      "art/blender/modem_room.py — original Blender room and router; exactly five counter lenses, a gap, seven bit lenses, and the W. LEIBNIZ maker clue",
      "modem/nativeModem.json — camera-projected LED crops and safe full-screen framing",
      "art/blender/modem-room-sources.md — photographed CC0 resource provenance and native render pipeline"
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
    "description": "An original Blender observatory opens onto a clear night sky above a wooded valley. The oak window, brass telescope, stars and NASA-textured lunar sphere are rendered in Cycles. Entering from the house opens the full-screen sky; standalone play retains the telescope approach. Among the scattered stars, five groups sit on a perfect 2×3 grid — Braille cells (dot layout 1 4 / 2 5 / 3 6). Hovering one slowly lights a faint line through its dots. Reading them left to right: O=1,3,5 · R=1,2,3,5 · I=2,4 · O=1,3,5 · N=1,3,4,5, spelling O-R-I-O-N.",
    "references": [
      "telescope/puzzle.json — ORION dot numbers, exact 2×3 grid and vertical group order",
      "art/blender/open_window.py — original Cycles window, sky, Moon and telescope geometry",
      "telescope/nativeWindow.json — camera-projected stars, window aperture and telescope bounds",
      "telescope/constellations.js — existing slow constellation guide, aligned with the rendered stars",
      "art/blender/open-window-sources.md — NASA lunar data and photographic CC0 surface provenance"
    ]
  },
  {
    "id": "wires",
    "key": "Wires",
    "name": "Before Sunrise",
    "summary": "A framed farmhouse at dawn, with six birds perched on five wires.",
    "code": "FACADE",
    "altCode": null,
    "hint": {
      "text": "THE MORNING CHOIR.\nLook at the birds sitting on the wires.",
      "sound": false,
      "tool": true
    },
    "description": "Room IV's framed picture (a Blender render, hung in the room and seen close in the level) shows the minute before sunrise from a hilltop meadow: an old stone cottage, its porch lantern still burning and an old man in a rocking chair with a harmonica; a telegraph pole with five wires; the valley below under its mist. Six blackbirds perch on the five wires, read bottom to top as D, F, A, C, E. From left to right their positions spell F, A, C, A, D, E. The picture is still; the optional harmonica recording is atmosphere. Listening or playing an instrument is not required. This picture replaces the former pedestrian-crossing puzzle.",
    "references": [
      "wires/puzzle.js WIRE_BIRDS and WIRE_NOTES — six birds, five wire positions, FACADE",
      "art/blender/dawn_country.py — the picture: the birds put on their wires where WIRE_BIRDS has them across the picture; dawn_frame.py — framed on Room IV's wall for the level",
      "Optional ambience: assets/sounds/Wires/music.mp3"
    ]
  },
  {
    "id": "station",
    "key": "Station",
    "name": "The Ticket Drawer",
    "summary": "A drawer of old train tickets, each stamped with what became of its train.",
    "code": "EXIT",
    "altCode": null,
    "hint": {
      "text": "A DRAWER OF OLD TICKETS.\nOnly the trains that were still boarding.",
      "sound": false,
      "tool": false
    },
    "description": "Room IV's top drawer, pulled out of its mahogany chest and seen from above by candlelight (a Blender render): hundreds of old card tickets standing in rows at the back, and in front, laid out in two rows of four, eight Edmondson card tickets in the departures board's order. Only 4 are stamped BOARDING — GENETA 22:41, MOXCOW 22:07, PERIS 21:03, LINDON 22:24 (the rest are stamped cancelled/delayed/no service, and are filler). Each boarding destination has one misspelled letter, printed a little low and askew: P(E)RIS, MO(X)COW, L(I)NDON, GENE(T)A. Sorted by departure time — 21:03 PERIS→E, 22:07 MOXCOW→X, 22:24 LINDON→I, 22:41 GENETA→T — the wrong letters read E-X-I-T. Every ticket is dated 13 OC 61; LINDON is the one half-fare (HALF · CHILD), as the room's story says.",
    "references": [
      "STATION_ROWS (station/rows.js) — time, dest, remark, wrongIdx fields",
      "wrongIdx — the anomalous letter index in each destination",
      "only remark === \"BOARDING\" rows matter; sort key is time",
      "art/blender/ticket_faces.mjs prints the faces from rows.js; ticket_drawer.py renders the drawer (ticket-drawer-v1.webp, ticketDrawer.json)"
    ]
  },
  {
    "id": "pi",
    "key": "Pi",
    "name": "The Lit Tree",
    "summary": "Nobody took the Christmas tree down, and some of its lamps are still alight.",
    "code": "PI",
    "altCode": "3.14",
    "hint": {
      "text": "THE TREE IS STILL LIT.\nIts lamps are worth counting, tier by tier.",
      "sound": false,
      "tool": false
    },
    "description": "Room V's corner at night, close to (a Blender render of the room's own scene): a Christmas tree with a string of lamps along each of its nine tiers. The count of lamps alight per tier, top to bottom, is 3, 1, 4, 1, 5, 9, 2, 6, 5 — the digits of π. Which holders are alight within a tier is spread evenly along the string and irrelevant; only the count per tier matters. The lit lamps twinkle but never go out. Hovering the moon in the window draws a line straight across it. The tall green parcel under the tree opens: out of it jump a rule, a protractor and a pair of compasses.",
    "references": [
      "ALIGHT = [3,1,4,1,5,9,2,6,5] (art/blender/room_drawing.py) — lit-lamp count per tier, top to bottom, rendered so",
      "room_drawing.py --view tree (tree_level_passes.py) — the level's render; treeLevel.json lists the lamps alight, the moon, the parcel, the instruments",
      "_makeLamps() — each lamp alight twinkles over the render"
    ]
  },
  {
    "id": "crossing",
    "retired": true,
    "key": "Crossing",
    "name": "The Painted Crossing",
    "summary": "A painting of a quiet street at night, and its worn pedestrian crossing.",
    "code": "GO",
    "altCode": null,
    "hint": {
      "text": "MIND THE CROSSING.\nLook down at the stripes painted on the road.",
      "sound": false,
      "tool": true
    },
    "description": "The painted pedestrian crossing is a Code 39 barcode for GO. Read the wide and narrow stripe pattern from the near curb to the far curb to decode the two letters. In the house the street hangs as a painting: nothing in it moves.",
    "references": [
      "CR_WORD = \"GO\" — the encoded string",
      "CR_CODE39 — letter → wide/narrow bar pattern lookup",
      "_drawBarcodeCrossing() — renders only the bar elements as painted stripes"
    ]
  },
  {
    "id": "flags",
    "key": "Flags",
    "name": "The Trophy Wall",
    "summary": "Shelves of cups and certificates from a botanical olympiad; five medals hang on ribbons in their countries' colours.",
    "code": "DEBRIEFING",
    "altCode": null,
    "hint": {
      "text": "THE TROPHY WALL.\nThe ribbons on the medals, left to right.",
      "sound": false,
      "tool": true
    },
    "description": "A botanist's bookshelves at night hold what was won at the International Botanical Olympiad — gold cups in laurel on plinths, certificates, scrolls, potted plants, books — with a rainy window and a microscope on the right. From the upper shelf's edge hang five medals on broad ribbons, each ribbon a national flag, left to right: Germany, Brazil, Ireland, Finland, Nigeria; the medals bear plants in relief and the words BOTANICAL OLYMPIAD, but no country is named. Concatenating each country's ISO two-letter code in that order — DE + BR + IE + FI + NG — spells DEBRIEFING. The cups and loose medals carry no flag.",
    "references": [
      "FLAG_CODES = [\"DE\",\"BR\",\"IE\",\"FI\",\"NG\"] (flags/flagDesigns.js) — left-to-right order of the medals = code order",
      "flagDesigns.js paintDesign() — per-flag colored geometry, no text labels drawn; trophies.js paintMedal() — each medal's ribbon is its country's flag (RIBBON)"
    ]
  },
  {
    "id": "herbarium",
    "key": "Herbarium",
    "name": "Ivy's Herbarium",
    "summary": "Her book of pressed plants, open on the table under the window.",
    "code": "HEDGE",
    "altCode": null,
    "hint": {
      "text": "DRAWN ROUND.\nOne on every page.",
      "sound": false,
      "tool": false
    },
    "description": "In Room VI, Ivy's herbarium lies open on the walnut console table under the window, by the moon and the room's warm lamp: a sewn album in faded green book-cloth, its heavy cotton pages gone to cream, her pencil, brass tweezers and a roll of gummed strip beside it, a leaf of ivy and a rose's petal fallen out onto the table. Each of five pages carries two pressed specimens held down by strips of gummed paper — one large hedgerow cutting and one smaller plant — with fine veins, thin translucent petals, flattened stems and thorns; Latin names are written below each plant in her hand. On each page the large specimen has a pencil figure around it: page I eight sides round the hawthorn (with a daisy), II five round the dog rose (with an oak leaf and acorn), III four round the ivy (with ribwort plantain), IV seven round the blackthorn (with beech), V five round the privet (with a primrose). Counting the sides as alphabet positions gives HEDGE. Two pages show at a time; a click or drag turns a leaf. Nothing on screen says to count.",
    "references": [
      "PAGES (herbarium/puzzle.js) — the specimens of each page, the ringed one carrying its figure's sides [8, 5, 4, 7, 5]; herbariumWord() spells HEDGE",
      "art/blender/herbarium_desk.py and herbarium_plants.py (herbarium_publish.mjs) — the table and the open album rendered from straight above in Cycles, and each of the five pages rendered on its own top sheet with its two pressed specimens built procedurally; herbarium/book.js lays her Latin names and pencil figures over them (herbariumDesk.json: where the sheets lie)",
      "HerbariumScene — two pages at a time, turned by clicking the right page (forward) or the left (back)",
      "room6 (art/blender/room_vi.py) — the album shut in its faded green book-cloth on the console table under the window, and the thing that opens it"
    ]
  },
  {
    "id": "cot",
    "key": "Cot",
    "name": "His Cot",
    "summary": "The boy's cot, made up as if for the night, his mobile over it and his things on the sheet.",
    "code": "TORCH",
    "altCode": null,
    "hint": {
      "text": "HIS COT.\nWhat answers your hand, left to right.",
      "sound": false,
      "tool": false
    },
    "description": "In Room VI, the boy's dark mahogany cot opens into an original Blender/Cycles nursery: turned joinery, brass screws, woven moon-and-star cotton, shallow sheet wrinkles, sewn mattress piping, teal plaster, botanical curtains and a warm pleated bedside lamp. Fifteen belongings are modeled into the render with real shadows: a linen pillow, knitted bootees, mohair bear, rattle, knitted rabbit, folded blanket, pull-along duck, locomotive, rocking horse, alphabet blocks, stitched leather ball, stacking rings, spinning top, fire engine and linen elephant. The five clues and sewn mobile are live 3D meshes using the exact Blender camera and CC0 material scans. Resizing preserves the image's proportions; a separate transparent render of the lowered front rail occludes the toys correctly. Left to right: a walnut tango music box with turning porcelain dancers, a gold Oscar replica, a red Romeo and Juliet, a Chaplin figurine with modeled eyes and moustache that raises its bowler, and a cream hotel with an entrance canopy, HOTEL sign, reception bell and windows that light when it rings. Their radio-alphabet words give TORCH. Only these five objects answer clicks and drags. Positions and active interactions survive resizing; reduced motion keeps the toys usable with restrained effects.",
    "references": [
      "TOYS (cot/puzzle.js) — the five left to right, the radio word each is and where each lies in the cot; cotWord() spells TORCH",
      "art/blender/his_cot.py and his_cot_publish.mjs — original modeled nursery and fifteen fixed belongings, Cycles room and transparent front rail; his-cot-sources.md records provenance",
      "cot/nativeArt.js and nativeCot.json — exact Blender camera and aspect-preserving layout; cot/stage3d.js, toys3d.js, mobile3d.js and materials3d.js — five live clues, a sewn mobile, CC0 material scans and live shadows",
      "CotScene — the five answer a click (the tango and its turning dancers, a glint, the book opened, the hat raised, the bell and the lit windows), can be carried within reach, and keep their positions on resize; the mobile turns on its own",
      "cot/inRoom.js and room6/photographicRoom.js — a matching photographic cot and mobile in the room overview, the same five toy photos behind a front-spindle mask, and the calibrated cot interaction area"
    ]
  },
  {
    "id": "tapcode",
    "key": "TapCode",
    "name": "Marks in Stone",
    "floor": "Basement",
    "summary": "Down in the cellar, someone has cut small marks into a smooth stone in the wall.",
    "code": "ESCAPE",
    "altCode": null,
    "hint": {
      "text": "KNOCK TWICE.\nThe marks cut into the great stone.",
      "sound": false,
      "tool": true
    },
    "description": "In the cellar, a smooth stone let into the brick carries 6 lines of tally marks, two clusters per line, following a 5×5 prisoner's tap code: the alphabet A–Y row by row, Z spilling past the end of the last row. Each letter of ESCAPE becomes a (row, column) pair rendered as that many carved marks: E=(1,5), S=(4,4), C=(1,3), A=(1,1), P=(4,1), E=(1,5). The empty bottle rack, five holes by five, is the grid; a Z scratched on the wall just past the end of its bottom row says the letters run through it in order.",
    "references": [
      "TAP_WORD = \"ESCAPE\", TAP_GRID = A–Y in a 5×5 grid, Z past the end of row 5",
      "tapPair() — converts a letter to its (row, col) grid position",
      "paintSlab() (tapcode/cellar.js) — carves row marks, a gap, then column marks per letter"
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
    "description": "Six numbered rally cars come round a floodlit gravel oval at night and cross the finish line in order: 19, 9, 12, 22, 5, 18. Interpreting each number as an alphabet position (A=1 through Z=26) spells SILVER. After the last car, the floodlights go out and a podium appears. The race runs once; replay runs it again. The optional car recording is atmosphere and is not required to solve the level. In the house the stage is watched on the drawing room's television. It plays as an old VHS tape of the broadcast — scanlines, grain, tracking noise, the recorder's PLAY in the corner — with the broadcaster's caption across the top, \"THE GRAND NIGHT RALLY / FINAL STAGE · THE CHAMPIONSHIP IS DECIDED TONIGHT\" (no figures in it: the cars' numbers stay the only ones on screen).",
    "references": [
      "RALLY_NUMBERS = [19, 9, 12, 22, 5, 18] (puzzle.js) — the door numbers, in order of crossing",
      "RALLY_CROSS_MS — original crossing times [0, 3000, 3506, 6506, 7256, 7762] and RALLY_CAR_MS are divided by RALLY_PACE (0.77), running at 77% of base pace while preserving their spacing; tight pairs cross about 657 ms apart",
      "RALLY_SPEED — each car runs a touch faster or slower; the crossing times stay exact",
      "track.js — the oval as one projection: a car's size follows from its height below the horizon, and it is never tilted",
      "cars.js — one 3D rally car rendered in software at every angle the drive needs (FRAME_COUNT views; side-on, exactly, at the line); paintPanel() puts the number on the white door panel",
      "stage.js — the floodlit stage, its ground lit pixel by pixel by the real lamps; CAR_LANES keeps each car on its own line, the close pairs one near and one far",
      "_planRound() / _runRace() — work out launches and whooshes from RALLY_CROSS_MS, then lights out, then the podium (RALLY_PODIUM_MS later); the race runs once",
      "_soundLead() — measures the loudest moment of wroom.mp3 so it lands on the line",
      "podium.js: RY_WINNERS — the top three and their cups; drawPodium() paints the board",
      "vhs.js: addVhs() — the tape look over the picture and RACE_CAPTION, the broadcaster's caption"
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
    "description": "A desk in Room II at night, a Blender render lit by one green banker's lamp: four electronic clocks — a red LED clock on the walnut panelling (22:03), a clock radio on a shelf (14:11), an amber alarm clock (11:47) and a folding LCD travel clock (23:44) on the desk — and on the desk's leather an adding calculator (digits, 00, +, = and C). Read each clock as a plain number, the colon ignored, and add them: 2203 + 1411 + 1147 + 2344 = 7105. The calculator's seven-segment display, turned upside down, reads SOIL: read from the last digit to the first, 5 is S, 0 is O, 1 is I and 7 is L. The calculator does not turn over; the player reads the display upside down without any help from the game.",
    "references": [
      "OVERTIME_CLOCKS = [\"22:03\", \"14:11\", \"11:47\", \"23:44\"] — the four clocks; the order does not matter, all are added",
      "clockNumber() / overtimeTotal() — 22:03 → 2203; 2203 + 1411 + 1147 + 2344 = 7105",
      "readUpsideDown() — reverses the digits and maps 5→S, 0→O, 1→I, 7→L (also 2→Z, 3→E, 4→H, 6/9→G, 8→B)",
      "SEGMENTS / turnSegments() — the seven-segment digit shapes; turned through 180° they are the letters",
      "createCalculator() / pressKey() — the adding calculator: digits, 00, +, =, C; eight digits, then E until C",
      "OvertimeScene — lays the render (art/blender/overtime_office.py; officeRender.json) and draws the calculator's display, key presses, blinking colons and steam over it",
      "segments.js glyph() — the seven-segment shapes the display draws (also the touch keypad's)"
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
    "summary": "A miniature captain's study glows inside an old glass bottle on its walnut cradle.",
    "code": "LOST",
    "altCode": null,
    "hint": {
      "text": "THE NEEDLE WILL NOT SETTLE.\nOpen the map lying on the table.",
      "sound": false,
      "tool": false
    },
    "description": "On an old oak desk, a thick-walled, faintly green glass bottle lies in carved walnut saddles, closed with a pitted cork and linen cord. Inside is a hand-built miniature captain's study: individually laid teak boards, walnut panelling and bent roof ribs, a fitted cupboard of leather and cloth books, a little writing desk with turned legs and brass drawer pulls, a chair, globe, coiled linen rope, wall clock and a warm hanging oil lantern. The large gimballed brass compass faces the eye, its original ivory card ruled to the degree, every 30 degrees numbered and the four winds lettered. Its changing needle is rendered in 72 Cycles poses through the same bottle glass, preserving the actual refraction and shadows. A red-wax-sealed envelope on the desk opens to an original chart printed on realistically lit, gently wrinkled cotton paper. Four lines of bearings preserve the puzzle: 180 180 90 / 270 180 180 90 90 0 0 270 / 270 270 180 90 90 180 270 270 / 90 90 270 180 180. North is 0, east 90, south 180, west 270; each bearing is one step and each line draws one letter, spelling L O S T. The needle follows the same bearings, with a spin between lines and a kick at repetitions; tapping the compass restarts the sequence. The photograph fills the game viewport, and the map remains open across resizing.",
    "references": [
      "COMPASS_BEARINGS (compass/puzzle.js) — the four lines of the map, one letter each",
      "walk() / drawBearings() — one unit step per bearing (0 up, 90 right, 180 down, 270 left); drawBearings shows the letter as # marks",
      "art/blender/captains_bottle.py — original Cycles bottle, miniature cabin, gimballed compass and matching needle poses; captains_bottle_publish.mjs generates original chart and dial artwork from COMPASS_BEARINGS",
      "compass/bottleCabin.js and nativeBottle.json — full-viewport render, calibrated glass and map interaction areas, native needle atlas and separately rendered paper chart",
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
      "art/blender/library_lamplight.py — original Cycles room, sleeping tabby, gilt spine titles and numbered paper bookmarks; nine physical pull poses per book",
      "art/blender/library_lamplight_publish.mjs — prepares the five clues from BOOKS, publishes the room and 45-pose atlas with projected interaction bounds",
      "bookshelf/NativeBookshelfScene.js and nativeLibrary.json — the five books on the third shelf pull out and slide home with their rendered shadows; steam and dust stay alive"
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
    "description": "Silas’s bench in his laboratory (Room VII), close to, at night: an oil lamp’s light from the left, the blue flame of a Bunsen burner under a flask boiling on its tripod, a rack of test tubes at the back. Across the bench stand five glass vessels of coloured liquid — a conical flask, a round flask, a jar, a measuring cylinder, a beaker — each with a fine white scale printed up its front, too small to read by eye. A magnifying glass lies on a green cloth at the front: click it and it becomes the pointer, enlarging whatever it is held over (click the cloth, or press Escape, to put it down). Under the lens each liquid, read at the bottom of its meniscus, stands at a numbered division of its scale: 9, 8, 6, 92, 16. They are atomic numbers: fluorine F, oxygen O, carbon C, uranium U, sulfur S — F O C U S. Each liquid has its element’s colour (pale yellow, pale blue, black, a glowing uranium green, sulfur yellow). The faded periodic table hangs on the room’s back wall. With the glass put down, a click on a bottle rings it; a click on the burner turns up the gas.",
    "references": [
      "BOTTLES (chemistry/puzzle.js) — the five atomic numbers marked at the menisci, left to right",
      "ELEMENTS / symbolOf() — every element's symbol by atomic number; readBottles() spells FOCUS",
      "cellOf() / familyOf() — each element's place and family on the room's periodic table (lab_boards.mjs)",
      "art/blender/room_lab.py --view bench (bench_level_passes.py, bench_level_publish.mjs) — Room VII's own bench rendered close in Cycles: the plate, the cloth with the glass taken up, the bottles again at three times the size for the lens (benchLevel.json); lab_boards.mjs prints each bottle's scale from SCALES (chemistry/puzzle.js), and each liquid is filled to its number",
      "chemistry/ChemistryScene.js — the lens over the render, the burner's live flame, bubbles, steam, the uranium's glow"
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
    "summary": "A line diagram is screwed to the wall of a deserted underground platform.",
    "code": "PYLON",
    "altCode": null,
    "hint": {
      "text": "THE LAST TRAIN HAS GONE.\nThe line diagram on the platform wall, in the direction the trains run.",
      "sound": false,
      "tool": true
    },
    "description": "A real underground platform late at night, seen down its length: the track in its trench running into the tunnel under a signal lamp that turns from red to green and back, a platform wall of glazed tile with the station’s name on it, posters, a bench, a tannoy horn, a row of fluorescent tubes overhead with one of them failing, the way out lit at the far end. On the platform wall, close by and running away with it in the station’s perspective, is the enamel line diagram: Line 6, eastbound, its five stops in order from the top — Papa Wharf (marked YOU ARE HERE), Yankee Dock, Lima Road, Oscar Square, November Street — and an arrow at the bottom for the way the trains run. Their first words are the NATO phonetic alphabet, none of them its famous letters — Papa P, Yankee Y, Lima L, Oscar O, November N — so in the line’s order they spell PYLON. A small light runs the line end to end, lighting each stop as it passes; a click on a stop rings it; a click on the horn brings an announcement that is nothing but static.",
    "references": [
      "METRO_STATIONS (metro/puzzle.js) — the five stations of the line, in the order the trains run",
      "NATO / natoLetter() — the phonetic alphabet, A to Z (ALPHA and ALFA both read A); readLine() spells PYLON",
      "metro/map.js paintDiagram() — the enamel plate with the stops’ names, drawn flat and laid on the wall by onWallPlate(); paintLitLine() — the line, its rings and its arrow",
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
    "summary": "A green terminal glows beside a pen plotter waiting over a clean sheet.",
    "code": "PING",
    "altCode": null,
    "hint": {
      "text": "BECOME THE MACHINE.\nThe four blocks of coordinates are instructions for a pen.",
      "sound": false,
      "tool": false
    },
    "description": "A drafting table in a dark room at night, seen from where one sits at it: a graphic display terminal in a dark steel case with its keyboard, and beside it under a drawing lamp a flatbed pen plotter, its arm idling over a clean sheet of squared paper; a mug on the table, a window behind with the moon over the roofs, one old plot of a curve pinned to the wall. The lamp and the tube are the only light. The terminal’s green tube displays four numbered blocks of Cartesian coordinates. Join consecutive points with straight lines, with X increasing right and Y increasing up; lift the pen and start a fresh drawing for each block. The blocks are deliberately ordered P, I, N, G: P has a vertical stem and an upper loop; I has two horizontal bars and a central stem; N has two verticals joined diagonally; G is an open square with an inward stroke. Read the four drawings in block order: PING. The display keeps all instructions visible; it never automatically draws the answer for the player.",
    "references": [
      "plotter/puzzle.js PLOTTER_BLOCKS — the four coordinate paths, in P-I-N-G order",
      "formatPath() / pathSegments() — the printed instructions and their actual line segments",
      "PlotterScene — monochrome CRT glass, four numbered blocks, coordinate orientation and tracing instruction"
    ]
  },
  {
    "id": "kinetic",
    "key": "Kinetic",
    "name": "The Games Cupboard",
    "summary": "Four old board games stand face out on the middle shelf of a cupboard.",
    "code": "CAGE",
    "altCode": null,
    "hint": {
      "text": "A STUDY OF BOUNDARIES.\nThe pieces on the lids, from left to right.",
      "sound": false,
      "tool": false
    },
    "description": "A tall oak cupboard stands with both doors open, lit by a lamp out of the picture. Games are stacked flat on its top and bottom shelves, only their plain spines showing, with a box of chessmen and a pack of cards. On the middle shelf four board-game boxes stand face out, side by side, each lid painted with one big wooden game piece: left to right a coral triangle, a yellow disc, a sea-green heptagon and a blue pentagon. A card pinned inside the right-hand door reads \"One unbroken curve counts as one.\" Count each piece's sides — the disc's single curved rim counts as one — and read them left to right: 3, 1, 7, 5, which map through A=1 to C A G E. A click on a box only rocks it on the shelf.",
    "references": [
      "kinetic/puzzle.js GAME_LIDS — triangle, circle, heptagon and pentagon with explicit rim counts, in shelf order",
      "polygonVertices() — genuine polygon outlines for the pieces; cupboardLayout() — where the lids stand",
      "readKinetic() — read 3, 1, 7, 5, left to right, as CAGE",
      "KineticScene / cupboard.js — the open cupboard, the stacked games, the four lids and the card inside the door"
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
  },
  {
    "id": "molecules",
    "key": "Molecules",
    "name": "Silas's Notebook",
    "summary": "Silas's laboratory notebook lies open: one molecule drawn on each page.",
    "code": "SHIP",
    "altCode": null,
    "hint": {
      "text": "WHAT HE DREW.\nEach page is one element, drawn as its molecule.",
      "sound": false,
      "tool": true
    },
    "description": "In Silas's laboratory (Room VII) his notebook stands among the books of the bookcase on the right wall — a click draws it a little way out of the shelf and it opens by itself — and it lies open on a desk under the lamp. Four pages carry graphite chemistry diagrams, each followed by observations about appearance, structure and properties: a puckered ring of eight atoms in a yellow crystalline solid; a small pair in the lightest gas; a larger pair in dark crystals that give a violet vapour; a tetrahedron of four in a white waxy solid. The names, formulas and symbols are not printed: the molecules are S₈, H₂, I₂, P₄. Two pages show at a time; clicking the right page turns forward, the left page back. Recognising each element and reading their symbols in page order spells SHIP.",
    "references": [
      "MOLECULES (molecules/puzzle.js) — the four pages in order; readNotebook() spells SHIP",
      "art/blender/notebook_desk.py — the desk and the open notebook, a Blender render laid out to book.js NOTEBOOK (notebookDesk.json)",
      "molecules/book.js paintPage() and molecules/sketch.js drawMoleculeSketch() — graphite diagrams with three observations per page; chemistry-notes.md records sources",
      "MoleculesScene — two pages at a time, turned by clicking the right page (forward) or the left (back)"
    ]
  },
  {
    "id": "phials",
    "key": "Phials",
    "name": "Two Phials",
    "summary": "A little rack by the sinks: a phial of yellow, a phial of blue, an empty tube, and a tag in his hand.",
    "code": "GREEN",
    "altCode": null,
    "hint": {
      "text": "WHO WAS SHE?\nAnd what did she love to grow?",
      "sound": false,
      "tool": false
    },
    "description": "In Silas's laboratory (Room VII), at the end of the counter by the sinks, a little walnut rack holds three tubes: a corked phial of yellow, an empty tube, and a corked phial of blue. A paper tag tied to the rack's post says, in his hand, \"For my sister.\" A click lifts a tube from the rack and holds it up to the light; another puts it back. They are never mixed: the empty tube waits for it. His sister was Ivy, the botanist — the colour of what she grew is the colour yellow and blue make together: GREEN. Nothing on screen says what to do with the colours.",
    "references": [
      "PHIALS_WORD = 'GREEN' (phials/puzzle.js); RACK — yellow, the empty tube, blue; TAG = 'For my sister.'",
      "art/blender/room_lab.py --view phials (phials_level_passes.py) — Room VII's counter close to, a Blender render: the rack, the tag, and the three tubes (clear glass) cut apart to be lifted; phialsLevel.json",
      "PhialsScene — a click lifts a tube vertically through its rack hole before it tilts toward the light; another puts it back. The rack's photographic front face hides the seated tubes correctly; raised positions survive resizing and respect reduced motion. The tubes are never mixed",
      "room7/Room7Scene.js and art/blender/room_lab.py — the walnut rack rendered at the end of the counter of sinks, its tag tied to the post, and the thing that opens the puzzle"
    ]
  },
  {
    "id": "balance",
    "key": "Balance",
    "name": "The Apothecary's Balance",
    "summary": "A brass balance, a box of weights, and four small phials waiting to be weighed.",
    "code": "SALT",
    "altCode": null,
    "hint": {
      "text": "WEIGH THEM.\nEvery phial, in its turn.",
      "sound": false,
      "tool": false
    },
    "description": "In Silas's weighing room (Room VIII), his apothecary's balance stands on the desk under the lamp, its box of brass weights open beside it — 20, 10, 10, 5, 2, 2 and 1 g, each stamped with its weight — and four stoppered phials in a row, numbered I to IV on their labels. A click puts a phial on the left pan (one at a time) and a weight on the right; a click on either takes it back. The beam leans to the heavier pan and comes level, its pointer on the scale's zero, when the two are equal. The phials weigh 19, 1, 12 and 20 g; read as places in the alphabet (A1Z26) in the phials' order they spell SALT. Nothing on screen says what to do with the grams.",
    "references": [
      "PHIALS = [19, 1, 12, 20] (balance/puzzle.js) — what each phial weighs, in the order of their numbers; balanceWord() spells SALT",
      "WEIGHTS = [20, 10, 10, 5, 2, 2, 1] — the box, as a real set is made up; canWeigh() — every phial can be weighed with it",
      "beamAngle() — the heavier pan down, a single gram visible, a big difference to the stop",
      "balance/art.js — the room, the stand, the beam with its pointer, the pans, the phials and the weights painted apart",
      "BalanceScene — click to load and unload the pans; the beam swings as a damped pendulum; the pans hang from their hooks"
    ]
  },
  {
    "id": "equations",
    "key": "Equations",
    "name": "Half Wiped",
    "summary": "Three reactions in chalk on a blackboard, some of their numbers wiped away.",
    "code": "2324",
    "altCode": null,
    "hint": {
      "text": "NOTHING IS LOST.\nThe boxes, on the blackboard.",
      "sound": false,
      "tool": false
    },
    "description": "Silas's blackboard in his weighing room (Room VIII): three reactions in his chalk hand under the date 13. X. 1961, and in the corner Lavoisier's \"Rien ne se perd.\" Some coefficients are wiped and left as boxes: _H₂ + O₂ → 2H₂O, N₂ + _H₂ → _NH₃, _Fe + 3O₂ → 2Fe₂O₃. Balancing each — as many atoms of every element after the arrow as before it — fills them with 2; 3 and 2; 4. Read left to right and top to bottom, the missing numbers are 2324. A click on a box chalks a number into it (the next click the next number, the wheel up or down, a right click back), so the working can be tried on the board; the board itself checks nothing.",
    "references": [
      "REACTIONS (equations/puzzle.js) — the three reactions, their wiped coefficients; equationsCode() gives 2324",
      "atoms() / balances() — counts each side's atoms; only the right numbers balance",
      "equations/art.js layoutBoard() — the reactions laid out in his hand, subscripts small and low, a box for each wiped number",
      "EquationsScene — each box its own chalk texture; click, wheel or right click to change the number in it"
    ]
  },
  {
    "id": "measures",
    "key": "Measures",
    "name": "To the Line",
    "summary": "By the sink: two plain bottles, a tap, and a flask with a single ring round its neck.",
    "code": "ACID",
    "altCode": null,
    "hint": {
      "text": "TO THE LINE.\nThe flask takes one pour.",
      "sound": false,
      "tool": false
    },
    "description": "By the laboratory sink in Silas's weighing room (Room VIII), seen close at the bottles' height: a fireclay sink under a brass swan-neck tap, white tiles, the window's lower panes over them with rain on the glass, the lamp by the sink alight off to the right, a mortar and pestle and two brown reagent bottles. On the honed slate two plain glass bottles, etched 500 ml and 300 ml, and a volumetric flask etched 400 ml and 20 °C on its bulb, with one ring round its neck and a blue paper strip hung in it. A click takes up a bottle; then a click on the tap fills it to the brim, on the sink empties it, on the other bottle pours as much as it can take, and on the flask pours all of it. Exactly 400 ml in one pour brings the flask to its ring and ignites the blue strip like a fuse: a small flame travels down it, revealing ACID in the charred paper behind the flame. The word remains after the fire goes out. Any other amount is shown for a moment and then tipped away into the sink. One way: fill the 500, pour it into the 300 (200 left), empty the 300, pour the 200 into it, fill the 500 again, top up the 300 (400 left), pour the 400 into the flask. Water remains level during tilts and keeps its volume. Resizing preserves measurements and resumes an unfinished burn; reduced motion reveals the finished strip immediately.",
    "references": [
      "BOTTLES = [500, 300], FLASK_ML = 400, MEASURES_WORD = \"ACID\" (measures/puzzle.js); pour() and toTheLine(); fewestMoves() — 6 moves from empty to 400 ml",
      "art/blender/room_weighing.py --view measures (measures_level_passes.py, measures_level_publish.mjs, measures_marks.mjs) — Room VIII's own sink counter rendered close in Cycles: the plate, the flask alone in clear glass, its shadow alone on the slate, and the camera that saw them (measuresLevel.json)",
      "measures/art.js layoutSink() / interior() / waterIn() — where the render puts everything on screen; each vessel's inside as a polygon (the flask's projected from its glass); the water clipped under a level surface to its exact area, whatever the tilt",
      "measures/stage3d.js — the two bottles in three dimensions, seen through the render's own camera",
      "the flask's 400 ml ring stands on its neck; its capacity is set so that 400 ml reaches the ring as rendered",
      "MeasuresScene — take up, fill, empty and pour; a wrong amount is tipped away; _turn() and paintLitmus() burn the blue strip and reveal the word progressively"
    ]
  },
  {
    "id": "abacus",
    "key": "Abacus",
    "name": "The Counting Frame",
    "summary": "An old counting frame lies on Orion's workbench, grey with years of dust.",
    "code": "5936",
    "altCode": null,
    "hint": {
      "text": "WHERE THEY STOOD.\nThe dust remembers how the frame was left.",
      "sound": false,
      "tool": false
    },
    "description": "On Orion's oak workbench in Room XI, under the green lamp, lies an old walnut frame round a white enamelled board that looks like an abacus: five ebony rods make four spaces, two brass wires cross them, and in each space two black blocks ride on the wires, one high and one low, each against the left rod, in the middle or against the right. The board is grey with dust except for eight clean places, each the size of a block, where the blocks stood for years; the blocks have been knocked out of place since. Dragging a block, or clicking it, slides it along its wire. Put back on their clean places — high right and low left; high middle and low left; both left; high right and low middle — the blocks become the holes in four blocky figures: the white left between the rods and round the blocks reads 5 9 3 6. Nothing happens when they are set; the player reads the figures in the white and enters 5936.",
    "references": [
      "abacus/puzzle.json — marks [[2,0],[1,0],[0,0],[2,1]], where the blocks stood ([high, low] for each space, 0 left, 1 middle, 2 right), and start [[1,2],[0,1],[2,2],[0,2]], where they lie now; the Blender builder reads the same file",
      "abacus/puzzle.js readSpace() — [high, low] → the figure the white makes: [2,0] 5, [1,0] 9, [0,0] 3, [2,1] 6, [1,1] 8, [0,2] 2; the other three make none",
      "art/blender/counting_frame.py and counting_frame_publish.mjs — the frame, its dust and clean places; the plate, and every block at each of its places with its own shadow, cut into one atlas; countingFrame.json says where each falls",
      "AbacusScene — a block is dragged along its wire, or clicked on a place at a time, and settles on the nearest place"
    ]
  },
  {
    "id": "rewind",
    "key": "Rewind",
    "name": "Rewind",
    "summary": "Four old ways of keeping time stand on Orion's windowsill.",
    "code": "TIME",
    "altCode": null,
    "hint": {
      "text": "AGAINST THE CLOCK.\nEverything on the sill runs the wrong way.",
      "sound": false,
      "tool": false
    },
    "description": "On the windowsill of Orion's study (Room XI), the moon and the wet garden behind them, stand four ways of keeping time: a brass drum clock showing 11:40, a tear-off calendar on the 24th, a sand-glass with all its sand below and an ivory scale of minutes beside it, and a candle-clock burned down to its 4th hour, the hours painted up its side. Touched, each runs backwards and stops: the hands wind back to 7 o'clock, six torn pages fly back onto the block to the 18th, the sand climbs up through the neck to the 14 on the scale, and the candle grows back to its 22nd hour. In a room where everything runs the wrong way the alphabet runs backwards too, A = 26 down to Z = 1: 7 18 14 22 reads T I M E. Nothing on screen says so.",
    "references": [
      "rewind/puzzle.json — the clock from 11:40 to 7:00, the calendar from 24 to 18, the sand from 0 to 14 minutes, the candle from 4 to 22 hours; the Blender builder and rewind_boards.mjs read the same file",
      "rewind/puzzle.js backwardsLetter() / rewindWord() — n → the letter 27 − n places along the alphabet: 7 T, 18 I, 14 M, 22 E",
      "art/blender/rewind_model.py, rewind_sill.py and rewind_publish.mjs — the four things, the sill and the window as Room XI has them; the plate, and the hands, the pages, the risen sand and the grown candle cut into one atlas; rewindSill.json says where each falls",
      "RewindScene — a touch runs a thing back: the hands turn, the pages fly back on, the risen sand and the grown candle are uncovered over the plate; a second touch runs it back again"
    ]
  }
];

// Preserve the pre-retirement numeric save order; current progress uses IDs.
export const LEGACY_LEVEL_IDS = Object.freeze(metadata.map(level=>level.id));
export const LEVEL_METADATA = Object.freeze(metadata.filter(level=>!level.retired).map((level) => Object.freeze({
  ...level,
  hint: Object.freeze({ ...level.hint, steps: Object.freeze([level.hint.text, ...HINT_DETAILS[level.id]]) }),
  references: Object.freeze(level.references),
})));
