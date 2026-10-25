// Publish the complete native Cycles plate; all clues are already in its geometry.
// Usage: node art/blender/old_tree_publish.mjs
import sharp from 'sharp';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const source=process.argv[2]??'.artifacts/old-tree-v2';
const target='public/assets/images/BinaryTree';
const {version,width,height,safeBounds}=JSON.parse(await readFile(`${source}/old-tree.json`,'utf8'));
await mkdir(target,{recursive:true});
await sharp(`${source}/old-tree.png`)
  .webp({quality:96,effort:6})
  .toFile(`${target}/old-tree-native-v${version}.webp`);
await writeFile('src/levels/binarytree/nativeTree.json',JSON.stringify({version,width,height,safeBounds},null,2)+'\n');
console.log('The Old Tree: published the native Blender specimen and its physical clues.');
