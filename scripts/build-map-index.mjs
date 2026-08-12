// builds public/maps/index.json from whatever is in public/maps
//
// run it after adding a map: npm run maps
//
// each map is a folder named by its id, holding a back plate and optionally a
// front one. names come from public/ui/reference/maps.json, dimensions come out
// of the image header so there is nothing to keep in sync by hand.
//
// the plate can be either extension. the webp is what ships, the png is the
// hand captured original and lives outside the repo in ../resources/maps, so a
// checkout only carries what the site actually serves

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

// webp keeps its size in whichever of three chunks the encoder chose, so all
// three have to be read. VP8X is the extended header a plate with alpha gets,
// VP8 is plain lossy, VP8L is lossless. dimensions are stored minus one in the
// two that pack them into bit fields
//
// the payload of every chunk starts 8 bytes past its id
const webpSize = buf => {
  let o = 12;
  while (o + 8 <= buf.length) {
    const id = buf.toString('ascii', o, o + 4);
    const len = buf.readUInt32LE(o + 4);
    const p = o + 8;
    if (id === 'VP8X')
      return {
        w: (buf.readUIntLE(p + 4, 3) & 0xffffff) + 1,
        h: (buf.readUIntLE(p + 7, 3) & 0xffffff) + 1,
      };
    // 3 byte frame tag then the 3 byte start code, then 14 bits each
    if (id === 'VP8 ')
      return {
        w: buf.readUInt16LE(p + 6) & 0x3fff,
        h: buf.readUInt16LE(p + 8) & 0x3fff,
      };
    // signature byte, then width-1 in 14 bits and height-1 in the next 14
    if (id === 'VP8L') {
      const bits = buf.readUInt32LE(p + 1);
      return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
    }
    o = p + len + (len & 1);
  }
  throw new Error('no size chunk in webp');
};

// png first, it is the original. the webp stands in once the png has been
// moved out to ../resources
const plateSize = async (dir, name) => {
  for (const [ext, read] of [
    ['png', pngSize],
    ['webp', webpSize],
  ]) {
    const p = join(MAPS_DIR, dir, `${name}.${ext}`);
    if (await exists(p)) return read(await readFile(p));
  }
  return null;
};

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
      // plate has no sky in it, so every back is drawn from the manifest
      backsHidden: c.backsHidden === true,
      // sprites to drop, and exceptions to that. a trailing * matches a prefix
      // redundant things like tutorial arrows
      hide: Array.isArray(c.hide) ? c.hide : null,
      keep: Array.isArray(c.keep) ? c.keep : null,
      // where the capture starts, for a plate that is not the vr rect. only
      // maps whose art runs outside vr need one, see MapInfo.plate
      plate:
        c.plate && Number.isFinite(c.plate.l) && Number.isFinite(c.plate.t)
          ? { l: c.plate.l, t: c.plate.t }
          : null,
      // a colour behind everything, for a plate the sky doesn't reach the end
      // of, see MapInfo.bg
      bg: typeof c.bg === 'string' ? c.bg : null,
    };
  } catch {
    return {
      cam: null,
      objsHidden: false,
      backsHidden: false,
      hide: null,
      keep: null,
      plate: null,
      bg: null,
    };
  }
};

// a manifest is only worth fetching if something in it actually moves. old maps
// dump fine but come out all stills, which the plate already covers
const readLayers = async dir => {
  try {
    const l = JSON.parse(
      await readFile(join(MAPS_DIR, dir, 'layers', 'layers.json'), 'utf8'),
    );
    // a back moves if it has frames or if it scrolls. the scrolling ones hold
    // one frame and drift on a timer, which is how skies are built, so counting
    // frames alone left a map with seven cloud layers looking like it had none
    const moves = s =>
      s.frames > 1 ||
      s.type === 4 ||
      s.type === 5 ||
      s.type === 6 ||
      s.type === 7;
    const backs = l.back.filter(moves);
    return {
      // so the plate can be checked against the rect it is supposed to be
      vr: { w: l.vr.r - l.vr.l, h: l.vr.b - l.vr.t },
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
    return { vr: null, animated: 0, parallax: false };
  }
};

const names = JSON.parse(await readFile(NAMES, 'utf8'));
const byId = new Map(names.map(m => [String(m.id), m]));

const entries = await readdir(MAPS_DIR, { withFileTypes: true });
const maps = [];

for (const dir of entries) {
  if (!dir.isDirectory()) continue;
  const size = await plateSize(dir.name, 'back');
  if (!size) {
    console.warn(`skipped ${dir.name}: no back plate`);
    continue;
  }
  const meta = byId.get(dir.name);
  const cap = await readCapture(dir.name);
  const lay = await readLayers(dir.name);
  maps.push({
    id: dir.name,
    name: meta?.name?.trim() || dir.name,
    street: meta?.streetName?.trim() ?? '',
    ...size,
    front: !!(await plateSize(dir.name, 'front')),
    // written by scripts/wz/dump-map-layers.lua, holds the animated sprites
    // the manifest is also needed when objects come from it rather than the plate
    layers: lay.animated > 0 || cap.objsHidden || cap.backsHidden,
    // npm run webp converts a whole map at once, so one plate is enough to tell
    webp: await exists(join(MAPS_DIR, dir.name, 'back.webp')),
    ...(cap.cam ? { cam: cap.cam } : {}),
    ...(cap.objsHidden ? { objsHidden: true } : {}),
    ...(cap.backsHidden ? { backsHidden: true } : {}),
    ...(cap.hide ? { hide: cap.hide } : {}),
    ...(cap.keep ? { keep: cap.keep } : {}),
    ...(cap.plate ? { plate: cap.plate } : {}),
    ...(cap.bg ? { bg: cap.bg } : {}),
  });
  if (!meta) console.warn(`${dir.name}: no name in maps.json, using the id`);
  if (lay.parallax && !cap.cam)
    console.warn(`${dir.name}: animated parallax backs, wants a camera.json`);
  // a plate that is not the vr rect puts every sprite at the wrong offset
  // unless capture.json says where the capture starts
  if (!cap.plate && lay.vr && (lay.vr.w !== size.w || lay.vr.h !== size.h))
    console.warn(
      `${dir.name}: plate is ${size.w}x${size.h} but vr is ${lay.vr.w}x${lay.vr.h}, wants a plate origin in capture.json`,
    );
}

maps.sort((a, b) => a.name.localeCompare(b.name));
await writeFile(OUT, JSON.stringify(maps, null, 2) + '\n');
console.log(`wrote ${maps.length} map(s) to public/maps/index.json`);
