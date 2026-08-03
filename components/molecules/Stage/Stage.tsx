'use client';
import useChar from '@/app/context/CharCtx';
import useScene from '@/app/context/SceneCtx';
import Char from '@/components/atoms/Char';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './Stage.module.scss';

/**
 * A map backdrop
 *
 * Two plates, not one. The map's own `back` entries carry a `front` flag
 * front is in front of character
 *
 * no foothold no snapping
 */

// Native pixel size of the captured plates
const MAP = { id: '211042000', w: 3040, h: 590 };

// Scene state deliberately does NOT live in `outfit`
const POS_KEY = 'scene-char-pos';
const PAN_KEY = 'scene-pan';

// Keeps the sprite from being dragged fully out of the picture.
const EDGE_PAD = 24;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const Stage = () => {
  const { zoom } = useChar();
  const { bg } = useScene();
  const sceneRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  // Map coordinates, not screen ones, so the character stays put on the map
  // when the window is resized.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  // How far the map is shoved from centre, in screen pixels. 0 is centred
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // Viewport size to work out how far the map is allowed to travel
  const [view, setView] = useState({ w: 0, h: 0 });
  // Pointer offset from the character's anchor at grab time, in map space.
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  // Where the pointer and the map were when a pan started, in screen pixels.
  const panGrab = useRef<{ px: number; py: number; ox: number; oy: number } | null>(
    null,
  );

  // Mirrors, so the pointerup handler can save the final value without either going stale in its closure or re-subscribing on every mouse move
  const posRef = useRef(pos);
  posRef.current = pos;
  const panRef = useRef(pan);
  panRef.current = pan;

  useEffect(() => {
    const saved = localStorage.getItem(POS_KEY);
    setPos(saved ? JSON.parse(saved) : { x: MAP.w / 2, y: MAP.h - 30 });
    const savedPan = localStorage.getItem(PAN_KEY);
    if (savedPan) setPan(JSON.parse(savedPan));
  }, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setView({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The map may be pushed until its edge meets the viewport edge, and no
  // further. An axis smaller than the viewport can't pan at all, so it stays
  // centred rather than drifting into the backdrop colour.
  const limit = useCallback(
    (p: { x: number; y: number }) => {
      const slackX = Math.max(0, (MAP.w * zoom - view.w) / 2);
      const slackY = Math.max(0, (MAP.h * zoom - view.h) / 2);
      return {
        x: clamp(p.x, -slackX, slackX),
        y: clamp(p.y, -slackY, slackY),
      };
    },
    [zoom, view],
  );

  // Zooming out or shrinking the window can leave an old pan out of bounds.
  useEffect(() => setPan(p => limit(p)), [limit]);

  // Screen pixels to map pixels. Measuring the scaled element and normalising
  // by its rect means dragging is correct at any zoom with no extra maths.
  const toMap = useCallback((clientX: number, clientY: number) => {
    const r = sceneRef.current?.getBoundingClientRect();
    if (!r) return null;
    return {
      x: ((clientX - r.left) / r.width) * MAP.w,
      y: ((clientY - r.top) / r.height) * MAP.h,
    };
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (panGrab.current) {
        const g = panGrab.current;
        setPan(
          limit({
            x: g.ox + (e.clientX - g.px),
            y: g.oy + (e.clientY - g.py),
          }),
        );
        return;
      }
      if (!grab.current) return;
      const p = toMap(e.clientX, e.clientY);
      if (!p) return;
      setPos({
        x: clamp(p.x - grab.current.dx, EDGE_PAD, MAP.w - EDGE_PAD),
        y: clamp(p.y - grab.current.dy, EDGE_PAD, MAP.h),
      });
    };
    // Saved here rather than in an effect on the value: a drag ends without
    // changing it again, so an effect would never see the final position.
    const onUp = () => {
      if (grab.current && posRef.current)
        localStorage.setItem(POS_KEY, JSON.stringify(posRef.current));
      if (panGrab.current)
        localStorage.setItem(PAN_KEY, JSON.stringify(panRef.current));
      grab.current = null;
      panGrab.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    //if anything else does manage to steal the gesture, this still releases the grab instead of leaving the map welded to the cursor
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [toMap, limit]);

  return (
    <div
      ref={frameRef}
      className={styles.frame}
      style={{ background: bg }}
      // Anywhere that isn't the char pans the map. char stops this event
      onPointerDown={e => {
        // Without this the browser starts its own image-drag on the plates,
        // which cancels the pointer stream so pointerup never arrives and the
        // map stays stuck to the cursor until the next click.
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        panGrab.current = {
          px: e.clientX,
          py: e.clientY,
          ox: pan.x,
          oy: pan.y,
        };
      }}
    >
      <div
        className={styles.scene}
        style={{
          width: MAP.w * zoom,
          height: MAP.h * zoom,
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
        }}
      >
        {/* Scaled from the top-left so the layer below can hold the real map
            size and everything inside stays in unscaled map pixels. */}
        <div
          ref={sceneRef}
          className={styles.plates}
          style={{ width: MAP.w, height: MAP.h, transform: `scale(${zoom})` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.plate}
            src={`/maps/${MAP.id}.back.png`}
            alt=''
            draggable={false}
          />

          {pos && (
            <div
              className={styles.charAnchor}
              style={{ left: pos.x, top: pos.y }}
              onPointerDown={e => {
                const p = toMap(e.clientX, e.clientY);
                if (!p) return;
                // Or the frame beneath would start panning at the same time.
                e.stopPropagation();
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                grab.current = { dx: p.x - pos.x, dy: p.y - pos.y };
              }}
            >
              <Char />
            </div>
          )}

          {/* Drawn over the character, and never a drag target. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={`${styles.plate} ${styles.front}`}
            src={`/maps/${MAP.id}.front.png`}
            alt=''
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
};

export default Stage;
