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
 * Until 2026-08-13 the map manifests were served under the `/maps/*` rule,
 * which is `immutable` for a year because the art under it never changes name.
 * The manifests do: index.json is rewritten by every `npm run maps`. Caddy now
 * sends them `no-cache`, but that only helps a browser willing to ask, and
 * `immutable` is precisely the instruction not to. Everyone who opened the site
 * between launch and that fix is holding a map list they will keep until 2027.
 *
 * A query string is a different cache entry, so this is the one thing that
 * reaches them. Bump it and every stale copy is abandoned.
 *
 * It buys nothing for anyone whose cache is already healthy, and costs nothing
 * either, so it can ride along with any deploy rather than needing one.
 */
export const MAP_MANIFEST_V = '2';

/** a map manifest url, carrying the cache buster above */
export const mapManifestUrl = (path: string) =>
  `/maps/${path.replace(/^\//, '')}?v=${MAP_MANIFEST_V}`;
