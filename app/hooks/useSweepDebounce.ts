'use client';
import { useCallback, useRef } from 'react';

// Cursor must dwell on the same target for DWELL_MS
// Sweeps cancel the timer before this elapses, so they produce zero requests
const DWELL_MS = 300;

export const useSweepDebounce = () => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const trigger = useCallback((fn: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fn();
      timer.current = null;
    }, DWELL_MS);
  }, []);

  // Leaving without landing on another target should call off the pending fire
  // nothing else resets the timer once the cursor is gone
  return { trigger, cancel };
};
