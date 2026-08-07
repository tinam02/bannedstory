'use client';
import useAvatar from '@/app/hooks/useAvatar';
import useFrameDelays, { FrameDelays } from '@/app/hooks/useFrameDelays';
import { buildAvatar } from '@/lib/avatar';
import { effectDelays, placeEffects, type WornEffect } from '@/lib/effects';
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

// how long the eyes stay open between blinks, how much that varies, and how
// often a blink comes in a pair.
//
// wz has nothing to say about any of this. face `blink` is [60,60,60], three
// frames and 180ms all in, so the file describes the blink itself and not how
// often it happens. the gap between them is the client's behaviour, and these
// are the numbers for it
const REST_MS = 3500;
const REST_JITTER = 0.6;
const DOUBLE_BLINK = 0.28;
const DOUBLE_GAP_MS = 170;

/** only if face-delays.json is missing, since wz does carry the blink speed */
const BLINK_MS = 110;

/**
 * Advances one animation, holding each frame for its own delay.
 *
 * Chained timeouts rather than an interval, since the frames are not evenly
 * timed. The body and the face each get one of these, which is the point: they
 * run independently.
 *
 * `rest` is for the face. Eyes are open nearly all the time and a blink is a
 * quick flurry at an irregular interval, so the resting frame is held far
 * longer than the rest and by a different amount each time. As an even loop it
 * reads as a twitch however slowly it is run
 */
const useFrameClock = (
  playing: boolean,
  key: string,
  frames: number,
  delays: FrameDelays | null,
  onFrame: (frame: number) => void,
  rest = false,
) => {
  useEffect(() => {
    onFrame(0);
    if (!playing || frames < 2) return;

    const held = delays?.[key]?.delays;
    const order = sequenceFor(key, frames);
    let timer: ReturnType<typeof setTimeout>;
    let step = 0;
    let stopped = false;

    // a pair, never a run. without this the short gap can be drawn again and
    // again and the character flutters
    let justDoubled = false;

    const holdFor = (frame: number) => {
      // the blink frames themselves run on wz timing, 60ms each
      if (!rest || frame !== 0) return held?.[frame] ?? (rest ? BLINK_MS : FRAME_MS);
      // frame 0 is the eyes open, and wz's 60ms for it is meaningless here.
      // mostly a long irregular wait, sometimes a short one so the blink comes
      // in a pair the way a real one does
      if (!justDoubled && Math.random() < DOUBLE_BLINK) {
        justDoubled = true;
        return DOUBLE_GAP_MS;
      }
      justDoubled = false;
      return REST_MS * (1 + (Math.random() * 2 - 1) * REST_JITTER);
    };

    const next = () => {
      timer = setTimeout(() => {
        if (stopped) return;
        step = (step + 1) % order.length;
        onFrame(order[step]);
        next();
      }, holdFor(order[step]));
    };
    next();

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
    // onFrame is a setState, stable for the life of the component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, key, frames, delays, rest]);
};

/**
 * The effects' frame indices, each on its own delays.
 *
 * Not on the body's clock
 */
const useEffectFrames = (playing: boolean, effects: WornEffect[]) => {
  const [now, setNow] = useState(0);
  const delays = useMemo(() => effects.map(effectDelays), [effects]);
  // the shape of the timing, so a pose change does not restart the animation
  const key = delays.map(d => d.join('.')).join('|');

  useEffect(() => {
    setNow(0);
    if (!playing || !delays.some(d => d.length > 1)) return;

    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    let t = 0;

    const step = () => {
      // the shortest wait until any one of them moves on
      let wait = Infinity;
      for (const d of delays) {
        const total = d.reduce((a, b) => a + b, 0);
        if (!total || d.length < 2) continue;
        let p = t % total;
        for (const ms of d) {
          if (p < ms) {
            wait = Math.min(wait, ms - p);
            break;
          }
          p -= ms;
        }
      }
      if (!isFinite(wait) || wait <= 0) return;
      timer = setTimeout(() => {
        if (stopped) return;
        t += wait;
        setNow(t);
        step();
      }, wait);
    };
    step();

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
    // delays is rebuilt every render, key is what actually changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, key]);

  return useMemo(
    () =>
      delays.map(d => {
        const total = d.reduce((a, b) => a + b, 0);
        if (!total) return 0;
        let p = now % total;
        for (let i = 0; i < d.length; i++) {
          if (p < d[i]) return i;
          p -= d[i];
        }
        return 0;
      }),
    [delays, now],
  );
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
  effects = true,
}: {
  who: Outfit;
  /** for the picker thumbnails*/
  className?: string;
  /**
   * Off for the thumbnails.
   *
   * An effect is huge, so a winged cape would shrink the character to nothing in a pose picker
   */
  effects?: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatar = useAvatar(who, true);
  const [tick, setTick] = useState(0);
  const [faceTick, setFaceTick] = useState(0);
  const delays = useFrameDelays();
  const faceDelays = useFrameDelays('face-delays.json');

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
  useFrameClock(who.animating, who.action, frameCount, delays, setTick);

  // the face keeps its own time. face `blink` is three frames and body `stand1`
  // is three, so sharing an index made the character blink exactly in step with
  // its own breathing
  const faceCount = useMemo(() => {
    const face = avatar?.worn.find(w => w.part === 'face');
    const seq =
      face?.manifest.frames[who.emotion] ?? face?.manifest.frames.default;
    return seq?.length ?? 1;
  }, [avatar, who.emotion]);

  useFrameClock(
    who.animating,
    who.emotion,
    faceCount,
    faceDelays,
    setFaceTick,
    true,
  );

  const frame = who.animating ? tick : who.frame;

  // the face's frame rides on the item, so buildAvatar keeps one frame for
  // everything else
  const wornNow = useMemo(
    () =>
      avatar?.worn.map(w =>
        w.part === 'face' ? { ...w, frame: who.animating ? faceTick : 0 } : w,
      ) ?? [],
    [avatar, faceTick, who.animating],
  );

  const built = useMemo(() => {
    if (!wornNow.length || !avatar) return null;
    return buildAvatar(
      wornNow,
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
  }, [avatar, wornNow, who.action, frame, who.mercEars, who.illiumEars, who.highFloraEars]);

  // the effects, on their own clocks and anchored by lib/effects.ts
  const wornEffects = useMemo(
    () => (effects ? (avatar?.effects ?? []) : []),
    [effects, avatar],
  );
  const eframes = useEffectFrames(who.animating, wornEffects);
  const placedEffects = useMemo(
    () => (built ? placeEffects(built.placed, wornEffects, who.action, eframes) : []),
    [built, wornEffects, who.action, eframes],
  );

  /**
   * The bbox once the effects are in it, and how far it grew.
   *
   * The canvas has to hold the effect, which is routinely 5x the
   * character's area, but the layout must not notice. `pad` is negated into
   * margins so the element still measures the character alone and the feet
   * stay where they were, the way an alpha 0 item keeps its place in the box
   */
  const box = useMemo(() => {
    if (!built) return null;
    let { l, t, r, b } = built.bounds;
    for (const e of placedEffects) {
      l = Math.min(l, e.x);
      t = Math.min(t, e.y);
      r = Math.max(r, e.x + e.w);
      b = Math.max(b, e.y + e.h);
    }
    return {
      l,
      t,
      w: r - l,
      h: b - t,
      pad: {
        l: built.bounds.l - l,
        t: built.bounds.t - t,
        r: r - built.bounds.r,
        b: b - built.bounds.b,
      },
    };
  }, [built, placedEffects]);

  // adjustments by item id, so a redraw picks them up without rebuilding
  const tweaks = useMemo(() => {
    const out: Record<number, { filter: string; alpha: number }> = {};
    for (const item of Object.values(who.selectedItems)) {
      if (!item) continue;
      out[item.id] = {
        filter: filterFor(item),
        // hidden is alpha 0 rather than dropping the item, so it still counts
        // towards the canvas bounds. otherwise hiding a hat collapses the whole
        // character upwards and everything jumps
        alpha:
          item.visible === false
            ? 0
            : item.alpha != null
              ? item.alpha
              : ADJUSTMENTS.alpha,
      };
    }
    return out;
  }, [who.selectedItems]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !avatar || !built || !box) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    // an effect belongs to its item, so hiding or fading the item takes the
    // effect with it. otherwise a hidden cape leaves its wings behind
    const drawEffects = (behind: boolean) => {
      for (const e of placedEffects) {
        if (e.z < 0 !== behind) continue;
        const sheet = avatar.images.get(e.sheet);
        if (!sheet) continue;
        const t = tweaks[e.item];
        ctx.globalAlpha = t?.alpha ?? 1;
        ctx.filter = t?.filter ?? 'none';
        ctx.drawImage(sheet, e.sx, e.sy, e.w, e.h, e.x - box.l, e.y - box.t, e.w, e.h);
      }
    };

    // z is a number per action and only its sign is honoured here. -2 and 2
    // are 81% of the set, so behind and in front covers most of it
    drawEffects(true);

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
        p.x - box.l, p.y - box.t, p.w, p.h,
      );
    }

    drawEffects(false);

    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  }, [avatar, built, box, placedEffects, tweaks]);

  if (!built || !box) return null;

  return (
    <canvas
      ref={canvasRef}
      className={className ? `${styles.avatar} ${className}` : styles.avatar}
      style={{
        // css rather than flipping every blit, so it costs nothing per frame.
        // nothing in the ui sets this yet, but an imported outfit can carry it
        ...(who.flipX ? { transform: 'scaleX(-1)' } : null),
        // the effect overhang, taken back out of the layout
        ...(box.pad.l || box.pad.t || box.pad.r || box.pad.b
          ? {
              marginLeft: -box.pad.l,
              marginTop: -box.pad.t,
              marginRight: -box.pad.r,
              marginBottom: -box.pad.b,
            }
          : null),
      }}
      width={Math.max(1, box.w)}
      height={Math.max(1, box.h)}
    />
  );
};

export default AvatarCanvas;
