import { prepareHandset } from "./proceduralPhone.js";
import { prepareDesk } from "./proceduralDesk.js";

// Design coordinates shared by the procedural geometry and live hit areas.
export const DESK_ART = {
  key: "mp_walnut_code",
  width: 1536,
  height: 1024,
};

export const PHONE_ART = {
  key: "mp_handset_code",
  width: 857,
  height: 1835,
  scale: 800 / 1835,
  screen: { x: 429, y: 680, width: 450, height: 254 },
  softKeys: { key: "mp_soft_key_code", x: [260, 603], y: 923, width: 156, height: 70 },
  rocker: { key: "mp_rocker_code", x: 429, y: 1047, width: 350, height: 138 },
  keys: { key: "mp_number_key_code", x: [252, 430, 607], y: [1191, 1311, 1430, 1550], width: 150, height: 90 },
};

export function phonePoint(x, y) {
  return {
    x: (x - PHONE_ART.width / 2) * PHONE_ART.scale,
    y: (y - PHONE_ART.height / 2) * PHONE_ART.scale,
  };
}

export function preparePhoneArt(scene) {
  prepareHandset(scene, PHONE_ART, phonePoint);
}

export function prepareDeskArt(scene) {
  prepareDesk(scene, DESK_ART);
}
