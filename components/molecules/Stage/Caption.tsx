'use client';
import { CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  boundsOf,
  CaptionKind,
  lineBox,
  minBox,
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
 * A UI.wz chat balloon or name tag, typed straight into.
 *
 * The text element is the content box, so what it measures is where every
 * piece goes. Same as the game, the frame has no size of its own
 */

/** wz carries no delay for these, so it's a guess that reads about right */
const FRAME_MS = 120;

/**
 * A javascript string as a css string token, line breaks included.
 */
const cssString = (s: string) =>
  '"' +
  s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, '\\A ') +
  '"';

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
  /** stands in while the text is empty, and sizes the box with it */
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

  // the sizer holds the text, so it sets the content box and the rest follows
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

  // a style whose art needs more room than the text gets the difference as
  // padding, split top and bottom, so the text ends up centred in the frame
  const boxH = Math.max(box.h, minBox(kind, style.frames[0]));
  const slack = boxH - box.h;
  const above = Math.floor(slack / 2);

  const placed = useMemo(() => {
    // picked in here, not outside. an empty fallback object would be a new
    // identity every render and the memo would never hold
    const f = style.frames[Math.min(frame, frames - 1)];
    return f && box.w > 0 ? placePieces(kind, f, box.w, boxH) : [];
  }, [kind, style, frame, frames, box.w, boxH]);

  const bb = useMemo(() => boundsOf(placed, box.w, boxH), [placed, box.w, boxH]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !img || placed.length === 0) return;
    paint(ctx, img, placed, bb.l, bb.t);
  }, [img, placed, bb.l, bb.t]);

  // react must not own the text node or it fights the caret on every keystroke
  //
  // so it stays out of the jsx, and only gets written back when something other
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
        // the frame overhangs the content box on every side. padding it by that
        // overhang makes the border box the whole drawn caption
        paddingLeft: -bb.l,
        paddingTop: -bb.t + above,
        paddingRight: bb.r - box.w,
        paddingBottom: bb.b - boxH + (slack - above),
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
            // 0 means the style carries no line box, so let the font pick one
            lineHeight: height ? `${height}px` : undefined,
            maxWidth: kind === 'tag' ? undefined : maxWidth,
            // css rather than a sibling node, so it measures as part of the
            // box. an empty caption would collapse to a sliver otherwise
            '--placeholder': cssString(placeholder ?? '...'),
          } as CSSProperties
        }
        contentEditable={editable}
        suppressContentEditableWarning
        spellCheck={false}
        onInput={
          editable ? e => onChange(e.currentTarget.textContent ?? '') : undefined
        }
        // enter would insert a div, and pasted html would come in with its own formatting. plain text only
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
