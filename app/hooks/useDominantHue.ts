'use client';
import { useEffect, useState } from 'react';

// 10 degrees per bin
const BINS = 36;
const BIN_WIDTH = 360 / BINS;
const MIN_ALPHA = 128;
// Near-greys and near-blacks have a hue, but a meaningless one
const MIN_SATURATION = 0.15;
const MIN_VALUE = 0.15;

// Resolved hues, so a second look is free and — crucially — *synchronous*.
// Without this the hook would always mount at null and repaint a frame later, which is the flash of default spectrum on first open
const resolved = new Map<string, number | null>();
// In-flight loads, so warming a row and opening its popover don't both decode
const pending = new Map<string, Promise<number | null>>();

/** The dominant hue of already-decoded pixels, or null if there is no colour. */
function analyse(data: Uint8ClampedArray): number | null {
  // Weight each pixel by saturation * value, so a few vivid pixels beat a
  // large washed-out area — that matches what the eye calls "the colour".
  const weight = new Array(BINS).fill(0);
  const sin = new Array(BINS).fill(0);
  const cos = new Array(BINS).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < MIN_ALPHA) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    if (delta === 0) continue;

    const value = max / 255;
    const saturation = delta / max;
    if (saturation < MIN_SATURATION || value < MIN_VALUE) continue;

    let h: number;
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;

    const w = saturation * value;
    const bin = Math.floor(h / BIN_WIDTH) % BINS;
    const rad = (h * Math.PI) / 180;
    weight[bin] += w;
    sin[bin] += Math.sin(rad) * w;
    cos[bin] += Math.cos(rad) * w;
  }

  let best = -1;
  let bestWeight = 0;
  for (let i = 0; i < BINS; i += 1) {
    if (weight[i] > bestWeight) {
      bestWeight = weight[i];
      best = i;
    }
  }
  if (best < 0) return null; // no coloured pixels

  // Average across the winning bin and its neighbours
  let sinSum = 0;
  let cosSum = 0;
  for (const offset of [-1, 0, 1]) {
    const i = (best + offset + BINS) % BINS;
    sinSum += sin[i];
    cosSum += cos[i];
  }
  const deg = (Math.atan2(sinSum, cosSum) * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

/**
 * Sample an image's dominant hue, caching the result.
 *
 * Safe to call for an item you only *might* need — it dedupes in flight and
 * never throws. Call it as soon as an item is on screen so the value is ready
 * before anything needs to paint with it.
 */
export type IconRect = { x: number; y: number; w: number; h: number };

/** cache key, since one packed sheet holds 1000s of different items */
const keyFor = (url: string, rect?: IconRect | null) =>
  rect ? `${url}#${rect.x},${rect.y},${rect.w},${rect.h}` : url;

export function warmDominantHue(
  url: string,
  rect?: IconRect | null,
): Promise<number | null> {
  const key = keyFor(url, rect);
  const done = resolved.get(key);
  if (done !== undefined) return Promise.resolve(done);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const load = new Promise<number | null>(resolve => {
    const img = new window.Image();
    // the sheets are same origin now, so this is belt and braces rather than
    // load bearing. left on because getImageData throws on a tainted canvas and
    // that failure is silent enough to be worth never risking
    img.crossOrigin = 'anonymous';

    const finish = (hue: number | null) => {
      resolved.set(key, hue);
      pending.delete(key);
      resolve(hue);
    };

    img.onload = () => {
      try {
        // a rect means the url is a packed sheet
        // and only this item's tile should be sampled. reading the whole sheet would average every hat in the game together
        const w = rect ? rect.w : img.naturalWidth;
        const h = rect ? rect.h : img.naturalHeight;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        if (!w || !h) return finish(null);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return finish(null);
        ctx.drawImage(img, rect ? -rect.x : 0, rect ? -rect.y : 0);
        finish(analyse(ctx.getImageData(0, 0, w, h).data));
      } catch {
        // Unreadable canvas — callers fall back to a plain spectrum.
        finish(null);
      }
    };
    // A 500 from the icon endpoint is not rare; cache the miss so we don't
    // retry it on every open.
    img.onerror = () => finish(null);
    img.src = url;
  });

  pending.set(key, load);
  return load;
}

/**
 * The dominant hue of an image, in degrees, or null if it has no meaningful
 * colour (a white/black/grey item) or could not be read.
 *
 * Used to anchor the hue slider's gradient: the API's `hue` is a *rotation*
 * applied to the sprite's existing colours, so a gradient that starts at red is
 * a lie for anything that isn't already red. Starting it at the item's own hue
 * makes the track show what you'll actually get.
 *
 * Returns a warmed value on the very first render, with no repaint — see
 * `warmDominantHue`.
 */
export function useDominantHue(url: string | null, rect?: IconRect | null) {
  const [hue, setHue] = useState<number | null>(() =>
    url ? (resolved.get(keyFor(url, rect)) ?? null) : null,
  );

  // rect is spread into primitives, or a fresh object literal from the caller
  // would re-run this on every render
  const rx = rect?.x;
  const ry = rect?.y;
  const rw = rect?.w;
  const rh = rect?.h;

  useEffect(() => {
    if (!url) {
      setHue(null);
      return;
    }
    const r =
      rx != null && ry != null && rw != null && rh != null
        ? { x: rx, y: ry, w: rw, h: rh }
        : null;
    const known = resolved.get(keyFor(url, r));
    if (known !== undefined) {
      setHue(known);
      return;
    }
    let cancelled = false;
    warmDominantHue(url, r).then(value => {
      if (!cancelled) setHue(value);
    });
    return () => {
      cancelled = true;
    };
  }, [url, rx, ry, rw, rh]);

  return hue;
}
