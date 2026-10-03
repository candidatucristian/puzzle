// NCBI translation table 1, DNA coding strand, 5' -> 3'.
// https://www.ncbi.nlm.nih.gov/datasets/docs/v2/data-processing/taxonomy-processing/genetic-codes/#1-the-standard-code-transl_table1
// Codons are enumerated with each base in T,C,A,G order (third changes fastest).
const BASES = 'TCAG';
const AMINO_ACIDS = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
export const STANDARD_CODE = Object.freeze(Object.fromEntries([...AMINO_ACIDS].map((amino, i) => [
  BASES[Math.floor(i / 16)] + BASES[Math.floor(i / 4) % 4] + BASES[i % 4], amino,
])));
export const GENOME_FRAGMENT = Object.freeze(['TCT', 'CCT', 'GCT', 'TGT', 'GAA']);
export const FRAGMENT_TEXT = GENOME_FRAGMENT.join(' - ');

export function aminoAcid(codon) {
  if (typeof codon !== 'string') return null;
  // RNA reference tables use U in the positions occupied by T in this DNA.
  return STANDARD_CODE[codon.trim().toUpperCase().replaceAll('U', 'T')] ?? null;
}
export function translateFragment(fragment = GENOME_FRAGMENT) {
  const letters = fragment.map(aminoAcid);
  return letters.every(Boolean) ? letters.join('') : null;
}

export function genomeLayout(width, height) {
  const screen = { x: width * 0.065, y: height * 0.11, w: width * 0.87, h: height * 0.76 };
  const fragment = { x: screen.x + screen.w * 0.06, y: screen.y + screen.h * 0.37, w: screen.w * 0.88, h: screen.h * 0.25 };
  const font = Math.min(34, fragment.w / (FRAGMENT_TEXT.length * 0.67), fragment.h * 0.45);
  return { width, height, screen, fragment, font };
}
