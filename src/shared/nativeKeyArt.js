import { makeCanvas } from './paint.js';
import COFFER from '../levels/house/nativeCoffer.json';

export const KEY_ART = 'house_key_cycles_v2';
export const KEY_ART_URL = `${import.meta.env?.BASE_URL ?? '/'}assets/images/Chest/native-v2/key.webp`;
const image = typeof Image === 'undefined' ? null : new Image();
if (image) image.src = KEY_ART_URL;

/** The actual Cycles key, photographed in the room or in neutral light for the index. */
export function paintKey(scene) {
  const canvas = makeCanvas(scene ? 432 : 96, scene ? 990 : 220);
  const roomVersion = COFFER.rooms[scene?.place]?.artVersion ?? COFFER.version;
  const roomKey = `coffer_${scene?.place}_key_v${roomVersion}`;
  const key = scene?.textures.exists(roomKey) ? roomKey : KEY_ART;
  const source = scene?.textures.exists(key) ? scene.textures.get(key).getSourceImage() : image;
  const draw = () => {
    if (!source?.width) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  };
  if (source?.complete === false) source.addEventListener('load', draw, { once: true });
  else draw();
  return canvas;
}
