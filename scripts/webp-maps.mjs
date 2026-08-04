// converts everything under public/maps to webp, via ffmpeg
//
// run it after adding a map: npm run webp
//
// plates go lossy, they are big soft backdrops and q90 saves about two thirds.
// sprites go lossless, they are small and have hard alpha edges
//
// nothing is deleted. the webp lands next to the source and the renderer picks
// it up through the webp flag in index.json

import { execFile } from 'node:child_process';
import { readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const MAPS_DIR = join(process.cwd(), 'public', 'maps');
const PRUNE = process.argv.includes('--prune');

const size = async p => (await stat(p).then(s => s.size, () => 0));
const exists = async p => await stat(p).then(() => true, () => false);

const convert = async (src, out, lossless) => {
  await run('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-i', src,
    '-c:v', 'libwebp',
    '-lossless', lossless ? '1' : '0',
    '-q:v', lossless ? '100' : '90',
    // animated sources need this or they play once and stop
    '-loop', '0',
    out,
  ]);
};

// ffmpeg writes every animation frame as blend=alpha dispose=none, so each one
// composites onto whatever the last left behind. apng carried real per frame
// disposal, the webp muxer throws it away, and translucent sprites pile up
//
// every frame our encoder produced covers the whole canvas, so the fix is the
// "do not blend" bit in the ANMF flags byte, which makes a frame overwrite
// instead of stack. bit 1 is blending, bit 0 is disposal
const NO_BLEND = 0b10;

const unstack = async file => {
  const b = await readFile(file);
  if (b.slice(0, 4).toString('ascii') !== 'RIFF') return 0;

  let canvas = null;
  let p = 12;
  let fixed = 0;
  let partial = 0;
  while (p < b.length - 8) {
    const type = b.slice(p, p + 4).toString('ascii');
    const len = b.readUInt32LE(p + 4);
    const d = b.slice(p + 8);

    if (type === 'VP8X') canvas = { w: d.readUIntLE(4, 3) + 1, h: d.readUIntLE(7, 3) + 1 };
    else if (type === 'ANMF' && canvas) {
      // a frame that only covers part of the canvas would leave stale pixels
      // outside its rect if we made it overwrite, so leave those alone
      const w = d.readUIntLE(6, 3) + 1, h = d.readUIntLE(9, 3) + 1;
      const full = d.readUIntLE(0, 3) === 0 && d.readUIntLE(3, 3) === 0
        && w === canvas.w && h === canvas.h;
      if (!full) partial++;
      else if (!(d[15] & NO_BLEND)) {
        b[p + 8 + 15] = d[15] | NO_BLEND;
        fixed++;
      }
    }
    p += 8 + len + (len & 1);
  }

  if (partial) console.warn(`${basename(file)}: ${partial} partial frame(s), left as is`);
  if (fixed) await writeFile(file, b);
  return fixed;
};

// ffmpeg is one process per file and there are a few hundred, so keep the cores
// busy rather than going one at a time
const pool = async (items, worker) => {
  const queue = [...items];
  const width = Math.max(1, cpus().length - 1);
  await Promise.all(
    Array.from({ length: width }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) await worker(item);
    }),
  );
};

const jobs = [];
for (const dir of await readdir(MAPS_DIR, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const mapDir = join(MAPS_DIR, dir.name);

  for (const plate of ['back.png', 'front.png']) {
    const src = join(mapDir, plate);
    if (await exists(src))
      jobs.push({ src, out: src.replace(/\.png$/, '.webp'), lossless: false });
  }

  const layersDir = join(mapDir, 'layers');
  if (!(await exists(layersDir))) continue;
  for (const f of await readdir(layersDir)) {
    if (!/\.(apng|png)$/.test(f)) continue;
    const src = join(layersDir, f);
    jobs.push({ src, out: src.replace(/\.(apng|png)$/, '.webp'), lossless: true });
  }
}

// skip anything already converted, so re-running after adding one map is quick
const todo = [];
for (const job of jobs) {
  const [a, b] = [await stat(job.src), await stat(job.out).catch(() => null)];
  if (!b || b.mtimeMs < a.mtimeMs) todo.push(job);
}

console.log(`${jobs.length} file(s), ${todo.length} to convert`);
let done = 0;
const failed = [];
await pool(todo, async job => {
  try {
    await convert(job.src, job.out, job.lossless);
  } catch (err) {
    failed.push(`${basename(job.src)}: ${err.message.split('\n').pop().trim()}`);
  }
  done++;
  if (done % 50 === 0) console.log(`  ${done}/${todo.length}`);
});

// over every output, not just the freshly converted ones, since anything
// written before this pass existed is still stacking
//
// counts get collected rather than summed in place. `total += await ...` reads
// before the await and writes after, so parallel workers lose each others
// updates and the number comes out far too low
const counts = [];
await pool(jobs, async job => {
  if (await exists(job.out)) counts.push(await unstack(job.out));
});
const unstacked = counts.reduce((a, b) => a + b, 0);
if (unstacked) console.log(`unstacked ${unstacked} animation frame(s)`);

let before = 0, after = 0;
for (const job of jobs) {
  before += await size(job.src);
  after += await size(job.out);
}
const mb = n => (n / 1024 / 1024).toFixed(1) + 'MB';
console.log(`${mb(before)} -> ${mb(after)}  (${Math.round((1 - after / before) * 100)}% smaller)`);

for (const f of failed) console.warn(`failed ${f}`);

// only ever offered for the layer sprites. plates are hand captured screenshots
// and re-taking them is real work, the sprites are one F5 away
if (PRUNE) {
  let freed = 0;
  for (const job of jobs) {
    if (!job.src.includes('layers')) continue;
    if (!(await exists(job.out))) continue;
    freed += await size(job.src);
    await unlink(job.src);
  }
  console.log(`pruned layer sources, freed ${mb(freed)}`);
}
