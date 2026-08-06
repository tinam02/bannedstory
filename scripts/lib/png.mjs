// just enough PNG to read and write the sheets we produce ourselves
//
// no dependency and no ffmpeg subprocess. building the hair icons means opening
// 17431 small pngs, and at roughly 60ms per process spawn on windows that would
// be a quarter of an hour of pure overhead for a few seconds of actual work.
//
// deliberately narrow: 8 bit RGBA, non interlaced, which is what GDI+ writes
// for the 32bpp ARGB bitmaps extract-avatar.lua saves. anything else throws
// rather than guessing, because a silently mis-decoded sheet would look like a
// packing bug and cost a day

import { inflateSync, deflateSync } from 'node:zlib';

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = buf => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

/** paeth, straight from the spec */
const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
};

/** decode to { w, h, data } where data is w*h*4 bytes of RGBA */
export const decodePNG = buf => {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a png');

  let pos = 8;
  let w = 0;
  let h = 0;
  const idat = [];

  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);

    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      const depth = data[8];
      const color = data[9];
      const interlace = data[12];
      if (depth !== 8 || color !== 6 || interlace !== 0) {
        throw new Error(
          `unsupported png: depth ${depth}, colour type ${color}, interlace ${interlace}`,
        );
      }
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 4;
  const out = Buffer.alloc(h * stride);

  // each scanline carries its filter byte, and filters reference the line above
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const up = dst - stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[src + x];
      const a = x >= 4 ? out[dst + x - 4] : 0;
      const b = y > 0 ? out[up + x] : 0;
      const c = x >= 4 && y > 0 ? out[up + x - 4] : 0;
      let r;
      if (filter === 0) r = v;
      else if (filter === 1) r = v + a;
      else if (filter === 2) r = v + b;
      else if (filter === 3) r = v + ((a + b) >> 1);
      else if (filter === 4) r = v + paeth(a, b, c);
      else throw new Error(`bad filter ${filter} on row ${y}`);
      out[dst + x] = r & 0xff;
    }
  }

  return { w, h, data: out };
};

const chunk = (type, body) => {
  const out = Buffer.alloc(body.length + 12);
  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, 'latin1');
  body.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
  return out;
};

/** encode RGBA back to a png. filter 0 throughout, zlib does the work */
export const encodePNG = ({ w, h, data }) => {
  const stride = w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    data.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

/** src rect into dst at (dx,dy), source-over, both RGBA */
export const blit = (dst, src, sx, sy, sw, sh, dx, dy) => {
  for (let y = 0; y < sh; y++) {
    const py = dy + y;
    if (py < 0 || py >= dst.h) continue;
    for (let x = 0; x < sw; x++) {
      const px = dx + x;
      if (px < 0 || px >= dst.w) continue;
      const si = ((sy + y) * src.w + (sx + x)) * 4;
      const a = src.data[si + 3] / 255;
      if (!a) continue;
      const di = (py * dst.w + px) * 4;
      for (let k = 0; k < 3; k++) {
        dst.data[di + k] = Math.round(
          src.data[si + k] * a + dst.data[di + k] * (1 - a),
        );
      }
      dst.data[di + 3] = Math.round((a + (dst.data[di + 3] / 255) * (1 - a)) * 255);
    }
  }
};
