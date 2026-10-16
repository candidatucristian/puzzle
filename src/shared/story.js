/** The Ashcombe case: the story the house is the setting of. Inspector Arthur
 *  Wren has carried one unsolved file through his whole career — the night in
 *  October 1961 when the three Ashcombe siblings, Ivy the botanist, Silas the
 *  chemist and Orion the astronomer, locked every door of Ashcombe House and
 *  went away, hurting no one, taking nothing, telling no one why. Forty years
 *  on, a letter comes for him.
 *
 *  The letters are what he gathers on the way: the one that brings him, a
 *  page left by each of the three on their own floor of the house, and the
 *  last, which waits for the end. Each says when it is found (`found`) — the
 *  case file (ui/caseFile.js) watches for it. No scene code lives here. */

export const CASE = Object.freeze({ title: "The Ashcombe Case", year: 1961, detective: "Inspector Arthur Wren" });

export const LETTERS = Object.freeze([
  {
    id: "invitation",
    found: "on the Inspector's desk",
    title: "The letter on the desk",
    dateline: "Ashcombe House · October 2001",
    salutation: "Inspector Wren,",
    body: [
      "Forty years ago this October, my brothers and I locked every door of Ashcombe House and went away in the night. You have read the file. You know that nobody was hurt, that nothing was taken, and that nobody ever understood why.",
      "You were the only one who kept asking. So you are the one we chose.",
      "We did not leave because we were afraid. We left to keep a promise, and the house has kept it for us ever since. Every room holds something we could not say out loud. Every door opens with a key from the room before it. Nothing in there will explain itself: it was built for someone patient.",
      "Take your file out once more before you come, and look at what the constables wrote about our table. Then come. The gate is unlocked. Start in the hall, and put the lights out, one by one.",
    ],
    signature: "— I. A.",
  },
  {
    id: "ivy",
    found: "in Ivy's study, among the seed packets",
    title: "Ivy's garden book",
    dateline: "Ivy Ashcombe · 12th October 1961",
    salutation: "",
    body: [
      "Rose's boy sleeps in the potting shed while I work, wrapped in my old gardening coat. He likes the smell of the soil. Silas says I spoil him. I say a seed does not grow by being argued with.",
      "Another letter came today from across the sea, in the same hand. A man who has never once asked how the child is now writes every week to say he will come and collect him, like a parcel left at a station.",
      "Silas put it in the stove before I could read it twice.",
      "If he comes, I shall not give the boy up. I have decided it the way I decide everything: slowly, and for good.",
    ],
    signature: "— I.",
  },
  {
    id: "silas",
    found: "on the chemist's landing, under a jar",
    title: "A page from Silas's laboratory book",
    dateline: "Silas Ashcombe · 13th October 1961 · experiment abandoned",
    salutation: "",
    body: [
      "I have spent my life measuring things exactly, and tonight I cannot measure what we are about to do.",
      "We shall close the house. We shall take the boy where no letter can follow him. Constable Wren has agreed: a good, quiet man, with a wife who always wanted a child and never had one.",
      "I have hidden what matters in the only way I trust — in plain sight, under rules a careful mind can follow. Whoever comes after us, let them be careful.",
      "Ivy calls it a game. It is not a game. It is a lock with a heart in it.",
    ],
    signature: "— S. A.",
  },
  {
    id: "orion",
    found: "under the dome, on the back of a star chart",
    title: "Orion's star chart",
    dateline: "Orion Ashcombe · the night of 13th October 1961",
    salutation: "",
    body: [
      "The night we left was clear, and from up here I could see every star I have ever named.",
      "I named one more, for him. It is in no catalogue; I never told the Society. It is only in this room, and only for someone who looks long enough.",
      "If you are reading this under my dome, you have come a long way up, and you have put out a great many lights. Do not stop now. The last thing we kept is the simplest of all.",
    ],
    signature: "— O. A.",
  },
  {
    id: "last",
    found: "when the last light in the house went out",
    title: "The last letter",
    dateline: "Ashcombe House",
    salutation: "Arthur,",
    body: [
      "You will have guessed by now. You were always quick, even at two.",
      "Your mother was our little sister, Rose. She died the winter you were born, and she asked the three of us to keep you safe. Your father never wanted you, until he learned there was a house and a name that came with you. In 1961 the law would have given you to him.",
      "So on the 13th of October we carried you out of Ashcombe House in a basket of Ivy's seed packets, locked every door behind us, and gave you to the kindest man we knew: Constable Thomas Wren. He gave you his name, and you gave it back to him by becoming the best detective in the county.",
      "We watched you grow up from a little way off. Silas came to every one of your school prize-givings and sat at the back. Orion sent the telescope you had for your tenth birthday, and never signed the card.",
      "The words you gathered were never the answer. They were the story. The answer is this: the house is yours. It always was.",
      "Light it again.",
    ],
    signature: "— Ivy, Silas and Orion Ashcombe",
    postscript: "P.S. I am at the gate, Arthur. I have waited forty years; I can wait while you finish your tea. — Ivy",
  },
].map(Object.freeze));

/** The game's cold open, before anything else (ui/coldOpen.js): the story
 *  so far, told on the black a paragraph at a time; then where we are — at
 *  Inspector Wren's, the night a letter comes from the house. */
export const INTRO = Object.freeze({
  story: [
    "On the night of 13 October 1961, the Ashcombes — Ivy, Silas and Orion, a sister and her two brothers — locked every door of their house in Devon and walked out into the dark.",
    "All three were scientists, and well known: Ivy kept the tropical glasshouses at Kew, Silas ran a chemistry laboratory at Cambridge, and Orion worked the great telescopes of the Royal Observatory at Herstmonceux.",
    "Nothing was taken. Nobody was hurt. Nobody ever learned why.",
    "The police searched for a year. Then they closed the file: insufficient evidence.",
    "One detective never let it go. For his whole career, the Ashcombe file has waited in the bottom drawer of his desk.",
  ],
  where: ["Exeter · October 2001", "At Inspector Wren's residence", "Tonight, after forty years, a letter came from Ashcombe House."],
});

/** What is in the file on his desk, opened in the prologue once the letter
 *  has sent him to it: the report the case was closed on, and the one line
 *  he has added to it since. */
export const CASE_REPORT = Object.freeze({
  dateline: "Devon & Cornwall Constabulary · Case 61/1013",
  salutation: "The disappearance of Ivy, Silas and Orion Ashcombe",
  body: [
    "Ashcombe House, Devon. The three occupants last seen on the evening of 13 October 1961.",
    "All doors found locked from the outside; no keys recovered. No sign of a struggle. Nothing missing from the house.",
    "In the dining room, the table laid for four.",
    "No debts, no quarrel, no letter left behind. Enquiries at the ports and along the coast without result.",
  ],
  signature: "Closed, November 1962: insufficient evidence.",
  postscript: "Pencilled under it, in his hand: Four places laid. Three Ashcombes. Who was the fourth? — A. W.",
});

/** The card that comes up after the letter and the file, before the house
 *  is seen. */
export const ARRIVAL = Object.freeze(["The next night.", "Ashcombe House."]);

/** A card for each floor, the first time he stands on it: whose floor it
 *  was. Keyed by the floor's storey. */
export const CHAPTERS = Object.freeze({
  1: ["Chapter I", "Ivy"],
  2: ["Chapter II", "Silas"],
  3: ["Chapter III", "Orion"],
});

/** A letter by its id. */
export const letterById = (id) => LETTERS.find((letter) => letter.id === id) ?? null;
