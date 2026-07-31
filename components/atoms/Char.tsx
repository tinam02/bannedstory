'use client';
import { useEffect, useRef, useState } from 'react';
import { characterRenderUrl, preloadImageUrl } from '@/lib/fetch';
import DefaultImage from './Image';
import useChar from '@/app/context/CharCtx';
import { useSweepDebounce } from '@/app/hooks/useSweepDebounce';
import styles from './Char.module.scss';

// Poke the character
const POKE_EMOTE = 'hum';
const POKE_MS = 2000;
// A pointer that travelled further than this between down and up was a drag
const DRAG_SLOP_PX = 4;

const Char = () => {
  const { outfit, zoom, hydrated } = useChar();
  const [poked, setPoked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressedAt = useRef<{ x: number; y: number } | null>(null);
  const preloader = useSweepDebounce();

  // Deliberately not routed through `setEmotion`
  //never reaches localStorage
  const shown = poked ? { ...outfit, emotion: POKE_EMOTE } : outfit;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const poke = () => {
    setPoked(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPoked(false), POKE_MS);
  };

  return (
    <div className={styles.stage}>
      {/* Wait for the saved outfit so we don't render, and pay for, a
          default char that is about to be replaced. */}
      {hydrated && (
        <div
          className={styles.scale}
          style={{ transform: `scale(${zoom})` }}
          // Warm the hum render on dwell so the reaction is instant
          onMouseEnter={() =>
            preloader.trigger(() =>
              preloadImageUrl(
                characterRenderUrl({ ...outfit, emotion: POKE_EMOTE }),
              ),
            )
          }
          onPointerDown={e => {
            pressedAt.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={e => {
            const from = pressedAt.current;
            pressedAt.current = null;
            if (!from) return;
            const moved = Math.hypot(e.clientX - from.x, e.clientY - from.y);
            if (moved <= DRAG_SLOP_PX) poke();
          }}
        >
          <DefaultImage
            src={characterRenderUrl(shown)}
            alt='Character'
            unoptimized
          />
        </div>
      )}
    </div>
  );
};

export default Char;
