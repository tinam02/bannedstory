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
