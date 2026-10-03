// The existing atmospheric hint remains step one. Each click reveals one
// additional nudge; the final step explains a method, not just an answer.
export const HINT_DETAILS = {
  binarytree: [
    'The note describes seven journeys. Begin at the top of the tree for each one: L means left and R means right.',
    'Follow each three-turn path to a letter at the bottom. Write those letters in the same order as the paths on the note. Repeated paths give repeated letters.',
  ],
  plantpot: [
    'Drag the watering can over the pot. Count the new leaves on each branch after every pour, rather than all the leaves together.',
    'Five pours produce groups of 1, 1, 2, 3 and 5 leaves. After the first two, each group is the sum of the previous two. The code is the name of that sequence.',
  ],
  sequence: [
    'Drag the cards into ascending order. The small example in the corner shows how to turn a pair of digits into something longer.',
    'Read the first digit of each card as a count and the second as the digit to repeat: 25 means five, twice — 55. Apply that rule to the sorted cards, then join the results into one code.',
  ],
  cryptex: [
    'Put out the candle and count how many breaths it takes. The writing on the wheel becomes visible in the dark. Open the envelope to inspect the letter.',
    'The three breaths suggest shifting three places. Turn the wheel so each ciphertext letter maps three letters backwards: D becomes A, E becomes B. Decode the letter and look for the machine’s spinning part.',
  ],
  chessboard: [
    'There is one piece on each numbered rank. The coordinate letters along the board matter more than the rules of chess.',
    'Start with rank 1 and work up to rank 8. For each piece, write down its file letter, from A to H. Those eight letters form the code.',
  ],
  mobilephone: [
    'Read the incoming number in runs of repeated digits. The letters printed on the phone keys are your reference.',
    'Use old multi-tap typing: one 4 selects G, two 3s select E. Press a key repeatedly to cycle its letters, then wait briefly to commit it. Decode the whole caller number to discover a name.',
  ],
  lightswitch: [
    'Each press of the switch gives one burst of short and long flashes. Write down one burst at a time; the next press moves to the next letter.',
    'Use Morse code: short flashes are dots and long flashes are dashes. For example, dot–dash–dash–dot is P. Decode five bursts in order; after the fifth, the sequence repeats.',
  ],
  tv: [
    'Read all four broadcasts. Astronomy, law, programming and physics use the same word for what is absent.',
    'The programming channel describes a function that returns no value. Find the word that also fits an empty region of space and a legally ineffective contract.',
  ],
  modem: [
    'Two lights carry the message, one flash at a time. Treat one as 0 and the other as 1. The five counter lights separate the letters.',
    'The left of the two transmitting lights represents 0; the right represents 1. Record eight bits per letter and decode them as ASCII. The first byte, 01001000, is H. The full code names a secure web protocol.',
  ],
  telescope: [
    'Look through the telescope. Some stars form suspiciously regular groups: two columns of three possible positions.',
    'These are Braille cells. Number the left column 1–2–3 and the right 4–5–6, top to bottom. Compare the illuminated positions with a Braille alphabet and read the five groups left to right.',
  ],
  wires: [
    'Five parallel wires can be read like a musical staff. Each bird marks a note, and the birds must be read from left to right.',
    'Use the letter names of the five wires, bottom to top: D, F, A, C, E. Write the letter of the wire each bird sits on. You do not need to identify the background music.',
  ],
  station: [
    'Only the trains marked BOARDING matter. Their destination names each contain one incorrect letter.',
    'Order the four boarding trains by departure time, earliest first. Take the letter actually printed in the incorrect position of each city name, rather than the letter that should replace it.',
  ],
  pi: [
    'Focus on the building with illuminated windows on every floor. Count the lights on each floor, starting at the top.',
    'Window positions can change, but each floor keeps the same number of lights. The first three counts are 3, 1 and 4. Recognise the mathematical constant and enter its name or its familiar decimal approximation.',
  ],
  crossing: [
    'The crossing’s alternating wide and narrow bars resemble a barcode. Read from the near pavement towards the far one.',
    'Use a Code 39 reference. Account for both the bars and the spaces, and separate the start/stop markers from the two encoded letters. The result is a short instruction to move.',
  ],
  flags: [
    'Identify the five countries represented by the flags, reading from left to right. Each country contributes exactly two letters.',
    'The countries are Germany, Brazil, Ireland, Finland and Nigeria. Use their ISO two-letter country codes — for example, Germany is DE — and join all five codes in that order.',
  ],
  tapcode: [
    'Each line has two groups of tally marks. Count the first group as a row and the second as a column in a five-by-five alphabet.',
    'Use the prisoner’s tap-code grid: ABCDE / FGHIJ / LMNOP / QRSTU / VWXYZ, with K sharing C’s square. Count from 1. A pair of 1 and 5 gives E; decode all six lines in order.',
  ],
  rally: [
    'Watch the door numbers as the cars cross the finish line. Their finishing order matters. The result board lets you review it afterwards.',
    'Convert each number to its alphabet position: 1 is A, 2 is B, and so on through 26. For example, car 19 gives S. Read all six letters in finishing order.',
  ],
  overtime: [
    'The four clocks can be treated as four-digit numbers. Use the calculator to add all four readings, ignoring the colons.',
    'Add the displayed values as ordinary numbers, rather than hours and minutes. Then imagine turning the calculator upside down: read its seven-segment digits as letters, starting from the right.',
  ],
  fireworks: [
    'Each firework hangs out a tag with its number and the exact code of its colour. Take the five in order. The plate on the clock says which part of every code matters.',
    'A colour written #RRGGBB begins with its red: the first two characters. Take those two from each tag, one to five, and read each pair as a hexadecimal ASCII code. 4E, for example, is N.',
  ],
  compass: [
    'Open the map on the table. Its numbers are bearings, the same degrees as on the compass card, and each line of them belongs to one letter.',
    'Take every bearing as one step: 0 is up, 90 right, 180 down, 270 left. Follow a line with a pencil and it draws a letter: 180, 180, 90 is down, down, right, an L. Draw all four lines in order.',
  ],
  bookshelf: [
    'Look only at the five books pulled out of the third shelf, left to right. Each has a one-word title on its spine and a bookmark with a number.',
    'The bookmark’s number is the place of a letter in its own book’s title, counting from the first. SHADOW with bookmark 1 gives S. Take one letter from each of the five, in order.',
  ],
  chemistry: [
    'The faded chart on the wall is the periodic table. Every element on it has a number of its own: its atomic number.',
    'Find the element for each bottle’s number, left to right, and write down its chemical symbol. Number 9 is fluorine, F. The five symbols together make the word.',
  ],
  billiards: [
    'Five balls are missing from the rack. Each lies in a pocket marked I to V; down there you see only its colour, and whether it is striped. Balls 1 to 7 are solid, 9 to 15 striped in the same colours.',
    'Read the pockets from I to V and turn each ball’s number into a letter of the alphabet: 1 is A, 2 is B, and so on. Pocket I holds the blue solid, ball 2: B.',
  ],
  metro: [
    'Follow the lit line only, in the direction the light runs: Tango Square first, November Street last. Say the first word of each station’s name out loud.',
    'Tango, Romeo, Alpha, India, November are the NATO phonetic alphabet, each word standing for its first letter: Tango is T. Take one letter from each station, in the line’s order.',
  ],
  resistors: [
    'Read the resistors in order, R1 to R4, and only their first band — the one nearest the end, away from the lone gold band. Click a resistor to see its bands through the loupe.',
    'The card gives each colour a digit: black 0, brown 1, red 2, orange 3, yellow 4, and so on to white 9. R1’s first band is brown, so its digit is 1. Write the four first-band digits in order as one number.',
  ],
  ripples: [
    'The drops always land in the same three places. Two circles cross often; look for a stone touched by all three fronts at once. The wet letter catches the light for a moment.',
    'Follow several rounds and note the four stones where three rings meet. Read their engraved letters from the highest stone to the lowest. The other letters are distractions; the show repeats.',
  ],
  vertex: [
    'Inspect the four pulsing points from left to right. Count only lines that begin or end at the point you are examining; a line crossing elsewhere adds no connection to it.',
    'A point’s degree is its number of connected edges. The four degrees are 6, 1, 3 and 5. Turn each into a letter using A=1, B=2, and so on, then read left to right.',
  ],
};
