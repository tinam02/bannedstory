'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { boundsOf, CaptionKind, lineBox, paint, placePieces } from './captionDraw';
import { SpriteStyle, spriteUrl, UiSetName, useStripImage } from './useUiSprites';

/**
 * One style's frame at a fixed sample width, for the picker grid.
 *
 * Deliberately not the real Caption: there are ~450 of these and none of them
 * need text measuring, a resize observer or an editable node. It also holds off
 * loading its strip png until it scrolls into view, so opening the picker
 * fetches the dozen you can see rather than all 450.
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

  const height = lineBox(style.frames[0]);

  // always the first frame, an animated preview grid would be a lot of timers
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
