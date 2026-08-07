/**
 * gifenc ships no types, so these are hand written from its source.
 *
 * Only the parts lib/gif.ts uses. Narrower than the library on purpose: an
 * accurate description of the corner we rely on beats a loose one that would
 * let a typo through
 */
declare module 'gifenc' {
  /** rgb triples, or rgba quads when the format carries alpha */
  export type Palette = number[][];

  export type QuantizeFormat = 'rgb565' | 'rgb444' | 'rgba4444';

  export type QuantizeOptions = {
    format?: QuantizeFormat;
    /** true for a 127 cut, or the alpha to cut at */
    oneBitAlpha?: boolean | number;
    clearAlpha?: boolean;
    clearAlphaThreshold?: number;
    clearAlphaColor?: number;
    useSqrt?: boolean;
  };

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    opts?: QuantizeOptions,
  ): Palette;

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Palette,
    format?: QuantizeFormat,
  ): Uint8Array;

  export type FrameOptions = {
    palette?: Palette | null;
    /** milliseconds. the encoder rounds to the format's centiseconds */
    delay?: number;
    transparent?: boolean;
    transparentIndex?: number;
    /** -1 leaves it to the encoder, 2 restores the background */
    dispose?: number;
    repeat?: number;
    colorDepth?: number;
    first?: boolean;
  };

  export type Encoder = {
    writeFrame: (
      index: Uint8Array,
      width: number,
      height: number,
      opts?: FrameOptions,
    ) => void;
    finish: () => void;
    bytes: () => Uint8Array;
    bytesView: () => Uint8Array;
    reset: () => void;
  };

  export function GIFEncoder(opts?: { auto?: boolean; initialCapacity?: number }): Encoder;
}
