export const HERBARIUM_COVER = { key: "herbarium_cloth_cover_v1", url: "assets/images/Herbarium/cloth-cover-v1.webp" };

export const HERBARIUM_PHOTOS = {
  book: "herbarium_open_album_v1",
  desk: "herbarium_walnut_table_v1",
  pages: Array.from({ length: 5 }, (_, i) => `herbarium_mounted_page_${i + 1}_v2`),
};
const FILES = [
  [HERBARIUM_PHOTOS.book, "open-album-v1.webp"],
  [HERBARIUM_PHOTOS.desk, "walnut-table-v1.webp"],
  ...HERBARIUM_PHOTOS.pages.map((key, i) => [key, `page-${i + 1}-v2.webp`]),
];

export function loadHerbariumPhotography(scene) {
  for (const [key, file] of FILES) {
    if (!scene.textures.exists(key)) scene.load.image(key, `assets/images/Herbarium/${file}`);
  }
}

// Each whole page is photographed with the plants, mounting strips and
// contact shadows together, preserving veins and fine translucent petal edges.
export function herbariumPhotography(scene) {
  const source = key => scene.textures.exists(key) ? scene.textures.get(key).getSourceImage() : null;
  return {
    book: source(HERBARIUM_PHOTOS.book), desk: source(HERBARIUM_PHOTOS.desk),
    pages: HERBARIUM_PHOTOS.pages.map(source),
  };
}
