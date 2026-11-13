// Moves an MP4's index (its `moov` box) in front of its picture and sound
// (`mdat`), so that a browser can start playing it as soon as the first bytes
// arrive, instead of first fetching the end of the file. The chunk offsets in
// the index are moved along with the data. (What ffmpeg's +faststart does.)
//
//   node scripts/mp4-faststart.mjs <in.mp4> <out.mp4>
import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("usage: node scripts/mp4-faststart.mjs <in.mp4> <out.mp4>");
const file = readFileSync(input);

// the boxes at one level: [type, start, size, header]
function boxes(buf, from, to) {
  const out = [];
  for (let at = from; at < to;) {
    let size = buf.readUInt32BE(at), header = 8;
    const type = buf.toString("latin1", at + 4, at + 8);
    if (size === 1) { size = Number(buf.readBigUInt64BE(at + 8)); header = 16; }
    else if (size === 0) size = to - at;
    if (size < header || at + size > to) throw new Error(`bad box ${type} at ${at}`);
    out.push({ type, start: at, size, header });
    at += size;
  }
  return out;
}

const top = boxes(file, 0, file.length);
const moov = top.find((b) => b.type === "moov"), mdat = top.find((b) => b.type === "mdat");
if (!moov || !mdat) throw new Error("no moov or mdat");
if (moov.start < mdat.start) { writeFileSync(output, file); console.log("already fast-start"); process.exit(0); }

// the new order: everything but the index and the data as it was, then the index, then the data
const rest = top.filter((b) => b !== moov && b !== mdat && b.start < mdat.start);
const after = top.filter((b) => b !== moov && b !== mdat && b.start > mdat.start);
const order = [...rest, moov, mdat, ...after];
const shift = rest.reduce((n, b) => n + b.size, 0) + moov.size - mdat.start;

// the index, with every chunk offset moved by `shift`
const index = Buffer.from(file.subarray(moov.start, moov.start + moov.size));
const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts", "dinf", "mvex", "moof", "traf"]);
let moved = 0;
(function walk(from, to) {
  for (const b of boxes(index, from, to)) {
    if (CONTAINERS.has(b.type)) walk(b.start + b.header, b.start + b.size);
    else if (b.type === "stco" || b.type === "co64") {
      const wide = b.type === "co64", entries = index.readUInt32BE(b.start + b.header + 4);
      for (let i = 0, at = b.start + b.header + 8; i < entries; i++, at += wide ? 8 : 4) {
        if (wide) index.writeBigUInt64BE(index.readBigUInt64BE(at) + BigInt(shift), at);
        else {
          const value = index.readUInt32BE(at) + shift;
          if (value > 0xffffffff) throw new Error("offset past 4 GB: needs co64");
          index.writeUInt32BE(value, at);
        }
      }
      moved += entries;
    }
  }
})(moov.header, moov.size);

const parts = order.map((b) => (b === moov ? index : file.subarray(b.start, b.start + b.size)));
writeFileSync(output, Buffer.concat(parts));
console.log(`fast-start: index moved ahead of the data, ${moved} chunk offsets moved by ${shift}`);
