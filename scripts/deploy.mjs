// builds and ships the site to the vps
//
//   node scripts/deploy.mjs --dry     say what it would do
//   node scripts/deploy.mjs           site only, quick
//   node scripts/deploy.mjs --assets  site and any assets the box is missing
//   node scripts/deploy.mjs --clean   wipe the web root first, see below
//
// needs these in .env.local:
//   DEPLOY_HOST=root@1.2.3.4
//   DEPLOY_PATH=/var/www/henehoe
//
// tar, not one file at a time. there are 105k assets and scp opens a fresh
// connection per file, so sending them individually takes hours where one
// archive takes minutes.
//
// assets are compared against what the box already holds, so after the first
// deploy only newly extracted items go. an item's art never changes under the
// same id, which is what makes a name comparison enough

import { execFileSync, execSync } from 'node:child_process';
import { readdirSync, statSync, writeFileSync, unlinkSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = process.cwd();
const OUT = join(ROOT, '.avatar-out');
// its own dist dir, so a deploy never knocks down a running dev server
const DIST_NAME = '.next-deploy';
const DIST = join(ROOT, DIST_NAME);
const PUBLIC_LINK = join(ROOT, 'public', 'avatar');

const DRY = process.argv.includes('--dry');
const WITH_ASSETS = process.argv.includes('--assets');
const CLEAN = process.argv.includes('--clean');

// what --clean leaves alone. assets travel separately and are 2.6 GB, so they
// are never part of the tar that would put them back
const KEEP = ['avatar'];

const env = (() => {
  const out = { ...process.env };
  const file = join(ROOT, '.env.local');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
    }
  }
  return out;
})();

const HOST = env.DEPLOY_HOST;
const PATH_ON_BOX = env.DEPLOY_PATH || '/var/www/henehoe';
if (!HOST && !DRY) {
  console.error('missing DEPLOY_HOST in .env.local, eg root@1.2.3.4');
  process.exit(1);
}

const say = (...a) => console.log(...a);
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { stdio: 'inherit', ...opts });

// next is invoked through node directly rather than npx.
//
// npx on windows is npx.cmd, and node 22 refuses to spawn a .cmd without a
// shell on purpose, so it throws EINVAL. calling the js entry point with the
// node we are already running sidesteps shims and shells entirely
const NEXT_BIN = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');

// ---------------------------------------------------------------- build

// the junction has to go before building.
//
// `output: 'export'` copies all of public/, and public/avatar points at 53k
// extracted files, so leaving it in place makes a 2 GB site archive full of
// png we do not even serve. the assets travel separately and filtered
const unlinkJunction = () => {
  if (!existsSync(PUBLIC_LINK)) return false;
  say('  moving public/avatar aside for the build');
  if (!DRY) rmSync(PUBLIC_LINK, { recursive: false, force: true });
  return true;
};

const relinkJunction = had => {
  if (!had || DRY) return;
  say('  restoring public/avatar');
  execSync(
    `cmd /c mklink /J "${PUBLIC_LINK}" "${OUT}"`,
    { stdio: 'ignore' },
  );
};

const build = () => {
  say('building...');
  if (DRY) return;
  run(process.execPath, [NEXT_BIN, 'build'], {
    env: { ...process.env, NEXT_DIST_DIR: DIST_NAME },
  });
};

// ---------------------------------------------------------------- assets

const assetFiles = () => {
  const keep = new Set(['.webp', '.json']);
  const skip = new Set(['extract-log.txt', 'index-log.txt', 'found.txt']);
  const walk = dir => {
    const out = [];
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) out.push(...walk(p));
      else if (keep.has(extname(e.name)) && !skip.has(e.name)) out.push(p);
    }
    return out;
  };
  return walk(OUT);
};

const relOf = f => relative(OUT, f).replace(/\\/g, '/');

// what gets rewritten under the same name every time items are extracted.
//
// the box comparison below is by name, and that is only sound for art: an
// item's sheet never changes under the same id. these do, so comparing names
// would mean the box kept the first index it ever received and no item added
// after the first deploy ever showed up in the closet
const MUTABLE = /^(index\/|meta\.json$|delays\.json$|face-delays\.json$)/;

/** what the box already has, so a patch only sends the new items */
const remoteAssets = () => {
  if (DRY) return new Set();
  try {
    const listing = execFileSync(
      'ssh',
      [HOST, `cd ${PATH_ON_BOX}/avatar 2>/dev/null && find . -type f | sed 's|^\\./||' || true`],
      { encoding: 'utf8', maxBuffer: 1 << 28 },
    );
    return new Set(listing.split('\n').map(s => s.trim()).filter(Boolean));
  } catch {
    return new Set();
  }
};

const sendTar = (files, base, dest, label) => {
  if (!files.length) {
    say(`  ${label}: nothing to send`);
    return;
  }
  const bytes = files.reduce((n, f) => n + statSync(f).size, 0);
  say(`  ${label}: ${files.length.toLocaleString()} files, ${(bytes / 1024 / 1024).toFixed(0)} MB`);
  if (DRY) return;

  const listFile = join(tmpdir(), `henehoe-${label}-${Date.now()}.txt`);
  const archive = join(tmpdir(), `henehoe-${label}-${Date.now()}.tar.gz`);
  writeFileSync(
    listFile,
    files.map(f => relative(base, f).replace(/\\/g, '/')).join('\n'),
  );

  say('   packing...');
  run('tar', ['-czf', archive, '-C', base, '-T', listFile]);

  say('   sending...');
  run('scp', ['-q', archive, `${HOST}:/tmp/henehoe.tar.gz`]);

  say('   unpacking...');
  run('ssh', [
    HOST,
    `mkdir -p ${dest} && tar -xzf /tmp/henehoe.tar.gz -C ${dest} && rm /tmp/henehoe.tar.gz`,
  ]);

  unlinkSync(listFile);
  unlinkSync(archive);
};

// ---------------------------------------------------------------- clean

// unpacking a tar overwrites what it contains and leaves everything else
// alone, so a file deleted here keeps being served off the box forever. the
// hashed chunks under _next/static rename on every build, and anything dropped
// out of public/ just stays. --clean empties the web root so the box matches.
//
// everything under DEPLOY_PATH comes out of the export except avatar, so that
// is the one name held back. the site 404s for the second or two between the
// wipe and the unpack, which is why this is opt in rather than the default
const cleanRemote = () => {
  // a wrong DEPLOY_PATH here is rm -rf on something that is not the web root.
  // absolute, no shell metacharacters, and at least two segments deep, so a
  // stray / or /var can never be the target
  const sane =
    /^\/[\w.-]+(\/[\w.-]+)+\/?$/.test(PATH_ON_BOX) &&
    !PATH_ON_BOX.includes('..');
  if (!sane) {
    console.error(`refusing to clean, DEPLOY_PATH looks wrong: ${PATH_ON_BOX}`);
    process.exit(1);
  }

  // cd fails on a first ever deploy, and && makes that the whole command, so
  // there is nothing to remove and nothing to complain about
  const keepExpr = KEEP.map(n => `! -name '${n}'`).join(' ');
  const find = `cd ${PATH_ON_BOX} 2>/dev/null && find . -mindepth 1 -maxdepth 1 ${keepExpr}`;

  if (DRY) {
    if (!HOST) {
      say(`  clean: would empty ${PATH_ON_BOX}, keeping ${KEEP.join(', ')}`);
      return;
    }
    const listing = execFileSync('ssh', [HOST, `${find} || true`], {
      encoding: 'utf8',
      maxBuffer: 1 << 26,
    })
      .split('\n')
      .map(s => s.replace(/^\.\//, '').trim())
      .filter(Boolean);
    say(`  clean: would remove ${listing.length} entries from ${PATH_ON_BOX}`);
    for (const e of listing) say(`     ${e}`);
    say(`   keeping ${KEEP.join(', ')}`);
    return;
  }

  say(`  cleaning ${PATH_ON_BOX}, keeping ${KEEP.join(', ')}`);
  run('ssh', [HOST, `${find} -exec rm -rf {} + || true`]);
};

// ---------------------------------------------------------------- go

const main = () => {
  const had = unlinkJunction();
  try {
    build();
  } finally {
    relinkJunction(had);
  }

  // the export lands in distDir, html and js and everything under public/
  //
  // a dry run does not build, so on a clean checkout there is nothing to list
  // yet. that is expected rather than an error
  const site = existsSync(DIST)
    ? (function walk(dir) {
        const out = [];
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const p = join(dir, e.name);
          // build metadata the browser never asks for
          if (e.isDirectory() && ['cache', 'server', 'types'].includes(e.name)) {
            continue;
          }
          if (e.isDirectory()) out.push(...walk(p));
          else if (!e.name.endsWith('.map')) out.push(p);
        }
        return out;
      })(DIST)
    : [];

  // nothing to put back means nothing should come down. build() throws on a
  // bad build so a real run cannot get here empty, but the wipe is worth the
  // cheap insurance
  if (!DRY && !site.length) {
    console.error(`no files in ${DIST_NAME}, refusing to deploy`);
    process.exit(1);
  }

  // after the build, so a build that throws never leaves the box emptied with
  // nothing to unpack into it
  if (CLEAN) cleanRemote();

  if (!site.length && DRY) {
    say('  site: nothing built yet, a real run builds it first');
  } else {
    sendTar(site, DIST, PATH_ON_BOX, 'site');
  }

  if (WITH_ASSETS) {
    const have = remoteAssets();
    say(`  box already holds ${have.size.toLocaleString()} assets`);
    const all = assetFiles();

    // two tars, art first, and the order is the point. the index is the list
    // of what exists, so shipping it ahead of the sheets it names opens a
    // window where the closet offers items that 404
    const art = all.filter(f => !MUTABLE.test(relOf(f)) && !have.has(relOf(f)));
    const index = all.filter(f => MUTABLE.test(relOf(f)));

    sendTar(art, OUT, `${PATH_ON_BOX}/avatar`, 'art');
    sendTar(index, OUT, `${PATH_ON_BOX}/avatar`, 'index');
  } else {
    say('  assets skipped, pass --assets to send them');
  }

  say(DRY ? '\ndry run, nothing sent' : '\ndone');
};

main();
