// Canvas documents need CJK glyphs and character-level line breaks as well as Latin words.
const CJK = /[\p{Script=Han}\u3000-\u303f\uff00-\uffef]/u;
const CJK_TOKENS = /[\p{Script=Han}\u3000-\u303f\uff00-\uffef]|[^\s\p{Script=Han}\u3000-\u303f\uff00-\uffef]+|\s+/gu;
const CLOSE = /^[，。！？；：、）》】」』”’.,!?;:)}\]]/u;
const OPEN = /[（《【「『“‘({\[]$/u;

export function canvasFontFamily(preferred) {
  const sans = /sans|mono|arial|courier/i.test(preferred);
  return `"${preferred}", "Ashcombe CJK ${sans ? 'Sans' : 'Serif'}", ${sans ? 'sans-serif' : 'serif'}`;
}

export function revealTextSegments(value) {
  const text = String(value);
  if (!CJK.test(text)) return text.split(/(\s+)/);
  if (typeof Intl.Segmenter === 'function') {
    return [...new Intl.Segmenter('zh-Hans', { granularity: 'word' }).segment(text)].map(part => part.segment);
  }
  return Array.from(text);
}

export function wrapCanvasText(ctx, value, width) {
  const text = String(value), out = [];
  if (!CJK.test(text)) {
    let current = '';
    for (const word of text.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && ctx.measureText(candidate).width > width) { out.push(current); current = word; }
      else current = candidate;
    }
    if (current) out.push(current);
    return out;
  }
  for (const paragraph of text.split(/\r?\n/)) {
    const units = [];
    for (const token of paragraph.match(CJK_TOKENS) ?? []) {
      const previous = units.at(-1);
      // Keep closing punctuation with its preceding character and opening marks with what follows.
      if (previous && !/^\s+$/.test(previous) && (CLOSE.test(token) || OPEN.test(previous))) units[units.length - 1] += token;
      else units.push(token);
    }
    let current = '';
    for (const unit of units) {
      const candidate = current + unit;
      if (current.trim() && unit.trim() && ctx.measureText(candidate).width > width) {
        out.push(current.trimEnd()); current = unit.trimStart();
      } else current = current ? candidate : unit.trimStart();
    }
    out.push(current.trimEnd());
  }
  return out;
}
