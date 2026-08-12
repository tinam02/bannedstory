'use client';
import { useEffect, useRef } from 'react';
import { Emitter, ParticleField } from './particles';
import type { MapParticles, Rect } from './particles';
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
  /**
   * Which sets to draw.
   *
   * A map can hold more than one state of itself. Temple of Tears carries a
   * clean set and a polluted one, and only the polluted backs were captured, so
   * drawing both would put clean water over a corrupted map. Unset draws
   * everything, which is right for a map with one state
   */
  tags?: string[];
};

const ParticleLayer = ({ data, asset, origin, space, view, tags }: Props) => {
  const ref = useRef<HTMLCanvasElement>(null);

  // a mirror, so panning and zooming change what gets drawn without tearing
  // down the field and starting the simulation over
  const viewRef = useRef(view);
  viewRef.current = view;

  // one effect for the whole life of the field: it loads textures, builds the
  // emitters and runs the clock. splitting it would mean holding the field in
  // state and rebuilding it on every unrelated render
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let stale = false;

    const wanted = data.instances.filter(i => {
      if (!tags?.length) return true;
      const own = (i.tags ?? '').trim();
      // an instance with no tag belongs to every state
      if (!own) return true;
      return own.split(/[\s,]+/).some(t => tags.includes(t));
    });

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

        field.warm(WARM_SECONDS);
        field.paint(ctx, space.w, space.h, RESOLUTION, viewRef.current);

        // a still picture of a warmed field, for anyone who asked not to be
        // moved. same call the css keyframes answer for the drifting backs
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let last = performance.now();
        const tick = (now: number) => {
          field.step((now - last) / 1000);
          last = now;
          field.paint(ctx, space.w, space.h, RESOLUTION, viewRef.current);
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
  return (
    <canvas
      ref={ref}
      className={styles.particles}
      width={Math.ceil(space.w * RESOLUTION)}
      height={Math.ceil(space.h * RESOLUTION)}
      style={{ width: space.w, height: space.h }}
    />
  );
};

export default ParticleLayer;
