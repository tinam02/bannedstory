// builds and ships the site to the vps
//
//   node scripts/deploy.mjs --dry     say what it would do
//   node scripts/deploy.mjs           site only, quick
//   node scripts/deploy.mjs --assets  site and any assets the box is missing
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

  if (!site.length && DRY) {
    say('  site: nothing built yet, a real run builds it first');
  } else {
    sendTar(site, DIST, PATH_ON_BOX, 'site');
  }

  if (WITH_ASSETS) {
    const have = remoteAssets();
    say(`  box already holds ${have.size.toLocaleString()} assets`);
    const missing = assetFiles().filter(
      f => !have.has(relative(OUT, f).replace(/\\/g, '/')),
    );
    sendTar(missing, OUT, `${PATH_ON_BOX}/avatar`, 'assets');
  } else {
    say('  assets skipped, pass --assets to send them');
  }

  say(DRY ? '\ndry run, nothing sent' : '\ndone');
};

main();
