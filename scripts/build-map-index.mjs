// builds public/maps/index.json from whatever is in public/maps
//
// run it after adding a map: npm run maps
//
// each map is a folder named by its id, holding back.png and optionally
// front.png. names come from public/ui/reference/maps.json, dimensions come
// out of the png header so there is nothing to keep in sync by hand.

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const MAPS_DIR = join(process.cwd(), 'public', 'maps');
const NAMES = join(process.cwd(), 'public', 'ui', 'reference', 'maps.json');
const OUT = join(MAPS_DIR, 'index.json');

// png stores width and height as big-endian uint32 at bytes 16 and 20, right
// after the signature and the IHDR chunk header
//
// saves pulling in an image library for eight bytes
const pngSize = buf => ({
  w: buf.readUInt32BE(16),
  h: buf.readUInt32BE(20),
});

const exists = async p =>
  await stat(p).then(
    () => true,
    () => false,
  );

const names = JSON.parse(await readFile(NAMES, 'utf8'));
const byId = new Map(names.map(m => [String(m.id), m]));

const entries = await readdir(MAPS_DIR, { withFileTypes: true });
const maps = [];

for (const dir of entries) {
  if (!dir.isDirectory()) continue;
  const back = join(MAPS_DIR, dir.name, 'back.png');
  if (!(await exists(back))) {
    console.warn(`skipped ${dir.name}: no back.png`);
    continue;
  }
  const meta = byId.get(dir.name);
  maps.push({
    id: dir.name,
    name: meta?.name?.trim() || dir.name,
    street: meta?.streetName?.trim() ?? '',
    ...pngSize(await readFile(back)),
    front: await exists(join(MAPS_DIR, dir.name, 'front.png')),
    // written by scripts/wz/dump-map-layers.lua, holds the animated sprites
    layers: await exists(join(MAPS_DIR, dir.name, 'layers', 'layers.json')),
  });
  if (!meta) console.warn(`${dir.name}: no name in maps.json, using the id`);
}

maps.sort((a, b) => a.name.localeCompare(b.name));
await writeFile(OUT, JSON.stringify(maps, null, 2) + '\n');
console.log(`wrote ${maps.length} map(s) to public/maps/index.json`);
