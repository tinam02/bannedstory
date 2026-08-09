/**
 * Painting a built character onto a 2d context.
 *
 * Lives here rather than in AvatarCanvas so the download draws through the
 * same code as the screen. A snapshot that composites the character its own
 * way is a snapshot that can quietly stop matching what the user is looking at
 */

import type { PlacedLayer } from './avatar';
import type { PlacedEffect } from './effects';

/** the drawing area, in the body-origin space placeLayers works in */
export type Box = { l: number; t: number; w: number; h: number };

export type Tweak = { filter: string; alpha: number };

/** the character's box, grown to hold whatever the effects need */
export const boxFor = (
  bounds: { l: number; t: number; r: number; b: number },
  effects: PlacedEffect[],
): Box => {
  let { l, t, r, b } = bounds;
  for (const e of effects) {
    l = Math.min(l, e.x);
    t = Math.min(t, e.y);
    r = Math.max(r, e.x + e.w);
    b = Math.max(b, e.y + e.h);
  }
  return { l, t, w: r - l, h: b - t };
};

/** the smallest box holding all of them, so an animation does not jitter */
export const mergeBoxes = (boxes: Box[]): Box => {
  const l = Math.min(...boxes.map(b => b.l));
  const t = Math.min(...boxes.map(b => b.t));
  const r = Math.max(...boxes.map(b => b.l + b.w));
  const b = Math.max(...boxes.map(b => b.t + b.h));
  return { l, t, w: r - l, h: b - t };
};

/**
 * Draws one frame. Clears first, so the same context can be reused.
 *
 * `scale` multiplies on the way out and never on the way in, so the source
 * rects stay whole pixels and nearest neighbour keeps the art crisp
 */
export const drawAvatar = (
  ctx: CanvasRenderingContext2D,
  placed: PlacedLayer[],
  effects: PlacedEffect[],
  box: Box,
  images: Map<string, CanvasImageSource>,
  tweaks: Record<number, Tweak>,
  scale = 1,
  /** filled before anything is drawn, for formats with no real alpha */
  background?: string | null,
  /**
   * Turns the character.
   *
   * On screen the flip is a css transform on the canvas element, because that
   * has to mirror the stage anchoring with it. A file has no element and no
   * stage, so the export mirrors the pixels here instead. Both read the same
   * `flipX`, so what you save is what you were looking at
   */
  flip = false,
) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, box.w * scale, box.h * scale);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, box.w * scale, box.h * scale);
  }
  // after the clear, so the region cleared is the one the caller sized
  if (flip) ctx.setTransform(-1, 0, 0, 1, box.w * scale, 0);
  ctx.imageSmoothingEnabled = false;

  const put = (
    item: number,
    sheetUrl: string,
    sx: number,
    sy: number,
    w: number,
    h: number,
    x: number,
    y: number,
  ) => {
    const sheet = images.get(sheetUrl);
    if (!sheet) return;
    const t = tweaks[item];
    ctx.globalAlpha = t?.alpha ?? 1;
    ctx.filter = t?.filter ?? 'none';
    ctx.drawImage(
      sheet,
      sx, sy, w, h,
      (x - box.l) * scale, (y - box.t) * scale, w * scale, h * scale,
    );
  };

  // an effect belongs to its item, so hiding or fading the item takes the
  // effect with it. z is a number per action and only its sign is honoured,
  // which covers the 81% that are -2 or 2
  for (const e of effects) {
    if (e.z < 0) put(e.item, e.sheet, e.sx, e.sy, e.w, e.h, e.x, e.y);
  }
  for (const p of placed) {
    put(p.item, p.sheet, p.sx, p.sy, p.w, p.h, p.x, p.y);
  }
  for (const e of effects) {
    if (e.z >= 0) put(e.item, e.sheet, e.sx, e.sy, e.w, e.h, e.x, e.y);
  }

  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};
