import sharp from 'sharp';
const source = '.artifacts/intro-story-review-2026-11-14/ashcombe-seal-photograph.png';
const target = 'public/assets/images/CaseFile/ashcombe-seal-photograph.webp';
const result = await sharp(source).webp({ quality: 90, alphaQuality: 100 }).toFile(target);
console.log(target, result.width, result.height, result.size);
