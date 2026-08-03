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

// Keeps the sprite from being dragged fully out of the picture.
const EDGE_PAD = 24;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const Stage = () => {
  const { zoom } = useChar();
  const { bg } = useScene();
  const sceneRef = useRef<HTMLDivElement>(null);
  // Map coordinates, not screen ones, so the character stays put on the map
  // when the window is resized.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  // Pointer offset from the character's anchor at grab time, in map space.
  const grab = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(POS_KEY);
    setPos(saved ? JSON.parse(saved) : { x: MAP.w / 2, y: MAP.h - 30 });
  }, []);

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
      if (!grab.current) return;
      const p = toMap(e.clientX, e.clientY);
      if (!p) return;
      setPos({
        x: clamp(p.x - grab.current.dx, EDGE_PAD, MAP.w - EDGE_PAD),
        y: clamp(p.y - grab.current.dy, EDGE_PAD, MAP.h),
      });
    };
    const onUp = () => {
      grab.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [toMap]);

  // Written on release rather than on every move, so a drag is one write.
  useEffect(() => {
    if (!grab.current && pos)
      localStorage.setItem(POS_KEY, JSON.stringify(pos));
  }, [pos]);

  return (
    <div className={styles.frame} style={{ background: bg }}>
      <div
        className={styles.scene}
        style={{ width: MAP.w * zoom, height: MAP.h * zoom }}
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
          />

          {pos && (
            <div
              className={styles.charAnchor}
              style={{ left: pos.x, top: pos.y }}
              onPointerDown={e => {
                const p = toMap(e.clientX, e.clientY);
                if (!p) return;
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
          />
        </div>
      </div>
    </div>
  );
};

export default Stage;
