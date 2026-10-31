// Publish the actual Blender model, transforms and animation timing. No movie encoder.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const source=JSON.parse(readFileSync(`${root}/.artifacts/letter-animation/letterAnimation.json`,'utf8'));
const bytes=readFileSync(`${root}/public/assets/images/CaseFile/letter/${source.model}`);
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));
if(!gltf.animations?.length)throw new Error('The Blender model has no native animation.');
const duration=Math.max(...gltf.animations.flatMap(clip=>clip.samplers.map(s=>gltf.accessors[s.input].max[0])));
const offset=Math.min(...gltf.animations.flatMap(clip=>clip.samplers.map(s=>gltf.accessors[s.input].min[0])));
const data={model:source.model,duration,arrival:source.arrival+offset,fps:source.fps,
  letterSize:source.letterSize,letterCentre:source.letterCentre,
  envelopeSize:source.envelopeSize,envelopeCentre:source.envelopeCentre,
  cues:Object.fromEntries(Object.entries(source.cues).map(([name,time])=>[name,time+offset]))};
writeFileSync(`${root}/src/ui/letterAnimation.json`,JSON.stringify(data,null,2)+'\n');
console.log(`Published Blender meshes, ${gltf.animations.length} animation clip(s), ${duration.toFixed(2)} s, ${(bytes.length/1048576).toFixed(1)} MB`);
