/**
 * Turning the character on screen into a file.
 *
 * People right click an avatar expecting "save image as", and a canvas does
 * not offer it: browsers only put that on an <img>. So it has to be built,
 * and once it is being built it may as well come out at a usable size and
 * with the animation intact
 */

/** what a still is saved as. both keep full alpha */
export type StillFormat = 'png' | 'webp';

/**
 * Bigger, without going soft.
 *
 * The art is 1:1 wz pixels, which is tiny on a modern screen. Nearest
 * neighbour on a whole number multiple is the only honest way up
 */
export const scaleUp = (src: HTMLCanvasElement, scale: number) => {
  if (scale === 1) return src;
  const out = document.createElement('canvas');
  out.width = Math.max(1, src.width * scale);
  out.height = Math.max(1, src.height * scale);
  const ctx = out.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, out.width, out.height);
  }
  return out;
};

export const canvasToBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('no blob'))), type);
  });

export const canvasToPngBytes = async (canvas: HTMLCanvasElement) =>
  new Uint8Array(await (await canvasToBlob(canvas, 'image/png')).arrayBuffer());

/**
 * An animation is still a .png, so the name has to carry the difference.
 *
 * Both come out of the same menu seconds apart and windows shows them with
 * the same icon and the same first frame, so two files called
 * bannedstory-1786118894592.png is a guessing game
 */
export const snapshotFilename = (ext: string, animated = false, now = Date.now()) =>
  `bannedstory-${now}${animated ? '-animated' : ''}.${ext}`;

/** hands the blob to the browser, then lets go of it */
export const save = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // not immediately. the click is synchronous but the fetch of the url is not,
  // and revoking under it drops the download in safari
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

/**
 * Puts the image on the clipboard.
 *
 * png only, because that is the one type every browser's clipboard takes.
 * Throws if the page is not allowed to write, which the caller reports rather
 * than swallowing: silently doing nothing reads as a broken menu
 */
export const copyToClipboard = (canvas: HTMLCanvasElement) => {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    return Promise.reject(new Error('this browser will not take images'));
  }
  // built from the PROMISE, not from an awaited blob. awaiting first hands the
  // gesture back and safari refuses the write as no longer user initiated
  const item = new ClipboardItem({ 'image/png': canvasToBlob(canvas, 'image/png') });
  return navigator.clipboard.write([item]);
};
