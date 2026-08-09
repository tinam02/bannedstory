// type-only, and said so, or a node script importing this file for the
// placement maths drags in the hook and react with it
import type { PieceName, SpriteFrame, SpritePiece } from './useUiSprites';

// where every piece of a wz caption goes, and how to paint it. shared by the
// live one on the stage and the previews in the picker
//
// each piece is anchored to a different corner of the content box, which is why
// this can't be a css border-image grid. left column at x 0, right at x W, top
// row at y 0, bottom at y H, and n/s/w/e/c tile across the span between
//
// so `s` having oy 0 doesn't mean "at the top", it means "at H, unshifted"

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
  /** clear what's underneath first, see paint */
  cut?: boolean;
};

export type CaptionKind = 'balloon' | 'tag';

const push = (
  out: Placed[],
  p: SpriteFrame[keyof SpriteFrame],
  x: number,
  y: number,
  w: number,
  h: number,
  cut = false,
) => {
  if (!p || w < 1 || h < 1) return;
  out.push({ sx: p.x, sy: p.y, sw: p.w, sh: p.h, x, y, w, h, cut });
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
  //
  // cut because it stands in for the bottom border across its width rather than
  // sitting on top of it, see paint
  if (f.arrow) {
    const a = f.arrow;
    push(out, a, Math.round((W - a.w) / 2), H + a.oy, a.w, a.h, true);
  }

  // head is a topper about a third of the styles carry. its width tracks arrow
  // rather than c, so it isn't a tiling strip like n is, and where it matches c
  // we can't tell which it means. left undrawn until we've looked at a few

  return out;
};

// the name tag, one row that only stretches sideways
//
// nothing tiles vertically, so the content box is c's own rect and the caps
// hang off it. w and e measure oy from the same anchor c does, so the gap
// between them is what lifts a decorated cap above the plate. style 40 has c at
// -3 and w at -12, so its cap clears by 9
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

// the shortest content box a style's art will sit right in
//
// n isn't always just a border. style 5's is 7px of yellow edge and then 24px of
// the dark interior fill, so a one line box puts s over the top of n's own fill
// and the balloon comes out squashed
//
// only style 5 of the 450 needs this, the rest are flush and come back 0
export const minBox = (kind: CaptionKind, f: SpriteFrame | undefined) => {
  if (!f || kind !== 'balloon') return 0;
  const reach = (keys: PieceName[], of: (p: SpritePiece) => number) =>
    Math.max(0, ...keys.map(k => (f[k] ? of(f[k] as SpritePiece) : 0)));
  // how far the top row hangs below the box top, plus how far the bottom row
  // reaches back up above the box bottom
  return (
    reach(['n', 'nw', 'ne'], p => p.oy + p.h) + reach(['s', 'sw', 'se'], p => -p.oy)
  );
};

// the line box the style was drawn around, which is c either way
//
// a balloon tiles c vertically, so one line of text is one tile tall and the
// tiling lands seamless. a tag doesn't tile vertically at all, so one c is the
// whole plate and the text centres in it
//
// 0 means the style has no line box of its own and the font should pick. only
// tutorial, whose c is 1x1 because it stretches smoothly instead of tiling.
// taking that literally gives line-height 1px and the text falls out of a
// balloon squashed to a sliver
export const lineBox = (f: SpriteFrame | undefined) => {
  const h = f?.c?.h ?? 14;
  return h < 12 ? 0 : h;
};

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

// paints onto a canvas whose top left is (l, t) in content box coords
//
// canvas and not css because a spritesheet can't tile a sub-rect,
// background-repeat repeats the whole sheet, so n/s/w/e/c would smear their
// neighbours into view
export const paint = (
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  placed: Placed[],
  l: number,
  t: number,
) => {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'source-over';

  // tile, cropping the source on the last row and column so a box that isn't a
  // whole number of tiles still ends flush
  const blit = (p: Placed) => {
    for (let y = 0; y < p.h; y += p.sh) {
      for (let x = 0; x < p.w; x += p.sw) {
        const cw = Math.min(p.sw, p.w - x);
        const ch = Math.min(p.sh, p.h - y);
        ctx.drawImage(img, p.sx, p.sy, cw, ch, p.x - l + x, p.y - t + y, cw, ch);
      }
    }
  };

  for (const p of placed) {
    // s runs the full width and the arrow lands on top of it. on an opaque style
    // that's invisible, but a translucent one blends both and leaves a square above the tail
    //
    // punching the arrow's own silhouette out first means it replaces the border
    // instead of stacking on it. only where it actually paints, so the styles
    // whose arrow doesn't fully cover s keep theirs and don't gain a hole
    if (p.cut) {
      ctx.globalCompositeOperation = 'destination-out';
      blit(p);
      ctx.globalCompositeOperation = 'source-over';
    }
    blit(p);
  }
};
