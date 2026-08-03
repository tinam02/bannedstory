'use client';
import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../Icon';
import styles from './ScrollBar.module.scss';

const ARROW = '/ui/buttons/arrow/VScr100.enabled';

// sprite is a fixed 26px with finished caps at both ends, no resize
const THUMB_H = 26;

/**
 * A scrollbar drawn from real elements, for a container whose native one is
 * hidden
 * Pair with `hide-native-scrollbar` on the target.
 */
const ScrollBar = ({
  targetRef,
  step = 48,
}: {
  targetRef: RefObject<HTMLElement | null>;
  /** How far one arrow click moves. Defaults to roughly 1 item row */
  step?: number;
}) => {
  const railRef = useRef<HTMLDivElement>(null);
  const [{ top, scrollable, atTop, atEnd }, setMetrics] = useState({
    top: 0,
    scrollable: false,
    atTop: true,
    atEnd: false,
  });
  // Where the pointer grabbed the thumb, and where the list sat at that moment
  const drag = useRef<{ y: number; scrollTop: number } | null>(null);

  const measure = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;
    const range = el.scrollHeight - el.clientHeight;
    const room = Math.max(0, (railRef.current?.clientHeight ?? 0) - THUMB_H);
    const next = {
      scrollable: range > 0,
      top: range > 0 ? (el.scrollTop / range) * room : 0,
      atTop: el.scrollTop <= 0,
      atEnd: range <= 0 || el.scrollTop >= range - 1,
    };
    // Same numbers means no render
    setMetrics(m =>
      m.scrollable === next.scrollable &&
      m.top === next.top &&
      m.atTop === next.atTop &&
      m.atEnd === next.atEnd
        ? m
        : next,
    );
  }, [targetRef]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    // Appending a page grows scrollHeight without firing a scroll event or
    // resizing the container, so the child list has to be watched separately
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    const mutate = new MutationObserver(measure);
    mutate.observe(el, { childList: true });
    return () => {
      el.removeEventListener('scroll', measure);
      resize.disconnect();
      mutate.disconnect();
    };
  }, [measure, targetRef]);

  // On window rather than the thumb
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = targetRef.current;
      if (!drag.current || !el) return;
      const room = Math.max(0, (railRef.current?.clientHeight ?? 0) - THUMB_H);
      if (room <= 0) return;
      const perPx = (el.scrollHeight - el.clientHeight) / room;
      el.scrollTop =
        drag.current.scrollTop + (e.clientY - drag.current.y) * perPx;
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [targetRef]);

  const nudge = (by: number) => {
    const el = targetRef.current;
    if (el) el.scrollTop += by;
  };

  // dimmed
  const arrowStyle = (off: boolean) => ({ opacity: off ? 0.35 : 1 });

  return (
    <div className={styles.bar}>
      <Icon
        defaultImg={`${ARROW}.png`}
        activeImg={`${ARROW}.png`}
        onClick={atTop ? undefined : () => nudge(-step)}
        imgStyle={arrowStyle(atTop)}
      />
      <div ref={railRef} className={styles.rail}>
        {scrollable && (
          <div
            className={styles.thumb}
            style={{ transform: `translateY(${top}px)` }}
            onMouseDown={e => {
              const el = targetRef.current;
              if (!el) return;
              // Or the browser starts a drag-select mid-drag.
              e.preventDefault();
              drag.current = { y: e.clientY, scrollTop: el.scrollTop };
            }}
          />
        )}
      </div>
      <Icon
        defaultImg={`${ARROW}.next0.png`}
        activeImg={`${ARROW}.next0.png`}
        onClick={atEnd ? undefined : () => nudge(step)}
        imgStyle={arrowStyle(atEnd)}
      />
    </div>
  );
};

export default ScrollBar;
