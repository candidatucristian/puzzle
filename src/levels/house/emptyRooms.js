import QuietRoomScene from "./quietRoom.js";
import ROOM9 from "./rooms/Room9.json";
import ROOM12 from "./rooms/Room12.json";
import ROOM13 from "./rooms/Room13.json";

// ─────────────────────────────────────────────────────────────────────────────
// The rooms with nothing in them to solve (house/quietRoom.js), each a
// Blender render of its own (art/blender/room_<name>.py):
//   IX    off the chemist's hall: empty, the fire laid and never lit, only the
//         moon on the dusty flags (room_nine.py)
//   XII   under the roof: the archive, charts and instrument cases under the
//         eaves, a lantern (room_archive.py)
//   XIII  under the roof: the workshop, tools on the bench, the hearth swept
//         and cold, a lantern (room_workshop.py)
// Their scene keys and registration order stay together here.
// ─────────────────────────────────────────────────────────────────────────────

const WARM = 0xffb66c;
const room = (key, spec, lights) => class extends QuietRoomScene {
  constructor() {
    super(key, spec, lights);
  }
};

export const Room9Scene = room("Room9", ROOM9);
export const Room12Scene = room("Room12", ROOM12, { lantern: WARM });
export const Room13Scene = room("Room13", ROOM13, { lantern: WARM });

export const EMPTY_ROOMS = [Room9Scene, Room12Scene, Room13Scene];
