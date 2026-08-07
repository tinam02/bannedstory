/**
 * Animated PNG, stitched out of stills the browser already encoded.
 *
 * GIF is the obvious choice and it is the wrong one. Its alpha is one bit, so
 * every soft edge hard-cuts, and item effects are nothing but soft edges. APNG
 * carries the full 8-bit alpha, is lossless, and anything that does not know
 * the format falls back to showing the first frame as an ordinary PNG.
 *
 * No encoder dependency either. `canvas.toBlob` gives us a complete PNG per
 * frame, and an APNG is those same compressed scanlines re-labelled: the
 * frames after the first become `fdAT` instead of `IDAT`, with an `acTL` up
 * front and an `fcTL` before each one. The pixels are never touched, so what
 * comes out is bit for bit what the browser encoded.
 *
 * Every frame has to share the width, height, colour type and bit depth of the
 * first, which is free here because they all come off one canvas.
 */

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (b: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

/** length, type, data, crc. the crc covers the type and the data, not the length */
const chunk = (type: string, data: Uint8Array) => {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
};

type Chunk = { type: string; data: Uint8Array };

const chunksOf = (png: Uint8Array): Chunk[] => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const out: Chunk[] = [];
  // 8 bytes of signature first
  let p = 8;
  while (p + 8 <= png.length) {
    const len = view.getUint32(p);
    out.push({
      type: String.fromCharCode(png[p + 4], png[p + 5], png[p + 6], png[p + 7]),
      data: png.subarray(p + 8, p + 8 + len),
    });
    p += 12 + len;
  }
  return out;
};

/**
 * One APNG out of per-frame PNGs and their hold times.
 *
 * A single frame is passed straight back, since a one frame animation is just
 * a picture and the extra chunks would only confuse whatever opens it
 */
export const buildApng = (pngs: Uint8Array[], delaysMs: number[]): Blob => {
  if (pngs.length === 0) throw new Error('no frames');
  if (pngs.length === 1) return new Blob([pngs[0] as BlobPart], { type: 'image/png' });

  const first = chunksOf(pngs[0]);
  const ihdr = first.find(c => c.type === 'IHDR');
  if (!ihdr) throw new Error('no IHDR');
  const head = new DataView(ihdr.data.buffer, ihdr.data.byteOffset, ihdr.data.byteLength);
  const w = head.getUint32(0);
  const h = head.getUint32(4);

  const parts: Uint8Array[] = [pngs[0].subarray(0, 8), chunk('IHDR', ihdr.data)];

  const actl = new Uint8Array(8);
  const actlView = new DataView(actl.buffer);
  actlView.setUint32(0, pngs.length);
  actlView.setUint32(4, 0); // 0 plays means forever
  parts.push(chunk('acTL', actl));

  // one counter shared by every fcTL and fdAT, in the order they are written
  let seq = 0;

  pngs.forEach((png, i) => {
    const fctl = new Uint8Array(26);
    const f = new DataView(fctl.buffer);
    f.setUint32(0, seq++);
    f.setUint32(4, w);
    f.setUint32(8, h);
    f.setUint32(12, 0);
    f.setUint32(16, 0);
    // a fraction, so 83ms is 83/1000 rather than a rounded number of ticks
    f.setUint16(20, Math.max(1, Math.round(delaysMs[i] ?? 100)));
    f.setUint16(22, 1000);
    // clear to transparent before the next frame rather than painting over.
    // these are full size frames and compositing them would pile every glow
    // on top of the last
    fctl[24] = 1;
    fctl[25] = 0;
    parts.push(chunk('fcTL', fctl));

    // a frame's IDATs concatenated are one zlib stream, so they move as one
    const idat = chunksOf(png).filter(c => c.type === 'IDAT');
    const size = idat.reduce((n, c) => n + c.data.length, 0);
    const joined = new Uint8Array(size);
    let at = 0;
    for (const c of idat) {
      joined.set(c.data, at);
      at += c.data.length;
    }

    if (i === 0) {
      parts.push(chunk('IDAT', joined));
    } else {
      const fdat = new Uint8Array(4 + joined.length);
      new DataView(fdat.buffer).setUint32(0, seq++);
      fdat.set(joined, 4);
      parts.push(chunk('fdAT', fdat));
    }
  });

  parts.push(chunk('IEND', new Uint8Array(0)));
  return new Blob(parts as BlobPart[], { type: 'image/png' });
};
