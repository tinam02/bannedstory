'use client';
import { useEffect, useState } from 'react';

/**
 * How long each frame of a stance is held, in ms.
 *
 * Written by scripts/wz/dump-delays.lua off the body, which is the only item
 * worth reading: every part of a stance shares its timing or the character
 * would come apart while it played.
 *
 * The numbers are not close to uniform. stand1 holds each frame 500ms, walk1
 * 180, and the attack stances are deliberately uneven at 300/150/350, so one
 * flat value makes half of them wrong
 */

export type FrameDelays = Record<string, { delays: number[] }>;

const cache = new Map<string, Promise<FrameDelays | null>>();

const load = (file: string) => {
  let hit = cache.get(file);
  if (!hit) {
    hit = fetch(`/avatar/${file}`)
      .then(r => (r.ok ? (r.json() as Promise<FrameDelays>) : null))
      .catch(() => null);
    cache.set(file, hit);
  }
  return hit;
};

/** `delays.json` for stances, `face-delays.json` for expressions */
const useFrameDelays = (file = 'delays.json') => {
  const [delays, setDelays] = useState<FrameDelays | null>(null);

  useEffect(() => {
    let stale = false;
    load(file).then(got => {
      if (!stale) setDelays(got);
    });
    return () => {
      stale = true;
    };
  }, [file]);

  return delays;
};

export default useFrameDelays;
