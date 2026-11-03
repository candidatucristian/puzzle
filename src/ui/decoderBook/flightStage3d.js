import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { rewardAsset } from './diploma.js';

let prepared;
export function prepareEnvelopeModel() {
  prepared ??= fetch(rewardAsset('reward-envelope.glb')).then(response => {
    if (!response.ok) throw new Error('Envelope unavailable');
    return response.arrayBuffer();
  }).catch(error => { prepared = null; throw error; });
  return prepared;
}

export async function createFlightStage(canvas) {
  const bytes = await prepareEnvelopeModel();
  const gltf = await new GLTFLoader().parseAsync(bytes.slice(0), rewardAsset(''));
  const model = gltf.scene;
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model), centre = box.getCenter(new THREE.Vector3());
  model.position.sub(centre);
  const actor = new THREE.Group(); actor.add(model);
  const scene = new THREE.Scene(); scene.add(actor);
  const camera = new THREE.PerspectiveCamera(32, 1.6, .01, 50);
  const span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, .1);
  camera.position.set(0, span * 1.25, span * .46); camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xd8c4a1, 0x11121b, .48));
  const candle = new THREE.DirectionalLight(0xffce91, 2.3); candle.position.set(-3, 5, 2); scene.add(candle);
  const rim = new THREE.DirectionalLight(0x8fa6ca, .42); rim.position.set(4, 3, -2); scene.add(rim);
  const geometry = new Set(), materials = new Set(), textures = new Set();
  model.traverse(object => {
    if (!object.isMesh) return;
    geometry.add(object.geometry);
    for (const material of [].concat(object.material)) {
      materials.add(material); material.side = THREE.DoubleSide;
      if ('clearcoat' in material) material.clearcoat = 0;
      material.roughness = Math.max(material.roughness ?? .8, material.name.toLowerCase().includes('wax') ? .58 : .76);
      if (material.normalScale) material.normalScale.setScalar(.35);
      for (const value of Object.values(material)) if (value?.isTexture) { textures.add(value); value.anisotropy = 4; }
    }
  });
  const releaseModel = () => {
    for (const item of geometry) item.dispose(); for (const item of materials) item.dispose();
    const images = new Set([...textures].map(item => item.image));
    for (const texture of textures) texture.dispose(); for (const image of images) image?.close?.();
  };
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(176, 110, false);
    renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .92;
  } catch (error) { releaseModel(); renderer?.dispose(); throw error; }
  let disposed = false;
  return {
    render(progress) {
      if (disposed) return;
      actor.rotation.set(-.055 + Math.sin(progress * Math.PI) * .20, -.10 + progress * .32, -.09 + Math.sin(progress * Math.PI) * .08);
      renderer.render(scene, camera);
    },
    dispose() {
      if (disposed) return; disposed = true;
      releaseModel();
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
