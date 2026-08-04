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

// optional, hand written, survives re-running the lua dump
//
// how the plate was captured, which the renderer can't work out by looking:
// where MapRender's camera was pointing, since that is what parallax backs were
// drawn against, and whether objects were hidden with ctrl+3
const readCapture = async dir => {
  try {
    const c = JSON.parse(
      await readFile(join(MAPS_DIR, dir, 'capture.json'), 'utf8'),
    );
    return {
      cam: c.cam ? { x: c.cam.x ?? 0, y: c.cam.y ?? 0 } : null,
      objsHidden: c.objsHidden === true,
    };
  } catch {
    return { cam: null, objsHidden: false };
  }
};

// a manifest is only worth fetching if something in it actually moves. old maps
// dump fine but come out all stills, which the plate already covers
const readLayers = async dir => {
  try {
    const l = JSON.parse(
      await readFile(join(MAPS_DIR, dir, 'layers', 'layers.json'), 'utf8'),
    );
    const backs = l.back.filter(s => s.frames > 1);
    return {
      animated: backs.length + l.obj.filter(s => s.frames > 1).length,
      // a back needs calibrating if either axis is driven by the camera. an
      // axis is off the hook when it scrolls on a timer (4 and 6 horizontally,
      // 5 and 7 vertically) or when the rate is -100, which zeroes the shift
      //
      // the axes are independent, a type 4 back still takes the camera on Y
      parallax: backs.some(
        s =>
          (s.type !== 4 && s.type !== 6 && 100 + (s.rx ?? -100) !== 0) ||
          (s.type !== 5 && s.type !== 7 && 100 + (s.ry ?? -100) !== 0),
      ),
    };
  } catch {
    return { animated: 0, parallax: false };
  }
};

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
  const cap = await readCapture(dir.name);
  const lay = await readLayers(dir.name);
  maps.push({
    id: dir.name,
    name: meta?.name?.trim() || dir.name,
    street: meta?.streetName?.trim() ?? '',
    ...pngSize(await readFile(back)),
    front: await exists(join(MAPS_DIR, dir.name, 'front.png')),
    // written by scripts/wz/dump-map-layers.lua, holds the animated sprites
    // the manifest is also needed when objects come from it rather than the plate
    layers: lay.animated > 0 || cap.objsHidden,
    // npm run webp converts a whole map at once, so one plate is enough to tell
    webp: await exists(join(MAPS_DIR, dir.name, 'back.webp')),
    ...(cap.cam ? { cam: cap.cam } : {}),
    ...(cap.objsHidden ? { objsHidden: true } : {}),
  });
  if (!meta) console.warn(`${dir.name}: no name in maps.json, using the id`);
  if (lay.parallax && !cap.cam)
    console.warn(`${dir.name}: animated parallax backs, wants a camera.json`);
}

maps.sort((a, b) => a.name.localeCompare(b.name));
await writeFile(OUT, JSON.stringify(maps, null, 2) + '\n');
console.log(`wrote ${maps.length} map(s) to public/maps/index.json`);
