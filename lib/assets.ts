/**
 * Where the extracted art is served from, and in what format.
 *
 * `/avatar` either way. Locally that is a junction onto .avatar-out so
 * `next dev` serves it straight off disk, and on the box scripts/deploy.mjs
 * puts the assets at <DEPLOY_PATH>/avatar next to the site.
 *
 * NEXT_PUBLIC_ASSET_BASE overrides it, and nothing sets it. It is the hook for
 * serving the art from somewhere other than the box, which the R2 plan would
 * have needed and the Hetzner one does not
 */
export const ASSET_BASE =
  process.env.NEXT_PUBLIC_ASSET_BASE?.replace(/\/$/, '') || '/avatar';

/**
 * What the art is served as.
 *
 * Only .webp is uploaded. The .png stay on the local disk because
 * scripts/build-sprite-icons.mjs reads them to composite the hair and face
 * icons, and our png reader cannot read webp.
 *
 * Flip to '.png' to rule webp out of a rendering problem, but only locally:
 * there are no png in the bucket
 */
export const SHEET_EXT = '.webp';

/** an art path with whichever format we are serving */
export const asSheet = (path: string) => path.replace(/\.png$/, SHEET_EXT);

/** a file under the asset root */
export const assetUrl = (path: string) =>
  `${ASSET_BASE}/${path.replace(/^\//, '')}`;

/**
 * A way to reach a browser that has stopped asking.
 *
 * Two aggregates were being served `immutable` for a year despite being
 * rewritten under their own names, both found on 2026-08-13: the map manifests,
 * which sat inside the `/maps/*` art rule, and `/avatar/Effect/index.json`,
 * which sits in a folder of per-item art rather than beside the other indexes.
 * Caddy sends both `no-cache` now, but that only helps a browser willing to
 * ask, and `immutable` is precisely the instruction not to. Everyone who opened
 * the site before that fix holds copies they would keep until 2027.
 *
 * A query string is a different cache entry, so this is the one thing that
 * reaches them. Bump it and every stale copy is abandoned.
 *
 * It buys nothing for anyone whose cache is already healthy and costs nothing
 * either, so it can ride along with any deploy rather than needing one of its
 * own. Only for aggregates: per-item art is immutable under its id and rightly
 * cached forever, and busting 54,696 of those would be a real loss.
 */
export const MANIFEST_V = '2';

/** an aggregate url, carrying the cache buster above */
export const busted = (url: string) =>
  `${url}${url.includes('?') ? '&' : '?'}v=${MANIFEST_V}`;

/** a map manifest url, carrying the cache buster above */
export const mapManifestUrl = (path: string) =>
  busted(`/maps/${path.replace(/^\//, '')}`);
