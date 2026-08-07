'use client';
import useAvatar from '@/app/hooks/useAvatar';
import useFrameDelays, { FrameDelays } from '@/app/hooks/useFrameDelays';
import { buildAvatar } from '@/lib/avatar';
import { FRAME_MS, sequenceFor, timeline } from '@/lib/clock';
import { boxFor, drawAvatar, mergeBoxes } from '@/lib/draw';
import { effectDelays, placeEffects, type WornEffect } from '@/lib/effects';
import { ADJUSTMENTS } from '@/lib/fetch';
import { Outfit } from '@/types';
import { buildApng } from '@/lib/apng';
import { buildGif } from '@/lib/gif';
import { canvasToPngBytes, scaleUp } from '@/lib/snapshot';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import styles from './AvatarCanvas.module.scss';

/**
 * The character, stacked from wz layers instead of fetched as one png.
 *
 * Same model as lib/avatar.ts, which scripts/avatar-spike.ts checks pixel for
 * pixel against maplestory.io
 */

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

/** blink waits between plays instead of looping */
const BLINK = 'blink';

// an exported blink closes on the body's loop, so a short stance would blink
// far too often. these bound how far the body is repeated to avoid it
const MIN_BLINK_GAP_MS = 1500;
const MAX_LAPS = 4;

/**
 * Advances one animation, holding each frame for its own delay.
 *
 * Chained timeouts rather than an interval, since the frames are not evenly
 * timed. The body and the face each get one of these, which is the point: they
 * run independently.
 *
 * `rest` is for blinking, and ONLY for blinking. Eyes are open nearly all the
 * time and a blink is a quick flurry at an irregular interval
 *
 * Every other expression is a plain loop
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
      // the blink frames themselves run on wz timing, 60ms each.
      //
      // falling back to the first delay rather than to a constant, because
      // face-delays.json often carries fewer delays than the face has frames,
      // `cry` being [180] against a three frame cry. every entry in it is
      // evenly timed, so frame 0's delay is the right guess for the others
      if (!rest || frame !== 0) {
        return held?.[frame] ?? held?.[0] ?? (rest ? BLINK_MS : FRAME_MS);
      }
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

/** what Char reaches for when someone asks for a picture */
export type AvatarHandle = {
  /** exactly what is on screen, scaled up */
  still: (scale: number) => HTMLCanvasElement | null;
  /**
   * One clean pass of the stance.
   *
   * `background` is only meaningful for gif, whose alpha is one bit: a colour
   * composites the soft pixels onto it, null keeps them transparent and lets
   * the encoder round them off
   */
  animation: (
    scale: number,
    format: 'apng' | 'gif',
    background?: string | null,
  ) => Promise<Blob | null>;
  /** whether an animation would be more than one frame */
  animatable: () => boolean;
};

const AvatarCanvas = forwardRef<AvatarHandle, {
  who: Outfit;
  /** for the picker thumbnails*/
  className?: string;
  /**
   * Off for the thumbnails.
   *
   * An effect is huge, so a winged cape would shrink the character to nothing in a pose picker
   */
  effects?: boolean;
}>(({ who, className, effects = true }, ref) => {
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

  // only blink rests
  useFrameClock(
    who.animating,
    who.emotion,
    faceCount,
    faceDelays,
    setFaceTick,
    who.emotion === BLINK,
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
    const b = boxFor(built.bounds, placedEffects);
    return {
      ...b,
      pad: {
        l: built.bounds.l - b.l,
        t: built.bounds.t - b.t,
        r: b.l + b.w - built.bounds.r,
        b: b.t + b.h - built.bounds.b,
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
    drawAvatar(ctx, built.placed, placedEffects, box, avatar.images, tweaks);
  }, [avatar, built, box, placedEffects, tweaks]);

  /**
   * The picture and the animation, for whoever holds the ref.
   *
   * Here rather than in a helper because everything it needs is already in
   * this component: the loaded sheets, the adjustments, the bounds and the
   * same draw call the screen uses
   */
  useImperativeHandle(
    ref,
    () => ({
      animatable: () =>
        frameCount > 1 || wornEffects.some(e => effectDelays(e).length > 1),

      // straight off the live canvas, so it is the pose and the frame they
      // were actually looking at rather than a rebuild that might differ
      still: (scale: number) => {
        const c = canvasRef.current;
        return c ? scaleUp(c, scale) : null;
      },

      animation: async (
        scale: number,
        format: 'apng' | 'gif' = 'apng',
        background: string | null = null,
      ) => {
        if (!avatar) return null;
        const seq = sequenceFor(who.action, frameCount);
        const held = delays?.[who.action]?.delays;
        const lap = seq.map(f => held?.[f] ?? FRAME_MS);
        const lapMs = lap.reduce((a, b) => a + b, 0);

        // how many times round the body before the loop closes.
        //
        // one, unless blinking. the blink rests for whatever the body has left
        // over, and walk1 is a 720ms lap, so one blink a lap is a blink every
        // three quarters of a second. going round a few times gives it a gap
        // to sit in and still closes on both clocks
        const laps =
          who.emotion === BLINK && lapMs > 0 && lapMs < MIN_BLINK_GAP_MS
            ? Math.min(MAX_LAPS, Math.ceil(MIN_BLINK_GAP_MS / lapMs))
            : 1;
        const order: number[] = [];
        const bodyMs: number[] = [];
        for (let i = 0; i < laps; i++) {
          order.push(...seq);
          bodyMs.push(...lap);
        }
        const total = lapMs * laps;

        // the face runs its own loop, the same as it does on screen
        const faceOrder = sequenceFor(who.emotion, faceCount);
        const faceHeld = faceDelays?.[who.emotion]?.delays;
        const faceMs = faceOrder.map(
          f => faceHeld?.[f] ?? faceHeld?.[0] ?? BLINK_MS,
        );
        // blink is the one that cannot be copied straight off the screen,
        // where it waits a random 1.4 to 5.6 seconds between flurries. baked
        // into something that repeats forever, random is just wrong twice.
        // so it rests for exactly what is left of the body's loop, which
        // comes out as one blink per lap and closes cleanly
        if (who.emotion === BLINK && faceMs.length > 1) {
          const flurry = faceMs.slice(1).reduce((a, b) => a + b, 0);
          faceMs[0] = Math.max(BLINK_MS, total - flurry);
        }

        const steps = timeline(
          order, bodyMs, faceMs, wornEffects.map(effectDelays),
        );

        const opts = {
          mercEars: who.mercEars,
          illiumEars: who.illiumEars,
          highFloraEars: who.highFloraEars,
        };

        const frames = steps.map(st => {
          // the face carries its own frame on the worn item, which is how
          // buildAvatar keeps one frame index for everything else
          const worn = avatar.worn.map(w =>
            w.part === 'face' ? { ...w, frame: faceOrder[st.face] ?? 0 } : w,
          );
          const b = buildAvatar(
            worn, avatar.meta.zmap, avatar.meta.smap, who.action, st.body, opts,
          );
          const fx = placeEffects(b.placed, wornEffects, who.action, st.effects);
          return { b, fx, box: boxFor(b.bounds, fx) };
        });
        if (!frames.length) return null;

        // one box for the whole animation. sized per frame, the character
        // would swim about inside its own picture
        const shared = mergeBoxes(frames.map(f => f.box));
        const off = document.createElement('canvas');
        off.width = Math.max(1, shared.w * scale);
        off.height = Math.max(1, shared.h * scale);
        const ctx = off.getContext('2d');
        if (!ctx) return null;

        const ms = steps.map(st => st.ms);

        if (format === 'gif') {
          const shots: Uint8ClampedArray[] = [];
          for (const f of frames) {
            drawAvatar(
              ctx, f.b.placed, f.fx, shared, avatar.images, tweaks, scale, background,
            );
            shots.push(ctx.getImageData(0, 0, off.width, off.height).data);
          }
          return buildGif(
            shots, off.width, off.height, ms, background ? 'matte' : 'cut',
          );
        }

        const pngs: Uint8Array[] = [];
        for (const f of frames) {
          drawAvatar(ctx, f.b.placed, f.fx, shared, avatar.images, tweaks, scale);
          pngs.push(await canvasToPngBytes(off));
        }
        return buildApng(pngs, ms);
      },
    }),
    [avatar, who, frameCount, delays, faceCount, faceDelays, wornEffects, tweaks],
  );

  if (!built || !box) return null;

  /**
   * The body origin's offset, as a share of the canvas.
   *
   * so weapons and capes dont stay anchored while body moves back and forth
   */
  const anchor = {
    x: (100 * (built.bounds.l + built.bounds.r)) / (2 * Math.max(1, box.w)),
    y: (100 * built.bounds.b) / Math.max(1, box.h),
  };

  return (
    <canvas
      ref={canvasRef}
      className={className ? `${styles.avatar} ${className}` : styles.avatar}
      style={{
        // stand on the origin, not on the middle of the bounding box.
        //
        // percentages rather than pixels because the thumbnails size the
        // canvas in css, and a percentage is of the rendered width. scaleX
        // last, so the flip happens first and the offset is measured in the
        // unmirrored frame
        transform:
          `translate(${(who.flipX ? -1 : 1) * anchor.x}%, ${anchor.y}%)` +
          (who.flipX ? ' scaleX(-1)' : ''),
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
});

AvatarCanvas.displayName = 'AvatarCanvas';

export default AvatarCanvas;
