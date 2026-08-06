'use client';
import useAvatar from '@/app/hooks/useAvatar';
import useFrameDelays from '@/app/hooks/useFrameDelays';
import { buildAvatar } from '@/lib/avatar';
import { ADJUSTMENTS } from '@/lib/fetch';
import { Outfit } from '@/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './AvatarCanvas.module.scss';

/**
 * The character, stacked from wz layers instead of fetched as one png.
 *
 * Same model as lib/avatar.ts, which scripts/avatar-spike.ts checks pixel for
 * pixel against maplestory.io
 */

/** only for a stance delays.json has nothing for */
const FRAME_MS = 280;

/**
 * The stances built to loop. Everything else plays there and back.
 *
 * wz carries no flag for this, so it comes from measuring how many pixels move
 * on each frame to frame step, including the wrap from the last frame to the
 * first. A stance built as a cycle closes on itself and its wrap is no bigger
 * than any other step. These three do: walk1 1.00x, walk2 0.99x, heal 0.87x.
 *
 * Nothing else with three or more frames comes close. stand1 wraps at 1.36x,
 * alert 1.23x, the swings and stabs 1.16 to 1.43x, and the shooting stances are
 * worst at 2.00x, 2.00x and 2.65x. Their last frame is nowhere near their
 * first, so a plain loop snaps.
 *
 * Two frame stances are not in either list on purpose. They have only one
 * distinct step, so a bounce and a loop are the same thing
 */
const CYCLES = new Set(['walk1', 'walk2', 'heal']);

/** the frame order for a stance, either a cycle or a there and back */
const sequenceFor = (stance: string, frames: number) => {
  const forward = Array.from({ length: frames }, (_, i) => i);
  if (frames < 3 || CYCLES.has(stance)) return forward;
  // the ends are not repeated, or each would be held for twice its delay
  return [...forward, ...forward.slice(1, -1).reverse()];
};

/**
 * The adjustments as a canvas filter, so a slider nudge is a redraw.
 */
const filterFor = (item: {
  hue?: number;
  saturation?: number;
  brightness?: number;
  contrast?: number;
}) => {
  const parts: string[] = [];
  if (item.hue && item.hue !== ADJUSTMENTS.hue) parts.push(`hue-rotate(${item.hue}deg)`);
  if (item.saturation != null && item.saturation !== ADJUSTMENTS.saturation) {
    parts.push(`saturate(${item.saturation})`);
  }
  if (item.brightness != null && item.brightness !== ADJUSTMENTS.brightness) {
    parts.push(`brightness(${item.brightness})`);
  }
  if (item.contrast != null && item.contrast !== ADJUSTMENTS.contrast) {
    parts.push(`contrast(${item.contrast})`);
  }
  return parts.length ? parts.join(' ') : 'none';
};

const AvatarCanvas = ({
  who,
  className,
}: {
  who: Outfit;
  /** for the picker thumbnails*/
  className?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatar = useAvatar(who, true);
  const [tick, setTick] = useState(0);
  const delays = useFrameDelays();

  // how many frames this stance has, off the body, which is the one part
  // always worn. every item agrees on the count for a given stance
  const frameCount = useMemo(() => {
    const body = avatar?.worn.find(w => w.part === 'body');
    const seq = body?.manifest.frames[who.action] ?? body?.manifest.frames.default;
    return seq?.length ?? 1;
  }, [avatar, who.action]);

  // chained timeouts rather than one interval, because every frame has its own
  // hold. stand1 sits on each for 500ms, walk1 for 180, and the attack stances
  // go 300/150/350, so an interval makes most of them wrong
  useEffect(() => {
    setTick(0);
    if (!who.animating || frameCount < 2) return;

    const held = delays?.[who.action]?.delays;
    const order = sequenceFor(who.action, frameCount);
    let timer: ReturnType<typeof setTimeout>;
    let step = 0;
    let stopped = false;

    const next = () => {
      timer = setTimeout(() => {
        if (stopped) return;
        step = (step + 1) % order.length;
        setTick(order[step]);
        next();
      }, held?.[order[step]] ?? FRAME_MS);
    };
    next();

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [who.animating, frameCount, who.action, delays]);

  const frame = who.animating ? tick : who.frame;

  const built = useMemo(() => {
    if (!avatar?.worn.length) return null;
    return buildAvatar(
      avatar.worn,
      avatar.meta.zmap,
      avatar.meta.smap,
      who.action,
      frame,
      {
        mercEars: who.mercEars,
        illiumEars: who.illiumEars,
        highFloraEars: who.highFloraEars,
      },
    );
  }, [avatar, who.action, frame, who.mercEars, who.illiumEars, who.highFloraEars]);

  // adjustments by item id, so a redraw picks them up without rebuilding
  const tweaks = useMemo(() => {
    const out: Record<number, { filter: string; alpha: number }> = {};
    for (const item of Object.values(who.selectedItems)) {
      if (!item) continue;
      out[item.id] = {
        filter: filterFor(item),
        alpha: item.alpha != null ? item.alpha : ADJUSTMENTS.alpha,
      };
    }
    return out;
  }, [who.selectedItems]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !avatar || !built) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    for (const p of built.placed) {
      const sheet = avatar.images.get(p.sheet);
      if (!sheet) continue;
      const t = tweaks[p.item];
      ctx.globalAlpha = t?.alpha ?? 1;
      ctx.filter = t?.filter ?? 'none';
      // the layer is a rect inside the item's packed sheet
      ctx.drawImage(
        sheet,
        p.sx, p.sy, p.w, p.h,
        p.x - built.bounds.l, p.y - built.bounds.t, p.w, p.h,
      );
    }
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  }, [avatar, built, tweaks]);

  if (!built) return null;

  return (
    <canvas
      ref={canvasRef}
      className={className ? `${styles.avatar} ${className}` : styles.avatar}
      width={Math.max(1, built.w)}
      height={Math.max(1, built.h)}
    />
  );
};

export default AvatarCanvas;
