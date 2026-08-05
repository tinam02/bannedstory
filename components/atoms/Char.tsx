'use client';
import { useEffect, useRef, useState } from 'react';
import { characterRenderUrl, preloadImageUrl } from '@/lib/fetch';
import DefaultImage from './Image';
import useChar from '@/app/context/CharCtx';
import { Outfit } from '@/types';
import { useSweepDebounce } from '@/app/hooks/useSweepDebounce';
import styles from './Char.module.scss';

// Poke the character
const POKE_EMOTE = 'hum';
const POKE_MS = 2000;
// A pointer that travelled further than this between down and up was a drag
const DRAG_SLOP_PX = 4;
// Two taps inside this window, and near enough to each other, is a poke. One
// tap only selects, or the character would hum every time you picked them.
const DOUBLE_MS = 400;
const DOUBLE_SLOP_PX = 12;

/** `who` renders that character. left off, it's whoever is selected */
const Char = ({ who }: { who?: Outfit }) => {
  const { outfit: active, hydrated } = useChar();
  const outfit = who ?? active;
  const [poked, setPoked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const release = useRef<(() => void) | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const preloader = useSweepDebounce();

  // Deliberately not routed through `setEmotion`
  //never reaches localStorage
  const shown = poked ? { ...outfit, emotion: POKE_EMOTE } : outfit;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    release.current?.();
  }, []);

  const poke = () => {
    setPoked(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPoked(false), POKE_MS);
  };

  // the release has to come off the window rather than off this element
  //
  // the anchor above us captures the pointer on the way down, so every later
  // event for it targets the anchor, and events only bubble up from their
  // target. an onPointerUp here would never run
  const press = (e: React.PointerEvent) => {
    const from = { x: e.clientX, y: e.clientY };
    release.current?.();
    const up = (ev: PointerEvent) => {
      release.current?.();
      // travelled far enough and it was a drag, not a tap
      if (Math.hypot(ev.clientX - from.x, ev.clientY - from.y) > DRAG_SLOP_PX) {
        lastTap.current = null;
        return;
      }
      // a dblclick listener can't do this. the anchor captures the pointer, so
      // click lands on the anchor and never reaches us
      const prev = lastTap.current;
      const near =
        prev && Math.hypot(ev.clientX - prev.x, ev.clientY - prev.y) <= DOUBLE_SLOP_PX;
      if (prev && near && Date.now() - prev.t <= DOUBLE_MS) {
        lastTap.current = null;
        poke();
      } else {
        lastTap.current = { t: Date.now(), x: ev.clientX, y: ev.clientY };
      }
    };
    release.current = () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      release.current = null;
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <div className={styles.stage}>
      {/* Wait for the saved outfit so we don't render, and pay for, a
          default char that is about to be replaced. */}
      {hydrated && (
        <div
          className={styles.scale}
          // Warm the hum render on dwell so the reaction is instant
          onMouseEnter={() =>
            preloader.trigger(() =>
              preloadImageUrl(
                characterRenderUrl({ ...outfit, emotion: POKE_EMOTE }),
              ),
            )
          }
          onPointerDown={press}
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
