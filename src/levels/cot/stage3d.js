import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildToy } from "./toys3d.js";
import { toyMaterials } from "./materials3d.js";
import { buildMobile } from "./mobile3d.js";
import native from "./nativeCot.json";

/** Five live clues and the sewn mobile share the original Cycles plate's
 * physical camera. Warm bedside light and cool window light cast shadows
 * onto the sheet; world coordinates preserve perspective during dragging. */

const WIDTH = 1.2; // the mattress, across, in metres
const FOV = 38; // the camera's height of view, in degrees

export class CotStage {
  constructor(ids, { atlas, photograph = null }) {
    this.canvas = document.createElement("canvas");
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, premultipliedAlpha: true }));
    r.setPixelRatio(Math.min(2,Math.max(1.25,window.devicePixelRatio||1)));
    r.setClearColor(0x000000, 0);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = .74;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    const scene = (this.scene = new THREE.Scene());
    // what the metal and the glaze reflect: a dim room
    const pmrem = new THREE.PMREMGenerator(r);
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    scene.environment = this.env;
    scene.environmentIntensity = .34;
    scene.add(new THREE.HemisphereLight(0xb6c9df, 0x4f4030, .48));
    // the night-light: warm, beyond the cot on the right, a little behind it
    const lamp = (this.lamp = new THREE.DirectionalLight(0xffd3a0, 1.65));
    lamp.position.set(.82, .88, -.12);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(2048, 2048);
    Object.assign(lamp.shadow.camera, { left: -0.8, right: 0.8, top: 0.8, bottom: -0.8, near: 0.1, far: 4 });
    lamp.shadow.radius = 4;
    lamp.shadow.bias = -0.0004;
    lamp.shadow.normalBias = .0006;
    scene.add(lamp, lamp.target);
    // the moon, from the window on the left
    const moon = new THREE.DirectionalLight(0xb7d1ff, .90);
    moon.position.set(-1.02, .80, .12);
    scene.add(moon);
    // a glint, carried down the gold man when he is touched
    this.glint = new THREE.PointLight(0xfff0c8, 0, 0.35, 2);
    scene.add(this.glint);
    // the sheet: it takes their shadows, and shows nothing else
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.22, .756), new THREE.ShadowMaterial({ opacity: .29, color: 0x1a1510 }));
    sheet.rotation.x = -Math.PI / 2;
    sheet.receiveShadow = true;
    scene.add(sheet);
    // the dark close under each, where it presses into the mattress
    const blobTexture = new THREE.CanvasTexture(radial()), materials = toyMaterials(atlas);
    this.mobile = buildMobile(materials,native.mobile);
    scene.add(this.mobile.group);
    this._mobilePose = "";
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 10);
    this.toys = {};
    for (const id of ids) {
      const { group, parts } = buildToy(id, materials, photograph);
      const holder = new THREE.Group();
      holder.add(group);
      scene.add(holder);
      const size = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
      const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTexture, color: 0x000000, transparent: true, depthWrite: false, opacity: 0.5 }));
      blob.rotation.x = -Math.PI / 2;
      blob.renderOrder = -1;
      blob.userData.size = { x: size.x * 1.25, z: size.z * 1.35 };
      scene.add(blob);
      this.toys[id] = { holder, group, parts, blob };
    }
    this.ray = new THREE.Raycaster();
    this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.depth = 0.64;
  }

  /** The camera that sees the mattress as the picture does: `L.at(a, b)` is
   *  where the picture has (a, b) on its mattress, in a W x H screen. */
  fit(W, H, L) {
    this.W = W; this.H = H;
    this.renderer.setSize(W, H, false);
    const cam = this.camera;
    const spec = L.native;
    cam.aspect = W / H;
    cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(H / (spec.height * L.s) * Math.tan(THREE.MathUtils.degToRad(spec.fov / 2))));
    cam.position.set(0, spec.camera.height, spec.camera.distance);
    cam.rotation.set(-spec.camera.pitch, 0, 0);
    cam.updateProjectionMatrix();cam.updateMatrixWorld();
    this.depth = spec.sheetDepth;
  }

  /** where (a, b) on the mattress is, in the world */
  at(a, b) {
    return { x: (a - 0.5) * WIDTH, z: -this.depth / 2 + b * this.depth };
  }

  /** where a point of the screen falls on the mattress, as (a, b) */
  plane(x, y) {
    this.ray.setFromCamera(new THREE.Vector2((x / this.W) * 2 - 1, 1 - (y / this.H) * 2), this.camera);
    const p = this.ray.ray.intersectPlane(this.ground, new THREE.Vector3());
    if (!p) return null;
    return { a: p.x / WIDTH + 0.5, b: (p.z + this.depth / 2) / this.depth };
  }

  /** a thing set where it is: on the sheet at (a, b), held up `lift`
   *  metres, leaning `tilt` the way it is carried */
  place(id, { a, b, lift = 0, tilt = 0 }) {
    const t = this.toys[id], p = this.at(a, b), up = Math.min(1, lift / 0.05);
    t.holder.position.set(p.x, lift, p.z);
    t.holder.rotation.set(0, 0, tilt);
    const s = t.blob.userData.size, spread = 1 + up * 0.5;
    t.blob.position.set(p.x, 0.0006, p.z);
    t.blob.scale.set(s.x * spread, s.z * spread, 1);
    t.blob.material.opacity = 0.5 * (1 - up * 0.55);
  }

  /** the box a thing takes up on the screen */
  bounds(id) {
    const box = new THREE.Box3().setFromObject(this.toys[id].holder);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      const v = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(this.camera);
      const x = ((v.x + 1) / 2) * this.W, y = ((1 - v.y) / 2) * this.H;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  poseMobile(turn, now, moving, look) {
    const signature = [turn, moving ? now : 0, look.x, look.y].map(n => n.toFixed(4)).join(":");
    if (signature === this._mobilePose) return false;
    this._mobilePose = signature;
    this.mobile.pose(turn, now, moving, look);
    return true;
  }

  dispose() {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    this.scene.traverse((o) => {
      if (!o.isMesh && !o.isLine) return;
      geometries.add(o.geometry);
      for (const m of [].concat(o.material)) {
        materials.add(m);
        for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
    this.env.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

// a soft round dark, for under each thing
function radial() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.45, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return c;
}
