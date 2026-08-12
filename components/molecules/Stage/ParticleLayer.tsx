'use client';
import { useEffect, useRef } from 'react';
import { Emitter, ParticleField } from './particles';
import type { MapParticles, Rect } from './particles';
import { inState } from './useMapLayers';
import styles from './Stage.module.scss';

/**
 * The map's particle emitters, on one canvas.
 *
 * Every other layer is an element, because every other layer is a picture that
 * sits somewhere. Particles are a simulation: a couple of thousand sprites that
 * each move, spin, fade and change colour every frame, which is a canvas or it
 * is nothing.
 *
 * The canvas is the plate's size and sits inside the same unscaled box the
 * sprites do, so a particle's plate pixel is a sprite's plate pixel and zoom is
 * handled once, by the transform on .plates.
 */

// long enough that a slow emitter has filled the scene before the first paint,
// short enough not to be felt when a map opens. anything living longer than
// this is still fading in, which is what it would be doing anyway
const WARM_SECONDS = 6;

/**
 * Canvas pixels a plate pixel.
 *
 * Particles are the one layer that can be drawn short and not be missed. Temple
 * of Tears asks for 54 megapixels of blending a frame, forty times the plate's
 * own area, because a dozen of its emitters throw 600px quads around and the
 * pile of them is the whole point. Nothing in that pile has an edge: it is
 * smoke, steam, sunshafts and glitter, so halving the resolution takes three
 * quarters of the work off and leaves a picture that is hard to tell apart.
 *
 * The map's sprites keep their own full resolution. This is only the canvas.
 */
const RESOLUTION = 0.5;

/**
 * How slow a frame has to get before the layer stands down, as the gap between
 * frames rather than the time spent drawing one.
 *
 * On any machine with a working GPU this layer is free: frame times come out
 * identical with it and without it, because a couple of hundred blended quads
 * at half resolution is nothing to a graphics card. On a machine with no
 * acceleration at all it costs about 17ms, which halves the frame rate of the
 * whole page, closet and all.
 *
 * So rather than making it static for everyone, it watches and stops where it
 * is expensive. What is left is the last frame it drew, which is a warmed field
 * and looks like a picture of the map rather than an empty one.
 *
 * It has to be the gap and not the drawing, because a canvas hands its work off
 * and returns: timing draw() said under a millisecond on the machine that was
 * taking 33. This threshold is a little under 36fps, so a healthy 60Hz page at
 * 16.7ms is nowhere near it.
 */
const SLOW_FRAME_MS = 28;

// a gap this long was not a slow frame, it was the tab sitting in the
// background, where rAF is throttled to about one a second. counting those
// would stand the layer down for the rest of the session over nothing
const STALL_MS = 100;

// the first frames bake a tinted copy of every texture, so they say nothing
// about what a steady frame costs. after that, a second or so to judge by
const SETTLE_FRAMES = 30;
const BUDGET_FRAMES = 90;

// an emitter with no texture, or one that never loads, is skipped rather than
// left to draw nothing at a cost
const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

type Props = {
  data: MapParticles;
  /** turns a dumped file name into a url, extension swap and all */
  asset: (file: string) => string;
  /** the plate's top left in map coordinates */
  origin: { l: number; t: number };
  space: { w: number; h: number };
  /** what the frame can see, in plate pixels. anything outside is not drawn */
  view: Rect;
  /** which state of the map to run, see inState. unset runs everything */
  tags?: string[];
};

const ParticleLayer = ({ data, asset, origin, space, view, tags }: Props) => {
  // two canvases, one composited over the map and one added to it, see
  // ParticleField.paint
  const paintRef = useRef<HTMLCanvasElement>(null);
  const lightRef = useRef<HTMLCanvasElement>(null);

  // a mirror, so panning and zooming change what gets drawn without tearing
  // down the field and starting the simulation over
  const viewRef = useRef(view);
  viewRef.current = view;

  // one effect for the whole life of the field: it loads textures, builds the
  // emitters and runs the clock. splitting it would mean holding the field in
  // state and rebuilding it on every unrelated render
  useEffect(() => {
    const paintCtx = paintRef.current?.getContext('2d');
    const lightCtx = lightRef.current?.getContext('2d');
    if (!paintCtx || !lightCtx) return;

    let frame = 0;
    let stale = false;

    const wanted = data.instances.filter(i => inState(i.tags, tags));

    // one load a definition, however many times the map places it
    const names = Object.keys(data.defs).filter(
      n => data.defs[n].texture && wanted.some(i => i.name === n),
    );

    Promise.all(names.map(n => loadImage(asset(`layers/${data.defs[n].texture}`)))).then(
      images => {
        if (stale) return;
        const tex = new Map<string, HTMLImageElement>();
        names.forEach((n, i) => {
          const img = images[i];
          if (img) tex.set(n, img);
        });

        const field = new ParticleField(
          wanted
            .filter(i => tex.has(i.name))
            .map(
              i =>
                new Emitter(
                  data.defs[i.name],
                  // wz coordinates go to plate pixels the same way every sprite
                  // does. rx/ry are -100 on every emitter seen, meaning pinned
                  // to the map, so there is no parallax shift to apply
                  { ...i, x: (i.x ?? 0) - origin.l, y: (i.y ?? 0) - origin.t },
                  tex.get(i.name)!,
                ),
            ),
        );

        const draw = () => {
          const at = viewRef.current;
          if (field.has(false))
            field.paint(paintCtx, space.w, space.h, RESOLUTION, at, false);
          if (field.has(true))
            field.paint(lightCtx, space.w, space.h, RESOLUTION, at, true);
        };

        field.warm(WARM_SECONDS);
        draw();

        // a still picture of a warmed field, for anyone who asked not to be
        // moved. same call the css keyframes answer for the drifting backs
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let last = performance.now();
        let seen = 0;
        let judged = 0;
        let gaps = 0;
        const tick = (now: number) => {
          const gap = now - last;
          field.step(gap / 1000);
          last = now;
          draw();
          seen++;

          if (seen > SETTLE_FRAMES && gap < STALL_MS) {
            gaps += gap;
            judged++;
            // a whole window of frames too slow, so leave the last one up
            // rather than spend the rest of the page's frame rate on it
            if (judged === BUDGET_FRAMES && gaps / judged > SLOW_FRAME_MS) return;
          }

          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
    );

    return () => {
      stale = true;
      cancelAnimationFrame(frame);
    };
  }, [data, asset, origin.l, origin.t, space.w, space.h, tags]);

  // the backing store is short and css stretches it back to the plate's size,
  // so everything else on the Stage still lines up in plate pixels
  const size = {
    width: Math.ceil(space.w * RESOLUTION),
    height: Math.ceil(space.h * RESOLUTION),
    style: { width: space.w, height: space.h },
  };
  return (
    <>
      <canvas ref={paintRef} className={styles.particles} {...size} />
      <canvas
        ref={lightRef}
        className={`${styles.particles} ${styles.light}`}
        {...size}
      />
    </>
  );
};

export default ParticleLayer;
