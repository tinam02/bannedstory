'use client';
import { useCallback, useRef } from 'react';

// Cursor must dwell on the same target for this long before the preload fires.
// Sweeps cancel the timer before this elapses, so they produce zero requests.
const DWELL_MS = 300;

export const useSweepDebounce = () => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback((fn: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fn();
      timer.current = null;
    }, DWELL_MS);
  }, []);

  return { trigger };
};
