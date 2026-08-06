'use client';
import useChar from '@/app/context/CharCtx';
import useScene from '@/app/context/SceneCtx';
import Char from '@/components/atoms/Char';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useMapLayers, { scrollsH, scrollsV } from './useMapLayers';
import useUiSprites from './useUiSprites';
import Caption from './Caption';
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
  const { chars, activeId, setActiveId, captionsOf, setCaption } = useChar();
  const { bg, mapId, maps, zoom } = useScene();

  // fetched only once some character actually wants one, all off by default
  const wantsSpeech = chars.some(c => captionsOf(c.id).speech.on);
  const wantsTag = chars.some(c => captionsOf(c.id).nametag.on);
  const balloons = useUiSprites(wantsSpeech ? 'balloons' : null);
  const nametags = useUiSprites(wantsTag ? 'nametags' : null);

  const sceneRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  // Map coords, not screen ones, so a character stays put on the map when window is resized. Keyed by character
  const [pos, setPos] = useState<Record<number, { x: number; y: number }>>({});
  // How far the map is shoved from center, in screen pixels. 0 =centerdd
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // Viewport size to work out how far the map is allowed to travel
  const [view, setView] = useState({ w: 0, h: 0 });
  // Which character is being dragged, and the pointer offset from its anchor at grab time, in map space
  const grab = useRef<{ id: number; dx: number; dy: number } | null>(null);
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

  // layers.json is written by the lua dump and always names the png, so the
  // extension gets swapped here rather than rewritten on disk. that way
  // re-running the dump doesn't undo the conversion
  const asset = useCallback(
    (file: string) =>
      map
        ? `/maps/${map.id}/${map.webp ? file.replace(/\.(apng|png)$/, '.webp') : file}`
        : '',
    [map],
  );

  // some maps carry sprites we don't want, tutorial arrows and click hints etc, find and list by hand in "hide"
  const hidden = useCallback(
    (file: string) => {
      const base = file.replace(/\.(apng|png)$/, '');
      const match = (pat: string) =>
        pat.endsWith('*') ? base.startsWith(pat.slice(0, -1)) : base === pat;
      if (map?.keep?.some(match)) return false;
      return map?.hide?.some(match) ?? false;
    },
    [map],
  );

  // what the plate already contains decides what we have to draw
  //
  // backs are always still in it, so only the moving ones go over the top. they
  // also get the parallax shift MapRender baked in, see BackPatch.cs
  //
  // objects depend on how the plate was captured. with ctrl+3 held off they are
  // absent and we draw all of them, which is what stops an animated one ghosting
  // over its own baked still. otherwise only the moving ones
  //
  // sorted by wz draw order, obj layer then z, backs first since they're scenery
  const sprites = useMemo(() => {
    if (!layers) return [];
    const cam = map?.cam;
    const backs = layers.back
      .filter(s => s.frames > 1)
      .map(s => ({
        ...s,
        dx: cam && !scrollsH(s) ? (cam.x * (100 + (s.rx ?? 0))) / 100 : 0,
        dy: cam && !scrollsV(s) ? (cam.y * (100 + (s.ry ?? 0))) / 100 : 0,
      }));
    const objs = (
      map?.objsHidden ? layers.obj : layers.obj.filter(s => s.frames > 1)
    ).map(s => ({ ...s, dx: 0, dy: 0 }));
    return [...backs, ...objs]
      .filter(s => !hidden(s.file))
      .sort(
        (a, b) => (a.layer ?? -1) - (b.layer ?? -1) || (a.z ?? 0) - (b.z ?? 0),
      );
  }, [layers, map, hidden]);

  // Mirrors, so the pointerup handler can save the final value without either going stale in its closure or re-subscribing on every mouse move
  const posRef = useRef(pos);
  posRef.current = pos;
  const panRef = useRef(pan);
  panRef.current = pan;
  const spaceRef = useRef(space);
  spaceRef.current = space;

  // ids rather than the array, or equipping a hat would count as a change and shove everyone back to their starting mark
  const ids = chars.map(c => c.id).join(',');

  useEffect(() => {
    const key = mapId ?? 'none';
    const s = spaceRef.current;
    const list = ids ? ids.split(',').map(Number) : [];
    const next: Record<number, { x: number; y: number }> = {};
    list.forEach((id, i) => {
      // the solo key, from before positions were per character. only the first
      // one can inherit it, and only until it saves under its own
      const saved =
        localStorage.getItem(`${POS_KEY}:${key}:${id}`) ??
        (i === 0 ? localStorage.getItem(`${POS_KEY}:${key}`) : null);
      // a new face starts beside the others rather than exactly on top
      next[id] = saved
        ? JSON.parse(saved)
        : { x: s.w / 2 + (i - (list.length - 1) / 2) * 70, y: s.h - 30 };
    });
    setPos(next);
    const savedPan = localStorage.getItem(`${PAN_KEY}:${key}`);
    setPan(savedPan ? JSON.parse(savedPan) : { x: 0, y: 0 });
  }, [mapId, ids]);

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
      const { id, dx, dy } = grab.current;
      setPos(prev => ({
        ...prev,
        [id]: {
          x: clamp(p.x - dx, EDGE_PAD, s.w - EDGE_PAD),
          y: clamp(p.y - dy, EDGE_PAD, s.h),
        },
      }));
    };
    // Saved here rather than in an effect on the value: a drag ends without
    // changing it again, so an effect would never see the final position.
    const onUp = () => {
      const dragged = grab.current?.id;
      const at = dragged !== undefined ? posRef.current[dragged] : null;
      if (at)
        localStorage.setItem(
          `${POS_KEY}:${key}:${dragged}`,
          JSON.stringify(at),
        );
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
              src={asset('back.png')}
              alt=''
              draggable={false}
            />
          )}

          {/* vr.l/vr.t is the map's own origin, and back.png is exactly the vr
              rect, so subtracting it puts wz coords into plate pixels */}
          {map &&
            layers &&
            sprites.map(s => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={s.file}
                className={styles.sprite}
                src={asset(`layers/${s.file}`)}
                alt=''
                draggable={false}
                style={{
                  left: s.x + s.ox + s.dx - layers.vr.l,
                  top: s.y + s.oy + s.dy - layers.vr.t,
                  width: s.w,
                  height: s.h,
                  transform: s.f ? 'scaleX(-1)' : undefined,
                }}
              />
            ))}

          {chars.map(who => {
            const at = pos[who.id];
            if (!at) return null;
            const cap = captionsOf(who.id);
            return (
            <div
              key={who.id}
              className={styles.charAnchor}
              // the selected one sits above the rest, so dragging a character
              // out of a pile doesn't put it back underneath
              data-active={who.id === activeId ? '' : undefined}
              style={{ left: at.x, top: at.y }}
              onPointerDown={e => {
                const p = toMap(e.clientX, e.clientY);
                if (!p) return;
                // Or the frame beneath would start panning at the same time.
                e.stopPropagation();
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                // touching a character is also how you pick one
                setActiveId(who.id);
                grab.current = { id: who.id, dx: p.x - at.x, dy: p.y - at.y };
              }}
            >
              {/* above the sprite whatever height it is. both captions swallow
                  their own pointerdown, or typing in one would drag the
                  character out from under it */}
              {cap.speech.on && balloons?.styles[cap.speech.style] && (
                <div className={styles.speechSlot}>
                  <Caption
                    kind='balloon'
                    set='balloons'
                    style={balloons.styles[cap.speech.style]}
                    styleId={cap.speech.style}
                    text={cap.speech.text}
                    onChange={text => setCaption(who.id, 'speech', { text })}
                    placeholder={'LF> MESOS\nPL0X\n@@@@\n@@@@\n@@@@'}
                  />
                </div>
              )}

              <Char who={who} />

              {/* under the feet, where the game puts it */}
              {cap.nametag.on && nametags?.styles[cap.nametag.style] && (
                <div className={styles.nametagSlot}>
                  <Caption
                    kind='tag'
                    set='nametags'
                    style={nametags.styles[cap.nametag.style]}
                    styleId={cap.nametag.style}
                    text={cap.nametag.text}
                    onChange={text => setCaption(who.id, 'nametag', { text })}
                    placeholder={who.name || 'Name'}
                  />
                </div>
              )}
            </div>
            );
          })}

          {/* drawn over the character, and never a drag target */}
          {map?.front && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={`${styles.plate} ${styles.front}`}
              src={asset('front.png')}
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
