/**
 * GIF, for everywhere that re-encodes what you upload.
 *
 * APNG is the better file: lossless, 8-bit alpha, the glows survive. It is
 * also invisible to any pipeline that does not know the chunks, which is most
 * of them. Are.na took one and gave back a still. So this exists alongside it
 * rather than instead of it.
 *
 * The cost is the format's own: 256 colours a frame, and alpha that is one bit
 * or nothing. Which is why the caller has to say what the soft pixels sit on
 */

import { GIFEncoder, applyPalette, quantize } from 'gifenc';

/**
 * What happens to the pixels that are neither solid nor clear.
 *
 * `matte` was already composited onto a colour by the caller, so there is no
 * alpha left to lose and the glows are smooth. `cut` keeps a transparent
 * background and rounds every soft pixel to on or off, which travels anywhere
 * and gives the effects a visibly stepped edge
 */
export type GifAlpha = 'matte' | 'cut';

/** the alpha at which a pixel is kept rather than dropped, when cutting */
const CUT_AT = 127;

export const buildGif = (
  frames: Uint8ClampedArray[],
  width: number,
  height: number,
  delays: number[],
  alpha: GifAlpha,
): Blob => {
  const gif = GIFEncoder();
  const cut = alpha === 'cut';
  // rgba4444 is the only format gifenc quantises alpha in. rgb565 gives the
  // colours a bit more room, which is worth having when there is no alpha
  const format = cut ? 'rgba4444' : 'rgb565';

  frames.forEach((frame, i) => {
    const rgba = new Uint8Array(frame.buffer, frame.byteOffset, frame.byteLength);
    const palette = quantize(rgba, 256, {
      format,
      ...(cut ? { oneBitAlpha: CUT_AT, clearAlpha: true, clearAlphaThreshold: 0 } : {}),
    });
    const index = applyPalette(rgba, palette, format);

    // the palette entry the encoder should treat as see-through. quantize
    // leaves it wherever it likes, so it has to be looked up rather than
    // assumed to be 0
    const clear = cut
      ? palette.findIndex(c => c.length === 4 && c[3] === 0)
      : -1;

    gif.writeFrame(index, width, height, {
      palette,
      // gifenc takes milliseconds and rounds to the format's centiseconds
      delay: delays[i] ?? 100,
      transparent: clear >= 0,
      transparentIndex: clear >= 0 ? clear : 0,
      // restore to background between frames, or a transparent gif paints
      // every frame on top of the last and the glow piles up
      dispose: clear >= 0 ? 2 : -1,
    });
  });

  gif.finish();
  return new Blob([gif.bytesView() as BlobPart], { type: 'image/gif' });
};
