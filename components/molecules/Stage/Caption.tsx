'use client';
import { CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  boundsOf,
  CaptionKind,
  lineBox,
  paint,
  placePieces,
} from './captionDraw';
import {
  spriteColor,
  SpriteStyle,
  spriteUrl,
  UiSetName,
  useStripImage,
} from './useUiSprites';
import styles from './Caption.module.scss';

/**
 * A UI.wz chat balloon or name tag with the text typed straight into it.
 *
 * The text element *is* the content box, so its measured size is what every
 * piece position is derived from. Same as the game: the frame has no size of
 * its own, it grows around whatever was said.
 */

/** how fast the 8 animated balloons cycle. wz carries no delay for these */
const FRAME_MS = 120;

const Caption = ({
  kind,
  set,
  style,
  styleId,
  text,
  onChange,
  placeholder,
  maxWidth = 220,
}: {
  kind: CaptionKind;
  set: UiSetName;
  style: SpriteStyle;
  /** only to label the element in the dom */
  styleId?: string;
  text: string;
  /** left off for the picker previews, which aren't editable */
  onChange?: (next: string) => void;
  /** stands in when the text is empty, and sizes the box so it isn't a sliver */
  placeholder?: string;
  /** where the text starts wrapping, in map pixels. a tag never wraps */
  maxWidth?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [frame, setFrame] = useState(0);
  const img = useStripImage(spriteUrl(set, style.file));

  const frames = style.frames.length;

  useEffect(() => {
    if (frames < 2) {
      setFrame(0);
      return;
    }
    const id = setInterval(() => setFrame(f => (f + 1) % frames), FRAME_MS);
    return () => clearInterval(id);
  }, [frames]);

  const height = lineBox(style.frames[0]);

  // the sizer holds the text, so it decides the content box and everything else
  // follows from it
  useLayoutEffect(() => {
    const el = sizerRef.current;
    if (!el) return;
    const measure = () =>
      setBox({ w: Math.ceil(el.offsetWidth), h: Math.ceil(el.offsetHeight) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const placed = useMemo(() => {
    // resolved in here rather than outside, an empty fallback object would be a
    // new identity every render and the memo would never hold
    const f = style.frames[Math.min(frame, frames - 1)];
    return f && box.w > 0 ? placePieces(kind, f, box.w, box.h) : [];
  }, [kind, style, frame, frames, box.w, box.h]);

  const bb = useMemo(
    () => boundsOf(placed, box.w, box.h),
    [placed, box.w, box.h],
  );

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !img || placed.length === 0) return;
    paint(ctx, img, placed, bb.l, bb.t);
  }, [img, placed, bb.l, bb.t]);

  // react must not own the text node or it fights the caret on every keystroke,
  // so it stays out of the jsx and is only written back in when something other
  // than typing changed it
  useEffect(() => {
    const el = sizerRef.current;
    if (!el || document.activeElement === el) return;
    if (el.textContent !== text) el.textContent = text;
  }, [text]);

  const editable = typeof onChange === 'function';

  return (
    <div
      className={styles.caption}
      data-kind={kind}
      data-style={styleId}
      style={{
        // the frame overhangs the content box on every side, so the padding is
        // that overhang and the border box ends up the whole drawn caption
        paddingLeft: -bb.l,
        paddingTop: -bb.t,
        paddingRight: bb.r - box.w,
        paddingBottom: bb.b - box.h,
      }}
      // or the map underneath starts panning and the caret never lands
      onPointerDown={editable ? e => e.stopPropagation() : undefined}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={Math.max(1, bb.r - bb.l)}
        height={Math.max(1, bb.b - bb.t)}
      />
      <div
        ref={sizerRef}
        className={styles.text}
        data-empty={text.length === 0 ? '' : undefined}
        data-nowrap={kind === 'tag' ? '' : undefined}
        style={
          {
            color: spriteColor(style.clr),
            lineHeight: `${height}px`,
            maxWidth: kind === 'tag' ? undefined : maxWidth,
            // drawn by css rather than as a sibling node, so it measures as part
            // of the box. an empty caption would otherwise collapse to a sliver
            '--placeholder': JSON.stringify(placeholder ?? '...'),
          } as CSSProperties
        }
        contentEditable={editable}
        suppressContentEditableWarning
        spellCheck={false}
        onInput={
          editable ? e => onChange(e.currentTarget.textContent ?? '') : undefined
        }
        // enter would insert a div, and growing on a paste of formatted html is
        // worse than only ever holding plain text
        onKeyDown={
          editable
            ? e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }
            : undefined
        }
        onPaste={
          editable
            ? e => {
                e.preventDefault();
                document.execCommand(
                  'insertText',
                  false,
                  e.clipboardData.getData('text/plain'),
                );
              }
            : undefined
        }
      />
    </div>
  );
};

export default Caption;
