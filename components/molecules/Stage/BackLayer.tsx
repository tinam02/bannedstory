'use client';
import { useMemo, useState, type CSSProperties } from 'react';
import {
  scrollsH,
  scrollsV,
  speedH,
  speedV,
  stepH,
  stepV,
  tilesH,
  tilesV,
  type MapSprite,
} from './useMapLayers';
import styles from './Stage.module.scss';

/**
 * One `back` entry: the sky, and everything else behind the map.
 *
 * wz describes these with four fields and they have to be read together.
 * `type` says which axes tile and which one moves, `cx`/`cy` are how far apart
 * the copies sit, and on a moving layer `rx`/`ry` stop being parallax rates and
 * become the speed. This map is the whole vocabulary at once: a 50x50 tile
 * repeated both ways for the blue, a band tiled across for the haze, seven
 * cloud layers tiling and drifting sideways at seven speeds, and one animated
 * sprite tiling and drifting up.
 *
 * Three ways of drawing, and the step is what picks between the first two.
 *
 * A still layer whose step is its own size is one element with
 * background-repeat, so the blue sky costs a single div rather than the 384
 * images a 50px tile over this plate would be. The anchor decides the phase,
 * not the position, since the tiling covers everything anyway.
 *
 * A still layer with a step of its own is real copies. background-repeat can
 * only repeat one background-size apart, so it cannot leave a gap between the
 * copies or overlap them, and both are things wz asks for.
 *
 * Moving layers are a strip of copies one step apart, slid by exactly one step
 * and repeated. background-repeat cannot do those: the step is not the sprite
 * width, this map spacing a 287px cloud every 900px, and no combination of
 * background-size and repeat leaves that gap without stretching the art. The
 * strip ends where it began, so the loop is seamless, and CSS runs it, so it
 * costs no renders.
 */
const BackLayer = ({
  sprite,
  src,
  origin,
  space,
}: {
  // dx/dy is the parallax shift MapRender baked into the plate, which the
  // Stage works out from the camera. zero on a map captured without one
  sprite: MapSprite & { dx?: number; dy?: number };
  src: string;
  /** the plate's top left in map coordinates, usually the vr corner */
  origin: { l: number; t: number };
  /** the plate, which is the area that has to stay covered */
  space: { w: number; h: number };
}) => {
  // a layer whose art never arrived should be nothing, not a row of broken
  // image outlines marching across the sky
  const [broken, setBroken] = useState(false);

  const moveX = scrollsH(sprite);
  const moveY = scrollsV(sprite);
  const tileX = tilesH(sprite);
  const tileY = tilesV(sprite);
  const stepX = stepH(sprite);
  const stepY = stepV(sprite);

  // the sprite's own anchor, in plate pixels. on a tiled axis this only sets
  // the phase, since the copies cover everything either way
  const left =
    sprite.x +
    (sprite.f ? -sprite.ox - sprite.w : sprite.ox) +
    (sprite.dx ?? 0) -
    origin.l;
  const top = sprite.y + sprite.oy + (sprite.dy ?? 0) - origin.t;

  // where in the repeat the anchor falls, so a tiled layer lines up with the
  // capture instead of starting at the plate corner
  const phase = (at: number, step: number) => ((at % step) + step) % step;

  // every copy's position on one axis, in plate pixels, starting one step early
  // so the plate corner is covered
  const spread = (at: number, step: number, span: number) => {
    const first = phase(at, step) - step;
    return Array.from(
      { length: Math.ceil((span - first) / step) + 1 },
      (_, i) => first + i * step,
    );
  };

  const copies = useMemo(() => {
    if (!moveX && !moveY) return [];
    const step = moveX ? stepX : stepY;
    const span = moveX ? space.w : space.h;
    return Array.from(
      { length: Math.ceil(span / Math.max(1, step)) + 2 },
      (_, i) => i,
    );
  }, [moveX, moveY, stepX, stepY, space.w, space.h]);

  if (broken) return null;

  const tile: CSSProperties = {
    backgroundImage: `url(${src})`,
    backgroundSize: `${sprite.w}px ${sprite.h}px`,
    imageRendering: 'pixelated',
    ...(sprite.a !== undefined && sprite.a < 255
      ? { opacity: sprite.a / 255 }
      : null),
  };

  // ---- still ---------------------------------------------------------------

  if (!moveX && !moveY) {
    // nothing tiles, so it is a single image and the plain path is right
    if (!tileX && !tileY) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.sprite}
          src={src}
          alt=''
          draggable={false}
          onError={() => setBroken(true)}
          style={{
            left,
            top,
            width: sprite.w,
            height: sprite.h,
            transform: sprite.f ? 'scaleX(-1)' : undefined,
            ...(sprite.a !== undefined && sprite.a < 255
              ? { opacity: sprite.a / 255 }
              : null),
          }}
        />
      );
    }
    // wz spaces the copies by cx/cy and that is not always the sprite size.
    // background-repeat can only step by the background size, so anything else
    // has to be drawn. this map's sky is the reason: a soft 479px band laid
    // down every 100px, the copies overlapping into one solid colour, where
    // repeating it every 479px left a transparent seam at each junction
    const stepsX = tileX && stepX !== sprite.w;
    const stepsY = tileY && stepY !== sprite.h;
    const xs =
      stepsX || stepsY ? (tileX ? spread(left, stepX, space.w) : [left]) : [];
    const ys =
      stepsX || stepsY ? (tileY ? spread(top, stepY, space.h) : [top]) : [];
    // a tiny step over a big plate runs into the thousands, and no backdrop is
    // worth that many elements. those fall through to the cheap repeat
    if (xs.length * ys.length > 0 && xs.length * ys.length <= 600) {
      return (
        <div
          className={styles.tiled}
          style={{
            left: 0,
            top: 0,
            width: space.w,
            height: space.h,
            overflow: 'hidden',
          }}
        >
          {xs.map(x =>
            ys.map(y => (
              <div
                key={`${x},${y}`}
                className={styles.tiled}
                style={{
                  ...tile,
                  left: x,
                  top: y,
                  width: sprite.w,
                  height: sprite.h,
                  backgroundRepeat: 'no-repeat',
                  transform: sprite.f ? 'scaleX(-1)' : undefined,
                }}
              />
            )),
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt='' hidden onError={() => setBroken(true)} />
        </div>
      );
    }
    return (
      <div
        className={styles.tiled}
        style={{
          ...tile,
          left: tileX ? 0 : left,
          top: tileY ? 0 : top,
          width: tileX ? space.w : sprite.w,
          height: tileY ? space.h : sprite.h,
          backgroundRepeat:
            tileX && tileY ? 'repeat' : tileX ? 'repeat-x' : 'repeat-y',
          backgroundPositionX: tileX ? `${phase(left, stepX) - stepX}px` : 0,
          backgroundPositionY: tileY ? `${phase(top, stepY) - stepY}px` : 0,
        }}
      />
    );
  }

  // ---- drifting ------------------------------------------------------------

  const step = moveX ? stepX : stepY;
  const speed = Math.abs(moveX ? speedH(sprite) : speedV(sprite));
  const seconds = speed > 0 ? step / speed : 0;

  return (
    <div
      className={moveX ? styles.driftX : styles.driftY}
      style={
        {
          left: moveX ? left - stepX : tileX ? 0 : left,
          top: moveY ? top - stepY : tileY ? 0 : top,
          '--step': `${step}px`,
          animationDuration: seconds > 0 ? `${seconds}s` : '0s',
        } as CSSProperties
      }
    >
      {copies.map(i => (
        <div
          key={i}
          className={styles.tiled}
          style={{
            ...tile,
            left: moveX ? i * stepX : 0,
            top: moveY ? i * stepY : 0,
            // the axis it is not travelling on still tiles if wz says so
            width: moveX ? sprite.w : space.w,
            height: moveY ? sprite.h : space.h,
            backgroundRepeat: moveX
              ? tileY
                ? 'repeat-y'
                : 'no-repeat'
              : tileX
                ? 'repeat-x'
                : 'no-repeat',
            transform: sprite.f ? 'scaleX(-1)' : undefined,
          }}
        />
      ))}
      {/* one probe, so a missing file hides the layer instead of tiling a
          broken image across the sky */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt='' hidden onError={() => setBroken(true)} />
    </div>
  );
};

export default BackLayer;
