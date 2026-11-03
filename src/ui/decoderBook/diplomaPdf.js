import { DIPLOMA_WIDTH, DIPLOMA_HEIGHT, diplomaText, recipientFontSize, rewardAsset } from './diploma.js';

const encoder = new TextEncoder();
const bytes = value => encoder.encode(value);

/** A print-resolution image PDF, generated locally only when the player saves it. */
function imagePDF(jpeg, width, height) {
  const chunks = [], offsets = [0]; let length = 0;
  const append = value => { const part = typeof value === 'string' ? bytes(value) : value; chunks.push(part); length += part.length; };
  const object = (id, content) => { offsets[id] = length; append(`${id} 0 obj\n`); append(content); append('\nendobj\n'); };
  append('%PDF-1.4\n%DecoderBook\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
  offsets[4] = length;
  append(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  append(jpeg); append('\nendstream\nendobj\n');
  const content = 'q\n841.89 0 0 595.28 0 0 cm\n/Im0 Do\nQ\n';
  object(5, `<< /Length ${bytes(content).length} >>\nstream\n${content}endstream`);
  object(6, '<< /Title (Decoder\'s Book - Fibonacci - Diploma) /Creator (Ashcombe Manor) >>');
  const xref = length;
  append(`xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}

export async function makeDiplomaPDF(entry, language) {
  if (!entry.recipientName) throw new Error('A diploma needs its recipient.');
  const stock = new Image(); stock.src = rewardAsset('diploma-print.webp');
  await Promise.all([
    stock.decode(), document.fonts.ready,
    document.fonts.load('37px "Cormorant Garamond"', entry.recipientName),
    document.fonts.load('10px "IBM Plex Sans"'), document.fonts.load('10px "IBM Plex Mono"'),
  ]);
  const canvas = document.createElement('canvas'); canvas.width = 3508; canvas.height = 2480;
  const ctx = canvas.getContext('2d'), t = diplomaText(entry, language);
  ctx.fillStyle = '#f1e7d1'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(stock, 0, 0, canvas.width, canvas.height);
  ctx.scale(canvas.width / DIPLOMA_WIDTH, canvas.height / DIPLOMA_HEIGHT);
  ctx.globalCompositeOperation = 'multiply'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const ink = (text, y, size, family = 'Cormorant Garamond', color = '#342b22', style = '') => {
    ctx.font = `${style} ${size}px "${family}"`.trim(); ctx.fillStyle = color; ctx.fillText(text, 380, y, 630);
  };
  ink(t.brand, 43, 25);
  ctx.letterSpacing = '2.7px'; ink(t.archive, 78, 8, 'IBM Plex Sans', '#6b5234'); ctx.letterSpacing = '0px';
  ink(t.certificate, 111, 17, undefined, undefined, 'italic'); ink(t.title, 131, 67, undefined, '#33271c', '500');
  ink(t.award, 205, 22);
  ctx.letterSpacing = '1.7px'; ink(t.presented.toLocaleUpperCase(language), 251, 9, 'IBM Plex Sans', '#77614a'); ctx.letterSpacing = '0px';
  ink(t.name, 273, recipientFontSize(t.name));
  ctx.font = '17px "Cormorant Garamond"';
  const lines = []; let line = '';
  for (const word of t.recognition.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > 490) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  lines.forEach((text, i) => ink(text, 332 + i * 23, 17));
  ctx.letterSpacing = '1.1px'; ink(t.qualities, 391, 7, 'IBM Plex Sans', '#6b5234'); ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
  const footer = (text, y, size, font, color = '#342b22') => { ctx.font = `${size}px "${font}"`; ctx.fillStyle = color; ctx.fillText(text, 65, y, 500); };
  footer(t.issued.toLocaleUpperCase(language), 437, 7, 'IBM Plex Sans', '#77614a');
  footer(t.date, 450, 13, 'Cormorant Garamond');
  footer(t.reference, 475, 7, 'IBM Plex Sans', '#77614a'); footer(t.serial, 490, 8, 'IBM Plex Mono');
  const jpeg = await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not render diploma')), 'image/jpeg', .96));
  return imagePDF(new Uint8Array(await jpeg.arrayBuffer()), canvas.width, canvas.height);
}
