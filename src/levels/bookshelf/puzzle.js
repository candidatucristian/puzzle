/** BOOKSHELF: a book cipher. Five books stand pulled a little out of the
 *  shelf, each with a one-word title on its spine and a numbered bookmark in
 *  it. The bookmark is an index into the title: SHADOW with 1 gives S. Left to
 *  right the five give S I G H T. */

export const BOOKSHELF_WORD = "SIGHT";

// the five books pulled out, left to right: the title on the spine and the
// number on the bookmark in it
export const BOOKS = Object.freeze([
  Object.freeze({ title: "SHADOW", mark: 1 }),
  Object.freeze({ title: "MIRROR", mark: 2 }),
  Object.freeze({ title: "MAGIC", mark: 3 }),
  Object.freeze({ title: "HOUND", mark: 1 }),
  Object.freeze({ title: "WATER", mark: 3 }),
]);

/** The letter a bookmark points to in its book's title (counting from 1). */
export function readBook({ title, mark }) {
  if (!Number.isInteger(mark) || mark < 1 || mark > title.length) {
    throw new RangeError(`No letter ${mark} in ${title}`);
  }
  return title[mark - 1];
}

/** The word the books spell, left to right. */
export function readShelf(books = BOOKS) {
  return books.map(readBook).join("");
}
