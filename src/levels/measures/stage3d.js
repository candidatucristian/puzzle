import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** The two bottles by the sink in three dimensions (MeasuresScene.js drives
 *  them): thick clear glass, the one etched 500 ml, the other 300 ml, and the
 *  water in each — cut level by a plane that stays level however the bottle
 *  is tipped, at the height that keeps the water's volume (so a bottle tipped
 *  to pour fills toward its lip, as the drawn ones did: art.js waterIn).
 *
 *  Each bottle is made to its drawn vessel's own measure (art.js layoutSink,
 *  in screen pixels), so the scene's pours, streams and places fit it; the
 *  camera is the render's own (measuresLevel.json: its field of view, its
 *  tilt, where it stands from the row), its picture laid on the screen where
 *  the render lies. The render itself is set behind them, filling the view,
 *  so that their glass and their water bend what is behind them as glass and
 *  water do; the whole is drawn onto its own canvas, which the scene shows in
 *  place of the render (MeasuresScene.js). */

const SLICES = 48; // for finding where the water stands

export class MeasuresStage {
  constructor() {
    this.canvas = document.createElement("canvas");
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true }));
    r.setPixelRatio(1);
    r.setClearColor(0x000000, 1);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.9;
    r.localClippingEnabled = true;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = (this.scene = new THREE.Scene());
    const pmrem = new THREE.PMREMGenerator(r);
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
    pmrem.dispose();
    scene.environment = this.env;
    scene.environmentIntensity = 0.9;
    scene.add(new THREE.HemisphereLight(0xb8c6d8, 0x2a2420, 0.6));
    // the lamp by the sink, warm, up on the right; the window's cold behind
    const lamp = (this.lamp = new THREE.DirectionalLight(0xffd2a0, 1.6));
    lamp.position.set(0.9, 1.2, 0.2);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(1024, 1024);
    Object.assign(lamp.shadow.camera, { left: -0.7, right: 0.7, top: 0.7, bottom: -0.7, near: 0.1, far: 4 });
    lamp.shadow.radius = 5;
    lamp.shadow.bias = -0.0004;
    scene.add(lamp, lamp.target);
    const window = new THREE.DirectionalLight(0x9fb4d8, 0.6);
    window.position.set(-0.2, 0.8, -1.2);
    scene.add(window);
    // the slate: it takes their shadows and shows nothing else
    this.slate = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.ShadowMaterial({ opacity: 0.16, color: 0x05080a }));
    this.slate.rotation.x = -Math.PI / 2;
    this.slate.receiveShadow = true;
    scene.add(this.slate);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.02, 10);
    // the render, filling the view behind everything (carried with the eye)
    this.backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }));
    this.camera.add(this.backdrop);
    scene.add(this.camera);
    this.bottles = [];
    this.ray = new THREE.Raycaster();
    this.front = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // the plane of their row, facing the eye
  }

  /** The render's own camera (L.camera: its vertical field of view, its tilt
   *  down, its height over the slate and distance from the row, in metres),
   *  its whole picture lying on the screen at `frame`; then the bottles, made
   *  to the drawn vessels' measure. */
  fit(W, H, L, labels, render) {
    this.W = W; this.H = H;
    this.renderer.setSize(W, H, false);
    const cam = this.camera, C = L.camera, frame = C.frame;
    cam.fov = C.fov; cam.aspect = frame.w / frame.h;
    // (the screen is a window on the render's picture, which may run past it)
    cam.setViewOffset(frame.w, frame.h, -frame.x, -frame.y, W, H);
    cam.updateProjectionMatrix();
    const far = 6, fullH = 2 * far * Math.tan(THREE.MathUtils.degToRad(C.fov / 2)), fullW = fullH * cam.aspect;
    this.backdrop.position.set(((W / 2 - frame.x) / frame.w - 0.5) * fullW, -((H / 2 - frame.y) / frame.h - 0.5) * fullH, -far);
    this.backdrop.scale.set(fullW * (W / frame.w), fullH * (H / frame.h), 1);
    this.backdrop.material.map?.dispose();
    const picture = new THREE.CanvasTexture(render);
    picture.colorSpace = THREE.SRGBColorSpace;
    this.backdrop.material.map = picture;
    this.backdrop.material.needsUpdate = true;
    const big = L.vessels[0], tall = 0.2; // the 500 ml bottle stands twenty centimetres
    this.mpp = tall / (big.bottom - big.top); // metres to a pixel, at the row
    // where the render's eye stood: over the slate, back from the row, tilted down
    cam.position.set(0, C.height, C.distance);
    cam.rotation.set(-THREE.MathUtils.degToRad(C.pitch), 0, 0);
    cam.updateMatrixWorld();
    // and the lamp by the sink where the render has it
    this.lamp.position.set(...C.lamp);
    for (const b of this.bottles) { this.scene.remove(b.group); dispose(b.group); }
    this.bottles = L.vessels.filter((v) => v.kind === "bottle").map((v, i) => this._bottle(v, labels[i]));
  }

  // a bottle to the drawn vessel's measure: its glass, its rim's light, its
  // etched capacity, and the water in it
  _bottle(v, label) {
    const m = this.mpp, R = (v.w / 2) * m, body = v.h * m, neckR = (v.neckW / 2) * m, neckH = v.neckH * m;
    const t = Math.max(0.0022, R * 0.06), shoulder = R * 0.75, base = 0.008;
    const top = body + neckH;
    // its outside, from the middle of its foot round to the lip; then its inside back down
    const outer = [[0, 0], [R * 0.9, 0], [R * 0.98, 0.002], [R, 0.008], [R, body - shoulder], [R * 0.93, body - shoulder * 0.35],
      [neckR * 1.5, body - 0.004], [neckR * 1.08, body + 0.002], [neckR, body + 0.008], [neckR, top - 0.004], [neckR * 1.14, top - 0.002], [neckR * 1.14, top]];
    const inner = [[neckR - t * 0.6, top], [neckR - t * 0.6, body + 0.008], [neckR * 1.4 - t, body - 0.004], [R * 0.93 - t, body - shoulder * 0.35],
      [R - t, body - shoulder], [R - t, base + 0.004], [R * 0.9 - t, base], [0, base]];
    const lathe = (pts) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 64);
    const group = new THREE.Group();
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.03, metalness: 0, transmission: 1, thickness: t * 1.6, ior: 1.5,
      attenuationColor: new THREE.Color(0xeef6f2), attenuationDistance: 0.9,
      specularIntensity: 1, envMapIntensity: 1.8, depthWrite: false,
    });
    const shell = new THREE.Mesh(lathe([...outer, ...inner]), glass);
    shell.castShadow = true;
    shell.renderOrder = 0;
    group.add(shell);
    // the light along its edges, where the glass is seen through most of its thickness
    const rim = new THREE.Mesh(lathe(outer), rimMaterial());
    rim.renderOrder = 3;
    group.add(rim);
    // its thick foot, a little greener in the glass
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.9 - t, R * 0.9, base, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transmission: 1, thickness: base, ior: 1.5, attenuationColor: new THREE.Color(0xc8ded4), attenuationDistance: 0.05, depthWrite: false }));
    foot.position.y = base / 2;
    foot.renderOrder = 2;
    group.add(foot);
    // the capacity etched on its front
    const etching = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.002, R * 1.002, body * 0.2, 48, 1, true, -Math.PI * 0.32, Math.PI * 0.64),
      new THREE.MeshBasicMaterial({ map: etched(label), transparent: true, opacity: 0.75, depthWrite: false }));
    etching.position.y = body * 0.66;
    etching.renderOrder = 4;
    group.add(etching);
    // the water: the bottle's inside, closed at its mouth, cut by a level plane;
    // its inside faces, seen through the cut, are its surface
    const level = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const cavity = [[0, base], ...inner.slice().reverse().slice(1), [0, top]];
    const waterGeometry = lathe(cavity);
    const waterMaterial = (side) => new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.04, transmission: 1, thickness: R * 1.6, ior: 1.33, side,
      attenuationColor: new THREE.Color(0xdcefee), attenuationDistance: 0.45, clippingPlanes: [level], envMapIntensity: 1.1,
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial(THREE.FrontSide));
    water.renderOrder = 1;
    // (its inside faces, seen through the cut, are the water's surface: lighter)
    const surface = new THREE.Mesh(waterGeometry, waterMaterial(THREE.BackSide));
    surface.material.attenuationColor = new THREE.Color(0xeef8f8);
    surface.material.specularIntensity = 1.4;
    surface.renderOrder = 1;
    group.add(water, surface);
    this.scene.add(group);
    // its inside, as stacked slices, for finding where the water stands
    const profile = inner.slice().reverse();
    const radiusAt = (y) => {
      for (let k = 1; k < profile.length; k++) {
        const [r0, y0] = profile[k - 1], [r1, y1] = profile[k];
        if (y >= Math.min(y0, y1) && y <= Math.max(y0, y1) && y1 !== y0) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
      }
      return 0;
    };
    const slices = Array.from({ length: SLICES }, (_, k) => {
      const y = base + ((k + 0.5) / SLICES) * (top - base), r = radiusAt(y);
      return { y, r, v: Math.PI * r * r * ((top - base) / SLICES) };
    });
    return { group, level, water, surface, slices, volume: slices.reduce((s, x) => s + x.v, 0), v, top };
  }

  /** Bottle `i` as the scene has it: its middle at screen (x, y), tipped
   *  `angle` (clockwise, radians), `frac` of it full. */
  setBottle(i, { x, y, angle, frac }) {
    const b = this.bottles[i];
    if (!b) return;
    // its foot: below its middle, turned with it, on the plane of the row
    const v = b.v, fx = x - Math.sin(angle) * v.bottom, fy = y + Math.cos(angle) * v.bottom;
    const foot = this.toRow(fx, fy);
    if (!foot) return;
    b.group.position.copy(foot);
    b.group.rotation.set(0, 0, -angle);
    b.group.updateMatrixWorld();
    // the level that holds this much of it, tipped as it is
    const h = this._level(b, frac, -angle, foot);
    b.level.constant = h;
    b.water.visible = b.surface.visible = frac > 0.002;
  }

  // the height (world) of a level plane holding `frac` of the bottle, the
  // bottle standing at `foot` tipped `tilt` about the eye's axis: each slice
  // of its inside a tipped disc, how much of it lies under the plane
  _level(b, frac, tilt, foot) {
    const want = frac * b.volume, sin = Math.abs(Math.sin(tilt)), cos = Math.cos(tilt);
    const under = (h) => {
      let total = 0;
      for (const s of b.slices) {
        const cy = foot.y + s.y * cos, reach = s.r * sin;
        if (reach < 1e-6) { total += cy <= h ? s.v : 0; continue; }
        const x = Math.max(-1, Math.min(1, (h - cy) / reach));
        total += s.v * (1 - (Math.acos(x) - x * Math.sqrt(1 - x * x)) / Math.PI);
      }
      return total;
    };
    let lo = foot.y - b.top, hi = foot.y + b.top;
    for (let k = 0; k < 28; k++) { const mid = (lo + hi) / 2; if (under(mid) < want) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  /** where a point of the screen lies on the plane of the bottles' row */
  toRow(x, y) {
    this.ray.setFromCamera(new THREE.Vector2((x / this.W) * 2 - 1, 1 - (y / this.H) * 2), this.camera);
    return this.ray.ray.intersectPlane(this.front, new THREE.Vector3());
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    for (const b of this.bottles) dispose(b.group);
    this.slate.geometry.dispose(); this.slate.material.dispose();
    this.env.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

function dispose(group) {
  group.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    o.material.map?.dispose();
    o.material.dispose();
  });
}

// the brightening of glass toward its edges, where it is seen edge-on
function rimMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    uniforms: { tint: { value: new THREE.Color(0xf2f7f8) } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main() { vec4 p = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-p.xyz); gl_Position = projectionMatrix * p; }`,
      fragmentShader: `uniform vec3 tint; varying vec3 vN; varying vec3 vV;
      void main() { float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4(tint * f * 1.1, f * 1.1); }`,
  });
}

// the capacity, etched white into the glass
function etched(text) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(240,246,248,.9)";
  g.font = "500 70px Georgia, 'Times New Roman', serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 256, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
