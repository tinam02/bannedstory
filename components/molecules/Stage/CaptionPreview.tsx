'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { boundsOf, CaptionKind, lineBox, paint, placePieces } from './captionDraw';
import { SpriteStyle, spriteUrl, UiSetName, useStripImage } from './useUiSprites';

/**
 * One style's frame at a fixed width, for the picker grid.
 *
 * Not the real Caption. There are ~450 of these and none need text measuring,a resize observer or an editable node
 */
const CaptionPreview = ({
  set,
  kind,
  style,
  width = 26,
}: {
  set: UiSetName;
  kind: CaptionKind;
  style: SpriteStyle;
  /** the pretend content box, so every tile is drawn to the same measure */
  width?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [seen, setSeen] = useState(false);
  const img = useStripImage(seen ? spriteUrl(set, style.file) : null);

  // holds off loading the strip png until the tile scrolls into view, so opening
  // the picker fetches the dozen you can see and not all 450
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) setSeen(true);
      },
      { rootMargin: '120px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  // a preview has no real text, so a style with no line box of its own still
  // needs some height to draw around
  const height = lineBox(style.frames[0]) || 14;

  // always frame 0, an animated grid would be 450 timers
  const { placed, bb } = useMemo(() => {
    const f = style.frames[0];
    const p = f ? placePieces(kind, f, width, height) : [];
    return { placed: p, bb: boundsOf(p, width, height) };
  }, [kind, style, width, height]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !img || placed.length === 0) return;
    paint(ctx, img, placed, bb.l, bb.t);
  }, [img, placed, bb.l, bb.t]);

  return (
    <canvas
      ref={canvasRef}
      width={Math.max(1, bb.r - bb.l)}
      height={Math.max(1, bb.b - bb.t)}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    />
  );
};

export default CaptionPreview;
