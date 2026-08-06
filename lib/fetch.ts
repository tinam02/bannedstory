/**
 * old api layer
 *
 * REGION and VERSION are kept because they are part of an item's identity in
 * the interchange format other simulators import and export
 *
 * scripts/avatar-spike.ts still calls their api on purpose. It is the only
 * check that our compositing matches the real thing, and it builds its own urls
 */

export const REGION = 'GMS';
export const VERSION = '265';

// Adjustments the renderer understands, with the value that means "no change".
// Anything sitting at its neutral value is skipped rather than applied.
export const ADJUSTMENTS = {
  hue: 0,
  saturation: 1,
  brightness: 1,
  contrast: 1,
  alpha: 1,
} as const;

export type AdjustmentKey = keyof typeof ADJUSTMENTS;

/** Fire-and-forget: kick off a load to populate the browser cache. */
export const preloadImageUrl = (url: string) => {
  if (typeof window === 'undefined' || !url) return;
  const img = new window.Image();
  img.src = url;
};
