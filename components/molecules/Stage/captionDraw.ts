import { SpriteFrame } from './useUiSprites';

// Geometry and painting for a wz caption, shared by the live one on the stage
// and the little previews in the picker.
//
// Each piece is anchored to a different corner of the content box, which is why
// this can't be a css border-image grid. The left column sits at x 0 and the
// right at x W, the top row at y 0 and the bottom at y H, and n/s/w/e/c tile
// across the span between. So `s` having oy 0 doesn't mean "at the top", it
// means "at H, unshifted".

export type Placed = {
  /** where in the strip */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** where to draw, relative to the content box origin */
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CaptionKind = 'balloon' | 'tag';

const push = (
  out: Placed[],
  p: SpriteFrame[keyof SpriteFrame],
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  if (!p || w < 1 || h < 1) return;
  out.push({ sx: p.x, sy: p.y, sw: p.w, sh: p.h, x, y, w, h });
};

/** the chat balloon, nine pieces plus a tail */
const placeNine = (f: SpriteFrame, W: number, H: number) => {
  const out: Placed[] = [];
  // fill first, then the edges over it, then the corners
  push(out, f.c, f.c?.ox ?? 0, f.c?.oy ?? 0, W, H);
  push(out, f.n, 0, f.n?.oy ?? 0, W, f.n?.h ?? 0);
  push(out, f.s, 0, H + (f.s?.oy ?? 0), W, f.s?.h ?? 0);
  push(out, f.w, f.w?.ox ?? 0, 0, f.w?.w ?? 0, H);
  push(out, f.e, W + (f.e?.ox ?? 0), 0, f.e?.w ?? 0, H);
  push(out, f.nw, f.nw?.ox ?? 0, f.nw?.oy ?? 0, f.nw?.w ?? 0, f.nw?.h ?? 0);
  push(out, f.ne, W + (f.ne?.ox ?? 0), f.ne?.oy ?? 0, f.ne?.w ?? 0, f.ne?.h ?? 0);
  push(out, f.sw, f.sw?.ox ?? 0, H + (f.sw?.oy ?? 0), f.sw?.w ?? 0, f.sw?.h ?? 0);
  push(out, f.se, W + (f.se?.ox ?? 0), H + (f.se?.oy ?? 0), f.se?.w ?? 0, f.se?.h ?? 0);

  // the tail. wz anchors it at the character rather than at the balloon, so
  // there is no offset in the data that centres it. centring is ours
  if (f.arrow) {
    push(out, f.arrow, Math.round((W - f.arrow.w) / 2), H + f.arrow.oy, f.arrow.w, f.arrow.h);
  }

  // head is a topper about a third of the styles carry. its width tracks arrow
  // rather than c, so it is not a tiling strip like n is, and on the styles
  // where it happens to match c we can't tell which it means. left undrawn
  // until we've looked at a few

  return out;
};

/**
 * The name tag, one row that only stretches sideways.
 *
 * Nothing tiles vertically here, so the content box *is* `c`'s own rect and the
 * caps hang off it. Their `oy` is measured from the same anchor as `c`'s, so the
 * offset between the two is what makes a decorated cap stick up above the plate
 * (style 40 has `c` at -3 and `w` at -12, so the cap clears it by 9).
 */
const placeThree = (f: SpriteFrame, W: number) => {
  const out: Placed[] = [];
  const base = f.c?.oy ?? 0;
  push(out, f.c, 0, 0, W, f.c?.h ?? 0);
  push(out, f.w, f.w?.ox ?? 0, (f.w?.oy ?? 0) - base, f.w?.w ?? 0, f.w?.h ?? 0);
  push(out, f.e, W + (f.e?.ox ?? 0), (f.e?.oy ?? 0) - base, f.e?.w ?? 0, f.e?.h ?? 0);
  return out;
};

export const placePieces = (
  kind: CaptionKind,
  f: SpriteFrame,
  W: number,
  H: number,
) => (kind === 'balloon' ? placeNine(f, W, H) : placeThree(f, W));

/**
 * The line box the style was drawn around, which is `c` either way.
 *
 * A balloon tiles `c` vertically, so one line of text is exactly one tile tall
 * and the tiling comes out seamless. A tag doesn't tile vertically at all, so
 * one `c` is the whole plate and the text centres in it.
 */
export const lineBox = (f: SpriteFrame | undefined) => f?.c?.h ?? 14;

/** the full drawn rect, which is always at least the content box */
export const boundsOf = (placed: Placed[], W: number, H: number) => {
  let l = 0;
  let t = 0;
  let r = W;
  let b = H;
  for (const p of placed) {
    if (p.x < l) l = p.x;
    if (p.y < t) t = p.y;
    if (p.x + p.w > r) r = p.x + p.w;
    if (p.y + p.h > b) b = p.y + p.h;
  }
  return { l, t, r, b };
};

/**
 * Paints onto a canvas whose top left is (l, t) in content box coordinates.
 *
 * Canvas rather than css because a spritesheet can't tile a sub-rect,
 * background-repeat repeats the whole sheet, so n/s/w/e/c would smear their
 * neighbours into view.
 */
export const paint = (
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  placed: Placed[],
  l: number,
  t: number,
) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.imageSmoothingEnabled = false;
  for (const p of placed) {
    // tile, cropping the source on the last row and column so a box that isn't
    // a whole number of tiles still ends flush
    for (let y = 0; y < p.h; y += p.sh) {
      for (let x = 0; x < p.w; x += p.sw) {
        const cw = Math.min(p.sw, p.w - x);
        const ch = Math.min(p.sh, p.h - y);
        ctx.drawImage(img, p.sx, p.sy, cw, ch, p.x - l + x, p.y - t + y, cw, ch);
      }
    }
  }
};
