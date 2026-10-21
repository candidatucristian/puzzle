import * as THREE from "three";

// One set per cot stage; colour and relief have different colour spaces.
export function toyMaterials(atlas) {
  const names = ["walnut", "cloth", "paper", "brass", "felt", "paint", "tiles", "lining", "wool"];
  const surfaces = {};
  names.forEach((name, i) => {
    const c = document.createElement("canvas"); c.width = c.height = 400;
    const g = c.getContext("2d"), sw = atlas.width / 3, sh = atlas.height / 3;
    g.drawImage(atlas, (i % 3) * sw + 5, Math.floor(i / 3) * sh + 5, sw - 10, sh - 10, 0, 0, 400, 400);
    const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
    const bump = c.cloneNode(); const bg = bump.getContext("2d");
    bg.drawImage(c, 0, 0);
    const data = bg.getImageData(0, 0, 400, 400);
    for (let p = 0; p < data.data.length; p += 4) {
      const l = data.data[p] * .2126 + data.data[p + 1] * .7152 + data.data[p + 2] * .0722;
      data.data[p] = data.data[p + 1] = data.data[p + 2] = l;
    }
    bg.putImageData(data, 0, 0);
    const bumpMap = new THREE.CanvasTexture(bump); bumpMap.anisotropy = 8;
    if (name === "tiles") {
      for (const t of [map, bumpMap]) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3);
      }
    }
    surfaces[name] = { map, bumpMap };
  });
  const surface = (name, options = {}) => new THREE.MeshStandardMaterial({
    ...surfaces[name], bumpScale: .00012, roughness: .74, ...options,
  });
  return {
    surfaces, surface,
    wood: surface("walnut", { roughness: .48, bumpScale: .00018 }),
    cloth: surface("cloth", { roughness: .92 }),
    paper: surface("paper", { roughness: .94, bumpScale: .00006 }),
    brass: surface("brass", { color: 0xffe3a4, metalness: .92, roughness: .4, bumpScale: .00004 }),
    gold: surface("brass", { map: null, color: 0xd6af57, metalness: .86, roughness: .34, envMapIntensity: 1.4, bumpScale: .000025 }),
    felt: surface("felt", { roughness: .96, bumpScale: .0001 }),
    wool: surface("wool", { color: 0x98938a, roughness: .97, bumpScale: .0001 }),
    paint: surface("paint", { roughness: .79, bumpScale: .00009 }),
    tiles: surface("tiles", { color: 0xc5aaa0, roughness: .88, bumpScale: .0005 }),
    lining: surface("lining", { color: 0xa9b5c0, roughness: .86, bumpScale: .0001 }),
  };
}
