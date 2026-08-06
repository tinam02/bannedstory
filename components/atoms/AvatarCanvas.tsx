'use client';
import useAvatar from '@/app/hooks/useAvatar';
import { buildAvatar } from '@/lib/avatar';
import { ADJUSTMENTS } from '@/lib/fetch';
import { Outfit } from '@/types';
import { useEffect, useMemo, useRef } from 'react';
import styles from './AvatarCanvas.module.scss';

/**
 * The character, stacked from wz layers instead of fetched as one png.
 *
 * Same model as lib/avatar.ts, which scripts/avatar-spike.ts checks pixel for
 * pixel against maplestory.io
 */

/**
 * The adjustments as a canvas filter.
 *
 * These used to be query params on the render url, so every nudge of a slider
 * meant refetching a png. Doing them here is a redraw instead
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

  const built = useMemo(() => {
    if (!avatar?.worn.length) return null;
    return buildAvatar(
      avatar.worn,
      avatar.meta.zmap,
      avatar.meta.smap,
      who.action,
      who.frame,
      {
        mercEars: who.mercEars,
        illiumEars: who.illiumEars,
        highFloraEars: who.highFloraEars,
      },
    );
  }, [avatar, who.action, who.frame, who.mercEars, who.illiumEars, who.highFloraEars]);

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
