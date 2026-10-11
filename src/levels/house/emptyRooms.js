import PlainRoomScene from "./plainRoom.js";

// ─────────────────────────────────────────────────────────────────────────────
// The fifth and sixth rooms off the hall: built, and empty for now. Nothing
// is found in either yet; they are there to be walked into (see plainRoom.js).
// ─────────────────────────────────────────────────────────────────────────────

/** Room 5, the drawing room: deep red paper over a dark dado, parquet, a tall
 *  sash window between its curtains, a hearth on the left. It keeps the key
 *  to the last door. */
export class Room5Scene extends PlainRoomScene {
  constructor() {
    super("Room5", {
      style: {
        wall: "paper", near: "#2c1418", far: "#150a0c", back: "#1c0e11", mark: "rgba(230,170,170,0.035)",
        floor: "herringbone", floorNear: "#33200f", floorFar: "#180e08", ceiling: "plain", ceilingCol: "#0c0a0a", window: "sash",
      },
      window: { x: 0.36, hw: 0.15, top: 266, sill: 104 },
      hearth: -0.36,
      chest: 0.74,
      rug: ["#0e1626", "#5a5440", "#12203a"],
    });
  }
}

/** Room 6, the last along the hall: grey-green plaster under a coffered
 *  ceiling, bare boards, the tall arched window, a hearth on the right. */
export class Room6Scene extends PlainRoomScene {
  constructor() {
    super("Room6", {
      style: {
        wall: "plaster", near: "#222a28", far: "#101514", back: "#161c1b", rail: 0,
        dado: { near: "#1c1814", far: "#0e0c0a", back: "#14110e", rail: "#2e2620", railFar: "#16120f", railBack: "#221c17" },
        floor: "boards", floorNear: "#2a2118", floorFar: "#14100b", ceiling: "coffers", ceilingCol: "#0d0f0f", window: "arch",
      },
      window: { x: -0.3, hw: 0.19, top: 288, sill: 104 },
      hearth: 0.42,
      chest: null,
      rug: ["#1c1a12", "#6a6040", "#2a2616"],
    });
  }
}
