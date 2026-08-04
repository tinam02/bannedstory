'use client';
import useChar from '@/app/context/CharCtx';
import useScene from '@/app/context/SceneCtx';
import Char from '@/components/atoms/Char';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useMapLayers from './useMapLayers';
import styles from './Stage.module.scss';

/**
 * A map backdrop
 *
 * Two plates, not one. The map's own `back` entries carry a `front` flag
 * front is in front of character
 *
 * no foothold no snapping
 */

// Scene state deliberately does NOT live in `outfit`
//
// both are keyed by map id, a position on a 3040x590 cave means nothing on a
// square town map
const POS_KEY = 'scene-char-pos';
const PAN_KEY = 'scene-pan';

// Keeps the sprite from being dragged fully out of the picture.
const EDGE_PAD = 24;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const Stage = () => {
  const { zoom } = useChar();
  const { bg, mapId, maps } = useScene();
  const sceneRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  // Map coordinates, not screen ones, so the character stays put on the map
  // when the window is resized.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  // How far the map is shoved from centre, in screen pixels. 0 is centred
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // Viewport size to work out how far the map is allowed to travel
  const [view, setView] = useState({ w: 0, h: 0 });
  // Pointer offset from the character's anchor at grab time, in map space.
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  // Where the pointer and the map were when a pan started, in screen pixels.
  const panGrab = useRef<{
    px: number;
    py: number;
    ox: number;
    oy: number;
  } | null>(null);

  const map = useMemo(
    () => maps.find(m => m.id === mapId) ?? null,
    [maps, mapId],
  );

  // with no map picked the viewport itself is the coordinate space
  //
  // keeps one code path instead of a second "no map" mode
  const space = map ?? { w: Math.max(view.w, 1), h: Math.max(view.h, 1) };

  const layers = useMapLayers(mapId, map?.layers ?? false);

  // back.png already has every still sprite baked in, so only the moving ones
  // need to go over the top
  //
  // sorted by wz draw order, obj layer then z, backs first since they are scenery
  const anim = useMemo(() => {
    if (!layers) return [];
    return [...layers.back, ...layers.obj]
      .filter(s => s.frames > 1)
      .sort(
        (a, b) => (a.layer ?? -1) - (b.layer ?? -1) || (a.z ?? 0) - (b.z ?? 0),
      );
  }, [layers]);

  // Mirrors, so the pointerup handler can save the final value without either going stale in its closure or re-subscribing on every mouse move
  const posRef = useRef(pos);
  posRef.current = pos;
  const panRef = useRef(pan);
  panRef.current = pan;
  const spaceRef = useRef(space);
  spaceRef.current = space;

  useEffect(() => {
    const key = mapId ?? 'none';
    const s = spaceRef.current;
    const saved = localStorage.getItem(`${POS_KEY}:${key}`);
    setPos(saved ? JSON.parse(saved) : { x: s.w / 2, y: s.h - 30 });
    const savedPan = localStorage.getItem(`${PAN_KEY}:${key}`);
    setPan(savedPan ? JSON.parse(savedPan) : { x: 0, y: 0 });
  }, [mapId]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setView({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The map may be pushed until its edge meets the viewport edge, and no
  // further. An axis smaller than the viewport can't pan at all, so it stays
  // centred rather than drifting into the backdrop colour.
  const limit = useCallback(
    (p: { x: number; y: number }) => {
      const slackX = Math.max(0, (space.w * zoom - view.w) / 2);
      const slackY = Math.max(0, (space.h * zoom - view.h) / 2);
      return {
        x: clamp(p.x, -slackX, slackX),
        y: clamp(p.y, -slackY, slackY),
      };
    },
    [zoom, view, space.w, space.h],
  );

  // Zooming out or shrinking the window can leave an old pan out of bounds.
  useEffect(() => setPan(p => limit(p)), [limit]);

  // Screen pixels to map pixels. Measuring the scaled element and normalising
  // by its rect means dragging is correct at any zoom with no extra maths.
  const toMap = useCallback(
    (clientX: number, clientY: number) => {
      const r = sceneRef.current?.getBoundingClientRect();
      if (!r) return null;
      return {
        x: ((clientX - r.left) / r.width) * space.w,
        y: ((clientY - r.top) / r.height) * space.h,
      };
    },
    [space.w, space.h],
  );

  useEffect(() => {
    const key = mapId ?? 'none';
    const onMove = (e: PointerEvent) => {
      if (panGrab.current) {
        const g = panGrab.current;
        setPan(
          limit({
            x: g.ox + (e.clientX - g.px),
            y: g.oy + (e.clientY - g.py),
          }),
        );
        return;
      }
      if (!grab.current) return;
      const p = toMap(e.clientX, e.clientY);
      if (!p) return;
      const s = spaceRef.current;
      setPos({
        x: clamp(p.x - grab.current.dx, EDGE_PAD, s.w - EDGE_PAD),
        y: clamp(p.y - grab.current.dy, EDGE_PAD, s.h),
      });
    };
    // Saved here rather than in an effect on the value: a drag ends without
    // changing it again, so an effect would never see the final position.
    const onUp = () => {
      if (grab.current && posRef.current)
        localStorage.setItem(`${POS_KEY}:${key}`, JSON.stringify(posRef.current));
      if (panGrab.current)
        localStorage.setItem(`${PAN_KEY}:${key}`, JSON.stringify(panRef.current));
      grab.current = null;
      panGrab.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    //if anything else does manage to steal the gesture, this still releases the grab instead of leaving the map welded to the cursor
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [toMap, limit, mapId]);

  return (
    <div
      ref={frameRef}
      className={styles.frame}
      style={{ background: bg }}
      // Anywhere that isn't the char pans the map. char stops this event
      onPointerDown={e => {
        // Without this the browser starts its own image-drag on the plates,
        // which cancels the pointer stream so pointerup never arrives and the
        // map stays stuck to the cursor until the next click.
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        panGrab.current = {
          px: e.clientX,
          py: e.clientY,
          ox: pan.x,
          oy: pan.y,
        };
      }}
    >
      <div
        className={styles.scene}
        style={{
          width: space.w * zoom,
          height: space.h * zoom,
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
        }}
      >
        {/* Scaled from the top-left so the layer below can hold the real map
            size and everything inside stays in unscaled map pixels. */}
        <div
          ref={sceneRef}
          className={styles.plates}
          style={{
            width: space.w,
            height: space.h,
            transform: `scale(${zoom})`,
          }}
        >
          {map && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.plate}
              src={`/maps/${map.id}/back.png`}
              alt=''
              draggable={false}
            />
          )}

          {/* vr.l/vr.t is the map's own origin, and back.png is exactly the vr
              rect, so subtracting it puts wz coords into plate pixels */}
          {map &&
            layers &&
            anim.map(s => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={s.file}
                className={styles.sprite}
                src={`/maps/${map.id}/layers/${s.file}`}
                alt=''
                draggable={false}
                style={{
                  left: s.x + s.ox - layers.vr.l,
                  top: s.y + s.oy - layers.vr.t,
                  width: s.w,
                  height: s.h,
                  transform: s.f ? 'scaleX(-1)' : undefined,
                }}
              />
            ))}

          {pos && (
            <div
              className={styles.charAnchor}
              style={{ left: pos.x, top: pos.y }}
              onPointerDown={e => {
                const p = toMap(e.clientX, e.clientY);
                if (!p) return;
                // Or the frame beneath would start panning at the same time.
                e.stopPropagation();
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                grab.current = { dx: p.x - pos.x, dy: p.y - pos.y };
              }}
            >
              <Char />
            </div>
          )}

          {/* drawn over the character, and never a drag target */}
          {map?.front && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={`${styles.plate} ${styles.front}`}
              src={`/maps/${map.id}/front.png`}
              alt=''
              draggable={false}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Stage;
