import PlainRoomScene from "./plainRoom.js";

// ─────────────────────────────────────────────────────────────────────────────
// The sixth room off the hall is built and empty for now (see plainRoom.js).
// ─────────────────────────────────────────────────────────────────────────────

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
