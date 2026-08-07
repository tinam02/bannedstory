/**
 * Item effects, the art that lives in Effect.wz instead of Character wz
 *
 * Some items have no sprite of their own. A cash cape can be a 1x1 placeholder
 * in Character.wz with its whole appearance in `Effect/ItemEff.img/<id>/effect`,
 * which is what the "effect off" toggle turns off in game. 742 of 1660 capes
 * are like that, 1671 items in total.
 *
 * Where an effect goes is not written down anywhere. `pos` is a number and what
 * it anchors to had to be solved by rendering against maplestory.io, which
 * scripts/effect-spike.ts does. Both values it resolved are below.
 */

import type { Point, PlacedLayer } from './avatar';

/** one frame, packed into the item's effect sheet by extract-effects.lua */
export type EffectCanvas = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** the point that lands on the anchor */
  origin: Point;
  z: number;
  /** how long this frame is held */
  ms: number;
};

export type EffectManifest = {
  id: number;
  sheet: string;
  /** meaning unknown, 162 items carry 1. carried through, not acted on */
  fixed: number;
  z: number;
  action: number;
  canvases: Record<string, EffectCanvas>;
  /**
   * Only `default` is extracted.
   *
   * It is not one pose among many, it is the fallback that plays for stand,
   * walk, alert, jump and every attack. The named actions only cover prone,
   * ladder and rope, so keeping default alone costs four poses and saves 86%
   * of the frames
   */
  actions: Record<string, { pos: number; z: number; frames: number[] }>;
};

export type WornEffect = { manifest: EffectManifest; sheetUrl: string };

/** an effect frame resolved for a pose, in the same space as PlacedLayer */
export type PlacedEffect = {
  item: number;
  sheet: string;
  sx: number;
  sy: number;
  w: number;
  h: number;
  x: number;
  y: number;
  /** negative draws behind the character */
  z: number;
};

/**
 * Stances that draw no effect at all.
 *
 * There is no jump action to leave out at extraction time, `default` covers
 * jump like it covers everything else, so this is a render time rule
 */
const NO_EFFECT = new Set(['jump']);

/**
 * The point an effect's origin lands on, in body-origin space.
 *
 * Both solved by scripts/effect-spike.ts against maplestory.io, each verified
 * on more than one item across stand1, walk1, alert and jump.
 *
 * pos 1 is the head's `brow`, exactly, no offset. pos 0 is the navel's x at
 * y 0, and y 0 is the ground: the body canvas puts its origin at the bottom of
 * the sprite. So pos 0 effects stand on the floor and pos 1 effects ride the
 * head, which is what they look like.
 *
 * pos 2 and pos 3 exist on seven items between them and are not solved. They
 * get nothing rather than a guess in the wrong place
 */
const anchorFor = (placed: PlacedLayer[], pos: number): Point | null => {
  const pointOf = (layer: string, name: string) => {
    const l = placed.find(p => p.layer === layer && p.map?.[name]);
    if (!l) return null;
    const m = l.map[name];
    return { x: l.x + l.origin.x + m.x, y: l.y + l.origin.y + m.y };
  };

  if (pos === 1) return pointOf('head', 'brow');
  if (pos === 0) {
    const navel = pointOf('body', 'navel');
    return navel && { x: navel.x, y: 0 };
  }
  return null;
};

/** the frame delays for one effect, so the caller can run its clock */
export const effectDelays = (e: WornEffect): number[] => {
  const act = e.manifest.actions.default;
  if (!act) return [];
  return act.frames.map(i => e.manifest.canvases[String(i)]?.ms ?? 100);
};

/**
 * Where each worn effect draws for a pose.
 *
 * `frames` is one index per effect, since they animate on their own delays and
 * not on the body's. Positions come back relative to the body's origin, the
 * same space placeLayers works in, so the caller can put them in one bbox
 */
export const placeEffects = (
  placed: PlacedLayer[],
  effects: WornEffect[],
  stance: string,
  frames: number[],
): PlacedEffect[] => {
  if (NO_EFFECT.has(stance)) return [];

  const out: PlacedEffect[] = [];
  effects.forEach((e, i) => {
    const act = e.manifest.actions.default;
    if (!act?.frames.length) return;
    const anchor = anchorFor(placed, act.pos);
    if (!anchor) return;
    const c = e.manifest.canvases[String(act.frames[(frames[i] ?? 0) % act.frames.length])];
    if (!c?.origin) return;
    out.push({
      item: e.manifest.id,
      sheet: e.sheetUrl,
      sx: c.x,
      sy: c.y,
      w: c.w,
      h: c.h,
      x: anchor.x - c.origin.x,
      y: anchor.y - c.origin.y,
      z: act.z,
    });
  });
  // back to front, so a cape and a hat effect worn together stack the way
  // their z says rather than the order the slots happened to load in
  return out.sort((a, b) => a.z - b.z);
};
