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
      "My brothers and I left Ashcombe House forty years ago. We left to keep a promise.",
      "I have seen you at the gate over the years. If you still want to know why we went, come to the house.",
      "Before you come, read your father's report again. Look at what he wrote about the dining table.",
      "The gate is unlocked. Start in the hall. What you find in each room will open the next. Put out the lights as you go.",
      "I was sorry to hear about your father. He did more for us than you know.",
      "Please come alone.",
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
      "The next morning he was the first constable at our door. He wrote the report himself, and he kept our secret for the rest of his life. The fourth place at the table was yours.",
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

/** The opening (ui/introVideo.js), in three parts, each telling what the
 *  player needs at that moment and no more.
 *
 *  Before the film (`page`): the case's name, then two short paragraphs —
 *  the case that has never let Inspector Wren go, and the letter waiting for
 *  him tonight.
 *
 *  Over the film (`asides`): the same night, at his house; then the case
 *  itself, as the file has it — no names yet: who the three were is told at
 *  the manor.
 *
 *  At the manor (`MANOR_STORY`, ui/manorStory.js): only once he stands
 *  before the house, the three of them — one for each floor he is about to
 *  climb — and what he is to do there.
 *
 *  A passage: `over` the small line above it, `name` (a person, set
 *  large), `lines` its words; `at` is [from, to] in the film's seconds. */
export const OPENING = Object.freeze({
  page: {
    title: "The Ashcombe Case",
    place: "Exeter · Inspector Arthur Wren's residence",
    date: "12 October 2001",
    story: [
      "Forty years ago, three scientists locked every door of their house in Devon and walked out into the night. No one was hurt, nothing was taken, and no one has ever learned why. For twenty-two years Inspector Arthur Wren has worked the case that every other detective gave up on — the one file he has never been able to close, and never been able to put down.",
      "Tonight, after twenty-two years, he came home to find a letter waiting under his door. No stamp. No postmark. No name of the sender.",
    ],
  },
  asides: [
    { at: [1.4, 8], over: "Exeter · 12 October 2001", lines: ["That night, at Inspector Wren's residence."] },
    { at: [9.6, 17.8], over: "Devon & Cornwall Constabulary · Case 61/1013", lines: ["The disappearance of three scientists from Ashcombe House, Devon.", "Opened 14 October 1961. Closed November 1962. Never solved."] },
    { at: [19.4, 27.6], over: "14 October 1961 · Morning", lines: ["Every door of the house was found locked from the outside.", "No key was ever recovered. No sign of a struggle. Nothing missing."] },
    { at: [29.2, 37.4], over: "Inside the house", lines: ["Every lamp had been put out, one room at a time.", "Every clock in the house had been stopped."] },
    { at: [39, 45.8], over: "The dining room", lines: ["The table was laid for four.", "Only three people had ever lived there."] },
    { at: [47, 53.4], over: "The search", lines: ["For a year the ports, the stations and the coast were watched.", "No debts. No quarrel. No letter. Not one of them was seen again."] },
    { at: [54.6, 61.6], over: "Case 61/1013 · Reporting officer", lines: ["Constable Thomas Wren, the first man at the door.", "Forty years later, his son still keeps the file open."] },
    { at: [63, 70.2], over: "Exeter · Tonight", lines: ["The house has written to him.", "It is asking him to come home."] },
  ],
});

/** At the manor, the first time he stands before it (ui/manorStory.js): who
 *  the house belonged to — a floor for each of the three — and what he is to
 *  do in it. Passages as the film's, each brought on by Next. */
export const MANOR_STORY = Object.freeze([
  { over: "Ashcombe House · Devon · 1961", lines: ["This house belonged to three of the finest minds in England.", "A sister and her two brothers — and a floor of the house for each of them."] },
  { over: "The ground floor · The Botany", name: "Ivy Ashcombe", lines: ["who could make anything grow.", "She kept the tropical glasshouses at Kew, and never once hurried a seed."] },
  { over: "The first floor · The Chemistry", name: "Silas Ashcombe", lines: ["who could take anything apart.", "He trusted nothing he could not measure, and hid things only where a careful mind would find them."] },
  { over: "The top floor · The Physics", name: "Orion Ashcombe", lines: ["who spent his nights counting what other people never see.", "Every star he found, he named. One of them is in no catalogue."] },
  { over: "Tonight", lines: ["For the first time in forty years, the gate has been left unlocked.", "Start in the hall, and put the lights out as you go."] },
].map(Object.freeze));

/** What is in the file on his desk, opened in the prologue once the letter
 *  has sent him to it: the report the case was closed on, and the one line
 *  he has added to it since. */
export const CASE_REPORT = Object.freeze({
  dateline: "Devon & Cornwall Constabulary · Case 61/1013",
  salutation: "The disappearance of Ivy, Silas and Orion Ashcombe",
  body: [
    "Ashcombe House, Devon. The three occupants were last seen on the evening of 13 October 1961.",
    "All doors locked from the outside. No keys recovered. No sign of a struggle. No property reported missing.",
    "Dining-room table set for four.",
    "Enquiries at the ports and along the coast produced no further sightings.",
    "Reporting officer: Constable T. Wren. Attended 14 October 1961.",
  ],
  signature: "Closed, November 1962: insufficient evidence.",
  postscript: "Three people. Four places. Who was the fourth? — A. W.",
});

/** A card for each floor, the first time he stands on it: whose floor it
 *  was. Keyed by the floor's storey. */
export const CHAPTERS = Object.freeze({
  1: ["Chapter I", "Ivy"],
  2: ["Chapter II", "Silas"],
  3: ["Chapter III", "Orion"],
});

/** A letter by its id. */
export const letterById = (id) => LETTERS.find((letter) => letter.id === id) ?? null;
