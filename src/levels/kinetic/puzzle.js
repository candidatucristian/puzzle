// All lengths belong to the mobile, in normalized coordinates. Projection
// into the room happens once, in the scene, after the connected rig is posed.
export const KINETIC_FORMS = Object.freeze([
  { id: 'ki_triangle', kind: 'triangle', sides: 3, rimCount: 3, radius: 0.045 },
  { id: 'ki_circle', kind: 'circle', sides: 0, rimCount: 1, radius: 0.038 },
  { id: 'ki_heptagon', kind: 'heptagon', sides: 7, rimCount: 7, radius: 0.043 },
  { id: 'ki_pentagon', kind: 'pentagon', sides: 5, rimCount: 5, radius: 0.041 },
].map(Object.freeze));

export function polygonVertices(sides, radius, angle = -Math.PI / 2) {
  if (!Number.isInteger(sides) || sides < 3) return [];
  return Array.from({ length: sides }, (_, i) => ({
    x: Math.cos(angle + i * Math.PI * 2 / sides) * radius,
    y: Math.sin(angle + i * Math.PI * 2 / sides) * radius,
  }));
}

/** A shared, slow draft for the hanging wood, voile and suspended dust. */
export function nurseryBreeze(time) {
  return Math.sin(time * 0.00047) * 0.64 + Math.sin(time * 0.00079 + 0.6) * 0.36;
}

export function kineticRig(time = 0) {
  const rods = [], strings = [], forms = [];
  const t = time * 0.00035;
  const hang = (start, length, phase) => {
    const angle = nurseryBreeze(time - phase * 420) * 0.035 + Math.sin(t + phase) * 0.008;
    const end = { x: start.x + Math.sin(angle) * length, y: start.y + Math.cos(angle) * length };
    strings.push({ x1: start.x, y1: start.y, x2: end.x, y2: end.y });
    return end;
  };
  const rod = (pivot, left, right, phase) => {
    const tilt = Math.sin(t + phase) * 0.022;
    const a = { x: pivot.x - Math.cos(tilt) * left, y: pivot.y - Math.sin(tilt) * left };
    const b = { x: pivot.x + Math.cos(tilt) * right, y: pivot.y + Math.sin(tilt) * right };
    rods.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, cx: pivot.x, cy: pivot.y });
    return [a, b];
  };
  const form = (start, length, index) => {
    const spec = KINETIC_FORMS[index];
    const attachment = hang(start, length, index + 1);
    const rotation = nurseryBreeze(time - index * 230) * 0.045;
    const yaw = Math.sin(t * 0.65 + index * 1.6) * 0.25;
    // The actual hole in the painted form, including its rotation and yaw,
    // meets the end of its thread at every frame.
    forms.push({ ...spec,
      x: attachment.x - Math.sin(rotation) * spec.radius * 0.85,
      y: attachment.y + Math.cos(rotation) * spec.radius * 0.85,
      angle: -Math.PI / 2 + rotation, rotation, yaw, attachment,
    });
  };
  const [a, b] = rod(hang({ x: 0, y: 0 }, 0.048, 0), 0.22, 0.22, 0.2);
  form(a, 0.082, 0);
  const [c, d] = rod(hang(b, 0.095, 1), 0.294, 0.126, 1.2);
  form(d, 0.12, 1);
  const [e, f] = rod(hang(c, 0.10, 2), 0.18, 0.18, 2.4);
  form(e, 0.142, 2);
  form(f, 0.278, 3);
  forms.sort((a, b) => a.y - b.y);
  return { rods, strings, forms };
}

/** Reading order is spatial; neither IDs nor alphabetical order encode it. */
export function kineticPose(time = 0) { return kineticRig(time).forms; }

export function readKinetic() {
  return kineticPose(0).map(form => String.fromCharCode(64 + form.rimCount)).join('');
}

export function kineticLayout(width, height) {
  return {
    width, height,
    size: Math.min(width * 0.72, height * 0.7),
    x: width * 0.5,
    y: height * 0.07,
  };
}
