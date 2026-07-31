'use client';
import { useEffect, useState } from 'react';

/**
 * Trails `value` by `delayMs`, so rapid changes (typing) settle into one update.
 *
 * Returns the debounced value plus a setter that applies one immediately,
 * for when the user signals they're done (Enter, a clear button). A timer
 * still pending after that resolves to the same value, which React bails out
 * of so skipping the wait costs no extra request
 */
export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return [debounced, setDebounced] as const;
}
