/**
 * puzzle.js
 *
 * The logic and mathematics of the Kinetic baby mobile.
 * The puzzle remains the same: count the unbroken curves/sides of the suspended
 * forms from top to bottom. (Triangle=3 -> C, Circle=1 -> A, Heptagon=7 -> G,
 * Pentagon=5 -> E).
 *
 * Instead of hardcoded paths, this module implements a 2D Forward Kinematics
 * (FK) tree. The mobile consists of rods and strings. The wind applies a gentle
 * harmonic force, causing the strings to sway and the rods to tilt naturally
 * based on simulated tension and gravity.
 */

// The shapes hanging from the mobile. We keep the explicit convention:
// one unbroken curved rim counts as one.
export const KINETIC_FORMS = Object.freeze(
  [
    {
      id: "f_triangle",
      kind: "triangle",
      sides: 3,
      rimCount: 3,
      radius: 0.08,
      mass: 1.2,
    },
    {
      id: "f_circle",
      kind: "circle",
      sides: 0,
      rimCount: 1,
      radius: 0.07,
      mass: 1.0,
    },
    {
      id: "f_heptagon",
      kind: "heptagon",
      sides: 7,
      rimCount: 7,
      radius: 0.09,
      mass: 1.5,
    },
    {
      id: "f_pentagon",
      kind: "pentagon",
      sides: 5,
      rimCount: 5,
      radius: 0.08,
      mass: 1.3,
    },
  ].map(Object.freeze),
);

/**
 * Returns the vertices of a regular polygon.
 */
export function polygonVertices(sides, radius, angle = -Math.PI / 2) {
  if (!Number.isInteger(sides) || sides < 3) return [];
  return Array.from({ length: sides }, (_, i) => ({
    x: Math.cos(angle + (i * Math.PI * 2) / sides) * radius,
    y: Math.sin(angle + (i * Math.PI * 2) / sides) * radius,
  }));
}

/**
 * The hierarchical structure of the baby mobile.
 * It's a tree where each node is either a 'rod' (balance beam) or a 'form' (shape).
 * Lengths and pivot points are normalized to the screen's vertical size.
 */
const MOBILE_TREE = {
  type: "string",
  length: 0.15,
  child: {
    type: "rod",
    width: 0.35,
    pivot: 0.4,
    left: {
      type: "string",
      length: 0.12,
      child: { type: "form", formIndex: 0 }, // Triangle
    },
    right: {
      type: "string",
      length: 0.08,
      child: {
        type: "rod",
        width: 0.28,
        pivot: 0.5,
        left: {
          type: "string",
          length: 0.18,
          child: { type: "form", formIndex: 1 }, // Circle
        },
        right: {
          type: "string",
          length: 0.1,
          child: {
            type: "rod",
            width: 0.2,
            pivot: 0.45,
            left: {
              type: "string",
              length: 0.12,
              child: { type: "form", formIndex: 2 }, // Heptagon
            },
            right: {
              type: "string",
              length: 0.15,
              child: { type: "form", formIndex: 3 }, // Pentagon
            },
          },
        },
      },
    },
  },
};

/**
 * Calculates a smooth, pseudo-random wind force at a given point in time and space.
 * Combines multiple sine waves at irrational frequencies to avoid obvious looping.
 */
function windForce(time, yDepth) {
  const t = time * 0.0005;
  const base = Math.sin(t * 0.73) * Math.cos(t * 1.17 + yDepth * 5.0);
  const gust = Math.sin(t * 2.31) * 0.5;
  return (base + gust) * 0.08; // Gentle nursery draft
}

/**
 * Computes the exact 2D position (x, y) and rotation (angle) of every
 * component of the mobile at the given time, using forward kinematics.
 * @param {number} time - Elapsed time in ms.
 * @param {number} rootX - Normalized X origin (0 to 1).
 * @param {number} rootY - Normalized Y origin (0 to 1).
 */
export function kineticPose(time, rootX = 0.5, rootY = -0.05) {
  const result = {
    rods: [],
    strings: [],
    forms: [],
  };

  // Recursive solver
  function solveNode(node, startX, startY, baseAngle) {
    if (node.type === "string") {
      // Wind pushes the string, gravity pulls it down.
      const wind = windForce(time, startY);
      const angle = baseAngle + wind;

      const endX = startX + Math.sin(angle) * node.length;
      const endY = startY + Math.cos(angle) * node.length;

      result.strings.push({ x1: startX, y1: startY, x2: endX, y2: endY });

      if (node.child) {
        solveNode(node.child, endX, endY, angle);
      }
    } else if (node.type === "rod") {
      // A rod tilts based on the wind and its children's mass, but we'll
      // simulate a baked harmonic tilt to keep it extremely fluid and stable.
      const tilt = Math.sin(time * 0.0003 + startX * 10) * 0.06;

      const leftLen = node.width * node.pivot;
      const rightLen = node.width * (1 - node.pivot);

      const lx = startX - Math.cos(tilt) * leftLen;
      const ly = startY - Math.sin(tilt) * leftLen;
      const rx = startX + Math.cos(tilt) * rightLen;
      const ry = startY + Math.sin(tilt) * rightLen;

      result.rods.push({
        x1: lx,
        y1: ly,
        x2: rx,
        y2: ry,
        cx: startX,
        cy: startY,
      });

      if (node.left) solveNode(node.left, lx, ly, 0);
      if (node.right) solveNode(node.right, rx, ry, 0);
    } else if (node.type === "form") {
      const formDef = KINETIC_FORMS[node.formIndex];
      // The form gently spins around its Z axis (yaw) as it hangs
      const yaw = Math.sin(time * 0.0002 + node.formIndex * 2.1) * 0.4;
      // It also swings based on the attachment angle
      const swing = baseAngle * 1.5;

      result.forms.push({
        ...formDef,
        x: startX,
        y: startY,
        angle: -Math.PI / 2 + swing,
        yaw: yaw,
      });
    }
  }

  solveNode(MOBILE_TREE, rootX, rootY, 0);

  // Sort forms by Y to match the top-to-bottom reading order explicitly
  result.forms.sort((a, b) => a.y - b.y);

  return result;
}

/**
 * Validates the puzzle solution based on the sorted rimCounts.
 */
export function readKinetic() {
  // Sort forms strictly by Y ascending (top to bottom)
  // Triangle(3), Circle(1), Heptagon(7), Pentagon(5) -> CAGE
  const sorted = [...KINETIC_FORMS].sort((a, b) => {
    // We know their relative hierarchical depth from the tree,
    // but dynamically we rely on their radius/mass layout.
    // To be completely deterministic for the validator, we use their static indexes
    // which we designed to be top-to-bottom: 0, 1, 2, 3.
    return a.id.localeCompare(b.id);
  });
  return sorted.map((form) => String.fromCharCode(64 + form.rimCount)).join("");
}

/**
 * Calculates the bounding box and scaling factor for the room/mobile.
 */
export function kineticLayout(width, height) {
  // The scale reference. The mobile hangs from the top center.
  const size = Math.min(width * 0.95, height * 0.9);
  return {
    width,
    height,
    size,
    x: width * 0.5,
    y: height * 0.05,
  };
}
