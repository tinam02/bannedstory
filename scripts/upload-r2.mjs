// syncs the extracted assets to a Cloudflare R2 bucket
//
//   node scripts/upload-r2.mjs --dry      list what would go, upload nothing
//   node scripts/upload-r2.mjs            upload what is new or changed
//
// Only .webp and .json go up. The .png stay local: build-sprite-icons.mjs reads
// them to composite the hair and face icons and our png reader cannot read
// webp, so deleting them would break regenerating the closet.
//
// Changed files only, by size. A patch means re-extracting and then running
// this, and re-uploading 53k unchanged files every time would be daft.
//
// Needs these in .env.local, from the R2 dashboard under Manage API Tokens:
//   R2_ACCOUNT_ID
//   R2_ACCESS_KEY_ID
//   R2_SECRET_ACCESS_KEY
//   R2_BUCKET

import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { readdirSync, statSync, createReadStream, readFileSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { cpus } from 'node:os';

const OUT = join(process.cwd(), '.avatar-out');
const DRY = process.argv.includes('--dry');
const WORKERS = Math.max(4, cpus().length * 2);

// gets served
const UPLOAD = new Set(['.webp', '.json']);

// the log the extraction writes, no business in a bucket
const SKIP_NAMES = new Set(['extract-log.txt', 'index-log.txt', 'found.txt']);

const TYPES = {
  '.webp': 'image/webp',
  '.json': 'application/json',
};

// immutable. an item's art never changes under the same id
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

const env = (() => {
  // .env.local is not committed, so read it here rather than depending on a lib
  const file = join(process.cwd(), '.env.local');
  const out = { ...process.env };
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
    }
  }
  return out;
})();

const need = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'];
const missing = need.filter(k => !env[k]);
if (missing.length && !DRY) {
  console.error(`missing ${missing.join(', ')} in .env.local`);
  process.exit(1);
}

const collect = dir => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collect(p));
    } else if (UPLOAD.has(extname(entry.name)) && !SKIP_NAMES.has(entry.name)) {
      out.push(p);
    }
  }
  return out;
};

const main = async () => {
  const files = collect(OUT);
  const total = files.reduce((n, f) => n + statSync(f).size, 0);
  console.log(
    `${files.length.toLocaleString()} files, ${(total / 1024 / 1024).toFixed(0)} MB of .webp and .json`,
  );

  if (DRY && missing.length) {
    console.log('\ndry run, and no credentials set. listing only:');
    for (const f of files.slice(0, 10)) {
      console.log('  ' + relative(OUT, f).replace(/\\/g, '/'));
    }
    console.log(`  ... and ${files.length - 10} more`);
    return;
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  // what is already there, so a re-run only sends the difference
  console.log('listing the bucket...');
  const have = new Map();
  let token;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: env.R2_BUCKET,
        ContinuationToken: token,
      }),
    );
    for (const o of page.Contents ?? []) have.set(o.Key, o.Size);
    token = page.NextContinuationToken;
  } while (token);
  console.log(`  bucket holds ${have.size.toLocaleString()} objects`);

  const queue = files.filter(f => {
    const key = relative(OUT, f).replace(/\\/g, '/');
    return have.get(key) !== statSync(f).size;
  });
  console.log(`  ${queue.length.toLocaleString()} new or changed`);

  if (!queue.length) {
    console.log('nothing to do');
    return;
  }
  if (DRY) {
    for (const f of queue.slice(0, 20)) {
      console.log('  would send ' + relative(OUT, f).replace(/\\/g, '/'));
    }
    if (queue.length > 20) console.log(`  ... and ${queue.length - 20} more`);
    return;
  }

  const target = queue.length;
  let done = 0;
  let failed = 0;
  const worker = async () => {
    for (;;) {
      const f = queue.pop();
      if (!f) return;
      const key = relative(OUT, f).replace(/\\/g, '/');
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: key,
            Body: createReadStream(f),
            ContentLength: statSync(f).size,
            ContentType: TYPES[extname(f)],
            CacheControl: CACHE_CONTROL,
          }),
        );
      } catch (err) {
        failed++;
        if (failed <= 10) console.log(`  FAILED ${key}: ${err.message}`);
      }
      done++;
      if (done % 250 === 0) {
        process.stdout.write(`  ${done}/${target}\r`);
      }
    }
  };

  const started = Date.now();
  await Promise.all(Array.from({ length: WORKERS }, worker));
  console.log(
    `  uploaded ${done - failed}, failed ${failed}, in ${(
      (Date.now() - started) / 1000
    ).toFixed(0)}s          `,
  );
};

main();
