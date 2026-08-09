// Draws the README's artwork out of the game's own files.
//
//   node --experimental-strip-types scripts/build-readme-art.ts
//   node --experimental-strip-types scripts/build-readme-art.ts --contact
//
// Two pictures, into docs/:
//
//   banner.png  the title inside a chat balloon, nine-sliced to fit the text
//   cast.png    a row of characters, composited the way the app composites them
//
// Nothing here is drawn by hand. The balloon is a real UI.wz style placed by
// components/molecules/Stage/captionDraw.ts, the same code the stage uses, and
// the characters go through lib/avatar.ts. So the README is the app's own
// output rather than a mockup of it, and it cannot drift from what ships.
//
// --contact writes docs/.contact.png instead: the same banner in a dozen
// styles, for picking one. There are 450.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from '../node_modules/next/og.js';
import { placePieces, boundsOf, lineBox, type Placed } from '../components/molecules/Stage/captionDraw.ts';
import { buildAvatar, type ItemManifest, type WornItem } from '../lib/avatar.ts';
// @ts-ignore - plain js helper, no types
import { decodePNG, encodePNG } from './lib/png.mjs';

const ART = 'public/avatar';
const OUT = 'docs';

/** the balloon style the banner uses. --contact shows the alternatives */
const STYLE = '3';
const TITLE = 'Henehoe';
/** whole-pixel scale, so the art stays sharp rather than interpolated */
const SCALE = 4;
const FONT = 'C:/Windows/Fonts/arial.ttf';

// ---------------------------------------------------------------- pixels

type Img = { w: number; h: number; px: Buffer };

const readImg = (file: string): Img => {
  const { w, h, data } = decodePNG(readFileSync(file));
  return { w, h, px: data as Buffer };
};

const blank = (w: number, h: number): Img => ({ w, h, px: Buffer.alloc(w * h * 4) });

/** source over, one pixel */
const over = (dst: Img, di: number, src: Img, si: number) => {
  const a = src.px[si + 3] / 255;
  if (!a) return;
  for (let k = 0; k < 3; k++) {
    dst.px[di + k] = Math.round(src.px[si + k] * a + dst.px[di + k] * (1 - a));
  }
  dst.px[di + 3] = Math.round((a + (dst.px[di + 3] / 255) * (1 - a)) * 255);
};

/** copies a rect, every source pixel becoming a scale x scale block */
const blit = (
  dst: Img, src: Img,
  sx: number, sy: number, sw: number, sh: number,
  dx: number, dy: number, scale = 1,
  /** punch the silhouette out instead of drawing it, for the balloon's tail */
  cut = false,
) => {
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const si = ((sy + y) * src.w + (sx + x)) * 4;
      if (!src.px[si + 3]) continue;
      for (let by = 0; by < scale; by++) {
        for (let bx = 0; bx < scale; bx++) {
          const px = dx + x * scale + bx;
          const py = dy + y * scale + by;
          if (px < 0 || py < 0 || px >= dst.w || py >= dst.h) continue;
          const di = (py * dst.w + px) * 4;
          if (cut) dst.px.fill(0, di, di + 4);
          else over(dst, di, src, si);
        }
      }
    }
  }
};

/** the tightest box still holding every non transparent pixel */
const trim = (img: Img): Img & { l: number; t: number } => {
  let l = img.w, t = img.h, r = -1, b = -1;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (!img.px[(y * img.w + x) * 4 + 3]) continue;
      if (x < l) l = x;
      if (x > r) r = x;
      if (y < t) t = y;
      if (y > b) b = y;
    }
  }
  if (r < 0) return { ...blank(1, 1), l: 0, t: 0 };
  const w = r - l + 1, h = b - t + 1;
  const out = blank(w, h);
  for (let y = 0; y < h; y++) {
    img.px.copy(out.px, y * w * 4, ((t + y) * img.w + l) * 4, ((t + y) * img.w + l + w) * 4);
  }
  return { ...out, l, t };
};

// ---------------------------------------------------------------- text

const font = readFileSync(FONT);

/**
 * The title as pixels, trimmed to its ink.
 *
 * Satori and resvg both ship inside next, so this costs no dependency. Drawn at
 * the finished size rather than drawn small and scaled up, or the letters come
 * out of the scaler as mush next to the balloon's hard pixel edges
 */
const textImg = async (text: string, size: number, colour: string): Promise<Img> => {
  const res = new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          width: '100%', height: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Arial', fontSize: size, fontWeight: 700,
          color: colour, letterSpacing: size * 0.02,
        },
        children: text,
      },
    },
    {
      width: Math.ceil(size * text.length * 1.2) + 64,
      height: Math.ceil(size * 2.2),
      fonts: [{ name: 'Arial', data: font, style: 'normal', weight: 700 }],
    },
  );
  const buf = Buffer.from(await res.arrayBuffer());
  const { w, h, data } = decodePNG(buf);
  return trim({ w, h, px: data as Buffer });
};

/** wz stores the style's text colour as a signed argb int */
const argb = (n: number) => {
  const v = n >>> 0;
  return `rgb(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255})`;
};

// ---------------------------------------------------------------- banner

const balloons = JSON.parse(readFileSync(join('public/ui/balloons', 'balloons.json'), 'utf8'));

const banner = async (styleId: string, title: string, scale: number): Promise<Img> => {
  const style = balloons.styles[styleId];
  if (!style) throw new Error(`no balloon style ${styleId}`);
  const frame = style.frames[0];
  const strip = readImg(join('public/ui/balloons', style.file));

  // the line box the style was drawn around, so the text sits where chat would
  const line = lineBox(frame) || 14;
  const text = await textImg(title, Math.round(line * scale * 0.78), argb(style.clr));

  // the content box, in the balloon's own 1x pixels
  const padX = 8;
  const W = Math.ceil(text.w / scale) + padX * 2;
  const H = Math.max(line, Math.ceil(text.h / scale) + 4);

  const placed: Placed[] = placePieces('balloon', frame, W, H);
  const { l, t, r, b } = boundsOf(placed, W, H);
  const out = blank((r - l) * scale, (b - t) * scale);

  for (const p of placed) {
    // tile, cropping the last row and column so a box that is not a whole
    // number of tiles still ends flush. same rule as the stage
    for (let y = 0; y < p.h; y += p.sh) {
      for (let x = 0; x < p.w; x += p.sw) {
        const cw = Math.min(p.sw, p.w - x);
        const ch = Math.min(p.sh, p.h - y);
        blit(out, strip, p.sx, p.sy, cw, ch,
          (p.x - l + x) * scale, (p.y - t + y) * scale, scale, p.cut);
        if (p.cut) {
          blit(out, strip, p.sx, p.sy, cw, ch,
            (p.x - l + x) * scale, (p.y - t + y) * scale, scale, false);
        }
      }
    }
  }

  // the text, centred in the content box
  const tx = (-l * scale) + Math.round((W * scale - text.w) / 2);
  const ty = (-t * scale) + Math.round((H * scale - text.h) / 2);
  blit(out, text, 0, 0, text.w, text.h, tx, ty, 1);
  return out;
};

// ---------------------------------------------------------------- cast

const meta = JSON.parse(readFileSync(join(ART, 'meta.json'), 'utf8'));

/**
 * Who stands along the bottom.
 *
 * Hand picked rather than randomised, so the row keeps its silhouettes apart:
 * a hat, a cape and a weapon between them, different skins, and a stance each
 * so nobody is standing in the same way as their neighbour. Ids are what the
 * closet calls them, so swapping one is a matter of searching the tab and
 * copying the number
 */
const CAST: { stance: string; wear: [part: string, folder: string, id: number][] }[] = [
  {
    // witch, with wings
    stance: 'alert',
    wear: [['body', 'Body', 2002], ['head', 'Head', 12002], ['face', 'Face', 20221],
      ['hair', 'Hair', 60530], ['hat', 'Cap', 1001002], ['overall', 'Longcoat', 1050011],
      ['cape', 'Cape', 1102006], ['shoes', 'Shoes', 1070000]],
  },
  {
    // cat ears
    stance: 'stand1',
    wear: [['body', 'Body', 2012], ['head', 'Head', 12012], ['face', 'Face', 20021],
      ['hair', 'Hair', 71140], ['hat', 'Cap', 1001031], ['overall', 'Longcoat', 1050161],
      ['shoes', 'Shoes', 1074218]],
  },
  {
    // the big hat, with a star cape behind it
    stance: 'stand2',
    wear: [['body', 'Body', 2000], ['head', 'Head', 12000], ['face', 'Face', 20021],
      ['hair', 'Hair', 66720], ['hat', 'Cap', 1007098], ['overall', 'Longcoat', 1050036],
      ['cape', 'Cape', 1102009], ['shoes', 'Shoes', 1070000]],
  },
  {
    // school uniform, mid stride, carrying something
    stance: 'walk1',
    wear: [['body', 'Body', 2004], ['head', 'Head', 12004], ['face', 'Face', 20421],
      ['hair', 'Hair', 30000], ['hat', 'Cap', 1000016], ['overall', 'Longcoat', 1050177],
      ['weapon', 'Weapon', 1215006], ['shoes', 'Shoes', 1070000]],
  },
  {
    // the banana beanie
    stance: 'stand1',
    wear: [['body', 'Body', 2020], ['head', 'Head', 12020], ['face', 'Face', 20021],
      ['hair', 'Hair', 36420], ['hat', 'Cap', 1007077], ['overall', 'Longcoat', 1050419],
      ['shoes', 'Shoes', 1070000]],
  },
];

const person = (
  wear: [string, string, number][], stance: string, scale: number,
): Img | null => {
  const worn: WornItem[] = [];
  for (const [part, folder, id] of wear) {
    const file = join(ART, folder, `${id}.json`);
    if (!existsSync(file)) {
      console.log(`  skipping ${folder}/${id}, not extracted`);
      continue;
    }
    worn.push({
      part,
      manifest: JSON.parse(readFileSync(file, 'utf8')) as ItemManifest,
      sheetUrl: join(ART, folder, `${id}.png`),
      stance: part === 'face' ? 'default' : undefined,
    });
  }
  if (!worn.length) return null;

  const { placed, bounds, w, h } = buildAvatar(worn, meta.zmap, meta.smap, stance, 0);
  const out = blank(w * scale, h * scale);
  const sheets = new Map<string, Img>();
  for (const p of placed) {
    if (!sheets.has(p.sheet)) sheets.set(p.sheet, readImg(p.sheet));
    blit(out, sheets.get(p.sheet)!, p.sx, p.sy, p.w, p.h,
      (p.x - bounds.l) * scale, (p.y - bounds.t) * scale, scale);
  }
  return out;
};

/**
 * The row, bottom aligned so everyone stands on the same ground.
 *
 * Padded, or the tallest hat and every pair of shoes ends up flush against the
 * edge and the whole row reads as cropped
 */
const cast = (scale: number, gap: number, pad = 8): Img => {
  const people = CAST.map(c => person(c.wear, c.stance, scale)).filter(Boolean) as Img[];
  const w = people.reduce((a, p) => a + p.w, 0) + gap * (people.length - 1);
  const h = Math.max(...people.map(p => p.h));
  const out = blank(w + pad * 2, h + pad * 2);
  let x = pad;
  for (const p of people) {
    blit(out, p, 0, 0, p.w, p.h, x, pad + h - p.h, 1);
    x += p.w + gap;
  }
  return out;
};

// ---------------------------------------------------------------- run

const write = (img: Img, file: string) => {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, file), encodePNG({ w: img.w, h: img.h, data: img.px }));
  console.log(`${file.padEnd(16)} ${img.w}x${img.h}`);
};

/** a dozen candidates side by side, for choosing STYLE */
const contact = async () => {
  const ids = ['1', '3', '5', '10', '18', '20', '24', '40', '55', '80', '120', '200']
    .filter(id => balloons.styles[id]);
  const shots: Img[] = [];
  for (const id of ids) shots.push(await banner(id, `${id}  ${TITLE}`, 2));
  const pad = 10;
  const w = Math.max(...shots.map(s => s.w));
  const h = shots.reduce((a, s) => a + s.h + pad, 0);
  const sheet = blank(w, h);
  // white behind, so a dark style is not invisible against a dark viewer
  sheet.px.fill(255);
  let y = 0;
  for (const s of shots) {
    blit(sheet, s, 0, 0, s.w, s.h, 0, y, 1);
    y += s.h + pad;
  }
  write(sheet, '.contact.png');
};

if (process.argv.includes('--contact')) {
  await contact();
} else {
  write(await banner(STYLE, TITLE, SCALE), 'banner.png');
  write(cast(2, 24), 'cast.png');
}
