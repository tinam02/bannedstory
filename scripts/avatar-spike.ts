// Composites a character out of the extracted sheets and diffs it against the
// maplestory.io render of the same outfit.
//
//   node --experimental-strip-types scripts/avatar-spike.ts
//   node --experimental-strip-types scripts/avatar-spike.ts --stance walk1 --frame 2
//   node --experimental-strip-types scripts/avatar-spike.ts --without cap
//   node --experimental-strip-types scripts/avatar-spike.ts --set full
//
// --set picks the outfit: basic, overall or full. see SETS below.
//
// Reads .avatar-out, written by scripts/wz/extract-avatar.lua.
//
// The stacking lives in lib/avatar.ts, which is what the app uses, so a pass
// here is a check on the code that ships and not on a copy of it.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildAvatar, type ItemManifest, type WornItem } from '../lib/avatar.ts';

const OUT = '.avatar-out';
const SPIKE = '.avatar-spike';
const REGION = 'GMS';
const VERSION = '265';

// part -> the folder its manifests live in, and the item we test with
type Wearing = [part: string, folder: string, id: number][];

const SKIN: Wearing = [
  ['body', 'Body', 2000],
  ['head', 'Head', 12000],
  ['face', 'Face', 20000],
  ['hair', 'Hair', 30000],
];

/**
 * The outfits to test with, picked by --set.
 *
 * `basic` is the one everything was verified against. `overall` swaps the top
 * and trousers for a longcoat, which is also a check on vslot suppression since
 * the longcoat claims MaPn. `full` covers the folders the other two miss
 */
const SETS: Record<string, Wearing> = {
  basic: [
    ...SKIN,
    ['cap', 'Cap', 1000000],
    ['coat', 'Coat', 1040000],
    ['pants', 'Pants', 1060000],
    ['shoes', 'Shoes', 1070000],
  ],
  overall: [
    ...SKIN,
    ['cap', 'Cap', 1000000],
    ['longcoat', 'Longcoat', 1050000],
    ['shoes', 'Shoes', 1070000],
  ],
  full: [
    ...SKIN,
    ['coat', 'Coat', 1040000],
    ['pants', 'Pants', 1060000],
    ['shoes', 'Shoes', 1070000],
    ['glove', 'Glove', 1080000],
    ['cape', 'Cape', 1100000],
    // a plain one handed sword. most weapons are a single `weapon` layer like
    // this one. a few, 1212000 among them, carry weapon1/2/3 as well, all at
    // the same z and all anchored hand(0,0). no subset or ordering of those
    // four matches the render, so multi part weapons are still open
    ['weapon', 'Weapon', 1302000],
  ],
};

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const stance = arg('stance', 'stand1');
const frame = Number(arg('frame', '0'));
const set = arg('set', 'basic');
const WEARING = SETS[set];
if (!WEARING) {
  console.error(`no such set ${set}, try ${Object.keys(SETS).join(', ')}`);
  process.exit(1);
}
const without = new Set(
  process.argv.filter((_, i) => process.argv[i - 1] === '--without'),
);

const decode = (file: string) => execFileSync(
  'ffmpeg',
  ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'],
  { maxBuffer: 1e9 },
);

const encode = (buf: Buffer, w: number, h: number, file: string) => execFileSync(
  'ffmpeg',
  ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba',
   '-s', `${w}x${h}`, '-i', '-', file],
  { input: buf },
);

const pngSize = (file: string) => {
  const b = readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};

/** tightest box that still holds every non transparent pixel */
const crop = (buf: Buffer, w: number, h: number) => {
  let l = w, t = h, r = -1, b = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (buf[(y * w + x) * 4 + 3] > 0) {
        if (x < l) l = x;
        if (x > r) r = x;
        if (y < t) t = y;
        if (y > b) b = y;
      }
    }
  }
  if (r < 0) return { w: 0, h: 0, buf: Buffer.alloc(0) };
  const cw = r - l + 1, ch = b - t + 1;
  const out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    buf.copy(out, y * cw * 4, ((t + y) * w + l) * 4, ((t + y) * w + l + cw) * 4);
  }
  return { w: cw, h: ch, buf: out };
};

// ---------------------------------------------------------------- build

const meta = JSON.parse(readFileSync(join(OUT, 'meta.json'), 'utf8'));

const worn: WornItem[] = [];
for (const [part, folder, id] of WEARING) {
  if (without.has(part)) continue;
  const file = join(OUT, folder, `${id}.json`);
  if (!existsSync(file)) {
    console.log(`skipping ${part}, no ${file}`);
    continue;
  }
  worn.push({
    part,
    manifest: JSON.parse(readFileSync(file, 'utf8')) as ItemManifest,
    sheetUrl: join(OUT, folder, `${id}.png`),
  });
}

const { placed, orphans, bounds, w: W, h: H } = buildAvatar(
  worn, meta.zmap, meta.smap, stance, frame,
);
if (orphans.length) {
  console.log(`ORPHANS, these hang off nothing and sit at the origin: ${orphans.join(', ')}`);
}

console.log(`${stance} frame ${frame}: ${placed.length} layers into ${W}x${H}`);

// one decode per sheet, not per layer
const sheets = new Map<string, { w: number; h: number; px: Buffer }>();
for (const p of placed) {
  if (sheets.has(p.sheet)) continue;
  const { w, h } = pngSize(p.sheet);
  sheets.set(p.sheet, { w, h, px: decode(p.sheet) });
}

const canvas = Buffer.alloc(W * H * 4);
for (const p of placed) {
  const s = sheets.get(p.sheet)!;
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const si = ((p.sy + y) * s.w + (p.sx + x)) * 4;
      const a = s.px[si + 3] / 255;
      if (!a) continue;
      const di = ((p.y - bounds.t + y) * W + (p.x - bounds.l + x)) * 4;
      for (let k = 0; k < 3; k++) {
        canvas[di + k] = Math.round(s.px[si + k] * a + canvas[di + k] * (1 - a));
      }
      canvas[di + 3] = Math.round((a + (canvas[di + 3] / 255) * (1 - a)) * 255);
    }
  }
}
encode(canvas, W, H, join(SPIKE, 'ours.png'));

// ---------------------------------------------------------------- theirs

const items = [...new Set(placed.map(p => p.item))];
const path = items
  .map(id => encodeURIComponent(JSON.stringify({ itemId: id, region: REGION, version: VERSION })))
  .join(',');
const res = await fetch(`https://maplestory.io/api/character/${path}/${stance}/${frame}`);
if (!res.ok) {
  console.error(`maplestory.io said ${res.status}`);
  process.exit(1);
}
writeFileSync(join(SPIKE, 'theirs.png'), Buffer.from(await res.arrayBuffer()));

// ---------------------------------------------------------------- diff

const a = crop(canvas, W, H);
const t = pngSize(join(SPIKE, 'theirs.png'));
const b = crop(decode(join(SPIKE, 'theirs.png')), t.w, t.h);

console.log(`ours trimmed ${a.w}x${a.h}, theirs trimmed ${b.w}x${b.h}`);
if (a.w !== b.w || a.h !== b.h) {
  console.log('DIFFERENT SIZE');
  process.exit(0);
}

let diff = 0;
for (let i = 0; i < a.buf.length; i++) {
  if (Math.abs(a.buf[i] - b.buf[i]) > 8) diff++;
}
console.log(`differing channels: ${diff} of ${a.w * a.h * 4}`);
console.log(diff === 0 ? 'IDENTICAL.' : 'close but not exact');

// where the difference is says far more than how much of it there is. a blob
// over one limb points at one layer, scattered pixels point at colour
if (diff > 0) {
  let dl = a.w, dt = a.h, dr = -1, db = -1;
  const mask = Buffer.alloc(a.w * a.h * 4);
  for (let y = 0; y < a.h; y++) {
    for (let x = 0; x < a.w; x++) {
      const i = (y * a.w + x) * 4;
      let d = 0;
      for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(a.buf[i + k] - b.buf[i + k]));
      if (d > 8) {
        mask[i] = 255; mask[i + 3] = 255;
        if (x < dl) dl = x;
        if (x > dr) dr = x;
        if (y < dt) dt = y;
        if (y > db) db = y;
      } else {
        const g = b.buf[i + 3] ? 70 : 0;
        mask[i] = g; mask[i + 1] = g; mask[i + 2] = g; mask[i + 3] = 255;
      }
    }
  }
  console.log(`differs in x ${dl}..${dr}, y ${dt}..${db} of ${a.w}x${a.h}`);
  encode(mask, a.w, a.h, join(SPIKE, 'diff.png'));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(SPIKE, 'diff.png'),
    '-vf', 'scale=iw*5:ih*5:flags=neighbor', join(SPIKE, 'diff-5x.png')]);
}
