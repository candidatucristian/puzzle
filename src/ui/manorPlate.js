// Where things are in the manor's picture (ashcombe-exterior-render-v2.webp, 2560 × 1330),
// projected from the Blender scene it was rendered from (art/blender/manor.py;
// written by art/blender/manor_publish.mjs — do not edit by hand): the front
// door, the lantern hung over it, the lit windows, the wet drive and
// forecourt the rain rings, and the line where the drive meets the house.

export const MANOR_PICTURE = "ashcombe-exterior-render-v2.webp";
export const PHOTO = { width: 2560, height: 1330 };
export const DOOR = { x: 1213, y: 773.1, w: 134, h: 204.5 };
export const LANTERN = { x: 1280, y: 867, rx: 26.6, ry: 38.3 };
export const WINDOWS = [
  { x: 703.8, y: 883.5, rx: 72, ry: 69.2 },
  { x: 703.8, y: 675.9, rx: 72, ry: 63.9 },
  { x: 1856.2, y: 883.5, rx: 72, ry: 69.2 },
  { x: 1856.2, y: 380.5, rx: 25.9, ry: 42.5 },
  { x: 947.9, y: 883.5, rx: 42.2, ry: 67.6 },
  { x: 1612.1, y: 680.8, rx: 42.2, ry: 62.4 },
  { x: 2084.9, y: 883.5, rx: 42.2, ry: 67.6 },
  { x: 1280, y: 615.7, rx: 76.9, ry: 106.6 },
  { x: 2381.2, y: 890.8, rx: 33.3, ry: 56.7 },
  { x: 960.5, y: 398.8, rx: 25.8, ry: 36.2 },
  { x: 2054.3, y: 398.8, rx: 25.7, ry: 36.2 },
];
export const GROUND = [[636, 1272.8], [1924, 1272.8], [1716.1, 1113.8], [2207.5, 1064.3], [2085, 1040.8], [1447.4, 1040.8], [1436.2, 1030.4], [1123.8, 1030.4], [1112.6, 1040.8], [475, 1040.8], [352.5, 1064.3], [843.9, 1113.8]];
export const HORIZON = 1030.4;
