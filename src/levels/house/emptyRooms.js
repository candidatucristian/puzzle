import PlainRoomScene from "./plainRoom.js";

// ─────────────────────────────────────────────────────────────────────────────
// The rooms behind the doors that had nothing behind them: IX and X off the
// chemist's hall, XI off the round room under the dome, XII and XIII down
// the passage beyond it. Each is a room of the house as it was left — its
// walls, its window and the moon through it, a rug, a fire long out in some
// — with nothing in it yet to be found (see house/plainRoom.js). What is
// put in them later goes in a furnished subclass of its own, as Room VII's.
// ─────────────────────────────────────────────────────────────────────────────

const room = (key, plan) => class extends PlainRoomScene {
  constructor() {
    super(key, plan);
  }
};

// off the chemist's hall: plaster and flagstones, as his laboratory
export const Room9Scene = room("Room9", {
  style: {
    wall: "plaster", near: "#1e2624", far: "#0e1312", back: "#141a19", rail: 0,
    dado: { kind: "boards", h: 92, near: "#1a2320", far: "#0c110f", back: "#121916", rail: "#3a2c1c", railFar: "#1a130c", railBack: "#2c2216" },
    floor: "flags", floorNear: "#2a2c2b", floorFar: "#121414", ceiling: "beams", ceilingCol: "#0c0d0d", window: "sash",
  },
  window: { x: -0.25, hw: 0.2, top: 240, sill: 110 },
  hearth: 0.45,
  chest: null,
  rug: ["#16191a", "#34383a", "#1c2022"],
});

export const Room10Scene = room("Room10", {
  style: {
    wall: "plaster", near: "#24262a", far: "#101215", back: "#171a1e", rail: 0,
    floor: "boards", floorNear: "#2a2118", floorFar: "#14100b", ceiling: "beams", ceilingCol: "#0c0d0e", window: "leaded",
  },
  window: { x: 0.3, hw: 0.18, top: 246, sill: 112 },
  hearth: null,
  chest: null,
  rug: ["#1a1614", "#4a3a2c", "#241e1a"],
});

// off the round room under the dome: paper and parquet, as the floor below the stars
export const Room11Scene = room("Room11", {
  style: {
    wall: "paper", near: "#232630", far: "#10121a", back: "#181b24", rail: 0,
    floor: "herringbone", floorNear: "#2e2318", floorFar: "#15100b", ceiling: "coffers", ceilingCol: "#0c0d10", window: "round",
  },
  window: { x: 0, hw: 0.16, top: 250, sill: 150 },
  hearth: -0.5,
  chest: null,
  rug: ["#14161e", "#3a3e5a", "#1c1f2a"],
});

// down the passage: older, rougher rooms, the plaster bare
export const Room12Scene = room("Room12", {
  style: {
    wall: "planks", near: "#262420", far: "#12100e", back: "#1a1815", rail: 0,
    floor: "flags", floorNear: "#2a2926", floorFar: "#121110", ceiling: "beams", ceilingCol: "#0b0a09", window: "leaded",
  },
  window: { x: -0.35, hw: 0.15, top: 236, sill: 120 },
  hearth: 0.4,
  chest: null,
  rug: ["#181512", "#3e3428", "#201c18"],
});

export const Room13Scene = room("Room13", {
  style: {
    wall: "plaster", near: "#22221e", far: "#100f0d", back: "#181714", rail: 0,
    floor: "boards", floorNear: "#2a2118", floorFar: "#14100b", ceiling: "beams", ceilingCol: "#0b0a09", window: "sash",
  },
  window: { x: 0.35, hw: 0.17, top: 240, sill: 116 },
  hearth: -0.45,
  chest: null,
  rug: ["#161412", "#3a3026", "#1e1a16"],
});

export const EMPTY_ROOMS = [Room9Scene, Room10Scene, Room11Scene, Room12Scene, Room13Scene];
