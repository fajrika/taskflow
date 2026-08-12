const zlib = require("zlib");
const fs = require("fs");

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makeIcon(size, bg, fg) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const rIn = size * 0.18, rOut = size * 0.34;
  const sq = size * 0.46; // kotak kecil sudut kanan-atas

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // background rounded (biarkan transparan di luar, diisi bg di dalam radius)
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      px[i] = bg[0]; px[i + 1] = bg[1]; px[i + 2] = bg[2]; px[i + 3] = 255;

      // dua batang chart (centang/bar) warna fg
      const insideBar = (bx, by, bw, bh) => x >= bx && x < bx + bw && y >= by && y < by + bh;
      // batang kiri
      if (insideBar(cx - rIn * 0.9, cy - rOut * 0.5, rIn * 0.42, rOut * 1.05)) {
        px[i] = fg[0]; px[i + 1] = fg[1]; px[i + 2] = fg[2];
      }
      // batang kanan lebih pendek
      if (insideBar(cx + rIn * 0.1, cy - rOut * 0.25, rIn * 0.42, rOut * 0.75)) {
        px[i] = fg[0]; px[i + 1] = fg[1]; px[i + 2] = fg[2];
      }
    }
  }

  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const bg = [15, 23, 42];   // slate-900
const fg = [16, 185, 129]; // emerald-500

fs.writeFileSync("public/icon-192.png", makeIcon(192, bg, fg));
fs.writeFileSync("public/icon-512.png", makeIcon(512, bg, fg));
console.log("icons OK");
