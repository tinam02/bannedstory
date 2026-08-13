// lists the weapons that carry more than one weapon type, for extract-avatar.lua
//
//   node scripts/variant-ids.mjs
//
// a cash weapon holds a whole stance set per weapon type it imitates, and the
// normal extraction takes the lowest code. the rest are the carries, type 49
// being the gun hold, the weapon in the other arm.
//
// this exists because VARIANTS on its own has to open every img in the folder
// to find out which have extras, and opening an img is the entire cost: 7,888
// opens for the 1,191 that have any. the manifests already record `types`, so
// the list is free to compute here and the lua reads it as a targeted redo

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(process.cwd(), 'public', 'avatar', 'Weapon');
const OUT = join(process.cwd(), '.avatar-out');
const FILE = join(OUT, 'variant-ids.txt');

if (!existsSync(SRC)) {
  console.error(`no ${SRC}. this reads the manifests already extracted`);
  process.exit(1);
}

const ids = [];
const byCode = new Map();
for (const f of readdirSync(SRC)) {
  // a carry is <id>-<code>.json and is not an item, so it is not a candidate
  if (!f.endsWith('.json') || /-\d+\.json$/.test(f)) continue;
  let m;
  try {
    m = JSON.parse(readFileSync(join(SRC, f), 'utf8'));
  } catch {
    continue;
  }
  if (!Array.isArray(m.types) || m.types.length < 2) continue;
  ids.push(m.id);
  for (const c of m.types) {
    if (c !== m.type) byCode.set(c, (byCode.get(c) ?? 0) + 1);
  }
}

ids.sort((a, b) => a - b);
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
writeFileSync(FILE, ids.join('\n') + '\n');

console.log(`${ids.length} weapons carry more than one type -> ${FILE}`);
const rows = [...byCode.entries()].sort((a, b) => b[1] - a[1]);
console.log('carries to write, by weapon type:');
for (const [code, n] of rows) {
  console.log(`  ${String(code).padStart(3)}  ${String(n).padStart(5)}${code === 49 ? '  the gun carry' : ''}`);
}
