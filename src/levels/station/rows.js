/** The trains of the STATION puzzle: when each leaves, where for, from which
 *  platform, and what has become of it. Four are still BOARDING, and each of
 *  those four destinations has one letter that does not belong — `wrongIdx`
 *  says which. Read in order of departure, the wrong letters spell the
 *  answer:
 *
 *    21:03  P[E]RIS   →  E
 *    22:07  MO[X]COW  →  X
 *    22:24  L[I]NDON  →  I
 *    22:41  GENE[T]A  →  T
 *
 *  They are kept out of that order, so the times matter. */
export const STATION_ROWS = [
  { time: "22:41", dest: "GENETA", track: "4", remark: "BOARDING", wrongIdx: 4 },
  { time: "21:26", dest: "VIENNA", track: "7", remark: "CANCELLED" },
  { time: "22:07", dest: "MOXCOW", track: "2", remark: "BOARDING", wrongIdx: 2 },
  { time: "21:03", dest: "PERIS", track: "9", remark: "BOARDING", wrongIdx: 1 },
  { time: "23:19", dest: "LISBON", track: "3", remark: "DELAYED" },
  { time: "21:48", dest: "MADRID", track: "6", remark: "CANCELLED" },
  { time: "22:24", dest: "LINDON", track: "1", remark: "BOARDING", wrongIdx: 1 },
  { time: "23:52", dest: "PRAGUE", track: "5", remark: "NO SERVICE" },
];
