// builds the Hair and Face closet index from the sprites we already extracted
//
//   node scripts/wz/dump-names.lua   (in LuaConsole, once)
//   node scripts/build-sprite-icons.mjs
//
// Character.wz stores no icon for hair or faces, the game just draws the sprite,
// which is why extract-index.lua came back with nothing for both and why
// maplestory.io only serves /icon and never /iconRaw for those slots.
//
// so the icon is made here, out of the sprite: take the default frame, composite
// its layers in zmap order the same way the character does, trim to the pixels
// that are actually there, and pack the results into sheets in the same shape
// extract-index.lua writes. no wz pass involved

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { decodePNG, encodePNG, blit } from './lib/png.mjs';

const OUT = 'C:/TINA/CODE/bannedstory/bannedstory/.avatar-out';
const INDEX = join(OUT, 'index');
const SHEET_W = 1024;
const SHEET_H = 4096;

// hairShade is the shadow a hat casts, not part of the hairstyle, and the
// renderer leaves it out too. see UNRESOLVED in lib/avatar.ts
const SKIP_LAYERS = new Set(['hairShade']);

const FOLDERS = ['Hair', 'Face'];

const names = existsSync(join(INDEX, 'names.json'))
  ? JSON.parse(readFileSync(join(INDEX, 'names.json'), 'utf8'))
  : null;
if (!names) {
  console.error('no index/names.json, run scripts/wz/dump-names.lua first');
  process.exit(1);
}

const meta = JSON.parse(readFileSync(join(OUT, 'meta.json'), 'utf8'));
const zIndex = new Map(meta.zmap.map((n, i) => [n, i]));

/**
 * One item drawn as it looks, trimmed to its own pixels.
 *
 * Every layer of a hairstyle hangs off `brow`, and in the default frame that
 * anchor is the same point for all of them, so placing each at -origin lines
 * them up exactly as the character does. zmap decides which is in front
 */
const renderItem = (manifest, sheet) => {
  // `default` is the neutral pose and the right icon when it exists. it is not
  // always there, so rather than give up we take whatever the item does have.
  // `blink` is the usual fallback for a face and its first frame is the eyes
  // open, so it reads as the plain face
  const seq =
    manifest.frames.default ??
    manifest.frames.stand1 ??
    manifest.frames.blink ??
    Object.values(manifest.frames)[0];
  if (!seq?.length) return null;
  const step = seq[0];

  const layers = [];
  for (const [layer, idx] of Object.entries(step)) {
    if (SKIP_LAYERS.has(layer)) continue;
    const c = manifest.canvases[String(idx)];
    if (!c?.origin || !c.w || !c.h) continue;
    layers.push({ c, z: c.z || layer });
  }
  if (!layers.length) return null;

  // zmap runs front to back, so the biggest index is drawn first
  layers.sort((a, b) => (zIndex.get(b.z) ?? -1) - (zIndex.get(a.z) ?? -1));

  let l = Infinity;
  let t = Infinity;
  let r = -Infinity;
  let b = -Infinity;
  for (const { c } of layers) {
    l = Math.min(l, -c.origin.x);
    t = Math.min(t, -c.origin.y);
    r = Math.max(r, -c.origin.x + c.w);
    b = Math.max(b, -c.origin.y + c.h);
  }
  const w = r - l;
  const h = b - t;
  if (w < 1 || h < 1 || w > 512 || h > 512) return null;

  const img = { w, h, data: Buffer.alloc(w * h * 4) };
  for (const { c } of layers) {
    blit(img, sheet, c.x, c.y, c.w, c.h, -c.origin.x - l, -c.origin.y - t);
  }

  // trim fully transparent edges, or every icon carries the whole frame's
  // padding and the sheets get much bigger than they need to be
  let tl = w;
  let tt = h;
  let tr = -1;
  let tb = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (img.data[(y * w + x) * 4 + 3] > 0) {
        if (x < tl) tl = x;
        if (x > tr) tr = x;
        if (y < tt) tt = y;
        if (y > tb) tb = y;
      }
    }
  }
  if (tr < 0) return null;

  const cw = tr - tl + 1;
  const ch = tb - tt + 1;
  const cropped = { w: cw, h: ch, data: Buffer.alloc(cw * ch * 4) };
  for (let y = 0; y < ch; y++) {
    img.data.copy(
      cropped.data,
      y * cw * 4,
      ((tt + y) * w + tl) * 4,
      ((tt + y) * w + tl + cw) * 4,
    );
  }
  return cropped;
};

for (const folder of FOLDERS) {
  const dir = join(OUT, folder);
  const ids = readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => Number(f.replace('.json', '')))
    .sort((a, b) => a - b);

  console.log(`${folder}: ${ids.length} items`);

  const icons = [];
  let skipped = 0;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (i % 2000 === 0) process.stdout.write(`  ${i}/${ids.length}\r`);
    try {
      const manifest = JSON.parse(
        readFileSync(join(dir, `${id}.json`), 'utf8'),
      );
      const sheet = decodePNG(readFileSync(join(dir, `${id}.png`)));
      const icon = renderItem(manifest, sheet);
      if (!icon) {
        skipped++;
        continue;
      }
      icons.push({ id, icon, name: names[String(id)] ?? '' });
    } catch (err) {
      skipped++;
    }
  }
  console.log(`  rendered ${icons.length}, skipped ${skipped}          `);

  // shelf pack, tallest first, wrapping to a new sheet at SHEET_H
  const order = [...icons].sort((a, b) => b.icon.h - a.icon.h);
  const sheets = [{ w: 1, h: 1 }];
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const it of order) {
    if (x > 0 && x + it.icon.w > SHEET_W) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    if (y + it.icon.h > SHEET_H && y > 0) {
      sheets.push({ w: 1, h: 1 });
      x = 0;
      y = 0;
      rowH = 0;
    }
    const s = sheets[sheets.length - 1];
    it.s = sheets.length - 1;
    it.x = x;
    it.y = y;
    x += it.icon.w;
    if (x > s.w) s.w = x;
    if (y + it.icon.h > s.h) s.h = y + it.icon.h;
    if (it.icon.h > rowH) rowH = it.icon.h;
  }

  sheets.forEach((s, si) => {
    const canvas = { w: s.w, h: s.h, data: Buffer.alloc(s.w * s.h * 4) };
    for (const it of icons) {
      if (it.s !== si) continue;
      blit(canvas, it.icon, 0, 0, it.icon.w, it.icon.h, it.x, it.y);
    }
    const file = join(INDEX, `${folder}-icons-${si}.png`);
    writeFileSync(file, encodePNG(canvas));
    console.log(`  sheet ${si}: ${s.w}x${s.h}`);
  });

  icons.sort((a, b) => a.id - b.id);
  writeFileSync(
    join(INDEX, `${folder}.json`),
    JSON.stringify({
      sheets: sheets.map((_, si) => `${folder}-icons-${si}.png`),
      items: icons.map(it => ({
        id: it.id,
        name: it.name,
        // wz has no cash flag for these, and the tab has no filter worth
        // applying to a hairstyle anyway
        cash: false,
        s: it.s,
        x: it.x,
        y: it.y,
        w: it.icon.w,
        h: it.icon.h,
      })),
    }),
  );
  const named = icons.filter(it => it.name).length;
  console.log(`  wrote ${folder}.json, ${icons.length} items, ${named} named\n`);
}
