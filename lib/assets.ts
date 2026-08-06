/**
 * What the extracted art is served as.
 *
 * scripts/webp-avatar.mjs writes a .webp next to every .png and deletes
 * nothing, so both formats sit on disk and this decides which one the app
 * asks for. Flip it back to '.png' to rule webp out of any rendering problem.
 *
 * The index json still names its sheets .png, since that is what
 * extract-index.lua wrote. sheetUrl swaps the extension rather than us
 * rewriting those files, so the pipeline output stays untouched
 */
export const SHEET_EXT = '.webp';

/** an art path with whichever format we are serving */
export const asSheet = (path: string) => path.replace(/\.png$/, SHEET_EXT);
