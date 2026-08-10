// builds data/items.json, the digest every /items page is generated from
//
//   node scripts/build-item-pages.mjs
//
// run it after extract-index.lua and before deploying. the index files are the
// closet's source of truth, this turns them into the catalogue's.
//
// it reads .avatar-out rather than public/avatar on purpose. scripts/deploy.mjs
// removes the public/avatar junction before building, so anything the build
// itself needs has to live somewhere the build can still see

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { decodePNG, encodePNG } from './lib/png.mjs';
import { CATEGORIES, categoryOf, groupBase, itemSlug, slugify } from '../lib/categories.mjs';

const ROOT = process.cwd();
// .avatar-out is the extraction. public/avatar is a junction onto it, kept as a
// fallback so this still runs on a machine where the junction is the real dir
const OUT = ['.avatar-out', 'public/avatar']
  .map(d => join(ROOT, d))
  .find(d => existsSync(join(d, 'index')));
if (!OUT) {
  console.error('no extraction found, expected .avatar-out/index or public/avatar/index');
  process.exit(1);
}
const INDEX = join(OUT, 'index');
const DEST = join(ROOT, 'data');
// one png per item, cut out of the packed sheets.
//
// the closet can afford a sheet because it loads one and shows a thousand
// items off it. an item page shows one item, and Cap-icons-0 is 1.8 MB, so a
// page that pulled the sheet would spend two megabytes on a 34 by 26 hat.
//
// convert them after this runs:
//   node scripts/webp-avatar.mjs --only items --prune
const ICONS = join(OUT, 'items');
const NO_ICONS = process.argv.includes('--no-icons');

const say = (...a) => console.log(...a);
const started = Date.now();

// ---------------------------------------------------------------- colours

// the palette order the client uses for the hair colour digit, confirmed
// against the extracted icons: sampling 7 families gave black, red, orange,
// blonde, green, blue, purple, brown in exactly this order every time.
//
// 17 hairs carry an 8 or a 9 here and are left unnamed rather than guessed at.
// faces get no names at all: the digit is eye colour, the icon is mostly skin,
// and nothing in the extraction says which is which
const HAIR_COLOURS = [
  'black',
  'red',
  'orange',
  'blonde',
  'green',
  'blue',
  'purple',
  'brown',
];

const colourName = (category, id) =>
  category.key === 'hair' ? (HAIR_COLOURS[id % 10] ?? null) : null;

// ---------------------------------------------------------------- sets

// a first word too generic to be a set name. "Black Bandana" and "Black Suit"
// are not a set, they are two things that happen to be black
const GENERIC = new Set([
  'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
  'pink', 'brown', 'grey', 'gray', 'gold', 'golden', 'silver', 'bronze',
  'dark', 'light', 'deep', 'pale', 'bright', 'royal', 'grand', 'great',
  'small', 'big', 'long', 'short', 'new', 'old', 'the', 'a', 'an', 'of',
  'mens', 'womens', 'basic', 'simple', 'plain', 'special', 'rare', 'unique',
]);

/**
 * The key items get grouped under for "from the same set".
 *
 * The first word of the name, or the first two when the first is a colour or
 * some other word half the game shares. Not a real set list, wz does not ship
 * one for cosmetics, but it lands "Bellflower Beanie" next to "Bellflower
 * Hairpin" and that is the link worth having
 */
const setKeyOf = name => {
  const words = slugify(name).split('-').filter(Boolean);
  if (!words.length) return null;
  if (GENERIC.has(words[0])) {
    return words.length > 1 ? `${words[0]}-${words[1]}` : null;
  }
  // a one word name is its own set only if the word is worth something
  return words[0].length > 2 ? words[0] : null;
};

// ---------------------------------------------------------------- read

/** which ids have art in Effect.wz, so a page can say the item glows */
const effectIds = (() => {
  const dir = join(OUT, 'Effect');
  if (!existsSync(dir)) return new Set();
  return new Set(
    readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => Number(f.slice(0, -5))),
  );
})();
say(`effects: ${effectIds.size.toLocaleString()} items`);

/** one folder's index, or null if it was never extracted */
const readIndex = folder => {
  const p = join(INDEX, `${folder}.json`);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
};

/**
 * The bits of an item's own manifest a page shows.
 *
 * The manifests are big, a longcoat runs to 165 canvases, and there are 26k of
 * them to open. Only these five values survive into the digest
 */
const manifestFacts = (folder, id) => {
  const p = join(OUT, folder, `${id}.json`);
  if (!existsSync(p)) return null;
  let m;
  try {
    m = JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
  const canvases = Object.values(m.canvases ?? {});
  const z = [...new Set(canvases.map(c => c.z).filter(Boolean))];
  return {
    is: m.islot ?? null,
    vs: m.vslot ?? null,
    // how many sprites the item is cut into, which is why some hats have a
    // piece behind the head and some do not
    pieces: canvases.length,
    z,
  };
};

// ---------------------------------------------------------------- build

// a page and everything needed to cut its icons, before the duplicate ids are
// resolved. an item in two folders is in here twice
const candidates = [];
let noName = 0;
let noManifest = 0;

for (const cat of CATEGORIES) {
  const index = readIndex(cat.folder);
  if (!index) {
    say(`  ${cat.key}: no index, skipped`);
    continue;
  }

  // rows this category owns, which for the three sharing Accessory is the
  // id block and for everyone else is the whole file
  const rows = index.items.filter(e => categoryOf(cat.folder, e.id) === cat);

  // group the colour variants. the page is the lowest id present, not the
  // arithmetic base, since plenty of families are missing their first colour
  const groups = new Map();
  for (const e of rows) {
    const base = groupBase(cat, e.id);
    const g = groups.get(base);
    if (g) g.push(e);
    else groups.set(base, [e]);
  }

  for (const members of groups.values()) {
    members.sort((a, b) => a.id - b.id);
    const head = members[0];
    const name = head.name?.trim() || '';

    const facts = manifestFacts(cat.folder, head.id);

    candidates.push({
    cat,
    // the rows the icons get cut from, kept until the duplicates are settled
    members,
    facts,
    item: {
      id: head.id,
      n: name,
      slug: itemSlug(name, head.id),
      c: cat.key,
      cash: head.cash ? 1 : 0,
      // the icon's size, so <img> can carry width and height and nothing on
      // the page moves once the art arrives. the url is the id
      ic: [head.w, head.h],
      // every id in the group, so the page can offer the colours. omitted
      // entirely for a category with no colour digit
      ...(cat.colour
        ? {
            v: members.map(e => ({
              id: e.id,
              ic: [e.w, e.h],
              ...(colourName(cat, e.id) ? { name: colourName(cat, e.id) } : {}),
            })),
          }
        : {}),
      ...(facts ?? {}),
      ...(effectIds.has(head.id) ? { fx: 1 } : {}),
      ...(setKeyOf(name) ? { set: setKeyOf(name) } : {}),
      },
    });
  }
}

// ---------------------------------------------------------------- duplicates

/**
 * One page per id.
 *
 * A handful of items were extracted into two folders, so they arrive here
 * twice under two categories. The manifest's own islot settles it: "Frog
 * Cronies" is in both Coat and Cape and carries Sr, so it is a cape.
 *
 * When neither category matches the islot, or both do, the first in
 * CATEGORIES wins, which at least makes the choice deterministic
 */
const chosen = new Map();
let clashes = 0;

const fits = c => !!c.item.is?.includes(c.cat.code);

for (const c of candidates) {
  const held = chosen.get(c.item.id);
  if (!held) {
    chosen.set(c.item.id, c);
    continue;
  }
  clashes += 1;
  if (!fits(held) && fits(c)) {
    say(`  ${c.item.id} "${c.item.n}" is in both ${held.cat.key} and ${c.cat.key}, islot ${c.item.is} says ${c.cat.key}`);
    chosen.set(c.item.id, c);
  } else {
    say(`  ${c.item.id} "${c.item.n}" is in both ${held.cat.key} and ${c.cat.key}, keeping ${held.cat.key}`);
  }
}

const kept = [...chosen.values()];
const items = kept.map(c => c.item);

for (const c of kept) {
  if (!c.item.n) noName += 1;
  if (!c.facts) noManifest += 1;
}

// ---------------------------------------------------------------- counts

const counts = CATEGORIES.map(cat => {
  const mine = kept.filter(c => c.cat === cat);
  const ids = mine.reduce((n, c) => n + c.members.length, 0);
  return { key: cat.key, ids, pages: mine.length };
});
for (const n of counts) {
  say(`  ${n.key.padEnd(16)} ${String(n.ids).padStart(6)} ids -> ${String(n.pages).padStart(6)} pages`);
}
if (clashes) say(`  ${clashes} item(s) were in two folders, resolved above`);

// ---------------------------------------------------------------- sets

// how big each set is, so the page can decide whether the link is worth
// drawing. a set of one is just the item looking at itself
const setSizes = new Map();
for (const it of items) {
  if (it.set) setSizes.set(it.set, (setSizes.get(it.set) ?? 0) + 1);
}
for (const it of items) {
  if (it.set && setSizes.get(it.set) < 2) delete it.set;
}

// ---------------------------------------------------------------- icons

// every icon a page will draw, keyed by the sheet it has to be cut from, so
// each sheet is decoded once instead of once per item on it. built from the
// pages that survived the duplicate pass, or an item in two folders would be
// cut twice and the second crop would come off the wrong sheet
const iconJobs = new Map();

for (const c of kept) {
  // a colour strip draws every variant, everything else draws only its own
  const rows = c.cat.colour ? c.members : [c.members[0]];
  for (const e of rows) {
    const key = `${c.cat.folder}/${e.s}`;
    const job = { id: e.id, x: e.x, y: e.y, w: e.w, h: e.h };
    const list = iconJobs.get(key);
    if (list) list.push(job);
    else iconJobs.set(key, [job]);
  }
}

/**
 * Cut every icon out of its sheet, one sheet at a time.
 *
 * Incremental the same way the rest of the pipeline is: an id already on disk
 * as either a png or a webp is left alone, so a weekly patch only cuts the
 * items it added. That also means a sheet nothing is missing from is never
 * decoded, and after the first run that is nearly all of them
 */
const cutIcons = () => {
  mkdirSync(ICONS, { recursive: true });
  const have = new Set(
    readdirSync(ICONS).map(f => f.replace(/\.(png|webp)$/, '')),
  );

  let written = 0;
  let skipped = 0;
  let bytes = 0;

  for (const [key, jobs] of iconJobs) {
    const todo = jobs.filter(j => !have.has(String(j.id)));
    skipped += jobs.length - todo.length;
    if (!todo.length) continue;

    const [folder, s] = key.split('/');
    const index = readIndex(folder);
    const name = index?.sheets?.[Number(s)] ?? index?.sheets?.[0];
    const src = name && join(INDEX, name);
    if (!src || !existsSync(src)) {
      say(`  no sheet for ${key}, ${todo.length} icons skipped`);
      continue;
    }

    const sheet = decodePNG(readFileSync(src));
    for (const j of todo) {
      if (!j.w || !j.h) continue;
      const data = Buffer.alloc(j.w * j.h * 4);
      for (let y = 0; y < j.h; y++) {
        const from = ((j.y + y) * sheet.w + j.x) * 4;
        sheet.data.copy(data, y * j.w * 4, from, from + j.w * 4);
      }
      const png = encodePNG({ w: j.w, h: j.h, data });
      writeFileSync(join(ICONS, `${j.id}.png`), png);
      written += 1;
      bytes += png.length;
    }
  }

  say('');
  say(`icons: ${written.toLocaleString()} cut, ${skipped.toLocaleString()} already on disk`);
  if (written) {
    say(`  ${(bytes / 1024 / 1024).toFixed(1)} MB of png, now run:`);
    say('  node scripts/webp-avatar.mjs --only items --prune');
  }
};

if (NO_ICONS) {
  say('');
  say(`icons: skipped, ${[...iconJobs.values()].reduce((n, l) => n + l.length, 0).toLocaleString()} wanted`);
} else {
  cutIcons();
}

// ---------------------------------------------------------------- write

// sorted by category then id, so the file is stable between runs and a diff
// only shows what the patch actually added
const order = new Map(CATEGORIES.map((c, i) => [c.key, i]));
items.sort((a, b) => order.get(a.c) - order.get(b.c) || a.id - b.id);

const digest = {
  // not a timestamp. lastModified on 26k sitemap entries should move when the
  // items move, and this is the only date the extraction gives us
  built: new Date().toISOString().slice(0, 10),
  cats: CATEGORIES.map(c => ({
    key: c.key,
    ...counts.find(n => n.key === c.key),
  })),
  items,
};

mkdirSync(DEST, { recursive: true });
const file = join(DEST, 'items.json');
writeFileSync(file, JSON.stringify(digest));

const kb = (readFileSync(file).length / 1024 / 1024).toFixed(1);
say('');
say(`wrote data/items.json  ${items.length.toLocaleString()} pages, ${kb} MB`);
say(`  sets: ${[...setSizes.values()].filter(n => n > 1).length.toLocaleString()}`);
if (noName) say(`  ${noName} items have no english name, slugged by id alone`);
if (noManifest) say(`  ${noManifest} items had no manifest, no slot facts on those pages`);
say(`  ${((Date.now() - started) / 1000).toFixed(1)}s`);
