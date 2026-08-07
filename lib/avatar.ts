/**
 * Stacking a character out of wz layers, the way the game does it.
 *
 * Verified pixel identical against maplestory.io by scripts/avatar-spike.ts,
 * across skin, ears, face, hair, hat, top, shorts, overall and shoes, in 34 of
 * the 35 stances. heal is the exception, see the note on handMove below.
 *
 * The whole model is three rules.
 *   1 every layer hangs off an anchor its parent supplies
 *   2 an item takes over the slots its vslot names, and whatever was in them
 *     stops being drawn
 *   3 draw order is the layer's z name looked up in zmap
 */

export type Point = { x: number; y: number };

/** one canvas inside an item's packed sheet, written by extract-avatar.lua */
export type Canvas = {
  /** where it sits in the sheet */
  x: number;
  y: number;
  w: number;
  h: number;
  /** the point the anchors are measured from */
  origin: Point;
  /** the layer's name in zmap, which is what decides draw order */
  z: string;
  /** named anchors, relative to origin */
  map: Record<string, Point>;
};

/**
 * One item's sheet and how to read it.
 *
 * `frames` is stance -> frame -> layer name -> canvas index. the same canvas is
 * reached from many stances, which is why a hat needs three of them for all 35
 */
export type ItemManifest = {
  id: number;
  sheet: string;
  islot: string;
  vslot: string;
  canvases: Record<string, Canvas>;
  frames: Record<string, Array<Record<string, number>>>;
};

/** an item as worn: which part it fills, and where its sheet lives */
export type WornItem = {
  part: string;
  manifest: ItemManifest;
  sheetUrl: string;
  /**
   * Overrides the stance for this item alone.
   *
   * The face is keyed by expression rather than by pose, so it takes `blink`
   * or `smile` where everything else takes `stand1`
   */
  stance?: string;
  /**
   * Overrides the frame for this item alone.
   *
   * Also the face. It runs on its own clock in game, and without this it shares
   * the body's frame index: face `blink` has three frames and body `stand1` has
   * three, so they lock together and the character blinks in time with its own
   * breathing
   */
  frame?: number;
};

/** one drawable piece, resolved for a given stance and frame */
export type AvatarLayer = {
  name: string;
  part: string;
  item: number;
  layer: string;
  sheet: string;
  /** where in the sheet */
  sx: number;
  sy: number;
  w: number;
  h: number;
  origin: Point;
  z: string;
  vslot: string;
  islot: string;
  map: Record<string, Point>;
};

export type PlacedLayer = AvatarLayer & { x: number; y: number };

/**
 * Which anchor a layer hangs from, and which *layer* supplies it.
 *
 * Named by layer and not by part, or `arm` never resolves: the arm is a layer
 * of the body, so its part is `body` and only its layer name is `arm`.
 *
 * Checked in order, so a layer offering several anchors uses the first it
 * consumes rather than one it provides. the head carries both `neck` and
 * `brow`, but it hangs off the body's neck and hands `brow` to the face. same
 * for the arm, which takes `navel` and gives `hand` to whatever it's holding
 */
const ANCHORS: [anchor: string, parentLayer: string, parentAnchor?: string][] = [
  ['neck', 'body'],
  ['navel', 'body'],
  ['brow', 'head'],
  ['hand', 'arm'],
  // handMove is deliberately not in here.
  //
  // the loose lHand carries `navel` in most stances and resolves like anything
  // else. in alert and heal it carries only `handMove`, and nothing in the
  // character supplies that: it comes from the weapon, which is what its
  // `handBelowWeapon` z is telling us. so it falls through as an orphan and
  // lands on the body origin, which is exactly right for alert.
];

/** one optional pair of ears per race, each behind its own flag */
export const EAR_LAYERS = {
  ear: 'mercEars',
  lefEar: 'illiumEars',
  highlefEar: 'highFloraEars',
} as const;

// humanEar is not in there. it's the default pair and is always drawn
//
// hairShade is left out entirely. it isn't one canvas but a set of variants,
// and both the name and the numbering say it's the shadow a hat casts on hair,
// picked per hat. maplestory.io draws nothing there for a bare head, and
// guessing the first variant put us 1.3% off a render we otherwise match
const UNRESOLVED = new Set(['hairShade']);

/**
 * Stances where the loose lHand is not drawn at all.
 *
 * In heal it carries only `handMove`, which the weapon supplies and a bare
 * character has not got, and maplestory.io leaves the hand out rather than
 * guessing. Dropping it takes heal from 169 differing channels to 0.
 *
 * Scoped to heal on purpose. alert has the same handMove-only hand and IS drawn
 * there, so this cannot be a general rule about handMove, and dropping the hand
 * everywhere costs alert, jump and fly about 156 channels each.
 *
 * Making it conditional on carrying a weapon was the obvious next guess and it
 * measured worse, 56 channels against 65, so it is not that either. heal with a
 * weapon is unsolved in both directions and is part of the weapon swing work
 */
const NO_LOOSE_HAND: Record<string, string[]> = { heal: ['lHand'] };

// the two letter slot codes in a vslot or smap string. annotated, or the empty
// fallback infers as never[] and nothing can be looked up in it
const codes = (s: string | undefined): string[] => s?.match(/[A-Z][a-z0-9]/g) ?? [];

/** body parts claim their slots before equips, so a hat beats the hair it covers */
const CLAIM_ORDER = ['body', 'head', 'face', 'hair'];
const claimRank = (part: string) => {
  const i = CLAIM_ORDER.indexOf(part);
  return i === -1 ? CLAIM_ORDER.length : i;
};

export type AvatarOptions = {
  /** the optional ear pairs, off unless asked for */
  mercEars?: boolean;
  illiumEars?: boolean;
  highFloraEars?: boolean;
};

/**
 * Flattens the worn items into the layers for one stance and frame.
 *
 * An item that has nothing for the stance falls back to `default`, which is how
 * a hat covers all 35 with one entry. Frame wraps, since stances don't agree on
 * how many they have
 */
export const layersFor = (
  worn: WornItem[],
  stance: string,
  frame: number,
): AvatarLayer[] => {
  const out: AvatarLayer[] = [];

  for (const { part, manifest, sheetUrl, stance: own, frame: ownFrame } of worn) {
    const key = own ?? stance;
    const seq = manifest.frames[key] ?? manifest.frames.default;
    if (!seq?.length) continue;
    const step = seq[(ownFrame ?? frame) % seq.length];
    if (!step) continue;

    for (const [layer, idx] of Object.entries(step)) {
      const c = manifest.canvases[String(idx)];
      if (!c?.origin) continue;
      out.push({
        name: `${part}-${layer}`,
        part,
        item: manifest.id,
        layer,
        sheet: sheetUrl,
        sx: c.x,
        sy: c.y,
        w: c.w,
        h: c.h,
        origin: c.origin,
        z: c.z || layer,
        vslot: manifest.vslot,
        islot: manifest.islot,
        map: c.map ?? {},
      });
    }
  }

  return out;
};

/**
 * Drops the layers that shouldn't be drawn.
 *
 * The interesting one is vslot. a cap declaring CpH1H5 takes slot H1, and the
 * hair layer sitting in H1 (hairOverHead) stops being drawn, which is why hats
 * eat hair. an overall declares MaPn and so takes out both a top and trousers
 *
 * A part only competes for slots it declares itself. the ear draws at hairShade
 * depth and so reads as slot Hs, but the head never claims Hs, so the hair
 * owning that slot is none of its business
 */
export const visibleLayers = (
  layers: AvatarLayer[],
  smap: Record<string, string>,
  opts: AvatarOptions = {},
  stance?: string,
): AvatarLayer[] => {
  const loose = (stance && NO_LOOSE_HAND[stance]) || [];

  // Back facing stances draw no face.
  //
  // The tell is in the data rather than a list of stance names: the head drops
  // its `humanEar` layer when you are looking at the back of it, and the three
  // stances that do this, ladder, rope and swingTF, are exactly the three where
  // maplestory.io draws no face. Keying off the head we were given also means a
  // future stance behaves correctly without being enumerated here
  const head = layers.filter(l => l.part === 'head');
  const facingAway =
    head.length > 0 && !head.some(l => l.layer === 'humanEar');

  const kept = layers.filter(l => {
    if (UNRESOLVED.has(l.layer)) return false;
    if (loose.includes(l.layer)) return false;
    if (facingAway && l.part === 'face') return false;
    const flag = EAR_LAYERS[l.layer as keyof typeof EAR_LAYERS];
    if (flag) return opts[flag] === true;
    return true;
  });

  if (!smap) return kept;

  const claimed = new Map<string, string>();
  for (const l of [...kept].sort((a, b) => claimRank(a.part) - claimRank(b.part))) {
    for (const c of codes(l.vslot)) claimed.set(c, l.part);
  }

  return kept.filter(l => {
    const own = codes(smap[l.z])[0];
    if (!own) return true;
    if (!codes(l.vslot).includes(own)) return true;
    const by = claimed.get(own);
    return !by || by === l.part;
  });
};

/**
 * Where each layer goes, and in what order.
 *
 * Positions come back relative to the body's origin, so they're negative above
 * and left of it. Sorted back to front, ready to draw one after another
 */
export const placeLayers = (layers: AvatarLayer[], zmap: string[]) => {
  const zIndex = new Map(zmap.map((n, i) => [n, i]));
  const root = layers.find(l => l.part === 'body' && l.layer === 'body');

  // a layer that hangs off nothing lands at the origin and stays there in every
  // stance, which looks plausible and is wrong. collected so callers can shout
  const orphans: string[] = [];

  const at = (l: AvatarLayer, seen: Set<string>): Point => {
    if (l === root) return { x: 0, y: 0 };
    if (seen.has(l.name)) throw new Error(`anchor loop at ${l.name}`);
    seen.add(l.name);

    for (const [anchor, parentLayer, parentAnchor] of ANCHORS) {
      const mine = l.map?.[anchor];
      if (!mine) continue;
      const on = parentAnchor ?? anchor;
      const parent = layers.find(
        p => p.layer === parentLayer && p.map?.[on] && p.name !== l.name,
      );
      if (!parent) continue;
      const pp = at(parent, seen);
      const pa = parent.map[on];
      return { x: pp.x + pa.x - mine.x, y: pp.y + pa.y - mine.y };
    }
    orphans.push(l.name);
    return { x: 0, y: 0 };
  };

  const placed: PlacedLayer[] = layers.map(l => {
    const p = at(l, new Set());
    return { ...l, x: p.x - l.origin.x, y: p.y - l.origin.y };
  });

  // zmap runs front to back, so the biggest index is drawn first
  placed.sort((a, b) => (zIndex.get(b.z) ?? -1) - (zIndex.get(a.z) ?? -1));

  let l = Infinity;
  let t = Infinity;
  let r = -Infinity;
  let b = -Infinity;
  for (const p of placed) {
    l = Math.min(l, p.x);
    t = Math.min(t, p.y);
    r = Math.max(r, p.x + p.w);
    b = Math.max(b, p.y + p.h);
  }

  return { placed, orphans, bounds: { l, t, r, b }, w: r - l, h: b - t };
};

/** everything a canvas needs, in one call */
export const buildAvatar = (
  worn: WornItem[],
  zmap: string[],
  smap: Record<string, string>,
  stance: string,
  frame: number,
  opts: AvatarOptions = {},
) => placeLayers(visibleLayers(layersFor(worn, stance, frame), smap, opts, stance), zmap);
