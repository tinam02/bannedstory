'use client';
import { useEffect, useState } from 'react';

// 10 degrees per bin
const BINS = 36;
const BIN_WIDTH = 360 / BINS;
const MIN_ALPHA = 128;
// Near-greys and near-blacks have a hue, but a meaningless one
const MIN_SATURATION = 0.15;
const MIN_VALUE = 0.15;

/**
 * The dominant hue of an image, in degrees, or null if it has no meaningful
 * colour (a white/black/grey item) or could not be read.
 *
 * Used to anchor the hue slider's gradient: the API's `hue` is a *rotation*
 * applied to the sprite's existing colours, so a gradient that starts at red is
 * a lie for anything that isn't already red. Starting it at the item's own hue
 * makes the track show what you'll actually get
 */
export function useDominantHue(url: string | null) {
  const [hue, setHue] = useState<number | null>(null);

  useEffect(() => {
    if (!url) {
      setHue(null);
      return;
    }
    let cancelled = false;
    setHue(null);

    const img = new window.Image();
    // maplestory.io serves `Access-Control-Allow-Origin: *`, so the canvas
    // stays readable — without this, getImageData would throw on a tainted one.
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        if (!canvas.width || !canvas.height) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

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
        if (best < 0) return; // no coloured pixels — stays null

        // Average across the winning bin and its neighbours, so a colour
        // sitting on a bin boundary isn't quantised to the edge.
        let sinSum = 0;
        let cosSum = 0;
        for (const offset of [-1, 0, 1]) {
          const i = (best + offset + BINS) % BINS;
          sinSum += sin[i];
          cosSum += cos[i];
        }
        const deg = (Math.atan2(sinSum, cosSum) * 180) / Math.PI;
        if (!cancelled) setHue(((deg % 360) + 360) % 360);
      } catch {
        // Unreadable canvas — the caller falls back to a plain spectrum.
      }
    };

    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);

  return hue;
}
