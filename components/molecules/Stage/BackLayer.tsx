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
 * Two ways of drawing, picked by whether it moves.
 *
 * Still layers are one element with background-repeat, so the blue sky costs a
 * single div rather than the 384 images a 50px tile over this plate would be.
 * The anchor decides the phase, not the position, since the tiling covers
 * everything anyway.
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
  vr,
  space,
}: {
  sprite: MapSprite;
  src: string;
  vr: { l: number; t: number; r: number; b: number };
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

  // the sprite's own anchor, in plate pixels
  const left = sprite.x + (sprite.f ? -sprite.ox - sprite.w : sprite.ox) - vr.l;
  const top = sprite.y + sprite.oy - vr.t;

  // where in the repeat the anchor falls, so a tiled layer lines up with the
  // capture instead of starting at the plate corner
  const phase = (at: number, step: number) => (((at % step) + step) % step);

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
