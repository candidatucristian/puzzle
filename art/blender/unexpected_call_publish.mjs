import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const ARTIFACTS = path.join(ROOT, ".artifacts", "mobilephone");
const OUT_DIR = path.join(ROOT, "public", "assets", "images", "MobilePhone");

mkdirSync(ARTIFACTS, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

async function buildNoteTexture() {
  const w = 1600;
  const h = 1100;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <radialGradient id="paperGrad" cx="52%" cy="48%" r="72%">
        <stop offset="0%" stop-color="#e5d7be" />
        <stop offset="68%" stop-color="#d7c5a6" />
        <stop offset="100%" stop-color="#bfa883" />
      </radialGradient>
      <filter id="inkBleed" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#paperGrad)" />
    <!-- subtle ruled lines & tea stain -->
    <g stroke="#b89f79" stroke-width="2" opacity="0.28">
      <line x1="90" y1="260" x2="1510" y2="260" />
      <line x1="90" y1="430" x2="1510" y2="430" />
      <line x1="90" y1="600" x2="1510" y2="600" />
      <line x1="90" y1="770" x2="1510" y2="770" />
      <line x1="90" y1="940" x2="1510" y2="940" />
    </g>
    <line x1="175" y1="40" x2="175" y2="1060" stroke="#9e5a4b" stroke-width="3" opacity="0.28" />
    <circle cx="1320" cy="830" r="190" fill="none" stroke="#9c7b50" stroke-width="14" opacity="0.16" filter="url(#inkBleed)" />
    <circle cx="1335" cy="838" r="176" fill="none" stroke="#8a6940" stroke-width="6" opacity="0.12" />
    <!-- double border rule at top -->
    <line x1="90" y1="115" x2="1510" y2="115" stroke="#473321" stroke-width="5" opacity="0.55" />
    <line x1="90" y1="129" x2="1510" y2="129" stroke="#473321" stroke-width="2" opacity="0.42" />
    <text x="215" y="96" font-family="Georgia, 'Times New Roman', serif" font-size="38" letter-spacing="8" fill="#4c3723" opacity="0.72">MEMORANDUM — S.S. EREBUS</text>
    <!-- main warning message -->
    <g filter="url(#inkBleed)" fill="#24170d" font-family="'Courier New', Georgia, serif" font-weight="700" font-size="112" letter-spacing="1.5">
      <text x="210" y="395">don't answer if</text>
      <text x="210" y="565">you don't know</text>
      <text x="210" y="735">who's calling.</text>
    </g>
    <!-- underline under "who's calling." -->
    <path d="M 210 768 Q 590 756 1015 774" fill="none" stroke="#24170d" stroke-width="9" stroke-linecap="round" opacity="0.82" filter="url(#inkBleed)" />
  </svg>`;

  const outPath = path.join(ARTIFACTS, "note_ink.png");
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`Wrote ${outPath}`);

  const cw = 1200;
  const ch = 900;
  const chartSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="0 0 ${cw} ${ch}">
    <defs>
      <radialGradient id="chartGrad" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="#d8c7a6" />
        <stop offset="75%" stop-color="#bda682" />
        <stop offset="100%" stop-color="#967e5b" />
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#chartGrad)" />
    <rect x="45" y="45" width="1110" height="810" fill="none" stroke="#3d2c1d" stroke-width="6" opacity="0.7" />
    <rect x="58" y="58" width="1084" height="784" fill="none" stroke="#3d2c1d" stroke-width="2" opacity="0.55" />
    <!-- Rhumb lines & compass rose -->
    <g stroke="#5a432e" stroke-width="1.4" opacity="0.45">
      <line x1="60" y1="450" x2="1140" y2="450" />
      <line x1="600" y1="60" x2="600" y2="840" />
      <line x1="150" y1="120" x2="1050" y2="780" />
      <line x1="150" y1="780" x2="1050" y2="120" />
      <line x1="380" y1="60" x2="820" y2="840" />
      <line x1="820" y1="60" x2="380" y2="840" />
      <circle cx="600" cy="450" r="180" fill="none" stroke-width="2.5" />
      <circle cx="600" cy="450" r="145" fill="none" stroke-dasharray="8 6" />
      <circle cx="600" cy="450" r="28" fill="none" stroke-width="3" />
    </g>
    <!-- Coastline contours -->
    <path d="M 80 260 Q 220 290 310 230 T 520 270 Q 640 310 730 220 T 980 260 L 980 90 L 80 90 Z" fill="#b39b76" stroke="#3b2a1a" stroke-width="3.5" opacity="0.65" />
    <path d="M 240 810 Q 370 690 510 710 T 830 640 Q 960 620 1110 700 L 1110 810 Z" fill="#b39b76" stroke="#3b2a1a" stroke-width="3.5" opacity="0.65" />
    <text x="600" y="145" text-anchor="middle" font-family="Georgia, serif" font-size="30" letter-spacing="6" fill="#2e1f12" opacity="0.75">CHART OF THE NORTHERN PASSAGE</text>
  </svg>`;
  const chartPath = path.join(ARTIFACTS, "nautical_chart.png");
  await sharp(Buffer.from(chartSvg)).png().toFile(chartPath);
  console.log(`Wrote ${chartPath}`);
}

async function publishAssets() {
  const deskPng = path.join(ARTIFACTS, "desk.png");
  const cradlePng = path.join(ARTIFACTS, "cradle.png");
  const handsetPng = path.join(ARTIFACTS, "handset.png");

  if (!existsSync(deskPng) || !existsSync(cradlePng) || !existsSync(handsetPng)) {
    throw new Error("Missing rendered PNGs in .artifacts/mobilephone/");
  }

  const frontalWebp = path.join(OUT_DIR, "frontal-desk-photographic-v2.webp");
  await sharp(deskPng)
    .resize(1536, 1024, { kernel: sharp.kernel.lanczos3 })
    .webp({ quality: 94, effort: 6 })
    .toFile(frontalWebp);
  console.log(`Published ${frontalWebp}`);

  const walnutWebp = path.join(OUT_DIR, "walnut-desk-photographic-v1.webp");
  await sharp(deskPng)
    .resize(1536, 1024, { kernel: sharp.kernel.lanczos3 })
    .webp({ quality: 92, effort: 6 })
    .toFile(walnutWebp);
  console.log(`Published ${walnutWebp}`);

  const cradleWebp = path.join(OUT_DIR, "charging-cradle-photographic-v1.webp");
  await sharp(cradlePng)
    .resize(1774, 887, { kernel: sharp.kernel.lanczos3 })
    .webp({ quality: 95, alphaQuality: 100, effort: 6 })
    .toFile(cradleWebp);
  console.log(`Published ${cradleWebp}`);

  const handsetWebp = path.join(OUT_DIR, "handset-photographic-v1.webp");
  await sharp(handsetPng)
    .resize(857, 1835, { kernel: sharp.kernel.lanczos3 })
    .webp({ quality: 95, alphaQuality: 100, effort: 6 })
    .toFile(handsetWebp);
  console.log(`Published ${handsetWebp}`);

  const layoutPath = path.join(ARTIFACTS, "layout.json");
  if (existsSync(layoutPath)) {
    console.log("Layout:", readFileSync(layoutPath, "utf8").trim());
  }
}

const isPrep = process.argv.includes("--prep");
if (isPrep) {
  await buildNoteTexture();
} else {
  await publishAssets();
}

