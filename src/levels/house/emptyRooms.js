import PlainRoomScene from "./plainRoom.js";
import Room11Scene from "../room11/Room11Scene.js";
import { Room12Scene, Room13Scene } from "../atticRooms/AtticRoomScene.js";

export { Room11Scene, Room12Scene, Room13Scene };

// ─────────────────────────────────────────────────────────────────────────────
// IX and X keep the plain rooms off the chemistry hall. XI is the furnished
// physics study; XII and XIII are the archive and workshop under the roof.
// Their scene keys and registration order stay together here.
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

export const EMPTY_ROOMS = [Room9Scene, Room10Scene, Room11Scene, Room12Scene, Room13Scene];
