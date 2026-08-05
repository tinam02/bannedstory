import { Outfit, OutfitItem, PoseOptions } from '@/types';

export const REGION = 'GMS';
export const VERSION = '265';
const API_BASE = `https://maplestory.io/api/${REGION}/${VERSION}`;
const RENDER_BASE = 'https://maplestory.io/api/character';
const PER_PAGE = 50;

// Friendly pose name -> maplestory.io stance string. `Outfit.action` stores the
// stance directly; this is the label source for the pose picker.
export const POSE_TO_STANCE: Partial<Record<PoseOptions, string>> = {
  standingOneHanded: 'stand1',
  standingTwoHanded: 'stand2',
  walkingOneHanded: 'walk1',
  walkingTwoHanded: 'walk2',
  alert: 'alert',
  flying: 'fly',
  jumping: 'jump',
  sitting: 'sit',
  lyingDown: 'prone',
};

// Adjustments the render URL understands, with the value that means "no
// change". Sending a neutral value is a no-op, so we drop it to keep URLs
// short and cacheable — the same thing other simulators do.
export const ADJUSTMENTS = {
  hue: 0,
  saturation: 1,
  brightness: 1,
  contrast: 1,
  alpha: 1,
} as const;

export type AdjustmentKey = keyof typeof ADJUSTMENTS;

// The emotion is stamped onto these layers as `animationName`.
const FACE_LAYERS = new Set(['Face', 'Face Accessory']);

// Faces / hairs have no /iconRaw on maplestory.io — only /icon works for them.
const ICON_ONLY_SLOTS = new Set(['Face', 'Hair']);

type ItemsListResponse = {
  result: OutfitItem[];
  metadata: { page: number; prevPage: number | null; nextPage: number | null };
};

// The /item response is already in interchange shape — it only lacks the
// region/version it came from, so that is all we add.
const adaptItem = (io: any): OutfitItem => ({
  ...io,
  region: REGION,
  version: VERSION,
});

export const itemIconUrl = (itemId: number) =>
  `${API_BASE}/item/${itemId}/iconRaw`;

export const bodyIconUrl = (itemId: number) =>
  `${API_BASE}/item/${itemId}/icon`;

/** Icon for an equipped item, picking the endpoint its slot supports. */
export const iconUrlFor = (item: OutfitItem) =>
  ICON_ONLY_SLOTS.has(item.typeInfo?.subCategory ?? '')
    ? bodyIconUrl(item.id)
    : itemIconUrl(item.id);

// Fire-and-forget: kick off a fetch to populate browser cache.
export const preloadImageUrl = (url: string) => {
  if (typeof window === 'undefined' || !url) return;
  const img = new window.Image();
  img.src = url;
};

const buildItemsUrl = ({
  page,
  nameText,
  overallCategory,
  subcategory,
}: {
  page: number;
  nameText?: string;
  overallCategory: string;
  subcategory?: string;
}) => {
  const params = new URLSearchParams();
  params.set('overallCategoryFilter', overallCategory);
  if (subcategory) params.set('subCategoryFilter', subcategory);
  if (nameText) params.set('searchFor', nameText);
  params.set('startPosition', String(page * PER_PAGE));
  // Request one extra so we can detect whether a next page exists.
  params.set('count', String(PER_PAGE + 1));
  return `${API_BASE}/item?${params}`;
};

export const fetchItems = async ({
  page = 0,
  nameText,
  overallCategory = 'Equip',
  subcategory,
}: {
  page?: number;
  nameText?: string;
  overallCategory?: string;
  subcategory?: string;
}): Promise<ItemsListResponse> => {
  try {
    const res = await fetch(
      buildItemsUrl({ page, nameText, overallCategory, subcategory }),
      { cache: 'force-cache' },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arr = (await res.json()) as any[];
    const hasNext = arr.length > PER_PAGE;
    return {
      result: arr.slice(0, PER_PAGE).map(adaptItem),
      metadata: {
        page,
        prevPage: page > 0 ? page - 1 : null,
        nextPage: hasNext ? page + 1 : null,
      },
    };
  } catch (err) {
    console.error('Error fetching items:', err);
    return { result: [], metadata: { page, prevPage: null, nextPage: null } };
  }
};

/** One equipped item as the render URL wants it. */
const renderItem = (slot: string, item: OutfitItem, emotion: string) => {
  const out: Record<string, unknown> = {
    itemId: item.id,
    region: item.region || REGION,
    version: item.version || VERSION,
  };
  if (FACE_LAYERS.has(slot)) out.animationName = emotion;

  for (const key of Object.keys(ADJUSTMENTS) as AdjustmentKey[]) {
    const value = item[key];
    if (typeof value === 'number' && value !== ADJUSTMENTS[key]) {
      out[key] = value;
    }
  }
  if (item.vslot) out.vslot = item.vslot;
  // alpha:0 rather than dropping the item from the URL: both are pixel
  // identical, but the item still contributes to the canvas bounds, so toggling
  // a hat off doesn't collapse the render from 105x113 to 43x68 and make the
  // whole character jump. The item's own `alpha` is left untouched in state, so
  // unhiding restores whatever opacity it had.
  //
  // `visible` is still sent: it costs nothing, keeps the URL a faithful
  // serialization of the outfit, and would take over if the API ever honours it for real
  if (item.visible === false) {
    out.visible = false;
    out.alpha = 0;
  }
  if (item.equipFrame) out.equipFrame = item.equipFrame;

  return out;
};

/**
 * Serializes an outfit into a maplestory.io render URL.
 *
 * `zoom` is deliberately absent: the API's `resize` would refetch a larger
 * image on every zoom step, so we scale with CSS instead. `bgColor` is omitted
 * too — transparent is the default and the only background we use.
 *
 * The trailing path segment is either a frame number (still PNG) or the
 * literal `animated`, which returns a looping GIF of the whole stance.
 */
export const characterRenderUrl = (outfit: Outfit): string => {
  const { selectedItems } = outfit;
  // Body and head are the required base layers and lead the path.
  const ordered: Array<[string, OutfitItem]> = [];
  for (const slot of ['Body', 'Head']) {
    if (selectedItems[slot]) ordered.push([slot, selectedItems[slot]]);
  }
  for (const [slot, item] of Object.entries(selectedItems)) {
    if (slot !== 'Body' && slot !== 'Head' && item) ordered.push([slot, item]);
  }

  const path = ordered
    .map(([slot, item]) =>
      encodeURIComponent(
        JSON.stringify(renderItem(slot, item, outfit.emotion)),
      ),
    )
    .join(',');

  // Only non-default flags, so identical looks share a cache entry.
  const params = new URLSearchParams();
  if (outfit.mercEars) params.set('showears', 'true');
  if (outfit.illiumEars) params.set('showLefEars', 'true');
  if (outfit.highFloraEars) params.set('showHighLefEars', 'true');
  if (outfit.flipX) params.set('flipX', 'true');
  // if (outfit.name) params.set('name', outfit.name);
  // `name` is deliberately not sent, bc if we send it then its gonna always show and be baked into the png. this is useless since we already have selectable nametags
  const query = params.toString();

  const frame = outfit.animating ? 'animated' : outfit.frame;

  return `${RENDER_BASE}/${path}/${outfit.action}/${frame}${
    query ? `?${query}` : ''
  }`;
};
