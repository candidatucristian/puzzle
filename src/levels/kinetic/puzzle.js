// The circle uses this artwork's explicit convention: one unbroken curved
// rim counts as one. It is not a claim that a circle has a straight side.
export const KINETIC_FORMS = Object.freeze([
  { kind: 'triangle', sides: 3, rimCount: 3, x: -0.27, y: 0.25, radius: 0.083, color: 0xb28b48, light: 0xdfc083 },
  { kind: 'circle', sides: 0, rimCount: 1, x: 0.22, y: 0.445, radius: 0.069, color: 0x303332, light: 0x545954 },
  { kind: 'heptagon', sides: 7, rimCount: 7, x: -0.20, y: 0.645, radius: 0.088, color: 0xa04b38, light: 0xc5795b },
  { kind: 'pentagon', sides: 5, rimCount: 5, x: 0.19, y: 0.845, radius: 0.085, color: 0xa89c82, light: 0xd6cbb1 },
].map(Object.freeze));

export function polygonVertices(sides, radius, angle = -Math.PI / 2) {
  if (!Number.isInteger(sides) || sides < 3) return [];
  return Array.from({ length: sides }, (_, i) => ({
    x: Math.cos(angle + i * Math.PI * 2 / sides) * radius,
    y: Math.sin(angle + i * Math.PI * 2 / sides) * radius,
  }));
}

export function kineticPose(time) {
  return KINETIC_FORMS.map((form, i) => ({
    ...form,
    x: form.x + Math.sin(time * 0.00011 + i * 0.8) * 0.018,
    // Faces gently turn in their own plane: no silhouette ever goes edge-on.
    angle: -Math.PI / 2 + Math.sin(time * 0.000075 + i * 1.3) * 0.18,
  }));
}

export function readKinetic() {
  return [...KINETIC_FORMS].sort((a, b) => a.y - b.y)
    .map(form => String.fromCharCode(64 + form.rimCount)).join('');
}

export function kineticLayout(width, height) {
  const size = Math.min(width * 0.95, height * 0.87);
  return { width, height, size, x: width * 0.5, y: height * 0.015 };
}
