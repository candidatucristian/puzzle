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
 *  case file (ui/caseFile.js) watches for it. No scene code lives here.
 *
 *  Under each of the first four, in pencil (`margin`), what Arthur makes of
 *  it: the story's steps, so that the player is a little ahead of him at the
 *  end rather than lost — Ivy is alive; Rose had a boy, and there is no child
 *  in the file; his own father knew them; a star named for a boy. The last
 *  letter needs no note. */

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
      "The others gave up within the year. You never did. You came back to our gate in the rain more often than you would ever admit, and once you stood at the dining-room window for the best part of an hour. So you are the one we chose.",
      "We did not leave because we were afraid. We left to keep a promise, and the house has kept it for us ever since. Every room holds something we could not say out loud. Every door opens with a key from the room before it. Nothing in there will explain itself: it was built for someone patient.",
      "The lamps are still in their places, the clocks have stopped where we left them, and the dust has been allowed to settle as it pleased. Forgive the cold.",
      "Take your file out once more before you come, and look at what the constables wrote about our table. Then come. The gate is unlocked. Start in the hall, and follow what we left for you, room by room.",
      "We were sorry to hear about your father. He was a better man than anybody knew.",
      "Come alone, and come soon. Some of us are older than the house now.",
    ],
    signature: "— I. A.",
    margin: "I. A. — Ivy Ashcombe. She is alive.",
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
    margin: "Rose had a boy. There is no child anywhere in the file.",
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
    margin: "Constable Wren. Dad knew them. He never said.",
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
      "If you are reading this under my dome, you have come a long way up, and you have uncovered a great many secrets. Do not stop now. The last thing we kept is the simplest of all.",
    ],
    signature: "— O. A.",
    margin: "A star named for a boy. Who was he to them?",
  },
  {
    id: "last",
    found: "when the last puzzle in the house was solved",
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
      "Come home.",
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

/** The opening (ui/introVideo.js) is his story, and only his: a man who has
 *  carried one file for half his life, his father who would not speak of it,
 *  and tonight's letter. Who the Ashcombes were waits until he stands before
 *  their house (`MANOR_STORY`, ui/manorStory.js), where it means most.
 *
 *  `page`: the case's name, with where and when, then two short paragraphs.
 *  `asides`: passages over the film, of him, not of the pictures — `over`
 *  the small line above, `lines` the words, `at` [from, to] in its seconds. */
export const OPENING = Object.freeze({
  page: {
    title: "The Ashcombe Case",
    place: "Exeter · Inspector Arthur Wren's residence",
    date: "12 October 2001",
    story: [
      "For twenty-two years, Inspector Arthur Wren has kept one file within reach of his desk. It is the oldest unsolved case in the county, and the only one he has never been able to put down. Every October he takes it out and reads it again, as if this year the pages might say something different.",
      "His father, Constable Thomas Wren, was the first policeman at Ashcombe House the morning the case began, and wrote its first report. He died this spring without ever speaking of it. Tonight, on the eve of the fortieth anniversary, Arthur came home to a letter waiting under his door. No stamp. No postmark. Only his name, in a hand he almost knows.",
    ],
  },
  asides: [
    { at: [1.4, 8], over: "Exeter · 12 October 2001", lines: ["That night, at Inspector Wren's residence."] },
    { at: [9.6, 17.8], over: "Inspector Arthur Wren · Devon & Cornwall Constabulary", lines: ["Twenty-two years on the force. More cases closed than anyone at the station.", "One left open."] },
    { at: [19.4, 27.6], over: "October 1961", lines: ["He was only a small boy the autumn it began.", "His father came home one morning that October, and never said a word about where he had been."] },
    { at: [29.2, 37.4], over: "Constable Thomas Wren", lines: ["He was the first man at the door of Ashcombe House.", "He wrote the report, closed his notebook, and kept it closed for forty years."] },
    { at: [39, 45.8], over: "Case 61/1013", lines: ["Arthur has read the file more times than he can count.", "One line in it has never let him rest."] },
    { at: [47, 53.4], over: "The dining room", lines: ["The table had been laid for four.", "Who was the fourth place for?"] },
    { at: [54.6, 61.6], over: "This spring", lines: ["His father died with the answer, if he ever had it.", "Arthur was left with the file, and the question."] },
    { at: [63, 70.2], over: "Tonight", lines: ["After forty years, someone has written to him.", "The letter is signed with two initials: I. A."] },
  ],
});

/** At the manor, the first time he stands before it (ui/manorStory.js): the
 *  Ashcombes at last — whose house it was, a floor for each of the three, the
 *  night they went, and that someone is still waiting. Brought on by Next. */
export const MANOR_STORY = Object.freeze([
  { over: "Ashcombe House · Devon", lines: ["This was the house of the Ashcombes.", "Three of the finest minds in England — a sister and her two brothers — and a floor of the house for each of them."] },
  { over: "The ground floor · The Botany", name: "Ivy Ashcombe", lines: ["who could make anything grow.", "She kept the glasshouses at Kew. A seed, she said, must never be hurried — and she never hurried anything she loved."] },
  { over: "The first floor · The Chemistry", name: "Silas Ashcombe", lines: ["who could take anything apart.", "He measured everything in the world exactly — everything, his sister said, but his own heart."] },
  { over: "The top floor · The Physics", name: "Orion Ashcombe", lines: ["who counted the stars for a living.", "Every star he found, he named. One of them is in no catalogue."] },
  { over: "And the youngest", name: "Rose Ashcombe", lines: ["who was not there that night.", "There had been a fourth Ashcombe once: their little sister, the one they all loved best. She died in the winter of 1959."] },
  { over: "13 October 1961", lines: ["On the last night anyone saw them, they laid the table for four, put out the lights one room at a time, and locked every door behind them.", "They took nothing with them. They left something behind."] },
  { over: "Tonight", lines: ["For the first time in forty years, the gate is unlocked, and a light is burning in the hall.", "Someone has been waiting for him."] },
].map(Object.freeze));

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
    "Reporting officer: Constable T. Wren, first at the house on the morning of 14 October.",
  ],
  signature: "Closed, November 1962: insufficient evidence.",
  postscript: "Pencilled under it, in his hand: Four places laid. Three Ashcombes. Who was the fourth? — A. W.",
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
